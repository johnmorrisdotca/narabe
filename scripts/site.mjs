// Builds the static demo for GitHub Pages into ./site: the page plus the compiled library.
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
cpSync("dist", "site/dist", { recursive: true });
console.log("site/ is ready: serve it, or let the Pages workflow publish it.");
