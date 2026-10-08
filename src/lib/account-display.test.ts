import { describe, expect, it } from "vitest";
import { etatSynchronisation, masquerEmail } from "@/lib/account-display";

/**
 * Ce que la pastille dit au joueur : la rédaction est une règle du jeu, pas un
 * détail. Ces tests tiennent trois promesses :
 *
 *   * quand tout va bien, ça se lit en **trois mots** et c'est vert ;
 *   * un échec ne fait pas peur (la partie locale est intacte, on réessaie) ;
 *   * une adresse e-mail ne s'affiche **jamais** en clair.
 */
describe("la pastille de sauvegarde", () => {
  it("dit « Progression synchronisée » quand un compte est connecté et à jour", () => {
    const ligne = etatSynchronisation({
      configured: true,
      signedIn: true,
      pending: false,
      busy: false,
      isError: false,
    });
    expect(ligne.label).toBe("Progression synchronisée");
    expect(ligne.tone).toBe("ok");
    expect(ligne.detail).toBeNull();
  });

  it("passe avant l'erreur : une tentative en cours est une bonne nouvelle", () => {
    const ligne = etatSynchronisation({
      configured: true,
      signedIn: true,
      pending: true,
      busy: true,
      isError: true,
    });
    expect(ligne.label).toContain("Synchronisation");
    expect(ligne.tone).toBe("busy");
  });

  it("rassure quand ça n'est pas passé, sans jamais alerter", () => {
    const ligne = etatSynchronisation({
      configured: true,
      signedIn: true,
      pending: false,
      busy: false,
      isError: true,
    });
    expect(ligne.tone).toBe("local");
    expect(ligne.label).toBe("Synchronisation en attente");
    expect(ligne.detail).toMatch(/gardée ici/);
  });

  it("reste honnête hors ligne : la partie vit sur l'appareil", () => {
    const horsLigne = etatSynchronisation({
      configured: false,
      signedIn: false,
      pending: false,
      busy: false,
      isError: false,
    });
    expect(horsLigne.tone).toBe("local");
    expect(horsLigne.label).toBe("Sauvegarde sur cet appareil");

    const sansCompte = etatSynchronisation({
      configured: true,
      signedIn: false,
      pending: false,
      busy: false,
      isError: false,
    });
    expect(sansCompte.label).toBe("Sauvegarde sur cet appareil");
    expect(sansCompte.detail).toMatch(/autre téléphone/);
  });

  it("ne parle jamais d'infrastructure, quelle que soit la situation", () => {
    const mots = ["cloud", "serveur", "supabase", "projet", "rpc", "json"];
    for (const configured of [true, false]) {
      for (const signedIn of [true, false]) {
        for (const isError of [true, false]) {
          const ligne = etatSynchronisation({
            configured,
            signedIn,
            pending: false,
            busy: false,
            isError,
          });
          const texte = `${ligne.label} ${ligne.detail ?? ""}`.toLowerCase();
          for (const mot of mots) expect(texte, `${mot} dans « ${texte} »`).not.toContain(mot);
        }
      }
    }
  });
});

describe("l'adresse masquée", () => {
  it("laisse reconnaître son adresse sans la donner à lire", () => {
    expect(masquerEmail("kamet0@exemple.fr")).toBe("k•••@e•••.fr");
    expect(masquerEmail("a@b.co")).toBe("a•••@b•••.co");
  });

  it("ne laisse jamais passer une adresse entière", () => {
    const clair = "kamet0@exemple.fr";
    const masque = masquerEmail(clair) ?? "";
    expect(masque).not.toBe(clair);
    expect(masque).not.toContain("kamet0");
    expect(masque).not.toContain("exemple");
    expect(masque).not.toContain("@exemple");
  });

  it("se tait proprement quand il n'y a rien à masquer", () => {
    expect(masquerEmail(null)).toBeNull();
    expect(masquerEmail("")).toBeNull();
    expect(masquerEmail("   ")).toBeNull();
    expect(masquerEmail("pas-une-adresse")).toBe("•••");
    expect(masquerEmail("fin@")).toBe("•••");
    // Un domaine sans point reste masqué : on n'invente pas de TLD.
    expect(masquerEmail("joueur@local")).toBe("j•••@l•••");
  });
});
