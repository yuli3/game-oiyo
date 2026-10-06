import { describe, expect, it } from "vitest";
import {
  LOCAL_IMAGE_MAX_COUNT,
  addTier,
  emptyDocument,
  exportLayout,
  fromSharePayload,
  isHttpsImageUrl,
  isLocalImageData,
  moveTierItem,
  parseDocument,
  recolorTier,
  removeTier,
  removeTierItem,
  renameTier,
  toSharePayload,
  visibleRankedTiers,
} from "./model";

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

  const PIXEL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";

  it("starts with five visible rows and keeps unranked at the stored index", () => {
    const doc = emptyDocument("기본");
    expect(visibleRankedTiers(doc).map((tier) => tier.id)).toEqual(["s", "a", "b", "c", "d"]);
    expect(doc.tiers[5].id).toBe("unranked");
  });

  it("reads a v2 document that has no optional rows", () => {
    const v2 = {
      schema: "oiyo.tier-list", version: 2, title: "옛 문서", savedAt: new Date().toISOString(),
      tiers: ["s", "a", "b", "c", "d", "unranked"].map((id) => ({ id, items: id === "a" ? [{ id: "x", label: "X" }] : [] })),
    };
    const doc = parseDocument(v2)!;
    expect(doc.version).toBe(3);
    expect(visibleRankedTiers(doc).map((tier) => tier.id)).toEqual(["s", "a", "b", "c", "d"]);
    expect(doc.tiers.find((tier) => tier.id === "a")!.items).toHaveLength(1);
  });

  it("renames, recolors, adds and removes rows", () => {
    let doc = emptyDocument("줄");
    doc = renameTier(doc, "s", "  신계  ");
    doc = recolorTier(doc, "s", "violet");
    expect(doc.tiers[0]).toMatchObject({ label: "신계", color: "violet" });
    expect(renameTier(doc, "s", "").tiers[0].label).toBeUndefined();
    expect(renameTier(doc, "s", "가".repeat(40)).tiers[0].label).toHaveLength(12);

    doc = addTier(addTier(doc));
    expect(visibleRankedTiers(doc).map((tier) => tier.id)).toEqual(["s", "a", "b", "c", "d", "e", "f"]);
    expect(addTier(doc)).toBe(doc);

    doc = moveTierItem({ ...doc, tiers: doc.tiers.map((tier) => (tier.id === "unranked" ? { ...tier, items: [{ id: "k", label: "K" }] } : tier)) }, "k", "e", 0);
    doc = removeTier(doc, "e");
    expect(visibleRankedTiers(doc).map((tier) => tier.id)).not.toContain("e");
    expect(doc.tiers.find((tier) => tier.id === "unranked")!.items.map((item) => item.id)).toEqual(["k"]);
    expect(parseDocument(JSON.stringify(doc))).not.toBeNull();
  });

  it("never removes the last visible row", () => {
    let doc = emptyDocument("하나");
    for (const id of ["a", "b", "c", "d"] as const) doc = removeTier(doc, id);
    expect(visibleRankedTiers(doc).map((tier) => tier.id)).toEqual(["s"]);
    expect(removeTier(doc, "s")).toBe(doc);
  });

  it("lays out visible rows in screen order with their names, unranked last", () => {
    let doc = renameTier(addTier(emptyDocument("순서")), "e", "보류");
    doc = removeTier(doc, "b");
    const rows = exportLayout(doc, 1200).rows;
    expect(rows.map((row) => row.id)).toEqual(["s", "a", "c", "d", "e", "unranked"]);
    expect(rows.find((row) => row.id === "e")!.label).toBe("보류");
  });

  it("accepts small device images and rejects other data URLs", () => {
    expect(isLocalImageData(PIXEL)).toBe(true);
    expect(isLocalImageData("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isLocalImageData("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isLocalImageData(`data:image/jpeg;base64,${"A".repeat(70_000)}`)).toBe(false);
  });

  it("keeps device images in saved documents but out of share payloads", () => {
    const doc = emptyDocument("사진");
    doc.tiers[5].items.push({ id: "p", label: "내 사진", imageData: PIXEL });
    expect(parseDocument(JSON.stringify(doc))!.tiers[5].items[0].imageData).toBe(PIXEL);
    const payload = toSharePayload(doc);
    expect(JSON.stringify(payload)).not.toContain("data:image");
    expect(fromSharePayload(payload)!.tiers[5].items[0]).toEqual({ id: "p", label: "내 사진" });
  });

  it("rejects a document with too many device images", () => {
    const doc = emptyDocument("많음");
    doc.tiers[5].items = Array.from({ length: LOCAL_IMAGE_MAX_COUNT + 1 }, (_, index) => ({ id: `p-${index}`, label: `P${index}`, imageData: PIXEL }));
    expect(parseDocument(JSON.stringify(doc))).toBeNull();
  });

  it("carries custom row names and colors through a share link", () => {
    const doc = recolorTier(renameTier(addTier(emptyDocument("공유")), "s", "최애"), "a", "pink");
    const back = fromSharePayload(toSharePayload(doc))!;
    expect(back.tiers.find((tier) => tier.id === "s")!.label).toBe("최애");
    expect(back.tiers.find((tier) => tier.id === "a")!.color).toBe("pink");
    expect(visibleRankedTiers(back).map((tier) => tier.id)).toEqual(["s", "a", "b", "c", "d", "e"]);
  });
});
