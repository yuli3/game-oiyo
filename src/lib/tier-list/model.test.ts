import { describe, expect, it } from "vitest";
import { emptyDocument, exportLayout, isHttpsImageUrl, moveTierItem, parseDocument, removeTierItem } from "./model";

describe("tier list model", () => {
  it("accepts https image urls and rejects everything else", () => {
    expect(isHttpsImageUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isHttpsImageUrl("http://cdn.example.com/a.png")).toBe(false);
    expect(isHttpsImageUrl("javascript:alert(1)")).toBe(false);
  });

  it("moves and reorders an item without mutating the document", () => {
    const doc = emptyDocument("테스트");
    doc.tiers[5].items.push({ id: "a", label: "A" }, { id: "b", label: "B" });
    const moved = moveTierItem(doc, "b", "s", 0);
    expect(moved.tiers[0].items.map((item) => item.id)).toEqual(["b"]);
    expect(doc.tiers[5].items.map((item) => item.id)).toEqual(["a", "b"]);
    const reordered = moveTierItem(moved, "a", "s", 0);
    expect(reordered.tiers[0].items.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("removes one item without touching the rest", () => {
    const doc = emptyDocument("테스트");
    doc.tiers[5].items.push({ id: "a", label: "A" }, { id: "b", label: "B" });
    const next = removeTierItem(doc, "a");
    expect(next.tiers[5].items.map((item) => item.id)).toEqual(["b"]);
    expect(doc.tiers[5].items.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("builds a bounded PNG layout for large templates", () => {
    const doc = emptyDocument("전체");
    doc.tiers[0].items = Array.from({ length: 173 }, (_, index) => ({ id: `c-${index}`, label: `C${index}` }));
    const layout = exportLayout(doc, 1200);
    expect(layout.width).toBe(1200);
    expect(layout.height).toBeGreaterThan(600);
    expect(layout.rows[0].items).toHaveLength(173);
    expect(layout.rows[0].items.at(-1)!.y).toBeLessThan(layout.height);
  });

  it("accepts a full 173-character template", () => {
    const doc = emptyDocument("전체");
    doc.tiers[5].items = Array.from({ length: 173 }, (_, index) => ({ id: `champ-${index}`, label: `Champion ${index}` }));
    expect(parseDocument(JSON.stringify(doc))?.tiers[5].items).toHaveLength(173);
  });
});
