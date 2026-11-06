import { readFile, writeFile } from "node:fs/promises";

/**
 * Build a standalone managed entrypoint from the *same* approved v18 markup.
 * No copied 120KB HTML fork and no modifications to the read-only page.
 */
const source = await readFile("index.html", "utf8");
const original = '<script type="module" src="/src/main.ts"></script>';
if (!source.includes(original)) throw new Error("Read-only entrypoint marker changed");
const managed = source
  .replace(/<title>Gantt Viewer<\/title>/, "<title>SPT-WBS · Excel Managed</title>")
  .replace(original, '<script type="module" src="/src/managed/main.ts"></script>');
await writeFile("managed.html", managed, "utf8");
console.log("Prepared managed.html from current approved viewer markup");