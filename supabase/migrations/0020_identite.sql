-- ==========================================================================
-- 0020 — Deux joueurs ne portent pas le même nom
-- ==========================================================================
--
-- `0019` a réservé les noms **des créateurs** (display_name et login Twitch du
-- catalogue) : on ne se fait plus passer pour un streameur. Il restait le cas
-- plus banal : deux joueurs qui choisissent le même pseudo, à une majuscule
-- près. Rien ne l'empêchait, et c'est la base de l'usurpation la plus simple —
-- « Fabien » et « fabien » dans le même classement.
--
-- Pourquoi un **trigger** et pas un index unique (`unique (lower(display_name))`) :
--
--   * une contrainte refuse la migration **entière** si la base contient déjà
--     deux noms identiques (comptes de test, vieux essais) — le joueur n'aurait
--     aucun moyen de la coller sans supprimer des comptes, et on ne supprime
--     jamais rien ;
--   * un trigger ne juge que les écritures **nouvelles** : l'existant reste
--     intact, et le message est en français, lisible par le joueur.
--
-- La comparaison est insensible à la casse et aux espaces autour : «  Fabien »
-- et « fabien » sont le même nom.
--
-- Ce que cette migration **ne fait pas** : renommer les doublons déjà en base.
-- Aucun compte n'est touché ; les joueurs concernés pourront changer de nom
-- librement (l'un des deux devra le faire pour se renommer vers un nom pris,
-- mais seul le premier arrivé garde « fabien »).

create or replace function public._display_name_unique()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text := btrim(new.display_name);
begin
  -- Rien à vérifier si le nom ne change pas (une vitrine qu'on met à jour, par
  -- exemple) : c'est le rôle de `is not distinct from`.
  if tg_op = 'UPDATE' and cleaned is not distinct from btrim(old.display_name) then
    return new;
  end if;
  if cleaned = '' then
    return new;
  end if;
  if exists (
    select 1
      from public.profiles p
     where lower(btrim(p.display_name)) = lower(cleaned)
       and p.user_id <> new.user_id
  ) then
    raise exception 'pseudo : ce nom est déjà pris (à une majuscule près)'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_name_unique on public.profiles;
create trigger profile_name_unique
  before insert or update on public.profiles
  for each row execute function public._display_name_unique();

-- Fonction de trigger : personne ne l'appelle à la main, pas même un compte
-- connecté. Elle a besoin de lire `profiles` (d'où `security definer`) pour
-- comparer — un joueur, lui, n'a le droit que de lire la table entière.
revoke all on function public._display_name_unique() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Ce que cette migration laisse en place (et pourquoi)
-- --------------------------------------------------------------------------
-- * Les noms des créateurs restent réservés : `0019`, trigger
--   `profile_name_reserve`.
-- * La vitrine ne peut toujours pas être écrite à la main :
--   `set_showcase(p_slugs)` de `0002` s'en charge.
-- * Aucun joueur existant n'est renommé ni supprimé.
