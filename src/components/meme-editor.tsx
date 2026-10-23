"use client";

import { useEffect, useRef, useState } from "react";
import type { MemeCard } from "@/lib/memes";
import { exportMeme, paintTexts, type MemeText } from "@/lib/meme-editor";
import { useCloud } from "@/hooks/use-cloud";
import { CloudApi } from "@/lib/cloud/api";
import { cloudConfig } from "@/lib/cloud/config";
import { deviceStorage } from "@/lib/storage";
import { nativeMemeExport, saveNativeMeme } from "@/lib/native-meme-export";
import "./meme-editor.css";

export function MemeEditor({ card, copies, onClose }: { card: MemeCard; copies: number; onClose: () => void }) {
  const cloud = useCloud();
  const [owner] = useState(cloud.userId);
  const [boxes, setBoxes] = useState<MemeText[]>([{ id: "first", text: "Ton texte", x: 50, y: 5, size: 7, color: "#ffffff" }]);
  const [active, setActive] = useState("first");
  const [source, setSource] = useState<Blob | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; file: File } | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [paused, setPaused] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const canvas = useRef<HTMLCanvasElement>(null);
  const snapshot = useRef<HTMLCanvasElement>(null);
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const image = useRef<HTMLImageElement>(null);
  const selected = boxes.find(box => box.id === active) ?? boxes[0];
  const allowed = copies > 0 && Boolean(owner) && owner === cloud.userId && Boolean(card.image);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; abort.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!allowed || !card.image) return;
    const controller = new AbortController();
    let objectUrl = "";
    const url = new URL(card.image, location.origin);
    if (url.origin !== location.origin) return;
    void fetch(url, { signal: controller.signal }).then(async response => {
      if (!response.ok || Number(response.headers.get("content-length")) > 25 * 1024 * 1024) throw new Error("Le modèle ne peut pas être chargé.");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/") || blob.size > 25 * 1024 * 1024) throw new Error("Le modèle dépasse les limites de cet appareil.");
      if (!controller.signal.aborted) {
        objectUrl = URL.createObjectURL(blob);
        setSource(blob); setMediaUrl(objectUrl);
      }
    }).catch(error => { if (!controller.signal.aborted) setProblem(error.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [allowed, card.image]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  useEffect(() => {
    if (!allowed) abort.current?.abort();
  }, [allowed]);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const context = target.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, target.width, target.height);
    paintTexts(context, target.width, target.height, boxes);
  }, [boxes, mediaUrl]);

  function change(patch: Partial<MemeText>) {
    setBoxes(value => value.map(box => box.id === selected.id ? { ...box, ...patch } : box));
    setResult(null);
  }
  function freezePreview() {
    const frozen = snapshot.current, media = image.current, text = canvas.current;
    if (!frozen || !media || !text || !media.naturalWidth) return;
    frozen.width = text.width; frozen.height = text.height;
    frozen.getContext("2d")?.drawImage(media, 0, 0, frozen.width, frozen.height);
  }
  async function save() {
    if (!allowed || !source || busy) return;
    const config = cloudConfig();
    if (!config) { setProblem("Reconnecte-toi pour vérifier ta carte."); return; }
    const controller = new AbortController(); abort.current = controller;
    setBusy(true); setProblem(""); setPercent(0); setResult(null);
    try {
      // Recheck the existing server inventory; local counts never grant a card.
      const status = await new CloudApi(config, deviceStorage()).memeStatus();
      if (!status.owned.some(entry => entry.id === card.id && entry.copies > 0)) throw new Error("Cette carte ne figure plus dans ta collection.");
      controller.signal.throwIfAborted();
      const blob = await exportMeme(source, boxes, controller.signal, value => { if (mounted.current) setPercent(value); });
      controller.signal.throwIfAborted();
      const name = `creatordeck-${card.id}-${Date.now()}.${blob.type === "image/gif" ? "gif" : "png"}`;
      if (mounted.current) setResult({ url: URL.createObjectURL(blob), name, file: new File([blob], name, { type: blob.type }) });
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) setProblem(error instanceof Error ? error.message : "La création a échoué. Ton original est intact.");
    } finally { if (mounted.current) setBusy(false); }
  }
  async function share() {
    if (!result || !allowed) return;
    try {
      if (!navigator.canShare?.({ files: [result.file] })) throw new Error("Utilise le bouton Télécharger sur cet appareil.");
      await navigator.share({ files: [result.file], title: card.name });
    } catch (error) { if (error instanceof Error && error.name !== "AbortError") setProblem(error.message); }
  }
  async function saveToDevice() {
    if (!result || !allowed) return;
    try { await saveNativeMeme(result.file); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Enregistrement impossible."); }
  }
  if (!allowed) return <section role="alert"><p>Choisis une carte de ta collection pour créer un mème.</p><button onClick={onClose}>Retour à la carte</button></section>;
  return <section className="meme-editor" aria-label="Créer un mème">
    <h2>Crée ton mème</h2><p>{card.name} · une nouvelle image, ta carte reste intacte.</p>
    <div className="meme-editor-preview" onPointerDown={event => {
      if (busy) return;
      const rect = event.currentTarget.getBoundingClientRect();
      change({ x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)),
        y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) });
    }}>
      {/* Animated source stays animated underneath the transparent text layer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={image} src={mediaUrl || undefined} alt={card.name} style={{ visibility: paused ? "hidden" : undefined }} onLoad={() => {
        const target = canvas.current, media = image.current;
        if (!target || !media) return;
        const scale = Math.min(1, 1000 / media.naturalWidth);
        media.parentElement!.style.maxWidth = `min(100%, ${40 * media.naturalWidth / media.naturalHeight}dvh)`;
        target.width = Math.round(media.naturalWidth * scale); target.height = Math.round(media.naturalHeight * scale);
        const context = target.getContext("2d");
        if (context) paintTexts(context, target.width, target.height, boxes);
        freezePreview();
      }} />
      <canvas ref={snapshot} hidden={!paused} aria-hidden="true" />
      <canvas ref={canvas} width={800} height={600} aria-hidden="true" />
    </div>
    {source?.type === "image/gif" ? <button className="meme-create" type="button" aria-pressed={paused} onClick={() => { if (!paused) freezePreview(); setPaused(value => !value); }}>{paused ? "Animer l’aperçu" : "Mettre l’aperçu en pause"}</button> : null}
    <p className="meme-editor-hint">Touche l’image pour placer la zone sélectionnée. Les réglages permettent aussi de la déplacer.</p>
    <fieldset disabled={busy}><legend>Zones de texte</legend>
      <label>Zone<select value={selected.id} onChange={event => setActive(event.target.value)}>{boxes.map((box, index) => <option key={box.id} value={box.id}>Texte {index + 1}</option>)}</select></label>
      <label>Texte<textarea aria-label="Texte de la zone" value={selected.text} maxLength={2000} onChange={event => change({ text: event.target.value })} /></label>
      <div className="meme-editor-sliders">
        <label>Horizontal<input type="range" min="0" max="100" value={selected.x} onChange={event => change({ x: Number(event.target.value) })} /></label>
        <label>Vertical<input type="range" min="0" max="100" value={selected.y} onChange={event => change({ y: Number(event.target.value) })} /></label>
        <label>Taille<input type="range" min="1" max="20" value={selected.size} onChange={event => change({ size: Number(event.target.value) })} /></label>
        <label>Couleur<input type="color" value={selected.color} onChange={event => change({ color: event.target.value })} /></label>
      </div>
      <div className="meme-editor-actions"><button type="button" disabled={boxes.length >= 20} onClick={() => {
        const id = crypto.randomUUID(); setBoxes(value => [...value, { id, text: "", x: 50, y: 75, size: 7, color: "#ffffff" }]); setActive(id); setResult(null);
      }}>Ajouter un texte</button><button type="button" disabled={boxes.length === 1} onClick={() => { setBoxes(value => value.filter(box => box.id !== selected.id)); setActive(boxes.find(box => box.id !== selected.id)!.id); setResult(null); }}>Supprimer ce texte</button></div>
    </fieldset>
    {problem ? <p role="alert">{problem}</p> : null}
    <p role="status">{busy ? `Création en cours… ${percent} %` : !source ? "Chargement du modèle…" : result ? "Ta création est prête." : "Tout le texte reste sur ton appareil."}</p>
    <div className="meme-editor-actions"><button type="button" disabled={!source || busy} onClick={() => void save()}>Créer le fichier</button>
      {busy ? <button type="button" onClick={() => abort.current?.abort()}>Annuler la création</button> : null}
      {result ? nativeMemeExport() ? <button type="button" onClick={() => void saveToDevice()}>Enregistrer sur l’appareil</button> : <><a href={result.url} download={result.name}>Télécharger</a><button type="button" onClick={() => void share()}>Enregistrer / partager</button></> : null}
      <button type="button" onClick={onClose}>Retour à la carte</button></div>
  </section>;
}
