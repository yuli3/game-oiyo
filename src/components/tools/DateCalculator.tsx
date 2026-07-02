import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  modeDiff: string;
  modeAdd: string;
  from: string;
  to: string;
  base: string;
  op: string;
  add: string;
  sub: string;
  days: string;
  weeks: string;
  months: string;
  years: string;
  amount: string;
  unit: string;
  resultDate: string;
  totalDays: string;
  between: string;
  weekday: string;
}

const L: Record<string, UiLabels> = {
  en: { modeDiff: "Days between", modeAdd: "Add / subtract", from: "Start date", to: "End date", base: "Start date", op: "Operation", add: "Add", sub: "Subtract", days: "Days", weeks: "Weeks", months: "Months", years: "Years", amount: "Amount", unit: "Unit", resultDate: "Result date", totalDays: "Total days", between: "Difference", weekday: "Weekday" },
  ko: { modeDiff: "날짜 간격", modeAdd: "더하기 / 빼기", from: "시작 날짜", to: "종료 날짜", base: "기준 날짜", op: "연산", add: "더하기", sub: "빼기", days: "일", weeks: "주", months: "개월", years: "년", amount: "수량", unit: "단위", resultDate: "결과 날짜", totalDays: "총 일수", between: "간격", weekday: "요일" },
  ja: { modeDiff: "日数の差", modeAdd: "加算 / 減算", from: "開始日", to: "終了日", base: "基準日", op: "演算", add: "加算", sub: "減算", days: "日", weeks: "週", months: "ヶ月", years: "年", amount: "数量", unit: "単位", resultDate: "結果の日付", totalDays: "合計日数", between: "差", weekday: "曜日" },
  zh: { modeDiff: "日期间隔", modeAdd: "加 / 减", from: "开始日期", to: "结束日期", base: "基准日期", op: "运算", add: "加", sub: "减", days: "天", weeks: "周", months: "个月", years: "年", amount: "数量", unit: "单位", resultDate: "结果日期", totalDays: "总天数", between: "间隔", weekday: "星期" },
  fr: { modeDiff: "Jours entre", modeAdd: "Ajouter / soustraire", from: "Date de début", to: "Date de fin", base: "Date de référence", op: "Opération", add: "Ajouter", sub: "Soustraire", days: "Jours", weeks: "Semaines", months: "Mois", years: "Années", amount: "Quantité", unit: "Unité", resultDate: "Date résultante", totalDays: "Total de jours", between: "Écart", weekday: "Jour" },
  es: { modeDiff: "Días entre", modeAdd: "Sumar / restar", from: "Fecha inicial", to: "Fecha final", base: "Fecha base", op: "Operación", add: "Sumar", sub: "Restar", days: "Días", weeks: "Semanas", months: "Meses", years: "Años", amount: "Cantidad", unit: "Unidad", resultDate: "Fecha resultante", totalDays: "Días totales", between: "Diferencia", weekday: "Día" },
};

const LOCALE_TAG: Record<string, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP", fr: "fr-FR", es: "es-ES", zh: "zh-CN", };

interface Props {
  locale: Locale;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parse(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export default function DateCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const tag = LOCALE_TAG[locale] ?? "en-US";

  const [mode, setMode] = useState<"diff" | "add">("diff");
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [base, setBase] = useState(todayStr());
  const [op, setOp] = useState<"add" | "sub">("add");
  const [amount, setAmount] = useState("30");
  const [unit, setUnit] = useState<"days" | "weeks" | "months" | "years">("days");

  const fmtDate = (d: Date) => new Intl.DateTimeFormat(tag, { year: "numeric", month: "long", day: "numeric" }).format(d);
  const fmtWeekday = (d: Date) => new Intl.DateTimeFormat(tag, { weekday: "long" }).format(d);

  // diff
  const fd = parse(from);
  const td = parse(to);
  const diffValid = fd && td;
  const totalDays = diffValid ? Math.round((td!.getTime() - fd!.getTime()) / 86400000) : 0;
  const absDays = Math.abs(totalDays);
  const weeks = Math.floor(absDays / 7);
  const remDays = absDays % 7;

  // add/sub
  const bd = parse(base);
  let result: Date | null = null;
  if (bd) {
    const r = new Date(bd.getTime());
    const amt = (parseInt(amount, 10) || 0) * (op === "sub" ? -1 : 1);
    if (unit === "days") r.setDate(r.getDate() + amt);
    else if (unit === "weeks") r.setDate(r.getDate() + amt * 7);
    else if (unit === "months") r.setMonth(r.getMonth() + amt);
    else r.setFullYear(r.getFullYear() + amt);
    result = r;
  }

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";
  const tabCls = (active: boolean) =>
    `flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-5 flex gap-2 rounded-lg border border-border bg-background p-1">
        <button type="button" onClick={() => setMode("diff")} className={tabCls(mode === "diff")}>{t.modeDiff}</button>
        <button type="button" onClick={() => setMode("add")} className={tabCls(mode === "add")}>{t.modeAdd}</button>
      </div>

      {mode === "diff" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-muted-foreground">{t.from}</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-muted-foreground">{t.to}</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
            </label>
          </div>
          {diffValid && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-primary bg-accent px-3 py-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">{t.totalDays}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-primary">{absDays}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-3 text-center">
                <p className="text-xs font-medium text-muted-foreground">{t.between}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{weeks} {t.weeks} {remDays} {t.days}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-muted-foreground">{t.base}</span>
              <input type="date" value={base} onChange={(e) => setBase(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-muted-foreground">{t.op}</span>
              <select value={op} onChange={(e) => setOp(e.target.value as "add" | "sub")} className={`mt-1 w-full ${inputCls}`}>
                <option value="add">{t.add}</option>
                <option value="sub">{t.sub}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-muted-foreground">{t.amount}</span>
              <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-muted-foreground">{t.unit}</span>
              <select value={unit} onChange={(e) => setUnit(e.target.value as "days" | "weeks" | "months" | "years")} className={`mt-1 w-full ${inputCls}`}>
                <option value="days">{t.days}</option>
                <option value="weeks">{t.weeks}</option>
                <option value="months">{t.months}</option>
                <option value="years">{t.years}</option>
              </select>
            </label>
          </div>
          {result && (
            <div className="mt-6 rounded-md border border-primary bg-accent px-3 py-4 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.resultDate}</p>
              <p className="mt-1 text-2xl font-bold text-primary">{fmtDate(result)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.weekday}: {fmtWeekday(result)}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
