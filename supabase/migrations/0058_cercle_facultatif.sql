-- creatordeck-deploy: automatic
-- 0058 : « Mes chaînes » devient facultatif. Un cercle compte de 0 à 15 chaînes.
--   * 0 = pas de ligne dans player_circles (une liste vide supprime la ligne) :
--     le Live Drop reste le pool mondial, rien n'est inventé.
--   * 1 à 15 : le biais de 0056 s'applique aux seules chaînes nommées
--     (slots 1, 2 et 5 parmi les absentes, préférée d'abord).
--   * Un cercle déjà enregistré de 5 à 15 reste valide : aucune ligne modifiée.
-- open_pack() n'est pas redéfinie : sa logique de cercle est celle de 0056,
-- reprise telle quelle par 0057 (série en boosters). Elle lit déjà la liste des
-- absentes quelle que soit sa taille ; la redéfinir depuis 0056 effacerait 0057.
-- Aucun poids du pool mondial n'est touché.
-- Miroir TypeScript : isValidCircle (src/lib/circle.ts), circleDrawSlots
-- (src/lib/circle-draw.ts). Contrat : src/lib/supabase-cercle-facultatif.test.ts.

-- La borne basse (5) de 0054 disparaît ; la borne haute (15) reste.
do $$
declare v_name text;
begin
  for v_name in
    select con.conname from pg_constraint con
     where con.conrelid = 'public.player_circles'::regclass and con.contype = 'c'
       and pg_get_constraintdef(con.oid) like '%array_length(slugs, 1)%'
  loop
    execute format('alter table public.player_circles drop constraint %I', v_name);
  end loop;
end $$;
alter table public.player_circles
  add constraint player_circles_slugs_max check (coalesce(array_length(slugs, 1), 0) <= 15);

-- Valide et normalise un cercle de 0 à 15 chaînes ; renvoie l'ordre reçu.
create or replace function public._circle_clean(p_slugs text[])
returns text[] language plpgsql stable set search_path = public as $$
declare v_clean text[]; v_n integer;
begin
  select coalesce(array_agg(lower(btrim(s)) order by o), '{}') into v_clean
    from unnest(coalesce(p_slugs, '{}')) with ordinality as t(s, o);
  v_n := coalesce(array_length(v_clean, 1), 0);
  if v_n > 15 then
    raise exception 'cercle : 15 chaînes au maximum' using errcode = 'P0001';
  end if;
  if (select count(distinct s) from unnest(v_clean) s) <> v_n then
    raise exception 'cercle : une chaîne est en double' using errcode = 'P0001';
  end if;
  if (select count(*) from public.creators c where c.slug = any (v_clean) and not c.retired) <> v_n then
    raise exception 'cercle : chaîne inconnue' using errcode = 'P0001';
  end if;
  return v_clean;
end $$;
revoke all on function public._circle_clean(text[]) from public, anon, authenticated;

-- Zéro chaîne : la ligne est retirée (« pas de cercle »), jamais une liste inventée.
create or replace function public.set_circle(p_slugs text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_clean text[];
begin
  if v_user is null then raise exception 'cercle : connecte-toi' using errcode = 'P0001'; end if;
  v_clean := public._circle_clean(p_slugs);
  if cardinality(v_clean) = 0 then
    delete from public.player_circles where user_id = v_user;
  else
    insert into public.player_circles(user_id, slugs) values (v_user, v_clean)
      on conflict (user_id) do update set slugs = excluded.slugs, updated_at = now();
  end if;
  return jsonb_build_object('slugs', to_jsonb(v_clean));
end $$;
revoke all on function public.set_circle(text[]) from public, anon;
grant execute on function public.set_circle(text[]) to authenticated;
