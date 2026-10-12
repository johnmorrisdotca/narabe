---
title: State and data-driven rules
section: explanation
order: 7
description: Learn state and data-driven rules.
---

## One position value

GameState holds settings, cells, moves, colour to play, seats, captures, opening phase, pending twist, kings, capture-chain point, ko point and outcome. A native transition returns a new value when it changes the game. Preserve that value; do not mutate its board to imitate a move because that bypasses captures, wins and history.

## The variant selects mechanics

VARIANT_SPECS describes line rules, forbidden shapes, captures, turns, placement, grids, queues, camps, connections, draughts and Go. Settings normalize against that data. The root composes native mechanics rather than giving the UI forty-eight different engines. [The games](../../README.md#the-games) preserves the complete catalogue.

## Seats differ from colours

Swap protocols can move colours between seats. Use seatOf and seatToPlay instead of equating black with the first person forever. Opening decisions and stone moves have distinct histories. A handicap can rule out colour-swapping openings, and a head start restricts opening choices.

## Separate transport from rules

MoveInput is the external record shape; Move is the engine's enriched form with captures and effects. Parse shape before replay, then let the engine confirm the legal sequence. DOM, React and SVG entries present the same core state. See [records](save-and-replay.md) and [state reference](api:GameState).
