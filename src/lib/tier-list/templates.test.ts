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
    const koOnly = ["league-champions", "lostark-classes", "maplestory-jobs"];
    const everywhere = BUILTIN_TEMPLATES.map((template) => template.id).filter((id) => !koOnly.includes(id));
    expect(everywhere.length).toBeGreaterThanOrEqual(17);
    expect(templatesForLocale("en").map((template) => template.id)).toEqual(everywhere);
    expect(templatesForLocale("ja").map((template) => template.id)).toEqual(everywhere);
    expect(templatesForLocale("ko").map((template) => template.id)).toEqual(BUILTIN_TEMPLATES.map((template) => template.id));
    for (const template of templatesForLocale("en")) {
      for (const item of template.items) expect(item.labels?.en).toBeTruthy();
    }
  });

  it("gives every shared template a distinct label in each locale it claims", () => {
    for (const template of BUILTIN_TEMPLATES) {
      const ids = template.items.map((item) => item.id);
      expect(new Set(ids).size, template.id).toBe(ids.length);
      for (const locale of template.availableLocales) {
        expect(template.title[locale], `${template.id} title ${locale}`).toBeTruthy();
        if (template.availableLocales.length === 1) continue;
        for (const item of template.items) expect(item.labels?.[locale], `${item.id} ${locale}`).toBeTruthy();
      }
    }
  });

  it("does not leak Hangul into non-Korean labels of shared templates", () => {
    for (const template of BUILTIN_TEMPLATES.filter((entry) => entry.availableLocales.length > 1)) {
      for (const locale of ["en", "ja", "zh", "fr", "es"] as const) {
        for (const item of template.items) expect(item.labels?.[locale] ?? "", `${item.id} ${locale}`).not.toMatch(/[가-힣]/);
      }
    }
  });

  it("fails closed when an unavailable locale is requested", () => {
    const league = BUILTIN_TEMPLATES.find((template) => template.id === "league-champions")!;
    expect(() => documentFromTemplate(league, "en")).toThrow("not available");
  });
});
