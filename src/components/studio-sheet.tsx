"use client";

import { useState } from "react";
import { FlaskConical, Sparkles, X } from "lucide-react";
import { PACKS, RARITY_META, type PackType } from "@/lib/catalog";
import { RARITIES } from "@/lib/pull-rates";
import { runStudio } from "@/lib/tirage-studio";
import type { StudioResult } from "@/lib/tirage-studio";

const percent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COUNTS = [25, 100, 500] as const;

/**
 * Studio de tirages : le pendant « jouable » de l'écran Taux de drop.
 *
 * L'écran Taux de drop annonce les probabilités ; celui-ci les met à
 * l'épreuve — on ouvre 25, 100 ou 500 boosters en mémoire et on compare la
 * répartition obtenue aux taux publiés. Aucun effet sur la partie.
 */
export function StudioSheet({ onClose }: { onClose: () => void }) {
  const [packType, setPackType] = useState<PackType>("live");
  const [count, setCount] = useState<number>(100);
  const [result, setResult] = useState<StudioResult | null>(null);

  function run(nextType: PackType = packType, nextCount: number = count) {
    setPackType(nextType);
    setCount(nextCount);
    setResult(runStudio(nextType, nextCount));
  }

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Studio de tirages">
      <div className="odds-panel">
        <header className="odds-head">
          <div>
            <p className="eyebrow">LABORATOIRE</p>
            <h2>Studio de tirages</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <p className="odds-intro">
          Ouvre des boosters <strong>en mémoire</strong> avec le moteur du jeu et compare la
          répartition obtenue aux taux publiés. Rien n&apos;est écrit dans ta partie : ni cartes,
          ni points, ni statistiques.
        </p>

        <div className="studio-controls">
          <div className="studio-group" role="group" aria-label="Type de booster">
            {(["live", "archive"] as PackType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`studio-chip ${packType === type ? "active" : ""}`}
                onClick={() => run(type, count)}
              >
                {type === "live" ? "Live" : "Archives"}
                <span>{PACKS[type].size} cartes</span>
              </button>
            ))}
          </div>

          <div className="studio-group" role="group" aria-label="Nombre de boosters">
            {COUNTS.map((value) => (
              <button
                key={value}
                type="button"
                className={`studio-chip ${count === value ? "active" : ""}`}
                onClick={() => run(packType, value)}
              >
                {value}
                <span>boosters</span>
              </button>
            ))}
          </div>

          <button type="button" className="studio-run" onClick={() => run()}>
            <FlaskConical size={15} /> Simuler
          </button>
        </div>

        {result ? (
          <section className="odds-block">
            <div className="odds-block-head">
              <h3>
                {result.packs} boosters {result.packType === "live" ? "Live" : "Archives"}
              </h3>
              <span>
                {result.cards} cartes · {result.unique} créateurs distincts
              </span>
            </div>

            <table className="odds-table studio-table">
              <thead>
                <tr>
                  <th scope="col">Rareté</th>
                  <th scope="col">Observé</th>
                  <th scope="col">Attendu</th>
                  <th scope="col">Écart</th>
                </tr>
              </thead>
              <tbody>
                {RARITIES.map((rarity) => {
                  const observed = result.observed[rarity];
                  const expected = result.expected[rarity];
                  const delta = observed - expected;
                  return (
                    <tr key={rarity}>
                      <th scope="row">
                        <i style={{ background: RARITY_META[rarity].color }} aria-hidden="true" />
                        {RARITY_META[rarity].label}
                      </th>
                      <td>{percent.format(observed)}</td>
                      <td>{percent.format(expected)}</td>
                      <td className={Math.abs(delta) <= 0.005 ? "delta close" : "delta"}>
                        {delta >= 0 ? "+" : ""}
                        {percent.format(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <p className="odds-footnote">
              <Sparkles size={12} /> {result.perfect} booster{result.perfect > 1 ? "s" : ""} Perfect
              sur {result.packs} ({percent.format(result.packs ? result.perfect / result.packs : 0)}{" "}
              des ouvertures). Plus tu simules de boosters, plus l&apos;écart se resserre : sur
              quelques dizaines d&apos;ouvertures, la chance a le droit d&apos;être bruyante.
            </p>
          </section>
        ) : (
          <p className="odds-footnote">
            Choisis un booster et un nombre d&apos;ouvertures, puis lance la simulation.
          </p>
        )}
      </div>
    </div>
  );
}
