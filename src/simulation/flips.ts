import { expect } from "vitest";

import { GAME_STATUS } from "../constants.ts";
import { cellAt, indexOf, isStone, otherStone } from "../engine.ts";
import { undoMove } from "../rules/record.ts";
import type { GameState, Point } from "../types.ts";
import { canFlipAnywhereByHand, countByHand, flipDirectionsByHand, flipsByHand } from "./scan.ts";
import { ranOutOfLength } from "./checks.ts";

/**
 * The flipping games, restated by hand.
 *
 * Reversi and its forms are the one family here whose whole turn happens
 * somewhere other than the square that was played: discs turn, the turn may
 * pass back to the mover, and the game ends on a count rather than a line.
 * That is enough of its own reasoning to be worth reading on its own, and it
 * is why it lives beside the checker rather than inside it.
 */

/** The flipping games. Restated by hand. */
function isFlipping(variant: string): boolean {
  return (
    variant === "reversi" ||
    variant === "classicReversi" ||
    variant === "antiReversi" ||
    variant === "miniReversi" ||
    variant === "grandReversi" ||
    variant === "honeycomb"
  );
}

/** The four centre squares of an even board, by hand. */
function centreByHand(size: number): number[] {
  const half = size / 2;
  return [
    (half - 1) * size + half - 1,
    (half - 1) * size + half,
    half * size + half - 1,
    half * size + half,
  ];
}

/**
 * What must hold after a disc is placed in a flipping game: the mover's disc
 * is down; the discs that changed colour are exactly the ones the hand scan
 * says are bracketed, and they were the other colour before; nothing was
 * removed; the turn went to whoever can move, by the hand scan; and when the
 * game is over the count decides it — the larger count, or the smaller in the
 * giveaway form, or a draw when equal.
 */
function checkFlipMove(before: GameState, after: GameState, played: Point, where: string) {
  const size = after.settings.size;
  const mover = before.toPlay;
  const playedIndex = indexOf(size, played);
  expect(cellAt(before, played), `${where}: played on an occupied square`).toBeNull();
  expect(after.board[playedIndex], `${where}: mover's disc missing`).toBe(mover);

  const laying =
    after.settings.variant === "classicReversi" &&
    centreByHand(size).some((index) => before.board[index] === null);
  const directions = flipDirectionsByHand(after.settings.variant);
  const expected = laying ? [] : flipsByHand(before.board, size, mover, played, directions);
  if (laying) {
    expect(centreByHand(size), `${where}: laid outside the centre`).toContain(playedIndex);
  } else {
    expect(expected.length, `${where}: a move that turns nothing was allowed`).toBeGreaterThan(0);
  }

  const changed = after.board.reduce<number[]>((list, cell, index) => {
    if (cell !== before.board[index]) list.push(index);
    return list;
  }, []);
  const turned = changed.filter((index) => index !== playedIndex).sort((a, b) => a - b);
  const wanted = expected.map((point) => indexOf(size, point)).sort((a, b) => a - b);
  expect(turned, `${where}: turned discs differ from the hand scan`).toEqual(wanted);
  for (const index of turned) {
    expect(before.board[index], `${where}: turned a disc that was not the other colour`).toBe(otherStone(mover));
    expect(after.board[index], `${where}: a turned disc is not the mover's`).toBe(mover);
  }
  expect(after.board.filter(isStone).length, `${where}: a disc was removed`).toBe(
    before.board.filter(isStone).length + 1,
  );
  expect(after.moves.length).toBe(before.moves.length + 1);

  const opponentCan = canFlipAnywhereByHand(after.board, size, otherStone(mover), directions);
  const moverCan = canFlipAnywhereByHand(after.board, size, mover, directions);
  const stillLaying =
    after.settings.variant === "classicReversi" &&
    centreByHand(size).some((index) => after.board[index] === null);
  /*
   * A game given a length may be drawn with moves still available, which is
   * the one thing that overrides "somebody can move, so play continues".
   */
  if (after.status === GAME_STATUS.draw && ranOutOfLength(after)) {
    expect(after.winner, `${where}: drawn by length but has a winner`).toBeNull();
  } else if (stillLaying) {
    expect(after.status).toBe(GAME_STATUS.playing);
    expect(after.toPlay, `${where}: laying did not alternate`).toBe(otherStone(mover));
  } else if (opponentCan) {
    expect(after.status).toBe(GAME_STATUS.playing);
    expect(after.toPlay, `${where}: turn did not pass`).toBe(otherStone(mover));
  } else if (moverCan) {
    expect(after.status).toBe(GAME_STATUS.playing);
    expect(after.toPlay, `${where}: a forced pass was not applied`).toBe(mover);
  } else {
    const count = countByHand(after.board);
    if (count.black === count.white) {
      expect(after.status, `${where}: equal counts should draw`).toBe(GAME_STATUS.draw);
    } else {
      const more = count.black > count.white ? "black" : "white";
      const fewer = more === "black" ? "white" : "black";
      expect(after.status, `${where}: game should be over`).toBe(GAME_STATUS.won);
      expect(after.winBy, `${where}: a count win should say so`).toBe("count");
      expect(after.winner, `${where}: count went to the wrong colour`).toBe(
        after.settings.variant === "antiReversi" ? fewer : more,
      );
    }
  }

  if (after.settings.allowUndo) {
    const undone = undoMove(after);
    expect(undone.board, `${where}: undo did not turn the discs back`).toEqual(before.board);
    expect(undone.toPlay, `${where}: undo did not restore the turn`).toBe(before.toPlay);
  }
}

export { checkFlipMove, isFlipping };
