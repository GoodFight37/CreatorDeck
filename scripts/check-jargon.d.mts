/**
 * Types du garde-fou de **rédaction** (voir `check-jargon.mjs`).
 *
 * Le scanner et le test (`src/lib/jargon.test.ts`) partagent les mêmes règles :
 * c'est ce qui garantit que ce que le script refuse en ligne de commande, le
 * test le refuse aussi en intégration.
 */

/** Un mot interdit, et le conseil de réécriture qui va avec. */
export type MotInterdit = [motif: RegExp, conseil: string];

/** Un texte affiché, repéré dans un fichier. */
export type TexteParle = {
  /** Numéro de ligne (1 = première). */
  ligne: number;
  /** Le texte tel qu'il sera lu par le joueur. */
  texte: string;
  /** D'où il vient : un nœud JSX, une prop, une chaîne, un gabarit, une prose. */
  genre: string;
};

/** Une offense : un texte affiché qui contient un mot interdit. */
export type Offense = TexteParle & {
  mot: string;
  conseil: string;
};

/** Les mots interdits dans un texte affiché, avec leur remplaçant conseillé. */
export declare const MOTS_INTERDITS: MotInterdit[];

/** Les textes d'un fichier source, tels que le joueur les lit. */
export declare function textesParles(source: string): TexteParle[];

/** Les offenses d'un fichier source (vide = rien à réécrire). */
export declare function offenses(source: string): Offense[];

/** Tous les fichiers `.ts`/`.tsx` d'un dossier, récursivement. */
export declare function fichiers(dossier: string): string[];

/** Les dossiers de l'interface : c'est là que le joueur lit le jeu. */
export declare function dossiers(): string[];

/** Le rapport complet : le nombre d'offenses, et le texte à afficher. */
export declare function rapport(): { total: number; texte: string };
