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

  it("montre la connexion et la sauvegarde de l'appareil", async () => {
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet onClose={() => {}} />);

    const ecran = banc.ecran("10-compte-configure");
    expect(ecran).toContain("Cloud &amp; classement");
    expect(ecran).toContain("Continuer avec Twitch");
    expect(ecran).toContain("Créer un compte invité");
    expect(ecran).toContain("Sauvegarde de cet appareil");
    expect(ecran).toContain("Tester la connexion au cloud");
    expect(ecran).toContain("Direct");

    // Le formulaire de sauvegarde s'ouvre, puis se referme.
    banc.appuyer("Importer une sauvegarde");
    expect(banc.ecran("11-compte-import")).toContain("Remplacer ma progression");
    banc.appuyer("Importer une sauvegarde");
    expect(banc.ecran("12-compte-import-ferme")).not.toContain("Remplacer ma progression");
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
    expect(banc.ecran("15-compte-focus-classement")).toContain("Cloud &amp; classement");
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
