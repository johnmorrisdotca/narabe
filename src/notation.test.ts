import { describe, expect, it } from "vitest";

import { createGame, movePiece } from "./engine.ts";
import { STONES } from "./constants.ts";
import type { GameState } from "./types.ts";
import { capturePaths, columnLetter, pointName, rowNumber, slideWord } from "./notation.ts";

describe("notation", () => {
  it("skips the letter I", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(7)).toBe("H");
    expect(columnLetter(8)).toBe("J");
  });

  it("numbers rows from the bottom", () => {
    expect(rowNumber(15, 14)).toBe(1);
    expect(rowNumber(15, 0)).toBe(15);
  });

  it("names the centre of a 15×15 board H8", () => {
    expect(pointName(15, { row: 7, col: 7 })).toBe("H8");
  });
});

describe("a draughts capture, as the records write it", () => {
  const p = (row: number, col: number) => ({ row, col });

  it("writes a slide with an arrow, a capture with a colon, and a multi-jump as every square it landed on", () => {
    expect(slideWord(["G3", "H4"], false)).toBe("G3→H4");
    expect(slideWord(["G5", "E3"], true)).toBe("G5:E3");
    expect(slideWord(["G5", "E3", "C1"], true)).toBe("G5:E3:C1");
  });

  it("follows the engine through a double jump: the second hop reads the whole chain", () => {
    // Black at (2,1), white at (3,2) and (5,4): a jump to (4,3), then on to (6,5), as the checkers tests set it.
    const size = 8;
    const board = new Array(size * size).fill(null);
    board[2 * size + 1] = STONES.black;
    board[3 * size + 2] = STONES.white;
    board[5 * size + 4] = STONES.white;
    let game: GameState = { ...createGame({ variant: "checkers" }), board, toPlay: STONES.black };
    game = movePiece(game, p(2, 1), p(4, 3));
    game = movePiece(game, p(4, 3), p(6, 5));
    expect(capturePaths(game.moves)).toEqual([
      [p(2, 1), p(4, 3)],
      [p(2, 1), p(4, 3), p(6, 5)],
    ]);
  });

  it("marks nothing for a slide, a placed stone, or a hop that does not start where the last one landed", () => {
    expect(capturePaths([{ kind: "move", row: 3, col: 0, from: p(2, 1) }])).toEqual([null]);
    expect(capturePaths([{ kind: "place", row: 3, col: 0, captured: [p(1, 1)] }])).toEqual([null]);
    const apart = capturePaths([
      { kind: "move", row: 4, col: 3, from: p(2, 1), captured: [p(3, 2)] },
      { kind: "move", row: 6, col: 1, from: p(4, 7), captured: [p(5, 6)], continuedChain: true },
    ]);
    expect(apart[1]).toEqual([p(4, 7), p(6, 1)]);
  });
});
