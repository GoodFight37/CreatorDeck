# Chantier mode Histoire — pilote « Zéro spectateur »

**État au 26 octobre 2026 :** prototype de code sur branche de travail, non fusionné sur `main`, non annoncé déployé en production. Porte expérimentale `/histoire` sans lien ajouté dans l'accueil. Ce document décrit le pilote, pas une fonctionnalité terminée.

## Expérience recherchée

Le joueur incarne **son propre streamer fictif**, qui commence à zéro, et prend des décisions à gauche/droite (gestes + boutons + clavier). Les quatre jauges sont **Public**, **Énergie**, **Argent** et **Confiance**. Les rencontres récurrentes (Flo la modo, Nox le streamer rival, Mona côté marques) ont une mémoire des choix. Les décisions peuvent déclencher une scène plusieurs chapitres plus tard. Le ton vise un mélange de quotidien, humour, tension morale et conséquences concrètes, sans reprendre d'assets, répliques ou histoires du jeu Reigns.

## Architecture testable

- `src/data/story-prologue.ts` : contenu éditorial typé et versionné, 20 scènes possibles sur 12 étapes. Chaque étape possède une scène de repli ; les scènes conditionnelles ont priorité si leurs drapeaux correspondent. Cette V1 fait volontairement une saison courte pour tester si les personnages et dilemmes fonctionnent.
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
