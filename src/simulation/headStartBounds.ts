import { rulesFor, stonesLeft } from "../engine.ts";
import { BLOCKED, HOT, PLACEMENTS, STONES, VARIANT_SPECS, WRAP_MODES } from "../constants.ts";
import type { Cell, GameState, Point, Stone, VariantSpec, WrapMode } from "../types.ts";
import { otherStone } from "../rules/board.ts";
import { campSize, piecesHome } from "../rules/camps.ts";
import { STAR_RADIUS, starCampSize, starPiecesHome } from "../rules/chineseCheckers.ts";
import { headStartOf, headStartTurnsGiven } from "../rules/headStart.ts";
import { leavesNoStone } from "../rules/stoneless.ts";

/*
 * WHAT A HEAD START COULD STILL DECIDE, BOUNDED — for `simulation.headStartDecides.ts`.
 *
 * The search there asks whether the colour given a head start can force a win
 * inside a short horizon. These are necessary conditions for that: when one
 * fails, no line of play inside the horizon can decide the game, and the
 * search stops. Every bound here only ever over-states what the favoured side
 * could do — a line counted as open that gravity would never let it fill, an
 * opposing stone treated as removable where stones can be taken — so a
 * position cut off here is one the favoured side truly cannot decide, and a
 * "safe" verdict built on these bounds is a proof, not an estimate.
 */

const LINE_STEPS: readonly Point[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
];

const mover = (move: { by?: Stone; stone: Stone }) => move.by ?? move.stone;

/** Whether the favoured colour has made a turn of its own yet. */
export function hasBegun(state: GameState, favoured: Stone): boolean {
  return state.moves.some((move) => mover(move) === favoured && !leavesNoStone(move.kind));
}

/** Whether the other colour has played a turn of its own since the favoured colour began: the head start is behind them. */
function headStartSpent(state: GameState, favoured: Stone): boolean {
  let begun = false;
  for (const move of state.moves) {
    if (mover(move) === favoured) {
      if (!leavesNoStone(move.kind)) begun = true;
    } else if (begun && move.headStart !== true) {
      return true;
    }
  }
  return false;
}

/**
 * Turns each colour still has inside the horizon: `replies` is how many turns
 * of its own the other colour has left, each followed by one of the favoured
 * colour's, and the favoured colour's free turns still to come are counted too.
 */
export function turnsToCome(state: GameState, favoured: Stone, replies: number): { mine: number; theirs: number } {
  const start = headStartOf(state.settings);
  const freeAhead =
    start.stone === favoured && !headStartSpent(state, favoured)
      ? Math.max(0, start.freeTurns - headStartTurnsGiven(state.moves))
      : 0;
  if (state.toPlay === favoured) return { mine: 1 + freeAhead + replies, theirs: replies };
  // The other colour opens: its opening turn, then the favoured colour's first, its free turns, and the replies.
  if (!hasBegun(state, favoured)) return { mine: 1 + freeAhead + replies, theirs: 1 + replies };
  return { mine: replies, theirs: replies };
}

/** Stones each colour can still lay inside the horizon, the turn in progress included. */
function stonesToCome(state: GameState, favoured: Stone, turns: { mine: number; theirs: number }) {
  const other = otherStone(favoured);
  const perMine = rulesFor(state.settings, favoured).stonesPerTurn;
  const perTheirs = rulesFor(state.settings, other).stonesPerTurn;
  const current = stonesLeft(state);
  if (state.toPlay === favoured) {
    return { mine: current + (turns.mine - 1) * perMine, theirs: turns.theirs * perTheirs };
  }
  return { mine: turns.mine * perMine, theirs: current + Math.max(0, turns.theirs - 1) * perTheirs };
}

const countOf = (board: readonly Cell[], cell: Cell) => board.reduce((total, one) => (one === cell ? total + 1 : total), 0);

const segmentCache = new Map<string, number[][]>();

/** Every run of `length` points a line can take on this board, joined at the edges the game joins, plus 2×2 squares where those win. */
function segments(size: number, length: number, wrap: WrapMode, squares: boolean): number[][] {
  const key = `${size}|${length}|${wrap}|${squares}`;
  const cached = segmentCache.get(key);
  if (cached !== undefined) return cached;
  const found: number[][] = [];
  const seen = new Set<string>();
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      for (const step of LINE_STEPS) {
        const cells: number[] = [];
        for (let at = 0; at < length; at += 1) {
          let r = row + step.row * at;
          let c = col + step.col * at;
          if (wrap === WRAP_MODES.both) r = ((r % size) + size) % size;
          if (wrap !== WRAP_MODES.none) c = ((c % size) + size) % size;
          if (r < 0 || r >= size || c < 0 || c >= size) break;
          cells.push(r * size + c);
        }
        if (cells.length < length || new Set(cells).size < length) continue;
        const id = [...cells].sort((a, b) => a - b).join(",");
        if (seen.has(id)) continue;
        seen.add(id);
        found.push(cells);
      }
      if (squares && row + 1 < size && col + 1 < size) {
        found.push([row * size + col, row * size + col + 1, (row + 1) * size + col, (row + 1) * size + col + 1]);
      }
    }
  }
  segmentCache.set(key, found);
  return found;
}

type LineReading = {
  /** The favoured colour's stones still to come that can land in a line: its own, and the other side's where pieces carry both colours. */
  need: number;
  /** Whether the other colour's stones stay where they are, so a run holding one is closed for good. */
  closedByTheirs: boolean;
};

function lineReading(state: GameState, favoured: Stone, replies: number): LineReading {
  const spec = VARIANT_SPECS[state.settings.variant];
  const turns = turnsToCome(state, favoured, replies);
  const stones = stonesToCome(state, favoured, turns);
  // A piece carries two stones of each colour at most, on either side's turn; a single stone is one.
  const coming = spec.queue !== null ? 2 * (turns.mine + turns.theirs) : stones.mine;
  return {
    need: rulesFor(state.settings, favoured).winLength - coming,
    closedByTheirs: !spec.captures && !spec.lineClear && spec.pieces === null && spec.queue === null,
  };
}

/** The runs still open to the favoured colour: no dead square, none of the other colour's stones that stay, and enough of its own (hot squares counting) for what is to come. */
function openRuns(state: GameState, favoured: Stone, reading: LineReading): number[][] {
  const spec = VARIANT_SPECS[state.settings.variant];
  const { board, settings } = state;
  const other = otherStone(favoured);
  const k = rulesFor(settings, favoured).winLength;
  return segments(settings.size, k, spec.wrap, spec.squareWins).filter((cells) => {
    let own = 0;
    for (const index of cells) {
      const cell = board[index];
      if (cell === BLOCKED) return false;
      if (cell === other && reading.closedByTheirs) return false;
      if (cell === favoured || cell === HOT) own += 1;
    }
    return own >= reading.need;
  });
}

/** A line of either colour in the maker's game: a run holding both colours is closed to it. */
function makerRunOpen(state: GameState, need: number): boolean {
  const { board, settings } = state;
  return segments(settings.size, rulesFor(settings, STONES.black).winLength, VARIANT_SPECS[settings.variant].wrap, false).some((cells) => {
    const black = cells.filter((index) => board[index] === STONES.black).length;
    const white = cells.filter((index) => board[index] === STONES.white).length;
    if (cells.some((index) => board[index] === BLOCKED)) return false;
    if (black > 0 && white > 0) return false;
    return Math.max(black, white) >= need;
  });
}

/** Whether a colour to move in Go always has a point that is not suicide: an empty point with an empty neighbour. */
function breathingRoom(board: readonly Cell[], size: number): boolean {
  return board.some((cell, index) => {
    if (cell !== null) return false;
    const row = Math.floor(index / size);
    const col = index % size;
    return [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ].some(([r, c]) => r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === null);
  });
}

/**
 * Whether the favoured colour provably cannot decide the game inside what is
 * left of the horizon, whatever it plays — the search's cut-off. False means
 * only "not ruled out"; the search then looks.
 */
export function cannotDecide(state: GameState, favoured: Stone, replies: number): boolean {
  const { settings, board } = state;
  const spec = VARIANT_SPECS[settings.variant];
  const size = settings.size;
  const other = otherStone(favoured);
  const turns = turnsToCome(state, favoured, replies);

  // Go ends only on two passes running, and the other side need never pass while it has a point to play; nothing taken wins it.
  if (spec.go) return breathingRoom(board, size);
  // A race is won with every piece home, and a turn brings at most one piece in.
  if (spec.camps) return campSize(size) - piecesHome(board, size, favoured) > turns.mine;
  if (spec.chineseCheckers) return starCampSize(STAR_RADIUS) - starPiecesHome(board, size, STAR_RADIUS, favoured) > turns.mine;
  const stones = stonesToCome(state, favoured, turns);
  // A Hex chain from side to side needs a stone on every row between them.
  if (spec.connects) return countOf(board, favoured) + stones.mine < size;
  // The flipping games, draughts and the one-colour and any-colour small boards are searched outright.
  if (spec.flips || spec.checkers || spec.singleColour || (spec.anyColour && !spec.makerBreaker)) return false;

  const empties = countOf(board, null);
  if (spec.makerBreaker) {
    // The breaker wins only on a full board; the maker needs a run free of one colour.
    if (favoured === STONES.white) return empties > stones.mine + stones.theirs;
    return !makerRunOpen(state, rulesFor(settings, favoured).winLength - (stones.mine + stones.theirs));
  }
  const k = rulesFor(settings, favoured).winLength;
  // A twist moves stones but makes none: the line needs that many stones.
  if (spec.quadrantSize !== null) return countOf(board, favoured) + stones.mine < k;
  if (spec.misere) {
    // The favoured side wins only when the other makes the line, or on a full board if it opened.
    const fullBoard = state.opener === favoured && empties <= stones.mine + stones.theirs;
    return countOf(board, other) + stones.theirs < k && !fullBoard;
  }
  const byCapture = spec.capturesToWin !== null && state.captures[favoured] + countOf(board, other) + stones.theirs >= spec.capturesToWin;
  const byTrap = spec.loseLength !== null && countOf(board, other) + stones.theirs >= spec.loseLength;
  if (byCapture || byTrap) return false;
  const reading = lineReading(state, favoured, replies);
  // A wormhole bends a line out of any run a board can list: count the stones alone.
  if (spec.wormholes > 0) return countOf(board, favoured) + countOf(board, HOT) + (k - reading.need) < k;
  return openRuns(state, favoured, reading).length === 0;
}

/**
 * Whether a game's moves can be narrowed to the points of runs still open:
 * single stones placed where they are clicked, nothing taken, cleared, moved,
 * bent or turned, and no winning or losing but by the mover's own line. There a
 * stone outside every open run can neither help the favoured colour's line nor
 * block it, so leaving it unsearched loses no line of play that matters.
 */
export function narrowsToOpenRuns(spec: VariantSpec): boolean {
  return (
    spec.placement === PLACEMENTS.free &&
    !spec.captures &&
    spec.capturesToWin === null &&
    !spec.lineClear &&
    spec.wormholes === 0 &&
    spec.quadrantSize === null &&
    spec.queue === null &&
    spec.pieces === null &&
    !spec.anyColour &&
    !spec.singleColour &&
    !spec.makerBreaker &&
    !spec.misere &&
    spec.loseLength === null &&
    !spec.flips &&
    !spec.go &&
    !spec.checkers &&
    !spec.camps &&
    !spec.chineseCheckers &&
    !spec.connects
  );
}

/**
 * The candidate points lying in a run still open to the favoured colour, the
 * most urgent first: a point in a run holding more of its stones before one in
 * a run holding fewer. Order changes nothing the search concludes — only how
 * soon it finds the attack that works, or the block that refutes one.
 */
export function inOpenRuns(state: GameState, favoured: Stone, replies: number, points: readonly Point[]): Point[] {
  const { board, settings } = state;
  const runs = openRuns(state, favoured, lineReading(state, favoured, replies));
  const weight = new Map<number, number>();
  for (const cells of runs) {
    const own = cells.filter((index) => board[index] === favoured || board[index] === HOT).length;
    for (const index of cells) weight.set(index, Math.max(weight.get(index) ?? -1, own));
  }
  return points
    .filter((point) => weight.has(point.row * settings.size + point.col))
    .sort((a, b) => (weight.get(b.row * settings.size + b.col) ?? 0) - (weight.get(a.row * settings.size + a.col) ?? 0));
}
