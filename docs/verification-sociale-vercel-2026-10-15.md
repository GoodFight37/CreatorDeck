# Vérification sociale sur Vercel — 15 octobre 2026

Version contrôlée : `c8effc3b92aa819ca085ac54ab5fe5d3d6385544`, déploiement Production `READY` sur `creator-deckk.vercel.app`. Le code du lot social est `d4c0592a`. Les scénarios ci-dessous ont été exécutés dans Chromium mobile 390 × 844 contre le site et Supabase de production, avec deux sessions de navigateur séparées et des comptes invités de test.

## Parcours observés

| Parcours | Observation sur la production |
| --- | --- |
| Création et identification | Deux comptes invités créés et renommés ; recherche du pseudo de B depuis A réussie. |
| Amis | A envoie une demande, B la voit et l’accepte ; chacun voit ensuite 1 ami après rechargement de la feuille. |
| Feuilles sociales | Hôtel des ventes et Last Pack affichent leur contenu ; Wishlist épingle KaiCenat, puis le retrouve après rechargement de la page. |
| Cartes nécessaires à l’échange | Chaque compte ouvre un booster normal de production et reçoit cinq cartes. |
| Offre | A propose Celetik Standard contre Laniyelle Standard. Deux activations synchrones du bouton produisent **un seul** appel réel à `create_trade` et une seule offre affichée chez A et B. |
| Acceptation | B accepte ; les deux historiques indiquent « ACCEPTÉ », sans offre en attente. Dans le Binder, A possède Laniyelle et plus Celetik ; B possède Celetik et plus Laniyelle. Chacun conserve cinq cartes. |
| Réponse tardive | Une vraie requête `player_variants` vers B est retardée de 2,5 s dans le navigateur. Après sélection d’un autre joueur, sa réponse arrive sans afficher les variantes de B sous ce nouveau partenaire. |

## Portée et limites

- Ces observations portent sur Chromium mobile automatisé, le site Vercel et les appels réels de production. Elles ne certifient pas le ressenti tactile physique ni l’APK.
- La création d’un compte directement **dans** Amis ou Hôtel des ventes n’a pas été rejouée sur le site : la navigation courante n’ouvre pas ces feuilles avant connexion. Le changement de compte dans une feuille ouverte est couvert par les tests DOM D-119.
- Le Last Pack affichait le paquet du compte de test, mais aucune carte de l’ami n’était alors éligible à la prise. Aucun vol n’a été déclenché. À l’Hôtel, aucun achat ni dépôt n’a été fait.
- Les comptes invités temporaires créés pour ces essais restent dans la base de production. Leurs sessions locales de test ont été supprimées après la vérification ; aucun identifiant de session ou jeton n’est conservé dans le dépôt.
