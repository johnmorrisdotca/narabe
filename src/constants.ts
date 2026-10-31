import type {
  Blocked,
  BoardGrid,
  CaptureChoice,
  CheckersRules,
  CrownMidCapture,
  DrawLimit,
  EndgameCountKind,
  FirstPlayer,
  ForbiddenPattern,
  GameSettings,
  GameStatus,
  Handicap,
  HandicapRule,
  HeadStart,
  Hot,
  LineRule,
  MoveKind,
  MoveNarrowing,
  ObstacleLayout,
  OpeningRule,
  OpeningStage,
  PieceQueue,
  PieceTally,
  Placement,
  Point,
  RuleVariant,
  Seat,
  Stone,
  TraditionalHeadStart,
  TurnChoiceKind,
  WinReason,
  Worm,
  WrapMode,
} from "./types.ts";

/** The black and white stone labels.
 *
 * @example
 * ```ts
 * import { STONES } from "@johnmorrisdotca/narabe";
 * console.log(STONES);
 * ```
 */
export const STONES = {
  black: "black",
  white: "white",
} as const satisfies Record<Stone, Stone>;

/** The unavailable-cell marker.
 *
 * @example
 * ```ts
 * import { BLOCKED } from "@johnmorrisdotca/narabe";
 * console.log(BLOCKED);
 * ```
 */
export const BLOCKED: Blocked = "blocked";

/** The cell marker that counts as either colour in a line.
 *
 * @example
 * ```ts
 * import { HOT } from "@johnmorrisdotca/narabe";
 * console.log(HOT);
 * ```
 */
export const HOT: Hot = "hot";

/** The linked wormhole-cell marker.
 *
 * @example
 * ```ts
 * import { WORM } from "@johnmorrisdotca/narabe";
 * console.log(WORM);
 * ```
 */
export const WORM: Worm = "worm";

/** Seeds are 31-bit integers, small enough for every store and reproducible everywhere.
 *
 * @example
 * ```ts
 * import { SEED_RANGE } from "@johnmorrisdotca/narabe";
 * console.log(SEED_RANGE);
 * ```
 */
export const SEED_RANGE = 2 ** 31;

/** The stable identifiers for all forty-eight rule variants.
 *
 * @example
 * ```ts
 * import { RULE_VARIANTS } from "@johnmorrisdotca/narabe";
 * console.log(RULE_VARIANTS);
 * ```
 */
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

/** The supported board edge-wrapping modes.
 *
 * @example
 * ```ts
 * import { WRAP_MODES } from "@johnmorrisdotca/narabe";
 * console.log(WRAP_MODES);
 * ```
 */
export const WRAP_MODES = {
  none: "none",
  columns: "columns",
  both: "both",
} as const satisfies Record<WrapMode, WrapMode>;

/** The domino and tetromino queue identifiers.
 *
 * @example
 * ```ts
 * import { PIECE_QUEUES } from "@johnmorrisdotca/narabe";
 * console.log(PIECE_QUEUES);
 * ```
 */
export const PIECE_QUEUES = {
  domino: "domino",
  tetro: "tetro",
} as const satisfies Record<PieceQueue, PieceQueue>;

/** How many queued pieces a player is shown ahead of the one in hand.
 *
 * @example
 * ```ts
 * import { PIECE_PREVIEW } from "@johnmorrisdotca/narabe";
 * console.log(PIECE_PREVIEW);
 * ```
 */
export const PIECE_PREVIEW = 3;

/** A pass has no point on the board.
 *
 * @example
 * ```ts
 * import { NO_POINT } from "@johnmorrisdotca/narabe";
 * console.log(NO_POINT);
 * ```
 */
export const NO_POINT: Point = { row: -1, col: -1 };

/** The variants in the order the browser and the filters list them.
 *
 * @example
 * ```ts
 * import { RULE_VARIANT_LIST } from "@johnmorrisdotca/narabe";
 * console.log(RULE_VARIANT_LIST);
 * ```
 */
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

/** The free, dropped and supported-edge placement modes.
 *
 * @example
 * ```ts
 * import { PLACEMENTS } from "@johnmorrisdotca/narabe";
 * console.log(PLACEMENTS);
 * ```
 */
export const PLACEMENTS = {
  free: "free",
  drop: "drop",
  edge: "edge",
} as const satisfies Record<Placement, Placement>;

/** Where a game's stones sit when it is drawn its own way: on the crossings, or in the squares.
 *
 * @example
 * ```ts
 * import { BOARD_GRIDS } from "@johnmorrisdotca/narabe";
 * console.log(BOARD_GRIDS);
 * ```
 */
export const BOARD_GRIDS = {
  lines: "lines",
  cells: "cells",
} as const satisfies Record<BoardGrid, BoardGrid>;

/** The traditional head starts, see TraditionalHeadStart.
 *
 * @example
 * ```ts
 * import { TRADITIONAL_HEAD_STARTS } from "@johnmorrisdotca/narabe";
 * console.log(TRADITIONAL_HEAD_STARTS);
 * ```
 */
export const TRADITIONAL_HEAD_STARTS = {
  stones: "stones",
  corners: "corners",
  men: "men",
} as const satisfies Record<TraditionalHeadStart, TraditionalHeadStart>;

/** The stable identifiers for supported opening protocols.
 *
 * @example
 * ```ts
 * import { OPENING_RULES } from "@johnmorrisdotca/narabe";
 * console.log(OPENING_RULES);
 * ```
 */
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

/** All supported opening identifiers in display order.
 *
 * @example
 * ```ts
 * import { OPENING_RULE_LIST } from "@johnmorrisdotca/narabe";
 * console.log(OPENING_RULE_LIST);
 * ```
 */
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

/** The at-least, exact and open-exact winning line modes.
 *
 * @example
 * ```ts
 * import { LINE_RULES } from "@johnmorrisdotca/narabe";
 * console.log(LINE_RULES);
 * ```
 */
export const LINE_RULES = {
  atLeast: "atLeast",
  exact: "exact",
  exactOpen: "exactOpen",
} as const satisfies Record<LineRule, LineRule>;

/** The named forbidden shapes checked by line games.
 *
 * @example
 * ```ts
 * import { FORBIDDEN_PATTERNS } from "@johnmorrisdotca/narabe";
 * console.log(FORBIDDEN_PATTERNS);
 * ```
 */
export const FORBIDDEN_PATTERNS = {
  doubleThree: "doubleThree",
  doubleFour: "doubleFour",
  overline: "overline",
} as const satisfies Record<ForbiddenPattern, ForbiddenPattern>;

/** The recorded reasons a game is won.
 *
 * @example
 * ```ts
 * import { WIN_REASONS } from "@johnmorrisdotca/narabe";
 * console.log(WIN_REASONS);
 * ```
 */
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

/** The stages of the opening protocol.
 *
 * @example
 * ```ts
 * import { OPENING_STAGES } from "@johnmorrisdotca/narabe";
 * console.log(OPENING_STAGES);
 * ```
 */
export const OPENING_STAGES = {
  placing: "placing",
  choosing: "choosing",
  extending: "extending",
  done: "done",
} as const satisfies Record<OpeningStage, OpeningStage>;

/** The one opening choice that is not a colour.
 *
 * @example
 * ```ts
 * import { OPENING_CHOICE_EXTEND } from "@johnmorrisdotca/narabe";
 * console.log(OPENING_CHOICE_EXTEND);
 * ```
 */
export const OPENING_CHOICE_EXTEND = "extend" as const;

/** Stones in a line needed to win, unless a variant pins it.
 *
 * @example
 * ```ts
 * import { WIN_LENGTH } from "@johnmorrisdotca/narabe";
 * console.log(WIN_LENGTH);
 * ```
 */
export const WIN_LENGTH = 5;

/** Line lengths a player may pick in the variants that leave it open.
 *
 * @example
 * ```ts
 * import { WIN_LENGTHS } from "@johnmorrisdotca/narabe";
 * console.log(WIN_LENGTHS);
 * ```
 */
export const WIN_LENGTHS = [4, 5, 6] as const;

/** Enemy stones to capture for a win in the capture game: five pairs.
 *
 * @example
 * ```ts
 * import { DEFAULT_CAPTURES_TO_WIN } from "@johnmorrisdotca/narabe";
 * console.log(DEFAULT_CAPTURES_TO_WIN);
 * ```
 */
export const DEFAULT_CAPTURES_TO_WIN = 10;

/** The handicap toggles, in the order the settings list them.
 *
 * @example
 * ```ts
 * import { HANDICAP_RULES } from "@johnmorrisdotca/narabe";
 * console.log(HANDICAP_RULES);
 * ```
 */
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

/** Half-widths of the central square a handicapped second stone must leave.
 *
 * @example
 * ```ts
 * import { SECOND_STONE_EXCLUSIONS } from "@johnmorrisdotca/narabe";
 * console.log(SECOND_STONE_EXCLUSIONS);
 * ```
 */
export const SECOND_STONE_EXCLUSIONS = [0, 2, 3] as const;

/** The default terms with no colour-bound rule restrictions.
 *
 * @example
 * ```ts
 * import { NO_HANDICAP } from "@johnmorrisdotca/narabe";
 * console.log(NO_HANDICAP);
 * ```
 */
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

/** Nobody given a start: the even game, which is most games.
 *
 * @example
 * ```ts
 * import { NO_HEAD_START } from "@johnmorrisdotca/narabe";
 * console.log(NO_HEAD_START);
 * ```
 */
export const NO_HEAD_START: HeadStart = { stone: null, freeTurns: 0, traditional: 0 };

/** The free turns a head start may give, none included. John chose one to three.
 *
 * @example
 * ```ts
 * import { HEAD_START_FREE_TURNS } from "@johnmorrisdotca/narabe";
 * console.log(HEAD_START_FREE_TURNS);
 * ```
 */
export const HEAD_START_FREE_TURNS = [0, 1, 2, 3] as const;

/** The fixed, laid or absent starting-disc layouts.
 *
 * @example
 * ```ts
 * import { STARTING_DISCS } from "@johnmorrisdotca/narabe";
 * console.log(STARTING_DISCS);
 * ```
 */
export const STARTING_DISCS = { none: "none", fixed: "fixed", laid: "laid" } as const;

/** The free-choice and maximum-capture draughts modes.
 *
 * @example
 * ```ts
 * import { CAPTURE_CHOICES } from "@johnmorrisdotca/narabe";
 * console.log(CAPTURE_CHOICES);
 * ```
 */
export const CAPTURE_CHOICES = {
  free: "free",
  maximum: "maximum",
} as const satisfies Record<CaptureChoice, CaptureChoice>;

/** The supported promotion behavior during a capture chain.
 *
 * @example
 * ```ts
 * import { CROWN_MID_CAPTURE } from "@johnmorrisdotca/narabe";
 * console.log(CROWN_MID_CAPTURE);
 * ```
 */
export const CROWN_MID_CAPTURE = {
  stops: "stops",
  continues: "continues",
  passes: "passes",
} as const satisfies Record<CrownMidCapture, CrownMidCapture>;

/** The specific-ending and material-balance draw count modes.
 *
 * @example
 * ```ts
 * import { ENDGAME_COUNT_KINDS } from "@johnmorrisdotca/narabe";
 * console.log(ENDGAME_COUNT_KINDS);
 * ```
 */
export const ENDGAME_COUNT_KINDS = {
  endings: "endings",
  balance: "balance",
} as const satisfies Record<EndgameCountKind, EndgameCountKind>;

/** The reasons a move list is restricted to captures.
 *
 * @example
 * ```ts
 * import { MOVE_NARROWINGS } from "@johnmorrisdotca/narabe";
 * console.log(MOVE_NARROWINGS);
 * ```
 */
export const MOVE_NARROWINGS = {
  capture: "capture",
  mostCaptured: "mostCaptured",
} as const satisfies Record<MoveNarrowing, MoveNarrowing>;

/** The piece-moving and stone-placement choice modes.
 *
 * @example
 * ```ts
 * import { TURN_CHOICE_KINDS } from "@johnmorrisdotca/narabe";
 * console.log(TURN_CHOICE_KINDS);
 * ```
 */
export const TURN_CHOICE_KINDS = {
  move: "move",
  place: "place",
} as const satisfies Record<TurnChoiceKind, TurnChoiceKind>;

/**
 * English draughts, American checkers: three rows of men, a man takes forward
 * only, a king moves one square, any capture may be chosen, and a man crowned
 * by a capture ends the move there. Exactly what rules/checkers.ts did before
 * any of this was data, and the Checkers tests that predate it still say so.
 *
 * @example
 * ```ts
 * import { ENGLISH_CHECKERS_RULES } from "@johnmorrisdotca/narabe";
 * console.log(ENGLISH_CHECKERS_RULES);
 * ```
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
 *
 * @example
 * ```ts
 * import { INTERNATIONAL_DRAUGHTS_RULES } from "@johnmorrisdotca/narabe";
 * console.log(INTERNATIONAL_DRAUGHTS_RULES);
 * ```
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
 *
 * @example
 * ```ts
 * import { BRAZILIAN_DRAUGHTS_RULES } from "@johnmorrisdotca/narabe";
 * console.log(BRAZILIAN_DRAUGHTS_RULES);
 * ```
 */
export const BRAZILIAN_DRAUGHTS_RULES: CheckersRules = {
  ...INTERNATIONAL_DRAUGHTS_RULES,
  menRows: 3,
  endgameCounts: [
    {
      kind: ENDGAME_COUNT_KINDS.endings,
      restartsOnChange: false,
      endings: [
        [
          { kings: 2, men: 0 },
          { kings: 2, men: 0 },
        ],
        [{ kings: 2, men: 0 }, LONE_KING],
        [
          { kings: 2, men: 0 },
          { kings: 1, men: 1 },
        ],
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
 *
 * @example
 * ```ts
 * import { CANADIAN_CHECKERS_RULES } from "@johnmorrisdotca/narabe";
 * console.log(CANADIAN_CHECKERS_RULES);
 * ```
 */
export const CANADIAN_CHECKERS_RULES: CheckersRules = {
  ...INTERNATIONAL_DRAUGHTS_RULES,
  menRows: 5,
};

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
 *
 * @example
 * ```ts
 * import { RUSSIAN_DRAUGHTS_RULES } from "@johnmorrisdotca/narabe";
 * console.log(RUSSIAN_DRAUGHTS_RULES);
 * ```
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
 *
 * @example
 * ```ts
 * import { POOL_CHECKERS_RULES } from "@johnmorrisdotca/narabe";
 * console.log(POOL_CHECKERS_RULES);
 * ```
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

/** The playing, won and drawn outcome labels.
 *
 * @example
 * ```ts
 * import { GAME_STATUS } from "@johnmorrisdotca/narabe";
 * console.log(GAME_STATUS);
 * ```
 */
export const GAME_STATUS = {
  playing: "playing",
  won: "won",
  draw: "draw",
} as const satisfies Record<GameStatus, GameStatus>;

/** The stable labels used in move records.
 *
 * @example
 * ```ts
 * import { MOVE_KINDS } from "@johnmorrisdotca/narabe";
 * console.log(MOVE_KINDS);
 * ```
 */
export const MOVE_KINDS = {
  place: "place",
  skip: "skip",
  move: "move",
  piece: "piece",
  pass: "pass",
  // Written by a claimed timeout alone. See MoveKind.
  forfeit: "forfeit",
} as const satisfies Record<MoveKind, MoveKind>;

/** How a written move list says the two moves that have no point.
 *
 * @example
 * ```ts
 * import { STONELESS_WORDS } from "@johnmorrisdotca/narabe";
 * console.log(STONELESS_WORDS);
 * ```
 */
export const STONELESS_WORDS = {
  pass: "pass",
  forfeit: "timed out",
} as const satisfies Partial<Record<MoveKind, string>>;

/** The first and second player seat labels.
 *
 * @example
 * ```ts
 * import { SEATS } from "@johnmorrisdotca/narabe";
 * console.log(SEATS);
 * ```
 */
export const SEATS = {
  one: "one",
  two: "two",
} as const satisfies Record<Seat, Seat>;

/** The supported opening colours and random opener choice.
 *
 * @example
 * ```ts
 * import { FIRST_PLAYERS } from "@johnmorrisdotca/narabe";
 * console.log(FIRST_PLAYERS);
 * ```
 */
export const FIRST_PLAYERS = {
  black: "black",
  white: "white",
  random: "random",
} as const satisfies Record<FirstPlayer, FirstPlayer>;

/** The native empty and star-point obstacle layouts.
 *
 * @example
 * ```ts
 * import { OBSTACLE_LAYOUTS } from "@johnmorrisdotca/narabe";
 * console.log(OBSTACLE_LAYOUTS);
 * ```
 */
export const OBSTACLE_LAYOUTS = {
  none: "none",
  hoshi: "hoshi",
} as const satisfies Record<ObstacleLayout, ObstacleLayout>;

/** Board is `size` × `size`. The mini boards make for much shorter games.
 *
 * @example
 * ```ts
 * import { BOARD_SIZES } from "@johnmorrisdotca/narabe";
 * console.log(BOARD_SIZES);
 * ```
 */
export const BOARD_SIZES = [9, 13, 15, 19] as const;

/** Every size any game here is played on, for the schemas at the API edge.
 *
 * @example
 * ```ts
 * import { ALL_BOARD_SIZES } from "@johnmorrisdotca/narabe";
 * console.log(ALL_BOARD_SIZES);
 * ```
 */
export const ALL_BOARD_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 19] as const;

/** The default side length for an unconstrained board.
 *
 * @example
 * ```ts
 * import { DEFAULT_BOARD_SIZE } from "@johnmorrisdotca/narabe";
 * console.log(DEFAULT_BOARD_SIZE);
 * ```
 */
export const DEFAULT_BOARD_SIZE = 15;

/** The default seat-swap allowance for each player.
 *
 * @example
 * ```ts
 * import { DEFAULT_SWAPS_PER_SEAT } from "@johnmorrisdotca/narabe";
 * console.log(DEFAULT_SWAPS_PER_SEAT);
 * ```
 */
export const DEFAULT_SWAPS_PER_SEAT = 1;

/**
 * The shares of the board a game may be called a draw at.
 *
 * A fraction rather than a number of moves, so one setting means the same
 * thing on every board: half of a 9x9 is forty moves and half of a 19x19 is
 * a hundred and eighty, and neither needs anybody to work it out. `none` is
 * the default and is how every game here behaved before this existed.
 *
 * @example
 * ```ts
 * import { DRAW_LIMITS } from "@johnmorrisdotca/narabe";
 * console.log(DRAW_LIMITS);
 * ```
 */
export const DRAW_LIMITS = {
  none: "none",
  half: "half",
  threeQuarters: "threeQuarters",
} as const satisfies Record<DrawLimit, DrawLimit>;

/** The selectable configured game-length limits.
 *
 * @example
 * ```ts
 * import { DRAW_LIMIT_LIST } from "@johnmorrisdotca/narabe";
 * console.log(DRAW_LIMIT_LIST);
 * ```
 */
export const DRAW_LIMIT_LIST: readonly DrawLimit[] = [DRAW_LIMITS.none, DRAW_LIMITS.half, DRAW_LIMITS.threeQuarters];

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
 *
 * @example
 * ```ts
 * import { DRAW_LIMIT_MIN_POINTS } from "@johnmorrisdotca/narabe";
 * console.log(DRAW_LIMIT_MIN_POINTS);
 * ```
 */
export const DRAW_LIMIT_MIN_POINTS = 81;

/** The board fractions used by configured draw limits.
 *
 * @example
 * ```ts
 * import { DRAW_LIMIT_SHARE } from "@johnmorrisdotca/narabe";
 * console.log(DRAW_LIMIT_SHARE);
 * ```
 */
export const DRAW_LIMIT_SHARE: Record<DrawLimit, number | null> = {
  none: null,
  half: 1 / 2,
  threeQuarters: 3 / 4,
};

/** The defaults used when creating a game without overrides.
 *
 * @example
 * ```ts
 * import { DEFAULT_SETTINGS } from "@johnmorrisdotca/narabe";
 * console.log(DEFAULT_SETTINGS);
 * ```
 */
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

/** Black opens unless the settings say otherwise.
 *
 * @example
 * ```ts
 * import { FIRST_STONE } from "@johnmorrisdotca/narabe";
 * console.log(FIRST_STONE);
 * ```
 */
export const FIRST_STONE: Stone = STONES.black;

export { COLUMN_LETTERS, DIRECTIONS, HEX_LINE_DIRECTIONS, lineDirectionsFor, STAR_POINTS } from "./board.constants.ts";
