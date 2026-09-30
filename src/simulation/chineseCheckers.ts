import { expect } from "vitest";
import { cellAt, otherStone } from "../engine.ts";
import { undoMove } from "../rules/record.ts";
import { GAME_STATUS } from "../constants.ts";
import type { Cell, GameState, Point } from "../types.ts";

/**
 * Chinese Checkers, restated by hand: the same race as Halma's, but reached
 * only along the six hex directions rather than the square's eight — the
 * one new thing this variant adds, and the one place a bug in
 * rules/chineseCheckers.ts (say, an eighth direction sneaking back in from
 * the shared square Point type) would show up as a "jump" this hand-rolled
 * checker refuses to call reachable.
 */

export function isChineseCheckers(variant: string): boolean {
  return variant === "chineseCheckers";
}

const HEX_DIRECTIONS: readonly Point[] = [
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
];

function at(board: readonly Cell[], size: number, row: number, col: number): Cell | undefined {
  return row < 0 || col < 0 || row >= size || col >= size ? undefined : board[row * size + col];
}

/** Whether `to` is reachable from `from` by one hex step, or a chain of jumps along the six hex directions only. */
function reachableByHexHand(board: readonly Cell[], size: number, from: Point, to: Point): boolean {
  for (const step of HEX_DIRECTIONS) {
    if (from.row + step.row === to.row && from.col + step.col === to.col) return true;
  }
  const seen = new Set<number>([from.row * size + from.col]);
  const stack: Point[] = [from];
  while (stack.length > 0) {
    const here = stack.pop() as Point;
    for (const step of HEX_DIRECTIONS) {
      const over = at(board, size, here.row + step.row, here.col + step.col);
      const beyond = at(board, size, here.row + 2 * step.row, here.col + 2 * step.col);
      if (over === undefined || over === null || beyond !== null) continue;
      const landing = { row: here.row + 2 * step.row, col: here.col + 2 * step.col };
      if (landing.row === to.row && landing.col === to.col) return true;
      const key = landing.row * size + landing.col;
      if (!seen.has(key)) {
        seen.add(key);
        stack.push(landing);
      }
    }
  }
  return false;
}

/**
 * What must hold after a Chinese Checkers move: one piece went from `from`
 * to `to` by a hex step or a chain of hex jumps, nothing else changed, and
 * nothing was ever taken — worked out fresh, not read from
 * rules/chineseCheckers.ts.
 */
export function checkStarMove(before: GameState, after: GameState, from: Point, to: Point, seed: number) {
  const where = `chineseCheckers seed ${seed}, move ${from.row},${from.col} to ${to.row},${to.col}`;
  const size = after.settings.size;

  expect(cellAt(before, to), `${where}: landed on a piece`).toBeNull();
  expect(cellAt(after, from), `${where}: piece still at its origin`).toBeNull();
  expect(cellAt(after, to), `${where}: piece did not arrive`).toBe(before.toPlay);
  expect(
    reachableByHexHand(before.board, size, from, to),
    `${where}: not a hex step or a chain of hex jumps`,
  ).toBe(true);

  const changed = after.board.filter((cell, index) => cell !== before.board[index]).length;
  expect(changed, `${where}: more than two cells changed — something was taken, or moved twice`).toBe(2);
  expect(after.moves[after.moves.length - 1], `${where}: move not recorded`).toMatchObject({
    kind: "move",
    from,
  });

  if (after.status === GAME_STATUS.playing) {
    expect(after.toPlay, `${where}: the turn did not pass`).toBe(otherStone(before.toPlay));
  }
  if (after.settings.allowUndo) {
    expect(undoMove(after).board, `${where}: undo did not move the piece back`).toEqual(before.board);
  }
}
