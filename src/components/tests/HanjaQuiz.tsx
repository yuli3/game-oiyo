import { useState, useEffect } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

interface Question {
  idiom: string
  meaning: string
  options: string[]
  explanation: string
}

const LABELS: Record<Locale, {
  title: string; subtitle: string; start: string; restart: string
  correct: string; wrong: string; explanation: string
  score: string; outOf: string; next: string; finish: string
  results: { [k: string]: string }
  progress: (c: number, t: number) => string
}> = {
  ko: {
    title: '사자성어 퀴즈',
    subtitle: '뜻을 보고 맞는 사자성어를 고르세요',
    start: '시작하기', restart: '다시 하기',
    correct: '정답! ✓', wrong: '오답 ✗',
    explanation: '해설', score: '점수', outOf: '/ 10',
    next: '다음', finish: '결과 보기',
    results: { perfect: '완벽해요! 사자성어 박사 🏆', great: '훌륭해요! 꽤 알고 있군요 🌟', good: '괜찮아요! 더 공부하면 좋겠어요 📚', low: '사자성어를 더 공부해봐요 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  en: {
    title: 'Korean Four-Character Idiom Quiz',
    subtitle: 'Choose the correct idiom based on its meaning',
    start: 'Start', restart: 'Retry',
    correct: 'Correct! ✓', wrong: 'Wrong ✗',
    explanation: 'Explanation', score: 'Score', outOf: '/ 10',
    next: 'Next', finish: 'See Results',
    results: { perfect: 'Perfect! Idiom Master 🏆', great: 'Great! You know quite a lot 🌟', good: 'Good! Keep studying 📚', low: 'Study more idioms 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  ja: {
    title: '四字熟語クイズ（韓国語）',
    subtitle: '意味を見て正しい四字熟語を選んでください',
    start: '開始', restart: 'もう一度',
    correct: '正解！ ✓', wrong: '不正解 ✗',
    explanation: '解説', score: 'スコア', outOf: '/ 10',
    next: '次へ', finish: '結果を見る',
    results: { perfect: '完璧！四字熟語マスター 🏆', great: '素晴らしい！かなり知っていますね 🌟', good: '良い！もっと勉強しましょう 📚', low: '四字熟語をもっと勉強しましょう 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  fr: { title: 'Quiz d\'Idiomes Coréens en 4 Caractères', subtitle: 'Choisissez l\'idiome correct selon son sens', start: 'Commencer', restart: 'Recommencer', correct: 'Correct ! ✓', wrong: 'Faux ✗', explanation: 'Explication', score: 'Score', outOf: '/ 10', next: 'Suivant', finish: 'Voir les résultats', results: { perfect: 'Parfait ! 🏆', great: 'Super ! 🌟', good: 'Bien ! 📚', low: 'Continuez à étudier 💪' }, progress: (c, t) => `${c} / ${t}` },
  es: { title: 'Quiz de Modismos Coreanos de 4 Caracteres', subtitle: 'Elige el modismo correcto según su significado', start: 'Comenzar', restart: 'Reintentar', correct: '¡Correcto! ✓', wrong: 'Incorrecto ✗', explanation: 'Explicación', score: 'Puntuación', outOf: '/ 10', next: 'Siguiente', finish: 'Ver resultados', results: { perfect: '¡Perfecto! 🏆', great: '¡Excelente! 🌟', good: '¡Bien! 📚', low: 'Sigue estudiando 💪' }, progress: (c, t) => `${c} / ${t}` },
  zh: { title: '韩语四字成语测验', subtitle: '根据意思选择正确的四字成语', start: '开始', restart: '重新测试', correct: '正确！✓', wrong: '错误 ✗', explanation: '解说', score: '分数', outOf: '/ 10', next: '下一题', finish: '查看结果', results: { perfect: '完美！🏆', great: '出色！🌟', good: '不错！📚', low: '继续学习 💪' }, progress: (c, t) => `${c} / ${t}` },
}

const ALL_QUESTIONS: Question[] = [
  { idiom: '일석이조', meaning: '돌 하나로 새 두 마리를 잡는다는 뜻으로, 한 가지 일로 두 가지 이익을 얻음', options: ['일석이조', '일거양득', '이심전심', '오십보백보'], explanation: '一石二鳥 — 하나의 행동으로 두 가지 이익을 얻는 상황을 표현' },
  { idiom: '청출어람', meaning: '쪽빛이 남빛보다 더 푸르다는 뜻으로, 제자가 스승보다 나음', options: ['청출어람', '교학상장', '호사다마', '각골난망'], explanation: '靑出於藍 — 제자가 스승을 능가하는 경우를 비유하는 표현' },
  { idiom: '새옹지마', meaning: '인생의 길흉화복은 예측하기 어렵다는 의미', options: ['새옹지마', '전화위복', '인과응보', '일희일비'], explanation: '塞翁之馬 — 변새의 노인이 말을 잃었다가 복이 된 고사에서 유래. 불행도 행복이 될 수 있음' },
  { idiom: '오리무중', meaning: '5리나 되는 짙은 안개 속에 있다는 뜻으로, 갈피를 잡을 수 없음', options: ['오리무중', '암중모색', '막무가내', '황당무계'], explanation: '五里霧中 — 상황을 전혀 파악할 수 없어 방향을 잡지 못하는 상태' },
  { idiom: '이구동성', meaning: '입은 다르지만 목소리는 같다는 뜻으로, 여러 사람이 같은 말을 함', options: ['이구동성', '중구난방', '이심전심', '일언이폐지'], explanation: '異口同聲 — 여러 사람이 한목소리로 같은 말을 하는 상황' },
  { idiom: '금상첨화', meaning: '비단 위에 꽃을 더한다는 뜻으로, 좋은 것에 더 좋은 것이 더해짐', options: ['금상첨화', '설상가상', '사면초가', '엎친 데 덮친 격'], explanation: '錦上添花 — 이미 좋은 상황에 더욱 좋은 일이 생긴 경우' },
  { idiom: '어부지리', meaning: '두 사람이 싸우는 사이에 엉뚱한 제3자가 이익을 얻음', options: ['어부지리', '고진감래', '유비무환', '와신상담'], explanation: '漁夫之利 — 도요새와 조개가 싸우는 틈에 어부가 둘 다 잡았다는 故事에서 유래' },
  { idiom: '작심삼일', meaning: '단단히 먹은 마음이 사흘을 넘기지 못한다는 뜻', options: ['작심삼일', '유작무작', '용두사미', '우공이산'], explanation: '作心三日 — 결심이 오래 가지 않아 흐지부지되는 상황을 표현' },
  { idiom: '자업자득', meaning: '자신이 저지른 일의 결과를 자신이 받음', options: ['자업자득', '인과응보', '사필귀정', '권선징악'], explanation: '自業自得 — 스스로 행한 일에 대한 결과를 본인이 받게 된다는 의미' },
  { idiom: '우공이산', meaning: '어리석어 보이는 노인이 산을 옮기려 한다는 뜻으로, 꾸준히 노력하면 목표를 이룸', options: ['우공이산', '마부위침', '형설지공', '수적천석'], explanation: '愚公移山 — 지극정성으로 꾸준히 하면 아무리 어려운 일도 이룰 수 있다는 교훈' },
  { idiom: '마부위침', meaning: '도끼를 갈아 바늘을 만든다는 뜻으로, 끊임없는 노력으로 불가능이 없음', options: ['마부위침', '우공이산', '형설지공', '절차탁마'], explanation: '磨斧爲針 — 이태백이 공부를 포기하려다 도끼로 바늘을 만들겠다는 노파를 보고 깨달음을 얻은 고사' },
  { idiom: '온고지신', meaning: '옛것을 익히고 새것을 앎으로써 더 나아감', options: ['온고지신', '법고창신', '격물치지', '지행합일'], explanation: '溫故知新 — 공자의 논어에 나오는 말. 과거를 토대로 새로운 것을 배울 수 있다는 의미' },
  { idiom: '고진감래', meaning: '쓴 것이 다하면 단 것이 온다는 뜻으로, 어려움 뒤에 행복이 옴', options: ['고진감래', '흥진비래', '전화위복', '새옹지마'], explanation: '苦盡甘來 — 힘든 시기를 지나면 반드시 좋은 날이 온다는 긍정적인 의미' },
  { idiom: '설상가상', meaning: '눈 위에 서리까지 더한다는 뜻으로, 어려운 상황에 더욱 어려운 일이 생김', options: ['설상가상', '금상첨화', '엎친 데 덮친 격', '사면초가'], explanation: '雪上加霜 — 나쁜 상황이 겹쳐서 더욱 어렵게 됨. 금상첨화의 반대 개념' },
  { idiom: '동병상련', meaning: '같은 병을 앓는 사람끼리 서로 불쌍히 여긴다는 뜻', options: ['동병상련', '역지사지', '타산지석', '반면교사'], explanation: '同病相憐 — 같은 어려움에 처한 사람들끼리 서로 이해하고 위로하는 마음' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a
}

function pickQuestions(): Question[] {
  return shuffle(ALL_QUESTIONS).slice(0, 10).map(q => ({ ...q, options: shuffle(q.options) }))
}

function getResultKey(score: number): string {
  if (score === 10) return 'perfect'
  if (score >= 8) return 'great'
  if (score >= 5) return 'good'
  return 'low'
}

interface Props { locale: Locale }

export default function HanjaQuiz({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const [questions, setQuestions] = useState<Question[]>([])
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [history, setHistory] = useState<boolean[]>([])

  useEffect(() => { setQuestions(pickQuestions()) }, [])

  const start = () => { setQuestions(pickQuestions()); setStarted(true); setCurrent(0); setSelected(null); setScore(0); setFinished(false); setHistory([]) }
  const restart = () => { start() }

  const choose = (opt: string) => {
    if (selected !== null) return
    setSelected(opt)
    const correct = opt === questions[current].idiom
    const newScore = correct ? score + 1 : score
    const newHistory = [...history, correct]
    setScore(newScore)
    setHistory(newHistory)
    if (current + 1 >= questions.length) {
      setTimeout(() => setFinished(true), 800)
    }
  }

  const next = () => { setCurrent(c => c + 1); setSelected(null) }

  if (!started || questions.length === 0) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-5xl">📜</div>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        <p className="text-muted-foreground">{l.subtitle}</p>
        <p className="text-sm text-muted-foreground">10문제 · 뜻에 맞는 사자성어 고르기</p>
        <button onClick={start} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors">{l.start}</button>
      </div>
    )
  }

  if (finished) {
    const rk = getResultKey(score)
    return (
      <div className="space-y-6 py-4 text-center">
        <div className="text-5xl">{score === 10 ? '🏆' : score >= 8 ? '🌟' : score >= 5 ? '📚' : '💪'}</div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">{l.score}</p>
          <p className="text-4xl font-black">{score} <span className="text-base font-normal text-muted-foreground">{l.outOf}</span></p>
        </div>
        <p className="font-semibold text-lg">{l.results[rk]}</p>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {history.map((h, i) => <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${h ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{i + 1}</span>)}
        </div>
        <button onClick={restart} className="px-8 py-3 border rounded-full text-sm font-medium hover:bg-accent transition-colors">{l.restart}</button>
      </div>
    )
  }

  const q = questions[current]
  const isCorrect = selected === q.idiom
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{l.progress(current + 1, questions.length)}</span>
        <div className="flex gap-1">{history.map((h, i) => <span key={i} className={`w-2 h-2 rounded-full ${h ? 'bg-green-500' : 'bg-red-400'}`} />)}</div>
      </div>
      <div className="rounded-2xl bg-muted p-5 text-center space-y-2">
        <p className="text-sm text-muted-foreground">{locale === 'ko' ? '뜻' : 'Meaning'}</p>
        <p className="text-base font-medium leading-relaxed">{q.meaning}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => {
          let cls = 'border rounded-xl p-4 text-center font-bold text-lg transition-all'
          if (selected === null) cls += ' hover:bg-accent hover:border-primary cursor-pointer'
          else if (opt === q.idiom) cls += ' bg-green-50 border-green-400 text-green-700'
          else if (opt === selected) cls += ' bg-red-50 border-red-400 text-red-700'
          else cls += ' opacity-50'
          return <button key={opt} onClick={() => choose(opt)} className={cls}>{opt}</button>
        })}
      </div>
      {selected && (
        <div className={`rounded-xl p-4 text-sm ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-semibold mb-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{isCorrect ? l.correct : l.wrong} {!isCorrect && <span className="text-green-700">→ {q.idiom}</span>}</p>
          <p className="text-muted-foreground">{l.explanation}: {q.explanation}</p>
        </div>
      )}
      {selected && current + 1 < questions.length && (
        <button onClick={next} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">{l.next} →</button>
      )}
    </div>
  )
}
