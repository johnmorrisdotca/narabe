import { settleDraw } from "./rules/drawLimit.ts";
export { canBeDrawn, drawnByLength, movesBeforeDraw } from "./rules/drawLimit.ts";
import { flipLegal, playFlip } from "./rules/flips.ts";
import {
  GAME_STATUS,
  MOVE_KINDS,
  NO_POINT,
  PLACEMENTS,
  STONES,
  VARIANT_SPECS,
  WIN_REASONS,
} from "./constants.ts";
import { indexOf, isOnBoard, otherStone, pointOf } from "./rules/board.ts";
import { capturesFrom, removeStones, stonesIn } from "./rules/captures.ts";
import { forbiddenAt } from "./rules/forbidden.ts";
import { areaWinner, goLegal, playGoMove } from "./rules/go.ts";
import { applyOpeningChoice, canChooseColour, openingAfterMove, openingAllows } from "./rules/opening.ts";
import {
  blockedByGiveaway,
  clearBottomRow,
  inMovePhase,
  noPlayLeft,
  resolvePlacement,
  restsOnSomething,
  settleStone,
  won,
} from "./rules/mechanics.ts";
import {
  footprintFits,
  isPieceInHand,
  piecePlacements,
  singlesUsedBy,
} from "./rules/queue.ts";
import { winningLineFor } from "./rules/lines.ts";
import { fallRocks } from "./rules/rockfall.ts";
import { stonesLeftInTurn } from "./rules/turns.ts";
import { forfeitTurn } from "./rules/seats.ts";
import { komiFor, owesHeadStart } from "./rules/headStart.ts";
import type {
  Cell,
  ForbiddenPattern,
  GameState,
  Move,
  PieceCell,
  Point,
  Stone,
} from "./types.ts";

/*
 * The rules of the game. Every function here takes a `GameState` and returns
 * a new one; the variant-specific reading — winning lines, forbidden shapes,
 * captures, turn length, openings — lives in `rules/` and is consulted through
 * the variant's spec, never by switching on its name.
 */

export { indexOf, isOnBoard, isStone, otherStone, pointOf } from "./rules/board.ts";
export {
  availableOpenings,
  createGame,
  normaliseSettings,
  resolveOpener,
} from "./rules/creation.ts";
export {
  canSwapSeats,
  forfeitTurn,
  resign,
  seatOf,
  seatToPlay,
  swapSeats,
  winOnTime,
} from "./rules/seats.ts";
export { findWinningLine } from "./rules/lines.ts";
export { hasHandicap, rulesFor } from "./rules/handicap.ts";
export { forbiddenAt, forbiddenPoints } from "./rules/forbidden.ts";
export { centreSquares, discCount, flipsAt, hasFlipMove, inLayingPhase } from "./rules/flips.ts";
export { campOf, campSize, campSquares, piecesHome } from "./rules/camps.ts";
export { checkersHasCapture, isDarkSquare, isKingAt } from "./rules/checkers.ts";
export { STAR_RADIUS, starCampOf, starCampSize, starPiecesHome, starSize } from "./rules/chineseCheckers.ts";
export { groupAt, KOMI, scoreArea } from "./rules/go.ts";
export {
  canGrowBoard,
  canShrinkBoard,
  growBoard,
  nextBoardSize,
  previousBoardSize,
  shrinkBoard,
} from "./rules/growth.ts";
export { dropTarget, landingPoints } from "./rules/drop.ts";
export { quadrantCount, quadrantOrigin } from "./rules/twist.ts";
export {
  canTwist,
  inMovePhase,
  movePiece,
  pieceMoves,
  resolvePlacement,
  twistBoard,
} from "./rules/mechanics.ts";
export {
  footprintAt,
  footprintFits,
  orientCells,
  orientations,
  piecePlacements,
  queuedPiece,
  upcomingPieces,
} from "./rules/queue.ts";
export {
  canChooseColour,
  canExtendOpening,
  chooseColour,
  extendOpening,
} from "./rules/opening.ts";

export function cellAt(state: GameState, point: Point): Cell {
  return state.board[indexOf(state.settings.size, point)];
}

/**
 * Whether the colour to move may play `point`: on the board, empty, allowed by
 * the opening, not a shape the variant forbids that colour, the landing cell
 * of its column in a drop game, and not while a twist or a slide is owed.
 */
export function isLegalMove(state: GameState, point: Point): boolean {
  if (state.status !== GAME_STATUS.playing || state.pendingTwist) return false;
  // A turn the other colour's head start takes has nothing on it to play: it is passed.
  if (owesHeadStart(state)) return false;
  if (!isOnBoard(state.settings.size, point) || cellAt(state, point) !== null) return false;
  // The flipping games: legal means "turns something", and nothing else applies.
  if (VARIANT_SPECS[state.settings.variant].flips) return flipLegal(state, point);
  // Go: legal means not suicide and not the ko point; no opening, no forbidden shape.
  if (VARIANT_SPECS[state.settings.variant].go) return goLegal(state.board, state.settings.size, point, state.toPlay, state.koPoint);
  if (inMovePhase(state)) return false;
  // In a piece game a lone stone is a single, and there are only so many.
  if (VARIANT_SPECS[state.settings.variant].queue !== null && singlesLeft(state) <= 0) return false;
  const landing = resolvePlacement(state, point);
  if (landing.row !== point.row || landing.col !== point.col) return false;
  const spec = VARIANT_SPECS[state.settings.variant];
  if (spec.placement === PLACEMENTS.edge && !restsOnSomething(state, point)) return false;
  if (spec.misere && spec.placement === PLACEMENTS.drop && blockedByGiveaway(state, point)) return false;
  return (
    openingAllows(state, point) &&
    forbiddenAt(state.board, state.settings, state.toPlay, point) === null
  );
}

/** Why the colour to move may not play `point`, when a forbidden shape is why. */
export function forbiddenReason(state: GameState, point: Point): ForbiddenPattern | null {
  return forbiddenAt(state.board, state.settings, state.toPlay, point);
}

/** Every intersection the colour to move may play right now. */
export function legalPoints(state: GameState): Point[] {
  return emptyPoints(state).filter((point) => isLegalMove(state, point));
}

/** Every intersection still open: no stone, no obstacle. */
export function emptyPoints(state: GameState): Point[] {
  const points: Point[] = [];
  state.board.forEach((cell, index) => {
    if (cell === null) points.push(pointOf(state.settings.size, index));
  });
  return points;
}

/** Stones the colour to move still has to place before the turn passes. */
export function stonesLeft(state: GameState): number {
  return stonesLeftInTurn(state.settings, state.moves, state.toPlay);
}

/** Single stones the colour to move may still lay instead of a piece. */
export function singlesLeft(state: GameState): number {
  const { singles } = VARIANT_SPECS[state.settings.variant];
  return Math.max(0, singles - singlesUsedBy(state.moves, state.toPlay));
}

/**
 * Lays the piece in hand on `cells`. The cells must be that piece in some
 * orientation, on empty points. A piece carries both colours, so it can
 * finish a line for either side: one line wins for its owner, whoever laid
 * it; a line for each is a draw.
 */
export function placePiece(state: GameState, cells: readonly PieceCell[]): GameState {
  if (state.status !== GAME_STATUS.playing || state.pendingTwist || owesHeadStart(state)) return state;
  if (!isPieceInHand(state, cells)) return state;
  const { settings, toPlay } = state;
  if (!footprintFits(state.board, settings.size, cells)) return state;

  const board = state.board.slice();
  for (const cell of cells) board[indexOf(settings.size, cell)] = cell.stone;
  const move: Move = {
    row: cells[0].row,
    col: cells[0].col,
    stone: toPlay,
    kind: MOVE_KINDS.piece,
    cells: [...cells],
  };
  const laid: GameState = { ...state, board, moves: [...state.moves, move] };

  const lines: Record<Stone, Point[]> = { black: [], white: [] };
  for (const cell of cells) {
    if (lines[cell.stone].length === 0) {
      lines[cell.stone] = winningLineFor(board, settings, cell, cell.stone);
    }
  }
  if (lines.black.length > 0 && lines.white.length > 0) {
    return { ...laid, status: GAME_STATUS.draw };
  }
  if (lines.black.length > 0) return won(laid, STONES.black, WIN_REASONS.line, lines.black);
  if (lines.white.length > 0) return won(laid, STONES.white, WIN_REASONS.line, lines.white);
  if (!board.includes(null)) return { ...laid, status: GAME_STATUS.draw };
  return settleDraw({ ...laid, toPlay: otherStone(toPlay) });
}

/**
 * Whether the colour to move has nothing it may play. Then the turn passes,
 * on the record, rather than the game stopping where it stands.
 *
 * Gated to piece games once, so a stone game reaching the same condition fell
 * through it: a handicap forbids shapes to one colour, and the last point on a
 * board can be a shape that colour may not make. The board then never fills,
 * the draw never comes, and neither can move. Passing decides nothing.
 */
export function mustPass(state: GameState): boolean {
  if (state.status !== GAME_STATUS.playing || state.pendingTwist) return false;
  /*
   * A TURN THE HEAD START GIVES AWAY IS A PASS THE RULES FORCE, in every game —
   * Go and the sliding games included, which never pass by compulsion otherwise.
   * So the writers that already take a forced pass without a click (the server,
   * the practice board, the programs) take this one too. See `owesHeadStart`.
   */
  if (owesHeadStart(state)) return true;
  /*
   * A colour to choose is a move, never a pass. While a swap opening waits on
   * its decision every point is refused, so the test below read "nothing to
   * play" — and the automatic pass took the chooser's turn in swap2, swap, the
   * renju swaps and tarannikov (the 0.192.0 regression, variants.spec.ts:63).
   */
  if (canChooseColour(state)) return false;
  const spec = VARIANT_SPECS[state.settings.variant];
  // Go passes by choice, never by compulsion: there is always a point to play.
  if (spec.go) return false;
  if (spec.queue !== null) {
    if (singlesLeft(state) > 0 && legalPoints(state).length > 0) return false;
    return piecePlacements(state).length === 0;
  }
  // Pieces that slide already end themselves: checkers gives it away, `blocked`.
  if (inMovePhase(state)) return false;
  // Whether one point is playable, not which: this is read on every render.
  return !emptyPoints(state).some((point) => isLegalMove(state, point));
}

/**
 * Whether passing is on offer: forced in a piece game with nothing to lay, free at any point in Go.
 *
 * This, and not `mustPass`, is the question anything accepting a pass asks. A
 * live game once asked only whether the pass was forced, which refused every
 * chosen pass in Go — a person's click and a computer's choice alike — so a Go
 * game on the server could never end by two passes, and a programs' game sat
 * stuck with the engine offering a pass the server would not take.
 */
export function canPass(state: GameState): boolean {
  if (mustPass(state)) return true;
  if (state.status !== GAME_STATUS.playing || state.pendingTwist) return false;
  return VARIANT_SPECS[state.settings.variant].go;
}

/**
 * Takes a turn without a stone. Two passes end a piece game as a draw; in Go
 * they end it by area count instead, since passing there is a real choice,
 * not a sign nobody can move. A replay passes at the same point either way.
 */
export function passTurn(state: GameState): GameState {
  if (!canPass(state)) return state;
  const move: Move = { ...NO_POINT, stone: state.toPlay, kind: MOVE_KINDS.pass, koPointBefore: state.koPoint };
  /*
   * Forced, chosen or given, decided here from the position, so a replay says
   * the same. A head start's turn is not "had no move", which is what `forced`
   * tells the boards, so it is marked as what it is instead.
   */
  if (owesHeadStart(state)) move.headStart = true;
  else if (mustPass(state)) move.forced = true;
  const passed: GameState = { ...state, moves: [...state.moves, move], koPoint: null };
  const previous = state.moves[state.moves.length - 1];
  // Two passes end a game; a pass the head start took is not one of them.
  if (previous !== undefined && previous.kind === MOVE_KINDS.pass && previous.headStart !== true) {
    if (VARIANT_SPECS[state.settings.variant].go) {
      return won(passed, areaWinner(passed.board, passed.settings.size, komiFor(passed.settings)), WIN_REASONS.territory, []);
    }
    return noPlayLeft(passed, WIN_REASONS.blocked);
  }
  return settleDraw({ ...passed, toPlay: otherStone(state.toPlay) });
}

/**
 * A missed turn, as the position the record will replay it to.
 *
 * Wherever the rules offer a pass, the missed turn IS that pass, with
 * everything a pass does: in Go the second in a row ends the game by count,
 * whether the first was chosen or missed. Where no pass is on offer it is
 * `forfeitTurn`, the turn taken away and nothing decided — written as its own
 * kind, because a pass there is one the rules refuse and a replay stops at.
 * The claim writes whichever kind this settled, so the row and the replay
 * cannot disagree.
 */
export function forfeitOnRecord(state: GameState): GameState {
  /*
   * A DEADLINE MISSED WHILE A COLOUR CHOICE WAITS STILL COSTS THE TURN. The
   * choice is made the way a replay makes one the record does not hold — the
   * colour to move keeps its seat's side (`replayMoves`: `choices[pending] ??
   * current.toPlay`) — and then the turn is forfeited as any missed turn is. So
   * the forfeit row replays to exactly this position, and a chooser who never
   * chooses cannot hold a timed game still: without this a claim here wrote
   * nothing at all and answered that the game was over.
   */
  if (canChooseColour(state)) return forfeitTurn(applyOpeningChoice(state, state.toPlay));
  return canPass(state) ? passTurn(state) : forfeitTurn(state);
}

/**
 * Whether a recorded forfeit could have been written here: only where the
 * clock had no pass to write instead. The replay's half of `forfeitOnRecord`,
 * and the reason a forfeit where a pass was on offer is refused rather than
 * read — it is a record the claim could not have made.
 */
export function canForfeit(state: GameState): boolean {
  return !canPass(state) && forfeitTurn(state) !== state;
}

/**
 * Plays the stone to move at `point`. Illegal moves (occupied intersection,
 * obstacle, off the board, forbidden shape, outside the opening, or game
 * already over) return the state unchanged.
 */
export function playMove(
  state: GameState,
  where: Point,
  kind: Move["kind"] = MOVE_KINDS.place,
  chosen: Stone | null = null,
): GameState {
  const point = resolvePlacement(state, where);
  if (!isLegalMove(state, point)) return state;

  const { settings, toPlay } = state;
  const spec = VARIANT_SPECS[settings.variant];
  /*
   * The flipping games settle themselves — a disc that turns nothing is not a
   * legal move, and the game ends when neither colour can move — so their
   * whole turn happens in playFlip and the length is checked on the way out.
   */
  if (spec.flips) return settleDraw(playFlip(state, point));
  // Go settles its own move: a capture, maybe a fresh ko point, and the turn passes.
  if (spec.go) return playGoMove(state, point);
  // The colour of the stone: the mover's, unless the game lets them choose, or fixes it.
  const stone = spec.singleColour ? STONES.black : spec.anyColour ? (chosen ?? toPlay) : toPlay;
  const captured = capturesFrom(state.board, settings, stone, point);
  let board = state.board.slice();
  board[indexOf(settings.size, point)] = stone;
  board = removeStones(board, settings.size, captured);

  const move: Move = { ...point, stone, kind };
  if (stone !== toPlay) move.by = toPlay;
  if (captured.length > 0) move.captured = captured;
  const moves = [...state.moves, move];
  const captures = {
    ...state.captures,
    [stone]: state.captures[stone] + stonesIn(captured),
  };
  const placed: GameState = { ...state, board, moves, captures };

  const decided = settleStone(placed, point, toPlay);
  if (decided !== null) return decided;

  // A twist game's move is not over until a quadrant has turned.
  if (spec.quadrantSize !== null) return { ...placed, pendingTwist: true };

  // The falling-block rule: a full bottom row goes, and the move remembers it.
  let after = placed;
  if (spec.lineClear) {
    const cleared = clearBottomRow(board, settings.size);
    if (cleared !== null) {
      const remembered = { ...move, cleared: cleared.cleared };
      after = { ...placed, board: cleared.board, moves: [...state.moves, remembered] };
    }
  }

  // A rock game's rocks may fall after this stone: see rules/rockfall.ts.
  after = fallRocks(after);

  if (!after.board.includes(null)) return noPlayLeft(after, WIN_REASONS.full);

  const stays = stonesLeftInTurn(settings, after.moves, toPlay) > 0;
  return settleDraw({
    ...after,
    toPlay: stays ? toPlay : otherStone(toPlay),
    opening: openingAfterMove(after),
  });
}
