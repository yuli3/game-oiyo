import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type Mode = "toeic" | "cefr";

interface LevelData {
  cefr: CEFRLevel;
  toeicMin: number;
  toeicMax: number;
  ielts: string;
  toefl: string;
  color: string;
  bgColor: string;
}

const LEVEL_DATA: LevelData[] = [
  { cefr: "A1", toeicMin: 0,   toeicMax: 119,  ielts: "1.0–2.0", toefl: "0–31",   color: "text-gray-600",  bgColor: "bg-gray-100" },
  { cefr: "A2", toeicMin: 120, toeicMax: 224,  ielts: "2.0–3.0", toefl: "32–45",  color: "text-blue-600",  bgColor: "bg-blue-50" },
  { cefr: "B1", toeicMin: 225, toeicMax: 549,  ielts: "3.5–4.5", toefl: "46–71",  color: "text-green-600", bgColor: "bg-green-50" },
  { cefr: "B2", toeicMin: 550, toeicMax: 784,  ielts: "5.0–6.0", toefl: "72–94",  color: "text-yellow-600",bgColor: "bg-yellow-50" },
  { cefr: "C1", toeicMin: 785, toeicMax: 899,  ielts: "6.5–7.5", toefl: "95–113", color: "text-orange-600",bgColor: "bg-orange-50" },
  { cefr: "C2", toeicMin: 900, toeicMax: 990,  ielts: "8.0–9.0", toefl: "114–120",color: "text-red-600",   bgColor: "bg-red-50" },
];

function getLevelByScore(score: number): LevelData {
  for (const lvl of LEVEL_DATA) {
    if (score >= lvl.toeicMin && score <= lvl.toeicMax) return lvl;
  }
  return LEVEL_DATA[0];
}

function getLevelByCEFR(cefr: CEFRLevel): LevelData {
  return LEVEL_DATA.find((l) => l.cefr === cefr) ?? LEVEL_DATA[0];
}

type UIData = {
  title: string;
  subtitle: string;
  modeScore: string;
  modeCefr: string;
  inputLabel: string;
  inputPlaceholder: string;
  cefrSelectLabel: string;
  convertBtn: string;
  resetBtn: string;
  resultTitle: string;
  cefrLabel: string;
  ieltsLabel: string;
  toeflLabel: string;
  toeicRangeLabel: string;
  jobUtilLabel: string;
  studyTipsLabel: string;
  jobUtil: Record<CEFRLevel, string[]>;
  studyTips: Record<CEFRLevel, string[]>;
  disclaimer: string;
};

const UI: Record<Locale, UIData> = {
  ko: {
    title: "TOEIC 점수 환산기",
    subtitle: "TOEIC 점수를 CEFR, IELTS, TOEFL로 환산하세요",
    modeScore: "TOEIC → CEFR",
    modeCefr: "CEFR → TOEIC",
    inputLabel: "TOEIC 점수 (0–990)",
    inputPlaceholder: "점수 입력",
    cefrSelectLabel: "CEFR 등급 선택",
    convertBtn: "환산하기",
    resetBtn: "다시 하기",
    resultTitle: "환산 결과",
    cefrLabel: "CEFR 등급",
    ieltsLabel: "IELTS 환산",
    toeflLabel: "TOEFL iBT 환산",
    toeicRangeLabel: "TOEIC 점수 범위",
    jobUtilLabel: "취업/진학 활용도",
    studyTipsLabel: "추천 학습법",
    jobUtil: {
      A1: ["입문 수준, 영어권 취업 어려움", "기초 회화 수업 먼저 필요", "어린이/성인 기초 과정 추천"],
      A2: ["단순 반복 업무에서 영어 사용 가능", "관광/서비스업 기초 수준", "국내 영어 활용 직종 도전 가능"],
      B1: ["국내 중소기업 해외 영업 지원 가능", "일상 영어 의사소통 가능", "어학연수 중급 과정 도전"],
      B2: ["국내 대기업/공기업 영어 서류 통과", "해외 대학원 입학 기준 충족", "영어권 국가 취업 비자 신청 가능"],
      C1: ["글로벌 기업 영어 면접 통과 수준", "해외 석박사 입학 요건 충족", "해외 전문직 취업 가능"],
      C2: ["원어민 수준, 최상위 글로벌 기업 취업", "아이비리그 등 최상위 대학 입학", "통역·번역 전문가 수준"],
    },
    studyTips: {
      A1: ["알파벳·발음 기초부터 시작", "기초 단어 500개 암기", "하루 10분 영어 듣기 습관"],
      A2: ["기초 문법(현재/과거시제) 완성", "일상 패턴 문장 500개 암기", "미드/팝송으로 귀 트기"],
      B1: ["TOEIC LC+RC 동시 준비", "단어장 3,000개 목표", "영자 신문 매일 1개 문단 독해"],
      B2: ["TOEIC 실전 모의고사 주 2회", "비즈니스 영어 이메일 쓰기 연습", "영어 뉴스 청취 + 요약 훈련"],
      C1: ["고급 어휘·관용구 집중 학습", "원어민과 회화 스터디", "영어 에세이·보고서 작성 훈련"],
      C2: ["학술 논문 영어 원문 읽기", "영어 강연/토론 참여", "전문 분야 영어 저술 도전"],
    },
    disclaimer: "* 환산 점수는 공식 기준이며 실제 시험 결과와 다를 수 있습니다.",
  },
  en: {
    title: "TOEIC Score Converter",
    subtitle: "Convert TOEIC scores to CEFR, IELTS, and TOEFL",
    modeScore: "TOEIC → CEFR",
    modeCefr: "CEFR → TOEIC",
    inputLabel: "TOEIC Score (0–990)",
    inputPlaceholder: "Enter score",
    cefrSelectLabel: "Select CEFR Level",
    convertBtn: "Convert",
    resetBtn: "Reset",
    resultTitle: "Conversion Result",
    cefrLabel: "CEFR Level",
    ieltsLabel: "IELTS Equivalent",
    toeflLabel: "TOEFL iBT Equivalent",
    toeicRangeLabel: "TOEIC Score Range",
    jobUtilLabel: "Career & Academic Use",
    studyTipsLabel: "Study Recommendations",
    jobUtil: {
      A1: ["Very limited English use in workplace", "Not sufficient for most English-speaking jobs", "Focus on building basic foundation first"],
      A2: ["Basic service/tourism industry roles", "Simple repetitive English tasks possible", "Entry-level bilingual assistant positions"],
      B1: ["SME overseas sales support", "Daily communication in English possible", "Mid-level language school programs"],
      B2: ["Passes major Korean conglomerate English screening", "Meets overseas university graduate admission", "Eligible for English-speaking country work visas"],
      C1: ["Passes global company English interviews", "Meets top graduate school requirements", "Professional employment abroad possible"],
      C2: ["Native-level: top global company employment", "Ivy League and elite university admission", "Interpreter/translator professional level"],
    },
    studyTips: {
      A1: ["Start with alphabet and pronunciation basics", "Memorize 500 core vocabulary words", "Build a 10-minute daily listening habit"],
      A2: ["Master basic grammar (present/past tense)", "Memorize 500 daily sentence patterns", "Use TV shows and pop songs to train your ear"],
      B1: ["Prepare LC and RC simultaneously", "Aim for 3,000 vocabulary words", "Read one paragraph of English news daily"],
      B2: ["Take 2 TOEIC practice tests per week", "Practice writing business emails in English", "Listen to English news and summarize it"],
      C1: ["Focus on advanced vocabulary and idioms", "Join a native speaker conversation group", "Practice writing English essays and reports"],
      C2: ["Read academic papers in English", "Participate in English lectures and debates", "Attempt professional English writing in your field"],
    },
    disclaimer: "* Converted scores are based on official guidelines and may differ from actual test results.",
  },
  ja: {
    title: "TOEICスコア換算器",
    subtitle: "TOEICスコアをCEFR・IELTS・TOEFLに換算",
    modeScore: "TOEIC → CEFR",
    modeCefr: "CEFR → TOEIC",
    inputLabel: "TOEICスコア (0–990)",
    inputPlaceholder: "スコアを入力",
    cefrSelectLabel: "CEFRレベルを選択",
    convertBtn: "換算する",
    resetBtn: "リセット",
    resultTitle: "換算結果",
    cefrLabel: "CEFRレベル",
    ieltsLabel: "IELTS換算",
    toeflLabel: "TOEFL iBT換算",
    toeicRangeLabel: "TOEICスコア範囲",
    jobUtilLabel: "就職・進学への活用",
    studyTipsLabel: "学習アドバイス",
    jobUtil: {
      A1: ["英語圏での就職はほぼ困難", "基礎英語力を優先的に強化", "初心者向けコースを推奨"],
      A2: ["観光・サービス業で基礎的な英語使用可", "単純な英語業務なら対応可能", "入門レベルの英語職種に挑戦"],
      B1: ["中小企業の海外営業サポート可", "日常的な英語でのコミュニケーション可", "語学留学の中級コースに挑戦"],
      B2: ["大企業・公務員試験の英語書類選考通過", "海外大学院入学基準を満たす", "英語圏国家の就労ビザ申請可能"],
      C1: ["グローバル企業の英語面接通過レベル", "海外修士・博士課程の入学要件充足", "海外での専門職就職可能"],
      C2: ["ネイティブレベル、最上位グローバル企業就職", "アイビーリーグ等トップ大学入学", "通訳・翻訳の専門家レベル"],
    },
    studyTips: {
      A1: ["アルファベット・発音の基礎から開始", "基礎単語500語を暗記", "毎日10分のリスニング習慣"],
      A2: ["基礎文法（現在・過去形）をマスター", "日常パターン文500個を暗記", "ドラマや洋楽で耳を慣らす"],
      B1: ["LC・RCを同時に対策", "単語帳3,000語を目標に", "英字新聞を毎日1段落読む"],
      B2: ["週2回TOEICの模擬試験を受ける", "ビジネス英語メールの作成練習", "英語ニュースを聞いて要約する"],
      C1: ["上級語彙・慣用句を集中学習", "ネイティブとの会話スタディに参加", "英語エッセイ・レポートの作成練習"],
      C2: ["英語の学術論文を読む", "英語の講演・ディベートに参加", "専門分野の英語著作に挑戦"],
    },
    disclaimer: "* 換算スコアは公式基準に基づいており、実際の試験結果と異なる場合があります。",
  },
  fr: {
    title: "Convertisseur de Score TOEIC",
    subtitle: "Convertissez votre score TOEIC en CEFR, IELTS et TOEFL",
    modeScore: "TOEIC → CECRL",
    modeCefr: "CECRL → TOEIC",
    inputLabel: "Score TOEIC (0–990)",
    inputPlaceholder: "Entrez votre score",
    cefrSelectLabel: "Sélectionner le niveau CECRL",
    convertBtn: "Convertir",
    resetBtn: "Réinitialiser",
    resultTitle: "Résultat de la conversion",
    cefrLabel: "Niveau CECRL",
    ieltsLabel: "Équivalent IELTS",
    toeflLabel: "Équivalent TOEFL iBT",
    toeicRangeLabel: "Plage de score TOEIC",
    jobUtilLabel: "Utilité professionnelle",
    studyTipsLabel: "Conseils d'étude",
    jobUtil: {
      A1: ["Utilisation de l'anglais très limitée", "Insuffisant pour la plupart des emplois anglophones", "Concentrez-vous sur les bases d'abord"],
      A2: ["Postes basiques en tourisme/service", "Tâches simples en anglais possibles", "Postes d'assistant bilingue débutant"],
      B1: ["Support commercial PME à l'international", "Communication quotidienne en anglais possible", "Programmes de langue intermédiaires"],
      B2: ["Passe la sélection des grandes entreprises", "Répond aux exigences des universités étrangères", "Visa de travail pays anglophones possible"],
      C1: ["Passe les entretiens en anglais des multinationales", "Répond aux exigences des meilleures écoles", "Emploi professionnel à l'étranger possible"],
      C2: ["Niveau natif, emploi dans les meilleures entreprises", "Admission dans les universités d'élite", "Niveau interprète/traducteur professionnel"],
    },
    studyTips: {
      A1: ["Commencez par l'alphabet et la prononciation", "Mémorisez 500 mots de vocabulaire de base", "Créez une habitude d'écoute de 10 min/jour"],
      A2: ["Maîtrisez la grammaire de base", "Mémorisez 500 structures de phrases", "Utilisez les séries et la musique pop"],
      B1: ["Préparez LC et RC simultanément", "Visez 3 000 mots de vocabulaire", "Lisez un paragraphe d'actualité en anglais par jour"],
      B2: ["Faites 2 tests TOEIC blancs par semaine", "Entraînez-vous à rédiger des emails professionnels", "Écoutez les actualités en anglais et résumez-les"],
      C1: ["Concentrez-vous sur le vocabulaire avancé", "Rejoignez un groupe de conversation avec natifs", "Entraînez-vous à rédiger des essais en anglais"],
      C2: ["Lisez des articles académiques en anglais", "Participez à des conférences et débats", "Essayez d'écrire professionnellement dans votre domaine"],
    },
    disclaimer: "* Les scores convertis sont basés sur des directives officielles et peuvent différer des résultats réels.",
  },
  es: {
    title: "Convertidor de Puntuación TOEIC",
    subtitle: "Convierte tu puntuación TOEIC a CEFR, IELTS y TOEFL",
    modeScore: "TOEIC → MCERL",
    modeCefr: "MCERL → TOEIC",
    inputLabel: "Puntuación TOEIC (0–990)",
    inputPlaceholder: "Ingresa tu puntuación",
    cefrSelectLabel: "Seleccionar nivel MCERL",
    convertBtn: "Convertir",
    resetBtn: "Reiniciar",
    resultTitle: "Resultado de conversión",
    cefrLabel: "Nivel MCERL",
    ieltsLabel: "Equivalente IELTS",
    toeflLabel: "Equivalente TOEFL iBT",
    toeicRangeLabel: "Rango de puntuación TOEIC",
    jobUtilLabel: "Uso profesional y académico",
    studyTipsLabel: "Recomendaciones de estudio",
    jobUtil: {
      A1: ["Uso del inglés muy limitado", "Insuficiente para la mayoría de empleos en inglés", "Primero construye una base sólida"],
      A2: ["Puestos básicos en turismo/servicio", "Tareas simples en inglés posibles", "Posiciones de asistente bilingüe nivel inicial"],
      B1: ["Soporte de ventas internacionales en PYME", "Comunicación diaria en inglés posible", "Programas de idiomas de nivel intermedio"],
      B2: ["Supera la selección de grandes empresas", "Cumple requisitos de universidades extranjeras", "Visa de trabajo en países anglófonos posible"],
      C1: ["Supera entrevistas en inglés de multinacionales", "Cumple requisitos de las mejores universidades", "Empleo profesional en el extranjero posible"],
      C2: ["Nivel nativo, empleo en las mejores empresas", "Admisión en universidades de élite", "Nivel intérprete/traductor profesional"],
    },
    studyTips: {
      A1: ["Empieza con el alfabeto y la pronunciación", "Memoriza 500 palabras de vocabulario básico", "Crea un hábito de escucha de 10 min/día"],
      A2: ["Domina la gramática básica", "Memoriza 500 estructuras de frases cotidianas", "Usa series y música pop para entrenar el oído"],
      B1: ["Prepara LC y RC simultáneamente", "Apunta a 3,000 palabras de vocabulario", "Lee un párrafo de noticias en inglés al día"],
      B2: ["Haz 2 exámenes de práctica TOEIC por semana", "Practica escribir correos electrónicos profesionales", "Escucha noticias en inglés y resúmelas"],
      C1: ["Enfócate en vocabulario avanzado y modismos", "Únete a un grupo de conversación con nativos", "Practica escribir ensayos e informes en inglés"],
      C2: ["Lee artículos académicos en inglés", "Participa en conferencias y debates en inglés", "Intenta escribir profesionalmente en tu campo"],
    },
    disclaimer: "* Las puntuaciones convertidas se basan en pautas oficiales y pueden diferir de los resultados reales.",
  },
  zh: {
    title: "TOEIC分数换算器",
    subtitle: "将TOEIC分数换算为CEFR、雅思和托福",
    modeScore: "TOEIC → CEFR",
    modeCefr: "CEFR → TOEIC",
    inputLabel: "TOEIC分数 (0–990)",
    inputPlaceholder: "输入分数",
    cefrSelectLabel: "选择CEFR等级",
    convertBtn: "换算",
    resetBtn: "重置",
    resultTitle: "换算结果",
    cefrLabel: "CEFR等级",
    ieltsLabel: "雅思换算",
    toeflLabel: "托福iBT换算",
    toeicRangeLabel: "TOEIC分数范围",
    jobUtilLabel: "求职/升学用途",
    studyTipsLabel: "学习建议",
    jobUtil: {
      A1: ["英语使用极为有限", "不足以应对大多数英语岗位", "先专注打好基础"],
      A2: ["旅游/服务业基础岗位", "可完成简单英语任务", "初级双语助理职位"],
      B1: ["中小企业海外销售支持", "日常英语交流可能", "中级语言学校课程"],
      B2: ["通过国内大型企业英语筛选", "符合海外大学研究生入学要求", "可申请英语国家工作签证"],
      C1: ["通过跨国企业英语面试", "符合顶尖研究生院要求", "可在国外从事专业工作"],
      C2: ["母语水平，顶级全球企业就业", "常春藤等顶尖大学录取", "口译/笔译专业水平"],
    },
    studyTips: {
      A1: ["从字母和发音基础开始", "记忆500个核心词汇", "养成每天10分钟听力习惯"],
      A2: ["掌握基础语法（现在/过去时）", "记忆500个日常句型", "用美剧/流行歌曲训练耳朵"],
      B1: ["同时准备LC和RC", "目标3000个词汇", "每天阅读一段英文新闻"],
      B2: ["每周做2次TOEIC模拟题", "练习写商务英语邮件", "听英语新闻并总结"],
      C1: ["专注学习高级词汇和习语", "加入母语者对话小组", "练习写英语论文和报告"],
      C2: ["阅读英语学术论文", "参加英语讲座和辩论", "尝试在专业领域用英语写作"],
    },
    disclaimer: "* 换算分数基于官方标准，可能与实际考试结果有所不同。",
  },
};

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function ToeicScoreConverter({ locale }: Props) {
  const t = UI[locale] ?? UI.en;
  const [mode, setMode] = useState<Mode>("toeic");
  const [scoreInput, setScoreInput] = useState("");
  const [selectedCefr, setSelectedCefr] = useState<CEFRLevel | "">("");
  const [result, setResult] = useState<LevelData | null>(null);

  function handleConvert() {
    if (mode === "toeic") {
      const score = parseInt(scoreInput, 10);
      if (isNaN(score) || score < 0 || score > 990) return;
      setResult(getLevelByScore(score));
    } else {
      if (!selectedCefr) return;
      setResult(getLevelByCEFR(selectedCefr));
    }
  }

  function handleReset() {
    setScoreInput("");
    setSelectedCefr("");
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {(["toeic", "cefr"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResult(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-blue-50"
            }`}
          >
            {m === "toeic" ? t.modeScore : t.modeCefr}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        {mode === "toeic" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.inputLabel}
            </label>
            <input
              type="number"
              min={0}
              max={990}
              value={scoreInput}
              onChange={(e) => { setScoreInput(e.target.value); setResult(null); }}
              placeholder={t.inputPlaceholder}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.cefrSelectLabel}
            </label>
            <select
              value={selectedCefr}
              onChange={(e) => { setSelectedCefr(e.target.value as CEFRLevel); setResult(null); }}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">—</option>
              {CEFR_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleConvert}
          disabled={mode === "toeic" ? !scoreInput : !selectedCefr}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {t.convertBtn}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border border-gray-200 ${result.bgColor} p-6 space-y-5`}>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {t.resultTitle}
          </p>

          {/* Score cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">{t.cefrLabel}</p>
              <p className={`text-2xl font-extrabold ${result.color}`}>{result.cefr}</p>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">{t.toeicRangeLabel}</p>
              <p className="text-lg font-bold text-gray-800">
                {result.toeicMin}–{result.toeicMax}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">{t.ieltsLabel}</p>
              <p className="text-xl font-bold text-gray-800">{result.ielts}</p>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">{t.toeflLabel}</p>
              <p className="text-lg font-bold text-gray-800">{result.toefl}</p>
            </div>
          </div>

          {/* Job utility */}
          <div className="rounded-xl bg-white p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">{t.jobUtilLabel}</p>
            <ul className="space-y-1">
              {t.jobUtil[result.cefr].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-0.5 shrink-0 text-blue-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Study tips */}
          <div className="rounded-xl bg-white p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">{t.studyTipsLabel}</p>
            <ol className="space-y-1 list-decimal list-inside">
              {t.studyTips[result.cefr].map((tip, i) => (
                <li key={i} className="text-sm text-gray-600">{tip}</li>
              ))}
            </ol>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">{t.disclaimer}</p>
            <button
              onClick={handleReset}
              className="rounded-lg border border-blue-300 px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {t.resetBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
