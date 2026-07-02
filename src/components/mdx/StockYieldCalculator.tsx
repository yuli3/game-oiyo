'use client';

import { useState } from 'react';

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

function fmtPct(n: number): string {
  return n.toFixed(2);
}

export default function StockYieldCalculator() {
  const [buyPrice, setBuyPrice] = useState('50000');
  const [sellPrice, setSellPrice] = useState('65000');
  const [quantity, setQuantity] = useState('100');
  const [dividend, setDividend] = useState('1000');
  const [buyFeeRate, setBuyFeeRate] = useState('0.015');
  const [sellFeeRate, setSellFeeRate] = useState('0.015');
  const [taxRate, setTaxRate] = useState('0.22');

  const [result, setResult] = useState<{
    buyTotal: number;
    sellTotal: number;
    dividendTotal: number;
    capitalGain: number;
    buyFee: number;
    sellFee: number;
    tax: number;
    netProfit: number;
    netYield: number;
    totalYield: number;
  } | null>(null);

  const calculate = () => {
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    const qty = parseFloat(quantity) || 0;
    const div = parseFloat(dividend) || 0;
    const buyFeeR = parseFloat(buyFeeRate) / 100;
    const sellFeeR = parseFloat(sellFeeRate) / 100;
    const taxR = parseFloat(taxRate) / 100;

    const buyTotal = buy * qty;
    const sellTotal = sell * qty;
    const dividendTotal = div * qty;
    const capitalGain = sellTotal - buyTotal;
    const buyFee = buyTotal * buyFeeR;
    const sellFee = sellTotal * sellFeeR;
    // 양도세: 국내주식은 대주주 기준 제외 시 비과세이나, 해외/소액주주 예외 케이스 포함 시 세율 입력
    const tax = Math.max(0, capitalGain) * taxR;
    const netProfit = capitalGain + dividendTotal - buyFee - sellFee - tax;
    const netYield = buyTotal > 0 ? (netProfit / buyTotal) * 100 : 0;
    const totalYield = buyTotal > 0 ? ((sellTotal + dividendTotal - buyTotal) / buyTotal) * 100 : 0;

    setResult({ buyTotal, sellTotal, dividendTotal, capitalGain, buyFee, sellFee, tax, netProfit, netYield, totalYield });
  };

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-bold text-gray-900">주식 수익률 계산기</h3>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: '매수가 (원/주)', value: buyPrice, setter: setBuyPrice },
          { label: '매도가 (원/주)', value: sellPrice, setter: setSellPrice },
          { label: '수량 (주)', value: quantity, setter: setQuantity },
          { label: '주당 배당금 (원)', value: dividend, setter: setDividend },
          { label: '매수 수수료율 (%)', value: buyFeeRate, setter: setBuyFeeRate },
          { label: '매도 수수료율 (%)', value: sellFeeRate, setter: setSellFeeRate },
          { label: '양도세율 (%, 0이면 비과세)', value: taxRate, setter: setTaxRate },
        ].map(({ label, value, setter }) => (
          <div key={label}>
            <label className="mb-1 block text-xs text-gray-600">{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>

      <button
        onClick={calculate}
        className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        수익률 계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: '매수 총액', value: `${fmt(result.buyTotal)}원`, color: 'text-gray-700' },
              { label: '매도 총액', value: `${fmt(result.sellTotal)}원`, color: 'text-gray-700' },
              { label: '배당 수익', value: `${fmt(result.dividendTotal)}원`, color: 'text-blue-600' },
              { label: '매매 차익', value: `${result.capitalGain >= 0 ? '+' : ''}${fmt(result.capitalGain)}원`, color: result.capitalGain >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: '수수료 합계', value: `-${fmt(result.buyFee + result.sellFee)}원`, color: 'text-orange-500' },
              { label: '양도세', value: `-${fmt(result.tax)}원`, color: 'text-red-500' },
              { label: '순 손익', value: `${result.netProfit >= 0 ? '+' : ''}${fmt(result.netProfit)}원`, color: result.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
              { label: '순 수익률', value: `${result.netYield >= 0 ? '+' : ''}${fmtPct(result.netYield)}%`, color: result.netYield >= 0 ? 'text-emerald-700' : 'text-red-700' },
              { label: '총 수익률 (세전)', value: `${result.totalYield >= 0 ? '+' : ''}${fmtPct(result.totalYield)}%`, color: 'text-indigo-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            * 국내 주식은 소액 주주의 경우 양도세 0% 적용 가능. 해외 주식은 22% (양도소득세 20% + 지방세 2%) 기본 적용.
          </p>
        </div>
      )}
    </div>
  );
}
