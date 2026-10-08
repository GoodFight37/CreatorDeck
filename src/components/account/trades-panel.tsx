/**
 * Les échanges entre joueurs.
 *
 * Séparé de la feuille de compte (`account-sheet.tsx`) parce que c'est un
 * panneau à part entière : il a son propre formulaire, sa propre recherche de
 * joueur et sa propre liste de réponses, et rien de tout cela ne regarde le
 * compte lui-même.
 */
"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeftRight, Check, RefreshCw, Search, UserSearch, X } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useGame } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import type { PlayerSearchResult, TradeCard, TradeStatus } from "@/lib/cloud/api";
import { describeCards } from "@/lib/cloud/trades";
import {
  CREATORS,
  CREATOR_BY_SLUG,
  VARIANT_META,
  RARITY_META,
  type CardVariant,
} from "@/lib/catalog";

const TRADE_QUERY_MIN = 2;
const TRADE_PICK_LIMIT = 5;
const TRADE_RESULT_LIMIT = 8;

const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  open: "en attente",
  accepted: "accepté",
  declined: "refusé",
  cancelled: "annulé",
};

/** Une carte d'échange, écrite comme dans le classeur : nom puis variante. */
function TradeCardTag({ card }: { card: TradeCard }) {
  const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
  const rarity = creator ? RARITY_META[creator.rarity] : null;
  const style = rarity
    ? ({ "--rarity": rarity.color, "--rarity-glow": rarity.glow } as CSSProperties)
    : undefined;
  return (
    <span className="trade-card" style={style}>
      <b>{creator?.displayName ?? card.creatorSlug}</b>
      <em>{VARIANT_META[card.variant as CardVariant]?.label ?? card.variant}</em>
    </span>
  );
}

/**
 * Échanges entre joueurs.
 *
 * Le serveur arbitre tout : il relit les deux collections avant de déplacer
 * une carte, dans une seule transaction. Ici on ne fait que composer l'offre
 * (une carte contre une carte, jusqu'à cinq de chaque côté) et afficher les
 * réponses.
 *
 * Deux cartes ne s'échangent pas à l'aveugle : demander la variante Gold d'un
 * créateur que le partenaire n'a qu'en Standard ne peut pas aboutir. Le serveur
 * répond donc, créateur par créateur, quelles variantes le partenaire possède
 * — jamais sa collection entière.
 */
export function TradesPanel() {
  const cloud = useCloud();
  const state = useGame();
  const [playerQuery, setPlayerQuery] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [partner, setPartner] = useState<PlayerSearchResult | null>(null);
  const [given, setGiven] = useState<string[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [givenQuery, setGivenQuery] = useState("");
  const [wantedQuery, setWantedQuery] = useState("");
  const [variants, setVariants] = useState<Record<string, string[]>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  // Mes cartes, une entrée par couple créateur + variante : la même carte en
  // double ne se propose pas deux fois dans une offre (le serveur la refuse).
  const myCards = useMemo(() => {
    const seen = new Set<string>();
    const list: { key: string; creatorSlug: string; variant: CardVariant }[] = [];
    for (const card of state?.cards ?? []) {
      const key = `${card.creatorSlug}|${card.variant}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ key, creatorSlug: card.creatorSlug, variant: card.variant });
    }
    return list;
  }, [state]);

  const givenResults = useMemo(() => {
    const needle = givenQuery.trim().toLocaleLowerCase("fr");
    return myCards
      .filter((card) => {
        if (!needle) return true;
        const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
        return `${card.creatorSlug} ${creator?.displayName ?? ""} ${creator?.login ?? ""}`
          .toLocaleLowerCase("fr")
          .includes(needle);
      })
      .slice(0, 24);
  }, [myCards, givenQuery]);

  // Catalogue entier : on peut demander un créateur qu'on ne possède pas encore.
  const wantedResults = useMemo(() => {
    const needle = wantedQuery.trim().toLocaleLowerCase("fr");
    if (needle.length < TRADE_QUERY_MIN) return [];
    return CREATORS.filter((creator) =>
      `${creator.slug} ${creator.displayName} ${creator.login}`.toLocaleLowerCase("fr").includes(needle),
    ).slice(0, TRADE_RESULT_LIMIT);
  }, [wantedQuery]);

  function toggle(list: string[], key: string, setList: (next: string[]) => void) {
    if (list.includes(key)) setList(list.filter((item) => item !== key));
    else if (list.length < TRADE_PICK_LIMIT) setList([...list, key]);
  }

  /** Charge (une fois) les variantes possédées par le partenaire pour un créateur. */
  function loadVariants(slug: string) {
    if (!partner || variants[slug] || loadingSlug) return;
    setLoadingSlug(slug);
    void cloudStore
      .playerVariants(partner.userId, slug)
      .then((result) => {
        setVariants((current) => ({ ...current, [slug]: result.variants }));
        if (result.message) setSearchMessage(result.message);
      })
      .finally(() => setLoadingSlug(null));
  }

  const ready = Boolean(partner) && given.length > 0 && wanted.length > 0;

  function propose() {
    if (!partner) return;
    void cloudStore
      .proposeTrade(
        partner.userId,
        given.map((key) => {
          const [creatorSlug, variant] = key.split("|");
          return { creatorSlug, variant };
        }),
        wanted.map((key) => {
          const [creatorSlug, variant] = key.split("|");
          return { creatorSlug, variant };
        }),
      )
      .then((outcome) => {
        if (outcome.status === "done") {
          setGiven([]);
          setWanted([]);
        }
      });
  }

  const open = cloud.trades.filter((trade) => trade.status === "open");
  const resolved = cloud.trades.filter((trade) => trade.status !== "open").slice(0, 5);
  const names = useMemo(() => new Map([...CREATOR_BY_SLUG].map(([slug, creator]) => [slug, creator.displayName])), []);

  return (
    <details className="account-details trade-details">
      <summary>
        <ArrowLeftRight size={12} /> Échanges
        {open.length ? <span className="account-count">{open.length}</span> : null}
      </summary>
      <p className="account-hint">
        Le serveur relit les deux collections puis déplace les cartes des deux côtés dans la même transaction : une
        offre acceptée ne peut ni voler ni dupliquer une carte. Les points, l&apos;XP et les boosters ne bougent pas —
        seules les cartes changent de main.
      </p>

      <div className="account-actions">
        <button type="button" className="account-button ghost" disabled={cloud.busy} onClick={() => void cloudStore.loadTrades()}>
          <RefreshCw size={13} /> Actualiser mes offres
        </button>
      </div>

      <div className="trade-offers">
        {open.length ? (
          open.map((trade) => (
            <div className="trade-offer" key={trade.id}>
              <div className="trade-offer-head">
                <b>
                  {trade.direction === "in" ? `${trade.partnerName} te propose` : `Tu proposes à ${trade.partnerName}`}
                </b>
              </div>
              <div className="trade-pair">
                <span className="trade-side">
                  <em>Tu donnes</em>
                  {trade.given.map((card, index) => (
                    <TradeCardTag card={card} key={`${trade.id}-given-${index}`} />
                  ))}
                </span>
                <ArrowLeftRight size={14} />
                <span className="trade-side">
                  <em>Tu reçois</em>
                  {trade.received.map((card, index) => (
                    <TradeCardTag card={card} key={`${trade.id}-received-${index}`} />
                  ))}
                </span>
              </div>
              <div className="account-actions">
                {trade.direction === "in" ? (
                  <>
                    <button
                      type="button"
                      className="account-button"
                      disabled={cloud.busy}
                      onClick={() => void cloudStore.respondTrade(trade.id, true)}
                    >
                      <Check size={13} /> Accepter
                    </button>
                    <button
                      type="button"
                      className="account-button ghost"
                      disabled={cloud.busy}
                      onClick={() => void cloudStore.respondTrade(trade.id, false)}
                    >
                      <X size={13} /> Refuser
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="account-button ghost"
                    disabled={cloud.busy}
                    onClick={() => void cloudStore.cancelTrade(trade.id)}
                  >
                    <X size={13} /> Annuler l&apos;offre
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="account-hint">Aucune offre en attente.</p>
        )}

        {resolved.length ? (
          <ul className="trade-history">
            {resolved.map((trade) => (
              <li key={trade.id}>
                <b>{trade.direction === "in" ? trade.partnerName : `Toi → ${trade.partnerName}`}</b>
                <span>
                  {describeCards(trade.given, names)} contre {describeCards(trade.received, names)}
                </span>
                <em className={`trade-status ${trade.status}`}>{TRADE_STATUS_LABEL[trade.status]}</em>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="trade-builder">
        <label className="account-field">
          <span>
            <UserSearch size={10} /> Chercher un joueur (pseudo, 2 lettres minimum)
          </span>
          <div className="trade-search">
            <input
              type="search"
              placeholder="Pseudo au classement"
              value={playerQuery}
              onChange={(event) => setPlayerQuery(event.target.value)}
            />
            <button
              type="button"
              className="account-button"
              disabled={cloud.busy || playerQuery.trim().length < TRADE_QUERY_MIN}
              onClick={() =>
                void cloudStore.searchPlayers(playerQuery.trim()).then((result) => {
                  setPlayers(result.players);
                  setSearchMessage(result.message);
                })
              }
            >
              <Search size={13} /> Chercher
            </button>
          </div>
        </label>
        {players.length ? (
          <div className="trade-players">
            {players.map((player) => (
              <button
                type="button"
                key={player.userId}
                className={`trade-player${partner?.userId === player.userId ? " on" : ""}`}
                aria-pressed={partner?.userId === player.userId}
                onClick={() => {
                  setPartner(player);
                  setVariants({});
                  setWanted([]);
                }}
              >
                <b>{player.displayName}</b>
                <span>
                  niveau {player.level} · {player.uniqueCreators} créateurs
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {searchMessage ? <p className="account-hint">{searchMessage}</p> : null}

        {partner ? (
          <>
            <div className="trade-partner">
              <ArrowLeftRight size={13} />
              <b>{partner.displayName}</b>
              <button
                type="button"
                className="account-refresh"
                aria-label="Changer de partenaire"
                onClick={() => {
                  setPartner(null);
                  setVariants({});
                  setWanted([]);
                  setGiven([]);
                }}
              >
                <X size={13} />
              </button>
            </div>

            <label className="account-field">
              <span>
                <Search size={10} /> Tu donnes ({given.length}/{TRADE_PICK_LIMIT})
              </span>
              <input
                type="search"
                placeholder="Une de tes cartes"
                value={givenQuery}
                onChange={(event) => setGivenQuery(event.target.value)}
              />
            </label>
            <div className="trade-pick" role="group" aria-label="Cartes que tu donnes">
              {givenResults.map((card) => {
                const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
                const selected = given.includes(card.key);
                return (
                  <button
                    type="button"
                    key={card.key}
                    className={`trade-choice${selected ? " on" : ""}`}
                    aria-pressed={selected}
                    disabled={!selected && given.length >= TRADE_PICK_LIMIT}
                    onClick={() => toggle(given, card.key, setGiven)}
                  >
                    <b>{creator?.displayName ?? card.creatorSlug}</b>
                    <em>{VARIANT_META[card.variant]?.label ?? card.variant}</em>
                  </button>
                );
              })}
              {!givenResults.length ? (
                <p className="account-hint">
                  {myCards.length ? "Aucune carte ne correspond à cette recherche." : "Ta collection est vide : ouvre un booster d'abord."}
                </p>
              ) : null}
            </div>

            <label className="account-field">
              <span>
                <Search size={10} /> Tu demandes ({wanted.length}/{TRADE_PICK_LIMIT})
              </span>
              <input
                type="search"
                placeholder="N'importe quel créateur du catalogue"
                value={wantedQuery}
                onChange={(event) => setWantedQuery(event.target.value)}
              />
            </label>
            <div className="trade-pick" role="group" aria-label="Créateurs demandés">
              {wantedResults.map((creator) => {
                const owned = variants[creator.slug];
                return (
                  <div className="trade-wanted" key={creator.slug}>
                    <button
                      type="button"
                      className="trade-choice"
                      disabled={loadingSlug === creator.slug}
                      onClick={() => loadVariants(creator.slug)}
                    >
                      <b>{creator.displayName}</b>
                      <em>{RARITY_META[creator.rarity].label}</em>
                    </button>
                    {loadingSlug === creator.slug ? <span className="account-hint">Vérification…</span> : null}
                    {owned ? (
                      owned.length ? (
                        <div className="trade-variants" role="group" aria-label={`Variantes possédées de ${creator.displayName}`}>
                          {owned.map((variant) => {
                            const key = `${creator.slug}|${variant}`;
                            const selected = wanted.includes(key);
                            return (
                              <button
                                type="button"
                                key={key}
                                className={`studio-chip${selected ? " active" : ""}`}
                                aria-pressed={selected}
                                disabled={!selected && wanted.length >= TRADE_PICK_LIMIT}
                                onClick={() => toggle(wanted, key, setWanted)}
                              >
                                {VARIANT_META[variant as CardVariant]?.label ?? variant}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="account-hint">Ne possède pas ce créateur (d&apos;après sa dernière sauvegarde).</span>
                      )
                    ) : null}
                  </div>
                );
              })}
              {wantedQuery.trim().length >= TRADE_QUERY_MIN && !wantedResults.length ? (
                <p className="account-hint">Aucun créateur ne correspond à cette recherche.</p>
              ) : null}
              {wantedQuery.trim().length < TRADE_QUERY_MIN ? (
                <p className="account-hint">
                  Deux lettres suffisent pour chercher un créateur. Touche-le pour voir les variantes que ton
                  partenaire possède.
                </p>
              ) : null}
            </div>

            <div className="account-actions">
              <button type="button" className="account-button" disabled={cloud.busy || !ready} onClick={propose}>
                <ArrowLeftRight size={13} /> Proposer l&apos;échange
              </button>
            </div>
            <p className="account-hint">
              Une carte contre une carte (jusqu&apos;à cinq de chaque côté). Ta collection est envoyée au cloud juste
              avant : c&apos;est elle que le serveur vérifie. Une offre reste valable jusqu&apos;à ce que le joueur
              réponde ou que tu l&apos;annules.
            </p>
          </>
        ) : (
          <p className="account-hint">Cherche un joueur au classement pour lui proposer un échange.</p>
        )}
      </div>
    </details>
  );
}
