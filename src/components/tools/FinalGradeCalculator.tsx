import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  current: string;
  weight: string;
  desired: string;
  needed: string;
  resultHint: string;
  impossible: string;
  secured: string;
  pct: string;
}

const L: Record<string, UiLabels> = {
  en: { current: "Current grade (%)", weight: "Final exam weight (%)", desired: "Desired overall grade (%)", needed: "You need on the final", resultHint: "Score required on the final to reach your target.", impossible: "Not reachable with a max 100% final — you'd need extra credit.", secured: "Already secured — even 0% on the final keeps your target.", pct: "%" },
  ko: { current: "현재 성적 (%)", weight: "기말고사 비중 (%)", desired: "목표 최종 성적 (%)", needed: "기말고사 필요 점수", resultHint: "목표 달성에 필요한 기말고사 점수입니다.", impossible: "기말 100%로도 도달 불가 — 추가 점수(가산점)가 필요합니다.", secured: "이미 확보 — 기말 0%여도 목표를 유지합니다.", pct: "%" },
  ja: { current: "現在の成績 (%)", weight: "期末試験の比重 (%)", desired: "目標の最終成績 (%)", needed: "期末試験で必要な点", resultHint: "目標達成に必要な期末試験の点数です。", impossible: "期末100%でも届きません — 加点が必要です。", secured: "すでに確保 — 期末0%でも目標を維持します。", pct: "%" },
  zh: { current: "当前成绩 (%)", weight: "期末考试占比 (%)", desired: "目标总成绩 (%)", needed: "期末需要得分", resultHint: "达到目标所需的期末考试分数。", impossible: "即使期末100%也无法达到 — 需要额外加分。", secured: "已锁定 — 期末0分也能保持目标。", pct: "%" },
  fr: { current: "Note actuelle (%)", weight: "Poids de l'examen final (%)", desired: "Note finale visée (%)", needed: "Note requise à l'examen", resultHint: "Note nécessaire à l'examen final pour atteindre l'objectif.", impossible: "Inatteignable avec un final à 100 % — il faudrait des points bonus.", secured: "Déjà acquis — même 0 % au final garde l'objectif.", pct: "%" },
  es: { current: "Nota actual (%)", weight: "Peso del examen final (%)", desired: "Nota final deseada (%)", needed: "Nota necesaria en el final", resultHint: "Nota requerida en el examen final para alcanzar la meta.", impossible: "Inalcanzable con un final al 100 % — necesitarías puntos extra.", secured: "Ya asegurado — incluso 0 % en el final mantiene la meta.", pct: "%" },
};

interface Props {
  locale: Locale;
}

export default function FinalGradeCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;

  const [current, setCurrent] = useState("85");
  const [weight, setWeight] = useState("30");
  const [desired, setDesired] = useState("90");

  const cg = parseFloat(current);
  const w = parseFloat(weight);
  const dg = parseFloat(desired);
  const valid = !isNaN(cg) && !isNaN(dg) && w > 0 && w <= 100;

  const wf = w / 100;
  // desired = current*(1-wf) + needed*wf  =>  needed = (desired - current*(1-wf)) / wf
  const needed = valid ? (dg - cg * (1 - wf)) / wf : 0;
  const impossible = valid && needed > 100;
  const secured = valid && needed < 0;

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.current}</span>
          <input type="number" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.weight}</span>
          <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.desired}</span>
          <input type="number" inputMode="decimal" value={desired} onChange={(e) => setDesired(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
      </div>

      {valid && (
        <>
          <div className="mt-6 rounded-md border border-primary bg-accent px-3 py-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">{t.needed}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-primary">
              {Math.max(0, Math.min(100, needed)).toFixed(1)}{t.pct}
            </p>
          </div>
          {impossible ? (
            <p className="mt-3 rounded-md border border-destructive px-3 py-2 text-center text-sm text-destructive">{t.impossible}</p>
          ) : secured ? (
            <p className="mt-3 rounded-md border border-border px-3 py-2 text-center text-sm text-muted-foreground">{t.secured}</p>
          ) : (
            <p className="mt-3 text-center text-xs text-muted-foreground">{t.resultHint}</p>
          )}
        </>
      )}
    </div>
  );
}
