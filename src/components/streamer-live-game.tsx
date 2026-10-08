"use client";

/**
 * Le **live de vingt secondes** — la scène de « Ta chaîne ».
 *
 * On passe en direct : le chat défile en bas, les bulles d'alerte tombent dans
 * le cadre, et on les attrape en appuyant dessus avant qu'elles ne s'effacent.
 * Au bout des vingt secondes, le bilan dit ce qui a été attrapé — puis on
 * publie la vidéo du jour.
 *
 * Ce que la scène **ne fait pas** : tirer. Ce module ne connaît ni la réussite,
 * ni le buzz, ni le gain — tout ça est au serveur (`streamer_publish`). Le live
 * ne fait que précéder la publication : c'est le moment de jeu, pas la machine
 * à récompenses. Aucune monnaie ne tombe ici, et c'est écrit à l'écran.
 *
 * L'horloge est réelle (`Date.now()`), mais **le plan ne l'est pas** : il vient
 * de `livePlan(journée, palier)`, donc deux ouvertures de la même journée
 * donnent la même scène — on ne relance pas pour tomber sur un tirage plus
 * clément.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Radio, Timer, X } from "lucide-react";

import { buzz } from "@/lib/haptics";
import {
  LIVE_CHAT_HOLD_MS,
  LIVE_DURATION_MS,
  livePlan,
  resolveLive,
  tierAt,
  tierIndexFor,
  visibleAlerts,
  visibleChat,
} from "@/lib/live-game";
import { TEAR_HAPTIC } from "@/lib/reveal";
import type { StreamerFormat } from "@/lib/streamer";

export function StreamerLiveGame({
  day,
  subscribers,
  format,
  busy,
  onPublish,
  onLeave,
}: {
  /** La journée de jeu (`AAAA-MM-JJ`) : c'est elle qui fixe la scène. */
  day: string;
  subscribers: number;
  format: StreamerFormat;
  busy: boolean;
  /** Publier la vidéo du jour, avec le format choisi avant le direct. */
  onPublish: () => void | Promise<void>;
  /** Quitter sans publier : la journée n'est pas consommée. */
  onLeave: () => void;
}) {
  const palier = tierIndexFor(subscribers);
  const plan = useMemo(() => livePlan(day, palier), [day, palier]);
  // L'instant du départ n'est **pas** lu pendant le rendu (une horloge lue au
  // rendu, c'est un rendu qui n'est plus pur) : il est posé au montage, dans
  // l'effet qui fait tourner le direct.
  const debut = useRef<number | null>(null);
  const [ecoule, setEcoule] = useState(0);
  const [attrapees, setAttrapees] = useState<string[]>([]);
  const fini = ecoule >= plan.durationMs;

  // Une seule horloge : on lit le temps réel écoulé, donc un onglet mis en
  // arrière-plan ne décale pas la fin du direct.
  useEffect(() => {
    // La scène est montée au lancement du direct (et remontée à chaque
    // nouveau live) : le compteur part donc de zéro sans qu'on ait à le poser.
    debut.current = Date.now();
    const minuteur = window.setInterval(() => {
      const depuis = debut.current === null ? 0 : Date.now() - debut.current;
      setEcoule(Math.min(plan.durationMs, depuis));
    }, 200);
    return () => window.clearInterval(minuteur);
  }, [plan.durationMs]);

  const lignes = visibleChat(plan, ecoule);
  const bulles = visibleAlerts(plan, ecoule);
  const bilan = resolveLive(plan, attrapees);
  const attrapables = fini ? [] : bulles;

  /** Attrape une bulle : elle disparaît du cadre, et le compte monte. */
  function attraper(id: string) {
    if (fini || attrapees.includes(id)) return;
    setAttrapees((liste) => [...liste, id]);
    buzz(TEAR_HAPTIC);
  }

  return (
    <section className="live" aria-label="Le live du jour">
      <header className="live-head">
        <span className="live-badge">
          <Radio size={13} /> EN DIRECT
        </span>
        <span className="live-time">
          <Timer size={13} /> {fini ? "terminé" : `${Math.ceil((plan.durationMs - ecoule) / 1000)} s`}
        </span>
        <button type="button" className="live-quit" onClick={onLeave} aria-label="Quitter le live">
          <X size={15} />
        </button>
      </header>

      <div className="live-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (ecoule / plan.durationMs) * 100)}%` }} />
      </div>

      {fini ? (
        <div className="live-recap">
          <h3>{bilan.headline}</h3>
          <p className="live-recap-chat">{bilan.chatLine}</p>
          <p className="live-recap-note">
            Le direct ne paie rien : la réussite, le buzz et les jetons de la vidéo restent tirés par le serveur,
            comme d&apos;habitude.
          </p>
          <button type="button" className="chaine-publish" disabled={busy} onClick={() => void onPublish()}>
            {busy ? "Publication…" : `Publier ma vidéo (${format.label})`}
            <ChevronRight size={15} />
          </button>
          <button type="button" className="live-again" onClick={onLeave}>
            Retour à la chaîne
          </button>
        </div>
      ) : (
        <>
          <div className="live-stage">
            <p className="live-stage-hint">
              Attrape les bulles avant qu&apos;elles s&apos;effacent — {attrapees.length} / {plan.alerts.length} pour
              l&apos;instant.
            </p>
            {attrapables.map((bulle) => (
              <button
                key={bulle.id}
                type="button"
                className={`live-alert live-alert-${bulle.kindId}`}
                // La position passe par une variable : le CSS s'en sert pour
                // empêcher une bulle du bord droit d'être coupée par le cadre.
                style={
                  {
                    "--live-left": `${bulle.leftPercent}%`,
                    top: `${bulle.topPercent}%`,
                  } as React.CSSProperties
                }
                onPointerDown={() => attraper(bulle.id)}
                aria-label={`${bulle.label} — ${bulle.hint}`}
              >
                <strong>{bulle.label}</strong>
                <span>{bulle.hint}</span>
              </button>
            ))}
          </div>

          <div className="live-chat" aria-label="Le chat du direct" aria-live="polite">
            {lignes.length === 0 ? (
              <p className="live-chat-silence">Le chat attend que ça commence…</p>
            ) : (
              lignes.map((ligne) => (
                <p key={`${ligne.at}-${ligne.text}`} className="live-chat-line">
                  <strong>viewer</strong> {ligne.text}
                </p>
              ))
            )}
          </div>

          <p className="live-foot">
            Ton palier : {tierAt(palier).label}. {plan.alerts.length > 0
              ? `${plan.alerts.length} bulle${plan.alerts.length > 1 ? "s" : ""} tomberont pendant le direct.`
              : "Personne n'est annoncé : il n'y aura rien à attraper."}{" "}
            Chaque ligne du chat reste {Math.round(LIVE_CHAT_HOLD_MS / 1000)} secondes à l&apos;écran.
          </p>
        </>
      )}
    </section>
  );
}

/** La durée du direct, en secondes — pour l'annoncer avant de le lancer. */
export const LIVE_SECONDS = Math.round(LIVE_DURATION_MS / 1000);
