import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { CircleOnboarding } from "@/components/circle-onboarding";

const banc = creerBanc();
beforeEach(() => banc.preparer());
afterEach(() => banc.nettoyer());
const popular = () => document.querySelector<HTMLButtonElement>(".circle-popular");
function ajouter(text: string) {
  banc.saisir(document.querySelector<HTMLInputElement>(".circle-form input")!, text);
  banc.appuyer("Ajouter");
}

it("attend trois choix reconnus et ajoute au plus deux suggestions sans confirmer", async () => {
  const confirm = vi.fn();
  await banc.monter(<CircleOnboarding onConfirm={confirm} />);
  expect(popular()).toBeNull();
  ajouter("ibai, ninja");
  expect(popular()).toBeNull();
  ajouter("rubius");
  expect(popular()).not.toBeNull();
  banc.appuyer(/Compléter avec/);
  expect(document.querySelectorAll(".circle-chip")).toHaveLength(5);
  expect(confirm).not.toHaveBeenCalled();
  banc.appuyer("Voir mon premier booster");
  expect(confirm).toHaveBeenCalledWith(expect.arrayContaining(["ibai", "ninja", "rubius"]));
  const slugs = confirm.mock.calls[0][0] as string[];
  // Une suggestion automatique ne devient pas un choix personnel après retrait.
  banc.appuyerNom("Retirer ibai");
  expect(popular()).toBeNull();
  expect(slugs).toHaveLength(5);
});

it("ne remplace pas un nom inconnu par la première suggestion", async () => {
  await banc.monter(<CircleOnboarding onConfirm={vi.fn()} />);
  ajouter("kam");
  expect(document.querySelector(".circle-notice")!.textContent).toContain("n’est pas dans le jeu");
  expect(document.querySelectorAll(".circle-chip")).toHaveLength(0);
});

it("refuse cinq entrées si une chaîne est absente du catalogue", async () => {
  await banc.monter(<CircleOnboarding initial={["ibai", "ninja", "rubius", "xqc", "inconnue-xyz"]} onConfirm={vi.fn()} />);
  expect(document.querySelector<HTMLButtonElement>(".circle-actions .welcome-primary")!.disabled).toBe(true);
});
