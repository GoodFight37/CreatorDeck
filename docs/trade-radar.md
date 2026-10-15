# Trade Radar — 15 octobre 2026

## Ce que voit le joueur

Dans **Compte → Échanges**, « Lancer le radar » cherche parmi ses amis acceptés
les souhaits publics qui correspondent à une de ses variantes en double. Chaque
piste indique l'ami, le créateur et la variante disponible chez le joueur. Le
bouton « Préparer l'offre » choisit l'ami et ajoute cette carte dans « Tu
donnes », puis place le focus sur « Tu demandes ». Rien n'est envoyé par ce
bouton. Le joueur choisit la contrepartie et envoie séparément l'offre, qui
reste vérifiée par le serveur comme avant.

Une variante est proposée seulement si elle apparaît **au moins deux fois**
dans la partie locale. Deux variantes différentes du même créateur ne sont pas
un doublon pour ce radar. Si le partenaire est déjà sélectionné, une piste
supplémentaire s'ajoute dans la limite de cinq cartes. Changer de partenaire
avec un brouillon sélectionné demande confirmation avant de vider ce brouillon.

## Données et limites

Le radar relit la liste d'amis et, pour chaque ami, son seul souhait publié
(`wishlist_slug`). Les lectures partent par groupes de quatre, uniquement après
l'appui. Aucun inventaire d'autrui n'est lu, stocké ou affiché. Une lecture
échouée n'efface pas les résultats déjà reçus ; le nombre de souhaits
indisponibles est annoncé. Sans ami, souhait correspondant ou doublon, l'écran
l'explique. À un changement de compte, les pistes de la session précédente ne
sont plus affichées ; une réponse réseau tardive est ignorée.

Les copies du joueur viennent de sa partie locale. Une carte peut avoir changé
sur un autre appareil ou depuis le dernier scan ; le serveur vérifie toujours
la possession lors de la proposition et de l'acceptation. Le radar ne sait pas
si l'ami possède la carte que le joueur veut demander en échange. Le sélecteur
existant interroge ses variantes pour ce créateur précis. Aucune garantie
d'acceptation, de réciprocité ou de synchronisation n'est annoncée.

## Vérification

- Logique pure : une copie seule, deux variantes différentes, double réel et
  souhait répété ; `src/lib/trade-radar.test.ts`.
- Store : amis acceptés, souhaits publics, lecture partielle et absence de
  consultation des variantes privées ; `src/lib/cloud/cloud-store.test.ts`.
- Interface : piste, préparation sans envoi et pagination d'échange conservée ;
  brouillon protégé lors du changement de partenaire et absence de doublon ;
  `src/ecrans-echanges.test.tsx`.
- Build local sans variables Supabase : compilation seulement. Une lecture du
  compte réel sur Vercel est distincte des fixtures de test ; voir la passation
  pour ce qui a effectivement été essayé en Production.

Publication initiale : commit `6816e9e5` sur `main`, Production Vercel et
contrôle `success`. Le site public a été parcouru en invité jusqu'à la note
Nouveautés ; aucun scan d'amis ou envoi d'offre réelle n'a été effectué.
