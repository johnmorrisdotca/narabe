import type { Cell, Point, Stone } from "../types.ts";
import { indexOf, isOnBoard } from "./board.ts";

/**
 * The connection game: a rhombus of hexagons, and two sides each.
 *
 * A hexagon touches six others, which on a square grid of the same shape is
 * the four orthogonal neighbours plus two of the four diagonals — the ones
 * along the rhombus's own slant. Nothing is captured and nothing lines up;
 * the whole of the game is whether your stones reach from one of your sides
 * to the other.
 *
 * A filled board always has exactly one winner, which is a fact about the
 * topology rather than a rule anybody wrote: the two colours cannot both
 * cross, and they cannot both fail to. So there are no draws here at all.
 */
const NEIGHBOURS: readonly Point[] = [
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
];

/** The six cells touching this one, those that are on the board. */
export function hexNeighbours(size: number, from: Point): Point[] {
  return NEIGHBOURS.map((step) => ({ row: from.row + step.row, col: from.col + step.col })).filter((point) =>
    isOnBoard(size, point),
  );
}

/** Black joins top to bottom; white joins left to right. */
export function hexSides(stone: Stone): { from: "top" | "left"; to: "bottom" | "right" } {
  return stone === "black" ? { from: "top", to: "bottom" } : { from: "left", to: "right" };
}

/** Whether a cell sits on the far side this colour is trying to reach. */
function onSide(size: number, point: Point, stone: Stone, side: "near" | "far"): boolean {
  if (stone === "black") return side === "near" ? point.row === 0 : point.row === size - 1;
  return side === "near" ? point.col === 0 : point.col === size - 1;
}

/**
 * The chain joining this colour's two sides, or an empty list.
 *
 * A breadth-first walk from every stone of theirs on the near side; the path
 * back is kept so a finished game can show the chain that won it, the way
 * every other game here shows the line that won it.
 */
export function hexConnection(board: Cell[], size: number, stone: Stone): Point[] {
  const cameFrom = new Map<number, number | null>();
  const queue: Point[] = [];

  for (let along = 0; along < size; along += 1) {
    const start = stone === "black" ? { row: 0, col: along } : { row: along, col: 0 };
    if (board[indexOf(size, start)] !== stone) continue;
    cameFrom.set(indexOf(size, start), null);
    queue.push(start);
  }

  while (queue.length > 0) {
    const at = queue.shift() as Point;
    if (onSide(size, at, stone, "far")) {
      // Walk the path back to the side it started from.
      const chain: Point[] = [];
      let step: number | null = indexOf(size, at);
      while (step !== null && step !== undefined) {
        chain.push({ row: Math.floor(step / size), col: step % size });
        step = cameFrom.get(step) ?? null;
      }
      return chain.reverse();
    }
    for (const next of hexNeighbours(size, at)) {
      const key = indexOf(size, next);
      if (cameFrom.has(key) || board[key] !== stone) continue;
      cameFrom.set(key, indexOf(size, at));
      queue.push(next);
    }
  }
  return [];
}
