import { describe, expect, it } from "vitest";

import { createGame, playMove } from "../engine.ts";
import { GAME_STATUS, STONES, WIN_REASONS } from "../constants.ts";
import { resign } from "./seats.ts";

describe("resign", () => {
  it("hands the win to the other colour, with no line, and keeps the moves", () => {
    const game = playMove(playMove(createGame(), { row: 7, col: 7 }), { row: 7, col: 8 });
    const given = resign(game, STONES.black);
    expect(given.status).toBe(GAME_STATUS.won);
    expect(given.winner).toBe(STONES.white);
    expect(given.winBy).toBe(WIN_REASONS.resign);
    expect(given.winningLine).toEqual([]);
    expect(given.moves).toEqual(game.moves);
  });

  it("cannot give up a game that is already over", () => {
    const game = resign(createGame(), STONES.white);
    expect(resign(game, STONES.black)).toBe(game);
  });

  it("leaves its input untouched", () => {
    const game = createGame();
    resign(game, STONES.black);
    expect(game.status).toBe(GAME_STATUS.playing);
  });
});
