import { describe, expect, it } from "vitest";

import { boardSizesFor, RULE_VARIANTS, RULE_VARIANT_LIST, STONES, VARIANT_SPECS } from "../constants.ts";
import { campSquares } from "./camps.ts";
import { STAR_RADIUS, starCampSquares } from "./chineseCheckers.ts";
import { farCampSquares, racesForCamp } from "./farCamp.ts";

describe("the camp a colour is filling", () => {
  it("is the star's far point on the star board, not the square table's nothing", () => {
    /*
     * The bug, twice over: the square camp table has rows for 8, 10 and 16
     * and none for the 17-wide star, so asking it for Chinese Checkers gave an
     * empty camp — every piece already home to the draw rule, and every piece
     * equally far from home to the computer player.
     */
    const size = boardSizesFor(RULE_VARIANTS.chineseCheckers)[0];
    expect(campSquares(size, STONES.white)).toEqual([]);
    expect(farCampSquares(size, STONES.black)).toEqual(starCampSquares(STAR_RADIUS, STONES.white));
    expect(farCampSquares(size, STONES.white)).toEqual(starCampSquares(STAR_RADIUS, STONES.black));
    expect(farCampSquares(size, STONES.black)).toHaveLength(10);
  });

  it("is the opposite corner on a square board", () => {
    const size = boardSizesFor(RULE_VARIANTS.halma)[0];
    expect(farCampSquares(size, STONES.black)).toEqual(campSquares(size, STONES.white));
    expect(farCampSquares(size, STONES.white)).toEqual(campSquares(size, STONES.black));
  });

  it("can be read on every board every race game is offered at", () => {
    /*
     * The guard the bot's race score never had. The draw rule has its own
     * version of this in noProgress.test.ts; this one asks on behalf of every
     * game whose spec says pieces race for a camp, so a new race board that
     * neither camp module knows fails here rather than being played blind.
     */
    for (const variant of RULE_VARIANT_LIST) {
      if (!racesForCamp(VARIANT_SPECS[variant])) continue;
      for (const size of boardSizesFor(variant)) {
        for (const stone of [STONES.black, STONES.white]) {
          expect(farCampSquares(size, stone).length, `${variant} on ${size}: ${stone} has no camp to race for`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("knows both race games and no other", () => {
    expect(racesForCamp(VARIANT_SPECS[RULE_VARIANTS.halma])).toBe(true);
    expect(racesForCamp(VARIANT_SPECS[RULE_VARIANTS.chineseCheckers])).toBe(true);
    expect(racesForCamp(VARIANT_SPECS[RULE_VARIANTS.checkers])).toBe(false);
    expect(racesForCamp(VARIANT_SPECS[RULE_VARIANTS.freestyle])).toBe(false);
  });

  it("answers nothing, not a guess, for a board it does not know", () => {
    expect(farCampSquares(9, STONES.black)).toEqual([]);
  });
});
