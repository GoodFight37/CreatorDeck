-- CreatorDeck — le Paquet Scène côté serveur.
--
-- Quatorzième migration du cloud, à exécuter **après** `0013_progression.sql`.
--
-- Le Paquet Scène tire cinq cartes de la famille que le joueur complète, une
-- fois par jour de jeu (6 h UTC, la même journée que les missions), et **jamais
-- de Légendaire** — c'est écrit dans `src/data/pull-rates.json` et vérifié par
-- `catalog:ci`.
--
-- Quand le joueur a un compte, l'ouverture est décidée par le serveur, comme
-- pour le Live Drop. La différence : le tirage du Paquet Scène dépend de ce que
-- le joueur possède déjà (aucun doublon dans le paquet), et c'est le client qui
-- le sait. La garantie utilisée est donc celle de l'échange, dont la mécanique
-- a fait ses preuves (`0005_echanges.sql`) : **le serveur donne les choix, le
-- client tire dans les choix, le serveur vérifie**.
--
--   1. `scene_pack_choices(p_family)` rend cinq listes de cartes éligibles
--      (`slug`, `rareté`, variante) — plus le tirage rare du jour, s'il tombe.
--      Tout y est décidé par le serveur, de façon **déterministe** : le même
--      joueur, le même jour, la même famille rendent exactement la même
--      réponse, ce qui permet de vérifier ensuite.
--   2. Le client tire une carte dans chaque liste (son aléa, son instant).
--   3. `open_scene_pack(p_family, p_cards)` recalcule les mêmes listes et
--      **refuse** toute carte qui n'y figure pas, à la bonne place et avec la
--      bonne variante.
--
-- Ce qu'un client trafiqué ne peut pas faire : sortir une carte absente de ses
-- choix — donc pas de Légendaire, pas de créateur hors famille, pas de doublon
-- dans le paquet, pas cinq Holo, et pas deux Paquets Scène le même jour. Le
-- pire cas est de rejouer le même tirage, et c'est le prix de la greffe
-- minimale : réécrire `_pack_choose_creator()` pour accepter un filtre de
-- famille aurait touché au tirage du Live Drop, qui est en production et ne
-- doit pas bouger.
--
-- Le Paquet Scène ignore le **bonus Direct** : pas de poids ×1,5, pas de
-- variante Live. Le Direct parle du Live Drop ; un paquet de complétion n'a pas
-- à dépendre de qui streame à cet instant.
--
-- Rejouable : `create table if not exists`, `create or replace`, `grant`.

-- --------------------------------------------------------------------------
-- Le journal des tirages apprend à distinguer ses paquets
-- --------------------------------------------------------------------------
-- Le Paquet Scène écrit lui aussi dans `pack_draws` — c'est le journal de tout
-- ce qui est tiré, et c'est lui qui expose le paquet au Last Pack. Mais il ne
-- doit **pas** compter dans le plancher de malchance ni dans la série : ces
-- deux-là parlent du Live Drop, et c'est écrit dans `pull-rates.json`. D'où
-- cette colonne : les lignes existantes (et celles de `open_pack()`, qui ne la
-- renseigne pas) valent `live`.
alter table public.pack_draws
  add column if not exists kind text not null default 'live';

create index if not exists pack_draws_kind_idx on public.pack_draws (user_id, kind, drawn_at desc);

-- --------------------------------------------------------------------------
-- Quel jour de jeu a déjà donné son Paquet Scène
-- --------------------------------------------------------------------------
-- Une ligne par joueur : la journée de jeu (6 h UTC) de la dernière ouverture.
-- Pas de compteur à resynchroniser : `scene_day = aujourd'hui` dit tout.
create table if not exists public.pack_scene (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  scene_day  date not null,
  family_id  text not null,
  opened_at  timestamptz not null default now()
);

alter table public.pack_scene enable row level security;

-- Le joueur lit sa ligne (c'est elle qui dit si le paquet du jour est encore
-- là, et pour quelle famille il a été ouvert).
drop policy if exists "lecture de son paquet scène" on public.pack_scene;
create policy "lecture de son paquet scène"
  on public.pack_scene for select
  to authenticated
  using (auth.uid() = user_id);

-- Aucune politique d'écriture : seule `open_scene_pack()` écrit, et elle est
-- `security definer`.

-- --------------------------------------------------------------------------
-- La journée de jeu (6 h UTC), en une fonction
-- --------------------------------------------------------------------------
-- La même conversion que `gameDay()` du moteur et que `_pack_streak()` : une
-- seule définition par base, pour que les missions, la série et le paquet du
-- jour ne puissent pas basculer à des heures différentes.
create or replace function public._pack_game_day(p_at timestamptz)
returns date
language sql
immutable
as $$
  select ((p_at at time zone 'utc') - interval '6 hours')::date;
$$;

-- --------------------------------------------------------------------------
-- Les choix du Paquet Scène (ce que le joueur a le droit de tirer)
-- --------------------------------------------------------------------------
-- Renvoie :
--   {
--     "day": "2026-10-07",
--     "family": "S01",
--     "rare_drop": false,
--     "choices": [ [ {slug, rarity, variant}, ... ] × 5 ]
--   }
--
-- Les poids sont ceux de `pull-rates.json` (booster « scene »), rareté par
-- rareté, en **répétant** chaque créateur autant de fois que son poids : un
-- tableau Postgres ne connaît pas les pondérations, et répéter dit exactement
-- la même chose que la roue du moteur local.
--
-- Le tirage rare (« Scène pleine », 3‰ : les cinq cartes en Épique) et les
-- variantes sont décidés **ici**, à partir d'un tirage déterministe
-- (`hashtext` du joueur, du jour, du slot et du créateur). Déterministe pour
-- deux raisons : le client ne peut pas réclamer cinq Holo, et la vérification
-- de `open_scene_pack()` recalcule exactement ce que le client a vu.
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
  if (select count(*) from public.creators c where c.region = p_family) < 5 then
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
-- La variante d'une carte : décidée par le serveur, déterministe
-- --------------------------------------------------------------------------
-- Reproduit `chooseVariant()` du moteur pour le Paquet Scène : un seul tirage
-- sert au « Perfect » (amélioration de variante) puis au Holo. Pas de Live (le
-- paquet ignore le Direct), pas de Gold (aucune Légendaire).
create or replace function public._pack_scene_variant(
  p_user uuid,
  p_day date,
  p_slot integer,
  p_slug text,
  p_rarity text,
  p_rare_drop boolean,
  p_upgrade_permille integer,
  p_holo_permille integer
)
returns text
language sql
immutable
as $$
  select case
    when p_rare_drop
         and mod(abs(hashtext(p_user::text || p_day::text || p_slot::text || p_slug)::bigint), 10000)
             < p_upgrade_permille
      then 'holo'
    when p_rarity in ('uncommon', 'rare', 'epic')
         and mod(abs(hashtext(p_user::text || p_day::text || p_slot::text || p_slug)::bigint), 10000)
             < p_holo_permille
      then 'holo'
    else 'standard'
  end;
$$;

-- --------------------------------------------------------------------------
-- Ouvrir le Paquet Scène
-- --------------------------------------------------------------------------
-- Les cartes viennent du client (c'est lui qui connaît sa collection), et sont
-- **vérifiées** contre les choix recalculés à l'instant : même famille, même
-- position, même rareté, même variante. Ensuite, comme pour le Live Drop, le
-- journal (`pack_draws`) atteste du tirage.
create or replace function public.open_scene_pack(
  p_family text,
  p_cards jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_day date;
  v_choices jsonb;
  v_rare_drop boolean;
  v_slugs text[] := '{}';
  v_card jsonb;
  v_slug text;
  v_rarity text;
  v_variant text;
  v_slot jsonb;
  v_i integer;
  v_clean jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'paquet scène : connecte-toi pour ouvrir' using errcode = 'P0001';
  end if;

  v_day := public._pack_game_day(v_now);

  if exists (
    select 1 from public.pack_scene s
     where s.user_id = v_user_id
       and s.scene_day = v_day
  ) then
    raise exception 'paquet scène : ton paquet du jour est déjà ouvert' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) <> 5 then
    raise exception 'paquet scène : il faut exactement cinq cartes' using errcode = 'P0001';
  end if;

  -- Les choix recalculés : la réponse doit être identique à celle que le client
  -- a reçue (le tirage est déterministe pour le joueur et la journée).
  v_choices := public.scene_pack_choices(p_family);
  v_rare_drop := coalesce((v_choices ->> 'rare_drop')::boolean, false);

  for v_i in 0..4 loop
    v_card := p_cards -> v_i;
    if v_card is null then
      raise exception 'paquet scène : carte manquante (position %)', v_i + 1 using errcode = 'P0001';
    end if;

    v_slug := v_card ->> 'creatorSlug';
    v_rarity := v_card ->> 'rarity';
    v_variant := coalesce(v_card ->> 'variant', 'standard');
    v_slot := (v_choices -> 'choices') -> v_i;

    -- La carte exacte (créateur, rareté, variante) doit figurer dans le choix
    -- du slot. `@>` sur un tableau JSONB compare les objets : la moindre
    -- différence de variante fait échouer la vérification.
    if not (v_slot @> jsonb_build_array(jsonb_build_object(
      'slug', v_slug, 'rarity', v_rarity, 'variant', v_variant
    ))) then
      raise exception 'paquet scène : la carte « % » n''est pas proposée en position %',
        coalesce(v_slug, '?'), v_i + 1 using errcode = 'P0001';
    end if;

    if v_slug = any (v_slugs) then
      raise exception 'paquet scène : deux fois le même créateur dans un paquet'
        using errcode = 'P0001';
    end if;
    v_slugs := v_slugs || v_slug;

    -- La carte normalisée : c'est celle-là que le client rangera. Le drapeau du
    -- tirage rare vient du serveur, pas du client.
    v_clean := v_clean || jsonb_build_object(
      'creatorSlug', v_slug,
      'rarity', v_rarity,
      'variant', v_variant,
      'rareDrop', v_rare_drop
    );
  end loop;

  insert into public.pack_scene (user_id, scene_day, family_id, opened_at)
  values (v_user_id, v_day, p_family, v_now)
  on conflict (user_id) do update
    set scene_day = excluded.scene_day,
        family_id = excluded.family_id,
        opened_at = excluded.opened_at;

  -- Le journal des tirages garde une trace du paquet. `_pack_pity()` et
  -- `_pack_streak()` ne comptent que les Légendaires (il n'y en a jamais ici)
  -- et `_pack_perfect_today()` que le tirage rare : un Paquet Scène ordinaire
  -- ne touche donc ni au plancher de malchance, ni à la série, ni à la
  -- récompense du 7ᵉ jour. En revanche, le Last Pack le voit passer — cinq
  -- cartes fraîches, exposées dix minutes — et c'est voulu.
  insert into public.pack_draws (user_id, drawn_at, cards, kind)
  values (v_user_id, v_now, v_clean, 'scene');

  return jsonb_build_object(
    'family', p_family,
    'scene_day', v_day,
    'rare_drop', v_rare_drop,
    'cards', v_clean
  );
end;
$$;

-- --------------------------------------------------------------------------
-- `pack_status()` : le Paquet Scène du jour est-il encore là ?
-- --------------------------------------------------------------------------
-- Le paquet du jour se lit sur la même horloge que la décision : le serveur.
-- L'écran n'a donc pas à demander au téléphone s'il peut ouvrir.
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

  select ps.packs, ps.last_regen_at, ps.openings
    into v_state
    from public.pack_state ps
   where ps.user_id = v_user_id;

  -- Pas de ligne : on simule à partir de la sauvegarde locale, sans écrire.
  if v_state is null then
    v_local_packs := 3;
    v_local_regen := v_now;

    select s.state into v_save_state
      from public.saves s
     where s.user_id = v_user_id;

    if v_save_state is not null then
      v_local_state := v_save_state;
      v_local_packs := greatest(0, least(4, coalesce((v_local_state ->> 'packs')::integer, 3)));
      v_local_regen_epoch := coalesce((v_local_state ->> 'lastPackRegen')::bigint, 0);
      if v_local_regen_epoch > 0 then
        v_local_regen := to_timestamp(v_local_regen_epoch::double precision / 1000);
      end if;
    end if;

    v_state.packs := v_local_packs;
    v_state.last_regen_at := v_local_regen;
    v_state.openings := 0;
  end if;

  -- Recharge (même calcul que open_pack, sans consommer).
  v_refreshed := public._pack_refresh(
    v_state.packs,
    4,
    v_state.last_regen_at,
    1800000,
    v_now
  );

  v_packs := (v_refreshed ->> 'packs')::integer;
  v_last_regen := (v_refreshed ->> 'last_regen_at')::timestamptz;
  v_openings := v_state.openings;

  -- Prochain booster : null si la réserve est pleine.
  if v_packs >= 4 then
    v_next_pack_at := null;
  else
    v_next_pack_at := v_last_regen + '30 minutes'::interval;
  end if;

  v_pity := public._pack_pity(v_user_id);
  v_streak := public._pack_streak(v_user_id, v_now);

  -- Le jackpot attend tant qu'il n'a pas été dépensé et que c'est un jour de
  -- série (7, 14, 21…).
  v_jackpot_ready := v_streak % 7 = 0
                     and not public._pack_perfect_today(v_user_id, v_now);

  select s.scene_day, s.family_id into v_scene
    from public.pack_scene s
   where s.user_id = v_user_id;

  return jsonb_build_object(
    'packs', v_packs,
    'last_regen_at', v_last_regen,
    'openings', v_openings,
    'next_pack_at', v_next_pack_at,
    'pity', v_pity,
    'streak', v_streak,
    'jackpot_ready', v_jackpot_ready,
    'scene_day', v_scene.scene_day,
    'scene_family', v_scene.family_id,
    'scene_ready', v_scene.scene_day is distinct from public._pack_game_day(v_now)
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Les compteurs du Live Drop ne comptent que le Live Drop
-- --------------------------------------------------------------------------
-- `0013_progression.sql` les avait définis sur tout le journal ; le Paquet
-- Scène vient d'y ajouter un second type de paquet, et il ne doit compter ni
-- dans le plancher de malchance, ni dans la série, ni dans le « Perfect du
-- jour ». On les redéfinit donc avec le filtre `kind = 'live'` — la seule
-- différence, les corps sont ceux de 0013.
create or replace function public._pack_pity(p_user uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  if p_user is null then
    return 0;
  end if;

  for v_row in
    select d.cards
      from public.pack_draws d
     where d.user_id = p_user
       and d.kind = 'live'
     order by d.drawn_at desc, d.id desc
     limit 200
  loop
    exit when exists (
      select 1
        from jsonb_array_elements(v_row.cards) as c
       where c ->> 'rarity' = 'legendary'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public._pack_streak(p_user uuid, p_now timestamptz)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := public._pack_game_day(p_now);
  v_days date[];
  v_expected date;
  v_day date;
  v_streak integer := 0;
begin
  if p_user is null then
    return 1;
  end if;

  select coalesce(array_agg(day order by day desc), '{}')
    into v_days
    from (
      select distinct public._pack_game_day(d.drawn_at) as day
        from public.pack_draws d
       where d.user_id = p_user
         and d.kind = 'live'
       order by day desc
       limit 60
    ) as jours;

  -- Premier booster de sa vie : c'est le jour 1.
  if array_length(v_days, 1) is null then
    return 1;
  end if;

  if v_days[1] = v_today then
    v_expected := v_today;
  elsif v_days[1] = v_today - 1 then
    v_expected := v_today - 1;
    v_streak := 1;
  else
    return 1;
  end if;

  foreach v_day in array v_days loop
    exit when v_day <> v_expected;
    v_streak := v_streak + 1;
    v_expected := v_expected - 1;
  end loop;

  return v_streak;
end;
$$;

create or replace function public._pack_perfect_today(p_user uuid, p_now timestamptz)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.pack_draws d
     where d.user_id = p_user
       and d.kind = 'live'
       and public._pack_game_day(d.drawn_at) = public._pack_game_day(p_now)
       and exists (
         select 1
           from jsonb_array_elements(d.cards) as c
          where c ->> 'rareDrop' = 'true'
       )
  );
$$;

-- --------------------------------------------------------------------------
-- Permissions
-- --------------------------------------------------------------------------
-- Les choix sont appelables par un joueur connecté (c'est le tirage du paquet,
-- sans effet de bord : rien n'est écrit). Ils ne disent que des créateurs
-- éligibles — jamais la collection de qui que ce soit.
revoke all on function public.scene_pack_choices(text) from public, anon;
grant execute on function public.scene_pack_choices(text) to authenticated;

revoke all on function public._pack_game_day(timestamptz) from public, anon, authenticated;
revoke all on function public._pack_pity(uuid) from public, anon, authenticated;
revoke all on function public._pack_streak(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._pack_perfect_today(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._pack_scene_variant(uuid, date, integer, text, text, boolean, integer, integer)
  from public, anon, authenticated;

revoke all on function public.open_scene_pack(text, jsonb) from public, anon;
grant execute on function public.open_scene_pack(text, jsonb) to authenticated;

revoke all on function public.pack_status() from public, anon;
grant execute on function public.pack_status() to authenticated;
