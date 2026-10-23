"use client";

import { useEffect, useRef } from "react";

/** Keep keyboard navigation inside the opening, then return it to the game. */
export function usePresentationFocus(active = true, returnFocusTo?: HTMLElement | null, onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!active || !dialog) return;
    const previous = returnFocusTo ?? document.activeElement;
    // Isoler les frères, jamais un ancêtre qui rendrait aussi la feuille inerte.
    const background: { node: HTMLElement; inert: boolean }[] = [];
    for (let branch: HTMLElement = dialog; branch.parentElement; branch = branch.parentElement) {
      for (const node of branch.parentElement.children) {
        if (node !== branch && node instanceof HTMLElement) {
          background.push({ node, inert: node.inert });
          node.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
    }
    dialog.focus({ preventScroll: true });
    function trapTab(event: KeyboardEvent) {
      const visible = (node: HTMLElement) => !node.closest("[inert]") && (node.checkVisibility
        ? node.checkVisibility({ visibilityProperty: true }) : node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden");
      const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"], dialog[open]')].filter(visible);
      if (dialogs.at(-1) !== dialog) return;
      if (event.key === "Escape" && close.current) {
        event.preventDefault(); event.stopPropagation(); close.current(); return;
      }
      if (event.key !== "Tab") return;
      const controls = [...dialog!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')]
        .filter(visible);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); dialog!.focus(); return; }
      if (!dialog!.contains(document.activeElement)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", trapTab);
    return () => {
      document.removeEventListener("keydown", trapTab);
      for (const { node, inert } of background) node.inert = inert;
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true });
        // A consumed pack can leave its trigger disabled. Stay in its section.
        if (document.activeElement !== previous) {
          previous.closest("section")
            ?.querySelector<HTMLElement>("[data-presentation-focus-fallback]")
            ?.focus({ preventScroll: true });
        }
      }
    };
  }, [active, returnFocusTo]);
  return ref;
}
