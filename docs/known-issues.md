## Révélation MEMES : doigt secondaire et sortie de carte — publié, 24 octobre 2026

Base `481d27a3`, gravité P2 (geste). La revue du point 8 montre que le geste
retenait seulement des coordonnées, sans identifiant de pointeur ni capture.
Après un appui principal, le relâchement d'un second doigt pouvait donc avancer
la carte ou effacer le geste principal ; sortir de la carte perdait le relâchement.
Correction : capture du premier pointeur, événements des autres doigts ignorés,
annulation à la perte de capture. Test de régression sur ces trois parcours ;
validation Android et résultats exacts dans le rapport du chantier.
Correction publiée dans `2e48cd76`, Vercel Production du même SHA réussi.

## Test de déchirure : attente contraire au plan 002 — publié, 24 octobre 2026

Base `481d27a3`, gravité P2 pour la validation. Le scénario bureau « finger cuts »
échoue réellement : opacité reçue 0, attendue > .5 après la première carte.
Cause : le test exigeait la coque visible malgré son retrait décidé dans le plan 002.
Le scénario vérifie désormais le retrait de 300 ms, le délai de 120 ms,
l'opacité finale nulle et la révélation toujours présente. Aucun seuil augmenté,
aucun changement de l'animation. Résultat après correction dans la passation.
Correction publiée dans `2e48cd76`, Vercel Production du même SHA réussi.

## Révélation : filtres animés Épique/Légendaire — correction du 23 octobre 2026

Les keyframes `card-reveal-epic` / `card-reveal-legendary` de `globals.css`
animaient brightness et drop-shadow pendant les transformations. Ces filtres
sont retirés au profit d'ombres fixes, sans changement de rythme. Correction
ciblée demandée par Malik ; aucun gain de performances chiffré ou essai Android
revendiqué. Les animations plus spécifiques de `booster-continuity.css` restent
inchangées. Vérifications et publication dans le checkpoint courant.

## Drop : la ligne de réserve passe sous l'objet Drop de la barre du bas — ouvert, 22 octobre 2026

Version : `main` `957d22fb`. Gravité P2, lisibilité. Constat sur capture Playwright
(téléphone, `next dev`, partie neuve) : à 320×568 et à 1024×768, l'objet Drop
surélevé au centre de la barre du bas (`nav-objects.tsx`) recouvre `.stock-row`
(« 2 sachets · prochain à … ») ; à 1024 l'icône masque « prochain », à 320 toute
la ligne est cachée. À 390×844 la ligne est lisible. Non vérifié sur Android.
Piste : réserver sous le contenu de l'accueil la hauteur réelle de l'objet Drop,
pas seulement celle de la barre. Aucune correction faite.

## Préparation E2E : modes cloud mélangés et accueil du Tribunal — correctif publié, 22 octobre 2026

Version : `87454815`, gravité P2 pour la validation. `npm run e2e` avec la
configuration Supabase de `.env.local` faisait attendre des boutons/récompenses
du mode local à des tests exécutés comme invité cloud. Le run Claude arrêté
comptait 48 réussites, 9 échecs et 7 ignorés. Reprendre la recette CI : suite
générale avec les deux variables Supabase vides dans le processus, puis seulement
les scénarios « avec le serveur » avec configuration factice et RPC interceptés.
Ne pas modifier `.env.local` ni le jeu pour contourner ce mélange.

Le run général correct a isolé deux échecs supplémentaires dans le test Tribunal :
`gotoDeck(page, false)` laissait l'accueil sans cloud ouvert. Le scénario utilise
maintenant `gotoDeck(page)`, le helper réparé. Preuves : 203 réussites, 23 ignorés,
2 échecs initiaux sur 228 ; après correction, Tribunal sans cloud 2/2 et parcours
cloud + Tribunal 18/18, zéro ignoré dans ces relances locales. La CI publiée
39819805982 a ensuite terminé avec succès : 205 E2E réussis, 23 ignorés et
16/16 cloud simulés, aucun échec. Suivi
`CreatorDeck-Codex-1ny`, rapports locaux dans `reports/reprise-claude-2026-10-22/`.

## Bilan du Tribunal : montant affiché deux fois — ouvert, 22 octobre 2026

Version : `87454815`, gravité P3, affichage. Terminer les cinq verdicts en mode
local : le bilan peut afficher « Séance payée : +40 points. +40 points ».
Cause de rendu confirmée : `paiement.message` contient déjà le montant, puis
`paiement.delta` est affiché à nouveau dans un élément fort. Aucune preuve de
double versement ; règles et serveur inchangés. Capture téléphone simulé :
`reports/reprise-claude-2026-10-22/tribunal-sans-cloud-test-results/tribunal-focus-le-Tribunal-c0765-ilan-et-le-rend-à-la-sortie-téléphone/bilan.png`.
Suivi distinct `CreatorDeck-Codex-zmo` ; aucun contournement nécessaire pour jouer.

## Tribunal : focus du dialogue principal — correctif publié, 22 octobre 2026

Version constatée : `d6ecc0d6`, gravité P2 (accessibilité clavier). Avant le bilan,
ouvrir le Tribunal puis Tab/Maj+Tab ou Échap : le dialogue principal n'armait
pas `usePresentationFocus`, contrairement au bilan. Correctif : le dialogue
principal monté porte désormais le hook via `TribunalDialog`. Les 15 tests
d'écran passent, dont quatre cas de focus (présidence, séance, bilan, transition) ;
les 26 tests logique/notes passent. Playwright ciblé : 2/2 (bureau et téléphone
simulé), quatre captures examinées. Aucun changement de paiement ni de sauvegarde.
Android et appareil physique non testés pour ce correctif clavier.

## Helper E2E des chaînes : ancien bouton attendu — correctif publié, 22 octobre 2026

Version constatée : `d6ecc0d6`, gravité P2 (tests bloqués avant le parcours).
`gotoDeck(page, true)` ouvre le formulaire facultatif en mode édition, puis
`answerCircle` attend « Voir mon premier booster » au lieu d'« Enregistrer ».
Deux échecs avaient été reproduits avant l'ouverture du Tribunal. Reproduction
confirmée sur `8e42a397` : un test ciblé échoue sur cet ancien bouton alors que
la capture montre « Enregistrer ». `answerCircle` accepte maintenant les deux
libellés exacts, sans modifier les appelants ni le formulaire du jeu.
Preuve sur cette base + correctif : 6/6 scénarios Playwright (bureau et téléphone
simulé), dont enregistrement persistant, `withoutCircle`, rechargement avec
`tutorial=false` et onboarding connecté avec cadeau unique puis cinq boosters
(RPC factices de CI). Typecheck et ESLint ciblé : code 0 ; quatre captures
finales examinées. Aucun contournement nécessaire ; suivi `CreatorDeck-Codex-04e`.
La suite E2E complète reste à Malik ; Android et production non testés ici.

## Vérificateur SQL : JSON client supprimés — correctif publié, 22 octobre 2026

Version constatée : `d6ecc0d6`, gravité P2 (vérification locale bloquée).
`npm run supabase:verify` lisait `streamer.json` et `live-game.json`, retirés
avec le moteur client. `66f0794` retire ces comparaisons et garde les assertions
SQL serveur. Un appel résiduel à `reglagesPart` a été reproduit puis corrigé
avant commit. Preuve : 1 028 contrôles réussis sur Postgres jetable, code 0.
Contournement inutile après ce correctif ; aucune migration source modifiée.

## Contre-expertise Gemini — corrections locales du 22 octobre 2026

Refresh concurrent et effacement de session sur panne temporaire corrigés avec tests ; bearers inconnus de refresh-live refusés localement, sans déploiement Edge. Focus Compte/Marché/Arène corrigé et vérifié. Export Android local : l'essai de 20 Mio a prouvé une TransactionTooLargeException de l'état Capacitor, corrigée par cache privé et options légères ; sauvegarde réelle, annulation, mauvais format et nettoyage vérifiés sur API 36. Reste une chaîne base64 sur le bridge, donc aucune immunité OOM générale annoncée. Portraits masqués exclus seulement de out/, sources conservées. [Commandes, résultats et limites](corrections-gemini-2026-10-22.md). Publication sensible non autorisée pour ce nouveau lot à ce checkpoint.

## Archives Upscayl et prototype dans chaque export — corrigé localement (D-158, 22 octobre 2026)

Constat de l'audit : 699 WebP (20 Mo) copiés dans `out/creators/upscaled/`, et `out/catalogue-demo.html` exporté. Corrigé : archives déplacées vers `archive/upscaled/`, prototype retiré de `out/` après `next build`. Reste ouvert : les JSON de surcharge citent encore `/creators/upscaled/…`, chemins qui ne sont plus servis (historique seulement).

## Reset de progression — retrait complet préparé, 22 octobre 2026

Malik autorise le retrait complet puis le push sur main. La commande de remise
à zéro avait déjà quitté l’interface dans `42df5b4` ; les exports clients
inutilisés sont maintenant retirés. La migration 0061 ne supprime que la
fonction serveur, sans modifier de données. Suite SQL verte, avec neuf tables
comparées intégralement avant/après et refus des appels anonymes/authentifiés.
Application en production conditionnée à la CI et au workflow Supabase : ne
pas confondre le fichier préparé avec une fonction déjà retirée en production.
Suivi `CreatorDeck-Codex-lzp`.

## Réglages : sortie du focus clavier — corrigé localement, 22 octobre 2026

Version constatée : `42df5b4`. Reproduction Chromium à 1024 px : ouvrir Réglages,
Maj+Tab depuis Fermer ; le focus passe à Objectifs derrière la fenêtre et Échap
ne ferme plus les Réglages. Gravité : accessibilité clavier, P2. Cause prouvée :
focus initial sans confinement ni restauration dans `settings-sheet.tsx`.
Correctif local autorisé par Malik : clavier limité au dialogue supérieur,
contrôles cachés d’Avancé exclus, focus rendu à l’engrenage. Le nouveau test
échoue avant et passe après, bureau et téléphone (2/2). Non publié.
Suivi `CreatorDeck-Codex-052` ; [rapport](verification-navigation-42df5b4.md).

## Tribunal : faux « Retour au Drop » — corrigé localement, 22 octobre 2026

Version constatée : `42df5b4`. Après cinq verdicts depuis Objectifs, le bouton
« Retour au Drop » du bilan conserve Objectifs. Gravité : libellé trompeur, P3.
Cause prouvée : `tribunal-view.tsx` conservait l’ancien texte après changement
du rappel de fermeture dans `creator-deck-app.tsx`. Correctif local autorisé :
« Fermer le bilan », sans changement du retour. Assertion d’écran rouge avant,
verte après. Non publié. Suivi `CreatorDeck-Codex-0i9`.

## Contrôle général E2E cloud — cas réexaminés et verts localement, 22 octobre 2026

Reproduction : `npx playwright test --workers=1 --max-failures=3` dans le checkout local incluant le chantier Imgflip. Résultat : 34 réussis, 3 échecs, 2 ignorés, 183 non exécutés. `booster-selector.spec.ts` attend une réserve Live de 4 et une réserve Mèmes de 4 ; il observe 2 sachets locaux et une réserve Mèmes non chargée. `hourglass-online.spec.ts` rencontre le dialogue Mes chaînes au moment du clic sur le sablier. Cause suspectée : préparation des comptes/RPC factices et timing du nouvel accueil ; pas de cause produit établie. Gravité : contrôle de publication bloquant. Suivi `CreatorDeck-Codex-xxo`.

La fixture commune attendait aussi un dialogue automatique devenu optionnel ; elle ouvre désormais le bouton existant. Les 2 tests Atelier repassent, mais cela ne résout pas les trois échecs ci-dessus. Les 12 parcours ciblés Mèmes/éditeur passent séparément. Ne pas présenter cette validation ciblée comme une suite générale verte. Aucun déploiement du chantier Imgflip à ce stade.

Réexamen du 22 octobre sur `87454815` + préparation Tribunal corrigée : les deux
cas `booster-selector` et le cas `hourglass-online` passent sur bureau et téléphone
dans le run cloud factice de 18/18 scénarios. Le relevé du 21 octobre reste
historique ; aucune correction de l'économie ni validation de l'éditeur Imgflip
déduite de ce nouveau run. Détail du contrôle général dans le checkpoint courant.

## Smoke Android interrompu par QEMU SwiftShader — corrigé localement (19 octobre 2026)

Sur `CreatorDeck_API36`, QEMU disparaissait au lancement de la WebView; ADB
perdait ensuite l’appareil. Les six dumps WER analysés par Claude montraient une
violation d’accès dans le renderer SwiftShader (`libGLESv2.dll`). Avec le
renderer NVIDIA matériel, le smoke passe. Le script détecte SwiftShader et
échoue immédiatement avec une consigne au lieu d’attendre 60 s. Il utilise
également l’API Android de Playwright (CDP ne prend pas en charge cette WebView),
sélectionne celle du PID actif après `install -r`, borne la connexion à 5 s et
augmente la limite de capture de 1 à 64 Mio. L’installation de la baseline
utilise aussi `adb install -r -d` afin qu’un passage répété puisse repartir de
872393 après 872394 sans effacer ses données. Rapports positifs :
`reports/android-smoke/2026-10-19T01-33-05-764Z/result.json` et
`reports/android-smoke/2026-10-19T01-35-58-377Z/result.json`; la relance
répétable par Codex est dans `reports/android-smoke/2026-10-19T01-45-28-650Z/result.json`
et valide 872393→872394, navigation, empreinte de sauvegarde et marqueur privé.
Le fix du script et la configuration AVD sont locaux au moment de ce constat ; le runner
GitHub et un AVD SwiftShader ne sont pas validés. Le marqueur ne représente pas
les données réelles du jeu.

## Une même chaîne peut sortir plusieurs fois dans un booster — corrigé localement, migration 0059 à appliquer (19 octobre 2026)

**19 octobre :** `0059_cercle_une_fois.sql` (automatique, appliquée au push sur `main`) et le miroir
`circleDrawSlots` renvoient au classement les cases du cercle sans absente
inutilisée, dans `open_pack()` et `open_return_gift_pack()`. Contrat :
`src/lib/supabase-cercle-unique.test.ts` ; preuve Postgres
`scripts/verify-circle-once.mjs` : `npm run supabase:verify` 1002/1002 sur
Postgres jetable local (dépendances installées en `--no-save`).

Avec moins de trois chaînes du cercle encore absentes de la collection, 0056
(repris par 0057) complète les trois cases du cercle en répétant ces chaînes ;
avec une seule chaîne nommée, elle peut sortir trois fois. Malik veut au plus
une fois, le reste venant du classement. Cause prouvée : `open_pack()` et son
miroir `circleDrawSlots` (`src/lib/circle-draw.ts`). Correction = migration +
miroir TS ; non faite dans D-150, qui interdisait toute migration. Gravité
produit moyenne. À traiter dans un lot dédié.

## « Mettre à jour » affichait « Mise à jour invalide » — corrigé et publié (18 octobre 2026)

Reproduit sur téléphone avec l'APK `7324c7d` : refus immédiat, sans
téléchargement. Cause prouvée : `PluginCall.getLong("versionCode")` renvoie
null pour un entier JSON lu en `Integer`. Corrigé par D-151 (`5f0a77c`), APK
`5f0a77c` publiée. Contournement pour les APK antérieures : installer une fois
à la main la dernière release de `creatordeck-apk`. Pas encore vérifié sur
appareil.

## Visages minuscules dans un cadre noir — corrigé et publié (18 octobre 2026)

D-148 avait passé le portrait en `object-fit: contain` et un style inline
réglait la Commune à 4 % en écrasant Holo/Gold/Live. Corrigé par D-149 puis
D-150 (`cover`, styles retirés) ; e2e : portrait qui touche les quatre bords.

## Rétention punitive et accueil sans cercle encombré — corrigés et publiés (18 octobre 2026, `2d39f3c`)

Sur la base `3f23ae65`, une absence d'un jour remettait la série à J1, les
récompenses mêlaient trois monnaies et recyclage/Tribunal arrivaient dès J1.
Sans cercle, l'ancien mur Tribunal/Scène/Arène réapparaissait. Gravité produit
moyenne. D-148 : une absence protégée par cycle, booster quotidien J1–J6,
missions avancées à partir de J2 et trois activités repliées dans Objectifs.
Les surfaces sociales sans autre joueur proposent une carte du cercle à
partager ; Last Pack devient consultatif. Tests ciblés et deux parcours
Chrome 390×844 réussis. Migration locale 0057 préparée, pas appliquée ; essai
Postgres bloqué par le compte Windows administrateur. Non publié.

## Réserve vide sans action et cercle rempli automatiquement — corrigés localement (18 octobre 2026)

Sur la base `3f23ae65`, avec réserve vide et cercle, l’action principale était
désactivée (« Recharge en cours »). Le complément des chaînes était proposé
dès zéro choix et un nom incomplet pouvait être remplacé silencieusement par
la première suggestion. Gravité produit moyenne. D-147 : action vers un direct
frais du cercle ou sa rangée, complément limité après trois choix personnels
reconnus, nom inconnu signalé et cinq chaînes réelles distinctes requises.
37 tests d’écrans ciblés et typecheck réussis. Local uniquement, non publié ;
pas de validation téléphone. Sablier conservé dans les détails de réserve.

## La préférée changeait de rareté après sa révélation — corrigé localement (18 octobre 2026)

Sur le code publié `3f23ae65`, les métadonnées de cercle remplaçaient la rareté
de la carte pendant la révélation (cadre, nom, effets et son), mais pas dans
la collection. Gravité produit élevée : une préférée Commune pouvait être
annoncée Légendaire. D-146 : substitution retirée, rareté catalogue unique et
signe de cercle commun. Tests avec une vraie Commune et une ancienne
`displayRarity: legendary`, comparée à son Binder, plus vérification du son.
Correction locale uniquement ; aucun SQL, commit ou déploiement.

## Le cercle disparaissait des tirages après le premier cadeau — corrigé et publié (18 octobre 2026)

Sur `main` `2fa29aaa`, seul le premier cadeau utilise 0054 ; les cadeaux
suivants et Live Drop reviennent au monde, sauf la garantie Légendaire de
0055. Gravité produit élevée : les chaînes choisies n'orientent plus la
collection. Cause vérifiée : restriction au premier cadeau dans l'appelant
et la RPC, absence de règle de complétion dans `open_pack`.

Correction D-145 sur `etape-4-cercle-vrai` : migration 0056 et miroir du moteur,
trois absentes sur cinq, dernière absente, cadeaux serveur à chaque ouverture.
Tests ciblés et typecheck réussis ; preuve PostgreSQL obtenue sur le runner CI
([job SQL](https://github.com/GoodFight37/CreatorDeck/actions/runs/39079182728/job/117532470964)) :
289 contrôles 0056 réussis, dont les tirages successifs et les cinq cadeaux.
Le compte Windows Administrateur reste incompatible avec PostgreSQL local.
0056 appliquée et historique vérifié en Production par le [workflow manuel](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095857620).
Code `0fe66715` publié sur main ; CI main et branche 6/6, 289 contrôles SQL 0056
réussis ; déploiement web `Production` `success` au même SHA. Aucun essai physique.

## Chantier « Mes chaînes » : points ouverts (17 octobre 2026)

- **Cercle seulement sur l'appareil — corrigé dans le code (D-143)** pour un
  compte connecté ; reste vrai pour un joueur sans compte (par choix). Dépend de
  0054 en Production, non vérifiée par Claude.
- **0055 non appliquée :** tant qu'elle ne l'est pas, l'accueil annonce « une de
  tes chaînes » alors que le serveur tire encore la garantie ordinaire.
  Appliquer 0055 avant d'installer l'APK qui l'annonce.
- **360×740 :** la rangée « Ton cercle » passe en partie sous le dock au premier
  écran (relevé de la refonte UI, non corrigé).
- **ESLint sur un poste ayant construit l'APK :** `npx eslint .` lit les
  fichiers Android générés (`android/**/build/**`, `android/app/src/main/assets/**`)
  et signale une erreur qui n'est pas dans le code du jeu. Utiliser les
  `--ignore-pattern` notés dans la passation.

## « Ton cercle » cachait les chaînes en direct — corrigé (17 octobre 2026, D-138)

Les chaînes en direct passaient en tête de la rangée, mais la rangée restait
défilée vers la droite (184 px mesurés à 390×844) : elles étaient hors écran au
premier affichage. La rangée revient maintenant au début quand le direct change.
Test : `src/ecrans-circle-live.test.tsx`, captures `docs/captures/etape-2/`.

## Nom du booster accentué de façon incohérente sur Drop — corrigé (17 octobre 2026)

**Reproduction :** sur l’accueil Drop, le sélecteur affichait `MEMES`, mais le
bouton et la réserve affichaient `Mèmes`. **Gravité :** faible, incohérence de
marque. **Cause :** libellés de l’interface écrits séparément. **Correction :**
les libellés du bouton, de la réserve et du message de réserve séparée reprennent
`MEMES`, selon la décision D-137. La première CI a révélé une attente Playwright
qui utilisait l’ancien libellé ; le test a été aligné et la nouvelle CI est en
cours. Aucun contournement nécessaire.

## Titre long tronqué pendant la révélation d’un booster Mèmes — corrigé et publié

Capture Malik du 16 octobre 2026 : dans les cartes 1/5 et 4/5, le nom est suivi
de « … » alors que la fiche possède un titre complet. Reproduction visuelle sur
capture mobile ; cause prouvée dans `globals.css` : `.card-nameplate h3` impose
`white-space: nowrap`, `overflow: hidden` et `text-overflow: ellipsis`, y
compris dans la révélation. Gravité faible, lisibilité du contenu. Correctif
local ciblé sur `.meme-reveal-front` : titre ajusté à la largeur et retour à la
ligne, sans modifier la carte de collection ou le Binder. Le test de révélation
et les trois shards Playwright ont réussi en CI au commit `3fa0e5c`, inclus dans
`main` (`7c069711`). Aucun essai physique post-correctif n’est réalisé.

## D-129 — le glissement du carrousel ne change pas toujours de booster : corrigé

Retour de Malik sur la Production : le sachet bouge légèrement puis revient sans sélectionner l’autre univers. Reproduit avec un événement tactile Playwright. Le `lostpointercapture` d’un bouton enfant remontait au carrousel et terminait le geste avant le relâchement; le seuil tactile de 45 px aggravait le cas des petits glissements. Correction : ignorer la perte de capture d’un descendant, capturer au stage, reconnaître les gestes tactiles courts et faire basculer les deux univers dans les deux sens. Test Playwright téléphone avec Edge installé : swipe tactile gauche→droite et droite→gauche, clavier et boutons, sans préparation ni RPC de tirage. Le test a réussi 1/1 au SHA local `2b2eea7b` + diff courant. Ressenti sur téléphone physique à confirmer.

## D-129 — lecture Mèmes refusée après un tirage confirmé : corrigé et publié

Constat du 16 octobre 2026 sur la logique de `meme-deck.tsx` de `88daf0cd` : après `open_meme_pack`, l’ancienne implémentation attendait aussi `meme_status` avant de préparer la révélation. Si cette seconde lecture échouait, le catch fermait la scène malgré un tirage serveur déjà confirmé. Gravité moyenne : résultat invisible jusqu’au rejeu idempotent, sans perte de cartes démontrée. Reproduction ciblée : RPC de tirage valide puis rejet de la lecture de réserve. Le contrôleur partagé de D-129 conserve immédiatement les cinq cartes et la réserve confirmée pour les révéler ; une erreur de lecture permet de réessayer seulement la lecture. Test `ecrans-meme-booster.test.tsx` réussi. Correction incluse dans le lot D-129 publié sur `main`; aucune nouvelle erreur de production alléguée.

Le même contrôleur écarte les réponses d’un ancien compte et les lectures de réserve démarrées avant un tirage ; le changement de compte pendant une requête est couvert en DOM. Retour avant déchirure ne lance aucun tirage ; après engagement, quitter l’attente laisse la requête terminer. La validation tactile réelle reste à faire par Malik.

## Booster Mèmes sans rituel tactile — corrigé et publié dans D-126

Sur `52b3738a`, ouvrir un booster Mèmes affichait un dialogue statique : aucun peel, aucune sortie des cinq dos, un bouton « RÉVÉLER » par carte. Les captures du joueur du 16 octobre 2026 montrent le décalage avec le Drop principal. Gravité moyenne : le tirage fonctionnait mais la sensation de jeu demandée manquait. D-126 réutilise `PackTear` avec un visuel Mèmes et ajoute flip automatique, glissement et récap tenu 1,5 s. Un scénario Playwright mobile avec RPC simulés vérifie le geste et les cinq cartes ; déploiement Vercel et parcours connecté réel réussis ; ressenti physique à confirmer. Aucun défaut de taux ou perte de carte observé.

## Tutoriel derrière « Mon compte » après création invitée — corrigé dans D-121

Sur `67385de2`, ouvrir « Mon compte », créer un compte invité, puis attendre la réponse d’onboarding pouvait superposer le tutoriel à la feuille de compte. La feuille restait devant, mais le tutoriel interceptait ensuite les appuis destinés à Toi. Gravité moyenne : parcours d’entrée confus, sans perte de cartes démontrée. D-121 attend la fermeture de la présentation courante avant de montrer le tutoriel, et termine sur Drop. Publié dans `6a1c0069` : test DOM ciblé 1/1, écrans 182/182, CI 6/6 et Vercel Production `READY`. Le 16 octobre, le parcours invité réel sur `creator-deckk.vercel.app` a réussi dans Chromium mobile 390 × 844 : aucune superposition, retour au Drop, zéro exception JavaScript. Le ressenti sur écran tactile physique reste distinct.

## Lot 05 IA Studio — défauts sociaux corrigés dans D-119

Sur `39d17e55`, Amis et Hôtel des ventes pouvaient rester en chargement après création d’un compte invité dans la feuille, et Last Pack avait le même effet de montage. Les variantes d’un ancien partenaire pouvaient apparaître après un changement rapide, et une proposition d’échange pouvait être renvoyée pendant sa première soumission. Gravité : haute pour le chargement, moyenne pour les deux échanges. Le signalement de la carte 0 est réfuté : SQL numérote les cartes de 1 à 5 et refuse 0. La feuille Wishlist dépendait de la lecture effectuée par Toi et pouvait montrer une valeur ancienne à sa réouverture. D-119 corrige les conditions et synchronisations d’écran, invalide les réponses tardives et verrouille l’envoi jusqu’à sa réponse. Scénarios DOM dans la passation ; [parcours réel sur Vercel](verification-sociale-vercel-2026-10-15.md) réussi pour l’amitié, la Wishlist, une offre et son acceptation avec transfert des cartes. La transition invité → connecté **dans** ces feuilles reste seulement vérifiée en DOM, faute d’entrée non connectée dans la navigation courante.

## Vocabulaire Échanges qui rendait la CI rouge — corrigé dans D-118

Sur `3fff40cf` et plusieurs commits précédents, le panneau Échanges montrait
« serveur » dans l’aide du radar. Le test de jargon et deux assertions de
l’écran Compte lié échouaient ; le reste de la CI qualité passait. Une autre
aide visible employait aussi « cloud » et « serveur ». D-118 reformule ces
phrases sans changer le fonctionnement des échanges et conserve les contrôles
de rédaction. Unitaires 1 186/1 186, écrans 174/174 et CI
`38783488533` verte (6/6 jobs) ; détails dans la passation courante.

## Sachet Drop : clignotement après pression, idle et ombre — corrigé dans D-117

Sur `d7a9de45`, l’entrée CSS était retirée sous `:active` puis redémarrait au
relâchement ; l’idle débutait après un délai sans son état initial. Le bouton
du sachet était désactivé quand le stock rechargeable était vide même si un
booster de test était disponible, et l’ombre conservait un décalage de padding
sur certains écrans courts. Le correctif D-117 sépare l’entrée de `transform`,
applique l’état initial de l’idle, partage la condition d’ouverture et lie
l’ombre au padding du stage. Contrôles ciblés dans le checkpoint courant.
Le ressenti sur téléphone réel reste une appréciation distincte.

## Deuxième bilan IA Studio — D-113

Revue des constats sur l’architecture de `7be3914b` : le risque `inert` est
un faux positif dans les usages actuels, car les dialogues concernés sont
portalisés hors de `.app-shell`. Le retour pendant le tirage, le réalignement
des marqueurs tutoriel au changement de compte, la lecture prématurée du
snapshot Last Pack et la description ARIA ont été corrigés. La preuve, les
tests et les limites sont dans la [revue D-113](revue-ia-studio-architecture-2026-10-15.md)
et le checkpoint de la passation. Le ressenti du bouton matériel Android,
le compte connecté et le lecteur d’écran physique restent à valider en usage.

## Compteurs et focus du prototype — D-112 corrigé et publié

Constats IA Studio sur `7be3914b` : compteurs nommés sans rôle adapté,
classement démo défilant sans déplacer le focus et barre de niveau pouvant
recevoir une largeur négative avec un import niveau/XP incohérent. Impact
accessibilité/affichage ; aucune corruption de progression démontrée.
Rôles de groupe, focus explicite et borne 0–100 ajoutés. Clavier 2/2 et rendus
ponctuels passent. Code `b97d706f`, Vercel `success`, compteurs/focus vérifiés
sur la production à 390 × 844. Deux autres alertes étaient des faux positifs ;
voir la [revue détaillée](revue-ia-studio-2026-10-15.md).

## Vérifications navigateur rouges après les lots UI — D-111 publiée

Sur `b8b0b248`, les trois shards E2E échouent. Reproduction locale de plusieurs
attentes périmées : reflet attendu à 5 s au lieu de 4 s, sondes Web Audio qui
écoutent `setTargetAtTime` alors que le fondu existant utilise
`linearRampToValueAtTime`, tests réglages/crédits qui n’ouvrent pas le volet
Réglages de D-101. Un survol à une coordonnée fixe du classeur est parfois
intercepté par sa barre d’outils. La hauteur du journal a aussi été lue
à son ancienne valeur après redimensionnement mobile ; mise à jour de rendu
différée suspectée, mesure immédiate et non réessayable. Gravité : les contrôles ne distinguent plus
une régression réelle d’un ancien scénario ; aucune panne de jeu déduite.

Correction D-111 : attentes alignées sur les décisions déjà livrées, cibles
réelles et clic explicite des volets ; rapports GitHub/JSON et contrôles
qualité indépendants. Le contrôle vocabulaire Trades reste en échec et actif,
son texte est hors périmètre de ce lot. 18 vérifications ciblées réussies après correction (14 scénarios uniques) ;
publiées au commit `6cbb3926`, Vercel `success`. Les trois shards navigateur de ce SHA sont verts. Sa CI qualité a exposé
trois assertions DOM anciennes (Objectifs et aperçu Live), corrigées dans
le complément : 25/25 ciblés. Deux échecs DOM et le test/scan de vocabulaire
restent liés au texte Trades exclu. [Rapport D-111](verification-d111.md).

## Objectifs — faux succès groupé et doubles commandes, corrigés (15 octobre 2026)

Sur `51323720`, handleClaimSeason absorbait un refus en affichant une erreur
puis renvoyait void. Le groupe poursuivait et annonçait autant de familles que
prévu, même refusées ; les jalons n'étaient pas compris dans Tout réclamer.
D-103 fait remonter le statut, bloque les autres commandes pendant la demande,
arrête le groupe au refus et restitue les réponses reçues. Les jalons existants
sont inclus. Delta nul = message déjà payé ; emblème constaté après versement.
Aucune règle ni caisse modifiée. DOM 10/10, notes 8/8, trois parcours navigateur
uniques passent, dont soldes locaux exacts après double activation/rechargement.
Limite : refus et partiels simulés ; pas de réclamation d'un compte réel en
Production, ni détail des RPC internes des paliers dans le bilan UI.
Code `5f96ab58`, Vercel Production `READY` / `success`. Navigation, quotidien,
saisons/paliers/pagination et nouvelle note contrôlés à 320/390 px, sans
erreur JavaScript observée ni réclamation réelle. Détails au checkpoint.

## Nouveautés — historique joueur ajouté (14 octobre 2026)

Base `bf0dcbab` : les changements récents n'avaient pas de journal destiné aux
joueurs. D-102 ajoute historique/détail/non-lu dans Toi et la consigne d’ajout
à chaque livraison visible, sans popup ni nouveau système de notifications
serveur. **Limite assumée :** lecture locale au navigateur, pas au compte ;
un autre appareil ou un effacement du stockage peut montrer les mêmes notes
non lues. Stockage refusé : lecture conservée pour la session, avec message,
sans bloquer l’historique. Les conflits simultanés entre onglets n’ont pas de
garantie atomique ; aucune donnée de jeu n’est écrite par le journal.
Logique 8/8, DOM 21/21, quatre parcours navigateur et build/statique réussis.
Code `3fe32e8d`, Vercel Production `READY` / `success` : sept notes, lecture,
rechargement, badge/focus et largeurs 320/390 contrôlés. Détails au checkpoint.

## Toi — objectifs masqués et vitrine non consultable, corrigés (14 octobre 2026)

Base `ae8dfacd` : les objectifs/Tribunal étaient repliés dans les fonctionnalités
en ligne malgré leur utilité locale ; vitrine sans inspection ni noms complets
externes. Un slug répété dans les épinglées pouvait occuper plusieurs places.
Défauts UX, sans corruption de cartes démontrée. D-101 conserve la sélection
existante mais déduplique et rend les cartes consultables avec leurs variantes
réelles. Parcours XP/collection/objectifs visible ; réglages et reset regroupés,
statut du compte et erreurs affichés sans prétendre synchroniser.
Preuves : 18/18 DOM, cinq scénarios navigateur uniques après correction du
serveur cible et d'un titre de test. Code `261625f5`, Vercel Production `READY`
/ `success` ; parcours invité Toi → Progression et réglages contrôlés à 320/390 px.
Détails au checkpoint ; pas de compte réel modifié pour tester les variantes.
Le ressenti tactile et les opérations de sauvegarde réelles ne sont pas
certifiés par les mocks ou les mesures Chromium.

## Atelier — dépense immédiate et résultat trop fugitif, corrigés (14 octobre 2026)

Sur la base `f9cee11f`, un clic sur le prix déclenchait immédiatement le craft ;
le recyclage groupé ne demandait aucun bilan avant départ et le succès était
une notification seulement. Défaut UX, pas une corruption de solde démontrée.
D-100 : présentation avec aperçu/confirmation, verrou commun anti-double clic,
refus et exception visibles, résultat persistant et delta réel du hook ; le
bilan partiel groupé n'est pas transformé en succès intégral. Live exclus du
groupé et dernière copie restent protégés. Tests DOM 14/14 et trois scénarios
navigateur uniques réussis. Code `88d5cfa1`, Vercel Production `READY` /
`success` ; parcours invité contrôlé à 320/390 px (aperçu, solde insuffisant,
focus, recyclage vide). Détails au checkpoint courant.
Limite : transactions serveur réelles non dépensées en production ; les cas
refus/partiel sont simulés et le parcours complet fonctionne dans le moteur
local. Le ressenti sur appareil n'est pas certifié par Chromium.

## Binder — compteur de variante trompeur corrigé, lot complet livré

Sur `2f15ea60`, le Binder agrège le nombre de copies et choisit la meilleure
variante ; sa fiche dit ensuite « copies dans cette variante » avec le total.
Avec deux Standard et une Gold, cela attribue trois copies à Gold à tort.
D-099 sépare quantités réelles par variante et total, avec consultation des
variantes déjà possédées. Aucun stock ni solde changé. Les matières, dos,
pochettes et fiche font partie du même lot, avec OFF/réduit et accessibilité.
Publié à `7d127c0f`, Vercel `READY` / `success`. DOM 31/31, cas navigateur
matières/variantes/focus 5/5, feuilletage retesté après correction d'un test de
timing, types/lint/build réussis. Site invité parcouru à 320/390 px ; quantités
possédées contrôlées dans les fixtures locales, aucun compte modifié.
Preuves détaillées : checkpoint courant. La sensation tactile
reste ouverte ; ne pas la confondre avec les résultats navigateur.

## Binder — noms tronqués et feuilletage peu lisible, corrigés et déployés

Observation sur `2e3c4396`, 390 × 844 : nom long tronqué (JuanSGuarnizo),
libellés de région sur plusieurs lignes couvrant une part du petit portrait ;
le tour de page est une translation de 8 px/180 ms. Défaut UX de lisibilité,
pas une perte de cartes. Correction D-098 : étiquettes complètes sous
pochettes, région retirée des vignettes Binder, feuille directionnelle et geste
horizontal sans capter le scroll vertical. Une seule feuille de 12 cartes,
aucune règle de possession modifiée. Tests/publication : checkpoint courant.
DOM 29/29, E2E Binder mobile 7/7 + 3/3, TypeScript, ESLint et build passent.
Publié à `da48f70c`, Vercel `READY` / `success`. En Production, parcours invité
Toutes vérifié : 12 dos/page, flèches, verrou, swipe, retour et tap, nom long
sans débordement à 320/390 px. Possession vérifiée dans les fixtures locales.
Le ressenti physique n'est pas déduit des tests.

## Récapitulatif trop bref — corrigé dans D-108, 15 octobre 2026

Sur main avant D-108, toutes les ouvertures séquentielles et le Perfect
affichaient bien les cinq tirages, mais le retour était déverrouillé après
650 ms (et immédiatement avec les effets coupés). Gravité UX modérée :
le résultat pouvait être fermé avant sa lecture. La garde est désormais de
1 500 ms pour tous les modes, sans fermeture automatique. Vérification DOM
31/31 ciblée et déploiement Vercel `success` sur `36490080` ; détails et
limite CI dans la passation. Le ressenti tactile du peel reste
ouvert et distinct.

## Rituel trop sec — corrigé, déployé et vérifié sur Vercel, 14 octobre 2026

Reproduction sur `283f4086` : ouvrir un booster, relâcher une coupe suffisante ;
le timer JS passe aux faces après 720 ms alors que la montée CSS prend 920 ms.
Les rares partagent le flip de la commune et les SFX de la cinquième carte
n'incluent pas sa pose supplémentaire. Gravité UX : le parcours fonctionne mais
le rythme et la lisibilité des cinq dos sont insuffisants.
Correction : JS/CSS à 1,2 s, dos en éventail puis posés, pause à l'impact rare
et lumière/SFX synchronisés, résumé mobile 3 + 2 avec noms lisibles, sans sachet derrière. Retour verrouillé
pendant la pose des cinq cartes (650 ms si effets ON), puis action du joueur. Seuils
anti-tap et verrou des avances conservés. Consignes courtes et résistance
progressive du rabat. Validation/publication dans le checkpoint courant.
Publié sur `main` à `aabd4169` ; Vercel `READY` / `success`. Le tutoriel
Production à 390 × 844 confirme les cinq dos à 1 s, le reveal à 1209,6 ms,
les cinq cartes et le résumé sans débordement. Aucun compte ni tirage consommé.
Une première passe Chromium a détecté une priorité CSS qui gardait le nom de
l'animation rare en mouvement réduit : règle désormais limitée aux effets ON
et `prefers-reduced-motion: no-preference`. Les retests OFF/réduit passent.
Le ressenti physique du peel reste ouvert ; pas de correction tactile déclarée
sur la seule base des tests.

## Sachet encore perçu comme plat après D-109 — correction D-110 publiée

Retour joueur : le pack reste trop proche d’une affiche malgré la scène.
Cause visuelle observée : mouvement surtout vertical et ombre très diffuse.
D-110 ajoute une oscillation X/Y lisible, un bevel foil renforcé et deux
ombres séparées. Publié sur Vercel au commit `b8b0b248` ; animation
observée dans le navigateur de production à 390 × 844 ; ressenti physique ouvert.

## Accueil Drop encore trop plat et administratif — correction D-109 publiée

Malik rapporte que, malgré D-094/D-096, le premier viewport à 390 × 844
garde un pack qui paraît être un PNG sur fond noir et un ticket crème dominant.
Gravité UX : l’action fonctionne, mais l’écran ne donne pas l’impression d’une
scène de jeu. Capture locale avant D-109 reproduite ; scène chaude, profondeur
CSS, CTA sans ticket et infos secondaires repliées publiés sur Vercel au commit
`bdb0dffb`. Capture de la production 390 × 844 inspectée ; appréciation
tactile réelle ouverte.

## Drop trop plat et ticket trop formulaire — cause corrigée et déployée

Malik rapporte que l'accueil donne un visuel d'illustration plate : faces du
sachet peu lisibles, hint long, label inerte et ticket crème administratif.
La capture Vercel 390 × 844 a confirmé que le flanc restait trop discret. Cause
prouvée : les plans CSS 3D gauche/droit étaient tournés dans le sens inverse du
tilt et masqués derrière la face. Une correction locale tourne ces plans vers
la caméra, les épaissit à 20 px, renforce le sheen, et regroupe les secondaires
du tutoriel sous « Plus d’infos ». Taille, nom du pack, CTA, scroll et
hiérarchie restent en place. Validation locale : écrans 14/14, E2E mobile 4/4,
typecheck, ESLint et diff-check réussis. Publié à `08785e43`; le déploiement
Vercel est `READY` / `success`. Chromium en production à 390 × 844 confirme le
flanc foil visible (14,4 px), le bouton « Essayer », le volet secondaire fermé,
et aucune largeur de document supérieure à 390 px. Cause technique fermée; la
préférence esthétique générale reste subjective.

## Piste bourdonnante et double appui qui saute une révélation — corrigés localement, 14 octobre 2026

Le prototype de 24 s a été remplacé par `springly_sprigs` (asset CC0 fourni par
Malik, 142 s), réencodé mono 24 kHz/48 kbit/s. Les gains initiaux hub `0,32` et
pack/reveal `0,16` ont depuis été abaissés au quart (`0,08` et `0,04`) après le
retour de volume trop fort. Le choix de piste reste provisoire.

Le bouton « Carte suivante » est désormais désactivé jusqu'à la fin du flip et
les appuis pendant l'animation ne sont plus mis en file. Cela supprime la chaîne
où un appui en attente avançait juste après le flip et où le tap suivant pouvait
consommer la carte qui venait d'apparaître. Le raccourci explicite « Révéler les
cinq cartes d'un coup » est conservé. 22 tests audio, 33 tests d'écrans ciblés,
typecheck et ESLint ciblé passent localement. Le serveur Playwright local n'a pas
démarré, mais la CI GitHub [`38613807945`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38613807945)
a réussi : unitaires 1 171/1 171, écrans 130/130, E2E 105/105 (dont le test de
double appui), migrations, cloud simulé et build. Le check Vercel de ce commit
est `success` ; l'API détaillée Vercel répond 403, donc son état `READY` ne peut
pas être affirmé indépendamment ici. L'écoute sur téléphone et le choix musical
final restent ouverts.

Après le retour « beaucoup trop forte » et « musique dès le lancement du jeu » :
gain abaissé au quart (`0,08` au hub, `0,04` durant booster/reveal). La musique
démarre maintenant au bouton de fin du tutoriel, ou au premier geste après
chargement pour un joueur de retour ; l'ouverture du booster ne la démarre plus.
Validation ciblée : tests audio 22/22, typecheck et ESLint touché réussis. Le test
Playwright du moment de démarrage est actualisé, mais la suite E2E complète n'a
pas été relancée pour cette révision courte.

## Musique sans fondu au démarrage/reprise — corrigé localement, 14 octobre 2026

Le MP3 est maintenant préchargé au montage, sans créer de lecteur ni démarrer
avant le geste exigé par le navigateur. La boucle démarre avec un fondu de 1,4 s
et un raccord pré-mélangé sur 1,2 s. Le mute baisse le gain en 0,35 s sans
arrêter la source ; la réactivation remonte en 1,4 s au même point de lecture.
Les sons de pioche et retournement montent respectivement de 4 dB et 1,4 dB,
sans changer les autres cibles ni la borne de crête globale. Tests audio/SFX
23/23, typecheck, ESLint ciblé et génération de la table des niveaux passent.
Le comportement acoustique et le raccord de boucle restent à écouter sur
Vercel ; aucune suite Playwright n'a été lancée pour ce changement.

## Audit du démarrage musical et des tailles Drop — corrigé et publié, 14 octobre 2026

À la base `d19471fe89b8e7ecda21fc7cce53f6ddeab4d683`, le montage préchargeait
les SFX et créait donc un `AudioContext` avant toute interaction. Le gestionnaire
global démarrait alors la musique au premier contrôle, y compris des actions
qui ne sont pas le début du jeu. `PackTear` pilotait en parallèle le même moteur
et rétablissait le hub au démontage, même si le propriétaire d'écran demandait
une autre scène. Le correctif local réserve le démarrage à l'ouverture réelle,
centralise les transitions dans l'app, bloque la source si mute est activé
pendant le chargement et recrée une unique source au redémarrage. Tests ciblés
E2E téléphone 7/7 et unitaires SFX 22/22. Les deux premiers runs CI ont révélé
une attente de taille trop stricte et des snapshots de pochette déchirée périmés.
Les critères et captures ont été corrigés puis vérifiés sur GitHub Actions
`38610672014` (6/6 jobs verts).

Sur les petits viewports, des media queries CSS réduisaient la taille du booster
en 52/48/44vw, tandis qu'une règle concurrente la réimposait plus tard depuis
`drop-craft.css`. Ces règles sont supprimées pour garder la taille commune
`min(58vw, 220px, 34dvh)` ; en écran court, les CTA sont accessibles par scroll.
E2E Drop mobile compact et 390 × 844 réussis. Aucun artefact latéral net n'est
apparu dans la capture Chromium, mais biseaux et rendu réel restent à confirmer
sur téléphone. Correctif audio, critères et snapshots publiés sur `main` aux
commits `ab740821`, `823cdfb8` et `348ec694`. Suite CI complète : unitaires
1 171/1 171, écrans 130/130, E2E 103 réussis/11 scénarios cloud conditionnels
ignorés, typecheck, ESLint, build, cloud simulé et migrations SQL réussis. La
suite unitaire locale avait 17 erreurs d'environnement (11 appels Git `EPERM`,
6 sorties de processus seed vides) ; le build local turbopack/Webpack était
aussi bloqué par le runner, sans reproduire ces limites en CI. Vercel Production
`READY` sur `348ec694`. La lecture du site par le connecteur répond 403 ; aucun
contrôle navigateur distant n'est revendiqué.

## Geste du peel encore perfectible après amélioration partielle — ouvert, 14 octobre 2026

Sur l'ancienne version `eb12a1b`, le haut du sachet restait linéaire et un swipe
franc ne l'ouvrait pas de façon fiable. Le correctif publié au SHA
`3fec7895fae6bbed0eb05bf4baa6e246f55fefdc` garde le tracé chronologique X/Y,
la bande Y 6–26 %, une couverture de 64 %, l'effort minimal `0,22`, le suivi du
rabat et l'ouverture au relâchement ; les cartes s'extraient automatiquement.
Lors du retest du pack tutoriel sur Vercel, Malik rapporte que l'ouverture se
fait normalement, mais que le geste n'est pas parfait. Aucun défaut précis
supplémentaire n'est décrit. Statut : amélioration partielle, ressenti encore
ouvert ; ne pas clore sur la seule base des tests. CI du code
`38573481379` verte (6/6), E2E 49 réussis/1 scénario cloud ignoré. Le déploiement
Production actuel `99fc67ca` ne change que la documentation ; le code servi est
toujours `3fec7895`.

## Coupe partielle qui ouvrait tout le rabat ou laissait une trace — corrigé et publié, 14 octobre 2026

Reproduction : sur l'écran d'ouverture, tirer fortement une petite portion de
la soudure puis relâcher ; selon l'amplitude verticale, le rabat entier pouvait
s'ouvrir. Un geste trop court pouvait aussi laisser le tracé et le bord coupé
visibles. Cause dans `pack-tear.tsx` : l'ouverture mesurait surtout l'effort
combiné sans longueur minimale de coupe, alors que `finish()` anime tout le
rabat ; `retract()` remettait le progrès à zéro mais gardait `trace`. Correctif
publié : exiger 88 % de couverture de la zone tactile réelle et l'effort
minimal, vider le tracé/contour incomplet au relâchement et animer le retour.
SHA `8619f461792bc55f77aab826907e4025f866f097` vérifié sur `main` ; Vercel
Production READY. E2E bureau/téléphone simulé 47 réussis, 1 scénario cloud
conditionnel ignoré. La CI `38569239104` a échoué sur une ancienne assertion
du banc Toi qui interdisait le texte de version déjà affiché. Test corrigé au
commit `13f471e5` ; `npm run ecrans` passe 130/130 en local et CI de reprise
`38569853793` passe 6/6. Aucun essai physique revendiqué.

## Tracé dentelé et trop blanc pendant le peel — corrigé, 14 octobre 2026

La vidéo/capture montre des zigzags quand le doigt repart en arrière et un
halo blanc trop intense. La coupe était reconstruite depuis le dernier Y de
chaque tranche X, puis les tranches étaient triées ; le chemin temporel se
transformait donc en dentelures. Le contour est maintenant médian/lissé et
cantonné à la bande de soudure. Le déplacement vers le bas sur l’illustration
ne le déforme pas ; le soulèvement requis reste pris en compte. Trait champagne
et halo rose assourdis. Code `0c4c7b9f`, CI check Vercel success et production
READY. E2E du peel : 45 réussis, 1 scénario cloud ignoré ; pas d’essai physique.

## Peel trop court et figé trop tôt — corrigé, 14 octobre 2026

Après le correctif anti-casse, l'ouverture s'armait à `span >= 38` même si la
forme de la fente n'était pas assez ouverte, puis cessait tout suivi du doigt
tant qu'il restait posé. En outre, conserver le premier point de chaque X
empêchait les retours en Y de guider la coupe. Cela rendait le geste court,
rigide et proche d'un rail. Le seuil dépend maintenant de la surface ouverte
(X, Y et soulèvement) ; après armement, la fente et le rabat continuent de
suivre le doigt jusqu'au relâchement. Un profil à Y courant, trié par X, garde
une silhouette de coupe unique pendant les va-et-vient. L'ouverture reste au
relâchement ; cancel replie. Commit `abcd2d0a` poussé sur `main`. E2E peel :
45 réussis, 1 scénario cloud ignoré ; typecheck, ESLint ciblé et build statique
passent. La CI `38563130307` et le déploiement Vercel du commit étaient en
cours au dernier relevé. Validation sur téléphone réel à faire.

## Fente du booster invisible pendant le geste — corrigée, 14 octobre 2026

La vidéo de Malik montre l'état « Relâche pour ouvrir » alors que le sachet
semble intact, puis les cartes sortent sans coupe visible. Cause confirmée dans
le code : le tracé était passé d'une barre HTML à une `polyline` SVG, mais
gardait le style HTML (`background`, dimensions et pseudo-élément) ; aucun
`stroke` SVG ne dessinait réellement la trajectoire. Le seuil et la coupe
calculée continuaient de fonctionner, ce qui explique que l'ouverture se
lance mais que le doigt ne laisse plus de trace visible. Correction locale :
SVG positionné sur toute la pochette, trait clair + halo violet/rose, avec
assertion E2E sur le contour calculé. Commit `269ec4d7` sur `main`. E2E ouverture :
45 réussis et un scénario cloud conditionnel ignoré ; typecheck, ESLint ciblé,
build statique et `git diff --check` réussis. Poussé sur `main` dans le SHA
`c2277ac5` ; Vercel Production `READY`, CI GitHub `38561091030` en cours au
dernier relevé. Le rendu sur téléphone physique reste à confirmer.

## Assertion E2E de réglage audio obsolète — corrigée, CI relancée, 14 octobre 2026

La CI `38499177407` a échoué sur le test `product-audit.spec.ts` téléphone :
il cherchait encore un interrupteur accessible nommé exactement « Son », que
le changement a renommé « Son de l’application ». Le test couvre maintenant
les deux nouveaux réglages, leur indépendance, le choix par défaut et la
persistance. Vérification locale : deux E2E réussis, un scénario cloud ignoré
faute de configuration. Correctif de test publié sur `main` au SHA
`28af5919f1565e9867db13fe4d6f9e7032607c7c` ; CI relancée sous le run
`38499499108`, en attente/en cours au dernier relevé. Aucun défaut applicatif
n'est indiqué par cet échec.

## Historique — nappe du hub trop abstraite, 14 octobre 2026

Malik entend la piste actuelle comme un son plutôt qu'une musique. Le fichier
est bien une nappe synthétique prototype de 24 secondes, sans rythme ni
percussion ; ce comportement est conforme à sa composition, mais ne donne pas
au hub l'identité musicale souhaitée. Une sélection de quatre pistes de
synthwave/electronica est préparée dans [audio-assets.md](audio-assets.md), avec
licences d'utilisation dans un jeu et crédit requis. Aucune candidate n'est
intégrée avant le choix du joueur. Les réglages publiés séparent désormais
« Son de l’application » de « Musique » et retirent les niveaux de volume ;
le changement est sur `main` (`ee62de9e`) et Vercel Production est READY. Le test
écoute sur téléphone et la sélection d'une piste restent à faire.

## Historique — pulsation « tac-tac » de la musique du hub, 14 octobre 2026

Malik entendait une pulsation ressemblant à des coups, toutes les ~0,5–1 s.
Le fichier était bien servi par Vercel et identique à celui du dépôt : le motif
était dans la composition d'origine, pas dans le code qui boucle la piste (24 s)
ni dans l'hébergement. Le prototype a été remplacé par une nappe synthétique
continue, sans percussion. Le volume, le mute et les changements de scène sont
inchangés. Tests ciblés, suite projet, build et E2E audio réussis. Publié sur
`main` au SHA `67a9319452e27cb792032584e28448a6c6cc7fe7`, CI
[`38497830790`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38497830790)
verte (6/6), Vercel Production READY ; hash du MP3 distant identique à l'asset
publié. Écoute sur téléphone réel non effectuée. Voir [D-086](decisions.md) et
[audio-assets.md](audio-assets.md).

## Historique — BGM du hub trop basse sur téléphone, 14 octobre 2026

La boucle existait et était demandée au premier geste, mais son niveau source
est `-26,4 LUFS`. Le gain de scène `0,24` était suivi d'une double application
du volume Normal `0,75` (canal musical puis bus partagé), soit environ
`-43,8 LUFS`. Le correctif local porte le gain de scène à `0,9` et laisse le
volume global agir une seule fois sur le bus : environ `-29,8 LUFS` au niveau
Normal, crête estimée à `-14,1 dBFS`. Le ducking pack (`0,018`), le silence du
Tribunal et les réglages du joueur restent inchangés. Tests locaux : `npm test`
1 169/1 169, `npm run ecrans` 129/129, E2E audio bureau/téléphone 2/2,
typecheck, ESLint ciblé, build statique cloudless et `git diff --check` réussis.
Publié sur `main` au SHA `861870ee66054646b3215bb360ca48b74ab1ff01`. CI GitHub
[`38496749379`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38496749379)
verte, 6/6 jobs ; Vercel Production `READY`. Écoute sur téléphone réel toujours
requise pour juger le rendu acoustique. Détails dans [audio-assets.md](audio-assets.md)
et D-085.

## Va-et-vient pendant le peel — corrigé et publié, 14 octobre 2026

Malik a reproduit une coupe visuellement cassée en gardant le doigt posé et en
faisant plusieurs allers-retours. Cause probable confirmée dans le composant :
le dernier échantillon d'une portion X remplaçait le premier dans la silhouette,
et le tracé SVG réutilisait toute la trajectoire chronologique, y compris ses
retours. Le premier échantillon de chaque portion est maintenant conservé ; dès
que le seuil arme l'ouverture, toute la scène reste stable jusqu'au relâchement.
Le booster ne s'ouvre toujours pas avant pointerUp. Annulation/perte de capture
replient sans ouvrir. Vérification locale : `e2e/pack-tear.spec.ts` 43 réussis,
un scénario conditionnel ignoré ; écrans 129/129, typecheck, ESLint ciblé et
`git diff --check` réussis. Publié au SHA
`b6a3605ce8b77e41244f4fef9f8e9300fd7ec634` ; CI GitHub `38494377386` verte
(6/6), Vercel Production `READY`. Avis sur téléphone physique encore attendu.

## Missions du booster non conservées au retour cloud — corrigé sur `main`, 14 octobre 2026

Après le passage à une synchronisation où le cloud fait foi, la première CI de
`c5ac85c6` a signalé deux variantes du scénario « tirage serveur puis
rechargement ». Cause : le serveur avait bien enregistré les cinq cartes, mais
les compteurs de missions du tirage restaient uniquement dans la sauvegarde
locale et étaient écartés lors de la reprise cloud. `openPack()` enregistre
maintenant l'état fusionné après relecture serveur avec un push normal, sans
forçage ; les cartes gardent leurs identifiants serveur. Le scénario cloud E2E
est vert en local sur bureau et téléphone simulé (2/2), ainsi que les suites
complètes unitaires (1 168) et écrans (128). Correctif publié au SHA
`fc5b47ff0793e8ff273dfccd381f50b158bd4fa4`. La CI a signalé deux types
implicites dans les assertions ; correction typée publiée dans `c3ab397e`.
Vercel est READY pour ce SHA ; CI GitHub `38488559202` verte, 6/6 jobs. Aucun
compte réel ni donnée de production testé.

## Ancien visuel du sachet et musique absente au hub — corrigé et publié, 13 octobre 2026

Sur l’accueil Drop, la façade restait `live-foil.svg`, tandis que la scène de
déchirure utilisait déjà `live-opening.svg` : le nouveau sachet n’était donc pas
visible avant le tap d’ouverture. La BGM, elle, ne démarrait qu’au démarrage
d’un tirage ; un joueur avec une réserve vide pouvait rester au hub sans son,
même avec Son activé. Le correctif aligne l’image d’accueil sur celle de
l’ouverture et lance la boucle au premier appui explicite sur un contrôle, ce
qui reste compatible avec le blocage d’autoplay mobile. Il ne déclenche pas de
bruitage de navigation. Publié au SHA `8bf36ba0` ; déploiement Vercel réussi et
CI `38485767846` verte (6/6). Le premier run `38485191463` avait échoué sur deux
attentes Playwright, corrigées sans retirer d’assertion. Suites locales :
1 168 tests unitaires, 127 tests d’écran, typecheck, lint ciblé et build réussis.
Une écoute physique reste nécessaire pour confirmer le niveau perçu.

## Attentes E2E devenues obsolètes — corrigées et publiées, 13 octobre 2026

Le run `38477480148` sur `00b22d4b` a échoué sur trois attentes de tests : nom
du bouton d’avancement du reveal, panneau « Fonctionnalités en ligne » replié,
et portraits testés depuis la mauvaise vue initiale du Binder. Les assertions
ont été adaptées sans retirer de couverture ; le chargement réel des portraits
continue d’être vérifié. Lint et suite E2E complète locaux : 89 passés, 11
scénarios cloud ignorés, zéro échec ; cadeau cloud simulé : 2/2. Correctif
publié `754bde21` ; CI `38480069643` verte, 6/6 jobs.

## Couche audio et hiérarchie de jeu — publiée, CI verte, 13 octobre 2026

La première boucle musicale et les réglages associés sont vérifiés ;
la boucle reste un prototype à écouter sur téléphone. Le sachet utilise
uniquement CSS dans le composant d’ouverture ; le chemin Three/WebGL n’est plus
initialisé, même si `?opening3d=1` est présent. Un portrait dont le fichier ne
charge pas reçoit un placeholder, mais aucune détection automatique ne classe
les images floues ou pixelisées. Publiée par `00b22d4b` ; la CI finale est
`38480069643`, verte (6/6 jobs).
Le correctif E2E est depuis publié et CI verte : `15b6ec45`, run
[`38480069643`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38480069643),
6/6 jobs. Le gain du hub a été relevé localement à 0,24 après mesure du niveau
de l’asset ; reste à écouter sur téléphone. Détails dans le
[checkpoint actif](agent-handoff.md#sensation-de-jeu-a--e--vérification-locale-13-octobre-2026)
et le suivi audio de l’agent handoff.

## Drop et Craft : hiérarchie encombrée — 13 octobre 2026

CTA après garantie et Atelier trié par rang : pages initiales remplies de
légendaires non artisanables malgré l’annonce des cartes disponibles. Correction
UI : CTA avant infos, scène Drop compacte, scope à portée et tri par coût,
raretés/règles repliées, Recycler vide utile. 26/26 DOM et 8/8 E2E ciblés,
CTA entièrement visible avant navigation à 320×568 et 360×740. Avis téléphone
physique et état CI du commit à relever ; fichiers réservés à Gemini préservés.
[Rapport](drop-craft-priorites-2026-10-13.md).

## CI après hiérarchie Drop — 13 octobre 2026

Run `38397134313` sur `5eba4275` : 76 réussis, 10 cloud ignorés, six échecs
Playwright (trois causes bureau/téléphone) après 8 min 42 s. Le hint Drop avait
été supprimé par mégarde ; deux assertions E2E attendaient une ancienne copie
ou un ancien ordre d’écran. Hint restauré, tests réalignés sur le texte Scène et
la priorité sachet/CTA ; 8/8 cas ciblés et les deux shards E2E complets réussis
localement (41 passés + 5 cloud ignorés chacun). Correctif publié `ac6ff4b6` ;
CI GitHub `38400588529` verte (5/5 jobs, 2 min 31 s).

## Badge Live sur une carte — statut actuel / provenance — 13 octobre 2026

Malik remarque que la carte d’Étoile porte toujours « Live » alors qu’il ne
streame plus. Le code sépare bien la variante `live` persistée à l’obtention
du direct actuel `liveStream` ; le badge persistant constitue une provenance
utile pour le futur visuel alternatif. Ce n’est pas une preuve qu’Étoile est en
direct maintenant. Corrigé : le badge indique « Obtenue en direct » (compact :
« Acquis live »), la fiche explique la provenance, et un stream frais apparaît
séparément comme « En direct maintenant » avec un lien Twitch. Sans snapshot frais,
aucun statut ni lien actif n’est rendu. D-073 ; tests écran 2/2, suite écrans,
typecheck, lint et build vérifiés. SHA/code/CI définitifs dans le checkpoint de
passation.

## Languette d’aperçu artificielle et inconstante — retirée le 13 octobre 2026

Retour de Malik après essai : la languette de coin paraissait peu naturelle et
n’apparaissait pas à chaque ouverture selon les conditions du reveal. La
mécanique et son attente dédiée ont été supprimées ; la cinquième carte reprend
le retournement automatique ordinaire. Une alternative de game feel reste à
concevoir avec Arena, sans réintroduire la languette. Vérifications du retrait
et SHA dans [la passation](agent-handoff.md).

## Cinq échecs DOM corrigés après les changements de layout — 13 octobre 2026

## Ouverture avant relâchement / languette instable — 13 octobre 2026

Retour sur `180827ba` : le seuil était exécuté dans pointerMove ; angle calculé
sur deux points successifs et bounds relus sur une scène inclinée, donnant des
variations brusques. Correction : déclenchement dans pointerUp uniquement,
repère figé, angle global et interpolation courte. Cancel n’ouvre jamais.
Test navigateur maintient la coupe suffisante 350 ms avant de lever le doigt.
Validation du ressenti sur téléphone encore attendue.

## Peel trop linéaire — 13 octobre 2026

Problème joueur démontré : `abs(deltaX)/(width*.55)` et fente horizontale fixe
font sentir une jauge. Correction ciblée : zone tactile haute, trace X/Y,
clips des pièces suivant la trace, rabat sous le geste ; seuil de surface
ouverte et repli au relâchement. Tests navigateur dédiés ; acceptation du
ressenti par Malik sur téléphone encore requise. Aucun résultat esthétique
sur appareil réel revendiqué. [Détails](booster-peel-guide-2026-10-13.md).

Accès aux thèmes et découverte depuis Binder vide restaurés, indication Live
explicitée et marquage du Tribunal ajusté. Titres compacts Gemini conservés avec
assertions exactes actualisées. [Détail et preuves](correctifs-interface-2026-10-13.md) :
116/116 DOM, typecheck/lint/build et 26 scénarios navigateur vérifiés. Deux
cas navigateur cloud non exécutés localement ; nouvelle CI à confirmer.

## Ouverture : correction après essai téléphone — 13 octobre 2026

Retour réel : sachet trop brillant et attente parfois bloquée. D-063 coupe
la 3D par défaut, remplace seulement l'impression d'ouverture, supprime le
sheen ajouté et garantit une fin d'extraction indépendante des effets audio.
Secours manuel et sortie de l'attente réseau sans second tirage ajoutés.
[Diagnostic et preuves](booster-clean-2026-10-13.md). K-047 garde sa validation
visuelle sur téléphone ; le correctif ne prétend pas reproduire Pocket.
Les paragraphes suivants décrivent les étapes précédentes.

## Ouverture hybride — 13 octobre 2026

Le sachet dispose désormais d'une amélioration Three.js limitée à l'ouverture,
avec secours 2D. [Preuves et limites](booster-3d-2026-10-13.md), D-062.
L'extraction des dos reste HTML et le plastique n'est pas simulé physiquement ;
K-047 reste soumis au jugement visuel sur téléphone, pas clos par les tests.

## Lecture actuelle — 12 octobre 2026

Le registre ci-dessous est actualisé pour `10699eb`. Lire d’abord
[le bilan courant](etat-projet-2026-10-12.md) et [le plan actif](roadmap.md#plan-actif).
Les premiers paragraphes datés du 11 octobre sont des notes historiques de
livraison, pas des contrôles encore à faire.

## Craft — aperçu avant le seuil (11 octobre 2026)

Seuil de dix doublons conservé, trois cartes manquantes à préparer avec les coûts
réels. Les points du recyclage groupé annoncés excluent les Live. Si la page Binder
choisie est complète ou uniquement non artisanable, les autres idées sont
explicitement annoncées. Les aperçus ne dépensent rien. Vérifications locales
vertes, nouvelles suites GitHub et téléphone réel restant à vérifier ; passation.

## Binder — validation des petites collections (11 octobre 2026)

Compteurs calculés depuis les cartes présentes, aucun gain ajouté. Le premier
scénario de choix attendait 12 cartes sur une vague qui n’en contenait que cinq ;
familles regroupées avant découpage, retest 8/8 réussi. Une liste initiale vide
a été détectée par 2 DOM : valeur résolue partagée avec le select, 10/10 DOM et
2/2 retests navigateur du choix réussis. Vue Obtenues au démarrage
conservée, objectif mémorisé uniquement sur cet appareil/édition. SQL non modifié.
Contrôles complets GitHub et retour visuel physique restent à vérifier ; état
courant dans la passation. K-031 reste un chantier séparé.

## Audit produit P0/P1 — corrections publiées et CI verte (11 octobre 2026)

Le premier E2E du lot a détecté un CTA hors du pli sur écran court et le retour
focus du Paquet Scène devenu repliable. Corrections locales ciblées confirmées par 8 E2E bureau/téléphone simulé ;
les suites finales passent, preuves détaillées dans la passation. L’essai invité est un aperçu sans collection ni gains ;
le compte reste requis pour jouer avec la collection serveur. Aucun nouveau
problème SQL établi ; 645 contrôles du vérificateur jetable passent jusqu’à 0048.
Une capture locale à 412×915 a aussi montré le sablier sous la navigation :
réglage CSS final vérifié par 4 E2E, avec assertion de visibilité intégrale.
Code final main `3d3ef31` : CI 38153757540 success (1118 unitaires, 86 DOM,
645 SQL, 46 E2E + 8 cloud simulés). Contrôle Supabase 38153978544 success,
base déjà à jour, aucun SQL exécuté. Liens dans la passation.
K-031 reste inchangé ; parcours sur téléphone physique non validé.

# Problèmes connus CreatorDeck

## D-130 — sélecteurs E2E du sachet ambigus après ajout du voisin — corrigés et CI verte

Sur le commit Production `fa8124d27604c3fcfaf7266eeea627523e663072`, le run CI
[`38943531594`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38943531594)
échoue sur deux shards Playwright. Les scénarios historiques du sachet
utilisaient des sélecteurs globaux et attendaient trois tranches 3D ; le nouveau
carrousel garde deux packs montés, donc les sélecteurs trouvaient deux lumières
et six tranches. Aucun défaut du parcours de jeu n'est établi par ces erreurs.
Le commit `7922f6e80b22c13243ce0c0cec19516ae761800e` cible maintenant le slot actif
`data-active="true"` et conserve les assertions d'image, de tranches, de reflet
et de révélation. Edge sous Windows : 4 scénarios concernés passent ; 2 scénarios
CSS-only atteignent leurs captures mais ne peuvent comparer les snapshots Linux
absents, avant leurs assertions suivantes. La CI Linux du commit
[`7922f6e`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38945759473)
est verte, trois shards Playwright compris ; aucune capture de référence n'a
été régénérée sur Windows.

## Revue IA Studio Binder/Atelier — D-114

Les défauts confirmés du rapport Lot 03 sont corrigés en D-114/D-115. Le
crash Atelier évoqué dans l’audit est un faux positif : le registre de
résolution comprend déjà les Sortants. Le rapport complet a été fourni après
la première pièce tronquée. Le fichier des Sortants est vide aujourd’hui, donc
son rendu a été couvert par des fiches synthétiques, pas un compte réel.
Détails : [revue IA Studio D-114/D-115](revue-ia-studio-binder-2026-10-15.md).

La CI D-114 (run `38755525613`) confirme le build, TypeScript, ESLint,
catalogue, migrations jetables, cloud simulé et les trois shards Playwright.
Le job unitaires/écrans reste rouge pour une seule cause hors de ce lot : le
mot « serveur » dans l’interface Compte/Trades, repris par un test de jargon et
deux assertions Compte lié (1 185/1 186 unitaires, 167/169 écrans). Ces fichiers
n’ont pas changé depuis le SHA de départ ; le vocabulaire Compte/Trades n’est
pas modifié par D-114. Le lot D-115 ajoute les tests d’inspection Sortant,
focus Atelier et lien Twitch indépendants.

### Visages artificiels dans certains anciens portraits Upscayl — 13 octobre 2026

Malik signale que plusieurs agrandissements IA reconstruisent les traits et
semblent peu naturels. Le catalogue réutilise les avatars Twitch d’origine
pour cette catégorie ; les choix manuels et les images avec provenance gardent
leur priorité. Les fichiers Upscayl sont archivés et leurs crédits indiquent
qu’ils ne sont plus affichés. Tests adaptés à l’enregistrement actif à retrouver
dans [le bilan](portrait-upscale-review-2026-10-13.md).

État courant : code `10699eb`, CI complète et Vercel Production réussis le
12 octobre 2026. Voir [le bilan vérifié](etat-projet-2026-10-12.md) et
[le plan actif](roadmap.md#plan-actif). Les anciennes observations restent
historiques, les compteurs et sources doivent être rattachés à leur révision.

### Retours encore à rapprocher

Le seul retour utilisateur subjectif encore attendu est l’avis sur l’ouverture
visuelle du booster (A dans la [roadmap](roadmap.md#retours-utilisateur-à-rapprocher--liste-unique)) ;
Malik demande l’analyse externe de Grok avant de décider d’un correctif. Malik confirme le 12 octobre que le retour Paquet Scène est bon ; ce point
est clos. Scroll,
objectif Live, cadeaux et version récente sont confirmés. Le parcours sablier
est confirmé et fermé.

Audit initial : 10 octobre 2026, branche `design/booster-reveal-polish`, code
`4955d9bbd489777c6ffd74229613075a332cc9e9`. Consulter l'état GitHub actuel avant
de reproduire. Ne pas confondre défaut confirmé, incident historique, limitation
d'environnement et validation manquante. Le détail historique de l'atelier est
conservé dans [atelier-et-problemes.md](atelier-et-problemes.md).

## Registre

**K-047 — continuum d’ouverture : corrigé dans le nouveau lot du 12 octobre.**
Le sachet était démonté avant le second portail de révélation, avec un reflet
porté par la scène et une inclinaison libre de carte. Le portail reste désormais
monté, la révélation est intégrée, le reflet suit la matière et la carte suit
un geste planaire après flip. [Fichiers, preuves et limites](booster-continuum-2026-10-12.md).
Le jugement esthétique sur téléphone reste distinct des tests fonctionnels.


K-040 — conflit local/cloud bloquant le sablier. Le diagnostic historique
(`1ebc6415`) demandait encore un choix manuel en cas de divergence persistante,
ce qui faisait réapparaître le message après redémarrage. Correctif demandé le
14 octobre : quand le compte est connecté, l'état du cloud remplace la copie
locale au démarrage, à la connexion, au retour au premier plan et au retour du
réseau ; un conflit d'envoi automatique adopte aussi la version renvoyée par le
serveur. Une partie locale sans sauvegarde cloud initialise toujours le compte.
Vérifié localement : store cloud 159/159, `npm test` 73 fichiers / 1 168 tests,
`npm run ecrans` 22 fichiers / 128 tests, TypeScript, ESLint ciblé et build
réussis. Le build local n'avait pas de variables Supabase ; aucune session réelle
ni compte de Malik n'a été testé, et aucune donnée de production n'a été modifiée.
Publié `c5ac85c6` ; CI `38487628741` en cours au dernier contrôle. Conséquence :
les changements joués hors ligne seront remplacés au prochain retour en ligne.

| ID | Gravité / nature | Statut / portée | Symptôme et reproduction | Cause / contournement |
|---|---|---|---|---|
| K-049 | Faible, fiabilité et durée de la CI navigateur | Tests stabilisés dans `ac6ff4b6`, puis Playwright réparti en trois shards dans `ebf57e8e` ; CI `38453353488` verte, 6/6 jobs | Run `38397134313` : six Playwright rouges, retries d’une minute et attentes d’ancienne UI. | Hint Drop restauré ; assertions Scène/Tribunal alignées sans retirer de contrôles. La couverture E2E complète est distribuée en trois lots 35/35/34. Le run 38453353488 termine en 3 min 04 s, contre 3 min 21 s pour le run précédent à deux shards (gain observé de 17 s, à confirmer vu la variabilité). Trois shards Playwright et jobs qualité, SQL et cloud simulé tous verts. |
| K-048 | Faible, libellé/provenance Live | Corrigé et publié sur `main` (`a39dc6e5`, puis `0e53fa6c`) ; CI `38411066062` verte 5/5, Vercel success | Une carte d’Étoile garde « Live » après la fin de son direct. | La variante persistée affiche « Obtenue en direct » ; `liveStream` frais indique le direct actuel. Le badge actif et la fiche ouvrent la chaîne Twitch en HTTPS ; sans snapshot frais, aucun statut/lien actif. D-073/D-074 ; tests écran ciblés et CI complète verts. |
| K-046 | Faible, tactile/révélation | Corrigé et publié sur `main` (`3f33b19`) ; CI `38251607393` verte | Toucher « Révéler la suivante » pendant le retournement animait le bouton mais n’avançait pas ; il fallait toucher une seconde fois. | La fermeture d’`animationend` ne voyait pas l’appui arrivé après son rendu initial. Une référence synchronisée retient un seul appui par carte et le consomme à la fin du flip ou du filet de sécurité. Perfect/verrou inchangés. Régression DOM 16/16 ; suite E2E bureau/téléphone et cloud simulé verte. |
| K-045 | Moyenne, style et qualité des portraits | Lot complet intégré le 12 octobre (`10699eb`) ; améliorations individuelles possibles | 300 manuels, 699 Upscayl et Diverron restauré IA ; les 1 000 routes existent mais ne prouvent pas 1 000 portraits nets et vérifiés. | CI complète et Vercel réussis. Sources/licences des imports souvent absentes, détails IA reconstruits ; avatars génériques acceptés par Malik (K-044). |
| K-044 | Choix visuel accepté | Clos le 12 octobre, instruction explicite de Malik | SolaryHS, j0niq et toaststix gardent leur avatar générique. | Sans photo de profil, conserver l’avatar générique ; aucune recherche/remplacement demandé. Ce n’est plus un bug ni une tâche de roadmap. |
| K-043 | Faible, compteur pity après tirage | Corrigé et testé sur `main` `1439e44` ; CI `38178996093` verte | Le compteur affichait 7 avant puis 12 après un booster sans Légendaire. | `open_pack()` renvoie le compteur du journal après tirage ; l’adoption de `save.state` pouvait réécraser cette réponse par l’ancien `pityCounter`. Le client conserve maintenant la progression serveur calculée. Reproduction unitaire, vue restante 7→6 vérifiée. |
| K-042 | Faible, reflet/continuité du sachet | Corrigé et testé sur `main` `1439e44` ; CI `38178996093` verte | Vidéo : bande lumineuse indépendante persistante, longue attente immobile et dos apparemment séparés du sachet. | Reflet clipé sur la silhouette SVG et animé une seule fois, 1,25–1,35 s ; arrêté en ouverture/reveal/Perfect ou effets réduits. Consigne indique la bande soudée haute. Z-index : cartes au-dessus du corps, sous le rabat. E2E local 30/30 et assertions finales 2/2 ; CI complète verte. |
| K-041 | Faible, UX/gestes et rendu CSS | Corrigé et publié sur `main` `674fc1d` ; CI `38176673799` verte (4 jobs) | Répétitions autour du sablier, trop de chrome avant la grille Binder, révélation au bouton seul, reflet infini avant déchirure malgré mouvement réduit. | Une note contextuelle, Binder compact, swipe après flip avec bouton conservé, notice de succès contextualisée ; mouvement réduit coupe le reflet. Scoping CSS : zéro doublon sélecteur/keyframe entre feuilles. Écrans 28/28 ; E2E continuité/réduit 4/4, abandon mi-course 2/2, swipe horizontal 2/2 (geste débordant de la carte après capture pointeur). Typecheck, ESLint et build statique code 0. |
| K-039 | Faible, découvrabilité sociale | Résolu dans le code `980bdf8` (inclus dans `main` `d585db6`) ; CI `38164889818` verte (4 jobs) | Les ouvertures récentes des amis (dernière heure) n’apparaissaient dans le Drop qu’après ouverture d’un panneau secondaire. | CTA conditionnel déplacé hors du repli, sous le Paquet Scène ; il mène au Carnet et n’ajoute rien quand il n’y a pas d’activité. DOM ciblé 7/7 ; CI complète verte. Aucun changement de données, notification ou serveur. |
| K-031 | Élevée, recharge ordinaire | Résolu sur main `76e8a62` ; 0049 appliquée et vérifiée automatiquement ; téléphone confirmé par Malik | Après plusieurs intervalles gagnés avec stock sous le plafond, la réserve pouvait regagner trop tôt au contrôle suivant. | 0048 avançait l’ancre de N millisecondes au lieu de N × intervalle. 0049 remplace uniquement `_pack_refresh` par la formule correcte. Tests : TypeScript 103/103, toutes assertions SQL jetables ; CI 38163674938 quatre jobs verts ; automatique 38163920425 success, log confirme TLS/projet/historique, application 0049 seulement et post-vérification des objets. Malik confirme le test sur téléphone réussi. |
| K-038 | Moyenne, continuité visuelle du booster | Correctif publié et CI verte ; retour A (avis visuel téléphone) demandé | Après la déchirure, les cinq dos montaient mais le sachet ouvert restait visible dessous ; Reflets coupés ou mouvement réduit laissaient une enveloppe fantôme. | Cap 980 ms, corps 1150 ms, côtés/ombre 1080 ms puis opacité nulle ; sans effets/mouvement réduit, emballage masqué et dos conservés. Timer 1900 ms et Reveal/Perfect/tear inchangés. E2E locaux 4/4 bureau/téléphone simulé ; CI `38162996089` et `38164889818` vertes. Réponse physique reste subjective. |
| K-037 | UX Paquet Scène | **Clos : corrigé et confirmé par Malik le 12 octobre** | La disponibilité et la présentation après ouverture conviennent désormais à Malik. | Aucun nouveau correctif requis ; les états actuels restent couverts par les tests. |
| K-036 | Élevée, tactile/ouverture involontaire | Confirmé corrigé par Malik sur son appareil | Remonter le doigt sur le sachet ou le grand bloc Drop ouvrait un booster au lieu de défiler. Reproduit par le chemin pointer capture/armed de HomeView. | Scroll natif autorisé, clic après glissement ignoré ; appui/clavier ouvrent la scène séparée. Déchirure et Perfect inchangés. 50 E2E et 8 cloud simulés verts ; CI `38155656424` success. |
| K-035 | Moyenne, UX/règle sablier | Résolu ; parcours téléphone confirmé par Malik | Sablier caché sous « Jetons et sabliers », grisé à 4/4 ; carte encombrée de garanties et compteurs. | Bouton visible, informations secondaires allégées ; bonus unique 5/4 jusqu’à ouverture. CI `38145382045` verte (4 jobs), 0048 appliquée et vérifiée (`38146774310`). Malik confirme le parcours réel 4/4 → 5/4 → ouverture → 4/4. |
| K-034 | Automatisation Supabase | Résolu sur main ee10a6d ; automatique réussi | Prévalidation baseline 0001–0046 refusait 0047 manual déjà installée avant lecture réseau. Log 38140833700 désormais téléchargé : même refus, exit code 1. | Validation des fichiers séparée du plan sur historique réel ; manual enregistrée ignorée dans le plan, approbation maintenue pour manual en attente. 28/28 tests outil, politique/syntaxe/ESLint ciblé/diff-check réussis. Aucun SQL modifié ni 0047 réappliquée. CI 38142506934 quatre jobs verts ; automatique 38142681999 success sur ee10a6d, log lu : base déjà à jour et vérifiée, aucun SQL de migration exécuté. |
| K-033 | Application 0047, diagnostic incomplet | Résolu, 0047 appliquée et objets vérifiés | Run manuel 38139794012 failure à l’étape de contrôle/application, après CI verte et dry-run réussi. | Log fourni par Malik : CLI 2.39.2 refuse les options récentes de config.toml avant SQL. db push isolé dans un dossier temporaire (mêmes SQL, config minimale), contrôle historique/objets après application ajouté ; 24/24 tests locaux et compatibilité binaire vérifiée. Correctif 5832b5d : CI 38140313000 verte, dry-run réussi, application 38140515537 success avec vérification historique/objets, contrôle final en lecture seule 38140562490 success. Aucun repair ni replay historique. Risque sans sauvegarde accepté explicitement par Malik. |
| K-032 | CI navigateur, configuration de test | Résolu, CI distante verte sur 1dd5b53 | CI de main 9788208 en échec : scénarios cadeau/sablier lancés sans cloud, tutoriel inattendu ou cadeau absent. | Les deux scénarios exigent désormais la configuration publique valide et leur nom les sélectionne dans le job cloud à RPC simulées. Helper partagé aligné sur les fichiers/env de Next dev. Aucune assertion supprimée, aucun SQL modifié ; 42/42 sans cloud (6 ignorés), 6/6 cloud simulés, typecheck/lint réussis. CI 38139620497 verte sur 1dd5b53. |
| K-030 | Moyenne, sabliers en ligne | Migration 0047 appliquée et vérifiée ; parcours sablier sur téléphone confirmé | Les gains existaient mais le bouton restait désactivé depuis 5c120f3. | Nouveau RPC atomique `use_hourglass` : débit 1, recharge -15 min, idempotence UUID, garde des anciennes sauvegardes et refus solde vide/réserve pleine. 1117 unitaires, 83 DOM, 643 SQL dont 19 sabliers, E2E simulé 2/2. Migration appliquée le 11 octobre (`38140515537`), versions/objets vérifiés. Malik confirme l’usage réel du sablier. Les sources de gains restent locales ; ne pas annoncer une économie intégralement certifiée serveur. |
| K-029 | Outillage, accès GitHub | Résolu par exécution réseau autorisée ; diagnostic initial rectifié | Git et curl exécutés dans le bac à sable échouaient immédiatement à joindre proxy:8080. | Contre-épreuve : même commande Git, même proxy, avec sandbox_permissions=require_escalated approuvé → ls-remote, fetch et push réussis. Le refus venait des restrictions d'exécution ; aucune panne du proxy confirmée. Conserver proxy/CA, utiliser l'autorisation réseau de l'outil ; aucune règle réseau modifiée ni environnement recréé. |
| K-028 | Moyenne, objectif quotidien en ligne | Correctif confirmé par Malik après publication | Après un Live Drop côté serveur, l'objectif « Ouvre un booster » pouvait rester à 0/1. Le Paquet Scène ne compte pas pour cette mission, par règle existante. | Le client conserve maintenant les missions calculées après adoption de la sauvegarde serveur. Test cloud ciblé 135/135, typecheck et ESLint ciblé réussis. Malik confirme que l’objectif progresse après un Live Drop. |
| K-027 | Faible, accueil cadeau | Correctif confirmé par Malik ; aucun toast gênant observé | Après réclamation du cadeau, un toast persistant recouvrait le bouton du booster cadeau suivant dans la boîte. | Le message cadeau et son solde actualisé restent visibles ; le toast de succès redondant n’est plus émis. Parcours E2E bureau/téléphone simulé 2/2 avec RPC interceptées. Malik confirme ne pas avoir vu de message gênant. |
| K-025 | Faible, progression du Binder | Corrigé et testé localement | Avec 999 noms sur 1 000, le pourcentage arrondi affichait 100 %. | Pourcentage tronqué : 99 % jusqu’au dernier nom. Test DOM 999/1 000 ajouté ; pas de modification des compteurs du moteur. |
| K-026 | Outillage, lint | Corrigé localement | Après un rapport Playwright, ESLint analysait le JavaScript généré du visualiseur de traces (188 erreurs). | Exclusions playwright-report/** et test-results/**, déjà ignorés par Git. Aucun fichier produit exclu. |
| K-022 | CI, fixture navigateur | Résolu ; les scénarios serveur sont vérifiés séparément avec RPC simulées | Job navigateur-cloud : timeout au clic sur Ouvrir le booster, tutoriel intercepte les événements. | L'ancien scénario supposait un joueur déjà accueilli mais renvoyait `{}` pour `onboarding_status`. Le helper navigateur parcourt désormais les étapes et les scénarios cloud sont sélectionnés dans le job dédié. La CI complète 38140313000 est verte sur le correctif final ; preuves détaillées dans la passation. Aucune connexion de test à la production. |
| K-024 | Configuration TLS, runner GitHub | Résolution confirmée par Malik après intégration de la CA | Dry_run échouait avec SELF_SIGNED_CERT_IN_CHAIN. | CA publique Supabase intégrée dans 37e34e6, TLS et hôte toujours vérifiés. Malik confirme ensuite « C’est passé ». Connexion/projet/historique en lecture seule validés selon ce retour ; aucun log final ni run consulté directement par l’agent, aucune migration appliquée par ce contrôle. |
| K-023 | Diagnostic, connexion PostgreSQL | Diagnostic corrigé ; dry_run réussi selon Malik | L’ancien script masquait tous les codes pilote sous un message générique. | Messages sûrs par cause ajoutés, puis erreur TLS identifiée et K-024 résolue. Ne pas redemander mot de passe ou secret sans nouvel échec précis. |
| K-021 | Configuration, mises à jour SQL | Procédure automatique exercée jusqu’à 0049 ; aucune validation utilisateur en attente | Connexion TLS, projet, historique et applications automatiques des migrations requises ont été vérifiés dans les runs référencés dans la [passation](agent-handoff.md). | `0049` appliquée et vérifiée par le run `38163920425`. Les futures migrations restent soumises à CI, historique, TLS et contrôles après application. Aucun repair ni ancien reset rejoué. [Procédure](mises-a-jour-automatiques.md). |
| K-020 | Moyenne, replay du tutoriel | Correctif 0046 appliqué ; tutoriel et cadeaux restants confirmés sur téléphone | Réinitialiser la progression ne redonnait pas le tutoriel ni sa séquence cadeau. | 0046 retire la fin du tutoriel du compte connecté ; le client rejoue après réussite. Malik confirme le tutoriel et l’ouverture des cadeaux restants sans message gênant. |
| K-019 | Élevée, cadeau de reprise | Reproduit en production ; correctif poussé sur `main` le 11 octobre, migration 0045 active selon contrôle SQL transmis par Malik | Après avoir réclamé et ouvert le premier booster cadeau, cliquer pour ouvrir l'un des quatre restants affiche « cadeau déjà réclamé ». | L'écran rappelait `claim_return_gift()` à chaque clic ; le RPC rejetait tout claim répété même si le stock cadeau restait positif. Migration 0045 rend le RPC idempotent sans recréditer, renvoie l'état `gift_claimed`, et la nouvelle interface passe ensuite au libellé « Ouvrir un booster cadeau ». Tests complets/API/écrans/SQL, typecheck, lint et build webpack passent. Commit `9710baf` est vérifié sur GitHub `main`. 0045 est déjà appliquée ; le statut Vercel n'est pas vérifié. |
| K-018 | Élevée, SQL cadeau | Corrigé et validé localement le 11 octobre 2026 | 0044 remplaçait le helper des boosters ordinaires sans synchroniser leurs compteurs. | Helper cadeau isolé, droits clients retirés ; preuve SQL de conservation de la fonction ordinaire ajoutée. `npm test` 1 109/1 109 et `supabase:verify` réussis. Le reset 0044 a ensuite été appliqué par Malik dans le SQL Editor ; K-017 note les compteurs vérifiés. |
| K-016 | Moyenne, build Cloud | Limitation d’environnement constatée le 10 octobre 2026 | `npm run build` (Turbopack) échoue lors de l’analyse CSS : `creating new process`, `binding to a port`, `Operation not permitted`. | Aucun défaut produit établi. `npm run build -- --webpack` réussit, avec export statique complet. Ne pas modifier la configuration du dépôt pour contourner les restrictions Cloud sans autre preuve. |
| K-017 | Élevée, opération irréversible | Reset effectué par Malik dans Supabase le 11 octobre 2026 | Le contrôle SQL a renvoyé le marqueur `tutoriel-cadeau-2026`, 16 tutoriels, 16 cadeaux et zéro tirage/carte/échange ouvert/annonce ouverte. | La base de production a été modifiée depuis le SQL Editor du propriétaire ; cet environnement Cloud n'a pas exécuté la migration. Le contrôle fourni établit ces compteurs, pas une sauvegarde indépendante. Le bug K-019 du claim cadeau a été constaté ensuite. |
| K-015 | Moyenne, cohérence des artefacts de données et tests | Résolu par vérification locale sur le checkout courant (10 octobre 2026) | `npm test` : 71 fichiers, 1 109/1 109 ; génération catalogue/saisons et Git sont passés avec exécution locale autorisée. | Les anciens échecs étaient dus à l’environnement sandbox (Git `EPERM`, processus locaux) et non aux artefacts du HEAD courant. `catalog:ci` n’a pas été demandé/exécuté dans ce lot. |
| K-013 | Elevee, coherence du tirage | Corrige et valide localement par 35 tests et PostgreSQL jetable | Les familles a 1-4 Epiques pouvaient vider les choix ; le premier run a revele le reserve exclu du 5e slot. | La migration 0043 reserve correctement le candidat et le rend disponible au dernier slot. Aucun deploiement. |
| K-014 | Elevee, validation SQL | Resolu pour la validation locale jetable | PostgreSQL refusait de demarrer sous le compte Administrateur Windows ; le run WSL initial a ensuite revele des defauts de fixture, corriges. | Sous WSL creator, migrations 0001-0043 et controles complets reussis. La production reste hors perimetre. |
| K-001 | Élevée, environnement | Historique confirmé les 8–9 octobre ; cause non démontrée | Une reprise Cloud peut revenir au parent/main/clone limité ; status montre des milliers de changements. Relever branche, HEAD, refs et fichiers avant d'éditer. | Origine automatique soupçonnée dans l'atelier, non prouvée. Sauvegarder les fichiers touchés, fetch explicite, ne pas add-all/force/reset aveugle. Le switch/tracking échoué de l'audit du 10 octobre était une erreur locale distincte, corrigée. |
| K-002 | Moyenne, données visuelles | **Résolu le 12 octobre 2026** avec une photo fournie par Malik, restaurée par IA | Le portrait WebP endommagé de DIVERRON apparaissait comme un disque vert. | Une photo fournie par Malik a été restaurée et intégrée en 900 × 900 px. L’application la crédite comme photo fournie/restaurée ; source et auteur de l’original non documentés. |

Scan ciblé, 11 octobre 2026 : les 1 000 fichiers `public/creators/*.webp` ont
été décodés et réduits pour repérer les images majoritairement vertes. Aucun
échec de décodage ou dimension incorrecte ; seul `diverron.webp` ressortait (87 %
de pixels verts dominants selon le filtre de repérage). Le 12 octobre, une photo
fournie et restaurée a remplacé ce secours à l’affichage. Le filtre sert au tri,
pas à juger visuellement un portrait.
| K-003 | Moyenne, version réellement visible | Identifiant publié le 14 octobre 2026 ; Vercel Production READY | Distinguer un ancien bundle Android du build web courant lorsque l’écran ou le champ du code cadeau semble changer. | La table d’origine est historique : son ancien constat ne permettait pas d’identifier le build. Le dépôt disposait d’un helper SHA et d’un style orphelins, mais aucun rendu JSX. L’indicateur est ajouté dans Toi → Réglages (`Android/Web · SHA court`, SHA complet au survol). Cela identifie l’interface, pas les données synchronisées Supabase. Vercel ne met pas à jour une APK ; celle-ci doit être reconstruite et réinstallée. Tests et SHA : voir le dernier checkpoint de passation. |
| K-004 | Élevée quand présente, SQL | **Corrigé dans la branche actuelle**, ancien main concerné | Ancien `0004` : `open_pack()` échoue avec « set-returning functions are not allowed in CASE ». La lecture du code design montre `FROM unnest(...) ORDER BY array_position(...)`. | Correctif historique `942ba694`, déjà intégré ; la fonction finale est ensuite redéfinie dans `0035`. Ne pas importer les conclusions du checkout main dans design. Validation SQL courante à noter dans la passation. |
| K-005 | Faible à moyenne, validation UI | Ancienne validation visuelle ; éléments encore utiles regroupés sous A | Scène d’ouverture : soudure tactile, dos/faces/halo, Perfect et options d’accessibilité. | Les observations de Chromium et du preview sont historiques. La seule appréciation visuelle encore demandée est A dans la roadmap ; ne pas redemander chaque ancien point séparément. |
| K-006 | Moyenne, accès de l'agent | Incident historique ; accès REST GitHub fonctionne dans l’environnement du 11 octobre | Ancien audit : GraphQL Forbidden et REST HTTP 403 sur PR #8. | Cause passée non établie. Dans l’environnement actuel, API GitHub/`gh` répondent et runs/PR sont lisibles ; l’ancien refus n’est pas un blocage présent. |
| K-007 | Moyenne, défaut de test confirmé | **Corrigé le 10 octobre 2026** ; 559/559 contrôles SQL passent | Avant correction (`dedb03be`), le samedi/dimanche après le début de journée de jeu à 6 h UTC, lancer `npm run supabase:verify` : code 1, seul échec « arène · draft : hors du week-end, c'est refusé ». | Le vérifieur appelle `arena_draft_choices()` avec `now()` et attend toujours un refus, même un vrai samedi. `0018` autorise correctement le week-end ; les contrôles à dates explicites passent. Correction : fenêtre fermée puis ouverte imposée dans la base jetable, définition originale sauvegardée et restaurée dans `finally`. Les contrôles calendaires à dates explicites restent présents. `npm run supabase:verify` : code 0, 559/559 le samedi 10 octobre ; contre-épreuve et détails dans la passation. Aucune migration/règle produit modifiée. |
| K-008 | Moyenne, réseau/outillage | **Résolu le 10 octobre 2026, reprise E2E** | Ancien téléchargement bloqué par les redirections Chromium/FFmpeg. Installation verrouillée maintenant code 0, Chromium 1243 et FFmpeg 1011 présents. | Les trois domaines CDN et redirections sont accessibles. E2E effectivement exécutés : voir la passation ; échecs applicatifs distincts K-010. |
| K-009 | Moyenne, procédure d'installation | Corrigé dans cet audit ; prévention documentée | Avec `npm_config_package_lock=false npm run dev:setup`, les plages semver ont amené Next 16.4.0 et Playwright 1.64.0 sans changer le lock, qui demandait 16.3.6/1.63.0. | Le flag désactive aussi la lecture du lock. `npm ci` puis `npm run dev:setup` sans ce flag ont restauré les versions verrouillées ; versions comparées réellement. Rejouer les contrôles dépendants après correction, ne pas attribuer leurs premiers résultats à l'environnement verrouillé. |
| K-010 | Moyenne, accessibilité clavier | **Corrigé le 10 octobre 2026**, code `4b9fcca3` | Avant correctif, `npm run e2e -- --grep "the revealed card keeps"` échoue sur bureau et téléphone à `e2e/pack-tear.spec.ts:46` : après fermeture, le bouton « Ouvrir le booster » ne reprend pas le focus. | Cause : capture du focus après désactivation du bouton. Capture désormais avant le commit de désactivation, cible conservée de la déchirure à la révélation. Même test inchangé : **2/2 réussis**, écrans/tactile **9/9**, typecheck et lint ciblé code 0. Détails et limites dans la passation. |
| K-011 | Moyenne, accessibilité clavier Scène | **Corrigé le 10 octobre 2026**, code `d87b72c` | Avant correctif : après ouverture puis fermeture Scène, focus BODY, bouton consommé désactivé ; nouveau scénario E2E bureau/téléphone 2/2 échecs. | Retour sur le titre de la section si le déclencheur ne reçoit plus le focus ; titre tabIndex=-1, paquet consommé toujours désactivé. Après correctif : scénario Scène et scénario Live existant **4/4 réussis**, typecheck et lint ciblé code 0. CI du nouveau SHA et appareil réel non vérifiés ; détails dans la passation. |
| K-012 | Moyenne, tactile/ergonomie | Correctif livré ; avis regroupé sous A (rendu/toucher) et B (scroll) | Ancien retour : sachet trop grand et soudure hors de portée ; appui sur sachet accueil sans effet. | Paquet compact, ouverture explicite et Drop mobile compactés ; tests Playwright bureau/téléphone simulé verts. L’essai sur le téléphone réel reste à faire ; ne pas le déclarer validé. |

## À ne pas transformer en nouveaux bugs

- Les anciens compteurs 181/931/1077 des tests ne sont pas interchangeables :
  ils appartiennent à des commits différents. Compter le run de la passation.
- Les suites Playwright, écrans et SQL existent ; l'ancienne case non cochée de
  roadmap est historique. Disponibilité d'un script ≠ exécution réussie.
- L'APK debug ou build sans cloud d'un ancien main ne prouve pas le produit
  distribué actuel ; la branche et ses variables de compilation changent le parcours.
- Les questions « Tu demandes » limité à 8, pager et simulateur conservé sont
  des choix/questions documentés, pas des bugs confirmés par cet audit.

## Mise à jour d'un incident

Ajouter un ID stable, date/agent, SHA/branche/environnement, gravité et impact,
étapes minimales, attendu/observé, commandes/code de sortie, cause vérifiée ou
hypothèse, statut, contournement et action recommandée. À la correction,
conserver l'entrée avec commit et test de non-régression ; ne pas effacer l'histoire.
Ne jamais publier de logs contenant des clés ou sessions.
## Code booster de test limité par la réserve — vérifié en local, publication en attente, 14 octobre 2026

Malik ne pouvait pas enchaîner ses tests : les codes promo créditaient la réserve
normale, plafonnée à quatre (cinq avec sablier), puis refusaient tout nouveau
code. Cette limite protège la recharge, mais bloquait à tort un lot de 50
ouvertures de test. Le correctif sépare `promo_packs`, consomme ces
crédits après la réserve normale et affiche leur nombre à part dans le Drop ;
`MALIK` sera lié à son compte et utilisable une fois. La migration additive
0051 passe dans le vérificateur Postgres local, comme les 1 168 tests unitaires,
129 tests d'écran, le typecheck, ESLint ciblé et le build. La CI distante et le
déploiement Supabase de production restent à vérifier avant de considérer le
correctif publié. Aucun code ni compte de production n'a été modifié.
Après publication, créer le code via le [guide](booster-test-access.md), puis
vérifier les ouvertures dans l'application.
## Boosters de test personnels — migration déployée, code à créer, 14 octobre 2026

Le plafond de quatre reste réservé à la recharge ordinaire ; les boosters
bonus ont maintenant un solde distinct et sont dépensés après cette réserve.
La migration additive 0051 lie les codes au compte destinataire et permet
jusqu'à 50 boosters. Code sur `main` : `5bdf9f21317a2d6b6557c1cc70f968a3379236e6`.
CI GitHub `38490854882` verte (6/6), migration Supabase automatique
`38491098387` appliquée et objets vérifiés ; Vercel Production READY.
La seule étape restante est l'insertion du code `MALIK` dans le SQL Editor avec
l'email exact du compte, selon [le guide](booster-test-access.md). Aucun code
ni crédit n'a encore été créé. Après insertion, le joueur saisit `MALIK` dans
Toi → Fonctionnalités en ligne → J'ai un code booster. Une APK Capacitor doit
être reconstruite pour contenir le nouveau client ; le déploiement Vercel met
à jour la version web.

## Fenêtre du code booster invisible sur téléphone — corrigée et publiée, 14 octobre 2026

Après l'appui sur « J'ai un code booster », le voile assombrissait le profil
mais la fenêtre restait hors de l'écran. `ProfileView` est animé par un
`transform` ; le positionnement `fixed` de la fenêtre prenait donc comme repère
la longue page du profil, puis l'overflow du cadre principal la coupait. La
feuille est désormais montée dans `document.body`, hors de cette animation et
de ce rognage. Le test écran vérifie qu'elle est attachée au niveau du document
et que son titre/champ sont présents. Écrans : 129/129 ; E2E ciblé : 6 réussis
(bureau et téléphone), deux scénarios cloud ignorés faute de configuration réelle ;
TypeScript et lint ciblé réussis. Publiée sur `main` au SHA
`7413d47bbc0f2aefeac47afcbeb749b366db8bb0` ; CI GitHub
[`38492822813`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38492822813)
verte (6/6) et Vercel Production READY. L'APK Capacitor devra être reconstruite
pour intégrer le correctif.
## Univers Mèmes FR : une fiche sans visuel distribué — D-125

Au relevé du 16 octobre 2026, « Carte supprimée » (`juventus-rose`) avait un WebP de remplacement de 818 octets. D-131 retire la fiche du client et le script d’import l’exclut avec une garde sur son identifiant et son nom. La migration `0053` refuse de supprimer si une collection ou un tirage historique la référence. Première CI `38959520465` : deux anciennes attentes E2E et la fixture d’application SQL étaient périmées ; corrigées dans `83d212c8`. CI `38960335566` verte (6/6), SQL jetable compris ; workflow Supabase `38960850198` réussi, avec `0053` appliquée et vérifiée après application. Vercel Production READY sur `83d212c8`. Statut : résolu et publié.
## Contraste de la sélection Live Drop/MEMES — corrigé et publié

Le sélecteur Drop affichait son texte blanc 13 px sur `#e8382c`, contraste
calculé 4,17:1 (sous 4,5:1 WCAG AA). Relevé par revue ciblée Claude le
16 octobre 2026 au SHA `7c069711`. Gravité faible, lisibilité de l’état actif.
Correction : fond et bordure de la pill active passés à `#d52820` (5,06:1
calculé). Le texte et les états sémantiques `aria-pressed` restent inchangés.
`npm run ecrans -- drop-binder` : 17/17 ; `npm run typecheck` et
`git diff --check` réussis au SHA de base `7c069711` avec correctif local. Le contraste
est calculé selon la formule WCAG, sans audit visuel/lecteur d’écran ni essai
physique. Correctif publié dans `cc7a61d2` sur `main` ; contrôle GitHub Vercel
`success` au SHA exact. Validation physique non faite.

Le risque associé aux palettes `forced-colors` est aussi couvert par D-135 :
la pill active reçoit un contour `Highlight` indépendant du focus. Contrôle
isolé Edge réussi : contour système de 2 px, décalage de 2 px ; écrans ciblés
17/17, typecheck, garde-jargon et `git diff --check` réussis. Le test E2E de
l’application n’a pas démarré : le `next dev` préexistant sur le port 3000 ne
répond pas. Correctif publié dans `f5f27f90` ; GitHub confirme le contrôle
Vercel `success` sur ce SHA. Résultat CI Actions non vérifiable depuis ce chat.
