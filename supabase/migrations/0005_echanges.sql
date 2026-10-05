-- CreatorDeck — échanges de cartes entre joueurs.
--
-- Cinquième migration du cloud, à exécuter **après** `0001_comptes_cloud.sql`,
-- `0002_vitrine.sql`, `0003_catalogue.sql` et `0004_tirage.sql`.
--
-- Ce que ça change :
--   * `public.trades` : une offre de troc (qui propose quoi à qui, et où elle
--     en est). Lecture par les deux joueurs concernés, écriture réservée aux
--     fonctions ci-dessous ;
--   * `public.create_trade()`, `public.respond_trade()` et
--     `public.cancel_trade()` : créer, accepter/refuser, annuler une offre ;
--   * `public.list_trades()` : les offres du joueur connecté (reçues, envoyées,
--     récemment résolues) ;
--   * `public.search_players()` : trouver un partenaire par son pseudo ;
--   * `public.player_variants()` : quelles variantes ce joueur possède pour un
--     créateur donné (collection privée, réponse ciblée).
--
-- Pourquoi le serveur s'en occupe : un échange déplace des cartes entre deux
-- collections. Si le client décidait seul, il suffirait de modifier sa
-- sauvegarde pour s'offrir les cartes d'un autre. Ici les deux collections
-- changent dans la **même transaction** — ou aucune des deux.
--
-- Ce que le serveur vérifie à l'acceptation :
--   1. c'est bien le destinataire qui répond ;
--   2. les deux joueurs possèdent encore les cartes qu'ils donnent (vérifié sur
--      leur **sauvegarde cloud**, pas sur une liste envoyée par le client) ;
--   3. les deux sauvegardes restent valides après le troc (`save_problems`).
--
-- Rejouable : `create table if not exists`, `create or replace`,
-- `drop policy if exists` et `grant`/`revoke` idempotents.
--
-- Hors périmètre (volontairement) : les points, l'XP et le niveau ne bougent
-- pas — un échange ne fait que déplacer des cartes.

-- --------------------------------------------------------------------------
-- Offres de troc
-- --------------------------------------------------------------------------
-- `proposer_cards` : ce que le proposeur donne. `recipient_cards` : ce que le
-- destinataire donne en retour. Chaque carte est `{creatorSlug, rarity,
-- variant}` — la rareté est recopiée du catalogue au moment de l'offre, pour
-- que le journal reste lisible même si le catalogue évolue.
create table if not exists public.trades (
  id              bigserial primary key,
  proposer_id     uuid not null references auth.users (id) on delete cascade,
  recipient_id    uuid not null references auth.users (id) on delete cascade,
  proposer_cards  jsonb not null,
  recipient_cards jsonb not null,
  status          text not null default 'open'
                    check (status in ('open', 'accepted', 'declined', 'cancelled')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  constraint trades_pas_de_troc_avec_soi_meme check (proposer_id <> recipient_id),
  constraint trades_cartes_bornees check (
    jsonb_array_length(proposer_cards) between 1 and 5
    and jsonb_array_length(recipient_cards) between 1 and 5
  )
);

create index if not exists trades_recipient_idx
  on public.trades (recipient_id, status, created_at desc);
create index if not exists trades_proposer_idx
  on public.trades (proposer_id, status, created_at desc);

alter table public.trades enable row level security;

-- Seuls les deux joueurs concernés voient l'offre. Aucune politique
-- d'insertion / mise à jour / suppression : tout passe par les fonctions
-- `security definer`, qui vérifient les possessions avant de bouger une carte.
drop policy if exists "ses échanges, et seulement les siens" on public.trades;
create policy "ses échanges, et seulement les siens"
  on public.trades for select
  to authenticated
  using (auth.uid() = proposer_id or auth.uid() = recipient_id);

-- --------------------------------------------------------------------------
-- Forme JSON d'une offre
-- --------------------------------------------------------------------------
-- Le client ne voit jamais les noms de colonnes bruts : une seule forme, en
-- camelCase, partagée par toutes les fonctions d'échange.
create or replace function public._trade_json(p_trade public.trades)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p_trade.id,
    'status', p_trade.status,
    'proposerId', p_trade.proposer_id,
    'recipientId', p_trade.recipient_id,
    'proposerCards', p_trade.proposer_cards,
    'recipientCards', p_trade.recipient_cards,
    'createdAt', p_trade.created_at,
    'resolvedAt', p_trade.resolved_at
  );
$$;

-- --------------------------------------------------------------------------
-- Normalisation d'une liste de cartes offertes
-- --------------------------------------------------------------------------
-- Entrée : `[{creatorSlug, variant}, …]` (le client peut envoyer la rareté,
-- elle est ignorée et recopiée du catalogue — on ne croit pas le client sur la
-- valeur d'une carte). Sortie : tableau trié, avec la rareté du catalogue.
--
-- Refuse : liste vide, plus de 5 cartes, créateur inconnu, variante inconnue,
-- deux fois le même couple créateur + variante (on n'échange pas « 2 fois la
-- même carte » dans une seule offre : ça complique la lecture du journal pour
-- aucun gain).
create or replace function public._trade_cards(p_cards jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_card jsonb;
  v_slug text;
  v_variant text;
  v_rarity text;
  v_out jsonb := '[]'::jsonb;
  v_seen text[] := '{}';
  v_key text;
begin
  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'echange : liste de cartes attendue' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_cards) < 1 then
    raise exception 'echange : une offre contient au moins une carte de chaque cote' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_cards) > 5 then
    raise exception 'echange : cinq cartes au maximum par cote' using errcode = 'P0001';
  end if;

  for v_card in select value from jsonb_array_elements(p_cards) loop
    v_slug := coalesce(v_card ->> 'creatorSlug', '');
    v_variant := coalesce(v_card ->> 'variant', '');

    if not (v_variant = any (array['standard', 'live', 'holo', 'gold'])) then
      raise exception 'echange : variante inconnue (%)', coalesce(nullif(v_variant, ''), '?') using errcode = 'P0001';
    end if;

    select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
    if v_rarity is null then
      raise exception 'echange : créateur inconnu du catalogue (%)', coalesce(nullif(v_slug, ''), '?') using errcode = 'P0001';
    end if;

    v_key := v_slug || '|' || v_variant;
    if v_key = any (v_seen) then
      raise exception 'echange : la même carte est proposée deux fois (%)', v_key using errcode = 'P0001';
    end if;
    v_seen := v_seen || v_key;

    v_out := v_out || jsonb_build_object(
      'creatorSlug', v_slug,
      'variant', v_variant,
      'rarity', v_rarity
    );
  end loop;

  -- Tri stable : le journal se lit de la même façon quel que soit l'ordre
  -- choisi par le client (et les tests peuvent comparer deux offres).
  select coalesce(jsonb_agg(value order by value ->> 'creatorSlug', value ->> 'variant'), '[]'::jsonb)
    into v_out
    from jsonb_array_elements(v_out);

  return v_out;
end;
$$;

-- --------------------------------------------------------------------------
-- Possession : la carte manquante, s'il y en a une
-- --------------------------------------------------------------------------
-- Renvoie la première carte demandée absente de la collection, ou NULL.
-- Sert à la fois à bloquer un échange et à écrire un message lisible
-- (« tu ne possèdes plus xQc en Holo »).
create or replace function public._trade_missing(p_cards jsonb, p_owned jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_card jsonb;
  v_have integer;
begin
  if jsonb_typeof(p_owned) <> 'array' then
    return p_cards -> 0;
  end if;
  for v_card in select value from jsonb_array_elements(p_cards) loop
    select count(*)::int into v_have
      from jsonb_array_elements(p_owned)
     where value ->> 'creatorSlug' = v_card ->> 'creatorSlug'
       and value ->> 'variant' = v_card ->> 'variant';
    if v_have < 1 then
      return v_card;
    end if;
  end loop;
  return null;
end;
$$;

-- --------------------------------------------------------------------------
-- Retrait des cartes données
-- --------------------------------------------------------------------------
-- Retire de la collection une copie par carte offerte, en commençant par la
-- plus **ancienne** (même règle que le client, qui garde ainsi ses cartes
-- récentes). Lève une exception si une carte a disparu entre-temps — la
-- transaction annule alors tout : personne ne perd rien.
create or replace function public._trade_remove(p_cards jsonb, p_owned jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_remaining jsonb := p_owned;
  v_card jsonb;
  v_index integer;
begin
  for v_card in select value from jsonb_array_elements(p_cards) loop
    select t.ord - 1 into v_index
      from (
        select value, ordinality as ord
          from jsonb_array_elements(v_remaining) with ordinality
         where value ->> 'creatorSlug' = v_card ->> 'creatorSlug'
           and value ->> 'variant' = v_card ->> 'variant'
         order by coalesce((value ->> 'obtainedAt')::bigint, 0), value ->> 'id'
         limit 1
      ) t;

    if v_index is null then
      raise exception 'echange : carte absente de la collection (% en %)',
        v_card ->> 'creatorSlug', v_card ->> 'variant' using errcode = 'P0001';
    end if;

    v_remaining := v_remaining - v_index;
  end loop;
  return v_remaining;
end;
$$;

-- --------------------------------------------------------------------------
-- Ajout des cartes reçues
-- --------------------------------------------------------------------------
-- Fabrique les cartes reçues côté client : identifiant neuf (elles n'existent
-- pas encore dans cette collection), horodatage du troc, et `fromTrade` pour
-- que le classeur puisse dire d'où vient la carte.
create or replace function public._trade_add(p_cards jsonb, p_trade_id bigint, p_now timestamptz)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'creatorSlug', value ->> 'creatorSlug',
        'rarity', value ->> 'rarity',
        'variant', value ->> 'variant',
        'obtainedAt', (extract(epoch from p_now) * 1000)::bigint,
        'rareDrop', false,
        'fromTrade', p_trade_id
      )
      order by value ->> 'creatorSlug', value ->> 'variant'
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_cards);
$$;

-- --------------------------------------------------------------------------
-- Trouver un partenaire
-- --------------------------------------------------------------------------
-- Recherche par pseudo (2 caractères minimum), hors soi-même, avec le niveau
-- et le nombre de créateurs uniques pour reconnaître la bonne personne.
create or replace function public.search_players(p_query text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(row order by row ->> 'displayName'), '[]'::jsonb)
    from (
      select jsonb_build_object(
               'userId', p.user_id,
               'displayName', p.display_name,
               'level', coalesce(s.level, 1),
               'uniqueCreators', coalesce(s.unique_creators, 0)
             ) as row
        from public.profiles p
        left join public.stats s on s.user_id = p.user_id
       where auth.uid() is not null
         and p.user_id <> auth.uid()
         and length(btrim(coalesce(p_query, ''))) >= 2
         and p.display_name ilike '%' || btrim(p_query) || '%'
       order by p.display_name
       limit 20
    ) t;
$$;

-- --------------------------------------------------------------------------
-- Quelles variantes ce joueur possède-t-il pour ce créateur ?
-- --------------------------------------------------------------------------
-- Sans cette réponse, une offre serait une devinette : demander la variante
-- Gold d'un créateur que le partenaire n'a qu'en Standard ne peut pas aboutir.
--
-- La collection des autres reste privée : la fonction répond pour **un**
-- créateur demandé, et ne dit que les variantes possédées (jamais les comptes,
-- jamais le reste de la collection). Le tri va de la variante la plus simple à
-- la plus rare, pour que l'interface propose d'abord la moins coûteuse.
create or replace function public.player_variants(p_user uuid, p_slug text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(variant order by rank), '[]'::jsonb)
    from (
      select distinct
        value ->> 'variant' as variant,
        case value ->> 'variant'
          when 'standard' then 1
          when 'live' then 2
          when 'holo' then 3
          else 4
        end as rank
        from public.saves s,
             jsonb_array_elements(s.state -> 'cards')
       where auth.uid() is not null
         and s.user_id = p_user
         and value ->> 'creatorSlug' = p_slug
    ) t;
$$;

-- --------------------------------------------------------------------------
-- Proposer un échange
-- --------------------------------------------------------------------------
-- Renvoie `{trade, recipientMissing}`. `recipientMissing` dit si le
-- destinataire ne possède pas (encore) une des cartes demandées, d'après sa
-- sauvegarde cloud : l'offre part quand même, le client prévient.
create or replace function public.create_trade(
  p_recipient uuid,
  p_given     jsonb,
  p_wanted    jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_given jsonb;
  v_wanted jsonb;
  v_save jsonb;
  v_owned jsonb;
  v_missing jsonb;
  v_recipient_save jsonb;
  v_open integer;
  v_trade public.trades;
begin
  if v_user_id is null then
    raise exception 'echange : connecte-toi pour proposer un échange' using errcode = 'P0001';
  end if;
  if p_recipient is null or p_recipient = v_user_id then
    raise exception 'echange : choisis un autre joueur' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = p_recipient) then
    raise exception 'echange : ce joueur n''a pas de profil' using errcode = 'P0001';
  end if;

  v_given := public._trade_cards(p_given);
  v_wanted := public._trade_cards(p_wanted);

  select s.state into v_save from public.saves s where s.user_id = v_user_id;
  if v_save is null then
    raise exception 'echange : envoie d''abord ta collection au cloud' using errcode = 'P0001';
  end if;
  v_owned := v_save -> 'cards';

  v_missing := public._trade_missing(v_given, v_owned);
  if v_missing is not null then
    raise exception 'echange : tu ne possèdes pas % en %',
      v_missing ->> 'creatorSlug', v_missing ->> 'variant' using errcode = 'P0001';
  end if;

  -- Garde-fou anti-spam : on ne noie pas un joueur sous les offres.
  select count(*)::int into v_open
    from public.trades t
   where t.proposer_id = v_user_id and t.status = 'open';
  if v_open >= 10 then
    raise exception 'echange : dix offres en attente au maximum, annule-en une' using errcode = 'P0001';
  end if;
  select count(*)::int into v_open
    from public.trades t
   where t.recipient_id = p_recipient and t.status = 'open';
  if v_open >= 20 then
    raise exception 'echange : ce joueur a déjà beaucoup d''offres en attente' using errcode = 'P0001';
  end if;

  insert into public.trades (proposer_id, recipient_id, proposer_cards, recipient_cards)
  values (v_user_id, p_recipient, v_given, v_wanted)
  returning * into v_trade;

  select s.state into v_recipient_save from public.saves s where s.user_id = p_recipient;

  return jsonb_build_object(
    'trade', public._trade_json(v_trade),
    'recipientMissing', case
      when v_recipient_save is null then null
      else public._trade_missing(v_wanted, v_recipient_save -> 'cards')
    end
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Répondre à un échange (accepter ou refuser)
-- --------------------------------------------------------------------------
-- C'est ici que les deux collections bougent, dans une seule transaction :
--   * `for update` sur l'offre puis sur les deux sauvegardes (dans l'ordre des
--     identifiants, pour éviter les interblocages) : deux acceptations
--     simultanées ne peuvent pas donner deux fois la même carte ;
--   * si une carte manque d'un côté ou de l'autre, exception → rien ne bouge.
--
-- Renvoie, du point de vue de l'appelant : `given` (ce qu'il donne) et
-- `received` (ce qu'il reçoit), pour que son appareil applique le même
-- changement localement.
create or replace function public.respond_trade(
  p_trade  bigint,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_now_ms bigint;
  v_trade public.trades;
  v_proposer_save public.saves;
  v_recipient_save public.saves;
  v_missing jsonb;
  v_proposer_state jsonb;
  v_recipient_state jsonb;
  v_given jsonb;
  v_received jsonb;
begin
  if v_user_id is null then
    raise exception 'echange : connecte-toi pour répondre à un échange' using errcode = 'P0001';
  end if;

  select * into v_trade from public.trades t where t.id = p_trade for update;
  if v_trade.id is null then
    raise exception 'echange : offre introuvable' using errcode = 'P0001';
  end if;
  if v_trade.recipient_id <> v_user_id then
    raise exception 'echange : cette offre ne t''est pas adressée' using errcode = 'P0001';
  end if;
  if v_trade.status <> 'open' then
    raise exception 'echange : cette offre est déjà %', v_trade.status using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.trades
       set status = 'declined', resolved_at = v_now
     where id = p_trade
    returning * into v_trade;
    return jsonb_build_object(
      'status', v_trade.status,
      'trade', public._trade_json(v_trade),
      'given', v_trade.recipient_cards,
      'received', v_trade.proposer_cards
    );
  end if;

  -- Verrouillage des deux sauvegardes dans un ordre stable (pas
  -- d'interblocage si deux échanges croisés sont acceptés en même temps).
  perform 1 from public.saves s
   where s.user_id in (v_trade.proposer_id, v_trade.recipient_id)
   order by s.user_id
     for update;

  select * into v_proposer_save from public.saves s where s.user_id = v_trade.proposer_id;
  select * into v_recipient_save from public.saves s where s.user_id = v_trade.recipient_id;

  if v_proposer_save.user_id is null then
    raise exception 'echange : le proposeur n''a pas de collection dans le cloud' using errcode = 'P0001';
  end if;
  if v_recipient_save.user_id is null then
    raise exception 'echange : envoie d''abord ta collection au cloud' using errcode = 'P0001';
  end if;

  v_missing := public._trade_missing(v_trade.proposer_cards, v_proposer_save.state -> 'cards');
  if v_missing is not null then
    raise exception 'echange : % ne possède plus % en %',
      'le proposeur', v_missing ->> 'creatorSlug', v_missing ->> 'variant' using errcode = 'P0001';
  end if;
  v_missing := public._trade_missing(v_trade.recipient_cards, v_recipient_save.state -> 'cards');
  if v_missing is not null then
    raise exception 'echange : tu ne possèdes plus % en %',
      v_missing ->> 'creatorSlug', v_missing ->> 'variant' using errcode = 'P0001';
  end if;

  v_now_ms := (extract(epoch from v_now) * 1000)::bigint;

  -- Côté proposeur : il donne `proposer_cards`, il reçoit `recipient_cards`.
  v_proposer_state := v_proposer_save.state;
  v_proposer_state := jsonb_set(v_proposer_state, '{cards}',
    public._trade_remove(v_trade.proposer_cards, v_proposer_state -> 'cards'), true);
  v_proposer_state := jsonb_set(v_proposer_state, '{cards}',
    (v_proposer_state -> 'cards') || public._trade_add(v_trade.recipient_cards, v_trade.id, v_now), true);
  v_proposer_state := jsonb_set(v_proposer_state, '{updatedAt}', to_jsonb(v_now_ms), true);

  -- Côté destinataire (l'appelant) : l'inverse.
  v_recipient_state := v_recipient_save.state;
  v_recipient_state := jsonb_set(v_recipient_state, '{cards}',
    public._trade_remove(v_trade.recipient_cards, v_recipient_state -> 'cards'), true);
  v_recipient_state := jsonb_set(v_recipient_state, '{cards}',
    (v_recipient_state -> 'cards') || public._trade_add(v_trade.proposer_cards, v_trade.id, v_now), true);
  v_recipient_state := jsonb_set(v_recipient_state, '{updatedAt}', to_jsonb(v_now_ms), true);

  -- Les deux sauvegardes doivent rester défendables : mêmes règles que
  -- `push_save`, sinon le troc pousserait un joueur en « non vérifié ».
  if array_length(public.save_problems(v_proposer_state), 1) is not null
     or array_length(public.save_problems(v_recipient_state), 1) is not null then
    raise exception 'echange : collection refusée par le serveur, échange annulé' using errcode = 'P0001';
  end if;

  update public.saves
     set state = v_proposer_state,
         state_checksum = md5(v_proposer_state::text),
         device_updated_at = v_now_ms,
         updated_at = v_now
   where user_id = v_trade.proposer_id;

  update public.saves
     set state = v_recipient_state,
         state_checksum = md5(v_recipient_state::text),
         device_updated_at = v_now_ms,
         updated_at = v_now
   where user_id = v_trade.recipient_id;

  update public.trades
     set status = 'accepted', resolved_at = v_now
   where id = p_trade
  returning * into v_trade;

  v_given := v_trade.recipient_cards;
  v_received := v_trade.proposer_cards;

  return jsonb_build_object(
    'status', v_trade.status,
    'trade', public._trade_json(v_trade),
    'given', v_given,
    'received', v_received
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Annuler une offre
-- --------------------------------------------------------------------------
create or replace function public.cancel_trade(p_trade bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_trade public.trades;
begin
  if v_user_id is null then
    raise exception 'echange : connecte-toi' using errcode = 'P0001';
  end if;

  update public.trades
     set status = 'cancelled', resolved_at = now()
   where id = p_trade
     and proposer_id = v_user_id
     and status = 'open'
  returning * into v_trade;

  if v_trade.id is null then
    raise exception 'echange : offre introuvable ou déjà résolue' using errcode = 'P0001';
  end if;
  return public._trade_json(v_trade);
end;
$$;

-- --------------------------------------------------------------------------
-- Lister ses échanges
-- --------------------------------------------------------------------------
-- Une seule liste, du point de vue de l'appelant : `direction` dit si l'offre
-- est reçue ou envoyée, `given` ce qu'il donne et `received` ce qu'il reçoit,
-- quel que soit le côté. Les offres en attente d'abord, puis les dernières
-- résolues (l'appareil peut ainsi appliquer un échange accepté ailleurs).
create or replace function public.list_trades()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with mine as (
    select
      t.*,
      case when t.recipient_id = auth.uid() then 'in' else 'out' end as direction,
      case when t.recipient_id = auth.uid() then t.recipient_cards else t.proposer_cards end as my_given,
      case when t.recipient_id = auth.uid() then t.proposer_cards else t.recipient_cards end as my_received,
      case when t.recipient_id = auth.uid() then t.proposer_id else t.recipient_id end as partner_id
    from public.trades t
    where (t.proposer_id = auth.uid() or t.recipient_id = auth.uid())
      and auth.uid() is not null
  )
  select coalesce(jsonb_agg(row order by (row ->> 'status' <> 'open'), (row ->> 'createdAt') desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
               'id', m.id,
               'direction', m.direction,
               'status', m.status,
               'partnerId', m.partner_id,
               'partnerName', coalesce(p.display_name, 'Collectionneur'),
               'given', m.my_given,
               'received', m.my_received,
               'createdAt', m.created_at,
               'resolvedAt', m.resolved_at
             ) as row
        from mine m
        left join public.profiles p on p.user_id = m.partner_id
       order by (m.status <> 'open'), m.created_at desc
       limit 30
    ) t;
$$;

-- --------------------------------------------------------------------------
-- Permissions
-- --------------------------------------------------------------------------
-- Seuls les joueurs connectés appellent les fonctions publiques.
revoke all on function public.search_players(text) from public, anon;
grant execute on function public.search_players(text) to authenticated;

revoke all on function public.create_trade(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_trade(uuid, jsonb, jsonb) to authenticated;

revoke all on function public.respond_trade(bigint, boolean) from public, anon;
grant execute on function public.respond_trade(bigint, boolean) to authenticated;

revoke all on function public.cancel_trade(bigint) from public, anon;
grant execute on function public.cancel_trade(bigint) to authenticated;

revoke all on function public.list_trades() from public, anon;
grant execute on function public.list_trades() to authenticated;

revoke all on function public.player_variants(uuid, text) from public, anon;
grant execute on function public.player_variants(uuid, text) to authenticated;

-- Les fonctions internes ne s'appellent pas depuis le client : elles ne
-- manipulent des collections que sous le contrôle des fonctions ci-dessus.
revoke all on function public._trade_cards(jsonb) from public, anon, authenticated;
revoke all on function public._trade_missing(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public._trade_remove(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public._trade_add(jsonb, bigint, timestamptz) from public, anon, authenticated;
revoke all on function public._trade_json(public.trades) from public, anon, authenticated;
