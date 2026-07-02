import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Point { x: number; y: number; }

// ── Supply & Demand Simulator ────────────────────────────────────────────────

/**
 * Pure CSS/SVG supply-demand graph — no recharts dependency.
 *
 * Model:
 *   Demand: P = (demandIntercept + demandShift) − demandSlope × Q
 *   Supply: P = (supplyIntercept + supplyShift) + supplySlope × Q
 *
 * Equilibrium: solve for Q, then P.
 */

const GRAPH_W = 320;
const GRAPH_H = 260;
const PAD = { top: 16, right: 16, bottom: 36, left: 44 };
const MAX_Q = 100;
const MAX_P = 100;

function toSVGX(q: number) {
  return PAD.left + (q / MAX_Q) * (GRAPH_W - PAD.left - PAD.right);
}
function toSVGY(p: number) {
  return GRAPH_H - PAD.bottom - (p / MAX_P) * (GRAPH_H - PAD.top - PAD.bottom);
}

function buildLinePoints(
  intercept: number,
  slope: number,
  sign: 1 | -1, // 1 = supply (upward), -1 = demand (downward)
): string {
  const points: Point[] = [];
  for (let q = 0; q <= MAX_Q; q += 2) {
    const p = intercept + sign * slope * q;
    if (p >= 0 && p <= MAX_P) {
      points.push({ x: toSVGX(q), y: toSVGY(p) });
    }
  }
  return points.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
}

function calcEquilibrium(
  dIntercept: number,
  dSlope: number,
  sIntercept: number,
  sSlope: number,
): { q: number; p: number } {
  // dIntercept - dSlope * Q = sIntercept + sSlope * Q
  // dIntercept - sIntercept = (dSlope + sSlope) * Q
  const denom = dSlope + sSlope;
  if (denom === 0) return { q: 50, p: 50 };
  const q = (dIntercept - sIntercept) / denom;
  const p = sIntercept + sSlope * q;
  return { q: Math.max(0, q), p: Math.max(0, p) };
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step = 1, onChange, unit = '' }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <span className="text-xs font-bold text-emerald-700 tabular-nums">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none bg-emerald-200 accent-emerald-600 cursor-pointer"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
    />
  </div>
);

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
      value ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
    }`}
    aria-pressed={value}
  >
    <span className={`w-3 h-3 rounded-full border-2 ${value ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`} aria-hidden="true" />
    {label}
  </button>
);

export const SupplyDemandSimulator: React.FC = () => {
  // Curve parameters
  const [demandShift, setDemandShift] = useState(0);
  const [supplyShift, setSupplyShift] = useState(0);
  const [demandSlope, setDemandSlope] = useState(0.8); // steepness
  const [taxPerUnit, setTaxPerUnit] = useState(0);

  // Display toggles
  const [showSurplus, setShowSurplus] = useState(false);
  const [showTax, setShowTax] = useState(false);

  // Base intercepts
  const D_BASE = 90;
  const S_BASE = 10;

  const dIntercept = D_BASE + demandShift;
  const sIntercept = S_BASE + supplyShift + (showTax ? taxPerUnit : 0);
  const sSlope = 0.8;

  const eq = useMemo(
    () => calcEquilibrium(dIntercept, demandSlope, sIntercept, sSlope),
    [dIntercept, demandSlope, sIntercept, sSlope],
  );

  // Pre-tax equilibrium (for deadweight loss visualization)
  const eqPreTax = useMemo(
    () => calcEquilibrium(dIntercept, demandSlope, S_BASE + supplyShift, sSlope),
    [dIntercept, demandSlope, supplyShift, sSlope],
  );

  const demandPoints = buildLinePoints(dIntercept, demandSlope, -1);
  const supplyPoints = buildLinePoints(sIntercept, sSlope, 1);

  // Consumer surplus triangle: demand curve above eq price
  const csPoints = showSurplus
    ? [
        `${toSVGX(0).toFixed(1)},${toSVGY(dIntercept).toFixed(1)}`,
        `${toSVGX(eq.q).toFixed(1)},${toSVGY(eq.p).toFixed(1)}`,
        `${toSVGX(0).toFixed(1)},${toSVGY(eq.p).toFixed(1)}`,
      ].join(' ')
    : '';

  // Producer surplus triangle: supply curve below eq price
  const psPoints = showSurplus
    ? [
        `${toSVGX(0).toFixed(1)},${toSVGY(S_BASE + supplyShift).toFixed(1)}`,
        `${toSVGX(0).toFixed(1)},${toSVGY(eq.p).toFixed(1)}`,
        `${toSVGX(eq.q).toFixed(1)},${toSVGY(eq.p).toFixed(1)}`,
      ].join(' ')
    : '';

  // Deadweight loss triangle (when tax applied)
  const dwlPoints =
    showTax && taxPerUnit > 0
      ? [
          `${toSVGX(eq.q).toFixed(1)},${toSVGY(eq.p).toFixed(1)}`,
          `${toSVGX(eqPreTax.q).toFixed(1)},${toSVGY(eqPreTax.p).toFixed(1)}`,
          `${toSVGX(eq.q).toFixed(1)},${toSVGY(eqPreTax.p - taxPerUnit * (eqPreTax.q - eq.q) / (eqPreTax.q || 1)).toFixed(1)}`,
        ].join(' ')
      : '';

  return (
    <Card className="bg-white border border-emerald-100 shadow-xl rounded-2xl overflow-hidden mt-8">
      <div className="bg-emerald-700 px-6 py-5">
        <h3 className="text-lg font-bold text-white">수요공급 시뮬레이터</h3>
        <p className="text-xs text-emerald-200 mt-1">슬라이더로 곡선을 이동하며 균형가격과 잉여를 확인하세요</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graph */}
        <div>
          <svg
            width="100%"
            viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
            role="img"
            aria-label="수요공급 곡선 그래프"
            className="block"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(v => (
              <g key={v}>
                <line
                  x1={toSVGX(0)} y1={toSVGY(v)}
                  x2={toSVGX(100)} y2={toSVGY(v)}
                  stroke="#e2e8f0" strokeWidth="1"
                />
                <text x={PAD.left - 6} y={toSVGY(v) + 4} textAnchor="end" fontSize="8" fill="#94a3b8">{v}</text>
              </g>
            ))}
            {[0, 25, 50, 75, 100].map(v => (
              <g key={v}>
                <line
                  x1={toSVGX(v)} y1={toSVGY(0)}
                  x2={toSVGX(v)} y2={toSVGY(100)}
                  stroke="#e2e8f0" strokeWidth="1"
                />
                <text x={toSVGX(v)} y={GRAPH_H - PAD.bottom + 14} textAnchor="middle" fontSize="8" fill="#94a3b8">{v}</text>
              </g>
            ))}

            {/* Axis labels */}
            <text x={PAD.left / 2 - 4} y={GRAPH_H / 2} fontSize="9" fill="#64748b" transform={`rotate(-90,${PAD.left / 2 - 4},${GRAPH_H / 2})`} textAnchor="middle">가격 (P)</text>
            <text x={GRAPH_W / 2} y={GRAPH_H - 2} fontSize="9" fill="#64748b" textAnchor="middle">수량 (Q)</text>

            {/* Consumer surplus */}
            {showSurplus && csPoints && (
              <polygon points={csPoints} fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="0.5" />
            )}

            {/* Producer surplus */}
            {showSurplus && psPoints && (
              <polygon points={psPoints} fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="0.5" />
            )}

            {/* Deadweight loss */}
            {dwlPoints && (
              <polygon points={dwlPoints} fill="#f97316" fillOpacity="0.35" stroke="#f97316" strokeWidth="0.5" />
            )}

            {/* Supply curve */}
            {supplyPoints && (
              <polyline points={supplyPoints} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Demand curve */}
            {demandPoints && (
              <polyline points={demandPoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Equilibrium dashed lines */}
            {eq.q >= 0 && eq.q <= MAX_Q && eq.p >= 0 && eq.p <= MAX_P && (
              <>
                <line
                  x1={toSVGX(0)} y1={toSVGY(eq.p)}
                  x2={toSVGX(eq.q)} y2={toSVGY(eq.p)}
                  stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3"
                />
                <line
                  x1={toSVGX(eq.q)} y1={toSVGY(0)}
                  x2={toSVGX(eq.q)} y2={toSVGY(eq.p)}
                  stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3"
                />
                <circle cx={toSVGX(eq.q)} cy={toSVGY(eq.p)} r="5" fill="#f59e0b" stroke="white" strokeWidth="1.5" />
              </>
            )}

            {/* Labels */}
            <text x={toSVGX(Math.min(MAX_Q - 10, 90))} y={toSVGY(dIntercept - demandSlope * (MAX_Q - 10)) - 6} fontSize="10" fill="#3b82f6" fontWeight="bold">D</text>
            <text x={toSVGX(Math.min(MAX_Q - 10, 85))} y={toSVGY(sIntercept + sSlope * (MAX_Q - 10)) + 14} fontSize="10" fill="#10b981" fontWeight="bold">S</text>
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 inline-block" />수요 (D)</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-500 inline-block" />공급 (S)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />균형점 (E)</span>
            {showSurplus && <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 inline-block" />소비자 잉여</span>}
            {showSurplus && <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-200 inline-block" />생산자 잉여</span>}
            {showTax && taxPerUnit > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-300 inline-block" />DWL</span>}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Equilibrium display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">균형가격 (P*)</p>
              <p className="text-2xl font-bold text-amber-700 tabular-nums">{eq.p.toFixed(1)}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3 text-center">
              <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">균형수량 (Q*)</p>
              <p className="text-2xl font-bold text-sky-700 tabular-nums">{eq.q.toFixed(1)}</p>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            <SliderRow label="수요 곡선 이동 (←오른쪽→)" value={demandShift} min={-30} max={30} onChange={setDemandShift} />
            <SliderRow label="공급 곡선 이동 (←오른쪽→)" value={supplyShift} min={-30} max={30} onChange={setSupplyShift} />
            <SliderRow label="수요 탄력성 (완전비탄력 ↔ 탄력적)" value={demandSlope} min={0.2} max={2.0} step={0.1} onChange={setDemandSlope} />
            {showTax && <SliderRow label="단위당 세금" value={taxPerUnit} min={0} max={30} onChange={setTaxPerUnit} />}
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <Toggle label="소비자·생산자 잉여 표시" value={showSurplus} onChange={setShowSurplus} />
            <Toggle label="종량세 적용 (공급 곡선 이동)" value={showTax} onChange={v => { setShowTax(v); if (!v) setTaxPerUnit(0); }} />
          </div>

          {/* Elasticity note */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
            <p className="text-[10px] font-bold text-emerald-700 mb-1">수요 탄력성 해석</p>
            <p className="text-[10px] text-slate-600">
              {demandSlope <= 0.4
                ? '탄력적 수요 — 가격 변화에 수량이 크게 반응합니다.'
                : demandSlope <= 0.8
                ? '단위 탄력적 — 가격 변화율 ≈ 수량 변화율'
                : '비탄력적 수요 — 가격이 올라도 수량이 크게 줄지 않습니다.'}
            </p>
          </div>

          {showTax && taxPerUnit > 0 && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
              <p className="text-[10px] font-bold text-orange-700 mb-1">세금 효과 (종량세)</p>
              <ul className="text-[10px] text-orange-600 space-y-0.5 list-disc list-inside">
                <li>공급 곡선이 위로 이동 → 균형가격 상승, 수량 감소</li>
                <li>주황색 삼각형 = 자중손실 (Deadweight Loss)</li>
                <li>탄력성이 낮을수록 자중손실이 작고 조세 귀착은 소비자에게</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// ── Elasticity Calculator ────────────────────────────────────────────────────

type ElasticityClass =
  | '완전비탄력'
  | '비탄력적'
  | '단위탄력'
  | '탄력적'
  | '완전탄력';

function classifyElasticity(e: number): ElasticityClass {
  const abs = Math.abs(e);
  if (!isFinite(abs)) return '완전탄력';
  if (abs === 0) return '완전비탄력';
  if (abs < 1) return '비탄력적';
  if (abs === 1) return '단위탄력';
  return '탄력적';
}

const elasticityColors: Record<ElasticityClass, string> = {
  '완전비탄력': 'bg-rose-100 text-rose-700 border-rose-200',
  '비탄력적':   'bg-amber-100 text-amber-700 border-amber-200',
  '단위탄력':   'bg-sky-100 text-sky-700 border-sky-200',
  '탄력적':     'bg-emerald-100 text-emerald-700 border-emerald-200',
  '완전탄력':   'bg-violet-100 text-violet-700 border-violet-200',
};

const elasticityDescriptions: Record<ElasticityClass, string> = {
  '완전비탄력': '가격이 변해도 수량이 전혀 변하지 않습니다. (예: 생필품, 인슐린)',
  '비탄력적':   '가격 변화율보다 수량 변화율이 작습니다. 가격 인상이 유리합니다.',
  '단위탄력':   '가격 변화율 = 수량 변화율. 총수입이 변하지 않습니다.',
  '탄력적':     '가격 변화율보다 수량 변화율이 큽니다. 가격 인하가 총수입을 늘립니다.',
  '완전탄력':   '아주 작은 가격 변화에도 수량이 무한대로 변합니다. (경쟁시장)',
};

export const ElasticityCalculator: React.FC = () => {
  const [p1, setP1] = useState(1000);
  const [p2, setP2] = useState(1200);
  const [q1, setQ1] = useState(500);
  const [q2, setQ2] = useState(400);

  const [sq1, setSQ1] = useState(500);
  const [sq2, setSQ2] = useState(650);

  const demandElasticity = useMemo(() => {
    const pctQ = ((q2 - q1) / ((q1 + q2) / 2)) * 100;
    const pctP = ((p2 - p1) / ((p1 + p2) / 2)) * 100;
    if (pctP === 0) return Infinity;
    return pctQ / pctP;
  }, [p1, p2, q1, q2]);

  const supplyElasticity = useMemo(() => {
    const pctQ = ((sq2 - sq1) / ((sq1 + sq2) / 2)) * 100;
    const pctP = ((p2 - p1) / ((p1 + p2) / 2)) * 100;
    if (pctP === 0) return Infinity;
    return pctQ / pctP;
  }, [p1, p2, sq1, sq2]);

  const demandClass = classifyElasticity(demandElasticity);
  const supplyClass = classifyElasticity(supplyElasticity);

  const inputClass = "w-full text-right text-sm bg-white border border-emerald-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400";

  return (
    <Card className="bg-white border border-emerald-100 shadow-xl rounded-2xl overflow-hidden mt-8">
      <div className="bg-emerald-700 px-6 py-5">
        <h3 className="text-lg font-bold text-white">탄력성 계산기</h3>
        <p className="text-xs text-emerald-200 mt-1">호탄력성(Arc Elasticity) 공식 — 중간점 방법 사용</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price inputs (shared) */}
        <div>
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-3">가격 변화 (공통)</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">가격 1 (P₁)</label>
              <input type="number" value={p1} onChange={e => setP1(Number(e.target.value))} className={inputClass} aria-label="가격 1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">가격 2 (P₂)</label>
              <input type="number" value={p2} onChange={e => setP2(Number(e.target.value))} className={inputClass} aria-label="가격 2" />
            </div>
          </div>

          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">수요량 변화</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">수요량 1 (Q₁D)</label>
              <input type="number" value={q1} onChange={e => setQ1(Number(e.target.value))} className={inputClass} aria-label="수요량 1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">수요량 2 (Q₂D)</label>
              <input type="number" value={q2} onChange={e => setQ2(Number(e.target.value))} className={inputClass} aria-label="수요량 2" />
            </div>
          </div>

          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">공급량 변화</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">공급량 1 (Q₁S)</label>
              <input type="number" value={sq1} onChange={e => setSQ1(Number(e.target.value))} className={inputClass} aria-label="공급량 1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">공급량 2 (Q₂S)</label>
              <input type="number" value={sq2} onChange={e => setSQ2(Number(e.target.value))} className={inputClass} aria-label="공급량 2" />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Demand elasticity result */}
          <div className={`rounded-2xl border p-4 ${elasticityColors[demandClass]}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1">수요의 가격탄력성 (PED)</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tabular-nums">
                {isFinite(demandElasticity) ? demandElasticity.toFixed(2) : '∞'}
              </span>
              <span className="text-sm font-bold px-3 py-1 rounded-xl bg-white bg-opacity-60 border border-current">
                {demandClass}
              </span>
            </div>
            <p className="text-[10px] mt-2 opacity-80">{elasticityDescriptions[demandClass]}</p>
            <div className="mt-2 text-[10px] opacity-70">
              %ΔQ = {isFinite(demandElasticity) && p1 + p2 > 0
                ? (((q2 - q1) / ((q1 + q2) / 2)) * 100).toFixed(1)
                : '—'}% / %ΔP = {p1 + p2 > 0
                  ? (((p2 - p1) / ((p1 + p2) / 2)) * 100).toFixed(1)
                  : '—'}%
            </div>
          </div>

          {/* Supply elasticity result */}
          <div className={`rounded-2xl border p-4 ${elasticityColors[supplyClass]}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1">공급의 가격탄력성 (PES)</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tabular-nums">
                {isFinite(supplyElasticity) ? supplyElasticity.toFixed(2) : '∞'}
              </span>
              <span className="text-sm font-bold px-3 py-1 rounded-xl bg-white bg-opacity-60 border border-current">
                {supplyClass}
              </span>
            </div>
            <p className="text-[10px] mt-2 opacity-80">{elasticityDescriptions[supplyClass]}</p>
          </div>

          {/* Formula reference */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] font-bold text-slate-500 mb-2">호탄력성 공식 (중간점 방법)</p>
            <p className="text-[10px] text-slate-600 font-mono leading-relaxed">
              E = (%ΔQ) / (%ΔP)<br />
              %ΔQ = (Q₂−Q₁) / ((Q₁+Q₂)/2) × 100<br />
              %ΔP = (P₂−P₁) / ((P₁+P₂)/2) × 100
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
