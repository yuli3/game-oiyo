import { useState } from 'react'

type Level = 'high' | 'medium' | 'low'
type Locale = 'ko' | 'en' | 'ja'

interface Question { id: string; text: string }
interface ResultData {
  title: string; subtitle: string; description: string
  symptoms: string[]; recovery: string[]; warning: string; affirmation: string
}

const LABELS: Record<Locale, {
  title: string; subtitle: string; questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string; share: string; shareMsg: string; yourLevel: string
  symptoms: string; recovery: string; warning: string; affirmation: string
  scoreLabel: string; note: string; outOf: string
}> = {
  ko: {
    title: '번아웃 자가 진단 테스트', subtitle: '지금 나는 얼마나 지쳐 있나요?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 없다', '거의 없다', '가끔 있다', '자주 있다', '항상 그렇다'],
    restart: '다시 하기', share: '결과 공유', shareMsg: '내 번아웃 수준은',
    yourLevel: '나의 번아웃 수준', symptoms: '주요 증상', recovery: '회복 전략',
    warning: '주의', affirmation: '오늘의 메시지', scoreLabel: '번아웃 점수',
    outOf: '/ 40점', note: '이 테스트는 전문적 진단을 대체하지 않습니다. 증상이 심각하면 전문가의 도움을 받으세요.',
  },
  en: {
    title: 'Burnout Self-Check', subtitle: 'How exhausted are you right now?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    restart: 'Retake', share: 'Share Result', shareMsg: 'My burnout level is',
    yourLevel: 'Your Burnout Level', symptoms: 'Key Symptoms', recovery: 'Recovery Strategies',
    warning: 'Note', affirmation: 'Today\'s Message', scoreLabel: 'Burnout Score',
    outOf: '/ 40', note: 'This test does not replace professional diagnosis. Seek help if symptoms are severe.',
  },
  ja: {
    title: 'バーンアウト自己診断テスト', subtitle: '今、どのくらい疲れていますか？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'ほとんどない', 'たまにある', 'よくある', 'いつもそうだ'],
    restart: 'もう一度', share: '結果を共有', shareMsg: '私のバーンアウトレベルは',
    yourLevel: 'バーンアウトレベル', symptoms: '主な症状', recovery: '回復戦略',
    warning: '注意', affirmation: '今日のメッセージ', scoreLabel: 'バーンアウトスコア',
    outOf: '/ 40点', note: 'このテストは専門的診断の代替ではありません。症状が深刻な場合は専門家に相談してください。',
  },
}

const QUESTIONS: Record<Locale, Question[]> = {
  ko: [
    { id: 'q1', text: '아침에 일어나도 피로가 풀리지 않는다' },
    { id: 'q2', text: '일이나 공부에 대한 의욕이 사라졌다' },
    { id: 'q3', text: '사람들과 어울리는 것이 귀찮고 혼자 있고 싶다' },
    { id: 'q4', text: '사소한 일에도 짜증이 나거나 화가 난다' },
    { id: 'q5', text: '집중력이 떨어지고 작은 일도 처리하기 어렵다' },
    { id: 'q6', text: '이전에 즐겼던 취미나 활동이 재미없어졌다' },
    { id: 'q7', text: '감정이 무뎌지거나 아무것도 느끼고 싶지 않다' },
    { id: 'q8', text: '몸이 자주 아프거나 두통, 소화 문제 등이 생긴다' },
    { id: 'q9', text: '내가 하는 일이 의미 없다는 생각이 든다' },
    { id: 'q10', text: '쉬어도 충전이 안 되고 계속 지쳐있다' },
  ],
  en: [
    { id: 'q1', text: 'I still feel tired even after sleeping' },
    { id: 'q2', text: 'I\'ve lost motivation for work or study' },
    { id: 'q3', text: 'I avoid socializing and prefer to be alone' },
    { id: 'q4', text: 'I get irritated or angry over small things' },
    { id: 'q5', text: 'I struggle to concentrate and handle even simple tasks' },
    { id: 'q6', text: 'Hobbies and activities I used to enjoy feel pointless' },
    { id: 'q7', text: 'I feel emotionally numb or want to feel nothing' },
    { id: 'q8', text: 'I frequently get sick, headaches, or digestive issues' },
    { id: 'q9', text: 'My work or daily efforts feel meaningless' },
    { id: 'q10', text: 'Rest doesn\'t recharge me — I stay exhausted' },
  ],
  ja: [
    { id: 'q1', text: '朝起きても疲れが取れていない' },
    { id: 'q2', text: '仕事や勉強への意欲がなくなった' },
    { id: 'q3', text: '人と関わることが面倒で一人でいたい' },
    { id: 'q4', text: 'ちょっとしたことでイライラしたり怒ってしまう' },
    { id: 'q5', text: '集中力が落ちて小さなことも処理しにくい' },
    { id: 'q6', text: '以前楽しんでいた趣味や活動が楽しくない' },
    { id: 'q7', text: '感情が鈍くなり、何も感じたくない' },
    { id: 'q8', text: '体調を崩しやすく、頭痛や消化問題が起きる' },
    { id: 'q9', text: '自分がやっていることに意味がないと感じる' },
    { id: 'q10', text: '休んでもエネルギーが回復せず、ずっと疲れている' },
  ],
}

const RESULTS: Record<Level, Record<Locale, ResultData>> = {
  high: {
    ko: {
      title: '심각한 번아웃', subtitle: '지금 당신에게는 진짜 휴식이 필요합니다',
      description: '번아웃이 심각한 상태입니다. 신체적·정서적·인지적 고갈이 동시에 일어나고 있습니다. 지금 당장 속도를 줄이고, 전문가의 도움을 받는 것을 진지하게 고려하세요.',
      symptoms: ['극심한 정서적 고갈', '냉소주의와 무관심', '업무 효율 급감', '신체 증상(두통, 불면, 소화장애)'],
      recovery: ['즉각적인 업무 부하 감소', '신뢰할 수 있는 사람과 대화', '전문 상담사 또는 의사 방문', '디지털 디톡스 실천', '가장 기본적인 자기 돌봄(수면, 식사, 걷기)'],
      warning: '번아웃은 의지력으로 극복하는 것이 아닙니다. 스스로 해결하려고 혼자 버티지 마세요.',
      affirmation: '쉬는 것은 게으름이 아닙니다. 지금 당신에게 필요한 가장 용감한 행동은 멈추는 것입니다.',
    },
    en: {
      title: 'Severe Burnout', subtitle: 'You need genuine rest right now',
      description: 'You\'re experiencing severe burnout. Physical, emotional, and cognitive exhaustion are happening simultaneously. Consider slowing down immediately and seeking professional support.',
      symptoms: ['Extreme emotional exhaustion', 'Cynicism and detachment', 'Sharply reduced productivity', 'Physical symptoms (headache, insomnia, digestion)'],
      recovery: ['Immediately reduce workload', 'Talk to someone you trust', 'See a counselor or doctor', 'Digital detox', 'Basic self-care: sleep, food, short walks'],
      warning: 'Burnout isn\'t overcome through willpower. Don\'t try to endure it alone.',
      affirmation: 'Rest is not laziness. The bravest thing you can do right now is to stop.',
    },
    ja: {
      title: '深刻なバーンアウト', subtitle: '今すぐ本当の休息が必要です',
      description: '深刻なバーンアウト状態です。身体的・感情的・認知的消耗が同時に起きています。すぐにペースを落として、専門家のサポートを受けることを真剣に考えてください。',
      symptoms: ['極度の感情的消耗', '冷笑と無関心', '業務効率の急激な低下', '身体症状（頭痛、不眠、消化障害）'],
      recovery: ['即座に業務負担を減らす', '信頼できる人と話す', '専門カウンセラーや医師を受診', 'デジタルデトックス実践', '基本的なセルフケア（睡眠・食事・歩く）'],
      warning: 'バーンアウトは意志力で克服するものではありません。一人で耐えようとしないでください。',
      affirmation: '休むことは怠けではありません。今のあなたに必要な最も勇気ある行動は、立ち止まることです。',
    },
  },
  medium: {
    ko: {
      title: '중간 수준의 번아웃', subtitle: '경고 신호가 켜지고 있습니다',
      description: '번아웃의 중간 단계입니다. 아직 회복 가능한 시점이지만, 지금 행동하지 않으면 심화될 수 있습니다. 생활 패턴을 점검하고 의도적인 회복 시간을 만들어야 합니다.',
      symptoms: ['만성적인 피로감', '감소하는 의욕과 집중력', '감정 기복 증가', '소소한 즐거움의 감소'],
      recovery: ['일과 휴식의 균형 재조정', '작은 즐거움을 의도적으로 만들기', '운동 또는 자연 속 시간', '할 일 목록 축소 및 우선순위 조정', '충분한 수면 확보'],
      warning: '번아웃 초기 신호를 무시하면 회복에 더 오랜 시간이 걸립니다.',
      affirmation: '완벽하지 않아도 됩니다. 오늘 하루를 충분히 살아낸 당신은 이미 잘하고 있습니다.',
    },
    en: {
      title: 'Moderate Burnout', subtitle: 'Warning signals are lighting up',
      description: 'You\'re in the middle stage of burnout. Recovery is still possible, but without action now, it may worsen. Review your lifestyle patterns and create intentional recovery time.',
      symptoms: ['Chronic fatigue', 'Declining motivation and concentration', 'Increased mood swings', 'Reduced enjoyment of small pleasures'],
      recovery: ['Rebalance work and rest', 'Intentionally create small joys', 'Exercise or time in nature', 'Shorten your to-do list and reprioritize', 'Secure enough sleep'],
      warning: 'Ignoring early burnout signals means recovery takes much longer.',
      affirmation: 'You don\'t need to be perfect. You\'re already doing well by getting through today.',
    },
    ja: {
      title: '中程度のバーンアウト', subtitle: '警告サインが出ています',
      description: 'バーンアウトの中間段階です。まだ回復可能なタイミングですが、今行動しないと深刻化する可能性があります。生活パターンを見直して、意図的な回復時間を作る必要があります。',
      symptoms: ['慢性的な疲労感', '意欲と集中力の低下', '感情の起伏が増加', '小さな楽しみの減少'],
      recovery: ['仕事と休息のバランスを再調整', '小さな喜びを意図的に作る', '運動または自然の中での時間', 'ToDoリストを短くして優先順位を調整', '十分な睡眠を確保'],
      warning: 'バーンアウトの初期サインを無視すると、回復にさらに時間がかかります。',
      affirmation: '完璧でなくていい。今日一日を生き切ったあなたは、すでによくやっています。',
    },
  },
  low: {
    ko: {
      title: '번아웃 위험 낮음', subtitle: '지금은 괜찮지만 예방이 중요합니다',
      description: '현재 번아웃 수준이 낮습니다. 하지만 번아웃은 갑자기 오는 것이 아니라 서서히 누적됩니다. 지금의 균형을 의도적으로 유지하는 것이 중요합니다.',
      symptoms: ['현재 주요 번아웃 증상 없음', '전반적인 기능 유지'],
      recovery: ['현재 생활 패턴 유지', '정기적인 자기 점검 습관', '즐거운 활동 꾸준히 유지', '경계 설정 연습'],
      warning: '현재 괜찮더라도 무리한 일정이나 지속적인 스트레스는 번아웃을 불러올 수 있습니다.',
      affirmation: '지금의 균형이 귀중합니다. 자신을 잘 돌보고 있는 당신을 응원합니다.',
    },
    en: {
      title: 'Low Burnout Risk', subtitle: 'You\'re okay now, but prevention matters',
      description: 'Your burnout level is currently low. But burnout doesn\'t come suddenly — it accumulates gradually. Intentionally maintaining your current balance is key.',
      symptoms: ['No major burnout symptoms currently', 'Overall functioning maintained'],
      recovery: ['Maintain current lifestyle patterns', 'Regular self-check habit', 'Keep enjoyable activities going', 'Practice setting boundaries'],
      warning: 'Even if you\'re okay now, a packed schedule or prolonged stress can lead to burnout.',
      affirmation: 'Your current balance is precious. Keep taking good care of yourself.',
    },
    ja: {
      title: 'バーンアウトリスク低', subtitle: '今は大丈夫ですが、予防が大切です',
      description: '現在のバーンアウトレベルは低いです。しかしバーンアウトは突然来るのではなく、徐々に蓄積されます。今のバランスを意図的に維持することが大切です。',
      symptoms: ['現在主なバーンアウト症状なし', '全体的な機能が維持されている'],
      recovery: ['現在の生活パターンを維持', '定期的な自己チェックの習慣', '楽しい活動を続ける', '境界設定の練習'],
      warning: '今は大丈夫でも、無理なスケジュールや長期のストレスはバーンアウトを招く可能性があります。',
      affirmation: '今のバランスは貴重です。自分をうまくケアしているあなたを応援します。',
    },
  },
}

interface Props { locale?: string }

export default function BurnoutTest({ locale: lp = 'ko' }: Props) {
  const locale: Locale = (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: Level; score: number } | null>(null)

  function calcResult(ans: number[]): { level: Level; score: number } {
    const score = ans.reduce((s, v) => s + v, 0)
    const level: Level = score >= 28 ? 'high' : score >= 15 ? 'medium' : 'low'
    return { level, score }
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
              className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3">
              <span className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">{i}</span>
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
  const levelColor = result.level === 'high' ? '#ef4444' : result.level === 'medium' ? '#f59e0b' : '#22c55e'

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
        <div className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white" style={{ backgroundColor: levelColor }}>{r.title}</div>
        <p className="font-medium text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{lb.scoreLabel}</span>
          <span className="text-lg font-bold" style={{ color: levelColor }}>{result.score} {lb.outOf}</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: levelColor }} />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{lb.symptoms}</h3>
        <ul className="space-y-1">{r.symptoms.map(s => <li key={s} className="text-sm text-muted-foreground flex gap-2"><span>•</span>{s}</li>)}</ul>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-green-600">{lb.recovery}</h3>
        <ul className="space-y-1">{r.recovery.map(r => <li key={r} className="text-sm text-muted-foreground flex gap-2"><span className="text-green-500">→</span>{r}</li>)}</ul>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-amber-700">{lb.warning}</h3>
        <p className="text-sm text-amber-700">{r.warning}</p>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.affirmation}</h3>
        <p className="text-sm italic">"{r.affirmation}"</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      <div className="flex gap-3">
        <button onClick={restart} className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">{lb.restart}</button>
        <button onClick={share} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">{lb.share}</button>
      </div>
    </div>
  )
}
