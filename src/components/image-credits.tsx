"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PORTRAIT_OVERRIDES } from "@/lib/creator-portraits";

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
