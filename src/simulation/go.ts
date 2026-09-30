import { handicapStonesByHand } from "./headStart.ts";
import { expect } from "vitest";
import { cellAt, otherStone } from "../engine.ts";
import { undoMove } from "../rules/record.ts";
import { GAME_STATUS, MOVE_KINDS } from "../constants.ts";
import type { Cell, GameState, Point, Stone } from "../types.ts";

/**
 * Go, restated by hand: liberties, capture, suicide, the ko point and the
 * area count, worked out from scratch rather than read from rules/go.ts —
 * the point of every file in this family, so a wrong table there cannot
 * agree with itself here.
 */

export function isGo(variant: string): boolean {
  return variant === "go";
}

const ORTHOGONAL: readonly Point[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

function cellAtHand(board: readonly Cell[], size: number, row: number, col: number): Cell | undefined {
  return row < 0 || col < 0 || row >= size || col >= size ? undefined : board[row * size + col];
}

/** The connected group at `from` and how many liberties it has, computed fresh. */
function groupByHand(board: readonly Cell[], size: number, from: Point): { stones: Point[]; liberties: number } {
  const colour = cellAtHand(board, size, from.row, from.col);
  const stones: Point[] = [];
  const liberties = new Set<number>();
  const seen = new Set<number>([from.row * size + from.col]);
  const queue: Point[] = [from];
  while (queue.length > 0) {
    const here = queue.shift() as Point;
    stones.push(here);
    for (const step of ORTHOGONAL) {
      const row = here.row + step.row;
      const col = here.col + step.col;
      const cell = cellAtHand(board, size, row, col);
      if (cell === undefined) continue;
      if (cell === null) {
        liberties.add(row * size + col);
        continue;
      }
      if (cell !== colour) continue;
      const key = row * size + col;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ row, col });
    }
  }
  return { stones, liberties: liberties.size };
}

/**
 * What must hold after a Go move: the enemy groups a hand-rolled liberty
 * count says have none left are gone, nothing else changed, the mover's own
 * group breathes, and the ko point is set exactly when the capture was a
 * single stone.
 */
export function checkGoMove(before: GameState, after: GameState, played: Point, where: string) {
  const size = after.settings.size;
  const mover = before.toPlay;
  const enemy = otherStone(mover);

  expect(cellAt(before, played), `${where}: played on an occupied point`).toBeNull();
  expect(cellAt(after, played), `${where}: the stone is not on the board`).toBe(mover);

  const withMove = before.board.slice();
  withMove[played.row * size + played.col] = mover;
  const capturedByHand = new Map<number, Point>();
  for (const step of ORTHOGONAL) {
    const row = played.row + step.row;
    const col = played.col + step.col;
    if (row < 0 || col < 0 || row >= size || col >= size) continue;
    if (before.board[row * size + col] !== enemy) continue;
    const group = groupByHand(withMove, size, { row, col });
    if (group.liberties > 0) continue;
    for (const stone of group.stones) capturedByHand.set(stone.row * size + stone.col, stone);
  }

  for (const stone of capturedByHand.values()) {
    expect(cellAt(after, stone), `${where}: a stone with no liberties left was not captured`).toBeNull();
  }
  const takenTally = after.captures[mover] - before.captures[mover];
  expect(takenTally, `${where}: captures tally does not match stones with no liberties`).toBe(
    capturedByHand.size,
  );

  const changed = after.board.filter((cell, index) => cell !== before.board[index]).length;
  expect(changed, `${where}: more cells changed than the move and its captures explain`).toBe(
    1 + capturedByHand.size,
  );

  const ownGroup = groupByHand(after.board, size, played);
  expect(
    ownGroup.liberties,
    `${where}: the played stone's group has no liberty — suicide should have been refused`,
  ).toBeGreaterThan(0);

  if (capturedByHand.size === 1) {
    expect(after.koPoint, `${where}: a single-stone capture did not set a ko point`).toEqual(
      [...capturedByHand.values()][0],
    );
  } else {
    expect(after.koPoint, `${where}: the ko point should have cleared`).toBeNull();
  }

  if (after.status === GAME_STATUS.playing) {
    expect(after.toPlay, `${where}: the turn did not pass`).toBe(enemy);
  }
  if (after.settings.allowUndo) {
    const undone = undoMove(after);
    expect(undone.board, `${where}: undo did not restore the board`).toEqual(before.board);
    expect(undone.koPoint, `${where}: undo did not restore the ko point`).toEqual(before.koPoint);
    expect(undone.toPlay, `${where}: undo did not restore the turn`).toBe(before.toPlay);
  }
}

/** Every stone plus every empty region touching one colour alone, worked out from scratch. */
function scoreByHand(board: readonly Cell[], size: number): { black: number; white: number } {
  const score = { black: 0, white: 0 };
  const seen = new Set<number>();
  for (let index = 0; index < board.length; index += 1) {
    const cell = board[index];
    if (cell === "black" || cell === "white") {
      score[cell] += 1;
      continue;
    }
    if (cell !== null || seen.has(index)) continue;

    const region: number[] = [];
    const borders = new Set<Stone>();
    const queue = [index];
    seen.add(index);
    while (queue.length > 0) {
      const at = queue.shift() as number;
      region.push(at);
      const row = Math.floor(at / size);
      const col = at % size;
      for (const step of ORTHOGONAL) {
        const nextRow = row + step.row;
        const nextCol = col + step.col;
        if (nextRow < 0 || nextCol < 0 || nextRow >= size || nextCol >= size) continue;
        const nextIndex = nextRow * size + nextCol;
        const nextCell = board[nextIndex];
        if (nextCell === null) {
          if (!seen.has(nextIndex)) {
            seen.add(nextIndex);
            queue.push(nextIndex);
          }
        } else if (nextCell === "black" || nextCell === "white") {
          borders.add(nextCell);
        }
      }
    }
    if (borders.size === 1) score[[...borders][0]] += region.length;
  }
  return score;
}

const KOMI = 6.5;
/** Half a point where handicap stones were given, so a handicap game still cannot tie. */
const HANDICAP_KOMI = 0.5;

/**
 * What must hold after a Go pass: the board and the ko point are untouched,
 * a single pass only turns the move over, and two in a row end the game —
 * scored by area, worked out fresh, never a draw.
 */
export function checkGoPass(before: GameState, after: GameState, seed: number) {
  const where = `go seed ${seed}, pass after move ${after.moves.length}`;
  expect(after.board, `${where}: a pass changed the board`).toEqual(before.board);
  expect(after.koPoint, `${where}: a pass did not clear the ko point`).toBeNull();
  expect(after.moves[after.moves.length - 1].kind, `${where}: pass not recorded`).toBe(MOVE_KINDS.pass);

  const previous = before.moves[before.moves.length - 1];
  // A pass a head start took is not the first of two.
  if (previous !== undefined && previous.kind === MOVE_KINDS.pass && previous.headStart !== true) {
    expect(after.status, `${where}: two passes in a row did not end the game`).toBe(GAME_STATUS.won);
    const score = scoreByHand(after.board, after.settings.size);
    const komi = handicapStonesByHand(after) ? HANDICAP_KOMI : KOMI;
    const winner: Stone = score.black > score.white + komi ? "black" : "white";
    expect(after.winner, `${where}: the wrong side won on the count`).toBe(winner);
  } else {
    expect(after.status, `${where}: a single pass ended the game`).toBe(GAME_STATUS.playing);
    expect(after.toPlay, `${where}: the turn did not pass`).toBe(otherStone(before.toPlay));
  }
}
