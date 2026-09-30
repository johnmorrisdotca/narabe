import type { Cell, Point } from "../types.ts";
import { indexOf } from "./board.ts";

/**
 * Gravity, or a magnet under the board: a stone played anywhere in a column
 * comes to rest on the lowest empty cell of that column. Row 0 is the top, so
 * "lowest" is the highest row index.
 */

/** Where a stone dropped into `col` lands, or null when the column is full. */
export function dropTarget(board: Cell[], size: number, col: number): Point | null {
  if (col < 0 || col >= size) return null;
  for (let row = size - 1; row >= 0; row -= 1) {
    if (board[indexOf(size, { row, col })] === null) return { row, col };
  }
  return null;
}

/** The one landing cell per column with room: the only cells a drop can fill. */
export function landingPoints(board: Cell[], size: number): Point[] {
  const points: Point[] = [];
  for (let col = 0; col < size; col += 1) {
    const target = dropTarget(board, size, col);
    if (target !== null) points.push(target);
  }
  return points;
}
