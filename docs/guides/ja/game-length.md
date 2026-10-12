---
title: 対局の長さと引き分け
section: explanation
order: 8
description: 対局の長さと引き分けの使い方と注意点。
---

## 盤の大きさだけでは上限が決まらない

置くだけのゲームでは使えるマス数が手数の上限です。取りで空きが戻り、行消去で行が消え、移動する駒は同じ局面へ戻れます。longestPossibleGameがnullなら、盤による上限を保証できません。すべての対局が永久に続くという意味ではありません。

```ts
import {createGame,longestPossibleGame,noBoundReason} from "@johnmorrisdotca/narabe";
for (const variant of ["freestyle","go","checkers"] as const) {
  const game = createGame({variant});
  console.log(variant,longestPossibleGame(game.settings),noBoundReason(game.settings));
}
```

## 方針を明示する

DrawLimitは、対応するルールでnone、half、threeQuartersを選びます。計算を重複させず、movesBeforeDrawを使います。Hexは接続のルールで引き分けにならないため、同じ方針を全ゲームに適用しません。ドラフツには各CheckersRulesの駒数、終盤、反復のルールもあります。

## ホストの試行回数を決める

seededRandomで再現できても、必ず終了するとは限りません。シミュレーション側で有限の処理回数を決め、途中なら途中と報告します。longestPossibleGameとnoBoundReasonは、観測した長さとは別に保証を説明します。[READMEの説明](../../../README.md)も残っています。
