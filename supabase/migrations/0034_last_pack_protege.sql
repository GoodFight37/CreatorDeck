-- 0034_last_pack_protege.sql — une Légendaire (et une Live) ne se vole pas
--
-- Décision du 7 octobre 2026, sur la revue externe : le Last Pack reste, mais
-- **pas le vol des plus belles cartes**. Dans un cercle de cinq amis, se faire
-- prendre sa Légendaire du soir tue l'envie de continuer plus vite qu'un bug ;
-- et une variante Live n'existe que parce que son créateur streamait à cet
-- instant précis — elle ne se rachète pas, ne s'artisane pas, ne se retire pas
-- deux fois.
--
-- Ce qui reste volable : exactement ce que le jeu appelle un **doublon** — les
-- cartes ordinaires, dont le propriétaire a déjà une copie. C'est la même
-- monnaie que l'Atelier et les échanges.
--
-- Deux fonctions sont reprises, à l'identique, avec une règle en plus :
--
--   * `_last_pack_cards()` ajoute `stealable` à chaque carte : l'écran grise
--     ce qui ne se prend pas, au lieu de laisser le doigt le découvrir ;
--   * `last_pack_steal()` refuse la carte protégée **avant** de verrouiller
--     quoi que ce soit. C'est la ceinture côté serveur : un client trafiqué ne
--     prend pas une Légendaire parce que l'écran ne l'affichait pas.
--
-- Mêmes signatures qu'en vigueur : `create or replace` **remplace** les deux
-- fonctions. Pas de `drop`, pas de surcharge possible.
--
-- Le reste du Last Pack ne bouge pas : la fenêtre de dix minutes, un vol par
-- jour, l'amitié exigée, les pertes racontées dans le carnet.

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
        ),
        -- Ce qui **ne se prend pas** (0034) : une Légendaire, et une carte
        -- Live. Un cercle de cinq amis ne doit pas pouvoir se prendre sa plus
        -- belle carte, et une variante Live n'existe que parce que le créateur
        -- streamait à cet instant — elle ne se refait pas.
        'stealable', (t.card ->> 'rarity') <> 'legendary'
                     and (t.card ->> 'variant') <> 'live'
      )
      order by t.ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_pack.cards) with ordinality as t (card, ord);
$$;

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

  -- Ce qui ne se vole pas (0034). Le refus est ici, avant tout verrouillage :
  -- rien n'est verrouillé, rien n'a bougé, et le message dit pourquoi — la
  -- version loterie du même geste (l'écran grise déjà la carte, ceci est la
  -- ceinture qui vaut même si un client trafiqué appelle la fonction).
  if (v_card ->> 'rarity') = 'legendary' then
    raise exception 'vol : une Légendaire ne se vole pas' using errcode = 'P0001';
  end if;
  if (v_card ->> 'variant') = 'live' then
    raise exception 'vol : une carte Live ne se vole pas' using errcode = 'P0001';
  end if;

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
-- Les droits, réécrits pour que ce fichier se lise seul
-- --------------------------------------------------------------------------
-- Remplacer une fonction garde ses droits en Postgres ; on les réécrit quand
-- même, comme les autres migrations du projet : quelqu'un qui lit `0034`
-- n'a pas à ouvrir `0012` pour savoir qui peut appeler quoi.
revoke all on function public._last_pack_cards(public.last_packs)
  from public, anon, authenticated;

revoke all on function public.last_pack_steal(bigint, integer) from public, anon;
grant execute on function public.last_pack_steal(bigint, integer) to authenticated;
