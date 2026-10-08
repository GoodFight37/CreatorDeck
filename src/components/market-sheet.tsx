"use client";

/**
 * Feuille « Hôtel des ventes » : deux rayons, un seul écran.
 *
 *   * **Déposer un doublon** — l'hôtel paie tout de suite, en points. Seuls les
 *     doublons sont proposés : on ne dépose jamais sa dernière copie d'un
 *     créateur (même règle que le recyclage) ;
 *   * **Le comptoir** — les cartes déposées par d'autres joueurs, au prix de
 *     l'étiquette.
 *
 * La feuille ne décide de rien : elle demande, le serveur tranche
 * (`0009_marche.sql`), et l'écran se contente de ce que le cloud lui rend. Les
 * prix affichés viennent de `market.ts`, qui recopie la grille du serveur —
 * sans elle, il faudrait un aller-retour réseau par carte pour écrire
 * « Vendre · 400 pts ».
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Info, RefreshCw, ShoppingBag, Store, UserPlus, X } from "lucide-react";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { useCloud } from "@/hooks/use-cloud";
import { connecteToi } from "@/lib/cloud/store-text";
import { useGame } from "@/hooks/use-game";
import { cloudStore, type CloudActionOutcome } from "@/lib/cloud/cloud-store";
import type { MarketListing } from "@/lib/cloud/api";
import { describeCard, formatPoints, payoutOf, sellableCards } from "@/lib/market";

/** Le nom affiché d'un créateur, avec un repli si le catalogue est en retard. */
function creatorName(slug: string): string {
  return CREATOR_BY_SLUG.get(slug)?.displayName ?? slug;
}

export function MarketSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const game = useGame();
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // Chargé à l'ouverture, et seulement connecté : pas d'appel pour un joueur
  // hors ligne, comme la feuille des amis.
  useEffect(() => {
    if (cloud.configured && cloud.userId) void cloudStore.loadMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    await cloudStore.loadMarket();
  }, []);

  /**
   * Enveloppe un geste : on bloque l'écran, on l'exécute, on recharge le
   * comptoir. Le message vient du store, qui l'a déjà rédigé — et `status`
   * distingue un refus (message rouge) d'un succès.
   */
  async function act(run: () => Promise<CloudActionOutcome>): Promise<void> {
    setBusy(true);
    const result = await run();
    if (result.message) setNotice({ message: result.message, isError: result.status !== "done" });
    await load();
    setBusy(false);
  }

  const points = game?.points ?? 0;
  const duplicates = game ? sellableCards(game.cards) : [];
  const shelf: MarketListing[] = cloud.market;
  const ready = cloud.marketAt !== null;

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Hôtel des ventes">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>Hôtel des ventes</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {notice ? (
          <div className={`account-note ${notice.isError ? "error" : "ok"}`}>
            {notice.isError ? <AlertTriangle size={15} /> : <Info size={15} />}
            <span>{notice.message}</span>
          </div>
        ) : null}

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>{connecteToi("L'hôtel")}</strong>
              <span>Cette version est hors ligne : personne ne peut acheter ni vendre.</span>
            </div>
          </div>
        ) : !cloud.userId ? (
          <section className="account-card">
            <p className="account-intro">
              Un compte suffit pour vendre et acheter — pas besoin d&apos;e-mail. C&apos;est le même
              compte qui sauvegarde ta collection.
            </p>
            <button
              type="button"
              className="account-button wide"
              disabled={cloud.busy}
              onClick={() => void cloudStore.signInAsGuest()}
            >
              <UserPlus size={14} /> Créer un compte invité
            </button>
          </section>
        ) : (
          <>
            <div className="market-wallet">
              <Store size={15} />
              <span>
                L&apos;hôtel paie tes doublons tout de suite, en points. Tu peux te servir au
                comptoir avec ces points.
              </span>
              <b>{formatPoints(points)}</b>
            </div>

            <section className="account-card">
              <div className="account-head">
                <Store size={15} />
                <strong>Déposer un doublon</strong>
              </div>
              <p className="account-intro">
                Seuls les doublons partent à l&apos;hôtel : ta dernière copie d&apos;un créateur
                reste dans ton classeur. Le prix est celui de l&apos;hôtel, payé immédiatement.
              </p>
              {duplicates.length ? (
                <div className="market-rows">
                  {duplicates.map((card) => (
                    <div className="market-row" key={card.id}>
                      <div className="market-who">
                        <b>{creatorName(card.creatorSlug)}</b>
                        <span>{describeCard(card.rarity, card.variant)}</span>
                      </div>
                      <button
                        type="button"
                        className="account-button"
                        disabled={busy}
                        onClick={() =>
                          void act(() => cloudStore.sellCard(card.id))
                        }
                      >
                        Vendre · {formatPoints(payoutOf(card.rarity, card.variant))}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="account-hint">
                  Aucun doublon pour l&apos;instant. Ouvre un booster : les cartes déjà dans ton
                  classeur deviennent vendables.
                </p>
              )}
            </section>

            <section className="account-card">
              <div className="account-head">
                <ShoppingBag size={15} />
                <strong>Le comptoir</strong>
              </div>
              <p className="account-intro">
                Les cartes que d&apos;autres joueurs viennent de déposer. L&apos;étiquette, c&apos;est
                ce que tu paies ; elle reste plus chère que ce que l&apos;hôtel a payé au vendeur.
              </p>
              {shelf.length ? (
                <div className="market-rows">
                  {shelf.map((listing) => {
                    const enough = points >= listing.price;
                    return (
                      <div className="market-row" key={listing.id}>
                        <div className="market-who">
                          <b>{creatorName(listing.creatorSlug)}</b>
                          <span>
                            {describeCard(listing.rarity, listing.variant)} · déposé par{" "}
                            {listing.sellerName}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="account-button"
                          disabled={busy || !enough}
                          onClick={() => void act(() => cloudStore.buyCard(listing.id))}
                        >
                          Acheter · {formatPoints(listing.price)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : ready ? (
                <p className="account-hint">
                  Le comptoir est vide pour l&apos;instant. Reviens plus tard : les cartes arrivent
                  au fil des dépôts.
                </p>
              ) : (
                <p className="account-hint">Chargement du comptoir…</p>
              )}
            </section>

            <div className="account-actions">
              <button
                type="button"
                className="account-button ghost"
                disabled={busy || cloud.marketBusy}
                onClick={() => void load()}
              >
                <RefreshCw size={14} /> Actualiser
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
