import ExcelJS from "exceljs";
import { createBlackout, type BlackoutInterval } from "../calendar/blackout";
import { isInactiveStatus, remainingWorkdays, type RemainingWork } from "../calendar/workdays";
import type { HolidayCalendar } from "../calendar/jpHolidays";
import { inspectProjectData, type ProjectFinding } from "./projectDataInspector";

/**
 * F4a draft: READ-ONLY, verified Excel-owned project context.
 * No browser localStorage, filename-derived authoritative name, mutation,
 * UI attachment, Save As, or multi-user live-sync behavior.
 */
export type ProjectContext =
  | { kind: "legacy"; projectName: null; blackout: null; projectCalendarConfigured: false; findings: [] }
  | { kind: "valid"; projectName: string; blackout: BlackoutInterval; blackoutId: string | null;
      blackoutLabel: string; projectCalendarConfigured: true; findings: [] }
  | { kind: "incompatible" | "unsupported_future"; projectName: null; blackout: null;
      projectCalendarConfigured: false; findings: ProjectFinding[] };

function calendarColumns(sheet: ExcelJS.Worksheet): Record<string, number> {
  const names: Record<string, number> = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, index) => {
    if (typeof cell.value === "string") names[cell.value.trim().toLowerCase()] = index;
  });
  return names;
}

/**
 * Read committed project settings from the exact workbook bytes that were
 * loaded/verified. A malformed partial extension must NEVER become an
 * implied empty blackout or a filename-derived project identity.
 */
export async function readProjectContext(bytes: Uint8Array | ArrayBuffer): Promise<ProjectContext> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  const inspection = inspectProjectData(workbook);
  if (inspection.kind === "legacy") {
    return { kind: "legacy", projectName: null, blackout: null,
      projectCalendarConfigured: false, findings: [] };
  }
  if (inspection.kind !== "valid") {
    return { kind: inspection.kind, projectName: null, blackout: null,
      projectCalendarConfigured: false, findings: inspection.findings };
  }
  // Exact schema already checked by inspectProjectData, including one active
  // range maximum and real date values.
  const sheet = workbook.worksheets.find(x => x.name.toLowerCase() === "projectcalendar")!;
  const columns = calendarColumns(sheet);
  let blackout = createBlackout();
  let blackoutId: string | null = null;
  let blackoutLabel = "";
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (row.getCell(columns.enabled).value !== true) continue;
    blackout = {
      enabled: true,
      start: String(row.getCell(columns.startdate).value),
      end: String(row.getCell(columns.enddate).value),
    };
    blackoutId = String(row.getCell(columns.blackoutid).value);
    blackoutLabel = String(row.getCell(columns.label).value ?? "");
    break;
  }
  return { kind: "valid", projectName: inspection.projectName,
    blackout, blackoutId, blackoutLabel, projectCalendarConfigured: true, findings: [] };
}

/** Never infer shared project identity from a file path or local report preference. */
export function sharedProjectDisplayName(context: ProjectContext): string {
  if (context.kind === "valid") return context.projectName;
  if (context.kind === "legacy") return "Project name not configured";
  return "Project data unavailable";
}

/** Safe text values for DOM textContent / document.title; no HTML interpretation. */
export function projectBrowserTitle(context: ProjectContext): string {
  return sharedProjectDisplayName(context) + " — SPT-WBS";
}

/**
 * For a legacy workbook, preserve the historical weekend/holiday count while
 * explicitly flagging calendar unconfigured in the presentation. For corrupt
 * or future extension, do NOT compute from an invented empty project blackout.
 */
export function remainingProjectDays(
  finish: string | null, today: string, status: string,
  holidays: HolidayCalendar, context: ProjectContext,
): RemainingWork {
  if (isInactiveStatus(status)) return { kind: "hidden" };
  if (context.kind === "incompatible" || context.kind === "unsupported_future") return { kind: "unknown" };
  return remainingWorkdays(finish, today, status, holidays,
    context.kind === "valid" ? context.blackout : undefined);
}
