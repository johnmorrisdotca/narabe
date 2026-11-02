import {
  BOARD_GRIDS,
  BOARD_SIZES,
  BRAZILIAN_DRAUGHTS_RULES,
  CANADIAN_CHECKERS_RULES,
  ENGLISH_CHECKERS_RULES,
  FORBIDDEN_PATTERNS,
  INTERNATIONAL_DRAUGHTS_RULES,
  LINE_RULES,
  OPENING_RULES,
  PIECE_QUEUES,
  PLACEMENTS,
  POOL_CHECKERS_RULES,
  RUSSIAN_DRAUGHTS_RULES,
  STARTING_DISCS,
  STONES,
  TRADITIONAL_HEAD_STARTS,
  WIN_LENGTH,
  WRAP_MODES,
} from "./constants.ts";
import { ROCK_PLACEMENTS } from "./rules/rocks.constants.ts";
import type {
  CheckersRules,
  ForbiddenPattern,
  HeadStartTurns,
  OpeningRule,
  RuleVariant,
  Stone,
  VariantSpec,
} from "./types.ts";

/** The table of variants: one row per game. The engine reads the row and never the game's name. */

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

/** International draughts' own board, as the FMJD plays it. */
const INTERNATIONAL_DRAUGHTS_SIZES = [10] as const;
/** Brazilian draughts: the international rules on the 8×8 board. */
const BRAZILIAN_DRAUGHTS_SIZES = [8] as const;
/** Canadian checkers: the international rules on a 12×12 board. */
const CANADIAN_CHECKERS_SIZES = [12] as const;

/** Russian draughts and Pool checkers: both on the 8×8 board. */
const RUSSIAN_DRAUGHTS_SIZES = [8] as const;
const POOL_CHECKERS_SIZES = [8] as const;

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
    mills: false,
    movers: null,
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
  return small({
    flips: true,
    analysis: false,
    grid: BOARD_GRIDS.cells,
    ...overrides,
    boardSizes: overrides.boardSizes ?? REVERSI_SIZES,
  });
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
 *
 * @example
 * ```ts
 * import { VARIANT_SPECS } from "@johnmorrisdotca/narabe";
 * console.log(VARIANT_SPECS);
 * ```
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
  omok: plain({
    grid: BOARD_GRIDS.lines,
    forbidden: { black: OMOK_PATTERNS, white: OMOK_PATTERNS },
    headStartTurns: 2,
  }), // 3 free turns give an open four.
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
  ninuki: plain({
    grid: BOARD_GRIDS.lines,
    captures: true,
    capturesToWin: 10,
    allowFirstPlayerChoice: true,
    headStartTurns: 1,
  }),
  sannuki: plain({
    grid: BOARD_GRIDS.lines,
    captures: true,
    captureSizes: [2, 3],
    headStartTurns: 1, // 2 not shown safe within budget: captures keep every line open.
    capturesToWin: 15,
    allowFirstPlayerChoice: true,
  }),
  misereFive: plain({
    grid: BOARD_GRIDS.lines,
    misere: true,
    allowFirstPlayerChoice: true,
    openings: FREE_ONLY,
    headStartTurns: 0,
  }), // A free turn is a burden where making the line loses, so it is no head start.
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
  wildTicTacToe: small({
    grid: BOARD_GRIDS.cells,
    winLength: 3,
    anyColour: true,
    boardSizes: [3],
    analysis: false,
    headStartTurns: 0,
  }), // 1 free turn is a forced line.
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
  edgeDrop: small({
    grid: BOARD_GRIDS.cells,
    winLength: 4,
    placement: PLACEMENTS.edge,
    boardSizes: [7, 9, 10],
    headStartTurns: 0,
  }), // 1 not shown safe within budget.
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
  twistFive: small({
    grid: BOARD_GRIDS.cells,
    winLength: 5,
    quadrantSize: 3,
    boardSizes: [6],
    analysis: false,
    headStartTurns: 1,
  }), // 2 not shown safe: the twists outrun the budget.
  twistFour: small({
    grid: BOARD_GRIDS.cells,
    winLength: 4,
    quadrantSize: 2,
    boardSizes: [4],
    analysis: false,
    headStartTurns: 0,
  }), // 1 not shown safe: the twists outrun the budget.
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
   * Nine Men's Morris: three squares joined at their sides. Nine men each to lay and then to move
   * along the lines, three in a line taking one of the other side's, and a player brought down to two, or with no move, losing.
   * No line is read as a win (`winLength` is never asked), and no reading of threats fits it.
   */
  nineMensMorris: small({
    grid: BOARD_GRIDS.lines,
    headStartTurns: 0,
    winLength: 3,
    pieces: 9,
    mills: true,
    boardSizes: [7],
    analysis: false,
  }),
  // The moving games, each decided by something other than a line (`rules/movers.ts`): on no reading of threats, drawn in the squares.
  breakthrough: small({
    grid: BOARD_GRIDS.cells,
    headStartTurns: 0,
    movers: "breakthrough",
    allowFirstPlayerChoice: false,
    boardSizes: [8],
    analysis: false,
  }),
  linesOfAction: small({
    grid: BOARD_GRIDS.cells,
    headStartTurns: 0,
    movers: "linesOfAction",
    allowFirstPlayerChoice: false,
    boardSizes: [8],
    analysis: false,
  }),
  // White moves first, as the game's own rules have it.
  amazons: small({
    grid: BOARD_GRIDS.cells,
    headStartTurns: 0,
    movers: "amazons",
    allowFirstPlayerChoice: false,
    firstStone: STONES.white,
    boardSizes: [10],
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
  reversi: flipping({
    startingDiscs: STARTING_DISCS.fixed,
    headStart: TRADITIONAL_HEAD_STARTS.corners,
    headStartTurns: 0,
  }), // 1 free turn takes the last disc.
  classicReversi: flipping({
    startingDiscs: STARTING_DISCS.laid,
    headStart: TRADITIONAL_HEAD_STARTS.corners,
    headStartTurns: 1,
  }), // 2 free turns take the last disc.
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
  halma: small({
    grid: BOARD_GRIDS.cells,
    camps: true,
    analysis: false,
    boardSizes: HALMA_SIZES,
    defaultBoard: 16,
    headStartTurns: 3,
  }), // 3 never decides: a race needs every piece home.
  // On the crossings of a triangular lattice, as a wooden Hex board is ruled: see HEX_LATTICE.
  hex: small({
    grid: BOARD_GRIDS.lines,
    connects: true,
    analysis: false,
    boardSizes: HEX_SIZES,
    openings: [OPENING_RULES.free, OPENING_RULES.swap],
    headStartTurns: 3,
  }), // 3 never decides: a chain needs a stone on every row.
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
  internationalDraughts: federationDraughts(
    INTERNATIONAL_DRAUGHTS_RULES,
    INTERNATIONAL_DRAUGHTS_SIZES,
    STONES.white,
    3,
  ), // 3 free moves never force a capture.
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

/** The board sizes a variant plays on, smallest first — the order they are drawn in.
 *
 * @param variant - The native rule variant identifier.
 * @returns The board sizes a variant plays on, smallest first — the order they are drawn in.
 * @example
 * ```ts
 * import { boardSizesFor } from "@johnmorrisdotca/narabe";
 *
 * console.log(boardSizesFor("go"));
 * ```
 */
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
 *
 * @param variant - The native rule variant identifier.
 * @returns The board a game OPENS on, where nothing else has said: its own `defaultBoard` if it has one, else the first of its boards. Asked for by name rather than read off the front of the list, because the list is in numerical order and the two facts had been the same number by accident. Sorting the lists moved Halma's default from its own sixteen to the quick eight and Honeycomb's from the 91-cell board to the 37, and nothing would have said so.
 * @example
 * ```ts
 * import { defaultBoardFor } from "@johnmorrisdotca/narabe";
 *
 * console.log(defaultBoardFor("reversi"));
 * ```
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
 *
 * @param variant - The native rule variant identifier.
 * @param size - The number of cells on each side of the board.
 * @returns The supported board size resolved for the variant and requested side length.
 * @example
 * ```ts
 * import { sizeForVariant } from "@johnmorrisdotca/narabe";
 *
 * console.log(sizeForVariant("checkers",15));
 * ```
 */
export function sizeForVariant(variant: RuleVariant, size: number): number {
  const sizes = VARIANT_SPECS[variant].boardSizes;
  return sizes === null || sizes.includes(size) ? size : defaultBoardFor(variant);
}
