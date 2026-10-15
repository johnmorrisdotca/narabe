---
title: SVGとReactで表示する
section: how-to
order: 5
description: 現在の局面をSVGで描き、Reactで対局の状態を持ちます。
---

## 今の局面を描く

```ts
import {createGame} from "@johnmorrisdotca/narabe";
import {boardSvg} from "@johnmorrisdotca/narabe/draw";
const svg = boardSvg(createGame({variant:"reversi"}),{width:480,title:"Reversi opening",legal:true});
console.log(svg.startsWith("<svg"));
```

boardSvgはSVG文字列を1つ返します。幅、読み上げる名前、強調表示を選べますが、クリック処理は付けません。表示側で座標に変換し、操作をエンジンへ渡して、返された局面を描き直します。

## Reactの状態を使う

```ts no-run
import {createElement} from "react";
import {useNarabe} from "@johnmorrisdotca/narabe/react";
function Game() {
  const game = useNarabe({variant:"reversi"});
  return createElement("button",{onClick:()=>game.reset()},game.state.toPlay);
}
console.log(createElement(Game));
```

フックはコンポーネント内で呼びます。設定は初期化とresetで読み、描画のたびに初期化しません。フック独自のルールはなく、操作はエンジンの処理を使います。手の一覧がない段階ではchoicesがnullの場合があります。[描画](entry:draw)と[フック](entry:react)のAPIも参照してください。
