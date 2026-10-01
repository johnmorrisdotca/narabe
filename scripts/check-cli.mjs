// Runs the built command line as a person would: as a child process, on
// whatever system this is. `pnpm test:cli` builds first. The rules of the
// command line are tested as plain data in src/cli.test.ts; this is the part
// only a real process can show: the exit code, the two streams, standard
// input, the environment.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin", "narabe.mjs");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
// An environment with no language of its own, so each case says what it means.
const bare = { ...process.env, LC_ALL: "", LC_MESSAGES: "", LANG: "en_US.UTF-8", NO_COLOR: "" };

let failed = 0;
function check(what, args, want, { input, env } = {}) {
  const ran = spawnSync(process.execPath, [bin, ...args], { input, encoding: "utf8", env: { ...bare, ...env } });
  const got = { code: ran.status, out: ran.stdout, err: ran.stderr };
  const problems = [];
  if (want.code !== undefined && got.code !== want.code) problems.push(`exit code ${got.code}, wanted ${want.code}`);
  for (const stream of ["out", "err"]) {
    const wanted = want[stream];
    if (wanted === undefined) continue;
    const ok = wanted instanceof RegExp ? wanted.test(got[stream]) : typeof wanted === "function" ? wanted(got[stream]) : got[stream] === wanted;
    if (!ok) problems.push(`${stream} was ${JSON.stringify(got[stream])}, wanted ${wanted instanceof RegExp ? wanted : JSON.stringify(wanted)}`);
  }
  if (problems.length > 0) failed += 1;
  console.log(`${problems.length === 0 ? "ok  " : "FAIL"} ${what}${problems.map((p) => `\n       ${p}`).join("")}`);
  return got;
}

check("the version", ["--version"], { code: 0, out: `${version}\n`, err: "" });
check("help", ["--help"], { code: 0, out: /^Usage: narabe/, err: "" });
check("nothing asked for is the help", [], { code: 0, out: /^Usage: narabe/, err: "" });
check("the games", ["games"], { code: 0, out: /^freestyle +boards 9 13 15 19, 15 by default\n/, err: "" });
check("a starting board", ["board", "renju", "--size", "9"], { code: 0, out: "  A B C D E F G H J\n9 . . . . . . . . .\n8 . . . . . . . . .\n7 . . . . . . . . .\n6 . . . . . . . . .\n5 . . . . . . . . .\n4 . . . . . . . . .\n3 . . . . . . . . .\n2 . . . . . . . . .\n1 . . . . . . . . .\n", err: "" });
check("a whole game, played at random", ["play", "renju", "--size", "9", "--seed", "7"], { code: 0, out: /^renju on 9 by 9, seed 7: 52 moves\.\n[\s\S]*White won by line\.\n$/, err: "" });
check("no seed: one is drawn and named on standard error", ["play", "tictactoe"], { code: 0, out: /^tictactoe on /, err: /^narabe: seed \d+ \(pass --seed \d+ to repeat this\)\n$/ });
const saved = check("a game as a record", ["play", "hex", "--size", "11", "--seed", "7", "--record"], { code: 0, out: /^\{"settings":\{/, err: "" });
const said = /^hex on 11 by 11: 110 moves read back\.\n[\s\S]*White won by connection\.\n$/;
check("a record on standard input is read back", ["replay", "--stdin"], { code: 0, out: said, err: "" }, { input: saved.out });
check("a record with Windows line endings", ["replay", "--stdin"], { code: 0, out: said, err: "" }, { input: saved.out.replaceAll("\n", "\r\n") });
const file = join(mkdtempSync(join(tmpdir(), "narabe-cli-")), "hex.json");
writeFileSync(file, saved.out);
check("a record in a file is read back", ["replay", file], { code: 0, out: said, err: "" });
check("a file that is not there is exit code 1", ["replay", `${file}.missing`], { code: 1, out: "", err: /there is no saved game to read/ });
check("a record that has been changed is exit code 1", ["replay", "--stdin"], { code: 1, out: "", err: /not a saved game/ }, { input: saved.out.replace('"row":', '"row":99,"was":') });
check("empty standard input is exit code 1", ["replay", "--stdin"], { code: 1, out: "" }, { input: "" });
check("random games are counted", ["simulate", "reversi", "--games", "20", "--seed", "1"], { code: 0, out: /^reversi, 20 random games on 8 by 8 from seed 1: Black won \d+, White won \d+, \d+ drawn, 0 not finished\./, err: "" });
check("a game nobody has heard of is exit code 1", ["play", "chess"], { code: 1, out: "", err: /no game is called “chess”/ });
check("a wrong option is exit code 2", ["--bogus"], { code: 2, out: "", err: /unknown option --bogus/ });
check("a wrong command is exit code 2", ["dance"], { code: 2, out: "", err: /is not a command/ });
check("JSON parses", ["play", "tictactoe", "--seed", "7", "--json"], { code: 0, out: (text) => JSON.parse(text).seed === 7, err: "" });
check("Japanese by flag", ["play", "renju", "--size", "9", "--seed", "7", "--lang", "ja"], { code: 0, out: /^renju 9×9、シード 7: 52手。/ });
check("Japanese by LANG", ["--help"], { code: 0, out: /^使い方: narabe/ }, { env: { LANG: "ja_JP.UTF-8" } });
check("Japanese by LC_ALL over LANG", ["--bogus"], { code: 2, err: /^narabe: 不明なオプションです: --bogus\n/ }, { env: { LC_ALL: "ja_JP.UTF-8", LANG: "en_US.UTF-8" } });
check("English by flag over LANG", ["--help", "--lang", "en"], { code: 0, out: /^Usage: narabe/ }, { env: { LANG: "ja_JP.UTF-8" } });

if (failed > 0) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log("the command line does what it says, on", process.platform, process.version);
