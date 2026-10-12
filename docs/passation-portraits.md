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

## Périmètre actuel — correction explicite de Malik, 12 octobre 2026

**Malik demande de refaire les portraits des 1 000 créateurs avec de belles
images.** La restriction aux grands créateurs et la conservation systématique
des petits sont remplacées par cette instruction. La recherche concerne tout
le catalogue ; travailler par lots est une organisation, pas une limitation
au Top 50 ni aux cinq noms du premier lot. Les fonctionnalités déjà terminées
restent le chemin d’intégration. Style choisi par Malik : **photos nettes, visage visible, cadrage individuel
cohérent**. Appliquer ce critère aux 1 000 créateurs.

[Suivi complet](portrait-suivi-complet.csv) : une ligne par créateur, statut
initial explicite ; **Rubius/Shroud sont exclus de la nouvelle recherche**,
à la demande explicite de Malik avant son départ dormir. Les 998 autres
créateurs restent dans le périmètre. Définir des candidates
nettes, correctement attribuées au créateur et documentées, puis sélectionner
et intégrer par lots. La recherche précédente de six images reste disponible.

L’accès GitHub a échoué lors de la clarification précédente, puis a été
rétabli avant le lancement du lot complet : `git ls-remote`, API GitHub et
fetch réussis, main distant/local à `32697cf`, aucune PR ouverte.

## Ancien périmètre, remplacé par la demande ci-dessus

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
Ancienne consigne remplacée par l’autorisation de Malik : avancer au maximum
sur les 998 portraits restants, sans intervention pendant son sommeil.

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
AmineMaTue et Ninja streamer ; Squeezie renvoie 25 résultats (titres examinés,
homonymes principalement), aucune candidate retenue ; résultats xQc non pertinents.
Bing répond 200 mais donne des résultats sans rapport : pas une preuve de source.

Prochaine action ciblée : comparer Gotaga 2018 à l’avatar actuel, confirmer les
licences YouTube Squeezie/Amine/Gotaga 2026 à partir des liens des pages Commons,
puis choisir un recadrage Ninja sans agrandissement. Garder xQc actuel et chercher
plus tard une vraie alternative nette. Ne pas relancer les recherches infructueuses
Google/Phosphore sans nouvel élément ; aucun audit général requis.
Réservation libérée après ce checkpoint ; suites applicatives non relancées
pour cette recherche et ces seuls changements documentaires.

## Collecte complète autonome — checkpoint de lancement

Malik autorise recherche, téléchargement et intégration au maximum pendant son
absence. Style : photos nettes, visage visible, cadrage individuel cohérent.
Rubius et Shroud conservés ; aucune recherche supplémentaire pour ces deux noms.

Collecte Commons reprenable : `node scripts/research-portraits.mjs --output
/workspace/artifacts/portraits-complet-2026-10-12 --stage search --workers 3`.
Puis même commande avec `--stage download`. Les résultats et originales sont
hors Git, les données intégrées restent dans le registre existant. Le script
exclut automatiquement les remplacements déjà présents, garde les erreurs et
n’active jamais une image sans examen. Les résultats limités à 12 par recherche
sont des candidates, pas des identités ni des qualités validées.

Pilote 20/20 recherches réussies, puis recherche des 998 lancée ; trois appels
simultanés maximum, pause entre appels. Installation `npm ci` initiale refusée
à cause du cache /home/agent/.npm, puis `npm ci --cache /workspace/.cache/npm`
réussie (602 packages, lockfile inchangé). Aucun test applicatif encore relancé.
La session est l’unique écrivain observé, réservation portraits active.

## Premier lot intégré pendant la collecte complète

Huit nouveaux portraits locaux : Gotaga, Amouranth, Mastu, Maghla, ZeratoR,
Nadeshot, Valkyrae et Doublelift. Rubius et Shroud conservés. Originaux et
cadrages examinés, WebP 900 px sans agrandissement, crédits dans le registre
existant. [Sélections et coordonnées de cadrage](portrait-selection-2026-10-12.json)
avec empreintes des originales et preuves de provenance. Mastu/Maghla proviennent
des œuvres personnelles de Mickaël Schauli ; ZeratoR dispose d’une permission
VRT Commons ; les sources Flickr des dérivés ont leurs licences indiquées.

Vérifications locales sur le diff depuis `54b1bc4` : `npm test --
src/lib/creator-portraits.test.ts src/lib/preload.test.ts src/lib/credits.test.ts`
21/21 ; `npm run ecrans -- src/ecrans-credits.test.tsx` 2/2 ; typecheck,
catalog:ci, ESLint ciblé et diff-check réussis. Premier essai unitaire : un
attendu Gotaga encore sur l’ancien avatar a échoué ; attente mise à jour et
21 tests repassés. Tests des crédits adaptés au nombre croissant d’attributions.
Build et E2E de ce lot seront exécutés au checkpoint final, aucune preuve
sur téléphone physique. Collecte encore active ; 998/998 recherches Commons
réussies, Flickr en fin de collecte/reprise de réponses vides. L’erreur des
grosses originales est résolue par le client HTTP du même contexte navigateur,
même proxy et confiance TLS, au lieu du tampon de l’inspecteur Chromium.
