import { expect } from "vitest";

import type { Cell, GameState, Point, Stone } from "../types.ts";

/**
 * THE MOVING GAMES' RULES RESTATED BY HAND, for the simulator to hold the engine to: nothing here reads `rules/movers.ts`. Each
 * game's moves are asked as yes or no of the one move made, rather than listed, and its ending is worked out from the board.
 */
const other = (stone: Stone): Stone => (stone === "black" ? "white" : "black");
const cellAt = (board: readonly Cell[], size: number, point: Point) => board[point.row * size + point.col];

/** Every square strictly between two on one line, or null where they are on no line. */
function between(from: Point, to: Point): Point[] | null {
  const rows = to.row - from.row;
  const cols = to.col - from.col;
  if (rows !== 0 && cols !== 0 && Math.abs(rows) !== Math.abs(cols)) return null;
  const steps = Math.max(Math.abs(rows), Math.abs(cols));
  const passed: Point[] = [];
  for (let step = 1; step < steps; step += 1)
    passed.push({ row: from.row + (rows / steps) * step, col: from.col + (cols / steps) * step });
  return passed;
}

function menAtAll(board: readonly Cell[], stone: Stone) {
  return board.filter((cell) => cell === stone).length;
}

/** Whether a colour's men touch as one group: the long way, by painting from one man outwards one ring at a time. */
function oneGroup(board: readonly Cell[], size: number, stone: Stone): boolean {
  const men = board.flatMap((cell, index) => (cell === stone ? [index] : []));
  if (men.length === 0) return false;
  let group = new Set([men[0]!]);
  for (;;) {
    const grown = new Set(group);
    for (const man of men) {
      for (const held of group) {
        if (
          Math.abs(Math.floor(man / size) - Math.floor(held / size)) <= 1 &&
          Math.abs((man % size) - (held % size)) <= 1
        )
          grown.add(man);
      }
    }
    if (grown.size === group.size) break;
    group = grown;
  }
  return group.size === men.length;
}

/** A man moved in a moving game. */
export function checkMoverMove(before: GameState, after: GameState, from: Point, to: Point, where: string) {
  const { size, variant } = before.settings;
  const mover = before.toPlay;
  const foe = other(mover);
  const landed = cellAt(before.board, size, to);
  expect(cellAt(before.board, size, from), `${where}: moved what was not its own`).toBe(mover);
  expect(cellAt(after.board, size, from), `${where}: still at its origin`).toBeNull();
  expect(cellAt(after.board, size, to), `${where}: did not arrive`).toBe(mover);
  if (variant === "breakthrough") {
    const forward = mover === "black" ? -1 : 1;
    expect(to.row - from.row, `${where}: not one step forward`).toBe(forward);
    expect(Math.abs(to.col - from.col), `${where}: more than one across`).toBeLessThanOrEqual(1);
    if (to.col === from.col) expect(landed, `${where}: took straight ahead`).toBeNull();
    else expect([null, foe], `${where}: took its own`).toContain(landed);
    const home = mover === "black" ? 0 : size - 1;
    if (to.row === home) {
      expect(after.status, `${where}: reached the far row and played on`).toBe("won");
      expect(after.winner).toBe(mover);
    }
  } else if (variant === "linesOfAction") {
    const passed = between(from, to);
    expect(passed, `${where}: not along a line`).not.toBeNull();
    for (const square of passed!)
      expect(cellAt(before.board, size, square), `${where}: jumped the other side`).not.toBe(foe);
    expect([null, foe], `${where}: took its own`).toContain(landed);
    // The men on the whole line, counted by walking it from one edge.
    const rowStep = Math.sign(to.row - from.row);
    const colStep = Math.sign(to.col - from.col);
    let row = from.row;
    let col = from.col;
    while (row - rowStep >= 0 && row - rowStep < size && col - colStep >= 0 && col - colStep < size) {
      row -= rowStep;
      col -= colStep;
    }
    let men = 0;
    for (; row >= 0 && row < size && col >= 0 && col < size; row += rowStep, col += colStep) {
      const cell = cellAt(before.board, size, { row, col });
      if (cell === "black" || cell === "white") men += 1;
    }
    expect(
      Math.max(Math.abs(to.row - from.row), Math.abs(to.col - from.col)),
      `${where}: did not go as far as the men on its line`,
    ).toBe(men);
    const mine = oneGroup(after.board, size, mover);
    const theirs = oneGroup(after.board, size, foe);
    if (mine || theirs) {
      expect(after.status, `${where}: a side is joined and the game goes on`).toBe("won");
      expect(after.winner, `${where}: the wrong side won`).toBe(mine ? mover : foe);
    }
  } else {
    const passed = between(from, to);
    expect(passed, `${where}: a queen moves along a line`).not.toBeNull();
    for (const square of passed!) expect(cellAt(before.board, size, square), `${where}: jumped something`).toBeNull();
    expect(landed, `${where}: a queen takes nothing`).toBeNull();
    expect(after.pendingShot, `${where}: owes no arrow`).toEqual(to);
    expect(after.toPlay, `${where}: the turn passed before the arrow`).toBe(mover);
  }
  if (variant !== "amazons")
    expect(menAtAll(after.board, foe), `${where}: took more than one`).toBeGreaterThanOrEqual(
      menAtAll(before.board, foe) - 1,
    );
}

/** An Amazons arrow: along a line from its queen, over nothing, and the square gone. */
export function checkArrow(before: GameState, after: GameState, played: Point, where: string) {
  const { size } = before.settings;
  expect(before.pendingShot, `${where}: an arrow with no queen`).not.toBeNull();
  const passed = between(before.pendingShot!, played);
  expect(passed, `${where}: an arrow goes along a line`).not.toBeNull();
  for (const square of passed!)
    expect(cellAt(before.board, size, square), `${where}: an arrow went over something`).toBeNull();
  expect(cellAt(before.board, size, played), `${where}: landed on something`).toBeNull();
  expect(cellAt(after.board, size, played), `${where}: left nothing behind`).toBe("blocked");
  expect(after.pendingShot, `${where}: still owes an arrow`).toBeNull();
  if (after.status === "playing") expect(after.toPlay, `${where}: the turn did not pass`).toBe(other(before.toPlay));
}
