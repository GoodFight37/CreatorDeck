/**
 * Le magasin cloud : l'état que l'interface observe (session, compte,
 * classement, échanges, hôtel, Last Pack, Arène) et la synchronisation de la
 * partie avec le serveur.
 *
 * Découpé le 7 octobre 2026 (2 400 lignes, une relecture s'y perdait) : ce
 * fichier garde **l'état, la synchronisation et les helpers**, et assemble
 * les actions par domaine — `store/account.ts`, `store/pack.ts`,
 * `store/social.ts`, `store/market.ts`, `store/arena.ts`. Les corps de
 * méthodes ont déménagé tels quels : les 108 tests du magasin ne bougent pas.
 */
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
  applyLastPackSteal,
  applyScenePackResult,
  applyMarketPurchase,
  applyMarketSale,
  applyPackResult,
  applyPackStatus,
  applyServerProgression,
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
  type ArenaBoard,
  type ArenaMine,
  type LeaderboardMetric,
  type LeaderboardRow,
  type LastPackShelf,
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
import { applyArenaReward, arenaRankLabel, arenaWeekLabel } from "@/lib/arena";
import { CREATOR_BY_SLUG, type CardVariant, type Rarity } from "@/lib/catalog";
import { decideSync, stateFingerprint, syncStats, type SyncAction } from "@/lib/cloud/sync";
import { MAX_SHOWCASE, normalizeShowcase } from "@/lib/cloud/showcase";
import { deviceStorage } from "@/lib/storage";
import { gameStore, onPersist } from "@/lib/game-store";

/** Délai après la dernière action avant l'envoi automatique de la partie. */
export const AUTO_PUSH_DEBOUNCE_MS = 20_000;

/** Tri du classement : le type vient du client (`leaderboard()` en base). */
export type { LeaderboardMetric };

import type { CloudActionOutcome, CloudDeps, CloudState } from "@/lib/cloud/store/types";
import type { CloudStoreActions } from "@/lib/cloud/store/context";
import type { CloudStoreContext } from "@/lib/cloud/store/context";
import { EMPTY_CLOUD_STATE } from "@/lib/cloud/store/types";
import { accountActions } from "@/lib/cloud/store/account";
import { arenaActions } from "@/lib/cloud/store/arena";
import { marketActions } from "@/lib/cloud/store/market";
import { packActions } from "@/lib/cloud/store/pack";
import { socialActions } from "@/lib/cloud/store/social";

export * from "@/lib/cloud/store/types";


/** Le magasin complet, tel que l'interface le consomme. */
export type CloudStore = ReturnType<typeof createCloudStore>;


const EMPTY = EMPTY_CLOUD_STATE;

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
      // La version serveur que le client connaît (`null` s'il n'a jamais rien
      // lu) : c'est elle qui décide du conflit, à la place de l'horloge de
      // l'appareil. Postgres garde les microsecondes, JavaScript les
      // millisecondes — le serveur tolère cette milliseconde de marge.
      const base = state.remoteUpdatedAt ? new Date(state.remoteUpdatedAt).toISOString() : null;
      const result = await api.pushSave(local, deviceUpdatedAt, saveVersion, force, base);
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
            "Le cloud contient une partie plus récente (autre appareil). « Charger le cloud » l'adopte, « Envoyer ma collection » l'écrase.",
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

  /**
   * Envoie la partie **après une action décidée par le serveur** (échange, hôtel,
   * Last Pack, arène, réinitialisation).
   *
   * Le serveur vient d'écrire sa version : pousser en forçant écraserait en
   * silence la ligne qu'il vient de produire. On relit donc sa version, puis on
   * envoie la nôtre **par-dessus** — sans jamais forcer. `p_force` reste réservé
   * au bouton « Envoyer / écraser » de l'écran de conflit (et à
   * « Envoyer ma collection », geste explicite du joueur).
   *
   * La lecture peut échouer (réseau) : on envoie quand même, sans forcer. Le
   * serveur répondra « conflit » plutôt que d'écraser une partie qu'il n'a pas
   * vue — c'est exactement ce qu'on veut.
   */
  async function pushAfterServer(): Promise<void> {
    const api = resolve();
    if (!networkReady(api)) return;
    try {
      const remote = await api.pullSave();
      if (remote) {
        publish({ remoteUpdatedAt: Date.parse(remote.updatedAt) || state.remoteUpdatedAt });
      }
    } catch {
      // Sans lecture, on n'insiste pas : l'envoi qui suit reste sans forçage.
    }
    const local = deps.readState();
    if (local) await push(local.version, local.updatedAt, false);
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
        await pushAfterServer();
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
        const adopted = applyServerProgression(
          applyPackStatus(local, status.packs, status.lastRegenAt, deps.now()),
          status,
          deps.now(),
        );
        if (adopted !== local) deps.applyState(adopted);
      }
      return { packs: status.packs, nextPackAt: status.nextPackAt };
    } catch {
      // Sans réseau ou erreur : le client retombe sur le calcul local.
      return null;
    }
  }

  /**
   * Le contexte donné aux actions : mêmes helpers que la fermeture ci-dessus,
   * plus l'objet complet (`actions`) pour les appels d'une action à l'autre.
   */
  const ctx: CloudStoreContext = {
    deps,
    state: () => state,
    publish,
    snapshot,
    resolve,
    refreshIdentity,
    currentUserId,
    readSeen,
    fail,
    networkReady,
    push,
    pushAfterServer,
    pull,
    creatorNames,
    asEngineCards,
    cloudRefusal,
    tradeApi,
    refreshTrades,
    adoptCloudIfEmpty,
    connectedMessage,
    fetchPackStatus,
    // Posé juste après : une action peut en appeler une autre (`this.x()`).
    actions: undefined as unknown as CloudStoreActions,
  };

  const actions: CloudStoreActions = {
    ...accountActions(ctx),
    ...packActions(ctx),
    ...socialActions(ctx),
    ...marketActions(ctx),
    ...arenaActions(ctx),
  };
  ctx.actions = actions;

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

    // ---- les actions, par domaine (voir ./store) ---------------------------
    ...actions,
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
