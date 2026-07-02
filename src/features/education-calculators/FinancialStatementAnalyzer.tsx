import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';

// ── Types ────────────────────────────────────────────────────────────────────

interface BSData {
  // Current assets
  cash: number;
  receivables: number;
  inventory: number;
  // Non-current assets
  ppe: number;
  intangibles: number;
  // Current liabilities
  payables: number;
  shortTermDebt: number;
  // Non-current liabilities
  longTermDebt: number;
  bonds: number;
  // Equity
  capital: number;
  retainedEarnings: number;
}

interface ISData {
  revenue: number;
  cogs: number;
  sga: number;
  interestExpense: number;
  incomeTax: number;
}

interface MarketData {
  marketCap: number;
}

interface CFData {
  depreciation: number;
  arIncrease: number;
  inventoryIncrease: number;
  apIncrease: number;
  capex: number;
  investmentAcquisition: number;
  debtIncrease: number;
  debtRepayment: number;
  dividendPaid: number;
  beginningCash: number;
}

// ── Input field component ─────────────────────────────────────────────────────

interface InputRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  readOnly?: boolean;
  highlight?: boolean;
}

const InputRow: React.FC<InputRowProps> = ({ label, value, onChange, unit = '억원', readOnly = false, highlight = false }) => (
  <div className={`flex items-center gap-2 py-1.5 border-b border-emerald-100 ${highlight ? 'bg-emerald-50 rounded-lg px-2' : ''}`}>
    <span className="flex-1 text-xs text-slate-600 font-normal min-w-0">{label}</span>
    <div className="flex items-center gap-1 shrink-0">
      {readOnly ? (
        <span className="w-24 text-right text-sm font-bold text-emerald-700 pr-1">{value.toFixed(1)}</span>
      ) : (
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-24 text-right text-sm bg-white border border-emerald-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          aria-label={label}
        />
      )}
      <span className="text-[10px] text-slate-400 w-8">{unit}</span>
    </div>
  </div>
);

// ── Ratio badge ───────────────────────────────────────────────────────────────

type RatioLevel = 'good' | 'warning' | 'danger' | 'info';

const levelColors: Record<RatioLevel, { bar: string; text: string; bg: string }> = {
  good:    { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  warning: { bar: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  danger:  { bar: 'bg-rose-500',    text: 'text-rose-700',    bg: 'bg-rose-50'    },
  info:    { bar: 'bg-sky-400',     text: 'text-sky-700',     bg: 'bg-sky-50'     },
};

const sourceBadgeClasses: Record<'BS' | 'IS' | 'MKT' | 'DERIVED', string> = {
  BS: 'bg-sky-50 text-sky-700 border-sky-200',
  IS: 'bg-violet-50 text-violet-700 border-violet-200',
  MKT: 'bg-amber-50 text-amber-700 border-amber-200',
  DERIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

interface RatioGaugeProps {
  label: string;
  value: number;
  unit: string;
  level: RatioLevel;
  description: string;
  barPct: number; // 0-100 for visual
}

const RatioGauge: React.FC<RatioGaugeProps> = ({ label, value, unit, level, description, barPct }) => {
  const colors = levelColors[level];
  const levelLabel: Record<RatioLevel, string> = { good: '우수', warning: '보통', danger: '위험', info: '참고' };
  return (
    <div className={`rounded-2xl border border-slate-100 p-4 ${colors.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold text-slate-700">{label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border border-current`}>
          {levelLabel[level]}
        </span>
      </div>
      <div className="flex items-end gap-1 mb-2">
        <span className={`text-2xl font-bold ${colors.text}`}>
          {isFinite(value) ? value.toFixed(1) : '—'}
        </span>
        <span className="text-xs text-slate-500 mb-1">{unit}</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${Math.min(Math.max(barPct, 0), 100)}%` }}
          role="progressbar"
          aria-valuenow={barPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
};

// ── Section header ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center gap-2 mb-3 mt-5 first:mt-0">
    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{title}</h4>
  </div>
);

const SourceBadge: React.FC<{ label: 'B/S' | 'I/S' | 'MKT' | 'DERIVED' }> = ({ label }) => {
  const key = label === 'B/S' ? 'BS' : label === 'I/S' ? 'IS' : label === 'MKT' ? 'MKT' : 'DERIVED';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${sourceBadgeClasses[key]}`}>
      {label}
    </span>
  );
};

interface FormulaNode {
  label: string;
  value: number;
  unit?: string;
  source: 'B/S' | 'I/S' | 'MKT' | 'DERIVED';
}

interface FormulaFlowCardProps {
  title: string;
  formula: string;
  takeaway: string;
  nodes: FormulaNode[];
  result: { label: string; value: number; unit: string };
}

const FormulaFlowCard: React.FC<FormulaFlowCardProps> = ({ title, formula, takeaway, nodes, result }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h5 className="text-sm font-bold text-slate-800">{title}</h5>
        <p className="mt-1 text-[11px] text-slate-500">{formula}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{result.label}</p>
        <p className="text-lg font-bold text-emerald-700">
          {isFinite(result.value) ? result.value.toFixed(1) : '—'}
          <span className="ml-1 text-xs font-normal text-slate-400">{result.unit}</span>
        </p>
      </div>
    </div>

    <div className="mt-3 grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
      {nodes.map((node) => (
        <div key={node.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-700">{node.label}</span>
            <SourceBadge label={node.source} />
          </div>
          <p className="mt-2 text-base font-bold text-slate-800">
            {node.value.toFixed(1)}
            <span className="ml-1 text-[10px] font-normal text-slate-400">{node.unit ?? '억원'}</span>
          </p>
        </div>
      ))}
    </div>

    <p className="mt-3 text-xs leading-relaxed text-slate-600">{takeaway}</p>
  </div>
);

// ── Tab button ────────────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
      active
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
    }`}
    aria-selected={active}
    role="tab"
  >
    {children}
  </button>
);

// ── Main component ────────────────────────────────────────────────────────────

export const FinancialStatementAnalyzer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  // B/S + I/S state
  const [bs, setBS] = useState<BSData>({
    cash: 500, receivables: 300, inventory: 200,
    ppe: 800, intangibles: 100,
    payables: 200, shortTermDebt: 150,
    longTermDebt: 400, bonds: 100,
    capital: 500, retainedEarnings: 550,
  });

  const [is, setIS] = useState<ISData>({
    revenue: 2000, cogs: 1200, sga: 300,
    interestExpense: 30, incomeTax: 60,
  });

  const [market, setMarket] = useState<MarketData>({
    marketCap: 1800,
  });

  // Cash flow state
  const [cf, setCF] = useState<CFData>({
    depreciation: 80,
    arIncrease: 20,
    inventoryIncrease: 10,
    apIncrease: 15,
    capex: 120,
    investmentAcquisition: 50,
    debtIncrease: 100,
    debtRepayment: 80,
    dividendPaid: 30,
    beginningCash: 450,
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  const derived = useMemo(() => {
    const currentAssets = bs.cash + bs.receivables + bs.inventory;
    const nonCurrentAssets = bs.ppe + bs.intangibles;
    const totalAssets = currentAssets + nonCurrentAssets;
    const currentLiabilities = bs.payables + bs.shortTermDebt;
    const nonCurrentLiabilities = bs.longTermDebt + bs.bonds;
    const totalLiabilities = currentLiabilities + nonCurrentLiabilities;
    const equity = bs.capital + bs.retainedEarnings;

    const grossProfit = is.revenue - is.cogs;
    const ebit = grossProfit - is.sga;
    const ebt = ebit - is.interestExpense;
    const netIncome = ebt - is.incomeTax;

    // Ratios
    const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) * 100 : 0;
    const quickRatio = currentLiabilities > 0 ? ((currentAssets - bs.inventory) / currentLiabilities) * 100 : 0;
    const debtRatio = equity > 0 ? (totalLiabilities / equity) * 100 : 0;
    const interestCoverage = is.interestExpense > 0 ? ebit / is.interestExpense : 0;
    const roe = equity > 0 ? (netIncome / equity) * 100 : 0;
    const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
    const operatingMargin = is.revenue > 0 ? (ebit / is.revenue) * 100 : 0;
    const grossMargin = is.revenue > 0 ? (grossProfit / is.revenue) * 100 : 0;
    const assetTurnover = totalAssets > 0 ? is.revenue / totalAssets : 0;
    const equityMultiplier = equity > 0 ? totalAssets / equity : 0;
    const netMargin = is.revenue > 0 ? (netIncome / is.revenue) * 100 : 0;
    const per = netIncome > 0 ? market.marketCap / netIncome : 0;
    const priceToBook = equity > 0 ? market.marketCap / equity : 0;
    const dupontRoe = (netMargin / 100) * assetTurnover * equityMultiplier * 100;

    return {
      currentAssets, nonCurrentAssets, totalAssets,
      currentLiabilities, nonCurrentLiabilities, totalLiabilities, equity,
      grossProfit, ebit, ebt, netIncome,
      currentRatio, quickRatio, debtRatio, interestCoverage,
      roe, roa, operatingMargin, grossMargin,
      assetTurnover, equityMultiplier, netMargin, per, priceToBook, dupontRoe,
    };
  }, [bs, is, market]);

  const cfDerived = useMemo(() => {
    const operatingCF = derived.netIncome + cf.depreciation
      - cf.arIncrease - cf.inventoryIncrease + cf.apIncrease;
    const investingCF = -(cf.capex + cf.investmentAcquisition);
    const financingCF = cf.debtIncrease - cf.debtRepayment - cf.dividendPaid;
    const endingCash = cf.beginningCash + operatingCF + investingCF + financingCF;
    const fcf = operatingCF - cf.capex;
    const ebitda = derived.ebit + cf.depreciation;

    return { operatingCF, investingCF, financingCF, endingCash, fcf, ebitda };
  }, [derived, cf]);

  // ── Gauge helpers ──────────────────────────────────────────────────────────

  const getCRLevel = (v: number): RatioLevel => v >= 200 ? 'good' : v >= 100 ? 'warning' : 'danger';
  const getQRLevel = (v: number): RatioLevel => v >= 100 ? 'good' : v >= 50 ? 'warning' : 'danger';
  const getDebtLevel = (v: number): RatioLevel => v <= 100 ? 'good' : v <= 200 ? 'warning' : 'danger';
  const getROELevel = (v: number): RatioLevel => v >= 15 ? 'good' : v >= 8 ? 'warning' : 'danger';

  const clampPct = (v: number, max: number) => Math.min((v / max) * 100, 100);

  const bsUpdater = (field: keyof BSData) => (v: number) => setBS(prev => ({ ...prev, [field]: v }));
  const isUpdater = (field: keyof ISData) => (v: number) => setIS(prev => ({ ...prev, [field]: v }));
  const cfUpdater = (field: keyof CFData) => (v: number) => setCF(prev => ({ ...prev, [field]: v }));
  const marketUpdater = (field: keyof MarketData) => (v: number) => setMarket(prev => ({ ...prev, [field]: v }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card className="bg-white border border-emerald-100 shadow-xl rounded-2xl overflow-hidden mt-8">
      {/* Header */}
      <div className="bg-emerald-700 px-6 py-5">
        <h3 className="text-lg font-bold text-white">재무제표 분석기</h3>
        <p className="text-xs text-emerald-200 mt-1">재무상태표 · 손익계산서 · 현금흐름표 · 비율 벤치마크</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-4 pb-0" role="tablist" aria-label="재무제표 분석 탭">
        <TabButton active={activeTab === 0} onClick={() => setActiveTab(0)}>B/S + I/S</TabButton>
        <TabButton active={activeTab === 1} onClick={() => setActiveTab(1)}>현금흐름표</TabButton>
        <TabButton active={activeTab === 2} onClick={() => setActiveTab(2)}>비율 벤치마크</TabButton>
      </div>

      <div className="px-6 pb-6 pt-4">

        {/* ── Tab 0: B/S + I/S ── */}
        {activeTab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Inputs */}
            <div>
              <SectionHeader title="재무상태표 (B/S)" />

              <div className="mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">유동자산</p>
                <InputRow label="현금 및 단기투자" value={bs.cash} onChange={bsUpdater('cash')} />
                <InputRow label="매출채권" value={bs.receivables} onChange={bsUpdater('receivables')} />
                <InputRow label="재고자산" value={bs.inventory} onChange={bsUpdater('inventory')} />
              </div>

              <div className="mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">비유동자산</p>
                <InputRow label="유형자산 (PPE)" value={bs.ppe} onChange={bsUpdater('ppe')} />
                <InputRow label="무형자산" value={bs.intangibles} onChange={bsUpdater('intangibles')} />
              </div>

              <div className="mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">유동부채</p>
                <InputRow label="매입채무" value={bs.payables} onChange={bsUpdater('payables')} />
                <InputRow label="단기차입금" value={bs.shortTermDebt} onChange={bsUpdater('shortTermDebt')} />
              </div>

              <div className="mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">비유동부채</p>
                <InputRow label="장기차입금" value={bs.longTermDebt} onChange={bsUpdater('longTermDebt')} />
                <InputRow label="사채" value={bs.bonds} onChange={bsUpdater('bonds')} />
              </div>

              <div className="mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">자본</p>
                <InputRow label="자본금" value={bs.capital} onChange={bsUpdater('capital')} />
                <InputRow label="이익잉여금" value={bs.retainedEarnings} onChange={bsUpdater('retainedEarnings')} />
              </div>

              <SectionHeader title="손익계산서 (I/S)" />
              <InputRow label="매출액" value={is.revenue} onChange={isUpdater('revenue')} />
              <InputRow label="매출원가" value={is.cogs} onChange={isUpdater('cogs')} />
              <InputRow label="판매관리비 (SG&A)" value={is.sga} onChange={isUpdater('sga')} />
              <InputRow label="매출총이익" value={derived.grossProfit} onChange={() => {}} readOnly highlight />
              <InputRow label="영업이익 (EBIT)" value={derived.ebit} onChange={() => {}} readOnly highlight />
              <InputRow label="이자비용" value={is.interestExpense} onChange={isUpdater('interestExpense')} />
              <InputRow label="법인세비용" value={is.incomeTax} onChange={isUpdater('incomeTax')} />
              <InputRow label="당기순이익" value={derived.netIncome} onChange={() => {}} readOnly highlight />

              <SectionHeader title="시장 정보 (MKT)" />
              <InputRow label="시가총액" value={market.marketCap} onChange={marketUpdater('marketCap')} />
            </div>

            {/* Right: Ratios */}
            <div>
              <SectionHeader title="요약 재무 지표" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: '총자산', value: derived.totalAssets, color: 'text-slate-700' },
                  { label: '총부채', value: derived.totalLiabilities, color: 'text-rose-600' },
                  { label: '자본 합계', value: derived.equity, color: 'text-emerald-700' },
                  { label: '매출총이익', value: derived.grossProfit, color: 'text-sky-700' },
                  { label: '시가총액', value: market.marketCap, color: 'text-amber-700' },
                  { label: '순이익률', value: derived.netMargin, color: 'text-violet-700', unit: '%' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[10px] text-slate-400 font-bold">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color}`}>{item.value.toFixed(1)}<span className="text-xs font-normal text-slate-400 ml-1">{item.unit ?? '억원'}</span></p>
                  </div>
                ))}
              </div>

              <SectionHeader title="주요 재무 비율" />
              <div className="space-y-2">
                {[
                  { label: '유동비율', value: derived.currentRatio, unit: '%', formula: '유동자산 / 유동부채' },
                  { label: '당좌비율', value: derived.quickRatio, unit: '%', formula: '(유동자산-재고) / 유동부채' },
                  { label: '부채비율', value: derived.debtRatio, unit: '%', formula: '총부채 / 자본' },
                  { label: '이자보상배율', value: derived.interestCoverage, unit: '배', formula: '영업이익 / 이자비용' },
                  { label: 'ROE', value: derived.roe, unit: '%', formula: '당기순이익 / 자본' },
                  { label: 'ROA', value: derived.roa, unit: '%', formula: '당기순이익 / 총자산' },
                  { label: 'PER', value: derived.per, unit: '배', formula: '시가총액 / 당기순이익' },
                  { label: 'PBR', value: derived.priceToBook, unit: '배', formula: '시가총액 / 자본' },
                  { label: '영업이익률', value: derived.operatingMargin, unit: '%', formula: '영업이익 / 매출액' },
                  { label: '매출총이익률', value: derived.grossMargin, unit: '%', formula: '매출총이익 / 매출액' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-emerald-50">
                    <div>
                      <span className="text-xs font-bold text-slate-700">{item.label}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{item.formula}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 tabular-nums">
                      {isFinite(item.value) ? item.value.toFixed(1) : '—'}{item.unit}
                    </span>
                  </div>
                ))}
              </div>

              <SectionHeader title="숫자가 비율로 바뀌는 흐름" />
              <div className="space-y-3">
                <FormulaFlowCard
                  title="매출총이익률"
                  formula="(매출액 - 매출원가) / 매출액 × 100"
                  takeaway="매출총이익률은 제품 자체의 마진을 봅니다. 원가 통제가 흔들리면 가장 먼저 무너지는 비율입니다."
                  nodes={[
                    { label: '매출액', value: is.revenue, source: 'I/S' },
                    { label: '매출원가', value: is.cogs, source: 'I/S' },
                    { label: '매출총이익', value: derived.grossProfit, source: 'DERIVED' },
                  ]}
                  result={{ label: '매출총이익률', value: derived.grossMargin, unit: '%' }}
                />
                <FormulaFlowCard
                  title="ROE"
                  formula="당기순이익 / 자본 × 100"
                  takeaway="ROE는 주주가 맡긴 자본이 얼마나 효율적으로 불어났는지를 보여줍니다. 다만 레버리지가 큰 기업은 ROE가 부풀려질 수 있습니다."
                  nodes={[
                    { label: '당기순이익', value: derived.netIncome, source: 'I/S' },
                    { label: '자본', value: derived.equity, source: 'B/S' },
                    { label: '레버리지', value: derived.equityMultiplier, unit: '배', source: 'DERIVED' },
                  ]}
                  result={{ label: 'ROE', value: derived.roe, unit: '%' }}
                />
                <FormulaFlowCard
                  title="ROA"
                  formula="당기순이익 / 총자산 × 100"
                  takeaway="ROA는 기업이 가진 전체 자산이 얼마나 이익으로 바뀌는지 보는 비율입니다. 자산이 무거운 업종일수록 낮게 나올 수 있습니다."
                  nodes={[
                    { label: '당기순이익', value: derived.netIncome, source: 'I/S' },
                    { label: '총자산', value: derived.totalAssets, source: 'B/S' },
                    { label: '총자산회전율', value: derived.assetTurnover, unit: '회', source: 'DERIVED' },
                  ]}
                  result={{ label: 'ROA', value: derived.roa, unit: '%' }}
                />
                <FormulaFlowCard
                  title="PER"
                  formula="시가총액 / 당기순이익"
                  takeaway="PER은 시장이 현재 이익에 몇 배의 가격을 붙이는지 보여줍니다. 성장 기대가 크면 높고, 이익이 흔들리면 해석이 더 까다로워집니다."
                  nodes={[
                    { label: '시가총액', value: market.marketCap, source: 'MKT' },
                    { label: '당기순이익', value: derived.netIncome, source: 'I/S' },
                    { label: 'PBR', value: derived.priceToBook, unit: '배', source: 'DERIVED' },
                  ]}
                  result={{ label: 'PER', value: derived.per, unit: '배' }}
                />
              </div>

              <SectionHeader title="ROE 분해 보기" />
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-xs font-bold text-emerald-800">듀퐁 분석: 순이익률 × 총자산회전율 × 레버리지 = ROE</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] font-bold text-slate-400">순이익률</p>
                    <p className="text-lg font-bold text-violet-700">{derived.netMargin.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] font-bold text-slate-400">총자산회전율</p>
                    <p className="text-lg font-bold text-sky-700">{derived.assetTurnover.toFixed(2)}회</p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] font-bold text-slate-400">레버리지</p>
                    <p className="text-lg font-bold text-amber-700">{derived.equityMultiplier.toFixed(2)}배</p>
                  </div>
                  <div className="rounded-xl bg-emerald-700 p-3">
                    <p className="text-[10px] font-bold text-emerald-100">분해된 ROE</p>
                    <p className="text-lg font-bold text-white">{derived.dupontRoe.toFixed(1)}%</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  ROE를 숫자 하나로 보지 말고, 이익률이 좋은 기업인지, 자산을 빠르게 돌리는 기업인지, 부채를 크게 쓰는 기업인지로 분해해 읽는 습관이 중요합니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 1: Cash Flow ── */}
        {activeTab === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <SectionHeader title="영업활동 조정 항목" />
              <InputRow label="당기순이익 (I/S 연동)" value={derived.netIncome} onChange={() => {}} readOnly highlight />
              <InputRow label="감가상각비 (비현금 가산)" value={cf.depreciation} onChange={cfUpdater('depreciation')} />

              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">운전자본 변동</p>
              <InputRow label="매출채권 증가 (-)" value={cf.arIncrease} onChange={cfUpdater('arIncrease')} />
              <InputRow label="재고자산 증가 (-)" value={cf.inventoryIncrease} onChange={cfUpdater('inventoryIncrease')} />
              <InputRow label="매입채무 증가 (+)" value={cf.apIncrease} onChange={cfUpdater('apIncrease')} />

              <SectionHeader title="투자활동" />
              <InputRow label="유형자산 취득 (-)" value={cf.capex} onChange={cfUpdater('capex')} />
              <InputRow label="투자자산 취득 (-)" value={cf.investmentAcquisition} onChange={cfUpdater('investmentAcquisition')} />

              <SectionHeader title="재무활동" />
              <InputRow label="차입금 증가 (+)" value={cf.debtIncrease} onChange={cfUpdater('debtIncrease')} />
              <InputRow label="차입금 상환 (-)" value={cf.debtRepayment} onChange={cfUpdater('debtRepayment')} />
              <InputRow label="배당금 지급 (-)" value={cf.dividendPaid} onChange={cfUpdater('dividendPaid')} />

              <SectionHeader title="기초 현금" />
              <InputRow label="기초 현금 잔액" value={cf.beginningCash} onChange={cfUpdater('beginningCash')} />
            </div>

            <div>
              <SectionHeader title="현금흐름 요약" />
              <div className="space-y-3">
                {[
                  { label: '영업활동현금흐름 (OCF)', value: cfDerived.operatingCF, positive: cfDerived.operatingCF >= 0 },
                  { label: '투자활동현금흐름', value: cfDerived.investingCF, positive: cfDerived.investingCF >= 0 },
                  { label: '재무활동현금흐름', value: cfDerived.financingCF, positive: cfDerived.financingCF >= 0 },
                ].map(item => (
                  <div key={item.label} className={`rounded-2xl p-4 border ${item.positive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${item.positive ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {item.positive ? '+' : ''}{item.value.toFixed(1)} <span className="text-sm font-normal text-slate-400">억원</span>
                    </p>
                  </div>
                ))}

                <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-600">기말 현금</span>
                    <span className="text-sm font-bold text-slate-800 tabular-nums">{cfDerived.endingCash.toFixed(1)} 억원</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-600">FCF (잉여현금흐름)</span>
                    <span className={`text-sm font-bold tabular-nums ${cfDerived.fcf >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {cfDerived.fcf >= 0 ? '+' : ''}{cfDerived.fcf.toFixed(1)} 억원
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-bold text-slate-600">EBITDA</span>
                    <span className="text-sm font-bold text-sky-700 tabular-nums">{cfDerived.ebitda.toFixed(1)} 억원</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">현금흐름 패턴 해석</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cfDerived.operatingCF > 0 && cfDerived.investingCF < 0 && cfDerived.financingCF < 0
                      ? '성숙 기업 패턴: 영업흑자로 투자와 부채상환 모두 충당.'
                      : cfDerived.operatingCF > 0 && cfDerived.investingCF < 0 && cfDerived.financingCF > 0
                      ? '성장 기업 패턴: 외부자금 조달로 적극 투자 진행 중.'
                      : cfDerived.operatingCF < 0
                      ? '주의 필요: 영업활동 자체에서 현금이 유출되고 있습니다.'
                      : '현금흐름을 종합적으로 검토하세요.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Benchmarks ── */}
        {activeTab === 2 && (
          <div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              B/S + I/S 탭의 값을 기반으로 계산됩니다. 한국 상장사 평균 기준으로 색상 신호를 표시합니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RatioGauge
                label="유동비율 (Current Ratio)"
                value={derived.currentRatio}
                unit="%"
                level={getCRLevel(derived.currentRatio)}
                description="유동자산/유동부채. ≥200% 우수 | 100~200% 보통 | <100% 위험"
                barPct={clampPct(derived.currentRatio, 300)}
              />
              <RatioGauge
                label="당좌비율 (Quick Ratio)"
                value={derived.quickRatio}
                unit="%"
                level={getQRLevel(derived.quickRatio)}
                description="(유동자산-재고)/유동부채. ≥100% 우수 | 50~100% 보통 | <50% 위험"
                barPct={clampPct(derived.quickRatio, 200)}
              />
              <RatioGauge
                label="부채비율 (D/E Ratio)"
                value={derived.debtRatio}
                unit="%"
                level={getDebtLevel(derived.debtRatio)}
                description="총부채/자본. ≤100% 우수 | 100~200% 보통 | >200% 위험"
                barPct={Math.min((derived.debtRatio / 300) * 100, 100)}
              />
              <RatioGauge
                label="이자보상배율"
                value={derived.interestCoverage}
                unit="배"
                level={derived.interestCoverage >= 3 ? 'good' : derived.interestCoverage >= 1.5 ? 'warning' : 'danger'}
                description="영업이익/이자비용. ≥3배 우수 | 1.5~3배 보통 | <1.5배 위험"
                barPct={clampPct(derived.interestCoverage, 10)}
              />
              <RatioGauge
                label="ROE (자기자본이익률)"
                value={derived.roe}
                unit="%"
                level={getROELevel(derived.roe)}
                description="당기순이익/자본. ≥15% 우수 | 8~15% 보통 | <8% 낮음"
                barPct={clampPct(derived.roe, 30)}
              />
              <RatioGauge
                label="ROA (총자산이익률)"
                value={derived.roa}
                unit="%"
                level={derived.roa >= 5 ? 'good' : derived.roa >= 2 ? 'warning' : 'danger'}
                description="당기순이익/총자산. ≥5% 우수 | 2~5% 보통 | <2% 낮음"
                barPct={clampPct(derived.roa, 15)}
              />
              <RatioGauge
                label="PER (주가수익비율)"
                value={derived.per}
                unit="배"
                level={derived.per > 0 && derived.per <= 15 ? 'good' : derived.per <= 25 ? 'warning' : 'danger'}
                description="시가총액/당기순이익. 낮을수록 저평가 가능성, 높을수록 성장 기대 반영"
                barPct={clampPct(derived.per, 40)}
              />
              <RatioGauge
                label="영업이익률"
                value={derived.operatingMargin}
                unit="%"
                level={derived.operatingMargin >= 10 ? 'good' : derived.operatingMargin >= 5 ? 'warning' : 'danger'}
                description="영업이익/매출액. ≥10% 우수 | 5~10% 보통 | <5% 낮음"
                barPct={clampPct(derived.operatingMargin, 30)}
              />
              <RatioGauge
                label="매출총이익률"
                value={derived.grossMargin}
                unit="%"
                level={derived.grossMargin >= 30 ? 'good' : derived.grossMargin >= 15 ? 'warning' : 'danger'}
                description="(매출-원가)/매출액. ≥30% 우수 | 15~30% 보통 | <15% 낮음"
                barPct={clampPct(derived.grossMargin, 60)}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// ── FinancialRatioTrendAnalyzer ───────────────────────────────────────────────

interface YearData {
  label: string;
  currentAssets: number;
  currentLiabilities: number;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  operatingIncome: number;
  netIncome: number;
  revenue: number;
}

interface RatioResult {
  name: string;
  nameEn: string;
  unit: string;
  values: number[];
  benchmark: number;
  higherIsBetter: boolean;
}

function calcRatios(years: YearData[]): RatioResult[] {
  const safe = (n: number, d: number) => (d !== 0 ? (n / d) * 100 : 0);

  return [
    {
      name: '유동비율',
      nameEn: 'Current Ratio',
      unit: '%',
      values: years.map((y) => safe(y.currentAssets, y.currentLiabilities)),
      benchmark: 200,
      higherIsBetter: true,
    },
    {
      name: '부채비율',
      nameEn: 'Debt Ratio',
      unit: '%',
      values: years.map((y) => safe(y.totalLiabilities, y.equity)),
      benchmark: 100,
      higherIsBetter: false,
    },
    {
      name: '자기자본비율',
      nameEn: 'Equity Ratio',
      unit: '%',
      values: years.map((y) => safe(y.equity, y.totalAssets)),
      benchmark: 50,
      higherIsBetter: true,
    },
    {
      name: '총자산이익률(ROA)',
      nameEn: 'ROA',
      unit: '%',
      values: years.map((y) => safe(y.netIncome, y.totalAssets)),
      benchmark: 5,
      higherIsBetter: true,
    },
    {
      name: '자기자본이익률(ROE)',
      nameEn: 'ROE',
      unit: '%',
      values: years.map((y) => safe(y.netIncome, y.equity)),
      benchmark: 10,
      higherIsBetter: true,
    },
    {
      name: '영업이익률',
      nameEn: 'Operating Margin',
      unit: '%',
      values: years.map((y) => safe(y.operatingIncome, y.revenue)),
      benchmark: 10,
      higherIsBetter: true,
    },
    {
      name: '순이익률',
      nameEn: 'Net Margin',
      unit: '%',
      values: years.map((y) => safe(y.netIncome, y.revenue)),
      benchmark: 5,
      higherIsBetter: true,
    },
    {
      name: '총자산회전율',
      nameEn: 'Asset Turnover',
      unit: '회',
      values: years.map((y) => y.totalAssets !== 0 ? y.revenue / y.totalAssets : 0),
      benchmark: 1,
      higherIsBetter: true,
    },
  ];
}

const DEFAULT_YEARS: YearData[] = [
  { label: '2022', currentAssets: 500, currentLiabilities: 300, totalAssets: 1200, totalLiabilities: 600, equity: 600, operatingIncome: 80, netIncome: 60, revenue: 800 },
  { label: '2023', currentAssets: 550, currentLiabilities: 280, totalAssets: 1300, totalLiabilities: 580, equity: 720, operatingIncome: 100, netIncome: 75, revenue: 950 },
  { label: '2024', currentAssets: 620, currentLiabilities: 260, totalAssets: 1450, totalLiabilities: 550, equity: 900, operatingIncome: 130, netIncome: 95, revenue: 1100 },
];

function getRatioColor(value: number, benchmark: number, higherIsBetter: boolean): string {
  const ratio = value / benchmark;
  if (higherIsBetter) {
    if (ratio >= 1.2) return 'bg-emerald-500';
    if (ratio >= 0.8) return 'bg-amber-400';
    return 'bg-rose-400';
  } else {
    if (ratio <= 0.8) return 'bg-emerald-500';
    if (ratio <= 1.2) return 'bg-amber-400';
    return 'bg-rose-400';
  }
}

function getRatioTextColor(value: number, benchmark: number, higherIsBetter: boolean): string {
  const ratio = value / benchmark;
  if (higherIsBetter) {
    if (ratio >= 1.2) return 'text-emerald-700';
    if (ratio >= 0.8) return 'text-amber-700';
    return 'text-rose-700';
  } else {
    if (ratio <= 0.8) return 'text-emerald-700';
    if (ratio <= 1.2) return 'text-amber-700';
    return 'text-rose-700';
  }
}

interface TrendYearInputProps {
  year: YearData;
  idx: number;
  onChange: (idx: number, field: keyof YearData, value: string) => void;
  locale: 'ko' | 'en';
}

const TrendYearInput: React.FC<TrendYearInputProps> = ({ year, idx, onChange, locale }) => {
  const fields: Array<{ key: keyof YearData; ko: string; en: string }> = [
    { key: 'currentAssets', ko: '유동자산', en: 'Current Assets' },
    { key: 'currentLiabilities', ko: '유동부채', en: 'Current Liab.' },
    { key: 'totalAssets', ko: '총자산', en: 'Total Assets' },
    { key: 'totalLiabilities', ko: '총부채', en: 'Total Liab.' },
    { key: 'equity', ko: '자본', en: 'Equity' },
    { key: 'operatingIncome', ko: '영업이익', en: 'Oper. Income' },
    { key: 'netIncome', ko: '순이익', en: 'Net Income' },
    { key: 'revenue', ko: '매출액', en: 'Revenue' },
  ];

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-4">
      <div className="mb-3">
        <label className="text-xs text-slate-500 block mb-1">{locale === 'ko' ? '연도' : 'Year'}</label>
        <input
          type="text"
          value={year.label}
          onChange={(e) => onChange(idx, 'label', e.target.value)}
          className="w-full border border-emerald-200 rounded-xl px-3 py-1.5 text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          aria-label={locale === 'ko' ? '연도' : 'Year label'}
        />
      </div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-24 shrink-0">{locale === 'ko' ? f.ko : f.en}</span>
            <input
              type="number"
              value={year[f.key]}
              onChange={(e) => onChange(idx, f.key, e.target.value)}
              className="flex-1 border border-emerald-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              aria-label={`${locale === 'ko' ? f.ko : f.en} ${year.label}`}
            />
            <span className="text-xs text-slate-400 w-8">{locale === 'ko' ? '억원' : 'B'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FinancialRatioTrendAnalyzer: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [years, setYears] = React.useState<YearData[]>(DEFAULT_YEARS);
  const [activeView, setActiveView] = React.useState<'input' | 'ratios'>('ratios');

  const handleChange = React.useCallback((idx: number, field: keyof YearData, value: string) => {
    setYears((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        [field]: field === 'label' ? value : parseFloat(value) || 0,
      };
      return next;
    });
  }, []);

  const ratios = React.useMemo(() => calcRatios(years), [years]);

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-2">
        {locale === 'ko' ? '재무비율 추세 분석기' : 'Financial Ratio Trend Analyzer'}
      </h3>
      <p className="text-sm text-emerald-600 mb-6">
        {locale === 'ko'
          ? '3개년 재무 데이터를 입력하면 8대 재무비율의 추세와 벤치마크 비교를 자동으로 표시합니다.'
          : 'Enter 3 years of financial data to auto-display 8 key ratio trends vs benchmarks.'}
      </p>

      {/* View toggle */}
      <div className="flex gap-2 mb-6" role="group" aria-label={locale === 'ko' ? '뷰 선택' : 'View selection'}>
        {([['input', '데이터 입력', 'Input Data'], ['ratios', '비율 분석', 'Ratio Analysis']] as const).map(([key, ko, en]) => (
          <button
            key={key}
            onClick={() => setActiveView(key as 'input' | 'ratios')}
            aria-pressed={activeView === key}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
              activeView === key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {locale === 'ko' ? ko : en}
          </button>
        ))}
      </div>

      {/* Input view */}
      {activeView === 'input' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {years.map((y, idx) => (
            <TrendYearInput key={idx} year={y} idx={idx} onChange={handleChange} locale={locale} />
          ))}
        </div>
      )}

      {/* Ratios view */}
      {activeView === 'ratios' && (
        <div className="space-y-4">
          {/* Year headers */}
          <div className="grid grid-cols-4 gap-2 px-2">
            <span className="text-xs font-bold text-slate-500">
              {locale === 'ko' ? '지표' : 'Metric'}
            </span>
            {years.map((y, i) => (
              <span key={i} className="text-xs font-bold text-emerald-700 text-center">{y.label}</span>
            ))}
          </div>

          {ratios.map((ratio) => {
            const maxVal = Math.max(...ratio.values.map(Math.abs), ratio.benchmark, 0.01);
            const lastIdx = ratio.values.length - 1;
            const trend = lastIdx > 0 ? ratio.values[lastIdx] - ratio.values[lastIdx - 1] : 0;
            const trendPositive = ratio.higherIsBetter ? trend >= 0 : trend <= 0;

            return (
              <div key={ratio.name} className="bg-white border border-emerald-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-slate-800">
                    {locale === 'ko' ? ratio.name : ratio.nameEn}
                  </span>
                  <span className={`text-xs font-bold ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}
                    aria-label={trendPositive ? 'improving trend' : 'declining trend'}>
                    {lastIdx > 0 ? (trendPositive ? '▲' : '▼') : ''}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {locale === 'ko' ? '벤치마크' : 'Benchmark'}: {ratio.benchmark}{ratio.unit}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 items-center">
                  <div /> {/* spacer */}
                  {ratio.values.map((val, i) => {
                    const barWidth = Math.max(0, Math.min(100, (Math.abs(val) / maxVal) * 100));
                    const color = getRatioColor(val, ratio.benchmark, ratio.higherIsBetter);
                    const textColor = getRatioTextColor(val, ratio.benchmark, ratio.higherIsBetter);

                    return (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden" role="meter" aria-valuenow={val} aria-label={`${years[i].label} ${ratio.name}`}>
                          <div
                            className={`h-3 rounded-full transition-all ${color}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold text-center ${textColor}`}>
                          {val.toFixed(1)}{ratio.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex gap-4 text-xs flex-wrap justify-center mt-2">
            {[
              { color: 'bg-emerald-500', label: locale === 'ko' ? '양호 (벤치마크 이상)' : 'Good (above benchmark)' },
              { color: 'bg-amber-400', label: locale === 'ko' ? '보통 (±20%)' : 'Fair (±20%)' },
              { color: 'bg-rose-400', label: locale === 'ko' ? '주의 (벤치마크 이하)' : 'Caution (below benchmark)' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${l.color}`} aria-hidden="true" />
                <span className="text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
