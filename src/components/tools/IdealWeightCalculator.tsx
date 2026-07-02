import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  sex: string;
  male: string;
  female: string;
  height: string;
  healthyRange: string;
  formulas: string;
  devine: string;
  robinson: string;
  miller: string;
  hamwi: string;
  kg: string;
  rangeHint: string;
}

const L: Record<string, UiLabels> = {
  en: { sex: "Sex", male: "Male", female: "Female", height: "Height (cm)", healthyRange: "Healthy weight range", formulas: "By formula", devine: "Devine", robinson: "Robinson", miller: "Miller", hamwi: "Hamwi", kg: "kg", rangeHint: "Based on a healthy BMI of 18.5–24.9." },
  ko: { sex: "성별", male: "남성", female: "여성", height: "키 (cm)", healthyRange: "건강 체중 범위", formulas: "공식별 결과", devine: "Devine", robinson: "Robinson", miller: "Miller", hamwi: "Hamwi", kg: "kg", rangeHint: "건강 BMI 18.5~24.9 기준입니다." },
  ja: { sex: "性別", male: "男性", female: "女性", height: "身長 (cm)", healthyRange: "健康体重の範囲", formulas: "計算式別", devine: "Devine", robinson: "Robinson", miller: "Miller", hamwi: "Hamwi", kg: "kg", rangeHint: "健康なBMI 18.5〜24.9に基づきます。" },
  zh: { sex: "性别", male: "男", female: "女", height: "身高 (cm)", healthyRange: "健康体重范围", formulas: "按公式", devine: "Devine", robinson: "Robinson", miller: "Miller", hamwi: "Hamwi", kg: "kg", rangeHint: "基于健康 BMI 18.5–24.9。" },
  fr: { sex: "Sexe", male: "Homme", female: "Femme", height: "Taille (cm)", healthyRange: "Plage de poids santé", formulas: "Par formule", devine: "Devine", robinson: "Robinson", miller: "Miller", hamwi: "Hamwi", kg: "kg", rangeHint: "Basé sur un IMC sain de 18,5 à 24,9." },
  es: { sex: "Sexo", male: "Hombre", female: "Mujer", height: "Altura (cm)", healthyRange: "Rango de peso saludable", formulas: "Por fórmula", devine: "Devine", robinson: "Robinson", miller: "Miller", hamwi: "Hamwi", kg: "kg", rangeHint: "Basado en un IMC saludable de 18,5 a 24,9." },
};

interface Props {
  locale: Locale;
}

export default function IdealWeightCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const [sex, setSex] = useState<"male" | "female">("male");
  const [height, setHeight] = useState("170");

  const h = parseFloat(height);
  const valid = h >= 120 && h <= 230;

  const inchesOver5ft = valid ? h / 2.54 - 60 : 0;
  const male = sex === "male";

  // Standard ideal body weight formulas (kg)
  const devine = (male ? 50 : 45.5) + 2.3 * inchesOver5ft;
  const robinson = (male ? 52 : 49) + (male ? 1.9 : 1.7) * inchesOver5ft;
  const miller = (male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * inchesOver5ft;
  const hamwi = (male ? 48 : 45.5) + (male ? 2.7 : 2.2) * inchesOver5ft;

  const hm = h / 100;
  const lowBmi = 18.5 * hm * hm;
  const highBmi = 24.9 * hm * hm;

  const r = (n: number) => Math.round(n * 10) / 10;

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  const rows: { label: string; value: number }[] = [
    { label: t.devine, value: devine },
    { label: t.robinson, value: robinson },
    { label: t.miller, value: miller },
    { label: t.hamwi, value: hamwi },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.sex}</span>
          <select value={sex} onChange={(e) => setSex(e.target.value as "male" | "female")} className={`mt-1 w-full ${inputCls}`}>
            <option value="male">{t.male}</option>
            <option value="female">{t.female}</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.height}</span>
          <input type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
      </div>

      {valid && (
        <>
          <div className="mt-6 rounded-md border border-primary bg-accent px-3 py-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">{t.healthyRange}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-primary">{r(lowBmi)}–{r(highBmi)} {t.kg}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.rangeHint}</p>
          </div>
          <p className="mt-4 mb-2 text-sm font-medium text-muted-foreground">{t.formulas}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-mono font-semibold text-foreground">{r(row.value)} {t.kg}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
