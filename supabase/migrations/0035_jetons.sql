-- 0035_jetons.sql — les jetons passent au serveur
--
-- Les jetons sont la monnaie « patience » du jeu : 5 par booster ouvert (7
-- pendant le Prime Time), 10 le 4ᵉ jour de série, 15 le 6ᵉ — et 400 donnent la
-- carte que le joueur vise, **jamais une Légendaire** (elles se tirent). Le
-- solde vivait dans la sauvegarde : le serveur le lisait et le croyait. Un
-- client bricolé s'offrait donc des cartes choisies, et ces cartes entraient
-- dans la collection — celle sur laquelle le serveur paie les paliers de
-- complétion (`wallet_credit('milestone')`). C'était le dernier trou
-- d'économie laissé ouvert par `0027` : les points étaient passés au serveur,
-- pas les jetons.
--
-- **La caisse est au serveur**, exactement comme pour les points :
--
--   * `tokens_get()` — le solde, et il **recale le miroir** (`state.tokens`
--     dans la sauvegarde) : une sauvegarde gonflée à la main se fait écraser à
--     la première lecture ;
--   * `tokens_spend('craft', slug)` — 400 jetons, prix recalculé ici, refus
--     d'une Légendaire, d'un créateur retiré du classement, d'un créateur déjà
--     possédé, et d'un solde insuffisant (« il te manque N jetons ») ;
--   * les gains n'ont pas de porte : ils naissent **du fait** qui les paie et
--     nulle part ailleurs. Le tirage crédite par trigger (`_wallet_on_draw()`,
--     qui paie déjà les 12 points) — un tirage enregistré existe, donc ses
--     jetons existent ; la série crédite dans `open_pack()`, avec la même
--     référence de journée de jeu que les points (« serie-jN-<jour> »), donc un
--     deuxième booster du même jour ne paie pas deux fois.
--
-- **Ce qui ne change pas** : le barème. Les littéraux sont ceux de
-- `src/data/progression.json` (`tokens.perPack` 5, `primeTimeBonus` 2,
-- `targetCost` 400, `streak.rewards` J4 → 10 et J6 → 15) et un test miroir
-- relit le fichier : un barème retouché d'un seul côté casse le test avant de
-- casser le jeu.
--
-- **Le Prime Time du serveur** : l'écran le calcule dans l'heure **de
-- l'appareil** (« 20 h – 23 h » veut dire le soir du joueur). Le serveur, lui,
-- n'a pas d'horloge locale à lire : il évalue la plage en **Europe/Paris**,
-- le fuseau du jeu. Pour un joueur en France les deux donnent la même réponse
-- à la seconde près ; ailleurs, c'est le serveur qui tranche — et c'est écrit
-- noir sur blanc dans `docs/cloud-supabase.md`.
--
-- **La bascule** : les joueurs ont déjà des jetons. `_tokens_ensure()` ouvre le
-- compte **une fois** en reprenant le solde de la sauvegarde, borné à un
-- million (au-delà, c'est une partie bricolée), comme `_wallet_ensure()` l'a
-- fait pour les points dans `0027`. Une sauvegarde gonflée **après** la bascule
-- ne rouvre jamais la porte : le compte existe, il fait foi.
--
-- Rejouable : `create table if not exists`, `create or replace`, et l'index
-- unique du journal est ce qui rend un mouvement impossible à encaisser deux
-- fois.

-- ---------------------------------------------------------------------------
-- Le compte et son journal
-- ---------------------------------------------------------------------------
create table if not exists public.tokens (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- Jamais négatif : la contrainte est la dernière barrière, même si chaque
  -- dépense vérifie déjà son solde avant d'écrire.
  tokens     integer not null default 0 check (tokens >= 0),
  updated_at timestamptz not null default now()
);

-- Le journal : chaque mouvement, avec sa raison. Comme pour les points, il sert
-- deux fois — dire d'où vient le solde, et **empêcher un gain à usage unique de
-- passer deux fois** (`token_ledger_once`, sur lequel aucune course ne peut
-- rien).
create table if not exists public.token_ledger (
  id      bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta   integer not null,
  -- `pack` (le booster), `streak` (le jour de série), `craft` (la dépense), et
  -- `bascule` pour l'ouverture du compte.
  kind    text not null,
  -- L'événement : l'identifiant du tirage, la journée de jeu payée, le slug
  -- acheté. C'est lui qui rend un mouvement unique.
  ref     text not null default '',
  at      timestamptz not null default now()
);

create unique index if not exists token_ledger_once
  on public.token_ledger (user_id, kind, ref);

-- Fermées au client, comme `wallets` : le joueur passe par les fonctions,
-- jamais par les tables.
alter table public.tokens enable row level security;
alter table public.token_ledger enable row level security;
revoke all on table public.tokens from public, anon, authenticated;
revoke all on table public.token_ledger from public, anon, authenticated;
revoke all on sequence public.token_ledger_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- La mécanique : un seul endroit qui écrit le solde
-- ---------------------------------------------------------------------------
/**
 * Ouvre le compte d'un joueur, **une seule fois**, en reprenant le solde de sa
 * sauvegarde.
 *
 * C'est la bascule de `0027`, transposée : les joueurs ont déjà des jetons
 * (ils en gagnent depuis le premier booster), ils ne doivent pas se réveiller à
 * zéro. La reprise a lieu une fois par joueur, au premier appel, et une ligne
 * de journal marque le passage — une sauvegarde gonflée à la main **après** la
 * bascule ne rouvre jamais la porte.
 *
 * Le solde de reprise est borné : au-delà d'un million, c'est une partie
 * bricolée, et le compte s'ouvre à zéro (le reste du jeu, lui, n'est pas
 * touché).
 */
create or replace function public._tokens_ensure(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tokens integer;
  v_local  integer;
begin
  select t.tokens into v_tokens from public.tokens t where t.user_id = p_user;
  if v_tokens is not null then
    return v_tokens;
  end if;

  select greatest(0, least(1000000, coalesce((s.state ->> 'tokens')::integer, 0)))
    into v_local
    from public.saves s where s.user_id = p_user;
  v_local := coalesce(v_local, 0);

  insert into public.tokens (user_id, tokens, updated_at)
  values (p_user, v_local, now())
  on conflict (user_id) do nothing;

  insert into public.token_ledger (user_id, delta, kind, ref)
  values (p_user, v_local, 'bascule', '0035')
  on conflict (user_id, kind, ref) do nothing;

  select t.tokens into v_tokens from public.tokens t where t.user_id = p_user;
  return coalesce(v_tokens, v_local);
end;
$$;

/**
 * Applique un mouvement et renvoie le nouveau solde.
 *
 * Le corps est celui de `_wallet_apply()` (`0027`) : le **journal d'abord** —
 * l'index `token_ledger_once (user_id, kind, ref)` décide si le mouvement a
 * lieu, donc un gain déjà versé ne repasse pas même si le client redemande
 * après une coupure réseau ; un débit qui passerait sous zéro lève une
 * exception, la ligne de journal est retirée et rien n'est écrit.
 */
create or replace function public._tokens_apply(
  p_user  uuid,
  p_delta integer,
  p_kind  text,
  p_ref   text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tokens integer;
begin
  if p_user is null then
    raise exception 'jetons : connecte-toi pour utiliser tes jetons' using errcode = 'P0001';
  end if;
  if coalesce(p_kind, '') = '' then
    raise exception 'jetons : mouvement sans raison' using errcode = 'P0001';
  end if;

  perform public._tokens_ensure(p_user);

  insert into public.token_ledger (user_id, delta, kind, ref)
  values (p_user, p_delta, coalesce(p_kind, ''), coalesce(p_ref, ''))
  on conflict (user_id, kind, ref) do nothing;

  if not found then
    -- Déjà versé (ou déjà débité) : on renvoie le solde tel qu'il est. Ce n'est
    -- pas une erreur — un client qui redemande doit obtenir la même réponse.
    select t.tokens into v_tokens from public.tokens t where t.user_id = p_user;
    return coalesce(v_tokens, 0);
  end if;

  insert into public.tokens (user_id, tokens, updated_at)
  values (p_user, greatest(0, p_delta), now())
  on conflict (user_id) do update
     set tokens = public.tokens.tokens + p_delta,
         updated_at = now()
   where public.tokens.tokens + p_delta >= 0
  returning tokens into v_tokens;

  if v_tokens is null then
    delete from public.token_ledger
     where user_id = p_user and kind = coalesce(p_kind, '') and ref = coalesce(p_ref, '');
    raise exception 'jetons : il te manque des jetons pour ce mouvement' using errcode = 'P0001';
  end if;

  return v_tokens;
end;
$$;

/**
 * Écrit le solde du serveur dans la sauvegarde (le **miroir**).
 *
 * L'écran lit `state.tokens` : il n'a rien à apprendre. Ce que le miroir n'est
 * pas, c'est une autorisation — une sauvegarde gonflée à la main est écrasée
 * par cette fonction dès que le joueur regarde son solde ou dépense quelque
 * chose.
 */
create or replace function public._tokens_mirror(p_user uuid, p_tokens integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state jsonb;
  v_next  jsonb;
begin
  select s.state into v_state from public.saves s where s.user_id = p_user for update;
  if v_state is null then
    return;
  end if;
  if coalesce((v_state ->> 'tokens')::integer, 0) = p_tokens then
    return;
  end if;

  v_next := jsonb_set(v_state, '{tokens}', to_jsonb(p_tokens), true);
  update public.saves
     set state = v_next,
         state_checksum = md5(v_next::text),
         updated_at = now()
   where user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- Les prix et le barème, côté serveur
-- ---------------------------------------------------------------------------
/**
 * Ce que le serveur fait payer en jetons.
 *
 * Un seul prix : la carte visée. Les valeurs viennent du jeu
 * (`src/data/progression.json`) et `src/lib/supabase-jetons.test.ts` compare
 * les deux — un prix changé d'un côté seulement casse le test avant de casser
 * le jeu.
 */
create or replace function public.token_prices()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    -- `TOKEN_TARGET_COST` (src/lib/progression.ts) : 400 jetons = 80 boosters.
    'craft', 400
  );
$$;

revoke all on function public.token_prices() from public, anon;
grant execute on function public.token_prices() to authenticated;

/**
 * Le Prime Time du serveur : la plage publiée (20 h – 23 h), évaluée en
 * **Europe/Paris** — le fuseau du jeu. L'écran, lui, lit l'heure de l'appareil :
 * pour un joueur en France, les deux réponses sont identiques.
 */
create or replace function public._tokens_prime_time(p_at timestamptz)
returns boolean
language sql
stable
set search_path = public
as $$
  select extract(hour from (coalesce(p_at, now()) at time zone 'Europe/Paris'))::integer
         between 20 and 22;
$$;

/**
 * Ce qu'un booster rapporte à cet instant : 5 jetons, 7 pendant le Prime Time
 * (`tokens.perPack` + `tokens.primeTimeBonus`).
 */
create or replace function public._tokens_per_pack(p_at timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select 5 + case when public._tokens_prime_time(p_at) then 2 else 0 end;
$$;

/**
 * Ce que chaque jour du planning paie en **jetons** (0 = rien).
 *
 * Source : `src/data/progression.json`, bloc `streak.rewards` — J4 → 10,
 * J6 → 15. J2 et J5 ne paient pas de jetons (un sablier, qui vit sur
 * l'appareil), et J7 non plus : le jackpot paie. Un test miroir compare cette
 * table au fichier, ligne pour ligne.
 */
create or replace function public._streak_reward_tokens(p_day integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_day
    when 4 then 10
    when 6 then 15
    else 0
  end;
$$;

-- ---------------------------------------------------------------------------
-- Le solde du joueur
-- ---------------------------------------------------------------------------
/**
 * Le solde, et rien d'autre. Lecture pure, sauf qu'elle **recale le miroir** :
 * appeler `tokens_get()` suffit à faire disparaître un million de jetons
 * inventés dans la sauvegarde.
 */
create or replace function public.tokens_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_tokens integer;
begin
  if v_user is null then
    raise exception 'jetons : connecte-toi pour voir tes jetons' using errcode = 'P0001';
  end if;

  v_tokens := public._tokens_ensure(v_user);
  perform public._tokens_mirror(v_user, v_tokens);

  return jsonb_build_object('ok', true, 'tokens', v_tokens);
end;
$$;

revoke all on function public.tokens_get() from public, anon;
grant execute on function public.tokens_get() to authenticated;

-- ---------------------------------------------------------------------------
-- La dépense
-- ---------------------------------------------------------------------------
/**
 * Rejoint un créateur contre des jetons.
 *
 * Ce que le serveur vérifie, dans l'ordre : le joueur est connecté, le créateur
 * est au catalogue, il n'a pas quitté le classement, ce n'est **pas une
 * Légendaire** (la règle publiée : les jetons paient le manque de chance, jamais
 * la carte la plus rare — elle se tire), le joueur ne le possède pas déjà, et
 * le solde du serveur suffit. Le prix n'est pas envoyé par le client : il est
 * relu ici (`token_prices()`).
 *
 * Le débit passe par `_tokens_apply()` : référence = le slug, donc un même
 * achat ne peut pas être débité deux fois, même si le client redemande.
 */
create or replace function public.tokens_spend(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_slug    text := btrim(coalesce(p_slug, ''));
  v_cost    integer := (public.token_prices() ->> 'craft')::integer;
  v_creator public.creators;
  v_avant   integer;
  v_apres   integer;
  v_owned   boolean;
begin
  if v_user is null then
    raise exception 'jetons : connecte-toi pour rejoindre ce créateur' using errcode = 'P0001';
  end if;
  if v_slug = '' then
    raise exception 'jetons : ce créateur n''est pas au catalogue' using errcode = 'P0001';
  end if;

  select * into v_creator from public.creators c where c.slug = v_slug;
  if v_creator.slug is null then
    raise exception 'jetons : ce créateur n''est pas au catalogue' using errcode = 'P0001';
  end if;
  if v_creator.retired then
    raise exception 'jetons : % a quitté le classement, les jetons ne l''ouvrent plus', v_creator.display_name
      using errcode = 'P0001';
  end if;
  if v_creator.rarity = 'legendary' then
    raise exception 'jetons : une Légendaire ne s''achète pas — elle se tire' using errcode = 'P0001';
  end if;

  -- Déjà dans la collection ? Le serveur relit la sauvegarde, il ne croit pas
  -- le client sur parole : payer 400 jetons pour une carte qu'on a déjà serait
  -- une perte sèche, et le moteur local refuse déjà ce cas.
  select exists (
    select 1
      from public.saves s,
           jsonb_array_elements(coalesce(s.state -> 'cards', '[]'::jsonb)) as c
     where s.user_id = v_user
       and c ->> 'creatorSlug' = v_slug
  ) into v_owned;
  if v_owned then
    raise exception 'jetons : tu as déjà % dans ta collection', v_creator.display_name
      using errcode = 'P0001';
  end if;

  v_avant := public._tokens_ensure(v_user);
  if v_avant < v_cost then
    raise exception 'jetons : il te manque % jetons pour cette carte', v_cost - v_avant
      using errcode = 'P0001';
  end if;

  v_apres := public._tokens_apply(v_user, -v_cost, 'craft', v_slug);
  perform public._tokens_mirror(v_user, v_apres);

  return jsonb_build_object(
    'ok', true,
    'slug', v_slug,
    'spent', v_avant - v_apres,
    'tokens', v_apres
  );
end;
$$;

revoke all on function public.tokens_spend(text) from public, anon;
grant execute on function public.tokens_spend(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Le tirage paie ses jetons
-- ---------------------------------------------------------------------------
/**
 * Chaque tirage enregistré par le serveur crédite ses jetons, **sans que le
 * client ait à le demander** — c'est le raisonnement de `_wallet_on_draw()`
 * (`0027`), étendu : le fait (un tirage dans `pack_draws`) et son paiement ne
 * peuvent pas se séparer.
 *
 * Le **Paquet Scène** ne donne pas de jetons : le moteur local ne lui en donne
 * pas non plus (`applyScenePackResult` ne touche pas au compteur), et le barème
 * publié parle du « booster ouvert ». Les deux caisses restent d'accord.
 */
create or replace function public._wallet_on_draw()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._wallet_apply(
    new.user_id,
    case when new.kind = 'scene' then 10 else 12 end,
    case when new.kind = 'scene' then 'scene' else 'pack' end,
    new.id::text
  );
  if new.kind <> 'scene' then
    perform public._tokens_apply(
      new.user_id,
      public._tokens_per_pack(new.drawn_at),
      'pack',
      new.id::text
    );
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- La série paie ses jetons (reprise d'`open_pack`)
-- ---------------------------------------------------------------------------
-- Copie **exacte** de la version en vigueur (`0033_depart_maigre.sql`, qui est
-- elle-même `0032` moins la réserve d'accueil) : seuls le paiement des jetons du
-- jour, la variable qui le porte et la réponse changent. Tout le reste — tirage,
-- Perfect, plancher de malchance, bonus Direct, écriture de la collection,
-- points par tirage, points de série, réserve de deux boosters — est identique
-- au caractère près. Même signature : `create or replace` remplace la fonction
-- au lieu d'en créer une deuxième (le piège de la surcharge, vécu le
-- 7 octobre).
--
-- La source est la **dernière** définition, pas `0032` : reprendre une version
-- périmée aurait remis la réserve d'accueil à trois boosters, c'est-à-dire
-- annulé `0033` en silence.

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
  v_tokens_serie integer;
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
  -- La série paie aussi ses jetons (0035)
  -- ------------------------------------------------------------------
  -- Les jetons ont la même caisse que les points depuis `0035` : la prime du
  -- jour est versée ici, avec **la même référence de journée de jeu**
  -- (« serie-jN-<jour> ») — un deuxième booster du même jour ne paie donc pas
  -- deux fois. Le solde est relu avant/après : ce qui est annoncé est ce qui a
  -- vraiment bougé.
  v_tokens_serie := public._streak_reward_tokens(v_jour);
  if v_tokens_serie > 0 then
    v_solde_avant := public._tokens_ensure(v_user_id);
    v_solde_apres := public._tokens_apply(
      v_user_id,
      v_tokens_serie,
      'streak',
      'serie-j' || v_jour::text || '-' || public._pack_game_day(v_now)::text
    );
    if v_solde_apres <= v_solde_avant then
      v_tokens_serie := 0;
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
    -- `tokens` : la prime de jetons du jour, `0` si ce jour n'en paie pas ou
    -- s'il a déjà été payé. L'écran s'en sert pour n'annoncer que du vrai.
    'streak_reward', jsonb_build_object('day', v_jour, 'points', v_points_serie, 'tokens', v_tokens_serie),
    'jackpot', v_jackpot,
    -- La ligne telle qu'elle est en base après écriture : le client s'en sert
    -- comme point de départ, et comme base pour son prochain envoi.
    'save', to_jsonb(v_line)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Fin des droits
-- ---------------------------------------------------------------------------
revoke all on function public._tokens_ensure(uuid) from public, anon, authenticated;
revoke all on function public._tokens_apply(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public._tokens_mirror(uuid, integer) from public, anon, authenticated;
revoke all on function public._tokens_prime_time(timestamptz) from public, anon, authenticated;
revoke all on function public._tokens_per_pack(timestamptz) from public, anon, authenticated;
revoke all on function public._streak_reward_tokens(integer) from public, anon, authenticated;
revoke all on function public._wallet_on_draw() from public, anon, authenticated;

-- Le rôle de service peut ouvrir un compte à la main (reprise en masse), comme
-- `wallet_backfill()` le fait pour les points. Le rôle n'existe pas partout
-- (Postgres jetable de la vérification, projets sans Edge Functions) : son
-- absence ne doit pas empêcher la migration de passer — les triggers suffisent.
do $$
begin
  grant execute on function public._tokens_ensure(uuid) to service_role;
exception when others then
  raise notice 'rôle service_role absent : les triggers suffisent';
end;
$$;
