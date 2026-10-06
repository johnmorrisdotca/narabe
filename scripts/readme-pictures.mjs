// Takes the pictures the README shows, from the built demo in `site/`: `pnpm screenshots:readme` (builds the demo, then runs this).
// The family's standard is in johnmorrisdotca/.github (README-STANDARD.md); the shared part is readme-pictures-lib.mjs.
// The page is served to a browser without a port and never fetched from the live site. Nothing is left to chance: the page's
// Math.random is replaced by a seeded one, so the demo's "Random move" button plays the same game each run, and the hero's
// moves are chosen by hand. Motion is reduced. Output: docs/images/<subject>-<desk|phone>-<light|dark>.webp.
import { takePictures } from "./readme-pictures-lib.mjs";

const BOARD = '[data-testid="board"]';

/** A seeded random in the page (mulberry32), so that every random choice the demo makes is the same each run. */
const seeded = ({ seed }) => {
  let a = seed;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Press "Random move" `count` times, waiting each time for the page (the board or the line of status) to change. */
const randomMoves = (count) => async (page) => {
  const look = () => page.evaluate(() => document.querySelector('[data-testid="board"]').innerHTML + document.querySelector('[data-testid="status"]').textContent);
  for (let at = 0; at < count; at += 1) {
    const before = await look();
    await page.locator('[data-testid="hint"]').click();
    await page.waitForFunction((was) => document.querySelector('[data-testid="board"]').innerHTML + document.querySelector('[data-testid="status"]').textContent !== was, before);
  }
};

/** Play the moves given as [row, column] by clicking those points, the two players alternating. */
const clicked = (size, moves) => async (page) => {
  const cells = page.locator(`${BOARD} .hit`);
  for (const [row, column] of moves) await cells.nth(row * size + column).click();
};

/** One game, cropped to its board. */
const game = (subject, key, size, moves, seed = 7) => ({
  subject, views: ["desk"], scale: 1, url: `/?lang=en&game=${key}&size=${size}`, init: seeded, state: { seed }, ready: `${BOARD} svg`, target: BOARD, prepare: randomMoves(moves),
});

await takePictures({
  shots: [
    // Renju on 15 by 15 from the top of the page, so the header, the language chooser and the cloth patches show. On a phone, in
    // Japanese, Hex on 11 by 11, scrolled to the board.
    {
      subject: "hero",
      views: ["desk", "phone"],
      height: 900,
      url: "/?lang=en&game=renju&size=15",
      ready: `${BOARD} svg`,
      async prepare(page, { view }) {
        if (view === "phone") {
          await page.goto("http://narabe.test/?lang=ja&game=hex&size=11");
          await page.waitForSelector(`${BOARD} svg`);
          await clicked(11, [[5, 5], [4, 6], [6, 4], [3, 6], [4, 5], [5, 6], [3, 5], [6, 6], [2, 6], [7, 5]])(page);
          await page.locator('[data-testid="status"]').evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 16));
        } else {
          await clicked(15, [[7, 7], [6, 8], [8, 6], [7, 6], [7, 8], [8, 8], [6, 6], [5, 5], [9, 7], [6, 7], [8, 7], [5, 7], [4, 4], [9, 5], [5, 6], [5, 8]])(page);
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      },
    },
    game("gomoku", "freestyle", 15, 21),
    game("drop-four", "dropFour", 7, 17),
    game("reversi", "reversi", 8, 24),
    game("go", "go", 9, 30),
    game("hex", "hex", 11, 22),
    game("checkers", "checkers", 8, 14),
    game("chinese-checkers", "chineseCheckers", 13, 16),
    game("honeycomb", "honeycomb", 9, 12),
    game("twist-five", "twistFive", 9, 10),
  ],
});
