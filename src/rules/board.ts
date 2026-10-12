import { STONES } from "../constants.ts";
import type { Cell, Point, Stone } from "../types.ts";

/**
 * Board geometry shared by the engine and the rule modules. It lives apart
 * from `engine.ts` so a rule can use it without importing the engine that
 * calls the rule.
 */

/** Narrows a cell to a played stone, excluding empties and obstacles.
 *
 * @param cell - The board cell to check.
 * @returns Narrows a cell to a played stone, excluding empties and obstacles.
 * @example
 * ```ts
 * import { isStone } from "@johnmorrisdotca/narabe";
 *
 * console.log(isStone("black"));
 * ```
 */
export function isStone(cell: Cell): cell is Stone {
  return cell === STONES.black || cell === STONES.white;
}

/** The other stone colour.
 *
 * @param stone - The black or white colour being examined.
 * @returns The other stone colour.
 * @example
 * ```ts
 * import { otherStone } from "@johnmorrisdotca/narabe";
 *
 * console.log(otherStone("black"));
 * ```
 */
export function otherStone(stone: Stone): Stone {
  return stone === STONES.black ? STONES.white : STONES.black;
}

/** Convert a board point into its row-major array index.
 *
 * @param size - The number of cells on each side of the board.
 * @param point - A zero-based row and column on the board.
 * @returns Convert a board point into its row-major array index.
 * @example
 * ```ts
 * import { indexOf } from "@johnmorrisdotca/narabe";
 *
 * const point = {row:7,col:7};
 * console.log(indexOf(15, point));
 * ```
 */
export function indexOf(size: number, point: Point): number {
  return point.row * size + point.col;
}

/** Convert a row-major array index into board coordinates.
 *
 * @param size - The number of cells on each side of the board.
 * @param index - The row-major board array index.
 * @returns Convert a row-major array index into board coordinates.
 * @example
 * ```ts
 * import { pointOf } from "@johnmorrisdotca/narabe";
 *
 * console.log(pointOf(15, 112));
 * ```
 */
export function pointOf(size: number, index: number): Point {
  return { row: Math.floor(index / size), col: index % size };
}

/** Whether both coordinates are within the square board.
 *
 * @param size - The number of cells on each side of the board.
 * @param point - A zero-based row and column on the board.
 * @returns Whether both coordinates are within the square board.
 * @example
 * ```ts
 * import { isOnBoard } from "@johnmorrisdotca/narabe";
 *
 * const point = {row:7,col:7};
 * console.log(isOnBoard(15, point));
 * ```
 */
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
