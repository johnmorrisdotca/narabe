// The demo: any of Narabe's games on one screen, drawn in plain SVG.
// Everything that decides what is legal, who has won and what a move does is
// the engine's; this file only draws the state it is given and passes clicks on.
import * as N from "./dist/index.js";
import { GAMES, GROUPS } from "./games.js";

const SVG = "http://www.w3.org/2000/svg";
const SQRT3_2 = Math.sqrt(3) / 2;

const REASONS = {
  line: "a line",
  captures: "captures",
  time: "time",
  resign: "resignation",
  trap: "the other side completing the losing line",
  square: "a square",
  full: "a full board",
  count: "the count",
  camp: "reaching the far camp",
  connection: "joining both sides",
  blocked: "leaving the other side no move",
  territory: "territory",
};

const el = {
  game: document.getElementById("game"),
  rule: document.getElementById("rule"),
  size: document.getElementById("size"),
  opponent: document.getElementById("opponent"),
  newGame: document.getElementById("new"),
  undo: document.getElementById("undo"),
  pass: document.getElementById("pass"),
  hint: document.getElementById("hint"),
  colour: document.getElementById("colour"),
  status: document.getElementById("status"),
  board: document.getElementById("board"),
  score: document.getElementById("score"),
  moves: document.getElementById("moves"),
};

const computer = N.STONES.white;
let state = null;
let selected = null;
let hover = null;
let turning = false;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const same = (a, b) => a !== null && b !== null && a.row === b.row && a.col === b.col;
const specOf = (s) => N.VARIANT_SPECS[s.settings.variant];
const colourName = (stone) => (stone === N.STONES.black ? "Black" : "White");

// ---------- setting up ----------

for (const group of GROUPS) {
  const optgroup = document.createElement("optgroup");
  optgroup.label = group.name;
  for (const game of group.games) optgroup.append(new Option(`${game.name}  ${game.kanji}`, game.key));
  el.game.append(optgroup);
}

const params = new URLSearchParams(location.search);
el.game.value = GAMES.some((game) => game.key === params.get("game")) ? params.get("game") : "freestyle";

function fillSizes() {
  const variant = el.game.value;
  const sizes = N.boardSizesFor(variant);
  el.size.replaceChildren(...sizes.map((size) => new Option(`${size} × ${size}`, String(size))));
  const wanted = Number(params.get("size"));
  el.size.value = String(sizes.includes(wanted) ? wanted : variant === N.RULE_VARIANTS.go ? 9 : N.defaultBoardFor(variant));
  el.size.disabled = sizes.length < 2;
  el.rule.textContent = GAMES.find((game) => game.key === variant)?.rule ?? "";
  el.colour.hidden = !N.VARIANT_SPECS[variant].anyColour;
}

function newGame() {
  const variant = el.game.value;
  state = N.createGame({ variant, size: Number(el.size.value), seed: Math.floor(Math.random() * N.SEED_RANGE) }, Math.random());
  selected = null;
  hover = null;
  const address = new URL(location.href);
  address.searchParams.set("game", variant);
  address.searchParams.set("size", el.size.value);
  history.replaceState(null, "", address);
  render();
  computerTurn();
}

el.game.addEventListener("change", () => {
  params.delete("size");
  fillSizes();
  newGame();
});
el.size.addEventListener("change", newGame);
el.newGame.addEventListener("click", newGame);
el.opponent.addEventListener("change", () => computerTurn());

// ---------- moves ----------

function vsComputer() {
  return el.opponent.value === "random";
}

function computersTurn() {
  return vsComputer() && state.status === N.GAME_STATUS.playing && state.toPlay === computer;
}

function commit(next) {
  if (next === state) return false;
  state = next;
  selected = state.chainAt;
  render();
  return true;
}

/** Any legal action for the player to move, chosen at random. */
function randomAction(s) {
  const spec = specOf(s);
  if (N.canTwist(s)) {
    return N.twistBoard(s, Math.floor(Math.random() * N.quadrantCount(s.settings.size, spec.quadrantSize)), Math.random() < 0.5);
  }
  if (N.mustPass(s)) return N.passTurn(s);
  if (spec.queue !== null) {
    const placements = N.piecePlacements(s);
    if (placements.length > 0) return N.placePiece(s, pick(placements));
  }
  const choices = N.turnChoices(s);
  if (choices?.kind === N.TURN_CHOICE_KINDS.move) {
    const from = s.chainAt ?? pick(choices.pieces);
    const to = N.pieceMoves(s, from);
    if (to.length > 0) return N.movePiece(s, from, pick(to));
  }
  const points = N.legalPoints(s);
  // A random Go player would fill its own eyes for ever; it passes once the board is mostly settled.
  if (spec.go && (points.length === 0 || points.length < (s.settings.size * s.settings.size) / 4) && Math.random() < 0.5) {
    return N.passTurn(s);
  }
  if (points.length > 0) return N.playMove(s, pick(points), N.MOVE_KINDS.place, spec.anyColour ? pick([N.STONES.black, N.STONES.white]) : null);
  return N.canPass(s) ? N.passTurn(s) : s;
}

function computerTurn() {
  if (turning || !computersTurn()) return;
  turning = true;
  setTimeout(() => {
    turning = false;
    if (!computersTurn()) return;
    commit(randomAction(state));
    computerTurn();
  }, 380);
}

function placementsAt(point) {
  return N.piecePlacements(state).filter((cells) => cells.some((cell) => same(cell, point)));
}

function clickAt(point) {
  if (state.status !== N.GAME_STATUS.playing || computersTurn() || N.canTwist(state)) return;
  const spec = specOf(state);

  if (spec.queue !== null) {
    const choices = placementsAt(point);
    if (choices.length > 0) commit(N.placePiece(state, choices[0]));
    else commit(N.playMove(state, point));
    return computerTurn();
  }

  if (N.inMovePhase(state)) {
    if (selected !== null && N.pieceMoves(state, selected).some((to) => same(to, point))) {
      commit(N.movePiece(state, selected, point));
      return computerTurn();
    }
    if (state.chainAt === null) {
      selected = N.pieceMoves(state, point).length > 0 ? point : null;
      render();
    }
    return;
  }

  const colour = spec.anyColour ? el.colour.querySelector("input:checked").value : null;
  commit(N.playMove(state, point, N.MOVE_KINDS.place, colour));
  computerTurn();
}

el.undo.addEventListener("click", () => {
  // Against the computer, take back its reply as well as your own move.
  let next = N.undoMove(state);
  while (vsComputer() && next.moves.length > 0 && next.toPlay === computer && N.canUndo(next)) next = N.undoMove(next);
  commit(next);
});
el.pass.addEventListener("click", () => {
  commit(N.passTurn(state));
  computerTurn();
});
el.hint.addEventListener("click", () => {
  if (state.status !== N.GAME_STATUS.playing || computersTurn()) return;
  commit(randomAction(state));
  computerTurn();
});

// ---------- drawing ----------

function node(name, attrs = {}, parent = null) {
  const made = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) made.setAttribute(key, String(value));
  if (parent) parent.append(made);
  return made;
}

/** Where a point is drawn: a square grid, or the hexagon lattice (every row slid half a cell). */
function layout(s) {
  const spec = specOf(s);
  const lattice = spec.connects || spec.hexagon || spec.chineseCheckers;
  const at = lattice ? (p) => ({ x: p.col + p.row / 2, y: p.row * SQRT3_2 }) : (p) => ({ x: p.col, y: p.row });
  const { size } = s.settings;
  const shown = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const point = { row, col };
      const cell = s.board[N.indexOf(size, point)];
      // On a lattice board the squares outside the shape are sealed off, and are not part of it at all.
      if (lattice && cell === N.BLOCKED && !spec.connects) continue;
      shown.push(point);
    }
  }
  const xs = shown.map((p) => at(p).x);
  const ys = shown.map((p) => at(p).y);
  return { lattice, at, shown, box: { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) } };
}

function hexagon(cx, cy, r) {
  return Array.from({ length: 6 }, (_, k) => {
    const angle = (Math.PI / 3) * k + Math.PI / 6;
    return `${(cx + r * Math.cos(angle)).toFixed(3)},${(cy + r * Math.sin(angle)).toFixed(3)}`;
  }).join(" ");
}

function render() {
  const s = state;
  const spec = specOf(s);
  const { size } = s.settings;
  const { lattice, at, shown, box } = layout(s);
  const pad = 0.9;
  const svg = node("svg", {
    viewBox: `${box.left - pad} ${box.top - pad} ${box.right - box.left + pad * 2} ${box.bottom - box.top + pad * 2}`,
    role: "img",
    "aria-label": `${GAMES.find((game) => game.key === s.settings.variant)?.name} board, ${size} by ${size}`,
  });
  const wood = node("rect", { x: box.left - pad, y: box.top - pad, width: box.right - box.left + pad * 2, height: box.bottom - box.top + pad * 2, rx: 0.3, fill: "var(--wood)" }, svg);
  wood.setAttribute("stroke", "var(--wood-deep)");
  wood.setAttribute("stroke-width", "0.08");

  const cells = spec.grid === "cells";
  const grid = node("g", {}, svg);
  if (lattice) {
    for (const p of shown) {
      const { x, y } = at(p);
      if (spec.chineseCheckers) node("circle", { cx: x, cy: y, r: 0.2, fill: "var(--line)", opacity: 0.35 }, grid);
      else node("polygon", { points: hexagon(x, y, 0.575), fill: "var(--cell-light)", stroke: "var(--line)", "stroke-width": 0.04 }, grid);
    }
    if (spec.connects) {
      // Black joins top to bottom, White left to right: the sides are drawn in their colours.
      const edge = (from, to, colour) => node("line", { x1: at(from).x, y1: at(from).y, x2: at(to).x, y2: at(to).y, stroke: colour, "stroke-width": 0.16, "stroke-linecap": "round" }, grid);
      const n = size - 1;
      const lift = (p, dy) => ({ ...p, row: p.row + dy });
      edge(lift({ row: 0, col: 0 }, -0.65), lift({ row: 0, col: n }, -0.65), "var(--black)");
      edge(lift({ row: n, col: 0 }, 0.65), lift({ row: n, col: n }, 0.65), "var(--black)");
      edge({ row: 0, col: -0.7 }, { row: n, col: -0.7 }, "var(--white)");
      edge({ row: 0, col: n + 0.7 }, { row: n, col: n + 0.7 }, "var(--white)");
    }
  } else if (cells) {
    for (const p of shown) {
      const dark = spec.checkers ? N.isDarkSquare(p) : (p.row + p.col) % 2 === 1;
      node("rect", { x: p.col - 0.5, y: p.row - 0.5, width: 1, height: 1, fill: dark && (spec.checkers || spec.camps) ? "var(--cell-dark)" : "var(--cell-light)", stroke: "var(--line)", "stroke-width": 0.03 }, grid);
    }
    if (spec.quadrantSize !== null) {
      const q = spec.quadrantSize;
      for (let k = q; k < size; k += q) {
        node("line", { x1: k - 0.5, y1: -0.5, x2: k - 0.5, y2: size - 0.5, stroke: "var(--line)", "stroke-width": 0.1 }, grid);
        node("line", { x1: -0.5, y1: k - 0.5, x2: size - 0.5, y2: k - 0.5, stroke: "var(--line)", "stroke-width": 0.1 }, grid);
      }
    }
  } else {
    for (let k = 0; k < size; k += 1) {
      node("line", { x1: 0, y1: k, x2: size - 1, y2: k, stroke: "var(--line)", "stroke-width": 0.035 }, grid);
      node("line", { x1: k, y1: 0, x2: k, y2: size - 1, stroke: "var(--line)", "stroke-width": 0.035 }, grid);
    }
    for (const p of N.STAR_POINTS[size] ?? []) node("circle", { cx: p.col, cy: p.row, r: 0.09, fill: "var(--line)" }, grid);
  }

  // Camps and star points in the race games, faintly, so a player can see where they are going.
  if (spec.camps || spec.chineseCheckers) {
    for (const p of shown) {
      const camp = spec.camps ? N.campOf(size, p) : N.starCampOf(N.STAR_RADIUS, p);
      if (camp === null) continue;
      const { x, y } = at(p);
      node("circle", { cx: x, cy: y, r: 0.46, fill: camp === N.STONES.black ? "var(--black)" : "var(--white)", opacity: 0.12 }, grid);
    }
  }

  const choices = N.turnChoices(s);
  const legal = choices?.kind === N.TURN_CHOICE_KINDS.place ? choices.points : [];
  const empties = shown.filter((p) => s.board[N.indexOf(size, p)] === null).length;
  const showLegal = !computersTurn() && legal.length > 0 && legal.length <= empties / 2;
  const targets = selected !== null ? N.pieceMoves(s, selected) : [];
  const forbidden = s.status === N.GAME_STATUS.playing ? N.forbiddenPoints(s) : [];
  const last = N.lastMove(s);
  const winning = s.winningLine;
  const kings = s.kings;
  const hovered = hover !== null && spec.queue !== null && !computersTurn() ? (placementsAt(hover)[0] ?? []) : [];

  const marks = node("g", {}, svg);
  for (const p of shown) {
    const { x, y } = at(p);
    const cell = s.board[N.indexOf(size, p)];
    if (cell === N.BLOCKED) {
      if (lattice) node("polygon", { points: hexagon(x, y, 0.575), fill: "var(--line)", opacity: 0.85 }, marks);
      else node("rect", { x: x - 0.45, y: y - 0.45, width: 0.9, height: 0.9, rx: 0.12, fill: "var(--line)", opacity: 0.85 }, marks);
    } else if (cell === N.HOT) {
      node("circle", { cx: x, cy: y, r: 0.36, fill: "none", stroke: "var(--hot)", "stroke-width": 0.12 }, marks);
      node("circle", { cx: x, cy: y, r: 0.12, fill: "var(--hot)" }, marks);
    } else if (cell === N.WORM) {
      node("circle", { cx: x, cy: y, r: 0.36, fill: "none", stroke: "var(--worm)", "stroke-width": 0.1, "stroke-dasharray": "0.2 0.1" }, marks);
    } else if (cell === N.STONES.black || cell === N.STONES.white) {
      const fresh = same(p, last) ? " fresh" : "";
      node("circle", { class: `stone${fresh}`, cx: x, cy: y, r: 0.43, fill: cell === N.STONES.black ? "var(--black)" : "var(--white)", stroke: "rgb(0 0 0 / 0.45)", "stroke-width": 0.03 }, marks);
      if (kings.some((k) => same(k, p))) node("circle", { cx: x, cy: y, r: 0.22, fill: "none", stroke: "#d4a017", "stroke-width": 0.09 }, marks);
    }
    if (same(p, last)) node("circle", { cx: x, cy: y, r: 0.1, fill: "var(--accent)" }, marks);
    if (winning.some((w) => same(w, p))) node("circle", { cx: x, cy: y, r: 0.47, fill: "none", stroke: "var(--accent)", "stroke-width": 0.08 }, marks);
    if (showLegal && legal.some((l) => same(l, p))) node("circle", { cx: x, cy: y, r: 0.11, fill: "var(--good)", opacity: 0.7 }, marks);
    if (forbidden.some((f) => same(f, p))) {
      node("path", { d: `M${x - 0.18} ${y - 0.18}L${x + 0.18} ${y + 0.18}M${x + 0.18} ${y - 0.18}L${x - 0.18} ${y + 0.18}`, stroke: "var(--accent)", "stroke-width": 0.07 }, marks);
    }
    if (same(p, selected)) node("circle", { cx: x, cy: y, r: 0.48, fill: "none", stroke: "var(--good)", "stroke-width": 0.09 }, marks);
    if (targets.some((t) => same(t, p))) node("circle", { cx: x, cy: y, r: 0.15, fill: "var(--good)" }, marks);
    const piece = hovered.find((c) => same(c, p));
    if (piece) node("circle", { cx: x, cy: y, r: 0.4, fill: piece.stone === N.STONES.black ? "var(--black)" : "var(--white)", opacity: 0.45 }, marks);
  }

  const hits = node("g", {}, svg);
  for (const p of shown) {
    const { x, y } = at(p);
    const hit = lattice ? node("polygon", { points: hexagon(x, y, 0.58), class: "hit" }, hits) : node("rect", { x: x - 0.5, y: y - 0.5, width: 1, height: 1, class: "hit" }, hits);
    hit.addEventListener("click", () => clickAt(p));
    if (spec.queue !== null) {
      hit.addEventListener("mouseenter", () => {
        hover = p;
        render();
      });
    }
  }

  // A twist game's move ends with a quarter turn: an arrow each way on every quadrant.
  if (N.canTwist(s) && !computersTurn()) {
    const q = spec.quadrantSize;
    const across = size / q;
    for (let quadrant = 0; quadrant < across * across; quadrant += 1) {
      const origin = N.quadrantOrigin(size, q, quadrant);
      const cx = origin.col + (q - 1) / 2;
      const cy = origin.row + (q - 1) / 2;
      for (const clockwise of [false, true]) {
        const bx = cx + (clockwise ? 0.42 : -0.42);
        const button = node("g", { class: "turn", role: "button", "aria-label": `Turn quarter ${quadrant + 1} ${clockwise ? "clockwise" : "anticlockwise"}`, style: "cursor:pointer" }, svg);
        node("circle", { cx: bx, cy, r: 0.36, fill: "var(--accent)", opacity: 0.92 }, button);
        const text = node("text", { x: bx, y: cy + 0.15, "text-anchor": "middle", "font-size": 0.44, fill: "#fff", "font-weight": 700 }, button);
        text.textContent = clockwise ? "↻" : "↺";
        button.addEventListener("click", () => {
          commit(N.twistBoard(state, quadrant, clockwise));
          computerTurn();
        });
      }
    }
  }

  el.board.replaceChildren(svg);
  renderText();
}

function renderText() {
  const s = state;
  const spec = specOf(s);
  const playing = s.status === N.GAME_STATUS.playing;
  let status;
  if (s.status === N.GAME_STATUS.won) status = `${colourName(s.winner)} wins by ${REASONS[s.winBy] ?? s.winBy}.`;
  else if (s.status === N.GAME_STATUS.draw) status = "A draw.";
  else if (N.canTwist(s)) status = `${colourName(s.toPlay)}: now turn a quarter of the board.`;
  else if (s.chainAt !== null) status = `${colourName(s.toPlay)} keeps jumping.`;
  else if (N.mustPass(s)) status = `${colourName(s.toPlay)} has no move, and must pass.`;
  else if (spec.singleColour) status = `${s.toPlay === N.STONES.black ? "First" : "Second"} player to place.`;
  else status = `${colourName(s.toPlay)} to play${computersTurn() ? " (thinking)" : ""}.`;
  el.status.textContent = status;
  el.status.classList.toggle("over", !playing);

  const { size } = s.settings;
  let score = "";
  if (spec.flips) {
    const discs = N.discCount(s.board);
    score = `Discs: Black ${discs.black}, White ${discs.white}.`;
  } else if (spec.go) {
    const area = N.scoreArea(s.board, size);
    score = `Area: Black ${area.black}, White ${area.white} + ${N.KOMI} komi.`;
  } else if (spec.captures) {
    score = `Captured: Black ${s.captures.black}, White ${s.captures.white}, of ${s.settings.capturesToWin} to win.`;
  } else if (spec.queue !== null) {
    const next = N.queuedPiece(s);
    score = next ? `Next piece: ${next.cells.map((c) => (c.stone === N.STONES.black ? "●" : "○")).join("")}. Hover to see where it goes.` : "";
  }
  el.score.textContent = score;

  el.undo.disabled = !N.canUndo(s) || computersTurn();
  el.pass.disabled = !playing || !N.canPass(s) || computersTurn();
  el.hint.disabled = !playing || computersTurn();

  el.moves.replaceChildren(
    ...s.moves.map((move) => {
      const item = document.createElement("li");
      item.className = move.by ?? move.stone;
      const word = N.stonelessWord(move.kind);
      const where = word ?? (move.kind === N.MOVE_KINDS.piece && move.cells ? move.cells.map((c) => N.pointName(size, c)).join(" ") : N.pointName(size, move));
      const from = move.from ? `${N.pointName(size, move.from)}${move.captured?.length ? "×" : "–"}` : "";
      const twist = move.twist ? ` ${move.twist.clockwise ? "↻" : "↺"}${move.twist.quadrant + 1}` : "";
      item.textContent = `${colourName(move.by ?? move.stone)} ${from}${where}${twist}`;
      return item;
    }),
  );
  el.moves.scrollTop = el.moves.scrollHeight;
}

fillSizes();
newGame();
