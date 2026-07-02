import { useState, useEffect } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

interface GeoQuestion {
  question: string
  options: string[]
  answer: string
  category: string
  explanation: string
}

const LABELS: Record<Locale, {
  title: string; subtitle: string; start: string; restart: string
  correct: string; wrong: string; correctIs: string
  category: string; explanation: string
  score: string; outOf: string; next: string
  results: { [k: string]: string }
  progress: (c: number, t: number) => string
}> = {
  ko: {
    title: '세계 지리 퀴즈', subtitle: '세계 지리 상식을 테스트해보세요',
    start: '시작', restart: '다시 하기',
    correct: '정답! ✓', wrong: '오답 ✗', correctIs: '정답:',
    category: '카테고리', explanation: '해설',
    score: '점수', outOf: '/ 10', next: '다음',
    results: { perfect: '지리 박사! 🌍', great: '세계 여행가 🌟', good: '기본 지식 있어요 📚', low: '지리를 더 공부해봐요 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  en: {
    title: 'World Geography Quiz', subtitle: 'Test your world geography knowledge',
    start: 'Start', restart: 'Retry',
    correct: 'Correct! ✓', wrong: 'Wrong ✗', correctIs: 'Answer:',
    category: 'Category', explanation: 'Explanation',
    score: 'Score', outOf: '/ 10', next: 'Next',
    results: { perfect: 'Geography Doctor! 🌍', great: 'World Traveler! 🌟', good: 'Good basics! 📚', low: 'Keep studying geography 💪' },
    progress: (c, t) => `${c} / ${t}`,
  },
  ja: { title: '世界地理クイズ', subtitle: '世界地理の知識をテスト', start: '開始', restart: 'もう一度', correct: '正解！✓', wrong: '不正解 ✗', correctIs: '正解：', category: 'カテゴリー', explanation: '解説', score: 'スコア', outOf: '/ 10', next: '次へ', results: { perfect: '地理博士！🌍', great: '世界の旅人！🌟', good: '基礎知識あり 📚', low: '地理を勉強しましょう 💪' }, progress: (c, t) => `${c} / ${t}` },
  fr: { title: 'Quiz de Géographie Mondiale', subtitle: 'Testez vos connaissances en géographie mondiale', start: 'Commencer', restart: 'Recommencer', correct: 'Correct ! ✓', wrong: 'Faux ✗', correctIs: 'Réponse :', category: 'Catégorie', explanation: 'Explication', score: 'Score', outOf: '/ 10', next: 'Suivant', results: { perfect: 'Docteur en géographie ! 🌍', great: 'Voyageur mondial ! 🌟', good: 'Bonnes bases ! 📚', low: 'Continuez à étudier 💪' }, progress: (c, t) => `${c} / ${t}` },
  es: { title: 'Quiz de Geografía Mundial', subtitle: 'Pon a prueba tus conocimientos de geografía mundial', start: 'Comenzar', restart: 'Reintentar', correct: '¡Correcto! ✓', wrong: 'Incorrecto ✗', correctIs: 'Respuesta:', category: 'Categoría', explanation: 'Explicación', score: 'Puntuación', outOf: '/ 10', next: 'Siguiente', results: { perfect: '¡Doctor en geografía! 🌍', great: '¡Viajero mundial! 🌟', good: '¡Buenas bases! 📚', low: 'Sigue estudiando 💪' }, progress: (c, t) => `${c} / ${t}` },
  zh: { title: '世界地理测验', subtitle: '测试您的世界地理知识', start: '开始', restart: '重新测试', correct: '正确！✓', wrong: '错误 ✗', correctIs: '答案：', category: '类型', explanation: '解说', score: '分数', outOf: '/ 10', next: '下一题', results: { perfect: '地理博士！🌍', great: '世界旅行者！🌟', good: '有基础！📚', low: '继续学习 💪' }, progress: (c, t) => `${c} / ${t}` },
}

const ALL_QUESTIONS: GeoQuestion[] = [
  { question: '세계에서 가장 긴 강은?', options: ['나일강', '아마존강', '양쯔강', '미시시피강'], answer: '나일강', category: '강·수계', explanation: '나일강(약 6,650km)이 세계에서 가장 긴 강입니다. 아프리카 북동부를 흘러 지중해로 유입됩니다. (아마존강은 유량이 가장 많은 강)' },
  { question: '세계에서 가장 넓은 사막은?', options: ['사하라 사막', '아라비아 사막', '고비 사막', '남극 사막'], answer: '남극 사막', category: '지형', explanation: '남극 사막은 약 1,400만㎢로 세계 최대입니다. 강수량이 극히 적어 사막으로 분류됩니다. 일반적으로 알려진 사하라는 열대·아열대 사막 중 최대입니다.' },
  { question: '세계에서 가장 높은 산은?', options: ['에베레스트산', 'K2', '칸첸중가', '로체'], answer: '에베레스트산', category: '지형', explanation: '에베레스트산(8,848.86m)은 히말라야 산맥에 위치하며 세계 최고봉입니다. 중국·네팔 국경에 걸쳐 있습니다.' },
  { question: '아마존 열대우림의 대부분이 위치한 나라는?', options: ['브라질', '콜롬비아', '페루', '베네수엘라'], answer: '브라질', category: '생물지리', explanation: '아마존 열대우림의 약 60%가 브라질에 위치합니다. 나머지는 페루, 콜롬비아, 베네수엘라 등에 걸쳐 있습니다.' },
  { question: '세계에서 가장 깊은 호수는?', options: ['바이칼 호', '카스피해', '슈피리어 호', '탕가니카 호'], answer: '바이칼 호', category: '강·수계', explanation: '시베리아의 바이칼 호수는 최대 수심 1,642m로 세계 최심 호수입니다. 지구 민물의 약 20%가 이곳에 있습니다.' },
  { question: '유럽에서 가장 긴 강은?', options: ['볼가강', '다뉴브강', '라인강', '론강'], answer: '볼가강', category: '강·수계', explanation: '볼가강(3,690km)은 유럽에서 가장 긴 강으로, 러시아를 흘러 카스피해로 유입됩니다.' },
  { question: '세계에서 가장 많은 국가와 국경을 접하는 나라는?', options: ['중국', '러시아', '브라질', '독일'], answer: '중국', category: '정치지리', explanation: '중국과 러시아 모두 14개국과 국경을 접하며 공동 1위입니다. 참고로 브라질은 10개국입니다.' },
  { question: '세계에서 인구가 가장 많은 나라는? (2024년 기준)', options: ['인도', '중국', '미국', '인도네시아'], answer: '인도', category: '인구', explanation: '2023년 인도(약 14억 2,000만 명)가 중국(약 14억 1,000만 명)을 제치고 세계 인구 1위 국가가 되었습니다.' },
  { question: '세계에서 면적이 가장 작은 나라는?', options: ['바티칸시국', '산마리노', '모나코', '리히텐슈타인'], answer: '바티칸시국', category: '정치지리', explanation: '바티칸시국(0.44㎢)은 이탈리아 로마 안에 위치한 세계에서 가장 작은 독립 국가입니다.' },
  { question: '태평양에서 가장 깊은 지점인 마리아나 해구가 위치한 해역은?', options: ['서태평양', '동태평양', '남태평양', '북태평양'], answer: '서태평양', category: '해양', explanation: '마리아나 해구는 서태평양 마리아나 제도 동쪽에 위치하며, 챌린저 딥(약 10,994m)이 지구 최저점입니다.' },
  { question: '세계 4대 문명 발상지가 아닌 것은?', options: ['인더스 문명', '잉카 문명', '황하 문명', '메소포타미아 문명'], answer: '잉카 문명', category: '문명·역사', explanation: '4대 문명은 메소포타미아(티그리스·유프라테스강), 이집트(나일강), 인더스(인더스강), 황하(황하강)입니다. 잉카는 4대 문명에 포함되지 않습니다.' },
  { question: '사하라 사막이 위치한 대륙은?', options: ['아프리카', '아시아', '호주', '남아메리카'], answer: '아프리카', category: '지형', explanation: '사하라 사막은 아프리카 북부에 위치하며 면적은 약 900만㎢입니다. 아프리카 대륙의 약 30%를 차지합니다.' },
  { question: '적도가 통과하는 나라가 아닌 것은?', options: ['브라질', '케냐', '인도', '에콰도르'], answer: '인도', category: '기후·기후대', explanation: '적도는 에콰도르, 콜롬비아, 브라질, 콩고, 케냐, 인도네시아 등을 통과합니다. 인도는 적도 북쪽에 위치합니다.' },
  { question: '세계에서 면적이 가장 큰 나라는?', options: ['러시아', '캐나다', '중국', '미국'], answer: '러시아', category: '정치지리', explanation: '러시아(약 1,709만㎢)는 세계 최대 면적 국가로, 전 세계 육지 면적의 약 11%를 차지합니다.' },
  { question: '히말라야 산맥이 걸쳐 있는 나라 중 포함되지 않는 것은?', options: ['이란', '네팔', '인도', '파키스탄'], answer: '이란', category: '지형', explanation: '히말라야 산맥은 인도, 네팔, 부탄, 파키스탄, 중국에 걸쳐 있습니다. 이란은 히말라야와 관계없으며 자그로스 산맥 등이 있습니다.' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a
}

function pickQuestions(): GeoQuestion[] {
  return shuffle(ALL_QUESTIONS).slice(0, 10).map(q => ({ ...q, options: shuffle(q.options) }))
}

function getResultKey(score: number): string {
  if (score === 10) return 'perfect'; if (score >= 8) return 'great'; if (score >= 5) return 'good'; return 'low'
}

interface Props { locale: Locale }

export default function WorldGeographyQuiz({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const [questions, setQuestions] = useState<GeoQuestion[]>([])
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
    setScore(newScore)
    setHistory([...history, correct])
    if (current + 1 >= questions.length) setTimeout(() => setFinished(true), 900)
  }

  const next = () => { setCurrent(c => c + 1); setSelected(null) }

  if (!started || questions.length === 0) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-5xl">🌍</div>
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
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">{q.category}</span>
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
