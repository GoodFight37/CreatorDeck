-- 0040_setup_doublons.sql — la seconde série du setup : les doublons partent au studio.
--
-- Les cinq premiers paliers du setup se paient en **points** (`0038`). Après le
-- dernier d'entre eux, il faut des **cartes** : trois paliers de plus (rangs 6
-- à 8), payés en **doublons** de la collection.
--
-- Les règles, écrites une fois ici et appliquées par la même fonction que le
-- moteur local (`sacrificeSetupLocally`) :
--
--   * **la rareté donne le prix** : un doublon **Rare** vaut 1, un **Épique**
--     vaut 2 (`_streamer_sacrifice_values()`, miroir de `setup.sacrifice.values`
--     dans `src/data/streamer.json`) ;
--   * **jamais une Légendaire** — elle ne quitte jamais le classeur, et les
--     Communes et Peu communes ne partent pas non plus : elles ne valent rien ;
--   * **jamais la dernière copie** d'un couple créateur + variante : la même
--     règle que le recyclage et l'hôtel, celle qui protège la complétion ;
--   * **le compte doit tomber juste** : le prix du palier est celui du serveur,
--     le client ne propose pas un prix, il propose des cartes ;
--   * **dans l'ordre** : les cinq paliers en points d'abord, puis les trois
--     autres — on ne saute pas la file du studio ;
--   * la **provenance** est exigée, comme au recyclage : une carte fabriquée à
--     la main dans la sauvegarde ne se sacrifie pas ;
--   * **une carte ne part qu'une fois** : la ligne de `streamer_sacrifices` est
--     la preuve du départ, et elle tient même si la sauvegarde n'a pas suivi.
--
-- Ce qui bouge : les cartes quittent la collection (le client les retire en
-- appliquant le verdict du serveur) et un droit du registre `card_claims` est
-- consommé par carte, exactement comme au recyclage.

-- ---------------------------------------------------------------------------
-- 1. Les paliers : les cinq en points, puis les trois en doublons
-- ---------------------------------------------------------------------------
-- Miroir de `setup.levels` (`src/data/streamer.json`) : les libellés sont dans
-- l'application, les prix et les parts de croissance sont ici — c'est le serveur
-- qui paie (ou qui consomme), donc c'est lui qui décide.
--
-- La monnaie d'un palier n'est **pas** une colonne de cette table : la fonction
-- garde la signature que `0038` lui a donnée (`create or replace function` ne
-- peut pas changer un type de retour). Elle vit dans une petite fonction à part,
-- `_streamer_setup_currency()`, qui tient le même tableau — et le test miroir
-- vérifie que les deux listes portent les mêmes paliers.

/** Les huit paliers, dans l'ordre où ils s'achètent. */
create or replace function public._streamer_setup_levels()
returns table (
  rang             integer,
  level            text,
  price            integer,
  growth_permille  integer
)
language sql
immutable
set search_path = public
as $$
  select t.rang, t.level, t.price, t.growth_permille
  from (values
    (1, 'webcam',  120,  30),
    (2, 'micro',   320,  50),
    (3, 'lumiere', 780,  70),
    (4, 'deco',   1800, 100),
    (5, 'studio', 4200, 250),
    (6, 'webcam2',   2, 100),
    (7, 'regie',     5, 150),
    (8, 'plateau',  10, 250)
  ) as t(rang, level, price, growth_permille);
$$;

/**
 * La monnaie d'un palier : `points` (le wallet) ou `doublons` (les cartes).
 *
 * `NULL` pour un palier qui n'existe pas — l'appelant refuse alors, comme
 * `streamer_setup_buy()` refuse un palier inventé.
 */
create or replace function public._streamer_setup_currency(p_level text)
returns text
language sql
immutable
set search_path = public
as $$
  select t.currency
  from (values
    ('webcam',  'points'),
    ('micro',   'points'),
    ('lumiere', 'points'),
    ('deco',    'points'),
    ('studio',  'points'),
    ('webcam2', 'doublons'),
    ('regie',   'doublons'),
    ('plateau', 'doublons')
  ) as t(level, currency)
  where t.level = lower(coalesce(p_level, ''));
$$;

/**
 * Ce que vaut un doublon qui part au studio, par rareté.
 *
 * Miroir de `setup.sacrifice.values` : un Rare vaut 1, un Épique vaut 2. Ce qui
 * n'est pas dans la liste **ne part pas** — les Communes et Peu communes ne
 * paient rien, et une Légendaire ne quitte jamais le classeur.
 */
create or replace function public._streamer_sacrifice_values()
returns table (
  rarity text,
  value  integer
)
language sql
immutable
set search_path = public
as $$
  select t.rarity, t.value
  from (values
    ('rare', 1),
    ('epic', 2)
  ) as t(rarity, value);
$$;

-- `_streamer_setup_bonus()`, `_streamer_growth()`, `_streamer_setup_owned()` et
-- `_streamer_setup_next()` de `0038` ne bougent pas d'une ligne : elles lisent
-- `_streamer_setup_levels()`, qui compte maintenant huit rangs et +1000 pour
-- mille au total — une chaîne qui grandit deux fois plus vite qu'à ses débuts.
-- Seul l'**achat en points** change, parce qu'il ne doit pas vendre un palier en
-- doublons au prix de deux points.

-- ---------------------------------------------------------------------------
-- 2. Acheter en points : refuser les paliers en doublons
-- ---------------------------------------------------------------------------
-- La porte des points reste celle de `0038` (`_wallet_apply`), avec une garde de
-- plus : elle ne doit **pas** vendre un palier qui se paie en cartes.

create or replace function public.streamer_setup_buy(p_level text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_niveau  record;
  v_attendu record;
  v_owned   text[];
  v_points  integer;
  v_suivant text;
begin
  if v_user is null then
    raise exception 'chaîne : connecte-toi pour installer ton setup' using errcode = 'P0001';
  end if;
  perform public._streamer_ensure(v_user);

  select * into v_niveau
    from public._streamer_setup_levels() l
   where l.level = lower(coalesce(p_level, ''));
  if not found then
    raise exception 'chaîne : ce palier de setup n''existe pas' using errcode = 'P0001';
  end if;

  if public._streamer_setup_currency(v_niveau.level) <> 'points' then
    raise exception 'chaîne : « % » se paie en doublons — les cartes partent au studio', v_niveau.level
      using errcode = 'P0001';
  end if;

  v_owned := public._streamer_setup_owned(v_user);

  if v_niveau.level = any (v_owned) then
    return jsonb_build_object(
      'ok', true, 'already', true,
      'level', v_niveau.level, 'setup', to_jsonb(v_owned),
      'setup_bonus', public._streamer_setup_bonus(v_user),
      'points', (select w.points from public.wallets w where w.user_id = v_user)
    );
  end if;

  -- Le prochain palier se lit sur le préfixe contigu, pas sur un compteur :
  -- une ligne ajoutée à la main ne fait pas sauter une étape au joueur.
  select * into v_attendu from public._streamer_setup_next(v_user);
  if not found or v_attendu.level <> v_niveau.level then
    v_suivant := coalesce(v_attendu.level, 'le premier palier');
    raise exception 'chaîne : il faut d''abord « % »', v_suivant using errcode = 'P0001';
  end if;

  -- Le débit : un palier, une fois, pour toujours (index unique du journal).
  v_points := public._wallet_apply(v_user, -v_niveau.price, 'setup', v_niveau.level);

  insert into public.streamer_setup (user_id, level) values (v_user, v_niveau.level)
  on conflict (user_id, level) do nothing;

  -- Le solde a bougé : le miroir de la sauvegarde suit, comme après un achat.
  perform public._wallet_mirror(v_user, v_points);

  return jsonb_build_object(
    'ok', true, 'already', false,
    'level', v_niveau.level, 'price', v_niveau.price,
    'setup', to_jsonb(public._streamer_setup_owned(v_user)),
    'setup_bonus', public._streamer_setup_bonus(v_user),
    'points', v_points
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Sacrifier des doublons : les paliers 6 à 8
-- ---------------------------------------------------------------------------
-- Avant la porte, la **preuve du départ**. Le registre `card_claims` ne suffit
-- pas à fermer la porte : pour une carte Standard non légendaire il dit
-- « couverte » par construction (c'est l'Atelier qui les fabrique), et la
-- sauvegarde, elle, n'est réécrite que par le client. Sans journal, la même
-- carte pourrait donc payer les paliers 6, 7 et 8 l'un après l'autre. La ligne
-- de `streamer_sacrifices` est cette preuve-là : **une carte ne part qu'une
-- fois**, quoi qu'en dise la sauvegarde. C'est le même dessin que la ligne de
-- `streamer_raids` (`0039`) pour le raid, ou l'index du journal du wallet
-- (`0027`) pour le recyclage.

create table if not exists public.streamer_sacrifices (
  user_id  uuid not null references auth.users (id) on delete cascade,
  card_id  text not null,
  level    text not null,
  value    integer not null check (value > 0),
  at       timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index if not exists streamer_sacrifices_user_idx on public.streamer_sacrifices (user_id);

alter table public.streamer_sacrifices enable row level security;

-- Comme `streamer_setup` : aucun droit client, aucune politique. La table ne
-- parle que par `streamer_setup_sacrifice()`.
revoke all on table public.streamer_sacrifices from public, anon, authenticated;

comment on table public.streamer_sacrifices is
  'Les doublons partis au studio, un par carte : la preuve qu''une carte ne se sacrifie qu''une fois (0040).';

/**
 * Sacrifie des **doublons** pour installer le prochain palier du studio.
 *
 * L'appel porte une **liste d'identifiants de cartes** (`["id", …]`, ou des
 * objets qui portent `id`), rien de plus : le prix, la rareté et la valeur sont
 * relus ici — dans la sauvegarde du joueur pour la carte, dans le catalogue pour
 * la rareté, dans `_streamer_sacrifice_values()` pour la valeur.
 *
 * Les refus, dans l'ordre où ils sont écrits :
 *
 *   * le prochain palier doit se payer en doublons (les points d'abord) ;
 *   * chaque carte doit être **dans la sauvegarde du joueur** ;
 *   * son créateur doit être au catalogue, sa variante connue ;
 *   * la rareté doit payer — **Rares et Épiques** seulement ;
 *   * **une carte ne part qu'une fois** (la ligne du journal) ;
 *   * **jamais la dernière copie** d'un couple créateur + variante, en comptant
 *     ce qui reste **après** le sacrifice (plusieurs copies du même couple
 *     peuvent partir d'un coup) ;
 *   * le total doit tomber **juste** sur le prix du palier ;
 *   * la **provenance** doit être vérifiable (`card_claim_covers`) — la porte de
 *     sortie du recyclage et de l'hôtel, tenue ici aussi.
 *
 * Alors seulement : une ligne par carte dans `streamer_sacrifices`, un droit
 * consommé par carte (`card_claims`), et le palier écrit. Tout est dans la même
 * transaction : un refus ne laisse ni carte en moins, ni droit en moins.
 */
create or replace function public.streamer_setup_sacrifice(p_cards jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_ids     text[];
  v_gardes  text[] := '{}';
  v_attendu record;
  v_save    public.saves;
  v_cards   jsonb;
  v_id      text;
  v_card    jsonb;
  v_slug    text;
  v_variant text;
  v_rarity  text;
  v_valeur  integer;
  v_total   integer := 0;
begin
  if v_user is null then
    raise exception 'chaîne : connecte-toi pour installer ton setup' using errcode = 'P0001';
  end if;
  perform public._streamer_ensure(v_user);

  -- Les identifiants : une chaîne, ou un objet qui porte `id`. Dédupliqués —
  -- deux fois la même carte dans l'appel ne compte qu'une fois — et jamais
  -- vide : un sacrifice sans carte n'est pas un sacrifice.
  select array_agg(distinct case when jsonb_typeof(c) = 'string' then c #>> '{}' else c ->> 'id' end)
    into v_ids
    from jsonb_array_elements(coalesce(p_cards, '[]'::jsonb)) as c
   where coalesce(case when jsonb_typeof(c) = 'string' then c #>> '{}' else c ->> 'id' end, '') <> '';
  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'chaîne : choisis au moins un doublon' using errcode = 'P0001';
  end if;

  -- Le prochain palier : il doit se payer en doublons.
  select n.rang, n.level, n.price, n.growth_permille,
         public._streamer_setup_currency(n.level) as currency
    into v_attendu
    from public._streamer_setup_next(v_user) n;
  if not found then
    raise exception 'chaîne : ton setup est complet' using errcode = 'P0001';
  end if;
  if v_attendu.currency <> 'doublons' then
    raise exception 'chaîne : le prochain palier se paie encore en points (« % »)', v_attendu.level
      using errcode = 'P0001';
  end if;

  -- La collection : ce que le joueur possède est écrit dans sa sauvegarde, et
  -- nulle part ailleurs (la rareté, elle, vient du catalogue, comme au
  -- recyclage : une sauvegarde bricolée ne se sacrifie pas au prix d'une Épique).
  select * into v_save from public.saves s where s.user_id = v_user;
  if v_save.user_id is null then
    raise exception 'chaîne : envoie d''abord ta collection au cloud' using errcode = 'P0001';
  end if;
  v_cards := coalesce(v_save.state -> 'cards', '[]'::jsonb);

  foreach v_id in array v_ids loop
    select c.value into v_card
      from jsonb_array_elements(v_cards) as c
     where c.value ->> 'id' = v_id
     limit 1;
    if v_card is null then
      raise exception 'chaîne : une des cartes choisies n''est plus dans ta collection'
        using errcode = 'P0001';
    end if;

    v_slug := lower(coalesce(v_card ->> 'creatorSlug', ''));
    v_variant := coalesce(nullif(v_card ->> 'variant', ''), 'standard');
    select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
    if v_rarity is null then
      raise exception 'chaîne : ce créateur n''est pas au catalogue' using errcode = 'P0001';
    end if;
    if not (v_variant = any (array['standard', 'live', 'holo', 'gold'])) then
      raise exception 'chaîne : variante inconnue pour un sacrifice' using errcode = 'P0001';
    end if;

    select v.value into v_valeur from public._streamer_sacrifice_values() v where v.rarity = v_rarity;
    if coalesce(v_valeur, 0) <= 0 then
      raise exception 'chaîne : seuls les doublons Rares et Épiques partent au studio — jamais une Légendaire'
        using errcode = 'P0001';
    end if;

    -- Une carte ne part qu'une fois : la ligne du journal est la preuve, et
    -- elle tient même si la sauvegarde n'a pas encore suivi le départ.
    if exists (
      select 1 from public.streamer_sacrifices d where d.user_id = v_user and d.card_id = v_id
    ) then
      raise exception 'chaîne : cette carte est déjà partie au studio' using errcode = 'P0001';
    end if;

    v_total := v_total + v_valeur;
    v_gardes := array_append(v_gardes, v_id);
  end loop;

  -- Jamais la dernière copie : par couple créateur + variante, ce qui reste
  -- **après** le sacrifice doit être au moins une carte.
  if exists (
    with partants as (
      select lower(coalesce(c.value ->> 'creatorSlug', ''))
               || '|' || coalesce(nullif(c.value ->> 'variant', ''), 'standard') as cle,
             count(*)::integer as n
        from jsonb_array_elements(v_cards) as c
       where c.value ->> 'id' = any (v_gardes)
       group by 1
    ), possedes as (
      select lower(coalesce(c.value ->> 'creatorSlug', ''))
               || '|' || coalesce(nullif(c.value ->> 'variant', ''), 'standard') as cle,
             count(*)::integer as n
        from jsonb_array_elements(v_cards) as c
       group by 1
    )
    select 1 from partants p join possedes q using (cle) where q.n - p.n < 1
  ) then
    raise exception 'chaîne : impossible de sacrifier ta seule copie de cette carte'
      using errcode = 'P0001';
  end if;

  -- Le compte doit tomber juste : le prix est celui du serveur.
  if v_total <> v_attendu.price then
    raise exception 'chaîne : il faut % points de sacrifice pour « % » (tu en as %)',
      v_attendu.price, v_attendu.level, v_total using errcode = 'P0001';
  end if;

  -- La provenance : on ne sacrifie pas une carte que le serveur n'a jamais
  -- donnée. La porte de sortie du recyclage et de l'hôtel, tenue ici aussi.
  if jsonb_array_length(public.card_claim_covers(v_user, (
        select coalesce(jsonb_agg(c.value), '[]'::jsonb)
          from jsonb_array_elements(v_cards) as c
         where c.value ->> 'id' = any (v_gardes)
      ))) > 0 then
    raise exception 'chaîne : une de ces cartes n''a pas de provenance vérifiable (ni tirage, ni échange, ni hôtel, ni vol)'
      using errcode = 'P0001';
  end if;

  -- Le droit est consommé par carte : elle quitte le classeur, elle ne peut pas
  -- être comptée deux fois (la même règle que le recyclage, `0027`).
  update public.card_claims cc
     set qty = greatest(0, cc.qty - p.n), last_at = now()
    from (
      select lower(coalesce(c.value ->> 'creatorSlug', '')) as slug,
             coalesce(nullif(c.value ->> 'variant', ''), 'standard') as variant,
             count(*)::integer as n
        from jsonb_array_elements(v_cards) as c
       where c.value ->> 'id' = any (v_gardes)
       group by 1, 2
    ) p
   where cc.user_id = v_user
     and cc.creator_slug = p.slug
     and cc.variant = p.variant
     and cc.qty > 0;

  insert into public.streamer_sacrifices (user_id, card_id, level, value)
  select v_user, g.id, v_attendu.level, v_valeur.value
    from unnest(v_gardes) as g(id)
    join lateral (
      select v.value
        from public._streamer_sacrifice_values() v
       where v.rarity = (
         select c.rarity from public.creators c
          where c.slug = (
            select lower(coalesce(elem.value ->> 'creatorSlug', ''))
              from jsonb_array_elements(v_cards) as elem
             where elem.value ->> 'id' = g.id
             limit 1
          )
       )
    ) as v_valeur on true
  on conflict (user_id, card_id) do nothing;

  insert into public.streamer_setup (user_id, level) values (v_user, v_attendu.level)
  on conflict (user_id, level) do nothing;

  return jsonb_build_object(
    'ok', true,
    'level', v_attendu.level,
    'price', v_attendu.price,
    'value', v_total,
    'cards', to_jsonb(v_gardes),
    'setup', to_jsonb(public._streamer_setup_owned(v_user)),
    'setup_bonus', public._streamer_setup_bonus(v_user)
  );
end;
$$;

revoke all on function public.streamer_setup_sacrifice(jsonb) from public, anon;
grant execute on function public.streamer_setup_sacrifice(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Le rapport de version, étendu
-- ---------------------------------------------------------------------------

/**
 * `schema_versions()` (défini en `0035`, étendu jusqu'à `0039`) redit ce que la
 * base sait faire, avec la ligne de la `0040` en plus.
 *
 * Le marqueur de `0040` est la porte du sacrifice : une fonction se voit
 * (`to_regprocedure`) là où un morceau de code pourrait traîner dans un
 * commentaire.
 */
create or replace function public.schema_versions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    -- 0030 : la Légendaire peut sortir Gold (1 %, hors Perfect).
    '0030', position('v_roll < 100' in public._schema_body('public._pack_choose_variant(text, boolean, boolean)')) > 0,
    -- 0031 : le plancher de malchance à douze.
    '0031', position('v_pity + 1 >= 12' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0032 : la série paie ses jours.
    '0032', position('serie-j' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0033 : le départ est maigre (deux boosters).
    '0033', position('public._pack_initial_packs()' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0034 : une Légendaire et une Live ne se volent pas.
    '0034', position('ne se vole pas' in public._schema_body('public.last_pack_steal(bigint, integer)')) > 0,
    -- 0035 : les jetons vivent au serveur.
    '0035', to_regprocedure('public.tokens_get()') is not null,
    -- 0036 : la chaîne (le simulateur de streameur).
    '0036', to_regclass('public.streamer_channels') is not null,
    -- 0037 : les alertes de perte (série qui s'arrête, réserve pleine).
    '0037', to_regprocedure('public._push_serie_due(uuid, timestamptz, integer)') is not null,
    -- 0038 : les imprévus de la chaîne et le setup.
    '0038', to_regclass('public.streamer_events') is not null,
    -- 0039 : les invités sur le bureau et le raid du direct.
    '0039', to_regclass('public.streamer_guests') is not null,
    -- 0040 : la seconde série du setup, payée en doublons.
    '0040', to_regprocedure('public.streamer_setup_sacrifice(jsonb)') is not null
  );
$$;

revoke all on function public.schema_versions() from public;
grant execute on function public.schema_versions() to anon, authenticated;

-- Les fonctions internes restent fermées au client : le joueur passe par
-- `streamer_status()`, `streamer_visit()`, `streamer_publish()`,
-- `streamer_event_today()`, `streamer_choose()`, `streamer_setup_buy()`,
-- `streamer_guest_set()` et `streamer_setup_sacrifice()`.
revoke all on function public._streamer_setup_currency(text) from public, anon, authenticated;
revoke all on function public._streamer_sacrifice_values() from public, anon, authenticated;
