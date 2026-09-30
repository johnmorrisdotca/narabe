import type { Cell, Point, Stone } from "../types.ts";
import { cellAtPoint, isOnBoard, stepFrom } from "./board.ts";

/**
 * Games with a fixed handful of pieces that move once they are all down.
 * A move is one step to an adjacent empty point, in any of the eight
 * directions. The signature win of this family, besides a line, is four
 * pieces forming a 2×2 square.
 */

const NEIGHBOURS: readonly Point[] = [
  { row: -1, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
];

/** The empty points a piece at `from` may step to. */
export function pieceDestinations(board: Cell[], size: number, from: Point): Point[] {
  return NEIGHBOURS.map((step) => stepFrom(from, step, 1)).filter(
    (point) => isOnBoard(size, point) && cellAtPoint(board, size, point) === null,
  );
}

/** How many stones of `stone` are on the board. */
export function countStones(board: Cell[], stone: Stone): number {
  return board.reduce((count, cell) => (cell === stone ? count + 1 : count), 0);
}

/**
 * The 2×2 square of `stone` that includes `point`, if there is one. There are
 * four squares a point can belong to, one per corner it could occupy.
 */
export function squareThrough(
  board: Cell[],
  size: number,
  point: Point,
  stone: Stone,
): Point[] {
  for (const dr of [-1, 0]) {
    for (const dc of [-1, 0]) {
      const corner = { row: point.row + dr, col: point.col + dc };
      const cells = [
        corner,
        { row: corner.row, col: corner.col + 1 },
        { row: corner.row + 1, col: corner.col },
        { row: corner.row + 1, col: corner.col + 1 },
      ];
      if (cells.every((cell) => cellAtPoint(board, size, cell) === stone)) return cells;
    }
  }
  return [];
}
