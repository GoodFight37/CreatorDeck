-- 0033_depart_maigre.sql — la réserve d'accueil passe de trois boosters à deux
--
-- Décision du 7 octobre 2026 : une partie neuve commence **maigre**. Trois
-- boosters d'accueil, c'était déjà beaucoup ; mais le vrai problème était
-- ailleurs — le joueur recevait douze sabliers (trois heures de recharge) avant
-- d'avoir compris à quoi sert la jauge. On lui offrait de sauter une mécanique
-- au lieu de la découvrir.
--
-- Ce que cette migration change, et rien d'autre :
--
--   * la réserve naît à **deux** boosters au lieu de trois (les sabliers et les
--     points de départ vivent sur l'appareil, `src/data/progression.json`) ;
--   * le chiffre devient une **fonction nommée**, `_pack_initial_packs()`, pour
--     qu'on n'ait plus à recopier tout `open_pack()` la prochaine fois qu'il
--     bouge — c'est exactement ce que le projet reprochait aux règles en double.
--
-- **Même signature qu'en vigueur** (`0032_serie_quotidienne.sql` :
-- `p_jackpot text default 'perfect'`) : `create or replace` **remplace** la
-- fonction au lieu d'en créer une deuxième. Pas de `drop`, pas de surcharge
-- possible — le piège du 7 octobre (`_wallet_apply` en double).
--
-- Le corps ci-dessous est la copie **exacte** de la version en vigueur
-- (`0032`) : seules la réserve d'accueil et la ligne qui l'écrit changent. Le
-- reste — tirage, Perfect, plancher de malchance, série payée, bonus Direct,
-- écriture de la collection, points par tirage — est identique.
--
-- Ce qui vit sur l'appareil et **ne change pas ici** : les deux sabliers de
-- départ et les quarante points (`src/data/progression.json`, bloc `start`).
-- Le serveur ne les connaît pas ; seul le compte des boosters est à lui.

-- ---------------------------------------------------------------------------
-- La réserve d'accueil, en un seul endroit
-- ---------------------------------------------------------------------------
create or replace function public._pack_initial_packs()
returns integer
language sql
immutable
set search_path = public
as $$
  -- Miroir de `src/data/progression.json` (`start.packs`) : le test
  -- `supabase-progression.test.ts` relit les deux et refuse qu'ils divergent.
  select 2;
$$;

-- La fonction est interne : seul `open_pack()` l'appelle.
revoke all on function public._pack_initial_packs() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ce que chaque jour du planning paie, en points (0 = rien)
-- ---------------------------------------------------------------------------
create or replace function public._streak_reward_points(p_day integer)
returns integer
language sql
immutable
set search_path = public
as $$
  -- Source : `src/data/progression.json`, bloc `streak.rewards` — J1 → 40,
  -- J3 → 60, J4 → 80, J5 → 120, J6 → 150. J2 ne paie pas de points (un
  -- sablier, qui vit sur l'appareil), et J7 non plus : le jackpot paie. Un test
  -- miroir compare cette table au fichier.
  select case p_day
    when 1 then 40
    -- J2 ne paie pas de points : c'est un sablier, et les sabliers vivent sur
    -- l'appareil. La ligne est écrite quand même — la table du SQL doit se lire
    -- comme celle du fichier, ligne pour ligne.
    when 2 then 0
    when 3 then 60
    when 4 then 80
    when 5 then 120
    when 6 then 150
    else 0
  end;
$$;

-- La fonction est interne : seul `open_pack()` l'appelle.
revoke all on function public._streak_reward_points(integer) from public, anon, authenticated;

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
  v_jour integer;
  v_points_serie integer;
  v_solde_avant integer;
  v_solde_apres integer;
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
  -- Elle naît à **deux boosters** (`_pack_initial_packs()`), et c'est le
  -- serveur qui la fait vivre. Avant, cette ligne reprenait `packs` et
  -- `lastPackRegen` de la sauvegarde du client : un compteur que le joueur
  -- contrôle n'a rien à faire dans une réserve serveur (le gonfler offrait des
  -- boosters gratuits).
  -- ------------------------------------------------------------------
  insert into public.pack_state (user_id, packs, last_regen_at, openings, updated_at)
  values (v_user_id, public._pack_initial_packs(), v_now, 0, v_now)
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
  -- La série paie son jour (0032)
  -- ------------------------------------------------------------------
  -- Repris tel quel : cette migration ne touche pas à la série, elle reprend le
  -- corps en vigueur parce que c'est la seule façon de remplacer une fonction
  -- plpgsql. Une seule ligne change (la réserve d'accueil).
  -- Le jour du cycle : 1 → 7, puis ça recommence. `_pack_streak` compte les
  -- jours d'affilée sans fin de cycle (le 8ᵉ jour vaut 8), donc la conversion
  -- est la même que celle de l'écran (`applyServerProgression`).
  v_jour := ((v_streak - 1) % 7) + 1;
  v_points_serie := public._streak_reward_points(v_jour);

  -- Le 7ᵉ jour ne paie pas de micro-récompense : son paiement, c'est le
  -- jackpot (le Perfect garanti, ou les 3 sabliers que le joueur a choisis).
  -- Les jetons et les sabliers des autres jours, eux, vivent sur l'appareil :
  -- le serveur n'en sait rien, il ne paie que les points.
  if v_points_serie > 0 then
    v_solde_avant := public._wallet_ensure(v_user_id);
    v_solde_apres := public._wallet_apply(
      v_user_id,
      v_points_serie,
      'streak',
      'serie-j' || v_jour::text || '-' || public._pack_game_day(v_now)::text
    );
    -- La journée de jeu fait partie de la référence : le même jour ne paie
    -- qu'une fois, même si le joueur ouvre dix boosters. S'il en ouvre un
    -- deuxième, le mouvement existe déjà — le solde n'a pas bougé, et on ne
    -- l'annonce pas : promettre des points que le serveur n'a pas versés est
    -- exactement ce qu'il ne faut pas faire.
    if v_solde_apres <= v_solde_avant then
      v_points_serie := 0;
    end if;
  end if;

  -- ------------------------------------------------------------------
  -- Perfect : 1‰ de chance (identique au moteur local), ou garanti par le
  -- plancher de malchance (12 boosters sans Légendaire) ou par la série.
  v_rare_drop := v_jackpot
                 or v_pity + 1 >= 12
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
  if v_pity + 1 >= 12 or v_jackpot then
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
    'pity_hit', v_pity + 1 >= 12,
    -- Ce que la série a payé pour ce booster : le jour coché et ses points.
    -- `0` quand ce jour ne paie rien (le 7ᵉ, ou un deuxième booster de la même
    -- journée) : le client s'en sert pour n'annoncer que du vrai.
    'streak_reward', jsonb_build_object('day', v_jour, 'points', v_points_serie),
    'jackpot', v_jackpot,
    -- La ligne telle qu'elle est en base après écriture : le client s'en sert
    -- comme point de départ, et comme base pour son prochain envoi.
    'save', to_jsonb(v_line)
  );
end;
$$;
