import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { HomeView } from "@/components/drop-view";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { EMPTY_LIVE, LIVE_TTL_MS, indexLive, type LiveSnapshot, type LiveStream } from "@/lib/live";
import { liveStore } from "@/lib/live-store";

const NOW = Date.UTC(2026, 9, 17, 16, 30);
const CIRCLE = ["kaicenat", "ibai", "ninja", "auronplay", "rubius", "xqc", "shroud"];
const liveMock = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/hooks/use-game", () => ({ useNow: () => NOW }));
vi.mock("@/hooks/use-live", () => ({ useLive: () => liveMock.current }));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => ({ configured: false, userId: null, promoPacks: 0 }) }));

function stream(login: string, viewers: number): LiveStream {
  return { login, displayName: login, gameName: "Just Chatting", title: "", viewers, startedAt: new Date(NOW - 72 * 60_000).toISOString() };
}

function setLive(partial: Partial<LiveSnapshot> & { streams?: LiveStream[] } = {}) {
  const { streams = [], ...rest } = partial;
  liveMock.current = { ...EMPTY_LIVE, configured: true, stale: false, refreshedAt: NOW - 60_000,
    byLogin: indexLive(streams), count: streams.length, ...rest } satisfies LiveSnapshot;
}

describe("étape 2 : qui est en direct dans mon cercle", () => {
  let banc: Banc;
  beforeEach(() => {
    banc = creerBanc();
    banc.preparer();
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    setLive();
  });
  afterEach(() => { banc.nettoyer(); window.localStorage.clear(); vi.restoreAllMocks(); });

  async function home({ packs = 2, hourglasses = 2, owned = [] as string[], busy = false } = {}) {
    const state = { ...createInitialState(NOW), packs, hourglasses };
    state.cards = owned.map((slug, index) => ({ id: `c-${index}`, creatorSlug: slug, rarity: CREATOR_BY_SLUG.get(slug)!.rarity,
      variant: "standard" as const, obtainedAt: NOW - index, rareDrop: false }));
    const onUseHourglass = vi.fn();
    const noop = () => {};
    await banc.monter(<HomeView game={getGameView(state, NOW)} friendsOpening={0}
      onShowInbox={noop} onShowCollection={noop} onOpen={noop} onOpenScene={noop}
      sceneBusy={false} onUseHourglass={onUseHourglass} onShowOdds={noop}
      onShowMissions={noop} onShowAtelier={noop} onShowArena={noop} onShowTribunal={noop}
      tribunalRestants={0} tribunalClose={true} opening={false} usingHourglass={busy}
      now={NOW} serverReserve={false} needsAccount={false} onEditCircle={noop} />);
    return { onUseHourglass };
  }
  const moment = () => document.querySelector<HTMLElement>(".circle-live-moment");
  const status = () => document.querySelector<HTMLElement>(".circle-strip-status");

  it("met le direct du cercle en avant, avec un lien Twitch et le bonus publié", async () => {
    setLive({ streams: [stream("rubius", 15_320), stream("ibai", 48_210), stream("zackrawrr", 60_000)] });
    await home({ owned: ["ibai"] });
    const card = moment()!;
    expect(card).not.toBeNull();
    expect(card.querySelector("h2")!.textContent).toBe("2 de tes chaînes sont en direct");
    // Ordre du cercle : ibai est nommé avant rubius.
    const links = [...card.querySelectorAll<HTMLAnchorElement>("a.circle-live-watch")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["https://www.twitch.tv/ibai", "https://www.twitch.tv/rubius"]);
    expect(links.every((link) => link.target === "_blank" && link.rel.includes("noopener"))).toBe(true);
    expect(card.textContent).toContain("48\u202f210 spectateurs");
    expect(card.textContent).toContain("depuis 1 h 12");
    expect(card.textContent).toContain("Dans ta collection");
    expect(card.querySelector('small[data-owned="false"]')!.textContent).toBe("À trouver");
    expect(card.textContent).toContain("Live Drop (×1,5)");
    expect(card.textContent).toContain("C’est le moment d’ouvrir un booster.");
    // Un direct hors cercle ne s'y glisse pas, et la barre générique laisse la place.
    expect(card.textContent).not.toContain("zackrawrr");
    expect(document.querySelector(".live-bar")).toBeNull();
    // La rangée met les chaînes en direct en tête.
    const row = [...document.querySelectorAll<HTMLLIElement>(".circle-strip-row > li")];
    expect(row.slice(0, 2).map((item) => item.dataset.live)).toEqual(["true", "true"]);
    expect(status()).toBeNull();
  });

  it("une chaîne hors catalogue (0060) : visage en initiales, « sans carte », lien Twitch, jamais « À trouver »", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: ["twitch:petite_chaine", "ibai"], at: 1 }));
    setLive({ streams: [{ ...stream("petite_chaine", 42), displayName: "Petite_Chaine" }] });
    await home();
    const card = moment()!;
    expect(card.querySelector("h2")!.textContent).toBe("Petite_Chaine est en direct");
    expect(card.querySelector("a.circle-live-watch")!.getAttribute("href")).toBe("https://www.twitch.tv/petite_chaine");
    expect(card.querySelector("a.circle-live-watch")!.getAttribute("aria-label")).toBe("Regarder Petite_Chaine sur Twitch");
    expect(card.textContent).toContain("sans carte");
    expect(card.textContent).not.toMatch(/À trouver|Dans ta collection|Live Drop \(/);
    const item = document.querySelector<HTMLLIElement>('.circle-strip-row > li[data-custom="true"]')!;
    expect(item.dataset.live).toBe("true");
    expect(item.querySelector("img")).toBeNull();
    expect(item.textContent).not.toContain("À trouver");
    expect(item.querySelector("a")!.getAttribute("href")).toBe("https://www.twitch.tv/petite_chaine");
    // Hors direct : toujours dans la rangée, « sans carte ».
    setLive();
    await home();
    const quiet = document.querySelector<HTMLLIElement>('.circle-strip-row > li[data-custom="true"]')!;
    expect(quiet.dataset.live).toBe("false");
    expect(quiet.textContent).toContain("sans carte");
    expect(quiet.textContent).not.toContain("À trouver");
  });

  it("réserve vide : ouvre le direct du cercle et garde le sablier dans les détails", async () => {
    setLive({ streams: [stream("ibai", 100)] });
    const { onUseHourglass } = await home({ packs: 0, hourglasses: 3 });
    const card = moment()!;
    expect(card.querySelector("h2")!.textContent).toBe("ibai est en direct");
    expect(card.textContent).toMatch(/Prochain booster à \d\d h \d\d/);
    expect(card.textContent).not.toContain("C’est le moment");
    // Un seul endroit mène au direct : le moment du cercle, pas une seconde action sous le sachet.
    expect(document.querySelector(".open-panel .reserve-action")).toBeNull();
    expect(document.querySelector(".open-panel .stock-row")!.textContent).toMatch(/^Prochain sachet à \d\d h \d\d$/);
    expect(card.querySelector(".circle-live-hourglass")).toBeNull();
    const button = document.querySelector<HTMLButtonElement>(".hourglass-action")!;
    expect(button.closest("details")!.querySelector("summary")!.textContent).toContain("Réserve, taux et sabliers");
    act(() => button.click());
    expect(onUseHourglass).toHaveBeenCalledOnce();
  });

  it("réserve vide sans direct : une seule ligne dit l'heure du prochain sachet", async () => {
    await home({ packs: 0 });
    expect(document.querySelector(".open-panel .reserve-action")).toBeNull();
    const line = document.querySelector(".open-panel .stock-row")!.textContent!;
    expect(line).toMatch(/^Prochain sachet à \d\d h \d\d$/);
    expect(document.body.textContent).not.toContain("Recharge en cours");
    expect(moment()).toBeNull();
  });

  it("réserve vide sans sablier : pas de raccourci", async () => {
    setLive({ streams: [stream("ibai", 100)] });
    await home({ packs: 0, hourglasses: 0 });
    expect(moment()!.querySelector(".circle-live-hourglass")).toBeNull();
  });

  it("personne du cercle en direct : pas de carte, une phrase calme", async () => {
    setLive({ streams: [stream("zackrawrr", 60_000)] });
    await home();
    expect(moment()).toBeNull();
    expect(status()!.textContent).toMatch(/^Personne de ton cercle en direct · vérifié à \d\d:\d\d$/);
    expect(status()!.querySelector("button")).toBeNull();
    // La barre générique du direct reste pour les autres créateurs.
    expect(document.querySelector(".live-bar")).not.toBeNull();
  });

  it("donnée périmée : aucun badge, et un nouvel essai possible", async () => {
    const refresh = vi.spyOn(liveStore, "refresh").mockResolvedValue();
    setLive({ refreshedAt: NOW - LIVE_TTL_MS - 25 * 60_000, streams: [stream("ibai", 100)] });
    await home();
    expect(moment()).toBeNull();
    expect(document.querySelector('.circle-strip-row > li[data-live="true"]')).toBeNull();
    expect(status()!.textContent).toContain("Direct non vérifié depuis 35 min");
    banc.appuyer("Réessayer");
    expect(refresh).toHaveBeenCalledWith({ force: true });
  });

  it("hors ligne : le dit, et le bouton attend la fin d'une lecture en cours", async () => {
    setLive({ refreshedAt: null, stale: true, error: "lecture du direct refusée", loading: true });
    await home();
    expect(moment()).toBeNull();
    expect(status()!.textContent).toContain("Direct indisponible : pas de connexion");
    const button = status()!.querySelector<HTMLButtonElement>("button")!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Lecture…");
  });

  it("version sans suivi du direct : pas de badge ni de faux « personne »", async () => {
    liveMock.current = { ...EMPTY_LIVE };
    await home();
    expect(moment()).toBeNull();
    expect(status()!.textContent).toBe("Le direct n’est pas suivi dans cette version");
    expect(status()!.querySelector("button")).toBeNull();
  });

  it("sans cercle : l'accueil d'avant, sans rangée ni moment", async () => {
    window.localStorage.removeItem("creatordeck.circle.v1");
    setLive({ streams: [stream("ibai", 100)] });
    await home();
    expect(document.querySelector(".home-view.is-lean")).toBeNull();
    expect(document.querySelector(".circle-strip")).toBeNull();
    expect(moment()).toBeNull();
    expect(document.body.textContent).not.toContain("Tribunal");
    expect(document.body.textContent).not.toContain("Pas de Légendaire dans ce paquet");
    expect(document.querySelector(".scene-block, .arena-row")).toBeNull();
    expect(document.querySelector(".circle-invite")!.textContent).toContain("Définir mes chaînes");
  });
});
