-- 0024_push_state.sql — « est-ce que je suis prévenu ? »
--
-- Défaut trouvé par le joueur le 7 octobre 2026 : à chaque fermeture puis
-- réouverture de l'application, l'interrupteur « Directs de ma collection »
-- revenait **éteint**. Il n'était pas éteint : il était *inconnu*. L'état vit
-- en mémoire (`pushLive`), pas dans la sauvegarde ; au lancement il vaut `null`,
-- et l'écran affiche un interrupteur éteint. Le serveur, lui, gardait bien
-- `push_tokens.live = true` : les notifications continuaient d'arriver, mais
-- l'écran mentait — le pire des deux, parce qu'un joueur qui croit ses
-- notifications coupées finit par les couper pour de bon.
--
-- Cette migration ajoute la seule chose qui manquait : **une lecture**. Elle
-- n'écrit rien, ne décide rien, et n'ouvre la table à personne : chaque compte
-- apprend seulement si *le sien* reçoit les notifications, et sur combien
-- d'appareils.
--
-- Rejouable : `create or replace`, `revoke` et `grant` sont idempotents.

create or replace function public.push_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_count integer := 0;
  v_live  boolean := false;
begin
  -- Sans identité (visiteur sans compte, appel d'une clé anonyme), on ne dit
  -- rien de personne plutôt que de lever : ce n'est pas une erreur, c'est
  -- « rien à te dire ».
  if v_user is null then
    return jsonb_build_object('ok', true, 'live', false, 'devices', 0);
  end if;

  -- `bool_or` sur zéro ligne rend `null` : un compte dont tous les appareils
  -- ont été effacés n'a personne à prévenir, donc `false`. Un appareil allumé
  -- suffit pour dire « oui » — c'est la même règle que `push_targets()`, qui
  -- envoie à tous les appareils allumés du compte.
  select count(*)::int, coalesce(bool_or(live), false)
    into v_count, v_live
    from public.push_tokens
   where user_id = v_user;

  return jsonb_build_object('ok', true, 'live', v_live, 'devices', v_count);
end;
$$;

-- Lecture réservée aux comptes : aucun visiteur n'a besoin de savoir qui est
-- prévenu. Le rôle de service n'en a pas besoin non plus — `push_targets()`
-- est là pour lui.
revoke all on function public.push_state() from public, anon;
grant execute on function public.push_state() to authenticated;
