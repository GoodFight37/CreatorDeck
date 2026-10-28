# Lot C — résolution mobile et coût des agrandissements

Audit en lecture seule, base `6c82d3ec`, issue `CreatorDeck-Codex-vpb`.
Aucun fichier ajouté à public, aucune image remplacée.

## Méthode et résultats

Les fichiers réellement référencés sont ouverts par Sharp : priorité manuelle,
portrait, fourni puis avatar pour les créateurs ; propriété image des catalogues
MEMES/Imgflip. Comparaison avec deux pixels source par pixel CSS (DPR cible 2).
Scène d'ouverture : largeur `min(74vw,370px,(max(100dvh,520px)-280px)*.715)`,
hauteur largeur/.715, d'après booster-continuity.css ; image plein cadre.
Créateurs en cover : maximum des facteurs largeur/hauteur ; MEMES/Imgflip en
contain : minimum, avec retrait de 4,4 % pour Full Art. Le fond flouté n'est
pas assimilé à l'illustration. Il s'agit du calcul CSS, pas d'une mesure sur
téléphone physique ; le zoom d'inspection et les cartes compactes changent le besoin.

| Famille | Fichiers référencés | Trop petits 320×568 | Trop petits 390×844 | Trop petits 412×915 | Absents/illisibles |
|---|---:|---:|---:|---:|---:|
| Créateurs | 1 000 | 454 | 998 | 998 | 0 |
| Imgflip | 999 | 118 | 987 | 991 | 0 |
| MEMES FR | 2 150 | 17 | 171 | 174 | 0 |

Créateurs réellement affichés : 544 images 600×600, **454 en 450×450** et
2 en 900×900, donc pas 1 000 sources effectives en 600×600. À 390 px, la carte
fait environ 288,6×403,6 CSS : un carré en cover doit fournir au moins 807 px
de haut pour le DPR2. Les deux 900×900 suffisent, pas les carrés 450/600.
Imgflip : sources très souvent limitées à 480 px sur une dimension (85 fichiers
480×270, 59 en 480×480). MEMES : 962 en 640×360 et 799 en 640×482 dominent,
et le contain évite d'agrandir l'image jusqu'à la hauteur complète du cadre.

## Coût / bénéfice du scénario demandé

| Option | Disponibilité | Ajout estimé APK | Bénéfice / limite |
|---|---|---:|---|
| Garder les sources actuelles | 1 000 créateurs | 0 | Qualité native inchangée ; beaucoup de sources sous DPR2 |
| Réintégrer archive/upscaled pour Épique et mieux | 170 éligibles, **0 archive correspondante** | 0 fichier réutilisable, scénario non réalisable en l'état | Aucune amélioration possible avec ce sous-ensemble existant |
| Réintégrer les 699 archives en bloc | 299 communes, 300 peu communes, 100 rares | Hors scénario demandé | N'améliorerait aucun Épique/Légendaire ; détails inventés par Upscayl déjà signalés dans le résolveur |

Le contrôle porte sur les noms exacts `archive/upscaled/<slug>.webp` croisés avec
les raretés du catalogue. L'APK debug existante contient 4 162 WebP stockés sans
compression ZIP (`compress_type=0`) : pour un ajout futur, coût marginal proche
de la somme des octets WebP + en-têtes ZIP/signature, et non d'une hypothétique
forte réduction par DEFLATE. Pour les 170 éligibles actuels, il n'existe aucun
octet d'archive à additionner ; ce n'est pas une estimation gratuite d'un futur
agrandissement. Produire de nouvelles sources demanderait un travail distinct.

Priorité suggérée : sources de meilleure définition pour les créateurs 450 px
et Imgflip les plus vus ; vérifier visuellement la source avant d'agrandir.
Un agrandissement synthétique augmente le nombre de pixels sans recréer de
détails fiables. Aucun téléchargement, remplacement ou achat effectué.
