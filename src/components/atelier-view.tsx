"use client";

import { useMemo, useState } from "react";
import "./drop-craft.css";
import "./atelier-ritual.css";
import { AtelierTransaction, type AtelierAction } from "./atelier-transaction";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Hammer,
  Recycle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  CATALOG_SIZE,
  CREATORS,
  CREATOR_BY_SLUG,
  RARITY_META,
  VARIANT_META,
  creatorImage,
  type Rarity,
} from "@/lib/catalog";
import { regionLabel } from "@/lib/regions";
import { craftableRetired, isRetired } from "@/lib/retired";
import {
  bulkRecyclableIds,
  duplicateGroups,
  type GameView,
} from "@/lib/game-engine";
import { usePoints } from "@/hooks/use-points";

type Mode = "craft" | "recycle";
type CraftFilter = "all" | Rarity;
type Wallet = "points" | "tokens";
const PER_PAGE = 20;

export function AtelierView({
  game,
  onNotice,
  onError,
  onGoDrop,
  onGoBinder,
}: {
  game: GameView;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onGoDrop?: () => void;
  onGoBinder?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("craft");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CraftFilter>("all");
  const [page, setPage] = useState(0);
  const [scope, setScope] = useState<"reachable" | "all">("reachable");
  const [recyclePage, setRecyclePage] = useState(0);
  const [recycleQuery, setRecycleQuery] = useState("");
  const [wallet, setWallet] = useState<Wallet>("points");
  const points = usePoints();
  const [action, setAction] = useState<AtelierAction | null>(null);

  const duplicates = useMemo(() => duplicateGroups({ cards: game.cards }), [game.cards]);
  const doublons = useMemo(() => {
    const q = recycleQuery.toLocaleLowerCase("fr").trim();
    if (!q) return duplicates;
    return duplicates.filter((group) => {
      const creator = CREATOR_BY_SLUG.get(group.creatorSlug);
      if (!creator) return false;
      const hay = `${creator.displayName} ${creator.login} ${creator.category} #${creator.rank} ${
        VARIANT_META[group.variant].label
      }`;
      return hay.toLocaleLowerCase("fr").includes(q);
    });
  }, [duplicates, recycleQuery]);

  const recyclePages = Math.max(1, Math.ceil(doublons.length / PER_PAGE));
  const recycleSafe = Math.min(recyclePage, recyclePages - 1);
  const visibles = doublons.slice(recycleSafe * PER_PAGE, (recycleSafe + 1) * PER_PAGE);

  const bulkIds = useMemo(() => bulkRecyclableIds({ cards: game.cards }), [game.cards]);
  const bulkValue = duplicates
    .filter((group) => group.variant !== "live")
    .reduce((sum, group) => sum + group.recyclableIds.length * group.unitValue, 0);
  const liveKept = duplicates
    .filter((group) => group.variant === "live")
    .reduce((sum, group) => sum + group.recyclableIds.length, 0);
  const missingCount = CREATORS.length - game.stats.uniqueCreators;

  const retiredCraftable = useMemo(
    () => craftableRetired().filter((creator) => !game.cards.some((card) => card.creatorSlug === creator.slug)),
    [game.cards],
  );
  const balance = wallet === "tokens" ? game.tokens.count : game.player.points;

  const affordableCount = useMemo(() => {
    const missing = [...retiredCraftable, ...CREATORS].filter(
      (creator) => !game.cards.some((card) => card.creatorSlug === creator.slug),
    );
    if (wallet === "tokens") {
      if (game.tokens.count < game.tokens.targetCost) return 0;
      return missing.filter((creator) => RARITY_META[creator.rarity].craftable).length;
    }
    return missing.filter((creator) => {
      const meta = RARITY_META[creator.rarity];
      return meta.craftable && meta.craftCost !== null && meta.craftCost <= game.player.points;
    }).length;
  }, [game.cards, game.player.points, game.tokens.count, game.tokens.targetCost, retiredCraftable, wallet]);

  const craftable = useMemo(() => {
    const q = query.toLocaleLowerCase("fr").trim();
    const owned = new Set(game.cards.map(card => card.creatorSlug));
    const price = (creator: (typeof CREATORS)[number]) => {
      const meta = RARITY_META[creator.rarity];
      if (!meta.craftable) return Infinity;
      return wallet === "tokens" ? game.tokens.targetCost : meta.craftCost ?? Infinity;
    };
    return [...retiredCraftable, ...CREATORS].filter((creator) => {
      if (owned.has(creator.slug)) return false;
      if (q && !`${creator.displayName} ${creator.login} ${creator.category} #${creator.rank}`.toLocaleLowerCase("fr").includes(q)) return false;
      if (filter !== "all" && creator.rarity !== filter) return false;
      // Search and explicit rarity filters can explore the full catalogue.
      if (scope === "reachable" && !q && filter === "all") {
        return Number.isFinite(price(creator)) && (affordableCount === 0 || price(creator) <= balance);
      }
      return true;
    }).sort((a, b) => price(a) - price(b) || a.rank - b.rank);
  }, [filter, game.cards, query, retiredCraftable, wallet, game.tokens.targetCost, scope, balance, affordableCount]);

  const totalPages = Math.max(1, Math.ceil(craftable.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = craftable.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  function handleCraft(slug: string, displayName: string) {
    const creator = CREATOR_BY_SLUG.get(slug)!;
    setAction({ kind: "craft", creator, name: displayName, wallet,
      cost: wallet === "tokens" ? game.tokens.targetCost : RARITY_META[creator.rarity].craftCost ?? 0 });
  }

  function handleRecycle(cardId: string, displayName: string, value: number) {
    const card = game.cards.find((entry) => entry.id === cardId);
    setAction({ kind: "recycle", cardId, name: displayName, cost: value,
      creator: card ? CREATOR_BY_SLUG.get(card.creatorSlug) : undefined, variant: card?.variant });
  }

  function handleBulkRecycle() {
    if (bulkIds.length) setAction({ kind: "bulk", ids: [...bulkIds], name: "Tes doublons", cost: bulkValue, liveKept });
  }

  function closeAction() {
    setAction(null);
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) document.getElementById("atelier-heading")?.focus();
    });
  }

  return (
    <div className="view atelier-view">
      {action ? <AtelierTransaction action={action} points={points} balance={action.kind === "craft" && action.wallet === "tokens" ? game.tokens.count : game.player.points}
        onClose={closeAction} onNotice={onNotice} onError={onError}
        onGoBinder={onGoBinder} onCreate={() => { setAction(null); setMode("craft"); setPage(0); }} /> : null}
      <p className="atelier-kicker">DOUBLONS → POINTS → TA PROCHAINE CARTE</p>
      <section className="page-title-row" style={{ marginBottom: "0.25rem" }}>
        <div>
          <h1 id="atelier-heading" tabIndex={-1}>Atelier</h1>
        </div>
        <div className="atelier-wallet">
          {wallet === "tokens" ? <Sparkles size={14} /> : <Coins size={14} />}
          <strong>{balance}</strong>
          <span>{wallet === "tokens" ? "jetons" : "points"}</span>
        </div>
      </section>

      <div className="filter-chips atelier-tabs" aria-label="Mode de l'atelier" style={{ margin: "0.25rem 0" }}>
        <button
          className={mode === "craft" ? "active" : ""}
          onClick={() => {
            setMode("craft");
            setPage(0);
          }}
          aria-pressed={mode === "craft"}
        >
          Créer
        </button>
        <button
          className={mode === "recycle" ? "active" : ""}
          onClick={() => {
            setMode("recycle");
            setRecyclePage(0);
          }}
          aria-pressed={mode === "recycle"}
        >
          Recycler ({duplicates.reduce((sum, group) => sum + group.recyclableIds.length, 0)})
        </button>
      </div>

      {mode === "craft" ? (
        <>
          {/* Règles repliées pour ne pas créer un mur de texte */}
          <details className="atelier-rules-details" style={{ margin: "0.2rem 0", fontSize: "0.78rem" }}>
            <summary style={{ cursor: "pointer", opacity: 0.8 }}>Règles & Coûts <ChevronRight size={13} /></summary>
            <p className="atelier-intro" style={{ margin: "0.25rem 0" }}>
              Standard uniquement : les variantes Live, Holo et Gold restent exclusives aux boosters.
            </p>
            <p className="atelier-cost-guide" aria-label="Coûts de craft" style={{ margin: "0.2rem 0" }}>
              Coûts : Commune 45 · Peu commune 90 · Rare 220 · Épique 600 points. Légendaire : booster.
            </p>
          </details>

          {retiredCraftable.length > 0 ? (
            <p className="atelier-retired-note" style={{ margin: "0.2rem 0", fontSize: "0.75rem" }}>
              <Clock size={14} />
              <span>
                {retiredCraftable.length} Sortant{retiredCraftable.length > 1 ? "s" : ""} artisanable{retiredCraftable.length > 1 ? "s" : ""} cette édition.
              </span>
            </p>
          ) : null}

          {/* Monnaie */}
          <div className="filter-chips wallet-chips" aria-label="Monnaie" style={{ margin: "0.25rem 0" }}>
            <button
              className={wallet === "points" ? "active" : ""}
              onClick={() => { setWallet("points"); setPage(0); }}
              aria-pressed={wallet === "points"}
            >
              Points ({game.player.points})
            </button>
            <button
              className={wallet === "tokens" ? "active" : ""}
              onClick={() => { setWallet("tokens"); setPage(0); }}
              aria-pressed={wallet === "tokens"}
            >
              Jetons ({game.tokens.count}/{game.tokens.targetCost})
            </button>
          </div>

          {/* Mise en avant claire des cartes à portée */}
          <p className="wallet-note" style={{ margin: "0.2rem 0", fontSize: "0.78rem" }}>
            {affordableCount > 0
              ? "Cartes Standard disponibles."
              : wallet === "tokens"
                ? `Encore ${Math.max(0, game.tokens.targetCost - game.tokens.count)} jetons avant la prochaine carte.`
                : "Les recettes les moins chères d’abord. Recycle des doublons pour gagner des points."}
          </p>

          <div className="filter-chips atelier-scope" aria-label="Recettes affichées">
            <button type="button" aria-pressed={scope === "reachable"} className={scope === "reachable" ? "active" : ""}
              onClick={() => { setScope("reachable"); setFilter("all"); setQuery(""); setPage(0); }}>
              {affordableCount > 0 ? `À portée (${affordableCount})` : "Prochaines cartes"}
            </button>
            <button type="button" aria-pressed={scope === "all"} className={scope === "all" ? "active" : ""}
              onClick={() => { setScope("all"); setPage(0); }}>Toutes les recettes</button>
          </div>
          {affordableCount === 0 && wallet === "points" ? (
            <button type="button" className="text-link atelier-recycle-link" onClick={() => { setMode("recycle"); setRecyclePage(0); }}>
              <Recycle size={15} /> Voir mes doublons ({duplicates.reduce((sum, group) => sum + group.recyclableIds.length, 0)})
            </button>
          ) : null}

          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Chercher un créateur manquant…"
              aria-label="Rechercher un créateur à rejoindre"
            />
            {query ? (
              <button
                onClick={() => {
                  setQuery("");
                  setPage(0);
                }}
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            ) : null}
          </label>

          <details className="atelier-rarity-filters">
            <summary>Filtrer par rareté</summary>
          <div className="filter-chips" aria-label="Filtres de rareté" style={{ margin: "0.25rem 0" }}>
            {(
              [
                ["all", `Toutes (${craftable.length})`],
                ["legendary", "Légendaires"],
                ["epic", "Épiques"],
                ["rare", "Rares"],
                ["uncommon", "Peu communes"],
                ["common", "Communes"],
              ] as [CraftFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "active" : ""}
                onClick={() => {
                  setFilter(value);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          </details>

          {/* Liste épurée */}
          <div className="atelier-list">
            {visible.map((creator) => {
              const meta = RARITY_META[creator.rarity];
              const cost = wallet === "tokens" ? game.tokens.targetCost : meta.craftCost;
              const affordable = cost !== null && balance >= cost;
              const buyable = wallet === "tokens" ? meta.craftable : meta.craftable && cost !== null;
              return (
                <article key={creator.slug} className="atelier-row">
                  <Image
                    className="atelier-thumb"
                    src={creatorImage(creator)}
                    alt=""
                    width={40}
                    height={40}
                    sizes="40px"
                  />
                  <div className="atelier-copy">
                    <button type="button" className="atelier-preview-name" onClick={() => handleCraft(creator.slug, creator.displayName)} aria-label={`Aperçu de ${creator.displayName}`}><strong>{creator.displayName}</strong></button>
                    <span>
                      {regionLabel(creator.region)}
                    </span>
                  </div>
                  {isRetired(creator.slug) ? <span className="card-retired">Sortant</span> : null}
                  <span
                    className="atelier-rarity"
                    style={{ color: meta.color }}
                    title={meta.label}
                  >
                    {meta.short}
                  </span>
                  {buyable && cost !== null ? (
                    <button
                      type="button"
                      className="craft-button"
                      onClick={() => handleCraft(creator.slug, creator.displayName)}
                      disabled={!affordable}
                      title={
                        affordable
                          ? `Rejoindre ${creator.displayName}`
                          : `Il te manque ${cost - balance} ${wallet === "tokens" ? "jetons" : "points"}`
                      }
                    >
                      <Hammer size={13} />
                      {cost}
                    </button>
                  ) : (
                    <span className="craft-locked" title="Les Légendaires se tirent en booster">
                      Booster
                    </span>
                  )}
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
<div className="binder-pager">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage <= 0}>
              <ChevronLeft size={15} />
              <span>Précédent</span>
            </button>
            <span>
              Page <strong>{safePage + 1}</strong> / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              <span>Suivant</span>
              <ChevronRight size={15} />
            </button>
          </div>
          ) : null}

          {!craftable.length ? (
            <div className="no-results">
              {missingCount === 0
                ? `Collection complète : les ${CATALOG_SIZE} créateurs sont dans ton classeur !`
                : "Aucun créateur ne correspond à ce filtre."}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="atelier-intro" style={{ margin: "0.2rem 0", fontSize: "0.78rem" }}>
            Recyclage en points. La dernière copie n&apos;est jamais touchée. Un doublon <strong>Live</strong> demande confirmation.
          </p>

          {duplicates.length ? (
            <>
              <div className="atelier-bulk-actions" style={{ margin: "0.3rem 0" }}>
                <button
                  type="button"
                  className="craft-button recycle"
                  onClick={handleBulkRecycle}
                  disabled={!bulkIds.length}
                  title={`Recycler tous les doublons (${bulkIds.length}) pour ${bulkValue} points — les Live restent en place`}
                >
                  <Recycle size={13} />
                  {`Tout recycler · +${bulkValue}`}
                </button>
                {liveKept > 0 ? (
                  <span className="atelier-bulk-note">
                    {liveKept} doublon{liveKept > 1 ? "s" : ""} Live à recycler un par un
                  </span>
                ) : null}
              </div>

              <label className="search-field">
                <Search size={16} />
                <input
                  value={recycleQuery}
                  onChange={(event) => {
                    setRecycleQuery(event.target.value);
                    setRecyclePage(0);
                  }}
                  placeholder="Chercher un doublon…"
                  aria-label="Rechercher un doublon"
                />
                {recycleQuery ? (
                  <button
                    onClick={() => {
                      setRecycleQuery("");
                      setRecyclePage(0);
                    }}
                    aria-label="Effacer la recherche"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>

              {recyclePages > 1 ? (
                <div className="binder-pager">
                  <button
                    onClick={() => setRecyclePage((p) => Math.max(0, p - 1))}
                    disabled={recycleSafe <= 0}
                  >
                    <ChevronLeft size={15} />
                    <span>Précédent</span>
                  </button>
                  <span>
                    Page <strong>{recycleSafe + 1}</strong> / {recyclePages} · {doublons.length} doublons
                  </span>
                  <button
                    onClick={() => setRecyclePage((p) => Math.min(recyclePages - 1, p + 1))}
                    disabled={recycleSafe >= recyclePages - 1}
                  >
                    <span>Suivant</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              ) : null}

              <div className="atelier-list">
                {visibles.map((group) => {
                  const creator = CREATOR_BY_SLUG.get(group.creatorSlug);
                  if (!creator) return null;
                  return (
                    <article key={`${group.creatorSlug}-${group.variant}`} className="atelier-row">
                      <Image
                        className="atelier-thumb"
                        src={creatorImage(creator)}
                        alt=""
                        width={40}
                        height={40}
                        sizes="40px"
                      />
                      <div className="atelier-copy">
                        <strong>{creator.displayName}</strong>
                        <span>
                          {VARIANT_META[group.variant].label} · {RARITY_META[group.rarity].label} · ×{group.count}
                        </span>
                      </div>
                      <button type="button" className="craft-button recycle"
                        onClick={() => handleRecycle(group.recyclableIds[0], creator.displayName, group.unitValue)}
                        title={`Aperçu du recyclage de ${creator.displayName}`}>
                        <Recycle size={13} />+{group.unitValue}
                      </button>
                    </article>
                  );
                })}
              </div>

              {doublons.length ? null : (
                <div className="no-results">Aucun doublon ne correspond à cette recherche.</div>
              )}
            </>
          ) : (
            <div className="empty-collection">
              <Sparkles size={25} />
              <div>
                <strong>Aucun doublon pour l&apos;instant</strong>
                <span>
                  Boosters → doublons → points → carte au choix. Ta dernière copie reste dans le classeur.
                </span>
              </div>
              {onGoDrop ? <button type="button" className="secondary-action" onClick={onGoDrop}>Retour au Drop</button> : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
