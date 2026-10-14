"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RARITY_META, type Creator, type CardVariant } from "@/lib/catalog";
import type { usePoints } from "@/hooks/use-points";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";
import { useBackHandler } from "@/hooks/use-back-handler";
import { CreatorCard } from "./creator-card";

export type AtelierAction =
  | { kind: "craft"; creator: Creator; name: string; wallet: "points" | "tokens"; cost: number }
  | { kind: "recycle"; cardId: string; creator?: Creator; variant?: CardVariant; name: string; cost: number }
  | { kind: "bulk"; ids: string[]; name: string; cost: number; liveKept: number };

export function AtelierTransaction({ action, points, balance, onClose, onNotice, onError, onGoBinder, onCreate }: {
  action: AtelierAction; points: ReturnType<typeof usePoints>; balance: number;
  onClose: () => void; onNotice: (message: string) => void; onError: (message: string) => void;
  onGoBinder?: () => void; onCreate: () => void;
}) {
  const [phase, setPhase] = useState<"preview" | "pending" | "done">("preview");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const busy = useRef(false);
  const focus = usePresentationFocus();
  const close = () => { if (!busy.current) onClose(); };
  useBackHandler(true, close);
  const craft = action.kind === "craft";
  const currency = craft && action.wallet === "tokens" ? "jetons" : "points";
  const boosterOnly = craft && !RARITY_META[action.creator.rarity].craftable;
  const shortfall = craft ? Math.max(0, action.cost - balance) : 0;
  async function confirm() {
    if (busy.current || phase === "done" || boosterOnly || shortfall) return;
    busy.current = true; setPhase("pending"); setError("");
    try {
      const outcome = action.kind === "craft" ? await points.craft(action.creator.slug, action.wallet === "tokens")
        : action.kind === "recycle" ? await points.recycle(action.cardId) : await points.recycleAll(action.ids);
      if (outcome.status === "refused") throw new Error(outcome.message ?? "Action refusée.");
      const text = action.kind === "craft"
        ? `${action.name} rejoint ton classeur · ${outcome.delta !== undefined ? Math.abs(outcome.delta) : action.cost} ${currency}.`
        : action.kind === "bulk" && "count" in outcome
          ? `${outcome.count} doublon${outcome.count > 1 ? "s" : ""} recyclé${outcome.count > 1 ? "s" : ""} · +${outcome.delta} points.${outcome.message ? ` ${outcome.message}` : ""}`
          : outcome.delta === 0 ? "Aucun point supplémentaire : cette carte a déjà été traitée."
          : `Doublon recyclé · +${outcome.delta ?? action.cost} points.`;
      setResult(text); setPhase("done"); onNotice(text);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Action impossible. Réessaie.";
      setError(message); setPhase("preview"); onError(message);
    } finally { busy.current = false; }
  }
  return createPortal(
    <div className="atelier-transaction-backdrop">
      <div className={`atelier-transaction atelier-transaction--${phase}`} role="dialog" aria-modal="true" aria-labelledby="atelier-action-title"
        aria-busy={phase === "pending"} tabIndex={-1} ref={focus}
        onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
        <button className="atelier-close" type="button" disabled={phase === "pending"} onClick={close} aria-label="Fermer l’atelier">×</button>
        <p className="atelier-kicker">{phase === "done" ? "ATELIER · TERMINÉ" : craft ? "APERÇU · STANDARD" : "RECYCLAGE"}</p>
        <h2 id="atelier-action-title">{phase === "done" ? craft ? "Elle est à toi" : "Points récupérés" : craft ? action.name : "Transformer en points"}</h2>
        {action.kind !== "bulk" && action.creator ? <div className="atelier-card-stage"><CreatorCard creator={action.creator} variant={action.kind === "recycle" ? action.variant : "standard"} /></div>
          : <div className="atelier-recycle-stack"><strong>{action.kind === "bulk" ? action.ids.length : 1}</strong><span>doublons · +{action.cost} points estimés</span></div>}
        {phase === "done" ? <p role="status">{result}</p> : <>
          <p>{craft ? `Coût : ${action.cost} ${currency} · Solde : ${balance}` : "Ta dernière copie reste dans le classeur."}</p>
          {action.kind === "recycle" && action.variant === "live" ? <p>Tu confirmes le recyclage de ce doublon Live.</p> : null}
          {action.kind === "bulk" && action.liveKept > 0 ? <p>{action.liveKept} doublon{action.liveKept > 1 ? "s" : ""} Live conservé{action.liveKept > 1 ? "s" : ""}.</p> : null}
          {boosterOnly ? <p>Cette carte se trouve uniquement en booster.</p> : null}
          {shortfall > 0 ? <p>Il te manque {shortfall} {currency}.</p> : null}
          {error ? <p role="alert" className="atelier-transaction-error">{error}</p> : null}
        </>}
        <div className="atelier-transaction-actions">
          {phase === "done" ? <>
            {craft && onGoBinder ? <button type="button" className="primary-action" onClick={() => { onClose(); onGoBinder(); }}>Voir le classeur</button>
              : !craft ? <button type="button" className="primary-action" onClick={onCreate}>Choisir une carte</button> : null}
            <button type="button" className="secondary-action" onClick={close}>Retour à l’atelier</button>
          </> : <>
            <button type="button" className="primary-action" disabled={phase === "pending" || boosterOnly || shortfall > 0} onClick={confirm}>
              {phase === "pending" ? "En cours…" : boosterOnly ? "Booster uniquement" : craft ? `Créer · ${action.cost} ${currency}` : `Recycler · +${action.cost} points estimés`}</button>
            <button type="button" className="secondary-action" disabled={phase === "pending"} onClick={close}>Annuler</button>
          </>}
        </div>
      </div>
    </div>, document.body,
  );
}
