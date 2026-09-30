import type { OpeningRule, PieceQueue, Stone } from "./types.ts";
import type { RockSpec } from "./rules/rocks.types.ts";
import type {
  BoardGrid,
  CheckersRules,
  ForbiddenPattern,
  LineRule,
  Placement,
  HeadStartTurns,
  StartingDiscs,
  TraditionalHeadStart,
  WrapMode,
} from "./spec.types.ts";

/*
 * The row a rule set is written as, on its own.
 *
 * Lifted out of gomoku.types.ts when the checkers family's rules joined it and
 * that file passed the File Size Gate. It is one job: every field here is a
 * choice a game makes, read by the engine instead of the game's name, and none
 * of it is the state of a game in progress, a move, or a setting a player
 * picks — which is what the rest of gomoku.types.ts describes. gomoku.types.ts
 * re-exports it, so it is still reached from there.
 */

/**
 * One rule set, as data. The engine consults this and never the variant's
 * name, so adding a variant is a matter of adding a row.
 */
export type VariantSpec = {
  /** Per colour, because renju lets white win with an overline and not black. */
  lineRule: Record<Stone, LineRule>;
  forbidden: Record<Stone, readonly ForbiddenPattern[]>;
  /** Flanking a pair of enemy stones removes them. */
  captures: boolean;
  stonesPerTurn: number;
  /** Connect6 opens with a single stone before the two-a-turn rhythm starts. */
  firstTurnStones: number;
  /** A pinned line length, or null when the players may choose. */
  winLength: number | null;
  /** Whether the players may hand the first stone to white or draw lots. */
  allowFirstPlayerChoice: boolean;
  /**
   * The colour that moves first where the players may not choose — and under
   * an opening protocol, which always starts from it. Black for nearly every
   * game here; White for the draughts games whose federations give White the
   * first move.
   */
  firstStone: Stone;
  openings: readonly OpeningRule[];
  placement: Placement;
  /** Making exactly this many in a row loses, as in the trap game; null when nothing does. */
  loseLength: number | null;
  /** Side of the quadrants a move ends by rotating; null when moves do not twist. */
  quadrantSize: number | null;
  /** Pieces per player; once all are down, a turn moves one. Null for unlimited stones. */
  pieces: number | null;
  /** A 2×2 square of one colour also wins. */
  squareWins: boolean;
  /**
   * Board sizes this game is played on, or null for the standard list.
   *
   * IN NUMERICAL ORDER, ALWAYS, because that is the order they are drawn in —
   * John, 2026-09-21: "the order of the Boards, on all pages should be
   * numerical." They used to be written default-first, which put Halma at 16,
   * 10, 8 and Honeycomb at 11, 7, 9, 13 in every picker on the site.
   */
  boardSizes: readonly number[] | null;
  /**
   * The board a game opens on where it is not the smallest — Halma's own
   * sixteen, Honeycomb's ninety-one cells, Go's nineteen. Null means the first
   * of `boardSizes`, which is now the smallest.
   *
   * A field rather than a position in the list, because those are two
   * different facts and reading one off the other is what made the order a
   * decision it should never have been: sorting the list silently opened
   * Halma on the quick board and Honeycomb on the small hexagon.
   */
  defaultBoard: number | null;
  /** Where its stones sit when it is drawn its own way — see `BoardGrid`. Declared, never inferred. */
  grid: BoardGrid;
  /** Whether the threat reading means anything; off where stones move after placing. */
  analysis: boolean;
  /**
   * Which edges join. `columns` is a cylinder — left meets right; `both` is a
   * torus, where top meets bottom as well. A mode rather than two booleans
   * because "rows wrap but columns do not" is the same cylinder turned on its
   * side, and there is no reason for the type to allow two ways to say it.
   */
  wrap: WrapMode;
  /** Squares taken out of play at random when the game starts, or when the rocks fall (see `rocks`). */
  deadSquares: number;
  /** Squares that count as either colour's stone, placed at random when the game starts, or when the rocks fall. */
  hotSquares: number;
  /**
   * The rock games' way of laying the dead squares and hotspots above, or null
   * for the older way (`randomSquares`). When set, `rules/rocks.ts` lays them
   * from the seed across the whole board, never on the centre, and they land
   * when the game starts or, with `arriveAfter`, once that many stones have
   * been played — on the empty points only. The counts stay in `deadSquares`
   * and `hotSquares`, so everything that asks whether a game has either still
   * reads one field.
   */
  rocks: RockSpec | null;
  /** A full bottom row disappears and everything above it drops, as in the falling-block game. */
  lineClear: boolean;
  /** Making the winning line loses, and a full board goes to the player who opened. */
  misere: boolean;
  /** Pieces come from a shared seeded queue rather than being single stones. */
  queue: PieceQueue | null;
  /** Single stones of your own colour each player may lay instead of a piece. */
  singles: number;
  /** How many enemy stones a flank may take at once: pairs, or pairs and triples. */
  captureSizes: readonly number[];
  /** Enemy stones to capture for a win, in stones, in the capture variants. */
  capturesToWin: number | null;
  /** Two random squares joined by a wormhole: a line entering one leaves the other. */
  wormholes: number;
  /** The mover chooses the colour of every stone. */
  anyColour: boolean;
  /** Every stone is black, whoever placed it. */
  singleColour: boolean;
  /** Maker wants a line of either colour; breaker wants a full board without one. */
  makerBreaker: boolean;
  /**
   * The flipping games. A stone may only be placed where it flanks a line of
   * the other colour, which then turns; a colour with no such place passes;
   * when neither can move the discs are counted. Lines and captures mean
   * nothing here — the whole of the game is in the flip.
   */
  flips: boolean;
  /** How the centre is set before the first move: fixed, laid by the players, or empty. */
  startingDiscs: StartingDiscs;
  /**
   * The race games. Every piece starts in a corner camp; a move is a step or
   * a chain of jumps over any piece; filling the far camp wins. Lines,
   * captures and placing mean nothing here.
   */
  camps: boolean;
  /**
   * The connection game. A colour wins by joining its own two sides of the
   * board with a chain of touching stones, on a lattice where a cell touches
   * six others rather than four or eight. No lines, no captures, no draws.
   */
  connects: boolean;
  /**
   * The checkers family. Pieces stand on the board from the start and move
   * one diagonal step forward, or capture by jumping an adjacent enemy piece
   * into the empty square beyond. Capturing is forced whenever any of a
   * colour's pieces can, and a piece that jumps again from where it lands
   * keeps jumping in the same move for as long as it has another to take. A
   * man reaching the far row is crowned a king, which may move and capture
   * backward as well as forward; a colour with no legal move loses.
   */
  checkers: boolean;
  /**
   * How this game of the checkers family moves and takes — see `CheckersRules`.
   * Null exactly when `checkers` is false: a game with no men and no kings has
   * no answer to "may a man take backward", and a default here would be one.
   */
  checkersRules: CheckersRules | null;
  /**
   * Chinese Checkers: a hexagram board, embedded in a square Point grid the
   * way Hex's rhombus is, with the cells outside it sealed off as `BLOCKED`.
   * Otherwise the same race as Halma's `camps` — step or jump-chain to fill
   * the point opposite, nothing captured — just six hex directions in place
   * of eight square ones, and a star's points in place of a corner's square.
   */
  chineseCheckers: boolean;
  /**
   * A hexagonal board on the hexagon lattice, embedded in a square Point grid
   * the way Chinese Checkers' star is, with the cells outside the hexagon and
   * the one at its centre sealed off as `BLOCKED`. The rules are the flipping
   * game's, in six directions rather than eight: Reversi on a honeycomb. See
   * rules/hexagon.ts for the shape and rules/flips.ts for the six directions.
   */
  hexagon: boolean;
  /**
   * Go: stones never move once placed. A group of one colour with no
   * liberties left is captured whole; a move that would leave the mover's
   * own group with none, after any capture it makes, is suicide and illegal;
   * a move that would exactly retake the single stone a capture just lifted
   * is forbidden for one turn — the simple ko rule. Either side may pass at
   * any point; two passes in a row end the game, scored by area — every
   * stone on the board plus the empty points only that colour surrounds —
   * with a fixed komi added for white.
   */
  go: boolean;
  /**
   * The head start this game's own tradition gives a weaker player, or null
   * where it has none — see TraditionalHeadStart and `rules/headStart.ts`.
   * Every game also offers free turns at the start; this is what it adds.
   */
  headStart: TraditionalHeadStart | null;
  /**
   * The most free turns this game offers as a head start, 0 for none. A head
   * start must make a game easier, never decide it, so each game's figure is
   * the most its measurement shows cannot force a win within a short horizon
   * (`simulation.headStartDecides.ts`, held by `variants.coverage.test.ts`).
   * Declared on every row, never defaulted, as `grid` is.
   */
  headStartTurns: HeadStartTurns;
};
