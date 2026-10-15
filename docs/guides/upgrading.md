---
title: Upgrading and moving from other engines
section: upgrading
order: 10
description: Keep the 1.x contract and move from engines that change the board directly.
---

## Keep the 1.x contract

The existing rules/go import now has a named entry, and the wildcard import remains available. No SDK move behavior changes. Preserve stored initial settings, move kinds, clock information and opening choices; do not migrate records by editing their finished board.

## Coming from mutable board libraries

Keep returned GameState values instead of mutating pieces in place. Convert external coordinates once at the boundary: Narabe uses zero-based top-left row/column while notation counts rows from the bottom and skips the letter I. Use pointName rather than mixing notation and array indices. Ask the engine for legal moves and use its action for the relevant phase.

## Verify an upgrade

Replay representative stored games, check final positions/outcomes, and verify declined moves and native highlights. Validate both unclocked and clocked records when your app supports them. The [changelog](../../CHANGELOG.md) records released fixes and additions, and the [embed guide](../embeds.md) preserves the public integration contract.
