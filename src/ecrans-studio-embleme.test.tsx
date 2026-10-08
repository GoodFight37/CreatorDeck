/**
 * Le **pont Arène → Studio**, monté pour de vrai : un joueur qui a gagné des
 * semaines d'Arène doit retrouver ses couronnes sur l'étagère de sa pièce.
 *
 * Le calcul de la pose est testé à part (`src/lib/studio-emblem.test.ts`) et le
 * rendu de la scène aussi (`src/components/streamer-studio-stage.test.tsx`).
 * Ce qu'on vérifie **ici**, c'est le fil entre les deux : ce que le serveur dit
 * des semaines encaissées (`arena_me`, journal des `claims`) arrive bien jusqu'à
 * la pièce. C'est une ligne — et une ligne, ça se débranche sans bruit.
 *
 * La session est simulée (`useCloud` remplacé), comme dans
 * `src/ecrans-compte-lie.test.tsx` : aucun réseau.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { cloudStore } from "@/lib/cloud/cloud-store";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemple.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_exemple_de_banc_d_essai_0000";
});

/** Le journal des semaines d'Arène, tel que le serveur le rend (`arena_me`). */
const monde = vi.hoisted(() => ({
  claims: [] as Array<{ week: string; rank: number | null; hourglasses: number; emblem: boolean }>,
}));

vi.mock("@/hooks/use-cloud", () => ({
  useCloud: () => ({
    ...cloudStore.getSnapshot(),
    arenaMine: {
      week: "2026-10-05",
      draftOpen: false,
      rank: 3,
      entry: null,
      draft: null,
      claims: monde.claims,
      pending: [],
    },
  }),
}));

/** Une semaine encaissée : `embleme` dit si elle a fini dans le top 10. */
function semaine(week: string, rank: number, emblem: boolean) {
  return { week, rank, hourglasses: 10, emblem };
}

describe("le pont Arène → Studio", () => {
  let banc: Banc;

  beforeEach(() => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 8, 12, 0, 0) });
    banc = creerBanc();
    banc.preparer();
  });

  afterEach(() => {
    banc.nettoyer();
    vi.useRealTimers();
  });

  async function studio() {
    const { StudioView } = await import("@/components/studio-view");
    await banc.monter(<StudioView />);
  }

  it("pose une couronne par semaine gagnée dans le top 10", async () => {
    monde.claims = [
      semaine("2026-09-28", 3, true),
      semaine("2026-09-21", 27, false), // une semaine jouée, mais hors du top 10
      semaine("2026-09-14", 9, true),
    ];
    await studio();
    banc.ecran("31-studio-emblemes");
    expect(document.querySelectorAll(".chaine-embleme")).toHaveLength(2);
  });

  it("laisse l'étagère vide à qui n'a rien gagné", async () => {
    // Une semaine jouée et payée, mais hors du top 10 : elle n'ouvre pas
    // l'emblème — et l'étagère ne doit pas mentir là-dessus.
    monde.claims = [semaine("2026-09-28", 42, false)];
    await studio();
    expect(document.querySelectorAll(".chaine-embleme")).toHaveLength(0);
  });
});
