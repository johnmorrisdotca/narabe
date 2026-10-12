---
title: はじめに
section: tutorial
order: 1
description: はじめにの使い方と注意点。
---

48種類の盤上ゲームを、局面を新しく返す1つのルールエンジンで扱います。基本機能にDOMや実行時の依存パッケージは不要です。React用エントリーを使う場合はReact 18以降が必要です。

## インストール

```sh
npm install @johnmorrisdotca/narabe
```

Node 22以降と新しいブラウザーで、型付きのESモジュールを読み込めます。

## 石を2つ置く

```ts
import {createGame, playMove, pointName} from "@johnmorrisdotca/narabe";
let game = createGame({variant:"renju",size:15});
game = playMove(game,{row:7,col:7});
game = playMove(game,{row:7,col:8});
console.log(game.toPlay, pointName(15,{row:7,col:7}));
console.log(playMove(game,{row:7,col:7}) === game);
```

座標は左上から数え、行と列は0から始まります。返された局面を保存します。不正な操作や適用できない操作では、元の局面がそのまま返ります。ゲームによって、指定した盤の大きさが調整されます。

## 次の使い方

[合法手](legal-choices.md)、[囲碁](go-and-scoring.md)、[棋譜](save-and-replay.md)、[SVGとReact](draw-and-react.md)、[埋め込み](embed-a-position.md)へ進めます。[公開API](entry:main)にルールとデータがあります。
