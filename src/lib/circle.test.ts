import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import {
  CIRCLE_LAST_SLOT_WEIGHTS,
  CIRCLE_MAX,
  CIRCLE_MIN,
  CIRCLE_PACK_SIZE,
  CIRCLE_SLOT_WEIGHTS,
  buildCreatorIndex,
  circleProgress,
  circleLabel,
  drawCirclePack,
  isValidCircle,
  normalizeChannelName,
  popularCreators,
  resolveCircleInput,
  searchCreators,
} from "@/lib/circle";

const INDEX = buildCreatorIndex(CREATORS);
const POPULAR = popularCreators(INDEX, [], CIRCLE_MAX).map((creator) => creator.slug);

/** Un générateur déterministe : un test de tirage ne doit jamais être aléatoire. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return (max: number) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

describe("lire ce que le joueur écrit", () => {
  it("ramène un nom, un @, un lien collé ou un accent à la même forme", () => {
    expect(normalizeChannelName("  @KameTo ")).toBe("kameto");
    expect(normalizeChannelName("https://www.twitch.tv/Kameto?sr=a")).toBe("kameto");
    expect(normalizeChannelName("twitch.tv/kameto/videos")).toBe("kameto");
    expect(normalizeChannelName("Zerator ")).toBe("zerator");
    expect(normalizeChannelName("Étoiles")).toBe("etoiles");
  });

  it("reconnaît des noms séparés par virgules, lignes, espaces et liens", () => {
    const [a, b, c, d] = POPULAR;
    const loginOf = (slug: string) => CREATORS.find((creator) => creator.slug === slug)!.login;
    const text = `${loginOf(a)}, @${loginOf(b)}\nhttps://twitch.tv/${loginOf(c)}; ${loginOf(d)} ${loginOf(a)}`;
    const { slugs, unknown, overflow } = resolveCircleInput(text, INDEX);
    expect(slugs).toEqual([a, b, c, d]);
    expect(unknown).toEqual([]);
    expect(overflow).toBe(0);
  });

  it("garde l'ordre, ajoute à un cercle existant et signale les inconnus", () => {
    const [a, b, c] = POPULAR;
    const loginOf = (slug: string) => CREATORS.find((creator) => creator.slug === slug)!.login;
    const { slugs, unknown } = resolveCircleInput(`${loginOf(c)}, personne_nexiste_pas_zzz`, INDEX, [a, b]);
    expect(slugs).toEqual([a, b, c]);
    expect(unknown).toEqual(["personne_nexiste_pas_zzz"]);
  });

  it("n'accepte jamais plus de quinze chaînes et compte celles qui restent dehors", () => {
    const logins = CREATORS.slice(0, 20).map((creator) => creator.login).join(",");
    const { slugs, overflow } = resolveCircleInput(logins, INDEX);
    expect(slugs).toHaveLength(CIRCLE_MAX);
    expect(overflow).toBe(5);
    expect(new Set(slugs).size).toBe(CIRCLE_MAX);
  });

  it("propose d'abord les noms qui commencent par la frappe, sans ceux déjà pris", () => {
    const target = CREATORS[0];
    const needle = target.login.slice(0, 3);
    const results = searchCreators(needle, INDEX);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(6);
    expect(results.some((creator) => creator.slug === target.slug)).toBe(true);
    const without = searchCreators(needle, INDEX, [target.slug]);
    expect(without.some((creator) => creator.slug === target.slug)).toBe(false);
    expect(searchCreators("a", INDEX)).toEqual([]);
  });

  it("accepte de 0 à 15 chaînes différentes, jamais un doublon", () => {
    expect(CIRCLE_MIN).toBe(0);
    expect(isValidCircle([])).toBe(true);
    expect(isValidCircle(POPULAR.slice(0, 1))).toBe(true);
    expect(isValidCircle(POPULAR.slice(0, CIRCLE_MAX))).toBe(true);
    expect(isValidCircle([...POPULAR.slice(0, CIRCLE_MAX), "de-trop"])).toBe(false);
    expect(isValidCircle([POPULAR[0], POPULAR[0]])).toBe(false);
  });
});

describe("le signe du cercle", () => {
  it("distingue la préférée et les autres chaînes sans inventer une rareté", () => {
    const circle = POPULAR.slice(0, 6);
    expect(circleLabel(circle, circle[0])).toBe("Préférée");
    expect(circleLabel(circle, circle[1])).toBe("Dans tes chaînes");
    expect(circleLabel(circle, "hors-cercle")).toBeNull();
    expect(circleProgress(circle, new Set([circle[1], "hors-cercle"]))).toEqual({ owned: 1, total: 6 });
  });
});

describe("le premier booster", () => {
  it("n'est tiré que dans le cercle : cinq chaînes différentes à leur rareté du catalogue", () => {
    for (let size = CIRCLE_PACK_SIZE; size <= CIRCLE_MAX; size += 1) {
      const circle = POPULAR.slice(0, size);
      const random = seeded(size * 7919);
      for (let draw = 0; draw < 300; draw += 1) {
        const pack = drawCirclePack(circle, random);
        expect(pack).toHaveLength(CIRCLE_PACK_SIZE);
        const slugs = pack.map((card) => card.creatorSlug);
        expect(new Set(slugs).size).toBe(CIRCLE_PACK_SIZE);
        for (const card of pack) {
          expect(circle).toContain(card.creatorSlug);
          expect(card.rarity).toBe(CREATORS.find(creator => creator.slug === card.creatorSlug)!.rarity);
        }
      }
    }
  });

  it("garde un cercle de cinq jouable : le booster contient alors tout le monde", () => {
    const circle = POPULAR.slice(0, 5);
    const pack = drawCirclePack(circle, seeded(1));
    expect(pack.map((card) => card.creatorSlug).sort()).toEqual([...circle].sort());
  });

  it("peut sortir la première chaîne en dernière carte, et pas seulement elle", () => {
    const circle = POPULAR.slice(0, 10);
    const random = seeded(42);
    const lasts = new Set<string>();
    for (let draw = 0; draw < 400; draw += 1) lasts.add(drawCirclePack(circle, random).at(-1)!.creatorSlug);
    expect(lasts.has(circle[0])).toBe(true);
    expect(lasts.size).toBeGreaterThan(1);
  });

  it("refuse un cercle trop court, trop long ou avec un doublon", () => {
    expect(() => drawCirclePack(POPULAR.slice(0, 4))).toThrow();
    expect(() => drawCirclePack([...POPULAR.slice(0, 4), POPULAR[0]])).toThrow();
    expect(() => drawCirclePack([...POPULAR, "de-trop"])).toThrow();
  });

  it("a des poids qui font cent, pour qu'on les lise comme des pourcentages", () => {
    const sum = (weights: Readonly<Partial<Record<string, number>>>) =>
      Object.values(weights).reduce<number>((total, weight) => total + (weight ?? 0), 0);
    expect(sum(CIRCLE_SLOT_WEIGHTS)).toBe(100);
    expect(sum(CIRCLE_LAST_SLOT_WEIGHTS)).toBe(100);
  });
});
