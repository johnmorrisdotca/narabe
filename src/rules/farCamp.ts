import { STAR_RADIUS, starCampSquares, starSize } from "./chineseCheckers.ts";
import { campSquares } from "./camps.ts";
import type { Point, Stone, VariantSpec } from "../types.ts";

/**
 * Whether this game is a race to fill the camp opposite: Halma on its square
 * board, or Chinese Checkers on the star.
 *
 * Two flags in the spec, one question — and the question was being asked with
 * one flag in the computer player, so it scored Chinese Checkers as a game
 * with no camps at all, fell through to the capture count, and found every
 * move worth exactly nothing. Anything that wants to know "do the pieces here
 * race home" asks this, not `spec.camps`.
 */
export function racesForCamp(spec: VariantSpec): boolean {
  return spec.camps || spec.chineseCheckers;
}

/**
 * The camp a colour is trying to fill, in whichever geometry its game uses.
 *
 * Halma lays its camps out in the corners of a square board; Chinese Checkers
 * lays them at the points of a star, from a different module, on a board size
 * the square one has never heard of. Asking the wrong one is not an error you
 * see — it answers with an empty camp.
 *
 * IN ONE PLACE, because the same mistake was made twice. The no-progress rule
 * asked the square table for the star and read every piece as already home,
 * which was found and fixed. The computer player's race score asked the same
 * table and read every piece as equally far from home — so every grade played
 * Chinese Checkers blind, wandered for a thousand plies, and was called off by
 * the very rule that had been fixed. Twelve bot games across every grade never
 * got more than two of ten pieces home, and the note beside the fix concluded
 * the GAME might be unwinnable. The game was fine; the player could not see
 * the camp. Two callers, one table: the second cannot drift from the first.
 *
 * Empty for a board with no camps either module knows, never a guess. A
 * caller that gets nothing back has no reading, and must say so rather than
 * invent a distance.
 */
/*
 * Kept, because this is asked for every piece, four times a ply, for as long
 * as a game runs, and on every node of the bot's search — and it builds a
 * fresh array of points every time it is asked. On a 17×17 star that was
 * forty array builds a ply and several hundred thousand short-lived points
 * over a game, which made the bot's "finish a game of anything" test three
 * times slower and timed it out in CI at 45s against a 30s budget. Local runs
 * never saw it: 9s there, and the margin hid it.
 *
 * A camp is a fact about a board size and a colour. It cannot change while
 * the process lives, the key space is a handful of sizes times two, and the
 * array is only ever read. So it is worked out once and kept.
 */
const farCamps = new Map<string, Point[]>();

export function farCampSquares(size: number, stone: Stone): Point[] {
  const key = `${size}|${stone}`;
  const known = farCamps.get(key);
  if (known !== undefined) return known;
  const other: Stone = stone === "black" ? "white" : "black";
  const camp = size === starSize(STAR_RADIUS) ? starCampSquares(STAR_RADIUS, other) : campSquares(size, other);
  farCamps.set(key, camp);
  return camp;
}
