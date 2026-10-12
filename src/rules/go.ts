import { MOVE_KINDS } from "../constants.ts";
import type { Cell, GameState, Move, Point, Stone } from "../types.ts";
import { cellAtPoint, indexOf, isOnBoard, otherStone, pointOf } from "./board.ts";
import { settleDraw } from "./drawLimit.ts";

/**
 * Go: stones never move once played, and nothing about a line ever decides
 * anything. The whole of the game is in four things no other variant here
 * needs — a group's liberties, capturing by taking the last one, the ko
 * rule that stops an instant recapture undoing the position it just made,
 * and, at the end, counting the board rather than reading a line on it.
 *
 * The standard bonus for playing second — komi — is fixed rather than a
 * setting, at the usual 6.5: a half point so the count can never tie.
 *
 * @example
 * ```ts
 * import { KOMI } from "@johnmorrisdotca/narabe/rules/go";
 * console.log(KOMI);
 * ```
 */
export const KOMI = 6.5;

const NEIGHBOURS: readonly Point[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

/**
 * The connected group of stones sharing the colour at `from`, and the empty
 * points touching any of them — its liberties. A group with none is what
 * capturing takes off the board.
 *
 * @param board - The row-major board cells; null marks an empty point.
 * @param size - The number of cells on each side of the board.
 * @param from - The source point of the group or moving piece.
 * @returns The connected same-colour stones and their empty neighbouring indices.
 * @example
 * ```ts
 * import { createGame, playMove } from "@johnmorrisdotca/narabe";
 * import { groupAt } from "@johnmorrisdotca/narabe/rules/go";
 *
 * const go = playMove(createGame({variant:"go",size:9}),{row:4,col:4});
 * console.log(groupAt(go.board, go.settings.size, {row:4,col:4}).liberties.size);
 * ```
 */
export function groupAt(
  board: Cell[],
  size: number,
  from: Point,
): { stones: Point[]; liberties: Set<number> } {
  const colour = cellAtPoint(board, size, from);
  const stones: Point[] = [];
  const liberties = new Set<number>();
  const seen = new Set<number>([indexOf(size, from)]);
  const queue: Point[] = [from];
  while (queue.length > 0) {
    const at = queue.shift() as Point;
    stones.push(at);
    for (const step of NEIGHBOURS) {
      const next = { row: at.row + step.row, col: at.col + step.col };
      if (!isOnBoard(size, next)) continue;
      const cell = cellAtPoint(board, size, next);
      if (cell === null) {
        liberties.add(indexOf(size, next));
        continue;
      }
      if (cell !== colour) continue;
      const key = indexOf(size, next);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return { stones, liberties };
}

/**
 * A stone of `stone` played at `point`: the board it leaves, and what it
 * captured — or null, meaning the move is suicide and illegal. Enemy
 * groups left with no liberties come off first; only then is the played
 * stone's own group checked for a liberty of its own, since a capture can
 * open one that was not there before the board was read.
 *
 * @param board - The row-major board cells; null marks an empty point.
 * @param size - The number of cells on each side of the board.
 * @param point - A zero-based row and column on the board.
 * @param stone - The black or white colour being examined.
 * @returns The copied board and captured points, or null if the move is suicide.
 * @example
 * ```ts
 * import { createGame, playMove } from "@johnmorrisdotca/narabe";
 * import { applyGoMove } from "@johnmorrisdotca/narabe/rules/go";
 *
 * const point = {row:7,col:7};
 * const go = playMove(createGame({variant:"go",size:9}),{row:4,col:4});
 * console.log(applyGoMove(go.board, go.settings.size, point, "black")?.captured);
 * ```
 */
export function applyGoMove(
  board: Cell[],
  size: number,
  point: Point,
  stone: Stone,
): { board: Cell[]; captured: Point[] } | null {
  const next = board.slice();
  next[indexOf(size, point)] = stone;
  const enemy = otherStone(stone);
  const captured: Point[] = [];
  const takenAlready = new Set<number>();

  for (const step of NEIGHBOURS) {
    const neighbour = { row: point.row + step.row, col: point.col + step.col };
    if (!isOnBoard(size, neighbour)) continue;
    if (cellAtPoint(next, size, neighbour) !== enemy) continue;
    if (takenAlready.has(indexOf(size, neighbour))) continue;
    const group = groupAt(next, size, neighbour);
    if (group.liberties.size > 0) continue;
    for (const taken of group.stones) {
      takenAlready.add(indexOf(size, taken));
      captured.push(taken);
    }
  }
  for (const taken of captured) next[indexOf(size, taken)] = null;

  const own = groupAt(next, size, point);
  if (own.liberties.size === 0) return null;
  return { board: next, captured };
}

/**
 * Whether `stone` may play `point`: on the board, empty, not suicide, and
 * not the one point the simple ko rule forbids retaking this move —
 * exactly the point a single-stone capture just vacated, so the immediate
 * recapture cannot instantly restore the position it broke. Any other move
 * lifts the restriction; it is not the whole of positional superko, but it
 * is the actual rule most rule sets call "simple ko".
 *
 * @param board - The row-major board cells; null marks an empty point.
 * @param size - The number of cells on each side of the board.
 * @param point - A zero-based row and column on the board.
 * @param stone - The black or white colour being examined.
 * @param koPoint - The forbidden immediate-recapture point, or null without a ko restriction.
 * @returns Whether the point is on board, empty, not suicide and not the immediate ko point.
 * @example
 * ```ts
 * import { createGame, playMove } from "@johnmorrisdotca/narabe";
 * import { goLegal } from "@johnmorrisdotca/narabe/rules/go";
 *
 * const point = {row:7,col:7};
 * const go = playMove(createGame({variant:"go",size:9}),{row:4,col:4});
 * console.log(goLegal(go.board, go.settings.size, point, "white", go.koPoint));
 * ```
 */
export function goLegal(
  board: Cell[],
  size: number,
  point: Point,
  stone: Stone,
  koPoint: Point | null,
): boolean {
  if (!isOnBoard(size, point) || cellAtPoint(board, size, point) !== null) return false;
  if (koPoint !== null && koPoint.row === point.row && koPoint.col === point.col) return false;
  return applyGoMove(board, size, point, stone) !== null;
}

/**
 * The area score: every stone on the board, plus every empty region whose
 * only neighbours are one colour. An empty region touching both colours,
 * or touching neither (an empty board), counts for nobody — dame, not
 * territory. Dead stones are not marked or removed here: a stone left on
 * the board still counts as a stone, so a player who wants credit for
 * territory a stray stone sits in has to capture it before passing, the
 * same as playing it out at the real table.
 *
 * @param board - The row-major board cells; null marks an empty point.
 * @param size - The number of cells on each side of the board.
 * @returns The raw black and white area totals, without komi.
 * @example
 * ```ts
 * import { createGame, playMove } from "@johnmorrisdotca/narabe";
 * import { scoreArea } from "@johnmorrisdotca/narabe/rules/go";
 *
 * const go = playMove(createGame({variant:"go",size:9}),{row:4,col:4});
 * console.log(scoreArea(go.board, go.settings.size));
 * ```
 */
export function scoreArea(board: Cell[], size: number): { black: number; white: number } {
  const score = { black: 0, white: 0 };
  const seen = new Set<number>();

  for (let index = 0; index < board.length; index += 1) {
    const cell = board[index];
    if (cell === "black" || cell === "white") {
      score[cell] += 1;
      continue;
    }
    if (cell !== null || seen.has(index)) continue;

    const region: number[] = [];
    const borders = new Set<Stone>();
    const queue = [index];
    seen.add(index);
    while (queue.length > 0) {
      const at = queue.shift() as number;
      region.push(at);
      const point = pointOf(size, at);
      for (const step of NEIGHBOURS) {
        const next = { row: point.row + step.row, col: point.col + step.col };
        if (!isOnBoard(size, next)) continue;
        const nextIndex = indexOf(size, next);
        const nextCell = board[nextIndex];
        if (nextCell === null) {
          if (!seen.has(nextIndex)) {
            seen.add(nextIndex);
            queue.push(nextIndex);
          }
        } else if (nextCell === "black" || nextCell === "white") {
          borders.add(nextCell);
        }
      }
    }
    if (borders.size === 1) {
      const owner = [...borders][0];
      score[owner] += region.length;
    }
  }
  return score;
}

/**
 * Who the area score, with komi added for white, gives the game to. Never a
 * tie: komi is a half point. Handed the komi, because a handicap game is
 * counted with less — see `komiFor`.
 */
/**
 * The empty points `stone` has already walled in: every empty region whose
 * border is that colour's stones and nothing else — the ground `scoreArea`
 * counts as theirs.
 *
 * A stone played there gains its owner nothing under area scoring, and it
 * fills the eyes the group lives by. So it is never a move worth making, and
 * the computer players leave it out; a player who has nothing else left
 * passes, which is how Go ends.
 *
 * @param board - The row-major board cells; null marks an empty point.
 * @param size - The number of cells on each side of the board.
 * @param stone - The black or white colour being examined.
 * @returns Indices of empty points bordered only by the requested colour.
 * @example
 * ```ts
 * import { createGame, playMove } from "@johnmorrisdotca/narabe";
 * import { walledIn } from "@johnmorrisdotca/narabe/rules/go";
 *
 * const go = playMove(createGame({variant:"go",size:9}),{row:4,col:4});
 * console.log(walledIn(go.board, go.settings.size, "black").size);
 * ```
 */
export function walledIn(board: Cell[], size: number, stone: Stone): Set<number> {
  const owned = new Set<number>();
  const seen = new Set<number>();
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null || seen.has(index)) continue;
    const region: number[] = [];
    let foreign = false;
    const queue = [index];
    seen.add(index);
    while (queue.length > 0) {
      const at = queue.shift() as number;
      region.push(at);
      const point = pointOf(size, at);
      for (const step of NEIGHBOURS) {
        const next = { row: point.row + step.row, col: point.col + step.col };
        if (!isOnBoard(size, next)) continue;
        const nextIndex = indexOf(size, next);
        const nextCell = board[nextIndex];
        if (nextCell === null) {
          if (!seen.has(nextIndex)) {
            seen.add(nextIndex);
            queue.push(nextIndex);
          }
        } else if (nextCell !== stone) {
          foreign = true;
        }
      }
    }
    // An empty board, or a region touching nobody, is nobody's ground.
    if (!foreign && region.length < board.length) for (const at of region) owned.add(at);
  }
  return owned;
}

/** The colour whose area plus komi wins the Go position.
 *
 * @param board - The row-major board cells; null marks an empty point.
 * @param size - The number of cells on each side of the board.
 * @param komi - The score bonus credited to white.
 * @returns Black when its area is greater than white area plus komi; otherwise white.
 * @example
 * ```ts
 * import { createGame, playMove } from "@johnmorrisdotca/narabe";
 * import { areaWinner } from "@johnmorrisdotca/narabe/rules/go";
 *
 * const go = playMove(createGame({variant:"go",size:9}),{row:4,col:4});
 * console.log(areaWinner(go.board, go.settings.size, 6.5));
 * ```
 */
export function areaWinner(board: Cell[], size: number, komi: number): Stone {
  const { black, white } = scoreArea(board, size);
  return black > white + komi ? "black" : "white";
}

/**
 * Plays a stone at `point`, already known legal: captures whatever it takes,
 * sets a fresh ko point when that capture was exactly one stone (and clears
 * it otherwise), and passes the turn — Go has no further move of its own to
 * settle, unlike the twist games or a piece game's line.
 *
 * @param state - The current immutable game position.
 * @param point - A zero-based row and column on the board.
 * @returns The position after a known legal placement, captures, ko update and turn change; unchanged if the placement is suicide.
 * @example
 * ```ts
 * import { createGame, playMove } from "@johnmorrisdotca/narabe";
 * import { playGoMove } from "@johnmorrisdotca/narabe/rules/go";
 *
 * const point = {row:7,col:7};
 * const go = playMove(createGame({variant:"go",size:9}),{row:4,col:4});
 * console.log(playGoMove(go, point).moves.length);
 * ```
 */
export function playGoMove(state: GameState, point: Point): GameState {
  const { settings, toPlay, koPoint } = state;
  const result = applyGoMove(state.board, settings.size, point, toPlay);
  if (result === null) return state;

  const move: Move = { ...point, stone: toPlay, kind: MOVE_KINDS.place, koPointBefore: koPoint };
  if (result.captured.length > 0) move.captured = result.captured;
  const captures = {
    ...state.captures,
    [toPlay]: state.captures[toPlay] + result.captured.length,
  };

  return settleDraw({
    ...state,
    board: result.board,
    moves: [...state.moves, move],
    captures,
    koPoint: result.captured.length === 1 ? result.captured[0] : null,
    toPlay: otherStone(toPlay),
  });
}
