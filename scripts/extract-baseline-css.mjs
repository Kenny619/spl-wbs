import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

// Inspection artifact only: do not overwrite maintained production CSS or a reference.
const manifest = JSON.parse(readFileSync(new URL("../reference/baseline-manifest.json", import.meta.url), "utf8"));
const bytes = readFileSync(new URL(`../${manifest.candidate.path}`, import.meta.url));
if (createHash("sha256").update(bytes).digest("hex") !== manifest.candidate.sha256) throw new Error("v18 integrity mismatch");
const styles = [...bytes.toString("utf8").matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]);
if (!styles.length) throw new Error("Approved v18 has no styles");
const directory = new URL("../work/", import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL("v18-reference-styles.css", directory), styles.join("\n"));
console.log("Extracted approved v18 styles to work/v18-reference-styles.css for inspection.");
