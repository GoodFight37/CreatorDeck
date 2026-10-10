"use client";

import { useEffect, useRef } from "react";

/** Keep keyboard navigation inside the opening, then return it to the game. */
export function usePresentationFocus(active = true, returnFocusTo?: HTMLElement | null) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!active || !dialog) return;
    const previous = returnFocusTo ?? document.activeElement;
    const game = document.querySelector<HTMLElement>(".app-shell");
    const wasInert = game?.inert ?? false;
    if (game) game.inert = true;
    dialog.focus({ preventScroll: true });
    function trapTab(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const controls = [...dialog!.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')]
        .filter((node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    dialog.addEventListener("keydown", trapTab);
    return () => {
      dialog.removeEventListener("keydown", trapTab);
      if (game) game.inert = wasInert;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [active, returnFocusTo]);
  return ref;
}
