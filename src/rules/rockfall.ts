import { BLOCKED, GAME_STATUS, HOT, STONES, VARIANT_SPECS } from "../constants.ts";
import type { Cell, GameSettings, GameState, Move } from "../types.ts";
import { emptyBoard } from "../obstacles.ts";
import { indexOf } from "./board.ts";
import { winningLineFor } from "./lines.ts";
import { landRocks, rockLayoutFor } from "./rocks.ts";
import { leavesNoStone } from "./stoneless.ts";

/**
 * ROCKFALL: the rocks that land partway through a game.
 *
 * A rock game whose spec says `arriveAfter` starts on an open board, and once
 * that many stones have been played its rocks and hotspots fall onto every
 * point still empty. It happens inside the move that plays that stone, so a
 * replay of the record lands them at the same moment, from the same seed, and
 * the engine stays the only thing that decides what is on the board.
 *
 * Two things can never happen, and each is the choice that leaves the game to
 * the players:
 *
 *  - A rock or hotspot never lands on a stone. It is lost, and the stone stays
 *    (`landRocks`).
 *  - A hotspot never lands where it would finish a line by itself. A hotspot
 *    counts for both colours, so one falling into the gap of a four would hand
 *    somebody the game for a move nobody made. It is lost too.
 */

/** Stones played so far: every move that put one down, and nothing that did not. */
export function stonesPlayed(moves: readonly Move[]): number {
  return moves.filter((move) => !leavesNoStone(move.kind)).length;
}

/** Whether the move just played is the one the rocks fall after. */
function fallsNow(settings: GameSettings, moves: readonly Move[]): boolean {
  const arriveAfter = VARIANT_SPECS[settings.variant].rocks?.arriveAfter ?? null;
  return arriveAfter !== null && stonesPlayed(moves) === arriveAfter;
}

/** Whether a hotspot at `index` would complete a winning line for either colour. */
function finishesALine(board: Cell[], settings: GameSettings, index: number): boolean {
  const point = { row: Math.floor(index / settings.size), col: index % settings.size };
  return (
    winningLineFor(board, settings, point, STONES.black).length > 0 ||
    winningLineFor(board, settings, point, STONES.white).length > 0
  );
}

/**
 * The state with its rocks fallen, when the move just played is the one they
 * fall after and the game is still going; otherwise the state it was given.
 * A move that has already won is not followed by a fall.
 */
export function fallRocks(state: GameState): GameState {
  if (state.status !== GAME_STATUS.playing || !fallsNow(state.settings, state.moves)) return state;
  const layout = rockLayoutFor(state.settings);
  if (layout === null) return state;
  const { size } = state.settings;
  // The rocks first, then each hotspot on its own, so a line one would finish is judged with the rocks already down.
  let board = landRocks(state.board, size, { dead: layout.dead, hot: [] });
  for (const point of layout.hot) {
    const landed = landRocks(board, size, { dead: [], hot: [point] });
    const index = indexOf(size, point);
    if (landed[index] === HOT && finishesALine(landed, state.settings, index)) continue;
    board = landed;
  }
  return { ...state, board };
}

/**
 * The board with the fallen rocks lifted again, for undoing the move they fell
 * after; otherwise the board it was given. `moves` is the record as it stood
 * WITH that move, so the question is the same one `fallRocks` asked. A point
 * is cleared only where the layout put something the empty board does not
 * have, so a star point's block, or a rock that never fell, is left alone.
 */
export function liftFallenRocks(board: Cell[], settings: GameSettings, moves: readonly Move[]): Cell[] {
  if (!fallsNow(settings, moves)) return board;
  const layout = rockLayoutFor(settings);
  if (layout === null) return board;
  const start = emptyBoard(settings);
  const lifted = board.slice();
  for (const point of [...layout.dead, ...layout.hot]) {
    const index = indexOf(settings.size, point);
    const fell = lifted[index] === BLOCKED || lifted[index] === HOT;
    if (fell && start[index] === null) lifted[index] = null;
  }
  return lifted;
}
