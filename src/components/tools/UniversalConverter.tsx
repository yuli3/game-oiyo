import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

// ── i18n labels ───────────────────────────────────────────────────────────────
interface Labels {
  title: string;
  subtitle: string;
  tabs: { ascii: string; base: string; binary: string; roman: string };
  asciiTitle: string;
  asciiInput: string;
  asciiPlaceholder: string;
  asciiBinary: string;
  asciiHex: string;
  baseTitle: string;
  baseInput: string;
  basePlaceholder: string;
  fromBase: string;
  toBase: string;
  binaryTitle: string;
  binaryInput: string;
  binaryPlaceholder: string;
  binaryDecimal: string;
  binaryHex: string;
  binaryText: string;
  romanTitle: string;
  romanInput: string;
  romanResult: string;
  invalid: string;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Universal Converter",
    subtitle: "Developer-friendly converters for text, number bases, binary, and dates.",
    tabs: { ascii: "Text", base: "Base", binary: "Binary", roman: "Roman" },
    asciiTitle: "Text → Binary & Hex",
    asciiInput: "Text",
    asciiPlaceholder: "Type any text…",
    asciiBinary: "Binary",
    asciiHex: "Hexadecimal",
    baseTitle: "Number Base Converter",
    baseInput: "Value",
    basePlaceholder: "Enter a number",
    fromBase: "From base",
    toBase: "To base",
    binaryTitle: "Binary → Decimal, Hex & Text",
    binaryInput: "Binary",
    binaryPlaceholder: "Enter binary (e.g. 01001000)…",
    binaryDecimal: "Decimal",
    binaryHex: "Hexadecimal",
    binaryText: "ASCII text",
    romanTitle: "Date → Roman Numerals",
    romanInput: "Date",
    romanResult: "Roman numerals",
    invalid: "Invalid input",
  },
  ko: {
    title: "통합 변환기",
    subtitle: "텍스트·진법·2진수·날짜를 한 곳에서 변환하는 개발자용 도구입니다.",
    tabs: { ascii: "텍스트", base: "진법", binary: "2진수", roman: "로마숫자" },
    asciiTitle: "텍스트 → 2진수 & 16진수",
    asciiInput: "텍스트",
    asciiPlaceholder: "아무 텍스트나 입력하세요…",
    asciiBinary: "2진수",
    asciiHex: "16진수",
    baseTitle: "진법 변환기",
    baseInput: "값",
    basePlaceholder: "숫자를 입력하세요",
    fromBase: "입력 진법",
    toBase: "출력 진법",
    binaryTitle: "2진수 → 10진수, 16진수 & 텍스트",
    binaryInput: "2진수",
    binaryPlaceholder: "2진수를 입력하세요 (예: 01001000)…",
    binaryDecimal: "10진수",
    binaryHex: "16진수",
    binaryText: "ASCII 텍스트",
    romanTitle: "날짜 → 로마 숫자",
    romanInput: "날짜",
    romanResult: "로마 숫자",
    invalid: "잘못된 입력",
  },
  ja: {
    title: "統合コンバーター",
    subtitle: "テキスト・基数・2進数・日付をまとめて変換する開発者向けツールです。",
    tabs: { ascii: "テキスト", base: "基数", binary: "2進数", roman: "ローマ数字" },
    asciiTitle: "テキスト → 2進数・16進数",
    asciiInput: "テキスト",
    asciiPlaceholder: "テキストを入力…",
    asciiBinary: "2進数",
    asciiHex: "16進数",
    baseTitle: "基数変換ツール",
    baseInput: "値",
    basePlaceholder: "数値を入力",
    fromBase: "入力の基数",
    toBase: "出力の基数",
    binaryTitle: "2進数 → 10進数・16進数・テキスト",
    binaryInput: "2進数",
    binaryPlaceholder: "2進数を入力（例: 01001000）…",
    binaryDecimal: "10進数",
    binaryHex: "16進数",
    binaryText: "ASCIIテキスト",
    romanTitle: "日付 → ローマ数字",
    romanInput: "日付",
    romanResult: "ローマ数字",
    invalid: "無効な入力",
  },
  zh: {
    title: "通用转换器",
    subtitle: "面向开发者的文本、进制、二进制和日期转换工具。",
    tabs: { ascii: "文本", base: "进制", binary: "二进制", roman: "罗马数字" },
    asciiTitle: "文本 → 二进制和十六进制",
    asciiInput: "文本",
    asciiPlaceholder: "输入任意文本…",
    asciiBinary: "二进制",
    asciiHex: "十六进制",
    baseTitle: "进制转换器",
    baseInput: "数值",
    basePlaceholder: "输入数字",
    fromBase: "输入进制",
    toBase: "输出进制",
    binaryTitle: "二进制 → 十进制、十六进制和文本",
    binaryInput: "二进制",
    binaryPlaceholder: "输入二进制（如 01001000）…",
    binaryDecimal: "十进制",
    binaryHex: "十六进制",
    binaryText: "ASCII 文本",
    romanTitle: "日期 → 罗马数字",
    romanInput: "日期",
    romanResult: "罗马数字",
    invalid: "输入无效",
  },
  fr: {
    title: "Convertisseur Universel",
    subtitle: "Convertisseurs pour développeurs : texte, bases numériques, binaire et dates.",
    tabs: { ascii: "Texte", base: "Base", binary: "Binaire", roman: "Romain" },
    asciiTitle: "Texte → Binaire et Hexadécimal",
    asciiInput: "Texte",
    asciiPlaceholder: "Saisissez du texte…",
    asciiBinary: "Binaire",
    asciiHex: "Hexadécimal",
    baseTitle: "Convertisseur de Bases",
    baseInput: "Valeur",
    basePlaceholder: "Entrez un nombre",
    fromBase: "Base d'entrée",
    toBase: "Base de sortie",
    binaryTitle: "Binaire → Décimal, Hexadécimal et Texte",
    binaryInput: "Binaire",
    binaryPlaceholder: "Entrez du binaire (ex. 01001000)…",
    binaryDecimal: "Décimal",
    binaryHex: "Hexadécimal",
    binaryText: "Texte ASCII",
    romanTitle: "Date → Chiffres Romains",
    romanInput: "Date",
    romanResult: "Chiffres romains",
    invalid: "Entrée invalide",
  },
  es: {
    title: "Convertidor Universal",
    subtitle: "Convertidores para desarrolladores: texto, bases numéricas, binario y fechas.",
    tabs: { ascii: "Texto", base: "Base", binary: "Binario", roman: "Romano" },
    asciiTitle: "Texto → Binario y Hexadecimal",
    asciiInput: "Texto",
    asciiPlaceholder: "Escribe cualquier texto…",
    asciiBinary: "Binario",
    asciiHex: "Hexadecimal",
    baseTitle: "Convertidor de Bases",
    baseInput: "Valor",
    basePlaceholder: "Introduce un número",
    fromBase: "Base de entrada",
    toBase: "Base de salida",
    binaryTitle: "Binario → Decimal, Hexadecimal y Texto",
    binaryInput: "Binario",
    binaryPlaceholder: "Introduce binario (ej. 01001000)…",
    binaryDecimal: "Decimal",
    binaryHex: "Hexadecimal",
    binaryText: "Texto ASCII",
    romanTitle: "Fecha → Números Romanos",
    romanInput: "Fecha",
    romanResult: "Números romanos",
    invalid: "Entrada no válida",
  },
};

// ── conversion helpers (ported verbatim from ahoxy universal-converter) ────────
function textToBinary(text: string): string {
  return Array.from(text)
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");
}
function textToHex(text: string): string {
  return Array.from(text)
    .map((ch) => ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}
function binaryToDecimal(bin: string): number | null {
  const s = bin.replace(/\s/g, "");
  if (!/^[01]+$/.test(s)) return null;
  return parseInt(s, 2);
}
function binaryToText(bin: string): string {
  const s = bin.replace(/\s/g, "");
  const bytes = s.match(/.{1,8}/g) || [];
  return bytes.map((b) => String.fromCharCode(parseInt(b, 2))).join("");
}
function convertBase(value: string, from: number, to: number): string | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "") return "";
  const dec = parseInt(trimmed, from);
  if (isNaN(dec)) return null;
  // validate every digit belongs to the source base
  if (parseInt(dec.toString(from), from) !== dec) return null;
  return dec.toString(to).toUpperCase();
}
const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
function toRoman(num: number): string {
  if (num <= 0) return "";
  let result = "", remaining = num;
  for (const [value, numeral] of ROMAN) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}
function dateToRoman(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = toRoman(d.getDate());
  const month = toRoman(d.getMonth() + 1);
  const year = toRoman(d.getFullYear());
  return `${day} · ${month} · ${year}`;
}

const BASE_OPTIONS = [2, 8, 10, 16];

interface Props {
  locale: Locale;
}

export default function UniversalConverter({ locale }: Props) {
  const t = LABELS[locale] ?? LABELS.en;
  const [tab, setTab] = useState<"ascii" | "base" | "binary" | "roman">("ascii");

  const [text, setText] = useState("");
  const [baseVal, setBaseVal] = useState("");
  const [fromBase, setFromBase] = useState(10);
  const [toBase, setToBase] = useState(2);
  const [binary, setBinary] = useState("");
  const [dateStr, setDateStr] = useState("");

  const baseResult = convertBase(baseVal, fromBase, toBase);
  const binDec = binaryToDecimal(binary);
  const romanResult = dateStr ? dateToRoman(dateStr) : "";

  const inputCls =
    "w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const readCls = "w-full break-all rounded-lg bg-background px-3 py-2 font-mono text-sm text-foreground min-h-[2.5rem]";
  const labelCls = "mt-3 block text-xs text-muted-foreground";
  const selectCls = "rounded-lg border border-border px-3 py-2 text-foreground";

  const tabBtn = (key: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
        (tab === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted")
      }
    >
      {label}
    </button>
  );

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="flex flex-wrap gap-2">
        {tabBtn("ascii", t.tabs.ascii)}
        {tabBtn("base", t.tabs.base)}
        {tabBtn("binary", t.tabs.binary)}
        {tabBtn("roman", t.tabs.roman)}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-white p-4">
        {tab === "ascii" && (
          <div>
            <h3 className="font-semibold text-foreground">{t.asciiTitle}</h3>
            <label className={labelCls}>{t.asciiInput}</label>
            <input className={inputCls} value={text} placeholder={t.asciiPlaceholder} onChange={(e) => setText(e.target.value)} />
            <label className={labelCls}>{t.asciiBinary}</label>
            <div className={readCls}>{text ? textToBinary(text) : "—"}</div>
            <label className={labelCls}>{t.asciiHex}</label>
            <div className={readCls}>{text ? textToHex(text) : "—"}</div>
          </div>
        )}

        {tab === "base" && (
          <div>
            <h3 className="font-semibold text-foreground">{t.baseTitle}</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <div>
                <label className="block text-xs text-muted-foreground">{t.fromBase}</label>
                <select className={selectCls} value={fromBase} onChange={(e) => setFromBase(Number(e.target.value))}>
                  {BASE_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">{t.toBase}</label>
                <select className={selectCls} value={toBase} onChange={(e) => setToBase(Number(e.target.value))}>
                  {BASE_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <label className={labelCls}>{t.baseInput}</label>
            <input className={inputCls} value={baseVal} placeholder={t.basePlaceholder} onChange={(e) => setBaseVal(e.target.value)} />
            <div className="mt-3 rounded-lg bg-accent px-3 py-2 font-mono text-sm font-semibold text-primary min-h-[2.5rem]">
              {baseVal === "" ? "—" : baseResult === null ? t.invalid : baseResult}
            </div>
          </div>
        )}

        {tab === "binary" && (
          <div>
            <h3 className="font-semibold text-foreground">{t.binaryTitle}</h3>
            <label className={labelCls}>{t.binaryInput}</label>
            <input className={inputCls} value={binary} placeholder={t.binaryPlaceholder} onChange={(e) => setBinary(e.target.value)} />
            <label className={labelCls}>{t.binaryDecimal}</label>
            <div className={readCls}>{binary ? (binDec === null ? t.invalid : binDec.toString()) : "—"}</div>
            <label className={labelCls}>{t.binaryHex}</label>
            <div className={readCls}>{binary && binDec !== null ? binDec.toString(16).toUpperCase() : "—"}</div>
            <label className={labelCls}>{t.binaryText}</label>
            <div className={readCls}>{binary && binDec !== null ? binaryToText(binary) : "—"}</div>
          </div>
        )}

        {tab === "roman" && (
          <div>
            <h3 className="font-semibold text-foreground">{t.romanTitle}</h3>
            <label className={labelCls}>{t.romanInput}</label>
            <input type="date" className={inputCls} value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            <label className={labelCls}>{t.romanResult}</label>
            <div className="mt-1 rounded-lg bg-accent px-3 py-2 font-mono text-sm font-semibold text-primary min-h-[2.5rem]">
              {dateStr ? (romanResult ?? t.invalid) : "—"}
            </div>
          </div>
        )}
      </div>
    </GameContainer>
  );
}
