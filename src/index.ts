/**
 * Narabe 並べ: one rules engine for forty-eight abstract board games.
 *
 * Every game is a row of data (`VARIANT_SPECS`), and every function takes a
 * `GameState` and returns a new one. Start with `createGame`, play with
 * `playMove`, `movePiece`, `placePiece`, `twistBoard` or `passTurn`, and ask
 * `turnChoices` what the player to move may do. Records are plain move lists:
 * `replayMoves` and `replayGame` read them back, `undoMove` steps one back.
 *
 * Deeper pieces (each rule module on its own) are reachable by path as well,
 * for example `@johnmorrisdotca/narabe/rules/go`.
 */
export * from "./engine.ts";
export * from "./constants.ts";
export type * from "./types.ts";
export * from "./notation.ts";
export * from "./replay.ts";
export * from "./length.ts";
export { canSkip, canUndo, lastMove, replayMoves, skipMove, skipTarget, undoMove } from "./rules/record.ts";
export { turnChoices } from "./rules/choices.ts";
export { endedWithNoMoves, passesOwed, turnPassedBy } from "./rules/forcedPass.ts";
export { seededRandom } from "./rules/random.ts";
export { leavesNoStone, stonelessWord } from "./rules/stoneless.ts";
