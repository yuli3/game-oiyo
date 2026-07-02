import { useState } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

const LABELS: Record<Locale, {
  title: string; subtitle: string; desc: string;
  questionOf: (c: number, t: number) => string;
  scaleLabels: [string, string, string, string, string];
  restart: string; yourScore: string; level: string;
  note: string; resultTitle: Record<'high' | 'medium' | 'low', string>;
  resultDesc: Record<'high' | 'medium' | 'low', string>;
  traits: Record<'high' | 'medium' | 'low', string[]>;
  dimensions: Record<string, string>;
  dimScore: string;
}> = {
  ko: {
    title: 'HSP 민감성 테스트', subtitle: 'Highly Sensitive Person Test',
    desc: 'Elaine Aron 박사의 HSP 이론에 기반한 20문항 자기 진단입니다. 평소 자신의 성향과 얼마나 일치하는지 솔직하게 답해주세요.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아니다', '약간 그렇다', '보통이다', '매우 그렇다', '극도로 그렇다'],
    restart: '다시 하기', yourScore: '내 점수', level: '민감성 수준',
    note: '이 테스트는 자기 인식을 위한 참고 도구이며, 전문적 진단을 대체하지 않습니다.',
    resultTitle: { high: '고감각자(HSP)', medium: '중간 감각자', low: '강인한 감각자' },
    resultDesc: {
      high: '당신은 세상을 깊고 섬세하게 처리하는 고감각자입니다. 예술·음악·자연에서 감동을 잘 받으며, 타인의 감정에 공감하는 능력이 뛰어납니다. 다만, 자극이 넘칠 때는 충전 시간이 필요합니다.',
      medium: '당신은 상황에 따라 유연하게 반응하는 균형 잡힌 감각 체계를 가지고 있습니다. 섬세함과 강인함을 두루 갖추었습니다.',
      low: '당신은 환경의 변화에 쉽게 흔들리지 않는 강인한 신경계를 가지고 있습니다. 빠른 페이스와 다양한 자극 속에서도 침착하게 대처합니다.',
    },
    traits: {
      high: ['자극에 민감하고 깊이 처리', '예술·음악에서 강한 감동', '타인 감정 공감 능력 탁월', '충전 시간이 자기 관리에 필수'],
      medium: ['상황에 따라 유연한 감각 조절', '특정 자극에만 반응이 강함', '사회적 상황에서 균형 유지'],
      low: ['자극에 잘 흔들리지 않음', '바쁜 환경에서 에너지 유지', '새로운 상황에 빠르게 적응'],
    },
    dimensions: { D: '깊은 처리', O: '과잉 자극', E: '감정 반응', S: '미묘한 감지' },
    dimScore: '점',
  },
  en: {
    title: 'HSP Sensitivity Test', subtitle: 'Highly Sensitive Person Test',
    desc: 'A 20-question self-assessment based on Dr. Elaine Aron\'s HSP theory. Answer honestly based on how you usually feel.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not at all', 'Slightly', 'Moderately', 'Very much', 'Extremely'],
    restart: 'Retake', yourScore: 'Your Score', level: 'Sensitivity Level',
    note: 'This test is a self-awareness tool and does not replace professional diagnosis.',
    resultTitle: { high: 'Highly Sensitive Person (HSP)', medium: 'Moderately Sensitive', low: 'Low Sensitivity' },
    resultDesc: {
      high: 'You are a Highly Sensitive Person who processes the world deeply and thoroughly. You are easily moved by art, music, and nature, and have a strong capacity for empathy. You may need downtime to recharge when overstimulated.',
      medium: 'You have a balanced sensory system that flexes with context — bringing sensitivity when needed and resilience when required.',
      low: 'You have a robust nervous system that is rarely overwhelmed. You thrive in fast-paced, high-stimulus environments and adapt quickly to new situations.',
    },
    traits: {
      high: ['Process stimuli deeply', 'Moved by art, music & beauty', 'Strong empathy for others', 'Need alone time to recharge'],
      medium: ['Flexible sensory regulation', 'Strong reactions to specific triggers', 'Balanced in social situations'],
      low: ['Not easily overwhelmed', 'Sustain energy in busy environments', 'Adapt quickly to new situations'],
    },
    dimensions: { D: 'Depth of Processing', O: 'Overstimulation', E: 'Emotional Reactivity', S: 'Sensing Subtleties' },
    dimScore: 'pts',
  },
  ja: {
    title: 'HSP 感受性テスト', subtitle: 'Highly Sensitive Person Test',
    desc: 'エレイン・アーロン博士のHSP理論に基づく20問の自己診断です。普段の自分に正直に答えてください。',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', '少しある', 'ある程度', 'とてもある', '非常に強い'],
    restart: 'もう一度', yourScore: 'スコア', level: '感受性レベル',
    note: 'このテストは自己認識のための参考であり、専門的診断の代替ではありません。',
    resultTitle: { high: '高感受性者（HSP）', medium: '中程度の感受性', low: '低感受性' },
    resultDesc: {
      high: 'あなたは世界を深く丁寧に処理する高感受性者です。芸術・音楽・自然に感動しやすく、他人の感情に共感する能力が高いです。過刺激時は充電時間が必要です。',
      medium: '状況に応じて柔軟に感受性を調整できるバランスの取れた感覚体系を持っています。',
      low: 'あなたはストレスに強い神経系を持っています。忙しい環境でもエネルギーを維持し、新しい状況にすばやく適応します。',
    },
    traits: {
      high: ['刺激を深く処理する', '芸術・音楽・自然に感動しやすい', '強い共感力', '充電のための一人の時間が必要'],
      medium: ['状況に応じた柔軟な調整', '特定の刺激に強く反応', '社会場面でのバランス'],
      low: ['圧倒されにくい', '忙しい環境でのエネルギー維持', '新状況への素早い適応'],
    },
    dimensions: { D: '深い処理', O: '過刺激', E: '感情反応', S: '繊細な感知' },
    dimScore: '点',
  },
  fr: {
    title: 'Test de sensibilité HSP', subtitle: 'Highly Sensitive Person Test',
    desc: 'Auto-évaluation de 20 questions basée sur la théorie HSP du Dr Elaine Aron. Répondez honnêtement selon votre ressenti habituel.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Pas du tout', 'Légèrement', 'Modérément', 'Très', 'Extrêmement'],
    restart: 'Recommencer', yourScore: 'Votre score', level: 'Niveau de sensibilité',
    note: 'Ce test est un outil de connaissance de soi et ne remplace pas un diagnostic professionnel.',
    resultTitle: { high: 'Personne hautement sensible (HSP)', medium: 'Sensibilité modérée', low: 'Faible sensibilité' },
    resultDesc: {
      high: 'Vous êtes une personne hautement sensible qui traite profondément le monde. L\'art, la musique et la nature vous touchent facilement, et votre empathie est remarquable. Vous avez besoin de temps de recharge.',
      medium: 'Vous disposez d\'un système sensoriel équilibré qui s\'adapte selon le contexte, alliant sensibilité et résilience.',
      low: 'Votre système nerveux est robuste et rarement submergé. Vous prospérez dans des environnements rythmés et vous adaptez rapidement.',
    },
    traits: {
      high: ['Traitement profond des stimuli', 'Ému par l\'art, la musique, la beauté', 'Forte empathie', 'Besoin de temps seul pour recharger'],
      medium: ['Régulation sensorielle flexible', 'Réactions fortes à certains déclencheurs', 'Équilibre en situations sociales'],
      low: ['Rarement submergé', 'Énergie soutenue dans les environnements actifs', 'Adaptation rapide'],
    },
    dimensions: { D: 'Traitement en profondeur', O: 'Surstimulation', E: 'Réactivité émotionnelle', S: 'Détection des subtilités' },
    dimScore: 'pts',
  },
  es: {
    title: 'Test de sensibilidad HSP', subtitle: 'Highly Sensitive Person Test',
    desc: 'Autoevaluación de 20 preguntas basada en la teoría HSP de la Dra. Elaine Aron. Responde honestamente según cómo te sientes habitualmente.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Para nada', 'Ligeramente', 'Moderadamente', 'Mucho', 'Extremadamente'],
    restart: 'Repetir', yourScore: 'Tu puntuación', level: 'Nivel de sensibilidad',
    note: 'Este test es una herramienta de autoconocimiento y no reemplaza un diagnóstico profesional.',
    resultTitle: { high: 'Persona altamente sensible (HSP)', medium: 'Sensibilidad moderada', low: 'Baja sensibilidad' },
    resultDesc: {
      high: 'Eres una persona altamente sensible que procesa el mundo de forma profunda. El arte, la música y la naturaleza te emocionan fácilmente, y tu empatía es notable. Necesitas tiempo de recarga.',
      medium: 'Tienes un sistema sensorial equilibrado que se adapta al contexto, combinando sensibilidad y resiliencia.',
      low: 'Tu sistema nervioso es robusto y rara vez se ve desbordado. Prosperas en entornos dinámicos y te adaptas rápidamente.',
    },
    traits: {
      high: ['Procesas los estímulos profundamente', 'Te mueve el arte, la música, la belleza', 'Fuerte empatía', 'Necesitas tiempo a solas para recargar'],
      medium: ['Regulación sensorial flexible', 'Reacciones fuertes a ciertos desencadenantes', 'Equilibrio en situaciones sociales'],
      low: ['Difícilmente te abruman las situaciones', 'Mantienes energía en entornos activos', 'Adaptación rápida'],
    },
    dimensions: { D: 'Procesamiento profundo', O: 'Sobreestimulación', E: 'Reactividad emocional', S: 'Detección de sutilezas' },
    dimScore: 'pts',
  },
  zh: {
    title: 'HSP 高敏感人格测验', subtitle: 'Highly Sensitive Person Test',
    desc: '基于Elaine Aron博士HSP理论的20题自我评估。请根据平时的真实感受诚实作答。',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['完全不符', '略为符合', '适中', '非常符合', '极度符合'],
    restart: '重新测验', yourScore: '我的分数', level: '敏感度等级',
    note: '本测验为自我认识工具，不代替专业诊断。',
    resultTitle: { high: '高敏感人格（HSP）', medium: '中等敏感', low: '低敏感' },
    resultDesc: {
      high: '你是一位高敏感人格者，对世界有深度且细腻的感知。容易被艺术、音乐和自然打动，同理心强。过度刺激后需要充电时间。',
      medium: '你拥有灵活均衡的感知系统，能根据情境调整敏感度，兼具细腻与坚韧。',
      low: '你的神经系统强健，不易被外界压倒。在繁忙多变的环境中也能保持活力、快速适应。',
    },
    traits: {
      high: ['深度处理感官刺激', '容易被艺术音乐打动', '强烈的同理心', '需要独处时间充电'],
      medium: ['灵活的感觉调节', '对特定刺激反应强烈', '社交场合能保持平衡'],
      low: ['不易被压倒', '繁忙环境中保持能量', '快速适应新环境'],
    },
    dimensions: { D: '深度处理', O: '过度刺激', E: '情绪反应', S: '微妙感知' },
    dimScore: '分',
  },
};

type Dimension = 'D' | 'O' | 'E' | 'S';
interface Question { id: string; dim: Dimension; text: Record<Locale, string> }

const QUESTIONS: Question[] = [
  // D — Depth of Processing (5 questions)
  { id: 'q1', dim: 'D', text: { ko: '나는 풍부하고 복잡한 내면 세계를 가지고 있다.', en: 'I have a rich, complex inner life.', ja: '私は豊かで複雑な内面を持っています。', fr: "J'ai une vie intérieure riche et complexe.", es: 'Tengo una vida interior rica y compleja.', zh: '我有丰富而复杂的内心世界。', } },
  { id: 'q2', dim: 'D', text: { ko: '결정을 내리기 전에 오래 생각하고 심층적으로 처리하는 편이다.', en: 'I take time to reflect and process information deeply before making decisions.', ja: '決断の前に深く考え、時間をかけて処理します。', fr: 'Je prends le temps de réfléchir profondément avant de prendre des décisions.', es: 'Me tomo tiempo para reflexionar profundamente antes de tomar decisiones.', zh: '做决定前我喜欢深思熟虑、仔细处理信息。', } },
  { id: 'q3', dim: 'D', text: { ko: '나는 예술이나 음악에 깊은 감동을 받는다.', en: 'I am deeply moved by the arts or music.', ja: '私は芸術や音楽に深く感動します。', fr: 'Je suis profondément ému par les arts ou la musique.', es: 'Me conmueven profundamente las artes o la música.', zh: '我深受艺术或音乐的感动。', } },
  { id: 'q4', dim: 'D', text: { ko: '나는 일이나 삶에서 의미와 연결을 깊이 탐구한다.', en: 'I find myself deeply exploring meaning and connections in work and life.', ja: '仕事や生活の中で意味とつながりを深く探求します。', fr: "J'explore profondément le sens et les connexions dans mon travail et ma vie.", es: 'Exploro profundamente el significado y las conexiones en mi trabajo y vida.', zh: '我喜欢深入探索工作和生活中的意义与联系。', } },
  { id: 'q5', dim: 'D', text: { ko: '나는 어릴 때 어른들로부터 "너무 예민하다" 또는 "너무 수줍음이 많다"는 말을 들은 적이 있다.', en: 'As a child, adults considered me sensitive or shy.', ja: '子供の頃、大人から繊細または内気と言われたことがある。', fr: "Enfant, les adultes me considéraient comme sensible ou timide.", es: 'De niño/a, los adultos me consideraban sensible o tímido/a.', zh: '小时候，大人觉得我很敏感或害羞。', } },

  // O — Overstimulation (5 questions)
  { id: 'q6', dim: 'O', text: { ko: '나는 강한 감각 자극(소음, 밝은 빛, 혼잡함)에 쉽게 압도된다.', en: 'I am easily overwhelmed by strong sensory input (noise, bright lights, crowds).', ja: '強い感覚刺激（騒音・明るい光・混雑）に圧倒されやすい。', fr: 'Je suis facilement submergé par les stimuli forts (bruit, lumière, foule).', es: 'Me abruman fácilmente los estímulos fuertes (ruido, luces, aglomeraciones).', zh: '強烈的感官刺激（噪音、亮光、擁擠）很容易讓我不知所措。', } },
  { id: 'q7', dim: 'O', text: { ko: '한 번에 많은 일을 처리해야 할 때 혼란스럽고 불편하다.', en: 'I get uncomfortable when asked to do many things at once.', ja: '一度に多くのことをするよう求められると不快になります。', fr: 'Je me sens mal à l\'aise quand on me demande de faire trop de choses à la fois.', es: 'Me incomoda que me pidan hacer demasiadas cosas a la vez.', zh: '被要求同时做很多事情时，我会感到不安和混乱。', } },
  { id: 'q8', dim: 'O', text: { ko: '바쁜 날이 지속되면 혼자만의 시간이 꼭 필요하다.', en: 'After a busy day I need to retreat to a private place to recover.', ja: '忙しい日が続くと、必ず一人になる時間が必要です。', fr: "Après une journée chargée, j'ai besoin de me retirer seul(e) pour récupérer.", es: 'Después de un día agitado necesito tiempo a solas para recuperarme.', zh: '繁忙的日子后，我一定需要独处时间来恢复精力。', } },
  { id: 'q9', dim: 'O', text: { ko: '시간적 압박이나 마감이 있을 때 불안하고 성과가 떨어진다.', en: 'I get rattled when I have a lot to do in a short amount of time.', ja: '短時間に多くのことをしなければならないときに動揺します。', fr: 'Je me déstabilise quand j\'ai beaucoup à faire en peu de temps.', es: 'Me pongo nervioso/a cuando tengo mucho que hacer en poco tiempo.', zh: '在有时间压力或截止日期时，我容易焦虑，表现也会下降。', } },
  { id: 'q10', dim: 'O', text: { ko: '타인의 관찰 아래 수행(발표, 연주 등)을 할 때 평소보다 더 긴장한다.', en: 'When being watched or evaluated I get nervous and perform worse than usual.', ja: '見られたり評価されると緊張して普段より出来が悪くなります。', fr: 'Quand je suis observé(e) ou évalué(e), je stresse et performe moins bien.', es: 'Cuando me observan o evalúan, me pongo nervioso/a y rindo menos que de costumbre.', zh: '在被观察或评估时（如演讲、表演），我会比平时更紧张。', } },

  // E — Emotional Reactivity (5 questions)
  { id: 'q11', dim: 'E', text: { ko: '다른 사람들의 기분이나 감정에 쉽게 영향을 받는다.', en: 'I am easily affected by other people\'s moods.', ja: '他人の気分や感情に影響されやすいです。', fr: 'Je suis facilement affecté(e) par l\'humeur des autres.', es: 'Me afecta fácilmente el estado de ánimo de los demás.', zh: '我很容易受到他人情緒或心情的影響。', } },
  { id: 'q12', dim: 'E', text: { ko: '공감 능력이 뛰어나 타인의 고통을 내 것처럼 느끼는 경우가 많다.', en: 'I often feel others\' pain or discomfort as if it were my own.', ja: '他人の痛みや不快感を自分のことのように感じることがよくあります。', fr: 'Je ressens souvent la douleur des autres comme si c\'était la mienne.', es: 'A menudo siento el dolor ajeno como si fuera el mío.', zh: '我經常把別人的痛苦感受為自己的痛苦。', } },
  { id: 'q13', dim: 'E', text: { ko: '거친 영화, 폭력적 장면, 뉴스 등을 접할 때 심하게 불편함을 느낀다.', en: 'Violent movies, shocking news or graphic scenes bother me more than most people.', ja: '暴力的な映画やショッキングなニュースに他人より強く不快感を覚えます。', fr: 'Les films violents, les nouvelles choquantes m\'affectent plus que la plupart des gens.', es: 'Las películas violentas y las noticias impactantes me afectan más que a la mayoría.', zh: '暴力电影、冲击性新闻或残暴画面让我感到比大多数人更不舒服。', } },
  { id: 'q14', dim: 'E', text: { ko: '아름다운 것(자연, 예술, 음악)을 만날 때 눈물이 날 만큼 감동을 받는 경우가 있다.', en: 'Beautiful things — nature, art, music — sometimes move me to tears.', ja: '自然・芸術・音楽など美しいものに涙が出るほど感動することがあります。', fr: 'La beauté — nature, art, musique — me touche parfois jusqu\'aux larmes.', es: 'La belleza — naturaleza, arte, música — a veces me emociona hasta las lágrimas.', zh: '美丽的事物（自然、艺术、音乐）有时会令我感动到流泪。', } },
  { id: 'q15', dim: 'E', text: { ko: '나는 감정의 기복이 크고, 감정을 조절하는 데 에너지가 많이 든다.', en: 'I have a lot of emotional ups and downs, and managing my feelings takes significant energy.', ja: '感情の波が激しく、感情のコントロールにエネルギーを要します。', fr: 'J\'ai de nombreux hauts et bas émotionnels et gérer mes émotions demande beaucoup d\'énergie.', es: 'Tengo muchos altibajos emocionales y gestionar mis sentimientos me consume mucha energía.', zh: '我的情緒起伏較大，需要消耗大量精力來管理情緒。', } },

  // S — Sensing Subtleties (5 questions)
  { id: 'q16', dim: 'S', text: { ko: '나는 환경의 미묘한 변화(냄새, 소리, 질감)를 잘 알아차린다.', en: 'I notice subtle changes in my environment (smells, sounds, textures).', ja: '環境の微妙な変化（匂い、音、質感）によく気づきます。', fr: 'Je remarque les changements subtils dans mon environnement (odeurs, sons, textures).', es: 'Noto cambios sutiles en mi entorno (olores, sonidos, texturas).', zh: '我能察觉到环境中细微的变化（气味、声音、质感）。', } },
  { id: 'q17', dim: 'S', text: { ko: '다른 사람의 표정이나 목소리 톤에서 미묘한 변화를 잘 감지한다.', en: 'I pick up on subtle changes in facial expressions and tone of voice.', ja: '表情や声のトーンのわずかな変化に気づきます。', fr: 'Je perçois les changements subtils dans les expressions faciales et le ton de voix.', es: 'Detecto cambios sutiles en las expresiones faciales y el tono de voz.', zh: '我能感知到他人表情或语气中细微的变化。', } },
  { id: 'q18', dim: 'S', text: { ko: '불편한 옷감이나 이음매가 신경 쓰여 집중하기 어렵다.', en: 'Uncomfortable clothing fabrics or seams distract me from concentrating.', ja: '不快な生地や縫い目が気になり、集中するのが難しいです。', fr: 'Les tissus ou coutures inconfortables me déconcentrent.', es: 'Las telas o costuras incómodas me distraen y me resulta difícil concentrarme.', zh: '令人不舒服的布料或缝线让我难以集中注意力。', } },
  { id: 'q19', dim: 'S', text: { ko: '나는 공간의 분위기나 에너지를 다른 사람보다 더 민감하게 느낀다.', en: 'I sense the atmosphere or energy of a room more keenly than most people.', ja: '部屋の雰囲気やエネルギーを他の人より敏感に感じます。', fr: 'Je ressens l\'atmosphère ou l\'énergie d\'un espace plus vivement que la plupart.', es: 'Percibo el ambiente o la energía de un lugar de forma más aguda que la mayoría.', zh: '我比大多数人更能感受到空间的氛围和能量。', } },
  { id: 'q20', dim: 'S', text: { ko: '배고픔이나 피로가 쌓이면 다른 사람에 비해 기분이나 집중력이 더 크게 영향을 받는다.', en: 'When hungry or tired, my mood and concentration deteriorate more than for most people.', ja: '空腹や疲労時は他の人より気分や集中力に大きく影響します。', fr: 'Quand j\'ai faim ou suis fatigué(e), mon humeur et ma concentration se dégradent plus que chez la plupart.', es: 'Cuando tengo hambre o estoy cansado/a, mi estado de ánimo y concentración se deterioran más que en la mayoría.', zh: '饥饿或疲劳时，我的心情和注意力比大多数人受到更大影响。', } },
];

const SCALE = [1, 2, 3, 4, 5] as const;

function calcLevel(total: number): 'high' | 'medium' | 'low' {
  const pct = total / (QUESTIONS.length * 5);
  if (pct >= 0.65) return 'high';
  if (pct >= 0.40) return 'medium';
  return 'low';
}

const LEVEL_COLORS = {
  high: 'from-amber-500 to-orange-500',
  medium: 'from-emerald-500 to-teal-500',
  low: 'from-blue-500 to-cyan-500',
};

export default function HspTest({ locale = 'en' }: { locale?: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const current = Object.keys(answers).length;

  const handleAnswer = (id: string, val: number) => {
    const next = { ...answers, [id]: val };
    setAnswers(next);
    if (Object.keys(next).length === QUESTIONS.length) {
      setTimeout(() => setShowResult(true), 300);
    }
  };

  const total = Object.values(answers).reduce((s, v) => s + v, 0);
  const level = calcLevel(total);

  const dimScores = (['D', 'O', 'E', 'S'] as Dimension[]).map(dim => ({
    dim,
    label: t.dimensions[dim],
    score: QUESTIONS.filter(q => q.dim === dim).reduce((s, q) => s + (answers[q.id] ?? 0), 0),
    max: QUESTIONS.filter(q => q.dim === dim).length * 5,
  }));

  if (showResult) {
    const pct = Math.round((total / (QUESTIONS.length * 5)) * 100);
    return (
      <div className="not-prose mx-auto max-w-2xl py-8 px-4">
        <div className="space-y-6">
          {/* Score card */}
          <div className={`p-8 rounded-[32px] bg-gradient-to-br ${LEVEL_COLORS[level]} text-white text-center space-y-3`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{t.level}</p>
            <p className="text-5xl font-black">{t.resultTitle[level]}</p>
            <p className="text-4xl font-light opacity-90">{pct}%</p>
            <p className="text-sm font-bold opacity-70">{t.yourScore}: {total} / {QUESTIONS.length * 5}</p>
          </div>

          {/* Description */}
          <div className="p-6 rounded-2xl bg-card border border-border">
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">{t.resultDesc[level]}</p>
          </div>

          {/* Traits */}
          <div className="p-6 rounded-2xl bg-muted/30 border border-border space-y-3">
            {t.traits[level].map(trait => (
              <div key={trait} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✦</span>
                <span className="text-sm font-medium">{trait}</span>
              </div>
            ))}
          </div>

          {/* Dimension breakdown */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">DOES Profile</p>
            {dimScores.map(({ dim, label, score, max }) => (
              <div key={dim} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>{dim} — {label}</span>
                  <span>{score}/{max} {t.dimScore}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full bg-gradient-to-r ${LEVEL_COLORS[level]}`} style={{ width: `${(score / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <p className="text-[10px] text-muted-foreground text-center px-4">{t.note}</p>

          <button
            onClick={() => { setAnswers({}); setShowResult(false); }}
            className="w-full py-3 rounded-2xl bg-muted border border-border font-black text-sm hover:bg-accent transition-colors"
          >
            {t.restart}
          </button>
        </div>
      </div>
    );
  }

  const progress = (current / QUESTIONS.length) * 100;

  return (
    <div className="not-prose mx-auto max-w-2xl py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t.subtitle}</p>
          <h1 className="text-2xl font-black">{t.title}</h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">{t.desc}</p>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase">
            <span>{t.questionOf(current, QUESTIONS.length)}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {QUESTIONS.map((q, i) => {
            const answered = answers[q.id];
            return (
              <div key={q.id} className={`p-6 rounded-2xl border transition-all ${answered !== undefined ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                  {i + 1}. {q.dim}
                </p>
                <p className="text-sm font-medium mb-5 leading-relaxed">{q.text[locale] ?? q.text.en}</p>
                <div className="grid grid-cols-5 gap-2">
                  {SCALE.map((val, si) => (
                    <button
                      key={val}
                      onClick={() => handleAnswer(q.id, val)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${answered === val ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}
                    >
                      <span className="text-lg font-black">{val}</span>
                      <span className="text-[8px] font-bold text-muted-foreground text-center leading-tight hidden sm:block">{t.scaleLabels[si]}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-2 sm:hidden">
                  <span className="text-[9px] text-muted-foreground">{t.scaleLabels[0]}</span>
                  <span className="text-[9px] text-muted-foreground">{t.scaleLabels[4]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
