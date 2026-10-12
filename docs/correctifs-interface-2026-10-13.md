# Corrections après CI interface — 13 octobre 2026

Malik confie désormais à Codex la correction des échecs des derniers changements
Gemini, dont le contexte est épuisé. Base main vérifiée `6a206b0`.
La CI 38320145804 signale cinq échecs DOM ; ses 1144 unitaires, SQL et cloud
simulé passent. Son job navigateur était encore en cours au diagnostic.

## Corrections en conservant la présentation compacte

- Binder : restitution de l'indication de première carte et du bouton pour
  découvrir le catalogue depuis une collection vide. Vue Obtenues conservée.
- Toi : restitution de l'accès au Thème du classeur et de son callback existant.
  Aucun son ajouté ; le test des déplacements muets passe.
- Craft : indication explicite des doublons Live à recycler individuellement ;
  exclusions du recyclage groupé et calculs inchangés.
- Drop : l'objectif Tribunal reste l'entrée unique, sans marquage de seconde
  ligne Tribunal. Accès après récompense et message de séance déjà payée conservés.
- Tests de titres : « Atelier » et « Cinq créateurs. » sont les nouveaux titres
  compacts de Gemini. Vérification DOM ciblée sur le h1 de la vue Atelier et
  titre exact navigateur mis à jour. Aucun scénario supprimé, tolérance augmentée
  ni contrôle de comportement retiré.

Fichiers : binder-view.tsx, profile-view.tsx, atelier-view.tsx, drop-view.tsx,
src/ecrans.test.tsx et e2e/drop-binder.spec.ts. Aucun changement du booster, de
l'économie, des règles SQL ou des dépendances. Portraits locaux hors commit.

## Preuves locales

- `npm run ecrans` : **19 fichiers, 116/116**.
- `npm run typecheck`, `npm run lint`, `npm run build` : réussis.
- Navigateur : navigation, Drop/Binder, Craft et Scène/profil ; **24 succès**
  au premier passage, deux échecs sur l'ancien titre Drop, puis **2/2** réussis
  après actualisation du titre exact. Les deux cas cloud conditionnels restent
  non exécutés sans configuration cloud locale. Les autres assertions de ce
  parcours (CTA accessible, sablier au-dessus de la navigation, aller/retour
  Binder, absence d'erreurs console, recettes/coûts) restent intactes.
- Nouvelle CI/Vercel laissés sans surveillance en boucle, mode économie.

## Reprise autonome : dernière attente obsolète d'ouverture

La CI complète de 6a206b0 a également signalé deux échecs du même test de peel
(bureau/téléphone) : il attendait `.foil-material-sheen`, supprimé volontairement
pour enlever la bande brillante. Ce test vérifie désormais l'absence du sheen
et du canvas par défaut ; ses contrôles de glissé, découpe, rabat, extraction,
fondu et continuité restent intacts. Toute la suite d'ouverture est exécutée :
**42/42** sur bureau et téléphone simulé, captures strictes incluses. ESLint
ciblé et diff-check réussis. Aucun changement de rendu supplémentaire.

Sur 5e9f67f, la CI distante confirme déjà 1144 unitaires, 116 DOM, statique/build,
SQL et cloud simulé verts. Le statut Vercel de ce commit est success. La dernière
correction de test reçoit sa propre CI ; la mission autonome la vérifie jusqu'au
résultat, contrairement au suivi court demandé précédemment.
