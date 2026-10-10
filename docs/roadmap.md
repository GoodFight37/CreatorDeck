# Roadmap CreatorDeck

## Référence de coordination — audit du 10 octobre 2026

Cette section décrit le **présent** ; les sections antérieures conservées plus
bas sont l'historique, avec leurs retraits et validations datées. Le code et les
tests priment sur une ancienne case cochée. Voir [passation](agent-handoff.md),
[décisions](decisions.md), [problèmes](known-issues.md) et [périmètre](perimetre.md).

**Vision :** jeu de collection Twitch mobile, quatre piliers Drop/Binder/Craft/Toi,
des ouvertures lisibles et tactiles, économie multijoueur tenue par Supabase.
La simulation « Ta chaîne » reste retirée de l'interface ; son moteur conservé
n'est pas une fonctionnalité à remettre par défaut. Aucune refonte dans cet audit.

**Révision auditée :** `4955d9bbd489777c6ffd74229613075a332cc9e9`, branche
`design/booster-reveal-polish`. [PR #8](https://github.com/GoodFight37/CreatorDeck/pull/8)
en brouillon, base réelle `arena/01a10c75-creatordeck` (`6c46e4bec37dc91a32f368b586e59ce109a44784`).
`main` (`ae5016f093c977e68943d92f5a7c3da17bca8021`) est beaucoup plus ancien.
Ces observations doivent être revérifiées à chaque reprise, pas utilisées comme
instructions de reset ou d'envoi vers main.

### Fonctionnalités présentes dans le code

| Ensemble | État constaté | Validation restante / référence |
|---|---|---|
| Catalogue 1000, tirage/Perfect/Gold/pity, jetons, missions et saisons | Implémenté en TS et SQL | Taux et tests miroir ; contrôler le build et la base cible |
| Collection, filtres/pagination, craft/recyclage, thèmes | Implémenté | Tests unitaires/écrans et usage mobile |
| Comptes, sauvegarde, échanges, amis, hôtel, Last Pack, arène | Implémenté côté client et migrations | Une implémentation ne prouve pas le déploiement Supabase actuel |
| Direct Twitch, notifications, fonctions Edge | Code présent | Configuration distante/FCM et appareil à vérifier |
| Tribunal des Bannis | Implémenté, migration `0042` présente | Présence de `0042` en production non vérifiée par cet audit |
| Simulation « Ta chaîne » | Retirée de l'interface, moteur/tests conservés | Retour hors roadmap sans décision produit |
| CI qualité, SQL et navigateur | Workflow `verification.yml` présent | État des runs GitHub à consulter séparément |
| Ouverture imprimée Live/Scène et révélation continue | Implémentée sur branche, **validation en cours** | PR #8 ; critères ci-dessous |

### Priorités actives

| ID / priorité | Travail / statut | Dépendances | Critères d'acceptation |
|---|---|---|---|
| COORD-01 / P0 | Coordination permanente — livrée (checkpoint `beb1261a` vérifié sur GitHub) | Branche/PR vérifiées, publication Git | Cinq documents autonomes, historique préservé, tests distingués, commit et contenu confirmés sur GitHub ; compléments d'audit dans la passation |
| VIS-01 / P1 | Valider la scène unique booster → cinq dos → révélations | PR #8, `pack-tear`, `reveal-overlay`, CSS de continuité | Suites écrans/E2E pertinentes ; geste et bouton de secours utilisables au tactile/clavier ; absence de rupture/spinner/labels superposés ; validation humaine sur téléphone, bureau et réduction d'animations ; preview `2d933c9` déployé, verdict humain en attente |
| QA-01 / P1 | Rendre le test SQL d'arène déterministe et terminer les preuves CI/navigateur — **SQL corrigé**, focus K-010 corrigé et E2E ciblés 2/2 ; CI verte au SHA `2d933c9` | K-007, accès Chromium (K-008), GitHub CI | Contrôle « hors week-end » indépendant de la date réelle : 559/559 réussis le 10 octobre, fenêtres fermée/ouverte imposées et dates explicites vérifiées ; E2E joués le 10 octobre : 24 réussis / 2 échecs de focus, puis 2/2 cloud simulés ; K-010 corrigé ensuite (`4b9fcca`), même scénario bureau/téléphone 2/2 ; run CI #235 vert au SHA `2d933c9`, quatre jobs réussis ; cloud simulé sans valeur de preuve en production |
| CLOUD-01 / P2 | Vérifier la version distante et les parcours en ligne | Accès autorisé au projet, variables publiques, statut `schema_versions()` | Version constatée depuis la base cible ; invité/compte, tirage, sauvegarde et Tribunal vérifiés ; aucune migration supposée appliquée sur simple présence dans Git |

Les préférences encore ouvertes du dossier d'atelier (dos/halo, éclat, Perfect,
limites de sélection) sont des demandes de validation, pas des décisions prises
par cet audit. Ne pas modifier les probabilités ou ajouter un chantier sans demande.

### Historique conservé de la roadmap antérieure

Les statuts « En place & Validé » ci-dessous reflètent les livraisons de leur
date. En particulier, l'ancienne ligne « Suite de tests Playwright & Vitest »
ne signifie plus que ces suites seraient absentes : elles existent maintenant.

## 📱 Volet 1 : Application Principale (TCG & Cloud)

### En place & Validé
- [x] Moteur de tirage & Taux de drop publiés (pity à 12, Perfect, Gold à 1 %, Live)
- [x] Cloud Supabase sécurisé (comptes, inventaire, échanges atomiques, hôtel des ventes)
- [x] Statut Twitch en direct & notifications push FCM (APK)
- [x] Arène hebdomadaire, wishlist publique & Last Pack protégé
- [x] Export Vercel & contrôle automatique du cloud au build (`cloud-guard.mjs`)

### Chantiers en cours / Améliorations
- [x] **« Du jus » : les moments rares se voient** (8 octobre 2026) : un **éclat** sur une Épique, un grand **éclat** (une fois et demie plus large) et un écran blanc sur une Légendaire comme sur un Perfect (planches pixel-art découpées en CSS, partant **avec** le son, coupées par le réglage des reflets), l'**achat d'un palier** qui fait vraiment entrer l'objet dans la pièce — il tombe, et la fumée marque l'endroit — et l'**emblème d'Arène** posé sur l'étagère du Studio (le pont TCG → Studio : ce qui se gagne dans l'Arène se voit chez soi)
- [x] **Les crédits, et un carnet qui vise juste** (8 octobre 2026) : un écran **Crédits** discret sous « Toi » (Kenney pour le décor, unTied Games pour les effets — la ligne que sa licence demande —, Chequered Ink pour les bruits, Twitch, Lucide, les polices), et les notifications d'**échange** qui ouvrent la feuille de compte **sur la section des échanges**, panneau déjà ouvert et déjà à l'écran
- [x] **Les 1 000 cartes tiennent dans le DOM** (8 octobre 2026) : plutôt que de chronométrer (une durée en jsdom ne dit rien du téléphone), un banc **compte** — avec tout le catalogue possédé, la recherche qui matche des centaines de noms et le filtre par rareté, le classeur pose **9 cartes** (une page de 3 × 3) et l'Atelier **20 lignes**, portraits compris ; le seul endroit qui rendait la liste entière était l'onglet **Recycler**, qui posait ses ~330 doublons d'un coup — il se feuillette désormais comme le reste (et se **cherche** : nom, identifiant, région, rang ou variante), « Tout recycler » emportant toujours tout
- [x] **Les longues listes se feuillettent** (8 octobre 2026, le soir) : le **classement mondial** demande cent joueurs au lieu de vingt (le serveur en accepte cent) et en pose **vingt par page**, avec le pager du classeur, le retour à la première page quand on change de tri, et **aucun pager** quand il n'y a qu'une page ; aux **échanges**, « Tu donnes » s'arrêtait à 24 cartes **sans le dire** — elle se feuillette par 24 et annonce la tranche (« Cartes 1–24 sur 60 ») : les cartes suivantes existaient, le joueur ne pouvait ni les voir ni les choisir
- [x] **Le Tribunal des Bannis** (8 octobre 2026, au soir) : un mode **100 % interface** — cinq appels par journée de jeu, tirage déterministe par `(journée à 6 h UTC, joueur)`, verdict au pouce (grâce / maintien), **Karma de modération** et jusqu'à **40 points de craft** par séance (×2 si le créateur qui préside est en direct). La carte qui préside se choisit dans le classeur ; l'argent est versé par le **serveur** (`0042_tribunal.sql`, à coller : `npx supabase db push`), qui recalcule le karma — l'appareil n'en fabrique aucun. Cf. `docs/historique-livraisons.md` § 11.58
- [ ] Suite de tests Playwright (`npm run e2e`) & Vitest
- [x] **Polissage visuel & haptique** (8 octobre 2026, le soir) : le reflet Holo/Gold **suivait déjà le doigt** (écrit en direct sur le foil, sans re-rendu) et le tirage du booster **vibrait déjà** au franchissement du seuil — les deux sont maintenant **prouvés par un banc** (`navigator.vibrate` compté : une seule vibration, et zéro quand le son est coupé). Cf. `docs/historique-livraisons.md` § 11.56
- [x] **Finition UX « consumer-grade » (8 octobre 2026)** : plus un mot d'infrastructure à l'écran (`scripts/check-jargon.mjs`, gardé par `src/lib/jargon.test.ts` sur les composants, les pages et **tous** les modules qui portent des phrases), un **carnet de notifications dont chaque ligne mène au bon écran** (`KIND_TARGETS`), et un écran **Mon compte** sans boutons de sauvegarde : pastille verte « Progression synchronisée », adresse masquée, et le choix entre deux parties **seulement** quand il y en a deux

---

## 🎮 Volet 2 : Mini-Jeu "Ta Chaîne" (Streamer Simulator)

### En place & Validé
- [x] Mécanique pure (formats de vidéo, 5 paliers de notoriété, JSON)
- [x] Tables SQL Supabase & gestion des abonnés (`0036`)
- [x] Écran d'accueil & feuille de chaîne basique
- [x] Imprévus du jour (cartes à swipe) & « Ton setup » en 5 paliers de points (`0038`)
- [x] Mini-jeu interactif de 20 s (Live, chat qui défile, bulles d'alerte)
- [x] Invités sur le bureau (2 cartes du classeur, bonus Raid si le créateur est EN LIVE)
- [x] Bureau **visuel** : la scène du studio (objets qui s'allument avec le setup, vraies cartes sur socle, aura rouge du direct, bandeau « RAID ! ») et le **plateau** qui booste la vidéo du jour (`0041`, étape 8 de `docs/ta-chaine.md`) — **la scène est retirée depuis le 8 octobre 2026** ; le plateau, lui, booste toujours la vidéo du jour, et les invités vivent dans le bureau en cartes
- [x] **Refonte « jeu mobile » de l'écran « Ta chaîne »** : HUD (rang, jauge d'abonnés, rythme, jetons), socles, boutons bombés, notices remplacées par des badges — **le HUD est resté, en texte** depuis le retrait du 8 octobre 2026 (l'écran n'étant plus un onglet, il ouvre par la ligne « Ta chaîne » de l'accueil et gagne un bouton Retour)
- [x] **Le Studio s'habille et s'entend** (8 octobre 2026) : deux fenêtres posées sur les murs du kit (lumière froide), un second écran au palier *régie* — **les deux fenêtres sont parties avec la pièce** — et **15 bruitages embarqués** (cartes, pages, clics, feuilles, achats de setup, publication, raid) branchés sur les gestes — le bouton *Son* du profil les coupe tous (`docs/assets-sonores.md`)
- [x] **Le Studio devient un onglet plein écran, et la pièce passe aux vraies images** (étape 10 de `docs/ta-chaine.md`) : cinq onglets dans la barre du bas, plus de modale, et une **pièce isométrique du kit Kenney** (CC0) où chaque palier fait entrer son objet (`src/data/studio-room.json`, `src/lib/studio-room.ts`) — **retiré le 8 octobre 2026 au soir** : la barre revient à **quatre piliers**, la pièce, l'emblème d'Arène sur l'étagère et le kit Kenney (2,7 Mo) partent, le moteur ne bouge pas (`docs/ta-chaine.md` § 1)
- [x] Arbitrage du live de 20 s (scène d'immersion gratuite, tirage vidéo 100 % serveur)

### Prochaines étapes
- [x] **Paliers de setup avancés (Tycoon étendu) :** Financement des paliers 6+ via le sacrifice de doublons de cartes (Rares/Épiques) — livré le 8 octobre 2026 (`0040`, étape 7 de `docs/ta-chaine.md` : Rare = 1, Épique = 2, Légendaire jamais, une carte ne part qu'une fois)
- [x] **Retirer la simulation de streameur de l'application** (8 octobre 2026, le soir) : le décor isométrique ne rentre pas dans la direction que prend le jeu, et le joueur a demandé qu'on l'enlève **complètement** — plus d'onglet, plus de ligne d'accueil, plus d'écran. Le **moteur reste** (`src/lib/streamer.ts`, ses données, ses migrations, ses tests) : rien n'est perdu, rien n'est à recoller, et son dossier est `docs/ta-chaine.md`
- [ ] **Et ensuite ?** Rien n'est prévu pour la simulation : la remettre dans le jeu demanderait une direction visuelle ou un mode assumé — c'est une décision de produit, pas une dette
- [x] **Se déplacer ne sonne pas — jusqu'au bout** (8 octobre 2026) : onglets, portes, feuilles et réglages muets, puis les **deux derniers** sons de déplacement — le **filtre du Binder** et ses **pages** — retirés à la demande du joueur, le soir même. Il ne reste que ce qu'on **fait** : ouvrir un booster, révéler une carte, encaisser une récompense, refuser. Vérifié par un compteur dans le banc d'écrans (onglets, feuilles, filtre et pages : zéro son ; `docs/assets-sonores.md`)
- [x] **Les sons mesurés, et un volume réglable** (8 octobre 2026) : chaque bruitage est mesuré (RMS, crête) et ramené à sa cible de volume perçu — ce qu'on entend le plus souvent est le plus discret — et un réglage **Volume** (Discret / Normal / Fort) baisse toute l'application d'un cran, sous l'interrupteur *Son* (`docs/assets-sonores.md`)
- [x] **L'ouverture d'un paquet devient un moment** (8 octobre 2026, au soir) : entrée de carte avec rebond et halo par rareté, refus qui rougit, cascade sur le Perfect, et une **déchirure** de 700 ms entre le geste et la première carte (`src/components/pack-tear.tsx`). Rien ne boucle, tout est coupé par le réglage « Reflets des cartes » et par « moins d'animations » — un test le vérifie
- [ ] **Bilan & équilibrage des gains :** Ajustement des courbes de croissance (abonnés, vidéos, imprévus) après tests de jeu réels — **l'outil de mesure est là** (`npm run streamer:bilan`, 8 octobre 2026) : paliers et délais, gain moyen par format et par palier, choix d'imprévus, prix du setup, trente journées simulées (313 690 abonnés sans un point dépensé, 3 363 428 avec tout le setup). Il lit `src/data/streamer.json` par les fonctions du jeu et **n'équilibre rien** : la décision se prend en jouant
