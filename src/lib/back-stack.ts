/**
 * Le dos de l'écran : ce qui répond au **bouton retour d'Android**.
 *
 * Sur Android, le retour est un geste, pas un bouton comme les autres : il doit
 * fermer **ce qui est ouvert**, et seulement quand plus rien n'est ouvert, faire
 * autre chose (revenir à l'accueil, puis mettre l'app de côté). Sans cette pile,
 * l'APK quittait d'un coup dès qu'une fiche ou une feuille était ouverte — le
 * genre de détail qui fait « amateur » en dix secondes.
 *
 * La règle est celle d'un navigateur : **le dernier ouvert est le premier
 * fermé**. Chaque écran qui se superpose s'inscrit ici, et se désinscrit quand
 * il se ferme. L'ordre d'inscription suit celui du rendu (un enfant s'inscrit
 * avant son parent, une feuille avant la page qui la porte), donc le dernier
 * inscrit est bien celui du dessus.
 *
 * Ce module est **pur** : il ne connaît ni Capacitor, ni React, ni le DOM — ce
 * qui permet de le tester (`src/lib/back-stack.test.ts`) et de garder les hooks
 * (`use-back-handler`, `use-android-back`) minuscules.
 */

/** Répond au retour. Rend `true` quand il a fait quelque chose. */
export type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

/**
 * Inscrit un écran dans la pile. Rend la fonction qui le retire — c'est ce que
 * React attend d'un `useEffect` : la feuille s'inscrit en s'ouvrant, se retire
 * en se fermant, et rien ne s'accumule.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

/**
 * Le retour a été pressé : on demande au **dernier** inscrit. S'il ne fait rien
 * (`false`), on essaie le précédent — un écran peut préférer laisser passer,
 * par exemple une feuille en cours d'animation.
 *
 * Rend `true` si quelqu'un a répondu : l'appelant n'a plus rien à faire.
 */
export function runBackHandler(): boolean {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    if (handlers[index]?.() === true) return true;
  }
  return false;
}

/** Combien d'écrans sont inscrits — pour les tests, et pour lire l'état. */
export function backHandlerCount(): number {
  return handlers.length;
}

/**
 * Vide la pile. L'application n'en a pas besoin — chaque écran se retire en se
 * fermant — mais les tests, si : ils partagent le même module, et une pile qui
 * déborde d'un test à l'autre ferait passer le suivant pour un menteur.
 */
export function resetBackStack(): void {
  handlers.length = 0;
}
