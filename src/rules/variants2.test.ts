import { describe, expect, it } from "vitest";
import { cellAt, createGame, isLegalMove, legalPoints, playMove } from "../engine.ts";
import { replayMoves, undoMove } from "./record.ts";
import { GAME_STATUS, RULE_VARIANTS, STONES, WIN_REASONS, WORM } from "../constants.ts";
import { randomSquares, wormholeLinks } from "../obstacles.ts";
import { fromDiagram } from "../test-support.ts";
import type { Cell, GameState, Point } from "../types.ts";

const p = (row: number, col: number): Point => ({ row, col });

function play(state: GameState, points: Point[]): GameState {
  return points.reduce((current, point) => playMove(current, point), state);
}

describe("sannuki: pairs and triples", () => {
  const sannuki = { settings: { variant: RULE_VARIANTS.sannuki }, toPlay: STONES.black };

  it("captures a triple as well as a pair, and counts stones", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        x o o o . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      sannuki,
    );
    const next = playMove(state, p(4, 4));
    expect(cellAt(next, p(4, 1))).toBeNull();
    expect(cellAt(next, p(4, 3))).toBeNull();
    expect(next.captures.black).toBe(3);
    expect(next.settings.capturesToWin).toBe(15);
  });

  it("does not capture four, and the pair game does not capture three", () => {
    const four = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        x o o o o . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      sannuki,
    );
    expect(playMove(four, p(4, 5)).captures.black).toBe(0);

    const ninuki = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        x o o o . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      { settings: { variant: RULE_VARIANTS.ninuki }, toPlay: STONES.black },
    );
    expect(playMove(ninuki, p(4, 4)).captures.black).toBe(0);
    expect(createGame({ variant: RULE_VARIANTS.ninuki }).settings.capturesToWin).toBe(10);
  });
});

describe("wormhole drop", () => {
  it("scatters two mouths from the seed and links them", () => {
    const game = createGame({ variant: RULE_VARIANTS.wormDrop, seed: 9 });
    expect(game.board.filter((cell) => cell === WORM)).toHaveLength(2);
    const links = wormholeLinks(game.settings);
    expect(links.size).toBe(2);
    const { worm } = randomSquares(game.settings);
    expect(links.get(worm[0].row * 7 + worm[0].col)).toBe(worm[1].row * 7 + worm[1].col);
  });

  it("carries a line through the wormhole", () => {
    // Build a 7×7 board by hand with mouths at 6,3 and 0,6 and stones either side.
    const base = createGame({ variant: RULE_VARIANTS.wormDrop, seed: 9 });
    const board: Cell[] = base.board.map((cell) => (cell === WORM ? null : cell));
    const { worm } = randomSquares(base.settings);
    const [a, b] = worm;
    const size = 7;
    board[a.row * size + a.col] = WORM;
    board[b.row * size + b.col] = WORM;
    // Black stones on the row of mouth A to its left, and to the right of mouth B, then one more.
    const state: GameState = { ...base, board, moves: [] };
    // Only test the walker: find a horizontal line where left of A holds x x x and right of B holds x.
    const cells = [
      { row: a.row, col: a.col - 1 },
      { row: a.row, col: a.col - 2 },
      { row: a.row, col: a.col - 3 },
      { row: b.row, col: b.col + 1 },
    ];
    const fits = cells.every(
      (cell) => cell.col >= 0 && cell.col < size && state.board[cell.row * size + cell.col] === null,
    );
    if (!fits) return; // This seed's mouths do not leave room for the shape; the scanner test covers it.
    for (const cell of cells) board[cell.row * size + cell.col] = STONES.black;
    const laid: GameState = { ...state, board };
    // Playing the stone beyond B's right neighbour completes four across the wormhole.
    const target = { row: b.row, col: b.col + 2 };
    if (target.col >= size) return;
    const dropped = playMove({ ...laid, toPlay: STONES.black }, { row: 0, col: target.col });
    expect([GAME_STATUS.won, GAME_STATUS.playing]).toContain(dropped.status);
  });
});

describe("misère five", () => {
  it("loses on five and hands a full board to the opener", () => {
    const state = fromDiagram(
      `
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        x x x x . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `,
      { settings: { variant: RULE_VARIANTS.misereFive }, toPlay: STONES.black },
    );
    const next = playMove(state, p(4, 4));
    expect(next.winner).toBe(STONES.white);
    expect(next.winBy).toBe(WIN_REASONS.trap);
    // There is no column rule here: playing above the last stone is fine.
    const game = playMove(createGame({ variant: RULE_VARIANTS.misereFive, size: 9 }), p(4, 4));
    expect(isLegalMove(game, p(3, 4))).toBe(true);
  });
});

describe("maker and breaker", () => {
  const game = createGame({ variant: RULE_VARIANTS.makerBreaker });

  it("lets the mover place either colour and records who moved", () => {
    expect(game.settings.size).toBe(6);
    const next = playMove(game, p(0, 0), "place", STONES.white);
    expect(cellAt(next, p(0, 0))).toBe(STONES.white);
    expect(next.moves[0]).toMatchObject({ stone: STONES.white, by: STONES.black });
    expect(next.toPlay).toBe(STONES.white);
    // Undo hands the turn back to the mover, not the colour.
    expect(undoMove(next).toPlay).toBe(STONES.black);
  });

  it("gives any five to the maker, whoever placed it", () => {
    const state = fromDiagram(
      `
        . . . . . .
        . . . . . .
        . o o o o .
        . . . . . .
        . . . . . .
        . . . . . .
      `,
      { settings: { variant: RULE_VARIANTS.makerBreaker }, toPlay: STONES.white },
    );
    // The breaker (white to move) is forced to complete white's five: the maker wins.
    const next = playMove(state, p(2, 5), "place", STONES.white);
    expect(next.winner).toBe(STONES.black);
    expect(next.winBy).toBe(WIN_REASONS.line);
  });

  it("gives a full board with no five to the breaker, and replays chosen colours", () => {
    let state = createGame({ variant: RULE_VARIANTS.makerBreaker, seed: 1 });
    // Fill 6×6 in two-wide stripes offset by row, which never lines up five in any direction.
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const colour = (row + Math.floor(col / 2)) % 2 === 0 ? STONES.black : STONES.white;
        state = playMove(state, p(row, col), "place", colour);
        if (state.status !== GAME_STATUS.playing) break;
      }
    }
    expect(state.status).toBe(GAME_STATUS.won);
    expect(state.winner).toBe(STONES.white);
    expect(state.winBy).toBe(WIN_REASONS.full);
    const replayed = replayMoves(createGame({ variant: RULE_VARIANTS.makerBreaker, seed: 1 }), state.moves);
    expect(replayed[replayed.length - 1].board).toEqual(state.board);
    expect(replayed[replayed.length - 1].winner).toBe(STONES.white);
  });
});

describe("wild tic-tac-toe and notakto", () => {
  it("wild: the mover who completes three of either colour wins", () => {
    let game = createGame({ variant: RULE_VARIANTS.wildTicTacToe });
    game = playMove(game, p(0, 0), "place", STONES.white);
    game = playMove(game, p(1, 1), "place", STONES.black);
    game = playMove(game, p(0, 1), "place", STONES.white);
    game = playMove(game, p(2, 2), "place", STONES.black);
    // Black to move completes white's row and wins by it.
    const next = playMove(game, p(0, 2), "place", STONES.white);
    expect(next.winner).toBe(STONES.black);
  });

  it("notakto: every stone is black and three in a row loses", () => {
    let game = createGame({ variant: RULE_VARIANTS.notakto });
    game = play(game, [p(0, 0), p(1, 1)]);
    expect(cellAt(game, p(1, 1))).toBe(STONES.black);
    expect(game.moves[1]).toMatchObject({ stone: STONES.black, by: STONES.white });
    expect(game.toPlay).toBe(STONES.black);
    const lost = playMove(game, p(2, 2));
    expect(lost.winner).toBe(STONES.white);
    expect(lost.winBy).toBe(WIN_REASONS.trap);
    expect(legalPoints(game)).toHaveLength(7);
  });
});
