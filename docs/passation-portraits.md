# Reprise courte : portraits CreatorDeck — 12 octobre 2026

## État vérifié

Code publié sur `main` : `433ee065f98c8ff2956d90c480acfb59f0890b86`.
[CI](https://github.com/GoodFight37/CreatorDeck/actions/runs/38186329103) :
**success, quatre jobs**. [Workflow Supabase automatique](https://github.com/GoodFight37/CreatorDeck/actions/runs/38186571263) : success.
Tests locaux : 13 unitaires, 11 DOM, 2 E2E bureau/téléphone simulé ; build,
typecheck, ESLint ciblé et catalogue réussis. Téléphone physique non testé.

Rubius et Shroud sont remplacés par des portraits carrés WebP **900 px**.
Les crédits sont repliés dans **Toi → Réglages → Crédits des images**,
jamais sur les cartes. Avatars Twitch conservés ; les remplacements sont
protégés des régénérations. Sources/licences issues du manifeste fourni.

## Reste à faire

Malik souhaite des photos plus nettes et intéressantes pour les grands
créateurs, puis ajuster individuellement. Garder les petits avec leurs images
actuelles. **Seulement deux remplacements sur les 50 premiers** : le premier
lot avait dix candidates ; ne pas le présenter comme une solution complète.
AdinRoss écarté pour qualité ; Rivers reste à comparer. Cinq photos Flickr sont
tous droits réservés ; ne pas les publier sans autorisation. KaiCenat reste
marqué « droits à vérifier » dans le manifeste.

La nouvelle session de Malik possède la configuration réseau modifiée.
**L'ancien chat refuse toujours Google/Phosphore via le proxy** : tests directs
effectués après le changement. Ne pas lui faire refaire l'environnement.
Tester les accès dans sa nouvelle session et avancer avec les sources accessibles.
Les échecs Google du premier rapport provenaient de pages HTML non exploitables :
essayer un vrai navigateur s'il est disponible, sans contourner les protections.
Travailler par petits lots ; pas de nouveau modèle coûteux ou de recherche exhaustive.

## Lecture minimale et prochaine action

**Recherche seule** : ce document suffit ; aucun clone ni audit du dépôt.
Trouver quelques portraits individuels originaux, noter source/auteur/licence,
puis fournir ZIP + manifeste. Les huit candidates non intégrées sont référencées
dans [portrait-candidates.csv](portrait-candidates.csv), à lire seulement si utile.
Premier petit lot conseillé : Squeezie (`squeezie`), Gotaga (`gotaga`),
Amine (`aminematue`), Ninja (`ninja`), xQc (`xqc`). Pour Gotaga, chercher une
alternative à la photo Flickr tous droits réservés déjà reçue.

**Intégration** : vérifier HEAD/main et l'état local ; lire seulement
`src/data/portrait-overrides.json`, `src/lib/creator-portraits.ts` et
`docs/catalogue-twitch.md` (première section). Les nouveaux fichiers vont dans
`public/creators/curated/` et leur provenance dans le registre JSON.
Carte, affiche et préchargement utilisent déjà le même choix.
Si les composants changent : `image-credits.tsx`, `profile-view.tsx`.
Tests ciblés : creator-portraits/preload/credits, ecrans-credits, puis
portrait-credits.spec.ts si le rendu change. Cache Playwright local :
`PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` si présent.

Publier normalement sur main après contrôles adaptés, sans redemander accord.
Préserver les changements/commits des autres agents. Aucune nouvelle règle de
jeu, migration ou refonte n'est demandée dans ce chantier. Les anciens briefs
produit sont déjà faits : ne pas les recommencer. Mettre à jour cette passation
courte ; les archives restent disponibles seulement pour une question précise.

## Recherche reprise dans la nouvelle session — 12 octobre 2026

Checkpoint de recherche seul, base vérifiée `929d9af5c52855629dbb1c443ae17b9a11b58ee1`.
Aucun nouveau portrait intégré, aucun composant modifié, aucun écrivain concurrent
observé (checkout propre, HEAD distant stable, aucune PR ouverte).

Six candidates téléchargées pour les cinq créateurs conseillés : voir
[le nouveau manifeste](portrait-recherche-2026-10-12.csv). Deux versions Gotaga.
Toutes examinées visuellement ; dimensions et décodage vérifiés avec Sharp.
Les originales, textes des pages sources et manifeste sont dans le ZIP local
`/workspace/artifacts/portraits-2026-10-12.zip` (6 images, intégrité ZIP vérifiée).
Le ZIP n’est pas versionné ; conserver une copie avant de fermer cet environnement.
Les URL directes et SHA-256 du manifeste permettent de retrouver les fichiers.

- **Gotaga 2018** : 1 054 px carrés, sourire, visage dégagé ; CC BY 3.0,
  Collectif Red House, licence YouTube revue sur Commons le 6 mars 2025.
  Alternative au Flickr tous droits réservés ; ancienne capture, à comparer.
- **Gotaga 2026** : 1 105 × 1 080, capture Zack Nani, CC BY 4.0 affichée ;
  aucune revue externe relevée, vérifier la licence de la vidéo amont.
- **Squeezie** : 1 080 px carrés, capture Zack Nani 2025, CC BY-SA 3.0 affichée ;
  Commons signale explicitement « License review needed ». Ne pas intégrer avant
  confirmation amont ; micro/bouteille, netteté de capture vidéo.
- **Amine** : 1 920 × 1 080, capture ZACK 2021, CC BY 3.0 affichée ;
  même revue de licence manquante. Sujet à gauche, recadrage individuel requis.
- **Ninja** : photo State Farm 2023, 2 880 × 2 160, CC BY 2.0 revue par
  FlickreviewR 2 le 13 novembre 2023. Expression intéressante mais plan large,
  sujet à droite ; l’extrait portrait Commons ne fait que 636 × 848.
  La taille de l’original ne garantit pas 900 px de détail sur le visage.
- **xQc** : extrait Dallas Fuel 2018, 700 × 800, CC BY 3.0 revue le
  12 septembre 2020 ; écarté pour ce lot net (profil, autre personne, résolution).

Accès réellement testés : Git HTTPS et API GitHub réussissent ; dernier contrôle
sur la base : [Vérification](https://github.com/GoodFight37/CreatorDeck/actions/runs/38187082751)
success. Wikimedia API/pages et téléchargement via Python renvoient HTTP 403,
mais **Chromium via le proxy de session réussit sur Commons et ses originales**.
Le navigateur utilise la confiance limitée au certificat CA du proxy de session
(SPKI), sans désactiver globalement TLS. Google atteint avec Chromium affiche
une vérification anti-robot : aucun contournement. Phosphore refuse le tunnel
HTTP 403. Flickr accessible ; filtre commercial CC sans résultat pour Gotaga,
Squeezie, AmineMaTue et Ninja streamer ; résultats xQc non pertinents.
Bing répond 200 mais donne des résultats sans rapport : pas une preuve de source.

Prochaine action ciblée : comparer Gotaga 2018 à l’avatar actuel, confirmer les
licences YouTube Squeezie/Amine/Gotaga 2026 à partir des liens des pages Commons,
puis choisir un recadrage Ninja sans agrandissement. Garder xQc actuel et chercher
plus tard une vraie alternative nette. Ne pas relancer les recherches infructueuses
Google/Phosphore sans nouvel élément ; aucun audit général requis.
Réservation libérée après ce checkpoint ; suites applicatives non relancées
pour cette recherche et ces seuls changements documentaires.
