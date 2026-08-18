import { emptyDocument, type TierItem, type TierListDocument } from "./model";

export type BuiltinTemplate = {
  id: string;
  title: Record<"ko" | "en" | "ja" | "zh" | "fr" | "es", string>;
  items: TierItem[];
};

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "animals",
    title: { ko: "동물", en: "Animals", ja: "動物", zh: "动物", fr: "Animaux", es: "Animales" },
    items: [
      { id: "lion", label: "사자" },
      { id: "dolphin", label: "돌고래" },
      { id: "fox", label: "여우" },
      { id: "penguin", label: "펭귄" },
      { id: "eagle", label: "독수리" },
      { id: "panda", label: "판다" },
      { id: "otter", label: "수달" },
      { id: "wolf", label: "늑대" },
    ],
  },
  {
    id: "snacks",
    title: { ko: "야식", en: "Late snacks", ja: "夜食", zh: "夜宵", fr: "En-cas", es: "Tentempiés" },
    items: [
      { id: "ramen", label: "라면" },
      { id: "chicken", label: "치킨" },
      { id: "tteokbokki", label: "떡볶이" },
      { id: "pizza", label: "피자" },
      { id: "gimbap", label: "김밥" },
      { id: "icecream", label: "아이스크림" },
      { id: "banana", label: "바나나" },
      { id: "water", label: "물" },
    ],
  },
  {
    id: "weekdays",
    title: { ko: "요일", en: "Weekdays", ja: "曜日", zh: "星期", fr: "Jours", es: "Días" },
    items: [
      { id: "mon", label: "월요일" },
      { id: "tue", label: "화요일" },
      { id: "wed", label: "수요일" },
      { id: "thu", label: "목요일" },
      { id: "fri", label: "금요일" },
      { id: "sat", label: "토요일" },
      { id: "sun", label: "일요일" },
    ],
  },
];

export function documentFromTemplate(template: BuiltinTemplate, locale: keyof BuiltinTemplate["title"]): TierListDocument {
  const doc = emptyDocument(template.title[locale] ?? template.title.en);
  return {
    ...doc,
    tiers: doc.tiers.map((tier) => (tier.id === "unranked" ? { ...tier, items: template.items.map((item) => ({ ...item })) } : tier)),
  };
}
