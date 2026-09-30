import { BLOCKED, HOT, LINE_RULES, VARIANT_SPECS, WORM, lineDirectionsFor } from "../constants.ts";
import { wormholeLinks } from "../obstacles.ts";
import type {
  Cell,
  GameSettings,
  LineRule,
  Point,
  Stone,
  WrapMode,
} from "../types.ts";
import {
  cellAtPoint,
  indexOf,
  isOnBoard,
  isStone,
  negate,
  stepFrom,
} from "./board.ts";
import { rulesFor } from "./handicap.ts";

/** The line rule that applies to `stone` under these settings. */
export function lineRuleFor(settings: GameSettings, stone: Stone): LineRule {
  return rulesFor(settings, stone).lineRule;
}

/** A contiguous run of one colour along a line, with the cells just past it. */
export type Run = {
  cells: Point[];
  /** The cell before the first stone and after the last; undefined off the board. */
  ends: [Cell | undefined, Cell | undefined];
};

/** A hotspot is every colour's stone at once. */
function joins(cell: Cell | undefined, stone: Stone): boolean {
  return cell === stone || cell === HOT;
}

/** How a line travels beyond plain steps: joined edges, and wormhole pairs. */
export type LineWorld = {
  wrap: WrapMode;
  /** Board index of each wormhole mouth to its partner. */
  links: ReadonlyMap<number, number>;
};

const PLAIN: LineWorld = { wrap: "none", links: new Map() };

function worldFor(world: WrapMode | LineWorld): LineWorld {
  return typeof world === "string" ? { wrap: world, links: PLAIN.links } : world;
}

/** Brings a step back onto the board across whichever edges this world joins. */
function rejoin(size: number, point: Point, wrap: WrapMode): Point {
  if (wrap === "none") return point;
  const fold = (n: number) => ((n % size) + size) % size;
  // Columns wrap on a cylinder and a torus; rows only on a torus.
  return {
    row: wrap === "both" ? fold(point.row) : point.row,
    col: fold(point.col),
  };
}

/**
 * One step along a line. On a cylinder the columns wrap, so a step off the
 * right edge arrives at the left; on a torus the rows wrap too, and a step off
 * the top arrives at the bottom. A step onto a wormhole mouth comes out of the
 * partner mouth and takes one more step, so the mouths themselves never count
 * as cells of a line.
 */
function advance(size: number, point: Point, step: Point, world: LineWorld, board?: Cell[]): Point {
  let next = rejoin(size, stepFrom(point, step, 1), world.wrap);
  if (board !== undefined && isOnBoard(size, next) && board[indexOf(size, next)] === WORM) {
    const partner = world.links.get(indexOf(size, next));
    if (partner !== undefined) {
      const out = { row: Math.floor(partner / size), col: partner % size };
      next = rejoin(size, stepFrom(out, step, 1), world.wrap);
    }
  }
  return next;
}

/**
 * Walks from `origin` in `step` increments while the stones match, returning
 * the points visited (excluding `origin`). On a wrapping board the walk is
 * capped at the board's width, or a full ring would never end.
 */
export function runFrom(
  board: Cell[],
  size: number,
  origin: Point,
  step: Point,
  stone: Stone,
  wrap: WrapMode | LineWorld = "none",
): Point[] {
  const world = worldFor(wrap);
  const run: Point[] = [];
  let next = advance(size, origin, step, world, board);
  while (isOnBoard(size, next) && joins(board[indexOf(size, next)], stone) && run.length < size - 1) {
    run.push(next);
    next = advance(size, next, step, world, board);
  }
  return run;
}

/** The whole run of `stone` through `point` along `step`, in line order. */
export function runThrough(
  board: Cell[],
  size: number,
  point: Point,
  step: Point,
  stone: Stone,
  wrap: WrapMode | LineWorld = "none",
): Run {
  const world = worldFor(wrap);
  const back = runFrom(board, size, point, negate(step), stone, world);
  const forward = runFrom(board, size, point, step, stone, world);
  const cells = [...back.reverse(), point, ...forward];
  return {
    cells,
    ends: [
      cellAtPoint(board, size, advance(size, cells[0], negate(step), world, board)),
      cellAtPoint(board, size, advance(size, cells[cells.length - 1], step, world, board)),
    ],
  };
}

/** The line world for these settings: wrapping and wormholes, from the seed. */
export function lineWorld(settings: GameSettings): LineWorld {
  const spec = VARIANT_SPECS[settings.variant];
  return {
    wrap: spec.wrap,
    links: spec.wormholes > 0 ? wormholeLinks(settings) : PLAIN.links,
  };
}

/**
 * Whether a run wins under `rule`. `ends` are the two cells just beyond the
 * run, which only the caro rule looks at: a five with an enemy stone (or an
 * obstacle) at both ends is shut in and does not count.
 */
export function runWins(
  rule: LineRule,
  run: Run,
  winLength: number,
  stone: Stone,
): boolean {
  const length = run.cells.length;
  switch (rule) {
    case LINE_RULES.atLeast:
      return length >= winLength;
    case LINE_RULES.exact:
      return length === winLength;
    case LINE_RULES.exactOpen:
      return (
        length === winLength &&
        !(blocks(run.ends[0], stone) && blocks(run.ends[1], stone))
      );
  }
}

/** A cell that shuts a line in: an enemy stone or an obstacle, never the edge. */
function blocks(cell: Cell | undefined, stone: Stone): boolean {
  if (cell === undefined || cell === null) return false;
  return cell === BLOCKED || cell !== stone;
}

/**
 * The winning line through `point`, if the stone there completes one under
 * the rule that applies to its colour. Only lines through the given point are
 * examined, which is all that can change after a single move. Returns an
 * empty array when there is no win.
 */
export function findWinningLine(
  board: Cell[],
  settings: GameSettings,
  point: Point,
): Point[] {
  const stone = board[indexOf(settings.size, point)];
  if (!isStone(stone)) return [];
  return winningLineFor(board, settings, point, stone);
}

/**
 * The winning line of `stone` through `point`, whatever sits at `point` — a
 * hotspot completes a line for either colour, so both are asked.
 */
export function winningLineFor(
  board: Cell[],
  settings: GameSettings,
  point: Point,
  stone: Stone,
): Point[] {
  if (!joins(board[indexOf(settings.size, point)], stone)) return [];
  const { lineRule, winLength } = rulesFor(settings, stone);
  const world = lineWorld(settings);
  const directions = lineDirectionsFor(VARIANT_SPECS[settings.variant].hexagon);

  for (const step of directions) {
    const run = runThrough(board, settings.size, point, step, stone, world);
    if (runWins(lineRule, run, winLength, stone)) return run.cells;
  }
  return [];
}
