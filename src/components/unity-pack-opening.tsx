"use client";

/**
 * Ouverture de booster pilotée par Unity, utilisée UNIQUEMENT si un build
 * Unity WebGL est réellement déposé dans `public/unity/` (voir le README à cet
 * emplacement). Sinon `PackOpening` reste sur sa cinématique web.
 *
 * Contrat (documenté dans `public/unity/README.md`) :
 *   React → Unity : `SendMessage("CreatorDeckCinematic", "SetCards", payload)`
 *   Unity → React : `window.CreatorDeckUnity.notify(JSON.stringify(event))`
 *
 * Le tirage est effectué ici, au message `tear-complete`, exactement comme dans
 * la cinématique web : la déchirure précède toujours la consommation du
 * booster.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import type { PackType } from "@/lib/catalog";
import type { DrawnCard } from "@/lib/game-engine";
import {
  loadUnityBuild,
  parseUnityEvent,
  serializeDrawPayload,
  unityBuildAvailable,
  type UnityInstance,
} from "@/lib/unity-bridge";

export type UnityPackOpeningProps = {
  packType: PackType;
  onDraw: () => DrawnCard[];
  onClose: () => void;
  onError: (message: string) => void;
  /** Le build a échoué à démarrer : le repli web reprend la main. */
  onUnavailable: () => void;
};

export function UnityPackOpening({
  packType,
  onDraw,
  onClose,
  onError,
  onUnavailable,
}: UnityPackOpeningProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<UnityInstance | null>(null);
  const drawRef = useRef(onDraw);
  const failRef = useRef(onUnavailable);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    drawRef.current = onDraw;
    failRef.current = onUnavailable;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const fail = () => {
      if (cancelled) return;
      failRef.current();
    };

    loadUnityBuild(canvas).then((instance) => {
      if (cancelled) return;
      if (!instance) {
        fail();
        return;
      }
      instanceRef.current = instance;
      setLoading(false);

      // Unity → React. Un message invalide est ignoré, jamais fatal.
      window.CreatorDeckUnity = {
        notify: (raw: string) => {
          const event = parseUnityEvent(raw);
          if (!event) return;
          if (event.type === "tear-complete") {
            try {
              const cards = drawRef.current();
              instance.SendMessage(
                "CreatorDeckCinematic",
                "SetCards",
                serializeDrawPayload({ packType, cards }),
              );
            } catch (caught) {
              onError(caught instanceof Error ? caught.message : "Ouverture impossible.");
              onClose();
            }
            return;
          }
          if (event.type === "close") {
            onClose();
            return;
          }
          if (event.type === "error") {
            onError(event.message);
            fail();
          }
        },
      };
      instance.SendMessage("CreatorDeckCinematic", "StartOpening", packType);
    });

    return () => {
      cancelled = true;
      delete window.CreatorDeckUnity;
      instanceRef.current = null;
    };
  }, [packType, onClose, onError]);

  return (
    <div className="pack-cinema stage-sealed unity-cinema" role="dialog" aria-modal="true">
      <div className="pack-cinema-ambient" aria-hidden="true" />
      <header className="pack-cinema-header">
        <span>Unity</span>
        <button type="button" onClick={onClose} aria-label="Fermer l'ouverture">
          <X size={20} />
        </button>
      </header>
      <canvas
        ref={canvasRef}
        className="unity-canvas"
        id="unity-canvas"
        role="img"
        aria-label="Animation d'ouverture du booster"
      />
      <footer className="pack-cinema-footer">
        <p className="pack-cinema-hint" aria-live="polite">
          {loading ? "Chargement de la cinématique Unity…" : ""}
        </p>
      </footer>
    </div>
  );
}

/**
 * Détecte la présence du loader Unity.
 *
 * Implémenté avec `useSyncExternalStore` plutôt qu'avec un `setState` dans un
 * effet : la vérification est un système externe (existance d'un fichier
 * statique), elle n'a pas lieu qu'une fois par page, et tous les abonnés
 * reçoient le même résultat. Un HEAD fait sur chaque montage relancerait le
 * réseau inutilement.
 */
type UnityStatus = "checking" | "available" | "absent";

let probeStatus: UnityStatus = "checking";
let probing = false;
const probeListeners = new Set<() => void>();

function notifyProbe() {
  for (const listener of probeListeners) listener();
}

function ensureProbe() {
  if (probing) return;
  probing = true;
  unityBuildAvailable()
    .then((available) => {
      probeStatus = available ? "available" : "absent";
    })
    .catch(() => {
      probeStatus = "absent";
    })
    .finally(notifyProbe);
}

function subscribeProbe(onStoreChange: () => void) {
  probeListeners.add(onStoreChange);
  ensureProbe();
  return () => {
    probeListeners.delete(onStoreChange);
  };
}

export function useUnityBuildAvailable(): UnityStatus {
  return useSyncExternalStore(subscribeProbe, () => probeStatus, () => "checking");
}
