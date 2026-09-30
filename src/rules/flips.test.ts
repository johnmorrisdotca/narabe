import { describe, expect, it } from "vitest";

import { createGame, discCount, isLegalMove, legalPoints, playMove } from "../engine.ts";
import { undoMove } from "./record.ts";
import { GAME_STATUS, STONES, WIN_REASONS } from "../constants.ts";
import type { Cell, GameState } from "../types.ts";

const p = (row: number, col: number) => ({ row, col });

describe("reversi", () => {
  it("starts with the centre four set and black to play, with exactly four moves", () => {
    const game = createGame({ variant: "reversi" });
    expect(game.settings.size).toBe(8);
    expect(discCount(game.board)).toEqual({ black: 2, white: 2 });
    expect(game.moves).toEqual([]);
    expect(game.toPlay).toBe(STONES.black);
    // d3, c4, f5, e6 in the usual notation: the four squares that bracket a white disc.
    expect(legalPoints(game).map((pt) => `${pt.row},${pt.col}`).sort()).toEqual(
      ["2,3", "3,2", "4,5", "5,4"],
    );
  });

  it("turns the bracketed run and refuses a move that turns nothing", () => {
    const game = createGame({ variant: "reversi" });
    expect(isLegalMove(game, p(0, 0))).toBe(false);
    const after = playMove(game, p(2, 3));
    expect(after.board[3 * 8 + 3]).toBe(STONES.black);
    expect(discCount(after.board)).toEqual({ black: 4, white: 1 });
    expect(after.toPlay).toBe(STONES.white);
    expect(after.moves).toHaveLength(1);
  });

  it("turns runs in several directions at once, and only closed runs", () => {
    // A tiny position on a 4x4 board: black at the ends, white between.
    let game = createGame({ variant: "miniReversi", size: 4 });
    game = {
      ...game,
      board: [
        null, null, null, null,
        "black", "white", "white", null,
        "white", "white", null, null,
        "black", null, null, null,
      ],
    } as GameState;
    // Black at (1,3) brackets the row (1,1),(1,2). Nothing else closes.
    const after = playMove(game, p(1, 3));
    expect(after.board[1 * 4 + 1]).toBe(STONES.black);
    expect(after.board[1 * 4 + 2]).toBe(STONES.black);
    expect(after.board[2 * 4 + 0]).toBe(STONES.white);
    expect(after.board[2 * 4 + 1]).toBe(STONES.white);
  });

  it("passes the turn back when the other colour has no move", () => {
    let game = createGame({ variant: "miniReversi", size: 4 });
    game = {
      ...game,
      board: [
        "black", "black", "black", "black",
        "black", "black", "black", null,
        "black", "black", "white", null,
        "black", null, null, null,
      ],
      toPlay: STONES.black,
    } as GameState;
    // Black takes the white disc's last neighbour; white then has no move and black plays on.
    const after = playMove(game, p(1, 3));
    expect(after.status).toBe(GAME_STATUS.playing);
    expect(after.toPlay).toBe(STONES.black);
  });

  it("counts the discs when nobody can move, and the giveaway form inverts it", () => {
    const filled = (variant: "miniReversi" | "antiReversi") => {
      let game = createGame({ variant, size: variant === "antiReversi" ? 8 : 4 });
      const size = game.settings.size;
      const board: Cell[] = Array.from({ length: size * size }, () => STONES.white);
      // One square left, and black closes it: (0,0) black, (0,1) white, (0,2) black turns the one disc.
      board[0] = null;
      board[2] = STONES.black;
      game = { ...game, board, toPlay: STONES.black } as GameState;
      return playMove(game, p(0, 0));
    };
    const mini = filled("miniReversi");
    expect(mini.status).toBe(GAME_STATUS.won);
    expect(mini.winBy).toBe(WIN_REASONS.count);
    expect(mini.winner).toBe(STONES.white);
    const anti = filled("antiReversi");
    expect(anti.winner).toBe(STONES.black);
  });

  it("undoes a move by turning the discs back", () => {
    const game = createGame({ variant: "reversi", allowUndo: true });
    const after = playMove(game, p(2, 3));
    const undone = undoMove(after);
    expect(undone.board).toEqual(game.board);
    expect(undone.toPlay).toBe(STONES.black);
    expect(undone.moves).toEqual([]);
  });

  it("classic reversi lays the centre first, turning nothing, then plays as usual", () => {
    let game = createGame({ variant: "classicReversi" });
    expect(discCount(game.board)).toEqual({ black: 0, white: 0 });
    expect(legalPoints(game)).toHaveLength(4);
    expect(isLegalMove(game, p(0, 0))).toBe(false);
    game = playMove(game, p(3, 3));
    game = playMove(game, p(3, 4));
    game = playMove(game, p(4, 4));
    game = playMove(game, p(4, 3));
    expect(discCount(game.board)).toEqual({ black: 2, white: 2 });
    expect(game.toPlay).toBe(STONES.black);
    expect(legalPoints(game).length).toBeGreaterThan(0);
    expect(isLegalMove(game, p(0, 0))).toBe(false);
  });

  it("plays the small boards, which grow through their own sizes", () => {
    const game = createGame({ variant: "miniReversi", size: 6, allowResize: true });
    expect(game.settings.size).toBe(6);
    expect(discCount(game.board)).toEqual({ black: 2, white: 2 });
    expect(legalPoints(game)).toHaveLength(4);
  });
});

describe("the centre discs as a setting", () => {
  it("lets reversi start empty, with the players laying the first four", () => {
    const game = createGame({ variant: "reversi", openingDiscs: "laid" });
    expect(game.board.every((cell) => cell === null)).toBe(true);
    expect(legalPoints(game)).toHaveLength(4);
  });

  it("lets classic reversi start with the centre placed", () => {
    const game = createGame({ variant: "classicReversi", openingDiscs: "fixed" });
    expect(game.board.filter((cell) => cell !== null)).toHaveLength(4);
    expect(legalPoints(game)).toHaveLength(4);
  });

  it("means nothing outside the flipping games", () => {
    const game = createGame({ variant: "freestyle", openingDiscs: "fixed" });
    expect(game.board.every((cell) => cell === null)).toBe(true);
  });
});

describe("grand reversi", () => {
  it("is reversi on ten by ten and nothing else: the centre four, and the four openings around them", () => {
    const game = createGame({ variant: "grandReversi" });
    expect(game.settings.size).toBe(10);
    expect(discCount(game.board)).toEqual({ black: 2, white: 2 });
    expect(game.board[4 * 10 + 4]).toBe(STONES.white);
    expect(game.board[4 * 10 + 5]).toBe(STONES.black);
    expect(legalPoints(game).map((pt) => `${pt.row},${pt.col}`).sort()).toEqual(
      ["3,4", "4,3", "5,6", "6,5"],
    );
    const after = playMove(game, p(3, 4));
    expect(after.board[4 * 10 + 4]).toBe(STONES.black);
    expect(discCount(after.board)).toEqual({ black: 4, white: 1 });
  });

  it("refuses the small board: asked for eight, it plays ten", () => {
    const game = createGame({ variant: "grandReversi", size: 8 });
    expect(game.settings.size).toBe(10);
    expect(game.board).toHaveLength(100);
  });
});
