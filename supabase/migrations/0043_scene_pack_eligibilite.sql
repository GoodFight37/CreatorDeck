-- Paquet Scène : rester ouvrable dans les familles à petit vivier et aligner
-- les règles locales/serveur. 0016 est déjà publiée : migration additive.
create or replace function public.scene_pack_choices(p_family text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_day date;
  -- Poids recopiés de src/data/pull-rates.json (booster « scene »).
  v_slots jsonb[] := array[
    '{"common": 40, "uncommon": 34, "rare": 20, "epic": 6}'::jsonb,
    '{"common": 40, "uncommon": 34, "rare": 20, "epic": 6}'::jsonb,
    '{"common": 34, "uncommon": 34, "rare": 24, "epic": 8}'::jsonb,
    '{"common": 24, "uncommon": 36, "rare": 30, "epic": 10}'::jsonb
  ];
  v_guaranteed jsonb := '{"rare": 70, "epic": 30}'::jsonb;
  v_rare_drop jsonb := '{"epic": 100}'::jsonb;
  v_rare_drop_permille integer := 3;
  v_variant_upgrade_permille integer := 500;
  v_holo_permille integer := 75;
  v_choices jsonb := '[]'::jsonb;
  v_slot jsonb;
  v_rare_drop_hit boolean;
  v_cards jsonb;
  v_rarity text;
  v_weight integer;
  v_i integer;
  v_family_count integer;
  v_guaranteed_count integer;
  v_epic_count integer;
  v_reservation_count integer;
  v_total_weight integer;
  v_available_count integer;
  v_offset integer;
  v_roll bigint;
  v_cumulative integer;
  v_selected_rarity text;
  v_selected_slug text;
  v_reserved_slug text;
  v_seed text;
  v_used_slugs text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'paquet scène : connecte-toi pour ouvrir' using errcode = 'P0001';
  end if;

  if p_family is null or p_family = '' then
    raise exception 'paquet scène : famille manquante' using errcode = 'P0001';
  end if;

  select count(*) filter (where c.rarity <> 'legendary')::integer,
         count(*) filter (where c.rarity in ('rare', 'epic'))::integer,
         count(*) filter (where c.rarity = 'epic')::integer
    into v_family_count, v_guaranteed_count, v_epic_count
    from public.creators c
   where c.region = p_family and not c.retired;

  -- Cinq créateurs distincts et au moins un candidat pour le dernier slot.
  if v_family_count < 5 or v_guaranteed_count < 1 then
    raise exception 'paquet scène : famille inconnue, trop petite ou incompatible (%)', p_family
      using errcode = 'P0001';
  end if;

  v_day := public._pack_game_day(now());
  v_seed := v_user_id::text || v_day::text || p_family;
  v_rare_drop_hit := mod(abs(hashtext(v_seed)::bigint), 1000) < v_rare_drop_permille;

  -- Quand le vivier final est au plus grand que le nombre de slots précédents,
  -- choisir un candidat réservé de façon déterministe. Scène pleine réserve un
  -- Épique s'il y en a 1 à 4 ; sinon elle réserve le pool Rare/Épique final.
  if v_rare_drop_hit and v_epic_count between 1 and 4 then
    v_reservation_count := v_epic_count;
    select candidates.slug into v_reserved_slug
      from (
        select c.slug, row_number() over (order by c.slug) - 1 as ordinal
          from public.creators c
         where c.region = p_family and not c.retired and c.rarity = 'epic'
      ) candidates
     where candidates.ordinal = mod(abs(hashtext(v_seed || ':reserve')::bigint), v_reservation_count);
  elsif (not v_rare_drop_hit or v_epic_count = 0) and v_guaranteed_count <= 4 then
    v_reservation_count := v_guaranteed_count;
    select candidates.slug into v_reserved_slug
      from (
        select c.slug, row_number() over (order by c.slug) - 1 as ordinal
          from public.creators c
         where c.region = p_family and not c.retired and c.rarity in ('rare', 'epic')
      ) candidates
     where candidates.ordinal = mod(abs(hashtext(v_seed || ':reserve')::bigint), v_reservation_count);
  end if;

  for v_i in 1..5 loop
    if v_i = 5 then
      -- Si un Épique reste (y compris le réservé), Scène pleine le prend ;
      -- sinon la garantie Rare/Épique habituelle ferme le paquet.
      if v_rare_drop_hit and exists (
        select 1 from public.creators c
         where c.region = p_family and not c.retired and c.rarity = 'epic'
           and not (c.slug = any(v_used_slugs))
      ) then
        v_slot := v_rare_drop;
      else
        v_slot := v_guaranteed;
      end if;
    elsif v_rare_drop_hit and exists (
      select 1 from public.creators c
       where c.region = p_family and not c.retired and c.rarity = 'epic'
         and not (c.slug = any(v_used_slugs))
         and (v_reserved_slug is null or c.slug <> v_reserved_slug)
    ) then
      -- Épuiser d'abord les Épiques non réservés. Après cela, les poids
      -- ordinaires sont renormalisés sans Epic, comme dans le moteur local.
      v_slot := v_rare_drop;
    elsif v_rare_drop_hit and v_epic_count between 1 and 4 then
      v_slot := v_slots[v_i] - 'epic';
    else
      v_slot := v_slots[v_i];
    end if;

    -- Choisir une rareté avec ses poids nominaux (indépendamment du nombre de
    -- créateurs), puis un créateur uniforme sans remise dans cette rareté.
    select coalesce(sum(w.value::integer), 0)::integer
      into v_total_weight
      from jsonb_each_text(v_slot) w
     where w.value::integer > 0
       and exists (
         select 1 from public.creators c
          where c.region = p_family and not c.retired and c.rarity = w.key
            and c.rarity <> 'legendary'
            and not (c.slug = any(v_used_slugs))
            and (v_i = 5 or v_reserved_slug is null or c.slug <> v_reserved_slug)
            and (not (v_rare_drop_hit and v_epic_count between 1 and 4 and v_i = 5)
                 or c.slug = v_reserved_slug)
       );

    if v_total_weight <= 0 then
      raise exception 'paquet scène : famille incompatible avec le slot % (%)', v_i, p_family
        using errcode = 'P0001';
    end if;

    v_roll := mod(abs(hashtext(v_seed || ':rarity:' || v_i::text)::bigint), v_total_weight);
    v_cumulative := 0;
    v_selected_rarity := null;
    for v_rarity, v_weight in
      select w.key, w.value::integer
        from jsonb_each_text(v_slot) w
       where w.value::integer > 0
         and exists (
           select 1 from public.creators c
            where c.region = p_family and not c.retired and c.rarity = w.key
              and c.rarity <> 'legendary'
              and not (c.slug = any(v_used_slugs))
              and (v_i = 5 or v_reserved_slug is null or c.slug <> v_reserved_slug)
              and (not (v_rare_drop_hit and v_epic_count between 1 and 4 and v_i = 5)
                   or c.slug = v_reserved_slug)
         )
       order by w.key
    loop
      if v_roll < v_cumulative + v_weight then
        v_selected_rarity := v_rarity;
        exit;
      end if;
      v_cumulative := v_cumulative + v_weight;
    end loop;

    select count(*)::integer into v_available_count
      from public.creators c
     where c.region = p_family and not c.retired
       and c.rarity = v_selected_rarity and c.rarity <> 'legendary'
       and not (c.slug = any(v_used_slugs))
       and (v_i = 5 or v_reserved_slug is null or c.slug <> v_reserved_slug)
       and (not (v_rare_drop_hit and v_epic_count between 1 and 4 and v_i = 5)
            or c.slug = v_reserved_slug);

    v_offset := mod(abs(hashtext(
      v_seed || ':creator:' || v_i::text || ':' || v_selected_rarity
    )::bigint), v_available_count);
    select c.slug into v_selected_slug
      from public.creators c
     where c.region = p_family and not c.retired
       and c.rarity = v_selected_rarity and c.rarity <> 'legendary'
       and not (c.slug = any(v_used_slugs))
       and (v_i = 5 or v_reserved_slug is null or c.slug <> v_reserved_slug)
       and (not (v_rare_drop_hit and v_epic_count between 1 and 4 and v_i = 5)
            or c.slug = v_reserved_slug)
     order by c.slug
     offset v_offset limit 1;

    v_used_slugs := array_append(v_used_slugs, v_selected_slug);
    v_cards := jsonb_build_array(jsonb_build_object(
      'slug', v_selected_slug,
      'rarity', v_selected_rarity,
      'variant', public._pack_scene_variant(
        v_user_id, v_day, v_i, v_selected_slug, v_selected_rarity, v_rare_drop_hit,
        v_variant_upgrade_permille, v_holo_permille
      )
    ));
    v_choices := v_choices || jsonb_build_array(v_cards);
  end loop;

  return jsonb_build_object(
    'day', v_day,
    'family', p_family,
    'rare_drop', v_rare_drop_hit,
    'choices', v_choices
  );
end;
$$;

revoke all on function public.scene_pack_choices(text) from public, anon;
grant execute on function public.scene_pack_choices(text) to authenticated;
