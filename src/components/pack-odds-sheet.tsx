"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PACKS, RARITY_META } from "@/lib/catalog";
import { DIRECT_BONUS, PITY, RARITIES, packOdds } from "@/lib/pull-rates";
import type { PackType } from "@/lib/catalog";

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
 *
 * L'écran est en **lecture seule** : des tableaux de chiffres et trois lignes
 * de légende, rien à régler, rien à expliquer longuement. Les règles du direct
 * et le plancher de malchance sont eux aussi des tableaux — un joueur qui veut
 * vérifier un taux lit une ligne, il ne relit pas un paragraphe.
 */
export function PackOddsSheet({
  onClose,
  current,
  initialPack = "live",
}: {
  onClose: () => void;
  /**
   * L'état du joueur, s'il est chargé : le compteur de malchance affiché est
   * celui qui décidera du tirage, pas une illustration.
   */
  current?: { pity: { counter: number; remaining: number } } | null;
  /** Paquet montré à l'ouverture (le joueur vient d'en ouvrir un, par exemple). */
  initialPack?: PackType;
}) {
  const [shown, setShown] = useState<PackType>(initialPack);
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

        {/* Une seule phrase, et c'est l'essentiel : ces chiffres sont ceux que
            le moteur applique — les mêmes pour tout le monde. */}
        <p className="odds-intro">
          <b>Taux officiels certifiés.</b> Ce sont exactement les probabilités appliquées à chaque
          ouverture : aucun booster n&apos;est truqué, ni pour toi ni pour personne.
        </p>

        {/* Deux paquets, deux blocs : le joueur doit pouvoir lire les taux de
            chacun sans qu'on les mélange. Le sélecteur ne s'affiche que s'il y
            a vraiment deux paquets à montrer. */}
        <div className="filter-chips odds-packs" aria-label="Paquet">
          {(["live", "scene"] as PackType[]).map((pack) => (
            <button
              key={pack}
              className={shown === pack ? "active" : ""}
              onClick={() => setShown(pack)}
              aria-pressed={shown === pack}
            >
              {PACKS[pack].label}
            </button>
          ))}
        </div>

        <PackOddsBlock pack={shown} current={current} />
      </div>
    </div>
  );
}

function PackOddsBlock({
  pack,
  current,
}: {
  pack: PackType;
  current?: { pity: { counter: number; remaining: number } } | null;
}) {
  const odds = packOdds(pack);
  const isLive = pack === "live";
  return (
    <section className="odds-block">
      <div className="odds-block-head">
        <h3>{odds.label}</h3>
        <span>
          {odds.cardCount} cartes · {PACKS[pack].description}
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

      {/* Le bonus Direct ne concerne que le Live Drop : le Paquet Scène tire
          dans une seule famille, un bonus « qui streame » n'y aurait pas de sens
          (et sa table ne l'applique pas). Quatre lignes, pas un paragraphe. */}
      {isLive ? (
        <table className="odds-table odds-rules" aria-label="Le direct">
          <thead>
            <tr>
              <th scope="col">Le direct</th>
              <th scope="col">Effet</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Créateur qui streame</th>
              <td>{formatMultiplier(DIRECT_BONUS.creatorBias)} dans sa rareté</td>
            </tr>
            <tr>
              <th scope="row">Variante Live</th>
              <td>{percent.format(DIRECT_BONUS.livePermille / 1000)} par carte</td>
            </tr>
            <tr>
              <th scope="row">Carte garantie</th>
              <td>Live si son créateur streame</td>
            </tr>
            <tr>
              <th scope="row">Sans direct</th>
              <td>bonus neutre, aucune Live</td>
            </tr>
          </tbody>
        </table>
      ) : null}

      {/* Le plancher de malchance, publié comme le reste : le seuil, la
          probabilité réelle de l'atteindre, et l'état du compteur du joueur.
          C'est la règle qui empêche une série malchanceuse de durer des mois —
          elle doit être lisible, pas devinée. */}
      {isLive ? (
        <table className="odds-table odds-rules" aria-label="Légendaire garanti">
          <thead>
            <tr>
              <th scope="col">{PITY.label}</th>
              <th scope="col">Valeur</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Boosters sans Légendaire</th>
              <td>{PITY.threshold}</td>
            </tr>
            <tr>
              <th scope="row">Garantie</th>
              <td>5ᵉ slot</td>
            </tr>
            <tr>
              <th scope="row">Séries concernées</th>
              <td>{percent.format(odds.pity.active)}</td>
            </tr>
            {current ? (
              <tr>
                <th scope="row">Ton compteur</th>
                <td>
                  {current.pity.counter} ·{" "}
                  {current.pity.remaining <= 1
                    ? "le prochain est garanti"
                    : `encore ${current.pity.remaining}`}
                </td>
              </tr>
            ) : null}
            <tr>
              <th scope="row">Remise à zéro</th>
              <td>à chaque Légendaire, quel que soit le slot</td>
            </tr>
            <tr>
              <th scope="row">Paquet Scène</th>
              <td>ne compte pas dans la série</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table className="odds-table odds-rules" aria-label="Légendaires">
          <tbody>
            <tr>
              <th scope="row">Légendaire</th>
              <td>aucune dans ce paquet</td>
            </tr>
            <tr>
              <th scope="row">Famille</th>
              <td>une seule, jamais deux fois le même créateur</td>
            </tr>
            <tr>
              <th scope="row">Plancher de malchance</th>
              <td>compte le Live Drop seulement</td>
            </tr>
          </tbody>
        </table>
      )}

      <p className="odds-footnote">
        « Au moins 1 » = chance que le booster contienne au moins une carte de cette rareté. Le 5ᵉ
        slot est garanti Rare ou mieux. Une variante Live ne sort que pendant un direct.
      </p>
    </section>
  );
}
