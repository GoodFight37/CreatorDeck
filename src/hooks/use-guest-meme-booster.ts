"use client";

import { useMemo, useState } from "react";
import { MEME_CARDS, type MemeCard } from "@/lib/memes";

/**
 * Ouverture locale de démonstration, sans RPC, compte ni sauvegarde.
 * Les objets proposés reproduisent exactement l'interface de MemeBoosterOpening,
 * mais ne modifient jamais la réserve ou la collection du joueur.
 */
export const GUEST_MEME_CARDS = MEME_CARDS.filter((card) => !card.id.startsWith("imgflip-"));
export const GUEST_IMGFLIP_CARDS = MEME_CARDS.filter((card) => card.id.startsWith("imgflip-"));

export const GUEST_MEME_LABELS = {
  ariaLabel: "Démonstration du booster MEMES",
  summaryKicker: "DÉMONSTRATION · CARTES NON CONSERVÉES",
  summaryTitle: "Tes 5 cartes de test",
  close: "TERMINER LA DÉMO",
};
export const GUEST_IMGFLIP_LABELS = {
  ...GUEST_MEME_LABELS,
  ariaLabel: "Démonstration du booster IMGFLIP",
};

type GuestState = {
  phase: "closed" | "prepared" | "opening";
  cards: string[];
  extracted: boolean;
  focus: HTMLElement | null;
  openingNumber: number;
};

const INITIAL: GuestState = {
  phase: "closed", cards: [], extracted: false, focus: null, openingNumber: 0,
};

/** Donne quatre visuels variés et une Rare ou mieux, sans prétendre simuler les taux serveur. */
export function useGuestMemeBooster(catalog: readonly MemeCard[]) {
  const [state, setState] = useState<GuestState>(INITIAL);
  const [common, special] = useMemo(() => {
    const available = catalog.filter((card) => card.image && !card.retired);
    return [
      available.filter((card) => card.rarity === "common" || card.rarity === "uncommon"),
      available.filter((card) => !["common", "uncommon"].includes(card.rarity)),
    ];
  }, [catalog]);
  const opening = useMemo(() => state.cards.length === 5 ? { cards: state.cards } : null, [state.cards]);
  const copies = useMemo(() => new Map<string, number>(), []);

  return {
    copies, opening, extracted: state.extracted,
    presenting: state.phase !== "closed",
    prepared: state.phase === "prepared",
    returnFocusTo: state.focus,
    prepare: () => {
      if (state.phase !== "closed" || !common.length || !special.length) return;
      const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setState((old) => ({ ...old, phase: "prepared", cards: [], extracted: false, focus }));
    },
    cancel: () => setState((old) => old.phase === "prepared" ? { ...old, phase: "closed" } : old),
    commit: () => {
      setState((old) => {
        if (old.phase !== "prepared") return old;
        const offset = (old.openingNumber * 4) % common.length;
        const chosen = Array.from({ length: 4 }, (_, i) => common[(offset + i) % common.length]?.id);
        const guaranteed = special[old.openingNumber % special.length]?.id;
        if (!guaranteed || chosen.some((id) => !id) || new Set([...chosen, guaranteed]).size !== 5) return old;
        return {
          ...old, phase: "opening", cards: [...chosen, guaranteed],
          extracted: false, openingNumber: old.openingNumber + 1,
        };
      });
    },
    complete: () => setState((old) => ({ ...old, extracted: true })),
    close: () => setState((old) => ({ ...old, phase: "closed", cards: [], extracted: false })),
    leavePending: () => setState((old) => ({ ...old, phase: "closed", cards: [], extracted: false })),
  };
}
