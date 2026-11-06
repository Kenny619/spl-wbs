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


const MIME = {
  workbook: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  worksheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  styles: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
  sharedStrings: "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
  theme: "application/vnd.openxmlformats-officedocument.theme+xml",
  core: "application/vnd.openxmlformats-package.core-properties+xml",
  app: "application/vnd.openxmlformats-officedocument.extended-properties+xml",
};
function expectedPartType(name: string): string | null {
  if (name === "xl/workbook.xml") return MIME.workbook;
  if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) return MIME.worksheet;
  if (name === "xl/styles.xml") return MIME.styles;
  if (name === "xl/sharedStrings.xml") return MIME.sharedStrings;
  if (/^xl\/theme\/theme\d+\.xml$/.test(name)) return MIME.theme;
  if (name === "docProps/core.xml") return MIME.core;
  if (name === "docProps/app.xml") return MIME.app;
  return null;
}
/** Content-type declarations must agree exactly with the restricted ZIP subset. */
async function verifyContentTypes(zip: JSZip): Promise<void> {
  const reject = (): never => {
    throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Unsupported or inconsistent XLSX content type declarations.");
  };
  const file = zip.file("[Content_Types].xml");
  if (!file) return reject();
  const raw = (await file.async("string")).trim()
    .replace(/^<\?xml\s+[^?]*\?>\s*/i, "");
  const root = /^<Types\s+xmlns=["']http:\/\/schemas\.openxmlformats\.org\/package\/2006\/content-types["']>([\s\S]*)<\/Types>$/.exec(raw);
  if (!root) return reject();
  const declarations = root[1].match(/<(?:Default|Override)\s+[^<>]*\/>/g) ?? [];
  if (root[1].replace(/<(?:Default|Override)\s+[^<>]*\/>/g, "").trim()) return reject();
  const defaults = new Map<string, string>();
  const overrides = new Map<string, string>();
  for (const declaration of declarations) {
    const kind = /^<(Default|Override)\s+/.exec(declaration)?.[1];
    if (!kind) return reject();
    const attrText = declaration.slice(kind.length + 1, -2);
    const attributes = new Map<string, string>();
    const attribute = /\s+([A-Za-z][A-Za-z0-9]*)\s*=\s*(["'])([^"'<>]*)\2/y;
    let offset = 0;
    while (offset < attrText.length && attrText.slice(offset).trim()) {
      attribute.lastIndex = offset;
      const found = attribute.exec(attrText);
      if (!found || attributes.has(found[1]) || /[&]/.test(found[3])) return reject();
      attributes.set(found[1], found[3]);
      offset = attribute.lastIndex;
    }
    if (attrText.slice(offset).trim() || attributes.size !== 2) return reject();
    const mime = attributes.get("ContentType");
    if (!mime) return reject();
    if (kind === "Default") {
      const ext = attributes.get("Extension");
      if (!ext || defaults.has(ext) ||
          !["xml", "rels", "vml"].includes(ext) ||
          mime !== (ext === "xml" ? "application/xml" :
            ext === "rels" ? "application/vnd.openxmlformats-package.relationships+xml" :
            "application/vnd.openxmlformats-officedocument.vmlDrawing")) return reject();
      // ExcelJS emits an unused VML default. ZIP VML parts remain prohibited
      // by ALLOWED_FILES; do not treat this as permission to preserve drawings.
      defaults.set(ext, mime);
    } else {
      const part = attributes.get("PartName");
      if (!part?.startsWith("/") || overrides.has(part)) return reject();
      const name = part.slice(1);
      if (!zip.file(name) || expectedPartType(name) !== mime) return reject();
      overrides.set(part, mime);
    }
  }
  if ((defaults.size !== 2 && defaults.size !== 3) || defaults.get("rels") !== "application/vnd.openxmlformats-package.relationships+xml" ||
      defaults.get("xml") !== "application/xml") return reject();
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir || name === "[Content_Types].xml" || name.endsWith(".rels")) continue;
    const expected = expectedPartType(name);
    if (!expected || overrides.get("/" + name) !== expected) return reject();
  }
}

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

  await verifyContentTypes(zip);

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
        // Validate the entire attribute text rather than searching for three
        // known attributes while silently ignoring everything else.
        const content = relationship.slice("<Relationship".length, -2);
        const fields: Record<string, string> = {};
        const attribute = /\s+([A-Za-z][A-Za-z0-9]*)\s*=\s*(["'])([^"'<>]*)\2/y;
        let offset = 0;
        while (offset < content.length && content.slice(offset).trim()) {
          attribute.lastIndex = offset;
          const matched = attribute.exec(content);
          if (!matched || !["Id", "Type", "Target"].includes(matched[1]) ||
              Object.prototype.hasOwnProperty.call(fields, matched[1])) {
            throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Invalid relationship attributes in " + name + ".");
          }
          fields[matched[1]] = matched[3];
          offset = attribute.lastIndex;
        }
        if (content.slice(offset).trim() || Object.keys(fields).length !== 3 ||
            !fields.Id || !fields.Type || !fields.Target ||
            ids.has(fields.Id) ||
            /[&\\]/.test(fields.Id + fields.Type + fields.Target) ||
            /^(?:\/|[a-z]+:)/i.test(fields.Target) ||
            fields.Target.split("/").some((part) => !part || part === "." || part === "..") ||
            !ALLOWED_RELATIONSHIPS.has(fields.Type)) {
          throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Unsupported Excel relationship in " + name + ".");
        }
        // Match the relationship role to the actual supported package part.
        // A syntactically valid relationship to a missing or different part
        // cannot be safely round-tripped through ExcelJS.
        const rootRelationship = name === "_rels/.rels";
        const targetName = (rootRelationship ? "" : "xl/") + fields.Target;
        const expectedRole = targetName === "xl/workbook.xml" ? "officeDocument" :
          targetName === "docProps/core.xml" ? "core-properties" :
          targetName === "docProps/app.xml" ? "extended-properties" :
          /^xl\/worksheets\/sheet\d+\.xml$/.test(targetName) ? "worksheet" :
          targetName === "xl/styles.xml" ? "styles" :
          targetName === "xl/sharedStrings.xml" ? "sharedStrings" :
          /^xl\/theme\/theme\d+\.xml$/.test(targetName) ? "theme" : null;
        const role = fields.Type.slice(fields.Type.lastIndexOf("/") + 1);
        if (!zip.file(targetName) || !expectedRole || role !== expectedRole ||
            (rootRelationship !== ["officeDocument", "core-properties", "extended-properties"].includes(role))) {
          throw new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Unsupported relationship target in " + name + ".");
        }
        ids.add(fields.Id);
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
