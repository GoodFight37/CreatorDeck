-- 0054 — « Mes chaînes » : le premier booster ne tire que dans le cercle du joueur.
--
-- État Production non vérifié : relire et obtenir l'accord de Malik avant exécution.
-- Miroir TypeScript : `src/lib/circle.ts` (seuils, poids, algorithme).
-- Test de non-divergence : `src/lib/supabase-cercle.test.ts`.
--
-- Principes
--   * Le client envoie 5 à 15 slugs ; le serveur les revérifie et tire seul.
--   * La rareté « locale » (position dans le cercle) ne sert qu'à choisir qui
--     sort et à l'affichage : la carte enregistrée garde sa rareté du catalogue,
--     donc aucune carte plus rare que prévu n'entre dans l'économie.
--   * `open_return_gift_pack()` (0044) n'est pas modifiée : le cadeau, sa
--     réclamation et son stock restent ceux d'aujourd'hui.

create table if not exists public.player_circles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  slugs      text[] not null check (array_length(slugs, 1) between 5 and 15),
  updated_at timestamptz not null default now()
);
alter table public.player_circles enable row level security;
revoke all on table public.player_circles from public, anon, authenticated;
drop policy if exists "lecture cercle personnel" on public.player_circles;
create policy "lecture cercle personnel" on public.player_circles
  for select to authenticated using (auth.uid() = user_id);

-- Rareté locale : 1re = légendaire, puis épique ≤ 30 %, rare ≤ 55 %, peu commune ≤ 80 %.
create or replace function public._circle_tier(p_position integer, p_size integer)
returns text language plpgsql immutable as $$
declare v_percent integer;
begin
  if p_position <= 0 or p_size < 2 then return 'legendary'; end if;
  v_percent := (p_position * 100) / (p_size - 1);   -- division entière
  if v_percent <= 30 then return 'epic'; end if;
  if v_percent <= 55 then return 'rare'; end if;
  if v_percent <= 80 then return 'uncommon'; end if;
  return 'common';
end $$;

-- Valide et normalise un cercle ; renvoie les slugs dans l'ordre reçu.
create or replace function public._circle_clean(p_slugs text[])
returns text[] language plpgsql stable set search_path = public as $$
declare v_clean text[]; v_n integer;
begin
  select coalesce(array_agg(lower(btrim(s)) order by o), '{}') into v_clean
    from unnest(coalesce(p_slugs, '{}')) with ordinality as t(s, o);
  v_n := coalesce(array_length(v_clean, 1), 0);
  if v_n < 5 or v_n > 15 then
    raise exception 'cercle : il faut entre 5 et 15 chaînes' using errcode = 'P0001';
  end if;
  if (select count(distinct s) from unnest(v_clean) s) <> v_n then
    raise exception 'cercle : une chaîne est en double' using errcode = 'P0001';
  end if;
  if (select count(*) from public.creators c where c.slug = any (v_clean) and not c.retired) <> v_n then
    raise exception 'cercle : chaîne inconnue' using errcode = 'P0001';
  end if;
  return v_clean;
end $$;

-- Tire une chaîne dans `p_pool` : d'abord la rareté locale (poids), puis la chaîne.
create or replace function public._circle_pick(p_pool text[], p_tiers jsonb, p_weights jsonb)
returns text language plpgsql volatile set search_path = public as $$
declare
  v_r text; v_w integer; v_total integer := 0; v_roll integer; v_acc integer := 0;
  v_chosen text; v_bucket text[];
begin
  for v_r in select unnest(array['common','uncommon','rare','epic','legendary']) loop
    v_w := coalesce((p_weights ->> v_r)::integer, 0);
    if v_w > 0 and exists (select 1 from unnest(p_pool) s where p_tiers ->> s = v_r) then
      v_total := v_total + v_w;
    end if;
  end loop;
  if v_total = 0 then return null; end if;
  v_roll := public._pack_random_int(v_total);
  for v_r in select unnest(array['common','uncommon','rare','epic','legendary']) loop
    v_w := coalesce((p_weights ->> v_r)::integer, 0);
    if v_w > 0 and exists (select 1 from unnest(p_pool) s where p_tiers ->> s = v_r) then
      v_acc := v_acc + v_w;
      if v_roll < v_acc then v_chosen := v_r; exit; end if;
    end if;
  end loop;
  select array_agg(s order by o) into v_bucket
    from unnest(p_pool) with ordinality as t(s, o) where p_tiers ->> s = v_chosen;
  return v_bucket[1 + public._pack_random_int(array_length(v_bucket, 1))];
end $$;

revoke all on function public._circle_tier(integer, integer) from public, anon, authenticated;
revoke all on function public._circle_clean(text[]) from public, anon, authenticated;
revoke all on function public._circle_pick(text[], jsonb, jsonb) from public, anon, authenticated;

-- Modifier son cercle plus tard (écran « Mes chaînes » en mode édition).
create or replace function public.set_circle(p_slugs text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_clean text[];
begin
  if v_user is null then raise exception 'cercle : connecte-toi' using errcode = 'P0001'; end if;
  v_clean := public._circle_clean(p_slugs);
  insert into public.player_circles(user_id, slugs) values (v_user, v_clean)
    on conflict (user_id) do update set slugs = excluded.slugs, updated_at = now();
  return jsonb_build_object('slugs', to_jsonb(v_clean));
end $$;
revoke all on function public.set_circle(text[]) from public, anon;
grant execute on function public.set_circle(text[]) to authenticated;

-- Premier booster du cadeau, tiré dans le cercle. Mêmes garde-fous que
-- `open_return_gift_pack()` ; refusé si un booster cadeau a déjà été ouvert
-- (le cercle ne biaise que le tout premier).
create or replace function public.open_circle_gift_pack(p_slugs text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_gift public.return_gifts; v_now timestamptz := now();
  v_circle text[]; v_tiers jsonb := '{}'::jsonb; v_n integer; v_i integer;
  v_live text[]; v_last text; v_slug text; v_pool text[];
  v_order text[] := '{}'; v_rarity text; v_variant text; v_card jsonb;
  v_cards jsonb := '[]'; v_save public.saves; v_is_live boolean;
begin
  if v_user is null then raise exception 'cadeau : connecte-toi' using errcode = 'P0001'; end if;
  select * into v_gift from public.return_gifts where user_id = v_user for update;
  if v_gift.user_id is null or v_gift.claimed_at is null or v_gift.boosters_remaining < 1 then
    raise exception 'cadeau : réclame le cadeau disponible' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.onboarding_state where user_id = v_user and tutorial_completed_at is not null) then
    raise exception 'cadeau : termine le tutoriel avant de l''ouvrir' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.return_gift_draws where user_id = v_user) then
    raise exception 'cadeau : le booster de ton cercle est déjà ouvert' using errcode = 'P0001';
  end if;

  v_circle := public._circle_clean(p_slugs);
  v_n := array_length(v_circle, 1);
  for v_i in 1..v_n loop
    v_tiers := v_tiers || jsonb_build_object(v_circle[v_i], public._circle_tier(v_i - 1, v_n));
  end loop;
  v_live := public._direct_live_logins();

  -- Dernière carte : Rare ou mieux (sinon, repli sur le tirage ordinaire).
  v_last := coalesce(
    public._circle_pick(v_circle, v_tiers, '{"rare":45,"epic":35,"legendary":20}'::jsonb),
    public._circle_pick(v_circle, v_tiers, '{"common":30,"uncommon":30,"rare":22,"epic":14,"legendary":4}'::jsonb));
  v_pool := array_remove(v_circle, v_last);
  for v_i in 1..4 loop
    v_slug := public._circle_pick(v_pool, v_tiers, '{"common":30,"uncommon":30,"rare":22,"epic":14,"legendary":4}'::jsonb);
    v_order := v_order || v_slug;
    v_pool := array_remove(v_pool, v_slug);
  end loop;
  v_order := v_order || v_last;

  for v_i in 1..5 loop
    v_slug := v_order[v_i];
    select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
    v_is_live := v_slug = any (coalesce(v_live, '{}'::text[]));
    v_variant := case when v_i = 5 and v_is_live then 'live'
                      else public._pack_choose_variant(v_rarity, false, v_is_live) end;
    v_card := jsonb_build_object(
      'id', gen_random_uuid()::text,
      'obtainedAt', (extract(epoch from v_now) * 1000)::bigint,
      'creatorSlug', v_slug, 'rarity', v_rarity, 'variant', v_variant, 'rareDrop', false,
      'circleRarity', v_tiers ->> v_slug);
    v_cards := v_cards || v_card;
  end loop;

  insert into public.player_circles(user_id, slugs) values (v_user, v_circle)
    on conflict (user_id) do update set slugs = excluded.slugs, updated_at = now();
  insert into public.return_gift_draws(user_id, drawn_at, cards) values (v_user, v_now, v_cards);
  perform public.card_claim_add(v_user, v_cards, 'cadeau');
  update public.return_gifts set boosters_remaining = boosters_remaining - 1
    where user_id = v_user returning * into v_gift;
  v_save := public._save_add_gift_cards(v_user, v_cards,
    coalesce((select packs from public.pack_state where user_id = v_user), 2),
    coalesce((select last_regen_at from public.pack_state where user_id = v_user), v_now),
    coalesce((select openings from public.pack_state where user_id = v_user), 0), v_now);
  return jsonb_build_object('cards', v_cards, 'gift_remaining', v_gift.boosters_remaining, 'save', to_jsonb(v_save));
end $$;
revoke all on function public.open_circle_gift_pack(text[]) from public, anon;
grant execute on function public.open_circle_gift_pack(text[]) to authenticated;
