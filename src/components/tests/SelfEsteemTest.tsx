import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Level = 'high' | 'medium' | 'low'
type Locale = 'ko' | 'en' | 'ja'

interface Question { id: string; text: string; reversed: boolean }
interface ResultData {
  title: string
  subtitle: string
  description: string
  traits: string[]
  growth: string[]
  affirmation: string
  reminder: string
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string
  share: string
  shareMsg: string
  yourLevel: string
  traits: string
  growth: string
  affirmation: string
  reminder: string
  scoreLabel: string
  outOf: string
  note: string
}> = {
  ko: {
    title: '자존감 체크 테스트',
    subtitle: '나는 나 자신을 얼마나 사랑하나요?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 자존감 레벨은',
    yourLevel: '나의 자존감 수준',
    traits: '주요 특징',
    growth: '성장 포인트',
    affirmation: '오늘의 확언',
    reminder: '기억하세요',
    scoreLabel: '자존감 점수',
    outOf: '/ 40점',
    note: '이 테스트는 자기 인식을 위한 도구입니다. 전문적인 심리 진단을 대체하지 않습니다.',
  },
  en: {
    title: 'Self-Esteem Check',
    subtitle: 'How much do you love yourself?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My self-esteem level is',
    yourLevel: 'Your Self-Esteem Level',
    traits: 'Key Traits',
    growth: 'Growth Points',
    affirmation: 'Today\'s Affirmation',
    reminder: 'Remember',
    scoreLabel: 'Self-Esteem Score',
    outOf: '/ 40',
    note: 'This test is a tool for self-awareness. It does not replace professional psychological assessment.',
  },
  ja: {
    title: '自己肯定感チェックテスト',
    subtitle: '自分のことをどれくらい好きですか？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くそう思わない', 'そう思わない', '普通', 'そう思う', '非常にそう思う'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の自己肯定感レベルは',
    yourLevel: '自己肯定感レベル',
    traits: '主な特徴',
    growth: '成長ポイント',
    affirmation: '今日のアファメーション',
    reminder: '覚えておいて',
    scoreLabel: '自己肯定感スコア',
    outOf: '/ 40点',
    note: 'このテストは自己認識のためのツールです。専門的な心理診断の代替ではありません。',
  },
}

// 10 questions (Rosenberg-inspired, balanced for positive/reversed items)
const QUESTIONS: Record<Locale, Question[]> = {
  ko: [
    { id: 'q1', text: '나는 내 자신이 가치 있는 사람이라고 생각한다', reversed: false },
    { id: 'q2', text: '나는 나 자신에 대해 좋은 감정을 가지고 있다', reversed: false },
    { id: 'q3', text: '나는 대체로 나 자신에 만족한다', reversed: false },
    { id: 'q4', text: '나는 최소한 다른 사람들만큼 잘할 수 있다고 생각한다', reversed: false },
    { id: 'q5', text: '나는 자랑스러워할 만한 점이 있다고 생각한다', reversed: false },
    { id: 'q6', text: '나는 때때로 내가 아무 쓸모없다고 느낀다', reversed: true },
    { id: 'q7', text: '나는 때때로 내가 실패자라는 생각이 든다', reversed: true },
    { id: 'q8', text: '나는 다른 사람들보다 못한 것 같아 창피할 때가 있다', reversed: true },
    { id: 'q9', text: '나는 나 자신이 별로 좋지 않다고 생각한다', reversed: true },
    { id: 'q10', text: '나는 내 자신을 더 존중할 수 있으면 좋겠다', reversed: true },
  ],
  en: [
    { id: 'q1', text: 'I feel that I am a person of worth, at least equal to others', reversed: false },
    { id: 'q2', text: 'I feel that I have good qualities', reversed: false },
    { id: 'q3', text: 'All in all, I am inclined to feel that I am a success', reversed: false },
    { id: 'q4', text: 'I am able to do things as well as most other people', reversed: false },
    { id: 'q5', text: 'I feel I have much to be proud of', reversed: false },
    { id: 'q6', text: 'I certainly feel useless at times', reversed: true },
    { id: 'q7', text: 'At times I think I am no good at all', reversed: true },
    { id: 'q8', text: 'I feel I do not have much to be proud of', reversed: true },
    { id: 'q9', text: 'I feel like I am a failure', reversed: true },
    { id: 'q10', text: 'I wish I could have more respect for myself', reversed: true },
  ],
  ja: [
    { id: 'q1', text: '私は、自分が少なくとも人並みには価値のある人間だと思う', reversed: false },
    { id: 'q2', text: '私は、自分の良いところをいくつも持っていると感じる', reversed: false },
    { id: 'q3', text: '全体的に見て、私は自分に満足している', reversed: false },
    { id: 'q4', text: '私は、たいていの人と同じくらいのことはできる', reversed: false },
    { id: 'q5', text: '私には、誇りに思えることがたくさんある', reversed: false },
    { id: 'q6', text: '私は、時々自分が全く役に立たないと感じる', reversed: true },
    { id: 'q7', text: '私は、自分が失敗者だと思うことがある', reversed: true },
    { id: 'q8', text: '私は、あまり誇りに思えることがないと感じる', reversed: true },
    { id: 'q9', text: '私は、自分のことをよく思えないことがある', reversed: true },
    { id: 'q10', text: '私は、もっと自分を尊重できたらと思う', reversed: true },
  ],
}

const RESULTS: Record<Level, Record<Locale, ResultData>> = {
  high: {
    ko: {
      title: '높은 자존감',
      subtitle: '자신을 사랑하고 신뢰하는 당신',
      description: '당신은 자신의 가치를 잘 알고, 실수를 성장의 기회로 봅니다. 건강한 자기 존중감은 더 만족스러운 관계, 더 높은 목표 달성, 더 나은 정신 건강으로 이어집니다. 지금의 자기 사랑을 유지하고 주변 사람들에게도 나눠주세요.',
      traits: ['자신의 가치를 인식', '실수를 용납하고 배움', '건강한 경계 설정', '내적 안정감'],
      growth: ['자기 사랑을 지속적으로 유지', '주변에 긍정적 영향 나누기', '새로운 도전에 적극적으로 임하기'],
      affirmation: '나는 지금 이대로 충분하다. 나의 가치는 성취나 타인의 평가에 달려 있지 않다.',
      reminder: '높은 자존감은 오만함이 아닙니다. 자신을 사랑하면서도 타인을 배려할 때 진정한 자존감이 빛납니다.',
    },
    en: {
      title: 'High Self-Esteem',
      subtitle: 'You love and trust yourself',
      description: 'You know your worth and see mistakes as growth opportunities. Healthy self-esteem leads to more satisfying relationships, higher goal achievement, and better mental health. Maintain this self-love and share it with those around you.',
      traits: ['Recognizes your own value', 'Accepts mistakes and learns', 'Sets healthy boundaries', 'Inner stability'],
      growth: ['Continuously maintain self-love', 'Spread positive influence to others', 'Actively embrace new challenges'],
      affirmation: 'I am enough just as I am. My worth does not depend on achievement or others\' opinions.',
      reminder: 'High self-esteem is not arrogance. True self-esteem shines when you love yourself while also caring for others.',
    },
    ja: {
      title: '高い自己肯定感',
      subtitle: '自分を愛し信頼するあなた',
      description: '自分の価値をよく知り、失敗を成長の機会と捉えています。健全な自己肯定感は、より満足のいく関係、より高い目標達成、より良いメンタルヘルスにつながります。今の自己愛を維持し、周りの人々にも分かち合ってください。',
      traits: ['自分の価値を認識', '失敗を許容して学ぶ', '健全な境界設定', '内なる安定感'],
      growth: ['自己愛を継続的に維持', '周りにポジティブな影響を与える', '新しい挑戦に積極的に取り組む'],
      affirmation: '私は今のままで十分です。私の価値は達成や他者の評価に依存しません。',
      reminder: '高い自己肯定感は傲慢さではありません。自分を愛しながら他者を思いやる時、真の自己肯定感が輝きます。',
    },
  },
  medium: {
    ko: {
      title: '보통의 자존감',
      subtitle: '좋은 날도 있고 힘든 날도 있는 당신',
      description: '당신은 자신에 대해 대체로 긍정적이지만, 상황에 따라 자기 의심이 생기기도 합니다. 이는 매우 일반적인 상태입니다. 자존감은 연습을 통해 강화할 수 있으며, 지금보다 더 나은 자기 수용으로 나아갈 수 있습니다.',
      traits: ['상황에 따라 자존감 변동', '타인의 의견에 영향받음', '자신에 대한 모호한 감정', '성장 잠재력 높음'],
      growth: ['자기 비판적 생각 인식하기', '매일 한 가지 자신의 강점 찾기', '실수를 경험으로 재정의하기'],
      affirmation: '나는 완벽하지 않아도 된다. 지금 이 순간 나는 최선을 다하고 있다.',
      reminder: '자존감은 하루아침에 바뀌지 않습니다. 매일 작은 자기 돌봄의 실천이 쌓여 큰 변화를 만듭니다.',
    },
    en: {
      title: 'Moderate Self-Esteem',
      subtitle: 'You have good days and tough days',
      description: 'You\'re generally positive about yourself but self-doubt appears depending on the situation. This is very common. Self-esteem can be strengthened through practice, and you can move toward better self-acceptance.',
      traits: ['Self-esteem fluctuates by situation', 'Influenced by others\' opinions', 'Mixed feelings about yourself', 'High growth potential'],
      growth: ['Notice self-critical thoughts', 'Find one strength in yourself each day', 'Redefine mistakes as experiences'],
      affirmation: 'I don\'t need to be perfect. In this moment, I am doing my best.',
      reminder: 'Self-esteem doesn\'t change overnight. Small daily acts of self-care accumulate to create big change.',
    },
    ja: {
      title: '普通の自己肯定感',
      subtitle: '良い日も辛い日もあるあなた',
      description: '自分についておおむねポジティブですが、状況によって自己不信が生じることがあります。これは非常によくある状態です。自己肯定感は練習を通じて強化でき、より良い自己受容へと進むことができます。',
      traits: ['状況によって自己肯定感が変動', '他者の意見に影響される', '自分に対する複雑な感情', '成長ポテンシャルが高い'],
      growth: ['自己批判的な思考に気づく', '毎日自分の強みを一つ見つける', '失敗を経験として再定義する'],
      affirmation: '完璧でなくていい。今この瞬間、私は最善を尽くしている。',
      reminder: '自己肯定感は一夜にして変わりません。毎日小さな自己ケアの実践が積み重なって大きな変化を生み出します。',
    },
  },
  low: {
    ko: {
      title: '낮은 자존감',
      subtitle: '지금은 힘들지만, 당신은 충분히 소중합니다',
      description: '현재 자신에 대한 부정적인 감정이 강하게 느껴지고 있습니다. 이것은 당신이 나쁜 사람이라서가 아니라, 과거의 경험이나 환경이 영향을 미친 것입니다. 자존감은 변화할 수 있으며, 지금 이 테스트를 한다는 것 자체가 성장의 시작입니다.',
      traits: ['자기 비판이 강함', '타인의 승인 의존', '자신의 가치를 낮게 평가', '도움을 구하기 어려움'],
      growth: ['자기 비판을 자기 연민으로 바꾸기', '소중한 사람에게 마음 나누기', '작은 성취도 인정하기', '필요하다면 전문 상담 고려'],
      affirmation: '나는 사랑받을 자격이 있다. 나의 존재 자체가 충분히 가치 있다.',
      reminder: '낮은 자존감은 영구적이지 않습니다. 많은 사람들이 비슷한 어려움을 겪고 회복했습니다. 작은 한 걸음부터 시작해 보세요.',
    },
    en: {
      title: 'Low Self-Esteem',
      subtitle: 'It\'s hard right now, but you are deeply valuable',
      description: 'You\'re currently experiencing strong negative feelings about yourself. This isn\'t because you\'re a bad person — past experiences or environments have had their impact. Self-esteem can change, and taking this test is itself the beginning of growth.',
      traits: ['Strong self-criticism', 'Dependence on others\' approval', 'Undervaluing yourself', 'Difficulty asking for help'],
      growth: ['Transform self-criticism into self-compassion', 'Share your feelings with someone you trust', 'Acknowledge even small achievements', 'Consider professional counseling if needed'],
      affirmation: 'I deserve to be loved. My very existence is valuable.',
      reminder: 'Low self-esteem is not permanent. Many people have faced similar struggles and recovered. Start with one small step.',
    },
    ja: {
      title: '低い自己肯定感',
      subtitle: '今は辛くても、あなたはとても大切な存在です',
      description: '現在、自分に対してネガティブな感情が強く感じられています。これはあなたが悪い人だからではなく、過去の経験や環境が影響したのです。自己肯定感は変化でき、このテストをしていること自体が成長の始まりです。',
      traits: ['自己批判が強い', '他者の承認への依存', '自分の価値を低く評価', '助けを求めることが難しい'],
      growth: ['自己批判を自己への思いやりに変える', '信頼できる人に気持ちを打ち明ける', '小さな成就も認める', '必要なら専門カウンセリングを検討'],
      affirmation: '私は愛される資格がある。私の存在それ自体が十分価値がある。',
      reminder: '低い自己肯定感は永続しません。多くの人が同様の困難を経験し回復しました。小さな一歩から始めましょう。',
    },
  },
}

interface Props { locale?: string }

export default function SelfEsteemTest({ locale: lp = 'ko' }: Props) {
  const locale: Locale = (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const initResult = (): { level: Level; score: number } | null => {
    if (typeof window === 'undefined') return null
    const p = new URLSearchParams(window.location.search)
    const lv = p.get('level') as Level | null
    if (lv && RESULTS[lv]) return { level: lv, score: 0 }
    return null
  }

  const [current, setCurrent] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('level')) return questions.length
    }
    return 0
  })
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: Level; score: number } | null>(initResult)

  function calcResult(ans: number[]): { level: Level; score: number } {
    let score = 0
    for (let i = 0; i < questions.length; i++) {
      const raw = ans[i] // 0-4
      score += questions[i].reversed ? (4 - raw) : raw
    }
    // score range: 0-40 (each question 0-4)
    const level: Level = score >= 28 ? 'high' : score >= 16 ? 'medium' : 'low'
    return { level, score }
  }

  function pick(val: number) {
    const newAns = [...answers, val]
    if (current + 1 >= questions.length) {
      setResult(calcResult(newAns))
    }
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() {
    setAnswers([]); setCurrent(0); setResult(null)
    if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname)
  }

  function share() {
    if (!result) return
    const url = `${window.location.origin}${window.location.pathname}?level=${result.level}`
    const text = `${lb.shareMsg} ${RESULTS[result.level][locale].title}`
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
          <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-medium">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button key={i} onClick={() => pick(i)}
              className={[
                'w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                'bg-card hover:bg-accent hover:border-primary/50 flex items-center gap-3',
              ].join(' ')}>
              <span className="flex-none w-7 h-7 rounded-full border-2 border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result.level][locale]
  const pct = Math.round((result.score / 40) * 100)
  const levelColor = result.level === 'high' ? '#22c55e' : result.level === 'medium' ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
        <div className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: levelColor }}>{r.title}</div>
        <p className="text-muted-foreground font-medium">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      {result.score > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{lb.scoreLabel}</span>
            <span className="text-lg font-bold" style={{ color: levelColor }}>{result.score} {lb.outOf}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: levelColor }} />
          </div>
          <p className="text-xs text-muted-foreground text-right">{pct}%</p>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{lb.traits}</h3>
        <ul className="space-y-1">
          {r.traits.map(t => <li key={t} className="text-sm text-muted-foreground flex gap-2"><span>•</span>{t}</li>)}
        </ul>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-green-600">{lb.growth}</h3>
        <ul className="space-y-1">
          {r.growth.map(g => <li key={g} className="text-sm text-muted-foreground flex gap-2"><span className="text-green-500">→</span>{g}</li>)}
        </ul>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.affirmation}</h3>
        <p className="text-sm italic">"{r.affirmation}"</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-1">
        <h3 className="font-semibold text-sm text-muted-foreground">{lb.reminder}</h3>
        <p className="text-sm text-muted-foreground">{r.reminder}</p>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button onClick={restart}
          className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
          {lb.restart}
        </button>
        <button onClick={share}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
          {lb.share}
        </button>
      </div>
    </div>
  )
}
