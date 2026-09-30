import { describe, expect, it } from "vitest";

import { createGame, passTurn, piecePlacements, placePiece, playMove } from "../engine.ts";
import { BLOCKED, GAME_STATUS, MOVE_KINDS, RULE_VARIANTS, STONES } from "../constants.ts";
import type { Cell, GameState, Move, MoveInput, Point, RuleVariant, Stone } from "../types.ts";
import { endedWithNoMoves, passesOwed, turnPassedBy } from "./forcedPass.ts";
import { replayMoves } from "./record.ts";

/**
 * The pass nobody clicks for: owed when the colour to move has nothing it may
 * play, never otherwise, and two of them in a row end the game.
 */

const p = (row: number, col: number): Point => ({ row, col });

/** A board sealed everywhere but `open`, so no line can ever be made across it and nothing but the pass is under test. */
function sealed(variant: RuleVariant, size: number, open: Point[], moves: Move[] = [], toPlay: Stone = STONES.black): GameState {
  const game = createGame({ variant, size });
  const board: Cell[] = new Array(size * size).fill(BLOCKED);
  for (const point of open) board[point.row * size + point.col] = null;
  return { ...game, board, moves, toPlay };
}

describe("a pass the rules force", () => {
  it("passes both sides in dominoFive when the last domino leaves room for neither, and the game ends", () => {
    // One gap two points long, and two single points no domino can cover.
    const start = sealed(RULE_VARIANTS.dominoFive, 13, [p(0, 0), p(0, 1), p(5, 5), p(7, 7)]);
    const [lay] = piecePlacements(start);
    const laid = placePiece(start, lay);
    expect(laid.toPlay).toBe(STONES.white);

    const settled = passesOwed(laid);
    expect(settled.moves.map((move) => [move.kind, move.stone, move.forced])).toEqual([
      [MOVE_KINDS.piece, STONES.black, undefined],
      [MOVE_KINDS.pass, STONES.white, true],
      [MOVE_KINDS.pass, STONES.black, true],
    ]);
    expect(settled.status).toBe(GAME_STATUS.draw);
    expect(endedWithNoMoves(settled)).toBe(true);

    // And a replay of those rows reaches the same end, passes and all.
    const record: MoveInput[] = settled.moves.map((move) => ({ row: move.row, col: move.col, kind: move.kind, cells: move.cells }));
    const replayed = replayMoves(start, record);
    const last = replayed[replayed.length - 1];
    expect(last.status).toBe(GAME_STATUS.draw);
    expect(last.moves.map((move) => move.forced)).toEqual([undefined, true, true]);
  });

  it("passes only the stuck side in blockFive, when the other still has singles to lay", () => {
    // White has spent its six singles; black has all of its own. No four-point piece fits anywhere.
    const whiteSingles: Move[] = Array.from({ length: 6 }, (_, at) => ({ ...p(12, at), stone: STONES.white, kind: MOVE_KINDS.place }));
    const start = sealed(RULE_VARIANTS.blockFive, 13, [p(1, 1), p(3, 3), p(5, 5)], whiteSingles);

    const single = playMove(start, p(1, 1));
    expect(single.toPlay).toBe(STONES.white);
    const settled = passesOwed(single);
    expect(settled.moves.slice(-1)).toMatchObject([{ kind: MOVE_KINDS.pass, stone: STONES.white, forced: true }]);
    expect(settled.toPlay).toBe(STONES.black);
    expect(settled.status).toBe(GAME_STATUS.playing);
    expect(turnPassedBy(settled)).toBe(STONES.white);
    expect(endedWithNoMoves(settled)).toBe(false);
  });

  it("never passes a colour that has a move, and never owes Go's pass", () => {
    const gomoku = createGame({ variant: RULE_VARIANTS.freestyle });
    expect(passesOwed(gomoku)).toBe(gomoku);

    const go = createGame({ variant: RULE_VARIANTS.go, size: 9 });
    expect(passesOwed(go)).toBe(go);
    // A pass in Go is a choice, so it is not one the site made for anybody.
    const chosen = passTurn(go);
    expect(chosen.moves[0].forced).toBeUndefined();
    expect(turnPassedBy(chosen)).toBeNull();
  });

  it("names the colour reversi skipped, where the pass leaves no row on the record", () => {
    // Black takes the disc on B8; White has no flip anywhere, and Black still has one on G1.
    const board: Cell[] = new Array(64).fill(BLOCKED);
    const put = (point: Point, cell: Cell) => {
      board[point.row * 8 + point.col] = cell;
    };
    put(p(0, 0), STONES.black);
    put(p(0, 1), STONES.white);
    put(p(0, 2), null);
    put(p(7, 4), STONES.black);
    put(p(7, 5), STONES.white);
    put(p(7, 6), null);
    const start: GameState = { ...createGame({ variant: RULE_VARIANTS.reversi }), board, toPlay: STONES.black };

    const after = playMove(start, p(0, 2));
    expect(after.toPlay).toBe(STONES.black);
    expect(after.status).toBe(GAME_STATUS.playing);
    expect(turnPassedBy(after)).toBe(STONES.white);
    // Nothing is owed on top of it: the flipping games pass on their own.
    expect(passesOwed(after)).toBe(after);
  });
});
