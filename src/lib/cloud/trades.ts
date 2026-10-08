/**
 * Échanges : décisions calculées localement, sans réseau ni stockage.
 *
 * Le serveur tranche un échange (il écrit les deux collections dans la même
 * transaction) ; l'appareil doit ensuite **s'aligner** sur ce résultat :
 *
 *   * celui qui accepte applique le déplacement tout de suite, puis pousse sa
 *     sauvegarde (`respond_trade` renvoie ce qu'il donne et ce qu'il reçoit) ;
 *   * celui qui a proposé l'offre découvre la réponse au chargement suivant :
 *     la liste renvoie les échanges acceptés, et l'appareil applique le troc
 *     sans attendre un « Charger le cloud » manuel.
 *
 * Tout est isolé ici parce qu'une erreur coûte cher (dupliquer une carte, ou en
 * faire disparaître une) : ce module est testé à part (`trades.test.ts`).
 */
import { applyTradeResult, type PlayerState, type TradeMove } from "@/lib/game-engine";
import { VARIANT_META, type CardVariant, type Rarity } from "@/lib/catalog";
import type { TradeCard, TradeListItem } from "@/lib/cloud/api";

/**
 * Offres acceptées, de la plus ancienne à la plus récente.
 *
 * L'ordre compte : deux échanges acceptés coup sur coup doivent s'appliquer
 * dans l'ordre du serveur, sinon le retrait « la plus ancienne d'abord »
 * choisirait la mauvaise copie.
 */
export function acceptedTrades(list: readonly TradeListItem[]): TradeListItem[] {
  return list
    .filter((trade) => trade.status === "accepted")
    .sort((a, b) => (a.resolvedAt ?? a.createdAt).localeCompare(b.resolvedAt ?? b.createdAt));
}

/** Traduit une carte du serveur en mouvement applicable au moteur local. */
export function moveOf(trade: TradeListItem): TradeMove {
  return {
    tradeId: trade.id,
    given: trade.given.map((card) => ({
      creatorSlug: card.creatorSlug,
      rarity: card.rarity as Rarity,
      variant: card.variant as CardVariant,
    })),
    received: trade.received.map((card) => ({
      creatorSlug: card.creatorSlug,
      rarity: card.rarity as Rarity,
      variant: card.variant as CardVariant,
    })),
  };
}

export type AppliedTrades = {
  state: PlayerState;
  /** Nombre d'échanges réellement appliqués à la collection locale. */
  applied: number;
  /**
   * Échanges acceptés que cette partie ne peut pas appliquer (la carte donnée
   * n'est plus dans la collection locale : autre appareil, partie plus vieille).
   * L'appareil doit alors reprendre la sauvegarde du cloud — on ne bricole pas
   * une collection à moitié.
   */
  blocked: TradeListItem[];
};

/**
 * Applique à la partie locale les échanges acceptés côté serveur.
 *
 * Idempotent : `applyTradeResult` reconnaît les cartes reçues (`fromTrade`) et
 * ne rejoue pas un échange déjà appliqué. Un échange introuvable localement
 * n'interrompt pas les autres : il est signalé dans `blocked`.
 */
export function applyAcceptedTrades(
  state: PlayerState,
  list: readonly TradeListItem[],
  now = Date.now(),
): AppliedTrades {
  let next = state;
  let applied = 0;
  const blocked: TradeListItem[] = [];

  for (const trade of acceptedTrades(list)) {
    try {
      const candidate = applyTradeResult(next, moveOf(trade), now);
      if (candidate !== next) {
        next = candidate;
        applied += 1;
      }
    } catch {
      blocked.push(trade);
    }
  }

  return { state: next, applied, blocked };
}

/** « xQc (Holographique) », avec le nom affiché du catalogue quand il existe. */
export function describeCard(card: TradeCard, names: Map<string, string>): string {
  const name = names.get(card.creatorSlug) ?? card.creatorSlug;
  const variant = VARIANT_META[card.variant as CardVariant]?.label ?? card.variant;
  return `${name} (${variant})`;
}

/** Résume une liste de cartes : « 3 cartes » ou les deux premières puis « +1 ». */
export function describeCards(cards: readonly TradeCard[], names: Map<string, string>): string {
  if (cards.length === 0) return "aucune carte";
  const labels = cards.map((card) => describeCard(card, names));
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}
