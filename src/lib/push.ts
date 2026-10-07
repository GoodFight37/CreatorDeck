/**
 * Les notifications côté appareil : demander la permission, obtenir le jeton
 * FCM, écouter les appuis.
 *
 * Ce module est le **seul** endroit du jeu qui parle au greffon natif
 * (`@capacitor/push-notifications`) : tout le reste passe par le magasin cloud
 * (`cloudStore.registerPush()`), qui décide quand inscrire le jeton côté
 * serveur. La séparation permet de tester la logique sans téléphone.
 *
 * Trois cas, et un seul compte :
 *
 *   * **pas de greffon** (navigateur, ou APK construit sans
 *     `android/app/google-services.json`) : `requestPushToken()` rend
 *     `{ refusal: "absent" }` et l'application n'affiche pas d'interrupteur —
 *     promettre un réglage qui ne fait rien serait pire que pas de réglage ;
 *   * **permission refusée** : `{ refusal: "refuse" }`. On ne relance pas la
 *     demande : Android ne la repose pas deux fois, et l'écran explique où la
 *     rallumer (Réglages → Applications → CreatorDeck → Notifications) ;
 *   * **accordée** : le jeton du greffon est renvoyé. Il vit quelques mois ;
 *     s'il change (réinstallation, nettoyage), la prochaine connexion en
 *     inscrit un neuf — l'ancien est retiré au passage.
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

/** Le canal Android : un seul, et son nom est celui que la notification porte. */
export const LIVE_CHANNEL_ID = "creatordeck-live";

/** Combien de temps on attend le jeton du greffon avant d'abandonner. */
const TOKEN_TIMEOUT_MS = 10_000;

export type PushRefusal = "absent" | "refuse" | "erreur";

export type PushTokenResult =
  | { status: "ok"; token: string }
  | { status: "refusal"; reason: PushRefusal; message: string };

/** Le greffon n'existe que dans l'APK ; le navigateur n'a pas de notifications. */
export function pushSupported(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Demande la permission (si nécessaire), enregistre l'appareil auprès de
 * Firebase et rend le jeton. Ne lève jamais : un refus est une réponse.
 */
export async function requestPushToken(): Promise<PushTokenResult> {
  if (!pushSupported()) {
    return {
      status: "refusal",
      reason: "absent",
      message: "Les notifications demandent l'application Android.",
    };
  }

  try {
    const existing = await PushNotifications.checkPermissions();
    const permission =
      existing.receive === "prompt" || existing.receive === "prompt-with-rationale"
        ? await PushNotifications.requestPermissions()
        : existing;
    if (permission.receive !== "granted") {
      return {
        status: "refusal",
        reason: "refuse",
        message: "Notifications refusées — tu peux les autoriser dans les réglages du téléphone.",
      };
    }

    // Le jeton arrive par événement, pas en réponse de `register()` : on
    // s'abonne d'abord, on demande ensuite.
    const token = await new Promise<string | null>((resolve) => {
      let done = false;
      const finish = (value: string | null) => {
        if (done) return;
        done = true;
        void listeners.then(([registration, error]) => {
          void registration.remove();
          void error.remove();
        });
        resolve(value);
      };
      const listeners = (async () => {
        const registration = await PushNotifications.addListener("registration", (event) =>
          finish(event.value),
        );
        const error = await PushNotifications.addListener("registrationError", () => finish(null));
        return [registration, error] as const;
      })();

      setTimeout(() => finish(null), TOKEN_TIMEOUT_MS);
      void PushNotifications.register();
    });

    if (!token) {
      return {
        status: "refusal",
        reason: "erreur",
        message: "Firebase n'a pas donné de jeton : réessaie plus tard.",
      };
    }
    return { status: "ok", token };
  } catch (error) {
    // APK sans `google-services.json`, greffon absent du build, service Google
    // manquant sur l'appareil : tous ces cas se ressemblent d'ici.
    return {
      status: "refusal",
      reason: "erreur",
      message: error instanceof Error ? error.message : "Notifications indisponibles sur cet appareil.",
    };
  }
}

/**
 * Crée le canal Android des directs (idempotent).
 *
 * Sans canal explicite, Android 8 et plus range tout dans « Divers », que
 * l'utilisateur ne voit qu'en dépliant les réglages — et qu'il coupe souvent
 * par accident. Un canal nommé, c'est aussi un interrupteur lisible dans les
 * réglages du téléphone (« Directs CreatorDeck »).
 */
export async function ensureLiveChannel(): Promise<void> {
  if (!pushSupported()) return;
  try {
    await PushNotifications.createChannel({
      id: LIVE_CHANNEL_ID,
      name: "Directs",
      description: "Un créateur de ta collection vient de passer en direct.",
      importance: 4,
      visibility: 1,
      sound: "default",
      vibration: true,
    });
  } catch {
    // Android 7 et moins n'ont pas de canaux : la notification passe quand même.
  }
}

/**
 * Un appui sur une notification. Le magasin s'en sert pour rafraîchir le direct
 * (le joueur arrive justement parce qu'un live a commencé), pas pour rouvrir un
 * écran précis : l'accueil montre déjà le bandeau du direct.
 */
export async function onPushTap(handler: (data: Record<string, string>) => void): Promise<() => void> {
  if (!pushSupported()) return () => {};
  try {
    const listener = await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const data = (event.notification.data ?? {}) as Record<string, unknown>;
      const flat: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") flat[key] = value;
      }
      handler(flat);
    });
    return () => void listener.remove();
  } catch {
    return () => {};
  }
}

/** Où vit le jeton sur l'appareil : un seul, celui de ce téléphone. */
export const PUSH_TOKEN_KEY = "creatordeck.cloud.push";

/** Le jeton déjà inscrit sur cet appareil (jamais celui d'un autre compte). */
export function readPushToken(storage: { getItem(key: string): string | null } | null): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Écrit (ou efface, avec `null`) le jeton de cet appareil. */
export function writePushToken(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void } | null,
  token: string | null,
): void {
  if (!storage) return;
  try {
    if (token) storage.setItem(PUSH_TOKEN_KEY, token);
    else storage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    // Stockage refusé : au pire, une réinscription au prochain lancement.
  }
}
