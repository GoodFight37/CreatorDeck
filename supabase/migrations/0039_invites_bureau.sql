-- CreatorDeck — « Ta chaîne », étape 6 : les invités sur le bureau.
--
-- Ce que ça change dans le jeu : deux cartes de la collection tiennent le
-- plateau, et **chacune paie un raid quand son créateur est réellement en
-- direct** (le même direct que le badge de l'accueil, `0007_direct.sql`). Le
-- raid se paie **une fois par journée de jeu**, au premier relevé où l'un des
-- invités est en direct — pas à chaque ouverture de l'écran.
--
-- Trois décisions, écrites ici pour qu'elles ne se perdent pas :
--
--   * **la carte se valide comme partout ailleurs.** Le serveur ne croit pas le
--     client sur parole : `card_claim_covers()` (0022) dit si la carte est
--     couverte — registre du joueur, ou artisanat local (Standard, commune à
--     épique). C'est la règle des échanges et de l'hôtel ; un invité n'a pas de
--     passe-droit ;
--   * **le direct est lu, jamais deviné.** La fraîcheur vient de
--     `live_state.refreshed_at`, avec la **même fenêtre** que l'application
--     (dix minutes, `LIVE_TTL_MS`) : un cache périmé ne paie pas. Le raid ne
--     paie que les invités dont le créateur est dans `live_streams` **maintenant** ;
--   * **une seule fois par jour.** `streamer_raids` porte la journée : un joueur
--     qui ouvre sa chaîne trois fois n'est pas payé trois fois, et changer
--     d'invité après coup ne rouvre pas la caisse.
--
-- Ce que ce n'est **pas** : ni une monnaie (aucun jeton, aucun point), ni une
-- seconde porte sur la vidéo du jour. Le raid fait grandir la chaîne, comme
-- l'absence et la vidéo, avec le même arrondi que `_streamer_growth()`.
--
-- À exécuter **après** `0038` (qui remplace `streamer_status()` et
-- `streamer_visit()` : recoller `0038` seule après celle-ci ferait perdre le
-- raid). Rejouable : `create table if not exists`, `create or replace`,
-- `revoke` et `grant`.

-- ---------------------------------------------------------------------------
-- Le bureau, et le journal des raids
-- ---------------------------------------------------------------------------
create table if not exists public.streamer_guests (
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- Deux places : c'est le bureau, pas une collection bis.
  slot         smallint not null check (slot between 1 and 2),
  -- L'identifiant de la carte possédée (la même carte ne peut pas tenir les
  -- deux places : la clé est (joueur, place), l'index unique porte le créateur).
  card_id      text not null,
  creator_slug text not null,
  rarity       text not null,
  variant      text not null,
  at           timestamptz not null default now(),
  primary key (user_id, slot)
);

-- Deux créateurs différents au plus : deux copies du même ne font pas un
-- plateau plus riche, et le joueur comprendrait mal de payer deux fois pour la
-- même personne.
create unique index if not exists streamer_guests_un_createur
  on public.streamer_guests (user_id, creator_slug);

-- Le journal des raids : une ligne par journée payée, et c'est **elle** qui
-- empêche de payer deux fois.
create table if not exists public.streamer_raids (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     text not null,
  gained  bigint not null default 0,
  guests  jsonb not null default '[]'::jsonb,
  at      timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.streamer_guests enable row level security;
alter table public.streamer_raids enable row level security;
revoke all on table public.streamer_guests from public, anon, authenticated;
revoke all on table public.streamer_raids from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Les règles du raid, en petit
-- ---------------------------------------------------------------------------

/**
 * Ce qu'un invité de cette rareté paie, pour mille de la croissance du jour.
 *
 * Miroir de `guests.raidPermille` (`src/data/streamer.json`) : le test
 * `src/lib/supabase-streamer.test.ts` tient les deux copies ensemble, et un
 * chiffre changé d'un seul côté serait attrapé avant la mise en ligne.
 */
create or replace function public._streamer_guest_permille(p_rarity text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_rarity
    when 'common'    then 15
    when 'uncommon'  then 25
    when 'rare'      then 40
    when 'epic'      then 60
    when 'legendary' then 90
    else 0
  end;
$$;

/**
 * La fenêtre de fraîcheur du direct, en minutes.
 *
 * Dix minutes, comme `LIVE_TTL_MS` côté application : au-delà, l'app se tait et
 * le raid ne paie pas. Un badge « en direct » périmé serait un mensonge ; un
 * raid payé sur un direct d'hier en serait un plus gros.
 */
create or replace function public._streamer_live_window()
returns interval
language sql
immutable
set search_path = public
as $$ select interval '10 minutes'; $$;

/** Les invités d'un joueur, dans l'ordre du bureau. */
create or replace function public._streamer_guests_of(p_user uuid)
returns table (
  slot         smallint,
  card_id      text,
  creator_slug text,
  rarity       text,
  variant      text
)
language sql
stable
security definer
set search_path = public
as $$
  select g.slot, g.card_id, g.creator_slug, g.rarity, g.variant
  from public.streamer_guests g
  where g.user_id = p_user
  order by g.slot;
$$;

/**
 * Le bureau d'un joueur, en **tableau JSON** — `[]` s'il est vide.
 *
 * Écrit une fois, et surtout **pas** en `to_jsonb(_streamer_guests_of(...))` :
 * le `to_jsonb` d'une fonction **ensembliste** rend une ligne par invité, donc
 * **aucune ligne** quand le bureau est vide — et un `RETURN` sans ligne rend
 * `NULL` plutôt qu'un état vide. L'écran, lui, attend un tableau : la
 * différence se voyait dès la première ouverture, avant qu'un invité soit posé.
 */
create or replace function public._streamer_guest_list(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_agg(to_jsonb(t) order by t.slot) from public._streamer_guests_of(p_user) t),
    '[]'::jsonb
  );
$$;

/**
 * Le raid qu'un bureau **vaudrait maintenant** — sans rien écrire.
 *
 * Renvoie `{ gained, guests: [{slot, slug, rarity, permille, gained}, …] }` :
 * seuls les invités dont le créateur est en direct **et le cache assez frais**
 * comptent. La part d'un invité est `floor(croissance du jour × pour-mille /
 * 1000)`, exactement comme la croissance du setup — donc la même que celle que
 * l'application calcule dans `raidForGuests()`.
 */
create or replace function public._streamer_raid_of(p_user uuid, p_per_day integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with frais as (
    select coalesce(
      (select s.refreshed_at from public.live_state s order by s.refreshed_at desc limit 1),
      to_timestamp(0)
    ) as refreshed_at
  ),
  invites as (
    select
      g.slot,
      g.creator_slug as slug,
      g.rarity,
      public._streamer_guest_permille(g.rarity) as permille,
      floor(p_per_day * public._streamer_guest_permille(g.rarity) / 1000.0)::bigint as gained
    from public._streamer_guests_of(p_user) g
    where public._streamer_guest_permille(g.rarity) > 0
      and exists (
        select 1
        from public.creators c
        join public.live_streams l on l.login = c.login
        where c.slug = g.creator_slug
      )
      and (select refreshed_at from frais) > now() - public._streamer_live_window()
  )
  select jsonb_build_object(
    'gained', coalesce((select sum(i.gained) from invites i), 0),
    'guests', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'slot', i.slot, 'slug', i.slug, 'rarity', i.rarity,
        'permille', i.permille, 'gained', i.gained
      ) order by i.slot) from invites i),
      '[]'::jsonb
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Poser un invité, ou le retirer
-- ---------------------------------------------------------------------------

/**
 * Le bureau : poser une carte, ou libérer une place (`p_card` nul ou vide).
 *
 * Trois refus, dans cet ordre — la place existe, la carte est au joueur, le
 * créateur n'est pas déjà à l'autre place. Le prix est nul : un invité ne coûte
 * rien, il rapporte (ou pas) selon ce que Twitch raconte.
 */
create or replace function public.streamer_guest_set(p_slot integer, p_card jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_slot    integer := floor(coalesce(p_slot, 0));
  v_slug    text;
  v_rarity  text;
  v_variant text;
  v_card_id text;
begin
  -- Sans compte, on refuse comme partout ailleurs dans la chaîne : une
  -- exception, pas un objet — le client lit le message et l'affiche tel quel.
  perform public._streamer_ensure(v_user);

  if v_slot < 1 or v_slot > 2 then
    return jsonb_build_object('ok', false, 'error', 'place-inconnue');
  end if;

  -- Retirer l'invité de cette place.
  if p_card is null or p_card = '{}'::jsonb then
    delete from public.streamer_guests g where g.user_id = v_user and g.slot = v_slot;
    return jsonb_build_object(
      'ok', true, 'changed', true,
      'guests', public._streamer_guest_list(v_user)
    );
  end if;

  v_slug    := lower(coalesce(p_card ->> 'creatorSlug', ''));
  v_rarity  := coalesce(p_card ->> 'rarity', '');
  v_variant := coalesce(nullif(p_card ->> 'variant', ''), 'standard');
  v_card_id := coalesce(p_card ->> 'id', '');

  if v_card_id = '' then
    return jsonb_build_object('ok', false, 'error', 'carte-sans-identifiant');
  end if;
  if not exists (select 1 from public.creators c where c.slug = v_slug) then
    return jsonb_build_object('ok', false, 'error', 'createur-inconnu');
  end if;
  if v_rarity not in ('common', 'uncommon', 'rare', 'epic', 'legendary') then
    return jsonb_build_object('ok', false, 'error', 'rarete-inconnue');
  end if;
  if v_variant not in ('standard', 'live', 'holo', 'gold') then
    return jsonb_build_object('ok', false, 'error', 'variante-inconnue');
  end if;

  -- Le créateur tient-il déjà l'autre place ?
  if exists (
    select 1 from public.streamer_guests g
    where g.user_id = v_user and g.slot <> v_slot and g.creator_slug = v_slug
  ) then
    return jsonb_build_object('ok', false, 'error', 'meme-createur');
  end if;

  -- La carte est-elle au joueur ? Même règle que les échanges et l'hôtel : le
  -- registre la porte, ou l'artisanat peut la produire.
  if jsonb_array_length(public.card_claim_covers(v_user, jsonb_build_array(p_card))) > 0 then
    return jsonb_build_object('ok', false, 'error', 'carte-non-possedee');
  end if;

  insert into public.streamer_guests as g (user_id, slot, card_id, creator_slug, rarity, variant, at)
  values (v_user, v_slot, v_card_id, v_slug, v_rarity, v_variant, now())
  on conflict (user_id, slot) do update set
    card_id = excluded.card_id,
    creator_slug = excluded.creator_slug,
    rarity = excluded.rarity,
    variant = excluded.variant,
    at = now();

  return jsonb_build_object(
    'ok', true, 'changed', true,
    'guests', public._streamer_guest_list(v_user)
  );
end;
$$;

revoke all on function public.streamer_guest_set(integer, jsonb) from public, anon;
grant execute on function public.streamer_guest_set(integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- L'état de la chaîne, avec le bureau
-- ---------------------------------------------------------------------------

/**
 * L'état de la chaîne (`0038`), plus les invités et le raid du jour.
 *
 * `guests` vient du bureau, `raid_today` du journal — et un raid d'hier ne
 * s'affiche pas comme celui d'aujourd'hui, comme pour les jetons.
 */
create or replace function public.streamer_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row  public.streamer_channels;
  v_day  text;
  v_raid public.streamer_raids;
begin
  perform public._streamer_ensure(v_user);
  v_day := public._streamer_game_day(now());

  select * into v_row from public.streamer_channels c where c.user_id = v_user;
  select * into v_raid from public.streamer_raids r where r.user_id = v_user and r.day = v_day;

  return jsonb_build_object(
    'ok', true,
    'subscribers', v_row.subscribers,
    'per_day', public._streamer_growth(v_user, v_row.subscribers),
    'day', v_day,
    'published_today', exists (
      select 1 from public.streamer_videos v where v.user_id = v_user and v.day = v_day
    ),
    'chosen_today', exists (
      select 1 from public.streamer_events e where e.user_id = v_user and e.day = v_day
    ),
    'tokens_today', case when v_row.tokens_day = v_day then v_row.tokens_today else 0 end,
    'tokens_cap', public._streamer_token_cap(),
    'setup', to_jsonb(public._streamer_setup_owned(v_user)),
    'setup_bonus', public._streamer_setup_bonus(v_user),
    'guests', public._streamer_guest_list(v_user),
    'raid_day', coalesce(v_raid.day, ''),
    'raid_today', coalesce(v_raid.gained, 0),
    'raid_guests', coalesce(v_raid.guests, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.streamer_status() from public, anon;
grant execute on function public.streamer_status() to authenticated;

/**
 * Le retour du joueur (`0038`), plus le **raid du jour**.
 *
 * L'ordre compte : l'absence d'abord (elle paie les journées écoulées), le raid
 * ensuite. Le raid se paie **une seule fois par journée de jeu** — la ligne de
 * `streamer_raids` est la preuve du paiement — et seulement si un invité est en
 * direct à cet instant-là. Un second relevé dans la journée relit le raid payé
 * au lieu de le rejouer (`already: true`).
 */
create or replace function public.streamer_visit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_row        public.streamer_channels;
  v_now        timestamptz := now();
  v_days       integer;
  v_counted    integer;
  v_gained     bigint;
  v_after      bigint;
  v_per_day    integer;
  v_day        text;
  v_raid_rows  public.streamer_raids;
  v_raid_new   bigint := 0;
  v_raid_du    jsonb := '{"gained": 0, "guests": []}'::jsonb;
  v_raid_after bigint;
begin
  perform public._streamer_ensure(v_user);
  v_day := public._streamer_game_day(v_now);

  select * into v_row from public.streamer_channels c where c.user_id = v_user for update;

  v_days := greatest(
    0,
    (public._streamer_day_number(v_now) - public._streamer_day_number(v_row.last_seen_at))::integer
  );
  v_counted := least(v_days, public._streamer_cap_days());
  v_per_day := public._streamer_growth(v_user, v_row.subscribers);
  v_gained := v_counted::bigint * v_per_day;
  v_after := v_row.subscribers + greatest(0, v_gained);

  -- Le raid du jour : déjà payé ? sinon, y a-t-il un invité en direct ?
  select * into v_raid_rows
    from public.streamer_raids r
   where r.user_id = v_user and r.day = v_day;

  if not found then
    v_raid_du := public._streamer_raid_of(v_user, v_per_day);
    v_raid_new := coalesce((v_raid_du ->> 'gained')::bigint, 0);
    if v_raid_new > 0 then
      insert into public.streamer_raids as r (user_id, day, gained, guests, at)
      values (v_user, v_day, v_raid_new, coalesce(v_raid_du -> 'guests', '[]'::jsonb), v_now);
      v_after := v_after + v_raid_new;
    end if;
  else
    v_raid_new := v_raid_rows.gained;
    v_raid_du := jsonb_build_object('gained', v_raid_rows.gained, 'guests', v_raid_rows.guests);
  end if;

  v_raid_after := v_after;

  update public.streamer_channels
     set subscribers = v_raid_after,
         last_seen_at = v_now,
         updated_at = v_now
   where user_id = v_user;

  return jsonb_build_object(
    'ok', true,
    'days', v_days,
    'counted_days', v_counted,
    'gained', v_gained,
    'subscribers_before', v_row.subscribers,
    'subscribers', v_raid_after,
    'per_day', v_per_day,
    'raid', jsonb_build_object(
      'gained', v_raid_new,
      'guests', coalesce(v_raid_du -> 'guests', '[]'::jsonb),
      'already', v_raid_rows.user_id is not null
    )
  );
end;
$$;

revoke all on function public.streamer_visit() from public, anon;
grant execute on function public.streamer_visit() to authenticated;

-- ---------------------------------------------------------------------------
-- Ce que la base sait faire
-- ---------------------------------------------------------------------------

/**
 * `schema_versions()` (défini en `0035`, étendu jusqu'à `0038`) redit ce que la
 * base sait faire, avec la ligne de la `0039` en plus. Le marqueur est la table
 * du bureau : elle n'existe que dans cette migration, et une table se voit.
 */
create or replace function public.schema_versions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    -- 0030 : la Légendaire peut sortir Gold (1 %, hors Perfect).
    '0030', position('v_roll < 100' in public._schema_body('public._pack_choose_variant(text, boolean, boolean)')) > 0,
    -- 0031 : le plancher de malchance à douze.
    '0031', position('v_pity + 1 >= 12' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0032 : la série paie ses jours.
    '0032', position('serie-j' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0033 : le départ est maigre (deux boosters).
    '0033', position('public._pack_initial_packs()' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0034 : une Légendaire et une Live ne se volent pas.
    '0034', position('ne se vole pas' in public._schema_body('public.last_pack_steal(bigint, integer)')) > 0,
    -- 0035 : les jetons vivent au serveur.
    '0035', to_regprocedure('public.tokens_get()') is not null,
    -- 0036 : la chaîne (le simulateur de streameur).
    '0036', to_regclass('public.streamer_channels') is not null,
    -- 0037 : les alertes de perte (série qui s'arrête, réserve pleine).
    '0037', to_regprocedure('public._push_serie_due(uuid, timestamptz, integer)') is not null,
    -- 0038 : les imprévus de la chaîne et le setup.
    '0038', to_regclass('public.streamer_events') is not null,
    -- 0039 : les invités sur le bureau et le raid du direct.
    '0039', to_regclass('public.streamer_guests') is not null
  );
$$;

revoke all on function public.schema_versions() from public;
grant execute on function public.schema_versions() to anon, authenticated;

-- Les fonctions internes restent fermées au client : le joueur passe par
-- `streamer_status()`, `streamer_visit()`, `streamer_publish()`,
-- `streamer_event_today()`, `streamer_choose()`, `streamer_setup_buy()` et
-- `streamer_guest_set()`.
revoke all on function public._streamer_guest_permille(text) from public, anon, authenticated;
revoke all on function public._streamer_live_window() from public, anon, authenticated;
revoke all on function public._streamer_guests_of(uuid) from public, anon, authenticated;
revoke all on function public._streamer_guest_list(uuid) from public, anon, authenticated;
revoke all on function public._streamer_raid_of(uuid, integer) from public, anon, authenticated;
