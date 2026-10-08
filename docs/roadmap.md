# Roadmap CreatorDeck

## 📱 Volet 1 : Application Principale (TCG & Cloud)

### En place & Validé
- [x] Moteur de tirage & Taux de drop publiés (pity à 12, Perfect, Gold à 1 %, Live)
- [x] Cloud Supabase sécurisé (comptes, inventaire, échanges atomiques, hôtel des ventes)
- [x] Statut Twitch en direct & notifications push FCM (APK)
- [x] Arène hebdomadaire, wishlist publique & Last Pack protégé
- [x] Export Vercel & contrôle automatique du cloud au build (`cloud-guard.mjs`)

### Chantiers en cours / Améliorations
- [x] **« Du jus » : les moments rares se voient** (8 octobre 2026) : un **éclat** sur une Épique, une **explosion dorée** et un écran blanc sur une Légendaire comme sur un Perfect (planches pixel-art découpées en CSS, partant **avec** le son, coupées par le réglage des reflets), l'**achat d'un palier** qui fait vraiment entrer l'objet dans la pièce — il tombe, et la fumée marque l'endroit — et l'**emblème d'Arène** posé sur l'étagère du Studio (le pont TCG → Studio : ce qui se gagne dans l'Arène se voit chez soi)
- [x] **Les crédits, et un carnet qui vise juste** (8 octobre 2026) : un écran **Crédits** discret sous « Toi » (Kenney pour le décor, unTied Games pour les effets — la ligne que sa licence demande —, Chequered Ink pour les bruits, Twitch, Lucide, les polices), et les notifications d'**échange** qui ouvrent la feuille de compte **sur la section des échanges**, panneau déjà ouvert et déjà à l'écran
- [ ] Stabilisation des perfs mobiles (scroll fluide sur les 1 000 cartes)
- [ ] Suite de tests Playwright (`npm run e2e`) & Vitest
- [ ] Polissage visuel & haptique (reflets cartes Holo/Gold, retour tactile au swipe)
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
- [x] Bureau **visuel** : la scène du studio (objets qui s'allument avec le setup, vraies cartes sur socle, aura rouge du direct, bandeau « RAID ! ») et le **plateau** qui booste la vidéo du jour (`0041`, étape 8 de `docs/ta-chaine.md`)
- [x] **Refonte « jeu mobile » de l'écran « Ta chaîne »** : HUD arcade (rang, jauge d'abonnés, rythme, jetons), socles, boutons bombés, notices remplacées par des badges
- [x] **Le Studio s'habille et s'entend** (8 octobre 2026) : deux fenêtres posées sur les murs du kit (lumière froide), un second écran au palier *régie*, et **15 bruitages embarqués** (cartes, pages, clics, feuilles, achats de setup, publication, raid) branchés sur les gestes — le bouton *Son* du profil les coupe tous (`docs/assets-sonores.md`)
- [x] **Le Studio devient un onglet plein écran, et la pièce passe aux vraies images** (étape 10 de `docs/ta-chaine.md`) : cinq onglets dans la barre du bas, plus de modale, et une **pièce isométrique du kit Kenney** (CC0) où chaque palier fait entrer son objet (`src/data/studio-room.json`, `src/lib/studio-room.ts`)
- [x] Arbitrage du live de 20 s (scène d'immersion gratuite, tirage vidéo 100 % serveur)

### Prochaines étapes
- [x] **Paliers de setup avancés (Tycoon étendu) :** Financement des paliers 6+ via le sacrifice de doublons de cartes (Rares/Épiques) — livré le 8 octobre 2026 (`0040`, étape 7 de `docs/ta-chaine.md` : Rare = 1, Épique = 2, Légendaire jamais, une carte ne part qu'une fois)
- [ ] **Bilan & équilibrage des gains :** Ajustement des courbes de croissance (abonnés, vidéos, imprévus) après tests de jeu réels
