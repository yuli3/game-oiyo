import { describe, expect, it } from "vitest";
import { emptyDocument, isHttpsImageUrl, parseDocument } from "./model";

describe("tier list model", () => {
  it("accepts https image urls and rejects everything else", () => {
    expect(isHttpsImageUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isHttpsImageUrl("http://cdn.example.com/a.png")).toBe(false);
    expect(isHttpsImageUrl("javascript:alert(1)")).toBe(false);
  });

  it("round-trips a document with an image item", () => {
    const doc = emptyDocument("테스트");
    doc.tiers[5].items.push({ id: "ramen", label: "라면", imageUrl: "https://cdn.example.com/ramen.png" });
    const parsed = parseDocument(JSON.stringify(doc));
    expect(parsed?.tiers[5].items[0]?.imageUrl).toBe("https://cdn.example.com/ramen.png");
  });
});
