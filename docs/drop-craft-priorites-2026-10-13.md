# Drop + Craft — hiérarchie mobile, 13 octobre 2026

Base main vérifiée : `fda166f7695b6a479b94a7a305f622787e511290`.
Gemini travaille en parallèle sur Binder et profil/Toi : aucun de leurs
composants ou styles n’est modifié par ce lot. La feuille ajoutée
`src/components/drop-craft.css` ne vise que `.home-view` et `.atelier-view`.

## Drop — avant/après en cinq lignes

1. Titre « Cinq créateurs » → « Drop », sans slogan ni rappel connexion en double.
2. Sachet haut → scène compacte ; sachet et CTA complets à 360×740 et 320×568.
3. Garantie avant CTA → CTA avant garantie, une ligne sans encadré supplémentaire.
4. Objectif/Tribunal → boutons compacts, fusion existante conservée si même objectif.
5. Paquet Scène → statut neutre ; description quotidienne raccourcie.

## Craft — avant/après en cinq lignes

1. Catalogue par rang, légendaires en tête → recettes finançables par défaut.
2. Solde insuffisant → recettes les moins chères, achats toujours bloqués.
3. Catalogue complet → exploration explicite « Toutes les recettes » ou recherche.
4. En-tête dense → règles et raretés repliées, pagination sous la liste sans « 1000 manquants ».
5. Recycler vide → boucle boosters → doublons → points → carte, avec retour au Drop.

Le tri/filtre dépend uniquement des coûts déjà présents dans RARITY_META et du
solde choisi. Aucun coût, gain, plafond, calcul de pity ou appel économique
n’est modifié. Les légendaires restent exclus du craft et visibles dans
l’exploration. Les cartes possédées sont exclues. 20 lignes maximum par page.
La recherche et un filtre explicite de rareté permettent aussi de préparer
une recette non financée ; cela n’autorise jamais son achat.

## Fichiers

UI : `src/components/drop-view.tsx`, `src/components/atelier-view.tsx`,
`src/components/drop-craft.css` (nouveau, isolé).
Tests : `src/ecrans-drop-craft-priorites.test.tsx`,
`e2e/drop-craft-priorites.spec.ts` (nouveaux) ; assertions de titres/page adaptées
sans retrait de garde-fous dans `src/ecrans-mille-cartes.test.tsx`,
`e2e/craft-preview.spec.ts`, `e2e/drop-binder.spec.ts`.
Passation/décision/roadmap/problèmes mis à jour avec ce rapport.

## Vérifications et limites

- DOM : `npm run ecrans -- src/ecrans-atelier-preview.test.tsx src/ecrans-mille-cartes.test.tsx src/ecrans-drop-binder.test.tsx src/ecrans-drop-craft-priorites.test.tsx` : 26/26.
- Navigateur : `npx playwright test e2e/drop-craft-priorites.spec.ts e2e/craft-preview.spec.ts e2e/drop-binder.spec.ts --grep 'Drop garde|Craft|le Drop garde'` : 8/8 bureau/téléphone simulé, puis 2/2 contrôles Drop après agrandissement du sachet et passage des priorités sur une colonne.
- TypeScript, ESLint ciblé et build statique sans cloud : réussis ; diff-check réussi.
- Tests : solde 90 points (uniquement cartes à portée), zéro point (coût réel/bouton bloqué), monnaie jetons, légendaires non artisanables, retour Drop à zéro doublon, état de sauvegarde inchangé, règles repliées, limite DOM et CTA entièrement avant navigation.
- Captures hors Git : `test-results/drop-priorites-320-téléphone.png`,
  `test-results/drop-priorites-360-téléphone.png`,
  `test-results/craft-priorites-téléphone.png`.

Aucun téléphone physique testé. La barre globale avec logo/wallet n’a pas été
retouchée ; son encombrement sur 320 px est extérieur aux deux vues de ce lot.
Publication ciblée main normale après vérification distante, CI à relever.
Aucun fichier interdit touché : binder-view, profile-view, pack-tear,
pack-foil-*, reveal-overlay, overlay-stage, booster-*.css, three ; ni SQL,
moteur économique ou calcul de pity. Aucun travail concurrent écrasé.
