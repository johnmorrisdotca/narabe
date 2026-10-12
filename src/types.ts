/**
 * Domain types for the gomoku engine. The engine is pure: every function in
 * `engine.ts` takes a `GameState` and returns a new one, so the UI can hold a
 * single state value and the rules can be tested without a browser.
 */

import type { ForbiddenPattern, LineRule, StartingDiscs } from "./spec.types.ts";

export type {
  BoardGrid,
  CaptureChoice,
  CheckersRules,
  CrownMidCapture,
  EndgameCount,
  EndgameCountKind,
  ForbiddenPattern,
  LineRule,
  PieceTally,
  Placement,
  HeadStartTurns,
  StartingDiscs,
  TraditionalHeadStart,
  WrapMode,
} from "./spec.types.ts";

/** One of the two stone colours.
 *
 * @example
 * ```ts
 * import type { Stone } from "@johnmorrisdotca/narabe";
 *
 * const value: Stone = "black";
 * console.log(value);
 * ```
 */
export type Stone = "black" | "white";

/** An intersection the rules have taken out of play. See `obstacles.ts`.
 *
 * @example
 * ```ts
 * import type { Blocked } from "@johnmorrisdotca/narabe";
 *
 * const value: Blocked = "blocked";
 * console.log(value);
 * ```
 */
export type Blocked = "blocked";

/** A hotspot: an intersection that counts as either colour's stone in a line.
 *
 * @example
 * ```ts
 * import type { Hot } from "@johnmorrisdotca/narabe";
 *
 * const value: Hot = "hot";
 * console.log(value);
 * ```
 */
export type Hot = "hot";

/** A wormhole: a line entering it comes out of its partner and carries on.
 *
 * @example
 * ```ts
 * import type { Worm } from "@johnmorrisdotca/narabe";
 *
 * const value: Worm = "worm";
 * console.log(value);
 * ```
 */
export type Worm = "worm";

/** One intersection of the board: a stone, an obstacle, a hotspot, a wormhole, or nothing.
 *
 * @example
 * ```ts
 * import type { Cell } from "@johnmorrisdotca/narabe";
 *
 * const value: Cell = null;
 * console.log(value);
 * ```
 */
export type Cell = Stone | Blocked | Hot | Worm | null;

/** Zero-based board coordinates. Row 0 is the top, column 0 is the left.
 *
 * @example
 * ```ts
 * import type { Point } from "@johnmorrisdotca/narabe";
 *
 * const value: Point = {row:7,col:7};
 * console.log(value);
 * ```
 */
export type Point = {
  row: number;
  col: number;
};

/**
 * `place`: an ordinary stone.
 * `skip`: a deliberately wasted move, dropped on the emptiest corner.
 * `move`: a piece stepping from `from` to the move's point, in the games
 * where a fixed handful of pieces move once they are all down.
 * `piece`: a multi-cell piece from the queue, laid as `cells`.
 * `pass`: a turn taken without a stone that the rules offered — nothing fit, or
 * Go, where passing is always a choice. A missed deadline is a pass too
 * wherever a pass is on offer, since there it IS one.
 * `forfeit`: a turn taken away by the clock where the rules offer no pass.
 * Only a claimed timeout writes one, and a replay applies it only to a record
 * that ran a clock. Kept apart from `pass` because the two replay differently:
 * a pass the rules refuse stops a replay, and a forfeit read as a pass would
 * stop every game with a timeout in it at the turn that was lost.
 * Neither has a point; their row and column are -1.
 *
 * @example
 * ```ts
 * import type { MoveKind } from "@johnmorrisdotca/narabe";
 *
 * const value: MoveKind = "place";
 * console.log(value);
 * ```
 */
export type MoveKind = "place" | "skip" | "move" | "piece" | "pass" | "forfeit";

/**
 * What a replay needs to know about a record that its moves cannot say.
 *
 * `clocked`: the game ran a clock, so a turn lost to it may be on the record.
 * False for anything that never had one — a board at one screen, a filed game
 * from a browser — and there a forfeit is refused like any other move the
 * rules could not have produced.
 *
 * @example
 * ```ts
 * import type { ReplayFacts } from "@johnmorrisdotca/narabe";
 *
 * const value: ReplayFacts = {clocked:false};
 * console.log(value);
 * ```
 */
export type ReplayFacts = {
  clocked: boolean;
};

/** One cell of a multi-cell piece, with the colour it carries.
 *
 * @example
 * ```ts
 * import type { PieceCell } from "@johnmorrisdotca/narabe";
 *
 * const value: PieceCell = {row:7,col:7,stone:"black"};
 * console.log(value);
 * ```
 */
export type PieceCell = Point & { stone: Stone };

/** A piece from the queue: its cells relative to the top-left of its bounding box.
 *
 * @example
 * ```ts
 * import type { Piece } from "@johnmorrisdotca/narabe";
 *
 * const value: Piece = {cells:[{row:0,col:0,stone:"black"},{row:0,col:1,stone:"white"}]};
 * console.log(value);
 * ```
 */
export type Piece = {
  cells: readonly PieceCell[];
};

/** Which queue of pieces a game draws from.
 *
 * @example
 * ```ts
 * import type { PieceQueue } from "@johnmorrisdotca/narabe";
 *
 * const value: PieceQueue = "domino";
 * console.log(value);
 * ```
 */
export type PieceQueue = "domino" | "tetro";

/** A quarter turn of one quadrant, which ends a move in the twist games.
 *
 * @example
 * ```ts
 * import type { Twist } from "@johnmorrisdotca/narabe";
 *
 * const value: Twist = {quadrant:0,clockwise:true};
 * console.log(value);
 * ```
 */
export type Twist = {
  quadrant: number;
  clockwise: boolean;
};

/** A move rebuilt by the engine, including captures and other replay effects.
 *
 * @example
 * ```ts
 * import type { Move } from "@johnmorrisdotca/narabe";
 *
 * const value: Move = {row:7,col:7,stone:"black",kind:"place"};
 * console.log(value);
 * ```
 */
export type Move = Point & {
  /** The colour of the stone placed. */
  stone: Stone;
  /** The colour that moved, when the game lets a mover place the other colour. */
  by?: Stone;
  kind: MoveKind;
  /** Opponent stones this move took off the board, in the capture variants. */
  captured?: Point[];
  /** Where a moving piece came from. Only on `move` kinds. */
  from?: Point;
  /** The twist that finished this move, once it has been made. */
  twist?: Twist;
  /** The bottom row this move cleared, so it can be put back by an undo. */
  cleared?: Cell[];
  /** The cells a piece covered, with their colours, on `piece` kinds. */
  cells?: PieceCell[];
  /** Whether the piece making this move was already a king. Checkers only, for undo. */
  wasKing?: boolean;
  /** Whether the piece this move captured was itself a king. Checkers only, for undo. */
  capturedWasKing?: boolean;
  /** Whether this move continued a capture chain already under way. Checkers only, for undo. */
  continuedChain?: boolean;
  /**
   * Whether this move crowned the piece that made it. Checkers only, and only
   * where it did: an endgame count reads the record back to the move that
   * entered its ending, and a man becoming a king changes which ending it is.
   */
  crowned?: boolean;
  /**
   * On a pass: whether it was forced — the colour had nothing it could play —
   * rather than chosen, as a pass in Go is. Set by `passTurn` when the pass is
   * made, so a replay of the record sets it again; never stored.
   */
  forced?: boolean;
  /**
   * On a pass: whether it was a turn the other colour's head start took —
   * see `owesHeadStart`. Set by `passTurn` from the position, like `forced`,
   * and never stored.
   */
  headStart?: boolean;
  /** The ko point in force just before this move, so undo can put it back. Go only. */
  koPointBefore?: Point | null;
};

/** The shape of a move as a record or a request carries it, without the colour.
 *
 * @example
 * ```ts
 * import type { MoveInput } from "@johnmorrisdotca/narabe";
 *
 * const value: MoveInput = {row:7,col:7};
 * console.log(value);
 * ```
 */
export type MoveInput = Point & {
  /** As a record stores it: a string, checked against MOVE_KINDS where it matters. */
  kind?: string;
  /** The colour placed, where the mover chose it. */
  stone?: string;
  from?: Point;
  twist?: Twist;
  cells?: PieceCell[];
};

/**
 * The named rule sets. Each is described as data in `VARIANT_SPECS`, so the
 * engine reads a spec rather than switching on the name.
 *
 * `freestyle`: five or more in a row wins.
 * `standard`: exactly five wins; an overline (six or more) does not.
 * `renju`: black is forbidden the double three, double four and overline.
 * `omok`: the double three is forbidden for both sides; overlines win.
 * `caro`: exactly five wins, and not when blocked at both ends.
 * `ninuki`: five in a row wins, and so does capturing five pairs.
 * `connect6`: two stones a turn, six in a row wins.
 *
 * @example
 * ```ts
 * import type { RuleVariant } from "@johnmorrisdotca/narabe";
 *
 * const value: RuleVariant = "reversi";
 * console.log(value);
 * ```
 */
export type RuleVariant =
  | "freestyle"
  | "standard"
  | "renju"
  | "omok"
  | "caro"
  | "ninuki"
  | "connect6"
  | "tictactoe"
  | "trapThree"
  | "dropFour"
  | "twistFive"
  | "twistFour"
  | "squareFour"
  | "ringDrop"
  | "holeDrop"
  | "hotDrop"
  | "clearDrop"
  | "giveawayDrop"
  | "edgeDrop"
  | "dominoFive"
  | "blockFive"
  | "sannuki"
  | "wormDrop"
  | "misereFive"
  | "makerBreaker"
  | "wildTicTacToe"
  | "notakto"
  | "toroidalFive"
  | "reversi"
  | "classicReversi"
  | "antiReversi"
  | "miniReversi"
  | "grandReversi"
  | "honeycomb"
  | "halma"
  | "hex"
  | "hexFive"
  | "obstacleFive"
  | "rockfall"
  | "scatteredRocks"
  | "checkers"
  | "internationalDraughts"
  | "brazilianDraughts"
  | "canadianCheckers"
  | "russianDraughts"
  | "poolCheckers"
  | "chineseCheckers"
  | "go";

/**
 * How the first stones go down. Everything after the opening is the variant's
 * business; these only shape the start, to blunt black's first-move advantage.
 *
 * `free`: anywhere, any order.
 * `pro` / `longPro`: black opens at tengen and black's second stone must leave
 * the central 5×5 (7×7 for long pro).
 * `swap`: seat one places three stones, seat two picks a colour.
 * `swap2`: as swap, but seat two may instead add two stones and hand the choice
 * back.
 * `rif`: the classic renju opening — centre, then inside the 3×3, then inside
 * the 5×5, after which white may swap colours.
 * `sakata`: the RIF start and swap, and then the fifth stone must land inside
 * the central 7×7.
 * `tarannikov`: the first five stones must land inside the central 1×1, 3×3,
 * 5×5, 7×7 and 9×9 in turn, and after each of them the other seat may swap.
 *
 * @example
 * ```ts
 * import type { OpeningRule } from "@johnmorrisdotca/narabe";
 *
 * const value: OpeningRule = "swap2";
 * console.log(value);
 * ```
 */
export type OpeningRule =
  | "free"
  | "pro"
  | "longPro"
  | "swap"
  | "swap2"
  | "rif"
  | "sakata"
  | "tarannikov";

/**
 * How a won game was won. Null while nobody has. `trap` is the loser's doing:
 * they made the line the rules forbid. `square` is four in a 2×2. `blocked`
 * is the checkers family: the colour to move has no legal move left, whether
 * because it has no pieces or because every one of them is shut in.
 *
 * @example
 * ```ts
 * import type { WinReason } from "@johnmorrisdotca/narabe";
 *
 * const value: WinReason = "territory";
 * console.log(value);
 * ```
 */
export type WinReason = "line" | "captures" | "time" | "resign" | "trap" | "square" | "full" | "count" | "camp" | "connection" | "blocked" | "territory";

/**
 * Where a swap-style opening stands. `placing` and `extending` are stretches
 * where one seat lays every stone regardless of colour; `choosing` is a pause
 * where no stone is legal until the deciding seat has picked a colour.
 *
 * @example
 * ```ts
 * import type { OpeningStage } from "@johnmorrisdotca/narabe";
 *
 * const value: OpeningStage = "placing";
 * console.log(value);
 * ```
 */
export type OpeningStage = "placing" | "choosing" | "extending" | "done";

/** A decision taken during the opening: a colour, or two more stones.
 *
 * @example
 * ```ts
 * import type { OpeningChoice } from "@johnmorrisdotca/narabe";
 *
 * const value: OpeningChoice = "extend";
 * console.log(value);
 * ```
 */
export type OpeningChoice = Stone | "extend";

/** The opening protocol stage, acting seat and recorded colour choices.
 *
 * @example
 * ```ts
 * import { createGame } from "@johnmorrisdotca/narabe";
 * import type { OpeningState } from "@johnmorrisdotca/narabe";
 *
 * const state = createGame({variant:"freestyle",size:15});
 * const value: OpeningState = state.opening;
 * console.log(value);
 * ```
 */
export type OpeningState = {
  stage: OpeningStage;
  /** The seat acting outside the normal turn order, if any. */
  actor: Seat | null;
  /** Every decision so far, so a stored game can be replayed through them. */
  choices: OpeningChoice[];
};

export type { VariantSpec } from "./variantSpec.types.ts";

/**
 * Extra restrictions one colour plays under, so a stronger player can give a
 * weaker one a fair game. Every item is a rule some variant already imposes on
 * a colour, applied here on top of whatever the variant says. A handicap
 * belongs to a colour, not a seat, so seat swaps are off while one is set.
 *
 * `doubleThree` / `doubleFour` / `overline`: shapes this colour may not make.
 * `exactLine`: this colour's overline is not a win.
 * `openLine`: this colour's winning line must not be shut in at both ends.
 * `longerLine`: this colour needs one more stone in a row.
 * `singleStone`: one stone a turn where the variant gives two.
 * `noCaptures`: this colour does not capture, in the capture variants.
 * `secondStoneExclusion`: this colour's second stone must land outside the
 * central square of this half-width (2 for 5×5, 3 for 7×7); 0 for none.
 *
 * @example
 * ```ts
 * import type { Handicap } from "@johnmorrisdotca/narabe";
 * import { NO_HANDICAP } from "@johnmorrisdotca/narabe";
 *
 * const value: Handicap = {...NO_HANDICAP,stone:"black",doubleThree:true};
 * console.log(value);
 * ```
 */
export type Handicap = {
  stone: Stone | null;
  doubleThree: boolean;
  doubleFour: boolean;
  overline: boolean;
  exactLine: boolean;
  openLine: boolean;
  longerLine: boolean;
  singleStone: boolean;
  noCaptures: boolean;
  secondStoneExclusion: number;
};

/** The toggles of a handicap, without the colour that carries them.
 *
 * @example
 * ```ts
 * import type { HandicapRule } from "@johnmorrisdotca/narabe";
 *
 * const value: HandicapRule = "doubleThree";
 * console.log(value);
 * ```
 */
export type HandicapRule = Exclude<keyof Handicap, "stone" | "secondStoneExclusion">;

/**
 * A start given to one colour — the weaker player's — before the game is even.
 *
 * `freeTurns`: turns this colour takes at the start with nothing played
 * between them, 0 to 3. Each is recorded as the other colour's pass, so a
 * replay reaches the same position from the move list alone.
 * `traditional`: how much of the game's own traditional head start this colour
 * is given — handicap stones, corners, or the other side's men taken off —
 * as its spec's `headStart` names; 0 for none. See `rules/headStart.ts`.
 *
 * The opposite colour from a handicap's, by nature: a handicap makes the
 * stronger side's game harder, a head start makes the weaker side's easier.
 *
 * @example
 * ```ts
 * import type { HeadStart } from "@johnmorrisdotca/narabe";
 *
 * const value: HeadStart = {stone:"black",freeTurns:1,traditional:0};
 * console.log(value);
 * ```
 */
export type HeadStart = {
  stone: Stone | null;
  freeTurns: number;
  traditional: number;
};

/**
 * EVERYTHING THAT MAKES A GAME UNEVEN ON PURPOSE, as `hasHandicap` reads it:
 * the per-colour handicap and the head start. Every question that takes it —
 * whether a rating may move, on the pages, the set-up screen and the writers —
 * has to be handed both, so none of them can go on rating a game with either.
 *
 * @example
 * ```ts
 * import type { HandicapTerms } from "@johnmorrisdotca/narabe";
 * import { NO_HANDICAP, NO_HEAD_START } from "@johnmorrisdotca/narabe";
 *
 * const value: HandicapTerms = {handicap:NO_HANDICAP,headStart:NO_HEAD_START};
 * console.log(value);
 * ```
 */
export type HandicapTerms = Pick<GameSettings, "handicap" | "headStart">;

/**
 * The rules one colour actually plays under: the variant's spec for that
 * colour with the handicap laid over it. Everything in the engine that asks
 * "may this colour…" reads one of these, never the spec directly.
 *
 * @example
 * ```ts
 * import { createGame, rulesFor } from "@johnmorrisdotca/narabe";
 * import type { ColourRules } from "@johnmorrisdotca/narabe";
 *
 * const state = createGame({variant:"freestyle",size:15});
 * const value: ColourRules = rulesFor(state.settings,"black");
 * console.log(value);
 * ```
 */
export type ColourRules = {
  lineRule: LineRule;
  forbidden: readonly ForbiddenPattern[];
  captures: boolean;
  stonesPerTurn: number;
  winLength: number;
  secondStoneExclusion: number;
};

/** Whether the game is playing, won or drawn.
 *
 * @example
 * ```ts
 * import type { GameStatus } from "@johnmorrisdotca/narabe";
 *
 * const value: GameStatus = "playing";
 * console.log(value);
 * ```
 */
export type GameStatus = "playing" | "won" | "draw";

/**
 * A rule that has narrowed the moves on offer below what the pieces could
 * make: a capture that must be made, or carried on, instead of a step; or —
 * where the game takes the most — the capture taking the most pieces, over
 * shorter ones the pieces also have.
 *
 * @example
 * ```ts
 * import type { MoveNarrowing } from "@johnmorrisdotca/narabe";
 *
 * const value: MoveNarrowing = "capture";
 * console.log(value);
 * ```
 */
export type MoveNarrowing = "capture" | "mostCaptured";

/** Whether a turn moves a piece already on the board, or places on a point.
 *
 * @example
 * ```ts
 * import type { TurnChoiceKind } from "@johnmorrisdotca/narabe";
 *
 * const value: TurnChoiceKind = "move";
 * console.log(value);
 * ```
 */
export type TurnChoiceKind = "move" | "place";

/** What the colour to move may do this turn, as the engine answers it — see `turnChoices`.
 *
 * @example
 * ```ts
 * import type { TurnChoices } from "@johnmorrisdotca/narabe";
 *
 * const value: TurnChoices = {kind:"place",points:[{row:7,col:7}],count:1};
 * console.log(value);
 * ```
 */
export type TurnChoices =
  | { kind: "move"; pieces: Point[]; count: number; narrowedBy: MoveNarrowing | null }
  | { kind: "place"; points: Point[]; count: number };

/**
 * Who opens. `random` is resolved once when the game is created — the engine
 * stays pure by taking the roll as an argument, see `resolveOpener`.
 *
 * @example
 * ```ts
 * import type { FirstPlayer } from "@johnmorrisdotca/narabe";
 *
 * const value: FirstPlayer = "random";
 * console.log(value);
 * ```
 */
export type FirstPlayer = Stone | "random";

/**
 * `none`: every intersection is playable.
 * `hoshi`: the star points are blocked, except tengen at the centre.
 *
 * @example
 * ```ts
 * import type { ObstacleLayout } from "@johnmorrisdotca/narabe";
 *
 * const value: ObstacleLayout = "hoshi";
 * console.log(value);
 * ```
 */
export type ObstacleLayout = "none" | "hoshi";

/**
 * The two people at the board. Seats are distinct from stone colours because
 * `swapSeats` exchanges them mid-game — see `GameState.seats`.
 *
 * @example
 * ```ts
 * import type { Seat } from "@johnmorrisdotca/narabe";
 *
 * const value: Seat = "one";
 * console.log(value);
 * ```
 */
export type Seat = "one" | "two";

/**
 * When a game nobody has won is called a draw.
 *
 * Some of these games can run for ever between two careful players, and a
 * board that never fills is a game neither side can leave. The limit is a
 * share of the board's points rather than a number of moves, so it needs no
 * arithmetic per size: the same setting means something sensible on 9x9 and
 * on 19x19.
 *
 * @example
 * ```ts
 * import type { DrawLimit } from "@johnmorrisdotca/narabe";
 *
 * const value: DrawLimit = "half";
 * console.log(value);
 * ```
 */
export type DrawLimit = "none" | "half" | "threeQuarters";

/** Native rule, layout, opening, handicap and optional action settings.
 *
 * @example
 * ```ts
 * import type { GameSettings } from "@johnmorrisdotca/narabe";
 * import { createGame } from "@johnmorrisdotca/narabe";
 *
 * const value: GameSettings = createGame({variant:"go",size:9}).settings;
 * console.log(value);
 * ```
 */
export type GameSettings = {
  /** Board is `size` × `size` intersections. */
  size: number;
  /** Stones in a line needed to win. */
  winLength: number;
  variant: RuleVariant;
  opening: OpeningRule;
  handicap: Handicap;
  /** A start for one colour, see HeadStart. `NO_HEAD_START` for an even game. */
  headStart: HeadStart;
  /**
   * The random seed the game was created with: it places dead and hot
   * squares and draws the piece queues, so a stored game reproduces them.
   */
  seed: number;
  /** Pairs a colour must capture to win, in the variants that capture. */
  capturesToWin: number;
  firstPlayer: FirstPlayer;
  obstacles: ObstacleLayout;
  /**
   * In the flipping games, whether the centre four discs start placed or are
   * laid by the players. Absent, the game's own rule applies.
   */
  openingDiscs?: StartingDiscs;
  /** Taking a move back. Off by default in the stricter variants. */
  allowUndo: boolean;
  /** Burning a turn on a corner stone rather than playing where it matters. */
  allowSkip: boolean;
  /** Trading seats with the opponent. `swapsPerSeat` caps how often. */
  allowSwap: boolean;
  swapsPerSeat: number;
  /**
   * Letting the board change size mid-game, re-centring the stones: up when a
   * game has run out of room, down when it is dragging and the outer ring is
   * unused. Both directions need the other player to agree.
   */
  allowResize: boolean;
  /**
   * Calling a long game a draw. `none` plays it out, which is how every game
   * here behaved before this existed and is still the default.
   */
  drawLimit: DrawLimit;
};

/** The complete immutable position and its move history, seats and outcome.
 *
 * @example
 * ```ts
 * import { createGame, playMove } from "@johnmorrisdotca/narabe";
 * import type { GameState } from "@johnmorrisdotca/narabe";
 *
 * const state = createGame({variant:"freestyle",size:15});
 * const point = {row:7,col:7};
 * const value: GameState = playMove(state,point);
 * console.log(value);
 * ```
 */
export type GameState = {
  settings: GameSettings;
  /** Row-major, `size * size` entries. See `indexOf` / `pointOf`. */
  board: Cell[];
  /** Every move played so far, in order. */
  moves: Move[];
  /** The colour that opened, kept so the game can be replayed from move zero. */
  opener: Stone;
  /** Which seat currently holds each colour. Exchanged by `swapSeats`. */
  seats: Record<Stone, Seat>;
  /** Swaps each seat has spent, counted against `settings.swapsPerSeat`. */
  swapsUsed: Record<Seat, number>;
  /** Pairs each colour has captured. Always zero outside the capture variants. */
  captures: Record<Stone, number>;
  opening: OpeningState;
  toPlay: Stone;
  /** True between placing a stone and turning a quadrant, in the twist games. */
  pendingTwist: boolean;
  /** Board squares holding a crowned piece, in the checkers family. Empty everywhere else. */
  kings: readonly Point[];
  /** The square of a piece mid-capture-chain that must keep jumping, in the checkers family. Null otherwise. */
  chainAt: Point | null;
  /** The point the simple ko rule forbids retaking this move, in Go. Null otherwise. */
  koPoint: Point | null;
  status: GameStatus;
  winner: Stone | null;
  winBy: WinReason | null;
  /** The stones that completed the winning line, empty until someone wins. */
  winningLine: Point[];
};
