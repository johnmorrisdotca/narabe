import { MOVE_KINDS, STONELESS_WORDS } from "../constants.ts";

/**
 * Whether a recorded move put nothing on the board: a pass, or a turn the
 * clock took away. Neither has a point — both sit at -1, -1 — so anything
 * reading a move's row and column asks this first.
 *
 * Not the question "was this a pass". Two passes in a row end a game, and a
 * forfeit before a pass is not the first of two: losing a turn on time says
 * nothing about whether anybody could move. Code asking THAT compares with
 * `MOVE_KINDS.pass` itself.
 */
export function leavesNoStone(kind: string | undefined): boolean {
  return kind === MOVE_KINDS.pass || kind === MOVE_KINDS.forfeit;
}

/**
 * How a written record says a move with no point, or null for a move that has
 * one. The words a move list and a copied notation print, so the two agree.
 */
export function stonelessWord(kind: string | undefined): string | null {
  if (kind === MOVE_KINDS.pass) return STONELESS_WORDS.pass;
  if (kind === MOVE_KINDS.forfeit) return STONELESS_WORDS.forfeit;
  return null;
}
