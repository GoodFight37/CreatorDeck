-- creatordeck-deploy: manual
-- 0056 : chaque Live Drop (cadeaux compris) garde le cercle incomplet.
-- Base open_pack : 0055, sans changer les poids du pool mondial.
-- Slots 1, 2 et 5 : chaînes absentes de la collection au début du tirage.
-- Sous trois absentes, répétitions autorisées pour tenir trois cartes sur cinq.
-- La complétion prime sur la rareté du slot, y compris sous pity/Perfect.
-- Miroir : src/lib/circle-draw.ts ; preuve SQL : scripts/verify-circle-draw.mjs.

create or replace function public._pack_circle_missing(p_user uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(c.slug order by t.position), '{}'::text[])
    from public.player_circles pc
    cross join lateral unnest(pc.slugs) with ordinality as t(slug, position)
    join public.creators c on c.slug = t.slug and not c.retired
   where pc.user_id = p_user
     and not exists (select 1 from public.user_cards uc
                      where uc.user_id = p_user and uc.creator_slug = c.slug)
$$;
revoke all on function public._pack_circle_missing(uuid) from public, anon, authenticated;

create or replace function public._pack_circle_pick(p_pool text[], p_weights jsonb, p_preferred text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_weights jsonb := p_weights; v_tiers jsonb; v_slug text; v_rarity text;
  v_live text[] := public._direct_live_logins();
  v_bucket text[]; v_weight integer; v_total integer; v_roll integer;
  v_chosen text; v_chosen_weight integer; v_preferred_weight integer;
begin
  if coalesce(array_length(p_pool, 1), 0) = 0 then return null; end if;
  select jsonb_object_agg(c.slug, c.rarity) into v_tiers
    from public.creators c where c.slug = any(p_pool);
  -- Même repli que le miroir TS : toutes les raretés deviennent admissibles
  -- si les poids du slot n'offrent aucune des chaînes manquantes.
  if not exists (select 1 from public.creators c where c.slug = any(p_pool)
                  and coalesce((p_weights ->> c.rarity)::integer, 0) > 0) then
    v_weights := '{"common":1,"uncommon":1,"rare":1,"epic":1,"legendary":1}';
  end if;
  -- _circle_pick conserve la roue des raretés ; le choix dans la rareté
  -- est refait ci-dessous avec le bonus Direct et la préférence à égalité.
  v_slug := public._circle_pick(p_pool, v_tiers, v_weights);
  v_rarity := v_tiers ->> v_slug;
  select array_agg(t.slug order by t.position),
         sum(case when c.login = any(coalesce(v_live, '{}'::text[])) then 1500 else 1000 end)::integer
    into v_bucket, v_total
    from unnest(p_pool) with ordinality as t(slug, position)
    join public.creators c on c.slug = t.slug where c.rarity = v_rarity;
  v_roll := public._pack_random_int(v_total);
  foreach v_slug in array v_bucket loop
    select case when c.login = any(coalesce(v_live, '{}'::text[])) then 1500 else 1000 end
      into v_weight from public.creators c where c.slug = v_slug;
    if v_slug = p_preferred then v_preferred_weight := v_weight; end if;
    if v_chosen is null then
      v_roll := v_roll - v_weight;
      if v_roll < 0 then v_chosen := v_slug; v_chosen_weight := v_weight; end if;
    end if;
  end loop;
  if v_preferred_weight = v_chosen_weight then return p_preferred; end if;
  return v_chosen;
end $$;
revoke all on function public._pack_circle_pick(text[], jsonb, text) from public, anon, authenticated;

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

create or replace function public.open_return_gift_pack()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_gift public.return_gifts; v_now timestamptz:=now();
  v_rare boolean; v_pity integer; v_weights jsonb; v_live text[];
  v_used text[]:='{}'; v_drawn jsonb[]:='{}'; v_cards jsonb:='[]';
  v_missing text[]; v_preferred text; v_circle_last text; v_circle_pool text[]; v_final_weights jsonb;
  v_i integer; v_slug text; v_rarity text; v_variant text; v_card jsonb; v_save public.saves;
begin
  if v_user is null then raise exception 'cadeau : connecte-toi' using errcode='P0001'; end if;
  -- Même verrou que open_pack : deux appareils ne lisent pas une ancienne collection.
  insert into public.pack_state(user_id, packs, last_regen_at)
    values(v_user, public._pack_initial_packs(), v_now) on conflict(user_id) do nothing;
  perform 1 from public.pack_state where user_id = v_user for update;
  select * into v_gift from public.return_gifts where user_id=v_user for update;
  if v_gift.user_id is null or v_gift.claimed_at is null or v_gift.boosters_remaining < 1 then raise exception 'cadeau : réclame le cadeau disponible' using errcode='P0001'; end if;
  if not exists (select 1 from public.onboarding_state where user_id=v_user and tutorial_completed_at is not null) then raise exception 'cadeau : termine le tutoriel avant de l''ouvrir' using errcode='P0001'; end if;
  select count(*)::integer into v_pity
    from public.pack_draws d
   where d.user_id=v_user and d.kind='live'
     and d.id > coalesce((select max(legendary.id) from public.pack_draws legendary where legendary.user_id=v_user and legendary.kind='live' and exists (select 1 from jsonb_array_elements(legendary.cards) c where c->>'rarity'='legendary')),0);
  v_live:=public._direct_live_logins();
  v_rare:=v_pity + 1 >= 12 or public._pack_random_int(1000)<1;
  v_missing := public._pack_circle_missing(v_user);
  select slugs[1] into v_preferred from public.player_circles where user_id = v_user;
  v_final_weights := case when v_pity + 1 >= 12 then '{"legendary":1}'::jsonb
    when v_rare then '{"epic":82,"legendary":18}'::jsonb
    else '{"rare":82,"epic":15,"legendary":3}'::jsonb end;
  v_circle_last := public._pack_circle_pick(v_missing, v_final_weights, v_preferred);
  for v_i in 1..5 loop
    if v_rare then v_weights:='{"epic":82,"legendary":18}'::jsonb;
    elsif v_i<=2 then v_weights:='{"common":42,"uncommon":30,"rare":18,"epic":8,"legendary":2}'::jsonb;
    elsif v_i=3 then v_weights:='{"common":34,"uncommon":32,"rare":22,"epic":10,"legendary":2}'::jsonb;
    elsif v_i=4 then v_weights:='{"common":20,"uncommon":34,"rare":28,"epic":15,"legendary":3}'::jsonb;
    else v_weights:='{"rare":82,"epic":15,"legendary":3}'::jsonb; end if;
    if v_i=5 and (v_pity+1>=12 or v_rare) then
      if v_pity+1>=12 then v_weights:='{"legendary":1}'::jsonb; else v_weights:='{"epic":82,"legendary":18}'::jsonb; end if;
    end if;
    if v_circle_last is not null and v_i = 5 then
      v_slug := v_circle_last;
    elsif v_circle_last is not null and v_i <= 2 then
      select coalesce(array_agg(s order by o), '{}'::text[]) into v_circle_pool
        from unnest(v_missing) with ordinality as t(s, o)
       where s <> v_circle_last and not (s = any(v_used));
      if cardinality(v_circle_pool) = 0 then v_circle_pool := v_missing; end if;
      v_slug := public._pack_circle_pick(v_circle_pool, v_weights, v_preferred);
    else
      v_slug := public._pack_choose_creator(v_weights, v_used || v_missing);
    end if;
    v_used := v_used || v_slug;
    select c.rarity into v_rarity from public.creators c where c.slug=v_slug;
    v_variant:=case when v_i=5 and v_slug=any(coalesce(v_live,'{}'::text[])) then 'live' else public._pack_choose_variant(v_rarity,v_rare,v_slug=any(coalesce(v_live,'{}'::text[]))) end;
    v_card:=jsonb_build_object('id',gen_random_uuid()::text,'obtainedAt',(extract(epoch from v_now)*1000)::bigint,'creatorSlug',v_slug,'rarity',v_rarity,'variant',v_variant,'rareDrop',v_rare);
    v_drawn:=v_drawn||v_card;
  end loop;
  for v_i in 1..array_length(v_drawn,1) loop v_cards:=v_cards||v_drawn[v_i]; end loop;
  insert into public.return_gift_draws(user_id,drawn_at,cards) values(v_user,v_now,v_cards);
  perform public.card_claim_add(v_user,v_cards,'cadeau');
  update public.return_gifts set boosters_remaining=boosters_remaining-1 where user_id=v_user returning * into v_gift;
  -- Ajouter les cartes avec un helper dédié au cadeau préserve tous les
  -- compteurs ordinaires. Le helper des boosters normaux reste inchangé.
  v_save:=public._save_add_gift_cards(v_user,v_cards,coalesce((select packs from public.pack_state where user_id=v_user),2),coalesce((select last_regen_at from public.pack_state where user_id=v_user),v_now),coalesce((select openings from public.pack_state where user_id=v_user),0),v_now);
  return jsonb_build_object('cards',v_cards,'gift_remaining',v_gift.boosters_remaining,'save',to_jsonb(v_save));
end $$;

revoke all on function public.open_return_gift_pack() from public,anon;
grant execute on function public.open_return_gift_pack() to authenticated;


-- Porte conservée pour les clients existants : tous les cadeaux suivent la même règle.
-- La rareté d'affichage du premier cadeau reste celle de 0054, sans la propager aux suivants.
create or replace function public.open_circle_gift_pack(p_slugs text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_first boolean; v_result jsonb; v_cards jsonb; v_circle text[];
begin
  if v_user is null then raise exception 'cadeau : connecte-toi' using errcode = 'P0001'; end if;
  perform public.set_circle(p_slugs);
  select slugs into v_circle from public.player_circles where user_id = v_user;
  insert into public.pack_state(user_id, packs, last_regen_at)
    values(v_user, public._pack_initial_packs(), now()) on conflict(user_id) do nothing;
  perform 1 from public.pack_state where user_id = v_user for update;
  v_first := not exists(select 1 from public.return_gift_draws where user_id = v_user);
  v_result := public.open_return_gift_pack();
  if v_first then
    select jsonb_agg(case when (card ->> 'creatorSlug') = any(v_circle)
      then card || jsonb_build_object('circleRarity', public._circle_tier(
        array_position(v_circle, card ->> 'creatorSlug') - 1, cardinality(v_circle)))
      else card end order by position) into v_cards
      from jsonb_array_elements(v_result -> 'cards') with ordinality as t(card, position);
    v_result := jsonb_set(v_result, '{cards}', v_cards);
  end if;
  return v_result;
end $$;
revoke all on function public.open_circle_gift_pack(text[]) from public, anon;
grant execute on function public.open_circle_gift_pack(text[]) to authenticated;
