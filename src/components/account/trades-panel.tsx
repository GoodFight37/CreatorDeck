/**
 * Les échanges entre joueurs.
 *
 * Séparé de la feuille de compte (`account-sheet.tsx`) parce que c'est un
 * panneau à part entière : il a son propre formulaire, sa propre recherche de
 * joueur et sa propre liste de réponses, et rien de tout cela ne regarde le
 * compte lui-même.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, RefreshCw, Search, UserSearch, X } from "lucide-react";
import type { AccountFocus } from "@/lib/account-display";
import { useCloud } from "@/hooks/use-cloud";
import { useGame } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import type { PlayerSearchResult, TradeCard, TradeStatus } from "@/lib/cloud/api";
import { describeCards } from "@/lib/cloud/trades";
import { tradeRadarMatches, type RadarWish } from "@/lib/trade-radar";
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

/**
 * Vingt-quatre cartes par page dans « Tu donnes ».
 *
 * Un joueur qui a mis mille cartes de côté en possède des centaines de
 * distinctes : les poser toutes d'un coup dans le DOM, c'est cent fois le travail
 * de rendu pour une liste dont on ne regarde jamais plus que le premier écran.
 * Et les tronquer en silence, c'est pire : la carte 25 existait, mais le joueur
 * ne pouvait ni la voir ni la choisir. Vingt-quatre par page, avec le pager du
 * classeur, et la phrase dit toujours où l'on est.
 */
const GIVEN_PER_PAGE = 24;

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
export function TradesPanel({ focus = null }: { focus?: AccountFocus }) {
  const cloud = useCloud();
  const state = useGame();
  const [playerQuery, setPlayerQuery] = useState("");
  // Le panneau est replié par défaut : c'est un panneau, pas la première chose
  // qu'on lit. Il s'ouvre quand on **arrive** dessus — une offre annoncée par le
  // carnet, qui a promis une offre à répondre et pas un sommaire à déplier — et
  // il reste refermable : l'ouverture n'est pas un cadenas.
  //
  // L'état suit la section visée *pendant le rendu* (`arrivee`), le motif que
  // React documente pour « une prop a changé » : pas d'effet qui écrit de
  // l'état, donc pas de rendu en cascade — et le joueur peut refermer le
  // panneau sans qu'il se rouvre tout seul.
  const [arrivee, setArrivee] = useState<AccountFocus>(focus);
  const [ouvert, setOuvert] = useState(focus === "trades");
  if (arrivee !== focus) {
    setArrivee(focus);
    setOuvert(focus === "trades");
  }
  const panneau = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    // Le seul effet : **montrer** l'endroit. Le défilement est une affaire de
    // navigateur, pas d'état React.
    if (focus === "trades") panneau.current?.scrollIntoView({ block: "start" });
  }, [focus]);
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [partner, setPartner] = useState<PlayerSearchResult | null>(null);
  const [given, setGiven] = useState<string[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [givenQuery, setGivenQuery] = useState("");
  const [wantedQuery, setWantedQuery] = useState("");
  const [variants, setVariants] = useState<Record<string, string[]>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const variantsGeneration = useRef(0);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [radarWishes, setRadarWishes] = useState<RadarWish[] | null>(null);
  const [radarOwner, setRadarOwner] = useState(cloud.userId);
  const [radarScanned, setRadarScanned] = useState(0);
  const [radarMessage, setRadarMessage] = useState<string | null>(null);
  const [radarBusy, setRadarBusy] = useState(false);
  const radarGeneration = useRef(0);
  const wantedInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    radarGeneration.current += 1;
    variantsGeneration.current += 1;
    return () => { radarGeneration.current += 1; variantsGeneration.current += 1; };
  }, [cloud.userId]);

  function changePartner(next: PlayerSearchResult | null) {
    variantsGeneration.current += 1;
    setLoadingSlug(null);
    setPartner(next);
  }

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
  const hasDuplicates = (state?.cards.length ?? 0) > myCards.length;
  const visibleRadarWishes = radarOwner === cloud.userId ? radarWishes : null;
  const visibleRadarScanned = radarOwner === cloud.userId ? radarScanned : 0;
  const visibleRadarMessage = radarOwner === cloud.userId ? radarMessage : null;
  const visibleRadarBusy = radarOwner === cloud.userId && radarBusy;
  const radarMatches = useMemo(
    () => tradeRadarMatches(state?.cards ?? [], visibleRadarWishes ?? []),
    [state, visibleRadarWishes],
  );

  async function scanRadar() {
    if (visibleRadarBusy || !hasDuplicates) return;
    setRadarOwner(cloud.userId);
    setRadarWishes(null);
    setRadarScanned(0);
    setRadarBusy(true);
    setRadarMessage(null);
    const generation = radarGeneration.current;
    try {
      const result = await cloudStore.tradeRadar();
      if (generation !== radarGeneration.current) return;
      setRadarWishes(result.wishes);
      setRadarScanned(result.scanned);
      setRadarMessage(result.message);
    } finally { if (generation === radarGeneration.current) setRadarBusy(false); }
  }

  function prepareRadarOffer(match: (typeof radarMatches)[number]) {
    if (partner?.userId === match.friend.friendId && given.length >= TRADE_PICK_LIMIT && !given.includes(match.key)) {
      setRadarMessage("Retire une carte de ton offre avant d'ajouter cette piste.");
      return;
    }
    if (partner && partner.userId !== match.friend.friendId && (given.length || wanted.length) &&
      !window.confirm("Changer de partenaire efface les cartes déjà choisies pour cette offre. Continuer ?")) return;
    const samePartner = partner?.userId === match.friend.friendId;
    changePartner({ userId: match.friend.friendId, displayName: match.friend.friendName, level: 0, uniqueCreators: 0 });
    setGiven(samePartner ? [...new Set([...given, match.key])] : [match.key]);
    setGivenQuery(match.slug);
    setGivenPage(0);
    if (!samePartner) { setWanted([]); setVariants({}); }
    window.setTimeout(() => { wantedInput.current?.scrollIntoView?.({ block: "center" }); wantedInput.current?.focus(); }, 0);
  }

  // La page de « Tu donnes » : l'état vit ici parce que la recherche la remet
  // à zéro (voir `onChange` plus bas) — la page 3 d'une autre recherche ne veut
  // rien dire, exactement comme la page 4 d'un autre tri au classement.
  const [givenPage, setGivenPage] = useState(0);

  const givenMatches = useMemo(() => {
    const needle = givenQuery.trim().toLocaleLowerCase("fr");
    return myCards.filter((card) => {
      if (!needle) return true;
      const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
      return `${card.creatorSlug} ${creator?.displayName ?? ""} ${creator?.login ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(needle);
    });
  }, [myCards, givenQuery]);

  const givenPages = Math.max(1, Math.ceil(givenMatches.length / GIVEN_PER_PAGE));
  const givenSafePage = Math.min(givenPage, givenPages - 1);
  const givenResults = useMemo(
    () => givenMatches.slice(givenSafePage * GIVEN_PER_PAGE, (givenSafePage + 1) * GIVEN_PER_PAGE),
    [givenMatches, givenSafePage],
  );

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
    const generation = variantsGeneration.current;
    void cloudStore
      .playerVariants(partner.userId, slug)
      .then((result) => {
        if (generation !== variantsGeneration.current) return;
        setVariants((current) => ({ ...current, [slug]: result.variants }));
        if (result.message) setSearchMessage(result.message);
      })
      .finally(() => { if (generation === variantsGeneration.current) setLoadingSlug(null); });
  }

  const ready = Boolean(partner) && given.length > 0 && wanted.length > 0;

  async function propose() {
    if (!partner || !ready || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const outcome = await cloudStore.proposeTrade(
        partner.userId,
        given.map((key) => {
          const [creatorSlug, variant] = key.split("|");
          return { creatorSlug, variant };
        }),
        wanted.map((key) => {
          const [creatorSlug, variant] = key.split("|");
          return { creatorSlug, variant };
        }),
      );
      if (outcome.status === "done") {
        setGiven([]);
        setWanted([]);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const open = cloud.trades.filter((trade) => trade.status === "open");
  const resolved = cloud.trades.filter((trade) => trade.status !== "open").slice(0, 5);
  const names = useMemo(() => new Map([...CREATOR_BY_SLUG].map(([slug, creator]) => [slug, creator.displayName])), []);

  return (
    <details
      className="account-details trade-details"
      ref={panneau}
      open={ouvert}
      onToggle={(event) => setOuvert(event.currentTarget.open)}
    >
      <summary>
        <ArrowLeftRight size={12} /> Échanges
        {open.length ? <span className="account-count">{open.length}</span> : null}
      </summary>
      <p className="account-hint">
        L&apos;échange se fait d&apos;un seul coup, des deux côtés à la fois : une offre acceptée ne peut ni voler ni
        dupliquer une carte. Les points, l&apos;XP et les boosters ne bougent pas — seules les cartes changent de
        main.
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

      <section className="trade-radar" aria-label="Trade Radar">
        <div className="trade-radar-head">
          <div><h3>Trade Radar</h3><p>Les souhaits publics de tes amis qui correspondent à tes variantes en double.</p></div>
          <button type="button" className="account-button" disabled={visibleRadarBusy || cloud.busy || !hasDuplicates} onClick={() => void scanRadar()}>
            <Search size={13} /> {visibleRadarBusy ? "Recherche…" : visibleRadarWishes ? "Relancer le radar" : "Lancer le radar"}
          </button>
        </div>
        {!hasDuplicates ? <p className="account-hint">Garde au moins deux exemplaires d’une même variante pour proposer une carte.</p> : null}
        {visibleRadarMessage ? <p className="account-hint account-warning" role="status">{visibleRadarMessage}</p> : null}
        {visibleRadarWishes !== null ? (
          <div aria-live="polite">
            <p className="account-hint">{visibleRadarScanned} ami{visibleRadarScanned > 1 ? "s" : ""} consulté{visibleRadarScanned > 1 ? "s" : ""} · {radarMatches.length} piste{radarMatches.length > 1 ? "s" : ""}</p>
            {radarMatches.length ? <ul className="trade-radar-list">{radarMatches.map((match) => (
              <li key={`${match.friend.friendId}-${match.key}`}>
                <div><b>{match.friend.friendName}</b><span>cherche {CREATOR_BY_SLUG.get(match.slug)?.displayName ?? match.slug} · {VARIANT_META[match.variant].label} ×{match.copies} chez toi</span></div>
                <button type="button" className="account-button" disabled={cloud.busy} onClick={() => prepareRadarOffer(match)}>Préparer l&apos;offre</button>
              </li>
            ))}</ul> : !visibleRadarMessage ? <p className="account-hint">{visibleRadarScanned ? "Aucun souhait ne correspond à tes cartes en double." : "Aucun ami à consulter pour le moment."}</p> : null}
          </div>
        ) : null}
        <p className="account-hint">Le radar montre les souhaits de tes amis, pas leurs cartes. Choisis ce que tu demandes avant de proposer l’échange.</p>
      </section>

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
                  changePartner(player);
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
                  changePartner(null);
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
                onChange={(event) => {
                  // Une recherche ramène toujours à la première page : la
                  // page 3 d'une autre recherche ne veut rien dire.
                  setGivenPage(0);
                  setGivenQuery(event.target.value);
                }}
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
            {/* Le pager du classeur, réemployé : deux flèches et une phrase. Il
                n'apparaît que s'il y a vraiment plusieurs pages — et la phrase
                compte les **cartes trouvées**, pas celles de la page : sur une
                collection de mille cartes, c'est la seule façon de savoir que
                l'on n'en voit qu'un morceau. */}
            {givenPages > 1 ? (
              <div className="binder-pager">
                <button
                  type="button"
                  onClick={() => setGivenPage(Math.max(0, givenSafePage - 1))}
                  disabled={givenSafePage <= 0}
                >
                  <ChevronLeft size={15} />
                  <span>Précédent</span>
                </button>
                <span>
                  Cartes <strong>{givenSafePage * GIVEN_PER_PAGE + 1}</strong>–
                  <strong>{Math.min(givenMatches.length, (givenSafePage + 1) * GIVEN_PER_PAGE)}</strong> sur{" "}
                  {givenMatches.length}
                </span>
                <button
                  type="button"
                  onClick={() => setGivenPage(Math.min(givenPages - 1, givenSafePage + 1))}
                  disabled={givenSafePage >= givenPages - 1}
                >
                  <span>Suivant</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : null}

            <label className="account-field">
              <span>
                <Search size={10} /> Tu demandes ({wanted.length}/{TRADE_PICK_LIMIT})
              </span>
              <input
                ref={wantedInput}
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
              <button type="button" className="account-button" disabled={cloud.busy || submitting || !ready} onClick={() => void propose()}>
                <ArrowLeftRight size={13} /> Proposer l&apos;échange
              </button>
            </div>
            <p className="account-hint">
              Une carte contre une carte (jusqu&apos;à cinq de chaque côté). Ta collection est synchronisée avant la
              proposition pour vérifier les cartes que tu donnes. Une offre reste valable jusqu&apos;à ce que le joueur
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
