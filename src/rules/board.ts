import { STONES } from "../constants.ts";
import type { Cell, Point, Stone } from "../types.ts";

/**
 * Board geometry shared by the engine and the rule modules. It lives apart
 * from `engine.ts` so a rule can use it without importing the engine that
 * calls the rule.
 */

/** Narrows a cell to a played stone, excluding empties and obstacles. */
export function isStone(cell: Cell): cell is Stone {
  return cell === STONES.black || cell === STONES.white;
}

export function otherStone(stone: Stone): Stone {
  return stone === STONES.black ? STONES.white : STONES.black;
}

export function indexOf(size: number, point: Point): number {
  return point.row * size + point.col;
}

export function pointOf(size: number, index: number): Point {
  return { row: Math.floor(index / size), col: index % size };
}

export function isOnBoard(size: number, point: Point): boolean {
  return (
    point.row >= 0 && point.row < size && point.col >= 0 && point.col < size
  );
}

export function samePoint(a: Point, b: Point): boolean {
  return a.row === b.row && a.col === b.col;
}

/** `origin` moved `k` steps along `step`. */
export function stepFrom(origin: Point, step: Point, k: number): Point {
  return { row: origin.row + step.row * k, col: origin.col + step.col * k };
}

export function negate(step: Point): Point {
  return { row: -step.row, col: -step.col };
}

/** The cell at `point`, or undefined off the board. */
export function cellAtPoint(board: Cell[], size: number, point: Point): Cell | undefined {
  return isOnBoard(size, point) ? board[indexOf(size, point)] : undefined;
}

/** Chebyshev distance: how many king moves apart two points are. */
export function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/** A copy of the board with `stone` placed at `point`. */
export function withStone(
  board: Cell[],
  size: number,
  point: Point,
  stone: Stone,
): Cell[] {
  const next = board.slice();
  next[indexOf(size, point)] = stone;
  return next;
}
