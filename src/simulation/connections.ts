import { expect } from "vitest";

import { cellAt } from "../engine.ts";
import { undoMove } from "../rules/record.ts";
import { GAME_STATUS } from "../constants.ts";
import type { Cell, GameState, Point, Stone } from "../types.ts";
import { otherStone } from "../rules/board.ts";

/**
 * The connection game, restated by hand.
 *
 * Every other family here is checked against a brute-force scan for lines,
 * which says nothing at all about Hex: there are no lines in it. So the
 * simulator works out for itself, with its own flood fill and its own copy of
 * the six-way adjacency, whether a colour has joined its two sides — and then
 * insists the engine agrees, move by move.
 */
/** The connection games, restated by hand. */
export function isConnection(variant: string): boolean {
  return variant === "hex";
}

/**
 * Whether a colour has joined its own two sides, worked out from scratch: a
 * flood fill from every stone of theirs on the near side, with the six-way
 * adjacency written out again rather than borrowed from the engine.
 */
function joinedByHand(board: readonly Cell[], size: number, stone: Stone): boolean {
  const at = (row: number, col: number) =>
    row < 0 || col < 0 || row >= size || col >= size ? undefined : board[row * size + col];
  const seen = new Set<number>();
  const stack: [number, number][] = [];
  for (let along = 0; along < size; along += 1) {
    const [row, col] = stone === "black" ? [0, along] : [along, 0];
    if (at(row, col) === stone) {
      seen.add(row * size + col);
      stack.push([row, col]);
    }
  }
  while (stack.length > 0) {
    const [row, col] = stack.pop() as [number, number];
    if (stone === "black" ? row === size - 1 : col === size - 1) return true;
    for (const [dr, dc] of [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]] as const) {
      const next: [number, number] = [row + dr, col + dc];
      const key = next[0] * size + next[1];
      if (at(next[0], next[1]) !== stone || seen.has(key)) continue;
      seen.add(key);
      stack.push(next);
    }
  }
  return false;
}

/**
 * What must hold after a stone in a connection game: one stone down, nothing
 * else touched, and the game over exactly when a side-to-side chain exists —
 * never for a line, and never a draw, which the topology forbids.
 */
export function checkConnectionMove(before: GameState, after: GameState, played: Point, where: string) {
  expect(cellAt(before, played), `${where}: played on an occupied cell`).toBeNull();
  expect(cellAt(after, played), `${where}: stone did not arrive`).toBe(before.toPlay);
  const changed = after.board.filter((cell, index) => cell !== before.board[index]).length;
  expect(changed, `${where}: more than the played cell changed`).toBe(1);
  expect(after.status, `${where}: a connection game cannot be drawn`).not.toBe(GAME_STATUS.draw);

  const joined = joinedByHand(after.board, after.settings.size, before.toPlay);
  if (after.status === GAME_STATUS.won) {
    expect(joined, `${where}: declared a win with no chain across the board`).toBe(true);
    expect(after.winner, `${where}: the win went to the wrong colour`).toBe(before.toPlay);
    expect(after.winBy, `${where}: won for the wrong reason`).toBe("connection");
    for (const point of after.winningLine) {
      expect(cellAt(after, point), `${where}: the chain holds a wrong stone`).toBe(after.winner);
    }
    // The chain runs from one of the winner's sides to the other.
    const ends = after.winningLine.map((point) => (after.winner === "black" ? point.row : point.col));
    expect(Math.min(...ends), `${where}: the chain does not touch the near side`).toBe(0);
    expect(Math.max(...ends), `${where}: the chain does not reach the far side`).toBe(after.settings.size - 1);
  } else {
    expect(joined, `${where}: missed a chain that is on the board`).toBe(false);
    expect(after.toPlay, `${where}: the turn did not pass`).toBe(otherStone(before.toPlay));
  }
  if (after.settings.allowUndo) {
    expect(undoMove(after).board, `${where}: undo did not lift the stone`).toEqual(before.board);
  }
}
