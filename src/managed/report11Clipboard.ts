/**
 * Clipboard bridge for an explicit user click inside the Reports workspace.
 * This helper does not compose, create or send Outlook messages.
 */
export type RichClipboardWriter = Pick<Clipboard, "write">;
export type ClipboardItemFactory = new (items: Record<string, Blob>) => ClipboardItem;

export async function copyReport11ForOutlook(
  html: string,
  plainText: string,
  writer: RichClipboardWriter | null | undefined,
  Item: ClipboardItemFactory | null | undefined,
): Promise<void> {
  if (!html.trim() || !plainText.trim()) {
    throw new Error("Generate a report before copying.");
  }
  if (!writer || typeof writer.write !== "function" || !Item) {
    throw new Error("Rich clipboard is unavailable. Download HTML or copy plain text instead.");
  }
  try {
    await writer.write([new Item({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    })]);
  } catch {
    throw new Error("Rich clipboard permission was denied. Download HTML or use plain text instead.");
  }
}
