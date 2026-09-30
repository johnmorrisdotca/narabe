import { VARIANT_SPECS } from "./constants.ts";
import { emptyBoard } from "./obstacles.ts";
import type { GameSettings } from "./types.ts";

/**
 * How long a game can get, and whether anything stops it.
 *
 * John's question is about cost rather than patience: a game that never ends
 * is a row written to, read and drawn for ever. The answer is not the same for
 * every game here, and the difference is mechanical rather than a matter of
 * degree.
 *
 * A placement game is bounded by its own board. Every move fills a point and
 * no point is ever given back, so the longest possible game is the number of
 * points there are to fill. That bound is reached in practice — Hex ran the
 * full 361 on 19×19, Caro the full 225 on 15×15 — and since 0.104.3 it is
 * actually reached rather than approached, because a position nobody can move
 * in now ends instead of stopping.
 *
 * Two mechanisms break that. A game that CAPTURES gives points back, and a
 * game that CLEARS a row does the same wholesale, so both can run longer than
 * the board is wide: Sannuki managed 97 moves on 81 points, and Go — which
 * captures freely — managed 321 on 81 and 444 on 361. Go is held by its own
 * two-pass ending rather than by the board.
 *
 * The games where pieces MOVE are the ones with nothing holding them at all.
 * A slide neither fills a point nor empties one, so the position can wander
 * for ever, and there is no repetition rule and no fifty-move rule to stop it.
 * Measured rather than assumed: Halma and Chinese Checkers were still playing
 * after sixty thousand random moves, at every board size and every seed tried.
 * Not slow — unbounded.
 *
 * Checkers is the exception among them, and for a reason worth keeping: a
 * capture removes a piece and pieces are never added, so material runs down
 * and the game converges. It finished in 48, 49 and 108 moves. The rules still
 * do not FORCE that — two kings can shuffle for ever — so it is counted here
 * with the unbounded ones. What is measured is what random play does; what is
 * returned is what the rules guarantee.
 */

/** Why a game has no bound, or null when the board is its bound. */
export type NoBoundReason = "pieces-move" | "captures" | "line-clear";

/**
 * The most moves a game of these settings can contain, or null when nothing
 * in the rules bounds it.
 *
 * Read from the spec rather than from a list of variant names, so a game added
 * tomorrow is classified the day it lands.
 */
export function longestPossibleGame(settings: GameSettings): number | null {
  if (noBoundReason(settings) !== null) return null;
  // Obstacles are points that were never available, so they do not count.
  return emptyBoard(settings).filter((cell) => cell === null).length;
}

/**
 * What stops this game being bounded by its board, or null when nothing does.
 *
 * Order matters only for the answer given to a reader: a game that both moves
 * pieces and captures is unbounded for the first reason, which is the stronger
 * one — captures at least run material down, and sliding does not.
 */
export function noBoundReason(settings: GameSettings): NoBoundReason | null {
  const spec = VARIANT_SPECS[settings.variant];
  if (spec.camps || spec.checkers || spec.chineseCheckers || spec.pieces !== null) return "pieces-move";
  if (spec.captures || spec.go) return "captures";
  if (spec.lineClear) return "line-clear";
  return null;
}

/** Whether the rules alone guarantee this game ends. */
export function endsOnItsOwn(settings: GameSettings): boolean {
  return longestPossibleGame(settings) !== null;
}
