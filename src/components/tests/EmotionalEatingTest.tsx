import { useState } from 'react'

type EatingLevel = 'low' | 'moderate' | 'high' | 'very_high'
type SupportedLang = 'ko' | 'en' | 'ja'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

interface Question { id: string; text: string }
interface ResultData {
  icon: string
  title: string
  subtitle: string
  description: string
  strategies: string[]
  affirmation: string
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string
  share: string
  shareMsg: string
  yourLevel: string
  scoreLabel: string
  outOf: string
  strategies: string
  affirmation: string
  note: string
}> = {
  ko: {
    title: '감정적 식사 테스트',
    subtitle: '나는 감정 때문에 먹나?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 없다', '거의 없다', '가끔 있다', '자주 있다', '항상 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 감정적 식사 경향은',
    yourLevel: '나의 감정적 식사 경향',
    scoreLabel: '점수',
    outOf: '/ 75점',
    strategies: '실천 전략',
    affirmation: '나에게 건네는 말',
    note: '이 결과는 자기 이해를 위한 참고 자료입니다. 이것은 의지력의 문제가 아닙니다. 자신을 판단하지 마세요.',
  },
  en: {
    title: 'Emotional Eating Test',
    subtitle: 'Do You Eat Your Feelings?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My emotional eating tendency is',
    yourLevel: 'Your Emotional Eating Profile',
    scoreLabel: 'Score',
    outOf: '/ 75',
    strategies: 'Practical Strategies',
    affirmation: 'A Note for You',
    note: 'This result is for self-awareness, not self-judgment. Emotional eating is not a willpower problem.',
  },
  ja: {
    title: '感情的食事テスト',
    subtitle: '感情で食べていますか？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'ほとんどない', 'たまにある', 'よくある', 'いつもそうだ'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の感情的食事傾向は',
    yourLevel: '感情的食事の傾向',
    scoreLabel: 'スコア',
    outOf: '/ 75点',
    strategies: '実践戦略',
    affirmation: 'あなたへのメッセージ',
    note: 'この結果は自己理解のための参考情報です。感情的食事は意志力の問題ではありません。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', text: '기분이 우울하거나 슬플 때 음식을 먹고 싶어진다' },
    { id: 'q2', text: '스트레스를 받으면 평소보다 더 많이 먹는다' },
    { id: 'q3', text: '지루하거나 할 일이 없을 때 무언가를 먹는다' },
    { id: 'q4', text: '화가 났을 때 음식으로 감정을 달랜다' },
    { id: 'q5', text: '먹고 나면 기분이 좋아지다가 곧 죄책감을 느낀다' },
    { id: 'q6', text: '배고프지 않아도 눈앞에 음식이 있으면 먹게 된다' },
    { id: 'q7', text: '혼자 있을 때 더 많이 먹는 경향이 있다' },
    { id: 'q8', text: '걱정이나 불안이 있을 때 과식을 한다' },
    { id: 'q9', text: '특정 감정이 느껴질 때 특정 음식이 당긴다 (예: 달콤한 것, 짠 것)' },
    { id: 'q10', text: '먹는 것이 감정적 위안이 된다고 느낀다' },
    { id: 'q11', text: '피곤할 때 단것이나 자극적인 음식을 먹고 싶어진다' },
    { id: 'q12', text: '기분 좋을 때도 특별히 더 먹게 된다' },
    { id: 'q13', text: '다이어트를 시작했다가 감정적 이유로 포기한 경험이 있다' },
    { id: 'q14', text: '먹고 싶다는 생각이 실제 배고픔과 관련 없는 경우가 많다' },
    { id: 'q15', text: '감정적 식사 후 식사량이나 음식 선택에 죄책감을 느낀다' },
  ],
  en: [
    { id: 'q1', text: 'When I feel sad or down, I want to eat' },
    { id: 'q2', text: 'When stressed, I eat more than usual' },
    { id: 'q3', text: 'When bored or idle, I reach for food' },
    { id: 'q4', text: 'When angry, I soothe my feelings with food' },
    { id: 'q5', text: 'After eating, I feel better briefly then experience guilt' },
    { id: 'q6', text: 'If food is in front of me, I eat it even when not hungry' },
    { id: 'q7', text: 'I tend to eat more when I\'m alone' },
    { id: 'q8', text: 'I overeat when I feel worried or anxious' },
    { id: 'q9', text: 'Certain emotions make me crave specific foods (sweets, salty snacks, etc.)' },
    { id: 'q10', text: 'I feel that eating provides emotional comfort' },
    { id: 'q11', text: 'When tired, I want to eat something sweet or stimulating' },
    { id: 'q12', text: 'Even when in a good mood, I end up eating more' },
    { id: 'q13', text: 'I have quit a diet due to emotional reasons' },
    { id: 'q14', text: 'The urge to eat often has nothing to do with actual hunger' },
    { id: 'q15', text: 'After emotional eating, I feel guilty about what or how much I ate' },
  ],
  ja: [
    { id: 'q1', text: '気分が落ち込んだり悲しいとき食べたくなる' },
    { id: 'q2', text: 'ストレスを感じると普段より多く食べる' },
    { id: 'q3', text: '暇なときや何もすることがないとき何かを食べる' },
    { id: 'q4', text: '怒ったとき食べ物で気持ちを落ち着かせる' },
    { id: 'q5', text: '食べた後一時的に気分が良くなるがすぐに罪悪感を覚える' },
    { id: 'q6', text: 'お腹が空いていなくても目の前に食べ物があると食べてしまう' },
    { id: 'q7', text: '一人でいるとき食べ過ぎる傾向がある' },
    { id: 'q8', text: '心配や不安があるとき過食してしまう' },
    { id: 'q9', text: '特定の感情になると特定の食べ物（甘いもの、塩辛いものなど）が食べたくなる' },
    { id: 'q10', text: '食べることが感情的な慰めになると感じる' },
    { id: 'q11', text: '疲れているとき甘いものや刺激的な食べ物を食べたくなる' },
    { id: 'q12', text: '気分が良いときでも特別に食べ過ぎてしまう' },
    { id: 'q13', text: '感情的な理由でダイエットをやめた経験がある' },
    { id: 'q14', text: '食べたいという気持ちが実際の空腹と関係ないことが多い' },
    { id: 'q15', text: '感情的な食事の後、食べた量や食べ物の選択に罪悪感を感じる' },
  ],
}

const RESULTS: Record<EatingLevel, Record<SupportedLang, ResultData>> = {
  low: {
    ko: {
      icon: '💚',
      title: '낮음',
      subtitle: '음식과 감정이 비교적 분리되어 있습니다',
      description: '감정과 식욕을 잘 구별하고 있습니다. 대부분의 식사가 신체적 배고픔에 의해 이루어지고 있어, 음식과 건강한 관계를 유지하고 있습니다.',
      strategies: [
        '현재의 인식을 유지하는 연습 계속하기',
        '배고픔과 감정 신호를 구별하는 습관 강화',
        '스트레스 상황에서도 먹기 전 잠깐 멈추는 습관',
      ],
      affirmation: '음식과 감정을 잘 구별하는 것은 중요한 자기 인식입니다. 지금의 균형을 소중히 여기세요.',
    },
    en: {
      icon: '💚',
      title: 'Low',
      subtitle: 'Food and emotions are mostly separate for you',
      description: 'You distinguish well between hunger and emotion. Most of your eating is driven by physical need, reflecting a healthy relationship with food.',
      strategies: [
        'Keep up the habit of pausing before you eat',
        'Continue noticing the difference between hunger and emotion',
        'Practice this awareness especially in stressful moments',
      ],
      affirmation: 'Knowing the difference between hunger and feelings is a real skill. Keep nurturing that awareness.',
    },
    ja: {
      icon: '💚',
      title: '低い',
      subtitle: '食べ物と感情が比較的分離しています',
      description: '感情と食欲をうまく区別できています。ほとんどの食事が身体的な空腹によって行われており、食べ物と健全な関係を保っています。',
      strategies: [
        '現在の意識を維持する練習を続ける',
        '空腹と感情サインを区別する習慣を強化',
        'ストレス時でも食べる前に少し立ち止まる習慣を',
      ],
      affirmation: '食べ物と感情を区別することは重要な自己認識です。今のバランスを大切にしてください。',
    },
  },
  moderate: {
    ko: {
      icon: '💛',
      title: '보통',
      subtitle: '가끔 감정적 식사가 있지만 관리 가능한 수준',
      description: '특정 감정 상태에서 식사가 영향을 받는 경우가 있지만, 전반적으로 조절이 가능한 수준입니다. 조금 더 인식을 높이면 음식과 더 건강한 관계를 만들 수 있습니다.',
      strategies: [
        '먹기 전 "배고픈가, 아니면 감정이 배고픈가?" 잠깐 물어보기',
        '감정 일지 쓰기로 패턴 파악하기',
        '간단한 대안 활동 목록 만들기 (5분 산책, 물 한 잔 등)',
      ],
      affirmation: '가끔 감정으로 먹는 것은 누구에게나 있습니다. 인식하는 것 자체가 첫 번째 변화입니다.',
    },
    en: {
      icon: '💛',
      title: 'Moderate',
      subtitle: 'Occasional emotional eating, manageable',
      description: 'Emotions sometimes influence your eating, but overall you manage it well. A bit more awareness can help you build an even healthier relationship with food.',
      strategies: [
        'Ask yourself before eating: "Am I physically hungry, or emotionally hungry?"',
        'Keep a brief emotion journal to spot patterns',
        'Build a short list of quick alternatives (5-min walk, a glass of water)',
      ],
      affirmation: 'Occasionally eating for comfort is universal. Noticing it is already the first step toward change.',
    },
    ja: {
      icon: '💛',
      title: '普通',
      subtitle: '時々感情的な食事があるが管理可能なレベル',
      description: '特定の感情状態で食事が影響を受けることがありますが、全体的に管理可能なレベルです。少し意識を高めると、食べ物とより健康的な関係を築けます。',
      strategies: [
        '食べる前に「本当にお腹が空いているのか、感情がお腹が空いているのか」問いかける',
        '感情日記で食べたくなるパターンを把握する',
        '短い代替行動リストを作る（5分散歩、水を一杯など）',
      ],
      affirmation: '感情で食べることは誰にでもあります。気づくこと自体が最初の変化です。',
    },
  },
  high: {
    ko: {
      icon: '🧡',
      title: '높음',
      subtitle: '감정이 식사 선택에 상당한 영향을 미칩니다',
      description: '감정 상태가 식사 행동에 자주 영향을 줍니다. 음식이 주요한 감정 조절 도구가 되어 있을 수 있습니다. 이것은 의지력의 문제가 아니라, 다른 감정 해소 루틴을 만들 기회입니다.',
      strategies: [
        '음식 외의 감정 해소 루틴 만들기 (산책, 음악, 친구 통화)',
        '배고픔과 감정 신호를 구별하는 연습: 식사 전 10분 기다려보기',
        '집에 자극적인 음식 줄이기 — 없으면 먹기 어렵습니다',
      ],
      affirmation: '감정을 음식으로 위로하는 것은 스스로를 돌보려는 시도입니다. 더 나은 방법을 찾아가는 과정 중에 있습니다.',
    },
    en: {
      icon: '🧡',
      title: 'High',
      subtitle: 'Emotions significantly influence your eating choices',
      description: 'Your emotional state frequently shapes what and how much you eat. Food may be serving as a primary emotion regulation tool. This is not a willpower failure — it\'s an invitation to build other soothing routines.',
      strategies: [
        'Create non-food emotional outlets: a walk, music, calling a friend',
        'Practice distinguishing hunger from emotion: try waiting 10 minutes before eating',
        'Reduce high-trigger foods at home — what isn\'t there can\'t be reached for',
      ],
      affirmation: 'Comforting yourself with food is an attempt at self-care. You are in the process of finding better ways.',
    },
    ja: {
      icon: '🧡',
      title: '高い',
      subtitle: '感情が食事の選択にかなりの影響を与えています',
      description: '感情状態が食事行動に頻繁に影響しています。食べ物が主要な感情調整ツールになっている可能性があります。これは意志力の問題ではなく、他の感情解消ルーティンを作るチャンスです。',
      strategies: [
        '食べ物以外の感情解消ルーティンを作る（散歩、音楽、友人への電話）',
        '空腹と感情サインを区別する練習：食事前に10分待ってみる',
        '自宅の食欲を刺激する食べ物を減らす — なければ手が届かない',
      ],
      affirmation: '感情を食べ物で癒すのは自分を大切にしようとする試みです。より良い方法を見つける過程にいます。',
    },
  },
  very_high: {
    ko: {
      icon: '❤️',
      title: '매우 높음',
      subtitle: '감정적 식사가 일상에 큰 영향을 미치고 있습니다',
      description: '감정적 식사가 일상적인 패턴이 되어 있습니다. 이 패턴은 혼자 바꾸기 어려울 수 있습니다. 전문가의 도움을 받는 것이 효과적이며, 자신을 탓하지 않는 것이 중요합니다. 당신은 잘못된 것이 아닙니다.',
      strategies: [
        '영양사나 심리상담사와 함께 작업하는 것을 고려하세요',
        '하루 한 끼, 먹기 전 배고픔 수준을 1–10으로 확인해보기',
        '자신을 판단하는 내면의 목소리를 알아차리고 부드럽게 바꿔보기',
      ],
      affirmation: '이것은 의지력의 문제가 아닙니다. 음식으로 자신을 달래는 것은 고통에 대한 자연스러운 반응입니다. 당신은 더 많은 도움을 받을 자격이 있습니다.',
    },
    en: {
      icon: '❤️',
      title: 'Very High',
      subtitle: 'Emotional eating is significantly affecting your daily life',
      description: 'Emotional eating has become a daily pattern for you. This can be hard to change alone. Working with a professional — a dietitian or therapist — is effective, and not blaming yourself is essential. There is nothing wrong with you.',
      strategies: [
        'Consider working with a dietitian or therapist who specializes in this area',
        'Once a day, check your hunger level (1–10) before eating',
        'Notice the self-critical inner voice and gently soften it',
      ],
      affirmation: 'This is not a willpower problem. Soothing yourself with food is a natural response to pain. You deserve more support.',
    },
    ja: {
      icon: '❤️',
      title: '非常に高い',
      subtitle: '感情的な食事が日常に大きな影響を与えています',
      description: '感情的な食事が日常的なパターンになっています。このパターンは一人で変えるのが難しい場合があります。専門家のサポートを受けることが効果的で、自分を責めないことが重要です。あなたは間違っていません。',
      strategies: [
        '栄養士や心理カウンセラーとのセッションを検討してください',
        '1日1食、食べる前に空腹レベルを1–10で確認する',
        '自分を批判する内なる声に気づき、穏やかに変えてみる',
      ],
      affirmation: 'これは意志力の問題ではありません。食べ物で自分を慰めることは痛みへの自然な反応です。あなたはより多くのサポートを受ける価値があります。',
    },
  },
}

const LEVEL_COLORS: Record<EatingLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  very_high: '#ef4444',
}

function scoreToLevel(score: number): EatingLevel {
  if (score <= 30) return 'low'
  if (score <= 45) return 'moderate'
  if (score <= 60) return 'high'
  return 'very_high'
}

interface Props { locale?: string }

export default function EmotionalEatingTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'ko')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: EatingLevel; score: number } | null>(null)

  function calcResult(ans: number[]): { level: EatingLevel; score: number } {
    const score = ans.reduce((s, v) => s + (v + 1), 0)
    return { level: scoreToLevel(score), score }
  }

  function pick(val: number) {
    const newAns = [...answers, val]
    if (current + 1 >= questions.length) setResult(calcResult(newAns))
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
  const progress = Math.round((current / questions.length) * 100)

  if (!finished) {
    const q = questions[current]
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
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
            className="h-2 rounded-full bg-muted overflow-hidden"
          >
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-lg font-bold">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
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
  const r = RESULTS[result.level][locale]
  const color = LEVEL_COLORS[result.level]
  const maxScore = 75
  const pct = Math.round((result.score / maxScore) * 100)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {r.icon} {r.title}
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
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={lb.scoreLabel}
          className="h-3 rounded-full bg-muted overflow-hidden"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground pt-1">
          <span>15</span>
          <span>30</span>
          <span>45</span>
          <span>60</span>
          <span>75</span>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-600">{lb.strategies}</h3>
        <ul className="space-y-2">
          {r.strategies.map(s => (
            <li key={s} className="text-sm text-muted-foreground flex gap-2 leading-relaxed">
              <span className="text-emerald-500 mt-0.5 flex-none">→</span>{s}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="rounded-2xl border p-4 space-y-2"
        style={{ borderColor: color + '40', backgroundColor: color + '0d' }}
      >
        <h3 className="font-bold text-sm" style={{ color }}>{lb.affirmation}</h3>
        <p className="text-sm leading-relaxed" style={{ color }}>{r.affirmation}</p>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors"
          aria-label={lb.restart}
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
          aria-label={lb.share}
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
