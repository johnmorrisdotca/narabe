import { startingPieces } from "./camps.ts";
import { checkersRulesFor, checkersStartingPieces } from "./checkers.ts";
import { STAR_RADIUS, starStartingPieces } from "./chineseCheckers.ts";
import { startingDiscs } from "./flips.ts";
import {
  DEFAULT_SETTINGS,
  FIRST_PLAYERS,
  GAME_STATUS,
  OPENING_RULES,
  SEATS,
  SEED_RANGE,
  STONES,
  VARIANT_SPECS,
  defaultBoardFor,
} from "../constants.ts";
import { emptyBoard } from "../obstacles.ts";
import type { Cell, GameSettings, GameState, HeadStart, OpeningRule, Point, Seat, Stone } from "../types.ts";
import { otherStone } from "./board.ts";
import { hasHandicap } from "./handicap.ts";
import { hasHeadStart, headStartOdds, headStartOpener, headStartPieces, normaliseHeadStart } from "./headStart.ts";
import { initialOpening } from "./opening.ts";
import { seedFromRoll } from "./random.ts";

/**
 * Settings and the state a game starts from. Nothing here plays a move; it
 * decides what the players agreed to and lays out an empty board for it.
 */

/** Openings that move colours between seats, which a colour-bound handicap cannot survive. */
const SWAPPING_OPENINGS: readonly GameSettings["opening"][] = [
  OPENING_RULES.swap,
  OPENING_RULES.swap2,
  OPENING_RULES.rif,
];

/**
 * The openings these settings may use: what the variant offers, less the
 * colour-swapping ones when a handicap is bound to a colour — and only the free
 * opening under a head start. Pro and the renju protocols count stones from the
 * first, and a head start's free turns and starting pieces are exactly what
 * that count does not expect.
 */
export function availableOpenings(settings: GameSettings): OpeningRule[] {
  const offered = VARIANT_SPECS[settings.variant].openings;
  if (hasHeadStart(settings)) return offered.filter((opening) => opening === OPENING_RULES.free);
  return hasHandicap(settings)
    ? offered.filter((opening) => !SWAPPING_OPENINGS.includes(opening))
    : [...offered];
}

/**
 * Settings that agree with their variant: a pinned line length wins over the
 * player's choice, an opening the variant does not offer falls back to free,
 * and a handicap rules out the openings that swap colours. Applied on creation
 * so a state can never carry a contradiction.
 */
export function normaliseSettings(settings: GameSettings): GameSettings {
  const spec = VARIANT_SPECS[settings.variant];
  /*
   * A game with a board of its own is played on it; the rest take any size
   * they are given. A size it does not have falls to the board it OPENS on,
   * asked for by name — `boardSizes` is in numerical order now, so the front
   * of that list is the smallest and not the default: taking it would have
   * built Halma on the eight and Honeycomb on the 37-cell hexagon, silently,
   * for anything that asked for a board they do not come in.
   */
  const size =
    spec.boardSizes !== null && !spec.boardSizes.includes(settings.size)
      ? defaultBoardFor(settings.variant)
      : settings.size;
  // A head start the game and this board can give, or less: see `normaliseHeadStart`.
  const settled = { ...settings, size, headStart: normaliseHeadStart({ ...settings, size }) };
  return {
    ...settled,
    capturesToWin: spec.capturesToWin ?? settings.capturesToWin,
    winLength: spec.winLength ?? settings.winLength,
    opening: availableOpenings(settled).includes(settings.opening)
      ? settings.opening
      : OPENING_RULES.free,
  };
}

/**
 * The board a game of these settings begins on: empty, but for the pieces a
 * variant sets out before anybody moves.
 *
 * Lifted out of `createGame` so it can be asked on its own. Which way round a
 * board should be drawn for the person looking at it is a question about where
 * their colour starts, and the only honest answer to that is the position
 * itself — a second list of who begins where would be wrong the first time a
 * variant disagreed with it.
 */
export function startingBoard(settings: GameSettings): Cell[] {
  const spec = VARIANT_SPECS[settings.variant];
  const board = emptyBoard(settings);
  const place = (piece: { point: Point; stone: Stone }) => {
    board[piece.point.row * settings.size + piece.point.col] = piece.stone;
  };
  // A flipping game begins with the centre set; it is part of the position, not the record.
  for (const disc of startingDiscs(settings)) place(disc);
  // A race game begins with both camps full, likewise part of the position.
  if (spec.camps) for (const piece of startingPieces(settings)) place(piece);
  // Checkers begins with both sides' men filling their own rows — three, four or five, as the game says — likewise.
  if (spec.checkers) {
    for (const piece of checkersStartingPieces(settings.size, checkersRulesFor(settings).menRows)) place(piece);
  }
  // Chinese Checkers begins with both points full, likewise.
  if (spec.chineseCheckers) for (const piece of starStartingPieces(STAR_RADIUS)) place(piece);
  // A head start's handicap stones or corners are set out too, and odds of a man take the man away first.
  for (const point of headStartOdds(settings, board)) board[point.row * settings.size + point.col] = null;
  for (const piece of headStartPieces(settings)) place(piece);
  return board;
}

/**
 * The colour a game must open with whatever anybody asked for, or null where
 * the players may choose.
 *
 * A head start with handicap stones fixes it first: the stones are the given
 * colour's opening, so the other colour moves — `headStartOpener`. Asked with
 * the head start and the board it is laid on, which a writer has as well.
 *
 * Fixed where the game gives no choice — and then it is the game's own first
 * colour, which is White for the draughts games whose rules say so — and fixed
 * under any opening protocol, which always starts from that colour. Asked by
 * the engine when it builds a game, and by anything that WRITES a game down
 * before the engine has seen it: a stored opener the engine would overrule is
 * a row whose seats and names disagree with its own board.
 *
 * Null for a variant this deploy does not know, since there is nothing to fix
 * it to and the caller's own answer is the only one there is.
 */
export function fixedOpener(
  variant: string,
  opening: string,
  start?: { headStart: HeadStart; size: number },
): Stone | null {
  const spec = VARIANT_SPECS[variant as keyof typeof VARIANT_SPECS] as (typeof VARIANT_SPECS)[keyof typeof VARIANT_SPECS] | undefined;
  if (spec === undefined) return null;
  const given = start === undefined ? null : headStartOpener({ variant, ...start });
  if (given !== null) return given;
  if (!spec.allowFirstPlayerChoice || opening !== OPENING_RULES.free) return spec.firstStone;
  return null;
}

/**
 * The colour that opens. `random` is decided by `roll`, a number in [0, 1),
 * which the caller supplies so this stays pure and testable. Variants that
 * constrain black, and every opening protocol, put black on move one.
 */
export function resolveOpener(settings: GameSettings, roll = 0): Stone {
  const fixed = fixedOpener(settings.variant, settings.opening, settings);
  if (fixed !== null) return fixed;
  if (settings.firstPlayer === FIRST_PLAYERS.random) {
    return roll < 0.5 ? STONES.black : STONES.white;
  }
  return settings.firstPlayer;
}

export function createGame(
  overrides: Partial<GameSettings> = {},
  roll = 0,
): GameState {
  // A game asked for without a seed draws one from the roll, and keeps it.
  const seed = overrides.seed ?? seedFromRoll(roll, SEED_RANGE);
  const settings = normaliseSettings({ ...DEFAULT_SETTINGS, ...overrides, seed });
  const opener = resolveOpener(settings, roll);
  // Seat one always takes the opening colour, whichever that turned out to be.
  const seats = {
    [opener]: SEATS.one,
    [otherStone(opener)]: SEATS.two,
  } as Record<Stone, Seat>;

  const board = startingBoard(settings);

  return {
    settings,
    board,
    moves: [],
    opener,
    seats,
    swapsUsed: { one: 0, two: 0 },
    captures: { black: 0, white: 0 },
    opening: initialOpening(settings, opener, seats),
    toPlay: opener,
    pendingTwist: false,
    kings: [],
    chainAt: null,
    koPoint: null,
    status: GAME_STATUS.playing,
    winner: null,
    winBy: null,
    winningLine: [],
  };
}

