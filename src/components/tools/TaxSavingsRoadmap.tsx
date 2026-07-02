import React, { useState } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';
type EmploymentType = 'employee' | 'freelancer' | 'business';
type MaritalStatus = 'single' | 'married';
type HomeOwnership = 'none' | 'renting' | 'owns';

interface Profile {
  annualIncome: number; // 만원
  employment: EmploymentType;
  marital: MaritalStatus;
  dependents: number;
  homeOwnership: HomeOwnership;
  hasIsa: boolean;
  hasPension: boolean;
  hasIrp: boolean;
}

interface TaxTip {
  id: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  savingsRange: [number, number]; // 만원 min/max
  applicable: (p: Profile) => boolean;
  title: Record<Locale, string>;
  desc: Record<Locale, string>;
  action: Record<Locale, string>;
}

const TIPS: TaxTip[] = [
  {
    id: 'irp',
    icon: '🏦',
    priority: 'high',
    savingsRange: [33, 165],
    applicable: (p) => (p.employment === 'employee' || p.employment === 'freelancer') && !p.hasIrp,
    title: {
      ko: 'IRP 계좌 개설', en: 'Open an IRP Account', ja: 'IRP口座を開設', fr: 'Ouvrir un compte IRP', es: 'Abrir cuenta IRP', zh: '开设IRP账户',
    },
    desc: {
      ko: '개인형 퇴직연금(IRP)에 연 900만 원까지 납입하면 최대 148.5만 원 세액공제(13.2~16.5%)를 받을 수 있습니다.',
      en: 'Contribute up to ₩9M/yr to an Individual Retirement Pension (IRP) and receive a tax credit of up to ₩1.485M (13.2–16.5%).',
      ja: '個人型退職年金(IRP)に年900万ウォンまで積立で、最大148.5万ウォンの税額控除(13.2~16.5%)が受けられます。',
      fr: "Versez jusqu'à 9 M KRW/an sur un IRP et obtenez un crédit d'impôt pouvant atteindre 1,485 M KRW (13,2–16,5%).",
      es: 'Aporte hasta ₩9M/año a un IRP y reciba un crédito fiscal de hasta ₩1,485M (13,2–16,5%).',
      zh: '个人退休金(IRP)每年最多存入900万韩元，可获最高148.5万韩元的税额抵免(13.2~16.5%)。',
    },
    action: {
      ko: 'IRP 계좌는 증권사·은행 앱에서 5분 내 개설 가능',
      en: 'Open via any bank or brokerage app in under 5 minutes',
      ja: '証券会社・銀行アプリで5分以内に開設可能',
      fr: "Ouvrir via l'app de n'importe quelle banque en moins de 5 min",
      es: 'Abrir en cualquier app bancaria o brokerage en menos de 5 min',
      zh: '可在任何银行或券商应用程序在5分钟内开设',
    },
  },
  {
    id: 'isa',
    icon: '💼',
    priority: 'high',
    savingsRange: [0, 92],
    applicable: (p) => !p.hasIsa && p.annualIncome > 0,
    title: {
      ko: 'ISA 계좌 활용', en: 'Use an ISA Account', ja: 'ISA口座を活用', fr: 'Utiliser un compte ISA', es: 'Usar cuenta ISA', zh: '活用ISA帳戶',
    },
    desc: {
      ko: 'ISA는 금융 소득 200만 원(서민형 400만 원)까지 비과세, 초과분은 9.9% 분리과세 혜택을 받습니다.',
      en: 'ISA offers tax-free growth up to ₩2M profit (₩4M for lower-income) and 9.9% flat tax on the excess.',
      ja: 'ISAは金融収益200万ウォン(庶民型400万ウォン)まで非課税、超過分は9.9%分離課税の特典があります。',
      fr: "L'ISA offre une croissance non imposée jusqu'à ₩2M (₩4M pour revenus modestes) et 9,9% sur le solde.",
      es: 'La ISA ofrece crecimiento libre de impuestos hasta ₩2M (₩4M renta baja) y tasa plana de 9,9% en exceso.',
      zh: 'ISA的金融收益可享200万韩元免税(庶民型400万)，超出部分以9.9%单独课税。',
    },
    action: {
      ko: '연 2,000만 원, 5년간 최대 1억 원까지 납입 가능',
      en: 'Up to ₩20M/yr, max ₩100M total over 5 years',
      ja: '年2,000万ウォン、5年間で最大1億ウォンまで積立可能',
      fr: "Jusqu'à 20 M KRW/an, 100 M max sur 5 ans",
      es: 'Hasta ₩20M/año, máximo ₩100M total en 5 años',
      zh: '每年最多2000万韩元，5年累计上限1亿韩元',
    },
  },
  {
    id: 'pension_savings',
    icon: '🏛️',
    priority: 'high',
    savingsRange: [66, 99],
    applicable: (p) => !p.hasPension && p.employment === 'employee',
    title: {
      ko: '연금저축 가입', en: 'Open a Pension Savings Account', ja: '年金貯蓄に加入', fr: 'Souscrire une épargne retraite', es: 'Abrir cuenta ahorro pensión', zh: '开设年金储蓄账户',
    },
    desc: {
      ko: '연금저축펀드에 연 600만 원까지 납입하면 최대 99만 원(16.5%) 세액공제를 받습니다. IRP와 합산 900만 원 한도.',
      en: 'Contribute up to ₩6M/yr to a pension savings fund for a tax credit of up to ₩990K (16.5%). Combined ₩9M cap with IRP.',
      ja: '年金貯蓄ファンドに年600万ウォンまで積立で最大99万ウォン(16.5%)の税額控除。IRPと合算900万ウォン上限。',
      fr: "Versez jusqu'à 6 M KRW/an dans un fonds d'épargne retraite pour un crédit d'impôt de 990 K KRW max (16,5%).",
      es: 'Aporte hasta ₩6M/año a un fondo de ahorro pensión para un crédito fiscal de hasta ₩990K (16,5%).',
      zh: '年金储蓄基金每年最多存入600万韩元，最高可获99万韩元(16.5%)税额抵免，与IRP合计上限900万。',
    },
    action: {
      ko: '증권사 연금저축펀드로 개설, ETF 투자 가능',
      en: 'Open at a brokerage as a pension savings fund — ETF investing allowed',
      ja: '証券会社の年金貯蓄ファンドで開設、ETF投資も可能',
      fr: "Ouvrir chez un courtier sous forme de fonds d'épargne retraite — investissement ETF autorisé",
      es: 'Abrir en un bróker como fondo de ahorro pensión — inversión en ETF permitida',
      zh: '可在券商开设年金储蓄基金账户，允许投资ETF',
    },
  },
  {
    id: 'housing_deduction',
    icon: '🏠',
    priority: 'high',
    savingsRange: [30, 150],
    applicable: (p) => p.employment === 'employee' && p.homeOwnership === 'renting',
    title: {
      ko: '주택청약 월세 세액공제', en: 'Rent Tax Credit', ja: '住宅月家賃税額控除', fr: 'Crédit loyer logement', es: 'Crédito fiscal alquiler', zh: '住宅月租税额抵免',
    },
    desc: {
      ko: '총급여 8,000만 원 이하 무주택 근로자는 월세의 15~17%를 세액공제 받습니다. 연 최대 105만 원.',
      en: 'Renters earning ≤₩80M/yr with no home receive a 15–17% tax credit on monthly rent, up to ₩1.05M/yr.',
      ja: '総給与8,000万ウォン以下の無住宅勤労者は月家賃の15~17%の税額控除。年最大105万ウォン。',
      fr: "Les locataires gagnant ≤80 M KRW/an sans logement reçoivent un crédit de 15–17% sur le loyer, max 1,05 M KRW/an.",
      es: 'Inquilinos con ingresos ≤₩80M/año sin vivienda reciben un crédito del 15–17% sobre el alquiler, hasta ₩1,05M/año.',
      zh: '年总薪资在8000万韩元以下的无房租客，可享月租金15~17%的税额抵免，每年最高105万韩元。',
    },
    action: {
      ko: '임대차 계약서와 월세 납부 이체 내역서로 연말정산 신청',
      en: 'File with lease contract and rent payment transfer records at year-end settlement',
      ja: '賃貸借契約書と月家賃振込明細書で年末調整申請',
      fr: "Déposez le contrat de bail et les relevés de paiement de loyer lors de la régularisation annuelle",
      es: 'Presenta el contrato de arrendamiento y registros de pago de alquiler en la liquidación anual',
      zh: '凭租赁合约和月租转账记录在年终结算时申请',
    },
  },
  {
    id: 'credit_card',
    icon: '💳',
    priority: 'medium',
    savingsRange: [10, 60],
    applicable: (p) => p.employment === 'employee' && p.annualIncome >= 3000,
    title: {
      ko: '신용·체크카드 공제 최적화', en: 'Credit/Debit Card Deduction', ja: 'クレジット・チェックカード控除最適化', fr: 'Optimiser déduction carte bancaire', es: 'Optimizar deducción tarjeta', zh: '信用/借记卡扣除额最优化',
    },
    desc: {
      ko: '총급여의 25% 초과 사용분부터 공제. 체크카드·현금영수증(30%)이 신용카드(15%)보다 공제율이 높습니다.',
      en: 'Deduction applies on spending above 25% of gross salary. Debit cards/cash receipts (30%) give higher rate than credit cards (15%).',
      ja: '総給与の25%超の使用分から控除。チェックカード・現金領収書(30%)が信用カード(15%)より控除率が高い。',
      fr: "Déduction sur les dépenses dépassant 25% du salaire brut. Cartes débit/reçus comptants (30%) > cartes crédit (15%).",
      es: 'Deducción sobre gastos que superen el 25% del salario bruto. Tarjetas débito/recibos (30%) > tarjetas crédito (15%).',
      zh: '超过年总薪资25%的消费才可扣除，借记卡/现金收据(30%)比信用卡(15%)的扣除率更高。',
    },
    action: {
      ko: '연 총급여 25% 까지는 신용카드, 이후엔 체크카드·현금영수증 사용',
      en: 'Use credit cards for first 25% of salary, then switch to debit/cash receipts',
      ja: '年総給与の25%まで信用カード、以降はチェックカード・現金領収書を使用',
      fr: "Utilisez la carte crédit jusqu'à 25% du salaire, puis basculez sur débit/reçus",
      es: 'Usa tarjeta crédito hasta el 25% del salario, luego cambia a débito/recibos',
      zh: '年总薪资的25%以内使用信用卡，之后改用借记卡/现金收据',
    },
  },
  {
    id: 'dependent_deduction',
    icon: '👨‍👩‍👧',
    priority: 'high',
    savingsRange: [75, 225],
    applicable: (p) => p.dependents > 0 && p.employment === 'employee',
    title: {
      ko: '부양가족 인적공제 챙기기', en: 'Claim Dependent Deductions', ja: '扶養家族控除を申請', fr: 'Demander déductions pour personnes à charge', es: 'Reclamar deducciones por dependientes', zh: '申報扶養親屬人員扣除',
    },
    desc: {
      ko: '부양가족 1인당 150만 원 기본공제, 70세 이상 경로우대 100만 원, 장애인 200만 원 추가공제.',
      en: '₩1.5M deduction per dependent, plus ₩1M for seniors 70+, ₩2M for disabled dependents.',
      ja: '扶養家族1人あたり150万ウォン基本控除、70歳以上の老人優待100万ウォン、障害者200万ウォン追加控除。',
      fr: "1,5 M KRW de déduction par personne à charge, +1 M pour les 70 ans+, +2 M pour les personnes handicapées.",
      es: '₩1,5M de deducción por dependiente, más ₩1M para mayores de 70, ₩2M para discapacitados.',
      zh: '每位抚养亲属可扣除150万韩元，70岁以上老人再加100万，残障人士再加200万。',
    },
    action: {
      ko: '연말정산 때 주민등록등본으로 부양가족 확인·등록',
      en: 'Register dependents at year-end using a family registry document',
      ja: '年末調整時に住民登録謄本で扶養家族を確認・登録',
      fr: "Enregistrez les personnes à charge lors de la régularisation annuelle avec le registre d'état civil",
      es: 'Registra dependientes en la liquidación anual con certificado de familia',
      zh: '年终结算时以户籍证明确认并登记抚养亲属',
    },
  },
  {
    id: 'medical_deduction',
    icon: '🏥',
    priority: 'medium',
    savingsRange: [10, 80],
    applicable: (p) => p.employment === 'employee' && p.annualIncome >= 3000,
    title: {
      ko: '의료비 세액공제', en: 'Medical Expense Tax Credit', ja: '医療費税額控除', fr: 'Crédit impôt frais médicaux', es: 'Crédito fiscal gastos médicos', zh: '医疗费用税额抵免',
    },
    desc: {
      ko: '총급여의 3% 초과 의료비의 15~20%를 세액공제. 65세 이상·장애인·중증환자 의료비는 한도 없음.',
      en: '15–20% tax credit on medical expenses above 3% of gross salary. No cap for seniors 65+, disabled, or critically ill.',
      ja: '総給与の3%超の医療費の15~20%を税額控除。65歳以上・障害者・重症患者の医療費は上限なし。',
      fr: "Crédit de 15–20% sur les frais médicaux dépassant 3% du salaire brut. Pas de plafond pour 65 ans+, handicapés, malades graves.",
      es: 'Crédito del 15–20% sobre gastos médicos que superen el 3% del salario bruto. Sin límite para mayores de 65, discapacitados o enfermos graves.',
      zh: '超过年总薪资3%的医疗费用可享15~20%税额抵免，65岁以上/残障/重症患者无上限。',
    },
    action: {
      ko: '홈택스에서 의료비 조회 후 연말정산 간소화 서비스 활용',
      en: 'Review medical expenses on Hometax and use the year-end simplified service',
      ja: 'ホームタックスで医療費を確認し、年末調整簡素化サービスを活用',
      fr: "Vérifiez les frais médicaux sur Hometax et utilisez le service simplifié de régularisation",
      es: 'Revisa gastos médicos en Hometax y usa el servicio simplificado de liquidación anual',
      zh: '在홈택스查询医疗费用，使用年终结算简化服务',
    },
  },
  {
    id: 'donation_deduction',
    icon: '💝',
    priority: 'low',
    savingsRange: [5, 30],
    applicable: (p) => p.annualIncome >= 5000,
    title: {
      ko: '기부금 세액공제', en: 'Charitable Donation Credit', ja: '寄付金税額控除', fr: 'Crédit don caritatif', es: 'Crédito donación caritativa', zh: '捐款税额抵免',
    },
    desc: {
      ko: '법정·지정 기부금은 15~30% 세액공제. 2,000만 원 초과분은 30%. 종교단체 기부도 10% 공제.',
      en: 'Legal/designated donations receive a 15–30% tax credit. Excess above ₩20M gets 30%. Religious organizations: 10%.',
      ja: '法定・指定寄付金は15~30%の税額控除。2,000万ウォン超分は30%。宗教団体への寄付も10%控除。',
      fr: "Les dons légaux/désignés reçoivent un crédit de 15–30%. Au-delà de 20 M KRW : 30%. Organisations religieuses : 10%.",
      es: 'Donaciones legales/designadas reciben crédito del 15–30%. Exceso de ₩20M: 30%. Organizaciones religiosas: 10%.',
      zh: '法定/指定捐款享15~30%税额抵免，超过2000万韩元的部分为30%，宗教团体捐款为10%。',
    },
    action: {
      ko: '기부금 영수증을 연말정산 간소화에서 조회·등록',
      en: 'Retrieve donation receipts through the Hometax simplified year-end service',
      ja: '寄付金領収書を年末調整簡素化サービスで確認・登録',
      fr: "Récupérez les reçus de dons via le service simplifié Hometax",
      es: 'Recupera recibos de donaciones a través del servicio simplificado de Hometax',
      zh: '通过홈택스年终结算简化服务查询并登记捐款收据',
    },
  },
  {
    id: 'business_expense',
    icon: '🧾',
    priority: 'high',
    savingsRange: [50, 300],
    applicable: (p) => p.employment === 'freelancer' || p.employment === 'business',
    title: {
      ko: '사업 비용 적극 경비 처리', en: 'Maximize Business Expense Deductions', ja: '事業費用を積極的に経費計上', fr: 'Maximiser les déductions professionnelles', es: 'Maximizar deducciones gastos negocio', zh: '积极申报业务费用扣除',
    },
    desc: {
      ko: '업무 관련 사무용품, 교통비, 통신비, 교육비, 임차료 등을 경비로 처리하면 과세 소득을 낮출 수 있습니다.',
      en: 'Office supplies, transport, telecoms, training, and rent used for business lower your taxable income.',
      ja: '業務関連の事務用品・交通費・通信費・教育費・賃借料を経費計上すれば課税所得を下げられます。',
      fr: "Déduire fournitures, transport, télécoms, formation et loyer professionnels réduit votre revenu imposable.",
      es: 'Material de oficina, transporte, telecomunicaciones, formación y alquiler de negocio reducen tu base imponible.',
      zh: '办公用品、交通费、通讯费、教育费、租金等业务相关费用可申报扣除，降低应税所得。',
    },
    action: {
      ko: '모든 사업 관련 영수증 보관, 간편장부 또는 복식부기 작성',
      en: 'Keep all business receipts; use simplified bookkeeping or double-entry accounting',
      ja: '全ての事業関連領収書を保管し、簡易帳簿または複式簿記を作成',
      fr: "Conservez tous les reçus professionnels; utilisez une comptabilité simplifiée ou en partie double",
      es: 'Guarda todos los recibos de negocio; usa contabilidad simplificada o por partida doble',
      zh: '保存所有业务相关收据，采用简易帐本或复式记帐',
    },
  },
  {
    id: 'child_tax_credit',
    icon: '👶',
    priority: 'high',
    savingsRange: [15, 90],
    applicable: (p) => p.dependents > 0,
    title: {
      ko: '자녀 세액공제', en: 'Child Tax Credit', ja: '子ども税額控除', fr: 'Crédit enfant', es: 'Crédito fiscal por hijo', zh: '子女税额抵免',
    },
    desc: {
      ko: '자녀 1인 15만 원, 2인 30만 원, 3인 이상 30만 원+1인당 30만 원 세액공제. 출생·입양 시 70만 원 추가.',
      en: '₩150K per child (1st), ₩300K (2nd), ₩300K + ₩300K/child (3rd+). Extra ₩700K for newborns or adoptions.',
      ja: '子ども1人15万ウォン、2人30万ウォン、3人以上30万+1人あたり30万ウォンの税額控除。出産・養子縁組時70万ウォン追加。',
      fr: "150 K KRW par enfant (1er), 300 K (2e), 300 K + 300 K/enfant (3e+). 700 K supplémentaires pour naissance ou adoption.",
      es: '₩150K por hijo (1º), ₩300K (2º), ₩300K+₩300K/hijo (3º+). ₩700K adicionales por nacimiento o adopción.',
      zh: '1个子女15万、2个子女30万、3个以上每人再加30万韩元的税额抵免，出生或收养时另加70万。',
    },
    action: {
      ko: '가족관계증명서로 부양 자녀 등록, 출생 연도에 70만 원 추가 신청',
      en: 'Register dependent children with family registry; claim extra ₩700K in birth year',
      ja: '家族関係証明書で扶養子どもを登録、出生年に70万ウォン追加申請',
      fr: "Enregistrez les enfants à charge avec le registre familial; demandez 700 K supplémentaires l'année de naissance",
      es: 'Registra hijos dependientes con certificado familiar; solicita ₩700K extra en el año de nacimiento',
      zh: '以家庭关系证明书登记抚养子女，出生年度另申请70万韩元',
    },
  },
];

const PRIORITY_COLORS: Record<TaxTip['priority'], { bg: string; text: string; border: string; badge: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
};

const L: Record<Locale, {
  title: string; subtitle: string;
  incomeLabel: string; employmentLabel: string; maritalLabel: string;
  dependentsLabel: string; homeLabel: string; hasIsaLabel: string;
  hasPensionLabel: string; hasIrpLabel: string;
  employee: string; freelancer: string; business: string;
  single: string; married: string;
  homeNone: string; homeRenting: string; homeOwns: string;
  yes: string; no: string;
  showRoadmap: string;
  totalSavings: string; tipsFound: string;
  priorityHigh: string; priorityMedium: string; priorityLow: string;
  savingsRange: string; actionLabel: string;
  wan: string; noTips: string;
}> = {
  ko: {
    title: '절세 로드맵', subtitle: '나에게 맞는 세금 절약 전략 찾기',
    incomeLabel: '연간 소득 (만원)', employmentLabel: '직업 유형', maritalLabel: '혼인 여부',
    dependentsLabel: '부양 가족 수', homeLabel: '주택 보유', hasIsaLabel: 'ISA 계좌 보유', hasPensionLabel: '연금저축 보유', hasIrpLabel: 'IRP 계좌 보유',
    employee: '직장인', freelancer: '프리랜서', business: '사업자',
    single: '미혼', married: '기혼',
    homeNone: '없음', homeRenting: '전·월세', homeOwns: '자가',
    yes: '있음', no: '없음',
    showRoadmap: '절세 전략 보기',
    totalSavings: '예상 절세액', tipsFound: '개 절세 전략 발견',
    priorityHigh: '필수', priorityMedium: '권장', priorityLow: '추가',
    savingsRange: '절세 예상', actionLabel: '실행 방법',
    wan: '만원', noTips: '입력한 조건에 맞는 추가 절세 전략이 없습니다.',
  },
  en: {
    title: 'Tax Savings Roadmap', subtitle: 'Find the best tax strategies for your situation',
    incomeLabel: 'Annual Income (₩ 만원)', employmentLabel: 'Employment Type', maritalLabel: 'Marital Status',
    dependentsLabel: 'Number of Dependents', homeLabel: 'Home Ownership', hasIsaLabel: 'Have ISA Account', hasPensionLabel: 'Have Pension Savings', hasIrpLabel: 'Have IRP Account',
    employee: 'Employee', freelancer: 'Freelancer', business: 'Business Owner',
    single: 'Single', married: 'Married',
    homeNone: 'None', homeRenting: 'Renting', homeOwns: 'Own Home',
    yes: 'Yes', no: 'No',
    showRoadmap: 'Show My Roadmap',
    totalSavings: 'Estimated Savings', tipsFound: 'strategies found',
    priorityHigh: 'Essential', priorityMedium: 'Recommended', priorityLow: 'Optional',
    savingsRange: 'Est. Savings', actionLabel: 'How to Act',
    wan: '만원', noTips: 'No additional strategies found for your profile.',
  },
  ja: {
    title: '節税ロードマップ', subtitle: 'あなたに最適な節税戦略を探す',
    incomeLabel: '年間所得（万ウォン）', employmentLabel: '雇用タイプ', maritalLabel: '婚姻状況',
    dependentsLabel: '扶養家族数', homeLabel: '住宅保有', hasIsaLabel: 'ISA口座保有', hasPensionLabel: '年金貯蓄保有', hasIrpLabel: 'IRP口座保有',
    employee: '会社員', freelancer: 'フリーランス', business: '事業者',
    single: '未婚', married: '既婚',
    homeNone: 'なし', homeRenting: '賃貸', homeOwns: '自己所有',
    yes: 'あり', no: 'なし',
    showRoadmap: '節税戦略を見る',
    totalSavings: '予想節税額', tipsFound: '個の節税戦略が見つかりました',
    priorityHigh: '必須', priorityMedium: '推奨', priorityLow: '任意',
    savingsRange: '節税予想', actionLabel: '実行方法',
    wan: '万ウォン', noTips: 'あなたの条件に合う追加の節税戦略はありません。',
  },
  fr: {
    title: "Feuille de Route Fiscale", subtitle: "Trouvez les meilleures stratégies fiscales pour votre situation",
    incomeLabel: "Revenu annuel (₩ 만원)", employmentLabel: "Type d'emploi", maritalLabel: "Situation maritale",
    dependentsLabel: "Nombre de personnes à charge", homeLabel: "Propriété immobilière", hasIsaLabel: "Compte ISA", hasPensionLabel: "Épargne retraite", hasIrpLabel: "Compte IRP",
    employee: "Salarié", freelancer: "Freelance", business: "Chef d'entreprise",
    single: "Célibataire", married: "Marié(e)",
    homeNone: "Aucune", homeRenting: "Locataire", homeOwns: "Propriétaire",
    yes: "Oui", no: "Non",
    showRoadmap: "Voir ma feuille de route",
    totalSavings: "Économies estimées", tipsFound: "stratégies trouvées",
    priorityHigh: "Essentiel", priorityMedium: "Recommandé", priorityLow: "Optionnel",
    savingsRange: "Écon. est.", actionLabel: "Comment agir",
    wan: "만원", noTips: "Aucune stratégie supplémentaire pour votre profil.",
  },
  es: {
    title: "Hoja de Ruta Fiscal", subtitle: "Encuentra las mejores estrategias fiscales para tu situación",
    incomeLabel: "Ingresos anuales (₩ 만원)", employmentLabel: "Tipo de empleo", maritalLabel: "Estado civil",
    dependentsLabel: "Número de dependientes", homeLabel: "Vivienda", hasIsaLabel: "Cuenta ISA", hasPensionLabel: "Ahorro pensión", hasIrpLabel: "Cuenta IRP",
    employee: "Empleado", freelancer: "Autónomo", business: "Empresario",
    single: "Soltero/a", married: "Casado/a",
    homeNone: "Ninguna", homeRenting: "Alquiler", homeOwns: "Propietario",
    yes: "Sí", no: "No",
    showRoadmap: "Ver mi hoja de ruta",
    totalSavings: "Ahorro estimado", tipsFound: "estrategias encontradas",
    priorityHigh: "Esencial", priorityMedium: "Recomendado", priorityLow: "Opcional",
    savingsRange: "Ahorro est.", actionLabel: "Cómo actuar",
    wan: "만원", noTips: "No se encontraron estrategias adicionales para tu perfil.",
  },
  zh: {
    title: '节税路线图', subtitle: '找到最适合你的节税策略',
    incomeLabel: '年收入（万韩元）', employmentLabel: '职业类型', maritalLabel: '婚姻状况',
    dependentsLabel: '扶养亲属人数', homeLabel: '住宅拥有情况', hasIsaLabel: '是否有ISA账户', hasPensionLabel: '是否有年金储蓄', hasIrpLabel: '是否有IRP账户',
    employee: '受薪员工', freelancer: '自由职业者', business: '企业主',
    single: '未婚', married: '已婚',
    homeNone: '无', homeRenting: '租房', homeOwns: '自有住宅',
    yes: '有', no: '无',
    showRoadmap: '查看我的节税路线图',
    totalSavings: '预计节税额', tipsFound: '个节税策略',
    priorityHigh: '必做', priorityMedium: '建议', priorityLow: '可选',
    savingsRange: '预计节税', actionLabel: '执行方法',
    wan: '万韩元', noTips: '没有找到符合您条件的额外节税策略。',
  },
};

export default function TaxSavingsRoadmap({ locale = 'ko' }: { locale?: Locale }) {
  const t = L[locale] ?? L.ko;

  const [profile, setProfile] = useState<Profile>({
    annualIncome: 5000,
    employment: 'employee',
    marital: 'single',
    dependents: 0,
    homeOwnership: 'renting',
    hasIsa: false,
    hasPension: false,
    hasIrp: false,
  });

  const [showResults, setShowResults] = useState(false);

  const applicableTips = TIPS.filter(tip => tip.applicable(profile));

  const totalMin = applicableTips.reduce((s, t) => s + t.savingsRange[0], 0);
  const totalMax = applicableTips.reduce((s, t) => s + t.savingsRange[1], 0);

  const highTips = applicableTips.filter(t => t.priority === 'high');
  const medTips = applicableTips.filter(t => t.priority === 'medium');
  const lowTips = applicableTips.filter(t => t.priority === 'low');

  const btn = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
    }`;

  const TipCard = ({ tip }: { tip: TaxTip }) => {
    const c = PRIORITY_COLORS[tip.priority];
    const badgeLabel = tip.priority === 'high' ? t.priorityHigh : tip.priority === 'medium' ? t.priorityMedium : t.priorityLow;
    return (
      <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{tip.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{badgeLabel}</span>
              <span className="font-semibold text-gray-800">{tip.title[locale]}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{tip.desc[locale]}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="text-gray-500">
                <span className={`font-semibold ${c.text}`}>{t.savingsRange}</span>
                {': '}
                <span className="font-semibold">{tip.savingsRange[0]}~{tip.savingsRange[1]} {t.wan}</span>
              </span>
            </div>
            <div className={`mt-2 p-2 rounded-lg bg-white bg-opacity-60 text-xs text-gray-600`}>
              <span className="font-semibold text-gray-700">{t.actionLabel}: </span>
              {tip.action[locale]}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
        {/* Income */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.incomeLabel}</label>
          <div className="flex items-center gap-3">
            <input
              type="range" min={1000} max={50000} step={500}
              value={profile.annualIncome}
              onChange={e => setProfile(p => ({ ...p, annualIncome: Number(e.target.value) }))}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-24 text-right font-semibold text-indigo-700 text-sm">
              {profile.annualIncome.toLocaleString()} {t.wan}
            </span>
          </div>
        </div>

        {/* Employment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.employmentLabel}</label>
          <div className="flex flex-wrap gap-2">
            {(['employee', 'freelancer', 'business'] as EmploymentType[]).map(type => (
              <button key={type} onClick={() => setProfile(p => ({ ...p, employment: type }))}
                className={btn(profile.employment === type)}>
                {t[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Marital + Dependents */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.maritalLabel}</label>
            <div className="flex gap-2">
              {(['single', 'married'] as MaritalStatus[]).map(s => (
                <button key={s} onClick={() => setProfile(p => ({ ...p, marital: s }))}
                  className={btn(profile.marital === s)}>
                  {t[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.dependentsLabel}</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map(n => (
                <button key={n} onClick={() => setProfile(p => ({ ...p, dependents: n }))}
                  className={btn(profile.dependents === n)}>
                  {n === 3 ? '3+' : n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Home */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.homeLabel}</label>
          <div className="flex flex-wrap gap-2">
            {(['none', 'renting', 'owns'] as HomeOwnership[]).map(h => (
              <button key={h} onClick={() => setProfile(p => ({ ...p, homeOwnership: h }))}
                className={btn(profile.homeOwnership === h)}>
                {h === 'none' ? t.homeNone : h === 'renting' ? t.homeRenting : t.homeOwns}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts */}
        <div className="grid grid-cols-3 gap-3">
          {([
            ['hasIsa', t.hasIsaLabel] as const,
            ['hasPension', t.hasPensionLabel] as const,
            ['hasIrp', t.hasIrpLabel] as const,
          ]).map(([key, label]) => (
            <div key={key} className="text-center">
              <p className="text-xs text-gray-600 mb-2">{label}</p>
              <div className="flex gap-1 justify-center">
                <button onClick={() => setProfile(p => ({ ...p, [key]: true }))}
                  className={btn(profile[key] === true)}>{t.yes}</button>
                <button onClick={() => setProfile(p => ({ ...p, [key]: false }))}
                  className={btn(profile[key] === false)}>{t.no}</button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowResults(true)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
        >
          {t.showRoadmap}
        </button>
      </div>

      {/* Results */}
      {showResults && (
        <div className="space-y-5">
          {/* Summary banner */}
          <div className="bg-indigo-600 text-white rounded-2xl p-5 text-center">
            <p className="text-sm opacity-80 mb-1">{applicableTips.length} {t.tipsFound}</p>
            <p className="text-3xl font-bold">{totalMin.toLocaleString()} ~ {totalMax.toLocaleString()} {t.wan}</p>
            <p className="text-sm opacity-80 mt-1">{t.totalSavings}</p>
          </div>

          {/* Priority groups */}
          {[
            { tips: highTips, priority: 'high' as const, label: t.priorityHigh },
            { tips: medTips, priority: 'medium' as const, label: t.priorityMedium },
            { tips: lowTips, priority: 'low' as const, label: t.priorityLow },
          ].map(({ tips, priority, label }) => tips.length > 0 && (
            <div key={priority}>
              <h2 className={`text-sm font-bold mb-3 ${PRIORITY_COLORS[priority].text}`}>
                {label} ({tips.length})
              </h2>
              <div className="space-y-3">
                {tips.map(tip => <TipCard key={tip.id} tip={tip} />)}
              </div>
            </div>
          ))}

          {applicableTips.length === 0 && (
            <p className="text-center text-gray-500 py-8">{t.noTips}</p>
          )}
        </div>
      )}
    </div>
  );
}
