import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  weight: string;
  reps: string;
  estimated: string;
  epley: string;
  brzycki: string;
  average: string;
  percentages: string;
  pct: string;
  reps1: string;
}

const L: Record<string, UiLabels> = {
  en: { weight: "Weight lifted", reps: "Reps performed", estimated: "Estimated 1RM", epley: "Epley", brzycki: "Brzycki", average: "Average", percentages: "Training percentages", pct: "%", reps1: "≈ reps" },
  ko: { weight: "들어 올린 무게", reps: "수행 횟수", estimated: "추정 1RM", epley: "Epley", brzycki: "Brzycki", average: "평균", percentages: "훈련 강도표", pct: "%", reps1: "≈ 회" },
  ja: { weight: "挙上重量", reps: "実施回数", estimated: "推定1RM", epley: "Epley", brzycki: "Brzycki", average: "平均", percentages: "トレーニング強度表", pct: "%", reps1: "≈ 回" },
  zh: { weight: "举起重量", reps: "完成次数", estimated: "估算 1RM", epley: "Epley", brzycki: "Brzycki", average: "平均", percentages: "训练强度表", pct: "%", reps1: "≈ 次" },
  fr: { weight: "Charge soulevée", reps: "Répétitions", estimated: "1RM estimé", epley: "Epley", brzycki: "Brzycki", average: "Moyenne", percentages: "Pourcentages d'entraînement", pct: "%", reps1: "≈ reps" },
  es: { weight: "Peso levantado", reps: "Repeticiones", estimated: "1RM estimado", epley: "Epley", brzycki: "Brzycki", average: "Promedio", percentages: "Porcentajes de entrenamiento", pct: "%", reps1: "≈ reps" },
};

// approx reps achievable at a given %1RM (common training chart)
const PCT_TABLE: { pct: number; reps: number }[] = [
  { pct: 100, reps: 1 },
  { pct: 95, reps: 2 },
  { pct: 90, reps: 4 },
  { pct: 85, reps: 6 },
  { pct: 80, reps: 8 },
  { pct: 75, reps: 10 },
  { pct: 70, reps: 12 },
  { pct: 60, reps: 16 },
];

interface Props {
  locale: Locale;
}

export default function OneRepMaxCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const [weight, setWeight] = useState("80");
  const [reps, setReps] = useState("5");

  const w = parseFloat(weight);
  const reps_ = parseInt(reps, 10);
  const valid = w > 0 && reps_ >= 1 && reps_ <= 20;

  const epley = valid ? w * (1 + reps_ / 30) : 0;
  const brzycki = valid && reps_ < 37 ? (w * 36) / (37 - reps_) : 0;
  const avg = (epley + brzycki) / 2;

  const r = (n: number) => Math.round(n * 10) / 10;

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.weight}</span>
          <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.reps}</span>
          <input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
      </div>

      {valid && (
        <>
          <div className="mt-6 rounded-md border border-primary bg-accent px-3 py-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">{t.estimated} ({t.average})</p>
            <p className="mt-1 font-mono text-3xl font-bold text-primary">{r(avg)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.epley} {r(epley)} · {t.brzycki} {r(brzycki)}</p>
          </div>
          <p className="mt-4 mb-2 text-sm font-medium text-muted-foreground">{t.percentages}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PCT_TABLE.map((row) => (
              <div key={row.pct} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{row.pct}{t.pct} · {row.reps} {t.reps1}</span>
                <span className="font-mono font-semibold text-foreground">{r(avg * (row.pct / 100))}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
