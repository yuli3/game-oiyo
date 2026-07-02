import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Data ─────────────────────────────────────────────────────────────────────

const DIVIDEND_STOCKS = [
  { ticker: 'JEPQ', name: 'JP모건 나스닥 프리미엄인컴', annualYield: 0.095, taxRate: 0.22, currency: 'USD', defaultPrice: 52 },
  { ticker: 'JEPI', name: 'JP모건 프리미엄인컴 ETF', annualYield: 0.072, taxRate: 0.22, currency: 'USD', defaultPrice: 58 },
  { ticker: 'QYLD', name: '나스닥100 커버드콜 ETF', annualYield: 0.112, taxRate: 0.22, currency: 'USD', defaultPrice: 16 },
  { ticker: 'SCHD', name: '슈왑 미국배당주 ETF', annualYield: 0.037, taxRate: 0.22, currency: 'USD', defaultPrice: 28 },
  { ticker: 'VYM', name: '뱅가드 고배당수익 ETF', annualYield: 0.031, taxRate: 0.22, currency: 'USD', defaultPrice: 130 },
  { ticker: 'O', name: '리얼티 인컴 (월배당 REIT)', annualYield: 0.058, taxRate: 0.30, currency: 'USD', defaultPrice: 55 },
  { ticker: 'TIGER 미국배당', name: 'TIGER 미국배당다우존스', annualYield: 0.038, taxRate: 0.154, currency: 'KRW', defaultPrice: 12000 },
  { ticker: 'KODEX 배당성장', name: 'KODEX 배당성장 ETF', annualYield: 0.022, taxRate: 0.154, currency: 'KRW', defaultPrice: 15000 },
] as const;

const SECTIONS = [
  {
    id: 'housing', emoji: '🏠', title: '주거 & 생활', color: 'blue',
    desc: '매달 고정으로 빠져나가는 비용. 연간으로 따지면 생각보다 큽니다.',
    items: [
      { key: 'rent', label: '월세·관리비', default: 700_000, hint: '전세이자도 포함' },
      { key: 'utility', label: '전기·수도', default: 50_000, hint: '' },
      { key: 'internet', label: '인터넷', default: 30_000, hint: '' },
      { key: 'phone', label: '휴대폰', default: 60_000, hint: '' },
    ],
  },
  {
    id: 'insurance', emoji: '🛡️', title: '보험', color: 'purple',
    desc: '실비·암·뇌심장 3종 세트가 기본. 나이가 들수록 보험료는 올라갑니다.',
    items: [
      { key: 'insSilbi', label: '실비보험', default: 30_000, hint: '나이·건강에 따라 차이' },
      { key: 'insCancer', label: '암보험', default: 50_000, hint: '' },
      { key: 'insBrain', label: '뇌심장보험', default: 40_000, hint: '' },
      { key: 'insOther', label: '기타 보험', default: 0, hint: '' },
    ],
  },
  {
    id: 'food', emoji: '🍽️', title: '식비', color: 'orange',
    desc: '치팅데이는 다이어트의 일부. 계획된 일탈이 지속가능한 식단을 만듭니다.',
    items: [
      { key: 'foodMain', label: '일반 식비', default: 400_000, hint: '' },
      { key: 'foodCheat', label: '치팅데이', default: 50_000, hint: '월 1~4회. 스트레스 관리 투자' },
      { key: 'foodCafe', label: '카페·음료', default: 60_000, hint: '' },
    ],
  },
  {
    id: 'exercise', emoji: '💪', title: '운동', color: 'green',
    desc: '건강이 최고의 투자. 운동을 여러 개 병행하면 비용이 의외로 커집니다.',
    items: [
      { key: 'exGym', label: '헬스장', default: 60_000, hint: '' },
      { key: 'exRunning', label: '러닝', default: 0, hint: '용품 소모·대회 참가비 월할' },
      { key: 'exTeam', label: '축구·야구·농구', default: 0, hint: '팀비, 구장 대관비 등' },
      { key: 'exYoga', label: '요가·필라테스', default: 0, hint: '' },
      { key: 'exOther', label: '기타 운동', default: 0, hint: '' },
    ],
  },
  {
    id: 'hobby', emoji: '🎯', title: '취미', color: 'yellow',
    desc: '취미는 사치가 아닌 지속가능한 삶의 연료. 비용을 인식하면 더 즐길 수 있습니다.',
    items: [
      { key: 'hobFishing', label: '낚시', default: 0, hint: '장비·낚시터·미끼 등' },
      { key: 'hobBoard', label: '보드게임·카페', default: 0, hint: '' },
      { key: 'hobMovie', label: '영화·OTT', default: 30_000, hint: '' },
      { key: 'hobOther', label: '기타 취미', default: 0, hint: '' },
    ],
  },
  {
    id: 'medical', emoji: '🏥', title: '의료', color: 'red',
    desc: '연간 치과·검진 비용을 월 기준으로 나눠 적립해두면 부담이 줄어듭니다.',
    items: [
      { key: 'medHospital', label: '병원비', default: 30_000, hint: '' },
      { key: 'medDental', label: '치과', default: 30_000, hint: '스케일링 연 12만원 ÷ 12' },
      { key: 'medCheckup', label: '내시경·건강검진', default: 20_000, hint: '2년에 한번 → 월할' },
    ],
  },
  {
    id: 'education', emoji: '📚', title: '교육 & n잡', color: 'indigo',
    desc: 'n잡 시작비용은 지출이 아닌 투자. 언제 회수될지 함께 계획해보세요.',
    items: [
      { key: 'eduAcademy', label: '학원비', default: 0, hint: '' },
      { key: 'eduCourse', label: '수업료·온라인 강의', default: 0, hint: '' },
      { key: 'eduSide', label: 'n잡 시작비용', default: 0, hint: '장비·플랫폼·등록비 등 월할' },
    ],
  },
  {
    id: 'other', emoji: '🎰', title: '기타', color: 'slate',
    desc: '로또는 꿈을 사는 비용. 경조사비는 인간관계의 유지 비용입니다.',
    items: [
      { key: 'otLotto', label: '로또', default: 5_000, hint: '1등 확률 1/8,145,060. 꿈값' },
      { key: 'otSocial', label: '경조사비', default: 50_000, hint: '' },
      { key: 'otPocket', label: '용돈·잡비', default: 50_000, hint: '' },
    ],
  },
] as const;

const INVESTMENT_ITEMS = [
  { key: 'invEmergency', label: '비상금 적립', default: 200_000, hint: '월 소득의 10~20%. 6개월치 생활비 목표' },
  { key: 'invISA', label: 'ISA', default: 200_000, hint: '연 2,000만원 한도. 이자·배당 비과세·분리과세' },
  { key: 'invIRP', label: 'IRP', default: 200_000, hint: '연 700만원 세액공제(16.5%). 절세 1순위' },
  { key: 'invPension', label: '퇴직연금 DC형', default: 0, hint: '본인 추가납입 가능. IRP와 합산 공제' },
  { key: 'invStocks', label: '주식·ETF 적립식', default: 100_000, hint: '매월 자동 매수 설정 추천' },
] as const;

// ─── Colors ───────────────────────────────────────────────────────────────────

const HEX: Record<string, string> = {
  blue: '#3b82f6', purple: '#a855f7', orange: '#f97316',
  green: '#22c55e', yellow: '#eab308', red: '#ef4444',
  indigo: '#6366f1', slate: '#94a3b8', emerald: '#10b981',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n === 0) return '0원';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000)}만원`;
  return `${sign}${abs.toLocaleString()}원`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumberInput({ label, hint, value, onChange }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{hint}</p>}
      </div>
      <input
        type="number"
        value={value || ''}
        placeholder="0"
        onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-28 shrink-0 px-3 py-1.5 text-right text-sm font-bold bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function Section({ id, emoji, title, desc, color, total, isOpen, onToggle, children }: {
  id: string; emoji: string; title: string; desc: string; color: string;
  total: number; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition text-left"
      >
        <span className="text-xl shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-black text-foreground">{title}</span>
          {!isOpen && total === 0 && (
            <span className="ml-2 text-[10px] text-muted-foreground">{desc.slice(0, 28)}…</span>
          )}
        </div>
        <span
          className="text-sm font-black shrink-0"
          style={{ color: total > 0 ? HEX[color] : undefined }}
        >
          {total > 0 ? fmt(total) : '—'}
        </span>
        <svg
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/5 space-y-3">
          <p className="text-[11px] text-muted-foreground italic">{desc}</p>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type IncomeKey = 'employment' | 'freelance' | 'business' | 'financial' | 'other';
interface Holding { ticker: string; shares: number; price: number; }

const INCOME_ITEMS: { key: IncomeKey; label: string; hint: string }[] = [
  { key: 'employment', label: '근로소득', hint: '4대보험 공제 전 금액' },
  { key: 'freelance', label: '프리랜서 수입', hint: '3.3% 원천징수 전 금액' },
  { key: 'business', label: '사업소득', hint: '' },
  { key: 'financial', label: '금융소득', hint: '배당·이자 등' },
  { key: 'other', label: '기타 수입', hint: '임대, 부업 등' },
];

export default function CashFlowManager({ locale = 'ko' }: { locale?: string }) {
  const [income, setIncome] = useState<Record<IncomeKey, number>>({
    employment: 4_000_000, freelance: 0, business: 0, financial: 0, other: 0,
  });

  const initExpenses = useMemo(() => {
    const v: Record<string, number> = {};
    SECTIONS.forEach(s => s.items.forEach(i => { v[i.key] = i.default; }));
    INVESTMENT_ITEMS.forEach(i => { v[i.key] = i.default; });
    return v;
  }, []);

  const [expenses, setExpenses] = useState<Record<string, number>>(initExpenses);
  const [open, setOpen] = useState<Set<string>>(new Set(['income', 'housing', 'investment']));
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [usdRate, setUsdRate] = useState(1380);
  const [goal, setGoal] = useState(1_000_000);

  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const setExp = (key: string, v: number) => setExpenses(p => ({ ...p, [key]: v }));

  const totalIncome = useMemo(() => Object.values(income).reduce((a, b) => a + b, 0), [income]);
  const nationalPension = useMemo(() => Math.min(totalIncome * 0.045, 265_500), [totalIncome]);

  const sectionTotals = useMemo(() => {
    const t: Record<string, number> = {};
    SECTIONS.forEach(s => { t[s.id] = s.items.reduce((sum, i) => sum + (expenses[i.key] || 0), 0); });
    t['investment'] = INVESTMENT_ITEMS.reduce((sum, i) => sum + (expenses[i.key] || 0), 0);
    return t;
  }, [expenses]);

  const totalExpenses = useMemo(() =>
    SECTIONS.reduce((s, sec) => s + sectionTotals[sec.id], 0) + nationalPension,
    [sectionTotals, nationalPension]);

  const totalInvestment = sectionTotals['investment'];
  const surplus = totalIncome - totalExpenses - totalInvestment;

  const monthlyDividend = useMemo(() =>
    holdings.reduce((sum, h) => {
      const stock = DIVIDEND_STOCKS.find(s => s.ticker === h.ticker);
      if (!stock || h.shares <= 0 || h.price <= 0) return sum;
      const annualDiv = h.shares * h.price * stock.annualYield * (1 - stock.taxRate);
      return sum + (stock.currency === 'USD' ? (annualDiv / 12) * usdRate : annualDiv / 12);
    }, 0),
    [holdings, usdRate]);

  const additionalNeeded = useMemo(() => {
    const totalPortfolioValue = holdings.reduce((sum, h) => {
      const stock = DIVIDEND_STOCKS.find(s => s.ticker === h.ticker);
      if (!stock || h.price <= 0) return sum;
      return sum + (stock.currency === 'USD' ? h.shares * h.price * usdRate : h.shares * h.price);
    }, 0);
    const avgMonthlyYield = totalPortfolioValue > 0 ? monthlyDividend / totalPortfolioValue : 0;
    return avgMonthlyYield > 0 ? Math.round((goal - monthlyDividend) / avgMonthlyYield) : 0;
  }, [holdings, usdRate, monthlyDividend, goal]);

  const chartData = useMemo(() => {
    const data: { name: string; value: number; color: string }[] = [];
    SECTIONS.forEach(s => {
      if (sectionTotals[s.id] > 0) data.push({ name: s.title, value: sectionTotals[s.id], color: HEX[s.color] });
    });
    if (nationalPension > 0) data.push({ name: '국민연금', value: nationalPension, color: HEX.emerald });
    if (totalInvestment > 0) data.push({ name: '저축·투자', value: totalInvestment, color: '#1d4ed8' });
    return data;
  }, [sectionTotals, nationalPension, totalInvestment]);

  const addHolding = (ticker: string) => {
    if (holdings.some(h => h.ticker === ticker)) return;
    const stock = DIVIDEND_STOCKS.find(s => s.ticker === ticker)!;
    setHoldings(p => [...p, { ticker, shares: 10, price: stock.defaultPrice }]);
  };

  const updateHolding = (ticker: string, field: 'shares' | 'price', v: number) =>
    setHoldings(p => p.map(h => h.ticker === ticker ? { ...h, [field]: v } : h));

  const reset = () => {
    setIncome({ employment: 4_000_000, freelance: 0, business: 0, financial: 0, other: 0 });
    setExpenses(initExpenses);
    setHoldings([]);
  };

  return (
    <div className="not-prose my-12 space-y-3 max-w-3xl mx-auto">

      {/* Summary */}
      <div className="p-6 bg-foreground text-background rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-background/50 uppercase tracking-widest">월간 현금흐름 요약</p>
          <button
            onClick={() => window.print()}
            className="text-[10px] font-bold text-background/50 hover:text-background border border-background/15 rounded-lg px-2 py-1 transition flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            PDF
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: '월 수입', value: totalIncome, color: 'text-success' },
            { label: '생활 지출', value: totalExpenses, color: 'text-destructive' },
            { label: '저축·투자', value: totalInvestment, color: 'text-info' },
            { label: '잉여금', value: surplus, color: surplus >= 0 ? 'text-background' : 'text-destructive' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[10px] text-background/50 uppercase mb-1">{label}</p>
              <p className={`text-lg font-black ${color}`}>
                {value >= 0 && label === '잉여금' && value > 0 ? '+' : ''}{fmt(value)}
              </p>
            </div>
          ))}
        </div>
        {totalIncome > 0 && (
          <div className="space-y-1.5">
            {[
              { label: '지출', value: totalExpenses, bar: 'bg-destructive' },
              { label: '저축·투자', value: totalInvestment, bar: 'bg-info' },
              { label: '잉여', value: Math.max(surplus, 0), bar: 'bg-muted-foreground' },
            ].map(({ label, value, bar }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-background/60 w-14 shrink-0">{label}</span>
                <div className="flex-1 h-1.5 bg-foreground rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${bar}`}
                    style={{ width: `${Math.min(100, Math.round((value / totalIncome) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-background/60 w-8 text-right shrink-0">
                  {Math.round((value / totalIncome) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
        {monthlyDividend > 0 && (
          <div className="mt-4 pt-4 border-t border-background/15 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-background/50 uppercase">배당 수입 (월·세후)</p>
              <p className="text-lg font-black text-warning">{fmt(monthlyDividend)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-background/50 uppercase">목표 달성률</p>
              <p className="text-lg font-black">
                {monthlyDividend >= goal
                  ? <span className="text-warning">🎉 달성!</span>
                  : <span className="text-background/70">{Math.round((monthlyDividend / goal) * 100)}%</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Income */}
      <Section
        id="income" emoji="💰" title="월 수입" desc="모든 소득원을 합산합니다."
        color="emerald" total={totalIncome}
        isOpen={open.has('income')} onToggle={() => toggle('income')}
      >
        {INCOME_ITEMS.map(item => (
          <NumberInput
            key={item.key} label={item.label} hint={item.hint}
            value={income[item.key]}
            onChange={v => setIncome(p => ({ ...p, [item.key]: v }))}
          />
        ))}
        {totalIncome > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-success/10 border border-success/20">
            <span className="text-base shrink-0">🏛️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">국민연금 (자동계산)</p>
              <p className="text-[10px] text-muted-foreground">소득의 4.5%, 월 최대 265,500원</p>
            </div>
            <span className="text-sm font-black text-success shrink-0">{fmt(nationalPension)}</span>
          </div>
        )}
      </Section>

      {/* Expense sections */}
      {SECTIONS.map(sec => (
        <Section
          key={sec.id} id={sec.id} emoji={sec.emoji} title={sec.title}
          desc={sec.desc} color={sec.color} total={sectionTotals[sec.id]}
          isOpen={open.has(sec.id)} onToggle={() => toggle(sec.id)}
        >
          {sec.items.map(item => (
            <NumberInput
              key={item.key} label={item.label} hint={item.hint}
              value={expenses[item.key] || 0}
              onChange={v => setExp(item.key, v)}
            />
          ))}
        </Section>
      ))}

      {/* Investment */}
      <Section
        id="investment" emoji="💼" title="저축 & 투자" color="emerald"
        desc="미래의 현금흐름을 지금 설계합니다. ISA·IRP는 세금 혜택이 있습니다."
        total={totalInvestment}
        isOpen={open.has('investment')} onToggle={() => toggle('investment')}
      >
        {INVESTMENT_ITEMS.map(item => (
          <NumberInput
            key={item.key} label={item.label} hint={item.hint}
            value={expenses[item.key] || 0}
            onChange={v => setExp(item.key, v)}
          />
        ))}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {[
            { emoji: '🏦', title: 'ISA', body: '연 2,000만원 납입. 200만원 비과세, 초과분 9.9% 분리과세. 3년 이상 유지 필수.' },
            { emoji: '📋', title: 'IRP', body: '연 700만원 세액공제. 소득에 따라 13.2~16.5% 환급. 55세 이후 연금 수령.' },
            { emoji: '📈', title: 'DC형 퇴직연금', body: '회사가 납입, 본인 추가납입 가능. IRP와 합산해 연 700만원까지 공제.' },
            { emoji: '🤖', title: '적립식 ETF', body: '매월 자동 매수 설정. 시간 분산으로 평균 매입 단가를 낮춥니다.' },
          ].map(c => (
            <div key={c.title} className="p-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs font-black text-foreground">{c.emoji} {c.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Dividend Portfolio */}
      <Section
        id="dividend" emoji="📈" title="배당 포트폴리오" color="blue"
        desc="보유 종목과 수량을 입력하면 월 배당 수입과 목표까지의 거리를 계산합니다."
        total={monthlyDividend}
        isOpen={open.has('dividend')} onToggle={() => toggle('dividend')}
      >
        {/* Settings row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground shrink-0">달러 환율</p>
            <input
              type="number"
              value={usdRate}
              onChange={e => setUsdRate(Number(e.target.value) || 1380)}
              className="w-24 px-2 py-1 text-right text-xs font-bold bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">₩/USD</span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground shrink-0">월 목표</p>
            <input
              type="number"
              value={goal}
              onChange={e => setGoal(Number(e.target.value) || 1_000_000)}
              className="w-28 px-2 py-1 text-right text-xs font-bold bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">원</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[100_000, 300_000, 500_000, 1_000_000].map(v => (
            <button
              key={v}
              onClick={() => setGoal(v)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                goal === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border hover:bg-muted'
              }`}
            >
              {fmt(v)}
            </button>
          ))}
        </div>

        {/* Stock picker */}
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">종목 추가</p>
          <div className="flex flex-wrap gap-1.5">
            {DIVIDEND_STOCKS.map(stock => {
              const added = holdings.some(h => h.ticker === stock.ticker);
              return (
                <button
                  key={stock.ticker}
                  onClick={() => !added && addHolding(stock.ticker)}
                  disabled={added}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                    added
                      ? 'bg-info/10 border-info/20 text-info cursor-default'
                      : 'bg-muted/30 border-border hover:bg-muted cursor-pointer'
                  }`}
                >
                  {stock.ticker}
                  <span className="ml-1 opacity-60">{(stock.annualYield * 100).toFixed(1)}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Holdings list */}
        {holdings.length > 0 ? (
          <div className="space-y-2">
            {holdings.map(h => {
              const stock = DIVIDEND_STOCKS.find(s => s.ticker === h.ticker);
              if (!stock) return null;
              const annualDiv = h.shares * h.price * stock.annualYield * (1 - stock.taxRate);
              const monthlyKRW = stock.currency === 'USD' ? (annualDiv / 12) * usdRate : annualDiv / 12;
              const totalValue = stock.currency === 'USD'
                ? h.shares * h.price * usdRate
                : h.shares * h.price;
              return (
                <div key={h.ticker} className="p-3 rounded-xl border border-border bg-muted/10 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-foreground">{h.ticker}</p>
                      <p className="text-[10px] text-muted-foreground">{stock.name}</p>
                      <p className="text-[10px] text-info mt-0.5">
                        배당률 {(stock.annualYield * 100).toFixed(1)}% · 세율 {(stock.taxRate * 100).toFixed(0)}% · {stock.currency}
                      </p>
                    </div>
                    <button onClick={() => setHoldings(p => p.filter(x => x.ticker !== h.ticker))}
                      className="text-muted-foreground hover:text-destructive text-base transition"
                    >×</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">보유 주수</p>
                      <input
                        type="number"
                        value={h.shares}
                        onChange={e => updateHolding(h.ticker, 'shares', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center text-xs font-bold bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">현재가 ({stock.currency})</p>
                      <input
                        type="number"
                        value={h.price}
                        onChange={e => updateHolding(h.ticker, 'price', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-center text-xs font-bold bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">월 배당 (세후)</p>
                      <p className="text-xs font-black text-warning py-1 text-center">{fmt(monthlyKRW)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    평가금액 약 {fmt(totalValue)} · 연 배당 {fmt(annualDiv / (stock.currency === 'USD' ? 1 / usdRate : 1))}
                  </p>
                </div>
              );
            })}

            <div className="p-4 rounded-2xl bg-foreground text-background">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-background/50">총 월 배당 (세후)</p>
                <p className="text-xl font-black text-warning">{fmt(monthlyDividend)}</p>
              </div>
              <div className="h-2 bg-foreground rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning/40 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (monthlyDividend / goal) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-[10px] text-background/60">목표 {fmt(goal)}</p>
                <p className="text-[10px] text-background/50">
                  {monthlyDividend >= goal
                    ? '🎉 목표 달성!'
                    : `${fmt(goal - monthlyDividend)} 더 필요`}
                </p>
              </div>
              {monthlyDividend < goal && additionalNeeded > 0 && (
                <p className="text-[10px] text-background/60 mt-2">
                  현재 수익률 기준, 목표 달성에 약 {fmt(additionalNeeded)} 추가 투자가 필요합니다.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">
            위에서 종목을 추가하면 배당 계산이 시작됩니다.
          </p>
        )}
      </Section>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="p-6 bg-card border border-border rounded-3xl">
          <p className="text-sm font-black text-foreground mb-4">지출 구성</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                paddingAngle={2} dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [fmt(Number(v) || 0), '']}
                contentStyle={{
                  background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                  borderRadius: '12px', fontSize: '11px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
            {chartData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-muted-foreground">{d.name}</span>
                <span className="text-[10px] font-bold">{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={reset}
          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted transition"
        >
          초기화
        </button>
      </div>
    </div>
  );
}
