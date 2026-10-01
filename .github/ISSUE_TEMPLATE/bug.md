---
name: Report a bug
about: A move the engine allows or refuses wrongly, a wrong result, a record that will not replay
title: "Bug: "
labels: bug
---

The quickest report is a failing test: `createGame(settings)`, the moves through `playMove` (or `replayMoves`), and the assertion that fails. A record from `narabe play <game> --seed N --record` is as good.

**The game and its settings** (the board size, the opening, any handicap):

**The moves that led to the position:**

**What you expected, and what the engine did:**

**Where it ran** (browser and version, or Node, Deno or Bun and version, and the system):
