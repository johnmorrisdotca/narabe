/**
 * `useNarabe`, a React hook over the engine: one game's state and the moves a
 * board can make on it. It adds no rule of its own; every action is the
 * engine function of the same name, and an illegal one leaves the state as it
 * was, exactly as the engine does.
 *
 * Drawing the board is left to you, because every app draws its boards its own
 * way. The demo in this repository draws one in plain SVG.
 */
import { useCallback, useMemo, useState } from "react";

import { createGame, movePiece, passTurn, placePiece, playMove, twistBoard } from "./engine.ts";
import { canUndo, undoMove } from "./rules/record.ts";
import { turnChoices } from "./rules/choices.ts";
import type { GameSettings, GameState, MoveKind, PieceCell, Point, Stone, TurnChoices } from "./types.ts";

export type NarabeGame = {
  /** The game as it stands. A new object after every move that changed it. */
  state: GameState;
  /** What the player to move may do, or null when there is no set of moves to show. See `turnChoices`. */
  choices: TurnChoices | null;
  /** Places a stone at `point`: `playMove`. `colour` is for the games where the mover chooses it. */
  play: (point: Point, kind?: MoveKind, colour?: Stone | null) => void;
  /** Moves a piece: `movePiece`. */
  move: (from: Point, to: Point) => void;
  /** Lays a queued piece on these cells: `placePiece`. */
  place: (cells: readonly PieceCell[]) => void;
  /** Turns a quadrant to finish a twist game's move: `twistBoard`. */
  twist: (quadrant: number, clockwise: boolean) => void;
  /** Passes the turn where the rules allow it: `passTurn`. */
  pass: () => void;
  /** Takes back the last move, where there is one to take back. */
  undo: () => void;
  canUndo: boolean;
  /** Starts again, with these settings or the ones this game began with. */
  reset: (settings?: Partial<GameSettings>) => void;
};

/**
 * One game, kept in React state.
 *
 * `settings` is read when the hook first runs and again on `reset`; give it a
 * `seed` for a game that starts the same way every time.
 */
export function useNarabe(settings: Partial<GameSettings> = {}): NarabeGame {
  const [start] = useState(() => settings);
  const [state, setState] = useState<GameState>(() => createGame(start));

  const play = useCallback(
    (point: Point, kind?: MoveKind, colour?: Stone | null) => setState((now) => playMove(now, point, kind, colour ?? null)),
    [],
  );
  const move = useCallback((from: Point, to: Point) => setState((now) => movePiece(now, from, to)), []);
  const place = useCallback((cells: readonly PieceCell[]) => setState((now) => placePiece(now, cells)), []);
  const twist = useCallback((quadrant: number, clockwise: boolean) => setState((now) => twistBoard(now, quadrant, clockwise)), []);
  const pass = useCallback(() => setState((now) => passTurn(now)), []);
  const undo = useCallback(() => setState((now) => (canUndo(now) ? undoMove(now) : now)), []);
  const reset = useCallback((next?: Partial<GameSettings>) => setState(createGame(next ?? start)), [start]);
  const choices = useMemo(() => turnChoices(state), [state]);

  return { state, choices, play, move, place, twist, pass, undo, canUndo: canUndo(state), reset };
}
