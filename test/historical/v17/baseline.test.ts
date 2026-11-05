import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCAFFOLD_PHASE } from "../../src/main";
import {
  BASELINE_EXPANDED_IDS,
  FATAL_IMPORT_ERRORS,
  HEADER_ROW,
  HOLIDAY_SNAPSHOT_STATUS,
  KEYBOARD_COMPLETION_PHASE,
  MILESTONE_DATE_POLICY,
  PALETTE_PERSISTENCE,
  LOCKED_PARSER,
  PARSER_CANDIDATES,
  PREFERRED_SHEET,
  PREDECESSOR_SEPARATOR,
  PROGRESS_MAPPING,
  PROJECT_TITLE_SOURCE,
  SCREENSHOT_CLOCK_UTC,
  SHAREPOINT_HOSTS,
  SUMMARY_STATUS_POLICY,
} from "../../src/config/decisions";

const EXPECTED_SHA256 = "5e6f438fb3817e253984a806bb5bccd4d82f3f14e93d0d03e6eaf5ada2fb84d7";

function extractStyle(html: string): string {
  const start = html.indexOf("<style>");
  const end = html.indexOf("</style>");
  if (start < 0 || end < start) {
    throw new Error("Frozen HTML is missing its style block.");
  }
  return html.slice(start + "<style>".length, end);
}

describe("frozen baseline", () => {
  const html = readFileSync("reference/UI_BASELINE_v17_FROZEN.html");
  const readme = readFileSync("README.md", "utf8");

  it("matches the approved SHA-256 published in the README", () => {
    const hash = createHash("sha256").update(html).digest("hex");
    expect(readme.toLowerCase()).toContain(EXPECTED_SHA256);
    expect(hash).toBe(EXPECTED_SHA256);
  });

  it("keeps the extracted stylesheet identical to the frozen style block", () => {
    const extracted = readFileSync("src/ui/styles.css", "utf8");
    expect(extracted).toBe(extractStyle(html.toString("utf8")));
    expect(extracted).toContain("--row:38px");
    expect(extracted).toContain(".pgcm-day-column");
    expect(extracted).toContain(".row-chevron");
  });
});

describe("confirmed decisions", () => {
  it("records the Phase 5 release check and the locked choices", () => {
    expect(SCAFFOLD_PHASE).toBe(5);
    expect(PARSER_CANDIDATES).toEqual(["exceljs", "xlsx@0.18.5"]);
    expect(LOCKED_PARSER).toBe("exceljs@4.4.0");
    expect(PROGRESS_MAPPING).toBe("excel-percent-format-or-0-to-100");
    expect(FATAL_IMPORT_ERRORS).toContain("cycle");
    expect(FATAL_IMPORT_ERRORS).toContain("ambiguous-workbook-sheet");
    expect(PREFERRED_SHEET).toBe("ProjectWBS");
    expect(HEADER_ROW).toBe(1);
    expect("12FS".split(PREDECESSOR_SEPARATOR).filter(Boolean)).toEqual(["12FS"]);
    expect("8, 9;10".split(PREDECESSOR_SEPARATOR).filter(Boolean)).toEqual(["8", "9", "10"]);
    expect(MILESTONE_DATE_POLICY).toBe("single-or-equal");
    expect(SHAREPOINT_HOSTS).toEqual(["pmicloud.sharepoint.com"]);
    expect(PROJECT_TITLE_SOURCE).toBe("file-name");
    expect(BASELINE_EXPANDED_IDS).toEqual([1, 5, 7, 12, 17, 21]);
    expect(SUMMARY_STATUS_POLICY).toBe("keep-imported-when-present");
    expect(PALETTE_PERSISTENCE).toBe("session-storage-map-only");
    expect(HOLIDAY_SNAPSHOT_STATUS).toBe("provisional-pending-verification");
    expect(KEYBOARD_COMPLETION_PHASE).toBe(5);
    expect(new Date(SCREENSHOT_CLOCK_UTC).toISOString()).toBe("2026-10-25T03:00:00.000Z");
  });
});
