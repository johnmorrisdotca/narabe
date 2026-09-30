import { describe, expect, it } from "vitest";
import { canSwapSeats, cellAt, createGame, isLegalMove, playMove, resolveOpener, seatToPlay, swapSeats, winOnTime } from "./engine.ts";
import { canSkip, canUndo, skipMove, skipTarget, undoMove } from "./rules/record.ts";
import {
  BLOCKED,
  FIRST_PLAYERS,
  OBSTACLE_LAYOUTS,
  RULE_VARIANTS,
  SEATS,
  STONES,
} from "./constants.ts";
import { obstaclePoints, tengen } from "./obstacles.ts";
import type { Point } from "./types.ts";

const p = (row: number, col: number): Point => ({ row, col });

describe("board sizes", () => {
  it.each([9, 13, 15, 19])("builds a %i x %i board", (size) => {
    expect(createGame({ size }).board).toHaveLength(size * size);
  });

  it("keeps five in a row on the mini board", () => {
    expect(createGame({ size: 9 }).settings.winLength).toBe(5);
  });
});

describe("resolveOpener", () => {
  const freestyle = createGame().settings;

  it("opens with black by default", () => {
    expect(resolveOpener(freestyle)).toBe(STONES.black);
  });

  it("lets freestyle hand the first stone to white", () => {
    const settings = { ...freestyle, firstPlayer: FIRST_PLAYERS.white };
    expect(resolveOpener(settings)).toBe(STONES.white);
  });

  it("decides a random opener from the roll, and nothing else", () => {
    const settings = { ...freestyle, firstPlayer: FIRST_PLAYERS.random };
    expect(resolveOpener(settings, 0.1)).toBe(STONES.black);
    expect(resolveOpener(settings, 0.9)).toBe(STONES.white);
  });

  it("forces black to open in standard, whatever the setting asks for", () => {
    const settings = {
      ...freestyle,
      variant: RULE_VARIANTS.standard,
      firstPlayer: FIRST_PLAYERS.white,
    };
    expect(resolveOpener(settings)).toBe(STONES.black);
    expect(resolveOpener({ ...settings, firstPlayer: FIRST_PLAYERS.random }, 0.99))
      .toBe(STONES.black);
  });

  it("seats the opener as player one whichever colour that is", () => {
    const game = createGame({ firstPlayer: FIRST_PLAYERS.white });
    expect(game.opener).toBe(STONES.white);
    expect(game.seats[STONES.white]).toBe(SEATS.one);
    expect(game.toPlay).toBe(STONES.white);
  });
});

describe("obstacles", () => {
  it("leaves an open board alone", () => {
    expect(obstaclePoints(createGame().settings)).toEqual([]);
    expect(createGame().board).not.toContain(BLOCKED);
  });

  it("seals the star points but leaves tengen open", () => {
    const game = createGame({ obstacles: OBSTACLE_LAYOUTS.hoshi });
    const centre = tengen(15);

    expect(cellAt(game, p(3, 3))).toBe(BLOCKED);
    expect(cellAt(game, p(11, 11))).toBe(BLOCKED);
    expect(cellAt(game, centre)).toBeNull();
  });

  it("refuses a stone on an obstacle", () => {
    const game = createGame({ obstacles: OBSTACLE_LAYOUTS.hoshi });
    expect(isLegalMove(game, p(3, 3))).toBe(false);
    expect(playMove(game, p(3, 3))).toBe(game);
  });

  it("blocks four points on the mini board and keeps the centre", () => {
    const game = createGame({ size: 9, obstacles: OBSTACLE_LAYOUTS.hoshi });
    expect(obstaclePoints(game.settings)).toHaveLength(4);
    expect(cellAt(game, tengen(9))).toBeNull();
  });
});

describe("skip", () => {
  const options = { size: 9, allowSkip: true } as const;

  it("is unavailable unless the settings allow it", () => {
    const game = createGame({ size: 9 });
    expect(canSkip(game)).toBe(false);
    expect(skipMove(game)).toBe(game);
  });

  it("spends the turn on a corner and hands play over", () => {
    const game = skipMove(createGame(options));

    expect(cellAt(game, p(0, 0))).toBe(STONES.black);
    expect(game.toPlay).toBe(STONES.white);
    expect(game.moves[0].kind).toBe("skip");
  });

  it("picks the corner the roll asks for", () => {
    expect(skipTarget(createGame(options), 0)).toEqual(p(0, 0));
    expect(skipTarget(createGame(options), 0.99)).toEqual(p(8, 8));
  });

  it("moves off a corner that is already taken", () => {
    const taken = playMove(createGame(options), p(0, 0));
    expect(skipTarget(taken, 0)).not.toEqual(p(0, 0));
  });
});

describe("swapping seats", () => {
  const options = { allowSwap: true, swapsPerSeat: 1 } as const;

  it("is unavailable unless the settings allow it", () => {
    const game = playMove(createGame(), p(7, 7));
    expect(canSwapSeats(game)).toBe(false);
    expect(swapSeats(game)).toBe(game);
  });

  it("is unavailable before anyone has played", () => {
    expect(canSwapSeats(createGame(options))).toBe(false);
  });

  it("hands the stones over and costs the swapper their turn", () => {
    const game = playMove(createGame(options), p(7, 7));
    expect(seatToPlay(game)).toBe(SEATS.two);

    const swapped = swapSeats(game);

    // Seat two now owns black — including the stone seat one just played.
    expect(swapped.seats[STONES.black]).toBe(SEATS.two);
    expect(swapped.seats[STONES.white]).toBe(SEATS.one);
    // The colour to move is unchanged, so the swap gave the move away.
    expect(swapped.toPlay).toBe(STONES.white);
    expect(seatToPlay(swapped)).toBe(SEATS.one);
    expect(swapped.board).toEqual(game.board);
  });

  it("spends one swap per seat and no more", () => {
    let game = playMove(createGame(options), p(7, 7));
    game = swapSeats(game);
    expect(game.swapsUsed[SEATS.two]).toBe(1);

    game = playMove(game, p(7, 8));
    // Seat two is to move again and has nothing left to spend.
    expect(game.swapsUsed[SEATS.two]).toBe(1);
    expect(canSwapSeats(game)).toBe(seatToPlay(game) === SEATS.one);
  });

  it("leaves the move list untouched", () => {
    const game = playMove(createGame(options), p(7, 7));
    expect(swapSeats(game).moves).toEqual(game.moves);
  });
});

describe("undo permission", () => {
  it("can be switched off for a stricter game", () => {
    const game = playMove(createGame({ allowUndo: false }), p(7, 7));

    expect(canUndo(game)).toBe(false);
    expect(undoMove(game)).toBe(game);
  });

  it("stays available by default", () => {
    const game = playMove(createGame(), p(7, 7));
    expect(canUndo(game)).toBe(true);
  });
});

describe("winOnTime", () => {
  it("hands the game to the other colour", () => {
    const game = playMove(createGame(), p(7, 7));
    const timedOut = winOnTime(game, STONES.white);

    expect(timedOut.status).toBe("won");
    expect(timedOut.winner).toBe(STONES.black);
    // Nobody made five, so there is no line to highlight.
    expect(timedOut.winningLine).toEqual([]);
  });

  it("leaves the stones exactly where they were", () => {
    const game = playMove(createGame(), p(7, 7));
    expect(winOnTime(game, STONES.white).board).toEqual(game.board);
  });

  it("cannot reopen or overturn a finished game", () => {
    const won = [p(7, 3), p(0, 0), p(7, 4), p(0, 1), p(7, 5), p(0, 2), p(7, 6), p(0, 3), p(7, 7)]
      .reduce((state, point) => playMove(state, point), createGame());

    expect(won.winner).toBe(STONES.black);
    expect(winOnTime(won, STONES.black)).toBe(won);
  });
});
