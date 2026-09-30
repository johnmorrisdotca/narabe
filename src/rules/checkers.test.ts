import { describe, expect, it } from "vitest";

import { createGame, movePiece, pieceMoves } from "../engine.ts";
import { undoMove } from "./record.ts";
import { GAME_STATUS, STONES, WIN_REASONS } from "../constants.ts";
import type { GameState } from "../types.ts";
import {
  applyCheckersMove,
  checkersHasAnyMove,
  checkersHasCapture,
  checkersStartingPieces,
  isDarkSquare,
  isKingAt,
} from "./checkers.ts";

const p = (row: number, col: number) => ({ row, col });

describe("checkers", () => {
  it("starts twelve pieces a side, filling the dark squares of the first three rows", () => {
    const game = createGame({ variant: "checkers" });
    expect(game.settings.size).toBe(8);
    const black = game.board.filter((cell) => cell === STONES.black).length;
    const white = game.board.filter((cell) => cell === STONES.white).length;
    expect(black).toBe(12);
    expect(white).toBe(12);
    // Every piece stands on a dark square.
    game.board.forEach((cell, index) => {
      if (cell === null) return;
      const point = p(Math.floor(index / 8), index % 8);
      expect(isDarkSquare(point)).toBe(true);
    });
    // Black fills rows 0-2, white rows 5-7, and the middle two rows are empty.
    expect(checkersStartingPieces(8).filter((piece) => piece.point.row === 3 || piece.point.row === 4)).toHaveLength(0);
  });

  it("moves a man one square diagonally forward, and refuses a step backward or sideways", () => {
    let game = createGame({ variant: "checkers", firstPlayer: STONES.black });
    // Black's man at (2,1) may step to (3,0) or (3,2), not back to (1,0) or (1,2).
    const moves = pieceMoves(game, p(2, 1)).map((point) => `${point.row},${point.col}`);
    expect(moves.sort()).toEqual(["3,0", "3,2"]);

    game = movePiece(game, p(2, 1), p(3, 0));
    expect(game.board[3 * 8 + 0]).toBe(STONES.black);
    expect(game.board[2 * 8 + 1]).toBeNull();
    expect(game.toPlay).toBe(STONES.white);
  });

  it("captures by jumping an adjacent enemy piece into the empty square beyond", () => {
    // Hand-built position: a lone black man at (3,2), a lone white man at (4,3)
    // with (5,4) empty behind it, nothing else on the board.
    const size = 8;
    const board = new Array(size * size).fill(null);
    board[3 * size + 2] = STONES.black;
    board[4 * size + 3] = STONES.white;
    let game: GameState = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };

    const jumps = pieceMoves(game, p(3, 2));
    expect(jumps).toEqual([p(5, 4)]);

    game = movePiece(game, p(3, 2), p(5, 4));
    expect(game.board[5 * size + 4]).toBe(STONES.black);
    expect(game.board[4 * size + 3], "the jumped piece is captured").toBeNull();
    expect(game.captures.black).toBe(1);
    // White's only piece is gone, so white has no move left: the capture wins outright.
    expect(game.status).toBe(GAME_STATUS.won);
    expect(game.winner).toBe(STONES.black);
    expect(game.winBy).toBe(WIN_REASONS.blocked);
  });

  it("forces a capture: a colour that can jump may not play a plain step instead", () => {
    const size = 8;
    const board = new Array(size * size).fill(null);
    // Black has two men: one that can capture, one that could only step.
    board[3 * size + 2] = STONES.black;
    board[4 * size + 3] = STONES.white;
    board[2 * size + 5] = STONES.black;
    const game = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };

    expect(checkersHasCapture(game.board, game.kings, size, STONES.black)).toBe(true);
    // The piece with no capture of its own is offered nothing at all.
    expect(pieceMoves(game, p(2, 5))).toEqual([]);
    // The capturing piece is only offered the capture, not a plain step.
    expect(pieceMoves(game, p(3, 2))).toEqual([p(5, 4)]);
  });

  it("chains a second capture with the same piece in the same move", () => {
    const size = 8;
    const board = new Array(size * size).fill(null);
    board[2 * size + 1] = STONES.black;
    board[3 * size + 2] = STONES.white;
    board[5 * size + 4] = STONES.white;
    let game: GameState = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };

    // First jump: (2,1) over (3,2) lands on (4,3).
    game = movePiece(game, p(2, 1), p(4, 3));
    expect(game.status).toBe(GAME_STATUS.playing);
    // Still black's move: a further capture from (4,3) is waiting.
    expect(game.toPlay).toBe(STONES.black);
    expect(game.chainAt).toEqual(p(4, 3));
    // Only the chained piece may move, and only by capturing.
    expect(pieceMoves(game, p(4, 3))).toEqual([p(6, 5)]);

    game = movePiece(game, p(4, 3), p(6, 5));
    expect(game.board[3 * size + 2]).toBeNull();
    expect(game.board[5 * size + 4]).toBeNull();
    expect(game.captures.black).toBe(2);
    expect(game.chainAt).toBeNull();
    // Both of white's pieces are gone: white has no move left, and black wins.
    expect(game.status).toBe(GAME_STATUS.won);
    expect(game.winner).toBe(STONES.black);
    expect(game.winBy).toBe(WIN_REASONS.blocked);
  });

  it("crowns a man that reaches the far row, and stops the move there even mid-chain", () => {
    const size = 8;
    const board = new Array(size * size).fill(null);
    // One more jump would land black on row 7 — the crowning row — with another
    // capture waiting beyond it. The crown still ends the move.
    board[5 * size + 4] = STONES.black;
    board[6 * size + 5] = STONES.white;
    board[6 * size + 3] = STONES.white;
    let game: GameState = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };

    game = movePiece(game, p(5, 4), p(7, 6));
    expect(isKingAt(game.kings, p(7, 6))).toBe(true);
    // A further capture is sitting right there, but the move is over.
    expect(game.chainAt).toBeNull();
    expect(game.toPlay).toBe(STONES.white);
  });

  it("lets a king move and capture backward as well as forward", () => {
    const size = 8;
    const board = new Array(size * size).fill(null);
    board[4 * size + 4] = STONES.black;
    const game = {
      ...createGame({ variant: "checkers" }),
      board,
      kings: [p(4, 4)],
      toPlay: STONES.black,
    };
    const moves = pieceMoves(game, p(4, 4)).map((point) => `${point.row},${point.col}`).sort();
    expect(moves).toEqual(["3,3", "3,5", "5,3", "5,5"]);
  });

  it("wins by leaving the other side with no piece that can move", () => {
    const size = 8;
    const board = new Array(size * size).fill(null);
    // White's one man sits on its own crowning row without ever having been
    // crowned (a hand-built fixture): its only directions run off the board,
    // so it has no move at all, whatever else is on the board.
    board[0 * size + 1] = STONES.white;
    board[1 * size + 0] = STONES.black;
    let game: GameState = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };

    expect(checkersHasAnyMove(game.board, game.kings, size, STONES.white)).toBe(false);
    // Black takes its only move, which does not touch white at all — white
    // was already the side with nothing to play.
    const from = p(1, 0);
    game = movePiece(game, from, pieceMoves(game, from)[0]);
    expect(game.status).toBe(GAME_STATUS.won);
    expect(game.winner).toBe(STONES.black);
    expect(game.winBy).toBe(WIN_REASONS.blocked);
  });

  it("undoes a capture, restoring the jumped piece and the mover's square", () => {
    const size = 8;
    const board = new Array(size * size).fill(null);
    board[3 * size + 2] = STONES.black;
    board[4 * size + 3] = STONES.white;
    const before = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black, allowUndo: true };
    const game = { ...before, settings: { ...before.settings, allowUndo: true } };
    const after = movePiece(game, p(3, 2), p(5, 4));
    const undone = undoMove(after);
    expect(undone.board).toEqual(game.board);
    expect(undone.toPlay).toBe(STONES.black);
    expect(undone.captures.black).toBe(0);
  });

  it("undoes a chained capture back to the middle of the chain", () => {
    const size = 8;
    const board = new Array(size * size).fill(null);
    board[2 * size + 1] = STONES.black;
    board[3 * size + 2] = STONES.white;
    board[5 * size + 4] = STONES.white;
    const before = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };
    const game = { ...before, settings: { ...before.settings, allowUndo: true } };
    const first = movePiece(game, p(2, 1), p(4, 3));
    const second = movePiece(first, p(4, 3), p(6, 5));
    const undone = undoMove(second);
    expect(undone.board).toEqual(first.board);
    expect(undone.chainAt).toEqual(p(4, 3));
    expect(undone.toPlay).toBe(STONES.black);
  });

  it("keeps applyCheckersMove pure: the state handed in is never mutated", () => {
    const size = 8;
    const board = new Array(size * size).fill(null);
    board[3 * size + 2] = STONES.black;
    board[4 * size + 3] = STONES.white;
    const game = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };
    const before = game.board.slice();
    applyCheckersMove(game, p(3, 2), p(5, 4));
    expect(game.board).toEqual(before);
  });
});
