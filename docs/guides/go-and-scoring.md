---
title: Play and score Go
section: how-to
order: 3
description: Play Go with the base API, score by area, and use the lower-level Go functions.
---

## Play through the root API

Go uses placement and chosen passes. The root checks bounds, occupancy, suicide and its simple-ko restriction. Two consecutive ordinary passes end the game by area count. A head-start pass is distinct and does not count as one of those two.

```ts
import {createGame,playMove,passTurn,scoreArea} from "@johnmorrisdotca/narabe";
let game = createGame({variant:"go",size:9});
game = playMove(game,{row:4,col:4});
game = playMove(game,{row:4,col:5});
console.log(scoreArea(game.board,game.settings.size));
game = passTurn(passTurn(game));
console.log(game.status,game.winner,game.winBy);
```

## Understand the score

`scoreArea` counts stones plus empty regions bordered by one colour. Regions touching both colours or neither count for neither. It does not identify or remove dead stones: resolve them by play before passing. White receives native komi, normally 6.5 and adjusted by head-start terms through `komiFor` internally. `scoreArea` reports raw area; the settled state's winner includes komi.

## Use lower-level functions carefully

The [Go entry](entry:rules-go) includes `applyGoMove`, `goLegal`, `walledIn`, `areaWinner` and `playGoMove`. `applyGoMove` assumes a valid empty point and only refuses suicide with null; use `goLegal` for the complete placement test. `groupAt` expects a point occupied by a stone. `playGoMove` expects a known legal point. Prefer `playMove` for untrusted input. Ko here is immediate recapture prevention, not full positional superko.
