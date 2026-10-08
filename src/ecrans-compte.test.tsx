/**
 * La feuille de compte **avec un cloud configuré** : c'est là que vivent les
 * panneaux qui ne se montrent pas hors ligne — la connexion (Twitch, invité,
 * e-mail + code), la sauvegarde de l'appareil, l'état du direct. Le banc
 * principal (`ecrans.test.tsx`) la couvre sans cloud ; ici les variables sont
 * posées **avant** le chargement des modules, puisque la configuration du cloud
 * est lue à l'import (`src/lib/cloud/config.ts`).
 *
 * Aucun réseau n'est touché : sans session ouverte, la feuille n'appelle rien.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

// `vi.hoisted` passe avant les imports : la configuration du cloud est lue à
// l'import des modules, elle doit donc être là avant.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemple.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_exemple_de_banc_d_essai_0000";
});

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

describe("la feuille de compte (cloud configuré)", () => {
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

  it("montre la connexion, sans la tuyauterie", async () => {
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet onClose={() => {}} />);

    const ecran = banc.ecran("10-compte-configure");
    expect(ecran).toContain("Mon compte");
    expect(ecran).toContain("Continuer avec Twitch");
    expect(ecran).toContain("Créer un compte invité");
    expect(ecran).toContain("Direct");

    /*
     * Ce qui **ne doit plus** être là : c'est le cœur de la passe de finition.
     * Un jeu grand public ne demande pas au joueur d'envoyer sa collection,
     * de charger une sauvegarde distante, de copier un texte de sauvegarde ni
     * de tester la connexion : tout se fait en tâche de fond.
     */
    for (const disparu of [
      "Synchroniser",
      "Envoyer ma collection",
      "Charger le cloud",
      "Tester la connexion au cloud",
      "Sauvegarde de cet appareil",
      "Copier ma sauvegarde",
      "Importer une sauvegarde",
    ]) {
      expect(ecran, `encore affiché : ${disparu}`).not.toContain(disparu);
    }
    // Et le vocabulaire d'atelier ne revient pas par une phrase d'aide.
    for (const mot of ["cloud", "Supabase", "serveur", "payload", "token", ".json", ".sql"]) {
      expect(ecran.toLowerCase(), `jargon encore affiché : ${mot}`).not.toContain(mot);
    }
  });

  it("porte les deux chemins de connexion (mot de passe, code par e-mail)", async () => {
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet onClose={() => {}} />);

    // Les deux replis sont dans le DOM (des `<details>` fermés) : c'est le
    // contenu qui compte, pas leur état ouvert.
    const ecran = banc.ecran("13-compte-formulaires");
    expect(ecran).toContain("Se connecter avec un e-mail et un mot de passe");
    expect(ecran).toContain("Recevoir un code");
    expect(ecran).toContain("Code à 6 chiffres");
    expect(ecran).toContain("Valider le code");
  });

  it("garde une copie de la feuille ouverte par le classement", async () => {
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet focus="leaderboard" onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    // Sans session, le classement n'est pas là : la feuille reste la même, et
    // c'est justement ce qu'on veut vérifier — `focus` ne casse rien.
    expect(banc.ecran("15-compte-focus-classement")).toContain("Mon compte");
  });

  it("monte les panneaux sortis de la feuille (vitrine, échanges, classement)", async () => {
    // Ces trois-là ne s'affichent qu'avec une session ouverte : le banc les
    // monte donc directement, pour que le découpage les garde couverts.
    const { ShowcasePanel } = await import("@/components/account/showcase-panel");
    const { TradesPanel } = await import("@/components/account/trades-panel");
    const { LeaderboardSection } = await import("@/components/account/leaderboard-section");

    await banc.monter(<ShowcasePanel />);
    expect(banc.ecran("16-vitrine")).toContain("Ma vitrine");
    banc.vider();

    await banc.monter(<TradesPanel />);
    expect(banc.ecran("17-echanges")).toContain("Pseudo au classement");
    banc.vider();

    await banc.monter(<LeaderboardSection focus="leaderboard" />);
    expect(banc.ecran("18-classement")).toContain("Classement mondial");
  });
});
