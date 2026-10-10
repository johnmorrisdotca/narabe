import { createGame } from "./engine.ts";
import { replayMoves } from "./rules/record.ts";
import { boardSvg, type DrawBoardOptions } from "./draw.ts";
import { RULE_VARIANT_LIST, ALL_BOARD_SIZES, SEED_RANGE } from "./constants.ts";
import type { GameSettings, GameState, MoveInput, OpeningChoice } from "./types.ts";
const ElementBase = typeof HTMLElement === "undefined" ? class {} as typeof HTMLElement : HTMLElement;
const isOn = (value: string | null, fallback = true): boolean => value === null ? fallback : !["off", "false", "no", "0"].includes(value.trim().toLowerCase());
/**
 * Reads a bounded JSON move list for a board embed, or null for malformed input.
 * @param value - JSON moves, or null for an empty record.
 * @returns Valid move data, or null when the syntax, bounds or shape are invalid. Legality belongs to replayMoves.
 * @example
 * ```ts
 * import { parseEmbedMoves } from "@johnmorrisdotca/narabe/element";
 * console.log(parseEmbedMoves('[{"row":7,"col":7}]'));
 * ```
 */
export function parseEmbedMoves(value: string | null): MoveInput[] | null {
  if (value === null || value.trim() === "") return [];
  if (value.length > 30000) return null;
  const point = (value: unknown): value is { row: number; col: number } => { if (value === null || typeof value !== "object") return false; const p = value as { row: number; col: number }; return Number.isInteger(p.row) && Number.isInteger(p.col) && p.row >= -1 && p.col >= -1 && p.row < 19 && p.col < 19; };
  try {
    const data: unknown = JSON.parse(value); if (!Array.isArray(data) || data.length > 1000) return null;
    const result: MoveInput[] = [];
    for (const raw of data) {
      if (!point(raw)) return null; const move = raw as MoveInput;
      if (move.kind !== undefined && !["place", "skip", "move", "piece", "pass", "forfeit"].includes(move.kind)) return null;
      if (move.stone !== undefined && move.stone !== "black" && move.stone !== "white") return null;
      if (move.from !== undefined && !point(move.from)) return null;
      if (move.cells !== undefined && (!Array.isArray(move.cells) || move.cells.length > 16 || !move.cells.every(cell => point(cell) && (cell.stone === "black" || cell.stone === "white")))) return null;
      if (move.twist !== undefined && (typeof move.twist !== "object" || move.twist === null || !Number.isInteger(move.twist.quadrant) || move.twist.quadrant < 0 || move.twist.quadrant > 3 || typeof move.twist.clockwise !== "boolean")) return null;
      result.push({ row: move.row, col: move.col, ...(move.kind === undefined ? {} : { kind: move.kind }), ...(move.stone === undefined ? {} : { stone: move.stone }), ...(move.from === undefined ? {} : { from: { row: move.from.row, col: move.from.col } }), ...(move.cells === undefined ? {} : { cells: move.cells.map(p => ({ row: p.row, col: p.col, stone: p.stone })) }), ...(move.twist === undefined ? {} : { twist: { quadrant: move.twist.quadrant, clockwise: move.twist.clockwise } }) });
    }
    return result;
  } catch { return null; }
}
/**
 * Host state, rules, replay choices, drawing options and callbacks.
 * @example
 * ```ts
 * import type { NarabeElementOptions } from "@johnmorrisdotca/narabe/element";
 * const options: NarabeElementOptions = { settings: { variant: "freestyle" }, draw: { legal: true } };
 * console.log(options.settings?.variant);
 * ```
 */
export type NarabeElementOptions = {
  /** Complete host position, taking precedence over replay input. */
  state?: GameState;
  /** Advanced native engine settings; attributes override these. */
  settings?: Partial<GameSettings>;
  /** Trusted host moves, used when the moves attribute is absent. */
  moves?: readonly MoveInput[];
  /** Native colour-opening decisions. */
  choices?: readonly OpeningChoice[];
  /** Whether recorded clock forfeits may replay. */
  clocked?: boolean;
  /** Native SVG drawing options. */
  draw?: DrawBoardOptions;
  /** Called after a position changes, with the structured state. */
  onChange?: (state: GameState) => void;
};
/**
 * Real host option keys, checked by the embed builder.
 * @example
 * ```ts
 * import { NARABE_EMBED_OPTION_KEYS } from "@johnmorrisdotca/narabe/element";
 * console.log(NARABE_EMBED_OPTION_KEYS);
 * ```
 */
export const NARABE_EMBED_OPTION_KEYS = Object.keys({ state: true, settings: true, moves: true, choices: true, clocked: true, draw: true, onChange: true } satisfies Record<keyof NarabeElementOptions, boolean>);
/**
 * Native drawing option keys, checked by the embed builder.
 * @example
 * ```ts
 * import { NARABE_DRAW_OPTION_KEYS } from "@johnmorrisdotca/narabe/element";
 * console.log(NARABE_DRAW_OPTION_KEYS);
 * ```
 */
export const NARABE_DRAW_OPTION_KEYS = Object.keys({ width: true, title: true, lastMove: true, winningLine: true, forbidden: true, legal: true, selected: true } satisfies Record<keyof DrawBoardOptions, boolean>);
/**
 * A board position and keyboard-operable replay of the native game engine.
 * @example
 * ```ts
 * import { NarabeBoard } from "@johnmorrisdotca/narabe/element";
 * console.log(NarabeBoard.observedAttributes.includes("moves"));
 * ```
 */
export class NarabeBoard extends ElementBase {
  static observedAttributes = ["game", "grid", "seed", "moves", "step", "last-move", "winning-line", "forbidden", "legal", "controls", "lang", "size", "width", "theme", "label"];
  #state: GameState | null = null;
  #options: NarabeElementOptions = {};
  #timeline: GameState[] = [];
  #cache = "";
  #widthBefore: string | null = null;
  #widthOwned = false;
  #labelBefore: { role: string | null; label: string | null } | null = null;
  #write(name: string, value: unknown): void { if (value === null || value === undefined) this.removeAttribute(name); else this.setAttribute(name, String(value)); }
  /** Current structured position, or null after an input error. */
  get state(): GameState | null { return this.#state; }
  /** Advanced host state, replay and SVG options. */
  get options(): NarabeElementOptions { return this.#options; }
  set options(value: NarabeElementOptions) { this.#options = value ?? {}; this.#cache = ""; if (this.isConnected) this.#render(); }
  connectedCallback(): void { if (!this.hasAttribute("tabindex")) this.tabIndex = 0; this.addEventListener("keydown", this.#key); this.#render(); }
  disconnectedCallback(): void { this.removeEventListener("keydown", this.#key); }
  attributeChangedCallback(): void { if (this.isConnected) this.#render(); }
  #key = (event: KeyboardEvent): void => { if (event.ctrlKey || event.metaKey || event.altKey || (event.target as Element | null)?.closest("input,button,textarea,select")) return; if (event.key === "ArrowRight") { event.preventDefault(); this.next(); } else if (event.key === "ArrowLeft") { event.preventDefault(); this.previous(); } else if (event.key === "Home") { event.preventDefault(); this.seek(0); } else if (event.key === "End") { event.preventDefault(); this.seek(this.#timeline.length - 1); } };
  /** Show a replay position by index, bounded to the available timeline. */
  seek(step: number): void { this.#write("step", Math.max(0, Math.min(this.#timeline.length - 1, Math.trunc(step)))); }
  /** Show the next position. */
  next(): void { this.seek(this.#at() + 1); }
  /** Show the previous position. */
  previous(): void { this.seek(this.#at() - 1); }
  #at(): number { const asked = this.hasAttribute("step") ? Number(this.getAttribute("step")) : this.#timeline.length - 1; if (!Number.isInteger(asked) || asked < 0) throw new RangeError("Use a nonnegative whole replay step."); return Math.min(asked, this.#timeline.length - 1); }
  /** The `game` attribute, reflected. */
  get game(): string | null { return this.getAttribute("game"); }
  set game(value: string | number | boolean | null | undefined) { this.#write("game", value); }
  /** The `grid` attribute, reflected. */
  get grid(): string | null { return this.getAttribute("grid"); }
  set grid(value: string | number | boolean | null | undefined) { this.#write("grid", value); }
  /** The `seed` attribute, reflected. */
  get seed(): string | null { return this.getAttribute("seed"); }
  set seed(value: string | number | boolean | null | undefined) { this.#write("seed", value); }
  /** The `step` attribute, reflected. */
  get step(): string | null { return this.getAttribute("step"); }
  set step(value: string | number | boolean | null | undefined) { this.#write("step", value); }
  /** The `last-move` attribute, reflected. */
  get lastMove(): string | null { return this.getAttribute("last-move"); }
  set lastMove(value: string | number | boolean | null | undefined) { this.#write("last-move", value); }
  /** The `winning-line` attribute, reflected. */
  get winningLine(): string | null { return this.getAttribute("winning-line"); }
  set winningLine(value: string | number | boolean | null | undefined) { this.#write("winning-line", value); }
  /** The `forbidden` attribute, reflected. */
  get forbidden(): string | null { return this.getAttribute("forbidden"); }
  set forbidden(value: string | number | boolean | null | undefined) { this.#write("forbidden", value); }
  /** The `legal` attribute, reflected. */
  get legal(): string | null { return this.getAttribute("legal"); }
  set legal(value: string | number | boolean | null | undefined) { this.#write("legal", value); }
  /** The `controls` attribute, reflected. */
  get controls(): string | null { return this.getAttribute("controls"); }
  set controls(value: string | number | boolean | null | undefined) { this.#write("controls", value); }
  /** The `size` attribute, reflected. */
  get size(): string | null { return this.getAttribute("size"); }
  set size(value: string | number | boolean | null | undefined) { this.#write("size", value); }
  /** The `width` attribute, reflected. */
  get width(): string | null { return this.getAttribute("width"); }
  set width(value: string | number | boolean | null | undefined) { this.#write("width", value); }
  /** The `theme` attribute, reflected. */
  get theme(): string | null { return this.getAttribute("theme"); }
  set theme(value: string | number | boolean | null | undefined) { this.#write("theme", value); }
  /** The `label` attribute, reflected. */
  get label(): string | null { return this.getAttribute("label"); }
  set label(value: string | number | boolean | null | undefined) { this.#write("label", value); }
  /** The moves attribute, reflected. Assign an array to serialize a host record. */
  get moves(): string | null { return this.getAttribute("moves"); }
  set moves(value: string | readonly MoveInput[] | null) { this.#write("moves", Array.isArray(value) ? JSON.stringify(value) : value); }
  #frame(): void {
    this.style.display = "block"; this.style.maxWidth = "100%";
    const width = Number(this.getAttribute("width")), size = this.getAttribute("size");
    const pixels = this.hasAttribute("width") && width > 0 && Number.isFinite(width) ? Math.min(width, 2000) : size === "small" ? 320 : size === "medium" ? 480 : size === "large" ? 640 : null;
    if (pixels !== null) { if (!this.#widthOwned) this.#widthBefore = this.style.width; this.#widthOwned = true; this.style.width = `${pixels}px`; }
    else if (this.#widthOwned) { this.style.width = this.#widthBefore ?? ""; this.#widthOwned = false; }
    const theme = this.getAttribute("theme"); this.style.colorScheme = theme === "light" || theme === "dark" ? theme : "light dark";
    this.setAttribute("data-narabe-embed", "");
    const root = this.getRootNode(), target: ParentNode = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root : this.ownerDocument.head;
    if (target.querySelector("style[data-narabe-embed-style]") === null) {
      const style = this.ownerDocument.createElement("style"); style.setAttribute("data-narabe-embed-style", "");
      const dark = '[data-narabe-embed]{--nb-wood:#66563c;--nb-wood-deep:#423c31;--nb-line:#ece8dc;--nb-cell-light:#6a604d;--nb-cell-dark:#423c31;--nb-white:#ece8dc;--nb-black:#121512}[data-narabe-embed] .nb-step{color:#ece8dc}';
      style.textContent = '[data-narabe-embed]{--nb-wood:#d9b36c;--nb-wood-deep:#a9824a;--nb-line:#3a2a1a;--nb-cell-light:#ecd9a8;--nb-cell-dark:#a9824a;--nb-white:#f6f3ea;--nb-black:#1c1c1c}[data-narabe-embed] svg{display:block;width:100%;height:auto}[data-narabe-embed] .nb-replay{display:flex;align-items:center;gap:8px;color:light-dark(#1f2320,#ece8dc)}[data-narabe-embed] .nb-replay input{min-width:0;flex:1;min-height:44px}[data-narabe-embed] button{min-width:44px;min-height:44px;font:inherit}[data-narabe-embed] .nb-step{font:14px/1.5 system-ui,sans-serif}' + dark.replaceAll('[data-narabe-embed]', '[data-narabe-embed][theme="dark"]') + '@media(prefers-color-scheme:dark){' + dark.replaceAll('[data-narabe-embed]', '[data-narabe-embed]:not([theme="light"]):not([theme="dark"])') + '}';
 target.append(style);
    }
    if (this.hasAttribute("label")) { this.#labelBefore ??= { role: this.getAttribute("role"), label: this.getAttribute("aria-label") }; this.setAttribute("role", "group"); this.setAttribute("aria-label", this.getAttribute("label")!); }
    else if (this.#labelBefore !== null) { for (const [name, value] of [["role", this.#labelBefore.role], ["aria-label", this.#labelBefore.label]]) { if (value === null) this.removeAttribute(name!); else this.setAttribute(name!, value!); } this.#labelBefore = null; }
  }
  #render(): void {
    this.#frame();
    try {
      const game = (this.getAttribute("game") ?? this.#options.settings?.variant ?? "freestyle") as GameSettings["variant"];
      if (!RULE_VARIANT_LIST.includes(game)) throw new RangeError("Choose a known board game.");
      const grid = this.hasAttribute("grid") ? Number(this.getAttribute("grid")) : this.#options.settings?.size;
      if (grid !== undefined && !(ALL_BOARD_SIZES as readonly number[]).includes(grid)) throw new RangeError("Choose a supported board size.");
      const seed = this.hasAttribute("seed") ? Number(this.getAttribute("seed")) : this.#options.settings?.seed ?? 0;
      if (!Number.isInteger(seed) || seed < 0 || seed >= SEED_RANGE) throw new RangeError("Use a whole seed from 0 to 2147483647.");
      const moves = this.hasAttribute("moves") ? parseEmbedMoves(this.getAttribute("moves")) : this.#options.moves ?? [];
      if (moves === null) throw new RangeError("Use a valid JSON move list.");
      const key = JSON.stringify([this.#options.settings, game, grid, seed, moves, this.#options.choices, this.#options.clocked]);
      if (key !== this.#cache) {
        this.#timeline = this.#options.state === undefined ? replayMoves(createGame({ ...this.#options.settings, variant: game, ...(grid === undefined ? {} : { size: grid }), seed }), moves, this.#options.choices, { clocked: this.#options.clocked === true }) : [this.#options.state]; this.#cache = key;
      }
      const at = this.#at(), state = this.#timeline[at]; if (state === undefined) throw new RangeError("No position is available."); this.#state = state;
      const ja = (this.getAttribute("lang") ?? this.ownerDocument.documentElement.lang) === "ja", title = this.getAttribute("label") ?? this.#options.draw?.title ?? (ja ? `盤面、${at}手目` : `Board position, step ${at}`);
      const svgText = boardSvg(state, { ...this.#options.draw, title, lastMove: isOn(this.getAttribute("last-move"), this.#options.draw?.lastMove ?? true), winningLine: isOn(this.getAttribute("winning-line"), this.#options.draw?.winningLine ?? true), legal: isOn(this.getAttribute("legal"), this.#options.draw?.legal ?? false), forbidden: isOn(this.getAttribute("forbidden"), this.#options.draw?.forbidden ?? false) });
      // Only the package's escaped SVG writer supplies markup.
      const svg = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
      const doc = this.ownerDocument, view = doc.createElement("div"); view.append(doc.importNode(svg, true)); this.replaceChildren(view);
      if (isOn(this.getAttribute("controls"))) {
        const controls = doc.createElement("div"); controls.className = "nb-replay";
        const previous = doc.createElement("button"), next = doc.createElement("button"), slider = doc.createElement("input");
        previous.type = next.type = "button"; previous.textContent = "←"; next.textContent = "→"; previous.setAttribute("aria-label", ja ? "前の局面" : "Previous position"); next.setAttribute("aria-label", ja ? "次の局面" : "Next position"); previous.disabled = at === 0; next.disabled = at === this.#timeline.length - 1;
        previous.addEventListener("click", () => { this.previous(); this.focus(); }); next.addEventListener("click", () => { this.next(); this.focus(); }); slider.type = "range"; slider.min = "0"; slider.max = String(this.#timeline.length - 1); slider.value = String(at); slider.setAttribute("aria-label", ja ? "棋譜の手順" : "Replay step"); slider.addEventListener("input", () => { const wanted = Number(slider.value); this.seek(wanted); this.querySelector<HTMLInputElement>('input[type="range"]')?.focus(); });
        controls.append(previous, slider, next); view.append(controls);
      }
      const status = doc.createElement("p"); status.className = "nb-step"; status.setAttribute("aria-live", "polite"); status.textContent = ja ? `${this.#timeline.length - 1}手中${at}手目` : `Step ${at} of ${this.#timeline.length - 1}`; view.append(status);
      this.#options.onChange?.(state); const detail = JSON.parse(JSON.stringify({ step: at, steps: this.#timeline.length - 1, state })); this.dispatchEvent(new CustomEvent("narabe-change", { bubbles: true, composed: true, detail })); this.dispatchEvent(new CustomEvent("narabe-load", { bubbles: true, composed: true, detail }));
    } catch (error) {
      this.#state = null; this.#cache = ""; const message = error instanceof Error ? error.message : String(error), status = this.ownerDocument.createElement("p"); status.setAttribute("role", "status"); status.textContent = message; this.replaceChildren(status); this.dispatchEvent(new CustomEvent("narabe-error", { bubbles: true, composed: true, detail: { message } }));
    }
  }
}
/**
 * Defines the default board or a subclass under a custom tag. Safe on a server.
 * @param tagName - The tag to define; narabe-board by default.
 * @param registry - The page's registry, or undefined on a server.
 * @returns Nothing; an existing definition is left alone.
 * @example
 * ```ts
 * import { defineBoard } from "@johnmorrisdotca/narabe/element";
 * defineBoard();
 * console.log(typeof defineBoard);
 * ```
 */
export function defineBoard(tagName = "narabe-board", registry: CustomElementRegistry | undefined = typeof customElements === "undefined" ? undefined : customElements): void { if (registry !== undefined && registry.get(tagName) === undefined) registry.define(tagName, tagName === "narabe-board" ? NarabeBoard : class extends NarabeBoard {}); }
