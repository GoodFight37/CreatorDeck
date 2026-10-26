"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { creatorImage, type Creator } from "@/lib/catalog";

export function BinderPageExport({ creators, owned, page }: {
  creators: readonly Creator[]; owned: ReadonlySet<string>; page: number;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => () => { if (image) URL.revokeObjectURL(image); }, [image]);

  // shortcut: téléchargement blob réservé au web, ajouter un pont natif pour l'APK.
  if (Capacitor.isNativePlatform()) return null;

  async function generate() {
    setBusy(true);
    setProblem(null);
    try {
      const { drawBinderPage, loadPosterImage } = await import("@/lib/poster");
      const images = new Map<string, CanvasImageSource>();
      await Promise.all(creators.filter((creator) => owned.has(creator.slug)).map(async (creator) => {
        const portrait = await loadPosterImage(creatorImage(creator));
        if (portrait) images.set(creator.slug, portrait);
      }));
      const canvas = document.createElement("canvas");
      drawBinderPage(canvas, creators, owned, page, images);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Image vide");
      if (active.current) setImage(URL.createObjectURL(blob));
    } catch {
      if (active.current) setProblem("Impossible de fabriquer l’image sur cet appareil. Réessaie.");
    } finally {
      if (active.current) setBusy(false);
    }
  }

  return <div className="binder-export">
    <button type="button" className="ghost-button" disabled={busy || !creators.length} onClick={() => void generate()}>
      {busy ? "Préparation de l’image…" : "Exporter cette page"}
    </button>
    {problem ? <p role="alert">{problem}</p> : null}
    {image ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={`Page ${page} de mon classeur · ${creators.length} cartes`} />
      <a className="ghost-button" href={image} download={`creatordeck-classeur-page-${page}.png`}>Enregistrer l’image</a>
      <button type="button" className="ghost-button" onClick={() => setImage(null)}>Fermer l’image</button>
    </> : null}
  </div>;
}
