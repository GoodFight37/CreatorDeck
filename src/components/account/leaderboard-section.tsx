"use client";

import { useEffect, useRef } from "react";
import { Crown, RefreshCw, Trophy } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore, type LeaderboardMetric } from "@/lib/cloud/cloud-store";
import { CATCH_ALL_REGION, REGION_FAMILIES } from "@/lib/regions";

const METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: "unique_creators", label: "Cartes uniques" },
  { id: "total_cards", label: "Cartes" },
  { id: "legendary_cards", label: "Légendaires" },
  { id: "gold_cards", label: "Gold" },
  { id: "family", label: "Par famille" },
];

/** Familles proposées au classement, dans l'ordre de la configuration. */
const FAMILY_CHOICES: { id: string; label: string }[] = [
  ...REGION_FAMILIES.map((family) => ({ id: family.id, label: family.name })),
  { id: CATCH_ALL_REGION.id, label: CATCH_ALL_REGION.name },
];

/** Famille affichée par défaut : la première de la liste, jamais vide. */
const DEFAULT_FAMILY = FAMILY_CHOICES[0]?.id ?? "S10";

/**
 * Le classement mondial, dans la feuille de compte.
 *
 * Il se lit par mesure (cartes uniques, cartes, légendaires, Gold, ou une
 * famille à la fois) et chaque ligne ouvre la fiche publique du joueur. Le
 * panneau porte son propre raccourci d'ouverture : quand on vient du profil par
 * « Classement mondial », la feuille s'ouvre déjà défilée ici.
 */
export function LeaderboardSection({ focus }: { focus?: "leaderboard" | null }) {
  const cloud = useCloud();
  const leaderboardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (focus === "leaderboard") leaderboardRef.current?.scrollIntoView({ block: "start" });
  }, [focus]);

  return (
          <section className="account-card" id="classement" ref={leaderboardRef}>
            <div className="account-head">
              <Trophy size={15} />
              <strong>Classement mondial</strong>
              <button type="button" className="account-refresh" disabled={cloud.busy} onClick={() => void cloudStore.loadLeaderboard()}>
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="studio-group" role="group" aria-label="Tri du classement">
              {METRICS.map((metric) => (
                <button
                  key={metric.id}
                  type="button"
                  className={`studio-chip ${cloud.leaderboardMetric === metric.id ? "active" : ""}`}
                  // Passer au tri par famille demande **aussi** une famille :
                  // on en propose une tout de suite, sinon le classement
                  // s'afficherait sans que l'on sache de quoi il parle.
                  onClick={() =>
                    void cloudStore.loadLeaderboard(
                      metric.id,
                      metric.id === "family" ? cloud.leaderboardRegion ?? DEFAULT_FAMILY : null,
                    )
                  }
                >
                  {metric.label}
                </button>
              ))}
            </div>
            {cloud.leaderboardMetric === "family" ? (
              <div className="studio-group" role="group" aria-label="Famille du classement">
                {FAMILY_CHOICES.map((family) => (
                  <button
                    key={family.id}
                    type="button"
                    className={`studio-chip ${(cloud.leaderboardRegion ?? DEFAULT_FAMILY) === family.id ? "active" : ""}`}
                    onClick={() => void cloudStore.loadLeaderboard("family", family.id)}
                  >
                    {family.label}
                  </button>
                ))}
              </div>
            ) : null}
            {cloud.leaderboard.length ? (
              <ol className="leaderboard">
                {cloud.leaderboard.map((row) => (
                  <li key={`${row.rank}-${row.userId}`} className={row.userId === cloud.userId ? "me" : ""}>
                    <button
                      type="button"
                      className="leaderboard-row"
                      onClick={() => void cloudStore.openProfile(row.userId)}
                    >
                      <b>{row.rank}</b>
                      <span className="leaderboard-name">
                        {row.displayName}
                        {row.userId === cloud.userId ? " (toi)" : ""}
                      </span>
                      <span className="leaderboard-value">
                        {cloud.leaderboardMetric === "total_cards"
                          ? `${row.totalCards} cartes`
                          : cloud.leaderboardMetric === "legendary_cards"
                            ? `${row.legendaryCards} légendaires`
                            : cloud.leaderboardMetric === "gold_cards"
                              ? `${row.goldCards} Gold`
                              : cloud.leaderboardMetric === "family"
                                ? `${row.familyOwned} / ${row.familyTotal}`
                                : `${Math.round(row.completion * 1000) / 10} % du catalogue`}
                      </span>
                      {row.rank === 1 ? <Crown size={13} className="leaderboard-crown" /> : null}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="account-hint">
                {cloud.busy ? "Chargement…" : "Personne au classement pour l'instant : envoie ta collection pour ouvrir la voie."}
              </p>
            )}
            <p className="account-hint">
              Touche une ligne pour ouvrir la fiche publique du joueur : vitrine, complétion du catalogue,
              répartition par rareté, rang — et une affiche à partager. Le serveur recalcule les statistiques
              depuis chaque sauvegarde et écarte ce qu&apos;aucune partie ne peut produire.
            </p>
          </section>
  );
}
