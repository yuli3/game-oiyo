'use client';

import { useState } from 'react';

function formatKRW(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

type PropertyType = 'house' | 'land' | 'building';

const TAX_RATE_HOUSE = [
  { limit: 60_000_000, rate: 0.001 },
  { limit: 150_000_000, rate: 0.0015 },
  { limit: 300_000_000, rate: 0.0025 },
  { limit: Infinity, rate: 0.004 },
];

const TAX_RATE_LAND_GENERAL = [
  { limit: 50_000_000, rate: 0.002 },
  { limit: 100_000_000, rate: 0.003 },
  { limit: Infinity, rate: 0.005 },
];

function calcProgressiveTax(base: number, brackets: { limit: number; rate: number }[]): number {
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (base <= prev) break;
    const taxable = Math.min(base, b.limit) - prev;
    tax += taxable * b.rate;
    prev = b.limit;
  }
  return tax;
}

export default function PropertyTaxCalculator() {
  const [propertyType, setPropertyType] = useState<PropertyType>('house');
  const [publicPrice, setPublicPrice] = useState('300000000');
  const [fairValueRatio, setFairValueRatio] = useState('60');
  const [result, setResult] = useState<{
    taxBase: number;
    propertyTax: number;
    urbanTax: number;
    educationTax: number;
    localEducationTax: number;
    total: number;
  } | null>(null);

  const calculate = () => {
    const price = parseFloat(publicPrice.replace(/,/g, ''));
    const ratio = parseFloat(fairValueRatio) / 100;
    if (!price || !ratio) return;

    const taxBase = price * ratio;
    let propertyTax = 0;

    if (propertyType === 'house') {
      propertyTax = calcProgressiveTax(taxBase, TAX_RATE_HOUSE);
    } else if (propertyType === 'land') {
      propertyTax = calcProgressiveTax(taxBase, TAX_RATE_LAND_GENERAL);
    } else {
      // building: flat 0.25%
      propertyTax = taxBase * 0.0025;
    }

    const urbanTax = propertyTax * 0.2; // 도시지역분 20%
    const educationTax = propertyTax * 0.2; // 지방교육세 20%
    const localEducationTax = 0; // 지역자원시설세 (별도 계산 필요)
    const total = propertyTax + urbanTax + educationTax;

    setResult({ taxBase, propertyTax, urbanTax, educationTax, localEducationTax, total });
  };

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">재산세 계산기</h3>

      <div className="mb-4 flex gap-2">
        {(['house', 'land', 'building'] as PropertyType[]).map((t) => {
          const label = t === 'house' ? '주택' : t === 'land' ? '토지' : '건물';
          return (
            <button key={t} onClick={() => setPropertyType(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${propertyType === t ? 'bg-teal-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            공시가격 (원)
          </label>
          <input type="number" value={publicPrice} onChange={(e) => setPublicPrice(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            공정시장가액비율 (%) — 주택 60%, 토지 70%
          </label>
          <input type="number" value={fairValueRatio} onChange={(e) => setFairValueRatio(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <button onClick={calculate}
        className="mt-5 w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
        계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-3">
          <div className="rounded-xl bg-teal-50 p-4">
            <p className="text-xs text-gray-500">과세표준</p>
            <p className="text-lg font-bold text-teal-700">{formatKRW(result.taxBase)}원</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: '재산세 본세', value: result.propertyTax },
              { label: '도시지역분(20%)', value: result.urbanTax },
              { label: '지방교육세(20%)', value: result.educationTax },
              { label: '합계', value: result.total },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-bold text-gray-800">{formatKRW(value)}원</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">* 1세대 1주택 특례 감면·지역자원시설세 미포함. 참고용으로만 활용하세요.</p>
        </div>
      )}
    </div>
  );
}
