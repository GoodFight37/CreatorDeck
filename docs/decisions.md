# Décisions CreatorDeck

Ce registre est autonome, mais ne remplace pas le code ni les décisions
détaillées existantes. Ajouter des entrées datées ; marquer une décision
remplacée plutôt que l'effacer. Une proposition en attente n'est pas adoptée.

| ID / date | Décision et contexte | Justification / conséquences / preuve |
|---|---|---|
| D-001 / 2026-10-10 | Quatre documents de coordination + AGENTS communs à Codex Cloud, PC et ChatGPT | Demande utilisateur de continuité sans conversation ni quota ; mêmes règles pour tous, checkpoints réguliers, code/tests comme preuves. Le quota n'est pas observable de façon fiable. |
| D-002 / 2026-10-10 | Documenter sur design, maintenir la base réelle de PR #8 | Git/page de PR : design `4955d9b`, base arena, main ancien. Aucun merge/main autorisé ; cette mission ne change pas le jeu. |
| D-003 / 2026-10-10 | Un écrivain par branche, relecture distante avant chaque checkpoint/push | Préserver les travaux alternés et éviter l'écrasement ; passation indicative, aucun faux verrou technique. Push normal, fichiers ajoutés explicitement. |
| D-004 / 2026-10-10 | Garder les historiques et séparer implémentation, validation et déploiement | La roadmap et les compteurs antérieurs ont vieilli ; leur contexte reste utile. Les runs actuels sont dans la passation, avec limites et SHA. |
| D-005 / 2026-10-10 | SHA du code audité explicite ; commit du document retrouvé dans Git | Un fichier ne peut contenir le hash du commit qui le contient. `git log -1 --format=%H -- docs/agent-handoff.md` retrouve le checkpoint documentaire sans SHA fictif. |
| D-006 / 2026-10-10 | Audit documentaire seulement : documenter K-007 sans changer le jeu ou son banc ici | La coordination est l'objet de la mission. Le test SQL dépend de la date réelle ; la prochaine tâche ciblée doit le rendre déterministe, sans masquer l'échec ni changer la règle arène. |
| D-007 / 2026-10-10 | Garder la lecture du lock dans `dev:setup` | Désactiver `package_lock` a fait dériver Next/Playwright ; correction par `npm ci` puis setup normal, versions comparées et contrôles rejoués. E2E et production non exécutés restent non validés. |
| D-008 / 2026-10-10 | Scénarios de draft fermés/ouverts imposés seulement dans la base SQL jetable | Reprise autorisée par l’utilisateur après la mission documentaire (D-006 achevée). Supprime la dépendance au jour réel ; garde les dates explicites pour la règle calendaire, la vraie RPC pour les parcours et la restauration exacte en `finally`. Aucun changement du jeu ou de migration. Contre-épreuve : suppression temporaire de la garde dans une copie externe, jamais dans les fichiers produit. |
| D-009 / 2026-10-10 | Capturer la cible du focus avant la désactivation du bouton et la conserver entre déchirure et révélation | K-010 reproduit dans Chromium : désactiver le bouton avant la capture tardive fait perdre le déclencheur. Cible en état React, transmise aux deux scènes, hook avec cible optionnelle ; même capture Live/Scène et focus OBS toujours désactivé. Pas de temporisation ni sélection du bouton par son texte. E2E existant inchangé : 2 échecs avant, 2 réussites après, écrans 9/9, typecheck/lint ciblé réussis. Correctif `4b9fcca`. |

| D-010 / 2026-10-10 | Visite Chromium locale pour avancer sur VIS-01, puis validation humaine sur téléphone réel | Choix explicite de l’utilisateur après blocage du preview protégé. Même code produit que le preview `2d933c9`, HEAD documentaire `66b78d5`. Visites, captures et gestes simulés prouvent les comportements observés ; elles ne prouvent ni l’accès au déploiement, ni la fluidité, le son ou l’haptique d’un vrai téléphone. Pas de changement d’hébergeur ou de recréation d’environnement. |

| D-011 / 2026-10-10 | Après consommation Scène, retour clavier au titre de sa section si le déclencheur ne reçoit plus le focus | Cible explicitement marquée, tabIndex=-1 : contexte conservé sans nouvel arrêt Tab ni réactivation du paquet consommé. Live continue de rendre le focus au bouton disponible. K-011 reproduit avant correction (2/2 échecs), puis Scène/Live bureau/téléphone 4/4 réussis ; code `d87b72c`. |

## Décisions héritées, retrouvées dans le dépôt

Les dates ci-dessous sont celles des sources/commits, pas des décisions
inventées par cet audit. Consulter les liens avant de réouvrir un sujet.

| ID / date source | Décision | Justification / source |
|---|---|---|
| H-001 / 2026-10-07 à 09 | Jeu en ligne ; tirage, points, jetons tenus par serveur ; dev sans cloud autorisé | Intégrité des échanges/classements. Règles miroir TS/SQL. Pas de repli silencieux en client cloud. [Périmètre](perimetre.md), [revue](revue-externe-2026-10.md), migrations `0019` à `0035`. |
| H-002 / 2026-10-08 | Quatre piliers Drop/Binder/Craft/Toi ; simulation de streameur retirée de l'interface | Direction produit, pas une dette à réactiver. Moteur et migrations conservés. [Ta chaîne](ta-chaine.md), [journal](historique-livraisons.md), roadmap historique. |
| H-003 / 2026-10-08 | Déplacements et navigation silencieux ; sons réservés aux actions | Préférence joueur et fatigue sonore. Interrupteur/volume existants ; [sons](assets-sonores.md) et tests d'écran/son. |
| H-004 / 2026-10-07 à 09 | Pas de Server Actions, secret de service dans l'APK, refonte relationnelle ou promesse 100 % en ligne | Export statique, transport Capacitor/web et intégrité. i18n/analytics différés, découpage dynamique mesuré puis refusé. [Périmètre](perimetre.md), [revue § 3](revue-externe-2026-10.md). |
| H-005 / 2026-10-09 | Sachet en image imprimée ; WebGL et slider retirés | Visibilité garantie et geste tactile de soudure ; les expériences WebGL précédentes ne représentent plus la direction active. Commits `135376c`, `27965c7`, `beadb63` ; `pack-tear.tsx`, images foil Live/Scène. |
| H-006 / 2026-10-09 | Microphone de diffusion gravé plutôt que chevron rejeté | Identité visuelle imprimée du paquet. Commits `57fafef`, `6996172`, images `public/packs/`. Ne pas réintroduire le motif refusé. |
| H-007 / 2026-10-09 | Fallback DIVERRON honnêtement nommé | Ne pas présenter le visuel de remplacement comme un portrait officiel ; commits `799a533`, `25970c1`, `diverron-fallback.svg`. |
| H-008 / 2026-10-10 | Ouverture et révélation dans une scène cinématique continue | Éviter une rupture de scène entre geste, cinq dos et faces ; commit `4955d9b`, CSS `booster-continuity.css`. L'implémentation est présente ; le verdict visuel humain reste à obtenir. |

## Questions ouvertes

L'appréciation du dos → face, du halo, de l'éclat, du Perfect et des limites de
sélection reste à valider au pouce. Les anciens timings du dossier d'atelier ne
doivent pas remplacer les constantes actuelles. Aucune décision de réintroduire
le simulateur, publier en magasin ou refondre l'application n'est prise ici.

## Format d'une nouvelle décision

ID, date (Europe/Paris), agent/opérateur, demande et contexte, options examinées,
décision et pourquoi, conséquences/réversibilité, preuves (fichier/commit/test),
statut adopté/proposé/remplacé et lien vers l'entrée qui remplace la décision.
