/**
 * Le pont vers le plugin Android `AppUpdater` (D-144,
 * `android/app/src/main/java/com/creatordeck/app/AppUpdaterPlugin.java`).
 *
 * Sur le site ou en test, `nativeUpdater()` renvoie `null` : la mise à jour
 * d'APK n'existe que dans l'APK.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type NativeUpdater = {
  info(): Promise<{ versionCode: number; versionName: string; canInstall: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadAndInstall(options: { url: string; sha256: string; versionCode: number }): Promise<{ started: boolean }>;
  addListener(event: "progress", listener: (progress: { done: number; total: number }) => void): Promise<PluginListenerHandle>;
};

let instance: NativeUpdater | null | undefined;

export function nativeUpdater(): NativeUpdater | null {
  if (instance !== undefined) return instance;
  try {
    instance = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
      ? registerPlugin<NativeUpdater>("AppUpdater")
      : null;
  } catch {
    instance = null;
  }
  return instance;
}
