import { GAME_STATUS, STARTING_DISCS, STONES, VARIANT_SPECS, WIN_REASONS } from "../constants.ts";
import type { Cell, GameSettings, GameState, Move, Point, Stone, StartingDiscs } from "../types.ts";
import { HEX_DIRECTIONS, honeycombStartingDiscs } from "./hexagon.ts";
import { won } from "./mechanics.ts";
import { leavesNoStone } from "./stoneless.ts";

/**
 * The flipping games — reversi, and Othello as the world plays it now.
 *
 * Nothing here reads a line. A stone goes where it brackets one or more of
 * the other colour's discs, in a straight run, with one of its own at the
 * far end; those discs turn. A colour with nowhere to go passes, without a
 * move on the record, because the pass is forced and a replay would force it
 * too. When neither colour can move the discs are counted, and in the
 * giveaway form the smaller count wins.
 */

const DIRECTIONS: readonly Point[] = [
  { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
  { row: 0, col: -1 },                       { row: 0, col: 1 },
  { row: 1, col: -1 },  { row: 1, col: 0 },  { row: 1, col: 1 },
];

function at(board: Cell[], size: number, point: Point): Cell | undefined {
  if (point.row < 0 || point.col < 0 || point.row >= size || point.col >= size) return undefined;
  return board[point.row * size + point.col];
}

function other(stone: Stone): Stone {
  return stone === STONES.black ? STONES.white : STONES.black;
}

/** The four centre squares, top-left first. Even boards only; the centre is between four cells. */
export function centreSquares(size: number): Point[] {
  const half = size / 2;
  return [
    { row: half - 1, col: half - 1 },
    { row: half - 1, col: half },
    { row: half, col: half - 1 },
    { row: half, col: half },
  ];
}

/** How the centre four begin: the players' choice in the settings, else the game's rule. */
export function openingFor(settings: GameSettings): StartingDiscs {
  const spec = VARIANT_SPECS[settings.variant];
  if (!spec.flips) return STARTING_DISCS.none;
  return settings.openingDiscs ?? spec.startingDiscs;
}

/**
 * The directions a run may lie along: the eight of a square board, or the six
 * of the honeycomb's lattice. Read from the spec, so a flipping game on a new
 * shape changes one row here and nothing in the flipping itself.
 */
export function flipDirections(settings: GameSettings): readonly Point[] {
  return VARIANT_SPECS[settings.variant].hexagon ? HEX_DIRECTIONS : DIRECTIONS;
}

/** The fixed opening: white top-left and bottom-right, black the other diagonal — or the honeycomb's ring of six. */
export function startingDiscs(settings: GameSettings): { point: Point; stone: Stone }[] {
  if (openingFor(settings) !== STARTING_DISCS.fixed) return [];
  if (VARIANT_SPECS[settings.variant].hexagon) return honeycombStartingDiscs(settings.size);
  const [a, b, c, d] = centreSquares(settings.size);
  return [
    { point: a, stone: STONES.white },
    { point: b, stone: STONES.black },
    { point: c, stone: STONES.black },
    { point: d, stone: STONES.white },
  ];
}

/** Classic reversi: the first four discs are laid by the players, in the centre, with no flipping. */
export function inLayingPhase(state: GameState): boolean {
  if (openingFor(state.settings) !== STARTING_DISCS.laid) return false;
  return centreSquares(state.settings.size).some(
    (point) => at(state.board, state.settings.size, point) === null,
  );
}

/**
 * The discs a stone of `stone` at `point` would turn. Empty means the move is
 * illegal. `directions` is the square board's eight unless a caller says
 * otherwise; everything that has a state to hand reads `flipDirections`.
 */
export function flipsAt(
  board: Cell[],
  size: number,
  stone: Stone,
  point: Point,
  directions: readonly Point[] = DIRECTIONS,
): Point[] {
  if (at(board, size, point) !== null) return [];
  const enemy = other(stone);
  const flipped: Point[] = [];
  for (const step of directions) {
    const run: Point[] = [];
    let cursor = { row: point.row + step.row, col: point.col + step.col };
    while (at(board, size, cursor) === enemy) {
      run.push(cursor);
      cursor = { row: cursor.row + step.row, col: cursor.col + step.col };
    }
    // A run counts only when one of our own closes it; an edge or a gap does not.
    if (run.length > 0 && at(board, size, cursor) === stone) flipped.push(...run);
  }
  return flipped;
}

/** Whether a stone of `stone` may go at `point`: in the laying phase a centre square, otherwise a flip. */
export function flipLegal(state: GameState, point: Point): boolean {
  if (state.status !== GAME_STATUS.playing) return false;
  const { size } = state.settings;
  if (at(state.board, size, point) !== null) return false;
  if (inLayingPhase(state)) {
    return centreSquares(size).some((centre) => centre.row === point.row && centre.col === point.col);
  }
  return flipsAt(state.board, size, state.toPlay, point, flipDirections(state.settings)).length > 0;
}

export function hasFlipMove(state: GameState, stone: Stone): boolean {
  const { size } = state.settings;
  if (inLayingPhase(state)) return true;
  const directions = flipDirections(state.settings);
  for (let index = 0; index < state.board.length; index += 1) {
    if (state.board[index] !== null) continue;
    const point = { row: Math.floor(index / size), col: index % size };
    if (flipsAt(state.board, size, stone, point, directions).length > 0) return true;
  }
  return false;
}

export function discCount(board: Cell[]): Record<Stone, number> {
  let black = 0;
  let white = 0;
  for (const cell of board) {
    if (cell === STONES.black) black += 1;
    else if (cell === STONES.white) white += 1;
  }
  return { black, white };
}

/**
 * Plays a stone in a flipping game: it goes down, the flanked discs turn,
 * and the turn goes to whoever can move — the other colour if they can,
 * the same colour again if only they can, and to the count if nobody can.
 */
export function playFlip(state: GameState, point: Point): GameState {
  if (!flipLegal(state, point)) return state;
  const { settings, toPlay } = state;
  const size = settings.size;
  const flipped = inLayingPhase(state) ? [] : flipsAt(state.board, size, toPlay, point, flipDirections(settings));

  const board = state.board.slice();
  board[point.row * size + point.col] = toPlay;
  for (const disc of flipped) board[disc.row * size + disc.col] = toPlay;

  const move: Move = { ...point, stone: toPlay, kind: "place" };
  const placed: GameState = { ...state, board, moves: [...state.moves, move] };

  const opponent = other(toPlay);
  if (hasFlipMove(placed, opponent)) return { ...placed, toPlay: opponent };
  if (hasFlipMove(placed, toPlay)) return { ...placed, toPlay };
  return settleCount(placed);
}

/** The end of a flipping game: more discs wins, or fewer in the giveaway form; equal is a draw. */
export function settleCount(state: GameState): GameState {
  const count = discCount(state.board);
  const spec = VARIANT_SPECS[state.settings.variant];
  if (count.black === count.white) return { ...state, status: GAME_STATUS.draw };
  const more = count.black > count.white ? STONES.black : STONES.white;
  return won(state, spec.misere ? other(more) : more, WIN_REASONS.count, []);
}

/**
 * Undo, for a flipping game: the discs the last move turned must turn back,
 * and which those were is not on the record — so the position is rebuilt
 * from the start through every move but the last. A stored game is a move
 * list; replaying it is the one operation guaranteed to agree with itself.
 */
export function undoFlip(state: GameState, start: GameState): GameState {
  let rebuilt: GameState = { ...start, opener: state.opener, seats: state.seats, toPlay: state.opener };
  for (const move of state.moves.slice(0, -1)) {
    // A turn with no stone on the record — a head start's pass, or a turn lost on time — turns nothing and hands the move over.
    rebuilt =
      leavesNoStone(move.kind)
        ? { ...rebuilt, moves: [...rebuilt.moves, move], toPlay: other(rebuilt.toPlay) }
        : playFlip(rebuilt, { row: move.row, col: move.col });
  }
  return { ...rebuilt, swapsUsed: state.swapsUsed };
}
