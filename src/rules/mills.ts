import { STONES, VARIANT_SPECS } from "../constants.ts";
import type { Cell, GameState, Point, Stone } from "../types.ts";

/**
 * THE MILL GAMES: three squares, one inside another, joined at the middle of each
 * side, twenty-four points in all. Each player lays a set of men, then moves them along
 * the lines, and three men in a line (a mill) take one of the other side's off the board.
 *
 * The board is laid out on a seven by seven grid of points so that the rest of the engine
 * reads it as it reads any other: a point that is not one of the twenty-four is sealed
 * off as BLOCKED when the board is made, as Chinese Checkers' star is. Lines and neighbours
 * come from the drawing below, because on this board being next to a point on the grid
 * says nothing: (0, 0) and (1, 1) are not joined.
 *
 * The removal is the second half of the same turn. While it is owed, `isLegalMove` and
 * `playMove` read "the point played" as the man to take, so a replay, the
 * programs and a page's own press have one way to say it, and nothing else needs to know.
 */

/** The twenty-four points, ring by ring. */
export const MILL_POINTS: readonly Point[] = [
  [0, 0], [0, 3], [0, 6], [1, 1], [1, 3], [1, 5], [2, 2], [2, 3], [2, 4],
  [3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [3, 6],
  [4, 2], [4, 3], [4, 4], [5, 1], [5, 3], [5, 5], [6, 0], [6, 3], [6, 6],
].map(([row, col]) => ({ row: row!, col: col! }));

const SIDE = 7;
const indexAt = (point: Point) => point.row * SIDE + point.col;

/** Every run of three along a drawn line: the eight sides of the rings and the four spokes, each way. */
export const MILLS: readonly (readonly Point[])[] = (
  [
    // Across, ring by ring from the top.
    [[0, 0], [0, 3], [0, 6]], [[1, 1], [1, 3], [1, 5]], [[2, 2], [2, 3], [2, 4]],
    [[3, 0], [3, 1], [3, 2]], [[3, 4], [3, 5], [3, 6]],
    [[4, 2], [4, 3], [4, 4]], [[5, 1], [5, 3], [5, 5]], [[6, 0], [6, 3], [6, 6]],
    // Down, ring by ring from the left.
    [[0, 0], [3, 0], [6, 0]], [[1, 1], [3, 1], [5, 1]], [[2, 2], [3, 2], [4, 2]],
    [[0, 3], [1, 3], [2, 3]], [[4, 3], [5, 3], [6, 3]],
    [[2, 4], [3, 4], [4, 4]], [[1, 5], [3, 5], [5, 5]], [[0, 6], [3, 6], [6, 6]],
  ] as const
).map((line) => line.map(([row, col]) => ({ row, col })));

/** The points joined to each point, by its place on the grid: read from the mills, since every drawn segment is a step along one. */
const NEIGHBOURS: ReadonlyMap<number, readonly Point[]> = (() => {
  const joined = new Map<number, Point[]>();
  const join = (a: Point, b: Point) => {
    joined.set(indexAt(a), [...(joined.get(indexAt(a)) ?? []), b]);
    joined.set(indexAt(b), [...(joined.get(indexAt(b)) ?? []), a]);
  };
  for (const [first, second, third] of MILLS) {
    join(first!, second!);
    join(second!, third!);
  }
  return joined;
})();

const IS_POINT: ReadonlySet<number> = new Set(MILL_POINTS.map(indexAt));

/** Whether this place on the grid is one of the twenty-four. */
export function isMillPoint(point: Point): boolean {
  return IS_POINT.has(indexAt(point));
}

/** The points a man here is joined to. */
export function millNeighbours(point: Point): readonly Point[] {
  return NEIGHBOURS.get(indexAt(point)) ?? [];
}

const stoneAt = (board: readonly Cell[], point: Point): Cell => board[indexAt(point)]!;

/** Whether a man at `point` stands in three of its colour along a drawn line. */
export function inMill(board: readonly Cell[], point: Point, stone: Stone): boolean {
  return MILLS.some((line) => line.some((each) => each.row === point.row && each.col === point.col) && line.every((each) => stoneAt(board, each) === stone));
}

/** The men of this colour that may be taken: any not in a mill, or, when every one is, any. */
export function takeableMen(board: readonly Cell[], stone: Stone): Point[] {
  const men = MILL_POINTS.filter((point) => stoneAt(board, point) === stone);
  const loose = men.filter((point) => !inMill(board, point, stone));
  return loose.length > 0 ? loose : men;
}

/** How many men this colour has laid so far: the board cannot say, once men have been taken. */
export function menLaid(state: GameState, stone: Stone): number {
  return state.moves.filter((move) => move.stone === stone && move.kind === "place").length;
}

/** How many men each side has to lay. */
export function menEach(state: GameState): number {
  return VARIANT_SPECS[state.settings.variant].pieces ?? 0;
}

/** Whether this colour has laid all its men. */
export function allLaid(state: GameState, stone: Stone): boolean {
  return menLaid(state, stone) >= menEach(state);
}

/** How many men of this colour are on the board. */
export function menOnBoard(board: readonly Cell[], stone: Stone): number {
  return MILL_POINTS.filter((point) => stoneAt(board, point) === stone).length;
}

/** Where a man of this colour may go: along a line to an empty point, or, down to three men, to any empty point at all (the flying rule). */
export function millMoves(board: readonly Cell[], from: Point, stone: Stone): Point[] {
  if (menOnBoard(board, stone) <= 3) return MILL_POINTS.filter((point) => stoneAt(board, point) === null);
  return millNeighbours(from).filter((point) => stoneAt(board, point) === null);
}

/** Whether this colour has any move at all, once its men are down. */
export function hasMillMove(board: readonly Cell[], stone: Stone): boolean {
  return MILL_POINTS.some((point) => stoneAt(board, point) === stone && millMoves(board, point, stone).length > 0);
}

/** The other colour. */
export function otherMan(stone: Stone): Stone {
  return stone === STONES.black ? STONES.white : STONES.black;
}
