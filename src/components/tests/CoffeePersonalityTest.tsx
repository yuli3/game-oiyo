import { useState } from 'react'

type CoffeeType = 'espresso' | 'latte' | 'coldbrew' | 'cappuccino' | 'americano'
type SupportedLang = 'ko' | 'en' | 'ja'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Option {
  label: string
  type: CoffeeType
}

interface Question {
  id: string
  text: string
  options: Option[]
}

interface ResultData {
  emoji: string
  title: string
  tagline: string
  description: string
  traits: string[]
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  restart: string
  share: string
  shareMsg: string
  yourType: string
  traits: string
  note: string
  copied: string
}> = {
  ko: {
    title: '커피 성격 테스트',
    subtitle: '나는 어떤 커피 타입?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 커피 성격 유형은',
    yourType: '나의 커피 타입',
    traits: '나의 특성',
    note: '가장 많이 선택된 커피 유형이 당신의 성격을 나타냅니다.',
    copied: '링크가 복사되었습니다!',
  },
  en: {
    title: 'Coffee Personality Test',
    subtitle: 'Which coffee type are you?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My coffee personality type is',
    yourType: 'Your Coffee Type',
    traits: 'Your Traits',
    note: 'The coffee type you chose most often reflects your personality.',
    copied: 'Link copied!',
  },
  ja: {
    title: 'コーヒー性格テスト',
    subtitle: 'あなたはどのコーヒータイプ？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のコーヒー性格タイプは',
    yourType: '私のコーヒータイプ',
    traits: '私の特性',
    note: '最も多く選んだコーヒータイプがあなたの性格を表します。',
    copied: 'リンクがコピーされました！',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    {
      id: 'q1',
      text: '아침을 어떻게 시작하는 것을 선호하나요?',
      options: [
        { label: '빠른 에너지 충전', type: 'espresso' },
        { label: '느리고 아늑하게', type: 'latte' },
        { label: '부드럽고 여유롭게', type: 'coldbrew' },
        { label: '완벽하게 준비된 의식', type: 'cappuccino' },
        { label: '단순하고 믿을 수 있게', type: 'americano' },
      ],
    },
    {
      id: 'q2',
      text: '이상적인 주말 활동은?',
      options: [
        { label: '빠른 페이스의 모험', type: 'espresso' },
        { label: '친구들과 카페', type: 'latte' },
        { label: '편안한 야외 시간', type: 'coldbrew' },
        { label: '집에서 창작 프로젝트', type: 'cappuccino' },
        { label: '생산적인 작업 시간', type: 'americano' },
      ],
    },
    {
      id: 'q3',
      text: '친구들이 당신을 어떻게 묘사하나요?',
      options: [
        { label: '강렬하고 추진력 있는', type: 'espresso' },
        { label: '따뜻하고 사교적인', type: 'latte' },
        { label: '느긋하고 여유로운', type: 'coldbrew' },
        { label: '예술적이고 독특한', type: 'cappuccino' },
        { label: '믿을 수 있고 클래식한', type: 'americano' },
      ],
    },
    {
      id: 'q4',
      text: '도전에 대한 접근 방식은?',
      options: [
        { label: '정면으로 전속력으로', type: 'espresso' },
        { label: '다른 사람과 협력', type: 'latte' },
        { label: '천천히 침착하게', type: 'coldbrew' },
        { label: '창의적 솔루션 찾기', type: 'cappuccino' },
        { label: '검증된 방법 사용', type: 'americano' },
      ],
    },
    {
      id: 'q5',
      text: '이상적인 사교 환경은?',
      options: [
        { label: '에너지 넘치는 네트워킹', type: 'espresso' },
        { label: '아늑한 모임', type: 'latte' },
        { label: '소규모 친밀한 그룹', type: 'coldbrew' },
        { label: '갤러리나 콘서트', type: 'cappuccino' },
        { label: '전문적인 만남', type: 'americano' },
      ],
    },
    {
      id: 'q6',
      text: '선호하는 작업 스타일은?',
      options: [
        { label: '강렬한 생산성 폭발', type: 'espresso' },
        { label: '꾸준한 협업 흐름', type: 'latte' },
        { label: '차분하고 지속적인 집중', type: 'coldbrew' },
        { label: '창의적 탐험', type: 'cappuccino' },
        { label: '체계적이고 효율적', type: 'americano' },
      ],
    },
    {
      id: 'q7',
      text: '무엇이 가장 큰 에너지를 주나요?',
      options: [
        { label: '경쟁과 승리', type: 'espresso' },
        { label: '사람들과의 연결', type: 'latte' },
        { label: '평화와 고요함', type: 'coldbrew' },
        { label: '창의적 표현', type: 'cappuccino' },
        { label: '목표 달성', type: 'americano' },
      ],
    },
    {
      id: 'q8',
      text: '당신의 인생 좌우명은?',
      options: [
        { label: '크게 하거나 집에 가거나', type: 'espresso' },
        { label: '인생은 함께할 때 더 좋다', type: 'latte' },
        { label: '여유롭게 즐기자', type: 'coldbrew' },
        { label: '대담하게 표현하라', type: 'cappuccino' },
        { label: '단순하게 진실하게', type: 'americano' },
      ],
    },
  ],
  en: [
    {
      id: 'q1',
      text: 'How do you prefer to start your morning?',
      options: [
        { label: 'Quick energy boost', type: 'espresso' },
        { label: 'Slow and cozy', type: 'latte' },
        { label: 'Smooth and relaxed', type: 'coldbrew' },
        { label: 'A perfectly prepared ritual', type: 'cappuccino' },
        { label: 'Simple and reliable', type: 'americano' },
      ],
    },
    {
      id: 'q2',
      text: "What's your ideal weekend activity?",
      options: [
        { label: 'Fast-paced adventure', type: 'espresso' },
        { label: 'Café time with friends', type: 'latte' },
        { label: 'Relaxed time outdoors', type: 'coldbrew' },
        { label: 'Creative project at home', type: 'cappuccino' },
        { label: 'Productive work session', type: 'americano' },
      ],
    },
    {
      id: 'q3',
      text: 'How would friends describe you?',
      options: [
        { label: 'Intense and driven', type: 'espresso' },
        { label: 'Warm and social', type: 'latte' },
        { label: 'Laid-back and easy-going', type: 'coldbrew' },
        { label: 'Artistic and unique', type: 'cappuccino' },
        { label: 'Reliable and classic', type: 'americano' },
      ],
    },
    {
      id: 'q4',
      text: 'How do you approach a challenge?',
      options: [
        { label: 'Head-on at full speed', type: 'espresso' },
        { label: 'Collaborate with others', type: 'latte' },
        { label: 'Slowly and calmly', type: 'coldbrew' },
        { label: 'Find a creative solution', type: 'cappuccino' },
        { label: 'Use proven methods', type: 'americano' },
      ],
    },
    {
      id: 'q5',
      text: "What's your ideal social setting?",
      options: [
        { label: 'High-energy networking', type: 'espresso' },
        { label: 'A cozy gathering', type: 'latte' },
        { label: 'A small intimate group', type: 'coldbrew' },
        { label: 'A gallery or concert', type: 'cappuccino' },
        { label: 'A professional meeting', type: 'americano' },
      ],
    },
    {
      id: 'q6',
      text: 'What is your preferred work style?',
      options: [
        { label: 'Intense bursts of productivity', type: 'espresso' },
        { label: 'Steady collaborative flow', type: 'latte' },
        { label: 'Calm sustained focus', type: 'coldbrew' },
        { label: 'Creative exploration', type: 'cappuccino' },
        { label: 'Structured and efficient', type: 'americano' },
      ],
    },
    {
      id: 'q7',
      text: 'What gives you the most energy?',
      options: [
        { label: 'Competition and winning', type: 'espresso' },
        { label: 'Connecting with people', type: 'latte' },
        { label: 'Peace and quiet', type: 'coldbrew' },
        { label: 'Creative expression', type: 'cappuccino' },
        { label: 'Achieving goals', type: 'americano' },
      ],
    },
    {
      id: 'q8',
      text: "What's your life motto?",
      options: [
        { label: 'Go big or go home', type: 'espresso' },
        { label: 'Life is better together', type: 'latte' },
        { label: 'Take it easy and enjoy', type: 'coldbrew' },
        { label: 'Express yourself boldly', type: 'cappuccino' },
        { label: 'Keep it simple and true', type: 'americano' },
      ],
    },
  ],
  ja: [
    {
      id: 'q1',
      text: '朝はどのように始めることを好みますか？',
      options: [
        { label: 'すばやくエネルギー補給', type: 'espresso' },
        { label: 'ゆっくりくつろいで', type: 'latte' },
        { label: 'なめらかにのんびりと', type: 'coldbrew' },
        { label: '完璧に準備された儀式', type: 'cappuccino' },
        { label: 'シンプルで安定して', type: 'americano' },
      ],
    },
    {
      id: 'q2',
      text: '理想の週末の過ごし方は？',
      options: [
        { label: 'スピーディな冒険', type: 'espresso' },
        { label: '友達とカフェで過ごす', type: 'latte' },
        { label: 'リラックスした屋外の時間', type: 'coldbrew' },
        { label: '家でクリエイティブな制作', type: 'cappuccino' },
        { label: '生産的な作業時間', type: 'americano' },
      ],
    },
    {
      id: 'q3',
      text: '友人はあなたをどう表現しますか？',
      options: [
        { label: '情熱的で推進力がある', type: 'espresso' },
        { label: '温かく社交的', type: 'latte' },
        { label: 'のんびりとゆったりした', type: 'coldbrew' },
        { label: '芸術的でユニーク', type: 'cappuccino' },
        { label: '信頼できてクラシック', type: 'americano' },
      ],
    },
    {
      id: 'q4',
      text: '課題へのアプローチは？',
      options: [
        { label: '真っ向勝負で全力疾走', type: 'espresso' },
        { label: '他の人と協力して取り組む', type: 'latte' },
        { label: 'ゆっくり落ち着いて', type: 'coldbrew' },
        { label: 'クリエイティブな解決策を探す', type: 'cappuccino' },
        { label: '実証済みの方法を使う', type: 'americano' },
      ],
    },
    {
      id: 'q5',
      text: '理想の社交環境は？',
      options: [
        { label: 'エネルギッシュなネットワーキング', type: 'espresso' },
        { label: 'アットホームな集まり', type: 'latte' },
        { label: '少人数の親密なグループ', type: 'coldbrew' },
        { label: 'ギャラリーやコンサート', type: 'cappuccino' },
        { label: 'プロフェッショナルな出会い', type: 'americano' },
      ],
    },
    {
      id: 'q6',
      text: '好みの仕事スタイルは？',
      options: [
        { label: '集中した爆発的な生産性', type: 'espresso' },
        { label: '安定したコラボレーション', type: 'latte' },
        { label: '落ち着いた持続的な集中', type: 'coldbrew' },
        { label: 'クリエイティブな探求', type: 'cappuccino' },
        { label: '体系的で効率的', type: 'americano' },
      ],
    },
    {
      id: 'q7',
      text: '最もエネルギーをもらえるものは？',
      options: [
        { label: '競争と勝利', type: 'espresso' },
        { label: '人とのつながり', type: 'latte' },
        { label: '平和と静けさ', type: 'coldbrew' },
        { label: 'クリエイティブな表現', type: 'cappuccino' },
        { label: '目標を達成すること', type: 'americano' },
      ],
    },
    {
      id: 'q8',
      text: 'あなたの人生のモットーは？',
      options: [
        { label: '大きくやるか帰るか', type: 'espresso' },
        { label: '人生は一緒にいるともっと楽しい', type: 'latte' },
        { label: 'のんびり楽しもう', type: 'coldbrew' },
        { label: '大胆に表現せよ', type: 'cappuccino' },
        { label: 'シンプルに、誠実に', type: 'americano' },
      ],
    },
  ],
}

const RESULTS: Record<CoffeeType, Record<SupportedLang, ResultData>> = {
  espresso: {
    ko: {
      emoji: '☕',
      title: '에스프레소',
      tagline: '목표 지향적 추진자',
      description: '강렬하고 효율적이며 핵심을 바로 찾아갑니다. 당신은 시간을 낭비하지 않고 원하는 것을 향해 직진하는 타입입니다.',
      traits: ['⚡ 높은 에너지', '🎯 직접적이고 결과지향', '💪 압박 속에서 번창'],
    },
    en: {
      emoji: '☕',
      title: 'Espresso',
      tagline: 'The Goal-Oriented Driver',
      description: "You're intense, efficient, and cut straight to the point. You don't waste time — you move directly toward what you want.",
      traits: ['⚡ High energy', '🎯 Direct and results-focused', '💪 Thrives under pressure'],
    },
    ja: {
      emoji: '☕',
      title: 'エスプレッソ',
      tagline: '目標志向の推進者',
      description: '情熱的で効率的、そしてすぐに核心に迫ります。時間を無駄にせず、望むものへ真っ直ぐ進むタイプです。',
      traits: ['⚡ 高いエネルギー', '🎯 直接的で結果志向', '💪 プレッシャーの中で輝く'],
    },
  },
  latte: {
    ko: {
      emoji: '🥛',
      title: '라떼',
      tagline: '사교적 나비',
      description: '따뜻하고 친근하며 모든 사람을 환영받는 기분이 들게 합니다. 당신 주변에는 항상 편안한 분위기가 감돕니다.',
      traits: ['💝 따뜻하고 사교적', '☕ 편안한 분위기 조성', '🤝 균형 잡힌 접근'],
    },
    en: {
      emoji: '🥛',
      title: 'Latte',
      tagline: 'The Social Butterfly',
      description: "You're warm, friendly, and make everyone feel welcome. A comfortable atmosphere always surrounds you.",
      traits: ['💝 Warm and sociable', '☕ Creates a comfortable vibe', '🤝 Balanced approach'],
    },
    ja: {
      emoji: '🥛',
      title: 'ラテ',
      tagline: 'ソーシャルバタフライ',
      description: '温かく親しみやすく、誰もが歓迎されていると感じさせます。あなたの周りには常に心地よい雰囲気が漂っています。',
      traits: ['💝 温かく社交的', '☕ 居心地のよい雰囲気を作る', '🤝 バランスの取れたアプローチ'],
    },
  },
  coldbrew: {
    ko: {
      emoji: '🧊',
      title: '콜드브루',
      tagline: '여유로운 전략가',
      description: '부드럽고 인내심 있으며 압박 속에서도 침착합니다. 당신은 서두르지 않지만 결국 원하는 목표에 도달합니다.',
      traits: ['😎 언제나 침착', '🧠 깊이 생각한 후 행동', '🌊 부드럽고 여유로운 존재'],
    },
    en: {
      emoji: '🧊',
      title: 'Cold Brew',
      tagline: 'The Relaxed Strategist',
      description: "You're smooth, patient, and calm under pressure. You don't rush, but you always reach your goals in the end.",
      traits: ['😎 Always cool-headed', '🧠 Think deeply before acting', '🌊 Smooth and easy-going'],
    },
    ja: {
      emoji: '🧊',
      title: 'コールドブリュー',
      tagline: 'リラックスしたストラテジスト',
      description: 'なめらかで忍耐強く、プレッシャーの中でも落ち着いています。急がないけれど、最終的には目標に到達します。',
      traits: ['😎 いつも冷静', '🧠 深く考えてから行動', '🌊 なめらかでゆったりした存在'],
    },
  },
  cappuccino: {
    ko: {
      emoji: '🎨',
      title: '카푸치노',
      tagline: '창의적 영혼',
      description: '아름다움과 자기 표현을 중요하게 생각합니다. 당신은 삶의 모든 면에 예술성과 독창성을 불어넣습니다.',
      traits: ['🎨 독특한 창의적 사고', '✨ 미학 중시', '💫 모든 것에 예술성 가미'],
    },
    en: {
      emoji: '🎨',
      title: 'Cappuccino',
      tagline: 'The Creative Soul',
      description: 'Beauty and self-expression matter deeply to you. You infuse artistry and originality into every aspect of life.',
      traits: ['🎨 Uniquely creative thinking', '✨ Values aesthetics', '💫 Brings artistry to everything'],
    },
    ja: {
      emoji: '🎨',
      title: 'カプチーノ',
      tagline: 'クリエイティブソウル',
      description: '美しさと自己表現をとても大切にしています。あなたは生活のあらゆる面に芸術性と独創性を吹き込みます。',
      traits: ['🎨 ユニークなクリエイティブ思考', '✨ 美学を重視', '💫 すべてに芸術性を加える'],
    },
  },
  americano: {
    ko: {
      emoji: '☕',
      title: '아메리카노',
      tagline: '클래식한 신뢰',
      description: '솔직하고 믿을 수 있습니다. 당신은 유행을 따르기보다 검증된 것을 신뢰하며 주변 사람들에게 든든한 존재입니다.',
      traits: ['🎯 솔직하고 정직', '⚓ 믿을 수 있는 존재', '📋 단순함과 실용성 중시'],
    },
    en: {
      emoji: '☕',
      title: 'Americano',
      tagline: 'The Classic Reliable',
      description: "You're straightforward and dependable. Rather than chasing trends, you trust the proven — and you're a rock for the people around you.",
      traits: ['🎯 Honest and direct', '⚓ Always dependable', '📋 Values simplicity and practicality'],
    },
    ja: {
      emoji: '☕',
      title: 'アメリカーノ',
      tagline: 'クラシックな信頼',
      description: '率直で信頼できます。トレンドを追うより実証済みのものを信頼し、周囲の人々にとって頼もしい存在です。',
      traits: ['🎯 率直で正直', '⚓ いつも頼れる存在', '📋 シンプルさと実用性を重視'],
    },
  },
}

interface Props { locale?: string }

export default function CoffeePersonalityTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp)
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [votes, setVotes] = useState<CoffeeType[]>([])
  const [result, setResult] = useState<CoffeeType | null>(null)
  const [copied, setCopied] = useState(false)

  function calcResult(v: CoffeeType[]): CoffeeType {
    const counts: Record<CoffeeType, number> = {
      espresso: 0, latte: 0, coldbrew: 0, cappuccino: 0, americano: 0,
    }
    v.forEach(t => { counts[t]++ })
    return (Object.entries(counts) as [CoffeeType, number][])
      .reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  }

  function pick(type: CoffeeType) {
    const newVotes = [...votes, type]
    if (current + 1 >= questions.length) setResult(calcResult(newVotes))
    setVotes(newVotes)
    setCurrent(current + 1)
  }

  function restart() { setVotes([]); setCurrent(0); setResult(null); setCopied(false) }

  function share() {
    if (!result) return
    const url = window.location.href
    const text = `${lb.shareMsg} — ${RESULTS[result][l].title} ${RESULTS[result][l].emoji}`
    if (navigator.share) {
      navigator.share({ title: lb.title, text, url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const finished = current >= questions.length

  if (!finished) {
    const q = questions[current]
    const progress = Math.round((current / questions.length) * 100)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-bold">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt.type)}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
              aria-label={opt.label}
            >
              <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">
                {i + 1}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result][l]

  const typeColors: Record<CoffeeType, string> = {
    espresso: '#7c3f1e',
    latte: '#d4a96a',
    coldbrew: '#2d6a8f',
    cappuccino: '#b07040',
    americano: '#5a5a5a',
  }
  const color = typeColors[result]

  const allCoffeeTypes: CoffeeType[] = ['espresso', 'latte', 'coldbrew', 'cappuccino', 'americano']
  const voteMap: Record<CoffeeType, number> = { espresso: 0, latte: 0, coldbrew: 0, cappuccino: 0, americano: 0 }
  votes.forEach(t => { voteMap[t]++ })
  const maxVotes = Math.max(...Object.values(voteMap))

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          <span>{r.emoji}</span>
          <span>{r.title}</span>
        </div>
        <p className="font-bold text-muted-foreground">{r.tagline}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-bold text-sm">{lb.traits}</h3>
        <ul className="space-y-1">
          {r.traits.map(t => (
            <li key={t} className="text-sm text-muted-foreground flex gap-2 items-start">
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        {allCoffeeTypes.map(type => {
          const count = voteMap[type]
          const pct = maxVotes > 0 ? Math.round((count / questions.length) * 100) : 0
          const typeResult = RESULTS[type][l]
          return (
            <div key={type} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: typeColors[type] }}>
                  {typeResult.emoji} {typeResult.title}
                </span>
                <span className="text-muted-foreground">{count}/{questions.length}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: typeColors[type] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={restart}
          className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors"
          aria-label={lb.restart}
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
          aria-label={lb.share}
        >
          {copied ? lb.copied : lb.share}
        </button>
      </div>
    </div>
  )
}
