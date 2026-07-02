import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

type AngleUnit = "deg" | "rad" | "grad";

interface Labels {
  title: string;
  subtitle: string;
  valueLabel: string;
  unitLabel: string;
  placeholder: string;
  invalid: string;
  units: Record<AngleUnit, string>;
  outputTitle: string;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Angle Converter",
    subtitle: "Convert degrees, radians, and gradians instantly.",
    valueLabel: "Angle value",
    unitLabel: "Input unit",
    placeholder: "Enter a number",
    invalid: "Enter a valid angle",
    units: { deg: "Degrees (deg)", rad: "Radians (rad)", grad: "Gradians (grad)" },
    outputTitle: "Converted values",
  },
  ko: {
    title: "각도 변환기",
    subtitle: "도, 라디안, 그라드를 즉시 서로 변환합니다.",
    valueLabel: "각도 값",
    unitLabel: "입력 단위",
    placeholder: "숫자를 입력하세요",
    invalid: "올바른 각도를 입력하세요",
    units: { deg: "도 (deg)", rad: "라디안 (rad)", grad: "그라드 (grad)" },
    outputTitle: "변환 결과",
  },
  ja: {
    title: "角度変換ツール",
    subtitle: "度、ラジアン、グラードをすぐに相互変換します。",
    valueLabel: "角度の値",
    unitLabel: "入力単位",
    placeholder: "数値を入力",
    invalid: "正しい角度を入力してください",
    units: { deg: "度 (deg)", rad: "ラジアン (rad)", grad: "グラード (grad)" },
    outputTitle: "変換結果",
  },
  zh: {
    title: "角度换算器",
    subtitle: "在度、弧度和百分度之间即时换算。",
    valueLabel: "角度数值",
    unitLabel: "输入单位",
    placeholder: "请输入数字",
    invalid: "请输入有效角度",
    units: { deg: "度 (deg)", rad: "弧度 (rad)", grad: "百分度 (grad)" },
    outputTitle: "换算结果",
  },
  fr: {
    title: "Convertisseur d'Angles",
    subtitle: "Convertissez degrés, radians et grades instantanément.",
    valueLabel: "Valeur de l'angle",
    unitLabel: "Unité d'entrée",
    placeholder: "Entrez un nombre",
    invalid: "Entrez un angle valide",
    units: { deg: "Degrés (deg)", rad: "Radians (rad)", grad: "Grades (grad)" },
    outputTitle: "Valeurs converties",
  },
  es: {
    title: "Convertidor de Ángulos",
    subtitle: "Convierte grados, radianes y gradianes al instante.",
    valueLabel: "Valor del ángulo",
    unitLabel: "Unidad de entrada",
    placeholder: "Introduce un número",
    invalid: "Introduce un ángulo válido",
    units: { deg: "Grados (deg)", rad: "Radianes (rad)", grad: "Gradianes (grad)" },
    outputTitle: "Valores convertidos",
  },
};

const PI = Math.PI;
// 모두 "도(deg) 기준"으로 정규화 후 변환
function toDeg(v: number, from: "deg"|"rad"|"grad"): number {
  if (from === "rad") return v * 180 / PI;
  if (from === "grad") return v * 0.9;        // 400 grad = 360 deg
  return v;
}
function fromDeg(deg: number, to: "deg"|"rad"|"grad"): number {
  if (to === "rad") return deg * PI / 180;
  if (to === "grad") return deg / 0.9;
  return deg;
}

function fmt(n: number): string {
  if (!isFinite(n)) return "-";
  return Number(n.toFixed(8)).toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export default function AngleConverter({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<AngleUnit>("deg");

  const input = value.trim() === "" ? NaN : Number(value);
  const deg = isNaN(input) ? null : toDeg(input, unit);
  const rows: AngleUnit[] = ["deg", "rad", "grad"];

  const inputCls =
    "w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const card = "rounded-xl border border-border bg-white p-4";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <label className="block text-xs text-muted-foreground">{t.valueLabel}</label>
          <input className={inputCls} inputMode="decimal" placeholder={t.placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
          <label className="mt-3 block text-xs text-muted-foreground">{t.unitLabel}</label>
          <select className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value as AngleUnit)}>
            {rows.map((u) => (
              <option key={u} value={u}>{t.units[u]}</option>
            ))}
          </select>
        </div>

        <div className={card}>
          <h3 className="font-semibold text-foreground">{t.outputTitle}</h3>
          {deg === null ? (
            <p className="mt-4 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-primary">{t.invalid}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {rows.map((u) => (
                <div key={u} className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">{t.units[u]}</span>
                  <span className="font-mono text-sm font-semibold text-primary">{fmt(fromDeg(deg, u))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GameContainer>
  );
}
