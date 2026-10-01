#!/usr/bin/env node
// The command line: `narabe`. All of it is `runCli`, a pure function in the
// package; these lines hand it the real process.
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import process from "node:process";

import { runCli } from "../dist/cli.js";

const args = process.argv.slice(2);
let stdin;
if (args.includes("--stdin")) {
  // Read as a stream, which waits for a pipe's writer; a synchronous read of a pipe that is still empty fails.
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  stdin = Buffer.concat(chunks).toString("utf8");
}
const result = runCli(args, {
  env: process.env,
  stdin,
  readFile: (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  },
  locale: Intl.DateTimeFormat().resolvedOptions().locale,
  seed: () => 1 + Math.floor(Math.random() * 2_147_483_646),
});
// A reader that closes early (`| head`) is not an error.
process.stdout.on("error", (error) => {
  if (error.code !== "EPIPE") throw error;
});
if (result.out !== "") process.stdout.write(result.out);
if (result.err !== "") process.stderr.write(result.err);
process.exitCode = result.code;
