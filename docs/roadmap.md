# Roadmap CreatorDeck

## 📱 Volet 1 : Application Principale (TCG & Cloud)

### En place & Validé
- [x] Moteur de tirage & Taux de drop publiés (pity à 12, Perfect, Gold à 1 %, Live)
- [x] Cloud Supabase sécurisé (comptes, inventaire, échanges atomiques, hôtel des ventes)
- [x] Statut Twitch en direct & notifications push FCM (APK)
- [x] Arène hebdomadaire, wishlist publique & Last Pack protégé
- [x] Export Vercel & contrôle automatique du cloud au build (`cloud-guard.mjs`)

### Chantiers en cours / Améliorations
- [ ] Stabilisation des perfs mobiles (scroll fluide sur les 1 000 cartes)
- [ ] Suite de tests Playwright (`npm run e2e`) & Vitest
- [ ] Polissage visuel & haptique (reflets cartes Holo/Gold, retour tactile au swipe)

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
- [x] **Le Studio devient un onglet plein écran, et la pièce passe aux vraies images** (étape 10 de `docs/ta-chaine.md`) : cinq onglets dans la barre du bas, plus de modale, et une **pièce isométrique du kit Kenney** (CC0) où chaque palier fait entrer son objet (`src/data/studio-room.json`, `src/lib/studio-room.ts`)
- [x] Arbitrage du live de 20 s (scène d'immersion gratuite, tirage vidéo 100 % serveur)

### Prochaines étapes
- [x] **Paliers de setup avancés (Tycoon étendu) :** Financement des paliers 6+ via le sacrifice de doublons de cartes (Rares/Épiques) — livré le 8 octobre 2026 (`0040`, étape 7 de `docs/ta-chaine.md` : Rare = 1, Épique = 2, Légendaire jamais, une carte ne part qu'une fois)
- [ ] **Bilan & équilibrage des gains :** Ajustement des courbes de croissance (abonnés, vidéos, imprévus) après tests de jeu réels
