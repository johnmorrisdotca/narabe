---
title: Game length and draw limits
section: explanation
order: 8
description: Learn game length and draw limits.
---

## A board is not always a bound

Placement-only games have at most the available cell count in moves. Captures give cells back, clearing removes rows and moving pieces can revisit positions. longestPossibleGame therefore returns null when the native mechanics remove a board-based bound; this means no guaranteed board bound, not that every played game lasts forever.

```ts
import {createGame,longestPossibleGame,noBoundReason} from "@johnmorrisdotca/narabe";
for (const variant of ["freestyle","go","checkers"] as const) {
  const game = createGame({variant});
  console.log(variant,longestPossibleGame(game.settings),noBoundReason(game.settings));
}
```

## Choose an explicit policy

DrawLimit selects none, half or threeQuarters of the applicable board allowance where native rules permit it. Use movesBeforeDraw rather than duplicating its arithmetic. Hex cannot draw by its native connection rule, so a generic draw policy does not apply to every game. Draughts has its own material/endgame/repetition rules in each variant's CheckersRules.

## Keep random opponents bounded in hosts

A random move source is reproducible with seededRandom, but reproducibility does not guarantee termination. Hosts running simulations should choose their own finite work budget and report an unfinished run honestly. The engine's longestPossibleGame and noBoundReason explain guarantees separately from observed game lengths. Existing [README analysis](../../README.md) remains available.
