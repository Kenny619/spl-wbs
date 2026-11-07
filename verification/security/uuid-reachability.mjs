import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.UUID_SCAN_ROOT ?? "node_modules/exceljs/lib");
const reportPath = path.resolve(process.env.UUID_REPORT_PATH ?? "work/ci/uuid-reachability.json");
if (!fs.existsSync(root)) throw new Error("ExcelJS library directory not installed");
const importPattern = /require\s*\(\s*["']uuid["']\s*\)|\bfrom\s*["']uuid["']/g;
const apiPattern = /\b(?:uuid|UUID)\s*(?:\.\s*v[356]\b|\[\s*["']v[356]["']\s*\])|\b(?:uuidv[356]|uuidV[356])\s*\(/g;
const results = [];
const violations = [];
let inspected = 0;
let uuidImports = 0;
const allowlistedUuidImport = /^const\s*\{\s*v4\s*:\s*uuidv4\s*\}\s*=\s*require\(['"]uuid['"]\);?$/;
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
      if (imported) {
        uuidImports++;
        if (!allowlistedUuidImport.test(line.trim())) {
          violations.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"), line: index + 1, reason: "UNREVIEWED_UUID_IMPORT" });
        }
      }
      if (sensitive) {
        violations.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"), line: index + 1, reason: "AFFECTED_UUID_API_PATTERN" });
      }
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
  directUuidImportCount: uuidImports,
  hits: results,
  violations,
  gate: violations.length === 0 && uuidImports === 1 ? "PASS_BOUNDED_SOURCE_GATE" : "BLOCKED_REVIEW_REQUIRED",
  conclusion: "STATIC_SCREEN_ONLY; no proof of bundled code reachability or exploit absence",
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.gate !== "PASS_BOUNDED_SOURCE_GATE") {
  console.error("Unreviewed UUID import/call shape or missing expected v4 import; CI source screen blocked.");
  process.exitCode = 1;
}
