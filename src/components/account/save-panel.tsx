"use client";

import { useState } from "react";
import { ClipboardCopy, ClipboardPaste } from "lucide-react";
import { gameStore } from "@/lib/game-store";

/**
 * La sauvegarde locale, dans la feuille de compte : c'est là qu'on vient
 * chercher « où est ma partie », et les deux gestes qui la déplacent (copier,
 * coller).
 *
 * Le panneau vit sa propre vie : il ne connaît ni le compte ni le classement, et
 * la feuille n'a rien à lui passer — d'où sa place dans son fichier.
 */
export function SavePanel() {
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveText, setSaveText] = useState("");
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState<string | null>(null);

  async function copySave() {
    const json = gameStore.exportSave();
    try {
      await navigator.clipboard.writeText(json);
      setManualCopy(null);
      setSaveNote("Sauvegarde copiée dans le presse-papiers.");
    } catch {
      // Presse-papiers indisponible (permission, WebView ancienne) : le texte
      // s'affiche pour une copie à la main.
      setManualCopy(json);
      setSaveNote(null);
    }
  }

  function importSave() {
    try {
      gameStore.importSave(saveText);
      setSaveText("");
      setSaveOpen(false);
      setSaveNote("Sauvegarde importée. Bon retour dans ton classeur !");
    } catch (caught) {
      setSaveNote(caught instanceof Error ? caught.message : "Import impossible.");
    }
  }

  return (
<section className="account-card">
        <div className="account-head">
          <ClipboardCopy size={15} />
          <strong>Sauvegarde de cet appareil</strong>
        </div>
        <p className="account-intro">
          La partie vit sur ce téléphone. Copie-la pour la garder au chaud ou la passer sur un autre
          appareil — un compte la transporte tout seul, une copie te laisse la main.
        </p>
        <div className="account-actions">
          <button type="button" className="account-button" onClick={() => void copySave()}>
            <ClipboardCopy size={14} /> Copier ma sauvegarde
          </button>
          <button
            type="button"
            className="account-button ghost"
            aria-expanded={saveOpen}
            onClick={() => setSaveOpen((open) => !open)}
          >
            <ClipboardPaste size={14} /> Importer une sauvegarde
          </button>
        </div>
        {saveOpen ? (
          <div className="save-editor">
            <textarea
              value={saveText}
              onChange={(event) => setSaveText(event.target.value)}
              placeholder='{ "version": 1, "playerId": "…" }'
              aria-label="Sauvegarde à importer"
              rows={5}
              spellCheck={false}
            />
            <button
              type="button"
              className="account-button wide"
              onClick={importSave}
              disabled={!saveText.trim()}
            >
              <ClipboardPaste size={14} /> Remplacer ma progression par cette sauvegarde
            </button>
          </div>
        ) : null}
        {manualCopy ? (
          <div className="save-editor">
            <p className="account-hint">Copie manuelle : sélectionne tout le texte ci-dessous.</p>
            <textarea
              value={manualCopy}
              readOnly
              rows={5}
              aria-label="Sauvegarde exportée"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        ) : null}
        {saveNote ? <p className="account-hint">{saveNote}</p> : null}
      </section>
  );
}
