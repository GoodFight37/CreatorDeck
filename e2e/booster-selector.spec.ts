import { expect, test, gotoDeck, cloudUrl } from "./fixtures";
import type { Page } from "@playwright/test";
import source from "../src/data/memes-fr.json";
import imgflipSource from "../src/data/imgflip.json";

const imgflipIds = imgflipSource.filter((card) => card.image).slice(0, 5).map((card) => card.id);

/** La collection MEMES compte les deux catalogues affichés (FR + Imgflip). */
const MEME_COLLECTION_TOTAL = source.length + imgflipSource.length;

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
    if (name === "imgflip_status") {
      const drawn = calls.includes("open_imgflip_pack");
      return answer({ stock: drawn ? 3 : 4, next_at: null, openings: drawn ? 1 : 0, owned: drawn ? imgflipIds.map((id) => ({ id, copies: 1 })) : [] });
    }
    if (name === "open_imgflip_pack") return answer({ cards: imgflipIds, stock: 3, next_at: null, replayed: false });
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

test("le choix d'univers change de booster sans préparer ni consommer", async ({ page }) => {
  const calls = cloudUrl() ? await fakeAccount(page) : [];
  if (cloudUrl()) await page.goto("/"); else await gotoDeck(page, true, { withoutCircle: true });
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

test("Anime ouvre cinq cartes dans le Drop et les conserve dans son classeur local", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await gotoDeck(page, true, { withoutCircle: true });
  await page.getByRole("button", { name: "ANIME", exact: true }).click();
  const carousel = page.locator(".booster-carousel");
  await expect(carousel).toHaveAttribute("data-universe", "anime");
  await carousel.evaluate(async (node) => {
    await Promise.all(node.getAnimations({ subtree: true })
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished));
  });

  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `reports/manga-drop/${test.info().project.name}-drop.png` });

  await page.getByRole("button", { name: "Ouvrir le booster Anime", exact: true }).click();
  const scene = page.locator('.opening-continuum[data-universe="anime"]');
  await expect(scene).toBeVisible();
  await expect.poll(() => scene.evaluate((node) => {
    const style = getComputedStyle(node);
    return [style.getPropertyValue("--back-ink").trim(), style.getPropertyValue("--pack-accent").trim()];
  })).toEqual(["#fcf4ff", "#b49bff"]);
  await expect(scene.locator(".foil-printed-art").first()).toHaveAttribute("src", /anime-opening/);
  await expect.poll(() => scene.locator(".foil-printed-art").first().evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual([1050, 1540]);
  const tear = scene.getByRole("button", { name: "Déchirer le haut du sachet en passant le doigt sur la soudure" });
  await expect.poll(() => tear.evaluate((node: HTMLElement) => Number.parseFloat(getComputedStyle(node).top) / (node.offsetParent as HTMLElement).clientHeight)).toBeCloseTo(.0624, 2);
  await page.screenshot({ path: `reports/manga-drop/${test.info().project.name}-sealed.png` });
  const weld = (await tear.boundingBox())!;
  const y = weld.y + weld.height / 2;
  await page.mouse.move(weld.x + weld.width * .05, y);
  await page.mouse.down();
  await page.mouse.move(weld.x + weld.width * .95, y - 35, { steps: 18 });
  await page.screenshot({ path: `reports/manga-drop/${test.info().project.name}-tearing.png` });
  await page.mouse.up();
  await expect(page.getByRole("region", { name: "Résultat du booster Anime" })).toBeVisible({ timeout: 10_000 });

  for (let index = 0; index < 5; index++) {
    const label = index === 4 ? "VOIR LES 5 CARTES" : "CARTE SUIVANTE";
    const next = scene.getByRole("button", { name: label });
    await expect(next).toBeEnabled({ timeout: 4_000 });
    await next.click();
  }
  await expect(scene.getByRole("heading", { name: "Collection Anime" })).toBeVisible();
  const close = scene.getByRole("button", { name: "Revenir au Drop" });
  await expect(close).toBeEnabled({ timeout: 4_000 });
  await close.click();
  await expect(scene).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ouvrir le booster Anime", exact: true })).toBeFocused();

  await page.getByRole("link", { name: /Voir le classeur Anime/ }).click();
  await expect(page.locator(".anime-deck-intro strong")).toHaveText("5 / 20");
  expect(errors).toEqual([]);
});

test("Anime garde les couleurs imprimées sans voile arc-en-ciel", async ({ page }) => {
  await gotoDeck(page, true, { withoutCircle: true });
  await page.getByRole("button", { name: "ANIME", exact: true }).click();
  await expect(page.locator(".booster-carousel")).not.toHaveClass(/is-switching/);
  await page.addStyleTag({ content: ".pack-idle { animation: none !important; } .pack-3d-object { transform: none !important; } .pack-glint { display: none !important; } nextjs-portal { display: none !important; }" });
  const front = page.locator('[data-booster="anime"] .pack-3d-front');
  const rendered = await front.screenshot({ path: `reports/booster-couleurs-appui/${test.info().project.name}-couleurs.png` });
  await page.addStyleTag({ content: '[data-booster="anime"] .pack-holo { display: none !important; }' });
  const printed = await front.screenshot({ path: `reports/booster-couleurs-appui/${test.info().project.name}-sans-voile.png` });
  expect(rendered.equals(printed)).toBe(true);
});

for (const settled of [true, false]) {
  test(`le premier appui tactile après un swipe ouvre chaque booster ${settled ? "après" : "pendant"} la transition`, async ({ page, context }) => {
    test.skip(!cloudUrl(), "La préparation MEMES et Imgflip nécessite le compte simulé.");
    const calls = await fakeAccount(page);
    await page.goto("/");
    const stage = page.locator(".booster-carousel");
    const cdp = await context.newCDPSession(page);
    for (const [dx, expected] of [[-150, "memes"], [-150, "imgflip"], [-150, "anime"], [150, "imgflip"], [150, "memes"], [150, "live"]] as const) {
      const box = (await stage.boundingBox())!;
      const x = box.x + box.width / 2, y = box.y + box.height * .4;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx * i / 8, y }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(stage).toHaveAttribute("data-universe", expected);
      await expect(page.locator(".opening-continuum")).toHaveCount(0);
      if (settled) await expect(stage).not.toHaveClass(/is-switching/);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      const scene = page.locator(".opening-continuum");
      await expect(scene).toBeVisible({ timeout: 2_000 });
      await expect(scene).toHaveAttribute("data-universe", expected);
      await scene.getByRole("button", { name: "← Retour", exact: true }).click();
      await expect(scene).toHaveCount(0);
    }
    expect(calls.some((name) => name.startsWith("open_"))).toBe(false);
  });
}

test("la pill choisie reste distinguable en couleurs forcées", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  if (cloudUrl()) { await fakeAccount(page); await page.goto("/"); } else await gotoDeck(page, true, { withoutCircle: true });
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

test("un geste horizontal passe du Live à MEMES et revient, sans rien ouvrir", async ({ page }) => {
  const calls = cloudUrl() ? await fakeAccount(page) : [];
  if (cloudUrl()) await page.goto("/"); else await gotoDeck(page);
  const stage = page.locator(".booster-carousel");
  await expect(stage).toHaveAttribute("data-universe", "live");
  const box = (await stage.boundingBox())!;
  const y = box.y + box.height * .5;
  for (const [from, to, expected] of [[.8, .2, "memes"], [.2, .8, "live"]] as const) {
    await page.mouse.move(box.x + box.width * from, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * to, y, { steps: 6 });
    await page.mouse.up();
    await expect(stage).toHaveAttribute("data-universe", expected);
  }
  await expect(page.locator(".opening-continuum")).toHaveCount(0);
  expect(calls.some((name) => name.startsWith("open_"))).toBe(false);
});

// Régression : au doigt, un glissement démarré SUR le sachet était annulé dès le premier pixel
// (la capture implicite du bouton se perdait et son événement remontait au carrousel).
// La souris n'a pas cette capture, d'où des tests verts alors que le téléphone échouait.
test("un vrai glissement tactile démarré sur le sachet change de booster, dans les deux sens", async ({ page, context }) => {
  if (cloudUrl()) await page.goto("/"); else await gotoDeck(page);
  const stage = page.locator(".booster-carousel");
  const cdp = await context.newCDPSession(page);
  const box = (await stage.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height * .5;
  for (const [dx, dy, expected] of [[-150, 0, "memes"], [150, 32, "live"], [-90, 8, "memes"]] as const) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(stage).toHaveAttribute("data-universe", expected);
    await expect(page.locator(".opening-continuum")).toHaveCount(0);
  }
});

test("avec le serveur : Retour et Échap quittent la préparation Live sans requête de tirage", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
  const calls = await fakeAccount(page);
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Ouvrir le booster", exact: true });
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
  await expect(page.locator(".open-panel .stock-row")).toContainText(/^4 /);
});

test("avec le serveur : MEMES se prépare sans consommation, puis un seul geste ouvre cinq cartes et retrouve sa réserve", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
  const calls = await fakeAccount(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "MEMES", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Ouvrir le booster MEMES", exact: true });
  await expect(page.locator(".meme-booster-reserve")).toContainText("4 MEMES");
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
  await expect(page.locator(".meme-booster-reserve")).toContainText("3 MEMES");
  expect(calls.filter((name) => name === "open_meme_pack")).toHaveLength(1);
  expect(calls.filter((name) => name === "open_pack")).toHaveLength(0);
  await page.getByRole("link", { name: "Voir le classeur MEMES" }).click();
  await expect(page.locator(".meme-collection-head strong")).toHaveText(`5 / ${MEME_COLLECTION_TOTAL}`);
  expect(errors).toEqual([]);
});

for (const label of ["MEMES", "IMGFLIP"]) {
  test(`avec le serveur : la carte révélée ${label} garde la taille et le dos des cartes sorties du sachet`, async ({ page }) => {
    test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
    await fakeAccount(page);
    await page.goto("/");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("button", { name: `Ouvrir le booster ${label}`, exact: true }).click();
    const scene = page.locator(".opening-continuum");
    // Capturer le dos dès son insertion : une capture PNG peut dépasser ses 148 ms.
    const revealedBack = scene.evaluate((node) => new Promise<{ width: number; surface: string; emblem: boolean }>((resolve) => {
      const observer = new MutationObserver(() => {
        const el = node.querySelector<HTMLElement>(".meme-reveal-back");
        if (!el) return;
        observer.disconnect();
        resolve({ width: el.offsetWidth, surface: getComputedStyle(el).backgroundImage,
          emblem: Boolean(el.querySelector(".foil-back-emblem svg")) });
      });
      observer.observe(node, { childList: true, subtree: true });
    }));
    await scene.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
    const back = (selector: string) => scene.locator(selector).first().evaluate((el) => ({
      // Largeur de mise en page : les animations appliquent des scale qui fausseraient le rectangle affiché.
      width: (el as HTMLElement).offsetWidth, surface: getComputedStyle(el).backgroundImage,
    }));
    const pouch = await back(".foil-back-card");
    await page.screenshot({ path: `test-results/dos-${label}-sortie-${test.info().project.name}.png` });
    const reveal = await revealedBack;
    await page.screenshot({ path: `test-results/dos-${label}-revelation-${test.info().project.name}.png` });
    expect(reveal!.emblem).toBe(true);
    expect(reveal!.surface).toBe(pouch.surface);
    expect(Math.abs(reveal!.width - pouch.width)).toBeLessThanOrEqual(2);
  });
}

test("avec le serveur : Imgflip se prépare sans consommation, puis un seul geste ouvre cinq cartes serveur", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
  const calls = await fakeAccount(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "IMGFLIP", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Ouvrir le booster IMGFLIP", exact: true });
  await expect(page.locator(".imgflip-booster-reserve")).toContainText("4 IMGFLIP");
  await trigger.click();
  const scene = page.locator(".opening-continuum");
  await expect(scene.locator(".foil-printed-art").first()).toHaveAttribute("src", /imgflip-opening/);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `test-results/booster-preparation-imgflip-${test.info().project.name}.png` });
  await scene.getByRole("button", { name: "← Retour", exact: true }).click();
  expect(calls.filter((name) => name === "open_imgflip_pack")).toHaveLength(0);
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
  await expect(page.locator(".booster-carousel")).toHaveAttribute("data-universe", "imgflip");
  await expect(page.locator(".imgflip-booster-reserve")).toContainText("3 IMGFLIP");
  expect(calls.filter((name) => name === "open_imgflip_pack")).toHaveLength(1);
  expect(calls.filter((name) => name === "open_meme_pack")).toHaveLength(0);
  expect(calls.filter((name) => name === "open_pack")).toHaveLength(0);
  // Les cinq cartes tirées sont des possessions persistantes du classeur MEMES.
  await page.goto("/memes");
  await expect(page.locator(".meme-collection-head strong")).toHaveText(`5 / ${MEME_COLLECTION_TOTAL}`);
  expect(errors).toEqual([]);
});

test("le booster choisi domine et les commandes restent lisibles à 320, 390 et 1024 pixels", async ({ page }) => {
  if (cloudUrl()) { await fakeAccount(page); await page.goto("/"); } else await gotoDeck(page, true, { withoutCircle: true });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    for (const universe of ["Live Drop", "MEMES", "ANIME"]) {
      await page.getByRole("button", { name: universe, exact: true }).click();
      await page.locator(".booster-carousel").evaluate(async (node) => {
        await Promise.all(node.getAnimations({ subtree: true })
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished));
      });
      const active = page.locator('.booster-pack-slot[data-active="true"]');
      const neighbors = page.locator('.booster-pack-slot[data-active="false"] .booster-neighbor');
      // Quatre univers : les trois sachets non choisis restent en retrait.
      await expect(neighbors).toHaveCount(3);
      const a = (await active.boundingBox())!;
      expect(a.width).toBeGreaterThan(100);
      for (const neighbor of await neighbors.all()) {
        const n = (await neighbor.boundingBox())!;
        expect(a.width).toBeGreaterThan(n.width);
        await expect(neighbor).toHaveAttribute("aria-hidden", "true");
        await expect(neighbor.locator("button")).toHaveCount(0);
        const neighborOpacity = Number(await neighbor.evaluate((node) => getComputedStyle(node.parentElement!).opacity));
        // Les voisins restent opaques (pas de translucidité pendant la bascule) ; ils sont en retrait par leur position 3D.
        expect(neighborOpacity).toBe(1);
      }
      await expect(page.locator(".booster-selection-hint")).toHaveCount(0);
      expect(Math.abs(a.x + a.width / 2 - width / 2)).toBeLessThan(3);
      // Le paquet de devant EST le bouton : plus de pilule séparée.
      await expect(page.locator(".booster-panel .primary-action")).toHaveCount(0);
      const action = active.locator("button.pack-artwork");
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

test("le sachet penche sous la souris et le reflet holographique suit l'angle", async ({ page }) => {
  test.skip(Boolean(cloudUrl()), "Le tirage local suffit : rien à demander au serveur.");
  await gotoDeck(page);
  const pack = page.locator('.booster-pack-slot[data-active="true"] button.pack-artwork');
  const object = pack.locator(".pack-3d-object");
  const holo = pack.locator(".pack-holo");
  await expect(holo).toBeVisible();
  await pack.hover({ position: { x: 24, y: 24 } });
  // Le survol est un événement unique : s'il part avant l'hydratation, il ne
  // reste rien. Chaque essai renvoie donc un pointermove souris au bouton, puis
  // lit le style que la première image a écrit.
  await expect.poll(() => object.evaluate((node) => {
    node.closest("button")?.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, pointerType: "mouse", clientX: 30, clientY: 30,
    }));
    return (node as HTMLElement).style.transform;
  })).not.toBe("");
  await expect.poll(() => holo.locator(".pack-holo-film").evaluate((node) => (node as HTMLElement).style.transform)).not.toBe("");
});

test("Reflets coupés : le sachet ne penche pas et le reflet holographique reste absent", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("creatordeck.tilt", "off"));
  await gotoDeck(page);
  const pack = page.locator('.booster-pack-slot[data-active="true"] button.pack-artwork');
  const object = pack.locator(".pack-3d-object");
  await expect(pack.locator(".pack-holo")).toBeHidden();
  await pack.hover({ position: { x: 24, y: 24 } });
  // Un vrai geste souris est envoyé au bouton : rien ne doit être écrit, ni
  // maintenant ni à l'image suivante.
  const transform = await object.evaluate((node) => {
    node.closest("button")?.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, pointerType: "mouse", clientX: 30, clientY: 30,
    }));
    return (node as HTMLElement).style.transform;
  });
  await page.waitForTimeout(200);
  expect(transform).toBe("");
  expect(await object.evaluate((node) => (node as HTMLElement).style.transform)).toBe("");
});

test("la bascule de booster ne laisse jamais le sachet sortant devant ni translucide", async ({ page }) => {
  // Défaut constaté à l'œil sur l'appli : une couture verticale en plein milieu du
  // sachet, le temps de la bascule. Cause : le paquet sortant gardait `z-index: 2`
  // pendant 200 ms (transition différée) tout en s'effaçant de 1 à .5, et le
  // paquet entrant était encore à demi transparent (.5 -> 1). Les deux se
  // voyaient donc l'un à travers l'autre. L'entrant doit être opaque et devant
  // dès la première image ; le sortant descend d'un cran immédiatement.
  // Depuis, tous les paquets restent opaques et le z-index ne bascule qu'à mi-course.
  if (cloudUrl()) { await fakeAccount(page); await page.goto("/"); } else await gotoDeck(page, true, { withoutCircle: true });
  const slots = page.locator(".booster-pack-slot");
  await expect(slots).toHaveCount(4);
  await page.getByRole("button", { name: "MEMES", exact: true }).click();

  // Juste après le clic, transition encore en cours : on lit l'état composité.
  const pendant = await slots.evaluateAll((nodes) => nodes.map((node) => ({
    booster: node.getAttribute("data-booster"),
    active: node.getAttribute("data-active") === "true",
    opacity: Number(getComputedStyle(node).opacity),
    transition: getComputedStyle(node).transitionProperty,
  })));
  const entrant = pendant.find((s) => s.booster === "memes")!;
  const sortant = pendant.find((s) => s.booster === "live")!;
  expect(entrant.active).toBe(true);
  // Pendant toute la bascule, aucun paquet n'est translucide.
  for (const node of pendant) expect(node.opacity).toBe(1);
  // Le z-index bascule à mi-course (délai dans la transition), l'opacité ne bouge jamais.
  expect(entrant.transition).toContain("z-index");
  expect(sortant.transition).toContain("z-index");
  expect(entrant.transition).not.toContain("opacity");
  // Le filtre du voisin change d'un coup : l'animer re-rastérise tout le sachet.
  expect(sortant.transition).not.toContain("filter");

  // Au repos, le paquet choisi est devant ; les voisins, opaques, restent en retrait par leur position 3D.
  await page.locator(".booster-carousel").evaluate(async (node) => {
    await Promise.all(node.getAnimations({ subtree: true })
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished));
  });
  const repos = await slots.evaluateAll((nodes) => nodes.map((node) => ({
    active: node.getAttribute("data-active") === "true",
    z: Number(getComputedStyle(node).zIndex),
    opacity: Number(getComputedStyle(node).opacity),
  })));
  expect(repos.filter((s) => s.active).map((s) => [s.z, s.opacity])).toEqual([[2, 1]]);
  for (const voisin of repos.filter((s) => !s.active)) expect(voisin.opacity).toBe(1);
});
