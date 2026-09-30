import type {
  WrapMode,
  Blocked,
  BoardGrid,
  CaptureChoice,
  CheckersRules,
  CrownMidCapture,
  EndgameCountKind,
  MoveNarrowing,
  PieceTally,
  TurnChoiceKind,
  DrawLimit,
  FirstPlayer,
  Hot,
  PieceQueue,
  Worm,
  ForbiddenPattern,
  GameSettings,
  GameStatus,
  Handicap,
  HandicapRule,
  HeadStart,
  HeadStartTurns,
  LineRule,
  MoveKind,
  ObstacleLayout,
  OpeningRule,
  OpeningStage,
  Placement,
  Point,
  RuleVariant,
  Seat,
  Stone,
  TraditionalHeadStart,
  VariantSpec,
  WinReason,
} from "./types.ts";
import { ROCK_PLACEMENTS } from "./rules/rocks.constants.ts";

export const STONES = {
  black: "black",
  white: "white",
} as const satisfies Record<Stone, Stone>;

export const BLOCKED: Blocked = "blocked";

export const HOT: Hot = "hot";

export const WORM: Worm = "worm";

/** Seeds are 31-bit integers, small enough for every store and reproducible everywhere. */
export const SEED_RANGE = 2 ** 31;

export const RULE_VARIANTS = {
  freestyle: "freestyle",
  standard: "standard",
  renju: "renju",
  omok: "omok",
  caro: "caro",
  ninuki: "ninuki",
  connect6: "connect6",
  tictactoe: "tictactoe",
  trapThree: "trapThree",
  dropFour: "dropFour",
  twistFive: "twistFive",
  twistFour: "twistFour",
  squareFour: "squareFour",
  ringDrop: "ringDrop",
  holeDrop: "holeDrop",
  hotDrop: "hotDrop",
  clearDrop: "clearDrop",
  giveawayDrop: "giveawayDrop",
  edgeDrop: "edgeDrop",
  dominoFive: "dominoFive",
  blockFive: "blockFive",
  sannuki: "sannuki",
  wormDrop: "wormDrop",
  misereFive: "misereFive",
  makerBreaker: "makerBreaker",
  wildTicTacToe: "wildTicTacToe",
  notakto: "notakto",
  toroidalFive: "toroidalFive",
  obstacleFive: "obstacleFive",
  rockfall: "rockfall",
  scatteredRocks: "scatteredRocks",
  reversi: "reversi",
  classicReversi: "classicReversi",
  antiReversi: "antiReversi",
  miniReversi: "miniReversi",
  grandReversi: "grandReversi",
  honeycomb: "honeycomb",
  halma: "halma",
  hex: "hex",
  hexFive: "hexFive",
  checkers: "checkers",
  internationalDraughts: "internationalDraughts",
  brazilianDraughts: "brazilianDraughts",
  canadianCheckers: "canadianCheckers",
  russianDraughts: "russianDraughts",
  poolCheckers: "poolCheckers",
  chineseCheckers: "chineseCheckers",
  go: "go",
} as const satisfies Record<RuleVariant, RuleVariant>;

export const WRAP_MODES = {
  none: "none",
  columns: "columns",
  both: "both",
} as const satisfies Record<WrapMode, WrapMode>;

export const PIECE_QUEUES = {
  domino: "domino",
  tetro: "tetro",
} as const satisfies Record<PieceQueue, PieceQueue>;

/** How many queued pieces a player is shown ahead of the one in hand. */
export const PIECE_PREVIEW = 3;

/** A pass has no point on the board. */
export const NO_POINT: Point = { row: -1, col: -1 };

/** The variants in the order the browser and the filters list them. */
export const RULE_VARIANT_LIST = [
  RULE_VARIANTS.freestyle,
  RULE_VARIANTS.standard,
  RULE_VARIANTS.renju,
  RULE_VARIANTS.omok,
  RULE_VARIANTS.caro,
  RULE_VARIANTS.ninuki,
  RULE_VARIANTS.sannuki,
  RULE_VARIANTS.connect6,
  RULE_VARIANTS.misereFive,
  RULE_VARIANTS.toroidalFive,
  RULE_VARIANTS.obstacleFive,
  RULE_VARIANTS.scatteredRocks,
  RULE_VARIANTS.rockfall,
  RULE_VARIANTS.makerBreaker,
  RULE_VARIANTS.dominoFive,
  RULE_VARIANTS.blockFive,
  RULE_VARIANTS.dropFour,
  RULE_VARIANTS.ringDrop,
  RULE_VARIANTS.holeDrop,
  RULE_VARIANTS.hotDrop,
  RULE_VARIANTS.clearDrop,
  RULE_VARIANTS.giveawayDrop,
  RULE_VARIANTS.edgeDrop,
  RULE_VARIANTS.wormDrop,
  RULE_VARIANTS.twistFive,
  RULE_VARIANTS.twistFour,
  RULE_VARIANTS.trapThree,
  RULE_VARIANTS.squareFour,
  RULE_VARIANTS.tictactoe,
  RULE_VARIANTS.wildTicTacToe,
  RULE_VARIANTS.notakto,
  RULE_VARIANTS.reversi,
  RULE_VARIANTS.classicReversi,
  RULE_VARIANTS.antiReversi,
  RULE_VARIANTS.miniReversi,
  RULE_VARIANTS.grandReversi,
  RULE_VARIANTS.honeycomb,
  RULE_VARIANTS.halma,
  RULE_VARIANTS.hex,
  RULE_VARIANTS.hexFive,
  RULE_VARIANTS.checkers,
  RULE_VARIANTS.internationalDraughts,
  RULE_VARIANTS.brazilianDraughts,
  RULE_VARIANTS.canadianCheckers,
  RULE_VARIANTS.russianDraughts,
  RULE_VARIANTS.poolCheckers,
  RULE_VARIANTS.chineseCheckers,
  RULE_VARIANTS.go,
] as const satisfies readonly RuleVariant[];

export const PLACEMENTS = {
  free: "free",
  drop: "drop",
  edge: "edge",
} as const satisfies Record<Placement, Placement>;

/** Where a game's stones sit when it is drawn its own way: on the crossings, or in the squares. */
export const BOARD_GRIDS = {
  lines: "lines",
  cells: "cells",
} as const satisfies Record<BoardGrid, BoardGrid>;

/** The traditional head starts, see TraditionalHeadStart. */
export const TRADITIONAL_HEAD_STARTS = {
  stones: "stones",
  corners: "corners",
  men: "men",
} as const satisfies Record<TraditionalHeadStart, TraditionalHeadStart>;

export const OPENING_RULES = {
  free: "free",
  pro: "pro",
  longPro: "longPro",
  swap: "swap",
  swap2: "swap2",
  rif: "rif",
  sakata: "sakata",
  tarannikov: "tarannikov",
} as const satisfies Record<OpeningRule, OpeningRule>;

export const OPENING_RULE_LIST = [
  OPENING_RULES.free,
  OPENING_RULES.pro,
  OPENING_RULES.longPro,
  OPENING_RULES.swap,
  OPENING_RULES.swap2,
  OPENING_RULES.rif,
  OPENING_RULES.sakata,
  OPENING_RULES.tarannikov,
] as const satisfies readonly OpeningRule[];

export const LINE_RULES = {
  atLeast: "atLeast",
  exact: "exact",
  exactOpen: "exactOpen",
} as const satisfies Record<LineRule, LineRule>;

export const FORBIDDEN_PATTERNS = {
  doubleThree: "doubleThree",
  doubleFour: "doubleFour",
  overline: "overline",
} as const satisfies Record<ForbiddenPattern, ForbiddenPattern>;

export const WIN_REASONS = {
  line: "line",
  captures: "captures",
  time: "time",
  resign: "resign",
  trap: "trap",
  square: "square",
  full: "full",
  count: "count",
  camp: "camp",
  connection: "connection",
  blocked: "blocked",
  territory: "territory",
} as const satisfies Record<WinReason, WinReason>;

export const OPENING_STAGES = {
  placing: "placing",
  choosing: "choosing",
  extending: "extending",
  done: "done",
} as const satisfies Record<OpeningStage, OpeningStage>;

/** The one opening choice that is not a colour. */
export const OPENING_CHOICE_EXTEND = "extend" as const;

/** Stones in a line needed to win, unless a variant pins it. */
export const WIN_LENGTH = 5;

/** Line lengths a player may pick in the variants that leave it open. */
export const WIN_LENGTHS = [4, 5, 6] as const;

/** Enemy stones to capture for a win in the capture game: five pairs. */
export const DEFAULT_CAPTURES_TO_WIN = 10;

/** The handicap toggles, in the order the settings list them. */
export const HANDICAP_RULES = [
  "doubleThree",
  "doubleFour",
  "overline",
  "exactLine",
  "openLine",
  "longerLine",
  "singleStone",
  "noCaptures",
] as const satisfies readonly HandicapRule[];

/** Half-widths of the central square a handicapped second stone must leave. */
export const SECOND_STONE_EXCLUSIONS = [0, 2, 3] as const;

export const NO_HANDICAP: Handicap = {
  stone: null,
  doubleThree: false,
  doubleFour: false,
  overline: false,
  exactLine: false,
  openLine: false,
  longerLine: false,
  singleStone: false,
  noCaptures: false,
  secondStoneExclusion: 0,
};

/** Nobody given a start: the even game, which is most games. */
export const NO_HEAD_START: HeadStart = { stone: null, freeTurns: 0, traditional: 0 };

/** The free turns a head start may give, none included. John chose one to three. */
export const HEAD_START_FREE_TURNS = [0, 1, 2, 3] as const;

const NO_PATTERNS: readonly ForbiddenPattern[] = [];
const RENJU_PATTERNS: readonly ForbiddenPattern[] = [
  FORBIDDEN_PATTERNS.doubleThree,
  FORBIDDEN_PATTERNS.doubleFour,
  FORBIDDEN_PATTERNS.overline,
];
const OMOK_PATTERNS: readonly ForbiddenPattern[] = [FORBIDDEN_PATTERNS.doubleThree];

/** Openings that suit any one-stone-a-turn game. */
const GOMOKU_OPENINGS: readonly OpeningRule[] = [
  OPENING_RULES.free,
  OPENING_RULES.pro,
  OPENING_RULES.longPro,
  OPENING_RULES.swap,
  OPENING_RULES.swap2,
];

const FREE_ONLY: readonly OpeningRule[] = [OPENING_RULES.free];

export const STARTING_DISCS = { none: "none", fixed: "fixed", laid: "laid" } as const;

/** The board a flipping game is played on, and the small ones it may grow from. */
const REVERSI_SIZES = [8] as const;
const MINI_REVERSI_SIZES = [4, 6, 8] as const;
/** The big board the play-by-mail sites offered beside the usual one. */
const GRAND_REVERSI_SIZES = [10] as const;
/** Halma's own board is the sixteen; the small ones carry the camps the game is played with on them. */
const HALMA_SIZES = [8, 10, 16] as const;
/** Hex as it is played: eleven a side, with the bigger boards the federations also use. */
const HEX_SIZES = [11, 13, 19] as const;
/**
 * The honeycomb's embedding squares: a hexagon of radius R sits in a
 * (2R+1)-square, so the four boards are hexagons of 37, 61, 91 and 127 cells
 * — four cells a side, five, six and seven.
 *
 * In numerical order, like every other list here, with the board the game
 * OPENS on said separately (`defaultBoard`): 91 is the one ItsYourTurn's
 * Hexversi is played on and the one a reader arriving from there expects, and
 * it used to be first in this list for that reason — which made the picker
 * read 11, 7, 9, 13.
 *
 * The centre is sealed on every one of them, which leaves an even count of
 * playable cells at every radius (`honeycombPlayable`) — the right parity for
 * a game decided by counting discs. Hex Five plays the same four hexagons —
 * see `hexFive` below — but a line game has no parity to keep, so its centre
 * is open: the first stone of a game may go there.
 */
const HONEYCOMB_SIZES = [7, 9, 11, 13] as const;
/** Checkers: the 8×8 board draughts is played on everywhere. */
const CHECKERS_SIZES = [8] as const;

export const CAPTURE_CHOICES = {
  free: "free",
  maximum: "maximum",
} as const satisfies Record<CaptureChoice, CaptureChoice>;

export const CROWN_MID_CAPTURE = {
  stops: "stops",
  continues: "continues",
  passes: "passes",
} as const satisfies Record<CrownMidCapture, CrownMidCapture>;

export const ENDGAME_COUNT_KINDS = {
  endings: "endings",
  balance: "balance",
} as const satisfies Record<EndgameCountKind, EndgameCountKind>;

export const MOVE_NARROWINGS = {
  capture: "capture",
  mostCaptured: "mostCaptured",
} as const satisfies Record<MoveNarrowing, MoveNarrowing>;

export const TURN_CHOICE_KINDS = {
  move: "move",
  place: "place",
} as const satisfies Record<TurnChoiceKind, TurnChoiceKind>;

/**
 * English draughts, American checkers: three rows of men, a man takes forward
 * only, a king moves one square, any capture may be chosen, and a man crowned
 * by a capture ends the move there. Exactly what rules/checkers.ts did before
 * any of this was data, and the Checkers tests that predate it still say so.
 */
export const ENGLISH_CHECKERS_RULES: CheckersRules = {
  menRows: 3,
  menCaptureBackward: false,
  flyingKings: false,
  captureChoice: CAPTURE_CHOICES.free,
  crownMidCapture: CROWN_MID_CAPTURE.stops,
  /*
   * None, and that is this game as it has always been played HERE, not the
   * English rulebook: the WCDF also draws a threefold repetition. Declared as
   * absent rather than added in passing, so that changing how an existing game
   * ends is a decision somebody takes on its own, not a side effect of adding
   * its relatives. Its long-running backstop is the forty-move count in
   * rules/noProgress.ts.
   */
  repetitionDraw: null,
  endgameCounts: [],
};

/** International draughts' own board, as the FMJD plays it. */
const INTERNATIONAL_DRAUGHTS_SIZES = [10] as const;
/** Brazilian draughts: the international rules on the 8×8 board. */
const BRAZILIAN_DRAUGHTS_SIZES = [8] as const;
/** Canadian checkers: the international rules on a 12×12 board. */
const CANADIAN_CHECKERS_SIZES = [12] as const;

/** A lone king: what every endgame count below is counted against. */
const LONE_KING: PieceTally = { kings: 1, men: 0 };

/**
 * International draughts, from the FMJD's official rules (Annex 1, 2018, and
 * the 2024 Annexes). Men take both ways (4.1), kings fly (3.9, 4.3), the
 * capture taking the most pieces is compulsory with a king counting as one
 * piece (4.13), a man crossing the far row mid-capture stays a man (4.15), and
 * taken pieces come off only once the capture is over and may not be jumped
 * twice (4.8, 4.11).
 *
 * The draws of article 6: a third repetition with the same side to move
 * (6.1); three pieces, one at least a king, against a lone king, sixteen more
 * moves each (6.3); two kings, a king and a man, or a king against a lone king,
 * five more moves each (6.4). The twenty-five-move kings-only count (6.2) is
 * the no-progress rule in rules/noProgress.ts.
 *
 * NOT APPLIED: the 2024 clause that cuts 6.3's sixteen moves to five when the
 * lone king "solely occupies" the long diagonal. The text does not say whether
 * the king must hold the diagonal from the start of the count or at its end,
 * nor what leaving it does, and a rule this site cannot read exactly must not
 * fire. Without it those endings run to sixteen moves each, which is the older
 * rule and the generous side of the new one.
 */
export const INTERNATIONAL_DRAUGHTS_RULES: CheckersRules = {
  menRows: 4,
  menCaptureBackward: true,
  flyingKings: true,
  captureChoice: CAPTURE_CHOICES.maximum,
  crownMidCapture: CROWN_MID_CAPTURE.passes,
  repetitionDraw: 3,
  endgameCounts: [
    {
      kind: ENDGAME_COUNT_KINDS.endings,
      restartsOnChange: false,
      endings: [
        [{ kings: 3, men: 0 }, LONE_KING],
        [{ kings: 2, men: 1 }, LONE_KING],
        [{ kings: 1, men: 2 }, LONE_KING],
      ],
      movesEach: 16,
    },
    {
      kind: ENDGAME_COUNT_KINDS.endings,
      restartsOnChange: false,
      endings: [
        [{ kings: 2, men: 0 }, LONE_KING],
        [{ kings: 1, men: 1 }, LONE_KING],
        [LONE_KING, LONE_KING],
      ],
      movesEach: 5,
    },
  ],
};

/**
 * Brazilian draughts: the international rules of capture and crowning on 8×8,
 * with twelve men, and the draws of the Brazilian confederation's own rules
 * (CBJD, Regras Oficiais) rather than the FMJD's 8×8 set, which differs. A
 * third repetition (art. 98), and five moves each for the small endings of
 * art. 99: two kings against two, two kings against one, two kings against a
 * king and a man, a king against a king, a king against a king and a man. Its
 * twenty-move kings-only count is in rules/noProgress.ts.
 *
 * NOT APPLIED: art. 100, five moves for three pieces against a lone king on the
 * long diagonal, for the same reason as the FMJD's version of it above. With
 * it left out, those endings are bounded by the kings-only count instead.
 */
export const BRAZILIAN_DRAUGHTS_RULES: CheckersRules = {
  ...INTERNATIONAL_DRAUGHTS_RULES,
  menRows: 3,
  endgameCounts: [
    {
      kind: ENDGAME_COUNT_KINDS.endings,
      restartsOnChange: false,
      endings: [
        [{ kings: 2, men: 0 }, { kings: 2, men: 0 }],
        [{ kings: 2, men: 0 }, LONE_KING],
        [{ kings: 2, men: 0 }, { kings: 1, men: 1 }],
        [LONE_KING, LONE_KING],
        [LONE_KING, { kings: 1, men: 1 }],
      ],
      movesEach: 5,
    },
  ],
};

/**
 * Canadian checkers: the international rules on 12×12, thirty men a side in
 * five rows. No federation's draw rules for it could be found — the Quebec
 * association's own site did not answer — so its draws are the FMJD's,
 * borrowed, and its rules page says so.
 */
export const CANADIAN_CHECKERS_RULES: CheckersRules = {
  ...INTERNATIONAL_DRAUGHTS_RULES,
  menRows: 5,
};

/** Russian draughts and Pool checkers: both on the 8×8 board. */
const RUSSIAN_DRAUGHTS_SIZES = [8] as const;
const POOL_CHECKERS_SIZES = [8] as const;

/**
 * Russian draughts (shashki), from the Russian Draughts Federation's rules
 * (ФШР, shashki.ru) and the FMJD/IDF rules for 8×8 draughts: men take both ways,
 * kings fly, any capture may be chosen whatever it takes (FMJD-64 4.13), and a
 * man that reaches the far row in the middle of a capture is crowned there and
 * carries on capturing as a king (4.14).
 *
 * Draws, as the federation writes them: a third repetition with the same side
 * to move; three kings or more that have not taken a lone king by their
 * fifteenth move, counted from when that balance arose; and any ending in which
 * both sides have a king and nothing is taken or crowned for five moves (two or
 * three pieces on the board), thirty (four or five) or sixty (six or seven).
 * Fifteen moves of kings alone is rules/noProgress.ts.
 *
 * NOT APPLIED: the five-move count for three pieces against a lone king on the
 * main road, for the reason given at INTERNATIONAL_DRAUGHTS_RULES; the "clearly
 * drawn position", which is an arbiter's judgement and not a count; and the
 * three-kings rule's "or kings and men", which the federation's own text leaves
 * unclear. It is read as kings alone, the narrower reading, so it never draws a
 * game it might not apply to.
 */
export const RUSSIAN_DRAUGHTS_RULES: CheckersRules = {
  menRows: 3,
  menCaptureBackward: true,
  flyingKings: true,
  captureChoice: CAPTURE_CHOICES.free,
  crownMidCapture: CROWN_MID_CAPTURE.continues,
  repetitionDraw: 3,
  endgameCounts: [
    {
      kind: ENDGAME_COUNT_KINDS.endings,
      restartsOnChange: true,
      // Three kings or more — up to the twelve a side can have — against a lone king.
      endings: Array.from({ length: 10 }, (_, extra) => [{ kings: 3 + extra, men: 0 }, LONE_KING] as const),
      movesEach: 15,
    },
    { kind: ENDGAME_COUNT_KINDS.balance, pieces: [2, 3], movesEach: 5 },
    { kind: ENDGAME_COUNT_KINDS.balance, pieces: [4, 5], movesEach: 30 },
    { kind: ENDGAME_COUNT_KINDS.balance, pieces: [6, 7], movesEach: 60 },
  ],
};

/**
 * Pool checkers, from the American Pool Checker Association's Tournament Rules
 * of Play (2016): men take both ways (rule 14), kings fly (15, 18), any capture
 * may be chosen — "not compelled to take the greater or lesser number" (20) —
 * and a capture once begun is completed (21). A man that must jump on out of
 * the king row stays a man, and one whose move ends there is crowned (22, 23).
 * Black moves first (7).
 *
 * The one count of the APCA's this site can read is the thirteen count (27):
 * three kings against a lone king, all four kings, drawn once the lone king has
 * made thirteen moves. Counted here as thirteen moves each, which is that
 * exactly when the lone king moves second in the ending and one move later for
 * the stronger side when it moves first — the generous side. There is no
 * repetition rule: the APCA has none outside its thirty-move rule.
 *
 * NOT APPLIED: the thirty-move rule (26), which the weaker side announces and
 * counts, in endgames the players themselves identify. Nobody announces
 * anything here, and a count that fired unasked would be a different rule. Nor
 * the five-move count for a lone king on the long line (28), as above. A game
 * going nowhere is ended instead by the site's own forty-move count in
 * rules/noProgress.ts, the same as Checkers', and the rules page says so.
 */
export const POOL_CHECKERS_RULES: CheckersRules = {
  menRows: 3,
  menCaptureBackward: true,
  flyingKings: true,
  captureChoice: CAPTURE_CHOICES.free,
  crownMidCapture: CROWN_MID_CAPTURE.passes,
  repetitionDraw: null,
  endgameCounts: [
    {
      kind: ENDGAME_COUNT_KINDS.endings,
      restartsOnChange: false,
      endings: [[{ kings: 3, men: 0 }, LONE_KING]],
      movesEach: 13,
    },
  ],
};
/** Chinese Checkers: the standard 121-hole hexagram, embedded in its own 17×17 square. */
const CHINESE_CHECKERS_SIZES = [17] as const;
/** Go's own three sizes: 19×19 as it is played seriously, 13 and 9 for a shorter game. */
const GO_SIZES = [9, 13, 19] as const;

/**
 * What a row may set, less the two things no builder supplies for it: where its
 * stones sit, and the most free turns it offers as a head start. Both are
 * declared by every game and never defaulted, so a new game that leaves either
 * out does not compile rather than getting a guess. The head-start figure is the
 * most the game's measurement shows cannot decide it (`headStartTurns`), and each
 * row says why beside it.
 */
type SpecOverrides = Partial<VariantSpec> & Pick<VariantSpec, "grid" | "headStartTurns">;

function plain(overrides: SpecOverrides): VariantSpec {
  return {
    lineRule: { black: LINE_RULES.atLeast, white: LINE_RULES.atLeast },
    forbidden: { black: NO_PATTERNS, white: NO_PATTERNS },
    captures: false,
    stonesPerTurn: 1,
    firstTurnStones: 1,
    winLength: WIN_LENGTH,
    allowFirstPlayerChoice: false,
    firstStone: STONES.black,
    openings: GOMOKU_OPENINGS,
    placement: PLACEMENTS.free,
    loseLength: null,
    quadrantSize: null,
    pieces: null,
    squareWins: false,
    boardSizes: null,
    defaultBoard: null,
    analysis: true,
    wrap: WRAP_MODES.none,
    deadSquares: 0,
    hotSquares: 0,
    rocks: null,
    lineClear: false,
    misere: false,
    queue: null,
    singles: 0,
    captureSizes: [2],
    capturesToWin: null,
    wormholes: 0,
    anyColour: false,
    singleColour: false,
    makerBreaker: false,
    flips: false,
    startingDiscs: STARTING_DISCS.none,
    camps: false,
    connects: false,
    checkers: false,
    checkersRules: null,
    chineseCheckers: false,
    hexagon: false,
    go: false,
    headStart: null,
    ...overrides,
  };
}

/** The drop family: gravity columns, four in a row, a 7×7 or 9×9 board. A piece falls into a slot, so the whole family is drawn in the squares. */
function drop(overrides: Partial<VariantSpec> & Pick<VariantSpec, "headStartTurns">): VariantSpec {
  return small({
    winLength: 4,
    placement: PLACEMENTS.drop,
    grid: BOARD_GRIDS.cells,
    ...overrides,
    boardSizes: overrides.boardSizes ?? [7, 9, 10],
  });
}

/** A flipping game: an 8×8 board of squares, as Othello's is, and no reading of threats — there are none. */
function flipping(overrides: Partial<VariantSpec> & Pick<VariantSpec, "headStartTurns">): VariantSpec {
  return small({ flips: true, analysis: false, grid: BOARD_GRIDS.cells, ...overrides, boardSizes: overrides.boardSizes ?? REVERSI_SIZES });
}

/** The games that are not gomoku: a small board of their own and no opening protocol. */
function small(overrides: SpecOverrides & { boardSizes: readonly number[] }): VariantSpec {
  return plain({ allowFirstPlayerChoice: true, openings: FREE_ONLY, ...overrides });
}

/**
 * A draughts game played as its federation writes it, on its own board: in the
 * squares, with no reading of lines, and the first move where the rulebook puts
 * it — White in international, Brazilian, Canadian and Russian draughts (FMJD
 * 3.3, CBJD, FSR), Black in pool checkers (APCA rule 7). Not a choice at the
 * board, because the rulebook does not make it one.
 */
function federationDraughts(
  rules: CheckersRules,
  boardSizes: readonly number[],
  firstStone: Stone,
  headStartTurns: HeadStartTurns,
): VariantSpec {
  return small({
    headStartTurns,
    grid: BOARD_GRIDS.cells,
    checkers: true,
    checkersRules: rules,
    boardSizes,
    analysis: false,
    allowFirstPlayerChoice: false,
    firstStone,
    // Odds of a man, or men: the draughts clubs' way of giving a weaker player a game.
    headStart: TRADITIONAL_HEAD_STARTS.men,
  });
}

/**
 * Every rule set, as data. The engine reads these and never the variant name,
 * so a new variant is a new row here plus its copy in `variants.constants.ts`.
 */
export const VARIANT_SPECS: Record<RuleVariant, VariantSpec> = {
  freestyle: plain({ grid: BOARD_GRIDS.lines, winLength: null, allowFirstPlayerChoice: true, headStartTurns: 2 }), // 3 free turns give an open four.
  standard: plain({
    grid: BOARD_GRIDS.lines,
    headStartTurns: 2, // 3 free turns give an open four.
    lineRule: { black: LINE_RULES.exact, white: LINE_RULES.exact },
  }),
  renju: plain({
    grid: BOARD_GRIDS.lines,
    headStartTurns: 2, // 3 free turns give an open four.
    // White's overline counts as five; black's is forbidden.
    lineRule: { black: LINE_RULES.exact, white: LINE_RULES.atLeast },
    forbidden: { black: RENJU_PATTERNS, white: NO_PATTERNS },
    openings: [
      OPENING_RULES.free,
      OPENING_RULES.rif,
      OPENING_RULES.sakata,
      OPENING_RULES.tarannikov,
      OPENING_RULES.pro,
      OPENING_RULES.longPro,
    ],
  }),
  omok: plain({ grid: BOARD_GRIDS.lines, forbidden: { black: OMOK_PATTERNS, white: OMOK_PATTERNS }, headStartTurns: 2 }), // 3 free turns give an open four.
  /*
   * The one five-in-a-row game drawn in the squares. Caro is played on
   * squared paper with the marks written inside the squares, and its name is
   * the French carreau — the squares themselves.
   */
  caro: plain({
    grid: BOARD_GRIDS.cells,
    headStartTurns: 2, // 3 free turns give an open four.
    lineRule: { black: LINE_RULES.exactOpen, white: LINE_RULES.exactOpen },
  }),
  // 2 free turns could not be shown safe within the measurement's budget: captures keep every line open.
  ninuki: plain({ grid: BOARD_GRIDS.lines, captures: true, capturesToWin: 10, allowFirstPlayerChoice: true, headStartTurns: 1 }),
  sannuki: plain({
    grid: BOARD_GRIDS.lines,
    captures: true,
    captureSizes: [2, 3],
    headStartTurns: 1, // 2 not shown safe within budget: captures keep every line open.
    capturesToWin: 15,
    allowFirstPlayerChoice: true,
  }),
  misereFive: plain({ grid: BOARD_GRIDS.lines, misere: true, allowFirstPlayerChoice: true, openings: FREE_ONLY, headStartTurns: 0 }), // A free turn is a burden where making the line loses, so it is no head start.
  // Tic-tac-toe's family: noughts and crosses IN the squares, however much the rules share with gomoku.
  makerBreaker: small({
    grid: BOARD_GRIDS.cells,
    anyColour: true,
    makerBreaker: true,
    headStartTurns: 1, // 2 not shown safe within budget.
    boardSizes: [6],
    allowFirstPlayerChoice: false,
    analysis: false,
  }),
  wildTicTacToe: small({ grid: BOARD_GRIDS.cells, winLength: 3, anyColour: true, boardSizes: [3], analysis: false, headStartTurns: 0 }), // 1 free turn is a forced line.
  notakto: small({
    grid: BOARD_GRIDS.cells,
    winLength: 3,
    singleColour: true,
    headStartTurns: 0, // 1 free turn forces the other side to finish the line.
    misere: true,
    boardSizes: [3],
    allowFirstPlayerChoice: false,
    analysis: false,
  }),
  connect6: plain({
    grid: BOARD_GRIDS.lines,
    // None: White's first turn is two stones, so one free turn is four before Black's second, and no budget showed that safe.
    headStartTurns: 0,
    stonesPerTurn: 2,
    winLength: 6,
    allowFirstPlayerChoice: true,
    openings: [OPENING_RULES.free],
  }),
  tictactoe: small({ grid: BOARD_GRIDS.cells, winLength: 3, boardSizes: [3], headStartTurns: 0 }), // 1 free turn is a forced fork.
  // Squava: a 5×5 board of squares, played in them.
  trapThree: small({ grid: BOARD_GRIDS.cells, winLength: 4, loseLength: 3, boardSizes: [5], headStartTurns: 1 }), // 2 not shown safe within budget.
  /*
   * A torus: both pairs of edges join, so every intersection is a middle one
   * and no line can be shut down by running out of board.
   */
  toroidalFive: plain({
    grid: BOARD_GRIDS.lines,
    winLength: null,
    allowFirstPlayerChoice: true,
    wrap: WRAP_MODES.both,
    headStartTurns: 2, // 3 free turns give an open four.
    openings: FREE_ONLY,
  }),
  /*
   * Dead squares and hotspots scattered by the seed: the same furniture the
   * drop family uses, on a board where the stones stay where they are put.
   */
  obstacleFive: plain({
    grid: BOARD_GRIDS.lines,
    winLength: null,
    allowFirstPlayerChoice: true,
    openings: FREE_ONLY,
    deadSquares: 6,
    headStartTurns: 1, // 2 free turns decide where the squares fall kindly.
    hotSquares: 2,
  }),
  /*
   * The two rock games, named from the obstacle playtest
   * (`obstacles.playtest.test.ts`): sixty games a board between two equal
   * computer players, where plain five in a row went 60-0 to black. Both keep
   * to the board they were measured on.
   *
   * Scattered Rocks: twelve rocks and two hotspots from the first move, 34-24
   * with two drawn. Rockfall: an empty board for eight stones, then twenty
   * rocks and two hotspots land on whatever is still open — 23-21 with sixteen
   * drawn, the closest to even of every board tried.
   */
  scatteredRocks: plain({
    grid: BOARD_GRIDS.lines,
    winLength: null,
    allowFirstPlayerChoice: true,
    openings: FREE_ONLY,
    boardSizes: [15],
    deadSquares: 12,
    hotSquares: 2,
    rocks: { placement: ROCK_PLACEMENTS.scattered, arriveAfter: null },
    headStartTurns: 1, // As Obstacle Five: 2 free turns choose where the rocks help.
  }),
  rockfall: plain({
    grid: BOARD_GRIDS.lines,
    winLength: null,
    allowFirstPlayerChoice: true,
    openings: FREE_ONLY,
    boardSizes: [15],
    deadSquares: 20,
    hotSquares: 2,
    rocks: { placement: ROCK_PLACEMENTS.scattered, arriveAfter: 8 },
    headStartTurns: 2, // An open board until the eighth stone, as freestyle: 3 free turns give an open four.
  }),
  dropFour: drop({ headStartTurns: 1 }), // 2 free turns lay an open three on the bottom row: a forced four.
  ringDrop: drop({ wrap: WRAP_MODES.columns, headStartTurns: 1 }), // 2 free turns lay an open three on the bottom row: a forced four.
  holeDrop: drop({ deadSquares: 1, headStartTurns: 1 }), // 2 free turns lay an open three on the bottom row: a forced four.
  hotDrop: drop({ hotSquares: 1, deadSquares: 1, headStartTurns: 1 }), // 2 free turns lay an open three on the bottom row: a forced four.
  clearDrop: drop({ lineClear: true, headStartTurns: 1 }), // 2 free turns lay an open three on the bottom row: a forced four.
  giveawayDrop: drop({ misere: true, headStartTurns: 0 }), // A free turn is a burden where making the line loses, so it is no head start.
  edgeDrop: small({ grid: BOARD_GRIDS.cells, winLength: 4, placement: PLACEMENTS.edge, boardSizes: [7, 9, 10], headStartTurns: 0 }), // 1 not shown safe within budget.
  wormDrop: drop({ wormholes: 2, headStartTurns: 1 }), // 2 free turns lay an open three on the bottom row: a forced four.
  // The piece games are this site's own, laid on go boards in stones rather than tiles, so they keep the house lines.
  dominoFive: plain({
    grid: BOARD_GRIDS.lines,
    headStartTurns: 0, // 1 not shown safe within budget: a seed deals the pieces.
    queue: PIECE_QUEUES.domino,
    allowFirstPlayerChoice: true,
    openings: FREE_ONLY,
    boardSizes: [13, 15, 19],
    analysis: false,
  }),
  blockFive: plain({
    grid: BOARD_GRIDS.lines,
    headStartTurns: 0, // 1 not shown safe within budget: a seed deals the pieces.
    queue: PIECE_QUEUES.tetro,
    singles: 6,
    allowFirstPlayerChoice: true,
    openings: FREE_ONLY,
    boardSizes: [13, 15, 19],
    analysis: false,
  }),
  // The twist games: marbles in the holes of turning quadrants, as the published game has them.
  twistFive: small({ grid: BOARD_GRIDS.cells, winLength: 5, quadrantSize: 3, boardSizes: [6], analysis: false, headStartTurns: 1 }), // 2 not shown safe: the twists outrun the budget.
  twistFour: small({ grid: BOARD_GRIDS.cells, winLength: 4, quadrantSize: 2, boardSizes: [4], analysis: false, headStartTurns: 0 }), // 1 not shown safe: the twists outrun the budget.
  // Teeko's board is twenty-five points joined by lines, and the pieces stand on the points.
  squareFour: small({
    grid: BOARD_GRIDS.lines,
    headStartTurns: 1, // 2 free turns force a square or a line of four.
    winLength: 4,
    pieces: 4,
    squareWins: true,
    boardSizes: [5],
    analysis: false,
  }),
  /*
   * The flipping games. `winLength` is pinned to nothing in particular, since
   * no line is ever read; what matters is the flip, the pass and the count.
   */
  /*
   * Othello's handicap is corners: the weaker player starts owning one to four
   * of them. Not in anti-Othello, where a disc nobody can turn is one you are
   * stuck with — a corner there would be a burden handed over as a gift.
   */
  reversi: flipping({ startingDiscs: STARTING_DISCS.fixed, headStart: TRADITIONAL_HEAD_STARTS.corners, headStartTurns: 0 }), // 1 free turn takes the last disc.
  classicReversi: flipping({ startingDiscs: STARTING_DISCS.laid, headStart: TRADITIONAL_HEAD_STARTS.corners, headStartTurns: 1 }), // 2 free turns take the last disc.
  antiReversi: flipping({ startingDiscs: STARTING_DISCS.fixed, misere: true, headStartTurns: 0 }), // A free turn is a burden where making the line loses, so it is no head start.
  miniReversi: flipping({
    startingDiscs: STARTING_DISCS.fixed,
    boardSizes: MINI_REVERSI_SIZES,
    headStartTurns: 0, // 1 free turn takes the last disc.
    headStart: TRADITIONAL_HEAD_STARTS.corners,
  }),
  grandReversi: flipping({
    startingDiscs: STARTING_DISCS.fixed,
    boardSizes: GRAND_REVERSI_SIZES,
    headStartTurns: 0, // 1 free turn takes the last disc.
    headStart: TRADITIONAL_HEAD_STARTS.corners,
  }),
  /*
   * Honeycomb: the flipping game on a hexagon of hexagons. Stones on the
   * points of the lattice, as Hex's are; six directions to bracket along; the
   * centre cell sealed and the six around it set, three of each colour. See
   * rules/hexagon.ts for the shape and where the six directions come from.
   */
  honeycomb: small({
    grid: BOARD_GRIDS.lines,
    flips: true,
    hexagon: true,
    startingDiscs: STARTING_DISCS.fixed,
    analysis: false,
    boardSizes: HONEYCOMB_SIZES,
    defaultBoard: 11, // 91 cells: the board Hexversi is played on.
    headStartTurns: 0, // 1 free turn takes the last disc, as in every flipping game.
  }),
  // Halma opens on its own board, the sixteen, not on the smallest of the three.
  halma: small({ grid: BOARD_GRIDS.cells, camps: true, analysis: false, boardSizes: HALMA_SIZES, defaultBoard: 16, headStartTurns: 3 }), // 3 never decides: a race needs every piece home.
  // On the crossings of a triangular lattice, as a wooden Hex board is ruled: see HEX_LATTICE.
  hex: small({ grid: BOARD_GRIDS.lines, connects: true, analysis: false, boardSizes: HEX_SIZES, openings: [OPENING_RULES.free, OPENING_RULES.swap], headStartTurns: 3 }), // 3 never decides: a chain needs a stone on every row.
  /*
   * Hex Five: five in a row on the same hexagon of hexagons Honeycomb is
   * played on, but read as a line game rather than a flipping one — six
   * neighbours a cell, three real lattice axes to run a line along (see
   * rules/hexagon.ts and rules/lines.ts), and the centre left open, since
   * nothing here counts discs and so needs no even parity of playable cells.
   * Swap sits beside the free opening, as it does for Hex itself, so the
   * first player cannot simply take the board's one strongest point.
   */
  hexFive: small({
    grid: BOARD_GRIDS.lines,
    hexagon: true,
    boardSizes: HONEYCOMB_SIZES,
    defaultBoard: 11, // 91 cells: the same board Honeycomb opens on.
    openings: [OPENING_RULES.free, OPENING_RULES.swap],
    headStartTurns: 2, // 3 free turns give an open four, as in freestyle.
  }),
  /*
   * Checkers: no lines, no captures-to-win tally of its own — the capture is
   * the whole of the move, worked out fresh by rules/checkers.ts rather than
   * read from `captures` or `captureSizes`, which belong to the flanking
   * capture of the Ninuki family and mean nothing here.
   */
  checkers: small({
    grid: BOARD_GRIDS.cells,
    checkers: true,
    checkersRules: ENGLISH_CHECKERS_RULES,
    headStartTurns: 3, // 3 free moves never force a capture: the back rows stay full.
    boardSizes: CHECKERS_SIZES,
    analysis: false,
    headStart: TRADITIONAL_HEAD_STARTS.men,
  }),
  /*
   * The international family: men that take backward, kings that fly, the
   * longest capture compulsory, and no crown for a man only passing the far row.
   * One set of rules on three boards — see INTERNATIONAL_DRAUGHTS_RULES for the
   * articles, and where Brazil's and Canada's differ.
   */
  internationalDraughts: federationDraughts(INTERNATIONAL_DRAUGHTS_RULES, INTERNATIONAL_DRAUGHTS_SIZES, STONES.white, 3), // 3 free moves never force a capture.
  brazilianDraughts: federationDraughts(BRAZILIAN_DRAUGHTS_RULES, BRAZILIAN_DRAUGHTS_SIZES, STONES.white, 3), // 3 free moves never force a capture.
  canadianCheckers: federationDraughts(CANADIAN_CHECKERS_RULES, CANADIAN_CHECKERS_SIZES, STONES.white, 2), // 3 not shown safe within budget on 12×12.
  /*
   * The free-choice games: kings fly and men take backward as in the
   * international family, but any capture may be chosen. Russian draughts
   * crowns a man mid-capture and lets it take on as a king; pool checkers does
   * not crown it unless the capture ends there. See RUSSIAN_DRAUGHTS_RULES and
   * POOL_CHECKERS_RULES for the articles.
   */
  russianDraughts: federationDraughts(RUSSIAN_DRAUGHTS_RULES, RUSSIAN_DRAUGHTS_SIZES, STONES.white, 3), // 3 free moves never force a capture.
  poolCheckers: federationDraughts(POOL_CHECKERS_RULES, POOL_CHECKERS_SIZES, STONES.black, 3), // 3 free moves never force a capture.
  /*
   * Chinese Checkers: a hexagram, not a square — see rules/chineseCheckers.ts
   * for how it is embedded in a Point{row,col} grid at all. Otherwise a race
   * exactly like Halma's, so it shares `camp` as its win reason.
   */
  chineseCheckers: small({
    // Marbles in holes at the points of a lattice. No grid is drawn at all — BoardLines hides it — but the points are what they are.
    grid: BOARD_GRIDS.lines,
    chineseCheckers: true,
    headStartTurns: 3, // 3 never decides: a race needs every marble home.
    boardSizes: CHINESE_CHECKERS_SIZES,
    analysis: false,
  }),
  /*
   * Go: nothing here ever moves and no line ever decides anything — see
   * rules/go.ts for the liberties, the capture, the ko rule and the count.
   * Black always opens, as at the real board; no opening protocol applies.
   */
  go: small({
    grid: BOARD_GRIDS.lines,
    go: true,
    headStartTurns: 3, // 3 never decides: nothing but two passes ends Go.
    // Handicap stones on the star points, White moving first: Go's own head start.
    headStart: TRADITIONAL_HEAD_STARTS.stones,
    boardSizes: GO_SIZES,
    defaultBoard: 19, // Go opens on the full board; the nine and the thirteen are the teaching ones.
    allowFirstPlayerChoice: false,
    analysis: false,
  }),
};

/** The board sizes a variant plays on, smallest first — the order they are drawn in. */
export function boardSizesFor(variant: RuleVariant): readonly number[] {
  return VARIANT_SPECS[variant].boardSizes ?? BOARD_SIZES;
}

/**
 * The board a game OPENS on, where nothing else has said: its own
 * `defaultBoard` if it has one, else the first of its boards.
 *
 * Asked for by name rather than read off the front of the list, because the
 * list is in numerical order and the two facts had been the same number by
 * accident. Sorting the lists moved Halma's default from its own sixteen to
 * the quick eight and Honeycomb's from the 91-cell board to the 37, and
 * nothing would have said so.
 */
export function defaultBoardFor(variant: RuleVariant): number {
  const spec = VARIANT_SPECS[variant];
  return spec.defaultBoard ?? (spec.boardSizes ?? BOARD_SIZES)[0];
}

/**
 * The board this variant will actually be played on, given a size somebody
 * asked for. A game with a board of its own gets that board.
 *
 * `normaliseSettings` has always done this when it builds a state, so the
 * board a player sees was never wrong. What could be wrong was the row: a
 * Reversi game could be stored at 19×19, shown as 19×19 on its page and in
 * its record, and played on the 8×8 board Reversi actually has. Anything
 * writing a size to the database asks here first, so the row and the board
 * cannot disagree.
 */
export function sizeForVariant(variant: RuleVariant, size: number): number {
  const sizes = VARIANT_SPECS[variant].boardSizes;
  return sizes === null || sizes.includes(size) ? size : defaultBoardFor(variant);
}

export const GAME_STATUS = {
  playing: "playing",
  won: "won",
  draw: "draw",
} as const satisfies Record<GameStatus, GameStatus>;

export const MOVE_KINDS = {
  place: "place",
  skip: "skip",
  move: "move",
  piece: "piece",
  pass: "pass",
  // Written by a claimed timeout alone. See MoveKind.
  forfeit: "forfeit",
} as const satisfies Record<MoveKind, MoveKind>;

/** How a written move list says the two moves that have no point. */
export const STONELESS_WORDS = {
  pass: "pass",
  forfeit: "timed out",
} as const satisfies Partial<Record<MoveKind, string>>;

export const SEATS = {
  one: "one",
  two: "two",
} as const satisfies Record<Seat, Seat>;

export const FIRST_PLAYERS = {
  black: "black",
  white: "white",
  random: "random",
} as const satisfies Record<FirstPlayer, FirstPlayer>;

export const OBSTACLE_LAYOUTS = {
  none: "none",
  hoshi: "hoshi",
} as const satisfies Record<ObstacleLayout, ObstacleLayout>;

/** Board is `size` × `size`. The mini boards make for much shorter games. */
export const BOARD_SIZES = [9, 13, 15, 19] as const;

/** Every size any game here is played on, for the schemas at the API edge. */
export const ALL_BOARD_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 19] as const;

export const DEFAULT_BOARD_SIZE = 15;

export const DEFAULT_SWAPS_PER_SEAT = 1;

/**
 * The shares of the board a game may be called a draw at.
 *
 * A fraction rather than a number of moves, so one setting means the same
 * thing on every board: half of a 9x9 is forty moves and half of a 19x19 is
 * a hundred and eighty, and neither needs anybody to work it out. `none` is
 * the default and is how every game here behaved before this existed.
 */
export const DRAW_LIMITS = {
  none: "none",
  half: "half",
  threeQuarters: "threeQuarters",
} as const satisfies Record<DrawLimit, DrawLimit>;

export const DRAW_LIMIT_LIST: readonly DrawLimit[] = [
  DRAW_LIMITS.none,
  DRAW_LIMITS.half,
  DRAW_LIMITS.threeQuarters,
];

/**
 * The rule: what share of the board's points may be played before a game
 * with no winner is a draw. Null plays it out. Kept apart from the words for
 * it, which belong to the app that shows them, the way every game's rules are
 * kept apart from its name and its rules text: one decides what happens, the
 * other only says it.
 */
/**
 * The smallest board a length means anything on, in points.
 *
 * Nine by nine. Below it a game is over long before any share of the board
 * could matter — a 3×3 has nine points and is finished in nine moves, so
 * "half the board" is four, and cutting a game of noughts and crosses short
 * at four moves is not a rule, it is a bug with a setting in front of it.
 * The whole reason for a length is a board big enough that two careful
 * players can fail to resolve it, and that starts here.
 */
export const DRAW_LIMIT_MIN_POINTS = 81;

export const DRAW_LIMIT_SHARE: Record<DrawLimit, number | null> = {
  none: null,
  half: 1 / 2,
  threeQuarters: 3 / 4,
};

export const DEFAULT_SETTINGS: GameSettings = {
  size: DEFAULT_BOARD_SIZE,
  winLength: WIN_LENGTH,
  variant: RULE_VARIANTS.freestyle,
  opening: OPENING_RULES.free,
  handicap: NO_HANDICAP,
  headStart: NO_HEAD_START,
  seed: 0,
  capturesToWin: DEFAULT_CAPTURES_TO_WIN,
  firstPlayer: FIRST_PLAYERS.black,
  obstacles: OBSTACLE_LAYOUTS.none,
  allowUndo: true,
  allowSkip: false,
  allowSwap: false,
  allowResize: false,
  swapsPerSeat: DEFAULT_SWAPS_PER_SEAT,
  drawLimit: DRAW_LIMITS.none,
};

/** Black opens unless the settings say otherwise. */
export const FIRST_STONE: Stone = STONES.black;

export { COLUMN_LETTERS, DIRECTIONS, HEX_LINE_DIRECTIONS, STAR_POINTS, lineDirectionsFor } from "./board.constants.ts";
