"use client";

import { X } from "lucide-react";
import { PACKS, RARITY_META } from "@/lib/catalog";
import { DIRECT_BONUS, RARITIES, packOdds } from "@/lib/pull-rates";

const percent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** « ×1,5 » — la virgule décimale, écrite à la main (pas de locale au rendu). */
function formatMultiplier(value: number): string {
  return `×${String(value).replace(".", ",")}`;
}

/**
 * Écran « Taux de drop » : les probabilités publiées, calculées à l'affichage
 * depuis `src/data/pull-rates.json` — le fichier qui sert réellement au tirage.
 * Aucune valeur n'est recopiée à la main, donc l'affichage ne peut pas mentir.
 */
export function PackOddsSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="odds-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Taux de drop des boosters"
    >
      <div className="odds-panel">
        <header className="odds-head">
          <div>
            <h2>Taux de drop</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <p className="odds-intro">
          Probabilités publiées, calculées en direct depuis <code>pull-rates.json</code> : le même
          fichier que le moteur de tirage. Aucun booster n&apos;est truqué à l&apos;ouverture.
        </p>

        <PackOddsBlock />
      </div>
    </div>
  );
}

function PackOddsBlock() {
  const odds = packOdds("live");
  return (
    <section className="odds-block">
      <div className="odds-block-head">
        <h3>{odds.label}</h3>
        <span>
          {odds.cardCount} cartes · {PACKS.live.description}
        </span>
      </div>

      <div className="odds-rare">
        <strong>{odds.rareDrop.label}</strong>
        <span>
          {odds.rareDrop.tagline} · {percent.format(odds.rareDrop.chance)} des boosters
        </span>
      </div>

      <table className="odds-table">
        <thead>
          <tr>
            <th scope="col">Rareté</th>
            <th scope="col">Par carte</th>
            <th scope="col">Au moins 1</th>
          </tr>
        </thead>
        <tbody>
          {RARITIES.map((rarity) => (
            <tr key={rarity}>
              <th scope="row">
                <i style={{ background: RARITY_META[rarity].color }} aria-hidden="true" />
                {RARITY_META[rarity].label}
              </th>
              <td>{percent.format(odds.perCard[rarity])}</td>
              <td>{percent.format(odds.perPack[rarity])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <details className="odds-details">
        <summary>Détail carte par carte</summary>
        <ul>
          {odds.slots.map((slot) => (
            <li key={slot.id}>
              <strong>{slot.label}</strong>
              <span>
                {RARITIES.filter((rarity) => slot.probabilities[rarity] > 0)
                  .map(
                    (rarity) =>
                      `${RARITY_META[rarity].short} ${percent.format(slot.probabilities[rarity])}`,
                  )
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div className="odds-rare odds-direct">
        <strong>{DIRECT_BONUS.label}</strong>
        <span>
          Un créateur en direct pèse {formatMultiplier(DIRECT_BONUS.creatorBias)} dans sa rareté,
          et sa carte a {percent.format(DIRECT_BONUS.livePermille / 1000)} de chance d&apos;être en
          variante Live. La carte garantie est Live quand son créateur streame.
        </span>
        <small>{DIRECT_BONUS.note}</small>
      </div>

      <p className="odds-footnote">
        « Au moins 1 » = probabilité qu&apos;un booster contienne au moins une carte de cette
        rareté. Le 5ᵉ slot est garanti Rare ou mieux. La variante Live, elle, ne s&apos;obtient
        que pendant un direct — sans information fraîche sur qui streame, elle ne sort pas.
      </p>
    </section>
  );
}
