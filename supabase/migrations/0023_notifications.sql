-- CreatorDeck — les notifications : réveiller le joueur quand un type passe en direct.
--
-- Le brief le dit à sa façon : la bonne question n'est pas « le sablier est-il
-- plein ? », c'est « est-ce qu'un type vient de lancer son live ? ». Une
-- notification ne sert qu'à ça — sortir le joueur de sa journée pour un
-- **moment**, pas pour une recharge.
--
-- Ce fichier pose le strict nécessaire :
--
--   * `push_tokens` : un jeton d'appareil par ligne, rattaché à un compte. Le
--     jeton ne sort **jamais** vers un client (RLS active, aucune politique,
--     aucun droit) : seules deux fonctions *security definer* l'écrivent, et
--     `push_targets()` — réservée au rôle de service — le lit.
--   * `push_log` : le journal anti-doublon. Il porte la règle « on ne relance
--     pas le même créateur avant 6 h, et jamais plus d'une notification par
--     heure et par joueur ». Un téléphone qui vibre trois fois d'affilée se
--     fait désinstaller.
--   * `push_targets()` : calcule **qui** prévenir, pour **quoi**, marque le
--     journal **dans la même transaction** et renvoie la liste prête à
--     envoyer. C'est du SQL, donc le vérificateur peut l'éprouver sans réseau,
--     sans Firebase et sans clé.
--
-- Ce qui n'est pas ici : l'envoi. Il vit dans l'Edge Function `notify-live`
-- (Firebase exige un compte de service : c'est un secret, il n'a rien à faire
-- dans la base ni dans le dépôt). Voir `docs/cloud-supabase.md`, § Notifications.
--
-- Rejouable : `create table if not exists`, `create or replace`, `revoke` et
-- `grant` idempotents.

-- ---------------------------------------------------------------- les jetons
create table if not exists public.push_tokens (
  -- Le jeton FCM lui-même. C'est la clé : un appareil n'en a qu'un, et si le
  -- même téléphone change de compte, la ligne suit (voir le `on conflict`).
  token      text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  platform   text not null default 'android',
  -- La préférence du joueur : « préviens-moi quand un créateur que je
  -- collectionne passe en direct ». Vraie par défaut : c'est le geste attendu
  -- du brief, et un interrupteur est là pour celui que ça dérange.
  live       boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Aucune politique, et **aucun** droit : ni lecture ni écriture côté client.
-- Un jeton volé, c'est le droit d'envoyer des notifications à un joueur.
revoke all on table public.push_tokens from public, anon, authenticated;

-- ------------------------------------------------------- le journal des envois
create table if not exists public.push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  login   text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, login)
);

alter table public.push_log enable row level security;
revoke all on table public.push_log from public, anon, authenticated;

-- Le plafond horaire lit `sent_at` par joueur : c'est cet index qui le sert.
create index if not exists push_log_sent_idx on public.push_log (user_id, sent_at desc);

-- ------------------------------------------------------------- l'inscription
-- Appelée par l'app après l'obtention du jeton FCM. La fonction décide du
-- rattachement : le client ne peut pas inscrire un jeton **au nom d'un autre**
-- (l'identité vient de `auth.uid()`), ni écrire une ligne à la main (la table
-- est fermée).
create or replace function public.register_push_token(
  p_token    text,
  p_platform text default 'android'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_token text := btrim(coalesce(p_token, ''));
begin
  if v_user is null then
    raise exception 'Connecte-toi pour recevoir les notifications.';
  end if;

  -- Un jeton FCM fait ~150 caractères ; les bornes larges servent surtout à
  -- refuser un envoi vide ou un roman collé par un client bricolé.
  if length(v_token) < 10 or length(v_token) > 4096 then
    raise exception 'Jeton de notification invalide.';
  end if;

  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (v_token, v_user, left(coalesce(nullif(btrim(p_platform), ''), 'android'), 20), now())
  on conflict (token) do update set
    -- Le même appareil, un autre compte : la notification suit le compte
    -- connecté, sinon l'ancien propriétaire continuerait de la recevoir.
    user_id    = excluded.user_id,
    platform   = excluded.platform,
    updated_at = now();
    -- `live` n'est **pas** touché : un joueur qui a coupé les notifications
    -- ne les rallume pas en réinstallant l'app.

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.register_push_token(text, text) is
  'Inscrit (ou déplace) le jeton de notification de l''appareil pour le compte connecté. Réservée à `authenticated` : la table `push_tokens` reste fermée.';

-- ------------------------------------------------------------- le désabonnement
-- Le jeton quitte le serveur quand la déconnexion est explicite : sinon la
-- notification suivante atterrirait sur l'écran de connexion d'un autre.
create or replace function public.forget_push_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_token text := btrim(coalesce(p_token, ''));
begin
  if v_user is null then
    raise exception 'Connecte-toi pour gérer les notifications.';
  end if;

  delete from public.push_tokens
   where token = v_token and user_id = v_user;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.forget_push_token(text) is
  'Retire le jeton de l''appareil pour le compte connecté (et lui seul : un jeton appartient à un appareil).';

-- ------------------------------------------------------------ l'interrupteur
-- La préférence vit sur les lignes de l'appareil, pas dans un coin du profil :
-- un joueur peut vouloir les notifications sur son téléphone et pas sur sa
-- tablette. L'interrupteur les change toutes — c'est ce que l'écran promet.
create or replace function public.set_push_live(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'Connecte-toi pour gérer les notifications.';
  end if;

  update public.push_tokens
     set live = coalesce(p_enabled, true), updated_at = now()
   where user_id = v_user;
  get diagnostics v_count = row_count;

  return jsonb_build_object('ok', true, 'devices', v_count);
end;
$$;

comment on function public.set_push_live(boolean) is
  'Allume ou coupe « préviens-moi quand un créateur que je collectionne passe en direct », sur tous les appareils du compte.';

-- --------------------------------------------------- qui prévenir, et pour quoi
-- Renvoie une ligne par **appareil** à réveiller, avec de quoi écrire la
-- notification : le créateur, son nom, ses spectateurs, et la raison (`epingle`
-- si c'est ton épinglé, `collection` si tu as au moins une de ses cartes).
--
-- Les règles, dans l'ordre :
--   * un direct **frais** (`started_at` < 30 min) et non vide — pas de
--     notification pour un flux à zéro spectateur, c'est un écran noir ;
--   * un créateur du catalogue, non sortant ;
--   * l'appareil veut les notifications (`live`) ;
--   * le créateur intéresse ce compte : épinglé, ou carte possédée ;
--   * pas de doublon : ce créateur n'a pas déjà sonné pour ce joueur depuis
--     6 h, et le joueur n'a reçu aucune notification depuis 1 h ;
--   * un seul créateur par appareil et par passage — le plus prioritaire
--     d'abord (l'épinglé), puis le plus gros direct : s'il faut réveiller
--     quelqu'un, autant que ce soit pour le live qui compte.
--
-- Le marquage se fait dans la même requête que la sélection : deux passages
-- simultanés (deux appels de la fonction) ne peuvent pas envoyer deux fois.
-- Si l'envoi échoue ensuite côté Firebase, on ne réessaie pas — un doublon est
-- pire qu'un silence.
create or replace function public.push_targets()
returns table (
  user_id      uuid,
  token        text,
  login        text,
  display_name text,
  viewers      integer,
  reason       text
)
language plpgsql
security definer
set search_path = public
as $$
-- `user_id` et `login` sont aussi des paramètres de sortie : sans cette
-- consigne, PL/pgSQL refuse la requête (« column reference is ambiguous »)
-- au premier appel. Ici, le nom nu désigne **toujours** la colonne — c'est ce
-- que veulent `on conflict (user_id, login)` et `returning`.
#variable_conflict use_column
begin
  return query
  with frais as (
    select s.login, s.display_name, greatest(coalesce(s.viewers, 0), 0) as viewers
      from public.live_streams s
     where s.started_at is not null
       and s.started_at > now() - interval '30 minutes'
       and coalesce(s.viewers, 0) > 0
  ),
  interesses as (
    select t.token, t.user_id, f.login, f.display_name, f.viewers,
           case when w.slug is null then 'collection' else 'epingle' end as reason,
           case when w.slug is null then 1 else 0 end as rang
      from frais f
      join public.creators c on c.login = f.login and not c.retired
      join public.push_tokens t on t.live
      left join public.wishlist w on w.user_id = t.user_id and w.slug = c.slug
     where w.slug is not null
        or exists (
             select 1
               from public.user_cards uc
              where uc.user_id = t.user_id
                and uc.creator_slug = c.slug
           )
  ),
  eligibles as (
    select i.token, i.user_id, i.login, i.display_name, i.viewers, i.reason, i.rang
      from interesses i
     where not exists (
             select 1
               from public.push_log l
              where l.user_id = i.user_id
                and l.login = i.login
                and l.sent_at > now() - interval '6 hours'
           )
       and not exists (
             select 1
               from public.push_log l
              where l.user_id = i.user_id
                and l.sent_at > now() - interval '1 hour'
           )
  ),
  choisis as (
    select distinct on (e.token) e.*
      from eligibles e
     order by e.token, e.rang, e.viewers desc, e.login
  ),
  marque as (
    insert into public.push_log (user_id, login, sent_at)
    -- `distinct on` : un joueur peut avoir deux appareils, donc deux lignes
    -- choisies pour le même créateur — le journal n'en garde qu'une, sinon
    -- Postgres refuse (« ON CONFLICT DO UPDATE cannot affect row a second time »).
    select distinct on (c.user_id, c.login) c.user_id, c.login, now()
      from choisis c
     order by c.user_id, c.login
    on conflict (user_id, login) do update set sent_at = excluded.sent_at
    returning push_log.user_id, push_log.login
  )
  select c.user_id, c.token, c.login, c.display_name, c.viewers, c.reason
    from choisis c
    join marque m on m.user_id = c.user_id and m.login = c.login
   order by c.user_id, c.login;
end;
$$;

comment on function public.push_targets() is
  'Choisit les appareils à réveiller pour les directs qui viennent de commencer (épinglé ou carte possédée), marque le journal anti-doublon et renvoie la liste. Réservée au rôle de service.';

-- ------------------------------------------------------------------- les droits
-- Les trois portes du joueur : sa clé anon n'y suffit pas, il faut une session.
revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

revoke all on function public.forget_push_token(text) from public, anon;
grant execute on function public.forget_push_token(text) to authenticated;

revoke all on function public.set_push_live(boolean) from public, anon;
grant execute on function public.set_push_live(boolean) to authenticated;

-- `push_targets()` lit les jetons de **tout le monde** : elle n'est pas pour un
-- joueur, même connecté. Le rôle `service_role` n'existe que sur Supabase (le
-- vérificateur, lui, joue les migrations sur un Postgres nu) : on le teste
-- avant de lui donner le droit.
revoke all on function public.push_targets() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.push_targets() to service_role;
  end if;
end
$$;
