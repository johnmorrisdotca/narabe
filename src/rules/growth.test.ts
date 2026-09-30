import { describe, expect, it } from "vitest";

import {
  canGrowBoard,
  canShrinkBoard,
  growBoard,
  growthOffset,
  nextBoardSize,
  previousBoardSize,
  shrinkBoard,
} from "./growth.ts";
import { cellAt, createGame, playMove } from "../engine.ts";
import { STONES } from "../constants.ts";
import { tengen } from "../obstacles.ts";
import type { GameState, Point } from "../types.ts";

const p = (row: number, col: number): Point => ({ row, col });

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

describe("nextBoardSize", () => {
  it("steps up through the sizes the game offers", () => {
    expect(nextBoardSize(9)).toBe(13);
    expect(nextBoardSize(13)).toBe(15);
    expect(nextBoardSize(15)).toBe(19);
  });

  it("stops at the largest board", () => {
    expect(nextBoardSize(19)).toBeNull();
  });
});

describe("growthOffset", () => {
  it("centres the old board exactly, because both sizes are odd", () => {
    expect(growthOffset(9, 13)).toBe(2);
    expect(growthOffset(13, 15)).toBe(1);
    expect(growthOffset(15, 19)).toBe(2);
  });
});

describe("canGrowBoard", () => {
  it("is off unless the game allows it", () => {
    expect(canGrowBoard(createGame({ size: 9 }))).toBe(false);
  });

  it("is available on a game that allows it", () => {
    expect(canGrowBoard(createGame({ size: 9, allowResize: true }))).toBe(true);
  });

  it("is unavailable on the largest board", () => {
    expect(canGrowBoard(createGame({ size: 19, allowResize: true }))).toBe(false);
  });

  it("is unavailable once the game is over", () => {
    const won = play(createGame({ size: 9, allowResize: true }), [
      p(4, 0), p(0, 0), p(4, 1), p(0, 1),
      p(4, 2), p(0, 2), p(4, 3), p(0, 3), p(4, 4),
    ]);
    expect(won.winner).toBe(STONES.black);
    expect(canGrowBoard(won)).toBe(false);
    expect(growBoard(won)).toBe(won);
  });
});

describe("growBoard", () => {
  const started = () =>
    play(createGame({ size: 9, allowResize: true }), [p(4, 4), p(3, 3)]);

  it("moves to the next size up", () => {
    const grown = growBoard(started());

    expect(grown.settings.size).toBe(13);
    expect(grown.board).toHaveLength(13 * 13);
  });

  it("keeps every stone where it was relative to the others", () => {
    const before = started();
    const grown = growBoard(before);
    const offset = growthOffset(9, 13);

    expect(cellAt(grown, p(4 + offset, 4 + offset))).toBe(STONES.black);
    expect(cellAt(grown, p(3 + offset, 3 + offset))).toBe(STONES.white);
    // Two stones before, two stones after: nothing was dropped or invented.
    expect(grown.board.filter((cell) => cell !== null && cell !== "blocked"))
      .toHaveLength(2);
  });

  it("keeps the centre stone on the centre", () => {
    const centred = playMove(
      createGame({ size: 9, allowResize: true }),
      tengen(9),
    );
    const grown = growBoard(centred);

    expect(cellAt(grown, tengen(13))).toBe(STONES.black);
  });

  it("moves the record with the stones, so it still replays", () => {
    const grown = growBoard(started());
    const offset = growthOffset(9, 13);

    expect(grown.moves[0]).toMatchObject({ row: 4 + offset, col: 4 + offset });
    expect(grown.moves[1]).toMatchObject({ row: 3 + offset, col: 3 + offset });

    const replayed = grown.moves.reduce(
      (state, move) => playMove(state, { row: move.row, col: move.col }),
      createGame({ ...grown.settings, firstPlayer: grown.opener }),
    );
    expect(replayed.board).toEqual(grown.board);
  });

  it("leaves the turn where it was, so the record still replays", () => {
    // A growth places no stone, so nothing in the move list records it. If it
    // changed whose turn it was, a replay would alternate colours differently
    // from the game that was played.
    const before = started();
    expect(growBoard(before).toPlay).toBe(before.toPlay);
  });

  it("is not offered on a board with obstacles, which would not replay", () => {
    const withObstacles = createGame({
      size: 9,
      allowResize: true,
      obstacles: "hoshi",
    });
    expect(canGrowBoard(withObstacles)).toBe(false);
    expect(growBoard(withObstacles)).toBe(withObstacles);
  });

  it("leaves the previous state untouched", () => {
    const before = started();
    growBoard(before);

    expect(before.settings.size).toBe(9);
    expect(before.board).toHaveLength(81);
  });

  it("can be played on afterwards", () => {
    const before = started();
    const grown = playMove(growBoard(before), p(0, 0));
    expect(cellAt(grown, p(0, 0))).toBe(before.toPlay);
  });
});

describe("previousBoardSize", () => {
  it("steps down through the sizes the game offers", () => {
    expect(previousBoardSize(19)).toBe(15);
    expect(previousBoardSize(13)).toBe(9);
  });

  it("stops at the smallest board", () => {
    expect(previousBoardSize(9)).toBeNull();
  });
});

describe("canShrinkBoard", () => {
  const roomy = () =>
    play(createGame({ size: 13, allowResize: true }), [p(6, 6), p(6, 7)]);

  it("is off unless the game allows it", () => {
    expect(canShrinkBoard(createGame({ size: 13 }))).toBe(false);
  });

  it("is available when the outer ring is unused", () => {
    expect(canShrinkBoard(roomy())).toBe(true);
  });

  it("is unavailable on the smallest board", () => {
    expect(canShrinkBoard(createGame({ size: 9, allowResize: true }))).toBe(false);
  });

  it("refuses when a stone stands in the ring that would go", () => {
    // (1,1) is inside the two-deep margin a 13 to 9 step removes.
    const edged = play(createGame({ size: 13, allowResize: true }), [
      p(1, 1), p(6, 6),
    ]);
    expect(canShrinkBoard(edged)).toBe(false);
    expect(shrinkBoard(edged)).toBe(edged);
  });

  /**
   * The case that makes this about the record rather than the board: a stone
   * that has been captured is gone from the board, but the move that placed
   * it is still in the list and would replay outside the smaller board.
   */
  it("refuses when only a captured stone's move is left in the ring", () => {
    const state = play(createGame({ size: 13, allowResize: true }), [
      p(6, 6), p(6, 7),
    ]);
    const withGhost: typeof state = {
      ...state,
      // The board is untouched; only the record remembers the outer ring.
      moves: [...state.moves, { row: 1, col: 1, stone: "black", kind: "place" }],
    };

    expect(withGhost.board[1 * 13 + 1]).toBeNull();
    expect(canShrinkBoard(withGhost)).toBe(false);
  });

  /** And the same for a piece that slid inwards, whose `from` is out there. */
  it("refuses when a slide came from the ring that would go", () => {
    const state = play(createGame({ size: 13, allowResize: true }), [
      p(6, 6), p(6, 7),
    ]);
    const slid: typeof state = {
      ...state,
      moves: [
        ...state.moves,
        { row: 6, col: 5, stone: "black", kind: "place", from: { row: 0, col: 0 } },
      ],
    };

    expect(canShrinkBoard(slid)).toBe(false);
  });
});

describe("shrinkBoard", () => {
  const roomy = () =>
    play(createGame({ size: 13, allowResize: true }), [p(6, 6), p(6, 7)]);

  it("steps down to the next size, keeping every stone", () => {
    const shrunk = shrinkBoard(roomy());

    expect(shrunk.settings.size).toBe(9);
    expect(shrunk.board).toHaveLength(81);
    expect(shrunk.board.filter((cell) => cell !== null)).toHaveLength(2);
  });

  it("keeps the centre stone on the centre", () => {
    const shrunk = shrinkBoard(roomy());
    expect(cellAt(shrunk, tengen(9))).toBe(STONES.black);
  });

  it("leaves the turn where it was, so the record still replays", () => {
    const before = roomy();
    expect(shrinkBoard(before).toPlay).toBe(before.toPlay);
  });

  it("moves the record with the stones, so it still replays", () => {
    const shrunk = shrinkBoard(roomy());
    const replayed = shrunk.moves.reduce(
      (state, move) => playMove(state, { row: move.row, col: move.col }),
      createGame({ ...shrunk.settings, firstPlayer: shrunk.opener }),
    );

    expect(replayed.board).toEqual(shrunk.board);
  });

  it("is the exact inverse of growing", () => {
    const before = roomy();
    expect(shrinkBoard(growBoard(before)).board).toEqual(before.board);
    expect(shrinkBoard(growBoard(before)).settings.size).toBe(13);
  });

  it("leaves the previous state untouched", () => {
    const before = roomy();
    shrinkBoard(before);
    expect(before.settings.size).toBe(13);
  });
});
