import { VARIANT_SPECS } from "../constants.ts";
import type { GameSettings, Move, Stone } from "../types.ts";
import { rulesFor } from "./handicap.ts";

/**
 * How many stones the colour to move has already placed this turn: the run of
 * its own moves at the end of the record. Derived rather than stored, so a
 * replayed or undone game cannot disagree with its move list.
 */
export function stonesPlacedThisTurn(moves: readonly Move[], stone: Stone): number {
  let placed = 0;
  for (let index = moves.length - 1; index >= 0; index -= 1) {
    if ((moves[index].by ?? moves[index].stone) !== stone) break;
    placed += 1;
  }
  return placed;
}

/** Stones the colour to move gets this turn. Connect6 opens with one, then two. */
export function stonesThisTurn(
  settings: GameSettings,
  moves: readonly Move[],
  stone: Stone,
): number {
  const perTurn = rulesFor(settings, stone).stonesPerTurn;
  const placed = stonesPlacedThisTurn(moves, stone);
  const isFirstTurn = placed === moves.length;
  return isFirstTurn
    ? Math.min(VARIANT_SPECS[settings.variant].firstTurnStones, perTurn)
    : perTurn;
}

/** Stones still to place before the turn passes. */
export function stonesLeftInTurn(
  settings: GameSettings,
  moves: readonly Move[],
  stone: Stone,
): number {
  return Math.max(
    0,
    stonesThisTurn(settings, moves, stone) - stonesPlacedThisTurn(moves, stone),
  );
}
