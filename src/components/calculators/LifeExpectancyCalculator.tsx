'use client';

import React, { useState, useMemo } from 'react';

// 통계청 2023 생명표 기준 기대여명 (현재 나이별 추가 기대여명)
// 출처: 통계청, 2023년 생명표
const LIFE_TABLE_KR: Record<number, { male: number; female: number }> = {
  0: { male: 79.9, female: 85.6 },
  10: { male: 70.3, female: 75.9 },
  20: { male: 60.5, female: 66.1 },
  30: { male: 50.8, female: 56.3 },
  40: { male: 41.2, female: 46.6 },
  50: { male: 31.9, female: 37.1 },
  60: { male: 23.1, female: 27.8 },
  65: { male: 19.3, female: 23.5 },
  70: { male: 15.6, female: 19.3 },
  75: { male: 12.3, female: 15.3 },
  80: { male: 9.4, female: 11.7 },
  85: { male: 7.0, female: 8.6 },
};

// 요인별 조정값 (년)
const ADJUSTMENTS: Record<string, number> = {
  smoking_yes: -7,
  smoking_no: 0,
  drinking_heavy: -5,
  drinking_moderate: -1,
  drinking_light: 0,
  drinking_none: 1,
  exercise_regular: 3,
  exercise_sometimes: 0,
  exercise_none: -2,
  bmi_normal: 0,
  bmi_overweight: -1,
  bmi_obese: -3,
  bmi_underweight: -2,
  chronic_yes: -5,
  chronic_no: 0,
};

interface LEResult {
  baseLifeExpectancy: number;
  adjustedLifeExpectancy: number;
  healthyLifeExpectancy: number;
  remainingYears: number;
  retirementYears: number;
  totalAdjustment: number;
}

const LifeExpectancyCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [currentAge, setCurrentAge] = useState<string>('35');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [smoking, setSmoking] = useState<'yes' | 'no'>('no');
  const [drinking, setDrinking] = useState<'none' | 'light' | 'moderate' | 'heavy'>('light');
  const [exercise, setExercise] = useState<'regular' | 'sometimes' | 'none'>('sometimes');
  const [bmi, setBmi] = useState<'underweight' | 'normal' | 'overweight' | 'obese'>('normal');
  const [chronic, setChronic] = useState<'yes' | 'no'>('no');

  const result = useMemo<LEResult | null>(() => {
    const age = Number(currentAge);
    if (isNaN(age) || age < 0 || age > 90) return null;

    // 가장 가까운 나이 기준 보간
    const keys = Object.keys(LIFE_TABLE_KR).map(Number).sort((a, b) => a - b);
    let lowerKey = keys[0];
    let upperKey = keys[keys.length - 1];

    for (const k of keys) {
      if (k <= age) lowerKey = k;
      if (k >= age) { upperKey = k; break; }
    }

    let remaining: number;
    if (lowerKey === upperKey) {
      remaining = LIFE_TABLE_KR[lowerKey][gender];
    } else {
      const ratio = (age - lowerKey) / (upperKey - lowerKey);
      const lv = LIFE_TABLE_KR[lowerKey][gender];
      const uv = LIFE_TABLE_KR[upperKey][gender];
      remaining = lv + (uv - lv) * ratio;
    }

    const baseLifeExpectancy = age + remaining;

    // 조정 계산
    const totalAdjustment =
      ADJUSTMENTS[`smoking_${smoking}`] +
      ADJUSTMENTS[`drinking_${drinking}`] +
      ADJUSTMENTS[`exercise_${exercise}`] +
      ADJUSTMENTS[`bmi_${bmi}`] +
      ADJUSTMENTS[`chronic_${chronic}`];

    const adjustedLifeExpectancy = Math.max(age + 1, baseLifeExpectancy + totalAdjustment);
    const healthyLifeExpectancy = adjustedLifeExpectancy * 0.88; // 건강수명은 약 88% 수준
    const remainingYears = adjustedLifeExpectancy - age;
    const retirementAge = 65;
    const retirementYears = Math.max(0, adjustedLifeExpectancy - retirementAge);

    return {
      baseLifeExpectancy: Math.round(baseLifeExpectancy * 10) / 10,
      adjustedLifeExpectancy: Math.round(adjustedLifeExpectancy * 10) / 10,
      healthyLifeExpectancy: Math.round(healthyLifeExpectancy * 10) / 10,
      remainingYears: Math.round(remainingYears * 10) / 10,
      retirementYears: Math.round(retirementYears * 10) / 10,
      totalAdjustment,
    };
  }, [currentAge, gender, smoking, drinking, exercise, bmi, chronic]);

  const lifeProgress = result ? Math.min(100, (Number(currentAge) / result.adjustedLifeExpectancy) * 100) : 0;

  const RadioGroup = ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
  }) => (
    <fieldset>
      <legend className="text-sm font-bold text-emerald-800 mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`cursor-pointer px-3 py-1.5 rounded-xl text-sm font-bold border transition-colors ${
              value === opt.value
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <input
              type="radio"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-2">
        {locale === 'ko' ? '기대수명 계산기' : 'Life Expectancy Calculator'}
      </h3>
      <p className="text-sm text-emerald-600 mb-6">
        {locale === 'ko' ? '통계청 2023 생명표 기준 (남 79.9세, 여 85.6세)' : 'Based on 2023 KOSTAT Life Tables (M: 79.9, F: 85.6)'}
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '현재 나이' : 'Current Age'}
            </label>
            <input
              type="number"
              value={currentAge}
              onChange={(e) => setCurrentAge(e.target.value)}
              min="0"
              max="90"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '현재 나이' : 'Current Age'}
            />
          </div>

          <RadioGroup
            label={locale === 'ko' ? '성별' : 'Gender'}
            options={[
              { value: 'male', label: locale === 'ko' ? '남성' : 'Male' },
              { value: 'female', label: locale === 'ko' ? '여성' : 'Female' },
            ]}
            value={gender}
            onChange={(v) => setGender(v as 'male' | 'female')}
          />

          <RadioGroup
            label={locale === 'ko' ? '흡연 여부' : 'Smoking'}
            options={[
              { value: 'no', label: locale === 'ko' ? '비흡연' : 'Non-smoker' },
              { value: 'yes', label: locale === 'ko' ? '흡연' : 'Smoker' },
            ]}
            value={smoking}
            onChange={(v) => setSmoking(v as 'yes' | 'no')}
          />

          <RadioGroup
            label={locale === 'ko' ? '음주 빈도' : 'Drinking'}
            options={[
              { value: 'none', label: locale === 'ko' ? '안 마심' : 'None' },
              { value: 'light', label: locale === 'ko' ? '가볍게' : 'Light' },
              { value: 'moderate', label: locale === 'ko' ? '주 2~3회' : 'Moderate' },
              { value: 'heavy', label: locale === 'ko' ? '매일/폭음' : 'Heavy' },
            ]}
            value={drinking}
            onChange={(v) => setDrinking(v as 'none' | 'light' | 'moderate' | 'heavy')}
          />

          <RadioGroup
            label={locale === 'ko' ? '운동 빈도' : 'Exercise'}
            options={[
              { value: 'regular', label: locale === 'ko' ? '주 3회+' : 'Regular' },
              { value: 'sometimes', label: locale === 'ko' ? '가끔' : 'Sometimes' },
              { value: 'none', label: locale === 'ko' ? '안 함' : 'None' },
            ]}
            value={exercise}
            onChange={(v) => setExercise(v as 'regular' | 'sometimes' | 'none')}
          />

          <RadioGroup
            label={locale === 'ko' ? 'BMI 범위' : 'BMI Range'}
            options={[
              { value: 'underweight', label: locale === 'ko' ? '저체중(-18.5)' : 'Underweight' },
              { value: 'normal', label: locale === 'ko' ? '정상(18.5~25)' : 'Normal' },
              { value: 'overweight', label: locale === 'ko' ? '과체중(25~30)' : 'Overweight' },
              { value: 'obese', label: locale === 'ko' ? '비만(30+)' : 'Obese' },
            ]}
            value={bmi}
            onChange={(v) => setBmi(v as 'underweight' | 'normal' | 'overweight' | 'obese')}
          />

          <RadioGroup
            label={locale === 'ko' ? '만성질환 여부' : 'Chronic Disease'}
            options={[
              { value: 'no', label: locale === 'ko' ? '없음' : 'None' },
              { value: 'yes', label: locale === 'ko' ? '있음 (당뇨·고혈압·심장병 등)' : 'Yes (diabetes, hypertension, etc.)' },
            ]}
            value={chronic}
            onChange={(v) => setChronic(v as 'yes' | 'no')}
          />
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="p-6 bg-emerald-600 text-white rounded-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                  {locale === 'ko' ? '예상 기대수명' : 'Expected Lifespan'}
                </p>
                <p className="text-5xl font-bold">{result.adjustedLifeExpectancy}세</p>
                {result.totalAdjustment !== 0 && (
                  <p className="text-sm opacity-80 mt-1">
                    {locale === 'ko' ? `통계 기준 ${result.baseLifeExpectancy}세에서 ` : `From ${result.baseLifeExpectancy} (base) `}
                    <span className={result.totalAdjustment > 0 ? 'text-green-300' : 'text-red-300'}>
                      {result.totalAdjustment > 0 ? '+' : ''}{result.totalAdjustment}년 조정
                    </span>
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>{locale === 'ko' ? '현재' : 'Now'}: {currentAge}세</span>
                  <span>{locale === 'ko' ? '예상 수명' : 'Lifespan'}: {result.adjustedLifeExpectancy}세</span>
                </div>
                <div
                  className="h-4 bg-emerald-100 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={lifeProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={locale === 'ko' ? '수명 진행도' : 'Life progress'}
                >
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                    style={{ width: `${lifeProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 text-center">
                  {locale === 'ko' ? `남은 시간: 약 ${result.remainingYears}년` : `Remaining: ~${result.remainingYears} years`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">
                    {locale === 'ko' ? '건강수명' : 'Healthy Lifespan'}
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">{result.healthyLifeExpectancy}세</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">
                    {locale === 'ko' ? '65세 이후 노후 기간' : 'Post-65 Retirement Years'}
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">{result.retirementYears}년</p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800">
                <p className="font-bold mb-1">{locale === 'ko' ? '생활 개선 시 연장 가능 수명' : 'Potential Life Extension'}</p>
                <div className="space-y-1 text-xs text-slate-600">
                  {smoking === 'yes' && <p>• {locale === 'ko' ? '금연 시 최대 +7년' : 'Quitting smoking: up to +7 years'}</p>}
                  {exercise === 'none' && <p>• {locale === 'ko' ? '규칙적 운동 시 최대 +5년' : 'Regular exercise: up to +5 years'}</p>}
                  {drinking === 'heavy' && <p>• {locale === 'ko' ? '음주량 감소 시 최대 +5년' : 'Reducing alcohol: up to +5 years'}</p>}
                  {bmi === 'obese' && <p>• {locale === 'ko' ? '정상 체중 유지 시 최대 +3년' : 'Normal BMI: up to +3 years'}</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-emerald-200">
              <span className="text-4xl mb-2" aria-hidden="true">⏳</span>
              <p className="text-sm font-bold text-emerald-300">
                {locale === 'ko' ? '나이와 건강 상태를 입력하세요' : 'Enter your age and health info'}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * 통계청 2023 생명표 기준. 건강 위험인자 조정값은 학술 연구 기반 추정치이며 의학적 진단을 대체하지 않습니다.
      </p>
    </div>
  );
};

export default LifeExpectancyCalculator;
