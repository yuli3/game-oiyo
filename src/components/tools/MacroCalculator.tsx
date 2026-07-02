import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  calories: string;
  split: string;
  protein: string;
  carbs: string;
  fat: string;
  grams: string;
  kcal: string;
  perDay: string;
  splits: string[];
}

const L: Record<string, UiLabels> = {
  en: { calories: "Daily calories", split: "Macro split", protein: "Protein", carbs: "Carbs", fat: "Fat", grams: "g", kcal: "kcal", perDay: "per day", splits: ["Balanced (30/40/30)", "High protein (40/40/20)", "Low carb (40/20/40)", "Keto (25/5/70)"] },
  ko: { calories: "하루 칼로리", split: "매크로 비율", protein: "단백질", carbs: "탄수화물", fat: "지방", grams: "g", kcal: "kcal", perDay: "하루", splits: ["균형 (30/40/30)", "고단백 (40/40/20)", "저탄수 (40/20/40)", "키토 (25/5/70)"] },
  ja: { calories: "1日のカロリー", split: "マクロ比率", protein: "タンパク質", carbs: "炭水化物", fat: "脂質", grams: "g", kcal: "kcal", perDay: "1日", splits: ["バランス (30/40/30)", "高タンパク (40/40/20)", "低炭水化物 (40/20/40)", "ケト (25/5/70)"] },
  zh: { calories: "每日热量", split: "宏量比例", protein: "蛋白质", carbs: "碳水", fat: "脂肪", grams: "g", kcal: "kcal", perDay: "每天", splits: ["均衡 (30/40/30)", "高蛋白 (40/40/20)", "低碳水 (40/20/40)", "生酮 (25/5/70)"] },
  fr: { calories: "Calories par jour", split: "Répartition des macros", protein: "Protéines", carbs: "Glucides", fat: "Lipides", grams: "g", kcal: "kcal", perDay: "par jour", splits: ["Équilibré (30/40/30)", "Riche en protéines (40/40/20)", "Pauvre en glucides (40/20/40)", "Kéto (25/5/70)"] },
  es: { calories: "Calorías diarias", split: "Distribución de macros", protein: "Proteína", carbs: "Carbohidratos", fat: "Grasa", grams: "g", kcal: "kcal", perDay: "al día", splits: ["Equilibrado (30/40/30)", "Alta proteína (40/40/20)", "Bajo en carbos (40/20/40)", "Keto (25/5/70)"] },
};

// [protein%, carbs%, fat%]
const SPLITS: [number, number, number][] = [
  [30, 40, 30],
  [40, 40, 20],
  [40, 20, 40],
  [25, 5, 70],
];

interface Props {
  locale: Locale;
}

export default function MacroCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const [calories, setCalories] = useState("2000");
  const [split, setSplit] = useState(0);

  const cal = parseFloat(calories);
  const valid = cal > 0;
  const [pPct, cPct, fPct] = SPLITS[split];

  // protein & carbs 4 kcal/g, fat 9 kcal/g
  const proteinG = valid ? (cal * (pPct / 100)) / 4 : 0;
  const carbsG = valid ? (cal * (cPct / 100)) / 4 : 0;
  const fatG = valid ? (cal * (fPct / 100)) / 9 : 0;

  const r = (n: number) => Math.round(n);

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  const rows: { label: string; g: number; pct: number; kcal: number }[] = [
    { label: t.protein, g: proteinG, pct: pPct, kcal: cal * (pPct / 100) },
    { label: t.carbs, g: carbsG, pct: cPct, kcal: cal * (cPct / 100) },
    { label: t.fat, g: fatG, pct: fPct, kcal: cal * (fPct / 100) },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.calories}</span>
          <input type="number" inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.split}</span>
          <select value={split} onChange={(e) => setSplit(parseInt(e.target.value))} className={`mt-1 w-full ${inputCls}`}>
            {t.splits.map((s, i) => (
              <option key={i} value={i}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {valid && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-md border border-border bg-background px-3 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{row.label} · {row.pct}%</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">{r(row.g)}{t.grams}</p>
              <p className="mt-1 text-xs text-muted-foreground">{r(row.kcal)} {t.kcal}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-center text-xs text-muted-foreground">{t.perDay} · 4 {t.kcal}/g {t.protein}/{t.carbs}, 9 {t.kcal}/g {t.fat}</p>
    </div>
  );
}
