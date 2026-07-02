import React, { useState, useCallback } from 'react';

type Mode = 'add' | 'extract' | 'reverse';
type Rate = 10 | 0;

const RATES = [
  { label: '일반세율 10%', value: 10 },
  { label: '영세율 0%', value: 0 },
] as const;

function fmt(n: number) {
  return n.toLocaleString('ko-KR');
}

function parseInput(v: string): number {
  const cleaned = v.replace(/,/g, '').replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

export default function VatCalculator() {
  const [mode, setMode] = useState<Mode>('add');
  const [rate, setRate] = useState<Rate>(10);
  const [input, setInput] = useState('');
  const [displayInput, setDisplayInput] = useState('');

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setInput(raw);
      const num = parseFloat(raw) || 0;
      setDisplayInput(num > 0 ? fmt(num) : raw);
    }
  }, []);

  const value = parseInput(input);
  const r = rate / 100;

  let supplyPrice = 0;
  let vatAmount = 0;
  let totalPrice = 0;

  if (mode === 'add') {
    // 공급가액 → VAT 추가
    supplyPrice = value;
    vatAmount = Math.round(value * r);
    totalPrice = supplyPrice + vatAmount;
  } else if (mode === 'extract') {
    // 부가세 포함 금액 → 공급가액·VAT 분리
    totalPrice = value;
    supplyPrice = Math.round(value / (1 + r));
    vatAmount = totalPrice - supplyPrice;
  } else {
    // 공급대가에서 역산 (extract alias)
    totalPrice = value;
    supplyPrice = Math.round(value / (1 + r));
    vatAmount = totalPrice - supplyPrice;
  }

  const modes: { key: Mode; label: string; desc: string }[] = [
    { key: 'add', label: '부가세 계산', desc: '공급가액에 VAT 더하기' },
    { key: 'extract', label: '부가세 역산', desc: '합계금액에서 VAT 분리' },
  ];

  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧾</span>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">부가가치세 계산기</h3>
            <p className="text-blue-100 text-xs mt-0.5">공급가액·세액·합계를 즉시 계산</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Mode tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setInput(''); setDisplayInput(''); }}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                mode === m.key
                  ? 'bg-white shadow text-blue-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div>{m.label}</div>
              <div className="text-xs font-normal opacity-70 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Rate selector */}
        <div className="flex gap-2">
          {RATES.map((rt) => (
            <button
              key={rt.value}
              onClick={() => setRate(rt.value as Rate)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                rate === rt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-border text-muted-foreground hover:border-blue-300'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-foreground">
            {mode === 'add' ? '공급가액 (원, VAT 미포함)' : '합계 금액 (원, VAT 포함)'}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={displayInput}
              onChange={handleInput}
              placeholder="금액 입력 (예: 100,000)"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-right text-lg font-mono font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-muted-foreground/40"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none ml-1">원</span>
          </div>
        </div>

        {/* Results */}
        {value > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
            <div className="divide-y divide-border">
              <div className="flex justify-between items-center px-5 py-3.5">
                <span className="text-sm text-muted-foreground font-medium">공급가액</span>
                <span className="font-mono font-bold text-foreground text-lg">{fmt(supplyPrice)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3.5 bg-blue-50/50">
                <span className="text-sm text-blue-700 font-semibold">부가가치세 ({rate}%)</span>
                <span className="font-mono font-bold text-blue-700 text-lg">+ {fmt(vatAmount)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-4 bg-foreground/5">
                <span className="text-sm font-bold text-foreground">합계 금액</span>
                <span className="font-mono font-extrabold text-foreground text-xl">{fmt(totalPrice)} 원</span>
              </div>
            </div>
          </div>
        )}

        {/* Tip */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          ※ 원 단위 미만은 절사 처리됩니다.{' '}
          <span className="text-blue-600">세금계산서 발행 시 공급가액과 세액을 분리 기재해야 합니다.</span>
        </p>
      </div>
    </div>
  );
}
