import { describe, expect, it } from "vitest";

import {
  canRetryLive,
  circleLiveHeadline,
  circleLiveState,
  circleLiveStatusLine,
  directBenefitLine,
  liveSinceLabel,
  twitchUrl,
} from "@/lib/circle-live";
import { EMPTY_LIVE, LIVE_TTL_MS, indexLive, type LiveSnapshot, type LiveStream } from "@/lib/live";
import { DIRECT_BONUS } from "@/lib/pull-rates";

const NOW = Date.parse("2026-10-17T18:30:00+02:00");
const CIRCLE = ["kaicenat", "ibai", "ninja", "auronplay", "rubius"];

function stream(login: string, viewers = 1000, startedAt: string | null = null): LiveStream {
  return { login, displayName: login, gameName: "Just Chatting", title: "", viewers, startedAt };
}

function snapshot(partial: Partial<LiveSnapshot> & { streams?: LiveStream[] } = {}): LiveSnapshot {
  const { streams = [], ...rest } = partial;
  return {
    ...EMPTY_LIVE,
    configured: true,
    stale: false,
    refreshedAt: NOW - 60_000,
    byLogin: indexLive(streams),
    count: streams.length,
    ...rest,
  };
}

describe("circleLiveState : un seul état par situation", () => {
  it("garde l'ordre du cercle (la préférée d'abord), pas celui des spectateurs", () => {
    const state = circleLiveState(CIRCLE, snapshot({ streams: [stream("rubius", 90_000), stream("ibai", 10)] }), new Set(["ibai"]), NOW);
    expect(state.kind).toBe("live");
    if (state.kind !== "live") return;
    expect(state.entries.map((entry) => entry.creator.slug)).toEqual(["ibai", "rubius"]);
    expect(state.entries.map((entry) => entry.owned)).toEqual([true, false]);
  });

  it("ignore les directs hors du cercle", () => {
    const state = circleLiveState(CIRCLE, snapshot({ streams: [stream("xqc")] }), new Set(), NOW);
    expect(state).toEqual({ kind: "quiet", checkedAt: NOW - 60_000 });
  });

  it("cercle vide ou inconnu du catalogue → rien à montrer", () => {
    expect(circleLiveState([], snapshot(), new Set(), NOW)).toEqual({ kind: "empty" });
    expect(circleLiveState(["chaine-qui-n-existe-pas"], snapshot(), new Set(), NOW)).toEqual({ kind: "empty" });
  });

  it("version sans suivi du direct → indisponible, jamais « personne en direct »", () => {
    expect(circleLiveState(CIRCLE, { ...EMPTY_LIVE }, new Set(), NOW)).toEqual({ kind: "unavailable" });
  });

  it("première lecture en attente → on cherche ; échec → hors ligne", () => {
    expect(circleLiveState(CIRCLE, snapshot({ refreshedAt: null, stale: true, loading: true }), new Set(), NOW).kind).toBe("checking");
    expect(circleLiveState(CIRCLE, snapshot({ refreshedAt: null, stale: true, error: "réseau" }), new Set(), NOW).kind).toBe("offline");
  });

  it("donnée trop vieille : aucun badge, même si le cache disait « en direct »", () => {
    const old = NOW - LIVE_TTL_MS - 5 * 60_000;
    const state = circleLiveState(CIRCLE, snapshot({ refreshedAt: old, streams: [stream("ibai")] }), new Set(), NOW);
    expect(state).toEqual({ kind: "stale", ageMs: LIVE_TTL_MS + 5 * 60_000 });
  });

  it("le drapeau « périmé » du store suffit à faire taire l'écran", () => {
    expect(circleLiveState(CIRCLE, snapshot({ stale: true, streams: [stream("ibai")] }), new Set(), NOW).kind).toBe("stale");
  });

  it("donnée périmée et dernier essai en échec → hors ligne", () => {
    const state = circleLiveState(CIRCLE, snapshot({ refreshedAt: NOW - LIVE_TTL_MS - 1, error: "réseau", streams: [stream("ibai")] }), new Set(), NOW);
    expect(state.kind).toBe("offline");
  });

  it("une erreur ponctuelle n'efface pas une lecture encore fraîche", () => {
    expect(circleLiveState(CIRCLE, snapshot({ error: "réseau", streams: [stream("ibai")] }), new Set(), NOW).kind).toBe("live");
  });
});

describe("textes du moment en direct", () => {
  it("titre au singulier et au pluriel", () => {
    const one = circleLiveState(CIRCLE, snapshot({ streams: [stream("ibai")] }), new Set(), NOW);
    const two = circleLiveState(CIRCLE, snapshot({ streams: [stream("ibai"), stream("ninja")] }), new Set(), NOW);
    if (one.kind !== "live" || two.kind !== "live") throw new Error("états attendus : live");
    expect(circleLiveHeadline(one.entries)).toBe("ibai est en direct");
    expect(circleLiveHeadline(two.entries)).toBe("2 de tes chaînes sont en direct");
  });

  it("le bénéfice annoncé lit le bonus Direct publié, sans le recopier", () => {
    const bias = String(DIRECT_BONUS.creatorBias).replace(".", ",");
    const chance = Math.round(DIRECT_BONUS.livePermille / 10);
    expect(directBenefitLine(1)).toBe(`Pendant le direct, sa carte tombe plus souvent dans le Live Drop (×${bias}) et peut sortir en version Live (${chance}\u00a0%).`);
    expect(directBenefitLine(2)).toContain("leurs cartes tombent");
    expect(directBenefitLine(2)).toContain("peuvent sortir");
  });

  it("durée du direct lisible, muette sans heure fiable", () => {
    expect(liveSinceLabel(new Date(NOW - 72 * 60_000).toISOString(), NOW)).toBe("depuis 1 h 12");
    expect(liveSinceLabel(new Date(NOW - 120 * 60_000).toISOString(), NOW)).toBe("depuis 2 h");
    expect(liveSinceLabel(new Date(NOW - 8 * 60_000).toISOString(), NOW)).toBe("depuis 8 min");
    expect(liveSinceLabel(new Date(NOW - 10_000).toISOString(), NOW)).toBe("à l’instant");
    expect(liveSinceLabel(null, NOW)).toBeNull();
    expect(liveSinceLabel("pas une date", NOW)).toBeNull();
    expect(liveSinceLabel(new Date(NOW + 60_000).toISOString(), NOW)).toBeNull();
  });

  it("chaque état a sa phrase, et seuls hors ligne / périmé proposent un nouvel essai", () => {
    expect(circleLiveStatusLine({ kind: "quiet", checkedAt: NOW })).toMatch(/^Personne de ton cercle en direct · vérifié à \d\d:\d\d$/);
    expect(circleLiveStatusLine({ kind: "stale", ageMs: 35 * 60_000 })).toBe("Direct non vérifié depuis 35 min");
    expect(circleLiveStatusLine({ kind: "stale", ageMs: 5 * 3_600_000 })).toBe("Direct non vérifié depuis 5 h");
    expect(circleLiveStatusLine({ kind: "offline" })).toBe("Direct indisponible : pas de connexion");
    expect(circleLiveStatusLine({ kind: "checking" })).toBe("On regarde qui est en direct…");
    expect(circleLiveStatusLine({ kind: "unavailable" })).toBe("Le direct n’est pas suivi dans cette version");
    expect(circleLiveStatusLine({ kind: "empty" })).toBeNull();
    expect(canRetryLive({ kind: "offline" })).toBe(true);
    expect(canRetryLive({ kind: "stale", ageMs: 1 })).toBe(true);
    expect(canRetryLive({ kind: "quiet", checkedAt: NOW })).toBe(false);
    expect(canRetryLive({ kind: "unavailable" })).toBe(false);
  });

  it("lien Twitch encodé", () => {
    expect(twitchUrl("ibai")).toBe("https://www.twitch.tv/ibai");
    expect(twitchUrl("a b")).toBe("https://www.twitch.tv/a%20b");
  });
});
