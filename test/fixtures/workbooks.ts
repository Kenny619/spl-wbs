import ExcelJS from "exceljs";
import { isoToExcelSerial } from "../../src/calendar/dateOnly";

export type FixtureValue =
  | string
  | number
  | null
  | { date: string }
  | { percent: number }
  | { serial: number }
  | { formula: string; result: string | number | { date: string } };

export async function buildWorkbook(options: {
  sheetName?: string;
  otherSheets?: string[];
  date1904?: boolean;
  headers: string[];
  rows: FixtureValue[][];
}): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.properties.date1904 = Boolean(options.date1904);
  const sheet = workbook.addWorksheet(options.sheetName ?? "ProjectWBS");
  sheet.addRow(options.headers);
  for (const values of options.rows) {
    const row = sheet.addRow([]);
    values.forEach((value, index) => {
      writeCell(row.getCell(index + 1), value, Boolean(options.date1904));
    });
  }
  for (const name of options.otherSheets ?? []) workbook.addWorksheet(name);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return new Uint8Array(buffer);
}

function writeCell(cell: ExcelJS.Cell, value: FixtureValue, date1904: boolean): void {
  if (value == null) return;
  if (typeof value === "string" || typeof value === "number") {
    cell.value = value;
    return;
  }
  if ("date" in value) {
    cell.value = isoToExcelSerial(value.date, date1904);
    cell.numFmt = "yyyy-mm-dd";
    return;
  }
  if ("percent" in value) {
    cell.value = value.percent / 100;
    cell.numFmt = "0%";
    return;
  }
  if ("serial" in value) {
    cell.value = value.serial;
    cell.numFmt = "yyyy-mm-dd";
    return;
  }
  const result = typeof value.result === "object" ? isoToExcelSerial(value.result.date, date1904) : value.result;
  cell.value = { formula: value.formula, result };
  if (typeof value.result === "object") cell.numFmt = "yyyy-mm-dd";
}
