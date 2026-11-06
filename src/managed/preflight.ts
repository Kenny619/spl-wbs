import JSZip from "jszip";

/**
 * Restricted v1 writer gate. The read-only viewer intentionally has no such restriction.
 * Unknown package parts, external relationships and Excel features that ExcelJS could
 * silently drop must block BOTH direct Save and Save As.
 */
export class ManagedWorkbookError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ManagedWorkbookError";
  }
}

const ALLOWED_FILES = [
  /^\[Content_Types\]\.xml$/,
  /^_rels\/\.rels$/,
  /^docProps\/(app|core)\.xml$/,
  /^xl\/workbook\.xml$/,
  /^xl\/_rels\/workbook\.xml\.rels$/,
  /^xl\/styles\.xml$/,
  /^xl\/sharedStrings\.xml$/,
  /^xl\/theme\/theme\d+\.xml$/,
  /^xl\/worksheets\/sheet\d+\.xml$/,
];

const ALLOWED_RELATIONSHIPS = new Set([
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
]);

const UNSUPPORTED_SHEET_FEATURE =
  /<(?:[\w-]+:)?(?:f|drawing|legacyDrawing|tableParts|pivotTable|extLst|oleObjects|controls|sheetProtection|conditionalFormatting|dataValidations|hyperlinks|mergeCells|autoFilter|protectedRanges|customSheetViews|scenarios)\b/i;

/**
 * Conservative, intentionally narrow compatibility allowlist.
 * It does not purport to validate arbitrary OOXML. Only this simple subset
 * proceeds to a second ExcelJS serialization + readback validation.
 */
export async function preflightManagedWorkbook(source: ArrayBuffer | Uint8Array): Promise<void> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(source);
  } catch {
    throw new ManagedWorkbookError("UNREADABLE_XLSX", "The selected file is not a readable XLSX package.");
  }

  const required = ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels"];
  for (const name of required) {
    if (!zip.file(name)) {
      throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Required XLSX package part is missing: " + name);
    }
  }

  const worksheetNames = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  if (worksheetNames.length === 0) {
    throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "No ordinary worksheet was found.");
  }

  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (!ALLOWED_FILES.some((pattern) => pattern.test(name))) {
      throw new ManagedWorkbookError(
        "UNSUPPORTED_PACKAGE",
        "This workbook contains an unsupported package part (" + name + "). Save and Save As are blocked.",
      );
    }
    if (name.endsWith(".rels")) {
      const xml = await entry.async("string");
      if (/TargetMode\s*=\s*["']External["']/i.test(xml)) {
        throw new ManagedWorkbookError("EXTERNAL_RELATIONSHIP", "External Excel relationship in " + name + " is unsafe to write.");
      }
      // Only the canonical ExcelJS subset is supported. Never skip unknown
      // relationship markup or malformed XML: reject the whole package.
      const envelope = xml.trim()
        .replace(/^<\?xml\s+[^?]*\?>\s*/i, "")
        .match(/^<Relationships\s+xmlns=["']http:\/\/schemas\.openxmlformats\.org\/package\/2006\/relationships["']>([\s\S]*)<\/Relationships>$/);
      if (!envelope) {
        throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Unsupported relationships root in " + name + ".");
      }
      const relationships = envelope[1].match(/<Relationship\s+[^<>]*\/>/g) ?? [];
      const residue = envelope[1].replace(/<Relationship\s+[^<>]*\/>/g, "").trim();
      if (residue || relationships.length === 0) {
        throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Unrecognized relationship XML in " + name + ".");
      }
      const ids = new Set<string>();
      for (const relationship of relationships) {
        const fields = [...relationship.matchAll(/\b(Id|Type|Target)\s*=\s*["']([^"'<>]*)["']/g)];
        const id = fields.find((field) => field[1] === "Id")?.[2];
        const kind = fields.find((field) => field[1] === "Type")?.[2];
        const target = fields.find((field) => field[1] === "Target")?.[2];
        if (fields.length !== 3 || !id || !kind || !target ||
          ids.has(id) || /[&]/.test(id + kind + target) ||
          !ALLOWED_RELATIONSHIPS.has(kind)) {
          throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Unsupported Excel relationship in " + name + ".");
        }
        ids.add(id);
      }
    }
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
      const xml = await entry.async("string");
      const feature = UNSUPPORTED_SHEET_FEATURE.exec(xml);
      if (feature) {
        throw new ManagedWorkbookError(
          "UNSUPPORTED_SHEET_FEATURE",
          "This workbook contains " + feature[0].slice(1) + " in " + name + "; ExcelJS cannot safely write it in v1.",
        );
      }
    }
  }
  const workbookXml = await zip.file("xl/workbook.xml")!.async("string");
  if (/<(?:[\w-]+:)?(?:externalReferences|definedNames|pivotCaches|extLst)\b/i.test(workbookXml)) {
    throw new ManagedWorkbookError("UNSUPPORTED_WORKBOOK_FEATURE", "This workbook contains features outside the v1 safety allowlist.");
  }
}
