"use client";

/**
 * Les réglages, derrière l'engrenage de l'en-tête : compte, son, affichage,
 * informations. Ils vivaient tout en bas de « Toi », à trois touches ; ils sont
 * maintenant à une seule, d'où que l'on soit.
 */
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ChevronRight, X } from "lucide-react";

import { PromoCodeSheet } from "@/components/promo-code-sheet";
import { ReleaseNotesSheet } from "@/components/release-notes-sheet";
import { useCloud } from "@/hooks/use-cloud";
import { useReleaseNotes } from "@/hooks/use-release-notes";
import { BUILD_COMMIT, BUILD_VERSION } from "@/lib/build-version";
import { diagnosticsEnabled, exportDiagnostics, setDiagnosticsEnabled } from "@/lib/local-diagnostics";
import { isMusicMuted, isMuted, setMusicMuted, setMuted } from "@/lib/sfx";
import { setTiltEnabled, tiltEnabled } from "@/lib/tilt";

function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="menu-row" role="switch" aria-checked={on} onClick={onToggle}>
      <span>{label}</span>
      <span className="switch" data-on={on ? "on" : "off"} aria-hidden="true"><i /></span>
    </button>
  );
}

export function SettingsSheet({
  onClose,
  onShowAccount,
  onShowNotifications,
  onShowThemes,
  onNotice,
  onError,
}: {
  onClose: () => void;
  onShowAccount: () => void;
  onShowNotifications: () => void;
  onShowThemes: () => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const cloud = useCloud();
  const { unreadCount } = useReleaseNotes();
  const [soundOn, setSoundOn] = useState(() => !isMuted());
  const [musicOn, setMusicOn] = useState(() => !isMusicMuted());
  const [tiltOn, setTiltOn] = useState(() => tiltEnabled());
  const [diagnosticsOn, setDiagnosticsOn] = useState(() => diagnosticsEnabled());
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const previous = document.activeElement;
    closeButton.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const dialog = closeButton.current?.closest('[role="dialog"]');
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      // Les feuilles du compte, des taux et des nouveautés gardent la priorité.
      const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter((node) => node.checkVisibility({ visibilityProperty: true }));
      if (dialogs.at(-1) !== dialog) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')]
        .filter((node) => node.checkVisibility({ visibilityProperty: true }));
      const first = controls[0], last = controls.at(-1);
      if (!first || !last) return;
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accountState = !cloud.configured
    ? "Sauvegarde sur cet appareil"
    : !cloud.userId
      ? "Lie ton compte pour retrouver ta collection"
      : cloud.syncNeedsChoice
        ? "Synchronisation à vérifier"
        : cloud.saveSyncing
          ? "Sauvegarde en cours…"
          : cloud.pending
            ? "Sauvegarde en attente"
            : cloud.isError
              ? "Une action demande ton attention"
              : "Compte connecté";

  async function shareDiagnostics() {
    const text = exportDiagnostics();
    try {
      if (navigator.share) await navigator.share({ title: "Diagnostic CreatorDeck", text });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        onNotice("Diagnostic copié.");
      } else onError("Le partage est indisponible sur cet appareil.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      onError("Le diagnostic n’a pas pu être partagé.");
    }
  }

  return (
    <div className="odds-overlay settings-overlay" role="dialog" aria-modal="true" aria-label="Réglages">
      <div className="odds-panel settings-panel">
        <header className="odds-head">
          <h2>Réglages</h2>
          <button type="button" ref={closeButton} onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>

        <section className="menu-group" aria-label="Compte">
          <h3>Compte</h3>
          <button type="button" className="menu-row" onClick={onShowAccount}>
            <span className="menu-label">Mon compte<small className="menu-state">{accountState}</small></span>
            <ChevronRight size={16} />
          </button>
          {cloud.configured && cloud.userId ? (
            <button type="button" className="menu-row" onClick={onShowNotifications}>
              <span>Notifications</span><ChevronRight size={16} />
            </button>
          ) : null}
          <button type="button" className="menu-row" onClick={() => setShowPromoCode(true)}>
            <span>J&apos;ai un code booster</span><ChevronRight size={16} />
          </button>
        </section>

        <section className="menu-group" aria-label="Son et affichage">
          <h3>Son et affichage</h3>
          <Switch label="Sons et vibrations" on={soundOn} onToggle={() => { setSoundOn(!soundOn); setMuted(soundOn); }} />
          <Switch label="Musique" on={musicOn} onToggle={() => { setMusicOn(!musicOn); setMusicMuted(musicOn); }} />
          <Switch label="Reflets des cartes" on={tiltOn} onToggle={() => { setTiltOn(!tiltOn); setTiltEnabled(!tiltOn); }} />
          <button type="button" className="menu-row" onClick={onShowThemes}>
            <span>Thème du classeur</span><ChevronRight size={16} />
          </button>
        </section>

        <section className="menu-group" aria-label="Informations">
          <h3>Informations</h3>
          <button type="button" className="menu-row" onClick={() => setShowReleaseNotes(true)}
            aria-label={`Nouveautés${unreadCount ? ` · ${unreadCount} notes non lues` : ""}`}>
            <span>Nouveautés</span>
            {unreadCount > 0 ? <b className="menu-count" aria-hidden="true">{unreadCount}</b> : <ChevronRight size={16} />}
          </button>
        </section>

        {/* Pour signaler un problème : replié, ce n'est pas un réglage de jeu. */}
        <details className="settings-advanced">
          <summary>Avancé</summary>
          <Switch label="Diagnostics sur cet appareil" on={diagnosticsOn}
            onToggle={() => { setDiagnosticsEnabled(!diagnosticsOn); setDiagnosticsOn(!diagnosticsOn); }} />
          <small>Erreurs, lenteurs et fluidité des ouvertures, avec l’écran concerné. Gardées ici, aucun envoi automatique. Couper efface le journal.</small>
          {diagnosticsOn ? (
            <button type="button" className="menu-row" onClick={() => void shareDiagnostics()}>
              <span>Partager le diagnostic</span><ChevronRight size={16} />
            </button>
          ) : null}
          <small
            className="profile-build-version"
            title={BUILD_COMMIT ? `Commit complet : ${BUILD_COMMIT}` : "Build local sans commit Git"}
            aria-label={`Version ${Capacitor.isNativePlatform() ? "Android" : "Web"} ${BUILD_VERSION}`}
          >
            Version {Capacitor.isNativePlatform() ? "Android" : "Web"} · {BUILD_VERSION}
          </small>
        </details>
      </div>
      {showPromoCode ? <PromoCodeSheet onClose={() => setShowPromoCode(false)} /> : null}
      {showReleaseNotes ? <ReleaseNotesSheet onClose={() => setShowReleaseNotes(false)} /> : null}
    </div>
  );
}
