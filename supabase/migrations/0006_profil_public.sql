-- CreatorDeck — profils publics et classements enrichis.
--
-- Objectif : qu'un joueur puisse regarder le profil d'un autre (vitrine,
-- complétion du catalogue, qualité de la collection) et que le classement dise
-- autre chose que « qui a le plus de cartes », tout cela sans jamais exposer la
-- sauvegarde d'un joueur.
--
-- ## Pourquoi une table `user_cards`
--
-- La sauvegarde reste un JSON (`saves.state`) : c'est elle qui porte la partie,
-- elle est arbitrée par `push_save()` et le moteur du jeu la connaît. Mais un
-- JSON ne s'indexe pas : répondre à « combien de Gold possède ce joueur ? » ou
-- « qui possède la carte de ce créateur ? » demanderait d'ouvrir *toutes* les
-- sauvegardes à chaque requête.
--
-- `user_cards` est donc une **projection**, recalculée par le serveur à chaque
-- écriture de sauvegarde — pas une seconde source de vérité. Si la table et la
-- sauvegarde divergent, c'est la sauvegarde qui a raison, et le trigger remet la
-- table d'aplomb à la prochaine écriture. Le jour où un marché entre joueurs
-- arrivera, c'est cette table qui portera les requêtes.
--
-- ## Règles de sécurité
--
--   * `user_cards` : RLS active **sans aucune politique** → aucun client ne la
--     lit ni ne l'écrit. Seules les fonctions du serveur la consultent ;
--   * `player_profile()` est `security definer` (elle a besoin de lire
--     `user_cards`) mais ne renvoie que des compteurs et les slugs de vitrine
--     déjà publics — jamais la liste des cartes d'un joueur ;
--   * `leaderboard()` ne montre toujours que les joueurs `verified`, et
--     `player_profile()` renvoie le profil même non vérifié (le joueur doit
--     pouvoir voir sa propre fiche), avec un rang `null` dans ce cas.
--
-- Rejouable : `add column if not exists`, `create ... if not exists`,
-- `create or replace`, `drop function if exists` avant les changements de
-- signature, `grant`/`revoke` idempotents.

-- --------------------------------------------------------------------------
-- 1. Deux compteurs de plus dans les statistiques publiques
-- --------------------------------------------------------------------------
-- `gold_cards` et `holo_cards` comptent les **variantes**, pas les raretés :
-- une carte peut être Légendaire en Standard ou en Gold. Les deux intéressent
-- le classement : le Gold ne s'obtient que sur une Légendaire, le Holo est la
-- variante rare des cartes communes.
alter table public.stats add column if not exists gold_cards integer not null default 0;
alter table public.stats add column if not exists holo_cards integer not null default 0;

create index if not exists stats_gold_idx on public.stats (gold_cards desc, legendary_cards desc);

-- --------------------------------------------------------------------------
-- 2. Projection des cartes possédées
-- --------------------------------------------------------------------------
create table if not exists public.user_cards (
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- Identifiant de la carte dans la sauvegarde (`cards[].id`). Sert de clé :
  -- une même sauvegarde ne peut pas compter deux fois la même carte.
  card_id      text not null,
  creator_slug text not null,
  rarity       text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  variant      text not null default 'standard',
  primary key (user_id, card_id)
);

create index if not exists user_cards_creator_idx on public.user_cards (creator_slug);
create index if not exists user_cards_rarity_idx on public.user_cards (user_id, rarity);

alter table public.user_cards enable row level security;

-- Aucune politique, volontairement : ni lecture, ni écriture côté client. La
-- table ne sert qu'aux fonctions du serveur (`player_profile()` aujourd'hui,
-- les requêtes de marché demain). Les clients y accèdent par ces fonctions.
revoke all on table public.user_cards from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. La projection suit chaque écriture de sauvegarde
-- --------------------------------------------------------------------------
-- `security definer` : la fonction écrit dans une table que les clients n'ont
-- pas le droit de toucher. C'est le seul chemin d'écriture de `user_cards`.
create or replace function public.project_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cards jsonb := coalesce(new.state -> 'cards', '[]'::jsonb);
begin
  delete from public.user_cards where user_id = new.user_id;

  insert into public.user_cards (user_id, card_id, creator_slug, rarity, variant)
  select
    new.user_id,
    -- Une carte d'une sauvegarde très ancienne peut ne pas avoir d'identifiant :
    -- on en fabrique un à partir du créateur et de sa position, plutôt que de
    -- perdre la carte.
    coalesce(nullif(card ->> 'id', ''), (card ->> 'creatorSlug') || '#' || position::text),
    lower(card ->> 'creatorSlug'),
    card ->> 'rarity',
    coalesce(nullif(card ->> 'variant', ''), 'standard')
  from jsonb_array_elements(cards) with ordinality as entry(card, position)
  where coalesce(card ->> 'creatorSlug', '') <> ''
    and card ->> 'rarity' in ('common', 'uncommon', 'rare', 'epic', 'legendary')
    -- Le catalogue fait foi : un créateur qui n'y est pas (slug inventé) n'entre
    -- pas dans la projection. Sinon une sauvegarde bricolée se fabriquerait une
    -- complétion avec 900 créateurs qui n'existent pas.
    and exists (select 1 from public.creators c where c.slug = lower(card ->> 'creatorSlug'))
  on conflict (user_id, card_id) do nothing;

  return null;
end;
$$;

drop trigger if exists saves_project_cards on public.saves;
create trigger saves_project_cards
  after insert or update of state on public.saves
  for each row execute function public.project_cards();

-- --------------------------------------------------------------------------
-- 4. Statistiques recalculées : mêmes chiffres, deux variantes de plus
-- --------------------------------------------------------------------------
-- Seul ajout par rapport à la version de `0001_comptes_cloud.sql` : les
-- compteurs `gold_cards` et `holo_cards`. Le contrôle de vraisemblance
-- (`save_problems()`) reste la seule autorité sur `verified`.
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
    where exists (select 1 from public.creators c where c.slug = lower(value ->> 'creatorSlug'))
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

-- Les joueurs déjà en ligne ont `gold_cards` et `holo_cards` à zéro, et leur
-- `user_cards` n'existe pas encore : on rejoue les triggers sur chaque
-- sauvegarde. C'est le trigger qui recalcule (jamais la migration elle-même),
-- pour qu'il n'y ait qu'un seul chemin de calcul.
update public.saves set state = state;

-- --------------------------------------------------------------------------
-- 5. Le profil public, en un appel
-- --------------------------------------------------------------------------
-- Tout ce qu'affiche la fiche d'un joueur : identité, chiffres publics,
-- complétion du catalogue, rangs, vitrine, et la répartition des créateurs
-- possédés par rareté (« 12 / 50 légendaires ») — le détail qui donne envie de
-- compléter. Aucune carte n'est nommée, aucun slug de carte ne sort d'ici :
-- seulement des compteurs et les quatre cartes que le joueur a lui-même
-- épinglées.
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
      coalesce(p.showcase_slugs, '{}') as showcase_slugs
    from public.stats s
    left join public.profiles p on p.user_id = s.user_id
    where s.user_id = coalesce(p_user_id, auth.uid())
  ),
  catalogue as (
    select greatest(count(*), 1)::numeric as size from public.creators
  ),
  rarity_totals as (
    select c.rarity, count(*)::int as total
    from public.creators c
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
    -- Rang « nombre de joueurs devant toi », sur les seuls joueurs vérifiés :
    -- un joueur non vérifié n'est pas classé, donc pas de rang.
    'rank_completion', case when t.verified then
      (select count(*)::int + 1 from public.stats o
        where o.verified and o.unique_creators > t.unique_creators) end,
    'rank_cards', case when t.verified then
      (select count(*)::int + 1 from public.stats o
        where o.verified and o.total_cards > t.total_cards) end,
    'showcase_slugs', t.showcase_slugs,
    -- « 12 / 50 légendaires » : ce que le joueur possède, sur ce que le
    -- catalogue contient. Les deux viennent du serveur, le client ne calcule
    -- rien — la vitrine reste la seule chose qu'un joueur choisit.
    'by_rarity', coalesce((
      select jsonb_object_agg(rt.rarity, jsonb_build_object(
        'owned', coalesce(o.owned, 0),
        'total', rt.total
      ))
      from rarity_totals rt
      left join owned o on o.rarity = rt.rarity
    ), '{}'::jsonb)
  )
  from target t;
$$;

-- --------------------------------------------------------------------------
-- 6. Classement : variantes et complétion
-- --------------------------------------------------------------------------
-- La fonction change de signature de retour (impossible avec `create or
-- replace`) : on la supprime puis on la recrée, et on redonne les droits.
-- Quatre tris : cartes uniques, cartes, légendaires, Gold.
drop function if exists public.leaderboard(integer, text);

create or replace function public.leaderboard(
  p_limit  integer default 20,
  p_metric text default 'unique_creators'
)
returns table (
  rank            integer,
  user_id         uuid,
  display_name    text,
  unique_creators integer,
  total_cards     integer,
  legendary_cards integer,
  epic_cards      integer,
  gold_cards      integer,
  holo_cards      integer,
  level           integer,
  points          integer,
  completion      numeric,
  showcase_slugs  text[]
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    (row_number() over (order by
      case when p_metric = 'total_cards' then s.total_cards
           when p_metric = 'legendary_cards' then s.legendary_cards
           when p_metric = 'gold_cards' then s.gold_cards
           else s.unique_creators end desc,
      s.total_cards desc,
      s.updated_at asc))::int as rank,
    s.user_id,
    coalesce(p.display_name, 'Collectionneur') as display_name,
    s.unique_creators,
    s.total_cards,
    s.legendary_cards,
    s.epic_cards,
    s.gold_cards,
    s.holo_cards,
    s.level,
    s.points,
    round(s.unique_creators::numeric / greatest((select count(*) from public.creators), 1), 4) as completion,
    coalesce(p.showcase_slugs, '{}') as showcase_slugs
  from public.stats s
  left join public.profiles p on p.user_id = s.user_id
  where s.verified
  order by rank
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

-- --------------------------------------------------------------------------
-- 7. Droits
-- --------------------------------------------------------------------------
-- Le classement est lisible par les joueurs connectés ; le profil public d'un
-- autre joueur aussi (c'est le principe). Rien n'est ouvert aux visiteurs non
-- connectés : ce jeu se joue connecté, et `anon` n'a aucune raison de lire les
-- statistiques des joueurs.
revoke all on function public.player_profile(uuid) from public, anon;
grant execute on function public.player_profile(uuid) to authenticated;

revoke all on function public.leaderboard(integer, text) from public, anon;
grant execute on function public.leaderboard(integer, text) to authenticated;

-- Fonction interne : uniquement appelée par le trigger, jamais depuis un client.
revoke all on function public.project_cards() from public, anon, authenticated;
