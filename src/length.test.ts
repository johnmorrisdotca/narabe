import { describe, expect, it } from "vitest";

import { endsOnItsOwn, longestPossibleGame, noBoundReason } from "./length.ts";
import { DEFAULT_SETTINGS, RULE_VARIANT_LIST, VARIANT_SPECS } from "./constants.ts";
import type { GameSettings } from "./types.ts";

/**
 * How long a game can get, checked against what the games actually did.
 *
 * The numbers quoted here are measurements, not guesses: every variant was
 * played out from forty seeds at each board size it offers, and the sliding
 * games were then driven to sixty thousand moves to find out whether they end
 * at all. They do not.
 */
function at(variant: (typeof RULE_VARIANT_LIST)[number], size: number): GameSettings {
  return { ...DEFAULT_SETTINGS, variant, size, drawLimit: "none" };
}

describe("how long a game can get", () => {
  it("bounds a placement game by the points on its board", () => {
    // Measured: Caro reached the full 225 on 15×15, Hex the full 361 on 19×19.
    expect(longestPossibleGame(at("freestyle", 15))).toBe(225);
    expect(longestPossibleGame(at("hex", 19))).toBe(361);
    expect(longestPossibleGame(at("tictactoe", 3))).toBe(9);
  });

  it("does not count points nobody could ever play on", () => {
    // An obstacle is not a move somebody might make, so it is not in the bound.
    const clear = longestPossibleGame(at("freestyle", 15)) ?? 0;
    const blocked = longestPossibleGame({ ...at("obstacleFive", 15), obstacles: "hoshi" }) ?? 0;
    expect(blocked).toBeLessThan(clear);
  });

  it("gives no bound to a game whose pieces move", () => {
    /*
     * The finding this whole thing was for. A slide neither fills a point nor
     * empties one, and there is no repetition rule to stop it: Halma and
     * Chinese Checkers were still playing after sixty thousand random moves,
     * at every size and every seed tried.
     */
    for (const [variant, size] of [["halma", 16], ["halma", 8], ["chineseCheckers", 17]] as const) {
      expect(longestPossibleGame(at(variant, size)), variant).toBeNull();
      expect(noBoundReason(at(variant, size)), variant).toBe("pieces-move");
    }
  });

  it("counts checkers among them, though it converges in practice", () => {
    /*
     * It finished in 48, 49 and 108 moves when played randomly, because a
     * capture removes a piece and none is ever added. But the rules do not
     * force that — two kings can shuffle for ever — and this says what the
     * rules guarantee, not what random play tends to do.
     */
    expect(longestPossibleGame(at("checkers", 8))).toBeNull();
    expect(noBoundReason(at("checkers", 8))).toBe("pieces-move");
  });

  it("gives no bound to a game that gives points back", () => {
    // Sannuki ran 97 moves on 81 points; Go ran 321 on 81 and 444 on 361.
    expect(longestPossibleGame(at("sannuki", 9))).toBeNull();
    expect(noBoundReason(at("sannuki", 9))).toBe("captures");
    expect(noBoundReason(at("go", 9))).toBe("captures");
    // Clearing a full row does the same thing wholesale.
    expect(noBoundReason(at("clearDrop", 7))).toBe("line-clear");
  });

  it("answers for every variant, and reads the spec rather than a list of names", () => {
    /*
     * A game added tomorrow is classified the day it lands. The check is that
     * the two halves agree: a variant with a reason has no bound, and one
     * without a reason has a real number.
     */
    for (const variant of RULE_VARIANT_LIST) {
      const sizes = VARIANT_SPECS[variant].boardSizes ?? [DEFAULT_SETTINGS.size];
      const settings = at(variant, sizes[0]);
      const bound = longestPossibleGame(settings);
      if (noBoundReason(settings) === null) {
        expect(bound, `${variant} should be bounded by its board`).toBeGreaterThan(0);
        expect(endsOnItsOwn(settings), variant).toBe(true);
      } else {
        expect(bound, `${variant} should have no bound`).toBeNull();
        expect(endsOnItsOwn(settings), variant).toBe(false);
      }
    }
  });
});
