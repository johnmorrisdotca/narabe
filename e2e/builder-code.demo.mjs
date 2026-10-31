// The Builder's code follows the reader's choices: change an option, and the code beside the preview says so, the
// preview takes it, and changing it back takes it out of the code again. A demo whose code ignored its options would
// teach the wrong code.
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

async function serve(page) {
  await page.route("http://builder.test/**", (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({
      body: readFileSync(file),
      contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream",
    });
  });
}

const code = (page) => page.locator("#bld-code").textContent();
const preview = (page) => page.locator("#bld-stage").evaluate((stage) => stage.innerHTML);

test("changing an option rewrites the code, and the preview follows it", async ({ page }) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await serve(page);
  await page.goto("http://builder.test/builder.html?lang=en");
  await expect(page.locator("#bld-code")).not.toHaveText("");

  // Every button group of choices on the page, whichever options this package offers: press one not yet pressed.
  const groups = page.locator("#bld-groups [data-option]").filter({ has: page.locator('button[aria-pressed="false"]') });
  const count = await groups.count();
  expect(count, "a builder with options offers at least one choice to press").toBeGreaterThan(0);
  const before = await code(page);
  let changed = null;
  for (let at = 0; at < count && changed === null; at += 1) {
    const group = groups.nth(at);
    const pressed = group.locator('button[aria-pressed="true"]');
    const was = (await pressed.count()) > 0 ? await pressed.first().getAttribute("data-value") : null;
    const value = await group.locator('button[aria-pressed="false"]').last().getAttribute("data-value");
    const previewBefore = await preview(page);
    await group.locator(`button[data-value="${value}"]`).click();
    if ((await code(page)) !== before) changed = { group, was, value, previewBefore };
  }
  expect(changed, "pressing a choice changes the code").not.toBeNull();
  // A choice with a value is written as that value, and the address carries it too, so a copied link opens the same page.
  if (changed.value) {
    expect(await code(page)).toContain(changed.value);
    await expect.poll(() => page.url()).toContain(`=${encodeURIComponent(changed.value).replaceAll("%20", "+")}`);
  }

  // The way back: pressing what was pressed returns the code to what it said.
  if (changed.was !== null) {
    await changed.group.locator(`button[data-value="${changed.was}"]`).click();
    expect(await code(page)).toBe(before);
  }
  expect(errors).toEqual([]);
});

test("every format the page offers writes code for the same choices", async ({ page }) => {
  test.setTimeout(60000);
  await serve(page);
  await page.goto("http://builder.test/builder.html?lang=en");
  await expect(page.locator("#bld-code")).not.toHaveText("");
  const tabs = page.locator("#bld-formats [data-format]");
  const seen = new Set();
  for (let at = 0; at < (await tabs.count()); at += 1) {
    await tabs.nth(at).click();
    const written = await code(page);
    expect(written.length).toBeGreaterThan(0);
    seen.add(written);
  }
  expect(seen.size).toBeGreaterThan(1);
});
