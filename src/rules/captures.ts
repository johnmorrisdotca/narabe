import { DIRECTIONS, VARIANT_SPECS } from "../constants.ts";
import type { Cell, GameSettings, Point, Stone } from "../types.ts";
import { cellAtPoint, indexOf, isStone, stepFrom } from "./board.ts";
import { rulesFor } from "./handicap.ts";

/**
 * The enemy stones a stone of `stone` landing on `point` would capture: every
 * group of enemy stones of an allowed size in a straight line from it, with
 * another friendly stone immediately beyond. A pair in the two-removal game
 * (二抜き); a pair or a triple in the three-removal game. Empty outside the
 * capture variants.
 *
 * Only the closing stone captures. A group that moves *into* a flanked
 * position is safe, which is what makes the game playable rather than a
 * bloodbath.
 */
export function capturesFrom(
  board: Cell[],
  settings: GameSettings,
  stone: Stone,
  point: Point,
): Point[] {
  if (!rulesFor(settings, stone).captures) return [];

  const { size } = settings;
  const sizes = VARIANT_SPECS[settings.variant].captureSizes;
  const taken: Point[] = [];

  for (const step of DIRECTIONS) {
    for (const sign of [1, -1]) {
      const along = { row: step.row * sign, col: step.col * sign };
      // Count the enemy run beyond the point, then see whether a friendly stone closes it.
      const group: Point[] = [];
      let next = stepFrom(point, along, 1);
      while (group.length < Math.max(...sizes)) {
        const value = cellAtPoint(board, size, next);
        if (!isStone(value ?? null) || value === stone) break;
        group.push(next);
        next = stepFrom(next, along, 1);
      }
      if (sizes.includes(group.length) && cellAtPoint(board, size, next) === stone) {
        taken.push(...group);
      }
    }
  }
  return taken;
}

/** The board with `points` lifted off it. */
export function removeStones(board: Cell[], size: number, points: Point[]): Cell[] {
  if (points.length === 0) return board;
  const next = board.slice();
  for (const point of points) next[indexOf(size, point)] = null;
  return next;
}

/** Stones captured, which is what the tally counts. */
export function stonesIn(points: Point[]): number {
  return points.length;
}
