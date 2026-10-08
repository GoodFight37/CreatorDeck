-- 0041_collab_plateau.sql — le plateau compte sur la vidéo du jour.
--
-- `0039` a posé les invités sur le bureau, et le **raid** : quand un invité
-- streame pendant qu'on est absent, le relevé de la chaîne paie son passage,
-- une fois par journée de jeu. Cette migration-ci ajoute la seconde moitié de
-- l'idée, celle du **plateau** : au moment de publier la vidéo du jour, les
-- invités posés sur le bureau pèsent sur ce que la vidéo rapporte.
--
-- Les règles, écrites une fois ici et appliquées par la même fonction que le
-- moteur local (`collabFor()` / `resolveVideo()` dans `src/lib/streamer.ts`) :
--
--   * **la rareté donne le bonus de plateau** : 2 % pour une Commune, 3 % pour
--     une Peu commune, 5 % pour une Rare, 8 % pour une Épique, 12 % pour une
--     Légendaire (`_streamer_collab_values()`, miroir de
--     `guests.collab.videoPermille`) ;
--   * **le direct ajoute le moment « RAID ! »** : si l'un des invités streame
--     **au moment de publier** — même fenêtre de dix minutes que le badge et que
--     le raid (`_streamer_live_window()`) — le gain prend +15 % et la chance de
--     buzz +25 points (`livePermille`, `liveBuzzPermille`) ;
--   * le bonus de rareté s'applique **avant** le ×3 du buzz : une vidéo qui buzze
--     sur un plateau rare paie trois fois le plateau ;
--   * **rien de tout ça n'est envoyé par le client** : le serveur relit le
--     bureau, la rareté au catalogue, le direct dans `live_state`, et tire le
--     buzz lui-même. L'écran affiche ce que le plateau vaut, le serveur paie.
--
-- Le raid (`0039`) et la collab ne paient pas la même chose : le raid paie le
-- passage d'un invité **pendant l'absence** (une fois par journée, au relevé) ;
-- la collab bonifie la **vidéo que tu publies**, à l'instant où tu la publies.

-- ---------------------------------------------------------------------------
-- 1. Le barème du plateau
-- ---------------------------------------------------------------------------
-- Miroir de `guests.collab` (`src/data/streamer.json`) : les libellés sont dans
-- l'application, les parts sont ici — c'est le serveur qui paie, donc c'est lui
-- qui doit connaître le barème. `src/lib/supabase-streamer.test.ts` tient les
-- deux copies ensemble, comme pour les taux de drop.

/** Ce qu'un invité de cette rareté apporte à la vidéo, pour mille. */
create or replace function public._streamer_collab_values()
returns table (
  rarity  text,
  permille integer
)
language sql
immutable
set search_path = public
as $$
  select t.rarity, t.permille
  from (values
    ('common',    20),
    ('uncommon',  30),
    ('rare',      50),
    ('epic',      80),
    ('legendary', 120)
  ) as t(rarity, permille);
$$;

/** Ce que le **direct** ajoute au plateau : le gain, et la chance de buzz. */
create or replace function public._streamer_collab_live()
returns table (
  permille      integer,
  buzz_permille integer
)
language sql
immutable
set search_path = public
as $$ select 150, 250; $$;

/**
 * Le plateau d'un joueur, **tel qu'il vaut maintenant** : le bonus des invités,
 * et si l'un d'eux streame à cet instant.
 *
 * Trois choses lues ici, jamais reçues du client : les invités (`streamer_guests`,
 * tenu par `streamer_guest_set`), la rareté (au **catalogue**, comme le
 * recyclage : une sauvegarde bricolée n'invente pas une Légendaire), et le
 * direct (`live_state` frais de moins de dix minutes, et le créateur
 * effectivement dans `live_streams` — exactement la condition du raid `0039`).
 */
create or replace function public._streamer_collab(p_user uuid)
returns table (
  permille      integer,
  buzz_permille integer,
  live          boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with frais as (
    select coalesce(
      (select s.refreshed_at from public.live_state s order by s.refreshed_at desc limit 1),
      to_timestamp(0)
    ) as refreshed_at
  ),
  invites as (
    select
      g.creator_slug as slug,
      coalesce(v.permille, 0) as permille
    from public._streamer_guests_of(p_user) g
    left join public._streamer_collab_values() v on v.rarity = g.rarity
  ),
  direct as (
    select i.slug
    from invites i
    where exists (
      select 1
      from public.creators c
      join public.live_streams l on l.login = c.login
      where c.slug = i.slug
    )
    and (select refreshed_at from frais) > now() - public._streamer_live_window()
  )
  select
    -- Le total : la rareté des invités, **puis** le bonus du direct s'il y en a
    -- un — c'est ce total que `streamer_publish()` applique au gain.
    (
      coalesce((select sum(i.permille) from invites i), 0)
      + case
          when exists (select 1 from direct) then (select l.permille from public._streamer_collab_live() l)
          else 0
        end
    )::integer as permille,
    case
      when exists (select 1 from direct) then (select l.buzz_permille from public._streamer_collab_live() l)
      else 0
    end as buzz_permille,
    exists (select 1 from direct) as live;
$$;

-- ---------------------------------------------------------------------------
-- 2. La vidéo du jour garde la trace du plateau
-- ---------------------------------------------------------------------------
-- Deux colonnes de plus, et rien de déplacé : les vidéos publiées avant cette
-- migration valent `collab = 0, raid = false` — ce qui est exactement ce
-- qu'elles étaient.

alter table public.streamer_videos add column if not exists collab integer not null default 0;
alter table public.streamer_videos add column if not exists raid boolean not null default false;

comment on column public.streamer_videos.collab is
  'Le bonus du plateau appliqué à cette vidéo, pour mille (0 = aucun invité). Le barème vit dans _streamer_collab_values() (0041).';
comment on column public.streamer_videos.raid is
  'true si un invité streamait au moment de publier — le moment « RAID ! » de la vidéo (0041).';

-- ---------------------------------------------------------------------------
-- 3. Publier la vidéo du jour : le plateau entre dans le tirage
-- ---------------------------------------------------------------------------

/**
 * Publie la vidéo du jour — inchangé depuis `0038`, sauf le **plateau**.
 *
 * Le gain se calcule en trois temps, dans cet ordre, et c'est cet ordre qui
 * compte : la croissance du jour (setup compris, `_streamer_growth`), le format,
 * puis le **plateau** (`_streamer_collab`) — donc un buzz paie trois fois le
 * gain du plateau, et le direct pousse la chance de buzz de 25 points.
 *
 * Le barème du plateau est relu **maintenant** : si un invité passe en direct
 * entre l'ouverture de l'écran et la publication, c'est le moment-là qui compte.
 * Le client n'envoie toujours que le format.
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
  v_potentiel bigint;
  v_gain     bigint;
  v_success  boolean;
  v_buzz     boolean;
  v_bad      boolean;
  v_tokens   integer;
  v_paid     integer := 0;
  v_deja     integer;
  v_after    bigint;
  v_collab   record;
begin
  perform public._streamer_ensure(v_user);
  v_day := public._streamer_game_day(now());

  -- Le format se valide **avant** tout le reste : un format inventé reste une
  -- erreur du client, même un jour déjà publié — sinon le message serait
  -- « déjà publiée » pour une faute de frappe, et le client croirait avoir joué.
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
      'collab', v_existant.collab,
      'raid', v_existant.raid,
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
  v_base := public._streamer_growth(v_user, v_row.subscribers);

  -- Le plateau du moment : la rareté des invités, et s'ils streament.
  select * into v_collab from public._streamer_collab(v_user);

  v_potentiel := round(v_base * v_fmt.gain_permille / 1000.0)::bigint;
  if v_collab.permille > 0 then
    v_potentiel := floor(v_potentiel * (1000 + v_collab.permille) / 1000.0)::bigint;
  end if;

  v_success := floor(random() * 1000)::integer < v_fmt.success_chance;
  v_buzz := v_success
    and floor(random() * 1000)::integer < least(1000, v_fmt.buzz_permille + v_collab.buzz_permille);
  v_bad := (not v_success) and floor(random() * 1000)::integer < v_fmt.bad_buzz_permille;

  if v_success then
    v_gain := v_potentiel * case when v_buzz then 3 else 1 end;
  elsif v_bad then
    v_gain := -round(v_potentiel / 4.0)::bigint;
  else
    v_gain := 0;
  end if;

  -- Le versement, sous plafond : ce qui reste de la journée, jamais plus.
  v_deja := case when v_row.tokens_day = v_day then v_row.tokens_today else 0 end;
  v_tokens := public._streamer_token_gain(v_success, v_buzz);
  v_paid := greatest(0, least(v_tokens, public._streamer_token_cap() - v_deja));

  v_after := greatest(0, v_row.subscribers + v_gain);

  insert into public.streamer_videos (user_id, day, format, success, buzz, bad_buzz, gained, tokens, collab, raid)
  values (v_user, v_day, lower(p_format), v_success, v_buzz, v_bad, v_gain, v_paid,
          v_collab.permille, v_collab.live);

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
    'collab', v_collab.permille,
    'raid', v_collab.live,
    'tokens', v_paid,
    'subscribers', v_after,
    'tokens_today', v_deja + v_paid,
    'tokens_cap', public._streamer_token_cap()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. L'état de la chaîne : ce que le plateau vaut, avant de publier
-- ---------------------------------------------------------------------------
-- `streamer_status()` (défini en `0036`, étendu en `0038` puis `0039`) gagne
-- trois champs : le bonus du plateau **maintenant**, le bonus de buzz, et si un
-- invité streame. C'est ce que l'écran affiche avant de publier — donc le chiffre
-- annoncé est celui qui sera payé, dix secondes plus tard.

create or replace function public.streamer_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_row    public.streamer_channels;
  v_day    text;
  v_raid   public.streamer_raids;
  v_collab record;
begin
  perform public._streamer_ensure(v_user);
  v_day := public._streamer_game_day(now());

  select * into v_row from public.streamer_channels c where c.user_id = v_user;
  select * into v_raid from public.streamer_raids r where r.user_id = v_user and r.day = v_day;
  select * into v_collab from public._streamer_collab(v_user);

  return jsonb_build_object(
    'ok', true,
    'subscribers', v_row.subscribers,
    'per_day', public._streamer_growth(v_user, v_row.subscribers),
    'day', v_day,
    'published_today', exists (
      select 1 from public.streamer_videos v where v.user_id = v_user and v.day = v_day
    ),
    'chosen_today', exists (
      select 1 from public.streamer_events e where e.user_id = v_user and e.day = v_day
    ),
    'tokens_today', case when v_row.tokens_day = v_day then v_row.tokens_today else 0 end,
    'tokens_cap', public._streamer_token_cap(),
    'setup', to_jsonb(public._streamer_setup_owned(v_user)),
    'setup_bonus', public._streamer_setup_bonus(v_user),
    'guests', public._streamer_guest_list(v_user),
    'raid_day', coalesce(v_raid.day, ''),
    'raid_today', coalesce(v_raid.gained, 0),
    'raid_guests', coalesce(v_raid.guests, '[]'::jsonb),
    'collab_permille', v_collab.permille,
    'collab_buzz_permille', v_collab.buzz_permille,
    'collab_live', v_collab.live
  );
end;
$$;

revoke all on function public.streamer_status() from public, anon;
grant execute on function public.streamer_status() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Le rapport de version, étendu
-- ---------------------------------------------------------------------------

/**
 * `schema_versions()` (défini en `0035`, étendu jusqu'à `0040`) redit ce que la
 * base sait faire, avec la ligne de la `0041` en plus.
 *
 * Le marqueur de `0041` est la fonction du plateau : une fonction se voit
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
    '0040', to_regprocedure('public.streamer_setup_sacrifice(jsonb)') is not null,
    -- 0041 : le plateau compte sur la vidéo du jour.
    '0041', to_regprocedure('public._streamer_collab(uuid)') is not null
  );
$$;

revoke all on function public.schema_versions() from public;
grant execute on function public.schema_versions() to anon, authenticated;

-- Les fonctions internes restent fermées au client : le joueur passe par
-- `streamer_status()`, `streamer_visit()`, `streamer_publish()`,
-- `streamer_event_today()`, `streamer_choose()`, `streamer_setup_buy()`,
-- `streamer_guest_set()` et `streamer_setup_sacrifice()`.
revoke all on function public._streamer_collab_values() from public, anon, authenticated;
revoke all on function public._streamer_collab_live() from public, anon, authenticated;
revoke all on function public._streamer_collab(uuid) from public, anon, authenticated;
