/**
 * Les objets de la barre du bas : un classeur, un sachet, une cible. Des objets
 * du jeu, pas des icônes de boîte à outils (le choix N1 de Malik, 21 octobre
 * 2026). Couleurs des sachets ; jamais d'or, réservé à la légendaire.
 */
export function BinderObject() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="6" y="4" width="21" height="24" rx="3" fill="#fff4dc" />
      <rect x="6" y="4" width="6" height="24" rx="3" fill="#ff4fa3" />
      <circle cx="9" cy="10" r="1.6" fill="#fff4dc" />
      <circle cx="9" cy="16" r="1.6" fill="#fff4dc" />
      <circle cx="9" cy="22" r="1.6" fill="#fff4dc" />
      <rect x="15" y="9" width="9" height="12" rx="1.5" fill="#8a5cff" />
    </svg>
  );
}

export function SachetObject() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 2h20v4H6z" fill="#cdbdff" />
      <path d="M8 6h16l1.5 19h-19z" fill="#8a5cff" />
      <path d="M6 25h20v4H6z" fill="#cdbdff" />
      <circle cx="16" cy="15" r="4.5" fill="#ff4fa3" />
      <path d="m16 10 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#fff" />
    </svg>
  );
}

export function TargetObject() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="15" cy="17" r="11" fill="#8a5cff" />
      <circle cx="15" cy="17" r="7.5" fill="#fff4dc" />
      <circle cx="15" cy="17" r="4" fill="#ff4fa3" />
      <path d="m16 16 9-9" stroke="#d9ff3a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M22 4l4 .5-.5 4z" fill="#d9ff3a" />
    </svg>
  );
}
