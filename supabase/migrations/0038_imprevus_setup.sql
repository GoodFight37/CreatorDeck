-- 0038_imprevus_setup.sql — les imprévus de la chaîne, et le setup qui la fait grandir.
--
-- Deux ajouts à la chaîne (`0036_streamer.sql`), et une seule idée les tient :
-- **la chaîne se joue à la main, une fois par journée de jeu.** La vidéo du jour
-- existait ; voici l'imprévu du jour — une carte, deux réponses, un tirage — et
-- le **setup** : des paliers qui font grandir la chaîne plus vite, payés en
-- points, une fois chacun.
--
-- ---------------------------------------------------------------------------
-- Les imprévus
-- ---------------------------------------------------------------------------
-- Une situation par journée de jeu, **la même toute la journée**, et deux
-- réponses : on glisse la carte à gauche ou à droite. Le tirage est celui d'une
-- vidéo, dans le même ordre — réussite, buzz (sur une réussite), bad buzz (sur
-- un échec) — et il se calcule sur la croissance journalière du palier.
--
-- Ce qu'un imprévu **ne fait pas** : payer des jetons. Les jetons de la chaîne
-- ont une seule porte, la vidéo du jour (`_streamer_apply` du plafond de 40).
-- Un imprévu fait grandir ou reculer la chaîne, rien d'autre — deux monnaies
-- qui entrent par deux portes finissent toujours par se contourner.
--
-- Le **texte** des cartes vit dans l'application (`src/data/streamer.json`) :
-- le serveur ne connaît que des identifiants et des nombres, comme il ne connaît
-- que le nom d'un format de vidéo. Un client d'une autre version qui ne connaît
-- pas la carte du jour ne peut pas la jouer — il le dit, et il ne perd rien
-- d'autre que cette carte-là.
--
-- ---------------------------------------------------------------------------
-- Le setup
-- ---------------------------------------------------------------------------
-- Cinq paliers, **dans l'ordre** (webcam, micro, éclairage, déco, studio), payés
-- en points par `_wallet_apply()` — donc un palier ne s'achète qu'une fois, pour
-- toujours : c'est le journal du wallet (`kind = 'setup'`, `ref = le palier`) qui
-- le garantit, pas une politesse du client.
--
-- Chaque palier ajoute sa part de croissance (30, 50, 70, 100 puis 250 pour
-- mille : +50 % au total), et le bonus s'arrête **au premier palier manquant**.
-- Une ligne ajoutée à la main dans la table ne doit pas offrir le studio sans le
-- micro : c'est la règle du fichier, elle est écrite ici aussi.
--
-- Rejouable : `create table if not exists`, `create or replace`, `revoke` et
-- `grant` idempotents.

-- ---------------------------------------------------------------------------
-- Les tables
-- ---------------------------------------------------------------------------

-- Une réponse par journée de jeu : l'index unique la rend vraie même si le
-- client appelle deux fois — le second appel relit la première réponse.
create table if not exists public.streamer_events (
  id       bigserial primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      text not null,
  event    text not null,
  choice   text not null,
  success  boolean not null,
  buzz     boolean not null default false,
  bad_buzz boolean not null default false,
  gained   bigint not null default 0,
  at       timestamptz not null default now()
);

create unique index if not exists streamer_events_one_per_day
  on public.streamer_events (user_id, day);

-- Un palier de setup par joueur, et pour toujours.
create table if not exists public.streamer_setup (
  id     bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  level  text not null,
  at     timestamptz not null default now()
);

create unique index if not exists streamer_setup_one_per_level
  on public.streamer_setup (user_id, level);

alter table public.streamer_events enable row level security;
alter table public.streamer_setup enable row level security;
revoke all on table public.streamer_events from public, anon, authenticated;
revoke all on table public.streamer_setup from public, anon, authenticated;
revoke all on sequence public.streamer_events_id_seq from public, anon, authenticated;
revoke all on sequence public.streamer_setup_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Les cartes d'imprévu, et le tirage
-- ---------------------------------------------------------------------------
-- Miroir de `events` (`src/data/streamer.json`) : six cartes, deux côtés chacune,
-- les mêmes chances des deux côtés du mur. `src/lib/supabase-streamer.test.ts`
-- tient les deux copies ensemble — un chiffre changé d'un seul côté ferait
-- diverger ce que le joueur lit de ce que le serveur tire.

/** Les douze côtés de carte : pour chaque imprévu, la gauche et la droite. */
create or replace function public._streamer_events()
returns table (
  event             text,
  choice            text,
  success_chance    integer,
  gain_permille     integer,
  buzz_permille     integer,
  bad_buzz_permille integer
)
language sql
immutable
set search_path = public
as $$
  select t.event, t.choice, t.success_chance, t.gain_permille, t.buzz_permille, t.bad_buzz_permille
  from (values
    ('modo',    'gauche', 780,  900,  60,   0),
    ('modo',    'droite', 560, 1500, 140, 120),
    ('sponsor', 'gauche', 820,  700,  40,   0),
    ('sponsor', 'droite', 520, 1700, 180,   0),
    ('clip',    'gauche', 760, 1000,  80,   0),
    ('clip',    'droite', 640, 1400, 160,   0),
    ('coupure', 'gauche', 480, 1900, 120, 200),
    ('coupure', 'droite', 760,  900,  60,   0),
    ('raid',    'gauche', 700, 1500, 120,   0),
    ('raid',    'droite', 800,  900, 100,   0),
    ('nuit',    'gauche', 460, 1800, 100, 220),
    ('nuit',    'droite', 800,  700,  30,   0)
  ) as t(event, choice, success_chance, gain_permille, buzz_permille, bad_buzz_permille);
$$;

/** Un côté de carte, par ses identifiants. `not found` côté appelant si absent. */
create or replace function public._streamer_event_choice(p_event text, p_choice text)
returns table (
  success_chance    integer,
  gain_permille     integer,
  buzz_permille     integer,
  bad_buzz_permille integer
)
language sql
immutable
set search_path = public
as $$
  select e.success_chance, e.gain_permille, e.buzz_permille, e.bad_buzz_permille
  from public._streamer_events() e
  where e.event = lower(coalesce(p_event, ''))
    and e.choice = lower(coalesce(p_choice, ''));
$$;

/**
 * La carte de la journée pour ce joueur — **stable** : deux lectures le même
 * jour rendent la même carte, et le lendemain une autre.
 *
 * Le choix est un `md5` de (joueur, journée) réduit à un rang : pas d'aléa
 * stocké, donc rien à nettoyer, et deux joueurs ne tombent pas sur la même
 * carte le même soir. Le tri des cartes est explicite (`order by event`) : c'est
 * lui qui donne un sens au rang, et il ne dépend pas de l'ordre d'écriture des
 * `values` ci-dessus.
 */
create or replace function public._streamer_event_for(p_user uuid, p_day text)
returns text
language sql
immutable
set search_path = public
as $$
  select c.event
  from (select distinct e.event from public._streamer_events() e) c
  order by c.event
  offset (
    ('x' || substr(md5(coalesce(p_user::text, '') || ':' || coalesce(p_day, '')), 1, 8))::bit(32)::bigint
    % greatest(1, (select count(distinct e.event) from public._streamer_events() e))
  )
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Le setup : les paliers, le bonus, la croissance
-- ---------------------------------------------------------------------------
-- Miroir de `setup.levels` (`src/data/streamer.json`) : les libellés sont dans
-- l'application, les prix et les parts de croissance sont ici — c'est le serveur
-- qui débite les points, donc c'est lui qui doit connaître les prix.

/** Les cinq paliers, dans l'ordre où ils s'achètent. */
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
    (5, 'studio', 4200, 250)
  ) as t(rang, level, price, growth_permille);
$$;

/**
 * Le bonus de croissance du setup acheté, pour mille.
 *
 * Il s'arrête **au premier palier manquant** : même règle que le fichier, donc
 * une ligne ajoutée à la main ne vaut pas un studio.
 */
create or replace function public._streamer_setup_bonus(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(l.growth_permille), 0)::integer
  from public._streamer_setup_levels() l
  where exists (
    select 1 from public.streamer_setup s where s.user_id = p_user and s.level = l.level
  )
  and not exists (
    -- Un palier plus bas qui manque : tout ce qui est au-dessus ne compte pas.
    select 1
    from public._streamer_setup_levels() avant
    where avant.rang < l.rang
      and not exists (
        select 1 from public.streamer_setup s where s.user_id = p_user and s.level = avant.level
      )
  );
$$;

/**
 * Ce que la chaîne gagne par journée de jeu, **setup compris**.
 *
 * `_streamer_per_day()` (le palier) multiplié par le bonus, arrondi vers le bas.
 * L'application fait exactement le même calcul (`growthWithSetup()`), sinon
 * l'écran et le serveur annonceraient deux chiffres pour la même journée.
 */
create or replace function public._streamer_growth(p_user uuid, p_subscribers bigint)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select floor(
    public._streamer_per_day(p_subscribers)
    * (1000 + public._streamer_setup_bonus(p_user)) / 1000.0
  )::integer;
$$;

/**
 * Le **prochain** palier à acheter : le premier de la liste qui manque.
 *
 * « Manque » se lit sur le **préfixe contigu** : un palier compte comme acheté
 * seulement si tous ceux d'avant le sont. C'est la même règle que le bonus, et
 * c'est pour ça qu'elle est écrite deux fois de la même façon — une ligne
 * ajoutée à la main dans `streamer_setup` ne doit ni donner son bonus ni
 * **sauter** une étape pour le joueur.
 */
create or replace function public._streamer_setup_next(p_user uuid)
returns table (
  rang            integer,
  level           text,
  price           integer,
  growth_permille integer
)
language sql
stable
security definer
set search_path = public
as $$
  select l.rang, l.level, l.price, l.growth_permille
  from public._streamer_setup_levels() l
  where not exists (
    select 1 from public.streamer_setup s where s.user_id = p_user and s.level = l.level
  )
  and not exists (
    select 1
    from public._streamer_setup_levels() avant
    where avant.rang < l.rang
      and not exists (
        select 1 from public.streamer_setup s where s.user_id = p_user and s.level = avant.level
      )
  )
  order by l.rang
  limit 1;
$$;

/** Les paliers achetés, dans l'ordre du fichier — c'est ce que l'écran coche. */
create or replace function public._streamer_setup_owned(p_user uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(l.level order by l.rang), '{}')
  from public._streamer_setup_levels() l
  where exists (
    select 1 from public.streamer_setup s where s.user_id = p_user and s.level = l.level
  );
$$;

-- ---------------------------------------------------------------------------
-- L'état de la chaîne et l'absence, avec le setup
-- ---------------------------------------------------------------------------

/**
 * L'état de la chaîne, tel que le serveur le connaît.
 *
 * Même signature et mêmes champs qu'en `0036`, avec trois choses de plus : le
 * setup acheté, son bonus, et un `per_day` qui en tient compte. C'est cette
 * ligne-là que l'écran affiche — le chiffre de la croissance journalière est
 * celui que le serveur versera, pas celui du palier nu.
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
    'setup_bonus', public._streamer_setup_bonus(v_user)
  );
end;
$$;

revoke all on function public.streamer_status() from public, anon;
grant execute on function public.streamer_status() to authenticated;

/**
 * Le retour du joueur : la chaîne a grandi pendant son absence.
 *
 * Le calcul ne change pas (`0036`) — des journées de jeu plafonnées à sept, à la
 * croissance du palier de départ, un écart négatif qui vaut zéro —, mais la
 * croissance est maintenant celle du **setup compris** : un studio continue de
 * travailler pendant qu'on dort, c'est même un peu son intérêt.
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
  v_per_day integer;
begin
  perform public._streamer_ensure(v_user);

  select * into v_row from public.streamer_channels c where c.user_id = v_user for update;

  v_days := greatest(
    0,
    (public._streamer_day_number(v_now) - public._streamer_day_number(v_row.last_seen_at))::integer
  );
  v_counted := least(v_days, public._streamer_cap_days());
  v_per_day := public._streamer_growth(v_user, v_row.subscribers);
  v_gained := v_counted::bigint * v_per_day;
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
    'per_day', v_per_day
  );
end;
$$;

revoke all on function public.streamer_visit() from public, anon;
grant execute on function public.streamer_visit() to authenticated;

-- ---------------------------------------------------------------------------
-- L'imprévu du jour
-- ---------------------------------------------------------------------------

/**
 * La carte du jour, et ce qu'on y a répondu.
 *
 * `chosen: false` tant que le joueur n'a pas glissé la carte ; ensuite, la
 * réponse est relue (réussite, buzz, bad buzz, gain) — l'écran ne rejoue rien.
 * Le texte des cartes n'est pas ici : l'application le porte.
 */
create or replace function public.streamer_event_today()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_day   text;
  v_event text;
  v_fait  public.streamer_events;
begin
  if v_user is null then
    raise exception 'chaîne : connecte-toi pour jouer un imprévu' using errcode = 'P0001';
  end if;

  v_day := public._streamer_game_day(now());
  v_event := public._streamer_event_for(v_user, v_day);

  select * into v_fait
    from public.streamer_events e
   where e.user_id = v_user and e.day = v_day;

  return jsonb_build_object(
    'ok', true,
    'day', v_day,
    'event', v_event,
    'chosen', v_fait.id is not null,
    'choice', v_fait.choice,
    'success', coalesce(v_fait.success, false),
    'buzz', coalesce(v_fait.buzz, false),
    'bad_buzz', coalesce(v_fait.bad_buzz, false),
    'gained', coalesce(v_fait.gained, 0)
  );
end;
$$;

revoke all on function public.streamer_event_today() from public, anon;
grant execute on function public.streamer_event_today() to authenticated;

/**
 * Répond à l'imprévu du jour : c'est **ce côté-ci** de la carte que le joueur a
 * choisi, et le serveur tire le reste.
 *
 * Deux refus avant tout tirage : la carte doit être celle du jour (un client ne
 * choisit pas son imprévu) et le côté doit exister dans le fichier. Un second
 * appel le même jour relit la première réponse au lieu de la rejouer.
 */
create or replace function public.streamer_choose(p_event text, p_choice text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_day      text;
  v_event    text;
  v_choix    record;
  v_fait     public.streamer_events;
  v_row      public.streamer_channels;
  v_base     integer;
  v_success  boolean;
  v_buzz     boolean;
  v_bad      boolean;
  v_gain     bigint;
  v_after    bigint;
begin
  perform public._streamer_ensure(v_user);
  v_day := public._streamer_game_day(now());
  v_event := public._streamer_event_for(v_user, v_day);

  if lower(coalesce(p_event, '')) <> v_event then
    raise exception 'chaîne : ce n''est pas l''imprévu du jour' using errcode = 'P0001';
  end if;

  select * into v_choix from public._streamer_event_choice(v_event, p_choice);
  if not found then
    raise exception 'chaîne : ce choix n''existe pas' using errcode = 'P0001';
  end if;

  select * into v_fait
    from public.streamer_events e
   where e.user_id = v_user and e.day = v_day;
  if found then
    select * into v_row from public.streamer_channels c where c.user_id = v_user;
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'event', v_fait.event,
      'choice', v_fait.choice,
      'success', v_fait.success,
      'buzz', v_fait.buzz,
      'bad_buzz', v_fait.bad_buzz,
      'gained', v_fait.gained,
      'subscribers', v_row.subscribers,
      'per_day', public._streamer_growth(v_user, v_row.subscribers)
    );
  end if;

  select * into v_row from public.streamer_channels c where c.user_id = v_user for update;
  v_base := public._streamer_growth(v_user, v_row.subscribers);

  v_success := floor(random() * 1000)::integer < v_choix.success_chance;
  v_buzz := v_success and floor(random() * 1000)::integer < v_choix.buzz_permille;
  v_bad := (not v_success) and floor(random() * 1000)::integer < v_choix.bad_buzz_permille;

  if v_success then
    v_gain := round(v_base * v_choix.gain_permille / 1000.0)::bigint * case when v_buzz then 3 else 1 end;
  elsif v_bad then
    v_gain := -round(v_base * v_choix.gain_permille / 1000.0 / 4.0)::bigint;
  else
    v_gain := 0;
  end if;

  v_after := greatest(0, v_row.subscribers + v_gain);

  insert into public.streamer_events (user_id, day, event, choice, success, buzz, bad_buzz, gained)
  values (v_user, v_day, v_event, lower(p_choice), v_success, v_buzz, v_bad, v_gain);

  update public.streamer_channels
     set subscribers = v_after,
         updated_at = now()
   where user_id = v_user;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'event', v_event,
    'choice', lower(p_choice),
    'success', v_success,
    'buzz', v_buzz,
    'bad_buzz', v_bad,
    'gained', v_gain,
    'subscribers', v_after,
    'per_day', v_base
  );
end;
$$;

revoke all on function public.streamer_choose(text, text) from public, anon;
grant execute on function public.streamer_choose(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Le setup : acheter un palier
-- ---------------------------------------------------------------------------

/**
 * Achète le **prochain** palier de setup, et le débit passe par le wallet.
 *
 * Trois refus, dans cet ordre : le palier doit exister, il doit être le
 * prochain de la liste (on ne saute pas le micro pour prendre le studio), et il
 * ne doit pas être déjà acheté. Le prix est celui du serveur, pas un prix envoyé
 * par le client.
 *
 * Le débit lui-même est un mouvement `_wallet_apply(user, -prix, 'setup', palier)` :
 * le journal du wallet a un index unique sur `(user_id, kind, ref)`, donc même
 * un double appel ne débite qu'une fois. La table `streamer_setup` est écrite
 * **après** le débit, dans la même transaction, et sert à lire l'état.
 */
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

revoke all on function public.streamer_setup_buy(text) from public, anon;
grant execute on function public.streamer_setup_buy(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Le rapport de version, étendu
-- ---------------------------------------------------------------------------

/**
 * `schema_versions()` (défini en `0035`, étendu en `0036`, `0037` puis ici) redit
 * ce que la base sait faire, avec la ligne de la `0038` en plus.
 *
 * Le marqueur de `0038` est la table des imprévus : elle n'existe que dans cette
 * migration, et une table se voit (`to_regclass`) là où un morceau de code
 * pourrait traîner dans un commentaire.
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
    '0038', to_regclass('public.streamer_events') is not null
  );
$$;

revoke all on function public.schema_versions() from public;
grant execute on function public.schema_versions() to anon, authenticated;

-- Les fonctions internes restent fermées au client : le joueur passe par
-- `streamer_status()`, `streamer_visit()`, `streamer_publish()`,
-- `streamer_event_today()`, `streamer_choose()` et `streamer_setup_buy()`.
revoke all on function public._streamer_events() from public, anon, authenticated;
revoke all on function public._streamer_event_choice(text, text) from public, anon, authenticated;
revoke all on function public._streamer_event_for(uuid, text) from public, anon, authenticated;
revoke all on function public._streamer_setup_levels() from public, anon, authenticated;
revoke all on function public._streamer_setup_bonus(uuid) from public, anon, authenticated;
revoke all on function public._streamer_setup_owned(uuid) from public, anon, authenticated;
revoke all on function public._streamer_setup_next(uuid) from public, anon, authenticated;
revoke all on function public._streamer_growth(uuid, bigint) from public, anon, authenticated;
