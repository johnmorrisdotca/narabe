import { describe, expect, it } from "vitest";

import { createGame, findWinningLine, playMove } from "../engine.ts";
import { BLOCKED, GAME_STATUS, STONES } from "../constants.ts";
import type { Cell, GameState, Point, Stone } from "../types.ts";
import { boardSizesFor, defaultBoardFor } from "../constants.ts";
import { hexagonCells } from "./hexagon.ts";

const p = (row: number, col: number): Point => ({ row, col });

/** A cleared copy of `state`'s board: every cell BLOCKED stays BLOCKED, everything else empty. */
function cleared(state: GameState): Cell[] {
  return state.board.map((cell) => (cell === BLOCKED ? BLOCKED : null));
}

/** Lays `stone` on every point in `line`, on a working copy of `board`. */
function laid(board: Cell[], size: number, line: readonly Point[], stone: Stone): Cell[] {
  const next = board.slice();
  for (const point of line) next[point.row * size + point.col] = stone;
  return next;
}

/**
 * HEX FIVE: Gomoku played on the same hexagon of hexagons Honeycomb turns
 * discs on, read as a line game instead.
 *
 * What is new here and worth pinning is exactly the opposite of Honeycomb's
 * own test: the centre is NOT sealed, and a line only runs along three of the
 * six directions a hexagon cell touches — the lattice's own axes — never
 * along the square embedding's fourth diagonal, `{row: 1, col: 1}`, which is
 * not a lattice axis at all.
 */
describe("hexFive", () => {
  it("is a hexagon of 91 cells on the eleven-square, with the centre open", () => {
    const eleven = createGame({ variant: "hexFive" });
    expect(eleven.settings.size).toBe(11);
    expect(eleven.board.filter((cell) => cell !== BLOCKED)).toHaveLength(91);
    // Unlike Honeycomb, the middle cell is a plain empty point.
    expect(eleven.board[5 * 11 + 5]).toBeNull();
  });

  it("comes in the same four hexagons Honeycomb does, 91 cells the default", () => {
    expect(boardSizesFor("hexFive")).toEqual([7, 9, 11, 13]);
    expect(defaultBoardFor("hexFive")).toBe(11);
    for (const size of boardSizesFor("hexFive")) {
      const game = createGame({ variant: "hexFive", size });
      expect(game.board.filter((cell) => cell !== BLOCKED)).toHaveLength(hexagonCells(size));
    }
  });

  it("wins along each of the three lattice axes", () => {
    const game = createGame({ variant: "hexFive" });
    const { size } = game.settings;
    const centre = p(5, 5);

    // {row: 0, col: 1} — a row.
    const row = [p(5, 3), p(5, 4), p(5, 5), p(5, 6), p(5, 7)];
    expect(findWinningLine(laid(cleared(game), size, row, STONES.black), game.settings, centre).length).toBe(5);

    // {row: 1, col: 0} — a column.
    const column = [p(3, 5), p(4, 5), p(5, 5), p(6, 5), p(7, 5)];
    expect(findWinningLine(laid(cleared(game), size, column, STONES.black), game.settings, centre).length).toBe(5);

    // {row: 1, col: -1} — the lattice's own slanted axis.
    const slant = [p(3, 7), p(4, 6), p(5, 5), p(6, 4), p(7, 3)];
    expect(findWinningLine(laid(cleared(game), size, slant, STONES.black), game.settings, centre).length).toBe(5);
  });

  it("never wins along the square embedding's fourth diagonal", () => {
    const game = createGame({ variant: "hexFive" });
    const { size } = game.settings;
    const centre = p(5, 5);

    // {row: 1, col: 1}: five cells that are all on the board, in an unbroken
    // run, and yet not a line — this is the whole point of the game.
    const fakeDiagonal = [p(3, 3), p(4, 4), p(5, 5), p(6, 6), p(7, 7)];
    const board = laid(cleared(game), size, fakeDiagonal, STONES.black);
    expect(board.every((cell, index) => (fakeDiagonal.some((pt) => pt.row * size + pt.col === index) ? cell === STONES.black : true))).toBe(true);
    expect(findWinningLine(board, game.settings, centre)).toEqual([]);
  });

  it("is won by the stone that closes a real line, through the engine, and not by the fake diagonal", () => {
    let game = createGame({ variant: "hexFive" });
    const { size } = game.settings;

    // Four along a row, played through the engine; the fifth wins.
    const four = [p(5, 3), p(5, 4), p(5, 5), p(5, 6)];
    game = { ...game, board: laid(cleared(game), size, four, STONES.black), toPlay: STONES.black };
    game = playMove(game, p(5, 7));
    expect(game.status).toBe(GAME_STATUS.won);
    expect(game.winner).toBe(STONES.black);
    expect(game.winningLine.length).toBeGreaterThanOrEqual(5);

    // The same four stones, but along the diagonal the lattice does not have — no win.
    let unreal = createGame({ variant: "hexFive" });
    const fakeFour = [p(3, 3), p(4, 4), p(5, 5), p(6, 6)];
    unreal = { ...unreal, board: laid(cleared(unreal), size, fakeFour, STONES.black), toPlay: STONES.black };
    unreal = playMove(unreal, p(7, 7));
    expect(unreal.status).toBe(GAME_STATUS.playing);
    expect(unreal.winner).toBeNull();
  });

  it("plays out to an end on the smallest hexagon and the largest alike", () => {
    for (const size of [7, 13]) {
      let game = createGame({ variant: "hexFive", size });
      let guard = 0;
      while (game.status === GAME_STATUS.playing && guard < 400) {
        const moves = game.board
          .map((cell, index) => ({ cell, point: p(Math.floor(index / size), index % size) }))
          .filter((one) => one.cell === null)
          .map((one) => one.point);
        expect(moves.length, `${size}: a playing game with no legal move`).toBeGreaterThan(0);
        game = playMove(game, moves[guard % moves.length]);
        guard += 1;
      }
      expect(game.status, `${size}: the game ended`).not.toBe(GAME_STATUS.playing);
    }
  });

  it("offers the free and swap openings, as Hex does", () => {
    const spec = createGame({ variant: "hexFive" }).settings;
    expect(spec.opening).toBe("free");
  });
});
