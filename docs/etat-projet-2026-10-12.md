# CreatorDeck — bilan actuel et suite

**Mise à jour ouverture** : [les quatre points continuum/matière/geste sont
implémentés et vérifiés localement](booster-continuum-2026-10-12.md). Les preuves
CI/Vercel de `10699eb` ci-dessous concernent le lot portraits précédent ;
elles ne valident pas à elles seules cette nouvelle ouverture.

## État vérifié — 12 octobre 2026

Application utilisée par Malik : **site Vercel connecté à GitHub/main**, avec
Supabase. Aucun `git pull` sur son PC n’est nécessaire pour recevoir une mise à
jour du site. Le support Android/Capacitor reste dans le dépôt ; les tests sur
navigateur mobile ne prouvent pas un essai sur appareil Android physique.

Code vérifié : `10699eb47bce08429c219560c67da65f511aeb18` sur `main`.
[CI complète](https://github.com/GoodFight37/CreatorDeck/actions/runs/38306402921) :
success, quatre jobs. Compteurs extraits des logs : **1 144 tests unitaires,
109 tests d’écrans, 64 E2E et 10 tests cloud à RPC simulées**. Les contrôles SQL
jetables, TypeScript, ESLint, catalogue et build passent également.
[Contrôle Supabase](https://github.com/GoodFight37/CreatorDeck/actions/runs/38306793813) :
success ; TLS/projet/historique vérifiés, base déjà à jour, aucun SQL exécuté.
Vercel déclare **Production / success / Deployment has completed**, le
12 octobre à **22 h 47 Europe/Paris**, pour ce même SHA
([déploiement](https://vercel.com/hafsi37-2386/creator-deckk/2g3Z4UcJhHz8YUe7zndSHDZkb4Hv)).
L’adresse directe du déploiement exige une connexion Vercel dans la session de
l’agent : le rendu public n’a pas été vérifié indépendamment après ce push.
Aucune PR ouverte au dernier contrôle GitHub.

### Ce qui reste

| Chantier | État actuel | Fin attendue |
|---|---|---|
| Ouverture : retour visuel après le nouveau lot | Continuum, reflet matière et gestes implémentés ; preuves dans le rapport dédié | Juger le rendu/rythme sur téléphone réel, puis décider d’éventuels ajustements |
| Extension du catalogue | Idée de Malik : autres personnes connues, éventuellement personnages de séries ; **pas encore cadrée ni implémentée** | Définir les personnes et l’organisation des nouvelles cartes avant développement |

Les vérifications sur téléphone réel (rendu, rythme, performances, parcours
cloud) sont des validations restantes, pas des bugs établis. Les avis déjà
confirmés par Malik sur scroll, sablier/recharge, objectif Live et cadeaux ne
sont pas à redemander.

### Retour confirmé le 12 octobre

Malik confirme que le message du Paquet Scène déjà ouvert est désormais bon.
K-037 est clos, aucune nouvelle simplification requise. La revue du booster est
une amélioration visuelle nécessaire selon Malik, avec revue externe demandée : l’agent peut
observer le parcours en navigateur de test, mais ne ressent pas l’usage du
téléphone physique de Malik. Aucun bug actuel de l’ouverture n’est établi ici.

### Livré

- Lot portraits : **300 choix manuels + 699 fichiers Upscayl + une photo de
  Diverron restaurée avec IA**. Les 1 000 créateurs ont une route d’image ; cela
  ne signifie pas 1 000 photos humaines vérifiées. **Les avatars génériques sont
  acceptés par Malik** pour les créateurs sans photo de profil, notamment
  SolaryHS, j0niq et toaststix : aucune recherche/remplacement demandé.
  Crédits repliés dans Toi → Réglages.
- Identité Skyrozz corrigée, compte Twitch `skyrroztv` ; migration dédiée 0050.
- Appuis rapides sur « Révéler la suivante » mémorisés pendant le flip :
  correctif `3f33b19`, inclus dans le code courant et la CI complète verte.
- Reprise cloud automatique, réserve/sabliers, pity serveur, scroll distinct
  de l’ouverture, accès Arène/Hôtel, Craft, Binder, profils et activité sociale :
  lots publiés. Aucune nouvelle refonte de ces fonctions n’est planifiée.
- Atelier Windows de sélection de portraits : parcours carrousel v1.5 publié.
  Malik utilise une variante modifiée avec Gemini ; son interface locale n’est
  pas nécessairement identique au code de l’atelier versionné. Le jeu Vercel et
  cet outil local sont deux livrables distincts.

### Limites et travaux locaux

20 anciens portraits Commons, leurs métadonnées et certains fichiers de suivi
restent **locaux, non publiés**. Ils sont préservés et ne bloquent pas le lot
actuel ; aucune publication supplémentaire n’est décidée ici.
Les sources/licences de nombreux imports manuels/Upscayl ne sont pas renseignées
et les détails générés par IA ne sont pas des détails photographiques vérifiés.
L’upscale améliore l’affichage, pas la certitude sur l’identité ou la qualité.

### Lecture pour Grok

Lire ce bilan et le plan actif de la roadmap, puis le code des composants
concernés. Les sections datées des autres documents sont un historique : un
ancien « en attente » ou une ancienne case vide n’est pas une tâche actuelle.
Simulation « Ta chaîne », badges/avatars supplémentaires, i18n, analytics,
publication sur stores et refonte d’économie ne sont pas planifiés.
