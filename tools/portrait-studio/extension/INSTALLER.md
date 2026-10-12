# Connecteur Chrome / Edge — première installation

1. Dans Chrome, ouvrir `chrome://extensions` ; dans Edge, `edge://extensions`.
2. Activer **Mode développeur**.
3. Cliquer **Charger l’extension non empaquetée** (ou **Charger décompressée**).
4. Sélectionner ce dossier `extension`, celui qui contient `manifest.json`.
5. Lancer l’atelier avec `LANCER.cmd`. Cliquer **Copier la connexion navigateur**.
6. Ouvrir l’extension CreatorDeck dans la barre du navigateur, coller la connexion
   puis cliquer **Connecter et autoriser les images HTTPS**.

Cette autorisation permet de récupérer les images HTTPS que tu choisis par clic
droit, même lorsqu’elles sont sur un autre domaine que la page. Le connecteur
ne recherche pas automatiquement dans tes comptes et n’envoie pas tes cookies.
La connexion locale reste enregistrée pour les prochains lancements de l’atelier.
Ne pas partager le lien de connexion. Le serveur doit être lancé pour recevoir.

Ensuite, dans l’atelier : **Rechercher ce créateur**. Sur une image dans ton
navigateur : clic droit → **Envoyer à CreatorDeck (créateur ouvert)**.
L’originale et l’adresse de la page source arrivent pour ce créateur. Sur Google,
ouvrir de préférence le résultat ou sa page source : une miniature peut être trop
petite. Les liens imgurl/imgrefurl sont utilisés lorsqu’ils sont disponibles.

L’atelier revient au premier plan lorsque possible. Une photo ne remplace pas
l’éditeur en cours : cliquer **Ouvrir une photo reçue** si nécessaire. Ajuster le
carré, puis **Choisir la photo et rechercher le suivant**. Les droits peuvent
être complétés ensuite, dans le filtre **Droits à vérifier**.

Le badge ✓ signifie envoyé. Un badge ! indique un problème : cliquer sur
l’extension pour lire le message. Si le site refuse le téléchargement, utiliser
copier-coller ou enregistrer puis déposer le fichier dans l’atelier. Pas de
capture automatique de page ni de contournement des restrictions du site.

Après une mise à jour des fichiers de l’extension, cliquer son bouton **Recharger**
sur la page des extensions, ou redémarrer le navigateur. Garder le dossier au
même emplacement. Chrome/Edge physiques non testés dans le cloud : leur politique
peut empêcher l’installation d’une extension non empaquetée sur un PC administré.
