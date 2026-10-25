import { describe, expect, it } from "vitest";
import { gridWidthFromKey } from "../../src/ui/keyboard";

describe("keyboard", () => {
  it("nudges the WBS divider inside its limits", () => {
    expect(gridWidthFromKey(540, "ArrowRight", 285, 900)).toBe(556);
    expect(gridWidthFromKey(540, "ArrowLeft", 285, 900)).toBe(524);
    expect(gridWidthFromKey(290, "ArrowLeft", 285, 900)).toBe(285);
    expect(gridWidthFromKey(890, "ArrowRight", 285, 900)).toBe(900);
    expect(gridWidthFromKey(540, "Home", 285, 900)).toBe(285);
    expect(gridWidthFromKey(540, "End", 285, 200)).toBe(285);
    expect(gridWidthFromKey(540, "Enter", 285, 900)).toBeNull();
  });
});
