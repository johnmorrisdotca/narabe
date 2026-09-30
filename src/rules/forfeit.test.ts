import { describe, expect, it } from "vitest";

import { canForfeit, canPass, createGame, emptyPoints, forfeitOnRecord, isLegalMove, passTurn, playMove } from "../engine.ts";
import { GAME_STATUS, MOVE_KINDS, RULE_VARIANTS, STONES } from "../constants.ts";
import type { GameSettings, GameState, MoveInput, Point } from "../types.ts";
import { lastMove, replayMoves, undoMove } from "./record.ts";

/**
 * A TURN LOST ON TIME REPLAYS TO THE POSITION THE GAME REACHED.
 *
 * A claimed timeout used to write the missed turn as a pass whatever the game.
 * Only Go, and a piece game with nothing to lay, offers a pass — so in every
 * other game the replay refused it and stopped there, a turn short of the
 * game: one stone and a timeout in gomoku was two moves with black to play on
 * the server, and one move with white still to play on every page that read
 * the record. These cases hold the engine's half: what the claim settles, and
 * what a record of it replays to.
 */

const CLOCKED = { clocked: true };
const NO_CLOCK = { clocked: false };

function firstLegal(state: GameState): Point {
  const point = emptyPoints(state).find((candidate) => isLegalMove(state, candidate));
  if (point === undefined) throw new Error("No legal point to play.");
  return point;
}

function play(state: GameState, stones: number): GameState {
  let next = state;
  for (let index = 0; index < stones; index += 1) next = playMove(next, firstLegal(next));
  return next;
}

/** A game as a store keeps it: the moves, and nothing the engine worked out. */
function record(state: GameState): MoveInput[] {
  return state.moves.map((move) => ({
    row: move.row,
    col: move.col,
    stone: move.stone,
    kind: move.kind,
    from: move.from,
    twist: move.twist,
    cells: move.cells,
  }));
}

function replayed(settings: Partial<GameSettings>, moves: MoveInput[], facts = CLOCKED): GameState {
  const timeline = replayMoves(createGame(settings), moves, [], facts);
  return timeline[timeline.length - 1];
}

describe.each([
  { variant: RULE_VARIANTS.freestyle, size: 15 },
  { variant: RULE_VARIANTS.renju, size: 15 },
  { variant: RULE_VARIANTS.reversi, size: 8 },
])("a turn lost on time in $variant", (settings) => {
  it("is a forfeit on the record, and replays to exactly the position the game reached", () => {
    const opened = play(createGame(settings), 1);
    expect(canPass(opened), "this game offers white no pass").toBe(false);

    let live = forfeitOnRecord(opened);
    expect(live.moves[live.moves.length - 1]).toMatchObject({ kind: MOVE_KINDS.forfeit, stone: STONES.white });
    expect(live.toPlay).toBe(STONES.black);
    live = play(live, 1);

    const back = replayed(settings, record(live));
    expect(back.moves).toHaveLength(live.moves.length);
    expect(back.board).toEqual(live.board);
    expect(back.toPlay).toBe(live.toPlay);
    expect(back.status).toBe(live.status);
  });

  it("stopped a turn short when the same turn was written as a pass", () => {
    const live = forfeitOnRecord(play(createGame(settings), 1));
    const asPass = record(live).map((move) => (move.kind === MOVE_KINDS.forfeit ? { ...move, kind: MOVE_KINDS.pass } : move));

    const back = replayed(settings, asPass);
    // The fault this file exists for: one move, and white still to play.
    expect(back.moves).toHaveLength(1);
    expect(back.toPlay).toBe(STONES.white);
    expect(live.toPlay).toBe(STONES.black);
  });

  it("is refused on a record that never ran a clock, rather than skipping a turn nobody lost", () => {
    const live = forfeitOnRecord(play(createGame(settings), 1));

    const back = replayed(settings, record(live), NO_CLOCK);
    expect(back.moves).toHaveLength(1);
    expect(back.toPlay).toBe(STONES.white);
  });

  it("is lifted back off by an undo without touching the board", () => {
    const opened = play(createGame({ ...settings, allowUndo: true }), 1);
    const live = forfeitOnRecord(opened);

    expect(lastMove(live)).toBeNull();
    const undone = undoMove(live);
    expect(undone.board).toEqual(opened.board);
    expect(undone.moves).toHaveLength(1);
    expect(undone.toPlay).toBe(STONES.white);
  });
});

describe("a turn lost on time in Go", () => {
  const go = { variant: RULE_VARIANTS.go, size: 9 };

  it("is a pass wherever the rules offer one, so after a pass it ends the game by count, live and replayed", () => {
    const passed = passTurn(play(createGame(go), 4));

    const live = forfeitOnRecord(passed);
    expect(live.moves[live.moves.length - 1].kind).toBe(MOVE_KINDS.pass);
    expect(live.status).toBe(GAME_STATUS.won);

    const back = replayed(go, record(live));
    expect(back.status).toBe(GAME_STATUS.won);
    expect(back.winner).toBe(live.winner);
    expect(back.winBy).toBe(live.winBy);
  });

  it("refuses a forfeit on the record, since the clock would have written the pass instead", () => {
    const live = play(createGame(go), 2);
    expect(canForfeit(live)).toBe(false);

    const forged: MoveInput[] = [...record(live), { row: -1, col: -1, stone: STONES.black, kind: MOVE_KINDS.forfeit }];
    const back = replayed(go, forged);
    expect(back.moves).toHaveLength(2);
    expect(back.toPlay).toBe(STONES.black);
  });

  it("does not count a forfeit as the first of two passes in a game where one could follow", () => {
    // A piece game's forced pass ends it on the second in a row; a forfeit before it is not one.
    const opened = play(createGame({ variant: RULE_VARIANTS.freestyle, size: 15 }), 1);
    const live = forfeitOnRecord(opened);
    expect(live.moves[live.moves.length - 1].kind).toBe(MOVE_KINDS.forfeit);
    expect(live.status).toBe(GAME_STATUS.playing);
  });
});
