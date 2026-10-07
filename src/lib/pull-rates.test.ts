import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PACKS } from "@/lib/catalog";
import { PITY_PACK, PULL_RATES, RARITIES, packOdds } from "@/lib/pull-rates";

const PACK_TYPES = Object.keys(PACKS) as (keyof typeof PACKS)[];

/**
 * Le SQL doit dire la même chose que le fichier des taux.
 *
 * La variante Gold a deux endroits : le moteur (qui lit `pull-rates.json`) et le
 * serveur (`0030_gold.sql`, qui tire depuis ses propres littéraux). Un taux
 * changé d'un côté seulement ferait diverger le jeu de ce que l'écran annonce —
 * c'est le genre d'écart qu'on ne voit qu'en production, chez le joueur.
 */
const SQL_GOLD = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "0030_gold.sql"),
  "utf8",
);

describe("pull-rates", () => {
  it("décrit exactement les boosters du catalogue", () => {
    expect(PACK_TYPES.length).toBeGreaterThan(0);
    for (const pack of PACK_TYPES) {
      const table = PULL_RATES[pack];
      expect(table.slots).toHaveLength(PACKS[pack].size - 1);
      expect(table.slotCount).toBe(PACKS[pack].size - 1);
      expect(table.slots.length + 1).toBe(PACKS[pack].size);

      // Chaque rareté annoncée doit être atteignable, sinon elle serait un
      // mensonge dans l'écran « Taux de drop ». Le Paquet Scène en exclut une
      // volontairement — la Légendaire — et le dit à l'écran ; c'est le seul
      // cas autorisé, et il est vérifié comme tel.
      for (const rarity of RARITIES) {
        const declared = [
          ...table.slots.map((slot) => slot.weights),
          table.guaranteed.weights,
          table.rareDrop.weights,
        ].some((weights) => (weights[rarity] ?? 0) > 0);
        if (pack === "scene" && rarity === "legendary") {
          expect(declared, `${pack} · ${rarity}`).toBe(false);
          continue;
        }
        expect(declared, `${pack} · ${rarity}`).toBe(true);
      }
    }
  });

  it("le Paquet Scène ne publie aucune chance de Légendaire", () => {
    // La promesse est dans les taux **et** dans le validateur du catalogue :
    // une Légendaire qui apparaîtrait un jour dans le paquet de famille ferait
    // échouer `catalog:ci` et ce test. Le plancher de malchance, lui, ne parle
    // que du Live Drop.
    const odds = packOdds("scene");
    for (const slot of odds.slots) {
      expect(slot.probabilities.legendary).toBe(0);
    }
    expect(odds.perPack.legendary).toBe(0);
    expect(PITY_PACK).toBe("live");
  });

  it("publie des probabilités qui somment à 100 %", () => {
    for (const pack of PACK_TYPES) {
      const odds = packOdds(pack);
      expect(odds.cardCount).toBe(PACKS[pack].size);

      for (const slot of odds.slots) {
        const sum = RARITIES.reduce((acc, rarity) => acc + slot.probabilities[rarity], 0);
        expect(sum).toBeCloseTo(1, 10);
      }

      const perCardSum = RARITIES.reduce((acc, rarity) => acc + odds.perCard[rarity], 0);
      expect(perCardSum).toBeCloseTo(1, 10);

      for (const rarity of RARITIES) {
        expect(odds.perPack[rarity]).toBeGreaterThanOrEqual(odds.perCard[rarity]);
        expect(odds.perPack[rarity]).toBeLessThanOrEqual(1);
      }

      expect(odds.rareDrop.chance).toBeGreaterThan(0);
      expect(odds.rareDrop.chance).toBeLessThan(0.02);
      expect(odds.slots.at(-1)?.id).toBe("guaranteed");
    }
  });

  it("donne à la Légendaire 1 % de Gold, et le dit aussi dans le SQL", () => {
    // 1 % sur la Légendaire, et sur elle seule. Le tirage de variante se fait
    // sur 10 000 (comme le Holo, à 75), donc 1 % = 100.
    expect(PULL_RATES.live.variants.goldPermille).toBe(100);
    expect(PULL_RATES.live.variants.goldRarity).toBe("legendary");
    // Le paquet Scène n'a jamais de Légendaire : pas de Gold chez lui, et le
    // fichier le dit en n'ayant pas de goldPermille.
    expect(PULL_RATES.scene.variants.goldPermille).toBeUndefined();

    // Le serveur tire avec le même taux, au pour mille près.
    expect(SQL_GOLD).toContain(`< ${PULL_RATES.live.variants.goldPermille}`);
    expect(SQL_GOLD).toContain(`p_rarity = '${PULL_RATES.live.variants.goldRarity}'`);
    // Et l'échelle : le seuil du SQL est celui du fichier, pas un « pour mille »
    // qu'on aurait divisé par dix par habitude.
    expect(SQL_GOLD).toContain(`v_roll < ${PULL_RATES.live.variants.goldPermille}`);
    // Et la signature reste celle de production : trois paramètres. Une
    // signature différente créerait une **surcharge** au lieu de remplacer la
    // fonction — c'est le piège qui a bloqué le jeu le 7 octobre.
    expect(SQL_GOLD).toMatch(
      /create or replace function public\._pack_choose_variant\(\s*p_rarity text,\s*p_rare_drop boolean,\s*p_live boolean\s*\)/,
    );
    expect(SQL_GOLD).not.toMatch(/drop function/i);
  });

  it("reflète la montée des taux au fil du booster", () => {
    const odds = packOdds("live");
    const top = (probabilities: (typeof odds.slots)[number]["probabilities"]) =>
      probabilities.epic + probabilities.legendary;
    const first = odds.slots[0].probabilities;
    const lastOrdinary = odds.slots[odds.slots.length - 2].probabilities;
    expect(top(lastOrdinary)).toBeGreaterThan(top(first));
  });
});
