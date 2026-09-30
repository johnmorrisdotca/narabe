import { describe, expect, it } from "vitest";
import { cellAt, playMove } from "../engine.ts";
import { undoMove } from "./record.ts";
import {
  GAME_STATUS,
  RULE_VARIANTS,
  STONES,
  WIN_REASONS,
} from "../constants.ts";
import { fromDiagram, show } from "../test-support.ts";
import type { Point } from "../types.ts";
import { capturesFrom } from "./captures.ts";

const p = (row: number, col: number): Point => ({ row, col });

const ninuki = { settings: { variant: RULE_VARIANTS.ninuki }, toPlay: STONES.black };

/** Two white stones between a black stone and the empty point 4,4. */
const FLANK = `
  . . . . . . . . .
  . . . . . . . . .
  . . . . . . . . .
  . . . . . . . . .
  . x o o . . . . .
  . . . . . . . . .
  . . . . . . . . .
  . . . . . . . . .
  . . . . . . . . .
`;

describe("capturesFrom", () => {
  it("takes a flanked pair", () => {
    const state = fromDiagram(FLANK, ninuki);
    expect(show(capturesFrom(state.board, state.settings, STONES.black, p(4, 4))))
      .toEqual(show([p(4, 2), p(4, 3)]));
  });

  it("takes nothing outside the capture variants", () => {
    const state = fromDiagram(FLANK, { toPlay: STONES.black });
    expect(capturesFrom(state.board, state.settings, STONES.black, p(4, 4))).toEqual([]);
  });

  it("does not take one stone or three", () => {
    const one = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . x o . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      ninuki,
    );
    expect(capturesFrom(one.board, one.settings, STONES.black, p(4, 4))).toEqual([]);

    const three = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        x o o o . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      ninuki,
    );
    expect(capturesFrom(three.board, three.settings, STONES.black, p(4, 4))).toEqual([]);
  });

  it("can take two pairs at once", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . x o o . o o x .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      ninuki,
    );
    expect(capturesFrom(state.board, state.settings, STONES.black, p(4, 4))).toHaveLength(4);
  });
});

describe("playing a capture", () => {
  it("lifts the pair and counts its stones", () => {
    const state = fromDiagram(FLANK, ninuki);
    const next = playMove(state, p(4, 4));

    expect(cellAt(next, p(4, 2))).toBeNull();
    expect(cellAt(next, p(4, 3))).toBeNull();
    expect(next.captures.black).toBe(2);
    expect(next.moves[next.moves.length - 1].captured).toHaveLength(2);
  });

  it("is safe to move into a flanked position", () => {
    // White plays between two black stones: nothing is captured.
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . x o . x . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      { settings: { variant: RULE_VARIANTS.ninuki }, toPlay: STONES.white },
    );
    const next = playMove(state, p(4, 3));
    expect(cellAt(next, p(4, 2))).toBe(STONES.white);
    expect(cellAt(next, p(4, 3))).toBe(STONES.white);
    expect(next.captures.black).toBe(0);
  });

  it("wins on the fifth pair, ten stones", () => {
    const state = fromDiagram(FLANK, ninuki);
    const nearly = { ...state, captures: { black: 8, white: 0 } };
    const next = playMove(nearly, p(4, 4));

    expect(next.status).toBe(GAME_STATUS.won);
    expect(next.winner).toBe(STONES.black);
    expect(next.winBy).toBe(WIN_REASONS.captures);
    expect(next.winningLine).toEqual([]);
  });

  it("undo puts the captured stones back", () => {
    const state = fromDiagram(FLANK, ninuki);
    const undone = undoMove(playMove(state, p(4, 4)));

    expect(cellAt(undone, p(4, 2))).toBe(STONES.white);
    expect(cellAt(undone, p(4, 3))).toBe(STONES.white);
    expect(cellAt(undone, p(4, 4))).toBeNull();
    expect(undone.captures.black).toBe(0);
  });
});
