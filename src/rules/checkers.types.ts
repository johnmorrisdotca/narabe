import type { Cell, Point } from "../types.ts";

/** One jump of a capture: the enemy piece taken, and the empty square the capturing piece lands on. */
export type Jump = { to: Point; captured: Point };

/**
 * Where a capture is being worked out from: the board, and the two facts about
 * it that the board alone cannot say.
 *
 * `lifted`: the index of the square the capturing piece stands on, which reads
 * as empty — the piece has picked itself up, so a flying king may cross back
 * over the square it set out from.
 *
 * `taken`: the squares of pieces already captured in this sequence. They block
 * like a piece, whether or not the board still shows one there: a captured piece
 * leaves the board only when the whole capture is over, so nothing may pass it,
 * land on it or take it a second time.
 */
export type CaptureGround = {
  board: readonly Cell[];
  size: number;
  lifted: number;
  taken: Set<number>;
};

/** What a step or a capture from `from` to `to` does to the board and the kings on it. */
export type CheckersMoveResult = {
  board: Cell[];
  kings: Point[];
  /** The enemy square taken, if this was a capture. */
  captured: Point | null;
  /** Whether the captured piece was itself a king, for undo. */
  capturedWasKing: boolean;
  /** Whether the moving piece was already a king before this move, for undo. */
  wasKing: boolean;
  /** Whether this move made a king of the man that moved. */
  crowned: boolean;
  /** Whether this move continued a chain already under way, for undo. */
  continuedChain: boolean;
  /** Whether the same piece must go on capturing before the turn can pass. */
  continues: boolean;
};
