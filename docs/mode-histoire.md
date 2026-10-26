# Chantier mode Histoire — pilote « Zéro spectateur »

**État au 26 octobre 2026 :** prototype de code sur branche de travail, non fusionné sur `main`, non annoncé déployé en production. Porte expérimentale `/histoire` sans lien ajouté dans l'accueil. Ce document décrit le pilote, pas une fonctionnalité terminée.

## Expérience recherchée

Le joueur incarne **son propre streamer fictif**, qui commence à zéro, et prend des décisions à gauche/droite (gestes + boutons + clavier). Les quatre jauges sont **Public**, **Énergie**, **Argent** et **Confiance**. Les rencontres récurrentes (Flo la modo, Nox le streamer rival, Mona côté marques) ont une mémoire des choix. Les décisions peuvent déclencher une scène plusieurs chapitres plus tard. Le ton vise un mélange de quotidien, humour, tension morale et conséquences concrètes, sans reprendre d'assets, répliques ou histoires du jeu Reigns.

## Architecture testable

- `src/data/story-prologue.ts` : contenu éditorial typé et versionné, 21 scènes possibles sur 12 étapes. Chaque étape possède une scène de repli ; les scènes conditionnelles ont priorité si leurs drapeaux correspondent. Cette V1 fait volontairement une saison courte pour tester si les personnages et dilemmes fonctionnent.
- `src/lib/story-mode.ts` : validation du format, sélection déterministe des scènes, application des effets bornés de 0 à 100, conditions différées, fins de partie et restauration de sauvegarde. **Aucun appel IA**, pas de hasard au runtime.
- `src/components/story-mode.tsx` et sa feuille CSS : écran mobile autonome, boutons gauche/droite accessibles au pouce, geste horizontal (64 px, priorité au défilement vertical), flèches clavier, progression, jauges lisibles et sauvegarde locale.
- `src/app/histoire/page.tsx` : route isolée, aucune modification des quatre piliers Drop/Binder/Craft/Toi. Ne touche ni au catalogue, ni aux tirages, ni aux points, ni aux jetons, ni à Supabase.

La sauvegarde du pilote utilise `localStorage` (clé versionnée), propre au navigateur/appareil, **pas de synchronisation cloud ni de récompense**. Si elle est corrompue ou incompatible, on revient à une nouvelle partie. Les fins sont déterministes en fonction des jauges et de la progression.

## Validation et preuves

- TypeScript : compilation stricte des deux modules purs (moteur/scénario), sans erreur.
- Exploration exhaustive hors navigateur : **4096 combinaisons binaires** des douze décisions, y compris les fins anticipées. Aucune scène manquante ; état restaurable ; **8 issues accessibles** dans ce prologue. La neuvième fin définie (« plus personne en ligne ») existe en moteur mais n'est pas atteignable avec le réglage actuel du prologue.
- `src/lib/story-mode.test.ts` : test Vitest prévu dans le dépôt, couvrant validations, déterminisme, mémoire des choix, sauvegarde, fin immuable et exploration exhaustive. La suite Vitest du dépôt n'a **pas** été exécutée dans l'environnement de génération.
- `story-mode.tsx` et la route : transpilation syntaxique TypeScript vérifiée. **Next build, lint, Playwright, APK Android, tests navigateur et contrôles CI non exécutés** à la création de cette branche. Ne pas déclarer ce pilote prêt pour `main` avant ces vérifications.

## Suite du chantier

1. Sur checkout du dépôt : `npm ci`, puis `npm test -- src/lib/story-mode.test.ts`, `npm run typecheck`, `npm run lint`, `npm run build`.
2. Tester `/histoire` en Playwright téléphone (320×568 et 390×844), boutons, geste, scroll vertical, clavier, reprise après rafraîchissement et fins anticipées. Corriger les défauts vus sur captures et logs.
3. Faire relire le **rythme narratif** : chaque choix doit être intéressant sans punition arbitraire ; Flo/Nox/Mona doivent avoir une personnalité et une vraie continuité. Ajuster les jauges à partir de parcours réellement joués. Faire valider un épisode avant d'ajouter des dizaines de scènes.
4. Après validation, décider ensemble de l'accès au mode depuis l'application, d'une sauvegarde synchronisée facultative et de la création d'autres saisons. Aucune récompense sur le jeu de cartes tant qu'une autorité serveur n'a pas été conçue et vérifiée.

**Limites :** pas de génération IA à chaud, pas de service externe ni de budget requis pour jouer. Le contenu est écrit en amont, versionné et révisable. Le skill « Ponytail » requis par `AGENTS.md` n'est pas installé parmi les skills disponibles dans cette session ; il n'a pas été exécuté. Ne pas présenter la démo HTML autonome comme une validation du rendu de l'application Next.


## Reprise du chantier et améliorations du pilote (26 octobre 2026)

La première CI du commit `4cb66e3` a confirmé les tests unitaires, les tests d'écrans (264), le typage et la compilation Next, mais son job qualité a échoué sur **trois erreurs ESLint** dans `story-mode.tsx` : setState synchrone dans un effet, ancre HTML interne et apostrophe JSX. Ces trois erreurs ont été corrigées dans un commit séparé. **Cela ne vaut pas preuve de réussite pour les CI ultérieures : contrôler leurs SHA et résultats.**

Modifications complémentaires :
- La restauration de la partie *rejoue toutes les décisions* afin de vérifier les scènes effectivement proposées, les variations de jauges, les drapeaux et la fin. Les états trafiqués, y compris les fins prématurées artificiellement prolongées, sont rejetés sans écraser le moteur.
- Retour visible du dernier choix, avec variations positives/négatives sur les jauges. Les boutons et le clavier restent des alternatives au geste (WCAG 2.2, 2.5.7).
- Tests Vitest renforcés : les 4096 combinaisons doivent atteindre toutes les scènes et huit fins. Tests Playwright sur la sauvegarde, les gestes, le clavier, les conséquences et le recommencement, y compris une fenêtre de 320×568. Ces tests sont ajoutés au dépôt mais ne sont **pas déclarés verts** tant que la CI correspondante ne l'atteste pas.
- Version 2 du pilote : une nouvelle scène au chapitre 10 (« Deux affaires, une caméra ») donne une conséquence commune aux joueurs ayant à la fois une guerre avec Nox et un sponsor caché dont les preuves ont été effacées. Ce cas était auparavant pris en priorité par la seule scène Nox. La clé de sauvegarde passe en `.v2` pour éviter de réinterpréter l'ancien chemin narratif ; ce changement réinitialise les sessions du prototype précédent.

### Méthode éditoriale pour les épisodes suivants

La mécanique à conserver vient des quatre pressions lisibles, du geste simple et des conséquences qui réapparaissent. Chaque dilemme doit proposer **deux choix défendables** et une contrepartie compréhensible. Les meilleurs retours doivent provenir d'un personnage ou d'une promesse déjà rencontrée plutôt que d'une statistique surgie de nulle part. Éviter de transformer tous les choix « éthiques » en succès faciles et tous les choix de visibilité en désastre certain.

Avant d'intégrer des scènes créées avec une IA, les **réviser hors partie** : cohérence des personnages, drapeaux utiles, ramifications croisées, variété de ton, lisibilité mobile, absence d'emprunt à Reigns, puis simulation et tests. Le runtime ne sollicite aucune IA, aucune API et aucun service payant. Pour une future production de plusieurs centaines de scènes, étudier le langage ouvert Ink (conditions, « knots », embranchements rejoignables et suivi d'état), mais ne pas ajouter sa dépendance au pilote sans gain vérifié.

Références consultées : François Alliot, « Creating an adaptive narrative in Reigns », Game Developer (2016) ; W3C/WAI, « Understanding WCAG 2.5.7 Dragging Movements » ; inkle, documentation « Writing with Ink ».

### Régressions ciblées identifiées pendant les contrôles

La CI du SHA `91bc1ac` a exécuté 1 227 tests unitaires, dont 1 226 réussis : le test de parcours exhaustif a dépassé le délai Vitest de 5 secondes, avec une durée constatée supérieure à 6,9 secondes. La vérification reste exhaustive (4096 parcours et restauration) mais dispose désormais de **30 secondes**, sans allègement des assertions. Ce réglage n'est pas une preuve de réussite : attendre le job du SHA qui contient le correctif.

Un double-tap rapide sur le même bouton pouvait valider deux scènes successives : la position des boutons est conservée d'un chapitre à l'autre. Un verrou bref de 450 ms et une vérification du numéro d'étape empêchent le second choix involontaire. Un scénario Playwright `dblclick` vérifie que le chapitre 2 reste affiché après le double-tap. Le défaut a été reproduit dans la démo HTML autonome ; **la confirmation dans Next.js reste soumise au Playwright de la branche**, et la démo ne vaut pas preuve de rendu de production.

Les commits du pilote restent sur une PR brouillon non fusionnée ; ni la production ni l'économie du jeu de cartes ne sont modifiées.
