import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { CircleOnboarding } from "@/components/circle-onboarding";

const banc = creerBanc();
beforeEach(() => banc.preparer());
afterEach(() => banc.nettoyer());
const primary = () => document.querySelector<HTMLButtonElement>(".circle-actions .welcome-primary")!;
function ajouter(text: string) {
  banc.saisir(document.querySelector<HTMLInputElement>(".circle-form input")!, text);
  banc.appuyer("Ajouter");
}

it("ouvre le premier booster sans aucun nom, sans compteur ni liste remplie à sa place", async () => {
  const confirm = vi.fn();
  await banc.monter(<CircleOnboarding onConfirm={confirm} />);
  expect(document.body.textContent).toContain("Ton premier booster t’attend");
  expect(document.body.textContent).not.toMatch(/encore \d+ pour|Compléter avec|entre 5/);
  expect(document.querySelector(".circle-popular")).toBeNull();
  expect(primary().disabled).toBe(false);
  // Le bouton du booster vient avant le champ facultatif.
  expect(primary().compareDocumentPosition(document.querySelector(".circle-form")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  banc.appuyer("Voir mon premier booster");
  expect(confirm).toHaveBeenCalledWith([]);
});

it("une seule chaîne suffit ; un visage suggéré tapé devient un choix, un seul à la fois", async () => {
  const confirm = vi.fn();
  await banc.monter(<CircleOnboarding onConfirm={confirm} />);
  const faces = [...document.querySelectorAll<HTMLButtonElement>(".circle-suggestions button")];
  expect(faces.length).toBeGreaterThan(1);
  expect(faces[0].querySelector("img")).not.toBeNull();
  const label = faces[0].getAttribute("aria-label")!;
  banc.appuyerNom(label);
  expect(document.querySelectorAll(".circle-chip")).toHaveLength(1);
  expect(document.querySelector(".circle-chip-name")!.textContent).toBe(label.replace(/^Ajouter /, ""));
  banc.appuyer("Voir mon premier booster");
  expect(confirm.mock.calls[0][0]).toHaveLength(1);
});

it("garde exactement les chaînes nommées, sans compléter jusqu'à cinq", async () => {
  const confirm = vi.fn();
  await banc.monter(<CircleOnboarding onConfirm={confirm} />);
  ajouter("ibai");
  expect(document.querySelectorAll(".circle-chip")).toHaveLength(1);
  expect(primary().disabled).toBe(false);
  ajouter("ninja");
  banc.appuyer("Voir mon premier booster");
  expect(confirm).toHaveBeenCalledWith(["ibai", "ninja"]);
});

it("ne remplace pas un nom invalide par la première suggestion", async () => {
  await banc.monter(<CircleOnboarding onConfirm={vi.fn()} />);
  ajouter("kam");
  expect(document.querySelector(".circle-notice")!.textContent).toContain("Ce nom de chaîne Twitch n’est pas valide");
  expect(document.querySelectorAll(".circle-chip")).toHaveLength(0);
});

it("accepte une chaîne hors du catalogue, sans carte ni portrait", async () => {
  const confirm = vi.fn();
  await banc.monter(<CircleOnboarding onConfirm={confirm} />);
  ajouter("@Petite_Chaine_Xyz");
  const chip = document.querySelector(".circle-chip")!;
  expect(chip.querySelector("img")).toBeNull();
  expect(chip.querySelector(".circle-chip-nocard")!.textContent).toBe("sans carte");
  expect(document.querySelector(".circle-notice")!.textContent).not.toMatch(/pas dans le jeu|pas valide/);
  expect(primary().disabled).toBe(false);
  banc.appuyer("Voir mon premier booster");
  expect(confirm).toHaveBeenCalledWith(["twitch:petite_chaine_xyz"]);
});

it("refuse une liste reçue si une chaîne est absente du catalogue", async () => {
  await banc.monter(<CircleOnboarding initial={["ibai", "inconnue-xyz"]} onConfirm={vi.fn()} />);
  expect(primary().disabled).toBe(true);
});

it("en modification, un cercle de cinq déjà enregistré reste tel quel, et vider est permis", async () => {
  const confirm = vi.fn();
  await banc.monter(<CircleOnboarding mode="edit" initial={["ibai", "ninja", "rubius", "xqc", "shroud"]} onConfirm={confirm} />);
  expect(document.querySelectorAll(".circle-chip")).toHaveLength(5);
  banc.appuyer("Enregistrer");
  expect(confirm).toHaveBeenLastCalledWith(["ibai", "ninja", "rubius", "xqc", "shroud"]);
  for (const name of ["ibai", "Ninja", "Rubius", "xQc", "shroud"]) banc.appuyerNom(`Retirer ${name}`);
  banc.appuyer("Enregistrer");
  expect(confirm).toHaveBeenLastCalledWith([]);
});
