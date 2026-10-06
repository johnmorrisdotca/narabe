// Packs the package the way it is published (`npm pack`, npm and not pnpm),
// installs the tarball into an empty project, and uses it as somebody who
// installed it would: every entry in `exports` imported by ESM and loaded by
// `require`, and each command in `bin` run. A package whose `exports` name a
// file that is not in the tarball fails here, before it can be published.
// `pnpm test:package` builds first.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const windows = process.platform === "win32";
const scratch = mkdtempSync(join(tmpdir(), "narabe-package-"));

/** Run a command and hand back what it printed. On Windows, npm and the installed commands are .cmd files, which only a shell runs; node itself is run directly. */
function run(command, args, cwd, viaShell = false) {
  const shell = viaShell && windows;
  // A path is quoted for the shell; a bare name such as npm is left for the shell to find.
  const ran = spawnSync(shell && /[\\/]/.test(command) ? `"${command}"` : command, args, { cwd, encoding: "utf8", shell });
  if (ran.status !== 0) {
    console.error(`FAIL ${command} ${args.join(" ")}\n${ran.stdout}\n${ran.stderr}`);
    process.exit(1);
  }
  return ran.stdout;
}

// 1. Pack, with npm.
const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", scratch], root, true));
const tarball = join(scratch, packed[0].filename);
const inTarball = new Set(packed[0].files.map((file) => file.path));
console.log(`ok   npm pack: ${packed[0].filename}, ${packed[0].files.length} files`);
// The README's pictures are in docs/images, for GitHub and npm to show by address, and are never in what is installed.
const shipped = [...inTarball].filter((file) => file.startsWith("docs/") || /\.(webp|png|jpe?g|gif)$/.test(file));
if (shipped.length > 0) {
  console.error(`FAIL the tarball holds pictures or docs: ${shipped.join(", ")}`);
  process.exit(1);
}
console.log("ok   no picture and nothing from docs/ is in the tarball");

// 2. Everything package.json points at is in the tarball.
const pointed = [pkg.main, pkg.module, pkg.types, ...Object.values(pkg.bin ?? {}), ...Object.values(pkg.exports).flatMap((entry) => (typeof entry === "string" ? [entry] : Object.values(entry)))].filter((file) => file !== undefined && !file.includes("*"));
for (const file of new Set(pointed)) {
  if (!inTarball.has(file.replace(/^\.\//, ""))) {
    console.error(`FAIL package.json points at ${file}, which is not in the tarball`);
    process.exit(1);
  }
}
console.log(`ok   every file package.json points at is in the tarball (${new Set(pointed).size})`);

for (const named of pkg.files) {
  if (![...inTarball].some((file) => file === named || file.startsWith(`${named}/`))) {
    console.error(`FAIL package.json's files names ${named}, which is not in the tarball`);
    process.exit(1);
  }
}
console.log(`ok   everything in package.json's files is in the tarball (${pkg.files.length})`);

// 3. Install it into an empty project, with the one optional peer its React entry needs.
const project = join(scratch, "project");
mkdirSync(project);
writeFileSync(join(project, "package.json"), JSON.stringify({ name: "scratch", private: true, version: "0.0.0" }));
run("npm", ["install", "--no-audit", "--no-fund", "--silent", tarball, "react"], project, true);
console.log("ok   npm install of the tarball");

// 4. Every entry in `exports`, by ESM and by require.
// The wildcard (`./*`) is a way to reach any file of the package by path: it is tried by name below, not listed.
const entries = Object.keys(pkg.exports).filter((key) => !key.includes("*")).map((key) => (key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`));
const deep = [`${pkg.name}/rules/go`, `${pkg.name}/version`];
writeFileSync(
  join(project, "esm.mjs"),
  `${entries.map((entry, i) => `import * as m${i} from ${JSON.stringify(entry)};`).join("\n")}
const all = [${entries.map((_, i) => `m${i}`).join(", ")}];
const names = ${JSON.stringify(entries)};
all.forEach((m, i) => { if (Object.keys(m).length === 0) throw new Error(names[i] + " exports nothing"); });
const { GAME_STATUS, RULE_VARIANT_LIST, createGame, playMove, pointName, replayMoves } = m0;
if (RULE_VARIANT_LIST.length === 0) throw new Error("no games");
let game = createGame({ variant: "renju", size: 15, seed: 1 });
for (const [row, col] of [[7, 7], [7, 8], [8, 8], [8, 9]]) game = playMove(game, { row, col });
if (game.moves.length !== 4 || game.toPlay !== "black" || game.status !== GAME_STATUS.playing) throw new Error("four moves of renju came out differently");
if (pointName(15, { row: 7, col: 7 }) !== "H8") throw new Error("pointName");
if (replayMoves(createGame(game.settings), game.moves.map(({ row, col, kind }) => ({ row, col, kind }))).at(-1).board.join() !== game.board.join()) throw new Error("the record did not replay to the same board");
if (typeof all[names.indexOf(${JSON.stringify(pkg.name + "/react")})].useNarabe !== "function") throw new Error("the React entry lacks its hook");
for (const deep of ${JSON.stringify(deep)}) { const m = await import(deep); if (Object.keys(m).length === 0) throw new Error(deep + " exports nothing"); }
if ((await import(${JSON.stringify(pkg.name + "/version")})).NARABE_VERSION !== ${JSON.stringify(pkg.version)}) throw new Error("NARABE_VERSION is not package.json's");
console.log(names.concat(${JSON.stringify(deep)}).join(" "));
`,
);
writeFileSync(
  join(project, "cjs.cjs"),
  `const names = ${JSON.stringify(entries)};
for (const name of names) { const m = require(name); if (Object.keys(m).length === 0) throw new Error(name + " exports nothing"); }
const { createGame, playMove } = require(${JSON.stringify(pkg.name)});
const game = playMove(createGame({ variant: "renju", size: 15, seed: 1 }), { row: 7, col: 7 });
if (game.moves.length !== 1) throw new Error("a move of renju was not made");
console.log(names.join(" "));
`,
);
console.log(`ok   import:  ${run(process.execPath, ["esm.mjs"], project).trim()}`);
console.log(`ok   require: ${run(process.execPath, ["cjs.cjs"], project).trim()}`);

// 5. Each command in `bin`, as installed.
for (const name of Object.keys(pkg.bin ?? {})) {
  const command = join(project, "node_modules", ".bin", windows ? `${name}.cmd` : name);
  const version = run(command, ["--version"], project, true).trim();
  if (version !== pkg.version) {
    console.error(`FAIL ${name} --version said ${version}`);
    process.exit(1);
  }
  const played = JSON.parse(run(command, ["play", "renju", "--size", "9", "--seed", "7", "--json"], project, true));
  if (played.moves !== 52 || played.winner !== "white" || played.winBy !== "line") {
    console.error(`FAIL ${name} played ${JSON.stringify({ moves: played.moves, winner: played.winner })}`);
    process.exit(1);
  }
  console.log(`ok   ${name} --version and a seeded game of renju, as installed`);
}

rmSync(scratch, { recursive: true, force: true });
console.log("the package installs and runs as published, on", process.platform, process.version);
