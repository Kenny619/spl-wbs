import ExcelJS from "exceljs";
import JSZip from "jszip";
import { interpretExcelDate, interpretExcelTimestamp } from "../calendar/dateOnly";
import { PREFERRED_SHEET } from "../config/decisions";

export type CellValue =
  | { kind: "empty" }
  | { kind: "text"; value: string }
  | { kind: "number"; value: number; format: string | null }
  | { kind: "date"; iso: string }
  | { kind: "timestamp"; iso: string }
  | { kind: "fictional-date" }
  | { kind: "error" };

export type SheetRecord = {
  excelRow: number;
  cells: CellValue[];
};

export type WorkbookGrid = {
  ok: true;
  sheetName: string;
  fallbackSheet: boolean;
  date1904: boolean;
  headers: string[];
  records: SheetRecord[];
};

export type WorkbookReadFailure = {
  ok: false;
  code: "unreadable-workbook" | "ambiguous-workbook-sheet";
  message: string;
};

export async function readWorkbook(data: ArrayBuffer | Uint8Array): Promise<WorkbookGrid | WorkbookReadFailure> {
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const prepared = await normalizeDate1904Flag(bytes);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(prepared as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    const preferred = workbook.worksheets.find(
      (sheet) => sheet.name.toLowerCase() === PREFERRED_SHEET.toLowerCase(),
    );
    if (!preferred && workbook.worksheets.length !== 1) {
      const names = workbook.worksheets.map((sheet) => sheet.name);
      return {
        ok: false,
        code: "ambiguous-workbook-sheet",
        message: names.length
          ? `Workbook has no ${PREFERRED_SHEET} sheet. Found: ${names.join(", ")}.`
          : "Workbook has no worksheets.",
      };
    }
    const sheet = preferred ?? workbook.worksheets[0];
    const date1904 = Boolean(workbook.properties.date1904);
    const headerRow = sheet.getRow(1);
    let lastColumn = 0;
    headerRow.eachCell({ includeEmpty: false }, (_cell, column) => {
      lastColumn = Math.max(lastColumn, column);
    });
    const headers: string[] = [];
    for (let column = 1; column <= lastColumn; column += 1) {
      headers.push(headerText(headerRow.getCell(column), date1904));
    }
    const records: SheetRecord[] = [];
    for (let excelRow = 2; excelRow <= sheet.rowCount; excelRow += 1) {
      const row = sheet.getRow(excelRow);
      const cells = headers.map((_, index) => readCell(row.getCell(index + 1), date1904));
      if (cells.every((cell) => cell.kind === "empty")) continue;
      records.push({ excelRow, cells });
    }
    return {
      ok: true,
      sheetName: sheet.name,
      fallbackSheet: !preferred,
      date1904,
      headers,
      records,
    };
  } catch {
    return {
      ok: false,
      code: "unreadable-workbook",
      message: "The file is not a readable .xlsx workbook. Web query (.iqy) files are not supported.",
    };
  }
}

async function normalizeDate1904Flag(data: Uint8Array): Promise<Uint8Array> {
  try {
    const zip = await JSZip.loadAsync(data);
    const entry = zip.file("xl/workbook.xml");
    if (!entry) return data;
    const xml = await entry.async("string");
    if (!/date1904\s*=\s*["']true["']/i.test(xml)) return data;
    zip.file("xl/workbook.xml", xml.replace(/date1904\s*=\s*["']true["']/gi, 'date1904="1"'));
    return zip.generateAsync({ type: "uint8array" });
  } catch {
    return data;
  }
}

function headerText(cell: ExcelJS.Cell, date1904: boolean): string {
  const value = readCell(cell, date1904);
  if (value.kind === "text") return value.value.trim();
  if (value.kind === "number") return String(value.value);
  if (value.kind === "date" || value.kind === "timestamp") return value.iso;
  return "";
}

function readCell(cell: ExcelJS.Cell, date1904: boolean): CellValue {
  const format = typeof cell.numFmt === "string" ? cell.numFmt : null;
  return readValue(cell.value, format, date1904);
}

function readValue(value: ExcelJS.CellValue, format: string | null, date1904: boolean): CellValue {
  if (value == null || value === "") return { kind: "empty" };
  if (isDate(value)) return dateCell(value, date1904);
  if (typeof value === "number") return { kind: "number", value, format };
  if (typeof value === "string") return { kind: "text", value };
  if (typeof value === "boolean") return { kind: "text", value: value ? "TRUE" : "FALSE" };
  if (typeof value !== "object") return { kind: "text", value: String(value) };
  if ("richText" in value && Array.isArray(value.richText)) {
    return { kind: "text", value: value.richText.map((part) => part.text ?? "").join("") };
  }
  if ("formula" in value) {
    if (value.result == null || value.result === "") return { kind: "empty" };
    return readValue(value.result as ExcelJS.CellValue, format, date1904);
  }
  if ("hyperlink" in value && typeof value.hyperlink === "string") {
    return { kind: "text", value: value.hyperlink };
  }
  if ("text" in value && typeof value.text === "string") return { kind: "text", value: value.text };
  if ("error" in value) return { kind: "error" };
  return { kind: "text", value: String(value) };
}

function dateCell(value: Date, date1904: boolean): CellValue {
  const timestamp = interpretExcelTimestamp(value, date1904);
  if (!timestamp) return { kind: "fictional-date" };
  const iso = interpretExcelDate(value, date1904);
  if (!iso) return { kind: "fictional-date" };
  const hasTime = !timestamp.endsWith("T00:00:00.000Z");
  return hasTime ? { kind: "timestamp", iso: timestamp } : { kind: "date", iso };
}

function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === "[object Date]";
}
