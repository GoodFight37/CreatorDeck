-- CreatorDeck — la wishlist : le créateur que tu cherches, épinglé en public.
--
-- À exécuter après `0014_scene_pack.sql`.
--
-- Le principe est celui d'une liste de souhaits de collectionneur, réduite à
-- l'essentiel : **un** créateur, celui qui manque le plus. Il n'est pas exposé
-- pour soi — on sait déjà ce qu'on cherche — mais pour les autres : la fiche
-- publique d'un joueur dit « cherche Kameto », ce qui donne un sujet de
-- conversation et une raison d'aller voir son profil.
--
-- Deux choix qui méritent d'être écrits :
--
--   * **Aucune possession exigée.** La wishlist sert justement à réclamer un
--     créateur qu'on n'a pas encore. Le serveur vérifie seulement que le slug
--     existe au catalogue ; il ne regarde pas la collection. C'est l'inverse de
--     la vitrine (`set_showcase`), qui exige la possession.
--   * **Une seule ligne par joueur** (`user_id` en clé primaire) : épingler un
--     second créateur remplace le premier. Pas de tableau, pas de plafond à
--     vérifier, pas de « 4 créateurs » dans l'interface — un seul nom, lisible
--     d'un coup d'œil.
--
-- Écriture réservée aux fonctions : les clients n'ont plus le droit d'écrire
-- dans la table (revoke), même dans leur propre ligne. Un slug doit exister au
-- catalogue, et une contrainte de clé étrangère ne suffit pas à empêcher un
-- client d'écrire un slug périmé en PATCHant directement.
--
-- Rejouable : `create table if not exists`, `create or replace`, `revoke` et
-- `grant` idempotents.

-- --------------------------------------------------------------------------
-- La table : une ligne par joueur
-- --------------------------------------------------------------------------
create table if not exists public.wishlist (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- Le créateur souhaité (slug du catalogue). `on delete cascade` : si un
  -- créateur disparaît d'une régénération de catalogue, l'épinglé tombe avec
  -- lui au lieu de bloquer la suppression.
  slug       text not null references public.creators (slug) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wishlist enable row level security;

-- Lecture : publique, comme les profils. C'est le but de la chose — le nom du
-- créateur recherché s'affiche sur la fiche que les autres voient.
drop policy if exists "wishlist lisible par tous" on public.wishlist;
create policy "wishlist lisible par tous"
  on public.wishlist for select
  using (true);

-- Écriture : le propriétaire, et seulement par les fonctions ci-dessous (les
-- privilèges d'écriture sont retirés juste après).
drop policy if exists "wishlist écrite par son propriétaire" on public.wishlist;
create policy "wishlist écrite par son propriétaire"
  on public.wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke insert, update, delete on public.wishlist from anon, authenticated;

-- --------------------------------------------------------------------------
-- Lire l'épinglé (le sien, ou celui d'un autre joueur)
-- --------------------------------------------------------------------------
-- `p_user_id` à `null` : le sien. Un joueur n'a rien à cacher ici — la ligne
-- est publique par construction — donc la fonction ne restreint que ce qui
-- existe, pas qui peut regarder.
create or replace function public.wishlist_slug(p_user_id uuid default null)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select w.slug
  from public.wishlist w
  where w.user_id = coalesce(p_user_id, auth.uid());
$$;

-- --------------------------------------------------------------------------
-- Épingler, ou retirer
-- --------------------------------------------------------------------------
create or replace function public.set_wishlist(p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_slug text;
begin
  if v_user is null then
    raise exception 'wishlist : connecte-toi pour épingler un créateur'
      using errcode = 'P0001';
  end if;

  select c.slug
    into v_slug
    from public.creators c
   where c.slug = nullif(btrim(coalesce(p_slug, '')), '');

  if v_slug is null then
    raise exception 'wishlist : ce créateur n''est pas au catalogue'
      using errcode = 'P0001';
  end if;

  insert into public.wishlist (user_id, slug)
  values (v_user, v_slug)
  on conflict (user_id) do update
    set slug = excluded.slug,
        updated_at = now();

  return v_slug;
end;
$$;

create or replace function public.clear_wishlist()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'wishlist : connecte-toi pour retirer ton épinglé'
      using errcode = 'P0001';
  end if;

  delete from public.wishlist where user_id = v_user;
end;
$$;

-- --------------------------------------------------------------------------
-- Le profil public montre l'épinglé
-- --------------------------------------------------------------------------
-- Redéfinition complète de `player_profile` (0006) : la version d'origine ne
-- connaissait pas la wishlist. Une seule ligne change — le `left join` et le
-- champ `wishlist_slug` — le reste est recopié à l'identique.
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
      coalesce(p.showcase_slugs, '{}') as showcase_slugs,
      (select w.slug from public.wishlist w where w.user_id = s.user_id) as wishlist_slug
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
  ),
  family_totals as (
    -- Une famille = une région du catalogue. Un créateur sans région (catalogue
    -- pas encore régénéré) tombe dans la fourre-tout `S10`, comme à l'écran :
    -- jamais de ligne sans nom, jamais de total qui ne s'additionne pas.
    select coalesce(c.region, 'S10') as region_id, count(*)::int as total
    from public.creators c
    group by 1
  ),
  family_owned as (
    select coalesce(c.region, 'S10') as region_id, count(distinct uc.creator_slug)::int as owned
    from public.user_cards uc
    join public.creators c on c.slug = uc.creator_slug
    where uc.user_id = coalesce(p_user_id, auth.uid())
    group by 1
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
    'rank_completion', case when t.verified then
      (select count(*)::int + 1 from public.stats o
        where o.verified and o.unique_creators > t.unique_creators) end,
    'rank_cards', case when t.verified then
      (select count(*)::int + 1 from public.stats o
        where o.verified and o.total_cards > t.total_cards) end,
    'showcase_slugs', t.showcase_slugs,
    -- Le créateur que ce joueur cherche. Visible par tous : c'est une demande,
    -- pas un secret.
    'wishlist_slug', t.wishlist_slug,
    'by_rarity', coalesce((
      select jsonb_object_agg(rt.rarity, jsonb_build_object(
        'owned', coalesce(o.owned, 0),
        'total', rt.total
      ))
      from rarity_totals rt
      left join owned o on o.rarity = rt.rarity
    ), '{}'::jsonb),
    'by_region', coalesce((
      select jsonb_object_agg(ft.region_id, jsonb_build_object(
        'owned', coalesce(fo.owned, 0),
        'total', ft.total
      ))
      from family_totals ft
      left join family_owned fo on fo.region_id = ft.region_id
    ), '{}'::jsonb)
  )
  from target t;
$$;

-- --------------------------------------------------------------------------
-- Droits
-- --------------------------------------------------------------------------
revoke all on function public.wishlist_slug(uuid) from public, anon;
grant execute on function public.wishlist_slug(uuid) to authenticated;

revoke all on function public.set_wishlist(text) from public, anon;
grant execute on function public.set_wishlist(text) to authenticated;

revoke all on function public.clear_wishlist() from public, anon;
grant execute on function public.clear_wishlist() to authenticated;
