-- CreatorDeck — le Direct fait tomber plus.
--
-- Onzième migration, à exécuter **après** `0004_tirage.sql` et
-- `0007_direct.sql`. Rejouable (`create or replace`).
--
-- ## Pourquoi
--
-- Le badge « EN LIVE » était décoratif : il s'allumait sur des cartes, mais
-- rien, dans le tirage, ne récompensait le fait d'ouvrir un booster pendant un
-- direct. Cette migration fait deux choses, exactement comme le moteur local
-- (`src/lib/game-engine.ts`) — les deux doivent rester le même jeu :
--
--   1. **les créateurs qui streament pèsent ×1,5** dans leur rareté
--      (`creatorBias` de `src/data/pull-rates.json`) : ils tombent plus
--      souvent ;
--   2. **la variante Live n'existe que pour eux** : 200‰ (20 %) sur les slots
--      ordinaires (`livePermille`), et systématiquement sur la carte garantie.
--
-- Sans information **fraîche** sur le direct — cache de plus de dix minutes,
-- table absente, aucun streamer — le bonus est neutre et aucune variante Live
-- ne sort : une carte « Live » qui désignerait quelqu'un qui ne streame pas ne
-- vaudrait rien, et mentir au joueur coûte plus cher que ne rien donner.
--
-- Les valeurs (×1,5, 200‰, dix minutes) sont celles du fichier de taux :
-- `src/lib/supabase-tirage.test.ts` verrouille la correspondance.
--
-- ## Ce que la migration touche
--
--   * `_direct_live_logins()` : les `login` en direct, ou NULL si l'app n'est
--     pas sûre (nouvelle fonction, réservée au serveur) ;
--   * `_pack_creator_weight()` : le poids d'un créateur (1000 ou 1500) ;
--   * `_pack_choose_variant()` : la chance de variante Live (remplacée, un
--     paramètre de plus) ;
--   * `_pack_choose_creator()` : tirage pondéré dans la rareté (remplacée) ;
--   * `open_pack()` : le slot garanti devient conditionnel (remplacée).

-- --------------------------------------------------------------------------
-- Qui streame, d'après le cache du serveur
-- --------------------------------------------------------------------------
-- Renvoie les `login` en direct quand le cache a moins de dix minutes
-- (`LIVE_TTL_MS` du moteur), NULL sinon. Tolérant : si `0007_direct.sql` n'a pas
-- été collée, la fonction répond NULL au lieu de casser le tirage.
create or replace function public._direct_live_logins()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_logins text[];
begin
  begin
    if not exists (
      select 1
        from public.live_state s
       where s.id
         and s.refreshed_at > now() - interval '10 minutes'
    ) then
      return null;
    end if;

    select array_agg(distinct l.login order by l.login)
      into v_logins
      from public.live_streams l
     where coalesce(l.login, '') <> '';

    -- Peut être NULL : « personne n'est en direct », ce n'est pas une erreur.
    return v_logins;
  exception
    when undefined_table then
      return null;
  end;
end;
$$;

-- --------------------------------------------------------------------------
-- Le poids d'un créateur dans sa rareté
-- --------------------------------------------------------------------------
-- ×1000 pour rester en entiers (le moteur local fait le même arrondi), et
-- exposé pour que la vérification puisse contrôler la règle sans hasard.
create or replace function public._pack_creator_weight(p_login text, p_live text[])
returns integer -- 1500 en direct, 1000 sinon
language sql
immutable
as $$
  select case
    when p_live is not null
     and coalesce(p_login, '') <> ''
     and p_login = any (p_live)
      then 1500
    else 1000
  end;
$$;

-- --------------------------------------------------------------------------
-- Choix de la variante cosmétique (bonus Direct compris)
-- --------------------------------------------------------------------------
-- Reproduit `chooseVariant()` du moteur local, dans le même ordre :
--   Perfect → amélioration ; créateur en direct → 200‰ Live ; Gold ; Holo ;
--   standard. Le tirage d'aléa du bonus n'est consommé que pour un créateur en
--   direct, comme côté client.
drop function if exists public._pack_choose_variant(text, boolean);
create or replace function public._pack_choose_variant(
  p_rarity text,
  p_rare_drop boolean,
  p_live boolean
)
returns text -- 'standard' | 'live' | 'holo' | 'gold'
language plpgsql
volatile
set search_path = public
as $$
declare
  v_roll integer;
begin
  -- Source des seuils : src/data/pull-rates.json (booster « live »).
  --   rareDrop.variantUpgradePermille = 900
  --   direct.livePermille             = 200
  --   variants.holoPermille           = 75 (dès « Peu commune »)
  v_roll := public._pack_random_int(10000);

  -- Perfect : 900‰ de chance d'améliorer la variante.
  if p_rare_drop and v_roll < 900 then
    if p_rarity = 'legendary' then
      return 'gold';
    else
      return 'holo';
    end if;
  end if;

  -- Bonus Direct : la variante Live, réservée à ceux qui streament.
  if p_live and public._pack_random_int(10000) < 200 then
    return 'live';
  end if;

  -- Pas de goldPermille configuré pour le booster Live : on saute ce palier.

  -- Holo : 75‰ dès « Peu commune » (uncommon, rare, epic, legendary).
  if p_rarity in ('uncommon', 'rare', 'epic', 'legendary') and v_roll < 75 then
    return 'holo';
  end if;

  return 'standard';
end;
$$;

-- --------------------------------------------------------------------------
-- Choix d'un créateur selon les poids de rareté (bonus Direct compris)
-- --------------------------------------------------------------------------
-- Reproduit `chooseCreator()` du moteur local : pondération par rareté parmi
-- les créateurs pas encore utilisés, puis tirage **pondéré** dans la rareté
-- (×1,5 pour un créateur en direct).
create or replace function public._pack_choose_creator(
  p_weights jsonb,
  p_used_slugs text[]
)
returns text -- slug du créateur choisi
language plpgsql
stable
set search_path = public
as $$
declare
  v_live text[] := public._direct_live_logins();
  v_rarity text;
  v_weight integer;
  v_total integer := 0;
  v_roll integer;
  v_bucket text[];
  v_bucket_weights integer[];
  v_bucket_weight integer := 0;
  v_index integer;
  v_available_rarities text[];
  v_rarity_weight integer;
begin
  -- Pondérations effectives : une rareté n'est éligible que si au moins un
  -- créateur de cette rareté n'est pas encore utilisé.
  v_available_rarities := '{}';
  for v_rarity in select unnest(array['common','uncommon','rare','epic','legendary']) loop
    v_rarity_weight := coalesce((p_weights ->> v_rarity)::integer, 0);
    if v_rarity_weight > 0 then
      perform 1
        from public.creators c
       where c.rarity = v_rarity
         and not (c.slug = any (p_used_slugs))
       limit 1;
      if found then
        v_available_rarities := v_available_rarities || v_rarity;
      end if;
    end if;
  end loop;

  if array_length(v_available_rarities, 1) is null then
    raise exception 'tirage : le catalogue disponible est vide' using errcode = 'P0001';
  end if;

  -- Tri par ordre de rareté (du plus commun au plus rare) : même parcours que
  -- le moteur local (RARITY_META.order).
  for v_rarity in
    select r
      from unnest(v_available_rarities) as r
     order by array_position(array['common','uncommon','rare','epic','legendary'], r)
  loop
    v_weight := coalesce((p_weights ->> v_rarity)::integer, 0);
    v_total := v_total + v_weight;
  end loop;

  v_roll := public._pack_random_int(v_total);

  for v_rarity in
    select r
      from unnest(v_available_rarities) as r
     order by array_position(array['common','uncommon','rare','epic','legendary'], r)
  loop
    v_weight := coalesce((p_weights ->> v_rarity)::integer, 0);
    if v_roll < v_weight then
      -- Tirage pondéré parmi les créateurs disponibles de cette rareté :
      -- ×1,5 pour ceux qui streament (bonus Direct).
      select array_agg(c.slug order by c.slug),
             array_agg(public._pack_creator_weight(c.login, v_live) order by c.slug)
        into v_bucket, v_bucket_weights
        from public.creators c
       where c.rarity = v_rarity
         and not (c.slug = any (p_used_slugs));

      v_bucket_weight := 0;
      for v_index in 1..array_length(v_bucket, 1) loop
        v_bucket_weight := v_bucket_weight + v_bucket_weights[v_index];
      end loop;

      v_roll := public._pack_random_int(v_bucket_weight);
      for v_index in 1..array_length(v_bucket, 1) loop
        if v_roll < v_bucket_weights[v_index] then
          return v_bucket[v_index];
        end if;
        v_roll := v_roll - v_bucket_weights[v_index];
      end loop;

      -- Ne devrait jamais arriver : le parcours couvre la somme exacte.
      return v_bucket[array_length(v_bucket, 1)];
    end if;
    v_roll := v_roll - v_weight;
  end loop;

  raise exception 'tirage : erreur interne de sélection de créateur' using errcode = 'P0001';
end;
$$;

-- --------------------------------------------------------------------------
-- Ouverture d'un booster
-- --------------------------------------------------------------------------
-- Renvoie { packs, last_regen_at, openings, cards: [{creatorSlug, rarity,
-- variant, rareDrop}] }.
--
-- Le tirage reproduit exactement le moteur local :
--   * 4 slots pondérés (les poids montent au fil du booster),
--   * 1 slot garanti (Rare ou mieux, en variante « live » quand son créateur
--     streame),
--   * 1 ‰ de chance de « Perfect » (Épique ou mieux partout),
--   * aucun créateur en double dans un même booster,
--   * carte garantie en dernier (aucun mélange : le hit se révèle à la fin).
--
-- Poids des slots (src/data/pull-rates.json, booster « live ») :
--   slot 1 : C 42, PC 30, R 18, E 8, L 2
--   slot 2 : C 42, PC 30, R 18, E 8, L 2
--   slot 3 : C 34, PC 32, R 22, E 10, L 2
--   slot 4 : C 20, PC 34, R 28, E 15, L 3
--   garanti : R 82, E 15, L 3
--   Perfect (1‰) : E 82, L 18
--   bonus Direct : ×1,5 pour un créateur en direct, 200‰ de variante Live
create or replace function public.open_pack()
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
  v_local_state jsonb;
  v_local_packs integer;
  v_local_regen_epoch bigint;
  v_local_regen timestamptz;
  v_save_state jsonb;
  v_live text[];
begin
  -- Authentification obligatoire.
  if v_user_id is null then
    raise exception 'tirage : connecte-toi pour ouvrir un booster' using errcode = 'P0001';
  end if;

  -- ------------------------------------------------------------------
  -- Initialise la ligne pack_state depuis la sauvegarde locale si besoin.
  -- Le client pousse sa partie (saves.state) : on y lit `packs` (borné 0..4)
  -- et `lastPackRegen` (epoch ms). À défaut : 3 boosters, maintenant.
  -- ------------------------------------------------------------------
  select ps.packs, ps.last_regen_at, ps.openings
    into v_state
    from public.pack_state ps
   where ps.user_id = v_user_id;

  if v_state is null then
    -- Reprend l'état local depuis la sauvegarde cloud.
    v_local_packs := 3;
    v_local_regen := v_now;

    select s.state into v_save_state
      from public.saves s
     where s.user_id = v_user_id;

    if v_save_state is not null then
      -- packs : borné 0..4.
      v_local_state := v_save_state;
      v_local_packs := greatest(0, least(4, coalesce((v_local_state ->> 'packs')::integer, 3)));
      -- lastPackRegen : epoch ms → timestamptz.
      v_local_regen_epoch := coalesce((v_local_state ->> 'lastPackRegen')::bigint, 0);
      if v_local_regen_epoch > 0 then
        v_local_regen := to_timestamp(v_local_regen_epoch::double precision / 1000);
      end if;
    end if;

    insert into public.pack_state (user_id, packs, last_regen_at, openings, updated_at)
    values (v_user_id, v_local_packs, v_local_regen, 0, v_now);

    v_state.packs := v_local_packs;
    v_state.last_regen_at := v_local_regen;
    v_state.openings := 0;
  end if;

  -- ------------------------------------------------------------------
  -- Recharge (identique à refreshBalances du moteur local).
  -- ------------------------------------------------------------------
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
  -- Perfect : 1‰ de chance (identique au moteur local).
  v_rare_drop := public._pack_random_int(1000) < 1;

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

  -- Slot garanti : Rare ou mieux, variante « live » imposée.
  if v_rare_drop then
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
    'cards', v_cards
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Permissions
-- --------------------------------------------------------------------------
-- Les fonctions internes restent hors de portée des joueurs ; `open_pack()`
-- garde les siennes (create or replace ne touche pas aux droits accordés).
revoke all on function public._direct_live_logins() from public, anon, authenticated;
revoke all on function public._pack_creator_weight(text, text[]) from public, anon, authenticated;
revoke all on function public._pack_choose_variant(text, boolean, boolean) from public, anon, authenticated;
revoke all on function public._pack_choose_creator(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.open_pack() from public, anon;
grant execute on function public.open_pack() to authenticated;
