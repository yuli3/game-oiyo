import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels {
  title: string;
  subtitle: string;
  normalTitle: string;
  normalLabel: string;
  sciTitle: string;
  mantissaLabel: string;
  exponentLabel: string;
  placeholder: string;
  invalid: string;
  result: string;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Scientific Notation Converter",
    subtitle: "Convert regular numbers to a × 10^n notation and back.",
    normalTitle: "Number to scientific notation",
    normalLabel: "Regular number",
    sciTitle: "Scientific notation to number",
    mantissaLabel: "Coefficient (a)",
    exponentLabel: "Exponent (n)",
    placeholder: "Enter a number",
    invalid: "Enter valid numbers",
    result: "Result",
  },
  ko: {
    title: "과학적 표기법 변환기",
    subtitle: "일반 숫자와 a × 10^n 표기를 서로 변환합니다.",
    normalTitle: "일반 숫자 → 과학적 표기",
    normalLabel: "일반 숫자",
    sciTitle: "과학적 표기 → 일반 숫자",
    mantissaLabel: "가수 (a)",
    exponentLabel: "지수 (n)",
    placeholder: "숫자를 입력하세요",
    invalid: "올바른 숫자를 입력하세요",
    result: "결과",
  },
  ja: {
    title: "科学的記数法変換ツール",
    subtitle: "通常の数値と a × 10^n の表記を相互変換します。",
    normalTitle: "通常の数値 → 科学的記数法",
    normalLabel: "通常の数値",
    sciTitle: "科学的記数法 → 通常の数値",
    mantissaLabel: "仮数 (a)",
    exponentLabel: "指数 (n)",
    placeholder: "数値を入力",
    invalid: "正しい数値を入力してください",
    result: "結果",
  },
  zh: {
    title: "科学记数法换算器",
    subtitle: "在普通数字和 a × 10^n 表示之间互相转换。",
    normalTitle: "普通数字 → 科学记数法",
    normalLabel: "普通数字",
    sciTitle: "科学记数法 → 普通数字",
    mantissaLabel: "系数 (a)",
    exponentLabel: "指数 (n)",
    placeholder: "请输入数字",
    invalid: "请输入有效数字",
    result: "结果",
  },
  fr: {
    title: "Convertisseur de Notation Scientifique",
    subtitle: "Convertissez les nombres ordinaires en notation a × 10^n, et inversement.",
    normalTitle: "Nombre vers notation scientifique",
    normalLabel: "Nombre ordinaire",
    sciTitle: "Notation scientifique vers nombre",
    mantissaLabel: "Coefficient (a)",
    exponentLabel: "Exposant (n)",
    placeholder: "Entrez un nombre",
    invalid: "Entrez des nombres valides",
    result: "Résultat",
  },
  es: {
    title: "Convertidor de Notación Científica",
    subtitle: "Convierte números normales a notación a × 10^n y viceversa.",
    normalTitle: "Número a notación científica",
    normalLabel: "Número normal",
    sciTitle: "Notación científica a número",
    mantissaLabel: "Coeficiente (a)",
    exponentLabel: "Exponente (n)",
    placeholder: "Introduce un número",
    invalid: "Introduce números válidos",
    result: "Resultado",
  },
};

// 일반수 → 과학적 표기 문자열 "a × 10^n" (a: 1<=|a|<10)
function toSci(n: number): string {
  if (n === 0) return "0 × 10^0";
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mant = n / Math.pow(10, exp);
  return `${Number(mant.toFixed(6))} × 10^${exp}`;
}
// 과학적 표기(가수 a, 지수 e) → 일반수
function fromSci(a: number, e: number): number { return a * Math.pow(10, e); }

function fmt(n: number): string {
  if (!isFinite(n)) return "-";
  return Number(n.toPrecision(12)).toLocaleString(undefined, { maximumFractionDigits: 12 });
}

export default function ScientificNotationConverter({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [normal, setNormal] = useState("");
  const [mantissa, setMantissa] = useState("");
  const [exponent, setExponent] = useState("");

  const normalNumber = normal.trim() === "" ? NaN : Number(normal);
  const mantissaNumber = mantissa.trim() === "" ? NaN : Number(mantissa);
  const exponentNumber = exponent.trim() === "" ? NaN : Number(exponent);

  const sci = isNaN(normalNumber) ? null : toSci(normalNumber);
  const regular = isNaN(mantissaNumber) || isNaN(exponentNumber) ? null : fromSci(mantissaNumber, exponentNumber);

  const inputCls =
    "w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const card = "rounded-xl border border-border bg-white p-4";
  const resultCls = "mt-3 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-primary";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h3 className="font-semibold text-foreground">{t.normalTitle}</h3>
          <label className="mt-3 block text-xs text-muted-foreground">{t.normalLabel}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={normal} onChange={(e) => setNormal(e.target.value)} />
          <div className={resultCls}>{sci === null ? t.invalid : `${t.result}: ${sci}`}</div>
        </div>

        <div className={card}>
          <h3 className="font-semibold text-foreground">{t.sciTitle}</h3>
          <label className="mt-3 block text-xs text-muted-foreground">{t.mantissaLabel}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={mantissa} onChange={(e) => setMantissa(e.target.value)} />
          <label className="mt-2 block text-xs text-muted-foreground">{t.exponentLabel}</label>
          <input className={inputCls} inputMode="numeric" placeholder={t.placeholder} value={exponent} onChange={(e) => setExponent(e.target.value)} />
          <div className={resultCls}>{regular === null ? t.invalid : `${t.result}: ${fmt(regular)}`}</div>
        </div>
      </div>
    </GameContainer>
  );
}
