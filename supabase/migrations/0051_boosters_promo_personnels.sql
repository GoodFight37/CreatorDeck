-- creatordeck-deploy: automatic
-- Une récompense promo longue vit dans un solde séparé : elle ne gonfle pas la
-- réserve rechargeable et peut être limitée à un compte précis.

alter table public.pack_state
  add column if not exists promo_packs integer not null default 0;
do $$ begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.pack_state'::regclass
       and conname = 'pack_state_promo_packs_check'
  ) then
    alter table public.pack_state
      add constraint pack_state_promo_packs_check check (promo_packs between 0 and 500);
  end if;
end $$;

alter table public.promo_codes
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.promo_codes drop constraint if exists promo_codes_packs_check;
alter table public.promo_codes
  add constraint promo_codes_packs_check check (packs between 1 and 50);

create or replace function public.create_promo_code(
  p_code text,
  p_packs integer default 1,
  p_max_uses integer default null,
  p_expires_at timestamptz default null,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(btrim(coalesce(p_code, '')), '\s+', '', 'g'));
  v_packs integer := greatest(1, least(50, coalesce(p_packs, 1)));
begin
  if v_code = '' then
    raise exception 'code promo : il faut un code' using errcode = 'P0001';
  end if;
  insert into public.promo_codes (code, packs, max_uses, expires_at, note)
  values (v_code, v_packs, p_max_uses, p_expires_at, coalesce(p_note, ''))
  on conflict (code) do update set
    packs = excluded.packs,
    max_uses = excluded.max_uses,
    expires_at = excluded.expires_at,
    note = excluded.note;
  return jsonb_build_object('ok', true, 'code', v_code, 'packs', v_packs);
end;
$$;
revoke all on function public.create_promo_code(text, integer, integer, timestamptz, text)
  from public, anon, authenticated;
do $$ begin
  grant execute on function public.create_promo_code(text, integer, integer, timestamptz, text)
    to service_role;
exception when others then
  raise notice 'rôle service_role absent : création réservée au SQL Editor';
end $$;

create or replace function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code text := upper(regexp_replace(btrim(coalesce(p_code, '')), '\s+', '', 'g'));
  v_row public.promo_codes;
  v_status jsonb;
  v_reserve integer;
  v_regen timestamptz;
  v_bonus integer;
begin
  if v_user is null then
    raise exception 'code promo : connecte-toi pour utiliser un code' using errcode = 'P0001';
  end if;
  if v_code = '' then
    raise exception 'code promo : tape un code, puis valide' using errcode = 'P0001';
  end if;

  select * into v_row from public.promo_codes where code = v_code for update;
  if not found then
    raise exception 'code promo : ce code n''existe pas' using errcode = 'P0001';
  end if;
  if v_row.recipient_id is not null and v_row.recipient_id <> v_user then
    raise exception 'code promo : ce code est réservé à un autre compte' using errcode = 'P0001';
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    raise exception 'code promo : ce code a expiré' using errcode = 'P0001';
  end if;
  if v_row.max_uses is not null and v_row.used >= v_row.max_uses then
    raise exception 'code promo : ce code a déjà été utilisé le nombre de fois prévu' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.promo_redemptions r where r.code = v_code and r.user_id = v_user) then
    raise exception 'code promo : tu as déjà utilisé ce code' using errcode = 'P0001';
  end if;

  v_status := public.pack_status();
  v_reserve := coalesce((v_status ->> 'packs')::integer, 0);
  v_regen := coalesce((v_status ->> 'last_regen_at')::timestamptz, now());
  insert into public.pack_state (user_id, packs, last_regen_at, openings, promo_packs)
  values (v_user, v_reserve, v_regen, coalesce((v_status ->> 'openings')::integer, 0), v_row.packs)
  on conflict (user_id) do update set
    promo_packs = public.pack_state.promo_packs + excluded.promo_packs,
    updated_at = now()
  returning promo_packs into v_bonus;
  if v_bonus > 500 then
    raise exception 'code promo : solde de boosters de test plafonné à 500' using errcode = 'P0001';
  end if;

  insert into public.promo_redemptions (code, user_id, packs)
  values (v_code, v_user, v_row.packs);
  update public.promo_codes set used = used + 1 where code = v_code;
  return jsonb_build_object(
    'ok', true,
    'packs', v_row.packs,
    'reserve', v_reserve,
    'promo_packs', v_bonus,
    'note', v_row.note
  );
end;
$$;
revoke all on function public.redeem_promo_code(text) from public, anon;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- Reprend `open_pack()` de 0035 sans changer sa règle de tirage : un crédit
-- promo n'est consommé qu'après la réserve normale, dans la même transaction
-- que les cinq cartes.
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
  v_slug := public._pack_choose_creator(v_weights, v_used);
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
    'streak_reward', jsonb_build_object('day', v_jour, 'points', v_points_serie, 'tokens', v_tokens_serie),
    'jackpot', v_jackpot, 'save', to_jsonb(v_line)
  );
end;
$$;
revoke all on function public.open_pack(text) from public, anon;
grant execute on function public.open_pack(text) to authenticated;

-- Exposer séparément les crédits de test ; le compteur rechargeable reste vrai.
create or replace function public.pack_status()
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
  v_promo_packs integer := 0;
  v_next_pack_at timestamptz;
  v_local_state jsonb;
  v_local_packs integer;
  v_local_regen_epoch bigint;
  v_local_regen timestamptz;
  v_save_state jsonb;
  v_pity integer;
  v_streak integer;
  v_jackpot_ready boolean := false;
  v_scene record;
begin
  if v_user_id is null then
    raise exception 'statut : connecte-toi pour voir ta réserve' using errcode = 'P0001';
  end if;
  select ps.packs, ps.last_regen_at, ps.openings, ps.promo_packs into v_state
    from public.pack_state ps where ps.user_id = v_user_id;
  if v_state is null then
    v_local_packs := 3;
    v_local_regen := v_now;
    select s.state into v_save_state from public.saves s where s.user_id = v_user_id;
    if v_save_state is not null then
      v_local_state := v_save_state;
      v_local_packs := greatest(0, least(4, coalesce((v_local_state ->> 'packs')::integer, 3)));
      v_local_regen_epoch := coalesce((v_local_state ->> 'lastPackRegen')::bigint, 0);
      if v_local_regen_epoch > 0 then v_local_regen := to_timestamp(v_local_regen_epoch::double precision / 1000); end if;
    end if;
    v_state.packs := v_local_packs;
    v_state.last_regen_at := v_local_regen;
    v_state.openings := 0;
    v_state.promo_packs := 0;
  end if;
  v_promo_packs := v_state.promo_packs;
  v_refreshed := public._pack_refresh(v_state.packs, 4, v_state.last_regen_at, 1800000, v_now);
  v_packs := (v_refreshed ->> 'packs')::integer;
  v_last_regen := (v_refreshed ->> 'last_regen_at')::timestamptz;
  v_openings := v_state.openings;
  if v_packs >= 4 then v_next_pack_at := null; else v_next_pack_at := v_last_regen + interval '30 minutes'; end if;
  v_pity := public._pack_pity(v_user_id);
  v_streak := public._pack_streak(v_user_id, v_now);
  v_jackpot_ready := v_streak % 7 = 0 and not public._pack_perfect_today(v_user_id, v_now);
  select s.scene_day, s.family_id into v_scene from public.pack_scene s where s.user_id = v_user_id;
  return jsonb_build_object(
    'packs', v_packs, 'promo_packs', v_promo_packs, 'last_regen_at', v_last_regen,
    'openings', v_openings, 'next_pack_at', v_next_pack_at, 'pity', v_pity,
    'streak', v_streak, 'jackpot_ready', v_jackpot_ready,
    'scene_day', v_scene.scene_day, 'scene_family', v_scene.family_id,
    'scene_ready', v_scene.scene_day is distinct from public._pack_game_day(v_now)
  );
end;
$$;
revoke all on function public.pack_status() from public, anon;
grant execute on function public.pack_status() to authenticated;
