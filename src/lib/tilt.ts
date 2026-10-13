"use client";

/** Choix des reflets de carte ; le reflet suit le pointeur, sans capteur d'orientation. */
const STORAGE_KEY = "creatordeck.tilt";
const ATTRIBUT = "cardFx";

function poserAttribut(value: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset[ATTRIBUT] = value ? "on" : "off";
}

export function applyTiltChoice(): void {
  poserAttribut(tiltEnabled());
}

export function tiltEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const choice = window.localStorage.getItem(STORAGE_KEY);
    if (choice === "off") return false;
    if (choice === "on") return true;
    return true;
  } catch {
    return true;
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

export function cardEffectsAllowed(): boolean {
  if (typeof document === "undefined" || document.documentElement.dataset[ATTRIBUT] === "off") return false;
  return !prefersReducedMotion();
}

export function setTiltEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  poserAttribut(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  } catch {
    // Le réglage reste actif pour la session si le stockage est indisponible.
  }
}
