import { describe, expect, it } from "vitest";
import {
  canSwapSeats,
  cellAt,
  createGame,
  forbiddenPoints,
  isLegalMove,
  playMove,
  stonesLeft,
} from "../engine.ts";
import {
  FORBIDDEN_PATTERNS,
  GAME_STATUS,
  LINE_RULES,
  NO_HANDICAP,
  OPENING_RULES,
  RULE_VARIANTS,
  STONES,
} from "../constants.ts";
import { fromDiagram, show } from "../test-support.ts";
import type { GameSettings, GameState, Handicap, Point } from "../types.ts";
import { hasHandicap, rulesFor } from "./handicap.ts";

const p = (row: number, col: number): Point => ({ row, col });

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

/** A handicap on black with the given toggles set. */
function blackHandicap(overrides: Partial<Handicap>): Handicap {
  return { ...NO_HANDICAP, stone: STONES.black, ...overrides };
}

function settingsWith(handicap: Partial<Handicap>, extra: Partial<GameSettings> = {}) {
  return createGame({ handicap: blackHandicap(handicap), ...extra }).settings;
}

describe("rulesFor", () => {
  it("returns the variant's rules when nobody is handicapped", () => {
    const settings = createGame({ variant: RULE_VARIANTS.renju }).settings;
    expect(hasHandicap(settings)).toBe(false);
    expect(rulesFor(settings, STONES.black)).toEqual({
      lineRule: LINE_RULES.exact,
      forbidden: [
        FORBIDDEN_PATTERNS.doubleThree,
        FORBIDDEN_PATTERNS.doubleFour,
        FORBIDDEN_PATTERNS.overline,
      ],
      captures: false,
      stonesPerTurn: 1,
      winLength: 5,
      secondStoneExclusion: 0,
    });
    expect(rulesFor(settings, STONES.white).forbidden).toEqual([]);
  });

  it("lays the handicap over the handicapped colour only", () => {
    const settings = settingsWith({ doubleThree: true, longerLine: true });
    expect(rulesFor(settings, STONES.black)).toMatchObject({
      forbidden: [FORBIDDEN_PATTERNS.doubleThree],
      winLength: 6,
    });
    expect(rulesFor(settings, STONES.white)).toMatchObject({ forbidden: [], winLength: 5 });
  });

  it("never loosens what the variant already imposes", () => {
    const settings = settingsWith(
      { exactLine: true, doubleThree: true },
      { variant: RULE_VARIANTS.caro },
    );
    // Caro's open-line rule is stricter than exact, and stays.
    expect(rulesFor(settings, STONES.black).lineRule).toBe(LINE_RULES.exactOpen);

    const renju = settingsWith({ doubleThree: true }, { variant: RULE_VARIANTS.renju });
    // Adding a pattern renju already forbids does not duplicate it.
    expect(rulesFor(renju, STONES.black).forbidden).toHaveLength(3);
  });

  it("tightens the line rule in order, and forbidding the overline implies exactly five", () => {
    expect(rulesFor(settingsWith({ exactLine: true }), STONES.black).lineRule).toBe(LINE_RULES.exact);
    expect(rulesFor(settingsWith({ overline: true }), STONES.black).lineRule).toBe(LINE_RULES.exact);
    expect(rulesFor(settingsWith({ openLine: true }), STONES.black).lineRule).toBe(LINE_RULES.exactOpen);
    expect(rulesFor(settingsWith({ exactLine: true, openLine: true }), STONES.black).lineRule).toBe(
      LINE_RULES.exactOpen,
    );
  });
});

describe("forbidden shapes as a handicap", () => {
  const cross = `
    . . . . . . . . .
    . . . . . . . . .
    . . . . x . . . .
    . . . . x . . . .
    . . x x . . . . .
    . . . . . . . . .
    . . . . . . . . .
    . . . . . . . . .
    . . . . . . . . .
  `;

  it("forbids black the double three in freestyle when the handicap says so", () => {
    const state = fromDiagram(cross, {
      settings: { handicap: blackHandicap({ doubleThree: true }) },
      toPlay: STONES.black,
    });
    expect(isLegalMove(state, p(4, 4))).toBe(false);
    expect(show(forbiddenPoints(state))).toEqual(show([p(4, 4)]));
    expect(playMove(state, p(4, 4))).toBe(state);
  });

  it("leaves white free to make the same shape", () => {
    const state = fromDiagram(cross.replaceAll("x", "o"), {
      settings: { handicap: blackHandicap({ doubleThree: true }) },
      toPlay: STONES.white,
    });
    expect(isLegalMove(state, p(4, 4))).toBe(true);
    expect(forbiddenPoints(state)).toEqual([]);
  });

  it("can forbid the overline while still letting the other side win with one", () => {
    const six = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . x x . x x x . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    const black = fromDiagram(six, {
      settings: { handicap: blackHandicap({ overline: true }) },
      toPlay: STONES.black,
    });
    expect(isLegalMove(black, p(4, 3))).toBe(false);

    const white = fromDiagram(six.replaceAll("x", "o"), {
      settings: { handicap: blackHandicap({ overline: true }) },
      toPlay: STONES.white,
    });
    expect(playMove(white, p(4, 3)).winner).toBe(STONES.white);
  });

  it("forbids the double four on its own", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . x . . . .
        . . . . x . . . .
        . . . . x . . . .
        . x x x . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      { settings: { handicap: blackHandicap({ doubleFour: true }) }, toPlay: STONES.black },
    );
    expect(isLegalMove(state, p(4, 4))).toBe(false);
    // A plain four-three is still fine: only the double four was forbidden.
    const fourThree = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . x . . . .
        . . . . x . . . .
        . x x x . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      { settings: { handicap: blackHandicap({ doubleFour: true }) }, toPlay: STONES.black },
    );
    expect(isLegalMove(fourThree, p(4, 4))).toBe(true);
  });
});

describe("line handicaps", () => {
  const six = `
    . . . . . . . . .
    . . . . . . . . .
    . . . . . . . . .
    . . . . . . . . .
    . x x . x x x . .
    . . . . . . . . .
    . . . . . . . . .
    . . . . . . . . .
    . . . . . . . . .
  `;

  it("exactly five: black's overline does not win, white's does", () => {
    const black = fromDiagram(six, {
      settings: { handicap: blackHandicap({ exactLine: true }) },
      toPlay: STONES.black,
    });
    const next = playMove(black, p(4, 3));
    expect(next).not.toBe(black);
    expect(next.status).toBe(GAME_STATUS.playing);

    const white = fromDiagram(six.replaceAll("x", "o"), {
      settings: { handicap: blackHandicap({ exactLine: true }) },
      toPlay: STONES.white,
    });
    expect(playMove(white, p(4, 3)).winner).toBe(STONES.white);
  });

  it("open line only: a five shut in at both ends does not win for black", () => {
    const shut = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      o x x x x . o . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    const black = fromDiagram(shut, {
      settings: { handicap: blackHandicap({ openLine: true }) },
      toPlay: STONES.black,
    });
    expect(playMove(black, p(4, 5)).status).toBe(GAME_STATUS.playing);

    const plain = fromDiagram(shut, { toPlay: STONES.black });
    expect(playMove(plain, p(4, 5)).status).toBe(GAME_STATUS.won);
  });

  it("one more in a row: black needs six while white needs five", () => {
    const fiveEach = `
      . . . . . . . . .
      . . . . . . . . .
      . x x x x . . . .
      . . . . . . . . .
      . o o o o . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    const options = { settings: { handicap: blackHandicap({ longerLine: true }) } };
    const black = fromDiagram(fiveEach, { ...options, toPlay: STONES.black });
    const afterFive = playMove(black, p(2, 5));
    expect(afterFive.status).toBe(GAME_STATUS.playing);
    expect(playMove(afterFive, p(4, 5)).winner).toBe(STONES.white);

    const sixth = playMove(playMove(afterFive, p(8, 8)), p(2, 6));
    expect(sixth.winner).toBe(STONES.black);
    expect(sixth.winningLine).toHaveLength(6);
  });
});

describe("turn and capture handicaps", () => {
  it("one stone a turn in connect6 for the handicapped colour only", () => {
    let game = createGame({
      variant: RULE_VARIANTS.connect6,
      size: 19,
      handicap: blackHandicap({ singleStone: true }),
    });
    game = playMove(game, p(9, 9));
    expect(game.toPlay).toBe(STONES.white);
    expect(stonesLeft(game)).toBe(2);
    game = play(game, [p(9, 10), p(9, 11)]);
    expect(game.toPlay).toBe(STONES.black);
    expect(stonesLeft(game)).toBe(1);
    game = playMove(game, p(10, 10));
    // Black's single stone hands the turn straight back.
    expect(game.toPlay).toBe(STONES.white);
  });

  it("no captures: black's flank takes nothing, white's still does", () => {
    const flank = `
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . x o o . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
      . . . . . . . . .
    `;
    const settings = {
      variant: RULE_VARIANTS.ninuki,
      handicap: blackHandicap({ noCaptures: true }),
    } as const;
    const black = fromDiagram(flank, { settings, toPlay: STONES.black });
    const next = playMove(black, p(4, 4));
    expect(cellAt(next, p(4, 2))).toBe(STONES.white);
    expect(next.captures.black).toBe(0);

    const white = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . o x x . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      { settings, toPlay: STONES.white },
    );
    const taken = playMove(white, p(4, 4));
    expect(cellAt(taken, p(4, 2))).toBeNull();
    expect(taken.captures.white).toBe(2);
  });
});

describe("second stone exclusion", () => {
  it("keeps the handicapped colour's second stone out of the centre", () => {
    const game = play(
      createGame({ handicap: blackHandicap({ secondStoneExclusion: 2 }) }),
      [p(7, 7), p(7, 8)],
    );
    expect(isLegalMove(game, p(8, 8))).toBe(false);
    expect(isLegalMove(game, p(10, 10))).toBe(true);
    // White's second stone is not restricted.
    const later = play(game, [p(10, 10)]);
    expect(isLegalMove(later, p(8, 8))).toBe(true);
  });

  it("applies whichever colour opened", () => {
    const game = play(
      createGame({
        handicap: { ...NO_HANDICAP, stone: STONES.white, secondStoneExclusion: 3 },
      }),
      [p(7, 7), p(7, 8), p(6, 6)],
    );
    expect(game.toPlay).toBe(STONES.white);
    expect(isLegalMove(game, p(9, 9))).toBe(false);
    expect(isLegalMove(game, p(11, 7))).toBe(true);
  });
});

describe("a handicap and the rest of the settings", () => {
  it("rules out the openings that swap colours", () => {
    const swap2 = createGame({
      opening: OPENING_RULES.swap2,
      handicap: blackHandicap({ doubleThree: true }),
    });
    expect(swap2.settings.opening).toBe(OPENING_RULES.free);

    const pro = createGame({
      opening: OPENING_RULES.pro,
      handicap: blackHandicap({ doubleThree: true }),
    });
    expect(pro.settings.opening).toBe(OPENING_RULES.pro);
  });

  it("switches the informal seat swap off", () => {
    const game = playMove(
      createGame({ allowSwap: true, handicap: blackHandicap({ longerLine: true }) }),
      p(7, 7),
    );
    expect(canSwapSeats(game)).toBe(false);
  });

  it("changes nothing when the handicap has no colour", () => {
    const plain = createGame();
    const idle = createGame({ handicap: { ...NO_HANDICAP, doubleThree: true, longerLine: true } });
    expect(rulesFor(idle.settings, STONES.black)).toEqual(rulesFor(plain.settings, STONES.black));
    expect(rulesFor(idle.settings, STONES.white)).toEqual(rulesFor(plain.settings, STONES.white));
  });
});
