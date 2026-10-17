import { expect, test, gotoDeck, cloudUrl } from "./fixtures";
import type { Page } from "@playwright/test";
import source from "../src/data/memes-fr.json";

async function fakeAccount(page: Page) {
  const userId = "11111111-1111-4111-8111-111111111111";
  const ids = [
    ...source.filter((card) => card.rarity === "common" && card.image).slice(0, 3).map((card) => card.id),
    source.find((card) => card.rarity === "epic" && card.image)!.id,
    source.find((card) => card.rarity === "rare" && card.image)!.id,
  ];
  const calls: string[] = [];
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = route.request().url().split("/rpc/")[1];
    calls.push(name);
    const answer = (value: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(value) });
    if (name === "onboarding_status") return answer({ tutorial_completed: true, gift_available: false, gift_claimed: true, gift_remaining: 0 });
    if (name === "pack_status") return answer({ packs: 4, last_regen_at: new Date().toISOString(), openings: 0, pity: 0, streak: 0 });
    if (name === "wallet_get") return answer({ ok: true, points: 0 });
    if (name === "tokens_get") return answer({ ok: true, tokens: 0 });
    if (name === "meme_status") {
      const drawn = calls.includes("open_meme_pack");
      return answer({ stock: drawn ? 3 : 4, next_at: null, openings: drawn ? 1 : 0, owned: drawn ? ids.map((id) => ({ id, copies: 1 })) : [] });
    }
    if (name === "open_meme_pack") return answer({ cards: ids, stock: 3, next_at: null, replayed: false });
    return answer({});
  });
  await page.addInitScript((owner) => {
    localStorage.setItem("creatordeck.cloud.session", JSON.stringify({ accessToken: "fake-token", refreshToken: "fake-refresh", expiresAt: Date.now() + 3_600_000, userId: owner, email: "test@example.invalid" }));
    localStorage.setItem("creatordeck-tutorial:" + owner, "done");
    localStorage.setItem("creatordeck-tutorial:local", "done");
    localStorage.setItem("creatordeck-tutorial:completed:" + owner, "done");
  }, userId);
  return calls;
}

test("les pills changent de booster sans préparer ni consommer", async ({ page }) => {
  const calls = cloudUrl() ? await fakeAccount(page) : [];
  if (cloudUrl()) await page.goto("/"); else await gotoDeck(page);
  const carousel = page.locator(".booster-carousel");
  await expect(carousel).toHaveAttribute("data-universe", "live");
  await page.getByRole("button", { name: "MEMES", exact: true }).click();
  await expect(carousel).toHaveAttribute("data-universe", "memes");
  await expect(page.locator(".opening-continuum")).toHaveCount(0);
  await page.getByRole("button", { name: "Live Drop", exact: true }).click();
  await expect(carousel).toHaveAttribute("data-universe", "live");
  await expect(page.locator(".opening-continuum")).toHaveCount(0);
  expect(calls.some((name) => name.startsWith("open_"))).toBe(false);
});

test("la pill choisie reste distinguable en couleurs forcées", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  if (cloudUrl()) { await fakeAccount(page); await page.goto("/"); } else await gotoDeck(page);
  const memes = page.getByRole("button", { name: "MEMES", exact: true });
  await memes.click();
  await page.locator(".pack-copy h2").focus();
  await expect(memes).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => memes.evaluate((button) => {
    const style = getComputedStyle(button);
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`;
  })).toBe("solid 2px 2px");
});


test("le défilement tactile vertical garde le choix et ne lance aucune ouverture", async ({ page, context }) => {
  const calls = cloudUrl() ? await fakeAccount(page) : [];
  if (cloudUrl()) await page.goto("/"); else await gotoDeck(page);
  const stage = page.locator(".booster-carousel");
  const box = (await stage.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2, y = box.y + box.height * .65;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove", touchPoints: [{ x, y: y - i * 15 }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(stage).toHaveAttribute("data-universe", "live");
  await expect(page.locator(".opening-continuum")).toHaveCount(0);
  expect(calls.some((name) => name.startsWith("open_"))).toBe(false);
});

test("avec le serveur : Retour et Échap quittent la préparation Live sans requête de tirage", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
  const calls = await fakeAccount(page);
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Préparer le booster Live Drop" });
  await trigger.click();
  const scene = page.locator(".opening-continuum");
  await expect(scene).toHaveAttribute("data-opening-phase", "sealed");
  await expect(scene.getByRole("button", { name: "← Retour", exact: true })).toBeVisible();
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `test-results/booster-preparation-live-${test.info().project.name}.png` });
  await scene.getByRole("button", { name: "← Retour", exact: true }).click();
  await expect(scene).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click(); await page.keyboard.press("Escape");
  await expect(scene).toHaveCount(0);
  expect(calls.some((name) => name.startsWith("open_"))).toBe(false);
  await expect(page.locator(".stock-row strong").first()).toContainText("4");
});

test("avec le serveur : Mèmes se prépare sans consommation, puis un seul geste ouvre cinq cartes et retrouve sa réserve", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
  const calls = await fakeAccount(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "MEMES", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Préparer le booster MEMES" });
  await expect(page.getByText("Ta réserve MEMES · 4/4")).toBeVisible();
  await trigger.click();
  const scene = page.locator(".opening-continuum");
  await expect(scene.locator(".foil-printed-art").first()).toHaveAttribute("src", /memes-opening/);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `test-results/booster-preparation-memes-${test.info().project.name}.png` });
  await scene.getByRole("button", { name: "← Retour", exact: true }).click();
  expect(calls.filter((name) => name === "open_meme_pack")).toHaveLength(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await scene.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  await expect(scene.getByRole("button", { name: "← Retour", exact: true })).toHaveCount(0);
  await expect(scene.locator(".meme-reveal-flow")).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await expect(scene.locator(".meme-reveal-counter")).toHaveText(`CARTE ${i + 1} / 5`);
    await expect(scene.locator(".meme-reveal-next")).toBeEnabled();
    await scene.locator(".meme-reveal-next").click();
  }
  await expect(scene.locator(".meme-reveal-summary-grid > div")).toHaveCount(5);
  await expect(scene.locator(".meme-reveal-next")).toBeEnabled();
  await scene.locator(".meme-reveal-next").click();
  await expect(scene).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator(".booster-carousel")).toHaveAttribute("data-universe", "memes");
  await expect(page.getByText("Ta réserve Mèmes · 3/4")).toBeVisible();
  expect(calls.filter((name) => name === "open_meme_pack")).toHaveLength(1);
  expect(calls.filter((name) => name === "open_pack")).toHaveLength(0);
  await page.getByRole("link", { name: "Voir le classeur Mèmes" }).click();
  await expect(page.locator(".meme-collection-head strong")).toHaveText("5 / 2150");
  expect(errors).toEqual([]);
});

test("le booster choisi domine et les commandes restent lisibles à 320, 390 et 1024 pixels", async ({ page }) => {
  if (cloudUrl()) { await fakeAccount(page); await page.goto("/"); } else await gotoDeck(page);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    for (const universe of ["Live Drop", "MEMES"]) {
      await page.getByRole("button", { name: universe, exact: true }).click();
      await page.locator(".booster-carousel").evaluate(async (node) => {
        await Promise.all(node.getAnimations({ subtree: true })
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished));
      });
      const active = page.locator('.booster-pack-slot[data-active="true"]');
      const neighbor = page.locator('.booster-pack-slot[data-active="false"] .booster-neighbor');
      const a = (await active.boundingBox())!, n = (await neighbor.boundingBox())!;
      expect(a.width).toBeGreaterThan(100);
      expect(a.width).toBeGreaterThan(n.width);
      await expect(neighbor).toHaveAttribute("aria-hidden", "true");
      await expect(neighbor.locator("button")).toHaveCount(0);
      const neighborOpacity = Number(await neighbor.evaluate((node) => getComputedStyle(node.parentElement!).opacity));
      expect(neighborOpacity).toBeLessThan(.3);
      await expect(page.locator(".booster-selection-hint")).toHaveCount(0);
      expect(Math.abs(a.x + a.width / 2 - width / 2)).toBeLessThan(3);
      const action = page.locator('.booster-panel:not([hidden]) .primary-action');
      const actionBox = (await action.boundingBox())!;
      const navBox = (await page.locator(".bottom-nav").boundingBox());
      if (navBox) expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(navBox.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/booster-selector-${width}-${universe}-${test.info().project.name}.png` });
    }
  }
});

test("le mode mouvement réduit termine aussi une ouverture Live après préparation", async ({ page }) => {
  test.skip(Boolean(cloudUrl()), "Le tirage local sert à contrôler le cas sans animation.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoDeck(page);
  await page.getByRole("button", { name: "Ouvrir le booster", exact: true }).click();
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).toBeVisible();
});
