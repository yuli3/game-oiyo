import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

type EnneaType = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

interface Question {
  id: string
  type: EnneaType
  text: string
}

interface TypeResult {
  emoji: string
  name: string
  tagline: string
  description: string
  coreDesire: string
  coreFear: string
  growthTip: string
  desireLabel: string
  fearLabel: string
  growthLabel: string
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string
  share: string
  shareMsg: string
  yourType: string
  typeLabel: string
  scoreLabel: string
  note: string
  topScoresLabel: string
}> = {
  ko: {
    title: '에니어그램 성격 테스트',
    subtitle: '나의 9가지 성격 유형 중 하나를 찾아보세요',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아니다', '아닌 편이다', '보통이다', '그런 편이다', '매우 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 에니어그램 유형',
    yourType: '나의 에니어그램 유형',
    typeLabel: '유형',
    scoreLabel: '점수',
    note: '이 테스트는 에니어그램 이론을 바탕으로 하며, 전문적 진단을 대체하지 않습니다.',
    topScoresLabel: '상위 점수 유형',
  },
  en: {
    title: 'Enneagram Personality Test',
    subtitle: 'Discover which of the 9 personality types is yours',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My Enneagram Type',
    yourType: 'Your Enneagram Type',
    typeLabel: 'Type',
    scoreLabel: 'Score',
    note: 'This test is based on Enneagram theory and does not replace professional assessment.',
    topScoresLabel: 'Top Scoring Types',
  },
  ja: {
    title: 'エニアグラム性格テスト',
    subtitle: '9つの性格タイプのどれかを見つけましょう',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全く違う', 'どちらかといえば違う', 'どちらでもない', 'どちらかといえばそう', '非常にそう思う'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のエニアグラムタイプ',
    yourType: '私のエニアグラムタイプ',
    typeLabel: 'タイプ',
    scoreLabel: 'スコア',
    note: 'このテストはエニアグラム理論に基づいており、専門的な診断の代替ではありません。',
    topScoresLabel: '上位スコアのタイプ',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', type: '1', text: '옳고 그름에 대한 기준이 명확하고 원칙을 중시한다' },
    { id: 'q2', type: '1', text: '실수나 불완전함을 용납하기 어렵다' },
    { id: 'q3', type: '1', text: '세상을 더 나은 곳으로 만들고 싶다는 강한 사명감이 있다' },
    { id: 'q4', type: '2', text: '다른 사람이 필요한 것을 미리 파악하고 도와주고 싶다' },
    { id: 'q5', type: '2', text: '사랑받기 위해 희생을 감수하는 경우가 많다' },
    { id: 'q6', type: '2', text: '내 필요보다 남의 필요를 먼저 챙긴다' },
    { id: 'q7', type: '3', text: '성공하고 인정받는 것이 중요한 동기다' },
    { id: 'q8', type: '3', text: '목표를 세우고 효율적으로 달성하는 것을 즐긴다' },
    { id: 'q9', type: '3', text: '타인에게 유능하고 성공적으로 보이는 이미지를 중시한다' },
    { id: 'q10', type: '4', text: '나는 다른 사람들과 근본적으로 다르다는 느낌이 있다' },
    { id: 'q11', type: '4', text: '깊은 감정과 개인적 의미를 중요하게 생각한다' },
    { id: 'q12', type: '4', text: '결핍감이나 무언가 빠진 느낌을 자주 경험한다' },
    { id: 'q13', type: '5', text: '혼자서 깊이 생각하고 분석하는 것을 즐긴다' },
    { id: 'q14', type: '5', text: '지식을 모으고 이해하는 것에서 안정감을 찾는다' },
    { id: 'q15', type: '5', text: '사회적 상호작용보다 혼자만의 시간이 더 편하다' },
    { id: 'q16', type: '6', text: '안전과 안정에 대한 욕구가 강하다' },
    { id: 'q17', type: '6', text: '최악의 상황을 미리 대비하는 경향이 있다' },
    { id: 'q18', type: '6', text: '신뢰할 수 있는 사람이나 시스템에 의지한다' },
    { id: 'q19', type: '7', text: '새로운 경험과 모험을 끊임없이 추구한다' },
    { id: 'q20', type: '7', text: '고통이나 부정적 감정보다 즐거운 것에 집중하고 싶다' },
    { id: 'q21', type: '7', text: '여러 가지 가능성을 동시에 탐색하는 것을 즐긴다' },
    { id: 'q22', type: '8', text: '통제권을 갖고 자율적으로 행동하는 것이 중요하다' },
    { id: 'q23', type: '8', text: '불의에 맞서 싸우는 것을 두려워하지 않는다' },
    { id: 'q24', type: '8', text: '약한 모습을 보이거나 취약해지는 것이 불편하다' },
    { id: 'q25', type: '9', text: '갈등을 피하고 조화로운 환경을 만드는 것을 중요시한다' },
    { id: 'q26', type: '9', text: '결정을 미루거나 현재 상태를 유지하려는 경향이 있다' },
    { id: 'q27', type: '9', text: '다른 사람의 의견에 공감하며 자신의 의견을 양보하는 편이다' },
  ],
  en: [
    { id: 'q1', type: '1', text: 'I have clear standards for right and wrong and value principles' },
    { id: 'q2', type: '1', text: 'I find it hard to tolerate mistakes or imperfection' },
    { id: 'q3', type: '1', text: 'I have a strong sense of mission to make the world a better place' },
    { id: 'q4', type: '2', text: 'I anticipate what others need and want to help before they ask' },
    { id: 'q5', type: '2', text: 'I often make sacrifices to feel loved and appreciated' },
    { id: 'q6', type: '2', text: 'I prioritize others\' needs before my own' },
    { id: 'q7', type: '3', text: 'Success and recognition are important motivators for me' },
    { id: 'q8', type: '3', text: 'I enjoy setting goals and achieving them efficiently' },
    { id: 'q9', type: '3', text: 'I care a lot about appearing competent and successful to others' },
    { id: 'q10', type: '4', text: 'I feel fundamentally different from other people' },
    { id: 'q11', type: '4', text: 'Deep emotion and personal meaning are very important to me' },
    { id: 'q12', type: '4', text: 'I often experience a sense of lack or feeling that something is missing' },
    { id: 'q13', type: '5', text: 'I enjoy thinking deeply and analyzing things on my own' },
    { id: 'q14', type: '5', text: 'I find security in gathering knowledge and understanding' },
    { id: 'q15', type: '5', text: 'I am more comfortable with alone time than social interaction' },
    { id: 'q16', type: '6', text: 'I have a strong need for safety and stability' },
    { id: 'q17', type: '6', text: 'I tend to prepare for worst-case scenarios in advance' },
    { id: 'q18', type: '6', text: 'I rely on trusted people or systems for support' },
    { id: 'q19', type: '7', text: 'I constantly seek new experiences and adventures' },
    { id: 'q20', type: '7', text: 'I prefer to focus on pleasurable things rather than pain or negative emotions' },
    { id: 'q21', type: '7', text: 'I enjoy exploring multiple possibilities at the same time' },
    { id: 'q22', type: '8', text: 'Having control and acting autonomously is very important to me' },
    { id: 'q23', type: '8', text: 'I am not afraid to fight against injustice' },
    { id: 'q24', type: '8', text: 'I feel uncomfortable showing weakness or being vulnerable' },
    { id: 'q25', type: '9', text: 'I value avoiding conflict and creating harmonious environments' },
    { id: 'q26', type: '9', text: 'I tend to delay decisions or maintain the status quo' },
    { id: 'q27', type: '9', text: 'I empathize with others\' views and tend to yield my own opinion' },
  ],
  ja: [
    { id: 'q1', type: '1', text: '善悪の基準が明確で原則を重視する' },
    { id: 'q2', type: '1', text: 'ミスや不完全さを容認するのが難しい' },
    { id: 'q3', type: '1', text: '世界をより良い場所にしたいという強い使命感がある' },
    { id: 'q4', type: '2', text: '他の人が必要なものを先読みして助けたい' },
    { id: 'q5', type: '2', text: '愛されるために犠牲を払うことが多い' },
    { id: 'q6', type: '2', text: '自分の必要より他者の必要を先に考える' },
    { id: 'q7', type: '3', text: '成功して認められることが重要な動機だ' },
    { id: 'q8', type: '3', text: '目標を立てて効率的に達成することを楽しむ' },
    { id: 'q9', type: '3', text: '他者に有能で成功したイメージを見せることを重視する' },
    { id: 'q10', type: '4', text: '自分は他の人と根本的に違うという感覚がある' },
    { id: 'q11', type: '4', text: '深い感情と個人的な意味を大切にする' },
    { id: 'q12', type: '4', text: '欠乏感や何かが足りない感覚をよく経験する' },
    { id: 'q13', type: '5', text: '一人で深く考えて分析することを楽しむ' },
    { id: 'q14', type: '5', text: '知識を集めて理解することに安定感を見出す' },
    { id: 'q15', type: '5', text: '社会的交流より一人の時間の方が快適だ' },
    { id: 'q16', type: '6', text: '安全と安定への欲求が強い' },
    { id: 'q17', type: '6', text: '最悪の事態を事前に準備する傾向がある' },
    { id: 'q18', type: '6', text: '信頼できる人やシステムに頼る' },
    { id: 'q19', type: '7', text: '新しい経験と冒険を絶えず追い求める' },
    { id: 'q20', type: '7', text: '苦痛や否定的感情より楽しいことに集中したい' },
    { id: 'q21', type: '7', text: '様々な可能性を同時に探索することを楽しむ' },
    { id: 'q22', type: '8', text: '支配権を持ち自律的に行動することが重要だ' },
    { id: 'q23', type: '8', text: '不正に立ち向かうことを恐れない' },
    { id: 'q24', type: '8', text: '弱い姿を見せたり傷つきやすくなることが不快だ' },
    { id: 'q25', type: '9', text: '対立を避けて調和のある環境を作ることを重視する' },
    { id: 'q26', type: '9', text: '決断を先延ばしにしたり現状維持しようとする傾向がある' },
    { id: 'q27', type: '9', text: '他の人の意見に共感して自分の意見を譲る方だ' },
  ],
}

const TYPE_RESULTS: Record<EnneaType, Record<SupportedLang, TypeResult>> = {
  '1': {
    ko: {
      emoji: '🔍',
      name: '개혁가',
      tagline: '완벽을 추구하는 원칙주의자',
      description: '더 나은 세상을 위해 높은 기준을 세웁니다. 강한 윤리의식과 책임감으로 옳은 일을 향해 나아갑니다.',
      coreDesire: '올바름',
      coreFear: '부패·결함',
      growthTip: '완벽하지 않아도 괜찮다는 것을 받아들이세요.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '🔍',
      name: 'Reformer',
      tagline: 'The principled perfectionist',
      description: 'You set high standards to make the world better. You move toward what is right with a strong sense of ethics and responsibility.',
      coreDesire: 'Integrity',
      coreFear: 'Corruption / Defectiveness',
      growthTip: 'Accept that imperfection is a natural part of life.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '🔍',
      name: '改革者',
      tagline: '完璧を追求する原則主義者',
      description: 'より良い世界のために高い基準を設けます。強い倫理観と責任感で正しいことに向かって進みます。',
      coreDesire: '正しさ',
      coreFear: '腐敗・欠陥',
      growthTip: '完璧でなくても大丈夫だということを受け入れましょう。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
  '2': {
    ko: {
      emoji: '💝',
      name: '조력가',
      tagline: '사랑을 주는 헌신자',
      description: '타인을 위한 배려가 삶의 원동력입니다. 관계 속에서 의미를 찾고 사랑을 통해 연결됩니다.',
      coreDesire: '사랑',
      coreFear: '사랑받지 못함',
      growthTip: '자신의 필요도 돌봐주세요.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '💝',
      name: 'Helper',
      tagline: 'The devoted giver of love',
      description: 'Caring for others is your life\'s driving force. You find meaning in relationships and connect through love.',
      coreDesire: 'Love',
      coreFear: 'Being unloved',
      growthTip: 'Take care of your own needs too.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '💝',
      name: '助力者',
      tagline: '愛を与える献身者',
      description: '他者への思いやりが人生の原動力です。関係の中に意味を見出し、愛を通じてつながります。',
      coreDesire: '愛',
      coreFear: '愛されないこと',
      growthTip: '自分自身のニーズも大切にしましょう。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
  '3': {
    ko: {
      emoji: '🏆',
      name: '성취자',
      tagline: '목표를 향해 달리는 성공자',
      description: '효율적으로 성취하며 인정받는 것을 즐깁니다. 목표 지향적이고 적응력이 뛰어납니다.',
      coreDesire: '가치 인정',
      coreFear: '무가치함',
      growthTip: '성과 없이도 가치 있는 존재임을 기억하세요.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '🏆',
      name: 'Achiever',
      tagline: 'The success-driven goal-setter',
      description: 'You excel at accomplishing goals efficiently and enjoy being recognized. Highly goal-oriented and adaptable.',
      coreDesire: 'Value and recognition',
      coreFear: 'Being worthless',
      growthTip: 'Remember you have worth beyond your achievements.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '🏆',
      name: '達成者',
      tagline: '目標に向かって走る成功者',
      description: '効率的に目標を達成し、認められることを楽しみます。目標志向で適応力が高いです。',
      coreDesire: '価値の認定',
      coreFear: '無価値',
      growthTip: '成果がなくても価値ある存在であることを忘れずに。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
  '4': {
    ko: {
      emoji: '🎭',
      name: '개인주의자',
      tagline: '깊이를 추구하는 감성인',
      description: '독특한 정체성과 깊은 감정을 소중히 여깁니다. 진정성과 자기 표현이 핵심 가치입니다.',
      coreDesire: '진정성',
      coreFear: '정체성 없음',
      growthTip: '현재의 나를 있는 그대로 받아들이세요.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '🎭',
      name: 'Individualist',
      tagline: 'The depth-seeking emotionally rich one',
      description: 'You treasure your unique identity and deep emotions. Authenticity and self-expression are your core values.',
      coreDesire: 'Authenticity',
      coreFear: 'Having no identity',
      growthTip: 'Accept yourself as you are, right now.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '🎭',
      name: '個人主義者',
      tagline: '深みを追求する感性豊かな人',
      description: 'ユニークなアイデンティティと深い感情を大切にします。真正性と自己表現が核心価値です。',
      coreDesire: '真正性',
      coreFear: 'アイデンティティの喪失',
      growthTip: '今の自分をそのまま受け入れましょう。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
  '5': {
    ko: {
      emoji: '🔬',
      name: '탐구자',
      tagline: '지식을 쌓는 고독한 관찰자',
      description: '이해하고 분석하는 것에서 안정감을 찾습니다. 통찰력 있는 관찰로 세상의 원리를 탐구합니다.',
      coreDesire: '역량',
      coreFear: '무능·무지',
      growthTip: '불완전한 지식으로도 세상에 참여해보세요.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '🔬',
      name: 'Investigator',
      tagline: 'The solitary observer building knowledge',
      description: 'You find security in understanding and analysis. You explore the world\'s principles through insightful observation.',
      coreDesire: 'Competence',
      coreFear: 'Incompetence / Ignorance',
      growthTip: 'Participate in the world even with imperfect knowledge.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '🔬',
      name: '探求者',
      tagline: '知識を積む孤独な観察者',
      description: '理解して分析することに安定感を見出します。洞察力ある観察で世界の原理を探求します。',
      coreDesire: '能力',
      coreFear: '無能・無知',
      growthTip: '不完全な知識でも世界に参加してみましょう。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
  '6': {
    ko: {
      emoji: '🛡️',
      name: '충성가',
      tagline: '안전을 추구하는 신뢰의 사람',
      description: '충성과 책임감으로 안정을 추구합니다. 신뢰할 수 있는 존재로서 공동체를 지킵니다.',
      coreDesire: '안전',
      coreFear: '버려짐·혼돈',
      growthTip: '내면의 안정은 외부가 아닌 자신에게서 옵니다.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '🛡️',
      name: 'Loyalist',
      tagline: 'The trustworthy seeker of safety',
      description: 'You pursue stability through loyalty and responsibility. You protect your community as a reliable presence.',
      coreDesire: 'Safety',
      coreFear: 'Abandonment / Chaos',
      growthTip: 'Inner stability comes from within, not from outside.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '🛡️',
      name: '忠実者',
      tagline: '安全を求める信頼の人',
      description: '忠誠心と責任感で安定を追求します。信頼できる存在としてコミュニティを守ります。',
      coreDesire: '安全',
      coreFear: '見捨て・混乱',
      growthTip: '内面の安定は外部ではなく自分自身から来ます。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
  '7': {
    ko: {
      emoji: '🌟',
      name: '열정가',
      tagline: '가능성을 탐험하는 자유로운 영혼',
      description: '기쁨과 새로운 경험을 끊임없이 추구합니다. 낙관적이고 다재다능한 에너지로 세상을 탐험합니다.',
      coreDesire: '만족',
      coreFear: '고통·결핍',
      growthTip: '현재 가진 것에서도 충만함을 찾아보세요.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '🌟',
      name: 'Enthusiast',
      tagline: 'The free-spirited explorer of possibilities',
      description: 'You constantly seek joy and new experiences. You explore the world with optimistic, versatile energy.',
      coreDesire: 'Satisfaction',
      coreFear: 'Pain / Deprivation',
      growthTip: 'Find fulfillment in what you already have.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '🌟',
      name: '熱狂者',
      tagline: '可能性を探る自由な魂',
      description: '喜びと新しい経験を絶えず追い求めます。楽観的で多才なエネルギーで世界を探求します。',
      coreDesire: '満足',
      coreFear: '苦痛・欠乏',
      growthTip: '今持っているものの中にも充実感を見つけましょう。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
  '8': {
    ko: {
      emoji: '⚡',
      name: '도전자',
      tagline: '정의를 위해 싸우는 강한 보호자',
      description: '통제력과 힘으로 스스로와 약자를 지킵니다. 강인하고 결단력 있는 리더십을 발휘합니다.',
      coreDesire: '자율성',
      coreFear: '통제당함',
      growthTip: '취약성도 강인함의 일부입니다.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '⚡',
      name: 'Challenger',
      tagline: 'The powerful protector fighting for justice',
      description: 'You protect yourself and the vulnerable through control and strength. You lead with resilient, decisive authority.',
      coreDesire: 'Autonomy',
      coreFear: 'Being controlled',
      growthTip: 'Vulnerability is also a part of strength.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '⚡',
      name: '挑戦者',
      tagline: '正義のために戦う強い守護者',
      description: '支配力と力で自分と弱者を守ります。強靭で決断力あるリーダーシップを発揮します。',
      coreDesire: '自律性',
      coreFear: 'コントロールされること',
      growthTip: '傷つきやすさも強さの一部です。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
  '9': {
    ko: {
      emoji: '☮️',
      name: '평화주의자',
      tagline: '조화를 만드는 평화의 중재자',
      description: '갈등을 해소하고 모든 것을 연결합니다. 포용력 있는 시각으로 평화를 이끌어냅니다.',
      coreDesire: '평화',
      coreFear: '분리·갈등',
      growthTip: '자신의 목소리와 필요에도 귀 기울이세요.',
      desireLabel: '핵심 욕구',
      fearLabel: '핵심 두려움',
      growthLabel: '성장 팁',
    },
    en: {
      emoji: '☮️',
      name: 'Peacemaker',
      tagline: 'The harmonizing mediator of peace',
      description: 'You resolve conflict and connect everything together. You lead toward peace with an inclusive perspective.',
      coreDesire: 'Peace',
      coreFear: 'Separation / Conflict',
      growthTip: 'Listen to your own voice and needs too.',
      desireLabel: 'Core Desire',
      fearLabel: 'Core Fear',
      growthLabel: 'Growth Tip',
    },
    ja: {
      emoji: '☮️',
      name: '平和主義者',
      tagline: '調和を生む平和の仲介者',
      description: '対立を解消してすべてをつなぎます。包括的な視点で平和へと導きます。',
      coreDesire: '平和',
      coreFear: '分離・対立',
      growthTip: '自分の声とニーズにも耳を傾けましょう。',
      desireLabel: '核心欲求',
      fearLabel: '核心恐怖',
      growthLabel: '成長のヒント',
    },
  },
}

const ENNEAGRAM_COLORS: Record<EnneaType, string> = {
  '1': '#6366f1', '2': '#ec4899', '3': '#f59e0b',
  '4': '#8b5cf6', '5': '#3b82f6', '6': '#14b8a6',
  '7': '#f97316', '8': '#ef4444', '9': '#22c55e',
}

type ScoreMap = Record<EnneaType, number>

function computeScores(answers: number[], questions: Question[]): ScoreMap {
  const sums: ScoreMap = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 }
  answers.forEach((v, i) => {
    if (i < questions.length) sums[questions[i].type] += v
  })
  return sums
}

interface Props { locale?: string }

export default function EnneagramTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [scores, setScores] = useState<ScoreMap | null>(null)

  function pick(val: number) {
    const newAns = [...answers, val + 1]
    if (current + 1 >= questions.length) {
      setScores(computeScores(newAns, questions))
    }
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() {
    setAnswers([])
    setCurrent(0)
    setScores(null)
  }

  function share() {
    if (!scores) return
    const url = window.location.href
    const typeKeys = Object.keys(scores) as EnneaType[]
    const dominant = typeKeys.reduce((a, b) => scores[a] >= scores[b] ? a : b)
    const result = TYPE_RESULTS[dominant][locale]
    const text = `${lb.shareMsg} — ${lb.typeLabel} ${dominant} ${result.name}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= questions.length

  if (!finished) {
    const q = questions[current]
    const progress = Math.round((current / questions.length) * 100)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-sm text-muted-foreground">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
          >
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-medium">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
              aria-label={`${label} (${i + 1}점)`}
            >
              <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!scores) return null

  const typeKeys = Object.keys(scores) as EnneaType[]
  const sorted = [...typeKeys].sort((a, b) => scores[b] - scores[a])
  const dominant = sorted[0]
  const result = TYPE_RESULTS[dominant][locale]
  const maxScore = 15
  const topThree = sorted.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: ENNEAGRAM_COLORS[dominant] }}
        >
          <span>{result.emoji}</span>
          <span>{lb.typeLabel} {dominant} — {result.name}</span>
        </div>
        <p className="font-medium text-muted-foreground">{result.tagline}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-3 space-y-1">
          <p className="text-xs text-muted-foreground">{result.desireLabel}</p>
          <p className="font-bold" style={{ color: ENNEAGRAM_COLORS[dominant] }}>{result.coreDesire}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 space-y-1">
          <p className="text-xs text-muted-foreground">{result.fearLabel}</p>
          <p className="font-bold" style={{ color: ENNEAGRAM_COLORS[dominant] }}>{result.coreFear}</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{result.growthLabel}</h3>
        <p className="text-sm">"{result.growthTip}"</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm">{lb.topScoresLabel}</h2>
        {topThree.map(t => {
          const pct = Math.round((scores[t] / maxScore) * 100)
          const tr = TYPE_RESULTS[t][locale]
          return (
            <div key={t} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium" style={{ color: ENNEAGRAM_COLORS[t] }}>
                  {tr.emoji} {lb.typeLabel} {t} — {tr.name}
                </span>
                <span className="text-muted-foreground text-xs">{scores[t]}pt</span>
              </div>
              <div
                className="h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${tr.name} ${pct}%`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: ENNEAGRAM_COLORS[t] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          aria-label={lb.restart}
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          aria-label={lb.share}
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
