import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja'
type AuraColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet'

function lang(lp: string): Locale {
  return (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
}

interface AuraData {
  name: string
  keyword: string
  hex: string
  description: string
  strengths: string[]
  challenges: string[]
  affirmation: string
}

const AURA_DATA: Record<AuraColor, Record<Locale, AuraData>> = {
  red: {
    ko: {
      name: '빨강 오라', keyword: '열정',
      hex: '#ef4444',
      description: '당신의 오라는 강렬한 빨강입니다. 열정과 행동력이 넘치며, 삶에 대한 강한 의지와 활력을 가지고 있습니다.',
      strengths: ['강한 실행력과 추진력', '자신감과 결단력', '높은 에너지와 활동성', '목표 달성 능력'],
      challenges: ['충동적 행동 주의', '분노 조절 연습 필요', '과도한 경쟁심 조심'],
      affirmation: '나의 열정은 세상을 움직이는 힘입니다.',
    },
    en: {
      name: 'Red Aura', keyword: 'Passion',
      hex: '#ef4444',
      description: 'Your aura is a vibrant red. You radiate passion and drive, with a powerful will to live and an energetic presence.',
      strengths: ['Strong execution and momentum', 'Confidence and decisiveness', 'High energy and activity', 'Goal achievement'],
      challenges: ['Watch for impulsive actions', 'Practice anger management', 'Beware of excessive competition'],
      affirmation: 'My passion is the force that moves the world.',
    },
    ja: {
      name: 'レッドオーラ', keyword: '情熱',
      hex: '#ef4444',
      description: 'あなたのオーラは鮮やかな赤です。情熱と行動力に溢れ、人生への強い意志と活力を持っています。',
      strengths: ['強い実行力と推進力', '自信と決断力', '高いエネルギーと活動性', '目標達成能力'],
      challenges: ['衝動的な行動に注意', '怒りのコントロール練習', '過度な競争心に注意'],
      affirmation: '私の情熱は世界を動かす力です。',
    },
  },
  orange: {
    ko: {
      name: '주황 오라', keyword: '창의',
      hex: '#f97316',
      description: '당신의 오라는 따뜻한 주황입니다. 창의력과 표현력이 풍부하며, 사람들과의 연결에서 기쁨을 찾습니다.',
      strengths: ['뛰어난 창의력', '사교성과 따뜻함', '예술적 감수성', '즐거움을 만드는 능력'],
      challenges: ['산만함 주의', '감정 기복 관리', '과도한 자극 추구 조심'],
      affirmation: '나의 창의성은 세상을 더 아름답게 만듭니다.',
    },
    en: {
      name: 'Orange Aura', keyword: 'Creativity',
      hex: '#f97316',
      description: 'Your aura is a warm orange. You overflow with creativity and expression, finding joy in connection with others.',
      strengths: ['Outstanding creativity', 'Sociability and warmth', 'Artistic sensitivity', 'Ability to create joy'],
      challenges: ['Watch for distractibility', 'Manage emotional fluctuations', 'Beware of overstimulation seeking'],
      affirmation: 'My creativity makes the world more beautiful.',
    },
    ja: {
      name: 'オレンジオーラ', keyword: '創造性',
      hex: '#f97316',
      description: 'あなたのオーラは温かいオレンジです。創造力と表現力に富み、人との繋がりに喜びを見出します。',
      strengths: ['卓越した創造力', '社交性と温かさ', '芸術的感性', '喜びを生み出す能力'],
      challenges: ['散漫さに注意', '感情の起伏の管理', '過度な刺激追求に注意'],
      affirmation: '私の創造性は世界をより美しくします。',
    },
  },
  yellow: {
    ko: {
      name: '노랑 오라', keyword: '지성',
      hex: '#eab308',
      description: '당신의 오라는 밝은 노랑입니다. 지적 호기심과 분석력이 뛰어나며, 진리를 탐구하는 것을 즐깁니다.',
      strengths: ['뛰어난 분석력과 논리력', '강한 지적 호기심', '문제 해결 능력', '명확한 커뮤니케이션'],
      challenges: ['과도한 분석으로 인한 결정 지연', '감정보다 이성 치우침', '완벽주의 조심'],
      affirmation: '나의 지성은 복잡한 세상을 이해하는 등불입니다.',
    },
    en: {
      name: 'Yellow Aura', keyword: 'Intelligence',
      hex: '#eab308',
      description: 'Your aura is a bright yellow. You possess keen intellectual curiosity and analytical ability, enjoying the pursuit of truth.',
      strengths: ['Excellent analytical and logical thinking', 'Strong intellectual curiosity', 'Problem-solving ability', 'Clear communication'],
      challenges: ['Decision delays from over-analysis', 'Tendency to favor reason over emotion', 'Beware of perfectionism'],
      affirmation: 'My intellect is a beacon that illuminates the complex world.',
    },
    ja: {
      name: 'イエローオーラ', keyword: '知性',
      hex: '#eab308',
      description: 'あなたのオーラは明るい黄色です。知的好奇心と分析力に優れ、真理を探求することを楽しんでいます。',
      strengths: ['卓越した分析力と論理力', '強い知的好奇心', '問題解決能力', '明確なコミュニケーション'],
      challenges: ['過度な分析による決断遅れ', '感情より理性に偏る傾向', '完璧主義に注意'],
      affirmation: '私の知性は複雑な世界を照らす灯台です。',
    },
  },
  green: {
    ko: {
      name: '초록 오라', keyword: '치유',
      hex: '#22c55e',
      description: '당신의 오라는 싱그러운 초록입니다. 치유의 에너지가 넘치며, 자연과 사람을 돌보는 따뜻한 마음을 가지고 있습니다.',
      strengths: ['깊은 공감 능력', '치유와 돌봄의 에너지', '자연과의 깊은 연결', '균형과 조화 추구'],
      challenges: ['다른 사람의 감정을 너무 많이 흡수', '자신보다 타인 우선 경향', '경계 설정 연습 필요'],
      affirmation: '나의 치유 에너지는 주변을 평화롭게 합니다.',
    },
    en: {
      name: 'Green Aura', keyword: 'Healing',
      hex: '#22c55e',
      description: 'Your aura is a fresh green. You overflow with healing energy, with a warm heart for caring for nature and people.',
      strengths: ['Deep empathy', 'Healing and nurturing energy', 'Deep connection with nature', 'Pursuit of balance and harmony'],
      challenges: ['Absorbing too much of others\' emotions', 'Tendency to prioritize others over self', 'Need to practice setting boundaries'],
      affirmation: 'My healing energy brings peace to those around me.',
    },
    ja: {
      name: 'グリーンオーラ', keyword: '癒し',
      hex: '#22c55e',
      description: 'あなたのオーラは新鮮な緑です。癒しのエネルギーに溢れ、自然と人を気遣う温かい心を持っています。',
      strengths: ['深い共感能力', '癒しと思いやりのエネルギー', '自然との深い繋がり', 'バランスと調和の追求'],
      challenges: ['他者の感情を吸収しすぎる', '自分より他者を優先する傾向', '境界設定の練習が必要'],
      affirmation: '私の癒しのエネルギーは周囲に平和をもたらします。',
    },
  },
  blue: {
    ko: {
      name: '파랑 오라', keyword: '평화',
      hex: '#3b82f6',
      description: '당신의 오라는 깊은 파랑입니다. 내면의 평화와 진실함을 중요시하며, 진정한 소통을 통해 관계를 쌓아갑니다.',
      strengths: ['깊은 진실성과 정직함', '평화로운 존재감', '뛰어난 소통 능력', '신뢰받는 성격'],
      challenges: ['과도한 자기성찰로 인한 우울', '변화 적응에 시간 필요', '감정 표현 부족 경향'],
      affirmation: '나의 평화로운 마음은 세상에 신뢰를 줍니다.',
    },
    en: {
      name: 'Blue Aura', keyword: 'Peace',
      hex: '#3b82f6',
      description: 'Your aura is a deep blue. You value inner peace and authenticity, building relationships through genuine communication.',
      strengths: ['Deep authenticity and honesty', 'Peaceful presence', 'Excellent communication skills', 'Trustworthy character'],
      challenges: ['Depression from over-introspection', 'Need time to adapt to change', 'Tendency to under-express emotions'],
      affirmation: 'My peaceful mind brings trust to the world.',
    },
    ja: {
      name: 'ブルーオーラ', keyword: '平和',
      hex: '#3b82f6',
      description: 'あなたのオーラは深い青です。内なる平和と誠実さを大切にし、真の対話を通じて関係を築きます。',
      strengths: ['深い誠実さと正直さ', '平和な存在感', '優れたコミュニケーション能力', '信頼される性格'],
      challenges: ['過度な自己省察による憂鬱', '変化への適応に時間が必要', '感情表現が少ない傾向'],
      affirmation: '私の平和な心は世界に信頼をもたらします。',
    },
  },
  indigo: {
    ko: {
      name: '남색 오라', keyword: '직관',
      hex: '#6366f1',
      description: '당신의 오라는 신비로운 남색입니다. 강한 직관력과 통찰력을 가지고 있으며, 보이지 않는 것들을 느끼는 능력이 있습니다.',
      strengths: ['강한 직관력과 통찰력', '깊은 사색 능력', '패턴 인식 능력', '영적 감수성'],
      challenges: ['과도한 고립 경향', '현실과 이상 사이의 갈등', '타인에게 오해받을 수 있음'],
      affirmation: '나의 직관은 보이지 않는 진실을 안내합니다.',
    },
    en: {
      name: 'Indigo Aura', keyword: 'Intuition',
      hex: '#6366f1',
      description: 'Your aura is a mysterious indigo. You possess strong intuition and insight, with the ability to sense what is unseen.',
      strengths: ['Strong intuition and insight', 'Deep contemplative ability', 'Pattern recognition', 'Spiritual sensitivity'],
      challenges: ['Tendency to over-isolate', 'Conflict between reality and ideals', 'Risk of being misunderstood by others'],
      affirmation: 'My intuition guides me to invisible truths.',
    },
    ja: {
      name: 'インディゴオーラ', keyword: '直感',
      hex: '#6366f1',
      description: 'あなたのオーラは神秘的なインディゴです。強い直感力と洞察力を持ち、見えないものを感じる能力があります。',
      strengths: ['強い直感力と洞察力', '深い思索能力', 'パターン認識能力', '霊的感受性'],
      challenges: ['過度な孤立傾向', '現実と理想の間の葛藤', '他者に誤解されることがある'],
      affirmation: '私の直感は見えない真実へと導きます。',
    },
  },
  violet: {
    ko: {
      name: '보라 오라', keyword: '영성',
      hex: '#a855f7',
      description: '당신의 오라는 신성한 보라입니다. 영적 깊이와 지혜를 추구하며, 더 큰 의미와 목적을 향해 나아갑니다.',
      strengths: ['깊은 영적 이해', '변혁적 리더십', '높은 이상과 비전', '인류 봉사의 마음'],
      challenges: ['지나친 완벽주의', '다른 사람과의 연결에 어려움', '지상의 현실적 문제 등한시'],
      affirmation: '나의 영혼은 세상에 더 큰 지혜를 가져다 줍니다.',
    },
    en: {
      name: 'Violet Aura', keyword: 'Spirituality',
      hex: '#a855f7',
      description: 'Your aura is a sacred violet. You seek spiritual depth and wisdom, moving toward greater meaning and purpose.',
      strengths: ['Deep spiritual understanding', 'Transformative leadership', 'High ideals and vision', 'Heart for serving humanity'],
      challenges: ['Excessive perfectionism', 'Difficulty connecting with others', 'Neglecting practical earthly matters'],
      affirmation: 'My soul brings greater wisdom to the world.',
    },
    ja: {
      name: 'バイオレットオーラ', keyword: '霊性',
      hex: '#a855f7',
      description: 'あなたのオーラは神聖なバイオレットです。精神的な深みと知恵を求め、より大きな意味と目的に向かって進みます。',
      strengths: ['深い霊的理解', '変革的リーダーシップ', '高い理想とビジョン', '人類への奉仕の心'],
      challenges: ['過度な完璧主義', '他者との繋がりの難しさ', '地上の現実的問題を軽視'],
      affirmation: '私の魂は世界により大きな知恵をもたらします。',
    },
  },
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  next: string
  restart: string
  share: string
  shareMsg: string
  yourAura: string
  strengths: string
  challenges: string
  note: string
  choose: string
}> = {
  ko: {
    title: '나의 오라 색깔은?',
    subtitle: '에너지 오라 컬러 테스트',
    questionOf: (c, t) => `${c} / ${t}`,
    next: '다음',
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 오라 색깔은',
    yourAura: '나의 오라 컬러',
    strengths: '강점',
    challenges: '주의할 점',
    note: '이 테스트는 에너지 심리학에 기반한 자기 탐색 도구입니다.',
    choose: '가장 공감되는 답변을 선택하세요',
  },
  en: {
    title: 'What Color is My Aura?',
    subtitle: 'Energy Aura Color Test',
    questionOf: (c, t) => `${c} / ${t}`,
    next: 'Next',
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My aura color is',
    yourAura: 'Your Aura Color',
    strengths: 'Strengths',
    challenges: 'Points to Watch',
    note: 'This test is a self-exploration tool based on energy psychology.',
    choose: 'Choose the answer that resonates most',
  },
  ja: {
    title: '私のオーラの色は？',
    subtitle: 'エネルギーオーラカラーテスト',
    questionOf: (c, t) => `${c} / ${t}`,
    next: '次へ',
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のオーラの色は',
    yourAura: '私のオーラカラー',
    strengths: '強み',
    challenges: '注意点',
    note: 'このテストはエネルギー心理学に基づく自己探索ツールです。',
    choose: '最も共感できる答えを選んでください',
  },
}

interface Question {
  id: string
  text: Record<Locale, string>
  options: Array<{ color: AuraColor; text: Record<Locale, string> }>
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: {
      ko: '아침에 눈을 뜨면 가장 먼저 떠오르는 감정은?',
      en: 'What feeling arises first when you wake up in the morning?',
      ja: '朝目覚めた時、最初に湧き上がる感情は？',
    },
    options: [
      { color: 'red', text: { ko: '오늘도 뭔가 해내야겠다는 에너지', en: 'Energy to accomplish something today', ja: '今日も何かを成し遂げなければというエネルギー' } },
      { color: 'orange', text: { ko: '새로운 아이디어나 영감', en: 'A new idea or inspiration', ja: '新しいアイデアやインスピレーション' } },
      { color: 'yellow', text: { ko: '오늘 배울 것들에 대한 기대', en: 'Anticipation for what I\'ll learn today', ja: '今日学ぶことへの期待' } },
      { color: 'green', text: { ko: '자연 속에 있고 싶은 평온함', en: 'Calm desire to be in nature', ja: '自然の中にいたい穏やかな気持ち' } },
      { color: 'blue', text: { ko: '오늘 하루에 대한 차분한 성찰', en: 'Calm reflection on the day ahead', ja: '今日一日への静かな省察' } },
      { color: 'indigo', text: { ko: '꿈의 의미를 생각하며 몽롱함', en: 'Dreamy contemplation of dream meanings', ja: '夢の意味を考えながらのぼんやり感' } },
      { color: 'violet', text: { ko: '더 큰 목적을 향한 소명감', en: 'A sense of calling toward a greater purpose', ja: 'より大きな目的への使命感' } },
    ],
  },
  {
    id: 'q2',
    text: {
      ko: '스트레스를 받을 때 나는 주로?',
      en: 'When stressed, I usually:',
      ja: 'ストレスを感じた時、私は主に？',
    },
    options: [
      { color: 'red', text: { ko: '운동이나 신체 활동으로 발산', en: 'Release through exercise or physical activity', ja: '運動や身体活動で発散' } },
      { color: 'orange', text: { ko: '창작 활동이나 친구와의 대화', en: 'Creative activities or talking with friends', ja: '創作活動や友人との会話' } },
      { color: 'yellow', text: { ko: '문제의 원인을 분석하고 해결책 탐색', en: 'Analyzing the cause and searching for solutions', ja: '問題の原因を分析して解決策を探す' } },
      { color: 'green', text: { ko: '자연 속 산책이나 명상', en: 'Walking in nature or meditation', ja: '自然の中の散歩や瞑想' } },
      { color: 'blue', text: { ko: '혼자만의 시간으로 내면 정리', en: 'Sorting out my inner state in solitude', ja: '一人の時間で内面を整理' } },
      { color: 'indigo', text: { ko: '직관을 믿고 가만히 기다림', en: 'Trusting my intuition and waiting quietly', ja: '直感を信じて静かに待つ' } },
      { color: 'violet', text: { ko: '더 큰 의미를 찾으며 기도나 명상', en: 'Prayer or meditation seeking greater meaning', ja: 'より大きな意味を求めて祈りや瞑想' } },
    ],
  },
  {
    id: 'q3',
    text: {
      ko: '친구들이 나를 어떻게 표현할까?',
      en: 'How would friends describe me?',
      ja: '友人は私をどう表現するだろうか？',
    },
    options: [
      { color: 'red', text: { ko: '에너지 넘치고 행동파', en: 'Energetic and action-oriented', ja: 'エネルギッシュで行動派' } },
      { color: 'orange', text: { ko: '재미있고 창의적인 사람', en: 'Fun and creative', ja: '楽しくてクリエイティブな人' } },
      { color: 'yellow', text: { ko: '똑똑하고 분석적인 사람', en: 'Smart and analytical', ja: '賢くて分析的な人' } },
      { color: 'green', text: { ko: '따뜻하고 배려심 있는 사람', en: 'Warm and caring', ja: '温かくて思いやりのある人' } },
      { color: 'blue', text: { ko: '진실하고 믿을 수 있는 사람', en: 'Genuine and trustworthy', ja: '誠実で信頼できる人' } },
      { color: 'indigo', text: { ko: '신비롭고 통찰력 있는 사람', en: 'Mysterious and insightful', ja: '神秘的で洞察力のある人' } },
      { color: 'violet', text: { ko: '지혜롭고 영감을 주는 사람', en: 'Wise and inspiring', ja: '賢明でインスピレーションを与える人' } },
    ],
  },
  {
    id: 'q4',
    text: {
      ko: '나에게 이상적인 주말은?',
      en: 'My ideal weekend is:',
      ja: '私にとって理想の週末は？',
    },
    options: [
      { color: 'red', text: { ko: '새로운 스포츠나 도전적인 활동', en: 'A new sport or challenging activity', ja: '新しいスポーツや挑戦的な活動' } },
      { color: 'orange', text: { ko: '예술 활동이나 파티 참석', en: 'Art activities or attending a party', ja: 'アート活動やパーティー参加' } },
      { color: 'yellow', text: { ko: '책 읽기나 강의 수강', en: 'Reading books or taking a course', ja: '読書や講座の受講' } },
      { color: 'green', text: { ko: '텃밭 가꾸기나 하이킹', en: 'Gardening or hiking', ja: '家庭菜園やハイキング' } },
      { color: 'blue', text: { ko: '조용한 카페에서 글쓰기나 독서', en: 'Writing or reading at a quiet café', ja: '静かなカフェで読書や執筆' } },
      { color: 'indigo', text: { ko: '혼자만의 조용한 성찰 시간', en: 'Quiet solo reflection time', ja: '一人の静かな省察の時間' } },
      { color: 'violet', text: { ko: '명상 수련이나 영적 모임', en: 'Meditation retreat or spiritual gathering', ja: '瞑想修練や霊的な集まり' } },
    ],
  },
  {
    id: 'q5',
    text: {
      ko: '나에게 가장 중요한 가치는?',
      en: 'The value most important to me is:',
      ja: '私にとって最も重要な価値は？',
    },
    options: [
      { color: 'red', text: { ko: '자유와 독립', en: 'Freedom and independence', ja: '自由と独立' } },
      { color: 'orange', text: { ko: '즐거움과 창의적 표현', en: 'Joy and creative expression', ja: '喜びと創造的表現' } },
      { color: 'yellow', text: { ko: '지식과 진리 탐구', en: 'Knowledge and pursuit of truth', ja: '知識と真理の探求' } },
      { color: 'green', text: { ko: '치유와 자연과의 조화', en: 'Healing and harmony with nature', ja: '癒しと自然との調和' } },
      { color: 'blue', text: { ko: '진실성과 신뢰', en: 'Authenticity and trust', ja: '誠実さと信頼' } },
      { color: 'indigo', text: { ko: '직관과 내면의 지혜', en: 'Intuition and inner wisdom', ja: '直感と内なる知恵' } },
      { color: 'violet', text: { ko: '영적 성장과 더 큰 목적', en: 'Spiritual growth and higher purpose', ja: '霊的成長とより高い目的' } },
    ],
  },
  {
    id: 'q6',
    text: {
      ko: '사람들 사이에 있을 때 나는?',
      en: 'When I\'m among people, I:',
      ja: '人々の中にいる時、私は？',
    },
    options: [
      { color: 'red', text: { ko: '대화를 주도하고 분위기를 이끈다', en: 'Lead conversations and set the tone', ja: '会話をリードして雰囲気を作る' } },
      { color: 'orange', text: { ko: '웃음과 재미를 만들어 낸다', en: 'Create laughter and fun', ja: '笑いと楽しさを生み出す' } },
      { color: 'yellow', text: { ko: '흥미로운 아이디어를 나눈다', en: 'Share interesting ideas', ja: '興味深いアイデアを分かち合う' } },
      { color: 'green', text: { ko: '모든 사람이 편안한지 살핀다', en: 'Make sure everyone feels comfortable', ja: 'みんなが快適かどうかを気にかける' } },
      { color: 'blue', text: { ko: '진실된 일대일 대화를 즐긴다', en: 'Enjoy genuine one-on-one conversations', ja: '誠実な一対一の会話を楽しむ' } },
      { color: 'indigo', text: { ko: '주로 관찰하며 사람들을 읽는다', en: 'Mostly observe and read people', ja: '主に観察して人々を読む' } },
      { color: 'violet', text: { ko: '영감을 주는 대화나 토론을 나눈다', en: 'Engage in inspiring conversations or debates', ja: 'インスピレーションを与える会話や議論をする' } },
    ],
  },
  {
    id: 'q7',
    text: {
      ko: '나에게 색깔을 고르라면 직감적으로 끌리는 것은?',
      en: 'If I had to pick a color intuitively, I\'d choose:',
      ja: '色を選ぶとしたら、直感的に惹かれるのは？',
    },
    options: [
      { color: 'red', text: { ko: '강렬한 빨강', en: 'Intense red', ja: '鮮烈な赤' } },
      { color: 'orange', text: { ko: '따뜻한 주황', en: 'Warm orange', ja: '温かいオレンジ' } },
      { color: 'yellow', text: { ko: '밝은 노랑', en: 'Bright yellow', ja: '明るい黄色' } },
      { color: 'green', text: { ko: '싱그러운 초록', en: 'Fresh green', ja: '爽やかな緑' } },
      { color: 'blue', text: { ko: '깊은 파랑', en: 'Deep blue', ja: '深い青' } },
      { color: 'indigo', text: { ko: '신비로운 남색', en: 'Mysterious indigo', ja: '神秘的なインディゴ' } },
      { color: 'violet', text: { ko: '신성한 보라', en: 'Sacred violet', ja: '神聖なバイオレット' } },
    ],
  },
  {
    id: 'q8',
    text: {
      ko: '나의 가장 큰 강점은?',
      en: 'My greatest strength is:',
      ja: '私の最大の強みは？',
    },
    options: [
      { color: 'red', text: { ko: '어떤 어려움도 돌파하는 추진력', en: 'Drive to push through any difficulty', ja: 'どんな困難も突破する推進力' } },
      { color: 'orange', text: { ko: '새로운 것을 만들어내는 창의력', en: 'Creativity to make something new', ja: '新しいものを生み出す創造力' } },
      { color: 'yellow', text: { ko: '복잡한 것을 이해하는 분석력', en: 'Analytical ability to understand complexity', ja: '複雑なことを理解する分析力' } },
      { color: 'green', text: { ko: '다른 사람의 아픔을 느끼는 공감력', en: 'Empathy to feel others\' pain', ja: '他者の痛みを感じる共感力' } },
      { color: 'blue', text: { ko: '어디서든 진실을 말하는 정직함', en: 'Honesty to speak truth anywhere', ja: 'どこでも真実を語る誠実さ' } },
      { color: 'indigo', text: { ko: '상황의 본질을 꿰뚫는 직관', en: 'Intuition to see the essence of situations', ja: '状況の本質を見抜く直感' } },
      { color: 'violet', text: { ko: '사람들에게 영감을 주는 비전', en: 'Vision that inspires people', ja: '人々にインスピレーションを与えるビジョン' } },
    ],
  },
  {
    id: 'q9',
    text: {
      ko: '나는 어떤 환경에서 가장 잘 집중하나?',
      en: 'In what environment do I concentrate best?',
      ja: 'どんな環境で最もよく集中できる？',
    },
    options: [
      { color: 'red', text: { ko: '활기차고 역동적인 환경', en: 'Lively and dynamic environment', ja: '活気あふれるダイナミックな環境' } },
      { color: 'orange', text: { ko: '밝고 자유로운 창의적 공간', en: 'Bright and free creative space', ja: '明るく自由なクリエイティブな空間' } },
      { color: 'yellow', text: { ko: '조용하고 잘 정돈된 공간', en: 'Quiet and well-organized space', ja: '静かで整然とした空間' } },
      { color: 'green', text: { ko: '자연광이 들어오는 편안한 공간', en: 'Comfortable space with natural light', ja: '自然光が入る快適な空間' } },
      { color: 'blue', text: { ko: '방해받지 않는 나만의 조용한 공간', en: 'My own quiet space without interruptions', ja: '邪魔されない自分だけの静かな空間' } },
      { color: 'indigo', text: { ko: '약간 어둡고 신비로운 분위기', en: 'Slightly dim and mysterious atmosphere', ja: 'やや暗く神秘的な雰囲気' } },
      { color: 'violet', text: { ko: '신성하거나 영적인 느낌이 드는 공간', en: 'Sacred or spiritually felt space', ja: '神聖または霊的な感じのする空間' } },
    ],
  },
  {
    id: 'q10',
    text: {
      ko: '인생에서 가장 두려운 것은?',
      en: 'What I fear most in life is:',
      ja: '人生で最も恐れているのは？',
    },
    options: [
      { color: 'red', text: { ko: '통제력을 잃는 것', en: 'Losing control', ja: 'コントロールを失うこと' } },
      { color: 'orange', text: { ko: '창의성이 막히는 것', en: 'Being creatively blocked', ja: '創造性が阻まれること' } },
      { color: 'yellow', text: { ko: '무지하거나 틀린 것', en: 'Being ignorant or wrong', ja: '無知または間違いを犯すこと' } },
      { color: 'green', text: { ko: '사랑하는 사람을 잃는 것', en: 'Losing someone I love', ja: '愛する人を失うこと' } },
      { color: 'blue', text: { ko: '진실되지 못하게 되는 것', en: 'Becoming inauthentic', ja: '誠実でなくなること' } },
      { color: 'indigo', text: { ko: '내면의 목소리를 잃는 것', en: 'Losing my inner voice', ja: '内なる声を失うこと' } },
      { color: 'violet', text: { ko: '삶의 더 큰 목적을 놓치는 것', en: 'Missing life\'s higher purpose', ja: '人生のより高い目的を見失うこと' } },
    ],
  },
  {
    id: 'q11',
    text: {
      ko: '나에게 에너지를 주는 것은?',
      en: 'What gives me energy is:',
      ja: '私にエネルギーを与えるのは？',
    },
    options: [
      { color: 'red', text: { ko: '새로운 도전과 경쟁', en: 'New challenges and competition', ja: '新しい挑戦と競争' } },
      { color: 'orange', text: { ko: '창의적인 프로젝트와 사람들', en: 'Creative projects and people', ja: 'クリエイティブなプロジェクトと人々' } },
      { color: 'yellow', text: { ko: '새로운 지식과 발견', en: 'New knowledge and discoveries', ja: '新しい知識と発見' } },
      { color: 'green', text: { ko: '자연 속에서의 시간', en: 'Time in nature', ja: '自然の中での時間' } },
      { color: 'blue', text: { ko: '진심 어린 대화와 연결', en: 'Heartfelt conversations and connections', ja: '真心のこもった会話と繋がり' } },
      { color: 'indigo', text: { ko: '고독 속의 깊은 사색', en: 'Deep contemplation in solitude', ja: '孤独の中での深い思索' } },
      { color: 'violet', text: { ko: '영적 수련과 의미 있는 기여', en: 'Spiritual practice and meaningful contribution', ja: '霊的修練と意味のある貢献' } },
    ],
  },
  {
    id: 'q12',
    text: {
      ko: '나의 관계 스타일은?',
      en: 'My relationship style is:',
      ja: '私の関係スタイルは？',
    },
    options: [
      { color: 'red', text: { ko: '열정적이고 강렬한 관계', en: 'Passionate and intense relationships', ja: '情熱的で強烈な関係' } },
      { color: 'orange', text: { ko: '재미있고 활기찬 관계', en: 'Fun and lively relationships', ja: '楽しく活気ある関係' } },
      { color: 'yellow', text: { ko: '지적으로 자극을 주는 관계', en: 'Intellectually stimulating relationships', ja: '知的に刺激し合う関係' } },
      { color: 'green', text: { ko: '깊이 돌보는 헌신적인 관계', en: 'Deeply caring and dedicated relationships', ja: '深く気にかける献身的な関係' } },
      { color: 'blue', text: { ko: '진실하고 신뢰 기반의 관계', en: 'Authentic trust-based relationships', ja: '誠実で信頼に基づく関係' } },
      { color: 'indigo', text: { ko: '영적 연결이 있는 소수의 깊은 관계', en: 'Few deep relationships with spiritual connection', ja: '霊的な繋がりのある少数の深い関係' } },
      { color: 'violet', text: { ko: '영혼의 성장을 함께하는 관계', en: 'Relationships that grow together spiritually', ja: '魂の成長を共にする関係' } },
    ],
  },
  {
    id: 'q13',
    text: {
      ko: '나는 어떤 직업에 끌리는 편인가?',
      en: 'What kind of career am I drawn to?',
      ja: '私はどんな職業に惹かれる傾向がある？',
    },
    options: [
      { color: 'red', text: { ko: '스포츠, 군인, 기업가', en: 'Sports, military, entrepreneur', ja: 'スポーツ、軍人、起業家' } },
      { color: 'orange', text: { ko: '예술가, 연예인, 요리사', en: 'Artist, entertainer, chef', ja: 'アーティスト、エンターテイナー、シェフ' } },
      { color: 'yellow', text: { ko: '과학자, 교수, 작가', en: 'Scientist, professor, writer', ja: '科学者、教授、作家' } },
      { color: 'green', text: { ko: '의사, 상담사, 환경운동가', en: 'Doctor, counselor, environmentalist', ja: '医師、カウンセラー、環境活動家' } },
      { color: 'blue', text: { ko: '저널리스트, 법조인, 사회운동가', en: 'Journalist, lawyer, social activist', ja: 'ジャーナリスト、法律家、社会活動家' } },
      { color: 'indigo', text: { ko: '심리치료사, 철학자, 연구자', en: 'Psychotherapist, philosopher, researcher', ja: '心理療法士、哲学者、研究者' } },
      { color: 'violet', text: { ko: '영적 지도자, 인도주의자, 치유사', en: 'Spiritual leader, humanitarian, healer', ja: '霊的指導者、人道主義者、ヒーラー' } },
    ],
  },
  {
    id: 'q14',
    text: {
      ko: '나는 어떻게 결정을 내리는가?',
      en: 'How do I make decisions?',
      ja: '私はどのように決断を下す？',
    },
    options: [
      { color: 'red', text: { ko: '빠르고 직관적으로 — 생각보다 행동', en: 'Quickly and intuitively — action over thought', ja: '素早く直感的に — 考えるより行動' } },
      { color: 'orange', text: { ko: '감정과 느낌을 따라서', en: 'Following emotions and feelings', ja: '感情と感覚に従って' } },
      { color: 'yellow', text: { ko: '데이터와 논리로 철저히 분석', en: 'Thorough analysis with data and logic', ja: 'データと論理で徹底的に分析' } },
      { color: 'green', text: { ko: '주변 사람들에게 미칠 영향 고려', en: 'Considering the impact on those around me', ja: '周囲の人への影響を考慮して' } },
      { color: 'blue', text: { ko: '내 가치관과 원칙에 따라', en: 'According to my values and principles', ja: '自分の価値観と原則に従って' } },
      { color: 'indigo', text: { ko: '깊은 직관과 내면의 앎에 따라', en: 'According to deep intuition and inner knowing', ja: '深い直感と内なる知識に従って' } },
      { color: 'violet', text: { ko: '더 큰 그림과 목적을 바라보며', en: 'Looking at the bigger picture and purpose', ja: 'より大きな絵と目的を見据えて' } },
    ],
  },
]

interface Props { locale?: string }

export default function ColorAuraTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]

  const [current, setCurrent] = useState(0)
  const [counts, setCounts] = useState<Partial<Record<AuraColor, number>>>({})
  const [result, setResult] = useState<AuraColor | null>(null)

  function pick(color: AuraColor) {
    const newCounts = { ...counts, [color]: (counts[color] ?? 0) + 1 }
    if (current + 1 >= QUESTIONS.length) {
      const dominant = (Object.entries(newCounts) as [AuraColor, number][]).reduce(
        (a, b) => (b[1] > a[1] ? b : a),
        ['red' as AuraColor, 0]
      )[0]
      setResult(dominant)
    }
    setCounts(newCounts)
    setCurrent(current + 1)
  }

  function restart() {
    setCurrent(0)
    setCounts({})
    setResult(null)
  }

  function share() {
    if (!result) return
    const url = window.location.href
    const aura = AURA_DATA[result][locale]
    const text = `${lb.shareMsg} — ${aura.name} (${aura.keyword})`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= QUESTIONS.length

  if (!finished) {
    const q = QUESTIONS[current]
    const progress = Math.round((current / QUESTIONS.length) * 100)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, QUESTIONS.length)}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-medium">{q.text[locale]}</p>
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.choose}</p>
        <div className="grid gap-2">
          {q.options.map((opt) => (
            <button
              key={opt.color}
              onClick={() => pick(opt.color)}
              aria-label={opt.text[locale]}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
            >
              <span
                className="w-4 h-4 rounded-full flex-none"
                style={{ backgroundColor: AURA_DATA[opt.color][locale].hex }}
                aria-hidden="true"
              />
              {opt.text[locale]}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!result) return null
  const aura = AURA_DATA[result][locale]

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">{lb.yourAura}</p>
        <div
          className="inline-flex items-center gap-3 rounded-full px-6 py-3 text-xl font-bold text-white"
          style={{ backgroundColor: aura.hex }}
        >
          <span className="w-5 h-5 rounded-full bg-white/30" aria-hidden="true" />
          {aura.name}
        </div>
        <p className="text-2xl font-bold" style={{ color: aura.hex }}>{aura.keyword}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{aura.description}</p>
      </div>

      <div
        className="rounded-2xl p-6 space-y-3"
        style={{ background: `linear-gradient(135deg, ${aura.hex}15, ${aura.hex}30)`, border: `1px solid ${aura.hex}40` }}
      >
        <div className="flex items-center justify-center">
          <div
            className="w-24 h-24 rounded-full opacity-80"
            style={{ background: `radial-gradient(circle, ${aura.hex}, ${aura.hex}80)` }}
            role="img"
            aria-label={aura.name}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-green-600">{lb.strengths}</h3>
        <ul className="space-y-1">
          {aura.strengths.map(s => (
            <li key={s} className="text-sm text-muted-foreground flex gap-2">
              <span style={{ color: aura.hex }}>→</span>{s}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-amber-600">{lb.challenges}</h3>
        <ul className="space-y-1">
          {aura.challenges.map(c => (
            <li key={c} className="text-sm text-muted-foreground flex gap-2">
              <span>•</span>{c}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ border: `1px solid ${aura.hex}40`, background: `${aura.hex}08` }}
      >
        <p className="text-sm text-center" style={{ color: aura.hex }}>"{aura.affirmation}"</p>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
