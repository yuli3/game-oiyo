import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  start: string;
  end: string;
  breakMin: string;
  rate: string;
  rateHint: string;
  duration: string;
  decimal: string;
  pay: string;
  hours: string;
  overnight: string;
}

const L: Record<string, UiLabels> = {
  en: { start: "Start time", end: "End time", breakMin: "Break (minutes)", rate: "Hourly rate (optional)", rateHint: "Enter a pay rate to estimate earnings.", duration: "Duration", decimal: "Decimal hours", pay: "Estimated pay", hours: "h", overnight: "Ends next day" },
  ko: { start: "시작 시각", end: "종료 시각", breakMin: "휴게 시간 (분)", rate: "시급 (선택)", rateHint: "시급을 입력하면 급여를 추정합니다.", duration: "근무 시간", decimal: "십진 시간", pay: "추정 급여", hours: "시간", overnight: "익일 종료" },
  ja: { start: "開始時刻", end: "終了時刻", breakMin: "休憩 (分)", rate: "時給 (任意)", rateHint: "時給を入力すると給与を試算します。", duration: "勤務時間", decimal: "10進時間", pay: "推定給与", hours: "時間", overnight: "翌日終了" },
  zh: { start: "开始时间", end: "结束时间", breakMin: "休息 (分钟)", rate: "时薪 (可选)", rateHint: "输入时薪可估算收入。", duration: "时长", decimal: "十进制小时", pay: "预估薪资", hours: "小时", overnight: "次日结束" },
  fr: { start: "Heure de début", end: "Heure de fin", breakMin: "Pause (minutes)", rate: "Taux horaire (option)", rateHint: "Saisissez un taux pour estimer la paie.", duration: "Durée", decimal: "Heures décimales", pay: "Paie estimée", hours: "h", overnight: "Finit le lendemain" },
  es: { start: "Hora de inicio", end: "Hora de fin", breakMin: "Descanso (minutos)", rate: "Tarifa por hora (opcional)", rateHint: "Introduce una tarifa para estimar el pago.", duration: "Duración", decimal: "Horas decimales", pay: "Pago estimado", hours: "h", overnight: "Termina al día siguiente" },
};

const CURRENCY: Record<string, string> = { ko: "₩", en: "$", ja: "¥", fr: "€", es: "€", zh: "¥", };
const LOCALE_NUM: Record<string, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP", fr: "fr-FR", es: "es-ES", zh: "zh-CN", };

interface Props {
  locale: Locale;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export default function HoursCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const currency = CURRENCY[locale] ?? "$";
  const noDecimals = locale === "ko" || locale === "ja";

  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:30");
  const [brk, setBrk] = useState("60");
  const [rate, setRate] = useState("");

  const s = toMinutes(start);
  const e = toMinutes(end);
  const b = Math.max(0, parseFloat(brk) || 0);
  const valid = s !== null && e !== null;

  let worked = 0;
  let overnight = false;
  if (valid) {
    let diff = e - s;
    if (diff < 0) {
      diff += 24 * 60;
      overnight = true;
    }
    worked = Math.max(0, diff - b);
  }

  const h = Math.floor(worked / 60);
  const min = worked % 60;
  const decimal = worked / 60;

  const r = parseFloat(rate);
  const hasRate = valid && r > 0;
  const pay = hasRate ? decimal * r : 0;

  const fmtPay = (n: number) =>
    new Intl.NumberFormat(LOCALE_NUM[locale] ?? "en-US", {
      minimumFractionDigits: noDecimals ? 0 : 2,
      maximumFractionDigits: noDecimals ? 0 : 2,
    }).format(noDecimals ? Math.round(n) : n);

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.start}</span>
          <input type="time" value={start} onChange={(ev) => setStart(ev.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.end}</span>
          <input type="time" value={end} onChange={(ev) => setEnd(ev.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.breakMin}</span>
          <input type="number" inputMode="numeric" value={brk} onChange={(ev) => setBrk(ev.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.rate}</span>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
            <input type="number" inputMode="decimal" value={rate} onChange={(ev) => setRate(ev.target.value)} className={`w-full pl-7 ${inputCls}`} placeholder="0" />
          </div>
        </label>
      </div>

      {valid && (
        <>
          {overnight && (
            <p className="mt-3 text-xs text-muted-foreground">⏱ {t.overnight}</p>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-primary bg-accent px-3 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.duration}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">{h}{t.hours} {min.toString().padStart(2, "0")}m</p>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.decimal}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{decimal.toFixed(2)}</p>
            </div>
          </div>
          {hasRate && (
            <div className="mt-3 rounded-md border border-border px-3 py-2 text-center text-sm">
              <span className="text-muted-foreground">{t.pay}: </span>
              <span className="font-mono font-semibold text-foreground">{currency}{fmtPay(pay)}</span>
            </div>
          )}
          <p className="mt-2 text-center text-xs text-muted-foreground">{t.rateHint}</p>
        </>
      )}
    </div>
  );
}
