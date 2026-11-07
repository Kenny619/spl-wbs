import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uuid-screen-"));
const runner = fileURLToPath(new URL("./uuid-reachability.mjs", import.meta.url));
function run(name, source, expectedGate) {
  const root = path.join(dir, name);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "test.js"), source);
  const output = path.join(dir, name + ".json");
  const exec = spawnSync(process.execPath, [runner], {
    encoding: "utf8", env: { ...process.env, UUID_SCAN_ROOT: root, UUID_REPORT_PATH: output },
  });
  const report = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(report.gate, expectedGate, name);
  assert.equal(exec.status === 0, expectedGate === "PASS_BOUNDED_SOURCE_GATE", name);
}
try {
  run("approved-v4", "const {v4: uuidv4} = require('uuid');\nconst value = uuidv4();", "PASS_BOUNDED_SOURCE_GATE");
  run("unexpected-v3", "const {v3: make} = require('uuid');\nconst value = make('x', 'y', new Uint8Array(1), 0);", "BLOCKED_REVIEW_REQUIRED");
  run("unexpected-namespace", "const uuid = require('uuid');\nconst value = uuid.v5('x', 'y');", "BLOCKED_REVIEW_REQUIRED");
  run("missing-uuid", "const value = 'no import';", "BLOCKED_REVIEW_REQUIRED");
  console.log("UUID source-screen negative/positive fixtures: 4 PASS");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
