/**
 * Garde-fous sur `supabase/migrations/0036_streamer.sql` — la chaîne.
 *
 * Le PL/pgSQL ne s'exécute pas dans Vitest : ce qui est vérifiable ici, c'est le
 * **contrat** entre le SQL et `src/data/streamer.json`, le fichier que lit le
 * moteur local. L'exécution réelle — l'absence payée, le plafond de sept jours,
 * l'horloge reculée qui ne crédite rien, une seule vidéo par jour, le versement
 * sur le solde des jetons — est dans `scripts/verify-supabase-migrations.mjs`.
 *
 * Enjeu : la chaîne **paie en jetons**, et les jetons achètent des cartes. Si
 * un palier, une chance ou le plafond divergeait d'une copie à l'autre, le
 * joueur verrait un chiffre à l'écran et le serveur en paierait un autre.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PROGRESSION } from "@/lib/progression";
import {
  CAP_DAYS,
  EVENTS,
  GUEST_LIVE_WINDOW_MINUTES,
  GUEST_SLOTS,
  SETUP_LEVELS,
  STREAMER,
  STREAMER_TOKENS,
  TIERS,
} from "@/lib/streamer";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const FICHIER = "0036_streamer.sql";
const FICHIER_IMPREVUS = "0038_imprevus_setup.sql";
const FICHIER_BUREAU = "0039_invites_bureau.sql";
const FICHIER_DOUBLONS = "0040_setup_doublons.sql";
const SQL = readFileSync(path.join(MIGRATIONS, FICHIER), "utf8");
/** Le fichier sans ses commentaires, puis sans ses retours à la ligne. */
const CODE = SQL.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
const FLAT = CODE.replace(/\s+/g, " ");
// Les imprévus et le setup vivent dans `0038` : mêmes règles, autre fichier.
const SQL_IMPREVUS = readFileSync(path.join(MIGRATIONS, FICHIER_IMPREVUS), "utf8");
const FLAT_IMPREVUS = SQL_IMPREVUS.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n")
  .replace(/\s+/g, " ");

// Les invités sur le bureau : ni monnaie, ni tirage — des règles de direct.
const SQL_BUREAU = readFileSync(path.join(MIGRATIONS, FICHIER_BUREAU), "utf8");
const FLAT_BUREAU = SQL_BUREAU.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n")
  .replace(/\s+/g, " ");

// Le studio : les paliers en doublons, leur monnaie et le barème du sacrifice.
const SQL_DOUBLONS = readFileSync(path.join(MIGRATIONS, FICHIER_DOUBLONS), "utf8");
const FLAT_DOUBLONS = SQL_DOUBLONS.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n")
  .replace(/\s+/g, " ");

const migrations = readdirSync(MIGRATIONS)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

/** Le contenu de la **dernière** migration qui définit `nom`. */
function derniereDefinition(nom: string): string {
  let trouve = "";
  for (const fichier of migrations) {
    const sql = readFileSync(path.join(MIGRATIONS, fichier), "utf8");
    if (sql.includes(`create or replace function public.${nom}(`)) trouve = sql;
  }
  if (!trouve) throw new Error(`aucune migration ne définit ${nom}`);
  return trouve;
}

describe("0036_streamer.sql (la chaîne)", () => {
  it("paie le même barème que le fichier, palier par palier", () => {
    // Les seuils et les gains, dans l'ordre décroissant du `case` : la dernière
    // branche est le palier de départ (0 abonné).
    const attendu = [...TIERS].sort((a, b) => b.at - a.at);
    for (const tier of attendu.slice(0, -1)) {
      expect(FLAT).toContain(`when coalesce(p_subscribers, 0) >= ${tier.at} then ${tier.perDay}`);
    }
    expect(FLAT).toMatch(/else 240 end/);
    expect(attendu[attendu.length - 1].perDay).toBe(240);
  });

  it("plafonne l'absence à sept journées, comme le fichier", () => {
    expect(FLAT).toMatch(/select 7;/);
    expect(CAP_DAYS).toBe(7);
  });

  it("porte les mêmes chances, pour chaque format", () => {
    for (const format of STREAMER.formats) {
      const ligne = `('${format.id}', ${format.successChancePermille}, ${format.gainPermille}, ${format.buzzPermille}, ${format.badBuzzPermille ?? 0}, ${format.requiresCreator ? "true" : "false"})`;
      expect(FLAT).toContain(ligne.replace(/\s+/g, " ").replace(/\(/g, "("));
    }
    // Et pas un format de plus d'un seul côté.
    expect(STREAMER.formats.length).toBe(4);
    expect((FLAT.match(/\('(letsplay|irl|ragebait|collab)', \d+, \d+, \d+, \d+, (true|false)\)/g) ?? []).length).toBe(4);
  });

  it("verse et plafonne les mêmes jetons que le fichier", () => {
    expect(FLAT).toMatch(
      new RegExp(`when coalesce\\(p_success, false\\) then ${STREAMER_TOKENS.perSuccess} \\+ case when coalesce\\(p_buzz, false\\) then ${STREAMER_TOKENS.perBuzz} else 0 end`),
    );
    expect(FLAT).toContain(`select ${STREAMER_TOKENS.perDayCap};`);
  });

  it("compte la journée de jeu comme les missions (6 h UTC)", () => {
    // Une deuxième définition de la journée serait un piège : la même heure
    // ferait basculer la série, les missions et la chaîne ensemble.
    expect(FLAT).toContain(`interval '${PROGRESSION.missions.resetHourUtc} hours'`);
    expect(PROGRESSION.missions.resetHourUtc).toBe(6);
  });

  it("déclare sa ligne dans le rapport de version", () => {
    // `schema_versions()` est réécrit par chaque migration récente : le rapport
    // final est celui de la **dernière** recollée (`0038` aujourd'hui). Ici on
    // vérifie que la définition qui porte `0036` la déclare bien — et que la
    // clé existe encore dans la dernière version du rapport.
    const rapport = derniereDefinition("schema_versions");
    expect(rapport).toContain("'0036'");
    expect(rapport).toMatch(/to_regclass\('public\.streamer_channels'\)/);
    expect(rapport).toContain("'0035'");
    const sienne = SQL.replace(/--.*$/gm, "");
    expect(sienne).toMatch(/to_regclass\('public\.streamer_channels'\)/);
  });

  it("ferme ses tables et ses fonctions internes au joueur", () => {
    // Le client passe par `streamer_status()`, `streamer_visit()` et
    // `streamer_publish()` — jamais par les tables, ni par les tirages.
    for (const table of ["streamer_channels", "streamer_videos"]) {
      expect(FLAT).toContain("revoke all on table public." + table + " from public, anon, authenticated");
      expect(FLAT).toContain("alter table public." + table + " enable row level security");
    }
    for (const fonction of [
      "_streamer_ensure(uuid)",
      "_streamer_game_day(timestamptz)",
      "_streamer_day_number(timestamptz)",
      "_streamer_cap_days()",
      "_streamer_per_day(bigint)",
      "_streamer_format(text)",
      "_streamer_token_gain(boolean, boolean)",
      "_streamer_token_cap()",
    ]) {
      expect(FLAT).toContain(`revoke all on function public.${fonction} from public, anon, authenticated`);
    }
    for (const ouverte of ["streamer_status()", "streamer_visit()", "streamer_publish(text)"]) {
      expect(FLAT).toContain(`grant execute on function public.${ouverte} to authenticated`);
    }
  });

  it("passe par le journal des jetons, pas par une écriture directe", () => {
    // Le versement doit rester idempotent : c'est `_tokens_apply()` (dont le
    // journal unique porte la journée) qui paie, jamais un `insert` dans
    // `tokens`.
    expect(FLAT).toContain("perform public._tokens_apply(v_user, v_paid, 'streamer', v_day)");
    expect(FLAT).not.toMatch(/insert into public\.tokens/);
    // Et une seule vidéo par journée de jeu : l'index unique le garantit.
    expect(FLAT).toContain("create unique index if not exists streamer_videos_one_per_day");
  });
});

describe("0040_setup_doublons.sql (le studio, payé en doublons)", () => {
  it("porte la monnaie de chaque palier, dans le même ordre que le fichier", () => {
    for (const niveau of SETUP_LEVELS) {
      expect(FLAT_DOUBLONS).toContain(`('${niveau.id}', '${niveau.currency}')`);
    }
    const lignes = FLAT_DOUBLONS.match(/\('[a-z0-9-]+', '(points|doublons)'\)/g) ?? [];
    expect(lignes.length).toBe(SETUP_LEVELS.length);
  });

  it("paie les doublons au même barème que le fichier", () => {
    for (const [rarity, value] of Object.entries(STREAMER.setup.sacrifice.values)) {
      expect(FLAT_DOUBLONS).toContain(`('${rarity}', ${value})`);
    }
    const lignes = FLAT_DOUBLONS.match(/\('(common|uncommon|rare|epic|legendary)', \d+\)/g) ?? [];
    // Deux raretés seulement : Rare et Épique. Ni les Communes, ni les Peu
    // communes, et surtout **pas la Légendaire**.
    expect(lignes.length).toBe(2);
    expect(STREAMER.setup.sacrifice.values).toEqual({ rare: 1, epic: 2 });
  });

  it("refuse une Légendaire, la dernière copie, et une carte déjà partie", () => {
    // Les trois refus qui protègent la collection, mot pour mot : ce sont les
    // mêmes phrases côté moteur local, pour que le joueur lise la même chose
    // en ligne et hors ligne.
    expect(FLAT_DOUBLONS).toContain("jamais une Légendaire");
    expect(FLAT_DOUBLONS).toContain("ta seule copie");
    expect(FLAT_DOUBLONS).toContain("cette carte est déjà partie au studio");
    // Le compte tombe juste, et le prix vient du serveur.
    expect(FLAT_DOUBLONS).toContain("il faut % points de sacrifice");
    // La provenance reste la porte de sortie du recyclage.
    expect(FLAT_DOUBLONS).toContain("provenance vérifiable");
  });

  it("ferme le journal des départs, et garde une carte par ligne", () => {
    // La preuve du départ : une carte = une ligne, donc jamais deux paiements
    // avec la même carte.
    expect(FLAT_DOUBLONS).toContain("create table if not exists public.streamer_sacrifices");
    expect(FLAT_DOUBLONS).toContain("primary key (user_id, card_id)");
    expect(FLAT_DOUBLONS).toContain("alter table public.streamer_sacrifices enable row level security");
    expect(FLAT_DOUBLONS).toContain(
      "revoke all on table public.streamer_sacrifices from public, anon, authenticated",
    );
    expect(FLAT_DOUBLONS).toContain("from public.streamer_sacrifices d");
    // Et la porte, elle, est ouverte au joueur connecté — pas aux autres.
    expect(FLAT_DOUBLONS).toContain(
      "grant execute on function public.streamer_setup_sacrifice(jsonb) to authenticated",
    );
    expect(FLAT_DOUBLONS).toContain(
      "revoke all on function public.streamer_setup_sacrifice(jsonb) from public, anon",
    );
    expect(FLAT_DOUBLONS).toContain(
      "revoke all on function public._streamer_sacrifice_values() from public, anon, authenticated",
    );
  });

  it("ne laisse pas la porte des points vendre un palier en doublons", () => {
    // `streamer_setup_buy()` est réécrit ici : sans la garde, « webcam2 »
    // coûterait deux **points** — le prix lu dans la même table.
    expect(FLAT_DOUBLONS).toContain("se paie en doublons");
    expect(FLAT_DOUBLONS).toContain("public._streamer_setup_currency(v_niveau.level)");
    const rapport = derniereDefinition("schema_versions");
    expect(rapport).toContain("'0040'");
    expect(rapport).toMatch(/to_regprocedure\('public\.streamer_setup_sacrifice\(jsonb\)'\)/);
  });
});

describe("0038_imprevus_setup.sql (les imprévus et le setup)", () => {
  it("porte les mêmes côtés de carte que le fichier, à la virgule près", () => {
    // Le texte des cartes n'est pas ici (il vit dans le JSON) : ce sont les
    // **nombres** qui sont en double, et un chiffre changé d'un seul côté ferait
    // tirer au serveur autre chose que ce que l'écran annonce.
    for (const carte of EVENTS) {
      for (const cote of carte.choices) {
        const ligne = `('${carte.id}', '${cote.id}', ${cote.successChancePermille}, ${cote.gainPermille}, ${cote.buzzPermille}, ${cote.badBuzzPermille})`;
        expect(FLAT_IMPREVUS).toContain(ligne);
      }
    }
    // Six cartes, deux côtés chacune — et pas une de plus d'un seul côté.
    const lignes = FLAT_IMPREVUS.match(/\('(modo|sponsor|clip|coupure|raid|nuit)', '(gauche|droite)', \d+, \d+, \d+, \d+\)/g) ?? [];
    expect(lignes.length).toBe(12);
    expect(EVENTS.length).toBe(6);
  });

  it("chiffre les paliers de setup comme le fichier, dans l'ordre", () => {
    // Les paliers vivent maintenant dans **deux** migrations : les cinq en
    // points dans `0038`, et la liste complète (huit) dans `0040`, qui remplace
    // la fonction. C'est la dernière définition qui fait foi — celle que la
    // base jouera — donc c'est elle qu'on regarde, comme le fait le serveur.
    const derniere = derniereDefinition("_streamer_setup_levels");
    const flat = derniere
      .split("\n")
      .map((line) => line.replace(/--.*$/, ""))
      .join("\n")
      .replace(/\s+/g, " ");
    for (const niveau of SETUP_LEVELS) {
      const rang = SETUP_LEVELS.indexOf(niveau) + 1;
      const ligne = `(${rang}, '${niveau.id}', ${niveau.price}, ${niveau.growthPermille})`;
      expect(flat).toContain(ligne);
    }
    const lignes = flat.match(/\(\d+, '[a-z0-9-]+', \d+, \d+\)/g) ?? [];
    expect(lignes.length).toBe(8);
    expect(SETUP_LEVELS.length).toBe(8);
    // Les cinq premiers sont bien ceux de `0038`, dans le même ordre : la
    // seconde série **s'ajoute** à la première, elle ne la réécrit pas.
    for (const niveau of SETUP_LEVELS.slice(0, 5)) {
      const rang = SETUP_LEVELS.indexOf(niveau) + 1;
      expect(FLAT_IMPREVUS).toContain(`(${rang}, '${niveau.id}', ${niveau.price}, ${niveau.growthPermille})`);
    }
    // Le libellé, lui, n'est **pas** dans le SQL : il ne doit exister qu'une
    // fois, dans le fichier que lit l'écran.
    for (const niveau of SETUP_LEVELS) {
      expect(derniere).not.toContain(niveau.label);
    }
  });

  it("n'ouvre un imprévu qu'une fois par journée, et jamais celui du client", () => {
    // La carte du jour est choisie par le serveur (`md5(joueur, journée)`), et
    // le côté doit exister : le client ne peut ni choisir sa carte ni inventer
    // son côté.
    expect(FLAT_IMPREVUS).toMatch(/create unique index if not exists streamer_events_one_per_day/);
    expect(FLAT_IMPREVUS).toContain("public._streamer_event_for(v_user, v_day)");
    expect(FLAT_IMPREVUS).toContain("ce n''est pas l''imprévu du jour");
    expect(FLAT_IMPREVUS).toContain("from public._streamer_event_choice(v_event, p_choice)");
    expect(FLAT_IMPREVUS).toContain("substr(md5(coalesce(p_user::text, '')");
  });

  it("ne paie aucun jeton avec un imprévu", () => {
    // La monnaie de la chaîne a **une** porte : la vidéo du jour. Un imprévu qui
    // paierait des jetons serait une seconde porte — et deux portes finissent
    // toujours par se contourner.
    const corps = SQL_IMPREVUS.slice(
      SQL_IMPREVUS.indexOf("create or replace function public.streamer_choose"),
      SQL_IMPREVUS.indexOf("revoke all on function public.streamer_choose"),
    );
    expect(corps).not.toContain("_tokens_apply");
    expect(corps).not.toContain("tokens_today");
  });

  it("achète le setup par le wallet, une fois par palier, dans l'ordre", () => {
    // Le débit passe par `_wallet_apply` : c'est son journal unique
    // `(user_id, kind, ref)` qui rend le palier unique **pour toujours**, même
    // si le client rappelle. Un prix envoyé par le client n'existe pas ici.
    expect(FLAT_IMPREVUS).toContain("public._wallet_apply(v_user, -v_niveau.price, 'setup', v_niveau.level)");
    expect(FLAT_IMPREVUS).toMatch(/create unique index if not exists streamer_setup_one_per_level/);
    expect(FLAT_IMPREVUS).toContain("il faut d''abord « % »");
    // Le prix vient de la table du serveur, jamais d'un paramètre.
    expect(FLAT_IMPREVUS).toContain("create or replace function public.streamer_setup_buy(p_level text)");
  });

  it("arrête le bonus au premier palier manquant", () => {
    // La règle de l'ordre, côté données : une ligne ajoutée à la main ne donne
    // pas le bonus d'un palier dont les précédents manquent — et ne fait pas
    // sauter l'étape suivante au joueur.
    expect(FLAT_IMPREVUS).toMatch(/avant\.rang < l\.rang/);
    expect(FLAT_IMPREVUS).toContain("create or replace function public._streamer_setup_next(p_user uuid)");
    expect(FLAT_IMPREVUS).toMatch(/not exists \(\s*select 1 from public\.streamer_setup s where s\.user_id = p_user and s\.level = l\.level/);
  });

  it("fait grandir la chaîne du bonus, dans l'absence comme dans la vidéo", () => {
    // Le même pour-mille des deux côtés, appliqué à la croissance du palier.
    expect(FLAT_IMPREVUS).toMatch(/floor\(\s*public\._streamer_per_day\(p_subscribers\)\s*\* \(1000 \+ public\._streamer_setup_bonus\(p_user\)\) \/ 1000\.0\s*\)::integer/);
    // `streamer_visit()`, `streamer_status()` **et** `streamer_publish()` passent
    // par `_streamer_growth()` : une seule formule, donc un seul chiffre
    // possible. La vidéo est la plus importante des trois — c'est elle qui paie,
    // et une vidéo qui ignorerait le setup ferait mentir l'écran.
    const visite = derniereDefinition("streamer_visit");
    expect(visite).toContain("public._streamer_growth(v_user, v_row.subscribers)");
    // Le corps seul, sans ses commentaires : c'est le code qui paie, pas la
    // prose du fichier — et pas non plus les autres fonctions du même fichier.
    const fichier = derniereDefinition("streamer_publish");
    const video = fichier
      .slice(fichier.indexOf("create or replace function public.streamer_publish("))
      .replace(/--.*$/gm, "");
    expect(video).toContain("v_base := public._streamer_growth(v_user, v_row.subscribers)");
    expect(video.slice(0, video.indexOf("$$;"))).not.toContain("_streamer_per_day");
    const status = derniereDefinition("streamer_status");
    expect(status).toContain("public._streamer_growth(v_user, v_row.subscribers)");
    expect(status).toContain("'setup_bonus'");
  });

  it("ferme ses tables et ses fonctions internes, et ouvre ses portes au compte", () => {
    for (const table of ["streamer_events", "streamer_setup"]) {
      expect(FLAT_IMPREVUS).toContain("revoke all on table public." + table + " from public, anon, authenticated");
      expect(FLAT_IMPREVUS).toContain("alter table public." + table + " enable row level security");
    }
    for (const fonction of [
      "_streamer_events()",
      "_streamer_event_choice(text, text)",
      "_streamer_event_for(uuid, text)",
      "_streamer_setup_levels()",
      "_streamer_setup_bonus(uuid)",
      "_streamer_setup_owned(uuid)",
      "_streamer_setup_next(uuid)",
      "_streamer_growth(uuid, bigint)",
    ]) {
      expect(FLAT_IMPREVUS).toContain(`revoke all on function public.${fonction} from public, anon, authenticated`);
    }
    for (const ouverte of [
      "streamer_event_today()",
      "streamer_choose(text, text)",
      "streamer_setup_buy(text)",
    ]) {
      expect(FLAT_IMPREVUS).toContain(`grant execute on function public.${ouverte} to authenticated`);
    }
  });

  it("déclare sa ligne dans le rapport de version, après la 0037", () => {
    const rapport = derniereDefinition("schema_versions");
    expect(rapport).toContain("'0038'");
    expect(rapport).toMatch(/to_regclass\('public\.streamer_events'\)/);
    expect(rapport).toContain("'0037'");
  });

  it("est jouée pour de vrai par le vérificateur, pas seulement décrite ici", () => {
    const verifieur = readFileSync(path.join(ROOT, "scripts", "verify-supabase-migrations.mjs"), "utf8");
    expect(verifieur).toContain("0038_imprevus_setup.sql");
    expect(verifieur).toContain("imprévus : la carte du jour ne change pas entre deux ouvertures");
    expect(verifieur).toContain("setup : un palier volé ne fait pas sauter l'étape suivante");
    expect(verifieur).toContain("setup : recoller `0036` seule après `0038` fait perdre le setup de l'écran");
  });
});

describe("0039_invites_bureau.sql (les invités sur le bureau)", () => {
  it("chiffre le raid comme le fichier, rareté par rareté", () => {
    // Les cinq raretés du catalogue, dans la forme exacte du `case` : un chiffre
    // changé d'un seul côté ferait payer au serveur autre chose que ce que
    // l'écran annonce au joueur.
    for (const [rarity, permille] of Object.entries(STREAMER.guests.raidPermille)) {
      expect(FLAT_BUREAU).toContain(`when '${rarity}' then ${permille}`);
    }
    const lignes =
      FLAT_BUREAU.match(/when '(common|uncommon|rare|epic|legendary)' then \d+/g) ?? [];
    expect(lignes.length).toBe(Object.keys(STREAMER.guests.raidPermille).length);
    // Et la rareté inconnue ne paie **rien** : `else 0`, jamais un défaut.
    expect(FLAT_BUREAU).toMatch(/else 0 end/);
  });

  it("tient les mêmes places et la même fenêtre de direct que l'app", () => {
    // Les places : la contrainte de la table **et** le refus de la porte,
    // tous les deux écrits avec le chiffre du fichier.
    expect(GUEST_SLOTS).toBe(2);
    expect(FLAT_BUREAU).toContain(`check (slot between 1 and ${GUEST_SLOTS})`);
    expect(FLAT_BUREAU).toContain(`if v_slot < 1 or v_slot > ${GUEST_SLOTS} then`);
    expect(FLAT_BUREAU).toContain(`select interval '${GUEST_LIVE_WINDOW_MINUTES} minutes';`);
    // La fraîcheur se lit sur `live_state`, jamais sur une horloge locale : dix
    // minutes plus tard, le même badge est éteint des deux côtés.
    expect(FLAT_BUREAU).toContain("from public.live_state");
    expect(FLAT_BUREAU).toContain("public._streamer_live_window()");
  });

  it("ne pose qu'une carte possédée, et jamais deux fois le même créateur", () => {
    // Le versement des cartes a **une** règle dans tout le jeu
    // (`card_claim_covers`, celle des échanges et de l'hôtel) : le bureau ne
    // s'en invente pas une deuxième.
    expect(FLAT_BUREAU).toContain("public.card_claim_covers");
    expect(FLAT_BUREAU).toContain("create unique index if not exists streamer_guests_un_createur");
    expect(FLAT_BUREAU).toContain("on public.streamer_guests (user_id, creator_slug);");
    // Les refus, mot pour mot — c'est ce que le client affiche.
    for (const refus of [
      "place-inconnue",
      "carte-sans-identifiant",
      "createur-inconnu",
      "rarete-inconnue",
      "variante-inconnue",
      "meme-createur",
      "carte-non-possedee",
    ]) {
      expect(FLAT_BUREAU).toContain(`'${refus}'`);
    }
  });

  it("rend le bureau en tableau, même vide — jamais le néant", () => {
    // Le piège qui a coûté une journée : `to_jsonb` d'une fonction
    // **ensembliste** rend une ligne par invité, donc aucune quand le bureau
    // est vide — et un `RETURN` sans ligne rend `NULL`, pas un état vide.
    expect(FLAT_BUREAU).not.toContain("to_jsonb(public._streamer_guests_of");
    expect(FLAT_BUREAU).toContain("create or replace function public._streamer_guest_list(p_user uuid)");
    expect(FLAT_BUREAU).toContain("coalesce(");
    expect(FLAT_BUREAU).toContain("'[]'::jsonb");
    // Et l'écran ne peut pas appeler la liste directement : elle est fermée.
    expect(FLAT_BUREAU).toContain(
      "revoke all on function public._streamer_guest_list(uuid) from public, anon, authenticated",
    );
  });

  it("paie le raid dans le relevé, une seule fois par journée de jeu", () => {
    // Le journal des raids **est** la preuve du paiement : une ligne par
    // (joueur, journée), et le paiement n'a lieu que si la ligne manque.
    expect(FLAT_BUREAU).toContain("create table if not exists public.streamer_raids");
    expect(FLAT_BUREAU).toContain("primary key (user_id, day)");
    const visite = FLAT_BUREAU.slice(FLAT_BUREAU.indexOf("create or replace function public.streamer_visit("));
    expect(visite).toContain("if not found then");
    expect(visite).toMatch(/if v_raid_new > 0 then\s+insert into public\.streamer_raids/);
    // Aucune monnaie : ni jeton, ni point, ni wallet dans ce fichier.
    expect(FLAT_BUREAU).not.toContain("_tokens_apply");
    expect(FLAT_BUREAU).not.toContain("_wallet_apply");
  });

  it("ferme ses tables et ses aides, et n'ouvre que sa porte au compte", () => {
    for (const table of ["streamer_guests", "streamer_raids"]) {
      expect(FLAT_BUREAU).toContain("revoke all on table public." + table + " from public, anon, authenticated");
      expect(FLAT_BUREAU).toContain("alter table public." + table + " enable row level security");
    }
    for (const fonction of [
      "_streamer_guest_permille(text)",
      "_streamer_live_window()",
      "_streamer_guests_of(uuid)",
      "_streamer_guest_list(uuid)",
      "_streamer_raid_of(uuid, integer)",
    ]) {
      expect(FLAT_BUREAU).toContain(`revoke all on function public.${fonction} from public, anon, authenticated`);
    }
    expect(FLAT_BUREAU).toContain(
      "grant execute on function public.streamer_guest_set(integer, jsonb) to authenticated",
    );
    for (const ouverte of ["streamer_status()", "streamer_visit()"]) {
      expect(FLAT_BUREAU).toContain(`grant execute on function public.${ouverte} to authenticated`);
    }
  });

  it("déclare sa ligne dans le rapport de version, après la 0038", () => {
    const rapport = derniereDefinition("schema_versions");
    expect(rapport).toContain("'0039'");
    expect(rapport).toMatch(/to_regclass\('public\.streamer_guests'\)/);
    expect(rapport).toContain("'0038'");
  });

  it("est jouée pour de vrai par le vérificateur, pas seulement décrite ici", () => {
    const verifieur = readFileSync(path.join(ROOT, "scripts", "verify-supabase-migrations.mjs"), "utf8");
    expect(verifieur).toContain("0039_invites_bureau.sql");
    expect(verifieur).toContain("invités : un bureau neuf est vide, sans raid payé");
    expect(verifieur).toContain("invités : un direct périmé (vingt minutes) ne paie pas, le même frais paie");
    expect(verifieur).toContain("invités : recoller `0038` seule après `0039` fait perdre le bureau de l'écran");
  });
});
