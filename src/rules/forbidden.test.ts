import { describe, expect, it } from "vitest";
import { forbiddenPoints, isLegalMove, playMove } from "../engine.ts";
import {
  FORBIDDEN_PATTERNS,
  GAME_STATUS,
  RULE_VARIANTS,
  STONES,
} from "../constants.ts";
import { fromDiagram, show, type DiagramOptions } from "../test-support.ts";
import type { Point, Stone } from "../types.ts";
import { forbiddenAt } from "./forbidden.ts";

const p = (row: number, col: number): Point => ({ row, col });

type Position = DiagramOptions & { toPlay: Stone };
const renju: Position = { settings: { variant: RULE_VARIANTS.renju }, toPlay: STONES.black };
const omok: Position = { settings: { variant: RULE_VARIANTS.omok }, toPlay: STONES.black };

function verdict(diagram: string, point: Point, options: Position = renju) {
  const state = fromDiagram(diagram, options);
  return forbiddenAt(state.board, state.settings, options.toPlay, point);
}

describe("renju: overline", () => {
  it("forbids black a sixth stone in a row", () => {
    const six = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . x x . x x x . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    expect(verdict(six, p(4, 3))).toBe(FORBIDDEN_PATTERNS.overline);
  });

  it("lets white make an overline, and it wins", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . o o . o o o . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      { settings: { variant: RULE_VARIANTS.renju }, toPlay: STONES.white },
    );
    expect(forbiddenAt(state.board, state.settings, STONES.white, p(4, 3))).toBeNull();
    const next = playMove(state, p(4, 3));
    expect(next.status).toBe(GAME_STATUS.won);
    expect(next.winner).toBe(STONES.white);
  });

  it("does not let black win with an overline", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . x x . x x x . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      renju,
    );
    expect(isLegalMove(state, p(4, 3))).toBe(false);
    expect(playMove(state, p(4, 3))).toBe(state);
  });
});

describe("renju: double four", () => {
  it("forbids two fours on different lines", () => {
    // Playing 4,4 makes a four along the row and a four down the column.
    const cross = `
      . . . . . . . . .
      . . . . x . . . .
      . . . . x . . . .
      . . . . x . . . .
      . x x x . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    expect(verdict(cross, p(4, 4))).toBe(FORBIDDEN_PATTERNS.doubleFour);
  });

  it("forbids two fours on the same line", () => {
    // Playing 4,4 makes x x . x x . x x: either gap completes a separate five.
    const line = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      x x . x . . x x .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    expect(verdict(line, p(4, 4))).toBe(FORBIDDEN_PATTERNS.doubleFour);
  });

  it("counts a straight four as one four, not two", () => {
    const three = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . x x x . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    expect(verdict(three, p(4, 5))).toBeNull();
  });

  it("lets a five through even when it also makes a four", () => {
    const fourAndFour = `
      . . . . . . . . .
      . . . . x . . . .
      . . . . x . . . .
      . . . . x . . . .
      x x x x . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    expect(verdict(fourAndFour, p(4, 4))).toBeNull();
    const state = fromDiagram(fourAndFour, renju);
    expect(playMove(state, p(4, 4)).winner).toBe(STONES.black);
  });
});

describe("renju: double three", () => {
  const cross = `
    . . . . . . . . .
    . . . . . . . . .
    . . . . x . . . .
    . . . . x . . . .
    . . x x . . . . .
    . . . . . . . . .
    . . . . . . . . .
    . . . . . . . . .
    . . . . . . . . .
  `;

  it("forbids black two open threes at once", () => {
    expect(verdict(cross, p(4, 4))).toBe(FORBIDDEN_PATTERNS.doubleThree);
  });

  it("is not a double three when one line is shut in", () => {
    const shut = `
      . . . . . . . . .
      . . . . o . . . .
      . . . . x . . . .
      . . . . x . . . .
      . . x x . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    // The column can only become a four with one open end, so it is not a three.
    expect(verdict(shut, p(4, 4))).toBeNull();
  });

  it("allows white the same shape", () => {
    const state = fromDiagram(cross.replaceAll("x", "o"), {
      settings: { variant: RULE_VARIANTS.renju },
      toPlay: STONES.white,
    });
    expect(forbiddenAt(state.board, state.settings, STONES.white, p(4, 4))).toBeNull();
  });

  it("allows a four-three", () => {
    const fourThree = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . x . . . .
      . . . . x . . . .
      . x x x . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    expect(verdict(fourThree, p(4, 4))).toBeNull();
  });

  it("does not count a three whose straight-four point is itself forbidden", () => {
    /*
     * Playing 4,4 makes an open three down column 4 and, along row 4, the
     * shape o . x x x . . . . — which is a three only if 4,5 may be played,
     * since the white stone shuts the other side. In the control position
     * 4,5 is fine and the move is a double three. In the decoy, column 5
     * carries black stones above and below 4,5, so playing there would make
     * an overline: 4,5 is forbidden, the row is not a three, and the move is
     * allowed.
     */
    const control = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . x x . . .
      . . . . x x . . .
      o . x x . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    const decoy = `
      . . . . . . . . .
      . . . . . x . . .
      . . . . x x . . .
      . . . . x x . . .
      o . x x . . . . .
      . . . . . x . . .
      . . . . . x . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    expect(verdict(control, p(4, 4))).toBe(FORBIDDEN_PATTERNS.doubleThree);
    expect(verdict(decoy, p(4, 5))).toBe(FORBIDDEN_PATTERNS.overline);
    expect(verdict(decoy, p(4, 4))).toBeNull();
  });
});

describe("omok", () => {
  it("forbids the double three for both colours", () => {
    const cross = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . o . . . .
      . . . . o . . . .
      . . o o . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    const state = fromDiagram(cross, {
      settings: { variant: RULE_VARIANTS.omok },
      toPlay: STONES.white,
    });
    expect(forbiddenAt(state.board, state.settings, STONES.white, p(4, 4))).toBe(
      FORBIDDEN_PATTERNS.doubleThree,
    );
  });

  it("allows the double four and wins with an overline", () => {
    const line = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      x x . x . x . x x
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    expect(verdict(line, p(4, 4), omok)).toBeNull();

    const six = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . x x . x x x . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      omok,
    );
    expect(playMove(six, p(4, 3)).winner).toBe(STONES.black);
  });
});

describe("forbiddenPoints", () => {
  it("lists every point the colour to move may not play", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . x . . . .
        . . . . x . . . .
        . . x x . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      renju,
    );
    expect(show(forbiddenPoints(state))).toEqual(show([p(4, 4)]));
  });

  it("is empty for colours and variants without restrictions", () => {
    const freestyle = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . x . . . .
        . . . . x . . . .
        . . x x . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      { toPlay: STONES.black },
    );
    expect(forbiddenPoints(freestyle)).toEqual([]);
  });
});
