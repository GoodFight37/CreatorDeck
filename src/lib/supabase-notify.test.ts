/**
 * Garde-fous sur les notifications : `0023_notifications.sql`, l'Edge Function
 * `notify-live` et son branchement dans `refresh-live`.
 *
 * Le SQL ne s'exécute pas dans Vitest — l'exécution réelle (jetons, journal,
 * `push_targets()`) est dans `scripts/verify-supabase-migrations.mjs`. Ce qui se
 * vérifie ici, c'est le **contrat** : les règles écrites en toutes lettres, les
 * portes fermées, et les réglages Android sans lesquels rien ne sonnerait.
 *
 * Enjeu : ces règles sont invisibles à l'usage. Une notification de trop ne
 * casse rien, elle fait juste désinstaller le jeu — et un `revoke` oublié
 * laisserait n'importe quel compte lire les jetons de tout le monde.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8");

const SQL = read("supabase", "migrations", "0023_notifications.sql");
// Les contrôles de motifs portent sur le code seul : les commentaires qui
// expliquent une règle citent forcément la règle.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
const FUNCTION = read("supabase", "functions", "notify-live", "index.ts");
// Le code sans ses commentaires : une explication qui cite « -----BEGIN » n'est
// pas une clé privée.
const FUNCTION_CODE = FUNCTION.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const REFRESH = read("supabase", "functions", "refresh-live", "index.ts");
const ANDROID_GRADLE = read("android", "app", "build.gradle");
const MANIFEST = read("android", "app", "src", "main", "AndroidManifest.xml");
const VERIFIER = read("scripts", "verify-supabase-migrations.mjs");
const PACKAGE = JSON.parse(read("package.json")) as {
  dependencies: Record<string, string>;
};

describe("0023_notifications.sql (les notifications de direct)", () => {
  it("ferme les jetons : ni lecture ni écriture côté client", () => {
    expect(CODE).toContain("revoke all on table public.push_tokens from public, anon, authenticated");
    expect(CODE).toContain("revoke all on table public.push_log from public, anon, authenticated");
    // RLS active : une table fermée par erreur de `grant` resterait lisible.
    expect(CODE).toContain("alter table public.push_tokens enable row level security");
    expect(CODE).toContain("alter table public.push_log enable row level security");
  });

  it("réserve `push_targets()` au rôle de service", () => {
    // Elle lit les jetons de tout le monde : un joueur connecté n'a rien à y faire.
    expect(CODE).toContain("revoke all on function public.push_targets() from public, anon, authenticated");
    expect(CODE).toMatch(/grant execute on function public\.push_targets\(\) to service_role/);
  });

  it("garde les trois portes du joueur ouvertes aux seuls comptes connectés", () => {
    for (const name of ["register_push_token", "forget_push_token", "set_push_live"]) {
      expect(CODE).toMatch(new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to authenticated`));
      expect(CODE).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon`));
    }
  });

  it("reprend les fenêtres écrites dans le carnet", () => {
    // Direct « frais » : un live commencé il y a une heure n'est plus une nouvelle.
    expect(CODE).toContain("interval '30 minutes'");
    // On ne relance pas le même créateur avant six heures.
    expect(CODE).toContain("interval '6 hours'");
    // Et pas plus d'une notification par heure et par joueur.
    expect(CODE).toContain("interval '1 hour'");
  });

  it("ne réveille que les intéressés, et une seule fois par créateur", () => {
    // L'épinglé d'abord, puis les cartes possédées : c'est la définition de
    // « collection » côté joueur, et elle est écrite ici, pas ailleurs.
    expect(CODE).toContain("left join public.wishlist w on w.user_id = t.user_id and w.slug = c.slug");
    expect(CODE).toContain("from public.user_cards uc");
    expect(CODE).toContain("distinct on (e.token)");
    // Le marquage se fait dans la même requête que la sélection : deux appels
    // simultanés ne peuvent pas envoyer deux fois.
    expect(CODE).toContain("insert into public.push_log");
    expect(CODE).toContain("on conflict (user_id, login) do update set sent_at = excluded.sent_at");
  });
});

describe("notify-live (la fonction qui envoie)", () => {
  it("n'accepte que le rôle de service", () => {
    expect(FUNCTION).toContain("bearer !== SERVICE_ROLE");
    expect(FUNCTION).toContain('json({ error: "Réservé au rôle de service." }, 401)');
  });

  it("ne confirme rien en dur : le compte de service vient d'un secret", () => {
    expect(FUNCTION).toContain('Deno.env.get("FCM_SERVICE_ACCOUNT")');
    // Aucune clé privée ni identifiant de projet écrit dans le fichier.
    // Aucun bloc base64 (le corps d'une clé privée en ferait un de ~1 600
    // caractères) et aucun compte de service écrit en clair.
    expect(FUNCTION_CODE.match(/[A-Za-z0-9+/]{120,}/g) ?? []).toEqual([]);
    expect(FUNCTION_CODE).not.toMatch(/[0-9]{12}@[a-z-]+\.iam\.gserviceaccount\.com/);
    expect(FUNCTION_CODE).not.toContain('"service_account"');
  });

  it("jette les jetons morts au lieu de les retenter à chaque passage", () => {
    expect(FUNCTION).toMatch(/UNREGISTERED/);
    expect(FUNCTION).toContain("{ method: \"DELETE\" }");
  });

  it("a un diagnostic qui ne consomme rien et un envoi de test", () => {
    expect(FUNCTION).toContain('params.get("check") === "1"');
    expect(FUNCTION).toContain('params.get("test") === "1"');
    // Le diagnostic ne doit **pas** appeler `push_targets()` : elle marque le
    // journal, donc un diagnostic consommerait la notification du joueur.
    const checkBlock = FUNCTION.slice(
      FUNCTION.indexOf('params.get("check")'),
      FUNCTION.indexOf('params.get("test")'),
    );
    expect(checkBlock).not.toContain("push_targets");
  });

  it("dit pourquoi la notification arrive (le texte du brief)", () => {
    expect(FUNCTION).toContain("Ton épinglé est en direct");
    expect(FUNCTION).toMatch(/vient de lancer son live/);
    expect(FUNCTION).toContain("spectateurs");
  });
});

describe("branchement du direct", () => {
  it("`refresh-live` déclenche les notifications sans en dépendre", () => {
    expect(REFRESH).toContain("async function notifyLive()");
    expect(REFRESH).toMatch(/await notifyLive\(\)/);
    // Une porte de test manuelle, sans rappeler Twitch.
    expect(REFRESH).toContain('params.get("push") === "1"');
  });

  it("le vérificateur SQL éprouve `0023`", () => {
    expect(VERIFIER).toContain("0023_notifications.sql");
    expect(VERIFIER).toContain("push_targets()");
  });
});

describe("Android (sans quoi rien ne sonnerait)", () => {
  it("le greffon des notifications est déclaré", () => {
    expect(PACKAGE.dependencies["@capacitor/push-notifications"]).toBeTruthy();
  });

  it("la compilation reste possible sans projet Firebase", () => {
    // `google-services.json` n'est pas dans le dépôt : appliquer le greffon
    // Google en aveugle ferait échouer l'APK pour tout le monde.
    expect(ANDROID_GRADLE).toMatch(/if \(file\("google-services\.json"\)\.exists\(\)\)/);
    expect(ANDROID_GRADLE).toContain("apply plugin: 'com.google.gms.google-services'");
  });

  it("le manifeste demande la permission et nomme le canal", () => {
    expect(MANIFEST).toContain('android:name="android.permission.POST_NOTIFICATIONS"');
    expect(MANIFEST).toContain("com.google.firebase.messaging.default_notification_channel_id");
    expect(MANIFEST).toContain('android:value="creatordeck-live"');
  });
});
