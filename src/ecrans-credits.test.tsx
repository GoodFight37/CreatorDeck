/**
 * Les crédits **au doigt** : repliés quand on ne les cherche pas, complets quand
 * on les ouvre.
 *
 * Le contenu est vérifié à part (`src/lib/credits.test.ts`). Ce que ce banc
 * regarde, c'est le geste : la ligne existe sur l'écran « Toi », elle ne prend
 * pas la place des réglages tant qu'on ne la touche pas, et elle s'ouvre et se
 * referme — le genre de détail qu'un remaniement de l'écran emporte sans bruit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { MANUAL_PORTRAIT_OVERRIDES, PORTRAIT_OVERRIDES } from "@/lib/creator-portraits";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

describe("les crédits de l'écran Toi", () => {
  let banc: Banc;

  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    banc = creerBanc();
    banc.preparer();
  });

  afterEach(() => {
    banc.nettoyer();
    vi.useRealTimers();
  });

  async function ecranToi() {
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await banc.monter(<CreatorDeckApp />);
    banc.appuyerNom(/^Réglages/);
  }

  it("garde les crédits repliés, et les ouvre d'un appui", async () => {
    await ecranToi();

    // Repliés : la ligne est là, son contenu non — l'écran reste un écran de
    // réglages, pas une page de mentions.
    const bouton = [...document.querySelectorAll<HTMLButtonElement>(".credits-toggle")][0];
    expect(bouton).toBeTruthy();
    expect(bouton.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".credits-list")).toBeNull();
    // Les réglages sont toujours là, et le rouge reste la dernière chose.
    expect(banc.ecran("40-toi-credits-fermes")).toContain("Crédits");

    banc.appuyer("Crédits");
    const ouvert = banc.ecran("40-toi-credits-ouverts");
    // Qui a fait quoi : les cinq lignes, et les noms qu'on doit nommer.
    expect(document.querySelectorAll(".credits-list > div")).toHaveLength(5);
    for (const nom of ["Twitch", "unTied Games", "Chequered Ink", "Lucide"]) {
      expect(ouvert, `crédit absent : ${nom}`).toContain(nom);
    }
    // Le crédit demandé par la licence du pack d'effets, en entier.
    expect(ouvert).toContain("Will Tice / unTied Games");

    // Refermés : on revient à la ligne seule.
    banc.appuyer("Crédits");
    expect(document.querySelector(".credits-list")).toBeNull();
  });

  it("présente les auteurs et licences des nouveaux portraits dans les réglages seulement", async () => {
    await ecranToi();
    expect(document.querySelector("#image-credits")).toBeNull();
    const settings = document.querySelector('[role="dialog"][aria-label="Réglages"]');
    expect(settings?.textContent).toContain("Crédits des images");
    banc.appuyer("Crédits des images");
    const credits = document.querySelector("#image-credits")!;
    expect(settings?.contains(credits)).toBe(true);
    expect(credits.textContent).not.toContain("Moritz Barcelona");
    expect(credits.textContent).toContain("Kevin Chang");
    expect(credits.textContent).toContain("Recadrage carré");
    expect(credits.textContent).toContain("Portraits importés manuellement (454)");
    expect(credits.textContent).toContain("Versions Upscayl archivées (699)");
    expect(credits.textContent).toContain("ne sont plus affichées sur les cartes");
    expect(credits.textContent).toContain("Portrait fourni et restauré avec IA (1)");
    expect(credits.textContent).toContain("DIVERRON");
    expect(credits.textContent).toContain("Source et licence non fournies dans l’archive reçue");
    expect(credits.querySelector('a[href="https://creativecommons.org/licenses/by-sa/3.0/"]')).not.toBeNull();
    const activeCreditedPortraits = Object.keys(PORTRAIT_OVERRIDES)
      .filter((slug) => !Object.hasOwn(MANUAL_PORTRAIT_OVERRIDES, slug));
    expect(credits.querySelectorAll("a")).toHaveLength(activeCreditedPortraits.length * 2);
    banc.appuyer("Crédits des images");
    expect(document.querySelector("#image-credits")).toBeNull();
  });
});
