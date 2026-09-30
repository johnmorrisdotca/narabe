import { describe, expect, it } from "vitest";

import { GAME_STATUS, RULE_VARIANTS } from "../constants.ts";
import type { RuleVariant } from "../types.ts";
import { playOut } from "./support.ts";

/**
 * The checkers family played to its RESULT, not to the shared sweep's cap.
 *
 * `simulation.test.ts` calls a game of moving pieces off after eighty turns,
 * which proves every move on the way was legal and says nothing about whether
 * the game ends or who can win it. The New Game Gate asks both: a game has to
 * end, and either side has to be able to win. So each game of the family is
 * played here, at random, move by move through the same by-hand checker, until
 * the rules finish it — a side left with no move, or one of the game's own
 * draws — with a cap far past any game seen, which a game reaching counts as a
 * failure rather than a pass.
 */

const GAMES = 24;
/** Turns, not jumps; far past the longest game measured, so reaching it is a fault. */
const CAP = 4000;

const FAMILY: RuleVariant[] = [
  RULE_VARIANTS.checkers,
  RULE_VARIANTS.internationalDraughts,
  RULE_VARIANTS.brazilianDraughts,
  RULE_VARIANTS.canadianCheckers,
  RULE_VARIANTS.russianDraughts,
  RULE_VARIANTS.poolCheckers,
];

describe("the checkers family, played to its end", () => {
  it.each(FAMILY)(
    "%s always ends, and either side can win it",
    (variant) => {
      const tally = { black: 0, white: 0, draw: 0, unfinished: 0 };
      const lengths: number[] = [];
      for (let game = 0; game < GAMES; game += 1) {
        const final = playOut({ variant }, 7919 * game + 101, CAP);
        lengths.push(final.moves.length);
        if (final.status === GAME_STATUS.playing) tally.unfinished += 1;
        else if (final.status === GAME_STATUS.draw) tally.draw += 1;
        else if (final.winner !== null) tally[final.winner] += 1;
      }
      lengths.sort((a, b) => a - b);
      console.log(
        `${variant}: ${GAMES} random games — black won ${tally.black}, white won ${tally.white}, ` +
          `drawn ${tally.draw}, unfinished ${tally.unfinished}; moves min ${lengths[0]}, ` +
          `median ${lengths[Math.floor(lengths.length / 2)]}, max ${lengths[lengths.length - 1]}`,
      );
      expect(tally.unfinished, `${variant}: a game ran to the cap without the rules ending it`).toBe(0);
      expect(tally.black, `${variant}: Black never won`).toBeGreaterThan(0);
      expect(tally.white, `${variant}: White never won`).toBeGreaterThan(0);
    },
    300_000,
  );
});
