-- 0026_promo_codes.sql — les codes promo
--
-- Un code qu'on donne en stream (« BOOSTER-2026 ») et que les joueurs tapent dans
-- les réglages. Il donne **un booster à ouvrir** : pas des points (l'hôtel s'en
-- sert, et un code deviendrait une monnaie parallèle), pas un jeton (ça
-- rapprocherait du pity sans que le joueur ait rien fait), pas une carte (ça
-- toucherait à la valeur d'une collection).
--
-- Quatre règles, toutes côté serveur — un code vérifié dans l'application serait
-- un code que n'importe qui pourrait s'accorder :
--
--   * **inconnu** : refusé, avec le message qui le dit ;
--   * **expiré** (`expires_at`) ou **épuisé** (`max_uses`) : refusé ;
--   * **déjà utilisé par ce joueur** : refusé — une ligne de `promo_redemptions`
--     par (code, joueur), et la clé primaire s'en occupe ;
--   * **réserve pleine** : refusé **sans consommer le code**. La réserve est
--     plafonnée à quatre boosters (`pack_state`, garde de `0019`) : donner un
--     cinquième booster serait le perdre en silence. Le message dit d'ouvrir un
--     booster d'abord — le code reste valable.
--
-- Rejouable : `create table if not exists`, `create or replace`, revokes
-- idempotents.

create table if not exists public.promo_codes (
  -- Le code, **tel qu'il se tape** : normalisé en majuscules sans espaces à la
  -- rédemption, donc `booster-2026` et `BOOSTER 2026` désignent le même.
  code       text primary key,
  -- Combien de boosters le code donne. Un seul, en général : au-delà, c'est une
  -- récompense d'événement, et la borne évite le code qui offre 400 boosters.
  packs      integer not null default 1 check (packs between 1 and 4),
  -- `null` : utilisable à l'infini (code de stream). Un nombre : limité.
  max_uses   integer check (max_uses is null or max_uses > 0),
  used       integer not null default 0 check (used >= 0),
  -- `null` : sans date de fin.
  expires_at timestamptz,
  note       text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  code        text not null references public.promo_codes (code) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  packs       integer not null,
  redeemed_at timestamptz not null default now(),
  -- Un joueur ne rédème un code **qu'une fois** : c'est la clé primaire qui le
  -- garantit, pas un contrôle applicatif qui pourrait être contourné.
  primary key (code, user_id)
);

-- Fermées au client, comme les jetons de notification : ces tables ne se lisent
-- ni ne s'écrivent depuis l'application. Le joueur passe par la fonction.
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
revoke all on table public.promo_codes from public, anon, authenticated;
revoke all on table public.promo_redemptions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rédemption : la seule porte du joueur
-- ---------------------------------------------------------------------------
create or replace function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  -- Normalisation : majuscules, sans espaces ni tirets en trop. Un joueur qui
  -- recopie un code depuis un stream tape rarement la casse exacte.
  v_code    text := upper(regexp_replace(btrim(coalesce(p_code, '')), '\s+', '', 'g'));
  v_row     public.promo_codes;
  v_status  jsonb;
  v_reserve integer;
  v_regen   timestamptz;
  v_total   integer;
begin
  if v_user is null then
    raise exception 'code promo : connecte-toi pour utiliser un code' using errcode = 'P0001';
  end if;
  if v_code = '' then
    raise exception 'code promo : tape un code, puis valide' using errcode = 'P0001';
  end if;

  select * into v_row from public.promo_codes where code = v_code;
  if not found then
    raise exception 'code promo : ce code n''existe pas' using errcode = 'P0001';
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    raise exception 'code promo : ce code a expiré' using errcode = 'P0001';
  end if;
  if v_row.max_uses is not null and v_row.used >= v_row.max_uses then
    raise exception 'code promo : ce code a déjà été utilisé le nombre de fois prévu' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.promo_redemptions r where r.code = v_code and r.user_id = v_user
  ) then
    raise exception 'code promo : tu as déjà utilisé ce code' using errcode = 'P0001';
  end if;

  -- La réserve : `pack_status()` fait foi (elle simule depuis la sauvegarde quand
  -- la ligne n'existe pas encore). On refuse **avant** de consommer le code.
  v_status := public.pack_status();
  v_reserve := coalesce((v_status ->> 'packs')::int, 0);
  if v_reserve + v_row.packs > 4 then
    raise exception 'code promo : ta réserve est pleine (% boosters sur 4) : ouvre un booster, puis retape ce code', v_reserve using errcode = 'P0001';
  end if;

  insert into public.promo_redemptions (code, user_id, packs)
  values (v_code, v_user, v_row.packs);

  update public.promo_codes set used = used + 1 where code = v_code;

  v_regen := coalesce((v_status ->> 'last_regen_at')::timestamptz, now());
  insert into public.pack_state (user_id, packs, last_regen_at, openings)
  values (v_user, v_reserve + v_row.packs, v_regen, coalesce((v_status ->> 'openings')::int, 0))
  on conflict (user_id) do update set
    -- `pack_state.packs` est le compteur que le serveur tire : on l'écrit
    -- directement, la garde de `0019` ne peut pas le réduire puisqu'on a vérifié
    -- juste au-dessus.
    packs      = v_reserve + v_row.packs,
    updated_at = now();

  v_total := v_reserve + v_row.packs;
  return jsonb_build_object(
    'ok', true,
    'packs', v_row.packs,
    'reserve', v_total,
    'note', v_row.note
  );
end;
$$;

-- Le joueur connecté, et personne d'autre.
revoke all on function public.redeem_promo_code(text) from public, anon;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Création d'un code : le rôle de service, ou le SQL Editor
-- ---------------------------------------------------------------------------
-- Le joueur crée ses codes depuis le tableau de bord (SQL Editor, qui tourne
-- avec les droits complets) ou avec la clé de service. **Jamais** depuis
-- l'application : un code créé par un client serait un code créé par n'importe
-- qui.
--
-- Exemple, à coller tel quel :
--   select public.create_promo_code('BOOSTER-2026', 1, null, null, 'stream du 7 octobre');
create or replace function public.create_promo_code(
  p_code       text,
  p_packs      integer default 1,
  p_max_uses   integer default null,
  p_expires_at timestamptz default null,
  p_note       text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(btrim(coalesce(p_code, '')), '\s+', '', 'g'));
begin
  if v_code = '' then
    raise exception 'code promo : il faut un code (par exemple BOOSTER-2026)' using errcode = 'P0001';
  end if;

  insert into public.promo_codes (code, packs, max_uses, expires_at, note)
  values (v_code, greatest(1, least(4, coalesce(p_packs, 1))), p_max_uses, p_expires_at, coalesce(p_note, ''))
  -- Rejouer le même code le **met à jour** au lieu d'échouer : on peut rallonger
  -- une date de fin ou changer la note sans perdre les rédemptions déjà faites.
  on conflict (code) do update set
    packs      = excluded.packs,
    max_uses   = excluded.max_uses,
    expires_at = excluded.expires_at,
    note       = excluded.note;

  return jsonb_build_object('ok', true, 'code', v_code, 'packs', greatest(1, least(4, coalesce(p_packs, 1))));
end;
$$;

revoke all on function public.create_promo_code(text, integer, integer, timestamptz, text)
  from public, anon, authenticated;
do $$
begin
  grant execute on function public.create_promo_code(text, integer, integer, timestamptz, text)
    to service_role;
exception when others then
  raise notice 'rôle service_role absent : le code se crée depuis le SQL Editor';
end
$$;
