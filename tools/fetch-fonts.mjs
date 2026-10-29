// One-off: downloads latin woff2 subsets from Google Fonts and writes
// styles/fonts.css with local @font-face rules.
// Run: node tools/fetch-fonts.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const API =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Nunito:wght@400;600;700&family=Caveat:wght@500;700&display=swap";

const css = await (await fetch(API, { headers: { "User-Agent": UA } })).text();

const blocks = css.split("/*").map((b) => "/*" + b);
const jobs = [];
for (const b of blocks) {
  if (!b.startsWith("/* latin */")) continue;
  const family = /font-family:\s*'([^']+)'/.exec(b)?.[1];
  const style = /font-style:\s*(\w+)/.exec(b)?.[1];
  const weight = /font-weight:\s*(\d+)/.exec(b)?.[1];
  const url = /url\((https:[^)]+)\)/.exec(b)?.[1];
  if (!family || !url) continue;
  const slug = `${family.toLowerCase().replace(/\s+/g, "-")}-${weight}${
    style === "italic" ? "-italic" : ""
  }.woff2`;
  jobs.push({ family, style, weight, url, slug });
}

mkdir(new URL("../fonts/", import.meta.url), { recursive: true });
let out = `/* Self-hosted latin subsets: Fraunces + Nunito + Caveat - SIL Open Font License 1.1 */\n`;
const seen = new Map();
for (const j of jobs) {
  const buf = Buffer.from(
    await (await fetch(j.url, { headers: { "User-Agent": UA } })).arrayBuffer()
  );
  const sha = createHash("sha1").update(buf).digest("hex");
  if (seen.has(sha)) {
    out += `@font-face{font-family:'${j.family}';font-style:${j.style};font-weight:${j.weight};font-display:swap;src:url('../fonts/${seen.get(
      sha
    )}') format('woff2');}\n`;
    continue;
  }
  seen.set(sha, j.slug);
  await writeFile(new URL(`../fonts/${j.slug}`, import.meta.url), buf);
  out += `@font-face{font-family:'${j.family}';font-style:${j.style};font-weight:${j.weight};font-display:swap;src:url('../fonts/${j.slug}') format('woff2');}\n`;
  console.log("saved", j.slug, buf.length);
}
await writeFile(new URL("../styles/fonts.css", import.meta.url), out);
console.log("wrote styles/fonts.css");
