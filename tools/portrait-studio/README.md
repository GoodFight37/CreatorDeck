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

- Cliquer sur un créateur. Examiner les candidates enregistrées ; les résultats
  peuvent être des homonymes, des photos de groupe ou des images sans rapport.
- **Examiner et cadrer** récupère l’originale. Déplacer l’image avec la souris et
  régler le zoom. Le résultat fait 900 × 900 px sans agrandissement.
- Vérifier la personne, l’auteur et la licence sur **Ouvrir la source**. Confirmer
  la vérification puis cliquer **Garder ce portrait**.
- Si aucune candidate ne convient, ouvrir **Google Images** ou **Flickr** dans
  ton navigateur, ou relancer la recherche Commons. Une photo visible en ligne
  n’est pas automatiquement autorisée pour le jeu. Les licences compatibles
  prises en charge ici sont CC BY, CC BY-SA et CC0 ; les autres cas restent à
  examiner séparément.
- **Photo du PC** permet de cadrer un JPEG, PNG ou WebP que tu as déjà. Renseigner
  son auteur, son lien de source ou d’autorisation et sa vraie licence. Conserver
  l’original sur le PC si tu veux refaire son cadrage plus tard.
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
Une photo de moins de 900 px sur son petit côté est refusée pour éviter de
l’agrandir. Si la page indique « accès refusé », relancer `LANCER.cmd` et utiliser
la nouvelle fenêtre, plutôt qu’un ancien favori.

## Reconstruire le paquet depuis le dépôt (Codex)

Après `npm ci` dans CreatorDeck :

```sh
node tools/portrait-studio/pack.mjs --research /chemin/vers/la/collecte
```

Le script prépare `seed/` sans réseau. Copier ce dossier, les fichiers du présent
outil et le lanceur dans un ZIP, sans `_travail/` ni `node_modules/`.
