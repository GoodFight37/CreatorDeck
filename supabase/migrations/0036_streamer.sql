-- ---------------------------------------------------------------------------
-- 0036 — La chaîne (le simulateur de streameur)
--
-- Ce que cette migration installe : l'état d'une chaîne (les abonnés), la
-- **croissance pendant l'absence**, la vidéo du jour, et ce que la chaîne paie
-- en jetons — plafonné.
--
-- Pourquoi au serveur, alors que le simulateur est « un jeu dans le jeu » :
--
--   * **les jetons sont de la monnaie du jeu de cartes**. La chaîne en donne ;
--     si le client décidait combien, un client bricolé s'offrirait des cartes.
--     Le tirage de la vidéo se fait donc ici (`random()`), et le versement passe
--     par `_tokens_apply()`, le même journal que le reste (`0035`) ;
--   * **la croissance est ancrée au relevé du serveur** (`last_seen_at`), pas à
--     l'horloge du téléphone. Reculer l'horloge ne crédite rien : le calcul ne
--     compare que des instants que le serveur a écrits lui-même ;
--   * **l'absence est plafonnée** à sept journées de jeu. Sans plafond, trois
--     semaines d'absence paieraient mieux que trois semaines de jeu, et le jeu
--     récompenserait le fait de ne pas y être.
--
-- Les chiffres (paliers, formats, chances, plafond) sont les mêmes que dans
-- `src/data/streamer.json` : c'est le fichier que lit le moteur local, et
-- `src/lib/supabase-streamer.test.ts` tient les deux copies ensemble. Un
-- réglage touché d'un seul côté casse le test avant le jeu.
-- ---------------------------------------------------------------------------

create table if not exists public.streamer_channels (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  -- Jamais négatif : un bad buzz ne descend pas sous zéro (la contrainte est la
  -- dernière barrière, la mise à jour clique déjà avec `greatest`).
  subscribers  bigint not null default 0 check (subscribers >= 0),
  -- Le relevé du serveur : c'est lui qui dit combien de journées de jeu ont
  -- passé, et lui seul (le client ne l'écrit jamais).
  last_seen_at timestamptz not null default now(),
  -- Les jetons versés par la chaîne **aujourd'hui** : la journée de jeu est
  -- rangée avec le compteur, donc le plafond se remet à zéro tout seul le
  -- lendemain (6 h UTC), sans tâche de ménage.
  tokens_day   text not null default '',
  tokens_today integer not null default 0 check (tokens_today >= 0),
  updated_at   timestamptz not null default now()
);

-- Une seule vidéo par journée de jeu : c'est la règle du calendrier de contenu
-- (comme les missions du jour), et l'index unique la rend vraie même si le
-- client appelle deux fois — le second appel relit la première, il ne la rejoue
-- pas.
create table if not exists public.streamer_videos (
  id       bigserial primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      text not null,
  format   text not null,
  success  boolean not null,
  buzz     boolean not null default false,
  bad_buzz boolean not null default false,
  gained   bigint not null default 0,
  tokens   integer not null default 0,
  at       timestamptz not null default now()
);

create unique index if not exists streamer_videos_one_per_day
  on public.streamer_videos (user_id, day);

-- Fermées au client, comme `tokens` et `wallets` : le joueur passe par les
-- fonctions, jamais par les tables.
alter table public.streamer_channels enable row level security;
alter table public.streamer_videos enable row level security;
revoke all on table public.streamer_channels from public, anon, authenticated;
revoke all on table public.streamer_videos from public, anon, authenticated;
revoke all on sequence public.streamer_videos_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Le calendrier : la journée de jeu, et ce que chaque palier rapporte
-- ---------------------------------------------------------------------------

-- La journée de jeu commence à **6 h UTC**, comme les missions et la série
-- (`src/lib/progression.ts`). Deux définitions de la journée dans le même jeu
-- seraient un piège : la même heure les ferait basculer ensemble.
create or replace function public._streamer_game_day(p_at timestamptz)
returns text
language sql
immutable
set search_path = public
as $$
  select to_char((p_at at time zone 'utc') - interval '6 hours', 'YYYY-MM-DD');
$$;

-- La même journée en numéro : les soustraire donne un nombre de journées sans
-- boucle (une horloge d'appareil peut annoncer des années d'écart).
create or replace function public._streamer_day_number(p_at timestamptz)
returns bigint
language sql
immutable
set search_path = public
as $$
  select floor(extract(epoch from ((p_at at time zone 'utc') - interval '6 hours')) / 86400)::bigint;
$$;

create or replace function public._streamer_cap_days()
returns integer
language sql
immutable
set search_path = public
as $$
  select 7;
$$;

/**
 * Ce qu'un palier rapporte par journée de jeu.
 *
 * Miroir de `growth.tiers` (`src/data/streamer.json`) : Petit canal 240 ·
 * Chaîne qui monte 900 · Gros streamer 3 200 · Star du direct 12 000 ·
 * Légende du direct 45 000.
 */
create or replace function public._streamer_per_day(p_subscribers bigint)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_subscribers, 0) >= 1000000 then 45000
    when coalesce(p_subscribers, 0) >= 250000  then 12000
    when coalesce(p_subscribers, 0) >= 25000   then 3200
    when coalesce(p_subscribers, 0) >= 2500    then 900
    else 240
  end;
$$;

/**
 * Les chances d'un format de vidéo, pour mille.
 *
 * Miroir de `formats` (`src/data/streamer.json`) : Let's Play 760 de réussite,
 * IRL 620, Rage bait 480 (et 180 de se retourner contre toi), Collab 700 — cette
 * dernière demandant de posséder un créateur.
 */
create or replace function public._streamer_format(p_format text)
returns table (
  success_chance   integer,
  gain_permille    integer,
  buzz_permille    integer,
  bad_buzz_permille integer,
  needs_creator    boolean
)
language sql
immutable
set search_path = public
as $$
  select t.success_chance, t.gain_permille, t.buzz_permille, t.bad_buzz_permille, t.needs_creator
  from (values
    ('letsplay', 760, 1000,  40,   0, false),
    ('irl',      620, 1400,  90,   0, false),
    ('ragebait', 480, 2100, 160, 180, false),
    ('collab',   700, 1800, 120,   0, true)
  ) as t(id, success_chance, gain_permille, buzz_permille, bad_buzz_permille, needs_creator)
  where t.id = lower(coalesce(p_format, ''));
$$;

/** Ce que la vidéo du jour paie en jetons : 6, plus 10 si elle a buzzé. */
create or replace function public._streamer_token_gain(p_success boolean, p_buzz boolean)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_success, false) then 6 + case when coalesce(p_buzz, false) then 10 else 0 end
    else 0
  end;
$$;

/**
 * Le plafond de jetons que la chaîne peut verser par journée de jeu.
 *
 * Il n'est jamais atteint par la vidéo seule (une par jour, 16 jetons au
 * maximum) : il est là pour les sources qui viendraient s'ajouter — et parce
 * qu'un plafond qui n'existe que dans un commentaire n'en est pas un.
 */
create or replace function public._streamer_token_cap()
returns integer
language sql
immutable
set search_path = public
as $$
  select 40;
$$;

-- ---------------------------------------------------------------------------
-- L'état de la chaîne, et l'absence
-- ---------------------------------------------------------------------------

create or replace function public._streamer_ensure(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then
    raise exception 'chaîne : connecte-toi pour jouer ta chaîne' using errcode = 'P0001';
  end if;
  insert into public.streamer_channels (user_id) values (p_user)
  on conflict (user_id) do nothing;
end;
$$;

/**
 * L'état de la chaîne, tel que le serveur le connaît : ce que l'écran affiche
 * au retour du joueur. Ne rien consommer — c'est `streamer_visit()` qui fait
 * avancer le temps.
 */
create or replace function public.streamer_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row  public.streamer_channels;
  v_day  text;
begin
  perform public._streamer_ensure(v_user);
  v_day := public._streamer_game_day(now());

  select * into v_row from public.streamer_channels c where c.user_id = v_user;

  return jsonb_build_object(
    'ok', true,
    'subscribers', v_row.subscribers,
    'per_day', public._streamer_per_day(v_row.subscribers),
    'day', v_day,
    'published_today', exists (
      select 1 from public.streamer_videos v where v.user_id = v_user and v.day = v_day
    ),
    'tokens_today', case when v_row.tokens_day = v_day then v_row.tokens_today else 0 end,
    'tokens_cap', public._streamer_token_cap()
  );
end;
$$;

revoke all on function public.streamer_status() from public, anon;
grant execute on function public.streamer_status() to authenticated;

/**
 * Le retour du joueur : la chaîne a grandi pendant son absence.
 *
 * Le calcul est fait **par journées de jeu**, à la croissance du palier de
 * départ — on ne fait pas monter les paliers en cascade sur une absence : la
 * chaîne grandit au rythme qu'elle avait en partant, et c'est la vidéo du jour,
 * jouée à la main, qui fait changer de palier. Un gain plus généreux ici
 * paierait l'absence mieux que le jeu, exactement ce qu'on ne veut pas.
 *
 * Un écart négatif (horloge en arrière, ou relevé dans le futur) vaut **zéro** :
 * reculer l'horloge ne peut que retarder le compteur, jamais le gonfler.
 */
create or replace function public.streamer_visit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_row     public.streamer_channels;
  v_now     timestamptz := now();
  v_days    integer;
  v_counted integer;
  v_gained  bigint;
  v_after   bigint;
begin
  perform public._streamer_ensure(v_user);

  select * into v_row from public.streamer_channels c where c.user_id = v_user for update;

  v_days := greatest(
    0,
    (public._streamer_day_number(v_now) - public._streamer_day_number(v_row.last_seen_at))::integer
  );
  v_counted := least(v_days, public._streamer_cap_days());
  v_gained := v_counted::bigint * public._streamer_per_day(v_row.subscribers);
  v_after := v_row.subscribers + greatest(0, v_gained);

  update public.streamer_channels
     set subscribers = v_after,
         last_seen_at = v_now,
         updated_at = v_now
   where user_id = v_user;

  return jsonb_build_object(
    'ok', true,
    'days', v_days,
    'counted_days', v_counted,
    'gained', v_gained,
    'subscribers_before', v_row.subscribers,
    'subscribers', v_after,
    'per_day', public._streamer_per_day(v_row.subscribers)
  );
end;
$$;

revoke all on function public.streamer_visit() from public, anon;
grant execute on function public.streamer_visit() to authenticated;

-- ---------------------------------------------------------------------------
-- La vidéo du jour
-- ---------------------------------------------------------------------------

/**
 * Publie la vidéo de la journée de jeu et rend son résultat.
 *
 * Trois jets, dans l'ordre du fichier : la réussite, le buzz (seulement sur une
 * réussite), le bad buzz (seulement sur un échec — une vidéo qui marche ne se
 * retourne pas contre toi le même jour). Le gain vaut `gain_permille` pour mille
 * de la croissance journalière : une réussite de Let's Play fait une journée,
 * une de Rage bait en fait deux, un buzz triple, et un bad buzz coûte un quart
 * de ce que la vidéo aurait rapporté.
 *
 * Ce que le client ne peut pas faire :
 *
 *   * choisir le résultat — le tirage est ici, avec `random()`, et le client
 *     n'envoie qu'un **nom de format** ;
 *   * publier deux vidéos le même jour — l'index unique, et le second appel
 *     relit la première au lieu de la rejouer ;
 *   * se payer deux fois — le versement passe par `_tokens_apply()`, dont le
 *     journal unique porte la journée (`streamer`) ;
 *   * annoncer une collab sans carte — la Collab demande au moins un créateur
 *     dans la collection **du serveur** (`stats.unique_creators`).
 */
create or replace function public.streamer_publish(p_format text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_day      text;
  v_existant public.streamer_videos;
  v_row      public.streamer_channels;
  v_fmt      record;
  v_base     bigint;
  v_gain     bigint;
  v_success  boolean;
  v_buzz     boolean;
  v_bad      boolean;
  v_tokens   integer;
  v_paid     integer := 0;
  v_deja     integer;
  v_after    bigint;
begin
  perform public._streamer_ensure(v_user);
  v_day := public._streamer_game_day(now());

  -- Le format se valide **avant** tout le reste : un format inventé reste une
  -- erreur du client, même un jour déjà publié — sinon le message serait
  -- « déjà publiée » pour une faute de frappe, et le client croirait avoir
  -- joué.
  select * into v_fmt from public._streamer_format(p_format);
  if not found then
    raise exception 'chaîne : ce format de vidéo n''existe pas' using errcode = 'P0001';
  end if;

  -- Déjà publiée aujourd'hui : on relit la première, on ne la rejoue pas.
  select * into v_existant
    from public.streamer_videos v
   where v.user_id = v_user and v.day = v_day;
  if found then
    select * into v_row from public.streamer_channels c where c.user_id = v_user;
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'format', v_existant.format,
      'success', v_existant.success,
      'buzz', v_existant.buzz,
      'bad_buzz', v_existant.bad_buzz,
      'gained', v_existant.gained,
      'tokens', v_existant.tokens,
      'subscribers', v_row.subscribers,
      'tokens_today', case when v_row.tokens_day = v_day then v_row.tokens_today else 0 end,
      'tokens_cap', public._streamer_token_cap()
    );
  end if;

  if v_fmt.needs_creator and not exists (
    select 1 from public.stats s where s.user_id = v_user and s.unique_creators > 0
  ) then
    raise exception 'chaîne : une collab demande de posséder au moins un créateur'
      using errcode = 'P0001';
  end if;

  select * into v_row from public.streamer_channels c where c.user_id = v_user for update;
  v_base := public._streamer_per_day(v_row.subscribers);

  v_success := floor(random() * 1000)::integer < v_fmt.success_chance;
  v_buzz := v_success and floor(random() * 1000)::integer < v_fmt.buzz_permille;
  v_bad := (not v_success) and floor(random() * 1000)::integer < v_fmt.bad_buzz_permille;

  if v_success then
    v_gain := round(v_base * v_fmt.gain_permille / 1000.0)::bigint * case when v_buzz then 3 else 1 end;
  elsif v_bad then
    v_gain := -round(v_base * v_fmt.gain_permille / 1000.0 / 4.0)::bigint;
  else
    v_gain := 0;
  end if;

  -- Le versement, sous plafond : ce qui reste de la journée, jamais plus.
  v_deja := case when v_row.tokens_day = v_day then v_row.tokens_today else 0 end;
  v_tokens := public._streamer_token_gain(v_success, v_buzz);
  v_paid := greatest(0, least(v_tokens, public._streamer_token_cap() - v_deja));

  v_after := greatest(0, v_row.subscribers + v_gain);

  insert into public.streamer_videos (user_id, day, format, success, buzz, bad_buzz, gained, tokens)
  values (v_user, v_day, lower(p_format), v_success, v_buzz, v_bad, v_gain, v_paid);

  update public.streamer_channels
     set subscribers = v_after,
         tokens_day = v_day,
         tokens_today = v_deja + v_paid,
         updated_at = now()
   where user_id = v_user;

  if v_paid > 0 then
    perform public._tokens_apply(v_user, v_paid, 'streamer', v_day);
  end if;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'format', lower(p_format),
    'success', v_success,
    'buzz', v_buzz,
    'bad_buzz', v_bad,
    'gained', v_gain,
    'tokens', v_paid,
    'subscribers', v_after,
    'tokens_today', v_deja + v_paid,
    'tokens_cap', public._streamer_token_cap()
  );
end;
$$;

revoke all on function public.streamer_publish(text) from public, anon;
grant execute on function public.streamer_publish(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Le rapport de version, étendu
-- ---------------------------------------------------------------------------

/**
 * `schema_versions()` (défini en `0035`) redit ce que la base sait faire, avec
 * la ligne de la `0036` en plus.
 *
 * Le marqueur de `0036` est la présence de l'état de la chaîne : cette table-là
 * n'existe que dans cette migration, et une table se voit (`to_regclass`) là où
 * un morceau de code pourrait traîner dans un commentaire.
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
    '0036', to_regclass('public.streamer_channels') is not null
  );
$$;

-- Lisible **sans compte** : c'est un diagnostic, pas une donnée de joueur.
revoke all on function public.schema_versions() from public;
grant execute on function public.schema_versions() to anon, authenticated;

-- Les fonctions internes restent fermées au client : le joueur passe par
-- `streamer_status()`, `streamer_visit()` et `streamer_publish()`.
revoke all on function public._streamer_ensure(uuid) from public, anon, authenticated;
revoke all on function public._streamer_game_day(timestamptz) from public, anon, authenticated;
revoke all on function public._streamer_day_number(timestamptz) from public, anon, authenticated;
revoke all on function public._streamer_cap_days() from public, anon, authenticated;
revoke all on function public._streamer_per_day(bigint) from public, anon, authenticated;
revoke all on function public._streamer_format(text) from public, anon, authenticated;
revoke all on function public._streamer_token_gain(boolean, boolean) from public, anon, authenticated;
revoke all on function public._streamer_token_cap() from public, anon, authenticated;
