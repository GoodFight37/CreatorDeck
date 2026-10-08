-- 0031_pity_douze.sql — le plancher de malchance passe de 80 à 12 boosters
--
-- Le brief de la « boucle d'addiction » disait « 12 packs jusqu'au pity » ; le
-- jeu en garantissait une au bout de **80**. Le joueur a tranché le 7 octobre
-- 2026 : **12**. À partir de maintenant, une Légendaire tombe au plus tard au
-- 12ᵉ booster du Live Drop sans Légendaire — le 5ᵉ slot (le garanti) la porte,
-- et le compteur repart de zéro dès qu'un Légendaire tombe, quel que soit le
-- slot.
--
-- **Même signature qu'en production** (`0022_pack_dans_saves.sql` :
-- `p_jackpot text default 'perfect'`) : `create or replace` **remplace** la
-- fonction au lieu d'en créer une deuxième. C'est le piège du 7 octobre (deux
-- `_wallet_apply` identiques à l'appel, et le booster ne s'ouvrait plus) : ici,
-- pas de `drop`, pas de surcharge possible.
--
-- Le corps ci-dessous est la copie **exacte** de la version en vigueur
-- (`0022`, dernière définition de `open_pack` dans la pile) : seuls le seuil et
-- le commentaire qui le cite changent. Le reste — Perfect du 7ᵉ jour, bonus
-- Direct, écriture du tirage dans la collection, points au serveur, réponse
-- `pity_hit` — est identique à ce qui tourne aujourd'hui. Un test miroir
-- (`supabase-progression.test.ts`) relit ce fichier et `pull-rates.json` : un
-- seuil changé d'un seul côté casse le test avant de casser le jeu.
--
-- Le **Paquet Scène** n'est pas concerné : il ne donne jamais de Légendaire, ne
-- compte donc pas cette série et ne la casse pas (`0014_scene_pack.sql`).

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
    'jackpot', v_jackpot,
    -- La ligne telle qu'elle est en base après écriture : le client s'en sert
    -- comme point de départ, et comme base pour son prochain envoi.
    'save', to_jsonb(v_line)
  );
end;
$$;
