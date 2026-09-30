import { ENGLISH_CHECKERS_RULES, MOVE_NARROWINGS, VARIANT_SPECS } from "../constants.ts";
import type { Cell, CheckersRules, GameSettings, GameState, MoveNarrowing, Point, Stone } from "../types.ts";
import { indexOf, isOnBoard, otherStone, samePoint } from "./board.ts";
import {
  DIAGONALS,
  afterLanding,
  farRow,
  forwardDiagonals,
  jumpsFrom,
  takesMaximum,
  weighedJumps,
} from "./checkersCaptures.ts";
import type { CaptureGround, CheckersMoveResult, Jump } from "./checkers.types.ts";

export type { CheckersMoveResult } from "./checkers.types.ts";

/**
 * The checkers family: pieces stand on the board from the start and move
 * diagonally. Capturing is a jump over an enemy piece into an empty square
 * beyond it, and it is forced — a colour with any capture available may not
 * play a plain step instead. A piece that captures and can capture again from
 * where it lands keeps going in the same move. A colour with no legal move,
 * whether it has no pieces left or every one is shut in, has lost.
 *
 * What differs between the games of the family — how many rows of men, whether
 * a man takes backward, whether a king flies, whether the longest capture must
 * be chosen, and what crowning does to a capture under way — is the game's
 * `CheckersRules`, read from its spec. The functions that take a board rather
 * than a game default to the English rules, which is what they did before the
 * family had more than one game in it.
 */

/** Checkers is played on one colour of square only: the board's own dark squares. */
export function isDarkSquare(point: Point): boolean {
  return (point.row + point.col) % 2 === 1;
}

/**
 * The rules this game of the family is played by.
 *
 * Throws for a game outside the family rather than answering with a default:
 * a caller asking this of Gomoku is a fault, and English rules handed back
 * would play a game nobody chose.
 */
export function checkersRulesFor(settings: GameSettings): CheckersRules {
  const rules = VARIANT_SPECS[settings.variant].checkersRules;
  if (rules === null) throw new Error(`${settings.variant} is not a game of the checkers family`);
  return rules;
}

/** Every piece on the board when the game starts: `rows` rows of dark squares, each side. */
export function checkersStartingPieces(
  size: number,
  rows: number = ENGLISH_CHECKERS_RULES.menRows,
): { point: Point; stone: Stone }[] {
  const pieces: { point: Point; stone: Stone }[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const point = { row, col };
      if (!isDarkSquare(point)) continue;
      if (row < rows) pieces.push({ point, stone: "black" });
      else if (row >= size - rows) pieces.push({ point, stone: "white" });
    }
  }
  return pieces;
}

/** Whether the piece at `at`, if any, is a king. */
export function isKingAt(kings: readonly Point[], at: Point): boolean {
  return kings.some((point) => samePoint(point, at));
}

/**
 * Where a piece at `from` may step with no capture: an empty diagonal neighbour
 * forward for a man; for a king, an empty neighbour either way, or — where kings
 * fly — any empty square along an open diagonal.
 */
export function checkersSteps(
  board: Cell[],
  size: number,
  from: Point,
  stone: Stone,
  isKing: boolean,
  rules: CheckersRules = ENGLISH_CHECKERS_RULES,
): Point[] {
  const flying = isKing && rules.flyingKings;
  const points: Point[] = [];
  for (const step of isKing ? DIAGONALS : forwardDiagonals(stone)) {
    for (let distance = 1; ; distance += 1) {
      const point = { row: from.row + step.row * distance, col: from.col + step.col * distance };
      if (!isOnBoard(size, point) || board[indexOf(size, point)] !== null) break;
      points.push(point);
      if (!flying) break;
    }
  }
  return points;
}

/** The ground a piece standing at `at` captures from, with nothing yet taken. */
function groundAt(board: readonly Cell[], size: number, at: Point): CaptureGround {
  return { board, size, lifted: indexOf(size, at), taken: new Set<number>() };
}

/** The jumps a piece at `from` may make: the enemy piece taken, and where the jump lands. */
export function checkersCaptures(
  board: Cell[],
  kings: readonly Point[],
  size: number,
  from: Point,
  stone: Stone,
  rules: CheckersRules = ENGLISH_CHECKERS_RULES,
): Jump[] {
  return jumpsFrom(groundAt(board, size, from), from, stone, isKingAt(kings, from), rules);
}

/** The points holding a piece of `stone`. */
function piecesOf(board: readonly Cell[], size: number, stone: Stone): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === stone) points.push({ row: Math.floor(index / size), col: index % size });
  }
  return points;
}

/** Whether any of `stone`'s pieces on the board has a capture available right now. */
export function checkersHasCapture(
  board: Cell[],
  kings: readonly Point[],
  size: number,
  stone: Stone,
  rules: CheckersRules = ENGLISH_CHECKERS_RULES,
): boolean {
  return piecesOf(board, size, stone).some(
    (point) => checkersCaptures(board, kings, size, point, stone, rules).length > 0,
  );
}

/** Whether `stone` has any legal move at all: a capture first, or failing that, a step. */
export function checkersHasAnyMove(
  board: Cell[],
  kings: readonly Point[],
  size: number,
  stone: Stone,
  rules: CheckersRules = ENGLISH_CHECKERS_RULES,
): boolean {
  return piecesOf(board, size, stone).some(
    (point) =>
      checkersCaptures(board, kings, size, point, stone, rules).length > 0 ||
      checkersSteps(board, size, point, stone, isKingAt(kings, point), rules).length > 0,
  );
}

/**
 * The squares of the pieces the capture under way has already taken.
 *
 * Derived from the record, never stored: a chain is the last move and every
 * move before it that continued one, so walking back until a move did not
 * continue a chain finds exactly the pieces this one has jumped.
 */
function takenInChain(state: GameState): Set<number> {
  const taken = new Set<number>();
  if (state.chainAt === null) return taken;
  const { size } = state.settings;
  for (let at = state.moves.length - 1; at >= 0; at -= 1) {
    const move = state.moves[at];
    for (const point of move.captured ?? []) taken.add(indexOf(size, point));
    if (move.continuedChain !== true) break;
  }
  return taken;
}

/** The entries worth the most, where a game makes the longest capture compulsory. */
function mostOf<T extends { worth: number }>(entries: T[], rules: CheckersRules): T[] {
  if (!takesMaximum(rules) || entries.length === 0) return entries;
  const best = Math.max(...entries.map((entry) => entry.worth));
  return entries.filter((entry) => entry.worth === best);
}

/**
 * Every move the colour to move may make, by the square it starts from.
 *
 * Worked out once per position and kept against it. A caller asks this piece by
 * piece — the board asks for the one picked up, and the computer players ask for
 * every piece they own on every position they weigh — and under the majority
 * rule the answer for one piece depends on every other piece's best capture, so
 * asking afresh each time would repeat the whole board's search once per piece.
 * A position is never changed in place, so the answer kept for it cannot go stale.
 */
const LEGAL_MOVES = new WeakMap<GameState, Map<number, Point[]>>();

function legalMoves(state: GameState): Map<number, Point[]> {
  const known = LEGAL_MOVES.get(state);
  if (known !== undefined) return known;
  const worked = workOutMoves(state);
  LEGAL_MOVES.set(state, worked);
  return worked;
}

function workOutMoves(state: GameState): Map<number, Point[]> {
  const { board, kings, chainAt, toPlay } = state;
  const { size } = state.settings;
  const rules = checkersRulesFor(state.settings);
  const moves = new Map<number, Point[]>();
  const add = (from: Point, to: Point) => {
    const index = indexOf(size, from);
    moves.set(index, [...(moves.get(index) ?? []), to]);
  };

  // A piece already mid-chain may only go on capturing, and only that piece may move at all.
  if (chainAt !== null) {
    const ground = { board, size, lifted: indexOf(size, chainAt), taken: takenInChain(state) };
    for (const one of mostOf(weighedJumps(ground, chainAt, toPlay, isKingAt(kings, chainAt), rules), rules)) {
      add(chainAt, one.jump.to);
    }
    return moves;
  }

  const captures = piecesOf(board, size, toPlay).flatMap((from) =>
    weighedJumps(groundAt(board, size, from), from, toPlay, isKingAt(kings, from), rules).map((one) => ({
      from,
      ...one,
    })),
  );
  // The forced-capture rule: any capture on the board rules out every step.
  if (captures.length > 0) {
    for (const one of mostOf(captures, rules)) add(one.from, one.jump.to);
    return moves;
  }
  for (const from of piecesOf(board, size, toPlay)) {
    for (const to of checkersSteps(board, size, from, toPlay, isKingAt(kings, from), rules)) add(from, to);
  }
  return moves;
}

/**
 * Where a piece at `from` may go this move.
 *
 * A piece already mid-chain may only continue capturing, and only that piece
 * may move at all. Otherwise, if any of the colour's pieces can capture, only
 * a capture is offered, from whichever pieces have one — the forced-capture
 * rule — narrowed to the longest where the game says so. Failing both, a step.
 */
export function checkersMoves(state: GameState, from: Point): Point[] {
  const { size } = state.settings;
  if (!isOnBoard(size, from) || state.board[indexOf(size, from)] !== state.toPlay) return [];
  return [...(legalMoves(state).get(indexOf(size, from)) ?? [])];
}

/**
 * Which rule, if any, narrowed the moves the colour to move is offered below
 * what its pieces could make.
 *
 * `capture` when a capture is compulsory: a chain under way, or a capture
 * anywhere on the board ruling out every step. `mostCaptured` when, beyond that,
 * the game takes the most and a capture some piece could make was refused
 * because another takes more. Null when nothing was held back.
 *
 * A reading of `legalMoves` against the raw jumps, not a second rule: whatever
 * the moves are, they were decided above.
 */
export function checkersNarrowing(state: GameState): MoveNarrowing | null {
  if (state.chainAt !== null) return MOVE_NARROWINGS.capture;
  const { board, kings, toPlay } = state;
  const { size } = state.settings;
  const rules = checkersRulesFor(state.settings);
  const jumps = piecesOf(board, size, toPlay).flatMap((from) =>
    checkersCaptures(board, kings, size, from, toPlay, rules).map((jump) => ({ from, to: jump.to })),
  );
  if (jumps.length === 0) return null;
  if (takesMaximum(rules)) {
    const legal = legalMoves(state);
    const refused = jumps.some(
      ({ from, to }) => !(legal.get(indexOf(size, from)) ?? []).some((point) => samePoint(point, to)),
    );
    if (refused) return MOVE_NARROWINGS.mostCaptured;
  }
  return MOVE_NARROWINGS.capture;
}

/** The one piece of `enemy` standing on the diagonal strictly between `from` and `to`, if any. */
function pieceBetween(board: readonly Cell[], size: number, from: Point, to: Point, enemy: Stone): Point | null {
  const rows = to.row - from.row;
  const cols = to.col - from.col;
  if (Math.abs(rows) !== Math.abs(cols)) return null;
  const step = { row: Math.sign(rows), col: Math.sign(cols) };
  for (let distance = 1; distance < Math.abs(rows); distance += 1) {
    const point = { row: from.row + step.row * distance, col: from.col + step.col * distance };
    if (board[indexOf(size, point)] === enemy) return point;
  }
  return null;
}

export function applyCheckersMove(state: GameState, from: Point, to: Point): CheckersMoveResult {
  const { board: prevBoard, kings: prevKings, toPlay, chainAt } = state;
  const { size } = state.settings;
  const rules = checkersRulesFor(state.settings);
  const wasKing = isKingAt(prevKings, from);
  const captured = pieceBetween(prevBoard, size, from, to, otherStone(toPlay));

  const board = prevBoard.slice();
  board[indexOf(size, from)] = null;
  board[indexOf(size, to)] = toPlay;
  let capturedWasKing = false;
  if (captured !== null) {
    capturedWasKing = isKingAt(prevKings, captured);
    board[indexOf(size, captured)] = null;
  }

  let kings = prevKings.filter(
    (point) => !samePoint(point, from) && (captured === null || !samePoint(point, captured)),
  );

  let crowned = !wasKing && to.row === farRow(size, toPlay);
  let continues = false;
  if (captured !== null) {
    const landed = afterLanding(size, to, toPlay, wasKing, rules);
    if (!landed.stops) {
      const taken = takenInChain(state);
      taken.add(indexOf(size, captured));
      const ground = { board, size, lifted: indexOf(size, to), taken };
      continues = jumpsFrom(ground, to, toPlay, landed.king, rules).length > 0;
      // Crowned on the far row unless the game makes a man carry on uncrowned, and it does.
      crowned = crowned && (landed.king || !continues);
    }
  }
  if (wasKing || crowned) kings = [...kings, to];

  return {
    board,
    kings,
    captured,
    capturedWasKing,
    wasKing,
    crowned,
    continuedChain: chainAt !== null && samePoint(chainAt, from),
    continues,
  };
}
