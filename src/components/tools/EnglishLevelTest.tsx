import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface Question {
  id: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: "grammar" | "vocabulary" | "reading";
  question: string;
  options: string[];
  answer: number; // 0-based index
  explanation: string;
}

const QUESTIONS: Question[] = [
  // Beginner (A1-A2) — 5 questions
  {
    id: 1,
    difficulty: "beginner",
    category: "grammar",
    question: "She _____ a teacher.",
    options: ["am", "is", "are", "be"],
    answer: 1,
    explanation: "'She' is third-person singular, so we use 'is'.",
  },
  {
    id: 2,
    difficulty: "beginner",
    category: "vocabulary",
    question: "What is the opposite of 'hot'?",
    options: ["warm", "cold", "cool", "big"],
    answer: 1,
    explanation: "The opposite of 'hot' is 'cold'.",
  },
  {
    id: 3,
    difficulty: "beginner",
    category: "grammar",
    question: "_____ you like coffee?",
    options: ["Are", "Is", "Do", "Does"],
    answer: 2,
    explanation: "We use 'Do' for questions with 'you' in simple present.",
  },
  {
    id: 4,
    difficulty: "beginner",
    category: "vocabulary",
    question: "Which word means 'very happy'?",
    options: ["sad", "tired", "angry", "joyful"],
    answer: 3,
    explanation: "'Joyful' means very happy or full of joy.",
  },
  {
    id: 5,
    difficulty: "beginner",
    category: "grammar",
    question: "I _____ breakfast every morning.",
    options: ["eat", "eats", "eating", "ate"],
    answer: 0,
    explanation: "With 'I', we use the base form 'eat' in simple present.",
  },
  // Intermediate (B1-B2) — 10 questions
  {
    id: 6,
    difficulty: "intermediate",
    category: "grammar",
    question: "If I _____ more time, I would study harder.",
    options: ["have", "had", "will have", "would have"],
    answer: 1,
    explanation: "This is a second conditional sentence; 'had' is correct for hypothetical present situations.",
  },
  {
    id: 7,
    difficulty: "intermediate",
    category: "vocabulary",
    question: "The word 'meticulous' means:",
    options: ["careless", "very careful about details", "fast-moving", "generous"],
    answer: 1,
    explanation: "'Meticulous' means showing great attention to detail; very careful and precise.",
  },
  {
    id: 8,
    difficulty: "intermediate",
    category: "grammar",
    question: "She _____ here for five years by next June.",
    options: ["will live", "has lived", "will have lived", "lived"],
    answer: 2,
    explanation: "Future perfect tense is used for actions completed before a specific future time.",
  },
  {
    id: 9,
    difficulty: "intermediate",
    category: "reading",
    question: "Choose the sentence with correct punctuation:",
    options: [
      "However, she didn't agree with the plan.",
      "However she didn't agree, with the plan.",
      "However she didn't agree with the plan.",
      "However she; didn't agree with the plan.",
    ],
    answer: 0,
    explanation: "When 'however' starts a sentence as a conjunctive adverb, it is followed by a comma.",
  },
  {
    id: 10,
    difficulty: "intermediate",
    category: "vocabulary",
    question: "Which word is a synonym for 'abundant'?",
    options: ["scarce", "plentiful", "hidden", "dangerous"],
    answer: 1,
    explanation: "'Plentiful' means existing in large quantities; a synonym for 'abundant'.",
  },
  {
    id: 11,
    difficulty: "intermediate",
    category: "grammar",
    question: "The report _____ by the committee last week.",
    options: ["was reviewed", "reviewed", "has reviewed", "is reviewing"],
    answer: 0,
    explanation: "Passive voice in simple past: 'was reviewed' is correct here.",
  },
  {
    id: 12,
    difficulty: "intermediate",
    category: "vocabulary",
    question: "To 'procrastinate' means to:",
    options: ["work quickly", "delay doing something", "celebrate success", "organize carefully"],
    answer: 1,
    explanation: "'Procrastinate' means to postpone or delay action.",
  },
  {
    id: 13,
    difficulty: "intermediate",
    category: "reading",
    question: "In the sentence 'Despite the rain, we enjoyed the picnic,' 'despite' introduces:",
    options: ["a reason", "a contrast", "a result", "a condition"],
    answer: 1,
    explanation: "'Despite' is a preposition showing contrast between two situations.",
  },
  {
    id: 14,
    difficulty: "intermediate",
    category: "grammar",
    question: "Neither the manager nor the employees _____ happy with the decision.",
    options: ["was", "were", "is", "has been"],
    answer: 1,
    explanation: "When using 'neither...nor', the verb agrees with the subject closer to it. 'employees' is plural, so 'were' is correct.",
  },
  {
    id: 15,
    difficulty: "intermediate",
    category: "vocabulary",
    question: "Which pair are antonyms?",
    options: ["benevolent / kind", "verbose / concise", "tenacious / persistent", "lucid / clear"],
    answer: 1,
    explanation: "'Verbose' means using more words than needed; 'concise' means brief and to the point — they are antonyms.",
  },
  // Advanced (C1-C2) — 5 questions
  {
    id: 16,
    difficulty: "advanced",
    category: "grammar",
    question: "Scarcely _____ sat down when the phone rang.",
    options: ["I had", "had I", "I have", "have I"],
    answer: 1,
    explanation: "After negative adverbs like 'scarcely', subject-auxiliary inversion is required: 'had I'.",
  },
  {
    id: 17,
    difficulty: "advanced",
    category: "vocabulary",
    question: "The word 'equivocate' means to:",
    options: ["speak clearly and directly", "use ambiguous language to avoid commitment", "argue aggressively", "admit a mistake openly"],
    answer: 1,
    explanation: "'Equivocate' means to use ambiguous language, especially to conceal the truth or avoid commitment.",
  },
  {
    id: 18,
    difficulty: "advanced",
    category: "reading",
    question: "Which sentence demonstrates correct use of a dangling modifier?",
    options: [
      "Walking down the street, the trees were beautiful.",
      "Walking down the street, she admired the beautiful trees.",
      "She admired the trees walking down the street.",
      "The trees were admired while walking down the street.",
    ],
    answer: 1,
    explanation: "Option B correctly places the subject 'she' immediately after the modifier 'walking down the street', avoiding a dangling modifier.",
  },
  {
    id: 19,
    difficulty: "advanced",
    category: "grammar",
    question: "The phrase 'were it not for' is used to express:",
    options: ["a real present condition", "a hypothetical contrary-to-fact condition", "a future possibility", "a past regret"],
    answer: 1,
    explanation: "'Were it not for' is a formal subjunctive expression for hypothetical contrary-to-fact conditions.",
  },
  {
    id: 20,
    difficulty: "advanced",
    category: "vocabulary",
    question: "A 'sycophant' is a person who:",
    options: ["speaks truth to power", "uses flattery to gain favor", "studies ancient languages", "practices extreme austerity"],
    answer: 1,
    explanation: "A 'sycophant' is someone who acts obsequiously toward influential people in order to gain advantage.",
  },
];

function calcCEFR(score: number, total: number): CEFRLevel {
  const pct = (score / total) * 100;
  if (pct >= 95) return "C2";
  if (pct >= 80) return "C1";
  if (pct >= 65) return "B2";
  if (pct >= 50) return "B1";
  if (pct >= 30) return "A2";
  return "A1";
}

type UIData = {
  title: string;
  subtitle: string;
  startBtn: string;
  nextBtn: string;
  submitBtn: string;
  questionLabel: string;
  resultTitle: string;
  scoreLabel: string;
  cefrLabel: string;
  wrongAnswersTitle: string;
  correctAnswer: string;
  yourAnswer: string;
  explanationLabel: string;
  retakeBtn: string;
  cefrDesc: Record<CEFRLevel, { label: string; desc: string; tips: string[] }>;
};

const UI: Record<Locale, UIData> = {
  ko: {
    title: "영어 레벨 테스트",
    subtitle: "20문항으로 나의 영어 수준을 확인하세요 (CEFR A1–C2)",
    startBtn: "테스트 시작",
    nextBtn: "다음 문제",
    submitBtn: "결과 보기",
    questionLabel: "문제",
    resultTitle: "테스트 결과",
    scoreLabel: "점수",
    cefrLabel: "CEFR 레벨",
    wrongAnswersTitle: "틀린 문제 해설",
    correctAnswer: "정답",
    yourAnswer: "내 답",
    explanationLabel: "해설",
    retakeBtn: "다시 풀기",
    cefrDesc: {
      A1: {
        label: "입문 (Beginner)",
        desc: "기초 영어 표현과 단순 문장을 이해할 수 있는 단계입니다.",
        tips: ["알파벳과 기초 발음을 학습하세요", "일상 단어 500개를 암기하세요", "영어 그림책·동화를 활용하세요"],
      },
      A2: {
        label: "기초 (Elementary)",
        desc: "자주 쓰이는 문장과 표현을 이해하고 간단한 소통이 가능합니다.",
        tips: ["기초 문법(시제·관사)을 복습하세요", "영어 일기를 써보세요", "초급 영어 유튜브를 매일 시청하세요"],
      },
      B1: {
        label: "중급 (Intermediate)",
        desc: "친숙한 주제에 대해 명확하게 의사소통할 수 있습니다.",
        tips: ["TOEIC 600점대를 목표로 공부하세요", "영자 신문을 꾸준히 읽으세요", "영어 팟캐스트를 들으며 청해력을 키우세요"],
      },
      B2: {
        label: "중상급 (Upper-Intermediate)",
        desc: "복잡한 내용도 이해하고 원어민과 자연스럽게 소통 가능합니다.",
        tips: ["TOEIC 800점대 이상을 목표로 하세요", "영어 에세이 쓰기를 연습하세요", "원어민 영어 영상으로 고급 어휘를 익히세요"],
      },
      C1: {
        label: "고급 (Advanced)",
        desc: "복잡하고 긴 글을 유창하게 이해하고 표현할 수 있습니다.",
        tips: ["학술 논문·보고서를 영어로 읽으세요", "고급 관용구와 속담을 학습하세요", "원어민 토론 그룹에 참여하세요"],
      },
      C2: {
        label: "최고급 (Mastery)",
        desc: "원어민과 같은 수준의 유창성과 정확성을 갖추고 있습니다.",
        tips: ["전문 분야 영어 콘텐츠를 제작해보세요", "번역·통역 스킬을 연마하세요", "영어 저술·학술 활동에 도전하세요"],
      },
    },
  },
  en: {
    title: "English Level Test",
    subtitle: "Test your English level with 20 questions (CEFR A1–C2)",
    startBtn: "Start Test",
    nextBtn: "Next Question",
    submitBtn: "See Results",
    questionLabel: "Question",
    resultTitle: "Test Results",
    scoreLabel: "Score",
    cefrLabel: "CEFR Level",
    wrongAnswersTitle: "Review Incorrect Answers",
    correctAnswer: "Correct Answer",
    yourAnswer: "Your Answer",
    explanationLabel: "Explanation",
    retakeBtn: "Retake Test",
    cefrDesc: {
      A1: {
        label: "Beginner",
        desc: "You can understand and use basic expressions and simple sentences.",
        tips: ["Learn the alphabet and basic pronunciation", "Memorize 500 everyday vocabulary words", "Use picture books and simple stories in English"],
      },
      A2: {
        label: "Elementary",
        desc: "You can understand frequently used expressions and communicate simply.",
        tips: ["Review basic grammar (tenses, articles)", "Try writing a short English diary", "Watch beginner English YouTube videos daily"],
      },
      B1: {
        label: "Intermediate",
        desc: "You can clearly communicate on familiar topics.",
        tips: ["Aim for TOEIC 600+ level", "Read English news articles consistently", "Build listening skills with English podcasts"],
      },
      B2: {
        label: "Upper-Intermediate",
        desc: "You can understand complex texts and interact naturally with native speakers.",
        tips: ["Target TOEIC 800+ score", "Practice writing English essays", "Expand vocabulary with native English content"],
      },
      C1: {
        label: "Advanced",
        desc: "You can understand long and complex texts fluently and express ideas clearly.",
        tips: ["Read academic papers and reports in English", "Study advanced idioms and collocations", "Join native speaker discussion groups"],
      },
      C2: {
        label: "Mastery",
        desc: "You have near-native fluency and precision in English.",
        tips: ["Create English content in your professional field", "Hone translation and interpretation skills", "Engage in English academic writing and publishing"],
      },
    },
  },
  ja: {
    title: "英語レベルテスト",
    subtitle: "20問で英語のレベルを確認しよう（CEFR A1–C2）",
    startBtn: "テスト開始",
    nextBtn: "次の問題",
    submitBtn: "結果を見る",
    questionLabel: "問題",
    resultTitle: "テスト結果",
    scoreLabel: "スコア",
    cefrLabel: "CEFRレベル",
    wrongAnswersTitle: "間違えた問題の解説",
    correctAnswer: "正解",
    yourAnswer: "あなたの回答",
    explanationLabel: "解説",
    retakeBtn: "もう一度挑戦",
    cefrDesc: {
      A1: { label: "入門 (Beginner)", desc: "基本的な表現と簡単な文を理解できます。", tips: ["アルファベットと発音を学習", "基礎単語500語を暗記", "英語の絵本・童話を活用"] },
      A2: { label: "基礎 (Elementary)", desc: "よく使われる表現を理解し、簡単なやり取りができます。", tips: ["基礎文法を復習", "英語日記を書いてみる", "初級英語のYouTubeを毎日視聴"] },
      B1: { label: "中級 (Intermediate)", desc: "身近なトピックについて明確にコミュニケーションできます。", tips: ["TOEIC 600点台を目標に", "英字新聞を読み続ける", "英語ポッドキャストでリスニング強化"] },
      B2: { label: "中上級 (Upper-Intermediate)", desc: "複雑な内容を理解し、ネイティブと自然に話せます。", tips: ["TOEIC 800点以上を目指す", "英語エッセイの執筆練習", "英語ネイティブ動画で上級語彙習得"] },
      C1: { label: "上級 (Advanced)", desc: "長文や複雑なテキストを流暢に理解・表現できます。", tips: ["学術論文・レポートを英語で読む", "高度なイディオムを学ぶ", "ネイティブの討論グループに参加"] },
      C2: { label: "最上級 (Mastery)", desc: "ネイティブと同等の流暢さと正確さを持っています。", tips: ["専門分野の英語コンテンツを制作", "翻訳・通訳スキルを磨く", "英語学術執筆に挑戦"] },
    },
  },
  fr: {
    title: "Test de Niveau en Anglais",
    subtitle: "Évaluez votre niveau d'anglais avec 20 questions (CECRL A1–C2)",
    startBtn: "Commencer le test",
    nextBtn: "Question suivante",
    submitBtn: "Voir les résultats",
    questionLabel: "Question",
    resultTitle: "Résultats du test",
    scoreLabel: "Score",
    cefrLabel: "Niveau CECRL",
    wrongAnswersTitle: "Révision des mauvaises réponses",
    correctAnswer: "Bonne réponse",
    yourAnswer: "Votre réponse",
    explanationLabel: "Explication",
    retakeBtn: "Recommencer",
    cefrDesc: {
      A1: { label: "Débutant", desc: "Vous comprenez les expressions basiques et les phrases simples.", tips: ["Apprenez l'alphabet et la prononciation de base", "Mémorisez 500 mots courants", "Utilisez des livres illustrés en anglais"] },
      A2: { label: "Élémentaire", desc: "Vous comprenez les expressions courantes et pouvez communiquer simplement.", tips: ["Révisez la grammaire de base", "Essayez d'écrire un journal en anglais", "Regardez des vidéos YouTube pour débutants"] },
      B1: { label: "Intermédiaire", desc: "Vous pouvez communiquer clairement sur des sujets familiers.", tips: ["Visez le niveau TOEIC 600+", "Lisez des actualités en anglais", "Développez l'écoute avec des podcasts anglais"] },
      B2: { label: "Intermédiaire supérieur", desc: "Vous comprenez les textes complexes et interagissez naturellement.", tips: ["Ciblez le score TOEIC 800+", "Entraînez-vous à écrire des essais en anglais", "Élargissez votre vocabulaire avec des contenus natifs"] },
      C1: { label: "Avancé", desc: "Vous comprenez des textes longs et complexes avec aisance.", tips: ["Lisez des articles académiques en anglais", "Étudiez les idiomes avancés", "Rejoignez des groupes de discussion avec des natifs"] },
      C2: { label: "Maîtrise", desc: "Vous avez une aisance et une précision quasi-natives.", tips: ["Créez du contenu anglais dans votre domaine", "Perfectionnez les compétences en traduction", "Engagez-vous dans la rédaction académique en anglais"] },
    },
  },
  es: {
    title: "Test de Nivel de Inglés",
    subtitle: "Evalúa tu nivel de inglés con 20 preguntas (MCERL A1–C2)",
    startBtn: "Iniciar test",
    nextBtn: "Siguiente pregunta",
    submitBtn: "Ver resultados",
    questionLabel: "Pregunta",
    resultTitle: "Resultados del test",
    scoreLabel: "Puntuación",
    cefrLabel: "Nivel MCERL",
    wrongAnswersTitle: "Revisar respuestas incorrectas",
    correctAnswer: "Respuesta correcta",
    yourAnswer: "Tu respuesta",
    explanationLabel: "Explicación",
    retakeBtn: "Volver a intentar",
    cefrDesc: {
      A1: { label: "Principiante", desc: "Puedes entender y usar expresiones básicas y frases simples.", tips: ["Aprende el alfabeto y pronunciación básica", "Memoriza 500 palabras cotidianas", "Usa libros ilustrados y cuentos en inglés"] },
      A2: { label: "Elemental", desc: "Puedes entender expresiones frecuentes y comunicarte de forma simple.", tips: ["Repasa la gramática básica", "Intenta escribir un diario en inglés", "Mira vídeos de YouTube para principiantes a diario"] },
      B1: { label: "Intermedio", desc: "Puedes comunicarte claramente sobre temas familiares.", tips: ["Apunta a nivel TOEIC 600+", "Lee noticias en inglés con regularidad", "Mejora la comprensión auditiva con podcasts"] },
      B2: { label: "Intermedio superior", desc: "Puedes entender textos complejos e interactuar naturalmente.", tips: ["Apunta a puntuación TOEIC 800+", "Practica escribir ensayos en inglés", "Amplía vocabulario con contenido nativo"] },
      C1: { label: "Avanzado", desc: "Puedes entender textos largos y complejos con fluidez.", tips: ["Lee artículos académicos en inglés", "Estudia modismos avanzados", "Únete a grupos de debate con nativos"] },
      C2: { label: "Dominio", desc: "Tienes fluidez y precisión casi nativas en inglés.", tips: ["Crea contenido en inglés en tu campo profesional", "Perfecciona habilidades de traducción", "Participa en redacción académica en inglés"] },
    },
  },
  zh: {
    title: "英语水平测试",
    subtitle: "用20道题检验你的英语水平（CEFR A1–C2）",
    startBtn: "开始测试",
    nextBtn: "下一题",
    submitBtn: "查看结果",
    questionLabel: "问题",
    resultTitle: "测试结果",
    scoreLabel: "得分",
    cefrLabel: "CEFR等级",
    wrongAnswersTitle: "错题解析",
    correctAnswer: "正确答案",
    yourAnswer: "你的答案",
    explanationLabel: "解析",
    retakeBtn: "重新测试",
    cefrDesc: {
      A1: { label: "入门 (Beginner)", desc: "能理解和使用基本表达和简单句子。", tips: ["学习字母和基础发音", "记忆500个日常词汇", "使用英语图画书和简单故事"] },
      A2: { label: "基础 (Elementary)", desc: "能理解常用表达，进行简单交流。", tips: ["复习基础语法", "尝试写英语日记", "每天观看初级英语YouTube视频"] },
      B1: { label: "中级 (Intermediate)", desc: "能就熟悉话题清晰交流。", tips: ["目标TOEIC 600分以上", "坚持阅读英文新闻", "用英语播客提高听力"] },
      B2: { label: "中高级 (Upper-Intermediate)", desc: "能理解复杂内容，与母语者自然交流。", tips: ["目标TOEIC 800分以上", "练习写英语作文", "通过母语内容扩大词汇量"] },
      C1: { label: "高级 (Advanced)", desc: "能流利理解长篇复杂文本。", tips: ["阅读英文学术论文", "学习高级习语和搭配", "加入母语者讨论小组"] },
      C2: { label: "精通 (Mastery)", desc: "具备接近母语者的流利度和准确性。", tips: ["在专业领域创作英语内容", "磨练翻译和口译技能", "参与英语学术写作"] },
    },
  },
};

const LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: "text-gray-600",
  A2: "text-blue-600",
  B1: "text-green-600",
  B2: "text-yellow-600",
  C1: "text-orange-600",
  C2: "text-red-600",
};

const LEVEL_BG: Record<CEFRLevel, string> = {
  A1: "bg-gray-50",
  A2: "bg-blue-50",
  B1: "bg-green-50",
  B2: "bg-yellow-50",
  C1: "bg-orange-50",
  C2: "bg-red-50",
};

type Stage = "intro" | "test" | "result";

export default function EnglishLevelTest({ locale }: Props) {
  const t = UI[locale] ?? UI.en;
  const [stage, setStage] = useState<Stage>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [selected, setSelected] = useState<number | null>(null);

  const totalQ = QUESTIONS.length;
  const currentQ = QUESTIONS[currentIdx];
  const isLast = currentIdx === totalQ - 1;

  function handleStart() {
    setStage("test");
    setCurrentIdx(0);
    setAnswers(Array(totalQ).fill(null));
    setSelected(null);
  }

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
  }

  function handleNext() {
    if (isLast) {
      setStage("result");
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    }
  }

  const score = answers.filter((a, i) => a === QUESTIONS[i].answer).length;
  const cefr = calcCEFR(score, totalQ);
  const wrongQuestions = QUESTIONS.filter((q, i) => answers[i] !== null && answers[i] !== q.answer);

  if (stage === "intro") {
    return (
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="mt-2 text-gray-500">{t.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-left space-y-3">
          {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
            <div key={lvl} className="flex items-center gap-3">
              <span className={`w-10 text-center rounded-lg py-0.5 text-sm font-bold ${LEVEL_COLORS[lvl as CEFRLevel]}`}>{lvl}</span>
              <span className="text-sm text-gray-600">{t.cefrDesc[lvl as CEFRLevel].label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={handleStart}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-md hover:from-indigo-700 hover:to-violet-700 transition-all"
        >
          {t.startBtn}
        </button>
      </div>
    );
  }

  if (stage === "test") {
    const progress = ((currentIdx) / totalQ) * 100;
    return (
      <div className="space-y-5">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{t.questionLabel} {currentIdx + 1} / {totalQ}</span>
          <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-gray-100">
            {currentQ.difficulty} · {currentQ.category}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-base font-medium text-gray-900">{currentQ.question}</p>
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => {
              let cls = "w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ";
              if (selected === null) {
                cls += "border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 text-gray-800";
              } else if (i === currentQ.answer) {
                cls += "border-green-500 bg-green-50 text-green-800 font-medium";
              } else if (i === selected) {
                cls += "border-red-400 bg-red-50 text-red-700";
              } else {
                cls += "border-gray-200 bg-gray-50 text-gray-500 opacity-60";
              }
              return (
                <button key={i} onClick={() => handleSelect(i)} className={cls} disabled={selected !== null}>
                  <span className="mr-2 font-semibold">{["A", "B", "C", "D"][i]}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              {currentQ.explanation}
            </div>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={selected === null}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-md hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isLast ? t.submitBtn : t.nextBtn}
        </button>
      </div>
    );
  }

  // Result stage
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-900">{t.resultTitle}</h1>

      <div className={`rounded-2xl border border-gray-200 ${LEVEL_BG[cefr]} p-6 text-center space-y-3`}>
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t.cefrLabel}</p>
        <p className={`text-6xl font-extrabold ${LEVEL_COLORS[cefr]}`}>{cefr}</p>
        <p className={`text-lg font-semibold ${LEVEL_COLORS[cefr]}`}>{t.cefrDesc[cefr].label}</p>
        <p className="text-sm text-gray-600">{t.cefrDesc[cefr].desc}</p>
        <p className="text-sm text-gray-500">
          {t.scoreLabel}: <strong>{score}</strong> / {totalQ}
        </p>
        <div className="h-3 rounded-full bg-gray-200 mx-4">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${(score / totalQ) * 100}%` }}
          />
        </div>
      </div>

      {/* Study tips */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Study Tips</p>
        <ol className="space-y-2 list-decimal list-inside">
          {t.cefrDesc[cefr].tips.map((tip, i) => (
            <li key={i} className="text-sm text-gray-600">{tip}</li>
          ))}
        </ol>
      </div>

      {/* Wrong answers review */}
      {wrongQuestions.length > 0 && (
        <div className="space-y-3">
          <p className="font-semibold text-gray-800">{t.wrongAnswersTitle}</p>
          {wrongQuestions.map((q) => {
            const userAns = answers[QUESTIONS.indexOf(q)];
            return (
              <div key={q.id} className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">{q.question}</p>
                <p className="text-xs text-green-700">
                  {t.correctAnswer}: {q.options[q.answer]}
                </p>
                {userAns !== null && (
                  <p className="text-xs text-red-600">
                    {t.yourAnswer}: {q.options[userAns]}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  {t.explanationLabel}: {q.explanation}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={handleStart}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white shadow-md hover:from-indigo-700 hover:to-violet-700 transition-all"
      >
        {t.retakeBtn}
      </button>
    </div>
  );
}
