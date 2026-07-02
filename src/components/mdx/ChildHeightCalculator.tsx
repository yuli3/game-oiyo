'use client';

import { useState } from 'react';

function fmt(n: number): string {
  return n.toFixed(1);
}

export default function ChildHeightCalculator() {
  const [fatherHeight, setFatherHeight] = useState('175');
  const [motherHeight, setMotherHeight] = useState('162');
  const [childGender, setChildGender] = useState<'male' | 'female'>('male');

  const [result, setResult] = useState<{
    midParentalHeight: number;
    predictedHeight: number;
    rangeMin: number;
    rangeMax: number;
  } | null>(null);

  const calculate = () => {
    const fh = parseFloat(fatherHeight) || 0;
    const mh = parseFloat(motherHeight) || 0;

    // Mid-parental height method (Tanner 공식)
    // 남아: (아버지키 + 어머니키 + 13) / 2
    // 여아: (아버지키 + 어머니키 - 13) / 2
    const midParentalHeight = childGender === 'male'
      ? (fh + mh + 13) / 2
      : (fh + mh - 13) / 2;

    // ±8.5cm (2SD = 95% 신뢰구간)
    const rangeMin = midParentalHeight - 8.5;
    const rangeMax = midParentalHeight + 8.5;

    setResult({
      midParentalHeight,
      predictedHeight: midParentalHeight,
      rangeMin,
      rangeMax,
    });
  };

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-bold text-gray-900">자녀 예상 키 계산기</h3>
      <p className="mb-4 text-xs text-gray-500">
        태너(Tanner) 중간 부모 신장 공식 기반 — 유전적 잠재 키를 추정합니다.
      </p>

      <div className="mb-4 flex gap-3">
        {(['male', 'female'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setChildGender(g)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              childGender === g
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {g === 'male' ? '남아' : '여아'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '아버지 키 (cm)', value: fatherHeight, setter: setFatherHeight },
          { label: '어머니 키 (cm)', value: motherHeight, setter: setMotherHeight },
        ].map(({ label, value, setter }) => (
          <div key={label}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <button
        onClick={calculate}
        className="mt-5 w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
      >
        예상 키 계산하기
      </button>

      {result && (
        <div className="mt-6 rounded-xl bg-teal-50 p-5">
          <p className="mb-2 text-center text-3xl font-bold text-teal-700">
            약 {fmt(result.predictedHeight)} cm
          </p>
          <p className="text-center text-sm text-gray-600">
            범위: {fmt(result.rangeMin)} ~ {fmt(result.rangeMax)} cm (95% 신뢰구간)
          </p>
          <p className="mt-3 text-xs text-gray-400 text-center">
            * 유전적 잠재 키 추정값입니다. 실제 키는 영양·운동·수면·건강 상태에 따라 달라집니다.
          </p>
        </div>
      )}
    </div>
  );
}
