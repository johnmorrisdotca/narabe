import {
  canChooseColour,
  chooseColour,
} from "./rules/opening.ts";
import { columnLetter, rowNumber } from "./notation.ts";
import { seededRandom } from "./rules/random.ts";
import { GAME_STATUS, RULE_VARIANT_LIST, VARIANT_SPECS, boardSizesFor } from "./constants.ts";
import {
  canPass,
  createGame,
  inMovePhase,
  legalPoints,
  movePiece,
  mustPass,
  passTurn,
  piecePlacements,
  pieceMoves,
  placePiece,
  playMove,
  singlesLeft,
  twistBoard,
} from "./engine.ts";
import { replayMoves } from "./rules/record.ts";
import type { GameSettings, GameState, MoveInput, Point, RuleVariant } from "./types.ts";
import { NARABE_VERSION } from "./version.ts";

/**
 * The command line, as a pure function: arguments and surroundings in, what
 * to print and the exit code out. `bin/narabe.mjs` is the few lines that hand
 * it the real process. Nothing here touches a file, a terminal or the
 * network, so every line of it is tested as plain data, and nothing here is a
 * rule: every move is made, and every result decided, by the engine.
 */

/** What the command line is run in. All of it is optional. */
export type CliSurroundings = {
  /** The environment, for the language (`LC_ALL`, `LC_MESSAGES`, `LANG`). */
  env?: Record<string, string | undefined>;
  /** Standard input, when `--stdin` asks for it: a saved game. */
  stdin?: string;
  /** Reads a file named on the command line, or gives null when it cannot be read. */
  readFile?: (path: string) => string | null;
  /** The system's language where the environment names none: what `Intl` says, on Windows. */
  locale?: string;
  /** Where a seed comes from when none is given: a function that returns a whole number from 1. The engine never draws one itself, so `bin/narabe.mjs` hands in one made from `Math.random`; without it the seed is 1. */
  seed?: () => number;
};

/** What the command line came to. */
export type CliResult = {
  /** 0 when all went well, 1 when what was asked for could not be done, 2 when the command itself was wrong. */
  code: 0 | 1 | 2;
  /** For standard output. */
  out: string;
  /** For standard error. */
  err: string;
};

/** The languages the command line speaks. */
export type CliLanguage = "en" | "ja";

/** Every word the command line says, in both languages. `{n}` and the other braces are filled in when shown. */
export const CLI_STRINGS: Record<CliLanguage, Record<string, string>> = {
  en: {
    unknown: "unknown option {part}",
    needs: "{part} needs a value",
    tryHelp: "Try `narabe --help`.",
    langBad: "--lang takes en or ja",
    seedBad: "--seed takes a whole number from 0 to {most}",
    sizeBad: "{game} is played on boards of {sizes}",
    countBad: "--games takes a whole number from 1 to {most}",
    noCommand: "“{part}” is not a command",
    noGame: "no game is called “{part}” (try `narabe games`)",
    noRecord: "there is no saved game to read",
    notRecord: "that is not a saved game: the engine cannot play it out",
    fresh: "seed {seed} (pass --seed {seed} to repeat this)",
    gameLine: "{key}  boards {sizes}, {board} by default",
    black: "Black",
    white: "White",
    toPlay: "{who} to play.",
    wonBy: "{who} won by {how}.",
    drawn: "Drawn.",
    stopped: "Stopped after {moves} moves, with nobody having won: random play does not always end.",
    played: "{game} on {size} by {size}, seed {seed}: {moves} moves.",
    replayed: "{game} on {size} by {size}: {moves} moves read back.",
    simulated: "{game}, {n} random games on {size} by {size} from seed {seed}: Black won {black}, White won {white}, {drawn} drawn, {open} not finished. The longest took {longest} moves.",
    usage: `Usage: narabe <command> [options]

One rules engine for the abstract board games. The engine makes every move
and decides every result; nothing here plays well, moves are random.

Commands:
  games                  every game, with the boards it is played on
  board <game>           the starting position, as text
  play <game>            random play to the end (or until it is called off)
  replay <file>          read a saved game back through the engine (or --stdin)
  simulate <game>        play many random games and count how they ended

Options:
  -s, --seed N      the number a game's chance comes from (a fresh one is named if not given)
      --size N      the board's side; the game's usual one if not given
      --games N     simulate: how many games, 1 to 10000 (100 if not given)
      --record      play: print the saved game as JSON, ready for replay
  -j, --json        print JSON
      --stdin       replay: read the saved game from standard input
      --lang L      en or ja (the environment's language if not given)
  -h, --help        this help
  -v, --version     the version

Examples:
  narabe games
  narabe play renju --seed 7
  narabe play hex --size 11 --seed 7 --record > hex.json && narabe replay hex.json
  narabe simulate reversi --games 200 --seed 1
`,
  },
  ja: {
    unknown: "不明なオプションです: {part}",
    needs: "{part} には値が必要です",
    tryHelp: "`narabe --help` をご覧ください。",
    langBad: "--lang は en か ja です",
    seedBad: "--seed は0〜{most}の整数です",
    sizeBad: "{game} の盤は {sizes} です",
    countBad: "--games は1〜{most}の整数です",
    noCommand: "「{part}」はコマンドではありません",
    noGame: "「{part}」という名前のゲームはありません（`narabe games` をご覧ください）",
    noRecord: "読み込む保存データがありません",
    notRecord: "保存データではありません: エンジンで最後まで再現できません",
    fresh: "シード {seed}（--seed {seed} で同じ結果を再現できます）",
    gameLine: "{key}  盤 {sizes}、標準は {board}",
    black: "黒",
    white: "白",
    toPlay: "{who}の番です。",
    wonBy: "{who}の勝ち（{how}）。",
    drawn: "引き分けです。",
    stopped: "{moves}手で打ち切りました（勝負はついていません）。ランダムな手では終わらないことがあります。",
    played: "{game} {size}×{size}、シード {seed}: {moves}手。",
    replayed: "{game} {size}×{size}: {moves}手を読み込みました。",
    simulated: "{game}、{size}×{size}、シード {seed} から{n}局: 黒の勝ち{black}、白の勝ち{white}、引き分け{drawn}、未了{open}。最長は{longest}手でした。",
    usage: `使い方: narabe <コマンド> [オプション]

抽象ボードゲームのルールエンジンです。着手も勝敗の判定もエンジンがします。
ここでの手はランダムで、上手に打つものではありません。

コマンド:
  games                  すべてのゲームと、遊べる盤の大きさ
  board <ゲーム>         初期の盤面をテキストで表示します
  play <ゲーム>          ランダムな手で最後まで（または打ち切るまで）遊びます
  replay <ファイル>      保存したゲームをエンジンで再現します（--stdin でも可）
  simulate <ゲーム>      ランダムな対局を多数行い、結果を数えます

オプション:
  -s, --seed N      運に左右される部分のシード（指定しなければ新しいシードを表示します）
      --size N      盤の一辺（指定しなければそのゲームの標準）
      --games N     simulate: 対局数、1〜10000（指定しなければ100）
      --record      play: 保存データをJSONで表示します（replay にそのまま渡せます）
  -j, --json        JSONで表示します
      --stdin       replay: 標準入力から保存データを読みます
      --lang L      en か ja（指定しなければ環境の言語）
  -h, --help        このヘルプ
  -v, --version     バージョン

例:
  narabe games
  narabe play renju --seed 7
  narabe play hex --size 11 --seed 7 --record > hex.json && narabe replay hex.json
  narabe simulate reversi --games 200 --seed 1
`,
  },
};

/** Put values into a string's braces: `fillIn("Seat {n}", { n: 3 })` is "Seat 3". A brace with no value is left as it is. */
function fillIn(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

/** The language the command line speaks: `--lang`, or the environment's, or the system's; Japanese for `ja…`, English for anything else. */
export function cliLanguage(flag: string | undefined, env: Record<string, string | undefined> = {}, locale?: string): CliLanguage {
  const named = [flag, env.LC_ALL, env.LC_MESSAGES, env.LANG].find((value) => value !== undefined && value !== "" && value !== "C" && value !== "POSIX" && !value.startsWith("C."));
  return (named ?? locale ?? "en").toLowerCase().startsWith("ja") ? "ja" : "en";
}

const SEED_MOST = 2_147_483_647;
const GAMES_MOST = 10_000;
const FLAGS_WITH_VALUES: Record<string, string> = { "-s": "seed", "--seed": "seed", "--size": "size", "--games": "games", "--lang": "lang" };
const FLAGS: Record<string, string> = { "--record": "record", "-j": "json", "--json": "json", "--stdin": "stdin", "-h": "help", "--help": "help", "-v": "version", "--version": "version" };

type Asked = { values: Record<string, string>; flags: Set<string>; words: string[]; wrong: { message: "unknown" | "needs"; part: string } | null };

/** The arguments sorted into options and words: the command, and what it is given. */
function sortArguments(args: readonly string[]): Asked {
  const asked: Asked = { values: {}, flags: new Set(), words: [], wrong: null };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] as string;
    const [name, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    if (name in FLAGS_WITH_VALUES) {
      const value = inline ?? args[++i];
      if (value === undefined) {
        asked.wrong ??= { message: "needs", part: name };
        break;
      }
      asked.values[FLAGS_WITH_VALUES[name] as string] = value;
    } else if (name in FLAGS && inline === undefined) asked.flags.add(FLAGS[name] as string);
    // The first wrong option is the one reported; the rest are still read, so that the report comes in the language asked for.
    else if (arg.startsWith("-") && arg !== "-") asked.wrong ??= { message: "unknown", part: arg };
    else asked.words.push(arg);
  }
  return asked;
}

const whole = (text: string | undefined, least: number, most: number): number | null => (text !== undefined && /^\d{1,10}$/.test(text) && Number(text) >= least && Number(text) <= most ? Number(text) : null);

/** The board a game opens on when nothing is asked: the engine's own answer, from a game made with nothing but its name. */
const usualBoard = (key: RuleVariant): number => createGame({ variant: key }, 0).settings.size;

/** A game by what a person might type: its key in any case, with or without hyphens and spaces. */
function findGame(text: string): RuleVariant | null {
  const plain = (value: string) => value.toLowerCase().replace(/[\s\-_]/g, "");
  return RULE_VARIANT_LIST.find((key) => plain(key) === plain(text)) ?? null;
}

/** How a cell is written: a stone, an empty point, and the sealed or special cells some games have. */
function cellText(cell: GameState["board"][number], lattice: boolean): string {
  switch (cell) {
    case "black":
      return "X";
    case "white":
      return "O";
    case "blocked":
      return lattice ? " " : "#";
    case "hot":
      return "*";
    case "worm":
      return "@";
    default:
      return ".";
  }
}

/** The board as text: column letters across the top, row numbers down the side, X for Black and O for White. The hexagon-lattice games slide each row half a cell, as they are drawn. */
export function boardText(state: GameState): string {
  const { size, variant } = state.settings;
  const spec = VARIANT_SPECS[variant];
  const lattice = spec.connects || spec.hexagon || spec.chineseCheckers;
  const wide = String(size).length;
  const pad = (text: string, to: number) => text.padStart(to, " ");
  const slide = (row: number) => (lattice ? " ".repeat(row) : "");
  const head = `${" ".repeat(wide + 1)}${Array.from({ length: size }, (_, col) => columnLetter(col)).join(" ")}`;
  const rows = Array.from({ length: size }, (_, row) => {
    const cells = Array.from({ length: size }, (_, col) => cellText(state.board[row * size + col] as GameState["board"][number], lattice));
    return `${slide(row)}${pad(String(rowNumber(size, row)), wide)} ${cells.join(" ")}`.trimEnd();
  });
  return `${head}\n${rows.join("\n")}\n`;
}

const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

/** One random turn, made through the engine. Null when the engine will not take a move it offered, which is a bug to report. */
function randomTurn(state: GameState, random: () => number): GameState | null {
  if (canChooseColour(state)) return chooseColour(state, random() < 0.5 ? "black" : "white");
  if (mustPass(state)) return passTurn(state);
  if (state.pendingTwist) {
    const quadrantSize = VARIANT_SPECS[state.settings.variant].quadrantSize ?? 1;
    const count = (state.settings.size / quadrantSize) ** 2;
    return twistBoard(state, Math.floor(random() * count), random() < 0.5);
  }
  if (inMovePhase(state)) {
    const movable: Point[] = [];
    state.board.forEach((cell, index) => {
      if (cell !== state.toPlay) return;
      const from = { row: Math.floor(index / state.settings.size), col: index % state.settings.size };
      if (pieceMoves(state, from).length > 0) movable.push(from);
    });
    if (movable.length === 0) return passTurn(state);
    const from = pick(random, movable);
    return movePiece(state, from, pick(random, pieceMoves(state, from)));
  }
  const spec = VARIANT_SPECS[state.settings.variant];
  if (spec.queue !== null) {
    const fits = piecePlacements(state);
    if (singlesLeft(state) > 0 && (fits.length === 0 || random() < 0.15)) {
      const points = legalPoints(state);
      return points.length === 0 ? null : playMove(state, pick(random, points));
    }
    return fits.length === 0 ? null : placePiece(state, pick(random, fits));
  }
  const points = legalPoints(state);
  // Go: a pass is a choice there, taken now and then so that random play can end.
  if (spec.go && canPass(state) && (points.length === 0 || random() < 0.08)) return passTurn(state);
  if (points.length === 0) return null;
  const colour = state.settings.variant === "makerBreaker" || state.settings.variant === "wildTicTacToe" ? (random() < 0.5 ? "black" : "white") : null;
  return playMove(state, pick(random, points), "place", colour);
}

/** What random play came to: the game as it ended or was called off, how many turns it took, and whether the engine refused a move it had offered. */
type Played = { state: GameState; turns: number; refused: boolean };

/** Random play from a game's start, to its end or to a cap that scales with the board, since random moves need not ever end a game of moving pieces. */
function playRandomly(settings: Partial<GameSettings>, seed: number): Played {
  const random = seededRandom(seed);
  let state = createGame({ allowUndo: false, ...settings, seed }, 0);
  const cap = state.settings.size * state.settings.size * 4 + 400;
  let turns = 0;
  while (state.status === GAME_STATUS.playing && turns < cap) {
    const next = randomTurn(state, random);
    if (next === null || next === state) return { state, turns, refused: true };
    state = next;
    turns += 1;
  }
  return { state, turns, refused: false };
}

/** A game as a record carries it: its settings and its moves, which `replayMoves` plays again. */
function recordOf(state: GameState): { settings: GameSettings; moves: MoveInput[] } {
  return {
    settings: state.settings,
    moves: state.moves.map((move) => ({
      row: move.row,
      col: move.col,
      kind: move.kind,
      // Where the mover chose the colour to place, the record says which.
      ...(move.by === undefined ? {} : { stone: move.stone }),
      ...(move.from === undefined ? {} : { from: move.from }),
      ...(move.twist === undefined ? {} : { twist: move.twist }),
      ...(move.cells === undefined ? {} : { cells: move.cells }),
    })),
  };
}

/** Whether something read from a file is a record: settings with a known game, and a list of moves. */
function readRecord(text: string): { settings: GameSettings; moves: MoveInput[] } | null {
  try {
    const found = JSON.parse(text) as { settings?: Partial<GameSettings>; moves?: unknown };
    if (typeof found !== "object" || found === null || typeof found.settings !== "object" || found.settings === null || !Array.isArray(found.moves)) return null;
    if (!RULE_VARIANT_LIST.includes(found.settings.variant as RuleVariant)) return null;
    const settings = createGame(found.settings, 0).settings;
    return { settings, moves: found.moves as MoveInput[] };
  } catch {
    return null;
  }
}

/** Run the command line. See `narabe --help` for what it takes. */
export function runCli(args: readonly string[], around: CliSurroundings = {}): CliResult {
  const asked = sortArguments(args);
  const lang = asked.values.lang;
  const language = cliLanguage(lang, around.env ?? {}, around.locale);
  const t = CLI_STRINGS[language] as Record<string, string>;
  const wrong = (message: string): CliResult => ({ code: 2, out: "", err: `narabe: ${message}\n${t.tryHelp}\n` });
  if (asked.wrong !== null) return wrong(fillIn(t[asked.wrong.message] as string, { part: asked.wrong.part }));
  if (lang !== undefined && lang !== "en" && lang !== "ja") return wrong(t.langBad as string);
  const [command, ...rest] = asked.words;
  if (asked.flags.has("help") || (command === undefined && !asked.flags.has("version"))) return { code: 0, out: t.usage as string, err: "" };
  if (asked.flags.has("version")) return { code: 0, out: `${NARABE_VERSION}\n`, err: "" };
  const json = asked.flags.has("json");
  const print = (body: Record<string, unknown>) => `${JSON.stringify({ generator: `narabe ${NARABE_VERSION}`, ...body }, null, 2)}\n`;
  const who = (stone: "black" | "white" | null) => (stone === null ? "" : (t[stone] as string));

  if (command === "games") {
    const games = RULE_VARIANT_LIST.map((key) => ({ game: key, sizes: boardSizesFor(key), size: usualBoard(key) }));
    if (json) return { code: 0, out: print({ games }), err: "" };
    const wide = Math.max(...RULE_VARIANT_LIST.map((key) => key.length));
    return { code: 0, out: games.map(({ game, sizes, size }) => `${fillIn(t.gameLine as string, { key: game.padEnd(wide), sizes: sizes.length === 0 ? String(size) : sizes.join(" "), board: size })}\n`).join(""), err: "" };
  }

  if (command === "replay") {
    const text = asked.flags.has("stdin") ? (around.stdin ?? "") : rest[0] === undefined ? null : (around.readFile?.(rest[0]) ?? null);
    if (text === null || text.trim() === "") return { code: rest[0] === undefined && !asked.flags.has("stdin") ? 2 : 1, out: "", err: `narabe: ${t.noRecord}\n${rest[0] === undefined && !asked.flags.has("stdin") ? `${t.tryHelp}\n` : ""}` };
    const record = readRecord(text);
    const timeline = record === null ? null : tryReplay(record);
    if (record === null || timeline === null) return { code: 1, out: "", err: `narabe: ${t.notRecord}\n` };
    const state = timeline[timeline.length - 1] as GameState;
    if (json) return { code: 0, out: print({ game: state.settings.variant, size: state.settings.size, moves: state.moves.length, status: state.status, winner: state.winner, winBy: state.winBy, toPlay: state.toPlay }), err: "" };
    const said = { game: state.settings.variant, size: state.settings.size, moves: state.moves.length };
    return { code: 0, out: `${fillIn(t.replayed as string, said)}\n${boardText(state)}${resultText(state, t, who)}\n`, err: "" };
  }

  if (command !== "board" && command !== "play" && command !== "simulate") return wrong(fillIn(t.noCommand as string, { part: command ?? "" }));
  const key = findGame(rest[0] ?? "");
  if (key === null) return { code: 1, out: "", err: `narabe: ${fillIn(t.noGame as string, { part: rest[0] ?? "" })}\n` };
  const sizes = boardSizesFor(key);
  const size = asked.values.size === undefined ? usualBoard(key) : whole(asked.values.size, 1, 1000);
  if (size === null || (sizes.length > 0 && !sizes.includes(size))) return wrong(fillIn(t.sizeBad as string, { game: key, sizes: sizes.join(", ") }));

  let err = "";
  let seed: number;
  if (asked.values.seed !== undefined) {
    const read = whole(asked.values.seed, 0, SEED_MOST);
    if (read === null) return wrong(fillIn(t.seedBad as string, { most: SEED_MOST }));
    seed = read;
  } else if (command === "board") seed = 0;
  else {
    seed = (around.seed ?? (() => 1))();
    if (!json) err = `narabe: ${fillIn(t.fresh as string, { seed })}\n`;
  }

  if (command === "board") {
    const state = createGame({ variant: key, size, seed });
    if (json) return { code: 0, out: print({ game: key, size, toPlay: state.toPlay, board: state.board }), err };
    return { code: 0, out: boardText(state), err };
  }

  if (command === "play") {
    const { state, turns, refused } = playRandomly({ variant: key, size }, seed);
    if (refused) return { code: 1, out: "", err: `narabe: the engine refused a move it offered (${key}, seed ${seed}, after ${turns} turns): please report it\n` };
    if (asked.flags.has("record")) return { code: 0, out: `${JSON.stringify(recordOf(state))}\n`, err };
    if (json) return { code: 0, out: print({ game: key, size, seed, moves: state.moves.length, status: state.status, winner: state.winner, winBy: state.winBy, board: state.board }), err };
    return { code: 0, out: `${fillIn(t.played as string, { game: key, size, seed, moves: state.moves.length })}\n${boardText(state)}${resultText(state, t, who, state.moves.length)}\n`, err };
  }

  // simulate
  const count = asked.values.games === undefined ? 100 : whole(asked.values.games, 1, GAMES_MOST);
  if (count === null) return wrong(fillIn(t.countBad as string, { most: GAMES_MOST }));
  const tally = { black: 0, white: 0, drawn: 0, open: 0 };
  let longest = 0;
  for (let n = 0; n < count; n += 1) {
    const { state, refused, turns } = playRandomly({ variant: key, size }, seed + n);
    if (refused) return { code: 1, out: "", err: `narabe: the engine refused a move it offered (${key}, seed ${seed + n}, after ${turns} turns): please report it\n` };
    longest = Math.max(longest, state.moves.length);
    if (state.status === GAME_STATUS.won) tally[state.winner === "white" ? "white" : "black"] += 1;
    else if (state.status === GAME_STATUS.draw) tally.drawn += 1;
    else tally.open += 1;
  }
  if (json) return { code: 0, out: print({ game: key, size, seed, games: count, ...tally, longest }), err };
  return { code: 0, out: `${fillIn(t.simulated as string, { game: key, n: count, size, seed, ...tally, longest })}\n`, err };
}

/** A record played again through the engine; null if the engine refuses a move in it. */
function tryReplay(record: { settings: GameSettings; moves: MoveInput[] }): GameState[] | null {
  try {
    const timeline = replayMoves(createGame(record.settings, 0), record.moves);
    // A twist is a step of its own on the timeline, so the record is read in full when the last position holds every move.
    return (timeline[timeline.length - 1] as GameState).moves.length === record.moves.length ? timeline : null;
  } catch {
    return null;
  }
}

/** Who won, how, or who is to play, or that a game was called off. */
function resultText(state: GameState, t: Record<string, string>, who: (stone: "black" | "white" | null) => string, calledOff?: number): string {
  if (state.status === GAME_STATUS.won) return fillIn(t.wonBy as string, { who: who(state.winner), how: state.winBy ?? "" });
  if (state.status === GAME_STATUS.draw) return t.drawn as string;
  return calledOff === undefined ? fillIn(t.toPlay as string, { who: who(state.toPlay) }) : fillIn(t.stopped as string, { moves: calledOff });
}
