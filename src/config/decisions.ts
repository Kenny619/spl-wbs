/**
 * Product decisions confirmed on 2026-10-25.
 * Later phases import these constants. Do not reopen them without explicit approval.
 */

/** Phase 1 spikes both packages on the fixture set, then locks one. */
export const PARSER_CANDIDATES = ["exceljs", "xlsx@0.18.5"] as const;

/**
 * Locked after the Phase 1 spike. xlsx@0.18.5 is smaller and keeps raw serials,
 * and it also has high-severity prototype-pollution and ReDoS advisories.
 * ExcelJS needs a date1904 attribute normalization and a 1900-system leap-bug
 * correction, both covered by unit tests.
 */
export const LOCKED_PARSER = "exceljs@4.4.0" as const;

/**
 * Multiply a progress cell by 100 only when its Excel number format is percent.
 * Every other numeric value must already be inside 0..100.
 */
export const PROGRESS_MAPPING = "excel-percent-format-or-0-to-100" as const;

export const FATAL_IMPORT_ERRORS = [
  "blank-id",
  "duplicate-id",
  "cycle",
  "duplicate-wbs",
  "missing-parent",
  "missing-required",
  "unparseable-date",
  "ambiguous-workbook-sheet",
  "unreadable-workbook",
  "ambiguous-header",
  "invalid-task-type",
] as const;

export const IMPORT_WARNINGS = [
  "blank-dates",
  "normalized-blank-owner-status-workstream",
  "unknown-predecessor",
  "non-id-predecessor-token",
  "milestone-date-mismatch",
  "single-sheet-fallback",
  "invalid-progress",
  "rejected-item-url",
  "invalid-sort-order",
  "invalid-modified",
] as const;

export const PREFERRED_SHEET = "ProjectWBS";
export const HEADER_ROW = 1;

/** Split predecessor cells on comma, semicolon, or whitespace. Keep known ids only. */
export const PREDECESSOR_SEPARATOR = /[,;\s]+/;

/** Use one milestone date, or both when they are equal. Differing dates draw no bar. */
export const MILESTONE_DATE_POLICY = "single-or-equal" as const;

/** HTTPS ItemURL values are enabled only for these exact SharePoint hostnames. */
export const SHAREPOINT_HOSTS: readonly string[] = ["pmicloud.sharepoint.com"];

export const PROJECT_TITLE_SOURCE = "file-name" as const;
export const CHROME_EYEBROW = "Portfolio / Project Delivery";
export const CHROME_SUBTITLE = "Project schedule overview · WBS visualization";

/** Real imports expand depth-1 nodes. Screenshot fixtures pin the mock's id set. */
export const INITIAL_EXPANSION_DEPTH = 1;
export const BASELINE_EXPANDED_IDS = [1, 5, 7, 12, 17, 21] as const;

/** Keep a non-blank imported summary status. Blank status normalizes to Unknown. */
export const SUMMARY_STATUS_POLICY = "keep-imported-when-present" as const;
export const NEEDS_ATTENTION_EXCLUDES_SUMMARIES = true;

/** Name-to-slot map only. Task rows stay in memory. */
export const PALETTE_PERSISTENCE = "session-storage-map-only" as const;
export const LEGEND_POLICY = "wrap-every-assigned-workstream" as const;

export const TODAY_REMAINING_LABEL = "0 day";
export const FUTURE_REMAINING_LABEL = "+n days";

export const HOLIDAY_SNAPSHOT_STATUS = "provisional-pending-verification" as const;

/** Preserve v17 keyboard behavior until this phase closes the P0 gap. */
export const KEYBOARD_COMPLETION_PHASE = 5;

/** Noon JST on the approval date. Screenshot tests freeze the page clock here. */
export const SCREENSHOT_CLOCK_UTC = "2026-10-25T03:00:00.000Z";
