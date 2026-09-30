import { describe, expect, it } from "vitest";

import { createGame, movePiece } from "../engine.ts";
import { GAME_STATUS, MOVE_NARROWINGS, RULE_VARIANTS, STONES, TURN_CHOICE_KINDS } from "../constants.ts";
import type { GameState, Point, RuleVariant, Stone } from "../types.ts";
import { turnChoices } from "./choices.ts";

/**
 * What a turn may do, as the board's turn guide reads it. Every answer here is
 * the engine's own — `pieceMoves` and `legalPoints` gathered — so what is under
 * test is the gathering and the naming of the rule that narrowed it.
 */

const p = (row: number, col: number): Point => ({ row, col });
const byPlace = (points: Point[]) => [...points].sort((a, b) => a.row - b.row || a.col - b.col);

type Piece = { at: Point; stone: Stone; king?: boolean };

function position(variant: RuleVariant, pieces: Piece[], toPlay: Stone): GameState {
  const game = createGame({ variant });
  const { size } = game.settings;
  const board = new Array(size * size).fill(null);
  for (const piece of pieces) board[piece.at.row * size + piece.at.col] = piece.stone;
  return { ...game, board, kings: pieces.filter((piece) => piece.king === true).map((piece) => piece.at), toPlay };
}

describe("the pieces a checkers-family turn may move", () => {
  it("narrows checkers to the capturing piece, and says a capture is why", () => {
    const game = position(
      RULE_VARIANTS.checkers,
      [
        { at: p(3, 2), stone: STONES.black },
        { at: p(4, 3), stone: STONES.white },
        // This man could step, and is held back because the other must jump.
        { at: p(2, 5), stone: STONES.black },
      ],
      STONES.black,
    );
    expect(turnChoices(game)).toEqual({
      kind: TURN_CHOICE_KINDS.move,
      pieces: [p(3, 2)],
      count: 1,
      narrowedBy: MOVE_NARROWINGS.capture,
    });
  });

  it("narrows nothing at the start of checkers", () => {
    const choices = turnChoices(createGame({ variant: RULE_VARIANTS.checkers, firstPlayer: STONES.black }));
    expect(choices).toMatchObject({ kind: TURN_CHOICE_KINDS.move, count: 7, narrowedBy: null });
    expect(choices?.kind === TURN_CHOICE_KINDS.move ? choices.pieces : []).toHaveLength(4);
  });

  it("says internationalDraughts refused a shorter capture for a longer one", () => {
    const game = position(
      RULE_VARIANTS.internationalDraughts,
      [
        { at: p(6, 9), stone: STONES.white },
        { at: p(5, 8), stone: STONES.black, king: true },
        { at: p(8, 1), stone: STONES.white },
        { at: p(7, 2), stone: STONES.black },
        { at: p(5, 4), stone: STONES.black },
      ],
      STONES.white,
    );
    expect(turnChoices(game)).toEqual({
      kind: TURN_CHOICE_KINDS.move,
      pieces: [p(8, 1)],
      count: 1,
      narrowedBy: MOVE_NARROWINGS.mostCaptured,
    });
  });

  it("holds a capture under way in internationalDraughts to its one piece", () => {
    const game = position(
      RULE_VARIANTS.internationalDraughts,
      [
        { at: p(8, 1), stone: STONES.white },
        { at: p(7, 2), stone: STONES.black },
        { at: p(5, 4), stone: STONES.black },
        { at: p(6, 9), stone: STONES.white },
      ],
      STONES.white,
    );
    const midway = movePiece(game, p(8, 1), p(6, 3));
    expect(turnChoices(midway)).toEqual({
      kind: TURN_CHOICE_KINDS.move,
      pieces: [p(6, 3)],
      count: 1,
      narrowedBy: MOVE_NARROWINGS.capture,
    });
  });

  it("keeps russianDraughts to 'you must capture', since any capture may be chosen", () => {
    const game = position(
      RULE_VARIANTS.russianDraughts,
      [
        { at: p(5, 0), stone: STONES.white },
        { at: p(4, 1), stone: STONES.black },
        { at: p(7, 2), stone: STONES.white },
        { at: p(6, 3), stone: STONES.black },
        { at: p(4, 5), stone: STONES.black },
        { at: p(7, 6), stone: STONES.white },
      ],
      STONES.white,
    );
    const choices = turnChoices(game);
    expect(choices).toMatchObject({ kind: TURN_CHOICE_KINDS.move, count: 2, narrowedBy: MOVE_NARROWINGS.capture });
    expect(byPlace(choices?.kind === TURN_CHOICE_KINDS.move ? choices.pieces : [])).toEqual([p(5, 0), p(7, 2)]);
  });
});

describe("the points a placing turn may take", () => {
  it("counts reversi's single legal point, and its two", () => {
    const one = position(
      RULE_VARIANTS.reversi,
      [
        { at: p(0, 0), stone: STONES.black },
        { at: p(0, 1), stone: STONES.white },
      ],
      STONES.black,
    );
    expect(turnChoices(one)).toEqual({ kind: TURN_CHOICE_KINDS.place, points: [p(0, 2)], count: 1 });

    const two = position(
      RULE_VARIANTS.reversi,
      [
        { at: p(0, 0), stone: STONES.black },
        { at: p(0, 1), stone: STONES.white },
        { at: p(1, 0), stone: STONES.white },
      ],
      STONES.black,
    );
    expect(turnChoices(two)).toEqual({ kind: TURN_CHOICE_KINDS.place, points: [p(0, 2), p(2, 0)], count: 2 });
  });

  it("offers the whole board at the start of freestyle, narrowed by nothing", () => {
    const choices = turnChoices(createGame({ variant: RULE_VARIANTS.freestyle, size: 15 }));
    expect(choices).toMatchObject({ kind: TURN_CHOICE_KINDS.place, count: 225 });
  });

  it("has nothing to show once a game is over, or in go, where a pass is always on offer", () => {
    const finished = { ...createGame({ variant: RULE_VARIANTS.freestyle }), status: GAME_STATUS.won };
    expect(turnChoices(finished)).toBeNull();
    expect(turnChoices(createGame({ variant: RULE_VARIANTS.go, size: 9 }))).toBeNull();
  });
});
