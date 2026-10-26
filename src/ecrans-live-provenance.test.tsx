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
    const link = document.querySelector<HTMLAnchorElement>(".inspect-twitch-link");
    expect(link?.getAttribute("href")).toBe(`https://www.twitch.tv/${encodeURIComponent(creator.login)}`);
    expect(link?.getAttribute("aria-label")).toContain("dans un nouvel onglet");
    expect(link?.textContent).toContain("Voir la chaîne sur Twitch");
    expect(document.querySelector(".odds-intro")?.textContent)
      .toContain("obtenu pendant un direct");
  });

  it("annonce séparément le stream frais et permet de l’ouvrir", async () => {
    await banc.monter(<CardInspectModal creator={creator} ownedCount={1} variant="live"
      liveStream={stream} onClose={() => {}} />);

    const provenance = document.querySelector(".card-live");
    const actualLive = document.querySelector<HTMLElement>(".card-on-air");
    const link = document.querySelector<HTMLAnchorElement>(".inspect-twitch-link");
    expect(provenance?.textContent).toContain("Obtenue en direct");
    expect(actualLive?.getAttribute("aria-label")).toContain("en direct maintenant");
    expect(actualLive?.tagName).toBe("SPAN");
    expect(document.querySelector(".creator-card a")).toBeNull();
    expect(link?.getAttribute("href")).toBe(`https://www.twitch.tv/${encodeURIComponent(creator.login)}`);
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link?.textContent).toContain("Voir la chaîne sur Twitch");
  });

  it("garde la chaîne accessible depuis une carte manquante du Binder", async () => {
    await banc.monter(<CardInspectModal presentation="binder" creator={creator}
      ownedCount={0} variant="standard" liveStream={null} onClose={() => {}} />);

    const link = document.querySelector<HTMLAnchorElement>(".card-vault .inspect-twitch-link");
    expect(link?.getAttribute("href")).toBe(`https://www.twitch.tv/${encodeURIComponent(creator.login)}`);
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(document.querySelector(".card-vault .odds-stat:last-child")?.textContent).toContain("Manquante");
  });
});
