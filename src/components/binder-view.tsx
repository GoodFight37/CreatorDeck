"use client";

/**
 * L'écran **Binder** : grille de collection immédiate, recherche et filtres compacts.
 */
import { useMemo, useState, type CSSProperties } from "react";
import { ArrowDownWideNarrow, BookOpen, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { CreatorCard } from "@/components/creator-card";
import { CardInspectModal } from "@/components/card-inspect-modal";
import { BINDER_FAMILIES, BINDER_COLLECTION_BY_ID, binderCollectionProgress, recommendBinderCollection } from "@/lib/binder-collections";
import { useBinderGoal } from "@/hooks/use-binder-goal";
import { BINDER_SORTS, sortBinder, type BinderSort } from "@/lib/binder-sort";
import { useNow } from "@/hooks/use-game";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useLive } from "@/hooks/use-live";
import { CATALOG_SIZE, CREATORS, CREATOR_BY_SLUG, RETIRED_BY_SLUG, RETIRED_CREATORS, type CardVariant, type Creator, type Rarity } from "@/lib/catalog";
import { liveFor } from "@/lib/live";
import { craftQuote, type GameView } from "@/lib/game-engine";
import { playPageTurn } from "@/lib/sfx";

type CollectionFilter = "all" | "owned" | "missing" | "live" | "retired" | Rarity;

const RARITY_COUNTS = CREATORS.reduce<Record<Rarity, number>>(
  (acc, creator) => {
    acc[creator.rarity] += 1;
    return acc;
  },
  { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
);

export function CollectionView({
  game,
  themeStyle,
  onCraft,
  onGoDrop,
}: {
  game: GameView;
  themeStyle?: CSSProperties;
  onCraft: (slug: string) => Promise<boolean>;
  onGoDrop?: () => void;
}) {
  const [filter, setFilter] = useState<CollectionFilter>("owned");
  const [pageGoal, setPageGoal] = useState<string | null>(null);
  const [savedGoal, saveGoal] = useBinderGoal();
  const [collectionFamily, setCollectionFamily] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BinderSort>("catalog");
  const [page, setPage] = useState(0);
  const [crafting, setCrafting] = useState<string | null>(null);
  const [inspect, setInspect] = useState<{
    creator: Creator;
    count: number;
    variant: CardVariant;
    liveStream: ReturnType<typeof liveFor>;
  } | null>(null);

  useBackHandler(inspect !== null, () => setInspect(null));
  const live = useLive();
  const now = useNow(60_000);
  const perPage = 12;

  const owned = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        bestVariant: CardVariant;
        variants: Set<CardVariant>;
        latestAt: number;
      }
    >();
    const variantScore: Record<CardVariant, number> = {
      standard: 1,
      live: 2,
      holo: 3,
      gold: 4,
    };
    for (const card of game.cards) {
      const value = map.get(card.creatorSlug) ?? {
        count: 0,
        bestVariant: "standard" as CardVariant,
        variants: new Set<CardVariant>(),
        latestAt: 0,
      };
      value.count += 1;
      value.latestAt = Math.max(value.latestAt, card.obtainedAt);
      value.variants.add(card.variant);
      if (variantScore[card.variant] > variantScore[value.bestVariant]) {
        value.bestVariant = card.variant;
      }
      map.set(card.creatorSlug, value);
    }
    return map;
  }, [game.cards]);

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase("fr").trim();
    const retiredCards = RETIRED_CREATORS.filter((creator) => owned.has(creator.slug));
    const goalSlugs = pageGoal ? new Set(BINDER_COLLECTION_BY_ID.get(pageGoal)?.slugs ?? []) : null;
    const matches = (creator: Creator) => {
      if (goalSlugs && !goalSlugs.has(creator.slug)) return false;
      if (q) {
        const hay = `${creator.displayName} ${creator.login} ${creator.category} #${creator.rank}`.toLocaleLowerCase("fr");
        if (!hay.includes(q)) return false;
      }
      return true;
    };
    if (filter === "retired") return retiredCards.filter(matches);
    const current = CREATORS.filter((creator) => {
      if (!matches(creator)) return false;
      if (filter === "owned") return owned.has(creator.slug);
      if (filter === "missing") return !owned.has(creator.slug);
      if (filter === "live") return liveFor(live, creator.login, now) !== null;
      if (filter !== "all") return creator.rarity === filter;
      return true;
    });

    const sorted = sortBinder(
      current,
      sort,
      (slug) => owned.get(slug)?.count ?? 0,
      (slug) => owned.get(slug)?.latestAt ?? 0,
    );
    return filter === "all" ? [...sorted, ...retiredCards] : sorted;
  }, [filter, live, now, owned, pageGoal, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const showPager = filtered.length > perPage;
  const safePage = Math.min(page, totalPages - 1);
  function turnPage(next: number) {
    const target = Math.max(0, Math.min(totalPages - 1, next));
    if (target === safePage) return;
    playPageTurn();
    setPage(target);
  }
  const visibleCreators = filtered.slice(
    safePage * perPage,
    (safePage + 1) * perPage,
  );
  const progress = Math.floor((game.stats.uniqueCreators / CREATORS.length) * 100);
  const collections = useMemo(() => binderCollectionProgress(new Set(owned.keys())), [owned]);
  const activePage = pageGoal ? collections.find((collection) => collection.id === pageGoal) : null;
  const nextCollection = collections.find((collection) => collection.id === savedGoal)
    ?? recommendBinderCollection(collections);
  const featuredCollection = activePage ?? nextCollection;
  const pickerFamily = collectionFamily ?? BINDER_COLLECTION_BY_ID.get(savedGoal ?? "")?.familyId ?? BINDER_FAMILIES[0].id;

  function chooseCollection(id: string) {
    const collection = BINDER_COLLECTION_BY_ID.get(id);
    if (!collection) return;
    saveGoal(id);
    setCollectionFamily(collection.familyId);
    setPageGoal(id);
    setFilter(collection.slugs.every((slug) => owned.has(slug)) ? "all" : "missing");
    setQuery("");
    setPage(0);
  }

  const retiredOwned = useMemo(
    () => [...owned.keys()].filter((slug) => RETIRED_BY_SLUG.has(slug)).length,
    [owned],
  );

  return (
    <div className="view collection-view" style={themeStyle}>
      {/* En-tête : titre sobre et score */}
      <section className="page-title-row" style={{ marginBottom: "0.2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", margin: 0 }}>Mon classeur</h1>
        </div>
        <div className="collection-score">
          {game.stats.uniqueCreators ? (
            <><strong>{progress}%</strong><span>complété</span></>
          ) : (
            <><strong>À toi</strong><span>ta première carte</span></>
          )}
        </div>
      </section>

      {game.stats.uniqueCreators ? (
        <div style={{ marginBottom: "0.3rem" }}>
          <div className="progress-track" style={{ height: "4px" }}>
            <i style={{ width: `${progress}%` }} />
          </div>
          <div className="collection-meta" style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
            <span>{game.stats.uniqueCreators} / {CREATORS.length} streameurs découverts</span>
            <span>{game.stats.totalCards} cartes obtenues</span>
          </div>
        </div>
      ) : null}

      {/* Outils compacts : recherche, tri et puces scrollables en 1 seule ligne */}
      <div className="binder-tools">
        <label className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder={`Rechercher un streameur, rang (#1 à #${CATALOG_SIZE}) ou jeu…`}
            aria-label="Rechercher un créateur"
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

        <label className="sort-field">
          <ArrowDownWideNarrow size={16} />
          <span className="sort-label">Trier</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as BinderSort);
              setPage(0);
            }}
            aria-label="Trier le classeur"
          >
            {BINDER_SORTS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <div className="filter-chips" aria-label="Filtres de collection" style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", paddingBottom: "0.2rem" }}>
          {(
            [
              ["all", `Toutes (${CREATORS.length})`],
              ["owned", `Obtenues (${game.stats.uniqueCreators})`],
              ["missing", "À découvrir"],
              ...(retiredOwned
                ? ([["retired", `Sortants (${retiredOwned})`]] as [CollectionFilter, string][])
                : []),
              ...(live.configured && live.count && !live.stale
                ? ([["live", `En direct (${live.count})`]] as [CollectionFilter, string][])
                : []),
              ["legendary", `Légendaires (${RARITY_COUNTS.legendary})`],
              ["epic", `Épiques (${RARITY_COUNTS.epic})`],
              ["rare", `Rares (${RARITY_COUNTS.rare})`],
              ["uncommon", `Peu communes (${RARITY_COUNTS.uncommon})`],
              ["common", `Communes (${RARITY_COUNTS.common})`],
            ] as [CollectionFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setPageGoal(null);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activePage ? (
        <div className="binder-active-page" role="status">
          <span>{filter === "missing" ? "À découvrir" : "Collection"} · <strong>{activePage.name}</strong> · {activePage.owned}/{activePage.total}</span>
          <button type="button" aria-label="Retirer le filtre de page" onClick={() => { setPageGoal(null); setPage(0); }}><X size={16} /></button>
        </div>
      ) : null}

      {showPager ? (
        <div className="binder-pager">
          <button onClick={() => turnPage(safePage - 1)} disabled={safePage <= 0}>
            <ChevronLeft size={15} />
            <span>Précédent</span>
          </button>
          <span>Page <strong>{safePage + 1}</strong> / {totalPages} · {filtered.length} cartes</span>
          <button onClick={() => turnPage(safePage + 1)} disabled={safePage >= totalPages - 1}>
            <span>Suivant</span>
            <ChevronRight size={15} />
          </button>
        </div>
      ) : null}

      {/* Grille de cartes visible immédiatement en haut de page */}
      <div className="binder-page" key={safePage} data-page={safePage + 1}>
        <div className="collection-grid">
          {visibleCreators.map((creator) => {
            const item = owned.get(creator.slug);
            const currentLive = liveFor(live, creator.login, now);
            return (
              <div className="binder-pocket" key={creator.slug}>
                <CreatorCard
                  creator={creator}
                  variant={item?.bestVariant ?? "standard"}
                  locked={!item}
                  compact
                  liveStream={currentLive}
                  onClick={() => setInspect({
                    creator,
                    count: item?.count ?? 0,
                    variant: item?.bestVariant ?? "standard",
                    liveStream: currentLive,
                  })}
                />
                {item && item.count > 1 ? (
                  <span className="pocket-count">×{item.count}</span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Empty state épuré avec la phrase contractuelle */}
        {!filtered.length ? (
          <div className="binder-empty-state">
            {filter === "owned" && game.stats.uniqueCreators === 0 && !query ? (
              <>
                <strong>Ta collection commence avec le prochain booster.</strong>
                <button type="button" className="binder-first-drop" onClick={() => { setFilter("all"); setPage(0); }}>
                  Voir les créateurs à découvrir <ChevronRight size={16} />
                </button>
                {onGoDrop ? (
                  <button type="button" className="binder-first-drop" onClick={onGoDrop}>
                    Retour au Drop <ChevronRight size={16} />
                  </button>
                ) : null}
              </>
            ) : (
              <span>Aucune carte ne correspond à cette recherche.</span>
            )}
          </div>
        ) : null}
      </div>

      {/* Raccourci Dernières reçues replacé sous les pochettes */}
      {game.stats.uniqueCreators > 0 ? (
        <div className="binder-quick-views" aria-label="Parcourir ma collection" style={{ margin: "0.2rem 0" }}>
          <button type="button" aria-pressed={sort === "recent" && filter === "owned" && !pageGoal && !query} onClick={() => {
            setSort("recent"); setFilter("owned"); setPageGoal(null); setQuery(""); setPage(0);
          }}>Dernières reçues <ChevronRight size={14} /></button>
          <span>{game.stats.duplicates} doublon{game.stats.duplicates > 1 ? "s" : ""} recyclable{game.stats.duplicates > 1 ? "s" : ""}</span>
        </div>
      ) : null}

      {/* Pages à compléter : bandeau placé après la grille pour ne pas masquer les cartes */}
      {featuredCollection ? (
        <section className="binder-next-pages" aria-label="Pages à compléter" style={{ padding: "0.35rem 0.6rem", margin: "0.25rem 0" }}>
          <div className="drop-section-label" style={{ marginBottom: "0.2rem", fontSize: "0.72rem" }}>
            <span>{featuredCollection.missing.length ? "TA COLLECTION À COMPLÉTER" : "COLLECTION COMPLÉTÉE"}</span>
            <BookOpen size={13} />
          </div>
          <button
            type="button"
            aria-pressed={pageGoal === featuredCollection.id}
            onClick={() => chooseCollection(featuredCollection.id)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", background: "transparent", border: "none", color: "inherit", padding: 0 }}
          >
            <span className="binder-page-title" style={{ flex: 1, textAlign: "left" }}>
              <strong style={{ fontSize: "0.85rem" }}>{featuredCollection.name}</strong>
              <small style={{ display: "block", fontSize: "0.72rem", opacity: 0.7 }}>
                {featuredCollection.owned} / {featuredCollection.total} cartes différentes
              </small>
              <span className="binder-collection-action" style={{ fontSize: "0.72rem" }}>
                {featuredCollection.missing.length ? `Voir les ${featuredCollection.missing.length} manquantes` : "Revoir les cartes réunies"}
              </span>
            </span>
            <ChevronRight size={15} style={{ opacity: 0.6 }} />
          </button>
          <progress aria-label={`Progression de ${featuredCollection.name}`} value={featuredCollection.owned} max={featuredCollection.total} style={{ height: "3px", width: "100%", margin: "0.2rem 0" }} />
          {featuredCollection.missing.length ? (
            <p className="binder-missing-preview" style={{ fontSize: "0.72rem", margin: "0.1rem 0" }}>
              À trouver : {featuredCollection.missing.slice(0, 3).map((slug) => CREATOR_BY_SLUG.get(slug)?.displayName).join(", ")}
              {featuredCollection.missing.length > 3 ? ` et ${featuredCollection.missing.length - 3} autres.` : "."}
            </p>
          ) : (
            <p className="binder-missing-preview" style={{ fontSize: "0.72rem", margin: "0.1rem 0" }}>
              Tous les noms de cette page sont réunis.
            </p>
          )}
        </section>
      ) : null}

      {/* Sélecteur replié */}
      <details className="binder-collections-picker" style={{ margin: "0.2rem 0" }}>
        <summary style={{ fontSize: "0.78rem", padding: "0.25rem 0" }}>Choisir une collection <ChevronRight size={14} /></summary>
        <p style={{ fontSize: "0.72rem" }}>Les pages font 12 cartes. Ton choix est gardé sur cet appareil.</p>
        <label style={{ fontSize: "0.72rem" }}>Famille
          <select aria-label="Famille de collection" value={pickerFamily} onChange={(event) => setCollectionFamily(event.target.value)}>
            {BINDER_FAMILIES.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
          </select>
        </label>
        <div className="binder-collection-choices">
          {collections.filter((collection) => collection.familyId === pickerFamily).map((collection) => (
            <button type="button" key={collection.id} aria-pressed={savedGoal === collection.id}
              onClick={() => chooseCollection(collection.id)}>
              <strong>{collection.name}</strong>
              <span>{collection.owned}/{collection.total} · {collection.missing.length ? `${collection.missing.length} à trouver` : "Complétée"}</span>
            </button>
          ))}
        </div>
        {savedGoal ? <button type="button" className="binder-auto-goal" onClick={() => {
          saveGoal(null); setPageGoal(null); setFilter("owned"); setQuery(""); setPage(0);
        }}>Revenir à la suggestion automatique</button> : null}
      </details>

      {inspect ? (
        <CardInspectModal
          creator={inspect.creator}
          ownedCount={inspect.count}
          variant={inspect.variant}
          liveStream={inspect.liveStream}
          quote={craftQuote({ cards: game.cards }, inspect.creator.slug)}
          balance={game.player.points}
          crafting={crafting === inspect.creator.slug}
          onCraft={async (slug) => {
            setCrafting(slug);
            try {
              if (await onCraft(slug)) setInspect(null);
            } finally {
              setCrafting(null);
            }
          }}
          onClose={() => setInspect(null)}
        />
      ) : null}
    </div>
  );
}
