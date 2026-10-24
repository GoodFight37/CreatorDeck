import { expect, test, gotoDeck, cloudUrl } from "./fixtures";
import creators from "../src/data/creators.json";

for (const withLive of [true, false]) test(`le booster parfait laisse voir ses cinq portraits ${withLive ? "avec le direct" : "avec le prochain sachet"}`, async ({ page }, testInfo) => {
  test.skip(Boolean(cloudUrl()), "Tirage local déterministe, sans compte ni RPC.");
  await page.addInitScript(({ creators, withLive }) => {
    const original = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto, "getRandomValues", { configurable: true, value: (array: ArrayBufferView) => {
      if (array instanceof Uint32Array) return array.fill(0);
      return original(array);
    } });
    localStorage.setItem("creatordeck.live.v1", JSON.stringify({ refreshedAt: Date.now() - 60_000, streams: (withLive ? creators : []).map(c => ({
      login: c.login, display_name: c.displayName, viewers: 1854, game_name: "Just Chatting",
    })) }));
  }, { creators, withLive });
  await gotoDeck(page, true, { withoutCircle: true });
  await page.getByRole("button", { name: "Ouvrir le booster", exact: true }).click();
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  const reveal = page.locator(".reveal-game");
  await expect(reveal.locator(".reveal-perfect-grid .reveal-card")).toHaveCount(5);
  await expect(reveal.locator(".reveal-next")).toBeEnabled();
  await expect(reveal.locator(".card-broadcast")).toHaveCount(0);
  await expect(reveal.locator(".perfect-card-caption strong")).toHaveCount(0);
  await expect(reveal.locator(".card-on-air")).toHaveCount(withLive ? 5 : 0);
  await expect(reveal.locator(".perfect-card-new")).toHaveCount(5);
  for (const mode of ["normal", "reduce", "off"] as const) {
    const reducedMotion = mode === "reduce" ? "reduce" : "no-preference";
    await page.emulateMedia({ reducedMotion });
    await page.evaluate(mode => document.documentElement.dataset.cardFx = mode === "off" ? "off" : "on", mode);
    for (const [width, height] of [[320, 568], [412, 915], [915, 412], [1280, 720]]) {
      await page.setViewportSize({ width, height });
      await reveal.locator(".reveal-perfect-grid").evaluate(async grid => {
        await Promise.all(grid.getAnimations({ subtree: true })
          .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map(animation => animation.finished.catch(() => {})));
      });
      const bounds = await reveal.evaluate(root => {
        const box = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
        const nextPack = root.querySelector(".reveal-next-pack");
        return { banner: box(root.querySelector(".perfect-banner")!), action: box(root.querySelector(".reveal-next")!), nextPack: nextPack ? box(nextPack) : null, cards: [...root.querySelectorAll(".reveal-perfect-grid > .reveal-flip")].map(box) };
      });
      for (const card of bounds.cards) {
        expect(card.x).toBeGreaterThanOrEqual(0);
        expect(card.right).toBeLessThanOrEqual(width);
        expect(card.y).toBeGreaterThan(bounds.banner.bottom);
        expect(card.bottom).toBeLessThan(bounds.action.y);
        if (bounds.nextPack) expect(card.bottom).toBeLessThan(bounds.nextPack.y);
      }
      expect(bounds.action.bottom).toBeLessThanOrEqual(height);
      expect(await reveal.locator(".reveal-next").evaluate(n => n.scrollWidth <= n.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`perfect-${width}-${height}-${mode}.png`) });
    }
  }
  await reveal.locator(".reveal-next").click();
  if (withLive) {
    await expect(reveal.locator(".pack-end-live")).toBeVisible();
    await expect(reveal.locator(".pack-end-watch")).toHaveAttribute("href", /^https:\/\/www.twitch.tv\//);
    await expect(reveal.locator(".reveal-next")).toBeEnabled();
    await reveal.locator(".reveal-next").click();
  }
  await expect(page.locator(".opening-continuum")).toHaveCount(0);
});
