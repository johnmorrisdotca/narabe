// Proves the claim in the README: the packed package works in React, Vue, Svelte, Angular and a
// plain page, with nothing for the consumer to configure. The code it builds is the README's own:
// each example under "Use it in your project" is lifted from the page as it is written, so what a
// reader copies is what was proved. It packs the package, makes a small project for each in a
// scratch folder, installs the tarball and each framework's own tools there (never here: the
// package has no dependencies), and builds it. With NARABE_BROWSER=1 it also opens each built
// page in Chromium and WebKit and looks at the board it draws, and in React plays a move.
//
//   pnpm build && NARABE_BROWSER=1 node scripts/check-frameworks.mjs [scratch folder]
//
// Run it before a release that names a framework. It needs the network and a few minutes.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import process from "node:process";

const root = resolve(process.argv[2] ?? mkdtempSync(join(tmpdir(), "narabe-frameworks-")));
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
const run = (cwd, command, args) =>
  execFileSync(command, args, {
    cwd,
    stdio: "pipe",
    shell: process.platform === "win32",
    env: { ...process.env, NG_CLI_ANALYTICS: "false" },
  }).toString();
const write = (dir, files) => {
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), typeof text === "string" ? text : JSON.stringify(text, null, 2));
  }
};

run(process.cwd(), "npm", ["pack", "--ignore-scripts", "--pack-destination", root]);
const tarball = join(
  root,
  readdirSync(root).find((name) => name.endsWith(".tgz")),
);
const narabe = `file:${tarball}`;
const page = (body) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>narabe</title></head><body>${body}</body></html>`;
// The README's examples, by the heading each stands under.
const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
function example(heading, lang) {
  const from = readme.indexOf(heading);
  const found = from < 0 ? null : new RegExp(`^\`\`\`${lang}\\n([\\s\\S]*?)^\`\`\`$`, "m").exec(readme.slice(from));
  if (found === null) throw new Error(`the README has no ${lang} example under “${heading}”`);
  return found[1];
}
const VITE = { vite: "^7.0.0" };
const PICKS = { dep: { "@johnmorrisdotca/narabe": narabe } };

const projects = {
  // The tag, with Vue told about it by the README's own compiler option.
  vue: {
    out: "dist",
    files: {
      "package.json": {
        name: "check-vue",
        private: true,
        type: "module",
        dependencies: { ...PICKS.dep, vue: "^3.5.0" },
        devDependencies: { ...VITE, "@vitejs/plugin-vue": "^6.0.0" },
      },
      "vite.config.js": example("### In Vue", "js no-check").replace(
        "export default { plugins:",
        'export default { base: "./", plugins:',
      ),
      "index.html": page(`<div id="app"></div><script type="module" src="/src/main.js"></script>`),
      "src/main.js": `import { createApp } from "vue";\nimport App from "./App.vue";\ncreateApp(App).mount("#app");\n`,
      "src/App.vue": example("### In Vue", "vue"),
    },
  },
  svelte: {
    out: "dist",
    files: {
      "package.json": {
        name: "check-svelte",
        private: true,
        type: "module",
        dependencies: { ...PICKS.dep, svelte: "^5.0.0" },
        devDependencies: { ...VITE, "@sveltejs/vite-plugin-svelte": "^6.0.0" },
      },
      "vite.config.js": `import { svelte } from "@sveltejs/vite-plugin-svelte";\nexport default { base: "./", plugins: [svelte()] };\n`,
      "index.html": page(`<div id="app"></div><script type="module" src="/src/main.js"></script>`),
      "src/main.js": `import { mount } from "svelte";\nimport App from "./App.svelte";\nmount(App, { target: document.getElementById("app") });\n`,
      "src/App.svelte": example("### In Svelte", "svelte"),
    },
  },
  angular: {
    out: "dist/check-angular/browser",
    files: {
      "package.json": {
        name: "check-angular",
        private: true,
        dependencies: {
          ...PICKS.dep,
          "@angular/common": "^20.0.0",
          "@angular/compiler": "^20.0.0",
          "@angular/core": "^20.0.0",
          "@angular/platform-browser": "^20.0.0",
          rxjs: "^7.8.0",
          tslib: "^2.8.0",
        },
        devDependencies: {
          "@angular/build": "^20.0.0",
          "@angular/cli": "^20.0.0",
          "@angular/compiler-cli": "^20.0.0",
          typescript: "~5.8.0",
        },
      },
      "angular.json": {
        version: 1,
        projects: {
          "check-angular": {
            projectType: "application",
            root: "",
            sourceRoot: "src",
            architect: {
              build: {
                builder: "@angular/build:application",
                options: {
                  outputPath: "dist/check-angular",
                  index: "src/index.html",
                  browser: "src/main.ts",
                  tsConfig: "tsconfig.json",
                  baseHref: "./",
                },
                configurations: { production: {} },
                defaultConfiguration: "production",
              },
            },
          },
        },
      },
      "tsconfig.json": {
        compilerOptions: {
          target: "ES2022",
          module: "ES2022",
          moduleResolution: "bundler",
          strict: true,
          experimentalDecorators: true,
          skipLibCheck: true,
          lib: ["ES2022", "dom"],
        },
        files: ["src/main.ts"],
      },
      "src/index.html": page(`<app-board></app-board>`),
      "src/main.ts": `import { provideZonelessChangeDetection } from "@angular/core";\nimport { bootstrapApplication } from "@angular/platform-browser";\n${example("### In Angular", "ts no-check")}\nvoid bootstrapApplication(BoardComponent, { providers: [provideZonelessChangeDetection()] });\n`,
    },
  },
  // The hook, with the board drawn by boardSvg.
  react: {
    out: "dist",
    files: {
      "package.json": {
        name: "check-react",
        private: true,
        type: "module",
        dependencies: { ...PICKS.dep, react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: { ...VITE, "@vitejs/plugin-react": "^5.0.0" },
      },
      "vite.config.js": `import react from "@vitejs/plugin-react";\nexport default { base: "./", plugins: [react()] };\n`,
      "index.html": page(`<div id="app"></div><script type="module" src="/src/main.jsx"></script>`),
      "src/App.jsx": example("### In React", "tsx"),
      "src/main.jsx": `import { createRoot } from "react-dom/client";
import { Reversi } from "./App.jsx";

createRoot(document.getElementById("app")).render(<Reversi />);
`,
    },
  },
  // No framework and no bundler: the script tag and the files as they are published.
  plain: {
    out: ".",
    build: (dir) => {
      run(dir, "npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts"]);
      cpSync(join(dir, "node_modules/@johnmorrisdotca/narabe"), join(dir, "narabe"), {
        recursive: true,
        dereference: true,
      });
      rmSync(join(dir, "node_modules"), { recursive: true, force: true });
    },
    files: {
      "package.json": { name: "check-plain", private: true, dependencies: PICKS.dep },
      "index.html": page(
        example("### In plain HTML", "html").replace(
          "https://cdn.jsdelivr.net/npm/@johnmorrisdotca/narabe@1/dist/element-define.js",
          "./narabe/dist/element-define.js",
        ),
      ),
    },
  },
};

const only = process.env.NARABE_FRAMEWORKS?.split(",");
const built = [];
for (const [name, project] of Object.entries(projects)) {
  if (only !== undefined && !only.includes(name)) continue;
  const dir = join(root, name);
  write(dir, project.files);
  const started = Date.now();
  try {
    if (project.build !== undefined) project.build(dir);
    else {
      run(dir, "npm", ["install", "--no-audit", "--no-fund"]);
      run(dir, "npx", name === "angular" ? ["ng", "build"] : ["vite", "build"]);
    }
    if (!existsSync(join(dir, project.out, "index.html"))) throw new Error(`no index.html in ${project.out}`);
    built.push([name, join(dir, project.out)]);
    console.log(`built   ${name.padEnd(8)} in ${Math.round((Date.now() - started) / 1000)} s`);
  } catch (error) {
    console.log(
      `FAILED  ${name}: ${String(error.stderr ?? error.stdout ?? error.message)
        .split("\n")
        .slice(-12)
        .join("\n")}`,
    );
    process.exitCode = 1;
  }
}

// Open each built page in a browser: the board has to be drawn, and the React page has to play a move.
if (process.env.NARABE_BROWSER !== undefined) {
  const { chromium, webkit } = createRequire(import.meta.url)(
    process.env.NARABE_BROWSER === "1" ? "@playwright/test" : process.env.NARABE_BROWSER,
  );
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
  };
  for (const [engine, launcher] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await launcher.launch();
    for (const [name, out] of built) {
      const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
      const tab = await context.newPage();
      const errors = [];
      tab.on("pageerror", (error) => errors.push(String(error)));
      await tab.route("http://check.test/**", (route) => {
        let file = join(out, decodeURIComponent(new globalThis.URL(route.request().url()).pathname));
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
        if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
        return route.fulfill({
          body: readFileSync(file),
          contentType: types[extname(file)] ?? "application/octet-stream",
        });
      });
      await tab.goto("http://check.test/");
      await tab.waitForSelector("svg", { timeout: 60000 });
      const stones = () => tab.locator("svg circle").count();
      const before = await stones();
      let note = `drew the board with ${before} round marks`;
      let moved = true;
      if (name === "react") {
        await tab.locator("#play").click();
        await tab.waitForTimeout(200);
        moved = (await tab.locator("svg").count()) === 1 && (await stones()) !== before;
        note += `, then ${await stones()} after a move`;
      }
      const ok = errors.length === 0 && moved;
      console.log(`${ok ? "drawn  " : "FAILED "} ${name.padEnd(8)} in ${engine}: ${note}${errors.length > 0 ? ` ${errors.join("; ")}` : ""}`);
      if (!ok) process.exitCode = 1;
      await context.close();
    }
    await browser.close();
  }
}
console.log(`scratch projects are in ${root}`);
