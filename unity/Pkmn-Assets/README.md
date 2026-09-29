# Extrait de `GoodFight37/pkmn`

Sous-ensemble **exact** nécessaire à l'ouverture de booster, embarqué ici
pour éviter le téléchargement des 752 Mo du dépôt complet :

- `AnimationClip/` — 69 clips : `C_PackOpen_*` (pochette) + `C_CardGet_*` (cartes)
- `Animator/` — 62 modèles FBX : `Pack1/2/3_LwAnimation`, `PackContainer`,
  `PackOpenCameraView`, `PackOpenMultiColumnView`, `PackOpenSingleCylinderView`,
  `card1…card5`, `Card_Shadow`, `position_*`, `Root*`, `badge_elm`, `rarity_elm_*`
- `Font/` — Futura Heavy, Gill Sans Nova (Bold/Medium), Pokesymbol2

**Provenance** : <https://github.com/GoodFight37/pkmn> (dépôt du propriétaire),
extrait le 2026-09-29 — polices CJK et doublons `for blender/` retirés.
Aucun `.meta` n'existait à la source : Unity en régénérera de propres à
l'import.

→ Copie ce dossier dans `Assets/Pkmn/` de ton projet Unity (voir `../README.md`).
