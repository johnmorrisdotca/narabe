import type { Cell, Point, Stone } from "../types.ts";
import { cellAtPoint, indexOf, isOnBoard, stepFrom } from "./board.ts";

/**
 * Chinese Checkers: a hexagram (Star of David) board, one point of it
 * filled with each side's pieces at the start, racing to be first to fill
 * the point directly opposite. A move is a step to a neighbouring empty
 * cell, or a jump over an adjacent piece of either colour into the empty
 * cell straight beyond it, with a chain of jumps in the same move — exactly
 * Halma's mechanic (see `camps.ts`), translated from a square board's eight
 * directions onto a hex lattice's six. Nothing is ever captured.
 *
 * The board is embedded in a square Point{row,col} grid the way Hex's
 * rhombus is: the six directions below are axial hex-grid steps, and
 * `inStar` marks which cells of the square actually belong to the
 * hexagram. Every other cell is sealed off with the same `BLOCKED` obstacle
 * the drop games scatter at random — here laid down once, by shape, when
 * the game is created.
 */

/**
 * How many rows deep each of the star's six points is. The board's centre
 * hexagon has the same radius, and the standard 121-hole set is radius 4:
 * a 61-cell hexagon plus six 10-cell points.
 */
export const STAR_RADIUS = 4;

/** The side of the square array a star of this radius is embedded in. */
export function starSize(radius: number = STAR_RADIUS): number {
  return 4 * radius + 1;
}

/** Where the hexagram's own centre sits in the embedding array. */
function centreOf(radius: number): number {
  return radius * 2;
}

/**
 * Cube coordinates for `point`, centred on the board's own middle: the same
 * axial system `rules/hex.ts` reads its six neighbours from, x+y+z=0.
 */
function cubeOf(radius: number, point: Point): { x: number; y: number; z: number } {
  const x = point.col - centreOf(radius);
  const z = point.row - centreOf(radius);
  return { x, y: -(x + z), z };
}

/**
 * Whether `point` is one of the hexagram's playable cells.
 *
 * A hexagram of radius N is provably the union of two triangles of side 3N,
 * centred on the same point and each the other rotated 180°: {min(x,y,z) >=
 * -N} is one triangle, {max(x,y,z) <= N} the other, and their overlap —
 * where both hold — is exactly the centre hexagon of radius N. For N=4 that
 * union comes to 121 cells, ten to a point, which is the board this game is
 * always sold with.
 */
/**
 * How many cells the hexagram actually has: counted, not quoted. The figure
 * everybody knows is 121, and it is written in the comment above — but a
 * comment is not a board, and this is read by the copy that tells a player
 * what they are looking at.
 */
export function starCells(size: number): number {
  const radius = (size - 1) / 4;
  let cells = 0;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (inStar(radius, { row, col })) cells += 1;
    }
  }
  return cells;
}

export function inStar(radius: number, point: Point): boolean {
  const { x, y, z } = cubeOf(radius, point);
  return Math.min(x, y, z) >= -radius || Math.max(x, y, z) <= radius;
}

/** The six axial directions a hex lattice touches its neighbours along. */
const DIRECTIONS: readonly Point[] = [
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
];

/**
 * THE STAR'S SIX POINTS, clockwise from the top as the board is drawn. Each is
 * the ten cells where one cube coordinate runs past the centre hexagon's
 * radius: `top` is z < -R, and its opposite `bottom` is z > R; the other four
 * pair off the same way on x and y. The two-player game uses `top` (black) and
 * `bottom` (white); a game for three, four or six sits more players on the
 * others (`party/partyCheckers.ts`). Named for where they are drawn, since the
 * lattice's shear puts `upperRight` up and to the right, and so on round.
 */
export const STAR_TIPS = ["top", "upperRight", "lowerRight", "bottom", "lowerLeft", "upperLeft"] as const;
export type StarTip = (typeof STAR_TIPS)[number];

/** The point directly across the star: where a piece starting at `tip` is racing to. */
export function oppositeTip(tip: StarTip): StarTip {
  return STAR_TIPS[(STAR_TIPS.indexOf(tip) + 3) % STAR_TIPS.length];
}

/** Which of the six points a cell lies in, by its cube coordinates, or null in the centre hexagon. */
function tipOfCube(radius: number, cube: { x: number; y: number; z: number }): StarTip | null {
  if (cube.z < -radius) return "top";
  if (cube.z > radius) return "bottom";
  if (cube.x > radius) return "upperRight";
  if (cube.x < -radius) return "lowerLeft";
  if (cube.y < -radius) return "lowerRight";
  if (cube.y > radius) return "upperLeft";
  return null;
}

/*
 * Kept, like `farCampSquares`: a point's cells are a fact about the radius, and
 * `starCampOf` is asked once per cell every time a star board is drawn.
 */
const tipCells = new Map<string, Point[]>();

/**
 * Every cell of one of the star's six points, in reading order (row by row,
 * left to right) — the order the two camps have always been listed in, which
 * the tests and the bots' first moves read.
 */
export function starTipCells(radius: number, tip: StarTip): Point[] {
  const key = `${radius}|${tip}`;
  const known = tipCells.get(key);
  if (known !== undefined) return known;
  const size = starSize(radius);
  const points: Point[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const point = { row, col };
      if (inStar(radius, point) && tipOfCube(radius, cubeOf(radius, point)) === tip) points.push(point);
    }
  }
  tipCells.set(key, points);
  return points;
}

/** Which of the six points `point` lies in, or null in the centre hexagon or off the star. */
export function starTipOf(radius: number, point: Point): StarTip | null {
  return inStar(radius, point) ? tipOfCube(radius, cubeOf(radius, point)) : null;
}

/** The two-player game's camps: black's at the top, white's at the bottom. */
function pointCells(radius: number, side: "top" | "bottom"): Point[] {
  return starTipCells(radius, side);
}

/** Pieces a side has: the cells of one point, ten on the standard board. */
export function starCampSize(radius: number): number {
  return pointCells(radius, "top").length;
}

/**
 * The squares of a colour's home point: black starts at the top, white at
 * the bottom, the same "black starts near, white starts far" convention
 * `camps.ts` uses for Halma's corners.
 */
export function starCampSquares(radius: number, stone: Stone): Point[] {
  return pointCells(radius, stone === "black" ? "top" : "bottom");
}

/** Whose home point `point` lies in, or null outside both. */
export function starCampOf(radius: number, point: Point): Stone | null {
  const tip = starTipOf(radius, point);
  return tip === "top" ? "black" : tip === "bottom" ? "white" : null;
}

/** Every piece on the board when the game starts: each colour filling its own point. */
export function starStartingPieces(radius: number): { point: Point; stone: Stone }[] {
  return [
    ...starCampSquares(radius, "black").map((point) => ({ point, stone: "black" as const })),
    ...starCampSquares(radius, "white").map((point) => ({ point, stone: "white" as const })),
  ];
}

/**
 * Where a piece at `from` may go: any empty neighbouring cell along the six
 * hex directions, or the end of any chain of jumps over an adjacent piece of
 * either colour into the empty cell straight beyond it. Identical to
 * `campMoves`, six directions in place of eight; the hexagram's own shape is
 * enforced by the `BLOCKED` cells outside it, never checked here directly.
 */
export function starMoves(board: Cell[], size: number, from: Point): Point[] {
  const empty = (point: Point) => isOnBoard(size, point) && cellAtPoint(board, size, point) === null;
  const steps = DIRECTIONS.map((step) => stepFrom(from, step, 1)).filter(empty);

  const seen = new Set<number>([indexOf(size, from)]);
  const landings: Point[] = [];
  const queue: Point[] = [from];
  while (queue.length > 0) {
    const at = queue.shift() as Point;
    for (const step of DIRECTIONS) {
      const over = stepFrom(at, step, 1);
      const beyond = stepFrom(at, step, 2);
      if (!isOnBoard(size, over) || cellAtPoint(board, size, over) === null) continue;
      if (!empty(beyond)) continue;
      const key = indexOf(size, beyond);
      if (seen.has(key)) continue;
      seen.add(key);
      landings.push(beyond);
      queue.push(beyond);
    }
  }

  const stepKeys = new Set(steps.map((point) => indexOf(size, point)));
  return [...steps, ...landings.filter((point) => !stepKeys.has(indexOf(size, point)))];
}

/**
 * Whether `stone` has won: the far point — the other colour's home — is
 * full, and at least one piece in it is theirs. The same rule as Halma's
 * `campFilled`, read against a star point instead of a square corner.
 */
export function starFilled(board: Cell[], size: number, radius: number, stone: Stone): boolean {
  const far = starCampSquares(radius, stone === "black" ? "white" : "black");
  if (far.length === 0) return false;
  let own = 0;
  for (const point of far) {
    const cell = cellAtPoint(board, size, point);
    if (cell === null) return false;
    if (cell === stone) own += 1;
  }
  return own > 0;
}

/** How many of `stone`'s pieces stand in the far point. */
export function starPiecesHome(board: Cell[], size: number, radius: number, stone: Stone): number {
  const far = starCampSquares(radius, stone === "black" ? "white" : "black");
  return far.filter((point) => cellAtPoint(board, size, point) === stone).length;
}
