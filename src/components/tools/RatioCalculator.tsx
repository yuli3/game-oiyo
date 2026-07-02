import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels {
  title: string;
  subtitle: string;
  simplifyTitle: string;
  solveTitle: string;
  aLabel: string;
  bLabel: string;
  cLabel: string;
  valueLabel: string;
  placeholder: string;
  simplifyResult: (a: string, b: string) => string;
  solveResult: (x: string) => string;
  invalid: string;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Ratio Calculator",
    subtitle: "Simplify a:b ratios and solve a:b = c:x proportions.",
    simplifyTitle: "Simplify a:b",
    solveTitle: "Solve a:b = c:x",
    aLabel: "a",
    bLabel: "b",
    cLabel: "c",
    valueLabel: "Value",
    placeholder: "Enter a number",
    simplifyResult: (a, b) => `Simplified ratio: ${a}:${b}`,
    solveResult: (x) => `x = ${x}`,
    invalid: "Enter valid numbers. In a:b = c:x, a cannot be 0.",
  },
  ko: {
    title: "비율 계산기",
    subtitle: "a:b 비율을 기약화하고 a:b = c:x 비례식의 x를 구합니다.",
    simplifyTitle: "a:b 기약화",
    solveTitle: "a:b = c:x 풀기",
    aLabel: "a",
    bLabel: "b",
    cLabel: "c",
    valueLabel: "값",
    placeholder: "숫자를 입력하세요",
    simplifyResult: (a, b) => `기약비: ${a}:${b}`,
    solveResult: (x) => `x = ${x}`,
    invalid: "올바른 숫자를 입력하세요. a:b = c:x에서는 a가 0일 수 없습니다.",
  },
  ja: {
    title: "比率計算機",
    subtitle: "a:bの比を簡単にし、a:b = c:x の比例式でxを求めます。",
    simplifyTitle: "a:bを簡単にする",
    solveTitle: "a:b = c:x を解く",
    aLabel: "a",
    bLabel: "b",
    cLabel: "c",
    valueLabel: "値",
    placeholder: "数値を入力",
    simplifyResult: (a, b) => `簡単にした比: ${a}:${b}`,
    solveResult: (x) => `x = ${x}`,
    invalid: "正しい数値を入力してください。a:b = c:x では a は0にできません。",
  },
  zh: {
    title: "比例计算器",
    subtitle: "化简 a:b 比例，并求解 a:b = c:x 中的 x。",
    simplifyTitle: "化简 a:b",
    solveTitle: "求解 a:b = c:x",
    aLabel: "a",
    bLabel: "b",
    cLabel: "c",
    valueLabel: "数值",
    placeholder: "请输入数字",
    simplifyResult: (a, b) => `最简比：${a}:${b}`,
    solveResult: (x) => `x = ${x}`,
    invalid: "请输入有效数字。在 a:b = c:x 中，a 不能为 0。",
  },
  fr: {
    title: "Calculateur de Ratio",
    subtitle: "Simplifiez les ratios a:b et résolvez les proportions a:b = c:x.",
    simplifyTitle: "Simplifier a:b",
    solveTitle: "Résoudre a:b = c:x",
    aLabel: "a",
    bLabel: "b",
    cLabel: "c",
    valueLabel: "Valeur",
    placeholder: "Entrez un nombre",
    simplifyResult: (a, b) => `Ratio simplifié : ${a}:${b}`,
    solveResult: (x) => `x = ${x}`,
    invalid: "Entrez des nombres valides. Dans a:b = c:x, a ne peut pas être 0.",
  },
  es: {
    title: "Calculadora de Razones",
    subtitle: "Simplifica razones a:b y resuelve proporciones a:b = c:x.",
    simplifyTitle: "Simplificar a:b",
    solveTitle: "Resolver a:b = c:x",
    aLabel: "a",
    bLabel: "b",
    cLabel: "c",
    valueLabel: "Valor",
    placeholder: "Introduce un número",
    simplifyResult: (a, b) => `Razón simplificada: ${a}:${b}`,
    solveResult: (x) => `x = ${x}`,
    invalid: "Introduce números válidos. En a:b = c:x, a no puede ser 0.",
  },
};

function gcd(a: number, b: number): number { a=Math.abs(a); b=Math.abs(b); while(b){[a,b]=[b,a%b];} return a||1; }
function simplifyRatio(a: number, b: number): [number, number] { const g=gcd(Math.round(a),Math.round(b)); return [Math.round(a)/g, Math.round(b)/g]; }
function solveProportion(a: number, b: number, c: number): number { return (b * c) / a; } // a:b = c:x → x

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(6)).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

interface Props {
  locale: Locale;
}

export default function RatioCalculator({ locale }: Props) {
  const t = LABELS[locale] ?? LABELS.en;
  const [simpleA, setSimpleA] = useState("");
  const [simpleB, setSimpleB] = useState("");
  const [propA, setPropA] = useState("");
  const [propB, setPropB] = useState("");
  const [propC, setPropC] = useState("");

  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

  const simplified = (() => {
    const a = num(simpleA), b = num(simpleB);
    if (isNaN(a) || isNaN(b)) return null;
    return simplifyRatio(a, b);
  })();

  const solved = (() => {
    const a = num(propA), b = num(propB), c = num(propC);
    if (isNaN(a) || isNaN(b) || isNaN(c) || a === 0) return null;
    return solveProportion(a, b, c);
  })();

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
  const card = "rounded-xl border border-slate-200 bg-white p-4";
  const resultCls = "mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h3 className="font-semibold text-slate-900">{t.simplifyTitle}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-xs text-slate-500">
              {t.aLabel}
              <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={simpleA} onChange={(e) => setSimpleA(e.target.value)} />
            </label>
            <label className="block text-xs text-slate-500">
              {t.bLabel}
              <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={simpleB} onChange={(e) => setSimpleB(e.target.value)} />
            </label>
          </div>
          {simplified !== null && <div className={resultCls}>{t.simplifyResult(fmt(simplified[0]), fmt(simplified[1]))}</div>}
        </div>

        <div className={card}>
          <h3 className="font-semibold text-slate-900">{t.solveTitle}</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <label className="block text-xs text-slate-500">
              {t.aLabel}
              <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={propA} onChange={(e) => setPropA(e.target.value)} />
            </label>
            <label className="block text-xs text-slate-500">
              {t.bLabel}
              <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={propB} onChange={(e) => setPropB(e.target.value)} />
            </label>
            <label className="block text-xs text-slate-500">
              {t.cLabel}
              <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={propC} onChange={(e) => setPropC(e.target.value)} />
            </label>
          </div>
          {solved !== null && <div className={resultCls}>{t.solveResult(fmt(solved))}</div>}
          {propA.trim() !== "" && num(propA) === 0 && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{t.invalid}</p>}
        </div>
      </div>
    </GameContainer>
  );
}
