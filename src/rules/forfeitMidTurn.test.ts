import { describe, expect, it } from "vitest";

import {
  createGame,
  emptyPoints,
  forfeitOnRecord,
  isLegalMove,
  movePiece,
  pieceMoves,
  playMove,
} from "../engine.ts";
import { GAME_STATUS, MOVE_KINDS, STONES } from "../constants.ts";
import type { GameState, MoveInput, Point } from "../types.ts";
import { replayMoves } from "./record.ts";

/**
 * A DEADLINE MISSED HALFWAY THROUGH A MOVE ENDS THE MOVE WITH THE TURN.
 *
 * Two turns are made of more than one request: a draughts capture that goes on
 * jumping, and a twist game's stone that waits on its quarter turn. A timeout
 * claimed in the middle of either left the half-made move standing — the
 * other side bound to a chain from the absent side's square with no legal move,
 * or a claim that wrote nothing at all. Each case here is claimed, and then
 * replayed from its record to the same position, since the record is what
 * every page reads.
 */

const p = (row: number, col: number): Point => ({ row, col });

function recordOf(state: GameState): MoveInput[] {
  return state.moves.map((move) => ({ row: move.row, col: move.col, kind: move.kind, stone: move.stone, from: move.from }));
}

describe("a turn lost halfway through a capture chain", () => {
  /** Black has jumped once from (2,1) to (4,3), and a second capture over (5,4) is waiting. White keeps a spare at (7,0). */
  function midChain(): { start: GameState; chained: GameState } {
    const size = 8;
    const board = new Array(size * size).fill(null);
    board[2 * size + 1] = STONES.black;
    board[3 * size + 2] = STONES.white;
    board[5 * size + 4] = STONES.white;
    board[7 * size + 0] = STONES.white;
    const start: GameState = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };
    return { start, chained: movePiece(start, p(2, 1), p(4, 3)) };
  }

  it("keeps the capture already made, ends the chain, and gives the other side its moves", () => {
    const { chained } = midChain();
    expect(chained.chainAt).toEqual(p(4, 3));

    const lost = forfeitOnRecord(chained);
    expect(lost.moves.slice(-1)).toMatchObject([{ kind: MOVE_KINDS.forfeit, stone: STONES.black }]);
    expect(lost.toPlay).toBe(STONES.white);
    expect(lost.chainAt).toBeNull();
    // The jumped piece stays captured.
    expect(lost.board[3 * 8 + 2]).toBeNull();
    expect(lost.captures.black).toBe(1);
    // White can move again: before, it was bound to a chain from black's square and had no move at all.
    expect(pieceMoves(lost, p(5, 4)).length + pieceMoves(lost, p(7, 0)).length).toBeGreaterThan(0);
    expect(lost.status).toBe(GAME_STATUS.playing);
  });

  it("replays from its record to the same position", () => {
    const { start, chained } = midChain();
    const lost = forfeitOnRecord(chained);
    const timeline = replayMoves(start, recordOf(lost), [], { clocked: true });
    const last = timeline[timeline.length - 1];
    expect(last.moves).toHaveLength(lost.moves.length);
    expect(last.chainAt).toBeNull();
    expect(last.toPlay).toBe(STONES.white);
    expect(last.board).toEqual(lost.board);
  });
});

describe("a turn lost while a twist is still owed", () => {
  function stoneDown(): { start: GameState; placed: GameState } {
    const start = createGame({ variant: "twistFive" });
    const point = emptyPoints(start).find((one) => isLegalMove(start, one));
    if (point === undefined) throw new Error("No legal point to play.");
    return { start, placed: playMove(start, point) };
  }

  it("keeps the stone, leaves the quarter unturned, and hands the move on", () => {
    const { placed } = stoneDown();
    expect(placed.pendingTwist).toBe(true);

    const lost = forfeitOnRecord(placed);
    // Before, this was the very same position: the claim wrote nothing.
    expect(lost).not.toBe(placed);
    expect(lost.pendingTwist).toBe(false);
    expect(lost.toPlay).toBe(STONES.white);
    expect(lost.board).toEqual(placed.board);
    expect(lost.moves.slice(-1)).toMatchObject([{ kind: MOVE_KINDS.forfeit, stone: STONES.black }]);
    expect(lost.status).toBe(GAME_STATUS.playing);
  });

  it("replays from its record to the same position", () => {
    const { start, placed } = stoneDown();
    const lost = forfeitOnRecord(placed);
    const timeline = replayMoves(start, recordOf(lost), [], { clocked: true });
    const last = timeline[timeline.length - 1];
    expect(last.moves).toHaveLength(2);
    expect(last.pendingTwist).toBe(false);
    expect(last.toPlay).toBe(STONES.white);
    expect(last.board).toEqual(lost.board);
  });

  it("is a draw when the stone that waited on its twist filled the board", () => {
    const { placed } = stoneDown();
    // Every other cell taken by stones that make no line, as a board with one gap left can be.
    const full = placed.board.map((cell) => cell ?? STONES.white);
    const lost = forfeitOnRecord({ ...placed, board: full });
    expect(lost.status).toBe(GAME_STATUS.draw);
  });
});
