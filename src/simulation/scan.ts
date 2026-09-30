import type { Cell, GameSettings, Handicap, Point, Stone } from "../types.ts";
import { indexOf, isStone } from "../engine.ts";
import { rulesFor } from "../rules/handicap.ts";

/**
 * A second, independent reading of the board for the simulator: a plain scan
 * in every direction that knows nothing of the engine's incremental checks.
 * Every rule it needs — wrapping, wormholes, what a run is — is restated here
 * by hand, so that a mistake in the engine cannot also be a mistake here.
 */

/**
 * Whether a run of `length` wins for `stone`, restated from each variant's
 * published rules rather than read from VARIANT_SPECS.
 *
 * Sharing the engine's own table would make the cross-check below a tautology,
 * so these are written out by hand. `blockedEnds` counts how many ends of the
 * run are shut in by something — an opposing stone or an obstacle. The edge of
 * the board is not one of those, here or in the engine: a line lying against
 * the side is not sealed by it.
 *
 * `handicap` is the game's handicap, whoever it belongs to. It is read here
 * rather than left out because a handicap can decide a win rather than refuse
 * a move — and a check that ignores it calls a line of six a win where the
 * engine has correctly refused one, then reports the ENGINE as the mistake.
 * That is not a cross-check failing; that is a cross-check lying.
 */
export function runWinsIndependently(
  variant: string,
  stone: Stone,
  length: number,
  blockedEnds: number,
  winLength: number,
  handicap?: Handicap,
): boolean {
  /*
   * The handicap first, because it can only ever refuse. Restated from what
   * the setting means rather than from `rulesFor`, which is the engine's own
   * derivation and would make this agree by construction:
   *
   *   openLine — exactly the length, and not shut in at BOTH ends. One end is
   *     allowed, which is the same reading the engine uses and is worth
   *     saying, because "open" ordinarily means neither.
   *   exactLine — exactly the length; a longer run is not a win.
   *   overline — forbidding the overline is only meaningful if a longer run
   *     cannot win, so it means exactly the length too, as it does in renju.
   *   longerLine — the length itself is one greater, which the caller has
   *     already folded into `winLength`.
   */
  if (handicap !== undefined && handicap.stone === stone) {
    if (handicap.openLine && !(length === winLength && blockedEnds < 2)) return false;
    if ((handicap.exactLine || handicap.overline) && length !== winLength) return false;
  }
  switch (variant) {
    // Exactly five; an overline is not a win for either colour.
    case "standard":
      return length === winLength;
    // Black must be exact, because an overline is forbidden to black.
    case "renju":
      return stone === "black" ? length === winLength : length >= winLength;
    /*
     * Five or more. This project's omok forbids the double three to both
     * colours but does not forbid an overline, so a six wins.
     */
    case "omok":
      return length >= winLength;
    /*
     * Exactly five, and not sealed at both ends. Only an enemy stone or an
     * obstacle seals a line here — the board edge does not, which is this
     * project's reading and is worth knowing, because plenty of caro rule
     * sets treat the edge as a block.
     */
    case "caro":
      return length === winLength && blockedEnds < 2;
    // Six or more.
    case "connect6":
      return length >= winLength;
    /*
     * The small games: a line of the variant's length or longer wins. The
     * trap game's losing three and the square game's 2×2 are checked
     * separately in checkMove; here only lines count.
     */
    case "tictactoe":
    case "trapThree":
    case "dropFour":
    case "ringDrop":
    case "holeDrop":
    case "hotDrop":
    case "clearDrop":
    case "giveawayDrop":
    case "edgeDrop":
    case "twistFive":
    case "twistFour":
    case "squareFour":
    case "dominoFive":
    case "blockFive":
    case "sannuki":
    case "wormDrop":
    case "misereFive":
    case "makerBreaker":
    case "wildTicTacToe":
    case "notakto":
      return length >= winLength;
    // Five or more in a row, as freestyle. The torus and the rock boards
    // change where a line may run, not how long it has to be.
    case "toroidalFive":
    case "obstacleFive":
    case "scatteredRocks":
    case "rockfall":
    case "ninuki":
    case "freestyle":
    default:
      return length >= winLength;
  }
}

/**
 * An independent, deliberately naive win scan.
 *
 * The engine only looks along the lines through the stone just played, which
 * is the whole reason it is fast. This walks the entire board every time.
 *
 * The four directions are written out here rather than imported from
 * gomoku.constants on purpose. Sharing that constant made the cross-check a
 * tautology: deleting a direction from it broke the engine and this scanner
 * identically, and the test stayed green. Independent means independent.
 */
const SCAN_DIRECTIONS: Point[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
];

/**
 * Hex Five's own three, by hand: the square board's fourth diagonal,
 * `{row: 1, col: 1}`, is not a lattice axis on the hexagon embedding — see
 * board.constants.ts — so a run along it is never a line here, whatever its
 * length. Restated rather than shared with the engine's own three, for the
 * same reason SCAN_DIRECTIONS is restated above it.
 */
const HEX_SCAN_DIRECTIONS: Point[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: -1 },
];

/** Which directions a line may run in, by the game's name rather than its spec — see the note on SCAN_DIRECTIONS. */
function scanDirectionsByHand(variant: string): readonly Point[] {
  return variant === "hexFive" ? HEX_SCAN_DIRECTIONS : SCAN_DIRECTIONS;
}

/**
 * Which edges a variant joins, restated by hand: the ring game is a cylinder,
 * the toroidal game a torus, everything else a plain board.
 */
export function wrapsOf(variant: string): "none" | "columns" | "both" {
  if (variant === "ringDrop") return "columns";
  if (variant === "toroidalFive") return "both";
  return "none";
}

/**
 * The wormhole game's mouths, paired by hand from the board rather than the
 * engine's link map: the first two "worm" cells in reading order are a pair,
 * which is also how the engine draws them.
 */
function wormPairs(board: Cell[]): Map<number, number> {
  const mouths: number[] = [];
  board.forEach((cell, index) => {
    if (cell === "worm") mouths.push(index);
  });
  const pairs = new Map<number, number>();
  for (let i = 0; i + 1 < mouths.length; i += 2) {
    pairs.set(mouths[i], mouths[i + 1]);
    pairs.set(mouths[i + 1], mouths[i]);
  }
  return pairs;
}

export function bruteForceWinner(board: Cell[], settings: GameSettings): Stone | null {
  const { size } = settings;
  const wrap = wrapsOf(settings.variant);
  const scanDirections = scanDirectionsByHand(settings.variant);
  const worms = settings.variant === "wormDrop" ? wormPairs(board) : new Map<number, number>();
  const fold = (n: number) => ((n % size) + size) % size;
  const at = (row: number, col: number): Cell | "edge" => {
    // Columns fold on a cylinder and a torus; rows only on a torus.
    const c = wrap === "none" ? col : fold(col);
    const r = wrap === "both" ? fold(row) : row;
    return r < 0 || r >= size || c < 0 || c >= size
      ? "edge"
      : board[indexOf(size, { row: r, col: c })];
  };
  /*
   * Where a step lands after passing through a wormhole mouth: the cell past
   * the partner mouth, in the same direction. Restated here on purpose.
   */
  const through = (row: number, col: number, step: Point): [number, number] => {
    if (worms.size === 0 || row < 0 || row >= size || col < 0 || col >= size) return [row, col];
    const partner = worms.get(indexOf(size, { row, col }));
    if (partner === undefined) return [row, col];
    return [Math.floor(partner / size) + step.row, (partner % size) + step.col];
  };
  // A hotspot is both colours at once, so it extends either colour's run.
  const matches = (cell: Cell | "edge", stone: Stone) => cell === stone || cell === "hot";

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const cell = at(row, col);
      if (cell === "edge" || (!isStone(cell) && cell !== "hot")) continue;
      // A hotspot can start a run for either colour.
      const colours: Stone[] = isStone(cell) ? [cell] : ["black", "white"];

      for (const stone of colours) for (const step of scanDirections) {
        /*
         * On a plain board, only measure from the start of a run so each run
         * is counted once. Where edges join there may be no start at all — a
         * run can circle the board — so every cell is a starting point and a
         * run is simply measured forwards. That reaches the same answer for
         * "is there a winning run", which is all this is asked, and it is the
         * honest way to say "a wrapped run has no beginning".
         */
        if (wrap === "none" && matches(at(row - step.row, col - step.col), stone)) continue;

        let length = 0;
        let [r, c] = [row, col];
        while (matches(at(r, c), stone) && length < size) {
          length += 1;
          [r, c] = through(r + step.row, c + step.col, step);
        }

        const [br, bc] = through(row - step.row, col - step.col, { row: -step.row, col: -step.col });
        const ends = [at(br, bc), at(r, c)];
        // Empty and the edge both leave a line open; a stone or obstacle seals it.
        const blockedEnds = ends.filter(
          (end) => end !== null && end !== "edge",
        ).length;

        const winLength = rulesFor(settings, stone).winLength;
        if (
          runWinsIndependently(
            settings.variant,
            stone,
            length,
            blockedEnds,
            winLength,
            settings.handicap,
          )
        ) {
          return stone;
        }
      }
    }
  }
  return null;
}

/** Every invariant that must hold after any legal move. */
/** The longest unbroken run of `stone` through `point`, in any direction. */
export function longestRunThrough(board: Cell[], size: number, point: Point, stone: Stone): number {
  const at = (row: number, col: number): Cell | "edge" =>
    row < 0 || row >= size || col < 0 || col >= size ? "edge" : board[indexOf(size, { row, col })];
  let longest = 0;
  for (const step of SCAN_DIRECTIONS) {
    let length = 1;
    for (let k = 1; at(point.row + step.row * k, point.col + step.col * k) === stone; k += 1) length += 1;
    for (let k = 1; at(point.row - step.row * k, point.col - step.col * k) === stone; k += 1) length += 1;
    longest = Math.max(longest, length);
  }
  return longest;
}

/** What must hold after a quadrant turns: same stones, moved together, read by the whole board. */

/*
 * The flipping games, restated by hand. The scan walks the eight directions
 * from the placed point over the other colour until it meets the mover's own
 * disc; anything else — the edge, a gap — and that direction turns nothing.
 * Written without the engine's helpers, so a mistake there is not a mistake
 * here.
 */
const EIGHT: readonly [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];

/** The honeycomb's six, by hand: the four orthogonal steps and the two along the lattice's slant. */
const SIX: readonly [number, number][] = [
  [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0],
];

export function flipsByHand(
  board: Cell[],
  size: number,
  stone: Stone,
  point: Point,
  directions: readonly [number, number][] = EIGHT,
): Point[] {
  const cell = (row: number, col: number): Cell | undefined =>
    row < 0 || col < 0 || row >= size || col >= size ? undefined : board[row * size + col];
  const enemy = stone === "black" ? "white" : "black";
  const turned: Point[] = [];
  for (const [dr, dc] of directions) {
    const run: Point[] = [];
    let row = point.row + dr;
    let col = point.col + dc;
    while (cell(row, col) === enemy) {
      run.push({ row, col });
      row += dr;
      col += dc;
    }
    if (run.length > 0 && cell(row, col) === stone) turned.push(...run);
  }
  return turned;
}

/** Discs of each colour, counted the plain way. */
export function countByHand(board: Cell[]): { black: number; white: number } {
  return {
    black: board.filter((cell) => cell === "black").length,
    white: board.filter((cell) => cell === "white").length,
  };
}

/** Whether `stone` has any legal flip anywhere on the board, by the hand scan. */
export function canFlipAnywhereByHand(
  board: Cell[],
  size: number,
  stone: Stone,
  directions: readonly [number, number][] = EIGHT,
): boolean {
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null) continue;
    const point = { row: Math.floor(index / size), col: index % size };
    if (flipsByHand(board, size, stone, point, directions).length > 0) return true;
  }
  return false;
}

/** Which directions a flipping game's runs lie along, by the game's name rather than its spec. */
export function flipDirectionsByHand(variant: string): readonly [number, number][] {
  return variant === "honeycomb" ? SIX : EIGHT;
}
