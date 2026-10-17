/**
 * Le cercle du joueur, gardé sur l'appareil.
 *
 * C'est un petit magasin « lisible par React » (`useSyncExternalStore`) : la
 * question « Mes chaînes » l'écrit, l'accueil le lit. Il ne décide rien — le
 * tirage qui compte est celui d'`open_circle_gift_pack()` (`0054_cercle.sql`),
 * qui reçoit le cercle et le revérifie. Une valeur ici n'est jamais crue sur
 * parole : elle sert à l'affichage et à l'aperçu d'un joueur sans compte.
 */
import { useSyncExternalStore } from "react";
import { CIRCLE_MAX, CIRCLE_MIN, isValidCircle } from "@/lib/circle";

export const CIRCLE_STORAGE_KEY = "creatordeck.circle.v1";

const EMPTY: readonly string[] = Object.freeze([]);
const listeners = new Set<() => void>();
// Le snapshot doit garder la même identité tant que le contenu ne change pas,
// sinon `useSyncExternalStore` reboucle : on le recalcule seulement si le texte
// brut a bougé.
let rawCache: string | null | undefined;
let valueCache: readonly string[] = EMPTY;
// Quand le stockage est refusé (navigation privée), le cercle ne vit qu'ici.
let memoryCircle: readonly string[] | null = null;

function parse(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as { v?: number; slugs?: unknown };
    if (data?.v !== 1 || !Array.isArray(data.slugs)) return EMPTY;
    const slugs = data.slugs.filter((slug): slug is string => typeof slug === "string");
    // Un cercle abîmé (trop court, trop long, doublon) vaut « pas de cercle » :
    // mieux reposer la question que tirer dans une liste fausse.
    return isValidCircle(slugs) ? Object.freeze(slugs) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function readCircle(): readonly string[] {
  let raw: string | null = null;
  try {
    raw = typeof window === "undefined" ? null : window.localStorage.getItem(CIRCLE_STORAGE_KEY);
  } catch {
    /* Stockage refusé : le cercle ne vit alors que le temps de la session. */
    return memoryCircle ?? valueCache;
  }
  if (raw !== rawCache) {
    rawCache = raw;
    valueCache = parse(raw);
  }
  return valueCache === EMPTY && memoryCircle ? memoryCircle : valueCache;
}

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Date (ms) du dernier enregistrement du cercle sur cet appareil, `null` si
 * inconnue. Sert à départager l'appareil et le compte en ligne (D-143).
 */
export function readCircleSavedAt(): number | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(CIRCLE_STORAGE_KEY);
    if (!raw) return null;
    const at = (JSON.parse(raw) as { at?: unknown }).at;
    return typeof at === "number" && Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

/**
 * Enregistre le cercle (5 à 15 chaînes différentes) ; refuse tout le reste.
 * `at` permet de garder la date du compte en ligne quand c'est lui qui gagne.
 */
export function writeCircle(slugs: readonly string[], at: number = Date.now()): boolean {
  if (!isValidCircle(slugs)) return false;
  const value = Object.freeze([...slugs]);
  try {
    window.localStorage.setItem(CIRCLE_STORAGE_KEY, JSON.stringify({ v: 1, slugs: value, at }));
    memoryCircle = null;
  } catch {
    // Pas de stockage : on garde au moins la session en cours.
    memoryCircle = value;
  }
  notify();
  return true;
}

export function clearCircle(): void {
  try {
    window.localStorage.removeItem(CIRCLE_STORAGE_KEY);
  } catch {
    /* Rien à retirer. */
  }
  rawCache = undefined;
  valueCache = EMPTY;
  memoryCircle = null;
  notify();
}

export function subscribeCircle(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Le cercle du joueur : liste vide tant qu'il n'a pas répondu à la question. */
export function useCircle(): readonly string[] {
  return useSyncExternalStore(subscribeCircle, readCircle, () => EMPTY);
}

export { CIRCLE_MAX, CIRCLE_MIN };
