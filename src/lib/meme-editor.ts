export type MemeText = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
};

export function validateTexts(boxes: readonly MemeText[]) {
  if (!boxes.length || boxes.length > 20 || boxes.some(box =>
    typeof box.text !== "string" || box.text.length > 2000
    || ![box.x, box.y, box.size].every(Number.isFinite)
    || box.x < 0 || box.x > 100 || box.y < 0 || box.y > 100
    || box.size < 1 || box.size > 20 || !/^#[\da-f]{6}$/i.test(box.color))) {
    throw new Error("Vérifie les zones de texte : 20 maximum, 2 000 caractères chacune.");
  }
}

export function paintTexts(context: CanvasRenderingContext2D, width: number, height: number, boxes: readonly MemeText[]) {
  validateTexts(boxes);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.lineJoin = "round";
  for (const box of boxes) {
    const size = width * box.size / 100;
    context.font = `900 ${size}px Arial, sans-serif`;
    context.fillStyle = box.color;
    context.strokeStyle = "#000000";
    context.lineWidth = Math.max(1, size / 12);
    const lines: string[] = [];
    for (const paragraph of box.text.split("\n")) {
      let line = "";
      for (const char of paragraph) {
        if (line && context.measureText(line + char).width > width * .94) {
          lines.push(line); line = "";
        }
        line += char;
      }
      lines.push(line);
    }
    const startY = Math.max(0, Math.min(height - lines.length * size * 1.15, height * box.y / 100));
    lines.forEach((line, index) => {
      const half = context.measureText(line).width / 2 + context.lineWidth;
      const x = Math.max(half, Math.min(width - half, width * box.x / 100)), y = startY + index * size * 1.15;
      context.strokeText(line, x, y); context.fillText(line, x, y);
    });
  }
}

type DecodedFrame = VideoFrame & { duration: number | null };
type Decoder = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number; repetitionCount: number } | null };
  decode(options: { frameIndex: number }): Promise<{ image: DecodedFrame }>;
  close(): void;
};
type DecoderConstructor = new (options: { data: ArrayBuffer; type: string; preferAnimation: boolean }) => Decoder;

export async function exportMeme(source: Blob, boxes: readonly MemeText[], signal?: AbortSignal, progress?: (value: number) => void): Promise<Blob> {
  validateTexts(boxes);
  if (source.size > 25 * 1024 * 1024) throw new Error("Ce média dépasse la limite de 25 Mo.");
  const bytes = await source.arrayBuffer();
  const gif = String.fromCharCode(...new Uint8Array(bytes, 0, Math.min(6, bytes.byteLength))).startsWith("GIF8");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Le dessin local est indisponible sur cet appareil.");
  if (!gif) {
    const image = await createImageBitmap(source);
    try {
      if (image.width * image.height > 16_000_000) throw new Error("Cette image est trop grande pour cet appareil.");
      signal?.throwIfAborted();
      canvas.width = image.width; canvas.height = image.height;
      context.drawImage(image, 0, 0); paintTexts(context, canvas.width, canvas.height, boxes);
      return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Export impossible.")), "image/png"));
    } finally { image.close(); }
  }
  const NativeDecoder = (globalThis as typeof globalThis & { ImageDecoder?: DecoderConstructor }).ImageDecoder;
  if (!NativeDecoder) throw new Error("Cet appareil ne décode pas les GIF pour le moment. Essaie avec Chrome à jour ; ton original est conservé.");
  const decoder = new NativeDecoder({ data: bytes, type: "image/gif", preferAnimation: true });
  try {
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    if (!track || track.frameCount > 1000) throw new Error("Animation trop longue pour cet appareil.");
    const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
    const encoder = GIFEncoder();
    for (let index = 0; index < track.frameCount; index++) {
      signal?.throwIfAborted();
      const { image } = await decoder.decode({ frameIndex: index });
      try {
        if (image.displayWidth * image.displayHeight > 16_000_000
          || image.displayWidth * image.displayHeight * track.frameCount > 100_000_000) throw new Error("Animation trop volumineuse pour cet appareil.");
        canvas.width = image.displayWidth; canvas.height = image.displayHeight;
        context.drawImage(image, 0, 0); paintTexts(context, canvas.width, canvas.height, boxes);
        const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const palette = quantize(rgba, 256, { format: "rgba4444", oneBitAlpha: true });
        const transparentIndex = palette.findIndex(color => color[3] === 0);
        encoder.writeFrame(applyPalette(rgba, palette, "rgba4444"), canvas.width, canvas.height, {
          palette, delay: (image.duration ?? 100_000) / 1000,
          repeat: track.repetitionCount === Infinity ? 0 : track.repetitionCount === 0 ? -1 : track.repetitionCount,
          transparent: transparentIndex >= 0, transparentIndex: Math.max(0, transparentIndex), dispose: 2,
        });
      } finally { image.close(); }
      progress?.(Math.round((index + 1) / track.frameCount * 100));
      // Leave time for touch, cancellation and the progress announcement.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    encoder.finish();
    const output = encoder.bytes();
    if (output.byteLength > 25 * 1024 * 1024) throw new Error("Le GIF créé dépasse 25 Mo. Réduis le texte ou choisis un modèle plus léger.");
    return new Blob([output], { type: "image/gif" });
  } finally { decoder.close(); }
}
