import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type Labels = {
  title: string;
  subtitle: string;
  currentPrice: string;
  afterPrice: string;
  contribution: string;
  holdingYears: string;
  completionYears: string;
  totalInvestment: string;
  netProfit: string;
  roi: string;
  annualReturn: string;
  grade: string;
  gradeExcellent: string;
  gradeGood: string;
  gradeFair: string;
  gradePoor: string;
  unit: string;
  reset: string;
  disclaimer: string;
};

const LABELS: Record<Locale, Labels> = {
  ko: {
    title: "재건축 수익성 계산기",
    subtitle: "Reconstruction Profit Calculator",
    currentPrice: "현재 아파트 가격 (만원)",
    afterPrice: "재건축 후 예상 가격 (만원)",
    contribution: "추가 분담금 (만원)",
    holdingYears: "보유 기간 (년)",
    completionYears: "재건축 완료까지 기간 (년)",
    totalInvestment: "총 투자금",
    netProfit: "순이익",
    roi: "ROI",
    annualReturn: "연평균 수익률",
    grade: "수익성 등급",
    gradeExcellent: "매우 좋음",
    gradeGood: "좋음",
    gradeFair: "보통",
    gradePoor: "나쁨",
    unit: "만원",
    reset: "초기화",
    disclaimer: "본 계산기는 참고용입니다. 실제 수익은 시장 상황에 따라 달라질 수 있습니다.",
  },
  en: {
    title: "Reconstruction Profit Calculator",
    subtitle: "Apartment Redevelopment ROI",
    currentPrice: "Current Apartment Price (10,000 KRW)",
    afterPrice: "Expected Post-Reconstruction Price (10,000 KRW)",
    contribution: "Additional Contribution (10,000 KRW)",
    holdingYears: "Holding Period (years)",
    completionYears: "Years Until Completion",
    totalInvestment: "Total Investment",
    netProfit: "Net Profit",
    roi: "ROI",
    annualReturn: "Annual Return",
    grade: "Profitability Grade",
    gradeExcellent: "Excellent",
    gradeGood: "Good",
    gradeFair: "Fair",
    gradePoor: "Poor",
    unit: "× 10,000 KRW",
    reset: "Reset",
    disclaimer: "For reference only. Actual returns may vary with market conditions.",
  },
  ja: {
    title: "再建築収益性計算機",
    subtitle: "Reconstruction Profit Calculator",
    currentPrice: "現在のマンション価格（万ウォン）",
    afterPrice: "再建築後の予想価格（万ウォン）",
    contribution: "追加負担金（万ウォン）",
    holdingYears: "保有期間（年）",
    completionYears: "再建築完了までの期間（年）",
    totalInvestment: "総投資額",
    netProfit: "純利益",
    roi: "ROI",
    annualReturn: "年平均収益率",
    grade: "収益性評価",
    gradeExcellent: "非常に良い",
    gradeGood: "良い",
    gradeFair: "普通",
    gradePoor: "悪い",
    unit: "万ウォン",
    reset: "リセット",
    disclaimer: "本計算機は参考用です。実際の収益は市場状況により異なります。",
  },
  fr: {
    title: "Calculateur de rentabilité de reconstruction",
    subtitle: "Reconstruction Profit Calculator",
    currentPrice: "Prix actuel de l'appartement (10 000 KRW)",
    afterPrice: "Prix estimé après reconstruction (10 000 KRW)",
    contribution: "Contribution supplémentaire (10 000 KRW)",
    holdingYears: "Durée de détention (ans)",
    completionYears: "Années avant la fin des travaux",
    totalInvestment: "Investissement total",
    netProfit: "Bénéfice net",
    roi: "ROI",
    annualReturn: "Rendement annuel moyen",
    grade: "Note de rentabilité",
    gradeExcellent: "Excellent",
    gradeGood: "Bon",
    gradeFair: "Moyen",
    gradePoor: "Mauvais",
    unit: "× 10 000 KRW",
    reset: "Réinitialiser",
    disclaimer: "À titre indicatif uniquement. Les rendements réels peuvent varier selon le marché.",
  },
  es: {
    title: "Calculadora de rentabilidad de reconstrucción",
    subtitle: "Reconstruction Profit Calculator",
    currentPrice: "Precio actual del apartamento (10 000 KRW)",
    afterPrice: "Precio estimado tras reconstrucción (10 000 KRW)",
    contribution: "Aportación adicional (10 000 KRW)",
    holdingYears: "Período de tenencia (años)",
    completionYears: "Años hasta la finalización",
    totalInvestment: "Inversión total",
    netProfit: "Beneficio neto",
    roi: "ROI",
    annualReturn: "Rentabilidad anual media",
    grade: "Calificación de rentabilidad",
    gradeExcellent: "Excelente",
    gradeGood: "Buena",
    gradeFair: "Regular",
    gradePoor: "Mala",
    unit: "× 10 000 KRW",
    reset: "Restablecer",
    disclaimer: "Solo de referencia. Los retornos reales pueden variar con las condiciones del mercado.",
  },
  zh: {
    title: "重建盈利计算器",
    subtitle: "Reconstruction Profit Calculator",
    currentPrice: "当前公寓价格（万韩元）",
    afterPrice: "重建后预期价格（万韩元）",
    contribution: "额外分担金（万韩元）",
    holdingYears: "持有期间（年）",
    completionYears: "重建完成所需年数",
    totalInvestment: "总投资金额",
    netProfit: "净利润",
    roi: "投资回报率",
    annualReturn: "年均回报率",
    grade: "盈利等级",
    gradeExcellent: "非常好",
    gradeGood: "好",
    gradeFair: "一般",
    gradePoor: "差",
    unit: "万韩元",
    reset: "重置",
    disclaimer: "本计算器仅供参考，实际收益可能因市场情况而有所不同。",
  },
};

function fmtMan(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

function getGrade(
  roi: number,
  t: Labels
): { label: string; color: string } {
  if (roi >= 50) return { label: t.gradeExcellent, color: "text-success" };
  if (roi >= 20) return { label: t.gradeGood, color: "text-primary" };
  if (roi >= 0) return { label: t.gradeFair, color: "text-warning" };
  return { label: t.gradePoor, color: "text-destructive" };
}

const ReconstructionProfitCalculator = ({ locale }: Props) => {
  const t = LABELS[locale] ?? LABELS.en;

  const [currentPrice, setCurrentPrice] = useState(80000);
  const [afterPrice, setAfterPrice] = useState(120000);
  const [contribution, setContribution] = useState(0);
  const [holdingYears, setHoldingYears] = useState(5);
  const [completionYears, setCompletionYears] = useState(10);

  const totalInvestment = currentPrice + contribution;
  const netProfit = afterPrice - totalInvestment;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const years = Math.max(completionYears, holdingYears, 1);
  const annualReturn =
    totalInvestment > 0 && afterPrice > 0
      ? (Math.pow(afterPrice / totalInvestment, 1 / years) - 1) * 100
      : 0;

  const grade = getGrade(roi, t);

  const handleReset = () => {
    setCurrentPrice(80000);
    setAfterPrice(120000);
    setContribution(0);
    setHoldingYears(5);
    setCompletionYears(10);
  };

  return (
    <GameContainer title={t.title} subtitle={t.subtitle} onReset={handleReset}>
      <div className="flex flex-col gap-8">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.currentPrice}
            </label>
            <input
              type="number"
              min={0}
              value={currentPrice}
              onChange={(e) => setCurrentPrice(Math.max(0, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.afterPrice}
            </label>
            <input
              type="number"
              min={0}
              value={afterPrice}
              onChange={(e) => setAfterPrice(Math.max(0, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.contribution}
            </label>
            <input
              type="number"
              min={0}
              value={contribution}
              onChange={(e) => setContribution(Math.max(0, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.holdingYears}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={holdingYears}
              onChange={(e) => setHoldingYears(Math.max(1, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.completionYears}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={completionYears}
              onChange={(e) => setCompletionYears(Math.max(1, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="p-8 bg-foreground rounded-[32px] text-background shadow-2xl space-y-6">
          {/* Grade */}
          <div className="text-center pb-4 border-b border-background/15">
            <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-2">
              {t.grade}
            </p>
            <p className={`text-4xl font-black ${grade.color}`}>{grade.label}</p>
          </div>

          {/* ROI + Annual */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-background/15">
            <div className="text-center">
              <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-1">
                {t.roi}
              </p>
              <p className={`text-3xl font-black ${roi >= 0 ? "text-primary" : "text-destructive"}`}>
                {roi.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-1">
                {t.annualReturn}
              </p>
              <p className={`text-3xl font-black ${annualReturn >= 0 ? "text-success" : "text-destructive"}`}>
                {annualReturn.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Total Investment + Net Profit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-1">
                {t.totalInvestment}
              </p>
              <p className="text-lg font-black text-background">
                {fmtMan(totalInvestment)}
                <span className="text-xs font-medium text-background/50 ml-1">{t.unit}</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-1">
                {t.netProfit}
              </p>
              <p className={`text-lg font-black ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {netProfit >= 0 ? "+" : ""}
                {fmtMan(netProfit)}
                <span className="text-xs font-medium text-background/50 ml-1">{t.unit}</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground italic">{t.disclaimer}</p>
      </div>
    </GameContainer>
  );
};

export default ReconstructionProfitCalculator;
