// Switching English and Japanese moves nothing that matters: at a fixed window, the board keeps its place and its size
// and the main controls stay where they were, there and back. Each language's words have room kept for them.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
};
const BOARD = "#board";
const CONTROLS = "#game, #size, #new, #undo, #pass";
const PAGE = "?seed=42";

async function serve(page) {
  await page.route("http://steady.test/**", (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({
      body: readFileSync(file),
      contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream",
    });
  });
}

const places = (page) =>
  page.evaluate(
    ([board, controls]) => {
      const box = (element) => {
        const found = element.getBoundingClientRect();
        return { x: Math.round(found.x), y: Math.round(found.y + globalThis.scrollY), width: Math.round(found.width), height: Math.round(found.height) };
      };
      return {
        board: box(globalThis.document.querySelector(board)),
        controls: [...globalThis.document.querySelectorAll(controls)].map((element) => box(element).y),
      };
    },
    [BOARD, CONTROLS],
  );

for (const width of [390, 828, 1280])
  test(`at ${width} pixels the language moves neither the board nor the controls`, async ({ page }) => {
    test.setTimeout(60000);
    await serve(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://steady.test/${PAGE}`);
    await expect(page.locator(BOARD).first()).toBeVisible();
    await page.locator('[data-lang="en"]').first().click();
    const english = await places(page);
    await page.locator('[data-lang="ja"]').first().click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    const japanese = await places(page);
    await page.locator('[data-lang="en"]').first().click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const back = await places(page);
    for (const [name, one] of [
      ["Japanese", japanese],
      ["English again", back],
    ]) {
      for (const side of ["x", "y", "width", "height"])
        expect(Math.abs(one.board[side] - english.board[side]), `${name}: the board's ${side}`).toBeLessThanOrEqual(1);
      expect(one.controls.length).toBe(english.controls.length);
      one.controls.forEach((y, at) =>
        expect(Math.abs(y - english.controls[at]), `${name}: control ${at}`).toBeLessThanOrEqual(1),
      );
    }
    expect(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth)).toBe(true);
  });
