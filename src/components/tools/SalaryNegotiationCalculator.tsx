import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type ScenarioKey = "optimistic" | "moderate" | "conservative";

const L: Record<Locale, {
  title: string;
  subtitle: string;
  currentSalary: string;
  desiredRate: string;
  calcBtn: string;
  resetBtn: string;
  scenario: string;
  optimistic: string;
  moderate: string;
  conservative: string;
  afterSalary: string;
  monthly: string;
  netMonthly: string;
  increase: string;
  tipsTitle: string;
  tips: [string, string, string];
  won: string;
  pct: string;
  note: string;
}> = {
  ko: {
    title: "연봉 협상 시뮬레이터",
    subtitle: "Salary Negotiation Calculator",
    currentSalary: "현재 연봉 (만원)",
    desiredRate: "희망 인상률 (%)",
    calcBtn: "시뮬레이션",
    resetBtn: "초기화",
    scenario: "시나리오",
    optimistic: "낙관",
    moderate: "중간",
    conservative: "보수",
    afterSalary: "협상 후 연봉",
    monthly: "월 세전 급여",
    netMonthly: "세후 월 급여",
    increase: "인상액",
    tipsTitle: "협상 성공 팁",
    tips: [
      "시장 평균 연봉 데이터를 미리 조사해 근거를 제시하세요.",
      "구체적인 성과·기여도를 수치로 준비해 협상력을 높이세요.",
      "희망액보다 10~15% 높게 먼저 제시하는 앵커링 전략을 활용하세요.",
    ],
    won: "만원",
    pct: "%",
    note: "* 세후 월급은 근로소득세·4대보험 간이 계산 기준입니다.",
  },
  en: {
    title: "Salary Negotiation Simulator",
    subtitle: "Scenario-Based Raise Calculator",
    currentSalary: "Current Annual Salary (₩10K)",
    desiredRate: "Desired Raise Rate (%)",
    calcBtn: "Simulate",
    resetBtn: "Reset",
    scenario: "Scenario",
    optimistic: "Optimistic",
    moderate: "Moderate",
    conservative: "Conservative",
    afterSalary: "New Annual Salary",
    monthly: "Monthly Gross",
    netMonthly: "Monthly Net",
    increase: "Salary Increase",
    tipsTitle: "Negotiation Tips",
    tips: [
      "Research market salary data in advance to back your request with evidence.",
      "Quantify your achievements and contributions to strengthen your position.",
      "Use anchoring — open 10–15% above your target to leave negotiation room.",
    ],
    won: "₩10K",
    pct: "%",
    note: "* Monthly net is estimated using simplified Korean income tax and insurance rates.",
  },
  ja: {
    title: "給与交渉シミュレーター",
    subtitle: "シナリオ別昇給計算機",
    currentSalary: "現在の年俸（万ウォン）",
    desiredRate: "希望昇給率（%）",
    calcBtn: "シミュレート",
    resetBtn: "リセット",
    scenario: "シナリオ",
    optimistic: "楽観",
    moderate: "中間",
    conservative: "保守",
    afterSalary: "交渉後の年俸",
    monthly: "月額税前",
    netMonthly: "月額手取り",
    increase: "昇給額",
    tipsTitle: "交渉成功のコツ",
    tips: [
      "市場平均給与データを事前に調査し、根拠を示しましょう。",
      "具体的な成果や貢献度を数値で準備して交渉力を高めましょう。",
      "希望額より10〜15%高めに提示するアンカリング戦略を活用しましょう。",
    ],
    won: "万ウォン",
    pct: "%",
    note: "* 手取り月給は韓国の簡易所得税・保険料を基準とした概算です。",
  },
  fr: {
    title: "Simulateur de Négociation Salariale",
    subtitle: "Calculateur de Hausse Salariale par Scénario",
    currentSalary: "Salaire annuel actuel (10K₩)",
    desiredRate: "Taux d'augmentation souhaité (%)",
    calcBtn: "Simuler",
    resetBtn: "Réinitialiser",
    scenario: "Scénario",
    optimistic: "Optimiste",
    moderate: "Modéré",
    conservative: "Conservateur",
    afterSalary: "Nouveau salaire annuel",
    monthly: "Salaire brut mensuel",
    netMonthly: "Salaire net mensuel",
    increase: "Augmentation",
    tipsTitle: "Conseils de négociation",
    tips: [
      "Recherchez les données salariales du marché à l'avance pour appuyer votre demande.",
      "Quantifiez vos réalisations pour renforcer votre position.",
      "Utilisez l'ancrage — commencez 10–15% au-dessus de votre objectif.",
    ],
    won: "10K₩",
    pct: "%",
    note: "* Le salaire net mensuel est estimé sur la base des taux coréens simplifiés.",
  },
  es: {
    title: "Simulador de Negociación Salarial",
    subtitle: "Calculadora de Aumento por Escenario",
    currentSalary: "Salario anual actual (10K₩)",
    desiredRate: "Tasa de aumento deseada (%)",
    calcBtn: "Simular",
    resetBtn: "Restablecer",
    scenario: "Escenario",
    optimistic: "Optimista",
    moderate: "Moderado",
    conservative: "Conservador",
    afterSalary: "Nuevo salario anual",
    monthly: "Salario bruto mensual",
    netMonthly: "Salario neto mensual",
    increase: "Incremento salarial",
    tipsTitle: "Consejos de negociación",
    tips: [
      "Investiga los datos del mercado salarial con antelación para respaldar tu solicitud.",
      "Cuantifica tus logros y contribuciones para fortalecer tu posición.",
      "Usa el anclaje: empieza un 10–15% por encima de tu objetivo.",
    ],
    won: "10K₩",
    pct: "%",
    note: "* El salario neto mensual se estima usando tasas coreanas simplificadas.",
  },
  zh: {
    title: "薪资谈判模拟器",
    subtitle: "情境别加薪计算器",
    currentSalary: "当前年薪（万韩元）",
    desiredRate: "期望加薪率（%）",
    calcBtn: "模拟",
    resetBtn: "重置",
    scenario: "情境",
    optimistic: "乐观",
    moderate: "中间",
    conservative: "保守",
    afterSalary: "谈判后年薪",
    monthly: "月税前薪资",
    netMonthly: "月税后薪资",
    increase: "加薪金额",
    tipsTitle: "谈判成功技巧",
    tips: [
      "事先调查市场平均薪资数据，以数据支撑你的请求。",
      "用具体数字量化你的成就与贡献，提升谈判筹码。",
      "运用锚定策略——先提出比目标高10~15%的数字，留下谈判空间。",
    ],
    won: "万韩元",
    pct: "%",
    note: "* 月税后薪资为韩国简易所得税及保险费概算。",
  },
};

function calcNetMonthly(annualWon: number): number {
  // annualWon is in KRW (not 만원)
  const monthlyGross = annualWon / 12;
  const nationalPension = Math.floor(monthlyGross * 0.045);
  const healthInsurance = Math.floor(monthlyGross * 0.03545);
  const longTermCare = Math.floor(healthInsurance * 0.1295);
  const employmentInsurance = Math.floor(monthlyGross * 0.009);

  const annualInsurance = (nationalPension + healthInsurance + longTermCare + employmentInsurance) * 12;
  const taxableIncome = Math.max(0, annualWon - annualInsurance - 1500000);

  let incomeTax = 0;
  if (taxableIncome <= 12000000) incomeTax = Math.floor((taxableIncome * 0.06) / 12);
  else if (taxableIncome <= 46000000) incomeTax = Math.floor((720000 + (taxableIncome - 12000000) * 0.15) / 12);
  else if (taxableIncome <= 88000000) incomeTax = Math.floor((5820000 + (taxableIncome - 46000000) * 0.24) / 12);
  else if (taxableIncome <= 150000000) incomeTax = Math.floor((15900000 + (taxableIncome - 88000000) * 0.35) / 12);
  else incomeTax = Math.floor((37600000 + (taxableIncome - 150000000) * 0.38) / 12);

  const localTax = Math.floor(incomeTax * 0.1);
  const totalDeduction = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localTax;
  return Math.floor(monthlyGross - totalDeduction);
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

const SCENARIO_MULTIPLIERS: Record<ScenarioKey, number> = {
  optimistic: 1.0,
  moderate: 0.7,
  conservative: 0.4,
};

const SCENARIO_COLORS: Record<ScenarioKey, { card: string; badge: string; text: string }> = {
  optimistic: { card: "bg-success/10 border-success/30", badge: "bg-success/15 text-success", text: "text-success" },
  moderate: { card: "bg-info/10 border-info/30", badge: "bg-info/15 text-info", text: "text-info" },
  conservative: { card: "bg-warning/10 border-warning/30", badge: "bg-warning/15 text-warning", text: "text-warning" },
};

const SalaryNegotiationCalculator = ({ locale }: Props) => {
  const t = L[locale] ?? L.en;

  const [currentSalary, setCurrentSalary] = useState(5000); // 만원
  const [desiredRate, setDesiredRate] = useState(10); // %

  const scenarios: ScenarioKey[] = ["optimistic", "moderate", "conservative"];

  const getResult = (key: ScenarioKey) => {
    const actualRate = desiredRate * SCENARIO_MULTIPLIERS[key];
    const newSalaryMan = currentSalary * (1 + actualRate / 100);
    const newSalaryKrw = newSalaryMan * 10000;
    const increaseMan = newSalaryMan - currentSalary;
    const monthlyGross = newSalaryKrw / 12;
    const netMonthly = calcNetMonthly(newSalaryKrw);
    return { actualRate, newSalaryMan, increaseMan, monthlyGross, netMonthly };
  };

  const handleReset = () => {
    setCurrentSalary(5000);
    setDesiredRate(10);
  };

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3 items-center">
          <label className="text-sm font-bold text-muted-foreground">{t.currentSalary}</label>
          <input
            type="number"
            min={0}
            step={100}
            value={currentSalary}
            onChange={(e) => setCurrentSalary(Math.max(0, Number(e.target.value)))}
            className="px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 items-center">
          <label className="text-sm font-bold text-muted-foreground">{t.desiredRate}</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={desiredRate}
            onChange={(e) => setDesiredRate(Math.min(100, Math.max(0, Number(e.target.value))))}
            className="px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>
      </div>

      {/* Reset button */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={handleReset}
          className="px-5 py-3 rounded-2xl border border-border bg-muted/20 font-bold text-sm hover:bg-accent transition-colors"
        >
          {t.resetBtn}
        </button>
      </div>

      {/* Scenario cards */}
      <div className="space-y-4 mb-8">
        {scenarios.map((key) => {
          const r = getResult(key);
          const colors = SCENARIO_COLORS[key];
          const label = t[key];
          return (
            <div key={key} className={`p-5 rounded-2xl border ${colors.card}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t.scenario}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-black ${colors.badge}`}>
                  {label} ({fmt(r.actualRate)}%)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t.afterSalary}</p>
                  <p className={`text-lg font-black ${colors.text}`}>{fmt(r.newSalaryMan)}<span className="text-xs font-bold ml-1">{t.won}</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t.monthly}</p>
                  <p className={`text-lg font-black ${colors.text}`}>{fmt(r.monthlyGross / 10000)}<span className="text-xs font-bold ml-1">{t.won}</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t.netMonthly}</p>
                  <p className={`text-lg font-black ${colors.text}`}>{fmt(r.netMonthly / 10000)}<span className="text-xs font-bold ml-1">{t.won}</span></p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 flex justify-between text-xs font-bold text-muted-foreground">
                <span>{t.increase}</span>
                <span className={colors.text}>+{fmt(r.increaseMan)} {t.won}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="p-5 rounded-2xl bg-info/10 border border-info/30">
        <p className="text-xs font-black mb-3 text-info">{t.tipsTitle}</p>
        <ul className="space-y-2">
          {t.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
              <span className="font-black text-info shrink-0">{i + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-4">{t.note}</p>
    </div>
  );
};

export default SalaryNegotiationCalculator;
