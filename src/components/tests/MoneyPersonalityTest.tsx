import { useState } from 'react'

type MoneyType = 'saver' | 'spender' | 'investor' | 'minimalist'
type SupportedLang = 'ko' | 'en' | 'ja'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Question {
  id: string
  text: string
  type: MoneyType
}

interface ResultData {
  emoji: string
  title: string
  tagline: string
  description: string
  strengths: string[]
  tip: string
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
  strengths: string
  tip: string
  scoreLabel: string
  note: string
  copied: string
}> = {
  ko: {
    title: '머니 성격 테스트',
    subtitle: '나의 돈 관리 유형은?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 없다', '거의 없다', '가끔 있다', '자주 있다', '항상 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 머니 성격 유형은',
    yourType: '나의 재정 유형',
    strengths: '강점',
    tip: '팁',
    scoreLabel: '유형별 점수',
    note: '이 테스트는 재정 습관에 대한 자기 이해를 돕기 위한 것입니다.',
    copied: '링크가 복사되었습니다!',
  },
  en: {
    title: 'Money Personality Test',
    subtitle: "What's your financial type?",
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My money personality type is',
    yourType: 'Your Financial Type',
    strengths: 'Strengths',
    tip: 'Tip',
    scoreLabel: 'Score by Type',
    note: 'This test is designed to help you better understand your financial habits.',
    copied: 'Link copied!',
  },
  ja: {
    title: 'マネー性格テスト',
    subtitle: '私のお金の管理タイプは？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'ほとんどない', 'たまにある', 'よくある', 'いつもそうだ'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のマネー性格タイプは',
    yourType: '私の財政タイプ',
    strengths: '強み',
    tip: 'アドバイス',
    scoreLabel: 'タイプ別スコア',
    note: 'このテストはあなたの金融習慣の自己理解を助けるためのものです。',
    copied: 'リンクがコピーされました！',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', text: '다른 지출을 하기 전에 항상 일정 금액을 먼저 저축한다', type: 'saver' },
    { id: 'q2', text: '저축 계좌 잔고가 낮아지면 불안함을 느낀다', type: 'saver' },
    { id: 'q3', text: '마음에 드는 물건을 발견하면 즉흥적으로 구매한다', type: 'spender' },
    { id: 'q4', text: '미래보다 현재의 경험과 즐거움을 우선시한다', type: 'spender' },
    { id: 'q5', text: '주식, 부동산 등 자산에 대해 적극적으로 조사하고 투자한다', type: 'investor' },
    { id: 'q6', text: '돈을 장기적인 부를 쌓기 위한 도구로 본다', type: 'investor' },
    { id: 'q7', text: '잠재적 수익을 위해 계산된 금융 위험을 감수하는 것이 편안하다', type: 'investor' },
    { id: 'q8', text: '저렴한 물건을 많이 갖기보다 고품질 물건 소수를 선호한다', type: 'minimalist' },
    { id: 'q9', text: '정기적으로 물건을 정리하고 불필요한 소유물 축적을 피한다', type: 'minimalist' },
    { id: 'q10', text: '적게 소유하고 지출을 최소화하는 삶에서 자유를 느낀다', type: 'minimalist' },
  ],
  en: [
    { id: 'q1', text: 'I always save a set amount before making other purchases', type: 'saver' },
    { id: 'q2', text: 'I feel anxious when my savings account balance gets low', type: 'saver' },
    { id: 'q3', text: "I make impulse purchases when I find something I like", type: 'spender' },
    { id: 'q4', text: 'I prioritize present experiences and enjoyment over the future', type: 'spender' },
    { id: 'q5', text: 'I actively research and invest in assets like stocks or real estate', type: 'investor' },
    { id: 'q6', text: 'I see money as a tool for building long-term wealth', type: 'investor' },
    { id: 'q7', text: "I'm comfortable taking calculated financial risks for potential returns", type: 'investor' },
    { id: 'q8', text: 'I prefer a few high-quality items over many cheaper ones', type: 'minimalist' },
    { id: 'q9', text: 'I regularly declutter and avoid accumulating unnecessary possessions', type: 'minimalist' },
    { id: 'q10', text: 'I feel free owning less and minimizing my spending', type: 'minimalist' },
  ],
  ja: [
    { id: 'q1', text: '他の支出をする前に、常に一定の金額を先に貯蓄する', type: 'saver' },
    { id: 'q2', text: '貯蓄口座の残高が低くなると不安を感じる', type: 'saver' },
    { id: 'q3', text: '気に入ったものを見つけると衝動的に購入する', type: 'spender' },
    { id: 'q4', text: '将来よりも現在の経験や楽しみを優先する', type: 'spender' },
    { id: 'q5', text: '株式や不動産などの資産を積極的に調査して投資する', type: 'investor' },
    { id: 'q6', text: 'お金を長期的な富を築くためのツールとして見ている', type: 'investor' },
    { id: 'q7', text: '潜在的なリターンのために計算されたリスクを取ることが快適だ', type: 'investor' },
    { id: 'q8', text: '安いものをたくさん持つより、高品質なものを少数持ちたい', type: 'minimalist' },
    { id: 'q9', text: '定期的に物を整理し、不必要な所有物の蓄積を避ける', type: 'minimalist' },
    { id: 'q10', text: '少ない所有物と最小限の支出の生活に自由を感じる', type: 'minimalist' },
  ],
}

const RESULTS: Record<MoneyType, Record<SupportedLang, ResultData>> = {
  saver: {
    ko: {
      emoji: '🏦',
      title: '절약형',
      tagline: '안정 추구자',
      description: '미래를 위해 계획하고 저축을 통해 안정감을 찾습니다. 당신에게 재정적 안전망은 마음의 평화입니다.',
      strengths: ['재정적 안정', '비상금 확보', '목표 저축'],
      tip: '너무 엄격한 절약보다 즐거운 소비도 삶의 일부임을 기억하세요.',
    },
    en: {
      emoji: '🏦',
      title: 'Saver',
      tagline: 'The Stability Seeker',
      description: 'You plan ahead and find security through saving. A financial safety net is your peace of mind.',
      strengths: ['Financial stability', 'Emergency fund readiness', 'Goal-based saving'],
      tip: 'Remember that occasional enjoyable spending is also part of a well-lived life.',
    },
    ja: {
      emoji: '🏦',
      title: '節約型',
      tagline: '安定追求者',
      description: '将来のために計画を立て、貯蓄を通じて安心感を得ます。財政的なセーフティネットはあなたの心の平和です。',
      strengths: ['財政的な安定', '緊急資金の確保', '目標貯蓄'],
      tip: '厳しすぎる節約よりも、楽しい消費も人生の一部であることを忘れずに。',
    },
  },
  spender: {
    ko: {
      emoji: '🛍️',
      title: '소비형',
      tagline: '현재 즐기는 자',
      description: '지금 이 순간을 즐기며 경험에 투자합니다. 당신은 삶의 질을 높이는 소비에서 기쁨을 찾습니다.',
      strengths: ['풍부한 경험', '현재 집중', '삶의 질 중시'],
      tip: '지출 전 24시간 대기 법칙으로 충동 구매를 줄여보세요.',
    },
    en: {
      emoji: '🛍️',
      title: 'Spender',
      tagline: 'The Present Enjoyer',
      description: 'You invest in experiences and enjoy the moment. You find joy in spending that improves your quality of life.',
      strengths: ['Rich experiences', 'Living in the present', 'Prioritizes quality of life'],
      tip: 'Try the 24-hour waiting rule before purchases to reduce impulse spending.',
    },
    ja: {
      emoji: '🛍️',
      title: '消費型',
      tagline: '現在を楽しむ者',
      description: '今この瞬間を楽しみ、経験に投資します。生活の質を高める消費に喜びを見出します。',
      strengths: ['豊かな経験', '現在への集中', '生活の質を重視'],
      tip: '衝動買いを減らすために、購入前に24時間待つルールを試してみてください。',
    },
  },
  investor: {
    ko: {
      emoji: '📈',
      title: '투자형',
      tagline: '자산 성장자',
      description: '돈을 도구로 보고 미래 가치를 위해 투자합니다. 당신은 장기적 시각으로 재정적 자유를 추구합니다.',
      strengths: ['장기 시각', '위험 관리', '자산 성장'],
      tip: '분산 투자와 비상금 유지는 잊지 마세요.',
    },
    en: {
      emoji: '📈',
      title: 'Investor',
      tagline: 'The Asset Builder',
      description: 'You see money as a tool and invest for future value. You pursue financial freedom with a long-term perspective.',
      strengths: ['Long-term vision', 'Risk management', 'Asset growth'],
      tip: "Don't forget diversification and keeping an emergency fund.",
    },
    ja: {
      emoji: '📈',
      title: '投資型',
      tagline: '資産成長者',
      description: 'お金をツールとして捉え、将来の価値のために投資します。長期的な視点で財政的自由を追求します。',
      strengths: ['長期的な視点', 'リスク管理', '資産成長'],
      tip: '分散投資と緊急資金の維持を忘れずに。',
    },
  },
  minimalist: {
    ko: {
      emoji: '🌿',
      title: '미니멀리스트',
      tagline: '자유로운 간소주의자',
      description: '소유를 줄이고 본질에 집중합니다. 당신은 덜 가짐으로써 더 많은 자유를 얻습니다.',
      strengths: ['재정적 자유', '청소한 삶', '지속 가능한 소비'],
      tip: '경험 소비는 미니멀리즘과 충분히 양립할 수 있습니다.',
    },
    en: {
      emoji: '🌿',
      title: 'Minimalist',
      tagline: 'The Free Simplifier',
      description: 'You reduce possessions and focus on what matters. You gain more freedom by owning less.',
      strengths: ['Financial freedom', 'Uncluttered life', 'Sustainable consumption'],
      tip: 'Spending on experiences is fully compatible with minimalism.',
    },
    ja: {
      emoji: '🌿',
      title: 'ミニマリスト',
      tagline: '自由な簡素主義者',
      description: '所有を減らし、本質に集中します。少ない所有によってより多くの自由を得ます。',
      strengths: ['財政的自由', 'すっきりした生活', '持続可能な消費'],
      tip: '経験への消費はミニマリズムと十分に両立できます。',
    },
  },
}

interface Props { locale?: string }

export default function MoneyPersonalityTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp)
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<MoneyType | null>(null)
  const [copied, setCopied] = useState(false)

  const moneyTypes: MoneyType[] = ['saver', 'spender', 'investor', 'minimalist']

  function calcResult(ans: number[]): MoneyType {
    const totals: Record<MoneyType, number> = { saver: 0, spender: 0, investor: 0, minimalist: 0 }
    const counts: Record<MoneyType, number> = { saver: 0, spender: 0, investor: 0, minimalist: 0 }

    questions.forEach((q, i) => {
      totals[q.type] += ans[i] ?? 0
      counts[q.type]++
    })

    const averages = moneyTypes.map(t => ({
      type: t,
      avg: counts[t] > 0 ? totals[t] / counts[t] : 0,
    }))

    return averages.reduce((a, b) => (b.avg > a.avg ? b : a)).type
  }

  function pick(val: number) {
    const newAns = [...answers, val]
    if (current + 1 >= questions.length) setResult(calcResult(newAns))
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() { setAnswers([]); setCurrent(0); setResult(null); setCopied(false) }

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
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i + 1)}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
              aria-label={label}
            >
              <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">
                {i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result][l]

  const typeColors: Record<MoneyType, string> = {
    saver: '#2563eb',
    spender: '#db2777',
    investor: '#16a34a',
    minimalist: '#059669',
  }

  const totals: Record<MoneyType, number> = { saver: 0, spender: 0, investor: 0, minimalist: 0 }
  const counts: Record<MoneyType, number> = { saver: 0, spender: 0, investor: 0, minimalist: 0 }
  questions.forEach((q, i) => {
    totals[q.type] += answers[i] ?? 0
    counts[q.type]++
  })
  const averages: Record<MoneyType, number> = {
    saver: counts.saver > 0 ? totals.saver / counts.saver : 0,
    spender: counts.spender > 0 ? totals.spender / counts.spender : 0,
    investor: counts.investor > 0 ? totals.investor / counts.investor : 0,
    minimalist: counts.minimalist > 0 ? totals.minimalist / counts.minimalist : 0,
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: typeColors[result] }}
        >
          <span>{r.emoji}</span>
          <span>{r.title}</span>
        </div>
        <p className="font-bold text-muted-foreground">{r.tagline}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-green-600">{lb.strengths}</h3>
        <ul className="space-y-1">
          {r.strengths.map(s => (
            <li key={s} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-green-500">→</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
        <h3 className="font-bold text-sm text-amber-700">{lb.tip}</h3>
        <p className="text-sm text-amber-700">{r.tip}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-bold text-sm">{lb.scoreLabel}</h3>
        {moneyTypes.map(type => {
          const avg = averages[type]
          const pct = Math.round((avg / 5) * 100)
          const typeResult = RESULTS[type][l]
          return (
            <div key={type} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: typeColors[type] }}>
                  {typeResult.emoji} {typeResult.title}
                </span>
                <span className="text-muted-foreground">{avg.toFixed(1)} / 5</span>
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

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

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
