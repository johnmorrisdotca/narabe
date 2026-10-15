---
title: Embed a board position
section: how-to
order: 6
description: Embed a board as an element, an iframe or a module, and keep attributes and structured options apart.
---

## Mount the native element

```ts no-run
import {defineBoard,NarabeBoard} from "@johnmorrisdotca/narabe/element";
defineBoard();
const board = document.createElement("narabe-board") as NarabeBoard;
board.setAttribute("game","freestyle");
board.setAttribute("moves",JSON.stringify([{row:7,col:7}]));
board.setAttribute("controls","true");
document.body.append(board);
console.log(board.state?.moves.length);
```

The registration entry `@johnmorrisdotca/narabe/element/define` defines the default tag as a side effect. Before mounting or on invalid input, state can be null. Use the builder to copy native element, iframe, module or framework recipes.

## Reflect simple values and pass structured options

Attributes choose game, grid, seed, moves, step, highlights, controls, language, theme and display size. `options` supplies host state, settings, opening choices, clock facts, drawing options and onChange. A supplied state displays that position directly instead of replaying a move array. A JSON array that parses is not necessarily a legal full record; the native replay decides legality.

## Read the contract

The [embed contract](../embeds.md) contains every attribute, public event and frame message. Frames read no storage and keep configuration in their URL. `narabe-change` and `narabe-load` have JSON-safe step, steps and state details. Validate source/origin in the parent before using a message. Keep callbacks and non-JSON host handles local.
