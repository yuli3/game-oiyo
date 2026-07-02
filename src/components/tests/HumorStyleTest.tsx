import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type HumorDim = 'affiliative' | 'selfEnhancing' | 'aggressive' | 'selfDefeating'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

interface Question {
  id: string
  text: string
  dim: HumorDim
}

interface DimResult {
  title: string
  description: string
  strength: string
  watchout: string
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string
  share: string
  shareMsg: string
  yourStyle: string
  dominant: string
  dimensionsLabel: string
  strengthLabel: string
  watchoutLabel: string
  disclaimer: string
  dimNames: Record<HumorDim, string>
}> = {
  ko: {
    title: '유머 스타일 테스트',
    subtitle: '나는 어떻게 웃음을 사용하는가?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아니다', '아닌 편이다', '보통이다', '그런 편이다', '매우 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 유머 스타일 테스트 결과',
    yourStyle: '나의 유머 스타일',
    dominant: '지배적인 스타일',
    dimensionsLabel: '4가지 유머 스타일 점수',
    strengthLabel: '강점',
    watchoutLabel: '주의할 점',
    disclaimer: '이 테스트는 Martin의 유머 스타일 이론을 기반으로 한 자기 이해 도구입니다.',
    dimNames: {
      affiliative: '친화적 유머',
      selfEnhancing: '자기강화 유머',
      aggressive: '공격적 유머',
      selfDefeating: '자기비하 유머',
    },
  },
  en: {
    title: 'Humor Style Test',
    subtitle: 'How Do You Use Humor?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My humor style test result',
    yourStyle: 'Your Humor Style',
    dominant: 'Dominant Style',
    dimensionsLabel: '4 Humor Style Scores',
    strengthLabel: 'Strength',
    watchoutLabel: 'Watch Out For',
    disclaimer: "This test is a self-awareness tool based on Martin's Humor Styles theory.",
    dimNames: {
      affiliative: 'Affiliative Humor',
      selfEnhancing: 'Self-Enhancing Humor',
      aggressive: 'Aggressive Humor',
      selfDefeating: 'Self-Defeating Humor',
    },
  },
  ja: {
    title: 'ユーモアスタイルテスト',
    subtitle: '私はどうやって笑いを使う？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全く違う', '違う', '普通', 'そうだ', '非常にそうだ'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: 'ユーモアスタイルテストの結果',
    yourStyle: '私のユーモアスタイル',
    dominant: '主要スタイル',
    dimensionsLabel: '4つのユーモアスタイルスコア',
    strengthLabel: '強み',
    watchoutLabel: '注意点',
    disclaimer: 'このテストはMartinのユーモアスタイル理論に基づく自己理解ツールです。',
    dimNames: {
      affiliative: '親和的ユーモア',
      selfEnhancing: '自己強化ユーモア',
      aggressive: '攻撃的ユーモア',
      selfDefeating: '自己卑下ユーモア',
    },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', text: '나는 사람들과 함께 웃으며 분위기를 밝게 하는 것을 즐긴다', dim: 'affiliative' },
    { id: 'q2', text: '나는 유머를 통해 친구들과 더 가까워진다고 느낀다', dim: 'affiliative' },
    { id: 'q3', text: '다른 사람을 웃게 만드는 것이 나에게 큰 즐거움이다', dim: 'affiliative' },
    { id: 'q4', text: '나는 혼자 있어도 일상에서 유머러스한 면을 발견한다', dim: 'selfEnhancing' },
    { id: 'q5', text: '힘든 상황에서도 웃음을 잃지 않는 편이다', dim: 'selfEnhancing' },
    { id: 'q6', text: '나는 스트레스를 유머로 완화하는 능력이 있다', dim: 'selfEnhancing' },
    { id: 'q7', text: '나는 다른 사람을 조롱하거나 풍자하는 농담을 즐긴다', dim: 'aggressive' },
    { id: 'q8', text: '유머는 상대방이 불쾌해도 웃기면 괜찮다고 생각한다', dim: 'aggressive' },
    { id: 'q9', text: '나는 다른 사람을 희생시키는 농담이 더 재미있다고 느낀다', dim: 'aggressive' },
    { id: 'q10', text: '나는 남들에게 웃음을 주기 위해 나 자신을 우스꽝스럽게 만든다', dim: 'selfDefeating' },
    { id: 'q11', text: '사람들이 나를 비웃을 때도 그냥 함께 웃어넘긴다', dim: 'selfDefeating' },
    { id: 'q12', text: '관계를 위해 내 감정이 상해도 웃겨 보이려 한다', dim: 'selfDefeating' },
    { id: 'q13', text: '나는 그룹에서 즉흥적인 유머로 분위기를 이끈다', dim: 'affiliative' },
    { id: 'q14', text: '삶의 어두운 면에서도 재미있는 부분을 찾으려 한다', dim: 'selfEnhancing' },
    { id: 'q15', text: '나는 목적 달성을 위해 다른 사람을 웃음거리로 삼기도 한다', dim: 'aggressive' },
    { id: 'q16', text: '나는 인기를 얻기 위해 스스로 망신을 당하는 행동을 한다', dim: 'selfDefeating' },
  ],
  en: [
    { id: 'q1', text: 'I enjoy lightening the mood by laughing with others', dim: 'affiliative' },
    { id: 'q2', text: 'Humor helps me feel closer to my friends', dim: 'affiliative' },
    { id: 'q3', text: 'Making others laugh brings me great joy', dim: 'affiliative' },
    { id: 'q4', text: 'Even when alone, I notice funny things in everyday life', dim: 'selfEnhancing' },
    { id: 'q5', text: 'I tend not to lose my sense of humor even in tough times', dim: 'selfEnhancing' },
    { id: 'q6', text: 'I can use humor to ease my own stress', dim: 'selfEnhancing' },
    { id: 'q7', text: 'I enjoy jokes that tease or mock other people', dim: 'aggressive' },
    { id: 'q8', text: "Humor is fine even if the other person feels uncomfortable, as long as it's funny", dim: 'aggressive' },
    { id: 'q9', text: 'I find jokes funnier when they come at someone else\'s expense', dim: 'aggressive' },
    { id: 'q10', text: 'I make myself look silly in order to get laughs', dim: 'selfDefeating' },
    { id: 'q11', text: "When people laugh at me, I just go along with it", dim: 'selfDefeating' },
    { id: 'q12', text: 'I act funny even when my feelings are hurt, to please others', dim: 'selfDefeating' },
    { id: 'q13', text: 'I often lead the mood with spontaneous humor in a group', dim: 'affiliative' },
    { id: 'q14', text: 'I try to find something funny even in the dark sides of life', dim: 'selfEnhancing' },
    { id: 'q15', text: 'I sometimes make others the butt of a joke to get what I want', dim: 'aggressive' },
    { id: 'q16', text: 'I do embarrassing things to gain popularity', dim: 'selfDefeating' },
  ],
  ja: [
    { id: 'q1', text: '他の人と一緒に笑って雰囲気を明るくするのが好きだ', dim: 'affiliative' },
    { id: 'q2', text: 'ユーモアを通じて友人とより親密になれると感じる', dim: 'affiliative' },
    { id: 'q3', text: '他の人を笑わせることが大きな喜びだ', dim: 'affiliative' },
    { id: 'q4', text: '一人でいても日常でユーモラスな面を見つける', dim: 'selfEnhancing' },
    { id: 'q5', text: '辛い状況でも笑いを失わない方だ', dim: 'selfEnhancing' },
    { id: 'q6', text: 'ユーモアでストレスを和らげる能力がある', dim: 'selfEnhancing' },
    { id: 'q7', text: '他の人をからかったり風刺するジョークが好きだ', dim: 'aggressive' },
    { id: 'q8', text: '相手が不快でも面白ければユーモアは構わないと思う', dim: 'aggressive' },
    { id: 'q9', text: '誰かを犠牲にするジョークの方が面白いと感じる', dim: 'aggressive' },
    { id: 'q10', text: '笑いを取るために自分をおかしく見せる', dim: 'selfDefeating' },
    { id: 'q11', text: '人に笑われても一緒に笑い流す', dim: 'selfDefeating' },
    { id: 'q12', text: '気持ちが傷ついても関係のために面白く振る舞う', dim: 'selfDefeating' },
    { id: 'q13', text: 'グループで即興ユーモアで雰囲気をリードすることが多い', dim: 'affiliative' },
    { id: 'q14', text: '人生の暗い面でも面白い部分を見つけようとする', dim: 'selfEnhancing' },
    { id: 'q15', text: '目的達成のために他の人を笑い者にすることがある', dim: 'aggressive' },
    { id: 'q16', text: '人気を得るために恥ずかしい行動をする', dim: 'selfDefeating' },
  ],
}

const DIM_RESULTS: Record<HumorDim, Record<SupportedLang, DimResult>> = {
  affiliative: {
    ko: {
      title: '친화적 유머',
      description: '유머로 관계를 돈독히 하는 스타일입니다. 사람들을 웃게 만들고 집단의 결속을 높이는 데 탁월합니다.',
      strength: '높은 사회성, 갈등 완화, 긍정적인 분위기 조성',
      watchout: '지나치면 진지한 상황에서도 농담을 하려 할 수 있습니다',
    },
    en: {
      title: 'Affiliative Humor',
      description: 'You use humor to bond with others. You excel at making people laugh and building group cohesion.',
      strength: 'High sociability, conflict reduction, positive atmosphere',
      watchout: 'In excess, you may feel compelled to joke even in serious situations',
    },
    ja: {
      title: '親和的ユーモア',
      description: 'ユーモアで関係を深めるスタイルです。人を笑わせ、集団の結束を高めるのが得意です。',
      strength: '高い社交性、葛藤の緩和、ポジティブな雰囲気の創出',
      watchout: '過度になると深刻な状況でも冗談を言おうとするかもしれません',
    },
  },
  selfEnhancing: {
    ko: {
      title: '자기강화 유머',
      description: '삶의 역경 속에서도 유머를 통해 심리적 균형을 유지하는 스타일입니다. 혼자 있어도 세상의 재미있는 면을 발견합니다.',
      strength: '회복탄력성, 스트레스 완화, 내적 안정감',
      watchout: '힘든 상황을 유머로만 회피하려 할 수 있습니다',
    },
    en: {
      title: 'Self-Enhancing Humor',
      description: 'You maintain psychological balance through humor even in adversity. You find amusing things in life even when alone.',
      strength: 'Resilience, stress relief, inner stability',
      watchout: 'You may use humor to avoid confronting difficult situations',
    },
    ja: {
      title: '自己強化ユーモア',
      description: '逆境の中でもユーモアを通じて心理的バランスを保つスタイルです。一人でも世界の面白い面を見つけます。',
      strength: 'レジリエンス、ストレス緩和、内的安定感',
      watchout: '困難な状況をユーモアだけで回避しようとするかもしれません',
    },
  },
  aggressive: {
    ko: {
      title: '공격적 유머',
      description: '풍자, 조롱, 비꼬는 유머를 즐기는 스타일입니다. 재치 있지만 타인이 상처받을 수 있습니다.',
      strength: '날카로운 재치, 직설적 표현력',
      watchout: '의도치 않게 관계를 손상시키거나 상대방에게 상처를 줄 수 있습니다',
    },
    en: {
      title: 'Aggressive Humor',
      description: 'You enjoy satire, mockery, and sarcastic humor. You can be very witty, but others may be hurt.',
      strength: 'Sharp wit, direct expression',
      watchout: 'You may unintentionally damage relationships or hurt others',
    },
    ja: {
      title: '攻撃的ユーモア',
      description: '風刺、嘲笑、皮肉なユーモアを楽しむスタイルです。機知に富んでいますが他者が傷つくことがあります。',
      strength: '鋭い機知、直接的な表現力',
      watchout: '意図せず関係を損なったり相手を傷つける可能性があります',
    },
  },
  selfDefeating: {
    ko: {
      title: '자기비하 유머',
      description: '자신을 웃음거리로 만들어 타인의 인정을 구하는 스타일입니다. 유연해 보이지만 자존감에 영향을 줄 수 있습니다.',
      strength: '갈등 회피, 분위기 전환 능력',
      watchout: '반복될수록 자존감이 낮아지고 남들이 당신을 과소평가할 수 있습니다',
    },
    en: {
      title: 'Self-Defeating Humor',
      description: 'You make yourself the butt of jokes to seek approval. You seem flexible, but it can affect your self-esteem.',
      strength: 'Conflict avoidance, mood-shifting ability',
      watchout: 'The more you do this, the more it can erode self-esteem and lead others to underestimate you',
    },
    ja: {
      title: '自己卑下ユーモア',
      description: '自分を笑いものにして他者の承認を求めるスタイルです。柔軟に見えますが自尊心に影響することがあります。',
      strength: '葛藤回避、雰囲気転換能力',
      watchout: '繰り返すほど自尊心が下がり、他者にあなたを過小評価させる可能性があります',
    },
  },
}

interface Props { locale?: string }

export default function HumorStyleTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp)
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [scores, setScores] = useState<Record<HumorDim, number>>({
    affiliative: 0, selfEnhancing: 0, aggressive: 0, selfDefeating: 0,
  })
  const [done, setDone] = useState(false)

  function pick(val: number) {
    const q = questions[current]
    const newScores = { ...scores, [q.dim]: scores[q.dim] + val }
    const nextIdx = current + 1
    if (nextIdx >= questions.length) {
      setScores(newScores)
      setDone(true)
    } else {
      setScores(newScores)
      setCurrent(nextIdx)
    }
  }

  function restart() {
    setScores({ affiliative: 0, selfEnhancing: 0, aggressive: 0, selfDefeating: 0 })
    setCurrent(0)
    setDone(false)
  }

  function share() {
    const url = window.location.href
    const dom = dominantDim()
    const text = `${lb.shareMsg} — ${lb.dimNames[dom]}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  function dominantDim(): HumorDim {
    const dims: HumorDim[] = ['affiliative', 'selfEnhancing', 'aggressive', 'selfDefeating']
    return dims.reduce((a, b) => scores[a] >= scores[b] ? a : b)
  }

  const maxScore = 20
  const dimColors: Record<HumorDim, string> = {
    affiliative: '#22c55e',
    selfEnhancing: '#3b82f6',
    aggressive: '#ef4444',
    selfDefeating: '#f59e0b',
  }

  if (!done) {
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
              onClick={() => pick(i + 1)}
              aria-label={label}
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
            >
              <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.disclaimer}</p>
      </div>
    )
  }

  const dom = dominantDim()
  const domResult = DIM_RESULTS[dom][l]
  const dims: HumorDim[] = ['affiliative', 'selfEnhancing', 'aggressive', 'selfDefeating']

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.dominant}</p>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: dimColors[dom] }}
        >
          {lb.dimNames[dom]}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{domResult.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">{lb.dimensionsLabel}</h3>
        {dims.map(d => {
          const pct = Math.round((scores[d] / maxScore) * 100)
          return (
            <div key={d} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{lb.dimNames[d]}</span>
                <span className="text-muted-foreground">{scores[d]} / {maxScore}</span>
              </div>
              <div
                className="h-3 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lb.dimNames[d]}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: dimColors[d] }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-green-600">{lb.strengthLabel}</h3>
        <p className="text-sm text-muted-foreground">{domResult.strength}</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-amber-700">{lb.watchoutLabel}</h3>
        <p className="text-sm text-amber-700">{domResult.watchout}</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.disclaimer}</p>
      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
