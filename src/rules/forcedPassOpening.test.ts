import { describe, expect, it } from "vitest";

import {
  canChooseColour,
  canPass,
  createGame,
  extendOpening,
  forfeitOnRecord,
  mustPass,
  playMove,
} from "../engine.ts";
import { MOVE_KINDS, OPENING_RULES, OPENING_STAGES, SEATS, STONES } from "../constants.ts";
import type { GameState, MoveInput, Point } from "../types.ts";
import { passesOwed } from "./forcedPass.ts";
import { replayMoves } from "./record.ts";

/**
 * A COLOUR TO CHOOSE IS A MOVE, NEVER A PASS.
 *
 * The 0.192.0 regression: after swap2's third stone every point is refused
 * until the colour is chosen, so `mustPass` read "nothing to play" and the
 * automatic pass took the chooser's turn instead of offering the choice
 * (e2e/variants.spec.ts:63, red on main). Each of these positions waits on a
 * decision, and none of them owes a pass.
 */

const p = (row: number, col: number): Point => ({ row, col });
const three = [p(7, 7), p(7, 8), p(8, 8)];

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

function expectNoPassOwed(state: GameState) {
  expect(canChooseColour(state)).toBe(true);
  expect(mustPass(state)).toBe(false);
  expect(canPass(state)).toBe(false);
  // The very same position back: nothing written, nothing handed on.
  expect(passesOwed(state)).toBe(state);
}

describe("a pending opening choice owes no pass", () => {
  it("swap2, after its third stone: take black, take white or extend", () => {
    const game = play(createGame({ opening: OPENING_RULES.swap2 }), three);
    expect(game.opening.stage).toBe(OPENING_STAGES.choosing);
    expectNoPassOwed(game);
  });

  it("swap2, after the extension's two stones hand the choice back", () => {
    const game = play(extendOpening(play(createGame({ opening: OPENING_RULES.swap2 }), three)), [p(6, 6), p(9, 9)]);
    expect(game.opening.stage).toBe(OPENING_STAGES.choosing);
    expectNoPassOwed(game);
  });

  it("plain swap, after its third stone", () => {
    expectNoPassOwed(play(createGame({ opening: OPENING_RULES.swap }), three));
  });
});

/**
 * A DEADLINE MISSED DURING THE CHOICE COSTS THE TURN, AND THE RECORD REPLAYS IT.
 *
 * Before this a claim during a pending choice wrote nothing and answered that
 * the game was over, so a chooser who never chose held a timed game for ever.
 * Now the choice is made the way the replay makes one the record does not
 * hold — the colour to move keeps its side — and the turn is forfeited, so the
 * forfeit row replays to the same position.
 */
describe("a missed deadline while a colour choice waits", () => {
  it("keeps the colour to move on its side, forfeits that turn, and hands the move on", () => {
    const waiting = play(createGame({ opening: OPENING_RULES.swap2 }), three);
    expect(waiting.toPlay).toBe(STONES.white);

    const settled = forfeitOnRecord(waiting);
    expect(settled.opening.stage).toBe(OPENING_STAGES.done);
    // White's seat kept white: nobody's colours moved without them choosing.
    expect(settled.seats).toEqual(waiting.seats);
    expect(settled.seats[STONES.white]).toBe(SEATS.two);
    expect(settled.moves.slice(-1)).toMatchObject([{ kind: MOVE_KINDS.forfeit, stone: STONES.white }]);
    expect(settled.toPlay).toBe(STONES.black);
  });

  it("replays from a record holding the stones and the forfeit, to the same position", () => {
    const start = createGame({ opening: OPENING_RULES.swap2 });
    const settled = forfeitOnRecord(play(start, three));
    const record: MoveInput[] = settled.moves.map((move) => ({ row: move.row, col: move.col, kind: move.kind, stone: move.stone }));

    // No choices stored, as on a live row, and a clock, since only a clock takes a turn away.
    const timeline = replayMoves(start, record, [], { clocked: true });
    const last = timeline[timeline.length - 1];
    expect(last.moves).toHaveLength(settled.moves.length);
    expect(last.toPlay).toBe(settled.toPlay);
    expect(last.seats).toEqual(settled.seats);
    expect(last.opening.stage).toBe(OPENING_STAGES.done);
  });
});
