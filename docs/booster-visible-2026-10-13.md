> Reprise du ZIP dans une nouvelle session le 13 octobre 2026 : patch vérifié
> et restauré sans conflit sur main distant à la base annoncée. 30/30 E2E
> d’ouverture et 2/2 E2E portraits réussis, captures strictes inchangées ;
> 32/32 DOM ciblés, typecheck/lint/catalogue/build réussis. Suite complémentaire
> 12/12 réussie : total 42 E2E ouverture + 2 portraits. Publiée dans
> [93626653](https://github.com/GoodFight37/CreatorDeck/commit/93626653d8f3cc34412b4a752b9f0a5455918d2a), SHA main distant confirmé.
> La CI de reprise [38379579144](https://github.com/GoodFight37/CreatorDeck/actions/runs/38379579144)
> et Vercel ont depuis terminé avec succès. [État actuel de reprise](reprise-zip-2026-10-13.md).
> Le texte ci-dessous décrit l’état au moment de l’export, désormais historique.

# Vague visuelle : sachet fermé et peel — 13 octobre 2026

**Implémentée et testée localement, non publiée.** Base locale :
`6f63374bc38f2746fb5e4c73db5dea50243d5274`. GitHub renvoie une erreur
d'authentification dans la session (API 401, Git HTTPS sans identité), donc
le HEAD distant actuel n'est pas vérifiable et aucun push n'est annoncé.
Les changements restent limités à l'écran d'ouverture, ses deux artworks,
les preuves/tests et cette documentation. Aucun menu, tirage, prix ou SQL changé.

## Ce que l'œil voit

| Avant | Après |
| --- | --- |
| Grand emblème violet, texte LIVE DROP discret et impression peu contrastée. | Impression noire/crème/corail (violet pour Scène), nom du paquet très lisible, soudures et plis latéraux dessinés sur le sachet. |
| La ligne de coupe suit le doigt ; le rabat ne bouge qu'après le seuil. | Le rabat se soulève pendant le glissé, autour de la soudure et du côté saisi ; il se replie si le geste est abandonné. La fin part de cette position, sans repartir à zéro. |
| La coque s'efface à la première face. | La coque ouverte reste visible derrière la première carte ; seuls les dos devenus doublons sont masqués. Le même nœud/portail reste monté. |
| Gros bouton coloré pour la suivante. | Indication « Glisse la carte pour continuer » après le flip ; bouton plus discret. Swipe et bouton restent fonctionnels et les verrous de flip sont conservés. |

3D GPU toujours **off par défaut**. Aucun nouveau calque spéculaire/mix-blend,
aucune nouvelle dépendance. Taille validée du sachet conservée après essai :
les plafonds ergonomiques initiaux (largeur 65 %, hauteur 45 % du viewport),
la position de soudure et le dégagement des contrôles restent testés sans
élargissement de tolérance. Mouvement réduit et effets coupés désactivent aussi
les transitions résiduelles sur les couches du sachet pour éviter un flash.

## Fichiers

- `public/packs/live-opening.svg`, `scene-opening.svg` : nouveaux dessins
  originaux, aucun asset Pocket, aucune modification de l'art d'accueil.
- `src/components/pack-tear.tsx` : progression, origine et sens du peel ;
  position de départ de l'animation de fin conservée.
- `src/app/booster-continuity.css` : pli sous le doigt, couture, maintien de
  coque, hiérarchie du swipe/bouton et garde mouvement réduit.
- `src/components/reveal-overlay.tsx` : indication du geste après le flip.
- `src/ecrans-effets.test.tsx`, `e2e/pack-tear.spec.ts` : cue après flip,
  mouvement/repli du rabat, coque réellement visible et bouton secondaire.
  Quatre références sealed/torn actualisées pour la nouvelle impression.
- Documentation : ce rapport, décisions, roadmap et checkpoint local.

## Preuves et tests

Preuves hors dépôt dans `/workspace/artifacts/booster-visible-2026-10-13/` :
comparaison du sachet fermé, quatre moments avant/après, vidéo mobile de
**9 secondes** montrant fermé, peel partiel, extraction, face et swipe.
Captures effectuées dans le même viewport 412×915 et avec le même tirage figé.
Ce sont des captures réelles du navigateur, pas des mockups générés.

- DOM ciblés : **30/30** (scène et effets), y compris cue absent avant flip.
- Suite navigateur ouverture : 42 scénarios bureau/téléphone ; **40 passent**
  au passage complet final, les deux tests de swipe repèrent une espace manquante
  dans le texte du cue. Séparateur corrigé puis **2/2 retests réussis** ; tous les
  scénarios ont donc été vérifiés, sans suppression d'assertion.
- Garde mouvement réduit : **6/6** (trois répétitions par viewport) après
  suppression des transitions d'opacité résiduelles. Aucun plafond ergonomique
  ni seuil de comparaison des captures assoupli.
- Typecheck, lint ciblé, build statique local et diff-check réussis.
- Pas de nouvelle CI distante : publication bloquée par l'accès GitHub.

## Retest en 30 secondes, après installation/publication

En navigation privée, terminer l'introduction puis « Essayer le pack tutoriel ».
Glisser lentement sur la soudure : le rabat doit bouger avant l'ouverture.
Relâcher à mi-course : il revient en place. Reprendre jusqu'à la séparation,
vérifier la coque derrière la première face, puis swiper après son flip.
Le bouton « Révéler la suivante » reste un secours. Ne pas réinitialiser une
collection existante pour retrouver un tutoriel déjà consommé.

## Limites honnêtes

Le sachet reste une illustration 2D ; les plis et les ombres sont dessinés,
pas un plastique souple avec lumière physique. Le rabat est une pièce articulée,
pas une simulation de déchirure fibre par fibre. Les cartes restent des surfaces
HTML. Le rendu et les gestes sont vérifiés dans Chromium mobile simulé, pas
sur un téléphone physique. La comparaison montre une différence visible ;
elle ne vaut pas un avis utilisateur ni une promesse d'équivalence à Pocket.
