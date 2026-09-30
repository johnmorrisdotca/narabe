import { describe, expect, it } from "vitest";

import { createGame, playMove } from "../engine.ts";
import { GAME_STATUS, STONES, WIN_REASONS } from "../constants.ts";
import type { Cell } from "../types.ts";
import { hexConnection, hexNeighbours } from "./hex.ts";

const p = (row: number, col: number) => ({ row, col });
const key = (point: { row: number; col: number }) => `${point.row},${point.col}`;

/** A board of `size`, with the given points filled by `stone`. */
function boardWith(size: number, stone: Cell, points: [number, number][]): Cell[] {
  const board: Cell[] = Array.from({ length: size * size }, () => null);
  for (const [row, col] of points) board[row * size + col] = stone;
  return board;
}

describe("hex", () => {
  it("starts on eleven a side, however it is asked for", () => {
    expect(createGame({ variant: "hex" }).settings.size).toBe(11);
    expect(createGame({ variant: "hex", size: 15 }).settings.size).toBe(11);
    expect(createGame({ variant: "hex", size: 13 }).settings.size).toBe(13);
  });

  it("touches six cells, not four and not eight", () => {
    const middle = hexNeighbours(11, p(5, 5)).map(key).sort();
    expect(middle).toEqual(["4,5", "4,6", "5,4", "5,6", "6,4", "6,5"]);
    // The two diagonals that are not along the rhombus's slant are not neighbours.
    expect(middle).not.toContain("4,4");
    expect(middle).not.toContain("6,6");
    // The rhombus has two sharp corners with two neighbours and two blunt ones with three.
    expect(hexNeighbours(11, p(0, 0))).toHaveLength(2);
    expect(hexNeighbours(11, p(10, 10))).toHaveLength(2);
    expect(hexNeighbours(11, p(0, 10))).toHaveLength(3);
    expect(hexNeighbours(11, p(10, 0))).toHaveLength(3);
    for (let row = 0; row < 11; row += 1) {
      for (let col = 0; col < 11; col += 1) expect(hexNeighbours(11, p(row, col)).length).toBeLessThanOrEqual(6);
    }
  });

  it("finds a chain from side to side, and calls a near miss no chain at all", () => {
    const size = 5;
    // A straight column of black joins top to bottom.
    const straight = boardWith(size, STONES.black, [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]]);
    expect(hexConnection(straight, size, STONES.black)).toHaveLength(5);
    // The same stones are nothing at all to white, who needs left to right.
    expect(hexConnection(straight, size, STONES.white)).toEqual([]);
    // One stone short of the far side is not a chain.
    const short = boardWith(size, STONES.black, [[0, 2], [1, 2], [2, 2], [3, 2]]);
    expect(hexConnection(short, size, STONES.black)).toEqual([]);
    // A chain may wander, so long as every step touches the last.
    const winding = boardWith(size, STONES.white, [[2, 0], [2, 1], [1, 2], [1, 3], [0, 4]]);
    expect(hexConnection(winding, size, STONES.white).length).toBeGreaterThan(0);
  });

  it("is won by the stone that closes the chain, and says so", () => {
    let game = createGame({ variant: "hex", size: 13 });
    // Black walks down column 6 while white answers along column 0, which never joins.
    for (let row = 0; row < 12; row += 1) {
      game = playMove(game, p(row, 6));
      expect(game.status).toBe(GAME_STATUS.playing);
      game = playMove(game, p(row, 0));
    }
    game = playMove(game, p(12, 6));
    expect(game.status).toBe(GAME_STATUS.won);
    expect(game.winner).toBe(STONES.black);
    expect(game.winBy).toBe(WIN_REASONS.connection);
    expect(game.winningLine).toHaveLength(13);
    expect(game.winningLine[0].row).toBe(0);
    expect(game.winningLine[game.winningLine.length - 1].row).toBe(12);
  });

  it("has no line rule at all: five in a row is worth nothing", () => {
    let game = createGame({ variant: "hex", size: 11 });
    // Five black along a row, which would win most games here and wins nothing in this one.
    for (let col = 0; col < 5; col += 1) {
      game = playMove(game, p(5, col));
      expect(game.status).toBe(GAME_STATUS.playing);
      if (col < 4) game = playMove(game, p(9, col));
    }
    expect(game.status).toBe(GAME_STATUS.playing);
  });
});
