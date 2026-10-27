import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { MemeReveal } from "@/components/meme-reveal";
import { MEME_CARDS } from "@/lib/memes";

const banc = creerBanc();
beforeEach(() => { vi.useFakeTimers(); banc.preparer(); });
afterEach(() => { banc.nettoyer(); vi.useRealTimers(); });

function pointer(type: string, id: number, x: number, primary = true) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 80, button: 0 });
  Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: primary } });
  act(() => document.querySelector(".meme-reveal-card-wrap")!.dispatchEvent(event));
}

it("garde le premier doigt jusqu'au relâchement, même hors de la carte", async () => {
  await banc.monter(<MemeReveal cards={MEME_CARDS.slice(0, 5)} copies={new Map()} onClose={() => {}} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
  const card = document.querySelector<HTMLElement>(".meme-reveal-card-wrap")!;
  const capture = vi.spyOn(card, "setPointerCapture");
  pointer("pointerdown", 1, 120);
  expect(capture).toHaveBeenCalledWith(1);
  pointer("pointerdown", 2, 210, false);
  pointer("pointerup", 2, 260, false);
  expect(document.querySelector(".meme-reveal-counter")?.textContent).toContain("1 / 5");
  pointer("pointerup", 1, 200);
  expect(document.querySelector(".meme-reveal-counter")?.textContent).toContain("2 / 5");
});

it.each(["pointercancel", "lostpointercapture"])("annule le geste sur %s", async (type) => {
  await banc.monter(<MemeReveal cards={MEME_CARDS.slice(0, 5)} copies={new Map()} onClose={() => {}} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
  pointer("pointerdown", 1, 120);
  pointer(type, 1, 120);
  pointer("pointerup", 1, 200);
  expect(document.querySelector(".meme-reveal-counter")?.textContent).toContain("1 / 5");
});

it("réutilise le parcours pour un univers isolé sans imposer la carte MEMES", async () => {
  const close = vi.fn();
  await banc.monter(<MemeReveal
    cards={MEME_CARDS.slice(0, 5)}
    copies={new Map()}
    onClose={close}
    labels={{
      ariaLabel: "Résultat de l’aperçu Kyara",
      summaryKicker: "MEILLEURE CARTE · TEST",
      summaryTitle: "5 cartes locales",
      close: "REVENIR À L’APERÇU",
    }}
    renderCard={(card, compact) => <article data-kyara-card={card.id} data-compact={compact}>{card.name}</article>}
  />);

  expect(document.querySelector("[aria-label=\"Résultat de l’aperçu Kyara\"]")).toBeTruthy();
  for (let index = 0; index < 5; index += 1) {
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    act(() => document.querySelector<HTMLButtonElement>(".meme-reveal-next")!.click());
  }
  expect(document.querySelectorAll("[data-kyara-card]")).toHaveLength(5);
  expect(document.querySelector(".meme-reveal-summary-title")?.textContent).toContain("MEILLEURE CARTE · TEST");
  await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
  act(() => document.querySelector<HTMLButtonElement>(".meme-reveal-next")!.click());
  expect(close).toHaveBeenCalledOnce();
});
