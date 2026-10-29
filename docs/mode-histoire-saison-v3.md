# Bible narrative V3 · Zéro spectateur

> Périmètre : `feature/histoire-reigns-pilot-20261026` uniquement. Ne pas fusionner automatiquement dans `main` ; aucune récompense, dépense de carte ou modification Supabase.

## Contrat éditorial

- **40 décisions possibles**, étapes techniques `0` à `39` ; scènes `0` à `11` conservées et réécrites légèrement comme premier bilan, scènes `12` à `39` ajoutées dans `src/data/story-season.ts`.
- **84 scènes conditionnelles au total** : 27 prologue et 57 nouvelles. Une partie ne les voit pas toutes ; chaque étape possède un repli inconditionnel.
- **Deux décisions par scène**, sans aléatoire ni IA en cours de partie. Les choix écrivent quatre jauges `public`, `energie`, `argent`, `confiance` et des drapeaux persistants.
- Les arcs principaux concernent **Flo** (limites, travail invisible, autonomie), **Nox** (rivalité, pactes, partage des revenus), **Mona** (contrats, contrôle éditorial) et **Lina** (enquête, transparence et protection des sources).
- Une jauge à `0` ou l'audience à `100` interrompt toujours la partie : **40 est un maximum, pas une durée promise**. Vérifier la proportion de parties atteignant les actes IV et V avant de conclure que l'épisode dure 20 à 30 minutes.

## Structure des actes

| Acte | Étapes | Question dramatique |
|---|---|---|
| I · La première année | 0–11 | Que sacrifies-tu pour exister en ligne ? |
| II · L'ascension | 12–19 | Comment garder des limites lorsqu'on devient visible ? |
| III · Les fissures | 20–27 | Que doit-on à ceux qui nous regardent et travaillent avec nous ? |
| IV · La crise | 28–35 | Sais-tu réparer les promesses rompues ? |
| V · La dernière diffusion | 36–39 | Qui a encore le droit de tenir le micro avec toi ? |

## Événements implémentés

Les identifiants sont stables et constituent la source de vérité pour les sauvegardes et les tests. Les colonnes indiquent la condition d'apparition ainsi que les deux décisions proposées ; les effets numériques exacts se trouvent dans le TypeScript.

### Acte II · Une audience à apprivoiser

| Étape · scène | Déclencheur | Décision gauche / droite |
|---|---|---|
| 13. Une clé sur la table (`atelier_flo`) | `collectif_autonome` | Écrire des règles de décision / Décider vite, seul |
| 13. Un écran noir (`retour_nox_froid`) | `pacte_brise` | Le rembourser et retirer le logo / Conserver les vidéos du duo |
| 13. Le lundi sans confettis (`lundi_apres`) | Repli | Annoncer une nouvelle série / Prévoir un vrai budget |
| 14. L'algorithme a faim (`fil_invisible`) | Repli | Tester le défi des quinze jours / Publier moins, mais mieux |
| 15. Un prénom effacé (`flo_revient_rupture`) | `rupture_flo` | Reprendre les règles sans la citer / Créditer son travail publiquement |
| 15. Le dimanche de Flo (`flo_dit_non`) | `flo_protegee` | Refuser la convention pour elle / Y aller seul et la remercier |
| 15. Une nuit de signalements (`modos_nuit`) | Repli | Ouvrir tout de suite / Former l'équipe avant le direct |
| 16. La clause huit (`mona_exclusif`) | `agence` | Laisser l'agence filtrer / Exiger une clause de recours |
| 16. Un oui qui coûte (`mona_independant`) | Repli | N'accepter qu'un essai honnête / Décliner pour garder le cap |
| 17. La caméra de secours (`nox_pacte`) | `pacte_tenu` | Prêter le téléphone / L'aider à trouver une location |
| 17. L'invitation empoisonnée (`nox_guerre`) | `guerre_nox` | Accepter le duel surprise / Exiger des règles communes |
| 17. Le message vocal (`nox_silence`) | Repli | L'inviter pour une soirée calme / Garder de la place pour toi |
| 18. Le spectateur du portail (`fan_frontiere`) | Repli | Rire pour désamorcer / Rappeler les limites et le bloquer |
| 19. Le PDF qui ne meurt pas (`document_contrat`) | `preuve_effacee` | Lui envoyer les preuves intégrales / Répondre par un communiqué vague |
| 19. Le droit de montrer (`demande_archive`) | Repli | Autoriser les images tout de suite / Demander l'accord des personnes filmées |
| 20. Le direct solidaire (`concert_collecte`) | Repli | Tout encaisser puis reverser / Déléguer la collecte à l'association |

### Acte III · Ce qui se voit, ce qui se cache

| Étape · scène | Déclencheur | Décision gauche / droite |
|---|---|---|
| 21. Trois questions sans montage (`lina_enquete`) | Repli | Exiger de relire l'article / Répondre avec les documents |
| 22. Des mots que tu n'as pas dits (`chat_blessure`) | `chat_toxique` | Dire que le chat n'est pas toi / La contacter et revoir les signalements |
| 22. Le salon sans caméra (`chat_refuge`) | `communaute_saine` | Laisser la communauté s'organiser / Faire une apparition surprise |
| 22. Le règlement en brouillon (`chat_equilibre`) | Repli | Écouter avant d'arbitrer / Publier tes propres règles |
| 23. La deuxième enveloppe (`contrat_fantome`) | `sponsor_cache` | Refuser le silence payé / Encaisser l'indemnité |
| 23. Une proposition publique (`contrat_propre`) | Repli | Produire sans partenaire / Tester un épisode déclaré |
| 24. Le verre d'eau (`minuit_cuisine`) | Repli | Terminer le montage maintenant / Éteindre et dormir |
| 25. Les vues ne se partagent pas (`duo_en_suspens`) | `duo_nox` | Signer un partage écrit / Proposer de compenser plus tard |
| 25. Un clip de 14 secondes (`vieux_rival`) | Repli | Laisser le clip tourner / Publier le contexte complet |
| 26. La capture annotée (`archive_mensonge`) | `mensonge_final` | Corriger l'erreur en public / Mettre l'article sur le dos de Lina |
| 26. La première chaise (`archive_memoire`) | Repli | Transformer l'archive en publicité / Reconnaître ce qui a changé |
| 27. Le compte de la collecte (`dons_en_attente`) | `collecte_personnelle` | Attendre que l'orage passe / Publier les comptes et rembourser l'écart |
| 27. Le reçu pour tout le monde (`dons_bonne_foi`) | Repli | Expliquer chaque ligne / Renvoyer simplement vers le site |
| 28. Le studio sans électricité (`panne_studio`) | Repli | Louer un studio pour la soirée / Revenir au téléphone |

### Acte IV · Le coût des promesses

| Étape · scène | Déclencheur | Décision gauche / droite |
|---|---|---|
| 29. Quatre signatures (`flo_charte`) | `charte_collectif` | Passer outre le vote / Accepter la décision commune |
| 29. Un message sans destinataire (`flo_chef`) | `chef_collectif` | Rendre un vrai pouvoir à l'équipe / Recruter deux remplaçants |
| 29. Les règles portent une signature (`flo_absente`) | `rupture_flo` | Retirer son nom du document / Lui présenter des excuses sans exigence |
| 29. Un siège réservé (`flo_horizon`) | Repli | Accepter ses nouveaux horaires / Lui proposer un poste rémunéré |
| 30. La facture du duo (`nox_dette`) | `dette_nox` | Lui proposer de l'exposition / Payer et corriger le relevé |
| 30. Une table pour deux (`nox_mediation`) | `mediation_nox` | Reconnaître les torts des deux côtés / Exiger des excuses devant le chat |
| 30. Un montage à deux noms (`nox_contrat`) | Repli | Le laisser raconter votre histoire / Garder ce moment privé |
| 31. Le prix d'une phrase (`mona_silence`) | `silence_vendu` | Protéger ton compte bancaire / Faire relire le contrat et témoigner |
| 31. Une vidéo sans ta voix (`mona_filtres`) | `filtre_agence` | Réclamer le contrôle éditorial / Accepter la campagne |
| 31. La dernière proposition (`mona_nouveau`) | Repli | Négocier un calendrier humain / Accepter la tournée complète |
| 32. Le silence de la source (`lina_verite`) | Repli | Exiger le nom en direct / Défendre le secret de la source |
| 33. La porte de chez toi (`fan_retour`) | `limites_vie_privee`, `communaute_saine` | Répondre discrètement sans relancer / Faire une vidéo sur son cas |
| 33. Le lieu sur une capture (`fan_dox`) | `frontieres_floues` | Quitter le live sans explication / Faire retirer les informations privées |
| 33. La convention des visages (`fan_rencontre`) | Repli | Prendre le temps de remercier / Signer vite pour voir tout le monde |
| 34. La diffusion limitée (`plateforme_alerte`) | Repli | Déplacer le live sans expliquer / Contester avec un dossier vérifiable |
| 35. Les vingt minutes de silence (`pause_obligee`) | Repli | Sortir marcher sans téléphone / Faire un direct surprise de vingt minutes |
| 36. La vidéo zéro (`retour_origine`) | Repli | Préparer un clip anniversaire / Enregistrer un message pour cette personne |

### Acte V · Le dernier direct

| Étape · scène | Déclencheur | Décision gauche / droite |
|---|---|---|
| 37. Le contrat du direct final (`offre_derniere`) | Repli | Accepter le texte préparé / Garder les questions libres |
| 38. Le casque de secours (`flo_reconcilie`) | `excuses_flo_tardives` | L'inviter comme simple spectatrice / Lui proposer un retour devant caméra |
| 38. Le message de vingt-deux heures (`flo_bilan`) | Repli | Promettre de finir tôt et improviser / Préparer une relève avant vingt-deux heures |
| 39. Le siège voisin (`nox_paix`) | `paix_durable_nox` | Lui donner le micro, sans conditions / Faire la conclusion en solo |
| 39. Le dernier classement (`nox_compte`) | `guerre_nox` | Relancer la rivalité pour la finale / Refuser la comparaison en direct |
| 39. Les noms au générique (`nox_generique`) | Repli | Le créditer devant le public / Lui répondre en privé |
| 40. Quatre micros allumés (`grand_final_collectif`) | `vote_respecte` | Partager les décisions à l'antenne / Présenter l'équipe puis reprendre seul |
| 40. Deux voix dans le casque (`grand_final_nox`) | `nox_scene_partagee` | Partager la scène et le générique / Lui confier le dernier mot |
| 40. L'archive ouverte (`grand_final_verite`) | `lina_preuves` | Montrer les documents sans couper / Ne raconter que ce que tu peux défendre |
| 40. Un seul bouton rouge (`grand_final`) | Repli | Offrir un spectacle sans explication / Raconter les choix et leurs coûts |

## Chaînes causales vérifiables dans le script

- `flo_protegee` → possibilité de `collectif_flo` → `collectif_autonome` → `charte_collectif` → `vote_respecte`/`vote_trahi` → variante `grand_final_collectif` si vote respecté.
- `respect_nox` → `duo_nox` → `pacte_nox` → `pacte_tenu`/`pacte_brise` → prêts, dettes ou film partagé → `nox_scene_partagee` → variante `grand_final_nox`.
- `sponsor_cache` → `preuve_effacee` → enquête de Lina (`lina_preuves` ou communiqué vague) → choix sur la source → variante `grand_final_verite` si preuves remises.
- `collecte_personnelle` → questionnement sur les dons à l'étape 27 → `audit_dons` ou `dons_opacite` → bilan dans l'épilogue.
- `rupture_flo` → ancien règlement reconsidéré → éventuelles `excuses_flo_tardives` → retour **facultatif comme spectatrice**, sans effacer la rupture.

## Architecture et garde-fous

1. Le fichier `src/data/story-prologue.ts` importe et concatène les nouvelles scènes à l'aide de `...STORY_SEASON_SCENES`. Les 12 premières étapes et leurs identifiants restent inchangés.
2. Le moteur choisit la scène compatible la plus spécifique. Une scène générique sans condition doit exister pour chaque étape.
3. `STORY_PROLOGUE.version` et `STORY_SAVE_KEY` sont passés en V3. Une ancienne sauvegarde V2 ne doit pas être rejouée contre un scénario remanié ; cela réinitialise le prologue expérimental sur le navigateur.
4. Le test initial des 4096 combinaisons est conservé **uniquement sur les 12 premières étapes**. Les 2^40 chemins ne sont pas explorés exhaustivement ; des tests pseudo-aléatoires, une recherche équilibrée et des parcours ciblés complètent la couverture.
5. Les résultats CI et le rendu mobile doivent être confirmés pour le SHA exact. Un Vercel `READY` n'atteste ni la lisibilité à 320 px ni le plaisir de jeu.

## Restant à vérifier et améliorer

- Mesurer le taux de survie aux étapes 12, 20, 28, 36 et 40. Si la majorité des joueurs terminent précocement, ajuster les **effets** plutôt que tricher sur les règles de fin.
- Confirmer sur navigateur réel les 40 étapes, la reprise V3, le double-tap et l'absence de débordement horizontal ; contrôler également l'orientation et le clavier.
- Passer une révision éditoriale sur les répétitions Flo/Nox, le rythme des scènes calmes et l'équilibre des compromis ; tester au moins cinq parties en lecture humaine.
- Refaire les captures pour les scènes tardives `grand_final_collectif`, `grand_final_nox`, `grand_final_verite` et la fin générique.
- **Aucune revendication de 20–30 minutes tant qu'un chronométrage de vraies parties n'a pas été effectué.**

## Passation rapide à un autre agent

Lis d'abord `AGENTS.md`, `DESIGN.md`, `src/lib/story-mode.ts`, `src/data/story-prologue.ts`, `src/data/story-season.ts`, `src/lib/story-mode.test.ts` et `e2e/story-mode.spec.ts`. Commence par inspecter la CI du SHA courant avant de retoucher le moteur. Ne touche pas au Drop, à l'économie, à Supabase, ni au site de production. Ne fusionne pas la PR sans validation explicite.


## Vérification éditoriale du 28 octobre 2026

La colonne « Décision gauche / droite » a été réalignée automatiquement sur les libellés de `src/data/story-season.ts` : **29 lignes rectifiées**, dont **29 inversions strictes** des deux choix. La source de vérité pour le sens gauche/droite reste le scénario TypeScript ; aucun effet, flag, identifiant, ordre de scène ou sauvegarde V4 n'a été modifié. La documentation ne doit jamais servir à inverser les choix du jeu lors de l'intégration dans `main`.
