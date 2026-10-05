import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  formatBytes,
  pruneOrphans,
  selectMissing,
  selectOrphans,
  sumFileSizes,
} from "../../scripts/lib/portraits.mjs";

/**
 * Entretien de public/creators : un portrait orphelin part dans l'APK sans
 * jamais être affiché, un portrait manquant laisse un trou dans l'application.
 * Les deux se paient au moment de committer, donc autant les détecter là.
 */
describe("portraits · sélection", () => {
  it("trouve les fichiers sans créateur, et rien d'autre", () => {
    const files = ["squeezie.jpg", "gotaga.jpg", "ancien-streamer.jpg", "README.md", ".gitkeep"];
    expect(selectOrphans(files, ["squeezie", "gotaga"])).toEqual(["ancien-streamer.jpg"]);
    // Un dossier propre ne remonte rien, et la casse de l'extension est tolérée.
    expect(selectOrphans(["a.jpg", "b.JPG"], ["a", "b"])).toEqual([]);
    expect(selectMissing(["a.jpg"], ["a", "b", "c"])).toEqual(["b", "c"]);
  });

  it("ne confond pas une variante de slug avec un orphelin", () => {
    // `squeezie-2.jpg` n'est pas le portrait de `squeezie` : sans entrée
    // correspondante dans le catalogue, c'est bien un orphelin.
    expect(selectOrphans(["squeezie.jpg", "squeezie-2.jpg"], ["squeezie"])).toEqual([
      "squeezie-2.jpg",
    ]);
  });
});

describe("portraits · élagage", () => {
  it("liste sans supprimer par défaut, puis supprime sur demande", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "creatordeck-portraits-"));
    await mkdir(path.join(dir, "nested"), { recursive: true });
    await writeFile(path.join(dir, "garde.jpg"), "x".repeat(100));
    await writeFile(path.join(dir, "orphelin.jpg"), "y".repeat(250));
    await writeFile(path.join(dir, "note.txt"), "à ne pas toucher");

    try {
      const listing = await pruneOrphans({ dir, slugs: ["garde"] });
      expect(listing.orphans).toEqual(["orphelin.jpg"]);
      expect(listing.bytes).toBe(250);
      expect(listing.removed).toBe(0);
      expect(await readdir(dir)).toContain("orphelin.jpg");

      const applied = await pruneOrphans({ dir, slugs: ["garde"], apply: true });
      expect(applied.removed).toBe(1);
      const left = await readdir(dir);
      expect(left).toContain("garde.jpg");
      expect(left).not.toContain("orphelin.jpg");
      // Le fichier non-JPEG et le sous-dossier sont intacts.
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
