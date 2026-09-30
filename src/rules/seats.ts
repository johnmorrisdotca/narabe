import {
  GAME_STATUS,
  MOVE_KINDS,
  NO_POINT,
  OPENING_STAGES,
  STONES,
  WIN_REASONS,
} from "../constants.ts";
import type { GameState, Move, Seat, Stone } from "../types.ts";
import { otherStone } from "./board.ts";
import { hasHandicap } from "./handicap.ts";
import { won } from "./mechanics.ts";

/**
 * Who sits where. Seats are distinct from colours because a swap opening or
 * an informal swap can move a colour between the two people at the board.
 */

/** The seat holding `stone` right now. Swaps move seats between colours. */
export function seatOf(state: GameState, stone: Stone): Seat {
  return state.seats[stone];
}

/**
 * The seat whose turn it is. During a swap opening one seat lays every stone
 * and then the other decides, whatever colour those stones are.
 */
export function seatToPlay(state: GameState): Seat {
  return state.opening.actor ?? seatOf(state, state.toPlay);
}

/**
 * Whether the seat to play may trade seats right now. This covers the
 * mechanical limits only; `analysis.ts` adds the rule that you cannot swap
 * into a position the opponent has already won. Not while an opening protocol
 * is still settling who holds which colour, and never under a handicap, which
 * belongs to a colour and would otherwise change hands with it.
 */
export function canSwapSeats(state: GameState): boolean {
  return (
    state.settings.allowSwap &&
    !hasHandicap(state.settings) &&
    state.status === GAME_STATUS.playing &&
    state.opening.stage === OPENING_STAGES.done &&
    state.moves.length > 0 &&
    state.swapsUsed[seatToPlay(state)] < state.settings.swapsPerSeat
  );
}

/**
 * Trades seats: the player to move hands over their colour and takes the
 * opponent's stones instead. The board is untouched and the turn passes, so a
 * swap costs you the move you were about to make.
 */
export function swapSeats(state: GameState): GameState {
  if (!canSwapSeats(state)) return state;

  const mover = seatToPlay(state);
  return {
    ...state,
    seats: {
      black: state.seats[STONES.white],
      white: state.seats[STONES.black],
    },
    swapsUsed: { ...state.swapsUsed, [mover]: state.swapsUsed[mover] + 1 },
  };
}

/**
 * Ends the game against a player who has run out of time.
 *
 * A clock is not a rule of gomoku, so the engine does not run one — but the
 * result still has to be a proper game state rather than something the UI
 * paints over the top, or the record and the board would disagree.
 */
export function winOnTime(state: GameState, loser: Stone): GameState {
  if (state.status !== GAME_STATUS.playing) return state;
  return won(state, otherStone(loser), WIN_REASONS.time, []);
}

/**
 * Gives the game up. The other colour wins at once, with no line to show;
 * the record keeps the moves as they were and says why it ended. A finished
 * game cannot be resigned — there is nothing left to give.
 */
export function resign(state: GameState, loser: Stone): GameState {
  if (state.status !== GAME_STATUS.playing) return state;
  return won(state, otherStone(loser), WIN_REASONS.resign, []);
}


/**
 * Takes the turn away from the colour to move without a stone: the graceful
 * penalty for a missed deadline. It is a FORFEIT on the record, not a pass,
 * so a replay changes hands at the same point the game did — a pass the rules
 * do not offer would stop the replay there instead. Unlike a pass in the piece
 * games, two of these in a row do not end anything; the forfeit count does.
 *
 * Where the rules DO offer a pass, a missed turn is that pass and not this:
 * `forfeitOnRecord` in engine.ts decides, since only the engine knows.
 */
export function forfeitTurn(state: GameState): GameState {
  if (state.status !== GAME_STATUS.playing) return state;
  if (state.opening.stage === OPENING_STAGES.choosing) return state;
  const move: Move = { ...NO_POINT, stone: state.toPlay, kind: MOVE_KINDS.forfeit };
  /*
   * A MISSED TURN ENDS WHATEVER HALF OF A MOVE IT INTERRUPTS, and both halves
   * used to outlive it.
   *
   * - A capture chain: the captures already made stand, and the chain ends
   *   with the turn. Left set, `chainAt` bound the other side to go on jumping
   *   from a square holding the absent side's piece, which gave them no legal
   *   move at all — a game neither side could play on.
   * - A twist still owed: the stone stays and the quarter is left unturned.
   *   This refused a pending twist before, so a claim wrote nothing and a
   *   player who never turned a quarter held a timed twist game for ever. No
   *   line is left unread by skipping it: `settleStone` decides any line the
   *   stone made before a twist is owed, so the only thing left to settle is a
   *   board with no room left, which `twistBoard` reads as a draw and so does this.
   */
  const lost: GameState = {
    ...state,
    moves: [...state.moves, move],
    toPlay: otherStone(state.toPlay),
    chainAt: null,
    pendingTwist: false,
  };
  if (state.pendingTwist && !state.board.includes(null)) return { ...lost, status: GAME_STATUS.draw };
  return lost;
}
