# Revue externe d'octobre 2026 — ce qui a été fait, refusé, ou reste ouvert

Ce document est le **suivi écrit** de la revue de sécurité/DB/perf envoyée par un
relecteur externe le 7 octobre 2026. Chaque affirmation a été **vérifiée dans le
code** avant d'être acceptée : plusieurs étaient fausses, plusieurs étaient déjà
corrigées. Ce fichier existe pour qu'un successeur sache ce qui a été décidé, et
pourquoi — pas seulement ce qui a été changé.

État au 7 octobre 2026, branche `arena/01a10c75-creatordeck` : commits `40f6928`
(0019), `7c10682` (lot revue : identité, ouverture unique, direct, économie),
`60b1c63` (0021 provenance), `1b9f7a3` (affichage saison), `934868b` (note
Verify JWT), `fa7694d` (le README dit que le jeu est en ligne).

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

## 2. Refusé, avec la raison

| Point | Pourquoi non |
| --- | --- |
| **Wallet serveur** (points, sabliers, jetons en SQL, mutés par RPC) | décision de jeu : la monnaie vit sur l'appareil, le jeu hors ligne reste complet. La conséquence est assumée et connue : un solde trafiqué peut acheter à l'hôtel. Le jour où l'hôtel devient le cœur du jeu, ce point revient en premier |
| **Désactiver le tirage local quand le cloud est configuré** | même raison : un build sans cloud doit rester jouable. Ce qui a été fait, c'est **un seul chemin** pour décider (le hook partagé), pas une suppression du mode local |
| **`total_cards ≤ openings × 5 + échanges + artisanat`** | refusé comme contrôle d'intégrité : un joueur hors ligne qui rattache sa collection à un compte serait marqué suspect à cause d'une **migration de plateforme**, pas d'une triche. La provenance de `0021` couvre la même classe de triche, sans faux positif de cette forme |
| **Provenance par identifiant de carte** (n'insérer que si l'`id` est dans `pack_draws`/les échanges) | impossible tel quel : `pack_draws` ne stocke pas les identifiants des cartes de la sauvegarde, et le client **renumérote** les cartes reçues (`applyPackResult` leur donne un nouvel `id`). Faire circuler les identifiants casserait des cartes existantes. D'où la comptabilité par (créateur, rareté, variante) + bascule, qui attrape exactement les cartes de valeur |
| **`useNow` / extraction des vues (`HomeView`, `CollectionView`)** | la partie visible du problème (re-rendu 1 Hz) est corrigée ; sortir trois vues d'un fichier de 1 900 lignes est de la dette, pas un bug — à faire quand on touchera ces écrans |
| **Session en Preferences Capacitor** | la session et la sauvegarde de partie doivent vivre au même endroit (sinon deux sources de vérité) ; la sauvegarde est un blob largement trop gros pour `Preferences`. Durcissement possible : adaptateur `@capacitor/preferences` pour la **session seule**, avec migration de format — à faire si on veut durcir le web |

## 3. Reste ouvert (dans l'ordre où on le ferait)

1. **`openPack` poussait avec `force: true`** : le serveur écrit déjà les cartes
   tirées et renvoie sa réserve, donc `force` ne sert qu'à écraser un autre
   appareil. La correction propre est que `open_pack()` écrive les cartes **dans
   `saves`** (même transaction), plutôt que de retirer le drapeau et risquer de
   perdre un tirage sur conflit multi-appareils.
2. **Horloge dans `push_save`** : `p_device_updated_at` vient du client, une
   horloge en avance gagne tous les conflits. À traiter **avec** le point 1
   (l'arbitrage serveur n'a de sens que quand le serveur est la seule source des
   cartes).
3. **Test e2e « ouvrir un booster + tuer l'onglet + recharger = mêmes 5
   cartes »** : pas écrit, et pas exécutable dans la sandbox de développement
   (pas de navigateur téléchargeable) ; l'outil Playwright est en place, le test
   s'écrira et s'exécutera sur un poste avec Chromium.
4. **Découpes** : `cloud-store.ts` et `api.ts` (environ 2 000 lignes chacun) par
   domaine (auth, pack, social, arène). Dette de revue, aucun effet joueur.
5. **Wallet serveur**, si l'hôtel devient central (voir § 2).

## 4. Ce qu'un relecteur peut vérifier lui-même

```powershell
npm ci
npm test                                    # 665 tests, 44 fichiers
npm run supabase:verify                     # 312 contrôles sur un Postgres jetable
```

Le vérifieur installe ses dépendances en `--no-save`
(`npm install --no-save embedded-postgres pg`) : rien de plus dans l'APK ni
dans la CI. Il joue `0001` → `0021` pour de vrai, avec les **mêmes règles de
droits que Supabase** (`alter default privileges` **avant** les migrations) —
c'est ce détail qui a mis au jour trois contrôles qui passaient pour de
mauvaises raisons : `user_cards` et `market_listings`, révoquées depuis `0006`
et `0009`, étaient lues avec succès parce que le harnais les avait rendues
lisibles après coup.
