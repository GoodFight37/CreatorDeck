# Cartes Mèmes — audit différentiel du paquet de référence (D-127)

Relevé du 16 octobre 2026, sur `CreatorDeck-Importer-reference-pack.zip` et `main` à `51bcddec` avant modification. Ces observations servent de direction visuelle ; aucun code, dessin de carte ou nouvel asset de la source n'a été importé.

## Fiabilité du relevé

- `animations/animations.json` contient 59 pages : **8 complètes, 51 partielles**. 38 n'ont aucune animation relevée ; l'absence observée ne prouve pas l'absence dans toutes les conditions.
- Le manifeste global annonce 59 observations de layout, **35 familles**, dont 8 complètes et 51 partielles. Le paquet réduit ne donne le détail que de **27 familles et 27 captures desktop**, toutes `partial/resource_cap` et observées une seule fois. Une famille observée une seule fois n'établit pas un gabarit universel.
- Dans cet extrait : 17 Communes, 2 Rares, 5 Épiques, 1 Légendaire, 2 Mythiques et 1 Full Art. Plusieurs captures montrent le cadre sans l'illustration chargée ; elles servent à lire la structure, pas à valider le cadrage final du média.
- Le relevé donne des noms et durées d'animations CSS, mais pas les circonstances exactes de déclenchement de chaque effet. Les itérations `Infinity` prouvent une boucle dans l'état observé, pas l'intention à reproduire. Les quelques comportements `jackpot` et Full Art restent partiels.

| Animation relevée | Occurrences | Durée relevée | Portée observée |
| --- | ---: | ---: | --- |
| `mythic-glow` | 16 (8 complètes, 8 partielles) | 2,8 s | Rotation/surface de carte ; boucle dans l'état capturé. |
| `mk-sweep` | 17 (8 complètes, 9 partielles) | 7 s | Couche de brillant ; boucle dans l'état capturé. |
| `legend-glow` | 1 partielle | 2,8 s | Surface d'une Légendaire ; généralisation impossible. |
| `k2-fa-sweep` | 4 partielles | 7 s | Glint Full Art ; généralisation impossible. |
| `mk-jackpot-rim` | 4 partielles | 5 s | Bord/foil ; contexte jackpot non établi. |
| `k2-v-glow` / `mk-by-shine` | 1 partielle chacun | 1,6 s / 3,2 s | Éléments internes de la page ; pas une règle de carte vérifiée. |

Ces nombres comptent les animations relevées par page, pas les cartes uniques du catalogue. L'extrait de 27 layouts contient 25 structures à 20 couches relevées, une à 17 (Full Art) et une à 120 (cas chargé) ; le nombre de couches du relevé DOM n'est pas un objectif de performance ni un modèle de composants à reprendre.

## Déjà présent / référence encore inexploitée / intérêt / recommandation

| Caractéristique | Déjà présent dans CreatorDeck | Référence encore inexploitée et intérêt | Coût mobile, téléphone réel et recommandation |
| --- | --- | --- | --- |
| Couches cadre, image, identité | Cadre de rareté et cartouche sur Twitch et Mèmes ; média Mèmes en `contain`. | La source sépare davantage la matière du cadre, le plan de l'image et la lumière. Les Mèmes actuels étaient moins aboutis que les Twitch. | Une couche CSS fixe par carte suffit. **Retenu pour Mèmes** ; vérifier la lecture des WebP clairs/sombres sur téléphone. |
| Graduation des raretés | Couleur et bord, avec bord Mythique plus fort ; reveal Rare+ déjà marqué. | L'extrait montre des traitements distincts selon la rareté, mais pas un exemplaire fiable de chaque variante. Intérêt surtout Mèmes : la Commune ne doit pas être une Mythique recolorée. | Gradients simples, aucun timer. **Retenu pour Mèmes** : mat, tranche froide, nacre, chaleur, densité croissantes. Vérifier les cinq niveaux sur téléphone. Twitch déjà différencié par ses variantes ; inchangé. |
| Full Art | Badge et classe dédiée, image encore encadrée comme une standard. | L'unique Full Art détaillé est partiel ; sa hiérarchie plus ouverte est visible, ses effets précis incertains. | Aucun calcul continu. **Retenu pour Mèmes** : plus de surface d'image, cartouche plus léger ; ne pas copier son gabarit exact. Vérifier les compositions extrêmes sur téléphone. |
| Reflet au geste et profondeur | Twitch possède un foil piloté par variables CSS sans re-rendu, désactivable ; Mèmes n'en avait pas. | Un matériau qui répond au geste peut donner de la profondeur à la fiche, s'il reste lié à la surface. | Un écouteur sur la grande fiche, zéro dans la grille ; `mix-blend-mode` limité à une carte. **Retenu pour Mèmes Épique+, Full Art**, réglage Reflets et mouvement réduit respectés. Vérifier au toucher réel. |
| Glow, sweep et jackpot | Glow/impact ponctuels déjà dans les reveals ; boucles rejetées pour la lisibilité (D-099). | 16 observations `mythic-glow` à 2,8 s, 17 `mk-sweep` à 7 s, 4 `mk-jackpot-rim` à 5 s (partielles) ; certaines couches de la source sont plus animées. | Multiples calques animés et fatigue visuelle, surtout dans le classeur. **Écartés** comme boucles ; conserver la mise en scène ponctuelle du reveal. Une éventuelle célébration plus forte exige d'abord un essai physique. |
| Animations d'ouverture de fiche | Pose Twitch de 320 ms et flip Mèmes avec rareté différenciée. | Aucune preuve suffisante que les noms/durées observés correspondent à l'ouverture de fiche plutôt qu'à l'état au repos. | **Pas de nouvelle animation** ; éviter de confondre l'observation d'une boucle avec un déclencheur au tap. |

## Contrôle du rendu

Les captures comparables de la carte agrandie en navigateur mobile 390 × 844 sont conservées dans [`captures/d127/`](captures/d127/) : [Commune](captures/d127/creatordeck-common.png), [Rare](captures/d127/creatordeck-rare.png), [Épique](captures/d127/creatordeck-epic.png), [Légendaire](captures/d127/creatordeck-legendary.png), [Mythique](captures/d127/creatordeck-mythic.png) et [Full Art](captures/d127/creatordeck-fullart.png). Elles ont été inspectées : l'illustration et le nom restent lisibles ; le cadre et la quantité de matière progressent. Elles ne démontrent ni la perception de la nacre sur écran OLED, ni la réaction au doigt, ni la fluidité sur un téléphone physique. Aucun booster physique n'est modifié.
