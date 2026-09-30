import { STONES } from "../constants.ts";
import type { Point, Stone } from "../types.ts";

/**
 * A HEXAGON OF HEXAGONS, embedded in a square Point grid.
 *
 * The same trick Hex's rhombus and Chinese Checkers' star use: a hexagon
 * lattice is a square grid with every row slid half a cell along, so a cell's
 * six neighbours are its four orthogonal ones and the two diagonals along the
 * slant — `{row: -1, col: 1}` and `{row: 1, col: -1}`, never the other pair.
 * Everything here reads cube coordinates centred on the board's own middle,
 * x + y + z = 0, which is the natural system for "how far from the centre is
 * this cell" on such a lattice.
 *
 * A hexagon of radius R is the cells with max(|x|, |y|, |z|) <= R: 3R² + 3R + 1
 * of them — 37, 61, 91 and 127 at the four radii this game is played at. It
 * sits in a (2R + 1)-square, and the corners of that square are the cells the
 * hexagon does not reach, which `emptyBoard` seals off as BLOCKED so no rule
 * ever has to ask.
 */

/** The six lattice directions, the same six `rules/hex.ts` reads its neighbours from. */
export const HEX_DIRECTIONS: readonly Point[] = [
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
];

/** The radius of the hexagon a square of this side embeds. */
export function hexagonRadius(size: number): number {
  return Math.floor(size / 2);
}

/**
 * How many cells the hexagon has: 3R² + 3R + 1. Worked out rather than looked
 * up, because the game is played at four radii and a table of four numbers is
 * a table that will be wrong the day a fifth board is offered.
 */
export function hexagonCells(size: number): number {
  const radius = hexagonRadius(size);
  return 3 * radius * radius + 3 * radius + 1;
}

/**
 * How many cells lie along one of the hexagon's six sides, corners counted:
 * R + 1. This is the number a player would give if you asked how big the
 * board is — "six a side" — the way Hex's eleven is said.
 */
export function hexagonSide(size: number): number {
  return hexagonRadius(size) + 1;
}

/**
 * The cells a game is actually played on: every cell but the sealed centre.
 *
 * ALWAYS EVEN, at every radius, and that is the reason the centre is sealed
 * rather than a taste for symmetry: 3R² + 3R is even for every R, so a game
 * decided by counting discs can always be drawn or won outright and never
 * hangs on the one cell nobody could reach.
 */
export function honeycombPlayable(size: number): number {
  return hexagonCells(size) - 1;
}

/** The board's own middle: the cell every distance is measured from. */
export function hexagonCentre(size: number): Point {
  const middle = hexagonRadius(size);
  return { row: middle, col: middle };
}

function cubeOf(size: number, point: Point): { x: number; y: number; z: number } {
  const centre = hexagonCentre(size);
  const x = point.col - centre.col;
  const z = point.row - centre.row;
  return { x, y: -(x + z), z };
}

/** How many lattice steps from the centre. */
export function hexagonDistance(size: number, point: Point): number {
  const { x, y, z } = cubeOf(size, point);
  return Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
}

/** Whether `point` is one of the hexagon's cells at all. */
export function inHexagon(size: number, point: Point): boolean {
  return hexagonDistance(size, point) <= hexagonRadius(size);
}

/**
 * THE CENTRE IS SEALED. ItsYourTurn's Hexversi plays this way, and it is what
 * makes the game work rather than a nod to its source: with the centre open
 * the six starting discs would surround one empty cell that every first move
 * would fight over, and the board's whole symmetry would collapse onto it.
 * Sealed, the centre is a wall the six starting discs lean against, and the
 * count of playable cells comes out even — 60 or 90 — which a game decided by
 * counting wants.
 */
export function hexagonSealed(size: number, point: Point): boolean {
  const centre = hexagonCentre(size);
  return point.row === centre.row && point.col === centre.col;
}

/**
 * The six cells round the sealed centre, alternating colour round the ring:
 * three of each, no two of a colour side by side. Black at the top, going
 * round clockwise, so a board always starts the same way up.
 */
export function honeycombStartingDiscs(size: number): { point: Point; stone: Stone }[] {
  const centre = hexagonCentre(size);
  // Round the ring in lattice order: up, up-right, right, down, down-left, left.
  const ring: readonly Point[] = [
    { row: -1, col: 0 },
    { row: -1, col: 1 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: -1 },
    { row: 0, col: -1 },
  ];
  return ring.map((step, index) => ({
    point: { row: centre.row + step.row, col: centre.col + step.col },
    stone: index % 2 === 0 ? STONES.black : STONES.white,
  }));
}

/**
 * The six corners of the hexagon: the cells at full radius along each of the
 * six directions. A corner in a flipping game can never be turned once taken,
 * on this board exactly as on the square one — no run passes through the end
 * of the board — so the computer weighs them as it weighs Othello's four.
 */
export function hexagonCorners(size: number): Point[] {
  const centre = hexagonCentre(size);
  const radius = hexagonRadius(size);
  return HEX_DIRECTIONS.map((step) => ({ row: centre.row + step.row * radius, col: centre.col + step.col * radius }));
}
