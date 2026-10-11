-- creatordeck-deploy: manual
-- 0048 — Un sablier peut ajouter un booster bonus au-dessus de la réserve.
-- La réserve normale reste à quatre ; un seul excédent (5/4) est autorisé.

alter table public.pack_state
  drop constraint if exists pack_state_packs_check;
alter table public.pack_state
  add constraint pack_state_packs_check check (packs between 0 and 5);

-- Une valeur excédentaire est gardée jusqu'à son ouverture. La recharge
-- ordinaire, elle, reste plafonnée par p_max (4).
create or replace function public._pack_refresh(
  p_current_packs integer,
  p_max integer,
  p_last_regen_at timestamptz,
  p_interval_ms bigint,
  p_now timestamptz
)
returns jsonb
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
    return jsonb_build_object(
      'packs', least(p_current_packs, p_max + 1),
      'last_regen_at', p_now
    );
  end if;

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
    v_next_last := v_anchor + (v_gained::text || ' milliseconds')::interval;
  end if;

  return jsonb_build_object('packs', v_next_packs, 'last_regen_at', v_next_last);
end;
$$;
revoke all on function public._pack_refresh(integer,integer,timestamptz,bigint,timestamptz)
  from public, anon, authenticated;

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
  select * into v_pack from public.pack_state where user_id = v_user for update;
  select * into v_save from public.saves where user_id = v_user for update;
  if v_save.user_id is null then
    raise exception 'sabliers : synchronise ta partie dans Compte d''abord' using errcode = 'P0001';
  end if;
  if exists(select 1 from public.hourglass_spends where user_id = v_user and request_id = p_request_id) then
    return jsonb_build_object('status','used','save',to_jsonb(v_save),'replayed',true);
  end if;

  if v_pack.packs >= 5 then
    v_packs := 5;
    v_anchor := v_now;
  else
    v_refreshed := public._hourglass_refresh(v_pack.packs, 4, v_pack.last_regen_at, 1800000, v_now);
    v_packs := (v_refreshed->>'packs')::integer;
    v_anchor := (v_refreshed->>'last_regen_at')::timestamptz;
  end if;
  if v_packs >= 5 then
    raise exception 'sabliers : ouvre le booster bonus avant d''en utiliser un autre' using errcode = 'P0001';
  end if;
  v_balance := coalesce((v_save.state->>'hourglasses')::integer, 0);
  if v_balance <= 0 then
    raise exception 'sabliers : tu n''as plus de sablier' using errcode = 'P0001';
  end if;

  if v_packs = 4 then
    -- Une réserve pleine n'a pas de minuterie à réduire : le sablier crée
    -- donc un seul booster bonus et laisse la recharge normale à l'arrêt.
    v_packs := 5;
    v_anchor := v_now;
  else
    v_refreshed := public._hourglass_refresh(v_packs, 4, v_anchor - interval '15 minutes', 1800000, v_now);
    v_packs := (v_refreshed->>'packs')::integer;
    v_anchor := (v_refreshed->>'last_regen_at')::timestamptz;
  end if;

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
