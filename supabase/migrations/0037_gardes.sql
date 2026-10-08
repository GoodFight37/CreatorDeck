-- 0037_gardes.sql — les notifications qui nomment une **perte** avant qu'elle ait lieu.
--
-- Jusqu'ici, une seule chose faisait sonner le téléphone : un créateur qui passe
-- en direct (`push_targets()`, `0023_notifications.sql`). Le joueur le dit
-- mieux que moi : « Rien ne prévient un joueur que sa réserve de boosters va
-- plafonner (un booster qui se perd, littéralement), ni que sa série de 7 jours
-- va se casser ce soir. »
--
-- Les deux ajouts sont de la même famille que le direct, et c'est ce qui décide
-- de leur forme : **on ne promet rien, on annonce une perte qu'on peut encore
-- éviter.** Un booster qui attend au-delà de quatre est perdu, une série de sept
-- jours qui saute repart à J1 — dans les deux cas, il reste du temps pour
-- l'éviter, et c'est le joueur qui décide. Rien n'est inventé, rien n'est
-- accéléré : les deux alertes lisent l'état réel (la réserve du serveur, le
-- journal des tirages).
--
-- Ce fichier **n'ajoute pas** de tables ni de colonnes : `push_targets()`
-- est remplacée (même signature, même liste de colonnes en sortie) et le journal
-- anti-doublon de `0023` porte déjà ce qu'il faut. Aucune porte de plus côté
-- joueur.
--
-- ---------------------------------------------------------------------------
-- Ce que la revue externe proposait, et ce qui a été retenu (8 octobre 2026)
-- ---------------------------------------------------------------------------
-- Trois autres pistes ont été **écartées**, avec le chiffre qui manquait au
-- raisonnement — pour qu'elles ne soient pas reproposées telles quelles :
--
--   * « un indicateur de plancher *sur l'onglet* Drop » : la ligne existe déjà
--     sur l'accueil, entre la garantie et les jetons — « Légendaire garanti dans
--     N boosters » —, et elle est cliquable vers les taux publiés. Rien à
--     ajouter ;
--   * « un rival hebdomadaire parmi ses amis, écart de collection affiché » :
--     l'écart est déjà **public et comparable** (`player_profile()`, classements
--     global / Gold / par famille, arène hebdomadaire). Le seul incrément serait
--     une notification qui apprend à un joueur qu'un *ami* le dépasse — mettre
--     en avant la comparaison sociale entre deux personnes qui se connaissent est
--     la mécanique la plus toxique du lot, et elle n'a pas été retenue ;
--   * « pousser l'affiche après un Perfect/Gold/Légendaire » : c'est déjà le cas
--     depuis la refonte — `reveal-overlay.tsx` n'affiche « Faire une affiche »
--     que sur un Légendaire ou un Perfect (`deservesSpotlight`), pas après une
--     commune. Vérifiable en une ligne de grep.
--
-- Rejouable : `create or replace`, `revoke` et `grant` idempotents.

-- ---------------------------------------------------------------------------
-- L'heure du dernier envoi, pour les deux gardes
-- ---------------------------------------------------------------------------
-- Les deux alertes ne se posent qu'une fois par soirée : la passe suivante
-- (l'horloge tourne toutes les deux minutes) doit pouvoir lire l'heure du dernier
-- envoi **sans rien écrire**. Le marquage, lui, reste dans `push_targets()` —
-- une alerte choisie est une alerte marquée, dans la même transaction.
--
-- `security definer` : c'est `push_targets()` qui appelle, et cette fonction n'a
-- pas à relire les privilèges de l'appelant. Elle ne lit qu'un horodatage,
-- jamais un jeton.
create or replace function public._push_last_sent(p_user uuid, p_login text)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select l.sent_at
    from public.push_log l
   where l.user_id = p_user
     and l.login = p_login;
$$;

revoke all on function public._push_last_sent(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- « Ta série va se casser ce soir »
-- ---------------------------------------------------------------------------
-- Renvoie le **jour du cycle** (1 → 7) si, et seulement si, la série est
-- **vivante** et **pas encore faite aujourd'hui** :
--
--   * vivante : le dernier booster de la série date d'hier. Une série déjà
--     cassée (rien depuis avant-hier) ne se « sauve » pas : prévenir serait
--     relancer un abandon, pas protéger quelque chose ;
--   * pas faite : un joueur qui a déjà ouvert son booster du jour n'a rien à
--     sauver — lui envoyer un rappel serait le genre de notification qui fait
--     couper l'interrupteur ;
--   * une seule fois par soirée : `p_ignore_seconds` (2 h par défaut) empêche
--     une seconde alerte le même soir.
--
-- Le comptage est **celui de `_pack_streak()`** (`0014`) : les jours consécutifs
-- du journal des tirages, du plus récent vers le plus ancien. La série est
-- recalculée ici plutôt que reprise d'une sauvegarde, parce que le journal est
-- la seule source que le client ne peut pas écrire.
create or replace function public._push_serie_due(
  p_user uuid,
  p_now timestamptz,
  p_ignore_seconds integer default 7200
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days   date[];
  v_today  date := public._pack_game_day(p_now);
  v_day    date;
  v_cursor date;
  v_streak integer := 0;
  v_last   timestamptz;
begin
  if p_user is null then
    return null;
  end if;

  select coalesce(array_agg(day order by day desc), '{}')
    into v_days
    from (
      select distinct public._pack_game_day(d.drawn_at) as day
        from public.pack_draws d
       where d.user_id = p_user
         and d.kind = 'live'
       order by day desc
       limit 60
    ) as jours;

  if array_length(v_days, 1) is null then
    return null;
  end if;

  -- Série faite aujourd'hui : rien à sauver aujourd'hui.
  if v_days[1] = v_today then
    return null;
  end if;

  -- Série cassée (rien depuis avant-hier) : il n'y a plus de série à défendre.
  if v_days[1] < v_today - 1 then
    return null;
  end if;

  -- Elle date d'hier : elle est vivante, et il reste jusqu'à 6 h UTC pour la
  -- continuer. On recompte les jours consécutifs jusqu'à hier inclus.
  v_cursor := v_days[1];
  foreach v_day in array v_days
  loop
    exit when v_day <> v_cursor;
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  v_last := public._push_last_sent(p_user, 'série');
  if v_last is not null and v_last > p_now - (p_ignore_seconds::text || ' seconds')::interval then
    return null;
  end if;

  -- Le jour du cycle, 1 → 7 (le 8ᵉ jour d'affilée redevient un J1) : le même
  -- calcul que `applyServerProgression()` côté écran et que `0032` côté serveur.
  return ((v_streak - 1) % 7) + 1;
end;
$$;

comment on function public._push_serie_due(uuid, timestamptz, integer) is
  'Le jour du cycle (1 → 7) quand la série est vivante et pas encore faite aujourd''hui, sinon NULL. Décide la notification « ta série s''arrête ce soir » ; une seule par soirée.';

revoke all on function public._push_serie_due(uuid, timestamptz, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- « Ta réserve est pleine, un booster se perd »
-- ---------------------------------------------------------------------------
-- Renvoie le nombre de boosters en réserve si — et seulement si — la réserve est
-- **au maximum** (4, `PACKS.live.max`) et qu'elle l'est **depuis assez longtemps
-- pour qu'une recharge soit tombée dans le vide** : 2 h par défaut, c'est-à-dire
-- une heure pour se remplir (deux recharges de 30 minutes) plus une heure de
-- sursis pour ouvrir tranquillement. Une alerte au moment où la réserve atteint
-- quatre serait un ordre ; deux heures plus tard, c'est une perte réelle, qu'on
-- peut encore éviter.
--
-- Le calcul est **celui du jeu** (`_pack_refresh()`, `0004`) : les périodes de
-- 30 minutes écoulées depuis `last_regen_at`. La fonction lit, elle n'écrit
-- rien — la notification ne remplit ni ne vide la réserve.
create or replace function public._push_reserve_due(
  p_user uuid,
  p_now timestamptz,
  p_ignore_seconds integer default 7200
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_packs  integer;
  v_last   timestamptz;
  v_anchor timestamptz;
  v_gained integer;
begin
  if p_user is null then
    return null;
  end if;

  select ps.packs, ps.last_regen_at into v_packs, v_last
    from public.pack_state ps
   where ps.user_id = p_user;

  -- Pas de partie côté serveur, ou réserve entamée : il n'y a rien à perdre.
  if v_packs is null or v_packs < 4 then
    return null;
  end if;

  -- Recul d'horloge : on ré-ancre, comme `_pack_refresh` — sinon la fonction
  -- annoncerait une recharge perdue qui n'a pas eu lieu.
  v_anchor := least(v_last, p_now);
  v_gained := floor(extract(epoch from (p_now - v_anchor)) * 1000 / 1800000)::integer;

  if v_gained::bigint * 1800000 < p_ignore_seconds::bigint * 1000 then
    return null;
  end if;

  v_last := public._push_last_sent(p_user, 'réserves');
  if v_last is not null and v_last > p_now - (p_ignore_seconds::text || ' seconds')::interval then
    return null;
  end if;

  return v_packs;
end;
$$;

comment on function public._push_reserve_due(uuid, timestamptz, integer) is
  'Le nombre de boosters en réserve quand elle est pleine et que la recharge s''est perdue depuis assez longtemps, sinon NULL. Décide la notification « un booster se perd » ; une seule par soirée.';

revoke all on function public._push_reserve_due(uuid, timestamptz, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- `push_targets()`, remplacée
-- ---------------------------------------------------------------------------
-- Même signature, même liste de colonnes en sortie : rien à changer côté
-- `notify-live` pour les directs, et les deux alertes arrivent par la même porte.
--
-- Pour une alerte de perte, les colonnes portent ce que la phrase demande :
-- `login` est la **clé du journal** (`série`, `réserves`), `display_name` est
-- vide et `viewers` porte le **chiffre utile** — le jour du cycle pour la série,
-- le nombre de boosters pour la réserve. Le texte, lui, s'écrit à un seul
-- endroit (`messageFor()` dans `notify-live`).
--
-- Ce qui change par rapport à `0023` :
--
--   * le plafond « une notification par heure » ne s'applique plus **qu'aux
--     directs**. Sans cette exception, une alerte de série (choisie la première)
--     repoussait de deux heures l'alerte de réserve, et deux alertes qui se
--     repoussent l'une l'autre sont deux alertes qui n'arrivent jamais. Chaque
--     garde a son propre espacement : une par soirée ;
--   * le plafond « six heures par créateur » reste sur les directs : il parle du
--     même créateur qui repasse en live, ce qui n'a aucun rapport ;
--   * les alertes de perte passent **après** les directs : ce sont des
--     rattrapages (« garde ce que tu as »), là où un direct est le moment qu'on
--     veut attraper. Un joueur qui mérite les deux au même passage reçoit le
--     direct, et l'alerte à la passe suivante — quand elle est encore vraie.
create or replace function public.push_targets()
returns table (
  user_id      uuid,
  token        text,
  login        text,
  display_name text,
  viewers      integer,
  reason       text
)
language plpgsql
security definer
set search_path = public
as $$
-- `user_id` et `login` sont aussi des paramètres de sortie : sans cette
-- consigne, PL/pgSQL refuse la requête (« column reference is ambiguous »)
-- au premier appel. Ici, le nom nu désigne **toujours** la colonne — c'est ce
-- que veulent `on conflict (user_id, login)` et `returning`.
#variable_conflict use_column
begin
  return query
  with frais as (
    select s.login, s.display_name, greatest(coalesce(s.viewers, 0), 0) as viewers
      from public.live_streams s
     where s.started_at is not null
       and s.started_at > now() - interval '30 minutes'
       and coalesce(s.viewers, 0) > 0
  ),
  interesses as (
    select t.token, t.user_id, f.login, f.display_name, f.viewers,
           case when w.slug is null then 'collection' else 'epingle' end as reason,
           case when w.slug is null then 1 else 0 end as rang
      from frais f
      join public.creators c on c.login = f.login and not c.retired
      join public.push_tokens t on t.live
      left join public.wishlist w on w.user_id = t.user_id and w.slug = c.slug
     where w.slug is not null
        or exists (
             select 1
               from public.user_cards uc
              where uc.user_id = t.user_id
                and uc.creator_slug = c.slug
           )
  ),
  eligibles as (
    select i.token, i.user_id, i.login, i.display_name, i.viewers, i.reason, i.rang
      from interesses i
     where not exists (
             select 1
               from public.push_log l
              where l.user_id = i.user_id
                and l.login = i.login
                and l.sent_at > now() - interval '6 hours'
           )
       and not exists (
             select 1
               from public.push_log l
              where l.user_id = i.user_id
                -- Le plafond d'une heure ne parle que des **directs** : les
                -- alertes de perte ont leur propre espacement (une par soirée).
                and l.login not in ('série', 'réserves')
                and l.sent_at > now() - interval '1 hour'
           )
  ),
  choisis as (
    select distinct on (e.token) e.*
      from eligibles e
     order by e.token, e.rang, e.viewers desc, e.login
  ),
  -- Les deux gardes, une ligne par appareil allumé. `nombre` est le chiffre que
  -- la phrase utilisera ; `cle` est la ligne du journal, donc l'espacement.
  gardes as (
    select t.token, t.user_id, 'serie'::text as reason, 'série'::text as cle,
           public._push_serie_due(t.user_id, now()) as nombre
      from public.push_tokens t
     where t.live
    union all
    select t.token, t.user_id, 'reserve'::text as reason, 'réserves'::text as cle,
           public._push_reserve_due(t.user_id, now()) as nombre
      from public.push_tokens t
     where t.live
  ),
  gardes_dues as (
    select g.token, g.user_id, g.reason, g.cle, g.nombre
      from gardes g
     where g.nombre is not null
       -- Un appareil ne reçoit pas de garde le passage où il reçoit un direct :
       -- la garde reste vraie une ou deux heures, le direct une demi-heure.
       and not exists (select 1 from choisis c where c.token = g.token)
  ),
  choisis_gardes as (
    select distinct on (g.token) g.token, g.user_id, g.reason, g.cle, g.nombre
      from gardes_dues g
     order by g.token, g.reason
  ),
  marque as (
    insert into public.push_log (user_id, login, sent_at)
    -- `distinct on` : un joueur peut avoir deux appareils, donc deux lignes
    -- choisies pour le même créateur — le journal n'en garde qu'une, sinon
    -- Postgres refuse (« ON CONFLICT DO UPDATE cannot affect row a second time »).
    select distinct on (c.user_id, c.login) c.user_id, c.login, now()
      from (
        select c.user_id, c.login from choisis c
        union all
        select g.user_id, g.cle from choisis_gardes g
      ) as c
     order by c.user_id, c.login
    on conflict (user_id, login) do update set sent_at = excluded.sent_at
    returning push_log.user_id, push_log.login
  )
  -- Les directs d'abord (le journal les a marqués aussi), puis les gardes.
  select c.user_id, c.token, c.login, c.display_name, c.viewers, c.reason
    from choisis c
    join marque m on m.user_id = c.user_id and m.login = c.login
   union all
  select g.user_id, g.token, g.cle, null, g.nombre, g.reason
    from choisis_gardes g
    join marque m on m.user_id = g.user_id and m.login = g.cle
   order by 1, 2, 6;
end;
$$;

comment on function public.push_targets() is
  'Choisit les appareils à réveiller : les directs qui viennent de commencer (épinglé ou carte possédée), puis les deux alertes de perte — « ta série s''arrête ce soir » et « ta réserve est pleine » —, marque le journal anti-doublon et renvoie la liste. Réservée au rôle de service.';

-- `push_targets()` lit les jetons de **tout le monde** : elle n'est pas pour un
-- joueur, même connecté. Le rôle `service_role` n'existe que sur Supabase (le
-- vérificateur, lui, joue les migrations sur un Postgres nu) : on le teste
-- avant de lui donner le droit.
revoke all on function public.push_targets() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.push_targets() to service_role;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Le rapport de version, étendu
-- ---------------------------------------------------------------------------
/**
 * `schema_versions()` (défini en `0035`, étendu en `0036`) redit ce que la base
 * sait faire, avec la ligne de la `0037` en plus.
 *
 * Le marqueur de `0037` est la présence de la garde de série : elle n'existe que
 * dans cette migration.
 */
create or replace function public.schema_versions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    -- 0030 : la Légendaire peut sortir Gold (1 %, hors Perfect).
    '0030', position('v_roll < 100' in public._schema_body('public._pack_choose_variant(text, boolean, boolean)')) > 0,
    -- 0031 : le plancher de malchance à douze.
    '0031', position('v_pity + 1 >= 12' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0032 : la série paie ses jours.
    '0032', position('serie-j' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0033 : le départ est maigre (deux boosters).
    '0033', position('public._pack_initial_packs()' in public._schema_body('public.open_pack(text)')) > 0,
    -- 0034 : une Légendaire et une Live ne se volent pas.
    '0034', position('ne se vole pas' in public._schema_body('public.last_pack_steal(bigint, integer)')) > 0,
    -- 0035 : les jetons vivent au serveur.
    '0035', to_regprocedure('public.tokens_get()') is not null,
    -- 0036 : la chaîne (le simulateur de streameur).
    '0036', to_regclass('public.streamer_channels') is not null,
    -- 0037 : les alertes de perte (série qui s'arrête, réserve pleine).
    '0037', to_regprocedure('public._push_serie_due(uuid, timestamptz, integer)') is not null
  );
$$;

-- Lisible **sans compte** : c'est un diagnostic, pas une donnée de joueur.
revoke all on function public.schema_versions() from public;
grant execute on function public.schema_versions() to anon, authenticated;
