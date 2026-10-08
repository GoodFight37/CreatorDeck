-- CreatorDeck — Last Pack : le paquet qu'on vient d'ouvrir reste exposé
-- dix minutes, et un ami peut t'y voler une carte (une par jour).
--
-- Douzième migration du cloud, à exécuter **après** `0004_tirage.sql`
-- (le tirage), `0008_friends.sql` (les amis) et `0001_comptes_cloud.sql`
-- (les sauvegardes).
--
-- Ce que ça change :
--   * `public.last_packs` : les cinq cartes d'un tirage restent exposées dix
--     minutes. La ligne est créée **par un déclencheur** sur `pack_draws` :
--     `open_pack()` n'est pas modifiée, donc le tirage reste celui de
--     `0004`/`0011`, au caractère près ;
--   * `public.last_pack_shelf()` : ce qui est exposé **maintenant** — mes
--     paquets et ceux de mes amis, avec les cartes déjà prises ;
--   * `public.last_pack_steal(paquet, carte)` : le vol. Une carte par jour et
--     par joueur, seulement chez un ami, seulement dans les dix minutes ;
--     la carte quitte **vraiment** la collection du propriétaire (sa
--     sauvegarde du cloud est réécrite) et entre dans celle du voleur ;
--   * `public.last_pack_losses()` : « qui m'a pris quoi », pour le carnet de
--     notifications (une ligne par vol subi, jamais mes propres vols).
--
-- Ce que ça ne fait pas : aucun cadeau. Une carte volée est retirée au
-- propriétaire — pas de duplication possible, et le vol échoue si sa
-- collection du cloud ne contient plus la carte.
--
-- Rejouable : `create table if not exists`, `create or replace`,
-- `drop trigger if exists`, `grant`/`revoke` idempotents.

-- --------------------------------------------------------------------------
-- Les paquets exposés
-- --------------------------------------------------------------------------
-- Une ligne par booster ouvert, avec les cinq cartes telles qu'elles sont
-- sorties (mêmes champs que le journal `pack_draws`). `expires_at` est écrit à
-- la publication : c'est la seule horloge qui compte, et c'est celle du
-- serveur — reculer l'horloge de son téléphone ne rallonge pas la fenêtre.
create table if not exists public.last_packs (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  drawn_at   timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  cards      jsonb not null,
  constraint last_pack_cinq_cartes check (jsonb_array_length(cards) = 5)
);

create index if not exists last_packs_fresh_idx
  on public.last_packs (expires_at);
create index if not exists last_packs_user_idx
  on public.last_packs (user_id, drawn_at desc);

alter table public.last_packs enable row level security;

-- Aucune politique : ce n'est pas au client de décider quels paquets il peut
-- regarder. Seules les fonctions `security definer` ci-dessous lisent cette
-- table (elles vérifient l'amitié), et le déclencheur l'écrit.

-- --------------------------------------------------------------------------
-- Les vols
-- --------------------------------------------------------------------------
-- Une ligne par carte volée. `card` est la copie de la carte au moment du vol
-- (le carnet doit pouvoir la nommer même si le paquet est ensuite purgé),
-- `day` la journée UTC du vol — c'est elle qui porte la règle « une par jour »,
-- y compris si la fonction est appelée deux fois dans la même seconde.
--
-- `pack_id` est nullable et `on delete set null` : purger les paquets périmés
-- ne doit pas effacer le carnet de la victime.
create table if not exists public.last_pack_steals (
  id         bigserial primary key,
  pack_id    bigint references public.last_packs (id) on delete set null,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  thief_id   uuid not null references auth.users (id) on delete cascade,
  card_index integer not null check (card_index between 1 and 5),
  card       jsonb not null,
  -- L'identifiant de la carte **dans la collection de la victime** : c'est lui
  -- qui empêche une vieille sauvegarde de la faire revenir (voir le garde-fou
  -- de `push_save()` plus bas).
  card_id    text,
  stolen_at  timestamptz not null default now(),
  day        date not null default ((now() at time zone 'utc'))::date,
  constraint last_pack_pas_de_vol_de_soi check (owner_id <> thief_id)
);

-- Colonne ajoutée après coup (migration rejouable sur une base déjà à jour).
alter table public.last_pack_steals add column if not exists card_id text;

create unique index if not exists last_pack_un_vol_par_jour
  on public.last_pack_steals (thief_id, day);

create index if not exists last_pack_pertes_idx
  on public.last_pack_steals (owner_id, stolen_at desc);

alter table public.last_pack_steals enable row level security;

-- Une seule politique de lecture : ce qui te concerne — ce que tu as pris, et
-- ce qu'on t'a pris. Pas d'écriture : seuls `last_pack_steal()` (security
-- definer) et le déclencheur écrivent. Cette lecture sert aussi au garde-fou
-- de `push_save()`, qui est `security invoker` : sans elle, la fonction ne
-- verrait pas les vols et laisserait une vieille sauvegarde ressusciter la
-- carte.
drop policy if exists "ses vols, et ceux dont on est la victime" on public.last_pack_steals;
create policy "ses vols, et ceux dont on est la victime"
  on public.last_pack_steals for select
  to authenticated
  using (auth.uid() = thief_id or auth.uid() = owner_id);

-- --------------------------------------------------------------------------
-- Publier un paquet à l'ouverture
-- --------------------------------------------------------------------------
-- Déclencheur sur le journal des tirages : dès qu'`open_pack()` écrit une
-- ligne, les cinq cartes sont exposées dix minutes. `security definer` parce
-- que la ligne est écrite par le joueur, qui n'a aucun droit sur `last_packs`.
create or replace function public._last_pack_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.last_packs (user_id, drawn_at, expires_at, cards)
  values (
    new.user_id,
    new.drawn_at,
    new.drawn_at + interval '10 minutes',
    new.cards
  );

  -- Ménage : au-delà d'une heure, un paquet périmé n'intéresse plus personne
  -- (les vols, eux, restent : ils ont leur propre table).
  delete from public.last_packs
   where user_id = new.user_id
     and expires_at < now() - interval '1 hour';

  return new;
end;
$$;

drop trigger if exists pack_draws_last_pack on public.pack_draws;
create trigger pack_draws_last_pack
  after insert on public.pack_draws
  for each row execute function public._last_pack_publish();

-- --------------------------------------------------------------------------
-- Lecture d'un paquet
-- --------------------------------------------------------------------------
-- Les cinq cartes d'un paquet, avec la marque « déjà prise ». L'index est
-- celui du tableau (1 à 5) : c'est lui que le vol transmet, pas un identifiant
-- de carte — les cartes d'un tirage n'en ont pas.
create or replace function public._last_pack_cards(p_pack public.last_packs)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'index', t.ord,
        'creatorSlug', t.card ->> 'creatorSlug',
        'rarity', t.card ->> 'rarity',
        'variant', t.card ->> 'variant',
        'taken', exists (
          select 1
            from public.last_pack_steals s
           where s.pack_id = p_pack.id
             and s.card_index = t.ord
        )
      )
      order by t.ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_pack.cards) with ordinality as t (card, ord);
$$;

-- --------------------------------------------------------------------------
-- Ce qui est exposé maintenant
-- --------------------------------------------------------------------------
-- Mes paquets et ceux de mes amis, **tant qu'ils sont frais**. Rien d'autre :
-- le paquet d'un inconnu n'est pas exposé (sinon n'importe qui pourrait voler
-- n'importe qui), et un paquet périmé n'apparaît plus — ce qui s'y est passé
-- reste lisible par `last_pack_losses()`.
create or replace function public.last_pack_shelf()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_packs jsonb;
  v_stole_today boolean;
begin
  if v_user is null then
    raise exception 'last pack : connecte-toi pour voir les paquets exposés'
      using errcode = 'P0001';
  end if;

  select exists (
    select 1
      from public.last_pack_steals s
     where s.thief_id = v_user
       and s.day = (v_now at time zone 'utc')::date
  )
  into v_stole_today;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'ownerId', v.user_id,
        'ownerName', coalesce(p.display_name, 'Un collectionneur'),
        'mine', v.user_id = v_user,
        'drawnAt', v.drawn_at,
        'expiresAt', v.expires_at,
        'stealable', v.user_id <> v_user and not v_stole_today,
        'cards', public._last_pack_cards(v)
      )
      order by (v.user_id = v_user) desc, v.drawn_at desc
    ),
    '[]'::jsonb
  )
  into v_packs
  from public.last_packs v
  left join public.profiles p on p.user_id = v.user_id
 where v.expires_at > v_now
   and (v.user_id = v_user or public.has_friendship(v.user_id));

  return jsonb_build_object(
    'now', v_now,
    'windowMinutes', 10,
    'stealPerDay', 1,
    'stoleToday', v_stole_today,
    'packs', v_packs
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Créer la carte volée dans la collection du voleur
-- --------------------------------------------------------------------------
-- Même forme que `_trade_add()`, avec la marque `fromLastPack` (le paquet
-- d'origine) au lieu de `fromTrade` : c'est elle qui empêche d'appliquer deux
-- fois le même vol si la réponse se perd en route.
create or replace function public._last_pack_add(
  p_card jsonb,
  p_pack bigint,
  p_now  timestamptz
)
returns jsonb
language sql
volatile
as $$
  select jsonb_build_object(
    'id', gen_random_uuid(),
    'creatorSlug', p_card ->> 'creatorSlug',
    'rarity', p_card ->> 'rarity',
    'variant', p_card ->> 'variant',
    'obtainedAt', (extract(epoch from p_now) * 1000)::bigint,
    'rareDrop', false,
    'fromLastPack', p_pack
  );
$$;

-- --------------------------------------------------------------------------
-- Le vol
-- --------------------------------------------------------------------------
-- Le serveur tranche seul : fenêtre de dix minutes, amitié, une carte par
-- jour, carte encore disponible, et surtout **la carte doit exister dans la
-- collection du propriétaire** — sinon le vol est refusé et rien ne bouge.
-- Les deux sauvegardes sont verrouillées dans un ordre stable (pas
-- d'interblocage avec un échange accepté en même temps).
create or replace function public.last_pack_steal(
  p_pack  bigint,
  p_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_now_ms bigint;
  v_pack public.last_packs;
  v_owner_save public.saves;
  v_thief_save public.saves;
  v_owner_state jsonb;
  v_thief_state jsonb;
  v_card jsonb;
  v_card_id text;
  v_missing jsonb;
begin
  if v_user is null then
    raise exception 'vol : connecte-toi pour prendre une carte' using errcode = 'P0001';
  end if;

  select * into v_pack from public.last_packs l where l.id = p_pack for update;
  if v_pack.id is null then
    raise exception 'vol : ce paquet n''existe plus' using errcode = 'P0001';
  end if;
  if v_pack.expires_at <= v_now then
    raise exception 'vol : les dix minutes sont écoulées' using errcode = 'P0001';
  end if;
  if v_pack.user_id = v_user then
    raise exception 'vol : c''est ton propre paquet' using errcode = 'P0001';
  end if;
  if p_index is null
     or p_index < 1
     or p_index > jsonb_array_length(v_pack.cards) then
    raise exception 'vol : carte inconnue dans ce paquet' using errcode = 'P0001';
  end if;
  if not public.has_friendship(v_pack.user_id) then
    raise exception 'vol : il faut être ami avec ce collectionneur' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.last_pack_steals s
     where s.pack_id = v_pack.id and s.card_index = p_index
  ) then
    raise exception 'vol : cette carte a déjà été prise' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.last_pack_steals s
     where s.thief_id = v_user
       and s.day = (v_now at time zone 'utc')::date
  ) then
    raise exception 'vol : une carte par jour — la tienne est déjà prise'
      using errcode = 'P0001';
  end if;

  v_card := v_pack.cards -> (p_index - 1);

  -- Verrouillage des deux collections dans un ordre stable.
  perform 1 from public.saves s
   where s.user_id in (v_user, v_pack.user_id)
   order by s.user_id
     for update;

  select * into v_owner_save from public.saves s where s.user_id = v_pack.user_id;
  select * into v_thief_save from public.saves s where s.user_id = v_user;

  if v_owner_save.user_id is null then
    raise exception 'vol : ce collectionneur n''a pas de collection dans le cloud'
      using errcode = 'P0001';
  end if;
  if v_thief_save.user_id is null then
    raise exception 'vol : envoie d''abord ta collection au cloud' using errcode = 'P0001';
  end if;

  v_missing := public._trade_missing(jsonb_build_array(v_card), v_owner_save.state -> 'cards');
  if v_missing is null then
    -- L'identifiant de la copie qui va partir : c'est la plus ancienne du
    -- couple créateur + variante, exactement celle que `_trade_remove()`
    -- retirera.
    select value ->> 'id' into v_card_id
      from jsonb_array_elements(v_owner_save.state -> 'cards')
     where value ->> 'creatorSlug' = v_card ->> 'creatorSlug'
       and value ->> 'variant' = v_card ->> 'variant'
     order by coalesce((value ->> 'obtainedAt')::bigint, 0), value ->> 'id'
     limit 1;
  end if;
  if v_missing is not null then
    raise exception 'vol : il ne possède plus % en %',
      v_missing ->> 'creatorSlug', v_missing ->> 'variant' using errcode = 'P0001';
  end if;

  v_now_ms := (extract(epoch from v_now) * 1000)::bigint;

  -- Côté propriétaire : la carte la plus ancienne du couple créateur+variante
  -- s'en va (même règle que les échanges).
  v_owner_state := jsonb_set(
    v_owner_save.state,
    '{cards}',
    public._trade_remove(jsonb_build_array(v_card), v_owner_save.state -> 'cards'),
    true
  );
  v_owner_state := jsonb_set(v_owner_state, '{updatedAt}', to_jsonb(v_now_ms), true);

  -- Côté voleur : la carte arrive, marquée du paquet d'origine.
  v_thief_state := jsonb_set(
    v_thief_save.state,
    '{cards}',
    (v_thief_save.state -> 'cards') || public._last_pack_add(v_card, v_pack.id, v_now),
    true
  );
  v_thief_state := jsonb_set(v_thief_state, '{updatedAt}', to_jsonb(v_now_ms), true);

  -- Les deux sauvegardes doivent rester défendables : mêmes règles que
  -- `push_save`, sinon un vol pousserait un joueur en « non vérifié ».
  if array_length(public.save_problems(v_owner_state), 1) is not null
     or array_length(public.save_problems(v_thief_state), 1) is not null then
    raise exception 'vol : collection refusée par le serveur, rien n''a bougé'
      using errcode = 'P0001';
  end if;

  insert into public.last_pack_steals
    (pack_id, owner_id, thief_id, card_index, card, card_id, stolen_at, day)
  values
    (v_pack.id, v_pack.user_id, v_user, p_index, v_card, v_card_id, v_now,
     (v_now at time zone 'utc')::date);

  update public.saves
     set state = v_owner_state,
         state_checksum = md5(v_owner_state::text),
         device_updated_at = v_now_ms,
         updated_at = v_now
   where user_id = v_pack.user_id;

  update public.saves
     set state = v_thief_state,
         state_checksum = md5(v_thief_state::text),
         device_updated_at = v_now_ms,
         updated_at = v_now
   where user_id = v_user;

  -- Une carte épinglée qui part en vol quitte la vitrine publique.
  perform public._trade_clean_showcase(v_pack.user_id, v_owner_state);
  perform public._trade_clean_showcase(v_user, v_thief_state);

  return jsonb_build_object(
    'status', 'stolen',
    'packId', v_pack.id,
    'index', p_index,
    'ownerId', v_pack.user_id,
    'ownerName', coalesce(
      (select p.display_name from public.profiles p where p.user_id = v_pack.user_id),
      'Un collectionneur'
    ),
    'card', public._last_pack_add(v_card, v_pack.id, v_now)
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Ce qu'on m'a pris
-- --------------------------------------------------------------------------
-- Pour le carnet : une ligne par carte volée, du plus récent au plus ancien.
-- Le voleur n'y voit pas ses propres vols : un carnet raconte ce qui arrive,
-- pas ce qu'on vient de faire.
create or replace function public.last_pack_losses(p_limit integer default 20)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'thiefName', coalesce(p.display_name, 'Un collectionneur'),
        'packId', s.pack_id,
        'card', s.card,
        'stolenAt', s.stolen_at
      )
      order by s.stolen_at desc
    ),
    '[]'::jsonb
  )
  from (
    select *
      from public.last_pack_steals
     where owner_id = auth.uid()
     order by stolen_at desc
     limit greatest(1, least(coalesce(p_limit, 20), 50))
  ) s
  left join public.profiles p on p.user_id = s.thief_id;
$$;

-- --------------------------------------------------------------------------
-- `push_save()` : une carte volée ne revient pas
-- --------------------------------------------------------------------------
-- Cette fonction vient de `0001_comptes_cloud.sql` : elle est réécrite ici
-- **pour la seule raison** qu'un vol doit résister à une vieille sauvegarde.
-- Sans ce garde-fou, la victime qui joue avant de se resynchroniser renverrait
-- l'état d'avant le vol — la carte reviendrait chez elle **et** resterait chez
-- le voleur. Le reste du corps est identique, à la lettre.

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

  -- Un vol de Last Pack ne se défait pas avec une vieille sauvegarde.
  --
  -- Sans ce contrôle, la victime qui joue sans se resynchroniser renverrait
  -- l'état d'avant le vol : la carte reviendrait chez elle **et** resterait
  -- chez le voleur. Le contrôle est précis (il vise l'identifiant exact de la
  -- carte volée, pas le couple créateur + variante : elle a le droit de
  -- retomber d'un booster) et il renvoie la victime vers la sauvegarde du
  -- cloud, où le vol est déjà écrit.
  if exists (
    select 1
      from public.last_pack_steals s
     where s.owner_id = auth.uid()
       and s.card_id is not null
       and p_state -> 'cards' @> jsonb_build_array(jsonb_build_object('id', s.card_id))
  ) then
    return jsonb_build_object(
      'status', 'rejected',
      'problems', jsonb_build_array(
        'une carte volée ne peut pas revenir : charge la sauvegarde du cloud (Compte)'
      )
    );
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
-- Permissions
-- --------------------------------------------------------------------------
revoke all on function public.push_save(jsonb, integer, bigint, boolean) from public, anon;
grant execute on function public.push_save(jsonb, integer, bigint, boolean) to authenticated;

revoke all on function public.last_pack_shelf() from public, anon;
grant execute on function public.last_pack_shelf() to authenticated;

revoke all on function public.last_pack_steal(bigint, integer) from public, anon;
grant execute on function public.last_pack_steal(bigint, integer) to authenticated;

revoke all on function public.last_pack_losses(integer) from public, anon;
grant execute on function public.last_pack_losses(integer) to authenticated;

-- Les fonctions internes ne s'appellent pas depuis le client.
revoke all on function public._last_pack_publish() from public, anon, authenticated;
revoke all on function public._last_pack_cards(public.last_packs) from public, anon, authenticated;
revoke all on function public._last_pack_add(jsonb, bigint, timestamptz) from public, anon, authenticated;
