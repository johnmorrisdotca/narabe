---
title: Save and replay a record
section: how-to
order: 4
description: Save a record as settings and moves, replay it with its choices and clock, and spot a replay that stops early.
---

## Store settings and moves

A record is initial settings plus moves, not a screenshot or a mutable board. `StoredGame` includes `moveTimeMs`: null means no clock. A replay accepts forfeits only for a game known to have run a clock.

```ts
import {replayTimeline,replayGame,type StoredGame} from "@johnmorrisdotca/narabe";
const saved: StoredGame = {size:15,winLength:5,variant:"freestyle",obstacles:"none",opener:"black",moveTimeMs:null,moves:[{row:7,col:7},{row:7,col:8}]};
console.log(replayTimeline(saved).length);
console.log(replayGame(saved).moves.length);
```

## Preserve choices and versions

`replayMoves` accepts explicit opening choices and clock facts. StoredGame does not store swap choices, so its replay keeps the chooser's colour by default; do not assume its seat history preserves a missing choice. Store choices separately when that distinction matters. Preserve initial settings, seed and the version used to play a record.

## Recognize a stopped replay

Replaying stops when an input cannot legally advance the game. Compare replay progress to the input; do not silently call a truncated record complete. `undoMove` removes effects of the last recorded move when enabled, but does not undo an opening colour decision. See [troubleshooting](troubleshooting.md).
