/**
 * Le banc d'essai **des écrans** : l'application montée dans un DOM, parcourue
 * comme au doigt.
 *
 * Pourquoi il existe : ce dépôt se travaille sans navigateur (l'environnement de
 * développement n'en a pas, et `next build` ne pré-rend que l'accueil). Avant
 * lui, un découpage de composant — déplacer une vue dans son fichier, sortir une
 * feuille — ne pouvait être vérifié qu'en installant l'APK. Ici, les quatre
 * onglets s'ouvrent, les feuilles s'ouvrent, un booster se tire, et chacun dit
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

  it("ouvre les quatre onglets, chacun avec son écran", async () => {
    await application();
    expect(banc.ecran("01-accueil")).toContain("Ouvrir le booster");

    banc.appuyer("Binder");
    const binder = banc.ecran("02-binder");
    expect(binder).toContain("binder-tools");
    expect(binder).toContain("streameurs découverts");

    banc.appuyer("Craft");
    expect(banc.ecran("03-craft")).toContain("Façonne ta collection");

    banc.appuyer("Toi");
    expect(banc.ecran("04-toi")).toContain("Compte et cloud");
  });

  it("ouvre les feuilles : le compte, les objectifs, les taux", async () => {
    await application();
    banc.appuyer("Toi");

    banc.appuyer("Compte et cloud");
    // Sans cloud configuré, la feuille le dit au lieu de proposer une connexion.
    expect(banc.ecran("05-compte")).toContain("Cloud &amp; classement");
    banc.fermer();

    banc.appuyer("Objectifs et saisons");
    expect(banc.ecran("06-objectifs")).toContain("Progression");

    banc.appuyer("Toi");
    banc.appuyer("Taux de drop");
    expect(banc.ecran("07-taux")).toContain("Taux de drop des boosters");
    banc.fermer();
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

  it("ouvre « Ta chaîne » : le studio, le HUD, l'événement et la vidéo du jour", async () => {
    await application();
    banc.appuyer(/Ta chaîne/);
    const chaine = banc.ecran("10-chaine");
    // jsdom garde l'apostrophe nue dans un nœud de texte (les entités ne
    // s'appliquent qu'aux attributs).
    expect(chaine).toContain("Ta chaîne");
    expect(chaine).toContain("Let's Play");
    // **Le studio** : la scène (et non une liste), son HUD de jeu, la pièce avec
    // ses huit objets éteints, et les deux socles d'invités libres.
    expect(chaine).toContain("chaine-stage");
    expect(document.querySelector(".chaine-hud-rank")).not.toBeNull();
    expect(chaine).toContain("Petit canal");
    expect(chaine).toContain("0 / 2\u202f500");
    expect(chaine).toContain("+240 / jour");
    expect(document.querySelectorAll(".chaine-object")).toHaveLength(8);
    expect(document.querySelectorAll(".chaine-object.on")).toHaveLength(0);
    expect(document.querySelectorAll(".chaine-stand.libre")).toHaveLength(2);
    expect(chaine).toContain("Place 1");
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
    expect(chaine).not.toContain("Place 1 libre");
    banc.fermer();
  });

  it("le socle du bureau ouvre le classeur, qui ne propose que des créateurs en direct", async () => {
    await application();
    banc.appuyer(/Ta chaîne/);
    // Le socle de la place 1 est un bouton sans texte (le « + » est un dessin) :
    // on l'ouvre par son nom accessible, comme le ferait un lecteur d'écran.
    banc.appuyerNom("Choisir un invité pour la place 1");
    const choix = banc.ecran("10-chaine-bureau-choix");
    // Ce que l'écran promet, et ce qu'il refuse de faire : une liste inventée.
    expect(choix).toContain("En direct maintenant");
    expect(choix).toContain("Chercher un créateur en direct");
    expect(choix).toContain("Un créateur par carte");
    // Ce banc n'a pas de table du direct (aucun cloud) : personne n'est
    // proposé, et l'écran le dit au lieu de laisser une liste vide muette.
    expect(choix).toContain("Aucun créateur de ta collection n'est en direct");
    banc.appuyer("Fermer");
    // Fermer le classeur rend la scène telle quelle : le socle est toujours là.
    const ferme = banc.ecran("10-chaine-bureau-ferme");
    expect(ferme).toContain("Place 1");
    expect(document.querySelectorAll(".chaine-stand.libre")).toHaveLength(2);
    banc.fermer();
  });

  it("glisse la carte de l'imprévu : un effleurement ne joue rien, un geste franc si", async () => {
    await application();
    banc.appuyer(/Ta chaîne/);
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
    banc.ecran("10-chaine-effleurement");
    // L'effleurement n'a rien joué : la carte est toujours là, entière.
    expect(document.querySelector(".chaine-card")).not.toBeNull();
    expect(document.querySelector(".chaine-outcome")).toBeNull();

    // Un geste **retiré** (appel entrant, défilement pris par le navigateur) :
    // la carte s'arme, puis l'annulation la repose sans jouer.
    doigt("pointerdown", 200);
    doigt("pointermove", 90);
    doigt("pointercancel", 90);
    await act(async () => {});
    banc.ecran("10-chaine-geste-retire");
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
    const joue = banc.ecran("10-chaine-imprevu-joue");
    // L'imprévu est joué : la carte laisse place au verdict du serveur.
    expect(document.querySelector(".chaine-outcome")).not.toBeNull();
    expect(document.querySelector(".chaine-card")).toBeNull();
    expect(joue).toContain("Événement du jour");
    banc.fermer();
  });

  it("rend deux fois le même HTML (l'horloge et le hasard sont figés)", async () => {
    await application();
    const premier = banc.ecran("09-determinisme-a");
    banc.vider();
    await application();
    expect(banc.ecran("09-determinisme-b")).toBe(premier);
  });
});
