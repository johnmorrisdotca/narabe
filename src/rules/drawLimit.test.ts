import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  DRAW_LIMITS,
  VARIANT_SPECS,
  DRAW_LIMIT_LIST,
  DRAW_LIMIT_SHARE,
  GAME_STATUS,
  RULE_VARIANTS,
} from "../constants.ts";
import type { DrawLimit, GameSettings, GameState } from "../types.ts";
import {
  createGame,
  emptyPoints,
  inMovePhase,
  legalPoints,
  movePiece,
  mustPass,
  passTurn,
  pieceMoves,
  piecePlacements,
  placePiece,
  playMove,
  twistBoard,
} from "../engine.ts";
import {
  bigEnoughForLength,
  canBeDrawn,
  lengthReason,
  movesBeforeDraw,
  reachedDrawLimit,
  settleDraw,
} from "./drawLimit.ts";

/**
 * Calling a long game a draw.
 *
 * Two careful players in a misère game can go on for ever, and a board that
 * never fills is a game neither of them can leave. This is the length they
 * may agree to beforehand.
 *
 * What is checked here is that the limit is a share of the board rather than
 * a number anybody has to work out, that it never takes a win away from
 * somebody who has one, and — the part that matters most — that every game
 * here honours it, whichever of the engine's ways of moving that game uses.
 */

const VARIANTS = Object.values(RULE_VARIANTS);

function settings(over: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_SETTINGS, ...over };
}

describe("how long a game may run", () => {
  it("counts a share of the board's points, not a number somebody typed", () => {
    // Half of 15×15 is 112 and half of 9×9 is 40: one setting, two boards,
    // no arithmetic asked of anybody.
    expect(movesBeforeDraw(settings({ size: 15, drawLimit: DRAW_LIMITS.half }))).toBe(112);
    expect(movesBeforeDraw(settings({ size: 9, drawLimit: DRAW_LIMITS.half }))).toBe(40);
    expect(movesBeforeDraw(settings({ size: 19, drawLimit: DRAW_LIMITS.half }))).toBe(180);
  });

  it("gives three quarters its own share", () => {
    expect(movesBeforeDraw(settings({ size: 15, drawLimit: DRAW_LIMITS.threeQuarters }))).toBe(168);
  });

  it("rounds down, so a limit arrives a move early rather than a move late", () => {
    // 9×9 is 81 points; three quarters is 60.75.
    expect(movesBeforeDraw(settings({ size: 9, drawLimit: DRAW_LIMITS.threeQuarters }))).toBe(60);
  });

  it("plays it out when nobody asked for a limit", () => {
    expect(movesBeforeDraw(settings())).toBeNull();
    expect(movesBeforeDraw(settings({ drawLimit: DRAW_LIMITS.none }))).toBeNull();
  });

  it("is off unless it is asked for", () => {
    expect(DEFAULT_SETTINGS.drawLimit).toBe(DRAW_LIMITS.none);
  });
});

describe("reaching the limit", () => {
  it("says nothing about a game that has not got there", () => {
    const state = createGame(settings({ size: 9, drawLimit: DRAW_LIMITS.half }), 0);
    expect(reachedDrawLimit(state)).toBe(false);
    expect(settleDraw(state)).toBe(state);
  });

  it("draws the game the move it arrives", () => {
    const state = createGame(settings({ size: 9, drawLimit: DRAW_LIMITS.half }), 0);
    const atLimit = { ...state, moves: new Array(40).fill(state.moves[0] ?? null) } as GameState;
    expect(reachedDrawLimit(atLimit)).toBe(true);
    expect(settleDraw(atLimit).status).toBe(GAME_STATUS.draw);
  });

  it("never takes a win away from somebody who has one", () => {
    const state = createGame(settings({ size: 9, drawLimit: DRAW_LIMITS.half }), 0);
    const won = {
      ...state,
      status: GAME_STATUS.won,
      winner: "black",
      moves: new Array(60).fill(null),
    } as unknown as GameState;
    expect(reachedDrawLimit(won)).toBe(false);
    expect(settleDraw(won)).toBe(won);
  });

  it("waits for a twist game's quarter turn before calling anything", () => {
    // A stone that still owes a twist has not finished its move, and a board
    // left mid-turn for ever would be worse than a long game.
    const state = createGame(settings({ size: 9, drawLimit: DRAW_LIMITS.half }), 0);
    const midTurn = {
      ...state,
      pendingTwist: true,
      moves: new Array(60).fill(null),
    } as unknown as GameState;
    expect(settleDraw(midTurn)).toBe(midTurn);
  });
});

/**
 * Plays a game out with the shortest legal move it can find, whichever way
 * this variant moves. Not a clever player — it only has to reach the limit.
 */
function playToEnd(state: GameState, cap: number): GameState {
  let current = state;
  for (let turn = 0; turn < cap && current.status === GAME_STATUS.playing; turn += 1) {
    if (emptyPoints(current).length === 0) break;

    if (inMovePhase(current)) {
      const from = movablePiece(current);
      if (from === null) break;
      current = movePiece(current, from, pieceMoves(current, from)[0]);
      continue;
    }

    if (mustPass(current)) {
      current = passTurn(current);
      continue;
    }

    const pieces = piecePlacements(current);
    if (pieces.length > 0) {
      current = placePiece(current, pieces[0]);
      continue;
    }

    const legal = legalPoints(current);
    if (legal.length === 0) break;
    current = playMove(current, legal[0]);
    if (current.pendingTwist) current = twistBoard(current, 0, true);
  }
  return current;
}

/**
 * A piece of the colour to move that actually has somewhere to go. The first
 * one on the board will not do: in Halma the corner of your own camp is boxed
 * in by your own pieces from the first move.
 */
function movablePiece(state: GameState): { row: number; col: number } | null {
  const { size } = state.settings;
  for (let index = 0; index < state.board.length; index += 1) {
    if (state.board[index] !== state.toPlay) continue;
    const point = { row: Math.floor(index / size), col: index % size };
    if (pieceMoves(state, point).length > 0) return point;
  }
  return null;
}

describe("every game honours the length it was given", () => {
  /*
   * The point of this one. The engine has several ways of taking a turn —
   * placing a stone, laying a piece, sliding, twisting, passing — and a game
   * uses whichever suits it. Checking the limit at the places I found by hand
   * proves nothing about the place I did not; playing every variant to its
   * limit does.
   */
  it.each(VARIANTS)("%s stops at the limit rather than running on", (variant) => {
    const short = createGame(settings({ variant, drawLimit: DRAW_LIMITS.half, size: 9 }), 0.5);
    const limit = movesBeforeDraw(short.settings);
    // A game that cannot be drawn, or whose board is too small for a share of
    // it to arrive before the game is over, has no length. Both are checked on
    // their own below.
    if (lengthReason(short.settings) !== null) {
      expect(limit).toBeNull();
      return;
    }
    expect(limit, `${variant} has no limit with one set`).not.toBeNull();

    const finished = playToEnd(short, limit! * 4);
    expect(finished.status, `${variant} was left playing past its limit`).not.toBe(
      GAME_STATUS.playing,
    );
    // Whether it ended by the limit or before it, it never went past.
    expect(finished.moves.length).toBeLessThanOrEqual(limit!);
  });

  it.each(VARIANTS)("%s is unchanged when no limit is set", (variant) => {
    // The default has to leave every game exactly as it was, or this feature
    // has quietly changed thirty-six games nobody asked it to.
    const state = createGame(settings({ variant, size: 9 }), 0.5);
    expect(movesBeforeDraw(state.settings)).toBeNull();
    expect(settleDraw(state)).toBe(state);
  });
});

describe("the list of limits", () => {
  it("lists every limit exactly once", () => {
    const listed = [...DRAW_LIMIT_LIST];
    expect(listed).toHaveLength(new Set(listed).size);
    expect(listed.sort()).toEqual(Object.keys(DRAW_LIMIT_SHARE).sort() as DrawLimit[]);
  });
});

describe("a game that cannot be drawn is given no length", () => {
  /*
   * Hex. A full board always holds exactly one chain from side to side, so
   * there is no position in which neither player has won — which the rules
   * page states as a fact about the shape of the board rather than as a rule
   * anybody wrote. A length that could produce a drawn Hex game would make
   * that sentence false, so the length does not apply and is refused rather
   * than quietly ignored.
   */
  const CONNECTS = VARIANTS.filter((variant) => VARIANT_SPECS[variant].connects);

  it("finds the games this is about, so the test cannot pass by naming none", () => {
    expect(CONNECTS.length).toBeGreaterThan(0);
  });

  it.each(CONNECTS)("%s has no length even when one is asked for", (variant) => {
    const asked = settings({ variant, drawLimit: DRAW_LIMITS.threeQuarters });
    expect(canBeDrawn(asked)).toBe(false);
    expect(movesBeforeDraw(asked)).toBeNull();
  });

  it.each(CONNECTS)("%s is never drawn by a length however long it runs", (variant) => {
    const state = createGame(settings({ variant, drawLimit: DRAW_LIMITS.half }), 0.5);
    const long = { ...state, moves: new Array(10_000).fill(null) } as unknown as GameState;
    expect(reachedDrawLimit(long)).toBe(false);
    expect(settleDraw(long)).toBe(long);
  });

  it("every other game can be given one", () => {
    for (const variant of VARIANTS) {
      if (VARIANT_SPECS[variant].connects) continue;
      expect(canBeDrawn(settings({ variant })), `${variant} cannot be drawn`).toBe(true);
    }
  });
});

describe("a board too small to need a length", () => {
  /*
   * John's objection, and he is right: a 3×3 board holds nine points and is
   * finished in nine moves, so "half the board" is four. Ending a game of
   * noughts and crosses after four moves is not a rule anybody would want.
   * The length is for a board two careful players can fail to resolve, and
   * that starts at nine by nine.
   */
  it("is nine by nine, and anything smaller gets no length", () => {
    expect(bigEnoughForLength(settings({ size: 9 }))).toBe(true);
    for (const size of [3, 4, 5, 6, 8]) {
      expect(bigEnoughForLength(settings({ size })), `${size}×${size}`).toBe(false);
    }
  });

  it("refuses a length on a small board however loudly it is asked for", () => {
    // Through createGame, because that is what settles a game onto its own
    // board: tic-tac-toe is played on 3×3 whatever size was asked for.
    const tiny = createGame(
      settings({ variant: RULE_VARIANTS.tictactoe, drawLimit: DRAW_LIMITS.half }),
      0,
    ).settings;
    expect(tiny.size).toBe(3);
    expect(movesBeforeDraw(tiny)).toBeNull();
    expect(lengthReason(tiny)).toBe("too-small");
  });

  it("never ends a small game early", () => {
    // The move noughts and crosses would have been cut short at.
    const state = createGame(
      settings({ variant: RULE_VARIANTS.tictactoe, drawLimit: DRAW_LIMITS.half }),
      0,
    );
    const four = { ...state, moves: new Array(4).fill(null) } as unknown as GameState;
    expect(reachedDrawLimit(four)).toBe(false);
    expect(settleDraw(four)).toBe(four);
  });

  it("tells the two refusals apart, because they are different things", () => {
    // Hex on its own board is big enough; it still cannot be drawn.
    expect(lengthReason(settings({ variant: RULE_VARIANTS.hex, size: 11 }))).toBe("cannot-draw");
    expect(lengthReason(settings({ variant: RULE_VARIANTS.tictactoe, size: 3 }))).toBe("too-small");
    // Big enough, but still no draw to be had.
    expect(lengthReason(settings({ variant: RULE_VARIANTS.hex, size: 19 }))).toBe("cannot-draw");
    expect(lengthReason(settings({ variant: RULE_VARIANTS.freestyle, size: 15 }))).toBeNull();
  });
});
