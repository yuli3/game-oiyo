import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MBTIType =
  | "INTJ" | "INTP" | "ENTJ" | "ENTP"
  | "INFJ" | "INFP" | "ENFJ" | "ENFP"
  | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ"
  | "ISTP" | "ISFP" | "ESTP" | "ESFP";

type CompatLevel = "soulmate" | "great" | "good" | "neutral" | "challenging";

interface TypeProfile {
  emoji: string;
  nickname: Record<Locale, string>;
  description: Record<Locale, string>;
  strengths: Record<Locale, string[]>;
  weaknesses: Record<Locale, string[]>;
  color: string;
  group: "analyst" | "diplomat" | "sentinel" | "explorer";
}

interface CompatResult {
  level: CompatLevel;
  summary: Record<Locale, string>;
  tips: Record<Locale, string[]>;
}

// ─── i18n UI ──────────────────────────────────────────────────────────────────

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    selectA: string;
    selectB: string;
    analyzeBtn: string;
    resetBtn: string;
    yourTypes: string;
    compatLabel: string;
    summaryLabel: string;
    tipsLabel: string;
    strengthsLabel: string;
    weaknessesLabel: string;
    levelLabels: Record<CompatLevel, string>;
    groupLabels: Record<"analyst" | "diplomat" | "sentinel" | "explorer", string>;
    orSelect: string;
  }
> = {
  ko: {
    title: "MBTI 궁합 매트릭스",
    subtitle: "두 MBTI 유형을 선택해 궁합, 소통 방식, 관계 팁을 알아보세요",
    selectA: "첫 번째 유형 선택",
    selectB: "두 번째 유형 선택",
    analyzeBtn: "궁합 분석",
    resetBtn: "초기화",
    yourTypes: "선택된 유형",
    compatLabel: "궁합 수준",
    summaryLabel: "관계 요약",
    tipsLabel: "관계 팁",
    strengthsLabel: "강점",
    weaknessesLabel: "주의점",
    levelLabels: {
      soulmate: "💜 소울메이트 — 최강 궁합",
      great: "💚 훌륭한 궁합",
      good: "💙 좋은 궁합",
      neutral: "🤍 무난한 궁합",
      challenging: "🔴 도전적 궁합",
    },
    groupLabels: { analyst: "분석가", diplomat: "외교관", sentinel: "관리자", explorer: "탐험가" },
    orSelect: "또는 직접 선택하세요",
  },
  en: {
    title: "MBTI Compatibility Matrix",
    subtitle: "Select two MBTI types to analyze compatibility, communication style, and relationship tips",
    selectA: "Select first type",
    selectB: "Select second type",
    analyzeBtn: "Analyze Compatibility",
    resetBtn: "Reset",
    yourTypes: "Selected types",
    compatLabel: "Compatibility level",
    summaryLabel: "Relationship summary",
    tipsLabel: "Relationship tips",
    strengthsLabel: "Strengths",
    weaknessesLabel: "Watch out for",
    levelLabels: {
      soulmate: "💜 Soulmate — Perfect match",
      great: "💚 Great compatibility",
      good: "💙 Good compatibility",
      neutral: "🤍 Neutral compatibility",
      challenging: "🔴 Challenging match",
    },
    groupLabels: { analyst: "Analyst", diplomat: "Diplomat", sentinel: "Sentinel", explorer: "Explorer" },
    orSelect: "Or select directly",
  },
  ja: {
    title: "MBTI相性マトリックス",
    subtitle: "2つのMBTIタイプを選択して相性、コミュニケーションスタイル、関係のヒントを確認",
    selectA: "最初のタイプを選択",
    selectB: "2番目のタイプを選択",
    analyzeBtn: "相性を分析",
    resetBtn: "リセット",
    yourTypes: "選択されたタイプ",
    compatLabel: "相性レベル",
    summaryLabel: "関係の概要",
    tipsLabel: "関係のヒント",
    strengthsLabel: "強み",
    weaknessesLabel: "注意点",
    levelLabels: {
      soulmate: "💜 ソウルメイト — 最強の相性",
      great: "💚 素晴らしい相性",
      good: "💙 良い相性",
      neutral: "🤍 普通の相性",
      challenging: "🔴 難しい相性",
    },
    groupLabels: { analyst: "分析家", diplomat: "外交官", sentinel: "管理者", explorer: "探険家" },
    orSelect: "または直接選択",
  },
  fr: {
    title: "Matrice de Compatibilité MBTI",
    subtitle: "Sélectionnez deux types MBTI pour analyser compatibilité, style de communication et conseils relationnels",
    selectA: "Sélectionnez le premier type",
    selectB: "Sélectionnez le deuxième type",
    analyzeBtn: "Analyser la compatibilité",
    resetBtn: "Réinitialiser",
    yourTypes: "Types sélectionnés",
    compatLabel: "Niveau de compatibilité",
    summaryLabel: "Résumé de la relation",
    tipsLabel: "Conseils relationnels",
    strengthsLabel: "Points forts",
    weaknessesLabel: "Points d'attention",
    levelLabels: {
      soulmate: "💜 Âme sœur — Correspondance parfaite",
      great: "💚 Excellente compatibilité",
      good: "💙 Bonne compatibilité",
      neutral: "🤍 Compatibilité neutre",
      challenging: "🔴 Correspondance difficile",
    },
    groupLabels: { analyst: "Analyste", diplomat: "Diplomate", sentinel: "Sentinelle", explorer: "Explorateur" },
    orSelect: "Ou sélectionnez directement",
  },
  es: {
    title: "Matriz de Compatibilidad MBTI",
    subtitle: "Selecciona dos tipos MBTI para analizar compatibilidad, estilo de comunicación y consejos de relación",
    selectA: "Selecciona el primer tipo",
    selectB: "Selecciona el segundo tipo",
    analyzeBtn: "Analizar compatibilidad",
    resetBtn: "Restablecer",
    yourTypes: "Tipos seleccionados",
    compatLabel: "Nivel de compatibilidad",
    summaryLabel: "Resumen de la relación",
    tipsLabel: "Consejos de relación",
    strengthsLabel: "Fortalezas",
    weaknessesLabel: "Puntos de atención",
    levelLabels: {
      soulmate: "💜 Alma gemela — Coincidencia perfecta",
      great: "💚 Excelente compatibilidad",
      good: "💙 Buena compatibilidad",
      neutral: "🤍 Compatibilidad neutra",
      challenging: "🔴 Coincidencia desafiante",
    },
    groupLabels: { analyst: "Analista", diplomat: "Diplomático", sentinel: "Centinela", explorer: "Explorador" },
    orSelect: "O selecciona directamente",
  },
  zh: {
    title: "MBTI相容性矩阵",
    subtitle: "选择两种MBTI类型，分析相容性、沟通方式和关系技巧",
    selectA: "选择第一个类型",
    selectB: "选择第二个类型",
    analyzeBtn: "分析相容性",
    resetBtn: "重置",
    yourTypes: "已选类型",
    compatLabel: "相容性水平",
    summaryLabel: "关系摘要",
    tipsLabel: "关系技巧",
    strengthsLabel: "优势",
    weaknessesLabel: "需注意",
    levelLabels: {
      soulmate: "💜 灵魂伴侣 — 完美匹配",
      great: "💚 极佳相容性",
      good: "💙 良好相容性",
      neutral: "🤍 一般相容性",
      challenging: "🔴 具挑战性的匹配",
    },
    groupLabels: { analyst: "分析家", diplomat: "外交家", sentinel: "守护者", explorer: "探索者" },
    orSelect: "或直接选择",
  },
};

// ─── MBTI Type Profiles ───────────────────────────────────────────────────────

const TYPES: Record<MBTIType, TypeProfile> = {
  INTJ: {
    emoji: "🏰",
    group: "analyst",
    color: "bg-purple-100 border-purple-300 text-purple-800",
    nickname: { ko: "전략가", en: "Architect", ja: "建築家", fr: "Architecte", es: "Arquitecto", zh: "策略家", },
    description: { ko: "독립적·전략적 사고, 높은 기준", en: "Independent strategic thinker with high standards", ja: "独立的な戦略的思考、高い基準", fr: "Penseur stratégique indépendant avec de hautes normes", es: "Pensador estratégico independiente con altos estándares", zh: "独立的策略性思维者，标准很高", },
    strengths: { ko: ["전략적 계획", "자기 수련", "독창성"], en: ["Strategic planning", "Self-discipline", "Originality"], ja: ["戦略的計画", "自己鍛錬", "独創性"], fr: ["Planification stratégique", "Autodiscipline", "Originalité"], es: ["Planificación estratégica", "Autodisciplina", "Originalidad"], zh: ["策略规划", "自律", "独创性"], },
    weaknesses: { ko: ["감정 표현 부족", "오만함", "비판적"], en: ["Poor emotional expression", "Arrogant", "Overly critical"], ja: ["感情表現不足", "傲慢", "批判的"], fr: ["Manque d'expression émotionnelle", "Arrogant", "Trop critique"], es: ["Poca expresión emocional", "Arrogante", "Demasiado crítico"], zh: ["情感表达不足", "傲慢", "过度批评"], },
  },
  INTP: {
    emoji: "🔬",
    group: "analyst",
    color: "bg-purple-100 border-purple-300 text-purple-800",
    nickname: { ko: "논리술사", en: "Logician", ja: "論理学者", fr: "Logicien", es: "Lógico", zh: "逻辑学家", },
    description: { ko: "분석적·이론적 사고, 지식 탐구", en: "Analytical thinker who loves theoretical exploration", ja: "理論的探求を愛する分析的思考者", fr: "Penseur analytique qui aime l'exploration théorique", es: "Pensador analítico que ama la exploración teórica", zh: "熱愛理論探索的分析性思考者", },
    strengths: { ko: ["논리적 분석", "창의적 문제 해결", "객관성"], en: ["Logical analysis", "Creative problem solving", "Objectivity"], ja: ["論理的分析", "創造的問題解決", "客観性"], fr: ["Analyse logique", "Résolution créative", "Objectivité"], es: ["Análisis lógico", "Resolución creativa", "Objetividad"], zh: ["逻辑分析", "创意问题解决", "客观性"], },
    weaknesses: { ko: ["우유부단함", "감정 무감각", "사회적 서툼"], en: ["Indecisive", "Emotionally detached", "Socially awkward"], ja: ["優柔不断", "感情的に冷淡", "社交的に不器用"], fr: ["Indécis", "Détaché émotionnellement", "Maladroit socialement"], es: ["Indeciso", "Emocionalmente distante", "Torpe socialmente"], zh: ["优柔寡断", "情感疏离", "社交笨拙"], },
  },
  ENTJ: {
    emoji: "👑",
    group: "analyst",
    color: "bg-purple-100 border-purple-300 text-purple-800",
    nickname: { ko: "통솔자", en: "Commander", ja: "指揮官", fr: "Commandant", es: "Comandante", zh: "指揮官", },
    description: { ko: "타고난 리더, 목표 지향적·카리스마", en: "Natural born leader — goal-driven and charismatic", ja: "生まれながらのリーダー、目標指向・カリスマ", fr: "Leader né — axé sur les objectifs et charismatique", es: "Líder nato — orientado a objetivos y carismático", zh: "天生领袖——目标导向且有魅力", },
    strengths: { ko: ["강한 리더십", "전략적 비전", "추진력"], en: ["Strong leadership", "Strategic vision", "Drive"], ja: ["強いリーダーシップ", "戦略的ビジョン", "推進力"], fr: ["Fort leadership", "Vision stratégique", "Motivation"], es: ["Fuerte liderazgo", "Visión estratégica", "Determinación"], zh: ["强大领导力", "策略愿景", "推动力"], },
    weaknesses: { ko: ["지나친 지배욕", "감정 무시", "오만함"], en: ["Domineering", "Dismissive of emotions", "Arrogant"], ja: ["支配欲が強い", "感情を無視", "傲慢"], fr: ["Autoritaire", "Ignorant des émotions", "Arrogant"], es: ["Dominante", "Ignora emociones", "Arrogante"], zh: ["支配欲強", "忽視情感", "傲慢"], },
  },
  ENTP: {
    emoji: "💡",
    group: "analyst",
    color: "bg-purple-100 border-purple-300 text-purple-800",
    nickname: { ko: "변론가", en: "Debater", ja: "討論者", fr: "Débatteur", es: "Debatidor", zh: "辯論家", },
    description: { ko: "기발한 발상·논쟁 즐김·지적 호기심", en: "Ingenious ideas, loves debate, and intellectual curiosity", ja: "奇抜なアイデア、議論好き、知的好奇心", fr: "Idées ingénieuses, aime le débat, curiosité intellectuelle", es: "Ideas ingeniosas, ama el debate y la curiosidad intelectual", zh: "奇思妙想、熱愛辯論、智識好奇心旺盛", },
    strengths: { ko: ["혁신적 사고", "뛰어난 설득력", "적응성"], en: ["Innovative thinking", "Excellent persuasion", "Adaptability"], ja: ["革新的思考", "優れた説得力", "適応性"], fr: ["Pensée innovante", "Excellente persuasion", "Adaptabilité"], es: ["Pensamiento innovador", "Excelente persuasión", "Adaptabilidad"], zh: ["创新思维", "出色说服力", "适应性"], },
    weaknesses: { ko: ["끝마무리 부족", "논쟁적 성향", "규칙 무시"], en: ["Poor follow-through", "Argumentative", "Disregards rules"], ja: ["やり遂げが苦手", "論争的傾向", "規則を無視"], fr: ["Manque de suivi", "Querelleur", "Ignore les règles"], es: ["Poca persistencia", "Argumentativo", "Ignora reglas"], zh: ["缺乏后续行动", "爱争论", "无视规则"], },
  },
  INFJ: {
    emoji: "🌿",
    group: "diplomat",
    color: "bg-green-100 border-green-300 text-green-800",
    nickname: { ko: "옹호자", en: "Advocate", ja: "提唱者", fr: "Défenseur", es: "Defensor", zh: "倡導者", },
    description: { ko: "이상주의적·직관적·깊은 공감 능력", en: "Idealistic, intuitive, and deeply empathetic", ja: "理想主義的、直感的、深い共感能力", fr: "Idéaliste, intuitif et profondément empathique", es: "Idealista, intuitivo y profundamente empático", zh: "理想主义、有直觉、深切的共情能力", },
    strengths: { ko: ["깊은 통찰력", "강한 직관", "헌신적"], en: ["Deep insight", "Strong intuition", "Dedicated"], ja: ["深い洞察力", "強い直感", "献身的"], fr: ["Perspicacité profonde", "Forte intuition", "Dévoué"], es: ["Perspicacia profunda", "Fuerte intuición", "Dedicado"], zh: ["深刻洞察力", "强烈直觉", "奉献精神"], },
    weaknesses: { ko: ["번아웃 취약", "과잉 이상주의", "비밀주의"], en: ["Burnout-prone", "Over-idealistic", "Private to a fault"], ja: ["燃え尽き易い", "過度な理想主義", "秘密主義"], fr: ["Sujet au burnout", "Trop idéaliste", "Trop secret"], es: ["Propenso al agotamiento", "Demasiado idealista", "Demasiado reservado"], zh: ["容易职业倦怠", "过度理想主义", "过于保密"], },
  },
  INFP: {
    emoji: "🌸",
    group: "diplomat",
    color: "bg-green-100 border-green-300 text-green-800",
    nickname: { ko: "중재자", en: "Mediator", ja: "仲介者", fr: "Médiateur", es: "Mediador", zh: "調停者", },
    description: { ko: "내면 가치 중시, 공감·창의성 높음", en: "Values-driven, highly empathetic and creative", ja: "内面の価値を重視、共感・創造性が高い", fr: "Axé sur les valeurs, très empathique et créatif", es: "Orientado a valores, muy empático y creativo", zh: "重视内在价值观，高度共情和创意", },
    strengths: { ko: ["공감 능력", "창의성", "개방적 사고"], en: ["Empathy", "Creativity", "Open-mindedness"], ja: ["共感能力", "創造性", "開放的な思考"], fr: ["Empathie", "Créativité", "Ouverture d'esprit"], es: ["Empatía", "Creatividad", "Mente abierta"], zh: ["共情能力", "创意", "开放思维"], },
    weaknesses: { ko: ["비현실적 기대", "과도한 자기비판", "갈등 회피"], en: ["Unrealistic expectations", "Excessive self-criticism", "Conflict avoidance"], ja: ["非現実的な期待", "過度な自己批判", "葛藤回避"], fr: ["Attentes irréalistes", "Autocritique excessive", "Évitement des conflits"], es: ["Expectativas poco realistas", "Autocrítica excesiva", "Evitación de conflictos"], zh: ["期望不切实际", "过度自我批评", "逃避冲突"], },
  },
  ENFJ: {
    emoji: "🌟",
    group: "diplomat",
    color: "bg-green-100 border-green-300 text-green-800",
    nickname: { ko: "선도자", en: "Protagonist", ja: "主人公", fr: "Protagoniste", es: "Protagonista", zh: "主角", },
    description: { ko: "카리스마 리더, 타인에게 영감 줌", en: "Charismatic leader who inspires others", ja: "カリスマリーダー、他者にインスピレーションを与える", fr: "Leader charismatique qui inspire les autres", es: "Líder carismático que inspira a otros", zh: "有魅力的領袖，激勵他人", },
    strengths: { ko: ["카리스마", "타인 이해", "설득력"], en: ["Charisma", "Understanding others", "Persuasiveness"], ja: ["カリスマ", "他者理解", "説得力"], fr: ["Charisme", "Compréhension des autres", "Persuasion"], es: ["Carisma", "Comprensión de otros", "Persuasión"], zh: ["魅力", "理解他人", "说服力"], },
    weaknesses: { ko: ["과도한 이상주의", "지나친 자기희생", "비판에 민감"], en: ["Over-idealistic", "Over-self-sacrificing", "Sensitive to criticism"], ja: ["過度な理想主義", "自己犠牲が過ぎる", "批判に敏感"], fr: ["Trop idéaliste", "Trop altruiste", "Sensible aux critiques"], es: ["Demasiado idealista", "Demasiado altruista", "Sensible a las críticas"], zh: ["过度理想主义", "过度自我牺牲", "对批评敏感"], },
  },
  ENFP: {
    emoji: "🎪",
    group: "diplomat",
    color: "bg-green-100 border-green-300 text-green-800",
    nickname: { ko: "활동가", en: "Campaigner", ja: "広報運動家", fr: "Militant", es: "Activista", zh: "竞选者", },
    description: { ko: "열정·창의성·자유로운 영혼", en: "Passionate, creative free spirit", ja: "情熱的、創造的な自由な魂", fr: "Esprit libre passionné et créatif", es: "Espíritu libre apasionado y creativo", zh: "热情、富有创意的自由灵魂", },
    strengths: { ko: ["열정", "공감 능력", "아이디어 풍부"], en: ["Enthusiasm", "Empathy", "Rich ideas"], ja: ["情熱", "共感能力", "豊富なアイデア"], fr: ["Enthousiasme", "Empathie", "Idées riches"], es: ["Entusiasmo", "Empatía", "Ideas ricas"], zh: ["熱情", "共情能力", "豐富的想法"], },
    weaknesses: { ko: ["주의 산만", "감정 기복", "집중력 부족"], en: ["Easily distracted", "Emotional ups and downs", "Lack of focus"], ja: ["注意散漫", "感情の浮き沈み", "集中力不足"], fr: ["Facilement distrait", "Hauts et bas émotionnels", "Manque de concentration"], es: ["Fácilmente distraído", "Altibajos emocionales", "Falta de enfoque"], zh: ["容易分心", "情緒起伏", "注意力不集中"], },
  },
  ISTJ: {
    emoji: "📋",
    group: "sentinel",
    color: "bg-blue-100 border-blue-300 text-blue-800",
    nickname: { ko: "현실주의자", en: "Logistician", ja: "管理者", fr: "Logisticien", es: "Logístico", zh: "後勤師", },
    description: { ko: "책임감·신뢰성·규칙 존중", en: "Responsible, reliable, and rule-respecting", ja: "責任感・信頼性・規則を尊重", fr: "Responsable, fiable et respectueux des règles", es: "Responsable, confiable y respetuoso de las reglas", zh: "有责任感、可靠、尊重规则", },
    strengths: { ko: ["신뢰성", "조직력", "인내심"], en: ["Reliability", "Organization", "Patience"], ja: ["信頼性", "組織力", "忍耐力"], fr: ["Fiabilité", "Organisation", "Patience"], es: ["Confiabilidad", "Organización", "Paciencia"], zh: ["可靠性", "組織能力", "耐心"], },
    weaknesses: { ko: ["변화 저항", "고집스러움", "감정 표현 어려움"], en: ["Resistant to change", "Stubborn", "Difficulty expressing emotions"], ja: ["変化への抵抗", "頑固", "感情表現が難しい"], fr: ["Résistant au changement", "Têtu", "Difficulté à exprimer ses émotions"], es: ["Resistente al cambio", "Terco", "Dificultad para expresar emociones"], zh: ["抗拒變化", "固執", "難以表達情感"], },
  },
  ISFJ: {
    emoji: "🛡️",
    group: "sentinel",
    color: "bg-blue-100 border-blue-300 text-blue-800",
    nickname: { ko: "수호자", en: "Defender", ja: "擁護者", fr: "Défenseur", es: "Defensor", zh: "守護者", },
    description: { ko: "헌신적·세심함·타인 보호 본능", en: "Devoted, detail-oriented, with a protective instinct", ja: "献身的、細心、他者を守る本能", fr: "Dévoué, attentif aux détails, instinct protecteur", es: "Dedicado, detallista con instinto protector", zh: "忠诚、细心、有保护本能", },
    strengths: { ko: ["헌신", "세심함", "따뜻함"], en: ["Dedication", "Attentiveness", "Warmth"], ja: ["献身", "細心さ", "温かさ"], fr: ["Dévouement", "Attention", "Chaleur"], es: ["Dedicación", "Atención", "Calidez"], zh: ["奉献精神", "细心", "温暖"], },
    weaknesses: { ko: ["과도한 헌신", "변화 거부", "자기주장 부족"], en: ["Over-dedication", "Resistant to change", "Lacks assertiveness"], ja: ["過度な献身", "変化を嫌う", "自己主張不足"], fr: ["Trop dévoué", "Résistant au changement", "Manque d'assertivité"], es: ["Demasiado dedicado", "Resistente al cambio", "Falta de asertividad"], zh: ["过度奉献", "抗拒变化", "缺乏自我主张"], },
  },
  ESTJ: {
    emoji: "⚖️",
    group: "sentinel",
    color: "bg-blue-100 border-blue-300 text-blue-800",
    nickname: { ko: "경영자", en: "Executive", ja: "幹部", fr: "Directeur", es: "Ejecutivo", zh: "管理者", },
    description: { ko: "질서·규율 중시, 강한 관리 능력", en: "Values order and discipline with strong management ability", ja: "秩序・規律を重視、強い管理能力", fr: "Valorise l'ordre et la discipline avec une forte capacité de gestion", es: "Valora el orden y la disciplina con fuerte capacidad de gestión", zh: "重視秩序和紀律，強大的管理能力", },
    strengths: { ko: ["조직력", "리더십", "신뢰성"], en: ["Organization", "Leadership", "Reliability"], ja: ["組織力", "リーダーシップ", "信頼性"], fr: ["Organisation", "Leadership", "Fiabilité"], es: ["Organización", "Liderazgo", "Confiabilidad"], zh: ["組織能力", "領導力", "可靠性"], },
    weaknesses: { ko: ["융통성 부족", "강압적 성향", "감정 무시"], en: ["Inflexible", "Bossy", "Dismisses emotions"], ja: ["柔軟性不足", "押しつけがましい", "感情を軽視"], fr: ["Rigide", "Autoritaire", "Ignore les émotions"], es: ["Inflexible", "Mandón", "Descarta emociones"], zh: ["缺乏灵活性", "专横", "无视情感"], },
  },
  ESFJ: {
    emoji: "🤝",
    group: "sentinel",
    color: "bg-blue-100 border-blue-300 text-blue-800",
    nickname: { ko: "집정관", en: "Consul", ja: "領事", fr: "Consul", es: "Cónsul", zh: "執政官", },
    description: { ko: "사교적·타인 돌봄·조화 추구", en: "Social, caring, and harmony-seeking", ja: "社交的、他者のケア、調和を追求", fr: "Sociable, attentionné et recherchant l'harmonie", es: "Social, cuidadoso y buscador de armonía", zh: "社交型、关心他人、追求和谐", },
    strengths: { ko: ["사교성", "배려심", "조직력"], en: ["Sociability", "Caring", "Organization"], ja: ["社交性", "思いやり", "組織力"], fr: ["Sociabilité", "Attentionné", "Organisation"], es: ["Sociabilidad", "Cuidado", "Organización"], zh: ["社交能力", "关爱", "组织能力"], },
    weaknesses: { ko: ["남의 눈치", "비판에 민감", "과도한 헌신"], en: ["Over-concerned with others' opinions", "Sensitive to criticism", "Over-dedication"], ja: ["他人の目が気になる", "批判に敏感", "過度な献身"], fr: ["Trop préoccupé par les opinions", "Sensible aux critiques", "Trop dévoué"], es: ["Demasiado preocupado por opiniones", "Sensible a las críticas", "Demasiado dedicado"], zh: ["过于在意他人眼光", "对批评敏感", "过度奉献"], },
  },
  ISTP: {
    emoji: "🔧",
    group: "explorer",
    color: "bg-amber-100 border-amber-300 text-amber-800",
    nickname: { ko: "장인", en: "Virtuoso", ja: "巨匠", fr: "Virtuose", es: "Virtuoso", zh: "大師", },
    description: { ko: "실용적·분석적·독립적", en: "Practical, analytical, and independent", ja: "実用的、分析的、独立的", fr: "Pratique, analytique et indépendant", es: "Práctico, analítico e independiente", zh: "实用、分析型、独立自主", },
    strengths: { ko: ["실용적 기술", "냉정한 분석", "위기 대처"], en: ["Practical skills", "Cool analysis", "Crisis handling"], ja: ["実用的なスキル", "冷静な分析", "危機対応"], fr: ["Compétences pratiques", "Analyse froide", "Gestion de crise"], es: ["Habilidades prácticas", "Análisis frío", "Manejo de crisis"], zh: ["实用技能", "冷静分析", "危机处理"], },
    weaknesses: { ko: ["감정 표현 부족", "장기 계획 약함", "무뚝뚝함"], en: ["Poor emotional expression", "Weak long-term planning", "Blunt"], ja: ["感情表現不足", "長期計画が弱い", "無愛想"], fr: ["Manque d'expression émotionnelle", "Planification à long terme faible", "Brusque"], es: ["Poca expresión emocional", "Planificación a largo plazo débil", "Brusco"], zh: ["情感表达不足", "长期规划薄弱", "冷淡"], },
  },
  ISFP: {
    emoji: "🎨",
    group: "explorer",
    color: "bg-amber-100 border-amber-300 text-amber-800",
    nickname: { ko: "모험가", en: "Adventurer", ja: "冒険家", fr: "Aventurier", es: "Aventurero", zh: "探險家", },
    description: { ko: "온화·예술적·현재에 충실", en: "Gentle, artistic, and living in the moment", ja: "穏やか、芸術的、現在に忠実", fr: "Doux, artistique et vivant dans le moment", es: "Gentil, artístico y viviendo el momento", zh: "溫和、有藝術感、活在當下", },
    strengths: { ko: ["예술적 감각", "유연성", "공감 능력"], en: ["Artistic sense", "Flexibility", "Empathy"], ja: ["芸術的センス", "柔軟性", "共感能力"], fr: ["Sens artistique", "Flexibilité", "Empathie"], es: ["Sentido artístico", "Flexibilidad", "Empatía"], zh: ["艺术感", "灵活性", "共情能力"], },
    weaknesses: { ko: ["장기 계획 약함", "갈등 회피", "과민 반응"], en: ["Weak long-term planning", "Conflict avoidance", "Overly sensitive"], ja: ["長期計画が弱い", "葛藤回避", "過敏反応"], fr: ["Planification à long terme faible", "Évitement des conflits", "Trop sensible"], es: ["Planificación a largo plazo débil", "Evitación de conflictos", "Demasiado sensible"], zh: ["长期规划薄弱", "逃避冲突", "过于敏感"], },
  },
  ESTP: {
    emoji: "🏄",
    group: "explorer",
    color: "bg-amber-100 border-amber-300 text-amber-800",
    nickname: { ko: "사업가", en: "Entrepreneur", ja: "起業家", fr: "Entrepreneur", es: "Emprendedor", zh: "企业家", },
    description: { ko: "활동적·대담함·문제 해결사", en: "Active, bold, and a natural problem solver", ja: "活動的、大胆、自然な問題解決者", fr: "Actif, audacieux et résolveur de problèmes naturel", es: "Activo, audaz y solucionador natural de problemas", zh: "积极、大胆、天生问题解决者", },
    strengths: { ko: ["실용적 행동력", "사교성", "문제 해결"], en: ["Practical action", "Sociability", "Problem solving"], ja: ["実用的な行動力", "社交性", "問題解決"], fr: ["Action pratique", "Sociabilité", "Résolution de problèmes"], es: ["Acción práctica", "Sociabilidad", "Resolución de problemas"], zh: ["实际行动力", "社交能力", "问题解决"], },
    weaknesses: { ko: ["충동성", "장기 계획 약함", "감정 무시"], en: ["Impulsive", "Weak long-term planning", "Dismisses feelings"], ja: ["衝動性", "長期計画が弱い", "感情を軽視"], fr: ["Impulsif", "Planification faible", "Ignore les émotions"], es: ["Impulsivo", "Planificación débil", "Ignora los sentimientos"], zh: ["冲动性", "长期规划薄弱", "无视情感"], },
  },
  ESFP: {
    emoji: "🎉",
    group: "explorer",
    color: "bg-amber-100 border-amber-300 text-amber-800",
    nickname: { ko: "연예인", en: "Entertainer", ja: "エンターテイナー", fr: "Animateur", es: "Animador", zh: "表演者", },
    description: { ko: "활기차고·즉흥적·타인과의 교류 즐김", en: "Energetic, spontaneous, and loves connecting with others", ja: "活気があり、即興的、他者との交流を楽しむ", fr: "Énergique, spontané et aime se connecter aux autres", es: "Enérgico, espontáneo y le encanta conectar con otros", zh: "活力四射、即兴、享受与他人交流", },
    strengths: { ko: ["사교성", "즉흥성", "따뜻함"], en: ["Sociability", "Spontaneity", "Warmth"], ja: ["社交性", "即興性", "温かさ"], fr: ["Sociabilité", "Spontanéité", "Chaleur"], es: ["Sociabilidad", "Espontaneidad", "Calidez"], zh: ["社交能力", "即興性", "溫暖"], },
    weaknesses: { ko: ["장기 계획 약함", "비판에 민감", "집중력 부족"], en: ["Weak long-term planning", "Sensitive to criticism", "Lack of focus"], ja: ["長期計画が弱い", "批判に敏感", "集中力不足"], fr: ["Planification faible", "Sensible aux critiques", "Manque de concentration"], es: ["Planificación débil", "Sensible a las críticas", "Falta de enfoque"], zh: ["长期规划薄弱", "对批评敏感", "注意力不集中"], },
  },
};

const ALL_TYPES = Object.keys(TYPES) as MBTIType[];

// ─── Compatibility Database ───────────────────────────────────────────────────
// Key = sorted pair e.g. "INFJ_INTJ" (alphabetical)

function pairKey(a: MBTIType, b: MBTIType): string {
  return [a, b].sort().join("_");
}

const COMPAT_DB: Record<string, CompatResult> = {
  [pairKey("INFJ","INTJ")]: {
    level: "soulmate",
    summary: {
      ko: "깊은 지적 공명과 직관적 이해. 두 유형 모두 통찰력과 비전을 공유하며 서로를 완벽하게 이해하는 드문 관계입니다.",
      en: "Deep intellectual resonance and intuitive understanding. Both share insight and vision, creating a rare relationship of perfect mutual understanding.",
      ja: "深い知的共鳴と直感的な理解。双方が洞察力とビジョンを共有し、完全な相互理解という稀な関係を築きます。",
      fr: "Résonance intellectuelle profonde et compréhension intuitive. Les deux partagent perspicacité et vision, créant une relation rare de compréhension mutuelle parfaite.",
      es: "Profunda resonancia intelectual y comprensión intuitiva. Ambos comparten perspicacia y visión, creando una rara relación de perfecta comprensión mutua.",
      zh: "深度智识共鸣和直觉理解。两者共享洞察力和愿景，建立了完美相互理解的罕见关系。",
    },
    tips: {
      ko: ["정기적인 깊은 대화 시간을 만드세요", "서로의 감정도 충분히 나눠보세요", "혼자 있는 시간도 존중해주세요"],
      en: ["Schedule deep conversations regularly", "Share emotions openly too", "Respect each other's alone time"],
      ja: ["定期的に深い会話の時間を作りましょう", "感情も十分に分かち合いましょう", "一人になる時間も尊重しましょう"],
      fr: ["Planifiez des conversations profondes régulières", "Partagez aussi les émotions", "Respectez le temps seul de chacun"],
      es: ["Programen conversaciones profundas regulares", "Compartan emociones también", "Respeten el tiempo individual de cada uno"],
      zh: ["定期安排深度对话时间", "也充分分享情感", "互相尊重独处时间"],
    },
  },
  [pairKey("ENFP","INFJ")]: {
    level: "soulmate",
    summary: {
      ko: "INFJ의 통찰력과 ENFP의 열정이 만나는 황금 궁합. 서로의 세계를 넓혀주는 이상적인 파트너십입니다.",
      en: "Golden match where INFJ's insight meets ENFP's passion. An ideal partnership that expands each other's worlds.",
      ja: "INFJの洞察力とENFPの情熱が出会う黄金の相性。お互いの世界を広げる理想的なパートナーシップです。",
      fr: "Association dorée où la perspicacité de l'INFJ rencontre la passion de l'ENFP. Un partenariat idéal qui élargit les mondes de chacun.",
      es: "Combinación dorada donde la perspicacia del INFJ se encuentra con la pasión del ENFP. Una asociación ideal que amplía los mundos de cada uno.",
      zh: "INFJ的洞察力与ENFP的热情相遇的黄金组合。相互拓展彼此世界的理想伙伴关系。",
    },
    tips: {
      ko: ["INFJ는 혼자만의 재충전 시간이 필요합니다", "ENFP는 깊이 있는 주제에 집중하는 연습을 해보세요", "서로의 차이를 보완으로 받아들이세요"],
      en: ["INFJ needs solo recharge time", "ENFP: practice focusing on deep topics", "Accept your differences as complementary"],
      ja: ["INFJは一人での充電時間が必要です", "ENFPは深いテーマに集中する練習をしましょう", "互いの違いを補完として受け入れましょう"],
      fr: ["L'INFJ a besoin de temps seul pour se ressourcer", "L'ENFP: pratiquez la concentration sur des sujets profonds", "Acceptez vos différences comme complémentaires"],
      es: ["El INFJ necesita tiempo solo para recargar", "ENFP: practica enfocarte en temas profundos", "Acepten sus diferencias como complementarias"],
      zh: ["INFJ需要独处充电时间", "ENFP：练习专注于深度主题", "接受彼此的差异作为互补"],
    },
  },
  [pairKey("INTJ","ENTP")]: {
    level: "great",
    summary: {
      ko: "지적 자극이 넘치는 관계. 두 유형 모두 아이디어 토론을 즐기며 서로의 사고를 날카롭게 만들어줍니다.",
      en: "A relationship full of intellectual stimulation. Both enjoy debating ideas and sharpen each other's thinking.",
      ja: "知的刺激に満ちた関係。両者ともアイデアの議論を楽しみ、互いの思考を鋭くします。",
      fr: "Une relation pleine de stimulation intellectuelle. Les deux apprécient de débattre d'idées et affûtent mutuellement leur pensée.",
      es: "Una relación llena de estimulación intelectual. Ambos disfrutan debatir ideas y agudizar el pensamiento mutuo.",
      zh: "充满智识刺激的关系。两者都喜欢辩论想法，相互磨砺彼此的思维。",
    },
    tips: {
      ko: ["의도적으로 감정적 연결 시간을 만드세요", "논쟁이 개인적 공격이 되지 않도록 주의하세요", "실행 계획을 함께 세우면 더욱 강력해집니다"],
      en: ["Create intentional emotional connection time", "Keep debates from becoming personal attacks", "Making plans together makes you unstoppable"],
      ja: ["意識的に感情的な繋がりの時間を作りましょう", "議論が個人攻撃にならないよう注意しましょう", "一緒に実行計画を立てると更に強力になります"],
      fr: ["Créez intentionnellement du temps de connexion émotionnelle", "Évitez que les débats deviennent des attaques personnelles", "Faire des plans ensemble vous rend imbattables"],
      es: ["Creen tiempo intencional de conexión emocional", "Eviten que los debates se vuelvan ataques personales", "Hacer planes juntos los hace imparables"],
      zh: ["刻意创造情感连结时间", "防止辩论变成人身攻击", "一起制定执行计划会更强大"],
    },
  },
  [pairKey("ISFJ","ESFJ")]: {
    level: "great",
    summary: {
      ko: "따뜻함과 배려로 서로를 감싸는 안정적인 관계. 가족 중심적 가치관을 공유하며 깊은 신뢰를 쌓습니다.",
      en: "A stable bond wrapping each other in warmth and care. Shared family-centered values build deep trust.",
      ja: "温かさと気遣いで互いを包む安定した関係。家族中心の価値観を共有し、深い信頼を築きます。",
      fr: "Un lien stable qui entoure chacun de chaleur et de soin. Les valeurs centrées sur la famille partagées construisent une confiance profonde.",
      es: "Un vínculo estable que envuelve a cada uno con calidez y cuidado. Los valores centrados en la familia compartidos construyen profunda confianza.",
      zh: "相互以温暖和关怀包裹的稳定关系。共同的以家庭为中心的价值观建立深厚信任。",
    },
    tips: {
      ko: ["개인 시간도 균형 있게 챙기세요", "서로에게 진짜 필요한 것을 솔직하게 말해보세요", "새로운 경험을 함께 시도해보세요"],
      en: ["Balance personal time too", "Speak honestly about what you truly need", "Try new experiences together"],
      ja: ["個人の時間もバランスよく取りましょう", "本当に必要なものを正直に伝えましょう", "新しい経験を一緒に試してみましょう"],
      fr: ["Équilibrez aussi le temps personnel", "Dites honnêtement ce dont vous avez vraiment besoin", "Essayez de nouvelles expériences ensemble"],
      es: ["Equilibren también el tiempo personal", "Digan honestamente lo que realmente necesitan", "Intenten nuevas experiencias juntos"],
      zh: ["也要平衡个人时间", "坦诚说出自己真正需要的", "一起尝试新体验"],
    },
  },
  [pairKey("INFP","ENFJ")]: {
    level: "great",
    summary: {
      ko: "ENFJ의 따뜻한 리더십이 INFP의 창의성을 꽃피웁니다. 서로의 이상을 응원하는 아름다운 관계입니다.",
      en: "ENFJ's warm leadership helps INFP's creativity blossom. A beautiful relationship where both support each other's ideals.",
      ja: "ENFJの温かいリーダーシップがINFPの創造性を花開かせます。互いの理想を応援する美しい関係です。",
      fr: "Le leadership chaleureux de l'ENFJ fait s'épanouir la créativité de l'INFP. Une belle relation où chacun soutient les idéaux de l'autre.",
      es: "El liderazgo cálido del ENFJ ayuda a florecer la creatividad del INFP. Una hermosa relación donde ambos apoyan los ideales del otro.",
      zh: "ENFJ温暖的领导力使INFP的创意得以绽放。相互支持对方理想的美好关系。",
    },
    tips: {
      ko: ["INFP의 개인 공간을 존중하세요", "의사소통을 구체적이고 명확하게 해보세요", "공통 프로젝트를 통해 유대를 강화하세요"],
      en: ["Respect INFP's personal space", "Communicate concretely and clearly", "Strengthen bonds through shared projects"],
      ja: ["INFPの個人スペースを尊重しましょう", "コミュニケーションを具体的で明確にしましょう", "共同プロジェクトを通じて絆を強化しましょう"],
      fr: ["Respectez l'espace personnel de l'INFP", "Communiquez concrètement et clairement", "Renforcez les liens par des projets communs"],
      es: ["Respeten el espacio personal del INFP", "Comuníquense concreta y claramente", "Fortalezcan vínculos mediante proyectos compartidos"],
      zh: ["尊重INFP的个人空间", "具体清晰地沟通", "通过共同项目加强联系"],
    },
  },
  [pairKey("ISTJ","ISFJ")]: {
    level: "good",
    summary: {
      ko: "신뢰와 안정이 기반인 건강한 관계. 두 유형 모두 책임감이 강해 실용적인 동반자 관계를 만듭니다.",
      en: "A healthy relationship built on trust and stability. Both are highly responsible, forming a practical partnership.",
      ja: "信頼と安定を基盤とした健全な関係。双方とも責任感が強く、実用的なパートナーシップを築きます。",
      fr: "Une relation saine fondée sur la confiance et la stabilité. Les deux sont très responsables, formant un partenariat pratique.",
      es: "Una relación saludable construida sobre confianza y estabilidad. Ambos son muy responsables, formando una asociación práctica.",
      zh: "建立在信任和稳定基础上的健康关系。两者都责任心强，形成实用的伙伴关系。",
    },
    tips: {
      ko: ["새로운 경험을 함께 시도해 관계에 활력을 더하세요", "감정을 더 적극적으로 표현해보세요", "서로의 차이를 보완으로 활용하세요"],
      en: ["Try new experiences together to energize the relationship", "Express emotions more actively", "Use each other's differences as complementary strengths"],
      ja: ["新しい経験を共に試して関係に活力を加えましょう", "感情をより積極的に表現しましょう", "互いの違いを補完として活用しましょう"],
      fr: ["Essayez de nouvelles expériences pour dynamiser la relation", "Exprimez les émotions plus activement", "Utilisez vos différences comme forces complémentaires"],
      es: ["Intenten nuevas experiencias para energizar la relación", "Expresen emociones más activamente", "Usen sus diferencias como fortalezas complementarias"],
      zh: ["一起尝试新体验为关系注入活力", "更积极地表达情感", "将彼此的差异用作互补优势"],
    },
  },
  [pairKey("ESTP","ESFP")]: {
    level: "good",
    summary: {
      ko: "에너지와 활기가 넘치는 역동적인 관계. 즉흥적인 모험을 함께 즐기며 삶을 신나게 만드는 파트너십입니다.",
      en: "A dynamic, energetic, and lively relationship. A partnership that makes life exciting through spontaneous adventures.",
      ja: "エネルギーと活気あふれる躍動的な関係。即興の冒険を共に楽しみ、人生をわくわくさせるパートナーシップです。",
      fr: "Une relation dynamique, pleine d'énergie et de vivacité. Un partenariat qui rend la vie passionnante par des aventures spontanées.",
      es: "Una relación dinámica, llena de energía y vivacidad. Una asociación que hace la vida emocionante a través de aventuras espontáneas.",
      zh: "充满能量和活力的动感关系。通过即兴冒险共同享受生活，让生活充满乐趣的伙伴关系。",
    },
    tips: {
      ko: ["장기 목표를 함께 설정하는 시간을 가지세요", "갈등이 생길 때 도망가지 말고 대화하세요", "감정적 깊이를 쌓아나가는 노력을 하세요"],
      en: ["Set long-term goals together", "When conflict arises, talk instead of avoiding", "Make efforts to build emotional depth"],
      ja: ["一緒に長期目標を設定する時間を持ちましょう", "対立が生じた時は逃げずに話し合いましょう", "感情的な深みを積み上げる努力をしましょう"],
      fr: ["Fixez ensemble des objectifs à long terme", "Quand un conflit surgit, parlez au lieu de fuir", "Faites des efforts pour construire la profondeur émotionnelle"],
      es: ["Establezcan juntos objetivos a largo plazo", "Cuando surja conflicto, hablen en vez de evitar", "Hagan esfuerzos para construir profundidad emocional"],
      zh: ["一起设定长期目标", "出现冲突时沟通而不是逃避", "努力建立情感深度"],
    },
  },
  [pairKey("INTJ","INFP")]: {
    level: "neutral",
    summary: {
      ko: "두 유형 모두 이상주의적이지만 접근 방식이 다릅니다. 서로를 이해하는 데 노력이 필요하지만 성장 가능성이 높습니다.",
      en: "Both idealistic but with different approaches. Requires effort to understand each other, but high growth potential.",
      ja: "どちらも理想主義的ですが、アプローチが異なります。理解には努力が必要ですが、成長の可能性は高いです。",
      fr: "Les deux sont idéalistes mais avec des approches différentes. Nécessite des efforts pour se comprendre mutuellement, mais fort potentiel de croissance.",
      es: "Ambos idealistas pero con enfoques diferentes. Requiere esfuerzo para entenderse mutuamente, pero alto potencial de crecimiento.",
      zh: "两者都有理想主义，但方式不同。相互理解需要努力，但成长潜力很高。",
    },
    tips: {
      ko: ["INTJ는 감정 표현을 더 부드럽게 해보세요", "INFP는 논리적 피드백을 개인적 공격으로 받아들이지 마세요", "공통 관심사를 통해 대화를 시작하세요"],
      en: ["INTJ: soften emotional expression", "INFP: don't take logical feedback personally", "Start conversations through shared interests"],
      ja: ["INTJは感情表現をより柔らかくしましょう", "INFPは論理的なフィードバックを個人攻撃として受け取らないようにしましょう", "共通の関心事を通じて会話を始めましょう"],
      fr: ["INTJ: adoucissez l'expression émotionnelle", "INFP: ne prenez pas les retours logiques personnellement", "Commencez les conversations par des intérêts communs"],
      es: ["INTJ: suaviza la expresión emocional", "INFP: no tomes los comentarios lógicos personalmente", "Comiencen conversaciones a través de intereses comunes"],
      zh: ["INTJ：软化情感表达方式", "INFP：不要把逻辑反馈当作个人攻击", "通过共同兴趣开始对话"],
    },
  },
  [pairKey("ESTJ","INFP")]: {
    level: "challenging",
    summary: {
      ko: "매우 다른 가치관과 소통 방식. ESTJ의 직접성이 INFP에게 상처가 될 수 있고, INFP의 유연함이 ESTJ를 답답하게 할 수 있습니다.",
      en: "Very different values and communication styles. ESTJ's directness can hurt INFP; INFP's flexibility can frustrate ESTJ.",
      ja: "非常に異なる価値観とコミュニケーションスタイル。ESTJの直接性がINFPを傷つけ、INFPの柔軟性がESTJをいらいらさせることがあります。",
      fr: "Valeurs et styles de communication très différents. La franchise de l'ESTJ peut blesser l'INFP; la flexibilité de l'INFP peut frustrer l'ESTJ.",
      es: "Valores y estilos de comunicación muy diferentes. La franqueza del ESTJ puede herir al INFP; la flexibilidad del INFP puede frustrar al ESTJ.",
      zh: "价值观和沟通方式差异很大。ESTJ的直接性可能伤害INFP；INFP的灵活性可能让ESTJ感到沮丧。",
    },
    tips: {
      ko: ["ESTJ는 감정적 배려를 의식적으로 연습하세요", "INFP는 기대와 필요를 명확하게 표현하세요", "서로의 강점을 인정하는 데서 시작하세요", "중요한 대화는 조용한 공간에서 나누세요"],
      en: ["ESTJ: consciously practice emotional consideration", "INFP: clearly express expectations and needs", "Start by acknowledging each other's strengths", "Have important talks in a calm space"],
      ja: ["ESTJは感情的な配慮を意識的に練習しましょう", "INFPは期待と必要を明確に表現しましょう", "互いの強みを認めることから始めましょう", "重要な会話は静かな空間で行いましょう"],
      fr: ["ESTJ: pratiquez consciemment la considération émotionnelle", "INFP: exprimez clairement attentes et besoins", "Commencez par reconnaître les forces de chacun", "Ayez des discussions importantes dans un espace calme"],
      es: ["ESTJ: practica conscientemente la consideración emocional", "INFP: expresa claramente expectativas y necesidades", "Comiencen reconociendo las fortalezas de cada uno", "Tengan conversaciones importantes en un espacio tranquilo"],
      zh: ["ESTJ：有意识地练习情感体谅", "INFP：清晰表达期望和需求", "从承认彼此的优势开始", "在安静的空间进行重要对话"],
    },
  },
};

// Default result for pairs not in DB
function getDefaultResult(a: MBTIType, b: MBTIType): CompatResult {
  const aProf = TYPES[a];
  const bProf = TYPES[b];
  // Same group → good, different group → neutral
  const level: CompatLevel = a === b ? "soulmate" : aProf.group === bProf.group ? "good" : "neutral";
  return {
    level,
    summary: {
      ko: "두 유형은 각자의 강점을 가지고 있습니다. 서로의 차이를 이해하고 존중하면 좋은 관계를 만들 수 있습니다.",
      en: "Both types have their own strengths. Understanding and respecting each other's differences leads to a good relationship.",
      ja: "両タイプはそれぞれの強みを持っています。互いの違いを理解し尊重することで良い関係を築けます。",
      fr: "Les deux types ont leurs propres forces. Comprendre et respecter les différences mène à une bonne relation.",
      es: "Ambos tipos tienen sus propias fortalezas. Entender y respetar las diferencias lleva a una buena relación.",
      zh: "两种类型各有其优势。理解和尊重彼此的差异可以建立良好的关系。",
    },
    tips: {
      ko: ["서로의 차이를 성장의 기회로 보세요", "정기적으로 솔직한 대화를 나눠보세요", "공통 관심사를 찾아 함께 즐겨보세요"],
      en: ["See your differences as growth opportunities", "Have honest conversations regularly", "Find common interests to enjoy together"],
      ja: ["互いの違いを成長の機会として見ましょう", "定期的に率直な会話をしましょう", "共通の関心事を見つけて一緒に楽しみましょう"],
      fr: ["Voyez vos différences comme des opportunités de croissance", "Ayez des conversations honnêtes régulièrement", "Trouvez des intérêts communs à partager"],
      es: ["Vean sus diferencias como oportunidades de crecimiento", "Tengan conversaciones honestas regularmente", "Encuentren intereses comunes para disfrutar juntos"],
      zh: ["将彼此的差异视为成长机会", "定期进行坦诚的对话", "找到共同兴趣一起享受"],
    },
  };
}

function getCompat(a: MBTIType, b: MBTIType): CompatResult {
  if (a === b) {
    return {
      level: "soulmate",
      summary: {
        ko: "같은 유형! 서로를 완벽하게 이해하지만 두 사람 모두의 약점이 증폭될 수 있어 주의가 필요합니다.",
        en: "Same type! You understand each other perfectly, but both share the same weaknesses — watch out for blind spots.",
        ja: "同じタイプ！完璧に理解し合いますが、共通の弱点が増幅する可能性があります。",
        fr: "Même type ! Vous vous comprenez parfaitement, mais partagez les mêmes faiblesses — attention aux angles morts.",
        es: "¡Mismo tipo! Se entienden perfectamente, pero comparten las mismas debilidades — cuidado con los puntos ciegos.",
        zh: "相同类型！完美理解彼此，但共同的弱点可能会被放大——注意盲点。",
      },
      tips: {
        ko: ["서로의 약점이 충돌하지 않도록 의식적으로 노력하세요", "다양한 관점을 가진 친구들과도 교류하세요", "공동 성장 목표를 세워보세요"],
        en: ["Consciously work so shared weaknesses don't clash", "Interact with friends who have diverse perspectives", "Set shared growth goals"],
        ja: ["共通の弱点が衝突しないよう意識的に取り組みましょう", "多様な観点を持つ友人と交流しましょう", "共同成長目標を立てましょう"],
        fr: ["Travaillez consciemment pour que les faiblesses partagées ne s'affrontent pas", "Interagissez avec des amis aux perspectives diverses", "Fixez des objectifs de croissance partagés"],
        es: ["Trabajen conscientemente para que las debilidades compartidas no choquen", "Interactúen con amigos con perspectivas diversas", "Establezcan objetivos de crecimiento compartidos"],
        zh: ["有意识地努力使共同弱点不发生冲突", "与拥有多元视角的朋友互动", "设定共同成长目标"],
      },
    };
  }
  const key = pairKey(a, b);
  return COMPAT_DB[key] ?? getDefaultResult(a, b);
}

// ─── Level visual config ──────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<CompatLevel, { gradient: string; border: string; scoreBar: string; score: number }> = {
  soulmate:    { gradient: "from-violet-50 to-purple-50", border: "border-violet-300", scoreBar: "bg-violet-500", score: 97 },
  great:       { gradient: "from-green-50 to-emerald-50", border: "border-green-300",  scoreBar: "bg-green-500",  score: 82 },
  good:        { gradient: "from-blue-50 to-sky-50",      border: "border-blue-300",   scoreBar: "bg-blue-500",   score: 68 },
  neutral:     { gradient: "from-gray-50 to-slate-50",    border: "border-gray-300",   scoreBar: "bg-gray-400",   score: 52 },
  challenging: { gradient: "from-rose-50 to-red-50",      border: "border-rose-300",   scoreBar: "bg-rose-500",   score: 35 },
};

const GROUPS: Array<"analyst" | "diplomat" | "sentinel" | "explorer"> = ["analyst","diplomat","sentinel","explorer"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MBTICompatibility({ locale }: Props) {
  const t = UI[locale] ?? UI.en;
  const [typeA, setTypeA] = useState<MBTIType | null>(null);
  const [typeB, setTypeB] = useState<MBTIType | null>(null);
  const [showResult, setShowResult] = useState(false);

  const reset = () => { setTypeA(null); setTypeB(null); setShowResult(false); };

  const compat = typeA && typeB ? getCompat(typeA, typeB) : null;
  const levelCfg = compat ? LEVEL_CONFIG[compat.level] : null;

  const renderTypeGrid = (selected: MBTIType | null, onSelect: (t: MBTIType) => void, label: string) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {GROUPS.map((group) => (
        <div key={group} className="space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t.groupLabels[group]}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {ALL_TYPES.filter((tp) => TYPES[tp].group === group).map((tp) => {
              const prof = TYPES[tp];
              const isSel = selected === tp;
              return (
                <button
                  key={tp}
                  onClick={() => { onSelect(tp); setShowResult(false); }}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all text-center ${
                    isSel
                      ? `${prof.color} ring-2 ring-offset-1 ring-current`
                      : "bg-white border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{prof.emoji}</span>
                  <span className="text-xs font-bold text-gray-800">{tp}</span>
                  <span className="text-[10px] text-gray-500 leading-tight hidden sm:block">{prof.nickname[locale]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-4xl">💑</div>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 text-sm">{t.subtitle}</p>
      </div>

      {/* Type selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {renderTypeGrid(typeA, setTypeA, t.selectA)}
        {renderTypeGrid(typeB, setTypeB, t.selectB)}
      </div>

      {/* Selected display */}
      {(typeA || typeB) && (
        <div className="flex items-center gap-3 justify-center flex-wrap">
          {typeA ? (
            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 font-bold text-sm ${TYPES[typeA].color}`}>
              {TYPES[typeA].emoji} {typeA}
            </span>
          ) : (
            <span className="px-4 py-2 rounded-full border-2 border-dashed border-gray-200 text-gray-400 text-sm">?</span>
          )}
          <span className="text-xl text-gray-400">💞</span>
          {typeB ? (
            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 font-bold text-sm ${TYPES[typeB].color}`}>
              {TYPES[typeB].emoji} {typeB}
            </span>
          ) : (
            <span className="px-4 py-2 rounded-full border-2 border-dashed border-gray-200 text-gray-400 text-sm">?</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        {typeA && typeB && (
          <button
            onClick={() => setShowResult(true)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            {t.analyzeBtn}
          </button>
        )}
        {(typeA || typeB) && (
          <button
            onClick={reset}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            {t.resetBtn}
          </button>
        )}
      </div>

      {/* Result */}
      {showResult && compat && typeA && typeB && levelCfg && (
        <div className={`rounded-2xl border-2 ${levelCfg.border} bg-gradient-to-br ${levelCfg.gradient} p-5 space-y-5`}>
          {/* Level header */}
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-gray-700">{t.compatLabel}</p>
            <p className="text-base font-bold text-gray-800">{t.levelLabels[compat.level]}</p>
            {/* Score bar */}
            <div className="max-w-xs mx-auto space-y-1">
              <div className="w-full h-3 bg-white bg-opacity-60 rounded-full overflow-hidden border border-white">
                <div
                  className={`h-full ${levelCfg.scoreBar} rounded-full transition-all duration-700`}
                  style={{ width: `${levelCfg.score}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{levelCfg.score}%</p>
            </div>
          </div>

          {/* Type profile comparison */}
          <div className="grid grid-cols-2 gap-3">
            {([typeA, typeB] as MBTIType[]).map((tp) => {
              const prof = TYPES[tp];
              return (
                <div key={tp} className="bg-white bg-opacity-70 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{prof.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{tp}</p>
                      <p className="text-xs text-gray-500">{prof.nickname[locale]}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{prof.description[locale]}</p>
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-1">✅ {t.strengthsLabel}</p>
                    {prof.strengths[locale].map((s) => (
                      <p key={s} className="text-xs text-gray-600">• {s}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-white bg-opacity-70 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">📝 {t.summaryLabel}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{compat.summary[locale]}</p>
          </div>

          {/* Tips */}
          <div className="bg-white bg-opacity-70 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-indigo-600">💡 {t.tipsLabel}</p>
            {compat.tips[locale].map((tip, i) => (
              <p key={i} className="text-xs text-gray-700">• {tip}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
