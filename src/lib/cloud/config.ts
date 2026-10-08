/**
 * Configuration du cloud (Supabase), lue **au build** depuis l'environnement.
 *
 * Deux variables seulement, toutes deux publiques par construction :
 *   * `NEXT_PUBLIC_SUPABASE_URL` — l'adresse du projet ;
 *   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` — la clé anonyme.
 *
 * La clé anonyme est faite pour être embarquée dans un client : ce sont les
 * politiques RLS (`supabase/migrations/0001_comptes_cloud.sql`) qui protègent
 * les données. La clé `service_role` ne doit **jamais** apparaître ici — elle
 * contourne toutes les règles.
 *
 * Si les deux variables sont absentes, l'application reste exactement ce
 * qu'elle est aujourd'hui : 100 % hors ligne, sans compte. C'est le mode par
 * défaut tant que le projet Supabase n'existe pas.
 */

export type CloudConfig = {
  /** Racine de l'API, sans barre oblique finale. */
  url: string;
  /** Clé anonyme (`anon`). */
  anonKey: string;
};

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

/**
 * Chemin d'API que l'on retire si l'URL d'un endpoint a été recopiée.
 *
 * Erreur classique (et invisible) : coller « …/rest/v1/ » depuis l'écran API
 * de Supabase au lieu de l'URL du projet. Sans ce nettoyage, la configuration
 * était jugée invalide et l'app restait hors ligne sans autre explication.
 */
const API_PATH = /\/(?:rest|auth|storage|realtime)\/v1\/?$/i;

/**
 * Lit la configuration depuis un environnement donné. Renvoie `null` si elle
 * est incomplète ou manifestement invalide : une adresse d'exemple recopiée
 * depuis la documentation vaut mieux traitée comme « non configuré » qu'un
 * écran de compte qui échoue à chaque appel.
 */
export function readCloudConfig(env: Record<string, string | undefined> = process.env): CloudConfig | null {
  const url = env[URL_VAR]
    ?.trim()
    .replace(/\/+$/, "")
    .replace(API_PATH, "")
    .replace(/\/+$/, "");
  const anonKey = env[KEY_VAR]?.trim();
  if (!url || !anonKey) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) return null;
  if (anonKey.length < 32) return null;
  return { url, anonKey };
}

/** Adresse masquée pour l'affichage (« https://abcd.supabase.co » → « abcd »). */
export function cloudProjectName(config: CloudConfig): string {
  return config.url.replace(/^https:\/\//, "").split(".")[0] ?? "supabase";
}

/**
 * Environnement réel du build.
 *
 * ⚠️ Les deux accès doivent rester **littéraux** : Next ne remplace
 * `process.env.NEXT_PUBLIC_*` que lorsqu'il voit la variable écrite en toutes
 * lettres dans le code. Un accès dynamique (`env[URL_VAR]`) ne serait pas
 * remplacé, et le navigateur ne verrait jamais la configuration — le cloud
 * resterait muet alors que les variables sont bien définies.
 */
const BUILD_ENV: Record<string, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

/** Configuration effective du build courant (voir `readCloudConfig`). */
export function cloudConfig(): CloudConfig | null {
  return readCloudConfig(BUILD_ENV);
}

/** Message unique affiché partout quand le cloud n'est pas configuré. */
/**
 * Ce qu'on lit dans l'écran Compte quand ce build ne parle à rien : une phrase
 * de jeu, pas une consigne de compilation. Le joueur ne voit ni variable
 * d'environnement, ni nom de service — juste ce qu'il peut faire.
 */
export const CLOUD_DISABLED_HINT =
  "Ta progression est gardée sur cet appareil, à chaque action : le jeu reste jouable hors ligne. " +
  "Connecte un compte pour la retrouver sur un autre téléphone et figurer au classement.";
