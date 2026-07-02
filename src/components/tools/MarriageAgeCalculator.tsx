import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Gender = "male" | "female";

type MBTIType =
  | "INTJ" | "INTP" | "ENTJ" | "ENTP"
  | "INFJ" | "INFP" | "ENFJ" | "ENFP"
  | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ"
  | "ISTP" | "ISFP" | "ESTP" | "ESFP";

const MBTI_TYPES: MBTIType[] = [
  "INTJ","INTP","ENTJ","ENTP",
  "INFJ","INFP","ENFJ","ENFP",
  "ISTJ","ISFJ","ESTJ","ESFJ",
  "ISTP","ISFP","ESTP","ESFP",
];

type OccupationType =
  | "employee" | "selfEmployed" | "freelancer" | "publicServant"
  | "professional" | "student" | "homemaker" | "agriculture"
  | "medical" | "it";

const OCCUPATION_TYPES: OccupationType[] = [
  "employee","selfEmployed","freelancer","publicServant",
  "professional","student","homemaker","agriculture",
  "medical","it",
];

// ─── Algorithm Data ───────────────────────────────────────────────────────────

// MBTI base marriage age offset relative to national average (in years)
// Negative = earlier, Positive = later. Range (-3 to +4)
const MBTI_AGE_OFFSET: Record<MBTIType, number> = {
  INTJ: 3,   // Plans carefully, marries later
  INTP: 4,   // Highly analytical, often delays
  ENTJ: 1,   // Goal-driven but practical
  ENTP: 2,   // Loves freedom, slightly later
  INFJ: 0,   // Idealistic but ready when they find the one
  INFP: 1,   // Romantic, waits for the perfect match
  ENFJ: -1,  // Naturally relationship-oriented, often earlier
  ENFP: 1,   // Enthusiastic but needs independence first
  ISTJ: -1,  // Traditional, tends to marry on schedule
  ISFJ: -2,  // Very family-oriented, often earlier
  ESTJ: -1,  // Traditional values, follows societal timeline
  ESFJ: -2,  // Highly relationship-focused, often earlier
  ISTP: 2,   // Independent, prefers freedom
  ISFP: 0,   // Goes with the flow
  ESTP: 1,   // Adventurous, delays slightly
  ESFP: 0,   // Spontaneous, could go either way
};

// MBTI readiness score modifier (affects marriage prep score)
const MBTI_READINESS: Record<MBTIType, number> = {
  INTJ: -8, INTP: -12, ENTJ: 5, ENTP: -5,
  INFJ: 8, INFP: -3, ENFJ: 12, ENFP: 2,
  ISTJ: 10, ISFJ: 15, ESTJ: 8, ESFJ: 15,
  ISTP: -8, ISFP: 5, ESTP: -5, ESFP: 8,
};

// Occupation: typical marriage age base and readiness modifier
const OCCUPATION_DATA: Record<OccupationType, { ageBase: number; readiness: number }> = {
  employee:     { ageBase: 29, readiness: 5 },
  selfEmployed: { ageBase: 32, readiness: -5 },
  freelancer:   { ageBase: 31, readiness: -8 },
  publicServant:{ ageBase: 28, readiness: 10 },
  professional: { ageBase: 33, readiness: 0 },
  student:      { ageBase: 28, readiness: -15 },
  homemaker:    { ageBase: 27, readiness: 18 },
  agriculture:  { ageBase: 27, readiness: 8 },
  medical:      { ageBase: 34, readiness: 3 },
  it:           { ageBase: 31, readiness: -3 },
};

// Gender adjustment (reflects statistical tendencies, not prescriptive)
const GENDER_AGE_ADJUST: Record<Gender, number> = {
  male: 2,    // Statistically men marry 1-2 years later
  female: -1,
};

// ─── Result Computation ───────────────────────────────────────────────────────

interface MarriageResult {
  minAge: number;
  maxAge: number;
  score: number; // 0–100
  yearsLeft: number | null; // null if already in range or past
  isPastPeak: boolean;
}

function computeResult(
  gender: Gender,
  mbti: MBTIType,
  occupation: OccupationType,
  currentAge: number
): MarriageResult {
  const occData = OCCUPATION_DATA[occupation];
  const mbtiOffset = MBTI_AGE_OFFSET[mbti];
  const genderAdj = GENDER_AGE_ADJUST[gender];

  const center = occData.ageBase + mbtiOffset + genderAdj;
  const minAge = Math.max(22, Math.round(center - 2));
  const maxAge = Math.round(center + 2);

  // Readiness score
  const baseScore = 50;
  const mbtiMod = MBTI_READINESS[mbti];
  const occMod = occData.readiness;

  // Age proximity modifier: peak at center, falls off by distance
  const ageDist = Math.abs(currentAge - center);
  const ageMod = Math.max(-25, 15 - ageDist * 5);

  const raw = baseScore + mbtiMod + occMod + ageMod;
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  const inRange = currentAge >= minAge && currentAge <= maxAge;
  const isPastPeak = currentAge > maxAge;
  const yearsLeft = !inRange && !isPastPeak ? minAge - currentAge : null;

  return { minAge, maxAge, score, yearsLeft, isPastPeak };
}

// ─── UI i18n ──────────────────────────────────────────────────────────────────

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  genderLabel: string;
  male: string;
  female: string;
  mbtiLabel: string;
  mbtiPlaceholder: string;
  occupationLabel: string;
  occupationPlaceholder: string;
  ageLabel: string;
  agePlaceholder: string;
  calculateBtn: string;
  resetBtn: string;
  resultTitle: string;
  marriageAgeRange: string;
  marriageScore: string;
  yearsLeft: (n: number) => string;
  inRange: string;
  pastPeak: string;
  disclaimer: string;
  occupationNames: Record<OccupationType, string>;
  descriptionFn: (gender: Gender, mbti: MBTIType, occupation: OccupationType, minAge: number, maxAge: number, score: number) => string;
}> = {
  ko: {
    title: "결혼 적령기 계산기",
    subtitle: "MBTI, 직업군, 성별로 나의 결혼 적령기를 알아보세요",
    genderLabel: "성별",
    male: "남성",
    female: "여성",
    mbtiLabel: "MBTI 유형",
    mbtiPlaceholder: "MBTI 선택",
    occupationLabel: "직업군",
    occupationPlaceholder: "직업군 선택",
    ageLabel: "현재 나이",
    agePlaceholder: "나이 입력 (18–60)",
    calculateBtn: "적령기 계산",
    resetBtn: "다시 하기",
    resultTitle: "나의 결혼 적령기",
    marriageAgeRange: "예상 결혼 적령기",
    marriageScore: "결혼 준비 점수",
    yearsLeft: (n) => `적령기까지 약 ${n}년 남았어요`,
    inRange: "지금이 바로 적령기입니다! 🎉",
    pastPeak: "통계적 적령기는 지났지만, 결혼에 늦은 나이는 없어요 😊",
    disclaimer: "* 통계와 성향 데이터 기반의 재미 계산기입니다",
    occupationNames: {
      employee: "직장인",
      selfEmployed: "자영업",
      freelancer: "프리랜서",
      publicServant: "공무원",
      professional: "전문직",
      student: "학생",
      homemaker: "주부",
      agriculture: "농업",
      medical: "의료직",
      it: "IT직군",
    },
    descriptionFn: (gender, mbti, occupation, minAge, maxAge, score) => {
      const occ = UI.ko.occupationNames[occupation];
      const g = gender === "male" ? "남성" : "여성";
      if (score >= 75) {
        return `${g} ${mbti} ${occ}으로서 결혼 준비가 매우 잘 되어 있습니다. ${minAge}~${maxAge}세가 최적의 결혼 시기로 예측되며, 안정적인 성향과 직업적 기반이 좋은 결혼 조건을 갖추게 해줍니다.`;
      } else if (score >= 50) {
        return `${g} ${mbti} ${occ}의 결혼 준비 점수는 평균 수준입니다. ${minAge}~${maxAge}세 사이에 결혼을 고려해보세요. 현재의 생활 패턴을 조금씩 조정하면 더 좋은 결과를 기대할 수 있어요.`;
      } else {
        return `${mbti} 성향과 ${occ} 직종의 특성상 독립적인 삶을 선호하는 편입니다. ${minAge}~${maxAge}세가 예측 적령기이지만, 본인의 페이스에 맞춰 결혼을 준비하는 것이 중요합니다.`;
      }
    },
  },
  en: {
    title: "Marriage Age Calculator",
    subtitle: "Discover your ideal marriage age based on MBTI, occupation & gender",
    genderLabel: "Gender",
    male: "Male",
    female: "Female",
    mbtiLabel: "MBTI Type",
    mbtiPlaceholder: "Select MBTI",
    occupationLabel: "Occupation",
    occupationPlaceholder: "Select occupation",
    ageLabel: "Current Age",
    agePlaceholder: "Enter age (18–60)",
    calculateBtn: "Calculate",
    resetBtn: "Reset",
    resultTitle: "Your Marriage Age Prediction",
    marriageAgeRange: "Ideal Marriage Age Range",
    marriageScore: "Marriage Readiness Score",
    yearsLeft: (n) => `About ${n} year${n !== 1 ? "s" : ""} until your prime window`,
    inRange: "You're in your prime marriage window right now! 🎉",
    pastPeak: "Statistically past the peak window — but it's never too late 😊",
    disclaimer: "* Fun calculator based on statistical tendencies — not a life plan",
    occupationNames: {
      employee: "Employee",
      selfEmployed: "Self-Employed",
      freelancer: "Freelancer",
      publicServant: "Public Servant",
      professional: "Professional",
      student: "Student",
      homemaker: "Homemaker",
      agriculture: "Agriculture",
      medical: "Medical",
      it: "IT / Tech",
    },
    descriptionFn: (gender, mbti, occupation, minAge, maxAge, score) => {
      const occ = UI.en.occupationNames[occupation];
      const g = gender === "male" ? "male" : "female";
      if (score >= 75) {
        return `As a ${g} ${mbti} working in ${occ}, you're very well-prepared for marriage. Ages ${minAge}–${maxAge} are predicted as your optimal window, thanks to a stable personality and solid career foundation.`;
      } else if (score >= 50) {
        return `Your marriage readiness score is average for a ${g} ${mbti} in ${occ}. Consider marriage between ages ${minAge}–${maxAge}. Small lifestyle adjustments can push your readiness higher.`;
      } else {
        return `Your ${mbti} personality and ${occ} career suggest a preference for independence. Ages ${minAge}–${maxAge} are your predicted window, but marriage at your own pace is what matters most.`;
      }
    },
  },
  ja: {
    title: "結婚適齢期計算機",
    subtitle: "MBTI・職業・性別から自分の結婚適齢期を調べましょう",
    genderLabel: "性別",
    male: "男性",
    female: "女性",
    mbtiLabel: "MBTIタイプ",
    mbtiPlaceholder: "MBTIを選択",
    occupationLabel: "職業",
    occupationPlaceholder: "職業を選択",
    ageLabel: "現在の年齢",
    agePlaceholder: "年齢を入力 (18–60)",
    calculateBtn: "計算する",
    resetBtn: "リセット",
    resultTitle: "あなたの結婚適齢期予測",
    marriageAgeRange: "予測結婚適齢期",
    marriageScore: "結婚準備スコア",
    yearsLeft: (n) => `適齢期まであと約${n}年`,
    inRange: "今がまさに結婚適齢期です！🎉",
    pastPeak: "統計的な適齢期は過ぎていますが、結婚に遅すぎることはありません 😊",
    disclaimer: "* 統計的傾向に基づいた楽しい計算機です",
    occupationNames: {
      employee: "会社員",
      selfEmployed: "自営業",
      freelancer: "フリーランス",
      publicServant: "公務員",
      professional: "専門職",
      student: "学生",
      homemaker: "主婦/主夫",
      agriculture: "農業",
      medical: "医療職",
      it: "IT職",
    },
    descriptionFn: (gender, mbti, occupation, minAge, maxAge, score) => {
      const occ = UI.ja.occupationNames[occupation];
      const g = gender === "male" ? "男性" : "女性";
      if (score >= 75) {
        return `${g}の${mbti}で${occ}として、結婚の準備がとても整っています。${minAge}〜${maxAge}歳が最適な時期と予測され、安定した性格と職業的基盤が良い結婚条件を作り出しています。`;
      } else if (score >= 50) {
        return `${g}の${mbti}・${occ}としての結婚準備スコアは平均的です。${minAge}〜${maxAge}歳の間に結婚を検討してみてください。生活パターンを少し調整することで、より高いスコアが期待できます。`;
      } else {
        return `${mbti}の性格と${occ}の特性から、独立した生活を好む傾向があります。${minAge}〜${maxAge}歳が予測適齢期ですが、自分のペースで結婚を準備することが大切です。`;
      }
    },
  },
  fr: {
    title: "Calculateur d'Âge Idéal pour le Mariage",
    subtitle: "Découvrez votre âge idéal pour le mariage selon MBTI, profession et genre",
    genderLabel: "Genre",
    male: "Homme",
    female: "Femme",
    mbtiLabel: "Type MBTI",
    mbtiPlaceholder: "Sélectionner le MBTI",
    occupationLabel: "Profession",
    occupationPlaceholder: "Sélectionner la profession",
    ageLabel: "Âge Actuel",
    agePlaceholder: "Entrez l'âge (18–60)",
    calculateBtn: "Calculer",
    resetBtn: "Réinitialiser",
    resultTitle: "Prédiction de Votre Âge de Mariage",
    marriageAgeRange: "Plage d'Âge Idéale pour le Mariage",
    marriageScore: "Score de Préparation au Mariage",
    yearsLeft: (n) => `Environ ${n} an${n !== 1 ? "s" : ""} avant votre fenêtre optimale`,
    inRange: "Vous êtes dans votre fenêtre de mariage optimale ! 🎉",
    pastPeak: "Statistiquement passé la fenêtre de pointe — mais il n'est jamais trop tard 😊",
    disclaimer: "* Calculateur amusant basé sur les tendances statistiques",
    occupationNames: {
      employee: "Employé",
      selfEmployed: "Indépendant",
      freelancer: "Freelance",
      publicServant: "Fonctionnaire",
      professional: "Professionnel",
      student: "Étudiant",
      homemaker: "Au Foyer",
      agriculture: "Agriculture",
      medical: "Médical",
      it: "IT / Tech",
    },
    descriptionFn: (gender, mbti, occupation, minAge, maxAge, score) => {
      const occ = UI.fr.occupationNames[occupation];
      const g = gender === "male" ? "homme" : "femme";
      if (score >= 75) {
        return `En tant qu'${g} ${mbti} travaillant dans ${occ}, vous êtes très bien préparé(e) pour le mariage. Les âges ${minAge}–${maxAge} sont prévus comme votre fenêtre optimale, grâce à une personnalité stable et une base professionnelle solide.`;
      } else if (score >= 50) {
        return `Votre score de préparation au mariage est moyen pour un(e) ${g} ${mbti} en ${occ}. Envisagez le mariage entre ${minAge}–${maxAge} ans. De petits ajustements de style de vie peuvent améliorer votre score.`;
      } else {
        return `Votre personnalité ${mbti} et votre carrière en ${occ} suggèrent une préférence pour l'indépendance. Les âges ${minAge}–${maxAge} sont votre fenêtre prévue, mais le mariage à votre propre rythme est ce qui compte le plus.`;
      }
    },
  },
  es: {
    title: "Calculadora de Edad Ideal para el Matrimonio",
    subtitle: "Descubre tu edad ideal para el matrimonio según MBTI, ocupación y género",
    genderLabel: "Género",
    male: "Hombre",
    female: "Mujer",
    mbtiLabel: "Tipo MBTI",
    mbtiPlaceholder: "Selecciona MBTI",
    occupationLabel: "Ocupación",
    occupationPlaceholder: "Selecciona ocupación",
    ageLabel: "Edad Actual",
    agePlaceholder: "Ingresa edad (18–60)",
    calculateBtn: "Calcular",
    resetBtn: "Reiniciar",
    resultTitle: "Predicción de Tu Edad de Matrimonio",
    marriageAgeRange: "Rango de Edad Ideal para el Matrimonio",
    marriageScore: "Puntuación de Preparación para el Matrimonio",
    yearsLeft: (n) => `Aproximadamente ${n} año${n !== 1 ? "s" : ""} hasta tu ventana óptima`,
    inRange: "¡Estás en tu ventana óptima de matrimonio ahora mismo! 🎉",
    pastPeak: "Estadísticamente pasada la ventana de pico — pero nunca es demasiado tarde 😊",
    disclaimer: "* Calculadora divertida basada en tendencias estadísticas",
    occupationNames: {
      employee: "Empleado",
      selfEmployed: "Autónomo",
      freelancer: "Freelance",
      publicServant: "Funcionario",
      professional: "Profesional",
      student: "Estudiante",
      homemaker: "Ama/Amo de Casa",
      agriculture: "Agricultura",
      medical: "Médico",
      it: "IT / Tecnología",
    },
    descriptionFn: (gender, mbti, occupation, minAge, maxAge, score) => {
      const occ = UI.es.occupationNames[occupation];
      const g = gender === "male" ? "hombre" : "mujer";
      if (score >= 75) {
        return `Como ${g} ${mbti} que trabaja en ${occ}, estás muy bien preparado/a para el matrimonio. Las edades ${minAge}–${maxAge} se predicen como tu ventana óptima, gracias a una personalidad estable y una base profesional sólida.`;
      } else if (score >= 50) {
        return `Tu puntuación de preparación para el matrimonio es promedio para un/a ${g} ${mbti} en ${occ}. Considera el matrimonio entre los ${minAge}–${maxAge} años. Pequeños ajustes en el estilo de vida pueden mejorar tu puntuación.`;
      } else {
        return `Tu personalidad ${mbti} y tu carrera en ${occ} sugieren una preferencia por la independencia. Las edades ${minAge}–${maxAge} son tu ventana prevista, pero casarte a tu propio ritmo es lo que más importa.`;
      }
    },
  },
  zh: {
    title: "结婚适龄期计算器",
    subtitle: "通过MBTI、职业和性别了解你的理想结婚年龄",
    genderLabel: "性别",
    male: "男性",
    female: "女性",
    mbtiLabel: "MBTI类型",
    mbtiPlaceholder: "选择MBTI",
    occupationLabel: "职业",
    occupationPlaceholder: "选择职业",
    ageLabel: "当前年龄",
    agePlaceholder: "输入年龄 (18–60)",
    calculateBtn: "计算",
    resetBtn: "重置",
    resultTitle: "你的结婚年龄预测",
    marriageAgeRange: "理想结婚年龄范围",
    marriageScore: "结婚准备分数",
    yearsLeft: (n) => `距离最佳结婚期约 ${n} 年`,
    inRange: "你现在正处于最佳结婚年龄！🎉",
    pastPeak: "统计上已过最佳窗口期——但结婚永远不嫌晚 😊",
    disclaimer: "* 基于统计趋势的娱乐计算器",
    occupationNames: {
      employee: "上班族",
      selfEmployed: "自营业主",
      freelancer: "自由职业",
      publicServant: "公务员",
      professional: "专业人士",
      student: "学生",
      homemaker: "家庭主妇/夫",
      agriculture: "农业",
      medical: "医疗",
      it: "IT行业",
    },
    descriptionFn: (gender, mbti, occupation, minAge, maxAge, score) => {
      const occ = UI.zh.occupationNames[occupation];
      const g = gender === "male" ? "男性" : "女性";
      if (score >= 75) {
        return `作为${g}${mbti}从事${occ}，你的结婚准备非常充分。预测${minAge}–${maxAge}岁为最佳结婚窗口，稳定的性格和职业基础为良好的婚姻创造了条件。`;
      } else if (score >= 50) {
        return `${g}${mbti}从事${occ}的结婚准备分数处于平均水平。考虑在${minAge}–${maxAge}岁之间结婚。适当调整生活方式可以提高你的准备分数。`;
      } else {
        return `${mbti}性格特征和${occ}职业特点表明你倾向于独立生活。预测结婚窗口为${minAge}–${maxAge}岁，但按照自己的节奏准备婚姻才是最重要的。`;
      }
    },
  },
};

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 75
      ? "from-emerald-400 to-teal-400"
      : score >= 50
      ? "from-blue-400 to-indigo-400"
      : score >= 25
      ? "from-amber-400 to-orange-400"
      : "from-rose-400 to-pink-400";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-gray-600"></span>
        <span className="text-2xl font-bold text-gray-900">{score}<span className="text-base font-normal text-gray-500"> / 100</span></span>
      </div>
      <div className="relative h-4 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarriageAgeCalculator({ locale }: Props) {
  const t = UI[locale] ?? UI.en;

  const [gender, setGender] = useState<Gender>("male");
  const [mbti, setMbti] = useState<MBTIType | "">("");
  const [occupation, setOccupation] = useState<OccupationType | "">("");
  const [ageStr, setAgeStr] = useState("");
  const [result, setResult] = useState<MarriageResult | null>(null);

  const canCalculate = mbti !== "" && occupation !== "" && ageStr !== "" && parseInt(ageStr) >= 18 && parseInt(ageStr) <= 60;

  function handleCalculate() {
    if (!canCalculate) return;
    const age = parseInt(ageStr);
    setResult(computeResult(gender, mbti as MBTIType, occupation as OccupationType, age));
  }

  function handleReset() {
    setGender("male");
    setMbti("");
    setOccupation("");
    setAgeStr("");
    setResult(null);
  }

  const description = result && mbti && occupation
    ? t.descriptionFn(gender, mbti as MBTIType, occupation as OccupationType, result.minAge, result.maxAge, result.score)
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      {/* Input card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        {/* Gender */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">{t.genderLabel}</p>
          <div className="flex gap-2">
            {(["male","female"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  gender === g
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-rose-300"
                }`}
              >
                {g === "male" ? t.male : t.female}
              </button>
            ))}
          </div>
        </div>

        {/* MBTI */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.mbtiLabel}</label>
          <select
            value={mbti}
            onChange={(e) => { setMbti(e.target.value as MBTIType); setResult(null); }}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="">{t.mbtiPlaceholder}</option>
            {MBTI_TYPES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Occupation */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.occupationLabel}</label>
          <select
            value={occupation}
            onChange={(e) => { setOccupation(e.target.value as OccupationType); setResult(null); }}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="">{t.occupationPlaceholder}</option>
            {OCCUPATION_TYPES.map((o) => (
              <option key={o} value={o}>{t.occupationNames[o]}</option>
            ))}
          </select>
        </div>

        {/* Age */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.ageLabel}</label>
          <input
            type="number"
            min={18}
            max={60}
            value={ageStr}
            onChange={(e) => { setAgeStr(e.target.value); setResult(null); }}
            placeholder={t.agePlaceholder}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <button
          onClick={handleCalculate}
          disabled={!canCalculate}
          className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 py-3 font-semibold text-white shadow-md hover:from-rose-600 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {t.calculateBtn}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 p-6 space-y-5">
          <h2 className="text-center font-bold text-rose-600 text-lg">{t.resultTitle}</h2>

          {/* Age range */}
          <div className="text-center">
            <p className="text-xs font-medium text-rose-400 uppercase tracking-wider mb-1">{t.marriageAgeRange}</p>
            <p className="text-5xl font-extrabold text-rose-600">
              {result.minAge}<span className="text-2xl font-semibold text-rose-400 mx-1">–</span>{result.maxAge}
              <span className="text-xl font-medium text-rose-400 ml-1">{locale === "ko" ? "세" : locale === "ja" ? "歳" : ""}</span>
            </p>
          </div>

          {/* Status badge */}
          <div className={`rounded-xl px-4 py-2.5 text-center text-sm font-medium ${
            result.isPastPeak
              ? "bg-amber-100 text-amber-700"
              : result.yearsLeft === null
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {result.isPastPeak
              ? t.pastPeak
              : result.yearsLeft === null
              ? t.inRange
              : t.yearsLeft(result.yearsLeft)}
          </div>

          {/* Score */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">{t.marriageScore}</p>
            <ScoreBar score={result.score} />
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-gray-700 bg-white/60 rounded-xl p-4">
            {description}
          </p>

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">{t.disclaimer}</p>
            <button
              onClick={handleReset}
              className="rounded-lg border border-rose-300 px-4 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              {t.resetBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
