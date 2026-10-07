-- ==========================================================================
-- CreatorDeck — 0018 : l'Arena (le classement de la semaine)
--
-- À exécuter après `0017_reinitialiser.sql`.
--
-- L'Arena est l'épreuve du jeu : cinq cartes alignées, au plus une Légendaire,
-- au moins un créateur **en direct**, et un score qui est la somme des viewers
-- réels à l'instant du dépôt. Ce n'est donc pas une mesure de collection mais
-- un pari sur le présent — et c'est pour ça qu'il tombe au serveur : un score
-- calculé sur l'appareil serait un score inventé.
--
-- Les règles vivent dans `src/data/arena.json` et dans `src/lib/arena.ts`, et
-- ce fichier les rejoue **en SQL** : cinq cartes, une Légendaire au plus, un
-- direct obligatoire, semaine du lundi 6 h UTC au lundi suivant, draft du
-- week-end (5 emplacements × 3 propositions, 48 h). Un garde-fou
-- (`src/lib/supabase-arena.test.ts`) relit les deux et refuse la divergence —
-- c'est le même contrat que `0013`/`progression.json` ou `0014`/`pull-rates.json`.
--
-- Ce que le serveur garde :
--
--   * `arena_entries` — une ligne par joueur et par semaine, avec **le meilleur
--     score de la semaine**. Un joueur peut réaligner son arène autant de fois
--     qu'il veut : une arène ne se dégrade pas (le petit score d'un essai raté
--     n'écrase pas un bon dépôt).
--   * `arena_drafts` — les cinq choix retenus le week-end, et le fait que le
--     draft de cette semaine a été joué.
--   * `arena_claims` — les récompenses déjà réclamées : un rang figé ne paie
--     qu'**une fois**, même si le joueur change d'appareil (les sabliers, eux,
--     restent crédités par l'appareil : c'est la règle du jeu — points, XP,
--     sabliers vivent dans la sauvegarde).
--
-- Rejouable : `create table if not exists`, `create or replace`, `grant`,
-- `revoke`. Rien d'autre.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- La semaine d'arène : le lundi 6 h UTC
-- --------------------------------------------------------------------------
-- Le « jour de jeu » commence à 6 h UTC (comme les missions et la série :
-- c'est l'heure où Twitch recommence). La semaine d'arène est ce même jour,
-- découpé en tranches de sept à partir du lundi. Sa clé publiée est la date de
-- ce lundi — « 2026-10-05 » — et c'est elle qui sert d'identifiant de semaine
-- partout : dans les tables, dans le classement, dans l'écran.
create or replace function public._arena_week_key(p_at timestamptz)
returns text
language sql
immutable
as $$
  select to_char(
    public._pack_game_day(p_at)
      - ((extract(dow from public._pack_game_day(p_at))::integer + 6) % 7),
    'YYYY-MM-DD'
  );
$$;

-- Le draft n'est ouvert que le week-end : samedi et dimanche du jour de jeu.
-- Attention : `extract(dow …)` rend 0 pour dimanche, pas 7 — c'est exactement
-- l'erreur que le module TypeScript a eue une fois, et la même règle est
-- écrite ici.
create or replace function public._arena_draft_open(p_at timestamptz)
returns boolean
language sql
immutable
as $$
  select extract(dow from public._pack_game_day(p_at))::integer in (6, 0);
$$;

-- --------------------------------------------------------------------------
-- Ce que le joueur possède
-- --------------------------------------------------------------------------
-- La collection vit dans la sauvegarde (`saves.state -> 'cards'`), qui reste la
-- source de vérité : on en extrait les slugs, sans doublon de variante.
-- `security definer` parce qu'un joueur n'a pas à lire la sauvegarde d'un autre
-- — et on ne l'appelle jamais qu'avec une identité vérifiée.
create or replace function public._arena_owned_slugs(p_user uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct c.card ->> 'creatorSlug'), '{}')
    from public.saves s
    cross join lateral jsonb_array_elements(coalesce(s.state -> 'cards', '[]'::jsonb)) as c(card)
   where s.user_id = p_user
     and c.card ->> 'creatorSlug' is not null;
$$;

-- --------------------------------------------------------------------------
-- Qui regarde quoi, maintenant
-- --------------------------------------------------------------------------
-- Le score se lit dans le cache du direct (`live_streams`, rempli par la
-- fonction `refresh-live`), et **seulement s'il est frais** : au-delà de dix
-- minutes, on ne sait plus qui streame, et un score calculé sur des chiffres
-- périmés serait un score faux. Le résultat est un objet `login -> viewers`,
-- exactement ce que le client manipule.
create or replace function public._arena_live_viewers()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewers jsonb;
begin
  if not exists (
    select 1
      from public.live_state s
     where s.id
       and s.refreshed_at > now() - interval '10 minutes'
  ) then
    return '{}'::jsonb;
  end if;

  select coalesce(jsonb_object_agg(l.login, greatest(l.viewers, 0)), '{}'::jsonb)
    into v_viewers
    from public.live_streams l
   where l.viewers > 0;

  return coalesce(v_viewers, '{}'::jsonb);
end;
$$;

-- --------------------------------------------------------------------------
-- Le score d'une arène
-- --------------------------------------------------------------------------
-- Une ligne par carte : son créateur streame-t-il, et devant combien de
-- personnes. Un créateur hors direct vaut **zéro** — il n'est pas pénalisé, il
-- est simplement absent du direct (l'arène paie le direct, pas la collection).
create or replace function public._arena_score(p_lineup text[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewers jsonb := public._arena_live_viewers();
  v_lines jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_live integer := 0;
  v_slug text;
  v_login text;
  v_viewers_n integer;
begin
  foreach v_slug in array p_lineup loop
    v_login := null;
    select c.login into v_login from public.creators c where c.slug = v_slug;
    if v_login is null then
      continue;
    end if;
    v_viewers_n := coalesce((v_viewers ->> v_login)::integer, 0);
    v_total := v_total + v_viewers_n;
    if v_viewers_n > 0 then
      v_live := v_live + 1;
    end if;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'slug', v_slug,
      'login', v_login,
      'viewers', v_viewers_n,
      'live', v_viewers_n > 0
    ));
  end loop;

  return jsonb_build_object('score', v_total, 'live_count', v_live, 'lines', v_lines);
end;
$$;

-- --------------------------------------------------------------------------
-- Les raisons de refuser une arène
-- --------------------------------------------------------------------------
-- Renvoie un tableau de phrases : vide = l'arène est recevable. L'écran affiche
-- ces phrases telles quelles, et la fonction de dépôt n'en laisse passer
-- aucune — un client ne peut donc pas envoyer une équipe que le serveur
-- n'aurait pas validée (le contrôle n'est pas seulement côté appareil).
--
-- Une carte **Sortante** (voir `0016_sortants.sql`) reste recevable : elle n'est
-- plus tirable, mais elle est bien dans le classeur, et l'arène est une
-- démonstration de collection.
create or replace function public._arena_problems(p_user uuid, p_lineup text[])
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owned text[] := public._arena_owned_slugs(p_user);
  v_live jsonb := public._arena_live_viewers();
  v_problems text[] := '{}';
  v_slug text;
  v_creator record;
  v_legendaries integer := 0;
  v_has_live boolean := false;
  v_seen text[] := '{}';
begin
  if p_lineup is null or array_length(p_lineup, 1) is null then
    return array['Une arène, c''est cinq cartes.'];
  end if;

  if array_length(p_lineup, 1) <> 5 then
    return array['Une arène, c''est cinq cartes — pas ' || array_length(p_lineup, 1)::text || '.'];
  end if;

  foreach v_slug in array p_lineup loop
    if v_slug = any (v_seen) then
      return array['Deux fois la même carte dans l''arène : non.'];
    end if;
    v_seen := v_seen || v_slug;

    select c.slug, c.login, c.display_name, c.rarity into v_creator
      from public.creators c
     where c.slug = v_slug;

    if v_creator.slug is null then
      return array['Une carte de l''arène n''existe pas au catalogue.'];
    end if;

    if not (v_slug = any (v_owned)) then
      return array['Tu n''as pas la carte de ' || v_creator.display_name || ' : elle ne peut pas entrer dans l''arène.'];
    end if;

    if v_creator.rarity = 'legendary' then
      v_legendaries := v_legendaries + 1;
    end if;

    if coalesce((v_live ->> v_creator.login)::integer, 0) > 0 then
      v_has_live := true;
    end if;
  end loop;

  if v_legendaries > 1 then
    v_problems := v_problems || ('Une seule Légendaire par arène (il y en a ' || v_legendaries::text || ') : c''est le choix qui fait l''arène.');
  end if;

  if not v_has_live then
    v_problems := v_problems || 'Il faut au moins un créateur en direct dans l''arène.';
  end if;

  return v_problems;
end;
$$;

-- --------------------------------------------------------------------------
-- Les tables
-- --------------------------------------------------------------------------
-- Une ligne par joueur et par semaine. `lineup` garde les cinq slugs dans
-- l'ordre où le joueur les a alignés (l'écran les montre dans cet ordre).
create table if not exists public.arena_entries (
  user_id      uuid not null references auth.users (id) on delete cascade,
  week_key     text not null,
  lineup       jsonb not null,
  score        integer not null default 0 check (score >= 0),
  live_count   smallint not null default 0 check (live_count between 0 and 5),
  submitted_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, week_key),
  constraint arena_cinq_cartes check (jsonb_array_length(lineup) = 5)
);

create index if not exists arena_entries_week_idx
  on public.arena_entries (week_key, score desc, submitted_at);

-- Le draft du week-end : les cinq choix retenus, et la preuve qu'il a été joué.
create table if not exists public.arena_drafts (
  user_id   uuid not null references auth.users (id) on delete cascade,
  week_key  text not null,
  picks     jsonb not null,
  picked_at timestamptz not null default now(),
  primary key (user_id, week_key),
  constraint arena_draft_cinq check (jsonb_array_length(picks) = 5)
);

-- Les récompenses réclamées : une semaine ne paie qu'une fois, même si le
-- joueur change d'appareil ou réinstalle l'application.
create table if not exists public.arena_claims (
  user_id     uuid not null references auth.users (id) on delete cascade,
  week_key    text not null,
  rank        integer not null check (rank >= 1),
  hourglasses integer not null default 0 check (hourglasses >= 0),
  emblem      boolean not null default false,
  claimed_at  timestamptz not null default now(),
  primary key (user_id, week_key)
);

alter table public.arena_entries enable row level security;
alter table public.arena_drafts enable row level security;
alter table public.arena_claims enable row level security;

-- Aucune politique : ces tables ne se lisent que par les fonctions ci-dessous
-- (`security definer`), qui décident ce qui est montrable. Un client ne peut ni
-- lire la ligne d'un autre joueur, ni écrire la sienne à la main.
drop policy if exists "arène : rien pour les clients" on public.arena_entries;
drop policy if exists "arène : rien pour les clients" on public.arena_drafts;
drop policy if exists "arène : rien pour les clients" on public.arena_claims;

revoke all on table public.arena_entries from public, anon, authenticated;
revoke all on table public.arena_drafts from public, anon, authenticated;
revoke all on table public.arena_claims from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Déposer son arène
-- --------------------------------------------------------------------------
-- Le score est calculé **maintenant**, à partir du direct frais : c'est le
-- dépôt qui vaut engagement, pas la composition. Un joueur qui réaligne garde
-- son meilleur score de la semaine (une arène ne se dégrade pas).
create or replace function public.arena_submit(p_lineup text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_week text := public._arena_week_key(now());
  v_problems text[];
  v_scored jsonb;
  v_before integer;
  v_best integer;
begin
  if v_user is null then
    raise exception 'arène : connecte-toi pour aligner cinq cartes' using errcode = 'P0001';
  end if;

  v_problems := public._arena_problems(v_user, p_lineup);
  if array_length(v_problems, 1) is not null then
    raise exception 'arène : %', v_problems[1] using errcode = 'P0001';
  end if;

  v_scored := public._arena_score(p_lineup);

  select e.score into v_before
    from public.arena_entries e
   where e.user_id = v_user
     and e.week_key = v_week;

  insert into public.arena_entries as e (user_id, week_key, lineup, score, live_count)
  values (
    v_user,
    v_week,
    to_jsonb(p_lineup),
    (v_scored ->> 'score')::integer,
    (v_scored ->> 'live_count')::smallint
  )
  on conflict (user_id, week_key) do update set
    lineup       = case
                     when excluded.score >= e.score then excluded.lineup
                     else e.lineup
                   end,
    score        = greatest(e.score, excluded.score),
    live_count   = case
                     when excluded.score >= e.score then excluded.live_count
                     else e.live_count
                   end,
    submitted_at = case
                     when excluded.score > e.score then now()
                     else e.submitted_at
                   end,
    updated_at   = now()
  returning e.score into v_best;

  return jsonb_build_object(
    'week', v_week,
    'score', (v_scored ->> 'score')::integer,
    'live_count', (v_scored ->> 'live_count')::integer,
    'best', v_best,
    -- `kept` = le dépôt n'a pas battu le précédent, le meilleur score reste.
    'kept', coalesce(v_before, -1) > (v_scored ->> 'score')::integer
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Le classement de la semaine
-- --------------------------------------------------------------------------
-- Trié au score, puis au plus ancien dépôt (le premier à avoir atteint un score
-- passe devant : c'est la règle des classements de vitesse, et elle évite les
-- égalités arbitraires). Renvoie le top 100 — au-delà, le classement publié
-- n'apprend plus rien, et `arena_me()` donne à chacun son rang exact.
create or replace function public.arena_leaderboard(p_week text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week text := coalesce(p_week, public._arena_week_key(now()));
  v_rows jsonb;
begin
  with ranked as (
    select e.user_id,
           coalesce(p.display_name, 'Collectionneur') as display_name,
           e.score,
           e.live_count,
           e.submitted_at,
           e.lineup,
           row_number() over (order by e.score desc, e.submitted_at asc, e.user_id) as rank
      from public.arena_entries e
      left join public.profiles p on p.user_id = e.user_id
     where e.week_key = v_week
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', r.user_id,
           'displayName', r.display_name,
           'score', r.score,
           'liveCount', r.live_count,
           'lineup', r.lineup,
           'submittedAt', r.submitted_at,
           'rank', r.rank
         ) order by r.rank), '[]'::jsonb)
    into v_rows
    from ranked r
   where r.rank <= 100;

  return jsonb_build_object(
    'week', v_week,
    'endsAt', (v_week::date + interval '7 days 6 hours') at time zone 'utc',
    'draftOpen', public._arena_draft_open(now()),
    'rows', v_rows
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Mon arène, mon rang
-- --------------------------------------------------------------------------
-- Ce que l'écran affiche en arrivant : mon dépôt de la semaine, mon rang, le
-- draft (ouvert ou joué) et mes récompenses en attente. Le rang d'une semaine
-- **terminée** est figé — les scores ne bougent plus, ils ont été calculés au
-- dépôt — et c'est lui qui paie (`arena_claim`).
create or replace function public.arena_me()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_week text := public._arena_week_key(now());
  v_entry jsonb;
  v_rank integer;
  v_draft jsonb;
  v_claims jsonb;
  v_pending jsonb;
begin
  if v_user is null then
    raise exception 'arène : connecte-toi d''abord' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
           'lineup', e.lineup,
           'score', e.score,
           'liveCount', e.live_count,
           'submittedAt', e.submitted_at
         )
    into v_entry
    from public.arena_entries e
   where e.user_id = v_user
     and e.week_key = v_week;

  if v_entry is not null then
    select count(*) + 1 into v_rank
      from public.arena_entries e
     where e.week_key = v_week
       and (
         e.score > (v_entry ->> 'score')::integer
         or (
           e.score = (v_entry ->> 'score')::integer
           and e.submitted_at < (v_entry ->> 'submittedAt')::timestamptz
         )
       );
  end if;

  select jsonb_build_object('picks', d.picks, 'pickedAt', d.picked_at)
    into v_draft
    from public.arena_drafts d
   where d.user_id = v_user
     and d.week_key = v_week;

  select coalesce(jsonb_agg(jsonb_build_object(
           'week', c.week_key,
           'rank', c.rank,
           'hourglasses', c.hourglasses,
           'emblem', c.emblem
         ) order by c.week_key desc), '[]'::jsonb)
    into v_claims
    from public.arena_claims c
   where c.user_id = v_user;

  -- Les semaines terminées où le joueur a joué sans venir chercher sa part :
  -- c'est ce qui alimente le bouton « Encaisse ». Sans cette liste, une
  -- récompense oubliée resterait invisible — et un jeu qui cache ses gains
  -- apprend à ne plus les attendre.
  select coalesce(jsonb_agg(jsonb_build_object('week', ranked.week_key, 'rank', ranked.rank)
           order by ranked.week_key desc), '[]'::jsonb)
    into v_pending
    from (
      select e.week_key,
             (select count(*) + 1
                from public.arena_entries o
               where o.week_key = e.week_key
                 and (o.score > e.score
                      or (o.score = e.score and o.submitted_at < e.submitted_at))) as rank
        from public.arena_entries e
       where e.user_id = v_user
         and e.week_key < v_week
         and not exists (
           select 1 from public.arena_claims c
            where c.user_id = v_user and c.week_key = e.week_key
         )
    ) ranked;

  return jsonb_build_object(
    'week', v_week,
    'draftOpen', public._arena_draft_open(now()),
    'entry', v_entry,
    'rank', v_rank,
    'draft', v_draft,
    'claims', v_claims,
    'pending', v_pending
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Réclamer la récompense d'une semaine terminée
-- --------------------------------------------------------------------------
-- Les paliers recopiés ici sont ceux de `src/data/arena.json` (5 / 3 / 2
-- sabliers, puis 1 pour les dix premiers) et l'emblème va au top 10. Un
-- garde-fou TypeScript relit les deux fichiers : ce n'est pas au SQL de
-- décider seul ce que le jeu paie.
--
-- Les sabliers sont **crédités par l'appareil** (comme les points, l'XP et le
-- Perfect du 7ᵉ jour) : cette fonction dit combien, et une seule fois. Le
-- deuxième appel — autre appareil, ou rechargement — répond `claimed: true`
-- avec zéro sablier.
create or replace function public.arena_claim(p_week text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_mine integer;
  v_rank integer;
  v_hourglasses integer;
  v_existing record;
begin
  if v_user is null then
    raise exception 'arène : connecte-toi d''abord' using errcode = 'P0001';
  end if;

  if p_week !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'arène : semaine inconnue' using errcode = 'P0001';
  end if;

  if p_week >= public._arena_week_key(now()) then
    raise exception 'arène : la semaine n''est pas terminée' using errcode = 'P0001';
  end if;

  select * into v_existing
    from public.arena_claims c
   where c.user_id = v_user
     and c.week_key = p_week;

  if v_existing.user_id is not null then
    return jsonb_build_object(
      'week', p_week,
      'claimed', true,
      'rank', v_existing.rank,
      'hourglasses', 0,
      'emblem', v_existing.emblem
    );
  end if;

  select e.score into v_mine
    from public.arena_entries e
   where e.user_id = v_user
     and e.week_key = p_week;

  if v_mine is null then
    -- Pas d'arène déposée cette semaine-là : rien à réclamer, et on l'inscrit
    -- pour ne pas reposer la question à chaque ouverture de l'écran.
    insert into public.arena_claims (user_id, week_key, rank, hourglasses, emblem)
    values (v_user, p_week, 9999, 0, false);

    return jsonb_build_object('week', p_week, 'claimed', true, 'rank', null, 'hourglasses', 0, 'emblem', false);
  end if;

  select count(*) + 1 into v_rank
    from public.arena_entries e
   where e.week_key = p_week
     and (
       e.score > v_mine
       or (e.score = v_mine and e.submitted_at < (select submitted_at from public.arena_entries
                                                    where user_id = v_user and week_key = p_week))
     );

  v_hourglasses := case
    when v_rank = 1 then 5
    when v_rank = 2 then 3
    when v_rank = 3 then 2
    when v_rank <= 10 then 1
    else 0
  end;

  insert into public.arena_claims (user_id, week_key, rank, hourglasses, emblem)
  values (v_user, p_week, v_rank, v_hourglasses, v_rank <= 10)
  on conflict (user_id, week_key) do nothing;

  return jsonb_build_object(
    'week', p_week,
    'claimed', false,
    'rank', v_rank,
    'hourglasses', v_hourglasses,
    'emblem', v_rank <= 10
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Le draft du week-end
-- --------------------------------------------------------------------------
-- Cinq emplacements, trois propositions chacun, une seule retenue par
-- emplacement — quinze cartes proposées, cinq alignées. Les propositions se
-- tirent dans **la collection du joueur** : un draft ne donne pas de cartes,
-- il oblige à choisir parmi les siennes.
--
-- Le tirage est **reproductible** : il dépend de `hashtext(user | semaine |
-- emplacement)`, exactement comme les choix du Paquet Scène (`0014`). Le
-- serveur peut donc recalculer les propositions au moment d'accepter le choix
-- du joueur — un client ne peut pas s'inventer trois Légendaires.
create or replace function public._arena_draft_slots(p_user uuid, p_week text, p_owned text[])
returns jsonb
language plpgsql
immutable
as $$
declare
  v_count integer := coalesce(array_length(p_owned, 1), 0);
  v_slots jsonb := '[]'::jsonb;
  v_slot integer;
  v_start integer;
begin
  if v_count < 5 then
    return '[]'::jsonb;
  end if;

  for v_slot in 0..4 loop
    v_start := 1 + (
      abs(hashtext(p_user::text || '|' || p_week || '|' || v_slot::text)) % v_count
    );
    v_slots := v_slots || jsonb_build_array(to_jsonb(array[
      p_owned[1 + ((v_start - 1) % v_count)],
      p_owned[1 + ((v_start) % v_count)],
      p_owned[1 + ((v_start + 1) % v_count)]
    ]));
  end loop;

  return v_slots;
end;
$$;

-- Les propositions, pour de vrai : la collection du joueur, la semaine en
-- cours, et le tirage reproductible ci-dessus. C'est **cette** fonction que le
-- client appelle, et c'est elle que `arena_draft_pick` recalcule pour vérifier
-- les choix reçus.
create or replace function public.arena_draft_choices()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_week text := public._arena_week_key(now());
  v_owned text[];
  v_count integer;
  v_slots jsonb;
begin
  if v_user is null then
    raise exception 'arène : connecte-toi d''abord' using errcode = 'P0001';
  end if;

  if not public._arena_draft_open(now()) then
    raise exception 'arène : le draft n''est ouvert que le week-end' using errcode = 'P0001';
  end if;

  -- Trié pour que le tirage soit stable d'un appel à l'autre (l'ordre de la
  -- sauvegarde, lui, change à chaque nouvelle carte).
  select array_agg(slug order by slug) into v_owned
    from unnest(public._arena_owned_slugs(v_user)) as slug
   where exists (select 1 from public.creators c where c.slug = slug);

  v_count := coalesce(array_length(v_owned, 1), 0);
  if v_count < 5 then
    raise exception 'arène : il te faut au moins cinq cartes pour un draft (tu en as %)', v_count
      using errcode = 'P0001';
  end if;

  v_slots := public._arena_draft_slots(v_user, v_week, v_owned);

  return jsonb_build_object('week', v_week, 'slots', v_slots);
end;
$$;

-- Enregistre les cinq choix du draft : ils deviennent l'arène de la semaine,
-- et le score est calculé à cet instant. Le serveur **recalcule** les
-- propositions avant d'accepter : chaque carte doit figurer dans les trois de
-- son emplacement.
create or replace function public.arena_draft_pick(p_lineup text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_week text := public._arena_week_key(now());
  v_choices jsonb;
  v_problems text[];
  v_scored jsonb;
  v_slot integer;
  v_slug text;
  v_allowed text[];
  v_best integer;
begin
  if v_user is null then
    raise exception 'arène : connecte-toi d''abord' using errcode = 'P0001';
  end if;

  if not public._arena_draft_open(now()) then
    raise exception 'arène : le draft n''est ouvert que le week-end' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.arena_drafts d where d.user_id = v_user and d.week_key = v_week) then
    raise exception 'arène : ton draft de la semaine est déjà joué' using errcode = 'P0001';
  end if;

  v_problems := public._arena_problems(v_user, p_lineup);
  if array_length(v_problems, 1) is not null then
    raise exception 'arène : %', v_problems[1] using errcode = 'P0001';
  end if;

  v_choices := public.arena_draft_choices();

  for v_slot in 0..4 loop
    v_slug := p_lineup[v_slot + 1];
    select coalesce(array_agg(value::text), '{}')
      into v_allowed
      from jsonb_array_elements_text(v_choices -> 'slots' -> v_slot) as value;
    if not (v_slug = any (v_allowed)) then
      raise exception 'arène : % n''était pas proposé à l''emplacement %', v_slug, v_slot + 1
        using errcode = 'P0001';
    end if;
  end loop;

  v_scored := public._arena_score(p_lineup);

  insert into public.arena_drafts (user_id, week_key, picks)
  values (v_user, v_week, to_jsonb(p_lineup))
  on conflict (user_id, week_key) do nothing;

  insert into public.arena_entries as e (user_id, week_key, lineup, score, live_count)
  values (
    v_user,
    v_week,
    to_jsonb(p_lineup),
    (v_scored ->> 'score')::integer,
    (v_scored ->> 'live_count')::smallint
  )
  on conflict (user_id, week_key) do update set
    lineup       = case when excluded.score >= e.score then excluded.lineup else e.lineup end,
    score        = greatest(e.score, excluded.score),
    live_count   = case when excluded.score >= e.score then excluded.live_count else e.live_count end,
    updated_at   = now()
  returning e.score into v_best;

  return jsonb_build_object(
    'week', v_week,
    'score', (v_scored ->> 'score')::integer,
    'live_count', (v_scored ->> 'live_count')::integer
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Les droits
-- --------------------------------------------------------------------------
-- Comme la wishlist (`0015`) et la réinitialisation (`0017`) : le rôle `public`
-- a l'exécution par défaut sur une fonction neuve, donc on la lui retire. Les
-- fonctions internes (`_arena_*`) ne sont appelables par personne — elles sont
-- appelées par les autres fonctions, qui sont `security definer`.
revoke all on function public._arena_week_key(timestamptz) from public, anon;
revoke all on function public._arena_draft_open(timestamptz) from public, anon;
revoke all on function public._arena_owned_slugs(uuid) from public, anon;
revoke all on function public._arena_live_viewers() from public, anon;
revoke all on function public._arena_score(text[]) from public, anon;
revoke all on function public._arena_problems(uuid, text[]) from public, anon;
revoke all on function public._arena_draft_slots(uuid, text, text[]) from public, anon;

revoke all on function public.arena_submit(text[]) from public, anon;
revoke all on function public.arena_me() from public, anon;
revoke all on function public.arena_claim(text) from public, anon;
revoke all on function public.arena_draft_choices() from public, anon;
revoke all on function public.arena_draft_pick(text[]) from public, anon;

grant execute on function public.arena_submit(text[]) to authenticated;
grant execute on function public.arena_me() to authenticated;
grant execute on function public.arena_claim(text) to authenticated;
grant execute on function public.arena_draft_choices() to authenticated;
grant execute on function public.arena_draft_pick(text[]) to authenticated;

-- Le classement est la seule chose lisible « par tout le monde » : c'est un
-- tableau d'affichage, et un visiteur non connecté peut le regarder.
revoke all on function public.arena_leaderboard(text) from public;
grant execute on function public.arena_leaderboard(text) to anon, authenticated;

-- ==========================================================================
-- Contrôle rapide (facultatif), connecté, un week-end d'arène :
--   select public.arena_leaderboard();
--   select public.arena_me();
--   select public.arena_draft_choices();
--   select public.arena_submit(array['slug1','slug2','slug3','slug4','slug5']);
-- ==========================================================================
