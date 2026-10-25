import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html");
const text = html.toString("utf8");
if (/<script\b[^>]*\bsrc=/i.test(text)) {
  throw new Error("dist/index.html loads an external script.");
}
if (/<link\b[^>]*\bhref=["']https?:/i.test(text)) {
  throw new Error("dist/index.html loads an external stylesheet.");
}
if (text.includes("fonts.googleapis.com")) {
  throw new Error("dist/index.html requests a Google font.");
}
const hash = createHash("sha256").update(html).digest("hex");
writeFileSync("dist/SHA256.txt", `${hash}  dist/index.html\n`);
console.log(hash);
