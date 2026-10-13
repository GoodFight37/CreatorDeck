"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DEMO_CARDS,
  DEMO_RANKINGS,
  type DemoCard,
  type DemoRanking,
  type DemoUniverseId,
} from "./demo-data";
import styles from "./page.module.css";

type UniverseFilter = "all" | DemoUniverseId;

type FilterOption = {
  id: UniverseFilter;
  label: string;
  accessibleLabel: string;
};

const FILTER_OPTIONS: FilterOption[] = [
  { id: "all", label: "Tout", accessibleLabel: "Afficher tout le classeur" },
  { id: "twitch", label: "Twitch", accessibleLabel: "Afficher les créateurs Twitch" },
  { id: "fiction", label: "Fiction", accessibleLabel: "Afficher Fiction, personnages fictifs" }
];

const ARTWORK_CLASSES: Record<DemoCard["artwork"], string> = {
  aurora: styles.artAurora,
  orbit: styles.artOrbit,
  prism: styles.artPrism,
  tide: styles.artTide,
  signal: styles.artSignal,
  ember: styles.artEmber,
  petal: styles.artPetal,
  eclipse: styles.artEclipse,
  mosaic: styles.artMosaic,
  comet: styles.artComet,
};

function RankingPanel({
  ranking,
  onViewUniverse,
}: {
  ranking: DemoRanking;
  onViewUniverse: (universeId: DemoUniverseId) => void;
}) {
  const titleId = `classement-${ranking.universeId}`;
  const universeName = ranking.universeId === "twitch" ? "des créateurs Twitch" : "des personnages de Velune";
  const completion = Math.round((ranking.collectedCards / ranking.totalCards) * 100);

  return (
    <section
      className={styles.rankingPanel}
      data-universe={ranking.universeId}
      aria-labelledby={titleId}
    >
      <div className={styles.rankingTopline}>
        <span className={styles.rankingEyebrow}>{ranking.eyebrow}</span>
        <span className={styles.rankingSeal} aria-hidden="true">
          {ranking.universeId === "twitch" ? "01" : "02"}
        </span>
      </div>
      <h3 className={styles.rankingTitle} id={titleId}>{ranking.title}</h3>
      <p className={styles.rankingDescription}>{ranking.description}</p>

      <div className={styles.rankListHeading}>
        <span>Extrait du classement</span>
        <span>Cartes</span>
      </div>
      <ol className={styles.rankList} aria-label={`Extrait du classement ${ranking.title}`}>
        {ranking.leaders.map((collector) => (
          <li className={styles.rankRow} key={collector.rank}>
            <span className={styles.rankPosition}>
              #{String(collector.rank).padStart(2, "0")}
            </span>
            <span className={styles.collectorName}>{collector.name}</span>
            <span className={styles.collectorCount}>
              {collector.collectedCards}/{collector.totalCards}
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.myRank}>
        <div className={styles.myRankHeading}>
          <span>Ton classeur démo</span>
          <span className={styles.myRankNumber}>
            #{String(ranking.yourRank).padStart(2, "0")}
            <span> / {ranking.rankedCollectors}</span>
          </span>
        </div>
        <progress
          className={styles.progress}
          max={100}
          value={completion}
          aria-label={`${ranking.title} : ${ranking.collectedCards} cartes sur ${ranking.totalCards} dans le classeur, ${completion} pour cent`}
        />
        <div className={styles.progressCaption}>
          <span>{ranking.collectedCards} / {ranking.totalCards} cartes</span>
          <span>{completion} %</span>
        </div>
      </div>

      <p className={styles.rankFootnote}>
        Rang calculé uniquement dans l’univers {universeName}.
      </p>
      <button
        className={styles.viewUniverseButton}
        type="button"
        onClick={() => onViewUniverse(ranking.universeId)}
      >
        Voir les cartes de {ranking.title}
        <span aria-hidden="true">↘</span>
      </button>
    </section>
  );
}

function DemoCardTile({ card }: { card: DemoCard }) {
  const visualLabel = `Visuel temporaire abstrait pour ${card.name} ; illustration définitive absente`;

  return (
    <article
      className={styles.cardTile}
      data-demo-card
      data-universe={card.universeId}
      aria-labelledby={`carte-${card.id}`}
    >
      <div
        className={`${styles.cardArtwork} ${ARTWORK_CLASSES[card.artwork]}`}
        role="img"
        aria-label={visualLabel}
      >
        <span className={styles.artworkOrb} aria-hidden="true" />
        <span className={styles.artworkMonogram} aria-hidden="true">{card.monogram}</span>
        <span className={styles.temporaryStamp} aria-hidden="true">
          Visuel<br />temporaire
        </span>
      </div>

      <div className={styles.cardDetails}>
        <div className={styles.cardBadges}>
          <span className={styles.kindBadge} data-kind={card.universeId}>
            {card.kindLabel}
          </span>
          <span className={card.owned ? styles.ownedBadge : styles.missingBadge}>
            {card.owned ? "Dans le classeur" : "À découvrir"}
          </span>
        </div>
        <h3 className={styles.cardName} id={`carte-${card.id}`}>{card.name}</h3>
        <p className={styles.cardSubtitle}>{card.subtitle}</p>
        <div className={styles.cardFooter}>
          <span className={styles.rarityBadge}>{card.rarity}</span>
          <span className={styles.universeName}>{card.universeLabel}</span>
        </div>
      </div>
    </article>
  );
}

export function CatalogueDemo() {
  const [activeFilter, setActiveFilter] = useState<UniverseFilter>("all");
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("fr-FR");

  const visibleCards = useMemo(
    () => DEMO_CARDS.filter((card) => {
      if (activeFilter !== "all" && card.universeId !== activeFilter) return false;
      if (!query) return true;
      return `${card.name} ${card.subtitle} ${card.kindLabel} ${card.universeLabel}`
        .toLocaleLowerCase("fr-FR")
        .includes(query);
    }),
    [activeFilter, query],
  );

  const collectedCount = DEMO_CARDS.filter((card) => card.owned).length;

  function viewUniverse(universeId: DemoUniverseId) {
    setActiveFilter(universeId);
    document.getElementById("classeur")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#classeur">Passer directement au classeur</a>
      <main className={styles.shell} id="contenu">
        <div className={styles.frame}>
          <header className={styles.topbar}>
            <Link className={styles.brand} href="/">
              <span className={styles.brandGlyph} aria-hidden="true">CD</span>
              <span>CreatorDeck</span>
              <span className={styles.brandLab}>LAB</span>
            </Link>
            <span className={styles.topbarStatus}>
              <span className={styles.statusDot} aria-hidden="true" />
              PROTO · DÉMO
            </span>
          </header>

          <section className={styles.hero} aria-labelledby="titre-demo">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span aria-hidden="true">✳</span> BINDER HYBRIDE · ÉTUDE D’INTERFACE</p>
              <h1 className={styles.heroTitle} id="titre-demo">
                Un classeur.<br />
                <span>Deux univers.</span>
              </h1>
              <p className={styles.heroLead}>
                Des créateurs Twitch fictifs et les personnages inventés des <em>Chroniques de Velune</em>,
                réunis dans le même classeur — sans mélanger leurs classements.
              </p>
              <ul className={styles.heroFacts} aria-label="Résumé du prototype">
                <li><strong>02</strong> univers</li>
                <li><strong>{DEMO_CARDS.length}</strong> cartes démo</li>
                <li><strong>{collectedCount}/{DEMO_CARDS.length}</strong> dans le classeur</li>
              </ul>
            </div>

            <aside className={styles.heroNote} aria-labelledby="principe-demo">
              <span className={styles.heroNoteIndex}>01 / 02</span>
              <h2 id="principe-demo">Comparer sans confondre</h2>
              <p>Chaque univers garde son propre rang et sa progression. Aucun total croisé, aucun score commun.</p>
              <ul className={styles.universePills} aria-label="Univers présentés">
                <li data-universe="twitch">Créateurs · Twitch</li>
                <li data-universe="fiction">Chroniques de Velune</li>
              </ul>
            </aside>
          </section>

          <aside className={styles.prototypeNotice} role="note" aria-label="Avertissement sur les données de démonstration">
            <span className={styles.noticeMark} aria-hidden="true">!</span>
            <p>
              <strong>Tout est fictif et temporaire.</strong> Noms, identifiants, personnages, classements et
              visuels sont inventés pour ce prototype. Les vignettes abstraites portent leur marquage temporaire ;
              aucune donnée ni image du jeu n’est utilisée.
            </p>
          </aside>

          <section className={styles.contentBlock} aria-labelledby="titre-classements">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>01 / COMPARAISON</p>
                <h2 id="titre-classements">Un rang par univers.</h2>
              </div>
              <p className={styles.sectionIntro}>
                Deux tableaux indépendants. Les nombres ci-dessous sont des exemples de présentation, pas des résultats réels.
              </p>
            </div>
            <div className={styles.rankingGrid}>
              {DEMO_RANKINGS.map((ranking) => (
                <RankingPanel key={ranking.universeId} ranking={ranking} onViewUniverse={viewUniverse} />
              ))}
            </div>
          </section>

          <section
            className={styles.contentBlock}
            id="classeur"
            tabIndex={-1}
            aria-labelledby="titre-classeur"
          >
            <div className={styles.binderHeading}>
              <div>
                <p className={styles.eyebrow}>02 / COLLECTION MIXTE</p>
                <h2 id="titre-classeur">Ton classeur démo</h2>
                <p className={styles.sectionIntro}>
                  Filtre par univers pour comparer les cartes, sans quitter le même classeur.
                </p>
              </div>
              <span className={styles.binderCount}>
                {DEMO_CARDS.length} cartes <span aria-hidden="true">·</span> {collectedCount} rangées
              </span>
            </div>

            <div className={styles.controls}>
              <div className={styles.filterGroup} role="group" aria-label="Filtrer les cartes par univers">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    className={activeFilter === option.id ? styles.filterActive : styles.filterButton}
                    type="button"
                    key={option.id}
                    aria-label={option.accessibleLabel}
                    aria-pressed={activeFilter === option.id}
                    onClick={() => setActiveFilter(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className={styles.searchGroup}>
                <label htmlFor="recherche-cartes">Rechercher une carte</label>
                <div className={styles.searchInputWrap}>
                  <span className={styles.searchIcon} aria-hidden="true">⌕</span>
                  <input
                    id="recherche-cartes"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                    placeholder="Nom, identifiant, univers…"
                    autoComplete="off"
                  />
                  {search && (
                    <button
                      className={styles.clearSearch}
                      type="button"
                      aria-label="Effacer la recherche"
                      onClick={() => setSearch("")}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className={styles.resultStatus} role="status" aria-live="polite" aria-atomic="true">
              {visibleCards.length === 0
                ? "Aucune carte ne correspond à cette recherche."
                : `${visibleCards.length} ${visibleCards.length === 1 ? "carte affichée" : "cartes affichées"} sur ${DEMO_CARDS.length}.`}
            </p>

            {visibleCards.length > 0 ? (
              <div className={styles.cardGrid}>
                {visibleCards.map((card) => <DemoCardTile card={card} key={card.id} />)}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span aria-hidden="true">⌕</span>
                <p>Aucune carte trouvée dans ce filtre.</p>
                <button type="button" onClick={() => { setSearch(""); setActiveFilter("all"); }}>
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </section>

          <footer className={styles.footer}>
            <p>CREATORDECK · PROTOTYPE / CATALOGUE DÉMO</p>
            <p>Pas de connexion, pas d’écriture, pas de boosters, pas d’économie.</p>
            <Link href="/">Retour au jeu</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
