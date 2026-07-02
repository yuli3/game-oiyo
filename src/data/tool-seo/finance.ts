import type { Locale } from "../../lib/i18n";

export type ActiveLocale = Locale;

export type FinanceToolSlug =
  | "roi-calculator"
  | "compound-interest-calculator"
  | "brokerage-calculator"
  | "deposit-calculator"
  | "stock-average-calculator";

type SeoLink = {
  href: string;
  label: string;
  desc: string;
};

export type FinanceToolSeoContent = {
  eyebrow: string;
  introTitle: string;
  intro: string;
  howToTitle: string;
  steps: string[];
  highlightsTitle: string;
  highlights: { title: string; body: string }[];
  faqTitle: string;
  faqs: { question: string; answer: string }[];
  relatedTitle: string;
  related: SeoLink[];
  disclaimer: string;
};

type FinanceSeed = {
  tool: string;
  introTitle: string;
  intro: string;
  inputs: string;
  metric: string;
  decision: string;
  caution: string;
  related: SeoLink[];
};

type LocaleCopy = {
  eyebrow: string;
  howToTitle: string;
  highlightsTitle: string;
  metricTitle: string;
  decisionTitle: string;
  cautionTitle: string;
  faqTitle: string;
  relatedTitle: string;
  disclaimer: string;
  stepInput: (seed: FinanceSeed) => string;
  stepReview: (seed: FinanceSeed) => string;
  stepCompare: (seed: FinanceSeed) => string;
  faqAccuracy: (seed: FinanceSeed) => string;
  faqInputs: (seed: FinanceSeed) => string;
  faqUse: (seed: FinanceSeed) => string;
  answerAccuracy: (seed: FinanceSeed) => string;
};

const localeCopy: Record<ActiveLocale, LocaleCopy> = {
  ko: {
    eyebrow: "finance calculator",
    howToTitle: "계산 순서",
    highlightsTitle: "해석 포인트",
    metricTitle: "핵심 공식",
    decisionTitle: "비교 기준",
    cautionTitle: "확인할 한계",
    faqTitle: "자주 묻는 질문",
    relatedTitle: "함께 쓰면 좋은 계산기",
    disclaimer: "이 계산기는 교육용 추정 도구입니다. 실제 세금, 수수료, 상품 약관, 투자 의사결정은 최신 자료와 전문가 조언을 함께 확인하세요.",
    stepInput: (seed) => `${seed.tool}에 필요한 값을 입력합니다. ${seed.inputs}`,
    stepReview: (seed) => `결과에서 ${seed.metric}를 먼저 확인합니다.`,
    stepCompare: (seed) => `${seed.decision} 단, ${seed.caution}`,
    faqAccuracy: (seed) => `${seed.tool} 결과는 정확한가요?`,
    faqInputs: () => `어떤 값을 입력해야 하나요?`,
    faqUse: () => `결과를 어떻게 활용하면 좋나요?`,
    answerAccuracy: (seed) => `${seed.metric} 기준의 빠른 추정값입니다. ${seed.caution}`,
  },
  en: {
    eyebrow: "finance calculator",
    howToTitle: "How to calculate it",
    highlightsTitle: "How to read the result",
    metricTitle: "Core formula",
    decisionTitle: "Decision lens",
    cautionTitle: "What to double-check",
    faqTitle: "Frequently asked questions",
    relatedTitle: "Related calculators",
    disclaimer: "This calculator is for educational estimates. Check current tax rules, fees, product terms, and professional advice before making financial decisions.",
    stepInput: (seed) => `Enter the values required by the ${seed.tool}. ${seed.inputs}`,
    stepReview: (seed) => `Review the result with this metric first: ${seed.metric}`,
    stepCompare: (seed) => `${seed.decision} Remember: ${seed.caution}`,
    faqAccuracy: (seed) => `Is the ${seed.tool} result exact?`,
    faqInputs: () => "What inputs do I need?",
    faqUse: () => "How should I use the result?",
    answerAccuracy: (seed) => `It is a quick estimate based on ${seed.metric}. ${seed.caution}`,
  },
  ja: {
    eyebrow: "finance calculator",
    howToTitle: "計算手順",
    highlightsTitle: "結果の読み方",
    metricTitle: "基本式",
    decisionTitle: "比較の視点",
    cautionTitle: "確認すべき点",
    faqTitle: "よくある質問",
    relatedTitle: "関連計算ツール",
    disclaimer: "この計算ツールは学習用の概算です。実際の税制、手数料、商品条件、投資判断は最新情報と専門家の助言を確認してください。",
    stepInput: (seed) => `${seed.tool}に必要な値を入力します。${seed.inputs}`,
    stepReview: (seed) => `まず ${seed.metric} を基準に結果を確認します。`,
    stepCompare: (seed) => `${seed.decision} ただし、${seed.caution}`,
    faqAccuracy: (seed) => `${seed.tool}の結果は正確ですか？`,
    faqInputs: () => "どの値を入力しますか？",
    faqUse: () => "結果はどう活用しますか？",
    answerAccuracy: (seed) => `${seed.metric} に基づく簡易推定です。${seed.caution}`,
  },
  fr: {
    eyebrow: "finance calculator",
    howToTitle: "Méthode de calcul",
    highlightsTitle: "Lire le résultat",
    metricTitle: "Formule clé",
    decisionTitle: "Angle de décision",
    cautionTitle: "À vérifier",
    faqTitle: "Questions fréquentes",
    relatedTitle: "Calculateurs liés",
    disclaimer: "Ce calculateur fournit une estimation pédagogique. Vérifiez les règles fiscales, frais, conditions produit et conseils professionnels avant toute décision financière.",
    stepInput: (seed) => `Saisissez les valeurs nécessaires au ${seed.tool}. ${seed.inputs}`,
    stepReview: (seed) => `Commencez par lire le résultat avec cette mesure : ${seed.metric}`,
    stepCompare: (seed) => `${seed.decision} À retenir : ${seed.caution}`,
    faqAccuracy: (seed) => `Le résultat du ${seed.tool} est-il exact ?`,
    faqInputs: () => "Quelles données faut-il saisir ?",
    faqUse: () => "Comment utiliser le résultat ?",
    answerAccuracy: (seed) => `C'est une estimation rapide fondée sur ${seed.metric}. ${seed.caution}`,
  },
  es: {
    eyebrow: "finance calculator",
    howToTitle: "Cómo calcularlo",
    highlightsTitle: "Cómo interpretar el resultado",
    metricTitle: "Fórmula clave",
    decisionTitle: "Criterio de decisión",
    cautionTitle: "Qué revisar",
    faqTitle: "Preguntas frecuentes",
    relatedTitle: "Calculadoras relacionadas",
    disclaimer: "Esta calculadora ofrece estimaciones educativas. Revisa normas fiscales, comisiones, condiciones del producto y asesoría profesional antes de decidir.",
    stepInput: (seed) => `Introduce los valores necesarios para ${seed.tool}. ${seed.inputs}`,
    stepReview: (seed) => `Revisa primero el resultado con esta métrica: ${seed.metric}`,
    stepCompare: (seed) => `${seed.decision} Recuerda: ${seed.caution}`,
    faqAccuracy: (seed) => `¿El resultado de ${seed.tool} es exacto?`,
    faqInputs: () => "¿Qué datos necesito?",
    faqUse: () => "¿Cómo debo usar el resultado?",
    answerAccuracy: (seed) => `Es una estimación rápida basada en ${seed.metric}. ${seed.caution}`,
  },
  zh: {
    eyebrow: "finance calculator",
    howToTitle: "计算步骤",
    highlightsTitle: "如何解读结果",
    metricTitle: "核心公式",
    decisionTitle: "比较角度",
    cautionTitle: "需要复核",
    faqTitle: "常见问题",
    relatedTitle: "相关计算器",
    disclaimer: "本计算器仅用于教育性估算。实际税费、手续费、产品条款和投资决策，请结合最新资料与专业意见。",
    stepInput: (seed) => `输入 ${seed.tool} 所需的数值。${seed.inputs}`,
    stepReview: (seed) => `先用这个指标查看结果：${seed.metric}`,
    stepCompare: (seed) => `${seed.decision} 请注意：${seed.caution}`,
    faqAccuracy: (seed) => `${seed.tool} 的结果准确吗？`,
    faqInputs: () => "需要输入哪些数据？",
    faqUse: () => "应该如何使用结果？",
    answerAccuracy: (seed) => `这是基于 ${seed.metric} 的快速估算。${seed.caution}`,
  },
};

function buildFinanceSeo(locale: ActiveLocale, seed: FinanceSeed): FinanceToolSeoContent {
  const copy = localeCopy[locale];

  return {
    eyebrow: copy.eyebrow,
    introTitle: seed.introTitle,
    intro: seed.intro,
    howToTitle: copy.howToTitle,
    steps: [
      copy.stepInput(seed),
      copy.stepReview(seed),
      copy.stepCompare(seed),
    ],
    highlightsTitle: copy.highlightsTitle,
    highlights: [
      { title: copy.metricTitle, body: seed.metric },
      { title: copy.decisionTitle, body: seed.decision },
      { title: copy.cautionTitle, body: seed.caution },
    ],
    faqTitle: copy.faqTitle,
    faqs: [
      { question: copy.faqAccuracy(seed), answer: copy.answerAccuracy(seed) },
      { question: copy.faqInputs(seed), answer: seed.inputs },
      { question: copy.faqUse(seed), answer: seed.decision },
    ],
    relatedTitle: copy.relatedTitle,
    related: seed.related,
    disclaimer: copy.disclaimer,
  };
}

const seeds: Record<FinanceToolSlug, Record<ActiveLocale, FinanceSeed>> = {
  "roi-calculator": {
    ko: {
      tool: "ROI 계산기",
      introTitle: "투자 비용 대비 회수 성과를 한눈에 비교하세요",
      intro: "ROI는 투자금이 얼마나 효율적으로 수익으로 돌아왔는지 보는 기본 지표입니다. 광고 캠페인, 장비 구매, 교육비, 부동산 개선처럼 비용과 회수 금액이 있는 의사결정을 같은 기준으로 비교할 때 유용합니다.",
      inputs: "초기 투자 비용과 투자로 얻은 총수익 또는 순이익을 준비하세요.",
      metric: "ROI = (투자 수익 - 투자 비용) / 투자 비용 x 100",
      decision: "ROI가 높아도 회수 기간, 변동성, 세금, 기회비용을 함께 보아야 합니다.",
      caution: "현금흐름 시점과 거래 비용을 빠뜨리면 실제 수익률보다 높게 보일 수 있습니다.",
      related: [
        { href: "/ko/compound-interest-calculator/", label: "복리 계산기", desc: "장기 수익이 시간이 지나며 어떻게 커지는지 확인합니다." },
        { href: "/ko/stock-average-calculator/", label: "주식 평균단가 계산기", desc: "추가 매수 후 평균 매입 단가를 계산합니다." },
      ],
    },
    en: {
      tool: "ROI calculator",
      introTitle: "Compare return against the cost of each investment",
      intro: "ROI is a compact way to compare how efficiently a cost turns into a gain. Use it for campaigns, equipment, education, rental improvements, or any decision where you can estimate cost and return.",
      inputs: "Prepare the initial investment cost and either the total gain or net profit from the investment.",
      metric: "ROI = (gain from investment - investment cost) / investment cost x 100",
      decision: "A higher ROI is useful, but payback period, volatility, taxes, and opportunity cost still matter.",
      caution: "If timing, fees, or taxes are excluded, the result can look better than the actual outcome.",
      related: [
        { href: "/en/compound-interest-calculator/", label: "Compound interest calculator", desc: "Estimate how returns compound over a longer holding period." },
        { href: "/en/stock-average-calculator/", label: "Stock average calculator", desc: "Calculate the average cost basis after additional purchases." },
      ],
    },
    ja: {
      tool: "ROI計算機",
      introTitle: "投資コストに対する回収効率を比較する",
      intro: "ROIは、支払ったコストがどれだけ効率よく利益に変わったかを見る基本指標です。広告、設備、教育、不動産改善などを同じ基準で比較できます。",
      inputs: "初期投資額と、投資から得た総収益または純利益を用意します。",
      metric: "ROI = (投資収益 - 投資コスト) / 投資コスト x 100",
      decision: "ROIが高くても、回収期間、変動性、税金、機会費用を合わせて確認します。",
      caution: "資金回収の時期、手数料、税金を除くと実際より高く見えることがあります。",
      related: [
        { href: "/ja/compound-interest-calculator/", label: "複利計算機", desc: "長期リターンが時間とともにどう増えるか確認します。" },
        { href: "/ja/stock-average-calculator/", label: "株式平均単価計算機", desc: "追加購入後の平均取得単価を計算します。" },
      ],
    },
    fr: {
      tool: "calculateur ROI",
      introTitle: "Comparer le rendement au coût de chaque investissement",
      intro: "Le ROI mesure l'efficacité avec laquelle un coût se transforme en gain. Il aide à comparer campagnes, équipements, formation ou travaux locatifs avec une même base.",
      inputs: "Préparez le coût initial et le gain total ou bénéfice net obtenu.",
      metric: "ROI = (gain de l'investissement - coût de l'investissement) / coût x 100",
      decision: "Un ROI élevé doit être lu avec le délai de retour, la volatilité, les impôts et le coût d'opportunité.",
      caution: "Sans calendrier des flux, frais ou impôts, le résultat peut surestimer la performance réelle.",
      related: [
        { href: "/fr/compound-interest-calculator/", label: "Calculateur d'intérêts composés", desc: "Estimez l'effet de la capitalisation dans le temps." },
        { href: "/fr/stock-average-calculator/", label: "Prix moyen d'actions", desc: "Calculez le prix de revient après achats supplémentaires." },
      ],
    },
    es: {
      tool: "calculadora ROI",
      introTitle: "Compara el retorno frente al costo de cada inversión",
      intro: "El ROI resume qué tan eficientemente un costo se convierte en ganancia. Úsalo para campañas, equipos, educación o mejoras de alquiler con una base común.",
      inputs: "Prepara el costo inicial y la ganancia total o beneficio neto de la inversión.",
      metric: "ROI = (ganancia de la inversión - costo de la inversión) / costo x 100",
      decision: "Un ROI alto debe revisarse junto con plazo de recuperación, volatilidad, impuestos y costo de oportunidad.",
      caution: "Si excluyes calendario de flujos, comisiones o impuestos, el resultado puede verse demasiado optimista.",
      related: [
        { href: "/es/compound-interest-calculator/", label: "Interés compuesto", desc: "Estima cómo crecen los retornos con el tiempo." },
        { href: "/es/stock-average-calculator/", label: "Precio promedio de acciones", desc: "Calcula el costo promedio tras nuevas compras." },
      ],
    },
    zh: {
      tool: "ROI 投资回报率计算器",
      introTitle: "比较每笔投入相对成本的回收效率",
      intro: "ROI 用来衡量投入成本转化为收益的效率。广告、设备、教育、出租房改造等有成本与收益的决策，都可以用同一指标比较。",
      inputs: "准备初始投资成本，以及投资带来的总收益或净利润。",
      metric: "ROI = (投资收益 - 投资成本) / 投资成本 x 100",
      decision: "ROI 较高时，也要同时查看回收期、波动、税费和机会成本。",
      caution: "若忽略现金流时间、手续费或税费，结果可能高估真实收益。",
      related: [
        { href: "/zh/compound-interest-calculator/", label: "复利计算器", desc: "查看长期收益如何随时间累积。" },
        { href: "/zh/stock-average-calculator/", label: "股票平均成本计算器", desc: "计算追加买入后的平均成本。" },
      ],
    },
  },
  "compound-interest-calculator": {
    ko: {
      tool: "복리 계산기",
      introTitle: "원금, 수익률, 기간이 만드는 장기 결과를 확인하세요",
      intro: "복리는 이자가 다시 원금에 더해져 다음 기간의 이자를 만드는 구조입니다. 같은 연수익률이라도 기간과 적립 주기에 따라 결과가 크게 달라지므로 장기 저축과 투자 계획의 출발점으로 쓰기 좋습니다.",
      inputs: "초기 원금, 연이율, 투자 기간, 납입 주기나 추가 납입액을 입력하세요.",
      metric: "미래가치 = 원금 x (1 + 수익률 / 복리횟수) ^ (복리횟수 x 기간)",
      decision: "기간을 늘릴지, 수익률을 높일지, 정기 납입을 추가할지 시나리오별로 비교하세요.",
      caution: "고정 수익률 가정은 실제 시장 변동, 세금, 수수료, 중도 인출을 반영하지 않을 수 있습니다.",
      related: [
        { href: "/ko/roi-calculator/", label: "ROI 계산기", desc: "투입 비용 대비 회수 성과를 계산합니다." },
        { href: "/ko/deposit-calculator/", label: "예금·적금 계산기", desc: "세후 이자와 만기 수령액을 비교합니다." },
      ],
    },
    en: {
      tool: "compound interest calculator",
      introTitle: "See how principal, return, and time shape long-term growth",
      intro: "Compound interest adds earned interest back into the balance so the next period earns interest on a larger base. Small differences in time, rate, and contribution schedule can change the final amount dramatically.",
      inputs: "Enter principal, annual rate, term, compounding frequency, and optional recurring contributions.",
      metric: "Future value = principal x (1 + rate / compounding periods) ^ (compounding periods x years)",
      decision: "Compare scenarios by changing time horizon, expected return, or recurring contribution amount.",
      caution: "A fixed return assumption may not reflect market volatility, taxes, fees, or early withdrawals.",
      related: [
        { href: "/en/roi-calculator/", label: "ROI calculator", desc: "Compare return against the cost of an investment." },
        { href: "/en/deposit-calculator/", label: "Deposit calculator", desc: "Estimate after-tax interest and maturity value." },
      ],
    },
    ja: {
      tool: "複利計算機",
      introTitle: "元本、利回り、期間が長期結果に与える影響を見る",
      intro: "複利は得た利息を元本に組み入れ、次の期間により大きな元本へ利息がつく仕組みです。期間、利率、積立頻度で最終額は大きく変わります。",
      inputs: "元本、年利、期間、複利回数、任意の定期積立額を入力します。",
      metric: "将来価値 = 元本 x (1 + 利率 / 複利回数) ^ (複利回数 x 年数)",
      decision: "運用期間、期待利回り、定期積立額を変えてシナリオを比較します。",
      caution: "固定利回りの仮定は市場変動、税金、手数料、途中引き出しを反映しない場合があります。",
      related: [
        { href: "/ja/roi-calculator/", label: "ROI計算機", desc: "投資コストに対する回収効率を比較します。" },
        { href: "/ja/deposit-calculator/", label: "定期預金・積立計算機", desc: "税引後利息と満期額を見積もります。" },
      ],
    },
    fr: {
      tool: "calculateur d'intérêts composés",
      introTitle: "Voir l'effet du capital, du rendement et du temps",
      intro: "Les intérêts composés réinvestissent les intérêts dans le solde, qui sert de base au calcul suivant. Le temps, le taux et les versements peuvent fortement modifier le montant final.",
      inputs: "Saisissez capital initial, taux annuel, durée, fréquence de capitalisation et versements récurrents éventuels.",
      metric: "Valeur future = capital x (1 + taux / périodes) ^ (périodes x années)",
      decision: "Comparez les scénarios en modifiant horizon, rendement attendu ou versement régulier.",
      caution: "Un rendement fixe ne reflète pas toujours volatilité, impôts, frais ou retraits anticipés.",
      related: [
        { href: "/fr/roi-calculator/", label: "Calculateur ROI", desc: "Comparez rendement et coût d'investissement." },
        { href: "/fr/deposit-calculator/", label: "Calculateur de dépôt", desc: "Estimez intérêts nets et valeur à échéance." },
      ],
    },
    es: {
      tool: "calculadora de interés compuesto",
      introTitle: "Ve cómo capital, rentabilidad y tiempo cambian el resultado",
      intro: "El interés compuesto suma los intereses al saldo para que el siguiente periodo genere intereses sobre una base mayor. Tiempo, tasa y aportes cambian mucho el monto final.",
      inputs: "Introduce capital inicial, tasa anual, plazo, frecuencia de capitalización y aportes periódicos opcionales.",
      metric: "Valor futuro = capital x (1 + tasa / periodos) ^ (periodos x años)",
      decision: "Compara escenarios cambiando horizonte, retorno esperado o aporte recurrente.",
      caution: "Una tasa fija puede no reflejar volatilidad, impuestos, comisiones o retiros anticipados.",
      related: [
        { href: "/es/roi-calculator/", label: "Calculadora ROI", desc: "Compara retorno frente al costo de inversión." },
        { href: "/es/deposit-calculator/", label: "Calculadora de depósito", desc: "Estima intereses netos y valor al vencimiento." },
      ],
    },
    zh: {
      tool: "复利计算器",
      introTitle: "查看本金、收益率与时间如何影响长期结果",
      intro: "复利会把已产生的利息并入本金，使下一期在更大的余额上继续计息。期限、利率和定期投入都会显著改变最终金额。",
      inputs: "输入初始本金、年化利率、期限、复利频率，以及可选的定期投入金额。",
      metric: "未来价值 = 本金 x (1 + 利率 / 复利次数) ^ (复利次数 x 年数)",
      decision: "通过改变期限、预期收益率或定期投入，比较不同情境。",
      caution: "固定收益率假设可能无法反映市场波动、税费、手续费或提前支取。",
      related: [
        { href: "/zh/roi-calculator/", label: "ROI 计算器", desc: "比较投入成本与回收收益。" },
        { href: "/zh/deposit-calculator/", label: "定存·储蓄计算器", desc: "估算税后利息与到期金额。" },
      ],
    },
  },
  "brokerage-calculator": {
    ko: {
      tool: "주식 수수료 계산기",
      introTitle: "매수·매도 전 실제 거래 비용을 먼저 확인하세요",
      intro: "주식 거래 수익은 매매 차익만으로 결정되지 않습니다. 증권사 수수료, 거래세, 최소 수수료, 환전 비용이 합쳐지면 작은 거래에서도 체감 수익률이 달라질 수 있습니다.",
      inputs: "주문 금액, 매수·매도 구분, 수수료율, 거래세율, 기타 비용을 입력하세요.",
      metric: "총 거래 비용 = 증권사 수수료 + 거래세 + 기타 부대비용",
      decision: "목표 수익률이 거래 비용을 충분히 넘는지 확인한 뒤 주문 단위와 매도 가격을 정하세요.",
      caution: "국가, 시장, 증권사 이벤트, 계좌 유형에 따라 실제 수수료율과 세율이 달라질 수 있습니다.",
      related: [
        { href: "/ko/stock-average-calculator/", label: "주식 평균단가 계산기", desc: "여러 번 매수한 주식의 평균 단가를 계산합니다." },
        { href: "/ko/roi-calculator/", label: "ROI 계산기", desc: "거래 비용을 반영한 투자 성과를 비교합니다." },
      ],
    },
    en: {
      tool: "stock brokerage fee calculator",
      introTitle: "Check the real trading cost before placing an order",
      intro: "Stock profit is not just the price difference. Brokerage fees, transaction taxes, minimum fees, and currency conversion costs can change the effective return, especially on smaller trades.",
      inputs: "Enter order value, buy or sell side, brokerage rate, transaction tax rate, and any extra fee.",
      metric: "Total trading cost = brokerage fee + transaction tax + other charges",
      decision: "Check whether the target return comfortably clears trading costs before choosing order size and exit price.",
      caution: "Actual rates can vary by country, exchange, broker promotion, and account type.",
      related: [
        { href: "/en/stock-average-calculator/", label: "Stock average calculator", desc: "Calculate average cost after multiple purchases." },
        { href: "/en/roi-calculator/", label: "ROI calculator", desc: "Compare investment return after costs." },
      ],
    },
    ja: {
      tool: "株式手数料計算機",
      introTitle: "注文前に実際の取引コストを確認する",
      intro: "株式の損益は売買差額だけで決まりません。証券会社手数料、取引税、最低手数料、為替費用により実質リターンが変わります。",
      inputs: "注文金額、買い/売り、手数料率、取引税率、その他費用を入力します。",
      metric: "総取引コスト = 証券会社手数料 + 取引税 + その他費用",
      decision: "目標リターンが取引コストを十分上回るか確認してから注文量と売却価格を決めます。",
      caution: "国、市場、証券会社のキャンペーン、口座種別で実際の料率は変わります。",
      related: [
        { href: "/ja/stock-average-calculator/", label: "株式平均単価計算機", desc: "複数回購入後の平均取得単価を計算します。" },
        { href: "/ja/roi-calculator/", label: "ROI計算機", desc: "費用込みの投資成果を比較します。" },
      ],
    },
    fr: {
      tool: "calculateur de frais de courtage",
      introTitle: "Vérifier le coût réel avant l'ordre",
      intro: "Le gain boursier ne dépend pas seulement de l'écart de prix. Courtage, taxes, frais minimums et change peuvent modifier le rendement effectif.",
      inputs: "Saisissez montant de l'ordre, achat ou vente, taux de courtage, taxe de transaction et frais annexes.",
      metric: "Coût total = frais de courtage + taxe de transaction + autres frais",
      decision: "Vérifiez que le rendement visé dépasse largement les coûts avant de choisir taille d'ordre et prix de sortie.",
      caution: "Les taux réels varient selon pays, marché, courtier, promotion et type de compte.",
      related: [
        { href: "/fr/stock-average-calculator/", label: "Prix moyen d'actions", desc: "Calculez le prix de revient après plusieurs achats." },
        { href: "/fr/roi-calculator/", label: "Calculateur ROI", desc: "Comparez le rendement après coûts." },
      ],
    },
    es: {
      tool: "calculadora de comisiones de corretaje",
      introTitle: "Revisa el costo real antes de operar",
      intro: "La ganancia en acciones no depende solo de la diferencia de precio. Comisiones, impuestos, mínimos y cambio de divisa pueden alterar la rentabilidad efectiva.",
      inputs: "Introduce importe de la orden, compra o venta, comisión, impuesto de transacción y cargos extra.",
      metric: "Costo total = comisión de corretaje + impuesto de transacción + otros cargos",
      decision: "Comprueba si el retorno objetivo supera cómodamente los costos antes de elegir tamaño y precio de salida.",
      caution: "Las tasas reales varían por país, mercado, bróker, promoción y tipo de cuenta.",
      related: [
        { href: "/es/stock-average-calculator/", label: "Precio promedio de acciones", desc: "Calcula el costo promedio tras varias compras." },
        { href: "/es/roi-calculator/", label: "Calculadora ROI", desc: "Compara retorno después de costos." },
      ],
    },
    zh: {
      tool: "股票手续费计算器",
      introTitle: "下单前先查看真实交易成本",
      intro: "股票收益不只取决于买卖价差。券商手续费、交易税、最低收费和换汇成本，都会影响实际收益率，尤其是小额交易。",
      inputs: "输入订单金额、买入或卖出、手续费率、交易税率及其他费用。",
      metric: "总交易成本 = 券商手续费 + 交易税 + 其他费用",
      decision: "确认目标收益率足以覆盖交易成本后，再决定下单规模和卖出价格。",
      caution: "实际费率会因国家、市场、券商活动和账户类型而变化。",
      related: [
        { href: "/zh/stock-average-calculator/", label: "股票平均成本计算器", desc: "计算多次买入后的平均成本。" },
        { href: "/zh/roi-calculator/", label: "ROI 计算器", desc: "比较扣除成本后的投资表现。" },
      ],
    },
  },
  "deposit-calculator": {
    ko: {
      tool: "예금·적금 계산기",
      introTitle: "세전 이자보다 실제 만기 수령액을 중심으로 비교하세요",
      intro: "예금과 적금은 금리만 보면 비슷해 보여도 납입 방식, 과세 여부, 우대금리 조건에 따라 세후 수령액이 달라집니다. 여러 상품을 같은 기간 기준으로 비교할 때 유용합니다.",
      inputs: "예치금 또는 월 납입액, 기간, 연이율, 과세 방식, 이자 계산 방식을 입력하세요.",
      metric: "세후 수령액 = 원금 + 총이자 - 이자소득세",
      decision: "세후 이자, 납입 부담, 중도해지 조건, 우대금리 충족 가능성을 함께 비교하세요.",
      caution: "우대금리와 비과세 조건은 금융사 약관과 개인 자격에 따라 달라질 수 있습니다.",
      related: [
        { href: "/ko/compound-interest-calculator/", label: "복리 계산기", desc: "장기 복리 효과를 시나리오별로 확인합니다." },
        { href: "/ko/roi-calculator/", label: "ROI 계산기", desc: "다른 투자 대안과 수익률을 비교합니다." },
      ],
    },
    en: {
      tool: "deposit and savings calculator",
      introTitle: "Compare maturity value after tax, not just headline interest",
      intro: "Deposits and monthly savings can look similar by rate, but payment schedule, tax status, and bonus-rate conditions change the actual maturity amount.",
      inputs: "Enter deposit amount or monthly contribution, term, annual rate, tax treatment, and interest method.",
      metric: "After-tax maturity value = principal + total interest - interest tax",
      decision: "Compare after-tax interest, cash-flow burden, early withdrawal terms, and eligibility for bonus rates.",
      caution: "Bonus rates and tax exemptions depend on product terms and personal eligibility.",
      related: [
        { href: "/en/compound-interest-calculator/", label: "Compound interest calculator", desc: "Test long-term compounding scenarios." },
        { href: "/en/roi-calculator/", label: "ROI calculator", desc: "Compare deposits with other investment choices." },
      ],
    },
    ja: {
      tool: "定期預金・積立計算機",
      introTitle: "表面金利ではなく税引後の満期額で比較する",
      intro: "定期預金と積立は金利が似ていても、支払い方式、課税、優遇金利条件により満期受取額が変わります。同じ期間で商品を比較できます。",
      inputs: "預入額または毎月積立額、期間、年利、課税方式、利息計算方式を入力します。",
      metric: "税引後満期額 = 元本 + 総利息 - 利息税",
      decision: "税引後利息、資金負担、中途解約条件、優遇金利の達成可否を比較します。",
      caution: "優遇金利と非課税条件は商品規約と個人条件で変わります。",
      related: [
        { href: "/ja/compound-interest-calculator/", label: "複利計算機", desc: "長期複利シナリオを確認します。" },
        { href: "/ja/roi-calculator/", label: "ROI計算機", desc: "他の投資候補と収益率を比較します。" },
      ],
    },
    fr: {
      tool: "calculateur de dépôt et d'épargne",
      introTitle: "Comparer la valeur à échéance après impôt",
      intro: "Deux produits peuvent afficher un taux proche, mais versements, fiscalité et bonus changent le montant réellement reçu à l'échéance.",
      inputs: "Saisissez dépôt ou versement mensuel, durée, taux annuel, fiscalité et méthode d'intérêt.",
      metric: "Montant net à échéance = capital + intérêts totaux - impôt sur intérêts",
      decision: "Comparez intérêts nets, effort de trésorerie, retrait anticipé et accès aux taux bonus.",
      caution: "Les bonus et exonérations dépendent des conditions produit et de votre éligibilité.",
      related: [
        { href: "/fr/compound-interest-calculator/", label: "Intérêts composés", desc: "Testez des scénarios de capitalisation." },
        { href: "/fr/roi-calculator/", label: "Calculateur ROI", desc: "Comparez le dépôt à d'autres choix." },
      ],
    },
    es: {
      tool: "calculadora de depósito y ahorro",
      introTitle: "Compara el importe al vencimiento después de impuestos",
      intro: "Productos con tasas parecidas pueden terminar distinto por calendario de pagos, impuestos y condiciones de tasa bonificada.",
      inputs: "Introduce depósito o aporte mensual, plazo, tasa anual, tratamiento fiscal y método de interés.",
      metric: "Valor neto al vencimiento = capital + intereses totales - impuesto sobre intereses",
      decision: "Compara interés neto, carga de aportes, retiro anticipado y posibilidad de cumplir tasas bonificadas.",
      caution: "Las tasas bonificadas y exenciones dependen de términos del producto y elegibilidad personal.",
      related: [
        { href: "/es/compound-interest-calculator/", label: "Interés compuesto", desc: "Prueba escenarios de capitalización a largo plazo." },
        { href: "/es/roi-calculator/", label: "Calculadora ROI", desc: "Compara depósitos con otras inversiones." },
      ],
    },
    zh: {
      tool: "定存·储蓄计算器",
      introTitle: "不要只看名义利率，要比较税后到期金额",
      intro: "定存和每月储蓄即使利率相近，也会因缴存方式、税务状态和优惠利率条件而产生不同到期金额。",
      inputs: "输入存入金额或每月缴存额、期限、年利率、税务方式和计息方式。",
      metric: "税后到期金额 = 本金 + 总利息 - 利息税",
      decision: "同时比较税后利息、现金流压力、提前支取条件和优惠利率达成可能性。",
      caution: "优惠利率和免税条件取决于产品条款与个人资格。",
      related: [
        { href: "/zh/compound-interest-calculator/", label: "复利计算器", desc: "测试长期复利情境。" },
        { href: "/zh/roi-calculator/", label: "ROI 计算器", desc: "将储蓄与其他投资选择比较。" },
      ],
    },
  },
  "stock-average-calculator": {
    ko: {
      tool: "주식 평균단가 계산기",
      introTitle: "추가 매수 후 평균단가와 손익분기점을 계산하세요",
      intro: "물타기와 불타기는 평균단가를 바꾸지만 리스크도 함께 바꿉니다. 현재 보유 수량과 가격, 추가 매수 정보를 넣어 새 평균단가와 필요한 목표가를 확인하세요.",
      inputs: "기존 보유 수량과 평균단가, 추가 매수 수량과 가격을 입력하세요.",
      metric: "새 평균단가 = 전체 매수금액 / 전체 보유수량",
      decision: "평균단가가 낮아졌는지보다 총 투자금, 비중, 손절 기준을 함께 검토하세요.",
      caution: "평균단가 하락은 손실 확정을 늦출 수 있으며, 종목 리스크가 커질 수 있습니다.",
      related: [
        { href: "/ko/brokerage-calculator/", label: "주식 수수료 계산기", desc: "매수·매도 비용을 평균단가 계산에 함께 반영합니다." },
        { href: "/ko/roi-calculator/", label: "ROI 계산기", desc: "거래 후 전체 투자 성과를 비교합니다." },
      ],
    },
    en: {
      tool: "stock average price calculator",
      introTitle: "Calculate the new cost basis after an additional purchase",
      intro: "Averaging down or up changes your cost basis and your risk exposure. Enter current holdings and a new purchase to estimate the new average price and break-even level.",
      inputs: "Enter current share quantity and average price, then the additional quantity and purchase price.",
      metric: "New average cost = total purchase amount / total shares held",
      decision: "Look beyond the lower average price: review total capital, position size, and exit rules.",
      caution: "A lower average cost can delay loss recognition and increase single-stock concentration risk.",
      related: [
        { href: "/en/brokerage-calculator/", label: "Brokerage fee calculator", desc: "Include buy and sell costs in your trading plan." },
        { href: "/en/roi-calculator/", label: "ROI calculator", desc: "Compare total return after the trade." },
      ],
    },
    ja: {
      tool: "株式平均単価計算機",
      introTitle: "追加購入後の平均単価と損益分岐点を計算する",
      intro: "ナンピンや買い増しは平均単価を変えますが、リスク量も変えます。保有数、価格、追加購入を入力して新しい平均単価を確認します。",
      inputs: "現在の保有株数と平均単価、追加購入株数と価格を入力します。",
      metric: "新平均単価 = 総購入金額 / 総保有株数",
      decision: "平均単価の低下だけでなく、総投資額、保有比率、出口ルールを確認します。",
      caution: "平均単価の低下は損失認識を遅らせ、個別銘柄リスクを増やす可能性があります。",
      related: [
        { href: "/ja/brokerage-calculator/", label: "株式手数料計算機", desc: "売買費用を取引計画に含めます。" },
        { href: "/ja/roi-calculator/", label: "ROI計算機", desc: "取引後の総合リターンを比較します。" },
      ],
    },
    fr: {
      tool: "calculateur de prix moyen d'actions",
      introTitle: "Calculer le nouveau prix de revient après achat",
      intro: "Renforcer à la baisse ou à la hausse modifie le prix de revient et l'exposition au risque. Entrez position actuelle et nouvel achat pour estimer le nouveau seuil.",
      inputs: "Saisissez quantité détenue, prix moyen actuel, quantité achetée et prix d'achat supplémentaire.",
      metric: "Nouveau prix moyen = montant total acheté / nombre total d'actions",
      decision: "Ne regardez pas seulement le prix moyen : vérifiez capital total, taille de position et règles de sortie.",
      caution: "Un prix moyen plus bas peut retarder la reconnaissance d'une perte et accroître le risque concentré.",
      related: [
        { href: "/fr/brokerage-calculator/", label: "Frais de courtage", desc: "Intégrez les coûts d'achat et de vente." },
        { href: "/fr/roi-calculator/", label: "Calculateur ROI", desc: "Comparez le rendement total après transaction." },
      ],
    },
    es: {
      tool: "calculadora de precio promedio de acciones",
      introTitle: "Calcula el nuevo costo medio tras otra compra",
      intro: "Promediar a la baja o al alza cambia el costo base y también la exposición al riesgo. Introduce posición actual y nueva compra para estimar el nuevo punto de equilibrio.",
      inputs: "Introduce cantidad actual, precio promedio, nueva cantidad comprada y precio de compra.",
      metric: "Nuevo costo promedio = importe total comprado / acciones totales",
      decision: "No mires solo un promedio menor: revisa capital total, tamaño de posición y reglas de salida.",
      caution: "Un costo promedio menor puede retrasar reconocer pérdidas y aumentar concentración en una acción.",
      related: [
        { href: "/es/brokerage-calculator/", label: "Comisiones de corretaje", desc: "Incluye costos de compra y venta en el plan." },
        { href: "/es/roi-calculator/", label: "Calculadora ROI", desc: "Compara el retorno total tras operar." },
      ],
    },
    zh: {
      tool: "股票平均成本计算器",
      introTitle: "计算追加买入后的新平均成本与盈亏平衡价",
      intro: "摊平或加仓会改变平均成本，也会改变风险暴露。输入当前持仓和新买入信息，估算新的平均成本。",
      inputs: "输入当前持股数量与平均成本，以及追加买入数量和买入价格。",
      metric: "新平均成本 = 总买入金额 / 总持股数量",
      decision: "不要只看平均成本是否下降，也要检查总投入、仓位比例和退出规则。",
      caution: "降低平均成本可能延迟确认亏损，并增加单一股票集中风险。",
      related: [
        { href: "/zh/brokerage-calculator/", label: "股票手续费计算器", desc: "把买卖成本纳入交易计划。" },
        { href: "/zh/roi-calculator/", label: "ROI 计算器", desc: "比较交易后的总体回报。" },
      ],
    },
  },
};

export function getFinanceToolSeo(
  slug: FinanceToolSlug,
  locale: ActiveLocale,
): FinanceToolSeoContent {
  return buildFinanceSeo(locale, seeds[slug][locale]);
}
