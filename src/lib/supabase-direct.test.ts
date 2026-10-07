/**
 * Garde-fous sur `supabase/migrations/0011_direct.sql` — le bonus Direct côté
 * serveur.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest : ce qui est vérifiable ici, c'est
 * le **contrat** avec `src/data/pull-rates.json` et les règles de sécurité.
 * L'exécution réelle (Postgres jetable, boosters ouverts pendant un direct) est
 * dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : le moteur local et le serveur doivent rester **le même jeu**. Si
 * quelqu'un change `creatorBias` ou `livePermille` dans le fichier de taux sans
 * toucher au SQL, le serveur garderait l'ancien bonus — et le joueur verrait
 * deux jeux différents selon qu'il a un compte ou non.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LIVE_REFRESH_MS, LIVE_TTL_MS } from "@/lib/live";
import { DIRECT_BONUS, PULL_RATES } from "@/lib/pull-rates";

const ROOT = process.cwd();
const SQL = readFileSync(path.join(ROOT, "supabase", "migrations", "0011_direct.sql"), "utf8");
// Les contrôles de motifs portent sur le code seul : les commentaires qui
// expliquent une règle citent forcément la règle.
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

/**
 * La veille automatique (`0025_direct_auto.sql`).
 *
 * Avant elle, le direct n'était interrogé que depuis l'application : un live
 * qui démarre quand personne ne joue n'était vu par personne, donc aucune
 * notification ne partait — le brief « je rouvre parce qu'un type vient de
 * lancer son live » ne tenait qu'à moitié. Ces contrôles vérifient le contrat de
 * l'horloge : où elle appelle, avec quelle clé, à quelle fréquence, et qui a le
 * droit de s'en servir.
 */
const AUTO_SQL = readFileSync(
  path.join(ROOT, "supabase", "migrations", "0025_direct_auto.sql"),
  "utf8",
);
const AUTO = AUTO_SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("0025_direct_auto.sql (le direct se réveille tout seul)", () => {
  it("appelle la fonction serveur, et rien d'autre : Twitch n'est pas dans la base", () => {
    // La base ne connaît ni Twitch ni ses secrets : elle sonne, la fonction
    // travaille. Sinon il faudrait deux copies des règles du direct — et elles
    // divergeraient.
    expect(AUTO).toContain("net.http_post");
    expect(AUTO).toContain("/functions/v1/refresh-live");
    expect(AUTO).not.toMatch(/api\.twitch\.tv|id\.twitch\.tv/);
    expect(AUTO).not.toContain("TWITCH_CLIENT_SECRET");
  });

  it("n'embarque que la clé publique, jamais une clé de service", () => {
    // La porte accepte n'importe quel porteur : la clé publique suffit. Une
    // clé de service dans une migration serait un secret écrit dans un dépôt
    // public — et la migration est lue par tout le monde.
    expect(AUTO).toContain("sb_publishable_");
    expect(AUTO).not.toContain("sb_secret_");
    expect(AUTO).not.toContain("service_role");
    expect(AUTO).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("planifie une horloge, pas deux, et la remplace quand on rejoue la migration", () => {
    expect(AUTO).toMatch(/cron\.schedule\(\s*'creatordeck-refresh-live',\s*'\*\/2 \* \* \* \*'/);
    // Rejouer la migration ne doit pas empiler deux horloges identiques.
    expect(AUTO).toContain("cron.unschedule");
    expect(AUTO).toContain("jobname = 'creatordeck-refresh-live'");
  });

  it("reste silencieuse quand le Postgres n'a pas pg_cron (vérifieur, préproduction)", () => {
    // Sans ce garde-fou, la migration échouerait sur un Postgres ordinaire et
    // toute la pile deviendrait irrejouable ailleurs.
    expect(AUTO).toContain("to_regnamespace('cron') is null");
    expect(AUTO).toContain("exception when others");
    expect(AUTO).toContain("create extension if not exists pg_cron");
    expect(AUTO).toContain("create extension if not exists pg_net");
  });

  it("garde la porte fermée aux joueurs", () => {
    // Ouverte, elle laisserait n'importe quel compte faire taper Twitch à
    // volonté — une porte invisible jusqu'au jour du quota.
    expect(AUTO).toContain(
      "revoke all on function public.cron_refresh_live() from public, anon, authenticated",
    );
    expect(AUTO).toContain("security definer");
    // Cinq secondes : le temps qu'une fonction Edge à froid réponde.
    expect(AUTO).toMatch(/timeout_milliseconds := 5000/);
  });

  it("demande un rafraîchissement plus souvent que l'application", () => {
    // L'app redemande toutes les trois minutes (`LIVE_REFRESH_MS`) ; l'horloge
    // doit passer plus souvent, sinon elle n'apporterait rien.
    expect(AUTO).toContain("'*/2 * * * *'");
    expect(LIVE_REFRESH_MS).toBeGreaterThan(2 * 60 * 1000);
    // Et pas toutes les secondes non plus : `refresh-live` se limite lui-même à
    // une requête Twitch toutes les 90 secondes, appeler plus vite ne
    // rafraîchirait rien.
    expect(AUTO).toContain("'*/2 * * * *'");
  });
});

describe("0011_direct.sql (le Direct côté serveur)", () => {
  it("reprend le poids des créateurs en direct, au millième comme le moteur", () => {
    // Le moteur local arrondit `creatorBias * 1000` : 1,5 devient 1500.
    const bias = Math.round(DIRECT_BONUS.creatorBias * 1000);
    expect(bias).toBeGreaterThan(1000);
    expect(CODE).toContain(`then ${bias}`);
  });

  it("reprend la chance de variante Live (pour mille)", () => {
    expect(CODE).toContain(`< ${DIRECT_BONUS.livePermille}`);
    expect(CODE).toMatch(/return 'live'/);
  });

  it("ne tire aucune carte Live sans information fraîche sur le direct", () => {
    // La seule source de variante Live est `p_live`, et cet argument n'est vrai
    // que pour un `login` du cache. Un `'live'` écrit en dur dans le slot
    // garanti rendrait le badge décoratif — c'est exactement ce qu'on répare.
    expect(CODE).not.toMatch(/['"]variant['"],\s*['"]live['"]/);
    expect(CODE).toMatch(/p_live and public\._pack_random_int\(10000\) < 200/);
  });

  it("ne connaît que les directs de moins de dix minutes", () => {
    const minutes = LIVE_TTL_MS / 60000;
    expect(CODE).toContain(`interval '${minutes} minutes'`);
    // Et si `0007_direct.sql` n'a pas été collée, la fonction se tait au lieu
    // de casser le tirage.
    expect(CODE).toMatch(/when undefined_table then/);
  });

  it("remplace la fonction de variante à deux arguments (pas de surcharge)", () => {
    // Sans le `drop`, Postgres garderait les deux signatures et un appel à deux
    // arguments deviendrait ambigu au moment de l'exécution.
    expect(CODE).toMatch(/drop function if exists public\._pack_choose_variant\(text, boolean\);/);
    expect(CODE).toMatch(/function public\._pack_choose_variant\(\s*p_rarity text,\s*p_rare_drop boolean,\s*p_live boolean\s*\)/);
  });

  it("reprend la variante Live sur la carte garantie, conditionnellement", () => {
    expect(CODE).toMatch(/when v_slug = any \(coalesce\(v_live, '\{\}'::text\[\]\)\) then 'live'/);
  });

  it("garde les fonctions internes hors de portée des joueurs", () => {
    for (const internal of [
      "_direct_live_logins\\(\\)",
      "_pack_creator_weight\\(text, text\\[\\]\\)",
      "_pack_choose_variant\\(text, boolean, boolean\\)",
      "_pack_choose_creator\\(jsonb, text\\[\\]\\)",
    ]) {
      expect(SQL).toMatch(new RegExp(`revoke all on function public\\.${internal} from public, anon, authenticated;`));
    }
    // `open_pack()` reste réservée aux joueurs connectés.
    expect(SQL).toMatch(/revoke all on function public\.open_pack\(\) from public, anon;/);
    expect(SQL).toMatch(/grant execute on function public\.open_pack\(\) to authenticated;/);
  });

  it("garde les seuils des autres variantes alignés sur le fichier de taux", () => {
    // Le bonus ne doit pas avoir déplacé les seuils existants : Perfect,
    // Holo et la rareté de départ sont ceux de `pull-rates.json`.
    expect(CODE).toContain(`< ${PULL_RATES.live.rareDrop.variantUpgradePermille}`);
    expect(CODE).toContain(`< ${PULL_RATES.live.variants.holoPermille}`);
    expect(CODE).toMatch(/p_rarity in \('uncommon', 'rare', 'epic', 'legendary'\)/);
  });
});
