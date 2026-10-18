import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { cloudStore } from "@/lib/cloud/cloud-store";

const account = vi.hoisted(() => ({
  userId: "11111111-1111-4111-8111-111111111111",
  onboarding: { tutorialCompleted: true, giftAvailable: true, giftClaimed: true, giftRemaining: 4, message: "Malik a décidé de réinitialiser la progression de tout le monde pour implémenter le tutoriel et il vous offre 5 boosters." },
}));
vi.mock("@/hooks/use-cloud", () => ({
  useCloudAutoSync: () => {},
  useCloud: () => ({ ...cloudStore.getSnapshot(), configured: true, ...account, onboardingBusy: false }),
}));
const banc = creerBanc();
afterEach(() => { banc.nettoyer(); vi.restoreAllMocks(); });

it("réinitialise le compte, rejoue le tutoriel puis retrouve les quatre cadeaux réclamés", async () => {
  banc.preparer();
  const key = `creatordeck-tutorial:${account.userId}`;
  const completionKey = `creatordeck-tutorial:completed:${account.userId}`;
  window.localStorage.setItem(key, "done");
  window.localStorage.setItem(completionKey, "done");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(cloudStore, "resetProgress").mockImplementation(async () => {
    account.onboarding = { ...account.onboarding, tutorialCompleted: false, giftAvailable: false };
    return { status: "done", message: "Nouvelle partie." };
  });
  vi.spyOn(cloudStore, "completeTutorial").mockImplementation(async () => {
    account.onboarding = { ...account.onboarding, tutorialCompleted: true, giftAvailable: true };
    return true;
  });
  const claim = vi.spyOn(cloudStore, "claimReturnGift");
  const open = vi.spyOn(cloudStore, "openReturnGiftPack").mockResolvedValue({ status: "unavailable", reason: "error", message: "Tirage simulé." });
  const { CreatorDeckApp } = await import("@/components/creator-deck-app");
  await banc.monter(<CreatorDeckApp />);
  banc.appuyer("Toi");
  await act(async () => { banc.appuyer("Réinitialiser la progression"); });
  expect(document.body.textContent).toContain("Ton premier booster t’attend");
  expect(document.body.textContent).not.toContain("Ouvrir un booster cadeau");
  expect(window.localStorage.getItem(completionKey)).toBeNull();
  banc.saisir(document.querySelector<HTMLInputElement>(".circle-form input")!, "ibai, ninja, rubius");
  banc.appuyer("Ajouter");
    await act(async () => { banc.appuyer("Voir mon premier booster"); });
  // L'ancien message du serveur n'est plus affiché.
  expect(document.body.textContent).toContain("Tes boosters de bienvenue");
  expect(document.body.textContent).not.toContain("Malik");
  expect(document.body.textContent).toContain("Ouvrir un booster cadeau · 4 restants");
  await act(async () => { banc.appuyer("Ouvrir un booster cadeau · 4 restants"); });
  expect(claim).not.toHaveBeenCalled();
  expect(open).toHaveBeenCalledOnce();
  // Le cadeau suivant garde aussi les chaînes choisies : ici il en reste 4.
  expect(open).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]));
});
