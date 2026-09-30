import { describe, expect, it } from "vitest";

import { createGame, movePiece, pieceMoves } from "../engine.ts";
import { GAME_STATUS, STONES, WIN_REASONS } from "../constants.ts";
import type { GameState } from "../types.ts";
import {
  inStar,
  STAR_RADIUS,
  starCampOf,
  starCampSquares,
  starFilled,
  starSize,
  starStartingPieces,
} from "./chineseCheckers.ts";

const p = (row: number, col: number) => ({ row, col });

describe("chineseCheckers", () => {
  it("is a 121-cell hexagram: a 61-cell centre hexagon plus six 10-cell points", () => {
    const size = starSize(STAR_RADIUS);
    expect(size).toBe(17);
    let total = 0;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (inStar(STAR_RADIUS, p(row, col))) total += 1;
      }
    }
    expect(total).toBe(121);
    expect(starStartingPieces(STAR_RADIUS)).toHaveLength(20);
    expect(starCampSquares(STAR_RADIUS, STONES.black)).toHaveLength(10);
    expect(starCampSquares(STAR_RADIUS, STONES.white)).toHaveLength(10);
  });

  it("starts each side filling the point opposite the other's, and nowhere else", () => {
    const game = createGame({ variant: "chineseCheckers" });
    expect(game.settings.size).toBe(17);
    const black = game.board.filter((cell) => cell === STONES.black).length;
    const white = game.board.filter((cell) => cell === STONES.white).length;
    expect(black).toBe(10);
    expect(white).toBe(10);
    // Every square outside the star is sealed, never a stone or an empty playable point.
    game.board.forEach((cell, index) => {
      const point = p(Math.floor(index / 17), index % 17);
      if (!inStar(STAR_RADIUS, point)) expect(cell).toBe("blocked");
    });
    for (const square of starCampSquares(STAR_RADIUS, STONES.black)) {
      expect(starCampOf(STAR_RADIUS, square)).toBe(STONES.black);
    }
  });

  it("moves a piece to any of the six neighbouring cells the hex lattice touches, not eight or four", () => {
    const game = createGame({ variant: "chineseCheckers" });
    // A black piece just inside the point, with room on every side, sees at most six destinations.
    const busy = starCampSquares(STAR_RADIUS, STONES.black)[0];
    expect(pieceMoves(game, busy).length).toBeLessThanOrEqual(6);
  });

  it("jumps a chain over pieces of either colour, capturing nothing, and keeps going in one move", () => {
    // Hand-built board: a black piece with two more pieces laid out so it can
    // jump twice in one move, turning a corner between the two jumps.
    const size = 17;
    const board = new Array(size * size).fill(null);
    const from = p(8, 8);
    board[from.row * size + from.col] = STONES.black;
    // First jump: over (7,8) landing on (6,8).
    board[7 * size + 8] = STONES.white;
    // Second jump, from (6,8): over (6,7) landing on (6,6) — a turn along a different direction.
    board[6 * size + 7] = STONES.black;
    const game: GameState = { ...createGame({ variant: "chineseCheckers" }), board, toPlay: STONES.black };

    const options = pieceMoves(game, from).map((point) => `${point.row},${point.col}`);
    expect(options).toContain("6,8");
    expect(options).toContain("6,6");

    const after = movePiece(game, from, p(6, 6));
    // The chain landed the piece two hops on; nothing it jumped was removed.
    expect(after.board[6 * size + 6]).toBe(STONES.black);
    expect(after.board[from.row * size + from.col]).toBeNull();
    expect(after.board[7 * size + 8]).toBe(STONES.white);
    expect(after.board[6 * size + 7]).toBe(STONES.black);
    expect(after.toPlay).toBe(STONES.white);
  });

  it("wins by filling the point directly opposite, not by anything on the rest of the board", () => {
    const size = 17;
    const board = new Array(size * size).fill(null);
    const white = starCampSquares(STAR_RADIUS, STONES.white);
    // White's point is full of black already, all but one square.
    for (const square of white.slice(1)) board[square.row * size + square.col] = STONES.black;
    // One black piece sits one step from the last empty square of white's point.
    const last = white[0];
    const from = { row: last.row - 1, col: last.col };
    board[from.row * size + from.col] = STONES.black;
    const game: GameState = { ...createGame({ variant: "chineseCheckers" }), board, toPlay: STONES.black };

    expect(starFilled(game.board, size, STAR_RADIUS, STONES.black)).toBe(false);
    const options = pieceMoves(game, from);
    expect(options.some((point) => point.row === last.row && point.col === last.col)).toBe(true);

    const after = movePiece(game, from, last);
    expect(after.status).toBe(GAME_STATUS.won);
    expect(after.winner).toBe(STONES.black);
    expect(after.winBy).toBe(WIN_REASONS.camp);
  });
});
