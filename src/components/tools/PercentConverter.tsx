import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

// ── i18n labels ───────────────────────────────────────────────────────────────
interface Labels {
  title: string;
  subtitle: string;
  ofTitle: string; // What is A% of B
  ofA: string;
  ofB: string;
  ofResult: (a: string, b: string, r: string) => string;
  isTitle: string; // A is what % of B
  isA: string;
  isB: string;
  isResult: (a: string, b: string, r: string) => string;
  changeTitle: string; // % change from A to B
  changeA: string;
  changeB: string;
  changeResult: (r: string, dir: string) => string;
  increase: string;
  decrease: string;
  nochange: string;
  placeholder: string;
  invalid: string;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Percentage Calculator",
    subtitle: "The three most-used percentage operations in one place.",
    ofTitle: "What is A% of B?",
    ofA: "Percent (A)",
    ofB: "Of value (B)",
    ofResult: (a, b, r) => `${a}% of ${b} = ${r}`,
    isTitle: "A is what percent of B?",
    isA: "Value (A)",
    isB: "Of total (B)",
    isResult: (a, b, r) => `${a} is ${r}% of ${b}`,
    changeTitle: "Percent change from A to B",
    changeA: "From (A)",
    changeB: "To (B)",
    changeResult: (r, dir) => `${dir} of ${r}%`,
    increase: "Increase",
    decrease: "Decrease",
    nochange: "No change",
    placeholder: "Enter a number",
    invalid: "Enter valid numbers",
  },
  ko: {
    title: "퍼센트 계산기",
    subtitle: "가장 많이 쓰는 백분율 계산 3가지를 한 곳에서.",
    ofTitle: "B의 A%는 얼마?",
    ofA: "퍼센트 (A)",
    ofB: "기준값 (B)",
    ofResult: (a, b, r) => `${b}의 ${a}% = ${r}`,
    isTitle: "A는 B의 몇 %?",
    isA: "값 (A)",
    isB: "전체 (B)",
    isResult: (a, b, r) => `${a}는 ${b}의 ${r}%`,
    changeTitle: "A에서 B로의 증감률",
    changeA: "처음 (A)",
    changeB: "나중 (B)",
    changeResult: (r, dir) => `${r}% ${dir}`,
    increase: "증가",
    decrease: "감소",
    nochange: "변화 없음",
    placeholder: "숫자를 입력하세요",
    invalid: "올바른 숫자를 입력하세요",
  },
  ja: {
    title: "パーセント計算機",
    subtitle: "よく使う割合計算3種をひとまとめに。",
    ofTitle: "BのA%はいくつ？",
    ofA: "パーセント (A)",
    ofB: "基準値 (B)",
    ofResult: (a, b, r) => `${b}の${a}% = ${r}`,
    isTitle: "AはBの何%？",
    isA: "値 (A)",
    isB: "全体 (B)",
    isResult: (a, b, r) => `${a}は${b}の${r}%`,
    changeTitle: "AからBへの増減率",
    changeA: "最初 (A)",
    changeB: "後 (B)",
    changeResult: (r, dir) => `${r}% ${dir}`,
    increase: "増加",
    decrease: "減少",
    nochange: "変化なし",
    placeholder: "数値を入力",
    invalid: "正しい数値を入力してください",
  },
  zh: {
    title: "百分比计算器",
    subtitle: "把最常用的三种百分比计算放在一起。",
    ofTitle: "B 的 A% 是多少？",
    ofA: "百分比 (A)",
    ofB: "基准值 (B)",
    ofResult: (a, b, r) => `${b} 的 ${a}% = ${r}`,
    isTitle: "A 是 B 的百分之几？",
    isA: "数值 (A)",
    isB: "总数 (B)",
    isResult: (a, b, r) => `${a} 是 ${b} 的 ${r}%`,
    changeTitle: "从 A 到 B 的变化率",
    changeA: "起始 (A)",
    changeB: "结束 (B)",
    changeResult: (r, dir) => `${dir} ${r}%`,
    increase: "增加",
    decrease: "减少",
    nochange: "无变化",
    placeholder: "请输入数字",
    invalid: "请输入有效数字",
  },
  fr: {
    title: "Calculateur de Pourcentage",
    subtitle: "Les trois opérations de pourcentage les plus utilisées.",
    ofTitle: "Combien font A% de B ?",
    ofA: "Pourcentage (A)",
    ofB: "Valeur (B)",
    ofResult: (a, b, r) => `${a}% de ${b} = ${r}`,
    isTitle: "A représente quel pourcentage de B ?",
    isA: "Valeur (A)",
    isB: "Sur total (B)",
    isResult: (a, b, r) => `${a} = ${r}% de ${b}`,
    changeTitle: "Variation en % de A à B",
    changeA: "De (A)",
    changeB: "À (B)",
    changeResult: (r, dir) => `${dir} de ${r}%`,
    increase: "Hausse",
    decrease: "Baisse",
    nochange: "Aucun changement",
    placeholder: "Entrez un nombre",
    invalid: "Entrez des nombres valides",
  },
  es: {
    title: "Calculadora de Porcentaje",
    subtitle: "Las tres operaciones de porcentaje más usadas en un lugar.",
    ofTitle: "¿Cuánto es el A% de B?",
    ofA: "Porcentaje (A)",
    ofB: "Valor (B)",
    ofResult: (a, b, r) => `${a}% de ${b} = ${r}`,
    isTitle: "¿A es qué porcentaje de B?",
    isA: "Valor (A)",
    isB: "Del total (B)",
    isResult: (a, b, r) => `${a} es el ${r}% de ${b}`,
    changeTitle: "Cambio porcentual de A a B",
    changeA: "De (A)",
    changeB: "A (B)",
    changeResult: (r, dir) => `${dir} del ${r}%`,
    increase: "Aumento",
    decrease: "Disminución",
    nochange: "Sin cambio",
    placeholder: "Introduce un número",
    invalid: "Introduce números válidos",
  },
};

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(4)).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

interface Props {
  locale: Locale;
}

export default function PercentConverter({ locale }: Props) {
  const t = LABELS[locale] ?? LABELS.en;

  const [ofA, setOfA] = useState("");
  const [ofB, setOfB] = useState("");
  const [isA, setIsA] = useState("");
  const [isB, setIsB] = useState("");
  const [chA, setChA] = useState("");
  const [chB, setChB] = useState("");

  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

  const ofVal = (() => {
    const a = num(ofA), b = num(ofB);
    if (isNaN(a) || isNaN(b)) return null;
    return (a / 100) * b;
  })();
  const isVal = (() => {
    const a = num(isA), b = num(isB);
    if (isNaN(a) || isNaN(b) || b === 0) return null;
    return (a / b) * 100;
  })();
  const chVal = (() => {
    const a = num(chA), b = num(chB);
    if (isNaN(a) || isNaN(b) || a === 0) return null;
    return ((b - a) / Math.abs(a)) * 100;
  })();

  const inputCls =
    "w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const card = "rounded-xl border border-border bg-white p-4";
  const resultCls = "mt-3 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-primary";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-4 md:grid-cols-3">
        {/* A% of B */}
        <div className={card}>
          <h3 className="font-semibold text-foreground">{t.ofTitle}</h3>
          <label className="mt-3 block text-xs text-muted-foreground">{t.ofA}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={ofA} onChange={(e) => setOfA(e.target.value)} />
          <label className="mt-2 block text-xs text-muted-foreground">{t.ofB}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={ofB} onChange={(e) => setOfB(e.target.value)} />
          {ofVal !== null && <div className={resultCls}>{t.ofResult(ofA, ofB, fmt(ofVal))}</div>}
        </div>

        {/* A is what % of B */}
        <div className={card}>
          <h3 className="font-semibold text-foreground">{t.isTitle}</h3>
          <label className="mt-3 block text-xs text-muted-foreground">{t.isA}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={isA} onChange={(e) => setIsA(e.target.value)} />
          <label className="mt-2 block text-xs text-muted-foreground">{t.isB}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={isB} onChange={(e) => setIsB(e.target.value)} />
          {isVal !== null && <div className={resultCls}>{t.isResult(isA, isB, fmt(isVal))}</div>}
        </div>

        {/* % change */}
        <div className={card}>
          <h3 className="font-semibold text-foreground">{t.changeTitle}</h3>
          <label className="mt-3 block text-xs text-muted-foreground">{t.changeA}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={chA} onChange={(e) => setChA(e.target.value)} />
          <label className="mt-2 block text-xs text-muted-foreground">{t.changeB}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={chB} onChange={(e) => setChB(e.target.value)} />
          {chVal !== null && (
            <div className={resultCls}>
              {t.changeResult(fmt(Math.abs(chVal)), chVal > 0 ? t.increase : chVal < 0 ? t.decrease : t.nochange)}
            </div>
          )}
        </div>
      </div>
    </GameContainer>
  );
}
