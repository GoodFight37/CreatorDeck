/**
 * La mise en scène d'une révélation : ce qui se passe, et quand.
 *
 * Ce module ne fait **rien** — pas de DOM, pas de son, pas de minuteur, pas de
 * vibration. Il décide du déroulé, l'écran l'exécute. C'est ce qui permet de
 * tester la mise en scène (le silence avant un Légendaire, la carte qui refuse
 * de se retourner, le verrou du Perfect) sans navigateur ni horloge.
 *
 * Trois idées, empruntées à ce qui marche dans les jeux de cartes :
 *
 *   1. **le silence est un son.** Un Légendaire qui arrive après un blanc de
 *      520 ms frappe plus fort que le même Légendaire enchaîné — c'est le
 *      silence qui fait le bruit ;
 *   2. **la résistance crée la valeur.** Le dernier emplacement, celui du
 *      tirage garanti, ne se retourne pas du premier coup : il frémit. Le
 *      joueur insiste, et c'est *lui* qui a retourné la carte ;
 *   3. **le Perfect ne se déguste pas carte par carte.** Quand les cinq sont
 *      Épiques, on les montre d'un coup et on verrouille l'écran deux secondes
 *      et demie :
 *      il n'y a rien à faire, juste à regarder.
 */
import type { CardVariant, Rarity } from "@/lib/catalog";

/**
 * Le silence avant le retournement d'une carte Épique ou mieux, en ms.
 *
 * 520 ms et pas 400 : sur un téléphone, le blanc doit être **assez long pour
 * qu'on le remarque**, sinon il ne fait que décaler le son. C'est le silence
 * qui fait le bruit — à condition qu'il s'entende.
 */
export const EPIC_SILENCE_MS = 520;

/** Le temps d'un refus : la carte frémit au lieu de se retourner, en ms. */
export const RESIST_SHAKE_MS = 580;

/** Le temps pendant lequel l'écran du Perfect reste verrouillé, en ms. */
export const PERFECT_LOCK_MS = 2_600;

/**
 * Le temps de la **déchirure** : l'instant entre le geste et la première carte,
 * en ms.
 *
 * Sans lui, on passe du bouton « Ouvrir » à une carte en plein écran sans
 * transition : le paquet n'existe jamais, il n'y a rien à ouvrir. Sept cents
 * millisecondes de déchirure, et la carte qui suit devient une conséquence.
 *
 * Il vaut **zéro** quand le joueur a coupé les effets de carte : ce réglage est
 * son bouton de secours, il ne doit pas seulement éteindre des pixels.
 */
export const PACK_TEAR_MS = 850;

/**
 * Le motif de la déchirure : un coup sec, un blanc, puis le papier qui cède.
 * Plus long que `TEAR_HAPTIC` (le geste qui arme) parce qu'ici le doigt a
 * quitté l'écran — une rafale sous le doigt donne l'impression d'un bug, une
 * rafale après le geste donne l'impression d'un paquet qui s'ouvre.
 */
export const PACK_TEAR_HAPTIC: readonly number[] = [18, 70, 34];

/**
 * Combien de temps la déchirure dure, **pour de vrai**.
 *
 * `false` quand le joueur a coupé les effets ou demandé moins d'animations :
 * la carte arrive alors tout de suite. Le son de l'ouverture, lui, part quand
 * même — il est coupé par l'interrupteur Son, pas par celui des reflets.
 */
export function tearDurationMs(effectsOn: boolean): number {
  return effectsOn ? PACK_TEAR_MS : 0;
}

/** Les raretés qui méritent un silence, donc un bang. */
const SILENT_RARITIES: ReadonlySet<Rarity> = new Set<Rarity>(["epic", "legendary"]);

/** Vrai pour l'emplacement que le tirage réserve (le dernier du paquet). */
export function isFinalSlot(index: number, count: number): boolean {
  return count > 0 && index === count - 1;
}

/**
 * Combien de fois la carte refuse de se retourner.
 *
 * Le dernier emplacement résiste **toujours** une fois — c'est le moment qu'on
 * annonce (« carte garantie »), il doit se faire attendre. Si la carte est en
 * plus Épique ou mieux, elle résiste deux fois : le joueur qui a déjà compris
 * pourra lire « deux fois » dans ses doigts.
 */
export function resistCount(index: number, count: number, rarity: Rarity): number {
  if (!isFinalSlot(index, count)) return 0;
  return SILENT_RARITIES.has(rarity) ? 2 : 1;
}

/**
 * Le silence à observer **avant** de jouer le son de la carte, en ms.
 *
 * Zéro pour presque tout : une commune qui attend fait juste perdre du temps.
 * 520 ms pour une Épique ou une Légendaire — le temps d'un doute.
 */
export function silenceBefore(rarity: Rarity): number {
  return SILENT_RARITIES.has(rarity) ? EPIC_SILENCE_MS : 0;
}

/**
 * Le motif de vibration d'une carte révélée.
 *
 * `navigator.vibrate` prend un motif « vibre, pause, vibre… ». Plus la carte est
 * rare, plus le motif est long et dense — un Légendaire se sent avant de se
 * lire. Une variante spéciale (Gold, Live) ajoute une pulsation finale : c'est
 * la matière, pas la rareté, qui décide de la dernière impression.
 */
export function revealHaptic(rarity: Rarity, variant: CardVariant = "standard"): number[] {
  const base: Record<Rarity, number[]> = {
    common: [16],
    uncommon: [16, 40, 16],
    rare: [18, 45, 18, 45, 22],
    epic: [24, 50, 24, 50, 24, 50, 40],
    legendary: [28, 55, 28, 55, 28, 55, 28, 55, 90],
  };
  const pattern = [...(base[rarity] ?? base.common)];
  if (variant !== "standard") pattern.push(35, 45, 45);
  return pattern;
}

/** Le motif d'un refus : deux pulsations courtes, « non » puis « toujours non ». */
export function resistHaptic(): number[] {
  return [12, 90, 12];
}

/**
 * Le motif du Perfect : le plus long de l'application, et il ne s'excuse pas.
 * Il couvre les deux secondes de verrouillage, avec un pic à la fin.
 */
/**
 * Le geste d'ouverture qui arme : **une** vibration courte, au moment où le
 * seuil est franchi. Pas un motif : le doigt est encore sur l'écran, et une
 * rafale de vibrations sous le doigt donne l'impression d'un bug. Le vrai
 * retour haptique du déballage vient après, avec la révélation des cartes.
 */
export const TEAR_HAPTIC: readonly number[] = [16];

export const PERFECT_HAPTIC: readonly number[] = [30, 40, 30, 40, 30, 40, 30, 40, 30, 40, 240];

/**
 * Le paquet est un Perfect quand le tirage rare s'est déclenché.
 *
 * Rappel de la règle du jeu : le Perfect se décide au tirage (tous les emplacements
 * en Épique ou mieux), il ne se constate pas après coup sur les cartes reçues.
 */
export function isPerfect(cards: readonly { rareDrop?: boolean }[]): boolean {
  return Boolean(cards[0]?.rareDrop);
}

/** Vrai pour une carte qui mérite l'écran entier : Légendaire, ou Perfect. */
export function deservesSpotlight(rarity: Rarity, perfect: boolean): boolean {
  return perfect || rarity === "legendary";
}
