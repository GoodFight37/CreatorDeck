# Brief de revue à Grok — CreatorDeck, actualisé le 13 octobre 2026

Tu as accès à GitHub : https://github.com/GoodFight37/CreatorDeck, branche main.
Pars du HEAD courant (pilote portraits `ed20ebd842dcea65acdf5e9b7ebb48f89a5a5e55`),
puis lis README.md, `docs/agent-handoff.md`, le plan actif de `docs/roadmap.md`,
`docs/perimetre.md` et les rapports récents liés au sujet. Les rapports datés
expliquent les décisions ; vérifie le code courant avant tout constat.

## État des portraits — mise à jour importante

Malik a trouvé artificiels plusieurs visages agrandis par Upscayl. Le code
réaffiche donc les avatars Twitch d’origine pour les entrées concernées. Les
699 fichiers agrandis restent archivés, mais ne servent plus à l’affichage.
Les 300 portraits choisis manuellement restent intacts ; les remplacements
Commons crédités et la photo fournie de Diverron gardent leur priorité.
Voir `docs/portrait-upscale-review-2026-10-13.md` et décision D-065.

Un pilote d’automatisation a ensuite été créé dans `tools/portrait-pilot/` :
SerpApi Google Images recherche des candidates, MediaPipe local détecte et
cadre un visage, puis une galerie permet une revue humaine. Sur 20 créateurs,
1 925 résultats de recherche ont donné 100 candidates analysées, six
propositions techniques et quatorze portraits actuels conservés. Aucune identité
ni licence n’est certifiée automatiquement ; zéro portrait est prêt à publier.
Les 300 choix manuels et portraits déjà acceptés sont protégés. Le rapport
`docs/portrait-pilot-2026-10-13.md` donne la méthode, les exemples, les limites
et les tests. La CI du commit `ed20ebd8` est verte (run 38388400407).

Malik doit encore ouvrir le ZIP de galerie et décider pour les six propositions.
Ne présente pas le pilote comme un remplacement automatique fiable des quelque
697 avatars restants. Il n’y a eu aucune modification des assets/sélecteurs du
jeu dans le commit du pilote.

Pour cette revue, évalue séparément : (1) si le retour aux originaux répond au
problème visuel décrit ; (2) si les preuves et la galerie rendent la revue
humaine pratique ; (3) quels garde-fous ou étapes manquent avant d’étendre la
recherche au reste. Ne déduis pas l’identité d’une personne en regardant son
visage. Distingue bug démontré, jugement esthétique et incertitude sur la source
ou les droits. N’affirme pas que les six propositions sont validées.

Malik veut ton avis sur l’application qu’il utilise sur Vercel : facilité au
pouce, lisibilité, plaisir d’ouvrir et de collectionner, rythme et rendu des
boosters. Quatre piliers : Drop, Binder, Craft, Toi ; Supabase gère les actions
multijoueurs. Le support Android existe, mais Vercel est son usage actuel.

Le catalogue a 1 000 routes d’images, mais elles ne représentent pas 1 000
identités/photos vérifiées : 300 choix manuels, 699 images Upscayl archivées
et non affichées, ainsi que les sélections Commons créditées et les choix
acceptés. Malik accepte les avatars génériques quand le créateur n’a pas de
photo de profil, notamment SolaryHS, j0niq et toaststix. Ce n’est pas un bug ni
une tâche de remplacement. Aucune collecte exhaustive des portraits demandée.

Malik précise que le rendu actuel des boosters n’est pas à la hauteur des
vidéos de référence envoyées auparavant. Il attend une vraie amélioration
visuelle, pas seulement une confirmation que les tests passent. Malik a renvoyé une vidéo :
voir docs/reference-ouverture-2026-10-12.md pour son analyse actuelle. La vidéo
elle-même reste hors Git ; la revue visuelle directe nécessite le fichier joint.

Le cahier des charges continuum/matière/geste a ensuite été implémenté :
lis docs/booster-continuum-2026-10-12.md et vérifie le code courant.
Ne présente plus le démontage PackTear → second portail Reveal comme le flux
actuel ; la révélation est intégrée dans la scène persistante.

Évalue surtout :
1. Le parcours ouverture → cinq cartes → récapitulatif, son rythme, lisibilité,
   effets et ergonomie mobile. Les appuis arrivés pendant le flip sont désormais
   mémorisés : vérifie le code actuel avant de présenter cela comme un bug.
2. Le retour du Paquet Scène déjà ouvert est confirmé bon par Malik : aucune
   nouvelle correction n’est demandée sur ce point.
3. Les améliorations utiles aux quatre piliers, par priorité et coût approximatif.
4. L’idée d’élargir le catalogue à d’autres personnalités/personnages : propose
   un cadrage, sans supposer qu’une nouvelle famille ou mécanique est décidée.

Sépare chaque constat en : bug démontré, amélioration subjective, hypothèse
à tester. Cite fichiers et lignes pour les problèmes de code, et donne les
conditions de reproduction. Si tu ne peux pas ouvrir le site ou voir des
captures, dis-le et ne prétends pas juger une animation par sa seule CSS.

La CI du produit est verte : 1 144 unitaires, 109 écrans, 64 E2E, 10 cloud
simulés, SQL jetable/statique/build. Cela ne prouve ni l’expérience sur téléphone
physique ni tous les parcours de production entre plusieurs comptes.

Fais une revue uniquement, sans modifier le code. Termine par cinq actions
maximum, concrètes et classées. Ne réouvre pas la simulation « Ta chaîne »,
i18n, analytics, stores, refonte économique ou suggestions déjà refusées sans
raison nouvelle liée au besoin présent.
