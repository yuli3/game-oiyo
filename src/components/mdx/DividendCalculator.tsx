'use client';

import { useState } from 'react';

function formatKRW(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

interface YearRow {
  year: number;
  shares: number;
  annualDividend: number;
  tax: number;
  netDividend: number;
  reinvested: number;
  portfolioValue: number;
}

export default function DividendCalculator() {
  const [initialInvestment, setInitialInvestment] = useState('10000000');
  const [stockPrice, setStockPrice] = useState('50000');
  const [annualDividendPerShare, setAnnualDividendPerShare] = useState('1500');
  const [dividendGrowthRate, setDividendGrowthRate] = useState('5');
  const [stockGrowthRate, setStockGrowthRate] = useState('7');
  const [years, setYears] = useState('20');
  const [reinvest, setReinvest] = useState(true);
  const [result, setResult] = useState<YearRow[] | null>(null);

  const calculate = () => {
    const invest = parseFloat(initialInvestment.replace(/,/g, ''));
    const price = parseFloat(stockPrice.replace(/,/g, ''));
    const dps = parseFloat(annualDividendPerShare.replace(/,/g, ''));
    const dgr = parseFloat(dividendGrowthRate) / 100;
    const sgr = parseFloat(stockGrowthRate) / 100;
    const n = parseInt(years);
    const TAX_RATE = 0.154; // 배당소득세 15.4% (소득세 14% + 지방소득세 1.4%)

    if (!invest || !price || !dps || !n) return;

    const rows: YearRow[] = [];
    let shares = invest / price;
    let currentDps = dps;
    let currentPrice = price;

    for (let y = 1; y <= n; y++) {
      currentDps *= 1 + dgr;
      currentPrice *= 1 + sgr;

      const annualDividend = shares * currentDps;
      const tax = annualDividend * TAX_RATE;
      const netDividend = annualDividend - tax;

      let reinvested = 0;
      if (reinvest && netDividend > 0) {
        const newShares = netDividend / currentPrice;
        reinvested = newShares * currentPrice;
        shares += newShares;
      }

      const portfolioValue = shares * currentPrice;
      rows.push({ year: y, shares, annualDividend, tax, netDividend, reinvested, portfolioValue });
    }

    setResult(rows);
  };

  const last = result ? result[result.length - 1] : null;
  const first = result ? result[0] : null;
  const totalDividends = result ? result.reduce((s, r) => s + r.netDividend, 0) : 0;
  const initialValue = parseFloat(initialInvestment.replace(/,/g, '')) || 0;

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">배당 투자 수익 계산기</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            초기 투자금 (원)
          </label>
          <input
            type="number"
            value={initialInvestment}
            onChange={(e) => setInitialInvestment(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            현재 주가 (원/주)
          </label>
          <input
            type="number"
            value={stockPrice}
            onChange={(e) => setStockPrice(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            연간 주당 배당금 (원)
          </label>
          <input
            type="number"
            value={annualDividendPerShare}
            onChange={(e) => setAnnualDividendPerShare(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            배당 성장률 (%/년)
          </label>
          <input
            type="number"
            value={dividendGrowthRate}
            onChange={(e) => setDividendGrowthRate(e.target.value)}
            step="0.5"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            주가 성장률 (%/년)
          </label>
          <input
            type="number"
            value={stockGrowthRate}
            onChange={(e) => setStockGrowthRate(e.target.value)}
            step="0.5"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            투자 기간 (년)
          </label>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="reinvest"
          checked={reinvest}
          onChange={(e) => setReinvest(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="reinvest" className="text-sm text-gray-700">
          배당금 자동 재투자 (DRIP)
        </label>
      </div>

      <button
        onClick={calculate}
        className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        계산하기
      </button>

      {result && last && first && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-xs text-gray-500">최종 포트폴리오 가치</p>
              <p className="text-base font-bold text-emerald-600">{formatKRW(last.portfolioValue)}원</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-xs text-gray-500">연간 배당 ({years}년차)</p>
              <p className="text-base font-bold text-blue-600">{formatKRW(last.netDividend)}원</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-4 text-center">
              <p className="text-xs text-gray-500">누적 세후 배당</p>
              <p className="text-base font-bold text-purple-600">{formatKRW(totalDividends)}원</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4 text-center">
              <p className="text-xs text-gray-500">총 수익률</p>
              <p className="text-base font-bold text-orange-600">
                {(((last.portfolioValue + (reinvest ? 0 : totalDividends)) / initialValue - 1) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['년차', '보유주수', '연 배당(세전)', '세금(15.4%)', '세후 배당', '포트폴리오 가치'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.filter((_, i) => i % Math.max(1, Math.floor(result.length / 10)) === 0 || i === result.length - 1).map((row) => (
                  <tr key={row.year} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">{row.year}년</td>
                    <td className="px-3 py-2 text-gray-600">{row.shares.toFixed(1)}주</td>
                    <td className="px-3 py-2 text-gray-600">{formatKRW(row.annualDividend)}</td>
                    <td className="px-3 py-2 text-red-500">{formatKRW(row.tax)}</td>
                    <td className="px-3 py-2 text-emerald-600">{formatKRW(row.netDividend)}</td>
                    <td className="px-3 py-2 font-semibold text-blue-600">{formatKRW(row.portfolioValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            * 배당소득세 15.4% 적용 (금융소득 2,000만 원 초과 시 종합과세). 주가·배당 성장률은 가정값이며 실제와 다를 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
