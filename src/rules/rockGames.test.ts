import { describe, expect, it } from "vitest";

import { createGame, isLegalMove, legalPoints, playMove } from "../engine.ts";
import { BLOCKED, GAME_STATUS, HOT, MOVE_KINDS, RULE_VARIANTS, STONES, VARIANT_SPECS } from "../constants.ts";
import type { GameState, Point, RuleVariant } from "../types.ts";
import { replayMoves, undoMove } from "./record.ts";
import { rockLayoutFor } from "./rocks.ts";
import { stonesPlayed } from "./rockfall.ts";

/**
 * The two rock games the obstacle playtest named: Scattered Rocks, whose
 * twelve rocks and two hotspots are there from the first move, and Rockfall,
 * whose twenty rocks and two hotspots fall after the eighth stone.
 */

const SIZE = 15;
const key = (point: Point) => `${point.row},${point.col}`;
const count = (state: GameState, cell: string) => state.board.filter((held) => held === cell).length;
const at = (state: GameState, point: Point) => state.board[point.row * SIZE + point.col];

/** Every point on the board that the layout does not use, in reading order. */
function clearPoints(state: GameState): Point[] {
  const layout = rockLayoutFor(state.settings)!;
  const used = new Set([...layout.dead, ...layout.hot].map(key));
  const points: Point[] = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) if (!used.has(key({ row, col }))) points.push({ row, col });
  }
  return points;
}

/** Plays the points in order, alternating colours, failing on any the engine refuses. */
function playAll(state: GameState, points: readonly Point[]): GameState {
  return points.reduce((current, point) => {
    const next = playMove(current, point);
    expect(next, `refused ${key(point)}`).not.toBe(current);
    return next;
  }, state);
}

/** Eight stones on clear points spread apart, so none of them makes a line. */
function eightApart(state: GameState): Point[] {
  const clear = clearPoints(state);
  const picked: Point[] = [];
  for (const point of clear) {
    if (picked.every((other) => Math.max(Math.abs(other.row - point.row), Math.abs(other.col - point.col)) >= 3)) picked.push(point);
    if (picked.length === 8) break;
  }
  return picked;
}

describe("the rock games read their rocks from the spec", () => {
  it.each([RULE_VARIANTS.scatteredRocks, RULE_VARIANTS.rockfall] as RuleVariant[])(
    "%s lays every rock and hotspot its spec asks for, on every board it is offered on",
    (variant) => {
      const spec = VARIANT_SPECS[variant];
      for (const size of spec.boardSizes ?? []) {
        for (let seed = 0; seed < 30; seed += 1) {
          const layout = rockLayoutFor(createGame({ variant, size, seed }).settings);
          expect(layout, `${variant} ${size} seed ${seed}`).not.toBeNull();
          expect(layout!.dead).toHaveLength(spec.deadSquares);
          expect(layout!.hot).toHaveLength(spec.hotSquares);
        }
      }
    },
  );
});

describe("Scattered Rocks", () => {
  const game = (seed = 11) => createGame({ variant: RULE_VARIANTS.scatteredRocks, size: SIZE, seed });

  it("starts with twelve rocks and two hotspots, and the centre open", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const state = game(seed);
      expect(count(state, BLOCKED)).toBe(12);
      expect(count(state, HOT)).toBe(2);
      expect(at(state, { row: 7, col: 7 })).toBeNull();
    }
  });

  it("puts them where the seed says, the same every time", () => {
    expect(game(42).board).toEqual(game(42).board);
    expect(game(42).board).not.toEqual(game(43).board);
  });

  it("offers no rock or hotspot as a move", () => {
    const state = game();
    const layout = rockLayoutFor(state.settings)!;
    for (const point of [...layout.dead, ...layout.hot]) expect(isLegalMove(state, point)).toBe(false);
    expect(legalPoints(state)).toHaveLength(SIZE * SIZE - 14);
  });

  it("counts a hotspot in a line of either colour", () => {
    // A seed whose first hotspot has four clear points in a row beside it; black plays those four.
    for (let seed = 1; seed < 200; seed += 1) {
      const state = game(seed);
      const hot = rockLayoutFor(state.settings)!.hot[0];
      const clear = new Set(clearPoints(state).map(key));
      const four = [1, 2, 3, 4].map((step) => ({ row: hot.row, col: hot.col - step }));
      if (!four.every((point) => point.col >= 0 && clear.has(key(point)))) continue;
      const whites = clearPoints(state).filter((point) => Math.abs(point.row - hot.row) >= 3 && point.col % 3 === 0).slice(0, 3);
      const won = playAll(state, [four[0], whites[0], four[1], whites[1], four[2], whites[2], four[3]]);
      expect(won.status).toBe(GAME_STATUS.won);
      expect(won.winner).toBe(STONES.black);
      expect(won.winningLine.map(key)).toContain(key(hot));
      return;
    }
    throw new Error("no seed under 200 put a hotspot beside four clear points");
  });
});

describe("Rockfall", () => {
  const game = (seed = 5) => createGame({ variant: RULE_VARIANTS.rockfall, size: SIZE, seed, allowUndo: true });

  it("starts on an open board", () => {
    const state = game();
    expect(count(state, BLOCKED)).toBe(0);
    expect(count(state, HOT)).toBe(0);
  });

  it("drops nothing before the eighth stone, and all of it with the eighth", () => {
    const state = game();
    const eight = eightApart(state);
    const seven = playAll(state, eight.slice(0, 7));
    expect(count(seven, BLOCKED)).toBe(0);
    expect(count(seven, HOT)).toBe(0);
    const fallen = playMove(seven, eight[7]);
    expect(stonesPlayed(fallen.moves)).toBe(8);
    expect(count(fallen, BLOCKED)).toBe(20);
    expect(count(fallen, HOT)).toBe(2);
    expect(fallen.status).toBe(GAME_STATUS.playing);
    // And nothing more falls after it.
    const ninth = clearPoints(fallen).find((point) => at(fallen, point) === null)!;
    expect(count(playMove(fallen, ninth), BLOCKED)).toBe(20);
  });

  it("never lands a rock on a stone: the stone stays and the rock is lost", () => {
    const state = game();
    const layout = rockLayoutFor(state.settings)!;
    const eight = eightApart(state);
    // The first stone goes where a rock would fall.
    const onRock = layout.dead[0];
    const moves = [onRock, ...eight.filter((point) => Math.max(Math.abs(point.row - onRock.row), Math.abs(point.col - onRock.col)) >= 3).slice(0, 7)];
    const fallen = playAll(state, moves);
    expect(at(fallen, onRock)).toBe(STONES.black);
    expect(count(fallen, BLOCKED)).toBe(19);
    for (const point of moves) expect([STONES.black, STONES.white]).toContain(at(fallen, point));
  });

  it("loses a hotspot that would finish a five by itself, so the fall decides nothing", () => {
    // A seed whose first hotspot has four clear points in a row beside it, then black's four there.
    for (let seed = 1; seed < 200; seed += 1) {
      const state = game(seed);
      const hot = rockLayoutFor(state.settings)!.hot[0];
      const clear = new Set(clearPoints(state).map(key));
      const four = [1, 2, 3, 4].map((step) => ({ row: hot.row, col: hot.col - step }));
      if (!four.every((point) => point.col >= 0 && clear.has(key(point)))) continue;
      const whites = clearPoints(state)
        .filter((point) => Math.abs(point.row - hot.row) >= 3 && point.row % 2 === 0 && point.col % 3 === 0)
        .slice(0, 4);
      const fallen = playAll(state, [four[0], whites[0], four[1], whites[1], four[2], whites[2], four[3], whites[3]]);
      expect(fallen.status).toBe(GAME_STATUS.playing);
      expect(at(fallen, hot)).toBeNull();
      expect(count(fallen, HOT)).toBe(1);
      // Black still has the five to make, with a stone of its own.
      const won = playMove(fallen, hot);
      expect(won.status).toBe(GAME_STATUS.won);
      expect(won.winner).toBe(STONES.black);
      return;
    }
    throw new Error("no seed under 200 put a hotspot beside four clear points");
  });

  it("counts stones, not passes or turns lost on time", () => {
    const stone = { row: 0, col: 0, stone: STONES.black, kind: MOVE_KINDS.place };
    const pass = { row: -1, col: -1, stone: STONES.white, kind: MOVE_KINDS.pass };
    const forfeit = { row: -1, col: -1, stone: STONES.white, kind: MOVE_KINDS.forfeit };
    expect(stonesPlayed([stone, pass, stone, forfeit, stone])).toBe(3);
  });

  it("lifts the rocks again when the eighth stone is undone", () => {
    const state = game();
    const eight = eightApart(state);
    const seven = playAll(state, eight.slice(0, 7));
    const fallen = playMove(seven, eight[7]);
    const undone = undoMove(fallen);
    expect(undone.board).toEqual(seven.board);
    // And played again, they fall in the same places.
    expect(playMove(undone, eight[7]).board).toEqual(fallen.board);
  });

  it("lands them in the same places when the record is replayed", () => {
    const state = game(77);
    const eight = eightApart(state);
    const fallen = playAll(state, eight);
    const timeline = replayMoves(createGame(state.settings), fallen.moves.map((move) => ({ row: move.row, col: move.col })));
    expect(timeline[timeline.length - 1].board).toEqual(fallen.board);
  });

  it("offers no fallen rock or hotspot as a move", () => {
    const state = game();
    const fallen = playAll(state, eightApart(state));
    const layout = rockLayoutFor(state.settings)!;
    for (const point of [...layout.dead, ...layout.hot]) expect(isLegalMove(fallen, point)).toBe(false);
  });
});
