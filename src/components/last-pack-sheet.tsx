"use client";

/**
 * Feuille « Last Pack » : le paquet qu'un joueur vient d'ouvrir reste exposé
 * dix minutes — et tu peux y prendre une carte. Une par jour.
 *
 * Ce que la feuille ne fait pas : décider. Le serveur sait qui est exposé, à
 * qui, pour combien de temps, si le vol est encore possible et si la carte est
 * toujours dans la collection du propriétaire (`0012_last_pack.sql`). Ici on
 * affiche ce qu'il donne, on demande un vol, et on raconte la réponse.
 *
 * Le geste est en **deux temps** : on choisit la carte, puis on la prend. Un
 * vol qui partirait au premier appui serait un piège — il n'y en a qu'un par
 * jour, et il est définitif.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock3, Info, Lock, RefreshCw, ShieldAlert, X } from "lucide-react";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { useCloud } from "@/hooks/use-cloud";
import { useNow } from "@/hooks/use-game";
import { cloudStore, type CloudActionOutcome } from "@/lib/cloud/cloud-store";
import type { LastPack, LastPackCard } from "@/lib/cloud/api";
import { canPickCard, cardIsProtected, countdownLabel, emptyShelfHint, remainingMs } from "@/lib/last-pack";
import { describeCard } from "@/lib/market";

function creatorName(slug: string): string {
  return CREATOR_BY_SLUG.get(slug)?.displayName ?? slug;
}

/** Les cinq cartes d'un paquet, dans l'ordre où elles sont sorties. */
function PackCards({
  pack,
  restant,
  onPick,
  onTake,
  choisi,
  busy,
}: {
  pack: LastPack;
  restant: number;
  onPick: (index: number) => void;
  onTake: () => void;
  choisi: number | null;
  busy: boolean;
}) {
  return (
    <>
      <div className="last-pack-cards">
        {pack.cards.map((card: LastPackCard) => {
          const prise = card.taken;
          // Grisée pour deux raisons, et l'écran dit laquelle : déjà prise, ou
          // protégée (une Légendaire, une Live).
          const protegee = !prise && cardIsProtected(card);
          const selectable = canPickCard(pack, card, restant);
          return (
            <button
              key={card.index}
              type="button"
              className={`last-pack-card ${prise ? "taken" : ""} ${choisi === card.index ? "chosen" : ""}`}
              disabled={!selectable || busy}
              aria-pressed={choisi === card.index}
              onClick={() => (choisi === card.index ? onPick(-1) : onPick(card.index))}
            >
              <b>{creatorName(card.creatorSlug)}</b>
              <span>{describeCard(card.rarity, card.variant)}</span>
              {prise ? <em>prise</em> : protegee ? <em>protégée</em> : null}
            </button>
          );
        })}
      </div>
      {choisi !== null && choisi > 0 ? (
        <button type="button" className="last-pack-take" onClick={onTake} disabled={busy}>
          <ShieldAlert size={15} />
          Prendre cette carte (une par jour)
        </button>
      ) : null}
    </>
  );
}

export function LastPackSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  // Quinze secondes : assez pour un compte à rebours qui se voit, assez peu
  // pour ne pas faire tourner un écran dans le vide.
  const now = useNow(15_000);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [choisi, setChoisi] = useState<{ packId: number; index: number } | null>(null);

  useEffect(() => {
    if (cloud.configured && cloud.userId) void cloudStore.loadLastPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setChoisi(null);
    await cloudStore.loadLastPacks();
  }, []);

  const shelf = cloud.lastPacks;
  // L'horloge de référence est celle du serveur : `lastPacksAt` sert d'ancre,
  // et le décompte local part de là (voir `remainingMs`).
  const loadedAt = cloud.lastPacksAt ?? now;

  async function act(run: () => Promise<CloudActionOutcome>): Promise<void> {
    setBusy(true);
    const result = await run();
    if (result.message) setNotice({ message: result.message, isError: result.status !== "done" });
    setBusy(false);
  }

  const mine: LastPack[] = shelf?.packs.filter((pack) => pack.mine) ?? [];
  const friends: LastPack[] = shelf?.packs.filter((pack) => !pack.mine) ?? [];

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Last Pack">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>Last Pack</h2>
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
              <strong>Le Last Pack demande le cloud</strong>
              <span>Cette version est hors ligne : il n&apos;y a personne pour ouvrir un paquet.</span>
            </div>
          </div>
        ) : !cloud.userId ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Connecte-toi pour voir les paquets exposés</strong>
              <span>
                Un booster ouvert reste exposé dix minutes. Chez un ami, tu peux y prendre une carte —
                une par jour.
              </span>
            </div>
          </div>
        ) : (
          <>
            <p className="odds-intro">
              Un booster ouvert reste exposé <b>dix minutes</b>. Chez un ami, tu peux y prendre une
              carte : <b>une par jour</b>, et elle quitte vraiment sa collection. Une{" "}
              <b>Légendaire</b> ou une carte <b>Live</b> ne se prend pas : ces deux-là restent à
              leur propriétaire.
            </p>

            {mine.length > 0 ? (
              <section className="last-pack-block">
                <h3>
                  <Clock3 size={14} /> Ton paquet est exposé
                </h3>
                {mine.map((pack) => {
                  const restant = remainingMs(pack, shelf?.now ?? "", loadedAt, now);
                  return (
                    <div key={pack.id} className="last-pack-row">
                      <div className="last-pack-meta">
                        <b>Encore {countdownLabel(restant)}</b>
                        <span>
                          Le premier ami qui passe peut t&apos;y prendre une carte — sauf une
                          Légendaire ou une Live.
                        </span>
                      </div>
                      <PackCards
                        pack={pack}
                        restant={0}
                        choisi={null}
                        busy
                        onPick={() => undefined}
                        onTake={() => undefined}
                      />
                    </div>
                  );
                })}
              </section>
            ) : null}

            <section className="last-pack-block">
              <h3>
                <Lock size={14} /> Chez tes amis
              </h3>
              {friends.length === 0 ? (
                <p className="odds-footnote">{emptyShelfHint(shelf, loadedAt, now)}</p>
              ) : (
                friends.map((pack) => {
                  const restant = remainingMs(pack, shelf?.now ?? "", loadedAt, now);
                  const choisiIci = choisi?.packId === pack.id ? choisi.index : null;
                  return (
                    <div key={pack.id} className="last-pack-row">
                      <div className="last-pack-meta">
                        <b>{pack.ownerName}</b>
                        <span>
                          {restant > 0 ? `Encore ${countdownLabel(restant)}` : "Fenêtre terminée"}
                          {pack.stealable && restant > 0 ? "" : " · rien à prendre ici"}
                        </span>
                      </div>
                      <PackCards
                        pack={pack}
                        restant={restant}
                        choisi={choisiIci}
                        busy={busy}
                        onPick={(index) =>
                          setChoisi(index > 0 ? { packId: pack.id, index } : null)
                        }
                        onTake={() =>
                          void act(async () => {
                            if (!choisi) return { status: "unavailable", reason: "error", message: "" };
                            const result = await cloudStore.stealLastPack(choisi.packId, choisi.index);
                            setChoisi(null);
                            return result;
                          })
                        }
                      />
                    </div>
                  );
                })
              )}
            </section>

            <div className="last-pack-foot">
              <span>
                {shelf?.stoleToday
                  ? "Ta carte du jour est prise. Demain, une autre."
                  : "Un vol par jour. Choisis bien."}
              </span>
              <button type="button" onClick={() => void load()} disabled={busy || cloud.lastPacksBusy}>
                <RefreshCw size={14} /> Rafraîchir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
