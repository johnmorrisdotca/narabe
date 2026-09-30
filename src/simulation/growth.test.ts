import { describe, expect, it } from "vitest";

import { createGame, growBoard, isStone, legalPoints, playMove } from "../engine.ts";
import { replayMoves } from "../rules/record.ts";
import { GAME_STATUS } from "../constants.ts";
import { rng } from "./support.ts";

describe("games that grow mid-play", () => {
  /**
   * Growing rewrites every coordinate at once, which is exactly the kind of
   * change that quietly loses a stone or leaves the record pointing at the
   * wrong intersections. So these play on afterwards and replay the result.
   */
  it("keeps every stone, and stays playable, across a growth", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const random = rng(seed * 23);
      let state = createGame({ size: 9, allowResize: true }, random());

      // Play a while, then grow, then play on to the end.
      for (let move = 0; move < 12 && state.status === GAME_STATUS.playing; move += 1) {
        const legal = legalPoints(state);
        if (legal.length === 0) break;
        state = playMove(state, legal[Math.floor(random() * legal.length)]);
      }
      if (state.status !== GAME_STATUS.playing) continue;

      const before = state;
      const stonesBefore = before.board.filter(isStone).length;
      const grown = growBoard(before);

      expect(grown.settings.size, `seed ${seed}: did not grow`).toBe(13);
      expect(
        grown.board.filter(isStone).length,
        `seed ${seed}: stones went missing in the growth`,
      ).toBe(stonesBefore);
      expect(grown.moves).toHaveLength(before.moves.length);
      // The old state is untouched, as every engine transition must leave it.
      expect(before.settings.size).toBe(9);

      let final = grown;
      let guard = 0;
      while (final.status === GAME_STATUS.playing && guard < 13 * 13) {
        const legal = legalPoints(final);
        if (legal.length === 0) break;
        const point = legal[Math.floor(random() * legal.length)];
        const previous = final;
        final = playMove(final, point);
        expect(final, `seed ${seed}: a legal move was refused after growing`)
          .not.toBe(previous);
        guard += 1;
      }

      // The record still describes the position it produced.
      const replayed = replayMoves(
        createGame({ ...final.settings, firstPlayer: final.opener }),
        final.moves.map((move) => ({ row: move.row, col: move.col })),
        final.opening.choices,
      );
      expect(
        replayed[replayed.length - 1].board,
        `seed ${seed}: a grown game did not replay to the same board`,
      ).toEqual(final.board);
    }
  });

  it("cannot grow past the largest board", () => {
    const state = createGame({ size: 19, allowResize: true });
    expect(growBoard(state)).toBe(state);
  });
});

