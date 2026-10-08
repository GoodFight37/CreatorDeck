import { afterEach, describe, expect, it } from "vitest";
import {
  backHandlerCount,
  registerBackHandler,
  resetBackStack,
  runBackHandler,
} from "@/lib/back-stack";

/**
 * La pile du bouton retour : le dernier ouvert est le premier fermé.
 *
 * Ces tests tiennent la règle que l'APK n'a pas le droit de rater — un retour
 * qui quitte l'app au lieu de fermer une fiche se voit tout de suite à l'usage,
 * et pas du tout dans un test d'écran.
 */
describe("pile du bouton retour", () => {
  // Une pile propre pour chaque test : le module est partagé.
  afterEach(() => resetBackStack());

  it("personne n'est inscrit : personne ne répond", () => {
    expect(backHandlerCount()).toBe(0);
    expect(runBackHandler()).toBe(false);
  });

  it("le dernier ouvert est le premier fermé", () => {
    // Trois écrans superposés, comme un classeur sous une fiche sous une
    // feuille. **Fermer un écran, c'est se désinscrire** : c'est React qui le
    // fait (le nettoyage de l'effet), et c'est ce que font les `remove` ici.
    const ordre: string[] = [];
    const inscrire = (nom: string) =>
      registerBackHandler(() => {
        ordre.push(nom);
        return true;
      });
    const removeA = inscrire("classeur");
    const removeB = inscrire("fiche");
    const removeC = inscrire("feuille");

    expect(backHandlerCount()).toBe(3);

    // Le retour ferme la feuille : elle se désinscrit en se fermant.
    expect(runBackHandler()).toBe(true);
    removeC();
    expect(ordre).toEqual(["feuille"]);

    // Puis la fiche, puis le classeur.
    expect(runBackHandler()).toBe(true);
    removeB();
    expect(runBackHandler()).toBe(true);
    removeA();
    expect(ordre).toEqual(["feuille", "fiche", "classeur"]);

    // Et quand plus rien n'est ouvert, l'app décide (accueil, puis mise de
    // côté) — c'est l'affaire de `useAndroidBack`, pas de la pile.
    expect(runBackHandler()).toBe(false);
  });

  it("un écran qui ne fait rien laisse la main à celui du dessous", () => {
    const ordre: string[] = [];
    const removeBas = registerBackHandler(() => {
      ordre.push("bas");
      return true;
    });
    // Celui-ci refuse : il ne sait pas se fermer tout de suite (animation,
    // chargement), et l'app ne doit pas rester coincée pour autant.
    const removeHaut = registerBackHandler(() => {
      ordre.push("haut");
      return false;
    });

    expect(runBackHandler()).toBe(true);
    expect(ordre).toEqual(["haut", "bas"]);

    removeHaut();
    removeBas();
  });

  it("se désinscrire deux fois ne casse rien", () => {
    const remove = registerBackHandler(() => true);
    expect(backHandlerCount()).toBe(1);
    remove();
    remove();
    expect(backHandlerCount()).toBe(0);
    expect(runBackHandler()).toBe(false);
  });

  it("un écran fermé ne répond plus, même s'il était au milieu", () => {
    const ordre: string[] = [];
    const removeA = registerBackHandler(() => {
      ordre.push("a");
      return true;
    });
    const removeB = registerBackHandler(() => {
      ordre.push("b");
      return true;
    });
    removeA();
    expect(runBackHandler()).toBe(true);
    expect(ordre).toEqual(["b"]);
    removeB();
    expect(backHandlerCount()).toBe(0);
  });
});
