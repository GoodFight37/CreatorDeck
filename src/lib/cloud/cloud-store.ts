/**
 * État du compte et de la synchronisation, exposé à React.
 *
 * Le store ne connaît ni React ni le DOM : on l'instancie avec ses dépendances
 * (`createCloudStore`), ce qui permet de le tester avec un faux client et une
 * fausse partie (`src/lib/cloud/cloud-store.test.ts`). L'instance utilisée par
 * l'application est exportée en bas du fichier.
 *
 * Règle de conduite : **jamais de perte silencieuse**. Si le cloud est plus
 * récent, on ne remplace pas la partie locale tout seul — on le dit, et le
 * joueur décide.
 */
import {
  applyMarketPurchase,
  applyMarketSale,
  applyPackResult,
  applyPackStatus,
  applyTradeResult,
  type DrawnCard,
  type OwnedCard,
  type PlayerState,
  type TradeCard as EngineTradeCard,
} from "@/lib/game-engine";
import type { KeyValueStorage } from "@/lib/save-store";
import { sanitizeState } from "@/lib/save-store";
import { CLOUD_DISABLED_HINT, cloudConfig, type CloudConfig } from "@/lib/cloud/config";
import {
  CloudApi,
  CloudError,
  type LeaderboardMetric,
  type LeaderboardRow,
  type MarketListing,
  type PlayerProfile,
  type PlayerSearchResult,
  type TradeListItem,
} from "@/lib/cloud/api";
import {
  EMPTY_FRIEND_LISTS,
  type FriendLists,
  type Friendship,
  type SendFriendRequestOutcome,
} from "@/lib/social/friends";
import { applyAcceptedTrades, describeCards } from "@/lib/cloud/trades";
import { buildInbox, seenKey, unreadCount, type InboxItem } from "@/lib/social/inbox";
import { emailProblem, passwordProblem } from "@/lib/cloud/credentials";
import { parseOAuthReturn } from "@/lib/cloud/twitch";
import { CREATOR_BY_SLUG, type CardVariant, type Rarity } from "@/lib/catalog";
import { decideSync, stateFingerprint, syncStats, type SyncAction } from "@/lib/cloud/sync";
import { MAX_SHOWCASE, normalizeShowcase } from "@/lib/cloud/showcase";
import { deviceStorage } from "@/lib/storage";
import { gameStore, onPersist } from "@/lib/game-store";

/** Délai après la dernière action avant l'envoi automatique de la partie. */
export const AUTO_PUSH_DEBOUNCE_MS = 20_000;

/** Tri du classement : le type vient du client (`leaderboard()` en base). */
export type { LeaderboardMetric };

export type CloudState = {
  /** Un projet Supabase est-il configuré dans ce build ? */
  configured: boolean;
  /** Adresse e-mail du compte connecté, sinon `null` (compte invité). */
  email: string | null;
  /**
   * Adresse en attente de confirmation par code : Supabase l'a acceptée mais
   * ne l'a pas encore appliquée (le code attend dans la boîte mail). `null`
   * quand rien n'est en attente.
   */
  pendingEmail: string | null;
  /** Nom affiché au classement, tel qu'enregistré côté serveur. */
  displayName: string | null;
  /** Cartes épinglées sur le profil public (0 à 4 slugs, dans l'ordre choisi). */
  showcase: string[];
  userId: string | null;
  /** Nom court du projet Supabase (affiché pour rassurer). */
  project: string | null;
  /** Un appel est en cours. */
  busy: boolean;
  /** Dernier message à afficher (succès ou erreur). */
  message: string | null;
  isError: boolean;
  /** Dernière décision de synchronisation calculée. */
  decision: SyncAction | null;
  /** Horodatage serveur de la sauvegarde cloud connue. */
  remoteUpdatedAt: number | null;
  lastSyncAt: number | null;
  /** Des changements locaux attendent d'être envoyés. */
  pending: boolean;
  leaderboard: LeaderboardRow[];
  leaderboardMetric: LeaderboardMetric;
  /**
   * Famille affichée dans le classement, quand le tri est `family`. Gardée dans
   * l'état (et non dans la feuille) pour la même raison que les amis : l'écran
   * lit, le store écrit.
   */
  leaderboardRegion: string | null;
  /**
   * Profil public ouvert (`player_profile`) : celui d'un autre joueur ou le
   * sien. `null` tant qu'aucune fiche n'est affichée — c'est aussi ce qui ferme
   * la fiche.
   */
  profile: PlayerProfile | null;
  /** La fiche affichée est en cours de chargement. */
  profileBusy: boolean;
  /**
   * Ce que le joueur de la fiche affichée a déposé à l'hôtel (« En vente »).
   * Chargé avec la fiche : la section arrive déjà remplie, sans deuxième rendu.
   */
  profileMarket: MarketListing[];
  /** Offres d'échange du joueur, en attente d'abord (serveur = source de vérité). */
  trades: TradeListItem[];
  /** Horodatage local du dernier chargement des offres. */
  tradesAt: number | null;
  /**
   * Les amis et les demandes en attente, tels que le serveur les a donnés au
   * dernier chargement. Ils vivent ici — et non dans la feuille — pour que
   * l'écran se contente de lire : un chargement déclenché à l'ouverture ne fait
   * alors aucun rendu en cascade (voir la règle `set-state-in-effect`), et
   * l'actualisation manuelle passe par le même chemin que l'ouverture.
   */
  friends: FriendLists;
  /** Horodatage local du dernier chargement des amis. */
  friendsAt: number | null;
  /** Un chargement des amis est en cours. */
  friendsBusy: boolean;
  /**
   * Le comptoir de l'hôtel des ventes (`market_shelf`) : les doublons des
   * autres joueurs, sans les siens ni les annonces périmées.
   */
  market: MarketListing[];
  /** Horodatage local du dernier chargement du comptoir. */
  marketAt: number | null;
  /** Un chargement du comptoir est en cours. */
  marketBusy: boolean;
  /**
   * Le carnet : ce qui est arrivé au joueur (offres, réponses, amis, ventes),
   * reconstruit à partir des mêmes faits que le serveur garde déjà. Aucune
   * table « notifications » côté serveur : voir `src/lib/social/inbox.ts`.
   */
  inbox: InboxItem[];
  /** Horodatage local du dernier chargement du carnet. */
  inboxAt: number | null;
  /** Nombre de lignes arrivées depuis la dernière visite du carnet. */
  inboxUnread: number;
  /** Un chargement du carnet est en cours. */
  inboxBusy: boolean;
};

/**
 * Résultat d'une demande d'ouverture côté serveur.
 *
 * `drawn` : le serveur a tiré les cartes, elles sont déjà dans la partie
 * locale. `unavailable` : rien n'a été tiré ; `reason` dit quoi corriger —
 * `offline`/`no-session` → se connecter (`offline` = cloud configuré mais
 * réseau injoignable), `no-packs` → attendre la recharge, `not-configured` →
 * build sans cloud, `error` → autre refus du serveur.
 */
export type PackOpenOutcome =
  | { status: "drawn"; cards: DrawnCard[] }
  | {
      status: "unavailable";
      reason: "offline" | "no-session" | "no-packs" | "not-configured" | "error";
      message: string;
    };

/**
 * Résultat d'une action cloud : soit faite, soit refusée avec une explication.
 *
 * `reason` dit quoi corriger — `no-session`/`offline` → se connecter,
 * `not-configured` → build sans cloud, `error` → refus du serveur (message
 * déjà en français).
 */
export type CloudActionOutcome =
  | { status: "done"; message: string }
  /**
   * Une étape reste à faire, mais tout va bien : c'est le cas d'un changement
   * d'adresse qui attend son code par e-mail. Rien n'est perdu, rien n'est en
   * erreur — l'écran doit juste demander le code.
   */
  | { status: "pending"; message: string }
  | {
      status: "unavailable";
      reason: "offline" | "no-session" | "not-configured" | "error";
      message: string;
    };

/**
 * Résultat d'une action d'échange.
 *
 * `done` : le serveur a tranché et l'appareil s'est aligné. `unavailable` :
 * rien n'a bougé ; `reason` dit quoi corriger — `no-session`/`offline` → se
 * connecter, `not-configured` → build sans cloud, `error` → refus du serveur
 * (message déjà en français).
 */
export type TradeOutcome = CloudActionOutcome;

/**
 * Résultat d'un retour de connexion (Twitch). `none` : l'adresse examinée
 * n'était pas un retour de connexion, il n'y a rien à dire.
 */
export type OAuthOutcome = CloudActionOutcome | { status: "none" };

/** Résultat d'une action sur le compte (adresse, mot de passe). */
export type AccountOutcome = CloudActionOutcome;

/** Réponse de la recherche de partenaires (message déjà prêt à afficher). */
export type PlayerSearchOutcome = {
  players: PlayerSearchResult[];
  message: string | null;
  isError: boolean;
  /** Vrai si la recherche a bien été posée (et non refusée faute de compte). */
  asked: boolean;
};

/** Carte proposée au serveur : la rareté est relue au catalogue, jamais envoyée. */
export type TradeOfferCard = { creatorSlug: string; variant: string };

export type CloudDeps = {
  config: () => CloudConfig | null;
  storage: () => KeyValueStorage | null;
  api: (config: CloudConfig, storage: KeyValueStorage | null) => CloudApi;
  readState: () => PlayerState | null;
  applyState: (state: PlayerState) => void;
  now: () => number;
};

/** État neutre : sert aussi de snapshot serveur (pré-rendu statique). */
export const EMPTY_CLOUD_STATE: CloudState = Object.freeze({
  configured: false,
  email: null,
  displayName: null,
  showcase: [],
  userId: null,
  project: null,
  busy: false,
  message: null,
  isError: false,
  pendingEmail: null,
  decision: null,
  remoteUpdatedAt: null,
  lastSyncAt: null,
  pending: false,
  leaderboard: [],
  leaderboardMetric: "unique_creators",
  leaderboardRegion: null,
  profile: null,
  profileBusy: false,
  profileMarket: [],
  trades: [],
  tradesAt: null,
  friends: EMPTY_FRIEND_LISTS,
  friendsAt: null,
  friendsBusy: false,
  market: [],
  marketAt: null,
  marketBusy: false,
  inbox: [],
  inboxAt: null,
  inboxUnread: 0,
  inboxBusy: false,
});

const EMPTY = EMPTY_CLOUD_STATE;

export type CloudStore = ReturnType<typeof createCloudStore>;

export function createCloudStore(deps: CloudDeps) {
  const listeners = new Set<() => void>();
  let state: CloudState = EMPTY;
  let client: CloudApi | null = null;
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let detachPersist: (() => void) | null = null;

  function snapshot(): CloudState {
    return state;
  }

  function publish(patch: Partial<CloudState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  function resolve(): CloudApi | null {
    if (client) return client;
    const config = deps.config();
    if (!config) return null;
    client = deps.api(config, deps.storage());
    return client;
  }

  /** Rafraîchit les champs qui dépendent de la session stockée. */
  function refreshIdentity(): CloudApi | null {
    const api = resolve();
    const config = deps.config();
    const session = api?.session() ?? null;
    if (!api || !config) {
      publish({ configured: false, email: null, userId: null, project: null, message: CLOUD_DISABLED_HINT });
      return null;
    }
    publish({
      configured: true,
      project: config.url.replace(/^https:\/\//, "").split(".")[0] ?? "supabase",
      email: session?.email ?? null,
      userId: session?.userId ?? null,
    });
    return api;
  }

  /**
   * Le joueur connecté, d'après la session. On ne se fie pas au seul état
   * publié : la « dernière visite » du carnet doit être juste même si l'écran
   * n'a pas encore lu le store.
   */
  function currentUserId(): string | null {
    return resolve()?.session()?.userId ?? state.userId;
  }

  /** La date de la dernière visite du carnet, gardée sur l'appareil. */
  function readSeen(userId: string | null): string | null {
    if (!userId) return null;
    try {
      return deps.storage()?.getItem(seenKey(userId)) ?? null;
    } catch {
      return null;
    }
  }

  function fail(error: unknown, fallback: string) {
    const message = error instanceof CloudError ? error.message : error instanceof Error ? error.message : fallback;
    publish({ busy: false, message, isError: true });
  }

  function networkReady(api: CloudApi | null): api is CloudApi {
    if (!api) {
      publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
      return false;
    }
    if (!api.session()) {
      publish({ busy: false, message: "Connecte-toi d'abord avec ton adresse e-mail.", isError: true });
      return false;
    }
    return true;
  }

  async function push(saveVersion: number, deviceUpdatedAt: number, force: boolean): Promise<void> {
    const api = resolve();
    if (!networkReady(api)) return;
    const local = deps.readState();
    if (!local) return;
    publish({ busy: true });
    try {
      const result = await api.pushSave(local, deviceUpdatedAt, saveVersion, force);
      if (result.status === "pushed") {
        publish({
          busy: false,
          pending: false,
          decision: "push",
          remoteUpdatedAt: Date.parse(result.save.updatedAt) || deps.now(),
          lastSyncAt: deps.now(),
          message: "Collection envoyée au cloud.",
          isError: false,
        });
        return;
      }
      if (result.status === "unchanged") {
        publish({
          busy: false,
          pending: false,
          decision: "noop",
          remoteUpdatedAt: Date.parse(result.save.updatedAt) || deps.now(),
          lastSyncAt: deps.now(),
          message: "Cloud déjà à jour.",
          isError: false,
        });
        return;
      }
      if (result.status === "conflict") {
        publish({
          busy: false,
          pending: true,
          decision: "conflict",
          remoteUpdatedAt: Date.parse(result.save.updatedAt) || null,
          message:
            "Le cloud contient une partie plus récente (autre appareil). « Charger le cloud » l'adopte, « Envoyer » l'écrase.",
          isError: false,
        });
        return;
      }
      publish({
        busy: false,
        isError: true,
        message: `Sauvegarde refusée par le serveur : ${result.problems.join(" ; ")}`,
      });
    } catch (error) {
      fail(error, "Envoi impossible.");
    }
  }

  async function pull(): Promise<void> {
    const api = resolve();
    if (!networkReady(api)) return;
    publish({ busy: true });
    try {
      const remote = await api.pullSave();
      if (!remote) {
        publish({ busy: false, message: "Aucune sauvegarde dans le cloud pour ce compte.", isError: false });
        return;
      }
      const parsed = sanitizeState(remote.state, deps.now());
      if (!parsed) {
        publish({ busy: false, message: "Sauvegarde cloud illisible : rien n'a été modifié.", isError: true });
        return;
      }
      deps.applyState(parsed);
      publish({
        busy: false,
        pending: false,
        decision: "pull",
        remoteUpdatedAt: Date.parse(remote.updatedAt) || null,
        lastSyncAt: deps.now(),
        message: `Partie chargée depuis le cloud (${syncStats(parsed).uniqueCreators} créateurs).`,
        isError: false,
      });
    } catch (error) {
      fail(error, "Chargement impossible.");
    }
  }

  // ------------------------------------------------------------- échanges

  /** Nom affiché du catalogue, pour écrire des messages lisibles. */
  function creatorNames(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [slug, creator] of CREATOR_BY_SLUG) map.set(slug, creator.displayName);
    return map;
  }

  function asEngineCards(cards: readonly { creatorSlug: string; variant: string; rarity: string }[]): EngineTradeCard[] {
    return cards.map((card) => ({
      creatorSlug: card.creatorSlug,
      variant: card.variant as CardVariant,
      rarity: card.rarity as Rarity,
    }));
  }

  /**
   * Reconnaît le refus à corriger : pas de compte, réseau injoignable, cloud
   * absent. Les autres erreurs remontent telles quelles (déjà en français).
   */
  function cloudRefusal(
    error: unknown,
    fallback: string,
  ): Extract<CloudActionOutcome, { status: "unavailable" }> {
    if (error instanceof CloudError) {
      if (error.status === 401 || error.status === 403 || error.code === "no_session") {
        return { status: "unavailable", reason: "no-session", message: error.message };
      }
      if (error.status === 0) return { status: "unavailable", reason: "offline", message: error.message };
      return { status: "unavailable", reason: "error", message: error.message };
    }
    const message = error instanceof Error ? error.message : fallback;
    return { status: "unavailable", reason: "error", message };
  }

  /** Refus immédiat quand le cloud n'est pas configuré ou qu'aucun compte n'est connecté. */
  function tradeApi():
    | { api: CloudApi }
    | { refusal: Extract<CloudActionOutcome, { status: "unavailable" }> } {
    const api = resolve();
    if (!api) {
      publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
      return { refusal: { status: "unavailable", reason: "not-configured", message: CLOUD_DISABLED_HINT } };
    }
    if (!api.session()) {
      const message = "Connecte-toi pour échanger des cartes.";
      publish({ busy: false, message, isError: true });
      return { refusal: { status: "unavailable", reason: "no-session", message } };
    }
    return { api };
  }

  /**
   * Relit les offres et applique ce que le serveur a déjà tranché.
   *
   * Sert après chaque action, et à l'ouverture de l'écran. Les échanges
   * acceptés pendant que cet appareil était ailleurs entrent dans la partie
   * locale sans passer par un « Charger le cloud » manuel.
   */
  async function refreshTrades(
    api: CloudApi,
    prefix = "",
  ): Promise<{ list: TradeListItem[]; applied: number; blocked: number }> {
    const list = await api.listTrades();
    const local = deps.readState();
    let applied = 0;
    let blocked = 0;
    if (local) {
      const result = applyAcceptedTrades(local, list, deps.now());
      applied = result.applied;
      blocked = result.blocked.length;
      if (applied > 0) {
        deps.applyState(result.state);
        await push(result.state.version, result.state.updatedAt, true);
      }
    }
    publish({ trades: list, tradesAt: deps.now(), busy: false });
    if (blocked > 0) {
      publish({
        message: `${prefix}Un échange accepté doit être chargé depuis le cloud : une carte de cette partie a changé d'appareil (Compte → « Charger le cloud »).`,
        isError: true,
      });
    } else if (applied > 0) {
      publish({ message: `${prefix}${applied} échange${applied > 1 ? "s" : ""} accepté${applied > 1 ? "s" : ""} appliqué${applied > 1 ? "s" : ""} à ta collection.`, isError: false });
    }
    return { list, applied, blocked };
  }

  /**
   * À la connexion (mot de passe ou code à 6 chiffres uniquement — jamais au
   * simple retour dans l'app) : adopter la collection du cloud si cette partie
   * n'a jamais servi.
   *
   * C'est le cas d'un nouveau téléphone : la partie locale est vierge (aucune
   * carte, aucune ouverture — les points et sabliers d'accueil ne sont pas une
   * progression) et le compte a déjà une collection. Rien ne peut être perdu —
   * une partie vierge ne contient rien — donc on la remplace sans demander,
   * sinon le premier envoi écraserait la collection du joueur. Dès que la
   * partie locale a la moindre carte ou la moindre ouverture, on ne touche à
   * rien : le joueur choisit (règle « jamais de perte silencieuse »).
   *
   * Renvoie le nombre de cartes adoptées (0 si rien n'a été fait).
   */
  async function adoptCloudIfEmpty(): Promise<number> {
    const api = resolve();
    const local = deps.readState();
    if (!api?.session() || !local) return 0;
    if (local.cards.length > 0 || local.openings > 0) return 0;
    try {
      const remote = await api.pullSave();
      if (!remote) return 0;
      const parsed = sanitizeState(remote.state, deps.now());
      if (!parsed || parsed.cards.length === 0) return 0;
      deps.applyState(parsed);
      publish({
        decision: "pull",
        pending: false,
        remoteUpdatedAt: Date.parse(remote.updatedAt) || null,
        lastSyncAt: deps.now(),
      });
      return parsed.cards.length;
    } catch {
      // Hors ligne : la connexion vient de réussir, inutile d'alarmer.
      return 0;
    }
  }

  /** Phrase commune : ce qui a été récupéré du cloud, ou la consigne d'envoi. */
  function connectedMessage(adopted: number): string {
    if (adopted > 0) {
      return `Compte connecté : ${adopted} carte${adopted > 1 ? "s" : ""} récupérée${adopted > 1 ? "s" : ""} depuis le cloud.`;
    }
    return "Compte connecté. Ta collection locale reste la référence : envoie-la quand tu veux.";
  }

  /**
   * Lit la réserve côté serveur (`pack_status()`) et l'adopte dans la partie
   * locale : compteur et compte à rebours affichés sont ceux du serveur, sans
   * rien consommer. Silencieux en cas d'échec (hors ligne, pas de compte) :
   * l'appelant garde alors son calcul local.
   */
  async function fetchPackStatus(): Promise<{ packs: number; nextPackAt: string | null } | null> {
    const api = resolve();
    if (!api?.session()) return null;
    try {
      const status = await api.packStatus();
      const local = deps.readState();
      if (local) {
        const adopted = applyPackStatus(local, status.packs, status.lastRegenAt, deps.now());
        if (adopted !== local) deps.applyState(adopted);
      }
      return { packs: status.packs, nextPackAt: status.nextPackAt };
    } catch {
      // Sans réseau ou erreur : le client retombe sur le calcul local.
      return null;
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) refreshIdentity();
      return () => listeners.delete(listener);
    },
    getSnapshot: snapshot,
    getServerSnapshot: () => EMPTY_CLOUD_STATE,

    /** Branche la synchronisation automatique sur les écritures de la partie. */
    attach() {
      if (detachPersist) return detachPersist;
      detachPersist = onPersist(() => {
        if (!state.configured || !state.userId) return;
        publish({ pending: true });
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
          pushTimer = null;
          const local = deps.readState();
          if (!local) return;
          void push(local.version, local.updatedAt, false);
        }, AUTO_PUSH_DEBOUNCE_MS);
      });
      return () => {
        detachPersist?.();
        detachPersist = null;
      };
    },

    async requestCode(email: string): Promise<void> {
      const api = resolve();
      if (!api) {
        publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return;
      }
      publish({ busy: true, message: null, isError: false });
      try {
        await api.requestOtp(email);
        publish({ busy: false, message: "Code envoyé : regarde ta boîte e-mail (et les indésirables).", isError: false });
      } catch (error) {
        fail(error, "Envoi du code impossible.");
      }
    },

    async verifyCode(email: string, token: string): Promise<boolean> {
      const api = resolve();
      if (!api) {
        publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.verifyOtp(email, token.trim());
        const adopted = await adoptCloudIfEmpty();
        publish({
          busy: false,
          email: session.email,
          displayName: null,
          showcase: [],
          userId: session.userId,
          message: connectedMessage(adopted),
          isError: false,
        });
        return true;
      } catch (error) {
        fail(error, "Code refusé.");
        return false;
      }
    },

    /** Crée un compte invité (sans e-mail) et s'y connecte immédiatement. */
    async signInAsGuest(): Promise<boolean> {
      const api = resolve();
      if (!api) {
        publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.signInAnonymously();
        publish({
          busy: false,
          email: session.email,
          displayName: null,
          showcase: [],
          userId: session.userId,
          message: "Compte invité créé. Donne-toi un nom, puis envoie ta collection.",
          isError: false,
        });
        return true;
      } catch (error) {
        fail(error, "Création du compte invité impossible.");
        return false;
      }
    },

    /**
     * Connexion par adresse e-mail et mot de passe.
     *
     * Le chemin qui ne dépend d'aucun envoi d'e-mail : c'est ce qui permet de
     * retrouver une collection sur un autre appareil sans SMTP, pour peu qu'un
     * mot de passe ait été attaché au compte (voir `keepAccount`).
     */
    async signInWithPassword(email: string, password: string): Promise<boolean> {
      const api = resolve();
      if (!api) {
        publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      const address = email.trim();
      const problem = emailProblem(address) ?? passwordProblem(password);
      if (problem) {
        publish({ busy: false, message: problem, isError: true });
        return false;
      }
      publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.signInWithPassword(address, password);
        const adopted = await adoptCloudIfEmpty();
        publish({
          busy: false,
          email: session.email,
          displayName: null,
          showcase: [],
          userId: session.userId,
          message: connectedMessage(adopted),
          isError: false,
        });
        return true;
      } catch (error) {
        fail(error, "Connexion impossible.");
        return false;
      }
    },

    /**
     * Garde le compte : attache une adresse, un mot de passe, ou les deux.
     *
     * Deux chemins, selon ce que le joueur choisit :
     *
     *  * **adresse + mot de passe** — le mot de passe n'envoie aucun e-mail,
     *    donc **aucun SMTP n'est nécessaire** : l'adresse est appliquée tout de
     *    suite et le compte est récupérable ailleurs par adresse + mot de passe ;
     *  * **adresse seule** — Supabase envoie un code à 6 chiffres (SMTP requis)
     *    et l'adresse reste *en attente* jusqu'à ce que le code soit saisi ici
     *    (`confirmEmailCode`).
     *
     * Un compte invité ne peut pas recevoir un mot de passe **sans** adresse :
     * GoTrue le refuse, et l'écran demande donc l'adresse en premier.
     */
    async keepAccount(update: { email?: string; password?: string }): Promise<AccountOutcome> {
      const api = resolve();
      const wanted = update.email?.trim() ?? "";
      const password = update.password ?? "";
      if (!api) {
        publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
        return { status: "unavailable", reason: "not-configured", message: CLOUD_DISABLED_HINT };
      }
      if (!api.session()) {
        const message = "Connecte-toi d'abord (compte invité) pour garder ce compte.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "no-session", message };
      }
      if (!wanted && !password) {
        const message = "Indique au moins une adresse : un compte invité ne peut pas recevoir un mot de passe sans adresse.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      if (!wanted && !state.email) {
        const message = "Un compte invité a besoin d'une adresse : c'est elle qui permet de te reconnecter ailleurs.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      const problem = (wanted ? emailProblem(wanted) : null) ?? (password ? passwordProblem(password) : null);
      if (problem) {
        publish({ busy: false, message: problem, isError: true });
        return { status: "unavailable", reason: "error", message: problem };
      }

      publish({ busy: true, message: null, isError: false });
      try {
        const result = await api.updateAccount({ ...(wanted ? { email: wanted } : {}), ...(password ? { password } : {}) });
        if (!result.applied) {
          const pending = result.pendingEmail ?? wanted;
          const message = `Un code à 6 chiffres part vers ${pending}. Saisis-le ici pour valider l'adresse. Si rien n'arrive, c'est que le projet n'a pas de SMTP : ajoute un mot de passe (il ne demande aucun envoi), ou désactive « Confirm email » (Authentication → Sign In / Providers → Email) pour que l'adresse soit enregistrée tout de suite.`;
          publish({ busy: false, pendingEmail: pending, message, isError: false });
          return { status: "pending", message };
        }
        const address = result.email ?? wanted;
        const message = password && wanted
          ? `Adresse ${address} attachée, avec un mot de passe. Sur un autre appareil : « Se connecter avec un e-mail et un mot de passe », puis « Charger le cloud ».`
          : password
            ? "Mot de passe enregistré. Sur un autre appareil, connecte-toi avec ton adresse et ce mot de passe."
            : `Adresse ${address} attachée. Sur un autre appareil : « Recevoir un code par e-mail », puis « Charger le cloud ».`;
        publish({ busy: false, email: address ?? state.email, pendingEmail: null, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Enregistrement impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Termine un changement d'adresse avec le code à 6 chiffres reçu par
     * e-mail. C'est la seule fin possible depuis l'app : un lien de
     * confirmation renvoie vers une page web, et il n'y a pas de serveur pour
     * la recevoir.
     */
    async confirmEmailCode(code: string): Promise<AccountOutcome> {
      const api = resolve();
      const pending = state.pendingEmail;
      if (!api) {
        publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
        return { status: "unavailable", reason: "not-configured", message: CLOUD_DISABLED_HINT };
      }
      if (!api.session()) {
        const message = "Session perdue : reconnecte-toi pour valider l'adresse.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "no-session", message };
      }
      if (!pending) {
        const message = "Aucune adresse n'attend de confirmation.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      const token = code.replace(/\s/g, "");
      if (!/^\d{6}$/.test(token)) {
        const message = "Le code fait 6 chiffres.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.verifyEmailChange(pending, token);
        const message = `Adresse ${session.email ?? pending} confirmée. Sur un autre appareil : « Recevoir un code par e-mail », puis « Charger le cloud ».`;
        publish({ busy: false, email: session.email ?? pending, pendingEmail: null, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Code refusé.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** Redemande un code pour l'adresse en attente (le précédent a expiré). */
    async resendEmailCode(): Promise<AccountOutcome> {
      const api = resolve();
      const pending = state.pendingEmail;
      if (!networkReady(api)) {
        return { status: "unavailable", reason: "offline", message: "Réseau injoignable." };
      }
      if (!pending) {
        const message = "Aucune adresse n'attend de confirmation.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      publish({ busy: true, message: null, isError: false });
      try {
        await api.resendEmailChange(pending);
        const message = `Nouveau code envoyé à ${pending}.`;
        publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Renvoi impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** Renomme le joueur dans le classement (2 à 24 caractères). */
    async rename(displayName: string): Promise<boolean> {
      const api = resolve();
      if (!networkReady(api)) return false;
      const local = deps.readState();
      const userId = api.session()?.userId;
      if (!local || !userId) return false;
      const name = displayName.trim();
      if (name.length < 2 || name.length > 24) {
        publish({ busy: false, message: "Le nom doit faire entre 2 et 24 caractères.", isError: true });
        return false;
      }
      publish({ busy: true });
      try {
        await api.updateDisplayName(userId, name);
        publish({ busy: false, displayName: name, message: `Nom du classement mis à jour : ${name}.`, isError: false });
        return true;
      } catch (error) {
        fail(error, "Changement de nom impossible.");
        return false;
      }
    },

    /**
     * Épingle jusqu'à 4 cartes de sa collection sur son profil public.
     *
     * Le serveur vérifie la possession : si une carte n'est pas dans la
     * sauvegarde poussée, il refuse et on affiche son message tel quel. En
     * local, on nettoie la liste et on borne à `MAX_SHOWCASE` avant d'appeler.
     */
    async setShowcase(slugs: readonly string[]): Promise<boolean> {
      const api = resolve();
      if (!networkReady(api)) return false;
      const clean = normalizeShowcase(slugs);
      if (slugs.length > MAX_SHOWCASE) {
        publish({ busy: false, message: `Une vitrine affiche ${MAX_SHOWCASE} cartes au maximum.`, isError: true });
        return false;
      }
      publish({ busy: true });
      try {
        const saved = await api.setShowcase(clean);
        publish({
          busy: false,
          showcase: normalizeShowcase(saved.length ? saved : clean),
          message: clean.length
            ? `Vitrine mise à jour (${clean.length} carte${clean.length > 1 ? "s" : ""}).`
            : "Vitrine vidée.",
          isError: false,
        });
        return true;
      } catch (error) {
        fail(error, "Mise à jour de la vitrine impossible.");
        return false;
      }
    },

    /**
     * Teste la joignabilité du projet Supabase (lecture pure) et l'annonce.
     *
     * Sur un appareil, « Réseau injoignable » peut venir du réseau, de
     * l'adresse configurée ou d'un refus du WebView : ce bouton dit lequel,
     * avec le nom d'hôte — sans avoir à brancher un ordinateur.
     */
    async ping(): Promise<boolean> {
      const api = resolve();
      if (!api) {
        publish({ busy: false, message: CLOUD_DISABLED_HINT, isError: true });
        return false;
      }
      publish({ busy: true, message: null, isError: false });
      try {
        const { host } = await api.ping();
        publish({
          busy: false,
          message: `Projet ${host} joignable : le réseau et la clé répondent.`,
          isError: false,
        });
        return true;
      } catch (error) {
        fail(error, "Projet injoignable.");
        return false;
      }
    },

    /**
     * Ouvre un booster côté serveur : les cartes sont tirées par la fonction
     * `open_pack()` de Supabase, puis appliquées à la partie locale.
     *
     * Après le tirage, la sauvegarde est poussée immédiatement (pas d'attente
     * des ~20 s du debounce) : les cartes sont infalsifiables, il faut les
     * inscrire dans le cloud sans délai.
     *
     * Pas de repli silencieux : si le cloud est configuré mais injoignable (ou
     * sans compte), on ne tire rien en local — l'écran explique qu'il faut se
     * connecter.
     */
    async openPack(): Promise<PackOpenOutcome> {
      const api = resolve();
      if (!api) {
        const message = CLOUD_DISABLED_HINT;
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "not-configured", message };
      }
      if (!api.session()) {
        const message = "Connecte-toi pour ouvrir un booster.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "no-session", message };
      }
      publish({ busy: true });
      try {
        const result = await api.openPack();
        const cards = result.cards.map((card) => ({
          creatorSlug: card.creatorSlug,
          rarity: card.rarity as "common" | "uncommon" | "rare" | "epic" | "legendary",
          variant: card.variant as "standard" | "live" | "holo" | "gold",
          rareDrop: card.rareDrop,
        }));
        const local = deps.readState();
        if (!local) {
          throw new CloudError("Partie locale illisible : rien n'a été tiré.", "invalid_response", 0);
        }
        const applied = applyPackResult(
          local,
          cards,
          result.packs,
          result.lastRegenAt,
          result.openings,
          deps.now(),
        );
        // Les cartes du serveur entrent dans la partie locale, puis la
        // sauvegarde est poussée immédiatement : pas d'attente des ~20 s du
        // debounce, les cartes infalsifiables doivent être inscrites sans délai.
        deps.applyState(applied.state);
        await push(applied.state.version, applied.state.updatedAt, true);
        publish({
          busy: false,
          message: `Booster ouvert : ${applied.cards.length} carte${applied.cards.length > 1 ? "s" : ""} reçue${applied.cards.length > 1 ? "s" : ""}.`,
          isError: false,
        });
        return { status: "drawn", cards: applied.cards };
      } catch (error) {
        // Réseau coupé : même consigne que sans compte — se connecter.
        if (error instanceof CloudError && error.status === 0) {
          const message = "Connecte-toi pour ouvrir un booster.";
          publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "offline", message };
        }
        // Le serveur a refusé faute de booster : on relit la réserve pour
        // réaligner le compteur et le compte à rebours affichés (sans rien
        // consommer) avant d'expliquer.
        if (error instanceof CloudError && /aucun booster/i.test(error.message)) {
          await fetchPackStatus();
          publish({ busy: false, message: error.message, isError: true });
          return { status: "unavailable", reason: "no-packs", message: error.message };
        }
        const message = error instanceof CloudError ? error.message : "Ouverture du booster impossible.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
    },

    /**
     * Statut de la réserve de boosters, calculé par le serveur.
     *
     * Le client l'appelle à la connexion pour afficher le bon compteur sans
     * dépendre de l'horloge locale. La réserve renvoyée est adoptée par la
     * partie locale (`applyPackStatus`) : la recharge passive repart de la
     * même ancre que le serveur.
     */
    /**
     * Cherche un partenaire par son pseudo (2 caractères minimum).
     *
     * Ne renvoie que pseudo, niveau et nombre de créateurs uniques : les
     * collections des autres joueurs restent privées. Le message est déjà prêt
     * à afficher, y compris quand il n'y a aucun résultat.
     */
    async searchPlayers(query: string): Promise<PlayerSearchOutcome> {
      const ready = tradeApi();
      if ("refusal" in ready) {
        return { players: [], message: ready.refusal.message, isError: true, asked: false };
      }
      try {
        const players = await ready.api.searchPlayers(query);
        return {
          players,
          message: players.length ? null : "Aucun joueur ne correspond à ce pseudo.",
          isError: false,
          asked: true,
        };
      } catch (error) {
        const refusal = cloudRefusal(error, "Recherche impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return { players: [], message: refusal.message, isError: true, asked: true };
      }
    },

    /**
     * Variantes que le partenaire possède pour un créateur.
     *
     * Appel ciblé, silencieux à l'échelle du store : l'interface s'en sert pour
     * n'afficher que des cartes réellement disponibles.
     */
    async playerVariants(userId: string, slug: string): Promise<{ variants: string[]; message: string | null }> {
      const ready = tradeApi();
      if ("refusal" in ready) return { variants: [], message: ready.refusal.message };
      try {
        return { variants: await ready.api.playerVariants(userId, slug), message: null };
      } catch (error) {
        return { variants: [], message: cloudRefusal(error, "Lecture des variantes impossible.").message };
      }
    },

    /**
     * Relit les offres d'échange.
     *
     * C'est aussi le moment où les échanges acceptés pendant que cet appareil
     * était ailleurs entrent dans la partie locale : le serveur les a déjà
     * écrits, l'appareil s'aligne (voir `applyAcceptedTrades`).
     */
    async loadTrades(): Promise<void> {
      const ready = tradeApi();
      if ("refusal" in ready) return;
      publish({ busy: true });
      try {
        const { applied, blocked } = await refreshTrades(ready.api);
        const open = state.trades.filter((trade) => trade.status === "open");
        // Un échange appliqué (ou bloqué) a déjà son message : on ne l'écrase
        // pas avec le simple compte des offres en attente.
        if (applied === 0 && blocked === 0) {
          publish({
            message: open.length
              ? `${open.length} offre${open.length > 1 ? "s" : ""} en attente dans l'onglet Échanges.`
              : "Aucune offre en attente.",
            isError: false,
          });
        }
      } catch (error) {
        fail(error, "Chargement des échanges impossible.");
      }
    },

    /**
     * Propose un échange : `given` contre `wanted`.
     *
     * Deux précautions avant d'envoyer l'offre :
     *   1. la partie locale est poussée d'abord — le serveur vérifie les cartes
     *      offertes sur la **sauvegarde cloud**, jamais sur une liste envoyée
     *      par le client ;
     *   2. si le cloud est plus récent (autre appareil, échange accepté), on
     *      n'écrase rien : le joueur synchronise et recommence.
     */
    async proposeTrade(
      recipientId: string,
      given: readonly TradeOfferCard[],
      wanted: readonly TradeOfferCard[],
    ): Promise<TradeOutcome> {
      const ready = tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = deps.readState();
      if (!local) {
        const message = "Partie locale illisible : rien n'a été proposé.";
        publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      publish({ busy: true });
      try {
        await push(local.version, local.updatedAt, false);
        if (state.pending) {
          const message =
            "Ta collection doit d'abord être envoyée au cloud (Compte → Synchroniser) : sans elle, le serveur ne peut pas vérifier tes cartes.";
          publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "error", message };
        }
        const result = await ready.api.createTrade(recipientId, [...given], [...wanted]);
        const names = creatorNames();
        await refreshTrades(ready.api);
        const warning = result.recipientMissing
          ? ` Attention : ce joueur ne possède plus ${describeCards([result.recipientMissing], names)} — l'offre restera probablement sans réponse.`
          : "";
        const message = `Offre envoyée : ${describeCards(result.trade.proposerCards, names)} contre ${describeCards(result.trade.recipientCards, names)}.${warning}`;
        publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Proposition impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Répond à une offre reçue.
     *
     * Accepter fait déplacer les cartes des **deux** côtés par le serveur, puis
     * l'appareil applique le même mouvement à sa partie locale et la pousse :
     * le classeur et le cloud restent d'accord.
     */
    async respondTrade(tradeId: number, accept: boolean): Promise<TradeOutcome> {
      const ready = tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = deps.readState();
      publish({ busy: true });
      try {
        if (accept && local) {
          // Le serveur retire les cartes de la collection **du cloud** : on
          // envoie d'abord la partie locale, sinon il retirerait une carte que
          // cet appareil n'a pas (ou l'inverse) et le troc ne pourrait pas
          // s'appliquer ici. Refus explicite plutôt qu'application bancale.
          await push(local.version, local.updatedAt, false);
          if (state.pending) {
            const message =
              "Synchronise d'abord ta collection (Compte → Synchroniser) : l'échange a besoin de la collection du cloud à jour.";
            publish({ busy: false, message, isError: true });
            return { status: "unavailable", reason: "error", message };
          }
        }
        const result = await ready.api.respondTrade(tradeId, accept);
        const names = creatorNames();
        if (!accept) {
          await refreshTrades(ready.api);
          const message = "Offre refusée : aucune carte n'a bougé.";
          publish({ busy: false, message, isError: false });
          return { status: "done", message };
        }

        if (local) {
          let next: PlayerState;
          try {
            next = applyTradeResult(
              local,
              {
                tradeId,
                given: asEngineCards(result.given),
                received: asEngineCards(result.received),
              },
              deps.now(),
            );
          } catch {
            await refreshTrades(ready.api).catch(() => undefined);
            const message =
              "Échange accepté côté serveur, mais cette partie ne contient plus la carte donnée : « Charger le cloud » (Compte) reprend la collection à jour.";
            publish({ busy: false, message, isError: true });
            return { status: "unavailable", reason: "error", message };
          }
          if (next !== local) {
            deps.applyState(next);
            await push(next.version, next.updatedAt, true);
          }
        }
        await refreshTrades(ready.api);
        const message = `Échange accepté : ${describeCards(result.received, names)} reçu${result.received.length > 1 ? "s" : ""}, ${describeCards(result.given, names)} donné${result.given.length > 1 ? "s" : ""}.`;
        publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Réponse impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** Retire une offre encore en attente (seul le proposeur peut l'annuler). */
    async cancelTrade(tradeId: number): Promise<TradeOutcome> {
      const ready = tradeApi();
      if ("refusal" in ready) return ready.refusal;
      publish({ busy: true });
      try {
        await ready.api.cancelTrade(tradeId);
        await refreshTrades(ready.api);
        const message = "Offre annulée : tes cartes restent dans ta collection.";
        publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Annulation impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    packStatus: fetchPackStatus,

    async signOut(): Promise<void> {
      const api = resolve();
      publish({ busy: true });
      try {
        await api?.signOut();
      } catch {
        // La déconnexion locale suffit.
      }
      publish({
        busy: false,
        email: null,
        displayName: null,
        showcase: [],
        userId: null,
        pendingEmail: null,
        pending: false,
        decision: null,
        remoteUpdatedAt: null,
        leaderboard: [],
        leaderboardMetric: "unique_creators",
        leaderboardRegion: null,
        profile: null,
        profileBusy: false,
        profileMarket: [],
        friends: EMPTY_FRIEND_LISTS,
        friendsAt: null,
        friendsBusy: false,
        market: [],
        marketAt: null,
        marketBusy: false,
        inbox: [],
        inboxAt: null,
        inboxUnread: 0,
        inboxBusy: false,
        message: "Déconnecté. La partie continue en local, exactement comme avant.",
        isError: false,
      });
    },

    /** Synchronisation : `auto` respecte le plus récent, `push`/`pull` forcent. */
    async sync(mode: "auto" | "push" | "pull" = "auto"): Promise<void> {
      const local = deps.readState();
      if (!local) return;
      if (mode === "push") return push(local.version, local.updatedAt, true);
      if (mode === "pull") return pull();

      const api = resolve();
      if (!networkReady(api)) return;
      publish({ busy: true });
      try {
        const remote = await api.pullSave();
        const decision = decideSync(
          { state: local, updatedAt: local.updatedAt },
          remote
            ? { state: sanitizeState(remote.state, deps.now()) ?? local, deviceUpdatedAt: remote.deviceUpdatedAt }
            : null,
        );
        publish({ busy: false, remoteUpdatedAt: remote ? Date.parse(remote.updatedAt) || null : null });
        if (decision.action === "push") return push(local.version, local.updatedAt, false);
        if (decision.action === "pull") {
          publish({
            decision: "pull",
            message: "Le cloud est plus récent : ouvre « Charger le cloud » pour récupérer cette partie.",
            isError: false,
          });
          return;
        }
        if (decision.action === "noop") {
          publish({ decision: "noop", pending: false, lastSyncAt: deps.now(), message: decision.reason, isError: false });
          return;
        }
        publish({ decision: "conflict", pending: true, message: decision.reason, isError: false });
      } catch (error) {
        fail(error, "Synchronisation impossible.");
      }
    },

    /** Récupère le nom affiché (et la vitrine) pour préremplir l'écran. */
    async loadProfile(): Promise<void> {
      const api = resolve();
      const userId = api?.session()?.userId;
      if (!api || !userId) return;
      try {
        const profile = await api.profile(userId);
        if (profile) {
          publish({
            displayName: profile.displayName,
            showcase: normalizeShowcase(profile.showcaseSlugs),
          });
        }
      } catch {
        // Sans réseau, on garde le dernier nom connu.
      }
    },

    /**
     * Ouvre la fiche publique d'un joueur. Le serveur renvoie des compteurs et
     * la vitrine, jamais sa collection — et `null` s'il n'a jamais envoyé sa
     * partie, ce que l'écran dit simplement.
     */
    async openProfile(userId: string): Promise<void> {
      const api = resolve();
      if (!api) {
        publish({ profileBusy: false, profile: null, message: CLOUD_DISABLED_HINT, isError: true });
        return;
      }
      if (!networkReady(api)) return;
      publish({ profileBusy: true, profile: null, profileMarket: [], message: null, isError: false });
      try {
        // La fiche et sa vitrine partent ensemble : la section « En vente »
        // s'affiche en même temps que le reste, jamais après coup.
        const [profile, profileMarket] = await Promise.all([
          api.playerProfile(userId),
          api.marketListingsOf(userId).catch(() => [] as MarketListing[]),
        ]);
        if (!profile) {
          publish({
            profileBusy: false,
            profile: null,
            message: "Ce joueur n'a pas encore envoyé sa collection au cloud.",
            isError: true,
          });
          return;
        }
        publish({ profileBusy: false, profile, profileMarket, message: null, isError: false });
      } catch (error) {
        const refusal = cloudRefusal(error, "Profil indisponible.");
        publish({ profileBusy: false, profile: null, message: refusal.message, isError: true });
      }
    },

    /** Ferme la fiche publique. */
    closeProfile(): void {
      publish({ profile: null, profileBusy: false, profileMarket: [] });
    },

    async loadLeaderboard(
      metric: LeaderboardMetric = state.leaderboardMetric,
      region: string | null = state.leaderboardRegion,
    ): Promise<void> {
      const api = resolve();
      if (!networkReady(api)) return;
      publish({ busy: true, leaderboardMetric: metric, leaderboardRegion: region });
      try {
        const rows = await api.leaderboard(20, metric, region);
        publish({ busy: false, leaderboard: rows, message: null, isError: false });
      } catch (error) {
        fail(error, "Classement indisponible.");
      }
    },
    // ------------------------------------------------------------ Notifications
    //
    // Le carnet ne lit rien de nouveau côté serveur : il relit ce que le joueur
    // a déjà le droit de voir (ses offres, ses amis, ses ventes) et le met en
    // français. La « dernière visite » vit sur l'appareil, par joueur.

    /**
     * Recharge le carnet et recompte les nouveautés.
     *
     * Les quatre sources partent ensemble ; une source en échec (la fonction
     * des ventes pas encore collée, par exemple) ne vide pas le reste : le
     * carnet est fait pour être utile, pas pour tomber entier.
     */
    async loadInbox(): Promise<void> {
      const ready = tradeApi();
      if ("refusal" in ready) return;
      const userId = currentUserId();
      publish({ inboxBusy: true });
      try {
        const [trades, incoming, friends, sales] = await Promise.all([
          ready.api.listTrades().catch(() => []),
          ready.api.listIncomingFriendRequests().catch(() => []),
          ready.api.listFriends().catch(() => []),
          ready.api.marketSales().catch(() => []),
        ]);
        const items = buildInbox({
          trades,
          friends: { friends, incoming, outgoing: [] },
          sales,
        });
        publish({ inbox: items, inboxUnread: unreadCount(items, readSeen(userId)), inboxAt: deps.now(), inboxBusy: false });
      } catch (error) {
        publish({ inboxBusy: false });
        fail(error, "Carnet indisponible.");
      }
    },

    /**
     * Marque le carnet comme lu **à l'instant où le joueur l'ouvre** : la
     * pastille disparaît, les lignes restent (on ne perd pas l'historique).
     */
    markInboxSeen(): void {
      const userId = currentUserId();
      if (!userId) return;
      const at = new Date(deps.now()).toISOString();
      try {
        deps.storage()?.setItem(seenKey(userId), at);
      } catch {
        // Stockage refusé : la pastille reviendra, rien de grave.
      }
      publish({ inboxUnread: 0 });
    },

    /** Le carnet, remis à zéro (déconnexion ou changement de compte). */
    clearInbox(): void {
      publish({ inbox: [], inboxAt: null, inboxUnread: 0, inboxBusy: false });
    },

    // ---------------------------------------------------------------- Twitch
    //
    // La connexion Twitch est un aller-retour par le navigateur : le store ne
    // navigue pas (il ne connaît ni `window` ni le DOM, c'est ce qui le rend
    // testable) — il **donne l'adresse à ouvrir** et **termine** au retour.
    // L'écran, lui, ouvre la porte.

    /**
     * L'adresse à ouvrir pour se connecter avec Twitch, ou `null` si ce build
     * n'a pas de cloud configuré.
     */
    twitchSignInUrl(redirectTo: string): string | null {
      const api = resolve();
      if (!api) {
        publish({ message: CLOUD_DISABLED_HINT, isError: true });
        return null;
      }
      return api.twitchAuthorizeUrl(redirectTo);
    },

    /**
     * Termine une connexion Twitch à partir de l'adresse de retour.
     *
     * Le fragment contient les jetons : on les échange contre l'identité du
     * compte, on enregistre la session, on relit le nom affiché — la connexion
     * devient indiscernable d'un compte invité, avec sa collection déjà en
     * place si le compte Twitch en avait une.
     */
    async completeTwitchSignIn(url: string): Promise<OAuthOutcome> {
      const returned = parseOAuthReturn(url);
      if (returned.status === "none") return { status: "none" };
      const api = resolve();
      if (!api) {
        const refusal: CloudActionOutcome = {
          status: "unavailable",
          reason: "not-configured",
          message: CLOUD_DISABLED_HINT,
        };
        publish({ message: refusal.message, isError: true });
        return refusal;
      }
      if (returned.status === "error") {
        const message = `Twitch n'a pas donné son accord : ${returned.message}`;
        publish({ message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      publish({ busy: true, message: null, isError: false });
      try {
        const session = await api.adoptSession({
          accessToken: returned.accessToken,
          refreshToken: returned.refreshToken,
          expiresIn: returned.expiresIn,
        });
        refreshIdentity();
        await this.loadProfile();
        const message = session.email
          ? `Connecté avec Twitch (${session.email}). Ta collection locale reste celle de cet appareil.`
          : "Connecté avec Twitch. Ta collection locale reste celle de cet appareil.";
        publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Connexion Twitch impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    // --------------------------------------------------- Hôtel des ventes
    //
    // Même règle que le reste : le serveur décide et écrit, l'appareil rejoue
    // le même changement sur la partie locale puis la pousse. Un dépôt, comme
    // un achat, est donc **déjà fait** quand l'écran affiche « c'est vendu » :
    // si la poussée échoue, la sauvegarde du cloud reste la bonne.

    /** Charge le comptoir et le publie dans l'état cloud. */
    async loadMarket(): Promise<void> {
      const ready = tradeApi();
      if ("refusal" in ready) return;
      publish({ marketBusy: true });
      try {
        const market = await ready.api.marketShelf();
        publish({ market, marketAt: deps.now(), marketBusy: false });
      } catch (error) {
        publish({ marketBusy: false });
        fail(error, "Hôtel des ventes indisponible.");
      }
    },

    /**
     * Dépose un doublon à l'hôtel. Le serveur vérifie, retire la carte de la
     * collection du cloud et paie les points ; l'appareil applique le même
     * changement ici, puis pousse.
     *
     * La partie locale est envoyée **avant**, comme pour un échange accepté :
     * le serveur doit voir la carte dans la collection qu'il retire.
     */
    async sellCard(cardId: string): Promise<CloudActionOutcome> {
      const ready = tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = deps.readState();
      if (!local) {
        const message = "Aucune partie à vendre pour l'instant : ouvre un booster d'abord.";
        publish({ message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      publish({ busy: true });
      try {
        await push(local.version, local.updatedAt, false);
        if (state.pending) {
          const message =
            "Synchronise d'abord ta collection (Compte → Synchroniser) : l'hôtel a besoin de la collection du cloud à jour.";
          publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "error", message };
        }
        const result = await ready.api.marketSell(cardId);
        const next = applyMarketSale(local, { cardId, payout: result.payout }, deps.now());
        deps.applyState(next);
        await push(next.version, next.updatedAt, true);
        await this.loadMarket();
        const name = CREATOR_BY_SLUG.get(result.listing.creatorSlug)?.displayName ?? "Ta carte";
        const message = `${name} déposé à l'hôtel : +${result.payout} points, il est au comptoir.`;
        publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Dépôt impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Achète une carte au comptoir. Le serveur débite les points, écrit la
     * carte dans la sauvegarde du cloud et referme l'annonce ; l'appareil
     * ajoute la même carte ici (avec sa marque `fromMarket`) puis pousse.
     */
    async buyCard(listingId: number): Promise<CloudActionOutcome> {
      const ready = tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = deps.readState();
      if (!local) {
        const message = "Aucune partie à créditer pour l'instant.";
        publish({ message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      publish({ busy: true });
      try {
        await push(local.version, local.updatedAt, false);
        if (state.pending) {
          const message =
            "Synchronise d'abord ta collection (Compte → Synchroniser) : l'hôtel a besoin de la collection du cloud à jour.";
          publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "error", message };
        }
        const result = await ready.api.marketBuy(listingId);
        const card: OwnedCard = {
          id: result.card.id,
          creatorSlug: result.card.creatorSlug,
          rarity: result.card.rarity as OwnedCard["rarity"],
          variant: result.card.variant as OwnedCard["variant"],
          obtainedAt: result.card.obtainedAt,
          rareDrop: result.card.rareDrop,
          fromMarket: result.card.fromMarket,
        };
        const next = applyMarketPurchase(local, { card, price: result.price }, deps.now());
        if (next !== local) {
          deps.applyState(next);
          await push(next.version, next.updatedAt, true);
        }
        await this.loadMarket();
        const name = CREATOR_BY_SLUG.get(result.card.creatorSlug)?.displayName ?? "Carte";
        const message = `${name} rejoint ton classeur pour ${result.price} points.`;
        publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = cloudRefusal(error, "Achat impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** L'écran de l'hôtel, réinitialisé (déconnexion ou changement de compte). */
    clearMarket(): void {
      publish({ market: [], marketAt: null, marketBusy: false });
    },

    // ---------------------------------------------------------------- Amis
    //
    // Même refus que les échanges : pas de cloud configuré ou pas de compte →
    // on le dit, on ne tente pas un appel voué à échouer. Les méthodes qui
    // renvoient une liste rendent une liste vide dans ce cas, pour que l'écran
    // s'affiche avec son message au lieu d'une erreur réseau.

    /**
     * Charge les trois listes d'un coup et les publie dans l'état cloud.
     *
     * Un seul aller-retour pour l'écran : les trois RPC partent ensemble, et
     * une erreur réseau laisse l'état précédent en place plutôt que de vider la
     * liste sous les yeux du joueur.
     */
    async loadFriends(): Promise<void> {
      const ready = tradeApi();
      if ("refusal" in ready) return;
      publish({ friendsBusy: true });
      try {
        const [friends, incoming, outgoing] = await Promise.all([
          ready.api.listFriends(),
          ready.api.listIncomingFriendRequests(),
          ready.api.listOutgoingFriendRequests(),
        ]);
        publish({ friends: { friends, incoming, outgoing }, friendsAt: deps.now(), friendsBusy: false });
      } catch (error) {
        publish({ friendsBusy: false });
        fail(error, "Liste d'amis indisponible.");
      }
    },

    /** L'écran des amis, réinitialisé : utilisé à la déconnexion. */
    clearFriends(): void {
      publish({ friends: EMPTY_FRIEND_LISTS, friendsAt: null, friendsBusy: false });
    },

    async sendFriendRequest(recipientId: string): Promise<{
      outcome: SendFriendRequestOutcome | null;
      message: string | null;
      isError: boolean;
    }> {
      const ready = tradeApi();
      if ("refusal" in ready) return { outcome: null, message: ready.refusal.message, isError: true };
      try {
        const outcome = await ready.api.sendFriendRequest(recipientId);
        const message = outcome.alreadyFriends
          ? "Vous êtes déjà amis."
          : outcome.existing
            ? "Cette personne t'a déjà envoyé une demande : réponds-y dans « Reçues »."
            : outcome.sent
              ? "Demande envoyée."
              : "Demande impossible.";
        return { outcome, message, isError: false };
      } catch (error) {
        const refusal = cloudRefusal(error, "Demande d'ami impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return { outcome: null, message: refusal.message, isError: true };
      }
    },

    async acceptFriendRequest(requestId: number): Promise<{ message: string | null; isError: boolean }> {
      const ready = tradeApi();
      if ("refusal" in ready) return { message: ready.refusal.message, isError: true };
      try {
        const accepted = await ready.api.acceptFriendRequest(requestId);
        return {
          message: accepted ? "Demande acceptée." : "Demande introuvable.",
          isError: !accepted,
        };
      } catch (error) {
        const refusal = cloudRefusal(error, "Acceptation impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return { message: refusal.message, isError: true };
      }
    },

    async rejectFriendRequest(requestId: number): Promise<{ message: string | null; isError: boolean }> {
      const ready = tradeApi();
      if ("refusal" in ready) return { message: ready.refusal.message, isError: true };
      try {
        await ready.api.rejectFriendRequest(requestId);
        return { message: "Demande refusée.", isError: false };
      } catch (error) {
        const refusal = cloudRefusal(error, "Refus impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return { message: refusal.message, isError: true };
      }
    },

    async cancelFriendRequest(requestId: number): Promise<{ message: string | null; isError: boolean }> {
      const ready = tradeApi();
      if ("refusal" in ready) return { message: ready.refusal.message, isError: true };
      try {
        await ready.api.cancelFriendRequest(requestId);
        return { message: "Demande annulée.", isError: false };
      } catch (error) {
        const refusal = cloudRefusal(error, "Annulation impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return { message: refusal.message, isError: true };
      }
    },

    async removeFriend(friendId: string): Promise<{ message: string | null; isError: boolean }> {
      const ready = tradeApi();
      if ("refusal" in ready) return { message: ready.refusal.message, isError: true };
      try {
        await ready.api.removeFriend(friendId);
        return { message: "Ami retiré.", isError: false };
      } catch (error) {
        const refusal = cloudRefusal(error, "Retrait impossible.");
        publish({ busy: false, message: refusal.message, isError: true });
        return { message: refusal.message, isError: true };
      }
    },

    /** Empreinte locale, utile pour diagnostiquer un conflit. */
    fingerprint(): string | null {
      const local = deps.readState();
      return local ? stateFingerprint(local) : null;
    },
  };
}

/** Instance de l'application (aucun effet à l'import : tout est paresseux). */
export const cloudStore = createCloudStore({
  config: cloudConfig,
  storage: deviceStorage,
  api: (config, storage) => new CloudApi(config, storage),
  readState: () => gameStore.getSnapshot(),
  applyState: (next) => gameStore.replaceState(next),
  now: () => Date.now(),
});

export const CLOUD_DISABLED_MESSAGE = CLOUD_DISABLED_HINT;
