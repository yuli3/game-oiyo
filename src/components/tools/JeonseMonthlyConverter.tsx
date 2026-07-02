import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type Mode = "jeonse-to-monthly" | "monthly-to-jeonse";

const L: Record<Locale, {
  title: string;
  subtitle: string;
  modeJeonseToMonthly: string;
  modeMonthlyToJeonse: string;
  jeonseAmount: string;
  deposit: string;
  monthlyRent: string;
  conversionRate: string;
  calcBtn: string;
  resetBtn: string;
  result: string;
  calculatedMonthly: string;
  calculatedJeonse: string;
  comparison: string;
  favorable: string;
  unfavorable: string;
  neutral: string;
  favorableDesc: string;
  unfavorableDesc: string;
  neutralDesc: string;
  formula: string;
  won: string;
  wonUnit: string;
  note: string;
}> = {
  ko: {
    title: "전월세 전환 계산기",
    subtitle: "Jeonse ↔ Monthly Rent Converter",
    modeJeonseToMonthly: "전세 → 월세",
    modeMonthlyToJeonse: "월세 → 전세",
    jeonseAmount: "전세금 (만원)",
    deposit: "보증금 (만원)",
    monthlyRent: "월세 (만원)",
    conversionRate: "전월세 전환율 (%)",
    calcBtn: "계산하기",
    resetBtn: "초기화",
    result: "계산 결과",
    calculatedMonthly: "전환 월세",
    calculatedJeonse: "환산 전세금",
    comparison: "시세 비교",
    favorable: "유리",
    unfavorable: "불리",
    neutral: "적정",
    favorableDesc: "현재 월세가 전환율 기준보다 낮아 세입자에게 유리합니다.",
    unfavorableDesc: "현재 월세가 전환율 기준보다 높아 세입자에게 불리합니다.",
    neutralDesc: "현재 월세가 전환율 기준과 거의 동일합니다.",
    formula: "계산식: 월세 = (전세금 - 보증금) × 전환율 ÷ 12",
    won: "만원",
    wonUnit: "만원/월",
    note: "* 법정 전월세 전환율은 기준금리+2%p 이내입니다. 실제 시장 전환율은 지역별로 상이할 수 있습니다.",
  },
  en: {
    title: "Jeonse ↔ Monthly Rent Converter",
    subtitle: "Korean Lease Conversion Calculator",
    modeJeonseToMonthly: "Jeonse → Monthly",
    modeMonthlyToJeonse: "Monthly → Jeonse",
    jeonseAmount: "Jeonse Amount (₩10K)",
    deposit: "Security Deposit (₩10K)",
    monthlyRent: "Monthly Rent (₩10K)",
    conversionRate: "Conversion Rate (%)",
    calcBtn: "Calculate",
    resetBtn: "Reset",
    result: "Result",
    calculatedMonthly: "Converted Monthly Rent",
    calculatedJeonse: "Equivalent Jeonse",
    comparison: "Market Comparison",
    favorable: "Favorable",
    unfavorable: "Unfavorable",
    neutral: "Fair",
    favorableDesc: "Current rent is below the conversion rate benchmark — favorable for tenant.",
    unfavorableDesc: "Current rent exceeds the conversion rate benchmark — unfavorable for tenant.",
    neutralDesc: "Current rent is approximately at the conversion rate benchmark.",
    formula: "Formula: Monthly Rent = (Jeonse − Deposit) × Rate ÷ 12",
    won: "₩10K",
    wonUnit: "₩10K/mo",
    note: "* Legal conversion rate is within base rate + 2%p. Actual market rates vary by region.",
  },
  ja: {
    title: "チョンセ↔月極家賃変換計算機",
    subtitle: "韓国賃貸変換計算機",
    modeJeonseToMonthly: "チョンセ→月極",
    modeMonthlyToJeonse: "月極→チョンセ",
    jeonseAmount: "チョンセ金額（万ウォン）",
    deposit: "保証金（万ウォン）",
    monthlyRent: "月極家賃（万ウォン）",
    conversionRate: "転換率（%）",
    calcBtn: "計算",
    resetBtn: "リセット",
    result: "計算結果",
    calculatedMonthly: "換算月極家賃",
    calculatedJeonse: "換算チョンセ金額",
    comparison: "市場比較",
    favorable: "有利",
    unfavorable: "不利",
    neutral: "適正",
    favorableDesc: "現在の月極家賃は転換率基準より低く、入居者に有利です。",
    unfavorableDesc: "現在の月極家賃は転換率基準より高く、入居者に不利です。",
    neutralDesc: "現在の月極家賃は転換率基準とほぼ同じです。",
    formula: "計算式: 月極家賃 = (チョンセ − 保証金) × 転換率 ÷ 12",
    won: "万ウォン",
    wonUnit: "万ウォン/月",
    note: "* 法定転換率は基準金利+2%p以内です。実際の市場転換率は地域によって異なる場合があります。",
  },
  fr: {
    title: "Convertisseur Jeonse ↔ Loyer Mensuel",
    subtitle: "Calculateur de Conversion Locative Coréenne",
    modeJeonseToMonthly: "Jeonse → Mensuel",
    modeMonthlyToJeonse: "Mensuel → Jeonse",
    jeonseAmount: "Montant Jeonse (10K₩)",
    deposit: "Caution (10K₩)",
    monthlyRent: "Loyer mensuel (10K₩)",
    conversionRate: "Taux de conversion (%)",
    calcBtn: "Calculer",
    resetBtn: "Réinitialiser",
    result: "Résultat",
    calculatedMonthly: "Loyer mensuel converti",
    calculatedJeonse: "Jeonse équivalent",
    comparison: "Comparaison marché",
    favorable: "Favorable",
    unfavorable: "Défavorable",
    neutral: "Équitable",
    favorableDesc: "Le loyer actuel est inférieur au référentiel — favorable pour le locataire.",
    unfavorableDesc: "Le loyer actuel dépasse le référentiel — défavorable pour le locataire.",
    neutralDesc: "Le loyer actuel correspond approximativement au référentiel.",
    formula: "Formule : Loyer = (Jeonse − Caution) × Taux ÷ 12",
    won: "10K₩",
    wonUnit: "10K₩/mois",
    note: "* Le taux légal est limité au taux directeur + 2%. Les taux du marché varient selon la région.",
  },
  es: {
    title: "Convertidor Jeonse ↔ Alquiler Mensual",
    subtitle: "Calculadora de Conversión de Arrendamiento Coreano",
    modeJeonseToMonthly: "Jeonse → Mensual",
    modeMonthlyToJeonse: "Mensual → Jeonse",
    jeonseAmount: "Cantidad Jeonse (10K₩)",
    deposit: "Fianza (10K₩)",
    monthlyRent: "Alquiler mensual (10K₩)",
    conversionRate: "Tasa de conversión (%)",
    calcBtn: "Calcular",
    resetBtn: "Restablecer",
    result: "Resultado",
    calculatedMonthly: "Alquiler mensual convertido",
    calculatedJeonse: "Jeonse equivalente",
    comparison: "Comparación de mercado",
    favorable: "Favorable",
    unfavorable: "Desfavorable",
    neutral: "Justo",
    favorableDesc: "El alquiler actual es inferior al índice de conversión — favorable para el inquilino.",
    unfavorableDesc: "El alquiler actual supera el índice — desfavorable para el inquilino.",
    neutralDesc: "El alquiler actual está aproximadamente al nivel del índice.",
    formula: "Fórmula: Alquiler = (Jeonse − Fianza) × Tasa ÷ 12",
    won: "10K₩",
    wonUnit: "10K₩/mes",
    note: "* La tasa legal se limita al tipo base + 2%. Las tasas de mercado varían según la región.",
  },
  zh: {
    title: "全租↔月租转换计算器",
    subtitle: "韩国租赁转换计算器",
    modeJeonseToMonthly: "全租→月租",
    modeMonthlyToJeonse: "月租→全租",
    jeonseAmount: "全租金额（万韩元）",
    deposit: "保证金（万韩元）",
    monthlyRent: "月租（万韩元）",
    conversionRate: "转换率（%）",
    calcBtn: "计算",
    resetBtn: "重置",
    result: "计算结果",
    calculatedMonthly: "换算月租",
    calculatedJeonse: "换算全租金额",
    comparison: "市场比较",
    favorable: "有利",
    unfavorable: "不利",
    neutral: "适中",
    favorableDesc: "目前月租低于转换率基准，对租客有利。",
    unfavorableDesc: "目前月租高于转换率基准，对租客不利。",
    neutralDesc: "目前月租与转换率基准大致相同。",
    formula: "计算式：月租 = （全租金 − 保证金）× 转换率 ÷ 12",
    won: "万韩元",
    wonUnit: "万韩元/月",
    note: "* 法定转换率为基准利率+2%以内。实际市场转换率因地区而异。",
  },
};

function fmt(n: number): string {
  return Math.round(n * 10) / 10 === Math.round(n)
    ? Math.round(n).toLocaleString()
    : (Math.round(n * 10) / 10).toLocaleString();
}

const JeonseMonthlyConverter = ({ locale }: Props) => {
  const t = L[locale] ?? L.ko;

  const [mode, setMode] = useState<Mode>("jeonse-to-monthly");
  const [jeonseAmount, setJeonseAmount] = useState(30000);
  const [deposit, setDeposit] = useState(5000);
  const [monthlyRent, setMonthlyRent] = useState(80);
  const [rate, setRate] = useState(5.5);

  // Jeonse → Monthly: computed monthly from jeonse + deposit
  const computedMonthly = ((jeonseAmount - deposit) * (rate / 100)) / 12;
  // Monthly → Jeonse: computed jeonse from deposit + monthly
  const computedJeonse = deposit + (monthlyRent * 12) / (rate / 100);

  // Comparison: only relevant in Monthly→Jeonse mode
  // If actual monthly < computed benchmark monthly → favorable
  // In Jeonse→Monthly: compare input monthly vs computed monthly (only when user has entered monthly manually — skip here since mode drives display)
  let comparisonType: "favorable" | "unfavorable" | "neutral" = "neutral";
  if (mode === "monthly-to-jeonse") {
    const benchmarkMonthly = ((computedJeonse - deposit) * (rate / 100)) / 12;
    const diff = Math.abs(benchmarkMonthly - monthlyRent);
    if (diff < 1) {
      comparisonType = "neutral";
    } else if (monthlyRent < benchmarkMonthly) {
      comparisonType = "favorable";
    } else {
      comparisonType = "unfavorable";
    }
  } else {
    // Jeonse→Monthly mode: compare if user's jeonseAmount deposit mix is efficient
    // No direct comparison meaningful in this direction; show neutral
    comparisonType = "neutral";
  }

  const comparisonColors = {
    favorable: { card: "bg-success/10 border-success/30", badge: "bg-success/15 text-success", text: "text-success" },
    unfavorable: { card: "bg-destructive/10 border-destructive/30", badge: "bg-destructive/15 text-destructive", text: "text-destructive" },
    neutral: { card: "bg-info/10 border-info/30", badge: "bg-info/15 text-info", text: "text-info" },
  };
  const cc = comparisonColors[comparisonType];

  const handleReset = () => {
    setJeonseAmount(30000);
    setDeposit(5000);
    setMonthlyRent(80);
    setRate(5.5);
  };

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-2xl border border-border overflow-hidden mb-6">
        {(["jeonse-to-monthly", "monthly-to-jeonse"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-3 text-sm font-black transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-muted/20 text-muted-foreground hover:bg-accent"
            }`}
          >
            {m === "jeonse-to-monthly" ? t.modeJeonseToMonthly : t.modeMonthlyToJeonse}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="space-y-4 mb-6">
        {mode === "jeonse-to-monthly" ? (
          <>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm font-bold text-muted-foreground">{t.jeonseAmount}</label>
              <input
                type="number"
                min={0}
                step={100}
                value={jeonseAmount}
                onChange={(e) => setJeonseAmount(Math.max(0, Number(e.target.value)))}
                className="px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm font-bold text-muted-foreground">{t.deposit}</label>
              <input
                type="number"
                min={0}
                step={100}
                value={deposit}
                onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))}
                className="px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm font-bold text-muted-foreground">{t.deposit}</label>
              <input
                type="number"
                min={0}
                step={100}
                value={deposit}
                onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))}
                className="px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm font-bold text-muted-foreground">{t.monthlyRent}</label>
              <input
                type="number"
                min={0}
                step={1}
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Math.max(0, Number(e.target.value)))}
                className="px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>
          </>
        )}

        {/* Conversion rate slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-bold text-muted-foreground">{t.conversionRate}</label>
            <span className="text-sm font-black tabular-nums">{rate}%</span>
          </div>
          <input
            type="range"
            min={2}
            max={10}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
            <span>2%</span>
            <span>10%</span>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={handleReset}
          className="px-5 py-3 rounded-2xl border border-border bg-muted/20 font-bold text-sm hover:bg-accent transition-colors"
        >
          {t.resetBtn}
        </button>
      </div>

      {/* Result */}
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">{t.result}</p>
          {mode === "jeonse-to-monthly" ? (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">{t.calculatedMonthly}</p>
              <p className="text-4xl font-black text-primary">
                {fmt(Math.max(0, computedMonthly))}
                <span className="text-sm font-bold ml-2">{t.wonUnit}</span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">{t.calculatedJeonse}</p>
              <p className="text-4xl font-black text-primary">
                {fmt(Math.max(0, computedJeonse))}
                <span className="text-sm font-bold ml-2">{t.won}</span>
              </p>
            </div>
          )}
        </div>

        {/* Comparison (only in monthly→jeonse mode) */}
        {mode === "monthly-to-jeonse" && (
          <div className={`p-5 rounded-2xl border ${cc.card}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.comparison}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${cc.badge}`}>
                {t[comparisonType]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t[`${comparisonType}Desc` as keyof typeof t] as string}
            </p>
          </div>
        )}

        {/* Formula */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
          <p className="text-xs font-bold text-muted-foreground">{t.formula}</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-4">{t.note}</p>
    </div>
  );
};

export default JeonseMonthlyConverter;
