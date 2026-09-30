import {
  GAME_STATUS,
  OPENING_CHOICE_EXTEND,
  OPENING_RULES,
  OPENING_STAGES,
} from "../constants.ts";
import { tengen } from "../obstacles.ts";
import type {
  GameSettings,
  GameState,
  OpeningChoice,
  OpeningState,
  Point,
  Seat,
  Stone,
} from "../types.ts";
import { chebyshev, otherStone, samePoint } from "./board.ts";
import { rulesFor } from "./handicap.ts";

/**
 * Opening protocols. Two kinds live here: placement restrictions (pro, long
 * pro, the RIF opening) that only narrow where the first stones may go, and
 * swap protocols where one seat lays every stone for a while and the other
 * then picks a colour. The engine asks `openingAllows` before every stone and
 * `openingAfterMove` after, and never looks at the protocol by name.
 */

/**
 * Half-widths of the central squares the openings refer to. The first two are
 * exported for the set-up screen's picture of each opening, which draws the
 * square from these rather than from a second copy of the numbers.
 */
export const PRO_EXCLUSION = 2; // outside the 5×5
export const LONG_PRO_EXCLUSION = 3; // outside the 7×7
const RIF_WHITE_REACH = 1; // inside the 3×3
const RIF_BLACK_REACH = 2; // inside the 5×5
const SAKATA_FIFTH_REACH = 3; // the fifth stone inside the 7×7
/** Tarannikov: stone n (from zero) lands within n of tengen, so the first five nest in 1×1 … 9×9. */
const TARANNIKOV_STONES = 5;

/** Stones on the board once the swap protocols pause for a decision. */
const SWAP_STONES = 3;
const SWAP2_EXTENDED_STONES = 5;

const SWAP_OPENINGS: readonly GameSettings["opening"][] = [
  OPENING_RULES.swap,
  OPENING_RULES.swap2,
];

/** The renju protocols: colours alternate as usual, and a swap is offered along the way. */
const RENJU_OPENINGS: readonly GameSettings["opening"][] = [
  OPENING_RULES.rif,
  OPENING_RULES.sakata,
  OPENING_RULES.tarannikov,
];

/**
 * WHETHER THE OPENING IS WHAT DECIDES WHO PLAYS WHICH COLOUR.
 *
 * Asked by the doorstep, which states every fact a game will be played under
 * before it is created — and the colours are the fact people most want. Under
 * these five protocols the seats are settled and the colours are not: one
 * player lays the first stones and the other looks at the position and chooses,
 * so any claim made beforehand about who is black would be a guess.
 *
 * Here rather than in the page, because it is a rule of the game and rules live
 * with the engine. The page asks; it does not keep its own list. A sixth
 * swapping protocol added to either list above is then answered correctly by
 * everything that asks, which a list copied into a component would not be.
 *
 * "I do not know yet" is the honest answer this enables, and the alternative is
 * the dangerous kind of plausible: naming black would be in range, readable,
 * and wrong half the time.
 */
export function openingDecidesColours(opening: GameSettings["opening"]): boolean {
  return SWAP_OPENINGS.includes(opening) || RENJU_OPENINGS.includes(opening);
}

export function initialOpening(
  settings: GameSettings,
  opener: Stone,
  seats: Record<Stone, Seat>,
): OpeningState {
  if (SWAP_OPENINGS.includes(settings.opening)) {
    return { stage: OPENING_STAGES.placing, actor: seats[opener], choices: [] };
  }
  if (RENJU_OPENINGS.includes(settings.opening)) {
    return { stage: OPENING_STAGES.placing, actor: null, choices: [] };
  }
  return { stage: OPENING_STAGES.done, actor: null, choices: [] };
}

/**
 * Whether the opening lets the next stone go on `point`. A handicap can add a
 * pro-style exclusion of its own: the handicapped colour's second stone must
 * leave the centre, whichever colour opened.
 */
export function openingAllows(state: GameState, point: Point): boolean {
  const { settings, moves, opening, toPlay } = state;
  if (opening.stage === OPENING_STAGES.choosing) return false;

  const centre = tengen(settings.size);
  const distance = chebyshev(point, centre);
  const n = moves.length;

  const exclusion = rulesFor(settings, toPlay).secondStoneExclusion;
  if (exclusion > 0) {
    const own = moves.filter((move) => move.stone === toPlay).length;
    if (own === 1 && distance <= exclusion) return false;
  }

  switch (settings.opening) {
    case OPENING_RULES.pro:
      if (n === 0) return samePoint(point, centre);
      return n !== 2 || distance > PRO_EXCLUSION;
    case OPENING_RULES.longPro:
      if (n === 0) return samePoint(point, centre);
      return n !== 2 || distance > LONG_PRO_EXCLUSION;
    case OPENING_RULES.rif:
      if (n === 0) return samePoint(point, centre);
      if (n === 1) return distance <= RIF_WHITE_REACH;
      if (n === 2) return distance <= RIF_BLACK_REACH;
      return true;
    case OPENING_RULES.sakata:
      if (n === 0) return samePoint(point, centre);
      if (n === 1) return distance <= RIF_WHITE_REACH;
      if (n === 2) return distance <= RIF_BLACK_REACH;
      if (n === 4) return distance <= SAKATA_FIFTH_REACH;
      return true;
    case OPENING_RULES.tarannikov:
      return n >= TARANNIKOV_STONES || distance <= n;
    default:
      return true;
  }
}

/**
 * The opening state once a stone has landed. A swap protocol pauses for a
 * decision after its third stone, and again after the fifth if the chooser
 * extended; the deciding seat is always the one that did not lay the stones.
 */
export function openingAfterMove(state: GameState): OpeningState {
  const { opening, settings, moves, seats, opener } = state;
  if (opening.stage === OPENING_STAGES.done) return opening;

  const n = moves.length;
  const decides = (seat: Seat): OpeningState => ({
    ...opening,
    stage: OPENING_STAGES.choosing,
    actor: seat,
  });

  if (settings.opening === OPENING_RULES.tarannikov) {
    // After each of the first five stones, the seat that did not lay it may swap.
    if (opening.stage === OPENING_STAGES.placing && n >= 1 && n <= TARANNIKOV_STONES) {
      return decides(seats[otherStone(moves[n - 1].stone)]);
    }
    return opening;
  }
  if (opening.stage === OPENING_STAGES.placing && n === SWAP_STONES) {
    if (SWAP_OPENINGS.includes(settings.opening) || RENJU_OPENINGS.includes(settings.opening)) {
      return decides(seats[otherStone(opener)]);
    }
  }
  if (opening.stage === OPENING_STAGES.extending && n === SWAP2_EXTENDED_STONES) {
    return decides(seats[opener]);
  }
  return opening;
}

/** Whether the game is waiting on a seat to pick a colour. */
export function canChooseColour(state: GameState): boolean {
  return (
    state.status === GAME_STATUS.playing &&
    state.opening.stage === OPENING_STAGES.choosing
  );
}

/** Swap2 only: the first chooser may add two stones and pass the choice back. */
export function canExtendOpening(state: GameState): boolean {
  return (
    canChooseColour(state) &&
    state.settings.opening === OPENING_RULES.swap2 &&
    state.moves.length === SWAP_STONES
  );
}

/**
 * The deciding seat takes `stone`. Seats are exchanged if that colour is not
 * already theirs; the board and the colour to move are untouched.
 */
export function chooseColour(state: GameState, stone: Stone): GameState {
  if (!canChooseColour(state)) return state;
  const actor = state.opening.actor;
  if (actor === null) return state;

  const seats =
    state.seats[stone] === actor
      ? state.seats
      : { black: state.seats.white, white: state.seats.black };

  // Tarannikov offers the swap again after the next stone, until five are down.
  const more =
    state.settings.opening === OPENING_RULES.tarannikov &&
    state.moves.length < TARANNIKOV_STONES;

  return {
    ...state,
    seats,
    opening: {
      stage: more ? OPENING_STAGES.placing : OPENING_STAGES.done,
      actor: null,
      choices: [...state.opening.choices, stone],
    },
  };
}

/** The chooser declines to choose and lays two more stones instead. */
export function extendOpening(state: GameState): GameState {
  if (!canExtendOpening(state)) return state;
  return {
    ...state,
    opening: {
      stage: OPENING_STAGES.extending,
      actor: state.opening.actor,
      choices: [...state.opening.choices, OPENING_CHOICE_EXTEND],
    },
  };
}

/** Replays one recorded decision. */
export function applyOpeningChoice(state: GameState, choice: OpeningChoice): GameState {
  return choice === OPENING_CHOICE_EXTEND
    ? extendOpening(state)
    : chooseColour(state, choice);
}
