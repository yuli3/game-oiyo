import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja'
type BizType = 'innovator' | 'builder' | 'connector' | 'analyst' | 'leader'

function lang(lp: string): Locale {
  return (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
}

interface TypeData {
  name: string
  keyword: string
  color: string
  description: string
  strengths: string[]
  challenges: string[]
  idealRole: string
  famousExample: string
}

const TYPE_DATA: Record<BizType, Record<Locale, TypeData>> = {
  innovator: {
    ko: {
      name: '혁신가', keyword: 'Innovator',
      color: '#f97316',
      description: '당신은 아이디어의 화수분입니다. 새로운 가능성을 보고 기존의 틀을 깨는 것을 즐깁니다. 혁신적인 제품이나 서비스를 만드는 스타트업 창업자 유형입니다.',
      strengths: ['창의적 아이디어 발굴', '변화 수용과 적응력', '미래 트렌드 예측', '선구자적 사고'],
      challenges: ['구체적 실행 계획 수립 어려움', '하나에 집중하기 어려움', '완성보다 시작을 즐김'],
      idealRole: '스타트업 창업자, 제품 디자이너, R&D 리더',
      famousExample: '일론 머스크, 스티브 잡스',
    },
    en: {
      name: 'Innovator', keyword: 'Innovator',
      color: '#f97316',
      description: 'You are an endless source of ideas. You see new possibilities and enjoy breaking existing molds. You\'re the startup founder type who creates innovative products or services.',
      strengths: ['Discovering creative ideas', 'Embracing change and adaptability', 'Predicting future trends', 'Pioneering thinking'],
      challenges: ['Difficulty making concrete execution plans', 'Hard to focus on one thing', 'Prefers starting to finishing'],
      idealRole: 'Startup founder, product designer, R&D leader',
      famousExample: 'Elon Musk, Steve Jobs',
    },
    ja: {
      name: '革新家', keyword: 'Innovator',
      color: '#f97316',
      description: 'あなたはアイデアの泉です。新しい可能性を見つけ、既存の枠を破ることを楽しんでいます。革新的な製品やサービスを生み出すスタートアップ創業者タイプです。',
      strengths: ['創造的なアイデアの発掘', '変化の受容と適応力', '未来のトレンド予測', '先駆的思考'],
      challenges: ['具体的な実行計画の策定が苦手', '一つに集中しにくい', '完成より開始を楽しむ'],
      idealRole: 'スタートアップ創業者、プロダクトデザイナー、R&Dリーダー',
      famousExample: 'イーロン・マスク、スティーブ・ジョブズ',
    },
  },
  builder: {
    ko: {
      name: '구축가', keyword: 'Builder',
      color: '#22c55e',
      description: '당신은 아이디어를 현실로 만드는 사람입니다. 체계적인 시스템과 프로세스를 구축하며, 안정적이고 지속 가능한 비즈니스를 만드는 것을 중요시합니다.',
      strengths: ['탁월한 실행력', '체계적인 시스템 구축', '지속 가능한 성장 추구', '문제 해결 능력'],
      challenges: ['새로운 아이디어에 저항감', '변화 속도에 적응 어려움', '지나친 완벽주의'],
      idealRole: 'COO, 운영 디렉터, 프랜차이즈 사업자',
      famousExample: '워렌 버핏, 제프 베이조스',
    },
    en: {
      name: 'Builder', keyword: 'Builder',
      color: '#22c55e',
      description: 'You turn ideas into reality. You build systematic structures and processes, prioritizing stable and sustainable businesses.',
      strengths: ['Outstanding execution ability', 'Building systematic structures', 'Pursuing sustainable growth', 'Problem-solving skills'],
      challenges: ['Resistance to new ideas', 'Difficulty adapting to fast change', 'Excessive perfectionism'],
      idealRole: 'COO, operations director, franchise operator',
      famousExample: 'Warren Buffett, Jeff Bezos',
    },
    ja: {
      name: '構築家', keyword: 'Builder',
      color: '#22c55e',
      description: 'あなたはアイデアを現実にする人です。体系的なシステムとプロセスを構築し、安定的で持続可能なビジネスを作ることを重要視します。',
      strengths: ['卓越した実行力', '体系的なシステム構築', '持続可能な成長の追求', '問題解決能力'],
      challenges: ['新しいアイデアへの抵抗感', '変化のスピードへの適応が難しい', '過度な完璧主義'],
      idealRole: 'COO、オペレーションディレクター、フランチャイズ経営者',
      famousExample: 'ウォーレン・バフェット、ジェフ・ベゾス',
    },
  },
  connector: {
    ko: {
      name: '연결가', keyword: 'Connector',
      color: '#3b82f6',
      description: '당신의 가장 큰 자산은 사람입니다. 다양한 사람들을 연결하고 협력을 만들어내는 능력이 탁월합니다. 네트워크 기반의 비즈니스나 중개 비즈니스에 강합니다.',
      strengths: ['뛰어난 네트워킹 능력', '관계 형성과 유지', '협력 창출 능력', '대화와 설득력'],
      challenges: ['혼자서 해결해야 할 때 어려움', '관계에 지나치게 의존', '경계 설정 어려움'],
      idealRole: '세일즈 리더, 파트너십 매니저, 커뮤니티 빌더',
      famousExample: '리처드 브랜슨, 오프라 윈프리',
    },
    en: {
      name: 'Connector', keyword: 'Connector',
      color: '#3b82f6',
      description: 'Your greatest asset is people. You excel at connecting diverse individuals and creating collaboration. You thrive in network-based or intermediary businesses.',
      strengths: ['Outstanding networking ability', 'Building and maintaining relationships', 'Collaboration creation', 'Persuasion and communication'],
      challenges: ['Difficulty working alone', 'Over-relying on relationships', 'Setting boundaries'],
      idealRole: 'Sales leader, partnership manager, community builder',
      famousExample: 'Richard Branson, Oprah Winfrey',
    },
    ja: {
      name: 'コネクター', keyword: 'Connector',
      color: '#3b82f6',
      description: 'あなたの最大の資産は人です。多様な人々を繋げ、協力関係を生み出す能力が卓越しています。ネットワーク型ビジネスや仲介ビジネスに強みを持ちます。',
      strengths: ['優れたネットワーキング能力', '関係の形成と維持', '協力関係の創出', '対話と説得力'],
      challenges: ['一人で解決しなければならない時の困難', '関係への過度な依存', '境界設定が難しい'],
      idealRole: 'セールスリーダー、パートナーシップマネージャー、コミュニティビルダー',
      famousExample: 'リチャード・ブランソン、オプラ・ウィンフリー',
    },
  },
  analyst: {
    ko: {
      name: '분석가', keyword: 'Analyst',
      color: '#6366f1',
      description: '당신은 데이터와 사실에 기반해 의사결정을 내립니다. 시장 조사, 재무 분석, 전략 수립에 탁월하며, 리스크를 최소화하는 방식으로 사업을 운영합니다.',
      strengths: ['데이터 기반 의사결정', '리스크 관리 능력', '전략적 사고', '정확한 시장 분석'],
      challenges: ['결정 지연 (과분석)', '감으로 움직이는 상황에 불안감', '지나치게 보수적 접근'],
      idealRole: 'CFO, 전략 컨설턴트, 핀테크 창업자',
      famousExample: '피터 린치, 레이 달리오',
    },
    en: {
      name: 'Analyst', keyword: 'Analyst',
      color: '#6366f1',
      description: 'You make decisions based on data and facts. You excel at market research, financial analysis, and strategy, running businesses in a risk-minimizing way.',
      strengths: ['Data-driven decision making', 'Risk management', 'Strategic thinking', 'Precise market analysis'],
      challenges: ['Decision delays from over-analysis', 'Discomfort in gut-feeling situations', 'Overly conservative approach'],
      idealRole: 'CFO, strategy consultant, fintech founder',
      famousExample: 'Peter Lynch, Ray Dalio',
    },
    ja: {
      name: 'アナリスト', keyword: 'Analyst',
      color: '#6366f1',
      description: 'あなたはデータと事実に基づいて意思決定を行います。市場調査、財務分析、戦略立案に優れ、リスクを最小化する方法でビジネスを運営します。',
      strengths: ['データ主導の意思決定', 'リスク管理能力', '戦略的思考', '精確な市場分析'],
      challenges: ['過分析による決断の遅れ', '感覚に頼る状況での不安', '過度に保守的なアプローチ'],
      idealRole: 'CFO、戦略コンサルタント、フィンテック創業者',
      famousExample: 'ピーター・リンチ、レイ・ダリオ',
    },
  },
  leader: {
    ko: {
      name: '리더', keyword: 'Leader',
      color: '#ef4444',
      description: '당신은 사람들을 이끌고 비전을 향해 나아가게 하는 타고난 리더입니다. 팀을 구성하고 동기부여하는 능력이 탁월하며, 큰 그림을 그리고 실행합니다.',
      strengths: ['강한 리더십과 카리스마', '비전 설정과 전달', '팀 동기부여 능력', '결단력'],
      challenges: ['위임에 어려움', '독단적 결정 주의', '팀원과의 소통 부족'],
      idealRole: 'CEO, 사업부장, 소셜 임팩트 창업자',
      famousExample: '잭 웰치, 인드라 누이',
    },
    en: {
      name: 'Leader', keyword: 'Leader',
      color: '#ef4444',
      description: 'You are a born leader who guides people toward a vision. You excel at building and motivating teams, painting the big picture and executing it.',
      strengths: ['Strong leadership and charisma', 'Setting and communicating vision', 'Team motivation', 'Decisiveness'],
      challenges: ['Difficulty delegating', 'Risk of unilateral decisions', 'Insufficient communication with team'],
      idealRole: 'CEO, division head, social impact founder',
      famousExample: 'Jack Welch, Indra Nooyi',
    },
    ja: {
      name: 'リーダー', keyword: 'Leader',
      color: '#ef4444',
      description: 'あなたは人々をビジョンに向かって導く生まれつきのリーダーです。チームを構成し動機づける能力に優れ、大きな絵を描いて実行します。',
      strengths: ['強いリーダーシップとカリスマ', 'ビジョンの設定と伝達', 'チームの動機づけ能力', '決断力'],
      challenges: ['委任の困難さ', '独断的な決定に注意', 'チームメンバーとのコミュニケーション不足'],
      idealRole: 'CEO、事業部長、ソーシャルインパクト創業者',
      famousExample: 'ジャック・ウェルチ、インドラ・ヌーイ',
    },
  },
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  restart: string
  share: string
  shareMsg: string
  yourType: string
  strengths: string
  challenges: string
  idealRole: string
  famousExample: string
  note: string
  dimLabel: string
  choose: string
}> = {
  ko: {
    title: '창업 성향 테스트',
    subtitle: '나는 어떤 사업가 유형인가?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 창업 유형은',
    yourType: '나의 창업 유형',
    strengths: '강점',
    challenges: '주의할 점',
    idealRole: '어울리는 역할',
    famousExample: '유명 사례',
    note: '이 테스트는 창업 심리를 탐색하는 도구입니다.',
    dimLabel: '5가지 유형 성향 분포',
    choose: '가장 나답다고 느끼는 답변을 선택하세요',
  },
  en: {
    title: 'Business Type Test',
    subtitle: 'What kind of entrepreneur am I?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My entrepreneurship type is',
    yourType: 'My Business Type',
    strengths: 'Strengths',
    challenges: 'Points to Watch',
    idealRole: 'Ideal Role',
    famousExample: 'Famous Examples',
    note: 'This test is a tool for exploring entrepreneurial psychology.',
    dimLabel: '5-Type Tendency Distribution',
    choose: 'Choose the answer that feels most like you',
  },
  ja: {
    title: '起業タイプテスト',
    subtitle: '私はどんなビジネスパーソンタイプ？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の起業タイプは',
    yourType: '私のビジネスタイプ',
    strengths: '強み',
    challenges: '注意点',
    idealRole: '向いている役割',
    famousExample: '有名な例',
    note: 'このテストは起業心理を探索するツールです。',
    dimLabel: '5タイプの傾向分布',
    choose: '最も自分らしいと感じる答えを選んでください',
  },
}

interface Question {
  id: string
  text: Record<Locale, string>
  options: Array<{ type: BizType; text: Record<Locale, string> }>
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: { ko: '새로운 사업 기회를 발견했을 때 나는?', en: 'When I discover a new business opportunity, I:', ja: '新しいビジネス機会を発見した時、私は？' },
    options: [
      { type: 'innovator', text: { ko: '즉시 아이디어를 발전시키고 프로토타입을 만든다', en: 'Immediately develop the idea and create a prototype', ja: 'すぐにアイデアを発展させてプロトタイプを作る' } },
      { type: 'builder', text: { ko: '사업 계획서와 실행 로드맵을 작성한다', en: 'Write a business plan and execution roadmap', ja: '事業計画書と実行ロードマップを作成する' } },
      { type: 'connector', text: { ko: '관련 전문가와 파트너를 찾아 연결한다', en: 'Find and connect relevant experts and partners', ja: '関連する専門家とパートナーを探して繋げる' } },
      { type: 'analyst', text: { ko: '시장 규모와 경쟁사를 분석한다', en: 'Analyze market size and competitors', ja: '市場規模と競合他社を分析する' } },
      { type: 'leader', text: { ko: '팀을 구성하고 비전을 공유한다', en: 'Build a team and share the vision', ja: 'チームを構成してビジョンを共有する' } },
    ],
  },
  {
    id: 'q2',
    text: { ko: '팀에서 내가 가장 잘하는 것은?', en: 'What I do best in a team is:', ja: 'チームで私が最も得意なことは？' },
    options: [
      { type: 'innovator', text: { ko: '아무도 생각 못한 창의적 솔루션 제시', en: 'Proposing creative solutions no one else thought of', ja: '誰も思いつかなかったクリエイティブな解決策の提示' } },
      { type: 'builder', text: { ko: '복잡한 프로젝트를 체계적으로 완수', en: 'Systematically completing complex projects', ja: '複雑なプロジェクトを体系的に完遂する' } },
      { type: 'connector', text: { ko: '모든 사람이 잘 협력하도록 조율', en: 'Coordinating everyone to collaborate well', ja: 'みんながうまく協力するよう調整する' } },
      { type: 'analyst', text: { ko: '데이터로 최적의 결정 도출', en: 'Deriving optimal decisions from data', ja: 'データから最適な決定を導き出す' } },
      { type: 'leader', text: { ko: '팀을 목표를 향해 이끌고 동기부여', en: 'Leading and motivating the team toward goals', ja: 'チームを目標に向けて導き動機づける' } },
    ],
  },
  {
    id: 'q3',
    text: { ko: '나의 결정 방식은?', en: 'My decision-making style is:', ja: '私の意思決定スタイルは？' },
    options: [
      { type: 'innovator', text: { ko: '직감과 영감을 따른다', en: 'Follow intuition and inspiration', ja: '直感とインスピレーションに従う' } },
      { type: 'builder', text: { ko: '검증된 프로세스와 경험에 따른다', en: 'Follow proven processes and experience', ja: '実証されたプロセスと経験に従う' } },
      { type: 'connector', text: { ko: '주변의 의견을 수렴해 결정한다', en: 'Gather input from others to decide', ja: '周囲の意見を集めて決める' } },
      { type: 'analyst', text: { ko: '충분한 데이터와 분석 후 결정한다', en: 'Decide after sufficient data and analysis', ja: '十分なデータと分析の後に決める' } },
      { type: 'leader', text: { ko: '비전과 큰 그림에 따라 빠르게 결정', en: 'Decide quickly based on vision and big picture', ja: 'ビジョンと大きな絵に基づいて迅速に決断する' } },
    ],
  },
  {
    id: 'q4',
    text: { ko: '가장 두려운 사업 실패 원인은?', en: 'The business failure cause I fear most:', ja: '最も恐れる事業失敗の原因は？' },
    options: [
      { type: 'innovator', text: { ko: '아이디어가 이미 있는 것과 같을 때', en: 'When the idea already exists', ja: 'アイデアが既に存在する時' } },
      { type: 'builder', text: { ko: '실행 과정에서 시스템이 무너질 때', en: 'When the system breaks down during execution', ja: '実行過程でシステムが崩れる時' } },
      { type: 'connector', text: { ko: '핵심 파트너나 팀이 이탈할 때', en: 'When key partners or team members leave', ja: '重要なパートナーやチームが離れる時' } },
      { type: 'analyst', text: { ko: '예측하지 못한 시장 리스크가 터질 때', en: 'When unexpected market risks materialize', ja: '予測できなかった市場リスクが顕在化する時' } },
      { type: 'leader', text: { ko: '팀이 비전을 믿지 않게 될 때', en: 'When the team stops believing in the vision', ja: 'チームがビジョンを信じなくなる時' } },
    ],
  },
  {
    id: 'q5',
    text: { ko: '나는 어떤 사업 모델에 끌리나?', en: 'What business model attracts me?', ja: '私はどんなビジネスモデルに惹かれる？' },
    options: [
      { type: 'innovator', text: { ko: '세상에 없던 새로운 제품/서비스', en: 'A product/service that has never existed', ja: '世にない新しい製品・サービス' } },
      { type: 'builder', text: { ko: '안정적이고 검증된 비즈니스 모델', en: 'Stable and proven business model', ja: '安定的で実証されたビジネスモデル' } },
      { type: 'connector', text: { ko: '사람과 사람을 연결하는 플랫폼', en: 'A platform connecting people', ja: '人と人を繋げるプラットフォーム' } },
      { type: 'analyst', text: { ko: '데이터와 기술 기반의 솔루션', en: 'Data and technology-based solutions', ja: 'データと技術に基づくソリューション' } },
      { type: 'leader', text: { ko: '사회적 임팩트가 있는 대형 프로젝트', en: 'Large projects with social impact', ja: '社会的インパクトのある大型プロジェクト' } },
    ],
  },
  {
    id: 'q6',
    text: { ko: '투자자 앞에서 나는?', en: 'In front of investors, I:', ja: '投資家の前で私は？' },
    options: [
      { type: 'innovator', text: { ko: '혁신적인 비전과 가능성을 강조한다', en: 'Emphasize innovative vision and potential', ja: '革新的なビジョンと可能性を強調する' } },
      { type: 'builder', text: { ko: '구체적인 실행 계획과 마일스톤을 보여준다', en: 'Show concrete execution plans and milestones', ja: '具体的な実行計画とマイルストーンを見せる' } },
      { type: 'connector', text: { ko: '팀과 네트워크의 강점을 부각한다', en: 'Highlight team and network strengths', ja: 'チームとネットワークの強みを際立たせる' } },
      { type: 'analyst', text: { ko: '시장 데이터와 수익성 분석을 제시한다', en: 'Present market data and profitability analysis', ja: '市場データと収益性分析を提示する' } },
      { type: 'leader', text: { ko: '나와 팀의 역량과 리더십을 어필한다', en: 'Appeal to my and the team\'s capability and leadership', ja: '自分とチームの能力とリーダーシップをアピールする' } },
    ],
  },
  {
    id: 'q7',
    text: { ko: '사업 초기, 나의 첫 번째 행동은?', en: 'At the start of a business, my first action is:', ja: '事業初期、私の最初のアクションは？' },
    options: [
      { type: 'innovator', text: { ko: '최소 기능 제품(MVP)을 빠르게 만든다', en: 'Quickly build a minimum viable product (MVP)', ja: '最小機能製品（MVP）を素早く作る' } },
      { type: 'builder', text: { ko: '운영 프로세스와 내부 시스템을 구축한다', en: 'Build operational processes and internal systems', ja: '運営プロセスと内部システムを構築する' } },
      { type: 'connector', text: { ko: '잠재 고객과 파트너를 만나러 다닌다', en: 'Go out to meet potential customers and partners', ja: '潜在顧客とパートナーに会いに行く' } },
      { type: 'analyst', text: { ko: '경쟁 분석과 시장 조사를 심도 있게 한다', en: 'Do in-depth competitive analysis and market research', ja: '競合分析と市場調査を深く行う' } },
      { type: 'leader', text: { ko: '핵심 팀원을 모집하고 조직 문화를 만든다', en: 'Recruit key team members and build organizational culture', ja: 'コアチームメンバーを採用して組織文化を作る' } },
    ],
  },
  {
    id: 'q8',
    text: { ko: '나는 경쟁자를 어떻게 바라보나?', en: 'How do I view competitors?', ja: '私は競合をどう見る？' },
    options: [
      { type: 'innovator', text: { ko: '경쟁은 내가 더 혁신해야 한다는 신호', en: 'Competition signals I need to innovate more', ja: '競争はもっと革新しなければならないサイン' } },
      { type: 'builder', text: { ko: '경쟁자를 분석해 프로세스를 개선한다', en: 'Analyze competitors to improve my processes', ja: '競合を分析してプロセスを改善する' } },
      { type: 'connector', text: { ko: '때로는 경쟁자도 파트너가 될 수 있다', en: 'Sometimes competitors can become partners', ja: '時には競合もパートナーになれる' } },
      { type: 'analyst', text: { ko: '경쟁 데이터로 전략적 포지셔닝을 찾는다', en: 'Use competition data to find strategic positioning', ja: '競合データで戦略的ポジショニングを見つける' } },
      { type: 'leader', text: { ko: '경쟁을 두려워하지 않고 더 큰 비전으로 앞선다', en: 'Lead with a bigger vision rather than fearing competition', ja: '競争を恐れずより大きなビジョンで先行する' } },
    ],
  },
  {
    id: 'q9',
    text: { ko: '사업 성공을 어떻게 정의하나?', en: 'How do I define business success?', ja: '事業成功をどう定義する？' },
    options: [
      { type: 'innovator', text: { ko: '세상을 바꾸는 혁신을 만들어냈을 때', en: 'When I create an innovation that changes the world', ja: '世界を変える革新を生み出した時' } },
      { type: 'builder', text: { ko: '안정적이고 지속 가능한 수익 구조가 될 때', en: 'When a stable and sustainable revenue structure is achieved', ja: '安定的で持続可能な収益構造になった時' } },
      { type: 'connector', text: { ko: '의미 있는 생태계와 커뮤니티를 만들었을 때', en: 'When I build a meaningful ecosystem and community', ja: '意味のあるエコシステムとコミュニティを作った時' } },
      { type: 'analyst', text: { ko: '목표 수익과 성장률을 초과 달성했을 때', en: 'When I exceed target revenue and growth rate', ja: '目標収益と成長率を超達成した時' } },
      { type: 'leader', text: { ko: '훌륭한 팀을 이끌어 큰 임팩트를 냈을 때', en: 'When I lead a great team and create big impact', ja: '優秀なチームを率いて大きなインパクトを生み出した時' } },
    ],
  },
  {
    id: 'q10',
    text: { ko: '스트레스를 받을 때 나는?', en: 'When stressed, I:', ja: 'ストレスを感じた時、私は？' },
    options: [
      { type: 'innovator', text: { ko: '새로운 것을 만들며 에너지를 발산한다', en: 'Release energy by creating something new', ja: '新しいものを作ってエネルギーを発散する' } },
      { type: 'builder', text: { ko: '체크리스트를 만들고 하나씩 해결한다', en: 'Make a checklist and solve one by one', ja: 'チェックリストを作って一つずつ解決する' } },
      { type: 'connector', text: { ko: '신뢰하는 사람들과 이야기를 나눈다', en: 'Talk with people I trust', ja: '信頼できる人たちと話し合う' } },
      { type: 'analyst', text: { ko: '문제를 분석하고 시나리오를 그린다', en: 'Analyze the problem and map out scenarios', ja: '問題を分析してシナリオを描く' } },
      { type: 'leader', text: { ko: '팀에게 동기부여가 되는 말을 하며 이끈다', en: 'Lead by saying motivating words to the team', ja: 'チームを励ます言葉を言いながら引っ張る' } },
    ],
  },
  {
    id: 'q11',
    text: { ko: '나는 자금 조달을 어떻게 접근하나?', en: 'How do I approach fundraising?', ja: '私は資金調達をどうアプローチする？' },
    options: [
      { type: 'innovator', text: { ko: '혁신적인 스토리로 VC를 설득한다', en: 'Persuade VCs with an innovative story', ja: '革新的なストーリーでVCを説得する' } },
      { type: 'builder', text: { ko: '수익 모델을 먼저 증명하고 투자를 받는다', en: 'Prove the revenue model first, then raise investment', ja: '収益モデルを先に証明してから投資を受ける' } },
      { type: 'connector', text: { ko: '네트워크를 통해 자연스럽게 투자자를 만난다', en: 'Meet investors naturally through the network', ja: 'ネットワークを通じて自然に投資家と出会う' } },
      { type: 'analyst', text: { ko: '재무 모델과 ROI 분석으로 설득한다', en: 'Persuade with financial models and ROI analysis', ja: '財務モデルとROI分析で説得する' } },
      { type: 'leader', text: { ko: '팀의 역량과 비전으로 신뢰를 쌓는다', en: 'Build trust through team capability and vision', ja: 'チームの能力とビジョンで信頼を築く' } },
    ],
  },
  {
    id: 'q12',
    text: { ko: '고객과의 관계에서 가장 중요한 것은?', en: 'What\'s most important in customer relationships?', ja: '顧客との関係で最も重要なことは？' },
    options: [
      { type: 'innovator', text: { ko: '고객이 아직 느끼지 못한 니즈를 먼저 발견', en: 'Discover customer needs they haven\'t felt yet', ja: '顧客がまだ感じていないニーズを先に発見する' } },
      { type: 'builder', text: { ko: '일관된 품질과 신뢰할 수 있는 서비스', en: 'Consistent quality and reliable service', ja: '一貫した品質と信頼できるサービス' } },
      { type: 'connector', text: { ko: '장기적인 신뢰 관계와 커뮤니티 형성', en: 'Long-term trust relationships and community building', ja: '長期的な信頼関係とコミュニティ形成' } },
      { type: 'analyst', text: { ko: '데이터로 고객 행동을 이해하고 최적화', en: 'Understanding and optimizing customer behavior with data', ja: 'データで顧客行動を理解して最適化する' } },
      { type: 'leader', text: { ko: '고객을 브랜드 미션의 일부로 만들기', en: 'Making customers part of the brand mission', ja: '顧客をブランドミッションの一部にする' } },
    ],
  },
  {
    id: 'q13',
    text: { ko: '나의 리더십 스타일은?', en: 'My leadership style is:', ja: '私のリーダーシップスタイルは？' },
    options: [
      { type: 'innovator', text: { ko: '자유롭고 창의적인 환경을 만든다', en: 'Create a free and creative environment', ja: '自由でクリエイティブな環境を作る' } },
      { type: 'builder', text: { ko: '명확한 역할과 책임을 부여한다', en: 'Assign clear roles and responsibilities', ja: '明確な役割と責任を与える' } },
      { type: 'connector', text: { ko: '모두가 참여하는 협력적 문화를 만든다', en: 'Create a collaborative culture where everyone participates', ja: '全員が参加する協力的な文化を作る' } },
      { type: 'analyst', text: { ko: '성과 지표로 객관적으로 관리한다', en: 'Manage objectively with performance metrics', ja: '成果指標で客観的に管理する' } },
      { type: 'leader', text: { ko: '강한 비전으로 팀을 하나로 결집한다', en: 'Unite the team with a strong vision', ja: '強いビジョンでチームを一つにまとめる' } },
    ],
  },
  {
    id: 'q14',
    text: { ko: '경기 침체기에 나는?', en: 'During an economic downturn, I:', ja: '経済低迷期、私は？' },
    options: [
      { type: 'innovator', text: { ko: '위기를 기회로 보고 새로운 혁신을 시도', en: 'See the crisis as opportunity and attempt new innovation', ja: '危機を機会として新しい革新を試みる' } },
      { type: 'builder', text: { ko: '비용을 최적화하고 핵심 사업을 지킨다', en: 'Optimize costs and protect the core business', ja: 'コストを最適化してコアビジネスを守る' } },
      { type: 'connector', text: { ko: '파트너십을 통해 리소스를 공유한다', en: 'Share resources through partnerships', ja: 'パートナーシップを通じてリソースを共有する' } },
      { type: 'analyst', text: { ko: '시나리오 플래닝으로 리스크를 관리한다', en: 'Manage risk with scenario planning', ja: 'シナリオプランニングでリスクを管理する' } },
      { type: 'leader', text: { ko: '팀의 사기를 높이고 방향을 명확히 한다', en: 'Boost team morale and clarify direction', ja: 'チームの士気を高めて方向性を明確にする' } },
    ],
  },
  {
    id: 'q15',
    text: { ko: '나에게 가장 큰 동기부여는?', en: 'What motivates me most?', ja: '私への最大の動機付けは？' },
    options: [
      { type: 'innovator', text: { ko: '세상에 없던 것을 만들어내는 창조의 기쁨', en: 'Joy of creating what has never existed', ja: '世にないものを生み出す創造の喜び' } },
      { type: 'builder', text: { ko: '안정적으로 성장하는 사업을 보는 뿌듯함', en: 'Pride in seeing the business grow stably', ja: '安定して成長する事業を見る誇り' } },
      { type: 'connector', text: { ko: '사람들이 함께 성장하는 것을 보는 보람', en: 'Fulfillment in seeing people grow together', ja: '人々が共に成長するのを見る喜び' } },
      { type: 'analyst', text: { ko: '정확한 분석으로 올바른 결정을 내린 만족감', en: 'Satisfaction from making right decisions with accurate analysis', ja: '正確な分析で正しい決断を下した満足感' } },
      { type: 'leader', text: { ko: '팀이 함께 큰 목표를 달성하는 성취감', en: 'Sense of achievement when the team accomplishes big goals together', ja: 'チームが共に大きな目標を達成する達成感' } },
    ],
  },
]

const BIZ_TYPES: BizType[] = ['innovator', 'builder', 'connector', 'analyst', 'leader']

interface Props { locale?: string }

export default function BusinessTypeTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]

  const [current, setCurrent] = useState(0)
  const [counts, setCounts] = useState<Partial<Record<BizType, number>>>({})
  const [result, setResult] = useState<BizType | null>(null)

  function pick(type: BizType) {
    const newCounts = { ...counts, [type]: (counts[type] ?? 0) + 1 }
    if (current + 1 >= QUESTIONS.length) {
      const dominant = BIZ_TYPES.reduce(
        (a, t) => ((newCounts[t] ?? 0) > (newCounts[a] ?? 0) ? t : a),
        'innovator' as BizType
      )
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
    const t = TYPE_DATA[result][locale]
    const text = `${lb.shareMsg} — ${t.name} (${t.keyword})`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= QUESTIONS.length

  if (finished && result) {
    const t = TYPE_DATA[result][locale]
    const total = QUESTIONS.length

    return (
      <div className="space-y-6" aria-live="polite">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-sm text-muted-foreground">{lb.yourType}</p>
          <div
            className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
            style={{ backgroundColor: t.color }}
          >
            {t.name}
          </div>
          <p className="text-lg font-bold" style={{ color: t.color }}>{t.keyword}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">{lb.dimLabel}</h3>
          {BIZ_TYPES.map(bt => {
            const count = counts[bt] ?? 0
            const pct = Math.round((count / total) * 100)
            const d = TYPE_DATA[bt][locale]
            return (
              <div key={bt} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{d.name}</span>
                  <span className="font-bold" style={{ color: d.color }}>{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: d.color }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={d.name}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-green-600">{lb.strengths}</h3>
          <ul className="space-y-1">
            {t.strengths.map(s => (
              <li key={s} className="text-sm text-muted-foreground flex gap-2">
                <span style={{ color: t.color }}>→</span>{s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-amber-600">{lb.challenges}</h3>
          <ul className="space-y-1">
            {t.challenges.map(c => (
              <li key={c} className="text-sm text-muted-foreground flex gap-2">
                <span>•</span>{c}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{lb.idealRole}</span>
            <span className="text-sm text-muted-foreground">{t.idealRole}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{lb.famousExample}</span>
            <span className="text-sm text-muted-foreground">{t.famousExample}</span>
          </div>
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
        {q.options.map(opt => (
          <button
            key={opt.type}
            onClick={() => pick(opt.type)}
            aria-label={opt.text[locale]}
            className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors"
          >
            {opt.text[locale]}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
    </div>
  )
}
