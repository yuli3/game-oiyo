import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  m1: string; // X의 Y%
  m2: string; // X는 Y의 몇%
  m3: string; // A→B 변화율
  m4: string; // 할인가
  of: string;
  is: string;
  percentOf: string;
  from: string;
  to: string;
  price: string;
  discount: string;
  result: string;
  saved: string;
  increase: string;
  decrease: string;
}

const L: Record<string, UiLabels> = {
  en: { m1: "What is Y% of X?", m2: "X is what percent of Y?", m3: "Percent change A → B", m4: "Discount price", of: "of", is: "is", percentOf: "% of", from: "From", to: "To", price: "Price", discount: "Discount %", result: "Result", saved: "You save", increase: "increase", decrease: "decrease" },
  ko: { m1: "X의 Y%는?", m2: "X는 Y의 몇 %?", m3: "변화율 A → B", m4: "할인가", of: "의", is: "은(는)", percentOf: "% (대비)", from: "이전", to: "이후", price: "정가", discount: "할인 %", result: "결과", saved: "절약액", increase: "증가", decrease: "감소" },
  ja: { m1: "Xの Y% は？", m2: "X は Y の何 %？", m3: "変化率 A → B", m4: "割引価格", of: "の", is: "は", percentOf: "% (対比)", from: "前", to: "後", price: "定価", discount: "割引 %", result: "結果", saved: "節約額", increase: "増加", decrease: "減少" },
  zh: { m1: "X 的 Y% 是？", m2: "X 是 Y 的百分之几？", m3: "变化率 A → B", m4: "折扣价", of: "的", is: "是", percentOf: "%", from: "原值", to: "新值", price: "原价", discount: "折扣 %", result: "结果", saved: "节省", increase: "增加", decrease: "减少" },
  fr: { m1: "Combien font Y% de X ?", m2: "X représente quel % de Y ?", m3: "Variation A → B", m4: "Prix remisé", of: "de", is: "est", percentOf: "% de", from: "De", to: "À", price: "Prix", discount: "Remise %", result: "Résultat", saved: "Économie", increase: "hausse", decrease: "baisse" },
  es: { m1: "¿Cuánto es Y% de X?", m2: "¿X es qué % de Y?", m3: "Variación A → B", m4: "Precio con descuento", of: "de", is: "es", percentOf: "% de", from: "De", to: "A", price: "Precio", discount: "Descuento %", result: "Resultado", saved: "Ahorras", increase: "aumento", decrease: "descenso" },
};

const r = (n: number) => (isFinite(n) ? Math.round(n * 100) / 100 : 0);
const num = (s: string) => parseFloat(s);

interface Props {
  locale: Locale;
}

export default function PercentageCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  // mode 1
  const [x1, setX1] = useState("200");
  const [y1, setY1] = useState("15");
  // mode 2
  const [x2, setX2] = useState("30");
  const [y2, setY2] = useState("200");
  // mode 3
  const [a3, setA3] = useState("100");
  const [b3, setB3] = useState("125");
  // mode 4
  const [price, setPrice] = useState("50000");
  const [disc, setDisc] = useState("20");

  const inputCls =
    "w-24 rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";
  const card = "rounded-lg border border-border bg-card p-4";
  const resultCls = "mt-3 font-mono text-lg font-bold text-primary";

  const m1 = (num(x1) * num(y1)) / 100;
  const m2 = (num(x2) / num(y2)) * 100;
  const change = ((num(b3) - num(a3)) / num(a3)) * 100;
  const discPrice = num(price) * (1 - num(disc) / 100);
  const saved = num(price) - discPrice;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={card}>
        <p className="text-sm font-bold text-foreground">{t.m1}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <input className={inputCls} type="number" value={y1} onChange={(e) => setY1(e.target.value)} />
          <span>{t.percentOf}</span>
          <input className={inputCls} type="number" value={x1} onChange={(e) => setX1(e.target.value)} />
        </div>
        <p className={resultCls}>{r(m1).toLocaleString()}</p>
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-foreground">{t.m2}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <input className={inputCls} type="number" value={x2} onChange={(e) => setX2(e.target.value)} />
          <span>/</span>
          <input className={inputCls} type="number" value={y2} onChange={(e) => setY2(e.target.value)} />
        </div>
        <p className={resultCls}>{r(m2).toLocaleString()}%</p>
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-foreground">{t.m3}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <input className={inputCls} type="number" value={a3} onChange={(e) => setA3(e.target.value)} />
          <span>→</span>
          <input className={inputCls} type="number" value={b3} onChange={(e) => setB3(e.target.value)} />
        </div>
        <p className={resultCls}>
          {change >= 0 ? "+" : ""}
          {r(change).toLocaleString()}% <span className="text-sm font-normal text-muted-foreground">({change >= 0 ? t.increase : t.decrease})</span>
        </p>
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-foreground">{t.m4}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <input className={inputCls} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <span>−</span>
          <input className={inputCls} type="number" value={disc} onChange={(e) => setDisc(e.target.value)} />
          <span>{t.discount}</span>
        </div>
        <p className={resultCls}>{r(discPrice).toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">
          {t.saved}: {r(saved).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
