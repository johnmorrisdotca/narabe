import { createGame, indexOf, otherStone } from "./engine.ts";
import { BLOCKED, STONES } from "./constants.ts";
import type {
  Cell,
  GameSettings,
  GameState,
  Move,
  Point,
  Stone,
} from "./types.ts";

/** Diagram characters, chosen to stay legible in a fixed-width editor. */
const GLYPHS: Record<string, Cell> = {
  ".": null,
  "-": null,
  x: STONES.black,
  X: STONES.black,
  o: STONES.white,
  O: STONES.white,
  "#": BLOCKED,
};

export type DiagramOptions = {
  /** Colour to move. Defaults to whoever has fewer stones, else black. */
  toPlay?: Stone;
  settings?: Partial<GameSettings>;
};

/**
 * Builds a position from an ASCII diagram, which keeps threat tests readable:
 *
 * ```
 * . . . . . . .
 * . . x x x . .
 * . . . . . . .
 * ```
 *
 * `x` is black, `o` is white, `#` an obstacle, `.` empty. Whitespace between
 * cells is ignored; the board is square, sized from the number of rows.
 */
export function fromDiagram(
  diagram: string,
  options: DiagramOptions = {},
): GameState {
  const rows = diagram
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => [...line.replace(/\s+/g, "")]);

  const size = rows.length;
  const wrong = rows.findIndex((row) => row.length !== size);
  if (wrong !== -1) {
    throw new Error(
      `Diagram row ${wrong} has ${rows[wrong].length} cells, expected ${size}`,
    );
  }

  const base = createGame({ ...options.settings, size });
  const board: Cell[] = rows.flatMap((row) =>
    row.map((glyph) => {
      if (!(glyph in GLYPHS)) {
        throw new Error(`Unknown diagram character "${glyph}"`);
      }
      return GLYPHS[glyph];
    }),
  );

  const stones = collectStones(board, size);
  const toPlay = options.toPlay ?? inferToPlay(stones);

  return {
    ...base,
    board,
    moves: interleave(stones, otherStone(toPlay)),
    opener:
      stones.black.length + stones.white.length > 0
        ? otherStone(toPlay)
        : toPlay,
    toPlay,
  };
}

function collectStones(board: Cell[], size: number): Record<Stone, Point[]> {
  const stones: Record<Stone, Point[]> = { black: [], white: [] };
  board.forEach((cell, index) => {
    if (cell === STONES.black || cell === STONES.white) {
      stones[cell].push({ row: Math.floor(index / size), col: index % size });
    }
  });
  return stones;
}

/** The side with fewer stones is to move; black opens an equal position. */
function inferToPlay(stones: Record<Stone, Point[]>): Stone {
  return stones.white.length < stones.black.length
    ? STONES.white
    : STONES.black;
}

/**
 * A plausible move order for the diagram. Analysis only reads `moves.length`,
 * but keeping the list consistent stops `suggestMove` treating a mid-game
 * diagram as an empty opening board.
 */
function interleave(
  stones: Record<Stone, Point[]>,
  opener: Stone,
): Move[] {
  const order: Move[] = [];
  const second = otherStone(opener);
  const queues = { [opener]: [...stones[opener]], [second]: [...stones[second]] };

  let turn: Stone = opener;
  while (queues[opener].length > 0 || queues[second].length > 0) {
    const next = queues[turn].shift();
    if (next !== undefined) {
      order.push({ ...next, stone: turn, kind: "place" });
    }
    turn = otherStone(turn);
  }
  return order;
}

/** Reads a cell straight out of a diagram-built state, for assertions. */
export function at(state: GameState, point: Point): Cell {
  return state.board[indexOf(state.settings.size, point)];
}

/** Compact `row,col` rendering, so failed expectations are readable. */
export function show(points: Point[]): string[] {
  return points.map((point) => `${point.row},${point.col}`).sort();
}
