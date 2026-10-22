# Contre-expertise indépendante du rapport Gemini — 22 octobre 2026

## Périmètre et méthode

Rapport Gemini lu intégralement, depuis `C:/Users/Administrator/.gemini/antigravity-cli/brain/15992d1e-fab2-4405-9d44-11602624e733/rapport-audit-critique-creatordeck.md` (le chemin communiqué omettait le séparateur avant `.gemini`). Ses 14 constats sont examinés ci-dessous dans leur ordre original.

Référence publiée : `c60a8ca500ff7ccb4af5d2a80b4e26963f372686`, branche locale `codex/phase2-completion`, identique à `main` distant au relevé. Arbre local non propre : éditeur de mèmes et plugin Java non publiés, modifications de dépendances et archivage Upscayl déjà présents. Aucun de ces changements ne vient de cette contre-expertise. Les numéros de ligne désignent les fichiers actuels de ce checkout. Les constats sur le plugin Java et l'éditeur concernent donc le travail local, pas une fonctionnalité distribuée sur ce SHA.

Méthode : lecture des fonctions, recherche des appelants et protections, mesures des fichiers, consultation des sources officielles pour Supabase/Next, reproduction isolée de la concurrence CloudApi. Une structure coûteuse n'est pas une mesure de lenteur ; un risque de mémoire n'est pas un crash observé. Aucune correction applicative ni opération de production exécutée pour cet audit.

## 1.1 — Rafraîchissement concurrent des jetons

**PARTIELLEMENT CONFIRMÉ — gravité élevée pour la fiabilité des sessions, pas une vulnérabilité critique démontrée.**

- Preuves : `src/lib/cloud/api/index.ts:144` lance `refresh()` sans promesse partagée ; `:152` ne verrouille rien ; `:159` efface la session sur toute réponse HTTP non réussie. Le rattrapage RPC `:265` emprunte aussi ce chemin. Les exceptions de transport, elles, conservent la session (`:166`).
- Reproduction exécutée sur la classe actuelle, transpilée en mémoire avec transport/stockage factices : deux `accessToken()` simultanés produisent **deux requêtes** ; succès du premier puis HTTP 500 du second : session présente après le succès, absente après le second. Code de sortie 0 avec assertions sur ce résultat. Aucun appel Supabase réel.
- Nuance majeure : Supabase autorise par défaut une réutilisation du refresh token pendant **10 secondes**, et prévoit une exception pour le parent du jeton actif. Deux appels proches ne conduisent donc pas automatiquement au scénario `invalid_grant` de Gemini. La configuration réelle du projet n'a pas été inspectée. Source : [sessions Supabase](https://supabase.com/docs/guides/auth/sessions).
- Nécessaire : dédupliquer par session/jeton ; ne pas effacer une session plus récente à la réponse d'une ancienne requête ; distinguer refus d'authentification définitif et HTTP temporaire (429/5xx). Une promesse globale seule peut réinjecter une ancienne session après déconnexion ou changement de compte : invalider les résultats périmés.
- Régression : reconnexion, changement de compte, retry après 401/403, déconnexion pendant le refresh et plusieurs instances/onglets. Tester ces cas, pas seulement deux succès parallèles. Ni « élimination définitive » des déconnexions ni division générale par deux du trafic ne sont établies.

## 1.2 — Autorisation de `refresh-live`

**PARTIELLEMENT CONFIRMÉ — gravité modérée de durcissement, exposition publique à vérifier au déploiement.**

- Preuves : `supabase/functions/refresh-live/index.ts:244` accepte une chaîne arbitraire non vide sur le chemin normal ; `:245` compare réellement la clé de service ; diagnostic `:259` et push manuel `:287` restent réservés au service. Le contrôle dénoncé est donc réel, mais ne permet pas l'accès à ces deux modes privilégiés.
- Protection omise par Gemini : réservation conditionnelle du créneau en base (`:307`, PATCH `:315`), fenêtre de 90 secondes, traitement par le serveur des logins publics. L'appelant ne fournit pas un contenu arbitraire à écrire en base. Les appels perdants sollicitent néanmoins la fonction et la base. L'état effectif du contrôle JWT de la passerelle n'est pas prouvé par les commentaires.
- Nécessaire : aligner le contrat public et le contrôle ; rejeter les bearers invalides si l'API exige la clé publique, conserver les contrôles service séparés, vérifier la configuration déployée et les limites de débit. Une clé anon embarquée est publique : sa comparaison ne protège pas contre un attaquant qui la récupère dans l'APK ou le site.
- Régression : rejeter à tort la clé `sb_publishable_…`, un JWT utilisateur légitime, le cron ou la clé service ; casser les badges Direct. Prévoir une matrice des identités acceptées et les tests de concurrence. Aucun test d'abus sur la production n'a été lancé. « Sécurité rétablie » par une simple comparaison est excessif.

## 1.3 — Mémoire de l'export Android de mèmes

**PARTIELLEMENT CONFIRMÉ — risque élevé sur gros exports locaux, crash non reproduit et fonctionnalité non publiée.**

- Preuves : fichier Java local non suivi `android/app/src/main/java/com/creatordeck/app/MemeExportPlugin.java:26` décode tout ; `:38` le fait avant le sélecteur, `:56` recommence après. `src/lib/native-meme-export.ts:15` construit déjà une chaîne base64. Limite de 25 Mio dans les deux couches.
- Les deux tableaux Java sont alloués successivement ; le premier n'est pas retenu explicitement entre les callbacks. Leur présence simultanée dépend du GC. Le chiffrage « plus de 100 Mo » et les 60 % de gain ne sont pas mesurés. Le heap Java et celui de la WebView ne se confondent pas ; le nombre exact de copies et leur encodage ne sont pas établis.
- Nécessaire avant publication : supprimer le décodage complet de prévalidation, conserver limites et validation finale, effectuer l'écriture/décodage lourd hors du chemin UI ; préférer un décodage en flux si les mesures justifient son coût. Le code actuel écrit un tableau entier dans un flux : ce n'est pas du décodage en streaming.
- Régression : fichier malformé accepté jusqu'au choix de destination, fichier vide/partiel en cas d'erreur, annulation SAF, type MIME, taille exacte et cycle de vie Android. Tester grand GIF et appareil à heap réduit ; 1,5 Go de RAM totale ne décrit pas à elle seule la limite du heap. Un décodage unique n'offre aucune immunité contre l'OOM, notamment pendant l'encodage GIF (`src/lib/meme-editor.ts:79`).

## 2.1 — Portraits et poids de l'APK

**Relevé des candidats uniquement — 22 octobre 2026, base locale `474fda7`.**
Les 454 slugs ci-dessous ont un override manuel non vide et un fichier
`public/creators/<slug>.webp` présent, dont l'URL racine n'est référencée par aucun
des 1 000 portraits résolus du catalogue actif. Liste vérifiée : aucun manquant
ni surplus, 7 539 940 octets bruts au total. Aucun fichier supprimé ou déplacé.

**PARTIELLEMENT CONFIRMÉ — gravité faible à modérée, nettoyage utile mais gain annoncé fortement surestimé.**

- Preuves : priorité manual/curated/provided dans `src/lib/creator-portraits.ts:23`. Mesure réelle : racine 1 001 fichiers, 16,603 Mio ; manual 454 fichiers, 17,312 Mio ; curated 31 fichiers, 3,712 Mio. Les **454 racines masquées pèsent 7,191 Mio**, pas 25 Mio. Les 454 chemins manuels sont utilisés par le catalogue actif : déplacer tout `manual/` hors de public casserait les portraits.
- Candidats seulement, à examiner sans suppression : les fichiers racine `.webp` dont le slug a un override manuel, donc n'est pas choisi par l'URL portrait du jeu. Les 454 slugs présents à la fois dans `public/creators/` et `manual-portrait-overrides.json` sont : 9pasha, ache, ade3-3, adinross, afoninje, aimbrot, aimlul, airwaks, akamikarubi, akuasmr, alanzoka, albralelie, alderiate, alinity, alohadancetv, alois-nl, alpha54, alphacast, alvivb, aminematue, amixem, amouranth, anaee, anderzel, anniefuchsia, anthonydaytv, antilipsi, antoinedaniel, anyme023, arquel, asmongold, asmongold247, asmr-kotya, at0mium, auronplay, averagejonas, awfdota, axoskilllive, aypierre, bagginstv, bagherajones, baiano, bateson87, batora324, baxadoto, bersgamer, bikinibodhi, blastdota, bob-lennon, bobross, bonkol, boyminoru, bratishkinoff, brothers-baseball, broxah, buster, button, byilhann, bysl4m, cabochardlol, cacto0o, caedrel, carola, caseoh, casimito, cdnthe3rd, cellbit, chap, chap-gg, chilledchaos, chloe-irl, chowh1, cineillojuan, cinkrofwest, clemquicourt, clixoffline, cloakzy, closetape, cohh, cooruja, coscu, couragejd, crazyraccoonyy, croissantstrike, crream, crystalst, cs2-maincast, cs2-paragon-ru, cyr, dada-0124, dafran, dakillzor, davenite, dedadam, dendi, derhardi, des0ut, deujna, dezgamez, dezignful, dfg, diamkey, diehahn, dieservincentg, dmitry-lixxx, doigby, domingo, doublelift, dreadztv, dream, drjayfisto, dttodot, dyanna, ebrufc, elmariana, emiru, esfandtv, eslcs, etoiles, etokeking, ettnix, evangelion0, ewroon, exsl95, extraemily, f0rest, fairypeak, faker, fanfan, felps, ferra, fifakillvizualz, fildrong, fissure-dota-ru, fiveskill, folagorlives, forsen, forzorezor, freemok, fruktozka, gamelifeow, gaules, gentlemates, georgenotfound, gerardromero, ghostik, gingitv, gius, glorious-e, gobgg, gom4rt, gotaga, graycen, greekgodx, greentea, grimm, gtimetv, haitani0904, hanssama, happasc2, happyhappygal-vod, harmii, henkovic, honeypuu, hugodecrypte, hugodelire, humzh, hungry, hydramist, ibai, ikoma-dogura, ilame, illojuan, im-mittiii, imcarolinaabril, indegnasen0706, inoxtag, ironmouse, ishowspeed, itszedar, izakooo, jahrein, jaimemellado, jankos, japabigodin, jeanmassiet, jeefhs, jennyan, jinnytty, jltomy, joeykaotyk, jointhesystemm, jolavanille, jongie, josie5297, joyca, juansguarnizo, jukeyz, jynxzi, jynxzi247, kaatsup, kaicenat, kamet0, karljacobs, karmikkoala, karminecorp, karni, katie, kato-junichi0817, kayane, kaydop, keanelol, keliencs, kenbogard, kerimch1k, kinstaar, kolderiu, kragiee, krl-stream, krolay, kungentv, laink, lazarbeam, lebouseuh, leva2k, lilypichu, lirik, littlebigwhale, locklear, loeya, logo, loochytv, loserfruit, loupiote, lplenglish, lucasmorotv, ludwig, luhliv1, lusorkoeffizient, lutti, luzu-tv, maestrosquad, maghla, magican, malinkaa98, mandatory, mastu, matthdgamer, maximebiaggi, maximocuevas, mayucca, mcflyetcarlito, melharucos, meloonie, membtv, merryweather, mfreak00, michou, midorokun, minibo0, minpojke, missasinfonia, misscoookiez, misterjday, mistermv, mizkif, ml7support, mmorpg, moauba, modiiie, moman, montanablack88, muselk, mynthos, nadeshot, naowh, nickmercs, nico-la, nikof, ninja, nmplol, nugiyen, oatley, off-kuka358, ohnepixel, ohtofu, oilrats, okcode, olgaenvivo, onigiri, oniyadayo, orzanel, otplol, ow-esports-jp, painlivestream, papaplatte, pch3lk1n, peeve, pelaajatcom, pengu, penta, perfecto-of, peterbot247, pewdiepie, phantasm, philza, piratesoftware, pokelawls, pokimane, poko, pollynette, ponce, posty, preachlfw, pubgthailandofficial, qq7925168, qtcinderella, quackity, radika1fa, ramzes, rasco100, raskology, rax1337, rdulive, rebeudeter, recuerd0p, rekinss, relaxbeats, ren-kisaragi, repaz, reventxz, rewinside, rhobalas-lol, riberaribell, ribodanslasauce, rifftrax, riirex, rivenzi, rivers-gg, robcdee, rtparenacs, rubius, rubsarb, rxnexus, s1mple, sackzi, saken-lol, saltybet, samueletienne, sapnap, sardoche, sarenewild, scump, shaiiko, sharonqueen, shaunz, sheevergaming, sheshounet, shevronin, shinjifromjapanxd, shrood, shroud, shuteye-orange, sieglinde, silvername, sirmaza, sixquatre, skill4ltu, skyroz, skywhywalker, skyyart, snapiyy, sodapoppin, solary, solaryhs, sologesang, splinter, spreen, squeezie, stodeh, stokes, strogo, summit1g, sunni, superjj, swehyt, sykkuno, sylvainlyve, symfuhny, szelioficjalnie, ta1yo-tv, taaaao, tarik, terracid, th3antonio, theburntpeanut-247, thegrefg, thenicolet, theodort, theviper, thewhelps, thip, tim-latka, timado, timthetatman, tolkin, tommyinnit, tpabomah, trainwreckstv, traytonlol, trymacs, twitchfarming, typicalgamer, ultia, v1nkub, valentisanjuan, valkyrae, valouzz, vatira, vitality, vorterixok, vovapain, wankilstudio, watchfultv, watchfultvb, wen620, willneff, wisethug, worstpremadeever, xakoh, xari, xhankyy, xiuder, xop0, xpazzoo, xqc, y0nd, yetr, yosoyricklive, yulla, yutapongo, yuyuta0702, z60411, zacknani, zarbex-tv, zchum, zeling, zerator, zerggyyyy, zerost-s, zevent, ziqoftw, zonixxcs, zyro.
- Faux positif précis : `upscaled-portrait-overrides.json` sert encore à `src/components/image-credits.tsx:37` et `:45` pour le nombre et la liste des 699 versions archivées. L'import n'est pas mort. Les images upscaled sont déjà déplacées vers archive dans l'index local ; ce travail n'est pas attribué à cet audit et n'est pas encore publié.
- Aucune suppression n'est décidée ici. La liste ci-dessus désigne uniquement les candidats définis par l'override manuel et le fichier racine présent ; leurs usages hors du résolveur de portrait restent à vérifier avant toute éventuelle action.
- Régression : portraits cassés au fallback, restauration/import de catalogue, créateurs retirés, tests et scripts de sourcing. Mesurer l'APK avant/après ; la taille brute de public n'est pas la taille gagnée dans l'APK.

## 2.2 — Ancien simulateur « Ta chaîne »

**PARTIELLEMENT CONFIRMÉ — dette de maintenance réelle, priorité faible à modérée.**

- Preuves : retrait de l'écran explicitement décrit dans `src/components/creator-deck-app.tsx:79`. Le moteur importe encore streamer (`src/lib/game-engine.ts:30`), l'état possède `streamer` (`:208`, initialisation `:699`), le chargement le normalise (`src/lib/save-store.ts:253`, `:375`), le store cloud expose les actions (`src/lib/cloud/cloud-store.ts:544`). Le JSON est importé par `src/lib/streamer.ts:23`.
- Le sous-système n'est plus accessible par l'interface, mais « entièrement mort » est imprécis : initialisation, normalisation et stockage tournent encore. Le nombre d'occurrences et la taille source ne prouvent pas 60 Ko de JS livré ; tree-shaking, minification et compression doivent être mesurés. Les appels réseau des actions ne partent pas simplement parce qu'elles sont importées (`src/lib/cloud/store/streamer.ts:167`).
- Nécessaire : si le retrait est définitif, supprimer les actions et imports clients, définir explicitement la conservation ou l'abandon des anciens champs lors de la migration. Ne pas retirer automatiquement les migrations ni les tests SQL de fonctions serveur toujours déployées : décommissionnement serveur distinct.
- Régression : sauvegardes anciennes, fusion cloud/local, récompenses historiques et dépendances partagées (jour, jetons, carte sacrifiée). Gain utilisateur inférieur à celui d'une correction de session ; ne pas lancer une purge serveur globale pour gagner quelques champs locaux.

## 2.3 — `googleapis`, `three`, renderer orphelin

**CONFIRMÉ — gravité faible, excellent petit nettoyage.**

- Preuves : dépendances dans `package.json:45` et entrées three/types ; recherche des imports applicatifs et scripts : aucun import du SDK googleapis ; les URL `googleapis.com` de `notify-live` sont des requêtes REST, pas un usage du paquet. `src/lib/pack-foil-renderer.ts:2` est le seul import actif trouvé de Three et sa fonction `:11` n'a plus d'appelant.
- Nécessaire : retirer le renderer orphelin et les trois dépendances directes, recalculer le lockfile, typecheck/build. Vérifier les scripts hors application avant retrait définitif.
- Régression : faible si la recherche des appelants reste vide. Cela allège surtout installation/CI, pas nécessairement le JS ou l'APK : un paquet installé mais jamais importé n'est pas automatiquement livré. « Plusieurs centaines de mégaoctets » non mesurés ; « zéro risque de leak 3D » n'est pas un bénéfice pertinent d'un renderer non appelé.

## 2.4 — Écriture synchrone de sauvegarde

**PARTIELLEMENT CONFIRMÉ — risque de performance modéré, saccades non établies.**

- Preuves : `src/lib/game-store.ts:67` sauvegarde avant `emit()` ; `src/lib/save-store.ts:451` effectue JSON.stringify puis setItem synchrones. Le recyclage groupé existe déjà (`src/lib/game-store.ts:187`) : il ne faut pas assimiler une action de groupe à 50 sauvegardes indépendantes.
- Nécessaire : mesurer durée d'écriture et taille d'une collection représentative sur WebView avant changement. Si coûteux, regrouper les écritures avec politique explicite de durabilité, ordre et flush natif (pause/appStateChange), pas seulement beforeunload.
- Recommandation risquée : `queueMicrotask` ne fournit pas une période d'inactivité et peut encore s'exécuter avant le prochain rendu ; il ne garantit pas un frame libéré. `requestIdleCallback` peut tarder. Un arrêt Android n'assure pas la livraison de beforeunload/visibilitychange.
- Régression : perdre les dernières cartes ou dépenses au kill, réordonner les sauvegardes, envoyer une ancienne version au cloud via onPersist, écraser une modification d'un autre onglet. La persistance immédiate est une protection réelle. Ne pas la sacrifier pour une promesse non mesurée de 60/120 fps.

## 2.5 — Geste de déchirure et rendus React

**PARTIELLEMENT CONFIRMÉ — zone de coût crédible, gravité modérée sous réserve de profilage.**

- Preuves : `src/components/pack-tear.tsx:340` copie le chemin et met à jour trois états ; `:170` recalcule sa frontière. `:323` parcourt aussi tout le chemin pour les extrema. Le filtre de distance `:317` réduit les points ajoutés mais les mises à jour suivent même sans ajout. `smoothPeelEdge` parcourt le chemin (`src/lib/peel-geometry.ts:18`).
- Trois setState dans un événement ne signifient pas trois rendus : React les regroupe. Fréquence des événements, durée de rendu et frames perdues n'ont pas été mesurées ici. La fluidité 120 fps ne peut pas être déduite d'une réécriture RAF.
- Nécessaire : profiler des gestes longs et appareils modestes ; si le coût est confirmé, limiter à un calcul visuel par frame et éviter les scans répétés inutiles. Conserver la géométrie métier et l'ordre chronologique des points. Une mutation de styles directe n'élimine pas le coût CSS/clip-path/peinture.
- Régression : ouverture sur petit geste, seuil de relâchement, trace inversée, annulation, rendu des deux univers, accessibilité et mouvement réduit. Tests de géométrie et gestes Android avant/après indispensables. Réécriture impérative complète prématurée sans mesure.

## 3.1 — Petites polices et zoom Safari

**PARTIELLEMENT CONFIRMÉ — risque UX faible sur la cible Android, pertinent pour Safari iPhone.**

- Preuves : `src/app/globals.css:1697` recherche 14 px, `:2705` compte 12 px, `:3298` Arène 13 px, `:3460` Tribunal 14 px, `:2193` éditeur de sauvegarde 12 px. Le viewport ne bloque volontairement pas le zoom (`src/app/layout.tsx:49`).
- Nécessaire : vérifier les styles effectivement calculés puis tester Safari ; passer les champs mobiles concernés à 16 px si nécessaire, en préservant le zoom utilisateur. La présence d'une petite police n'est pas une reproduction de viewport cassé. Pas de défaut Android démontré par cette règle iOS.
- Régression : débordement des formulaires, boutons poussés hors écran, hauteur du clavier ; ne pas appliquer aveuglément un agrandissement à tous les contextes desktop ni désactiver le pincement. Aucun test Safari/iOS réalisé pour cette contre-expertise.

## 3.2 — Horloges chaque seconde

**CONFIRMÉ pour les rendus superflus — gravité faible ; impact batterie non mesuré.**

- Preuves : `src/components/missions-view.tsx:196` utilise la seconde uniquement pour vérifier gameDay ; `src/components/meme-deck.tsx:39` rend toute la vue pour le compteur `:70`. Hook intervalle dans `src/hooks/use-game.ts:23`. Le filtre de collection est déjà mémorisé (`meme-deck.tsx:49`) : il n'est pas entièrement recalculé chaque seconde.
- Erreur de Gemini : la journée du jeu change à **6 h UTC**, pas à minuit (`src/data/progression.json:24`, `src/lib/progression.ts:148`). Le montage des écrans et le throttling navigateur empêchent aussi d'inférer une consommation permanente en arrière-plan.
- Nécessaire : minuterie au changement réel du jour, relecture au retour au premier plan ; isoler le compteur Mèmes si son coût est utile à réduire. Une période de 60 s introduit jusqu'à une minute de retard, à accepter explicitement.
- Régression : disponibilité Paquet Scène autour de 6 h UTC, horloge système modifiée, reprise après veille, compteur de réserve figé. Petit lot mesurable ; pas de promesse de « zéro rendu » global car d'autres stores changent légitimement.

## 3.3 — Imports statiques des feuilles

**CONFIRMÉ pour l'absence de chargement différé ciblé — gravité faible à modérée, gain à mesurer.**

- Preuves : imports statiques `src/components/creator-deck-app.tsx:18`, `:28`, `:31` à `:35`. Les feuilles secondaires sont donc dans le graphe initial de cette route ; masquer leur JSX ne rend pas leur import paresseux.
- Nécessaire : relever les chunks/temps de démarrage, différer quelques grosses feuilles réellement secondaires si le gain est significatif. `ssr:false` n'est pas une condition générale du découpage ; le choisir seulement si requis. Prévoir fallback accessible et récupération d'échec du chunk.
- Régression : premier clic plus lent, focus avant disponibilité du contenu, retour Android pendant le chargement, cache/version périmée du site, ressources absentes hors ligne. L'APK lit les chunks localement : les enjeux réseau diffèrent du web. Aucun gain de 40–60 Ko gzip n'est établi sans build comparatif.

## 3.4 — Focus des feuilles

**PARTIELLEMENT CONFIRMÉ — gravité modérée pour clavier/technologies d'assistance.**

- Preuves : overlays role=dialog/aria-modal sans confinement local dans `src/components/account-sheet.tsx:115`, `market-sheet.tsx:71`/`:80`, `arena-sheet.tsx:213`. Le retour Android existe déjà via `src/components/creator-deck-app.tsx:295` à `:304` ; absence d'Échap ne signifie pas absence de fermeture Android.
- Faux positif pour l'éditeur local : `src/components/meme-editor.tsx:109` est une section dans un **dialog natif ouvert avec showModal()** (`src/components/meme-deck.tsx:43`, `:109`, `:112`). Le navigateur fournit la modalité, le confinement et Échap ; un second piège dans l'éditeur n'est pas nécessaire par principe.
- Reproduction Chromium locale exécutée après le vrai onboarding : Réglages → Mon compte, puis 35 Tab et Échap. Résultat : focus sorti de « Mon compte », dialogue encore ouvert après Échap, code 0. Le défaut est donc reproduit pour le compte ; Arène et Marché sont ici vérifiés par lecture, pas par un parcours connecté. Premier essai bloqué par la sandbox réseau, deuxième arrêté par l'onboarding ; le troisième suit ce parcours et aboutit.
- Nécessaire : reproduire puis corriger les overlays personnalisés avec une gestion de pile et retour de focus. Ne pas brancher mécaniquement `usePresentationFocus` partout : il rend `.app-shell` inert (`src/hooks/use-presentation-focus.ts:12`), alors que ces feuilles sont rendues dans cette coquille, et son sélecteur `:18` ignore notamment inputs/liens/summaries. Il n'implémente pas Échap.
- Régression : rendre la modale elle-même inerte, faire agir deux pièges superposés, fermer la mauvaise feuille, perdre la saisie ou le focus au retour. Tester compte ouvert depuis Réglages, feuilles imbriquées, Tab/Maj+Tab, Échap et Retour Android.

## 3.5 — Optimisation `lucide-react`

**NON CONFIRMÉ — faux positif, aucune correction nécessaire.**

- Preuve décisive dans la version réellement installée : `node_modules/next/dist/server/config.js:1121` fusionne les valeurs utilisateur avec les valeurs par défaut ; `:1125` contient déjà `lucide-react`. Voir aussi [documentation officielle Next](https://nextjs.org/docs/pages/api-reference/config/next-config-js/optimizePackageImports).
- Ajouter la configuration proposée répète donc une valeur existante. Le gain de compilation annoncé de 10–15 % ne découle pas de ce changement. Ne pas confondre absence d'une option explicite et absence de la fonctionnalité.
- Risque de régression très faible mais maintenance inutile d'une option expérimentale. Faire une mesure de build si une lenteur existe ; aucune justification pour ce chantier précis.

## 3.6 — Préchargement de musique

**PARTIELLEMENT CONFIRMÉ — arbitrage de performance, gravité faible à modérée.**

- Preuves : montage `src/components/creator-deck-app.tsx:174`, fetch/décodage `src/lib/sfx.ts:525` à `:534`, fichier mesuré **853 868 octets**. Le préchargement est ignoré si musique muette, déjà chargée/en cours ou AudioContext indisponible ; la création du contexte est protégée (`sfx.ts:575`). Le décodage est asynchrone. La boucle peut aussi allouer un buffer supplémentaire (`:466`).
- Nécessaire : comparer temps de démarrage et première lecture avec préchargement après rendu/inactivité, garder un repli et le respect de la préférence muette. Le code explique son objectif légitime : éviter une première action silencieuse.
- Les ~10 Mo PCM et le ralentissement initial ne sont pas mesurés. Sur APK, l'asset est embarqué : parler de concurrence de téléchargement internet comme sur Vercel est trompeur ; lecture/décodage local restent un coût.
- Régression : musique tardive, première révélation silencieuse, restrictions autoplay, double source ou double chargement. Attacher uniquement à la première interaction peut déplacer la latence exactement sur le geste à protéger. Ni urgence critique ni gain garanti.

## Priorités recommandées et impact/effort

| Rang | Lot réellement justifié | Impact / effort | Conditions et limites |
|---|---|---|---|
| P1 | 1.1 : refresh partagé, refus temporaires, résultats périmés | Élevé / faible à moyen | Défaut reproduit ; couvrir changement de compte et logout. |
| P1 avant publication éditeur | 1.3 : supprimer double décodage, borner et mesurer mémoire | Élevé sur gros exports / moyen | Travail local, pas incident prouvé dans l'APK actuelle. |
| P2 | 3.4 : focus des overlays personnalisés | Moyen / moyen | Corriger la pile ; ne pas ajouter un piège au dialog natif. |
| P2 | 1.2 : contrat d'accès refresh-live et durcissement | Moyen / faible à moyen | Vérifier passerelle et limitation ; la clé publique n'est pas un secret. |
| P2 | 2.3 : dépendances et renderer inutilisés | Faible utilisateur, bon entretien / faible | Gain CI ; pas une faille de jeu. |
| P2 | 2.1 : images réellement masquées | Moyen pour distribution / moyen | 7,191 Mio bruts identifiés, autres candidats à valider ; garder manual. |
| P3 | 3.2 : horloges ciblées | Faible / faible | Réveil 6 h UTC, retour au premier plan. |
| P3 après mesure | 2.5 : rendu du geste ; 3.3 : feuilles différées ; 3.6 : audio | Potentiellement moyen / moyen | Profils avant/après, pas de promesse 120 fps. |
| P3 maintenance | 2.2 : retrait client streamer | Faible à moyen / moyen à élevé | Migration de sauvegarde ; serveur distinct. |
| P3 conditionnel | 3.1 : Safari ; 2.4 : persistance différée | Faible sur Android / variable | Safari non testé ; durabilité prioritaire pour les sauvegardes. |
| À écarter | 3.5 : ajouter lucide aux imports optimisés | Nul / inutile | Déjà actif par défaut. |

Les cinq chantiers de Gemini sont des regroupements, pas des dépendances techniques établies. Inutile de conditionner un correctif de focus à une purge de streamer ou à l'élagage des portraits. Aucun P0 bloquant généralisé n'est démontré par cette contre-expertise.

## Vérifications et limites

- Lecture intégrale du rapport et des fonctions concernées ; recherche des appelants et des protections ; mesure réelle des fichiers et des chemins de portraits ; reproduction CloudApi isolée, code 0. Le transport fictif reproduit un entrelacement possible, pas la fréquence de cet incident en production.
- Reproduction clavier Chromium de Mon compte : code 0, focus échappé et Échap sans fermeture. Aucun fichier applicatif modifié ; contexte navigateur de test jetable.
- CI du SHA audité consultée : Vérification [39697720071](https://github.com/GoodFight37/CreatorDeck/actions/runs/39697720071), APK [39698325364](https://github.com/GoodFight37/CreatorDeck/actions/runs/39698325364), Supabase [39698325408](https://github.com/GoodFight37/CreatorDeck/actions/runs/39698325408) terminées avec succès. Cela établit les contrôles du code publié, pas ceux de tous les travaux locaux.
- Pas de nouvelle suite complète : l'application n'a pas été modifiée pour cet audit. Pas de profilage mobile, test OOM, Safari réel, test d'abus distant ni mesure comparative de bundle. Les pourcentages de gain, FPS constants et immunités annoncés par Gemini ne sont pas des résultats expérimentaux.
