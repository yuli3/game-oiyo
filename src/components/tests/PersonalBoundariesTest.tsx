import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

type Domain = 'emotional' | 'physical' | 'time' | 'digital'
type OverallLevel = 'porous' | 'developing' | 'balanced' | 'firm'

interface Question { id: string; text: string; domain: Domain }

const DOMAIN_COLORS: Record<Domain, string> = {
  emotional: '#a855f7',
  physical: '#22c55e',
  time: '#3b82f6',
  digital: '#f97316',
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; note: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string]
  restart: string; share: string; shareMsg: string
  yourBoundary: string; domainProfile: string
  overallStrength: string; guidance: string
  scoreLabel: string; outOf: string
  domainNames: Record<Domain, string>
}> = {
  ko: {
    title: '개인 경계선 강도 테스트',
    subtitle: '나의 경계는 얼마나 건강한가?',
    note: '경계선은 자기 보호와 건강한 관계를 위한 필수 요소입니다. 이 테스트는 자기 인식을 돕는 도구입니다.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아님', '가끔 그럼', '자주 그럼', '항상 그럼'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 개인 경계선 강도',
    yourBoundary: '나의 경계선 강도',
    domainProfile: '영역별 경계선 프로필',
    overallStrength: '전체 경계선 강도',
    guidance: '경계선 강화를 위한 조언',
    scoreLabel: '총 경계선 점수',
    outOf: '/ 48점',
    domainNames: { emotional: '감정 경계선', physical: '신체 경계선', time: '시간 경계선', digital: '디지털 경계선' },
  },
  en: {
    title: 'Personal Boundaries Test',
    subtitle: 'How Strong Are Your Limits?',
    note: 'Boundaries are essential for self-protection and healthy relationships. This test is a tool for self-awareness.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Never', 'Sometimes', 'Often', 'Always'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My personal boundary strength',
    yourBoundary: 'Your Boundary Strength',
    domainProfile: 'Boundary Profile by Domain',
    overallStrength: 'Overall Boundary Strength',
    guidance: 'Guidance for Strengthening Boundaries',
    scoreLabel: 'Total Boundary Score',
    outOf: '/ 48',
    domainNames: { emotional: 'Emotional Boundaries', physical: 'Physical Boundaries', time: 'Time Boundaries', digital: 'Digital Boundaries' },
  },
  ja: {
    title: '個人境界線強度テスト',
    subtitle: '私の境界線はどれほど健全か？',
    note: '境界線は自己保護と健全な関係のための必須要素です。このテストは自己認識を助けるツールです。',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'たまにある', 'よくある', 'いつもそうだ'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の個人境界線の強度',
    yourBoundary: '境界線の強度',
    domainProfile: '領域別境界線プロフィール',
    overallStrength: '全体的な境界線の強度',
    guidance: '境界線強化のためのアドバイス',
    scoreLabel: '合計境界線スコア',
    outOf: '/ 48点',
    domainNames: { emotional: '感情の境界線', physical: '身体的境界線', time: '時間の境界線', digital: 'デジタルの境界線' },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'e1', text: '타인이 나에게 불쾌한 감정을 표출해도 "아니오"라고 말할 수 있다', domain: 'emotional' },
    { id: 'e2', text: '다른 사람의 감정을 책임지지 않아도 된다는 것을 안다', domain: 'emotional' },
    { id: 'e3', text: '누군가 나를 감정적으로 조종하려 할 때 이를 알아챈다', domain: 'emotional' },
    { id: 'p1', text: '원하지 않는 신체 접촉을 거부할 수 있다', domain: 'physical' },
    { id: 'p2', text: '나만의 개인 공간이 필요하다는 것을 편하게 표현할 수 있다', domain: 'physical' },
    { id: 'p3', text: '나의 신체적 편안함이 다른 사람의 기분보다 중요하다고 생각한다', domain: 'physical' },
    { id: 't1', text: '내 시간과 에너지를 무리하게 요구받을 때 거절할 수 있다', domain: 'time' },
    { id: 't2', text: '과도하게 바쁜 일정 앞에서 우선순위를 정하고 일부를 거절한다', domain: 'time' },
    { id: 't3', text: '휴식과 자기 돌봄을 위한 시간을 의도적으로 지킨다', domain: 'time' },
    { id: 'd1', text: '늦은 밤 메시지에 즉시 응답하지 않아도 된다고 느낀다', domain: 'digital' },
    { id: 'd2', text: '소셜 미디어에서 불편한 사람을 차단하거나 언팔할 수 있다', domain: 'digital' },
    { id: 'd3', text: '디지털 기기를 끄고 연결을 끊는 시간을 규칙적으로 갖는다', domain: 'digital' },
  ],
  en: [
    { id: 'e1', text: 'I can say "no" when someone expresses unpleasant emotions toward me', domain: 'emotional' },
    { id: 'e2', text: 'I know that I am not responsible for other people\'s feelings', domain: 'emotional' },
    { id: 'e3', text: 'I recognize when someone is trying to emotionally manipulate me', domain: 'emotional' },
    { id: 'p1', text: 'I can refuse unwanted physical contact', domain: 'physical' },
    { id: 'p2', text: 'I can comfortably express when I need my own personal space', domain: 'physical' },
    { id: 'p3', text: 'I believe my physical comfort matters more than other people\'s moods', domain: 'physical' },
    { id: 't1', text: 'I can decline when unreasonable demands are placed on my time and energy', domain: 'time' },
    { id: 't2', text: 'When facing an overloaded schedule, I set priorities and say no to some things', domain: 'time' },
    { id: 't3', text: 'I intentionally protect time for rest and self-care', domain: 'time' },
    { id: 'd1', text: 'I feel it\'s okay not to reply immediately to late-night messages', domain: 'digital' },
    { id: 'd2', text: 'I can block or unfollow someone who makes me uncomfortable on social media', domain: 'digital' },
    { id: 'd3', text: 'I regularly take time to turn off devices and disconnect', domain: 'digital' },
  ],
  ja: [
    { id: 'e1', text: '誰かが不快な感情をぶつけてきても「ノー」と言える', domain: 'emotional' },
    { id: 'e2', text: '他者の感情に責任を負う必要はないことを知っている', domain: 'emotional' },
    { id: 'e3', text: '誰かが感情的に操作しようとしているとき気づける', domain: 'emotional' },
    { id: 'p1', text: '不要な身体的接触を断ることができる', domain: 'physical' },
    { id: 'p2', text: '自分のパーソナルスペースが必要なことを快適に伝えられる', domain: 'physical' },
    { id: 'p3', text: '自分の身体的快適さは他者の気分より重要だと思う', domain: 'physical' },
    { id: 't1', text: '時間とエネルギーへの無理な要求を断ることができる', domain: 'time' },
    { id: 't2', text: '過密なスケジュールに直面したとき、優先順位をつけて一部を断る', domain: 'time' },
    { id: 't3', text: '休息とセルフケアのための時間を意図的に守る', domain: 'time' },
    { id: 'd1', text: '深夜のメッセージにすぐ返信しなくていいと感じている', domain: 'digital' },
    { id: 'd2', text: 'SNSで不快な人をブロックやアンフォローできる', domain: 'digital' },
    { id: 'd3', text: '定期的にデバイスをオフにしてつながりを断つ時間を持つ', domain: 'digital' },
  ],
}

interface LevelData { title: string; subtitle: string; description: string; guidance: string[] }
const OVERALL_RESULTS: Record<OverallLevel, Record<SupportedLang, LevelData>> = {
  porous: {
    ko: {
      title: '유동적 경계선',
      subtitle: '경계선이 불명확할 수 있습니다',
      description: '현재 경계선이 흐릿하거나 일관적이지 않을 수 있습니다. 이는 타인의 요구에 쉽게 압도되거나, 자신의 필요를 자주 뒤로 미룰 수 있음을 의미합니다. 경계선은 훈련을 통해 강화할 수 있습니다.',
      guidance: ['"아니오"를 연습하는 것부터 시작하기', '자신의 감정과 필요를 일기로 기록하기', '신뢰하는 상담사나 치료사와 경계선 작업', '매일 하나의 작은 경계 설정 연습하기'],
    },
    en: {
      title: 'Porous Boundaries',
      subtitle: 'Your boundaries may be unclear',
      description: 'Your boundaries may currently be unclear or inconsistent. This can mean you\'re easily overwhelmed by others\' demands, or frequently put your own needs last. Boundaries can be strengthened through practice.',
      guidance: ['Start by practicing saying "no" to small things', 'Journal your feelings and needs regularly', 'Work on boundaries with a trusted counselor or therapist', 'Practice setting one small boundary each day'],
    },
    ja: {
      title: '流動的な境界線',
      subtitle: '境界線が不明確な可能性があります',
      description: '現在、境界線が不明確または一貫していない可能性があります。これは他者の要求に圧倒されやすく、自分のニーズを後回しにしがちであることを意味します。境界線は練習によって強化できます。',
      guidance: ['小さなことから「ノー」の練習を始める', '感情とニーズを日記に記録する', '信頼できるカウンセラーや治療士と境界線のワークをする', '毎日一つの小さな境界設定を練習する'],
    },
  },
  developing: {
    ko: {
      title: '발전 중인 경계선',
      subtitle: '경계선을 만들어가는 중입니다',
      description: '일부 영역에서 경계선이 형성되고 있지만, 아직 전 영역에서 일관적이지 않을 수 있습니다. 이미 시작한 것은 좋은 신호입니다. 꾸준한 연습이 차이를 만듭니다.',
      guidance: ['강한 영역의 경계를 더욱 강화하기', '약한 영역 하나를 집중적으로 개선하기', '경계를 표현하는 언어 연습하기', '경계가 지켜졌을 때 자신을 인정하기'],
    },
    en: {
      title: 'Developing Boundaries',
      subtitle: 'You are building your boundaries',
      description: 'Boundaries are forming in some areas, but may not yet be consistent across all areas. What you\'ve already started is a good sign. Consistent practice makes a big difference.',
      guidance: ['Strengthen the boundaries where you\'re already strong', 'Focus on improving one weaker area at a time', 'Practice the language of expressing boundaries', 'Acknowledge yourself when a boundary is upheld'],
    },
    ja: {
      title: '発展中の境界線',
      subtitle: '境界線を構築しています',
      description: 'いくつかの領域では境界線が形成されていますが、全ての領域で一貫していない可能性があります。すでに始めていることは良いサインです。継続的な練習が違いを生みます。',
      guidance: ['強い領域の境界をさらに強化する', '弱い領域一つに集中して改善する', '境界を表現する言葉を練習する', '境界が守られたとき自分を認める'],
    },
  },
  balanced: {
    ko: {
      title: '균형 잡힌 경계선',
      subtitle: '건강한 경계선을 가지고 있습니다',
      description: '전반적으로 건강한 경계선이 형성되어 있습니다. 자신의 필요와 타인의 필요를 적절하게 균형 잡고 있으며, 이는 관계의 건강성에 매우 긍정적입니다.',
      guidance: ['현재의 경계선 패턴을 의식적으로 유지하기', '새로운 관계에서도 일관성 있게 적용하기', '경계선 기술을 주변 사람들과 나누기', '스트레스 상황에서도 경계 유지 연습'],
    },
    en: {
      title: 'Balanced Boundaries',
      subtitle: 'You have healthy boundaries',
      description: 'You have generally healthy boundaries in place. You appropriately balance your needs with others\', which is very positive for the health of your relationships.',
      guidance: ['Consciously maintain your current boundary patterns', 'Apply them consistently in new relationships too', 'Share boundary skills with those around you', 'Practice maintaining boundaries even under stress'],
    },
    ja: {
      title: 'バランスの取れた境界線',
      subtitle: '健全な境界線を持っています',
      description: '全般的に健全な境界線が形成されています。自分のニーズと他者のニーズを適切にバランスさせており、これは関係の健全性に非常にポジティブです。',
      guidance: ['現在の境界線パターンを意識的に維持する', '新しい関係でも一貫して適用する', '境界線のスキルを周りの人々と共有する', 'ストレス状況でも境界を維持する練習'],
    },
  },
  firm: {
    ko: {
      title: '견고한 경계선',
      subtitle: '매우 강한 경계선을 가지고 있습니다',
      description: '경계선이 매우 강하게 설정되어 있습니다. 이는 훌륭한 자기 보호 능력을 의미합니다. 단, 경계가 너무 단단하면 가끔 친밀감 형성이 어려울 수 있습니다. 유연성도 함께 고려해보세요.',
      guidance: ['경계가 타인을 완전히 차단하지 않는지 점검하기', '신뢰하는 사람들에게 유연하게 열리는 연습', '경계와 단절의 차이 인식하기', '취약성을 안전한 공간에서 허용하는 연습'],
    },
    en: {
      title: 'Firm Boundaries',
      subtitle: 'You have very strong boundaries',
      description: 'Your boundaries are very firmly set. This reflects excellent self-protection ability. However, very firm boundaries can sometimes make intimacy harder to develop. Consider also cultivating flexibility.',
      guidance: ['Check that your boundaries aren\'t completely shutting others out', 'Practice being flexibly open with people you trust', 'Recognize the difference between boundaries and disconnection', 'Practice allowing vulnerability in safe spaces'],
    },
    ja: {
      title: '強固な境界線',
      subtitle: '非常に強い境界線を持っています',
      description: '境界線が非常に強く設定されています。これは優れた自己保護能力を意味します。ただし、境界が強すぎると時に親密さの形成が難しくなることがあります。柔軟性も合わせて検討してみてください。',
      guidance: ['境界が他者を完全に締め出していないか確認する', '信頼できる人々には柔軟に開く練習をする', '境界と断絶の違いを認識する', '安全な空間で脆弱性を許す練習をする'],
    },
  },
}

interface Props { locale?: string }

export default function PersonalBoundariesTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'en')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [domainScores, setDomainScores] = useState<Record<Domain, number>>({ emotional: 0, physical: 0, time: 0, digital: 0 })
  const [done, setDone] = useState(false)

  function pick(val: number) {
    const q = questions[current]
    const score = val + 1 // 1-4
    const newScores = { ...domainScores, [q.domain]: domainScores[q.domain] + score }
    if (current + 1 >= questions.length) { setDomainScores(newScores); setDone(true) }
    else { setDomainScores(newScores); setCurrent(current + 1) }
  }

  function restart() { setDomainScores({ emotional: 0, physical: 0, time: 0, digital: 0 }); setCurrent(0); setDone(false) }

  function share() {
    const total = Object.values(domainScores).reduce((s, v) => s + v, 0)
    const url = window.location.href
    const level = getLevel(total)
    const text = `${lb.shareMsg} — ${OVERALL_RESULTS[level][locale].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url }).catch(() => {})
    else navigator.clipboard.writeText(url).catch(() => {})
  }

  function getLevel(total: number): OverallLevel {
    if (total >= 41) return 'firm'
    if (total >= 34) return 'balanced'
    if (total >= 25) return 'developing'
    return 'porous'
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
          >
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: DOMAIN_COLORS[q.domain] }}
            />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full text-white mb-3 inline-block"
            style={{ backgroundColor: DOMAIN_COLORS[q.domain] }}
          >
            {lb.domainNames[q.domain]}
          </span>
          <p className="text-lg font-bold leading-snug mt-2">{q.text}</p>
        </div>
        <div className="grid gap-2" role="group" aria-label="Answer options">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              aria-label={label}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="w-7 h-7 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  const total = Object.values(domainScores).reduce((s, v) => s + v, 0)
  const level = getLevel(total)
  const r = OVERALL_RESULTS[level][locale]
  const maxPerDomain = 12
  const levelColor: Record<OverallLevel, string> = {
    porous: '#ef4444',
    developing: '#f59e0b',
    balanced: '#22c55e',
    firm: '#3b82f6',
  }
  const color = levelColor[level]
  const totalPct = Math.round((total / 48) * 100)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourBoundary}</p>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
          role="status"
          aria-live="polite"
        >
          {r.title}
        </div>
        <p className="font-bold text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold">{lb.scoreLabel}</span>
          <span className="text-lg font-bold" style={{ color }}>{total} {lb.outOf}</span>
        </div>
        <div
          className="h-3 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={total}
          aria-valuemin={12}
          aria-valuemax={48}
          aria-label={lb.scoreLabel}
        >
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalPct}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <h3 className="font-bold text-sm">{lb.domainProfile}</h3>
        {(Object.keys(domainScores) as Domain[]).map(domain => {
          const pct = Math.round((domainScores[domain] / maxPerDomain) * 100)
          return (
            <div key={domain} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: DOMAIN_COLORS[domain] }}>{lb.domainNames[domain]}</span>
                <span>{domainScores[domain]}/{maxPerDomain}</span>
              </div>
              <div
                className="h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lb.domainNames[domain]}
              >
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: DOMAIN_COLORS[domain] }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-800">{lb.guidance}</h3>
        <ul className="space-y-1">
          {r.guidance.map((g, i) => (
            <li key={i} className="text-sm text-emerald-900 flex gap-2">
              <span className="text-emerald-600 flex-none">→</span>{g}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-bold hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
