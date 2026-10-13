## Reprise du ZIP — 13 octobre 2026

Mission de Malik : récupérer et publier tout le travail local, sans nouvelle
collecte ni substitution des choix déjà livrés. Base et main distant vérifiés
identiques : `6f63374bc38f2746fb5e4c73db5dea50243d5274`. Patch binaire contrôlé,
40 empreintes vérifiées avant application et fichiers restaurés à l’identique.

Lot portraits : les 20 WebP curated non publiés sont récupérés avec leurs
attributions, cadrages, suivi complet et améliorations du script de collecte.
Registre passé de 10 à 30 ; les dix entrées antérieures restent identiques.
Priorité manuelle conservée : 18 nouvelles images restent en réserve ; seules
Livibee et 9pasha prennent priorité sur leurs versions Upscayl à l’affichage.
Les 300 choix manuels, 699 images Upscayl et Diverron ne sont pas refaits.
Le test navigateur récupéré est renforcé pour les deux images réellement actives,
leurs dimensions 900 px et leurs sources dans les crédits, sans retirer les
contrôles des portraits manuels 450 px.

Validation indépendante du booster : 51/51 tests unitaires ciblés (portraits,
préchargement, crédits), dont décodage de tous les curated ; 2/2 DOM crédits
inclus dans les 32/32 DOM ciblés de la reprise. Typecheck, lint ciblé, catalogue,
vocabulaire et build statique sans cloud réussis après `npm ci` ; lock inchangé.
Parcours navigateur portraits bureau/téléphone simulé : 2/2 réussis.
Publication en préparation.
Les sources/licences sont reprises du ZIP, sans nouvelle enquête externe.
État de publication et résultats définitifs : [rapport de reprise](reprise-zip-2026-10-13.md).
Les checkpoints plus anciens ci-dessous sont historiques. Aucune réservation
active ni nouvelle recherche à relancer.

# Reprise courte : portraits CreatorDeck — 12 octobre 2026

**Checkpoint courant :** lot publié `10699eb`, CI complète et Vercel Production
réussis. 300 manuels + 699 Upscayl + Diverron restauré IA. Malik accepte les
avatars génériques sans photo de profil, dont SolaryHS, j0niq et toaststix :
aucune recherche/remplacement requis. [Bilan actuel](etat-projet-2026-10-12.md).
Les sections antérieures ci-dessous sont historiques.

## État historique — premier lot Rubius/Shroud

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

## Atelier local Windows — 12 octobre 2026

Malik a arrêté la collecte autonome pour économiser son quota et demandé un
outil sur son PC Windows. Ne pas relancer les recherches massives ni les
fonctionnalités déjà terminées. Outil : [notice](../tools/portrait-studio/README.md),
`tools/portrait-studio/`. Node 24, aucune dépendance d’exécution, aucun appel IA.
Lanceur Windows, interface navigateur, candidates Commons mises en cache,
choix manuel, cadrage WebP 900 px sans agrandissement, crédits, état local
reprenable et export séparé ; aucune écriture GitHub ou dans le jeu.

Paquet local : `/workspace/artifacts/CreatorDeck-Atelier-Portraits-Windows.zip`.
Il contient les 1 000 créateurs, 998 recherches Commons et 30 portraits préparés.
Les 30 sont masqués par défaut. Base publiée utilisée : `f8474f1` (10 portraits) ;
les 20 portraits locaux supplémentaires sont inclus au premier export.
Ces 20 images et le registre local restent préexistants et non publiés par
le commit de l’outil. Le ZIP contient les données, le code Git ne les duplique
pas. Conserver le ZIP avant fermeture de l’environnement.

Vérifications du seul outil sur base `f8474f1` :
`node --test tools/portrait-studio/server.test.mjs` : 3/3 ;
`npx eslint tools/portrait-studio/*.mjs tools/portrait-studio/app.js` : réussi.
Parcours Playwright/Chromium Linux réussi, sans accès externe : liste de 970
créateurs restants, import local, cadrage, sauvegarde, rechargement et export
avec patch préservant la base. État d’essai supprimé du paquet. Lanceur Windows
non exécuté sur PC physique ; récupération réseau sur le PC non testée.

Prochaine action de Malik : installer Node 24 LTS, extraire le ZIP et lancer
`LANCER.cmd`. Choisir les portraits puis exporter ; compresser `_travail/EXPORT`
et transmettre uniquement ce ZIP pour l’intégration ciblée. Les homonymes et
licences demandent une vérification humaine. Aucune recherche IA nécessaire.
Réservation libérée après livraison de l’outil.

### Atelier élargi à la demande de Malik

Ajout des recherches dans le navigateur habituel (Bing, YouTube, Instagram, X,
comptes officiels), import par URL HTTPS avec repli manuel si CORS, dépôt de
fichier et collage d’image. Suivi persistant À chercher/Trouvé/À cadrer/Prêt,
liens et notes multiples, sauvegarde et reprise d’une originale avant validation.
Autorisations directes acceptées avec lien de preuve et portée documentée,
transmises avec les crédits ; aucune vérification automatique de ces preuves.
Ancien `_travail` compatible, à conserver lors du remplacement de l’outil.
Aucun modèle particulier nécessaire, aucun appel IA à l’utilisation.

Base vérifiée `f3a3c53`. Tests serveur enrichis : 3/3 ; ESLint ciblé réussi.
Chromium Linux : recherches externes présentes, suivi, sauvegarde d’originale,
rechargement/reprise, autorisation directe et export vérifiés sans accès externe.
Import URL réel, presse-papiers système et PC Windows non testés. ZIP reconstruit
au même emplacement, données initiales conservées, état d’essai retiré.

### Version 1.2.0 : lots, reprise automatique et mises à jour

Malik veut réduire la sélection à quelques heures et recevoir les corrections
sans réinstallation. Ajout d’une planche de 20 créateurs (jusqu’à trois
candidates, image actuelle et aperçu carré central), préparation des originales
cochées et validation groupée avec confirmation individuelle identité/cadrage
et droits. Tri par correspondance de titre, revue de licence et résolution,
aucune reconnaissance de visage ou validation automatique d’identité. La
collecte contient 267 créateurs avec au moins une raster >=900 px, homonymes
possibles : ne pas garantir 1 000 nouvelles photos en trois heures.

Ajout sauvegarde automatique originale/champs/cadrage, reprise du dernier
créateur, filtres d’étape, Garder et suivant, aperçu du choix enregistré,
pistes sous 900 px conservables sans export. Brouillon Commons indépendant des
résultats récents, avec conservation du signal licence à vérifier.

Mise à jour : `METTRE-A-JOUR.cmd`, `update.mjs`, manifeste `release.json`.
Source fixe dépôt officiel/main, liste limitée de fichiers de code, SHA-256
vérifiés avant remplacement, sauvegarde et repli si application échoue ; aucune
écriture dans seed ou choix. Fermer l’atelier, lancer la mise à jour, relancer.
Premier passage à 1.2.0 via le ZIP, en conservant `_travail`. Le fichier update
est également actualisable. Publier un nouveau manifeste après chaque changement
futur du code distribué, sinon les empreintes empêcheront la mise à jour.

Tests base `a5cb014` : serveur + updater 4/4 ; corruption du téléchargement
refusée sans toucher au code existant ni aux choix. Test Chromium reproductible
`node tools/portrait-studio/browser.test.mjs` : validation groupée bloquée sans
confirmation, import URL simulé, sauvegarde automatique, reprise du créateur et
du brouillon, Garder et suivant, export réussi. ESLint ciblé réussi. Tests sur
Linux et réponses réseau simulées ; Windows physique non testé. ZIP 8,6 Mio,
intégrité vérifiée, aucun état de test inclus. Travail portraits préexistant
conservé et non intégré par cette publication. Réservation libérée.

### Version 1.3.0 : connecteur navigateur et sélection avant droits

Malik demande de simplifier au maximum le passage Google Images → atelier.
Connecteur MV3 Chrome/Edge dans `tools/portrait-studio/extension/`, menu clic
 droit image, capture URL directe et page source (imgurl/imgrefurl si disponibles),
transfert à l’atelier et retour au premier plan. Permission HTTPS optionnelle
explicite pour les téléchargements choisis ; aucun cookie des comptes récupéré.
HTTP localhost fixe 127.0.0.1:4317. Connexion initiale par bouton Copier la
connexion navigateur puis collage dans le popup ; clé locale persistante sous
`_travail/connexion-navigateur.json`, jamais dans Git ou les exports. Autorisation
restreinte pour cette clé à bridge-state et receive ; contrôle d’origine et
Bearer. Cible figée avant téléchargement. Inbox persistante, pas d’écrasement
automatique d’un éditeur ouvert. Photos reçues ouvrables depuis un bouton dédié.

Parcours : Rechercher ce créateur → clic droit Envoyer à CreatorDeck → cadrage →
Choisir la photo et rechercher le suivant (onglet de recherche réutilisé).
La sélection esthétique peut avancer sans crédits complets ; statut Droits à
vérifier, stockage séparé, exclusion du patch de publication. Validation groupée
sans droits possible, droits traités ensuite. Le dernier cadrage et l’originale
restent reprenables. Export ZIP direct, avec dossiers public/ et A-VERIFIER
séparés et manifestes explicites. ZIP sans dépendance runtime, CRC32 contrôlé.

Livrables locaux : ZIP complet Windows toujours 8,6 Mio ; complément seul
`/workspace/artifacts/CreatorDeck-Extension-Navigateur.zip` (quelques Kio).
Utilisateur 1.2 : lancer METTRE-A-JOUR.cmd, extraire le complément dans le dossier
de l’atelier et charger une seule fois extension/ via chrome://extensions ou
edge://extensions, mode développeur. Installation détaillée dans
[la notice](../tools/portrait-studio/extension/INSTALLER.md). Le nouvel updater
actualise aussi les fichiers de l’extension via extensionFiles dans le manifeste,
compatible avec l’ancien updater qui ignore cette section. Après actualisation,
recharger l’extension ou redémarrer le navigateur. Choix et recherches conservés.

Base vérifiée `9bd1ca4`. Tests serveur+updater enrichis 5/5, dont clé bridge refusée
sur les API ordinaires, origine étrangère refusée, inbox, export pending séparé,
ZIP et mise à jour ajoutant l’extension sans supprimer les choix ; ESLint ciblé
réussi. Chromium : connecteur réel exécuté avec API Chrome et téléchargement
simulés, transfert au vrai serveur, réception dans l’éditeur, sélection sans
licence, export et ZIP lu avec Python zipfile réussis. Le chargement réel MV3
est bloqué par politique administrateur du Chromium cloud : essais timeout puis
CDP explicitement refusé. Aucun contournement poursuivi ; clic droit réel,
permissions, Chrome/Edge Windows et accès aux sites non validés. Ne pas annoncer
le connecteur testé physiquement ni garantir tous les sites. ZIPs vérifiés,
aucun état de test inclus, portraits préexistants non publiés par ce commit.


### Atelier linéaire v1.5.0 — sélection rapide

À la demande de Malik : mode carrousel plein écran « façon Tinder », avec une
image visible, flèches pour comparer, rejet mémorisé de la candidate, maintien
du créateur dans la file quand on passe sans trancher, bouton « Garder →
créateur suivant » et import d’une photo personnelle depuis ce même écran.
Les détails source/licence sont repliés. Les choix sont provisoires, restent
dans « droits à vérifier » et sont exclus du patch de portraits publiables.
Les originales de 300 à 899 px restent utilisables à résolution native, sans
confirmation répétée ni agrandissement ; sous 300 px elles sont refusées.

Code modifié dans `tools/portrait-studio/` ; version `1.5.0`, mise à jour par
`Vérifier les mises à jour` puis fermeture de l’atelier et lancement de
`METTRE-A-JOUR.cmd`. L’updater existant sauvegarde le code et préserve
`_travail`. Aucun ZIP complet nécessaire. Tests ciblés : `npm --prefix
tools/portrait-studio test` 6/6 ; `node tools/portrait-studio/browser.test.mjs`
réussi avec Chromium et sources simulées (carrousel, flèches, rejet, choix
provisoire, import local, reprise/validation préexistantes, export séparé) ;
ESLint ciblé réussi. CI GitHub du commit `9e9a906` : succès, quatre jobs. Windows physique et
récupération réelle Wikimedia depuis le PC utilisateur non testés.

### Import du lot Upscayl — 12 octobre 2026

Malik a fourni 11 ZIP pour les 700 portraits restants. Les parties 1 à 9
contiennent exactement 700 WebP 720 × 720 px uniques et décodables ; tous les
slugs correspondent au catalogue. Les parties 10 et 11 ne sont pas utilisées :
elles dupliquent des fichiers déjà présents et la dernière entrée de la 11 est
tronquée. Les versions 9pasha et Livibee restent servies depuis leurs portraits
Commons crédités ; l’upscale devient le repli après les sélections manuelles et
les portraits crédités.

Les 700 fichiers ont été réencodés avec Sharp WebP qualité 82, effort 5, sans
changement de dimensions. Diverron reste exclu de ce lot, car son upscale conserve
son avatar vert endommagé. Malik a fourni l’unique autre photo trouvée pour lui ;
elle a été restaurée avec IA et intégrée en WebP 900 × 900 px. La source et
l’auteur de la photo fournie ne sont pas documentés. Les 699 routes Upscayl
utilisées pèsent 18,2 Mio au lieu des 247 Mio bruts. Le lot manuel de 300 portraits
450 × 450 px n’a pas changé. Les sources/licences des images Upscayl ne figuraient
pas dans le ZIP. Détail et limites :
[import Upscayl](portrait-import-upscayl-2026-10-12.md).
