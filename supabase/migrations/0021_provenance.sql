-- ==========================================================================
-- 0021 — Provenance : d'où vient chaque carte
-- ==========================================================================
--
-- ## Le trou
--
-- `0019` a fermé l'écriture directe des sauvegardes : depuis, seul le serveur
-- écrit `saves`, en relisant ce que le client lui envoie. Il restait la faille
-- logique : **rien ne vérifiait qu'une carte avait été obtenue quelque part**.
-- Une sauvegarde qui déclare une Légendaire Gold que personne n'a jamais tirée
-- passait tous les contrôles — elle était cohérente, elle mentait juste. Les
-- échanges et l'hôtel relisent ces cartes : c'était donc de la monnaie
-- fabriquée.
--
-- ## La règle
--
-- Le serveur tient un **registre des droits** (`card_claims`) : pour chaque
-- joueur, combien de cartes de chaque (créateur, rareté, variante) il a
-- réellement reçues, et par quel chemin — `tirage`, `scene`, `echange`,
-- `hotel`, `vol`, ou `heritage` pour ce qui existait avant cette migration.
--
-- Une sauvegarde est **suspecte** (elle passe, mais le joueur n'est plus
-- classé) quand elle contient une carte que le registre ne couvre pas **et**
-- que l'artisanat ne peut pas produire. L'artisanat local ne fabrique que du
-- **Standard** de rareté commune à épique (`CRAFTED_VARIANT`, `craftCost`) :
-- tout ce qui est **Légendaire**, ou en variante **Live / Holo / Gold**, doit
-- donc avoir une provenance serveur. C'est exactement la classe de cartes qui
-- a de la valeur.
--
-- ## La bascule
--
-- Au moment où cette migration est collée, **toutes les cartes déjà présentes
-- dans les sauvegardes entrent au registre** comme `heritage` : aucune
-- collection existante ne perd quoi que ce soit, personne ne devient suspect
-- rétroactivement. C'est un point de départ, pas une chasse aux sorcières.
--
-- Ensuite, chaque carte Légendaire ou en variante spéciale doit venir d'un
-- tirage serveur, d'un échange, de l'hôtel ou d'un Last Pack volé. Les cartes
-- d'un joueur **hors ligne** (build sans cloud) qui rejoindrait un compte
-- connecté sont, elles, non couvertes : c'est écrit dans
-- `docs/cloud-supabase.md` § « L'intégrité côté serveur ».
--
-- ## Ce que cette migration ne fait pas
--
--  * elle ne déplace pas les points, les sabliers et les jetons côté serveur
--    (l'artisanat reste local, donc les cartes artisanales restent « non
--    couvertes » — c'est admis, et borné) ;
--  * elle ne retire **aucune** carte à **personne** : le registre ne fait
--    qu'autoriser ou signaler ;
--  * elle ne supprime pas les sauvegardes suspectes : elles gardent leurs
--    cartes et perdent seulement leur rang (comme `0019`).

-- --------------------------------------------------------------------------
-- 1. Le registre des droits
-- --------------------------------------------------------------------------
create table if not exists public.card_claims (
  user_id      uuid not null references auth.users (id) on delete cascade,
  creator_slug text not null,
  rarity       text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  variant      text not null,
  qty          integer not null default 0 check (qty >= 0),
  -- Le dernier chemin connu : tirage, scene, echange, hotel, vol, heritage.
  source       text not null default 'tirage',
  first_at     timestamptz not null default now(),
  last_at      timestamptz not null default now(),
  primary key (user_id, creator_slug, rarity, variant)
);

create index if not exists card_claims_user_idx on public.card_claims (user_id);

alter table public.card_claims enable row level security;

-- Comme `user_cards` : aucune politique, aucun droit client. Le registre ne
-- parle que par les fonctions du serveur.
revoke all on table public.card_claims from public, anon, authenticated;

comment on table public.card_claims is
  'Droits par (joueur, créateur, rareté, variante) : ce que le serveur a réellement donné. Sert à détecter les cartes fabriquées (voir 0021).';

-- --------------------------------------------------------------------------
-- 2. Enregistrer un lot de cartes
-- --------------------------------------------------------------------------
-- Une carte inventée ne doit pas pouvoir **créer un droit** : seuls les
-- créateurs du catalogue et les raretés connues entrent au registre, comme
-- pour la projection `user_cards`.
create or replace function public.card_claim_add(
  p_user   uuid,
  p_cards  jsonb,
  p_source text default 'tirage'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  if p_user is null or jsonb_typeof(p_cards) <> 'array' then
    return 0;
  end if;

  insert into public.card_claims as cc (user_id, creator_slug, rarity, variant, qty, source, first_at, last_at)
  select
    p_user,
    lower(c ->> 'creatorSlug'),
    c ->> 'rarity',
    coalesce(nullif(c ->> 'variant', ''), 'standard'),
    count(*)::integer,
    p_source,
    now(),
    now()
  from jsonb_array_elements(p_cards) as c
  where coalesce(c ->> 'creatorSlug', '') <> ''
    and c ->> 'rarity' in ('common', 'uncommon', 'rare', 'epic', 'legendary')
    and exists (select 1 from public.creators cr where cr.slug = lower(c ->> 'creatorSlug'))
  group by 2, 3, 4
  on conflict (user_id, creator_slug, rarity, variant) do update set
    qty = cc.qty + excluded.qty,
    -- `heritage` reste `heritage` : c'est la marque de la bascule, on ne
    -- l'écrase pas avec le chemin d'un tirage plus récent.
    source = case when cc.source = 'heritage' then 'heritage' else excluded.source end,
    last_at = now();

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke all on function public.card_claim_add(uuid, jsonb, text) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. La bascule : tout ce qui existe déjà est réputé acquis
-- --------------------------------------------------------------------------
-- Appelée une fois à la fin de cette migration. Elle est **rejouable** : elle
-- ne fait qu'ajouter des droits, jamais en retirer.
create or replace function public.card_claims_backfill()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  r record;
begin
  for r in select s.user_id, coalesce(s.state -> 'cards', '[]'::jsonb) as cards from public.saves s loop
    v_total := v_total + public.card_claim_add(r.user_id, r.cards, 'heritage');
  end loop;
  return v_total;
end;
$$;

revoke all on function public.card_claims_backfill() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Le vol de Last Pack entre au registre
-- --------------------------------------------------------------------------
-- Un trigger suffit ici : `last_pack_steal()` insère la ligne de vol **avant**
-- d'écrire la sauvegarde du voleur, donc le droit existe à temps.
create or replace function public._claims_steal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.card_claim_add(new.thief_id, jsonb_build_array(new.card), 'vol');
  return null;
end;
$$;

drop trigger if exists last_pack_steal_claim on public.last_pack_steals;
create trigger last_pack_steal_claim
  after insert on public.last_pack_steals
  for each row execute function public._claims_steal();

revoke all on function public._claims_steal() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 5. Le tirage enregistre ce qu'il donne
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

  -- Registre des droits : ces cinq cartes viennent du serveur. C'est ce qui
  -- permettra plus tard de distinguer une Légendaire tirée d'une Légendaire
  -- inventée dans une sauvegarde (voir `save_suspicions`).
  perform public.card_claim_add(v_user_id, v_cards, 'tirage');

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

  perform public.card_claim_add(v_user_id, v_clean, 'scene');

  return jsonb_build_object(
    'family', p_family,
    'scene_day', v_day,
    'rare_drop', v_rare_drop,
    'cards', v_clean
  );
end;
$$;


-- --------------------------------------------------------------------------
-- 5 bis. Échanges et hôtel : le droit entre **avant** la sauvegarde
-- --------------------------------------------------------------------------
-- Ces deux fonctions sont recopiées de leur **dernière** version (`0005` pour
-- l'échange, `0009` pour l'hôtel) : un `create or replace` réécrit la fonction
-- entière, donc repartir d'une version ancienne annulerait en silence tout ce
-- qui a été ajouté depuis. La seule différence ici est l'appel au registre,
-- placé avant l'écriture des sauvegardes.

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

  -- Registre des droits, **avant** l'écriture des sauvegardes : le contrôle de
  -- provenance des cartes reçues doit les voir comme légitimes (le trigger de
  -- statistiques tourne sur l'écriture qui suit).
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
  problems text[] := public.save_problems(new.state) || public.save_suspicions(new.state, new.user_id);
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


-- --------------------------------------------------------------------------
-- 6. La suspicion de provenance
-- --------------------------------------------------------------------------
-- `save_suspicions` prend maintenant le joueur : sans lui, pas de registre.
-- L'ancienne signature (un seul argument) est supprimée pour qu'il n'existe
-- pas deux règles différentes selon la façon d'appeler la fonction.
drop function if exists public.save_suspicions(jsonb);

create or replace function public.save_suspicions(p_state jsonb, p_user uuid)
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
  v_unproven integer := 0;
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

  -- Provenance : les cartes que l'artisanat ne peut pas produire (Légendaire,
  -- ou variante Live / Holo / Gold) doivent être couvertes par le registre.
  -- Ce qui reste en Standard, commune à épique, est laissé passer : c'est
  -- exactement ce que fabrique l'atelier hors ligne, et ça ne vaut pas une
  -- Légendaire.
  if p_user is not null then
    select coalesce(sum(greatest(0, m.n - coalesce(d.n, 0))), 0)::integer into v_unproven
      from (
        select
          lower(c ->> 'creatorSlug') as slug,
          c ->> 'rarity' as rarity,
          coalesce(nullif(c ->> 'variant', ''), 'standard') as variant,
          count(*)::integer as n
        from jsonb_array_elements(cards) as c
        where coalesce(c ->> 'creatorSlug', '') <> ''
        group by 1, 2, 3
      ) m
      left join (
        select creator_slug, rarity, variant, sum(qty)::integer as n
        from public.card_claims
        where user_id = p_user
        group by 1, 2, 3
      ) d
        on d.creator_slug = m.slug
       and d.rarity = m.rarity
       and d.variant = m.variant
     where greatest(0, m.n - coalesce(d.n, 0)) > 0
       and (m.rarity = 'legendary' or m.variant <> 'standard');

    if v_unproven > 0 then
      problems := problems || format(
        'collection : %s carte(s) sans provenance serveur (ni tirage, ni échange, ni hôtel, ni vol)',
        v_unproven
      );
    end if;
  end if;

  return problems;
end;
$$;

revoke all on function public.save_suspicions(jsonb, uuid) from public, anon;

-- --------------------------------------------------------------------------
-- 7. La bascule, maintenant
-- --------------------------------------------------------------------------
-- Toutes les cartes présentes à cet instant deviennent `heritage`.
select public.card_claims_backfill();

-- --------------------------------------------------------------------------
-- Ce que cette migration laisse en place (et pourquoi)
-- --------------------------------------------------------------------------
-- * `saves` reste écrit par le serveur seul (`0019`) ;
-- * le pseudo reste réservé aux créateurs (`0019`) et unique entre joueurs
--   (`0020`) ;
-- * le registre ne se lit pas depuis un client : ni table, ni fonction. Le
--   joueur voit l'effet (une pastille « non vérifié » sur son profil), pas la
--   mécanique.
