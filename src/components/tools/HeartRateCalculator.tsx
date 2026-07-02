import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  age: string;
  resting: string;
  restingHint: string;
  maxHr: string;
  bpm: string;
  zones: string;
  zoneNames: string[];
  method: string;
}

const L: Record<string, UiLabels> = {
  en: { age: "Age", resting: "Resting HR (optional)", restingHint: "Add resting heart rate for Karvonen (reserve) zones.", maxHr: "Max heart rate", bpm: "bpm", zones: "Target zones", zoneNames: ["Z1 Recovery (50–60%)", "Z2 Endurance (60–70%)", "Z3 Aerobic (70–80%)", "Z4 Threshold (80–90%)", "Z5 Maximum (90–100%)"], method: "Max HR = 220 − age" },
  ko: { age: "나이", resting: "안정시 심박수 (선택)", restingHint: "안정시 심박수를 넣으면 카르보넨(여유심박) 존으로 계산합니다.", maxHr: "최대 심박수", bpm: "bpm", zones: "목표 심박존", zoneNames: ["Z1 회복 (50–60%)", "Z2 지구력 (60–70%)", "Z3 유산소 (70–80%)", "Z4 역치 (80–90%)", "Z5 최대 (90–100%)"], method: "최대 심박수 = 220 − 나이" },
  ja: { age: "年齢", resting: "安静時心拍 (任意)", restingHint: "安静時心拍を入れるとカルボーネン(予備心拍)ゾーンで計算します。", maxHr: "最大心拍数", bpm: "bpm", zones: "目標心拍ゾーン", zoneNames: ["Z1 回復 (50–60%)", "Z2 持久力 (60–70%)", "Z3 有酸素 (70–80%)", "Z4 閾値 (80–90%)", "Z5 最大 (90–100%)"], method: "最大心拍数 = 220 − 年齢" },
  zh: { age: "年龄", resting: "静息心率 (可选)", restingHint: "输入静息心率可用卡氏(储备心率)区间计算。", maxHr: "最大心率", bpm: "bpm", zones: "目标心率区间", zoneNames: ["Z1 恢复 (50–60%)", "Z2 耐力 (60–70%)", "Z3 有氧 (70–80%)", "Z4 阈值 (80–90%)", "Z5 最大 (90–100%)"], method: "最大心率 = 220 − 年龄" },
  fr: { age: "Âge", resting: "FC de repos (option)", restingHint: "Ajoutez la FC de repos pour les zones Karvonen (réserve).", maxHr: "FC maximale", bpm: "bpm", zones: "Zones cibles", zoneNames: ["Z1 Récupération (50–60%)", "Z2 Endurance (60–70%)", "Z3 Aérobie (70–80%)", "Z4 Seuil (80–90%)", "Z5 Maximum (90–100%)"], method: "FC max = 220 − âge" },
  es: { age: "Edad", resting: "FC en reposo (opcional)", restingHint: "Añade la FC en reposo para zonas Karvonen (reserva).", maxHr: "FC máxima", bpm: "bpm", zones: "Zonas objetivo", zoneNames: ["Z1 Recuperación (50–60%)", "Z2 Resistencia (60–70%)", "Z3 Aeróbica (70–80%)", "Z4 Umbral (80–90%)", "Z5 Máxima (90–100%)"], method: "FC máx = 220 − edad" },
};

const ZONES: [number, number][] = [
  [0.5, 0.6],
  [0.6, 0.7],
  [0.7, 0.8],
  [0.8, 0.9],
  [0.9, 1.0],
];

interface Props {
  locale: Locale;
}

export default function HeartRateCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const [age, setAge] = useState("30");
  const [resting, setResting] = useState("");

  const a = parseFloat(age);
  const valid = a > 0 && a < 120;
  const maxHr = valid ? 220 - a : 0;

  const rest = parseFloat(resting);
  const useKarvonen = valid && rest > 0 && rest < maxHr;
  const reserve = maxHr - (useKarvonen ? rest : 0);

  // zone bpm: Karvonen => rest + pct*reserve ; else pct*maxHr
  const zoneBpm = (pct: number) => (useKarvonen ? rest + pct * reserve : pct * maxHr);
  const r = (n: number) => Math.round(n);

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.age}</span>
          <input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.resting}</span>
          <input type="number" inputMode="numeric" value={resting} onChange={(e) => setResting(e.target.value)} className={`mt-1 w-full ${inputCls}`} placeholder="—" />
        </label>
      </div>

      {valid && (
        <>
          <div className="mt-6 rounded-md border border-primary bg-accent px-3 py-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">{t.maxHr}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-primary">{r(maxHr)} <span className="text-sm font-normal text-muted-foreground">{t.bpm}</span></p>
            <p className="mt-1 text-xs text-muted-foreground">{t.method}</p>
          </div>
          <p className="mt-4 mb-2 text-sm font-medium text-muted-foreground">{t.zones}</p>
          <div className="grid gap-2">
            {ZONES.map(([lo, hi], i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t.zoneNames[i]}</span>
                <span className="font-mono font-semibold text-foreground">{r(zoneBpm(lo))}–{r(zoneBpm(hi))} {t.bpm}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t.restingHint}</p>
        </>
      )}
    </div>
  );
}
