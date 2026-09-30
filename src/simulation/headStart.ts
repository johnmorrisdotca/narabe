import { expect } from "vitest";

import { MOVE_KINDS, STAR_POINTS } from "../constants.ts";
import type { GameState, Move, Point, Stone } from "../types.ts";

/*
 * THE HEAD START, RESTATED BY HAND, for the simulator.
 *
 * Like the rest of the simulator's checks this reads neither `VARIANT_SPECS` nor
 * `rules/headStart.ts`: the traditional head starts are written out below, and
 * which turns a head start takes is worked out from the move list on its own. A
 * disagreement between this and the engine means one of them is wrong, and the
 * seed says which game to look at.
 */

/** Each game's traditional head start, written out rather than read from the spec. */
const TRADITION: Record<string, "stones" | "corners" | "men"> = {
  go: "stones",
  reversi: "corners",
  classicReversi: "corners",
  miniReversi: "corners",
  grandReversi: "corners",
  checkers: "men",
  internationalDraughts: "men",
  brazilianDraughts: "men",
  canadianCheckers: "men",
  russianDraughts: "men",
  poolCheckers: "men",
};

const other = (stone: Stone): Stone => (stone === "black" ? "white" : "black");
const mover = (move: Move): Stone => move.by ?? move.stone;
const noStone = (move: Move): boolean => move.kind === MOVE_KINDS.pass || move.kind === MOVE_KINDS.forfeit;

/**
 * Which moves of a record were head-start turns, by hand: the other colour's
 * passes after the given colour has begun, up to the number of free turns, and
 * none once the other colour has played a turn of its own.
 */
function headStartTurnsByHand(state: GameState): { turns: boolean[]; spent: boolean } {
  const start = state.settings.headStart;
  const turns = state.moves.map(() => false);
  if (start === undefined || start.stone === null || start.freeTurns === 0) return { turns, spent: true };
  let begun = false;
  let taken = 0;
  let spent = false;
  state.moves.forEach((move, index) => {
    if (mover(move) === start.stone) {
      if (!noStone(move)) begun = true;
      return;
    }
    if (!begun || spent) return;
    if (move.kind === MOVE_KINDS.pass && taken < start.freeTurns) {
      turns[index] = true;
      taken += 1;
    } else {
      spent = true;
    }
  });
  return { turns, spent: spent || taken >= start.freeTurns };
}

/** Whether the colour to move owes the other a head-start turn, worked out by hand. */
export function headStartDueByHand(state: GameState): boolean {
  const start = state.settings.headStart;
  if (start === undefined || start.stone === null || start.freeTurns === 0) return false;
  if (state.status !== "playing" || state.pendingTwist || state.toPlay === start.stone) return false;
  const last = state.moves[state.moves.length - 1];
  if (last === undefined || noStone(last) || mover(last) !== start.stone) return false;
  return !headStartTurnsByHand(state).spent;
}

/** What must hold after a head start's turn: nothing moved, a pass on the record, and the given colour to move again. */
export function checkHeadStartPass(before: GameState, after: GameState, seed: number) {
  const where = `${after.settings.variant} seed ${seed}, head-start turn after move ${before.moves.length}`;
  expect(after.board, `${where}: a head start's pass changed the board`).toEqual(before.board);
  const pass = after.moves[after.moves.length - 1];
  expect(after.moves.length, `${where}: the pass was not recorded`).toBe(before.moves.length + 1);
  expect(pass.kind, `${where}: recorded as something other than a pass`).toBe("pass");
  expect(pass.stone, `${where}: passed for the wrong colour`).toBe(before.toPlay);
  expect(pass.headStart, `${where}: not marked as a head start's turn`).toBe(true);
  expect(after.toPlay, `${where}: the turn did not come back`).toBe(other(before.toPlay));
  expect(after.status, `${where}: a head start's pass ended the game`).toBe("playing");
}

/** Every pass the engine marked as a head start's is one by hand, and no other. */
export function checkHeadStartRecord(state: GameState, what: string) {
  const { turns } = headStartTurnsByHand(state);
  state.moves.forEach((move, index) => {
    expect(move.headStart === true, `${what}: move ${index + 1} marked wrong as a head start's turn`).toBe(turns[index]);
  });
}

/** Whether a Go game's handicap stones were given, by hand: a colour, and two or more stones the board has star points for. */
export function handicapStonesByHand(state: GameState): boolean {
  const start = state.settings.headStart;
  const stars = (STAR_POINTS[state.settings.size] ?? []).length;
  return (
    TRADITION[state.settings.variant] === "stones" &&
    start !== undefined &&
    start.stone !== null &&
    start.traditional >= 2 &&
    start.traditional <= stars
  );
}

const at = (state: GameState, point: Point) => state.board[point.row * state.settings.size + point.col];

/**
 * The position a head start's traditional part sets out, checked on a game
 * before its first move: the stones on star points and White to open, the
 * corners in the given colour, or the men gone from the stronger side's back row.
 */
export function checkHeadStartStart(state: GameState, seed: number) {
  const start = state.settings.headStart;
  if (start === undefined || start.stone === null || start.traditional === 0) return;
  const where = `${state.settings.variant} seed ${seed}, head start for ${start.stone}`;
  const { size } = state.settings;
  const tradition = TRADITION[state.settings.variant];

  if (tradition === "stones") {
    const stars = STAR_POINTS[size] ?? [];
    const onStars = stars.filter((point) => at(state, point) === start.stone).length;
    const anywhere = state.board.filter((cell) => cell === start.stone).length;
    expect(onStars, `${where}: handicap stones not on the star points`).toBe(start.traditional);
    expect(anywhere, `${where}: handicap stones off the star points`).toBe(start.traditional);
    expect(state.toPlay, `${where}: the colour given stones moved first`).toBe(other(start.stone));
    return;
  }
  if (tradition === "corners") {
    const last = size - 1;
    const corners = [
      { row: 0, col: 0 },
      { row: 0, col: last },
      { row: last, col: 0 },
      { row: last, col: last },
    ].filter((point) => at(state, point) === start.stone).length;
    expect(corners, `${where}: the corners were not given`).toBe(start.traditional);
    return;
  }
  if (tradition === "men") {
    const stronger = other(start.stone);
    const row = stronger === "black" ? 0 : size - 1;
    const dark = Array.from({ length: size }, (_, col) => ({ row, col })).filter((point) => (point.row + point.col) % 2 === 1);
    const gone = dark.filter((point) => at(state, point) === null).length;
    const standing = dark.filter((point) => at(state, point) === stronger).length;
    expect(gone, `${where}: the odds did not take the men off the back row`).toBe(start.traditional);
    expect(standing, `${where}: the back row holds something other than the stronger side's men`).toBe(dark.length - start.traditional);
    return;
  }
  throw new Error(`${where}: a traditional head start on a game with no tradition written here`);
}
