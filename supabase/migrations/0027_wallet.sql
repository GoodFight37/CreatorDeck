-- 0027_wallet.sql — les points passent au serveur
--
-- Jusqu'ici, les points vivaient dans la sauvegarde : le serveur la lisait et la
-- croyait. Un solde trafiqué achetait donc à l'hôtel, et c'était le dernier trou
-- d'économie assumé du jeu. Cette migration le ferme.
--
-- **La caisse est au serveur.** Le solde vit dans `wallets`, et il n'y a que deux
-- portes :
--
--   * `wallet_credit(kind, ref)` — le joueur demande un crédit, le serveur
--     **fixe le prix** (jamais le client) et, quand c'est possible, **vérifie
--     l'événement** : un tirage existe-t-il vraiment (`pack_draws`), l'annonce
--     vendue est-elle bien la sienne (`market_listings`), le palier a-t-il déjà
--     été payé (journal) ? Un palier ou une saison ne se paient qu'une fois ;
--   * `wallet_spend(kind, ref)` — l'artisanat, dont le coût est recalculé depuis
--     le catalogue. L'hôtel ne passe pas par là : il a son propre débit (le
--     trigger de `market_listings`), pour rester dans la même transaction que la
--     vente elle-même.
--
-- **Le solde de la sauvegarde devient un miroir.** L'écran n'a rien à
-- apprendre : `state.points` existe toujours, c'est lui qui s'affiche. Mais il
-- est désormais **écrit par le serveur** (`wallet_get()` le réécrit) et il ne
-- sert plus jamais à autoriser une dépense. Une sauvegarde bricolée à un million
-- de points ne verra pas son million revenir, et n'achètera rien.
--
-- Rejouable : `create table if not exists`, `create or replace`, `drop trigger
-- if exists` avant chaque `create trigger`.
--
-- Ce qui reste **local**, volontairement : les sabliers (ils ne s'achètent ni ne
-- s'échangent), l'XP et le niveau. Ils ne valent rien pour un autre joueur.

-- ---------------------------------------------------------------------------
-- Le compte
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- Jamais négatif : la contrainte est la dernière barrière, même si chaque
  -- débit vérifie déjà son solde avant d'écrire.
  points     integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

-- Le journal : chaque mouvement, avec sa raison. Il sert à deux choses — dire
-- d'où vient le solde (un litige se règle en lisant), et **empêcher un crédit à
-- usage unique de passer deux fois** (l'unicité est dans l'index ci-dessous,
-- donc aucune course ne peut la contourner).
create table if not exists public.wallet_ledger (
  id      bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta   integer not null,
  -- `pack`, `scene`, `sell`, `recycle`, `milestone`, `season` — et `craft`,
  -- `hotel` pour les débits.
  kind    text not null,
  -- L'événement : l'identifiant du tirage, de l'annonce, de la carte, du palier
  -- ou de la famille. C'est lui qui rend un crédit unique.
  ref     text not null default '',
  at      timestamptz not null default now()
);

create unique index if not exists wallet_ledger_once
  on public.wallet_ledger (user_id, kind, ref);

-- Fermées au client, comme les jetons de notification et les tables d'arène :
-- le joueur passe par les fonctions, jamais par les tables.
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
revoke all on table public.wallets from public, anon, authenticated;
revoke all on table public.wallet_ledger from public, anon, authenticated;
revoke all on sequence public.wallet_ledger_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- La mécanique : un seul endroit qui écrit le solde
-- ---------------------------------------------------------------------------
/**
 * Ouvre le compte d'un joueur, **une seule fois**, en reprenant le solde de sa
 * sauvegarde.
 *
 * C'est la bascule : les joueurs ont déjà des points, ils ne doivent pas se
 * réveiller à zéro le jour du collage. Comme pour la provenance (`0021`), la
 * reprise a lieu une fois par joueur, au premier appel — et une ligne de journal
 * marque le passage, si bien qu'une sauvegarde gonflée à la main **après** la
 * bascule ne rouvre jamais la porte.
 *
 * Le solde de reprise est borné : au-delà d'un million, c'est une partie
 * bricolée, et le compte s'ouvre à zéro (le reste du jeu, lui, n'est pas touché).
 */
create or replace function public._wallet_ensure(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_local  integer;
begin
  select w.points into v_points from public.wallets w where w.user_id = p_user;
  if v_points is not null then
    return v_points;
  end if;

  select greatest(0, least(1000000, coalesce((s.state ->> 'points')::integer, 0)))
    into v_local
    from public.saves s where s.user_id = p_user;
  v_local := coalesce(v_local, 0);

  insert into public.wallets (user_id, points, updated_at)
  values (p_user, v_local, now())
  on conflict (user_id) do nothing;

  insert into public.wallet_ledger (user_id, delta, kind, ref)
  values (p_user, v_local, 'bascule', '0027')
  on conflict (user_id, kind, ref) do nothing;

  select w.points into v_points from public.wallets w where w.user_id = p_user;
  return coalesce(v_points, v_local);
end;
$$;

/**
 * Applique un mouvement et renvoie le nouveau solde.
 *
 * `p_once` : quand le journal porte déjà (joueur, raison, événement), rien ne
 * bouge et la fonction renvoie le solde **actuel** — c'est ce qui rend un palier
 * ou une caisse de tirage impossible à encaisser deux fois, même si le client
 * redemande.
 *
 * Un débit qui passe sous zéro lève une exception : la mise à jour ne s'applique
 * pas (`where` sur l'`on conflict`), donc rien n'est écrit.
 */
create or replace function public._wallet_apply(
  p_user  uuid,
  p_delta integer,
  p_kind  text,
  p_ref   text default '',
  p_once  boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
begin
  if p_user is null then
    raise exception 'solde : connecte-toi pour utiliser tes points' using errcode = 'P0001';
  end if;
  if coalesce(p_kind, '') = '' then
    raise exception 'solde : mouvement sans raison' using errcode = 'P0001';
  end if;

  perform public._wallet_ensure(p_user);

  -- Le journal d'abord : c'est lui qui décide si le mouvement a lieu.
  insert into public.wallet_ledger (user_id, delta, kind, ref)
  values (p_user, p_delta, coalesce(p_kind, ''), coalesce(p_ref, ''))
  on conflict (user_id, kind, ref) do nothing;

  if not found then
    -- Déjà payé (ou déjà débité) : on renvoie le solde tel qu'il est, sans rien
    -- ajouter. Ce n'est pas une erreur : un client qui redemande après une
    -- coupure réseau doit obtenir la même réponse, pas un second crédit.
    select w.points into v_points from public.wallets w where w.user_id = p_user;
    return coalesce(v_points, 0);
  end if;

  insert into public.wallets (user_id, points, updated_at)
  values (p_user, greatest(0, p_delta), now())
  on conflict (user_id) do update
     set points = public.wallets.points + p_delta,
         updated_at = now()
   where public.wallets.points + p_delta >= 0
  returning points into v_points;

  if v_points is null then
    -- Le débit n'a pas pu s'appliquer : on retire la ligne du journal, sinon
    -- l'événement serait « déjà payé » alors que rien n'a bougé.
    delete from public.wallet_ledger
     where user_id = p_user and kind = coalesce(p_kind, '') and ref = coalesce(p_ref, '');
    raise exception 'solde : il te manque des points pour ce mouvement' using errcode = 'P0001';
  end if;

  return v_points;
end;
$$;

/**
 * Écrit le solde du serveur dans la sauvegarde (le **miroir**).
 *
 * L'écran lit `state.points` : il n'a donc rien à apprendre. Ce que le miroir
 * n'est pas, c'est une autorisation — une sauvegarde gonflée à la main est
 * écrasée par cette fonction dès que le joueur regarde son solde ou dépense
 * quelque chose.
 */
create or replace function public._wallet_mirror(p_user uuid, p_points integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state jsonb;
  v_next  jsonb;
begin
  select s.state into v_state from public.saves s where s.user_id = p_user for update;
  if v_state is null then
    return;
  end if;
  if coalesce((v_state ->> 'points')::integer, 0) = p_points then
    return;
  end if;

  v_next := jsonb_set(v_state, '{points}', to_jsonb(p_points), true);
  update public.saves
     set state = v_next,
         state_checksum = md5(v_next::text),
         updated_at = now()
   where user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- Les prix, côté serveur
-- ---------------------------------------------------------------------------
/**
 * Ce que le serveur paie et fait payer.
 *
 * Les valeurs viennent du jeu (`src/lib/catalog.ts` pour les raretés,
 * `src/lib/game-engine.ts` pour les paliers) : un test miroir relit ces fichiers
 * et compare — un prix changé d'un côté seulement casse le test avant de
 * casser le jeu.
 */
create or replace function public.wallet_prices()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'pack', 12,
    'scene', 10,
    'recycle', jsonb_build_object(
      'common', 12, 'uncommon', 22, 'rare', 55, 'epic', 150, 'legendary', 250
    ),
    'craft', jsonb_build_object(
      'common', 45, 'uncommon', 90, 'rare', 220, 'epic', 600
    ),
    'milestone', jsonb_build_object(
      'first', 40, 'ten', 120, 'twentyfive', 260, 'fifty', 500,
      'hundred', 1200, 'legendary', 400, 'master', 3000
    ),
    -- Une saison paie chaque créateur **nouvellement** possédé de la famille.
    'seasonPerCreator', 4
  );
$$;

revoke all on function public.wallet_prices() from public, anon;
grant execute on function public.wallet_prices() to authenticated;

-- ---------------------------------------------------------------------------
-- Le solde du joueur
-- ---------------------------------------------------------------------------
/**
 * Le solde, et rien d'autre. Lecture pure, sauf qu'elle **recale le miroir** :
 * appeler `wallet_get()` suffit à faire disparaître un million de points
 * inventés dans la sauvegarde.
 */
create or replace function public.wallet_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_points integer;
begin
  if v_user is null then
    raise exception 'solde : connecte-toi pour voir tes points' using errcode = 'P0001';
  end if;

  v_points := public._wallet_ensure(v_user);
  perform public._wallet_mirror(v_user, v_points);

  return jsonb_build_object('ok', true, 'points', v_points);
end;
$$;

revoke all on function public.wallet_get() from public, anon;
grant execute on function public.wallet_get() to authenticated;

/**
 * Encaisse un crédit. **Le prix vient du serveur**, jamais de l'appelant.
 *
 * Chaque raison a sa vérification :
 *
 *   * `pack` / `scene` : `ref` est l'identifiant d'un tirage du joueur
 *     (`pack_draws`). Le serveur ne paie que pour un tirage qu'il a réellement
 *     enregistré, et une seule fois ;
 *   * `sell` : `ref` est l'identifiant d'une annonce **du joueur** (`market_listings`).
 *     Normalement inutile : la vente crédite par trigger. La porte existe pour
 *     rattraper une annonce vendue avant cette migration ;
 *   * `recycle` : `ref` porte la rareté ; le prix est celui de la table ;
 *   * `milestone` : `ref` est l'identifiant du palier ; le prix est celui du jeu,
 *     et le palier ne se paie qu'une fois ;
 *   * `season` : `ref` est la famille ; le serveur compte les créateurs possédés
 *     et paie ceux qui ne l'ont pas encore été.
 */
create or replace function public.wallet_credit(p_kind text, p_ref text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_kind   text := lower(btrim(coalesce(p_kind, '')));
  v_ref    text := btrim(coalesce(p_ref, ''));
  v_prices jsonb := public.wallet_prices();
  v_delta  integer;
  v_points integer;
  v_avant  integer;
  v_once   boolean := false;
  v_row    record;
  v_paid   integer;
  v_owned  integer;
begin
  if v_user is null then
    raise exception 'solde : connecte-toi pour encaisser des points' using errcode = 'P0001';
  end if;

  case v_kind
    when 'pack', 'scene' then
      -- Le tirage doit exister, être au joueur, et être du bon genre : c'est ce
      -- qui empêche d'encaisser un booster qu'on n'a jamais ouvert.
      select d.id into v_row
        from public.pack_draws d
       where d.id::text = v_ref
         and d.user_id = v_user
         and d.kind = case when v_kind = 'pack' then 'live' else 'scene' end;
      if not found then
        raise exception 'solde : ce tirage n''existe pas (ou n''est pas le tien)' using errcode = 'P0001';
      end if;
      v_delta := (v_prices ->> v_kind)::integer;
      v_once := true;

    when 'sell' then
      select l.payout into v_row
        from public.market_listings l
       where l.id::text = v_ref
         and l.seller_id = v_user
         and l.status = 'sold';
      if not found then
        raise exception 'solde : cette vente n''existe pas (ou n''est pas la tienne)' using errcode = 'P0001';
      end if;
      v_delta := v_row.payout;
      v_once := true;

    when 'recycle' then
      v_delta := (v_prices -> 'recycle' ->> lower(v_ref))::integer;
      if v_delta is null then
        raise exception 'solde : rareté inconnue pour un recyclage' using errcode = 'P0001';
      end if;

    when 'milestone' then
      v_delta := (v_prices -> 'milestone' ->> v_ref)::integer;
      if v_delta is null then
        raise exception 'solde : palier inconnu' using errcode = 'P0001';
      end if;
      v_once := true;

    when 'season' then
      -- Ce qui a déjà été payé pour cette famille = les points du journal
      -- divisés par le prix d'un créateur. On paie la différence, jamais deux
      -- fois le même créateur.
      select coalesce(sum(l.delta), 0) into v_paid
        from public.wallet_ledger l
       where l.user_id = v_user and l.kind = 'season' and l.ref = v_ref;
      select count(distinct c.slug) into v_owned
        from public.user_cards uc
        join public.creators c on c.slug = uc.creator_slug
       where uc.user_id = v_user
         and c.retired = false
         and c.region = v_ref;
      v_delta := greatest(0, v_owned - (v_paid / greatest(1, (v_prices ->> 'seasonPerCreator')::integer)))
                 * (v_prices ->> 'seasonPerCreator')::integer;
      if v_delta = 0 then
        raise exception 'solde : rien de nouveau à encaisser dans cette famille' using errcode = 'P0001';
      end if;
      -- La ligne de journal porte le montant cumulé : elle sert de compteur, pas
      -- d'unicité (on encaisse une famille plusieurs fois, au fil des cartes).
      v_ref := v_ref || ':' || (v_paid + v_delta)::text;
      v_once := false;

    else
      raise exception 'solde : raison de crédit inconnue (%)', v_kind using errcode = 'P0001';
  end case;

  v_avant := public._wallet_ensure(v_user);
  v_points := public._wallet_apply(v_user, v_delta, v_kind, v_ref, v_once);
  perform public._wallet_mirror(v_user, v_points);

  -- `gained` est ce qui a **réellement** bougé : si le crédit était déjà passé,
  -- c'est zéro, et le client ne peut pas annoncer un gain qui n'a pas eu lieu.
  return jsonb_build_object('ok', true, 'kind', v_kind, 'gained', v_points - v_avant, 'points', v_points);
end;
$$;

revoke all on function public.wallet_credit(text, text) from public, anon;
grant execute on function public.wallet_credit(text, text) to authenticated;

/**
 * Paie un achat : seul l'**artisanat** passe par ici (l'hôtel a son propre débit,
 * dans la transaction de la vente).
 *
 * Le coût est recalculé depuis le catalogue : le client ne propose pas un prix,
 * il propose un créateur. Le slug est aussi la clé d'unicité — on ne paie pas
 * deux fois le même artisanat, même si le client insiste.
 */
create or replace function public.wallet_spend(p_kind text, p_ref text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_kind   text := lower(btrim(coalesce(p_kind, '')));
  v_ref    text := btrim(coalesce(p_ref, ''));
  v_prices jsonb := public.wallet_prices();
  v_creator public.creators;
  v_cost   integer;
  v_points integer;
  v_avant  integer;
begin
  if v_user is null then
    raise exception 'solde : connecte-toi pour dépenser des points' using errcode = 'P0001';
  end if;

  v_avant := public._wallet_ensure(v_user);

  if v_kind <> 'craft' then
    raise exception 'solde : dépense inconnue (%)', v_kind using errcode = 'P0001';
  end if;

  select * into v_creator from public.creators c where c.slug = v_ref;
  if v_creator.slug is null then
    raise exception 'solde : ce créateur n''est pas au catalogue' using errcode = 'P0001';
  end if;
  if v_creator.retired then
    raise exception 'solde : % a quitté le classement, il n''est plus artisanable', v_creator.display_name
      using errcode = 'P0001';
  end if;

  v_cost := (v_prices -> 'craft' ->> v_creator.rarity)::integer;
  if v_cost is null then
    raise exception 'solde : les cartes % ne sont pas artisanales', v_creator.rarity using errcode = 'P0001';
  end if;

  v_points := public._wallet_apply(v_user, -v_cost, v_kind, v_ref, true);
  perform public._wallet_mirror(v_user, v_points);

  -- Même règle que pour un crédit : `spent` dit ce qui a bougé (0 si ce
  -- créateur a déjà été payé une fois).
  return jsonb_build_object('ok', true, 'kind', v_kind, 'spent', v_avant - v_points, 'points', v_points);
end;
$$;

revoke all on function public.wallet_spend(text, text) from public, anon;
grant execute on function public.wallet_spend(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- L'hôtel : la vente crédite, l'achat débite — dans la même transaction
-- ---------------------------------------------------------------------------
/**
 * Une annonce déposée paie son vendeur, tout de suite.
 *
 * Un trigger plutôt qu'une ligne dans `market_sell()` : la vente et son paiement
 * deviennent inséparables (aucune annonce ne peut exister sans que le vendeur
 * ait été payé), et la fonction de vente reste celle de `0022`, avec ses refus
 * de provenance.
 */
create or replace function public._wallet_on_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._wallet_apply(new.seller_id, new.payout, 'sell', new.id::text, true);
  return new;
end;
$$;

drop trigger if exists wallet_on_listing on public.market_listings;
create trigger wallet_on_listing
  after insert on public.market_listings
  for each row execute function public._wallet_on_listing();

/**
 * Un achat paie avec le **solde du serveur**.
 *
 * Le contrôle est ici, et pas dans `market_buy()` : c'est le seul endroit que
 * personne ne peut contourner. Une sauvegarde gonflée à la main passe le contrôle
 * de `market_buy()` (qui lit encore la sauvegarde) puis échoue ici — l'achat est
 * annulé, la carte reste au comptoir, et le joueur lit « il te manque N points ».
 *
 * Le cachet du débit porte le montant (`v_price − v_points`), donc le message
 * dit combien il manque **au solde du serveur**, pas au solde affiché.
 */
create or replace function public._wallet_on_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
begin
  if new.status <> 'sold' or old.status = 'sold' then
    return new;
  end if;
  if new.buyer_id is null or new.buyer_id = new.seller_id then
    return new;
  end if;

  v_points := public._wallet_ensure(new.buyer_id);
  if v_points < new.price then
    raise exception 'hotel : il te manque % points', new.price - v_points using errcode = 'P0001';
  end if;

  -- On ne touche **pas** au miroir ici : la sauvegarde vient d'être écrite par
  -- `market_buy()`, et le solde s'y recale à la prochaine lecture
  -- (`wallet_get()`). Un trigger qui réécrit la sauvegarde au milieu d'une
  -- fonction qui vient de la modifier, c'est deux écrivains pour un seul champ.
  perform public._wallet_apply(new.buyer_id, -new.price, 'hotel', new.id::text, true);
  return new;
end;
$$;

drop trigger if exists wallet_on_sale on public.market_listings;
create trigger wallet_on_sale
  before update on public.market_listings
  for each row execute function public._wallet_on_sale();

/**
 * La bascule de **tout le monde**, en une requête — le complément de
 * `_wallet_ensure()`.
 *
 * À lancer une fois après le collage (SQL Editor ou clé de service) : chaque
 * joueur connu ouvre son compte avec le solde de sa sauvegarde, tout de suite,
 * sans attendre son prochain appel. Les joueurs arrivés après s'ouvrent tout
 * seuls, au premier appel.
 */
create or replace function public.wallet_backfill()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open integer;
begin
  select count(*) into v_open
    from public.saves s
   where not exists (select 1 from public.wallets w where w.user_id = s.user_id);

  insert into public.wallets (user_id, points, updated_at)
  select s.user_id,
         greatest(0, least(1000000, coalesce((s.state ->> 'points')::integer, 0))),
         now()
    from public.saves s
   where not exists (select 1 from public.wallets w where w.user_id = s.user_id)
  on conflict (user_id) do nothing;

  return jsonb_build_object('ok', true, 'comptes_ouverts', v_open);
end;
$$;

-- ---------------------------------------------------------------------------
-- Les droits
-- ---------------------------------------------------------------------------
-- Les fonctions du trigger et la mécanique ne se donnent pas au client : elles
-- ne doivent s'exécuter que dans le fil d'une fonction autorisée.
revoke all on function public._wallet_ensure(uuid) from public, anon, authenticated;
revoke all on function public.wallet_backfill() from public, anon, authenticated;
revoke all on function public._wallet_apply(uuid, integer, text, text, boolean) from public, anon, authenticated;
revoke all on function public._wallet_mirror(uuid, integer) from public, anon, authenticated;
revoke all on function public._wallet_on_listing() from public, anon, authenticated;
revoke all on function public._wallet_on_sale() from public, anon, authenticated;

do $$
begin
  grant execute on function public._wallet_ensure(uuid) to service_role;
  grant execute on function public.wallet_backfill() to service_role;
  grant execute on function public._wallet_apply(uuid, integer, text, text, boolean) to service_role;
  grant execute on function public._wallet_mirror(uuid, integer) to service_role;
exception when others then
  raise notice 'rôle service_role absent : les triggers suffisent';
end
$$;
