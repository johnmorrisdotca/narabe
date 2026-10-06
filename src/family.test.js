// family.test.js: what every package of the family holds the same way, held by one test copied unchanged into
// each repository (src/family.test.js, or test/family.test.js in Kyuubu). It reads files and runs nothing else.
// Changing a shared file means changing it in every repository, with the new hash recorded here.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { familyBlockOf, familyReadmeBlock } from "../scripts/family-readme.mjs";
import { FAMILY, FAMILY_PITCH, FAMILY_TEMPLATE_VERSION } from "../scripts/family-template.mjs";
import { releaseNotes } from "../scripts/release-notes.mjs";

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const pkg = JSON.parse(read("package.json"));
const id = pkg.name.replace(/^@[^/]+\//, "");

// The recorded hashes. The template's is the one that says every demo's header and footer, and every README's
// list of the family, are the same text.
// The template of 2026-10-05 lists twenty-four packages, Karakuri and Houseki included. The family's list is swept again, in every
// repository at once, when a package is added to it, and this hash is then the new one.
const TEMPLATE = { version: "2026-10-05", sha256: "a2dc81808be980438bdef8b91f5c0bbff920a739bc50930cd4632cb017c8fa48" };
const FILES = {
  "scripts/family-readme.mjs": "3c9d5b2cbf17a92d31bced98edac7f544616edb0dff90bf2d141722a9d4516c5",
  "scripts/release-notes.mjs": "efab0fb78ad05973a8885624c0d2ce3b458b55799c11eabaa5176603ce8cd1e9",
  "scripts/community/SECURITY.md": "ff6f650be7789396233671d2558439736efe7f96a1d1d39115dd5cf94d29275c",
  "scripts/community/CODE_OF_CONDUCT.md": "34da1f56f004ce8f7f95d4449b64d2ecb5827dd9f0d4eea1da351a20713ebe70",
  "scripts/community/CONTRIBUTING.md": "3225201be4f66531c27e849f0bb219f8c7274e5815b726a93565bccadbc6a43c",
};
// The Pages workflow is one text in every package. A package that also builds a documentation site adds the one step that
// builds it, and that line is left out before the text is compared.
const PAGES_SHA256 = "f45c33dd0403551588b8b00882cfd0c1d953d2095e558ffab0f7451b8cdb6ef6";

describe("the family template", () => {
  it("is the one file, byte for byte, in every package", () => {
    expect(FAMILY_TEMPLATE_VERSION).toBe(TEMPLATE.version);
    expect(sha("scripts/family-template.mjs")).toBe(TEMPLATE.sha256);
  });

  it("lists every package of the family, in order, each with its Japanese name and a line on it", () => {
    expect(FAMILY.map((one) => one.id)).toEqual([
      "korokoro", "kyuubu", "hitotsu", "toranpu", "tane", "narabe", "tenka", "kumimoji", "tsunagi", "jarajara",
      "suido", "domino", "kotoba", "sugoroku", "kazu", "meikyuu", "hikidashi", "chizu", "bushu", "tobiishi", "jirai", "gunjin", "karakuri", "houseki",
    ]);
    for (const one of FAMILY) {
      expect(one.name, one.id).toBe(one.id[0].toUpperCase() + one.id.slice(1));
      expect(one.kana, one.id).toMatch(/\S/);
      expect(FAMILY_PITCH[one.id], one.id).toMatch(/^[^A-Z.].*[^.]$/);
    }
    expect(Object.keys(FAMILY_PITCH).sort()).toEqual(FAMILY.map((one) => one.id).sort());
    expect(FAMILY.map((one) => one.id)).toContain(id);
  });

  it("is what this package's footer reads: the demo site names the family through it", () => {
    expect(read("scripts/site.mjs")).toContain("familyFooter(");
  });
});

describe("the files every package shares", () => {
  it("are copied unchanged: the README writer, the release notes, and the family's SECURITY.md, CODE_OF_CONDUCT.md and CONTRIBUTING.md", () => {
    for (const [path, hash] of Object.entries(FILES)) expect(sha(path), path).toBe(hash);
  });

  it("SECURITY.md and CODE_OF_CONDUCT.md are the master text of github.com/johnmorrisdotca/.github, which scripts/community keeps a copy of", () => {
    for (const file of ["SECURITY.md", "CODE_OF_CONDUCT.md"]) expect(read(file), file).toBe(read(`scripts/community/${file}`));
  });

  it("CONTRIBUTING.md is the master text of github.com/johnmorrisdotca/.github, which scripts/community keeps a copy of, and then what is particular to this package", () => {
    const master = read("scripts/community/CONTRIBUTING.md");
    const own = read("CONTRIBUTING.md");
    const name = FAMILY.find((one) => one.id === id).name;
    expect(own.startsWith(`${master}\n## Particular to ${name}\n`), "CONTRIBUTING.md is the master text, a blank line and '## Particular to <Name>'").toBe(true);
    expect(own.split("\n## Particular to ").length - 1).toBe(1);
  });
});

describe("the workflows", () => {
  const ci = read(".github/workflows/ci.yml");

  it("ci.yml has the family's three jobs, check, demo and package, and runs `pnpm check` rather than its parts, with jobs of the package's own after them", () => {
    expect(ci).toMatch(/^name: CI$/m);
    const jobs = [...ci.slice(ci.indexOf("\njobs:\n")).matchAll(/^ {2}([a-z][a-z-]*):$/gm)].map((match) => match[1]);
    expect(jobs.slice(0, 3)).toEqual(["check", "demo", "package"]);
    expect(ci).toContain("      - run: pnpm check\n");
    expect(ci).not.toMatch(/- run: pnpm (lint|typecheck|test)$/m);
    expect(ci).toContain("os: [ubuntu-latest, macos-latest, windows-latest]");
    expect(ci).toContain("run: pnpm test:package");
  });

  it("pages.yml is the same text in every package, named Pages, apart from one step that builds a documentation site", () => {
    const pages = read(".github/workflows/pages.yml").replace("\n      - run: pnpm docs:site\n", "\n");
    expect(pages).toMatch(/^name: Pages$/m);
    expect(createHash("sha256").update(pages).digest("hex")).toBe(PAGES_SHA256);
  });
});

describe("the README's family", () => {
  const readme = read("README.md");

  it("is the block scripts/family-readme.mjs writes from the template, under a heading of its own", () => {
    const block = familyBlockOf(readme);
    expect(block, "README.md has no family markers").not.toBeNull();
    expect(block).toBe(familyReadmeBlock(id));
    expect(readme.split("<!-- family:start").length - 1).toBe(1);
    expect(readme).toMatch(/\n#{2,3} The family\n+<!-- family:start/);
  });

  it("names every package once, as a link", () => {
    const block = familyBlockOf(readme);
    for (const one of FAMILY) expect(block.split(`](https://github.com/johnmorrisdotca/${one.id})`).length - 1, one.id).toBe(1);
  });
});

describe("the README's version pins", () => {
  it("name this package's major version, never an older one: a CDN address says @2 once the package is 2.x", () => {
    const major = pkg.version.split(".")[0];
    const pins = read("README.md")
      .split(`${pkg.name}@`)
      .slice(1)
      .map((rest) => /^\d+/.exec(rest)?.[0])
      .filter((pin) => pin !== undefined);
    for (const pin of pins) expect(pin, `${pkg.name}@${pin} in README.md`).toBe(major);
  });
});

describe("the release notes", () => {
  it("are the changelog's section for the version, which the Release workflow puts on the GitHub release", () => {
    const log = "# Changelog\n\n## [Unreleased]\n\n## [1.2.0] - 2026-01-02\n\n### Added\n\n- A thing.\n\n## [1.1.0] - 2026-01-01\n\n- Older.\n\n[Unreleased]: https://example.test\n";
    expect(releaseNotes(log, "1.2.0")).toBe("### Added\n\n- A thing.");
    expect(releaseNotes(log, "1.1.0")).toBe("- Older.");
    expect(releaseNotes(log, "9.9.9")).toBeNull();
    // Until a version is published its notes are under [Unreleased]; the release takes the heading with the version and the date.
    const notes = releaseNotes(read("CHANGELOG.md"), pkg.version) ?? releaseNotes(read("CHANGELOG.md"), "Unreleased");
    expect(notes?.length, `CHANGELOG.md has nothing under ## [${pkg.version}] or ## [Unreleased]`).toBeGreaterThan(40);
    const workflow = read(".github/workflows/release.yml");
    expect(workflow).toContain("scripts/release-notes.mjs");
    expect(workflow).not.toContain("See CHANGELOG.md.");
  });

  it("come from a changelog in Keep a Changelog form: an Unreleased heading, then each version in brackets with its date", () => {
    const log = read("CHANGELOG.md");
    expect(log).toContain("\n## [Unreleased]\n");
    // Before the first release there is no versioned heading yet, only Unreleased.
    if (/^## \[\d/m.test(log)) expect(log).toMatch(/^## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}$/m);
    expect(log).not.toMatch(/^## \d/m);
  });
});

describe("Node", () => {
  it("is 22 or later: engines, the CI matrix, and the words in the README and CONTRIBUTING", () => {
    expect(pkg.engines.node).toBe(">=22");
    expect(read(".github/workflows/ci.yml")).toMatch(/node: \[22, 24\]/);
    expect(read(".github/workflows/ci.yml")).not.toMatch(/node: \[[^\]]*\b(18|20)\b/);
    for (const file of ["README.md", "CONTRIBUTING.md"]) expect(read(file), file).not.toMatch(/\bNode(\.js)? (v)?(18|20)\b|>= ?20\b/);
  });
});
