"use client";

import { useEffect, useRef, useState } from "react";
import { cardEffectsAllowed } from "@/lib/tilt";
import type { FoilRenderer, FoilPose } from "@/lib/pack-foil-renderer";

/** Lazy GPU enhancement: the intact 2D opening remains beneath until ready. */
export function PackFoil3D({ artwork, progress, from, to, opened, enabled = false }: FoilPose & { artwork: string; enabled?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<FoilRenderer | null>(null);
  const pose = useRef<FoilPose>({ progress, from, to, opened });
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("disabled");

  useEffect(() => {
    const node = host.current;
    if (!node || !enabled) return;
    let cancelled = false;
    let failed = false;
    let loading = false;
    const stop = (reason: string) => {
      renderer.current?.dispose();
      renderer.current = null;
      node.parentElement?.classList.remove("has-foil-3d");
      setReady(false);
      setStatus(reason);
    };
    const fail = (reason = "context-lost") => { failed = true; stop(reason); };
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = async () => {
      if (!cardEffectsAllowed()) { stop("effects-off"); return; }
      if (failed || renderer.current || loading) return;
      loading = true;
      setStatus("loading");
      const timeout = window.setTimeout(() => { if (!cancelled) fail("timeout"); }, 2_500);
      try {
        const { createFoilRenderer } = await import("@/lib/pack-foil-renderer");
        if (cancelled || failed || !cardEffectsAllowed()) return;
        if (pose.current.opened) { setStatus("opened-before-ready"); return; }
        const result = await createFoilRenderer(node, artwork, () => fail());
        if (cancelled || !cardEffectsAllowed() || failed) { result.dispose(); return; }
        // Do not replace the 2D material half way through an extraction.
        if (pose.current.opened) { result.dispose(); setStatus("opened-before-ready"); return; }
        renderer.current = result;
        result.update(pose.current);
        node.parentElement?.classList.add("has-foil-3d");
        setReady(true);
        setStatus("ready");
      } catch (error) {
        if (!cancelled) {
          fail("failed");
          console.warn("Sachet 3D indisponible ; ouverture 2D conservée.", error);
        }
      }
      finally { loading = false; window.clearTimeout(timeout); }
    };
    void sync();
    motion?.addEventListener("change", sync);
    const preferences = new MutationObserver(() => { void sync(); });
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ["data-card-fx"] });
    return () => {
      cancelled = true;
      motion?.removeEventListener("change", sync);
      preferences.disconnect();
      renderer.current?.dispose();
      renderer.current = null;
      node.parentElement?.classList.remove("has-foil-3d");
    };
  }, [artwork, enabled]);

  useEffect(() => {
    pose.current = { progress, from, to, opened };
    renderer.current?.update(pose.current);
  }, [progress, from, to, opened]);

  return <div ref={host} className="opening-foil-3d" data-foil-renderer={ready ? "webgl" : "2d"} data-foil-status={status} aria-hidden="true" />;
}
