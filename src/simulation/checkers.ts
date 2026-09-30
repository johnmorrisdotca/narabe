import { expect } from "vitest";
import { cellAt, otherStone } from "../engine.ts";
import { undoMove } from "../rules/record.ts";
import { GAME_STATUS } from "../constants.ts";
import type { GameState, Point } from "../types.ts";
import {
  HAND_RULES,
  anyMoveByHand,
  bestAnywhereByHand,
  bestByHand,
  drawReasonByHand,
  farRowByHand,
  hopsByHand,
  isKingByHand,
} from "./checkersByHand.ts";

/**
 * The checkers family, checked move by move against the rules restated by hand
 * in simulation.checkersByHand.ts: the forced capture, the longest capture
 * where a game demands it, men taking backward, kings flying, a captured piece
 * standing in the way until the capture is over, crowning in the middle of a
 * capture, the no-move win, and every draw the game's own rules write down.
 */

export function isCheckers(variant: string): boolean {
  return Object.prototype.hasOwnProperty.call(HAND_RULES, variant);
}

/**
 * The squares of the pieces a capture under way has already taken, as this
 * checker saw them taken — kept against each position it has passed through,
 * rather than read back from the engine's record the way the engine does.
 */
const TAKEN = new WeakMap<GameState, number[]>();

function sortedPoints(points: readonly Point[]): Point[] {
  return [...points].sort((a, b) => a.row - b.row || a.col - b.col);
}

export function checkCheckersMove(before: GameState, after: GameState, from: Point, to: Point, seed: number) {
  const variant = after.settings.variant;
  const hand = HAND_RULES[variant];
  const where = `${variant} seed ${seed}, move ${from.row},${from.col} to ${to.row},${to.col}`;
  const size = after.settings.size;
  expect(size, `${where}: played on the wrong board`).toBe(hand.size);
  const mover = before.toPlay;
  const enemy = otherStone(mover);
  const index = (point: Point) => point.row * size + point.col;

  const rows = to.row - from.row;
  const cols = to.col - from.col;
  const distance = Math.abs(rows);
  expect(distance > 0 && Math.abs(cols) === distance, `${where}: not a diagonal move`).toBe(true);
  expect(cellAt(after, from), `${where}: piece still at its origin`).toBeNull();
  expect(cellAt(after, to), `${where}: piece did not arrive`).toBe(mover);

  const wasKing = isKingByHand(before.kings, from);
  const flies = wasKing && hand.flying;
  const between: Point[] = [];
  for (let step = 1; step < distance; step += 1) {
    between.push({ row: from.row + Math.sign(rows) * step, col: from.col + Math.sign(cols) * step });
  }
  const standing = between.filter((point) => cellAt(before, point) !== null);
  expect(standing.every((point) => cellAt(before, point) === enemy), `${where}: jumped a piece of its own`).toBe(true);
  expect(standing.length, `${where}: passed more than one piece`).toBeLessThanOrEqual(1);
  const over = standing[0] ?? null;
  if (!flies) expect(distance, `${where}: went further than its piece may`).toBe(over === null ? 1 : 2);
  if (over === null && !wasKing) {
    expect(Math.sign(rows), `${where}: a man stepped backward`).toBe(mover === "black" ? 1 : -1);
  }

  const taken = before.chainAt === null ? [] : TAKEN.get(before);
  expect(taken, `${where}: carried on a capture this checker never saw begin`).toBeDefined();
  const takenNow = taken ?? [];
  expect(
    [...between, to].some((point) => takenNow.includes(index(point))),
    `${where}: passed or landed where a piece was already taken`,
  ).toBe(false);
  if (before.chainAt !== null) {
    expect(from, `${where}: another piece moved mid-capture`).toEqual(before.chainAt);
    expect(over, `${where}: a capture stopped for a step`).not.toBeNull();
  }

  const available =
    before.chainAt !== null
      ? bestByHand(before.board, size, from, mover, wasKing, hand, takenNow, index(from))
      : bestAnywhereByHand(before.board, before.kings, size, mover, hand);
  expect(over !== null || available === 0, `${where}: a capture was available and this move was not one`).toBe(true);

  const reaches = !wasKing && to.row === farRowByHand(size, mover);
  let crowned = reaches;
  let continues = false;
  if (over !== null) {
    const stops = reaches && hand.crown === "stops";
    const kingOn = wasKing || (reaches && hand.crown === "continues");
    const afterTaken = [...takenNow, index(over)];
    const rest = stops ? 0 : bestByHand(before.board, size, to, mover, kingOn, hand, afterTaken, index(from));
    if (hand.most) expect(1 + rest, `${where}: did not take the most pieces it could`).toBe(available);
    continues = rest > 0;
    if (flies && !continues) {
      const elsewhere = hopsByHand(before.board, size, from, mover, true, hand, takenNow, index(from)).filter(
        (hop) => hop.over.row === over.row && hop.over.col === over.col && (hop.to.row !== to.row || hop.to.col !== to.col),
      );
      expect(
        elsewhere.some((hop) => bestByHand(before.board, size, hop.to, mover, true, hand, afterTaken, index(from)) > 0),
        `${where}: landed where the capture ends while another landing went on taking`,
      ).toBe(false);
    }
    crowned = reaches && (hand.crown !== "passes" || !continues);
    expect(cellAt(after, over), `${where}: the captured piece is still on the board`).toBeNull();
  }

  const changed = after.board.filter((cell, at) => cell !== before.board[at]).length;
  expect(changed, `${where}: more cells changed than a step or a capture explains`).toBe(over === null ? 2 : 3);
  expect(after.captures[mover] - before.captures[mover], `${where}: captures tally does not match`).toBe(over === null ? 0 : 1);
  expect(isKingByHand(after.kings, to), `${where}: king status at the landing square is wrong`).toBe(wasKing || crowned);
  expect(isKingByHand(after.kings, from), `${where}: a king was left behind at the square it moved from`).toBe(false);
  expect(after.moves[after.moves.length - 1].crowned === true, `${where}: the record says the wrong thing about crowning`).toBe(crowned);

  if (continues && over !== null) {
    expect(after.chainAt, `${where}: a waiting capture did not keep the turn`).toEqual(to);
    expect(after.toPlay, `${where}: the turn passed mid-capture`).toBe(mover);
    expect(after.status, `${where}: the game ended mid-capture`).toBe(GAME_STATUS.playing);
    TAKEN.set(after, [...takenNow, index(over)]);
  } else {
    expect(after.chainAt, `${where}: the capture did not close`).toBeNull();
    if (!anyMoveByHand(after.board, after.kings, size, enemy, hand)) {
      expect(after.status, `${where}: the other side has no move and the game went on`).toBe(GAME_STATUS.won);
      expect(after.winBy, `${where}: won by something other than being blocked`).toBe("blocked");
      expect(after.winner, `${where}: the wrong side won`).toBe(mover);
    } else {
      const reason = drawReasonByHand(after, hand);
      expect(after.status, `${where}: by hand, ${reason ?? "no draw rule applies"}`).toBe(
        reason === null ? GAME_STATUS.playing : GAME_STATUS.draw,
      );
      if (after.status === GAME_STATUS.playing) {
        expect(after.toPlay, `${where}: the turn did not pass`).toBe(enemy);
      }
    }
  }

  if (after.settings.allowUndo) {
    const undone = undoMove(after);
    expect(undone.board, `${where}: undo did not restore the board`).toEqual(before.board);
    expect(undone.toPlay, `${where}: undo did not restore the turn`).toBe(before.toPlay);
    // The kings are a set, not a sequence, so only the membership has to match.
    expect(sortedPoints(undone.kings), `${where}: undo did not restore the kings`).toEqual(sortedPoints(before.kings));
    expect(undone.chainAt, `${where}: undo did not restore the chain`).toEqual(before.chainAt);
  }
}
