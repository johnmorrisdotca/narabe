import { describe, expect, it } from "vitest";

import { createGame, passTurn, playMove } from "../engine.ts";
import { GAME_STATUS, STONES, WIN_REASONS } from "../constants.ts";
import type { GameState } from "../types.ts";
import { areaWinner, groupAt, KOMI, scoreArea, walledIn } from "./go.ts";

const p = (row: number, col: number) => ({ row, col });

describe("go", () => {
  it("captures a group the moment its last liberty is taken", () => {
    // A lone white stone at the centre of a 9x9 board, surrounded on three
    // sides by black with the fourth about to close.
    let game = createGame({ variant: "go", size: 9 });
    game = playMove(game, p(3, 4)); // black
    game = playMove(game, p(4, 4)); // white, the stone about to be captured
    game = playMove(game, p(5, 4)); // black
    game = playMove(game, p(0, 0)); // white, elsewhere
    game = playMove(game, p(4, 3)); // black
    game = playMove(game, p(0, 1)); // white, elsewhere
    // Three of white's four liberties are now black; the fourth closes it.
    game = playMove(game, p(4, 5));

    expect(game.board[4 * 9 + 4]).toBeNull();
    expect(game.captures.black).toBe(1);
    expect(game.toPlay).toBe(STONES.white);
  });

  it("captures a whole connected group at once, not stone by stone", () => {
    const size = 9;
    const board = new Array(size * size).fill(null);
    // A two-stone white group at (4,4)-(4,5), black surrounding every liberty but one.
    board[4 * size + 4] = STONES.white;
    board[4 * size + 5] = STONES.white;
    board[3 * size + 4] = STONES.black;
    board[3 * size + 5] = STONES.black;
    board[5 * size + 4] = STONES.black;
    board[5 * size + 5] = STONES.black;
    board[4 * size + 3] = STONES.black;
    // (4,6) is the last liberty, about to be closed by black.
    const game: GameState = { ...createGame({ variant: "go", size }), board, toPlay: STONES.black };

    const after = playMove(game, p(4, 6));
    expect(after.board[4 * size + 4]).toBeNull();
    expect(after.board[4 * size + 5]).toBeNull();
    expect(after.captures.black).toBe(2);
  });

  it("refuses a suicide move: playing into your own group's last liberty", () => {
    const size = 9;
    const board = new Array(size * size).fill(null);
    // White surrounds a single empty point at (4,4) on all four sides.
    board[3 * size + 4] = STONES.white;
    board[5 * size + 4] = STONES.white;
    board[4 * size + 3] = STONES.white;
    board[4 * size + 5] = STONES.white;
    const game: GameState = { ...createGame({ variant: "go", size }), board, toPlay: STONES.black };

    const after = playMove(game, p(4, 4));
    expect(after, "a move into a fully surrounded point with nothing captured must be refused").toBe(game);
  });

  it("allows a move into what looks like your own last liberty when it captures instead", () => {
    const size = 9;
    const board = new Array(size * size).fill(null);
    // White stone at (4,4) has one liberty left, (4,5); black surrounds the rest.
    board[4 * size + 4] = STONES.white;
    board[3 * size + 4] = STONES.black;
    board[5 * size + 4] = STONES.black;
    board[4 * size + 3] = STONES.black;
    // Black's stone at (4,5) would itself have only (4,4) as a liberty, except
    // that playing there captures the white stone and opens it right back up.
    const game: GameState = { ...createGame({ variant: "go", size }), board, toPlay: STONES.black };

    const after = playMove(game, p(4, 5));
    expect(after, "capturing is legal even though it looks like self-atari before the capture").not.toBe(game);
    expect(after.board[4 * size + 4]).toBeNull();
    expect(after.board[4 * size + 5]).toBe(STONES.black);
  });

  it("forbids the immediate recapture the simple ko rule exists for", () => {
    const size = 9;
    const board = new Array(size * size).fill(null);
    // The classic ko shape at (4,4)/(4,5): black takes one white stone,
    // and white may not retake it on the very next move.
    board[3 * size + 4] = STONES.black;
    board[5 * size + 4] = STONES.black;
    board[4 * size + 3] = STONES.black;
    board[4 * size + 4] = STONES.white;
    board[3 * size + 5] = STONES.white;
    board[5 * size + 5] = STONES.white;
    board[4 * size + 6] = STONES.white;
    const game: GameState = { ...createGame({ variant: "go", size }), board, toPlay: STONES.black };

    const captured = playMove(game, p(4, 5));
    expect(captured.board[4 * size + 4]).toBeNull();
    expect(captured.koPoint).toEqual(p(4, 4));

    // White may not retake at (4,4) this move.
    const retaken = playMove(captured, p(4, 4));
    expect(retaken, "the ko point must be refused for one move").toBe(captured);

    // But playing anywhere else lifts the restriction for next time.
    const elsewhere = playMove(captured, p(0, 0));
    expect(elsewhere.koPoint).toBeNull();
  });

  it("ends the game on two passes in a row and scores by area", () => {
    // Black owns the whole board; white has nothing. Two passes end it at once.
    let game = createGame({ variant: "go", size: 9 });
    game = passTurn(game);
    expect(game.status).toBe(GAME_STATUS.playing);
    game = passTurn(game);
    expect(game.status).toBe(GAME_STATUS.won);
    expect(game.winBy).toBe(WIN_REASONS.territory);
    // An empty board is nobody's territory (it borders no colour at all), so
    // with nothing on the board the only thing deciding it is komi: white's.
    expect(game.winner).toBe(STONES.white);
  });

  it("scores stones on the board plus fully-surrounded empty territory, and nothing that borders both", () => {
    const size = 9;
    const board = new Array(size * size).fill(null);
    // A black wall down column 3 and a white wall down column 5, with the
    // empty column between them touching both colours — dame, nobody's.
    for (let row = 0; row < size; row += 1) {
      board[row * size + 3] = STONES.black;
      board[row * size + 5] = STONES.white;
    }
    const score = scoreArea(board, size);
    // The wall itself (9) plus columns 0-2 (27), entirely enclosed by it: 36.
    expect(score.black).toBe(9 + 3 * size);
    // The same on white's side, columns 6-8.
    expect(score.white).toBe(9 + 3 * size);
    // Column 4 — nine points touching both walls — counts for neither.
    expect(score.black + score.white).toBe(size * size - size);
    expect(areaWinner(board, size, KOMI)).toBe(
      score.black > score.white + KOMI ? "black" : "white",
    );
  });

  it("finds a group's stones and liberties as one connected unit", () => {
    const size = 9;
    const board = new Array(size * size).fill(null);
    board[0 * size + 0] = STONES.black;
    board[0 * size + 1] = STONES.black;
    board[1 * size + 0] = STONES.black;
    const group = groupAt(board, size, p(0, 0));
    expect(group.stones).toHaveLength(3);
    // Liberties: (0,2), (1,1), (2,0) — three empty points touching the group, none double-counted.
    expect(group.liberties.size).toBe(3);
  });
});

describe("walled-in ground", () => {
  const size = 5;
  const empty = (): (string | null)[] => Array.from({ length: size * size }, () => null);

  it("is the empty region a colour's stones alone border", () => {
    // Black walls off the top-left corner point (0,0) with stones on (0,1) and (1,0).
    const board = empty();
    board[1] = STONES.black;
    board[5] = STONES.black;
    board[24] = STONES.white;
    const black = walledIn(board as never, size, STONES.black);
    expect([...black]).toEqual([0]);
    expect(walledIn(board as never, size, STONES.white).has(0)).toBe(false);
  });

  it("is nobody's while the other colour touches it", () => {
    const board = empty();
    board[1] = STONES.black;
    board[5] = STONES.black;
    board[6] = STONES.white;
    // The big open region touches both; only the corner is Black's.
    expect(walledIn(board as never, size, STONES.black).has(12)).toBe(false);
  });

  it("is nothing at all on an empty board", () => {
    expect(walledIn(empty() as never, size, STONES.black).size).toBe(0);
  });
});
