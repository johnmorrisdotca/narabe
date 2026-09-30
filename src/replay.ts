import { createGame } from "./engine.ts";
import { replayMoves } from "./rules/record.ts";
import { DRAW_LIMITS, NO_HANDICAP, NO_HEAD_START } from "./constants.ts";
import type { GameState, Handicap, HeadStart, MoveInput, Stone } from "./types.ts";

/** The stored shape of a game, as both the API and the pages see it. */
export type StoredGame = {
  size: number;
  winLength: number;
  variant: string;
  obstacles: string;
  opener: string;
  opening?: string;
  handicap?: Handicap | null;
  /** The head start, parsed — see `parseHeadStart`. Games stored before head starts had none. */
  headStart?: HeadStart | null;
  seed?: number;
  /** See DrawLimit. Games recorded before it existed carry "none", as they were played. */
  drawLimit?: string;
  /**
   * The clock, or null for none. Required rather than optional: a turn lost to
   * the clock replays only on a record that had one, and a reader that forgot
   * to pass it would cut every such game short at the turn that was lost.
   */
  moveTimeMs: number | null;
  moves: MoveInput[];
};

/**
 * Rebuilds every position a game passed through by replaying its moves.
 *
 * A stored game is a move list, never a board, so this is the only way to read
 * one back — and because it runs the same engine, a replayed game and a live
 * one can never disagree about what is legal or who has won.
 *
 * Swap-opening decisions are not stored, so a game with one replays as though
 * the chooser kept their colour: the stones are the same either way.
 */
export function replayTimeline(game: StoredGame): GameState[] {
  const start = createGame({
    size: game.size,
    winLength: game.winLength,
    variant: game.variant as GameState["settings"]["variant"],
    obstacles: game.obstacles as GameState["settings"]["obstacles"],
    opening: (game.opening ?? "free") as GameState["settings"]["opening"],
    handicap: game.handicap ?? NO_HANDICAP,
    headStart: game.headStart ?? NO_HEAD_START,
    seed: game.seed ?? 0,
    firstPlayer: game.opener as Stone,
    drawLimit: (game.drawLimit ?? DRAW_LIMITS.none) as GameState["settings"]["drawLimit"],
    allowUndo: false,
    allowSwap: false,
  });
  return replayMoves(start, game.moves, [], { clocked: game.moveTimeMs !== null });
}

/** The position as it stands now. */
export function replayGame(game: StoredGame): GameState {
  const timeline = replayTimeline(game);
  return timeline[timeline.length - 1];
}
