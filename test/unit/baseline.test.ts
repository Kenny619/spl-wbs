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

const V18_SHA256 = "375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83";
const V17_SHA256 = "5e6f438fb3817e253984a806bb5bccd4d82f3f14e93d0d03e6eaf5ada2fb84d7";

describe("reviewed v18 migration candidate integrity", () => {
  const manifest = JSON.parse(readFileSync("reference/baseline-manifest.json", "utf8"));
  const candidate = readFileSync(manifest.candidate.path);

  it("pins the exact supplied compiled viewer without claiming v17 equivalence", () => {
    expect(manifest.candidate.sha256).toBe(V18_SHA256);
    expect(createHash("sha256").update(candidate).digest("hex")).toBe(V18_SHA256);
    expect(readFileSync(manifest.candidate.sourcePath).equals(candidate)).toBe(true);
    expect(manifest.candidate.sourceCommit).toBe("f216bec4b7e5677a3c21a1d8aa16d87097790d11");
    expect(manifest.status).toBe("approved-current-v18-baseline");
    expect(manifest.poVisualUat.status).toBe("accepted-as-visual-target");
    expect(manifest.poVisualUat.reviewedPackageCommit).toBe("eab90573d600e47a544269a67af7ac7aa98f7941");
  });

  it("preserves the historical v17 approval and explicitly records unavailable integrity", () => {
    expect(manifest.historical.sha256).toBe(V17_SHA256);
    expect(manifest.historical.integrity).toBe("unverified-original-bytes-unavailable");
    for (const file of ["baseline.test.ts", "calendar.test.ts", "baseline.spec.ts"]) {
      const archived = readFileSync(`test/historical/v17/${file}`);
      expect(archived.toString("utf8")).toContain("reference/UI_BASELINE_v17_FROZEN.html");
      expect(createHash("sha256").update(archived).digest("hex")).toBe(manifest.historical.testSha256[file]);
    }
    expect(readFileSync("README.md", "utf8")).toContain(V17_SHA256);
  });

  it("guards reviewed v18 implementation CSS separately from reference identity", () => {
    expect(createHash("sha256").update(readFileSync(manifest.productStyles.path)).digest("hex"))
      .toBe(manifest.productStyles.sha256);
    const styles = readFileSync(manifest.productStyles.path, "utf8");
    expect(styles).toContain("--row:38px");
    expect(styles).toContain(".pgcm-day-column");
    expect(styles).toContain(".row-chevron");
  });

  it("checks the independently extracted holiday snapshot against the pinned v18 bytes", () => {
    const literal = candidate.toString("utf8").match(/\{"2026-01-01"[^{}]*\}/)?.[0];
    expect(literal).toBeDefined();
    expect(JSON.parse(literal!)).toEqual(JSON.parse(readFileSync("reference/v18-holidays.json", "utf8")));
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
