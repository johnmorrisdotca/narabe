# Contributing

Thank you for helping. Bug reports, ideas, corrections to the Japanese and pull
requests are all welcome.

This first part is the same in every package of the family. It is the master
text kept in
[johnmorrisdotca/.github](https://github.com/johnmorrisdotca/.github/blob/main/CONTRIBUTING.md),
copied unchanged into `scripts/community/CONTRIBUTING.md`, and a test holds
this file to that copy. What is particular to the package follows it, under
the heading "Particular to" and the package's name.

## Before you start

Open an issue first for anything bigger than a typo, so that we can agree on the
shape before you spend time on it. Taking part follows the
[Code of Conduct](CODE_OF_CONDUCT.md); report a security concern privately, as
[SECURITY.md](SECURITY.md) says.

## Making a change

```sh
pnpm install
pnpm check          # lint, types and tests: the same as CI
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
pnpm site           # build the demo into ./site, as GitHub Pages publishes it
```

The package's own further commands (its browser tests, its command line, its
data scripts) are listed under its own heading below.

## House rules, shared by every package of the family

- **No runtime dependencies.** Development dependencies are for tests, builds and
  documentation only.
- **The core is pure.** Every function in it returns new values and never
  changes what it was given.
- **Test what you change.** Tests sit beside the code they test. A rule you
  change has a test that would have caught it.
- **Words a person reads come in English and Japanese.** If you cannot write the
  Japanese, say so in the pull request and someone will.
- **Option values and names are kebab case.**
- **Art and sound are CC0 or public domain only**, checked at the source and
  credited. Data and word lists may be under another licence that lets them be
  shipped, with its notice kept in `NOTICE.md`. No GPL or LGPL code.
- **Needs Node 22 or later.**
- **A README table, example or count that a test holds to the code** changes
  together with the code.
- **The family's own files are the same in every package**: `demo/family.css`,
  `scripts/family-template.mjs`, `scripts/family-readme.mjs`,
  `scripts/release-notes.mjs`, the files in `scripts/community/` and
  `family.test.js` (in `src/`, or in `test/`). Do not edit one here. To change
  one, change it in every repository at once, bump `FAMILY_TEMPLATE_VERSION` for
  the template, and record the new hash in `family.test.js`. What is the
  package's own goes in its own stylesheet, `demo/<name>.css`, and its page
  builder, `scripts/site.mjs`.
- **The list of the family in the README is made, not written.**
  `pnpm family:readme` writes it between its markers from
  `scripts/family-template.mjs`.
- **The workflows are the family's too.** `ci.yml` runs `pnpm check`, the demo's
  browser tests and the packed package on Linux, macOS and Windows; `pages.yml`
  is the same text in every package. A package adds jobs of its own after those.

## Pull requests

One change per pull request. Say what changed and how you checked it, and add a
line to `CHANGELOG.md` under **Unreleased**: for a change a user would notice,
and for one to the repository alone.

## Releasing

Maintainers bump the version in `package.json` (and in `src/version.ts`, where
the package has one), move *Unreleased* to the new version in `CHANGELOG.md`,
dated, push, wait for CI and tag `vX.Y.Z`, the same as `package.json`'s version.
The Release workflow (`.github/workflows/release.yml`) checks and builds the
package, attaches the tarball to a GitHub release and publishes it to npm by
trusted publishing, with provenance and no token. A version already on npm is
not published again.

## Particular to Narabe

### Reporting a bug

Open an issue with the game, the settings and the moves that led to the
position, what you expected and what the engine did. The quickest way to show
it is a failing test: `createGame(settings)`, the moves through `playMove` or
`replayMoves`, and the assertion that fails.

### Commands and rules

```sh
pnpm check            # lint, types and tests: the same as CI
pnpm site             # builds the demo into ./site
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
  (`src/variantSpecs.ts`). The engine reads the spec's fields and never switches
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
- A README table or count is held to the code by `src/docs.test.js`: change both
  together, and never type in a number a test can hold.

### Adding a game

1. Add its key to `RuleVariant` in `src/types.ts` and to `RULE_VARIANTS` and
   `RULE_VARIANT_LIST` in `src/constants.ts`.
2. Write its row in `VARIANT_SPECS`. TypeScript refuses a row with a field
   missing, so every choice is made on purpose.
3. If it needs a mechanism no game has yet, add the field to `VariantSpec`, the
   rule to `src/rules/`, and the check to `src/simulation/`.
4. Write the test that shows its rule working, and run `pnpm check`.
5. Add it to the table of games in `README.md` and to the demo's list in
   `demo/games.js`.
