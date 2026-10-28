/**
 * Un emblème vectoriel identique dans le sachet et sur la carte retournée.
 * Le glyphe suit l'univers du sachet ouvert (`data-universe`, voir
 * booster-continuity.css) ; hors d'un sachet (classeur, fiche), c'est l'étoile.
 */
export function CardBackEmblem() {
  return (
    <svg viewBox="0 0 48 48" width="1em" height="1em" aria-hidden="true" style={{ display: "block" }}>
      <g className="cb-glyph cb-star">
        <path fill="currentColor" d="M24 4C26 16 32 22 44 24C32 26 26 32 24 44C22 32 16 26 4 24C16 22 22 16 24 4Z" />
      </g>
      <g className="cb-glyph cb-memes" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="19" />
        <path fill="currentColor" strokeWidth="1.5" d="M10 17h12v8H10zM26 17h12v8H26zM22 19h4v2h-4z" />
        <path d="M14 33q10 8 20 0" />
      </g>
      <g className="cb-glyph cb-imgflip" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path strokeWidth="2" opacity=".55" d="M16 6h22a3 3 0 0 1 3 3v26" />
        <rect x="7" y="11" width="29" height="31" rx="3" />
        <path d="M7 19h29" />
        <circle cx="21.5" cy="29.5" r="6" />
        <path strokeWidth="2" d="M19 28.5v.01M24 28.5v.01M19.2 32q2.3 2 4.6 0" />
      </g>
      <g className="cb-glyph cb-anime" fill="currentColor">
        <path d="M28 5A20 20 0 1 0 43 31A16 16 0 0 1 28 5Z" />
        <path d="M36 9l1.6 4.4L42 15l-4.4 1.6L36 21l-1.6-4.4L30 15l4.4-1.6z" />
      </g>
    </svg>
  );
}
