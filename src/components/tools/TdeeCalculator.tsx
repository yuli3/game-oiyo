import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  sex: string;
  male: string;
  female: string;
  age: string;
  height: string;
  weight: string;
  activity: string;
  bmr: string;
  tdee: string;
  kcalDay: string;
  lose: string;
  maintain: string;
  gain: string;
  levels: string[];
}

const L: Record<string, UiLabels> = {
  en: { sex: "Sex", male: "Male", female: "Female", age: "Age", height: "Height (cm)", weight: "Weight (kg)", activity: "Activity level", bmr: "BMR", tdee: "TDEE (maintenance)", kcalDay: "kcal/day", lose: "Lose (−500)", maintain: "Maintain", gain: "Gain (+500)", levels: ["Sedentary (little exercise)", "Light (1–3 days/wk)", "Moderate (3–5 days/wk)", "Active (6–7 days/wk)", "Very active (physical job/2x)"] },
  ko: { sex: "성별", male: "남성", female: "여성", age: "나이", height: "키 (cm)", weight: "체중 (kg)", activity: "활동 수준", bmr: "기초대사량(BMR)", tdee: "TDEE(유지 칼로리)", kcalDay: "kcal/일", lose: "감량 (−500)", maintain: "유지", gain: "증량 (+500)", levels: ["거의 안 함 (운동 없음)", "가벼움 (주 1–3일)", "보통 (주 3–5일)", "활동적 (주 6–7일)", "매우 활동적 (육체노동/2회)"] },
  ja: { sex: "性別", male: "男性", female: "女性", age: "年齢", height: "身長 (cm)", weight: "体重 (kg)", activity: "活動レベル", bmr: "基礎代謝量(BMR)", tdee: "TDEE(維持カロリー)", kcalDay: "kcal/日", lose: "減量 (−500)", maintain: "維持", gain: "増量 (+500)", levels: ["ほぼ運動なし", "軽い (週1–3日)", "中程度 (週3–5日)", "活発 (週6–7日)", "非常に活発 (肉体労働/2回)"] },
  zh: { sex: "性别", male: "男", female: "女", age: "年龄", height: "身高 (cm)", weight: "体重 (kg)", activity: "活动水平", bmr: "基础代谢(BMR)", tdee: "TDEE(维持热量)", kcalDay: "kcal/天", lose: "减脂 (−500)", maintain: "维持", gain: "增肌 (+500)", levels: ["几乎不运动", "轻度 (每周1–3天)", "中度 (每周3–5天)", "活跃 (每周6–7天)", "非常活跃 (体力劳动/2次)"] },
  fr: { sex: "Sexe", male: "Homme", female: "Femme", age: "Âge", height: "Taille (cm)", weight: "Poids (kg)", activity: "Niveau d'activité", bmr: "MB (métabolisme de base)", tdee: "DEJ (maintien)", kcalDay: "kcal/jour", lose: "Perte (−500)", maintain: "Maintien", gain: "Prise (+500)", levels: ["Sédentaire", "Léger (1–3 j/sem)", "Modéré (3–5 j/sem)", "Actif (6–7 j/sem)", "Très actif (travail physique/2x)"] },
  es: { sex: "Sexo", male: "Hombre", female: "Mujer", age: "Edad", height: "Altura (cm)", weight: "Peso (kg)", activity: "Nivel de actividad", bmr: "TMB (metabolismo basal)", tdee: "GET (mantenimiento)", kcalDay: "kcal/día", lose: "Bajar (−500)", maintain: "Mantener", gain: "Subir (+500)", levels: ["Sedentario", "Ligero (1–3 d/sem)", "Moderado (3–5 d/sem)", "Activo (6–7 d/sem)", "Muy activo (trabajo físico/2x)"] },
};

const FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9];

interface Props {
  locale: Locale;
}

export default function TdeeCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("30");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("70");
  const [level, setLevel] = useState(2);

  const a = parseFloat(age);
  const h = parseFloat(height);
  const w = parseFloat(weight);
  const valid = a > 0 && h > 0 && w > 0;

  // Mifflin–St Jeor
  const bmr = valid ? 10 * w + 6.25 * h - 5 * a + (sex === "male" ? 5 : -161) : 0;
  const tdee = bmr * FACTORS[level];

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";
  const r = (n: number) => Math.round(n);

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
          <span className="text-sm font-medium text-muted-foreground">{t.age}</span>
          <input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.height}</span>
          <input type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.weight}</span>
          <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-muted-foreground">{t.activity}</span>
          <select value={level} onChange={(e) => setLevel(parseInt(e.target.value))} className={`mt-1 w-full ${inputCls}`}>
            {t.levels.map((lv, i) => (
              <option key={i} value={i}>{lv}</option>
            ))}
          </select>
        </label>
      </div>

      {valid && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-background px-3 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.bmr}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{r(bmr)} <span className="text-sm font-normal text-muted-foreground">{t.kcalDay}</span></p>
            </div>
            <div className="rounded-md border border-primary bg-accent px-3 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.tdee}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">{r(tdee)} <span className="text-sm font-normal text-muted-foreground">{t.kcalDay}</span></p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 text-center text-sm">
            <div className="rounded-md border border-border px-3 py-2"><span className="text-muted-foreground">{t.lose}</span><br /><span className="font-mono font-semibold text-foreground">{r(tdee - 500)}</span></div>
            <div className="rounded-md border border-border px-3 py-2"><span className="text-muted-foreground">{t.maintain}</span><br /><span className="font-mono font-semibold text-foreground">{r(tdee)}</span></div>
            <div className="rounded-md border border-border px-3 py-2"><span className="text-muted-foreground">{t.gain}</span><br /><span className="font-mono font-semibold text-foreground">{r(tdee + 500)}</span></div>
          </div>
        </>
      )}
    </div>
  );
}
