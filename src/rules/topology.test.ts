import { describe, expect, it } from "vitest";

import { cellAt, createGame, playMove } from "../engine.ts";
import { GAME_STATUS, HOT, RULE_VARIANTS, STONES, WRAP_MODES, VARIANT_SPECS } from "../constants.ts";
import { randomSquares } from "../obstacles.ts";
import type { Cell, GameState, Point, Stone } from "../types.ts";

const p = (row: number, col: number): Point => ({ row, col });

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

/** Black's stones with white answering harmlessly far away each turn. */
function blackLine(state: GameState, blacks: Point[], whites: Point[]): GameState {
  const order: Point[] = [];
  blacks.forEach((point, i) => {
    order.push(point);
    if (whites[i] !== undefined) order.push(whites[i]);
  });
  return play(state, order);
}

describe("Toroidal Five", () => {
  const game = () => createGame({ variant: RULE_VARIANTS.toroidalFive, size: 9 });

  it("joins both pairs of edges", () => {
    expect(VARIANT_SPECS.toroidalFive.wrap).toBe(WRAP_MODES.both);
  });

  it("wins on a row that runs off the right edge and back on the left", () => {
    // Columns 7, 8, 0, 1, 2 on row 4 — a five only because the edges join.
    const state = blackLine(
      game(),
      [p(4, 7), p(4, 8), p(4, 0), p(4, 1), p(4, 2)],
      [p(0, 0), p(0, 2), p(0, 4), p(0, 6)],
    );
    expect(state.winner).toBe("black");
  });

  it("wins on a column that runs off the bottom and back on the top", () => {
    // Rows 7, 8, 0, 1, 2 in column 4 — the wrap a cylinder would not give.
    const state = blackLine(
      game(),
      [p(7, 4), p(8, 4), p(0, 4), p(1, 4), p(2, 4)],
      [p(0, 0), p(0, 2), p(6, 6), p(6, 8)],
    );
    expect(state.winner).toBe("black");
  });

  it("wins on a diagonal that wraps both ways at once", () => {
    const state = blackLine(
      game(),
      [p(7, 7), p(8, 8), p(0, 0), p(1, 1), p(2, 2)],
      [p(0, 4), p(0, 6), p(4, 0), p(4, 6)],
    );
    expect(state.winner).toBe("black");
  });

  it("does not award a win to four stones that merely wrap", () => {
    const state = blackLine(
      game(),
      [p(4, 7), p(4, 8), p(4, 0), p(4, 1)],
      [p(0, 0), p(0, 2), p(0, 4)],
    );
    expect(state.status).toBe("playing");
    expect(state.winner).toBeNull();
  });

  /**
   * The distinctness rule: a run has to be five separate stones. Three stones
   * on a wrapping line must not be counted twice — once walking each way — and
   * called a five.
   */
  it("does not let a short line meet itself around the board", () => {
    const state = blackLine(
      game(),
      [p(4, 0), p(4, 1), p(4, 2)],
      [p(0, 0), p(0, 2)],
    );
    expect(state.status).toBe("playing");
  });

  it("leaves a plain board unwrapped", () => {
    // The same five split across the edge is not a line in freestyle.
    const state = blackLine(
      createGame({ variant: RULE_VARIANTS.freestyle, size: 9 }),
      [p(4, 7), p(4, 8), p(4, 0), p(4, 1), p(4, 2)],
      [p(0, 0), p(0, 2), p(0, 4), p(0, 6)],
    );
    expect(state.status).toBe("playing");
  });
});

describe("Obstacle Five", () => {
  const game = (seed = 7) =>
    createGame({ variant: RULE_VARIANTS.obstacleFive, size: 15, seed });

  it("scatters the squares the spec asks for", () => {
    const { dead, hot } = randomSquares(game().settings);
    expect(dead).toHaveLength(VARIANT_SPECS.obstacleFive.deadSquares);
    expect(hot).toHaveLength(VARIANT_SPECS.obstacleFive.hotSquares);
  });

  it("puts the same squares in the same places for the same seed", () => {
    expect(randomSquares(game(42).settings)).toEqual(randomSquares(game(42).settings));
  });

  it("puts them somewhere else for a different seed", () => {
    expect(randomSquares(game(1).settings)).not.toEqual(randomSquares(game(2).settings));
  });

  it("refuses a stone on a dead square", () => {
    const state = game();
    const [dead] = randomSquares(state.settings).dead;
    expect(cellAt(state, dead)).toBe("blocked");
    expect(playMove(state, dead)).toBe(state);
  });

  it("keeps the board otherwise playable", () => {
    const state = game();
    const { dead, hot } = randomSquares(state.settings);
    const taken = new Set([...dead, ...hot].map((q) => `${q.row},${q.col}`));
    const free = p(0, 0);
    // A corner the scatter avoids, so an ordinary stone still lands.
    if (!taken.has("0,0")) {
      expect(playMove(state, free)).not.toBe(state);
    }
  });

  /**
   * A board of our own: the seed's squares cleared, one hotspot at the centre
   * of row 7, and the given stones laid. Black is to move.
   */
  function hotRow(black: number[], white: number[], toPlay: Stone = STONES.black): GameState {
    const state = game();
    const board: Cell[] = state.board.map(() => null);
    board[7 * 15 + 7] = HOT;
    for (const col of black) board[7 * 15 + col] = STONES.black;
    for (const col of white) board[7 * 15 + col] = STONES.white;
    return { ...state, board, toPlay };
  }

  it("counts a hotspot in a five of either colour", () => {
    // x x x * _ : black's stone on the gap makes five through the hotspot.
    const black = playMove(hotRow([4, 5, 6], []), p(7, 8));
    expect(black.winner).toBe(STONES.black);
    expect(black.winningLine).toHaveLength(5);
    // o o o * _ : the same hotspot finishes white's five just as well.
    const white = playMove(hotRow([], [4, 5, 6], STONES.white), p(7, 8));
    expect(white.winner).toBe(STONES.white);
    expect(white.winningLine).toHaveLength(5);
  });

  it("never makes a stone finish the other colour's five: it blocks it, and nobody loses", () => {
    // o o o * _ with black to move. The gap would finish white's five; black's stone there only blocks it.
    const blocked = playMove(hotRow([], [4, 5, 6]), p(7, 8));
    expect(cellAt(blocked, p(7, 8))).toBe(STONES.black);
    expect(blocked.status).toBe(GAME_STATUS.playing);
    expect(blocked.winner).toBeNull();
    expect(blocked.toPlay).toBe(STONES.white);
  });

  it("gives a hotspot shared by both colours' lines to whoever makes five with their own stone", () => {
    // Column 7 holds white's o o o above the hotspot; row 7 holds black's x x x beside it.
    const state = hotRow([4, 5, 6], []);
    const board = state.board.slice();
    for (const row of [4, 5, 6]) board[row * 15 + 7] = STONES.white;
    const shared = { ...state, board };
    const next = playMove(shared, p(7, 8));
    expect(next.winner).toBe(STONES.black);
    expect(next.winningLine).toContainEqual(p(7, 7));
  });

  it("does not scatter anything on a plain game", () => {
    const plain = createGame({ variant: RULE_VARIANTS.freestyle, size: 15, seed: 7 });
    const { dead, hot } = randomSquares(plain.settings);
    expect([...dead, ...hot]).toEqual([]);
  });
});
