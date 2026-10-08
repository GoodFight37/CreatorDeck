import { describe, expect, it } from "vitest";
import { PROGRESSION_SYNCHRONISEE, RACCOURCIS_LISIBLES, connecteToi } from "@/lib/cloud/store-text";

/**
 * Les phrases de la connexion : elles sont affichées sur huit écrans, donc
 * elles sont écrites **une fois** et vérifiées ici. Le test tient deux
 * promesses : chaque écran s'y reconnaît (le titre porte sa raison), et aucun
 * mot d'atelier ne s'y glisse.
 */
describe("la phrase de connexion d'un écran", () => {
  it("nomme l'écran, pour qu'on sache lequel parle", () => {
    expect(connecteToi("L'Arène")).toBe("L'Arène demande une connexion");
    expect(connecteToi("Le carnet")).toBe("Le carnet demande une connexion");
  });

  it("accorde le verbe quand la raison est un pluriel", () => {
    // « Les amis demande une connexion » : la faute se verrait à l'écran, et
    // c'est la première phrase que lit un joueur hors ligne.
    expect(connecteToi("Les amis", true)).toBe("Les amis demandent une connexion");
    expect(connecteToi("Les codes", true)).toBe("Les codes demandent une connexion");
  });

  it("ne parle jamais d'infrastructure", () => {
    const interdits = ["cloud", "serveur", "supabase", "smtp", "api", "json", "sql", "rpc"];
    for (const phrase of [
      connecteToi("Le carnet"),
      connecteToi("La wishlist"),
      connecteToi("Les amis", true),
    ]) {
      const tout = phrase.toLowerCase();
      for (const mot of interdits) expect(tout, `${mot} dans « ${tout} »`).not.toContain(mot);
    }
  });

  it("donne la même phrase verte partout : c'est la promesse du jeu", () => {
    expect(PROGRESSION_SYNCHRONISEE).toBe("Progression synchronisée");
  });

  it("nomme les raccourcis par ce que le joueur voit dans l'écran", () => {
    expect(RACCOURCIS_LISIBLES).toEqual({
      compte: "Mon compte",
      public: "Profil public",
      reglages: "Réglages du compte",
    });
  });
});
