import { useEffect, useRef } from 'react';

/**
 * Horizontal Jan–Dec tax deadline timeline (Gantt-style, X axis = months,
 * horizontally scrollable). Recurring Korean tax windows as positioned bars;
 * event-based taxes (취득세 등) listed below since they have no fixed month.
 * Auto-scrolls to today on mount; red line marks today.
 */

type Lang = 'ko' | 'en';

interface Bar {
  /** [month, day] inclusive */
  start: [number, number];
  end: [number, number];
  note?: { ko: string; en: string };
  light?: boolean;
}

interface Lane {
  name: { ko: string; en: string };
  who: { ko: string; en: string };
  color: string; // tailwind bg class
  bars: Bar[];
}

const LANES: Lane[] = [
  {
    name: { ko: '부가가치세', en: 'VAT' },
    who: { ko: '사업자', en: 'Business' },
    color: 'bg-sky-500',
    bars: [
      { start: [1, 1], end: [1, 25], note: { ko: '2기 확정 신고·납부', en: '2nd-half final return' } },
      { start: [4, 1], end: [4, 25], note: { ko: '1기 예정(법인)', en: '1st-half interim (corp.)' }, light: true },
      { start: [7, 1], end: [7, 25], note: { ko: '1기 확정 신고·납부', en: '1st-half final return' } },
      { start: [10, 1], end: [10, 25], note: { ko: '2기 예정(법인)', en: '2nd-half interim (corp.)' }, light: true },
    ],
  },
  {
    name: { ko: '자동차세 연납', en: 'Car tax (annual prepay)' },
    who: { ko: '차량 소유자', en: 'Car owners' },
    color: 'bg-violet-500',
    bars: [
      { start: [1, 16], end: [1, 31], note: { ko: '1월 연납 — 공제율 최대', en: 'January prepay — biggest discount' } },
      { start: [3, 16], end: [3, 31], light: true, note: { ko: '3월 연납', en: 'March prepay' } },
      { start: [6, 16], end: [6, 30], light: true, note: { ko: '6월 연납', en: 'June prepay' } },
      { start: [9, 16], end: [9, 30], light: true, note: { ko: '9월 연납', en: 'September prepay' } },
    ],
  },
  {
    name: { ko: '연말정산', en: 'Year-end settlement' },
    who: { ko: '근로자', en: 'Employees' },
    color: 'bg-teal-500',
    bars: [
      { start: [1, 15], end: [2, 28], note: { ko: '간소화 자료 확인·서류 제출', en: 'Simplified data & documents' } },
    ],
  },
  {
    name: { ko: '종합소득세 · 개인지방소득세', en: 'Comprehensive income tax + local' },
    who: { ko: '개인·프리랜서·사업자', en: 'Individuals / freelancers' },
    color: 'bg-emerald-600',
    bars: [
      { start: [5, 1], end: [5, 31], note: { ko: '신고·납부 (지방소득세 동시)', en: 'File & pay (incl. local income tax)' } },
      { start: [6, 1], end: [6, 30], light: true, note: { ko: '성실신고확인 대상자 연장', en: 'Extended for verified filers' } },
    ],
  },
  {
    name: { ko: '자동차세 정기분', en: 'Car tax (regular)' },
    who: { ko: '차량 소유자', en: 'Car owners' },
    color: 'bg-violet-600',
    bars: [
      { start: [6, 16], end: [6, 30], note: { ko: '1기분', en: '1st half' } },
      { start: [12, 16], end: [12, 31], note: { ko: '2기분', en: '2nd half' } },
    ],
  },
  {
    name: { ko: '재산세', en: 'Property tax' },
    who: { ko: '주택·건물·토지 소유자', en: 'Property owners' },
    color: 'bg-amber-500',
    bars: [
      { start: [7, 16], end: [7, 31], note: { ko: '1기: 주택 ½ + 건물·선박', en: '1st: half of housing + buildings' } },
      { start: [9, 16], end: [9, 30], note: { ko: '2기: 주택 ½ + 토지', en: '2nd: half of housing + land' } },
    ],
  },
  {
    name: { ko: '주민세 (개인분)', en: 'Resident tax' },
    who: { ko: '세대주·사업소', en: 'Households / businesses' },
    color: 'bg-orange-500',
    bars: [{ start: [8, 16], end: [8, 31], note: { ko: '고지 납부', en: 'Billed payment' } }],
  },
  {
    name: { ko: '종소세 중간예납', en: 'Income tax interim' },
    who: { ko: '사업소득자', en: 'Business income earners' },
    color: 'bg-emerald-400',
    bars: [{ start: [11, 1], end: [11, 30], light: true, note: { ko: '고지서 기준 11/30까지', en: 'Pay by Nov 30 (billed)' } }],
  },
  {
    name: { ko: '종합부동산세', en: 'Comprehensive real estate tax' },
    who: { ko: '고액 부동산 보유자', en: 'High-value property holders' },
    color: 'bg-rose-500',
    bars: [{ start: [12, 1], end: [12, 15], note: { ko: '신고·납부', en: 'File & pay' } }],
  },
];

const EVENT_TAXES: { name: { ko: string; en: string }; rule: { ko: string; en: string } }[] = [
  {
    name: { ko: '취득세', en: 'Acquisition tax' },
    rule: { ko: '취득일부터 60일 이내 신고·납부 (상속은 6개월)', en: 'Within 60 days of acquisition (6 months for inheritance)' },
  },
  {
    name: { ko: '등록면허세', en: 'Registration license tax' },
    rule: { ko: '등기·등록 신청 전까지 납부', en: 'Before filing the registration' },
  },
  {
    name: { ko: '양도소득세 예정신고', en: 'Capital gains (interim)' },
    rule: { ko: '양도일이 속한 달의 말일부터 2개월 이내', en: 'Within 2 months from the end of the transfer month' },
  },
];

const MONTH_LABELS: Record<Lang, string[]> = {
  ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const CUM = DAYS_IN_MONTH.reduce<number[]>((acc, d, i) => [...acc, (acc[i] ?? 0) + d], [0]);
const YEAR_DAYS = 365;

function dayOfYear(month: number, day: number): number {
  return CUM[month - 1] + day;
}
function pct(month: number, day: number): number {
  return (dayOfYear(month, day) / YEAR_DAYS) * 100;
}

const UI: Record<Lang, { title: string; subtitle: string; today: string; anytime: string; disclaimer: string }> = {
  ko: {
    title: '1년 세금 타임라인',
    subtitle: '1월부터 12월까지, 세금별 신고·납부 기간을 가로로 펼쳤습니다. 좌우로 스크롤하세요.',
    today: '오늘',
    anytime: '수시 (날짜가 정해져 있지 않은 세금)',
    disclaimer: '기한이 주말·공휴일이면 다음 영업일로 연장됩니다. 정확한 기한은 국세청·위택스 고지 기준을 확인하세요.',
  },
  en: {
    title: 'Korean tax deadlines — year at a glance',
    subtitle: 'Filing/payment windows from January to December. Scroll horizontally.',
    today: 'Today',
    anytime: 'Event-based taxes (no fixed month)',
    disclaimer: 'Deadlines falling on weekends/holidays roll to the next business day. Always confirm with NTS/Wetax notices.',
  },
};

export default function TaxTimeline({ locale = 'ko' }: { locale?: string }) {
  const lang: Lang = locale === 'ko' ? 'ko' : 'en';
  const ui = UI[lang];
  const scrollRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const todayPct = pct(now.getMonth() + 1, now.getDate());

  useEffect(() => {
    // Bring today's position into view (centered-ish)
    const el = scrollRef.current;
    if (!el) return;
    const target = (todayPct / 100) * el.scrollWidth - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }, [todayPct]);

  return (
    <section className="not-prose mb-10">
      <h2 className="text-xl font-black text-foreground">{ui.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{ui.subtitle}</p>

      <div ref={scrollRef} className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <div className="relative" style={{ minWidth: '1900px' }}>
          {/* Month header + grid lines */}
          <div className="sticky top-0 flex border-b border-border bg-muted/40">
            <div className="w-44 shrink-0 border-r border-border px-3 py-2 text-xs font-bold text-muted-foreground" />
            <div className="relative flex-1">
              <div className="flex">
                {MONTH_LABELS[lang].map((m, i) => (
                  <div
                    key={m}
                    className="border-r border-border/60 py-2 text-center text-xs font-bold text-muted-foreground"
                    style={{ width: `${(DAYS_IN_MONTH[i] / YEAR_DAYS) * 100}%` }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lanes */}
          <div className="relative">
            {/* vertical month grid lines across all lanes */}
            <div className="pointer-events-none absolute inset-0 left-44 z-0">
              {CUM.slice(1, 12).map((d) => (
                <div
                  key={d}
                  className="absolute top-0 h-full border-r border-border/40"
                  style={{ left: `${(d / YEAR_DAYS) * 100}%` }}
                />
              ))}
              {/* today line */}
              <div
                className="absolute top-0 z-10 h-full w-0.5 bg-red-500"
                style={{ left: `${todayPct}%` }}
                aria-hidden="true"
              />
              <span
                className="absolute z-10 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ left: `${todayPct}%`, top: 2, transform: 'translateX(-50%)' }}
              >
                {ui.today}
              </span>
            </div>

            {LANES.map((lane) => (
              <div key={lane.name.ko} className="flex border-b border-border/40 last:border-b-0">
                <div className="w-44 shrink-0 border-r border-border px-3 py-2.5">
                  <p className="text-xs font-bold leading-tight text-foreground">{lane.name[lang]}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{lane.who[lang]}</p>
                </div>
                <div className="relative h-12 flex-1">
                  {lane.bars.map((bar, i) => {
                    const left = pct(bar.start[0], bar.start[1] - 1);
                    const width = pct(bar.end[0], bar.end[1]) - left;
                    const label = `${bar.start[0]}/${bar.start[1]}~${bar.end[0]}/${bar.end[1]}`;
                    return (
                      <div
                        key={i}
                        className={`absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden whitespace-nowrap rounded-md px-1.5 text-[10px] font-bold text-white shadow-sm ${lane.color} ${bar.light ? 'opacity-50' : ''}`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 1.2)}%` }}
                        title={`${lane.name[lang]} · ${label}${bar.note ? ` — ${bar.note[lang]}` : ''}`}
                      >
                        <span className="truncate">{bar.note ? bar.note[lang] : label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event-based taxes */}
      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{ui.anytime}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {EVENT_TAXES.map((t) => (
            <div key={t.name.ko} className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-bold text-foreground">{t.name[lang]}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.rule[lang]}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{ui.disclaimer}</p>
    </section>
  );
}
