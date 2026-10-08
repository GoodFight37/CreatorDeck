/**
 * Le live de vingt secondes : ce qui doit être **vrai sans écran**.
 *
 * Les deux propriétés qui comptent : la scène ne change pas d'une ouverture à
 * l'autre pour une même journée (sinon on relance jusqu'à tomber sur un tirage
 * facile), et les bulles ne tombent ni trop tôt, ni trop tard, ni les unes sur
 * les autres — c'est ce qui rend la scène attrapable au pouce.
 */
import { describe, expect, it } from "vitest";

import LIVE from "@/data/live-game.json";
import {
  LIVE_ALERT_KINDS,
  LIVE_CHAT_HOLD_MS,
  LIVE_DURATION_MS,
  alertsPerLive,
  chatPerMinute,
  livePlan,
  resolveLive,
  tierAt,
  tierIndexFor,
  visibleAlerts,
  visibleChat,
} from "@/lib/live-game";
import { TIERS } from "@/lib/streamer";

const JOUR = "2026-10-08";

describe("le plan du live", () => {
  it("tient dans vingt secondes, et ne change pas d'une ouverture à l'autre", () => {
    expect(LIVE_DURATION_MS).toBe(20_000);
    const premier = livePlan(JOUR, 2);
    const second = livePlan(JOUR, 2);
    expect(second).toEqual(premier);
    // Un autre jour, ou un autre palier, et la scène change : c'est le même
    // tirage qui se rejoue, pas le même tirage partout.
    expect(livePlan("2026-10-09", 2)).not.toEqual(premier);
    expect(livePlan(JOUR, 3)).not.toEqual(premier);
  });

  it("remplit le cadre de messages, sans jamais dépasser la fin", () => {
    for (const palier of [0, 1, 2, 3, 4]) {
      const plan = livePlan(JOUR, palier);
      const attendus = Math.round((chatPerMinute(palier) * LIVE_DURATION_MS) / 60_000);
      expect(plan.chat.length).toBe(attendus);
      const textes = new Set(LIVE.chat.lines);
      let precedent = -1;
      for (const ligne of plan.chat) {
        expect(textes.has(ligne.text)).toBe(true);
        expect(ligne.at).toBeGreaterThanOrEqual(0);
        expect(ligne.at).toBeLessThan(LIVE_DURATION_MS);
        // Les lignes sortent dans l'ordre : un chat qui remonte le temps se voit.
        expect(ligne.at).toBeGreaterThanOrEqual(precedent);
        precedent = ligne.at;
      }
      // Deux messages d'affilée ne disent jamais la même chose.
      for (let i = 1; i < plan.chat.length; i += 1) {
        expect(plan.chat[i].text).not.toBe(plan.chat[i - 1].text);
      }
    }
  });

  it("donne un chat plus dense et plus de bulles quand la chaîne grossit", () => {
    for (let palier = 1; palier < TIERS.length; palier += 1) {
      expect(chatPerMinute(palier)).toBeGreaterThan(chatPerMinute(palier - 1));
      expect(alertsPerLive(palier)).toBeGreaterThan(alertsPerLive(palier - 1));
      expect(livePlan(JOUR, palier).chat.length).toBeGreaterThan(livePlan(JOUR, palier - 1).chat.length);
      expect(livePlan(JOUR, palier).alerts.length).toBe(alertsPerLive(palier));
    }
  });

  it("pose les bulles dans le cadre, jamais l'une sur l'autre", () => {
    const kinds = new Map(LIVE_ALERT_KINDS.map((kind) => [kind.id, kind]));
    for (const palier of [0, 2, 4]) {
      const plan = livePlan(JOUR, palier);
      let precedent = -Infinity;
      for (const bulle of plan.alerts) {
        expect(kinds.has(bulle.kindId)).toBe(true);
        // Dans le cadre, et à portée de pouce (les bords ne sont pas des cibles).
        expect(bulle.leftPercent).toBeGreaterThanOrEqual(8);
        expect(bulle.leftPercent).toBeLessThanOrEqual(70);
        expect(bulle.topPercent).toBeGreaterThanOrEqual(10);
        expect(bulle.topPercent).toBeLessThanOrEqual(68);
        // Assez d'écart pour viser : la bulle précédente n'est pas encore finie.
        expect(bulle.at).toBeGreaterThanOrEqual(precedent + LIVE.alerts.minGapMs);
        precedent = bulle.at;
        // Elle apparaît après le début, et sa vie ne dépasse jamais la fin.
        expect(bulle.at).toBeGreaterThanOrEqual(LIVE.alerts.firstAtMs);
        expect(bulle.at).toBeLessThan(LIVE_DURATION_MS - 1_000);
        expect(bulle.lifeMs).toBeGreaterThan(0);
        expect(bulle.at + bulle.lifeMs).toBeLessThanOrEqual(LIVE_DURATION_MS);
      }
      // Les identifiants sont uniques : deux bulles ne se confondent pas.
      expect(new Set(plan.alerts.map((bulle) => bulle.id)).size).toBe(plan.alerts.length);
    }
  });

  it("ne laisse une bulle attrapable que pendant sa vie", () => {
    const plan = livePlan(JOUR, 4);
    expect(plan.alerts.length).toBeGreaterThan(0);
    for (const bulle of plan.alerts) {
      expect(visibleAlerts(plan, bulle.at - 1).map((b) => b.id)).not.toContain(bulle.id);
      expect(visibleAlerts(plan, bulle.at).map((b) => b.id)).toContain(bulle.id);
      expect(visibleAlerts(plan, bulle.at + bulle.lifeMs - 1).map((b) => b.id)).toContain(bulle.id);
      expect(visibleAlerts(plan, bulle.at + bulle.lifeMs).map((b) => b.id)).not.toContain(bulle.id);
    }
    // Et à la fin, plus rien à attraper : la scène est fermée.
    expect(visibleAlerts(plan, LIVE_DURATION_MS)).toHaveLength(0);
  });

  it("n'affiche une ligne de chat que pendant qu'elle est à l'écran", () => {
    const plan = livePlan(JOUR, 1);
    const ligne = plan.chat[0];
    expect(visibleChat(plan, ligne.at)).toContainEqual(ligne);
    expect(visibleChat(plan, ligne.at + LIVE_CHAT_HOLD_MS - 1)).toContainEqual(ligne);
    expect(visibleChat(plan, ligne.at + LIVE_CHAT_HOLD_MS)).not.toContainEqual(ligne);
    expect(visibleChat(plan, -1)).toHaveLength(0);
  });
});

describe("le bilan du live", () => {
  const plan = livePlan(JOUR, 2);

  it("compte ce qui a été attrapé, et ce qui est passé", () => {
    const total = plan.alerts.length;
    const toutes = resolveLive(plan, plan.alerts.map((bulle) => bulle.id));
    expect(toutes.caught).toBe(total);
    expect(toutes.missed).toBe(0);
    expect(toutes.ratioPermille).toBe(1000);
    expect(toutes.headline).toContain(`${total} sur ${total}`);

    const aucune = resolveLive(plan, []);
    expect(aucune.caught).toBe(0);
    expect(aucune.missed).toBe(total);
    expect(aucune.headline).toContain(`0 sur ${total}`);

    const moitie = resolveLive(plan, plan.alerts.slice(0, 1).map((bulle) => bulle.id));
    expect(moitie.caught).toBe(1);
    expect(moitie.missed).toBe(total - 1);
  });

  it("ignore un identifiant qui n'existe pas, et ne compte jamais deux fois", () => {
    const [premiere] = plan.alerts;
    const bilan = resolveLive(plan, [premiere.id, premiere.id, "bulle-inventee"]);
    expect(bilan.caught).toBe(1);
  });

  it("parle du chat sans mentir", () => {
    expect(resolveLive(plan, plan.alerts.map((bulle) => bulle.id)).chatLine).toMatch(/suivi/);
    expect(resolveLive(plan, []).chatLine).toMatch(/endormi/);
    // Un palier sans bulle du tout ne fait pas honte au joueur.
    const vide = { ...plan, alerts: [] };
    expect(resolveLive(vide, []).headline).toMatch(/personne n'est passé/);
    expect(resolveLive(vide, []).ratioPermille).toBe(1000);
  });

  it("relie le palier aux abonnés, dans les deux sens", () => {
    for (let i = 0; i < TIERS.length; i += 1) {
      expect(tierIndexFor(TIERS[i].at)).toBe(i);
      expect(tierAt(i).id).toBe(TIERS[i].id);
    }
    expect(tierIndexFor(0)).toBe(0);
    expect(tierIndexFor(10 ** 9)).toBe(TIERS.length - 1);
    expect(tierAt(99).id).toBe(TIERS[TIERS.length - 1].id);
    expect(tierAt(-3).id).toBe(TIERS[0].id);
  });

  it("porte le réglage dans le fichier, et pas dans le code", () => {
    // Le texte vit dans `src/data/live-game.json` : c'est lui qu'on relit quand
    // on veut retoucher une phrase, et le module ne fait que le lire.
    expect(LIVE.durationMs).toBe(20_000);
    expect(LIVE.chat.lines.length).toBeGreaterThanOrEqual(20);
    // Une cadence et un nombre de bulles **par palier** : c'est le miroir du
    // vérificateur SQL, qui compare ces longueurs au nombre de paliers servis
    // par `_streamer_per_day()`.
    expect(LIVE.chat.perMinute).toHaveLength(TIERS.length);
    expect(LIVE.alerts.count).toHaveLength(TIERS.length);
    expect(LIVE_ALERT_KINDS.length).toBe(4);
    expect(new Set(LIVE.chat.lines).size).toBe(LIVE.chat.lines.length);
    expect(new Set(LIVE_ALERT_KINDS.map((kind) => kind.id)).size).toBe(LIVE_ALERT_KINDS.length);
    // Aucun mot d'une autre licence : les messages parlent du direct, du chat,
    // du son, de la déco — jamais d'une créature ou d'une marque.
    for (const ligne of LIVE.chat.lines) {
      expect(ligne).not.toMatch(/pok[eé]mon/i);
    }
  });
});
