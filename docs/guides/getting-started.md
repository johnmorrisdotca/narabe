---
title: Getting started
section: tutorial
order: 1
description: Learn getting started.
---

Use one immutable rules engine for forty-eight abstract board games. The core needs no DOM or runtime dependency; the optional React entry needs React 18 or later.

## Install

```sh
npm install @johnmorrisdotca/narabe
```

Node 22 or later and modern browsers can import its typed ES modules.

## Play two stones

```ts
import {createGame, playMove, pointName} from "@johnmorrisdotca/narabe";
let game = createGame({variant:"renju",size:15});
game = playMove(game,{row:7,col:7});
game = playMove(game,{row:7,col:8});
console.log(game.toPlay, pointName(15,{row:7,col:7}));
console.log(playMove(game,{row:7,col:7}) === game);
```

Coordinates are zero-based from the top left. Keep the returned position. An illegal or inapplicable action returns the input unchanged, so equality can distinguish a refused action. Game-specific settings may normalize the requested board size.

## Choose a recipe

[Legal choices](legal-choices.md), [Go](go-and-scoring.md), [records](save-and-replay.md), [SVG and React](draw-and-react.md) and [embeds](embed-a-position.md) cover the next steps. The [reference](entry:main) lists native rules and data.
