import { GAME_STATUS, TURN_CHOICE_KINDS, VARIANT_SPECS } from "../constants.ts";
import type { GameState, Point, TurnChoices } from "../types.ts";
import { inMovePhase, legalPoints, pieceMoves, pointOf } from "../engine.ts";
import { checkersNarrowing } from "./checkers.ts";

/**
 * What the colour to move may do this turn — every piece that has a move, or
 * every point that may be played — and whether a rule narrowed it.
 *
 * A question put to the engine's own answers, adding no rule of its own:
 * `pieceMoves` and `legalPoints` already decide what is legal, and this gathers
 * them so a board can show a player the few things they may do without working
 * any of it out itself. The board's marking reads this and nothing else.
 *
 * The dependency runs one way, from here into the engine, as `record.ts` does;
 * nothing in the engine calls this.
 *
 * Null where a turn has no set of moves to show: a finished game, a quarter
 * turn owed, a game whose piece is laid by its footprint from a queue, and Go,
 * where a pass is always on offer beside the points.
 */
export function turnChoices(state: GameState): TurnChoices | null {
  if (state.status !== GAME_STATUS.playing || state.pendingTwist) return null;
  const spec = VARIANT_SPECS[state.settings.variant];
  if (spec.queue !== null || spec.go) return null;

  if (inMovePhase(state)) {
    const { size } = state.settings;
    const pieces: Point[] = [];
    let count = 0;
    state.board.forEach((cell, index) => {
      if (cell !== state.toPlay) return;
      const from = pointOf(size, index);
      const moves = pieceMoves(state, from).length;
      if (moves === 0) return;
      pieces.push(from);
      count += moves;
    });
    return {
      kind: TURN_CHOICE_KINDS.move,
      pieces,
      count,
      narrowedBy: spec.checkers ? checkersNarrowing(state) : null,
    };
  }

  const points = legalPoints(state);
  return { kind: TURN_CHOICE_KINDS.place, points, count: points.length };
}
