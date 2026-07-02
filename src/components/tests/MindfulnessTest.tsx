import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type Level = 'autopilot' | 'developing' | 'mindful' | 'deeply_present'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Question { id: string; text: string }
interface LevelData {
  title: string; subtitle: string; description: string
  insights: string[]; practices: string[]; affirmation: string
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string, string]
  restart: string; share: string; shareMsg: string; yourLevel: string
  insights: string; practices: string; affirmation: string
  scoreLabel: string; outOf: string; note: string
}> = {
  ko: {
    title: '마음챙김 수준 테스트',
    subtitle: '나는 지금 이 순간에 얼마나 있는가?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['거의 항상', '매우 자주', '자주', '가끔', '드물게', '거의 없다'],
    restart: '다시 하기', share: '결과 공유', shareMsg: '나의 마음챙김 수준은',
    yourLevel: '나의 마음챙김 수준', insights: '현재 패턴', practices: '수련 방법',
    affirmation: '오늘의 메시지', scoreLabel: '마음챙김 점수', outOf: '/ 90점',
    note: '이 테스트는 MAAS(마음챙김 주의 인식 척도)를 기반으로 한 참고용 자가 진단입니다.',
  },
  en: {
    title: 'Mindfulness Test',
    subtitle: 'How Present Are You in the Moment?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Almost Always', 'Very Often', 'Often', 'Sometimes', 'Rarely', 'Almost Never'],
    restart: 'Retake', share: 'Share Result', shareMsg: 'My mindfulness level is',
    yourLevel: 'Your Mindfulness Level', insights: 'Current Patterns', practices: 'Practice Ideas',
    affirmation: "Today's Message", scoreLabel: 'Mindfulness Score', outOf: '/ 90',
    note: 'This test is based on the MAAS (Mindful Attention Awareness Scale) and is for reference only.',
  },
  ja: {
    title: 'マインドフルネステスト',
    subtitle: '私は今この瞬間にどのくらいいるか？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['ほぼいつも', '非常によく', 'よく', 'たまに', 'めったに', 'ほぼない'],
    restart: 'もう一度', share: '結果を共有', shareMsg: '私のマインドフルネスレベルは',
    yourLevel: 'マインドフルネスレベル', insights: '現在のパターン', practices: '実践方法',
    affirmation: '今日のメッセージ', scoreLabel: 'マインドフルネススコア', outOf: '/ 90点',
    note: 'このテストはMAAS（マインドフル注意・認識尺度）を参考にした自己診断です。',
  },
}

// MAAS items are reverse-scored: answering "Almost Always" (index 0, value 1)
// means LOW mindfulness. We store raw answer (1–6) and final score = sum of answers.
// Higher sum = higher mindfulness. Scale: 1=Almost Always (worst) to 6=Almost Never (best).
const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1',  text: '어떤 감정을 경험하고 있는지 모른 채 시간이 지나있다' },
    { id: 'q2',  text: '물건을 어디 뒀는지 기억이 안 나서 찾게 된다' },
    { id: 'q3',  text: '하고 있는 일에 집중하지 못하고 다른 생각을 한다' },
    { id: 'q4',  text: '어디로 가는지 생각 없이 자동으로 걸어가고 있다' },
    { id: 'q5',  text: '과거나 미래 걱정 때문에 현재 순간을 즐기지 못한다' },
    { id: 'q6',  text: '대화 중에 상대방이 한 말을 금방 잊어버린다' },
    { id: 'q7',  text: '목적지에 도착했는데 어떻게 왔는지 기억이 없다' },
    { id: 'q8',  text: '하던 일을 마치고 나서도 그 기억이 잘 나지 않는다' },
    { id: 'q9',  text: '현재 하고 있는 일보다 다른 무언가를 생각하고 있다' },
    { id: 'q10', text: '몸의 긴장이나 불편함을 느끼다가 얼마 지나서야 알아차린다' },
    { id: 'q11', text: '의식하지 않고 음식을 먹거나 음료를 마신다' },
    { id: 'q12', text: '계획에 지나치게 집중하느라 지금을 놓친다' },
    { id: 'q13', text: '반복적인 생각이나 걱정이 머릿속을 맴돈다' },
    { id: 'q14', text: '무언가를 하면서 동시에 다른 일을 생각한다' },
    { id: 'q15', text: '감각(냄새, 소리, 촉감 등)을 의식적으로 느끼지 못하고 지나친다' },
  ],
  en: [
    { id: 'q1',  text: 'Time passes without me being aware of what I am feeling' },
    { id: 'q2',  text: 'I misplace things and have to search for them' },
    { id: 'q3',  text: 'I find myself on autopilot while doing something' },
    { id: 'q4',  text: 'I walk somewhere without paying attention to the journey' },
    { id: 'q5',  text: 'Worries about the past or future prevent me from enjoying the present' },
    { id: 'q6',  text: 'I quickly forget what someone said during a conversation' },
    { id: 'q7',  text: 'I arrive somewhere and cannot recall how I got there' },
    { id: 'q8',  text: 'After completing a task, I have little memory of doing it' },
    { id: 'q9',  text: 'My mind is somewhere else while I am doing something' },
    { id: 'q10', text: 'I notice physical tension or discomfort only long after it started' },
    { id: 'q11', text: 'I eat or drink without being aware of what I am consuming' },
    { id: 'q12', text: 'I get so focused on a future goal that I miss what is happening now' },
    { id: 'q13', text: 'Repetitive thoughts or worries loop through my mind' },
    { id: 'q14', text: 'I do one thing while thinking about something else entirely' },
    { id: 'q15', text: 'I pass through sensory experiences (smell, sound, touch) without noticing them' },
  ],
  ja: [
    { id: 'q1',  text: '自分がどんな感情を感じているか気づかずに時間が過ぎる' },
    { id: 'q2',  text: '物をどこに置いたか覚えていなくて探すことになる' },
    { id: 'q3',  text: 'していることに集中できず、他のことを考えている' },
    { id: 'q4',  text: 'どこへ行くか考えずに自動的に歩いている' },
    { id: 'q5',  text: '過去や将来の心配で今この瞬間を楽しめない' },
    { id: 'q6',  text: '会話中に相手が言ったことをすぐ忘れてしまう' },
    { id: 'q7',  text: '目的地に着いたのに、どうやって来たか覚えていない' },
    { id: 'q8',  text: 'やり終えた後もその記憶があまりない' },
    { id: 'q9',  text: 'していることより他の何かを考えている' },
    { id: 'q10', text: '体の緊張や不快感を感じてから、しばらく後に気づく' },
    { id: 'q11', text: '意識せずに食事や飲み物を口にする' },
    { id: 'q12', text: '計画に集中しすぎて今この瞬間を見逃す' },
    { id: 'q13', text: '繰り返す考えや心配が頭の中を巡る' },
    { id: 'q14', text: '何かをしながら同時に別のことを考える' },
    { id: 'q15', text: '感覚（匂い、音、触感など）を意識せずに通り過ぎる' },
  ],
}

const RESULTS: Record<Level, Record<SupportedLang, LevelData>> = {
  autopilot: {
    ko: {
      title: '자동조종 상태', subtitle: '마음이 자주 현재를 떠나 있습니다',
      description: '현재 순간보다 과거나 미래에 마음이 머무는 시간이 많습니다. 자동적인 생각의 흐름에 따라 움직이고 있어, 지금 이 순간의 경험을 충분히 느끼지 못하고 있습니다. 이것은 누구에게나 일어나는 자연스러운 상태입니다.',
      insights: ['자동적 사고 패턴이 강함', '현재 감각보다 생각에 집중', '반추와 걱정이 많음', '순간 인식이 낮은 편'],
      practices: ['하루 3분 호흡 관찰부터 시작하기', '밥 먹을 때 음식의 맛에만 집중하기', '걸을 때 발이 땅에 닿는 감각 느끼기', '알람을 맞춰두고 현재 감각 체크하기'],
      affirmation: '지금 이 순간, 당신이 이 질문을 하고 있다는 것 자체가 시작입니다. 마음챙김은 완벽하지 않아도 됩니다.',
    },
    en: {
      title: 'Autopilot Mode', subtitle: 'Your mind frequently drifts away from the present',
      description: 'You spend more mental time in the past or future than in the present. You are largely moving on autopilot, and the richness of each moment may often go unnoticed. This is a very common human experience.',
      insights: ['Strong automatic thought patterns', 'More focused on thoughts than sensations', 'Frequent rumination and worry', 'Low moment-to-moment awareness'],
      practices: ['Start with 3-minute breath observation daily', 'Focus only on the taste of food during meals', 'Feel the sensation of your feet touching the ground when walking', 'Set alarms to briefly check in with your senses'],
      affirmation: 'The fact that you are asking this question right now is itself a beginning. Mindfulness does not need to be perfect.',
    },
    ja: {
      title: 'オートパイロット状態', subtitle: '心が頻繁に今から離れています',
      description: '今この瞬間よりも、過去や未来に心が留まる時間が多いです。自動的な思考の流れに従って動いており、今この瞬間の体験を十分に感じられていません。これは誰にでも起こる自然な状態です。',
      insights: ['自動的思考パターンが強い', '感覚より思考に集中', '反芻と心配が多い', '瞬間の気づきが低い'],
      practices: ['毎日3分間の呼吸観察から始める', '食事中は食べ物の味だけに集中する', '歩くとき足が地面に触れる感覚を感じる', 'アラームを設定して感覚をチェックする'],
      affirmation: '今この瞬間にこの問いを立てていること自体が始まりです。マインドフルネスは完璧でなくていいです。',
    },
  },
  developing: {
    ko: {
      title: '발전 중', subtitle: '마음챙김의 씨앗이 자라고 있습니다',
      description: '가끔은 현재 순간을 의식하지만, 아직 자동적 사고 패턴이 자주 개입합니다. 마음챙김을 향해 나아가고 있는 과도기 단계입니다. 의도적인 연습이 이 상태를 크게 변화시킬 수 있습니다.',
      insights: ['순간 인식이 점차 늘고 있음', '때때로 현재에 집중하는 능력 발현', '연습에 따라 빠르게 발전 가능', '자기 인식이 높아지는 시기'],
      practices: ['명상 앱으로 5-10분 하루 시작하기', '감사 일지 쓰기', '자연 속 걷기를 마음챙김 실천으로 활용', '감정 레이블링 연습하기'],
      affirmation: '변화는 이미 시작되었습니다. 조금씩, 매일 조금씩 현재에 더 머무르게 됩니다.',
    },
    en: {
      title: 'Developing', subtitle: 'Seeds of mindfulness are growing',
      description: 'You occasionally notice the present moment, but automatic thought patterns still frequently intervene. You are in a transitional phase moving toward greater mindfulness. Intentional practice can bring rapid improvement from here.',
      insights: ['Moment awareness is gradually increasing', 'Ability to focus on the present emerges at times', 'Capable of quick development with practice', 'Self-awareness is growing'],
      practices: ['Use a meditation app for 5-10 minutes to start each day', 'Keep a gratitude journal', 'Use walks in nature as mindfulness practice', 'Practice labeling your emotions'],
      affirmation: 'Change has already begun. Day by day, you will find yourself more present.',
    },
    ja: {
      title: '発展中', subtitle: 'マインドフルネスの種が育っています',
      description: '時々今この瞬間を意識しますが、まだ自動的思考パターンが頻繁に介入します。マインドフルネスへと向かう過渡期です。意図的な練習がこの状態を大きく変えることができます。',
      insights: ['瞬間の気づきが徐々に増加', '時々現在に集中する能力が現れる', '練習次第で素早く発展可能', '自己認識が高まっている時期'],
      practices: ['瞑想アプリで1日5〜10分から始める', '感謝日記をつける', '自然の中の散歩をマインドフルネス実践に活用', '感情ラベリングを練習する'],
      affirmation: '変化はすでに始まっています。少しずつ、毎日少しずつ、より現在にいられるようになります。',
    },
  },
  mindful: {
    ko: {
      title: '마음챙김형', subtitle: '현재 순간과 꽤 잘 연결되어 있습니다',
      description: '일상에서 현재 순간을 인식하는 능력이 잘 발달되어 있습니다. 생각이 떠오를 때 그것을 알아차리고, 감각과 감정에 주의를 기울이는 습관이 형성되어 있습니다.',
      insights: ['안정적인 현재 인식 능력', '감각과 감정에 주의 기울임', '자동 반응보다 의식적 반응', '스트레스 회복력이 높은 편'],
      practices: ['더 깊은 명상 수련으로 발전시키기', '마음챙김을 어려운 순간에 적용하기', '다른 사람과 함께 실천 공유하기', '자기 연민 수련 추가하기'],
      affirmation: '당신은 이미 현재와 좋은 관계를 맺고 있습니다. 이 능력은 당신과 주변을 동시에 풍요롭게 합니다.',
    },
    en: {
      title: 'Mindful', subtitle: 'You are fairly well connected to the present moment',
      description: 'Your ability to notice the present moment is well developed in daily life. You have built habits of noticing when thoughts arise, and paying attention to sensations and emotions.',
      insights: ['Stable present-moment awareness', 'Attention to sensations and emotions', 'Conscious responses over automatic reactions', 'Higher stress resilience'],
      practices: ['Advance to deeper meditation practice', 'Apply mindfulness in difficult moments', 'Share practice with others', 'Add self-compassion exercises'],
      affirmation: 'You already have a good relationship with the present. This ability enriches both you and those around you.',
    },
    ja: {
      title: 'マインドフル型', subtitle: '今この瞬間とかなりよくつながっています',
      description: '日常で今この瞬間を認識する能力がよく発達しています。思考が浮かんだとき気づき、感覚と感情に注意を向ける習慣が形成されています。',
      insights: ['安定した現在の気づき', '感覚と感情への注意', '自動反応より意識的な反応', 'ストレス回復力が高い'],
      practices: ['より深い瞑想の修練に進む', '難しい瞬間にマインドフルネスを適用する', '他の人と実践を共有する', '自己慈悲の修練を追加する'],
      affirmation: 'あなたはすでに現在と良い関係を築いています。この能力はあなたと周囲を同時に豊かにします。',
    },
  },
  deeply_present: {
    ko: {
      title: '깊은 현재형', subtitle: '지금 이 순간을 깊이 살고 있습니다',
      description: '일상에서 현재 순간과 깊이 연결되어 있습니다. 생각, 감각, 감정의 흐름을 자연스럽게 관찰하며 살아가는 능력이 높습니다. 이 수준의 마음챙김은 꾸준한 연습과 자기 인식의 결과입니다.',
      insights: ['높은 수준의 현재 인식', '자동적 반응에서 자유로움', '감정과 생각을 관찰자 시각으로 봄', '내면의 평온이 안정적'],
      practices: ['더 깊은 수련 방식 탐색(명상 리트릿 등)', '주변 사람들과 마음챙김 나누기', '자기 연민과 공감 수련 심화', '어려운 감정과의 작업 심화'],
      affirmation: '당신의 현존은 그 자체로 주변 사람들에게 선물입니다. 이 능력을 소중히 가꾸어 나가세요.',
    },
    en: {
      title: 'Deeply Present', subtitle: 'You live deeply in the present moment',
      description: 'You are deeply connected to the present moment in daily life. You have a high capacity to naturally observe the flow of thoughts, sensations, and emotions. This level of mindfulness is the result of consistent practice and self-awareness.',
      insights: ['High-level present-moment awareness', 'Freedom from automatic reactions', 'Observer perspective on thoughts and emotions', 'Stable inner calm'],
      practices: ['Explore deeper practices (retreats, etc.)', 'Share mindfulness with those around you', 'Deepen self-compassion and empathy work', 'Work with difficult emotions at depth'],
      affirmation: 'Your presence is itself a gift to those around you. Cherish and continue nurturing this ability.',
    },
    ja: {
      title: '深い現在型', subtitle: '今この瞬間を深く生きています',
      description: '日常で今この瞬間と深くつながっています。思考、感覚、感情の流れを自然に観察しながら生きる能力が高いです。このレベルのマインドフルネスは、継続的な練習と自己認識の結果です。',
      insights: ['高水準の現在の気づき', '自動的反応からの自由', '思考と感情を観察者の視点で見る', '内面の平静が安定している'],
      practices: ['より深い修練法を探索（リトリートなど）', '周囲の人々とマインドフルネスを分かち合う', '自己慈悲と共感の修練を深める', '難しい感情との作業を深める'],
      affirmation: 'あなたの現在への存在は、それ自体が周囲への贈り物です。この能力を大切に育てていってください。',
    },
  },
}

function getLevel(score: number): Level {
  if (score <= 30) return 'autopilot'
  if (score <= 50) return 'developing'
  if (score <= 70) return 'mindful'
  return 'deeply_present'
}

interface Props { locale?: string }

export default function MindfulnessTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: Level; score: number } | null>(null)

  function pick(val: number) {
    // val is index 0–5; score value is index+1 (1=Almost Always to 6=Almost Never)
    const scoreVal = val + 1
    const newAns = [...answers, scoreVal]
    if (current + 1 >= questions.length) {
      const total = newAns.reduce((s, v) => s + v, 0)
      setResult({ level: getLevel(total), score: total })
    }
    setAnswers(newAns)
    setCurrent(current + 1)
  }

  function restart() { setAnswers([]); setCurrent(0); setResult(null) }

  function share() {
    if (!result) return
    const url = window.location.href
    const text = `${lb.shareMsg} — ${RESULTS[result.level][locale].title}`
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
          <p className="text-sm" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: 'var(--muted-foreground, #6b7280)' }}>
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--muted, #e5e7eb)' }}
          >
            <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: 'var(--primary, #16a34a)' }} />
          </div>
        </div>
        <div className="rounded-xl border p-6 text-center" style={{ backgroundColor: 'var(--card, #fff)' }}>
          <p className="text-lg font-bold">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              aria-label={label}
              className="w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors flex items-center gap-3"
              style={{ backgroundColor: 'var(--card, #fff)' }}
            >
              <span
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-none"
                style={{ borderColor: 'var(--primary, #16a34a)', color: 'var(--primary, #16a34a)' }}
              >{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.note}</p>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result.level][locale]
  const pct = Math.round((result.score / 90) * 100)
  const levelColors: Record<Level, string> = {
    autopilot: '#94a3b8', developing: '#f59e0b', mindful: '#22c55e', deeply_present: '#16a34a',
  }
  const color = levelColors[result.level]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.yourLevel}</p>
        <div className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white" style={{ backgroundColor: color }}>
          {r.title}
        </div>
        <p className="font-bold" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{r.subtitle}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{r.description}</p>
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold">{lb.scoreLabel}</span>
          <span className="text-lg font-bold" style={{ color }}>{result.score} {lb.outOf}</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={lb.scoreLabel}
          className="h-3 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--muted, #e5e7eb)' }}
        >
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm">{lb.insights}</h3>
        <ul className="space-y-1">
          {r.insights.map(s => (
            <li key={s} className="text-sm flex gap-2" style={{ color: 'var(--muted-foreground, #6b7280)' }}><span>•</span>{s}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm" style={{ color: '#16a34a' }}>{lb.practices}</h3>
        <ul className="space-y-1">
          {r.practices.map(p => (
            <li key={p} className="text-sm flex gap-2" style={{ color: 'var(--muted-foreground, #6b7280)' }}><span style={{ color: '#22c55e' }}>→</span>{p}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
        <h3 className="font-bold text-sm" style={{ color: '#16a34a' }}>{lb.affirmation}</h3>
        <p className="text-sm" style={{ color: '#15803d' }}>"{r.affirmation}"</p>
      </div>

      <p className="text-center text-xs" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-lg border px-4 py-2 text-sm font-bold transition-colors"
          style={{ backgroundColor: 'var(--card, #fff)' }}
        >{lb.restart}</button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-lg px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#16a34a' }}
        >{lb.share}</button>
      </div>
    </div>
  )
}
