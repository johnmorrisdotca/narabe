// Takes the pictures the README shows, from the built demo in `site/`: `pnpm pictures` (builds the demo, then runs this).
// The page is served to a browser without a port, never fetched from the live site, and the same each run:
// the games are played by hand-picked moves and motion is reduced.
// Output: docs/desktop.jpg (1280 wide, light, English) and docs/phone.jpg (390 by 844, dark, Japanese).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const docs = join(root, "docs");
const host = "http://narabe.test";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const QUALITY = 76;

if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm pictures` (it builds the demo first)");
const browser = await chromium.launch();

/** Open the built demo on a game, and play the moves given as [row, column], the two players alternating. */
async function shot({ width, height, colorScheme, lang, game, size, moves, path, scrollTo }) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: "reduce", locale: "en-US", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.route(`${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  await page.goto(`${host}/?lang=${lang}&game=${game}&size=${size}`);
  await page.locator("html[data-ready='true']").waitFor({ state: "attached" });
  const cells = page.locator('[data-testid="board"] .hit');
  for (const [row, column] of moves) await cells.nth(row * size + column).click();
  if (scrollTo) await page.locator(scrollTo).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 16));
  await page.mouse.move(0, 0);
  await page.screenshot({ path, type: "jpeg", quality: QUALITY });
  await context.close();
}

// Renju on 15 by 15, from the top of the page so the header, the language chooser and the cloth patches show.
await shot({
  width: 1280, height: 900, colorScheme: "light", lang: "en", game: "renju", size: 15, path: join(docs, "desktop.jpg"),
  moves: [[7, 7], [6, 8], [8, 6], [7, 6], [7, 8], [8, 8], [6, 6], [5, 5], [9, 7], [6, 7], [8, 7], [5, 7], [4, 4], [9, 5], [5, 6], [5, 8]],
});
// Hex on 11 by 11 on a phone, scrolled to the board.
await shot({
  width: 390, height: 844, colorScheme: "dark", lang: "ja", game: "hex", size: 11, path: join(docs, "phone.jpg"), scrollTo: '[data-testid="status"]',
  moves: [[5, 5], [4, 6], [6, 4], [3, 6], [4, 5], [5, 6], [3, 5], [6, 6], [2, 6], [7, 5]],
});
await browser.close();
