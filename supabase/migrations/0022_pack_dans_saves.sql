-- ==========================================================================
-- 0022 — Le tirage écrit dans la collection
-- ==========================================================================
--
-- ## Ce que `0021` laissait béant
--
-- Depuis `0021`, le serveur **tire** les cartes, les journalise
-- (`pack_draws`) et inscrit les droits (`card_claims`) — mais il ne les range
-- pas : c'est le client qui poussait la sauvegarde avec `force: true`. Trois
-- conséquences, toutes mauvaises :
--
--   1. entre la réponse du serveur et l'envoi du client, un crash (onglet tué,
--      téléphone posé, batterie) perdait les cinq cartes — elles existaient au
--      registre, mais dans personne ;
--   2. `force: true` écrasait la partie de l'autre appareil, sans un mot ;
--   3. le client décidait des identifiants des cartes, donc les deux appareils
--      pouvaient ranger la même carte deux fois.
--
-- ## Ce que fait cette migration
--
-- `open_pack()` et `open_scene_pack()` écrivent la collection **dans la même
-- transaction** que le journal, le registre et la réserve : les cartes ont des
-- identifiants et un instant **du serveur**, et la ligne `saves` renvoyée au
-- client est celle qui vient d'être écrite. Le client n'a plus rien à pousser
-- après un tirage : il range.
--
-- `push_save()` n'arbitre plus les conflits avec l'horloge de l'appareil :
-- c'est la version serveur reçue par le client (`p_base_updated_at`) qui dit
-- s'il part de la bonne ligne. Un téléphone en avance ne gagne plus tout.
--
-- ## Le blanchiment, fermé à la source
--
-- `0021` déclassait une carte sans provenance, mais laissait la fabriquer :
-- une copie inventée, acceptée comme « suspecte », pouvait être **offerte en
-- échange** ou **déposée à l'hôtel** — et le destinataire recevait alors un
-- droit (`card_claim_add`) sur une carte qui n'a jamais existé. Le droit de
-- l'un blanchissait la carte de l'autre.
--
-- Désormais `create_trade()`, `respond_trade()`, `market_sell()` et
-- `market_buy()` refusent ce que le registre ne couvre pas. La règle est la
-- même que dans `save_suspicions()` : une carte est couverte si le registre la
-- porte, **ou** si l'atelier peut la produire (Standard, commune à épique —
-- l'artisanat vit sur l'appareil et n'a pas de registre).
--
-- Ce que cette migration **ne fait pas** : consommer un droit quand une carte
-- quitte la collection (recyclage, envoi). Un joueur qui possédait vraiment une
-- carte et s'en sépare garde donc son droit, et pourrait recréer **une** copie
-- de ce qu'il a réellement possédé. C'est borné, et ça se fermera le jour où le
-- recyclage passera par le serveur (voir `docs/revue-externe-2026-10.md`).

-- --------------------------------------------------------------------------
-- 1. Un helper : ce que le registre ne couvre pas
-- --------------------------------------------------------------------------
-- Renvoie la liste (au plus un exemplaire par couple) des cartes d'un lot
-- qu'aucun droit ni artisanat ne justifie. Partagé par les échanges, l'hôtel et
-- `save_suspicions()` — une seule règle, un seul endroit.
create or replace function public.card_claim_covers(p_user uuid, p_cards jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with demand as (
    select lower(c ->> 'creatorSlug') as slug,
           coalesce(c ->> 'rarity', '') as rarity,
           coalesce(nullif(c ->> 'variant', ''), 'standard') as variant,
           count(*)::int as n,
           (array_agg(c order by (c ->> 'id')))[1] as sample
      from jsonb_array_elements(coalesce(p_cards, '[]'::jsonb)) as c
     where coalesce(c ->> 'creatorSlug', '') <> ''
     group by 1, 2, 3
  )
  select coalesce(jsonb_agg(d.sample), '[]'::jsonb)
    from demand d
    left join lateral (
      select sum(qty)::int as qty
        from public.card_claims
       where user_id = p_user
         and creator_slug = d.slug
         and rarity = d.rarity
         and variant = d.variant
    ) claims on true
   -- L'artisanat local produit du Standard, commune à épique : la Légendaire
   -- ne s'artisane pas (`craftCost = null` côté moteur), donc elle doit venir
   -- du serveur, comme toute variante Live / Holo / Gold.
   where coalesce(claims.qty, 0) < d.n
     and not (d.variant = 'standard' and d.rarity <> 'legendary');
$$;

revoke all on function public.card_claim_covers(uuid, jsonb) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Écrire les cartes dans la collection (une seule fois, bien)
-- --------------------------------------------------------------------------
-- Appelée par les deux tirages. Elle **verrouille** la ligne, la crée si elle
-- n'existe pas (compte neuf qui ouvre un booster avant son premier envoi), et
-- renvoie la ligne écrite — c'est elle que le client range.
create or replace function public._save_add_pack_cards(
  p_user       uuid,
  p_cards      jsonb,
  p_packs      integer,
  p_last_regen timestamptz,
  p_openings   integer,
  p_now        timestamptz
)
returns public.saves
language plpgsql
security definer
set search_path = public
as $$
declare
  v_save public.saves;
  v_state jsonb;
  v_now_ms bigint := (extract(epoch from p_now) * 1000)::bigint;
begin
  select * into v_save from public.saves s where s.user_id = p_user for update;

  if v_save.user_id is null then
    -- État minimal : la partie locale du joueur arrive avec son premier envoi
    -- (l'auto-envoi suit dans les secondes qui viennent). Ici, on ne perd
    -- jamais une carte tirée, même sur un compte qui n'a encore rien poussé.
    v_state := jsonb_build_object(
      'version', 1,
      'playerId', p_user::text,
      'createdAt', v_now_ms,
      'updatedAt', v_now_ms,
      'level', 1,
      'xp', 0,
      'points', 0,
      'hourglasses', 0,
      'packs', p_packs,
      'lastPackRegen', (extract(epoch from p_last_regen) * 1000)::bigint,
      'openings', p_openings,
      'cards', '[]'::jsonb,
      'claimedTiers', '[]'::jsonb,
      'themeId', 'default'
    );
    insert into public.saves (user_id, state, save_version, device_updated_at, state_checksum, updated_at)
    values (p_user, v_state, 1, v_now_ms, md5(v_state::text), p_now)
    returning * into v_save;
  end if;

  v_state := v_save.state;
  v_state := jsonb_set(v_state, '{cards}', coalesce(v_state -> 'cards', '[]'::jsonb) || coalesce(p_cards, '[]'::jsonb), true);
  v_state := jsonb_set(v_state, '{packs}', to_jsonb(greatest(0, p_packs)), true);
  v_state := jsonb_set(v_state, '{lastPackRegen}', to_jsonb((extract(epoch from p_last_regen) * 1000)::bigint), true);
  v_state := jsonb_set(v_state, '{openings}', to_jsonb(greatest(0, p_openings)), true);
  v_state := jsonb_set(v_state, '{updatedAt}', to_jsonb(v_now_ms), true);
  -- Le numéro de version du format reste celui du client : le serveur ne
  -- connaît pas les champs de la partie locale, il ne fait que les recopier.
  v_state := jsonb_set(v_state, '{version}', to_jsonb(coalesce((v_state ->> 'version')::int, 1)), true);

  update public.saves
     set state = v_state,
         state_checksum = md5(v_state::text),
         device_updated_at = v_now_ms,
         updated_at = p_now
   where user_id = p_user
  returning * into v_save;

  return v_save;
end;
$$;

revoke all on function public._save_add_pack_cards(uuid, jsonb, integer, timestamptz, integer, timestamptz)
  from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Le profil d'attente ne peut plus faire échouer une sauvegarde
-- --------------------------------------------------------------------------
-- `ensure_profile()` de `0001` fabrique le pseudo affiché au classement quand un
-- joueur enregistre pour la première fois : « Collectionneur # » suivi des
-- **quatre** premiers caractères de son identifiant. Quatre caractères, c'est
-- 65 536 noms possibles : deux joueurs finissent par tomber sur le même, et
-- `_display_name_unique()` (`0020`) refuse alors le doublon — proprement, mais
-- cela fait **échouer la sauvegarde entière** de l'innocent qui arrive en
-- second (et, depuis cette migration, l'ouverture du booster qui l'accompagne).
--
-- On allonge donc le suffixe jusqu'à trouver un nom libre. Le nom reste borné à
-- 24 caractères (`profiles.display_name`) : 15 + 9 = 24. Si les neuf premiers
-- caractères sont tous pris — plus de joueurs que le jeu n'en verra —, la
-- sauvegarde passe malgré tout, sans profil : `player_profile()` retombe sur
-- « Collectionneur ».
create or replace function public.ensure_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := replace(new.user_id::text, '-', '');
  v_len  integer;
begin
  for v_len in 4..9 loop
    begin
      insert into public.profiles (user_id, display_name)
      values (new.user_id, 'Collectionneur #' || left(v_slug, v_len))
      on conflict (user_id) do nothing;
      return new;
    exception when others then
      -- Nom déjà porté par un autre joueur : on essaie un suffixe plus long.
      null;
    end;
  end loop;
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- 4. Le tirage écrit la collection
-- --------------------------------------------------------------------------

create or replace function public.open_pack(p_jackpot text default 'perfect')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_state record;
  v_now timestamptz := now();
  v_refreshed jsonb;
  v_packs integer;
  v_last_regen timestamptz;
  v_openings integer;
  v_rare_drop boolean;
  v_weights jsonb;
  v_used text[] := '{}';
  v_cards jsonb := '[]'::jsonb;
  v_card jsonb;
  v_slug text;
  v_rarity text;
  v_variant text;
  v_drawn jsonb[] := '{}';
  v_i integer;
  v_live text[];
  v_pity integer;
  v_streak integer;
  v_jackpot boolean := false;
  v_line public.saves;
begin
  -- Authentification obligatoire.
  if v_user_id is null then
    raise exception 'tirage : connecte-toi pour ouvrir un booster' using errcode = 'P0001';
  end if;

  -- ------------------------------------------------------------------
  -- La réserve de boosters.
  --
  -- Elle naît à **trois boosters, maintenant**, et c'est le serveur qui la
  -- fait vivre. Avant, cette ligne reprenait `packs` et `lastPackRegen` de la
  -- sauvegarde du client : un compteur que le joueur contrôle n'a rien à faire
  -- dans une réserve serveur (le gonfler offrait des boosters gratuits).
  -- ------------------------------------------------------------------
  insert into public.pack_state (user_id, packs, last_regen_at, openings, updated_at)
  values (v_user_id, 3, v_now, 0, v_now)
  on conflict (user_id) do nothing;

  -- Verrou de ligne : deux tirages simultanés ne peuvent plus lire la même
  -- réserve et la dépenser deux fois (l'un attend l'autre).
  select ps.packs, ps.last_regen_at, ps.openings
    into v_state
    from public.pack_state ps
   where ps.user_id = v_user_id
     for update;

  -- ------------------------------------------------------------------
  -- Recharge (identique à refreshBalances du moteur local).
  -- ------------------------------------------------------------------
  -- Recharge (même calcul que open_pack, sans consommer).
  v_refreshed := public._pack_refresh(
    v_state.packs,
    4,                                              -- PACKS.live.max
    v_state.last_regen_at,
    1800000,                                        -- PACKS.live.regenMs (30 min en ms)
    v_now
  );

  v_packs := (v_refreshed ->> 'packs')::integer;
  v_last_regen := (v_refreshed ->> 'last_regen_at')::timestamptz;
  v_openings := v_state.openings;

  -- ------------------------------------------------------------------
  -- Pas de booster → exception lisible (le client affichera le compte à
  -- rebours via pack_status()).
  -- ------------------------------------------------------------------
  if v_packs < 1 then
    raise exception 'tirage : aucun booster disponible pour le moment' using errcode = 'P0001';
  end if;

  -- ------------------------------------------------------------------
  -- Tirage des 5 cartes.
  -- ------------------------------------------------------------------
  -- ------------------------------------------------------------------
  -- Qui streame, maintenant (cache du serveur, moins de dix minutes).
  -- NULL ou vide : le bonus Direct est neutre et aucune variante Live ne
  -- sortira — exactement la règle du moteur local.
  -- ------------------------------------------------------------------
  v_live := public._direct_live_logins();

  -- ------------------------------------------------------------------
  -- Plancher de malchance et série de jours.
  --
  -- Les deux sont **déduits du journal des tirages**, pas d'un compteur que
  -- le client enverrait : `pack_draws` n'est écrit que par cette fonction,
  -- donc le joueur ne peut pas s'offrir une garantie en trafiquant sa
  -- sauvegarde. Et comme rien n'est stocké, il n'y a rien à resynchroniser.
  -- ------------------------------------------------------------------
  v_pity := public._pack_pity(v_user_id);
  v_streak := public._pack_streak(v_user_id, v_now);

  -- Le 7ᵉ jour d'affilée offre un « Perfect » garanti, une fois — il attend
  -- tant qu'il n'a pas été dépensé (un Perfect déjà sorti aujourd'hui compte :
  -- le joueur a eu sa carte). Le joueur peut préférer 3 sabliers
  -- (`p_jackpot`) : cette monnaie ne vit que sur l'appareil, le serveur se
  -- contente alors de ne pas forcer le tirage — il n'y a rien à y gagner, et
  -- rien à tricher.
  v_jackpot := v_streak % 7 = 0
               and coalesce(p_jackpot, 'perfect') <> 'hourglasses'
               and not public._pack_perfect_today(v_user_id, v_now);

  -- ------------------------------------------------------------------
  -- Perfect : 1‰ de chance (identique au moteur local), ou garanti par le
  -- plancher de malchance (80 boosters sans Légendaire) ou par la série.
  v_rare_drop := v_jackpot
                 or v_pity + 1 >= 80
                 or public._pack_random_int(1000) < 1;

  v_drawn := '{}';

  -- 4 slots ordinaires (les poids montent au fil du booster).
  for v_i in 1..4 loop
    -- Poids du slot courant (ou du Perfect si activé).
    -- Source : src/data/pull-rates.json
    if v_rare_drop then
      v_weights := '{"epic": 82, "legendary": 18}'::jsonb;
    elsif v_i = 1 then
      v_weights := '{"common": 42, "uncommon": 30, "rare": 18, "epic": 8, "legendary": 2}'::jsonb;
    elsif v_i = 2 then
      v_weights := '{"common": 42, "uncommon": 30, "rare": 18, "epic": 8, "legendary": 2}'::jsonb;
    elsif v_i = 3 then
      v_weights := '{"common": 34, "uncommon": 32, "rare": 22, "epic": 10, "legendary": 2}'::jsonb;
    else
      v_weights := '{"common": 20, "uncommon": 34, "rare": 28, "epic": 15, "legendary": 3}'::jsonb;
    end if;

    v_slug := public._pack_choose_creator(v_weights, v_used);
    v_used := v_used || v_slug;

    select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
    v_variant := public._pack_choose_variant(
      v_rarity,
      v_rare_drop,
      v_slug = any (coalesce(v_live, '{}'::text[]))
    );

    v_card := jsonb_build_object(
      -- Identifiant et instant **du serveur** : c'est cette carte-là qui entre
      -- dans la sauvegarde, et le client la range telle quelle. S'il en
      -- inventait un autre, la même carte existerait en double le jour où les
      -- deux sauvegardes se rejoignent.
      'id', gen_random_uuid()::text,
      'obtainedAt', (extract(epoch from v_now) * 1000)::bigint,
      'creatorSlug', v_slug,
      'rarity', v_rarity,
      'variant', v_variant,
      'rareDrop', v_rare_drop
    );
    v_drawn := v_drawn || v_card;
  end loop;

  -- Slot garanti : Rare ou mieux, variante « live » imposée. Sous le plancher
  -- de malchance, il est **Légendaire** — c'est la garantie publiée, et elle
  -- ne se négocie pas : le tirage des quatre premières cartes ne change
  -- qu'une chose, la présence d'un Légendaire par chance.
  if v_pity + 1 >= 80 or v_jackpot then
    v_weights := '{"legendary": 1}'::jsonb;
  elsif v_rare_drop then
    v_weights := '{"epic": 82, "legendary": 18}'::jsonb;
  else
    v_weights := '{"rare": 82, "epic": 15, "legendary": 3}'::jsonb;
  end if;

  v_slug := public._pack_choose_creator(v_weights, v_used);
  v_used := v_used || v_slug;

  select c.rarity into v_rarity from public.creators c where c.slug = v_slug;
  -- La carte garantie est Live quand son créateur streame : c'est le moment
  -- fort du paquet, et il porte alors la preuve de présence. Sinon la table
  -- des variantes s'applique, comme pour n'importe quelle carte.
  v_card := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'obtainedAt', (extract(epoch from v_now) * 1000)::bigint,
    'creatorSlug', v_slug,
    'rarity', v_rarity,
    'variant', case
                 when v_slug = any (coalesce(v_live, '{}'::text[])) then 'live'
                 else public._pack_choose_variant(v_rarity, v_rare_drop, false)
               end,
    'rareDrop', v_rare_drop
  );
  v_drawn := v_drawn || v_card;

  -- ------------------------------------------------------------------
  -- Construction du tableau JSON, dans l'ordre du tirage.
  -- ------------------------------------------------------------------
  -- Pas de mélange : la carte garantie (dernier slot) doit rester la dernière
  -- révélée, comme dans un vrai booster. L'app révèle les cartes dans cet
  -- ordre, et c'est ce qui fait le moment fort de l'ouverture.
  -- (Le mélange Fisher-Yates d'origine a été retiré ; il gâchait cet ordre.)
  for v_i in 1..array_length(v_drawn, 1) loop
    v_cards := v_cards || v_drawn[v_i];
  end loop;

  -- ------------------------------------------------------------------
  -- Mise à jour de la réserve : -1 booster, +1 ouverture.
  -- ------------------------------------------------------------------
  update public.pack_state
     set packs = v_packs - 1,
         last_regen_at = v_last_regen,
         openings = v_openings + 1,
         updated_at = v_now
   where user_id = v_user_id;

  -- Journal d'audit.
  insert into public.pack_draws (user_id, drawn_at, cards)
  values (v_user_id, v_now, v_cards);

  -- Registre des droits : ces cinq cartes viennent du serveur. C'est ce qui
  -- permettra plus tard de distinguer une Légendaire tirée d'une Légendaire
  -- inventée dans une sauvegarde (voir `save_suspicions`).
  perform public.card_claim_add(v_user_id, v_cards, 'tirage');

  -- ------------------------------------------------------------------
  -- La collection, écrite ici, dans la même transaction.
  -- ------------------------------------------------------------------
  -- C'est le cœur de `0022` : avant, le serveur tirait les cartes mais ne les
  -- rangeait pas — c'est le client qui les poussait (`push(..., true)`), et
  -- entre les deux il y avait la place pour un crash (cartes perdues) ou pour
  -- l'écrasement d'un second appareil (`force`). Le client redevient ce qu'il
  -- aurait dû être : un afficheur. Il reçoit la ligne écrite, et la range.
  v_line := public._save_add_pack_cards(v_user_id, v_cards, v_packs - 1, v_last_regen, v_openings + 1, v_now);

  return jsonb_build_object(
    'packs', v_packs - 1,
    'last_regen_at', v_last_regen,
    'openings', v_openings + 1,
    'cards', v_cards,
    -- Ce que l'écran affiche : le compteur de malchance **après** ce tirage,
    -- la série de jours, et si ce booster a payé la garantie ou le jackpot.
    'pity', public._pack_pity(v_user_id),
    'streak', v_streak,
    'pity_hit', v_pity + 1 >= 80,
    'jackpot', v_jackpot,
    -- La ligne telle qu'elle est en base après écriture : le client s'en sert
    -- comme point de départ, et comme base pour son prochain envoi.
    'save', to_jsonb(v_line)
  );
end;
$$;


create or replace function public.open_scene_pack(
  p_family text,
  p_cards jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_day date;
  v_choices jsonb;
  v_rare_drop boolean;
  v_slugs text[] := '{}';
  v_card jsonb;
  v_slug text;
  v_rarity text;
  v_variant text;
  v_slot jsonb;
  v_i integer;
  v_clean jsonb := '[]'::jsonb;
  v_line public.saves;
  v_state record;
begin
  if v_user_id is null then
    raise exception 'paquet scène : connecte-toi pour ouvrir' using errcode = 'P0001';
  end if;

  -- Deux ouvertures simultanées du même jour : la ligne n'existe pas encore au
  -- premier appel, donc il n'y a rien à verrouiller — on prend un verrou
  -- consultatif par joueur, tenu jusqu'à la fin de la transaction.
  perform pg_advisory_xact_lock(hashtext('scene:' || v_user_id::text));

  v_day := public._pack_game_day(v_now);

  if exists (
    select 1 from public.pack_scene s
     where s.user_id = v_user_id
       and s.scene_day = v_day
  ) then
    raise exception 'paquet scène : ton paquet du jour est déjà ouvert' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) <> 5 then
    raise exception 'paquet scène : il faut exactement cinq cartes' using errcode = 'P0001';
  end if;

  -- Les choix recalculés : la réponse doit être identique à celle que le client
  -- a reçue (le tirage est déterministe pour le joueur et la journée).
  v_choices := public.scene_pack_choices(p_family);
  v_rare_drop := coalesce((v_choices ->> 'rare_drop')::boolean, false);

  for v_i in 0..4 loop
    v_card := p_cards -> v_i;
    if v_card is null then
      raise exception 'paquet scène : carte manquante (position %)', v_i + 1 using errcode = 'P0001';
    end if;

    v_slug := v_card ->> 'creatorSlug';
    v_rarity := v_card ->> 'rarity';
    v_variant := coalesce(v_card ->> 'variant', 'standard');
    v_slot := (v_choices -> 'choices') -> v_i;

    -- La carte exacte (créateur, rareté, variante) doit figurer dans le choix
    -- du slot. `@>` sur un tableau JSONB compare les objets : la moindre
    -- différence de variante fait échouer la vérification.
    if not (v_slot @> jsonb_build_array(jsonb_build_object(
      'slug', v_slug, 'rarity', v_rarity, 'variant', v_variant
    ))) then
      raise exception 'paquet scène : la carte « % » n''est pas proposée en position %',
        coalesce(v_slug, '?'), v_i + 1 using errcode = 'P0001';
    end if;

    if v_slug = any (v_slugs) then
      raise exception 'paquet scène : deux fois le même créateur dans un paquet'
        using errcode = 'P0001';
    end if;
    v_slugs := v_slugs || v_slug;

    -- La carte normalisée : c'est celle-là que le client rangera. Le drapeau du
    -- tirage rare vient du serveur, pas du client.
    v_clean := v_clean || jsonb_build_object(
      'id', gen_random_uuid()::text,
      'obtainedAt', (extract(epoch from v_now) * 1000)::bigint,
      'creatorSlug', v_slug,
      'rarity', v_rarity,
      'variant', v_variant,
      'rareDrop', v_rare_drop
    );
  end loop;

  insert into public.pack_scene (user_id, scene_day, family_id, opened_at)
  values (v_user_id, v_day, p_family, v_now)
  on conflict (user_id) do update
    set scene_day = excluded.scene_day,
        family_id = excluded.family_id,
        opened_at = excluded.opened_at;

  -- Le journal des tirages garde une trace du paquet. `_pack_pity()` et
  -- `_pack_streak()` ne comptent que les Légendaires (il n'y en a jamais ici)
  -- et `_pack_perfect_today()` que le tirage rare : un Paquet Scène ordinaire
  -- ne touche donc ni au plancher de malchance, ni à la série, ni à la
  -- récompense du 7ᵉ jour. En revanche, le Last Pack le voit passer — cinq
  -- cartes fraîches, exposées dix minutes — et c'est voulu.
  insert into public.pack_draws (user_id, drawn_at, cards, kind)
  values (v_user_id, v_now, v_clean, 'scene');

  perform public.card_claim_add(v_user_id, v_clean, 'scene');

  -- Même règle que le Live Drop : les cartes sont rangées **ici**, pas par le
  -- client. La réserve de boosters ne bouge pas — un Paquet Scène ne consomme
  -- rien — mais la ligne est écrite, donc rien ne se perd si l'appareil tombe.
  select ps.packs, ps.last_regen_at, ps.openings
    into v_state
    from public.pack_state ps
   where ps.user_id = v_user_id;

  v_line := public._save_add_pack_cards(
    v_user_id, v_clean,
    coalesce(v_state.packs, 3),
    coalesce(v_state.last_regen_at, v_now),
    coalesce(v_state.openings, 0),
    v_now
  );

  return jsonb_build_object(
    'family', p_family,
    'scene_day', v_day,
    'rare_drop', v_rare_drop,
    'cards', v_clean,
    'save', to_jsonb(v_line)
  );
end;
$$;


-- --------------------------------------------------------------------------
-- 5. L'envoi n'arbitre plus avec l'horloge de l'appareil
-- --------------------------------------------------------------------------
-- L'ancienne signature (quatre arguments) est **supprimée** : un client
-- ancien qui l'appellerait encore doit échouer franchement, pas écrire en
-- contournant le nouvel arbitrage.
drop function if exists public.push_save(jsonb, integer, bigint, boolean);

create or replace function public.push_save(
  p_state             jsonb,
  p_save_version      integer,
  p_device_updated_at bigint,
  p_force             boolean default false,
  -- La version serveur que le client a reçue au dernier échange (pull, envoi
  -- ou tirage). C'est **elle** qui dit si le client part de la bonne ligne —
  -- pas l'horloge de l'appareil.
  p_base_updated_at   timestamptz default null
)
returns jsonb
language plpgsql
security definer
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
    -- ------------------------------------------------------------------
    -- L'arbitrage ne lit plus l'horloge de l'appareil.
    -- ------------------------------------------------------------------
    -- Avant : `existing.device_updated_at > p_device_updated_at` décidait du
    -- conflit. Un téléphone dont l'horloge avance d'une heure gagnait donc
    -- **tous** les conflits en silence, et écrasait la partie de l'autre
    -- appareil. `p_device_updated_at` reste écrit, mais comme métadonnée :
    -- « cette partie a été vue sur tel appareil à telle heure ».
    --
    -- Ce qui décide maintenant : le client envoie la version serveur qu'il a
    -- reçue (`p_base_updated_at`). Si la ligne en base a bougé depuis (un
    -- autre appareil, ou un tirage écrit par le serveur), c'est un conflit, et
    -- l'écran propose de charger ou d'écraser. `p_force` reste réservé au
    -- bouton explicite « Envoyer », jamais à un envoi automatique.
    --
    -- La comparaison tolère **une milliseconde** : un client JavaScript ne
    -- connaît que les millisecondes (`Date`), alors que Postgres garde les
    -- microsecondes. Sans cette marge, chaque envoi honnête arriverait avec une
    -- version tronquée, donc strictement plus ancienne que celle du serveur —
    -- et tout le monde verrait un conflit permanent.
    if not p_force
       and (
         p_base_updated_at is null
         or existing.updated_at > p_base_updated_at + interval '1 millisecond'
       ) then
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


revoke all on function public.push_save(jsonb, integer, bigint, boolean, timestamptz) from public, anon;
grant execute on function public.push_save(jsonb, integer, bigint, boolean, timestamptz) to authenticated;

-- --------------------------------------------------------------------------
-- 6. Échanges et hôtel : refuser ce que le registre ne couvre pas
-- --------------------------------------------------------------------------
-- Le blanchiment se ferme aux quatre portes : proposer un échange, l'accepter,
-- déposer à l'hôtel, et acheter (une annonce peut dater d'avant `0022`).

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
  v_unproven jsonb;
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

  -- Provenance : on ne propose pas ce qu'on ne peut pas justifier.
  --
  -- Sans ce contrôle, une copie fabriquée (une Légendaire ou une variante
  -- spéciale déposée dans la sauvegarde, acceptée mais « suspecte ») pouvait
  -- être offerte en échange : le destinataire recevait alors un **droit**
  -- (`card_claim_add`) pour une carte qui n'a jamais existé. C'est du
  -- blanchiment, et il se ferme ici, à la source.
  v_unproven := public.card_claim_covers(v_user_id, v_given);
  if jsonb_array_length(v_unproven) > 0 then
    raise exception 'echange : % n''a pas de provenance vérifiable (ni tirage, ni échange, ni hôtel, ni vol)',
      coalesce(v_unproven -> 0 ->> 'creatorSlug', 'cette carte') using errcode = 'P0001';
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
  v_unproven jsonb;
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

  -- Registre des droits, **avant** l'écriture des sauvegardes : le contrôle de
  -- provenance des cartes reçues doit les voir comme légitimes (le trigger de
  -- statistiques tourne sur l'écriture qui suit).
  -- Provenance vérifiée **avant** d'inscrire le moindre droit : une carte
  -- fabriquée ne se blanchit pas chez le partenaire. Le contrôle est refait
  -- ici (et pas seulement à la création de l'offre) parce qu'une carte peut
  -- avoir bougé entre-temps.
  v_unproven := public.card_claim_covers(v_trade.proposer_id, v_trade.proposer_cards);
  if jsonb_array_length(v_unproven) > 0 then
    raise exception 'echange : le proposeur offre % sans provenance vérifiable',
      coalesce(v_unproven -> 0 ->> 'creatorSlug', 'une carte') using errcode = 'P0001';
  end if;
  v_unproven := public.card_claim_covers(v_trade.recipient_id, v_trade.recipient_cards);
  if jsonb_array_length(v_unproven) > 0 then
    raise exception 'echange : % n''a pas de provenance vérifiable',
      coalesce(v_unproven -> 0 ->> 'creatorSlug', 'cette carte') using errcode = 'P0001';
  end if;

  perform public.card_claim_add(v_trade.proposer_id, v_trade.recipient_cards, 'echange');
  perform public.card_claim_add(v_trade.recipient_id, v_trade.proposer_cards, 'echange');

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

  -- Une carte épinglée qui part en échange quitte la vitrine publique.
  perform public._trade_clean_showcase(v_trade.proposer_id, v_proposer_state);
  perform public._trade_clean_showcase(v_trade.recipient_id, v_recipient_state);

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
  v_unproven jsonb;
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

  -- Provenance : on ne dépose pas une carte que le serveur n'a jamais donnée.
  -- L'hôtel est l'autre porte de sortie des cartes : sans ce contrôle, une
  -- copie fabriquée s'y vendait, et l'acheteur repartait avec un droit dessus
  -- — le blanchiment par une autre porte.
  v_unproven := public.card_claim_covers(v_user_id, jsonb_build_array(
    jsonb_build_object(
      'creatorSlug', v_card ->> 'creatorSlug',
      'rarity', v_rarity,
      'variant', v_variant
    )
  ));
  if jsonb_array_length(v_unproven) > 0 then
    raise exception 'hotel : cette carte n''a pas de provenance vérifiable (ni tirage, ni échange, ni hôtel, ni vol)'
      using errcode = 'P0001';
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
  v_unproven jsonb;
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

  -- Ceinture et bretelles : l'annonce a été créée à partir d'une carte
  -- vérifiée (`market_sell`), mais une annonce peut dater d'avant `0022`.
  -- L'acheteur ne reçoit un droit que si le vendeur en avait un.
  v_unproven := public.card_claim_covers(v_listing.seller_id, jsonb_build_array(
    jsonb_build_object(
      'creatorSlug', v_listing.creator_slug,
      'rarity', v_listing.rarity,
      'variant', v_listing.variant
    )
  ));
  if jsonb_array_length(v_unproven) > 0 then
    raise exception 'hotel : cette carte n''a pas de provenance vérifiable'
      using errcode = 'P0001';
  end if;

  perform public.card_claim_add(v_user_id, jsonb_build_array(v_card), 'hotel');

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
-- Ce que cette migration laisse en place (et pourquoi)
-- --------------------------------------------------------------------------
-- * Le registre `card_claims` ne se lit toujours pas depuis un client ;
-- * `save_suspicions()` garde sa règle (même couverture que
--   `card_claim_covers()`, appliquée à la collection entière) : une carte de
--   valeur sans provenance reste **déclassée**, pas supprimée ;
-- * la monnaie (points, sabliers, jetons) reste locale : le serveur l'ignore
--   et recopie ce que le client lui envoie ;
-- * les droits ne sont pas consommés quand une carte s'en va (recyclage,
--   envoi) — c'est borné et documenté en tête de fichier.
-- * le pseudo d'attente `Collectionneur #…` grandit au lieu d'échouer : deux
--   joueurs dont l'identifiant commence pareil ne se bloquent plus la
--   sauvegarde l'un l'autre.
