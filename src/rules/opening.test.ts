import { describe, expect, it } from "vitest";
import { canChooseColour, canExtendOpening, canSwapSeats, chooseColour, createGame, extendOpening, isLegalMove, playMove, resolveOpener, seatToPlay } from "../engine.ts";
import { openingDecidesColours } from "./opening.ts";
import { replayMoves } from "./record.ts";
import {
  FIRST_PLAYERS,
  OPENING_RULES,
  OPENING_STAGES,
  RULE_VARIANTS,
  SEATS,
  STONES,
} from "../constants.ts";
import type { GameState, Point } from "../types.ts";

const p = (row: number, col: number): Point => ({ row, col });
const centre = p(7, 7);

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

describe("pro and long pro", () => {
  it("forces the first stone onto tengen", () => {
    const game = createGame({ opening: OPENING_RULES.pro });
    expect(isLegalMove(game, p(0, 0))).toBe(false);
    expect(isLegalMove(game, centre)).toBe(true);
  });

  it("keeps black's second stone out of the central 5×5", () => {
    const game = play(createGame({ opening: OPENING_RULES.pro }), [centre, p(7, 8)]);
    expect(isLegalMove(game, p(9, 9))).toBe(false);
    expect(isLegalMove(game, p(10, 7))).toBe(true);
    // White was never restricted, and neither is black afterwards.
    const later = play(game, [p(10, 7), p(6, 6)]);
    expect(isLegalMove(later, p(8, 8))).toBe(true);
  });

  it("long pro widens the exclusion to 7×7", () => {
    const game = play(createGame({ opening: OPENING_RULES.longPro }), [centre, p(7, 8)]);
    expect(isLegalMove(game, p(10, 7))).toBe(false);
    expect(isLegalMove(game, p(11, 7))).toBe(true);
  });

  it("puts black on move one whatever the first-stone setting says", () => {
    const settings = createGame({
      opening: OPENING_RULES.pro,
      firstPlayer: FIRST_PLAYERS.white,
    }).settings;
    expect(resolveOpener(settings)).toBe(STONES.black);
  });
});

describe("the RIF opening", () => {
  const rif = { variant: RULE_VARIANTS.renju, opening: OPENING_RULES.rif } as const;

  it("confines the first three stones", () => {
    let game = createGame(rif);
    expect(isLegalMove(game, p(7, 8))).toBe(false);
    game = playMove(game, centre);
    // White must touch tengen.
    expect(isLegalMove(game, p(7, 9))).toBe(false);
    expect(isLegalMove(game, p(6, 8))).toBe(true);
    game = playMove(game, p(6, 8));
    // Black stays inside the 5×5.
    expect(isLegalMove(game, p(7, 10))).toBe(false);
    expect(isLegalMove(game, p(7, 9))).toBe(true);
  });

  it("then lets white choose a colour before anyone plays on", () => {
    const game = play(createGame(rif), [centre, p(6, 8), p(7, 9)]);
    expect(game.opening.stage).toBe(OPENING_STAGES.choosing);
    expect(seatToPlay(game)).toBe(SEATS.two);
    expect(isLegalMove(game, p(0, 0))).toBe(false);

    const swapped = chooseColour(game, STONES.black);
    expect(swapped.seats[STONES.black]).toBe(SEATS.two);
    expect(swapped.toPlay).toBe(STONES.white);
    expect(seatToPlay(swapped)).toBe(SEATS.one);
    expect(isLegalMove(swapped, p(0, 0))).toBe(true);
  });

  it("is only offered with renju", () => {
    const game = createGame({ variant: RULE_VARIANTS.freestyle, opening: OPENING_RULES.rif });
    expect(game.settings.opening).toBe(OPENING_RULES.free);
  });
});

describe("the Sakata opening", () => {
  const sakata = { variant: RULE_VARIANTS.renju, opening: OPENING_RULES.sakata } as const;

  it("starts as RIF, offers the swap, then keeps the fifth stone inside the 7×7", () => {
    let game = play(createGame(sakata), [centre, p(6, 8), p(7, 9)]);
    expect(game.opening.stage).toBe(OPENING_STAGES.choosing);
    game = chooseColour(game, STONES.white);
    expect(game.opening.stage).toBe(OPENING_STAGES.done);
    // White's second stone goes anywhere.
    expect(isLegalMove(game, p(0, 0))).toBe(true);
    game = playMove(game, p(0, 0));
    // Black's third must stay within three of tengen.
    expect(isLegalMove(game, p(3, 3))).toBe(false);
    expect(isLegalMove(game, p(4, 4))).toBe(true);
    game = playMove(game, p(4, 4));
    expect(isLegalMove(game, p(14, 14))).toBe(true);
  });
});

describe("the Tarannikov opening", () => {
  const tarannikov = { variant: RULE_VARIANTS.renju, opening: OPENING_RULES.tarannikov } as const;

  it("nests the first five stones and offers a swap after each", () => {
    let game = createGame(tarannikov);
    const stones = [centre, p(6, 7), p(5, 7), p(4, 7), p(3, 7)];
    for (const [index, stone] of stones.entries()) {
      // Just outside the square of the moment is refused; on it is fine.
      expect(isLegalMove(game, p(7 - index - 1, 7))).toBe(false);
      expect(isLegalMove(game, stone)).toBe(true);
      game = playMove(game, stone);
      expect(game.opening.stage).toBe(OPENING_STAGES.choosing);
      // The seat that did not lay the stone decides.
      expect(game.opening.actor).toBe(game.seats[game.toPlay]);
      game = chooseColour(game, game.toPlay);
    }
    expect(game.opening.stage).toBe(OPENING_STAGES.done);
    expect(game.opening.choices).toHaveLength(5);
    expect(isLegalMove(game, p(0, 0))).toBe(true);
  });

  it("swaps the seats when the decider takes the other colour, and plays on", () => {
    let game = playMove(createGame(tarannikov), centre);
    // Seat two, holding white, takes black: the seats exchange and white is still to move.
    expect(game.opening.actor).toBe(SEATS.two);
    game = chooseColour(game, STONES.black);
    expect(game.seats[STONES.black]).toBe(SEATS.two);
    expect(game.toPlay).toBe(STONES.white);
    expect(seatToPlay(game)).toBe(SEATS.one);
    expect(game.opening.stage).toBe(OPENING_STAGES.placing);
    game = playMove(game, p(6, 7));
    expect(game.opening.stage).toBe(OPENING_STAGES.choosing);
    expect(game.opening.actor).toBe(SEATS.two);
  });

  it("replays a record through all five decisions", () => {
    let game = createGame(tarannikov);
    const stones = [centre, p(6, 7), p(5, 7), p(4, 7), p(3, 7), p(0, 0)];
    const choices = [STONES.black, STONES.white, STONES.black, STONES.black, STONES.white];
    for (const [index, stone] of stones.entries()) {
      game = playMove(game, stone);
      if (index < choices.length) game = chooseColour(game, choices[index]);
    }
    const timeline = replayMoves(createGame(tarannikov), game.moves, game.opening.choices);
    const last = timeline[timeline.length - 1];
    expect(last.board).toEqual(game.board);
    expect(last.seats).toEqual(game.seats);
    expect(last.opening.stage).toBe(OPENING_STAGES.done);
  });
});

describe("swap", () => {
  it("has seat one lay three stones of alternating colour", () => {
    let game = createGame({ opening: OPENING_RULES.swap });
    expect(seatToPlay(game)).toBe(SEATS.one);
    game = playMove(game, centre);
    expect(game.toPlay).toBe(STONES.white);
    // Still seat one, even though white is to move.
    expect(seatToPlay(game)).toBe(SEATS.one);
    game = play(game, [p(7, 8), p(8, 8)]);
    expect(game.opening.stage).toBe(OPENING_STAGES.choosing);
    expect(seatToPlay(game)).toBe(SEATS.two);
  });

  it("lets seat two keep white without changing seats", () => {
    const game = play(createGame({ opening: OPENING_RULES.swap }), [centre, p(7, 8), p(8, 8)]);
    const kept = chooseColour(game, STONES.white);
    expect(kept.seats).toEqual(game.seats);
    expect(kept.opening.stage).toBe(OPENING_STAGES.done);
    expect(kept.opening.choices).toEqual([STONES.white]);
    expect(seatToPlay(kept)).toBe(SEATS.two);
  });

  it("does not offer the swap2 extension", () => {
    const game = play(createGame({ opening: OPENING_RULES.swap }), [centre, p(7, 8), p(8, 8)]);
    expect(canExtendOpening(game)).toBe(false);
    expect(extendOpening(game)).toBe(game);
  });

  it("blocks the informal seat swap while colours are unsettled", () => {
    const game = play(
      createGame({ opening: OPENING_RULES.swap, allowSwap: true }),
      [centre, p(7, 8), p(8, 8)],
    );
    expect(canSwapSeats(game)).toBe(false);
  });
});

describe("swap2", () => {
  const three = [centre, p(7, 8), p(8, 8)];

  it("lets the chooser add two stones and hand the choice back", () => {
    let game = play(createGame({ opening: OPENING_RULES.swap2 }), three);
    expect(canChooseColour(game)).toBe(true);
    expect(canExtendOpening(game)).toBe(true);

    game = extendOpening(game);
    expect(game.opening.stage).toBe(OPENING_STAGES.extending);
    expect(seatToPlay(game)).toBe(SEATS.two);
    expect(game.toPlay).toBe(STONES.white);

    game = play(game, [p(6, 6), p(9, 9)]);
    expect(game.opening.stage).toBe(OPENING_STAGES.choosing);
    expect(seatToPlay(game)).toBe(SEATS.one);
    expect(canExtendOpening(game)).toBe(false);

    const chosen = chooseColour(game, STONES.black);
    expect(chosen.seats[STONES.black]).toBe(SEATS.one);
    expect(chosen.opening.choices).toEqual(["extend", STONES.black]);
    expect(chosen.toPlay).toBe(STONES.white);
    expect(seatToPlay(chosen)).toBe(SEATS.two);
  });

  it("refuses a stone while a choice is pending", () => {
    const game = play(createGame({ opening: OPENING_RULES.swap2 }), three);
    expect(playMove(game, p(0, 0))).toBe(game);
  });

  it("replays a record through its decisions", () => {
    const start = createGame({ opening: OPENING_RULES.swap2 });
    const timeline = replayMoves(
      start,
      [...three, p(6, 6), p(9, 9), p(0, 0)],
      ["extend", STONES.black],
    );
    const last = timeline[timeline.length - 1];
    expect(last.moves).toHaveLength(6);
    expect(last.seats[STONES.black]).toBe(SEATS.one);
    expect(last.opening.stage).toBe(OPENING_STAGES.done);
  });

  it("assumes the chooser kept their colour when a record has no decisions", () => {
    const start = createGame({ opening: OPENING_RULES.swap });
    const timeline = replayMoves(start, [...three, p(0, 0)]);
    const last = timeline[timeline.length - 1];
    expect(last.moves).toHaveLength(4);
    expect(last.seats).toEqual(start.seats);
  });
});

/**
 * WHICH OPENINGS DECIDE THE COLOURS, asked as a question rather than read off a
 * list in a page.
 *
 * The doorstep states every fact a game will be played under before the game
 * exists, and under these five it cannot state the colours: one player lays the
 * first stones and the other looks at the position and chooses. Naming black
 * beforehand would be plausible and wrong half the time, so the page asks this
 * and says "the opening decides" instead.
 *
 * Tested here, beside the rule, rather than in the page — and tested in BOTH
 * directions, because the failure that matters is the false negative: an opening
 * that swaps and answers no would have the doorstep promising a colour it cannot
 * deliver, which is worse than saying nothing.
 */
describe("whether an opening decides who plays which colour", () => {
  it("says yes to every protocol that offers a swap", () => {
    for (const opening of [
      OPENING_RULES.swap,
      OPENING_RULES.swap2,
      OPENING_RULES.rif,
      OPENING_RULES.sakata,
      OPENING_RULES.tarannikov,
    ]) {
      expect(openingDecidesColours(opening), opening).toBe(true);
    }
  });

  it("says no to the ones that only restrict where stones may go", () => {
    for (const opening of [OPENING_RULES.free, OPENING_RULES.pro, OPENING_RULES.longPro]) {
      expect(openingDecidesColours(opening), opening).toBe(false);
    }
  });

  it("agrees with the engine: a yes is an opening that actually pauses to choose", () => {
    /*
     * The answer checked against the thing it is an answer about, rather than
     * against a second list. An opening that decides the colours is one that reaches
     * a `choosing` stage, so a swap added to one list and not the other shows up
     * here instead of in a sentence on a page nobody is testing.
     */
    const three = [centre, p(7, 8), p(8, 8)];
    /*
     * The renju protocols are on renju, because `normaliseSettings` drops an
     * opening the variant does not offer — a freestyle game asked for RIF is
     * quietly a free one, and a case that did not know that would be testing the
     * fallback while believing it was testing the swap.
     */
    for (const [opening, variant] of [
      [OPENING_RULES.swap, RULE_VARIANTS.freestyle],
      [OPENING_RULES.swap2, RULE_VARIANTS.freestyle],
      [OPENING_RULES.rif, RULE_VARIANTS.renju],
    ] as const) {
      const game = play(createGame({ variant, opening }), three);
      expect(game.settings.opening, opening).toBe(opening);
      expect(game.opening.stage, opening).toBe(OPENING_STAGES.choosing);
      expect(openingDecidesColours(opening), opening).toBe(true);
    }
    const plain = play(createGame({ opening: OPENING_RULES.free }), three);
    expect(plain.opening.stage).toBe(OPENING_STAGES.done);
  });
});
