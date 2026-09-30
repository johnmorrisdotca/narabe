import type { Point } from "../types.ts";
import type { ROCK_PLACEMENTS } from "./rocks.constants.ts";

export type RockPlacement = (typeof ROCK_PLACEMENTS)[keyof typeof ROCK_PLACEMENTS];

/**
 * The rules of an obstacle game's furniture, as numbers to tune rather than
 * values baked into one variant.
 *
 * - `rocks`: dead points, where no stone lands and no line runs through.
 * - `hot`: hotspots, which count as either colour's stone.
 * - `placement`: how they are laid out (see `ROCK_PLACEMENTS`).
 * - `arriveAfter`: null for a board that starts with them; a number for a
 *   game where they fall onto the board once that many stones are down.
 */
export type RockRules = {
  rocks: number;
  hot: number;
  placement: RockPlacement;
  arriveAfter: number | null;
};

/** Where one game's rocks and hotspots are, all distinct. */
export type RockLayout = { dead: Point[]; hot: Point[] };

/**
 * How a named rock game lays its furniture: the placement and when it lands.
 * The counts are the spec's own `deadSquares` and `hotSquares`, so a game's
 * `RockRules` is those two with this beside them (`rockRulesOf`).
 */
export type RockSpec = Pick<RockRules, "placement" | "arriveAfter">;
