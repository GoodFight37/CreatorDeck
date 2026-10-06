/**
 * Les amis — types partagés et règles pures.
 *
 * Tout ce qui est **décidé** ici est du calcul local (trier, filtrer, écrire une
 * date en français). Ce qui est **décidé par le serveur** — qui est ami avec qui,
 * qui a le droit d'accepter une demande — vit dans
 * `supabase/migrations/0008_friends.sql` : un client ne peut pas décider qu'il
 * est l'ami de quelqu'un, il doit le demander et l'autre doit accepter.
 *
 * Trois listes, trois formes différentes, parce que le serveur ne renvoie pas la
 * même chose selon le sens de la demande :
 *
 *   * `Friendship` — une amitié acceptée (l'« autre » joueur, quel que soit le
 *     sens) ;
 *   * `IncomingRequest` — une demande **reçue** : on connaît l'expéditeur ;
 *   * `OutgoingRequest` — une demande **envoyée** : on connaît le destinataire.
 *
 * Les nommer séparément évite le type fourre-tout à champs optionnels, où l'on
 * finit par lire `recipientName` sur une demande reçue et afficher du vide.
 */

/** Une amitié acceptée, vue depuis le joueur connecté. */
export type Friendship = {
  /** Identifiant de la ligne `friends` (numérique, côté serveur). */
  id: number;
  /** L'identifiant du joueur ami (`profiles.user_id`). */
  friendId: string;
  /** Son nom affiché, tel que le serveur le connaît. */
  friendName: string;
  /** Date d'acceptation (ISO). */
  createdAt: string;
};

/** Une demande d'ami **reçue** : quelqu'un veut être ton ami. */
export type IncomingRequest = {
  id: number;
  senderId: string;
  senderName: string;
  createdAt: string;
};

/** Une demande d'ami **envoyée** : tu attends une réponse. */
export type OutgoingRequest = {
  id: number;
  recipientId: string;
  recipientName: string;
  createdAt: string;
};

/** Les trois listes telles que l'écran les affiche. */
export type FriendLists = {
  friends: Friendship[];
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
};

export const EMPTY_FRIEND_LISTS: FriendLists = Object.freeze({
  friends: [],
  incoming: [],
  outgoing: [],
});

/** Le résultat d'une demande d'ami, tel que le serveur le raconte. */
export type SendFriendRequestOutcome = {
  /** Vrai si les deux joueurs étaient déjà amis (rien n'a été envoyé). */
  alreadyFriends: boolean;
  /**
   * Vrai si une demande existait **dans l'autre sens** : c'est alors à toi de
   * l'accepter dans « Reçues », et le serveur n'en crée pas une deuxième.
   */
  existing: boolean;
  /** Vrai si la demande a bien été créée. */
  sent: boolean;
};

/** Le nombre d'amis, écrit en toutes lettres : « 1 ami », « 3 amis ». */
export function friendCountLabel(count: number): string {
  return count === 1 ? "1 ami" : `${count} amis`;
}

/** Trie du plus récent au plus ancien, sans dépendre de la locale du moteur. */
export function byNewestFirst<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

/**
 * Filtre les amis sur le nom **ou** l'identifiant : le pseudo d'un joueur peut
 * changer, et un lien de partage contient l'identifiant — les deux doivent
 * permettre de retrouver la personne dans une liste qui grandit.
 */
export function filterFriends(friends: Friendship[], query: string): Friendship[] {
  const needle = query.trim().toLocaleLowerCase("fr");
  if (!needle) return friends;
  return friends.filter(
    (friend) =>
      friend.friendName.toLocaleLowerCase("fr").includes(needle) ||
      friend.friendId.toLocaleLowerCase("fr").includes(needle),
  );
}

/**
 * « il y a 5 min », « hier », « il y a 3 jours ».
 *
 * Volontairement court et approximatif : dans une liste d'amis, la date exacte
 * n'apporte rien de plus que l'ordre de grandeur, et une date absolue obligerait
 * à lire pour comprendre.
 */
export function relativeDay(iso: string, now: number): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  const minutes = Math.max(0, Math.round((now - at) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "hier" : `il y a ${days} jours`;
}
