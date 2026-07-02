import React, { useState } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

// Each question has two choices: A = left-brain tendency, B = right-brain tendency
interface Question {
  id: number;
  text: Record<Locale, string>;
  a: Record<Locale, string>; // left-brain
  b: Record<Locale, string>; // right-brain
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: {
      ko: '새로운 프로젝트를 시작할 때 나는…',
      en: 'When starting a new project, I tend to…',
      ja: '新しいプロジェクトを始めるとき、私は…',
      fr: 'Lorsque je commence un nouveau projet, je…',
      es: 'Cuando empiezo un nuevo proyecto, tiendo a…',
      zh: '开始新项目时，我倾向于…',
    },
    a: {
      ko: '먼저 계획을 세우고 단계별로 진행한다',
      en: 'Make a plan first and proceed step by step',
      ja: 'まず計画を立てて段階的に進める',
      fr: "D'abord établir un plan et avancer étape par étape",
      es: 'Hacer un plan primero y proceder paso a paso',
      zh: '先制定计划，然后逐步进行',
    },
    b: {
      ko: '아이디어가 떠오르는 대로 바로 시작한다',
      en: 'Jump right in as ideas come to me',
      ja: 'アイデアが浮かんだらすぐに始める',
      fr: 'Me lancer directement au fil de mes idées',
      es: 'Lanzarme directamente según me surgen ideas',
      zh: '想到什么就立刻开始',
    },
  },
  {
    id: 2,
    text: {
      ko: '문제를 풀 때 나는 주로…',
      en: 'When solving problems, I mainly…',
      ja: '問題を解くとき、私は主に…',
      fr: 'Pour résoudre des problèmes, je…',
      es: 'Al resolver problemas, principalmente…',
      zh: '解决问题时，我主要…',
    },
    a: {
      ko: '논리적 분석과 데이터에 의존한다',
      en: 'Rely on logical analysis and data',
      ja: '論理的な分析とデータに頼る',
      fr: "M'appuie sur l'analyse logique et les données",
      es: 'Me apoyo en el análisis lógico y los datos',
      zh: '依赖逻辑分析和数据',
    },
    b: {
      ko: '직관과 느낌을 믿는다',
      en: 'Trust my intuition and gut feeling',
      ja: '直感と感覚を信じる',
      fr: 'Fais confiance à mon intuition et mes ressentis',
      es: 'Confío en mi intuición y mis sensaciones',
      zh: '相信直觉和感觉',
    },
  },
  {
    id: 3,
    text: {
      ko: '친구에게 길을 알려줄 때 나는…',
      en: 'When giving directions to a friend, I…',
      ja: '友人に道を教えるとき、私は…',
      fr: 'Pour expliquer un chemin à un ami, je…',
      es: 'Al dar indicaciones a un amigo, yo…',
      zh: '给朋友指路时，我…',
    },
    a: {
      ko: '좌회전·우회전 등 명확한 지시어로 설명한다',
      en: 'Give clear verbal directions with left/right turns',
      ja: '左折・右折などの明確な指示語で説明する',
      fr: 'Donne des instructions verbales claires (gauche/droite)',
      es: 'Doy instrucciones verbales claras (izquierda/derecha)',
      zh: '用明确的语言方向说明（左转/右转）',
    },
    b: {
      ko: '지도를 그리거나 랜드마크를 이용해 설명한다',
      en: 'Draw a map or use landmarks to explain',
      ja: '地図を描いたりランドマークを使って説明する',
      fr: 'Dessine une carte ou utilise des repères',
      es: 'Dibujo un mapa o uso puntos de referencia',
      zh: '画地图或用地标说明',
    },
  },
  {
    id: 4,
    text: {
      ko: '나는 책을 읽을 때…',
      en: 'When reading a book, I…',
      ja: '本を読むとき、私は…',
      fr: 'Quand je lis un livre, je…',
      es: 'Cuando leo un libro, yo…',
      zh: '阅读书籍时，我…',
    },
    a: {
      ko: '순서대로 처음부터 끝까지 읽는다',
      en: 'Read from start to finish in order',
      ja: '最初から最後まで順番に読む',
      fr: "Lis du début à la fin dans l'ordre",
      es: 'Leo de principio a fin en orden',
      zh: '按顺序从头读到尾',
    },
    b: {
      ko: '흥미로운 부분을 먼저 골라 읽는다',
      en: 'Pick and read interesting parts first',
      ja: '興味のある部分を先に選んで読む',
      fr: "Choisis et lis d'abord les parties intéressantes",
      es: 'Elijo y leo primero las partes interesantes',
      zh: '先挑选感兴趣的部分阅读',
    },
  },
  {
    id: 5,
    text: {
      ko: '나는 음악을 들을 때…',
      en: 'When listening to music, I…',
      ja: '音楽を聴くとき、私は…',
      fr: "Quand j'écoute de la musique, je…",
      es: 'Cuando escucho música, yo…',
      zh: '听音乐时，我…',
    },
    a: {
      ko: '가사와 곡의 구조를 분석하며 듣는다',
      en: 'Analyze the lyrics and structure of the song',
      ja: '歌詞と曲の構造を分析しながら聴く',
      fr: 'Analyse les paroles et la structure musicale',
      es: 'Analizo la letra y la estructura de la canción',
      zh: '分析歌词和曲子结构',
    },
    b: {
      ko: '분위기와 감정에 집중하며 듣는다',
      en: 'Focus on the mood and emotions conveyed',
      ja: '雰囲気と感情に集中しながら聴く',
      fr: "Me concentre sur l'ambiance et les émotions",
      es: 'Me concentro en el ambiente y las emociones',
      zh: '专注于氛围和情感',
    },
  },
  {
    id: 6,
    text: {
      ko: '나는 중요한 결정을 내릴 때…',
      en: 'When making important decisions, I…',
      ja: '重要な決断をするとき、私は…',
      fr: 'Lorsque je prends des décisions importantes, je…',
      es: 'Cuando tomo decisiones importantes, yo…',
      zh: '做重要决定时，我…',
    },
    a: {
      ko: '장단점을 목록으로 작성해 비교한다',
      en: 'Make a pros and cons list to compare',
      ja: 'メリット・デメリットをリストにして比較する',
      fr: 'Fais une liste des pour et contre',
      es: 'Hago una lista de pros y contras',
      zh: '列出优缺点清单进行比较',
    },
    b: {
      ko: '마음이 이끄는 대로 직관적으로 결정한다',
      en: 'Follow my heart and decide intuitively',
      ja: '心の向くままに直感的に決断する',
      fr: 'Suis mon cœur et décide intuitivement',
      es: 'Sigo mi corazón y decido intuitivamente',
      zh: '跟随心灵直觉作决定',
    },
  },
  {
    id: 7,
    text: {
      ko: '나는 수업이나 강의를 들을 때…',
      en: 'When attending a class or lecture, I…',
      ja: '授業や講義を受けるとき、私は…',
      fr: "Lors d'un cours ou d'une conférence, je…",
      es: 'En una clase o conferencia, yo…',
      zh: '上课或听讲座时，我…',
    },
    a: {
      ko: '체계적으로 노트를 정리하며 듣는다',
      en: 'Take organized, structured notes',
      ja: '体系的にノートを整理しながら聴く',
      fr: 'Prends des notes organisées et structurées',
      es: 'Tomo notas organizadas y estructuradas',
      zh: '系统地整理笔记',
    },
    b: {
      ko: '그림이나 다이어그램으로 내용을 시각화한다',
      en: 'Visualize content with pictures or diagrams',
      ja: '絵やダイアグラムでビジュアル化する',
      fr: 'Visualise le contenu avec des dessins ou schémas',
      es: 'Visualizo el contenido con dibujos o diagramas',
      zh: '用图画或图表可视化内容',
    },
  },
  {
    id: 8,
    text: {
      ko: '나의 작업 공간은 주로…',
      en: 'My workspace is usually…',
      ja: '私の作業スペースはたいてい…',
      fr: 'Mon espace de travail est généralement…',
      es: 'Mi espacio de trabajo es generalmente…',
      zh: '我的工作空间通常…',
    },
    a: {
      ko: '정리정돈이 잘 되어 있고 깔끔하다',
      en: 'Neat and well-organized',
      ja: 'きちんと整理されていてすっきりしている',
      fr: 'Bien rangé et organisé',
      es: 'Ordenado y bien organizado',
      zh: '整潔有序',
    },
    b: {
      ko: '창의적으로 물건이 여기저기 놓여 있다',
      en: 'Creatively cluttered with things here and there',
      ja: 'クリエイティブにものがあちこちに置かれている',
      fr: 'Créativement encombré, avec des choses partout',
      es: 'Creativamente desordenado con cosas aquí y allá',
      zh: '创意性地四处散放物品',
    },
  },
  {
    id: 9,
    text: {
      ko: '나는 시간을 관리할 때…',
      en: 'When managing my time, I…',
      ja: '時間を管理するとき、私は…',
      fr: 'Pour gérer mon temps, je…',
      es: 'Para gestionar mi tiempo, yo…',
      zh: '管理时间时，我…',
    },
    a: {
      ko: '일정표나 캘린더를 꼼꼼히 활용한다',
      en: 'Carefully use a schedule or calendar',
      ja: 'スケジュール表やカレンダーをきちんと活用する',
      fr: 'Utilise soigneusement un agenda ou calendrier',
      es: 'Uso cuidadosamente un horario o calendario',
      zh: '仔细使用日程表或日历',
    },
    b: {
      ko: '느낌에 따라 유연하게 시간을 쓴다',
      en: 'Use time flexibly based on how I feel',
      ja: '感覚に応じて柔軟に時間を使う',
      fr: 'Utilise le temps de façon flexible selon mon humeur',
      es: 'Uso el tiempo flexiblemente según cómo me siento',
      zh: '根据感觉灵活使用时间',
    },
  },
  {
    id: 10,
    text: {
      ko: '나는 기억할 때 주로…',
      en: 'When I memorize things, I mainly…',
      ja: '何かを覚えるとき、私は主に…',
      fr: 'Pour mémoriser, je…',
      es: 'Para memorizar cosas, principalmente…',
      zh: '记忆东西时，我主要…',
    },
    a: {
      ko: '언어나 논리적 연결로 외운다',
      en: 'Use verbal or logical associations',
      ja: '言語や論理的なつながりで覚える',
      fr: 'Utilise des associations verbales ou logiques',
      es: 'Uso asociaciones verbales o lógicas',
      zh: '用语言或逻辑联系记忆',
    },
    b: {
      ko: '이미지나 색깔로 시각화해서 외운다',
      en: 'Visualize with images or colors',
      ja: '画像や色でビジュアル化して覚える',
      fr: 'Visualise avec des images ou des couleurs',
      es: 'Visualizo con imágenes o colores',
      zh: '用图像或颜色视觉化记忆',
    },
  },
  {
    id: 11,
    text: {
      ko: '나는 새로운 언어를 배울 때…',
      en: 'When learning a new language, I…',
      ja: '新しい言語を学ぶとき、私は…',
      fr: 'Pour apprendre une nouvelle langue, je…',
      es: 'Al aprender un nuevo idioma, yo…',
      zh: '学习新语言时，我…',
    },
    a: {
      ko: '문법 규칙을 먼저 체계적으로 익힌다',
      en: 'First learn grammar rules systematically',
      ja: '文法ルールをまず体系的に覚える',
      fr: "D'abord apprendre les règles de grammaire",
      es: 'Primero aprendo las reglas gramaticales',
      zh: '先系统地学习语法规则',
    },
    b: {
      ko: '대화와 실전을 통해 감각으로 배운다',
      en: 'Learn through conversation and practice by feel',
      ja: '会話と実践を通して感覚で学ぶ',
      fr: "Apprends à travers la conversation et la pratique",
      es: 'Aprendo a través de la conversación y la práctica',
      zh: '通过对话和实践以感觉学习',
    },
  },
  {
    id: 12,
    text: {
      ko: '나는 창의적 작업을 할 때…',
      en: 'When doing creative work, I…',
      ja: 'クリエイティブな作業をするとき、私は…',
      fr: 'Pour un travail créatif, je…',
      es: 'En el trabajo creativo, yo…',
      zh: '进行创意工作时，我…',
    },
    a: {
      ko: '명확한 구조와 틀 안에서 아이디어를 발전시킨다',
      en: 'Develop ideas within a clear structure',
      ja: '明確な構造と枠組みの中でアイデアを発展させる',
      fr: 'Développe des idées dans une structure claire',
      es: 'Desarrollo ideas dentro de una estructura clara',
      zh: '在清晰的框架內發展想法',
    },
    b: {
      ko: '자유롭게 상상하며 경계 없이 아이디어를 펼친다',
      en: 'Imagine freely and expand ideas without limits',
      ja: '自由に想像し、限界なくアイデアを広げる',
      fr: 'Imagine librement et développe sans limites',
      es: 'Imagino libremente y expando ideas sin límites',
      zh: '自由想象，无限展开想法',
    },
  },
];

const L: Record<Locale, {
  title: string;
  subtitle: string;
  progress: string;
  result: string;
  retake: string;
  leftTitle: string;
  rightTitle: string;
  balancedTitle: string;
  leftDesc: string;
  rightDesc: string;
  balancedDesc: string;
  leftTraits: string[];
  rightTraits: string[];
  balancedTraits: string[];
  chooseA: string;
  chooseB: string;
}> = {
  ko: {
    title: '좌뇌 vs 우뇌 테스트',
    subtitle: 'Left Brain vs Right Brain',
    progress: '질문',
    result: '결과',
    retake: '다시 하기',
    leftTitle: '좌뇌형 인간',
    rightTitle: '우뇌형 인간',
    balancedTitle: '균형형 인간',
    leftDesc: '당신은 논리적·분석적 사고가 강한 좌뇌 우세형입니다. 체계적인 계획 수립과 언어적 사고에 뛰어납니다.',
    rightDesc: '당신은 직관적·창의적 사고가 강한 우뇌 우세형입니다. 예술적 감각과 공간 인지 능력이 탁월합니다.',
    balancedDesc: '당신은 좌뇌와 우뇌를 균형 있게 활용하는 균형형입니다. 논리와 창의성을 두루 갖추고 있습니다.',
    leftTraits: ['논리적 분석', '체계적 계획', '언어 능력', '수학적 사고', '세부 사항 집중'],
    rightTraits: ['창의적 발상', '직관과 감성', '예술적 감각', '공간 인지', '큰 그림 보기'],
    balancedTraits: ['논리와 창의의 균형', '다양한 접근법', '유연한 사고', '상황 적응력', '종합적 사고'],
    chooseA: '선택 A',
    chooseB: '선택 B',
  },
  en: {
    title: 'Left Brain vs Right Brain Test',
    subtitle: 'Discover your dominant thinking style',
    progress: 'Question',
    result: 'Result',
    retake: 'Retake',
    leftTitle: 'Left-Brain Dominant',
    rightTitle: 'Right-Brain Dominant',
    balancedTitle: 'Balanced Thinker',
    leftDesc: 'You are left-brain dominant — logical and analytical. You excel at systematic planning and verbal reasoning.',
    rightDesc: 'You are right-brain dominant — intuitive and creative. You have exceptional artistic sense and spatial awareness.',
    balancedDesc: 'You balance both hemispheres equally. You combine logic and creativity for versatile, holistic thinking.',
    leftTraits: ['Logical analysis', 'Systematic planning', 'Verbal ability', 'Mathematical thinking', 'Detail-focused'],
    rightTraits: ['Creative ideation', 'Intuition & emotion', 'Artistic sense', 'Spatial awareness', 'Big-picture thinking'],
    balancedTraits: ['Logic + creativity', 'Multiple approaches', 'Flexible thinking', 'Adaptability', 'Holistic perspective'],
    chooseA: 'Option A',
    chooseB: 'Option B',
  },
  ja: {
    title: '左脳vs右脳テスト',
    subtitle: '思考スタイルを発見しましょう',
    progress: '問',
    result: '結果',
    retake: 'もう一度',
    leftTitle: '左脳優位タイプ',
    rightTitle: '右脳優位タイプ',
    balancedTitle: 'バランス型',
    leftDesc: 'あなたは論理的・分析的思考が強い左脳優位タイプです。体系的な計画と言語的思考に優れています。',
    rightDesc: 'あなたは直感的・創造的思考が強い右脳優位タイプです。芸術的センスと空間認知力が卓越しています。',
    balancedDesc: 'あなたは左右の脳をバランスよく活用するタイプです。論理と創造性をバランスよく持ち合わせています。',
    leftTraits: ['論理的分析', '体系的計画', '言語能力', '数学的思考', '細部への集中'],
    rightTraits: ['創造的発想', '直感と感性', '芸術的センス', '空間認知', '大局的視点'],
    balancedTraits: ['論理と創造のバランス', '多様なアプローチ', '柔軟な思考', '状況適応力', '総合的思考'],
    chooseA: '選択肢A',
    chooseB: '選択肢B',
  },
  fr: {
    title: 'Test Cerveau Gauche vs Droit',
    subtitle: 'Découvrez votre style de pensée dominant',
    progress: 'Question',
    result: 'Résultat',
    retake: 'Recommencer',
    leftTitle: 'Dominance Gauche',
    rightTitle: 'Dominance Droite',
    balancedTitle: 'Penseur Équilibré',
    leftDesc: 'Vous êtes dominant du cerveau gauche — logique et analytique. Vous excellez en planification et raisonnement verbal.',
    rightDesc: 'Vous êtes dominant du cerveau droit — intuitif et créatif. Vous avez un sens artistique et une conscience spatiale exceptionnels.',
    balancedDesc: 'Vous équilibrez les deux hémisphères. Vous combinez logique et créativité pour une pensée polyvalente.',
    leftTraits: ['Analyse logique', 'Planification', 'Aptitude verbale', 'Pensée mathématique', 'Souci du détail'],
    rightTraits: ['Idéation créative', 'Intuition', 'Sens artistique', 'Conscience spatiale', 'Vision globale'],
    balancedTraits: ['Logique + créativité', 'Approches multiples', 'Pensée flexible', 'Adaptabilité', 'Vue holistique'],
    chooseA: 'Option A',
    chooseB: 'Option B',
  },
  es: {
    title: 'Test Cerebro Izquierdo vs Derecho',
    subtitle: 'Descubre tu estilo de pensamiento dominante',
    progress: 'Pregunta',
    result: 'Resultado',
    retake: 'Repetir',
    leftTitle: 'Dominancia Izquierda',
    rightTitle: 'Dominancia Derecha',
    balancedTitle: 'Pensador Equilibrado',
    leftDesc: 'Tienes dominancia del hemisferio izquierdo — lógico y analítico. Destacas en planificación sistemática y razonamiento verbal.',
    rightDesc: 'Tienes dominancia del hemisferio derecho — intuitivo y creativo. Tienes excepcional sentido artístico y conciencia espacial.',
    balancedDesc: 'Equilibras ambos hemisferios. Combinas lógica y creatividad para un pensamiento versátil y holístico.',
    leftTraits: ['Análisis lógico', 'Planificación', 'Habilidad verbal', 'Pensamiento matemático', 'Detallista'],
    rightTraits: ['Ideación creativa', 'Intuición', 'Sentido artístico', 'Conciencia espacial', 'Visión global'],
    balancedTraits: ['Lógica + creatividad', 'Enfoques múltiples', 'Pensamiento flexible', 'Adaptabilidad', 'Perspectiva holística'],
    chooseA: 'Opción A',
    chooseB: 'Opción B',
  },
  zh: {
    title: '左脑 vs 右脑测验',
    subtitle: '发现你的主导思维风格',
    progress: '题',
    result: '结果',
    retake: '重新测验',
    leftTitle: '左脑主导型',
    rightTitle: '右脑主导型',
    balancedTitle: '均衡型',
    leftDesc: '你是左脑主导型——逻辑和分析思维强。擅长系统规划和语言推理。',
    rightDesc: '你是右脑主导型——直觉和创造思维强。具备出色的艺术感和空间意识。',
    balancedDesc: '你均衡运用两个脑半球。兼具逻辑与创意，思考全面多元。',
    leftTraits: ['逻辑分析', '系统规划', '语言能力', '数学思维', '注重细节'],
    rightTraits: ['创意发想', '直觉与感性', '艺术感', '空间认知', '宏观思考'],
    balancedTraits: ['逻辑+创意', '多元方法', '灵活思考', '适应能力', '整体视野'],
    chooseA: '选项A',
    chooseB: '选项B',
  },
};

const LeftBrainTest: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = L[locale] ?? L.en;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<('a' | 'b')[]>([]);
  const [done, setDone] = useState(false);

  const handleAnswer = (choice: 'a' | 'b') => {
    const newAnswers = [...answers, choice];
    setAnswers(newAnswers);
    if (newAnswers.length >= QUESTIONS.length) {
      setDone(true);
    } else {
      setCurrent(c => c + 1);
    }
  };

  const reset = () => {
    setCurrent(0);
    setAnswers([]);
    setDone(false);
  };

  // Calculate score
  const leftCount = answers.filter(a => a === 'a').length;
  const rightCount = answers.filter(a => a === 'b').length;
  const total = QUESTIONS.length;
  const leftPct = Math.round((leftCount / total) * 100);
  const rightPct = 100 - leftPct;

  const resultType: 'left' | 'right' | 'balanced' =
    leftPct >= 58 ? 'left' : rightPct >= 58 ? 'right' : 'balanced';

  const resultConfig = {
    left: {
      emoji: '🧠',
      accent: 'blue',
      title: t.leftTitle,
      desc: t.leftDesc,
      traits: t.leftTraits,
      barColor: 'bg-blue-500',
      badgeBg: 'bg-blue-100 text-blue-800',
      cardBg: 'bg-blue-50 border-blue-200',
    },
    right: {
      emoji: '🎨',
      accent: 'violet',
      title: t.rightTitle,
      desc: t.rightDesc,
      traits: t.rightTraits,
      barColor: 'bg-violet-500',
      badgeBg: 'bg-violet-100 text-violet-800',
      cardBg: 'bg-violet-50 border-violet-200',
    },
    balanced: {
      emoji: '⚖️',
      accent: 'emerald',
      title: t.balancedTitle,
      desc: t.balancedDesc,
      traits: t.balancedTraits,
      barColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      cardBg: 'bg-emerald-50 border-emerald-200',
    },
  }[resultType];

  if (done) {
    return (
      <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{resultConfig.emoji}</div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">{t.result}</p>
          <h2 className="text-3xl font-black">{resultConfig.title}</h2>
        </div>

        {/* Brain bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-black mb-2">
            <span className="text-blue-600">🧠 {locale === 'ko' ? '좌뇌' : 'Left'} {leftPct}%</span>
            <span className="text-violet-600">{rightPct}% {locale === 'ko' ? '우뇌' : 'Right'} 🎨</span>
          </div>
          <div className="w-full h-4 rounded-full bg-muted overflow-hidden flex">
            <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${leftPct}%` }} />
            <div className="h-full bg-violet-500 transition-all duration-700" style={{ width: `${rightPct}%` }} />
          </div>
        </div>

        <div className={`p-6 rounded-2xl border ${resultConfig.cardBg} mb-6`}>
          <p className="text-sm leading-relaxed">{resultConfig.desc}</p>
        </div>

        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Key traits</p>
          <div className="flex flex-wrap gap-2">
            {resultConfig.traits.map(trait => (
              <span key={trait} className={`px-3 py-1 rounded-full text-xs font-bold ${resultConfig.badgeBg}`}>
                {trait}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={reset}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors"
        >
          {t.retake}
        </button>
      </div>
    );
  }

  const q = QUESTIONS[current];
  const progress = ((current) / total) * 100;

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
          <span>{t.progress} {current + 1} / {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <p className="text-lg font-bold leading-relaxed">{q.text[locale]}</p>
      </div>

      {/* Choices */}
      <div className="space-y-3">
        {(['a', 'b'] as const).map(choice => (
          <button
            key={choice}
            onClick={() => handleAnswer(choice)}
            className="w-full p-5 rounded-2xl border-2 border-border bg-muted/20 hover:border-primary hover:bg-primary/5 text-left transition-all group"
          >
            <div className="flex gap-4 items-start">
              <span className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border-2 border-current transition-colors ${choice === 'a' ? 'text-blue-500' : 'text-violet-500'}`}>
                {choice.toUpperCase()}
              </span>
              <p className="text-sm leading-relaxed font-medium pt-1">
                {choice === 'a' ? q.a[locale] : q.b[locale]}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LeftBrainTest;
