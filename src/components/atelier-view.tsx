"use client";

import { useMemo, useState } from "react";
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
  RETIRED_CREATORS,
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
  recycleNeedsConfirm,
  type GameView,
} from "@/lib/game-engine";
import { usePoints } from "@/hooks/use-points";

type Mode = "craft" | "recycle";
type CraftFilter = "all" | Rarity;
/** Monnaie de l'atelier : les points du recyclage, ou les jetons des boosters. */
type Wallet = "points" | "tokens";
const PER_PAGE = 20;

/**
 * Atelier : l'exutoire des points. Les doublons se recyclent en points, les
 * points rejoignent les créateurs manquants. Les Légendaires ne s'artisanent
 * pas — elles se méritent en booster (comme les raretés hautes non
 * échangeables de TCG Pocket).
 */
export function AtelierView({
  game,
  onNotice,
  onError,
}: {
  game: GameView;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("craft");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CraftFilter>("all");
  const [page, setPage] = useState(0);
  // Les jetons sont la monnaie lente : 400, le prix unique de la carte visée,
  // contre 45 à 600 points selon la rareté. Deux monnaies, un seul atelier.
  const [wallet, setWallet] = useState<Wallet>("points");
  // Qui paie les points — l'appareil ou le serveur — et le refus quand il n'y a
  // pas de compte (voir `usePoints`).
  const points = usePoints();
  const [bulkBusy, setBulkBusy] = useState(false);
  // Un doublon Live ne part pas sur un clic perdu : on garde la carte en attente
  // et l'écran affiche la question. La variante Live ne se rachète pas.
  const [pendingLive, setPendingLive] = useState<{
    cardId: string;
    name: string;
    value: number;
  } | null>(null);

  const duplicates = useMemo(() => duplicateGroups({ cards: game.cards }), [game.cards]);
  // « Tout recycler » emporte les doublons **sauf les Live** : un doublon Live
  // se recycle un par un, jamais dans un clic qui emporte tout. La sélection
  // vient du moteur (`bulkRecyclableIds`), la même règle que le jeu sans cloud.
  const bulkIds = useMemo(() => bulkRecyclableIds({ cards: game.cards }), [game.cards]);
  const bulkValue = duplicates
    .filter((group) => group.variant !== "live")
    .reduce((sum, group) => sum + group.recyclableIds.length * group.unitValue, 0);
  const liveKept = duplicates
    .filter((group) => group.variant === "live")
    .reduce((sum, group) => sum + group.recyclableIds.length, 0);
  const missingCount = CREATORS.length - game.stats.uniqueCreators;
  // Les Sortants encore artisanables : ils ne sont plus dans le catalogue (donc
  // plus tirables, et hors complétion), mais leur fenêtre est ouverte pendant
  // l'édition de leur départ. Ce sont les dernières cartes à rejoindre.
  const retiredCraftable = useMemo(
    () => craftableRetired().filter((creator) => !game.cards.some((card) => card.creatorSlug === creator.slug)),
    [game.cards],
  );
  const balance = wallet === "tokens" ? game.tokens.count : game.player.points;

  // Combien de créateurs manquants la monnaie choisie peut déjà payer. Les
  // Légendaires ne comptent jamais : elles ne s'artisinent pas, quelle que soit
  // la bourse.
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
    // Les Sortants d'abord : leur fenêtre ferme à la fin de l'édition, alors que
    // le reste du catalogue attendra. Sans ça, ils seraient à la dernière page.
    return [...retiredCraftable, ...CREATORS].filter((creator) => {
      if (game.cards.some((card) => card.creatorSlug === creator.slug)) return false;
      if (q) {
        const hay = `${creator.displayName} ${creator.login} ${creator.category} #${creator.rank}`.toLocaleLowerCase("fr");
        if (!hay.includes(q)) return false;
      }
      if (filter !== "all") return creator.rarity === filter;
      return true;
    });
  }, [filter, game.cards, query, retiredCraftable]);

  const totalPages = Math.max(1, Math.ceil(craftable.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = craftable.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  async function handleCraft(slug: string, displayName: string) {
    try {
      // Qui paie — le serveur ou l'appareil — se décide dans `usePoints` : ici
      // on appelle, puis on affiche.
      if (wallet === "tokens") {
        const done = await points.craft(slug, true);
        if (done.status === "refused") return onError(done.message);
        onNotice(`${displayName} rejoint ton classeur pour ${game.tokens.targetCost} jetons !`);
      } else {
        const done = await points.craft(slug, false);
        if (done.status === "refused") return onError(done.message);
        // Le prix du serveur prime (il le recalcule depuis le catalogue) ; à
        // défaut, celui que la fiche affiche.
        const listed = CREATOR_BY_SLUG.get(slug)?.rarity;
        const price = listed ? RARITY_META[listed].craftCost : null;
        const paid = done.delta !== undefined && done.delta < 0 ? -done.delta : (price ?? 0);
        onNotice(`${displayName} rejoint ton classeur pour ${paid} points !`);
      }
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Artisanat impossible.");
    }
  }

  async function handleRecycle(cardId: string, displayName: string, value: number) {
    try {
      const done = await points.recycle(cardId);
      if (done.status === "refused") return onError(done.message);
      // Le chiffre du serveur prime : il peut avoir déjà payé ce doublon-là
      // (mouvement rejoué après une coupure), et il a versé 0.
      const gained = done.delta ?? value;
      onNotice(
        gained > 0
          ? `Doublon de ${displayName} recyclé : +${gained} points.`
          : `Doublon de ${displayName} déjà recyclé — rien à encaisser.`,
      );
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Recyclage impossible.");
    }
  }

  /**
   * « Tout recycler » : la liste part **carte par carte** par `usePoints`, donc
   * c'est le serveur qui vérifie et paie quand un compte est connecté — sans
   * compte, le geste est refusé au lieu de fabriquer des points sur l'appareil.
   */
  async function handleBulkRecycle() {
    if (bulkBusy || !bulkIds.length) return;
    setBulkBusy(true);
    try {
      const outcome = await points.recycleAll(bulkIds);
      if (outcome.status === "refused") {
        onError(outcome.message ?? "Recyclage impossible.");
        return;
      }
      const parts = [
        outcome.count > 0
          ? `${outcome.count} doublon${outcome.count > 1 ? "s" : ""} transformé${outcome.count > 1 ? "s" : ""} en +${outcome.delta} points`
          : "Aucun doublon à recycler",
        liveKept > 0
          ? `${liveKept} doublon${liveKept > 1 ? "s" : ""} Live à recycler un par un`
          : "",
      ].filter(Boolean);
      if (outcome.message) onError(outcome.message);
      onNotice(`Tout recyclé : ${parts.join(" · ")}.`);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Recyclage impossible.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="view atelier-view">
      <section className="page-title-row">
        <div>
          <h1>Façonne ta collection</h1>
        </div>
        <div className="atelier-wallet">
          {wallet === "tokens" ? <Sparkles size={14} /> : <Coins size={14} />}
          <strong>{balance}</strong>
          <span>{wallet === "tokens" ? "jetons" : "points"}</span>
        </div>
      </section>

      <div className="filter-chips atelier-tabs" aria-label="Mode de l'atelier">
        <button
          className={mode === "craft" ? "active" : ""}
          onClick={() => setMode("craft")}
          aria-pressed={mode === "craft"}
        >
          Rejoindre ({missingCount})
        </button>
        <button
          className={mode === "recycle" ? "active" : ""}
          onClick={() => setMode("recycle")}
          aria-pressed={mode === "recycle"}
        >
          Recycler ({duplicates.reduce((sum, group) => sum + group.recyclableIds.length, 0)})
        </button>
      </div>

      {mode === "craft" ? (
        <>
          <p className="atelier-intro">
            Rejoins un créateur manquant avec tes points. La carte obtenue est toujours
            <strong> Standard</strong> : les variantes Live, Holo et Gold restent la récompense des
            boosters.
          </p>

          {/* Les Sortants : ils ne sont plus dans les boosters, et leur fenêtre
              d'artisanat ferme avec l'édition en cours. C'est la seule chose de
              l'écran qui a une date limite — donc la seule qu'on annonce. */}
          {retiredCraftable.length > 0 ? (
            <p className="atelier-retired-note">
              <Clock size={14} />
              <span>
                {retiredCraftable.length} Sortant{retiredCraftable.length > 1 ? "s" : ""} encore
                artisanable{retiredCraftable.length > 1 ? "s" : ""} : ils ne sortent plus en
                booster, et leur fenêtre ferme à la fin de l&apos;édition.
              </span>
            </p>
          ) : null}

          {/* Deux monnaies : les points du recyclage (45 à 600 selon la
              rareté), ou les jetons gagnés en ouvrant des boosters — 400, quel
              que soit le créateur visé. Les deux butent sur la même limite :
              une Légendaire ne s'achète pas, elle se tire. */}
          <div className="filter-chips wallet-chips" aria-label="Monnaie">
            <button
              className={wallet === "points" ? "active" : ""}
              onClick={() => setWallet("points")}
              aria-pressed={wallet === "points"}
            >
              Points ({game.player.points})
            </button>
            <button
              className={wallet === "tokens" ? "active" : ""}
              onClick={() => setWallet("tokens")}
              aria-pressed={wallet === "tokens"}
            >
              Jetons ({game.tokens.count}/{game.tokens.targetCost})
            </button>
          </div>
          {/* Ce que la bourse ouvre, tout de suite : le joueur voit combien de
              créateurs manquants il peut déjà rejoindre, sans essayer carte par
              carte. Le compte suit la monnaie choisie. */}
          <p className="wallet-note">
            {affordableCount > 0
              ? `${affordableCount} créateur${affordableCount > 1 ? "s" : ""} manquant${affordableCount > 1 ? "s" : ""} à ta portée avec ${wallet === "tokens" ? "tes jetons" : "tes points"}.`
              : wallet === "tokens"
                ? `Encore ${Math.max(0, game.tokens.targetCost - game.tokens.count)} jetons avant la première carte.`
                : "Aucun créateur à ta portée pour l'instant — recycle des doublons."}
          </p>
          {wallet === "tokens" ? (
            <p className="wallet-note">
              {game.tokens.missing > 0
                ? `Encore ${game.tokens.missing} jetons — ${game.tokens.perPack} par booster${
                    game.tokens.primeTime ? " (Prime Time en cours)" : ""
                  }.`
                : "De quoi rejoindre la carte que tu veux, sauf une Légendaire."}
            </p>
          ) : null}

          <label className="search-field">
            <Search size={17} />
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
                <X size={15} />
              </button>
            ) : null}
          </label>

          <div className="filter-chips" aria-label="Filtres de rareté">
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

          <div className="binder-pager">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage <= 0}>
              <ChevronLeft size={15} />
              <span>Précédent</span>
            </button>
            <span>
              Page <strong>{safePage + 1}</strong> / {totalPages} · {craftable.length} manquants
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              <span>Suivant</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="atelier-list">
            {visible.map((creator) => {
              const meta = RARITY_META[creator.rarity];
              // En jetons, le prix est le même pour tous : la carte visée.
              const cost = wallet === "tokens" ? game.tokens.targetCost : meta.craftCost;
              const affordable = cost !== null && balance >= cost;
              const buyable = wallet === "tokens" ? meta.craftable : meta.craftable && cost !== null;
              return (
                <article key={creator.slug} className="atelier-row">
                  <Image
                    className="atelier-thumb"
                    src={creatorImage(creator)}
                    alt=""
                    width={44}
                    height={44}
                    quality={80}
                    sizes="44px"
                  />
                  <div className="atelier-copy">
                    <strong>{creator.displayName}</strong>
                    <span>
                      #{creator.rank} · {regionLabel(creator.region)}
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
          <p className="atelier-intro">
            Recycle tes doublons en points. Une carte n&apos;est recyclable que si tu en possèdes au
            moins deux de la même variante — on ne touche jamais à ta dernière copie. Un doublon{" "}
            <strong>Live</strong> demande confirmation : cette variante-là ne se rachète pas.
          </p>

          {duplicates.length ? (
            <>
              <div className="atelier-bulk-actions">
                <button
                  type="button"
                  className="craft-button recycle"
                  onClick={handleBulkRecycle}
                  disabled={bulkBusy || !bulkIds.length}
                  title={`Recycler tous les doublons (${bulkIds.length}) pour ${bulkValue} points — les Live restent en place`}
                >
                  <Recycle size={13} />
                  {bulkBusy ? "Recyclage…" : `Tout recycler · +${bulkValue}`}
                </button>
                {liveKept > 0 ? (
                  <span className="atelier-bulk-note">
                    {liveKept} doublon{liveKept > 1 ? "s" : ""} Live à recycler un par un
                  </span>
                ) : null}
              </div>

              <div className="atelier-list">
                {duplicates.map((group) => {
                  const creator = CREATOR_BY_SLUG.get(group.creatorSlug);
                  if (!creator) return null;
                  return (
                    <article key={`${group.creatorSlug}-${group.variant}`} className="atelier-row">
                      <Image
                        className="atelier-thumb"
                        src={creatorImage(creator)}
                        alt=""
                        width={44}
                        height={44}
                        quality={80}
                        sizes="44px"
                      />
                      <div className="atelier-copy">
                        <strong>{creator.displayName}</strong>
                        <span>
                          {VARIANT_META[group.variant].label} · {RARITY_META[group.rarity].label} ·
                          ×{group.count}
                        </span>
                      </div>
                      {recycleNeedsConfirm(group.variant) ? (
                        pendingLive?.cardId === group.recyclableIds[0] ? (
                          <div className="atelier-confirm">
                            <span>Recycler ce doublon Live ?</span>
                            <button
                              type="button"
                              className="craft-button recycle"
                              onClick={() => {
                                const pending = pendingLive;
                                setPendingLive(null);
                                if (pending) handleRecycle(pending.cardId, pending.name, pending.value);
                              }}
                            >
                              Oui, +{group.unitValue}
                            </button>
                            <button
                              type="button"
                              className="craft-button"
                              onClick={() => setPendingLive(null)}
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="craft-button recycle"
                            onClick={() =>
                              setPendingLive({
                                cardId: group.recyclableIds[0],
                                name: creator.displayName,
                                value: group.unitValue,
                              })
                            }
                            title={`Recycler un doublon Live de ${creator.displayName} — confirmation demandée`}
                          >
                            <Recycle size={13} />+{group.unitValue}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className="craft-button recycle"
                          onClick={() =>
                            handleRecycle(group.recyclableIds[0], creator.displayName, group.unitValue)
                          }
                          title={`Recycler un doublon de ${creator.displayName}`}
                        >
                          <Recycle size={13} />+{group.unitValue}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-collection">
              <Sparkles size={25} />
              <div>
                <strong>Aucun doublon pour l&apos;instant</strong>
                <span>
                  Ouvre des boosters : les doublons apparaissent vite et se transforment ici en
                  points.
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
