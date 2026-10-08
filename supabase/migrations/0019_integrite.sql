-- ==========================================================================
-- 0019 — Intégrité : la sauvegarde, la réserve, le classement
-- ==========================================================================
--
-- Trois portes étaient ouvertes. Elles sont fermées ici, sans toucher à ce qui
-- marche (le jeu hors ligne, la monnaie locale, les échanges).
--
--   1. **La sauvegarde s'écrivait directement.** `saves` portait une politique
--      RLS « sa ligne, et seulement la sienne » valable pour *toutes* les
--      opérations : un client pouvait donc faire un `PATCH /saves` en
--      contournant `push_save()` et ses contrôles, et s'injecter des
--      Légendaires — que les échanges et l'hôtel relisent ensuite. Seules les
--      fonctions du serveur écrivent désormais.
--   2. **La réserve de boosters se croyait sur la parole du client.** À sa
--      création, `pack_state` recopiait `packs` et `lastPackRegen` de la
--      sauvegarde locale. Elle naît maintenant à trois boosters, maintenant.
--   3. **Le classement se contentait d'une rareté déclarée.** `save_problems()`
--      vérifiait qu'une rareté existait, pas qu'elle était la bonne : une carte
--      commune pouvait se déclarer légendaire. `save_suspicions()` compare au
--      catalogue, et une sauvegarde suspecte n'est plus classée (sans être
--      refusée : le joueur garde ses cartes).
--
-- Au passage, deux verrous de concurrence : deux `open_pack()` simultanés
-- pouvaient lire la même réserve et la dépenser deux fois (5 cartes pour 0
-- booster), et deux `open_scene_pack()` simultanés ouvrir deux fois le paquet
-- du jour.
--
-- Ce que cette migration **ne fait pas**, volontairement : déplacer la monnaie
-- (points, sabliers, XP) côté serveur. C'est un choix du jeu — elle vit sur
-- l'appareil — et il est écrit dans `docs/cloud-supabase.md` § 1.

-- --------------------------------------------------------------------------
-- 1. La sauvegarde ne s'écrit plus que par les fonctions du serveur
-- --------------------------------------------------------------------------
-- `push_save()` devient `security definer` : elle vérifie déjà qu'elle écrit
-- *sa* ligne (`auth.uid()`), mais elle en avait besoin pour continuer à écrire
-- une fois les droits de table retirés.
create or replace function public.push_save(
  p_state             jsonb,
  p_save_version      integer,
  p_device_updated_at bigint,
  p_force             boolean default false
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

create or replace function public.refresh_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cards jsonb := new.state -> 'cards';
  -- Deux listes : ce qui **refuse** une sauvegarde (`save_problems`, inchangé)
  -- et ce qui la rend **suspecte** (`save_suspicions`) — rareté recopiée du
  -- catalogue, créateur inconnu, identifiants en double. Une sauvegarde
  -- suspecte passe (le joueur garde ses cartes) mais n'est plus classée.
  problems text[] := public.save_problems(new.state) || public.save_suspicions(new.state);
begin
  -- Les compteurs de qualité ne retiennent que les créateurs du catalogue : la
  -- complétion affichée sur un profil public doit se calculer sur des créateurs
  -- qui existent. (`total_cards` reste le nombre brut de cartes de la
  -- sauvegarde — c'est la seule mesure « physique », inchangée depuis 0001.)
  insert into public.stats as s (
    user_id, unique_creators, total_cards, legendary_cards, epic_cards,
    gold_cards, holo_cards, level, points, verified, updated_at
  )
  with entries as (
    select value ->> 'rarity' as rarity, value ->> 'variant' as variant, lower(value ->> 'creatorSlug') as slug
    from jsonb_array_elements(cards) as value
    where exists (
      select 1 from public.creators c
       where c.slug = lower(value ->> 'creatorSlug')
         and not c.retired
    )
  )
  select
    new.user_id,
    (select count(distinct slug)::int from entries),
    jsonb_array_length(cards),
    (select count(*)::int from entries where rarity = 'legendary'),
    (select count(*)::int from entries where rarity = 'epic'),
    (select count(*)::int from entries where variant = 'gold'),
    (select count(*)::int from entries where variant = 'holo'),
    greatest(1, coalesce((new.state ->> 'level')::int, 1)),
    greatest(0, coalesce((new.state ->> 'points')::int, 0)),
    (array_length(problems, 1) is null),
    now()
  on conflict (user_id) do update set
    unique_creators = excluded.unique_creators,
    total_cards     = excluded.total_cards,
    legendary_cards = excluded.legendary_cards,
    epic_cards      = excluded.epic_cards,
    gold_cards      = excluded.gold_cards,
    holo_cards      = excluded.holo_cards,
    level           = excluded.level,
    points          = excluded.points,
    verified        = excluded.verified,
    updated_at      = excluded.updated_at;

  return new;
end;
$$;


revoke insert, update, delete on public.saves from anon, authenticated;
revoke insert, update, delete on public.stats from anon, authenticated;
revoke insert, update, delete on public.pack_state from anon, authenticated;

-- La lecture de sa propre ligne reste ouverte : `pull_save()` est « invoker ».
comment on table public.saves is
  'Sauvegarde du joueur. Écriture réservée aux fonctions du serveur (push_save, échanges, hôtel, Last Pack, arène) : aucun client n''écrit ici directement.';

-- --------------------------------------------------------------------------
-- 2. La réserve de boosters ne se croit plus sur la parole du client
-- --------------------------------------------------------------------------
-- Ce garde-fou couvre les chemins de création restants (une future
-- fonction, une réparation à la main) : la réserve d'un joueur ne peut pas
-- naître au-delà du plafond, ni avec une ancre dans le futur.
create or replace function public._pack_state_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.packs := greatest(0, least(4, coalesce(new.packs, 3)));
  new.openings := greatest(0, coalesce(new.openings, 0));
  new.last_regen_at := least(coalesce(new.last_regen_at, now()), now());
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pack_state_guard on public.pack_state;
create trigger pack_state_guard
  before insert on public.pack_state
  for each row execute function public._pack_state_guard();

-- --------------------------------------------------------------------------
-- 3. Une rareté déclarée n'est pas une rareté prouvée
-- --------------------------------------------------------------------------
-- Renvoie les *suspicions* — ce qui rend une sauvegarde inclassable sans la
-- refuser. Trois choses, et rien d'autre :
--
--   * une carte dont le créateur n'est pas au catalogue (elle ne compte déjà
--     pas dans les statistiques, mais autant le dire) ;
--   * une carte dont la rareté ne correspond pas à celle du catalogue — le
--     joueur peut labeliser une commune « légendaire » ;
--   * deux cartes qui partagent le même identifiant (un doublon fabriqué).
--
-- `security definer` : la fonction lit `creators`, que tout le monde peut lire
-- de toute façon ; elle est surtout appelée par le trigger, qui n'a pas de
-- session à lui.
create or replace function public.save_suspicions(p_state jsonb)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  problems text[] := '{}';
  cards jsonb := p_state -> 'cards';
  v_count integer;
  v_unknown integer;
  v_wrong_rarity integer;
  v_distinct integer;
begin
  if jsonb_typeof(p_state) <> 'object' or jsonb_typeof(cards) <> 'array' then
    return '{}';
  end if;

  v_count := jsonb_array_length(cards);

  select count(*)::integer into v_unknown
    from jsonb_array_elements(cards) as c
   where not exists (
     select 1 from public.creators cr where cr.slug = lower(c ->> 'creatorSlug')
   );

  select count(*)::integer into v_wrong_rarity
    from jsonb_array_elements(cards) as c
   where exists (
     select 1 from public.creators cr
      where cr.slug = lower(c ->> 'creatorSlug')
        and cr.rarity <> coalesce(c ->> 'rarity', '')
   );

  select count(distinct (c ->> 'id'))::integer into v_distinct
    from jsonb_array_elements(cards) as c;

  if v_unknown > 0 then
    problems := problems || format('collection : %s carte(s) d''un créateur absent du catalogue', v_unknown);
  end if;
  if v_wrong_rarity > 0 then
    problems := problems || format('collection : %s carte(s) dont la rareté ne correspond pas au catalogue', v_wrong_rarity);
  end if;
  if v_distinct <> v_count then
    -- `array_append` et non `||` : un littéral non typé à droite d'un `||`
    -- sur un tableau est lu comme un tableau, pas comme un texte.
    problems := array_append(problems, 'collection : des identifiants de carte en double'::text);
  end if;

  return problems;
end;
$$;

-- --------------------------------------------------------------------------
-- 4. Un pseudo ne peut plus se faire passer pour un créateur
-- --------------------------------------------------------------------------
-- Le classement affiche le pseudo : prendre le nom d'un streamer, c'est se
-- faire passer pour lui. Le catalogue est la réserve de noms — mais seulement
-- pour les **nouveaux** pseudos : les parties existantes ne sont pas touchées
-- (une mise à jour qui ne change pas le nom passe).
create or replace function public._display_name_reserve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.display_name is not distinct from old.display_name then
    return new;
  end if;
  if exists (
    select 1
      from public.creators c
     where lower(c.login) = lower(new.display_name)
        or lower(c.display_name) = lower(new.display_name)
  ) then
    raise exception 'pseudo : ce nom est celui d''un créateur du catalogue (choisis-en un autre)'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_name_reserve on public.profiles;
create trigger profile_name_reserve
  before insert or update on public.profiles
  for each row execute function public._display_name_reserve();

-- Les profils redeviennent lisibles par les seuls comptes connectés : la fiche
-- publique d'un joueur passe par `player_profile()`, qui ne sort que des
-- compteurs et les cartes épinglées. Sans compte, il n'y a rien à lire ici.
drop policy if exists "profils lisibles par tous" on public.profiles;
drop policy if exists "profils lisibles par les joueurs connectés" on public.profiles;
create policy "profils lisibles par les joueurs connectés"
  on public.profiles for select
  to authenticated
  using (true);

-- --------------------------------------------------------------------------
-- Droits
-- --------------------------------------------------------------------------
revoke all on function public.save_suspicions(jsonb) from public, anon;
revoke all on function public._pack_state_guard() from public, anon, authenticated;
revoke all on function public._display_name_reserve() from public, anon, authenticated;
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
    'jackpot', v_jackpot
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

  return jsonb_build_object(
    'family', p_family,
    'scene_day', v_day,
    'rare_drop', v_rare_drop,
    'cards', v_clean
  );
end;
$$;
