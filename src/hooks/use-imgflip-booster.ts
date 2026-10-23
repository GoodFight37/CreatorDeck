"use client";

import { useRef, useState } from "react";
import { drawImgflipPack } from "@/lib/imgflip-booster";
import { PITY } from "@/lib/pull-rates";

/** Ouvertures temporaires : aucune sauvegarde, monnaie ou requête backend. */
export function useImgflipBooster() {
  const phase = useRef<"closed" | "prepared" | "opening">("closed");
  const dry = useRef(0);
  const [state, setState] = useState<{
    phase: "closed" | "prepared" | "opening"; cards: string[]; extracted: boolean; focus: HTMLElement | null;
  }>({ phase: "closed", cards: [], extracted: false, focus: null });
  function close() {
    phase.current = "closed";
    setState(previous => ({ ...previous, phase: "closed", cards: [], extracted: false }));
  }
  return {
    presenting: state.phase !== "closed",
    prepared: state.phase === "prepared",
    opening: state.cards.length ? { cards: state.cards } : null,
    extracted: state.extracted,
    copies: new Map(state.cards.map(id => [id, 1])),
    returnFocusTo: state.focus,
    prepare() {
      if (phase.current !== "closed") return;
      const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      phase.current = "prepared";
      setState({ phase: "prepared", cards: [], extracted: false, focus });
    },
    commit() {
      if (phase.current !== "prepared") return;
      const cards = drawImgflipPack(dry.current >= PITY.threshold);
      dry.current = cards.some(card => card.rarity === "legendary") ? 0 : dry.current + 1;
      phase.current = "opening";
      setState(previous => ({ ...previous, phase: "opening", cards: cards.map(card => card.id) }));
    },
    complete: () => setState(previous => ({ ...previous, extracted: true })),
    cancel: close,
    close,
    leavePending: close,
  };
}
