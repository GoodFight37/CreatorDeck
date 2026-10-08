-- CreatorDeck — le plancher de malchance et la série de jours, côté serveur.
--
-- Treizième migration du cloud, à exécuter **après** `0011_direct.sql`.
--
-- Deux garanties publiées, et une règle : le serveur ne les croit pas sur
-- parole. `open_pack()` reçoit une sauvegarde d'appareil qu'un joueur peut
-- modifier ; si le compteur de malchance vivait dedans, il suffirait d'écrire
-- « 80 » pour obtenir une Légendaire à chaque booster. Les deux compteurs sont
-- donc **déduits du journal des tirages** (`pack_draws`), que seule cette
-- fonction écrit :
--
--   * `_pack_pity(user)`     : combien de boosters depuis le dernier Légendaire ;
--   * `_pack_streak(user, t)`: combien de jours de jeu d'affilée avec un booster.
--
-- Rien n'est stocké : il n'y a donc rien à resynchroniser, et un compteur ne
-- peut pas mentir. `pack_status()` les renvoie aussi, pour que l'écran affiche
-- exactement le chiffre qui décidera du tirage.
--
-- Ce que la migration change dans `open_pack()` :
--   * le slot garanti est **Légendaire** quand le compteur atteint le seuil
--     publié (80 dans `pull-rates.json`) ;
--   * le 7ᵉ jour d'affilée garantit le « Perfect » — le joueur peut choisir
--     3 sabliers à la place (`p_jackpot = 'hourglasses'`, cette monnaie ne
--     vit que sur l'appareil) ;
--   * la réponse porte `pity`, `streak`, `pity_hit` et `jackpot`, ce que
--     l'écran affiche.
--
-- Rejouable : `create or replace`, index `if not exists`, `grant`/`revoke`.

-- --------------------------------------------------------------------------
-- Index du journal : les deux lectures ci-dessous trient par date
-- --------------------------------------------------------------------------
create index if not exists pack_draws_user_idx
  on public.pack_draws (user_id, drawn_at desc);

-- --------------------------------------------------------------------------
-- Combien de boosters depuis le dernier Légendaire
-- --------------------------------------------------------------------------
-- On remonte le journal à l'envers et on s'arrête au premier tirage qui
-- contenait une Légendaire : ce qu'on a compté avant, c'est le compteur.
-- Borné à 200 lignes : au-delà, la réponse ne change plus (le seuil est à 80).
create or replace function public._pack_pity(p_user uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  if p_user is null then
    return 0;
  end if;

  for v_row in
    select d.cards
      from public.pack_draws d
     where d.user_id = p_user
     order by d.drawn_at desc, d.id desc
     limit 200
  loop
    exit when exists (
      select 1
        from jsonb_array_elements(v_row.cards) as c
       where c ->> 'rarity' = 'legendary'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- --------------------------------------------------------------------------
-- Le « Perfect » du jour est-il déjà sorti ?
-- --------------------------------------------------------------------------
-- C'est ce qui dit si la récompense de série attend encore. On lit la marque
-- `rareDrop` des cartes du journal : un Perfect de chance compte aussi — le
-- joueur a eu son Perfect, la récompense n'a plus rien à lui offrir.
create or replace function public._pack_perfect_today(p_user uuid, p_now timestamptz)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.pack_draws d
     where d.user_id = p_user
       and ((d.drawn_at at time zone 'utc') - interval '6 hours')::date
           = ((p_now at time zone 'utc') - interval '6 hours')::date
       and exists (
         select 1
           from jsonb_array_elements(d.cards) as c
          where c ->> 'rareDrop' = 'true'
       )
  );
$$;

-- --------------------------------------------------------------------------
-- Combien de jours de jeu d'affilée avec un booster ouvert
-- --------------------------------------------------------------------------
-- La journée de jeu commence à 6 h UTC (celle du moteur local, `gameDay()`) :
-- une soirée de streaming ne doit pas être coupée en deux par minuit. On
-- parcourt les journées distinctes du journal, de la plus récente à la plus
-- ancienne, et on s'arrête au premier trou. Un jour sans booster, et la série
-- repart de zéro — c'est le principe même d'une série.
--
-- Le résultat vaut 0 si le joueur n'a encore rien ouvert aujourd'hui : dans ce
-- cas, le booster qu'il s'apprête à ouvrir sera le jour n° 1.
create or replace function public._pack_streak(p_user uuid, p_now timestamptz)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := ((p_now at time zone 'utc') - interval '6 hours')::date;
  v_days date[];
  v_expected date;
  v_day date;
  v_streak integer := 0;
begin
  if p_user is null then
    return 1;
  end if;

  select coalesce(array_agg(day order by day desc), '{}')
    into v_days
    from (
      select distinct ((d.drawn_at at time zone 'utc') - interval '6 hours')::date as day
        from public.pack_draws d
       where d.user_id = p_user
       order by day desc
       limit 60
    ) as jours;

  -- Premier booster de sa vie : c'est le jour 1.
  if array_length(v_days, 1) is null then
    return 1;
  end if;

  if v_days[1] = v_today then
    -- Déjà joué aujourd'hui : la série finit aujourd'hui.
    v_expected := v_today;
  elsif v_days[1] = v_today - 1 then
    -- Rien encore aujourd'hui, mais hier oui : le booster qu'on prépare est la
    -- suite de la série, et compte pour aujourd'hui.
    v_expected := v_today - 1;
    v_streak := 1;
  else
    -- Un jour sans booster : la série repart. Celui-ci est un jour 1.
    return 1;
  end if;

  foreach v_day in array v_days loop
    exit when v_day <> v_expected;
    v_streak := v_streak + 1;
    v_expected := v_expected - 1;
  end loop;

  return v_streak;
end;
$$;

-- `open_pack()` prend maintenant un argument : sans ce `drop`, Postgres
-- garderait les **deux** signatures, et un appel sans argument continuerait
-- d'utiliser l'ancienne — celle qui ignore le plancher de malchance.
drop function if exists public.open_pack();

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
  v_local_state jsonb;
  v_local_packs integer;
  v_local_regen_epoch bigint;
  v_local_regen timestamptz;
  v_save_state jsonb;
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

-- --------------------------------------------------------------------------
-- `pack_status()` : le compteur affiché est celui qui décidera du tirage
-- --------------------------------------------------------------------------
-- Le client affiche « encore N boosters avant la garantie » : ce N doit être
-- exactement celui du serveur, sinon la promesse devient un mensonge. On
-- réécrit donc `pack_status()` pour qu'il renvoie les deux compteurs en plus
-- de la réserve (le reste est identique à `0004`).
create or replace function public.pack_status()
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
  v_next_pack_at timestamptz;
  v_local_state jsonb;
  v_local_packs integer;
  v_local_regen_epoch bigint;
  v_local_regen timestamptz;
  v_save_state jsonb;
  v_pity integer;
  v_streak integer;
  v_jackpot_ready boolean := false;
begin
  if v_user_id is null then
    raise exception 'statut : connecte-toi pour voir ta réserve' using errcode = 'P0001';
  end if;

  select ps.packs, ps.last_regen_at, ps.openings
    into v_state
    from public.pack_state ps
   where ps.user_id = v_user_id;

  -- Pas de ligne : on simule à partir de la sauvegarde locale, sans écrire.
  if v_state is null then
    v_local_packs := 3;
    v_local_regen := v_now;

    select s.state into v_save_state
      from public.saves s
     where s.user_id = v_user_id;

    if v_save_state is not null then
      v_local_state := v_save_state;
      v_local_packs := greatest(0, least(4, coalesce((v_local_state ->> 'packs')::integer, 3)));
      v_local_regen_epoch := coalesce((v_local_state ->> 'lastPackRegen')::bigint, 0);
      if v_local_regen_epoch > 0 then
        v_local_regen := to_timestamp(v_local_regen_epoch::double precision / 1000);
      end if;
    end if;

    v_state.packs := v_local_packs;
    v_state.last_regen_at := v_local_regen;
    v_state.openings := 0;
  end if;

  v_refreshed := public._pack_refresh(
    v_state.packs,
    4,
    v_state.last_regen_at,
    1800000,
    v_now
  );

  v_packs := (v_refreshed ->> 'packs')::integer;
  v_last_regen := (v_refreshed ->> 'last_regen_at')::timestamptz;
  v_openings := v_state.openings;

  -- Prochain booster : null si la réserve est pleine.
  if v_packs >= 4 then
    v_next_pack_at := null;
  else
    v_next_pack_at := v_last_regen + '30 minutes'::interval;
  end if;

  v_pity := public._pack_pity(v_user_id);
  v_streak := public._pack_streak(v_user_id, v_now);

  -- Le jackpot attend tant qu'il n'a pas été dépensé et que c'est un jour de
  -- série (7, 14, 21…).
  v_jackpot_ready := v_streak % 7 = 0
                     and not public._pack_perfect_today(v_user_id, v_now);

  return jsonb_build_object(
    'packs', v_packs,
    'last_regen_at', v_last_regen,
    'openings', v_openings,
    'next_pack_at', v_next_pack_at,
    'pity', v_pity,
    'streak', v_streak,
    'jackpot_ready', v_jackpot_ready
  );
end;
$$;

-- --------------------------------------------------------------------------
-- Permissions
-- --------------------------------------------------------------------------
-- Les deux lectures internes restent hors de portée des joueurs : elles parlent
-- du journal d'un autre que soi, et le client n'a rien à y faire.
revoke all on function public._pack_pity(uuid) from public, anon, authenticated;
revoke all on function public._pack_streak(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._pack_perfect_today(uuid, timestamptz) from public, anon, authenticated;

revoke all on function public.open_pack(text) from public, anon;
grant execute on function public.open_pack(text) to authenticated;

revoke all on function public.pack_status() from public, anon;
grant execute on function public.pack_status() to authenticated;
