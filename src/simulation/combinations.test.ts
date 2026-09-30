import { describe, expect, it } from "vitest";

import {
  GAME_STATUS,
  NO_HANDICAP,
  NO_HEAD_START,
  OPENING_RULES,
  RULE_VARIANTS,
  STONES,
  VARIANT_SPECS,
  boardSizesFor,
} from "../constants.ts";
import { createGame } from "../engine.ts";
import { replayMoves } from "../rules/record.ts";
import type { Handicap, RuleVariant } from "../types.ts";
import { traditionalCounts } from "../rules/headStart.ts";
import { checkHeadStartRecord, checkHeadStartStart } from "./headStart.ts";
import { playOut } from "./support.ts";

/**
 * Every game, on every board it offers, under every opening it offers, and
 * with a handicap laid over it.
 *
 * The simulator already plays every variant, and it already plays several
 * board sizes — but never the two together, and never with an opening or a
 * handicap in the way. Each of those reaches into the engine from a different
 * direction, and a game breaks where two of them meet far more often than
 * where one of them is.
 *
 * COUNTED FROM `VARIANT_SPECS`, NOT WRITTEN DOWN. A game added to the specs is
 * played here on every board its own row claims, without anybody remembering
 * to add it — the same bargain the New Game Gate makes, and the reason this is
 * worth more than a longer list of hand-picked cases.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO, because the simulator cannot yet judge
 * it and a test that cannot judge its subject is worse than no test:
 *
 *  - It does not lengthen a colour's line with `longerLine`. That one does not
 *    tighten what wins, it moves the target — and on the smallest board a game
 *    offers, needing six where the game is five is a game nobody can win,
 *    which tests the board rather than the handicap.
 *
 * WHAT THIS SWEEP ALREADY FOUND, kept because it says what the sweep is for.
 * Under the heaviest handicap it reached a position with a free point on the
 * board, a game that still said it was being played, and nothing any colour
 * could do. I could only make it happen in Edge Drop and left the rules
 * question alone; it turned out not to be Edge Drop's at all. The same
 * deadlock was in Gomoku, Tournament Gomoku, Renju, Caro, Misère Five and Hex
 * at three sizes, and the cause was one gate: `mustPass` already knew what to
 * do when nobody can move, and only offered it to the piece games, so every
 * stone game fell past the rule that existed for exactly this. Fixed in
 * 0.104.3 by extending `mustPass` to the stone games — a stuck turn passes,
 * rather than losing, because a handicap exists to make a game fair and
 * taking the game off the handicapped player on a technicality is the
 * opposite of that. `stuck.test.ts` holds the cases.
 *
 * The lesson for anything found here: one variant is where a fault SHOWED,
 * not where it LIVES. Mine looked like a dropping-game oddity because that is
 * the seed that happened to hit it.
 */

const EVERY_VARIANT = Object.values(RULE_VARIANTS) as RuleVariant[];

/** The openings a player walks through alone, with nothing to decide. */
const NO_CHOICE: readonly string[] = [OPENING_RULES.free, OPENING_RULES.pro, OPENING_RULES.longPro];

/** A seed that depends on the combination, so two of them never play the same game. */
function seedFor(variant: string, extra: string, index: number): number {
  let hash = index * 2_654_435_761;
  for (const text of [variant, extra]) {
    for (let at = 0; at < text.length; at += 1) {
      hash = (hash * 31 + text.charCodeAt(at)) >>> 0;
    }
  }
  return (hash % 100_000) + 1;
}

/**
 * The one thing every game must be able to do: be replayed from its own move
 * list. A stored game is its settings and its moves and nothing else, so a
 * replay that diverges means a saved game and the game that was played are
 * two different games.
 */
function replays(final: ReturnType<typeof playOut>, what: string) {
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
      stone: move.stone,
    })),
    final.opening.choices,
  );
  const replayed = timeline[timeline.length - 1];
  expect(replayed.board, `${what}: replayed board differs`).toEqual(final.board);
  expect(replayed.status, `${what}: replayed status differs`).toBe(final.status);
  expect(replayed.winner, `${what}: replayed winner differs`).toBe(final.winner);
}

describe("every game on every board it offers", () => {
  it("plays out, and replays from its moves alone", () => {
    let played = 0;
    for (const variant of EVERY_VARIANT) {
      for (const [index, size] of boardSizesFor(variant).entries()) {
        const what = `${variant} on ${size}×${size}`;
        const final = playOut({ variant, size }, seedFor(variant, String(size), index));
        // The board it was played on is the board it was given: a game that
        // quietly resized itself would make its own record a lie.
        expect(final.settings.size, `${what}: played on another board`).toBe(size);
        expect(final.board, `${what}: board is the wrong length`).toHaveLength(size * size);
        replays(final, what);
        played += 1;
      }
    }
    // The sweep is only worth having if it is actually sweeping.
    expect(played).toBeGreaterThan(EVERY_VARIANT.length);
  });
});

describe("every game under every opening it offers", () => {
  it("plays out, decisions and all", () => {
    for (const variant of EVERY_VARIANT) {
      for (const [index, opening] of VARIANT_SPECS[variant].openings.entries()) {
        const what = `${variant} with the ${opening} opening`;
        const final = playOut({ variant, opening }, seedFor(variant, opening, index + 7));
        expect(final.settings.opening, `${what}: played under another opening`).toBe(opening);
        /*
         * A game that is over before anybody has moved is the shape a broken
         * opening takes: a mistake there ends the game rather than refusing
         * something, and the record looks ordinary afterwards.
         */
        if (final.status !== GAME_STATUS.playing) {
          expect(final.moves.length, `${what}: finished with an empty board`).toBeGreaterThan(0);
        }
        replays(final, what);
      }
    }
  });

  it("makes a real decision in the openings that have one", () => {
    /*
     * The swap protocols hand colours about before the first stone, and the
     * decision is kept on the game — a stored game is its settings, its moves
     * AND its decisions, or a replay takes a different turning. That a
     * decision was recorded at all is what this asks; whether the replay
     * follows it is asked by `replays` above, on the same games.
     */
    let decided = 0;
    for (const variant of EVERY_VARIANT) {
      for (const [index, opening] of VARIANT_SPECS[variant].openings.entries()) {
        if (NO_CHOICE.includes(opening)) continue;
        const what = `${variant} with the ${opening} opening`;
        const final = playOut({ variant, opening }, seedFor(variant, opening, index + 7));
        expect(
          final.opening.choices.length,
          `${what}: played through a swap opening without ever choosing`,
        ).toBeGreaterThan(0);
        decided += 1;
      }
    }
    expect(decided, "no game offers an opening with a decision in it").toBeGreaterThan(0);
  });

  it("starts every opening that has something to decide, with nothing decided yet", () => {
    let checked = 0;
    for (const variant of EVERY_VARIANT) {
      for (const opening of VARIANT_SPECS[variant].openings) {
        if (NO_CHOICE.includes(opening)) continue;
        const what = `${variant} with the ${opening} opening`;
        const game = createGame({ variant, opening });
        expect(game.settings.opening, `${what}: created under another opening`).toBe(opening);
        expect(game.status, `${what}: began already over`).toBe(GAME_STATUS.playing);
        expect(game.opening.choices, `${what}: began with a decision already made`).toEqual([]);
        checked += 1;
      }
    }
    expect(checked, "no game offers an opening with a decision in it").toBeGreaterThan(0);
  });
});

describe("every game with a head start", () => {
  /*
   * Free turns for every game, one to three by the game's place in the list, for
   * each colour, with the most of its traditional head start it offers on its
   * first board. The simulator takes each head-start turn as a forced pass and
   * checks it by hand (`simulation.headStart.ts`), and the record must replay.
   */
  it("gives its free turns and its traditional start, and replays from its moves", () => {
    let played = 0;
    for (const [index, variant] of EVERY_VARIANT.entries()) {
      for (const stone of [STONES.black, STONES.white]) {
        const size = boardSizesFor(variant)[0];
        const counts = traditionalCounts(variant, size);
        // Never more free turns than the game offers: more would be refused, and this is about the ones given.
        const freeTurns = Math.min(1 + (index % 3), VARIANT_SPECS[variant].headStartTurns);
        const traditional = counts.length > 0 ? counts[counts.length - 1] : 0;
        const headStart = freeTurns === 0 && traditional === 0 ? NO_HEAD_START : { stone, freeTurns, traditional };
        const what = `${variant} with a head start for ${stone}`;
        const final = playOut({ variant, size, headStart }, seedFor(variant, `head-start-${stone}`, index + 41));
        expect(final.settings.headStart, `${what}: the head start was dropped`).toEqual(headStart);
        checkHeadStartRecord(final, what);
        replays(final, what);
        played += 1;
      }
    }
    expect(played).toBe(EVERY_VARIANT.length * 2);
  });

  it("sets out every traditional head start on every board that offers one", () => {
    let checked = 0;
    for (const variant of EVERY_VARIANT) {
      for (const size of boardSizesFor(variant)) {
        for (const traditional of traditionalCounts(variant, size)) {
          for (const stone of [STONES.black, STONES.white]) {
            checkHeadStartStart(createGame({ variant, size, headStart: { stone, freeTurns: 0, traditional } }), traditional);
            checked += 1;
          }
        }
      }
    }
    // Go on three boards, four Othello games and six draughts games: well over this.
    expect(checked).toBeGreaterThan(60);
  });
});

describe("every game with a handicap laid over it", () => {
  /*
   * Every handicap at once — the ones that forbid a move and the ones that
   * decide a win. Everything that asks "may this colour…" reads `rulesFor`,
   * which lays this over the variant's own spec, so this is where the two
   * disagree most, and it is now a disagreement the independent scan can
   * judge: `runWinsIndependently` restates the line handicaps by hand.
   *
   * `longerLine` is left out of the pile on purpose. It does not tighten what
   * wins, it makes the line one longer — and on the smallest boards a game
   * offers, six in a row where five was the game is a game that cannot be won
   * at all, which tests the board rather than the handicap.
   */
  const heavy = (stone: Handicap["stone"]): Handicap => ({
    ...NO_HANDICAP,
    stone,
    doubleThree: true,
    doubleFour: true,
    exactLine: true,
    openLine: true,
    overline: true,
  });

  it("still plays out, for one colour or the other", () => {
    /*
     * One colour per game, alternating down the list, rather than both for
     * every game. Two full games a variant doubled what this file costs the
     * unit gate to say something the first one had already said; alternating
     * still puts every rule under both colours across the sweep.
     */
    for (const [index, variant] of EVERY_VARIANT.entries()) {
      const stone = index % 2 === 0 ? STONES.black : STONES.white;
      const what = `${variant} with ${stone} handicapped`;
      const final = playOut(
        { variant, handicap: heavy(stone) },
        seedFor(variant, `handicap-${stone}`, index + 23),
      );
      expect(final.settings.handicap.stone, `${what}: the handicap was dropped`).toBe(stone);
      replays(final, what);
    }
  });

  it("gives the unhandicapped colour exactly the rules its variant gives it", () => {
    /*
     * A handicap belongs to one colour. The commonest way to get this wrong
     * is to lay it over the board rather than over a player, and that is
     * invisible in a game where both sides are being watched loosely: the
     * game still ends, somebody still wins.
     */
    for (const variant of EVERY_VARIANT) {
      // Created rather than played: this asks what the game was set up with,
      // and a whole game of random moves to answer that is nine seconds of
      // the unit gate spent on a question the first line already answers.
      const asked = heavy(STONES.black);
      const game = createGame({ variant, handicap: asked });
      /*
       * The whole object, not three fields of it. Naming fields is how a test
       * stops noticing: this one asserted `overline` was false, and went on
       * asserting it after the handicap it was given grew an overline rule.
       */
      expect(game.settings.handicap, `${variant}: the handicap was not laid down as given`).toEqual(asked);
    }
  });
});
