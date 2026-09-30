import { GAME_STATUS, MOVE_KINDS, VARIANT_SPECS } from "../constants.ts";
import type { GameState, Stone } from "../types.ts";
import { mustPass, passTurn } from "../engine.ts";
import { otherStone } from "./board.ts";

/**
 * The pass nobody should have to click for.
 *
 * John, on Othello: "when you CANNOT make a move… probably don't need to wait
 * for the player to skip. we skip for him I presume." The flipping games always
 * did — `playFlip` hands the turn straight back when the other colour has
 * nowhere to go — but every other game with a forced pass stopped and waited:
 * a piece that fits nowhere, a point every one of which a handicap forbids.
 * The player was sent a "your move" for a turn with nothing in it, and the game
 * sat until they pressed Pass or their clock ran out.
 *
 * So whoever writes a move asks this for the position after it, and records
 * every pass it returns in the same write. The engine's own moves are
 * untouched, which is what keeps every record ever stored replaying as it was:
 * a pass is still a row, replayed by `passTurn`, and a forced pass is only one
 * the writer no longer waits for.
 *
 * The dependency runs one way, from here into the engine, as `record.ts` does.
 */

/**
 * Two forced passes in a row end any game that passes, so no position owes
 * more than that. Written as a bound rather than a `while`, so a rule that
 * somehow kept owing passes stops rather than spins.
 */
const MOST_PASSES_OWED = 2;

/**
 * The position after every pass the rules force: none when the colour to move
 * has something to play, one when only it is stuck, and two — ending the game
 * — when neither side can move. Never a pass for a colour with a move, and
 * never Go's, which is a choice.
 */
export function passesOwed(state: GameState): GameState {
  let settled = state;
  for (let owed = 0; owed < MOST_PASSES_OWED && mustPass(settled); owed += 1) {
    const passed = passTurn(settled);
    if (passed === settled) break;
    settled = passed;
  }
  return settled;
}

/**
 * The colour whose turn passed because it had no move, as the latest turn left
 * the board — or null when nobody's did.
 *
 * Two ways a turn passes, and the record says both: a forced pass on the record,
 * and the flipping games' pass with no row at all, where the colour that just
 * moved is to move again. A pass somebody chose — Go's — is not one.
 */
export function turnPassedBy(state: GameState): Stone | null {
  const last = state.moves[state.moves.length - 1];
  if (last === undefined) return null;
  // A turn lost on time is the clock's doing, not a turn with no move in it: it says nothing here.
  if (last.kind === MOVE_KINDS.forfeit) return null;
  if (last.kind === MOVE_KINDS.pass) return last.forced === true ? last.stone : null;
  const skipped =
    VARIANT_SPECS[state.settings.variant].flips &&
    state.status === GAME_STATUS.playing &&
    last.kind === MOVE_KINDS.place &&
    last.stone === state.toPlay;
  return skipped ? otherStone(last.stone) : null;
}

/** Whether the game ended because neither side had a move: two forced passes, the last two moves on the record. */
export function endedWithNoMoves(state: GameState): boolean {
  if (state.status === GAME_STATUS.playing) return false;
  const [before, last] = state.moves.slice(-2);
  return before?.forced === true && last?.forced === true;
}
