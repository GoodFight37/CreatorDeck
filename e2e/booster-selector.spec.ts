import { expect, test, gotoDeck, cloudUrl } from "./fixtures";
import type { Page } from "@playwright/test";
import source from "../src/data/memes-fr.json";
import imgflipSource from "../src/data/imgflip.json";

const imgflipIds = imgflipSource.filter((card) => card.image).slice(0, 5).map((card) => card.id);

/** La collection Mèmes compte les deux catalogues affichés (FR + Imgflip). */
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

// Le Drop ne montre plus qu'un sachet : celui des créateurs. Il n'y a donc plus
// de sélecteur d'univers, plus de voisin, et plus rien à faire glisser. Une
// bascule entre deux sachets ne peut plus ni les croiser ni les trouer.
test("le Drop ne montre qu'un sachet : aucun sélecteur d'univers", async ({ page }) => {
  const calls = cloudUrl() ? await fakeAccount(page) : [];
  if (cloudUrl()) await page.goto("/"); else await gotoDeck(page, true, { withoutCircle: true });
  const carousel = page.locator(".booster-carousel");
  await expect(carousel).toHaveAttribute("data-universe", "live");
  await expect(page.locator(".booster-pack-slot")).toHaveCount(1);
  await expect(page.locator(".booster-pack-slot[data-active=\"true\"]")).toHaveCount(1);
  await expect(page.locator("[data-booster=\"live\"]")).toHaveCount(1);
  await expect(page.locator("[data-booster=\"memes\"]")).toHaveCount(0);
  await expect(page.locator("[data-booster=\"imgflip\"]")).toHaveCount(0);
  await expect(page.locator(".booster-switcher")).toHaveCount(0);
  await expect(page.locator(".booster-neighbor")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "MEMES", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "IMGFLIP", exact: true })).toHaveCount(0);
  // Le sachet est le bouton, et il est le seul geste d'ouverture.
  const pack = page.locator('.booster-pack-slot[data-active="true"] button.pack-artwork');
  await expect(pack).toBeVisible();
  await pack.click();
  await expect(page.locator(".opening-continuum")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".opening-continuum")).toHaveCount(0);
  expect(calls.some((name) => name.startsWith("open_"))).toBe(false);
});

test("le défilement tactile vertical garde le sachet et ne lance aucune ouverture", async ({ page, context }) => {
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

test("un geste horizontal ne change plus rien et n'ouvre rien", async ({ page }) => {
  const calls = cloudUrl() ? await fakeAccount(page) : [];
  if (cloudUrl()) await page.goto("/"); else await gotoDeck(page);
  const stage = page.locator(".booster-carousel");
  await expect(stage).toHaveAttribute("data-universe", "live");
  const box = (await stage.boundingBox())!;
  const y = box.y + box.height * .5;
  for (const [from, to] of [[.8, .2], [.2, .8]] as const) {
    await page.mouse.move(box.x + box.width * from, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * to, y, { steps: 6 });
    await page.mouse.up();
  }
  await expect(stage).toHaveAttribute("data-universe", "live");
  await expect(page.locator(".booster-pack-slot")).toHaveCount(1);
  await expect(page.locator(".opening-continuum")).toHaveCount(0);
  expect(calls.some((name) => name.startsWith("open_"))).toBe(false);
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

// Les univers Mèmes et Imgflip ont quitté le carrousel du Drop : leurs sachets
// s'ouvrent dans leur classeur, à `/memes`, avec les mêmes garanties.
test("avec le serveur : le sachet Mèmes se prépare sans consommation, puis un seul geste ouvre cinq cartes", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
  const calls = await fakeAccount(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/memes");
  const trigger = page.getByRole("button", { name: "OUVRIR UN BOOSTER", exact: true });
  await expect(page.locator(".meme-status").first()).toContainText("4 booster(s) prêts");
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
  await expect(page.locator(".meme-status").first()).toContainText("3 booster(s) prêts");
  expect(calls.filter((name) => name === "open_meme_pack")).toHaveLength(1);
  expect(calls.filter((name) => name === "open_pack")).toHaveLength(0);
  await expect(page.locator(".meme-collection-head strong")).toHaveText(`5 / ${MEME_COLLECTION_TOTAL}`);
  expect(errors).toEqual([]);
});

for (const label of ["MEMES", "IMGFLIP"]) {
  test(`avec le serveur : la carte révélée ${label} garde la taille et le dos des cartes sorties du sachet`, async ({ page }) => {
    test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
    await fakeAccount(page);
    await page.goto("/memes");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.getByRole("button", { name: label === "MEMES" ? "OUVRIR UN BOOSTER" : "OUVRIR UN BOOSTER IMGFLIP", exact: true }).click();
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

test("avec le serveur : le sachet Imgflip se prépare sans consommation, puis un seul geste ouvre cinq cartes serveur", async ({ page }) => {
  test.skip(!cloudUrl(), "Ce scénario vérifie les RPC factices.");
  const calls = await fakeAccount(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/memes");
  const imgflip = page.locator(".meme-imgflip");
  const trigger = imgflip.getByRole("button", { name: "OUVRIR UN BOOSTER IMGFLIP", exact: true });
  await expect(imgflip.locator(".meme-status")).toContainText("4 booster(s) prêts");
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
  await expect(imgflip.locator(".meme-status")).toContainText("3 booster(s) prêts");
  expect(calls.filter((name) => name === "open_imgflip_pack")).toHaveLength(1);
  expect(calls.filter((name) => name === "open_meme_pack")).toHaveLength(0);
  expect(calls.filter((name) => name === "open_pack")).toHaveLength(0);
  // Les cinq cartes tirées sont des possessions persistantes du classeur Mèmes.
  await page.reload();
  await expect(page.locator(".meme-collection-head strong")).toHaveText(`5 / ${MEME_COLLECTION_TOTAL}`);
  expect(errors).toEqual([]);
});

test("le sachet du Drop domine et les commandes restent lisibles à 320, 390 et 1024 pixels", async ({ page }) => {
  if (cloudUrl()) { await fakeAccount(page); await page.goto("/"); } else await gotoDeck(page, true, { withoutCircle: true });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.locator(".booster-carousel").evaluate(async (node) => {
      await Promise.all(node.getAnimations({ subtree: true })
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished));
    });
    const active = page.locator('.booster-pack-slot[data-active="true"]');
    await expect(active).toHaveCount(1);
    await expect(page.locator(".booster-pack-slot")).toHaveCount(1);
    const a = (await active.boundingBox())!;
    expect(a.width).toBeGreaterThan(100);
    expect(Math.abs(a.x + a.width / 2 - width / 2)).toBeLessThan(3);
    // Le paquet de devant EST le bouton : plus de pilule séparée.
    await expect(page.locator(".booster-panel .primary-action")).toHaveCount(0);
    const action = active.locator("button.pack-artwork");
    const actionBox = (await action.boundingBox())!;
    const navBox = (await page.locator(".bottom-nav").boundingBox());
    if (navBox) expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(navBox.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/booster-selector-${width}-${test.info().project.name}.png` });
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

test("un seul sachet dans la scène : aucune superposition possible", async ({ page }) => {
  // Ce test remplace la vérification de bascule : avec un seul sachet, il n'y a
  // plus ni paquet sortant ni paquet entrant, donc plus de couture ni de
  // transparence croisée possible. On vérifie la scène, pas une transition.
  if (cloudUrl()) { await fakeAccount(page); await page.goto("/"); } else await gotoDeck(page, true, { withoutCircle: true });
  const slots = page.locator(".booster-pack-slot");
  await expect(slots).toHaveCount(1);
  const scene = await slots.evaluateAll((nodes) => nodes.map((node) => ({
    active: node.getAttribute("data-active") === "true",
    z: Number(getComputedStyle(node).zIndex),
    opacity: Number(getComputedStyle(node).opacity),
    filter: getComputedStyle(node).filter,
  })));
  expect(scene).toHaveLength(1);
  expect(scene[0].active).toBe(true);
  expect(scene[0].opacity).toBe(1);
  expect(scene[0].filter).toBe("none");
  await expect(page.locator(".booster-carousel .pack-copy")).toHaveCount(0);
  await expect(page.locator(".booster-carousel .booster-neighbor")).toHaveCount(0);
});
