import { useState, useEffect } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

interface HistoryQuestion {
  question: string
  options: string[]
  answer: string
  period: string
  explanation: string
}

const LABELS: Record<Locale, {
  title: string; subtitle: string; start: string; restart: string
  correct: string; wrong: string; correctIs: string
  period: string; explanation: string
  score: string; outOf: string; next: string
  results: { [k: string]: string }
  progress: (c: number, t: number) => string
}> = {
  ko: {
    title: '한국사 퀴즈', subtitle: '선사시대부터 현대까지 한국 역사를 테스트해보세요',
    start: '시작', restart: '다시 하기',
    correct: '정답! ✓', wrong: '오답 ✗', correctIs: '정답:',
    period: '시대', explanation: '해설',
    score: '점수', outOf: '/ 10', next: '다음',
    results: { perfect: '한국사 마스터! 🏆', great: '역사 박사 수준! 🌟', good: '기본기 있어요 📚', low: '한국사를 더 공부해봐요 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  en: {
    title: 'Korean History Quiz', subtitle: 'Test your knowledge of Korean history from prehistoric to modern times',
    start: 'Start', restart: 'Retry',
    correct: 'Correct! ✓', wrong: 'Wrong ✗', correctIs: 'Answer:',
    period: 'Period', explanation: 'Explanation',
    score: 'Score', outOf: '/ 10', next: 'Next',
    results: { perfect: 'Korean History Master! 🏆', great: 'History Expert! 🌟', good: 'Good foundation! 📚', low: 'Keep studying Korean history 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  ja: { title: '韓国史クイズ', subtitle: '先史時代から現代まで韓国の歴史をテスト', start: '開始', restart: 'もう一度', correct: '正解！✓', wrong: '不正解 ✗', correctIs: '正解：', period: '時代', explanation: '解説', score: 'スコア', outOf: '/ 10', next: '次へ', results: { perfect: '韓国史マスター！🏆', great: '歴史の専門家！🌟', good: '基礎があります 📚', low: '韓国史を勉強しましょう 💪' }, progress: (c, t) => `${c} / ${t}` },
  fr: { title: 'Quiz d\'Histoire Coréenne', subtitle: 'Testez vos connaissances sur l\'histoire coréenne', start: 'Commencer', restart: 'Recommencer', correct: 'Correct ! ✓', wrong: 'Faux ✗', correctIs: 'Réponse :', period: 'Période', explanation: 'Explication', score: 'Score', outOf: '/ 10', next: 'Suivant', results: { perfect: 'Maître de l\'histoire coréenne ! 🏆', great: 'Expert en histoire ! 🌟', good: 'Bonnes bases ! 📚', low: 'Continuez à étudier 💪' }, progress: (c, t) => `${c} / ${t}` },
  es: { title: 'Quiz de Historia Coreana', subtitle: 'Pon a prueba tus conocimientos de historia coreana', start: 'Comenzar', restart: 'Reintentar', correct: '¡Correcto! ✓', wrong: 'Incorrecto ✗', correctIs: 'Respuesta:', period: 'Período', explanation: 'Explicación', score: 'Puntuación', outOf: '/ 10', next: 'Siguiente', results: { perfect: '¡Maestro de historia coreana! 🏆', great: '¡Experto en historia! 🌟', good: '¡Buenas bases! 📚', low: 'Sigue estudiando 💪' }, progress: (c, t) => `${c} / ${t}` },
  zh: { title: '韩国历史测验', subtitle: '从史前到现代测试您的韩国历史知识', start: '开始', restart: '重新测试', correct: '正确！✓', wrong: '错误 ✗', correctIs: '答案：', period: '时期', explanation: '解说', score: '分数', outOf: '/ 10', next: '下一题', results: { perfect: '韩国历史大师！🏆', great: '历史专家！🌟', good: '有基础！📚', low: '继续学习 💪' }, progress: (c, t) => `${c} / ${t}` },
}

const ALL_QUESTIONS: HistoryQuestion[] = [
  { question: '고조선을 건국한 인물은?', options: ['단군왕검', '주몽', '온조', '박혁거세'], answer: '단군왕검', period: '고조선', explanation: '단군왕검이 기원전 2333년에 고조선을 건국했다고 전해집니다. 삼국유사에 기록된 단군 신화가 출처입니다.' },
  { question: '삼국 시대의 세 나라가 아닌 것은?', options: ['가야', '백제', '신라', '고구려'], answer: '가야', period: '삼국시대', explanation: '삼국은 고구려·백제·신라입니다. 가야는 삼국 시대에 낙동강 유역에 존재했지만 삼국에는 포함되지 않습니다. 562년 신라에 병합되었습니다.' },
  { question: '을지문덕 장군이 수나라 군대를 격파한 전투는?', options: ['살수대첩', '귀주대첩', '진포대첩', '한산도 대첩'], answer: '살수대첩', period: '고구려', explanation: '612년 고구려 을지문덕 장군이 살수(청천강)에서 수나라 100만 대군을 크게 격파한 전투입니다. 삼대첩 중 하나입니다.' },
  { question: '신라의 삼국 통일 이후 당나라 세력을 몰아내고 대동강~원산만을 경계로 통일을 완성한 전투는?', options: ['매소성 전투', '기벌포 전투', '황산벌 전투', '관산성 전투'], answer: '매소성 전투', period: '통일 신라', explanation: '675년 매소성 전투와 676년 기벌포 해전으로 신라가 당나라를 몰아내고 삼국 통일을 완성했습니다.' },
  { question: '발해를 건국한 인물은?', options: ['대조영', '궁예', '왕건', '견훤'], answer: '대조영', period: '남북국시대', explanation: '698년 고구려 유민 대조영이 만주 지역에 발해를 건국했습니다. 발해는 고구려 계승 국가로, 전성기에는 "해동성국"으로 불렸습니다.' },
  { question: '고려를 건국한 인물은?', options: ['왕건', '견훤', '궁예', '최승로'], answer: '왕건', period: '고려', explanation: '918년 왕건이 고려를 건국하고 936년 후삼국을 통일했습니다. 고려는 918년부터 1392년까지 474년간 존속했습니다.' },
  { question: '거란의 침입 때 강동 6주를 획득하는 외교적 성과를 이룬 고려의 인물은?', options: ['서희', '강감찬', '윤관', '최충헌'], answer: '서희', period: '고려', explanation: '993년 거란 1차 침입 당시 서희가 소손녕과의 외교 담판으로 강동 6주를 획득했습니다.' },
  { question: '조선 시대 세종대왕이 창제한 문자는?', options: ['훈민정음', '향찰', '이두', '구결'], answer: '훈민정음', period: '조선', explanation: '1443년(세종 25년) 세종대왕이 백성들이 쉽게 글을 읽고 쓸 수 있도록 훈민정음을 창제했습니다. 1446년 반포되었습니다.' },
  { question: '임진왜란 당시 명량에서 왜군을 물리친 조선 장군은?', options: ['이순신', '권율', '신립', '곽재우'], answer: '이순신', period: '임진왜란', explanation: '1597년 명량 해전에서 이순신 장군이 13척의 배로 130여 척의 왜군을 격파했습니다. 조선 역사상 가장 위대한 해전 중 하나입니다.' },
  { question: '3·1운동이 일어난 해는?', options: ['1919년', '1910년', '1945년', '1905년'], answer: '1919년', period: '일제강점기', explanation: '1919년 3월 1일 일제의 식민 지배에 저항하여 전국적인 독립 만세 운동이 일어났습니다. 약 200만 명이 참여한 것으로 추정됩니다.' },
  { question: '대한민국 정부 수립 연도는?', options: ['1948년', '1945년', '1950년', '1919년'], answer: '1948년', period: '현대', explanation: '1948년 8월 15일 이승만 초대 대통령과 함께 대한민국 정부가 공식 수립되었습니다.' },
  { question: '6·25 전쟁이 발발한 해는?', options: ['1950년', '1948년', '1953년', '1945년'], answer: '1950년', period: '현대', explanation: '1950년 6월 25일 북한이 38도선을 넘어 남침하면서 6·25 전쟁이 시작되었습니다. 1953년 7월 27일 휴전 협정이 체결되었습니다.' },
  { question: '조선의 화폐이자 세종대왕 시절 만들어진 독자적 화폐는?', options: ['조선통보', '상평통보', '해동통보', '건원중보'], answer: '조선통보', period: '조선', explanation: '세종 시절 조선통보가 주조되었습니다. 상평통보는 조선 후기 숙종 때부터 본격 사용된 화폐입니다.' },
  { question: '고려 시대에 금속 활자를 발명하여 "직지심체요절"을 인쇄한 것은 언제?', options: ['1377년', '1392년', '1443년', '1234년'], answer: '1377년', period: '고려', explanation: '1377년 청주 흥덕사에서 세계 최초의 금속 활자 인쇄본 "직지심체요절"이 간행되었습니다. 독일 구텐베르크보다 78년 앞섰습니다.' },
  { question: '조선의 왕 중 사도세자의 아들은?', options: ['정조', '영조', '순조', '헌종'], answer: '정조', period: '조선', explanation: '정조(재위 1776~1800)는 영조의 손자이자 사도세자의 아들입니다. 규장각 설치, 수원 화성 축조 등 개혁 정치를 펼쳤습니다.' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a
}

function pickQuestions(): HistoryQuestion[] {
  return shuffle(ALL_QUESTIONS).slice(0, 10).map(q => ({ ...q, options: shuffle(q.options) }))
}

function getResultKey(score: number): string {
  if (score === 10) return 'perfect'; if (score >= 8) return 'great'; if (score >= 5) return 'good'; return 'low'
}

interface Props { locale: Locale }

export default function KoreanHistoryQuiz({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const [questions, setQuestions] = useState<HistoryQuestion[]>([])
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
    const correct = opt === questions[current].answer
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
        <div className="text-5xl">🏯</div>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        <p className="text-muted-foreground">{l.subtitle}</p>
        <p className="text-sm text-muted-foreground">10문제 · 무작위 출제</p>
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
  const isCorrect = selected === q.answer
  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{l.progress(current + 1, questions.length)}</span>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{q.period}</span>
      </div>
      <div className="rounded-2xl bg-muted p-5 text-center">
        <p className="text-base font-semibold">{q.question}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => {
          let cls = 'border rounded-xl p-4 text-center font-medium text-sm transition-all'
          if (selected === null) cls += ' hover:bg-accent hover:border-primary cursor-pointer'
          else if (opt === q.answer) cls += ' bg-green-50 border-green-400 text-green-700 font-bold'
          else if (opt === selected) cls += ' bg-red-50 border-red-400 text-red-700 line-through'
          else cls += ' opacity-50'
          return <button key={opt} onClick={() => choose(opt)} className={cls}>{opt}</button>
        })}
      </div>
      {selected && (
        <div className={`rounded-xl p-4 text-sm ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-semibold mb-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? l.correct : `${l.wrong} ${l.correctIs} ${q.answer}`}
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
