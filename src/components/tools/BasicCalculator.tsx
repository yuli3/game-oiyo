import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels { title: string; subtitle: string; clear: string; backspace: string; error: string; }
const LABELS: Record<Locale, Labels> = {
  en: { title: "Basic Calculator", subtitle: "Arithmetic with decimals, percent, and clear.", clear: "C", backspace: "DEL", error: "Error" },
  ko: { title: "기본 계산기", subtitle: "소수와 퍼센트를 포함한 사칙연산 계산기입니다.", clear: "C", backspace: "DEL", error: "오류" },
  ja: { title: "基本計算機", subtitle: "小数とパーセントを含む四則演算に対応します。", clear: "C", backspace: "DEL", error: "エラー" },
  zh: { title: "基础计算器", subtitle: "支持小数、百分号和清除的四则运算。", clear: "C", backspace: "DEL", error: "错误" },
  fr: { title: "Calculatrice Basique", subtitle: "Calculs avec décimales, pourcentage et effacement.", clear: "C", backspace: "DEL", error: "Erreur" },
  es: { title: "Calculadora Básica", subtitle: "Operaciones con decimales, porcentaje y borrar.", clear: "C", backspace: "DEL", error: "Error" },
};
function evaluateExpression(expr: string): string {
  try {
    const cleanExpr = expr.replace(/×/g, "*").replace(/÷/g, "/");
    if (!/^[\d+\-*/().%\s]+$/.test(cleanExpr)) return "Error";
    const result = new Function(`return ${cleanExpr}`)();
    if (!Number.isFinite(result) || Number.isNaN(result)) return "Error";
    return Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(8)).toString();
  } catch { return "Error"; }
}
export default function BasicCalculator({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [display, setDisplay] = useState("");
  const [isCalculated, setIsCalculated] = useState(false);
  const handleInput = (value: string) => {
    if (value === "C") { setDisplay(""); setIsCalculated(false); return; }
    if (value === "DEL") { setDisplay((prev) => (isCalculated ? "" : prev.slice(0, -1))); setIsCalculated(false); return; }
    if (value === "=") { const result = evaluateExpression(display); setDisplay(result === "Error" ? t.error : result); setIsCalculated(true); return; }
    const isOperator = ["+", "-", "×", "÷", "%"].includes(value);
    setDisplay((prev) => (!isCalculated ? prev + value : isOperator ? prev + value : value));
    setIsCalculated(false);
  };
  const buttonCls = "h-14 rounded-xl text-xl font-semibold transition active:scale-95";
  const numberCls = `${buttonCls} bg-slate-100 text-slate-900 hover:bg-slate-200`;
  const opCls = `${buttonCls} bg-indigo-50 text-indigo-800 hover:bg-indigo-100`;
  return <GameContainer title={t.title} subtitle={t.subtitle}><div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex min-h-24 items-end justify-end overflow-hidden rounded-2xl bg-slate-100 p-4"><span className="break-all text-right font-mono text-4xl font-black text-slate-950">{display || "0"}</span></div><div className="grid grid-cols-4 gap-3"><button type="button" className={`${buttonCls} bg-rose-50 text-rose-700 hover:bg-rose-100`} onClick={() => handleInput("C")}>{t.clear}</button><button type="button" className={opCls} onClick={() => handleInput("DEL")}>{t.backspace}</button><button type="button" className={opCls} onClick={() => handleInput("%")}>%</button><button type="button" className={opCls} onClick={() => handleInput("÷")}>÷</button>{["7", "8", "9"].map((n) => <button key={n} type="button" className={numberCls} onClick={() => handleInput(n)}>{n}</button>)}<button type="button" className={opCls} onClick={() => handleInput("×")}>×</button>{["4", "5", "6"].map((n) => <button key={n} type="button" className={numberCls} onClick={() => handleInput(n)}>{n}</button>)}<button type="button" className={opCls} onClick={() => handleInput("-")}>-</button>{["1", "2", "3"].map((n) => <button key={n} type="button" className={numberCls} onClick={() => handleInput(n)}>{n}</button>)}<button type="button" className={opCls} onClick={() => handleInput("+")}>+</button><button type="button" className={`${numberCls} col-span-2`} onClick={() => handleInput("0")}>0</button><button type="button" className={numberCls} onClick={() => handleInput(".")}>.</button><button type="button" className={`${buttonCls} bg-indigo-600 text-white hover:bg-indigo-700`} onClick={() => handleInput("=")}>=</button></div></div></GameContainer>;
}
