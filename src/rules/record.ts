import { createGame } from "./creation.ts";
import { applyOpeningChoice } from "./opening.ts";
import { restoreBottomRow, twistBoard } from "./mechanics.ts";
import { rotateQuadrant } from "./twist.ts";
import { indexOf, otherStone, samePoint } from "./board.ts";
import { stonesIn } from "./captures.ts";
import { undoFlip } from "./flips.ts";
import {
  GAME_STATUS,
  MOVE_KINDS,
  OPENING_STAGES,
  STONES,
  VARIANT_SPECS,
} from "../constants.ts";
import type { GameState, MoveInput, OpeningChoice, Point, ReplayFacts } from "../types.ts";
import {
  canForfeit,
  emptyPoints,
  forfeitTurn,
  inMovePhase,
  isLegalMove,
  movePiece,
  passTurn,
  placePiece,
  playMove,
} from "../engine.ts";
import { leavesNoStone } from "./stoneless.ts";
import { liftFallenRocks } from "./rockfall.ts";

/** A record nothing says ran a clock: a forfeit on it is refused. */
const NO_CLOCK: ReplayFacts = { clocked: false };

/**
 * What can be done to a game's record rather than to its position: burning a
 * turn, lifting the last move back off, and reading a record forwards.
 *
 * Lifted out of `engine.ts`, which had reached the File Size Gate's limit and
 * been answered twice by trimming its comments — a file doing too many jobs
 * does not do fewer of them because it is described in fewer words. These are
 * a coherent one: none of them decides whether a move is legal, and nothing in
 * the engine calls any of them. The dependency runs one way, from here into
 * the engine, which is why this can import from it without a cycle.
 */
export function canSkip(state: GameState): boolean {
  if (!state.settings.allowSkip || state.status !== GAME_STATUS.playing) return false;
  if (state.pendingTwist || inMovePhase(state)) return false;
  const target = skipTarget(state);
  return target !== null && isLegalMove(state, target);
}

/**
 * Where a skipped turn puts its stone: the open intersection furthest from the
 * action, picked from the corner chosen by `roll`. A skip is still a stone on
 * the board — it just spends the turn somewhere that should not matter.
 */
export function skipTarget(state: GameState, roll = 0): Point | null {
  const open = emptyPoints(state);
  if (open.length === 0) return null;

  const last = state.settings.size - 1;
  const corners: Point[] = [
    { row: 0, col: 0 },
    { row: 0, col: last },
    { row: last, col: 0 },
    { row: last, col: last },
  ];
  const corner = corners[Math.min(corners.length - 1, Math.floor(roll * 4))];
  const distance = (point: Point) =>
    Math.max(Math.abs(point.row - corner.row), Math.abs(point.col - corner.col));

  return open.reduce((best, point) =>
    distance(point) < distance(best) ? point : best,
  );
}

/** Burns the turn on a corner stone. A no-op when skipping is not allowed. */
export function skipMove(state: GameState, roll = 0): GameState {
  if (!canSkip(state)) return state;
  const target = skipTarget(state, roll);
  if (target === null) return state;
  return playMove(state, target, MOVE_KINDS.skip);
}

export function canUndo(state: GameState): boolean {
  return state.settings.allowUndo && state.moves.length > 0;
}

/**
 * Removes the last move, putting back anything it captured, a piece where it
 * came from, and a twisted quadrant the way it was. Also reopens a finished
 * game. The opening is left as it stands: a colour choice is a decision, not
 * a stone, and is not undone by lifting one.
 */
export function undoMove(state: GameState): GameState {
  if (!canUndo(state)) return state;
  /*
   * A pass a head start took goes back with the turn it followed. Lifting the
   * pass alone would leave the other colour owing it again, on a board with
   * nothing it may play and no pass to press.
   */
  const last = state.moves[state.moves.length - 1];
  const lifted = undoOne(state);
  return last.headStart === true && canUndo(lifted) ? undoOne(lifted) : lifted;
}

/** One move off the record, as `undoMove` describes. */
function undoOne(state: GameState): GameState {
  // A flipped disc is not on the record; the flipping games rebuild instead.
  if (VARIANT_SPECS[state.settings.variant].flips) {
    return undoFlip(state, createGame(state.settings));
  }

  const last = state.moves[state.moves.length - 1];
  const { size } = state.settings;
  const spec = VARIANT_SPECS[state.settings.variant];
  const quadrantSize = spec.quadrantSize;
  let board = state.board.slice();
  if (last.twist !== undefined && quadrantSize !== null) {
    board = rotateQuadrant(board, size, quadrantSize, last.twist.quadrant, !last.twist.clockwise);
  }
  if (last.cleared !== undefined) board = restoreBottomRow(board, size, last.cleared);
  if (last.kind === MOVE_KINDS.piece) {
    for (const cell of last.cells ?? []) board[indexOf(size, cell)] = null;
  } else if (!leavesNoStone(last.kind)) {
    board[indexOf(size, last)] = null;
  }
  if (last.from !== undefined) board[indexOf(size, last.from)] = last.stone;
  for (const point of last.captured ?? []) {
    board[indexOf(size, point)] = otherStone(last.stone);
  }
  // Rockfall: the rocks that fell after this stone go back up with it.
  board = liftFallenRocks(board, state.settings, state.moves);

  // Checkers: put a king back where it moved from, a captured king back on the board, and reopen its chain.
  let kings = state.kings;
  let chainAt: Point | null = null;
  if (spec.checkers && last.from !== undefined) {
    const from = last.from;
    kings = state.kings.filter((point) => !samePoint(point, last));
    if (last.wasKing) kings = [...kings, from];
    const capturedPoint = last.captured?.[0];
    if (capturedPoint !== undefined && last.capturedWasKing) kings = [...kings, capturedPoint];
    chainAt = last.continuedChain ? from : null;
  }
  const koPoint = last.koPointBefore ?? null; // Go: back to what it was before this move.

  return {
    ...state,
    board,
    kings,
    chainAt,
    koPoint,
    pendingTwist: false,
    moves: state.moves.slice(0, -1),
    captures: {
      ...state.captures,
      [last.stone]: state.captures[last.stone] - stonesIn(last.captured ?? []),
    },
    toPlay: last.by ?? last.stone,
    status: GAME_STATUS.playing,
    winner: null,
    winBy: null,
    winningLine: [],
  };
}

export function lastMove(state: GameState): Point | null {
  const last = state.moves[state.moves.length - 1];
  return last === undefined || leavesNoStone(last.kind) ? null : last;
}

/**
 * A recorded forfeit, applied only where the claim that writes one could have.
 *
 * Two things must both be true, and a record where either is false is one no
 * game here produced — so the replay stops, rather than skipping a turn nobody
 * lost. The record ran a clock, since nothing else takes a turn away; and the
 * rules had no pass to offer, since where they did the clock wrote that pass.
 */
function replayForfeit(state: GameState, facts: ReplayFacts): GameState {
  if (!facts.clocked || !canForfeit(state)) return state;
  return forfeitTurn(state);
}

/**
 * Replays a record through the engine: every position it passed through,
 * including the ones a swap-opening decision produced. When the record runs
 * out of decisions while a choice is pending, the chooser is assumed to have
 * kept their colour, which is all a store without seat data can say.
 *
 * Stops at the first move that will not replay, since the record no longer
 * fits the rules from there. `facts` says what the moves cannot: a record
 * read without them is taken to have had no clock, and a forfeit on it stops
 * the replay like any other move the rules refuse.
 */
export function replayMoves(
  start: GameState,
  moves: readonly MoveInput[],
  choices: readonly OpeningChoice[] = [],
  facts: ReplayFacts = NO_CLOCK,
): GameState[] {
  const timeline = [start];
  let pending = 0;

  for (const move of moves) {
    let current = timeline[timeline.length - 1];
    if (current.opening.stage === OPENING_STAGES.choosing) {
      const choice = choices[pending] ?? current.toPlay;
      pending += 1;
      current = applyOpeningChoice(current, choice);
      if (current.opening.stage === OPENING_STAGES.choosing) break;
      timeline.push(current);
    }
    const point = { row: move.row, col: move.col };
    let next =
      move.kind === MOVE_KINDS.pass
        ? passTurn(current)
        : move.kind === MOVE_KINDS.forfeit
          ? replayForfeit(current, facts)
          : move.cells !== undefined
          ? placePiece(current, move.cells)
          : move.from !== undefined
            ? movePiece(current, { row: move.from.row, col: move.from.col }, point)
            : playMove(
                current,
                point,
                MOVE_KINDS.place,
                move.stone === STONES.black || move.stone === STONES.white ? move.stone : null,
              );
    if (next === current) break;
    timeline.push(next);
    // A recorded twist is part of the same move, and lands in the same replay step.
    if (move.twist !== undefined) {
      const turned = twistBoard(next, move.twist.quadrant, move.twist.clockwise);
      if (turned === next) break;
      timeline.push(turned);
      next = turned;
    }
  }
  return timeline;
}
