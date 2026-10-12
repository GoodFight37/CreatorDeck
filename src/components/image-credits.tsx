"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { MANUAL_PORTRAIT_OVERRIDES, PORTRAIT_OVERRIDES } from "@/lib/creator-portraits";
import { CREATORS } from "@/lib/catalog";

/** Les attributions restent dans les réglages, jamais sur les cartes. */
export function ImageCredits() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="menu-row" aria-expanded={open} aria-controls="image-credits" onClick={() => setOpen(!open)}>
        <span>Crédits des images</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
      {open ? (
        <dl id="image-credits" className="credits-list">
          {Object.keys(MANUAL_PORTRAIT_OVERRIDES).length > 0 ? (
            <div>
              <dt>Portraits importés manuellement ({Object.keys(MANUAL_PORTRAIT_OVERRIDES).length})</dt>
              <dd>
                Source et licence non fournies dans l’archive reçue. Ces portraits sont utilisés tels quels ; leurs crédits restent à documenter.
                <details>
                  <summary>Afficher la liste</summary>
                  <ul>
                    {Object.keys(MANUAL_PORTRAIT_OVERRIDES).map((slug) => (
                      <li key={slug}>{CREATORS.find((creator) => creator.slug === slug)?.displayName ?? slug}</li>
                    ))}
                  </ul>
                </details>
              </dd>
            </div>
          ) : null}
          {Object.entries(PORTRAIT_OVERRIDES).map(([slug, portrait]) => (
            <div key={slug}>
              <dt>{portrait.name}</dt>
              <dd>
                {portrait.author} — {portrait.title}
                <em>
                  <a href={portrait.source} target="_blank" rel="noopener noreferrer">Source</a>
                  {" · "}
                  <a href={portrait.licenseUrl} target="_blank" rel="noopener noreferrer">{portrait.license}</a>
                </em>
                <em>{portrait.changes}</em>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
