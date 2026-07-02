'use client';

import React, { useState } from 'react';

// 이자소득세 15.4% (소득세 14% + 지방세 1.4%)
const INTEREST_TAX_RATE = 0.154;

interface Product {
  id: string;
  name: string;
  nameEn: string;
  rate: number;
  taxExempt: boolean;
  type: 'monthly' | 'lump';
  note: string;
  noteEn: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'deposit', name: '정기예금', nameEn: 'Fixed Deposit', rate: 3.5, taxExempt: false, type: 'lump', note: '원금 일시예치', noteEn: 'Lump-sum deposit' },
  { id: 'installment', name: '정기적금', nameEn: 'Installment Savings', rate: 4.0, taxExempt: false, type: 'monthly', note: '매월 적립', noteEn: 'Monthly savings' },
  { id: 'isa', name: 'ISA (비과세 한도 내)', nameEn: 'ISA (tax-exempt portion)', rate: 4.5, taxExempt: true, type: 'monthly', note: '연 2,000만원 한도, 3년 의무 유지', noteEn: 'Up to ₩20M/yr, 3yr lock-in' },
  { id: 'parking', name: '파킹통장', nameEn: 'High-yield Savings', rate: 2.5, taxExempt: false, type: 'monthly', note: '수시 입출금 가능', noteEn: 'Flexible in/out' },
];

interface ProductResult {
  id: string;
  name: string;
  nameEn: string;
  principal: number;
  grossInterest: number;
  taxAmount: number;
  netInterest: number;
  netTotal: number;
  rank: number;
}

const SavingsComparisonCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [monthlySavings, setMonthlySavings] = useState<string>('500000');
  const [termYears, setTermYears] = useState<string>('3');
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

  const updateRate = (id: string, rate: number) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, rate } : p)));
  };

  const calculate = () => {
    setError('');
    const monthly = Number(monthlySavings);
    const years = Number(termYears);
    const n = years * 12;

    if (monthly <= 0 || years <= 0) {
      setError(locale === 'ko' ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    const computed = products.map((product) => {
      const r = product.rate / 100;
      let grossInterest = 0;
      let principal = 0;

      if (product.type === 'monthly') {
        // 적금·ISA·파킹 — 매월 적립
        const mr = r / 12;
        principal = monthly * n;
        const fv = mr === 0 ? principal : monthly * (Math.pow(1 + mr, n) - 1) / mr;
        grossInterest = fv - principal;
      } else {
        // 정기예금 — 원금 일시예치 (총 원금을 한 번에 넣는다고 가정)
        principal = monthly * n;
        grossInterest = principal * r * years;
      }

      const taxAmount = product.taxExempt ? 0 : grossInterest * INTEREST_TAX_RATE;
      const netInterest = grossInterest - taxAmount;
      const netTotal = principal + netInterest;

      return {
        id: product.id,
        name: product.name,
        nameEn: product.nameEn,
        principal: Math.floor(principal),
        grossInterest: Math.floor(grossInterest),
        taxAmount: Math.floor(taxAmount),
        netInterest: Math.floor(netInterest),
        netTotal: Math.floor(netTotal),
        rank: 0,
      };
    });

    // 순위 부여
    const sorted = [...computed].sort((a, b) => b.netTotal - a.netTotal);
    sorted.forEach((item, index) => {
      const found = computed.find((c) => c.id === item.id);
      if (found) found.rank = index + 1;
    });

    setResults(computed);
  };

  const reset = () => {
    setMonthlySavings('500000');
    setTermYears('3');
    setProducts(DEFAULT_PRODUCTS);
    setResults([]);
    setError('');
  };

  const bestResult = results.length > 0 ? [...results].sort((a, b) => b.netTotal - a.netTotal)[0] : null;

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-6">
        {locale === 'ko' ? '저축 상품 비교 계산기' : 'Savings Product Comparison'}
      </h3>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? '월 저축액 (원)' : 'Monthly Savings (KRW)'}
              </label>
              <input
                type="number"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
                min="0"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '월 저축액' : 'Monthly Savings'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? '기간 (년)' : 'Term (years)'}
              </label>
              <select
                value={termYears}
                onChange={(e) => setTermYears(e.target.value)}
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '기간' : 'Term'}
              >
                {[1, 2, 3, 5, 7, 10].map((y) => (
                  <option key={y} value={y}>{y}{locale === 'ko' ? '년' : ' years'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '상품별 금리 설정 (%)' : 'Product Rates (%)'}
            </p>
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">{locale === 'ko' ? product.name : product.nameEn}</p>
                  <p className="text-xs text-slate-400">{locale === 'ko' ? product.note : product.noteEn}</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={product.rate}
                    onChange={(e) => updateRate(product.id, Number(e.target.value))}
                    step="0.1"
                    min="0"
                    max="20"
                    className="w-20 p-2 bg-white border border-emerald-200 rounded-xl text-center text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                    aria-label={`${locale === 'ko' ? product.name : product.nameEn} 금리`}
                  />
                  <span className="text-sm text-emerald-600 font-bold">%</span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
              aria-label={locale === 'ko' ? '비교하기' : 'Compare'}
            >
              {locale === 'ko' ? '비교하기' : 'Compare'}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl transition-colors"
              aria-label={locale === 'ko' ? '초기화' : 'Reset'}
            >
              {locale === 'ko' ? '초기화' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {results.length > 0 ? (
            <>
              {bestResult && (
                <div className="p-5 bg-emerald-600 text-white rounded-2xl text-center">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                    {locale === 'ko' ? '최우수 상품 추천' : 'Best Product'}
                  </p>
                  <p className="text-2xl font-bold">{locale === 'ko' ? bestResult.name : bestResult.nameEn}</p>
                  <p className="text-3xl font-bold mt-1">{fmt(bestResult.netTotal)}원</p>
                </div>
              )}

              <div className="space-y-3">
                {[...results]
                  .sort((a, b) => b.netTotal - a.netTotal)
                  .map((r) => (
                    <div
                      key={r.id}
                      className={`p-4 rounded-2xl border text-sm ${
                        r.rank === 1
                          ? 'bg-white border-emerald-400 shadow-md'
                          : 'bg-white border-emerald-100'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                              r.rank === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600'
                            }`}
                            aria-label={`순위 ${r.rank}`}
                          >
                            {r.rank}
                          </span>
                          <span className="font-bold text-slate-800">{locale === 'ko' ? r.name : r.nameEn}</span>
                        </div>
                        <span className="font-bold text-emerald-700">{fmt(r.netTotal)}원</span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span>{locale === 'ko' ? '세전이자' : 'Gross Interest'}: {fmt(r.grossInterest)}원</span>
                        <span>{locale === 'ko' ? '세금' : 'Tax'}: -{fmt(r.taxAmount)}원</span>
                        <span>{locale === 'ko' ? '세후이자' : 'Net Interest'}: {fmt(r.netInterest)}원</span>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-emerald-200">
              <span className="text-4xl mb-2" aria-hidden="true">📊</span>
              <p className="text-sm font-bold text-emerald-300">
                {locale === 'ko' ? '정보를 입력하고 비교해보세요' : 'Enter details and compare'}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * 이자소득세 15.4% 적용 기준. ISA는 비과세 한도(200만~400만원) 이내 가정. 실제 금리는 시장 상황에 따라 변동됩니다.
      </p>
    </div>
  );
};

export default SavingsComparisonCalculator;
