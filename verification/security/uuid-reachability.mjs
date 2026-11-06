import fs from "node:fs";
import path from "node:path";

const root = path.resolve("node_modules/exceljs/lib");
if (!fs.existsSync(root)) throw new Error("ExcelJS library directory not installed");
const importPattern = /require\s*\(\s*["']uuid["']\s*\)|\bfrom\s*["']uuid["']/g;
const apiPattern = /\b(?:uuid|UUID)\s*(?:\.\s*v[356]\b|\[\s*["']v[356]["']\s*\])|\b(?:uuidv[356]|uuidV[356])\s*\(/g;
const results = [];
let inspected = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(filename); continue; }
    if (!entry.isFile() || !/\.[cm]?js$/.test(entry.name)) continue;
    inspected++;
    const lines = fs.readFileSync(filename, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const imported = importPattern.test(line);
      const sensitive = apiPattern.test(line);
      importPattern.lastIndex = 0;
      apiPattern.lastIndex = 0;
      if (imported || sensitive) results.push({
        path: path.relative(root, filename).replaceAll(path.sep, "/"),
        line: index + 1, imported, sensitive, text: line.trim().slice(0, 240),
      });
    });
  }
}
walk(root);
const report = {
  scope: "Installed ExcelJS 4.4.0 lib JavaScript files; static source search only",
  inspectedFiles: inspected,
  hits: results,
  conclusion: "STATIC_SCREEN_ONLY; no proof of bundled code reachability or exploit absence",
};
fs.mkdirSync("work/ci", { recursive: true });
fs.writeFileSync("work/ci/uuid-reachability.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
