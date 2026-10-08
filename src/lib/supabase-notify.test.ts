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
/**
 * Le code sans ses commentaires : une explication qui cite une règle n'est pas
 * la règle. Attention au `//` des URL : on ne coupe jamais à l'intérieur d'une
 * chaîne, sinon on tronque le code et le contrôle devient menteur.
 */
function stripComments(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const at = line.indexOf("//");
      if (at < 0) return line;
      const before = line.slice(0, at);
      const quotes = (before.match(/"/g) ?? []).length;
      return quotes % 2 === 0 ? before : line;
    })
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

const FUNCTION_CODE = stripComments(FUNCTION);
const PUSH = stripComments(read("src", "lib", "push.ts"));
const REFRESH = read("supabase", "functions", "refresh-live", "index.ts");
const ANDROID_GRADLE = read("android", "app", "build.gradle");
const MANIFEST = read("android", "app", "src", "main", "AndroidManifest.xml");
const VERIFIER = read("scripts", "verify-supabase-migrations.mjs");
const ETAT_SQL = read("supabase", "migrations", "0024_push_state.sql");
// Le SQL sans ses commentaires : une explication qui cite une règle n'est pas
// la règle (même piège que plus haut, avec `--`).
const ETAT_CODE = ETAT_SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
const MAGASIN = stripComments(read("src", "lib", "cloud", "store", "account.ts"));
const CARNET = read("src", "components", "notifications-sheet.tsx");
const GARDES_SQL = read("supabase", "migrations", "0037_gardes.sql");
// Le SQL sans ses commentaires : une explication qui cite une règle n'est pas la
// règle (même piège que plus haut, avec `--`).
const GARDES = GARDES_SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
/**
 * Le corps d'une fonction du fichier, de son en-tête au `$$;` qui la referme.
 * Le fichier porte trois fonctions qui n'ont pas le droit de se mélanger : la
 * garde de série ne doit **pas** écrire, `push_targets()` si.
 */
function corpsDe(source: string, entete: string): string {
  const debut = source.indexOf(entete);
  expect(debut).toBeGreaterThanOrEqual(0);
  const fin = source.indexOf("$$;", debut);
  expect(fin).toBeGreaterThan(debut);
  return source.slice(debut, fin);
}
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
  it("n'accepte que le rôle de service — les deux nomenclatures de clé", () => {
    // `SUPABASE_SERVICE_ROLE_KEY` (JWT legacy) **et** `SUPABASE_SECRET_KEYS`
    // (`sb_secret_…`) : un projet récent ne donne que la seconde, et refuser
    // la mauvaise clé avec un message muet coûte une soirée.
    expect(FUNCTION).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(FUNCTION).toContain('"SUPABASE_SECRET_KEYS"');
    expect(FUNCTION).toContain("SERVER_KEYS.some((key) => key.value === bearer)");
    expect(FUNCTION).toMatch(/Réservé au rôle de service\./);
    expect(FUNCTION).toContain("}, 401)");
  });

  it("dit quelle clé utiliser, sans jamais publier la clé", () => {
    // Le diagnostic nomme la **source** et un aperçu (`sb_secret_…`), jamais la
    // valeur : un journal de bord ne doit pas devenir un coffre ouvert.
    expect(FUNCTION).toContain("jeton_serveur");
    expect(FUNCTION).toMatch(/SERVER_KEYS\.map\(\(key\) => keyPrefix\(key\.value\)\)/);
    expect(FUNCTION).toContain("function keyPrefix(");
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

  it("fait sonner : le canal, le manifeste et la fonction disent le même id", () => {
    // Une notification muette : le canal Capacitor était né avec
    // `sound: "default"` sans que le fichier `res/raw/default` existe.
    // Un canal Android ne se répare pas après coup — il change d'identifiant,
    // et **les trois endroits** doivent suivre, sinon la notification part
    // sans canal (Android la range alors dans « Divers ») ou vers l'ancien.
    expect(PUSH).toContain('export const LIVE_CHANNEL_ID = "creatordeck-live-v2"');
    expect(MANIFEST).toContain('android:value="creatordeck-live-v2"');
    expect(FUNCTION_CODE).toContain('channel_id: "creatordeck-live-v2"');
    expect(FUNCTION_CODE).toContain('sound: "default"');
    // Le canal, lui, nomme le fichier son du dépôt — dont le nom doit rester un
    // identifiant Java valide (« default » est un mot réservé : Android refuse
    // la ressource et la compilation s'arrête).
    expect(PUSH).toMatch(/sound: "creatordeck"/);
  });

  it("le son du jeu existe vraiment, avec un nom de ressource accepté", () => {
    // `sound: "default"` n'est pas un mot magique pour le greffon Capacitor :
    // il fabrique `android.resource://<paquet>/raw/<la chaîne reçue>`. Deux
    // conditions, donc : que le fichier existe, et que son nom soit **un nom de
    // ressource valide**. « default » n'en est pas un (mot réservé Java :
    // Android refuse la ressource et la compilation de l'APK s'arrête), d'où
    // `creatordeck.wav`.
    const son = readFileSync(
      path.join(ROOT, "android", "app", "src", "main", "res", "raw", "creatordeck.wav"),
    );
    expect(son.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(son.subarray(8, 12).toString("ascii")).toBe("WAVE");
    const octets = son.readUInt32LE(40); // taille du bloc « data »
    expect(octets).toBeGreaterThan(8_000); // au moins ~0,2 s à 22 050 Hz
    expect(octets).toBeLessThan(200_000);
  });

  it("dit pourquoi la notification arrive (le texte du brief)", () => {
    expect(FUNCTION).toContain("Ton épinglé est en direct");
    expect(FUNCTION).toMatch(/vient de lancer son live/);
    expect(FUNCTION).toContain("spectateurs");
  });
});

describe("0037_gardes.sql (les deux alertes de perte)", () => {
  const SERIE = corpsDe(GARDES, "create or replace function public._push_serie_due(");
  const RESERVE = corpsDe(GARDES, "create or replace function public._push_reserve_due(");
  const CIBLES = corpsDe(GARDES, "create or replace function public.push_targets(");

  it("n'ajoute pas de système : les deux alertes sont deux conditions de plus", () => {
    // Le brief est explicite : « pas un nouveau système, juste deux conditions
    // de plus ». Aucune table, aucune colonne — et `push_targets()` est
    // remplacée, pas dupliquée (une seule porte d'envoi).
    expect(GARDES).not.toMatch(/create table/i);
    expect(GARDES).not.toMatch(/alter table/i);
    expect(GARDES).toContain("create or replace function public.push_targets()");
  });

  it("les deux gardes lisent, elles n'écrivent pas", () => {
    // L'écriture vit dans `push_targets()`, au moment où l'alerte est choisie.
    // Une garde qui écrirait modifierait l'état du joueur en le consultant.
    expect(SERIE).not.toMatch(/\b(insert|update|delete)\b/i);
    expect(RESERVE).not.toMatch(/\b(insert|update|delete)\b/i);
  });

  it("la garde de série ne compte que les tirages, avec la journée de jeu du serveur", () => {
    expect(SERIE).toContain("d.kind = 'live'");
    expect(SERIE).toContain("public._pack_game_day");
  });

  it("elle se tait si la série est faite, cassée, ou déjà annoncée ce soir", () => {
    expect(SERIE).toMatch(/v_days\[1\] = v_today[\s\S]*?return null/);
    expect(SERIE).toMatch(/v_days\[1\] < v_today - 1[\s\S]*?return null/);
    expect(SERIE).toContain("public._push_last_sent(p_user, 'série')");
    expect(SERIE).toContain("p_ignore_seconds integer default 7200");
  });

  it("elle annonce le jour du cycle, celui du jeu (le 8ᵉ jour redevient J1)", () => {
    expect(SERIE).toContain("((v_streak - 1) % 7) + 1");
  });

  it("la garde de réserve suit l'horloge du jeu, recul d'horloge compris", () => {
    expect(RESERVE).toMatch(/v_packs is null or v_packs < 4[\s\S]*?return null/);
    expect(RESERVE).toContain("1800000"); // la période de `_pack_refresh` (`0004`)
    expect(RESERVE).toContain("least(v_last, p_now)");
    expect(RESERVE).toContain("public._push_last_sent(p_user, 'réserves')");
    expect(RESERVE).toContain("return v_packs");
  });

  it("les alertes passent après les directs, et jamais sur le même appareil au même passage", () => {
    expect(CIBLES).toContain("not exists (select 1 from choisis c where c.token = g.token)");
    expect(CIBLES).toContain("order by 1, 2, 6");
  });

  it("elles échappent au plafond d'une heure, qui ne parle que des directs", () => {
    // Sans cette exception, une alerte chasse l'autre : deux alertes qui se
    // repoussent l'une l'autre sont deux alertes qui n'arrivent jamais.
    expect(CIBLES).toContain("l.login not in ('série', 'réserves')");
    expect(CIBLES).toContain("interval '1 hour'");
    expect(CIBLES).toContain("interval '6 hours'");
  });

  it("une ligne de journal par joueur et par clé, sinon Postgres refuse l'insertion", () => {
    // Deux appareils visent la même clé `(user_id, login)` : sans ce
    // dédoublonnage, `on conflict` échoue sur sa propre insertion.
    expect(CIBLES).toContain("distinct on (c.user_id, c.login)");
    expect(CIBLES).toContain("on conflict (user_id, login) do update set sent_at = excluded.sent_at");
    expect(CIBLES).toContain("#variable_conflict use_column");
  });

  it("reste hors de portée d'un joueur, même connecté, et rejouable", () => {
    expect(GARDES).toContain(
      "revoke all on function public._push_serie_due(uuid, timestamptz, integer) from public, anon, authenticated",
    );
    expect(GARDES).toContain(
      "revoke all on function public._push_reserve_due(uuid, timestamptz, integer) from public, anon, authenticated",
    );
    expect(GARDES).toContain("revoke all on function public.push_targets() from public, anon, authenticated");
    expect(GARDES).toMatch(/pg_roles where rolname = 'service_role'/);
  });

  it("se déclare dans `schema_versions()`, sinon le joueur ignore si elle est collée", () => {
    expect(GARDES).toContain(
      "'0037', to_regprocedure('public._push_serie_due(uuid, timestamptz, integer)') is not null",
    );
  });

  it("est jouée pour de vrai par le vérificateur, pas seulement décrite ici", () => {
    expect(VERIFIER).toContain("0037_gardes.sql");
    expect(VERIFIER).toContain("alertes : la série vivante et pas faite aujourd'hui donne son jour du cycle");
    expect(VERIFIER).toContain("alertes : la ligne de l'alerte ne consomme pas le tour du direct");
    expect(VERIFIER).toContain("alertes : l'interrupteur coupé les fait taire aussi");
  });
});

describe("notify-live (les deux phrases de perte)", () => {
  it("dit ce qui va être perdu et comment l'éviter, sans rien promettre", () => {
    expect(FUNCTION).toContain("Ta série s'arrête ce soir");
    expect(FUNCTION).toMatch(/sur 7 — ouvre un booster avant 6 h/);
    expect(FUNCTION).toContain("Réserve pleine : un booster se perd");
    expect(FUNCTION).toMatch(/Tes \$\{packs\} boosters attendent/);
  });

  it("les range sous une famille à part, sans toucher aux directs", () => {
    expect(FUNCTION).toContain('target.reason === "serie"');
    expect(FUNCTION).toContain('target.reason === "reserve"');
    expect(FUNCTION).toMatch(/reason === "serie" \|\| target\.reason === "reserve" \? "perte" : "direct"/);
  });
});

describe("0024_push_state.sql (l'interrupteur dit la vérité)", () => {
  it("ne fait que lire : aucune écriture, aucun droit sur les tables", () => {
    // La fonction existe pour **relire** l'état ; si elle écrivait, le
    // lancement de l'application modifierait des données — ce qu'aucun écran
    // d'affichage ne doit faire.
    expect(ETAT_CODE).not.toMatch(/\b(insert|update|delete)\b/i);
    expect(ETAT_CODE).toContain("create or replace function public.push_state()");
    expect(ETAT_CODE).toContain("security definer");
  });

  it("reste fermée au visiteur et ouverte au compte connecté", () => {
    expect(ETAT_CODE).toContain("revoke all on function public.push_state() from public, anon");
    expect(ETAT_CODE).toMatch(/grant execute on function public\.push_state\(\) to authenticated/);
  });

  it("répond « rien à prévenir » plutôt que de lever, sans identité", () => {
    // Un visiteur n'a pas d'erreur à voir : il n'a simplement aucune
    // notification à recevoir.
    expect(ETAT_CODE).toMatch(/if v_user is null then[\s\S]*?'live', false/);
  });
});

describe("l'interrupteur des notifications ne ment plus", () => {
  it("est relu au lancement, depuis le serveur", () => {
    // L'état vivait en mémoire seulement, donc chaque ouverture affichait
    // « éteint » alors que le serveur notifiait toujours.
    expect(MAGASIN).toContain("async syncPushState()");
    expect(MAGASIN).toContain("api.pushState()");
    expect(CARNET).toContain("cloudStore.syncPushState()");
    // Le lancement aussi : c'est exactement le cas du défaut — l'appareil était
    // déjà inscrit, donc rien n'était réinscrit, donc rien n'était relu.
    expect(read("src", "hooks", "use-push.ts")).toContain("cloudStore.syncPushState()");
  });

  it("n'invente pas l'état quand la lecture échoue (hors ligne)", () => {
    // `syncPushState` laisse `pushLive` inconnu : afficher « éteint » serait
    // exactement le mensonge qu'on répare.
    const corps = MAGASIN.slice(MAGASIN.indexOf("async syncPushState()"));
    expect(corps.slice(0, 700)).not.toContain("pushLive: false");
  });

  it("ne parle au serveur que si l'interrupteur change vraiment", () => {
    // L'état est relu avant, sinon l'interrupteur pourrait être allumé côté
    // écran et éteint côté serveur : le clic parlerait dans le vide.
    const corps = MAGASIN.slice(MAGASIN.indexOf("async setPushLive(enabled"));
    expect(corps.slice(0, 900).indexOf("syncPushState()")).toBeLessThan(
      corps.indexOf("setPushLive(enabled)"),
    );
  });

  it("ne demande pas la permission à l'ouverture de l'application", () => {
    // Une demande de permission qui surgit au lancement se fait refuser — et
    // un refus est définitif : Android ne la repose plus jamais. C'est
    // l'interrupteur du carnet qui demande.
    expect(PUSH).toMatch(/export async function requestPushToken\(silent = false\)/);
    expect(PUSH).toMatch(/if \(aDemander && silent\)/);
    const corps = PUSH.slice(PUSH.indexOf("const aDemander"));
    expect(corps.indexOf("aDemander && silent")).toBeLessThan(
      corps.indexOf("requestPermissions()"),
    );
    expect(MAGASIN).toContain("requestPushToken(quiet)");
  });
});

describe("branchement du direct", () => {
  it("`refresh-live` déclenche les notifications sans en dépendre", () => {
    expect(REFRESH).toContain("async function notifyLive()");
    expect(REFRESH).toMatch(/await notifyLive\(\)/);
    // Une porte de test manuelle, sans rappeler Twitch.
    expect(REFRESH).toContain('params.get("push") === "1"');
  });

  it("le vérificateur SQL éprouve `0023` et `0024`", () => {
    expect(VERIFIER).toContain("0023_notifications.sql");
    expect(VERIFIER).toContain("push_targets()");
    expect(VERIFIER).toContain("0024_push_state.sql");
    expect(VERIFIER).toContain("push_state()");
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

  it("le fichier Firebase vise bien l'application (sinon rien n'arrive)", () => {
    // `google-services.json` est **versionné** : il n'y a pas de secret dedans
    // (identifiant de projet + clé d'API restreinte au paquet, présente dans
    // chaque APK), et sans lui la CI ne peut pas construire un APK qui reçoit
    // des notifications. Le contrôle porte sur ce qui casse en silence : un
    // fichier qui vise un autre paquet enregistre l'appareil… chez personne.
    const firebase = JSON.parse(read("android", "app", "google-services.json")) as {
      project_info: { project_id?: string; project_number?: string };
      client: {
        client_info: { mobilesdk_app_id?: string; android_client_info: { package_name?: string } };
        api_key: { current_key?: string }[];
      }[];
    };
    const app = firebase.client[0];
    expect(app.client_info.android_client_info.package_name).toBe("com.creatordeck.app");
    expect(firebase.project_info.project_id).toBeTruthy();
    expect(firebase.project_info.project_number).toBeTruthy();
    expect(app.client_info.mobilesdk_app_id).toMatch(/^1:\d+:android:/);
    expect(app.api_key[0].current_key).toBeTruthy();
    // Le paquet du fichier et celui du build Android doivent être le même.
    expect(ANDROID_GRADLE).toContain('applicationId "com.creatordeck.app"');
  });

  it("le manifeste demande la permission et nomme le canal", () => {
    expect(MANIFEST).toContain('android:name="android.permission.POST_NOTIFICATIONS"');
    expect(MANIFEST).toContain("com.google.firebase.messaging.default_notification_channel_id");
    expect(MANIFEST).toContain('android:value="creatordeck-live-v2"');
  });
});
