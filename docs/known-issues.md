# Problèmes connus CreatorDeck

Audit initial : 10 octobre 2026, branche `design/booster-reveal-polish`, code
`4955d9bbd489777c6ffd74229613075a332cc9e9`. Consulter l'état GitHub actuel avant
de reproduire. Ne pas confondre défaut confirmé, incident historique, limitation
d'environnement et validation manquante. Le détail historique de l'atelier est
conservé dans [atelier-et-problemes.md](atelier-et-problemes.md).

## Registre

| ID | Gravité / nature | Statut / portée | Symptôme et reproduction | Cause / contournement |
|---|---|---|---|---|
| K-001 | Élevée, environnement | Historique confirmé les 8–9 octobre ; cause non démontrée | Une reprise Cloud peut revenir au parent/main/clone limité ; status montre des milliers de changements. Relever branche, HEAD, refs et fichiers avant d'éditer. | Origine automatique soupçonnée dans l'atelier, non prouvée. Sauvegarder les fichiers touchés, fetch explicite, ne pas add-all/force/reset aveugle. Le switch/tracking échoué de l'audit du 10 octobre était une erreur locale distincte, corrigée. |
| K-002 | Moyenne, données visuelles | Portrait DIVERRON historique ; contournement présent | Dans le Binder, chercher DIVERRON et consulter la carte ; l'ancienne photo verte/corrompue est remplacée par un fallback. | Source image inutilisable signalée dans les commits ; `diverron-fallback.svg` et label honnête, pas un portrait officiel. Remplacement par une source fiable reste à décider. |
| K-003 | Moyenne, déploiement | Version de production non vérifiée dans cet audit | Interroger `schema_versions()` sur le **vrai projet autorisé** ; vérifier les marqueurs des dernières migrations et parcours Tribunal. | L'ancien dossier rapporte `0040`–`0042` à poser ; ce n'est pas une preuve qu'elles manquent encore. Aucun accès de production utilisé ici. Vérifier avant toute migration, pas de réparation aveugle de l'historique. |
| K-004 | Élevée quand présente, SQL | **Corrigé dans la branche actuelle**, ancien main concerné | Ancien `0004` : `open_pack()` échoue avec « set-returning functions are not allowed in CASE ». La lecture du code design montre `FROM unnest(...) ORDER BY array_position(...)`. | Correctif historique `942ba694`, déjà intégré ; la fonction finale est ensuite redéfinie dans `0035`. Ne pas importer les conclusions du checkout main dans design. Validation SQL courante à noter dans la passation. |
| K-005 | Faible à moyenne, validation UI | Ouvert : approbation visuelle humaine | Tester sur téléphone et bureau : soudure tactile, dos visibles, faces/halo, Perfect, continuité ; répéter avec réduction d'animations, sons/reflets coupés. | Le code et les tests automatisés ne prouvent pas l'appréciation réelle ni les performances d'un appareil. Ne pas « corriger » les préférences sans verdict/documentation. |
| K-006 | Moyenne, accès de l'agent | API GitHub refusée pendant cet audit | `gh pr view 8 --repo GoodFight37/CreatorDeck --json …` : GraphQL Forbidden ; REST `…/pulls/8` : HTTP 403. | Cause précise non établie (route/autorisations). Git HTTPS et page HTML accessibles ; PR vérifiée par la page et refs Git. CI/deployments non vérifiés, ne pas déclarer la PR verte. |
| K-007 | Moyenne, défaut de test confirmé | **Corrigé le 10 octobre 2026** ; 559/559 contrôles SQL passent | Avant correction (`dedb03be`), le samedi/dimanche après le début de journée de jeu à 6 h UTC, lancer `npm run supabase:verify` : code 1, seul échec « arène · draft : hors du week-end, c'est refusé ». | Le vérifieur appelle `arena_draft_choices()` avec `now()` et attend toujours un refus, même un vrai samedi. `0018` autorise correctement le week-end ; les contrôles à dates explicites passent. Correction : fenêtre fermée puis ouverte imposée dans la base jetable, définition originale sauvegardée et restaurée dans `finally`. Les contrôles calendaires à dates explicites restent présents. `npm run supabase:verify` : code 0, 559/559 le samedi 10 octobre ; contre-épreuve et détails dans la passation. Aucune migration/règle produit modifiée. |
| K-008 | Moyenne, réseau/outillage | **Résolu le 10 octobre 2026, reprise E2E** | Ancien téléchargement bloqué par les redirections Chromium/FFmpeg. Installation verrouillée maintenant code 0, Chromium 1243 et FFmpeg 1011 présents. | Les trois domaines CDN et redirections sont accessibles. E2E effectivement exécutés : voir la passation ; échecs applicatifs distincts K-010. |
| K-009 | Moyenne, procédure d'installation | Corrigé dans cet audit ; prévention documentée | Avec `npm_config_package_lock=false npm run dev:setup`, les plages semver ont amené Next 16.4.0 et Playwright 1.64.0 sans changer le lock, qui demandait 16.3.6/1.63.0. | Le flag désactive aussi la lecture du lock. `npm ci` puis `npm run dev:setup` sans ce flag ont restauré les versions verrouillées ; versions comparées réellement. Rejouer les contrôles dépendants après correction, ne pas attribuer leurs premiers résultats à l'environnement verrouillé. |
| K-010 | Moyenne, accessibilité clavier | **Corrigé le 10 octobre 2026**, code `4b9fcca3` | Avant correctif, `npm run e2e -- --grep "the revealed card keeps"` échoue sur bureau et téléphone à `e2e/pack-tear.spec.ts:46` : après fermeture, le bouton « Ouvrir le booster » ne reprend pas le focus. | Cause : capture du focus après désactivation du bouton. Capture désormais avant le commit de désactivation, cible conservée de la déchirure à la révélation. Même test inchangé : **2/2 réussis**, écrans/tactile **9/9**, typecheck et lint ciblé code 0. Détails et limites dans la passation. |

## À ne pas transformer en nouveaux bugs

- Les anciens compteurs 181/931/1077 des tests ne sont pas interchangeables :
  ils appartiennent à des commits différents. Compter le run de la passation.
- Les suites Playwright, écrans et SQL existent ; l'ancienne case non cochée de
  roadmap est historique. Disponibilité d'un script ≠ exécution réussie.
- L'APK debug ou build sans cloud d'un ancien main ne prouve pas le produit
  distribué actuel ; la branche et ses variables de compilation changent le parcours.
- Les questions « Tu demandes » limité à 8, pager et simulateur conservé sont
  des choix/questions documentés, pas des bugs confirmés par cet audit.

## Mise à jour d'un incident

Ajouter un ID stable, date/agent, SHA/branche/environnement, gravité et impact,
étapes minimales, attendu/observé, commandes/code de sortie, cause vérifiée ou
hypothèse, statut, contournement et action recommandée. À la correction,
conserver l'entrée avec commit et test de non-régression ; ne pas effacer l'histoire.
Ne jamais publier de logs contenant des clés ou sessions.
