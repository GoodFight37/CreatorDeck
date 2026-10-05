-- CreatorDeck — comptes, sauvegardes cloud, profils publics et classements.
--
-- Modèle : la partie est calculée sur l'appareil (src/lib/game-engine.ts). Le
-- cloud n'est qu'un **miroir** de cette sauvegarde, plus ce qui a besoin de tous
-- les joueurs à la fois (profils publics, classements, échanges plus tard).
--
-- Règles de sécurité (RLS) :
--   * `saves`  : un joueur ne voit et n'écrit que sa ligne ;
--   * `stats`  : lecture par tous les connectés (classement), écriture
--                impossible depuis un client — elle est calculée par le serveur
--                depuis la sauvegarde, donc on ne peut pas mentir sur les
--                chiffres sans publier des cartes ;
--   * `profiles`: vitrine lisible publiquement, modifiable par son propriétaire.
--
-- À exécuter une seule fois, dans l'ordre : ce fichier, puis
-- `0002_vitrine.sql` (cartes épinglées sur le profil public), et
-- `0003_echanges.sql` (échanges entre joueurs) quand ce palier sera fait.

-- --------------------------------------------------------------------------
-- Profils publics
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  display_name   text not null check (char_length(display_name) between 2 and 24),
  -- Vitrine : jusqu'à 4 cartes épinglées (slugs du catalogue).
  showcase_slugs text[] not null default '{}' check (array_length(showcase_slugs, 1) is null or array_length(showcase_slugs, 1) <= 4),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profils lisibles par tous" on public.profiles;
create policy "profils lisibles par tous"
  on public.profiles for select
  using (true);

drop policy if exists "profil modifiable par son propriétaire" on public.profiles;
create policy "profil modifiable par son propriétaire"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profil mis à jour par son propriétaire" on public.profiles;
create policy "profil mis à jour par son propriétaire"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- Sauvegardes
-- --------------------------------------------------------------------------
create table if not exists public.saves (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  state              jsonb not null,
  save_version       integer not null,
  -- Horodatage de l'appareil (Date.now() côté client, en millisecondes) : c'est
  -- lui qui départage deux appareils, pas l'heure d'écriture serveur.
  device_updated_at  bigint not null,
  state_checksum     text not null,
  updated_at         timestamptz not null default now(),
  -- Faux si le serveur a détecté une sauvegarde invraisemblable (structure
  -- cassée, compteurs incohérents) : le joueur reste classé « non vérifié ».
  verified           boolean not null default true
);

alter table public.saves enable row level security;

drop policy if exists "sa sauvegarde, et seulement la sienne" on public.saves;
create policy "sa sauvegarde, et seulement la sienne"
  on public.saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- Statistiques publiques (classement)
-- --------------------------------------------------------------------------
create table if not exists public.stats (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  unique_creators    integer not null default 0,
  total_cards        integer not null default 0,
  legendary_cards    integer not null default 0,
  epic_cards         integer not null default 0,
  level              integer not null default 1,
  points             integer not null default 0,
  verified           boolean not null default true,
  updated_at         timestamptz not null default now()
);

alter table public.stats enable row level security;

drop policy if exists "stats lisibles par les joueurs connectés" on public.stats;
create policy "stats lisibles par les joueurs connectés"
  on public.stats for select
  to authenticated
  using (true);

-- Aucune policy d'écriture : seule la fonction `refresh_stats()` (déclenchée
-- par une écriture dans `saves`) remplit cette table, et elle s'exécute avec
-- les droits du propriétaire de la table.

create index if not exists stats_unique_creators_idx
  on public.stats (unique_creators desc, total_cards desc);

-- --------------------------------------------------------------------------
-- Contrôle de vraisemblance d'une sauvegarde
-- --------------------------------------------------------------------------
-- On ne rejoue pas le moteur côté serveur (ce serait le dupliquer et le laisser
-- diverger), mais on refuse ce qu'aucune partie réelle ne peut produire :
-- une carte sans créateur ni rareté connus, un slug en double, un catalogue
-- plus grand que le jeu, des compteurs négatifs ou délirants.
create or replace function public.save_problems(p_state jsonb)
returns text[]
language plpgsql
immutable
as $$
declare
  problems text[] := '{}';
  cards jsonb;
  card jsonb;
  slugs text[];
  known_rarities text[] := array['common', 'uncommon', 'rare', 'epic', 'legendary'];
  known_variants text[] := array['standard', 'live', 'holo', 'gold'];
  rarities_ok boolean := true;
  variants_ok boolean := true;
  created_counts boolean := true;
begin
  if jsonb_typeof(p_state) <> 'object' then
    return array['sauvegarde : objet JSON attendu'];
  end if;
  if jsonb_typeof(p_state -> 'cards') <> 'array' then
    return array['sauvegarde : liste de cartes attendue'];
  end if;

  cards := p_state -> 'cards';
  if jsonb_array_length(cards) > 20000 then
    problems := problems || 'sauvegarde : trop de cartes (plus de 20 000)';
  end if;

  select array_agg(distinct value ->> 'creatorSlug')
    into slugs
    from jsonb_array_elements(cards);

  if array_length(slugs, 1) > 1000 then
    problems := problems || 'sauvegarde : plus de créateurs que le catalogue';
  end if;

  for card in select value from jsonb_array_elements(cards) loop
    if coalesce(card ->> 'creatorSlug', '') = '' then
      problems := problems || 'carte sans créateur';
      exit;
    end if;
    if not (coalesce(card ->> 'rarity', '') = any (known_rarities)) then
      rarities_ok := false;
    end if;
    if not (coalesce(card ->> 'variant', '') = any (known_variants)) then
      variants_ok := false;
    end if;
  end loop;

  if not rarities_ok then
    problems := problems || 'rareté inconnue dans la collection';
  end if;
  if not variants_ok then
    problems := problems || 'variante inconnue dans la collection';
  end if;

  if coalesce((p_state ->> 'level')::numeric, 1) < 1
     or coalesce((p_state ->> 'points')::numeric, 0) < 0
     or coalesce((p_state ->> 'openings')::numeric, 0) < 0
     or coalesce((p_state ->> 'packs')::numeric, 0) < 0 then
    created_counts := false;
  end if;
  if not created_counts then
    problems := problems || 'compteurs incohérents (niveau, points, ouvertures ou boosters)';
  end if;

  return problems;
exception
  when others then
    return array['sauvegarde illisible'];
end;
$$;

-- --------------------------------------------------------------------------
-- Statistiques recalculées à chaque écriture
-- --------------------------------------------------------------------------
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
  insert into public.stats as s (
    user_id, unique_creators, total_cards, legendary_cards, epic_cards,
    level, points, verified, updated_at
  )
  values (
    new.user_id,
    coalesce((select count(distinct value ->> 'creatorSlug')::int from jsonb_array_elements(cards)), 0),
    jsonb_array_length(cards),
    coalesce((select count(*)::int from jsonb_array_elements(cards) where value ->> 'rarity' = 'legendary'), 0),
    coalesce((select count(*)::int from jsonb_array_elements(cards) where value ->> 'rarity' = 'epic'), 0),
    greatest(1, coalesce((new.state ->> 'level')::int, 1)),
    greatest(0, coalesce((new.state ->> 'points')::int, 0)),
    (array_length(problems, 1) is null),
    now()
  )
  on conflict (user_id) do update set
    unique_creators = excluded.unique_creators,
    total_cards     = excluded.total_cards,
    legendary_cards = excluded.legendary_cards,
    epic_cards      = excluded.epic_cards,
    level           = excluded.level,
    points          = excluded.points,
    verified        = excluded.verified,
    updated_at      = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists saves_refresh_stats on public.saves;
create trigger saves_refresh_stats
  after insert or update of state on public.saves
  for each row execute function public.refresh_stats();

-- --------------------------------------------------------------------------
-- Envoi d'une sauvegarde : le serveur arbitre les conflits
-- --------------------------------------------------------------------------
-- Renvoie { status, save, stats } avec status ∈
--   'pushed'    : la sauvegarde de l'appareil a remplacé celle du cloud ;
--   'conflict'  : le cloud est plus récent, le client doit choisir ;
--   'unchanged' : rien à faire, les deux côtés ont le même contenu ;
--   'rejected'  : sauvegarde invraisemblable (détail dans `problems`).
create or replace function public.push_save(
  p_state             jsonb,
  p_save_version      integer,
  p_device_updated_at bigint,
  p_force             boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing public.saves;
  problems text[];
  checksum text := md5(p_state::text);
  payload jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'rejected', 'problems', jsonb_build_array('authentification requise'));
  end if;

  problems := public.save_problems(p_state);
  if array_length(problems, 1) is not null then
    return jsonb_build_object('status', 'rejected', 'problems', to_jsonb(problems));
  end if;

  select * into existing from public.saves where user_id = auth.uid();

  if existing.user_id is not null then
    if existing.state_checksum = checksum then
      return jsonb_build_object('status', 'unchanged', 'save', to_jsonb(existing));
    end if;
    if not p_force and existing.device_updated_at > p_device_updated_at then
      -- Une autre partie plus récente existe déjà : on ne l'écrase pas en
      -- silence, c'est le client qui tranchera.
      return jsonb_build_object('status', 'conflict', 'save', to_jsonb(existing));
    end if;
  end if;

  insert into public.saves as s (user_id, state, save_version, device_updated_at, state_checksum, updated_at)
  values (auth.uid(), p_state, p_save_version, p_device_updated_at, checksum, now())
  on conflict (user_id) do update set
    state             = excluded.state,
    save_version      = excluded.save_version,
    device_updated_at = excluded.device_updated_at,
    state_checksum    = excluded.state_checksum,
    updated_at        = excluded.updated_at
  returning * into existing;

  select to_jsonb(s.*) into payload from public.stats s where s.user_id = auth.uid();

  return jsonb_build_object('status', 'pushed', 'save', to_jsonb(existing), 'stats', payload);
end;
$$;

-- --------------------------------------------------------------------------
-- Lecture de la sauvegarde cloud
-- --------------------------------------------------------------------------
create or replace function public.pull_save()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select to_jsonb(s.*) from public.saves s where s.user_id = auth.uid();
$$;

-- --------------------------------------------------------------------------
-- Classement
-- --------------------------------------------------------------------------
-- `p_metric` ∈ 'unique_creators' | 'total_cards' | 'legendary_cards'.
-- Seuls les joueurs vérifiés sont classés : sans ça, une sauvegarde trafiquée
-- prendrait la première place.
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
  level           integer,
  points          integer,
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
           else s.unique_creators end desc,
      s.total_cards desc,
      s.updated_at asc))::int as rank,
    s.user_id,
    coalesce(p.display_name, 'Collectionneur') as display_name,
    s.unique_creators,
    s.total_cards,
    s.legendary_cards,
    s.level,
    s.points,
    coalesce(p.showcase_slugs, '{}') as showcase_slugs
  from public.stats s
  left join public.profiles p on p.user_id = s.user_id
  where s.verified
  order by rank
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

-- --------------------------------------------------------------------------
-- Profil par défaut
-- --------------------------------------------------------------------------
-- Créé à la première écriture de sauvegarde pour que le classement ait un nom
-- à afficher, même si le joueur n'a jamais ouvert l'écran de profil.
create or replace function public.ensure_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.user_id, 'Collectionneur #' || left(replace(new.user_id::text, '-', ''), 4))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists saves_ensure_profile on public.saves;
create trigger saves_ensure_profile
  after insert on public.saves
  for each row execute function public.ensure_profile();
