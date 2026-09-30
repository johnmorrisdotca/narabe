import { describe, expect, it } from "vitest";

import {
  cellAt,
  createGame,
  isLegalMove,
  legalPoints,
  movePiece,
  mustPass,
  passTurn,
  pieceMoves,
  playMove,
  stonesLeft,
  twistBoard,
} from "../engine.ts";
import {
  GAME_STATUS,
  MOVE_KINDS,
  NO_HEAD_START,
  OPENING_RULES,
  RULE_VARIANTS,
  STONES,
} from "../constants.ts";
import type { GameState, HeadStart, Point, Stone } from "../types.ts";
import { fixedOpener } from "./creation.ts";
import { passesOwed } from "./forcedPass.ts";
import { handicapKind, hasHandicap } from "./handicap.ts";
import {
  HEAD_START_KOMI,
  cornerPoints,
  freeTurnsOffered,
  handicapStonePoints,
  headStartTurnTaken,
  komiFor,
  normaliseHeadStart,
  owesHeadStart,
  traditionalCounts,
} from "./headStart.ts";
import { KOMI } from "./go.ts";
import { replayMoves, undoMove } from "./record.ts";

const p = (row: number, col: number): Point => ({ row, col });

function given(stone: Stone, freeTurns: number, traditional = 0): HeadStart {
  return { stone, freeTurns, traditional };
}

/** The first point the colour to move may play, in reading order. */
function anyPoint(state: GameState): Point {
  const points = legalPoints(state);
  expect(points.length, "nothing to play").toBeGreaterThan(0);
  return points[0];
}

/** The first piece move the colour to move has, for the games that move pieces. */
function anyPieceMove(state: GameState): { from: Point; to: Point } {
  const { size } = state.settings;
  for (let index = 0; index < state.board.length; index += 1) {
    const from = p(Math.floor(index / size), index % size);
    const moves = pieceMoves(state, from);
    if (moves.length > 0) return { from, to: moves[0] };
  }
  throw new Error("no piece can move");
}

function stonesOf(state: GameState, stone: Stone): number {
  return state.board.filter((cell) => cell === stone).length;
}

describe("a head start, as the settings carry it", () => {
  it("gives nobody anything unless a colour is given a turn or a tradition", () => {
    expect(normaliseHeadStart({ variant: RULE_VARIANTS.freestyle, size: 15, headStart: NO_HEAD_START })).toEqual(NO_HEAD_START);
    expect(normaliseHeadStart({ variant: RULE_VARIANTS.freestyle, size: 15, headStart: given(STONES.black, 0) })).toEqual(NO_HEAD_START);
    // A game stored before head starts existed has none at all.
    expect(normaliseHeadStart({ variant: RULE_VARIANTS.freestyle, size: 15 })).toEqual(NO_HEAD_START);
  });

  it("offers free turns up to each game's declared most, and refuses more", () => {
    expect(freeTurnsOffered(RULE_VARIANTS.freestyle)).toEqual([1, 2]);
    expect(freeTurnsOffered(RULE_VARIANTS.go)).toEqual([1, 2, 3]);
    // One free turn wins tic-tac-toe and takes Othello's last disc: none offered.
    expect(freeTurnsOffered(RULE_VARIANTS.tictactoe)).toEqual([]);
    expect(freeTurnsOffered(RULE_VARIANTS.reversi)).toEqual([]);
    expect(freeTurnsOffered("not-a-game")).toEqual([]);

    expect(normaliseHeadStart({ variant: RULE_VARIANTS.freestyle, size: 15, headStart: given(STONES.white, 2) })).toEqual(given(STONES.white, 2));
    // Three gives an open four: refused outright rather than trimmed to two.
    expect(normaliseHeadStart({ variant: RULE_VARIANTS.freestyle, size: 15, headStart: given(STONES.white, 3) })).toEqual(NO_HEAD_START);
    expect(normaliseHeadStart({ variant: RULE_VARIANTS.tictactoe, size: 3, headStart: given(STONES.black, 1) })).toEqual(NO_HEAD_START);
    // Refused free turns leave a tradition the game still has.
    expect(normaliseHeadStart({ variant: RULE_VARIANTS.reversi, size: 8, headStart: given(STONES.white, 1, 2) })).toEqual(given(STONES.white, 0, 2));
  });

  it("offers each game's own traditional head start, and none where it has none", () => {
    expect(traditionalCounts(RULE_VARIANTS.go, 19)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    // 13×13 and 9×9 mark their corners and centre: five star points.
    expect(traditionalCounts(RULE_VARIANTS.go, 13)).toEqual([2, 3, 4, 5]);
    expect(traditionalCounts(RULE_VARIANTS.go, 9)).toEqual([2, 3, 4, 5]);
    expect(traditionalCounts(RULE_VARIANTS.reversi, 8)).toEqual([1, 2, 3, 4]);
    expect(traditionalCounts(RULE_VARIANTS.checkers, 8)).toEqual([1, 2, 3]);
    expect(traditionalCounts(RULE_VARIANTS.internationalDraughts, 10)).toEqual([1, 2, 3]);
    // A corner in anti-Othello is a disc you are stuck with, not a gift.
    expect(traditionalCounts(RULE_VARIANTS.antiReversi, 8)).toEqual([]);
    expect(traditionalCounts(RULE_VARIANTS.freestyle, 15)).toEqual([]);
    expect(traditionalCounts(RULE_VARIANTS.chineseCheckers, 17)).toEqual([]);
  });

  it("drops a traditional part the board has no room for", () => {
    const start = normaliseHeadStart({ variant: RULE_VARIANTS.go, size: 9, headStart: given(STONES.black, 0, 7) });
    expect(start).toEqual(NO_HEAD_START);
  });

  it("is a handicap to the rating, and named as a head start", () => {
    const settings = createGame({ headStart: given(STONES.black, 1) }).settings;
    expect(hasHandicap(settings)).toBe(true);
    expect(handicapKind(settings)).toBe("headStart");
    expect(handicapKind(createGame().settings)).toBeNull();
  });

  it("plays the free opening, whatever was asked", () => {
    const game = createGame({ variant: RULE_VARIANTS.renju, opening: OPENING_RULES.swap2, headStart: given(STONES.black, 1) });
    expect(game.settings.opening).toBe(OPENING_RULES.free);
    const pro = createGame({ opening: OPENING_RULES.pro, headStart: given(STONES.white, 2) });
    expect(pro.settings.opening).toBe(OPENING_RULES.free);
  });
});

describe("free turns", () => {
  it("gives the colour its turns at the start, each taken as the other colour's pass", () => {
    let state = createGame({ size: 15, headStart: given(STONES.black, 2) });
    state = playMove(state, p(7, 7));

    // White owes the first free turn: nothing is legal, and the pass is forced.
    expect(state.toPlay).toBe(STONES.white);
    expect(owesHeadStart(state)).toBe(true);
    expect(mustPass(state)).toBe(true);
    expect(isLegalMove(state, p(0, 0))).toBe(false);

    state = passTurn(state);
    const pass = state.moves[state.moves.length - 1];
    expect(pass.kind).toBe(MOVE_KINDS.pass);
    expect(pass.headStart).toBe(true);
    // Not "had no move": that is what `forced` tells the boards.
    expect(pass.forced).toBeUndefined();
    expect(state.toPlay).toBe(STONES.black);
    expect(headStartTurnTaken(state)).toEqual({ stone: STONES.black, turn: 1, of: 2 });

    state = passesOwed(playMove(state, p(7, 8)));
    expect(state.toPlay).toBe(STONES.black);
    state = playMove(state, p(7, 9));

    // Two given; White plays its own game from here.
    expect(owesHeadStart(state)).toBe(false);
    expect(mustPass(state)).toBe(false);
    expect(isLegalMove(state, p(0, 0))).toBe(true);
    expect(stonesOf(state, STONES.black)).toBe(3);
    expect(state.moves.filter((move) => move.headStart === true)).toHaveLength(2);
  });

  it("waits for the colour given them where the other colour opens", () => {
    let state = createGame({ size: 15, headStart: given(STONES.white, 1) });
    state = playMove(state, p(7, 7));
    expect(owesHeadStart(state)).toBe(false);
    state = playMove(state, p(8, 8));
    expect(owesHeadStart(state)).toBe(true);
    state = passesOwed(state);
    expect(state.toPlay).toBe(STONES.white);
    state = playMove(state, p(9, 9));
    expect(state.toPlay).toBe(STONES.black);
    expect(owesHeadStart(state)).toBe(false);
  });

  it("is spent once the other colour has played a turn of its own, whatever is left", () => {
    // Go: black passes by choice after its first free turn, and White then plays.
    let state = createGame({ variant: RULE_VARIANTS.go, size: 9, headStart: given(STONES.black, 2) });
    state = passesOwed(playMove(state, p(4, 4)));
    state = passTurn(state);
    // A pass after a head start's pass is not the second of two: the game goes on.
    expect(state.status).toBe(GAME_STATUS.playing);
    expect(owesHeadStart(state)).toBe(false);
    state = playMove(state, p(2, 2));
    state = playMove(state, p(6, 6));
    expect(owesHeadStart(state), "a start given back after White had played").toBe(false);
  });

  it("counts a two-stone turn as one turn", () => {
    /*
     * Connect6 offers no free turns — its measurement could not show one safe —
     * but the turn rule must still count a two-stone turn as one, so the start is
     * set on the position directly, past the game's own limit.
     */
    const plain = createGame({ variant: RULE_VARIANTS.connect6, size: 19 });
    expect(plain.settings.headStart).toEqual(NO_HEAD_START);
    let state: GameState = { ...plain, settings: { ...plain.settings, headStart: given(STONES.black, 1) } };
    state = playMove(state, p(9, 9));
    state = passesOwed(state);
    // Black's second turn is a whole turn of two stones, not the tail of its first.
    expect(state.toPlay).toBe(STONES.black);
    expect(stonesLeft(state)).toBe(2);
    state = playMove(state, p(9, 10));
    expect(owesHeadStart(state)).toBe(false);
    state = playMove(state, p(9, 11));
    expect(state.toPlay).toBe(STONES.white);
    expect(owesHeadStart(state)).toBe(false);
  });

  it("waits for a twist to finish the turn", () => {
    let state = createGame({ variant: RULE_VARIANTS.twistFive, headStart: given(STONES.black, 1) });
    state = playMove(state, p(0, 0));
    expect(state.pendingTwist).toBe(true);
    expect(owesHeadStart(state)).toBe(false);
    state = twistBoard(state, 3, true);
    expect(owesHeadStart(state)).toBe(true);
  });

  it("gives a turn in the games that move pieces too", () => {
    let state = createGame({ variant: RULE_VARIANTS.checkers, headStart: given(STONES.black, 1) });
    const opener = state.toPlay;
    expect(opener).toBe(STONES.black);
    const first = anyPieceMove(state);
    state = movePiece(state, first.from, first.to);
    expect(owesHeadStart(state)).toBe(true);
    expect(anyPieceMoveOrNull(state)).toBeNull();
    state = passesOwed(state);
    expect(state.toPlay).toBe(STONES.black);
    const second = anyPieceMove(state);
    state = movePiece(state, second.from, second.to);
    expect(state.toPlay).toBe(STONES.white);
    expect(state.status).toBe(GAME_STATUS.playing);
  });

  it("takes a flipping game's turn as a pass, where one is set", () => {
    /*
     * Othello offers no free turns: one for the colour that opens takes the
     * other colour's last disc on its second move, every time. The rule is still
     * the engine's, so the start is set on the position directly — for White,
     * which does not open.
     */
    expect(createGame({ variant: RULE_VARIANTS.reversi, headStart: given(STONES.white, 1) }).settings.headStart).toEqual(NO_HEAD_START);
    const plain = createGame({ variant: RULE_VARIANTS.reversi });
    let state: GameState = { ...plain, settings: { ...plain.settings, headStart: given(STONES.white, 1) } };
    state = playMove(state, anyPoint(state));
    expect(owesHeadStart(state)).toBe(false);
    state = playMove(state, anyPoint(state));
    expect(owesHeadStart(state)).toBe(true);
    state = passesOwed(state);
    expect(state.toPlay).toBe(STONES.white);
    state = playMove(state, anyPoint(state));
    expect(state.status).toBe(GAME_STATUS.playing);
    expect(state.toPlay).toBe(STONES.black);
  });

  it("replays from its move list alone, head-start passes and all", () => {
    let state = createGame({ size: 15, headStart: given(STONES.black, 2) });
    for (const point of [p(3, 3), p(3, 4), p(3, 5), p(10, 10), p(3, 7)]) {
      state = passesOwed(playMove(state, point));
    }
    const replayed = replayMoves(createGame({ ...state.settings, firstPlayer: state.opener }), state.moves, []);
    const final = replayed[replayed.length - 1];
    expect(final.board).toEqual(state.board);
    expect(final.toPlay).toBe(state.toPlay);
    expect(final.moves.map((move) => move.headStart === true)).toEqual(state.moves.map((move) => move.headStart === true));
  });

  it("takes a head start's pass back with the turn it followed", () => {
    let state = createGame({ size: 15, headStart: given(STONES.black, 1), allowUndo: true });
    state = passesOwed(playMove(state, p(7, 7)));
    expect(state.moves).toHaveLength(2);
    const undone = undoMove(state);
    expect(undone.moves).toHaveLength(0);
    expect(undone.toPlay).toBe(STONES.black);
    expect(cellAt(undone, p(7, 7))).toBeNull();
  });
});

function anyPieceMoveOrNull(state: GameState): { from: Point; to: Point } | null {
  try {
    return anyPieceMove(state);
  } catch {
    return null;
  }
}

describe("Go's handicap stones", () => {
  it("sets them on the star points in the customary order, and White moves first", () => {
    const state = createGame({ variant: RULE_VARIANTS.go, size: 19, headStart: given(STONES.black, 0, 4) });
    for (const point of [p(3, 15), p(15, 3), p(15, 15), p(3, 3)]) {
      expect(cellAt(state, point), `no handicap stone at ${point.row},${point.col}`).toBe(STONES.black);
    }
    expect(stonesOf(state, STONES.black)).toBe(4);
    expect(state.opener).toBe(STONES.white);
    expect(state.toPlay).toBe(STONES.white);
    expect(state.moves).toEqual([]);
    expect(fixedOpener(RULE_VARIANTS.go, OPENING_RULES.free, { headStart: state.settings.headStart, size: 19 })).toBe(STONES.white);
  });

  it("puts two stones on opposite corners and five with the centre", () => {
    expect(handicapStonePoints(19, 2)).toEqual([p(3, 15), p(15, 3)]);
    expect(handicapStonePoints(9, 5)).toEqual([p(2, 6), p(6, 2), p(6, 6), p(2, 2), p(4, 4)]);
    expect(handicapStonePoints(19, 9)).toHaveLength(9);
  });

  it("counts a handicap game with half a point of komi", () => {
    const handicapped = createGame({ variant: RULE_VARIANTS.go, size: 9, headStart: given(STONES.black, 0, 2) });
    expect(komiFor(handicapped.settings)).toBe(HEAD_START_KOMI);
    expect(komiFor(createGame({ variant: RULE_VARIANTS.go, size: 9 }).settings)).toBe(KOMI);
    // Free turns alone put no stones down, so they leave the komi alone.
    expect(komiFor(createGame({ variant: RULE_VARIANTS.go, size: 9, headStart: given(STONES.black, 2) }).settings)).toBe(KOMI);

    // Two stones and nothing else: 2 against 0.5 of komi is Black's game on the count.
    const ended = passTurn(passTurn(handicapped));
    expect(ended.status).toBe(GAME_STATUS.won);
    expect(ended.winner).toBe(STONES.black);
  });
});

describe("Othello's corners", () => {
  it("gives the colour its corners before the first move, and leaves the opener alone", () => {
    const state = createGame({ variant: RULE_VARIANTS.reversi, headStart: given(STONES.white, 0, 2) });
    expect(cellAt(state, p(0, 0))).toBe(STONES.white);
    expect(cellAt(state, p(7, 7))).toBe(STONES.white);
    expect(cellAt(state, p(0, 7))).toBeNull();
    expect(state.toPlay).toBe(STONES.black);
    expect(cornerPoints(8, 4)).toEqual([p(0, 0), p(7, 7), p(0, 7), p(7, 0)]);
  });

  it("gives nothing in anti-Othello", () => {
    const state = createGame({ variant: RULE_VARIANTS.antiReversi, headStart: given(STONES.white, 0, 2) });
    expect(cellAt(state, p(0, 0))).toBeNull();
    expect(state.settings.headStart).toEqual(NO_HEAD_START);
  });
});

describe("draughts odds", () => {
  it("takes men off the stronger side's back row, from its left as it sits", () => {
    const plain = createGame({ variant: RULE_VARIANTS.checkers });
    // Black is given the start, so White — at the bottom, its left at column 0 — gives the men.
    const odds = createGame({ variant: RULE_VARIANTS.checkers, headStart: given(STONES.black, 0, 2) });
    expect(stonesOf(odds, STONES.white)).toBe(stonesOf(plain, STONES.white) - 2);
    expect(stonesOf(odds, STONES.black)).toBe(stonesOf(plain, STONES.black));
    expect(cellAt(odds, p(7, 0))).toBeNull();
    expect(cellAt(odds, p(7, 2))).toBeNull();
    expect(cellAt(odds, p(7, 4))).toBe(STONES.white);

    // White given it: Black sits at the top, so its left is the far end of row 0.
    const other = createGame({ variant: RULE_VARIANTS.checkers, headStart: given(STONES.white, 0, 1) });
    expect(cellAt(other, p(0, 7))).toBeNull();
    expect(cellAt(other, p(0, 5))).toBe(STONES.black);
    expect(other.toPlay).toBe(plain.toPlay);
  });
});
