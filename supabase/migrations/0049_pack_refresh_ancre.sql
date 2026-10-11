-- creatordeck-deploy: automatic
-- K-031 — conserver exactement les intervalles consommés par la recharge.
-- 0048 avançait l’ancre de N millisecondes au lieu de N intervalles.

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
    v_next_last := v_anchor + ((v_gained::bigint * p_interval_ms)::text || ' milliseconds')::interval;
  end if;

  return jsonb_build_object('packs', v_next_packs, 'last_regen_at', v_next_last);
end;
$$;
revoke all on function public._pack_refresh(integer,integer,timestamptz,bigint,timestamptz)
  from public, anon, authenticated;
