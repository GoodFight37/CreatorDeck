"use client";

/**
 * La pastille de sauvegarde : **la seule chose que le jeu dit de sa
 * synchronisation**.
 *
 * Elle remplace tout ce qui se faisait à la main (envoyer, charger, copier) :
 * le joueur voit un point vert et trois mots, et c'est tout ce dont il a
 * besoin. Le texte vient de `etatSynchronisation()` — jamais écrit ici, pour
 * qu'un seul endroit décide de la rédaction.
 */
import { useCloud } from "@/hooks/use-cloud";
import { etatSynchronisation } from "@/lib/account-display";

export function SyncBadge({ detail = false }: { detail?: boolean }) {
  const cloud = useCloud();
  const ligne = etatSynchronisation({
    configured: cloud.configured,
    signedIn: Boolean(cloud.userId),
    pending: cloud.pending,
    busy: cloud.busy,
    isError: cloud.isError,
  });

  return (
    <div className={`sync-badge ${ligne.tone}`} role="status">
      <span className="sync-dot" aria-hidden="true" />
      <div>
        <strong>{ligne.label}</strong>
        {detail && ligne.detail ? <span>{ligne.detail}</span> : null}
      </div>
    </div>
  );
}
