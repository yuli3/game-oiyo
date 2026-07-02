import { useId, useState } from "react";
import type { Locale } from "../../lib/i18n";
import { UNIT_CATEGORIES, convertUnit, roundReadable } from "../../lib/unit-conversions";

interface UiLabels {
  value: string;
  from: string;
  results: string;
  invalid: string;
}

const LABELS: Record<string, UiLabels> = {
  en: { value: "Value", from: "From unit", results: "Converted to", invalid: "Enter a number" },
  ko: { value: "값", from: "기준 단위", results: "변환 결과", invalid: "숫자를 입력하세요" },
  ja: { value: "値", from: "基準単位", results: "変換結果", invalid: "数値を入力してください" },
  zh: { value: "数值", from: "原单位", results: "换算结果", invalid: "请输入数字" },
  fr: { value: "Valeur", from: "Unité de départ", results: "Converti en", invalid: "Saisissez un nombre" },
  es: { value: "Valor", from: "Unidad de origen", results: "Convertido a", invalid: "Introduce un número" },
};

interface Props {
  locale: Locale;
  category: string;
}

export default function UnitConverter({ locale, category }: Props) {
  const cat = UNIT_CATEGORIES[category];
  const t = LABELS[locale] ?? LABELS.en;
  const id = useId();
  const [value, setValue] = useState(cat ? String(cat.defaultValue) : "0");
  const [from, setFrom] = useState(cat ? cat.defaultFrom : "");

  if (!cat) return null;

  const n = parseFloat(value);
  const valid = value.trim() !== "" && !isNaN(n);
  const valueId = `${id}-value`;
  const fromId = `${id}-from`;
  const statusId = `${id}-status`;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block">
          <label htmlFor={valueId} className="text-sm font-medium text-muted-foreground">
            {t.value}
          </label>
          <input
            id={valueId}
            type="number"
            inputMode="decimal"
            value={value}
            aria-describedby={statusId}
            aria-invalid={!valid}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
        </div>
        <div className="block">
          <label htmlFor={fromId} className="text-sm font-medium text-muted-foreground">
            {t.from}
          </label>
          <select
            id={fromId}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          >
            {cat.units.map((u) => (
              <option key={u.key} value={u.key}>
                {u.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      <h2 className="mt-6 text-sm font-bold uppercase tracking-widest text-primary">{t.results}</h2>
      <div id={statusId} aria-live="polite" aria-atomic="true">
        {!valid ? (
          <p className="mt-2 text-sm text-muted-foreground">{t.invalid}</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {cat.units.map((u) => (
              <div
                key={u.key}
                className={`flex items-baseline justify-between rounded-md border border-border px-3 py-2 ${u.key === from ? "bg-accent" : "bg-background"}`}
              >
                <span className="text-sm text-muted-foreground">{u.symbol}</span>
                <span className="font-mono font-semibold text-foreground">
                  {roundReadable(convertUnit(cat, n, from, u.key)).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
