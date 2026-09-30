import { describe, expect, it } from "vitest";
import { canGrowBoard, canTwist, cellAt, createGame, inMovePhase, isLegalMove, legalPoints, movePiece, pieceMoves, playMove, resolvePlacement, twistBoard } from "../engine.ts";
import { replayMoves, undoMove } from "./record.ts";
import { GAME_STATUS, RULE_VARIANTS, STONES, WIN_REASONS } from "../constants.ts";
import { fromDiagram, show } from "../test-support.ts";
import type { GameState, Point } from "../types.ts";

const p = (row: number, col: number): Point => ({ row, col });

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

describe("tic-tac-toe", () => {
  it("pins the board to 3×3 and three in a row", () => {
    const game = createGame({ variant: RULE_VARIANTS.tictactoe, size: 15, winLength: 5 });
    expect(game.settings.size).toBe(3);
    expect(game.settings.winLength).toBe(3);
    expect(game.board).toHaveLength(9);
  });

  it("wins with three and draws a full board", () => {
    const won = play(createGame({ variant: RULE_VARIANTS.tictactoe }), [
      p(0, 0), p(1, 0), p(0, 1), p(1, 1), p(0, 2),
    ]);
    expect(won.winner).toBe(STONES.black);

    const drawn = play(createGame({ variant: RULE_VARIANTS.tictactoe }), [
      p(0, 0), p(0, 1), p(0, 2), p(1, 1), p(1, 0), p(1, 2), p(2, 1), p(2, 0), p(2, 2),
    ]);
    expect(drawn.status).toBe(GAME_STATUS.draw);
  });

  it("cannot grow", () => {
    expect(canGrowBoard(createGame({ variant: RULE_VARIANTS.tictactoe, allowResize: true }))).toBe(false);
  });
});

describe("trap three", () => {
  const trap = { settings: { variant: RULE_VARIANTS.trapThree }, toPlay: STONES.black };

  it("loses on exactly three in a row", () => {
    const state = fromDiagram(
      `
        . . . . .
        . x x . .
        . . . . .
        . o o . .
        . . . . .
      `,
      trap,
    );
    const next = playMove(state, p(1, 3));
    expect(next.status).toBe(GAME_STATUS.won);
    expect(next.winner).toBe(STONES.white);
    expect(next.winBy).toBe(WIN_REASONS.trap);
    expect(next.winningLine).toHaveLength(3);
  });

  it("wins on four, which is not also a losing three", () => {
    const state = fromDiagram(
      `
        . . . . .
        x x x . .
        . . . . .
        o o o . .
        . . . . .
      `,
      trap,
    );
    const next = playMove(state, p(1, 3));
    expect(next.winner).toBe(STONES.black);
    expect(next.winBy).toBe(WIN_REASONS.line);
  });

  it("only counts a three on the line just made", () => {
    const state = fromDiagram(
      `
        . . . . .
        . x . x .
        . . . . .
        . . . . .
        . . . . .
      `,
      trap,
    );
    // Two loose stones with a gap: placing away from them is safe.
    expect(playMove(state, p(4, 4)).status).toBe(GAME_STATUS.playing);
    // Filling the gap makes three.
    expect(playMove(state, p(1, 2)).winner).toBe(STONES.white);
  });
});

describe("drop four", () => {
  const drop = { variant: RULE_VARIANTS.dropFour, size: 7 } as const;

  it("lands a stone at the bottom of its column wherever it was played", () => {
    const game = playMove(createGame(drop), p(0, 3));
    expect(cellAt(game, p(6, 3))).toBe(STONES.black);
    expect(cellAt(game, p(0, 3))).toBeNull();
    expect(resolvePlacement(game, p(2, 3))).toEqual(p(5, 3));
  });

  it("offers only the landing cells as legal, and a full column not at all", () => {
    let game = createGame(drop);
    expect(legalPoints(game)).toHaveLength(7);
    expect(isLegalMove(game, p(0, 0))).toBe(false);
    expect(isLegalMove(game, p(6, 0))).toBe(true);
    for (let i = 0; i < 7; i += 1) game = playMove(game, p(0, 0));
    expect(legalPoints(game).some((point) => point.col === 0)).toBe(false);
    expect(playMove(game, p(0, 0))).toBe(game);
  });

  it("wins with four stacked or across", () => {
    const stacked = play(createGame(drop), [p(0, 0), p(0, 1), p(0, 0), p(0, 1), p(0, 0), p(0, 1), p(0, 0)]);
    expect(stacked.winner).toBe(STONES.black);
    expect(stacked.winningLine).toHaveLength(4);
  });

  it("undo lifts the stone that actually landed", () => {
    const game = playMove(createGame(drop), p(0, 3));
    expect(cellAt(undoMove(game), p(6, 3))).toBeNull();
  });
});

describe("twist five", () => {
  const twist = { variant: RULE_VARIANTS.twistFive } as const;

  it("owes a twist after every stone and passes the turn only after it", () => {
    let game = playMove(createGame(twist), p(0, 0));
    expect(game.settings.size).toBe(6);
    expect(canTwist(game)).toBe(true);
    expect(game.toPlay).toBe(STONES.black);
    expect(isLegalMove(game, p(1, 1))).toBe(false);
    expect(playMove(game, p(1, 1))).toBe(game);

    game = twistBoard(game, 0, true);
    expect(canTwist(game)).toBe(false);
    expect(game.toPlay).toBe(STONES.white);
    expect(cellAt(game, p(0, 2))).toBe(STONES.black);
    expect(game.moves[0].twist).toEqual({ quadrant: 0, clockwise: true });
  });

  it("refuses a twist that is not owed or names no quadrant", () => {
    const game = createGame(twist);
    expect(twistBoard(game, 0, true)).toBe(game);
    const placed = playMove(game, p(0, 0));
    expect(twistBoard(placed, 4, true)).toBe(placed);
  });

  it("a five made by the twist wins, for either colour", () => {
    /*
     * Quadrant 3 is the bottom right. Turning it clockwise moves 5,3 to 3,3
     * and 4,3 to 3,4, which puts white's two column stones on the end of
     * white's row of three.
     */
    const state = fromDiagram(
      `
        . . . . . .
        . . . . . .
        . . . . . .
        o o o . . .
        . . . o . .
        . . . o . .
      `,
      { settings: twist, toPlay: STONES.black },
    );
    const placed = playMove(state, p(0, 0));
    expect(placed.status).toBe(GAME_STATUS.playing);
    const turned = twistBoard(placed, 3, true);
    expect(turned.winner).toBe(STONES.white);
    expect(turned.winBy).toBe(WIN_REASONS.line);
    expect(turned.winningLine).toHaveLength(5);
  });

  it("five made by placing wins at once, and five for both at once is a draw", () => {
    const state = fromDiagram(
      `
        x x x x . .
        . . . . . .
        . . . . . .
        o o o o . .
        . . . . . .
        . . . . . .
      `,
      { settings: twist, toPlay: STONES.black },
    );
    const five = playMove(state, p(0, 4));
    expect(five.winner).toBe(STONES.black);
    expect(five.pendingTwist).toBe(false);

    /*
     * Turning the top-right quadrant anticlockwise sends 0,5 to 0,3 and 1,5 to
     * 0,4, completing black's row, and 2,3 to 2,5 and 2,4 to 1,5, completing
     * white's column. Both lines arrive on the same turn.
     */
    const both = fromDiagram(
      `
        x x x . . x
        . . . . . x
        . . . o o .
        . . . . . o
        . . . . . o
        . . . . . o
      `,
      { settings: twist, toPlay: STONES.black },
    );
    const placed = playMove(both, p(5, 0));
    expect(placed.status).toBe(GAME_STATUS.playing);
    const turned = twistBoard(placed, 1, false);
    expect(turned.status).toBe(GAME_STATUS.draw);
    expect(turned.winner).toBeNull();
  });

  it("undo turns the quadrant back and lifts the stone", () => {
    const placed = playMove(createGame(twist), p(0, 0));
    const turned = twistBoard(placed, 0, true);
    const undone = undoMove(turned);
    expect(undone.board).toEqual(createGame(twist).board);
    expect(undone.pendingTwist).toBe(false);
    expect(undone.toPlay).toBe(STONES.black);
    // Undo with the twist still owed just lifts the stone.
    expect(undoMove(placed).board).toEqual(createGame(twist).board);
  });

  it("replays a record with its twists", () => {
    const start = createGame(twist);
    const played = twistBoard(playMove(twistBoard(playMove(start, p(0, 0)), 0, true), p(5, 5)), 3, false);
    const timeline = replayMoves(start, played.moves);
    expect(timeline[timeline.length - 1].board).toEqual(played.board);
    expect(timeline[timeline.length - 1].toPlay).toBe(played.toPlay);
  });
});

describe("twist four", () => {
  it("plays on 4×4 with four 2×2 quadrants", () => {
    let game = createGame({ variant: RULE_VARIANTS.twistFour });
    expect(game.settings.size).toBe(4);
    game = twistBoard(playMove(game, p(0, 0)), 0, true);
    expect(cellAt(game, p(0, 1))).toBe(STONES.black);
    expect(twistBoard(playMove(game, p(3, 3)), 3, false).toPlay).toBe(STONES.black);
  });
});

describe("square four", () => {
  const square = { variant: RULE_VARIANTS.squareFour } as const;

  it("places four pieces each, then slides", () => {
    let game = createGame(square);
    expect(inMovePhase(game)).toBe(false);
    game = play(game, [p(0, 0), p(4, 4), p(0, 1), p(4, 3), p(0, 2), p(4, 2), p(1, 4), p(3, 0)]);
    expect(inMovePhase(game)).toBe(true);
    expect(legalPoints(game)).toEqual([]);
    expect(playMove(game, p(2, 2))).toBe(game);

    expect(show(pieceMoves(game, p(0, 2)))).toEqual(show([p(0, 3), p(1, 1), p(1, 2), p(1, 3)]));
    expect(pieceMoves(game, p(4, 4))).toEqual([]);

    const moved = movePiece(game, p(0, 2), p(1, 3));
    expect(cellAt(moved, p(0, 2))).toBeNull();
    expect(cellAt(moved, p(1, 3))).toBe(STONES.black);
    expect(moved.toPlay).toBe(STONES.white);
    expect(moved.moves[moved.moves.length - 1]).toMatchObject({ kind: "move", from: p(0, 2) });
  });

  it("wins with a square while placing, and with a line while sliding", () => {
    const squared = play(createGame(square), [p(0, 0), p(4, 4), p(0, 1), p(4, 3), p(1, 0), p(4, 2), p(1, 1)]);
    expect(squared.winner).toBe(STONES.black);
    expect(squared.winBy).toBe(WIN_REASONS.square);

    let game = play(createGame(square), [p(2, 0), p(4, 4), p(2, 1), p(4, 3), p(2, 2), p(4, 2), p(0, 3), p(3, 0)]);
    game = movePiece(game, p(0, 3), p(1, 3));
    game = movePiece(game, p(3, 0), p(3, 1));
    game = movePiece(game, p(1, 3), p(2, 3));
    expect(game.winner).toBe(STONES.black);
    expect(game.winBy).toBe(WIN_REASONS.line);
  });

  it("undo puts a slid piece back, and replay reproduces slides", () => {
    let game = play(createGame(square), [p(0, 0), p(4, 4), p(0, 1), p(4, 3), p(0, 2), p(4, 2), p(1, 4), p(3, 0)]);
    game = movePiece(game, p(0, 2), p(1, 3));
    const undone = undoMove(game);
    expect(cellAt(undone, p(0, 2))).toBe(STONES.black);
    expect(cellAt(undone, p(1, 3))).toBeNull();
    expect(undone.toPlay).toBe(STONES.black);

    const timeline = replayMoves(createGame(square), game.moves);
    expect(timeline[timeline.length - 1].board).toEqual(game.board);
  });
});
