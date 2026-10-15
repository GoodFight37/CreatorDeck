# Revue du lot 04 IA Studio — 15 octobre 2026

Base examinée : `d12f155c26437c782fb7b3c2cde0500456b79628` sur `main`.
Pièce reçue : `ai_studio_code (1).txt`, 112 lignes. Le code local était identique
à GitHub avant modification.

| Constat | Vérification dans le code | Suite |
| --- | --- | --- |
| Overlay : habillage du paquet en retard | Confirmé : `setKind` suivait `await dechirer()` dans les deux parcours. | Habillage affecté avant la déchirure. |
| Tribunal : encaissement figé sur rejet | Confirmé pour une exception. Un refus normal avait aussi le même effet visible : `paiement` était renseigné et retirait le réessai. | Refus et exception affichés ; bouton conservé ; `occupe` libéré dans `finally`. |
| Arène : action figée sur rejet | Risque confirmé pour une exception inattendue. Les opérations ordinaires du magasin cloud convertissent déjà la plupart des pannes en refus. | `catch` avec message et `finally` pour libérer les commandes. |
| Feuille de code : retour absent | Confirmé. | Retour Android, Échap et focus de dialogue ajoutés. |
| Arène : « fini dans terminée » | Confirmé sur une fin de semaine passée ; la branche de draft avait le même assemblage de mots. | Libellés de fin explicites. |

En plus du rapport, le CI du précédent chantier montrait un feuilletage Binder
régressé : le nouveau bouton d’inspection interceptait le départ du geste. Le
glissement part de nouveau de la carte, tandis que les autres commandes restent
exclues. Les tests navigateur attendent désormais le focus sur le vrai bouton.

Vérification ciblée : 22/22 tests d’écran (dont Tribunal refus puis succès et
rejet puis succès, feuille de code avec Échap et retour) ; 31/31 scénarios
navigateur Binder/Drop réussis sur ordinateur et téléphone, un scénario
ignoré par la suite ; TypeScript, lint ciblé et build réussis. La lecture tactile réelle
sur téléphone et le comportement réseau en panne réelle restent à observer sur
le site Vercel ; les tests automatisés ne les remplacent pas.
