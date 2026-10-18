-- creatordeck-deploy: manual
-- Rétention locale : une absence protégée par cycle, récompense en booster.
-- Le journal des Live Drop est l'autorité ; aucun compteur envoyé par le client.
create or replace function public._pack_streak_state(p_user uuid, p_now timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := public._pack_game_day(p_now);
  v_day date; v_previous date; v_streak integer := 0;
  v_used boolean := false;
begin
  for v_day in
    select day from (
      select distinct public._pack_game_day(d.drawn_at) as day
      from public.pack_draws d
      where d.user_id = p_user and d.kind = 'live'
        and public._pack_game_day(d.drawn_at) <= v_today
      union select v_today
    ) days order by day
  loop
    if v_streak % 7 = 0 then v_used := false; end if;
    if v_previous is null then v_streak := 1;
    elsif v_day = v_previous + 1 then v_streak := v_streak + 1;
    elsif v_day = v_previous + 2 and not v_used then
      v_streak := v_streak + 1; v_used := true;
    else v_streak := 1; v_used := false;
    end if;
    v_previous := v_day;
  end loop;
  return jsonb_build_object('streak', v_streak, 'protection_used', v_used);
end $$;
revoke all on function public._pack_streak_state(uuid, timestamptz) from public, anon, authenticated;

create or replace function public._pack_streak(p_user uuid, p_now timestamptz)
returns integer language sql stable security definer set search_path = public as $$
  select (public._pack_streak_state(p_user, p_now) ->> 'streak')::integer
$$;
revoke all on function public._pack_streak(uuid, timestamptz) from public, anon, authenticated;

-- Les anciennes entrées internes restent compatibles, sans monnaie de série.
create or replace function public._streak_reward_points(p_day integer)
returns integer language sql immutable as $$ select 0 $$;
create or replace function public._streak_reward_tokens(p_day integer)
returns integer language sql immutable as $$ select 0 $$;
create or replace function public._streak_reward_packs(p_day integer)
returns integer language sql immutable as $$
  select case when p_day between 1 and 6 then 1 else 0 end
$$;
revoke all on function public._streak_reward_points(integer) from public, anon, authenticated;
revoke all on function public._streak_reward_tokens(integer) from public, anon, authenticated;
revoke all on function public._streak_reward_packs(integer) from public, anon, authenticated;

-- Plus de transfert non consenti : les anciens clients ne peuvent pas voler.
revoke all on function public.last_pack_steal(bigint, integer) from public, anon, authenticated;

-- open_pack ci-dessous repart de 0056 : son tirage de cercle reste identique.

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
  v_packs_serie integer := 0;
  v_serie jsonb;
  v_solde_avant integer;
  v_solde_apres integer;
  v_jackpot boolean := false;
  v_line public.saves;
  v_circle_slug text;
  v_missing text[]; v_preferred text; v_circle_pool text[]; v_final_weights jsonb;
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
  v_serie := public._pack_streak_state(v_user_id, v_now);
  v_streak := (v_serie ->> 'streak')::integer;
  v_jackpot := v_streak % 7 = 0
               and coalesce(p_jackpot, 'perfect') <> 'hourglasses'
               and not public._pack_perfect_today(v_user_id, v_now);
  v_jour := ((v_streak - 1) % 7) + 1;
  v_points_serie := 0;
  v_tokens_serie := 0;
  -- Le verrou pack_state sérialise les ouvertures ; le journal empêche
  -- un second versement le même jour, y compris depuis un autre appareil.
  if not exists (select 1 from public.pack_draws d where d.user_id = v_user_id
      and d.kind = 'live' and public._pack_game_day(d.drawn_at) = public._pack_game_day(v_now)) then
    v_packs_serie := public._streak_reward_packs(v_jour);
  end if;

  v_rare_drop := v_jackpot or v_pity + 1 >= 12 or public._pack_random_int(1000) < 1;
  v_drawn := '{}';
  v_missing := public._pack_circle_missing(v_user_id);
  select slugs[1] into v_preferred from public.player_circles where user_id = v_user_id;
  v_final_weights := case when v_pity + 1 >= 12 or v_jackpot then '{"legendary":1}'::jsonb
    when v_rare_drop then '{"epic":82,"legendary":18}'::jsonb
    else '{"rare":82,"epic":15,"legendary":3}'::jsonb end;
  v_circle_slug := public._pack_circle_pick(v_missing, v_final_weights, v_preferred);
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
    if v_circle_slug is not null and v_i <= 2 then
      select coalesce(array_agg(s order by o), '{}'::text[]) into v_circle_pool
        from unnest(v_missing) with ordinality as t(s, o)
       where s <> v_circle_slug and not (s = any(v_used));
      if cardinality(v_circle_pool) = 0 then v_circle_pool := v_missing; end if;
      v_slug := public._pack_circle_pick(v_circle_pool, v_weights, v_preferred);
    else
      v_slug := public._pack_choose_creator(v_weights, v_used || v_missing);
    end if;
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
  -- La carte absente réservée prime sur la garantie historique de rareté.
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
  v_packs := v_packs + v_packs_serie;
  update public.pack_state
     set packs = v_packs, promo_packs = v_promo_packs, last_regen_at = v_last_regen,
         openings = v_openings + 1, updated_at = v_now
   where user_id = v_user_id;
  insert into public.pack_draws (user_id, drawn_at, cards) values (v_user_id, v_now, v_cards);
  perform public.card_claim_add(v_user_id, v_cards, 'tirage');
  v_line := public._save_add_pack_cards(v_user_id, v_cards, v_packs, v_last_regen, v_openings + 1, v_now);

  update public.saves set state = state || jsonb_build_object(
    'streak', v_jour, 'streakDay', public._pack_game_day(v_now)::text,
    'streakProtectionUsed', (v_serie ->> 'protection_used')::boolean)
    where user_id = v_user_id returning * into v_line;

  return jsonb_build_object(
    'packs', v_packs, 'promo_packs', v_promo_packs,
    'last_regen_at', v_last_regen, 'openings', v_openings + 1, 'cards', v_cards,
    'pity', public._pack_pity(v_user_id), 'streak', v_streak,
    'pity_hit', v_pity + 1 >= 12,
    'pity_circle', v_circle_slug is not null,
    'streak_reward', jsonb_build_object('day', v_jour, 'points', 0, 'tokens', 0, 'packs', v_packs_serie),
    'streak_protection_used', (v_serie ->> 'protection_used')::boolean,
    'jackpot', v_jackpot, 'save', to_jsonb(v_line)
  );
end;
$$;
revoke all on function public.open_pack(text) from public, anon;
grant execute on function public.open_pack(text) to authenticated;

