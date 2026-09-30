import { DIRECTIONS, FORBIDDEN_PATTERNS } from "../constants.ts";
import type {
  Cell,
  ForbiddenPattern,
  GameSettings,
  GameState,
  Point,
  Stone,
} from "../types.ts";
import {
  cellAtPoint,
  indexOf,
  isOnBoard,
  pointOf,
  samePoint,
  stepFrom,
  withStone,
} from "./board.ts";
import { rulesFor } from "./handicap.ts";
import { findWinningLine, runThrough, runWins } from "./lines.ts";

/**
 * Forbidden moves, as renju and omok define them.
 *
 * The definitions need reading ahead. A *four* is a line one stone short of a
 * winning five. A *three* is a line one stone short of a straight four — four
 * in a row with both ends open and both ends able to complete a five — and,
 * critically, the stone that would make that straight four must itself be an
 * allowed move. So deciding whether a three is a three means asking whether
 * another point is forbidden, which asks the same question again one stone
 * deeper. The recursion is bounded by `MAX_DEPTH`; past it a point is assumed
 * allowed, which errs towards forbidding.
 *
 * A five wins outright, forbidden shapes or not, so that is checked first.
 */

/** How far the three-of-a-three recursion goes before assuming a point is allowed. */
const MAX_DEPTH = 6;

/**
 * Why `stone` may not play `point`, or null when it may. Only the patterns the
 * variant forbids that colour are looked for, so this is cheap outside renju
 * and omok.
 */
export function forbiddenAt(
  board: Cell[],
  settings: GameSettings,
  stone: Stone,
  point: Point,
  depth = 0,
): ForbiddenPattern | null {
  const { forbidden: patterns, winLength } = rulesFor(settings, stone);
  if (patterns.length === 0) return null;

  const { size } = settings;
  if (!isOnBoard(size, point) || board[indexOf(size, point)] !== null) return null;
  if (!nearOwnStone(board, settings, stone, point)) return null;

  const after = withStone(board, size, point, stone);
  if (findWinningLine(after, settings, point).length > 0) return null;

  if (patterns.includes(FORBIDDEN_PATTERNS.overline)) {
    for (const step of DIRECTIONS) {
      if (runThrough(after, size, point, step, stone).cells.length > winLength) {
        return FORBIDDEN_PATTERNS.overline;
      }
    }
  }

  if (patterns.includes(FORBIDDEN_PATTERNS.doubleFour)) {
    let fours = 0;
    for (const step of DIRECTIONS) {
      fours += foursAlong(after, settings, stone, point, step);
      if (fours >= 2) return FORBIDDEN_PATTERNS.doubleFour;
    }
  }

  if (patterns.includes(FORBIDDEN_PATTERNS.doubleThree)) {
    let threes = 0;
    for (const step of DIRECTIONS) {
      if (threeAlong(after, settings, stone, point, step, depth)) threes += 1;
      if (threes >= 2) return FORBIDDEN_PATTERNS.doubleThree;
    }
  }

  return null;
}

/**
 * Every shape here needs another friendly stone within reach along one of the
 * four lines, so a point with none nearby can be passed over without reading.
 */
function nearOwnStone(
  board: Cell[],
  settings: GameSettings,
  stone: Stone,
  point: Point,
): boolean {
  const reach = rulesFor(settings, stone).winLength - 1;
  for (const step of DIRECTIONS) {
    for (let k = -reach; k <= reach; k += 1) {
      if (k === 0) continue;
      if (cellAtPoint(board, settings.size, stepFrom(point, step, k)) === stone) {
        return true;
      }
    }
  }
  return false;
}

/**
 * How many fours the stone at `point` has along `step`: the distinct empty
 * cells on that line where one more stone completes a five *through this
 * stone*. A straight four — four in a row open at both ends — has two such
 * cells but is one four, not two, so it is counted once.
 */
function foursAlong(
  board: Cell[],
  settings: GameSettings,
  stone: Stone,
  point: Point,
  step: Point,
): number {
  const { size } = settings;
  const { lineRule: rule, winLength } = rulesFor(settings, stone);
  const completions: Point[] = [];

  for (let k = -(winLength - 1); k <= winLength - 1; k += 1) {
    if (k === 0) continue;
    const q = stepFrom(point, step, k);
    if (cellAtPoint(board, size, q) !== null) continue;

    const run = runThrough(withStone(board, size, q, stone), size, q, step, stone);
    if (!run.cells.some((cell) => samePoint(cell, point))) continue;
    if (runWins(rule, run, winLength, stone)) completions.push(q);
  }

  if (completions.length === 2) {
    const own = runThrough(board, size, point, step, stone);
    const first = own.cells[0];
    const last = own.cells[own.cells.length - 1];
    const straight =
      own.cells.length === winLength - 1 &&
      completions.every(
        (q) =>
          samePoint(q, stepFrom(first, step, -1)) || samePoint(q, stepFrom(last, step, 1)),
      );
    if (straight) return 1;
  }
  return completions.length;
}

/**
 * Whether the stone at `point` is part of a three along `step`: some allowed
 * empty cell on the line would turn it into a straight four through this
 * stone. "Straight" means exactly `winLength - 1` in a row with both ends
 * empty and both ends completing a five for this colour.
 */
function threeAlong(
  board: Cell[],
  settings: GameSettings,
  stone: Stone,
  point: Point,
  step: Point,
  depth: number,
): boolean {
  const { size } = settings;
  const { lineRule: rule, winLength } = rulesFor(settings, stone);

  for (let k = -(winLength - 2); k <= winLength - 2; k += 1) {
    if (k === 0) continue;
    const q = stepFrom(point, step, k);
    if (cellAtPoint(board, size, q) !== null) continue;

    const test = withStone(board, size, q, stone);
    const run = runThrough(test, size, q, step, stone);
    if (run.cells.length !== winLength - 1) continue;
    if (!run.cells.some((cell) => samePoint(cell, point))) continue;
    if (run.ends[0] !== null || run.ends[1] !== null) continue;

    const ends = [
      stepFrom(run.cells[0], step, -1),
      stepFrom(run.cells[run.cells.length - 1], step, 1),
    ];
    const straight = ends.every((end) =>
      runWins(
        rule,
        runThrough(withStone(test, size, end, stone), size, end, step, stone),
        winLength,
        stone,
      ),
    );
    if (!straight) continue;

    // The stone that makes the straight four must itself be a legal move.
    if (depth < MAX_DEPTH && forbiddenAt(board, settings, stone, q, depth + 1) !== null) {
      continue;
    }
    return true;
  }
  return false;
}

/** Every empty point the colour to move is forbidden from playing right now. */
export function forbiddenPoints(state: GameState): Point[] {
  const { settings, toPlay, board } = state;
  if (rulesFor(settings, toPlay).forbidden.length === 0) return [];

  const points: Point[] = [];
  board.forEach((cell, index) => {
    if (cell !== null) return;
    const point = pointOf(settings.size, index);
    if (forbiddenAt(board, settings, toPlay, point) !== null) points.push(point);
  });
  return points;
}
