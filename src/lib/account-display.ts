/**
 * Ce que l'écran **dit au joueur** de sa partie en ligne, en deux fonctions.
 *
 * Pourquoi ce module existe : le jeu parlait au joueur comme à un développeur
 * (« Projet toto · synchronisé », « Charger le cloud », l'adresse e-mail en
 * clair au milieu de l'écran, des boutons d'envoi manuel). Un jeu grand public
 * ne raconte pas sa tuyauterie : il rassure en **une pastille**. Tout ce qui se
 * décide ici est donc de la **rédaction**, et c'est testé comme telle
 * (`src/lib/account-display.test.ts`) — la mécanique de synchronisation, elle,
 * reste dans `src/lib/cloud/`.
 *
 * Deux règles de rédaction, valables partout :
 *
 *  * on ne montre **jamais** l'adresse complète du joueur : elle est masquée
 *    dès qu'elle dépasse le strict nécessaire (`k•••@e•••.fr`) ;
 *  * on ne nomme **jamais** l'infrastructure : ni base de données, ni service,
 *    ni extension de fichier — on dit « en ligne », « sauvegarde »,
 *    « connexion », « probabilités ».
 */

import { PROGRESSION_SYNCHRONISEE } from "@/lib/cloud/store-text";

/** L'état de la sauvegarde, tel que la pastille le raconte. */
export type SyncTone = "ok" | "busy" | "local";

export type SyncState = {
  /** Le build parle-t-il à un service en ligne ? */
  configured: boolean;
  /** Un compte est-il connecté ? */
  signedIn: boolean;
  /** Des changements locaux attendent leur envoi. */
  pending: boolean;
  /** Un aller-retour est en cours. */
  busy: boolean;
  /** Le dernier aller-retour a échoué. */
  isError: boolean;
};

export type SyncLine = {
  tone: SyncTone;
  /** Ce qu'on lit dans la pastille : trois mots au plus. */
  label: string;
  /** La précision, quand elle sert — sinon `null` (on ne remplit pas pour remplir). */
  detail: string | null;
};

/**
 * La phrase de la pastille.
 *
 * L'ordre des cas est l'ordre des priorités : « en cours » passe avant
 * « échec », parce qu'un aller-retour en cours après un échec est une
 * **nouvelle** tentative, pas une erreur à montrer.
 */
export function etatSynchronisation(state: SyncState): SyncLine {
  if (!state.configured || !state.signedIn) {
    return {
      tone: "local",
      label: "Sauvegarde sur cet appareil",
      detail: state.configured
        ? "Connecte un compte pour retrouver ta partie sur un autre téléphone."
        : "Ta partie est enregistrée ici, à chaque action.",
    };
  }
  if (state.busy || state.pending) {
    return { tone: "busy", label: "Synchronisation en cours…", detail: null };
  }
  if (state.isError) {
    // Un échec ne se crie pas : la partie locale est intacte, et la prochaine
    // action retentera toute seule. On le dit sans inquiéter.
    return {
      tone: "local",
      label: "Synchronisation en attente",
      detail: "Ta partie est gardée ici. On réessaiera tout seul.",
    };
  }
  return { tone: "ok", label: PROGRESSION_SYNCHRONISEE, detail: null };
}

/**
 * La **section que la feuille de compte met sous les yeux** à l'ouverture.
 *
 * `null` : on arrive en haut, comme toujours. Une valeur : la feuille s'ouvre
 * avec cette section déjà ouverte et déjà défilée. C'est ce qui permet au carnet
 * de mener quelque part de précis (« Diane te propose un échange » → les
 * échanges), au lieu de déposer le joueur devant un écran qu'il faut fouiller.
 *
 * Le type vit ici, à côté de ce qui se **décide** pour l'écran, et il est
 * partagé par l'application (qui choisit la section), la feuille (qui la passe)
 * et le panneau (qui la montre).
 */
export type AccountFocus = "leaderboard" | "trades" | null;

/**
 * Une adresse e-mail, masquée pour être lue — pas pour être utilisée.
 *
 * `kamet0@exemple.fr` → `k•••@e•••.fr` : le joueur reconnaît son adresse au
 * premier coup d'œil, et personne qui passe derrière l'épaule ne la lit en
 * entier. Sans `@` (ou vide), il n'y a rien à reconnaître : on rend le masque
 * générique, jamais l'adresse.
 */
export function masquerEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const propre = email.trim();
  if (!propre) return null;
  const at = propre.indexOf("@");
  if (at <= 0 || at === propre.length - 1) return "•••";
  const local = propre.slice(0, at);
  const domaine = propre.slice(at + 1);
  const point = domaine.indexOf(".");
  // Le domaine peut être nu (`exemple.local` sans TLD) : on garde alors le nom
  // du domaine, masqué, plutôt que d'inventer un point.
  const fin = point > 0 ? domaine.slice(point) : "";
  const nom = point > 0 ? domaine.slice(0, point) : domaine;
  return `${local[0]}•••@${nom[0]}•••${fin}`;
}
