import { useSyncExternalStore } from "react";
import { CATALOG_EDITION_NUMBER } from "@/lib/catalog";
import { BINDER_COLLECTION_BY_ID } from "@/lib/binder-collections";

const KEY = `creatordeck.binder-goal.edition-${CATALOG_EDITION_NUMBER}`;
const EVENT = "creatordeck:binder-goal";

function readGoal() {
  try {
    const id = window.localStorage.getItem(KEY);
    return id && BINDER_COLLECTION_BY_ID.has(id) ? id : null;
  } catch { return null; }
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(EVENT, notify);
  };
}

/** Préférence de cet appareil ; aucune écriture de progression/cloud. */
export function useBinderGoal() {
  const goal = useSyncExternalStore(subscribe, readGoal, () => null);
  return [goal, (id: string | null) => {
    try {
      if (id) window.localStorage.setItem(KEY, id);
      else window.localStorage.removeItem(KEY);
    } catch { /* Le filtre courant reste utilisable si le stockage est bloqué. */ }
    window.dispatchEvent(new Event(EVENT));
  }] as const;
}
