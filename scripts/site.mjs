// Builds the static demo for GitHub Pages into ./site: the table's page and the API reference, each put together
// from the family's shared header and footer (scripts/family-template.mjs, which every package shares unchanged)
// and this package's own body, the two stylesheets, and the compiled library.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { apiBody } from "./api.mjs";
import { FAMILY_SCRIPT, familyFooter, familyHead, familyHeader, familyUnreviewed } from "./family-template.mjs";

const id = "narabe";
const icon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23dcb67a'/%3E%3Ccircle cx='11' cy='16' r='7' fill='%231d1b19'/%3E%3Ccircle cx='22' cy='16' r='7' fill='%23fbfaf6' stroke='%231d1b19'/%3E%3C/svg%3E`;
const frame = ({ title, description, links, body, scripts }) => `<!doctype html>
<html lang="en">
  <head>
    ${familyHead({ id, title, description, ogTitle: "Narabe 並べ: forty-eight board games", ogDescription: "Pick any of forty-eight abstract board games and play it on one screen, on one rules engine." })}
    <link rel="icon" href="${icon}" />
    <link rel="stylesheet" href="family.css" />
    <link rel="stylesheet" href="narabe.css" />
  </head>
  <body>
    <main>
      ${familyHeader({ id, links })}
${body}
      ${familyFooter({ id })}
    </main>
    <script>${FAMILY_SCRIPT}</script>
    ${scripts}
  </body>
</html>
`;

rmSync("site", { recursive: true, force: true });
mkdirSync("site", { recursive: true });
for (const file of ["family.css", "narabe.css", "page.js", "games.js"]) cpSync(`demo/${file}`, `site/${file}`);
cpSync("dist", "site/dist", { recursive: true });

writeFileSync(
  "site/index.html",
  frame({
    title: "Narabe · forty-eight board games, one rules engine",
    description: "Pick any of forty-eight abstract board games and play it on one screen: gomoku, renju, Connect Four, Reversi, Hex, Go, Halma, Chinese Checkers, checkers and draughts. Every rule runs on Narabe, a TypeScript rules engine. In English and Japanese.",
    links: [{ href: "api.html", say: "pageApi" }],
    body: readFileSync("demo/body.html", "utf8").replace("__UNREVIEWED__", familyUnreviewed({ id })).trimEnd(),
    scripts: `<script type="module" src="page.js"></script>`,
  }),
);

const api = apiBody();
writeFileSync(
  "site/api.html",
  frame({
    title: "Narabe API reference: every export, with its signature",
    description: "The API reference of the Narabe package: every export of every entry point, with its signature and its documentation, made from the source.",
    links: [{ href: "./", say: "pageBack" }],
    body: `      ${api.html}\n      ${familyUnreviewed({ id })}`,
    scripts: `<script type="module">
      const words = (pitch, back, name, nameLink, foot) => ({ pitch, pageBack: back, name, nameLink, foot });
      familyLanguage({
        id: "narabe",
        words: {
          en: words("Every export of every entry point, with its signature and its doc comment. Made from the source when the site is built, so it cannot fall behind the code.", "The games", "Narabe is Japanese for “line them up”: the verb in gomoku-narabe, five in a row.", "About the name", "Made by John Morris for Itsutsu."),
          ja: words("すべてのエントリポイントのすべてのエクスポートを、シグネチャとドキュメントコメントつきで載せています。サイトをビルドするときにソースから作るので、コードとずれません。", "ゲーム", "「並べ」は、五目並べの「並べ」。石を並べる、という意味です。", "名前について（英語）", "John Morris が Itsutsu のために作りました。"),
        },
      });
    </script>`,
  }),
);
console.log(`site/ is ready (${api.total} exports in api.html): serve it, or let the Pages workflow publish it.`);
