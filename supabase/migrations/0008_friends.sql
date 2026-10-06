-- CreatorDeck -- système d'amis.
--
-- Huitième migration du cloud, à exécuter **après** `0007_direct.sql`.
--
-- Ce que ça change :
--   * `public.friend_requests` : demandes d'ami en attente.
--   * `public.friends` : relations d'amitié établies.
--   * `public.send_friend_request()` : envoyer une demande d'ami.
--   * `public.accept_friend_request()` : accepter une demande d'ami.
--   * `public.reject_friend_request()` : rejeter une demande d'ami.
--   * `public.remove_friend()` : supprimer un ami.
--   * `public.list_friends()` : liste des amis du joueur connecté.
--   * `public.list_incoming_friend_requests()` : demandes d'ami reçues.
--   * `public.list_outgoing_friend_requests()` : demandes d'ami envoyées.
--   * `public.has_friendship()` : vérifier si deux joueurs sont amis.
--
-- Pourquoi le serveur s'en occupe : les relations d'amitié doivent être
-- symétriques et cohérentes. Si le client décidait seul, il pourrait
-- prétendre être ami avec quelqu'un sans son accord. Ici, les deux
-- joueurs doivent accepter explicitement.
--
-- Rejouable : `create table if not exists`, `create or replace function`,
-- `drop policy if exists` et `grant`/`revoke` idempotents.
--
-- Contraintes : aucune écriture directe par un client : RLS active +
-- tout passe par des fonctions security definer avec set search_path = public.

-- --------------------------------------------------------------------------
-- Table des demandes d'ami
-- --------------------------------------------------------------------------
-- `status` : 'pending' (envoyée, en attente), 'accepted' (amis),
-- 'rejected' (rejettée), 'cancelled' (annulée par l'expéditeur).
create table if not exists public.friend_requests (
  id              bigserial primary key,
  sender_id       uuid not null references auth.users (id) on delete cascade,
  recipient_id    uuid not null references auth.users (id) on delete cascade,
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  constraint no_self_friendship check (sender_id <> recipient_id),
  constraint unique_friendship_direction unique (sender_id, recipient_id)
);

create index if not exists friend_requests_recipient_idx
  on public.friend_requests (recipient_id, status, created_at desc);
create index if not exists friend_requests_sender_idx
  on public.friend_requests (sender_id, status, created_at desc);

alter table public.friend_requests enable row level security;

-- Seuls les deux joueurs concernés voient la demande d'ami.
-- Aucune politique d'insertion / mise à jour / suppression : tout passe par
-- les fonctions `security definer`, qui vérifient avant de modifier.
drop policy if exists "ses demandes d'ami, et seulement les siennes" on public.friend_requests;
create policy "ses demandes d'ami, et seulement les siennes"
  on public.friend_requests for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- --------------------------------------------------------------------------
-- Table des amis (relations établies)
-- --------------------------------------------------------------------------
-- Table de complément pour une lecture rapide des amitiés établies.
-- Contient une entrée par paire d'amis (avec l'ID inférieur en premier
-- pour éviter les doublons).
create table if not exists public.friends (
  id              bigserial primary key,
  user1_id        uuid not null references auth.users (id) on delete cascade,
  user2_id        uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  constraint unique_friends unique (user1_id, user2_id),
  constraint no_self_friend check (user1_id <> user2_id)
);

create index if not exists friends_user1_idx on public.friends (user1_id);
create index if not exists friends_user2_idx on public.friends (user2_id);

alter table public.friends enable row level security;

-- Seuls les joueurs concernés voient leurs amis.
drop policy if exists "ses amis, et seulement les siens" on public.friends;
create policy "ses amis, et seulement les siens"
  on public.friends for select
  to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- --------------------------------------------------------------------------
-- Normalisation d'un ID d'utilisateur (vérifie que l'utilisateur existe)
-- --------------------------------------------------------------------------
create or replace function public._friend_user_id(p_uid uuid)
returns uuid
language sql
immutable
set search_path = public
as $$
  select p_uid
  where exists (select 1 from public.profiles p where p.user_id = p_uid)
$$;

-- --------------------------------------------------------------------------
-- Envoyer une demande d'ami
-- --------------------------------------------------------------------------
-- Renvoie `{request, alreadyFriends, existingRequest}`.
-- `alreadyFriends` est vrai si les deux joueurs sont déjà amis.
-- `existingRequest` est la demande existante dans l'autre sens, le cas échéant.
create or replace function public.send_friend_request(
  p_recipient uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_recipient_id uuid := public._friend_user_id(p_recipient);
  v_existing_request public.friend_requests%rowtype;
  v_reverse_request public.friend_requests%rowtype;
  v_friendship public.friends%rowtype;
  v_request public.friend_requests;
  v_sender_name text;
  v_recipient_name text;
begin
  if v_sender_id is null then
    raise exception 'ami : connecte-toi pour envoyer une demande' using errcode = 'P0001';
  end if;
  if v_recipient_id is null then
    raise exception 'ami : ce joueur n''existe pas' using errcode = 'P0001';
  end if;
  if v_sender_id = v_recipient_id then
    raise exception 'ami : tu ne peux pas t''ajouter toi-même' using errcode = 'P0001';
  end if;

  -- Les deux noms sont lus après les contrôles : on ne cherche pas à nommer
  -- quelqu'un dont on vient de refuser la demande.
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_sender_name
  from public.profiles p where p.user_id = v_sender_id;
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_recipient_name
  from public.profiles p where p.user_id = v_recipient_id;

  -- Vérifie s'ils sont déjà amis
  select * into v_friendship
  from public.friends
  where (user1_id = least(v_sender_id, v_recipient_id) and user2_id = greatest(v_sender_id, v_recipient_id))
  limit 1;

  if v_friendship.id is not null then
    return jsonb_build_object(
      'request', null,
      'alreadyFriends', true,
      'existingRequest', null
    );
  end if;

  -- Vérifie s'il y a déjà une demande dans l'autre sens
  select * into v_reverse_request
  from public.friend_requests
  where sender_id = v_recipient_id and recipient_id = v_sender_id and status = 'pending'
  limit 1;

  if v_reverse_request.id is not null then
    return jsonb_build_object(
      'request', null,
      'alreadyFriends', false,
      'existingRequest', jsonb_build_object(
        'id', v_reverse_request.id,
        'senderId', v_reverse_request.sender_id,
        'recipientId', v_reverse_request.recipient_id,
        'senderName', v_recipient_name,
        'recipientName', v_sender_name,
        'status', v_reverse_request.status,
        'createdAt', v_reverse_request.created_at,
        'updatedAt', v_reverse_request.updated_at
      )
    );
  end if;

  -- Puis une demande déjà écrite dans ce sens. On les cherche **sans filtrer
  -- sur le statut** : la contrainte d'unicité porte sur le couple (expéditeur,
  -- destinataire), donc une ancienne demande refusée, annulée, ou l'historique
  -- d'une amitié retirée occupe la place. On la réutilise au lieu d'en créer
  -- une deuxième — sinon, après un retrait d'ami, la nouvelle demande
  -- échouerait sur une violation de contrainte.
  select * into v_existing_request
  from public.friend_requests
  where sender_id = v_sender_id and recipient_id = v_recipient_id
  limit 1;

  if v_existing_request.id is not null then
    if v_existing_request.status <> 'pending' then
      update public.friend_requests
      set status = 'pending', updated_at = now()
      where id = v_existing_request.id
      returning * into v_existing_request;
    end if;

    return jsonb_build_object(
      'request', jsonb_build_object(
        'id', v_existing_request.id,
        'senderId', v_existing_request.sender_id,
        'recipientId', v_existing_request.recipient_id,
        'senderName', v_sender_name,
        'recipientName', v_recipient_name,
        'status', v_existing_request.status,
        'createdAt', v_existing_request.created_at,
        'updatedAt', v_existing_request.updated_at
      ),
      'alreadyFriends', false,
      'existingRequest', null
    );
  end if;

  -- Crée la nouvelle demande
  insert into public.friend_requests (sender_id, recipient_id)
  values (v_sender_id, v_recipient_id)
  returning * into v_request;

  return jsonb_build_object(
    'request', jsonb_build_object(
      'id', v_request.id,
      'senderId', v_request.sender_id,
      'recipientId', v_request.recipient_id,
      'senderName', v_sender_name,
      'recipientName', v_recipient_name,
      'status', v_request.status,
      'createdAt', v_request.created_at,
      'updatedAt', v_request.updated_at
    ),
    'alreadyFriends', false,
    'existingRequest', null
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Accepter une demande d'ami
-- --------------------------------------------------------------------------
-- Renvoie `{request, friendship}`.
create or replace function public.accept_friend_request(
  p_request_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.friend_requests;
  v_friendship public.friends;
  v_sender_name text;
  v_recipient_name text;
begin
  if v_user_id is null then
    raise exception 'ami : connecte-toi pour accepter une demande' using errcode = 'P0001';
  end if;

  select * into v_request
  from public.friend_requests
  where id = p_request_id and recipient_id = v_user_id and status = 'pending'
  for update;

  if v_request.id is null then
    raise exception 'ami : demande introuvable ou pas en attente' using errcode = 'P0001';
  end if;

  -- Met à jour la demande
  update public.friend_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id
  returning * into v_request;

  -- Get names for sender and recipient
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_sender_name
  from public.profiles p where p.user_id = v_request.sender_id;
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_recipient_name
  from public.profiles p where p.user_id = v_request.recipient_id;

  -- Crée l'amitié (dans les deux sens pour simplifier les requêtes, mais on ne stocke qu'une entrée)
  insert into public.friends (user1_id, user2_id)
  values (least(v_request.sender_id, v_request.recipient_id), greatest(v_request.sender_id, v_request.recipient_id))
  on conflict do nothing
  returning * into v_friendship;

  return jsonb_build_object(
    'request', jsonb_build_object(
      'id', v_request.id,
      'senderId', v_request.sender_id,
      'recipientId', v_request.recipient_id,
      'senderName', v_sender_name,
      'recipientName', v_recipient_name,
      'status', v_request.status,
      'createdAt', v_request.created_at,
      'updatedAt', v_request.updated_at
    ),
    'friendship', case when v_friendship.id is not null then
      jsonb_build_object(
        'id', v_friendship.id,
        'user1Id', v_friendship.user1_id,
        'user2Id', v_friendship.user2_id,
        'createdAt', v_friendship.created_at
      )
    else null end
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Rejeter une demande d'ami
-- --------------------------------------------------------------------------
-- Renvoie `{request}`.
create or replace function public.reject_friend_request(
  p_request_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.friend_requests;
  v_sender_name text;
  v_recipient_name text;
begin
  if v_user_id is null then
    raise exception 'ami : connecte-toi pour rejeter une demande' using errcode = 'P0001';
  end if;

  select * into v_request
  from public.friend_requests
  where id = p_request_id and recipient_id = v_user_id and status = 'pending'
  for update;

  if v_request.id is null then
    raise exception 'ami : demande introuvable ou pas en attente' using errcode = 'P0001';
  end if;

  -- Get names for sender and recipient
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_sender_name
  from public.profiles p where p.user_id = v_request.sender_id;
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_recipient_name
  from public.profiles p where p.user_id = v_request.recipient_id;

  update public.friend_requests
  set status = 'rejected', updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return jsonb_build_object(
    'request', jsonb_build_object(
      'id', v_request.id,
      'senderId', v_request.sender_id,
      'recipientId', v_request.recipient_id,
      'senderName', v_sender_name,
      'recipientName', v_recipient_name,
      'status', v_request.status,
      'createdAt', v_request.created_at,
      'updatedAt', v_request.updated_at
    )
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Annuler une demande d'ami envoyée
-- --------------------------------------------------------------------------
-- Renvoie `{request}`.
create or replace function public.cancel_friend_request(
  p_request_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.friend_requests;
  v_sender_name text;
  v_recipient_name text;
begin
  if v_user_id is null then
    raise exception 'ami : connecte-toi pour annuler une demande' using errcode = 'P0001';
  end if;

  select * into v_request
  from public.friend_requests
  where id = p_request_id and sender_id = v_user_id and status = 'pending'
  for update;

  if v_request.id is null then
    raise exception 'ami : demande introuvable ou pas en attente' using errcode = 'P0001';
  end if;

  -- Get names for sender and recipient
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_sender_name
  from public.profiles p where p.user_id = v_request.sender_id;
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_recipient_name
  from public.profiles p where p.user_id = v_request.recipient_id;

  update public.friend_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return jsonb_build_object(
    'request', jsonb_build_object(
      'id', v_request.id,
      'senderId', v_request.sender_id,
      'recipientId', v_request.recipient_id,
      'senderName', v_sender_name,
      'recipientName', v_recipient_name,
      'status', v_request.status,
      'createdAt', v_request.created_at,
      'updatedAt', v_request.updated_at
    )
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Supprimer un ami
-- --------------------------------------------------------------------------
-- Renvoie `{friendship}`.
create or replace function public.remove_friend(
  p_friend uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_friend_id uuid := public._friend_user_id(p_friend);
  v_friendship public.friends;
  v_friend_name text;
begin
  if v_user_id is null then
    raise exception 'ami : connecte-toi pour supprimer un ami' using errcode = 'P0001';
  end if;
  if v_friend_id is null then
    raise exception 'ami : ce joueur n''existe pas' using errcode = 'P0001';
  end if;
  if v_user_id = v_friend_id then
    raise exception 'ami : tu ne peux pas te supprimer toi-même' using errcode = 'P0001';
  end if;

  -- Get friend's name before deleting
  select coalesce(p.display_name, 'Collectionneur inconnu') into v_friend_name
  from public.profiles p where p.user_id = v_friend_id;

  delete from public.friends
  where (user1_id = least(v_user_id, v_friend_id) and user2_id = greatest(v_user_id, v_friend_id))
  returning * into v_friendship;

  if v_friendship.id is null then
    raise exception 'ami : vous n''êtes pas amis' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'friendship', jsonb_build_object(
      'id', v_friendship.id,
      'friendId', v_friend_id,
      'friendName', v_friend_name,
      'createdAt', v_friendship.created_at
    )
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Lister les amis du joueur connecté
-- --------------------------------------------------------------------------
create or replace function public.list_friends()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(row order by row ->> 'createdAt' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', f.id,
             'friendId', case when f.user1_id = auth.uid() then f.user2_id else f.user1_id end,
             'friendName', coalesce(
               case when f.user1_id = auth.uid() then p2.display_name else p1.display_name end,
               'Collectionneur inconnu'
             ),
             'createdAt', f.created_at
           ) as row
    from public.friends f
    left join public.profiles p1 on p1.user_id = f.user1_id
    left join public.profiles p2 on p2.user_id = f.user2_id
    where (f.user1_id = auth.uid() or f.user2_id = auth.uid())
      and auth.uid() is not null
  ) t;
$$;

-- --------------------------------------------------------------------------
-- Lister les demandes d'ami reçues
-- --------------------------------------------------------------------------
create or replace function public.list_incoming_friend_requests()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(row order by row ->> 'createdAt' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', fr.id,
             'senderId', fr.sender_id,
             'senderName', coalesce(p.display_name, 'Collectionneur inconnu'),
             'createdAt', fr.created_at
           ) as row
    from public.friend_requests fr
    left join public.profiles p on p.user_id = fr.sender_id
    where fr.recipient_id = auth.uid() and fr.status = 'pending'
      and auth.uid() is not null
  ) t;
$$;

-- --------------------------------------------------------------------------
-- Lister les demandes d'ami envoyées
-- --------------------------------------------------------------------------
create or replace function public.list_outgoing_friend_requests()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(row order by row ->> 'createdAt' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', fr.id,
             'recipientId', fr.recipient_id,
             'recipientName', coalesce(p.display_name, 'Collectionneur inconnu'),
             'createdAt', fr.created_at
           ) as row
    from public.friend_requests fr
    left join public.profiles p on p.user_id = fr.recipient_id
    where fr.sender_id = auth.uid() and fr.status = 'pending'
      and auth.uid() is not null
  ) t;
$$;

-- --------------------------------------------------------------------------
-- Vérifier si deux joueurs sont amis
-- --------------------------------------------------------------------------
create or replace function public.has_friendship(p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.friends f
    where (f.user1_id = least(auth.uid(), p_user) and f.user2_id = greatest(auth.uid(), p_user))
  )
$$;

-- --------------------------------------------------------------------------
-- Permissions
-- --------------------------------------------------------------------------
-- Seuls les joueurs connectés appellent les fonctions publiques.
revoke all on function public.send_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;

revoke all on function public.accept_friend_request(bigint) from public, anon;
grant execute on function public.accept_friend_request(bigint) to authenticated;

revoke all on function public.reject_friend_request(bigint) from public, anon;
grant execute on function public.reject_friend_request(bigint) to authenticated;

revoke all on function public.cancel_friend_request(bigint) from public, anon;
grant execute on function public.cancel_friend_request(bigint) to authenticated;

revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;

revoke all on function public.list_friends() from public, anon;
grant execute on function public.list_friends() to authenticated;

revoke all on function public.list_incoming_friend_requests() from public, anon;
grant execute on function public.list_incoming_friend_requests() to authenticated;

revoke all on function public.list_outgoing_friend_requests() from public, anon;
grant execute on function public.list_outgoing_friend_requests() to authenticated;

revoke all on function public.has_friendship(uuid) from public, anon;
grant execute on function public.has_friendship(uuid) to authenticated;

-- Les fonctions internes ne s'appellent pas depuis le client.
revoke all on function public._friend_user_id(uuid) from public, anon, authenticated;