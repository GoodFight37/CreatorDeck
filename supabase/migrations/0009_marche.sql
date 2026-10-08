-- CreatorDeck — l'hôtel des ventes.
--
-- Neuvième migration du cloud, à exécuter **après** `0008_friends.sql`.
--
-- ## Le principe : l'hôtel achète comptant, les joueurs se servent au comptoir
--
-- Un joueur dépose un **doublon** : l'hôtel le lui paie tout de suite, en
-- points, et met la carte au comptoir. Un autre joueur l'achète au prix de
-- l'étiquette. Le vendeur n'attend personne, l'acheteur ne dépend d'aucune
-- disponibilité : il n'y a jamais deux joueurs en ligne au même moment.
--
-- Ce choix règle trois problèmes d'un coup :
--
--   * **anti-duplication** : la carte quitte la collection au dépôt, donc elle
--     ne peut pas être vendue deux fois — et l'acheteur la reçoit d'une seule
--     transaction ;
--   * **pas d'argent fantôme** : le vendeur est payé par le serveur dans
--     l'appel qu'il fait lui-même, pas plus tard par un acheteur qui
--     n'existerait pas ;
--   * **pas de prix à négocier** : les prix sont ceux de l'hôtel (voir
--     `market_payout`), donc pas de marché gris où l'on s'échange des points
--     entre comptes.
--
-- ## Les prix
--
-- Deux montants, volontairement séparés :
--
--   * `payout` — ce que l'hôtel paie au vendeur. La grille suit la rareté et la
--     variante : `market_payout()` la calcule, et `src/lib/market.ts` en donne
--     la même grille côté écran (l'affichage ne peut pas faire un aller-retour
--     réseau par carte) ;
--   * `price` — ce que l'acheteur paie, soit une fois et demie le `payout`
--     (`market_price()`). L'écart est la marge de l'hôtel : c'est ce qui évite
--     qu'un joueur vende et rachète la même carte en boucle sans rien perdre.
--
-- Le prix de vente est toujours **supérieur** au recyclage de l'Atelier
-- (`RARITY_META.recycleValue`) : vendre doit rapporter plus que détruire,
-- sinon l'hôtel ne sert à rien.
--
-- ## Ce qui est refusé
--
--   * vendre sa **dernière copie** d'un couple créateur + variante : la
--     collection ne doit jamais rétrécir par accident (même règle que le
--     recyclage, côté moteur) ;
--   * acheter sa propre annonce ;
--   * acheter sans avoir les points, ou sans avoir envoyé sa collection ;
--   * acheter une annonce périmée : **trente jours** après le dépôt, elle
--     quitte le comptoir. Le vendeur a déjà été payé, personne ne perd rien.
--
-- Rejouable : `create table if not exists`, `create or replace function`,
-- `drop function if exists` avant tout changement de signature,
-- `grant`/`revoke` idempotents.
--
-- Contraintes : la table n'a **aucune politique** et ses droits sont révoqués —
-- un client ne la lit ni ne l'écrit jamais directement. Tout passe par les
-- fonctions `security definer` ci-dessous, qui vérifient avant de modifier.

-- --------------------------------------------------------------------------
-- Table des dépôts
-- --------------------------------------------------------------------------
-- `status` : 'open' (au comptoir) ou 'sold' (vendu). Il n'y a ni 'cancelled' ni
-- 'expired' : le vendeur a été payé au dépôt, donc une annonce ne se reprend
-- pas — elle traîne au comptoir jusqu'à ce que quelqu'un l'achète, ou jusqu'à
-- ce que les trente jours soient passés.
create table if not exists public.market_listings (
  id           bigserial primary key,
  seller_id    uuid not null references auth.users (id) on delete cascade,
  buyer_id     uuid references auth.users (id) on delete set null,
  -- L'identifiant de la carte dans la sauvegarde du vendeur : c'est cette
  -- carte-là qui est sortie de sa collection, pas « une carte au hasard ».
  card_id      text not null,
  creator_slug text not null,
  rarity       text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  variant      text not null check (variant in ('standard', 'live', 'holo', 'gold')),
  -- Ce que l'hôtel a payé au vendeur, et ce que l'acheteur paiera.
  payout       integer not null check (payout > 0),
  price        integer not null check (price > 0),
  status       text not null default 'open' check (status in ('open', 'sold')),
  created_at   timestamptz not null default now(),
  sold_at      timestamptz
);

create index if not exists market_shelf_idx
  on public.market_listings (created_at desc)
  where status = 'open';
create index if not exists market_seller_idx
  on public.market_listings (seller_id, created_at desc);

alter table public.market_listings enable row level security;
-- Aucune politique : le comptoir se lit par `market_shelf()`, jamais en direct.

revoke all on table public.market_listings from public, anon, authenticated;
revoke all on sequence public.market_listings_id_seq from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- La grille des prix
-- --------------------------------------------------------------------------
-- `market_payout` : ce que l'hôtel paie pour une carte.
--
-- Les montants suivent l'échelle du jeu (recyclage : 12 / 22 / 55 / 150 / 250 ;
-- artisanat : 45 à 600) en payant environ une fois et demie le recyclage, pour
-- que le comptoir soit toujours préférable au recyclage.
--
-- La même grille vit dans `src/lib/market.ts` (tableau `PAYOUTS`) : l'écran
-- affiche le prix **avant** le dépôt, sans appel réseau. Les deux sont
-- vérifiées — `scripts/verify-supabase-migrations.mjs` contrôle les valeurs
-- d'ici, `src/lib/market.test.ts` celles de là-bas. Modifier l'une sans
-- l'autre fait échouer les tests.
create or replace function public.market_payout(p_rarity text, p_variant text)
returns integer
language sql
immutable
as $$
  select case p_rarity
           when 'common' then 20
           when 'uncommon' then 40
           when 'rare' then 100
           when 'epic' then 250
           when 'legendary' then 400
         end
       * case p_variant
           when 'standard' then 1
           when 'live' then 2
           when 'holo' then 3
           when 'gold' then 5
         end;
$$;

-- `market_price` : ce que l'acheteur paie, c'est-à-dire le payout majoré d'une
-- fois et demie. Arrondi au supérieur, en arithmétique entière.
create or replace function public.market_price(p_payout integer)
returns integer
language sql
immutable
as $$
  select (p_payout * 3 + 1) / 2;
$$;

-- --------------------------------------------------------------------------
-- Déposer une carte (le vendeur est payé tout de suite)
-- --------------------------------------------------------------------------
-- Renvoie `{listing, payout, price, points, card}`.
--
-- `points` est le nouveau solde : le client applique le même changement à sa
-- partie locale (retrait de la carte, crédit des points) puis la pousse, comme
-- pour un échange accepté. Le serveur, lui, a déjà écrit — c'est lui qui fait
-- foi si les deux divergent.
create or replace function public.market_sell(p_card_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_now_ms bigint;
  v_save public.saves;
  v_state jsonb;
  v_cards jsonb;
  v_card jsonb;
  v_index integer;
  v_rarity text;
  v_variant text;
  v_payout integer;
  v_price integer;
  v_points integer;
  v_listing public.market_listings;
  v_problems text[];
begin
  if v_user_id is null then
    raise exception 'hotel : connecte-toi pour déposer une carte' using errcode = 'P0001';
  end if;
  if coalesce(p_card_id, '') = '' then
    raise exception 'hotel : carte inconnue' using errcode = 'P0001';
  end if;

  select * into v_save from public.saves s where s.user_id = v_user_id for update;
  if v_save.user_id is null then
    raise exception 'hotel : envoie d''abord ta collection au cloud' using errcode = 'P0001';
  end if;

  v_state := v_save.state;
  v_cards := v_state -> 'cards';

  -- La carte, par son identifiant : on retire **la sienne**, pas « une carte
  -- qui y ressemble ». `ordinality` sert à retrouver sa position exacte dans le
  -- tableau (et à n'en retirer qu'une seule si deux identifiants identiques
  -- traînaient, ce que le client ne produit pas mais qu'on ne veut pas subir).
  select value, ord - 1 into v_card, v_index
    from (
      select value, ordinality as ord
        from jsonb_array_elements(v_cards) with ordinality
       where value ->> 'id' = p_card_id
       limit 1
    ) t;

  if v_card is null then
    raise exception 'hotel : cette carte n''est plus dans ta collection' using errcode = 'P0001';
  end if;

  -- Jamais la dernière copie d'un couple créateur + variante : c'est la même
  -- règle que le recyclage côté moteur, et elle protège la complétion.
  if (
    select count(*) from jsonb_array_elements(v_cards)
     where value ->> 'creatorSlug' = v_card ->> 'creatorSlug'
       and value ->> 'variant' = v_card ->> 'variant'
  ) < 2 then
    raise exception 'hotel : c''est ta seule copie de cette carte' using errcode = 'P0001';
  end if;

  v_variant := v_card ->> 'variant';
  if not (v_variant = any (array['standard', 'live', 'holo', 'gold'])) then
    raise exception 'hotel : variante inconnue' using errcode = 'P0001';
  end if;

  -- La rareté vient du **catalogue**, jamais de la carte : une sauvegarde
  -- bricolée ne peut pas se vendre au prix d'une légendaire.
  select c.rarity into v_rarity from public.creators c where c.slug = v_card ->> 'creatorSlug';
  if v_rarity is null then
    raise exception 'hotel : ce créateur n''est pas au catalogue' using errcode = 'P0001';
  end if;

  v_payout := public.market_payout(v_rarity, v_variant);
  v_price := public.market_price(v_payout);
  v_now_ms := (extract(epoch from v_now) * 1000)::bigint;
  v_points := coalesce((v_state ->> 'points')::integer, 0) + v_payout;

  v_state := jsonb_set(v_state, '{cards}', v_cards - v_index, true);
  v_state := jsonb_set(v_state, '{points}', to_jsonb(v_points), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(v_now_ms), true);

  v_problems := public.save_problems(v_state);
  if array_length(v_problems, 1) is not null then
    raise exception 'hotel : collection refusée par le serveur (%)', array_to_string(v_problems, ', ')
      using errcode = 'P0001';
  end if;

  insert into public.market_listings
    (seller_id, card_id, creator_slug, rarity, variant, payout, price)
  values
    (v_user_id, p_card_id, v_card ->> 'creatorSlug', v_rarity, v_variant, v_payout, v_price)
  returning * into v_listing;

  update public.saves
     set state = v_state,
         state_checksum = md5(v_state::text),
         device_updated_at = v_now_ms,
         updated_at = v_now
   where user_id = v_user_id;

  -- Une carte épinglée qui part à l'hôtel quitte la vitrine publique.
  perform public._trade_clean_showcase(v_user_id, v_state);

  return jsonb_build_object(
    'listing', jsonb_build_object(
      'id', v_listing.id,
      'creatorSlug', v_listing.creator_slug,
      'rarity', v_listing.rarity,
      'variant', v_listing.variant,
      'payout', v_listing.payout,
      'price', v_listing.price
    ),
    'payout', v_payout,
    'price', v_price,
    'points', v_points,
    'cardId', p_card_id
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Acheter une carte du comptoir
-- --------------------------------------------------------------------------
-- Renvoie `{card, price, points, listing}`. `card` est exactement la carte à
-- ajouter côté client (`fromMarket` porte le numéro de l'annonce : c'est ce qui
-- rend l'opération rejouable sans dupliquer la carte).
create or replace function public.market_buy(p_listing bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_now_ms bigint;
  v_listing public.market_listings;
  v_save public.saves;
  v_state jsonb;
  v_points integer;
  v_card jsonb;
  v_problems text[];
begin
  if v_user_id is null then
    raise exception 'hotel : connecte-toi pour acheter' using errcode = 'P0001';
  end if;

  -- Verrou sur l'annonce : deux acheteurs simultanés ne peuvent pas l'emporter
  -- tous les deux — le second trouve `status = 'sold'` et repart bredouille.
  select * into v_listing from public.market_listings l where l.id = p_listing for update;
  if v_listing.id is null then
    raise exception 'hotel : cette annonce n''existe plus' using errcode = 'P0001';
  end if;
  if v_listing.status <> 'open' then
    raise exception 'hotel : cette carte a déjà été achetée' using errcode = 'P0001';
  end if;
  if v_listing.seller_id = v_user_id then
    raise exception 'hotel : c''est ta propre annonce' using errcode = 'P0001';
  end if;
  if v_listing.created_at < v_now - interval '30 days' then
    raise exception 'hotel : cette annonce a quitté le comptoir' using errcode = 'P0001';
  end if;

  select * into v_save from public.saves s where s.user_id = v_user_id for update;
  if v_save.user_id is null then
    raise exception 'hotel : envoie d''abord ta collection au cloud' using errcode = 'P0001';
  end if;

  v_state := v_save.state;
  v_points := coalesce((v_state ->> 'points')::integer, 0);
  if v_points < v_listing.price then
    raise exception 'hotel : il te manque % points', v_listing.price - v_points using errcode = 'P0001';
  end if;

  v_now_ms := (extract(epoch from v_now) * 1000)::bigint;

  v_card := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'creatorSlug', v_listing.creator_slug,
    'rarity', v_listing.rarity,
    'variant', v_listing.variant,
    'obtainedAt', v_now_ms,
    -- Un achat n'est pas un « Perfect » : il ne doit pas gonfler les
    -- statistiques de chance du joueur.
    'rareDrop', false,
    'fromMarket', v_listing.id
  );

  v_state := jsonb_set(v_state, '{cards}', (v_state -> 'cards') || v_card, true);
  v_state := jsonb_set(v_state, '{points}', to_jsonb(v_points - v_listing.price), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(v_now_ms), true);

  v_problems := public.save_problems(v_state);
  if array_length(v_problems, 1) is not null then
    raise exception 'hotel : collection refusée par le serveur (%)', array_to_string(v_problems, ', ')
      using errcode = 'P0001';
  end if;

  update public.saves
     set state = v_state,
         state_checksum = md5(v_state::text),
         device_updated_at = v_now_ms,
         updated_at = v_now
   where user_id = v_user_id;

  update public.market_listings
     set status = 'sold', buyer_id = v_user_id, sold_at = v_now
   where id = v_listing.id
  returning * into v_listing;

  return jsonb_build_object(
    'card', v_card,
    'price', v_listing.price,
    'points', v_points - v_listing.price,
    'listing', jsonb_build_object(
      'id', v_listing.id,
      'creatorSlug', v_listing.creator_slug,
      'rarity', v_listing.rarity,
      'variant', v_listing.variant,
      'payout', v_listing.payout,
      'price', v_listing.price
    )
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Le comptoir
-- --------------------------------------------------------------------------
-- Les annonces ouvertes, les plus récentes d'abord, sans les siennes (on ne
-- peut pas acheter ce qu'on vient de déposer) et sans les périmées. Le nom du
-- vendeur est joint pour que le comptoir ait un visage.
create or replace function public.market_shelf(p_limit integer default 30)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(row order by row -> 'createdAt' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', l.id,
             'creatorSlug', l.creator_slug,
             'rarity', l.rarity,
             'variant', l.variant,
             'price', l.price,
             'payout', l.payout,
             'createdAt', l.created_at,
             'sellerName', coalesce(p.display_name, 'Collectionneur')
           ) as row
    from public.market_listings l
    left join public.profiles p on p.user_id = l.seller_id
    where l.status = 'open'
      and l.created_at >= now() - interval '30 days'
      and (auth.uid() is null or l.seller_id <> auth.uid())
    order by l.created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) t;
$$;

-- --------------------------------------------------------------------------
-- La vitrine d'un joueur
-- --------------------------------------------------------------------------
-- « Qu'est-ce que ce joueur a en vente en ce moment ? » : les annonces ouvertes
-- et non périmées, les plus récentes d'abord. Sert à la fiche publique, où la
-- section « En vente » donne un sens au mot « hôtel » : on voit ce que les
-- autres ont déposé, sans jamais voir leur collection.
--
-- Sans argument, la vitrine du joueur connecté.
create or replace function public.market_listings_of(p_user uuid default null)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(row order by row -> 'createdAt' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', l.id,
             'creatorSlug', l.creator_slug,
             'rarity', l.rarity,
             'variant', l.variant,
             'price', l.price,
             'payout', l.payout,
             'createdAt', l.created_at,
             'sellerName', coalesce(p.display_name, 'Collectionneur')
           ) as row
    from public.market_listings l
    left join public.profiles p on p.user_id = l.seller_id
    where l.seller_id = coalesce(p_user, auth.uid())
      and l.status = 'open'
      and l.created_at >= now() - interval '30 days'
    order by l.created_at desc
    limit 50
  ) t;
$$;

-- --------------------------------------------------------------------------
-- Droits
-- --------------------------------------------------------------------------
-- Les trois fonctions ne sont ouvertes qu'aux joueurs connectés : un visiteur
-- sans compte n'a rien à faire au comptoir (et la tablette n'a aucun droit,
-- elle n'est lue que par ces fonctions).
revoke all on function public.market_sell(text) from public, anon;
grant execute on function public.market_sell(text) to authenticated;

revoke all on function public.market_buy(bigint) from public, anon;
grant execute on function public.market_buy(bigint) to authenticated;

revoke all on function public.market_shelf(integer) from public, anon;
grant execute on function public.market_shelf(integer) to authenticated;

-- Les deux grilles de prix sont pures : les exposer ne révèle rien et permet de
-- recouper l'affichage avec le serveur.
revoke all on function public.market_payout(text, text) from public, anon;
grant execute on function public.market_payout(text, text) to authenticated;

revoke all on function public.market_price(integer) from public, anon;
grant execute on function public.market_price(integer) to authenticated;

-- La vitrine des autres joueurs se lit depuis la fiche publique : tout joueur
-- connecté peut demander « qu'a déposé ce joueur ? ».
revoke all on function public.market_listings_of(uuid) from public, anon;
grant execute on function public.market_listings_of(uuid) to authenticated;
