---
title: Troubleshooting and FAQ
section: troubleshooting
order: 9
description: Learn troubleshooting and faq.
---

## The move changed nothing

Check game status, bounds, occupancy, forbidden shapes, opening phase, owed twist, forced passes and a pending capture chain. Keep each action's return value. In drop games a click resolves to a landing point; sliding and queued pieces have their own actions. Ask legalPoints, pieceMoves or piecePlacements for the native choices.

## What null means

turnChoices can mean a phase without a list, including Go; forbiddenReason means no forbidden pattern; lastMove means no recorded point; skipTarget means no empty point; queuedPiece means no queue; campOf/starCampOf means outside a camp; nextBoardSize/previousBoardSize means an end of the size list; dropTarget means a full column. longestPossibleGame/noBoundReason describe bounds. The Go applyGoMove null means suicide. A cell null is simply empty.

## The embedded board is blank

parseEmbedMoves null means malformed JSON, shape or bounds; a valid array still needs legal replay. state is null before a successful mounted render or for invalid configuration. Check the console, game name, JSON moves and grid setting. Host options are structured data, not JSON attributes. A frame can show only URL-representable settings.

## A saved game stopped early

Keep clock facts for forfeits and separate opening choices when needed. Compare the replayed record to the supplied moves and verify initial settings and package version. See [replay](save-and-replay.md), [native embed contract](../embeds.md) and [reference](entry:main).
