import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  deservesSpotlight,
  EPIC_SILENCE_MS,
  isFinalSlot,
  isPerfect,
  PERFECT_HAPTIC,
  PACK_TEAR_HAPTIC,
  PACK_TEAR_MS,
  PERFECT_LOCK_MS,
  RESIST_SHAKE_MS,
  resistCount,
  resistHaptic,
  revealHaptic,
  silenceBefore,
  TEAR_HAPTIC,
  tearDurationMs,
} from "@/lib/reveal";

/**
 * La mise en scène de la révélation : le silence, le refus, le verrou. Ce sont
 * des nombres et des règles — donc ils se testent, et c'est tant mieux : une
 * animation qui déraille ne se voit qu'à l'écran, une règle qui déraille se voit
 * ici.
 */
describe("la révélation", () => {
  it("ne reconnaît que le dernier emplacement comme le slot garanti", () => {
    expect(isFinalSlot(4, 5)).toBe(true);
    expect(isFinalSlot(0, 5)).toBe(false);
    expect(isFinalSlot(4, 0)).toBe(false);
  });

  it("fait résister la dernière carte, et deux fois si elle est Épique ou mieux", () => {
    // Les quatre premières ne résistent pas : le rythme avant le dernier slot.
    expect(resistCount(0, 5, "common")).toBe(0);
    expect(resistCount(2, 5, "legendary")).toBe(0);
    // La dernière résiste toujours une fois — c'est le moment qu'on a annoncé.
    expect(resistCount(4, 5, "common")).toBe(1);
    expect(resistCount(4, 5, "rare")).toBe(1);
    // …et deux fois quand la carte vaut le coup.
    expect(resistCount(4, 5, "epic")).toBe(2);
    expect(resistCount(4, 5, "legendary")).toBe(2);
    // Un paquet d'une seule carte : elle est le dernier slot.
    expect(resistCount(0, 1, "legendary")).toBe(2);
  });

  it("ne fait de silence que devant une Épique ou une Légendaire", () => {
    expect(silenceBefore("common")).toBe(0);
    expect(silenceBefore("uncommon")).toBe(0);
    expect(silenceBefore("rare")).toBe(0);
    expect(silenceBefore("epic")).toBe(EPIC_SILENCE_MS);
    expect(silenceBefore("legendary")).toBe(EPIC_SILENCE_MS);
    expect(EPIC_SILENCE_MS).toBe(520);
  });

  it("vibre de plus en plus fort avec la rareté", () => {
    const patternLength = (rarity: Parameters<typeof revealHaptic>[0]) =>
      revealHaptic(rarity).reduce((total, value) => total + value, 0);
    expect(patternLength("common")).toBeLessThan(patternLength("rare"));
    expect(patternLength("rare")).toBeLessThan(patternLength("epic"));
    expect(patternLength("epic")).toBeLessThan(patternLength("legendary"));
    // Le Perfect est le plus long de tous, et de loin.
    const perfectLength = PERFECT_HAPTIC.reduce((total, value) => total + value, 0);
    expect(perfectLength).toBeGreaterThan(patternLength("legendary"));
  });

  it("ajoute une pulsation pour une variante spéciale", () => {
    // La matière (Gold, Live) se sent, elle aussi : c'est la rareté **et** la
    // variante qui décident du motif.
    expect(revealHaptic("rare", "gold").length).toBeGreaterThan(revealHaptic("rare").length);
    expect(revealHaptic("rare", "standard")).toEqual(revealHaptic("rare"));
  });

  it("garde le refus court et discret", () => {
    const total = resistHaptic().reduce((sum, value) => sum + value, 0);
    expect(total).toBeLessThan(RESIST_SHAKE_MS);
    expect(resistHaptic().length).toBeGreaterThan(1);
  });

  it("reconnaît le Perfect au tirage, pas aux cartes reçues", () => {
    // La règle du jeu : `rareDrop` est décidé par le tirage. Un paquet de cinq
    // Légendaires tirés un par un n'est **pas** un Perfect.
    expect(isPerfect([{ rareDrop: true }, { rareDrop: false }])).toBe(true);
    expect(isPerfect([{ rareDrop: false }])).toBe(false);
    expect(isPerfect([])).toBe(false);
  });

  it("réserve le plein écran au Légendaire et au Perfect", () => {
    expect(deservesSpotlight("legendary", false)).toBe(true);
    expect(deservesSpotlight("epic", true)).toBe(true);
    expect(deservesSpotlight("epic", false)).toBe(false);
    expect(deservesSpotlight("common", false)).toBe(false);
    // Le verrou du Perfect laisse le temps de lire cinq cartes : deux secondes
    // et demie, le temps que l'œil fasse le tour des cinq.
    expect(PERFECT_LOCK_MS).toBe(2_600);
  });

  it("donne une vraie durée à la déchirure, et zéro quand les effets sont coupés", () => {
    // Le moment entre le geste et la première carte : sans lui, le paquet
    // n'existe pas, il n'y a rien à ouvrir.
    expect(tearDurationMs(true)).toBe(PACK_TEAR_MS);
    expect(PACK_TEAR_MS).toBeGreaterThanOrEqual(600);
    expect(PACK_TEAR_MS).toBeLessThanOrEqual(900);
    // Le réglage de secours ne doit pas seulement éteindre des pixels : il
    // raccourcit l'attente aussi, sinon on fait poireauter quelqu'un qui a dit
    // non pour le regarder attendre.
    expect(tearDurationMs(false)).toBe(0);
  });

  it("donne à chaque rareté une entrée différente, et aucune ne boucle", () => {
    // La mise en scène est dans la feuille de style : ce test est la soudure
    // entre le module et le CSS. Deux promesses à tenir — une Commune et une
    // Légendaire n'entrent **pas** pareil, et rien ne tourne en boucle (un
    // objet qui brille pour toujours fatigue plus qu'il ne récompense).
    const css = readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

    const entrees = [
      // Le retournement : la face tourne, le dos est derrière elle.
      "reveal-flip",
      "card-reveal-punch",
      "card-reveal-epic",
      "card-reveal-legendary",
      "reveal-refuse-hard",
      "reveal-refuse-glow",
      "pack-tear-scene",
      "pack-tear-pack",
      "pack-tear-seam",
      "pack-tear-grain",
      "pack-tear-legende",
    ];
    for (const nom of entrees) {
      expect(css, `@keyframes ${nom} manquant`).toContain(`@keyframes ${nom}`);
      // Les déclarations qui l'emploient (raccourci `animation:` ou
      // `animation-name:`), y compris celles qui s'étendent sur plusieurs
      // lignes — c'est le cas du refus, qui cumule le mouvement et le halo.
      const usage =
        css.match(new RegExp(`animation[^;}]*\\b${nom}\\b[^;}]*`, "g")) ?? [];
      expect(usage.length, `${nom} n'est branché sur rien`).toBeGreaterThan(0);
      for (const ligne of usage) {
        // Une animation bornée : elle joue, elle s'arrête, elle ne repart pas.
        expect(ligne, `${nom} boucle : ${ligne.trim()}`).not.toContain("infinite");
        // Le raccourci `animation:` porte la durée **et** l'état final : sans
        // `both`, la carte reviendrait à sa position de départ entre deux
        // étapes. Un simple `animation-name:` l'hérite de la règle de base.
        if (ligne.trimStart().startsWith("animation:")) {
          expect(ligne, `${nom} ne garde pas son état final : ${ligne.trim()}`).toMatch(
            /both|forwards/,
          );
        }
      }
    }

    // Les raretés sont câblées sur le conteneur (c'est lui qui porte
    // l'animation) ; l'écran écrit la classe sur les deux.
    expect(css).toContain(".reveal-flip.rarity-epic");
    expect(css).toContain(".reveal-flip.rarity-legendary");
    // Et le réglage de secours les remet à l'entrée commune.
    expect(css).toContain('[data-card-fx="off"] .reveal-flip.rarity-epic');
  });

  it("retourne une carte qui avait un dos", () => {
    // Ce qui manquait : une carte qui tournait montrait sa face dès la première
    // image — elle pivotait, elle ne se retournait pas. Il faut **deux** faces,
    // chacune invisible de l'autre côté, et un conteneur qui pivote.
    const css = readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

    // Le conteneur est en 3D, la carte et le dos se cachent l'un l'autre.
    expect(css).toContain(".reveal-flip-face {");
    expect(css).toContain("transform-style: preserve-3d");
    expect(css).toMatch(
      /\.reveal-flip-face > \.reveal-card,\s*\.reveal-flip-face > \.reveal-dos \{ backface-visibility: hidden; \}/,
    );
    expect(css).toMatch(/\.reveal-dos\b[^}]*backface-visibility: hidden/);
    // Le dos est tourné : c'est lui qu'on voit au départ.
    expect(css).toMatch(/\.reveal-dos\s*\{[^}]*rotateY\(180deg\)/);
    // Et le conteneur part de l'autre côté : sans ça, la face serait visible
    // d'emblée et le dos ne servirait à rien.
    const cle = /@keyframes reveal-flip \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
    expect(cle, "@keyframes reveal-flip absent").not.toBe("");
    const depart = Number(/0% \{ transform: rotateY\((-?\d+)deg/.exec(cle)?.[1] ?? "0");
    expect(Math.abs(depart), "le retournement ne part pas du dos").toBeGreaterThan(90);
    expect(/100% \{ transform: none/.test(cle), "la carte ne se pose pas face").toBe(true);
  });

  it("évite les aplats blancs carrés pendant l'ouverture et les cartes rares", () => {
    const css = readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");
    const eclair = /\\.fx-flash\\s*\\{([^}]+)\\}/.exec(css)?.[1] ?? "";
    const halo = /\\.booster-foil-glow\\s*\\{([^}]+)\\}/.exec(css)?.[1] ?? "";
    expect(eclair, "la révélation rare ne doit pas être un panneau blanc").toContain("radial-gradient");
    expect(eclair).not.toMatch(/background:\\s*#fff\\s*;/);
    expect(halo, "l'ouverture doit éclairer sans carré opaque").toContain("radial-gradient");
    expect(css).toContain(".booster-foil-top-crimp");
    expect(css).toContain(".booster-foil-bottom-seal");
  });

  it("fait vibrer la déchirure plus longtemps que le geste qui arme", () => {
    // Le geste (`TEAR_HAPTIC`) se passe sous le doigt : une pulsation. La
    // déchirure, elle, vient après — elle peut se permettre trois temps.
    const somme = PACK_TEAR_HAPTIC.reduce((total, value) => total + value, 0);
    expect(PACK_TEAR_HAPTIC.length).toBeGreaterThan(1);
    expect(somme).toBeGreaterThan(TEAR_HAPTIC.reduce((total, value) => total + value, 0));
  });
});
