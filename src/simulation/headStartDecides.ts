import {
  createGame,
  inMovePhase,
  movePiece,
  pieceMoves,
  piecePlacements,
  placePiece,
  playMove,
  quadrantCount,
  singlesLeft,
  twistBoard,
} from "../engine.ts";
import { GAME_STATUS, LINE_RULES, MOVE_KINDS, PLACEMENTS, STONES, VARIANT_SPECS } from "../constants.ts";
import type { GameState, Point, RuleVariant, Stone } from "../types.ts";
import { otherStone } from "../rules/board.ts";
import { passesOwed } from "../rules/forcedPass.ts";
import { headStartTurnsGiven } from "../rules/headStart.ts";
import { cannotDecide, hasBegun, inOpenRuns, narrowsToOpenRuns } from "./headStartBounds.ts";

/*
 * DOES A HEAD START DECIDE THE GAME? — the measurement behind every game's
 * declared `headStartTurns`.
 *
 * A head start must make a game easier, never decide it. So for a game and a
 * number of free turns this asks: given those turns, can the favoured colour
 * FORCE a win — or in draughts, a capture it keeps — within a short horizon,
 * whatever the other side does? The horizon is the free turns and then
 * `HEAD_START_HORIZON` replies from the other side, each answered.
 *
 * An exhaustive and-or search on the real engine: every move the favoured side
 * has is tried, and a single defence from the other side is enough to refute a
 * line. Two things keep it small without making it guess, both argued where
 * they live: the bounds in `simulation.headStartBounds.ts`, and, in the plain
 * five-in-a-row games, a first stone in the middle of the board, since an edge
 * only ever takes room away from a line. Each game is measured with either
 * colour given the turns, on each board it is played on (the open-board line
 * games on 9×9, which holds every shape that can win this soon), and over a few
 * seeds where squares or pieces are dealt at random.
 *
 * A search that runs past its budget answers "unknown", never "safe".
 */

/** Replies from the other side, each answered, after the free turns. */
export const HEAD_START_HORIZON = 2;

/** Positions one search may visit before it gives up and says it does not know. */
export const HEAD_START_BUDGET = 250_000;

/**
 * The defences tried first: the other side's most urgent moves. A defence found
 * among them is a defence, so a game that comes out safe this way is safe; only
 * an apparent forced win is searched again with every defence, before it is
 * believed.
 */
const FIRST_DEFENCES = 4;

export type HeadStartVerdict =
  | { kind: "safe" }
  | { kind: "decides"; favoured: Stone; size: number; seed: number }
  | { kind: "unknown"; favoured: Stone; size: number; seed: number };

class OverBudget extends Error {}

/** The boards a game is measured on. */
function measuredSizes(variant: RuleVariant): readonly number[] {
  return VARIANT_SPECS[variant].boardSizes ?? [9];
}

/** Seeds for the games that deal squares or pieces at random; one for the rest. */
function measuredSeeds(variant: RuleVariant): readonly number[] {
  const spec = VARIANT_SPECS[variant];
  const dealt = spec.deadSquares > 0 || spec.hotSquares > 0 || spec.wormholes > 0 || spec.queue !== null;
  return dealt ? [1, 2, 3, 4] : [0];
}

/** Whether the first stone may be taken as the centre: an open board, where a line's shape is the same anywhere and an edge only hurts it. */
function startsInTheMiddle(variant: RuleVariant): boolean {
  const spec = VARIANT_SPECS[variant];
  return (
    narrowsToOpenRuns(spec) &&
    spec.boardSizes === null &&
    spec.deadSquares === 0 &&
    spec.hotSquares === 0 &&
    spec.forbidden.black.length === 0 &&
    spec.forbidden.white.length === 0 &&
    spec.lineRule.black !== LINE_RULES.exactOpen &&
    spec.lineRule.white !== LINE_RULES.exactOpen
  );
}

function emptyPointsOf(state: GameState): Point[] {
  const { size } = state.settings;
  const points: Point[] = [];
  state.board.forEach((cell, index) => {
    if (cell === null) points.push({ row: Math.floor(index / size), col: index % size });
  });
  return points;
}

/** Every position one step of the colour to move can reach. */
function stepsFrom(state: GameState, favoured: Stone, replies: number): GameState[] {
  const spec = VARIANT_SPECS[state.settings.variant];
  const { size } = state.settings;
  const out: GameState[] = [];
  const keep = (next: GameState) => {
    if (next !== state) out.push(next);
  };

  if (state.pendingTwist) {
    const quadrants = quadrantCount(size, spec.quadrantSize ?? size);
    for (let quadrant = 0; quadrant < quadrants; quadrant += 1) {
      keep(twistBoard(state, quadrant, true));
      keep(twistBoard(state, quadrant, false));
    }
    return out;
  }
  if (inMovePhase(state)) {
    state.board.forEach((cell, index) => {
      if (cell !== state.toPlay) return;
      const from = { row: Math.floor(index / size), col: index % size };
      for (const to of pieceMoves(state, from)) keep(movePiece(state, from, to));
    });
    return out;
  }
  if (spec.queue !== null) {
    for (const cells of piecePlacements(state)) keep(placePiece(state, cells));
    if (singlesLeft(state) > 0) for (const point of emptyPointsOf(state)) keep(playMove(state, point));
    return out;
  }

  let points =
    spec.placement === PLACEMENTS.drop
      ? Array.from({ length: size }, (_, col) => ({ row: 0, col })).filter((point) =>
          state.board.some((cell, index) => cell === null && index % size === point.col),
        )
      : emptyPointsOf(state);
  if (startsInTheMiddle(state.settings.variant)) {
    const stones = state.board.filter((cell) => cell === STONES.black || cell === STONES.white).length;
    const centre = { row: Math.floor(size / 2), col: Math.floor(size / 2) };
    // The other side's opening stone goes in a corner, out of every line through the middle; the favoured side's first goes in the middle.
    if (stones === 0) points = [state.toPlay === favoured ? centre : { row: 0, col: 0 }];
    else if (stones === 1 && state.board[0] === otherStone(favoured) && state.toPlay === favoured) points = [centre];
  }
  if (narrowsToOpenRuns(spec)) points = inOpenRuns(state, favoured, replies, points);
  const colours: (Stone | null)[] = spec.anyColour ? [STONES.black, STONES.white] : [null];
  for (const point of points) for (const colour of colours) keep(playMove(state, point, MOVE_KINDS.place, colour));
  return out;
}

function keyOf(state: GameState, replies: number): string {
  return [
    state.board.join(","),
    state.toPlay,
    state.pendingTwist ? 1 : 0,
    state.chainAt === null ? "" : `${state.chainAt.row}:${state.chainAt.col}`,
    state.kings.map((point) => `${point.row}:${point.col}`).join(";"),
    state.captures.black,
    state.captures.white,
    state.moves.length,
    headStartTurnsGiven(state.moves),
    replies,
  ].join("|");
}

/** Whether the favoured colour can force a decision from here, within the horizon left. */
function forcedFrom(start: GameState, favoured: Stone, budget: number, defences: number): boolean {
  const spec = VARIANT_SPECS[start.settings.variant];
  const other = otherStone(favoured);
  const memo = new Map<string, boolean>();
  let visited = 0;
  // Draughts is decided by material long before a win: a capture the other side cannot pay back.
  const ahead = (state: GameState) => spec.checkers && state.captures[favoured] > state.captures[other];

  const forced = (raw: GameState, replies: number): boolean => {
    visited += 1;
    if (visited > budget) throw new OverBudget();
    const state = passesOwed(raw);
    if (state.status !== GAME_STATUS.playing) return state.winner === favoured;
    const mine = state.toPlay === favoured;
    const begun = hasBegun(state, favoured);
    // The favoured side's last turn is over: decided only if it is ahead.
    if (!mine && begun && replies === 0) return ahead(state);
    if (!spec.checkers && cannotDecide(state, favoured, replies)) return false;
    const key = keyOf(state, replies);
    const known = memo.get(key);
    if (known !== undefined) return known;

    let steps = stepsFrom(state, favoured, replies);
    let result: boolean;
    if (mine) {
      if (spec.checkers && begun && replies === 0 && state.chainAt === null) {
        // Its last turn can only change the material by taking something.
        if (ahead(state)) result = true;
        else {
          steps = steps.filter((next) => next.captures[favoured] > state.captures[favoured]);
          result = steps.some((next) => forced(next, replies));
        }
      } else {
        result = steps.some((next) => forced(next, replies));
      }
    } else {
      result = steps.slice(0, defences).every((next) => {
        const after = passesOwed(next);
        const turnOver = after.status !== GAME_STATUS.playing || after.toPlay !== other;
        return forced(next, begun && turnOver ? replies - 1 : replies);
      });
    }
    memo.set(key, result);
    return result;
  };

  return forced(start, HEAD_START_HORIZON);
}

/**
 * The verdict for a game and a number of free turns: `decides` where some board,
 * seed and colour given the turns can force a decision; `unknown` where a search
 * ran past its budget and nothing decided; `safe` otherwise.
 */
export function measureHeadStart(variant: RuleVariant, freeTurns: number, budget: number = HEAD_START_BUDGET): HeadStartVerdict {
  for (const size of measuredSizes(variant)) {
    for (const seed of measuredSeeds(variant)) {
      for (const favoured of [STONES.black, STONES.white]) {
        const base = createGame({ variant, size, seed, allowUndo: false });
        // Set on the position directly, past the game's own limit, because the limit is what this measures.
        const state: GameState = { ...base, settings: { ...base.settings, headStart: { stone: favoured, freeTurns, traditional: 0 } } };
        try {
          if (forcedFrom(state, favoured, budget, FIRST_DEFENCES) && forcedFrom(state, favoured, budget, Number.POSITIVE_INFINITY)) {
            return { kind: "decides", favoured, size, seed };
          }
        } catch (error) {
          if (!(error instanceof OverBudget)) throw error;
          // One board, seed or colour nobody can show safe is enough: the figure is not shown safe.
          return { kind: "unknown", favoured, size, seed };
        }
      }
    }
  }
  return { kind: "safe" };
}
