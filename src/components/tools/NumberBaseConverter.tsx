import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

type BaseValue = 2 | 8 | 10 | 16;

interface Labels {
  title: string;
  subtitle: string;
  inputLabel: string;
  fromBaseLabel: string;
  resultsTitle: string;
  placeholder: string;
  invalid: string;
  baseLabels: Record<BaseValue, string>;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Number Base Converter",
    subtitle: "Convert decimal, binary, octal, and hexadecimal values instantly.",
    inputLabel: "Value",
    fromBaseLabel: "Input base",
    resultsTitle: "Converted values",
    placeholder: "Enter a number",
    invalid: "The value contains digits that do not belong to the selected base.",
    baseLabels: { 2: "Binary", 8: "Octal", 10: "Decimal", 16: "Hexadecimal" },
  },
  ko: {
    title: "진법 변환기",
    subtitle: "10진수, 2진수, 8진수, 16진수를 즉시 변환합니다.",
    inputLabel: "입력값",
    fromBaseLabel: "입력 진법",
    resultsTitle: "변환 결과",
    placeholder: "값을 입력하세요",
    invalid: "선택한 진법에 맞지 않는 자릿수가 포함되어 있습니다.",
    baseLabels: { 2: "2진수", 8: "8진수", 10: "10진수", 16: "16진수" },
  },
  ja: {
    title: "基数変換ツール",
    subtitle: "10進数・2進数・8進数・16進数をすぐに変換します。",
    inputLabel: "入力値",
    fromBaseLabel: "入力の基数",
    resultsTitle: "変換結果",
    placeholder: "値を入力",
    invalid: "選択した基数では使えない桁が含まれています。",
    baseLabels: { 2: "2進数", 8: "8進数", 10: "10進数", 16: "16進数" },
  },
  zh: {
    title: "进制转换器",
    subtitle: "即时转换十进制、二进制、八进制和十六进制数值。",
    inputLabel: "输入值",
    fromBaseLabel: "输入进制",
    resultsTitle: "转换结果",
    placeholder: "请输入数值",
    invalid: "该数值包含所选进制中不允许的字符。",
    baseLabels: { 2: "二进制", 8: "八进制", 10: "十进制", 16: "十六进制" },
  },
  fr: {
    title: "Convertisseur de Bases Numériques",
    subtitle: "Convertissez instantanément les valeurs décimales, binaires, octales et hexadécimales.",
    inputLabel: "Valeur",
    fromBaseLabel: "Base d'entrée",
    resultsTitle: "Valeurs converties",
    placeholder: "Entrez une valeur",
    invalid: "La valeur contient des chiffres qui n'appartiennent pas à la base choisie.",
    baseLabels: { 2: "Binaire", 8: "Octal", 10: "Décimal", 16: "Hexadécimal" },
  },
  es: {
    title: "Convertidor de Bases Numéricas",
    subtitle: "Convierte valores decimales, binarios, octales y hexadecimales al instante.",
    inputLabel: "Valor",
    fromBaseLabel: "Base de entrada",
    resultsTitle: "Valores convertidos",
    placeholder: "Introduce un valor",
    invalid: "El valor contiene dígitos que no pertenecen a la base seleccionada.",
    baseLabels: { 2: "Binario", 8: "Octal", 10: "Decimal", 16: "Hexadecimal" },
  },
};

// 유효성까지 검사하는 진법 변환. 잘못된 자릿수면 null.
function convertBase(value: string, from: number, to: number): string | null {
  const v = value.trim();
  if (!v) return null;
  const n = parseInt(v, from);
  if (isNaN(n)) return null;
  // round-trip으로 from 진법에 맞지 않는 자릿수(예: bin에 '2') 걸러냄
  if (n.toString(from).toLowerCase() !== v.toLowerCase().replace(/^0+(?=.)/, "")) return null;
  return n.toString(to).toUpperCase();
}

interface Props {
  locale: Locale;
}

const bases: BaseValue[] = [2, 8, 10, 16];

export default function NumberBaseConverter({ locale }: Props) {
  const t = LABELS[locale] ?? LABELS.en;
  const [value, setValue] = useState("");
  const [fromBase, setFromBase] = useState<BaseValue>(10);

  const converted = bases.map((base) => ({
    base,
    value: convertBase(value, fromBase, base),
  }));
  const hasValue = value.trim() !== "";
  const isInvalid = hasValue && converted.every((item) => item.value === null);

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
  const card = "rounded-xl border border-slate-200 bg-white p-4";
  const resultCls = "mt-2 break-all rounded-lg bg-indigo-50 px-3 py-2 font-mono text-sm font-semibold text-indigo-900";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className={card}>
          <label className="block text-xs text-slate-500">{t.inputLabel}</label>
          <input className={inputCls} placeholder={t.placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
          <label className="mt-3 block text-xs text-slate-500">{t.fromBaseLabel}</label>
          <select className={inputCls} value={fromBase} onChange={(e) => setFromBase(Number(e.target.value) as BaseValue)}>
            {bases.map((base) => (
              <option key={base} value={base}>
                {t.baseLabels[base]} ({base})
              </option>
            ))}
          </select>
          {isInvalid && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{t.invalid}</p>}
        </div>

        <div className={card}>
          <h3 className="font-semibold text-slate-900">{t.resultsTitle}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {converted.map((item) => (
              <div key={item.base} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">
                  {t.baseLabels[item.base]} ({item.base})
                </div>
                <div className={resultCls}>{item.value ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameContainer>
  );
}
