// Builds the static demo for GitHub Pages into ./site: the page, the API reference made from the source, and the compiled library.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

import { API_CSS, apiPage } from "./api.mjs";

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
cpSync("demo", "site", { recursive: true });
cpSync("dist", "site/dist", { recursive: true });
// The API reference: every export of every entry point.
writeFileSync("site/api.css", API_CSS);
writeFileSync("site/api.html", apiPage({ id: "narabe", name: "Narabe", kana: "並べ" }));
console.log("site/ is ready: serve it, or let the Pages workflow publish it.");
