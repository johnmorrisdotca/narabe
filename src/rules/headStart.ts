import {
  GAME_STATUS,
  NO_HEAD_START,
  STAR_POINTS,
  STONES,
  TRADITIONAL_HEAD_STARTS,
  VARIANT_SPECS,
} from "../constants.ts";
import type {
  Cell,
  GameSettings,
  GameState,
  HeadStart,
  Move,
  Point,
  RuleVariant,
  Stone,
  TraditionalHeadStart,
  VariantSpec,
} from "../types.ts";
import { otherStone, samePoint } from "./board.ts";
import { isDarkSquare } from "./checkers.ts";
import { KOMI } from "./go.ts";
import { leavesNoStone } from "./stoneless.ts";

/*
 * A HEAD START: what a stronger player gives a weaker one so the game is worth
 * playing — John's "Free moves + traditional".
 *
 * Two parts, and a game may carry either or both. Free turns are for every
 * game: the colour given them plays its first turns with nothing between, and
 * each turn it takes is written down as the other colour's pass, so the record
 * replays to the same board through `passTurn` like any other. The traditional
 * part is the game's own custom, read off its spec — Go's handicap stones on
 * the star points, Othello's corners, draughts' odds of a man — and is part of
 * the starting position, never the record.
 *
 * A head start is a handicap for every question a rating asks: `hasHandicap`
 * answers yes for one, so it moves nobody's rating by the same rule.
 */

/** The komi of a Go game played with handicap stones: half a point, so it still cannot tie. */
export const HEAD_START_KOMI = 0.5;

/** Othello gives up to all four corners; draughts odds are given a man at a time, to three. */
const MOST_CORNERS = 4;
const MOST_MEN = 3;

/**
 * The head start a settings object carries, or none. A game stored or kept in
 * a browser before head starts existed has no field at all, and that game was
 * an even one — so absent reads as none, never as a start nobody gave.
 */
export function headStartOf(settings: { headStart?: HeadStart | null }): HeadStart {
  return settings.headStart ?? NO_HEAD_START;
}

/** Whether anybody has been given a start at all. */
export function hasHeadStart(settings: { headStart?: HeadStart | null }): boolean {
  const start = headStartOf(settings);
  return start.stone !== null && (start.freeTurns > 0 || start.traditional > 0);
}

/** The kind of traditional head start a game has, or null for a game with none (or one this deploy does not know). */
export function traditionalKind(variant: string): TraditionalHeadStart | null {
  const spec = VARIANT_SPECS[variant as RuleVariant] as VariantSpec | undefined;
  return spec?.headStart ?? null;
}

/**
 * How much of its traditional head start a game on this board may give, as the
 * choices to offer. Empty where it has none.
 *
 * Go counts the star points the board is drawn with: two to nine on 19×19, two
 * to five on the smaller boards, which mark only their corners and centre. A
 * single stone is not offered — Go's "one-stone handicap" is taking Black with
 * no komi, which is not a stone on the board at all.
 */
export function traditionalCounts(variant: string, size: number): readonly number[] {
  switch (traditionalKind(variant)) {
    case TRADITIONAL_HEAD_STARTS.stones: {
      const stars = (STAR_POINTS[size] ?? []).length;
      return stars < 2 ? [] : upTo(2, stars);
    }
    case TRADITIONAL_HEAD_STARTS.corners:
      return upTo(1, MOST_CORNERS);
    case TRADITIONAL_HEAD_STARTS.men:
      return upTo(1, MOST_MEN);
    default:
      return [];
  }
}

function upTo(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
}

/**
 * The free turns a game offers: one up to its declared `headStartTurns`, and
 * none where it declares none — the flipping games, where a single free turn
 * takes the other side's last disc, and the small boards a free turn wins.
 */
export function freeTurnsOffered(variant: string): readonly number[] {
  const spec = VARIANT_SPECS[variant as RuleVariant] as VariantSpec | undefined;
  return spec === undefined ? [] : upTo(1, spec.headStartTurns);
}

/**
 * A head start that agrees with its game and board: free turns among those the
 * game offers, a traditional part the game has at this size, and no colour at
 * all where nothing is left. Anything it cannot read comes out as less, never
 * as more — the safe direction for a start somebody may not have agreed to. So
 * free turns above the game's own most are refused, whether they arrive from a
 * stale address, a request or a stored row: a head start that could decide the
 * game is not given at all.
 */
export function normaliseHeadStart(settings: { variant: string; size: number; headStart?: HeadStart | null }): HeadStart {
  const { stone, freeTurns, traditional } = headStartOf(settings);
  if (stone !== STONES.black && stone !== STONES.white) return NO_HEAD_START;
  const turns = freeTurnsOffered(settings.variant).includes(freeTurns) ? freeTurns : 0;
  const extra = traditionalCounts(settings.variant, settings.size).includes(traditional) ? traditional : 0;
  return turns === 0 && extra === 0 ? NO_HEAD_START : { stone, freeTurns: turns, traditional: extra };
}

/** Whether handicap stones are on the board, which is what moves White to the first move and changes the komi. */
function handicapStones(settings: { variant: string; size: number; headStart?: HeadStart | null }): boolean {
  const start = headStartOf(settings);
  return (
    start.stone !== null &&
    traditionalKind(settings.variant) === TRADITIONAL_HEAD_STARTS.stones &&
    traditionalCounts(settings.variant, settings.size).includes(start.traditional)
  );
}

/**
 * The colour that must open because of a head start, or null where the head
 * start says nothing about it. Only handicap stones do: they ARE the given
 * colour's opening moves, so the other colour plays next — White first in an
 * ordinary handicap game.
 */
export function headStartOpener(settings: { variant: string; size: number; headStart?: HeadStart | null }): Stone | null {
  const start = headStartOf(settings);
  return start.stone !== null && handicapStones(settings) ? otherStone(start.stone) : null;
}

/** The komi a Go game is counted with: the usual, or half a point where handicap stones were given. */
export function komiFor(settings: { variant: string; size: number; headStart?: HeadStart | null }): number {
  return handicapStones(settings) ? HEAD_START_KOMI : KOMI;
}

/**
 * Where handicap stones go, in the order they are given: the far corners from
 * Black's side first (upper right, lower left), then the other two, then the
 * centre on an odd count, then the side points. The customary placement.
 */
export function handicapStonePoints(size: number, count: number): Point[] {
  const stars = STAR_POINTS[size] ?? [];
  if (stars.length === 0) return [];
  const near = Math.min(...stars.map((point) => point.row));
  const far = size - 1 - near;
  const mid = (size - 1) / 2;
  const corners: Point[] = [
    { row: near, col: far },
    { row: far, col: near },
    { row: far, col: far },
    { row: near, col: near },
  ];
  const centre: Point = { row: mid, col: mid };
  const leftRight: Point[] = [
    { row: mid, col: near },
    { row: mid, col: far },
  ];
  const topBottom: Point[] = [
    { row: near, col: mid },
    { row: far, col: mid },
  ];
  const layouts: Record<number, Point[]> = {
    2: corners.slice(0, 2),
    3: corners.slice(0, 3),
    4: corners,
    5: [...corners, centre],
    6: [...corners, ...leftRight],
    7: [...corners, ...leftRight, centre],
    8: [...corners, ...leftRight, ...topBottom],
    9: [...corners, ...leftRight, ...topBottom, centre],
  };
  // Only ever points the board marks: a layout reaching past them is not the custom.
  return (layouts[count] ?? []).filter((point) => stars.some((star) => samePoint(star, point)));
}

/** The corners an Othello head start gives, in order: a1, h8, h1, a8. */
export function cornerPoints(size: number, count: number): Point[] {
  const last = size - 1;
  const corners: Point[] = [
    { row: 0, col: 0 },
    { row: last, col: last },
    { row: 0, col: last },
    { row: last, col: 0 },
  ];
  return corners.slice(0, Math.max(0, Math.min(count, MOST_CORNERS)));
}

/** The pieces a head start sets out before anybody moves: handicap stones or corners. */
export function headStartPieces(settings: GameSettings): { point: Point; stone: Stone }[] {
  const { stone, traditional } = headStartOf(settings);
  if (stone === null || !traditionalCounts(settings.variant, settings.size).includes(traditional)) return [];
  const kind = traditionalKind(settings.variant);
  const points =
    kind === TRADITIONAL_HEAD_STARTS.stones
      ? handicapStonePoints(settings.size, traditional)
      : kind === TRADITIONAL_HEAD_STARTS.corners
        ? cornerPoints(settings.size, traditional)
        : [];
  return points.map((point) => ({ point, stone }));
}

/**
 * The men draughts odds take off the stronger side: from its own back row,
 * starting at its left as that player sits — Black sits at the top of the
 * board, so its left is the right-hand end of row 0; White's is the left-hand
 * end of the bottom row. Read off the board as it was set out, so only men that
 * are there are taken.
 */
export function headStartOdds(settings: GameSettings, board: readonly Cell[]): Point[] {
  const { stone, traditional } = headStartOf(settings);
  if (stone === null || traditionalKind(settings.variant) !== TRADITIONAL_HEAD_STARTS.men) return [];
  if (!traditionalCounts(settings.variant, settings.size).includes(traditional)) return [];
  const stronger = otherStone(stone);
  const { size } = settings;
  const row = stronger === STONES.black ? 0 : size - 1;
  const cols = Array.from({ length: size }, (_, index) => (stronger === STONES.black ? size - 1 - index : index));
  return cols
    .map((col) => ({ row, col }))
    .filter((point) => isDarkSquare(point) && board[point.row * size + point.col] === stronger)
    .slice(0, traditional);
}

/** Head-start turns given so far: the passes the record says a head start took. */
export function headStartTurnsGiven(moves: readonly Move[]): number {
  return moves.reduce((given, move) => (move.headStart === true ? given + 1 : given), 0);
}

/**
 * Whether the head start is behind the game: the colour given it has played,
 * and the other colour has since made a turn of its own. From then on nothing
 * more is owed, whatever is left — a head start is at the start.
 */
function headStartSpent(moves: readonly Move[], given: Stone): boolean {
  let begun = false;
  for (const move of moves) {
    if ((move.by ?? move.stone) === given) {
      if (!leavesNoStone(move.kind)) begun = true;
      continue;
    }
    if (begun && move.headStart !== true) return true;
  }
  return false;
}

/**
 * Whether the colour to move owes the other a free turn: its turn is one of
 * the head start's, and passes on the record.
 *
 * True just after the colour given the start has finished a turn of its own —
 * a stone, a move, a piece, a twist — while turns remain and the start is not
 * spent. Not after a pass or a turn lost on time: a turn with nothing in it is
 * not a turn the head start gave. Cheap when nobody has a start, which is
 * nearly every game, because `isLegalMove` asks it of every point.
 */
export function owesHeadStart(state: GameState): boolean {
  const { stone, freeTurns } = headStartOf(state.settings);
  if (stone === null || freeTurns <= 0) return false;
  if (state.status !== GAME_STATUS.playing || state.pendingTwist || state.toPlay === stone) return false;
  const last = state.moves[state.moves.length - 1];
  if (last === undefined || leavesNoStone(last.kind) || (last.by ?? last.stone) !== stone) return false;
  if (headStartTurnsGiven(state.moves) >= freeTurns) return false;
  return !headStartSpent(state.moves, stone);
}

/**
 * The head-start turn the latest move gave, as the boards announce it: whose
 * start it is, which of its free turns this was, and how many there are. Null
 * where the latest move is anything else — so the notice is there for exactly
 * the moment the turn came back, and gone with the next move.
 */
export function headStartTurnTaken(state: GameState): { stone: Stone; turn: number; of: number } | null {
  const last = state.moves[state.moves.length - 1];
  if (last === undefined || last.headStart !== true || state.status !== GAME_STATUS.playing) return null;
  return { stone: otherStone(last.stone), turn: headStartTurnsGiven(state.moves), of: headStartOf(state.settings).freeTurns };
}
