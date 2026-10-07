-- CreatorDeck — les Sortants : les créateurs qui ont quitté le classement.
--
-- À exécuter après `0015_wishlist.sql`.
--
-- Le catalogue n'est pas figé : il est régénéré depuis le classement Twitch, et
-- une régénération fait entrer du monde et en faire sortir. Ceux qui sortent ne
-- peuvent pas être supprimés — leurs cartes vivent dans des classeurs, des
-- échanges et des ventes — et ils ne peuvent pas non plus rester dans le
-- tirage : la complétion deviendrait inatteignable, et le catalogue grossirait
-- à chaque saison.
--
-- D'où cette migration. Elle ne supprime rien : elle **pose un filtre**.
--
--   * `public.creators` gagne la colonne `retired` (défaut `false`), écrite par
--     `0003_catalogue.sql` — le seed marque les Sortants d'après
--     `src/data/retired.json` ;
--   * le tirage (`_pack_choose_creator`) et le Paquet Scène
--     (`scene_pack_choices`) ne choisissent plus un créateur `retired` ;
--   * les compteurs ne les comptent plus : `refresh_stats()` (donc le
--     classement) et `player_profile()` (complétion, « 12 / 50 légendaires »,
--     « 40 / 155 en France & francophonie »).
--
-- Ce qui **n'est pas** touché, volontairement :
--
--   * les échanges : une carte Sortante s'échange comme les autres. C'est même
--     tout son intérêt — elle ne tombe plus, mais elle circule ;
--   * l'hôtel des ventes : elle s'y vend, et à son prix ;
--   * le Last Pack : elle peut y être prise ;
--   * la vitrine : elle s'affiche sur un profil public.
--
-- Autrement dit : un Sortant quitte les tirages, pas le jeu.
--
-- Rejouable : `create or replace` sur les quatre fonctions, `add column if not
-- exists`, et les `grant`/`revoke` d'origine (recopiés à l'identique).

-- --------------------------------------------------------------------------
-- 1. La colonne
-- --------------------------------------------------------------------------
-- `0003_catalogue.sql` la crée aussi ; cette ligne rend la migration autonome
-- pour une base qui n'aurait pas encore reçu le seed regénéré.
alter table public.creators add column if not exists retired boolean not null default false;
create index if not exists creators_retired_idx on public.creators (retired);

-- --------------------------------------------------------------------------
-- 2. Le tirage ne pioche plus un Sortant
-- --------------------------------------------------------------------------
-- Même fonction que `0004_tirage.sql`, avec deux filtres de plus : un Sortant
-- n'est ni candidat, ni compté quand il s'agit de savoir si une rareté est
-- encore disponible.


create or replace function public._pack_choose_creator(
  p_weights jsonb,
  p_used_slugs text[]
)
returns text -- slug du créateur choisi
language plpgsql
stable
set search_path = public
as $$
declare
  v_live text[] := public._direct_live_logins();
  v_rarity text;
  v_weight integer;
  v_total integer := 0;
  v_roll integer;
  v_bucket text[];
  v_bucket_weights integer[];
  v_bucket_weight integer := 0;
  v_index integer;
  v_available_rarities text[];
  v_rarity_weight integer;
begin
  -- Pondérations effectives : une rareté n'est éligible que si au moins un
  -- créateur de cette rareté n'est pas encore utilisé.
  v_available_rarities := '{}';
  for v_rarity in select unnest(array['common','uncommon','rare','epic','legendary']) loop
    v_rarity_weight := coalesce((p_weights ->> v_rarity)::integer, 0);
    if v_rarity_weight > 0 then
      perform 1
        from public.creators c
       where c.rarity = v_rarity
         and not (c.slug = any (p_used_slugs))
         and not c.retired
       limit 1;
      if found then
        v_available_rarities := v_available_rarities || v_rarity;
      end if;
    end if;
  end loop;

  if array_length(v_available_rarities, 1) is null then
    raise exception 'tirage : le catalogue disponible est vide' using errcode = 'P0001';
  end if;

  -- Tri par ordre de rareté (du plus commun au plus rare) : même parcours que
  -- le moteur local (RARITY_META.order).
  for v_rarity in
    select r
      from unnest(v_available_rarities) as r
     order by array_position(array['common','uncommon','rare','epic','legendary'], r)
  loop
    v_weight := coalesce((p_weights ->> v_rarity)::integer, 0);
    v_total := v_total + v_weight;
  end loop;

  v_roll := public._pack_random_int(v_total);

  for v_rarity in
    select r
      from unnest(v_available_rarities) as r
     order by array_position(array['common','uncommon','rare','epic','legendary'], r)
  loop
    v_weight := coalesce((p_weights ->> v_rarity)::integer, 0);
    if v_roll < v_weight then
      -- Tirage pondéré parmi les créateurs disponibles de cette rareté :
      -- ×1,5 pour ceux qui streament (bonus Direct).
      select array_agg(c.slug order by c.slug),
             array_agg(public._pack_creator_weight(c.login, v_live) order by c.slug)
        into v_bucket, v_bucket_weights
        from public.creators c
       where c.rarity = v_rarity
         and not (c.slug = any (p_used_slugs))
         and not c.retired;

      v_bucket_weight := 0;
      for v_index in 1..array_length(v_bucket, 1) loop
        v_bucket_weight := v_bucket_weight + v_bucket_weights[v_index];
      end loop;

      v_roll := public._pack_random_int(v_bucket_weight);
      for v_index in 1..array_length(v_bucket, 1) loop
        if v_roll < v_bucket_weights[v_index] then
          return v_bucket[v_index];
        end if;
        v_roll := v_roll - v_bucket_weights[v_index];
      end loop;

      -- Ne devrait jamais arriver : le parcours couvre la somme exacte.
      return v_bucket[array_length(v_bucket, 1)];
    end if;
    v_roll := v_roll - v_weight;
  end loop;

  raise exception 'tirage : erreur interne de sélection de créateur' using errcode = 'P0001';
end;
$$;

-- --------------------------------------------------------------------------
-- 3. La série de jours et le plancher de malchance restent inchangés
-- --------------------------------------------------------------------------
-- Rien à faire ici : ces compteurs lisent le **journal des tirages**, pas le
-- catalogue. Un Sortant qui tombe avant son départ continue de compter dans le
-- plancher de malchance comme n'importe quelle carte.

-- --------------------------------------------------------------------------
-- 4. Le Paquet Scène ne propose plus un Sortant
-- --------------------------------------------------------------------------
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
  -- Poids par slot, recopiés de src/data/pull-rates.json (booster « scene »).
  -- Les commentaires pointent le fichier : si un poids change là-bas,
  -- `src/lib/supabase-scene.test.ts` tombe tant qu'il n'est pas suivi ici.
  v_slots jsonb[] := array[
    '{"common": 40, "uncommon": 34, "rare": 20, "epic": 6}'::jsonb,
    '{"common": 40, "uncommon": 34, "rare": 20, "epic": 6}'::jsonb,
    '{"common": 34, "uncommon": 34, "rare": 24, "epic": 8}'::jsonb,
    '{"common": 24, "uncommon": 36, "rare": 30, "epic": 10}'::jsonb
  ];
  v_guaranteed jsonb := '{"rare": 70, "epic": 30}'::jsonb;
  v_rare_drop jsonb := '{"epic": 100}'::jsonb;   -- Scène pleine
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
begin
  if v_user_id is null then
    raise exception 'paquet scène : connecte-toi pour ouvrir' using errcode = 'P0001';
  end if;

  if p_family is null or p_family = '' then
    raise exception 'paquet scène : famille manquante' using errcode = 'P0001';
  end if;

  -- La famille doit exister dans le catalogue publié et compter assez de
  -- créateurs pour remplir cinq cartes sans doublon.
  if (select count(*) from public.creators c where c.region = p_family and not c.retired) < 5 then
    raise exception 'paquet scène : famille inconnue ou trop petite (%).', p_family
      using errcode = 'P0001';
  end if;

  v_day := public._pack_game_day(now());

  -- Le tirage rare du jour, décidé une fois pour le joueur et la journée.
  v_rare_drop_hit := mod(
    abs(hashtext(v_user_id::text || v_day::text || p_family)::bigint),
    1000
  ) < v_rare_drop_permille;

  for v_i in 1..5 loop
    -- Le slot : les poids ordinaires, ou ceux du tirage rare pour **tous** les
    -- slots quand « Scène pleine » tombe (comme le moteur local).
    v_slot := case
                when v_rare_drop_hit then v_rare_drop
                when v_i = 5 then v_guaranteed
                else coalesce(v_slots[v_i], v_guaranteed)
              end;

    v_cards := '[]'::jsonb;
    for v_rarity, v_weight in
      select key, value::integer from jsonb_each_text(v_slot) where value::integer > 0
    loop
      if v_weight > 0 then
        v_cards := v_cards || coalesce((
          select jsonb_agg(jsonb_build_object(
                   'slug', t.slug,
                   'rarity', t.rarity,
                   'variant', public._pack_scene_variant(
                     v_user_id, v_day, v_i, t.slug, t.rarity, v_rare_drop_hit,
                     v_variant_upgrade_permille, v_holo_permille
                   )
                 ) order by t.slug, t.rep)
            from (
              select c.slug, c.rarity, g.rep
                from public.creators c,
                     generate_series(1, v_weight) as g(rep)
               where c.region = p_family
                 and not c.retired
                 and c.rarity = v_rarity
                 -- Aucune Légendaire : la promesse du paquet, et la table n'en
                 -- porte de toute façon aucun poids.
                 and v_rarity <> 'legendary'
            ) as t
        ), '[]'::jsonb);
      end if;
    end loop;

    if jsonb_array_length(v_cards) = 0 then
      raise exception 'paquet scène : plus personne à découvrir dans cette famille'
        using errcode = 'P0001';
    end if;

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

-- --------------------------------------------------------------------------
-- 5. Le classement ne compte plus les Sortants
-- --------------------------------------------------------------------------
-- `refresh_stats()` recalcule les statistiques publiques depuis la sauvegarde :
-- une carte Sortante ne doit plus compter dans `unique_creators`, sinon la
-- complétion d'un joueur pourrait dépasser le catalogue en cours.
create or replace function public.refresh_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cards jsonb := new.state -> 'cards';
  problems text[] := public.save_problems(new.state);
begin
  -- Les compteurs de qualité ne retiennent que les créateurs du catalogue : la
  -- complétion affichée sur un profil public doit se calculer sur des créateurs
  -- qui existent. (`total_cards` reste le nombre brut de cartes de la
  -- sauvegarde — c'est la seule mesure « physique », inchangée depuis 0001.)
  insert into public.stats as s (
    user_id, unique_creators, total_cards, legendary_cards, epic_cards,
    gold_cards, holo_cards, level, points, verified, updated_at
  )
  with entries as (
    select value ->> 'rarity' as rarity, value ->> 'variant' as variant, lower(value ->> 'creatorSlug') as slug
    from jsonb_array_elements(cards) as value
    where exists (
      select 1 from public.creators c
       where c.slug = lower(value ->> 'creatorSlug')
         and not c.retired
    )
  )
  select
    new.user_id,
    (select count(distinct slug)::int from entries),
    jsonb_array_length(cards),
    (select count(*)::int from entries where rarity = 'legendary'),
    (select count(*)::int from entries where rarity = 'epic'),
    (select count(*)::int from entries where variant = 'gold'),
    (select count(*)::int from entries where variant = 'holo'),
    greatest(1, coalesce((new.state ->> 'level')::int, 1)),
    greatest(0, coalesce((new.state ->> 'points')::int, 0)),
    (array_length(problems, 1) is null),
    now()
  on conflict (user_id) do update set
    unique_creators = excluded.unique_creators,
    total_cards     = excluded.total_cards,
    legendary_cards = excluded.legendary_cards,
    epic_cards      = excluded.epic_cards,
    gold_cards      = excluded.gold_cards,
    holo_cards      = excluded.holo_cards,
    level           = excluded.level,
    points          = excluded.points,
    verified        = excluded.verified,
    updated_at      = excluded.updated_at;

  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- 6. Le profil public non plus
-- --------------------------------------------------------------------------
-- Taille du catalogue, « 12 / 50 légendaires », « 40 / 155 en France » : les
-- trois se mesurent sur ce qu'il reste à collectionner.
create or replace function public.player_profile(p_user_id uuid default null)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  with target as (
    select
      s.*,
      coalesce(p.display_name, 'Collectionneur') as display_name,
      coalesce(p.showcase_slugs, '{}') as showcase_slugs,
      (select w.slug from public.wishlist w where w.user_id = s.user_id) as wishlist_slug
    from public.stats s
    left join public.profiles p on p.user_id = s.user_id
    where s.user_id = coalesce(p_user_id, auth.uid())
  ),
  catalogue as (
    select greatest(count(*), 1)::numeric as size from public.creators c where not c.retired
  ),
  rarity_totals as (
    select c.rarity, count(*)::int as total
    from public.creators c
    where not c.retired
    group by c.rarity
  ),
  owned as (
    -- La rareté est relue dans le catalogue (comme pour les échanges) : une
    -- carte dont la rareté stockée ne correspond pas au catalogue ne peut pas
    -- se placer dans la mauvaise colonne.
    select c.rarity, count(distinct uc.creator_slug)::int as owned
    from public.user_cards uc
    join public.creators c on c.slug = uc.creator_slug
    where uc.user_id = coalesce(p_user_id, auth.uid())
    group by c.rarity
  ),
  family_totals as (
    -- Une famille = une région du catalogue. Un créateur sans région (catalogue
    -- pas encore régénéré) tombe dans la fourre-tout `S10`, comme à l'écran :
    -- jamais de ligne sans nom, jamais de total qui ne s'additionne pas.
    select coalesce(c.region, 'S10') as region_id, count(*)::int as total
    from public.creators c
    where not c.retired
    group by 1
  ),
  family_owned as (
    select coalesce(c.region, 'S10') as region_id, count(distinct uc.creator_slug)::int as owned
    from public.user_cards uc
    join public.creators c on c.slug = uc.creator_slug
    where uc.user_id = coalesce(p_user_id, auth.uid())
    group by 1
  )
  select jsonb_build_object(
    'user_id', t.user_id,
    'display_name', t.display_name,
    'level', t.level,
    'points', t.points,
    'verified', t.verified,
    'unique_creators', t.unique_creators,
    'total_cards', t.total_cards,
    'legendary_cards', t.legendary_cards,
    'epic_cards', t.epic_cards,
    'gold_cards', t.gold_cards,
    'holo_cards', t.holo_cards,
    'catalog_size', (select size::int from catalogue),
    'completion', round(t.unique_creators::numeric / (select size from catalogue), 4),
    'rank_completion', case when t.verified then
      (select count(*)::int + 1 from public.stats o
        where o.verified and o.unique_creators > t.unique_creators) end,
    'rank_cards', case when t.verified then
      (select count(*)::int + 1 from public.stats o
        where o.verified and o.total_cards > t.total_cards) end,
    'showcase_slugs', t.showcase_slugs,
    -- Le créateur que ce joueur cherche. Visible par tous : c'est une demande,
    -- pas un secret.
    'wishlist_slug', t.wishlist_slug,
    'by_rarity', coalesce((
      select jsonb_object_agg(rt.rarity, jsonb_build_object(
        'owned', coalesce(o.owned, 0),
        'total', rt.total
      ))
      from rarity_totals rt
      left join owned o on o.rarity = rt.rarity
    ), '{}'::jsonb),
    'by_region', coalesce((
      select jsonb_object_agg(ft.region_id, jsonb_build_object(
        'owned', coalesce(fo.owned, 0),
        'total', ft.total
      ))
      from family_totals ft
      left join family_owned fo on fo.region_id = ft.region_id
    ), '{}'::jsonb)
  )
  from target t;
$$;
