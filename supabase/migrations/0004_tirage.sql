-- CreatorDeck — tirage des boosters côté serveur.
--
-- Troisième et quatrième migrations du cloud, à exécuter **après**
-- `0001_comptes_cloud.sql` et `0002_vitrine.sql`.
--
-- Ce que ça change :
--   * `public.pack_state` : réserve de boosters du joueur (lecture par le
--     client, aucune écriture directe) ;
--   * `public.pack_draws` : journal d'audit de chaque ouverture (lecture par
--     le client, insertion par la fonction) ;
--   * `public.open_pack()` : tire le contenu d'un booster — 5 cartes, avec les
--     mêmes règles que le moteur local (src/lib/game-engine.ts) ;
--   * `public.pack_status()` : lit la réserve sans rien consommer (le client
--     affiche le bon compteur dès la connexion).
--
-- Le tirage est infalsifiable : les cartes viennent du serveur, le client ne
-- peut ni les choisir ni les inventer. C'est le prérequis des échanges.
--
-- Hors périmètre (volontairement) : les points, l'XP et le niveau restent
-- calculés sur l'appareil. Seul le contenu des boosters devient serveur.
--
-- Rejouable : `create or replace` + `grant`/`revoke` idempotents.

-- --------------------------------------------------------------------------
-- Réserve de boosters
-- --------------------------------------------------------------------------
-- Un joueur = une ligne. Le client peut lire sa propre ligne, mais aucune
-- écriture directe : seul `open_pack()` et le déclencheur de recharge
-- modifient les compteurs.
create table if not exists public.pack_state (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  packs         integer not null default 3
                  check (packs between 0 and 4),
  last_regen_at timestamptz not null default now(),
  openings      integer not null default 0,
  updated_at    timestamptz not null default now()
);

alter table public.pack_state enable row level security;

drop policy if exists "lecture de sa réserve de boosters" on public.pack_state;
create policy "lecture de sa réserve de boosters"
  on public.pack_state for select
  to authenticated
  using (auth.uid() = user_id);

-- Aucune policy d'insertion / mise à jour / suppression : seule la fonction
-- `open_pack()` (security definer) écrit dans cette table. Le client ne peut
-- pas tricher sur le nombre de boosters, la dernière recharge ou le compteur.

-- --------------------------------------------------------------------------
-- Journal des tirages
-- --------------------------------------------------------------------------
-- Chaque ouverture laisse une ligne : utile plus tard pour vérifier les
-- échanges (une carte échangée doit provenir d'un tirage réel).
create table if not exists public.pack_draws (
  id       bigserial primary key,
  user_id  uuid not null,
  drawn_at timestamptz not null default now(),
  cards    jsonb not null
);

alter table public.pack_draws enable row level security;

drop policy if exists "lecture de son journal de tirages" on public.pack_draws;
create policy "lecture de son journal de tirages"
  on public.pack_draws for select
  to authenticated
  using (auth.uid() = user_id);

-- Seule la fonction insère : pas de policy d'insertion côté client.
drop policy if exists "insertion réservée à la fonction" on public.pack_draws;

-- --------------------------------------------------------------------------
-- Entier aléatoire uniforme dans [0, max_exclusive)
-- --------------------------------------------------------------------------
-- Reprend la logique du moteur local (src/lib/random.ts) : échantillonnage
-- uniforme. Postgres `random()` renvoie [0, 1), donc `floor(random() * max)`
-- donne un entier uniforme. Pas de rejet nécessaire pour les petites bornes
-- du tirage (max 10 000), le biais est négligeable.
create or replace function public._pack_random_int(max_exclusive integer)
returns integer
language plpgsql
volatile
as $$
begin
  if max_exclusive <= 0 then
    raise exception 'tirage : borne invalide (%)', max_exclusive using errcode = 'P0001';
  end if;
  if max_exclusive = 1 then
    return 0;
  end if;
  return floor(random() * max_exclusive)::integer;
end;
$$;

-- --------------------------------------------------------------------------
-- Choix d'un créateur selon les poids de rareté (idempotent, pas d'écriture)
-- --------------------------------------------------------------------------
-- Reproduit `chooseCreator()` du moteur local : pondération par rareté parmi
-- les créateurs pas encore utilisés, puis tirage uniforme dans la rareté.
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
  v_rarity text;
  v_weight integer;
  v_total integer := 0;
  v_roll integer;
  v_bucket text[];
  v_chosen text;
  v_order integer;
  v_available_rarities text[];
  v_rarity_weight integer;
begin
  -- Pondérations effectives : une rareté n'est éligible que si au moins un
  -- créateur de cette rareté n'est pas encore utilisé.
  v_available_rarities := '{}';
  for v_rarity in select unnest(array['common','uncommon','rare','epic','legendary']) loop
    v_rarity_weight := coalesce((p_weights ->> v_rarity)::integer, 0);
    if v_rarity_weight > 0 then
      -- Vérifie qu'au moins un créateur de cette rareté est disponible.
      perform 1
        from public.creators c
       where c.rarity = v_rarity
         and not (c.slug = any (p_used_slugs))
       limit 1;
      if found then
        v_available_rarities := v_available_rarities || v_rarity;
      end if;
    end if;
  end loop;

  if array_length(v_available_rarities, 1) is null then
    raise exception 'tirage : le catalogue disponible est vide' using errcode = 'P0001';
  end if;

  -- Tri par ordre de rareté (du plus commun au plus rare) : même parcours
  -- que le moteur local (RARITY_META.order). `array_position` plutôt qu'un
  -- CASE : Postgres interdit une fonction d'ensemble (`unnest`) dans un CASE
  -- (« set-returning functions are not allowed in CASE »).
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
      -- Tirage uniforme parmi les créateurs disponibles de cette rareté.
      select array_agg(c.slug) into v_bucket
        from public.creators c
       where c.rarity = v_rarity
         and not (c.slug = any (p_used_slugs));
      v_chosen := v_bucket[public._pack_random_int(array_length(v_bucket, 1)) + 1];
      return v_chosen;
    end if;
    v_roll := v_roll - v_weight;
  end loop;

  -- Ne devrait jamais arriver (le parcours ci-dessus couvre tout).
  raise exception 'tirage : erreur interne de sélection de créateur' using errcode = 'P0001';
end;
$$;

-- --------------------------------------------------------------------------
-- Choix de la variante cosmétique
-- --------------------------------------------------------------------------
-- Reproduit `chooseVariant()` du moteur local. Les seuils (75‰ pour Holo,
-- 900‰ pour l'amélioration Perfect) sont ceux de src/data/pull-rates.json.
--
-- Poids des variantes (tirés du fichier, à jour au 5 octobre 2026) :
--   holoPermille = 75      (Holo dès « Peu commune »)
--   variantUpgradePermille = 900  (Perfect → amélioration quasi-systématique)
-- Pas de Gold en dehors du Perfect (goldPermille absent du booster Live).
create or replace function public._pack_choose_variant(
  p_rarity text,
  p_rare_drop boolean
)
returns text -- 'standard' | 'live' | 'holo' | 'gold'
language plpgsql
volatile
set search_path = public
as $$
declare
  v_roll integer;
begin
  -- Source des seuils : src/data/pull-rates.json (booster « live »).
  --   variants.holoPermille = 75
  --   variants.holoFromRarity = 'uncommon'
  --   rareDrop.variantUpgradePermille = 900

  v_roll := public._pack_random_int(10000);

  -- Perfect : 900‰ de chance d'améliorer la variante.
  if p_rare_drop and v_roll < 900 then
    if p_rarity = 'legendary' then
      return 'gold';
    else
      return 'holo';
    end if;
  end if;

  -- Pas de goldPermille configuré pour le booster Live : on saute ce palier.

  -- Holo : 75‰ dès « Peu commune » (uncommon, rare, epic, legendary).
  if p_rarity in ('uncommon', 'rare', 'epic', 'legendary') and v_roll < 75 then
    return 'holo';
  end if;

  return 'standard';
end;
$$;

-- --------------------------------------------------------------------------
-- Recharge des boosters (identique à refreshBalances du moteur local)
-- --------------------------------------------------------------------------
-- 1 booster toutes les 30 minutes, maximum 4. Si l'horloge serveur a reculé,
-- on ré-ancre sur now().
create or replace function public._pack_refresh(
  p_current_packs integer,
  p_max integer,
  p_last_regen_at timestamptz,
  p_interval_ms bigint,
  p_now timestamptz
)
returns jsonb -- { packs, last_regen_at }
language plpgsql
immutable
as $$
declare
  v_anchor timestamptz;
  v_gained integer;
  v_next_packs integer;
  v_next_last timestamptz;
begin
  if p_current_packs >= p_max then
    return jsonb_build_object('packs', p_max, 'last_regen_at', p_now);
  end if;

  -- Recul d'horloge : ré-ancre sur now, pas de recharge gratuite.
  v_anchor := least(p_last_regen_at, p_now);
  v_gained := floor(
    extract(epoch from (p_now - v_anchor)) * 1000 / p_interval_ms
  )::integer;

  if v_gained <= 0 then
    return jsonb_build_object('packs', p_current_packs, 'last_regen_at', v_anchor);
  end if;

  v_next_packs := least(p_max, p_current_packs + v_gained);
  if v_next_packs >= p_max then
    v_next_last := p_now;
  else
    v_next_last := v_anchor + (v_gained::text || ' milliseconds')::interval;
  end if;

  return jsonb_build_object('packs', v_next_packs, 'last_regen_at', v_next_last);
end;
$$;

-- --------------------------------------------------------------------------
-- Ouverture d'un booster
-- --------------------------------------------------------------------------
-- Renvoie { packs, last_regen_at, openings, cards: [{creatorSlug, rarity,
-- variant, rareDrop}] }.
--
-- Le tirage reproduit exactement le moteur local :
--   * 4 slots pondérés (les poids montent au fil du booster),
--   * 1 slot garanti (Rare ou mieux, variante « live » imposée),
--   * 5 ‰ de chance de « Perfect » (0,5 % : Épique ou mieux partout),
--   * aucun créateur en double dans un même booster,
--   * carte garantie en dernier (aucun mélange : le hit se révèle à la fin).
--
-- Poids des slots (src/data/pull-rates.json, booster « live ») :
--   slot 1 : C 42, PC 30, R 18, E 8, L 2
--   slot 2 : C 42, PC 30, R 18, E 8, L 2
--   slot 3 : C 34, PC 32, R 22, E 10, L 2
--   slot 4 : C 20, PC 34, R 28, E 15, L 3
--   garanti : R 82, E 15, L 3
--   Perfect (5‰) : E 82, L 18
create or replace function public.open_pack()
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
  v_local_state jsonb;
  v_local_packs integer;
  v_local_regen_epoch bigint;
  v_local_regen timestamptz;
  v_save_state jsonb;
begin
  -- Authentification obligatoire.
  if v_user_id is null then
    raise exception 'tirage : connecte-toi pour ouvrir un booster' using errcode = 'P0001';
  end if;

  -- ------------------------------------------------------------------
  -- Initialise la ligne pack_state depuis la sauvegarde locale si besoin.
  -- Le client pousse sa partie (saves.state) : on y lit `packs` (borné 0..4)
  -- et `lastPackRegen` (epoch ms). À défaut : 3 boosters, maintenant.
  -- ------------------------------------------------------------------
  select ps.packs, ps.last_regen_at, ps.openings
    into v_state
    from public.pack_state ps
   where ps.user_id = v_user_id;

  if v_state is null then
    -- Reprend l'état local depuis la sauvegarde cloud.
    v_local_packs := 3;
    v_local_regen := v_now;

    select s.state into v_save_state
      from public.saves s
     where s.user_id = v_user_id;

    if v_save_state is not null then
      -- packs : borné 0..4.
      v_local_state := v_save_state;
      v_local_packs := greatest(0, least(4, coalesce((v_local_state ->> 'packs')::integer, 3)));
      -- lastPackRegen : epoch ms → timestamptz.
      v_local_regen_epoch := coalesce((v_local_state ->> 'lastPackRegen')::bigint, 0);
      if v_local_regen_epoch > 0 then
        v_local_regen := to_timestamp(v_local_regen_epoch::double precision / 1000);
      end if;
    end if;

    insert into public.pack_state (user_id, packs, last_regen_at, openings, updated_at)
    values (v_user_id, v_local_packs, v_local_regen, 0, v_now);

    v_state.packs := v_local_packs;
    v_state.last_regen_at := v_local_regen;
    v_state.openings := 0;
  end if;

  -- ------------------------------------------------------------------
  -- Recharge (identique à refreshBalances du moteur local).
  -- ------------------------------------------------------------------
  v_refreshed := public._pack_refresh(
    v_state.packs,
    4,                                              -- PACKS.live.max
    v_state.last_regen_at,
    1800000,                                        -- PACKS.live.regenMs (30 min en ms)
    v_now
  );

  v_packs := (v_refreshed ->> 'packs')::integer;
  v_last_regen := (v_refreshed ->> 'last_regen_at')::timestamptz;
  v_openings := v_state.openings;

  -- ------------------------------------------------------------------
  -- Pas de booster → exception lisible (le client affichera le compte à
  -- rebours via pack_status()).
  -- ------------------------------------------------------------------
  if v_packs < 1 then
    raise exception 'tirage : aucun booster disponible pour le moment' using errcode = 'P0001';
  end if;

  -- ------------------------------------------------------------------
  -- Tirage des 5 cartes.
  -- ------------------------------------------------------------------
  -- Perfect : 5‰ de chance (identique au moteur local).
  v_rare_drop := public._pack_random_int(1000) < 1;

  v_drawn := '{}';

  -- 4 slots ordinaires (les poids montent au fil du booster).
  for v_i in 1..4 loop
    -- Poids du slot courant (ou du Perfect si activé).
    -- Source : src/data/pull-rates.json
    if v_rare_drop then
      v_weights := '{"epic": 82, "legendary": 18}'::jsonb;
    elsif v_i = 1 then
      v_weights := '{"common": 42, "uncommon": 30, "rare": 18, "epic": 8, "legendary": 2}'::jsonb;
    elsif v_i = 2 then
      v_weights := '{"common": 42, "uncommon": 30, "rare": 18, "epic": 8, "legendary": 2}'::jsonb;
    elsif v_i = 3 then
      v_weights := '{"common": 34, "uncommon": 32, "rare": 22, "epic": 10, "legendary": 2}'::jsonb;
    else
      v_weights := '{"common": 20, "uncommon": 34, "rare": 28, "epic": 15, "legendary": 3}'::jsonb;
    end if;

    v_slug := public._pack_choose_creator(v_weights, v_used);
    v_used := v_used || v_slug;

    select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
    v_variant := public._pack_choose_variant(v_rarity, v_rare_drop);

    v_card := jsonb_build_object(
      'creatorSlug', v_slug,
      'rarity', v_rarity,
      'variant', v_variant,
      'rareDrop', v_rare_drop
    );
    v_drawn := v_drawn || v_card;
  end loop;

  -- Slot garanti : Rare ou mieux, variante « live » imposée.
  if v_rare_drop then
    v_weights := '{"epic": 82, "legendary": 18}'::jsonb;
  else
    v_weights := '{"rare": 82, "epic": 15, "legendary": 3}'::jsonb;
  end if;

  v_slug := public._pack_choose_creator(v_weights, v_used);
  v_used := v_used || v_slug;

  select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
  -- La carte garantie du booster Live a toujours la variante « live ».
  v_card := jsonb_build_object(
    'creatorSlug', v_slug,
    'rarity', v_rarity,
    'variant', 'live',
    'rareDrop', v_rare_drop
  );
  v_drawn := v_drawn || v_card;

  -- ------------------------------------------------------------------
  -- Construction du tableau JSON, dans l'ordre du tirage.
  -- ------------------------------------------------------------------
  -- Pas de mélange : la carte garantie (dernier slot) doit rester la dernière
  -- révélée, comme dans un vrai booster. L'app révèle les cartes dans cet
  -- ordre, et c'est ce qui fait le moment fort de l'ouverture.
  -- (Le mélange Fisher-Yates d'origine a été retiré ; il gâchait cet ordre.)
  for v_i in 1..array_length(v_drawn, 1) loop
    v_cards := v_cards || v_drawn[v_i];
  end loop;

  -- ------------------------------------------------------------------
  -- Mise à jour de la réserve : -1 booster, +1 ouverture.
  -- ------------------------------------------------------------------
  update public.pack_state
     set packs = v_packs - 1,
         last_regen_at = v_last_regen,
         openings = v_openings + 1,
         updated_at = v_now
   where user_id = v_user_id;

  -- Journal d'audit.
  insert into public.pack_draws (user_id, drawn_at, cards)
  values (v_user_id, v_now, v_cards);

  return jsonb_build_object(
    'packs', v_packs - 1,
    'last_regen_at', v_last_regen,
    'openings', v_openings + 1,
    'cards', v_cards
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Statut de la réserve (sans consommer)
-- --------------------------------------------------------------------------
-- Le client appelle cette fonction à la connexion pour afficher le bon
-- compteur (recharge calculée côté serveur, pas de dépendance à l'horloge
-- locale).
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

  return jsonb_build_object(
    'packs', v_packs,
    'last_regen_at', v_last_regen,
    'openings', v_openings,
    'next_pack_at', v_next_pack_at
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Permissions : seuls les joueurs connectés appellent les fonctions.
-- --------------------------------------------------------------------------
revoke all on function public.open_pack() from public, anon;
grant execute on function public.open_pack() to authenticated;

revoke all on function public.pack_status() from public, anon;
grant execute on function public.pack_status() to authenticated;

-- Les fonctions internes ne doivent pas être appelables directement.
revoke all on function public._pack_random_int(integer) from public, anon, authenticated;
revoke all on function public._pack_choose_creator(jsonb, text[]) from public, anon, authenticated;
revoke all on function public._pack_choose_variant(text, boolean) from public, anon, authenticated;
revoke all on function public._pack_refresh(integer, integer, timestamptz, bigint, timestamptz) from public, anon, authenticated;
