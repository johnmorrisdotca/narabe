import { expect } from "vitest";

import type { Cell, GameState, Point, Stone } from "../types.ts";

/**
 * THE MILL GAMES' RULES RESTATED BY HAND, for the simulator to hold the engine to. Nothing here reads
 * `rules/mills.ts`: its table of mills is written out, and here the board is worked out from its shape instead, three squares of side
 * 2, 4 and 6 round the middle of a seven by seven grid, each side and each spoke a run of three.
 */
const SIDE = 7;
const MIDDLE = 3;

const index = (row: number, col: number) => row * SIDE + col;

function runs(): number[][] {
  const lines: number[][] = [];
  for (const radius of [1, 2, 3]) {
    const near = MIDDLE - radius;
    const far = MIDDLE + radius;
    lines.push([index(near, near), index(near, MIDDLE), index(near, far)]);
    lines.push([index(far, near), index(far, MIDDLE), index(far, far)]);
    lines.push([index(near, near), index(MIDDLE, near), index(far, near)]);
    lines.push([index(near, far), index(MIDDLE, far), index(far, far)]);
  }
  for (const [row, col] of [[0, MIDDLE], [4, MIDDLE]]) lines.push([index(row!, col!), index(row! + 1, col!), index(row! + 2, col!)]);
  for (const [row, col] of [[MIDDLE, 0], [MIDDLE, 4]]) lines.push([index(row!, col!), index(row!, col! + 1), index(row!, col! + 2)]);
  return lines;
}

const RUNS = runs();
const POINTS = new Set(RUNS.flat());

const of = (board: readonly Cell[], stone: Stone) => [...POINTS].filter((cell) => board[cell] === stone);
const other = (stone: Stone): Stone => (stone === "black" ? "white" : "black");
const millAt = (board: readonly Cell[], cell: number, stone: Stone) => RUNS.some((line) => line.includes(cell) && line.every((each) => board[each] === stone));
const joined = (a: number, b: number) => RUNS.some((line) => Math.abs(line.indexOf(a) - line.indexOf(b)) === 1 && line.includes(a) && line.includes(b));

function hasMove(board: readonly Cell[], stone: Stone): boolean {
  const men = of(board, stone);
  if (men.length <= 3) return true;
  return men.some((man) => [...POINTS].some((point) => board[point] === null && joined(man, point)));
}

/** What a turn's end leaves: a loser where there should be one, and otherwise the other colour to move. */
function checkEnd(before: GameState, after: GameState, where: string) {
  const mover = before.toPlay;
  const next = other(mover);
  const laid = after.moves.filter((move) => move.stone === next && move.kind === "place").length;
  const down = laid >= 9;
  const lost = down && (of(after.board, next).length < 3 || !hasMove(after.board, next));
  if (lost) {
    expect(after.status, `${where}: ${next} has lost and the game goes on`).toBe("won");
    expect(after.winner, `${where}: the wrong side won`).toBe(mover);
  } else if (after.status === "playing") {
    expect(after.toPlay, `${where}: the turn did not pass`).toBe(next);
  }
}

/** A point played in a mill game: a man laid, or a man taken. */
export function checkMillMove(before: GameState, after: GameState, played: Point, where: string) {
  const cell = index(played.row, played.col);
  const mover = before.toPlay;
  expect(POINTS.has(cell), `${where}: played off the board's points`).toBe(true);
  const changed = after.board.filter((each, at) => each !== before.board[at]).length;
  expect(changed, `${where}: more than one point changed`).toBe(1);
  if (before.pendingRemoval) {
    const foe = other(mover);
    expect(before.board[cell], `${where}: took something that was not the other side's`).toBe(foe);
    const loose = of(before.board, foe).filter((man) => !millAt(before.board, man, foe));
    if (loose.length > 0) expect(loose, `${where}: took a man out of a mill while one was loose`).toContain(cell);
    expect(after.board[cell], `${where}: the man is still there`).toBeNull();
    expect(after.pendingRemoval, `${where}: still owes a man`).toBe(false);
    checkEnd(before, after, where);
    return;
  }
  expect(before.board[cell], `${where}: laid on a point that was not empty`).toBeNull();
  expect(after.board[cell], `${where}: the man did not arrive`).toBe(mover);
  const made = millAt(after.board, cell, mover);
  expect(after.pendingRemoval, `${where}: a mill and the owing of a man did not agree`).toBe(made);
  if (made) expect(after.toPlay, `${where}: a mill's maker lost the turn`).toBe(mover);
  else checkEnd(before, after, where);
}

/** A man moved in a mill game: along a line, or anywhere when three are left. */
export function checkMillSlide(before: GameState, after: GameState, from: Point, to: Point, where: string) {
  const start = index(from.row, from.col);
  const end = index(to.row, to.col);
  const mover = before.toPlay;
  expect(before.board[start], `${where}: moved what was not its own`).toBe(mover);
  expect(before.board[end], `${where}: moved onto something`).toBeNull();
  if (of(before.board, mover).length > 3) expect(joined(start, end), `${where}: moved off the lines`).toBe(true);
  expect(after.board[start], `${where}: still at its origin`).toBeNull();
  expect(after.board[end], `${where}: did not arrive`).toBe(mover);
  const made = millAt(after.board, end, mover);
  expect(after.pendingRemoval, `${where}: a mill and the owing of a man did not agree`).toBe(made);
  if (made) expect(after.toPlay, `${where}: a mill's maker lost the turn`).toBe(mover);
  else checkEnd(before, after, where);
}
