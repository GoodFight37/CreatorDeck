import { Capacitor, registerPlugin } from "@capacitor/core";

type NativeMemeExport = { save(options: { name: string; mime: string; base64: string }): Promise<{ saved: boolean }> };
let instance: NativeMemeExport | null | undefined;
export function nativeMemeExport(): NativeMemeExport | null {
  if (instance === undefined) instance = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
    ? registerPlugin<NativeMemeExport>("MemeExport") : null;
  return instance;
}

export async function saveNativeMeme(file: File) {
  const plugin = nativeMemeExport();
  if (!plugin) throw new Error("Enregistrement Android indisponible.");
  if (file.size > 25 * 1024 * 1024) throw new Error("La création dépasse 25 Mo.");
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Lecture de la création impossible."));
    reader.readAsDataURL(file);
  });
  return plugin.save({ name: file.name, mime: file.type, base64 });
}
