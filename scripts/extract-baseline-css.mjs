import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const htmlUrl = new URL("../reference/UI_BASELINE_v17_FROZEN.html", import.meta.url);
const cssUrl = new URL("../src/ui/styles.css", import.meta.url);
const html = readFileSync(htmlUrl, "utf8");
const start = html.indexOf("<style>");
const end = html.indexOf("</style>");
if (start < 0 || end < start) {
  throw new Error("Frozen HTML is missing its style block.");
}
const css = html.slice(start + "<style>".length, end);
mkdirSync(new URL("../src/ui/", import.meta.url), { recursive: true });
writeFileSync(cssUrl, css);
console.log(`Wrote ${css.length} characters to src/ui/styles.css`);
