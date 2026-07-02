import React, { useState, useMemo } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

type InsuranceType = 'life' | 'health' | 'auto' | 'term';
type Gender = 'M' | 'F';
type SmokingStatus = 'never' | 'former' | 'current';
type HealthRating = 'excellent' | 'good' | 'average' | 'poor';

const L: Record<Locale, {
  title: string; subtitle: string;
  insuranceType: string; age: string; gender: string; smoking: string; health: string;
  coverage: string; term: string;
  male: string; female: string;
  never: string; former: string; current: string;
  excellent: string; good: string; average: string; poor: string;
  life: string; healthIns: string; auto: string; termLife: string;
  calc: string; reset: string;
  monthlyPremium: string; annualPremium: string; totalCost: string;
  riskScore: string; low: string; medium: string; high: string;
  breakdown: string; basePremium: string; ageAdjust: string;
  genderAdjust: string; smokingAdjust: string; healthAdjust: string;
  tip: string; tips: Record<string, string[]>;
  currency: string; unit: string;
}> = {
  ko: {
    title: '보험료 계산기', subtitle: 'Insurance Premium Estimator',
    insuranceType: '보험 종류', age: '나이', gender: '성별', smoking: '흡연 여부', health: '건강 상태',
    coverage: '보장 금액 (만원)', term: '가입 기간 (년)',
    male: '남성', female: '여성',
    never: '비흡연', former: '금연 (1년 이상)', current: '현재 흡연',
    excellent: '매우 좋음', good: '양호', average: '보통', poor: '미흡',
    life: '종신보험', healthIns: '실손/건강보험', auto: '자동차보험', termLife: '정기보험',
    calc: '보험료 계산', reset: '초기화',
    monthlyPremium: '월 보험료', annualPremium: '연 보험료', totalCost: '총 납입 예상액',
    riskScore: '위험도 점수', low: '낮음', medium: '보통', high: '높음',
    breakdown: '요소별 조정', basePremium: '기본 보험료', ageAdjust: '나이 조정',
    genderAdjust: '성별 조정', smokingAdjust: '흡연 조정', healthAdjust: '건강 조정',
    tip: '💡 보험료 절약 팁',
    tips: {
      life: ['금연 시 보험료 최대 30% 절감', '젊을 때 가입할수록 보험료 낮음', '정기보험과 종신보험 비교 필수'],
      health: ['건강관리로 갱신 시 할인 적용', '실손보험 중복 가입 확인', '비급여 항목 특약 비교'],
      auto: ['블랙박스 설치 시 보험료 할인', '마일리지 특약으로 절감', '안전운전 점수 관리'],
      termLife: ['순수보장형으로 보험료 절감', '필요한 기간만 설정', '다이렉트 보험 비교 필수'],
    },
    currency: '만원', unit: '원',
  },
  en: {
    title: 'Insurance Premium Calculator', subtitle: 'Estimate Your Monthly Premium',
    insuranceType: 'Insurance Type', age: 'Age', gender: 'Gender', smoking: 'Smoking Status', health: 'Health Rating',
    coverage: 'Coverage Amount ($)', term: 'Policy Term (years)',
    male: 'Male', female: 'Female',
    never: 'Never smoked', former: 'Former smoker (1+ yr)', current: 'Current smoker',
    excellent: 'Excellent', good: 'Good', average: 'Average', poor: 'Poor',
    life: 'Whole Life', healthIns: 'Health Insurance', auto: 'Auto Insurance', termLife: 'Term Life',
    calc: 'Calculate Premium', reset: 'Reset',
    monthlyPremium: 'Monthly Premium', annualPremium: 'Annual Premium', totalCost: 'Total Policy Cost',
    riskScore: 'Risk Score', low: 'Low', medium: 'Medium', high: 'High',
    breakdown: 'Factor Adjustments', basePremium: 'Base Premium', ageAdjust: 'Age Adjustment',
    genderAdjust: 'Gender Adjustment', smokingAdjust: 'Smoking Adjustment', healthAdjust: 'Health Adjustment',
    tip: '💡 Premium Saving Tips',
    tips: {
      life: ['Quit smoking to save up to 30%', 'Lock in lower rates when young', 'Compare whole life vs term life'],
      health: ['Maintain health for renewal discounts', 'Avoid duplicate coverage', 'Compare supplemental riders'],
      auto: ['Install dashcam for discounts', 'Use mileage-based plans', 'Maintain safe driving record'],
      termLife: ['Choose pure protection for low cost', 'Match term to your need period', 'Compare direct insurers'],
    },
    currency: '$', unit: '$',
  },
  ja: {
    title: '保険料計算機', subtitle: '保険料の概算',
    insuranceType: '保険の種類', age: '年齢', gender: '性別', smoking: '喫煙状況', health: '健康状態',
    coverage: '保障金額（万円）', term: '加入期間（年）',
    male: '男性', female: '女性',
    never: '非喫煙者', former: '禁煙（1年以上）', current: '現在喫煙中',
    excellent: '非常に良い', good: '良い', average: '普通', poor: '要注意',
    life: '終身保険', healthIns: '医療保険', auto: '自動車保険', termLife: '定期保険',
    calc: '保険料を計算', reset: 'リセット',
    monthlyPremium: '月額保険料', annualPremium: '年間保険料', totalCost: '総支払額',
    riskScore: 'リスクスコア', low: '低い', medium: '普通', high: '高い',
    breakdown: '要素別調整', basePremium: '基本保険料', ageAdjust: '年齢調整',
    genderAdjust: '性別調整', smokingAdjust: '喫煙調整', healthAdjust: '健康調整',
    tip: '💡 保険料節約のヒント',
    tips: {
      life: ['禁煙で保険料最大30%節約', '若いうちに加入するほど低額', '定期保険と終身保険を比較'],
      health: ['健康管理で更新時割引', '重複加入の確認', '特約の比較'],
      auto: ['ドライブレコーダーで割引', 'マイレージ特約で節約', '安全運転スコア管理'],
      termLife: ['純保障型で保険料を削減', '必要期間だけ設定', 'ダイレクト保険を比較'],
    },
    currency: '万円', unit: '円',
  },
  fr: {
    title: 'Calculateur de Prime d\'Assurance', subtitle: 'Estimez votre prime mensuelle',
    insuranceType: 'Type d\'assurance', age: 'Âge', gender: 'Genre', smoking: 'Tabagisme', health: 'État de santé',
    coverage: 'Montant couvert (€)', term: 'Durée (ans)',
    male: 'Homme', female: 'Femme',
    never: 'Non-fumeur', former: 'Ex-fumeur (1+ an)', current: 'Fumeur actuel',
    excellent: 'Excellent', good: 'Bon', average: 'Moyen', poor: 'Médiocre',
    life: 'Vie entière', healthIns: 'Assurance santé', auto: 'Assurance auto', termLife: 'Temporaire',
    calc: 'Calculer la prime', reset: 'Réinitialiser',
    monthlyPremium: 'Prime mensuelle', annualPremium: 'Prime annuelle', totalCost: 'Coût total',
    riskScore: 'Score de risque', low: 'Faible', medium: 'Moyen', high: 'Élevé',
    breakdown: 'Ajustements par facteur', basePremium: 'Prime de base', ageAdjust: 'Ajustement âge',
    genderAdjust: 'Ajustement genre', smokingAdjust: 'Ajustement tabac', healthAdjust: 'Ajustement santé',
    tip: '💡 Conseils pour économiser',
    tips: {
      life: ['Arrêter de fumer pour économiser 30%', 'Souscrire jeune pour de meilleurs tarifs', 'Comparer vie entière et temporaire'],
      health: ['Bonne santé = réductions au renouvellement', 'Éviter les doublons de couverture', 'Comparer les options additionnelles'],
      auto: ['Boîte noire pour réductions', 'Contrats au kilométrage', 'Entretenir son dossier de conduite'],
      termLife: ['Choisir la protection pure', 'Durée adaptée à vos besoins', 'Comparer les assureurs directs'],
    },
    currency: '€', unit: '€',
  },
  es: {
    title: 'Calculadora de Prima de Seguro', subtitle: 'Estima tu prima mensual',
    insuranceType: 'Tipo de seguro', age: 'Edad', gender: 'Género', smoking: 'Tabaquismo', health: 'Estado de salud',
    coverage: 'Cobertura (€)', term: 'Plazo (años)',
    male: 'Hombre', female: 'Mujer',
    never: 'No fumador', former: 'Ex fumador (+1 año)', current: 'Fumador actual',
    excellent: 'Excelente', good: 'Bueno', average: 'Medio', poor: 'Deficiente',
    life: 'Vida entera', healthIns: 'Seguro salud', auto: 'Seguro auto', termLife: 'Temporal',
    calc: 'Calcular prima', reset: 'Restablecer',
    monthlyPremium: 'Prima mensual', annualPremium: 'Prima anual', totalCost: 'Coste total',
    riskScore: 'Puntuación de riesgo', low: 'Bajo', medium: 'Medio', high: 'Alto',
    breakdown: 'Ajustes por factor', basePremium: 'Prima base', ageAdjust: 'Ajuste edad',
    genderAdjust: 'Ajuste género', smokingAdjust: 'Ajuste tabaco', healthAdjust: 'Ajuste salud',
    tip: '💡 Consejos para ahorrar',
    tips: {
      life: ['Dejar de fumar ahorra hasta 30%', 'Contratar joven baja la prima', 'Comparar vida entera vs temporal'],
      health: ['Buena salud = descuentos en renovación', 'Evitar cobertura duplicada', 'Comparar coberturas adicionales'],
      auto: ['Cámara dashcam con descuentos', 'Planes por kilómetros', 'Mantener buena conducción'],
      termLife: ['Protección pura = menor coste', 'Adaptar plazo a tu necesidad', 'Comparar aseguradoras directas'],
    },
    currency: '€', unit: '€',
  },
  zh: {
    title: '保险费计算器', subtitle: '估算每月保费',
    insuranceType: '保险类型', age: '年龄', gender: '性别', smoking: '吸烟状况', health: '健康状况',
    coverage: '保障金额（万元）', term: '保险期限（年）',
    male: '男性', female: '女性',
    never: '从不吸烟', former: '已戒烟（1年以上）', current: '目前吸烟',
    excellent: '非常好', good: '良好', average: '一般', poor: '欠佳',
    life: '终身寿险', healthIns: '健康险', auto: '汽车险', termLife: '定期寿险',
    calc: '计算保费', reset: '重置',
    monthlyPremium: '每月保费', annualPremium: '年保费', totalCost: '总缴费',
    riskScore: '风险评分', low: '低', medium: '中等', high: '高',
    breakdown: '各因素调整', basePremium: '基本保费', ageAdjust: '年龄调整',
    genderAdjust: '性别调整', smokingAdjust: '吸烟调整', healthAdjust: '健康调整',
    tip: '💡 节省保费小技巧',
    tips: {
      life: ['戒烟可节省最多30%保费', '越年轻投保保费越低', '比较终身险与定期险'],
      health: ['维持健康获得续保折扣', '避免重复投保', '比较附加保障'],
      auto: ['安装行车记录仪享折扣', '使用里程计费方案', '维持良好驾驶记录'],
      termLife: ['纯保障型保费更低', '按需要设定保障期', '比较直销保险公司'],
    },
    currency: '万元', unit: '元',
  },
};

// Base monthly premiums per ₩10K coverage for each type (Korean won scale)
// These are illustrative/educational estimates, not actual quotes
const BASE_RATES: Record<InsuranceType, number> = {
  life:     0.0045, // per 1만원 coverage per month
  health:   0.0028,
  auto:     0.0020,
  term:     0.0012,
};

const AGE_MULTIPLIERS = (age: number): number => {
  if (age < 25) return 0.70;
  if (age < 30) return 0.85;
  if (age < 35) return 1.00;
  if (age < 40) return 1.15;
  if (age < 45) return 1.35;
  if (age < 50) return 1.60;
  if (age < 55) return 1.90;
  if (age < 60) return 2.30;
  if (age < 65) return 2.80;
  return 3.40;
};

const GENDER_MULTIPLIERS: Record<InsuranceType, Record<Gender, number>> = {
  life:   { M: 1.10, F: 0.92 },
  health: { M: 1.05, F: 0.97 },
  auto:   { M: 1.08, F: 0.94 },
  term:   { M: 1.12, F: 0.90 },
};

const SMOKING_MULTIPLIERS: Record<SmokingStatus, number> = {
  never:   1.00,
  former:  1.15,
  current: 1.35,
};

const HEALTH_MULTIPLIERS: Record<HealthRating, number> = {
  excellent: 0.88,
  good:      1.00,
  average:   1.18,
  poor:      1.45,
};

function calcRiskScore(age: number, smoking: SmokingStatus, health: HealthRating): number {
  let score = 0;
  if (age >= 50) score += 30;
  else if (age >= 40) score += 20;
  else if (age >= 30) score += 10;
  if (smoking === 'current') score += 35;
  else if (smoking === 'former') score += 15;
  if (health === 'poor') score += 35;
  else if (health === 'average') score += 20;
  else if (health === 'good') score += 5;
  return Math.min(100, score);
}

const InsurancePremiumCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = L[locale] ?? L.en;
  const [insuranceType, setInsuranceType] = useState<InsuranceType>('term');
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<Gender>('M');
  const [smoking, setSmoking] = useState<SmokingStatus>('never');
  const [health, setHealth] = useState<HealthRating>('good');
  const [coverage, setCoverage] = useState(10000); // in 만원 or $ units
  const [term, setTerm] = useState(20);

  const result = useMemo(() => {
    const base = BASE_RATES[insuranceType] * coverage;
    const ageAdj = base * (AGE_MULTIPLIERS(age) - 1);
    const genderAdj = base * (GENDER_MULTIPLIERS[insuranceType][gender] - 1);
    const smokingAdj = base * (SMOKING_MULTIPLIERS[smoking] - 1);
    const healthAdj = base * (HEALTH_MULTIPLIERS[health] - 1);
    const monthly = base + ageAdj + genderAdj + smokingAdj + healthAdj;
    const annual = monthly * 12;
    const totalCost = annual * term;
    const riskScore = calcRiskScore(age, smoking, health);
    return { base, ageAdj, genderAdj, smokingAdj, healthAdj, monthly, annual, totalCost, riskScore };
  }, [insuranceType, age, gender, smoking, health, coverage, term]);

  const riskLevel = result.riskScore >= 60 ? 'high' : result.riskScore >= 30 ? 'medium' : 'low';
  const riskColor = riskLevel === 'high' ? 'text-destructive' : riskLevel === 'medium' ? 'text-warning' : 'text-success';
  const riskBg = riskLevel === 'high' ? 'bg-destructive/10 border-destructive/30' : riskLevel === 'medium' ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30';

  const fmtMoney = (n: number) => {
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(0);
  };

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Insurance type */}
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{t.insuranceType}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['term', 'life', 'health', 'auto'] as InsuranceType[]).map(type => (
            <button key={type} onClick={() => setInsuranceType(type)}
              className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${insuranceType === type ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
              {type === 'life' ? t.life : type === 'health' ? t.healthIns : type === 'auto' ? t.auto : t.termLife}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Age */}
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-1">{t.age}: {age}</label>
          <input type="range" min={18} max={70} value={age} onChange={e => setAge(Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>18</span><span>70</span></div>
        </div>

        {/* Gender */}
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-2">{t.gender}</label>
          <div className="flex gap-2">
            {(['M', 'F'] as Gender[]).map(g => (
              <button key={g} onClick={() => setGender(g)}
                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${gender === g ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                {g === 'M' ? t.male : t.female}
              </button>
            ))}
          </div>
        </div>

        {/* Smoking */}
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-2">{t.smoking}</label>
          <div className="flex flex-col gap-1">
            {(['never', 'former', 'current'] as SmokingStatus[]).map(s => (
              <button key={s} onClick={() => setSmoking(s)}
                className={`py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${smoking === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                {s === 'never' ? t.never : s === 'former' ? t.former : t.current}
              </button>
            ))}
          </div>
        </div>

        {/* Health */}
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-2">{t.health}</label>
          <div className="flex flex-col gap-1">
            {(['excellent', 'good', 'average', 'poor'] as HealthRating[]).map(h => (
              <button key={h} onClick={() => setHealth(h)}
                className={`py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${health === h ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                {h === 'excellent' ? t.excellent : h === 'good' ? t.good : h === 'average' ? t.average : t.poor}
              </button>
            ))}
          </div>
        </div>

        {/* Coverage */}
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-1">{t.coverage}</label>
          <input type="number" min={100} value={coverage} onChange={e => setCoverage(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/20 text-sm font-bold text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        {/* Term */}
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-1">{t.term}: {term}년</label>
          <input type="range" min={5} max={30} step={5} value={term} onChange={e => setTerm(Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>5</span><span>30</span></div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Monthly premium hero */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1 p-5 rounded-2xl bg-primary/10 border border-primary/20 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.monthlyPremium}</p>
            <p className="text-3xl font-black text-primary">{fmtMoney(result.monthly)}</p>
            <p className="text-[10px] text-muted-foreground">{t.currency}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.annualPremium}</p>
            <p className="text-xl font-black">{fmtMoney(result.annual)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.totalCost} ({term}y)</p>
            <p className="text-xl font-black">{fmtMoney(result.totalCost)}</p>
          </div>
        </div>

        {/* Risk score */}
        <div className={`p-4 rounded-2xl border ${riskBg}`}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.riskScore}</p>
            <span className={`text-sm font-black ${riskColor}`}>{t[riskLevel]} ({result.riskScore}/100)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${riskLevel === 'high' ? 'bg-destructive' : riskLevel === 'medium' ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${result.riskScore}%` }} />
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{t.breakdown}</p>
          {[
            { label: t.basePremium, value: result.base },
            { label: t.ageAdjust, value: result.ageAdj },
            { label: t.genderAdjust, value: result.genderAdj },
            { label: t.smokingAdjust, value: result.smokingAdj },
            { label: t.healthAdjust, value: result.healthAdj },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <span className={`font-bold tabular-nums ${value > 0 ? 'text-destructive' : value < 0 ? 'text-success' : ''}`}>
                {value >= 0 ? '+' : ''}{fmtMoney(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="p-4 rounded-2xl bg-info/10 border border-info/30">
          <p className="text-xs font-black mb-2">{t.tip}</p>
          <ul className="space-y-1">
            {t.tips[insuranceType]?.map((tip: string) => (
              <li key={tip} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-info shrink-0">•</span>{tip}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] text-muted-foreground/60">
          {locale === 'ko' ? '실제 보험료는 보험사·상품·건강검진 결과에 따라 다를 수 있습니다. 본 계산기는 참고용입니다.' :
           'Actual premiums vary by insurer, product, and underwriting. This calculator is for reference only.'}
        </p>
      </div>
    </div>
  );
};

export default InsurancePremiumCalculator;
