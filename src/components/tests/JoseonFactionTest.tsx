import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

type FactionKey = 'dongin' | 'seoin' | 'namin' | 'bukin' | 'noron' | 'soron'

interface Question {
  id: string
  text: string
  options: { value: FactionKey; label: string }[]
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  start: string
  restart: string
  result: string
  share: string
  yourFaction: string
  traitLabel: string
  descLabel: string
  histLabel: string
  note: string
  progress: (c: number, t: number) => string
}> = {
  ko: {
    title: '조선 붕당 심리 테스트',
    subtitle: '당신이 조선 시대 관료라면 어느 붕당에 속했을까요?',
    start: '테스트 시작',
    restart: '다시 하기',
    result: '나의 붕당',
    share: '결과 공유',
    yourFaction: '당신은',
    traitLabel: '핵심 성향',
    descLabel: '특성 설명',
    histLabel: '역사적 맥락',
    note: '이 테스트는 역사적 흥미를 위한 것입니다. 실제 역사적 평가와 다를 수 있습니다.',
    progress: (c, t) => `${c} / ${t}`,
  },
  en: {
    title: 'Joseon Dynasty Faction Test',
    subtitle: 'If you were a Joseon official, which faction would you belong to?',
    start: 'Start Test',
    restart: 'Retake',
    result: 'Your Faction',
    share: 'Share Result',
    yourFaction: 'You are',
    traitLabel: 'Core Traits',
    descLabel: 'Description',
    histLabel: 'Historical Context',
    note: 'This test is for historical interest only and may differ from actual historical assessments.',
    progress: (c, t) => `${c} / ${t}`,
  },
  ja: {
    title: '朝鮮王朝派閥テスト',
    subtitle: 'あなたが朝鮮時代の官僚だったら、どの派閥に属していたでしょうか？',
    start: 'テスト開始',
    restart: 'もう一度',
    result: 'あなたの派閥',
    share: '結果を共有',
    yourFaction: 'あなたは',
    traitLabel: '核心的傾向',
    descLabel: '説明',
    histLabel: '歴史的背景',
    note: 'このテストは歴史的な興味のためのものです。実際の歴史的評価とは異なる場合があります。',
    progress: (c, t) => `${c} / ${t}`,
  },
  fr: {
    title: 'Test des Factions de la Dynastie Joseon',
    subtitle: 'Si vous étiez un fonctionnaire de Joseon, à quelle faction appartiendriez-vous ?',
    start: 'Commencer',
    restart: 'Recommencer',
    result: 'Votre Faction',
    share: 'Partager',
    yourFaction: 'Vous êtes',
    traitLabel: 'Traits principaux',
    descLabel: 'Description',
    histLabel: 'Contexte historique',
    note: 'Ce test est uniquement à des fins d\'intérêt historique.',
    progress: (c, t) => `${c} / ${t}`,
  },
  es: {
    title: 'Test de Facciones de la Dinastía Joseon',
    subtitle: '¿A qué facción pertenecerías si fueras un funcionario de Joseon?',
    start: 'Comenzar',
    restart: 'Repetir',
    result: 'Tu Facción',
    share: 'Compartir',
    yourFaction: 'Eres',
    traitLabel: 'Rasgos principales',
    descLabel: 'Descripción',
    histLabel: 'Contexto histórico',
    note: 'Este test es solo para interés histórico.',
    progress: (c, t) => `${c} / ${t}`,
  },
  zh: { title: '朝鲜王朝派系测试', subtitle: '如果你是朝鲜官员，你会属于哪个派系？', start: '开始测试', restart: '重新测试', result: '你的派系', share: '分享结果', yourFaction: '你是', traitLabel: '核心特质', descLabel: '描述', histLabel: '历史背景', note: '此测试仅供历史兴趣之用。', progress: (c, t) => `${c} / ${t}` },
}

const FACTIONS: Record<FactionKey, {
  ko: { name: string; desc: string; traits: string[]; history: string; color: string; emoji: string }
  en: { name: string; desc: string; traits: string[]; history: string; color: string; emoji: string }
}> = {
  dongin: {
    ko: { name: '동인 (東人)', desc: '학문의 순수성과 이상 사회를 꿈꾸는 원칙주의자. 도덕적 신념이 강하고 타협보다 원칙을 선택합니다.', traits: ['이상주의', '원칙 중시', '학문적', '도덕적 신념 강함'], history: '이황의 제자들 중심. 남인과 북인으로 분화되며, 정여립의 난 이후 서인에게 압박받았습니다.', color: 'blue', emoji: '📜' },
    en: { name: 'Dongin (Eastern)', desc: 'A principled idealist who dreams of scholarly purity and an ideal society. Strong moral convictions and prefers principle over compromise.', traits: ['Idealism', 'Principle-oriented', 'Scholarly', 'Strong morality'], history: 'Centered around disciples of Yi Hwang. Split into Namin and Bukin; pressured by Seoin after the Jeong Yeo-rip rebellion.', color: 'blue', emoji: '📜' },
  },
  seoin: {
    ko: { name: '서인 (西人)', desc: '현실적 효율과 체계적 질서를 중시하는 실용주의자. 논리적이고 제도 안에서 최대 성과를 추구합니다.', traits: ['현실주의', '효율적', '체계적', '논리적'], history: '이이의 제자들 중심. 노론과 소론으로 분화되며, 17세기 이후 정치 주도권을 잡았습니다.', color: 'amber', emoji: '⚖️' },
    en: { name: 'Seoin (Western)', desc: 'A pragmatist who values realistic efficiency and systematic order. Logical and seeks maximum results within established systems.', traits: ['Realism', 'Efficient', 'Systematic', 'Logical'], history: 'Centered around disciples of Yi I. Split into Noron and Soron; dominated politics after the 17th century.', color: 'amber', emoji: '⚖️' },
  },
  namin: {
    ko: { name: '남인 (南人)', desc: '학문적 깊이와 절제된 균형을 추구하는 온건파. 극단을 피하고 조화와 포용을 중시합니다.', traits: ['조화 추구', '학문적 깊이', '온건', '포용력'], history: '동인에서 분리. 숙종 시대 권력을 잡았으나 갑술환국으로 몰락. 실학자들이 많이 배출되었습니다.', color: 'green', emoji: '🌿' },
    en: { name: 'Namin (Southern)', desc: 'A moderate who seeks scholarly depth and restrained balance. Avoids extremes and values harmony and inclusivity.', traits: ['Harmony', 'Scholarly depth', 'Moderate', 'Inclusive'], history: 'Split from Dongin. Rose to power during Sukjong\'s reign but fell during the Gapsul Hwanguk. Produced many Silhak scholars.', color: 'green', emoji: '🌿' },
  },
  bukin: {
    ko: { name: '북인 (北人)', desc: '강한 실천의식과 과감한 개혁 정신을 가진 행동파. 신념에 따른 결과를 중시하고 변화를 두려워하지 않습니다.', traits: ['실천적', '개혁 정신', '단호함', '결과 지향'], history: '동인에서 분리. 광해군을 지지하며 집권했으나, 인조반정으로 몰락하여 이후 정치에서 완전히 배제되었습니다.', color: 'red', emoji: '⚡' },
    en: { name: 'Bukin (Northern)', desc: 'An activist with strong conviction and bold reformist spirit. Values results over process and embraces change.', traits: ['Action-oriented', 'Reformist', 'Decisive', 'Results-driven'], history: 'Split from Dongin. Supported King Gwanghaegun and rose to power, but fell during the Injo Coup and was permanently excluded from politics.', color: 'red', emoji: '⚡' },
  },
  noron: {
    ko: { name: '노론 (老論)', desc: '전통 질서와 정당성을 수호하는 보수파. 탄탄한 논리와 조직력으로 안정을 추구하며, 검증된 방식을 신뢰합니다.', traits: ['전통 수호', '조직적', '보수적', '안정 추구'], history: '서인에서 분리. 송시열을 중심으로 강력한 세력을 형성하고, 조선 후기 정치를 170년 이상 주도했습니다.', color: 'purple', emoji: '🏛️' },
    en: { name: 'Noron (Old Doctrine)', desc: 'A conservative who guards traditional order and legitimacy. Seeks stability through strong logic and organization; trusts proven methods.', traits: ['Tradition', 'Organized', 'Conservative', 'Stability-seeking'], history: 'Split from Seoin. Formed a strong force around Song Si-yeol and dominated late Joseon politics for over 170 years.', color: 'purple', emoji: '🏛️' },
  },
  soron: {
    ko: { name: '소론 (少論)', desc: '유연한 사고와 진보적 개방성을 가진 실용적 개혁파. 다양한 목소리를 수용하며 의미 있는 변화를 선도합니다.', traits: ['유연성', '진보적', '개방적', '실용적'], history: '서인에서 분리. 경종을 지지하며 노론에 대항했으나, 영조 시대 이후 정치적 영향력을 잃었습니다.', color: 'teal', emoji: '🌊' },
    en: { name: 'Soron (Young Doctrine)', desc: 'A pragmatic progressive with flexible thinking and openness. Embraces diverse voices and leads meaningful change.', traits: ['Flexibility', 'Progressive', 'Open-minded', 'Pragmatic'], history: 'Split from Seoin. Supported King Gyeongjong against Noron, but lost political influence after King Yeongjo\'s reign.', color: 'teal', emoji: '🌊' },
  },
}

const QUESTIONS: Record<Locale, Question[]> = {
  ko: [
    { id: 'q1', text: '팀 프로젝트에서 의견 충돌이 생겼을 때 나는?', options: [{ value: 'dongin', label: '원칙을 지켜야 한다. 타협은 나중에.' }, { value: 'seoin', label: '효율적인 방안을 찾아 빠르게 정리한다.' }, { value: 'namin', label: '양측 모두를 이해하고 중간을 찾는다.' }, { value: 'bukin', label: '과감하게 새로운 방향을 제시한다.' }] },
    { id: 'q2', text: '중요한 결정을 앞두고 나는?', options: [{ value: 'noron', label: '이전에 검증된 방법을 따른다.' }, { value: 'soron', label: '다양한 의견을 듣고 유연하게 결정한다.' }, { value: 'dongin', label: '내 신념과 일치하는 선택을 한다.' }, { value: 'bukin', label: '결과를 보고 과감히 선택한다.' }] },
    { id: 'q3', text: '나의 학습/업무 스타일은?', options: [{ value: 'dongin', label: '한 분야를 깊이 파고드는 것을 좋아한다.' }, { value: 'seoin', label: '체계를 만들고 효율적으로 진행한다.' }, { value: 'soron', label: '다양한 분야를 넘나들며 새로운 것을 탐색한다.' }, { value: 'namin', label: '균형 잡힌 시각으로 전체를 본다.' }] },
    { id: 'q4', text: '부당한 상황에 맞닥뜨렸을 때?', options: [{ value: 'dongin', label: '원칙대로 문제를 제기한다.' }, { value: 'bukin', label: '즉시 행동으로 변화를 만든다.' }, { value: 'noron', label: '기존 제도 안에서 해결 방법을 찾는다.' }, { value: 'namin', label: '충돌을 최소화하며 점진적으로 변화시킨다.' }] },
    { id: 'q5', text: '나에게 이상적인 사회/조직은?', options: [{ value: 'dongin', label: '도덕과 원칙이 지배하는 곳.' }, { value: 'seoin', label: '효율적이고 질서 있는 시스템이 있는 곳.' }, { value: 'soron', label: '다양성을 인정하고 변화를 받아들이는 곳.' }, { value: 'noron', label: '전통과 안정이 유지되는 신뢰할 수 있는 곳.' }] },
    { id: 'q6', text: '친구나 동료에 대한 나의 태도는?', options: [{ value: 'namin', label: '모두와 잘 지내려 노력한다.' }, { value: 'dongin', label: '가치관이 같은 사람들과 깊게 사귄다.' }, { value: 'bukin', label: '함께 변화를 만들 동료를 중시한다.' }, { value: 'seoin', label: '서로에게 도움이 되는 관계를 선호한다.' }] },
    { id: 'q7', text: '역사에서 더 중요한 것은?', options: [{ value: 'dongin', label: '도덕적 원칙을 지킨 인물들.' }, { value: 'bukin', label: '시대를 바꾼 개혁가들.' }, { value: 'noron', label: '사회를 안정적으로 이끈 지도자들.' }, { value: 'soron', label: '새로운 사상과 포용을 실천한 인물들.' }] },
    { id: 'q8', text: '변화와 전통 중 어느 쪽이 더 중요한가?', options: [{ value: 'noron', label: '검증된 전통이 사회의 기반이다.' }, { value: 'bukin', label: '변화 없이는 발전도 없다.' }, { value: 'namin', label: '전통과 변화의 균형이 필요하다.' }, { value: 'soron', label: '상황에 따라 유연하게 선택해야 한다.' }] },
  ],
  en: [
    { id: 'q1', text: 'When there\'s a conflict of opinions in a team project, I?', options: [{ value: 'dongin', label: 'Stand by principles. Compromise comes later.' }, { value: 'seoin', label: 'Find an efficient solution and move on quickly.' }, { value: 'namin', label: 'Understand both sides and find a middle ground.' }, { value: 'bukin', label: 'Boldly propose a new direction.' }] },
    { id: 'q2', text: 'When facing an important decision, I?', options: [{ value: 'noron', label: 'Follow previously proven methods.' }, { value: 'soron', label: 'Listen to various opinions and decide flexibly.' }, { value: 'dongin', label: 'Choose what aligns with my beliefs.' }, { value: 'bukin', label: 'Look at results and choose boldly.' }] },
    { id: 'q3', text: 'My learning/work style is?', options: [{ value: 'dongin', label: 'I like to dive deep into one area.' }, { value: 'seoin', label: 'I build systems and work efficiently.' }, { value: 'soron', label: 'I explore across various fields looking for new things.' }, { value: 'namin', label: 'I see the whole picture with a balanced perspective.' }] },
    { id: 'q4', text: 'When faced with an unfair situation?', options: [{ value: 'dongin', label: 'Raise the issue by the book.' }, { value: 'bukin', label: 'Take immediate action to create change.' }, { value: 'noron', label: 'Find solutions within the existing system.' }, { value: 'namin', label: 'Minimize conflict and change things gradually.' }] },
    { id: 'q5', text: 'My ideal society/organization is?', options: [{ value: 'dongin', label: 'Where morality and principle rule.' }, { value: 'seoin', label: 'Where there is an efficient, orderly system.' }, { value: 'soron', label: 'Where diversity is accepted and change is embraced.' }, { value: 'noron', label: 'A trustworthy place where tradition and stability are maintained.' }] },
    { id: 'q6', text: 'My attitude toward friends and colleagues?', options: [{ value: 'namin', label: 'I try to get along with everyone.' }, { value: 'dongin', label: 'I form deep connections with those who share my values.' }, { value: 'bukin', label: 'I value colleagues who will create change together.' }, { value: 'seoin', label: 'I prefer mutually beneficial relationships.' }] },
    { id: 'q7', text: 'What\'s more important in history?', options: [{ value: 'dongin', label: 'Those who upheld moral principles.' }, { value: 'bukin', label: 'Reformers who changed the times.' }, { value: 'noron', label: 'Leaders who led society stably.' }, { value: 'soron', label: 'Those who practiced new ideas and inclusivity.' }] },
    { id: 'q8', text: 'Which is more important, change or tradition?', options: [{ value: 'noron', label: 'Proven tradition is the foundation of society.' }, { value: 'bukin', label: 'No progress without change.' }, { value: 'namin', label: 'Balance between tradition and change is needed.' }, { value: 'soron', label: 'Must choose flexibly depending on the situation.' }] },
  ],
  ja: [
    { id: 'q1', text: 'チームプロジェクトで意見対立があった場合、私は？', options: [{ value: 'dongin', label: '原則を守る。妥協は後で。' }, { value: 'seoin', label: '効率的な方法を見つけて素早く解決する。' }, { value: 'namin', label: '両側を理解して中間を探す。' }, { value: 'bukin', label: '大胆に新しい方向を提示する。' }] },
    { id: 'q2', text: '重要な決断をする前に、私は？', options: [{ value: 'noron', label: '以前に検証された方法に従う。' }, { value: 'soron', label: '様々な意見を聞いて柔軟に決める。' }, { value: 'dongin', label: '自分の信念と一致する選択をする。' }, { value: 'bukin', label: '結果を見て大胆に選択する。' }] },
    { id: 'q3', text: '私の学習・仕事スタイルは？', options: [{ value: 'dongin', label: '一つの分野を深く掘り下げるのが好き。' }, { value: 'seoin', label: 'システムを作り効率的に進める。' }, { value: 'soron', label: '様々な分野を横断して新しいものを探索する。' }, { value: 'namin', label: 'バランスの取れた視点で全体を見る。' }] },
    { id: 'q4', text: '不当な状況に直面したとき？', options: [{ value: 'dongin', label: '原則に従って問題を提起する。' }, { value: 'bukin', label: '即座に行動して変化を作る。' }, { value: 'noron', label: '既存のシステムの中で解決策を見つける。' }, { value: 'namin', label: '衝突を最小化して段階的に変化させる。' }] },
    { id: 'q5', text: '私の理想的な社会・組織は？', options: [{ value: 'dongin', label: '道徳と原則が支配する場所。' }, { value: 'seoin', label: '効率的で秩序あるシステムがある場所。' }, { value: 'soron', label: '多様性を認め変化を受け入れる場所。' }, { value: 'noron', label: '伝統と安定が維持される信頼できる場所。' }] },
    { id: 'q6', text: '友人や同僚に対する私の態度は？', options: [{ value: 'namin', label: 'みんなと仲良くしようとする。' }, { value: 'dongin', label: '価値観が同じ人と深く付き合う。' }, { value: 'bukin', label: '一緒に変化を作る仲間を重視する。' }, { value: 'seoin', label: 'お互いに有益な関係を好む。' }] },
    { id: 'q7', text: '歴史でより重要なものは？', options: [{ value: 'dongin', label: '道徳的原則を守った人物たち。' }, { value: 'bukin', label: '時代を変えた改革者たち。' }, { value: 'noron', label: '社会を安定的に導いたリーダーたち。' }, { value: 'soron', label: '新しい思想と包容を実践した人物たち。' }] },
    { id: 'q8', text: '変化と伝統、どちらがより重要か？', options: [{ value: 'noron', label: '検証された伝統が社会の基盤だ。' }, { value: 'bukin', label: '変化なくして発展もない。' }, { value: 'namin', label: '伝統と変化のバランスが必要だ。' }, { value: 'soron', label: '状況に応じて柔軟に選択すべきだ。' }] },
  ],
  fr: [
    { id: 'q1', text: 'Face à un conflit dans un projet d\'équipe, je ?', options: [{ value: 'dongin', label: 'Défends les principes. Le compromis viendra plus tard.' }, { value: 'seoin', label: 'Trouve une solution efficace et avance.' }, { value: 'namin', label: 'Comprends les deux parties et trouve un juste milieu.' }, { value: 'bukin', label: 'Propose audacieusement une nouvelle direction.' }] },
    { id: 'q2', text: 'Face à une décision importante, je ?', options: [{ value: 'noron', label: 'Suis les méthodes déjà éprouvées.' }, { value: 'soron', label: 'Écoute diverses opinions et décide avec souplesse.' }, { value: 'dongin', label: 'Choisis ce qui correspond à mes convictions.' }, { value: 'bukin', label: 'Regarde les résultats et choisis avec audace.' }] },
    { id: 'q3', text: 'Mon style d\'apprentissage/travail est ?', options: [{ value: 'dongin', label: 'J\'aime approfondir un seul domaine.' }, { value: 'seoin', label: 'Je construis des systèmes et travaille efficacement.' }, { value: 'soron', label: 'J\'explore divers domaines à la recherche de nouveauté.' }, { value: 'namin', label: 'Je vois l\'ensemble avec une perspective équilibrée.' }] },
    { id: 'q4', text: 'Face à une situation injuste ?', options: [{ value: 'dongin', label: 'Je soulève le problème selon les règles.' }, { value: 'bukin', label: 'J\'agis immédiatement pour créer du changement.' }, { value: 'noron', label: 'Je cherche des solutions dans le système existant.' }, { value: 'namin', label: 'Je minimise les conflits et change graduellement.' }] },
    { id: 'q5', text: 'Ma société/organisation idéale est ?', options: [{ value: 'dongin', label: 'Là où règnent la morale et les principes.' }, { value: 'seoin', label: 'Là où il y a un système efficace et ordonné.' }, { value: 'soron', label: 'Là où la diversité est reconnue et le changement accepté.' }, { value: 'noron', label: 'Un endroit fiable où tradition et stabilité sont maintenues.' }] },
    { id: 'q6', text: 'Mon attitude envers amis et collègues ?', options: [{ value: 'namin', label: 'J\'essaie de bien m\'entendre avec tout le monde.' }, { value: 'dongin', label: 'Je me lie profondément avec ceux qui partagent mes valeurs.' }, { value: 'bukin', label: 'Je valorise les collègues qui créeront le changement ensemble.' }, { value: 'seoin', label: 'Je préfère les relations mutuellement bénéfiques.' }] },
    { id: 'q7', text: 'Qu\'est-ce qui est le plus important dans l\'histoire ?', options: [{ value: 'dongin', label: 'Ceux qui ont défendu les principes moraux.' }, { value: 'bukin', label: 'Les réformateurs qui ont changé leur époque.' }, { value: 'noron', label: 'Les dirigeants qui ont guidé stablement la société.' }, { value: 'soron', label: 'Ceux qui ont pratiqué de nouvelles idées et l\'inclusion.' }] },
    { id: 'q8', text: 'Changement ou tradition, lequel est le plus important ?', options: [{ value: 'noron', label: 'La tradition éprouvée est le fondement de la société.' }, { value: 'bukin', label: 'Sans changement, pas de progrès.' }, { value: 'namin', label: 'Un équilibre entre tradition et changement est nécessaire.' }, { value: 'soron', label: 'Doit choisir avec souplesse selon la situation.' }] },
  ],
  es: [
    { id: 'q1', text: 'Ante un conflicto en un proyecto de equipo, yo ?', options: [{ value: 'dongin', label: 'Defiendo los principios. El compromiso viene después.' }, { value: 'seoin', label: 'Encuentro una solución eficiente y sigo adelante.' }, { value: 'namin', label: 'Entiendo ambas partes y busco un término medio.' }, { value: 'bukin', label: 'Propongo audazmente una nueva dirección.' }] },
    { id: 'q2', text: 'Al enfrentar una decisión importante, yo ?', options: [{ value: 'noron', label: 'Sigo métodos ya probados.' }, { value: 'soron', label: 'Escucho diversas opiniones y decido con flexibilidad.' }, { value: 'dongin', label: 'Elijo lo que se alinea con mis convicciones.' }, { value: 'bukin', label: 'Miro los resultados y elijo con audacia.' }] },
    { id: 'q3', text: 'Mi estilo de aprendizaje/trabajo es ?', options: [{ value: 'dongin', label: 'Me gusta profundizar en un área.' }, { value: 'seoin', label: 'Construyo sistemas y trabajo eficientemente.' }, { value: 'soron', label: 'Exploro varios campos buscando cosas nuevas.' }, { value: 'namin', label: 'Veo el conjunto con una perspectiva equilibrada.' }] },
    { id: 'q4', text: 'Ante una situación injusta ?', options: [{ value: 'dongin', label: 'Planteo el problema según las reglas.' }, { value: 'bukin', label: 'Actúo inmediatamente para crear cambio.' }, { value: 'noron', label: 'Busco soluciones dentro del sistema existente.' }, { value: 'namin', label: 'Minimizo conflictos y cambio gradualmente.' }] },
    { id: 'q5', text: 'Mi sociedad/organización ideal es ?', options: [{ value: 'dongin', label: 'Donde rigen la moral y los principios.' }, { value: 'seoin', label: 'Donde hay un sistema eficiente y ordenado.' }, { value: 'soron', label: 'Donde se reconoce la diversidad y se acepta el cambio.' }, { value: 'noron', label: 'Un lugar confiable donde se mantienen la tradición y estabilidad.' }] },
    { id: 'q6', text: 'Mi actitud hacia amigos y colegas ?', options: [{ value: 'namin', label: 'Intento llevarme bien con todos.' }, { value: 'dongin', label: 'Me relaciono profundamente con los que comparten mis valores.' }, { value: 'bukin', label: 'Valoro a los colegas que crearán cambio juntos.' }, { value: 'seoin', label: 'Prefiero relaciones mutuamente beneficiosas.' }] },
    { id: 'q7', text: '¿Qué es más importante en la historia?', options: [{ value: 'dongin', label: 'Los que defendieron los principios morales.' }, { value: 'bukin', label: 'Los reformadores que cambiaron su época.' }, { value: 'noron', label: 'Los líderes que guiaron establemente la sociedad.' }, { value: 'soron', label: 'Los que practicaron nuevas ideas e inclusividad.' }] },
    { id: 'q8', text: '¿Cambio o tradición, cuál es más importante?', options: [{ value: 'noron', label: 'La tradición probada es el fundamento de la sociedad.' }, { value: 'bukin', label: 'Sin cambio, no hay progreso.' }, { value: 'namin', label: 'Se necesita un equilibrio entre tradición y cambio.' }, { value: 'soron', label: 'Debe elegirse con flexibilidad según la situación.' }] },
  ],
  zh: [
    { id: 'q1', text: '在团队项目中出现意见冲突时，我？', options: [{ value: 'dongin', label: '坚守原则。妥协之后再说。' }, { value: 'seoin', label: '找到有效方案快速解决。' }, { value: 'namin', label: '理解双方并找到中间立场。' }, { value: 'bukin', label: '大胆提出新方向。' }] },
    { id: 'q2', text: '面临重要决策时，我？', options: [{ value: 'noron', label: '遵循已验证的方法。' }, { value: 'soron', label: '听取各种意见灵活决策。' }, { value: 'dongin', label: '选择与信念一致的方向。' }, { value: 'bukin', label: '看结果大胆选择。' }] },
    { id: 'q3', text: '我的学习/工作风格是？', options: [{ value: 'dongin', label: '喜欢深入钻研一个领域。' }, { value: 'seoin', label: '建立系统高效推进。' }, { value: 'soron', label: '跨越各个领域探索新事物。' }, { value: 'namin', label: '以均衡视角看待全局。' }] },
    { id: 'q4', text: '面对不公正情况时？', options: [{ value: 'dongin', label: '按规则提出问题。' }, { value: 'bukin', label: '立即行动创造变化。' }, { value: 'noron', label: '在现有制度内寻找解决方案。' }, { value: 'namin', label: '减少冲突渐进式推动变化。' }] },
    { id: 'q5', text: '我理想中的社会/组织是？', options: [{ value: 'dongin', label: '道德与原则主导的地方。' }, { value: 'seoin', label: '有高效有序系统的地方。' }, { value: 'soron', label: '认可多元性并接受变化的地方。' }, { value: 'noron', label: '维护传统与稳定值得信赖的地方。' }] },
    { id: 'q6', text: '我对朋友和同事的态度是？', options: [{ value: 'namin', label: '努力与所有人相处融洽。' }, { value: 'dongin', label: '与价值观相同的人深交。' }, { value: 'bukin', label: '重视能共同创造变化的伙伴。' }, { value: 'seoin', label: '偏好互利互惠的关系。' }] },
    { id: 'q7', text: '历史上更重要的是？', options: [{ value: 'dongin', label: '坚守道德原则的人。' }, { value: 'bukin', label: '改变时代的改革者。' }, { value: 'noron', label: '稳定引领社会的领导者。' }, { value: 'soron', label: '实践新思想与包容的人。' }] },
    { id: 'q8', text: '变革与传统哪个更重要？', options: [{ value: 'noron', label: '经过验证的传统是社会基础。' }, { value: 'bukin', label: '没有变化就没有进步。' }, { value: 'namin', label: '需要传统与变革的均衡。' }, { value: 'soron', label: '应根据情况灵活选择。' }] },
  ],
}

const COLORS: Record<string, string> = {
  blue: 'bg-blue-100 border-blue-300 text-blue-800',
  amber: 'bg-amber-100 border-amber-300 text-amber-800',
  green: 'bg-green-100 border-green-300 text-green-800',
  red: 'bg-red-100 border-red-300 text-red-800',
  purple: 'bg-purple-100 border-purple-300 text-purple-800',
  teal: 'bg-teal-100 border-teal-300 text-teal-800',
}

interface Props { locale: Locale }

export default function JoseonFactionTest({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const questions = QUESTIONS[locale] ?? QUESTIONS.en
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [scores, setScores] = useState<Record<FactionKey, number>>({ dongin: 0, seoin: 0, namin: 0, bukin: 0, noron: 0, soron: 0 })
  const [result, setResult] = useState<FactionKey | null>(null)

  const choose = (val: FactionKey) => {
    const next = { ...scores, [val]: scores[val] + 1 }
    setScores(next)
    if (current + 1 < questions.length) {
      setCurrent(current + 1)
    } else {
      const top = (Object.keys(next) as FactionKey[]).reduce((a, b) => next[a] >= next[b] ? a : b)
      setResult(top)
    }
  }

  const restart = () => { setStarted(false); setCurrent(0); setScores({ dongin: 0, seoin: 0, namin: 0, bukin: 0, noron: 0, soron: 0 }); setResult(null) }

  const isKo = locale === 'ko'
  const faction = result ? FACTIONS[result] : null
  const fd = faction ? (isKo ? faction.ko : faction.en) : null

  if (!started) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-5xl">🏯</div>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        <p className="text-muted-foreground">{l.subtitle}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-sm">
          {(Object.keys(FACTIONS) as FactionKey[]).map(k => {
            const f = isKo ? FACTIONS[k].ko : FACTIONS[k].en
            return (
              <div key={k} className={`rounded-xl border p-2.5 ${COLORS[f.color]}`}>
                <span className="mr-1">{f.emoji}</span>{f.name}
              </div>
            )
          })}
        </div>
        <button onClick={() => setStarted(true)} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors">
          {l.start}
        </button>
      </div>
    )
  }

  if (result && fd) {
    const f = isKo ? FACTIONS[result].ko : FACTIONS[result].en
    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <div className="text-5xl mb-3">{f.emoji}</div>
          <p className="text-sm text-muted-foreground mb-1">{l.yourFaction}</p>
          <h2 className={`text-2xl font-bold px-4 py-2 rounded-xl inline-block border ${COLORS[f.color]}`}>{f.name}</h2>
        </div>
        <div className={`rounded-2xl border p-5 ${COLORS[f.color]}`}>
          <p className="font-medium">{fd.desc}</p>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">{l.traitLabel}</h3>
            <div className="flex flex-wrap gap-2">
              {fd.traits.map(t => <span key={t} className="px-3 py-1 bg-secondary rounded-full text-sm">{t}</span>)}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">{l.histLabel}</h3>
            <p className="text-sm text-muted-foreground">{fd.history}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center border-t pt-4">{l.note}</p>
        <button onClick={restart} className="w-full py-3 border rounded-xl text-sm font-medium hover:bg-accent transition-colors">
          {l.restart}
        </button>
      </div>
    )
  }

  const q = questions[current]
  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{l.progress(current + 1, questions.length)}</span>
        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="text-center py-4">
        <p className="text-lg font-semibold">{q.text}</p>
      </div>
      <div className="space-y-3">
        {q.options.map(opt => (
          <button key={opt.value} onClick={() => choose(opt.value)}
            className="w-full text-left px-5 py-4 rounded-xl border hover:bg-accent hover:border-primary transition-all text-sm font-medium">
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
