"use client";

/**
 * L'écran **Ta chaîne** : le simulateur de streameur (`0036_streamer.sql`).
 *
 * Ce que le joueur y trouve, dans l'ordre où il se pose la question : où en est
 * sa chaîne (abonnés, palier, croissance par jour), ce qui s'est passé pendant
 * son absence, la vidéo du jour (un format, un appui), et les jetons que la
 * chaîne a versés aujourd'hui.
 *
 * Ce que l'écran **ne fait pas** : tirer. Le tirage de la vidéo, le gain et le
 * versement des jetons sont au serveur — et celui qui n'a pas de serveur a le
 * moteur local, avec les mêmes règles, via `cloudStore`.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight, Coins, Info, Radio, TrendingUp, X } from "lucide-react";

import { useCloud } from "@/hooks/use-cloud";
import { useGame, useNow } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import type { StreamerOpening } from "@/lib/cloud/store/streamer";
import { gameDay } from "@/lib/progression";
import {
  STREAMER,
  STREAMER_TOKEN_CAP,
  availableFormats,
  formatById,
  growthPerDay,
  tierProgress,
  tokensOnDay,
} from "@/lib/streamer";

const count = new Intl.NumberFormat("fr-FR");

export function StreamerSheet({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const cloud = useCloud();
  const now = useNow(30_000);
  const [opening, setOpening] = useState<StreamerOpening | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);

  // Ouvre la chaîne : le retour du joueur est payé ici, une fois par absence.
  useEffect(() => {
    let vivant = true;
    void cloudStore.openStreamer().then((resultat) => {
      if (vivant) setOpening(resultat);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const jour = gameDay(now);
  const streamer = state?.streamer;
  // Le premier format ouvert est celui qui marche le plus souvent, à défaut le
  // premier du fichier : la liste reste celle du fichier, dans son ordre.
  const formats = useMemo(() => {
    if (!state) return [];
    // Le même compteur que le serveur (`stats.unique_creators`) : la Collab
    // demande de posséder au moins un créateur.
    const owned = new Set(state.cards.map((card) => card.creatorSlug)).size;
    return availableFormats(owned);
  }, [state]);
  const choisi = formatId ?? formats[0]?.id ?? null;

  const video = streamer?.video?.day === jour ? streamer.video : null;
  const deja = Boolean(video);
  const jetons = streamer ? tokensOnDay(streamer, jour) : 0;
  const abonnes = streamer?.subscribers ?? 0;
  const progression = tierProgress(abonnes);
  const vue = opening?.status === "done" ? opening : null;
  const refuse = opening?.status === "refused" ? opening : null;

  async function publier() {
    if (!choisi || busy) return;
    setBusy(true);
    setNotice(null);
    const issue = await cloudStore.publishStreamerVideo(choisi);
    setBusy(false);
    if (issue.status !== "done") {
      setNotice({ message: issue.message, isError: true });
      return;
    }
    setNotice({ message: issue.message ?? "Vidéo publiée.", isError: false });
  }

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Ta chaîne">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>
            <Radio size={18} /> Ta chaîne
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {notice ? (
          <div className={`account-note ${notice.isError ? "error" : "ok"}`}>
            {notice.isError ? <AlertTriangle size={15} /> : <Check size={15} />}
            <span>{notice.message}</span>
          </div>
        ) : null}

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Cette version-ci n&apos;a pas de serveur</strong>
              <span>
                Ta chaîne vit alors sur cet appareil, avec les mêmes règles ({STREAMER.tokens.perSuccess}{" "}
                jetons par vidéo réussie, +{STREAMER.tokens.perBuzz} si elle buzz, {STREAMER_TOKEN_CAP} au
                plus par journée). Avec un compte, c&apos;est le serveur qui compte.
              </span>
            </div>
          </div>
        ) : null}

        {refuse ? (
          <div className="account-note error">
            <AlertTriangle size={15} />
            <span>{refuse.message}</span>
          </div>
        ) : null}

        {/* Le résumé du retour : la chaîne a grandi pendant l'absence. */}
        {vue && vue.days > 0 ? (
          <div className="chaine-return" role="status">
            <TrendingUp size={15} />
            <div>
              {vue.lines.map((ligne) => (
                <span key={ligne}>{ligne}</span>
              ))}
            </div>
          </div>
        ) : null}

        <section className="chaine-state">
          <div className="chaine-numbers">
            <div>
              <strong>{count.format(abonnes)}</strong>
              <span>abonnés</span>
            </div>
            <div>
              <strong>+{count.format(growthPerDay(abonnes))}</strong>
              <span>par jour</span>
            </div>
            <div>
              <strong>{progression.tier.label}</strong>
              <span>palier</span>
            </div>
          </div>
          <div className="progress-track large">
            <i style={{ width: `${Math.round(progression.ratio * 100)}%` }} />
          </div>
          <p className="chaine-next">
            {progression.next
              ? `Prochain palier : « ${progression.next.label} » à ${count.format(progression.next.at)} abonnés — ${count.format(progression.next.at - abonnes)} à trouver.`
              : "Ta chaîne est au sommet : « Légende du direct »."}
          </p>
        </section>

        <section className="chaine-video">
          <h3>{deja ? "La vidéo du jour est publiée" : "La vidéo du jour"}</h3>
          {deja && video ? (
            <p className="chaine-outcome">
              {formatById(video.format)
                ? `${formatById(video.format)!.label} : ${video.gained >= 0 ? "+" : "−"}${count.format(Math.abs(video.gained))} abonnés`
                : "Vidéo publiée"}
              {video.tokens > 0 ? ` · +${video.tokens} jetons` : " · plafond de jetons atteint"}
            </p>
          ) : (
            <>
              <p className="chaine-intro">
                Un format par journée de jeu. La réussite, le buzz et le bad buzz sont tirés par le serveur —
                l&apos;appareil ne choisit que le format.
              </p>
              <div className="chaine-formats" role="radiogroup" aria-label="Format de la vidéo du jour">
                {(formats.length ? formats : STREAMER.formats).map((format) => {
                  const actif = choisi === format.id;
                  return (
                    <button
                      key={format.id}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      className={`chaine-format${actif ? " actif" : ""}`}
                      onClick={() => setFormatId(format.id)}
                    >
                      <span className="chaine-format-head">
                        <strong>{format.label}</strong>
                        <span>{(format.successChancePermille / 10).toFixed(1)} % de réussite</span>
                      </span>
                      <span className="chaine-format-detail">{format.detail}</span>
                      <span className="chaine-format-odds">
                        ×{(format.gainPermille / 1000).toFixed(1)} de la croissance · buzz{" "}
                        {(format.buzzPermille / 10).toFixed(0)} %
                        {format.badBuzzPermille ? ` · bad buzz ${(format.badBuzzPermille / 10).toFixed(0)} %` : ""}
                        {format.requiresCreator ? " · demande un créateur" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button type="button" className="chaine-publish" disabled={busy || !choisi} onClick={() => void publier()}>
                {busy ? "Publication…" : "Publier la vidéo du jour"}
                <ChevronRight size={15} />
              </button>
            </>
          )}
          <div className="token-row">
            <Coins size={14} />
            <span>
              <strong>{jetons}</strong> / {STREAMER_TOKEN_CAP} jetons versés aujourd&apos;hui par la chaîne
            </span>
          </div>
        </section>

        <p className="odds-intro">
          La chaîne grandit <strong>par journées de jeu</strong> (6 h UTC, la même journée que les missions),
          pendant que tu joues comme pendant ton absence — {STREAMER.growth.capDays} journées comptées au
          plus, et une horloge reculée ne crédite rien.
        </p>
      </div>
    </div>
  );
}
