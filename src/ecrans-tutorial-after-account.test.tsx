import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { cloudStore } from "@/lib/cloud/cloud-store";

const connection = vi.hoisted(() => ({
  userId: null as string | null,
  onboarding: null as null | { tutorialCompleted: boolean; giftAvailable: boolean; giftClaimed: boolean; giftRemaining: number; message: string },
}));
vi.mock("@/hooks/use-cloud", () => ({
  useCloudAutoSync: () => {},
  useCloud: () => ({ ...cloudStore.getSnapshot(), configured: true, ...connection, onboardingBusy: false }),
}));

const banc = creerBanc();
afterEach(() => { banc.nettoyer(); vi.restoreAllMocks(); });

it("attend la fermeture du compte avant de montrer le tutoriel du nouveau joueur", async () => {
  banc.preparer();
  window.localStorage.setItem("creatordeck-tutorial:local", "done");
  window.localStorage.setItem("creatordeck-tutorial:completed:local", "done");
  connection.userId = null;
  connection.onboarding = null;
  vi.spyOn(cloudStore, "completeTutorial").mockResolvedValue(true);

  const { CreatorDeckApp } = await import("@/components/creator-deck-app");
  await banc.monter(<CreatorDeckApp />);
  await banc.appuyerNomEtAttendre(/^Réglages/);
  await banc.appuyerEtAttendre(/^Mon compte/);
  expect(document.querySelector('[role="dialog"][aria-label="Mon compte"]')).toBeTruthy();

  connection.userId = "11111111-1111-4111-8111-111111111111";
  connection.onboarding = { tutorialCompleted: false, giftAvailable: false, giftClaimed: false, giftRemaining: 0, message: "" };
  await banc.rendre(<CreatorDeckApp />);
  expect(document.querySelector('[role="dialog"][aria-label="Mon compte"]')).toBeTruthy();
  expect(document.querySelector('[role="dialog"][aria-label="Mes chaînes"]')).toBeNull();

  act(() => document.querySelector<HTMLButtonElement>('[aria-label="Mon compte"] button[aria-label="Fermer"]')!.click());
  if (document.querySelector(".settings-overlay")) banc.fermer();
  expect(document.querySelector('[role="dialog"][aria-label="Mes chaînes"]')).toBeTruthy();
  banc.saisir(document.querySelector<HTMLInputElement>(".circle-form input")!, "ibai, ninja, rubius");
  await banc.appuyerEtAttendre("Ajouter");
    await act(async () => { await banc.appuyerEtAttendre("Voir mon premier booster"); });
  expect(cloudStore.completeTutorial).toHaveBeenCalledOnce();
  expect(document.querySelector('[role="dialog"][aria-label="Mes chaînes"]')).toBeNull();
  expect(document.querySelector(".app-shell")?.getAttribute("data-current-tab")).toBe("home");
});
