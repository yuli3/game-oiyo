import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

type Level = 'connected' | 'moderate' | 'high'

interface Question { id: string; text: string; reversed?: boolean }
interface ResultData {
  title: string; subtitle: string; description: string
  tips: string[]; affirmation: string; connectionNote: string
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; note: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string]
  restart: string; share: string; shareMsg: string
  yourLevel: string; tips: string; affirmation: string
  connectionNote: string; scoreLabel: string; outOf: string
}> = {
  ko: {
    title: '외로움 자가 점검',
    subtitle: '나는 얼마나 고립되어 있는가?',
    note: '이 검사는 UCLA 외로움 척도를 참고한 자가 점검 도구입니다. 연구 목적의 진단 도구가 아닙니다.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 없다', '거의 없다', '가끔 있다', '자주 있다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 사회적 연결 상태',
    yourLevel: '나의 연결 상태',
    tips: '연결을 위해 해볼 수 있는 것들',
    affirmation: '오늘의 메시지',
    connectionNote: '연결감',
    scoreLabel: '외로움 점수',
    outOf: '/ 40점',
  },
  en: {
    title: 'Loneliness Self-Assessment',
    subtitle: 'How Connected Are You?',
    note: 'This is a self-assessment tool based on the UCLA Loneliness Scale. It is not a clinical diagnostic instrument.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My social connection status',
    yourLevel: 'Your Connection Level',
    tips: 'Things You Can Try for Connection',
    affirmation: 'Today\'s Message',
    connectionNote: 'Connection',
    scoreLabel: 'Loneliness Score',
    outOf: '/ 40',
  },
  ja: {
    title: '孤独感セルフチェック',
    subtitle: '私はどれくらい孤立しているか？',
    note: 'これはUCLA孤独感尺度を参考にした自己チェックツールです。研究目的の診断ツールではありません。',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'ほとんどない', 'たまにある', 'よくある'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の社会的つながりの状態',
    yourLevel: 'つながりのレベル',
    tips: 'つながりのために試せること',
    affirmation: '今日のメッセージ',
    connectionNote: 'つながり',
    scoreLabel: '孤独感スコア',
    outOf: '/ 40点',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', text: '나와 공통점이 있는 사람들이 주변에 없다고 느낀다' },
    { id: 'q2', text: '나는 사람들과 잘 어울린다', reversed: true },
    { id: 'q3', text: '나를 진정으로 이해해주는 사람이 없다' },
    { id: 'q4', text: '나는 수줍지 않다', reversed: true },
    { id: 'q5', text: '나와 가까이 있어 주는 사람이 없다' },
    { id: 'q6', text: '나는 나를 둘러싼 사람들과 공통점이 많다', reversed: true },
    { id: 'q7', text: '나는 더 이상 아무에게도 가까이 다가갈 수 없다' },
    { id: 'q8', text: '나의 관심사와 생각들이 주변 사람들에게 통하지 않는다' },
    { id: 'q9', text: '나는 외향적이고 친화적이다', reversed: true },
    { id: 'q10', text: '내가 진정으로 교류할 수 있는 사람이 없다고 느낀다' },
  ],
  en: [
    { id: 'q1', text: 'I feel that the people around me have little in common with me' },
    { id: 'q2', text: 'I feel in tune with the people around me', reversed: true },
    { id: 'q3', text: 'There is no one I can turn to' },
    { id: 'q4', text: 'I do not feel alone', reversed: true },
    { id: 'q5', text: 'I feel part of a group of friends', reversed: true },
    { id: 'q6', text: 'I have a lot in common with the people around me', reversed: true },
    { id: 'q7', text: 'I no longer feel close to anyone' },
    { id: 'q8', text: 'My interests and ideas are not shared by those around me' },
    { id: 'q9', text: 'I am an outgoing person', reversed: true },
    { id: 'q10', text: 'There are people I feel close to', reversed: true },
  ],
  ja: [
    { id: 'q1', text: '周りの人々と共通点があまりないと感じる' },
    { id: 'q2', text: '周りの人々と気が合っていると感じる', reversed: true },
    { id: 'q3', text: '頼れる人が誰もいない' },
    { id: 'q4', text: '孤独を感じない', reversed: true },
    { id: 'q5', text: '友人グループの一員だと感じる', reversed: true },
    { id: 'q6', text: '周りの人々と多くの共通点がある', reversed: true },
    { id: 'q7', text: '誰とも親しくなれなくなった' },
    { id: 'q8', text: '私の関心や考えは周囲の人々と共有されていない' },
    { id: 'q9', text: '私は社交的な人間だ', reversed: true },
    { id: 'q10', text: '親しみを感じる人がいる', reversed: true },
  ],
}

const RESULTS: Record<Level, Record<SupportedLang, ResultData>> = {
  connected: {
    ko: {
      title: '잘 연결된 상태',
      subtitle: '현재 사회적 연결감이 건강합니다',
      description: '지금 당신은 의미 있는 관계들과 연결되어 있습니다. 이 연결을 소중히 여기고 지속적으로 키워가는 것이 중요합니다. 연결감은 자동으로 유지되지 않으며, 의도적인 노력이 필요합니다.',
      tips: ['지금의 의미 있는 관계들을 더 깊이 가꾸기', '새로운 사람을 만날 기회 적극적으로 찾기', '커뮤니티 활동이나 동호회 참여 고려', '소중한 사람들에게 먼저 연락하는 습관'],
      affirmation: '지금 이 연결감은 소중한 자산입니다. 주변의 좋은 사람들에게 감사하며 하루를 보내세요.',
      connectionNote: '당신은 현재 사회적으로 잘 연결된 상태입니다.',
    },
    en: {
      title: 'Well Connected',
      subtitle: 'Your social connection is healthy right now',
      description: 'You are currently connected with meaningful relationships. It\'s important to cherish and continue nurturing this connection. Connection doesn\'t maintain itself — it takes intentional effort.',
      tips: ['Deepen the meaningful relationships you have', 'Actively seek opportunities to meet new people', 'Consider joining community activities or groups', 'Make a habit of reaching out first to people you care about'],
      affirmation: 'This sense of connection is a precious asset. Take a moment to appreciate the good people around you.',
      connectionNote: 'You are currently socially well-connected.',
    },
    ja: {
      title: 'よくつながっている',
      subtitle: '現在、社会的なつながりは健全です',
      description: '今あなたは意味のある関係とつながっています。このつながりを大切にし、育て続けることが重要です。つながりは自動的に維持されるものではなく、意図的な努力が必要です。',
      tips: ['今持っている意味のある関係をより深く育てる', '新しい人に会う機会を積極的に探す', 'コミュニティ活動やサークルへの参加を検討する', '大切な人に自分から連絡する習慣をつける'],
      affirmation: 'このつながりの感覚は貴重な資産です。周りの良い人々に感謝しながら一日を過ごしてください。',
      connectionNote: '現在、社会的によくつながっています。',
    },
  },
  moderate: {
    ko: {
      title: '중간 수준의 외로움',
      subtitle: '연결감이 부족할 때가 있습니다',
      description: '때로 외로움을 느끼는 것은 매우 자연스러운 경험입니다. 지금 이 감정을 인식하는 것 자체가 변화의 시작입니다. 작은 연결의 시도들이 큰 차이를 만들 수 있습니다.',
      tips: ['오래된 친구에게 먼저 연락 취하기', '취미 모임이나 클래스에 등록하기', '매일 짧게라도 자연 속 산책하기', '자원봉사나 지역 커뮤니티 활동 참여', '혼자지만 혼자가 아닌 공간(도서관, 카페) 이용하기'],
      affirmation: '외로움을 느끼는 것은 연결을 원한다는 신호입니다. 그 마음은 당신이 관계를 소중히 여긴다는 증거입니다.',
      connectionNote: '지금 더 많은 연결이 필요할 수 있습니다.',
    },
    en: {
      title: 'Moderate Loneliness',
      subtitle: 'You sometimes feel a lack of connection',
      description: 'Feeling lonely at times is a very natural experience. The fact that you\'re recognizing this feeling is itself the beginning of change. Small attempts at connection can make a big difference.',
      tips: ['Reach out first to an old friend', 'Sign up for a hobby group or class', 'Take short daily walks in nature', 'Volunteer or participate in local community activities', 'Use shared spaces (library, café) where you\'re alone but not isolated'],
      affirmation: 'Feeling lonely is a signal that you want connection. That feeling is proof that you value relationships.',
      connectionNote: 'You may need more connection right now.',
    },
    ja: {
      title: '中程度の孤独感',
      subtitle: 'つながりを感じられないことがあります',
      description: '時々孤独を感じることは非常に自然な経験です。この感情に気づくこと自体が変化の始まりです。小さなつながりの試みが大きな違いを生むことがあります。',
      tips: ['昔の友人に自分から連絡を取る', '趣味のグループやクラスに登録する', '毎日少しでも自然の中を散歩する', 'ボランティアや地域コミュニティ活動に参加する', '図書館やカフェなど、一人でも孤立しない空間を利用する'],
      affirmation: '孤独を感じることは、つながりを求めているサインです。その気持ちはあなたが関係を大切にしている証拠です。',
      connectionNote: '今、もっとつながりが必要かもしれません。',
    },
  },
  high: {
    ko: {
      title: '높은 외로움',
      subtitle: '지금 많이 고립되어 있는 것 같습니다',
      description: '지금 상당한 외로움을 경험하고 있습니다. 이 감정은 무언가 중요한 것이 부족하다는 신호입니다. 외로움은 해결 가능한 상태입니다. 전문가의 도움을 포함한 여러 지원이 있습니다.',
      tips: ['전문 상담사 또는 심리치료사와의 상담 고려', '하루에 하나의 작은 사회적 행동 시도하기', '정신건강 지원 그룹 참여 고려', '온라인 커뮤니티를 통한 연결도 유효한 시작', '신체 활동으로 신경계 안정화 시도'],
      affirmation: '외로움은 당신의 잘못이 아닙니다. 도움을 구하는 것은 용기 있는 행동이며, 당신은 연결될 자격이 있습니다.',
      connectionNote: '지금 전문적인 지원을 받는 것을 고려해 보세요.',
    },
    en: {
      title: 'High Loneliness',
      subtitle: 'It seems you are quite isolated right now',
      description: 'You are experiencing significant loneliness right now. This feeling is a signal that something important is lacking. Loneliness is a solvable state. Support — including professional help — is available.',
      tips: ['Consider speaking with a counselor or psychotherapist', 'Try one small social action per day', 'Consider joining a mental health support group', 'Online communities can also be a valid starting point', 'Physical activity can help stabilize the nervous system'],
      affirmation: 'Loneliness is not your fault. Seeking help is a courageous act, and you deserve to be connected.',
      connectionNote: 'Consider seeking professional support right now.',
    },
    ja: {
      title: '高い孤独感',
      subtitle: '今かなり孤立しているようです',
      description: '今、かなりの孤独感を経験しています。この感情は、何か重要なものが不足しているサインです。孤独感は解決できる状態です。専門家のサポートを含む様々な支援があります。',
      tips: ['カウンセラーや心理療法士への相談を検討する', '一日一つの小さな社会的行動を試みる', 'メンタルヘルスサポートグループへの参加を検討する', 'オンラインコミュニティも有効なスタート地点', '身体活動で神経系を安定させる'],
      affirmation: '孤独はあなたのせいではありません。助けを求めることは勇気ある行動であり、あなたはつながる資格があります。',
      connectionNote: '今、専門的なサポートを受けることを検討してください。',
    },
  },
}

interface Props { locale?: string }

export default function LonelinessTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'en')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: Level; score: number } | null>(null)

  function calcResult(ans: number[], qs: typeof questions): { level: Level; score: number } {
    let score = 0
    for (let i = 0; i < qs.length; i++) {
      const raw = ans[i] + 1 // 1-4
      score += qs[i].reversed ? (5 - raw) : raw
    }
    const level: Level = score >= 29 ? 'high' : score >= 20 ? 'moderate' : 'connected'
    return { level, score }
  }

  function pick(val: number) {
    const newAns = [...answers, val]
    if (current + 1 >= questions.length) setResult(calcResult(newAns, questions))
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() { setAnswers([]); setCurrent(0); setResult(null) }

  function share() {
    if (!result) return
    const url = window.location.href
    const text = `${lb.shareMsg} — ${RESULTS[result.level][locale].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url }).catch(() => {})
    else navigator.clipboard.writeText(url).catch(() => {})
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
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <p className="text-lg font-bold leading-snug">{q.text}</p>
        </div>
        <div className="grid gap-2" role="group" aria-label="Answer options">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              aria-label={label}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-emerald-50 hover:border-emerald-400 transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="w-7 h-7 rounded-full border-2 border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-600 flex-none">{i + 1}</span>
              {label}
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
  const levelColor: Record<Level, string> = {
    connected: '#22c55e',
    moderate: '#f59e0b',
    high: '#ef4444',
  }
  const color = levelColor[result.level]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
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
          <span className="text-lg font-bold" style={{ color }}>{result.score} {lb.outOf}</span>
        </div>
        <div
          className="h-3 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={result.score}
          aria-valuemin={10}
          aria-valuemax={40}
          aria-label={lb.scoreLabel}
        >
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <p className="text-xs text-muted-foreground text-center">{r.connectionNote}</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-700">{lb.tips}</h3>
        <ul className="space-y-1">
          {r.tips.map((tip, i) => (
            <li key={i} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-500 flex-none">→</span>{tip}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
        <h3 className="font-bold text-sm text-emerald-800">{lb.affirmation}</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">"{r.affirmation}"</p>
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
