# Contributing to Narabe

Thank you for helping. Bug reports, new games, ideas and pull requests are all
welcome.

## Before you start

Open an issue first for anything bigger than a typo, so we can agree on the
shape before you spend time on it. This file says what is particular to
Narabe; the family's shared guidance is at
[github.com/johnmorrisdotca/.github](https://github.com/johnmorrisdotca/.github/blob/main/CONTRIBUTING.md).

## Reporting a bug

Open an issue with the game, the settings and the moves that led to the
position, what you expected and what the engine did. The quickest way to show
it is a failing test: `createGame(settings)`, the moves through `playMove` or
`replayMoves`, and the assertion that fails.

## Making a change

```sh
git clone https://github.com/johnmorrisdotca/narabe
cd narabe
pnpm install
pnpm check            # lint, types and tests: the same as CI
pnpm site             # builds the demo into ./site
pnpm dlx serve site   # or any static server
pnpm test:demo        # the demo, tapped through in a real browser
pnpm test:cli         # the command line, as a child process
pnpm test:package     # packed, installed from the tarball, and used as published
```

Narabe is the rules engine of a live site, which installs a released version of
it: a change to a rule or to a result is a release the site has to take on
purpose. A change that is only a new file beside the engine (the command line,
the SVG board, the documents) must leave every rule and every result exactly as
it is, and says so in its changelog line.

- **The engine is pure.** Every function takes a `GameState` and returns a new
  one, and never changes the one it was given. No DOM, no clock, no
  `Math.random`: anything a game decides by chance comes from the seed stored
  in its settings, so a replay always comes out the same.
- **A game is a row, not a branch.** A variant is one entry in `VARIANT_SPECS`
  (`src/constants.ts`). The engine reads the spec's fields and never switches
  on a game's name. A new mechanism is a new field and a module in
  `src/rules/`; a new game that combines existing mechanisms is only a row.
- **Ask "may this colour…" through `rulesFor(settings, stone)`**, which lays
  a handicap over the variant's spec. Never read `lineRule`, `forbidden`,
  `captures` or `stonesPerTurn` off the spec directly for a colour.
- **Test what you change.** Tests sit beside their source as `*.test.ts`. A
  new game needs a test that names it and exercises what makes it different,
  not only the simulator.
- **Teach the simulator.** `src/simulation/` plays every game to the end with
  random moves and re-checks every move against rules restated by hand, as an
  independent check on the engine. A new mechanism means extending that
  checker too. If the simulator cannot decide who won, neither can a player.
- **No words for people.** Names, rules text and pictures belong to the app
  that shows them. The engine speaks in constants (`RULE_VARIANTS.renju`,
  `WIN_REASONS.captures`), so every app can say them its own way and in its
  own language.
- **The command line and the drawing decide nothing.** `src/cli.ts` makes
  random moves through the engine and prints what it answers; `src/draw.ts`
  draws a state it is given. Neither holds a rule.
- Source files import only each other and `node:` modules, because the site's
  own tests read this package's source and refuse anything else.
- Words a player reads come in English and Japanese; the command line's are in
  `src/cli.ts` and listed in `docs/strings-ja.md` (`pnpm docs:make` rewrites
  it). If you cannot write the Japanese, say so in the pull request.
- Option values and names are kebab case where they are new.
- Art and sound are CC0 or public domain only, checked at the source. No GPL
  or LGPL code.
- A README table or count is held to the code by `src/docs.test.js`: change both
  together, and never type in a number a test can hold.
- Node 22 or later.
- One change per pull request, with a line in `CHANGELOG.md` under
  *Unreleased*.

## Adding a game

1. Add its key to `RuleVariant` in `src/types.ts` and to `RULE_VARIANTS` and
   `RULE_VARIANT_LIST` in `src/constants.ts`.
2. Write its row in `VARIANT_SPECS`. TypeScript refuses a row with a field
   missing, so every choice is made on purpose.
3. If it needs a mechanism no game has yet, add the field to `VariantSpec`, the
   rule to `src/rules/`, and the check to `src/simulation/`.
4. Write the test that shows its rule working, and run `pnpm check`.
5. Add it to the table of games in `README.md` and to the demo's list in
   `demo/games.js`.

## Releasing

Maintainers bump the version in `package.json` and `src/version.ts`, move
*Unreleased* to the new version in `CHANGELOG.md`, push, wait for CI and tag
`vX.Y.Z`. The Release workflow checks the package, attaches the tarball and
publishes to npm with provenance.
