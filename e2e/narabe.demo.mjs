// The demo, driven as a person drives it: taps on a real page. Each flow ends by checking that the page fits the
// screen and nothing was complained of. `pnpm test:demo` builds the demo and runs these.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

/** Open the demo (or another page of it), the computers moving at once, and collect anything the page complains of. */
async function open(page, address = "?lang=en") {
  if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm site` first (`pnpm test:demo` does)");
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.route("http://narabe.test/**", (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  await page.goto(`http://narabe.test/${address}`);
  if (!address.startsWith("api")) await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  else await expect(page.locator("h1")).toBeVisible();
  return errors;
}

async function tap(page, selector) {
  const target = typeof selector === "string" ? page.locator(selector).first() : selector;
  await target.scrollIntoViewIfNeeded();
  if (test.info().project.use.hasTouch === true) await target.tap();
  else await target.click();
}

/** The page fits the screen, and everything to press is at least 44 pixels. */
async function sound(page, errors) {
  const found = await page.evaluate(() => {
    const seen = (el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const small = [...document.querySelectorAll("button:not(:disabled), input, select, nav a, footer .family a")]
      .filter(seen)
      .map((el) => ({ what: el.id || el.className || el.textContent.trim().slice(0, 20), box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 43.5 || box.height < 43.5)
      .map(({ what, box }) => `${what} ${Math.round(box.width)}×${Math.round(box.height)}`);
    return { over: document.documentElement.scrollWidth - window.innerWidth, small };
  });
  expect(found.over, "the page scrolls sideways").toBeLessThanOrEqual(0);
  expect(found.small, "something to press is under 44px").toEqual([]);
  expect(errors, "the page complained").toEqual([]);
}

const cells = (page) => page.locator('[data-testid="board"] .hit');

test("opens on gomoku, in the family's look, with an empty board to play on", async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator("h1")).toHaveText("Narabe並べ");
  await expect(page.locator('[data-testid="game"]')).toHaveValue("freestyle");
  await expect(cells(page)).toHaveCount(81);
  await expect(page.locator('[data-testid="status"]')).toHaveText("Black to play.");
  await expect(page.locator("footer .family a[aria-current='page']")).toHaveText("Narabe");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toMatch(/^rgb\((244, 239, 228|20, 22, 20)\)$/);
  await sound(page, errors);
});

test("a tap on the board places a stone, the turn passes, and Undo takes it back", async ({ page }) => {
  const errors = await open(page);
  await tap(page, cells(page).nth(40));
  await expect(page.locator('[data-testid="status"]')).toHaveText("White to play.");
  await expect(page.locator('[data-testid="moves"] li')).toHaveCount(1);
  await tap(page, '[data-testid="undo"]');
  await expect(page.locator('[data-testid="moves"] li')).toHaveCount(0);
  await expect(page.locator('[data-testid="status"]')).toHaveText("Black to play.");
  await sound(page, errors);
});

test("another game is chosen from the list, and its board, size and rule follow", async ({ page }) => {
  const errors = await open(page);
  await page.locator('[data-testid="game"]').selectOption("tictactoe");
  await expect(cells(page)).toHaveCount(9);
  await expect(page.locator('[data-testid="rule"]')).toContainText("Three in a row");
  await page.locator('[data-testid="game"]').selectOption("reversi");
  await expect(cells(page)).toHaveCount(64);
  await expect(page.locator('[data-testid="score"]')).toContainText("Discs: Black 2, White 2.");
  await page.locator('[data-testid="game"]').selectOption("go");
  await expect(page.locator('[data-testid="score"]')).toContainText("komi");
  await expect(page).toHaveURL(/game=go/);
  await sound(page, errors);
});

test("three in a row wins at tic-tac-toe, and the status says how", async ({ page }) => {
  await open(page, "?lang=en&game=tictactoe");
  for (const at of [0, 3, 1, 4, 2]) await tap(page, cells(page).nth(at));
  await expect(page.locator('[data-testid="status"]')).toHaveText("Black wins by a line.");
});

test("against the random mover, it answers a move of yours", async ({ page }) => {
  const errors = await open(page);
  await page.locator('[data-testid="opponent"]').selectOption("random");
  await tap(page, cells(page).nth(40));
  await expect(page.locator('[data-testid="moves"] li')).toHaveCount(2, { timeout: 5000 });
  await expect(page.locator('[data-testid="status"]')).toHaveText("Black to play.");
  await sound(page, errors);
});

test("the board keeps one steady size as games change, and fits the screen", async ({ page }) => {
  await open(page);
  const box = async () => page.locator('[data-testid="board"]').evaluate((el) => Math.round(el.getBoundingClientRect().width));
  const first = await box();
  for (const game of ["tictactoe", "go", "honeycomb", "checkers"]) {
    await page.locator('[data-testid="game"]').selectOption(game);
    expect(await box()).toBe(first);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("the cloth patches in the header change the felt behind the board", async ({ page }) => {
  await open(page);
  const felt = () => page.locator(".play").evaluate((el) => getComputedStyle(el).backgroundImage);
  const green = await felt();
  await tap(page, 'button[data-cloth="blue"]');
  expect(await felt()).not.toBe(green);
  await tap(page, 'button[data-cloth="green"]');
  expect(await felt()).toBe(green);
});

test("in Japanese the page, the games' names and rules, and the status speak Japanese", async ({ page }) => {
  const errors = await open(page, "?lang=en");
  await tap(page, 'button[data-lang="ja"]');
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator('[data-testid="new"]')).toHaveText("新しいゲーム");
  await expect(page.locator('[data-testid="status"]')).toHaveText("黒の番です。");
  await expect(page.locator('[data-testid="rule"]')).toContainText("5つ以上");
  await expect(page.locator('[data-testid="game"] option[value="freestyle"]')).toContainText("五目並べ  Gomoku");
  await expect(page.locator("#unreviewed")).toBeVisible();
  await tap(page, cells(page).nth(40));
  await expect(page.locator('[data-testid="status"]')).toHaveText("白の番です。");
  await expect(page.locator('[data-testid="moves"] li')).toContainText("黒");
  await sound(page, errors);
  await tap(page, 'button[data-lang="en"]');
  await expect(page.locator('[data-testid="status"]')).toHaveText("White to play.");
  await expect(page.locator("#unreviewed")).toBeHidden();
});

test("every game's Japanese rule and group name is there", async ({ page }) => {
  await open(page, "?lang=ja");
  const missing = await page.evaluate(async () => {
    const { GAMES, GROUPS } = await import("/games.js");
    return [...GAMES.filter((game) => !game.ruleJa || !game.kanji).map((game) => game.key), ...GROUPS.filter((group) => !group.nameJa).map((group) => group.name)];
  });
  expect(missing).toEqual([]);
});

test("the API reference is in the family's frame and links back", async ({ page }) => {
  const errors = await open(page, "api.html?lang=en");
  await expect(page.locator("h1")).toHaveText("Narabe並べ");
  expect(await page.locator("article[data-kind]").count()).toBeGreaterThan(100);
  await expect(page.locator("header nav a", { hasText: "The games" })).toHaveAttribute("href", "./");
  await sound(page, errors);
});

// The Help switch in the family header (scripts/family-template.mjs): off, the page is as it was; on, every
// option row says in one line what it does, in the page's language, and every control in it has hover words.
test("Help is off at first, and on it shows a line under each option row, in either language, without resizing the play area", async ({ page }) => {
  const errors = await open(page);
  const lines = page.locator(".fam-help");
  const rows = page.locator("[data-help-en]");
  expect(await rows.count()).toBeGreaterThan(0);
  await expect(page.locator("[data-help-switch]")).toHaveAttribute("aria-pressed", "false");
  await expect(lines.first()).toBeHidden();
  const surface = page.locator('[data-testid="board"]').first();
  const before = await surface.boundingBox();
  await page.locator("[data-help-switch]").click();
  await expect(page.locator("html")).toHaveAttribute("data-help", "on");
  for (const row of await rows.all()) {
    // A row in a tab that is not showing has its line, and shows it when the tab opens.
    if (await row.isVisible()) {
      const shown = await row.evaluate((el) => {
        const line = el.classList.contains("fam-seg") || el.hasAttribute("data-help-after") ? el.nextElementSibling : el.querySelector(":scope > .fam-help");
        return line !== null && line.classList.contains("fam-help") && window.getComputedStyle(line).display !== "none" && line.textContent.length > 10;
      });
      expect(shown).toBe(true);
    }
    expect(((await row.getAttribute("data-help-en")) ?? "").length).toBeGreaterThan(10);
    expect(((await row.getAttribute("data-help-ja")) ?? "").length).toBeGreaterThan(4);
  }
  const after = await surface.boundingBox();
  // The play area keeps its box (to a fraction of a pixel).
  expect(Math.abs(after.width - before.width)).toBeLessThan(0.5);
  expect(Math.abs(after.height - before.height)).toBeLessThan(0.5);
  // Every button in an option row says what it does on hover.
  const untitled = await page.evaluate(() => [...document.querySelectorAll("[data-help-en] button")].filter((b) => !b.title).map((b) => b.textContent.trim()));
  expect(untitled).toEqual([]);
  const english = await lines.first().textContent();
  await page.locator('[data-lang="ja"]').click();
  await expect(lines.first()).not.toHaveText(english);
  // The choice is kept, and turning it off hides every line again.
  await page.reload();
  await expect(page.locator("[data-help-switch]")).toHaveAttribute("aria-pressed", "true");
  await page.locator("[data-help-switch]").click();
  await expect(lines.first()).toBeHidden();
  expect(errors).toEqual([]);
});
