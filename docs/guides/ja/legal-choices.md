---
title: 合法手を提示する
section: how-to
order: 2
description: 合法手を提示するの使い方と注意点。
---

## エンジンの答えを使う

石を置くゲームではlegalPointsとplayMove、駒を動かすゲームではturnChoices、pieceMoves、movePieceを使います。必須の取りなどによる制限もエンジンが決めます。表示側はその答えを使います。

```ts
import {createGame,turnChoices,pieceMoves,movePiece} from "@johnmorrisdotca/narabe";
let game = createGame({variant:"checkers"});
const choices = turnChoices(game);
if (choices?.kind === "move" && choices.pieces.length) {
  const from = choices.pieces[0];
  const to = pieceMoves(game,from)[0];
  game = movePiece(game,from,to);
}
console.log(game.moves.length,game.toPlay);
```

## 別の段階に対応する

turnChoicesは、終了したゲーム、区画の回転待ち、キューから駒を置くゲーム、囲碁ではnullを返します。nullだけで終了と判断しません。回転にはcanTwistとtwistBoard、駒の配置にはpiecePlacementsとplacePiece、パスにはcanPassとpassTurnを使います。開始方式によっては色の選択や追加配置が必要です。

## 手番全体を扱う

1手番で複数の石を置く、区画を回す、連続して取る場合があります。クリックごとに交代すると決めず、操作後のtoPlay、pendingTwist、chainAt、開始方式の状態を読みます。forbiddenReasonは禁じ手の形を説明します。他にも、石のある位置、操作の段階、盤外などで拒否されます。[局面の設計](state-and-rules.md)も参照してください。
