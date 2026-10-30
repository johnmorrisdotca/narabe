import { STONES } from "../constants.ts";
import type { Cell, MoverRules, Point, Stone } from "../types.ts";

/**
 * THREE GAMES OF MOVING MEN, each decided by something other than a line, each a row of data (`spec.movers`):
 *
 *  - BREAKTHROUGH (Dan Troyka, 2000): two rows of men each. A man steps straight or diagonally forward to an empty
 *    square, and takes only diagonally forward. The first to reach the far row wins.
 *  - LINES OF ACTION (Sid Sackson's A Gamut of Games, 1969): men on the edges. A man moves along any line exactly as many
 *    squares as there are men on that line, may jump its own, never the other side's, and takes what it lands on.
 *    The first with all its men in one joined group wins.
 *  - AMAZONS (Walter Zamkauskas, 1988): four queens each. A turn moves a queen as a chess queen moves, then
 *    shoots an arrow from where it landed, as a queen moves, and the arrow's square is gone for good. The side with no turn loses.
 *
 * Amazons' arrow is the second half of its turn: while it is owed, `isLegalMove` and `playMove` read
 * the point played as where the arrow lands, as a mill game reads the man it takes (`rules/mills.ts`), so a replay, the programs and a page's press have one way to say it.
 */

const LINES: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

const at = (board: readonly Cell[], size: number, row: number, col: number): Cell | undefined => (row < 0 || col < 0 || row >= size || col >= size ? undefined : board[row * size + col]);
const other = (stone: Stone): Stone => (stone === STONES.black ? STONES.white : STONES.black);

/** The men a game of this kind starts with: black at the foot of the board, moving up it. */
export function moverStart(rules: MoverRules, size: number): { point: Point; stone: Stone }[] {
  const men: { point: Point; stone: Stone }[] = [];
  const put = (row: number, col: number, stone: Stone) => men.push({ point: { row, col }, stone });
  if (rules === "breakthrough") {
    for (let col = 0; col < size; col += 1) {
      put(0, col, STONES.white);
      put(1, col, STONES.white);
      put(size - 2, col, STONES.black);
      put(size - 1, col, STONES.black);
    }
  } else if (rules === "linesOfAction") {
    for (let along = 1; along < size - 1; along += 1) {
      put(0, along, STONES.black);
      put(size - 1, along, STONES.black);
      put(along, 0, STONES.white);
      put(along, size - 1, STONES.white);
    }
  } else {
    const last = size - 1;
    const third = Math.floor(size * 0.3);
    for (const [row, col] of [[0, third], [third, 0], [third, last], [0, last - third]] as const) put(row, col, STONES.black);
    for (const [row, col] of [[last, third], [last - third, 0], [last - third, last], [last, last - third]] as const) put(row, col, STONES.white);
  }
  return men;
}

/** Where a queen or an arrow can go from here: along any of the eight lines, as far as nothing stands in the way. */
export function queenReach(board: readonly Cell[], size: number, from: Point): Point[] {
  const reach: Point[] = [];
  for (const [down, across] of LINES) {
    for (let row = from.row + down, col = from.col + across; at(board, size, row, col) === null; row += down, col += across) reach.push({ row, col });
  }
  return reach;
}

/** How many men of either colour stand on the line through this point in this direction, the point's own included. */
function menOnLine(board: readonly Cell[], size: number, from: Point, down: number, across: number): number {
  let count = 1;
  for (const sign of [1, -1]) {
    for (let row = from.row + sign * down, col = from.col + sign * across; ; row += sign * down, col += sign * across) {
      const cell = at(board, size, row, col);
      if (cell === undefined) break;
      if (cell === STONES.black || cell === STONES.white) count += 1;
    }
  }
  return count;
}

/** Where a man may go under these rules. */
export function moverMoves(rules: MoverRules, board: readonly Cell[], size: number, from: Point, stone: Stone): Point[] {
  if (rules === "amazons") return queenReach(board, size, from);
  if (rules === "breakthrough") {
    const row = from.row + (stone === STONES.black ? -1 : 1);
    const moves: Point[] = [];
    if (at(board, size, row, from.col) === null) moves.push({ row, col: from.col });
    for (const col of [from.col - 1, from.col + 1]) {
      const cell = at(board, size, row, col);
      if (cell === null || cell === other(stone)) moves.push({ row, col });
    }
    return moves;
  }
  const moves: Point[] = [];
  for (const [down, across] of LINES) {
    const distance = menOnLine(board, size, from, down, across);
    let free = true;
    for (let step = 1; step < distance && free; step += 1) {
      const cell = at(board, size, from.row + down * step, from.col + across * step);
      if (cell === undefined || cell === other(stone)) free = false;
    }
    if (!free) continue;
    const row = from.row + down * distance;
    const col = from.col + across * distance;
    const landing = at(board, size, row, col);
    if (landing === null || landing === other(stone)) moves.push({ row, col });
  }
  return moves;
}

/** Whether this colour has any move at all. */
export function moverCanMove(rules: MoverRules, board: readonly Cell[], size: number, stone: Stone): boolean {
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== stone) continue;
    if (moverMoves(rules, board, size, { row: Math.floor(index / size), col: index % size }, stone).length > 0) return true;
  }
  return false;
}

/** Whether all this colour's men are one group, touching along sides or corners. A side with none has no group. */
export function allJoined(board: readonly Cell[], size: number, stone: Stone): boolean {
  const first = board.indexOf(stone);
  if (first === -1) return false;
  const seen = new Set([first]);
  const waiting = [first];
  while (waiting.length > 0) {
    const index = waiting.pop()!;
    const row = Math.floor(index / size);
    const col = index % size;
    for (const [down, across] of LINES) {
      const nextRow = row + down;
      const nextCol = col + across;
      if (at(board, size, nextRow, nextCol) !== stone) continue;
      const next = nextRow * size + nextCol;
      if (!seen.has(next)) {
        seen.add(next);
        waiting.push(next);
      }
    }
  }
  return board.filter((cell) => cell === stone).length === seen.size;
}

/** Whether a colour has a man on the far row, the one Breakthrough is won by reaching. */
export function reachedFarRow(board: readonly Cell[], size: number, stone: Stone): boolean {
  const row = stone === STONES.black ? 0 : size - 1;
  for (let col = 0; col < size; col += 1) if (at(board, size, row, col) === stone) return true;
  return false;
}
