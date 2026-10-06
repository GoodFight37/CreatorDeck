-- CreatorDeck — le direct : qui streame maintenant.
--
-- Ce que ça change dans le jeu : une carte dont le créateur est **en train de
-- streamer** le dit, en direct (badge sur la carte, bandeau sur l'accueil,
-- filtre « En direct » dans le classeur). Aujourd'hui, « Live » n'est qu'une
-- variante tirée au hasard — elle ne veut rien dire de réel.
--
-- Pourquoi une **table** et pas un appel à Twitch depuis l'app :
--
--   * l'API Helix demande un **client secret**. Dans l'APK, un fichier se
--     dézippe : la clé serait publique, et n'importe qui pourrait se faire
--     passer pour le jeu (ou brûler son quota). L'appel vit donc dans une
--     **Edge Function** (`supabase/functions/refresh-live`), jamais dans le
--     client ;
--   * 1 000 créateurs = 10 requêtes Helix. On les fait **une fois pour tous les
--     joueurs**, pas une fois par joueur ;
--   * l'app n'a plus qu'à lire une table, comme le catalogue : deux `select`,
--     sans compte, sans secret.
--
-- Cette table est un **cache**. Elle peut être vide (personne en direct) ou
-- vieille de quelques minutes : `refreshed_at` dit l'âge, et l'app n'affiche
-- rien au-delà de dix minutes. Un badge « en direct » périmé serait un
-- mensonge — mieux vaut ne rien montrer.
--
-- À exécuter une fois. Rejouable sans perte (la table est un cache).

-- --------------------------------------------------------------------------
-- Qui est en direct
-- --------------------------------------------------------------------------
create table if not exists public.live_streams (
  -- Le `login` Twitch (minuscules) : c'est la clé qui relie une diffusion au
  -- catalogue (`public.creators.login`, rempli par 0003_catalogue.sql).
  login        text primary key,
  twitch_id    text not null default '',
  display_name text not null default '',
  game_name    text not null default '',
  title        text not null default '',
  viewers      integer not null default 0,
  started_at   timestamptz,
  thumbnail    text not null default '',
  refreshed_at timestamptz not null default now()
);

create index if not exists live_streams_viewers_idx
  on public.live_streams (viewers desc);

alter table public.live_streams enable row level security;

-- Lecture pour tout le monde (c'est une information publique : Twitch l'affiche
-- à qui veut), écriture pour personne depuis un client. La seule voie d'écriture
-- est `live_publish()`, appelée par la fonction serveur.
drop policy if exists "direct lisible par tous" on public.live_streams;
create policy "direct lisible par tous"
  on public.live_streams for select
  using (true);

revoke all on table public.live_streams from public, anon, authenticated;
grant select on table public.live_streams to anon, authenticated;

-- --------------------------------------------------------------------------
-- L'état du cache
-- --------------------------------------------------------------------------
-- Une seule ligne : quand le cache a été rafraîchi pour la dernière fois, et
-- combien de streamers étaient en direct. Sans elle, impossible de distinguer
-- « personne n'est en direct » de « le cache n'a jamais été rempli » (une table
-- vide ne dit pas son âge).
create table if not exists public.live_state (
  id           boolean primary key default true check (id),
  refreshed_at timestamptz not null default now(),
  streams      integer not null default 0,
  note         text not null default ''
);

-- Départ à l'époque Unix : « jamais rafraîchi ». L'app ne montre alors rien, et
-- la première visite déclenche le rafraîchissement.
insert into public.live_state (id, refreshed_at, streams, note)
values (true, to_timestamp(0), 0, 'jamais rafraîchi')
on conflict (id) do nothing;

alter table public.live_state enable row level security;

drop policy if exists "état du direct lisible par tous" on public.live_state;
create policy "état du direct lisible par tous"
  on public.live_state for select
  using (true);

revoke all on table public.live_state from public, anon, authenticated;
grant select on table public.live_state to anon, authenticated;

-- --------------------------------------------------------------------------
-- Publication (réservée au serveur)
-- --------------------------------------------------------------------------
-- Remplace la liste du direct **dans une seule transaction** : ce qui reste dans
-- la table est exactement ce que Helix vient de renvoyer, ni morceau de liste
-- ancienne, ni doublon. Les diffusions terminées disparaissent donc toutes
-- seules, sans tâche de nettoyage.
--
-- `security definer` : la fonction écrit dans une table dont l'écriture est
-- interdite aux clients. C'est pour ça que son exécution est **retirée à tout le
-- monde** et donnée au seul rôle `service_role` (celui de la fonction serveur) :
-- sinon n'importe quel joueur pourrait inventer un direct.
create or replace function public.live_publish(
  p_streams jsonb,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if p_streams is null or jsonb_typeof(p_streams) <> 'array' then
    raise exception 'live_publish attend un tableau JSON de diffusions';
  end if;

  -- Ce qui n'est plus en direct part. Le `coalesce` évite le piège classique :
  -- `not in (select …)` ne renvoie jamais vrai dès qu'il y a un NULL.
  delete from public.live_streams
   where login not in (
     select coalesce(s ->> 'login', '')
       from jsonb_array_elements(p_streams) as s
   );

  insert into public.live_streams (
    login, twitch_id, display_name, game_name, title, viewers, started_at, thumbnail, refreshed_at
  )
  select
    lower(coalesce(s ->> 'login', '')),
    coalesce(s ->> 'twitch_id', ''),
    coalesce(s ->> 'display_name', ''),
    coalesce(s ->> 'game_name', ''),
    left(coalesce(s ->> 'title', ''), 200),
    greatest(coalesce(nullif(s ->> 'viewers', '')::integer, 0), 0),
    -- Date de début : tolérée même si Twitch envoie autre chose qu'une date
    -- (une valeur invalide ne doit pas faire échouer tout le rafraîchissement).
    case
      when coalesce(s ->> 'started_at', '') ~ '^\d{4}-\d{2}-\d{2}'
        then (s ->> 'started_at')::timestamptz
      else null
    end,
    coalesce(s ->> 'thumbnail', ''),
    now()
    from jsonb_array_elements(p_streams) as s
   where lower(coalesce(s ->> 'login', '')) <> ''
  on conflict (login) do update set
    twitch_id    = excluded.twitch_id,
    display_name = excluded.display_name,
    game_name    = excluded.game_name,
    title        = excluded.title,
    viewers      = excluded.viewers,
    started_at   = excluded.started_at,
    thumbnail    = excluded.thumbnail,
    refreshed_at = excluded.refreshed_at;

  select count(*) into v_count from public.live_streams;

  insert into public.live_state (id, refreshed_at, streams, note)
  values (true, now(), v_count, left(coalesce(p_note, ''), 200))
  on conflict (id) do update set
    refreshed_at = excluded.refreshed_at,
    streams      = excluded.streams,
    note         = excluded.note;

  return jsonb_build_object(
    'streams', v_count,
    'refreshed_at', now()
  );
end;
$$;

comment on function public.live_publish(jsonb, text) is
  'Remplace le cache du direct et son horodatage. Réservée au rôle service_role (Edge Function refresh-live) : un client ne doit pas pouvoir inventer un direct.';

revoke all on function public.live_publish(jsonb, text) from public, anon, authenticated;

-- Le rôle `service_role` n'existe que sur Supabase (le vérificateur, lui, joue
-- les migrations sur un Postgres nu) : on le teste avant de lui donner le droit.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.live_publish(jsonb, text) to service_role;
  end if;
end
$$;
