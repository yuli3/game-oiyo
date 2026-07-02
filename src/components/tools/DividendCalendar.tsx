import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────
type StockType = "kr-etf" | "us-stock" | "us-etf";
type Frequency = "monthly" | "quarterly" | "annual";
type Currency = "KRW" | "USD";

type DividendStock = {
  ticker: string;
  name: Record<Locale, string>;
  type: StockType;
  frequency: Frequency;
  exDivDays: number[];
  exDivMonths?: number[];
  dividendYield: string;
  currency: Currency;
};

// ─── Static data ──────────────────────────────────────────────────────────────
const DIVIDEND_DATA: DividendStock[] = [
  // 한국 ETF (월배당)
  {
    ticker: "KODEX 미국S&P500TR",
    name: { ko: "KODEX 미국S&P500TR", en: "KODEX US S&P500TR", ja: "KODEX 米国S&P500TR", fr: "KODEX US S&P500TR", es: "KODEX US S&P500TR", zh: "KODEX 美国S&P500TR", },
    type: "kr-etf", frequency: "monthly", exDivDays: [25], dividendYield: "1.2%", currency: "KRW",
  },
  {
    ticker: "TIGER 미국배당다우존스",
    name: { ko: "TIGER 미국배당다우존스", en: "TIGER US Dividend Dow Jones", ja: "TIGER 米国配当ダウジョーンズ", fr: "TIGER US Dividende Dow Jones", es: "TIGER Dividendo US Dow Jones", zh: "TIGER 美国股息道琼斯", },
    type: "kr-etf", frequency: "monthly", exDivDays: [25], dividendYield: "3.8%", currency: "KRW",
  },
  {
    ticker: "SOL 미국S&P500",
    name: { ko: "SOL 미국S&P500", en: "SOL US S&P500", ja: "SOL 米国S&P500", fr: "SOL US S&P500", es: "SOL US S&P500", zh: "SOL 美国S&P500", },
    type: "kr-etf", frequency: "monthly", exDivDays: [25], dividendYield: "1.5%", currency: "KRW",
  },
  {
    ticker: "KODEX 배당성장",
    name: { ko: "KODEX 배당성장", en: "KODEX Dividend Growth", ja: "KODEX 配当成長", fr: "KODEX Croissance Dividendes", es: "KODEX Crecimiento Dividendos", zh: "KODEX 股息成长", },
    type: "kr-etf", frequency: "quarterly", exDivDays: [25], exDivMonths: [3, 6, 9, 12], dividendYield: "2.2%", currency: "KRW",
  },
  {
    ticker: "TIGER 코스피고배당",
    name: { ko: "TIGER 코스피고배당", en: "TIGER KOSPI High Dividend", ja: "TIGER KOSPIハイ配当", fr: "TIGER KOSPI Haut Dividende", es: "TIGER KOSPI Alto Dividendo", zh: "TIGER 韩国高股息", },
    type: "kr-etf", frequency: "quarterly", exDivDays: [25], exDivMonths: [3, 6, 9, 12], dividendYield: "3.5%", currency: "KRW",
  },
  // 미국 ETF
  {
    ticker: "SCHD",
    name: { ko: "슈왑 배당주 ETF", en: "Schwab US Dividend Equity ETF", ja: "シュワブ米国配当株ETF", fr: "Schwab ETF Actions à Dividende US", es: "Schwab ETF Acciones Dividendo US", zh: "嘉信美国股息股票ETF", },
    type: "us-etf", frequency: "quarterly", exDivDays: [15], exDivMonths: [3, 6, 9, 12], dividendYield: "3.7%", currency: "USD",
  },
  {
    ticker: "VYM",
    name: { ko: "뱅가드 고배당수익", en: "Vanguard High Dividend Yield ETF", ja: "バンガード高配当利回りETF", fr: "Vanguard ETF Haut Rendement Dividende", es: "Vanguard ETF Alto Rendimiento Dividendo", zh: "先鋒高股息收益ETF", },
    type: "us-etf", frequency: "quarterly", exDivDays: [15], exDivMonths: [3, 6, 9, 12], dividendYield: "3.1%", currency: "USD",
  },
  {
    ticker: "JEPI",
    name: { ko: "JP모건 프리미엄인컴", en: "JPMorgan Equity Premium Income ETF", ja: "JPモルガン株式プレミアムインカムETF", fr: "JPMorgan ETF Revenu Premium Actions", es: "JPMorgan ETF Ingresos Premium Acciones", zh: "摩根大通股票溢价收入ETF", },
    type: "us-etf", frequency: "monthly", exDivDays: [1], dividendYield: "7.2%", currency: "USD",
  },
  {
    ticker: "JEPQ",
    name: { ko: "JP모건 나스닥 프리미엄인컴", en: "JPMorgan Nasdaq Equity Premium Income ETF", ja: "JPモルガンナスダック株式プレミアムインカムETF", fr: "JPMorgan ETF Revenu Premium Nasdaq", es: "JPMorgan ETF Ingresos Premium Nasdaq", zh: "摩根大通纳斯达克溢价收入ETF", },
    type: "us-etf", frequency: "monthly", exDivDays: [1], dividendYield: "9.5%", currency: "USD",
  },
  {
    ticker: "QYLD",
    name: { ko: "글로벌X 나스닥100 커버드콜 ETF", en: "Global X Nasdaq 100 Covered Call ETF", ja: "グローバルXナスダック100カバードコールETF", fr: "Global X ETF Couvert Nasdaq 100", es: "Global X ETF Cobertura Nasdaq 100", zh: "Global X 纳斯达克100备兑买权ETF", },
    type: "us-etf", frequency: "monthly", exDivDays: [15], dividendYield: "11.2%", currency: "USD",
  },
  // 미국 배당주
  {
    ticker: "O",
    name: { ko: "리얼티 인컴", en: "Realty Income Corp", ja: "リアルティ・インカム", fr: "Realty Income Corp", es: "Realty Income Corp", zh: "房地产收入公司", },
    type: "us-stock", frequency: "monthly", exDivDays: [1], dividendYield: "5.8%", currency: "USD",
  },
  {
    ticker: "T",
    name: { ko: "AT&T", en: "AT&T Inc.", ja: "AT&T Inc.", fr: "AT&T Inc.", es: "AT&T Inc.", zh: "AT&T公司", },
    type: "us-stock", frequency: "quarterly", exDivDays: [8], exDivMonths: [1, 4, 7, 10], dividendYield: "6.2%", currency: "USD",
  },
  {
    ticker: "KO",
    name: { ko: "코카콜라", en: "The Coca-Cola Company", ja: "コカ・コーラ", fr: "The Coca-Cola Company", es: "The Coca-Cola Company", zh: "可口可樂公司", },
    type: "us-stock", frequency: "quarterly", exDivDays: [13], exDivMonths: [3, 6, 9, 12], dividendYield: "3.1%", currency: "USD",
  },
  {
    ticker: "JNJ",
    name: { ko: "존슨앤드존슨", en: "Johnson & Johnson", ja: "ジョンソン・エンド・ジョンソン", fr: "Johnson & Johnson", es: "Johnson & Johnson", zh: "嬌生公司", },
    type: "us-stock", frequency: "quarterly", exDivDays: [22], exDivMonths: [2, 5, 8, 11], dividendYield: "3.0%", currency: "USD",
  },
  {
    ticker: "PFE",
    name: { ko: "화이자", en: "Pfizer Inc.", ja: "ファイザー", fr: "Pfizer Inc.", es: "Pfizer Inc.", zh: "輝瑞公司", },
    type: "us-stock", frequency: "quarterly", exDivDays: [26], exDivMonths: [1, 4, 7, 10], dividendYield: "5.9%", currency: "USD",
  },
  {
    ticker: "ABBV",
    name: { ko: "애브비", en: "AbbVie Inc.", ja: "アッヴィ", fr: "AbbVie Inc.", es: "AbbVie Inc.", zh: "艾伯維公司", },
    type: "us-stock", frequency: "quarterly", exDivDays: [12], exDivMonths: [1, 4, 7, 10], dividendYield: "3.8%", currency: "USD",
  },
  {
    ticker: "MO",
    name: { ko: "알트리아", en: "Altria Group", ja: "アルトリア・グループ", fr: "Altria Group", es: "Altria Group", zh: "奧馳亞集團", },
    type: "us-stock", frequency: "quarterly", exDivDays: [13], exDivMonths: [3, 6, 9, 12], dividendYield: "8.4%", currency: "USD",
  },
];

// ─── Helper: compute ex-div days for a given month/year ─────────────────────
function getExDivDatesForMonth(stock: DividendStock, year: number, month: number): number[] {
  // month: 1-based
  if (stock.frequency === "monthly") {
    return stock.exDivDays;
  }
  if (stock.frequency === "quarterly" || stock.frequency === "annual") {
    if (stock.exDivMonths && stock.exDivMonths.includes(month)) {
      return stock.exDivDays;
    }
    return [];
  }
  return [];
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
type UIStrings = {
  title: string;
  subtitle: string;
  filterAll: string;
  filterKrEtf: string;
  filterUsEtf: string;
  filterUsStock: string;
  prev: string;
  next: string;
  upcomingTitle: string;
  noEvents: string;
  frequency: string;
  yield: string;
  freqMonthly: string;
  freqQuarterly: string;
  freqAnnual: string;
  exDivDate: string;
  close: string;
  day: string[];
};

const UI: Record<Locale, UIStrings> = {
  ko: {
    title: "배당 캘린더", subtitle: "배당주·배당 ETF 배당 일정",
    filterAll: "전체", filterKrEtf: "한국ETF", filterUsEtf: "미국ETF", filterUsStock: "미국주식",
    prev: "‹", next: "›",
    upcomingTitle: "이번 달 배당 일정",
    noEvents: "이번 달 배당 일정 없음",
    frequency: "배당 주기", yield: "배당수익률",
    freqMonthly: "월배당", freqQuarterly: "분기배당", freqAnnual: "연배당",
    exDivDate: "배당락일",
    close: "닫기",
    day: ["일", "월", "화", "수", "목", "금", "토"],
  },
  en: {
    title: "Dividend Calendar", subtitle: "Dividend Stock & ETF Schedule",
    filterAll: "All", filterKrEtf: "KR ETF", filterUsEtf: "US ETF", filterUsStock: "US Stock",
    prev: "‹", next: "›",
    upcomingTitle: "This Month's Dividends",
    noEvents: "No dividend events this month",
    frequency: "Frequency", yield: "Dividend Yield",
    freqMonthly: "Monthly", freqQuarterly: "Quarterly", freqAnnual: "Annual",
    exDivDate: "Ex-Div Date",
    close: "Close",
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  ja: {
    title: "配当カレンダー", subtitle: "配当株・配当ETFのスケジュール",
    filterAll: "全て", filterKrEtf: "韓国ETF", filterUsEtf: "米国ETF", filterUsStock: "米国株",
    prev: "‹", next: "›",
    upcomingTitle: "今月の配当予定",
    noEvents: "今月の配当予定なし",
    frequency: "配当頻度", yield: "配当利回り",
    freqMonthly: "毎月", freqQuarterly: "四半期", freqAnnual: "年次",
    exDivDate: "権利落ち日",
    close: "閉じる",
    day: ["日", "月", "火", "水", "木", "金", "土"],
  },
  fr: {
    title: "Calendrier de Dividendes", subtitle: "Calendrier des Actions et ETFs Dividendes",
    filterAll: "Tout", filterKrEtf: "ETF KR", filterUsEtf: "ETF US", filterUsStock: "Action US",
    prev: "‹", next: "›",
    upcomingTitle: "Dividendes ce mois",
    noEvents: "Aucun dividende ce mois",
    frequency: "Fréquence", yield: "Rendement",
    freqMonthly: "Mensuel", freqQuarterly: "Trimestriel", freqAnnual: "Annuel",
    exDivDate: "Date ex-dividende",
    close: "Fermer",
    day: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  },
  es: {
    title: "Calendario de Dividendos", subtitle: "Acciones y ETFs con Dividendos",
    filterAll: "Todo", filterKrEtf: "ETF KR", filterUsEtf: "ETF US", filterUsStock: "Acción US",
    prev: "‹", next: "›",
    upcomingTitle: "Dividendos este mes",
    noEvents: "Sin dividendos este mes",
    frequency: "Frecuencia", yield: "Rendimiento",
    freqMonthly: "Mensual", freqQuarterly: "Trimestral", freqAnnual: "Anual",
    exDivDate: "Fecha ex-dividendo",
    close: "Cerrar",
    day: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  },
  zh: {
    title: "股息日历", subtitle: "股息股票与ETF时间表",
    filterAll: "全部", filterKrEtf: "韩国ETF", filterUsEtf: "美国ETF", filterUsStock: "美国股票",
    prev: "‹", next: "›",
    upcomingTitle: "本月股息安排",
    noEvents: "本月无股息安排",
    frequency: "派息频率", yield: "股息收益率",
    freqMonthly: "每月", freqQuarterly: "每季", freqAnnual: "每年",
    exDivDate: "除息日",
    close: "关闭",
    day: ["日", "一", "二", "三", "四", "五", "六"],
  },
};

// ─── Badge color by type ──────────────────────────────────────────────────────
const TYPE_COLOR: Record<StockType, string> = {
  "kr-etf": "bg-blue-100 text-blue-700",
  "us-etf": "bg-purple-100 text-purple-700",
  "us-stock": "bg-orange-100 text-orange-700",
};

const MONTH_NAMES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES: Record<Locale, string[]> = {
  ko: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  en: MONTH_NAMES_EN,
  ja: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  fr: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"],
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
};

// ─── Component ────────────────────────────────────────────────────────────────
type FilterType = "all" | StockType;

export default function DividendCalendar({ locale = "ko" }: { locale?: Locale }) {
  const t = UI[locale] ?? UI.en;
  const monthNames = MONTH_NAMES[locale] ?? MONTH_NAMES.en;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based
  const [filter, setFilter] = useState<FilterType>("all");
  const [selected, setSelected] = useState<DividendStock | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const filteredStocks = DIVIDEND_DATA.filter((s) =>
    filter === "all" ? true : s.type === filter
  );

  // navigate months
  const prevMonth = useCallback(() => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else { setMonth((m) => m - 1); }
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else { setMonth((m) => m + 1); }
  }, [month]);

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  // Map day → list of stocks with ex-div
  const dayStocks: Record<number, DividendStock[]> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const stocks: DividendStock[] = [];
    for (const s of filteredStocks) {
      const days = getExDivDatesForMonth(s, year, month);
      if (days.includes(d)) stocks.push(s);
    }
    if (stocks.length > 0) dayStocks[d] = stocks;
  }

  // Upcoming list (sorted by day)
  const upcoming: { day: number; stock: DividendStock }[] = [];
  for (const [dayStr, stocks] of Object.entries(dayStocks)) {
    for (const s of stocks) upcoming.push({ day: parseInt(dayStr, 10), stock: s });
  }
  upcoming.sort((a, b) => a.day - b.day);

  // close detail on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (detailRef.current && !detailRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    };
    if (selected) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selected]);

  const freqLabel = (f: Frequency) =>
    f === "monthly" ? t.freqMonthly : f === "quarterly" ? t.freqQuarterly : t.freqAnnual;

  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-foreground">{t.title}</h1>
        <p className="text-xs font-semibold text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-2xl border border-border flex-wrap">
        {(
          [
            { key: "all" as FilterType, label: t.filterAll },
            { key: "kr-etf" as FilterType, label: t.filterKrEtf },
            { key: "us-etf" as FilterType, label: t.filterUsEtf },
            { key: "us-stock" as FilterType, label: t.filterUsStock },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              filter === key
                ? "bg-background shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="px-4 py-2 rounded-xl bg-muted text-sm font-bold hover:bg-muted/80 transition"
        >
          {t.prev}
        </button>
        <h2 className="text-lg font-black text-foreground">
          {year} {monthNames[month - 1]}
        </h2>
        <button
          onClick={nextMonth}
          className="px-4 py-2 rounded-xl bg-muted text-sm font-bold hover:bg-muted/80 transition"
        >
          {t.next}
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/60">
          {t.day.map((d, i) => (
            <div
              key={i}
              className={`text-center py-2 text-[10px] font-black uppercase tracking-widest ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-border">
            {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
              const colIdx = di;
              const hasEvents = day !== null && dayStocks[day];
              return (
                <div
                  key={di}
                  className={`min-h-[64px] p-1 border-r last:border-r-0 border-border flex flex-col gap-1 ${
                    day === null ? "bg-muted/20" : ""
                  } ${isToday(day ?? 0) ? "bg-primary/5" : ""}`}
                >
                  {day !== null && (
                    <>
                      <span
                        className={`text-xs font-bold self-start w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday(day)
                            ? "bg-primary text-white"
                            : colIdx === 0
                            ? "text-red-500"
                            : colIdx === 6
                            ? "text-blue-500"
                            : "text-foreground"
                        }`}
                      >
                        {day}
                      </span>
                      {hasEvents &&
                        dayStocks[day].map((s) => (
                          <button
                            key={s.ticker}
                            onClick={() => setSelected(s)}
                            className={`text-[9px] font-bold px-1 py-0.5 rounded truncate text-left w-full ${TYPE_COLOR[s.type]}`}
                            title={s.name[locale]}
                          >
                            {s.ticker.length > 6 ? s.ticker.slice(0, 6) + "…" : s.ticker}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            ref={detailRef}
            className="bg-background rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${TYPE_COLOR[selected.type]}`}>
                  {selected.type === "kr-etf" ? "KR ETF" : selected.type === "us-etf" ? "US ETF" : "US Stock"}
                </span>
                <h3 className="text-lg font-black text-foreground mt-1">{selected.ticker}</h3>
                <p className="text-sm text-muted-foreground">{selected.name[locale]}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DetailCell label={t.yield} value={selected.dividendYield} highlight />
              <DetailCell label={t.frequency} value={freqLabel(selected.frequency)} />
              <DetailCell
                label={t.exDivDate}
                value={
                  selected.exDivMonths
                    ? selected.exDivMonths.map((m) => `${monthNames[m - 1]} ${selected.exDivDays[0]}`).join(", ")
                    : `${t.freqMonthly} ${selected.exDivDays[0]}`
                }
                wide
              />
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full py-2 rounded-xl bg-muted text-sm font-bold hover:bg-muted/80 transition"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming list */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
          {t.upcomingTitle}
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noEvents}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map(({ day, stock }, idx) => (
              <button
                key={`${stock.ticker}-${idx}`}
                onClick={() => setSelected(stock)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition text-left"
              >
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0">
                  {day}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{stock.ticker}</p>
                  <p className="text-xs text-muted-foreground truncate">{stock.name[locale]}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-green-600">{stock.dividendYield}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLOR[stock.type]}`}>
                    {stock.currency}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DetailCell ───────────────────────────────────────────────────────────────
function DetailCell({
  label, value, highlight, wide,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`p-3 rounded-xl bg-muted/40 border border-border ${wide ? "col-span-2" : ""}`}>
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? "text-green-600" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
