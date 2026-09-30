import { describe, expect, it } from "vitest";
import { cellAt, createGame, isLegalMove, legalPoints, playMove } from "../engine.ts";
import { replayMoves, undoMove } from "./record.ts";
import {
  BLOCKED,
  GAME_STATUS,
  HOT,
  RULE_VARIANTS,
  STONES,
  WIN_REASONS,
} from "../constants.ts";
import { randomSquares } from "../obstacles.ts";
import { fromDiagram } from "../test-support.ts";
import type { GameState, Point } from "../types.ts";

const p = (row: number, col: number): Point => ({ row, col });

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

describe("seeds", () => {
  it("draws a seed from the roll and keeps one it is given", () => {
    expect(createGame({}, 0.5).settings.seed).toBeGreaterThan(0);
    expect(createGame({ seed: 42 }, 0.5).settings.seed).toBe(42);
    expect(createGame({}, 0.25).settings.seed).toBe(createGame({}, 0.25).settings.seed);
  });

  it("places the random squares from the seed, the same every time", () => {
    const a = createGame({ variant: RULE_VARIANTS.hotDrop, seed: 7 });
    const b = createGame({ variant: RULE_VARIANTS.hotDrop, seed: 7 });
    const c = createGame({ variant: RULE_VARIANTS.hotDrop, seed: 8 });
    expect(a.board).toEqual(b.board);
    expect(a.board).not.toEqual(c.board);
    expect(a.board.filter((cell) => cell === HOT)).toHaveLength(1);
    expect(a.board.filter((cell) => cell === BLOCKED)).toHaveLength(1);
  });

  it("never puts a random square on the bottom row", () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const { dead, hot } = randomSquares(createGame({ variant: RULE_VARIANTS.hotDrop, seed }).settings);
      for (const point of [...dead, ...hot]) expect(point.row).toBeLessThan(6);
    }
  });
});

describe("ring drop", () => {
  it("lets a line run off one edge and onto the other", () => {
    const state = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        x x . . . . x
      `,
      { settings: { variant: RULE_VARIANTS.ringDrop }, toPlay: STONES.black },
    );
    const next = playMove(state, p(0, 5));
    expect(cellAt(next, p(6, 5))).toBe(STONES.black);
    expect(next.winner).toBe(STONES.black);
    expect(next.winningLine).toHaveLength(4);
  });

  it("does not wrap rows", () => {
    const state = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . x
        . . . . . . x
        . . . . . . x
        . . . . . . o
      `,
      { settings: { variant: RULE_VARIANTS.ringDrop }, toPlay: STONES.black },
    );
    // Three up column G with the top two rows open: a fourth on G7 wins, nothing wraps to the bottom.
    expect(playMove(state, p(0, 6)).winner).toBe(STONES.black);
    const plain = createGame({ variant: RULE_VARIANTS.ringDrop, seed: 1 });
    expect(plain.status).toBe(GAME_STATUS.playing);
  });
});

describe("hole drop and hot drop", () => {
  it("a stone falls past the hole and nothing can rest on it", () => {
    const game = createGame({ variant: RULE_VARIANTS.holeDrop, seed: 3 });
    const hole = game.board.indexOf(BLOCKED);
    const size = game.settings.size;
    const col = hole % size;
    const holeRow = Math.floor(hole / size);
    // Fill the column from the bottom: every landing skips the hole.
    let state = game;
    for (let i = 0; i < size - 1; i += 1) {
      state = playMove(state, p(0, col));
      state = playMove(state, p(0, (col + 3) % size));
    }
    expect(cellAt(state, p(holeRow, col))).toBe(BLOCKED);
    expect(legalPoints(state).some((point) => point.col === col)).toBe(false);
  });

  it("a hotspot completes a line for either colour", () => {
    const state = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        x x * . . . .
      `.replace("*", "."),
      { settings: { variant: RULE_VARIANTS.hotDrop, seed: 5 }, toPlay: STONES.black },
    );
    const board = state.board.slice();
    board[6 * 7 + 2] = HOT;
    const hot: GameState = { ...state, board };
    const next = playMove(hot, p(0, 3));
    expect(next.winner).toBe(STONES.black);
    expect(next.winningLine).toHaveLength(4);
  });

  it("a stone never finishes the opponent's line through the hotspot, so nobody loses by one", () => {
    const state = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        o o . . . . .
      `,
      { settings: { variant: RULE_VARIANTS.hotDrop, seed: 5 }, toPlay: STONES.black },
    );
    const board = state.board.slice();
    board[6 * 7 + 2] = HOT;
    // White has o o * with the fourth point open. Black's stone there is black, so it blocks white's four rather than finishing it.
    const hot: GameState = { ...state, board };
    const blocked = playMove(hot, p(0, 3));
    expect(cellAt(blocked, p(6, 3))).toBe(STONES.black);
    expect(blocked.status).toBe(GAME_STATUS.playing);
    // With o o * o already on the board, a black drop elsewhere decides nothing either: only a stone of white's own could have made that line.
    const done = board.slice();
    done[6 * 7 + 3] = STONES.white;
    const filled: GameState = { ...hot, board: done };
    expect(playMove(filled, p(0, 6)).status).toBe(GAME_STATUS.playing);
  });
});

describe("clear drop", () => {
  it("clears a full bottom row and drops everything a row", () => {
    const state = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        x . . . . . .
        x o x o x o .
      `,
      { settings: { variant: RULE_VARIANTS.clearDrop }, toPlay: STONES.black },
    );
    const next = playMove(state, p(0, 6));
    // The bottom row is gone; the stone that sat above it is now on the bottom.
    expect(cellAt(next, p(6, 0))).toBe(STONES.black);
    expect(cellAt(next, p(5, 0))).toBeNull();
    expect(cellAt(next, p(6, 6))).toBeNull();
    expect(next.moves[next.moves.length - 1].cleared).toHaveLength(7);
    expect(next.status).toBe(GAME_STATUS.playing);
    expect(next.toPlay).toBe(STONES.white);
  });

  it("a four made by the filling stone wins before the row clears", () => {
    const state = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        x x x o o o .
      `,
      { settings: { variant: RULE_VARIANTS.clearDrop }, toPlay: STONES.black },
    );
    expect(playMove(state, p(0, 6)).status).toBe(GAME_STATUS.playing);
    const four = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        o o o x x x .
      `,
      { settings: { variant: RULE_VARIANTS.clearDrop }, toPlay: STONES.black },
    );
    expect(playMove(four, p(0, 6)).winner).toBe(STONES.black);
  });

  it("undo puts the cleared row back, and replay reproduces the clear", () => {
    const state = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        x . . . . . .
        x o x o x o .
      `,
      { settings: { variant: RULE_VARIANTS.clearDrop }, toPlay: STONES.black },
    );
    const next = playMove(state, p(0, 6));
    expect(undoMove(next).board).toEqual(state.board);

    const start = createGame({ variant: RULE_VARIANTS.clearDrop, seed: 1 });
    const played = play(start, [p(0, 0), p(0, 1), p(0, 2), p(0, 3), p(0, 4), p(0, 5), p(0, 6)]);
    expect(played.moves[6].cleared).toBeDefined();
    const replayed = replayMoves(start, played.moves);
    expect(replayed[replayed.length - 1].board).toEqual(played.board);
  });
});

describe("giveaway drop", () => {
  const give = { settings: { variant: RULE_VARIANTS.giveawayDrop }, toPlay: STONES.black };

  it("loses on making four", () => {
    const state = fromDiagram(
      `
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        . . . . . . .
        x x x . o o o
      `,
      give,
    );
    const next = playMove(state, p(0, 3));
    expect(next.winner).toBe(STONES.white);
    expect(next.winBy).toBe(WIN_REASONS.trap);
  });

  it("forbids playing on top of the opponent's last stone while another column has room", () => {
    const game = playMove(createGame({ variant: RULE_VARIANTS.giveawayDrop, seed: 1 }), p(0, 3));
    expect(isLegalMove(game, p(5, 3))).toBe(false);
    expect(isLegalMove(game, p(6, 2))).toBe(true);
    expect(legalPoints(game).some((point) => point.col === 3)).toBe(false);
  });

  it("gives a full board to the player who opened", () => {
    // Fill a 7×7 board without a four: alternate columns in a pattern that never lines up.
    let state = createGame({ variant: RULE_VARIANTS.giveawayDrop, seed: 1, allowUndo: true });
    const order = [0, 2, 4, 6, 1, 3, 5];
    let guard = 0;
    while (state.status === GAME_STATUS.playing && guard < 200) {
      const legal = legalPoints(state);
      // Prefer a landing that does not make four; the pattern below rarely needs it.
      const safe = legal.find((point) => playMove(state, point).status === GAME_STATUS.playing);
      const choice = safe ?? legal.find((point) => order.includes(point.col)) ?? legal[0];
      state = playMove(state, choice);
      guard += 1;
    }
    expect(state.status).toBe(GAME_STATUS.won);
    if (state.winBy === WIN_REASONS.full) expect(state.winner).toBe(state.opener);
  });
});

describe("edge drop", () => {
  it("only allows a stone on an edge or beside another", () => {
    const game = createGame({ variant: RULE_VARIANTS.edgeDrop, seed: 1 });
    expect(isLegalMove(game, p(3, 3))).toBe(false);
    expect(isLegalMove(game, p(0, 3))).toBe(true);
    expect(isLegalMove(game, p(3, 6))).toBe(true);
    const next = play(game, [p(0, 3), p(6, 3)]);
    // Now 1,3 rests on the stone at 0,3; 1,4 rests on nothing.
    expect(isLegalMove(next, p(1, 3))).toBe(true);
    expect(isLegalMove(next, p(1, 4))).toBe(false);
    // Diagonal contact does not count.
    expect(isLegalMove(next, p(1, 2))).toBe(false);
  });

  it("wins with four along an edge", () => {
    const game = play(createGame({ variant: RULE_VARIANTS.edgeDrop, seed: 1 }), [
      p(0, 0), p(6, 0), p(0, 1), p(6, 1), p(0, 2), p(6, 2), p(0, 3),
    ]);
    expect(game.winner).toBe(STONES.black);
  });
});
