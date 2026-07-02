import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  original: string;
  target: string;
  servings: string;
  factor: string;
  ingredient: string;
  amount: string;
  unit: string;
  add: string;
  remove: string;
  result: string;
}

const LABELS: Record<string, UiLabels> = {
  en: { original: "Original servings", target: "Target servings", servings: "servings", factor: "Scale factor", ingredient: "Ingredient", amount: "Amount", unit: "Unit", add: "+ Add ingredient", remove: "Remove", result: "Scaled amount" },
  ko: { original: "원래 인분", target: "목표 인분", servings: "인분", factor: "배율", ingredient: "재료", amount: "양", unit: "단위", add: "+ 재료 추가", remove: "삭제", result: "환산된 양" },
  ja: { original: "元の人数分", target: "目標の人数分", servings: "人分", factor: "倍率", ingredient: "材料", amount: "量", unit: "単位", add: "+ 材料を追加", remove: "削除", result: "換算後の量" },
  zh: { original: "原份数", target: "目标份数", servings: "份", factor: "倍数", ingredient: "食材", amount: "用量", unit: "单位", add: "+ 添加食材", remove: "删除", result: "换算用量" },
  fr: { original: "Portions d'origine", target: "Portions cibles", servings: "portions", factor: "Facteur", ingredient: "Ingrédient", amount: "Quantité", unit: "Unité", add: "+ Ajouter", remove: "Retirer", result: "Quantité ajustée" },
  es: { original: "Porciones originales", target: "Porciones objetivo", servings: "porciones", factor: "Factor", ingredient: "Ingrediente", amount: "Cantidad", unit: "Unidad", add: "+ Añadir", remove: "Quitar", result: "Cantidad ajustada" },
};

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

interface Props {
  locale: Locale;
}

function round(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

export default function RecipeScaler({ locale }: Props) {
  const t = LABELS[locale] ?? LABELS.en;
  const [original, setOriginal] = useState("2");
  const [target, setTarget] = useState("4");
  const [items, setItems] = useState<Ingredient[]>([
    { name: locale === "ko" ? "밀가루" : locale === "ja" ? "小麦粉" : "Flour", amount: "200", unit: "g" },
    { name: locale === "ko" ? "설탕" : locale === "ja" ? "砂糖" : "Sugar", amount: "100", unit: "g" },
  ]);

  const o = parseFloat(original);
  const tg = parseFloat(target);
  const factor = o > 0 && tg > 0 ? tg / o : 0;

  const update = (i: number, key: keyof Ingredient, val: string) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  };
  const add = () => setItems((prev) => [...prev, { name: "", amount: "", unit: "" }]);
  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.original}</span>
          <input type="number" inputMode="numeric" value={original} onChange={(e) => setOriginal(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.target}</span>
          <input type="number" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <div className="flex flex-col justify-end">
          <span className="text-sm font-medium text-muted-foreground">{t.factor}</span>
          <span className="mt-1 font-mono text-lg font-bold text-primary">×{round(factor)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="grid grid-cols-[1fr_5rem_4rem_auto] gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>{t.ingredient}</span>
          <span>{t.amount}</span>
          <span>{t.unit}</span>
          <span>{t.result}</span>
        </div>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_4rem_auto] items-center gap-2">
            <input value={it.name} onChange={(e) => update(i, "name", e.target.value)} className={inputCls} placeholder={t.ingredient} />
            <input type="number" inputMode="decimal" value={it.amount} onChange={(e) => update(i, "amount", e.target.value)} className={inputCls} />
            <input value={it.unit} onChange={(e) => update(i, "unit", e.target.value)} className={inputCls} />
            <span className="flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground">
                {it.amount && factor ? `${round(parseFloat(it.amount) * factor)} ${it.unit}` : "—"}
              </span>
              <button type="button" onClick={() => remove(i)} aria-label={t.remove} className="text-muted-foreground hover:text-destructive">
                ×
              </button>
            </span>
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="mt-4 rounded-md border border-border px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
        {t.add}
      </button>
    </div>
  );
}
