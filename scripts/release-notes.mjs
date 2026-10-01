// The notes of one release, taken from CHANGELOG.md: what the Release workflow puts on the GitHub release.
//
//   node scripts/release-notes.mjs 1.7.0 > notes.md
//
// It prints the text under `## [1.7.0]`, up to the next version's heading or the link list at the foot, and exits
// with an error, printing nothing, when the changelog has no such version or nothing is written under it.
import { readFileSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";
import process from "node:process";

/** The text a changelog has under one version's heading, or `null` when there is none. */
export function releaseNotes(changelog, version) {
  const lines = changelog.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## [") || /^\[[^\]]+\]: /.test(line));
  const text = (end < 0 ? rest : rest.slice(0, end)).join("\n").trim();
  return text === "" ? null : text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];
  const notes = version === undefined ? null : releaseNotes(readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8"), version);
  if (notes === null) {
    console.error(`CHANGELOG.md has nothing written under ## [${version}]`);
    process.exit(1);
  }
  console.log(notes);
}
