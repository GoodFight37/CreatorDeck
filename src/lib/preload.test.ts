import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadPortraits } from "@/lib/preload";

/**
 * Le préchargement des portraits : cinq visages demandés **avant** la
 * révélation, pour que la carte ne s'ouvre pas sur un rectangle vide.
 *
 * Ce qui est vérifié ici, c'est le contrat : la bonne adresse, une seule
 * demande par créateur, et un silence total hors navigateur (les tests, le
 * rendu serveur, un build Node).
 */
describe("préchargement des portraits", () => {
  /** Un faux `Image` de navigateur : il note ce qu'on lui demande de charger. */
  function espion() {
    const demandes: string[] = [];
    class FausseImage {
      decoding = "";
      #src = "";
      set src(value: string) {
        this.#src = value;
        demandes.push(value);
      }
      get src() {
        return this.#src;
      }
    }
    vi.stubGlobal("Image", FausseImage);
    return demandes;
  }

  afterEach(() => vi.unstubAllGlobals());

  it("demande le portrait de chaque créateur, à l'adresse de l'application", () => {
    const demandes = espion();
    preloadPortraits(["squeezie", "gotaga"]);
    expect(demandes).toEqual(["/creators/squeezie.webp", "/creators/gotaga.webp"]);
  });

  it("ne demande qu'une fois le même créateur", () => {
    // Un booster ne sort jamais deux fois le même créateur — mais un Paquet
    // Scène, une collection, ou un futur écran peuvent en passer une liste avec
    // des répétitions : ce n'est pas au navigateur de dédoublonner.
    const demandes = espion();
    preloadPortraits(["ibai", "ibai", "ibai"]);
    expect(demandes).toEqual(["/creators/ibai.webp"]);
  });

  it("ignore les entrées vides sans jeter", () => {
    const demandes = espion();
    preloadPortraits(["", "squeezie", undefined as unknown as string]);
    expect(demandes).toEqual(["/creators/squeezie.webp"]);
  });

  it("ne fait rien hors navigateur", () => {
    // En Node, `Image` n'existe pas : le module doit se taire (les tests du
    // hook d'ouverture de paquet passent par ici).
    expect(typeof Image).toBe("undefined");
    expect(() => preloadPortraits(["squeezie"])).not.toThrow();
  });
});
