# Les assets sonores

> **D'où viennent les bruitages du jeu, ce qu'il en utilise, et comment.** Les
> sons voyagent dans l'APK : la sélection est donc **courte et justifiée**, et
> `src/lib/sfx.test.ts` garde la main sur le budget.
>
> **Le pack d'origine n'est plus dans le dépôt** (8 octobre 2026) : après la
> sélection, `public/sound effects/` (400 fichiers, 87 Mo) a été **retiré** —
> c'est `public/sfx/` (15 fichiers, ≈1 Mo) qui est le livrable. Le tableau
> ci-dessous garde les **chemins du pack**, pour retrouver un son d'origine si un
> geste en réclame un nouveau.

## Ce que le jeu utilise

**15 bruitages**, copiés dans `public/sfx/` sous des noms d'URL simples (sans
espace ni accent — les packs d'origine ne sont pas nommés pour le web) :

| Bruitage | Fichier d'origine | Où il sert |
|---|---|---|
| `card-draw.wav` | `Card and Board/card_draw_1` | une carte se retourne (révélation), un paquet se déchire |
| `card-fan.wav` | `Card and Board/card_fan` | on fait glisser une poignée de cartes (filtres du Binder) |
| `card-turn.wav` | `Card and Board/card_fan_2` | une page du Binder se tourne |
| `chip-place.wav` | `Card and Board/chips_place_1` | une carte se pose (invité sur un socle, doublon sacrifié) |
| `click.wav` | `UI/click_double_on` | le clic feutré des onglets et des boutons |
| `select.wav` | `UI/select_1` | une sélection qui compte (un côté d'imprévu, un invité posé) |
| `menu-open.wav` | `UI/toggle_on` | une feuille s'ouvre (un menu, un panneau) |
| `close.wav` | `Items/book_close` | une feuille se ferme (et le refus d'une carte) |
| `pop.wav` | `UI/pop_1` | le booster s'ouvre |
| `coins.wav` | `Items/coin_jingle_small` | des jetons tombent (récompense réclamée) |
| `gather.wav` | `Items/coins_gather_quick` | un lot de jetons d'un coup |
| `equip.wav` | `Items/item_equip` | un palier de setup est acheté : l'équipement entre |
| `power-up.wav` | `Retro/power_up` | un palier vient d'être franchi |
| `chime.wav` | `Musical Effects/8_bit_chime_positive` | une récompense tombe (et la vidéo du jour, quand il y en avait une) |
| `fanfare.wav` | `Musical Effects/brass_chime_positive` | un raid arrive (un invité est en direct) |

> Les quatre derniers bruitages ont été choisis pour l'écran de la simulation de
> streameur, **retiré de l'application le 8 octobre 2026 au soir**. Ils restent
> dans le dépôt, comme le reste de ses sons : ils ne coûtent rien (moins de
> 300 Ko à eux quatre) et les retirer obligerait à refaire l'inventaire du pack
> le jour où l'écran reviendrait. Les trois premiers servent au jeu de cartes.

Le **plan de notes synthétisé** reste par-dessus pour ce qu'un bruitage ne sait
pas dire : la **rareté** d'une carte (l'accord qui monte, la note en plus pour
une variante spéciale) et le **bang** après le silence d'une Épique.

## La licence

Les fichiers viennent du **« 400 Sounds Pack » de Chequered Ink**
(`https://ci.itch.io/400-sounds-pack`, téléchargement libre, +400 sons répartis
en 14 familles — ce sont exactement les dossiers de `public/sound effects/`).

> « You may use these game assets for ANY and ALL uses including commercial use,
> with or without giving credit, except that you may not sell or redistribute the
> unaltered assets as your own game assets. »

Autrement dit : **usage commercial libre, crédit non obligatoire, revente des
fichiers bruts interdite**. Le crédit est donné quand même, à l'écran
(« Toi » → *Crédits*) et ici. C'est cette dernière clause qui impose la forme
retenue : on embarque une **sélection de 15 fichiers** dans le jeu (usage
normal), on ne redistribue pas le pack — le dossier brut (400 fichiers, 87 Mo,
`public/sound effects/` avant le 8 octobre 2026) n'est **pas** un livrable du
jeu, et la sélection seule part dans l'APK (≈1 Mo). Il a donc été **retiré du
dépôt** : le pack reste téléchargeable chez son auteur, et cette page dit
exactement quels fichiers en viennent.

## Pourquoi une sélection, et pas les packs entiers

Le dossier d'origine pesait **87 Mo** et 400 fichiers. L'APK, lui, embarque tout
`public/` : y verser le pack entier coûterait plus cher que tous les portraits
du catalogue réunis, pour des sons de combat, de pas et de vaisselle qu'un jeu
de cartes n'utilise jamais. D'où la règle :

1. **on choisit un bruitage pour un geste**, pas l'inverse ;
2. on le copie sous un nom d'URL propre dans `public/sfx/` ;
3. `src/lib/sfx.test.ts` vérifie l'en-tête RIFF/WAVE, la durée (entre 50 ms et
   2,5 s : un bruitage de geste, pas une musique) et le **budget total**
   (moins de 3 Mo).

Ajouter un bruitage, c'est donc trois lignes : le `cp`, une entrée dans
`SAMPLES` (`src/lib/sfx.ts`), et une fonction de geste qui l'appelle.

## Les sons qu'on n'a pas pris

| Famille | Pourquoi |
|---|---|
| `Combat and Gore`, `Weapons`, `Human` | aucun geste du jeu ne frappe, ne blesse ou ne crie |
| `Footsteps` | on ne se déplace pas |
| `Environment` (11 Mo) | ambiances longues : le studio a ses néons et sa musique intérieure, pas de pluie |
| `Musical Effects` (111 fichiers, 38 Mo) | on n'a gardé que deux carillons ; le reste est de la musique de fond qu'on n'a pas demandée |
| `Machines`, `Materials` | utiles plus tard (un bruit de déchirure de paquet synthétisé, par exemple) |
