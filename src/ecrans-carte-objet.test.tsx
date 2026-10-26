import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { CreatorCard } from "@/components/creator-card";
import { RevealOverlay } from "@/components/reveal-overlay";
import { CREATORS } from "@/lib/catalog";
import { createInitialState } from "@/lib/game-engine";
import { gameStore } from "@/lib/game-store";

let banc: Banc;
beforeEach(() => { vi.useFakeTimers(); banc = creerBanc(); banc.preparer(); });
afterEach(() => { banc.nettoyer(); vi.useRealTimers(); });

it("le cartouche ne contient que le nom et la rareté, sans action annexe", async () => {
  await banc.monter(<CreatorCard creator={CREATORS[0]} onClick={() => {}} />);
  const card = document.querySelector(".creator-card")!;
  expect(card.querySelector(".card-nameplate h3")?.textContent).toBe(CREATORS[0].displayName);
  expect(card.querySelector(".card-rarity-label")).not.toBeNull();
  expect(card.querySelector(".card-footerline, .card-region, .card-broadcast, a")).toBeNull();
  expect(card.querySelectorAll("button")).toHaveLength(1);
});

it("un tap sur la face révélée l'agrandit sans avancer ; fermer reprend la même carte", async () => {
  const creator = CREATORS.find(c => c.rarity === "common")!;
  const card = { id: "carte-objet", creatorSlug: creator.slug, rarity: creator.rarity,
    variant: "standard" as const, rareDrop: false, obtainedAt: Date.now(), isNew: true };
  const state = createInitialState(Date.now());
  state.cards = [card, { ...card, id: "ancienne-holo", variant: "holo" }];
  gameStore.replaceState(state);
  const next = vi.fn();
  await banc.monter(<RevealOverlay cards={[card]} index={0} onNext={next} onClose={vi.fn()} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(1300); });
  const anchor = document.querySelector(".reveal-anchor")!;
  act(() => {
    for (const type of ["pointerdown", "pointerup"]) anchor.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 100, clientY: 100 }));
  });
  expect(document.querySelector(".card-vault .creator-card .card-photo")).not.toBeNull();
  expect(document.querySelector(".card-vault .odds-intro")?.textContent).toBe("2 exemplaires au total · Standard : 1.");
  expect(document.querySelectorAll(".card-vault .inspect-variants button")).toHaveLength(2);
  expect(next).not.toHaveBeenCalled();
  act(() => document.querySelector<HTMLButtonElement>(".card-vault .odds-head button")!.click());
  expect(document.querySelector(".card-vault")).toBeNull();
  expect(document.querySelector(".reveal-overlay")?.getAttribute("data-reveal-index")).toBe("0");
});
