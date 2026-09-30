import { describe, expect, it } from "vitest";

import { BLOCKED, HOT, STONES } from "../constants.ts";
import type { Cell, Point } from "../types.ts";
import { ROCK_PLACEMENTS } from "./rocks.constants.ts";
import { landRocks, rockLayout } from "./rocks.ts";
import type { RockRules } from "./rocks.types.ts";

const key = (point: Point) => `${point.row},${point.col}`;
const rules = (over: Partial<RockRules>): RockRules => ({
  rocks: 0,
  hot: 0,
  placement: ROCK_PLACEMENTS.scattered,
  arriveAfter: null,
  ...over,
});

describe("rockLayout, scattered", () => {
  it("lays exactly what the rules ask for, all distinct and never on the centre", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const layout = rockLayout(rules({ rocks: 12, hot: 2 }), 15, seed);
      expect(layout).not.toBeNull();
      const all = [...layout!.dead, ...layout!.hot];
      expect(layout!.dead).toHaveLength(12);
      expect(layout!.hot).toHaveLength(2);
      expect(new Set(all.map(key)).size).toBe(14);
      expect(all.map(key)).not.toContain("7,7");
    }
  });

  it("lands in the same places for the same seed, so a replay sees the same board", () => {
    expect(rockLayout(rules({ rocks: 6, hot: 2 }), 15, 42)).toEqual(rockLayout(rules({ rocks: 6, hot: 2 }), 15, 42));
    expect(rockLayout(rules({ rocks: 6, hot: 2 }), 15, 42)).not.toEqual(rockLayout(rules({ rocks: 6, hot: 2 }), 15, 43));
  });

  it("refuses more furniture than the board has room for", () => {
    expect(rockLayout(rules({ rocks: 9 }), 3, 1)).toBeNull();
    expect(rockLayout(rules({ rocks: 8 }), 3, 1)).not.toBeNull();
  });
});

describe("rockLayout, the garden", () => {
  const turn = (point: Point, size: number): Point => ({ row: point.col, col: size - 1 - point.row });

  it("looks the same from all four sides", () => {
    for (const size of [9, 15, 19]) {
      for (let seed = 0; seed < 20; seed += 1) {
        const layout = rockLayout(rules({ rocks: 8, hot: 2, placement: ROCK_PLACEMENTS.garden }), size, seed)!;
        const dead = new Set(layout.dead.map(key));
        expect(dead.size).toBe(8);
        for (const point of layout.dead) expect(dead.has(key(turn(point, size)))).toBe(true);
        // The hotspots pair across the centre, and sit on no rock.
        const [a, b] = layout.hot;
        expect(key(turn(turn(a, size), size))).toBe(key(b));
        for (const point of layout.hot) expect(dead.has(key(point))).toBe(false);
      }
    }
  });

  it("refuses rocks that do not divide by four and hotspots that do not pair", () => {
    expect(rockLayout(rules({ rocks: 6, placement: ROCK_PLACEMENTS.garden }), 15, 1)).toBeNull();
    expect(rockLayout(rules({ rocks: 4, hot: 1, placement: ROCK_PLACEMENTS.garden }), 15, 1)).toBeNull();
  });
});

describe("landRocks", () => {
  it("puts furniture on the empty points and leaves a stone where a rock falls on one", () => {
    const board: Cell[] = new Array<Cell>(9).fill(null);
    board[0] = STONES.black;
    const landed = landRocks(board, 3, { dead: [{ row: 0, col: 0 }, { row: 1, col: 1 }], hot: [{ row: 2, col: 2 }] });
    expect(landed[0]).toBe(STONES.black);
    expect(landed[4]).toBe(BLOCKED);
    expect(landed[8]).toBe(HOT);
    // A new board; the one given is untouched.
    expect(board[4]).toBeNull();
  });
});
