import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLOUD_DISABLED_HINT, cloudProjectName, readCloudConfig } from "@/lib/cloud/config";

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${"x".repeat(40)}.${"y".repeat(30)}`;

describe("configuration du cloud", () => {
  it("reste désactivée sans variables d'environnement", () => {
    expect(readCloudConfig({})).toBeNull();
    expect(readCloudConfig({ [URL_VAR]: "https://abcd.supabase.co" })).toBeNull();
    expect(readCloudConfig({ [KEY_VAR]: KEY })).toBeNull();
    expect(CLOUD_DISABLED_HINT).toMatch(/jouable hors ligne/);
  });

  it("accepte un projet Supabase complet", () => {
    const config = readCloudConfig({ [URL_VAR]: "https://abcd.supabase.co", [KEY_VAR]: KEY });
    expect(config).toEqual({ url: "https://abcd.supabase.co", anonKey: KEY });
    expect(cloudProjectName(config!)).toBe("abcd");
  });

  it("accepte une URL d'endpoint recopiée depuis l'écran API", () => {
    // `https://xxx.supabase.co/rest/v1/` (et variantes) doit revenir à l'URL
    // du projet : sinon l'app restait hors ligne sans explication.
    for (const pasted of [
      "https://yzxchpybqrfegvecihxf.supabase.co/rest/v1/",
      "https://yzxchpybqrfegvecihxf.supabase.co/rest/v1",
      "https://yzxchpybqrfegvecihxf.supabase.co/auth/v1/",
      "https://yzxchpybqrfegvecihxf.supabase.co/storage/v1",
    ]) {
      const config = readCloudConfig({ [URL_VAR]: pasted, [KEY_VAR]: KEY });
      expect(config?.url).toBe("https://yzxchpybqrfegvecihxf.supabase.co");
      // Une clé « publishable » (nouveau format Supabase) est acceptée.
      expect(config?.anonKey).toBe(KEY);
    }
    expect(
      readCloudConfig({ [URL_VAR]: "https://abcd.supabase.co/rest/v1/", [KEY_VAR]: "sb_publishable_cbbKecrvKbPcifWUsolQ4w_bmmslot1" }),
    ).toEqual({ url: "https://abcd.supabase.co", anonKey: "sb_publishable_cbbKecrvKbPcifWUsolQ4w_bmmslot1" });
  });

  it("tolère une barre oblique finale et les espaces", () => {
    const config = readCloudConfig({
      [URL_VAR]: "  https://mon-projet.supabase.co/  ",
      [KEY_VAR]: `  ${KEY}  `,
    });
    expect(config?.url).toBe("https://mon-projet.supabase.co");
    expect(config?.anonKey).toBe(KEY);
  });

  /**
   * Les workflows du dépôt, tous ensemble.
   *
   * Volontairement **sans nom de fichier en dur** : le 7 octobre, un contrôle
   * qui visait `.github/workflows/android-apk.yml` a fait rougir la CI pour un
   * simple renommage — le garde-fou gênait plus qu'il n'aidait. On lit donc ce
   * qui existe, et on juge le contenu.
   */
  const workflows = readdirSync(path.join(process.cwd(), ".github", "workflows"))
    .filter((nom) => nom.endsWith(".yml") || nom.endsWith(".yaml"))
    .map((nom) => readFileSync(path.join(process.cwd(), ".github", "workflows", nom), "utf8"));
  const joint = workflows.join("\n");

  it("un seul workflow construit l'APK, et il reçoit la configuration du cloud", () => {
    // Le 7 octobre, une réécriture du workflow a laissé tomber les deux
    // variables : l'APK se construisait **sans cloud** — même écran, mêmes
    // boutons, mais aucun compte, aucun ami, aucun classement. La panne la plus
    // coûteuse est celle qui ne se voit pas, donc elle a son garde-fou.
    //
    // Deux fichiers qui construisent l'APK = deux builds et deux mails par
    // poussée : on veut exactement un constructeur.
    // `assembleDebug` est le nom Gradle ; le dépôt passe par son script
    // (`npm run android:debug`), donc les deux formes comptent.
    const constructeurs = workflows.filter(
      (texte) => texte.includes("assembleDebug") || texte.includes("android:debug"),
    );
    expect(constructeurs).toHaveLength(1);
    const workflow = constructeurs[0];
    for (const variable of [URL_VAR, KEY_VAR]) {
      // Concaténation : `${{` dans un gabarit (`\`…\``) ouvrirait une
      // interpolation, et le contrôle ne compilerait même pas.
      const attendu = variable + ": ${{ vars." + variable + " || secrets." + variable + " }}";
      expect(workflow).toContain(attendu);
    }
    // Et le diagnostic qui dit, dans le journal du run, si le cloud est dedans.
    expect(workflow).toContain("Cloud absent du bundle");
    // Le contrôle ne doit **jamais** pouvoir faire échouer le build : c'est un
    // avertissement. Un `sed` mal échappé a déjà cassé un run entier.
    expect(workflow).not.toContain("\vert{}");
  });

  it("quand l'APK part aux testeurs, il part avec ses destinataires et ses notes", () => {
    // Firebase App Distribution : sans `--groups` ni `--testers`, l'outil
    // prévient « no testers or groups specified, skipping » et **n'envoie
    // rien** — la poussée semble réussie, personne ne reçoit de mail.
    if (!joint.includes("appdistribution:distribute")) return;
    expect(joint).toContain("--groups");
    expect(joint).toContain("--release-notes-file");
    // Le lien public stable, utilisable depuis un téléphone sans connexion.
    expect(joint).toContain("gh release upload debug-apk");
  });

  it("refuse une adresse ou une clé recopiées de travers", () => {
    // Adresse de la documentation, projet local, clé tronquée : mieux vaut
    // « non configuré » qu'un écran de compte qui échoue à chaque appel.
    expect(readCloudConfig({ [URL_VAR]: "https://ton-projet.supabase.co", [KEY_VAR]: KEY })).not.toBeNull();
    expect(readCloudConfig({ [URL_VAR]: "http://localhost:54321", [KEY_VAR]: KEY })).toBeNull();
    expect(readCloudConfig({ [URL_VAR]: "https://abcd.supabase.co", [KEY_VAR]: "trop-court" })).toBeNull();
    expect(readCloudConfig({ [URL_VAR]: "pas une url", [KEY_VAR]: KEY })).toBeNull();
  });
});
