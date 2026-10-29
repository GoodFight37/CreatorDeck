# Mode Histoire — dossier de passation finale vers Codex

**Préparé le 28 octobre 2026.** Source de vérité : [PR #24](https://github.com/GoodFight37/CreatorDeck/pull/24), branche `feature/histoire-reigns-pilot-20261026`. **Aucune fusion dans `main` n'est effectuée par cette passation.** La décision et l'exécution de l'intégration sont réservées à l'utilisateur et à Codex.

## 1. Ce qui existe réellement

- Saison 1 originale, « Zéro spectateur », `/histoire` : 40 décisions **au maximum** en cinq actes, 84 scènes conditionnelles et neuf types de fin. Des fins prématurées existent.
- Quatre jauges (Public, Énergie, Argent, Confiance), choix gauche/droite déterministes, personnages récurrents Flo, Nox, Mona, Lina et souvenirs des décisions par flags.
- Sauvegarde **locale** version V4 validée en rejouant l'historique, sans synchronisation cloud ; journal, interludes, objectifs optionnels, épilogues et graphismes de fin.
- Plateau visuel mobile avec carte inclinable, prévisualisation non chiffrée, portraits et décors SVG originaux ; geste horizontal avec boutons alternatifs, clavier et réduction des mouvements.
- Treize dossiers de comparaison de preuves facultatifs, sans mutation des effets du moteur ; aucun asset ou texte de Reigns / Papers, Please importé.
- Preview web indépendante, et workflow `histoire-apk-preview.yml` qui compile `com.creatordeck.app.histoire` pour installer sans remplacer l'application existante.

## 2. Validation exacte et limites

- La **dernière base complète confirmée verte avant ce dossier** est `d9195b96a59e10952b3f2dcd49391877f9e6187d` :
  - [Vérification générale](https://github.com/GoodFight37/CreatorDeck/actions/runs/40513434591) : succès.
  - [APK Histoire indépendante](https://github.com/GoodFight37/CreatorDeck/actions/runs/40513435020) : succès.
  - Preview Vercel : déploiement `dpl_2cdWW4xpYTmmDAcoPUthmdFmcuRZ`, statut READY, alias de branche.
- Correctif ultérieur : `story-bonds.ts` reconnaît une Flo revenue volontairement comme spectatrice après rupture, sans prétendre qu'elle reprend son ancien rôle ; tests unitaires ajoutés dans `story-bonds.test.ts`.
- **Attention :** les nouveaux commits doivent avoir **leur propre CI verte**, sans extrapoler les runs du SHA précédent. Contrôler les derniers runs GitHub avant intégration.
- Playwright 320×568/390×844, Chromium et WebKit/Linux vérifient de nombreux scénarios, mais **aucun test ne prouve** le confort et les performances sur un vrai Redmi Android ni sur un iPhone Safari. Durée humaine de 20–30 minutes non démontrée.
- Une APK compilée est un artefact installable, **pas** une validation de la gestuelle, de la navigation Android ni du retour système.

## 3. Contrat de travail : intégrer à `main`, pas réécrire le jeu

1. **Commencer par rafraîchir les références Git.** À l'audit précédent, la PR avait 179 commits d'avance et `main` avait 14 nouveaux commits depuis la base commune `2b821b3d`. Ces chiffres évolueront. Ne pas forcer `main` ni écraser son historique ; traiter les conflits dans une branche d'intégration et vérifier le diff complet.
2. **Ne pas inventer un nouveau Mode Histoire.** Partir des fichiers de cette PR, conserver les 84 scènes, les jauges, le moteur déterministe, les fins, le journal, la physique de swipe et l'inspection facultative. Les améliorations futures sont une autre phase.
3. **Navigation officielle :** remplacer l'entrée « Tribunal des Bannis » par l'accès Mode Histoire dans l'application principale, à un emplacement cohérent, visible sur téléphone. L'accès existant conditionné à `NEXT_PUBLIC_STORY_ANDROID_PREVIEW === "1"` dans `missions-view.tsx` ne suffit pas à l'intégration production. Éviter une seconde entrée dupliquée. Décider avec l'utilisateur du libellé définitif si nécessaire, sinon « Mode Histoire ».
4. **Inspecter impérativement les fichiers partagés :** `creator-deck-app.tsx`, `missions-view.tsx`, `objectives.css`, `release-notes.ts`, `android/app/build.gradle`, `AndroidManifest.xml`. Vérifier les changements parallèles sur `main`. Ne pas laisser une bannière de changelog annoncer une fonctionnalité invisible ; ne pas faire disparaître une version officielle de l'application en publiant l'APK expérimentale.
5. **Respecter les sauvegardes V4 :** ne pas changer les IDs de scènes, le tri conditionnel, les effets numériques ou les règles d'issue sans versionner le scénario et sa clé, ou implémenter une migration de sauvegarde et des tests. Les données et points du TCG restent indépendants.
6. **Ne pas toucher** aux tirages, boosters, inventaires, jetons, points, économie, schéma/migrations Supabase ou auth. Aucune récompense liée aux décisions sans validation serveur indépendante.
7. **Android :** le package expérimental porte le suffixe `.histoire` et supprime `google-services.json` dans le workflow de prévisualisation car aucun client Firebase n'est configuré pour ce package. Ne pas transférer cette suppression à la construction officielle `com.creatordeck.app`. Vérifier les libellés du manifeste, AppUpdateBanner, retour natif et assets de routage Capacitor.
8. **Ne pas recopier** code, illustrations, textes, marques visibles ou assets tiers provenant de Reigns / Papers, Please. Leur rôle était d'inspirer la mécanique, pas de fournir un jeu à cloner.

## 4. Recette de non-régression bloquante

- `npm ci`, tests Vitest (`story-mode`, `story-goals`, `story-inspection`, `story-motion`, `story-bonds` et autres tests du repo), typecheck, lint, build Next.
- Playwright : saison entière de 40 décisions, neuf fins, fins anticipées, sauvegarde/rechargement/redémarrage confirmé, flags et continuité des scènes, dégâts à 0 et plafond Public 100.
- Mobile Chromium + WebKit simulé en 320×568 et 390×844 : toucher immobile (carte opaque), swipe court annulé, swipe horizontal validé une seule fois, geste vertical = scroll, `pointercancel`, sélection suivante neutre, libellés gauche/droite visibles pendant le déplacement, zéro débordement horizontal.
- Vérifier le clavier et les boutons alternatifs au drag (WCAG 2.2, critère 2.5.7), `prefers-reduced-motion`, tailles tactiles et états de focus.
- Inspection de documents : sélection de 2 parmi 3 indices, progression sans inspection, comparaison sans effet de gameplay ni sur localStorage.
- Captures avant/après des scènes Toi, Flo, Nox, Mona, Lina, duo, interludes, dossier, journal et neuf fins. Une capture de viewport Chromium n'est pas une preuve d'iPhone/Android natif.
- **Tests réels après intégration :** sur Redmi Android : swipe, texte, haptique, retour, reprise app tuée/relancée, navigation du hub et de ses autres modes ; Safari iPhone si disponible.
- Vérifier les 14+ commits parallèles de `main`, l'intégrité des fonctions TCG et la compilation de l'APK **officielle**, distincte de la preview `.histoire`.

## 5. Références produit et décision de lancement

- Interaction horizontale : [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action).
- Alternative au glissement : [W3C WCAG 2.2 SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) ; les deux boutons existent déjà.
- Préférence système : [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).
- Architecture/choix actuels : `docs/mode-histoire.md`, `docs/mode-histoire-saison-v3.md`, `docs/mode-histoire-v4-audit.md`, `docs/agent-handoff.md`.

**Feu vert fusion seulement après :** CI entièrement verte sur le **HEAD d'intégration**, revue du diff de fichiers partagés, entrée officielle testée, APK officielle non régressée et acceptation de l'utilisateur. Ne pas traiter le statut READY de Vercel comme une preuve de gameplay parfait.
# Mise à jour d'intégration — 29 octobre 2026

Les consignes historiques ci-dessous sont remplacées par D-189 : Malik autorise
la fusion et veut Histoire dans CreatorDeck, sans seconde application Android.
Le workflow APK Histoire et le drapeau de prévisualisation ne sont pas intégrés.
Le workflow APK de test habituel reste inchangé. Aucun accès depuis le menu
principal n'est ajouté dans ce lot ; le Tribunal est conservé. La route
`/histoire` appartient au même export web/Android que le jeu.

