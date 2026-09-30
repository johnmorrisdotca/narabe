import type { Cell, GameState, Point, Stone } from "../types.ts";

/**
 * The checkers family, restated by hand for the simulator: every game's rules
 * written out here as plain facts, and every question the checker asks worked
 * out from them afresh — never read from VARIANT_SPECS or rules/checkers.ts,
 * so a wrong row there cannot agree with itself.
 *
 * The representation is deliberately not the engine's either. The engine lifts
 * each captured piece at once and remembers the squares; here a sequence is
 * searched with the taken pieces left standing on the board, as the rulebooks
 * describe it, and the longest capture is found by trying every route with no
 * memo at all.
 */

export type HandRules = {
  size: number;
  rows: number;
  backward: boolean;
  flying: boolean;
  most: boolean;
  crown: "stops" | "continues" | "passes";
  /** Plies of kings moving with nothing taken before a draw. */
  idlePlies: number;
  repetition: number | null;
  /**
   * Named endings, each side written K for a king and M for a man, kings
   * first, with `restarts` when a capture or crowning inside them starts the
   * count again; or a balance — any ending of so many pieces with a king on
   * each side, counted while nothing is taken or crowned.
   */
  endings: (
    | { kind: "endings"; pairs: [string, string][]; restarts: boolean; movesEach: number }
    | { kind: "balance"; pieces: number[]; movesEach: number }
  )[];
};

/** FMJD article 6.3 and 6.4. */
const FMJD_ENDINGS: HandRules["endings"] = [
  { kind: "endings", pairs: [["KKK", "K"], ["KKM", "K"], ["KMM", "K"]], restarts: false, movesEach: 16 },
  { kind: "endings", pairs: [["KK", "K"], ["KM", "K"], ["K", "K"]], restarts: false, movesEach: 5 },
];

export const HAND_RULES: Record<string, HandRules> = {
  checkers: { size: 8, rows: 3, backward: false, flying: false, most: false, crown: "stops", idlePlies: 80, repetition: null, endings: [] },
  internationalDraughts: { size: 10, rows: 4, backward: true, flying: true, most: true, crown: "passes", idlePlies: 50, repetition: 3, endings: FMJD_ENDINGS },
  brazilianDraughts: {
    size: 8,
    rows: 3,
    backward: true,
    flying: true,
    most: true,
    crown: "passes",
    idlePlies: 40,
    repetition: 3,
    // CBJD art. 99.
    endings: [{ kind: "endings", pairs: [["KK", "KK"], ["KK", "K"], ["KK", "KM"], ["K", "K"], ["K", "KM"]], restarts: false, movesEach: 5 }],
  },
  canadianCheckers: { size: 12, rows: 5, backward: true, flying: true, most: true, crown: "passes", idlePlies: 50, repetition: 3, endings: FMJD_ENDINGS },
  russianDraughts: {
    size: 8,
    rows: 3,
    backward: true,
    flying: true,
    most: false,
    crown: "continues",
    idlePlies: 30,
    repetition: 3,
    // The Russian federation's counts: three to twelve kings against one, and the balance of two–three, four–five, six–seven pieces.
    endings: [
      { kind: "endings", pairs: Array.from({ length: 10 }, (_, n): [string, string] => ["K".repeat(n + 3), "K"]), restarts: true, movesEach: 15 },
      { kind: "balance", pieces: [2, 3], movesEach: 5 },
      { kind: "balance", pieces: [4, 5], movesEach: 30 },
      { kind: "balance", pieces: [6, 7], movesEach: 60 },
    ],
  },
  // The APCA's thirteen count; its forty-move backstop is the site's own.
  poolCheckers: {
    size: 8,
    rows: 3,
    backward: true,
    flying: true,
    most: false,
    crown: "passes",
    idlePlies: 80,
    repetition: null,
    endings: [{ kind: "endings", pairs: [["KKK", "K"]], restarts: false, movesEach: 13 }],
  },
};

const EVERY_WAY: readonly Point[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
];

export function farRowByHand(size: number, stone: Stone): number {
  return stone === "black" ? size - 1 : 0;
}

export function isKingByHand(kings: readonly Point[], at: Point): boolean {
  return kings.some((point) => point.row === at.row && point.col === at.col);
}

function forwardWays(stone: Stone): Point[] {
  return EVERY_WAY.filter((way) => (stone === "black" ? way.row === 1 : way.row === -1));
}

function inside(size: number, row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < size && col < size;
}

/** Empty for a capture: nothing on it, or the capturing piece's own square — and not a piece already taken. */
function clear(board: readonly Cell[], size: number, row: number, col: number, taken: readonly number[], origin: number): boolean {
  const index = row * size + col;
  return !taken.includes(index) && (index === origin || board[index] === null);
}

/** Every single jump from `from`, with the taken pieces still standing on `board`. */
export function hopsByHand(
  board: readonly Cell[],
  size: number,
  from: Point,
  stone: Stone,
  king: boolean,
  hand: HandRules,
  taken: readonly number[],
  origin: number,
): { to: Point; over: Point }[] {
  const enemy: Stone = stone === "black" ? "white" : "black";
  const flies = king && hand.flying;
  const hops: { to: Point; over: Point }[] = [];
  for (const way of king || hand.backward ? EVERY_WAY : forwardWays(stone)) {
    let row = from.row + way.row;
    let col = from.col + way.col;
    while (flies && inside(size, row, col) && clear(board, size, row, col, taken, origin)) {
      row += way.row;
      col += way.col;
    }
    if (!inside(size, row, col) || taken.includes(row * size + col) || board[row * size + col] !== enemy) continue;
    const over = { row, col };
    row += way.row;
    col += way.col;
    while (inside(size, row, col) && clear(board, size, row, col, taken, origin)) {
      hops.push({ to: { row, col }, over });
      if (!flies) break;
      row += way.row;
      col += way.col;
    }
  }
  return hops;
}

/** The most pieces a capture can go on to take from `at`, by trying every route there is. */
export function bestByHand(
  board: readonly Cell[],
  size: number,
  at: Point,
  stone: Stone,
  king: boolean,
  hand: HandRules,
  taken: readonly number[],
  origin: number,
): number {
  let best = 0;
  for (const hop of hopsByHand(board, size, at, stone, king, hand, taken, origin)) {
    const crowns = !king && hop.to.row === farRowByHand(size, stone);
    if (crowns && hand.crown === "stops") {
      best = Math.max(best, 1);
      continue;
    }
    const kingOn = king || (crowns && hand.crown === "continues");
    const further = [...taken, hop.over.row * size + hop.over.col];
    best = Math.max(best, 1 + bestByHand(board, size, hop.to, stone, kingOn, hand, further, origin));
  }
  return best;
}

/** The longest capture any of `stone`'s pieces has, or 0 when none can take. */
export function bestAnywhereByHand(board: readonly Cell[], kings: readonly Point[], size: number, stone: Stone, hand: HandRules): number {
  let best = 0;
  board.forEach((cell, index) => {
    if (cell !== stone) return;
    const at = { row: Math.floor(index / size), col: index % size };
    best = Math.max(best, bestByHand(board, size, at, stone, isKingByHand(kings, at), hand, [], index));
  });
  return best;
}

/** Whether `stone` has anything at all to play: a capture, or a step. */
export function anyMoveByHand(board: readonly Cell[], kings: readonly Point[], size: number, stone: Stone, hand: HandRules): boolean {
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== stone) continue;
    const at = { row: Math.floor(index / size), col: index % size };
    const king = isKingByHand(kings, at);
    if (hopsByHand(board, size, at, stone, king, hand, [], index).length > 0) return true;
    for (const way of king ? EVERY_WAY : forwardWays(stone)) {
      const row = at.row + way.row;
      const col = at.col + way.col;
      if (inside(size, row, col) && board[row * size + col] === null) return true;
    }
  }
  return false;
}

function pieceKey(board: readonly Cell[], kings: ReadonlySet<number>, toPlay: Stone): string {
  let key = toPlay;
  board.forEach((cell, index) => {
    key += cell === null ? "." : kings.has(index) ? cell.toUpperCase().slice(0, 1) : cell.slice(0, 1);
  });
  return key;
}

function talliesByHand(board: readonly Cell[], kings: ReadonlySet<number>): Record<Stone, string> {
  const count = { black: { kings: 0, men: 0 }, white: { kings: 0, men: 0 } };
  board.forEach((cell, index) => {
    if (cell !== "black" && cell !== "white") return;
    if (kings.has(index)) count[cell].kings += 1;
    else count[cell].men += 1;
  });
  const word = (side: { kings: number; men: number }) => "K".repeat(side.kings) + "M".repeat(side.men);
  return { black: word(count.black), white: word(count.white) };
}

/**
 * Which of its own draws a position has reached, worked out by walking the
 * record back over a copy of the whole board, or null for none.
 */
export function drawReasonByHand(state: GameState, hand: HandRules): string | null {
  const { size } = state.settings;
  const { moves } = state;
  const index = (point: Point) => point.row * size + point.col;

  // The length the players agreed to, where the board is big enough for one: a share of its points.
  const share = { none: null, half: 1 / 2, threeQuarters: 3 / 4 }[state.settings.drawLimit] ?? null;
  if (share !== null && size * size >= 81 && moves.length >= Math.floor(size * size * share)) {
    return `the agreed length of ${Math.floor(size * size * share)} moves`;
  }

  let idle = 0;
  for (let at = moves.length - 1; at >= 0; at -= 1) {
    if ((moves[at].captured?.length ?? 0) > 0 || moves[at].wasKing !== true) break;
    idle += 1;
  }
  if (idle >= hand.idlePlies) return `${idle} plies of kings alone`;

  if (hand.repetition !== null) {
    const board = state.board.slice();
    const kings = new Set(state.kings.map(index));
    const now = pieceKey(board, kings, state.toPlay);
    let seen = 1;
    for (let at = moves.length - 1; at >= 0; at -= 1) {
      const move = moves[at];
      if (move.from === undefined || (move.captured?.length ?? 0) > 0 || move.wasKing !== true) break;
      board[index(move.from)] = board[index(move)];
      board[index(move)] = null;
      kings.delete(index(move));
      kings.add(index(move.from));
      if (pieceKey(board, kings, move.stone) === now) seen += 1;
    }
    if (seen >= hand.repetition) return `the position stood ${seen} times`;
  }

  for (const ending of hand.endings) {
    const board = state.board.slice();
    const kings = new Set(state.kings.map(index));
    const inIt = () => {
      const tally = talliesByHand(board, kings);
      if (ending.kind === "balance") {
        return ending.pieces.includes(tally.black.length + tally.white.length) && tally.black.includes("K") && tally.white.includes("K");
      }
      return ending.pairs.some(([one, other]) => (tally.black === one && tally.white === other) || (tally.white === one && tally.black === other));
    };
    if (!inIt()) continue;
    const started = talliesByHand(board, kings);
    const restarts = ending.kind === "balance" || ending.restarts;
    const unchanged = () => {
      const tally = talliesByHand(board, kings);
      return tally.black === started.black && tally.white === started.white;
    };
    let turns = 0;
    for (let at = moves.length - 1; at >= 0; at -= 1) {
      const move = moves[at];
      if (move.from === undefined) continue;
      board[index(move.from)] = board[index(move)];
      board[index(move)] = null;
      kings.delete(index(move));
      if (move.wasKing === true) kings.add(index(move.from));
      for (const point of move.captured ?? []) {
        board[index(point)] = move.stone === "black" ? "white" : "black";
        if (move.capturedWasKing === true) kings.add(index(point));
      }
      if (restarts ? !unchanged() : !inIt()) break;
      if (move.continuedChain !== true) turns += 1;
    }
    if (turns >= ending.movesEach * 2) return `an ending ran ${turns} turns`;
  }
  return null;
}
