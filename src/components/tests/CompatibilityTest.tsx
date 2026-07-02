import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja'
type Dimension = 'communication' | 'values' | 'lifestyle' | 'emotional'
type Phase = 'self' | 'partner' | 'result'

function lang(lp: string): Locale {
  return (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  selfPhaseTitle: string
  partnerPhaseTitle: string
  questionOf: (c: number, t: number) => string
  next: string
  restart: string
  share: string
  shareMsg: string
  overallLabel: string
  dimLabels: Record<Dimension, string>
  note: string
  startPartner: string
  compatible: string
  moderate: string
  different: string
  compatDesc: Record<'high' | 'medium' | 'low', string>
  choose: string
}> = {
  ko: {
    title: '궁합 테스트',
    subtitle: '나와 파트너의 성격 궁합 분석',
    selfPhaseTitle: '나에 대한 질문 (12문항)',
    partnerPhaseTitle: '파트너에 대한 질문 (12문항)',
    questionOf: (c, t) => `${c} / ${t}`,
    next: '다음',
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '우리의 궁합 점수는',
    overallLabel: '전체 궁합',
    dimLabels: { communication: '소통', values: '가치관', lifestyle: '라이프스타일', emotional: '정서' },
    note: '이 테스트는 관계의 패턴을 탐색하는 도구입니다. 실제 관계는 훨씬 더 복잡하고 아름답습니다.',
    startPartner: '파트너 질문 시작',
    compatible: '높은 궁합',
    moderate: '보통 궁합',
    different: '다른 성향',
    compatDesc: {
      high: '두 분은 많은 면에서 자연스럽게 맞습니다. 서로의 강점을 살리면 더욱 깊은 관계가 됩니다.',
      medium: '일부 영역에서 잘 맞고 일부는 차이가 있습니다. 차이는 성장의 기회입니다.',
      low: '두 분은 여러 면에서 다른 성향을 가지고 있습니다. 다름을 이해하는 것이 관계의 열쇠입니다.',
    },
    choose: '가장 가까운 답변을 고르세요',
  },
  en: {
    title: 'Compatibility Test',
    subtitle: 'Analyzing your personality compatibility with your partner',
    selfPhaseTitle: 'Questions About You (12 items)',
    partnerPhaseTitle: 'Questions About Your Partner (12 items)',
    questionOf: (c, t) => `${c} / ${t}`,
    next: 'Next',
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'Our compatibility score is',
    overallLabel: 'Overall Compatibility',
    dimLabels: { communication: 'Communication', values: 'Values', lifestyle: 'Lifestyle', emotional: 'Emotional' },
    note: 'This test is a tool for exploring relationship patterns. Real relationships are far more complex and beautiful.',
    startPartner: 'Start Partner Questions',
    compatible: 'High Compatibility',
    moderate: 'Moderate Compatibility',
    different: 'Different Tendencies',
    compatDesc: {
      high: 'You naturally align in many ways. Leveraging each other\'s strengths deepens your bond further.',
      medium: 'You match well in some areas and differ in others. Differences are opportunities for growth.',
      low: 'You have different tendencies in several areas. Understanding your differences is key to your relationship.',
    },
    choose: 'Choose the closest answer',
  },
  ja: {
    title: '相性テスト',
    subtitle: '自分とパートナーの性格相性分析',
    selfPhaseTitle: '自分についての質問（12問）',
    partnerPhaseTitle: 'パートナーについての質問（12問）',
    questionOf: (c, t) => `${c} / ${t}`,
    next: '次へ',
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私たちの相性スコアは',
    overallLabel: '総合相性',
    dimLabels: { communication: 'コミュニケーション', values: '価値観', lifestyle: 'ライフスタイル', emotional: '情緒' },
    note: 'このテストは関係のパターンを探索するツールです。実際の関係はより複雑で美しいものです。',
    startPartner: 'パートナーの質問を開始',
    compatible: '高い相性',
    moderate: '普通の相性',
    different: '異なる傾向',
    compatDesc: {
      high: 'お二人は多くの面で自然に合っています。お互いの強みを活かすとより深い関係になります。',
      medium: '一部の分野でよく合い、一部は違いがあります。違いは成長の機会です。',
      low: 'お二人はいくつかの面で異なる傾向を持っています。違いを理解することが関係の鍵です。',
    },
    choose: '最も近い答えを選んでください',
  },
}

interface Question {
  id: string
  dimension: Dimension
  self: Record<Locale, string>
  partner: Record<Locale, string>
  options: Record<Locale, string[]>
}

// Each question has 4 options. Scoring: options pair up — options 0-1 are pattern A, 2-3 are pattern B.
// For compatibility, we compare self answers vs partner answers on same dimension.
// Compatible = same pattern index, incompatible = opposite.
const QUESTIONS: Question[] = [
  {
    id: 'q1', dimension: 'communication',
    self: { ko: '갈등이 생기면 나는 주로?', en: 'When conflict arises, I usually:', ja: '対立が生じた時、私は主に？' },
    partner: { ko: '갈등이 생기면 파트너는 주로?', en: 'When conflict arises, my partner usually:', ja: '対立が生じた時、パートナーは主に？' },
    options: {
      ko: ['바로 이야기를 꺼낸다', '적절한 시간을 찾아 대화한다', '혼자 생각을 정리한 후 말한다', '가능하면 갈등을 피한다'],
      en: ['Bring it up immediately', 'Find the right time to talk', 'Sort thoughts alone first, then speak', 'Avoid conflict if possible'],
      ja: ['すぐに話し合う', '適切な時間を見つけて話す', '一人で考えを整理してから話す', 'できれば対立を避ける'],
    },
  },
  {
    id: 'q2', dimension: 'communication',
    self: { ko: '나는 감정 표현을?', en: 'I express emotions:', ja: '私は感情表現を？' },
    partner: { ko: '파트너는 감정 표현을?', en: 'My partner expresses emotions:', ja: 'パートナーは感情表現を？' },
    options: {
      ko: ['솔직하고 자주 표현한다', '상황에 따라 표현한다', '말보다 행동으로 표현한다', '내면에 담아두는 편이다'],
      en: ['Openly and frequently', 'Depending on the situation', 'Through actions rather than words', 'Tend to keep inside'],
      ja: ['率直に頻繁に表現する', '状況に応じて表現する', '言葉より行動で表現する', '内に秘めておく'],
    },
  },
  {
    id: 'q3', dimension: 'communication',
    self: { ko: '나는 대화할 때?', en: 'When I talk, I:', ja: '私は会話する時？' },
    partner: { ko: '파트너는 대화할 때?', en: 'When my partner talks, they:', ja: 'パートナーが会話する時？' },
    options: {
      ko: ['핵심만 간결하게 말한다', '맥락을 충분히 설명한다', '이야기로 풀어서 말한다', '비유나 예시를 많이 사용한다'],
      en: ['Get to the point concisely', 'Explain with sufficient context', 'Tell it as a story', 'Use many metaphors and examples'],
      ja: ['要点を簡潔に伝える', '文脈を十分に説明する', '話として展開する', '比喩や例えをよく使う'],
    },
  },
  {
    id: 'q4', dimension: 'values',
    self: { ko: '나에게 돈은?', en: 'To me, money is:', ja: '私にとってお金は？' },
    partner: { ko: '파트너에게 돈은?', en: 'To my partner, money is:', ja: 'パートナーにとってお金は？' },
    options: {
      ko: ['안정과 미래를 위한 것', '지금 행복을 위한 것', '경험과 성장을 위한 것', '나눔과 기여를 위한 것'],
      en: ['For stability and the future', 'For happiness now', 'For experiences and growth', 'For giving and contributing'],
      ja: ['安定と未来のため', '今の幸福のため', '経験と成長のため', '分かち合いと貢献のため'],
    },
  },
  {
    id: 'q5', dimension: 'values',
    self: { ko: '나에게 가장 중요한 것은?', en: 'The most important thing to me is:', ja: '私にとって最も大切なことは？' },
    partner: { ko: '파트너에게 가장 중요한 것은?', en: 'The most important thing to my partner is:', ja: 'パートナーにとって最も大切なことは？' },
    options: {
      ko: ['가족과 인간관계', '성취와 성공', '자유와 모험', '내면의 평화와 성장'],
      en: ['Family and relationships', 'Achievement and success', 'Freedom and adventure', 'Inner peace and growth'],
      ja: ['家族と人間関係', '成就と成功', '自由と冒険', '内なる平和と成長'],
    },
  },
  {
    id: 'q6', dimension: 'values',
    self: { ko: '나는 미래를 어떻게 생각하나?', en: 'How do I think about the future?', ja: '私は未来についてどう考える？' },
    partner: { ko: '파트너는 미래를 어떻게 생각하나?', en: 'How does my partner think about the future?', ja: 'パートナーは未来についてどう考える？' },
    options: {
      ko: ['구체적인 계획을 세운다', '큰 방향만 정하고 유연하게', '지금에 집중하며 흘러간다', '직관을 따라 결정한다'],
      en: ['Make concrete plans', 'Set a general direction and stay flexible', 'Focus on now and go with the flow', 'Follow intuition to decide'],
      ja: ['具体的な計画を立てる', '大きな方向だけ決めて柔軟に', '今に集中して流れに任せる', '直感に従って決める'],
    },
  },
  {
    id: 'q7', dimension: 'lifestyle',
    self: { ko: '주말을 보내는 나의 이상적인 방식은?', en: 'My ideal way to spend weekends:', ja: '週末の過ごし方の理想は？' },
    partner: { ko: '파트너가 이상적으로 보내는 주말은?', en: 'My partner\'s ideal weekend:', ja: 'パートナーの理想の週末は？' },
    options: {
      ko: ['활동적인 외출과 사람들과의 만남', '집에서 편안하게 쉬기', '새로운 장소 탐험이나 여행', '취미 활동과 창작에 집중'],
      en: ['Active outings and meeting people', 'Relaxing comfortably at home', 'Exploring new places or traveling', 'Focusing on hobbies and creativity'],
      ja: ['活動的な外出と人との交流', '家でゆっくり休む', '新しい場所の探索や旅行', '趣味活動や創作に集中'],
    },
  },
  {
    id: 'q8', dimension: 'lifestyle',
    self: { ko: '나의 에너지 회복 방식은?', en: 'How I recharge my energy:', ja: '私のエネルギー回復方法は？' },
    partner: { ko: '파트너의 에너지 회복 방식은?', en: 'How my partner recharges:', ja: 'パートナーのエネルギー回復方法は？' },
    options: {
      ko: ['혼자만의 조용한 시간', '가까운 사람들과 함께', '활동적인 운동이나 여행', '자연 속에서 여유롭게'],
      en: ['Quiet time alone', 'Being with close people', 'Active exercise or travel', 'Leisurely time in nature'],
      ja: ['一人での静かな時間', '親しい人たちと一緒に', '活動的な運動や旅行', '自然の中でのんびりと'],
    },
  },
  {
    id: 'q9', dimension: 'lifestyle',
    self: { ko: '나는 정리정돈을?', en: 'When it comes to tidiness, I:', ja: '片づけについて私は？' },
    partner: { ko: '파트너는 정리정돈을?', en: 'When it comes to tidiness, my partner:', ja: '片づけについてパートナーは？' },
    options: {
      ko: ['항상 깔끔하게 유지한다', '대체로 정리되어 있다', '필요할 때 정리한다', '창의적인 혼란을 즐긴다'],
      en: ['Always keep it spotless', 'Generally kept tidy', 'Tidy up when needed', 'Enjoy creative chaos'],
      ja: ['常に整然と保つ', 'おおむね整理されている', '必要な時に片付ける', 'クリエイティブな混沌を楽しむ'],
    },
  },
  {
    id: 'q10', dimension: 'emotional',
    self: { ko: '나는 상처를 받으면?', en: 'When I\'m hurt, I:', ja: '傷ついた時、私は？' },
    partner: { ko: '파트너는 상처를 받으면?', en: 'When my partner is hurt, they:', ja: '傷ついた時、パートナーは？' },
    options: {
      ko: ['바로 말하고 해결하려 한다', '시간이 지나면 회복된다', '깊이 반추하며 이해한다', '감정을 혼자 처리한다'],
      en: ['Address it immediately', 'Recover after some time', 'Deeply reflect to understand', 'Process emotions alone'],
      ja: ['すぐに話して解決しようとする', '時間が経てば回復する', '深く反芻して理解する', '感情を一人で処理する'],
    },
  },
  {
    id: 'q11', dimension: 'emotional',
    self: { ko: '나는 사랑을 어떻게 표현하나?', en: 'How do I express love?', ja: '私はどのように愛を表現する？' },
    partner: { ko: '파트너는 사랑을 어떻게 표현하나?', en: 'How does my partner express love?', ja: 'パートナーはどのように愛を表現する？' },
    options: {
      ko: ['말과 언어로', '함께 하는 시간으로', '선물이나 배려로', '스킨십과 표현으로'],
      en: ['Through words and language', 'Through quality time together', 'Through gifts or care', 'Through physical touch and expression'],
      ja: ['言葉や言語で', '一緒に過ごす時間で', '贈り物や気遣いで', 'スキンシップや表現で'],
    },
  },
  {
    id: 'q12', dimension: 'emotional',
    self: { ko: '나는 파트너에게 무엇을 가장 필요로 하나?', en: 'What do I need most from my partner?', ja: 'パートナーに最も必要なものは？' },
    partner: { ko: '파트너는 나에게 무엇을 가장 필요로 하나?', en: 'What does my partner need most from me?', ja: 'パートナーが私に最も必要なものは？' },
    options: {
      ko: ['정서적 지지와 공감', '지적 자극과 대화', '신뢰와 안정감', '자유와 존중'],
      en: ['Emotional support and empathy', 'Intellectual stimulation and conversation', 'Trust and stability', 'Freedom and respect'],
      ja: ['感情的サポートと共感', '知的刺激と対話', '信頼と安定感', '自由と尊重'],
    },
  },
]

function calcCompatibility(selfAnswers: number[], partnerAnswers: number[]): Record<Dimension, number> {
  const dims: Dimension[] = ['communication', 'values', 'lifestyle', 'emotional']
  const result: Partial<Record<Dimension, number>> = {}

  dims.forEach(dim => {
    const dimQs = QUESTIONS.filter(q => q.dimension === dim)
    let score = 0
    dimQs.forEach((q) => {
      const qi = QUESTIONS.indexOf(q)
      const selfAns = selfAnswers[qi] ?? 0
      const partAns = partnerAnswers[qi] ?? 0
      // Same answer = 100, adjacent = 67, 2 apart = 33, opposite = 0
      const diff = Math.abs(selfAns - partAns)
      score += diff === 0 ? 100 : diff === 1 ? 67 : diff === 2 ? 33 : 0
    })
    result[dim] = Math.round(score / dimQs.length)
  })

  return result as Record<Dimension, number>
}

interface Props { locale?: string }

export default function CompatibilityTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]

  const [phase, setPhase] = useState<Phase>('self')
  const [selfAnswers, setSelfAnswers] = useState<number[]>([])
  const [partnerAnswers, setPartnerAnswers] = useState<number[]>([])
  const [current, setCurrent] = useState(0)
  const [dimScores, setDimScores] = useState<Record<Dimension, number> | null>(null)

  function pick(optIdx: number) {
    if (phase === 'self') {
      const newAns = [...selfAnswers, optIdx]
      setSelfAnswers(newAns)
      if (current + 1 >= QUESTIONS.length) {
        setCurrent(0)
        setPhase('partner')
      } else {
        setCurrent(current + 1)
      }
    } else {
      const newAns = [...partnerAnswers, optIdx]
      setPartnerAnswers(newAns)
      if (current + 1 >= QUESTIONS.length) {
        setDimScores(calcCompatibility(selfAnswers, newAns))
        setPhase('result')
      } else {
        setCurrent(current + 1)
      }
    }
  }

  function restart() {
    setPhase('self')
    setSelfAnswers([])
    setPartnerAnswers([])
    setCurrent(0)
    setDimScores(null)
  }

  function share() {
    if (!dimScores) return
    const overall = Math.round(Object.values(dimScores).reduce((a, b) => a + b, 0) / 4)
    const url = window.location.href
    const text = `${lb.shareMsg} ${overall}%`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  if (phase === 'result' && dimScores) {
    const overall = Math.round(Object.values(dimScores).reduce((a, b) => a + b, 0) / 4)
    const level = overall >= 70 ? 'high' : overall >= 45 ? 'medium' : 'low'
    const levelColor = level === 'high' ? '#22c55e' : level === 'medium' ? '#f59e0b' : '#6366f1'
    const levelLabel = level === 'high' ? lb.compatible : level === 'medium' ? lb.moderate : lb.different
    const dims: Dimension[] = ['communication', 'values', 'lifestyle', 'emotional']

    return (
      <div className="space-y-6" aria-live="polite">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <div
            className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
            style={{ backgroundColor: levelColor }}
          >
            {levelLabel}
          </div>
          <div className="text-4xl font-bold" style={{ color: levelColor }}>{overall}%</div>
          <p className="text-sm text-muted-foreground leading-relaxed">{lb.compatDesc[level]}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">{lb.overallLabel}</h3>
          {dims.map(dim => {
            const score = dimScores[dim]
            const barColor = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#6366f1'
            return (
              <div key={dim} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium">{lb.dimLabels[dim]}</span>
                  <span className="font-bold" style={{ color: barColor }}>{score}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: barColor }}
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={lb.dimLabels[dim]}
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
  const qText = phase === 'self' ? q.self[locale] : q.partner[locale]
  const phaseTitle = phase === 'self' ? lb.selfPhaseTitle : lb.partnerPhaseTitle
  const totalAnswered = phase === 'self' ? current : QUESTIONS.length + current
  const totalQ = QUESTIONS.length * 2
  const progress = Math.round((totalAnswered / totalQ) * 100)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{lb.title}</h1>
        <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        <p className="text-xs font-medium text-primary">{phaseTitle}</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{lb.questionOf(totalAnswered + 1, totalQ)}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-lg font-medium">{qText}</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.choose}</p>
      <div className="grid gap-2">
        {q.options[locale].map((opt, i) => (
          <button
            key={i}
            onClick={() => pick(i)}
            aria-label={opt}
            className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
          >
            <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">
              {i + 1}
            </span>
            {opt}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
    </div>
  )
}
