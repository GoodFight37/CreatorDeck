"use client";

/**
 * Thème d'application : la palette du chrome (fond, panneaux, boutons, texte).
 *
 * Les jetons vivent dans `src/app/globals.css` : `:root` est le thème par
 * défaut, `:root[data-theme="…"]` les autres. Ce module ne fait que lire et
 * poser l'attribut. **Rien ne l'appelle encore** : aucun thème n'est proposé au
 * joueur, et leur déblocage (collection complète, palier…) reste à décider.
 * Stockage local seulement, comme `tilt.ts`.
 */
export const DEFAULT_APP_THEME = "pocket";

/** Thèmes dont le bloc existe dans `globals.css`. `pocket` n'a pas de bloc : c'est `:root`. */
export const APP_THEMES = ["pocket", "live", "memes", "vault"] as const;
export type AppThemeId = (typeof APP_THEMES)[number];

const STORAGE_KEY = "creatordeck.app-theme";

export function isAppTheme(value: unknown): value is AppThemeId {
  return typeof value === "string" && (APP_THEMES as readonly string[]).includes(value);
}

/** Pose (ou retire, pour le thème par défaut) `data-theme` sur `<html>`. */
export function applyAppTheme(theme: AppThemeId): void {
  if (typeof document === "undefined") return;
  if (theme === DEFAULT_APP_THEME) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function storedAppTheme(): AppThemeId {
  if (typeof window === "undefined") return DEFAULT_APP_THEME;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAppTheme(stored) ? stored : DEFAULT_APP_THEME;
  } catch {
    return DEFAULT_APP_THEME;
  }
}

export function setAppTheme(theme: AppThemeId): void {
  applyAppTheme(theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Le thème reste actif pour la session si le stockage est indisponible.
  }
}
