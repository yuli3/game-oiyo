import { useState, useEffect } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

interface SpellingQuestion {
  correct: string
  wrong: string
  options: string[]
  explanation: string
  category: string
}

const LABELS: Record<Locale, {
  title: string; subtitle: string; start: string; restart: string
  correct: string; wrong: string; explanation: string; category: string
  score: string; outOf: string; next: string
  results: { [k: string]: string }
  progress: (c: number, t: number) => string
  correctIs: string
}> = {
  ko: {
    title: '한국어 맞춤법 퀴즈',
    subtitle: '헷갈리는 맞춤법을 테스트해보세요',
    start: '시작하기', restart: '다시 하기',
    correct: '정답! ✓', wrong: '오답 ✗',
    explanation: '해설', category: '유형',
    score: '맞춤법 점수', outOf: '/ 10',
    next: '다음 문제',
    correctIs: '정답은',
    results: { perfect: '맞춤법 완벽! 국어 선생님 수준 🏆', great: '거의 다 맞혔어요! 꽤 잘 아시네요 🌟', good: '절반 이상! 조금만 더 공부해요 📚', low: '맞춤법 앱을 사용하는 게 좋겠어요 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  en: {
    title: 'Korean Spelling Quiz',
    subtitle: 'Test your knowledge of tricky Korean spelling',
    start: 'Start', restart: 'Retry',
    correct: 'Correct! ✓', wrong: 'Wrong ✗',
    explanation: 'Explanation', category: 'Category',
    score: 'Spelling Score', outOf: '/ 10',
    next: 'Next',
    correctIs: 'Correct answer:',
    results: { perfect: 'Perfect spelling! 🏆', great: 'Nearly perfect! 🌟', good: 'More than half! 📚', low: 'Keep practicing 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  ja: { title: '韓国語スペルクイズ', subtitle: '間違いやすい韓国語の綴りをテスト', start: '開始', restart: 'もう一度', correct: '正解！✓', wrong: '不正解 ✗', explanation: '解説', category: 'カテゴリー', score: 'スペルスコア', outOf: '/ 10', next: '次へ', correctIs: '正解は', results: { perfect: '完璧！🏆', great: 'ほぼ完璧！🌟', good: '半分以上！📚', low: '練習を続けましょう 💪' }, progress: (c, t) => `${c} / ${t}` },
  fr: { title: 'Quiz d\'Orthographe Coréenne', subtitle: 'Testez votre orthographe coréenne', start: 'Commencer', restart: 'Recommencer', correct: 'Correct ! ✓', wrong: 'Faux ✗', explanation: 'Explication', category: 'Catégorie', score: 'Score', outOf: '/ 10', next: 'Suivant', correctIs: 'Bonne réponse:', results: { perfect: 'Parfait ! 🏆', great: 'Presque parfait ! 🌟', good: 'Plus de la moitié ! 📚', low: 'Continuez à pratiquer 💪' }, progress: (c, t) => `${c} / ${t}` },
  es: { title: 'Quiz de Ortografía Coreana', subtitle: 'Pon a prueba tu ortografía coreana', start: 'Comenzar', restart: 'Reintentar', correct: '¡Correcto! ✓', wrong: 'Incorrecto ✗', explanation: 'Explicación', category: 'Categoría', score: 'Puntuación', outOf: '/ 10', next: 'Siguiente', correctIs: 'Respuesta correcta:', results: { perfect: '¡Perfecto! 🏆', great: '¡Casi perfecto! 🌟', good: '¡Más de la mitad! 📚', low: 'Sigue practicando 💪' }, progress: (c, t) => `${c} / ${t}` },
  zh: { title: '韩语拼写测验', subtitle: '测试容易混淆的韩语拼写', start: '开始', restart: '重新测试', correct: '正确！✓', wrong: '错误 ✗', explanation: '解说', category: '类型', score: '拼写分数', outOf: '/ 10', next: '下一题', correctIs: '正确答案：', results: { perfect: '完美！🏆', great: '几乎完美！🌟', good: '超过一半！📚', low: '继续练习 💪' }, progress: (c, t) => `${c} / ${t}` },
}

const ALL_QUESTIONS: SpellingQuestion[] = [
  { correct: '되', wrong: '돼', options: ['되', '돼'], explanation: '"되" 뒤에 아/어로 시작하는 어미가 오면 "돼"로 씁니다. "돼"는 "되어"의 줄임말입니다. 예: 안 돼(×안 되), 잘 됐어(×잘 됬어)', category: '되/돼 구분' },
  { correct: '왠지', wrong: '웬지', options: ['왠지', '웬지'], explanation: '"왠지"는 "왜인지"의 줄임말로 "어쩐지, 이유 없이"의 뜻입니다. "웬"은 "어떤, 무슨"의 뜻이에요. 예: 왠지 모르게 / 웬 영문인지', category: '왠/웬 구분' },
  { correct: '며칠', wrong: '몇일', options: ['며칠', '몇일'], explanation: '"며칠"이 표준어입니다. "몇 일"이나 "몇일"은 잘못된 표기입니다. "몇"은 "며"로 변하는 발음 현상을 반영한 것입니다.', category: '고유어 표기' },
  { correct: '맞히다', wrong: '맞추다', options: ['맞히다', '맞추다'], explanation: '"맞히다"는 문제의 답을 정확히 말하거나 목표를 명중시킬 때 씁니다. "맞추다"는 두 가지를 비교하거나 기준에 맞게 할 때 씁니다. 예: 답을 맞히다 / 박자를 맞추다', category: '맞히다/맞추다' },
  { correct: '~로서', wrong: '~로써', options: ['~로서', '~로써'], explanation: '"로서"는 자격이나 신분을 나타냅니다. "로써"는 수단이나 방법을 나타냅니다. 예: 학생으로서(자격) / 말로써(수단)', category: '로서/로써 구분' },
  { correct: '않다', wrong: '안다', options: ['않다', '안다'], explanation: '"않다"는 "아니하다"의 줄임말로 부정을 나타냅니다. "안"은 부사로 동사·형용사 앞에 씁니다. 예: 가지 않다(않다) / 안 가다(안)', category: '않다/안 구분' },
  { correct: '어떡해', wrong: '어떻게', options: ['어떡해', '어떻게'], explanation: '"어떡해"는 "어떻게 해"의 줄임말로 감탄이나 당혹감 표현 시 씁니다. "어떻게"는 방법이나 방식을 물을 때 씁니다. 예: 이걸 어떡해! / 이걸 어떻게 해결할까?', category: '어떡해/어떻게' },
  { correct: '낫다', wrong: '낳다', options: ['낫다', '낳다'], explanation: '"낫다"는 회복되거나 더 좋아지는 의미입니다. "낳다"는 자녀나 알을 낳을 때 씁니다. 예: 병이 낫다 / 아이를 낳다', category: '낫다/낳다 구분' },
  { correct: '금세', wrong: '금새', options: ['금세', '금새'], explanation: '"금세"가 표준어입니다. "금세"는 "금시에"의 줄임말로 "곧, 바로"를 의미합니다. "금새"는 틀린 표기입니다.', category: '표준어 표기' },
  { correct: '~든지', wrong: '~던지', options: ['~든지', '~던지'], explanation: '"든지"는 선택이나 조건을 나타냅니다. "던지"는 과거의 경험이나 회상을 나타냅니다. 예: 가든지 오든지(선택) / 예전에 갔던지(회상)', category: '든지/던지 구분' },
  { correct: '안되다', wrong: '안돼다', options: ['안되다', '안됩니다', '안돼다', '아니되다'], explanation: '"안되다"가 옳은 표기입니다. 합성어로 띄어 쓰지 않습니다. "안 되다"로 띄어 쓸 수도 있습니다.', category: '안되다 표기' },
  { correct: '의례', wrong: '으레', options: ['의례', '으레', '의레', '으례'], explanation: '"으레"가 표준어입니다. "의례"는 다른 의미(예절 절차)입니다. "으레"는 "틀림없이, 예상대로"를 뜻합니다.', category: '표준어 구분' },
  { correct: '너무너무', wrong: '넘넘', options: ['너무너무', '넘넘', '너머너머', '넘어넘어'], explanation: '"너무너무"가 올바른 표기입니다. "넘넘"은 인터넷 신조어로 맞춤법에 맞지 않습니다.', category: '표준어 사용' },
  { correct: '설레다', wrong: '설레이다', options: ['설레다', '설레이다'], explanation: '"설레다"가 표준어입니다. "설레이다"는 잘못된 표기입니다. 예: 마음이 설레다(O) / 마음이 설레이다(X)', category: '표준어 표기' },
  { correct: '구레나룻', wrong: '구렛나루', options: ['구레나룻', '구렛나루', '구레나루', '구렛나룻'], explanation: '"구레나룻"이 표준어입니다. 귀밑에서 턱까지 잇닿아 난 수염을 가리킵니다.', category: '표준어 표기' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a
}

function pickQuestions(): SpellingQuestion[] {
  return shuffle(ALL_QUESTIONS).slice(0, 10).map(q => ({ ...q, options: shuffle(q.options) }))
}

function getResultKey(score: number): string {
  if (score === 10) return 'perfect'
  if (score >= 8) return 'great'
  if (score >= 5) return 'good'
  return 'low'
}

interface Props { locale: Locale }

export default function KoreanSpellingQuiz({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const [questions, setQuestions] = useState<SpellingQuestion[]>([])
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [history, setHistory] = useState<boolean[]>([])

  useEffect(() => { setQuestions(pickQuestions()) }, [])

  const start = () => { setQuestions(pickQuestions()); setStarted(true); setCurrent(0); setSelected(null); setScore(0); setFinished(false); setHistory([]) }

  const choose = (opt: string) => {
    if (selected !== null) return
    setSelected(opt)
    const correct = opt === questions[current].correct
    const newScore = correct ? score + 1 : score
    const newHistory = [...history, correct]
    setScore(newScore)
    setHistory(newHistory)
    if (current + 1 >= questions.length) setTimeout(() => setFinished(true), 900)
  }

  const next = () => { setCurrent(c => c + 1); setSelected(null) }

  if (!started || questions.length === 0) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-5xl">✏️</div>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        <p className="text-muted-foreground">{l.subtitle}</p>
        <p className="text-sm text-muted-foreground">10문제 · 올바른 표기 선택하기</p>
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
        <button onClick={start} className="px-8 py-3 border rounded-full text-sm font-medium hover:bg-accent transition-colors">{l.restart}</button>
      </div>
    )
  }

  const q = questions[current]
  const isCorrect = selected === q.correct
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{l.progress(current + 1, questions.length)}</span>
        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{q.category}</span>
      </div>
      <div className="rounded-2xl bg-muted p-5 text-center">
        <p className="text-sm text-muted-foreground mb-2">{locale === 'ko' ? '다음 중 올바른 표기는?' : 'Which is the correct spelling?'}</p>
        <p className="text-base font-medium leading-relaxed">{q.explanation.split('.')[0]}.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => {
          let cls = 'border rounded-xl p-4 text-center font-bold text-base transition-all'
          if (selected === null) cls += ' hover:bg-accent hover:border-primary cursor-pointer'
          else if (opt === q.correct) cls += ' bg-green-50 border-green-400 text-green-700'
          else if (opt === selected) cls += ' bg-red-50 border-red-400 text-red-700 line-through'
          else cls += ' opacity-50'
          return <button key={opt} onClick={() => choose(opt)} className={cls}>{opt}</button>
        })}
      </div>
      {selected && (
        <div className={`rounded-xl p-4 text-sm ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-semibold mb-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? l.correct : `${l.wrong} ${l.correctIs} "${q.correct}"`}
          </p>
          <p className="text-muted-foreground">{q.explanation}</p>
        </div>
      )}
      {selected && current + 1 < questions.length && (
        <button onClick={next} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">{l.next} →</button>
      )}
    </div>
  )
}
