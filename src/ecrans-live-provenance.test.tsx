import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { CardInspectModal } from "@/components/card-inspect-modal";
import { CREATORS } from "@/lib/catalog";
import type { LiveStream } from "@/lib/live";

describe("provenance Live et direct actuel restent distincts", () => {
  let banc: Banc;

  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => banc.nettoyer());

  const creator = CREATORS.find((entry) => entry.login.trim().length > 0)!;
  const stream: LiveStream = {
    login: creator.login,
    displayName: creator.displayName,
    gameName: "Just Chatting",
    title: "Une partie en direct",
    viewers: 1234,
    startedAt: "2026-10-13T12:00:00.000Z",
  };

  it("garde la provenance sans prétendre que le stream est encore actif", async () => {
    await banc.monter(<CardInspectModal creator={creator} ownedCount={1} variant="live"
      liveStream={null} onClose={() => {}} />);

    expect(document.querySelector(".card-live")?.textContent).toContain("Obtenue en direct");
    expect(document.querySelector(".creator-card")?.getAttribute("aria-label"))
      .toContain("carte obtenue pendant un direct");
    expect(document.querySelector(".card-on-air")).toBeNull();
    expect(document.querySelector(".inspect-twitch-link")).toBeNull();
    expect(document.querySelector(".odds-intro")?.textContent)
      .toContain("obtenu pendant un direct");
  });

  it("annonce séparément le stream frais et permet de l’ouvrir", async () => {
    await banc.monter(<CardInspectModal creator={creator} ownedCount={1} variant="live"
      liveStream={stream} onClose={() => {}} />);

    const provenance = document.querySelector(".card-live");
    const actualLive = document.querySelector<HTMLAnchorElement>(".card-on-air");
    const link = document.querySelector<HTMLAnchorElement>(".inspect-twitch-link");
    expect(provenance?.textContent).toContain("Obtenue en direct");
    expect(actualLive?.getAttribute("aria-label")).toContain("Ouvrir la chaîne Twitch");
    expect(actualLive?.getAttribute("target")).toBe("_blank");
    expect(actualLive?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(actualLive?.getAttribute("href")).toBe(`https://www.twitch.tv/${encodeURIComponent(creator.login)}`);
    expect(link?.getAttribute("href")).toBe(`https://www.twitch.tv/${creator.login}`);
    expect(link?.textContent).toContain("Ouvrir le live sur Twitch");
  });
});
