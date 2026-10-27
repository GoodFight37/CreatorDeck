"use client";

import { useEffect, useRef, useState } from "react";
import { ANIME_BY_ID, drawAnimePack } from "@/lib/anime";
import { deviceStorage } from "@/lib/storage";

const COLLECTION_KEY = "creatordeck.anime.collection.v1";

type State = {
  phase: "closed" | "prepared" | "opening";
  cards: string[];
  extracted: boolean;
  focus: HTMLElement | null;
};

function readCollection() {
  const storage = deviceStorage();
  if (!storage) return new Map<string, number>();
  try {
    const value: unknown = JSON.parse(storage.getItem(COLLECTION_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return new Map<string, number>();
    return new Map(Object.entries(value).filter(([id, copies]) =>
      ANIME_BY_ID.has(id) && Number.isInteger(copies) && Number(copies) > 0,
    ).map(([id, copies]) => [id, Number(copies)]));
  } catch {
    return new Map<string, number>();
  }
}

function writeCollection(copies: Map<string, number>) {
  try {
    deviceStorage()?.setItem(COLLECTION_KEY, JSON.stringify(Object.fromEntries(copies)));
  } catch {
    // La révélation reste jouable si le stockage de l'appareil est indisponible.
  }
}

export function useAnimeBooster() {
  const [state, setState] = useState<State>({ phase: "closed", cards: [], extracted: false, focus: null });
  const [copies, setCopies] = useState<Map<string, number>>(new Map());
  const committed = useRef(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setCopies(readCollection()); });
    return () => { active = false; };
  }, []);

  function prepare() {
    if (state.phase !== "closed") return;
    committed.current = false;
    setState({
      phase: "prepared",
      cards: [],
      extracted: false,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    });
  }

  function cancel() {
    setState((value) => value.phase === "prepared" ? { ...value, phase: "closed" } : value);
  }

  function commit() {
    if (state.phase !== "prepared" || committed.current) return;
    committed.current = true;
    const cards = drawAnimePack();
    const next = new Map(copies);
    for (const card of cards) next.set(card.id, (next.get(card.id) ?? 0) + 1);
    writeCollection(next);
    setCopies(next);
    setState((value) => ({ ...value, phase: "opening", cards: cards.map((card) => card.id) }));
  }

  return {
    copies,
    presenting: state.phase !== "closed",
    prepared: state.phase === "prepared",
    extracted: state.extracted,
    returnFocusTo: state.focus,
    opening: state.cards.length ? { cards: state.cards } : null,
    prepare,
    cancel,
    commit,
    complete: () => setState((value) => ({ ...value, extracted: true })),
    close: () => setState((value) => ({ ...value, phase: "closed", cards: [], extracted: false })),
    leavePending: () => setState((value) => ({ ...value, phase: "closed", cards: [], extracted: false })),
  };
}

export type AnimeBooster = ReturnType<typeof useAnimeBooster>;
