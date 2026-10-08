/**
 * Transport réseau du cloud.
 *
 * Sur le Web (navigateur, aperçu, tests) : `fetch`, comme avant.
 *
 * Dans l'APK : le WebView sert l'app depuis `https://localhost`. Ce n'est pas
 * une adresse joignable depuis Internet, et une requête `fetch` y est soumise
 * au CORS — un refus du serveur se présente alors comme une panne réseau
 * (« Réseau injoignable ») alors que le même appel fonctionne dans Chrome.
 * On passe donc par le client HTTP **natif** de Capacitor (`CapacitorHttp`),
 * qui exécute la requête côté Android : plus de CORS du tout, POST compris, et
 * le HTTPS reste vérifié par le système.
 *
 * Pourquoi un appel explicite plutôt que le patch automatique de `fetch` ?
 * Parce que l'interception Android des requêtes du WebView ne voit pas le
 * corps des POST (limite de `shouldInterceptRequest`) ; l'appel direct au
 * plugin, lui, n'a pas cette limite.
 *
 * Le module est importé dynamiquement : rien n'est chargé au pré-rendu, et un
 * navigateur sans Capacitor retombe simplement sur `fetch`.
 */

/** Requête minimale : mêmes champs que ceux utilisés par `src/lib/cloud/api/`. */
export type CloudRequestInit = {
  method: string;
  headers: Record<string, string>;
  body?: string;
};

/** Réponse minimale : ce que `api.ts` lit ensuite (statut, corps texte). */
export type CloudResponseLike = {
  status: number;
  ok: boolean;
  text(): Promise<string>;
  json(): Promise<unknown>;
};

export type CloudFetch = (url: string, init: CloudRequestInit) => Promise<CloudResponseLike>;

type CapacitorModule = typeof import("@capacitor/core");

let capacitorModule: CapacitorModule | null | undefined;

/** Charge `@capacitor/core` une seule fois (et jamais au pré-rendu). */
async function loadCapacitor(): Promise<CapacitorModule | null> {
  if (capacitorModule !== undefined) return capacitorModule;
  try {
    capacitorModule = await import("@capacitor/core");
  } catch {
    capacitorModule = null;
  }
  return capacitorModule;
}

/**
 * Le jeu tourne-t-il dans l'application Android ? Sert à choisir l'adresse de
 * retour d'une connexion (schéma de l'app) plutôt que la page du site.
 */
export async function isNativeApp(): Promise<boolean> {
  const mod = await loadCapacitor();
  try {
    return mod?.Capacitor.isNativePlatform() === true;
  } catch {
    return false;
  }
}

function webFetch(url: string, init: CloudRequestInit): Promise<CloudResponseLike> {
  return fetch(url, { method: init.method, headers: init.headers, body: init.body });
}

/**
 * Corps envoyé au plugin natif : les appels du cloud sont toujours du JSON.
 * Un corps non analysable est transmis tel quel (le serveur tranchera).
 */
function bodyFor(data: string | undefined): unknown {
  if (data === undefined) return undefined;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

async function nativeFetch(
  mod: CapacitorModule,
  url: string,
  init: CloudRequestInit,
): Promise<CloudResponseLike> {
  const response = await mod.CapacitorHttp.request({
    url,
    method: init.method,
    headers: init.headers,
    data: bodyFor(init.body),
    connectTimeout: 15_000,
    readTimeout: 20_000,
  });
  // `data` est déjà analysé quand le serveur répond du JSON ; sinon c'est du texte.
  const payload = typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? "");
  return {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    text: async () => payload,
    // Un corps non JSON ne doit pas faire échouer l'appelant (repli `null`).
    json: async () => {
      try {
        return JSON.parse(payload);
      } catch {
        return null;
      }
    },
  };
}

/**
 * Requête cloud du client : natif quand on tourne dans l'APK, `fetch` partout
 * ailleurs. Si l'appel natif échoue pour une raison d'outillage (pont absent),
 * on retente en `fetch` plutôt que d'échouer ; si les deux échouent, l'erreur
 * native est renvoyée car c'est la plus informative sur un appareil.
 */
export const cloudRequest: CloudFetch = async (url, init) => {
  const mod = await loadCapacitor();
  if (!mod?.Capacitor.isNativePlatform()) return webFetch(url, init);
  try {
    return await nativeFetch(mod, url, init);
  } catch (nativeError) {
    try {
      return await webFetch(url, init);
    } catch {
      throw nativeError;
    }
  }
};
