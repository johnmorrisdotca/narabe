import { CAPTURE_CHOICES, CROWN_MID_CAPTURE, STONES } from "../constants.ts";
import type { CheckersRules, Point, Stone } from "../types.ts";
import { otherStone } from "./board.ts";
import type { CaptureGround, Jump } from "./checkers.types.ts";

/**
 * How a piece of the checkers family takes, for every game of the family: a man
 * jumping an adjacent piece, forward or both ways; a king doing the same, or
 * flying the length of a diagonal to take a piece at any distance and land on
 * any empty square beyond it; and how many pieces a sequence of those can take
 * from where a piece stands.
 *
 * Which of these a game uses is its `CheckersRules`, never its name.
 *
 * CAPTURED PIECES BLOCK UNTIL THE CAPTURE IS OVER. Every draughts code this
 * family follows lifts the taken pieces only once the whole sequence has been
 * played, so a piece already jumped may be neither jumped again nor passed
 * over nor landed on. The engine lifts each piece as its jump is made, so a
 * chain can be played one jump at a time; `CaptureGround.taken` is what keeps
 * the squares standing as the obstacles they still are. For a piece that jumps
 * one square at a time it changes nothing — its landings are never the squares
 * it jumps, and a square with nothing on it is not a piece to take — so the
 * English game plays exactly as it did before this rule was written down.
 */

export const DIAGONALS: readonly Point[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
];

/** A man's forward diagonals: black sets out from row 0, white from the far side. */
export function forwardDiagonals(stone: Stone): readonly Point[] {
  return DIAGONALS.filter((step) => (stone === STONES.black ? step.row === 1 : step.row === -1));
}

/** The row a man of `stone` is crowned on reaching. */
export function farRow(size: number, stone: Stone): number {
  return stone === STONES.black ? size - 1 : 0;
}

/** What stands on a square, as a capture sees it: empty, a piece of a colour, or something in the way. */
function standing(ground: CaptureGround, row: number, col: number): Stone | "empty" | "wall" {
  const { board, size, lifted, taken } = ground;
  if (row < 0 || col < 0 || row >= size || col >= size) return "wall";
  const index = row * size + col;
  if (taken.has(index)) return "wall";
  if (index === lifted) return "empty";
  const cell = board[index];
  if (cell === null) return "empty";
  return cell === STONES.black || cell === STONES.white ? cell : "wall";
}

/** The diagonals a piece may take along: all four for a king, and for a man where its game allows. */
function captureDiagonals(stone: Stone, king: boolean, rules: CheckersRules): readonly Point[] {
  return king || rules.menCaptureBackward ? DIAGONALS : forwardDiagonals(stone);
}

/**
 * Every single jump open to a piece of `stone` standing at `at`.
 *
 * A short jump takes the adjacent piece and lands on the square straight
 * beyond. A flying king looks along each diagonal past any number of empty
 * squares for the first piece in the way: if it is the other colour's, every
 * empty square beyond it, up to the next thing in the way, is a landing.
 */
export function jumpsFrom(
  ground: CaptureGround,
  at: Point,
  stone: Stone,
  king: boolean,
  rules: CheckersRules,
): Jump[] {
  const enemy = otherStone(stone);
  const flying = king && rules.flyingKings;
  const jumps: Jump[] = [];
  for (const step of captureDiagonals(stone, king, rules)) {
    let distance = 1;
    if (flying) {
      while (standing(ground, at.row + step.row * distance, at.col + step.col * distance) === "empty") distance += 1;
    }
    const over = { row: at.row + step.row * distance, col: at.col + step.col * distance };
    if (standing(ground, over.row, over.col) !== enemy) continue;
    for (let beyond = distance + 1; ; beyond += 1) {
      const to = { row: at.row + step.row * beyond, col: at.col + step.col * beyond };
      if (standing(ground, to.row, to.col) !== "empty") break;
      jumps.push({ to, captured: over });
      // A short jump has exactly one landing: the square straight beyond.
      if (!flying) break;
    }
  }
  return jumps;
}

/**
 * Whether a man landing on `to` is crowned there and must stop, may carry on as
 * a king, or carries on as the man it still is.
 */
export function afterLanding(
  size: number,
  to: Point,
  stone: Stone,
  king: boolean,
  rules: CheckersRules,
): { stops: boolean; king: boolean } {
  const reachesCrown = !king && to.row === farRow(size, stone);
  if (!reachesCrown) return { stops: false, king };
  if (rules.crownMidCapture === CROWN_MID_CAPTURE.stops) return { stops: true, king: true };
  if (rules.crownMidCapture === CROWN_MID_CAPTURE.continues) return { stops: false, king: true };
  return { stops: false, king: false };
}

/**
 * The most further pieces a capture can take from `at`, where the piece has
 * just landed carrying `king`, with `ground.taken` already jumped.
 *
 * Memoised on where the piece stands, whether it is a king and which pieces are
 * taken, since those three decide everything that can follow — how it got there
 * does not. Without that, two routes to the same square with the same pieces
 * taken would each be explored in full, and a flying king in an open middle
 * game can reach one position by a great many routes.
 */
function furthest(
  ground: CaptureGround,
  at: Point,
  stone: Stone,
  king: boolean,
  rules: CheckersRules,
  memo: Map<string, number>,
): number {
  const key = `${at.row * ground.size + at.col}:${king ? 1 : 0}:${[...ground.taken].sort((a, b) => a - b).join(",")}`;
  const known = memo.get(key);
  if (known !== undefined) return known;
  let best = 0;
  for (const jump of jumpsFrom(ground, at, stone, king, rules)) {
    best = Math.max(best, jumpWorth(ground, jump, stone, king, rules, memo));
  }
  memo.set(key, best);
  return best;
}

/** How many pieces a sequence beginning with `jump` takes at most, this jump included. */
function jumpWorth(
  ground: CaptureGround,
  jump: Jump,
  stone: Stone,
  king: boolean,
  rules: CheckersRules,
  memo: Map<string, number>,
): number {
  const landed = afterLanding(ground.size, jump.to, stone, king, rules);
  if (landed.stops) return 1;
  const index = jump.captured.row * ground.size + jump.captured.col;
  ground.taken.add(index);
  const rest = furthest(ground, jump.to, stone, landed.king, rules, memo);
  ground.taken.delete(index);
  return 1 + rest;
}

/**
 * The jumps a piece at `at` may actually make, each with how many pieces the
 * best sequence it begins can take.
 *
 * Two rules narrow the raw jumps, and both come from the same principle — a
 * capture, once begun, is played to its end:
 *
 * - A flying king that takes a piece and could land on several squares must
 *   land on one from which it can take again, if any of them allows it. Stopping
 *   early by choosing where to land is stopping early. A short jump has one
 *   landing, so this never touches it.
 * - Where the game takes the maximum, only the jumps that begin the longest
 *   sequence are left — and that is decided across the whole board by the
 *   caller, since the piece that takes most may not be this one.
 */
export function weighedJumps(
  ground: CaptureGround,
  at: Point,
  stone: Stone,
  king: boolean,
  rules: CheckersRules,
): { jump: Jump; worth: number }[] {
  const memo = new Map<string, number>();
  const weighed = jumpsFrom(ground, at, stone, king, rules).map((jump) => ({
    jump,
    worth: jumpWorth(ground, jump, stone, king, rules, memo),
  }));
  return weighed.filter(
    (one) =>
      one.worth > 1 ||
      !weighed.some(
        (other) =>
          other.worth > 1 &&
          other.jump.captured.row === one.jump.captured.row &&
          other.jump.captured.col === one.jump.captured.col,
      ),
  );
}

/** Whether the game narrows a choice of captures to the ones taking the most. */
export function takesMaximum(rules: CheckersRules): boolean {
  return rules.captureChoice === CAPTURE_CHOICES.maximum;
}
