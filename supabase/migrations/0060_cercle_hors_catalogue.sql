-- creatordeck-deploy: automatic
-- 0060 : « Mes chaînes » accepte une chaîne regardée hors du catalogue des 1000.
--   * Forme : `twitch:<login>`, login Twitch en minuscules (^[a-z0-9_]{4,25}$).
--     Les chaînes du catalogue restent des slugs nus, revérifiés contre creators.
--   * Toujours 0 à 15 entrées, sans doublon ; vide retire la ligne (0058).
--   * Une chaîne hors catalogue n'a **aucune carte** : open_pack, le cadeau de
--     retour et _pack_circle_missing joignent public.creators, donc l'ignorent.
--     Aucune fonction de tirage n'est redéfinie.
--   * Le direct : refresh-live lit live_circle_logins() (rôle de service seul)
--     pour interroger Twitch aussi sur ces logins. La fonction ne rend que des
--     logins, jamais qui les suit ; live_streams ne publie que ceux en direct.
-- Miroir TypeScript : isValidCircle, customLogin (src/lib/circle.ts).
-- Contrat : src/lib/supabase-cercle-hors-catalogue.test.ts ;
-- preuve SQL : scripts/verify-circle-hors-catalogue.mjs.

-- Valide et normalise un cercle de 0 à 15 entrées ; renvoie l'ordre reçu.
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
  if exists (select 1 from unnest(v_clean) s
              where s like 'twitch:%' and s !~ '^twitch:[a-z0-9_]{4,25}$') then
    raise exception 'cercle : nom de chaîne Twitch invalide' using errcode = 'P0001';
  end if;
  if (select count(*) from public.creators c where c.slug = any (v_clean) and not c.retired)
     <> (select count(*) from unnest(v_clean) s where s not like 'twitch:%') then
    raise exception 'cercle : chaîne inconnue' using errcode = 'P0001';
  end if;
  return v_clean;
end $$;
revoke all on function public._circle_clean(text[]) from public, anon, authenticated;

-- Les logins hors catalogue à surveiller, les plus suivis d'abord.
-- shortcut: 500 logins au plus (5 requêtes Helix de plus par relevé), à relever
-- avec le quota Twitch ou à remplacer par EventSub quand plus de joueurs en nomment.
create or replace function public.live_circle_logins(p_limit integer default 500)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(login order by n desc, login), '{}'::text[])
    from (
      select substr(s, 8) as login, count(*) as n
        from public.player_circles pc
        cross join lateral unnest(pc.slugs) as s
       where s ~ '^twitch:[a-z0-9_]{4,25}$'
         and not exists (select 1 from public.creators c where lower(c.login) = substr(s, 8))
       group by 1
       order by n desc, login
       limit greatest(0, least(coalesce(p_limit, 500), 500))
    ) t
$$;
revoke all on function public.live_circle_logins(integer) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.live_circle_logins(integer) to service_role;
  end if;
end
$$;
