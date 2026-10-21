/**
 * Le banc d'essai **des écrans** : l'application montée dans un DOM, parcourue
 * comme au doigt.
 *
 * Pourquoi il existe : ce dépôt se travaille sans navigateur (l'environnement de
 * développement n'en a pas, et `next build` ne pré-rend que l'accueil). Avant
 * lui, un découpage de composant — déplacer une vue dans son fichier, sortir une
 * feuille — ne pouvait être vérifié qu'en installant l'APK. Ici, les quatre
 * piliers s'ouvrent, les feuilles s'ouvrent, un booster se tire, et chacun dit
 * ce qu'il doit dire.
 *
 * L'horloge et le hasard sont **figés** : deux exécutions produisent le même
 * HTML. C'est ce qui permet de garder une copie des écrans pour comparer avant
 * et après un découpage :
 *
 *   ECRANS_DUMP=/tmp/avant npm run ecrans
 *   # ... découpage ...
 *   ECRANS_DUMP=/tmp/apres npm run ecrans && diff -r /tmp/avant /tmp/apres
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

/** Un jeudi midi : ni fin de série, ni fenêtre de Prime Time (20 h – 22 h). */
const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

describe("les écrans", () => {
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

  async function application() {
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await banc.monter(<CreatorDeckApp />);
  }

  it("ouvre les trois objets de la barre dans l’ordre Binder, Drop, Objectifs", async () => {
    await application();
    const drop = banc.ecran("01-accueil");
    expect(drop).toContain("Ouvrir le booster");
    expect(document.documentElement.dataset.cardFx).toBe("on");
    expect(drop).not.toContain("Tribunal");
    expect(drop).not.toContain("Pas de Légendaire dans ce paquet");
    // Icône + nombre à l'écran ; le nom de chaque compteur reste lu par les lecteurs d'écran.
    expect(document.querySelector(".top-actions [aria-label$=' sabliers']")).not.toBeNull();
    expect(document.querySelector(".top-actions [aria-label$=' points']")).not.toBeNull();
    expect(document.querySelector(".level-badge")?.textContent).toContain("Niv.");

    banc.appuyer("Binder");
    const binder = banc.ecran("02-binder");
    expect(binder).toContain("binder-tools");
    expect(binder).toContain("Ta collection commence avec le prochain booster.");

    banc.appuyer("Atelier");
    banc.ecran("03-craft");
    expect(document.querySelector(".view.atelier-view h1")?.textContent).toBe("Atelier");

    // **Quatre piliers, et rien d'autre** : la simulation de streameur
    // (« Ta chaîne ») a quitté l'application le 8 octobre 2026 — ni onglet, ni
    // ligne d'accueil, ni écran. La barre porte les quatre piliers, et son
    // ordre est celui du jeu.
    expect(
      [...document.querySelectorAll(".bottom-nav .nav-object-label")].map((n) => n.textContent),
    ).toEqual(["Binder", "Drop", "Objectifs"]);

    banc.appuyerNom(/^Ton profil/);
    // L'écran Toi ne nomme plus l'infrastructure : on y entre par « Mon compte ».
    const profile = banc.ecran("04-toi");
    expect(profile).toContain("Ta vitrine");
    expect(profile).toContain("Ta première carte t’attend.");
    expect(profile).not.toContain("0/1000");
    expect(profile).not.toContain("0 boosters");
  });

  it("ouvre les feuilles : le compte, les objectifs, les taux", async () => {
    await application();
    banc.appuyerNom(/^Réglages/);
    banc.appuyer(/^Mon compte/);
    // Sans rien en ligne, la feuille le dit au lieu de proposer une connexion —
    // et elle le dit en français de jeu, pas en vocabulaire d'atelier.
    const feuille = banc.ecran("05-compte");
    expect(feuille).toContain("Mon compte");
    expect(feuille).toContain("Joue pour toi, sur cet appareil");
    // Le vocabulaire se lit dans le **texte** de la feuille, pas dans le HTML :
    // les noms de classes (`token-row` du Drop, derrière la feuille) ne se lisent pas.
    const texte = document.querySelector('[role="dialog"][aria-label="Mon compte"]')?.textContent ?? "";
    expect(texte).toContain("Mon compte");
    for (const mot of ["cloud", "Supabase", "serveur", ".json", ".sql", "token"]) {
      expect(texte.toLowerCase()).not.toContain(mot);
    }
    act(() => document.querySelector<HTMLButtonElement>('[aria-label="Mon compte"] button[aria-label="Fermer"]')!.click());
    banc.fermer();
    banc.appuyer("Objectifs");
    expect(banc.ecran("06-objectifs")).toContain("Progression");

    banc.appuyerNom(/^Réglages/);
    banc.appuyer("Taux officiels");
    expect(banc.ecran("07-taux")).toContain("Taux de drop des boosters");
    banc.fermer();
  });

  it("pose une seule question avant l'accueil, puis range la réponse sur l'appareil", async () => {
    window.localStorage.setItem("creatordeck-tutorial:local", "done");
    await application();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(document.querySelector('[role="dialog"][aria-label="Mes chaînes"]')).toBeNull();
    banc.vider();
    window.localStorage.clear();
    await application();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(document.body.textContent).toContain("Ton premier booster t’attend");
    expect(document.body.textContent).not.toContain("Construis ton Binder");
    // 0058 : aucun nom exigé, le premier booster s'ouvre tout de suite.
    expect((document.querySelector(".circle-actions .welcome-primary") as HTMLButtonElement).disabled).toBe(false);
    expect(document.querySelector('[aria-label="Mes chaînes"]')!.textContent).not.toMatch(/encore \d+ pour|Compléter avec/);
    banc.appuyer("Voir mon premier booster");
    expect(document.body.textContent).not.toContain("Un cadeau t’attend");
    expect(window.localStorage.getItem("creatordeck-tutorial:local")).toBe("done");
    expect(window.localStorage.getItem("creatordeck-tutorial:completed:local")).toBe("done");
    expect(JSON.parse(window.localStorage.getItem("creatordeck.circle.v1") ?? "{}").slugs).toEqual([]);
  });

  it("tire un booster et montre la révélation", async () => {
    await application();
    banc.appuyer("Ouvrir le booster");
    // Le tirage passe par des temporisations (silence, déchirure) : l'horloge
    // figée doit avancer à la main, sinon l'écran de révélation n'arrive jamais.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(document.querySelector(".booster-interactive"), "le booster attend le geste du joueur").toBeTruthy();
    banc.appuyer("Ouvrir sans déchirer");
    await act(async () => {
      // Sans animationend dans jsdom, le filet termine l’extraction ; la scène reste montée.
      await vi.advanceTimersByTimeAsync(2_100);
    });
    const revelation = banc.ecran("08-revelation");
    expect(revelation).toContain("card-nameplate");
    // Le booster hors ligne n'est pas perdu : il sort de la réserve du jour.
    expect(revelation).toContain("Révélation…");
  });

  it("déchire le paquet avant de montrer la première carte", async () => {
    await application();
    banc.appuyer("Ouvrir le booster");
    // Le tirage local observe un suspense de 650 ms : à 700 ms, les cartes sont
    // tirées et le paquet est en train de s'ouvrir à l'écran.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    const dechirure = document.querySelector(".pack-tear");
    expect(dechirure, "le paquet ne s'ouvre jamais à l'écran").toBeTruthy();
    // Le booster est une vraie enveloppe et attend le geste, pas un chronomètre.
    expect(dechirure!.querySelectorAll(".foil-printed-art").length, "sachet imprimé bord à bord").toBe(2);
    expect(dechirure!.querySelectorAll(".foil-back-card").length, "les cinq dos sont présents").toBe(5);
    expect(dechirure!.querySelector(".booster-tear-track"), "la zone de passage du doigt doit exister").toBeTruthy();
    expect(dechirure!.querySelector(".booster-card-extract"), "plus de fausse carte CD").toBeNull();
    banc.ecran("11-dechirure");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(document.querySelector(".pack-tear"), "le booster ne doit pas s'ouvrir tout seul").toBeTruthy();
    expect(document.querySelector(".reveal-overlay")).toBeNull();

    banc.appuyer("Ouvrir sans déchirer");
    await act(async () => {
      // Sans animationend dans jsdom, le filet termine l’extraction ; la scène reste montée.
      await vi.advanceTimersByTimeAsync(2_100);
    });
    expect(document.querySelector(".pack-tear"), "la scène ne doit pas être remplacée").toBe(dechirure);
    expect(dechirure!.getAttribute("data-opening-phase")).toBe("revealing");
    expect(dechirure!.querySelectorAll(".foil-printed-art")).toHaveLength(2);
    expect(dechirure!.querySelector(".reveal-overlay")).toBeTruthy();
    expect(dechirure!.querySelectorAll('[role="dialog"]')).toHaveLength(0);
    act(() => { dechirure!.querySelector<HTMLButtonElement>('.reveal-header button[aria-label="Fermer"]')!.click(); });
    expect(document.querySelector(".pack-tear")).toBeNull();
  });

  it("termine l’extraction sur animationend une fois, sans démonter le sachet", async () => {
    const { PackTear } = await import("@/components/pack-tear");
    const completed = vi.fn();
    await banc.monter(<PackTear onComplete={completed} />);
    const scene = document.querySelector(".opening-continuum")!;
    banc.appuyer("Ouvrir sans déchirer");
    expect(completed).not.toHaveBeenCalled();
    const chamber = scene.querySelector(".foil-card-chamber")!;
    act(() => { chamber.querySelector(".foil-back-card")!.dispatchEvent(new Event("animationend", { bubbles: true })); });
    expect(completed).not.toHaveBeenCalled();
    act(() => {
      // React/jsdom uses the WebKit name when AnimationEvent is unavailable.
      chamber.dispatchEvent(new Event("animationend", { bubbles: true }));
      chamber.dispatchEvent(new Event("webkitAnimationEnd", { bubbles: true }));
    });
    expect(completed).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(completed).toHaveBeenCalledOnce();
    expect(document.querySelector(".opening-continuum")).toBe(scene);
  });

  it("termine malgré un son en erreur et un animationend absent", async () => {
    const { PackTear } = await import("@/components/pack-tear");
    const completed = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await banc.monter(<PackTear onComplete={completed} onTear={() => { throw new Error("audio indisponible"); }} />);
    banc.appuyer("Ouvrir sans déchirer");
    expect(completed).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    expect(completed).toHaveBeenCalledOnce();
    expect(document.querySelector(".opening-continuum")).toBeTruthy();
    warn.mockRestore();
  });

  it("termine sur annulation de l'animation une seule fois", async () => {
    const { PackTear } = await import("@/components/pack-tear");
    const completed = vi.fn();
    await banc.monter(<PackTear onComplete={completed} />);
    banc.appuyer("Ouvrir sans déchirer");
    act(() => { document.querySelector(".foil-card-chamber")!.dispatchEvent(new Event("animationcancel")); });
    expect(completed).toHaveBeenCalledOnce();
  });

  it("propose de quitter la présentation pendant une attente réseau prolongée", async () => {
    const { PackTear } = await import("@/components/pack-tear");
    const leave = vi.fn();
    await banc.monter(<PackTear onComplete={() => {}} onLeavePending={leave} />);
    banc.appuyer("Ouvrir sans déchirer");
    await act(async () => { await vi.advanceTimersByTimeAsync(2_200); });
    banc.appuyer("Retour au jeu pendant l’attente");
    expect(leave).toHaveBeenCalledOnce();
  });

  it("rend deux fois le même HTML (l'horloge et le hasard sont figés)", async () => {
    await application();
    const premier = banc.ecran("09-determinisme-a");
    banc.vider();
    await application();
    expect(banc.ecran("09-determinisme-b")).toBe(premier);
  });
});
