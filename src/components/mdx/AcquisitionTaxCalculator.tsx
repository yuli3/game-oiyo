'use client';

import { useState } from 'react';

function formatKRW(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

type HouseType = 'first' | 'second' | 'third';
type PropertyKind = 'house' | 'land' | 'commercial';

const HOUSE_RATES: Record<HouseType, { label: string; rate: number; extra: number }> = {
  first:  { label: '1주택 (무주택→1주택)', rate: 0.01, extra: 0.001 },
  second: { label: '2주택 (1주택→2주택)', rate: 0.01, extra: 0.001 },
  third:  { label: '3주택 이상 또는 법인', rate: 0.04, extra: 0.004 },
};

export default function AcquisitionTaxCalculator() {
  const [propertyKind, setPropertyKind] = useState<PropertyKind>('house');
  const [houseType, setHouseType] = useState<HouseType>('first');
  const [price, setPrice] = useState('500000000');
  const [result, setResult] = useState<{
    acquisitionTax: number;
    localEducationTax: number;
    specialTax: number;
    total: number;
    rate: number;
  } | null>(null);

  const calculate = () => {
    const p = parseFloat(price.replace(/,/g, ''));
    if (!p) return;

    let rate = 0;
    let localEduRate = 0;
    let specialTaxRate = 0;

    if (propertyKind === 'house') {
      const h = HOUSE_RATES[houseType];
      rate = h.rate;
      localEduRate = h.extra;
      specialTaxRate = houseType === 'third' ? 0 : 0.002; // 농특세
    } else if (propertyKind === 'land') {
      rate = 0.04;
      localEduRate = 0.004;
      specialTaxRate = 0.002;
    } else {
      rate = 0.04;
      localEduRate = 0.004;
      specialTaxRate = 0.002;
    }

    const acquisitionTax = p * rate;
    const localEducationTax = p * localEduRate;
    const specialTax = p * specialTaxRate;
    const total = acquisitionTax + localEducationTax + specialTax;

    setResult({ acquisitionTax, localEducationTax, specialTax, total, rate });
  };

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">취득세 계산기</h3>

      <div className="mb-4 flex gap-2">
        {(['house', 'land', 'commercial'] as PropertyKind[]).map((k) => {
          const label = k === 'house' ? '주택' : k === 'land' ? '토지' : '상가/오피스텔';
          return (
            <button key={k} onClick={() => setPropertyKind(k)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${propertyKind === k ? 'bg-indigo-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          );
        })}
      </div>

      {propertyKind === 'house' && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">취득 후 주택 수</label>
          <div className="flex gap-2">
            {(Object.keys(HOUSE_RATES) as HouseType[]).map((k) => (
              <button key={k} onClick={() => setHouseType(k)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${houseType === k ? 'bg-indigo-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                {HOUSE_RATES[k].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">취득가액 (원)</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <button onClick={calculate}
        className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
        계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-3">
          <div className="rounded-xl bg-indigo-50 p-4">
            <p className="text-xs text-gray-500">적용 세율</p>
            <p className="text-2xl font-bold text-indigo-700">{(result.rate * 100).toFixed(1)}%</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: '취득세', value: result.acquisitionTax },
              { label: '지방교육세', value: result.localEducationTax },
              { label: '농어촌특별세', value: result.specialTax },
              { label: '총 납부액', value: result.total },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-bold text-gray-800">{formatKRW(value)}원</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">* 생애최초 감면(200만 한도), 신혼부부·다자녀 특례 미반영. 참고용으로 활용하세요.</p>
        </div>
      )}
    </div>
  );
}
