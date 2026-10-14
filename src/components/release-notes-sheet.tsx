"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ChevronRight, ScrollText, X } from "lucide-react";
import { RELEASE_NOTES } from "@/lib/release-notes";
import { useReleaseNotes } from "@/hooks/use-release-notes";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";
import { useBackHandler } from "@/hooks/use-back-handler";
import "./release-notes.css";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export function ReleaseNotesSheet({ onClose }: { onClose: () => void }) {
  const { readIds, unreadCount, persisted, markRead, markAllRead } = useReleaseNotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const dialog = usePresentationFocus();
  const scroll = useRef<HTMLDivElement>(null);
  const selected = RELEASE_NOTES.find((note) => note.id === selectedId);
  const visible = RELEASE_NOTES.filter((note) => filter === "all" || !readIds.includes(note.id));
  useBackHandler(true, onClose);
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, []);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
    dialog.current?.focus({ preventScroll: true });
  }, [selectedId, dialog]);

  return createPortal(
    <div className="release-notes-overlay">
      <div className="release-notes-panel" role="dialog" aria-modal="true" aria-labelledby="release-notes-title" tabIndex={-1} ref={dialog}
        onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
        <header className="release-notes-header">
          <div><p>CREATORDECK · JOURNAL DU JEU</p><h2 id="release-notes-title">{selected ? selected.title : "Nouveautés"}</h2></div>
          <button type="button" onClick={onClose} aria-label="Fermer les nouveautés"><X size={21} /></button>
        </header>
        <div className="release-notes-content" ref={scroll}>
          {!persisted ? <p className="release-notes-warning" role="status">Le stockage est indisponible. Ta lecture est retenue pour cette session seulement.</p> : null}
          {selected ? <>
            <button type="button" className="release-notes-back" onClick={() => setSelectedId(null)}><ArrowLeft size={16} /> Tout l’historique</button>
            <article className="release-note-detail" aria-label={selected.title}>
              <time dateTime={selected.date}>{dateFormat.format(new Date(`${selected.date}T12:00:00Z`))}</time>
              <p className="release-note-summary">{selected.summary}</p>
              {selected.sections.map((section) => <section key={section.title}><h3>{section.title}</h3><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}
              <button type="button" className="release-notes-read" disabled={readIds.includes(selected.id)} onClick={() => { markRead(selected.id); dialog.current?.focus({ preventScroll: true }); }}>
                <Check size={18} /> {readIds.includes(selected.id) ? "Note lue" : "Marquer comme lue"}
              </button>
            </article>
          </> : <>
            <p className="release-notes-intro">Les nouveautés, améliorations et corrections du jeu. Retrouve ici les mises à jour, même après les avoir lues.</p>
            <div className="release-notes-filters" role="group" aria-label="Filtrer les mises à jour">
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Toutes ({RELEASE_NOTES.length})</button>
              <button type="button" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Non lues ({unreadCount})</button>
            </div>
            <div className="release-notes-list">
              {visible.map((note) => <button type="button" className="release-note-row" key={note.id} onClick={() => setSelectedId(note.id)}>
                <span className="release-note-row-copy"><time dateTime={note.date}>{dateFormat.format(new Date(`${note.date}T12:00:00Z`))}</time>
                  <strong>{note.title}</strong><span>{note.summary}</span>
                  {!readIds.includes(note.id) ? <small>Non lue</small> : <small className="release-note-seen"><Check size={12} /> Lue</small>}
                </span><ChevronRight size={18} />
              </button>)}
            </div>
            {!visible.length ? <div className="release-notes-empty"><ScrollText size={30} /><h3>Tu es à jour</h3><p>Aucune note non lue. Tout l’historique reste disponible.</p><button type="button" onClick={() => setFilter("all")}>Voir toutes les mises à jour</button></div> : null}
            {unreadCount > 0 ? <button type="button" className="release-notes-mark-all" onClick={() => { markAllRead(); dialog.current?.focus({ preventScroll: true }); }}><Check size={16} /> Tout marquer comme lu</button> : null}
          </>}
          <p className="release-notes-local">Lecture mémorisée sur cet appareil · Aucun compte requis</p>
        </div>
      </div>
    </div>, document.body,
  );
}
