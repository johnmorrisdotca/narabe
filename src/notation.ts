import { COLUMN_LETTERS, MOVE_KINDS } from "./constants.ts";
import type { Point } from "./types.ts";

/** Column letter, left to right: A, B, C ... with I skipped as on a go board. */
export function columnLetter(col: number): string {
  return COLUMN_LETTERS[col] ?? String(col + 1);
}

/** Row number counted from the bottom edge, so the bottom row is 1. */
export function rowNumber(size: number, row: number): number {
  return size - row;
}

/** Renju-style name for an intersection, e.g. "H8" for the centre of a 15×15 board. */
export function pointName(size: number, point: Point): string {
  return `${columnLetter(point.col)}${rowNumber(size, point.row)}`;
}

/** What a record needs of a move to say whether it slid, jumped, or went on jumping. */
export type SlideMove = {
  kind: string;
  row: number;
  col: number;
  from?: Point;
  /** The pieces this move took, where the engine replayed it (a draughts jump takes one). */
  captured?: readonly unknown[];
  /** A later hop of one piece's multi-jump: it starts where the last capture landed. */
  continuedChain?: boolean;
};

/**
 * The squares each capture has passed through so far, move by move, or null
 * for a move that took nothing. A draughts multi-jump is kept as one move a hop,
 * so its second hop reads the whole chain: g5, e3, then c1. John, 2026-09-24,
 * from vint.ee's replays: "I found out how they do their moves".
 *
 * Read from the ENGINE's moves (`captured`, `continuedChain`), which a replay
 * of the record rebuilds; a stored move keeps neither.
 */
export function capturePaths(moves: readonly SlideMove[]): (Point[] | null)[] {
  const paths: (Point[] | null)[] = [];
  moves.forEach((move, at) => {
    if (move.kind !== MOVE_KINDS.move || move.from === undefined || move.captured === undefined || move.captured.length === 0) {
      paths.push(null);
      return;
    }
    const before = at > 0 ? paths[at - 1] : null;
    const last = before?.[before.length - 1];
    const goesOn = move.continuedChain === true && last !== undefined && last.row === move.from.row && last.col === move.from.col;
    paths.push(goesOn && before !== null ? [...before, { row: move.row, col: move.col }] : [move.from, { row: move.row, col: move.col }]);
  });
  return paths;
}

/**
 * A slide as the draughts records write it: square to square with an arrow, a
 * capture with a colon (g5:e3), and a multi-jump as every square it landed on
 * (g5:e3:c1). The colon is the draughts convention vint.ee and Russian
 * notation use; `pdn.ts` writes a file's own separators.
 */
export function slideWord(squares: readonly string[], capture: boolean): string {
  return squares.join(capture ? ":" : "→");
}
