import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type GritLevel = 'starter' | 'growing' | 'mature' | 'expert'
type Subscale = 'perseverance' | 'consistency'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Question {
  id: string
  subscale: Subscale
  reverse: boolean
  text: string
}

interface LevelData {
  icon: string; title: string; description: string; tips: string[]
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string; share: string; shareMsg: string
  yourScore: string; gritScore: string; perseveranceLabel: string; consistencyLabel: string
  outOf: string; levelLabel: string; tipsLabel: string; note: string
}> = {
  ko: {
    title: '그릿 척도 테스트',
    subtitle: '나의 열정과 인내는 몇 점일까?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 그렇지 않다', '거의 그렇지 않다', '보통이다', '대체로 그렇다', '매우 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 그릿 점수는',
    yourScore: '나의 그릿 점수',
    gritScore: '종합 그릿 점수',
    perseveranceLabel: '노력의 지속성',
    consistencyLabel: '관심의 일관성',
    outOf: '/ 5.0',
    levelLabel: '그릿 단계',
    tipsLabel: '성장 팁',
    note: '이 테스트는 앤절라 덕워스의 그릿 이론에서 영감을 받았습니다. 전문적 진단을 대체하지 않습니다.',
  },
  en: {
    title: 'Grit Scale Test',
    subtitle: 'How passionate and persistent are you?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not at all like me', 'Not much like me', 'Somewhat like me', 'Mostly like me', 'Very much like me'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My grit score is',
    yourScore: 'Your Grit Score',
    gritScore: 'Overall Grit Score',
    perseveranceLabel: 'Perseverance of Effort',
    consistencyLabel: 'Consistency of Interest',
    outOf: '/ 5.0',
    levelLabel: 'Grit Level',
    tipsLabel: 'Growth Tips',
    note: 'This test is inspired by Angela Duckworth\'s Grit theory. It does not replace professional assessment.',
  },
  ja: {
    title: 'グリットスケールテスト',
    subtitle: '私の情熱と忍耐力は何点？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くそう思わない', 'あまりそう思わない', '普通', 'だいたいそう思う', 'とてもそう思う'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のグリットスコアは',
    yourScore: 'あなたのグリットスコア',
    gritScore: '総合グリットスコア',
    perseveranceLabel: '努力の継続性',
    consistencyLabel: '興味の一貫性',
    outOf: '/ 5.0',
    levelLabel: 'グリットレベル',
    tipsLabel: '成長のヒント',
    note: 'このテストはアンジェラ・ダックワースのグリット理論にインスパイアされています。専門的な診断の代替ではありません。',
  },
}

const LEVEL_DATA: Record<GritLevel, Record<SupportedLang, LevelData>> = {
  starter: {
    ko: {
      icon: '🌱',
      title: '입문 단계',
      description: '그릿 근육을 키울 여지가 많습니다. 아직 장기 목표 추구와 어려움을 극복하는 경험이 쌓이는 중입니다.',
      tips: [
        '작은 목표부터 시작해 완수하는 경험을 쌓으세요.',
        '"5분 더" 규칙으로 포기 충동을 이겨내는 연습을 하세요.',
        '단기 성취를 기록해 성장의 증거를 만드세요.',
      ],
    },
    en: {
      icon: '🌱',
      title: 'Starter Level',
      description: 'There is lots of room to build your grit muscles. You are still developing experiences of pursuing long-term goals and overcoming challenges.',
      tips: [
        'Start with small goals and build a track record of completing them.',
        'Practice the "5 more minutes" rule to resist the urge to quit.',
        'Keep a log of short-term achievements to create evidence of growth.',
      ],
    },
    ja: {
      icon: '🌱',
      title: '入門段階',
      description: 'グリットの筋肉を鍛える余地がたくさんあります。長期目標を追求し困難を克服する経験をまだ積んでいる段階です。',
      tips: [
        '小さな目標から始めて達成する経験を積みましょう。',
        '「あと5分」ルールで諦めたい衝動を乗り越える練習をしましょう。',
        '短期達成を記録して成長の証を作りましょう。',
      ],
    },
  },
  growing: {
    ko: {
      icon: '🌿',
      title: '성장 단계',
      description: '꾸준한 노력과 관심을 발전시키고 있습니다. 그릿의 기초가 형성되고 있으며 더 강해질 잠재력이 있습니다.',
      tips: [
        '흥미가 사라질 때를 기록해 패턴을 파악하세요.',
        '어려운 순간을 성장의 증거로 재해석하는 연습을 하세요.',
        '그릿이 강한 롤모델을 찾아 그들의 이야기를 읽어보세요.',
      ],
    },
    en: {
      icon: '🌿',
      title: 'Growing Level',
      description: 'You are developing steady effort and sustained interest. The foundations of grit are forming and you have great potential to grow stronger.',
      tips: [
        'Log when your interest fades to identify patterns.',
        'Practice reframing difficult moments as evidence of growth.',
        'Find role models with strong grit and read their stories.',
      ],
    },
    ja: {
      icon: '🌿',
      title: '成長段階',
      description: '着実な努力と持続的な関心を培っています。グリットの基盤が形成されており、さらに強くなる可能性があります。',
      tips: [
        '興味が薄れる時を記録してパターンを把握しましょう。',
        '困難な瞬間を成長の証として捉え直す練習をしましょう。',
        'グリットの強いロールモデルを見つけて彼らの物語を読みましょう。',
      ],
    },
  },
  mature: {
    ko: {
      icon: '🌲',
      title: '성숙 단계',
      description: '강한 그릿으로 도전을 극복합니다. 장기 목표에 대한 헌신과 역경을 이겨내는 능력이 잘 발달되어 있습니다.',
      tips: [
        '더 어려운 도전으로 그릿 근육을 강화하세요.',
        '주변 사람들에게 그릿을 모델링해 보세요.',
        '목표의 "왜"를 더 깊이 탐구해 내적 동기를 강화하세요.',
      ],
    },
    en: {
      icon: '🌲',
      title: 'Mature Level',
      description: 'You overcome challenges with strong grit. Your commitment to long-term goals and ability to persevere through adversity are well-developed.',
      tips: [
        'Take on harder challenges to strengthen your grit muscles further.',
        'Model grit for the people around you.',
        'Explore the "why" behind your goals more deeply to strengthen intrinsic motivation.',
      ],
    },
    ja: {
      icon: '🌲',
      title: '成熟段階',
      description: '強いグリットで困難を乗り越えます。長期目標へのコミットメントと逆境を乗り越える能力が十分に発達しています。',
      tips: [
        'より難しい挑戦でグリットの筋肉をさらに強化しましょう。',
        '周りの人々にグリットをモデリングしましょう。',
        '目標の「なぜ」をより深く探求して内発的動機を強化しましょう。',
      ],
    },
  },
  expert: {
    ko: {
      icon: '🏔️',
      title: '전문 단계',
      description: '최상위 수준의 그릿을 보유하고 있습니다. 당신의 열정과 인내는 주변 사람들에게 영감을 줍니다.',
      tips: [
        '당신의 그릿은 주변 사람들에게 영감을 줍니다.',
        '이 강점으로 더 큰 목표를 설정해보세요.',
        '그릿을 발휘한 경험을 글이나 멘토링으로 나눠보세요.',
      ],
    },
    en: {
      icon: '🏔️',
      title: 'Expert Level',
      description: 'You possess top-tier grit. Your passion and perseverance are an inspiration to those around you.',
      tips: [
        'Your grit is an inspiration to the people around you.',
        'Use this strength to set even bigger goals.',
        'Share your grit experiences through writing or mentoring.',
      ],
    },
    ja: {
      icon: '🏔️',
      title: '専門段階',
      description: '最高レベルのグリットを持っています。あなたの情熱と忍耐力は周りの人々にインスピレーションを与えます。',
      tips: [
        'あなたのグリットは周りの人々へのインスピレーションです。',
        'この強みでさらに大きな目標を設定してみましょう。',
        'グリットを発揮した経験を文章やメンタリングで分かち合いましょう。',
      ],
    },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'p1', subscale: 'perseverance', reverse: false, text: '한번 시작한 일은 어렵더라도 끝까지 해낸다' },
    { id: 'p2', subscale: 'perseverance', reverse: false, text: '장애물이 있어도 포기하지 않고 계속 노력한다' },
    { id: 'p3', subscale: 'perseverance', reverse: false, text: '목표 달성을 위해 열심히 노력하는 편이다' },
    { id: 'p4', subscale: 'perseverance', reverse: true, text: '실패하면 쉽게 의지를 잃는다' },
    { id: 'p5', subscale: 'perseverance', reverse: true, text: '힘든 일이 생기면 그만두고 싶어진다' },
    { id: 'p6', subscale: 'perseverance', reverse: false, text: '꾸준히 노력하면 어떤 목표도 달성할 수 있다고 믿는다' },
    { id: 'c1', subscale: 'consistency', reverse: false, text: '오랫동안 같은 목표나 관심사에 집중할 수 있다' },
    { id: 'c2', subscale: 'consistency', reverse: true, text: '새로운 아이디어나 프로젝트에 쉽게 흥미를 잃는다' },
    { id: 'c3', subscale: 'consistency', reverse: true, text: '내가 추구하는 것이 자주 바뀐다' },
    { id: 'c4', subscale: 'consistency', reverse: false, text: '1년 이상 같은 목표를 향해 꾸준히 노력한 경험이 있다' },
    { id: 'c5', subscale: 'consistency', reverse: true, text: '몇 달 열심히 하다가 금방 관심이 사라지는 경우가 많다' },
    { id: 'c6', subscale: 'consistency', reverse: false, text: '내 삶에는 중요한 장기 목표가 있고 그것을 향해 나아가고 있다' },
  ],
  en: [
    { id: 'p1', subscale: 'perseverance', reverse: false, text: 'I finish whatever I begin, even when it is difficult' },
    { id: 'p2', subscale: 'perseverance', reverse: false, text: 'I keep working toward my goals even when I face obstacles' },
    { id: 'p3', subscale: 'perseverance', reverse: false, text: 'I work hard to achieve my goals' },
    { id: 'p4', subscale: 'perseverance', reverse: true, text: 'I easily lose motivation after a failure' },
    { id: 'p5', subscale: 'perseverance', reverse: true, text: 'When things get hard, I want to give up' },
    { id: 'p6', subscale: 'perseverance', reverse: false, text: 'I believe consistent effort can achieve any goal' },
    { id: 'c1', subscale: 'consistency', reverse: false, text: 'I can stay focused on the same goal or interest for a long time' },
    { id: 'c2', subscale: 'consistency', reverse: true, text: 'I quickly lose interest in new ideas or projects' },
    { id: 'c3', subscale: 'consistency', reverse: true, text: 'What I pursue changes frequently' },
    { id: 'c4', subscale: 'consistency', reverse: false, text: 'I have worked steadily toward the same goal for more than a year' },
    { id: 'c5', subscale: 'consistency', reverse: true, text: 'I often work hard for a few months and then lose interest quickly' },
    { id: 'c6', subscale: 'consistency', reverse: false, text: 'I have an important long-term goal and I am working toward it' },
  ],
  ja: [
    { id: 'p1', subscale: 'perseverance', reverse: false, text: '難しくても始めたことはやり遂げる' },
    { id: 'p2', subscale: 'perseverance', reverse: false, text: '障害があっても諦めずに努力し続ける' },
    { id: 'p3', subscale: 'perseverance', reverse: false, text: '目標達成のために一生懸命努力する方だ' },
    { id: 'p4', subscale: 'perseverance', reverse: true, text: '失敗するとすぐにやる気を失う' },
    { id: 'p5', subscale: 'perseverance', reverse: true, text: '辛いことがあると諦めたくなる' },
    { id: 'p6', subscale: 'perseverance', reverse: false, text: '継続的な努力でどんな目標も達成できると信じる' },
    { id: 'c1', subscale: 'consistency', reverse: false, text: '長い間、同じ目標や興味に集中できる' },
    { id: 'c2', subscale: 'consistency', reverse: true, text: '新しいアイデアやプロジェクトへの興味をすぐに失う' },
    { id: 'c3', subscale: 'consistency', reverse: true, text: '追求していることがよく変わる' },
    { id: 'c4', subscale: 'consistency', reverse: false, text: '1年以上同じ目標に向けて継続的に努力した経験がある' },
    { id: 'c5', subscale: 'consistency', reverse: true, text: '数ヶ月頑張ってもすぐに興味が薄れることが多い' },
    { id: 'c6', subscale: 'consistency', reverse: false, text: '人生に重要な長期目標があり、それに向かって進んでいる' },
  ],
}

function calcLevel(score: number): GritLevel {
  if (score <= 2.5) return 'starter'
  if (score <= 3.5) return 'growing'
  if (score <= 4.5) return 'mature'
  return 'expert'
}

function adjustScore(raw: number, reverse: boolean): number {
  return reverse ? 6 - raw : raw
}

interface Props { locale?: string }

export default function GritScaleTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp ?? 'ko')
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [done, setDone] = useState(false)

  function pick(val: number) {
    const next = [...answers, val]
    if (current + 1 >= questions.length) {
      setAnswers(next)
      setDone(true)
    } else {
      setAnswers(next)
      setCurrent(current + 1)
    }
  }

  function restart() { setAnswers([]); setCurrent(0); setDone(false) }

  function calcScores(ans: number[]) {
    const adjusted = questions.map((q, i) => adjustScore(ans[i] ?? 1, q.reverse))
    const pItems = questions.map((q, i) => ({ sub: q.subscale, adj: adjusted[i] })).filter(x => x.sub === 'perseverance')
    const cItems = questions.map((q, i) => ({ sub: q.subscale, adj: adjusted[i] })).filter(x => x.sub === 'consistency')
    const pScore = pItems.reduce((s, x) => s + x.adj, 0) / pItems.length
    const cScore = cItems.reduce((s, x) => s + x.adj, 0) / cItems.length
    const overall = (pScore + cScore) / 2
    return { pScore, cScore, overall }
  }

  function share() {
    const { overall } = calcScores(answers)
    const url = window.location.href
    const level = calcLevel(overall)
    const text = `${lb.shareMsg} ${overall.toFixed(1)} ${lb.outOf} — ${LEVEL_DATA[level][l].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
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
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
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
              aria-label={label}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-emerald-400 transition-colors flex items-center gap-3"
            >
              <span className="w-6 h-6 rounded-full border-2 border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-600 flex-none">
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

  const { pScore, cScore, overall } = calcScores(answers)
  const level = calcLevel(overall)
  const ld = LEVEL_DATA[level][l]
  const overallPct = Math.round(((overall - 1) / 4) * 100)
  const pPct = Math.round(((pScore - 1) / 4) * 100)
  const cPct = Math.round(((cScore - 1) / 4) * 100)

  const levelColors: Record<GritLevel, string> = {
    starter: '#6ee7b7',
    growing: '#34d399',
    mature: '#10b981',
    expert: '#059669',
  }
  const color = levelColors[level]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourScore}</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          <span>{ld.icon}</span>
          <span>{ld.title}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{ld.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">{lb.gritScore}</span>
            <span className="text-lg font-bold" style={{ color }}>{overall.toFixed(1)} {lb.outOf}</span>
          </div>
          <div
            className="h-3 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={overallPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.gritScore}
          >
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overallPct}%`, backgroundColor: color }} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-muted-foreground">{lb.perseveranceLabel}</span>
            <span className="font-bold" style={{ color }}>{pScore.toFixed(1)} {lb.outOf}</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={pPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.perseveranceLabel}
          >
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pPct}%`, backgroundColor: color }} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-muted-foreground">{lb.consistencyLabel}</span>
            <span className="font-bold" style={{ color }}>{cScore.toFixed(1)} {lb.outOf}</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={cPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.consistencyLabel}
          >
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cPct}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-600">{lb.tipsLabel}</h3>
        <ul className="space-y-1">
          {ld.tips.map(tip => (
            <li key={tip} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-500">→</span>{tip}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors"
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
