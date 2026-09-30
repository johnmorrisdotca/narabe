import { MOVE_KINDS, PIECE_QUEUES, STONES, VARIANT_SPECS } from "../constants.ts";
import type {
  Cell,
  GameSettings,
  GameState,
  Move,
  Piece,
  PieceCell,
  PieceQueue,
  Point,
  Stone,
} from "../types.ts";
import { indexOf, isOnBoard } from "./board.ts";
import { seededRandom } from "./random.ts";

/**
 * The piece games: dominoes of two stones, and tetrominoes of four with two
 * of each colour. Both players draw from one queue fixed by the game's seed,
 * and each player's n-th piece is the queue's n-th entry, so the two sides
 * always face the same pieces in the same order and can see what is coming.
 */

/** The seven tetromino shapes, as cells relative to a top-left corner. */
const TETROMINOES: readonly (readonly Point[])[] = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }], // I
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }], // O
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }], // T
  [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }], // S
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }], // Z
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }], // L
  [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 0 }], // J
];

const DOMINO: readonly Point[] = [{ row: 0, col: 0 }, { row: 0, col: 1 }];

/** Mixes the variant into the seed so two queues from one seed differ. */
const QUEUE_SALT: Record<PieceQueue, number> = { domino: 0x1d, tetro: 0x2e };

/** How far ahead the queue is drawn; long enough for any game on any board. */
const QUEUE_LENGTH = 200;

/**
 * Colours for a shape, half black and half white, in a random arrangement.
 * A domino is any of BB, WW, BW or WB; a tetromino is always two and two.
 */
function colour(shape: readonly Point[], random: () => number, queue: PieceQueue): PieceCell[] {
  if (queue === PIECE_QUEUES.domino) {
    const first = random() < 0.5 ? STONES.black : STONES.white;
    const second = random() < 0.5 ? STONES.black : STONES.white;
    return [
      { ...shape[0], stone: first },
      { ...shape[1], stone: second },
    ];
  }
  const blacks = new Set<number>();
  while (blacks.size < 2) blacks.add(Math.floor(random() * shape.length));
  return shape.map((cell, index) => ({
    ...cell,
    stone: blacks.has(index) ? STONES.black : STONES.white,
  }));
}

/** The whole queue for these settings, the same every time for the same seed. */
export function pieceQueue(settings: GameSettings): Piece[] {
  const queue = VARIANT_SPECS[settings.variant].queue;
  if (queue === null) return [];
  const random = seededRandom((settings.seed + QUEUE_SALT[queue]) >>> 0);
  const pieces: Piece[] = [];
  for (let i = 0; i < QUEUE_LENGTH; i += 1) {
    const shape =
      queue === PIECE_QUEUES.domino
        ? DOMINO
        : TETROMINOES[Math.floor(random() * TETROMINOES.length)];
    pieces.push({ cells: colour(shape, random, queue) });
  }
  return pieces;
}

/** How many pieces `stone` has laid so far: its index into the queue. */
export function piecesLaidBy(moves: readonly Move[], stone: Stone): number {
  return moves.filter((move) => move.stone === stone && move.kind === MOVE_KINDS.piece).length;
}

/** How many single stones `stone` has spent. */
export function singlesUsedBy(moves: readonly Move[], stone: Stone): number {
  return moves.filter((move) => (move.by ?? move.stone) === stone && move.kind === MOVE_KINDS.place).length;
}

/** The piece the colour to move must lay next, or null outside the piece games. */
export function queuedPiece(state: GameState): Piece | null {
  const queue = pieceQueue(state.settings);
  if (queue.length === 0) return null;
  return queue[piecesLaidBy(state.moves, state.toPlay) % queue.length];
}

/** The pieces after the one in hand, for the preview. */
export function upcomingPieces(state: GameState, count: number): Piece[] {
  const queue = pieceQueue(state.settings);
  if (queue.length === 0) return [];
  const next = piecesLaidBy(state.moves, state.toPlay) + 1;
  return Array.from({ length: count }, (_, i) => queue[(next + i) % queue.length]);
}

function rotate(cells: readonly PieceCell[]): PieceCell[] {
  // (r, c) -> (c, -r), then shift back to the origin.
  return normalise(cells.map((cell) => ({ row: cell.col, col: -cell.row, stone: cell.stone })));
}

function flip(cells: readonly PieceCell[]): PieceCell[] {
  return normalise(cells.map((cell) => ({ row: cell.row, col: -cell.col, stone: cell.stone })));
}

/** Shifts a set of cells so its top-left bounding corner is the origin, in a fixed order. */
export function normalise(cells: readonly PieceCell[]): PieceCell[] {
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  return cells
    .map((cell) => ({ row: cell.row - minRow, col: cell.col - minCol, stone: cell.stone }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

function key(cells: readonly PieceCell[]): string {
  return cells.map((cell) => `${cell.row},${cell.col},${cell.stone}`).join("|");
}

/**
 * Every distinct way the piece can lie: four rotations, each also mirrored.
 * Colours travel with their cells, so a black-white domino turned round is a
 * different orientation from the one it started as.
 */
export function orientations(piece: Piece): PieceCell[][] {
  const seen = new Set<string>();
  const result: PieceCell[][] = [];
  let current = normalise(piece.cells);
  for (let turn = 0; turn < 4; turn += 1) {
    for (const candidate of [current, flip(current)]) {
      const k = key(candidate);
      if (!seen.has(k)) {
        seen.add(k);
        result.push(candidate);
      }
    }
    current = rotate(current);
  }
  return result;
}

/** The piece turned `turns` quarter turns and, if asked, mirrored — the shape a player has in hand. */
export function orientCells(piece: Piece, turns: number, flipped: boolean): PieceCell[] {
  let cells = normalise(piece.cells);
  for (let i = 0; i < ((turns % 4) + 4) % 4; i += 1) cells = rotate(cells);
  return flipped ? flip(cells) : cells;
}

/** The absolute cells of an orientation anchored with its origin at `anchor`. */
export function footprintAt(orientation: readonly PieceCell[], anchor: Point): PieceCell[] {
  return orientation.map((cell) => ({
    row: cell.row + anchor.row,
    col: cell.col + anchor.col,
    stone: cell.stone,
  }));
}

/** Whether every cell of a footprint is on the board and empty. */
export function footprintFits(board: Cell[], size: number, cells: readonly PieceCell[]): boolean {
  return cells.every((cell) => isOnBoard(size, cell) && board[indexOf(size, cell)] === null);
}

/** Every legal footprint of the piece in hand. Empty when nothing fits. */
export function piecePlacements(state: GameState): PieceCell[][] {
  const piece = queuedPiece(state);
  if (piece === null) return [];
  const { size } = state.settings;
  const found: PieceCell[][] = [];
  for (const orientation of orientations(piece)) {
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const cells = footprintAt(orientation, { row, col });
        if (footprintFits(state.board, size, cells)) found.push(cells);
      }
    }
  }
  return found;
}

/**
 * Whether `cells` is the piece in hand, in some orientation, laid somewhere
 * it fits. Colours must match cell for cell.
 */
export function isPieceInHand(state: GameState, cells: readonly PieceCell[]): boolean {
  const piece = queuedPiece(state);
  if (piece === null || cells.length !== piece.cells.length) return false;
  const laid = key(normalise(cells));
  return orientations(piece).some((orientation) => key(orientation) === laid);
}
