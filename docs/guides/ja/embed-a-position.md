---
title: 盤面を埋め込む
section: how-to
order: 6
description: 盤面を要素、iframe、モジュールで埋め込み、属性と構造化した設定を分けて扱います。
---

## 専用の要素を置く

```ts no-run
import {defineBoard,NarabeBoard} from "@johnmorrisdotca/narabe/element";
defineBoard();
const board = document.createElement("narabe-board") as NarabeBoard;
board.setAttribute("game","freestyle");
board.setAttribute("moves",JSON.stringify([{row:7,col:7}]));
board.setAttribute("controls","true");
document.body.append(board);
console.log(board.state?.moves.length);
```

登録用エントリーを読み込むと、既定のタグが登録されます。未配置のときや入力が不正なとき、stateはnullになる場合があります。ビルダーから要素、iframe、モジュール、各フレームワーク用の例をコピーできます。

## 属性と構造化した設定を分ける

属性でゲーム、盤の大きさ、シード、棋譜、手順、強調表示、操作、言語、配色、表示サイズを選べます。optionsでは局面、設定、開始方式の選択、時計の情報、描画設定、onChangeを渡します。局面を直接渡すと棋譜の再生を使いません。JSONとして読めても、棋譜全体が合法とは限りません。エンジンが確認します。

## 仕様を確認する

[埋め込み仕様](../../embeds.md)に属性、イベント、フレームのメッセージがあります。フレームは保存領域を読まず、設定はURLに入ります。narabe-changeとnarabe-loadは、JSONで扱えるstep、steps、stateを持ちます。親では送信元とoriginを確認してから使います。コールバックなどはホスト側に保ちます。
