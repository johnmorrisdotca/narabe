import { describe, expect, it } from "vitest";
import { createGame, playMove, stonesLeft } from "../engine.ts";
import { undoMove } from "./record.ts";
import {
  GAME_STATUS,
  OPENING_RULES,
  RULE_VARIANTS,
  STONES,
} from "../constants.ts";
import { fromDiagram } from "../test-support.ts";
import type { GameState, Point } from "../types.ts";

const p = (row: number, col: number): Point => ({ row, col });

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

describe("caro", () => {
  const caro = { settings: { variant: RULE_VARIANTS.caro }, toPlay: STONES.black };

  it("wins with an open five", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . x x x x . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      caro,
    );
    expect(playMove(state, p(4, 5)).status).toBe(GAME_STATUS.won);
  });

  it("does not win when both ends are shut", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        o x x x x . o . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      caro,
    );
    const next = playMove(state, p(4, 5));
    expect(next.status).toBe(GAME_STATUS.playing);
    expect(next.toPlay).toBe(STONES.white);
  });

  it("treats the board edge as open", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        x x x x . o . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      caro,
    );
    expect(playMove(state, p(4, 4)).status).toBe(GAME_STATUS.won);
  });

  it("does not win with an overline", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . x x . x x x . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      caro,
    );
    expect(playMove(state, p(4, 3)).status).toBe(GAME_STATUS.playing);
  });
});

describe("connect6", () => {
  const connect6 = { variant: RULE_VARIANTS.connect6, size: 19 } as const;

  it("pins the line to six and refuses openings", () => {
    const game = createGame({ ...connect6, winLength: 5, opening: OPENING_RULES.swap2 });
    expect(game.settings.winLength).toBe(6);
    expect(game.settings.opening).toBe(OPENING_RULES.free);
  });

  it("gives black one stone and then two a turn", () => {
    let game = createGame(connect6);
    expect(stonesLeft(game)).toBe(1);
    game = playMove(game, p(9, 9));
    expect(game.toPlay).toBe(STONES.white);
    expect(stonesLeft(game)).toBe(2);

    game = playMove(game, p(9, 10));
    expect(game.toPlay).toBe(STONES.white);
    expect(stonesLeft(game)).toBe(1);

    game = playMove(game, p(9, 11));
    expect(game.toPlay).toBe(STONES.black);
    expect(stonesLeft(game)).toBe(2);
  });

  it("needs six to win, and five is not enough", () => {
    const state = fromDiagram(
      `
        . . . . . . . . . .
        . . . . . . . . . .
        . . . . . . . . . .
        . . . . . . . . . .
        . x x x x x . . . .
        . . . . . . . . . .
        . . . . . . . . . .
        . . . . . . . . . .
        . . . . . . . . . .
        . . . . . . . . . .
      `,
      { settings: { variant: RULE_VARIANTS.connect6 }, toPlay: STONES.black },
    );
    expect(state.status).toBe(GAME_STATUS.playing);
    expect(playMove(state, p(4, 6)).status).toBe(GAME_STATUS.won);
  });

  it("undo hands the turn back mid-pair", () => {
    let game = play(createGame(connect6), [p(9, 9), p(9, 10), p(9, 11)]);
    expect(game.toPlay).toBe(STONES.black);
    game = undoMove(game);
    expect(game.toPlay).toBe(STONES.white);
    expect(stonesLeft(game)).toBe(1);
  });
});

describe("variant defaults", () => {
  it("lets freestyle choose a line length and pins it elsewhere", () => {
    expect(createGame({ winLength: 4 }).settings.winLength).toBe(4);
    expect(
      createGame({ variant: RULE_VARIANTS.renju, winLength: 4 }).settings.winLength,
    ).toBe(5);
  });

  it("starts every game with no captures and a settled opening", () => {
    const game = createGame();
    expect(game.captures).toEqual({ black: 0, white: 0 });
    expect(game.opening.stage).toBe("done");
    expect(game.winBy).toBeNull();
  });
});
