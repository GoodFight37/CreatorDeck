# Atelier portraits CreatorDeck — Windows

Un outil local sans modèle IA, sans clé API et sans consommation de quota Codex
pendant son utilisation. Il ne fait pas tourner Codex et ne publie rien sur
GitHub. Les recherches utilisent Internet ; les choix, cadrages et exports
restent sur ton PC.

## Démarrer

1. Installer **Node.js 24 LTS** depuis <https://nodejs.org> si nécessaire.
2. Extraire complètement le ZIP `CreatorDeck-Atelier-Portraits-Windows.zip` dans
   un dossier, par exemple `Documents\CreatorDeck-Portraits`.
3. Double-cliquer sur **LANCER.cmd**. Edge ou Chrome ouvre l’atelier. Garder la
   fenêtre noire ouverte pendant le travail ; la fermer arrête le serveur.

Il n’y a pas de `npm install` à faire. Le ZIP contient déjà les données :
1 000 créateurs, les recherches Commons précédentes et les 30 portraits prêts.
Les 30 sont exclus de la liste à traiter par défaut. L’outil considère comme
base les dix portraits du checkout publié utilisé pour fabriquer ce ZIP ; les
vingt autres déjà préparés sont inclus dans le premier export.

## Choisir des photos

Pour parcourir vite les candidats, cliquer sur **Choisir des portraits** : une grande image
s’affiche à la fois. Utiliser les flèches pour comparer, **Garder → créateur suivant**
pour conserver un choix provisoire, **Rejeter cette image** pour l’écarter, ou
**Créateur suivant** pour revenir plus tard. Les candidats sans résultat restent
parcourables ; on peut importer une photo depuis le même écran. Les détails sont
repliés. Un choix reste à vérifier et ne devient pas publiable par ce geste.

- Cliquer sur un créateur. Examiner les candidates enregistrées ; les résultats
  peuvent être des homonymes, des photos de groupe ou des images sans rapport.
- **Examiner et cadrer** récupère l’originale. Déplacer l’image avec la souris et
  régler le zoom. Le résultat fait jusqu’à 900 × 900 px sans agrandissement.
  Les photos de 300 à 899 px sont gardées à leur résolution native ; l’atelier
  ne les agrandit pas. Les images de moins de 300 px restent refusées.
- Le champ **Nom/alias de recherche** permet de préciser le vrai nom ou une
  formulation désambiguïsée (par exemple « Ibai Llanos streamer »). Enregistre-la
  une fois : les liens navigateur et la prochaine recherche Commons la réutilisent.
- Vérifier la personne, l’auteur et la licence sur **Ouvrir la source**. Confirmer
  la vérification puis cliquer **Garder ce portrait**.
- Si aucune candidate ne convient, ouvrir **Google Images** ou **Flickr** dans
  ton navigateur, ou relancer la recherche Commons. Une photo visible en ligne
  n’est pas automatiquement autorisée pour le jeu. Les licences compatibles
  prises en charge ici sont CC BY, CC BY-SA et CC0 ; les autorisations directes sont aussi prises en charge avec un lien de preuve et leur portée.
- **Photo du PC** permet de cadrer un JPEG, PNG ou WebP que tu as déjà. Renseigner
  son auteur, son lien de source ou d’autorisation et sa vraie licence. Conserver
  l’original sur le PC, ou cliquer **Sauvegarder cette photo pour plus tard**.
- **Passer ce créateur** ne le supprime pas : il reste dans la liste, indiqué
  « passé, à reprendre ». Tu peux revenir dessus.

Les recherches initiales étant déjà présentes, **Chercher un lot de 20** évite
de les refaire. Utiliser la recherche individuelle pour un résultat manquant ou
incorrect. Aucun classement automatique ne prétend reconnaître les personnes
ou vérifier les droits. Le choix esthétique reste le tien.

## Récupérer le résultat

Cliquer **Exporter les portraits prêts**. Les fichiers sont dans
`_travail\EXPORT` : images WebP et `portrait-overrides.patch.json` avec les
crédits. L’export contient les vingt portraits déjà préparés mais non publiés,
ainsi que tes nouveaux choix. Il n’écrase pas un dépôt CreatorDeck.

Dans l’Explorateur Windows : clic droit sur le dossier `EXPORT` → **Compresser
dans un fichier ZIP** (ou **Envoyer vers → Dossier compressé**). Transmettre ce
ZIP à Codex pour une intégration ciblée et les contrôles. Pas besoin de refaire
la recherche : fusionner uniquement les entrées du patch avec le registre
existant, copier les images et préserver les changements des autres sessions.

Tout est sauvegardé dans `_travail`. Relancer `LANCER.cmd` reprend tes choix.
Ne pas supprimer ce dossier ; en faire une copie de sauvegarde régulièrement.
La version Windows du lanceur n’a pas été exécutée sur un PC physique lors de
sa préparation ; le serveur et le parcours navigateur sont vérifiés sur Linux.

## Si ça bloque

Un HTTP 403/429 ou un délai dépassé vient de l’accès à la source : réessayer plus
tard, ouvrir la source dans le navigateur ou utiliser une originale déjà sur le
PC. L’outil ne contourne ni une protection réseau ni une vérification anti-robot.
Une photo de moins de 300 px sur son petit côté est refusée. Les photos plus petites
que 900 px restent à leur résolution native, sans agrandissement. À la réception
d’une image identique ou d’une source déjà attribuée, l’atelier affiche un
avertissement non bloquant avec le créateur associé. Si la page indique « accès refusé », relancer `LANCER.cmd` et utiliser
la nouvelle fenêtre, plutôt qu’un ancien favori.

## Reconstruire le paquet depuis le dépôt (Codex)

Après `npm ci` dans CreatorDeck :

```sh
node tools/portrait-studio/pack.mjs --research /chemin/vers/la/collecte
```

Le script prépare `seed/` sans réseau. Copier ce dossier, les fichiers du présent
outil et le lanceur dans un ZIP, sans `_travail/` ni `node_modules/`.

## Nouveautés : recherches avec ton navigateur

Les liens Bing Images, YouTube, Instagram, X et comptes officiels complètent
Google Images et Flickr. Ils ouvrent ton navigateur habituel : tu utilises tes
comptes et peux résoudre une vérification manuellement. Les résultats externes
ne sont pas automatiquement collectés ou reconnus comme officiels.

Déposer un fichier sur la zone indiquée, coller une image avec Ctrl+V, ou
renseigner son URL HTTPS directe. Certains sites refusent l’accès depuis une
autre page (CORS) : télécharger dans le navigateur puis déposer le fichier.
Les cookies de tes comptes ne sont pas récupérés par l’outil.

Le panneau **Suivi et sources supplémentaires** conserve étape, liens et notes.
Les étapes sont À chercher, Trouvé, À cadrer ; garder le portrait le marque Prêt.
**Sauvegarder cette photo pour plus tard** conserve l’originale et les crédits,
puis **Reprendre la photo importée** permet de refaire le cadrage après fermeture.
La position du cadrage non validé n’est pas enregistrée.

Pour **Autorisation directe**, renseigner l’auteur, la page source, un lien HTTPS
vers la preuve d’autorisation et sa portée (jeu, recadrage, etc.). Un simple lien
vers un profil n’est pas une autorisation. Garder une copie de la preuve : l’outil
conserve le lien et ton texte, sans vérifier ou télécharger cette preuve.
L’export contient aussi `suivi-sources.json` pour transmettre notes et sources.

Pour mettre à jour une première version, fermer son lanceur puis remplacer les
fichiers de l’outil par ceux du nouveau ZIP, **en conservant `_travail`**. Les
choix précédents restent compatibles ; relancer ensuite `LANCER.cmd`.

## Mode rapide par lots — version 1.2.0

**Validation rapide par lots** montre 20 créateurs avec l’image actuelle et
jusqu’à trois candidates d’au moins 600 px. Les propositions présentes passent
avant les cas sans candidate. Tri sur le nom du fichier, la revue de licence et
la résolution : aucun système ne confirme la personne ni la netteté du visage.
L’aperçu carré est un cadrage central, sans détection de visage.

Cocher les bonnes personnes et cadrages. **Préparer les photos cochées** récupère
les originales comme brouillons, sans déclarer les droits validés. Pour un lot
prêt, vérifier les sources, cocher aussi les droits pour chaque portrait, puis
**Garder les cadrages cochés et vérifiés** : export WebP jusqu’à 900 px et crédits.
**Examiner** permet de corriger un cadrage avant validation ; une photo de groupe
ne doit pas être validée sans vérifier la personne dans le carré. Une erreur de
téléchargement arrête le lot, en conservant les éléments déjà enregistrés.

Le filtre d’étape facilite la reprise des brouillons. **Garder et suivant**
enchaîne les créateurs. Originale, champs et cadrage sont sauvegardés après une
modification et lors du changement de créateur. À la réouverture, le dernier
créateur et son brouillon sont restaurés. Attendre la sauvegarde avant fermeture ;
un avertissement de navigateur apparaît si un travail est encore en attente.
Une image trop petite peut rester en brouillon, mais ne peut pas être exportée.

Les 998 recherches ne garantissent pas 998 bonnes photos : beaucoup contiennent
des homonymes. Le mode rapide aide à trier ; il ne promet pas les 1 000 nouveaux
portraits publiables en deux ou trois heures. Les cas sans bonne source restent
à reprendre manuellement, leur image actuelle restant disponible.

## Mise à jour sans réinstallation

Le bouton **Vérifier les mises à jour** compare la version avec le dépôt officiel.
Pour installer une correction : fermer la fenêtre noire de l’atelier, puis
double-cliquer **METTRE-A-JOUR.cmd** dans le même dossier. Relancer `LANCER.cmd`.
Aucune réinstallation de Node ni récupération des grosses données n’est requise.
Le téléchargement remplace uniquement les fichiers du programme. `seed/` et
`_travail/` restent en place. Le code précédent est sauvegardé sous
`_travail/sauvegardes-outil/`. Les empreintes des fichiers sont vérifiées avant
leur remplacement ; un problème réseau laisse le code existant en place.

Cette première installation de la mise à jour nécessite le nouveau ZIP :
extraire ses fichiers dans le dossier existant en conservant `_travail/`.
Ensuite, les corrections compatibles se récupèrent avec le lanceur de mise à
jour. Le paquet reste inférieur à 10 Mo ; les mises à jour du code sont beaucoup
plus petites. Un futur changement de données peut nécessiter un paquet séparé.

## Parcours depuis ton navigateur — version 1.3.0

Le dossier `extension/` contient un connecteur Chrome/Edge. Suivre
[son installation initiale](extension/INSTALLER.md). Une fois connecté :

1. **Rechercher ce créateur** ouvre Google Images dans un onglet réutilisable.
2. Sur une bonne image, clic droit → **Envoyer à CreatorDeck**.
3. La photo et sa source sont reçues ; vérifier la personne et le cadrage.
4. **Choisir la photo et rechercher le suivant** enregistre ta sélection et
   ouvre la recherche du prochain créateur restant.

Les photos reçues ne remplacent pas automatiquement un éditeur en cours ;
**Ouvrir une photo reçue** permet de les ouvrir ensuite. La file conserve les
originales et leurs sources. Les transferts sont associés au créateur ouvert
au moment du clic, même si tu changes ensuite de fiche.

Tu peux choisir et cadrer avant de renseigner les droits. Le filtre
**Droits à vérifier** rassemble ces sélections. Elles sont exportées dans
`A-VERIFIER`, avec un manifeste séparé, et ne sont jamais ajoutées au patch de
publication. Pour les rendre publiables, reprendre le brouillon, compléter
l’auteur/la source/la licence ou l’autorisation puis **Garder ce portrait**.
Le mode par lots propose aussi **Choisir les cadrages cochés (droits plus tard)**.

**Exporter les portraits prêts** télécharge maintenant un ZIP directement :
plus besoin de compresser le dossier dans l’Explorateur. Il inclut les portraits
prêts, leurs crédits et les sélections encore à vérifier dans un dossier séparé.
Une copie reste sous `_travail/EXPORT`. Transmettre le ZIP pour intégration.

Si tu possèdes déjà la version 1.2.0, son lanceur de mise à jour récupère le
nouveau code de l’atelier. Pour ajouter le connecteur la première fois, extraire
le petit ZIP de l’extension dans le dossier de l’atelier et suivre sa notice.
Les versions suivantes de l’updater actualisent aussi les fichiers de l’extension.
Après mise à jour, recharger l’extension dans Chrome/Edge ou redémarrer le navigateur.

Vérifications : serveur et updater, parcours Chromium avec le code du connecteur
et les API Chrome simulées, ZIP lu par un lecteur indépendant. Le navigateur du
cloud interdit les extensions non empaquetées par règle administrateur : le clic
droit réel, la demande de permission et le chargement sur Windows restent à tester.
Les téléchargements des sites qui refusent l’accès restent à faire manuellement.
