import { describe, expect, it } from "vitest";

import { GAME_STATUS, RULE_VARIANTS, STONES, WIN_REASONS } from "../constants.ts";
import { createGame, inMovePhase, isLegalMove, legalPoints, movePiece, pieceMoves, playMove } from "../engine.ts";
import { replayMoves, undoMove } from "./record.ts";
import { MILLS, MILL_POINTS, hasMillMove, inMill, isMillPoint, millNeighbours, takeableMen } from "./mills.ts";
import type { GameState, Point } from "../types.ts";

const at = (row: number, col: number): Point => ({ row, col });
const newGame = () => createGame({ variant: RULE_VARIANTS.nineMensMorris, size: 7 });
const play = (state: GameState, ...points: Point[]) => points.reduce((so, point) => playMove(so, point), state);

/** A game a few moves in, black to make its mill on the top row with its next man. */
const nearMill = () => play(newGame(), at(0, 0), at(6, 0), at(0, 3), at(6, 3));

/** Lays every man of both sides, black at the first points of the list and white at the rest, with no mill for either. */
const LAID_BLACK = [at(0, 0), at(1, 1), at(2, 2), at(0, 6), at(1, 5), at(2, 4), at(6, 0), at(5, 1), at(4, 2)];
const LAID_WHITE = [at(0, 3), at(1, 3), at(3, 0), at(3, 1), at(3, 5), at(3, 6), at(5, 3), at(6, 3), at(4, 4)];

describe("the mill board", () => {
  it("has twenty-four points, each on two mills, and sixteen mills in all", () => {
    expect(MILL_POINTS).toHaveLength(24);
    expect(MILLS).toHaveLength(16);
    for (const point of MILL_POINTS) {
      expect(MILLS.filter((line) => line.some((each) => each.row === point.row && each.col === point.col)), `${point.row},${point.col}`).toHaveLength(2);
      expect(millNeighbours(point).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("joins only what is drawn: a corner is not joined to the corner of the ring inside it", () => {
    expect(millNeighbours(at(0, 0))).toEqual(expect.arrayContaining([at(0, 3), at(3, 0)]));
    expect(millNeighbours(at(0, 0))).toHaveLength(2);
    expect(millNeighbours(at(1, 3))).toEqual(expect.arrayContaining([at(0, 3), at(2, 3), at(1, 1), at(1, 5)]));
  });

  it("seals everything else, so nothing can be laid off the lines", () => {
    const game = newGame();
    expect(legalPoints(game)).toHaveLength(24);
    expect(isMillPoint(at(0, 1))).toBe(false);
    expect(isLegalMove(game, at(0, 1))).toBe(false);
    expect(isLegalMove(game, at(3, 3))).toBe(false);
    expect(isLegalMove(game, at(0, 0))).toBe(true);
  });
});

describe("a mill takes a man", () => {
  it("keeps the turn after three in a line, and the next point played is the man taken", () => {
    const made = playMove(nearMill(), at(0, 6));
    expect(made.pendingRemoval).toBe(true);
    expect(made.toPlay).toBe(STONES.black);
    // Only the other side's men may be played now, never an empty point.
    expect(isLegalMove(made, at(3, 3))).toBe(false);
    expect(isLegalMove(made, at(1, 1))).toBe(false);
    expect(isLegalMove(made, at(0, 0))).toBe(false);
    expect(legalPoints(made)).toEqual(expect.arrayContaining([at(6, 0), at(6, 3)]));
    const taken = playMove(made, at(6, 0));
    expect(taken.pendingRemoval).toBe(false);
    expect(taken.toPlay).toBe(STONES.white);
    expect(taken.board[6 * 7]).toBeNull();
    expect(taken.captures.black).toBe(1);
    expect(taken.moves.at(-1)!.kind).toBe("remove");
  });

  it("will not take a man out of a mill while the other side has one loose", () => {
    const board = newGame().board.slice();
    for (const point of [at(6, 0), at(6, 3), at(6, 6), at(3, 1)]) board[point.row * 7 + point.col] = STONES.white;
    expect(takeableMen(board, STONES.white)).toEqual([at(3, 1)]);
    const state: GameState = { ...nearMill(), board, pendingRemoval: true };
    expect(isLegalMove(state, at(6, 0))).toBe(false);
    expect(isLegalMove(state, at(3, 1))).toBe(true);
  });

  it("takes a man from a mill when every man the other side has is in one", () => {
    const board = newGame().board.slice();
    board[6 * 7 + 0] = STONES.white;
    board[6 * 7 + 3] = STONES.white;
    board[6 * 7 + 6] = STONES.white;
    expect(takeableMen(board, STONES.white)).toHaveLength(3);
  });
});

describe("laying and moving", () => {
  const allDown = () => {
    let state = newGame();
    for (let turn = 0; turn < 9; turn += 1) state = play(state, LAID_BLACK[turn]!, LAID_WHITE[turn]!);
    return state;
  };

  it("lays nine each, then moves: and a man taken does not make room to lay another", () => {
    let state = newGame();
    expect(inMovePhase(state)).toBe(false);
    state = allDown();
    expect(state.status).toBe(GAME_STATUS.playing);
    expect(inMovePhase(state)).toBe(true);
    expect(isLegalMove(state, at(2, 3))).toBe(false);
    expect(pieceMoves(state, at(2, 2))).toEqual(expect.arrayContaining([at(2, 3), at(3, 2)]));
    // White's turn counts its own men: nine down whichever have been taken.
    const moved = movePiece(state, at(2, 2), at(2, 3));
    expect(moved.toPlay).toBe(STONES.white);
    expect(inMovePhase(moved)).toBe(true);
  });

  it("moves along the lines only, one point at a time", () => {
    const state = allDown();
    expect(pieceMoves(state, at(0, 0))).toEqual([]);
    expect(movePiece(state, at(2, 2), at(5, 5))).toBe(state);
  });

  it("lets a side down to three men fly to any empty point", () => {
    const board = newGame().board.slice();
    for (const point of [at(0, 0), at(0, 3), at(1, 1)]) board[point.row * 7 + point.col] = STONES.black;
    for (const point of LAID_WHITE.slice(1, 6)) board[point.row * 7 + point.col] = STONES.white;
    let state: GameState = allDown();
    state = { ...state, board, toPlay: STONES.black };
    const reach = pieceMoves(state, at(0, 0));
    expect(reach.length).toBe(24 - 8);
    expect(reach).toContainEqual(at(6, 6));
  });

  it("is lost when a side with all its men laid is brought down to two", () => {
    const board = newGame().board.slice();
    for (const point of [at(0, 0), at(0, 3), at(0, 6), at(1, 1)]) board[point.row * 7 + point.col] = STONES.black;
    for (const point of [at(6, 0), at(6, 3), at(5, 5)]) board[point.row * 7 + point.col] = STONES.white;
    const state: GameState = { ...allDown(), board, toPlay: STONES.black, pendingRemoval: true };
    const over = playMove(state, at(5, 5));
    expect(over.status).toBe(GAME_STATUS.won);
    expect(over.winner).toBe(STONES.black);
    expect(over.winBy).toBe(WIN_REASONS.reduced);
  });

  it("is lost by a side with no move, and it is not a draw", () => {
    const board = newGame().board.slice();
    // White's four men in the outer ring's corners and a middle, every neighbour black.
    const white = [at(0, 0), at(0, 6), at(6, 0), at(6, 6)];
    const black = [at(0, 3), at(3, 0), at(3, 6), at(6, 3), at(1, 1)];
    for (const point of white) board[point.row * 7 + point.col] = STONES.white;
    for (const point of black) board[point.row * 7 + point.col] = STONES.black;
    expect(hasMillMove(board, STONES.white)).toBe(false);
    const state: GameState = { ...allDown(), board, toPlay: STONES.black };
    const over = movePiece(state, at(1, 1), at(1, 3));
    expect(over.status).toBe(GAME_STATUS.won);
    expect(over.winBy).toBe(WIN_REASONS.blocked);
    expect(over.winner).toBe(STONES.black);
  });
});

describe("the record", () => {
  it("replays a mill and its taking from the points alone, as a server and a browser do", () => {
    const moves = [at(0, 0), at(6, 0), at(0, 3), at(6, 3), at(0, 6), at(6, 0), at(5, 5)];
    const timeline = replayMoves(newGame(), moves.map((point) => ({ ...point, stone: STONES.black, kind: "place" as const })));
    expect(timeline).toHaveLength(moves.length + 1);
    expect(timeline.at(-1)!.board[6 * 7]).toBeNull();
    expect(timeline.at(-1)!.toPlay).toBe(STONES.black);
  });

  it("takes a move back, the taking first and then the mill", () => {
    const made = playMove(nearMill(), at(0, 6));
    const taken = playMove(made, at(6, 0));
    const once = undoMove(taken);
    expect(once.pendingRemoval).toBe(true);
    expect(once.board[6 * 7]).toBe(STONES.white);
    expect(once.captures.black).toBe(0);
    const twice = undoMove(once);
    expect(twice.pendingRemoval).toBe(false);
    expect(twice.board[6]).toBeNull();
  });

  it("draws fifty moves each of nothing laid or taken", async () => {
    const { NO_PROGRESS_RULES, pliesWithoutProgress } = await import("./noProgress.ts");
    expect(NO_PROGRESS_RULES.nineMensMorris!.plies).toBe(100);
    let state = newGame();
    for (let turn = 0; turn < 9; turn += 1) state = play(state, LAID_BLACK[turn]!, LAID_WHITE[turn]!);
    expect(pliesWithoutProgress(state)).toBe(0);
    state = movePiece(state, at(2, 2), at(2, 3));
    expect(pliesWithoutProgress(state)).toBe(1);
  });
});
