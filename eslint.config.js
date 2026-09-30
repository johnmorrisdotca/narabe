import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "site/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: { console: "readonly" } } },
  {
    files: ["demo/**/*.js"],
    languageOptions: {
      globals: { document: "readonly", location: "readonly", history: "readonly", URL: "readonly", URLSearchParams: "readonly", Option: "readonly", setTimeout: "readonly" },
    },
  },
);
