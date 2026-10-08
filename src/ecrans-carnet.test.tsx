/**
 * Le carnet de notifications, monté au doigt : **chaque ligne doit mener
 * quelque part**.
 *
 * C'était le défaut rapporté — des lignes qu'on lisait sans pouvoir les
 * toucher, donc un carnet qui annonce une offre reçue et oblige à retrouver
 * l'écran soi-même (c'est-à-dire à ne pas y aller). Ce banc monte la feuille
 * avec un carnet factice et vérifie trois choses :
 *
 *   * chaque ligne est un bouton (pas une ligne de texte inerte) ;
 *   * la bonne destination sort de la famille (`cibleDe`) ;
 *   * la visite est marquée **avant** la navigation, sinon la pastille se
 *     recalcule sur l'ancienne visite et le joueur la revoit.
 *
 * Les dépendances sont remplacées : ici on ne teste pas le réseau (il a ses
 * propres bancs, `src/lib/cloud/`), on teste que le doigt atteint la cible.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

/** L'ordre des gestes d'un tap : la visite, puis la navigation. */
const gestes: string[] = [];

const monde = vi.hoisted(() => {
  const items = [
    {
      id: "trade:1",
      kind: "trade_in" as const,
      title: "Diane te propose un échange",
      body: "1 carte contre 1",
      at: "2026-10-08T11:40:00Z",
      who: "Diane",
    },
    {
      id: "friend-request:2",
      kind: "friend_request" as const,
      title: "Bruno veut être ton ami",
      body: null,
      at: "2026-10-08T11:20:00Z",
      who: "Bruno",
    },
    {
      id: "last-pack:3",
      kind: "last_pack" as const,
      title: "On t'a piqué ton légendaire",
      body: "Le paquet d'Ambre",
      at: "2026-10-08T10:00:00Z",
      who: "Ambre",
    },
    {
      id: "wishlist-live:kamet0:2026-10-08T09:00:00Z",
      kind: "wishlist_live" as const,
      title: "Kameto est en direct",
      body: "Il streame maintenant",
      at: "2026-10-08T09:00:00Z",
      who: null,
    },
  ];
  const marquerVu = vi.fn();
  // L'état du compte, mutable : le carnet a deux visages (en ligne, hors
  // ligne), et le banc doit pouvoir passer de l'un à l'autre sans recharger
  // les modules.
  const cloud = {
    configured: true,
    userId: "u1" as string | null,
    inboxBusy: false,
    // `vi.hoisted` passe avant les `const` du fichier : on ne peut pas citer T0 ici.
    inboxAt: Date.UTC(2026, 9, 8, 12, 0, 0) as number | null,
    pushLive: null as boolean | null,
    pushBusy: false,
    pushDevices: 0,
  };
  return { items, marquerVu, cloud };
});

vi.mock("@/lib/cloud/cloud-store", () => ({
  cloudStore: {
    markInboxSeen: () => {
      gestes.push("vu");
      monde.marquerVu();
    },
    loadInbox: () => Promise.resolve(),
    syncPushState: () => Promise.resolve(),
  },
}));

vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => monde.cloud }));

vi.mock("@/hooks/use-inbox", () => ({
  useInbox: () => ({ items: monde.items, unread: 0 }),
}));

vi.mock("@/hooks/use-game", () => ({ useNow: () => T0 }));

// Les notifications système ne sont pas le sujet ici : sur un navigateur de
// banc, l'appareil ne sait pas les recevoir.
vi.mock("@/lib/push", () => ({ pushSupported: () => false }));

describe("le carnet de notifications", () => {
  let banc: Banc;
  const onGo = vi.fn((..._args: unknown[]) => {
    gestes.push("go");
  });

  beforeEach(() => {
    gestes.length = 0;
    monde.marquerVu.mockClear();
    onGo.mockClear();
    // On repart d'un compte connecté : c'est l'état normal du carnet.
    monde.cloud.configured = true;
    monde.cloud.userId = "u1";
    monde.cloud.inboxAt = T0;
    banc = creerBanc();
    banc.preparer();
  });

  // Sans ça, les montages s'empilent dans le corps du document et le test
  // suivant trouve les boutons du précédent.
  afterEach(() => {
    banc.nettoyer();
  });

  it("fait de chaque nouvelle une ligne qu'on peut toucher", async () => {
    const { NotificationsSheet } = await import("@/components/notifications-sheet");
    await banc.monter(<NotificationsSheet onClose={() => {}} onGo={onGo} />);

    const lignes = [...document.querySelectorAll("button.inbox-row")];
    expect(lignes).toHaveLength(monde.items.length);
    // Le texte est bien là : une ligne cliquable mais muette ne sert à rien.
    expect(lignes[0]?.textContent).toContain("Diane te propose un échange");
    // Et le carnet annonce ce qu'il permet, pour un lecteur d'écran.
    expect(lignes[0]?.getAttribute("aria-label")).toContain("Diane te propose un échange");
    // Rien d'inerte ne traîne : plus de ligne nue hors bouton.
    expect(document.querySelectorAll(".inbox-list li:not(:has(button))")).toHaveLength(0);
  });

  it("mène à l'écran de la famille touchée, sans exception", async () => {
    const { NotificationsSheet } = await import("@/components/notifications-sheet");
    await banc.monter(<NotificationsSheet onClose={() => {}} onGo={onGo} />);

    const attendus: Array<[number, string, string | undefined]> = [
      [0, "compte", undefined], // une offre d'échange se répond dans le compte
      [1, "amis", "incoming"], // une demande d'ami ouvre la liste des demandes
      [2, "last-pack", undefined], // un paquet volé se regarde là où il est exposé
      [3, "classeur", undefined], // le direct se voit sur la carte du créateur
    ];

    for (const [index, cible, section] of attendus) {
      const ligne = document.querySelectorAll<HTMLButtonElement>("button.inbox-row")[index]!;
      act(() => {
        ligne.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });
      expect(onGo).toHaveBeenLastCalledWith(cible, section);
    }
    expect(onGo).toHaveBeenCalledTimes(attendus.length);
  });

  it("marque la visite avant de partir, sinon la pastille revient", async () => {
    const { NotificationsSheet } = await import("@/components/notifications-sheet");
    await banc.monter(<NotificationsSheet onClose={() => {}} onGo={onGo} />);

    const avant = monde.marquerVu.mock.calls.length;
    const ligne = document.querySelector<HTMLButtonElement>("button.inbox-row")!;
    act(() => {
      ligne.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });

    // Le montage a déjà marqué la visite (c'est la règle du carnet) : on
    // compte donc l'appel **de plus** que fait le tap.
    expect(monde.marquerVu).toHaveBeenCalledTimes(avant + 1);
    // L'ordre compte : marquer après la navigation publierait une pastille
    // calculée sur l'ancienne visite.
    expect(gestes.slice(-2)).toEqual(["vu", "go"]);
  });

  it("affiche le carnet hors ligne autrement qu'en jargon", async () => {
    // Le même build sans rien en ligne : le carnet n'a personne à annoncer, et
    // la phrase qui le dit doit rester une phrase de jeu.
    monde.cloud.configured = false;
    monde.cloud.userId = null;
    monde.cloud.inboxAt = null;
    const { NotificationsSheet } = await import("@/components/notifications-sheet");
    await banc.monter(<NotificationsSheet onClose={() => {}} onGo={onGo} />);

    const html = banc.ecran("19-carnet-hors-ligne");
    expect(html).toContain("Le carnet demande une connexion");
    for (const mot of ["cloud", "serveur", "Supabase", "json"]) {
      expect(html.toLowerCase()).not.toContain(mot);
    }
    // Rien à toucher : pas de ligne bouton dans cet état.
    expect(document.querySelectorAll("button.inbox-row")).toHaveLength(0);
  });
});
