---
title: 囲碁を打ち数える
section: how-to
order: 3
description: 囲碁を打ち数えるの使い方と注意点。
---

## 基本APIから打つ

囲碁では石を置き、自分でパスを選べます。基本APIは盤外、石のある位置、自殺手、単純コウを確認します。通常のパスが2回続くと面積で勝敗を決めます。ハンディキャップによる手番の省略は、その2回に含みません。

```ts
import {createGame,playMove,passTurn,scoreArea} from "@johnmorrisdotca/narabe";
let game = createGame({variant:"go",size:9});
game = playMove(game,{row:4,col:4});
game = playMove(game,{row:4,col:5});
console.log(scoreArea(game.board,game.settings.size));
game = passTurn(passTurn(game));
console.log(game.status,game.winner,game.winBy);
```

## 得点を理解する

scoreAreaは石と、1色だけに囲まれた空き領域を数えます。両色に接する領域や、どちらにも接しない領域は数えません。死に石の判定や除去はしないため、パスする前に実際の着手で解決します。通常のコミは白に6.5で、ハンディキャップによって内部で調整されます。scoreAreaはコミなしの面積を返し、終了した局面の勝者にはコミが反映されます。

## 下位の関数を使う

[囲碁用エントリー](entry:rules-go)にはapplyGoMove、goLegal、walledIn、areaWinner、playGoMoveがあります。applyGoMoveは盤内の空き位置を前提とし、自殺手の場合にnullを返します。完全な確認にはgoLegalを使います。groupAtには石のある位置を渡し、playGoMoveには合法と分かっている位置を渡します。外部入力にはplayMoveを優先します。コウは直後の取り返しを防ぐ方式で、局面全体の反復を禁止する方式ではありません。
