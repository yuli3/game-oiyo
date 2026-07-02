import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

const CURRENCIES = [
  "KRW", "USD", "EUR", "JPY", "GBP", "CNY", "TWD", "HKD",
  "CAD", "AUD", "CHF", "SGD", "THB", "MYR", "VND", "PHP",
  "IDR", "INR", "AED", "NZD",
] as const;

type Currency = typeof CURRENCIES[number];

// Static exchange rates relative to KRW (2026-06 기준)
const RATES_TO_KRW: Record<Currency, number> = {
  KRW: 1,
  USD: 1508,
  EUR: 1751,
  JPY: 9.41,
  GBP: 2024,
  CNY: 224,
  TWD: 47.8,
  HKD: 193,
  CAD: 1079,
  AUD: 1067,
  CHF: 1901,
  SGD: 1177,
  THB: 46.4,
  MYR: 371,
  VND: 0.0576,
  PHP: 25,
  IDR: 0.0851,
  INR: 15.95,
  AED: 411,
  NZD: 880,
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  KRW: "₩",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
  CNY: "¥",
  TWD: "NT$",
  HKD: "HK$",
  CAD: "C$",
  AUD: "A$",
  CHF: "Fr",
  SGD: "S$",
  THB: "฿",
  MYR: "RM",
  VND: "₫",
  PHP: "₱",
  IDR: "Rp",
  INR: "₹",
  AED: "AED",
  NZD: "NZ$",
};

function convert(amount: number, from: Currency, to: Currency): number {
  const inKRW = amount * RATES_TO_KRW[from];
  return inKRW / RATES_TO_KRW[to];
}

function formatAmount(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return "—";
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

const PRESETS: [Currency, Currency][] = [
  ["USD", "KRW"],
  ["JPY", "KRW"],
  ["EUR", "KRW"],
];

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    fromLabel: string;
    toLabel: string;
    swapBtn: string;
    presetsLabel: string;
    rateInfo: string;
    dataSource: string;
    result: string;
    rate: string;
  }
> = {
  ko: {
    title: "환율 계산기",
    subtitle: "주요 20개 통화 간 환율 변환",
    fromLabel: "변환할 금액",
    toLabel: "변환 결과",
    swapBtn: "↕ 통화 교체",
    presetsLabel: "자주 찾는 환율",
    rateInfo: "1 {from} = {rate} {to}",
    dataSource: "2026-06 기준 정적 데이터",
    result: "결과",
    rate: "기준 환율",
  },
  en: {
    title: "Currency Converter",
    subtitle: "Convert between 20 major currencies",
    fromLabel: "Amount",
    toLabel: "Converted",
    swapBtn: "↕ Swap",
    presetsLabel: "Popular Pairs",
    rateInfo: "1 {from} = {rate} {to}",
    dataSource: "Static data · Jun 2026",
    result: "Result",
    rate: "Exchange Rate",
  },
  ja: {
    title: "通貨換算機",
    subtitle: "主要20通貨の換算",
    fromLabel: "金額",
    toLabel: "換算結果",
    swapBtn: "↕ 通貨交換",
    presetsLabel: "よく使う換算",
    rateInfo: "1 {from} = {rate} {to}",
    dataSource: "2026年6月基準の静的データ",
    result: "結果",
    rate: "為替レート",
  },
  fr: {
    title: "Convertisseur de devises",
    subtitle: "Convertir entre 20 devises majeures",
    fromLabel: "Montant",
    toLabel: "Résultat",
    swapBtn: "↕ Inverser",
    presetsLabel: "Paires populaires",
    rateInfo: "1 {from} = {rate} {to}",
    dataSource: "Données statiques · Juin 2026",
    result: "Résultat",
    rate: "Taux de change",
  },
  es: {
    title: "Conversor de divisas",
    subtitle: "Convierte entre 20 divisas principales",
    fromLabel: "Cantidad",
    toLabel: "Resultado",
    swapBtn: "↕ Intercambiar",
    presetsLabel: "Pares populares",
    rateInfo: "1 {from} = {rate} {to}",
    dataSource: "Datos estáticos · Jun 2026",
    result: "Resultado",
    rate: "Tipo de cambio",
  },
  zh: {
    title: "汇率换算器",
    subtitle: "20种主要货币换算",
    fromLabel: "金额",
    toLabel: "换算结果",
    swapBtn: "↕ 交换货币",
    presetsLabel: "常用汇率",
    rateInfo: "1 {from} = {rate} {to}",
    dataSource: "2026年6月静态数据",
    result: "结果",
    rate: "汇率",
  },
};

export default function CurrencyConverter({ locale }: Props) {
  const t = UI[locale] ?? UI.en;

  const [fromCurrency, setFromCurrency] = useState<Currency>("USD");
  const [toCurrency, setToCurrency] = useState<Currency>("KRW");
  const [fromAmount, setFromAmount] = useState("1");

  const parsedFrom = parseFloat(fromAmount) || 0;
  const toAmount = convert(parsedFrom, fromCurrency, toCurrency);
  const rateDisplay = convert(1, fromCurrency, toCurrency);

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFromAmount(e.target.value);
  }

  function handleSwap() {
    const prevTo = toCurrency;
    setToCurrency(fromCurrency);
    setFromCurrency(prevTo);
  }

  function handlePreset(from: Currency, to: Currency) {
    setFromCurrency(from);
    setToCurrency(to);
    setFromAmount("1");
  }

  const rateText = t.rateInfo
    .replace("{from}", fromCurrency)
    .replace("{rate}", formatAmount(rateDisplay))
    .replace("{to}", toCurrency);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.subtitle}
        </p>
      </div>

      {/* Preset buttons */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t.presetsLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([from, to]) => (
            <button
              key={`${from}-${to}`}
              onClick={() => handlePreset(from, to)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                fromCurrency === from && toCurrency === to
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary"
              }`}
            >
              {CURRENCY_SYMBOLS[from]}{from} → {CURRENCY_SYMBOLS[to]}{to}
            </button>
          ))}
        </div>
      </div>

      {/* Converter card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {/* From */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t.fromLabel}
          </label>
          <div className="flex gap-2">
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value as Currency)}
              className="w-28 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_SYMBOLS[c]} {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={fromAmount}
              onChange={handleFromChange}
              min="0"
              step="any"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-right text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            {t.swapBtn}
          </button>
        </div>

        {/* To */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t.toLabel}
          </label>
          <div className="flex gap-2">
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value as Currency)}
              className="w-28 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_SYMBOLS[c]} {c}
                </option>
              ))}
            </select>
            <div className="flex-1 rounded-lg border border-primary bg-accent px-4 py-2.5 text-right text-lg font-semibold text-primary">
              {formatAmount(toAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Rate info */}
      <div className="rounded-xl border border-border bg-background px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {t.rate}
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {rateText}
          </p>
        </div>
        <span className="text-xs text-muted-foreground italic">
          {t.dataSource}
        </span>
      </div>
    </div>
  );
}
