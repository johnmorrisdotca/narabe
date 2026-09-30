import { expect } from "vitest";
import {
  canPass,
  createGame,
  emptyPoints,
  inMovePhase,
  legalPoints,
  movePiece,
  mustPass,
  passTurn,
  piecePlacements,
  pieceMoves,
  placePiece,
  playMove,
  singlesLeft,
  twistBoard,
} from "../engine.ts";
import { GAME_STATUS, STONES } from "../constants.ts";
import type { GameSettings, GameState, Point } from "../types.ts";
import { canChooseColour, canExtendOpening, chooseColour, extendOpening } from "../rules/opening.ts";
import { checkCheckersMove, isCheckers } from "./checkers.ts";
import { checkStarMove, isChineseCheckers } from "./chineseCheckers.ts";
import { checkGoPass, isGo } from "./go.ts";
import { checkHeadStartPass, checkHeadStartStart, headStartDueByHand } from "./headStart.ts";
import {
  bruteForceWinner,
  checkMove,
  checkPass,
  checkPiece,
  checkRaceMove,
  checkSlide,
  checkTwist,
  isRace,
  runWinsIndependently,
  SLIDE_CAP,
} from "./checks.ts";

/**
 * The whole-game simulation harness, shared by the simulation specs.
 *
 * Whole games, played end to end, checked against invariants.
 *
 * The unit tests elsewhere check positions someone thought to write down.
 * This plays complete random games instead, so it reaches positions nobody
 * would think of — and it is cheap, because the engine is pure and needs no
 * browser. A failure prints the seed, and replaying that seed reproduces the
 * game exactly.
 */

/** Small, fast, and reproducible. The seed is the whole bug report. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Plays one game to its end, checking every move on the way.
 *
 * `slideCap` calls off a game of moving pieces after that many turns; the
 * shared cap suits a sweep of every game, and a suite that means to see a
 * game of draughts through to its result asks for a longer one.
 */
function playOut(settings: Partial<GameSettings>, seed: number, slideCap: number = SLIDE_CAP): GameState {
  const random = rng(seed);
  let state = createGame({ allowUndo: true, ...settings }, random());
  // A traditional head start is part of the position before anybody moves.
  checkHeadStartStart(state, seed);
  let guard = 0;
  let headStartTurns = 0;
  let slides = 0;

  while (state.status === GAME_STATUS.playing) {
    const open = emptyPoints(state);
    if (open.length === 0) break;

    /*
     * A head start's turn: worked out by hand, and then the engine must agree
     * that it is a pass the rules force. First, because in every game — Go and
     * the sliding games included, which otherwise never pass by compulsion — it
     * comes before anything else the colour to move might do.
     */
    const due = headStartDueByHand(state);
    expect(mustPass(state) || !due, `seed ${seed}: a head start's turn was not a forced pass`).toBe(true);
    if (due) {
      const passed = passTurn(state);
      expect(passed, `seed ${seed}: a head start's pass was refused`).not.toBe(state);
      checkHeadStartPass(state, passed, seed);
      state = passed;
      /*
       * Counted on its own rather than against the game's guard, which is a
       * budget of points on the board: a head start's pass fills none, and there
       * are never more of them than the three free turns anybody can give.
       */
      headStartTurns += 1;
      expect(headStartTurns, `seed ${seed}: more head-start turns than free turns`).toBeLessThanOrEqual(3);
      continue;
    }

    /*
     * The swap openings: a seat is being asked to choose, not to play.
     *
     * Nothing legal is on the board while a decision is due — that is what
     * being asked means — so a simulator that only ever places stones reads a
     * swap game as a deadlock and blames the engine for it. That is how these
     * openings came to be the one part of the rules nothing ever played out.
     *
     * Chosen at random, including the option to decline and lay two more
     * stones where the protocol allows it, because the point is to reach the
     * positions a protocol can produce rather than to play any of them well.
     */
    if (canChooseColour(state)) {
      const before = state;
      const takingIt = canExtendOpening(state) && random() < 0.4;
      const after = takingIt
        ? extendOpening(state)
        : chooseColour(state, random() < 0.5 ? STONES.black : STONES.white);
      expect(after, `seed ${seed}: an opening choice was refused`).not.toBe(before);
      // A decision is kept, or a replayed game would take a different turning.
      expect(
        after.opening.choices.length,
        `seed ${seed}: an opening choice went unrecorded`,
      ).toBe(before.opening.choices.length + 1);
      state = after;
      guard += 1;
      expect(guard, `seed ${seed}: the opening did not settle`).toBeLessThanOrEqual(
        state.settings.size * state.settings.size + 1,
      );
      continue;
    }

    /*
     * The sliding games: every piece is down, so a turn moves one. Random
     * sliding need not ever end, so it is called off after a while.
     */
    if (inMovePhase(state)) {
      const pieces = emptyPoints(state).length === 0 ? [] : ownPieces(state);
      const movable = pieces.filter((piece) => pieceMoves(state, piece).length > 0);
      expect(movable.length, `seed ${seed}: no piece can move`).toBeGreaterThan(0);
      const from = movable[Math.floor(random() * movable.length)];
      const options = pieceMoves(state, from);
      const to = options[Math.floor(random() * options.length)];
      const before = state;
      const after = movePiece(state, from, to);
      expect(after, `seed ${seed}: a legal slide was refused`).not.toBe(before);
      if (isRace(state.settings.variant)) checkRaceMove(before, after, from, to, seed);
      else if (isCheckers(state.settings.variant)) checkCheckersMove(before, after, from, to, seed);
      else if (isChineseCheckers(state.settings.variant)) checkStarMove(before, after, from, to, seed);
      else checkSlide(before, after, from, to, seed);
      state = after;
      // A capture chain keeps the same player on move, so it must not count
      // against the slide cap the way an ordinary turn does, or a long chain
      // could be cut off mid-move.
      if (after.chainAt === null) slides += 1;
      if (slides >= slideCap) break;
      continue;
    }

    /*
     * Go: pass whenever nothing is legal, and now and then even when
     * something is, so random play actually reaches the double pass that
     * ends the game rather than only ever filling the board.
     */
    if (isGo(state.settings.variant)) {
      const legal = legalPoints(state);
      if (legal.length === 0 || random() < 0.08) {
        expect(canPass(state), `seed ${seed}: go could not pass`).toBe(true);
        const passed = passTurn(state);
        expect(passed, `seed ${seed}: a pass was refused`).not.toBe(state);
        checkGoPass(state, passed, seed);
        state = passed;
        guard += 1;
        if (state.status !== GAME_STATUS.playing) break;
        expect(guard, `seed ${seed}: go did not terminate`).toBeLessThanOrEqual(
          state.settings.size * state.settings.size * 4 + 100,
        );
        continue;
      }
      const point = legal[Math.floor(random() * legal.length)];
      const before = state;
      const after = playMove(state, point);
      expect(after, `seed ${seed}: a legal go move was refused`).not.toBe(before);
      checkMove(before, after, point, seed);
      state = after;
      guard += 1;
      if (state.status !== GAME_STATUS.playing) break;
      expect(guard, `seed ${seed}: go did not terminate`).toBeLessThanOrEqual(
        state.settings.size * state.settings.size * 4 + 100,
      );
      continue;
    }

    /*
     * The piece games: lay the piece in hand somewhere it fits, now and then
     * a single instead, and pass on the record when nothing fits at all.
     */
    if (queueOf(state) !== null) {
      if (mustPass(state)) {
        const passed = passTurn(state);
        expect(passed, `seed ${seed}: a due pass was refused`).not.toBe(state);
        checkPass(state, passed, seed);
        state = passed;
        guard += 1;
        continue;
      }
      const options = piecePlacements(state);
      const wantSingle = singlesLeft(state) > 0 && (options.length === 0 || random() < 0.15);
      const single = wantSingle ? legalPoints(state) : [];
      if (single.length > 0) {
        const point = single[Math.floor(random() * single.length)];
        const after = playMove(state, point);
        expect(after).not.toBe(state);
        checkMove(state, after, point, seed);
        state = after;
      } else {
        const cells = options[Math.floor(random() * options.length)];
        const after = placePiece(state, cells);
        expect(after, `seed ${seed}: a fitting piece was refused`).not.toBe(state);
        checkPiece(state, after, cells, seed);
        state = after;
      }
      guard += 1;
      expect(guard, `seed ${seed}: game did not terminate`).toBeLessThanOrEqual(
        state.settings.size * state.settings.size + 1,
      );
      continue;
    }

    const legal = legalPoints(state);
    /*
     * A live game with room on the board and nothing legal to play is a
     * deadlock: the engine refuses a forbidden move rather than losing on it,
     * so a colour with every empty point forbidden would never move again.
     * Whether that is reachable is exactly the sort of thing a simulator is
     * for, so it is an assertion rather than a `break`.
     */
    expect(
      legal.length,
      `seed ${seed}: no legal move with ${open.length} empty points ` +
        `(${settings.variant ?? "freestyle"}, move ${state.moves.length})`,
    ).toBeGreaterThan(0);

    // Everything the engine calls legal must actually be accepted, and nothing else.
    const rejected = legal.find((p) => playMove(state, p) === state);
    expect(rejected, `seed ${seed}: legalPoints offered a move playMove refused`)
      .toBeUndefined();

    const point = legal[Math.floor(random() * legal.length)];
    const before = state;
    // Where the mover may choose the colour, choose at random, so both are exercised.
    const chosen =
      state.settings.variant === "makerBreaker" || state.settings.variant === "wildTicTacToe"
        ? random() < 0.5
          ? "black"
          : "white"
        : null;
    const after = playMove(state, point, "place", chosen);

    expect(after, `seed ${seed}: a legal move was refused`).not.toBe(before);
    checkMove(before, after, point, seed);
    state = after;

    // A twist game owes a quarter turn before the move is complete.
    if (state.pendingTwist) {
      const quadrants = (state.settings.size / (quadrantSizeOf(state) ?? 1)) ** 2;
      const quadrant = Math.floor(random() * quadrants);
      const clockwise = random() < 0.5;
      const turned = twistBoard(state, quadrant, clockwise);
      expect(turned, `seed ${seed}: a twist was refused`).not.toBe(state);
      checkTwist(state, turned, seed);
      state = turned;
    }

    guard += 1;
    // Captures and clears free points, so a game may outlast the board's count.
    const freed =
      state.captures.black +
      state.captures.white +
      state.moves.reduce((total, move) => total + (move.cleared?.length ?? 0), 0);
    expect(guard, `seed ${seed}: game did not terminate`).toBeLessThanOrEqual(
      state.settings.size * state.settings.size + freed + 1,
    );
  }

  return state;
}

/** The points holding the mover's pieces. */
function ownPieces(state: GameState): Point[] {
  const points: Point[] = [];
  state.board.forEach((cell, index) => {
    if (cell === state.toPlay) {
      points.push({ row: Math.floor(index / state.settings.size), col: index % state.settings.size });
    }
  });
  return points;
}

/** Which games draw pieces from a queue, restated by hand. */
function queueOf(state: GameState): "domino" | "tetro" | null {
  if (state.settings.variant === "dominoFive") return "domino";
  if (state.settings.variant === "blockFive") return "tetro";
  return null;
}

/** The quadrant side of a twist game, read by hand from the board rather than the spec: 3 on 6×6, 2 on 4×4. */
function quadrantSizeOf(state: GameState): number | null {
  if (state.settings.variant === "twistFive") return 3;
  if (state.settings.variant === "twistFour") return 2;
  return null;
}


export { rng, bruteForceWinner, runWinsIndependently, checkMove, playOut };
