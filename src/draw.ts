import { BLOCKED, GAME_STATUS, HOT, STAR_POINTS, STONES, VARIANT_SPECS, WORM } from "./constants.ts";
import { STAR_RADIUS, campOf, forbiddenPoints, indexOf, isDarkSquare, pieceMoves, starCampOf } from "./engine.ts";
import { turnChoices } from "./rules/choices.ts";
import { lastMove } from "./rules/record.ts";
import type { GameState, Point } from "./types.ts";

/**
 * A POSITION DRAWN AS SVG, as a string: the board in the way its game is
 * traditionally drawn (stones on the crossings of lines, or inside squares, or
 * on the hexagon lattice), the stones, the last move, the winning line and, if
 * asked, the moves the player to move may make. It draws a state it is given
 * and decides nothing: what is legal, and who has won, is the engine's.
 *
 * Every colour is a CSS variable with a default, so a page restyles it from
 * outside: `--nb-wood`, `--nb-wood-deep`, `--nb-line`, `--nb-cell-light`,
 * `--nb-cell-dark`, `--nb-black`, `--nb-white`, `--nb-accent`, `--nb-good`,
 * `--nb-hot` and `--nb-worm`. The string is one `<svg>` element and nothing
 * else, so it can be a file, an `innerHTML` or a server-rendered component.
 */

/** What to draw besides the board and the stones. Every field is optional. */
export type DrawBoardOptions = {
  /** The width in pixels. Unless said, the SVG has a `viewBox` and no size, and fills what holds it. */
  width?: number;
  /** What a screen reader says for the picture. Unless said, "Board". An empty string makes it decoration. */
  title?: string;
  /** Mark the last move with a dot. Unless said, on. */
  lastMove?: boolean;
  /** Ring the stones of a winning line. Unless said, on. */
  winningLine?: boolean;
  /** Cross the points a forbidden-move rule (renju, omok) refuses. Unless said, off. */
  forbidden?: boolean;
  /** Dot every point the player to move may play, or the squares the piece on `from` may go to. Unless said, off. */
  legal?: boolean;
  /** A piece picked up: its moves are dotted when `legal` is on, and it is ringed. */
  selected?: Point;
};

const SQRT3_2 = Math.sqrt(3) / 2;

const PALETTE = {
  wood: "#d9b36c",
  woodDeep: "#a9824a",
  line: "#3a2a1a",
  cellLight: "#ecd9a8",
  cellDark: "#a9824a",
  black: "#1c1c1c",
  white: "#f6f3ea",
  accent: "#b3361f",
  good: "#2f7d4f",
  hot: "#d9772b",
  worm: "#6b4fa0",
} as const;

const colour = (name: keyof typeof PALETTE): string => `var(--nb-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}, ${PALETTE[name]})`;
const round = (value: number): string => String(Math.round(value * 1000) / 1000);
const same = (a: Point | null | undefined, b: Point): boolean => a !== null && a !== undefined && a.row === b.row && a.col === b.col;
const escaped = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One SVG element as text: `shape("circle", { cx: 1, fill: "x" })`. A `fill` or `stroke` is given as a CSS value in the `style`, where a variable is allowed. */
function shape(name: string, attributes: Record<string, string | number>): string {
  const style: string[] = [];
  const plain: string[] = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (key === "fill" || key === "stroke") style.push(`${key}:${value}`);
    else plain.push(`${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${typeof value === "number" ? round(value) : value}"`);
  }
  return `<${name} ${plain.join(" ")}${style.length > 0 ? ` style="${style.join(";")}"` : ""}/>`;
}

function hexagon(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, k) => {
    const angle = (Math.PI / 3) * k + Math.PI / 6;
    return `${round(cx + r * Math.cos(angle))},${round(cy + r * Math.sin(angle))}`;
  }).join(" ");
}

/** The position as one `<svg>` element, drawn the way its game is traditionally drawn. */
export function boardSvg(state: GameState, options: DrawBoardOptions = {}): string {
  const { size, variant } = state.settings;
  const spec = VARIANT_SPECS[variant];
  const lattice = spec.connects || spec.hexagon || spec.chineseCheckers;
  const at = lattice ? (p: Point) => ({ x: p.col + p.row / 2, y: p.row * SQRT3_2 }) : (p: Point) => ({ x: p.col, y: p.row });

  // On a lattice board the squares outside the shape are sealed off and are no part of the picture.
  const shown: Point[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (lattice && !spec.connects && state.board[indexOf(size, { row, col })] === BLOCKED) continue;
      shown.push({ row, col });
    }
  }
  const xs = shown.map((p) => at(p).x);
  const ys = shown.map((p) => at(p).y);
  const box = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  const pad = 0.9;
  const view = `${round(box.left - pad)} ${round(box.top - pad)} ${round(box.right - box.left + pad * 2)} ${round(box.bottom - box.top + pad * 2)}`;
  const parts: string[] = [];
  parts.push(shape("rect", { x: box.left - pad, y: box.top - pad, width: box.right - box.left + pad * 2, height: box.bottom - box.top + pad * 2, rx: 0.3, fill: colour("wood"), stroke: colour("woodDeep"), strokeWidth: 0.08 }));

  if (lattice) {
    for (const p of shown) {
      const { x, y } = at(p);
      if (spec.chineseCheckers) parts.push(shape("circle", { cx: x, cy: y, r: 0.2, fill: colour("line"), opacity: 0.35 }));
      else parts.push(shape("polygon", { points: hexagon(x, y, 0.575), fill: colour("cellLight"), stroke: colour("line"), strokeWidth: 0.04 }));
    }
    if (spec.connects) {
      // Black joins top to bottom, White left to right: the sides are drawn in their colours.
      const edge = (from: Point, to: Point, paint: string) => parts.push(shape("line", { x1: at(from).x, y1: at(from).y, x2: at(to).x, y2: at(to).y, stroke: paint, strokeWidth: 0.16, strokeLinecap: "round" }));
      const n = size - 1;
      edge({ row: -0.65, col: 0 }, { row: -0.65, col: n }, colour("black"));
      edge({ row: n + 0.65, col: 0 }, { row: n + 0.65, col: n }, colour("black"));
      edge({ row: 0, col: -0.7 }, { row: n, col: -0.7 }, colour("white"));
      edge({ row: 0, col: n + 0.7 }, { row: n, col: n + 0.7 }, colour("white"));
    }
  } else if (spec.grid === "cells") {
    for (const p of shown) {
      const dark = spec.checkers ? isDarkSquare(p) : (p.row + p.col) % 2 === 1;
      parts.push(shape("rect", { x: p.col - 0.5, y: p.row - 0.5, width: 1, height: 1, fill: dark && (spec.checkers || spec.camps) ? colour("cellDark") : colour("cellLight"), stroke: colour("line"), strokeWidth: 0.03 }));
    }
    if (spec.quadrantSize !== null) {
      for (let k = spec.quadrantSize; k < size; k += spec.quadrantSize) {
        parts.push(shape("line", { x1: k - 0.5, y1: -0.5, x2: k - 0.5, y2: size - 0.5, stroke: colour("line"), strokeWidth: 0.1 }));
        parts.push(shape("line", { x1: -0.5, y1: k - 0.5, x2: size - 0.5, y2: k - 0.5, stroke: colour("line"), strokeWidth: 0.1 }));
      }
    }
  } else {
    for (let k = 0; k < size; k += 1) {
      parts.push(shape("line", { x1: 0, y1: k, x2: size - 1, y2: k, stroke: colour("line"), strokeWidth: 0.035 }));
      parts.push(shape("line", { x1: k, y1: 0, x2: k, y2: size - 1, stroke: colour("line"), strokeWidth: 0.035 }));
    }
    for (const p of STAR_POINTS[size] ?? []) parts.push(shape("circle", { cx: p.col, cy: p.row, r: 0.09, fill: colour("line") }));
  }

  // The camps of the race games, faintly, so a reader can see where the pieces are going.
  if (spec.camps || spec.chineseCheckers) {
    for (const p of shown) {
      const camp = spec.camps ? campOf(size, p) : starCampOf(STAR_RADIUS, p);
      if (camp === null) continue;
      const { x, y } = at(p);
      parts.push(shape("circle", { cx: x, cy: y, r: 0.46, fill: camp === STONES.black ? colour("black") : colour("white"), opacity: 0.12 }));
    }
  }

  const playing = state.status === GAME_STATUS.playing;
  const last = options.lastMove === false ? null : lastMove(state);
  const winning = options.winningLine === false ? [] : state.winningLine;
  const forbidden = options.forbidden === true && playing ? forbiddenPoints(state) : [];
  const choices = options.legal === true && playing ? turnChoices(state) : null;
  const targets: Point[] = options.legal === true && options.selected !== undefined ? pieceMoves(state, options.selected) : choices?.kind === "place" ? choices.points : [];
  for (const p of shown) {
    const { x, y } = at(p);
    const cell = state.board[indexOf(size, p)];
    if (cell === BLOCKED) {
      if (lattice) parts.push(shape("polygon", { points: hexagon(x, y, 0.575), fill: colour("line"), opacity: 0.85 }));
      else parts.push(shape("rect", { x: x - 0.45, y: y - 0.45, width: 0.9, height: 0.9, rx: 0.12, fill: colour("line"), opacity: 0.85 }));
    } else if (cell === HOT) {
      parts.push(shape("circle", { cx: x, cy: y, r: 0.36, fill: "none", stroke: colour("hot"), strokeWidth: 0.12 }), shape("circle", { cx: x, cy: y, r: 0.12, fill: colour("hot") }));
    } else if (cell === WORM) {
      parts.push(shape("circle", { cx: x, cy: y, r: 0.36, fill: "none", stroke: colour("worm"), strokeWidth: 0.1, strokeDasharray: "0.2 0.1" }));
    } else if (cell === STONES.black || cell === STONES.white) {
      parts.push(shape("circle", { cx: x, cy: y, r: 0.43, fill: cell === STONES.black ? colour("black") : colour("white"), stroke: "rgb(0 0 0 / 0.45)", strokeWidth: 0.03 }));
      if (state.kings.some((king) => same(king, p))) parts.push(shape("circle", { cx: x, cy: y, r: 0.22, fill: "none", stroke: "#d4a017", strokeWidth: 0.09 }));
    }
    if (last !== null && same(last, p)) parts.push(shape("circle", { cx: x, cy: y, r: 0.1, fill: colour("accent") }));
    if (winning.some((w) => same(w, p))) parts.push(shape("circle", { cx: x, cy: y, r: 0.47, fill: "none", stroke: colour("accent"), strokeWidth: 0.08 }));
    if (forbidden.some((f) => same(f, p))) parts.push(`<path d="M${round(x - 0.18)} ${round(y - 0.18)}L${round(x + 0.18)} ${round(y + 0.18)}M${round(x + 0.18)} ${round(y - 0.18)}L${round(x - 0.18)} ${round(y + 0.18)}" style="fill:none;stroke:${colour("accent")}" stroke-width="0.07"/>`);
    if (options.selected !== undefined && same(options.selected, p)) parts.push(shape("circle", { cx: x, cy: y, r: 0.48, fill: "none", stroke: colour("good"), strokeWidth: 0.09 }));
    if (targets.some((target) => same(target, p))) parts.push(shape("circle", { cx: x, cy: y, r: 0.12, fill: colour("good"), opacity: 0.75 }));
  }

  const title = options.title ?? "Board";
  const label = title === "" ? ` aria-hidden="true"` : ` role="img" aria-label="${escaped(title)}"`;
  const sized = options.width === undefined ? "" : ` width="${round(options.width)}" height="${round((options.width * (box.bottom - box.top + pad * 2)) / (box.right - box.left + pad * 2))}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}"${sized}${label}>${parts.join("")}</svg>`;
}
