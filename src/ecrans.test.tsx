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

  it("ouvre les quatre piliers, chacun avec son écran", async () => {
    await application();
    expect(banc.ecran("01-accueil")).toContain("Ouvrir le booster");

    banc.appuyer("Binder");
    const binder = banc.ecran("02-binder");
    expect(binder).toContain("binder-tools");
    expect(binder).toContain("streameurs découverts");

    banc.appuyer("Craft");
    expect(banc.ecran("03-craft")).toContain("Façonne ta collection");

    // **Quatre piliers, et rien d'autre** : l'onglet Studio a été retiré le
    // 8 octobre 2026 avec la pièce visuelle. « Ta chaîne » reste un écran du
    // jeu — il s'ouvre par sa ligne de l'accueil, et la barre ne l'allume pas.
    expect(
      [...document.querySelectorAll(".bottom-nav button span")].map((n) => n.textContent),
    ).toEqual(["Drop", "Binder", "Craft", "Toi"]);

    banc.appuyer("Toi");
    // L'écran Toi ne nomme plus l'infrastructure : on y entre par « Mon compte ».
    expect(banc.ecran("04-toi")).toContain("Mon compte");
  });

  it("ouvre les feuilles : le compte, les objectifs, les taux", async () => {
    await application();
    banc.appuyer("Toi");

    banc.appuyer("Mon compte");
    // Sans rien en ligne, la feuille le dit au lieu de proposer une connexion —
    // et elle le dit en français de jeu, pas en vocabulaire d'atelier.
    const feuille = banc.ecran("05-compte");
    expect(feuille).toContain("Mon compte");
    expect(feuille).toContain("Joue pour toi, sur cet appareil");
    for (const mot of ["cloud", "Supabase", "serveur", ".json", ".sql", "token"]) {
      expect(feuille.toLowerCase()).not.toContain(mot);
    }
    banc.fermer();

    banc.appuyer("Objectifs et saisons");
    expect(banc.ecran("06-objectifs")).toContain("Progression");

    banc.appuyer("Toi");
    banc.appuyer("Taux de drop");
    expect(banc.ecran("07-taux")).toContain("Taux de drop des boosters");
    banc.fermer();
  });

  it("achète un palier : le palier est installé, et les points partent", async () => {
    // Le moment où les points partent. Hors ligne, l'achat passe par le même
    // moteur que le serveur (`buyStreamerSetupLocally`) — c'est donc le vrai
    // achat, pas une image. Le palier s'écrit « installé » dans la liste, et
    // c'est tout ce que l'écran en dit depuis que la pièce est partie.
    const { gameStore } = await import("@/lib/game-store");
    await application();
    const avant = gameStore.getSnapshot();
    expect(avant).not.toBeNull();
    await act(async () => {
      gameStore.replaceState({ ...avant!, points: 500 });
    });

    try {
      banc.appuyerNom(/Ouvrir ta chaîne/);
      banc.appuyer(/^Installer/);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // Le palier est payé : la liste du setup le dit installé, et les points
      // sont partis (le prix du premier palier). La relecture après l'achat est
      // ce qui le fait apparaître tout de suite, sans quitter l'écran.
      expect(banc.ecran("08b-studio-achat")).toContain("chaine-setup-item installe");
      expect(gameStore.getSnapshot()!.points).toBe(380);
    } finally {
      // La partie est partagée par les bancs de ce fichier : on rend l'état
      // trouvé, sinon le test suivant hérite d'un studio équipé.
      await act(async () => {
        gameStore.replaceState(avant!);
      });
    }
  });

  it("tire un booster et montre la révélation", async () => {
    await application();
    banc.appuyer("Ouvrir le booster");
    // Le tirage passe par des temporisations (silence, déchirure) : l'horloge
    // figée doit avancer à la main, sinon l'écran de révélation n'arrive jamais.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    const revelation = banc.ecran("08-revelation");
    expect(revelation).toContain("card-nameplate");
    // Le booster hors ligne n'est pas perdu : il sort de la réserve du jour.
    expect(revelation).toContain("cartes · 1 Rare ou mieux garantie");
  });

  it("ouvre Ta chaîne par sa ligne de l'accueil : le HUD, le bureau, l'événement et la vidéo", async () => {
    await application();
    // La porte de l'accueil (« Ta chaîne · N abonnés · … ») est le **seul**
    // chemin depuis que l'onglet est parti : le compte est fait par le nom
    // accessible, comme au doigt.
    banc.appuyerNom(/Ouvrir ta chaîne/);
    const chaine = banc.ecran("10-studio");
    expect(chaine).toContain("Let's Play");
    // Le Studio n'est pas une feuille : rien en surimpression, pas de « X ».
    expect(document.querySelector(".app-content .studio-view")).not.toBeNull();
    expect(document.querySelector(".odds-overlay")).toBeNull();
    expect(document.querySelector(".odds-panel")).toBeNull();
    expect(document.querySelector('button[aria-label="Fermer"]')).toBeNull();
    // **Le HUD**, en texte : le rang, la jauge d'abonnés, le rythme et les
    // jetons. La pièce le dessinait, elle ne le calculait pas.
    expect(document.querySelector(".chaine-hud-rank")).not.toBeNull();
    expect(chaine).toContain("Petit canal");
    expect(chaine).toContain("0 / 2\u202f500");
    expect(chaine).toContain("+240 / jour");
    // Plus une seule image sur l'écran : le décor est parti, pas remplacé.
    expect(document.querySelectorAll(".studio-view img")).toHaveLength(0);
    // Deux places libres : un bouton qui invite, jamais une **boîte
    // pointillée**, jamais un « + », jamais un « Place 1 » écrit à l'écran.
    expect(document.querySelectorAll(".chaine-place.libre")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-place-plus")).toHaveLength(0);
    expect(chaine).toContain("Inviter un créateur");
    expect(chaine).not.toContain("Place 1");
    // Le retour existe : l'écran n'a plus d'onglet allumé pour dire où l'on est.
    expect(document.querySelector(".chaine-retour")).not.toBeNull();
    // Les badges remplacent les titres et les notices : l'événement du jour, la
    // vidéo du jour, le setup, et les deux grosses actions arcade.
    expect(chaine).toContain("Événement du jour");
    expect(chaine).toContain("Vidéo du jour");
    expect(chaine).toContain("Ton setup");
    expect(document.querySelectorAll(".chaine-card-buttons button")).toHaveLength(2);
    expect(chaine).toContain("%");
    // **Aucune notice** : plus de mode d'emploi du backend ni de phrase de geste.
    expect(chaine).not.toContain("Glisse la carte");
    expect(chaine).not.toContain("Prochain palier");
    expect(chaine).not.toContain("jetons versés aujourd");
    expect(chaine).not.toContain("Le tirage de la vidéo");
  });

  it("la place libre du bureau ouvre le classeur, qui ne propose que des créateurs en direct", async () => {
    await application();
    banc.appuyerNom(/Ouvrir ta chaîne/);
    // La place 1 se nomme « Choisir un invité pour la place 1 » **et** porte son
    // texte visible (« Inviter un créateur ») : on l'ouvre par son nom
    // accessible, comme le ferait un lecteur d'écran.
    banc.appuyerNom("Choisir un invité pour la place 1");
    const choix = banc.ecran("10-studio-bureau-choix");
    // Ce que l'écran promet, et ce qu'il refuse de faire : une liste inventée.
    expect(choix).toContain("En direct maintenant");
    expect(choix).toContain("Chercher un créateur en direct");
    expect(choix).toContain("Un créateur par carte");
    // Ce banc n'a pas de table du direct (aucun cloud) : personne n'est
    // proposé, et l'écran le dit au lieu de laisser une liste vide muette.
    expect(choix).toContain("Aucun créateur de ta collection n'est en direct");
    banc.appuyer("Fermer");
    // Fermer le classeur rend l'écran tel quel : les deux places sont là, et on
    // est toujours sur « Ta chaîne » (aucune feuille, donc rien à fermer en
    // plus — la sortie, c'est un pilier de la barre ou le bouton Retour).
    banc.ecran("10-studio-bureau-ferme");
    expect(document.querySelectorAll(".chaine-place.libre")).toHaveLength(2);
    expect(document.querySelector(".app-content .studio-view")).not.toBeNull();
  });

  it("glisse la carte de l'imprévu : un effleurement ne joue rien, un geste franc si", async () => {
    await application();
    banc.appuyerNom(/Ouvrir ta chaîne/);
    const carte = document.querySelector<HTMLElement>(".chaine-card");
    expect(carte).not.toBeNull();

    /** Un doigt sur la carte : on descend, on bouge, on lève. */
    const doigt = (type: string, x: number, y = 400) => {
      act(() => {
        carte!.dispatchEvent(
          new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }),
        );
      });
    };

    // Un effleurement : moins de la course du seuil. Rien n'est armé, et
    // relâcher ne répond pas — c'est la règle du booster, appliquée à la carte.
    doigt("pointerdown", 100);
    doigt("pointermove", 118);
    doigt("pointerup", 118);
    await act(async () => {});
    banc.ecran("10-studio-effleurement");
    // L'effleurement n'a rien joué : la carte est toujours là, entière.
    expect(document.querySelector(".chaine-card")).not.toBeNull();
    expect(document.querySelector(".chaine-outcome")).toBeNull();

    // Un geste **retiré** (appel entrant, défilement pris par le navigateur) :
    // la carte s'arme, puis l'annulation la repose sans jouer.
    doigt("pointerdown", 200);
    doigt("pointermove", 90);
    doigt("pointercancel", 90);
    await act(async () => {});
    banc.ecran("10-studio-geste-retire");
    // Le geste retiré repose la carte : rien n'est armé, rien n'est joué.
    expect(document.querySelector(".chaine-card-sides span.arme")).toBeNull();
    expect(document.querySelector(".chaine-outcome")).toBeNull();

    // Un geste franc vers la gauche : le côté s'arme pendant le glissement…
    doigt("pointerdown", 200);
    doigt("pointermove", 90);
    expect(document.querySelector(".chaine-card-sides span.arme")?.textContent).toBeTruthy();
    // …et le doigt levé joue la carte, une seule fois.
    doigt("pointerup", 90);
    await act(async () => {});
    const joue = banc.ecran("10-studio-imprevu-joue");
    // L'imprévu est joué : la carte laisse place au verdict du serveur.
    expect(document.querySelector(".chaine-outcome")).not.toBeNull();
    expect(document.querySelector(".chaine-card")).toBeNull();
    expect(joue).toContain("Événement du jour");
  });

  it("rend deux fois le même HTML (l'horloge et le hasard sont figés)", async () => {
    await application();
    const premier = banc.ecran("09-determinisme-a");
    banc.vider();
    await application();
    expect(banc.ecran("09-determinisme-b")).toBe(premier);
  });
});
