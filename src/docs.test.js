// The documents that are made from the source, or that quote it, checked against it.
// Plain JavaScript, so that reading files needs no Node types. `pnpm docs:make` rewrites what is made.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { CLI_STRINGS, runCli } from "./cli.ts";
import * as draw from "./draw.ts";
import * as narabe from "./index.ts";
import * as react from "./react.ts";
import { NARABE_VERSION } from "./version.ts";

const { ALL_BOARD_SIZES, OPENING_RULE_LIST, RULE_VARIANT_LIST, SEED_RANGE, VARIANT_SPECS, createGame, playMove, pointName, replayMoves, turnChoices } = narabe;

const readme = readFileSync("README.md", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const cell = (text) => text.replace(/\\\|/g, "|").trim();

/** The rows of the table whose header line is `header`: each row's cells. */
function table(header, doc = readme) {
  const from = doc.indexOf(header);
  if (from < 0) throw new Error(`no “${header}”`);
  const rows = [];
  for (const line of doc.slice(from).split("\n")) {
    if (line.startsWith("|")) rows.push(line.split(/(?<!\\)\|/).slice(1, -1).map(cell));
    else if (rows.length > 0) break;
  }
  return rows.slice(2);
}

/** The text of a section: from its heading to the next of the same level. */
const section = (heading) => {
  const from = readme.indexOf(`\n${heading}\n`);
  if (from < 0) throw new Error(`no “${heading}”`);
  const level = heading.match(/^#+/)[0];
  const rest = readme.slice(from + heading.length + 2);
  const next = rest.search(new RegExp(`^${level} `, "m"));
  return next < 0 ? rest : rest.slice(0, next);
};

/** A line of a README example, as written. */
const says = (code) => expect(readme, code).toContain(code);

describe("how many games", () => {
  it("is what the README, its badge and the package description say", () => {
    expect(RULE_VARIANT_LIST).toHaveLength(48);
    expect(Object.keys(VARIANT_SPECS)).toHaveLength(48);
    expect(readme).toContain("One rules engine for forty-eight abstract board games.");
    expect(readme).toContain('<img alt="48 games" src="https://img.shields.io/badge/games-48-b3361f">');
    expect(pkg.description).toContain("forty-eight");
    expect(readme).toContain("| Games | 48 | `RULE_VARIANT_LIST` |");
  });

  it("the table of games names every game once, by its key, and nothing else", () => {
    const rows = table("| Family | Games |");
    const keys = rows.flatMap((row) => [...row[1].matchAll(/\(`(\w+)`\)/g)].map((match) => match[1]));
    expect(keys.sort()).toEqual([...RULE_VARIANT_LIST].sort());
    expect(new Set(keys).size).toBe(48);
  });

  it("the hand-typed counts of the features are the engine's own", () => {
    expect(OPENING_RULE_LIST.filter((opening) => opening !== "free")).toHaveLength(7);
    expect(readme.replace(/\s+/g, " ")).toContain("seven opening protocols (pro, long pro, swap, swap2, RIF, Sakata, Tarannikov)");
    expect(Object.values(VARIANT_SPECS).filter((spec) => spec.checkers)).toHaveLength(6);
    expect(readme).toContain("checkers and five draughts rule sets");
  });

  it("the tests the README calls hundreds are hundreds", () => {
    expect(readme).toContain("Hundreds of tests in all.");
    expect(readme).not.toMatch(/\b\d{3,} tests\b/);
    const files = readdirSync("src", { recursive: true }).filter((path) => /\.test\.(ts|js)$/.test(path));
    const cases = files.reduce((sum, path) => sum + (readFileSync(`src/${path}`, "utf8").match(/^\s*it\(/gm) ?? []).length, 0);
    expect(cases).toBeGreaterThanOrEqual(300);
  });
});

describe("the README's examples", () => {
  it("the engine-alone example comes to what its comments say", () => {
    let game = createGame({ variant: narabe.RULE_VARIANTS.renju, size: 15 });
    game = playMove(game, { row: 7, col: 7 });
    says('game.toPlay;                                 // "white"');
    expect(game.toPlay).toBe("white");
    game = playMove(game, { row: 7, col: 8 });
    says('game.toPlay;                                 // "black"');
    says('game.status;                                 // "playing"');
    says('pointName(15, { row: 7, col: 7 });           // "H8"');
    says("playMove(game, { row: 7, col: 7 }) === game; // true: an occupied point changes nothing");
    expect([game.toPlay, game.status, pointName(15, { row: 7, col: 7 }), playMove(game, { row: 7, col: 7 }) === game]).toEqual(["black", "playing", "H8", true]);
  });

  it("the pieces-that-move example answers as it says", () => {
    const choices = turnChoices(createGame({ variant: "checkers" }));
    says('// { kind: "move", pieces: [{ row: 2, col: 1 }, …], count: 7, narrowedBy: null }');
    expect(choices).toMatchObject({ kind: "move", count: 7, narrowedBy: null });
    expect(choices.pieces[0]).toEqual({ row: 2, col: 1 });
  });

  it("a game read back from its record is the game that was played", () => {
    let game = createGame({ variant: "renju", size: 15 });
    game = playMove(playMove(game, { row: 7, col: 7 }), { row: 7, col: 8 });
    const record = game.moves.map(({ row, col, kind }) => ({ row, col, kind }));
    const positions = replayMoves(createGame(game.settings), record);
    expect(positions.at(-1).board).toEqual(game.board);
    expect(positions).toHaveLength(3);
  });

  it("the install lines name the package, and no longer say anything about Node 20", () => {
    says("npm install @johnmorrisdotca/narabe");
    expect(readme).not.toMatch(/Node 20/);
    expect(readme).toContain("npx @johnmorrisdotca/narabe play hex --size 11 --seed 7");
  });

  it("every entry point the README names is in package.json, and every explicit one is named", () => {
    for (const key of Object.keys(pkg.exports).filter((one) => one !== "." && !one.includes("*"))) expect(readme, key).toContain(`@johnmorrisdotca/narabe/${key.slice(2)}`);
    for (const name of readme.match(/@johnmorrisdotca\/narabe\/[\w/-]+/g) ?? []) {
      const path = name.replace("@johnmorrisdotca/narabe/", "");
      // A named entry, or a file reached by path through the wildcard.
      expect(pkg.exports[`./${path}`] !== undefined || pkg.exports["./*"] !== undefined, name).toBe(true);
    }
    expect(pkg.exports["./draw"].default).toBe("./dist/draw.js");
  });

  it("the names in the API section are real exports", () => {
    const real = new Set([...Object.keys(narabe), ...Object.keys(react), ...Object.keys(draw)]);
    const api = section("## API").replace(/\/\/.*$/gm, "");
    const calls = new Set([...api.matchAll(/(?<![\w.])([a-z][A-Za-z]+)(?=\()/g)].map((match) => match[1]));
    // The members of what the hook returns are not exports of their own.
    const members = new Set(["play", "move", "place", "twist", "pass", "undo", "reset"]);
    for (const name of calls) if (!members.has(name)) expect(real.has(name), `${name} is in the API section and not exported`).toBe(true);
    expect(calls.size).toBeGreaterThan(40);
  });
});

describe("the README's Limits", () => {
  const rows = table("| Limit | Value | Constant |");
  const named = (start) => rows.find((row) => row[0].startsWith(start));

  it("are the engine's own", () => {
    expect(named("Board sides")[1]).toBe(`${ALL_BOARD_SIZES[0]} to ${ALL_BOARD_SIZES.at(-1)}; each game offers some of them`);
    for (const game of RULE_VARIANT_LIST) for (const size of narabe.boardSizesFor(game)) expect(ALL_BOARD_SIZES, game).toContain(size);
    expect(named("A seed")[1]).toBe(`a whole number below ${SEED_RANGE.toLocaleString("en-US")}, when the engine draws one`);
    expect(named("The command line's seed")[1]).toBe("a whole number from 0 to 2,147,483,647");
    expect(runCli(["board", "renju", "--seed", "2147483647"]).code).toBe(0);
    expect(runCli(["board", "renju", "--seed", "2147483648"]).code).toBe(2);
    expect(named("The command line's `--games`")[1]).toBe("1 to 10,000");
    expect(runCli(["simulate", "tictactoe", "--games", "10000"]).code).toBe(0);
    expect(runCli(["simulate", "tictactoe", "--games", "10001"]).code).toBe(2);
    expect(named("Opening protocols")[1]).toBe("7");
  });

  it("every constant it names exists", () => {
    for (const row of rows) for (const name of row[2].match(/`([A-Z][A-Z_]+)`/g) ?? []) expect(Object.keys(narabe), name).toContain(name.replaceAll("`", ""));
  });

  it("a game that is not offered a board size is not drawn on it by the command line", () => {
    expect(runCli(["play", "halma", "--size", "9"]).code).toBe(2);
    expect(runCli(["board", "halma", "--size", "8"]).code).toBe(0);
  });
});

describe("the README's theming", () => {
  it("lists the variables the drawing uses, and every one it uses", () => {
    const code = readFileSync("src/draw.ts", "utf8");
    const used = new Set([...code.matchAll(/--nb-([a-z-]+)/g)].map((match) => `--nb-${match[1]}`));
    // The palette is named in camel case and written in kebab case: read the table of colours too.
    const palette = code.slice(code.indexOf("const PALETTE"), code.indexOf("} as const;"));
    for (const [, name] of palette.matchAll(/^\s+(\w+):/gm)) used.add(`--nb-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
    const listed = new Set(section("## Theming").match(/--nb-[\w-]+/g));
    expect([...listed].sort()).toEqual([...used].sort());
    expect(draw.boardSvg(createGame({ variant: "hex", size: 11 }))).toContain("var(--nb-wood, ");
  });
});

describe("the README's command line", () => {
  const usage = CLI_STRINGS.en.usage;

  it("lists the options and commands the help does", () => {
    const rows = table("| Command or option | What it does |").map((row) => row[0]);
    const flags = [...usage.matchAll(/^\s+(?:-\w, )?(--[\w-]+)/gm)].map((match) => match[1]);
    for (const flag of flags.filter((one) => one !== "--help" && one !== "--version")) expect(rows.join(" "), flag).toContain(flag);
    for (const command of ["games", "board", "play", "replay", "simulate"]) expect(rows.join(" ")).toContain(`\`${command}`);
  });

  it("the two helps list the same options, commands and examples, in the same order", () => {
    const options = (text) => [...text.matchAll(/^\s+(?:-\w, )?(--[\w-]+)/gm)].map((match) => match[1]);
    expect(options(CLI_STRINGS.ja.usage)).toEqual(options(CLI_STRINGS.en.usage));
    const examples = (text) => text.split("\n").filter((line) => line.startsWith("  narabe "));
    expect(examples(CLI_STRINGS.ja.usage)).toEqual(examples(CLI_STRINGS.en.usage));
    const commands = (text) => [...text.matchAll(/^ {2}(games|board|play|replay|simulate)\b/gm)].map((match) => match[1]);
    expect(commands(CLI_STRINGS.ja.usage)).toEqual(commands(CLI_STRINGS.en.usage));
  });

  it("the commands in the README run", () => {
    for (const line of readme.match(/^npx @johnmorrisdotca\/narabe (games|board|play|simulate)\b.*$/gm)) {
      const words = line.replace(/\s+#.*$/, "").replace(/ > \S+$/, "").split(" ").slice(2);
      const ran = runCli(words);
      expect(ran.code, line).toBe(0);
    }
    const record = runCli(["play", "hex", "--size", "11", "--seed", "7", "--record"]).out;
    expect(runCli(["replay", "hex.json"], { readFile: () => record }).code).toBe(0);
    expect(runCli(["board", "renju", "--size", "9"]).out.split("\n")[0]).toBe("  A B C D E F G H J");
  });
});

describe("docs/strings-ja.md", () => {
  const escape = (text) => text.replaceAll("|", "\\|").replaceAll("\n", "<br>");
  const keys = Object.keys(CLI_STRINGS.en).filter((key) => key !== "usage");
  const lines = [
    "# Narabe's command line, in English and Japanese",
    "",
    "Made from `src/cli.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.",
    "The engine itself holds no words for people: names, rules text and pictures belong to the app that shows the games.",
    "",
    "**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please",
    "open a *Fix a translation* issue with the string's name. `{n}`, `{seed}` and the other braces are filled in when shown.",
    "",
    "| Name | English | Japanese |",
    "| --- | --- | --- |",
    ...keys.map((key) => `| \`${key}\` | ${escape(CLI_STRINGS.en[key])} | ${escape(CLI_STRINGS.ja[key])} |`),
    "",
    "## The help",
    "",
    "`usage`, in English:",
    "",
    "```",
    CLI_STRINGS.en.usage.trimEnd(),
    "```",
    "",
    "and in Japanese:",
    "",
    "```",
    CLI_STRINGS.ja.usage.trimEnd(),
    "```",
    "",
  ];
  const made = lines.join("\n");

  it("is what the source makes: run `pnpm docs:make` after changing a string", () => {
    if (process.env.UPDATE_DOCS === "1") writeFileSync("docs/strings-ja.md", made);
    expect(readFileSync("docs/strings-ja.md", "utf8")).toBe(made);
  });

  it("has a Japanese line for every English one, and keeps every place to fill in", () => {
    expect(Object.keys(CLI_STRINGS.ja)).toEqual(Object.keys(CLI_STRINGS.en));
    const places = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
    for (const key of Object.keys(CLI_STRINGS.en)) {
      expect(CLI_STRINGS.ja[key].trim(), key).not.toBe("");
      if (!["gameLine"].includes(key)) expect(CLI_STRINGS.ja[key], key).not.toBe(CLI_STRINGS.en[key]);
      expect(places(CLI_STRINGS.ja[key]), key).toEqual(places(CLI_STRINGS.en[key]));
    }
  });
});

describe("the version", () => {
  it("is package.json's, and the changelog has it", () => {
    expect(NARABE_VERSION).toBe(pkg.version);
    expect(readFileSync("CHANGELOG.md", "utf8")).toContain(`## [${NARABE_VERSION}]`);
  });
});

describe("package.json", () => {
  it("names built files directly, and ships what it names", () => {
    const pointed = [pkg.main, pkg.module, pkg.types, ...Object.values(pkg.bin), ...Object.values(pkg.exports).flatMap((entry) => Object.values(entry))];
    for (const file of pointed) expect(/^\.?\/?(dist|bin)\//.test(file), file).toBe(true);
    expect(pkg.dependencies).toBeUndefined();
    for (const file of ["dist", "src", "bin"]) expect(pkg.files).toContain(file);
  });

  it("has keywords that are many, lower case and not repeated, and a description that fits", () => {
    expect(pkg.keywords.length).toBeGreaterThan(30);
    expect(new Set(pkg.keywords).size).toBe(pkg.keywords.length);
    for (const word of pkg.keywords) expect(word).toBe(word.toLowerCase());
    expect(pkg.description.length).toBeGreaterThan(200);
    expect(pkg.description.length).toBeLessThanOrEqual(350);
  });
});

describe("the family's look", () => {
  const css = readFileSync("demo/family.css", "utf8");

  it("demo/family.css is the family's file, byte for byte: never edit it here", () => {
    const [first, ...rest] = css.split("\n");
    const hash = createHash("sha256").update(rest.join("\n")).digest("hex");
    expect(first).toBe(`/* sha256 of every line after this one: ${hash} */`);
    expect(hash).toBe("c1e392564a7fd94d0bb5cfaefb6d4fedfd147fc3e27f3a7afd8d8dac8c94a227");
  });

  it("scripts/family-template.mjs is the family's file too", () => {
    expect(createHash("sha256").update(readFileSync("scripts/family-template.mjs")).digest("hex")).toBe("38bd7b252045af5bac9ac40b873fdac3d0981ad29a3afc1dff88d5d0df0645b4");
  });

  it("the site script uses the family's header and footer", () => {
    const site = readFileSync("scripts/site.mjs", "utf8");
    for (const part of ["familyHead(", "familyHeader(", "familyUnreviewed(", "familyFooter(", "FAMILY_SCRIPT", 'href="family.css"', 'href="site.css"']) expect(site).toContain(part);
    expect(site.indexOf('href="family.css"')).toBeLessThan(site.indexOf('href="site.css"'));
  });
});
