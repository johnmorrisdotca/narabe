import { describe, expect, it } from "vitest";

import { canPass, createGame, emptyPoints, legalPoints, mustPass, passTurn, playMove } from "./engine.ts";
import { GAME_STATUS, NO_HANDICAP } from "./constants.ts";
import { seededRandom } from "./rules/random.ts";
import type { GameState, RuleVariant } from "./types.ts";

/**
 * A game nobody can move in, which used to be a game that simply stopped.
 *
 * The engine ends a placement game as a draw when the board fills. A handicap
 * forbids shapes to one colour, so the last empty point on a board can be a
 * point that colour may not play — and then the board never fills, the draw
 * never comes, and the colour to move has nothing legal. Every one of the
 * positions below is one empty point short of an ending it can never reach.
 *
 * It was found by a random sweep and is kept as the seeds the sweep found,
 * rather than as the sweep: replaying eight known games costs milliseconds,
 * and searching every variant for them again costs six minutes.
 *
 * The repair is that the turn passes. That is deliberately the smallest thing
 * that could work — it decides nothing about who should win. Where the other
 * colour may play the last point, it does, and the game ends the way it always
 * would; only when neither can move do two passes end it.
 */
const HEAVY = {
  ...NO_HANDICAP,
  stone: "black" as const,
  doubleThree: true,
  doubleFour: true,
  overline: true,
  exactLine: true,
  openLine: true,
  longerLine: true,
};

/** The seeds the sweep found, each a game that used to stop one point early. */
const FOUND: { variant: RuleVariant; size: number; seed: number }[] = [
  { variant: "freestyle", size: 9, seed: 40 },
  { variant: "standard", size: 9, seed: 12 },
  { variant: "renju", size: 9, seed: 40 },
  { variant: "caro", size: 9, seed: 12 },
  { variant: "misereFive", size: 9, seed: 40 },
  { variant: "hex", size: 11, seed: 20 },
  { variant: "hex", size: 13, seed: 17 },
  { variant: "hex", size: 19, seed: 17 },
];

/** Plays the recorded game out, passing when there is nothing to play. */
function playOut(variant: RuleVariant, size: number, seed: number) {
  let state: GameState = createGame({ variant, size, handicap: HEAVY, seed });
  const random = seededRandom(seed);
  for (let turn = 0; turn < 800; turn += 1) {
    if (state.status !== GAME_STATUS.playing) return { state, stalled: false };
    const points = legalPoints(state);
    if (points.length === 0) {
      // The case in question. Before the fix there was no way out of here.
      if (!canPass(state)) return { state, stalled: true };
      const passed = passTurn(state);
      if (passed === state) return { state, stalled: true };
      state = passed;
      continue;
    }
    const next = playMove(state, points[Math.floor(random() * points.length)]);
    if (next === state) return { state, stalled: true };
    state = next;
  }
  return { state, stalled: true };
}

describe("a game nobody can move in", () => {
  for (const { variant, size, seed } of FOUND) {
    it(`${variant} ${size}×${size} seed ${seed} reaches an ending`, () => {
      const { state, stalled } = playOut(variant, size, seed);
      expect(stalled, "the game stopped with nobody able to move").toBe(false);
      expect(state.status, "the game never reached an ending").not.toBe(GAME_STATUS.playing);
    });
  }

  it("offers the pass only to the colour that has nothing to play", () => {
    // The rule must not hand a pass to somebody with a move: that would be a
    // new way to skip a turn, which is a worse bug than the one being fixed.
    const fresh = createGame({ variant: "freestyle", size: 9, handicap: HEAVY, seed: 40 });
    expect(legalPoints(fresh).length).toBeGreaterThan(0);
    expect(mustPass(fresh)).toBe(false);
    expect(canPass(fresh)).toBe(false);
  });

  it("passes the turn, and the other colour finishes the game", () => {
    /*
     * What the repair actually does, on the first seed it was found with.
     * Black runs out of legal points with one left on the board; the turn
     * passes; White may play that point, and does; the board fills and the
     * game ends the ordinary way. Nothing had to decide who deserved to win,
     * which is the whole argument for making passing the fix.
     */
    let state = createGame({ variant: "freestyle", size: 9, handicap: HEAVY, seed: 40 });
    const random = seededRandom(40);
    let passes = 0;
    for (let turn = 0; turn < 800 && state.status === GAME_STATUS.playing; turn += 1) {
      const points = legalPoints(state);
      if (points.length === 0) {
        passes += 1;
        state = passTurn(state);
        continue;
      }
      state = playMove(state, points[Math.floor(random() * points.length)]);
    }
    expect(passes, "this seed is only interesting if somebody had to pass").toBe(1);
    expect(state.status, "the game never reached an ending").not.toBe(GAME_STATUS.playing);
    // The pass let the last point be played, so the ending is an ordinary one.
    expect(emptyPoints(state).length).toBe(0);
    expect(state.status).toBe(GAME_STATUS.draw);
  });

});
