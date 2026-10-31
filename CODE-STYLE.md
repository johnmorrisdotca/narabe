# Code style

How the code of every package in the family is written, and why. This is the
master text kept in
[johnmorrisdotca/.github](https://github.com/johnmorrisdotca/.github/blob/main/CODE-STYLE.md),
copied unchanged into each package, and held to that copy by `family.test.js`.
Most of it is checked by `pnpm check`, so a rule here that a tool can hold is
held by one; the rest is for the person reviewing a pull request.

## Formatting: Biome

- **Biome formats and lints**, with the family's settings in
  `scripts/biome-family.json`. A package's own `biome.json` extends it and adds
  only what is the package's: usually nothing. `pnpm lint` fails on any file
  that is not formatted; `pnpm format` formats and applies the safe fixes.
- **The shape**: 120 columns, two spaces, double quotes, semicolons, trailing
  commas, imports sorted. One statement per line, one variable per declaration.
- **What is not formatted**: Markdown, HTML, YAML, generated data
  (`*.data.ts`), the documentation folder, and the files every package shares
  that have not been formatted at their master yet. The shared settings list
  them, so no package excludes them on its own.
- **A commit that only reformats** is named in `.git-blame-ignore-revs`, so
  `git blame` and GitHub skip it and still show who wrote each line.
- **Why Biome rather than ESLint and Prettier**: one tool and one settings file
  instead of five development dependencies and two settings files per package,
  the same output as Prettier, and the browser's and Node's globals known
  without a list. What it checks less thoroughly than typescript-eslint, the
  questions that need types, the TypeScript compiler answers below.

## Lint rules beyond Biome's recommended set

Each is in `scripts/biome-family.json`, and each catches a real mistake or a
real cost to a reader:

- `noFloatingPromises`, `noMisusedPromises`: a promise nobody waits for.
- `useExhaustiveSwitchCases`: a `switch` over a union that misses a member.
- `noUnusedImports`, `noUnusedVariables`: code that does nothing.
- `noParameterAssign`: a parameter is what was passed in; a value that changes
  gets a name of its own (`let current = options`).
- `noShadowRestrictedNames`: no local `escape`, `name` or `undefined` hiding the
  global of that name. Name the job instead: `escapeXml`.
- `useConst`, `useSingleVarDeclarator`, `useTemplate`, `useImportType`,
  `useExportType`, `useNodejsImportProtocol`, `noUselessElse`: one way to write
  each thing.

`noNonNullAssertion` is off: a grid read with `!` after a bounds check is
honest. `noDescendingSpecificity` is off because reordering CSS to please it
can change what is drawn.

## TypeScript

- **Every package**: `strict`, `target` ES2022, `noFallthroughCasesInSwitch`,
  `noImplicitOverride` and `verbatimModuleSyntax`.
- **`noUncheckedIndexedAccess`** is turned on package by package, as each is
  made ready for it, until every package has it. It makes `grid[i]` say that it
  may be missing. In grid code, prefer one checked accessor that throws on a bad
  index over a `!` on every read.
- **Input from outside is `unknown` until it is checked.** A saved game, a code
  or anything from `JSON.parse` is read as `JSON.parse(text) as unknown` and
  narrowed by a guard, never used as `any`.
- **`any` is not used.** Where a type really cannot be written, say why beside
  it.

## Size: 500 lines of code a file

`pnpm check` runs `scripts/check-size.mjs`, which fails a source file under
`src/` that holds more than 500 lines of code. Blank lines and comments do not
count, so documentation never pushes a file over; tests and `*.data.ts` files
do not count at all.

When a file reaches the limit, split it by what it does: the rules, the
drawing, the player, the words. Do not shave comments or squeeze lines to get
under it: the limit is there to catch a file doing too many jobs, and neither
removes a job. A table that is data, a word list or a level set, goes in a
`*.data.ts` file of its own.

## Constants and names

- **A number that means something has a name**: a measurement of the drawing
  (`PITCH`, `MARGIN`), a limit (`MAX_DICE`), a time (`COPIED_MESSAGE_MS`). The
  name says what it measures; a comment beside it says where the value comes
  from when that is not obvious (`the pitch times √3/2, rounded`).
- **One meaning, one constant.** Two numbers that happen to be equal but mean
  different things are two constants.
- **Words a person reads live in the package's strings table**, in English and
  Japanese, never inline in the code that shows them.
- **A stylesheet is a constant**, written one rule to a line and joined, not a
  single string of a thousand characters built again on every render.
- **Domain values are compared through their constants or union types**, never
  through a string literal typed out again.

## Don't repeat yourself

- **Inside a package**, one job has one function: one XML escape, one random
  source, one way to read an attribute. A second copy is a bug waiting for the
  first to be fixed without it.
- **Across packages**, code that every package needs is a **family file**: a
  master kept in `johnmorrisdotca/.github`, copied byte for byte into each
  package, and held to the master by a hash in `family.test.js`.
  `node scripts/family-sync.mjs` in `.github` writes the masters into every
  package and records their hashes. A family file is changed at its master and synced,
  never edited in one package.
- **Never a runtime dependency.** Every package promises no dependencies, and
  a shared package would break that promise, tie every release to another's,
  and let one page load two versions of it. A copied file costs a few hundred
  bytes and keeps all three promises.
- **A seeded generator is never changed in a way that changes its numbers.**
  Saved games, daily puzzles and fixed levels are reproduced from those
  numbers. Before two generators are merged into one, a test pins the
  sequence each produces, and the merge keeps every pinned sequence.

## Comments

- Every export has a TSDoc summary, its parameters, what it returns and an
  example that imports the package: the documentation site is built from them
  and `docs-site.test.js` checks it.
- Inside a function, a comment says what the code cannot: a constraint, a
  reason, where a number comes from. Not what the next line does.

## Changing code safely

- **A refactor changes no output.** When code that draws, deals or scores is
  restructured, compare its output before and after, byte for byte (a hash of
  every board, every material, every seed), and say so in the commit.
- **Readable code ships some bytes.** The packages ship the compiler's output
  unminified, so names and small functions cost a little. Record the new size
  with `pnpm size --write` when it moves, and keep the README's badge true.
- **One change per commit**: formatting, lint fixes, a rule and a refactor are
  separate commits, so each can be read, and the formatting skipped.
