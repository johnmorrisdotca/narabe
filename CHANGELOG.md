# Changelog

All notable changes to this project are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- The demo is on the family's standard: the shared header and footer, English
  and Japanese (the Japanese, including the rule of each of the forty-eight
  games, not yet read by a native reader), the family's cloth patches behind
  the board, and an API reference page in the same frame. It is tested in a
  real browser on a phone and a desk (`pnpm test:demo`). The package itself
  is unchanged.

- **A Help switch in the demo.** Beside the language chooser in the family header, shared by every demo. Off (the default) the page is as it was; on, each option row (the game, the board and opponent, the buttons, the colour to place) says in one plain line what it does, in English or Japanese, and every button in it has the same words as its hover text. Kept on the device.

## [1.0.0] - 2026-09-30

### Added

- Forty-eight games on one engine, each a row in `VARIANT_SPECS`: eight
  five-in-a-row games (gomoku, tournament gomoku, renju, omok, Caro, Connect6,
  Misère Five, Hex Five), two capture games (Ninuki- and Sannuki-renju), eight
  drop games from Drop Four to Wormhole Drop, six small-board games including
  tic-tac-toe and Notakto, eight strange-board games (a torus, rocks, dominoes,
  falling blocks, quarter turns), six flipping games from Reversi to the
  hexagonal Honeycomb, Halma and Chinese Checkers, Hex, Go, and checkers with
  five draughts rule sets.
- `createGame`, `playMove`, `movePiece`, `placePiece`, `twistBoard`,
  `passTurn`, `undoMove` and the rest: every move returns a new state and an
  illegal one returns the state unchanged.
- `turnChoices`, which says what the player to move may do in any game.
- Seven opening protocols, handicaps, head starts, a draw limit, seats that
  can be swapped, boards that grow and shrink.
- Records as move lists: `replayMoves`, `replayGame` and `replayTimeline`,
  with `pointName` and the rest of the notation.
- `useNarabe`, a React hook, from `@johnmorrisdotca/narabe/react`.
- A simulator that plays every game to its end and re-checks each move against
  the rules restated by hand.
- A demo that plays any of the games on one screen, published to GitHub Pages.
- Every module is its own entry point (`@johnmorrisdotca/narabe/rules/lines`
  and so on), `test-support` builds positions for tests, `simulation/headStartDecides`
  measures whether a head start settles a game, and the source and its tests
  ship in the package beside the build.

[Unreleased]: https://github.com/johnmorrisdotca/narabe/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/johnmorrisdotca/narabe/releases/tag/v1.0.0
