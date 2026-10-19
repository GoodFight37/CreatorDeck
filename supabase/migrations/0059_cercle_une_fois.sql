-- creatordeck-deploy: automatic
-- 0059 : une chaîne du cercle sort au plus une fois par booster.
-- Avec moins de trois chaînes du cercle encore absentes, 0056 (repris par 0057)
-- complétait les slots 1 et 2 en répétant ces chaînes : une seule chaîne nommée
-- pouvait sortir trois fois. Désormais, quand il ne reste plus d’absente
-- inutilisée, la case est tirée dans le classement (pool mondial, chaînes du
-- cercle exclues), comme les slots 3 et 4. Le slot 5 garde la dernière absente.
-- Seul ce repli change : poids, garantie, série (0057) et écritures inchangés.
-- open_pack() repart de 0057 ; open_return_gift_pack() de 0056 (jamais redéfinie).
-- Miroir TypeScript : circleDrawSlots (src/lib/circle-draw.ts).
-- Contrat : src/lib/supabase-cercle-unique.test.ts.

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
      if cardinality(v_circle_pool) = 0 then
        -- 0059 : une chaîne du cercle au plus une fois ; la case revient au classement.
        v_slug := public._pack_choose_creator(v_weights, v_used || v_missing);
      else
        v_slug := public._pack_circle_pick(v_circle_pool, v_weights, v_preferred);
      end if;
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
      if cardinality(v_circle_pool) = 0 then
        -- 0059 : une chaîne du cercle au plus une fois ; la case revient au classement.
        v_slug := public._pack_choose_creator(v_weights, v_used || v_missing);
      else
        v_slug := public._pack_circle_pick(v_circle_pool, v_weights, v_preferred);
      end if;
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
