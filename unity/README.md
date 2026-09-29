# Kit Unity — cinématique d'ouverture 3D

Ce dossier contient **tout le code côté Unity** du pont documenté dans
`public/unity/README.md` (contrat JS ⇄ Unity) :

| Fichier | Rôle |
|---|---|
| `CreatorDeckCinematic.cs` | Le MonoBehaviour du contrat : `StartOpening`, `SetCards`, déchirure au doigt, notifications `tear-*` / `card-revealed` / `summary-shown` / `close` |
| `Plugins/CreatorDeckBridge.jslib` | Le petit pont WebGL qui envoie ces notifications à React |

**Principe** : le jeu web a **deux cinématiques interchangeables**. Sans build
Unity, c'est l'implémentation web (CSS 3D) qui tourne — elle est complète et
testée. Tu déposes un build Unity, il prend la main ; s'il échoue, le jeu
retombe sur le web **sans recharger la page**. Le tirage des cartes reste
toujours fait par le jeu (React), jamais par Unity.

## Prérequis

- **Unity 2022.3 LTS** (gratuit, version « Personal ») avec le module
  **WebGL Build Support** — ~10 Go au disque.
- Les assets du dépôt **`GoodFight37/pkmn`** (clips `C_PackOpen_*`, polices,
  modèles).

## Étape 1 — Créer le projet Unity

1. Unity Hub → **New project** → modèle **3D (Built-in Render Pipeline)** →
   nomme-le `CreatorDeckUnity` → **Create project**.
2. Menu *Edit → Preferences → External Tools* : vérifie qu'un compositeur
   (.NET) est installé (Unity le propose en un clic).

## Étape 2 — Importer les assets pkmn

1. Télécharge le dépôt `GoodFight37/pkmn` (bouton **Code → Download ZIP**).
2. Dans le projet Unity, crée `Assets/Pkmn/` puis copie dedans, depuis l'archive :
   - `Font/` (les `.otf` — sertira les titres du récapitulatif) ;
   - `AnimationClip/C_PackOpen_*.anim` (les chorégraphies de pochette) ;
   - le **modèle du pack** (un dossier `Animator/ANxxxx…` contenant le `.fbx`
     du pack — repère-le : ce sont les objets animés par les clips
     `C_PackOpen_*`) ainsi que ses `Material/` associés.
3. Retour dans Unity : tout s'importe automatiquement. Laisse les réglages
   par défaut.

## Étape 3 — Ajouter les scripts du kit

1. Copie `unity/CreatorDeckCinematic.cs` → `Assets/Scripts/CreatorDeckCinematic.cs`.
2. Copie `unity/Plugins/CreatorDeckBridge.jslib` → `Assets/Plugins/CreatorDeckBridge.jslib`
   (**dossier Plugins obligatoire**, sinon le pont n'est pas embarqué).
3. Unity recompilera automatiquement.

## Étape 4 — Construire la scène

Crée une scène `Cinematic.unity` avec :

1. **Camera** nommée `Main Camera` (position z = −3, fond noir).
2. L'objet du **pack** au centre de la vue.
3. Sur le pack : un **Animator** + un **Animator Controller**
   (*Create → Animator Controller*, glissé dans le champ) contenant :

   | Type | Nom | Rôle |
   |---|---|---|
   | Float | `tear` | 0 → 1 piloté au doigt : mélange rabat fermé / déchiré (blend tree 2 états) |
   | Trigger | `burst` | les cartes jaillissent |
   | Trigger | `pile` | la pile se pose |
   | Trigger | `flip` | retournement de la carte du dessus |
   | Trigger | `summary` | le récapitulatif s'affiche |

   Branche les **clips importés** (`C_PackOpen_*`) sur ces états : l'état
   `tear` en blend tree sur le paramètre `tear`, les triggers vers les états
   correspondants (open → burst, cardappear → pile, Card_cardappear → flip…).
   Les clips portent leurs propres durées ; à titre de repère le web utilise
   burst 620 ms + pose 340 ms, retournement 500 ms (courbe mesurée
   `easeOutQuint`), retournement rare 1 500 ms.

4. **GameObject vide** nommé exactement `CreatorDeckCinematic` (ce nom est le
   contrat) → *Add Component → CreatorDeck Cinematic* → remplis :
   - *Pack Animator* : l'Animator du pack ;
   - *Pack Rect* : le RectTransform du pack (facultatif) ;
   - *Card Slots* : les `RawImage` du récapitulatif (facultatif — sans elles,
     les cartes s'affichent sans portrait).

## Étape 5 — Tester dans l'éditeur

**Play** dans Unity : la console affiche `[CreatorDeck] ready` puis, quand tu
simules un glissement (souris), `tear-progress …`. Ici les notifications sont
seulement journalisées — c'est normal, React n'est pas là.

## Étape 6 — Exporter en WebGL

*File → Build Settings → WebGL → Switch Platform*, puis **Player Settings** :

| Réglage | Valeur (obligatoire) |
|---|---|
| **Product Name** | `creatordeck` ← les fichiers doivent s'appeler `creatordeck.loader.js` / `.framework.js` / `.data` / `.wasm` (nom imposé par le jeu) |
| Company Name | `CreatorDeck` |
| Compression Format | **Disabled** (WebView locale sans en-têtes `Content-Encoding`) |
| Exception Support | **None** |
| Code Optimization | **Master** |
| Threads | **désactivés** |
| Data Caching | décoché |

→ **Build** dans un dossier vide, par exemple `~/creatordeck-unity-build/`.

## Étape 7 — Déposer le build dans le jeu

```bash
# depuis la racine du projet CreatorDeck (le dépôt GoodFight37/test)
mkdir -p public/unity/Build
cp ~/creatordeck-unity-build/Build/creatordeck.* public/unity/Build/
npm run dev        # → http://localhost:3000
```

L'ouverture d'un booster affiche alors l'en-tête **« Unity »** au lieu de la
cinématique web. Pour l'APK : `npm run android:sync` après l'export.

## Dépannage

| Symptôme | Cause / solution |
|---|---|
| L'ouverture reste en web (pas d'en-tête « Unity ») | Le loader n'est pas au bon endroit ou mal nommé : vérifie `public/unity/Build/creatordeck.loader.js` |
| Écran noir au chargement | Compression ou threads activés → revoir le tableau Étape 6 |
| Les évènements ne remontent pas | Le GameObject s'appelle autrement que `CreatorDeckCinematic`, ou `CreatorDeckBridge.jslib` n'est pas dans `Assets/Plugins/` |
| Portraits du récapitulatif absents | Chemin `/creators/{slug}.jpg` inaccessible — toléré, la séance continue |
| Tout a basculé en web d'un coup | C'est le **repli automatique** : le build a renvoyé `error` (voir console du navigateur) — le jeu reste jouable |
| Après plusieurs ouvertures, WebView instable | Chaque fermeture appelle `Quit()` (correction déjà dans le jeu) : la WebView garde son contexte WebGL |

Ce qui **reste en web même avec Unity** : les cartes 3D du classeur
(inclinaison, retournement, reflet holo) — composants React délibérément hors
du pont.
