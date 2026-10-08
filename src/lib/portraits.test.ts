import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  PORTRAIT_EXT,
  formatBytes,
  pruneOrphans,
  selectMissing,
  selectOrphans,
  sumFileSizes,
} from "../../scripts/lib/portraits.mjs";
import { isFlatStats } from "../../scripts/lib/avatars.mjs";

/**
 * Entretien de public/creators : un portrait orphelin part dans l'APK sans
 * jamais être affiché, un portrait manquant laisse un trou dans l'application.
 * Les deux se paient au moment de committer, donc autant les détecter là.
 */
describe("portraits · sélection", () => {
  it("trouve les fichiers sans créateur, et rien d'autre", () => {
    // Un portrait resté en `.jpg` doit pouvoir être élagé, comme un `.webp`
    // orphelin : l'extension attendue vit à un seul endroit (`PORTRAIT_EXT`).
    expect(PORTRAIT_EXT).toBe(".webp");
    const files = ["squeezie.webp", "gotaga.webp", "ancien-streamer.webp", "README.md", ".gitkeep"];
    expect(selectOrphans(files, ["squeezie", "gotaga"])).toEqual(["ancien-streamer.webp"]);
    expect(selectOrphans(["vieux.jpg", "encore.jpeg"], ["autre"])).toEqual([
      "encore.jpeg",
      "vieux.jpg",
    ]);
    // Un dossier propre ne remonte rien, et la casse de l'extension est tolérée.
    expect(selectOrphans(["a.webp", "b.WEBP"], ["a", "b"])).toEqual([]);
    expect(selectMissing(["a.webp"], ["a", "b", "c"])).toEqual(["b", "c"]);
  });

  it("ne confond pas une variante de slug avec un orphelin", () => {
    // `squeezie-2.webp` n'est pas le portrait de `squeezie` : sans entrée
    // correspondante dans le catalogue, c'est bien un orphelin.
    expect(selectOrphans(["squeezie.webp", "squeezie-2.webp"], ["squeezie"])).toEqual([
      "squeezie-2.webp",
    ]);
  });
});

describe("portraits · image unie", () => {
  /** Ce que `sharp.stats()` rend pour une image vraiment plate. */
  const flat = { channels: [{ mean: 39, stdev: 0, min: 39, max: 39 }] };
  const photo = { channels: [{ mean: 149, stdev: 86, min: 12, max: 255 }] };
  // Un logo sombre sur fond noir : peu de contraste, mais du contraste.
  const sombre = { channels: [{ mean: 18, stdev: 24, min: 0, max: 90 }] };

  it("reconnaît l'avatar par défaut de Twitch et laisse passer les vraies images", () => {
    // C'est le cas `j0niq` / `toaststix` : le téléchargement réussit, l'image est
    // un carré plat, et le joueur voit un rectangle sombre à la place d'un
    // visage. Le seuil est bas exprès : une photo, même très sombre, varie.
    expect(isFlatStats(flat)).toBe(true);
    expect(isFlatStats(photo)).toBe(false);
    expect(isFlatStats(sombre)).toBe(false);
  });

  it("prend l'écart-type le plus large des canaux", () => {
    // Une image peut être plate en rouge et variée en bleu : elle est valable.
    expect(isFlatStats({ channels: [{ stdev: 0 }, { stdev: 0.2 }, { stdev: 41 }] })).toBe(false);
    expect(isFlatStats({ channels: [{ stdev: 2 }, { stdev: 3 }] })).toBe(true);
  });

  it("ne conclut rien sans statistiques exploitables", () => {
    // Pas de canaux = pas d'avis : c'est `readAvatarSize` / `selectMissing` qui
    // traitent le fichier absent ou illisible, pas ce contrôle.
    expect(isFlatStats(null)).toBe(false);
    expect(isFlatStats({})).toBe(false);
    expect(isFlatStats({ channels: [] })).toBe(false);
  });
});

describe("portraits · élagage", () => {
  it("liste sans supprimer par défaut, puis supprime sur demande", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "creatordeck-portraits-"));
    await mkdir(path.join(dir, "nested"), { recursive: true });
    await writeFile(path.join(dir, "garde.webp"), "x".repeat(100));
    await writeFile(path.join(dir, "orphelin.webp"), "y".repeat(250));
    await writeFile(path.join(dir, "note.txt"), "à ne pas toucher");

    try {
      const listing = await pruneOrphans({ dir, slugs: ["garde"] });
      expect(listing.orphans).toEqual(["orphelin.webp"]);
      expect(listing.bytes).toBe(250);
      expect(listing.removed).toBe(0);
      expect(await readdir(dir)).toContain("orphelin.webp");

      const applied = await pruneOrphans({ dir, slugs: ["garde"], apply: true });
      expect(applied.removed).toBe(1);
      const left = await readdir(dir);
      expect(left).toContain("garde.webp");
      expect(left).not.toContain("orphelin.webp");
      // Le fichier qui n'est pas un portrait et le sous-dossier sont intacts.
      expect(left).toContain("note.txt");
      expect(left).toContain("nested");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("tolère un dossier absent", async () => {
    const listing = await pruneOrphans({
      dir: path.join(tmpdir(), "creatordeck-inexistant-xyz"),
      slugs: ["a"],
    });
    expect(listing).toEqual({ orphans: [], bytes: 0, removed: 0 });
  });
});

describe("portraits · tailles", () => {
  it("additionne les fichiers existants et ignore les disparus", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "creatordeck-tailles-"));
    await writeFile(path.join(dir, "a.jpg"), "x".repeat(1024));
    await writeFile(path.join(dir, "b.jpg"), "x".repeat(512));
    try {
      expect(await sumFileSizes(dir, ["a.jpg", "b.jpg", "absent.jpg"])).toBe(1536);
      expect(formatBytes(1536)).toBe("2 Ko");
      expect(formatBytes(34 * 1024 * 1024)).toBe("34.0 Mo");
      expect(formatBytes(900)).toBe("900 o");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
