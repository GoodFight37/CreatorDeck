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

  it("ouvre « Ta chaîne » et montre l'état, la vidéo du jour et les jetons", async () => {
    await application();
    banc.appuyer(/Ta chaîne/);
    const chaine = banc.ecran("10-chaine");
    // L'écran porte l'état de la chaîne, ses paliers, le calendrier de contenu
    // et le plafond de jetons — c'est le serveur qui paiera, l'écran affiche.
    expect(chaine).toContain("Ta chaîne");
    expect(chaine).toContain("abonnés");
    expect(chaine).toContain("La vidéo du jour");
    // jsdom garde l'apostrophe nue dans un nœud de texte (les entités ne
    // s'appliquent qu'aux attributs).
    expect(chaine).toContain("Let's Play");
    expect(chaine).toContain("jetons versés aujourd");
    // L'imprévu du jour : la carte à glisser, ses deux réponses chiffrées et le
    // repli au doigt. Les chances sont affichées, jamais cachées.
    expect(chaine).toContain("imprévu du jour");
    expect(chaine).toContain("Glisse la carte");
    expect(chaine).toContain("%");
    // Le setup : les cinq paliers, le prochain en clair, et son prix en points.
    expect(chaine).toContain("Ton setup");
    expect(chaine).toContain("Prochain palier");
    expect(chaine).toContain("points");
    // Le bureau : une **scène** (pas une liste de texte), deux socles libres,
    // le studio à éteindre palier par palier, et la règle du raid écrite.
    expect(chaine).toContain("chaine-scene");
    expect(chaine).toContain("Le bureau du streamer");
    expect(chaine).toContain("Le bureau");
    expect(chaine).toContain("Place 1 libre");
    expect(chaine).toContain("Place 2 libre");
    expect(chaine).toContain("chaine-prop prop-webcam");
    expect(document.querySelectorAll(".chaine-slot.libre")).toHaveLength(2);
    expect(chaine).toContain("Invite une carte de ta collection");
    expect(chaine).toContain("une fois par journée de jeu");
    banc.fermer();
  });

  it("le socle du bureau ouvre le classeur, qui ne propose que des créateurs en direct", async () => {
    await application();
    banc.appuyer(/Ta chaîne/);
    // Le « + » du socle de la place 1 : c'est le geste de la scène.
    banc.appuyer(/^Place 1 libre/);
    const choix = banc.ecran("10-chaine-bureau-choix");
    // Ce que l'écran promet, et ce qu'il refuse de faire : une liste inventée.
    expect(choix).toContain("Seuls les créateurs");
    expect(choix).toContain("Chercher un créateur en direct");
    // Ce banc n'a pas de table du direct (aucun cloud) : personne n'est
    // proposé, et l'écran le dit au lieu de laisser une liste vide muette.
    expect(choix).toContain("Aucun créateur de ta collection n'est en direct");
    banc.appuyer("Fermer");
    // Fermer la feuille rend la scène telle quelle : la place est toujours là.
    const ferme = banc.ecran("10-chaine-bureau-ferme");
    expect(ferme).toContain("Place 1 libre");
    expect(ferme).toContain("Le bureau du streamer");
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
    expect(banc.ecran("10-chaine-effleurement")).toContain("Glisse la carte d");

    // Un geste **retiré** (appel entrant, défilement pris par le navigateur) :
    // la carte s'arme, puis l'annulation la repose sans jouer.
    doigt("pointerdown", 200);
    doigt("pointermove", 90);
    doigt("pointercancel", 90);
    await act(async () => {});
    expect(banc.ecran("10-chaine-geste-retire")).toContain("Glisse la carte d");

    // Un geste franc vers la gauche : le côté s'arme pendant le glissement…
    doigt("pointerdown", 200);
    doigt("pointermove", 90);
    expect(document.querySelector(".chaine-card-sides span.arme")?.textContent).toBeTruthy();
    // …et le doigt levé joue la carte, une seule fois.
    doigt("pointerup", 90);
    await act(async () => {});
    const joue = banc.ecran("10-chaine-imprevu-joue");
    expect(joue).toContain("imprévu du jour est joué");
    expect(joue).not.toContain("Glisse la carte d");
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
