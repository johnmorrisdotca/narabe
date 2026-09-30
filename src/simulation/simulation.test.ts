import { describe, expect, it } from "vitest";

import { createGame, emptyPoints, forbiddenPoints, playMove, pointOf } from "../engine.ts";
import { replayMoves } from "../rules/record.ts";
import type { Stone } from "../types.ts";
import { GAME_STATUS, RULE_VARIANTS, VARIANT_SPECS } from "../constants.ts";
import { rulesFor } from "../rules/handicap.ts";
import { bruteForceWinner, playOut } from "./support.ts";
import { isCheckers } from "./checkers.ts";

describe("simulated games", () => {
  const GAMES = 120;

  it(`plays ${GAMES} full games on a 9x9 board without breaking an invariant`, () => {
    const outcomes = { won: 0, draw: 0, playing: 0 };
    for (let seed = 1; seed <= GAMES; seed += 1) {
      const final = playOut({ size: 9 }, seed);
      outcomes[final.status] += 1;
    }
    // Random play on a small board should reach a real end almost every time.
    expect(outcomes.won + outcomes.draw).toBe(GAMES);
  });

  it("plays full games on every board size", () => {
    for (const size of [9, 13, 15, 19]) {
      for (let seed = 1; seed <= 8; seed += 1) {
        playOut({ size }, seed * 31 + size);
      }
    }
  });

  /*
   * Its own time allowance: 25 games of every variant grows with every game
   * added (Scattered Rocks and Rockfall took it from about 42 s to 50 s alone),
   * and the pre-push gate runs it beside the build, where it passed 60 s. The
   * work is the point of it, so the allowance moves rather than the games.
   */
  it("plays full games under every rule variant", { timeout: 180_000 }, () => {
    for (const variant of Object.values(RULE_VARIANTS)) {
      for (let seed = 1; seed <= 25; seed += 1) {
        playOut({ size: 9, variant }, seed * 7 + variant.length);
      }
    }
  });

  it("plays full games with the star points sealed", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const final = playOut({ size: 9, obstacles: "hoshi" }, seed * 13);
      // Obstacles are never played on and never disappear.
      expect(final.board.filter((cell) => cell === "blocked")).toHaveLength(4);
    }
  });

  it("plays full games with undo switched off", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      playOut({ size: 9, allowUndo: false }, seed * 17);
    }
  });

  it("never lets a standard game be won by an overline", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const final = playOut({ size: 9, variant: RULE_VARIANTS.standard }, seed * 3);
      if (final.status !== GAME_STATUS.won) continue;

      // The winning line must be exactly five, never six or more.
      expect(final.winningLine).toHaveLength(final.settings.winLength);
    }
  });

  it("never gives a colour more stones in a turn than its variant allows", () => {
    for (const variant of Object.values(RULE_VARIANTS)) {
      // The flipping games pass a stuck colour by, so one colour may move twice; restated by hand.
      if (["reversi", "classicReversi", "antiReversi", "miniReversi", "grandReversi", "honeycomb"].includes(variant)) continue;
      // The checkers family plays a whole capture chain as several moves by the same colour before the
      // turn passes; checkCheckersMove restates that rule by hand, move by move, instead.
      if (isCheckers(variant)) continue;
      for (let seed = 1; seed <= 12; seed += 1) {
        const final = playOut({ size: 9, variant }, seed * 11 + variant.length);

        // Walk the record counting each unbroken run of one colour.
        let run = 0;
        let previous: Stone | null = null;
        for (const move of final.moves) {
          // Identity is the mover, which differs from the colour where the mover chooses it.
          const mover = move.by ?? move.stone;
          run = mover === previous ? run + 1 : 1;
          previous = mover;
          expect(
            run,
            `${variant} seed ${seed}: ${run} stones in one turn`,
          ).toBeLessThanOrEqual(rulesFor(final.settings, mover).stonesPerTurn);
        }
      }
    }
  });

  it("can replay every game from its move list alone", () => {
    for (const variant of Object.values(RULE_VARIANTS)) {
      for (let seed = 1; seed <= 10; seed += 1) {
        const final = playOut({ size: 9, variant }, seed * 19 + variant.length);

        /*
         * A stored game is its settings plus its moves, nothing else — that is
         * the whole reason history stores a move list and never a board. If a
         * replay could diverge, a saved game and the game that was played
         * would be different games.
         */
        const start = createGame({ ...final.settings, firstPlayer: final.opener });
        const timeline = replayMoves(
          start,
          final.moves.map((move) => ({
            row: move.row,
            col: move.col,
            kind: move.kind,
            from: move.from,
            twist: move.twist,
            cells: move.cells,
            // The colour placed, which the replay needs where the mover chose it.
            stone: move.stone,
          })),
          final.opening.choices,
        );
        const replayed = timeline[timeline.length - 1];

        expect(replayed.board, `${variant} seed ${seed}: replayed board differs`)
          .toEqual(final.board);
        expect(replayed.status).toBe(final.status);
        expect(replayed.winner).toBe(final.winner);
        expect(replayed.captures).toEqual(final.captures);
      }
    }
  });

  it("refuses every illegal move by returning the very same state", () => {
    for (const variant of Object.values(RULE_VARIANTS)) {
      const state = playOut({ size: 9, variant }, 909 + variant.length);
      const size = state.settings.size;

      // Off the board, and on a point that is already taken.
      for (const point of [
        { row: -1, col: 0 },
        { row: 0, col: size },
        { row: size, col: size },
      ]) {
        expect(playMove(state, point), `${variant}: off-board move was accepted`)
          .toBe(state);
      }
      const taken = state.moves[0];
      if (taken !== undefined) {
        expect(playMove(state, { row: taken.row, col: taken.col })).toBe(state);
      }
    }
  });

  it("only ever forbids empty points, and only where a variant says so", () => {
    for (const variant of Object.values(RULE_VARIANTS)) {
      const state = playOut({ size: 9, variant }, 555 + variant.length);
      const empties = new Set(
        emptyPoints(state).map((point) => `${point.row},${point.col}`),
      );

      for (const point of forbiddenPoints(state)) {
        expect(
          empties.has(`${point.row},${point.col}`),
          `${variant}: forbade a point that is not empty`,
        ).toBe(true);
      }
    }
  });

  it("reports the same result for the same seed every time", () => {
    const once = playOut({ size: 9 }, 4242);
    const twice = playOut({ size: 9 }, 4242);
    expect(twice.moves).toEqual(once.moves);
    expect(twice.winner).toBe(once.winner);
  });
});

/** A sanity check on the checker itself, so a silent no-op cannot pass. */
describe("the brute force scanner", () => {
  it("finds a win the engine would also find", () => {
    let state = createGame({ size: 9 });
    for (const [row, col] of [[4, 0], [0, 0], [4, 1], [0, 1], [4, 2], [0, 2], [4, 3], [0, 3], [4, 4]]) {
      state = playMove(state, { row, col });
    }
    expect(state.winner).toBe("black");
    expect(bruteForceWinner(state.board, state.settings)).toBe("black");
  });

  it("finds nothing on an empty board", () => {
    const game = createGame({ size: 9 });
    expect(bruteForceWinner(game.board, game.settings)).toBeNull();
    expect(pointOf(9, 0)).toEqual({ row: 0, col: 0 });
  });
});

/**
 * The length two players may agree to, restated by hand.
 *
 * The engine works the limit out from the settings; this counts the moves in
 * the finished game itself and insists the two agree. An independent check
 * rather than a second call to the same function, which is the whole point of
 * the simulator: if the engine and this ever disagree, one of them is wrong
 * and the seed says which game to look at.
 */
describe("a game given a length", () => {
  const ALL = Object.values(RULE_VARIANTS);

  /**
   * The length this game would really be held to, worked out here rather than
   * asked of the engine. Hex is exempt and has to be exempt: a full Hex board
   * always holds exactly one chain from side to side, so a drawn Hex game
   * cannot exist, and the rules page says so as a fact about the board.
   */
  function lengthByHand(state: { settings: { size: number; variant: string } }, share: number): number | null {
    if (VARIANT_SPECS[state.settings.variant as keyof typeof VARIANT_SPECS].connects) return null;
    const points = state.settings.size * state.settings.size;
    // A board smaller than nine by nine is over before a share of it arrives,
    // so it is given no length at all.
    if (points < 81) return null;
    return Math.floor(points * share);
  }

  it("never runs past the share of the board it was given", () => {
    for (const variant of ALL) {
      for (const [limit, share] of [["half", 1 / 2], ["threeQuarters", 3 / 4]] as const) {
        const final = playOut({ size: 9, variant, drawLimit: limit }, 77 + variant.length);
        const allowed = lengthByHand(final, share);
        if (allowed === null) continue;
        expect(
          final.moves.length,
          `${variant} under ${limit} played ${final.moves.length} moves, past ${allowed}`,
        ).toBeLessThanOrEqual(allowed);
        /*
         * Reaching the length must end the game. Stopping short of it need
         * not: the sliding games are called off by the simulator's own cap
         * long before any length matters, and that is the harness, not a
         * rule.
         */
        if (final.moves.length === allowed) {
          /*
           * Reaching the length ends the game, but not necessarily as a draw:
           * somebody may have won on the very move that reached it, and a win
           * beats a length. Either way it is over.
           */
          expect(final.status, `${variant} reached its length and kept playing`).not.toBe(
            GAME_STATUS.playing,
          );
          if (final.status === GAME_STATUS.draw) {
            expect(final.winner, `${variant} was drawn but has a winner`).toBeNull();
          }
        }
      }
    }
  });

  it("does not offer a length to a board too small to need one", () => {
    // Tic-tac-toe on 3×3: half the board is four moves, and a game cut short
    // after four moves is this setting misapplied, not a rule.
    const limited = playOut({ variant: RULE_VARIANTS.tictactoe, drawLimit: "half" }, 8080);
    const plain = playOut({ variant: RULE_VARIANTS.tictactoe }, 8080);
    expect(limited.moves.length).toBe(plain.moves.length);
    expect(limited.status).toBe(plain.status);
    expect(limited.moves.length).toBeGreaterThan(4);
  });

  it("does not offer a length to a game that cannot be drawn", () => {
    // Hex under a limit must play exactly as Hex without one.
    for (const variant of ALL) {
      if (!VARIANT_SPECS[variant].connects) continue;
      const limited = playOut({ size: 9, variant, drawLimit: "half" }, 404 + variant.length);
      const plain = playOut({ size: 9, variant }, 404 + variant.length);
      expect(limited.moves.length).toBe(plain.moves.length);
      expect(limited.status).toBe(plain.status);
      expect(limited.status, `${variant} was drawn, which its board forbids`).not.toBe(
        GAME_STATUS.draw,
      );
    }
  });

  it("leaves a game alone when no length was set", () => {
    // The same seeds, unlimited: nothing about this feature may change a game
    // nobody asked to shorten.
    for (const variant of ALL) {
      const unlimited = playOut({ size: 9, variant }, 77 + variant.length);
      const explicit = playOut({ size: 9, variant, drawLimit: "none" }, 77 + variant.length);
      expect(explicit.moves.length).toBe(unlimited.moves.length);
      expect(explicit.status).toBe(unlimited.status);
      expect(explicit.winner).toBe(unlimited.winner);
    }
  });
});
