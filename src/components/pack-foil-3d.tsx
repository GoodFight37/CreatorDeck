"use client";

import { useEffect, useRef, useState } from "react";
import { cardEffectsAllowed } from "@/lib/tilt";
import type { FoilRenderer, FoilPose } from "@/lib/pack-foil-renderer";

/** Lazy GPU enhancement: the intact 2D opening remains beneath until ready. */
export function PackFoil3D({ artwork, progress, from, to, opened }: FoilPose & { artwork: string }) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<FoilRenderer | null>(null);
  const pose = useRef<FoilPose>({ progress, from, to, opened });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    let failed = false;
    let loading = false;
    const stop = () => {
      renderer.current?.dispose();
      renderer.current = null;
      node.parentElement?.classList.remove("has-foil-3d");
      setReady(false);
    };
    const fail = () => { failed = true; stop(); };
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = async () => {
      if (!cardEffectsAllowed()) { stop(); return; }
      if (failed || renderer.current || loading) return;
      loading = true;
      try {
        const { createFoilRenderer } = await import("@/lib/pack-foil-renderer");
        if (cancelled || !cardEffectsAllowed()) return;
        const result = await createFoilRenderer(node, artwork, fail);
        if (cancelled || !cardEffectsAllowed() || failed) { result.dispose(); return; }
        // Do not replace the 2D material half way through an extraction.
        if (pose.current.opened) { result.dispose(); return; }
        renderer.current = result;
        result.update(pose.current);
        node.parentElement?.classList.add("has-foil-3d");
        setReady(true);
      } catch { if (!cancelled) fail(); }
      finally { loading = false; }
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
  }, [artwork]);

  useEffect(() => {
    pose.current = { progress, from, to, opened };
    renderer.current?.update(pose.current);
  }, [progress, from, to, opened]);

  return <div ref={host} className="opening-foil-3d" data-foil-renderer={ready ? "webgl" : "2d"} aria-hidden="true" />;
}
