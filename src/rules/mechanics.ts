import {
  DIRECTIONS,
  GAME_STATUS,
  MOVE_KINDS,
  PLACEMENTS,
  STONES,
  VARIANT_SPECS,
  WIN_REASONS,
} from "../constants.ts";
import type { Cell, GameState, Move, Point, Stone } from "../types.ts";
import { settleDraw } from "./drawLimit.ts";
import { cellAtPoint, indexOf, isOnBoard, isStone, otherStone, stepFrom } from "./board.ts";
import { campFilled, campMoves, campSquares } from "./camps.ts";
import { applyCheckersMove, checkersHasAnyMove, checkersMoves, checkersRulesFor } from "./checkers.ts";
import { STAR_RADIUS, starCampSquares, starFilled, starMoves } from "./chineseCheckers.ts";
import { dropTarget } from "./drop.ts";
import { hexConnection } from "./hex.ts";
import { rulesFor } from "./handicap.ts";
import { owesHeadStart } from "./headStart.ts";
import { findWinningLine, runThrough, winningLineFor } from "./lines.ts";
import { countStones, pieceDestinations, squareThrough } from "./pieces.ts";
import { findAllWins, rotateQuadrant } from "./twist.ts";

/**
 * The mechanics that some games add to placing a stone: where a dropped
 * stone lands, what a stone decides on arrival beyond a line, the quarter
 * turn that finishes a move in the twist games, and the slides of the games
 * with a handful of pieces. Each is consulted by `engine.ts` through the
 * variant's spec.
 */

/** A finished game. */
export function won(
  state: GameState,
  winner: Stone,
  winBy: GameState["winBy"],
  winningLine: Point[],
): GameState {
  return { ...state, status: GAME_STATUS.won, winner, winBy, winningLine };
}

/**
 * The game is over because there is no play left in it — the board filled, or
 * neither side has a move. Both are the same event, so both end the same way,
 * and the two of them are stated here once rather than in each caller.
 *
 * Who an exhausted board favours is the variant's business: the giveaway
 * games hand it to whoever opened, since surviving to the end without making
 * a line is what winning is there, and the breaker game hands it to the
 * breaker for the same reason. Every other game calls it a draw, because
 * neither player did the thing the game asks for.
 *
 * `why` is the caller's, because a full board and a blocked one are not the
 * same sentence to read afterwards even when they settle alike.
 */
export function noPlayLeft(state: GameState, why: GameState["winBy"]): GameState {
  const spec = VARIANT_SPECS[state.settings.variant];
  if (spec.misere) return won(state, state.opener, why, []);
  if (spec.makerBreaker) return won(state, STONES.white, why, []);
  return { ...state, status: GAME_STATUS.draw };
}

/**
 * Where a stone played at `point` actually goes: the same point, or in a
 * drop game the bottom of its column. A click anywhere in a column is a play
 * in that column.
 */
export function resolvePlacement(state: GameState, point: Point): Point {
  if (VARIANT_SPECS[state.settings.variant].placement !== PLACEMENTS.drop) return point;
  return dropTarget(state.board, state.settings.size, point.col) ?? point;
}

/**
 * Four-edge gravity: a stone must rest against the edge of the board or,
 * orthogonally, against something already there. Nothing floats.
 */
export function restsOnSomething(state: GameState, point: Point): boolean {
  const { size } = state.settings;
  if (point.row === 0 || point.col === 0 || point.row === size - 1 || point.col === size - 1) {
    return true;
  }
  return [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ].some((step) => cellAtPoint(state.board, size, stepFrom(point, step, 1)) !== null);
}

/**
 * The giveaway rule that stops a player being forced into a four: you may
 * not play directly on top of the opponent's last stone while any other
 * column has room.
 */
export function blockedByGiveaway(state: GameState, point: Point): boolean {
  const last = state.moves[state.moves.length - 1];
  if (last === undefined) return false;
  if (point.col !== last.col || point.row !== last.row - 1) return false;
  const { size } = state.settings;
  for (let col = 0; col < size; col += 1) {
    if (col !== last.col && state.board[indexOf(size, { row: 0, col })] === null) return true;
  }
  return false;
}

/** Whether the colour to move has all its pieces down and must now slide one. */
export function inMovePhase(state: GameState): boolean {
  const { pieces, camps, checkers, chineseCheckers } = VARIANT_SPECS[state.settings.variant];
  // In a race game, and in checkers, every piece is down from the start.
  if (camps || checkers || chineseCheckers) return true;
  return pieces !== null && countStones(state.board, state.toPlay) >= pieces;
}

/**
 * What a stone arriving at `point` decides, if anything: a line, a square, a
 * fifth captured pair, or — in the trap game — a losing line. Null when the
 * game goes on. A win outranks a trap: four in a row is not also three.
 */
export function settleStone(state: GameState, point: Point, mover?: Stone): GameState | null {
  const { settings, board, captures } = state;
  const stone = board[indexOf(settings.size, point)];
  if (!isStone(stone)) return null;
  const spec = VARIANT_SPECS[settings.variant];
  const by = mover ?? stone;

  // The connection game asks one question, and no other rule here applies.
  if (spec.connects) {
    const chain = hexConnection(board, settings.size, stone);
    return chain.length > 0 ? won(state, stone, WIN_REASONS.connection, chain) : null;
  }

  const winningLine = findWinningLine(board, settings, point);
  if (winningLine.length > 0) {
    // In the giveaway games a line is the one thing you must not make.
    if (spec.misere) return won(state, otherStone(by), WIN_REASONS.trap, winningLine);
    // The maker wins any line; in a choose-your-colour game the mover wins their line.
    if (spec.makerBreaker) return won(state, STONES.black, WIN_REASONS.line, winningLine);
    if (spec.anyColour) return won(state, by, WIN_REASONS.line, winningLine);
    return won(state, stone, WIN_REASONS.line, winningLine);
  }
  // A hotspot on the line can complete the other colour's line with your stone.
  if (spec.hotSquares > 0) {
    const theirs = winningLineFor(board, settings, point, otherStone(stone));
    if (theirs.length > 0) return won(state, otherStone(stone), WIN_REASONS.line, theirs);
  }

  if (spec.squareWins) {
    const square = squareThrough(board, settings.size, point, stone);
    if (square.length > 0) return won(state, stone, WIN_REASONS.square, square);
  }
  if (rulesFor(settings, stone).captures && captures[stone] >= settings.capturesToWin) {
    return won(state, stone, WIN_REASONS.captures, []);
  }
  // Where the mover picks the colour, the other colour's line may have been completed too.
  if (spec.anyColour) {
    const other = winningLineFor(board, settings, point, otherStone(stone));
    if (other.length > 0) {
      return won(state, spec.makerBreaker ? STONES.black : by, WIN_REASONS.line, other);
    }
  }
  if (spec.loseLength !== null) {
    for (const step of DIRECTIONS) {
      const run = runThrough(board, settings.size, point, step, stone);
      if (run.cells.length === spec.loseLength) {
        return won(state, otherStone(stone), WIN_REASONS.trap, run.cells);
      }
    }
  }
  return null;
}

/** Whether the colour to move owes a quarter turn before the move is complete. */
export function canTwist(state: GameState): boolean {
  return state.status === GAME_STATUS.playing && state.pendingTwist;
}

/**
 * Turns one quadrant to finish the move. The whole board is read afterwards,
 * because a turn can complete a line for either colour anywhere: one line
 * wins for its owner, a line for each is a draw, and a full board with no line
 * is a draw too.
 */
export function twistBoard(state: GameState, quadrant: number, clockwise: boolean): GameState {
  if (!canTwist(state)) return state;
  const { settings, toPlay } = state;
  const quadrantSize = VARIANT_SPECS[settings.variant].quadrantSize;
  if (quadrantSize === null) return state;
  const across = settings.size / quadrantSize;
  if (!Number.isInteger(quadrant) || quadrant < 0 || quadrant >= across * across) return state;

  const board = rotateQuadrant(state.board, settings.size, quadrantSize, quadrant, clockwise);
  const last = state.moves[state.moves.length - 1];
  const moves = [...state.moves.slice(0, -1), { ...last, twist: { quadrant, clockwise } }];
  const turned: GameState = { ...state, board, moves, pendingTwist: false };

  const wins = findAllWins(board, settings);
  if (wins.black.length > 0 && wins.white.length > 0) {
    return { ...turned, status: GAME_STATUS.draw };
  }
  if (wins.black.length > 0) return won(turned, STONES.black, WIN_REASONS.line, wins.black);
  if (wins.white.length > 0) return won(turned, STONES.white, WIN_REASONS.line, wins.white);
  if (!board.includes(null)) return { ...turned, status: GAME_STATUS.draw };

  // The twist is what completes the move, so this is where a twist game's
  // length is checked rather than when the stone went down.
  return settleDraw({ ...turned, toPlay: otherStone(toPlay) });
}

/** Where a piece of the colour to move may step from `from`; empty if it may not move. */
export function pieceMoves(state: GameState, from: Point): Point[] {
  if (state.status !== GAME_STATUS.playing || state.pendingTwist) return [];
  // A turn the other colour's head start takes moves nothing: it is passed.
  if (owesHeadStart(state)) return [];
  if (!inMovePhase(state)) return [];
  if (!isOnBoard(state.settings.size, from) || state.board[indexOf(state.settings.size, from)] !== state.toPlay) return [];
  const spec = VARIANT_SPECS[state.settings.variant];
  if (spec.camps) return campMoves(state.board, state.settings.size, from);
  if (spec.checkers) return checkersMoves(state, from);
  if (spec.chineseCheckers) return starMoves(state.board, state.settings.size, from);
  return pieceDestinations(state.board, state.settings.size, from);
}

/** Slides a piece one step, or in checkers a step or a capture. Illegal moves return the state unchanged. */
export function movePiece(state: GameState, from: Point, to: Point): GameState {
  const allowed = pieceMoves(state, from).some(
    (point) => point.row === to.row && point.col === to.col,
  );
  if (!allowed) return state;

  const { settings, toPlay } = state;
  const spec = VARIANT_SPECS[settings.variant];

  if (spec.checkers) {
    const result = applyCheckersMove(state, from, to);
    const move: Move = {
      ...to,
      stone: toPlay,
      kind: MOVE_KINDS.move,
      from,
      wasKing: result.wasKing,
      continuedChain: result.continuedChain,
    };
    if (result.captured !== null) {
      move.captured = [result.captured];
      move.capturedWasKing = result.capturedWasKing;
    }
    if (result.crowned) move.crowned = true;
    const captures =
      result.captured !== null
        ? { ...state.captures, [toPlay]: state.captures[toPlay] + 1 }
        : state.captures;
    const moved: GameState = {
      ...state,
      board: result.board,
      kings: result.kings,
      moves: [...state.moves, move],
      captures,
      chainAt: result.continues ? to : null,
    };
    // Mid-chain: the same piece must keep capturing before the turn can pass.
    if (result.continues) return moved;

    const other = otherStone(toPlay);
    if (!checkersHasAnyMove(result.board, result.kings, settings.size, other, checkersRulesFor(settings))) {
      return won(moved, toPlay, WIN_REASONS.blocked, []);
    }
    return settleDraw({ ...moved, toPlay: other });
  }

  const board = state.board.slice();
  board[indexOf(settings.size, from)] = null;
  board[indexOf(settings.size, to)] = toPlay;
  const move: Move = { ...to, stone: toPlay, kind: MOVE_KINDS.move, from };
  const moved: GameState = { ...state, board, moves: [...state.moves, move] };

  // A race is decided by the far camp filling, and by nothing else on the board.
  if (spec.camps) {
    return campFilled(board, settings.size, toPlay)
      ? won(moved, toPlay, WIN_REASONS.camp, campSquares(settings.size, otherStone(toPlay)))
      : settleDraw({ ...moved, toPlay: otherStone(toPlay) });
  }
  // Chinese Checkers is the same race, read against a star point instead of a square corner.
  if (spec.chineseCheckers) {
    return starFilled(board, settings.size, STAR_RADIUS, toPlay)
      ? won(moved, toPlay, WIN_REASONS.camp, starCampSquares(STAR_RADIUS, otherStone(toPlay)))
      : settleDraw({ ...moved, toPlay: otherStone(toPlay) });
  }
  return settleStone(moved, to) ?? settleDraw({ ...moved, toPlay: otherStone(toPlay) });
}


/**
 * The falling-block rule: a full bottom row vanishes and everything above it
 * drops a row. Returns the board and the row that went, or null when the
 * bottom row still has a gap. Only stones fill a row; a dead square never
 * does, so the two rules are not combined in any variant.
 */
export function clearBottomRow(board: Cell[], size: number): { board: Cell[]; cleared: Cell[] } | null {
  const bottom = board.slice((size - 1) * size);
  if (bottom.some((cell) => cell === null)) return null;
  const next = new Array<Cell>(size).fill(null).concat(board.slice(0, (size - 1) * size));
  return { board: next, cleared: bottom };
}

/** Puts a cleared row back: the inverse of `clearBottomRow`. */
export function restoreBottomRow(board: Cell[], size: number, cleared: Cell[]): Cell[] {
  return board.slice(size).concat(cleared);
}
