import {
  BOARD_SIZES,
  GAME_STATUS,
  OBSTACLE_LAYOUTS,
} from "../constants.ts";
import { VARIANT_SPECS } from "../constants.ts";
import type { Cell, GameState, Move, Point } from "../types.ts";
import { emptyBoard } from "../obstacles.ts";
import { leavesNoStone } from "./stoneless.ts";

/**
 * Changing the board size mid-game, in either direction.
 *
 * A game that has run out of room is not necessarily a game that has run out
 * of ideas, so a bigger board gives both players somewhere to go. The stones
 * keep their positions relative to each other — the old board is re-centred on
 * the new one — because anything else would rewrite the game that had been
 * played rather than continue it.
 *
 * Growing does not pass the turn, and that is a correctness requirement rather
 * than a kindness. A growth places no stone, so nothing records that it
 * happened; if it changed whose turn it was, replaying the move list would
 * alternate colours differently from the game that was actually played, and a
 * stored game would no longer reproduce itself. It is also the better rule:
 * a bigger board helps both players, so charging the grower a tempo would
 * make growing strictly bad for whoever asked.
 *
 * For the same reason growth is only offered on an open board. Obstacles are
 * derived from the board size, so a grown game would start its replay with the
 * larger size's star points — which are not the ones it was played with.
 */

/**
 * The next size up, or null when the board is already the largest. A game
 * played on boards of its own — the flipping games, on 4, 6 and 8 — grows
 * through its own list rather than the go sizes.
 */
export function nextBoardSize(size: number, sizes: readonly number[] = BOARD_SIZES): number | null {
  const larger = sizes.filter((option) => option > size);
  return larger.length > 0 ? Math.min(...larger) : null;
}

/**
 * How far the old board shifts when centred on the new one.
 *
 * Both sizes are odd, or both even, so the difference is even and the offset
 * is exact: the centre stays the centre, and no stone is nudged off it.
 */
export function growthOffset(from: number, to: number): number {
  return Math.floor((to - from) / 2);
}

export function canGrowBoard(state: GameState): boolean {
  const sizes = VARIANT_SPECS[state.settings.variant].boardSizes ?? BOARD_SIZES;
  return (
    state.settings.allowResize &&
    state.status === GAME_STATUS.playing &&
    // See the note above: obstacles are derived from size, so they would not
    // survive a replay of a grown game.
    state.settings.obstacles === OBSTACLE_LAYOUTS.none &&
    nextBoardSize(state.settings.size, sizes) !== null
  );
}

function shift(point: Point, offset: number): Point {
  return { row: point.row + offset, col: point.col + offset };
}

/**
 * Returns the game on a larger board, or the state unchanged when it cannot
 * grow. Every stone, every recorded move and the winning line all move
 * together, so the record still replays to the position on the screen.
 */
export function growBoard(state: GameState): GameState {
  if (!canGrowBoard(state)) return state;

  const from = state.settings.size;
  const to = nextBoardSize(from, VARIANT_SPECS[state.settings.variant].boardSizes ?? BOARD_SIZES);
  if (to === null) return state;

  const offset = growthOffset(from, to);
  const settings = { ...state.settings, size: to };

  /*
   * Start from the larger board's own obstacle layout — the star points of a
   * 13×13 are not those of a 9×9 — then lay the stones over it. A stone
   * always wins the intersection: a game in progress cannot have a stone
   * evicted by a pattern that only exists at the new size.
   */
  const board: Cell[] = emptyBoard(settings);
  state.board.forEach((cell, index) => {
    if (cell === null) return;
    const point = shift(
      { row: Math.floor(index / from), col: index % from },
      offset,
    );
    const target = point.row * to + point.col;
    // Obstacles from the old layout are dropped; the new layout replaces them.
    if (cell !== "blocked") board[target] = cell;
  });

  const moves: Move[] = state.moves.map((move) => ({
    ...move,
    ...shift(move, offset),
    ...(move.from === undefined ? {} : { from: shift(move.from, offset) }),
    ...(move.captured === undefined
      ? {}
      : { captured: move.captured.map((point) => shift(point, offset)) }),
  }));

  return {
    ...state,
    settings,
    board,
    moves,
    winningLine: state.winningLine.map((point) => shift(point, offset)),
  };
}

/** The next size down, or null when the board is already the smallest. */
export function previousBoardSize(size: number, sizes: readonly number[] = BOARD_SIZES): number | null {
  const smaller = sizes.filter((option) => option < size);
  return smaller.length > 0 ? Math.max(...smaller) : null;
}

/**
 * Whether the ring that shrinking would remove holds any recorded move.
 *
 * This asks the record, not the board, and the difference matters. A captured
 * stone leaves the board but its move stays in the list, and a piece that
 * slid inwards leaves a move whose `from` is still out there. Either would
 * replay as a stone placed outside the smaller board, so a ring that looks
 * empty can still be occupied as far as the record is concerned.
 */
export function ringHoldsMoves(state: GameState, margin: number): boolean {
  const last = state.settings.size - 1 - margin;
  const outside = (point: Point) =>
    point.row < margin || point.col < margin || point.row > last || point.col > last;

  return state.moves.some(
    (move) =>
      (!leavesNoStone(move.kind) && outside(move)) ||
      (move.from !== undefined && outside(move.from)) ||
      (move.cells !== undefined && move.cells.some(outside)),
  );
}

export function canShrinkBoard(state: GameState): boolean {
  // A game played on a board of its own size cannot shrink out of it either.
  if (VARIANT_SPECS[state.settings.variant].boardSizes !== null) return false;

  const to = previousBoardSize(state.settings.size, VARIANT_SPECS[state.settings.variant].boardSizes ?? BOARD_SIZES);
  if (to === null) return false;

  return (
    state.settings.allowResize &&
    state.status === GAME_STATUS.playing &&
    state.settings.obstacles === OBSTACLE_LAYOUTS.none &&
    !ringHoldsMoves(state, growthOffset(to, state.settings.size))
  );
}

/**
 * Returns the game on a smaller board, or the state unchanged when the ring
 * that would be removed is in use. Everything shifts inwards by the same
 * offset growing shifts out by, so the stones keep their positions relative
 * to each other and the centre stays the centre.
 */
export function shrinkBoard(state: GameState): GameState {
  if (!canShrinkBoard(state)) return state;

  const from = state.settings.size;
  const to = previousBoardSize(from);
  if (to === null) return state;

  const offset = -growthOffset(to, from);
  const settings = { ...state.settings, size: to };

  const board: Cell[] = emptyBoard(settings);
  state.board.forEach((cell, index) => {
    if (cell === null || cell === "blocked") return;
    const point = shift(
      { row: Math.floor(index / from), col: index % from },
      offset,
    );
    board[point.row * to + point.col] = cell;
  });

  const moves: Move[] = state.moves.map((move) => ({
    ...move,
    ...shift(move, offset),
    ...(move.from === undefined ? {} : { from: shift(move.from, offset) }),
    ...(move.captured === undefined
      ? {}
      : { captured: move.captured.map((point) => shift(point, offset)) }),
  }));

  return {
    ...state,
    settings,
    board,
    moves,
    // As with growing: no turn passes, or the record would stop replaying.
    winningLine: state.winningLine.map((point) => shift(point, offset)),
  };
}
