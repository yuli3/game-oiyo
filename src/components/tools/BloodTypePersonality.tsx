import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type BloodType = "A" | "B" | "O" | "AB";

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  selectPrompt: string;
  typeLabel: string;
  traitsLabel: string;
  strengthsLabel: string;
  weaknessesLabel: string;
  compatibilityLabel: string;
  famousLabel: string;
  resetBtn: string;
  types: Record<BloodType, string>;
}> = {
  ko: {
    title: "혈액형 성격 분석",
    subtitle: "당신의 혈액형으로 성격·강점·약점·궁합을 알아보세요",
    selectPrompt: "혈액형을 선택하세요",
    typeLabel: "혈액형",
    traitsLabel: "성격 특성",
    strengthsLabel: "강점",
    weaknessesLabel: "약점",
    compatibilityLabel: "궁합",
    famousLabel: "같은 혈액형 유명인",
    resetBtn: "다시 선택",
    types: { A: "A형", B: "B형", O: "O형", AB: "AB형" },
  },
  en: {
    title: "Blood Type Personality",
    subtitle: "Discover your personality traits, strengths, weaknesses, and compatibility",
    selectPrompt: "Select your blood type",
    typeLabel: "Blood Type",
    traitsLabel: "Personality Traits",
    strengthsLabel: "Strengths",
    weaknessesLabel: "Weaknesses",
    compatibilityLabel: "Compatibility",
    famousLabel: "Famous People",
    resetBtn: "Choose Again",
    types: { A: "Type A", B: "Type B", O: "Type O", AB: "Type AB" },
  },
  ja: {
    title: "血液型性格分析",
    subtitle: "あなたの血液型で性格・強み・弱み・相性を調べましょう",
    selectPrompt: "血液型を選んでください",
    typeLabel: "血液型",
    traitsLabel: "性格特徴",
    strengthsLabel: "強み",
    weaknessesLabel: "弱み",
    compatibilityLabel: "相性",
    famousLabel: "同じ血液型の有名人",
    resetBtn: "もう一度選ぶ",
    types: { A: "A型", B: "B型", O: "O型", AB: "AB型" },
  },
  fr: {
    title: "Personnalité par Groupe Sanguin",
    subtitle: "Découvrez vos traits, forces, faiblesses et compatibilités",
    selectPrompt: "Sélectionnez votre groupe sanguin",
    typeLabel: "Groupe Sanguin",
    traitsLabel: "Traits de Personnalité",
    strengthsLabel: "Forces",
    weaknessesLabel: "Faiblesses",
    compatibilityLabel: "Compatibilité",
    famousLabel: "Personnalités célèbres",
    resetBtn: "Choisir à nouveau",
    types: { A: "Groupe A", B: "Groupe B", O: "Groupe O", AB: "Groupe AB" },
  },
  es: {
    title: "Personalidad por Tipo de Sangre",
    subtitle: "Descubre tus rasgos, fortalezas, debilidades y compatibilidad",
    selectPrompt: "Selecciona tu tipo de sangre",
    typeLabel: "Tipo de Sangre",
    traitsLabel: "Rasgos de Personalidad",
    strengthsLabel: "Fortalezas",
    weaknessesLabel: "Debilidades",
    compatibilityLabel: "Compatibilidad",
    famousLabel: "Personas Famosas",
    resetBtn: "Elegir de nuevo",
    types: { A: "Tipo A", B: "Tipo B", O: "Tipo O", AB: "Tipo AB" },
  },
  zh: {
    title: "血型性格分析",
    subtitle: "通过血型了解你的性格特征、优势、弱点和相容性",
    selectPrompt: "选择你的血型",
    typeLabel: "血型",
    traitsLabel: "性格特征",
    strengthsLabel: "优势",
    weaknessesLabel: "弱点",
    compatibilityLabel: "相容性",
    famousLabel: "同血型名人",
    resetBtn: "重新选择",
    types: { A: "A型", B: "B型", O: "O型", AB: "AB型" },
  },
};

interface TypeData {
  emoji: string;
  color: string;
  bg: string;
  border: string;
  traits: Record<Locale, string[]>;
  strengths: Record<Locale, string[]>;
  weaknesses: Record<Locale, string[]>;
  compatibility: Record<Locale, { best: string; good: string; challenging: string }>;
  famous: string[];
  description: Record<Locale, string>;
}

const TYPE_DATA: Record<BloodType, TypeData> = {
  A: {
    emoji: "🌸",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    description: {
      ko: "A형은 꼼꼼하고 책임감이 강한 완벽주의자입니다. 규칙과 질서를 중시하며, 타인의 감정에 세심하게 반응합니다.",
      en: "Type A individuals are meticulous perfectionists with a strong sense of responsibility. They value rules and order, and are highly sensitive to others' emotions.",
      ja: "A型は几帳面で責任感の強い完璧主義者です。規則と秩序を大切にし、他人の感情に細やかに反応します。",
      fr: "Les personnes de groupe A sont des perfectionnistes méticuleux avec un fort sens des responsabilités. Ils valorisent les règles et l'ordre.",
      es: "Las personas de tipo A son perfeccionistas meticulosos con un fuerte sentido de responsabilidad. Valoran las reglas y el orden.",
      zh: "A型人是一丝不苟的完美主义者，责任感强。重视规则和秩序，对他人情感反应敏锐。",
    },
    traits: {
      ko: ["꼼꼼함", "책임감", "완벽주의", "배려심", "예민함", "내향적", "규칙 중시"],
      en: ["Meticulous", "Responsible", "Perfectionist", "Considerate", "Sensitive", "Introverted", "Rule-follower"],
      ja: ["几帳面", "責任感", "完璧主義", "思いやり", "繊細", "内向的", "規則重視"],
      fr: ["Méticuleux", "Responsable", "Perfectionniste", "Attentionné", "Sensible", "Introverti", "Respectueux des règles"],
      es: ["Meticuloso", "Responsable", "Perfeccionista", "Considerado", "Sensible", "Introvertido", "Respeta reglas"],
      zh: ["一丝不苟", "责任感强", "完美主义", "体贴", "敏感", "内向", "遵守规则"],
    },
    strengths: {
      ko: ["높은 집중력", "꾸준한 노력", "세심한 배려", "신뢰성", "계획적 실행"],
      en: ["High focus", "Consistent effort", "Attentiveness", "Reliability", "Organized execution"],
      ja: ["高い集中力", "コツコツ努力", "細やかな配慮", "信頼性", "計画的な実行"],
      fr: ["Grande concentration", "Effort constant", "Attention aux détails", "Fiabilité", "Exécution organisée"],
      es: ["Alta concentración", "Esfuerzo constante", "Atención", "Confiabilidad", "Ejecución organizada"],
      zh: ["高度专注", "持续努力", "细心体贴", "可靠性", "有条理执行"],
    },
    weaknesses: {
      ko: ["지나친 걱정", "융통성 부족", "스트레스에 취약", "변화 거부감", "자기비판 과도"],
      en: ["Over-worrying", "Inflexibility", "Stress-prone", "Resistance to change", "Excessive self-criticism"],
      ja: ["心配しすぎ", "融通が利かない", "ストレスに弱い", "変化への抵抗", "過度な自己批判"],
      fr: ["Trop d'inquiétude", "Manque de flexibilité", "Sensible au stress", "Résistance au changement", "Autocritique excessive"],
      es: ["Preocupación excesiva", "Inflexibilidad", "Propenso al estrés", "Resistencia al cambio", "Autocrítica excesiva"],
      zh: ["过度担忧", "缺乏灵活性", "容易有压力", "抗拒改变", "过度自我批评"],
    },
    compatibility: {
      ko: { best: "A형 · AB형", good: "O형", challenging: "B형" },
      en: { best: "Type A · Type AB", good: "Type O", challenging: "Type B" },
      ja: { best: "A型・AB型", good: "O型", challenging: "B型" },
      fr: { best: "Groupe A · Groupe AB", good: "Groupe O", challenging: "Groupe B" },
      es: { best: "Tipo A · Tipo AB", good: "Tipo O", challenging: "Tipo B" },
      zh: { best: "A型・AB型", good: "O型", challenging: "B型" },
    },
    famous: ["Adolf Hitler", "George H. W. Bush", "Ayumi Hamasaki", "Soseki Natsume"],
  },
  B: {
    emoji: "🔥",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    description: {
      ko: "B형은 창의적이고 자유분방한 개인주의자입니다. 호기심이 많고 열정적이며, 자신만의 방식을 고집하는 경향이 있습니다.",
      en: "Type B individuals are creative, free-spirited individualists. Curious and passionate, they tend to follow their own path.",
      ja: "B型は創造的で自由奔放な個人主義者です。好奇心旺盛で情熱的で、自分のやり方にこだわる傾向があります。",
      fr: "Les personnes de groupe B sont des individualistes créatifs et libres. Curieux et passionnés, ils suivent leur propre chemin.",
      es: "Las personas de tipo B son individualistas creativos y libres. Curiosos y apasionados, tienden a seguir su propio camino.",
      zh: "B型人是創意十足、自由奔放的個人主義者。好奇心強、充滿熱情，傾向於走自己的路。",
    },
    traits: {
      ko: ["창의적", "열정적", "자유분방", "호기심 많음", "낙관적", "외향적", "자기중심적"],
      en: ["Creative", "Passionate", "Free-spirited", "Curious", "Optimistic", "Extroverted", "Self-focused"],
      ja: ["創造的", "情熱的", "自由奔放", "好奇心旺盛", "楽観的", "外向的", "自己中心的"],
      fr: ["Créatif", "Passionné", "Libre", "Curieux", "Optimiste", "Extraverti", "Centré sur soi"],
      es: ["Creativo", "Apasionado", "Libre", "Curioso", "Optimista", "Extrovertido", "Enfocado en sí mismo"],
      zh: ["富有創意", "充滿熱情", "自由奔放", "好奇心強", "樂觀", "外向", "以自我為中心"],
    },
    strengths: {
      ko: ["강한 창의력", "높은 집중력(관심 분야)", "낙천적 에너지", "솔직함", "적응력"],
      en: ["Strong creativity", "Intense focus (area of interest)", "Optimistic energy", "Honesty", "Adaptability"],
      ja: ["強い創造力", "高い集中力（興味分野）", "楽観的なエネルギー", "率直さ", "適応力"],
      fr: ["Grande créativité", "Concentration intense (intérêt)", "Énergie optimiste", "Honnêteté", "Adaptabilité"],
      es: ["Gran creatividad", "Concentración intensa", "Energía optimista", "Honestidad", "Adaptabilidad"],
      zh: ["创造力强", "强烈专注力(感兴趣领域)", "乐观能量", "坦诚", "适应能力"],
    },
    weaknesses: {
      ko: ["끈기 부족", "자기중심적 경향", "규칙 무시", "산만함", "마무리 부족"],
      en: ["Lack of persistence", "Self-centered tendencies", "Disregard for rules", "Distractibility", "Poor follow-through"],
      ja: ["継続力不足", "自己中心的な傾向", "ルール無視", "注意散漫", "締めくくりが甘い"],
      fr: ["Manque de persistance", "Tendances égocentristes", "Mépris des règles", "Distraction", "Mauvais suivi"],
      es: ["Falta de persistencia", "Tendencias egocéntricas", "Descuido de reglas", "Distracción", "Poco seguimiento"],
      zh: ["缺乏坚持", "以自我为中心的倾向", "无视规则", "注意力不集中", "缺乏后续跟进"],
    },
    compatibility: {
      ko: { best: "B형 · AB형", good: "O형", challenging: "A형" },
      en: { best: "Type B · Type AB", good: "Type O", challenging: "Type A" },
      ja: { best: "B型・AB型", good: "O型", challenging: "A型" },
      fr: { best: "Groupe B · Groupe AB", good: "Groupe O", challenging: "Groupe A" },
      es: { best: "Tipo B · Tipo AB", good: "Tipo O", challenging: "Tipo A" },
      zh: { best: "B型・AB型", good: "O型", challenging: "A型" },
    },
    famous: ["Paul McCartney", "Leonardo DiCaprio", "Jack Nicholson", "Akira Kurosawa"],
  },
  O: {
    emoji: "🌊",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: {
      ko: "O형은 사교적이고 리더십이 강한 행동파입니다. 목표 지향적이고 경쟁심이 강하며, 타인을 이끄는 데 탁월한 능력을 보입니다.",
      en: "Type O individuals are sociable, action-oriented leaders. Goal-driven and competitive, they excel at guiding others.",
      ja: "O型は社交的でリーダーシップの強い行動派です。目標志向で競争心が強く、他者を引っ張るのが得意です。",
      fr: "Les personnes de groupe O sont des leaders sociables et orientés action. Ambitieux et compétitifs, ils excellent à guider les autres.",
      es: "Las personas de tipo O son líderes sociables y orientados a la acción. Orientados a metas y competitivos, excelentes guiando a otros.",
      zh: "O型人是善于社交、行动力强的领导者。目标导向、竞争心强，擅长引领他人。",
    },
    traits: {
      ko: ["사교적", "리더십", "행동파", "경쟁심", "자신감", "직관적", "현실적"],
      en: ["Sociable", "Leadership", "Action-oriented", "Competitive", "Confident", "Intuitive", "Realistic"],
      ja: ["社交的", "リーダーシップ", "行動派", "競争心", "自信家", "直感的", "現実的"],
      fr: ["Sociable", "Leadership", "Orienté action", "Compétitif", "Confiant", "Intuitif", "Réaliste"],
      es: ["Sociable", "Liderazgo", "Orientado a la acción", "Competitivo", "Confiado", "Intuitivo", "Realista"],
      zh: ["善于社交", "领导力强", "行动导向", "好胜心强", "自信", "直觉敏锐", "现实主义"],
    },
    strengths: {
      ko: ["강한 추진력", "리더십", "넓은 사교성", "위기 대응력", "열정"],
      en: ["Strong drive", "Leadership", "Social skills", "Crisis response", "Passion"],
      ja: ["強い推進力", "リーダーシップ", "広い社交性", "危機対応力", "情熱"],
      fr: ["Forte motivation", "Leadership", "Compétences sociales", "Gestion de crise", "Passion"],
      es: ["Fuerte impulso", "Liderazgo", "Habilidades sociales", "Respuesta a crisis", "Pasión"],
      zh: ["强大的驱动力", "领导能力", "广泛社交性", "危机应对力", "热情"],
    },
    weaknesses: {
      ko: ["고집스러움", "질투심", "충동적", "타인 의견 무시", "독선적"],
      en: ["Stubbornness", "Jealousy", "Impulsiveness", "Ignoring others' opinions", "Self-righteousness"],
      ja: ["頑固", "嫉妬心", "衝動的", "他者の意見を無視", "独善的"],
      fr: ["Entêtement", "Jalousie", "Impulsivité", "Ignorer les opinions", "Autosatisfaction"],
      es: ["Terquedad", "Celos", "Impulsividad", "Ignorar opiniones", "Autosuficiencia"],
      zh: ["固执", "嫉妒心", "冲动", "忽视他人意见", "独断独行"],
    },
    compatibility: {
      ko: { best: "O형 · A형", good: "AB형", challenging: "B형" },
      en: { best: "Type O · Type A", good: "Type AB", challenging: "Type B" },
      ja: { best: "O型・A型", good: "AB型", challenging: "B型" },
      fr: { best: "Groupe O · Groupe A", good: "Groupe AB", challenging: "Groupe B" },
      es: { best: "Tipo O · Tipo A", good: "Tipo AB", challenging: "Tipo B" },
      zh: { best: "O型・A型", good: "AB型", challenging: "B型" },
    },
    famous: ["Barack Obama", "Queen Elizabeth II", "Elvis Presley", "John Lennon"],
  },
  AB: {
    emoji: "✨",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    description: {
      ko: "AB형은 이성적이고 독창적인 양면성의 소유자입니다. A형의 꼼꼼함과 B형의 자유로움을 동시에 지니며, 복잡하고 신비로운 성격을 가집니다.",
      en: "Type AB individuals are rational, original, and dual-natured. They blend Type A's meticulousness with Type B's freedom, creating a complex, enigmatic personality.",
      ja: "AB型は理性的で独創的な二面性の持ち主です。A型の几帳面さとB型の自由さを同時に持ち、複雑で神秘的な性格を持ちます。",
      fr: "Les personnes AB sont rationnelles, originales et à double nature. Elles mélangent le souci du détail A et la liberté B, créant une personnalité complexe.",
      es: "Las personas AB son racionales, originales y de doble naturaleza. Mezclan el detallismo A con la libertad B, creando una personalidad compleja.",
      zh: "AB型人理性、独特，具有双重性格。融合了A型的细心和B型的自由，形成了复杂而神秘的性格。",
    },
    traits: {
      ko: ["이성적", "독창적", "양면성", "냉정함", "분석적", "예술적", "복잡함"],
      en: ["Rational", "Original", "Dual-natured", "Cool-headed", "Analytical", "Artistic", "Complex"],
      ja: ["理性的", "独創的", "二面性", "冷静", "分析的", "芸術的", "複雑"],
      fr: ["Rationnel", "Original", "Double nature", "Sang-froid", "Analytique", "Artistique", "Complexe"],
      es: ["Racional", "Original", "Doble naturaleza", "Cabeza fría", "Analítico", "Artístico", "Complejo"],
      zh: ["理性", "独创", "双重性格", "冷静", "分析型", "艺术气质", "复杂"],
    },
    strengths: {
      ko: ["탁월한 분석력", "창의적 문제 해결", "다양한 관점 수용", "중재 능력", "예술적 감성"],
      en: ["Excellent analysis", "Creative problem-solving", "Perspective-taking", "Mediation skills", "Artistic sensibility"],
      ja: ["卓越した分析力", "創造的問題解決", "多様な視点受容", "仲裁能力", "芸術的感性"],
      fr: ["Excellente analyse", "Résolution créative", "Perspectives multiples", "Médiation", "Sensibilité artistique"],
      es: ["Excelente análisis", "Resolución creativa", "Múltiples perspectivas", "Mediación", "Sensibilidad artística"],
      zh: ["卓越分析力", "创意问题解决", "多角度思考", "调解能力", "艺术感性"],
    },
    weaknesses: {
      ko: ["우유부단", "내면 갈등", "거리감", "기분 변덕", "과도한 분석"],
      en: ["Indecisiveness", "Inner conflict", "Emotional distance", "Mood swings", "Over-analysis"],
      ja: ["優柔不断", "内面の葛藤", "距離感", "気分の浮き沈み", "過度な分析"],
      fr: ["Indécision", "Conflit intérieur", "Distance émotionnelle", "Sautes d'humeur", "Suranalyse"],
      es: ["Indecisión", "Conflicto interior", "Distancia emocional", "Cambios de humor", "Sobreanálisis"],
      zh: ["优柔寡断", "内心冲突", "情感疏离", "情绪不稳", "过度分析"],
    },
    compatibility: {
      ko: { best: "AB형 · O형", good: "A형", challenging: "B형" },
      en: { best: "Type AB · Type O", good: "Type A", challenging: "Type B" },
      ja: { best: "AB型・O型", good: "A型", challenging: "B型" },
      fr: { best: "Groupe AB · Groupe O", good: "Groupe A", challenging: "Groupe B" },
      es: { best: "Tipo AB · Tipo O", good: "Tipo A", challenging: "Tipo B" },
      zh: { best: "AB型・O型", good: "A型", challenging: "B型" },
    },
    famous: ["Barack Obama (claim varies)", "John F. Kennedy", "Marilyn Monroe", "Miyazaki Hayao"],
  },
};

const COMPAT_LABEL: Record<Locale, { best: string; good: string; challenging: string }> = {
  ko: { best: "최고의 궁합 💕", good: "좋은 궁합 👍", challenging: "어려운 궁합 ⚡" },
  en: { best: "Best Match 💕", good: "Good Match 👍", challenging: "Challenging 🌊" },
  ja: { best: "最高の相性 💕", good: "良い相性 👍", challenging: "難しい相性 ⚡" },
  fr: { best: "Meilleure compatibilité 💕", good: "Bonne compatibilité 👍", challenging: "Difficile ⚡" },
  es: { best: "Mejor compatibilidad 💕", good: "Buena compatibilidad 👍", challenging: "Difícil ⚡" },
  zh: { best: "最佳配對 💕", good: "良好配對 👍", challenging: "有挑戰性 ⚡" },
};

export default function BloodTypePersonality({ locale }: Props) {
  const [selected, setSelected] = useState<BloodType | null>(null);
  const ui = UI[locale];
  const compatLabel = COMPAT_LABEL[locale];

  const TYPES: BloodType[] = ["A", "B", "O", "AB"];

  if (!selected) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
          <p className="mt-2 text-gray-500 text-sm">{ui.subtitle}</p>
        </div>

        <p className="text-center text-gray-600 font-medium">{ui.selectPrompt}</p>

        <div className="grid grid-cols-2 gap-4">
          {TYPES.map((type) => {
            const data = TYPE_DATA[type];
            return (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 ${data.bg} ${data.border} hover:shadow-md transition-all hover:scale-105 cursor-pointer`}
              >
                <span className="text-5xl mb-3">{data.emoji}</span>
                <span className={`text-2xl font-bold ${data.color}`}>{ui.types[type]}</span>
              </button>
            );
          })}
        </div>

        <div className={`rounded-xl border p-4 bg-gray-50 border-gray-200`}>
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            {locale === "ko" && "혈액형 성격 이론은 과학적으로 검증되지 않은 대중 문화입니다. 재미로만 참고하세요."}
            {locale === "en" && "Blood type personality theory is popular culture, not scientifically validated. For entertainment only."}
            {locale === "ja" && "血液型性格診断は科学的に検証されていない大衆文化です。楽しみとしてご参考ください。"}
            {locale === "fr" && "La théorie de personnalité par groupe sanguin n'est pas scientifiquement validée. À titre de divertissement."}
            {locale === "es" && "La teoría de personalidad por tipo de sangre no está validada científicamente. Solo para entretenimiento."}
            {locale === "zh" && "血型性格理论是大众文化，并非科学验证。仅供娱乐参考。"}
          </p>
        </div>
      </div>
    );
  }

  const data = TYPE_DATA[selected];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 text-center ${data.bg} border-2 ${data.border}`}>
        <div className="text-6xl mb-2">{data.emoji}</div>
        <h1 className={`text-3xl font-bold ${data.color}`}>{ui.types[selected]}</h1>
        <p className="mt-3 text-gray-700 text-sm leading-relaxed">{data.description[locale]}</p>
      </div>

      {/* Traits */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{ui.traitsLabel}</h2>
        <div className="flex flex-wrap gap-2">
          {data.traits[locale].map((trait) => (
            <span key={trait} className={`px-3 py-1 rounded-full text-sm font-medium ${data.bg} ${data.color} border ${data.border}`}>
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-700 mb-3">✅ {ui.strengthsLabel}</h2>
          <ul className="space-y-1">
            {data.strengths[locale].map((s) => (
              <li key={s} className="text-sm text-gray-700">• {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-700 mb-3">⚠️ {ui.weaknessesLabel}</h2>
          <ul className="space-y-1">
            {data.weaknesses[locale].map((w) => (
              <li key={w} className="text-sm text-gray-700">• {w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Compatibility */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{ui.compatibilityLabel}</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{compatLabel.best}</span>
            <span className="font-semibold text-gray-800">{data.compatibility[locale].best}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{compatLabel.good}</span>
            <span className="font-semibold text-gray-800">{data.compatibility[locale].good}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{compatLabel.challenging}</span>
            <span className="font-semibold text-gray-800">{data.compatibility[locale].challenging}</span>
          </div>
        </div>
      </div>

      {/* Famous People */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{ui.famousLabel}</h2>
        <div className="flex flex-wrap gap-2">
          {data.famous.map((name) => (
            <span key={name} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 border border-gray-200">
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => setSelected(null)}
        className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
      >
        ← {ui.resetBtn}
      </button>
    </div>
  );
}
