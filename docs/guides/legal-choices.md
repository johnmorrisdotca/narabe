---
title: Offer legal moves
section: how-to
order: 2
description: Learn offer legal moves.
---

## Ask the native engine

A placement game uses `legalPoints` and `playMove`. A moving-piece game uses `turnChoices`, `pieceMoves` and `movePiece`. Narrowing to compulsory captures belongs to the engine; a host should display its answers.

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

## Handle the other phases

`turnChoices` returns null for finished games, owed quadrant turns, queued-piece games and Go. Null does not always mean the game ended. Use `canTwist`/`twistBoard` for a quarter turn, `piecePlacements`/`placePiece` for a queue, and `canPass`/`passTurn` for passes. A swap opening may instead need `canChooseColour`/`chooseColour` or `canExtendOpening`/`extendOpening`.

## Keep the whole turn

A game may place multiple stones, demand a twist or continue a capture chain. Read `toPlay`, `pendingTwist`, `chainAt` and opening state after every action rather than assuming each click passes the turn. `forbiddenReason` explains a forbidden shape, while other refusals can come from occupancy, phase or board bounds. See [state design](state-and-rules.md).
