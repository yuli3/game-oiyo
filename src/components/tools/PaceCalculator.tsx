import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  pace: string;
  min: string;
  sec: string;
  speed: string;
  paceMile: string;
  finish: string;
  invalid: string;
}

const LABELS: Record<string, UiLabels> = {
  en: { pace: "Pace (per km)", min: "min", sec: "sec", speed: "Speed", paceMile: "Pace (per mile)", finish: "Finish time", invalid: "Enter a pace" },
  ko: { pace: "페이스 (km당)", min: "분", sec: "초", speed: "속도", paceMile: "페이스 (마일당)", finish: "완주 예상", invalid: "페이스를 입력하세요" },
  ja: { pace: "ペース (1kmあたり)", min: "分", sec: "秒", speed: "速度", paceMile: "ペース (1マイルあたり)", finish: "完走予想", invalid: "ペースを入力してください" },
  zh: { pace: "配速 (每公里)", min: "分", sec: "秒", speed: "速度", paceMile: "配速 (每英里)", finish: "完成时间", invalid: "请输入配速" },
  fr: { pace: "Allure (par km)", min: "min", sec: "s", speed: "Vitesse", paceMile: "Allure (par mile)", finish: "Temps d'arrivée", invalid: "Saisissez une allure" },
  es: { pace: "Ritmo (por km)", min: "min", sec: "s", speed: "Velocidad", paceMile: "Ritmo (por milla)", finish: "Tiempo de meta", invalid: "Introduce un ritmo" },
};

const MILE_KM = 1.609344;
const DISTANCES: [string, number][] = [
  ["5K", 5],
  ["10K", 10],
  ["Half", 21.0975],
  ["Full", 42.195],
];

function fmtMS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function fmtHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  locale: Locale;
}

export default function PaceCalculator({ locale }: Props) {
  const t = LABELS[locale] ?? LABELS.en;
  const [min, setMin] = useState("5");
  const [sec, setSec] = useState("30");

  const paceSecPerKm = (parseInt(min) || 0) * 60 + (parseInt(sec) || 0);
  const valid = paceSecPerKm > 0;
  const speedKmh = valid ? 3600 / paceSecPerKm : 0;
  const speedMph = speedKmh / MILE_KM;
  const paceSecPerMile = paceSecPerKm * MILE_KM;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <label className="block">
        <span className="text-sm font-medium text-muted-foreground">{t.pace}</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="w-20 rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
          <span className="text-sm text-muted-foreground">{t.min}</span>
          <input
            type="number"
            inputMode="numeric"
            value={sec}
            onChange={(e) => setSec(e.target.value)}
            className="w-20 rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
          <span className="text-sm text-muted-foreground">{t.sec}</span>
        </div>
      </label>

      {!valid ? (
        <p className="mt-4 text-sm text-muted-foreground">{t.invalid}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <div className="flex items-baseline justify-between rounded-md border border-border bg-background px-3 py-2">
              <span className="text-sm text-muted-foreground">{t.speed}</span>
              <span className="font-mono font-semibold text-foreground">{speedKmh.toFixed(2)} km/h</span>
            </div>
            <div className="flex items-baseline justify-between rounded-md border border-border bg-background px-3 py-2">
              <span className="text-sm text-muted-foreground">{t.speed}</span>
              <span className="font-mono font-semibold text-foreground">{speedMph.toFixed(2)} mph</span>
            </div>
            <div className="flex items-baseline justify-between rounded-md border border-border bg-background px-3 py-2">
              <span className="text-sm text-muted-foreground">{t.paceMile}</span>
              <span className="font-mono font-semibold text-foreground">{fmtMS(paceSecPerMile)} /mi</span>
            </div>
          </div>

          <h2 className="mt-6 text-sm font-bold uppercase tracking-widest text-primary">{t.finish}</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DISTANCES.map(([label, km]) => (
              <div key={label} className="flex items-baseline justify-between rounded-md border border-border bg-background px-3 py-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-mono font-semibold text-foreground">{fmtHMS(paceSecPerKm * km)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
