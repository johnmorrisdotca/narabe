import {
  DRAW_LIMIT_MIN_POINTS,
  DRAW_LIMIT_SHARE,
  GAME_STATUS,
  VARIANT_SPECS,
} from "../constants.ts";
import type { GameSettings, GameState } from "../types.ts";
import { drawnByCheckersRule } from "./checkersDraws.ts";
import { stalled } from "./noProgress.ts";

/**
 * Calling a long game a draw.
 *
 * Some of these games can run for ever between two careful players — the
 * misère forms especially, where every stone you place is one fewer safe
 * point and neither side wants to move. A board that never fills is a game
 * neither player can leave, and "agree a draw" is not something two people
 * playing over a week can do easily.
 *
 * So a game may be given a length. It is a share of the board's points
 * rather than a number of moves, which is the whole point of it: one setting
 * means something sensible on 9×9 and on 19×19 without anybody working
 * anything out.
 *
 * What is counted is moves, not stones. In the games where a turn lays more
 * than one stone the board fills long before the count is reached, so the
 * limit simply never bites there — which is right, since those games end on
 * their own.
 */

/**
 * Whether this game can be drawn at all.
 *
 * Hex cannot. A full Hex board always holds exactly one chain from side to
 * side, so there is no position in which neither player has won — and the
 * rules page says so as a fact about the shape of the board rather than as a
 * rule anybody wrote. A length that could produce a drawn Hex game would make
 * that sentence false, so the length simply does not apply there, and the
 * setting is refused rather than quietly ignored.
 *
 * Read from the spec, never from a variant's name: any game that is won by
 * joining two sides has the same theorem behind it.
 */
export function canBeDrawn(settings: GameSettings): boolean {
  return !VARIANT_SPECS[settings.variant].connects;
}

/**
 * Whether the board is big enough for a length to mean anything.
 *
 * A small board resolves on its own before any share of it has been played.
 * Ending a game of noughts and crosses after four moves is not a rule anybody
 * would want; it is this setting misapplied.
 */
export function bigEnoughForLength(settings: GameSettings): boolean {
  return settings.size * settings.size >= DRAW_LIMIT_MIN_POINTS;
}

/**
 * Why this game may not be given a length, or null when it may.
 *
 * Two reasons, and they are not the same, so the player is told which:
 * a game that cannot be drawn at all, and a board too small for a share of it
 * to arrive before the game is over anyway.
 */
export function lengthReason(settings: GameSettings): "cannot-draw" | "too-small" | null {
  if (!canBeDrawn(settings)) return "cannot-draw";
  if (!bigEnoughForLength(settings)) return "too-small";
  return null;
}

/**
 * How many moves may be played before a game nobody has won is a draw, or
 * null when it is to be played out.
 *
 * Rounded down, so "half the board" on an odd board is the smaller half: a
 * limit that arrives a move early is easier to defend than one that arrives
 * a move late.
 */
export function movesBeforeDraw(settings: GameSettings): number | null {
  if (lengthReason(settings) !== null) return null;
  /*
   * `?? null` as well as the null case: a game stored before this setting
   * existed carries no value for it, and a limit nobody recognises has to
   * mean "play it out" rather than an arithmetic answer of NaN.
   */
  const share = DRAW_LIMIT_SHARE[settings.drawLimit] ?? null;
  if (share === null) return null;
  return Math.floor(settings.size * settings.size * share);
}

/** Whether this position has reached the length the players agreed to. */
export function reachedDrawLimit(state: GameState): boolean {
  if (state.status !== GAME_STATUS.playing) return false;
  const limit = movesBeforeDraw(state.settings);
  return limit !== null && state.moves.length >= limit;
}

/**
 * The state as it stands, or drawn if it has run to its length.
 *
 * Applied after a turn is complete rather than after every change: a stone
 * that owes a quarter turn has not finished its move, and calling that a
 * draw would leave a board mid-turn for ever.
 */
export function settleDraw(state: GameState): GameState {
  if (state.pendingTwist) return state;
  /*
   * Two rules, and they are genuinely different questions: the players agreed
   * to at most so many moves, and nobody is getting anywhere. They are already
   * two functions — `reachedDrawLimit` and `stalled` — which is where that
   * distinction belongs.
   *
   * They are applied together, and by one function rather than two, because
   * every one of the ten callers wants both and a caller that remembered only
   * one would silently stop applying a backstop on that path. This was very
   * nearly split apart on the argument that no name covered both jobs; the
   * name was the thing at fault, not the joining.
   *
   * The agreed length is a share of the board, for games that fill it.
   * `stalled` is for the games that fill nothing — pieces that move rather
   * than land — where the board bounds nothing and a game can run for ever.
   *
   * And a third, which is neither of those: the draws a game of the checkers
   * family writes into its own rules — a position come round too often, an
   * ending not won inside its count. Those are results the game's federation
   * defines, not backstops this site added, and `drawnByCheckersRule` answers
   * false for every game whose rules name none.
   */
  if (reachedDrawLimit(state) || stalled(state) || drawnByCheckersRule(state)) {
    return { ...state, status: GAME_STATUS.draw };
  }
  return state;
}

/**
 * Whether a finished game was drawn because it ran to its length, rather than
 * because the board filled or both sides made a line at once.
 *
 * The status line has to say which: "both made a line at once" is a different
 * thing from "we agreed to stop here", and telling a player the wrong one is
 * worse than telling them nothing.
 */
export function drawnByLength(state: GameState): boolean {
  if (state.status !== GAME_STATUS.draw) return false;
  const limit = movesBeforeDraw(state.settings);
  return limit !== null && state.moves.length >= limit;
}
