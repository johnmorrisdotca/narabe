import { describe, expect, it } from "vitest";
import { createGame } from "../engine.ts";
import { STONES } from "../constants.ts";
import { fromDiagram, show } from "../test-support.ts";
import type { Cell, Point } from "../types.ts";
import { dropTarget, landingPoints } from "./drop.ts";
import { countStones, pieceDestinations, squareThrough } from "./pieces.ts";
import { findAllWins, quadrantOrigin, rotateQuadrant } from "./twist.ts";

const p = (row: number, col: number): Point => ({ row, col });

describe("drops", () => {
  const board = fromDiagram(`
    . . . . .
    . . . . .
    . . o . .
    . x x . .
    o x o . x
  `).board;

  it("lands on the lowest empty cell of the column", () => {
    expect(dropTarget(board, 5, 0)).toEqual(p(3, 0));
    expect(dropTarget(board, 5, 2)).toEqual(p(1, 2));
    expect(dropTarget(board, 5, 3)).toEqual(p(4, 3));
  });

  it("refuses a full column and a column off the board", () => {
    const full: Cell[] = board.slice();
    for (let row = 0; row < 5; row += 1) full[row * 5 + 1] = STONES.black;
    expect(dropTarget(full, 5, 1)).toBeNull();
    expect(dropTarget(board, 5, 5)).toBeNull();
  });

  it("offers exactly one landing cell per column with room", () => {
    expect(show(landingPoints(board, 5))).toEqual(
      show([p(3, 0), p(2, 1), p(1, 2), p(4, 3), p(3, 4)]),
    );
  });
});

describe("quadrant rotation", () => {
  const board = fromDiagram(`
    x o . . . .
    . . . . . .
    . . . . . .
    . . . . . .
    . . . . . .
    . . . . . .
  `).board;

  it("numbers quadrants row-major from the top left", () => {
    expect(quadrantOrigin(6, 3, 0)).toEqual(p(0, 0));
    expect(quadrantOrigin(6, 3, 1)).toEqual(p(0, 3));
    expect(quadrantOrigin(6, 3, 2)).toEqual(p(3, 0));
    expect(quadrantOrigin(6, 3, 3)).toEqual(p(3, 3));
  });

  it("turns a quadrant clockwise and leaves the rest alone", () => {
    const turned = rotateQuadrant(board, 6, 3, 0, true);
    // Top-left corner goes to top-right of the quadrant; its neighbour follows.
    expect(turned[0 * 6 + 2]).toBe(STONES.black);
    expect(turned[1 * 6 + 2]).toBe(STONES.white);
    expect(turned[0]).toBeNull();
    expect(turned.filter((cell) => cell !== null)).toHaveLength(2);
  });

  it("turns back anticlockwise", () => {
    const there = rotateQuadrant(board, 6, 3, 0, true);
    expect(rotateQuadrant(there, 6, 3, 0, false)).toEqual(board);
  });

  it("does not touch another quadrant's stones", () => {
    const turned = rotateQuadrant(board, 6, 3, 3, true);
    expect(turned).toEqual(board);
  });

  it("finds a line anywhere on the board, for either colour", () => {
    const settings = createGame({ size: 6, winLength: 5 }).settings;
    const both = fromDiagram(`
      x x x x x .
      . . . . . .
      . . . . . .
      o o o o o .
      . . . . . .
      . . . . . .
    `).board;
    const wins = findAllWins(both, settings);
    expect(wins.black).toHaveLength(5);
    expect(wins.white).toHaveLength(5);
    expect(findAllWins(board, settings)).toEqual({ black: [], white: [] });
  });
});

describe("pieces", () => {
  const board = fromDiagram(`
    . . . . .
    . x x . .
    . x . . .
    . . . . o
    . . . . .
  `).board;

  it("steps to any adjacent empty point", () => {
    expect(show(pieceDestinations(board, 5, p(2, 1)))).toEqual(
      show([p(1, 0), p(2, 0), p(3, 0), p(3, 1), p(3, 2), p(2, 2)]),
    );
  });

  it("is hemmed in by the edge", () => {
    expect(pieceDestinations(board, 5, p(3, 4))).toHaveLength(5);
  });

  it("counts pieces and sees a square", () => {
    expect(countStones(board, STONES.black)).toBe(3);
    expect(squareThrough(board, 5, p(2, 2), STONES.black)).toEqual([]);
    const squared = board.slice();
    squared[2 * 5 + 2] = STONES.black;
    expect(show(squareThrough(squared, 5, p(2, 2), STONES.black))).toEqual(
      show([p(1, 1), p(1, 2), p(2, 1), p(2, 2)]),
    );
  });
});
