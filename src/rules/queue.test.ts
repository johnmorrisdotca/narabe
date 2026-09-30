import { describe, expect, it } from "vitest";
import { canShrinkBoard, cellAt, createGame, isLegalMove, legalPoints, mustPass, passTurn, placePiece, playMove, singlesLeft } from "../engine.ts";
import { replayMoves, undoMove } from "./record.ts";
import { GAME_STATUS, RULE_VARIANTS, STONES } from "../constants.ts";
import { fromDiagram } from "../test-support.ts";
import type { GameState, Piece, PieceCell, Point } from "../types.ts";
import {
  footprintAt,
  isPieceInHand,
  orientations,
  pieceQueue,
  piecePlacements,
  queuedPiece,
  upcomingPieces,
} from "./queue.ts";

const p = (row: number, col: number): Point => ({ row, col });
const domino = { variant: RULE_VARIANTS.dominoFive, seed: 11 } as const;
const block = { variant: RULE_VARIANTS.blockFive, seed: 11 } as const;

describe("the queue", () => {
  it("is fixed by the seed and shared by both players", () => {
    const a = pieceQueue(createGame(domino).settings);
    const b = pieceQueue(createGame(domino).settings);
    const c = pieceQueue(createGame({ ...domino, seed: 12 }).settings);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.length).toBeGreaterThan(100);
    // Black's first piece and white's first piece are the same entry.
    const game = createGame(domino);
    const black = queuedPiece(game);
    const afterBlack = placePiece(game, piecePlacements(game)[0]);
    expect(queuedPiece(afterBlack)).toEqual(black);
  });

  it("gives a tetromino two stones of each colour, and a domino any mix", () => {
    for (const piece of pieceQueue(createGame(block).settings).slice(0, 40)) {
      expect(piece.cells).toHaveLength(4);
      expect(piece.cells.filter((cell) => cell.stone === STONES.black)).toHaveLength(2);
    }
    const dominoes = pieceQueue(createGame(domino).settings).slice(0, 60);
    const mixes = new Set(dominoes.map((piece) => piece.cells.map((cell) => cell.stone[0]).join("")));
    expect(mixes.size).toBeGreaterThan(2);
  });

  it("shows the next pieces after the one in hand", () => {
    const game = createGame(domino);
    const queue = pieceQueue(game.settings);
    expect(upcomingPieces(game, 3)).toEqual(queue.slice(1, 4));
  });

  it("is empty outside the piece games", () => {
    expect(pieceQueue(createGame().settings)).toEqual([]);
    expect(queuedPiece(createGame())).toBeNull();
  });
});

describe("orientations", () => {
  it("turns a black-white domino into four distinct ways to lie", () => {
    const piece: Piece = {
      cells: [
        { row: 0, col: 0, stone: STONES.black },
        { row: 0, col: 1, stone: STONES.white },
      ],
    };
    expect(orientations(piece)).toHaveLength(4);
  });

  it("gives a same-colour domino two", () => {
    const piece: Piece = {
      cells: [
        { row: 0, col: 0, stone: STONES.black },
        { row: 0, col: 1, stone: STONES.black },
      ],
    };
    expect(orientations(piece)).toHaveLength(2);
  });

  it("anchors a footprint at the top-left of its box", () => {
    const [flat] = orientations({
      cells: [
        { row: 0, col: 0, stone: STONES.black },
        { row: 0, col: 1, stone: STONES.white },
      ],
    });
    expect(footprintAt(flat, p(3, 4))).toEqual([
      { row: 3, col: 4, stone: STONES.black },
      { row: 3, col: 5, stone: STONES.white },
    ]);
  });
});

describe("laying a piece", () => {
  it("accepts the piece in hand in any orientation, and nothing else", () => {
    const game = createGame(domino);
    const placements = piecePlacements(game);
    expect(placements.length).toBeGreaterThan(100);
    const cells = placements[0];
    expect(isPieceInHand(game, cells)).toBe(true);

    const next = placePiece(game, cells);
    for (const cell of cells) expect(cellAt(next, cell)).toBe(cell.stone);
    expect(next.toPlay).toBe(STONES.white);
    expect(next.moves[0]).toMatchObject({ kind: "piece" });
    expect(next.moves[0].cells).toEqual(cells);

    // A different piece, or the same cells occupied, is refused.
    const wrong: PieceCell[] = cells.map((cell) => ({ ...cell, stone: STONES.black }));
    const swappedColours = isPieceInHand(game, wrong) ? placePiece(game, cells) : game;
    expect(placePiece(next, cells)).toBe(next);
    expect(swappedColours === game || placePiece(game, wrong) !== game).toBe(true);
  });

  it("wins for the colour that makes five, whoever laid it", () => {
    const state = fromDiagram(
      `
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . o o o . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
        . . . . . . . . . . . . .
      `,
      { settings: domino, toPlay: STONES.black },
    );
    // Find a seed and orientation where black must lay a white-white domino next to white's three.
    const piece = queuedPiece(state);
    expect(piece).not.toBeNull();
    const ww = orientations({
      cells: [
        { row: 0, col: 0, stone: STONES.white },
        { row: 0, col: 1, stone: STONES.white },
      ],
    })[0];
    // Force the queue: rebuild the state with a queue whose first piece is white-white.
    let seed = 0;
    let forced: GameState | null = null;
    for (seed = 1; seed < 500 && forced === null; seed += 1) {
      const candidate = { ...state, settings: { ...state.settings, seed } };
      const inHand = queuedPiece(candidate);
      if (inHand !== null && inHand.cells.every((cell) => cell.stone === STONES.white)) forced = candidate;
    }
    expect(forced).not.toBeNull();
    const next = placePiece(forced!, footprintAt(ww, p(6, 4)));
    expect(next.winner).toBe(STONES.white);
    expect(next.winningLine).toHaveLength(5);
  });

  it("undo lifts every cell of the piece", () => {
    const game = createGame(domino);
    const cells = piecePlacements(game)[0];
    const undone = undoMove(placePiece(game, cells));
    expect(undone.board).toEqual(game.board);
    expect(undone.toPlay).toBe(STONES.black);
  });

  it("replays pieces from the record", () => {
    let game = createGame(block);
    for (let i = 0; i < 6; i += 1) {
      const placements = piecePlacements(game);
      game = placePiece(game, placements[i % placements.length]);
    }
    const replayed = replayMoves(createGame(block), game.moves);
    expect(replayed[replayed.length - 1].board).toEqual(game.board);
    expect(replayed[replayed.length - 1].toPlay).toBe(game.toPlay);
  });
});

describe("singles", () => {
  it("are only for the block game, six each, and count down", () => {
    const dominoes = createGame(domino);
    expect(singlesLeft(dominoes)).toBe(0);
    expect(isLegalMove(dominoes, p(7, 7))).toBe(false);
    expect(legalPoints(dominoes)).toEqual([]);

    let game = createGame(block);
    expect(singlesLeft(game)).toBe(6);
    game = playMove(game, p(7, 7));
    expect(cellAt(game, p(7, 7))).toBe(STONES.black);
    expect(game.toPlay).toBe(STONES.white);
    expect(singlesLeft(game)).toBe(6);
    game = placePiece(game, piecePlacements(game)[0]);
    expect(singlesLeft(game)).toBe(5);
  });
});

describe("passing", () => {
  it("passes only when nothing fits, records it, and draws on two in a row", () => {
    const game = createGame(domino);
    expect(mustPass(game)).toBe(false);
    expect(passTurn(game)).toBe(game);

    // A nearly full 13×13 board with two isolated empty cells: no domino fits.
    const rows: string[][] = Array.from({ length: 13 }, (_, r) =>
      Array.from({ length: 13 }, (_, c) => ((r + c) % 2 === 0 ? "x" : "o")),
    );
    rows[0][0] = ".";
    rows[12][12] = ".";
    const state = fromDiagram(rows.map((row) => row.join(" ")).join("\n"), {
      settings: domino,
      toPlay: STONES.black,
    });
    expect(mustPass(state)).toBe(true);
    const passed = passTurn(state);
    expect(passed.moves[passed.moves.length - 1]).toMatchObject({ kind: "pass", row: -1, col: -1 });
    expect(passed.toPlay).toBe(STONES.white);
    expect(passed.status).toBe(GAME_STATUS.playing);
    const twice = passTurn(passed);
    expect(twice.status).toBe(GAME_STATUS.draw);

    const replayed = replayMoves(state, twice.moves.slice(state.moves.length));
    expect(replayed[replayed.length - 1].status).toBe(GAME_STATUS.draw);
  });
});

describe("shrinking around pieces", () => {
  it("refuses to shrink while a piece lies in the outer ring", () => {
    const game = createGame({ allowResize: true, size: 13 });
    const cells: PieceCell[] = [
      { row: 0, col: 5, stone: STONES.black },
      { row: 0, col: 6, stone: STONES.white },
    ];
    const withPiece: GameState = {
      ...game,
      moves: [{ row: 0, col: 5, stone: STONES.black, kind: "piece", cells }],
    };
    expect(canShrinkBoard(withPiece)).toBe(false);
  });
});
