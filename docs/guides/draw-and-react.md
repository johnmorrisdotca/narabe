---
title: Draw with SVG and React
section: how-to
order: 5
description: Draw the current position as SVG and keep game state in React.
---

## Draw the current position

```ts
import {createGame} from "@johnmorrisdotca/narabe";
import {boardSvg} from "@johnmorrisdotca/narabe/draw";
const svg = boardSvg(createGame({variant:"reversi"}),{width:480,title:"Reversi opening",legal:true});
console.log(svg.startsWith("<svg"));
```

`boardSvg` returns one SVG string. Its options control width, accessible title and highlights; it does not attach click handling. Hosts should map clicks to coordinates and pass actions to the engine, then redraw the returned position.

## Use React state

```ts no-run
import {createElement} from "react";
import {useNarabe} from "@johnmorrisdotca/narabe/react";
function Game() {
  const game = useNarabe({variant:"reversi"});
  return createElement("button",{onClick:()=>game.reset()},game.state.toPlay);
}
console.log(createElement(Game));
```

Run hooks inside components. Settings are read at initialization and on reset, rather than reinitializing on each render. The hook adds no game rules: its actions use native transitions. `choices` can be null for phases without a choice list. The [drawing reference](entry:draw) and [hook reference](entry:react) list options and actions.
