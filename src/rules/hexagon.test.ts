import { describe, expect, it } from "vitest";

import { createGame, discCount, isLegalMove, legalPoints, playMove } from "../engine.ts";
import { BLOCKED, GAME_STATUS, STONES } from "../constants.ts";
import {
  hexagonCells,
  hexagonCorners,
  hexagonDistance,
  hexagonSide,
  honeycombPlayable,
  honeycombStartingDiscs,
  inHexagon,
} from "./hexagon.ts";
import { boardSizesFor, defaultBoardFor } from "../constants.ts";

const p = (row: number, col: number) => ({ row, col });
const key = (point: { row: number; col: number }) => `${point.row},${point.col}`;

/**
 * HONEYCOMB: the flipping game on a hexagon of hexagons.
 *
 * What is new here and worth pinning is exactly what is not Reversi: the
 * shape of the board, the sealed centre, the ring of six, and — the whole of
 * the difference in play — that a run lies along six directions and never
 * along the two diagonals the lattice does not have.
 */
describe("honeycomb", () => {
  it("is a hexagon of 91 cells on the eleven-square, with the centre sealed", () => {
    const eleven = createGame({ variant: "honeycomb" });
    expect(eleven.settings.size).toBe(11);
    const open = eleven.board.filter((cell) => cell !== BLOCKED).length;
    expect(open).toBe(91 - 1);
    expect(eleven.board[5 * 11 + 5]).toBe(BLOCKED);

    // A size it does not come in falls to the first it does.
    expect(createGame({ variant: "honeycomb", size: 15 }).settings.size).toBe(11);
  });

  /*
   * FOUR BOARDS, and the one property that has to hold on every one of them:
   * the count of cells left to fill is EVEN. That is the whole reason the
   * centre is sealed rather than a matter of taste — an odd number of cells
   * on a game decided by counting discs means the last cell decides it, and
   * no board here should be won by arithmetic.
   */
  it("comes in four hexagons, each with an even number of cells to fill", () => {
    // In numerical order, which is the order every picker on the site draws
    // them in; the board the game OPENS on is said separately.
    expect(boardSizesFor("honeycomb")).toEqual([7, 9, 11, 13]);
    expect(defaultBoardFor("honeycomb"), "91 cells: the board Hexversi is played on").toBe(11);
    const shapes = boardSizesFor("honeycomb").map((size) => ({
      size,
      side: hexagonSide(size),
      cells: hexagonCells(size),
    }));
    expect(shapes).toEqual([
      { size: 7, side: 4, cells: 37 },
      { size: 9, side: 5, cells: 61 },
      { size: 11, side: 6, cells: 91 },
      { size: 13, side: 7, cells: 127 },
    ]);

    for (const { size, cells } of shapes) {
      const game = createGame({ variant: "honeycomb", size });
      expect(game.settings.size, `honeycomb is offered on ${size}`).toBe(size);
      // The board it is actually played on: every cell but the sealed centre.
      const open = game.board.filter((cell) => cell !== BLOCKED).length;
      expect(open, `${size}: cells in play`).toBe(cells - 1);
      expect(open, `${size}: honeycombPlayable agrees`).toBe(honeycombPlayable(size));
      expect(open % 2, `${size}: an even number of cells to fill`).toBe(0);
      // The ring of six is set, and the centre of the square is the sealed cell.
      expect(discCount(game.board), `${size}: the ring of six`).toEqual({ black: 3, white: 3 });
      const middle = (size - 1) / 2;
      expect(game.board[middle * size + middle], `${size}: the centre is sealed`).toBe(BLOCKED);
      // Six corners, all in the hexagon, none of them the same cell twice.
      const corners = hexagonCorners(size);
      expect(new Set(corners.map(key)).size, `${size}: six distinct corners`).toBe(6);
      for (const corner of corners) expect(inHexagon(size, corner), `${size}: ${key(corner)} is on the board`).toBe(true);
    }
  });

  it("plays out to a count on the smallest hexagon and the largest alike", () => {
    for (const size of [7, 13]) {
      let game = createGame({ variant: "honeycomb", size });
      let guard = 0;
      while (game.status === GAME_STATUS.playing && guard < 400) {
        const moves = legalPoints(game);
        expect(moves.length, `${size}: a playing game with no move for the colour to play`).toBeGreaterThan(0);
        game = playMove(game, moves[guard % moves.length]);
        guard += 1;
      }
      expect(game.status, `${size}: the game ended`).not.toBe(GAME_STATUS.playing);
    }
  });

  it("keeps the square's corners out and the hexagon's in", () => {
    expect(inHexagon(11, p(0, 0))).toBe(false);
    expect(inHexagon(11, p(10, 10))).toBe(false);
    expect(inHexagon(11, p(0, 10))).toBe(true);
    expect(inHexagon(11, p(10, 0))).toBe(true);
    expect(inHexagon(11, p(0, 5))).toBe(true);
    expect(hexagonDistance(11, p(5, 5))).toBe(0);
    expect(hexagonDistance(11, p(0, 5))).toBe(5);
    // Six corners, each at full radius.
    expect(hexagonCorners(11).map(key).sort()).toEqual(["0,10", "0,5", "10,0", "10,5", "5,0", "5,10"].sort());
  });

  it("starts with three of each colour round the sealed centre and black to play", () => {
    const game = createGame({ variant: "honeycomb" });
    expect(discCount(game.board)).toEqual({ black: 3, white: 3 });
    expect(game.toPlay).toBe(STONES.black);
    const ring = honeycombStartingDiscs(11);
    // No two of a colour side by side round the ring.
    for (let at = 0; at < 6; at += 1) {
      expect(ring[at].stone).not.toBe(ring[(at + 1) % 6].stone);
    }
    // Every legal first move brackets exactly one white disc against a black one.
    const first = legalPoints(game);
    expect(first.length).toBeGreaterThan(0);
    for (const point of first) {
      const after = playMove(game, point);
      expect(discCount(after.board)).toEqual({ black: 5, white: 2 });
    }
  });

  it("brackets along the six lattice directions and never the other two diagonals", () => {
    let game = createGame({ variant: "honeycomb" });
    // Lay a run by hand on the lattice's slant, which IS a direction here:
    // black at (5,3), white at (5,4) — then (5,5) is sealed, so use a row instead.
    game = { ...game, board: game.board.map((cell) => (cell === BLOCKED ? BLOCKED : null)) };
    const put = (row: number, col: number, stone: "black" | "white") => {
      game.board[row * 11 + col] = stone;
    };
    // Along a row: black, white, then an empty cell — a bracket for black.
    put(2, 3, "black");
    put(2, 4, "white");
    expect(isLegalMove({ ...game, toPlay: STONES.black }, p(2, 5))).toBe(true);
    // Along the diagonal the lattice does NOT have, (+1,+1): black, white, empty is NOT a bracket.
    put(6, 6, "black");
    put(7, 7, "white");
    expect(isLegalMove({ ...game, toPlay: STONES.black }, p(8, 8))).toBe(false);
    // Along the one it does, (+1,-1): black at (3,8), white at (4,7), empty (5,6).
    put(3, 8, "black");
    put(4, 7, "white");
    expect(isLegalMove({ ...game, toPlay: STONES.black }, p(5, 6))).toBe(true);
  });

  it("turns nothing through the sealed centre", () => {
    let game = createGame({ variant: "honeycomb" });
    game = { ...game, board: game.board.map((cell) => (cell === BLOCKED ? BLOCKED : null)) };
    // Black at (5,3), white at (5,4), the sealed centre at (5,5), then empty (5,6):
    // the run is broken by the wall, so (5,6) brackets nothing.
    game.board[5 * 11 + 3] = "black";
    game.board[5 * 11 + 4] = "white";
    expect(isLegalMove({ ...game, toPlay: STONES.black }, p(5, 6))).toBe(false);
    // And the sealed cell itself can never be played.
    expect(isLegalMove({ ...game, toPlay: STONES.black }, p(5, 5))).toBe(false);
  });

  it("plays out to a count, passing a stuck colour by", () => {
    let game = createGame({ variant: "honeycomb", size: 9 });
    let guard = 0;
    while (game.status === GAME_STATUS.playing && guard < 200) {
      const moves = legalPoints(game);
      expect(moves.length, "a playing game with no move for the colour to play").toBeGreaterThan(0);
      game = playMove(game, moves[guard % moves.length]);
      guard += 1;
    }
    expect(game.status).not.toBe(GAME_STATUS.playing);
    const count = discCount(game.board);
    if (game.status === GAME_STATUS.won) {
      expect(game.winner).toBe(count.black > count.white ? STONES.black : STONES.white);
    } else {
      expect(count.black).toBe(count.white);
    }
  });
});
