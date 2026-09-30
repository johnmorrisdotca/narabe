import { describe, expect, it } from "vitest";

import { createGame, inMovePhase, isLegalMove, legalPoints, movePiece, pieceMoves } from "../engine.ts";
import { undoMove } from "./record.ts";
import { GAME_STATUS, STONES, WIN_REASONS } from "../constants.ts";
import type { Cell } from "../types.ts";
import { campFilled, campMoves, campOf, campSize, campSquares, piecesHome } from "./camps.ts";

const p = (row: number, col: number) => ({ row, col });
const key = (point: { row: number; col: number }) => `${point.row},${point.col}`;

describe("halma", () => {
  it("starts with both camps full and black to move, with nothing to place", () => {
    const game = createGame({ variant: "halma" });
    expect(game.settings.size).toBe(16);
    expect(campSize(16)).toBe(19);
    expect(game.board.filter((cell) => cell === STONES.black)).toHaveLength(19);
    expect(game.board.filter((cell) => cell === STONES.white)).toHaveLength(19);
    expect(game.moves).toEqual([]);
    expect(inMovePhase(game)).toBe(true);
    expect(legalPoints(game)).toEqual([]);
    expect(isLegalMove(game, p(8, 8))).toBe(false);
  });

  it("keeps the camps as mirror images in the two corners, on every board", () => {
    for (const [size, pieces] of [[8, 10], [10, 13], [16, 19]] as const) {
      const black = campSquares(size, STONES.black);
      const white = campSquares(size, STONES.white);
      expect(black).toHaveLength(pieces);
      expect(white).toHaveLength(pieces);
      expect(black.map(key)).toContain("0,0");
      expect(white.map(key)).toContain(`${size - 1},${size - 1}`);
      for (const point of black) {
        expect(campOf(size, point)).toBe(STONES.black);
        expect(campOf(size, p(size - 1 - point.row, size - 1 - point.col))).toBe(STONES.white);
      }
      expect(campOf(size, p(Math.floor(size / 2), Math.floor(size / 2)))).toBeNull();
    }
    const game = createGame({ variant: "halma", size: 8 });
    expect(game.settings.size).toBe(8);
    expect(game.board.filter((cell) => cell !== null)).toHaveLength(20);
  });

  it("lets a piece on the camp's edge step out, and one behind it jump over", () => {
    const game = createGame({ variant: "halma" });
    // The last camp row is (4,0) and (4,1); (4,1) steps into the open board.
    const steps = pieceMoves(game, p(4, 1)).map(key);
    expect(steps).toContain("5,0");
    expect(steps).toContain("5,1");
    expect(steps).toContain("5,2");
    expect(steps).toContain("4,2");
    expect(steps).not.toContain("3,1");
    // (3,2) jumps over (4,1) to (5,0), and over (4,2)? No: that square is empty.
    const jumps = pieceMoves(game, p(3, 2)).map(key);
    expect(jumps).toContain("5,0");
    expect(jumps).toContain("3,3");
    expect(jumps).not.toContain("5,2");
    // A white piece is not black's to move, and a stone of the other colour cannot be picked up.
    expect(pieceMoves(game, p(11, 14))).toEqual([]);
  });

  it("chains jumps over either colour and never lands twice on the same square", () => {
    const size = 8;
    const board: Cell[] = Array.from({ length: size * size }, () => null);
    const set = (row: number, col: number, stone: Cell) => {
      board[row * size + col] = stone;
    };
    set(0, 0, STONES.black);
    set(1, 1, STONES.white);
    set(3, 3, STONES.black);
    set(4, 5, STONES.white);
    const moves = campMoves(board, size, p(0, 0)).map(key);
    // One jump over (1,1) to (2,2); from there over (3,3) to (4,4); from there over (4,5) to (4,6).
    expect(moves).toContain("2,2");
    expect(moves).toContain("4,4");
    expect(moves).toContain("4,6");
    expect(moves).not.toContain("0,0");
    expect(new Set(moves).size).toBe(moves.length);
  });

  it("wins the moment the far camp is full, and undo takes it back", () => {
    let game = createGame({ variant: "halma", size: 8, allowUndo: true });
    // Fill white's camp with black pieces except the far corner (7,7); every neighbour of that corner
    // is in the camp and taken, so the last piece must jump in, from (5,5) over (6,6).
    const board: Cell[] = Array.from({ length: 64 }, () => null);
    for (const point of campSquares(8, STONES.white)) board[point.row * 8 + point.col] = STONES.black;
    board[7 * 8 + 7] = null;
    board[5 * 8 + 5] = STONES.black;
    // White's ten pieces sit in black's camp, bar one still on the way.
    for (const point of campSquares(8, STONES.black)) board[point.row * 8 + point.col] = STONES.white;
    game = { ...game, board };
    expect(campFilled(game.board, 8, STONES.black)).toBe(false);
    expect(piecesHome(game.board, 8, STONES.black)).toBe(9);

    expect(movePiece(game, p(5, 5), p(7, 6))).toBe(game); // occupied: not a move
    const stepped = movePiece(game, p(5, 5), p(5, 4));
    expect(stepped.status).toBe(GAME_STATUS.playing);
    expect(stepped.toPlay).toBe(STONES.white);
    const filled = movePiece(game, p(5, 5), p(7, 7));
    expect(filled.status).toBe(GAME_STATUS.won);
    expect(filled.winner).toBe(STONES.black);
    expect(filled.winBy).toBe(WIN_REASONS.camp);
    expect(filled.winningLine).toHaveLength(10);

    const undone = undoMove(filled);
    expect(undone.status).toBe(GAME_STATUS.playing);
    expect(undone.board).toEqual(game.board);
  });

  it("does not let a side save itself by staying at home", () => {
    const size = 8;
    const board: Cell[] = Array.from({ length: size * size }, () => null);
    // White leaves one piece in its own camp; black takes every other square of it.
    for (const point of campSquares(size, STONES.white)) board[point.row * size + point.col] = STONES.black;
    board[7 * size + 7] = STONES.white;
    expect(campFilled(board, size, STONES.black)).toBe(true);
    // And the camps at the start are nobody's win: full, but of the wrong colour.
    const start = createGame({ variant: "halma", size });
    expect(campFilled(start.board, size, STONES.black)).toBe(false);
    expect(campFilled(start.board, size, STONES.white)).toBe(false);
  });
});
