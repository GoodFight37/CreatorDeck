# Nouveautés — journal destiné aux joueurs

## Ce qui existe

Dans **Toi → Nouveautés**, chaque joueur peut consulter l’historique des
mises à jour, sans connexion. Un repère discret sur Toi et un compteur dans
le profil signalent les notes non lues. Aucun popup au lancement.

L’historique présente les notes récentes en premier, un filtre « Non lues »
et le détail de chaque note. **Consulter ne marque pas lu** : le joueur peut
marquer une note ou tout l’historique explicitement. Une note lue reste
consultable. Les textes sont en français, rendus comme du texte React, sans
HTML distant ni service de publication supplémentaire.

## À chaque livraison visible

1. Ajouter une entrée **en tête** de `src/lib/release-notes.ts`, dans le même
   commit que le code livré. Utiliser un identifiant unique stable, une date
   ISO réelle, un titre, un résumé et des rubriques courtes (« Nouveautés »,
   « Améliorations », « Corrections », ou une limite utile au joueur).
2. Décrire seulement les changements présents dans ce code. Pas de promesse
   de fonctionnalité future, de données personnelles, de détails internes ou
   de problème déclaré résolu sans preuve. Le peel reste perfectible.
3. Garder les anciennes entrées et leurs identifiants. Une correction de
   coquille peut modifier le texte sans nouvel identifiant ; une nouvelle
   livraison mérite sa propre note. Plusieurs notes du même jour restent
   dans l’ordre choisi du tableau, plus récente en tête.
4. Vérifier les notes avec `npm test -- src/lib/release-notes.test.ts` et
   contrôler le diff. Le test valide dates, identifiants uniques et contenu.
   Les tests UI/navigateur sont nécessaires si le système de lecture change,
   pas à chaque simple ajout de texte sans changement du composant.
5. Mettre à jour les documents techniques concernés. La note joueur ne
   remplace ni roadmap, ni décisions, ni passation. Confirmer le déploiement
   avant d’annoncer la note accessible aux joueurs.

Un commit uniquement documentaire, de test ou d’outillage sans changement
visible ne nécessite pas de nouvelle note ni de repère supplémentaire.
Il n’y a pas de publication automatique à partir des messages Git : les
notes sont rédigées pour les joueurs et livrées avec le jeu.

## Lecture et stockage

- Clé indépendante : `creatordeck.release-notes.v1`, format
  `{ "version": 1, "readIds": ["identifiant-stable"] }`.
- Lecture locale au navigateur/appareil, partagée entre comptes de ce même
  navigateur, pas synchronisée entre appareils ni sauvegardée sur Supabase.
- Une nouvelle entrée possède un nouvel identifiant : elle sera non lue sans
  réinitialiser l’historique de lecture existant. Les identifiants inconnus
  déjà stockés sont conservés pour les anciens bundles encore ouverts.
- Les abonnements mettent à jour badge/profil/journal dans le même onglet et
  les événements `storage` propagent la lecture aux autres onglets. Le store
  relit les marqueurs avant d’écrire pour conserver les lectures déjà stockées.
  Pas de garantie de transaction atomique entre onglets concurrents.
- Donnée absente ou invalide : historique disponible, notes non lues. Stockage
  refusé : lecture maintenue pour la session et message explicite ; après un
  rechargement elle peut redevenir non lue. Effacer les données du navigateur
  remet aussi la lecture à zéro. Aucun solde ni carte n’est touché.

## Architecture et validation

Source de contenu + store : `src/lib/release-notes.ts`. Abonnement React :
`use-release-notes.ts`. Présentation : `release-notes-sheet.tsx` et CSS dédiée.
Entrée depuis ProfileView ; repère dans CreatorDeckApp, distinct de Last Pack.
La feuille réutilise le focus et la pile Retour existants, sort de l’app via
portail, bloque le défilement du fond et restaure focus/défilement en fermant.
Aucune animation requise, aucun appel réseau pour charger les notes.

Tests ciblés : données/store, écrans et `e2e/release-notes.spec.ts`. Ils couvrent
lecture individuelle/globale, filtre vide, persistance/rechargement, clavier,
fermeture/focus, stockage refusé et deux onglets. Les contrôles navigateur ne
prouvent ni le ressenti tactile réel ni le fonctionnement d’une APK distribuée.
Les premiers textes résument les lots récents du 14 octobre ; ce journal ne
prétend pas reconstituer tous les anciens commits du projet.
