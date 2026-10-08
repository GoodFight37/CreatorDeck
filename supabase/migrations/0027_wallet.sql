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
--     **fixe le prix** (jamais le client) et **vérifie l'événement** : un tirage
--     existe-t-il vraiment (`pack_draws`), l'annonce vendue est-elle bien la
--     sienne (`market_listings`), la carte recyclée est-elle dans sa collection
--     (double copie, provenance), le palier est-il réellement atteint (barème
--     `wallet_milestones`, compté dans `user_cards` et `pack_state`), la famille
--     a-t-elle assez de créateurs possédés (`wallet_season_tiers`, générée
--     depuis le jeu par `0028_wallet_saisons.sql`) ? Rien ne se paie deux fois ;
--   * `wallet_spend(kind, ref)` — l'artisanat, débité au prix du catalogue (le
--     client propose un créateur, jamais un prix). L'hôtel ne passe pas par là :
--     il a son propre débit (le trigger de `market_listings`), pour rester dans
--     la même transaction que la vente elle-même.
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
 * Quand le journal porte déjà (joueur, raison, événement), rien ne bouge et la
 * fonction renvoie le solde **actuel** : c'est ce qui rend un palier, une caisse
 * de tirage, une carte recyclée ou un dépôt à l'hôtel impossibles à encaisser
 * deux fois, même si le client redemande après une coupure réseau.
 *
 * Un débit qui passe sous zéro lève une exception : la mise à jour ne s'applique
 * pas (`where` sur l'`on conflict`), donc rien n'est écrit.
 */
create or replace function public._wallet_apply(
  p_user  uuid,
  p_delta integer,
  p_kind  text,
  p_ref   text default ''
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

  -- Le journal d'abord : **c'est la seule porte**. L'index unique
  -- `wallet_ledger_once (user_id, kind, ref)` décide si le mouvement a lieu —
  -- un événement déjà payé (le même tirage, la même carte, le même palier, la
  -- même vente) ne repasse pas, même si le client redemande après une coupure
  -- réseau. Il n'y a donc pas de « mode » à choisir : chaque mouvement est à
  -- usage unique, et c'est la référence (`ref`) qui dit ce qui est unique.
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
    )
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
-- ---------------------------------------------------------------------------
-- La grille des paliers de collection
-- ---------------------------------------------------------------------------
-- Le serveur ne croit pas un client qui annonce « j'ai complété le catalogue » :
-- il **recalcule** l'avancement dans la collection projetée (`user_cards`) et le
-- compare au seuil. Cette table est le miroir de `MILESTONES`
-- (`src/lib/game-engine.ts`) — `src/lib/supabase-wallet.test.ts` compare les
-- deux, donc un palier retouché dans le jeu sans l'être ici fait échouer la
-- suite de tests.
--
-- `metric` : ce que le jalon compte — `openings` (les boosters ouverts, comptés
-- par le serveur dans `pack_state`), `uniqueCreators` (les créateurs distincts
-- possédés), `legendary` (un Légendaire au moins) ou `catalogue` (tout le
-- catalogue vivant : ce seuil-là est recalculé à chaque réclamation, parce qu'un
-- but qui grandit avec le catalogue ne peut pas être figé ici).
create table if not exists public.wallet_milestones (
  id     text primary key,
  metric text not null check (metric in ('openings', 'uniqueCreators', 'legendary', 'catalogue')),
  target integer not null check (target >= 0),
  points integer not null check (points >= 0)
);

insert into public.wallet_milestones (id, metric, target, points) values
  ('first',      'openings',       1,    40),
  ('ten',        'uniqueCreators', 10,   120),
  ('twentyfive', 'uniqueCreators', 25,   260),
  ('fifty',      'uniqueCreators', 50,   500),
  ('hundred',    'uniqueCreators', 100,  1200),
  ('legendary',  'legendary',      1,    400),
  ('master',     'catalogue',      0,    3000)
on conflict (id) do update
  set metric = excluded.metric,
      target = excluded.target,
      points = excluded.points;

alter table public.wallet_milestones enable row level security;
revoke all on table public.wallet_milestones from public, anon, authenticated;

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
 *     (`pack_draws`). Normalement inutile — le trigger `wallet_on_draw` paie
 *     chaque tirage au moment où le serveur l'enregistre. La porte existe pour
 *     rattraper un tirage fait avant le collage, et elle refusera tout ce qui
 *     n'est pas un vrai tirage du joueur ;
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
  v_user       uuid := auth.uid();
  v_kind       text := lower(btrim(coalesce(p_kind, '')));
  v_ref        text := btrim(coalesce(p_ref, ''));
  v_prices     jsonb := public.wallet_prices();
  v_save       public.saves;
  v_cards      jsonb;
  v_card       jsonb;
  v_rarity     text;
  v_variant    text;
  v_claim_slug text;
  v_consume    boolean := false;
  v_delta      integer;
  v_points     integer;
  v_avant      integer;
  v_owned      integer;
  v_metric     text;
  v_target     integer;
  v_season     text;
  v_tier       integer;
  v_row        record;
begin
  if v_user is null then
    raise exception 'solde : connecte-toi pour encaisser des points' using errcode = 'P0001';
  end if;

  case v_kind
    when 'pack', 'scene' then
      -- Le tirage doit exister, être au joueur, et être du bon genre : c'est ce
      -- qui empêche d'encaisser un booster qu'on n'a jamais ouvert. Depuis le
      -- trigger `wallet_on_draw`, cette branche ne sert plus qu'au rattrapage
      -- d'un tirage arrivé avant la bascule.
      select d.id into v_row
        from public.pack_draws d
       where d.id::text = v_ref
         and d.user_id = v_user
         and d.kind = case when v_kind = 'pack' then 'live' else 'scene' end;
      if not found then
        raise exception 'solde : ce tirage n''existe pas (ou n''est pas le tien)' using errcode = 'P0001';
      end if;
      v_delta := (v_prices ->> v_kind)::integer;

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

    when 'recycle' then
      -- La carte, **par son identifiant**, dans la sauvegarde du joueur : ce
      -- qu'il possède est écrit là et nulle part ailleurs. La rareté, elle, vient
      -- du **catalogue** — une sauvegarde bricolée ne se recycle donc pas au prix
      -- d'une Légendaire.
      select * into v_save from public.saves s where s.user_id = v_user;
      if v_save.user_id is null then
        raise exception 'solde : envoie d''abord ta collection au cloud' using errcode = 'P0001';
      end if;
      v_cards := coalesce(v_save.state -> 'cards', '[]'::jsonb);
      select value into v_card
        from jsonb_array_elements(v_cards)
       where value ->> 'id' = v_ref
       limit 1;
      if v_card is null then
        raise exception 'solde : cette carte n''est pas dans ta collection' using errcode = 'P0001';
      end if;

      v_claim_slug := lower(v_card ->> 'creatorSlug');
      v_variant := coalesce(nullif(v_card ->> 'variant', ''), 'standard');
      select c.rarity into v_rarity from public.creators c where c.slug = v_claim_slug;
      if v_rarity is null then
        raise exception 'solde : ce créateur n''est pas au catalogue' using errcode = 'P0001';
      end if;
      if not (v_variant = any (array['standard', 'live', 'holo', 'gold'])) then
        raise exception 'solde : variante inconnue pour un recyclage' using errcode = 'P0001';
      end if;

      -- Jamais la dernière copie d'un couple créateur + variante : la règle du
      -- moteur et de l'hôtel, qui protège la complétion.
      if (
        select count(*) from jsonb_array_elements(v_cards)
         where lower(coalesce(value ->> 'creatorSlug', '')) = v_claim_slug
           and coalesce(nullif(value ->> 'variant', ''), 'standard') = v_variant
      ) < 2 then
        raise exception 'solde : c''est ta seule copie de cette carte' using errcode = 'P0001';
      end if;

      -- Provenance : on ne recycle pas une carte que le serveur n'a jamais
      -- donnée — le recyclage est une porte de sortie, comme l'hôtel. L'atelier
      -- reste couvert : ses cartes sont des Standard, commune à épique.
      if jsonb_array_length(public.card_claim_covers(v_user, jsonb_build_array(
           jsonb_build_object('creatorSlug', v_claim_slug, 'rarity', v_rarity, 'variant', v_variant)
         ))) > 0 then
        raise exception 'solde : cette carte n''a pas de provenance vérifiable (ni tirage, ni échange, ni hôtel, ni vol)'
          using errcode = 'P0001';
      end if;

      v_delta := (v_prices -> 'recycle' ->> v_rarity)::integer;
      -- Le **droit sera consommé** si le mouvement a lieu : la carte quitte la
      -- collection, elle ne peut donc pas être refabriquée pour être recyclée
      -- encore. C'est la promesse de `0022` (« ça se fermera le jour où le
      -- recyclage passera par le serveur »), tenue ici.
      v_consume := true;

    when 'milestone' then
      -- Le serveur **recalcule** le palier : il ne croit pas un client qui
      -- annonce « j'ai complété le catalogue ». Le barème vit dans
      -- `wallet_milestones` (miroir de `MILESTONES`, gardé par un test),
      -- l'avancement se compte dans la collection projetée — ou dans le
      -- compteur de boosters du serveur, qui ne se bricole pas.
      select m.metric, m.target, m.points into v_metric, v_target, v_delta
        from public.wallet_milestones m
       where m.id = v_ref;
      if v_metric is null then
        raise exception 'solde : palier inconnu' using errcode = 'P0001';
      end if;

      if v_metric = 'openings' then
        select coalesce(ps.openings, 0) into v_owned
          from public.pack_state ps where ps.user_id = v_user;
        v_owned := coalesce(v_owned, 0);
      elsif v_metric = 'legendary' then
        select count(distinct uc.creator_slug) into v_owned
          from public.user_cards uc
         where uc.user_id = v_user and uc.rarity = 'legendary';
      else
        select count(distinct uc.creator_slug) into v_owned
          from public.user_cards uc
          join public.creators c on c.slug = uc.creator_slug and c.retired = false
         where uc.user_id = v_user;
        if v_metric = 'catalogue' then
          -- Le but grandit avec le catalogue : le seuil est relu maintenant.
          select count(*) into v_target from public.creators c where c.retired = false;
        end if;
      end if;

      if v_owned < v_target then
        raise exception 'solde : il te manque % sur ce palier', (v_target - v_owned) using errcode = 'P0001';
      end if;

    when 'season' then
      -- **Un palier à la fois** : `S09#2` = le 2ᵉ palier de la famille S09. Le
      -- seuil et le montant viennent de `wallet_season_tiers`, générée depuis le
      -- jeu par `0028_wallet_saisons.sql` : le client propose un repère, jamais
      -- un montant, et le serveur compte lui-même les créateurs possédés.
      if position('#' in v_ref) = 0 then
        raise exception 'solde : précise le palier (famille#palier)' using errcode = 'P0001';
      end if;
      if to_regclass('public.wallet_season_tiers') is null then
        raise exception 'solde : colle d''abord 0028_wallet_saisons.sql' using errcode = 'P0001';
      end if;
      v_season := split_part(v_ref, '#', 1);
      begin
        v_tier := split_part(v_ref, '#', 2)::integer;
      exception when others then
        raise exception 'solde : ce palier n''existe pas' using errcode = 'P0001';
      end;
      select t.required, t.points into v_target, v_delta
        from public.wallet_season_tiers t
       where t.season_id = v_season and t.tier = v_tier;
      if v_delta is null then
        raise exception 'solde : ce palier n''existe pas' using errcode = 'P0001';
      end if;
      select count(distinct uc.creator_slug) into v_owned
        from public.wallet_season_members m
        join public.user_cards uc
          on uc.user_id = v_user and uc.creator_slug = m.creator_slug
       where m.season_id = v_season;
      if v_owned < v_target then
        raise exception 'solde : il te manque % créateur(s) pour ce palier', (v_target - v_owned)
          using errcode = 'P0001';
      end if;

    else
      raise exception 'solde : raison de crédit inconnue (%)', v_kind using errcode = 'P0001';
  end case;

  v_avant := public._wallet_ensure(v_user);
  v_points := public._wallet_apply(v_user, v_delta, v_kind, v_ref);

  -- Le droit n'est consommé que si le mouvement a **réellement** eu lieu : un
  -- rejeu (le journal porte déjà cette carte) ne retire pas un second droit.
  if v_consume and (v_points - v_avant) > 0 then
    update public.card_claims
       set qty = greatest(0, qty - 1), last_at = now()
     where user_id = v_user
       and creator_slug = v_claim_slug
       and rarity = v_rarity
       and variant = v_variant
       and qty > 0;
  end if;

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

  v_points := public._wallet_apply(v_user, -v_cost, v_kind, v_ref);
  perform public._wallet_mirror(v_user, v_points);

  -- Même règle que pour un crédit : `spent` dit ce qui a bougé (0 si ce
  -- créateur a déjà été payé une fois).
  return jsonb_build_object('ok', true, 'kind', v_kind, 'spent', v_avant - v_points, 'points', v_points);
end;
$$;

revoke all on function public.wallet_spend(text, text) from public, anon;
grant execute on function public.wallet_spend(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Le tirage paie tout seul
-- ---------------------------------------------------------------------------
/**
 * Chaque tirage enregistré par le serveur crédite son joueur, **sans que le
 * client ait à le demander**.
 *
 * C'est le même raisonnement que pour l'hôtel : le fait et son paiement ne
 * doivent pas pouvoir se séparer. `open_pack()` écrit le tirage dans
 * `pack_draws` — c'est là, et pas dans une requête du client, que les 12 points
 * naissent. Le client n'a donc rien à prouver, et un client qui ment n'a rien
 * à gagner.
 */
create or replace function public._wallet_on_draw()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._wallet_apply(
    new.user_id,
    case when new.kind = 'scene' then 10 else 12 end,
    case when new.kind = 'scene' then 'scene' else 'pack' end,
    new.id::text
  );
  return new;
end;
$$;

drop trigger if exists wallet_on_draw on public.pack_draws;
create trigger wallet_on_draw
  after insert on public.pack_draws
  for each row execute function public._wallet_on_draw();

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
declare
  v_avant  integer;
  v_points integer;
begin
  v_avant := public._wallet_ensure(new.seller_id);
  v_points := public._wallet_apply(new.seller_id, new.payout, 'sell', new.id::text);

  -- Déposer, c'est faire sortir la carte de sa collection : le droit est
  -- consommé (une seule fois, et seulement si le paiement a bien eu lieu). Sans
  -- ça, la même carte pourrait être refabriquée puis redéposée sans fin — le
  -- même blanchiment que le recyclage, par la porte de l'hôtel.
  if v_points > v_avant then
    update public.card_claims
       set qty = greatest(0, qty - 1), last_at = now()
     where user_id = new.seller_id
       and creator_slug = new.creator_slug
       and rarity = new.rarity
       and variant = new.variant
       and qty > 0;
  end if;

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
  perform public._wallet_apply(new.buyer_id, -new.price, 'hotel', new.id::text);
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
revoke all on function public._wallet_apply(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public._wallet_mirror(uuid, integer) from public, anon, authenticated;
revoke all on function public._wallet_on_draw() from public, anon, authenticated;
revoke all on function public._wallet_on_listing() from public, anon, authenticated;
revoke all on function public._wallet_on_sale() from public, anon, authenticated;

do $$
begin
  grant execute on function public._wallet_ensure(uuid) to service_role;
  grant execute on function public.wallet_backfill() to service_role;
  grant execute on function public._wallet_apply(uuid, integer, text, text) to service_role;
  grant execute on function public._wallet_mirror(uuid, integer) to service_role;
exception when others then
  raise notice 'rôle service_role absent : les triggers suffisent';
end
$$;
