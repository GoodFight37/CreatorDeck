# Plan « les cinq premières minutes » — 17 octobre 2026

Statut : **étape 1 écrite et branchée, non exécutée dans la suite Vitest/Playwright du dépôt**
(le registre npm était bloqué dans la session de rédaction). Rien n'est publié, aucune migration appliquée.
Branche locale `etape-1-mes-chaines`, aucun commit, aucun push.

## 1. Diagnostic (10 lignes)

1. Le premier contact apprend un bouton (« ouvre / range / reviens ») au lieu de donner une raison : le joueur n'a rien dit de lui.
2. Le premier booster tire dans 1 000 chaînes du monde : la 1re carte est une inconnue, la rareté vient du classement mondial, pas de ce que le joueur regarde.
3. L'accueil montre quinze surfaces (Tribunal, objectif, Scène, amis, arène, taux, sabliers, jetons, Mèmes) : le bouton n'est plus le sujet.
4. Réserve, garantie, sabliers, jetons et taux sont répartis dans trois accordéons.
5. Le message « Malik a décidé de réinitialiser… » est la première phrase du cadeau : c'est un chantier, pas un cadeau.
6. **Ce qu'on coupe de l'accueil** : tutoriel en 3 écrans, Tribunal, objectif du jour, paquet Scène, rangée d'amis, arène, sélecteur Mèmes (pour un joueur qui a un cercle).
7. **Ce qui reste** : le pack, le bouton, les 5 dernières cartes, un seul panneau « Réserve, taux et sabliers ».
8. Le premier booster ne contient que des chaînes que le joueur a nommées ; la dernière carte est Rare ou mieux **dans son cercle**.
9. Aucune règle d'économie ne bouge : la carte enregistrée garde sa rareté du catalogue, la rareté « de mon cercle » est de l'affichage.
10. **La phrase du jeu** : « Tu collectionnes les streameurs que tu regardes, et tu complètes ta collection en les voyant en direct. »

## 2. Plan par étapes

| # | Contenu | État |
|---|---------|------|
| 0 | Gel : ni taux, ni schéma, ni économie avant que l'étape 1 soit jouable. 0054 ajoute des objets, ne modifie aucune fonction existante. | tenu |
| 1 | « Mes chaînes » + premier booster tiré dans le cercle + accueil épuré | **écrit** |
| 2 | Un second verbe minuscule : « qui est en direct dans MON cercle » (A) | **écrit et testé** (D-138), non vérifié sur téléphone |
| 3 | Binder au service du désir | non écrit |
| 4 | Rétention honnête | non écrit |
| 5 | Finition visible à budget limité | non écrit |

### Étape 1 — arbre des fichiers

```
src/lib/circle.ts                     NOUVEAU  logique pure : lecture des noms, rareté locale, tirage du booster
src/lib/circle.test.ts                NOUVEAU  14 tests (lancés : 14/14 avec un petit shim, pas avec Vitest)
src/lib/circle-store.ts               NOUVEAU  cercle gardé sur l'appareil (useSyncExternalStore)
src/components/circle-onboarding.tsx  NOUVEAU  l'écran « Quelles chaînes regardes-tu déjà ? »
src/components/circle-onboarding.css  NOUVEAU  styles 390×844 (rendu vérifié, voir plus bas)
supabase/migrations/0054_cercle.sql   NOUVEAU  player_circles, set_circle, open_circle_gift_pack  (NON APPLIQUÉE)
src/lib/supabase-cercle.test.ts       NOUVEAU  miroir SQL ↔ TS (9 tests, lancés : 9/9 avec le shim)
src/components/creator-deck-app.tsx   MODIFIÉ  l'écran remplace les 3 étapes ; texte de cadeau neutre
src/lib/tutorial-pack.ts              MODIFIÉ  circlePreviewPack (aperçu invité dans le cercle)
src/hooks/use-pack-opening.ts         MODIFIÉ  l'essai invité utilise le cercle s'il existe
src/lib/cloud/api/{pack,index}.ts     MODIFIÉ  open_circle_gift_pack (repli sur le cadeau ordinaire), set_circle
src/lib/cloud/store/pack.ts           MODIFIÉ  openReturnGiftPack(circle?) ; displayRarity sur les cartes
src/lib/game-engine.ts                MODIFIÉ  DrawnCard.displayRarity?
src/components/reveal-overlay.tsx     MODIFIÉ  son, durée, étiquette et matière suivent la rareté du cercle
src/components/booster-carousel.tsx   MODIFIÉ  sélecteur d'univers optionnel
src/components/drop-view.tsx          MODIFIÉ  accueil épuré quand un cercle existe
```

### Règles du premier booster

- Cercle : 5 à 15 chaînes différentes, la première est la « préférée ».
- Rareté locale, par position : 1re Légendaire ; puis Épique jusqu'à 30 % de la liste, Rare jusqu'à 55 %, Peu commune jusqu'à 80 %, Commune ensuite (entiers, mêmes seuils en SQL).
- Poids des 4 premières cartes : 30/30/22/14/4 (commune → légendaire). Dernière carte, Rare ou mieux : 45/35/20. **Ces chiffres ne viennent pas de `pull-rates.json`** : à publier avec les autres taux avant toute mise en ligne, et à régler au premier essai réel.
- Cinq chaînes distinctes. Avec un cercle de 5, le booster contient tout le monde.
- Le serveur reçoit les slugs, les nettoie (doublon, inconnu, Sortant refusés), tire seul, écrit la carte avec **sa rareté du catalogue**. Le cadeau, son stock (5) et sa réclamation restent ceux de 0044/0045.
- Seul le **premier** booster du cadeau est tiré dans le cercle : le client n'envoie le cercle que si 5 boosters restent ; sinon le serveur refuse (« déjà ouvert ») et le client retombe sur le cadeau ordinaire.

### Vérifier en local (390×844, invité)

1. `npm ci` puis `npm run dev`, vider le stockage du site, ouvrir `/` en émulation 390×844.
2. L'écran « Quelles chaînes regardes-tu déjà ? » est la seule chose affichée. Le bouton reste grisé tant que la liste a moins de 5 chaînes.
3. Taper « kai » : suggestions. « Compléter avec les plus suivies » complète à 5. Valider.
4. Appuyer sur « Essayer » : 5 cartes, toutes dans le cercle, dernière Rare ou mieux (étiquette du cercle).
5. Accueil : pack, bouton, 5 dernières cartes, un panneau « Réserve, taux et sabliers » replié ; pas de Mèmes, de Tribunal, de Scène, d'arène.
6. Compte connecté (après application de 0054 sur une base d'essai, **avec l'accord de Malik**) : « Ouvrir mon premier booster » appelle `open_circle_gift_pack` une fois, puis 4 fois `open_return_gift_pack`.

### Tests à lancer (non exécutés ici)

- Vitest unitaire : `src/lib/circle.test.ts`, `src/lib/supabase-cercle.test.ts`, `src/lib/jargon.test.ts`, `src/lib/supabase-*.test.ts` (aucune ancienne fonction SQL n'a changé).
- Vitest `ecrans` : `src/ecrans.test.tsx`, `src/ecrans-reset-tutoriel.test.tsx`, `src/ecrans-tutorial-after-account.test.tsx`, `src/ecrans-tutorial-pack.test.tsx` — **adaptés à la lecture**.
- Playwright : `e2e/onboarding-gift.spec.ts`, `e2e/pack-crash.spec.ts`, `e2e/hourglass-online.spec.ts` (via `gotoDeck`, nouveau `answerCircle`) — **adaptés à la lecture**.
- Faits ici : scanner `node scripts/check-jargon.mjs` (propre), contrôle de syntaxe esbuild des fichiers modifiés, rendu de l'écran à 390×844 avec Chromium.

### Risques connus de l'étape 1

- Le SQL n'a jamais été exécuté (pas de base disponible). À passer par `scripts/verify-supabase-migrations.mjs` sur une base d'essai.
- `tsc` et `next build` n'ont pas tourné : un type peut encore casser (notamment le spread `displayRarity` dans le store).
- Les joueurs existants n'ont pas de cercle : ils gardent l'ancien accueil. Il manque une entrée « Définir mes chaînes » (étape 3 ; l'écran sait déjà fonctionner en mode `edit`).
- Un joueur avec cercle perd l'accès à Tribunal / Scène / arène depuis l'accueil : ils restent atteignables par Missions et les feuilles existantes, mais aucun chemin ne les remet en avant tant que l'étape 2 n'est pas écrite.
- Dans le panneau secondaire, les jetons restent un accordéon imbriqué : à aplatir.

## 3. Étape 2 — le second verbe : **A, « qui est en direct dans mon cercle »**

Argument : (1) le jeu sait déjà qui est en direct (`useLive`, bonus Direct) : zéro contenu à produire pour un développeur seul ; (2) il donne une raison de revenir à un moment précis, qui n'est pas une minuterie de réserve ; (3) il est vrai ou faux sans arbitrage : la chaîne est en direct ou non, donc pas de verdict secret ; (4) le micro-jeu (B) demande des questions, un équilibrage et de la triche à gérer.
Forme : une ligne au-dessus des cartes, « 2 de tes chaînes sont en direct », un appui ouvre la chaîne (Twitch) et la carte du cercle correspondante est marquée. Session vide : le bouton « Recharge en cours » devient « Voir qui est en direct dans mon cercle ». Arène et Tribunal quittent l'accueil (déjà fait pour les joueurs avec cercle) ; le Tribunal, s'il reste, devient un mode séparé sans verdict caché conditionnant le sablier.

## 4. Étape 3 — le Binder au service du désir (à écrire)

- Vue par défaut : mes chaînes (obtenues / manquantes), puis « en direct » ; la pagination par 12 devient un mode.
- Les familles de langues disparaissent des objectifs affichés.
- Une seule vue d'univers au premier lancement, Mèmes derrière un seuil.
- Cible d'artisanat : une carte du cercle. **Non vérifié** : je n'ai pas relu les règles d'artisanat ni leur RPC. Ne pas promettre une Légendaire mondiale si le serveur l'interdit ; proposer à la place une garantie « carte du cercle » (pity ciblé) écrite en SQL **et** dans le fichier TS miroir, avec un test qui empêche la divergence, comme pour 0054.

## 5. Étape 4 — rétention honnête (à écrire)

Séance vide → une action avec des cartes déjà possédées (le verbe de l'étape 2), jamais un QCM ; la série ne retombe pas à zéro (un jour protégé), récompenses montrées comme cartes ou tirages ; Hôtel, échanges, Last Pack et classements seulement s'il existe au moins un autre joueur utile, sinon invitation à amener UNE personne ; aucun vol de carte tant que le réseau est vide ; pas de mission impossible le premier jour.

## 6. Étape 5 — finition visible (à écrire)

Cadre portrait sans étirer l'avatar carré ; une seule matière de rareté lisible sans légende ; noms unifiés ; audio (une piste, niveaux téléphone, silence propre) ; chaînes de familles de langues retirées de l'accueil. Pas de polish Tribunal/arène/déchirure avant que les étapes 1–3 soient dans la build.

## 7. Reporté, et pourquoi le joueur ne le voit plus

| Reporté | Pourquoi invisible |
|---------|-------------------|
| Tribunal, objectif du jour, paquet Scène, rangée d'amis, arène (accueil) | masqués pour un joueur avec cercle ; restent sous Missions et feuilles |
| Mèmes | sélecteur absent tant que le joueur a un cercle ; seuil à définir à l'étape 3 |
| Entrée « Définir mes chaînes » pour les joueurs existants | étape 3 |
| Aplatir les jetons / taux dans le panneau secondaire | étape 3 |
| `set_circle` côté interface (mode édition) | l'API et le SQL existent, l'écran aussi ; pas de bouton |
| Série protégée, états vides sociaux, jour 1 sans mission impossible | étape 4 |
| Cadre portrait, matière de rareté, audio | étape 5 |
| Débats de `docs/perimetre.md` | aucun rouvert ; une seule dérogation à nommer : le tutoriel en trois écrans est remplacé, parce que le brief le demande |
