# Narabe's command line, in English and Japanese

Made from `src/cli.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.
The engine itself holds no words for people: names, rules text and pictures belong to the app that shows the games.

**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please
open a *Fix a translation* issue with the string's name. `{n}`, `{seed}` and the other braces are filled in when shown.

| Name | English | Japanese |
| --- | --- | --- |
| `unknown` | unknown option {part} | 不明なオプションです: {part} |
| `needs` | {part} needs a value | {part} には値が必要です |
| `tryHelp` | Try `narabe --help`. | `narabe --help` をご覧ください。 |
| `langBad` | --lang takes en or ja | --lang は en か ja です |
| `seedBad` | --seed takes a whole number from 0 to {most} | --seed は0〜{most}の整数です |
| `sizeBad` | {game} is played on boards of {sizes} | {game} の盤は {sizes} です |
| `countBad` | --games takes a whole number from 1 to {most} | --games は1〜{most}の整数です |
| `noCommand` | “{part}” is not a command | 「{part}」はコマンドではありません |
| `noGame` | no game is called “{part}” (try `narabe games`) | 「{part}」という名前のゲームはありません（`narabe games` をご覧ください） |
| `noRecord` | there is no saved game to read | 読み込む保存データがありません |
| `notRecord` | that is not a saved game: the engine cannot play it out | 保存データではありません: エンジンで最後まで再現できません |
| `fresh` | seed {seed} (pass --seed {seed} to repeat this) | シード {seed}（--seed {seed} で同じ結果を再現できます） |
| `gameLine` | {key}  boards {sizes}, {board} by default | {key}  盤 {sizes}、標準は {board} |
| `black` | Black | 黒 |
| `white` | White | 白 |
| `toPlay` | {who} to play. | {who}の番です。 |
| `wonBy` | {who} won by {how}. | {who}の勝ち（{how}）。 |
| `drawn` | Drawn. | 引き分けです。 |
| `stopped` | Stopped after {moves} moves, with nobody having won: random play does not always end. | {moves}手で打ち切りました（勝負はついていません）。ランダムな手では終わらないことがあります。 |
| `played` | {game} on {size} by {size}, seed {seed}: {moves} moves. | {game} {size}×{size}、シード {seed}: {moves}手。 |
| `replayed` | {game} on {size} by {size}: {moves} moves read back. | {game} {size}×{size}: {moves}手を読み込みました。 |
| `simulated` | {game}, {n} random games on {size} by {size} from seed {seed}: Black won {black}, White won {white}, {drawn} drawn, {open} not finished. The longest took {longest} moves. | {game}、{size}×{size}、シード {seed} から{n}局: 黒の勝ち{black}、白の勝ち{white}、引き分け{drawn}、未了{open}。最長は{longest}手でした。 |

## The help

`usage`, in English:

```
Usage: narabe <command> [options]

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
```

and in Japanese:

```
使い方: narabe <コマンド> [オプション]

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
```
