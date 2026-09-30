import type { Cell, GameSettings, Point, Stone } from "../types.ts";
import { cellAtPoint, indexOf, isOnBoard, stepFrom } from "./board.ts";

/**
 * The race games: every piece starts in a camp in one corner and the object
 * is to get them all into the far corner first. Nothing is captured and no
 * line means anything; a piece steps to a neighbouring square, or jumps over
 * any piece — either colour — into the empty square beyond, and may go on
 * jumping in one move as long as there is something to jump.
 */

/**
 * The camp on each board, as rows counted from the corner: how many squares
 * of each row belong to it. Halma's 16×16 camp is nineteen pieces; the
 * smaller boards take the camps the game is played with on them.
 */
export const CAMP_ROWS: Record<number, readonly number[]> = {
  8: [4, 3, 2, 1],
  10: [4, 4, 3, 2],
  16: [5, 5, 4, 3, 2],
};

/** Pieces a side has on `size`: the squares of its camp. */
export function campSize(size: number): number {
  return (CAMP_ROWS[size] ?? []).reduce((sum, count) => sum + count, 0);
}

/**
 * The squares of a colour's home camp. Black starts top-left and white
 * bottom-right, each camp the mirror of the other through the centre.
 */
export function campSquares(size: number, stone: Stone): Point[] {
  const rows = CAMP_ROWS[size] ?? [];
  const points: Point[] = [];
  rows.forEach((count, row) => {
    for (let col = 0; col < count; col += 1) {
      points.push(stone === "black" ? { row, col } : { row: size - 1 - row, col: size - 1 - col });
    }
  });
  return points;
}

/** Whose home camp `point` lies in, or null for the open board. */
export function campOf(size: number, point: Point): Stone | null {
  const rows = CAMP_ROWS[size] ?? [];
  if (point.row < rows.length && point.col < rows[point.row]) return "black";
  const row = size - 1 - point.row;
  const col = size - 1 - point.col;
  if (row < rows.length && col < rows[row]) return "white";
  return null;
}

/** Every piece on the board when the game starts: each colour filling its own camp. */
export function startingPieces(settings: GameSettings): { point: Point; stone: Stone }[] {
  return [
    ...campSquares(settings.size, "black").map((point) => ({ point, stone: "black" as const })),
    ...campSquares(settings.size, "white").map((point) => ({ point, stone: "white" as const })),
  ];
}

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

/**
 * Where a piece at `from` may go: any empty neighbouring square, or the end
 * of any chain of jumps. A jump crosses one adjacent piece of either colour
 * into the empty square straight beyond it, and a chain may turn corners
 * but never revisits a square, so it always ends.
 */
export function campMoves(board: Cell[], size: number, from: Point): Point[] {
  const empty = (point: Point) => isOnBoard(size, point) && cellAtPoint(board, size, point) === null;
  const steps = NEIGHBOURS.map((step) => stepFrom(from, step, 1)).filter(empty);

  const seen = new Set<number>([indexOf(size, from)]);
  const landings: Point[] = [];
  const queue: Point[] = [from];
  while (queue.length > 0) {
    const at = queue.shift() as Point;
    for (const step of NEIGHBOURS) {
      const over = stepFrom(at, step, 1);
      const beyond = stepFrom(at, step, 2);
      if (!isOnBoard(size, over) || cellAtPoint(board, size, over) === null) continue;
      if (!empty(beyond)) continue;
      const key = indexOf(size, beyond);
      if (seen.has(key)) continue;
      seen.add(key);
      landings.push(beyond);
      queue.push(beyond);
    }
  }

  const stepKeys = new Set(steps.map((point) => indexOf(size, point)));
  return [...steps, ...landings.filter((point) => !stepKeys.has(indexOf(size, point)))];
}

/**
 * Whether `stone` has won: the far camp — the other colour's home — is full,
 * and at least one piece in it is theirs. Filling it with your own pieces is
 * the ordinary way; the rule also covers a side that leaves pieces at home
 * to block, which cannot save them once every other square is taken.
 */
export function campFilled(board: Cell[], size: number, stone: Stone): boolean {
  const far = campSquares(size, stone === "black" ? "white" : "black");
  if (far.length === 0) return false;
  let own = 0;
  for (const point of far) {
    const cell = cellAtPoint(board, size, point);
    if (cell === null) return false;
    if (cell === stone) own += 1;
  }
  return own > 0;
}

/** How many of `stone`'s pieces stand in the far camp. */
export function piecesHome(board: Cell[], size: number, stone: Stone): number {
  const far = campSquares(size, stone === "black" ? "white" : "black");
  return far.filter((point) => cellAtPoint(board, size, point) === stone).length;
}
