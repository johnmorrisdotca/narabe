import {
  BLOCKED,
  HOT,
  WORM,
  OBSTACLE_LAYOUTS,
  STAR_POINTS,
  VARIANT_SPECS,
} from "./constants.ts";
import type { Cell, GameSettings, Point } from "./types.ts";
import { drawDistinct, seededRandom } from "./rules/random.ts";
import { inStar, STAR_RADIUS } from "./rules/chineseCheckers.ts";
import { hexagonSealed, inHexagon } from "./rules/hexagon.ts";
import { landRocks, rockLayoutFor } from "./rules/rocks.ts";

/** The centre intersection — tengen (天元) — which never carries an obstacle. */
export function tengen(size: number): Point {
  const middle = Math.floor(size / 2);
  return { row: middle, col: middle };
}

/**
 * The intersections sealed off by the settings' obstacle layout. `hoshi` takes
 * the star points out of play but leaves tengen open, so the centre of the
 * board is still contestable.
 */
export function obstaclePoints(settings: GameSettings): Point[] {
  if (settings.obstacles !== OBSTACLE_LAYOUTS.hoshi) return [];

  const centre = tengen(settings.size);
  return (STAR_POINTS[settings.size] ?? []).filter(
    (point) => point.row !== centre.row || point.col !== centre.col,
  );
}

/**
 * The squares a variant scatters at random when the game starts, drawn from
 * the game's seed so a replay lands them in the same places. Dead squares
 * come first, then hotspots, all distinct, and never on the bottom row of a
 * drop game, where they would only ever be a wall.
 *
 * None for a rock game: its squares are laid by `rules/rocks.ts`, across the
 * whole board, and may not be there at the start at all.
 */
export function randomSquares(settings: GameSettings): { dead: Point[]; hot: Point[]; worm: Point[] } {
  const spec = VARIANT_SPECS[settings.variant];
  if (spec.rocks !== null) return { dead: [], hot: [], worm: [] };
  const total = spec.deadSquares + spec.hotSquares + spec.wormholes;
  if (total === 0) return { dead: [], hot: [], worm: [] };

  const { size } = settings;
  const candidates = size * (size - 1);
  const random = seededRandom(settings.seed);
  const points = drawDistinct(random, total, candidates).map((index) => ({
    row: Math.floor(index / size),
    col: index % size,
  }));
  const hotFrom = spec.deadSquares;
  const wormFrom = hotFrom + spec.hotSquares;
  return {
    dead: points.slice(0, hotFrom),
    hot: points.slice(hotFrom, wormFrom),
    worm: points.slice(wormFrom),
  };
}

/**
 * The wormholes as a map from each mouth to its partner, by board index. A
 * line walking into one mouth continues from the cell past the other.
 */
export function wormholeLinks(settings: GameSettings): Map<number, number> {
  const links = new Map<number, number>();
  const { worm } = randomSquares(settings);
  for (let i = 0; i + 1 < worm.length; i += 2) {
    const a = worm[i].row * settings.size + worm[i].col;
    const b = worm[i + 1].row * settings.size + worm[i + 1].col;
    links.set(a, b);
    links.set(b, a);
  }
  return links;
}

/** A board with the layout's obstacles already in place and nothing else on it. */
export function emptyBoard(settings: GameSettings): Cell[] {
  const board = new Array<Cell>(settings.size * settings.size).fill(null);
  for (const point of obstaclePoints(settings)) {
    board[point.row * settings.size + point.col] = BLOCKED;
  }
  const { dead, hot, worm } = randomSquares(settings);
  for (const point of dead) board[point.row * settings.size + point.col] = BLOCKED;
  for (const point of hot) board[point.row * settings.size + point.col] = HOT;
  for (const point of worm) board[point.row * settings.size + point.col] = WORM;
  // A rock game whose rocks are there from the start; the ones that fall later land in the engine (`rules/rockfall.ts`).
  const rocks = VARIANT_SPECS[settings.variant].rocks;
  const layout = rocks !== null && rocks.arriveAfter === null ? rockLayoutFor(settings) : null;
  const laid = layout === null ? board : landRocks(board, settings.size, layout);
  // The hexagram: everything outside the star is sealed off, once, by shape — not drawn from the seed.
  if (VARIANT_SPECS[settings.variant].chineseCheckers) {
    for (let row = 0; row < settings.size; row += 1) {
      for (let col = 0; col < settings.size; col += 1) {
        if (!inStar(STAR_RADIUS, { row, col })) laid[row * settings.size + col] = BLOCKED;
      }
    }
  }
  /*
   * The hexagon: everything outside it is sealed, on both hexagon games —
   * see rules/hexagon.ts. The CENTRE is sealed too, but only for the
   * flipping game: Honeycomb counts discs and wants an even number of
   * playable cells, and the sealed centre is what gives it one. Hex Five
   * counts nothing and plays no differently for it, so its centre stays
   * open — the first stone of a game may go there.
   */
  if (VARIANT_SPECS[settings.variant].hexagon) {
    const sealsCentre = VARIANT_SPECS[settings.variant].flips;
    for (let row = 0; row < settings.size; row += 1) {
      for (let col = 0; col < settings.size; col += 1) {
        const point = { row, col };
        if (!inHexagon(settings.size, point) || (sealsCentre && hexagonSealed(settings.size, point))) {
          laid[row * settings.size + col] = BLOCKED;
        }
      }
    }
  }
  return laid;
}
