/**
 * Last Pack, côté écran : la fenêtre de dix minutes et les phrases qui vont
 * avec.
 *
 * Ces règles existent **aussi** dans `supabase/migrations/0012_last_pack.sql`,
 * et c'est le serveur qui tranche (le paquet est exposé ou non, le vol passe ou
 * non). Ce module ne décide rien : il rend lisible ce que le serveur a déjà
 * décidé — un compte à rebours, un nombre de cartes encore prenables, un
 * libellé. C'est pour ça qu'il est pur et testé : une fenêtre affichée qui ne
 * serait pas celle du serveur ferait croire à un vol possible qui ne l'est
 * plus.
 */
import type { LastPack, LastPackCard, LastPackShelf } from "@/lib/cloud/api";

/** La fenêtre d'exposition. Doit rester celle écrite dans `0012_last_pack.sql`. */
export const LAST_PACK_WINDOW_MS = 10 * 60_000;

/**
 * Combien de temps il reste à un paquet, en millisecondes.
 *
 * On part de la fenêtre **du serveur** (`expiresAt - now`) et on la décrémente
 * avec l'horloge de l'appareil depuis le chargement. Un téléphone dont
 * l'horloge avance ne peut donc pas rallonger la fenêtre, et un téléphone en
 * retard ne la raccourcit pas non plus : c'est la même durée pour tout le
 * monde.
 */
export function remainingMs(
  pack: { expiresAt: string },
  serverNow: string,
  loadedAt: number,
  now: number,
): number {
  const expires = Date.parse(pack.expiresAt);
  const start = Date.parse(serverNow);
  if (!Number.isFinite(expires) || !Number.isFinite(start)) return 0;
  const window = expires - start;
  return Math.max(0, window - Math.max(0, now - loadedAt));
}

/**
 * Ce qui ne se prend pas : une Légendaire, et une carte Live (`0034`).
 *
 * La règle est écrite **deux fois** — dans
 * `supabase/migrations/0034_last_pack_protege.sql` pour le refus, ici pour
 * griser — parce que l'écran doit pouvoir le dire sans attendre un aller-retour.
 * Le serveur tranche ; `supabase-last-pack-protege.test.ts` tient les deux
 * copies ensemble : elles ne peuvent pas diverger en silence.
 */
export function cardIsProtected(
  card: Pick<LastPackCard, "rarity" | "variant" | "stealable">,
): boolean {
  return card.stealable === false || card.rarity === "legendary" || card.variant === "live";
}

/**
 * Est-ce que **cette** carte peut être choisie maintenant ? Les cinq conditions
 * sont celles du serveur : la carte n'est pas déjà prise, elle ne fait pas
 * partie des protégées, le paquet m'autorise un vol, ce n'est pas le mien, et
 * la fenêtre est encore ouverte.
 */
export function canPickCard(pack: LastPack, card: LastPackCard, restant: number): boolean {
  return (
    !card.taken &&
    !cardIsProtected(card) &&
    pack.stealable &&
    !pack.mine &&
    restant > 0
  );
}

/** « 8 min », « 42 s », « terminé » : jamais un compte à rebours à la seconde. */
export function countdownLabel(ms: number): string {
  if (ms <= 0) return "terminé";
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  return `${Math.ceil(seconds / 60)} min`;
}

/**
 * Combien de cartes je peux prendre **maintenant** : les paquets d'amis encore
 * frais, quand il me reste mon vol du jour.
 */
export function readySteals(shelf: LastPackShelf | null, loadedAt: number, now: number): number {
  if (!shelf || shelf.stoleToday) return 0;
  const serverNow = shelf.now;
  // `stealable` vient du serveur ; le `!mine` est une seconde ceinture : son
  // propre paquet ne se prend jamais, même si un jour la réponse changeait.
  return shelf.packs.filter(
    (pack) => pack.stealable && !pack.mine && remainingMs(pack, serverNow, loadedAt, now) > 0,
  ).length;
}

/**
 * La phrase de la feuille quand il n'y a rien à prendre : elle dit *pourquoi*,
 * parce que « rien » et « tu as déjà pris la tienne » ne veulent pas dire la
 * même chose.
 */
export function emptyShelfHint(shelf: LastPackShelf | null, loadedAt: number, now: number): string {
  if (shelf?.stoleToday) {
    return "Ta carte du jour est prise. Reviens demain : un vol par jour, pas deux.";
  }
  const mine = shelf?.packs.filter((pack) => pack.mine && remainingMs(pack, shelf.now, loadedAt, now) > 0) ?? [];
  if (mine.length > 0) {
    return "Ton paquet est exposé : un ami peut t'y prendre une carte. Rien à faire de ton côté — sinon surveiller.";
  }
  return "Aucun paquet exposé en ce moment. Un paquet reste visible dix minutes après son ouverture : reviens quand un ami ouvre le sien.";
}
