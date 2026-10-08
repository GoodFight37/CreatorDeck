-- ==========================================================================
-- 0017 — Rejouer la partie à zéro (en ligne comprise)
--
-- Pourquoi cette migration existe : « Réinitialiser la progression » ne
-- touchait que l'appareil. Le serveur, lui, garde **sa** réserve de boosters
-- (`pack_state`), **son** journal de tirages (donc le plancher de malchance et
-- la série) et le Paquet Scène du jour. Un joueur qui repartait de zéro
-- attendait donc quand même la recharge de la partie qu'il venait d'effacer —
-- et se voyait refuser le Paquet Scène parce que « ton paquet du jour est déjà
-- ouvert ». Le bouton mentait.
--
-- Ce que cette migration ne touche pas, volontairement :
--
--   * `saves` — la partie neuve remonte juste après par `push_save()`, et
--     c'est elle qui sert de source à la réserve reconstruite ;
--   * `profiles` — le pseudo et la vitrine ne sont pas de la progression ;
--   * `wishlist` — un créateur épinglé reste une envie, pas un acquis ;
--   * `trades`, `friends`, `market_listings` — un échange conclu, une amitié ou
--     une annonce en cours ne s'effacent pas parce qu'on recommence sa partie.
--
-- Rejouable : `create or replace` + `grant`/`revoke`, rien d'autre.
-- ==========================================================================

create or replace function public.reset_progress()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_draws integer := 0;
  v_scene integer := 0;
begin
  -- Authentification obligatoire : on n'efface que sa propre partie.
  if v_user is null then
    raise exception 'reinitialisation : connecte-toi d''abord' using errcode = 'P0001';
  end if;

  -- ------------------------------------------------------------------
  -- La réserve de boosters.
  --
  -- Supprimée, pas remise à zéro : la prochaine lecture la reconstruit depuis
  -- la sauvegarde (`open_pack` et `pack_status` la recréent au besoin), donc un
  -- joueur neuf retrouve ses 3 boosters tout de suite au lieu d'attendre.
  -- ------------------------------------------------------------------
  delete from public.pack_state where user_id = v_user;

  -- ------------------------------------------------------------------
  -- Le journal des tirages.
  --
  -- C'est lui qui porte le plancher de malchance, la série de jours et le
  -- Perfect du 7e : une partie neuve repart de zéro sur les trois. Effacer son
  -- propre journal ne donne aucun avantage — il ne peut que faire **perdre** la
  -- garantie en cours —, et rien d'autre ne le lit.
  -- ------------------------------------------------------------------
  delete from public.pack_draws where user_id = v_user;
  get diagnostics v_draws = row_count;

  -- ------------------------------------------------------------------
  -- Le Paquet Scène du jour : de nouveau disponible, comme dans une partie
  -- neuve. Deux lignes au plus (une par jour de jeu).
  -- ------------------------------------------------------------------
  delete from public.pack_scene where user_id = v_user;
  get diagnostics v_scene = row_count;

  -- ------------------------------------------------------------------
  -- Les Last Pack encore exposés : ils montrent les cinq cartes d'un booster
  -- qui n'existe plus. Les laisser ouverts laisserait un ami voler une carte
  -- d'une collection effacée (le vol échouerait, mais autant ne pas l'exposer).
  -- ------------------------------------------------------------------
  delete from public.last_packs where user_id = v_user;

  return jsonb_build_object(
    'status', 'reset',
    'draws', v_draws,
    'scene', v_scene
  );
end;
$$;

-- Les droits, calqués sur ceux de la wishlist (`0015`) : `public` a l'exécution
-- par défaut sur une fonction neuve, donc il faut la lui retirer explicitement
-- — sinon `anon` hériterait du droit de tenter l'opération (la garde
-- `auth.uid()` la refuserait, mais « permission denied » dit la même chose sans
-- exécuter une ligne).
revoke all on function public.reset_progress() from public, anon;
grant execute on function public.reset_progress() to authenticated;

-- ==========================================================================
-- Contrôle rapide (facultatif) : la fonction doit exister et dire ce qu'elle a
-- effacé. À lancer connecté, sinon elle refuse poliment.
-- ==========================================================================
-- select public.reset_progress();
