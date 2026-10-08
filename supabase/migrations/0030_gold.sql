-- 0030_gold.sql — la Légendaire peut être Gold (1 %), pas seulement au Perfect
--
-- Jusqu'ici une carte Gold n'existait que dans un « Perfect » (le booster entier
-- en Épique ou mieux). Quand un joueur tirait une Légendaire ordinaire, elle ne
-- pouvait **jamais** être Gold — et le fichier des taux le disait noir sur blanc
-- (« goldPermille » absent du booster Live).
--
-- Cette migration ajoute la branche manquante, exactement comme le moteur :
-- une Légendaire tirée hors Perfect a **1 %** de chance d'être Gold — soit 100
-- sur les 10 000 du tirage de variante (le Holo, à 75, tombe 0,75 % du temps :
-- le champ s'appelle `goldPermille` par convention, mais l'échelle est celle du
-- tirage, 10 000).
-- La valeur vient de `src/data/pull-rates.json` (`packs.live.variants.
-- goldPermille`), et un test miroir relit le fichier et compare : un taux changé
-- d'un côté seulement casse le test avant de casser le jeu.
--
-- **Même signature qu'en production** (`0011_direct.sql` : `text, boolean,
-- boolean`) : `create or replace` remplace donc la fonction au lieu d'en créer
-- une deuxième. C'est le piège qui a bloqué le jeu le 7 octobre avec
-- `_wallet_apply` (voir `0029_wallet_surcharge.sql`) — ici, pas de `drop`, pas
-- de surcharge possible : la signature ne bouge pas.
--
-- Le Paquet Scène garde sa propre fonction (`_pack_scene_variant`, `0014`) : il
-- ne donne jamais de Légendaire, donc jamais de Gold.
--
-- Le tirage d'aléa ne change pas de forme : **un seul** `v_roll` sert au Perfect,
-- au Gold et au Holo, comme dans `chooseVariant()` du moteur (le bonus Direct
-- consomme, lui, son propre aléa, et seulement pour un créateur en direct).

create or replace function public._pack_choose_variant(
  p_rarity text,
  p_rare_drop boolean,
  p_live boolean
)
returns text -- 'standard' | 'live' | 'holo' | 'gold'
language plpgsql
volatile
set search_path = public
as $$
declare
  v_roll integer;
begin
  -- Source des seuils : src/data/pull-rates.json (booster « live »).
  --   rareDrop.variantUpgradePermille = 900
  --   direct.livePermille             = 200
  --   variants.goldPermille           = 100  (dès « Légendaire »)
  --   variants.holoPermille           = 75   (dès « Peu commune »)
  v_roll := public._pack_random_int(10000);

  -- Perfect : 900‰ de chance d'améliorer la variante.
  if p_rare_drop and v_roll < 900 then
    if p_rarity = 'legendary' then
      return 'gold';
    else
      return 'holo';
    end if;
  end if;

  -- Bonus Direct : la variante Live, réservée à ceux qui streament.
  if p_live and public._pack_random_int(10000) < 200 then
    return 'live';
  end if;

  -- Gold : 1 % (100 sur 10 000) sur une Légendaire, hors Perfect. Même aléa que
  -- le Holo ci-dessous : une carte ne peut pas sortir Gold **et** Holo.
  if p_rarity = 'legendary' and v_roll < 100 then
    return 'gold';
  end if;

  -- Holo : 75‰ dès « Peu commune » (uncommon, rare, epic, legendary).
  if p_rarity in ('uncommon', 'rare', 'epic', 'legendary') and v_roll < 75 then
    return 'holo';
  end if;

  return 'standard';
end;
$$;

-- La fonction est interne : personne d'autre que `open_pack()` ne l'appelle.
revoke all on function public._pack_choose_variant(text, boolean, boolean) from public, anon, authenticated;
