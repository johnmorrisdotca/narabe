import { STONES } from "../constants.ts";
import type { Cell, GameSettings, Point, Stone } from "../types.ts";
import { indexOf, isStone, pointOf } from "./board.ts";
import { findWinningLine } from "./lines.ts";

/**
 * Quadrant rotation. The board is divided into equal square quadrants, and a
 * turn ends by turning one of them a quarter. Quadrants are numbered
 * row-major from the top left: on a 6×6 board of 3×3 quadrants, 0 is top
 * left, 1 top right, 2 bottom left, 3 bottom right.
 */

/** The top-left corner of quadrant `quadrant`. */
export function quadrantOrigin(size: number, quadrantSize: number, quadrant: number): Point {
  const across = size / quadrantSize;
  return {
    row: Math.floor(quadrant / across) * quadrantSize,
    col: (quadrant % across) * quadrantSize,
  };
}

/** How many quadrants a board of this size holds. */
export function quadrantCount(size: number, quadrantSize: number): number {
  const across = size / quadrantSize;
  return across * across;
}

/**
 * The board with one quadrant turned a quarter. Every cell in the quadrant
 * moves; nothing outside it does. Rotating a quadrant that is symmetrical
 * under the turn leaves the board equal, which the rules still count as a
 * turn taken.
 */
export function rotateQuadrant(
  board: Cell[],
  size: number,
  quadrantSize: number,
  quadrant: number,
  clockwise: boolean,
): Cell[] {
  const origin = quadrantOrigin(size, quadrantSize, quadrant);
  const next = board.slice();
  const last = quadrantSize - 1;

  for (let r = 0; r < quadrantSize; r += 1) {
    for (let c = 0; c < quadrantSize; c += 1) {
      // Clockwise: the cell at (r, c) moves to (c, last - r).
      const to = clockwise ? { r: c, c: last - r } : { r: last - c, c: r };
      next[indexOf(size, { row: origin.row + to.r, col: origin.col + to.c })] =
        board[indexOf(size, { row: origin.row + r, col: origin.col + c })];
    }
  }
  return next;
}

/**
 * Every winning line on the board, by colour. A rotation can complete a line
 * anywhere, for either player, so after one the whole board is read rather
 * than the lines through a single point. Each colour reports at most one line.
 */
export function findAllWins(board: Cell[], settings: GameSettings): Record<Stone, Point[]> {
  const wins: Record<Stone, Point[]> = { black: [], white: [] };
  board.forEach((cell, index) => {
    if (!isStone(cell) || wins[cell].length > 0) return;
    const line = findWinningLine(board, settings, pointOf(settings.size, index));
    if (line.length > 0) wins[cell] = line;
  });
  return wins;
}

/** Whether a stone of `stone` sits anywhere on the board. */
export function hasStones(board: Cell[], stone: Stone): boolean {
  return board.includes(stone);
}

export const BOTH_STONES: readonly Stone[] = [STONES.black, STONES.white];
