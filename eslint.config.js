import js from "@eslint/js";
import tseslint from "typescript-eslint";

const browser = Object.fromEntries(["document", "window", "location", "history", "navigator", "console", "URLSearchParams", "familyLanguage", "localStorage", "URL", "Option", "setTimeout", "history"].map((name) => [name, "readonly"]));

export default tseslint.config(
  { ignores: [".readme-examples/", "dist/", "site/", "node_modules/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: { console: "readonly" } } },
  { files: ["scripts/readme-pictures.mjs"], languageOptions: { globals: { console: "readonly", process: "readonly", URL: "readonly", document: "readonly", window: "readonly", getComputedStyle: "readonly" } } },
  { files: ["e2e/**/*.mjs", "playwright.config.mjs"], languageOptions: { globals: { console: "readonly", URL: "readonly", document: "readonly", window: "readonly", getComputedStyle: "readonly" } } },
  { files: ["demo/**/*.js"], languageOptions: { globals: browser } },
  { files: ["scripts/readme-pictures.mjs", "scripts/readme-pictures-lib.mjs"], languageOptions: { globals: { console: "readonly", process: "readonly", window: "readonly", document: "readonly", localStorage: "readonly", getComputedStyle: "readonly", URL: "readonly" } }, rules: { "no-redeclare": ["error", { builtinGlobals: false }] } },
);
