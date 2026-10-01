import { describe, expect, it } from "vitest";

import { boardText, cliLanguage, runCli } from "./cli.ts";
import { RULE_VARIANT_LIST, boardSizesFor } from "./constants.ts";
import { createGame } from "./engine.ts";
import { NARABE_VERSION } from "./version.ts";

describe("the command line", () => {
  it("says its version and its help, and the help is the default", () => {
    expect(runCli(["--version"])).toEqual({ code: 0, out: `${NARABE_VERSION}\n`, err: "" });
    expect(runCli(["-h"]).out).toMatch(/^Usage: narabe/);
    expect(runCli([]).out).toBe(runCli(["--help"]).out);
  });

  it("lists every game, with the boards it is played on", () => {
    const listed = runCli(["games"]).out.trim().split("\n");
    expect(listed).toHaveLength(RULE_VARIANT_LIST.length);
    const data = JSON.parse(runCli(["games", "--json"]).out);
    expect(data.games.map((game: { game: string }) => game.game)).toEqual([...RULE_VARIANT_LIST]);
    for (const game of data.games) {
      expect(game.sizes).toEqual([...boardSizesFor(game.game)]);
      expect(game.size).toBe(createGame({ variant: game.game }).settings.size);
      if (game.sizes.length > 0) expect(game.sizes).toContain(game.size);
    }
  });

  it("draws a board as text: the same cells the engine holds", () => {
    const state = createGame({ variant: "renju", size: 9, seed: 0 });
    const text = boardText(state);
    expect(text.split("\n")).toHaveLength(11);
    expect(text.split("\n")[0]).toBe("  A B C D E F G H J");
    expect(runCli(["board", "renju", "--size", "9"]).out).toBe(text);
    expect(runCli(["board", "Renju", "--size", "9"]).out).toBe(text);
    const withStones = createGame({ variant: "reversi", seed: 0 });
    expect((boardText(withStones).match(/[XO]/g) ?? []).length).toBe(withStones.board.filter((cell) => cell === "black" || cell === "white").length);
  });

  it("plays the same game for the same seed, and says a fresh seed when it drew one", () => {
    const a = runCli(["play", "renju", "--size", "9", "--seed", "7"]);
    expect(a.out).toBe(runCli(["play", "renju", "--size", "9", "-s", "7"]).out);
    expect(a.out).toMatch(/^renju on 9 by 9, seed 7: \d+ moves\.\n/);
    const fresh = runCli(["play", "renju", "--size", "9"], { seed: () => 7 });
    expect(fresh.err).toBe("narabe: seed 7 (pass --seed 7 to repeat this)\n");
    expect(fresh.out).toBe(a.out);
    expect(runCli(["play", "renju", "--size", "9", "--json"], { seed: () => 7 }).err).toBe("");
  });

  it("reads a game back through the engine to the same position, whatever the game", () => {
    for (const game of RULE_VARIANT_LIST) {
      const recorded = runCli(["play", game, "--seed", "5", "--record"]);
      expect(recorded.code, game).toBe(0);
      const played = runCli(["play", game, "--seed", "5"]).out;
      const replayed = runCli(["replay", "game.json"], { readFile: () => recorded.out });
      expect(replayed.code, game).toBe(0);
      const board = (text: string) => text.split("\n").slice(1, -2).join("\n");
      expect(board(replayed.out), game).toBe(board(played));
    }
  });

  it("refuses a record the engine cannot play out, and one that is not a record", () => {
    const record = JSON.parse(runCli(["play", "tictactoe", "--seed", "3", "--record"]).out);
    record.moves[1] = { ...record.moves[0] };
    expect(runCli(["replay", "x"], { readFile: () => JSON.stringify(record) })).toMatchObject({ code: 1, out: "" });
    expect(runCli(["replay", "--stdin"], { stdin: "not json" }).code).toBe(1);
    expect(runCli(["replay", "--stdin"], { stdin: JSON.stringify({ settings: { variant: "chess" }, moves: [] }) }).code).toBe(1);
    expect(runCli(["replay", "x"], { readFile: () => null }).code).toBe(1);
    expect(runCli(["replay"]).code).toBe(2);
  });

  it("counts how random games ended, and the counts add up", () => {
    const data = JSON.parse(runCli(["simulate", "reversi", "--games", "20", "--seed", "1", "--json"]).out);
    expect(data.black + data.white + data.drawn + data.open).toBe(20);
    expect(data.longest).toBeGreaterThan(0);
    expect(runCli(["simulate", "reversi", "--games", "20", "--seed", "1"]).out).toMatch(/^reversi, 20 random games on 8 by 8 from seed 1: Black won \d+, White won \d+/);
  });

  it("refuses what is wrong, with exit code 2, and says so in the language asked for", () => {
    expect(runCli(["--bogus"])).toMatchObject({ code: 2, out: "" });
    expect(runCli(["play", "renju", "--size", "8"]).code).toBe(2);
    expect(runCli(["play", "renju", "--seed", "-1"]).code).toBe(2);
    expect(runCli(["simulate", "renju", "--games", "0"]).code).toBe(2);
    expect(runCli(["play", "--seed"]).err).toMatch(/--seed needs a value/);
    expect(runCli(["dance"]).err).toMatch(/“dance” is not a command/);
    expect(runCli(["play", "chess"])).toMatchObject({ code: 1, out: "" });
    expect(runCli(["--bogus", "--lang", "ja"]).err).toMatch(/^narabe: 不明なオプションです: --bogus/);
    expect(runCli(["games", "--lang", "fr"]).code).toBe(2);
  });

  it("chooses a language: the flag, then the environment, then the system", () => {
    expect(cliLanguage("ja")).toBe("ja");
    expect(cliLanguage(undefined, { LC_ALL: "ja_JP.UTF-8", LANG: "en_US" })).toBe("ja");
    expect(cliLanguage(undefined, { LANG: "C" }, "ja-JP")).toBe("ja");
    expect(cliLanguage(undefined, {})).toBe("en");
    expect(runCli(["play", "renju", "--size", "9", "--seed", "7", "--lang", "ja"]).out).toMatch(/^renju 9×9、シード 7: \d+手。/);
  });
});
