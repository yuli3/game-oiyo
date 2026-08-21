import { describe, expect, it } from "vitest";
import { parseDocument } from "./model";
import { BUILTIN_TEMPLATES, documentFromTemplate } from "./templates";

describe("tier list built-in templates", () => {
  it("contains complete current game rosters", () => {
    expect(BUILTIN_TEMPLATES.find((template) => template.id === "league-champions")?.items).toHaveLength(173);
    expect(BUILTIN_TEMPLATES.find((template) => template.id === "lostark-classes")?.items).toHaveLength(30);
    expect(BUILTIN_TEMPLATES.find((template) => template.id === "maplestory-jobs")?.items).toHaveLength(48);
  });

  it("includes newest official roster entries", () => {
    const lostark = BUILTIN_TEMPLATES.find((template) => template.id === "lostark-classes")!;
    const maple = BUILTIN_TEMPLATES.find((template) => template.id === "maplestory-jobs")!;
    expect(lostark.items.map((item) => item.label)).toEqual(expect.arrayContaining(["차원술사", "가디언나이트", "발키리"]));
    expect(maple.items.map((item) => item.label)).toEqual(expect.arrayContaining(["렌", "레테"]));
  });

  it("creates valid documents for every template", () => {
    for (const template of BUILTIN_TEMPLATES) {
      const doc = documentFromTemplate(template, "ko");
      expect(parseDocument(JSON.stringify(doc)), template.id).not.toBeNull();
    }
  });
});
