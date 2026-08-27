import { describe, expect, it } from "vitest";
import { parseDocument } from "./model";
import { BUILTIN_TEMPLATES, documentFromTemplate, templatesForLocale } from "./templates";

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

  it("localizes titles instead of copying Korean into ja/zh", () => {
    const animals = BUILTIN_TEMPLATES.find((template) => template.id === "animals")!;
    expect(animals.title.ja).toBe("動物");
    expect(animals.title.zh).toBe("动物");
    expect(animals.title.fr).toBe("Animaux");
    const league = BUILTIN_TEMPLATES.find((template) => template.id === "league-champions")!;
    expect(league.title.ja).not.toBe(league.title.ko);
    expect(league.title.zh).not.toBe(league.title.ko);
  });

  it("localizes small template item labels", () => {
    const animals = BUILTIN_TEMPLATES.find((template) => template.id === "animals")!;
    const en = documentFromTemplate(animals, "en");
    const unranked = en.tiers.find((tier) => tier.id === "unranked")!;
    expect(unranked.items.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Lion", "Fox", "Panda"]),
    );
  });

  it("only exposes templates whose item labels are localized", () => {
    expect(templatesForLocale("en").map((template) => template.id)).toEqual(["animals", "snacks", "weekdays"]);
    expect(templatesForLocale("ja").map((template) => template.id)).toEqual(["animals", "snacks", "weekdays"]);
    expect(templatesForLocale("ko").map((template) => template.id)).toEqual(BUILTIN_TEMPLATES.map((template) => template.id));
    for (const template of templatesForLocale("en")) {
      for (const item of template.items) expect(item.labels?.en).toBeTruthy();
    }
  });

  it("fails closed when an unavailable locale is requested", () => {
    const league = BUILTIN_TEMPLATES.find((template) => template.id === "league-champions")!;
    expect(() => documentFromTemplate(league, "en")).toThrow("not available");
  });
});
