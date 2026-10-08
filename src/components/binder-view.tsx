"use client";

/**
 * L'écran **Binder** : le classeur, ses milles cartes, la recherche, le tri et
 * les filtres — collés sous la barre pendant qu'on feuillette.
 */
import { useMemo, useState, type CSSProperties } from "react";

import { ArrowDownWideNarrow, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { CreatorCard } from "@/components/creator-card";

import { CardInspectModal } from "@/components/card-inspect-modal";
import { BINDER_SORTS, sortBinder, type BinderSort } from "@/lib/binder-sort";

import { useNow } from "@/hooks/use-game";

import { useBackHandler } from "@/hooks/use-back-handler";
import { useLive } from "@/hooks/use-live";
import { CATALOG_SIZE, CREATORS, RETIRED_BY_SLUG, RETIRED_CREATORS, type CardVariant, type Creator, type Rarity } from "@/lib/catalog";

import { liveFor } from "@/lib/live";

import { craftQuote, type GameView } from "@/lib/game-engine";


type CollectionFilter = "all" | "owned" | "live" | "retired" | Rarity;

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
}: {
  game: GameView;
  themeStyle?: CSSProperties;
  /** Rejoindre un créateur manquant : dit `true` quand c'est payé. */
  onCraft: (slug: string) => Promise<boolean>;
}) {
  // Le classeur s'ouvre sur **ce qu'on possède** : mille créateurs font cent
  // douze pages, et personne ne feuillette ça au pouce. Un joueur qui n'a encore
  // rien ouvre sur le catalogue entier — sinon il verrait un classeur vide, ce
  // qui est exact mais décourageant.
  const [filter, setFilter] = useState<CollectionFilter>(() =>
    game.cards.length > 0 ? "owned" : "all",
  );
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
  // Le bouton retour d'Android ferme la fiche ouverte avant tout le reste :
  // c'est l'écran du dessus, et c'est ce que le doigt attend.
  useBackHandler(inspect !== null, () => setInspect(null));
  const live = useLive();
  // L'heure ne sert qu'à juger la fraîcheur du direct : une minute de précision
  // suffit (au-delà de dix minutes, tout disparaît de toute façon).
  const now = useNow(60_000);
  // Une page de classeur, ce sont 9 pochettes (3 × 3) : ce qu'un écran de
  // téléphone montre d'un coup, exactement comme on ouvre un classeur.
  const perPage = 9;

  const owned = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        bestVariant: CardVariant;
        variants: Set<CardVariant>;
        /* La copie la plus récente : l'ordre « Dernières obtenues » la lit. */
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
    // Les Sortants que le joueur possède : ils s'affichent à la fin du classeur
    // (leur rang n'est plus comparable aux autres, et ils ne sont plus
    // tirables). Sans filtre « Sortants », ils restent visibles — une carte
    // possédée qui disparaîtrait de son propre classeur serait un bug.
    const retiredCards = RETIRED_CREATORS.filter((creator) => owned.has(creator.slug));
    const matches = (creator: Creator) => {
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
      if (filter === "live") return liveFor(live, creator.login, now) !== null;
      if (filter !== "all") return creator.rarity === filter;
      return true;
    });
    // Le tri s'applique à ce qui reste, puis la pagination coupe : chercher,
    // filtrer et trier donne la même première page, quel que soit l'ordre des
    // gestes. Les Sortants gardent leur place à la fin du classeur : leur rang
    // n'est plus comparable aux autres, et ils ne sont plus tirables.
    const sorted = sortBinder(
      current,
      sort,
      (slug) => owned.get(slug)?.count ?? 0,
      (slug) => owned.get(slug)?.latestAt ?? 0,
    );
    return filter === "all" ? [...sorted, ...retiredCards] : sorted;
  }, [filter, live, now, owned, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const visibleCreators = filtered.slice(
    safePage * perPage,
    (safePage + 1) * perPage,
  );
  const progress = Math.round((game.stats.uniqueCreators / CREATORS.length) * 100);
  // Combien de cartes du classeur ne sont plus tirables : ce sont les Sortants
  // du joueur, et c'est ce que le filtre compte.
  const retiredOwned = useMemo(
    () => [...owned.keys()].filter((slug) => RETIRED_BY_SLUG.has(slug)).length,
    [owned],
  );

  return (
    <div className="view collection-view" style={themeStyle}>
      <section className="page-title-row">
        <div>
          <h1>Mon classeur</h1>
        </div>
        <div className="collection-score">
          <strong>{progress}%</strong>
          <span>complété</span>
        </div>
      </section>

      <div className="progress-track large">
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="collection-meta">
        <span>{game.stats.uniqueCreators} / {CREATORS.length} streameurs découverts</span>
        <span>{game.stats.totalCards} cartes obtenues</span>
      </div>

      {/* La recherche, le tri et les filtres restent **collés sous la barre**
          pendant qu'on feuillette : chercher un créateur après avoir descendu
          trois pages ne devrait pas demander de remonter trois pages. */}
      <div className="binder-tools">
          <label className="search-field">
            <Search size={17} />
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
              <X size={15} />
            </button>
          ) : null}
        </label>

        <label className="sort-field">
          <ArrowDownWideNarrow size={17} />
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

        <div className="filter-chips" aria-label="Filtres de collection">
          {(
            [
              ["all", `Toutes (${CREATORS.length})`],
              ["owned", `Obtenues (${game.stats.uniqueCreators})`],
              // Les Sortants n'apparaissent que s'il y en a : un filtre vide n'a
              // rien à faire dans la barre.
              ...(retiredOwned
                ? ([["retired", `Sortants (${retiredOwned})`]] as [CollectionFilter, string][])
                : []),
              // Le direct n'apparaît que si l'app sait vraiment qui streame : un
              // filtre qui ne peut rien donner n'a rien à faire là.
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
              onClick={() => {
                // **Aucun son.** Le joueur a demandé le 8 octobre 2026 au soir
                // de retirer les deux derniers sons de déplacement, le filtre
                // et la page : changer de filtre, c'est aller ailleurs.
                setFilter(value);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>


      <div className="binder-pager">
        <button
          onClick={() => {
            // **Aucun son** : tourner une page, c'est se déplacer (retiré le
            // 8 octobre 2026 au soir, comme le filtre ci-dessus).
            setPage((p) => Math.max(0, p - 1));
          }}
          disabled={safePage <= 0}
        >
          <ChevronLeft size={15} />
          <span>Précédent</span>
        </button>
        <span>
          Page <strong>{safePage + 1}</strong> sur {totalPages} · {filtered.length} cartes
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={safePage >= totalPages - 1}
        >
          <span>Suivant</span>
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="binder-page">
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
        {!filtered.length ? (
          <div className="no-results">Aucune carte ne correspond à ce filtre.</div>
        ) : null}
      </div>

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
              // Le prix et la règle viennent du moteur (`craftQuote`) : la modale
              // ne décide rien, elle demande.
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

