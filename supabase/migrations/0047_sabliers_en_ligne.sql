-- creatordeck-deploy: manual
-- 0047 — Relier les sabliers à la réserve serveur sans modifier leurs gains.
-- Additive, idempotente ; aucune dépense ni remise à zéro à l'installation.
-- Le solde synchronisé reste issu des récompenses calculées sur l'appareil.
-- Cette migration protège les dépenses/rejeux, pas l'origine de ces gains.

-- Calcul propre à cette recharge : conserver le temps résiduel après chaque
-- intervalle. Le helper historique _pack_refresh n'est pas modifié ici.
create or replace function public._hourglass_refresh(
  p_current_packs integer,
  p_max integer,
  p_last_regen_at timestamptz,
  p_interval_ms bigint,
  p_now timestamptz
)
returns jsonb -- { packs, last_regen_at }
language plpgsql
immutable
as $$
declare
  v_anchor timestamptz;
  v_gained integer;
  v_next_packs integer;
  v_next_last timestamptz;
begin
  if p_current_packs >= p_max then
    return jsonb_build_object('packs', p_max, 'last_regen_at', p_now);
  end if;

  -- Recul d'horloge : ré-ancre sur now, pas de recharge gratuite.
  v_anchor := least(p_last_regen_at, p_now);
  v_gained := floor(
    extract(epoch from (p_now - v_anchor)) * 1000 / p_interval_ms
  )::integer;

  if v_gained <= 0 then
    return jsonb_build_object('packs', p_current_packs, 'last_regen_at', v_anchor);
  end if;

  v_next_packs := least(p_max, p_current_packs + v_gained);
  if v_next_packs >= p_max then
    v_next_last := p_now;
  else
    v_next_last := v_anchor + ((v_gained::bigint * p_interval_ms)::text || ' milliseconds')::interval;
  end if;

  return jsonb_build_object('packs', v_next_packs, 'last_regen_at', v_next_last);
end;
$$;
revoke all on function public._hourglass_refresh(integer,integer,timestamptz,bigint,timestamptz) from public, anon, authenticated;

create table if not exists public.hourglass_spends (
  user_id uuid not null references public.pack_state(user_id) on delete cascade,
  request_id uuid not null,
  spent_at timestamptz not null default now(),
  primary key(user_id, request_id)
);
alter table public.hourglass_spends enable row level security;
revoke all on public.hourglass_spends from public, anon, authenticated;

-- Une ancienne sauvegarde, même forcée, ne peut restaurer un solde d'avant
-- une dépense. Les autres RPC conservent ce champ en modifiant le JSON.
-- Le reset individuel supprime pack_state, donc ce registre par cascade :
-- la nouvelle partie (compteur 0) peut ensuite être synchronisée normalement.
create or replace function public._guard_hourglass_spends()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_count bigint;
  v_marker text := coalesce(new.state->>'hourglassesSpent', '0');
begin
  select count(*) into v_count from public.hourglass_spends where user_id = new.user_id;
  if v_marker !~ '^[0-9]+$' or v_marker::numeric <> v_count then
    raise exception 'sabliers : charge la sauvegarde du cloud dans Compte avant de synchroniser' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public._guard_hourglass_spends() from public, anon, authenticated;
drop trigger if exists guard_hourglass_spends on public.saves;
create trigger guard_hourglass_spends before insert or update of state on public.saves
for each row execute function public._guard_hourglass_spends();

create or replace function public.use_hourglass(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_pack public.pack_state;
  v_save public.saves;
  v_refreshed jsonb;
  v_packs integer;
  v_anchor timestamptz;
  v_balance integer;
  v_count bigint;
  v_state jsonb;
begin
  if v_user is null then
    raise exception 'sabliers : connecte-toi d''abord' using errcode = 'P0001';
  end if;
  if p_request_id is null then
    raise exception 'sabliers : demande de recharge manquante' using errcode = 'P0001';
  end if;
  insert into public.pack_state(user_id, packs, last_regen_at)
    values(v_user, public._pack_initial_packs(), v_now) on conflict(user_id) do nothing;
  -- Même ordre de verrous que open_pack : réserve, puis sauvegarde.
  select * into v_pack from public.pack_state where user_id = v_user for update;
  select * into v_save from public.saves where user_id = v_user for update;
  if v_save.user_id is null then
    raise exception 'sabliers : synchronise ta partie dans Compte d''abord' using errcode = 'P0001';
  end if;
  -- Après une réponse perdue, renvoyer la sauvegarde actuelle, sans rejouer
  -- le débit, même si le solde est maintenant vide ou la réserve pleine.
  if exists(select 1 from public.hourglass_spends where user_id = v_user and request_id = p_request_id) then
    return jsonb_build_object('status','used','save',to_jsonb(v_save),'replayed',true);
  end if;
  v_refreshed := public._hourglass_refresh(v_pack.packs, 4, v_pack.last_regen_at, 1800000, v_now);
  v_packs := (v_refreshed->>'packs')::integer;
  v_anchor := (v_refreshed->>'last_regen_at')::timestamptz;
  if v_packs >= 4 then
    raise exception 'sabliers : ta réserve est pleine, ouvre un booster d''abord' using errcode = 'P0001';
  end if;
  v_balance := coalesce((v_save.state->>'hourglasses')::integer, 0);
  if v_balance <= 0 then
    raise exception 'sabliers : tu n''as plus de sablier' using errcode = 'P0001';
  end if;
  v_refreshed := public._hourglass_refresh(v_packs, 4, v_anchor - interval '15 minutes', 1800000, v_now);
  v_packs := (v_refreshed->>'packs')::integer;
  v_anchor := (v_refreshed->>'last_regen_at')::timestamptz;
  insert into public.hourglass_spends(user_id, request_id) values(v_user, p_request_id);
  select count(*) into v_count from public.hourglass_spends where user_id = v_user;
  v_state := v_save.state || jsonb_build_object(
    'hourglasses',v_balance - 1, 'hourglassesSpent',v_count,
    'packs',v_packs, 'lastPackRegen',floor(extract(epoch from v_anchor)*1000)::bigint,
    'updatedAt',floor(extract(epoch from v_now)*1000)::bigint
  );
  update public.pack_state set packs=v_packs, last_regen_at=v_anchor, updated_at=v_now where user_id=v_user;
  update public.saves set state=v_state, state_checksum=md5(v_state::text), updated_at=v_now
    where user_id=v_user returning * into v_save;
  return jsonb_build_object('status','used','save',to_jsonb(v_save),'replayed',false);
end;
$$;
revoke all on function public.use_hourglass(uuid) from public, anon;
grant execute on function public.use_hourglass(uuid) to authenticated;
