/**
 * L'écran Compte **avec un compte connecté** : c'est là que se jouait le
 * défaut que cette passe corrige.
 *
 * Avant : le joueur voyait son adresse e-mail en clair au milieu de l'écran, un
 * nom de projet, cinq boutons d'infrastructure (« Synchroniser », « Envoyer ma
 * collection », « Charger le cloud », « Tester la connexion au cloud »), un
 * bloc « Sauvegarde de cet appareil » avec un pavé de texte à copier — le tout
 * mélangé à sa vitrine et à ses échanges.
 *
 * Après : une carte d'identité, une **pastille verte**, et deux familles bien
 * séparées (profil public, réglages du compte). Ce banc vérifie exactement ça :
 * ce qui doit être là, et ce qui ne doit **plus** être là.
 *
 * Aucun réseau : la session est simulée (`useCloud` est remplacé), et les
 * panneaux du dessous lisent le même état figé que la feuille.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { cloudStore } from "@/lib/cloud/cloud-store";

vi.hoisted(() => {
  // La configuration du cloud est lue à l'import des modules : elle doit être
  // posée avant (`src/lib/cloud/config.ts`).
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemple.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_exemple_de_banc_d_essai_0000";
});

const monde = vi.hoisted(() => ({
  /** Posé sur l'état du store : ce que le joueur connecté voit. */
  surcharge: {
    // Ce build-ci parle à quelque chose : c'est le cas visé par ce banc.
    configured: true,
    userId: "11111111-1111-4111-8111-111111111111",
    email: "kamet0@exemple.fr",
    displayName: "Kamet0",
    project: "creatordeck-prod",
    pending: false,
    busy: false,
    isError: false,
    decision: "noop" as string | null,
    remoteUpdatedAt: Date.UTC(2026, 9, 8, 11, 0, 0),
    lastSyncAt: Date.UTC(2026, 9, 8, 11, 0, 0),
    message: null as string | null,
  },
}));

/**
 * `useCloud` rend l'état réel du store, complété par la surcharge ci-dessus :
 * les panneaux (vitrine, échanges, classement) reçoivent donc un état complet,
 * et la feuille se croit connectée. La fabrique reste **synchrone** — une
 * fabrique asynchrone ne s'applique pas ici — et `cloudStore` importé en tête
 * est déjà construit quand le composant est monté (import dynamique).
 */
vi.mock("@/hooks/use-cloud", () => ({
  useCloud: () => ({ ...cloudStore.getSnapshot(), ...monde.surcharge }),
}));

describe("l'écran Compte d'un joueur connecté", () => {
  let banc: Banc;

  beforeEach(() => {
    banc = creerBanc();
    banc.preparer();
  });

  afterEach(() => {
    banc.nettoyer();
  });

  it("sépare le profil public des réglages du compte", async () => {
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet onClose={() => {}} />);

    const ecran = banc.ecran("20-compte-lie");
    // L'identité d'abord.
    expect(ecran).toContain("Mon compte");
    expect(ecran).toContain("compte lié");
    expect(ecran).toContain("Kamet0");
    // Puis ce que les autres voient.
    expect(ecran).toContain("Profil public");
    expect(ecran).toContain("Classement mondial");
    expect(ecran).toContain("Ma vitrine");
    // Puis ce qui touche à l'accès, en bas.
    expect(ecran).toContain("Réglages du compte");
    expect(ecran).toContain("Déconnexion");
    // L'ordre de lecture : le public avant les réglages, la sortie en dernier.
    expect(ecran.indexOf("Profil public")).toBeLessThan(ecran.indexOf("Réglages du compte"));
    expect(ecran.indexOf("Réglages du compte")).toBeLessThan(ecran.indexOf("Déconnexion"));
  });

  it("montre la pastille verte au lieu des boutons de synchronisation", async () => {
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet onClose={() => {}} />);

    const ecran = banc.ecran("21-compte-lie-pastille");
    expect(ecran).toContain("Progression synchronisée");
    expect(ecran).toContain("sync-badge ok");
  });

  it("cache l'adresse en clair, et ne dit jamais où la partie est gardée", async () => {
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet onClose={() => {}} />);

    const ecran = banc.ecran("22-compte-lie-adresse");
    // Le joueur reconnaît son adresse, personne ne la lit par-dessus son épaule.
    expect(ecran).toContain("k•••@e•••.fr");
    expect(ecran).not.toContain("kamet0@exemple.fr");
    // Ni le nom du projet, ni celui du service : c'est de la tuyauterie.
    expect(ecran).not.toContain("creatordeck-prod");
    for (const mot of ["cloud", "Supabase", "serveur", "Projet", "payload", "token", "json"]) {
      expect(ecran.toLowerCase(), `jargon encore affiché : ${mot}`).not.toContain(mot.toLowerCase());
    }
  });

  it("s'ouvre sur les échanges quand on vient du carnet, et se déplie", async () => {
    // Le carnet annonce « Diane te propose un échange » : la feuille doit
    // arriver **là**, panneau ouvert — pas en haut, avec l'échange replié deux
    // écrans plus bas.
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    try {
      const { AccountSheet } = await import("@/components/account-sheet");
      await banc.monter(<AccountSheet onClose={() => {}} focus="trades" />);

      const panneau = document.querySelector<HTMLDetailsElement>(".trade-details");
      expect(panneau).toBeTruthy();
      expect(panneau!.open).toBe(true);
      // Il s'est mis sous les yeux : c'est le même geste que le classement.
      expect(scroll.mock.instances).toContain(panneau);
      banc.ecran("24-compte-echanges");

      // Toute autre arrivée ouvre la feuille en haut, panneau replié : la
      // section n'est pas un état permanent.
      banc.vider();
      await banc.monter(<AccountSheet onClose={() => {}} />);
      expect(document.querySelector<HTMLDetailsElement>(".trade-details")?.open).toBe(false);
    } finally {
      scroll.mockRestore();
    }
  });

  it("garde le panneau des échanges refermable par le joueur", async () => {
    // Arrivé dessus, on doit pouvoir le replier : l'ouverture automatique n'est
    // pas un cadenas.
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet onClose={() => {}} focus="trades" />);
    const panneau = document.querySelector<HTMLDetailsElement>(".trade-details")!;
    expect(panneau.open).toBe(true);
    act(() => {
      panneau.open = false;
      panneau.dispatchEvent(new Event("toggle"));
    });
    expect(document.querySelector<HTMLDetailsElement>(".trade-details")?.open).toBe(false);
  });

  it("a retiré tous les gestes manuels de sauvegarde", async () => {
    const { AccountSheet } = await import("@/components/account-sheet");
    await banc.monter(<AccountSheet onClose={() => {}} />);

    const ecran = banc.ecran("23-compte-lie-sans-tuyauterie");
    for (const disparu of [
      "Synchroniser",
      "Envoyer ma collection",
      "Charger le cloud",
      "Tester la connexion au cloud",
      "Sauvegarde de cet appareil",
      "Copier ma sauvegarde",
      "Importer une sauvegarde",
      "Remplacer ma progression",
      "à envoyer",
    ]) {
      expect(ecran, `encore affiché : ${disparu}`).not.toContain(disparu);
    }
  });

  it("offre les deux parties au choix, et seulement quand il y en a deux", async () => {
    /*
     * C'est ici que vivent « Charger le cloud » et « Envoyer ma collection »
     * après la suppression des boutons : **deux phrases de joueur**, affichées
     * uniquement quand il y a vraiment une décision à prendre.
     */
    const { AccountSheet } = await import("@/components/account-sheet");
    monde.surcharge.decision = "pull";
    try {
      await banc.monter(<AccountSheet onClose={() => {}} />);
      const choix = banc.ecran("28-compte-deux-parties");
      expect(choix).toContain("Deux parties t'attendent");
      expect(choix).toContain("Reprendre la partie en ligne");
      expect(choix).toContain("Garder celle de cet appareil");
      // Et toujours pas de vocabulaire d'atelier. (« synchronisée », dans la
      // pastille, est du vocabulaire de jeu : c'est une promesse au joueur.)
      for (const mot of ["cloud", "serveur", "push", "pull", "localStorage"]) {
        expect(choix.toLowerCase(), `mot d'atelier : ${mot}`).not.toContain(mot);
      }
    } finally {
      monde.surcharge.decision = "noop";
    }

    // Rien à décider : pas de carte. Un jeu qui demande de choisir quand il n'y
    // a qu'une partie ennuie le joueur pour rien.
    await banc.vider();
    banc.preparer();
    await banc.monter(<AccountSheet onClose={() => {}} />);
    const calme = banc.ecran("29-compte-une-seule-partie");
    expect(calme).not.toContain("Deux parties");
    expect(calme).not.toContain("Reprendre la partie en ligne");
  });

  it("porte la même pastille partout où l'état de la partie se dit", async () => {
    // Le composant est monté seul : c'est lui qui porte la promesse « rien à
    // faire », et il doit savoir le dire dans les deux autres cas aussi.
    const { SyncBadge } = await import("@/components/account/sync-badge");
    await banc.monter(<SyncBadge detail />);
    expect(banc.ecran("24-pastille-synchronisee")).toContain("Progression synchronisée");

    monde.surcharge.pending = true;
    await banc.vider();
    banc.preparer();
    await banc.monter(<SyncBadge detail />);
    expect(banc.ecran("25-pastille-en-cours")).toContain("Synchronisation en cours");

    monde.surcharge.pending = false;
    monde.surcharge.isError = true;
    await banc.vider();
    banc.preparer();
    await banc.monter(<SyncBadge detail />);
    const echec = banc.ecran("26-pastille-en-attente");
    // Un échec ne fait pas peur : la partie est là, on réessaiera.
    expect(echec).toContain("Synchronisation en attente");
    expect(echec).toContain("gardée ici");

    monde.surcharge.isError = false;
    monde.surcharge.userId = "";
    await banc.vider();
    banc.preparer();
    await banc.monter(<SyncBadge detail />);
    expect(banc.ecran("27-pastille-locale")).toContain("Sauvegarde sur cet appareil");
  });
});
