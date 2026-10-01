import { describe, expect, it } from "vitest";

import { boardSvg } from "./draw.ts";
import { RULE_VARIANT_LIST, VARIANT_SPECS } from "./constants.ts";
import { createGame, playMove } from "./engine.ts";
import { runCli } from "./cli.ts";
import { replayMoves } from "./rules/record.ts";
import type { GameSettings, MoveInput } from "./types.ts";

/** A game played at random to its end by the command line's own mover, as a state. */
function played(game: string, seed: number) {
  const record = JSON.parse(runCli(["play", game, "--seed", String(seed), "--record"]).out) as { settings: GameSettings; moves: MoveInput[] };
  return replayMoves(createGame(record.settings), record.moves).at(-1)!;
}

describe("a position drawn as SVG", () => {
  it("draws every game as one well-formed SVG element, with a stone drawn for each stone on the board", () => {
    for (const game of RULE_VARIANT_LIST) {
      const state = played(game, 3);
      const svg = boardSvg(state);
      expect(svg, game).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-\d. ]+" role="img" aria-label="Board">.*<\/svg>$/);
      expect(svg, game).not.toContain("NaN");
      expect(svg, game).not.toContain("undefined");
      const stones = state.board.filter((cell) => cell === "black" || cell === "white").length;
      // A stone is a circle of radius .43; nothing else is drawn that size.
      expect((svg.match(/r="0\.43"/g) ?? []).length, game).toBe(stones);
    }
  });

  it("draws a game the way it is traditionally drawn: on the crossings, in the squares, or on the lattice", () => {
    const lines = boardSvg(createGame({ variant: "freestyle", size: 15 }));
    const cells = boardSvg(createGame({ variant: "checkers" }));
    const lattice = boardSvg(createGame({ variant: "hex", size: 11 }));
    expect(VARIANT_SPECS.freestyle.grid).toBe("lines");
    expect(lines).toContain("<line ");
    expect(lines).not.toContain("<rect x=\"-0.5\"");
    expect(VARIANT_SPECS.checkers.grid).toBe("cells");
    expect(cells).toContain('<rect x="-0.5" y="-0.5" width="1" height="1"');
    expect(lattice).toContain("<polygon ");
  });

  it("sizes the picture when asked, in proportion, and leaves it to fill its box when not", () => {
    const state = createGame({ variant: "freestyle", size: 15 });
    const opening = (svg: string) => svg.slice(0, svg.indexOf(">"));
    expect(opening(boardSvg(state))).not.toMatch(/ width=/);
    const sized = boardSvg(state, { width: 300 });
    expect(opening(sized)).toMatch(/ width="300" height="300"/);
  });

  it("marks the last move, the winning line and what is asked for, and not what is not", () => {
    let state = createGame({ variant: "freestyle", size: 9 });
    for (const [row, col] of [[4, 4], [0, 0]]) state = playMove(state, { row, col });
    const plain = boardSvg(state);
    expect(plain).toContain('r="0.1"');
    expect(boardSvg(state, { lastMove: false })).not.toContain('r="0.1"');
    expect(plain).not.toContain('r="0.12"');
    expect(boardSvg(state, { legal: true })).toContain('r="0.12"');
    expect(boardSvg(played("freestyle", 1))).toContain('r="0.47"');
    expect(boardSvg(played("freestyle", 1), { winningLine: false })).not.toContain('r="0.47"');
  });

  it("names the picture for a screen reader, escaped, or marks it as decoration", () => {
    const state = createGame({ variant: "tictactoe" });
    expect(boardSvg(state, { title: 'Tic "tac" <toe>' })).toContain('aria-label="Tic &quot;tac&quot; &lt;toe&gt;"');
    expect(boardSvg(state, { title: "" })).toContain('aria-hidden="true"');
  });

  it("paints with CSS variables that have defaults, so a page can restyle it from outside", () => {
    const svg = boardSvg(createGame({ variant: "tictactoe" }));
    expect(svg).toContain("var(--nb-wood, #d9b36c)");
    expect(svg).toContain("var(--nb-cell-light, #ecd9a8)");
  });
});
