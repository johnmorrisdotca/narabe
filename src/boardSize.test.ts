import { describe, expect, it } from "vitest";

import { BOARD_SIZES, RULE_VARIANT_LIST, VARIANT_SPECS, sizeForVariant } from "./constants.ts";
import { createGame } from "./engine.ts";

/**
 * A game is played on a board it has.
 *
 * The engine has always known this — `normaliseSettings` snaps a size the
 * variant does not offer as it builds the state — but nothing said it at the
 * point a size is written down. A Reversi game could be stored at 19×19, shown
 * as 19×19 on its page and in its record, and played on the 8×8 board Reversi
 * actually has. These pin the two halves together.
 */
describe("sizeForVariant", () => {
  it("gives a game with a board of its own that board", () => {
    // Reversi is 8×8 and nothing else. This is the case John found.
    expect(sizeForVariant("reversi", 19)).toBe(8);
    expect(sizeForVariant("reversi", 8)).toBe(8);
    expect(sizeForVariant("grandReversi", 15)).toBe(10);
  });

  it("leaves a game that takes any board alone", () => {
    expect(VARIANT_SPECS.freestyle.boardSizes).toBeNull();
    for (const size of BOARD_SIZES) expect(sizeForVariant("freestyle", size)).toBe(size);
  });

  it("keeps a size the variant does offer, even when it is not the first", () => {
    // Hex is 11, 13 or 19: asking for 19 must not be snapped back to 11.
    expect(sizeForVariant("hex", 19)).toBe(19);
    expect(sizeForVariant("hex", 13)).toBe(13);
  });

  it("answers with a board it has, for every variant that declares its own", () => {
    /*
     * Only for the variants with a board of their own. A variant that declares
     * none takes the board it is given — that is what declaring none means —
     * so there is nothing here to snap it to.
     */
    for (const variant of RULE_VARIANT_LIST) {
      const own = VARIANT_SPECS[variant].boardSizes;
      if (own === null) continue;
      for (const asked of [...BOARD_SIZES, 3, 4, 7, 100]) {
        expect(own).toContain(sizeForVariant(variant, asked));
      }
    }
  });

  it("agrees with the board the engine actually builds", () => {
    // The whole point: what gets written down is what gets played.
    for (const variant of RULE_VARIANT_LIST) {
      const asked = 19;
      const state = createGame({ variant, size: asked });
      expect(state.settings.size).toBe(sizeForVariant(variant, asked));
    }
  });
});
