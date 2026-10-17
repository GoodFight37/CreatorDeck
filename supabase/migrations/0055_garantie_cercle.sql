-- creatordeck-deploy: manual
-- 0055 — Garantie du cercle (D-142) : le Légendaire garanti vient du cercle.
--
-- À appliquer À LA MAIN par Malik, APRÈS 0054 (la migration s'arrête d'elle-même
-- si `player_circles` est absente). Aucune table ni colonne ajoutée.
--
-- Ce qui change, et seulement ça : quand la garantie Légendaire se déclenche
-- (12ᵉ booster Live Drop sans Légendaire, `pity.threshold`), le Légendaire est
-- tiré parmi les Légendaires du cercle du joueur qu'il n'a JAMAIS obtenues
-- (`card_claims`). Sans cercle enregistré en ligne, ou si toutes ses
-- Légendaires sont déjà obtenues, le tirage est exactement celui de 0051.
-- Le NOMBRE de Légendaires ne change pas : seule l'identité change.
--
-- `open_pack()` reprend donc toutes les règles en vigueur : réserve d'accueil
-- (0033), jetons de série (0035), série et Perfect, boosters de test (0051).
-- `open_pack()` est recopiée de 0051 à l'identique, sauf : la variable
-- `v_circle_slug`, le choix de la carte garantie, et le champ `pity_circle`
-- dans la réponse (la carte dit au client qu'elle vient du cercle).
--
-- Miroir TypeScript : `circlePityPool()` dans `src/lib/game-engine.ts`.
-- Test de non-divergence : `src/lib/supabase-cercle-garantie.test.ts`.
-- Retour arrière : réappliquer la définition `open_pack` de 0051 (la fonction
-- `_pack_circle_legendary` peut rester, elle n'est appelée que par open_pack).

do $$
begin
  if to_regclass('public.player_circles') is null then
    raise exception '0055 : appliquer d''abord 0054 (table player_circles absente)';
  end if;
end $$;

-- Les candidats : Légendaires du cercle, présentes au catalogue et tirables
-- (pas sortantes), absentes du booster en cours, jamais obtenues.
create or replace function public._pack_circle_legendary(p_user uuid, p_used text[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool text[];
  v_size integer;
begin
  if p_user is null then
    return null;
  end if;
  select array_agg(c.slug order by c.slug)
    into v_pool
    from public.player_circles pc
    join public.creators c on c.slug = any (pc.slugs)
   where pc.user_id = p_user
     and c.rarity = 'legendary'
     and not c.retired
     and not (c.slug = any (coalesce(p_used, '{}'::text[])))
     and not exists (
       select 1 from public.card_claims cc
        where cc.user_id = p_user and cc.creator_slug = c.slug
     );
  v_size := coalesce(array_length(v_pool, 1), 0);
  if v_size = 0 then
    return null;
  end if;
  return v_pool[1 + public._pack_random_int(v_size)];
end;
$$;
revoke all on function public._pack_circle_legendary(uuid, text[]) from public, anon, authenticated;

create or replace function public.open_pack(p_jackpot text default 'perfect')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_state record;
  v_now timestamptz := now();
  v_refreshed jsonb;
  v_packs integer;
  v_last_regen timestamptz;
  v_openings integer;
  v_promo_packs integer;
  v_use_promo boolean := false;
  v_rare_drop boolean;
  v_weights jsonb;
  v_used text[] := '{}';
  v_cards jsonb := '[]'::jsonb;
  v_card jsonb;
  v_slug text;
  v_rarity text;
  v_variant text;
  v_drawn jsonb[] := '{}';
  v_i integer;
  v_live text[];
  v_pity integer;
  v_streak integer;
  v_jour integer;
  v_points_serie integer;
  v_tokens_serie integer;
  v_solde_avant integer;
  v_solde_apres integer;
  v_jackpot boolean := false;
  v_line public.saves;
  v_circle_slug text;
begin
  if v_user_id is null then
    raise exception 'tirage : connecte-toi pour ouvrir un booster' using errcode = 'P0001';
  end if;

  insert into public.pack_state (user_id, packs, last_regen_at, openings, updated_at)
  values (v_user_id, public._pack_initial_packs(), v_now, 0, v_now)
  on conflict (user_id) do nothing;
  select ps.packs, ps.last_regen_at, ps.openings, ps.promo_packs
    into v_state from public.pack_state ps where ps.user_id = v_user_id for update;

  v_refreshed := public._pack_refresh(v_state.packs, 4, v_state.last_regen_at, 1800000, v_now);
  v_packs := (v_refreshed ->> 'packs')::integer;
  v_last_regen := (v_refreshed ->> 'last_regen_at')::timestamptz;
  v_openings := v_state.openings;
  v_promo_packs := v_state.promo_packs;
  if v_packs < 1 then
    if v_promo_packs < 1 then
      raise exception 'tirage : aucun booster disponible pour le moment' using errcode = 'P0001';
    end if;
    v_use_promo := true;
  end if;

  v_live := public._direct_live_logins();
  v_pity := public._pack_pity(v_user_id);
  v_streak := public._pack_streak(v_user_id, v_now);
  v_jackpot := v_streak % 7 = 0
               and coalesce(p_jackpot, 'perfect') <> 'hourglasses'
               and not public._pack_perfect_today(v_user_id, v_now);
  v_jour := ((v_streak - 1) % 7) + 1;
  v_points_serie := public._streak_reward_points(v_jour);
  if v_points_serie > 0 then
    v_solde_avant := public._wallet_ensure(v_user_id);
    v_solde_apres := public._wallet_apply(v_user_id, v_points_serie, 'streak', 'serie-j' || v_jour::text || '-' || public._pack_game_day(v_now)::text);
    if v_solde_apres <= v_solde_avant then v_points_serie := 0; end if;
  end if;
  v_tokens_serie := public._streak_reward_tokens(v_jour);
  if v_tokens_serie > 0 then
    v_solde_avant := public._tokens_ensure(v_user_id);
    v_solde_apres := public._tokens_apply(v_user_id, v_tokens_serie, 'streak', 'serie-j' || v_jour::text || '-' || public._pack_game_day(v_now)::text);
    if v_solde_apres <= v_solde_avant then v_tokens_serie := 0; end if;
  end if;

  v_rare_drop := v_jackpot or v_pity + 1 >= 12 or public._pack_random_int(1000) < 1;
  v_drawn := '{}';
  for v_i in 1..4 loop
    if v_rare_drop then
      v_weights := '{"epic": 82, "legendary": 18}'::jsonb;
    elsif v_i in (1, 2) then
      v_weights := '{"common": 42, "uncommon": 30, "rare": 18, "epic": 8, "legendary": 2}'::jsonb;
    elsif v_i = 3 then
      v_weights := '{"common": 34, "uncommon": 32, "rare": 22, "epic": 10, "legendary": 2}'::jsonb;
    else
      v_weights := '{"common": 20, "uncommon": 34, "rare": 28, "epic": 15, "legendary": 3}'::jsonb;
    end if;
    v_slug := public._pack_choose_creator(v_weights, v_used);
    v_used := v_used || v_slug;
    select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
    v_variant := public._pack_choose_variant(v_rarity, v_rare_drop, v_slug = any (coalesce(v_live, '{}'::text[])));
    v_card := jsonb_build_object('id', gen_random_uuid()::text, 'obtainedAt', (extract(epoch from v_now) * 1000)::bigint, 'creatorSlug', v_slug, 'rarity', v_rarity, 'variant', v_variant, 'rareDrop', v_rare_drop);
    v_drawn := v_drawn || v_card;
  end loop;
  if v_pity + 1 >= 12 or v_jackpot then
    v_weights := '{"legendary": 1}'::jsonb;
  elsif v_rare_drop then
    v_weights := '{"epic": 82, "legendary": 18}'::jsonb;
  else
    v_weights := '{"rare": 82, "epic": 15, "legendary": 3}'::jsonb;
  end if;
  -- 0055 (D-142) : sous la garantie Légendaire, le Légendaire vient du cercle
  -- quand une Légendaire du cercle n'a jamais été obtenue. Sinon : inchangé.
  if v_pity + 1 >= 12 then
    v_circle_slug := public._pack_circle_legendary(v_user_id, v_used);
  end if;
  if v_circle_slug is not null then
    v_slug := v_circle_slug;
  else
    v_slug := public._pack_choose_creator(v_weights, v_used);
  end if;
  select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
  v_card := jsonb_build_object('id', gen_random_uuid()::text, 'obtainedAt', (extract(epoch from v_now) * 1000)::bigint, 'creatorSlug', v_slug, 'rarity', v_rarity,
    'variant', case when v_slug = any (coalesce(v_live, '{}'::text[])) then 'live' else public._pack_choose_variant(v_rarity, v_rare_drop, false) end,
    'rareDrop', v_rare_drop);
  v_drawn := v_drawn || v_card;
  for v_i in 1..array_length(v_drawn, 1) loop v_cards := v_cards || v_drawn[v_i]; end loop;

  if v_use_promo then v_promo_packs := v_promo_packs - 1; else v_packs := v_packs - 1; end if;
  update public.pack_state
     set packs = v_packs, promo_packs = v_promo_packs, last_regen_at = v_last_regen,
         openings = v_openings + 1, updated_at = v_now
   where user_id = v_user_id;
  insert into public.pack_draws (user_id, drawn_at, cards) values (v_user_id, v_now, v_cards);
  perform public.card_claim_add(v_user_id, v_cards, 'tirage');
  v_line := public._save_add_pack_cards(v_user_id, v_cards, v_packs, v_last_regen, v_openings + 1, v_now);

  return jsonb_build_object(
    'packs', v_packs, 'promo_packs', v_promo_packs,
    'last_regen_at', v_last_regen, 'openings', v_openings + 1, 'cards', v_cards,
    'pity', public._pack_pity(v_user_id), 'streak', v_streak,
    'pity_hit', v_pity + 1 >= 12,
    'pity_circle', v_circle_slug is not null,
    'streak_reward', jsonb_build_object('day', v_jour, 'points', v_points_serie, 'tokens', v_tokens_serie),
    'jackpot', v_jackpot, 'save', to_jsonb(v_line)
  );
end;
$$;
revoke all on function public.open_pack(text) from public, anon;
grant execute on function public.open_pack(text) to authenticated;
