import { BLOCKED, HOT, VARIANT_SPECS } from "../constants.ts";
import type { Cell, GameSettings, Point, VariantSpec } from "../types.ts";
import { ROCK_PLACEMENTS } from "./rocks.constants.ts";
import type { RockLayout, RockRules } from "./rocks.types.ts";
import { drawDistinct, seededRandom } from "./random.ts";

/**
 * The obstacle games' furniture as rules to tune.
 *
 * Obstacle Five scatters six dead points and two hotspots, and nothing says
 * why six or why two. John, 2026-09-16: make the numbers parameters, playtest
 * every combination with the computer players, and name only the two or three
 * that play well. So this module lays out rocks from a `RockRules` and a seed,
 * and lands them on a board — at the start or partway through — and decides
 * nothing about which combinations are games. `obstacles.playtest.test.ts`
 * is what asks that, and the two it named are rows in `VARIANT_SPECS` with a
 * `rocks` field: Scattered Rocks and Rockfall.
 */

/** A rock game's rules, read off its spec, or null for a game with no rocks. */
export function rockRulesOf(spec: VariantSpec): RockRules | null {
  if (spec.rocks === null) return null;
  return { rocks: spec.deadSquares, hot: spec.hotSquares, ...spec.rocks };
}

/**
 * Where this game's rocks and hotspots go, from its own seed, or null for a
 * game with no rocks — or rules its board cannot hold, which
 * `rocks.test.ts` refuses for every board a rock game is offered on.
 */
export function rockLayoutFor(settings: GameSettings): RockLayout | null {
  const rules = rockRulesOf(VARIANT_SPECS[settings.variant]);
  return rules === null ? null : rockLayout(rules, settings.size, settings.seed);
}

/** Turns a point a quarter turn clockwise about the board's centre. */
function quarterTurn(point: Point, size: number): Point {
  return { row: point.col, col: size - 1 - point.row };
}

/** Every point in the top-left corner that a quarter turn carries to a different corner. */
function cornerPoints(size: number): Point[] {
  const half = Math.floor(size / 2);
  const points: Point[] = [];
  for (let row = 0; row < half; row += 1) for (let col = 0; col < half; col += 1) points.push({ row, col });
  return points;
}

/**
 * Where a game's rocks and hotspots go, from its seed, or null when the rules
 * cannot be laid out on this board: a garden whose rocks do not divide by four
 * or whose hotspots do not pair, or more furniture than the board has room for.
 * Null rather than a best effort, because a layout quietly short of what the
 * rules asked for would be playtested as though it were what they asked for.
 *
 * The centre point is never furniture, as with the star-point layout: the
 * middle of the board stays contestable.
 */
export function rockLayout(rules: RockRules, size: number, seed: number): RockLayout | null {
  const random = seededRandom(seed);
  if (rules.rocks < 0 || rules.hot < 0) return null;

  if (rules.placement === ROCK_PLACEMENTS.scattered) {
    const middle = Math.floor(size / 2) * size + Math.floor(size / 2);
    const open = size * size - 1;
    const total = rules.rocks + rules.hot;
    if (total > open) return null;
    // Drawn from every point but the centre: an index at or past it moves up one.
    const points = drawDistinct(random, total, open).map((drawn) => {
      const index = drawn >= middle ? drawn + 1 : drawn;
      return { row: Math.floor(index / size), col: index % size };
    });
    return { dead: points.slice(0, rules.rocks), hot: points.slice(rules.rocks) };
  }

  // The garden: a quarter of the rocks in one corner, turned through all four;
  // half the hotspots in the same corner, each paired with the point opposite.
  if (rules.rocks % 4 !== 0 || rules.hot % 2 !== 0) return null;
  const corner = cornerPoints(size);
  const fromCorner = rules.rocks / 4 + rules.hot / 2;
  if (fromCorner > corner.length) return null;
  const drawn = drawDistinct(random, fromCorner, corner.length).map((index) => corner[index]);
  const dead: Point[] = [];
  for (const point of drawn.slice(0, rules.rocks / 4)) {
    let turned = point;
    for (let turn = 0; turn < 4; turn += 1) {
      dead.push(turned);
      turned = quarterTurn(turned, size);
    }
  }
  const hot: Point[] = [];
  for (const point of drawn.slice(rules.rocks / 4)) {
    hot.push(point, quarterTurn(quarterTurn(point, size), size));
  }
  return { dead, hot };
}

/**
 * A board with the layout's furniture landed on it, as a new board. A rock or
 * hotspot falling on a point a stone already holds is lost: the stone stays.
 * That only happens when the rocks arrive mid-game, and it is the choice that
 * never takes a stone off the board by chance.
 */
export function landRocks(board: readonly Cell[], size: number, layout: RockLayout): Cell[] {
  const next = [...board];
  for (const point of layout.dead) {
    const index = point.row * size + point.col;
    if (next[index] === null) next[index] = BLOCKED;
  }
  for (const point of layout.hot) {
    const index = point.row * size + point.col;
    if (next[index] === null) next[index] = HOT;
  }
  return next;
}
