import { describe, expect, it } from "vitest";

import { GAME_STATUS, RULE_VARIANTS, STONES, WIN_REASONS } from "../constants.ts";
import { createGame, inMovePhase, isLegalMove, legalPoints, movePiece, pieceMoves, playMove } from "../engine.ts";
import type { Cell, GameState, Point, RuleVariant } from "../types.ts";
import { allJoined, moverMoves, moverStart, queenReach } from "./movers.ts";
import { replayMoves, undoMove } from "./record.ts";

const at = (row: number, col: number): Point => ({ row, col });

/** A game of this kind on a board the test sets out. */
function setUp(
  variant: RuleVariant,
  size: number,
  men: readonly (readonly [number, number, "black" | "white"])[],
  toPlay: "black" | "white" = "black",
): GameState {
  const game = createGame({ variant, size });
  const board: Cell[] = new Array<Cell>(size * size).fill(null);
  for (const [row, col, stone] of men) board[row * size + col] = stone;
  return { ...game, board, toPlay };
}

describe("Breakthrough", () => {
  const game = () => createGame({ variant: RULE_VARIANTS.breakthrough, size: 8 });

  it("sets out two rows each, black at the foot and moving first", () => {
    const start = game();
    expect(start.board.filter((cell) => cell === STONES.black)).toHaveLength(16);
    expect(start.board.filter((cell) => cell === STONES.white)).toHaveLength(16);
    expect(start.toPlay).toBe(STONES.black);
    expect(inMovePhase(start)).toBe(true);
    expect(legalPoints(start)).toEqual([]);
  });

  it("steps straight or diagonally forward, and never back", () => {
    const start = game();
    expect(pieceMoves(start, at(6, 3))).toEqual(expect.arrayContaining([at(5, 2), at(5, 3), at(5, 4)]));
    expect(pieceMoves(start, at(6, 3))).toHaveLength(3);
    expect(pieceMoves(start, at(7, 3))).toEqual([]);
  });

  it("takes only diagonally forward: a man ahead blocks, a man to the side can be taken", () => {
    const state = setUp(RULE_VARIANTS.breakthrough, 8, [
      [4, 4, "black"],
      [3, 4, "white"],
      [3, 5, "white"],
      [7, 0, "black"],
    ]);
    const moves = pieceMoves(state, at(4, 4));
    expect(moves).toContainEqual(at(3, 5));
    expect(moves).not.toContainEqual(at(3, 4));
    expect(moves).toContainEqual(at(3, 3));
    const taken = movePiece(state, at(4, 4), at(3, 5));
    expect(taken.moves.at(-1)!.captured).toEqual([at(3, 5)]);
    expect(taken.captures.black).toBe(1);
    expect(taken.board.filter((cell) => cell === STONES.white)).toHaveLength(1);
  });

  it("is won by reaching the far row, and by leaving the other side with no man", () => {
    const state = setUp(RULE_VARIANTS.breakthrough, 8, [
      [1, 4, "black"],
      [6, 0, "white"],
    ]);
    const over = movePiece(state, at(1, 4), at(0, 4));
    expect(over.status).toBe(GAME_STATUS.won);
    expect(over.winner).toBe(STONES.black);
    expect(over.winBy).toBe(WIN_REASONS.reached);
    const last = setUp(RULE_VARIANTS.breakthrough, 8, [
      [4, 4, "black"],
      [3, 5, "white"],
    ]);
    const gone = movePiece(last, at(4, 4), at(3, 5));
    expect(gone.status).toBe(GAME_STATUS.won);
    expect(gone.winBy).toBe(WIN_REASONS.blocked);
  });
});

describe("Lines of Action", () => {
  it("sets out twelve each on the edges, none in the corners", () => {
    const start = createGame({ variant: RULE_VARIANTS.linesOfAction, size: 8 });
    expect(start.board.filter((cell) => cell === STONES.black)).toHaveLength(12);
    expect(start.board.filter((cell) => cell === STONES.white)).toHaveLength(12);
    expect(start.board[0]).toBeNull();
    expect(start.board[63]).toBeNull();
  });

  it("goes exactly as far as there are men on its line, whoever's they are", () => {
    const start = createGame({ variant: RULE_VARIANTS.linesOfAction, size: 8 });
    // Column C holds two men, so the top man goes two down. Along its row there are six, and it is blocked by its own landing.
    expect(pieceMoves(start, at(0, 2))).toContainEqual(at(2, 2));
    const state = setUp(RULE_VARIANTS.linesOfAction, 8, [
      [4, 1, "black"],
      [4, 5, "white"],
      [4, 6, "white"],
      [0, 0, "black"],
    ]);
    // Three on the row: three squares, either way that the board and the other side allow.
    expect(pieceMoves(state, at(4, 1))).toContainEqual(at(4, 4));
  });

  it("jumps its own and never the other side's, and takes where it lands", () => {
    const jumps = setUp(RULE_VARIANTS.linesOfAction, 8, [
      [4, 1, "black"],
      [4, 2, "black"],
      [0, 7, "white"],
    ]);
    expect(pieceMoves(jumps, at(4, 1))).toContainEqual(at(4, 3));
    const blocked = setUp(RULE_VARIANTS.linesOfAction, 8, [
      [4, 1, "black"],
      [4, 2, "white"],
      [0, 7, "black"],
    ]);
    expect(pieceMoves(blocked, at(4, 1))).not.toContainEqual(at(4, 3));
    const takes = setUp(RULE_VARIANTS.linesOfAction, 8, [
      [4, 1, "black"],
      [4, 3, "white"],
      [0, 7, "black"],
      [7, 7, "white"],
    ]);
    expect(pieceMoves(takes, at(4, 1))).toContainEqual(at(4, 3));
    const taken = movePiece(takes, at(4, 1), at(4, 3));
    expect(taken.moves.at(-1)!.captured).toEqual([at(4, 3)]);
  });

  it("is won by joining all your men, corners counting as touching, and the mover wins when both join at once", () => {
    expect(
      allJoined(
        [...new Array<Cell>(64).fill(null)].map((_, index) => (index === 0 || index === 9 ? STONES.black : null)),
        8,
        STONES.black,
      ),
    ).toBe(true);
    const state = setUp(RULE_VARIANTS.linesOfAction, 8, [
      [4, 1, "black"],
      [4, 4, "black"],
      [5, 5, "black"],
      [0, 0, "white"],
      [7, 7, "white"],
    ]);
    const over = movePiece(state, at(4, 1), at(4, 4 - 1));
    expect(over.status).toBe(GAME_STATUS.won);
    expect(over.winner).toBe(STONES.black);
    expect(over.winBy).toBe(WIN_REASONS.joined);
    // A move that takes the other side's last stray man joins them both: the mover's own group is read first.
    const both = setUp(RULE_VARIANTS.linesOfAction, 8, [
      [4, 1, "black"],
      [4, 2, "black"],
      [3, 3, "black"],
      [4, 4, "white"],
      [0, 0, "white"],
      [1, 1, "white"],
    ]);
    const landed = movePiece(both, at(4, 1), at(4, 4));
    expect(landed.winner).toBe(STONES.black);
  });

  it("draws a hundred moves each with nothing taken", async () => {
    const { NO_PROGRESS_RULES } = await import("./noProgress.ts");
    expect(NO_PROGRESS_RULES.linesOfAction!.plies).toBe(200);
  });
});

describe("Amazons", () => {
  const game = () => createGame({ variant: RULE_VARIANTS.amazons, size: 10 });

  it("sets out four queens each, white to move first", () => {
    const start = game();
    expect(start.board.filter((cell) => cell === STONES.black)).toHaveLength(4);
    expect(start.board.filter((cell) => cell === STONES.white)).toHaveLength(4);
    expect(start.toPlay).toBe(STONES.white);
    expect(moverStart("amazons", 10)).toHaveLength(8);
  });

  it("moves a queen as a chess queen moves, over nothing", () => {
    const state = setUp(RULE_VARIANTS.amazons, 10, [
      [4, 4, "black"],
      [4, 7, "white"],
      [0, 0, "white"],
    ]);
    const moves = pieceMoves(state, at(4, 4));
    expect(moves).toContainEqual(at(4, 6));
    expect(moves).not.toContainEqual(at(4, 7));
    expect(moves).not.toContainEqual(at(4, 8));
    expect(moves).toContainEqual(at(9, 9));
  });

  it("owes an arrow after a move, from where it landed, and only then does the turn pass", () => {
    const state = setUp(RULE_VARIANTS.amazons, 10, [
      [4, 4, "black"],
      [9, 9, "white"],
    ]);
    const moved = movePiece(state, at(4, 4), at(4, 6));
    expect(moved.pendingShot).toEqual(at(4, 6));
    expect(moved.toPlay).toBe(STONES.black);
    expect(inMovePhase(moved)).toBe(false);
    expect(isLegalMove(moved, at(4, 5))).toBe(true);
    // Where it came from is open to the arrow, and off its lines is not.
    expect(isLegalMove(moved, at(4, 4))).toBe(true);
    expect(isLegalMove(moved, at(5, 8))).toBe(false);
    expect(legalPoints(moved)).toEqual(queenReach(moved.board, 10, at(4, 6)));
    const shot = playMove(moved, at(4, 4));
    expect(shot.board[4 * 10 + 4]).toBe("blocked");
    expect(shot.pendingShot).toBeNull();
    expect(shot.toPlay).toBe(STONES.white);
    expect(shot.moves.at(-1)!.kind).toBe("shoot");
  });

  it("will not let anything pass an arrow's square", () => {
    const board = setUp(RULE_VARIANTS.amazons, 10, [
      [4, 4, "black"],
      [9, 9, "white"],
    ]);
    const shot = playMove(movePiece(board, at(4, 4), at(4, 6)), at(4, 4));
    expect(moverMoves("amazons", shot.board, 10, at(4, 6), STONES.black)).not.toContainEqual(at(4, 3));
  });

  it("is lost by the side with no move when the turn comes to it", () => {
    // White's one queen, in a corner, walled in but for the square the arrow takes.
    const men: [number, number, "black" | "white"][] = [
      [0, 0, "white"],
      [5, 5, "black"],
    ];
    const state = setUp(RULE_VARIANTS.amazons, 10, men);
    const walled = state.board.slice();
    walled[0 * 10 + 1] = "blocked";
    walled[1 * 10 + 1] = "blocked";
    const before: GameState = { ...state, board: walled, pendingShot: at(5, 5) };
    // The arrow can reach (1, 0) only from its line: put the queen on it.
    const on: GameState = {
      ...before,
      board: before.board.map((cell, index) => (index === 55 ? null : index === 6 * 10 + 0 ? STONES.black : cell)),
      pendingShot: at(6, 0),
    };
    const over = playMove(on, at(1, 0));
    expect(over.status).toBe(GAME_STATUS.won);
    expect(over.winner).toBe(STONES.black);
    expect(over.winBy).toBe(WIN_REASONS.blocked);
  });

  it("replays from the points alone, and takes the arrow back first", () => {
    const start = game();
    const moved = movePiece(start, at(9, 3), at(5, 3));
    const shot = playMove(moved, at(5, 8));
    const timeline = replayMoves(start, [
      { row: 5, col: 3, stone: STONES.white, kind: "move", from: at(9, 3) },
      { row: 5, col: 8, stone: STONES.white, kind: "place" },
    ]);
    expect(timeline.at(-1)!.board).toEqual(shot.board);
    const undone = undoMove(shot);
    expect(undone.pendingShot).toEqual(at(5, 3));
    expect(undone.board[58]).toBeNull();
    const again = undoMove(undone);
    expect(again.board[9 * 10 + 3]).toBe(STONES.white);
    expect(again.pendingShot).toBeNull();
  });
});
