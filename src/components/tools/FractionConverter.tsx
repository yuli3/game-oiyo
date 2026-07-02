import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels {
  title: string;
  subtitle: string;
  fractionTitle: string;
  numeratorLabel: string;
  denominatorLabel: string;
  decimalTitle: string;
  decimalLabel: string;
  placeholder: string;
  invalid: string;
  simplified: string;
  decimal: string;
  percent: string;
  fraction: string;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Fraction Converter",
    subtitle: "Convert fractions, decimals, and percentages with reduced fractions.",
    fractionTitle: "Fraction to decimal and percent",
    numeratorLabel: "Numerator",
    denominatorLabel: "Denominator",
    decimalTitle: "Decimal to reduced fraction",
    decimalLabel: "Decimal",
    placeholder: "Enter a number",
    invalid: "Enter valid numbers",
    simplified: "Reduced fraction",
    decimal: "Decimal",
    percent: "Percent",
    fraction: "Fraction",
  },
  ko: {
    title: "분수 변환기",
    subtitle: "분수, 소수, 퍼센트를 기약분수 기준으로 변환합니다.",
    fractionTitle: "분수 → 소수와 퍼센트",
    numeratorLabel: "분자",
    denominatorLabel: "분모",
    decimalTitle: "소수 → 기약분수",
    decimalLabel: "소수",
    placeholder: "숫자를 입력하세요",
    invalid: "올바른 숫자를 입력하세요",
    simplified: "기약분수",
    decimal: "소수",
    percent: "퍼센트",
    fraction: "분수",
  },
  ja: {
    title: "分数変換ツール",
    subtitle: "分数・小数・パーセントを約分した形で変換します。",
    fractionTitle: "分数 → 小数とパーセント",
    numeratorLabel: "分子",
    denominatorLabel: "分母",
    decimalTitle: "小数 → 約分済み分数",
    decimalLabel: "小数",
    placeholder: "数値を入力",
    invalid: "正しい数値を入力してください",
    simplified: "約分した分数",
    decimal: "小数",
    percent: "パーセント",
    fraction: "分数",
  },
  zh: {
    title: "分数换算器",
    subtitle: "在分数、小数和百分比之间换算，并给出最简分数。",
    fractionTitle: "分数 → 小数和百分比",
    numeratorLabel: "分子",
    denominatorLabel: "分母",
    decimalTitle: "小数 → 最简分数",
    decimalLabel: "小数",
    placeholder: "请输入数字",
    invalid: "请输入有效数字",
    simplified: "最简分数",
    decimal: "小数",
    percent: "百分比",
    fraction: "分数",
  },
  fr: {
    title: "Convertisseur de Fractions",
    subtitle: "Convertissez fractions, décimaux et pourcentages avec fraction réduite.",
    fractionTitle: "Fraction vers décimal et pourcentage",
    numeratorLabel: "Numérateur",
    denominatorLabel: "Dénominateur",
    decimalTitle: "Décimal vers fraction réduite",
    decimalLabel: "Décimal",
    placeholder: "Entrez un nombre",
    invalid: "Entrez des nombres valides",
    simplified: "Fraction réduite",
    decimal: "Décimal",
    percent: "Pourcentage",
    fraction: "Fraction",
  },
  es: {
    title: "Convertidor de Fracciones",
    subtitle: "Convierte fracciones, decimales y porcentajes con fracciones reducidas.",
    fractionTitle: "Fracción a decimal y porcentaje",
    numeratorLabel: "Numerador",
    denominatorLabel: "Denominador",
    decimalTitle: "Decimal a fracción reducida",
    decimalLabel: "Decimal",
    placeholder: "Introduce un número",
    invalid: "Introduce números válidos",
    simplified: "Fracción reducida",
    decimal: "Decimal",
    percent: "Porcentaje",
    fraction: "Fracción",
  },
};

function gcd(a: number, b: number): number { a=Math.abs(a); b=Math.abs(b); while(b){[a,b]=[b,a%b];} return a||1; }
function simplify(n: number, d: number): [number, number] { const g=gcd(n,d); return [n/g, d/g]; }
// 소수 → 기약분수 (소수점 이하 자릿수 기반)
function decimalToFraction(x: number): [number, number] {
  if (Number.isInteger(x)) return [x, 1];
  const s = x.toString(); const dec = (s.split(".")[1]||"").length;
  const den = Math.pow(10, dec); const num = Math.round(x * den);
  return simplify(num, den);
}

function fmt(n: number): string {
  if (!isFinite(n)) return "-";
  return Number(n.toFixed(10)).toLocaleString(undefined, { maximumFractionDigits: 10 });
}

export default function FractionConverter({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [numerator, setNumerator] = useState("");
  const [denominator, setDenominator] = useState("");
  const [decimalInput, setDecimalInput] = useState("");

  const n = numerator.trim() === "" ? NaN : Number(numerator);
  const d = denominator.trim() === "" ? NaN : Number(denominator);
  const decimalNumber = decimalInput.trim() === "" ? NaN : Number(decimalInput);

  const fractionResult = (() => {
    if (isNaN(n) || isNaN(d) || d === 0) return null;
    const [sn, sd] = simplify(n, d);
    const dec = n / d;
    return { sn, sd, dec, pct: dec * 100 };
  })();

  const decimalResult = isNaN(decimalNumber) ? null : decimalToFraction(decimalNumber);

  const inputCls =
    "w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const card = "rounded-xl border border-border bg-white p-4";
  const resultCls = "mt-3 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-primary";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h3 className="font-semibold text-foreground">{t.fractionTitle}</h3>
          <label className="mt-3 block text-xs text-muted-foreground">{t.numeratorLabel}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={numerator} onChange={(e) => setNumerator(e.target.value)} />
          <label className="mt-2 block text-xs text-muted-foreground">{t.denominatorLabel}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={denominator} onChange={(e) => setDenominator(e.target.value)} />
          {fractionResult === null ? (
            <div className={resultCls}>{t.invalid}</div>
          ) : (
            <div className="mt-3 space-y-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-primary">
              <p>{t.simplified}: {fractionResult.sn}/{fractionResult.sd}</p>
              <p>{t.decimal}: {fmt(fractionResult.dec)}</p>
              <p>{t.percent}: {fmt(fractionResult.pct)}%</p>
            </div>
          )}
        </div>

        <div className={card}>
          <h3 className="font-semibold text-foreground">{t.decimalTitle}</h3>
          <label className="mt-3 block text-xs text-muted-foreground">{t.decimalLabel}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={decimalInput} onChange={(e) => setDecimalInput(e.target.value)} />
          <div className={resultCls}>
            {decimalResult === null ? t.invalid : `${t.fraction}: ${decimalResult[0]}/${decimalResult[1]}`}
          </div>
        </div>
      </div>
    </GameContainer>
  );
}
