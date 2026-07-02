'use client';

import { useState } from 'react';

interface DrinkItem {
  name: string;
  caffeine: number; // mg per serving
  serving: string;
}

const DRINKS: DrinkItem[] = [
  { name: '아메리카노 (톨)', caffeine: 150, serving: '355ml' },
  { name: '에스프레소 (1샷)', caffeine: 75, serving: '30ml' },
  { name: '드립 커피', caffeine: 140, serving: '240ml' },
  { name: '카푸치노/라테 (톨)', caffeine: 75, serving: '355ml' },
  { name: '녹차', caffeine: 28, serving: '240ml' },
  { name: '홍차', caffeine: 47, serving: '240ml' },
  { name: '에너지 드링크 (250ml)', caffeine: 80, serving: '250ml' },
  { name: '콜라 (355ml)', caffeine: 34, serving: '355ml' },
  { name: '다크초콜릿 (30g)', caffeine: 22, serving: '30g' },
  { name: '홍삼 캡슐 (1정)', caffeine: 5, serving: '1정' },
];

function getSensitivityInfo(weight: number, total: number) {
  const perKg = total / weight;
  // FDA safe limit: 400mg/day for healthy adults, ~6mg/kg
  if (perKg < 2) return { level: '낮음', color: 'text-green-600', bg: 'bg-green-50', desc: '안전 범위입니다. 카페인 부작용 위험이 낮습니다.' };
  if (perKg < 4) return { level: '보통', color: 'text-blue-600', bg: 'bg-blue-50', desc: '일반 성인 적정 범위입니다.' };
  if (perKg < 6) return { level: '주의', color: 'text-yellow-600', bg: 'bg-yellow-50', desc: 'FDA 권장 한도에 근접합니다. 불안·심박 증가에 주의하세요.' };
  return { level: '위험', color: 'text-red-600', bg: 'bg-red-50', desc: '권장 한도(6mg/kg)를 초과합니다. 두통·심계항진·불면 위험이 높습니다.' };
}

function getHalfLifeInfo(hour: number, total: number): string {
  // Caffeine half-life ~5-6 hours
  const remaining = total * Math.pow(0.5, hour / 5.5);
  return remaining.toFixed(0);
}

export default function CaffeineCalculator() {
  const [weight, setWeight] = useState('65');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customMg, setCustomMg] = useState('');
  const [wakeHour, setWakeHour] = useState('7');
  const [result, setResult] = useState<{ total: number; perKg: number; breakdown: { name: string; mg: number }[] } | null>(null);

  const setQty = (name: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [name]: Math.max(0, val) }));
  };

  const calculate = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;

    const breakdown: { name: string; mg: number }[] = [];
    let total = 0;

    DRINKS.forEach((d) => {
      const qty = quantities[d.name] || 0;
      if (qty > 0) {
        const mg = d.caffeine * qty;
        breakdown.push({ name: `${d.name} ×${qty}`, mg });
        total += mg;
      }
    });

    const custom = parseFloat(customMg);
    if (!isNaN(custom) && custom > 0) {
      breakdown.push({ name: '기타 (직접입력)', mg: custom });
      total += custom;
    }

    setResult({ total, perKg: total / w, breakdown });
  };

  const wake = parseInt(wakeHour);
  const bedtimeRemainder = result ? getHalfLifeInfo(16, result.total) : '0';

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">카페인 섭취량 계산기</h3>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          체중 (kg)
        </label>
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="65"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          기상 시간 (시)
        </label>
        <input
          type="number"
          value={wakeHour}
          onChange={(e) => setWakeHour(e.target.value)}
          min="0"
          max="23"
          className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="7"
        />
        <p className="mt-1 text-xs text-gray-400">취침 시간({wake + 16 > 24 ? wake + 16 - 24 : wake + 16}시) 카페인 잔존량 예측에 사용</p>
      </div>

      <p className="mb-3 text-sm font-medium text-gray-700">오늘 섭취한 음식/음료 수량 입력</p>

      <div className="mb-4 space-y-2">
        {DRINKS.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="w-52 text-sm text-gray-600">
              {d.name} <span className="text-xs text-gray-400">({d.caffeine}mg)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty(d.name, (quantities[d.name] || 0) - 1)}
                className="h-7 w-7 rounded-full border border-gray-300 text-sm hover:bg-gray-100"
              >−</button>
              <span className="w-6 text-center text-sm font-semibold">{quantities[d.name] || 0}</span>
              <button
                onClick={() => setQty(d.name, (quantities[d.name] || 0) + 1)}
                className="h-7 w-7 rounded-full border border-gray-300 text-sm hover:bg-gray-100"
              >+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          기타 카페인 (mg, 직접 입력)
        </label>
        <input
          type="number"
          value={customMg}
          onChange={(e) => setCustomMg(e.target.value)}
          className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="0"
        />
      </div>

      <button
        onClick={calculate}
        className="w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
      >
        계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-4">
          {(() => {
            const info = getSensitivityInfo(parseFloat(weight), result.total);
            return (
              <div className={`rounded-xl p-4 ${info.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${info.color}`}>{result.total}mg</span>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${info.color} border ${info.color.replace('text-', 'border-')}`}>
                    {info.level}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  체중 1kg당 {result.perKg.toFixed(1)}mg · {info.desc}
                </p>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">FDA 권장 한도</p>
              <p className="text-lg font-bold text-gray-700">400mg</p>
              <p className="text-xs text-gray-400">잔여: {Math.max(0, 400 - result.total)}mg</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">취침 시 잔존량 (16h 후)</p>
              <p className="text-lg font-bold text-gray-700">{bedtimeRemainder}mg</p>
              <p className="text-xs text-gray-400">반감기 5.5시간 기준</p>
            </div>
          </div>

          {result.breakdown.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">섭취 내역</p>
              {result.breakdown.map((b, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{b.name}</span>
                  <span className="font-medium text-gray-900">{b.mg}mg</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400">
            * 카페인 함량은 브랜드·조리법에 따라 다를 수 있습니다. 임산부(200mg/일 이하), 청소년(100mg/일 이하)은 더 엄격한 제한이 권장됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
