type UpdateEntry = { timestamp: string | null; html: string };

/** Read-only SharePoint rich text. Never append the parsed, untrusted DOM. */
export function renderUpdatesSection(raw: string): HTMLElement | null {
  if (!raw?.trim()) return null;
  const section = element("section", "updates-section");
  section.append(element("div", "section-label", "Updates"));
  const history = element("div", "updates-history");
  let lastDate: string | null = null;
  for (const entry of parseUpdatesEntries(raw)) {
    const rich = element("div", "updates-rich");
    const parsed = new DOMParser().parseFromString(entry.html, "text/html");
    for (const child of Array.from(parsed.body.childNodes)) appendSafeNode(child, rich);
    if (!rich.textContent?.trim()) continue;
    const day = entry.timestamp?.slice(0, 10);
    if (day && day !== lastDate) {
      const label = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
      });
      history.append(element("div", "updates-date", label));
      lastDate = day;
    }
    const card = element("article", "updates-entry");
    if (entry.timestamp) card.append(element("div", "updates-time", entry.timestamp.match(/[T ](\d{2}:\d{2})/)?.[1] ?? ""));
    card.append(rich);
    history.append(card);
  }
  if (!history.childElementCount) return null;
  section.append(history);
  return section;
}

function parseUpdatesEntries(raw: string): UpdateEntry[] {
  try {
    const json: unknown = JSON.parse(raw);
    if (Array.isArray(json)) {
      const entries = json.filter((value): value is { html: string; timestamp?: unknown } =>
        Boolean(value) && typeof value === "object" && typeof value.html === "string");
      if (entries.length) return sortEntries(entries.map(entry => ({ html: entry.html, timestamp: validStamp(entry.timestamp) })));
    }
  } catch { /* Ordinary SharePoint HTML is the primary format. */ }
  const parsed = new DOMParser().parseFromString(raw, "text/html");
  const dated = Array.from(parsed.querySelectorAll("[data-entry-date], [data-update-timestamp]"));
  if (dated.length) return sortEntries(dated.map(node => ({
    timestamp: validStamp(node.getAttribute("data-entry-date") || node.getAttribute("data-update-timestamp")),
    html: node.innerHTML,
  })));
  // A standalone date block is a boundary; a date inside a sentence is not.
  const entries: UpdateEntry[] = [];
  let current: UpdateEntry = { timestamp: null, html: "" };
  for (const node of Array.from(parsed.body.childNodes)) {
    const stamp = node instanceof Element && /^(P|DIV|H[1-6])$/.test(node.tagName)
      ? validStamp(node.textContent?.trim()) : null;
    if (stamp) {
      if (current.html.trim()) entries.push(current);
      current = { timestamp: stamp, html: "" };
    } else current.html += node instanceof Element ? node.outerHTML : escapeText(node.textContent ?? "");
  }
  if (current.html.trim()) entries.push(current);
  return sortEntries(entries);
}

function sortEntries(entries: UpdateEntry[]): UpdateEntry[] {
  return entries.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
}

function validStamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let stamp = value.trim();
  const slash = stamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
  if (slash) stamp = `${slash[3]}-${slash[1]!.padStart(2, "0")}-${slash[2]!.padStart(2, "0")}${slash[4]}`;
  if (!/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(stamp)) return null;
  const date = new Date(`${stamp.slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== stamp.slice(0, 10)) return null;
  const time = stamp.match(/[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (time && (+time[1]! > 23 || +time[2]! > 59 || +(time[3] ?? 0) > 59)) return null;
  return stamp;
}

const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "S", "MARK", "BR", "P", "DIV", "SPAN", "UL", "OL", "LI", "A", "BLOCKQUOTE"]);
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "FORM", "INPUT", "BUTTON", "IMG", "LINK", "META", "BASE"]);

function appendSafeNode(node: Node, parent: HTMLElement): void {
  if (node.nodeType === Node.TEXT_NODE) {
    parent.append(document.createTextNode(node.textContent ?? ""));
    return;
  }
  if (!(node instanceof Element) || DROP.has(node.tagName)) return;
  const tag = node.tagName;
  const safe = document.createElement(ALLOWED.has(tag) ? tag.toLowerCase() : "span");
  if (tag === "A") {
    try {
      const url = new URL(node.getAttribute("href") ?? "");
      if (url.protocol === "https:" && !url.username && !url.password) {
        safe.setAttribute("href", url.href);
        safe.setAttribute("target", "_blank");
        safe.setAttribute("rel", "noopener noreferrer");
      }
    } catch { /* Unsafe links retain only their text. */ }
  }
  const style = node.getAttribute("style")?.toLowerCase() ?? "";
  if (/font-weight\s*:\s*(bold|[6-9]00)/.test(style)) safe.style.fontWeight = "700";
  if (/font-style\s*:\s*italic/.test(style)) safe.style.fontStyle = "italic";
  if (/text-decoration[^;]*underline/.test(style)) safe.style.textDecoration = "underline";
  if (tag === "MARK" || /background-color\s*:\s*(?:rgb\(255\s*,\s*255\s*,\s*0\)|#ffff00|yellow)/.test(style)) safe.classList.add("updates-highlight");
  for (const child of Array.from(node.childNodes)) appendSafeNode(child, safe);
  parent.append(safe);
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function escapeText(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
