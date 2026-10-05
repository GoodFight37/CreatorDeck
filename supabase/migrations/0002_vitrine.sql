-- CreatorDeck — la vitrine : jusqu'à 4 cartes épinglées sur son profil public.
--
-- Deuxième migration, à exécuter **après** `0001_comptes_cloud.sql` (les échanges
-- viendront ensuite, dans `0003_echanges.sql`).
--
-- Ce que ça change :
--   * `set_showcase(p_slugs)` : le joueur épingle jusqu'à 4 créateurs de **sa
--     collection**. Le serveur vérifie la possession dans la sauvegarde qu'il
--     connaît (`saves.state`) — on ne peut donc pas exposer la carte d'un autre,
--     ni une carte inventée ;
--   * l'écriture directe de la colonne `showcase_slugs` est retirée aux clients
--     (privilège par colonne) : la fonction est le seul chemin, et c'est elle qui
--     contrôle. Le nom affiché reste modifiable directement.
--
-- Rejouable : `create or replace` + `grant`/`revoke` idempotents.

-- --------------------------------------------------------------------------
-- Le nom reste modifiable par le client, la vitrine passe par la fonction
-- --------------------------------------------------------------------------
-- Sans ça, un client pourrait écrire n'importe quoi dans `showcase_slugs` en
-- PATCHant sa ligne `profiles` (la politique RLS l'autorise à modifier *sa*
-- ligne, mais elle ne regarde pas les valeurs).
revoke update on public.profiles from anon, authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

-- --------------------------------------------------------------------------
-- Épingler ses cartes
-- --------------------------------------------------------------------------
create or replace function public.set_showcase(p_slugs text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_slugs   text[];
  v_bad     text[];
begin
  if v_user is null then
    raise exception 'vitrine : connecte-toi pour choisir tes cartes' using errcode = 'P0001';
  end if;

  -- Nettoyage : minuscules, sans espaces, sans vides ni doublons.
  -- L'ordinalité garde l'ordre choisi par le joueur après dédoublonnage.
  select coalesce(array_agg(propres.slug order by propres.first_position), '{}'::text[])
    into v_slugs
    from (
      select lower(btrim(input.raw_slug)) as slug, min(input.ordinal) as first_position
        from unnest(coalesce(p_slugs, '{}'::text[])) with ordinality as input(raw_slug, ordinal)
       group by lower(btrim(input.raw_slug))
    ) as propres
   where propres.slug <> '';

  if array_length(v_slugs, 1) > 4 then
    raise exception 'vitrine : 4 cartes maximum' using errcode = 'P0001';
  end if;

  -- Un slug du catalogue : minuscules, chiffres, tirets.
  select array_agg(candidate.slug) into v_bad
    from unnest(v_slugs) as candidate(slug)
   where candidate.slug !~ '^[a-z0-9][a-z0-9-]{0,39}$';
  if v_bad is not null then
    raise exception 'vitrine : nom de créateur invalide (%)', array_to_string(v_bad, ', ')
      using errcode = 'P0001';
  end if;

  -- Possession : la carte doit figurer dans la sauvegarde poussée par ce joueur.
  if array_length(v_slugs, 1) > 0 then
    select array_agg(requested.slug) into v_bad
      from unnest(v_slugs) as requested(slug)
     where not exists (
       select 1
         from public.saves as s
         cross join lateral jsonb_array_elements(coalesce(s.state -> 'cards', '[]'::jsonb)) as cards(card)
        where s.user_id = v_user
          and cards.card ->> 'creatorSlug' = requested.slug
     );
    if v_bad is not null then
      raise exception 'vitrine : carte non possédée (%)', array_to_string(v_bad, ', ')
        using errcode = 'P0001';
    end if;
  end if;

  -- La ligne de profil existe déjà (déclencheur `saves_ensure_profile`) ; on la
  -- crée quand même si la vitrine est réglée avant le premier envoi.
  insert into public.profiles as p (user_id, display_name, showcase_slugs, updated_at)
  values (
    v_user,
    'Collectionneur #' || left(replace(v_user::text, '-', ''), 4),
    v_slugs,
    now()
  )
  on conflict (user_id) do update
    set showcase_slugs = excluded.showcase_slugs,
        updated_at     = now();

  return v_slugs;
end;
$$;

-- Seuls les joueurs connectés peuvent l'appeler, et la fonction s'exécute avec
-- les droits de son propriétaire (elle a besoin d'écrire une colonne que le
-- client n'a plus le droit de toucher).
revoke all on function public.set_showcase(text[]) from public, anon;
grant execute on function public.set_showcase(text[]) to authenticated;
