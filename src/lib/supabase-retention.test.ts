import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cases from "@/data/retention-cases.json";
import { advanceStreak, gameDay, PROGRESSION, streakRewardFor } from "@/lib/progression";

const sql = readFileSync("supabase/migrations/0057_retention.sql", "utf8");
describe("0057 : contrat miroir de rétention (exécution SQL dans supabase:verify)", () => {
  it.each(cases)("$name : scénario commun au moteur et au vrai Postgres", (scenario) => {
    let state = { streak: 0, streakDay: "", streakProtectionUsed: false };
    for (const offset of scenario.days) {
      const day = gameDay(Date.UTC(2026, 9, 1, 12) + offset * 86_400_000);
      state = { ...advanceStreak(state, day), streakDay: day };
    }
    expect(state.streak).toBe((scenario.streak - 1) % 7 + 1);
    expect(state.streakProtectionUsed).toBe(scenario.protected);
  });
  it("compare le barème SQL des boosters au fichier de règles et supprime les monnaies de série", () => {
    const bounds = sql.match(/p_day between (\d+) and (\d+) then (\d+) else (\d+)/)!;
    expect(bounds).not.toBeNull();
    for (let day = 0; day <= 8; day++) {
      const sqlReward = day >= Number(bounds[1]) && day <= Number(bounds[2]) ? Number(bounds[3]) : Number(bounds[4]);
      expect(streakRewardFor(day)?.packs ?? 0).toBe(sqlReward);
    }
    expect(sql).toMatch(/_streak_reward_points[\s\S]*?select 0/);
    expect(sql).toMatch(/_streak_reward_tokens[\s\S]*?select 0/);
    expect(PROGRESSION.streak.protectedMisses).toBe(1);
    expect(sql).toContain("v_day = v_previous + 2 and not v_used");
    expect(sql).toContain("if v_streak % 7 = 0 then v_used := false");
    expect(sql).toContain("d.kind = 'live'");
    expect(sql).toContain("for update;");
    expect(sql).toContain("v_packs := v_packs + v_packs_serie");
    expect(sql).toContain("revoke all on function public.last_pack_steal(bigint, integer) from public, anon, authenticated");
  });
});
