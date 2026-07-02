'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import Copy from 'lucide-react/dist/esm/icons/copy'
import Check from 'lucide-react/dist/esm/icons/check'
import Search from 'lucide-react/dist/esm/icons/search'
import Plus from 'lucide-react/dist/esm/icons/plus'
import X from 'lucide-react/dist/esm/icons/x'
import Percent from 'lucide-react/dist/esm/icons/percent';

// ─────────────────────────────────────────────
// LEGAL INTEREST CALCULATOR
// ─────────────────────────────────────────────

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}
function fmtKRW(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

const RATE_TYPES = [
  { id: 'civil',      ko: '민사 법정이율', en: 'Civil',      ja: '民事法定利率',      rate: 5  },
  { id: 'commercial', ko: '상사 법정이율', en: 'Commercial', ja: '商事法定利率',      rate: 6  },
  { id: 'special',    ko: '소송촉진 특례', en: 'Special',    ja: '訴訟促進特例',     rate: 12 },
  { id: 'custom',     ko: '직접 입력',    en: 'Custom',     ja: 'カスタム',          rate: 0  },
];

export function LegalInterestCalc({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const L = locale;
  const today = new Date();
  const [principal, setPrincipal] = useState(10000000);
  const [startDate, setStartDate] = useState(toInputDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [rateId, setRateId] = useState('special');
  const [customRate, setCustomRate] = useState(12);
  const [result, setResult] = useState({ days: 0, interest: 0, total: 0, rate: 12 });
  const [copied, setCopied] = useState(false);

  const getRate = useCallback(() => {
    const found = RATE_TYPES.find(r => r.id === rateId);
    return rateId === 'custom' ? customRate : (found?.rate ?? 12);
  }, [rateId, customRate]);

  useEffect(() => {
    const s = new Date(startDate), e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) { setResult({ days: 0, interest: 0, total: principal, rate: getRate() }); return; }
    const days = daysBetween(s, e);
    const rate = getRate();
    const interest = Math.floor(principal * (rate / 100) * (days / 365));
    setResult({ days, interest, total: principal + interest, rate });
  }, [principal, startDate, endDate, getRate]);

  const copyText = `${L === 'ko' ? '원금' : 'Principal'}: ${fmtKRW(principal)}\n${L === 'ko' ? '기간' : 'Period'}: ${result.days}${L === 'ko' ? '일' : ' days'}\n${L === 'ko' ? '이율' : 'Rate'}: ${result.rate}%\n${L === 'ko' ? '이자' : 'Interest'}: ${fmtKRW(result.interest)}\n${L === 'ko' ? '합계' : 'Total'}: ${fmtKRW(result.total)}`;

  const copy = {
    ko: { title: '법정 이자 계산기', principal: '원금 (원)', start: '시작일', end: '종료일', rateLabel: '이율 종류', days: '일수', interest: '이자', total: '원리금 합계', calcNote: '단리 계산 · 연 365일 기준' },
    en: { title: 'Legal Interest Calculator', principal: 'Principal (KRW)', start: 'Start Date', end: 'End Date', rateLabel: 'Rate Type', days: 'Days', interest: 'Interest', total: 'Total (Principal + Interest)', calcNote: 'Simple interest · 365-day year' },
    ja: { title: '法定利息計算機', principal: '元金（ウォン）', start: '開始日', end: '終了日', rateLabel: '利率種別', days: '日数', interest: '利息', total: '元利合計', calcNote: '単利計算・365日基準' },
  }[L];

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">{copy.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{copy.calcNote}</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 transition-colors">
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? (L === 'ko' ? '복사됨' : 'Copied') : (L === 'ko' ? '결과 복사' : 'Copy')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-600">{copy.principal}</label>
            <input type="number" min={0} value={principal || ''} onChange={e => setPrincipal(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-semibold focus:border-blue-400 outline-none transition-colors" />
            <p className="text-xs text-slate-400">{fmtKRW(principal)}</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-600">{copy.start}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={endDate}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-semibold focus:border-blue-400 outline-none transition-colors" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-600">{copy.end}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-semibold focus:border-blue-400 outline-none transition-colors" />
            </div>
          </div>
        </div>

        {/* Rate selector */}
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-600">{copy.rateLabel}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RATE_TYPES.map(r => (
              <button key={r.id} onClick={() => setRateId(r.id)}
                className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-colors text-left ${rateId === r.id ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <span className="block">{r[L]}</span>
                {r.rate > 0 && <span className="text-xs font-normal opacity-70">{r.rate}%</span>}
              </button>
            ))}
          </div>
          {rateId === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input type="number" min={0} max={99} step={0.1} value={customRate}
                onChange={e => setCustomRate(parseFloat(e.target.value) || 0)}
                className="w-32 border-2 border-slate-200 rounded-xl px-3 py-2 font-semibold focus:border-blue-400 outline-none" />
              <Percent className="w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>

        {/* Result */}
        <div className="space-y-2">
          {[
            { label: copy.days, value: `${result.days.toLocaleString()}일` },
            { label: `${copy.rateLabel}: ${result.rate}%`, value: '' },
            { label: copy.interest, value: fmtKRW(result.interest), highlight: true },
            { label: copy.total, value: fmtKRW(result.total), highlight: true },
          ].map(({ label, value, highlight }) => value !== '' && (
            <div key={label} className={`flex justify-between items-center px-4 py-3 rounded-xl border ${highlight ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
              <span className="text-sm font-semibold text-slate-600">{label}</span>
              <span className={`font-black text-base ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// NUTRITION CALCULATOR (built-in data)
// ─────────────────────────────────────────────

interface FoodItem {
  name: { ko: string; en: string; ja: string };
  per100g: { kcal: number; protein: number; fat: number; carb: number; fiber: number; sodium: number };
  emoji: string;
  category: string;
}

const FOODS: FoodItem[] = [
  { emoji: '🍚', category: 'grain', name: { ko: '백미밥', en: 'White Rice', ja: '白米ご飯' }, per100g: { kcal: 168, protein: 2.8, fat: 0.3, carb: 36.8, fiber: 0.3, sodium: 1 } },
  { emoji: '🍞', category: 'grain', name: { ko: '식빵', en: 'White Bread', ja: '食パン' }, per100g: { kcal: 264, protein: 9.3, fat: 3.5, carb: 48.5, fiber: 2.3, sodium: 491 } },
  { emoji: '🍗', category: 'protein', name: { ko: '닭가슴살', en: 'Chicken Breast', ja: '鶏むね肉' }, per100g: { kcal: 109, protein: 23.1, fat: 1.2, carb: 0, fiber: 0, sodium: 56 } },
  { emoji: '🥚', category: 'protein', name: { ko: '달걀', en: 'Egg', ja: '卵' }, per100g: { kcal: 155, protein: 12.6, fat: 10.6, carb: 1.1, fiber: 0, sodium: 124 } },
  { emoji: '🐟', category: 'protein', name: { ko: '연어', en: 'Salmon', ja: 'サーモン' }, per100g: { kcal: 208, protein: 20.0, fat: 13.0, carb: 0, fiber: 0, sodium: 59 } },
  { emoji: '🥩', category: 'protein', name: { ko: '소고기(등심)', en: 'Beef Sirloin', ja: '牛サーロイン' }, per100g: { kcal: 247, protein: 18.0, fat: 19.2, carb: 0.2, fiber: 0, sodium: 57 } },
  { emoji: '🥦', category: 'veggie', name: { ko: '브로콜리', en: 'Broccoli', ja: 'ブロッコリー' }, per100g: { kcal: 34, protein: 2.8, fat: 0.4, carb: 6.6, fiber: 2.6, sodium: 33 } },
  { emoji: '🍎', category: 'fruit', name: { ko: '사과', en: 'Apple', ja: 'りんご' }, per100g: { kcal: 52, protein: 0.3, fat: 0.2, carb: 13.8, fiber: 2.4, sodium: 1 } },
  { emoji: '🍌', category: 'fruit', name: { ko: '바나나', en: 'Banana', ja: 'バナナ' }, per100g: { kcal: 89, protein: 1.1, fat: 0.3, carb: 22.8, fiber: 2.6, sodium: 1 } },
  { emoji: '🥛', category: 'dairy', name: { ko: '우유', en: 'Milk', ja: '牛乳' }, per100g: { kcal: 61, protein: 3.2, fat: 3.3, carb: 4.8, fiber: 0, sodium: 44 } },
  { emoji: '🧀', category: 'dairy', name: { ko: '치즈(체다)', en: 'Cheddar Cheese', ja: 'チェダーチーズ' }, per100g: { kcal: 402, protein: 24.9, fat: 33.1, carb: 1.3, fiber: 0, sodium: 621 } },
  { emoji: '🥜', category: 'other', name: { ko: '아몬드', en: 'Almond', ja: 'アーモンド' }, per100g: { kcal: 579, protein: 21.2, fat: 49.9, carb: 21.6, fiber: 12.5, sodium: 1 } },
  { emoji: '🌽', category: 'veggie', name: { ko: '옥수수', en: 'Corn', ja: 'とうもろこし' }, per100g: { kcal: 86, protein: 3.3, fat: 1.4, carb: 18.7, fiber: 2.0, sodium: 15 } },
  { emoji: '🍠', category: 'veggie', name: { ko: '고구마', en: 'Sweet Potato', ja: 'さつまいも' }, per100g: { kcal: 86, protein: 1.6, fat: 0.1, carb: 20.1, fiber: 3.0, sodium: 55 } },
  { emoji: '🥑', category: 'fruit', name: { ko: '아보카도', en: 'Avocado', ja: 'アボカド' }, per100g: { kcal: 160, protein: 2.0, fat: 14.7, carb: 8.5, fiber: 6.7, sodium: 7 } },
  { emoji: '🍜', category: 'grain', name: { ko: '라면(건면)', en: 'Ramen Noodle', ja: 'ラーメン(乾麺)' }, per100g: { kcal: 432, protein: 9.1, fat: 13.6, carb: 68.6, fiber: 3.0, sodium: 1160 } },
  { emoji: '🐄', category: 'protein', name: { ko: '두부', en: 'Tofu', ja: '豆腐' }, per100g: { kcal: 76, protein: 8.1, fat: 4.2, carb: 1.9, fiber: 0.3, sodium: 7 } },
  { emoji: '🧄', category: 'veggie', name: { ko: '시금치', en: 'Spinach', ja: 'ほうれん草' }, per100g: { kcal: 23, protein: 2.9, fat: 0.4, carb: 3.6, fiber: 2.2, sodium: 79 } },
  { emoji: '🍫', category: 'other', name: { ko: '다크초콜릿(70%)', en: 'Dark Chocolate 70%', ja: 'ダークチョコ70%' }, per100g: { kcal: 598, protein: 8.0, fat: 42.6, carb: 45.9, fiber: 10.9, sodium: 20 } },
  { emoji: '🍊', category: 'fruit', name: { ko: '오렌지', en: 'Orange', ja: 'オレンジ' }, per100g: { kcal: 47, protein: 0.9, fat: 0.1, carb: 11.8, fiber: 2.4, sodium: 0 } },
];

interface SelectedFood { food: FoodItem; grams: number; }

export function NutritionCalculator({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const L = locale;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SelectedFood[]>([]);

  const filtered = FOODS.filter(f =>
    f.name[L].toLowerCase().includes(query.toLowerCase()) ||
    f.name.ko.includes(query) ||
    f.name.en.toLowerCase().includes(query.toLowerCase())
  );

  const totals = selected.reduce((acc, { food, grams }) => {
    const ratio = grams / 100;
    return {
      kcal: acc.kcal + food.per100g.kcal * ratio,
      protein: acc.protein + food.per100g.protein * ratio,
      fat: acc.fat + food.per100g.fat * ratio,
      carb: acc.carb + food.per100g.carb * ratio,
      fiber: acc.fiber + food.per100g.fiber * ratio,
      sodium: acc.sodium + food.per100g.sodium * ratio,
    };
  }, { kcal: 0, protein: 0, fat: 0, carb: 0, fiber: 0, sodium: 0 });

  const addFood = (food: FoodItem) => {
    if (selected.find(s => s.food.name.ko === food.name.ko)) return;
    setSelected(prev => [...prev, { food, grams: 100 }]);
    setQuery('');
  };

  const updateGrams = (idx: number, g: number) => {
    setSelected(prev => prev.map((s, i) => i === idx ? { ...s, grams: Math.max(0, g) } : s));
  };

  const remove = (idx: number) => setSelected(prev => prev.filter((_, i) => i !== idx));

  const copy = {
    ko: { title: '영양성분 계산기', placeholder: '음식 검색 (예: 닭가슴살, 밥)', add: '추가', remove: '삭제', empty: '음식을 추가해보세요', total: '합계', kcal: '칼로리', protein: '단백질', fat: '지방', carb: '탄수화물', fiber: '식이섬유', sodium: '나트륨', grams: 'g' },
    en: { title: 'Nutrition Calculator', placeholder: 'Search food (e.g. chicken, rice)', add: 'Add', remove: 'Remove', empty: 'Search and add foods below', total: 'Total', kcal: 'Calories', protein: 'Protein', fat: 'Fat', carb: 'Carbs', fiber: 'Fiber', sodium: 'Sodium', grams: 'g' },
    ja: { title: '栄養素計算機', placeholder: '食品を検索 (例: 鶏むね肉, ご飯)', add: '追加', remove: '削除', empty: '食品を追加してください', total: '合計', kcal: 'カロリー', protein: 'タンパク質', fat: '脂質', carb: '炭水化物', fiber: '食物繊維', sodium: 'ナトリウム', grams: 'g' },
  }[L];

  const bars = [
    { label: copy.protein, val: totals.protein, max: 60, unit: 'g', color: 'bg-sky-400' },
    { label: copy.fat, val: totals.fat, max: 65, unit: 'g', color: 'bg-amber-400' },
    { label: copy.carb, val: totals.carb, max: 300, unit: 'g', color: 'bg-emerald-400' },
    { label: copy.fiber, val: totals.fiber, max: 25, unit: 'g', color: 'bg-teal-400' },
    { label: copy.sodium, val: totals.sodium, max: 2000, unit: 'mg', color: 'bg-rose-400' },
  ];

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-black text-slate-900">{copy.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{L === 'ko' ? '20가지 주요 식품 · 100g 기준 영양성분' : L === 'en' ? '20 common foods · per 100g data' : '主要食品20種・100g当たりデータ'}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={copy.placeholder}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-400 outline-none transition-colors" />
        </div>

        {/* Search results */}
        {query && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 p-3 text-center">{L === 'ko' ? '검색 결과 없음' : 'No results'}</p>
            ) : (
              filtered.slice(0, 8).map(food => (
                <button key={food.name.ko} onClick={() => addFood(food)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white text-left border-b border-slate-100 last:border-0 transition-colors">
                  <span className="text-xl">{food.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{food.name[L]}</p>
                    <p className="text-xs text-slate-400">{food.per100g.kcal}kcal · P{food.per100g.protein}g · F{food.per100g.fat}g · C{food.per100g.carb}g /100g</p>
                  </div>
                  <span className="text-xs text-emerald-600 font-bold">+ {copy.add}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected foods */}
        {selected.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="font-semibold">{copy.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selected.map(({ food, grams }, idx) => (
              <div key={food.name.ko} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xl">{food.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{food.name[L]}</p>
                  <p className="text-xs text-slate-400">{Math.round(food.per100g.kcal * grams / 100)}kcal</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={grams} min={0} max={2000}
                    onChange={e => updateGrams(idx, parseInt(e.target.value) || 0)}
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center focus:border-emerald-400 outline-none" />
                  <span className="text-xs text-slate-400">{copy.grams}</span>
                </div>
                <button onClick={() => remove(idx)} className="p-1 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        {selected.length > 0 && (
          <div className="space-y-3 bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <div className="flex items-end justify-between">
              <p className="font-bold text-slate-700">{copy.total}</p>
              <p className="text-3xl font-black text-emerald-700">{Math.round(totals.kcal)}<span className="text-sm font-bold ml-1">kcal</span></p>
            </div>
            <div className="space-y-2">
              {bars.map(({ label, val, max, unit, color }) => (
                <div key={label} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-600">{label}</span>
                    <span className="font-bold text-slate-800">{Math.round(val * 10) / 10}{unit}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, (val / max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">{L === 'ko' ? '* 한국인 영양섭취기준(KDRIs) 기준 일일 권장량 대비 비율' : '* Bars show % of Korean daily reference intake (KDRIs)'}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
