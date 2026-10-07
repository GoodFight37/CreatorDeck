# Revue externe d'octobre 2026 — ce qui a été fait, refusé, ou reste ouvert

Ce document est le **suivi écrit** de la revue de sécurité/DB/perf envoyée par un
relecteur externe le 7 octobre 2026. Chaque affirmation a été **vérifiée dans le
code** avant d'être acceptée : plusieurs étaient fausses, plusieurs étaient déjà
corrigées. Ce fichier existe pour qu'un successeur sache ce qui a été décidé, et
pourquoi — pas seulement ce qui a été changé.

État au 7 octobre 2026, branche `arena/01a10c75-creatordeck` : commits `40f6928`
(0019), `7c10682` (lot revue : identité, ouverture unique, direct, économie),
`60b1c63` (0021 provenance), `1b9f7a3` (affichage saison), `934868b` (note
Verify JWT), `fa7694d` (le README dit que le jeu est en ligne), `56ce1dd` (ce
bilan), puis la **deuxième passe** (`0022_pack_dans_saves.sql`, le client qui
adopte la sauvegarde du serveur, `e2e/pack-crash.spec.ts`) — § 2.

---

## 1. Corrigé

| Point de la revue | Où | Ce qui a été fait |
| --- | --- | --- |
| `saves`/`stats`/`pack_state` écrivables par un client | `0019_integrite.sql` | `insert`/`update`/`delete` **révoqués** à `anon` et `authenticated` ; `push_save()` passe en `security definer` et ne prend l'identité que dans `auth.uid()` |
| Réserve de boosters recopiée de la sauvegarde locale | `0019` | la réserve naît à **3 boosters, maintenant**, côté serveur ; `for update` sur la ligne ; le tirage ne lit plus `saves` |
| Double dépense de la réserve / du Paquet Scène | `0019` | `for update` dans `open_pack()`, `pg_advisory_xact_lock` dans `open_scene_pack()`, trigger `pack_state_guard` (0..4, ancre jamais future) |
| Rareté déclarée = rang gagné | `0019` + `0021` | `save_suspicions()` : créateur hors catalogue, rareté qui ne suit pas le catalogue, identifiants en double, **et provenance manquante** → sauvegarde gardée, `verified = false` |
| Provenance des cartes (l'audit ne servait à rien) | `0021_provenance.sql` | registre `card_claims` (tirage, scène, échange, hôtel, vol) + **bascule** : tout l'existant entre au registre comme `heritage` |
| Pseudo de créateur / fuite d'UUID des profils | `0019` | trigger `profile_name_reserve` (nom affiché **et** login Twitch du catalogue), `profiles` lisible par les seuls `authenticated` |
| Deux joueurs, le même pseudo à une majuscule près | `0020_identite.sql` | trigger `profile_name_unique` (trigger et non index unique : la migration passe sur une base qui a déjà des doublons, et aucun compte n'est renommé) |
| `stateFingerprint` ignorait l'économie | `src/lib/cloud/sync.ts` | jetons, sabliers, pity, missions, série, Paquet Scène entrent dans l'empreinte ; test dédié |
| Deux modules d'ouverture (jeu / overlay) | `src/hooks/use-pack-opening.ts` | une seule règle « serveur ou appareil », les deux écrans l'appellent ; l'overlay ne lit plus l'état cloud |
| `refresh-live` : course sur le créneau, diagnostic public | `supabase/functions/refresh-live/index.ts` | créneau **réservé** par écriture conditionnelle (`PATCH … refreshed_at=lt.<seuil>`), `Authorization` exigé, `?check=1` réservé au rôle de service |
| `useNow(1_000)` à la racine (1000 cartes re-rendues chaque seconde) | `creator-deck-app.tsx` | 30 s à la racine, 1 s **local** au seul panneau qui affiche des secondes |
| Poll des Last Packs trop lent | `creator-deck-app.tsx` | 30 s tant qu'un paquet est exposé (< 10 min), 3 min sinon |
| `eslint-config-next` désaligné de `next` | `package.json` | 16.3.6 (lock régénéré, `npm ci` cohérent) |
| `catalog:ci` pas obligatoire en CI | — | **déjà fait** : `.github/workflows/android-apk.yml`, ligne 33 |
| Revoke EXECUTE massif / quota `open_pack` | 0009, 0018, 0019 | **déjà fait** ; le quota est la réserve serveur (4 max, 1 / 30 min), pas un compteur horaire |
| Taux du JSON vs littéraux SQL | `src/lib/supabase-*.test.ts` | **déjà couvert** : les tests miroir relisent les littéraux SQL et les comparent à `pull-rates.json` — une retouche d'un seul côté casse la suite |
| Le README s'annonçait « hors ligne, sans compte » | `README.md`, `docs/depot-et-github.md` | l'APK distribué est compilé **avec** le cloud ; le mode local est présenté comme ce qu'il est (dev/tests), plus comme le jeu |

## 2. Deuxième passe (même jour, plus tard) — les six prompts

Le relecteur a relu sa première liste contre `0019` → `0021`, **concédé trois
points faux** (rien à faire, voir § 3) et publié six prompts ordonnés. Ils sont
traités dans l'ordre, chacun avec son contrôle dans le vérifieur.

| Prompt | Où | Ce qui a été fait |
| --- | --- | --- |
| 1. `open_pack()` écrit les cartes dans `saves` (même transaction) | `0022_pack_dans_saves.sql` | `open_pack()` et `open_scene_pack()` rangent les cinq cartes dans `saves.state -> 'cards'` — identifiants **UUID nés du serveur**, `obtainedAt` à l'heure serveur, compteurs (`packs`, `lastPackRegen`, `openings`, `updatedAt`) et `state_checksum` recalculés dans la même transaction, avec un `insert` minimal si le joueur n'a pas encore de ligne. La réponse porte la ligne écrite dans `save`. **Contrôle** : « le tirage a rangé les cinq cartes, sans envoi du client » |
| 2. Le client ne pousse plus après un tirage | `src/lib/cloud/cloud-store.ts`, `api.ts`, `cloud-store.test.ts` | `applyPackResult` puis **adoption de l'état serveur** (`sanitizeState` + `applyState`) ; les deux `push(…, true)` sont retirés. L'auto-envoi des 20 s reste pour craft / recyclage / thème. **Contrôles** : « adopte la sauvegarde écrite par le serveur » (aucun `pushSave`), et « l'envoi reste possible mais jamais forcé » (`p_force === false`) |
| 3. Refus **par exception** aux quatre portes du blanchiment | `0022` | `create_trade()`, `respond_trade()` (les deux côtés), `market_sell()` et `market_buy()` refusent une carte que `card_claim_covers()` ne couvre pas chez le **donneur** — même règle que `save_suspicions()`, mais une exception lisible au lieu d'un déclassement. L'hôtel garde une ceinture-bretelles pour les annonces d'avant `0022`. **Contrôles** : quatre refus (proposer, accepter, vendre, acheter) + le pendant honnête (« une fois donnée par le serveur, la même carte se vend ») |
| 4. `push_save()` n'arbitre plus avec l'horloge de l'appareil | `0022`, `cloud-store.ts` | nouvelle signature `(jsonb, integer, bigint, boolean, timestamptz)` — l'ancienne est **supprimée** ; conflit si `p_base_updated_at` manque ou si la ligne serveur a bougé. `p_device_updated_at` reste écrit comme métadonnée. `p_force` ne sert plus qu'aux **gestes explicites** : « Envoyer ma collection » et l'écrasement de l'écran de conflit. Après une action décidée par le serveur (échange accepté, hôtel, Last Pack, arène, réinitialisation), le client relit la version serveur (`pushAfterServer()`) puis envoie la sienne **sans forcer** — sept envois silencieusement forcés ont été retirés. **Contrôles** : « un envoi sans version serveur de départ est un conflit », « « écraser » écrit malgré tout », et les tests du store (« jamais forcé » après un échange et après une vente) |
| 5. Test e2e « booster + crash + rechargement » | `e2e/pack-crash.spec.ts` | deux tests : le tirage **local** qui survit à un rechargement (tourne partout), et le tirage **serveur** (faux serveur intercepté) où les cinq identifiants sont ceux du serveur et où **aucun** `push_save` ne part après le tirage. Se saute proprement sans `.env.local` ; à lancer avec `npm run e2e` sur un poste avec Chromium |
| 6. Découpe `api.ts` / `cloud-store.ts` | — | **pas faite** : les règles du prompt l'encadrent (aucune nouvelle RPC, aucun nouveau champ d'état, aucun nouveau `force: true`), et deux des trois corrections ci-dessus touchent justement ces fichiers. Reste ouvert, § 4 |

**Deux trous réels trouvés en écrivant ces contrôles** (ils passaient pour de
mauvaises raisons, aucun n'était visible en relecture) :

* dans `create_trade()`, le contrôle de provenance avait été inséré **dans** le
  `if v_missing is not null` : il ne s'exécutait donc jamais. Le test
  « on ne propose pas une carte sans provenance » l'a mis en évidence ;
* `respond_trade()` **redevenait l'ancienne version** dès qu'une migration
  antérieure était recollée (`0005`, pour tester sa rejouabilité) : le
  blanchiment se rouvrait en silence. Le vérifieur recolle `0022` derrière et
  l'exige (« les refus de `0022` survivent au recollage ») — c'est aussi écrit
  noir sur blanc dans `docs/cloud-supabase.md` § 3.

**Un défaut de contrat, trouvé par le vérifieur** : `push_save()` comparait
`p_base_updated_at` avec une précision de microsecondes, alors qu'un client
JavaScript ne transporte que des millisecondes. Chaque envoi honnête arrivait
donc avec une version « plus ancienne » que celle du serveur, et **tout le monde
aurait vu un conflit permanent**. La comparaison tolère désormais une
milliseconde, et c'est le test qui l'exige.

**Un bug de production, trouvé par le vérifieur** : `ensure_profile()` (depuis
`0001`) fabriquait `Collectionneur #xxxx` avec **quatre** caractères de
l'identifiant (65 536 possibilités). Deux joueurs qui commencent pareil
tombaient sur le même nom, `_display_name_unique()` (`0020`) refusait le second
— et **toute sa sauvegarde échouait**. Le suffixe s'allonge maintenant jusqu'à
trouver un nom libre ; le contrôle s'appelle « deux identifiants qui commencent
pareil ne bloquent plus la sauvegarde ».

## 3. Refusé, avec la raison

| Point | Pourquoi non |
| --- | --- |
| **Wallet serveur** (points, sabliers, jetons en SQL, mutés par RPC) | décision de jeu : la monnaie vit sur l'appareil, le jeu hors ligne reste complet. La conséquence est assumée et connue : un solde trafiqué peut acheter à l'hôtel. Le jour où l'hôtel devient le cœur du jeu, ce point revient en premier |
| **Désactiver le tirage local quand le cloud est configuré** | même raison : un build sans cloud doit rester jouable. Ce qui a été fait, c'est **un seul chemin** pour décider (le hook partagé), pas une suppression du mode local |
| **`total_cards ≤ openings × 5 + échanges + artisanat`** | refusé comme contrôle d'intégrité : un joueur hors ligne qui rattache sa collection à un compte serait marqué suspect à cause d'une **migration de plateforme**, pas d'une triche. La provenance de `0021` couvre la même classe de triche, sans faux positif de cette forme |
| **Provenance par identifiant de carte** (n'insérer que si l'`id` est dans `pack_draws`/les échanges) | impossible tel quel : `pack_draws` ne stocke pas les identifiants des cartes de la sauvegarde, et le client **renumérote** les cartes reçues (`applyPackResult` leur donne un nouvel `id`). Faire circuler les identifiants casserait des cartes existantes. D'où la comptabilité par (créateur, rareté, variante) + bascule, qui attrape exactement les cartes de valeur |
| **`useNow` / extraction des vues (`HomeView`, `CollectionView`)** | la partie visible du problème (re-rendu 1 Hz) est corrigée ; sortir trois vues d'un fichier de 1 900 lignes est de la dette, pas un bug — à faire quand on touchera ces écrans |
| **Session en Preferences Capacitor** | la session et la sauvegarde de partie doivent vivre au même endroit (sinon deux sources de vérité) ; la sauvegarde est un blob largement trop gros pour `Preferences`. Durcissement possible : adaptateur `@capacitor/preferences` pour la **session seule**, avec migration de format — à faire si on veut durcir le web |

**Points concédés par le relecteur** (vérifiés une deuxième fois, rien à faire) :

| Point | Pourquoi il est faux |
| --- | --- |
| « `?check=1` parle à Twitch sans quota » | la fonction ne parle jamais à Twitch depuis `?check=1` : le vrai défaut était la **course sur le créneau**, fermée dans `934868b` (écriture conditionnelle `refreshed_at=lt.<seuil>`) |
| « `user_cards` est inscriptible / à recréer » | c'est une **projection** serveur depuis `0006` : RLS active sans politique, `revoke all`, recalculée par le trigger `project_cards()` |
| « `catalog:ci` n'est pas obligatoire, les revokes EXECUTE et les tests miroir manquent » | `catalog:ci` est dans la CI Android (`.github/workflows/android-apk.yml`), les `revoke`/`grant` sont en place dans `0009`/`0018`/`0019`, et les tests miroir relisent les littéraux SQL pour les comparer à `pull-rates.json` |

## 4. Reste ouvert (dans l'ordre où on le ferait)

1. **Découpes** : `cloud-store.ts` et `api.ts` (environ 2 000 lignes chacun) par
   domaine (auth, pack, social, arène) — le prompt 6 les encadrait (aucune
   nouvelle RPC, aucun nouveau champ d'état, aucun nouveau `force: true`) et
   n'est **pas** fait : les corrections du prompt 1 à 4 touchent justement ces
   deux fichiers. Dette de revue, aucun effet joueur.
2. **Wallet serveur**, si l'hôtel devient central (voir § 3).
3. **Les campagnes de notifications (FCM)** puis les codes promo, le gyroscope
   holographique et le badge automatique (`pg_cron`) — le backlog hors brief,
   inchangé.

## 5. Ce qu'un relecteur peut vérifier lui-même

```powershell
npm ci
npm test                                    # 666 tests, 44 fichiers
npm run supabase:verify                     # 325 contrôles sur un Postgres jetable
npm run e2e                                 # navigateur requis (npx playwright install chromium)
```

Le vérifieur installe ses dépendances en `--no-save`
(`npm install --no-save embedded-postgres pg`) : rien de plus dans l'APK ni
dans la CI. Il joue `0001` → `0022` pour de vrai, avec les **mêmes règles de
droits que Supabase** (`alter default privileges` **avant** les migrations) —
c'est ce détail qui a mis au jour trois contrôles qui passaient pour de
mauvaises raisons : `user_cards` et `market_listings`, révoquées depuis `0006`
et `0009`, étaient lues avec succès parce que le harnais les avait rendues
lisibles après coup.
