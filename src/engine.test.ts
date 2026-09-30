import { describe, expect, it } from "vitest";
import { cellAt, createGame, findWinningLine, isLegalMove, playMove } from "./engine.ts";
import { canUndo, lastMove, undoMove } from "./rules/record.ts";
import { GAME_STATUS, RULE_VARIANTS, STONES } from "./constants.ts";
import type { GameState, Point } from "./types.ts";

const p = (row: number, col: number): Point => ({ row, col });

/** Plays the given points in order, alternating colours from black. */
function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

/**
 * Builds a game where black has stones at `blackPoints` and white at
 * `whitePoints`, interleaving them so the turn order stays legal. White's
 * stones are padded with harmless moves on the last row if black has more.
 */
function position(blackPoints: Point[], whitePoints: Point[]): GameState {
  const size = createGame().settings.size;
  const filler = Array.from({ length: blackPoints.length }, (_, i) =>
    p(size - 1, i),
  );
  const whites = [...whitePoints, ...filler];
  const sequence: Point[] = [];
  blackPoints.forEach((point, i) => sequence.push(point, whites[i]));
  return play(createGame(), sequence);
}

describe("createGame", () => {
  it("starts empty with black to play", () => {
    const game = createGame();
    expect(game.board).toHaveLength(15 * 15);
    expect(game.board.every((cell) => cell === null)).toBe(true);
    expect(game.toPlay).toBe(STONES.black);
    expect(game.status).toBe(GAME_STATUS.playing);
    expect(game.moves).toEqual([]);
  });

  it("accepts a board size override", () => {
    expect(createGame({ size: 19 }).board).toHaveLength(19 * 19);
  });
});

describe("playMove", () => {
  it("alternates colours and records moves", () => {
    const game = play(createGame(), [p(7, 7), p(7, 8)]);
    expect(cellAt(game, p(7, 7))).toBe(STONES.black);
    expect(cellAt(game, p(7, 8))).toBe(STONES.white);
    expect(game.toPlay).toBe(STONES.black);
    expect(game.moves).toHaveLength(2);
    expect(lastMove(game)).toMatchObject(p(7, 8));
  });

  it("ignores an occupied intersection", () => {
    const before = playMove(createGame(), p(7, 7));
    const after = playMove(before, p(7, 7));
    expect(after).toBe(before);
    expect(isLegalMove(before, p(7, 7))).toBe(false);
  });

  it("ignores points off the board", () => {
    const game = createGame();
    expect(playMove(game, p(-1, 0))).toBe(game);
    expect(playMove(game, p(0, 15))).toBe(game);
  });

  it("does not mutate the previous state", () => {
    const before = createGame();
    playMove(before, p(0, 0));
    expect(cellAt(before, p(0, 0))).toBeNull();
    expect(before.moves).toHaveLength(0);
  });
});

describe("winning", () => {
  const lines: Record<string, Point[]> = {
    horizontal: [p(7, 3), p(7, 4), p(7, 5), p(7, 6), p(7, 7)],
    vertical: [p(3, 7), p(4, 7), p(5, 7), p(6, 7), p(7, 7)],
    diagonal: [p(3, 3), p(4, 4), p(5, 5), p(6, 6), p(7, 7)],
    antiDiagonal: [p(3, 11), p(4, 10), p(5, 9), p(6, 8), p(7, 7)],
  };

  for (const [name, line] of Object.entries(lines)) {
    it(`detects a ${name} five`, () => {
      const game = position(line, []);
      expect(game.status).toBe(GAME_STATUS.won);
      expect(game.winner).toBe(STONES.black);
      expect(game.winningLine).toEqual(line);
    });
  }

  it("detects a win completed in the middle of the line", () => {
    const game = position(
      [p(7, 3), p(7, 4), p(7, 6), p(7, 7), p(7, 5)],
      [],
    );
    expect(game.status).toBe(GAME_STATUS.won);
    expect(game.winningLine).toEqual([
      p(7, 3),
      p(7, 4),
      p(7, 5),
      p(7, 6),
      p(7, 7),
    ]);
  });

  it("detects a win along the board edge", () => {
    const game = position([p(0, 10), p(0, 11), p(0, 12), p(0, 13), p(0, 14)], []);
    expect(game.status).toBe(GAME_STATUS.won);
  });

  it("does not count four in a row", () => {
    const game = position([p(7, 3), p(7, 4), p(7, 5), p(7, 6)], []);
    expect(game.status).toBe(GAME_STATUS.playing);
    expect(game.winningLine).toEqual([]);
  });

  it("does not count a line broken by the other colour", () => {
    const game = position(
      [p(7, 3), p(7, 4), p(7, 6), p(7, 7), p(7, 8)],
      [p(7, 5)],
    );
    expect(game.status).toBe(GAME_STATUS.playing);
  });

  it("lets white win too", () => {
    const game = play(createGame(), [
      p(0, 0), p(7, 3),
      p(0, 1), p(7, 4),
      p(0, 2), p(7, 5),
      p(0, 3), p(7, 6),
      p(1, 0), p(7, 7),
    ]);
    expect(game.winner).toBe(STONES.white);
    expect(game.toPlay).toBe(STONES.white);
  });

  it("refuses further moves once won", () => {
    const won = position([p(7, 3), p(7, 4), p(7, 5), p(7, 6), p(7, 7)], []);
    expect(playMove(won, p(0, 0))).toBe(won);
  });

  it("returns nothing for an empty point", () => {
    const game = createGame();
    expect(findWinningLine(game.board, game.settings, p(7, 7))).toEqual([]);
  });
});

describe("rule variants", () => {
  const six = [p(7, 3), p(7, 4), p(7, 5), p(7, 6), p(7, 8), p(7, 7)];

  it("freestyle counts an overline as a win", () => {
    const game = play(createGame({ variant: RULE_VARIANTS.freestyle }), [
      p(7, 3), p(0, 0),
      p(7, 4), p(0, 2),
      p(7, 5), p(0, 4),
      p(7, 6), p(0, 6),
      p(7, 8), p(0, 8),
      p(7, 7),
    ]);
    expect(game.status).toBe(GAME_STATUS.won);
    expect(game.winningLine).toHaveLength(6);
  });

  it("standard does not count an overline as a win", () => {
    const game = play(createGame({ variant: RULE_VARIANTS.standard }), [
      p(7, 3), p(0, 0),
      p(7, 4), p(0, 2),
      p(7, 5), p(0, 4),
      p(7, 6), p(0, 6),
      p(7, 8), p(0, 8),
      p(7, 7),
    ]);
    expect(game.status).toBe(GAME_STATUS.playing);
    expect(six.every((point) => cellAt(game, point) === STONES.black)).toBe(true);
  });

  it("standard still counts exactly five", () => {
    const game = play(createGame({ variant: RULE_VARIANTS.standard }), [
      p(7, 3), p(0, 0),
      p(7, 4), p(0, 2),
      p(7, 5), p(0, 4),
      p(7, 6), p(0, 6),
      p(7, 7),
    ]);
    expect(game.status).toBe(GAME_STATUS.won);
  });
});

describe("draw", () => {
  it("declares a draw when the board fills without a five", () => {
    // A 3x3 board with winLength 4 cannot produce a winner.
    let game = createGame({ size: 3, winLength: 4 });
    for (let i = 0; i < 9; i += 1) {
      game = playMove(game, { row: Math.floor(i / 3), col: i % 3 });
    }
    expect(game.status).toBe(GAME_STATUS.draw);
    expect(game.winner).toBeNull();
    expect(playMove(game, p(0, 0))).toBe(game);
  });
});

describe("undoMove", () => {
  it("is a no-op on an empty board", () => {
    const game = createGame();
    expect(canUndo(game)).toBe(false);
    expect(undoMove(game)).toBe(game);
  });

  it("removes the last stone and hands the turn back", () => {
    const game = play(createGame(), [p(7, 7), p(7, 8)]);
    const undone = undoMove(game);
    expect(cellAt(undone, p(7, 8))).toBeNull();
    expect(cellAt(undone, p(7, 7))).toBe(STONES.black);
    expect(undone.toPlay).toBe(STONES.white);
    expect(undone.moves).toHaveLength(1);
  });

  it("reopens a won game", () => {
    const won = position([p(7, 3), p(7, 4), p(7, 5), p(7, 6), p(7, 7)], []);
    const undone = undoMove(won);
    expect(undone.status).toBe(GAME_STATUS.playing);
    expect(undone.winner).toBeNull();
    expect(undone.winningLine).toEqual([]);
    expect(undone.toPlay).toBe(STONES.black);
  });
});
