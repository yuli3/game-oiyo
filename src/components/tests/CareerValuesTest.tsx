import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type DimKey = 'security' | 'achievement' | 'autonomy' | 'service' | 'creativity' | 'status'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Question { id: string; text: string; dim: DimKey }
interface DimData {
  name: string; description: string; careers: string[]
}
const DIM_KEYS: DimKey[] = ['security', 'achievement', 'autonomy', 'service', 'creativity', 'status']

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string; share: string; shareMsg: string
  yourValues: string; topValues: string; dimProfile: string
  careers: string; suggestion: string; affirmation: string
  note: string
  dimNames: Record<DimKey, string>
}> = {
  ko: {
    title: '직업 가치관 테스트',
    subtitle: '나는 일에서 무엇을 원하는가?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 중요하지 않다', '별로 중요하지 않다', '보통이다', '꽤 중요하다', '매우 중요하다'],
    restart: '다시 하기', share: '결과 공유', shareMsg: '나의 직업 가치관 상위 2가지는',
    yourValues: '나의 직업 가치관', topValues: '상위 가치관', dimProfile: '가치관 분포',
    careers: '어울리는 직업 환경', suggestion: '커리어 조언', affirmation: '오늘의 메시지',
    note: '이 테스트는 직업 가치관을 탐색하는 데 도움을 줍니다. 결과는 방향성을 제시합니다.',
    dimNames: {
      security: '안정성', achievement: '성취', autonomy: '자율성',
      service: '봉사', creativity: '창의성', status: '지위',
    },
  },
  en: {
    title: 'Career Values Test',
    subtitle: 'What Do You Want From Work?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not important at all', 'Not very important', 'Neutral', 'Quite important', 'Very important'],
    restart: 'Retake', share: 'Share Result', shareMsg: 'My top 2 career values are',
    yourValues: 'Your Career Values', topValues: 'Top Values', dimProfile: 'Values Profile',
    careers: 'Fitting Work Environments', suggestion: 'Career Advice', affirmation: "Today's Message",
    note: 'This test helps you explore your career values. Results provide directional guidance.',
    dimNames: {
      security: 'Security', achievement: 'Achievement', autonomy: 'Autonomy',
      service: 'Service', creativity: 'Creativity', status: 'Status',
    },
  },
  ja: {
    title: '職業価値観テスト',
    subtitle: '私は仕事に何を求めるか？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全く重要でない', 'あまり重要でない', '普通', 'かなり重要', 'とても重要'],
    restart: 'もう一度', share: '結果を共有', shareMsg: '私の職業価値観の上位2つは',
    yourValues: '私の職業価値観', topValues: '上位価値観', dimProfile: '価値観分布',
    careers: '合う職場環境', suggestion: 'キャリアアドバイス', affirmation: '今日のメッセージ',
    note: 'このテストは職業価値観の探索を助けます。結果は方向性を示すものです。',
    dimNames: {
      security: '安定性', achievement: '達成', autonomy: '自律性',
      service: '奉仕', creativity: '創造性', status: '地位',
    },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1',  dim: 'security',    text: '직업 안정성과 꾸준한 수입이 나에게 중요하다' },
    { id: 'q2',  dim: 'security',    text: '예측 가능한 업무 환경에서 안정감을 느낀다' },
    { id: 'q3',  dim: 'security',    text: '은퇴 후 재정적 안전망이 보장되는 직업을 원한다' },
    { id: 'q4',  dim: 'achievement', text: '목표를 달성하고 성과를 인정받는 것이 중요하다' },
    { id: 'q5',  dim: 'achievement', text: '도전적인 목표를 향해 나아갈 때 동기부여가 된다' },
    { id: 'q6',  dim: 'achievement', text: '내 성과가 조직의 성공에 기여한다는 것을 느끼고 싶다' },
    { id: 'q7',  dim: 'autonomy',    text: '내 방식대로 일할 수 있는 자유가 중요하다' },
    { id: 'q8',  dim: 'autonomy',    text: '업무 시간과 장소를 스스로 결정할 수 있으면 좋겠다' },
    { id: 'q9',  dim: 'autonomy',    text: '세세하게 지시받기보다 스스로 판단하고 싶다' },
    { id: 'q10', dim: 'service',     text: '다른 사람을 돕는 일이 나에게 의미 있다' },
    { id: 'q11', dim: 'service',     text: '내 일이 사회나 공동체에 긍정적인 영향을 준다는 것이 중요하다' },
    { id: 'q12', dim: 'service',     text: '약자나 소외된 사람을 위해 일하는 데 보람을 느낀다' },
    { id: 'q13', dim: 'creativity',  text: '새로운 아이디어를 내고 창의적으로 문제를 해결하는 것을 즐긴다' },
    { id: 'q14', dim: 'creativity',  text: '기존 방식보다 혁신적인 접근을 선호한다' },
    { id: 'q15', dim: 'creativity',  text: '예술적이거나 독창적인 작업을 할 수 있는 환경을 원한다' },
    { id: 'q16', dim: 'status',      text: '사회적으로 인정받거나 존경받는 직업을 원한다' },
    { id: 'q17', dim: 'status',      text: '타이틀이나 직위가 나에게 의미 있다' },
    { id: 'q18', dim: 'status',      text: '내 직업이 주변 사람들에게 자랑스럽게 느껴지길 바란다' },
  ],
  en: [
    { id: 'q1',  dim: 'security',    text: 'Job stability and steady income matter a lot to me' },
    { id: 'q2',  dim: 'security',    text: 'I feel comfortable in predictable work environments' },
    { id: 'q3',  dim: 'security',    text: 'I want a career with a guaranteed financial safety net after retirement' },
    { id: 'q4',  dim: 'achievement', text: 'Reaching goals and having my results recognized is important to me' },
    { id: 'q5',  dim: 'achievement', text: 'Working toward challenging goals motivates me' },
    { id: 'q6',  dim: 'achievement', text: 'I want to feel that my contributions drive the organization\'s success' },
    { id: 'q7',  dim: 'autonomy',    text: 'Having freedom to work in my own way matters to me' },
    { id: 'q8',  dim: 'autonomy',    text: 'I would like to decide my own working hours and location' },
    { id: 'q9',  dim: 'autonomy',    text: 'I prefer making my own judgments rather than receiving detailed instructions' },
    { id: 'q10', dim: 'service',     text: 'Work that helps other people feels meaningful to me' },
    { id: 'q11', dim: 'service',     text: 'It is important that my work has a positive impact on society or the community' },
    { id: 'q12', dim: 'service',     text: 'I find fulfillment in working for vulnerable or marginalized people' },
    { id: 'q13', dim: 'creativity',  text: 'I enjoy generating new ideas and solving problems creatively' },
    { id: 'q14', dim: 'creativity',  text: 'I prefer innovative approaches over established ones' },
    { id: 'q15', dim: 'creativity',  text: 'I want an environment where I can do artistic or original work' },
    { id: 'q16', dim: 'status',      text: 'I want a career that is recognized or respected in society' },
    { id: 'q17', dim: 'status',      text: 'Titles and seniority have meaning for me' },
    { id: 'q18', dim: 'status',      text: 'I want my job to be something I can feel proud of in front of others' },
  ],
  ja: [
    { id: 'q1',  dim: 'security',    text: '職の安定と安定した収入が大切だ' },
    { id: 'q2',  dim: 'security',    text: '予測可能な職場環境で安心感を覚える' },
    { id: 'q3',  dim: 'security',    text: '退職後の経済的セーフティネットが保証される職業を望む' },
    { id: 'q4',  dim: 'achievement', text: '目標を達成し、成果を認められることが大切だ' },
    { id: 'q5',  dim: 'achievement', text: '挑戦的な目標に向かって進むとき、意欲が湧く' },
    { id: 'q6',  dim: 'achievement', text: '自分の貢献が組織の成功につながると感じたい' },
    { id: 'q7',  dim: 'autonomy',    text: '自分のやり方で仕事できる自由が重要だ' },
    { id: 'q8',  dim: 'autonomy',    text: '勤務時間と場所を自分で決められるとよい' },
    { id: 'q9',  dim: 'autonomy',    text: '細かく指示されるより自分で判断したい' },
    { id: 'q10', dim: 'service',     text: '他の人を助ける仕事が自分にとって意味がある' },
    { id: 'q11', dim: 'service',     text: '自分の仕事が社会やコミュニティに良い影響を与えることが大切だ' },
    { id: 'q12', dim: 'service',     text: '弱者や疎外された人のために働くことにやりがいを感じる' },
    { id: 'q13', dim: 'creativity',  text: '新しいアイデアを出し、創造的に問題を解決するのが好きだ' },
    { id: 'q14', dim: 'creativity',  text: '既存の方法より革新的なアプローチを好む' },
    { id: 'q15', dim: 'creativity',  text: '芸術的または独創的な作業ができる環境を望む' },
    { id: 'q16', dim: 'status',      text: '社会的に認められたり尊重されたりする職業を望む' },
    { id: 'q17', dim: 'status',      text: '肩書きや役職が自分にとって意味がある' },
    { id: 'q18', dim: 'status',      text: '周囲に誇れる仕事をしたい' },
  ],
}

const DIM_DATA: Record<DimKey, Record<SupportedLang, DimData>> = {
  security: {
    ko: { name: '안정성', description: '예측 가능하고 안전한 환경에서 일하는 것을 중요하게 여깁니다.', careers: ['공무원', '의료 직종', '대기업 정규직', '교사', '금융권'] },
    en: { name: 'Security', description: 'You value working in predictable and safe environments.', careers: ['Civil service', 'Healthcare', 'Established corporations', 'Teaching', 'Banking'] },
    ja: { name: '安定性', description: '予測可能で安全な環境で働くことを重視します。', careers: ['公務員', '医療職種', '大企業正社員', '教師', '金融機関'] },
  },
  achievement: {
    ko: { name: '성취', description: '목표를 달성하고 성과를 쌓아가는 것이 중요한 동기입니다.', careers: ['영업', '스타트업', '컨설팅', '기업가', '스포츠'] },
    en: { name: 'Achievement', description: 'Reaching goals and building accomplishments is a key motivator for you.', careers: ['Sales', 'Startups', 'Consulting', 'Entrepreneurship', 'Sports'] },
    ja: { name: '達成', description: '目標を達成し成果を積み重ねることが重要な動機です。', careers: ['営業', 'スタートアップ', 'コンサルティング', '起業家', 'スポーツ'] },
  },
  autonomy: {
    ko: { name: '자율성', description: '자신의 방식으로 일하고 스스로 결정하는 환경을 원합니다.', careers: ['프리랜서', '작가', '연구자', '디자이너', '1인 창업'] },
    en: { name: 'Autonomy', description: 'You want to work in your own way and make your own decisions.', careers: ['Freelancing', 'Writing', 'Research', 'Design', 'Solo entrepreneurship'] },
    ja: { name: '自律性', description: '自分のやり方で仕事をし、自分で決断できる環境を求めます。', careers: ['フリーランス', 'ライター', '研究者', 'デザイナー', '個人起業'] },
  },
  service: {
    ko: { name: '봉사', description: '타인과 사회에 기여하는 일에서 깊은 의미를 찾습니다.', careers: ['사회복지사', '간호사', '교사', 'NGO 활동가', '심리상담사'] },
    en: { name: 'Service', description: 'You find deep meaning in work that contributes to others and society.', careers: ['Social worker', 'Nurse', 'Teacher', 'NGO worker', 'Counselor'] },
    ja: { name: '奉仕', description: '他者や社会に貢献する仕事に深い意味を見出します。', careers: ['社会福祉士', '看護師', '教師', 'NGO活動家', '心理カウンセラー'] },
  },
  creativity: {
    ko: { name: '창의성', description: '새로운 아이디어와 독창적인 표현이 있는 환경에서 빛납니다.', careers: ['예술가', 'UX 디자이너', '광고 기획자', '게임 개발자', '작가'] },
    en: { name: 'Creativity', description: 'You thrive in environments with new ideas and original expression.', careers: ['Artist', 'UX designer', 'Advertising creative', 'Game developer', 'Writer'] },
    ja: { name: '創造性', description: '新しいアイデアと独創的な表現がある環境で輝きます。', careers: ['アーティスト', 'UXデザイナー', '広告クリエイター', 'ゲーム開発者', 'ライター'] },
  },
  status: {
    ko: { name: '지위', description: '사회적 인정과 직업적 위상이 중요한 동기가 됩니다.', careers: ['의사', '변호사', '임원', '정치인', '교수'] },
    en: { name: 'Status', description: 'Social recognition and professional prestige are key motivators for you.', careers: ['Doctor', 'Lawyer', 'Executive', 'Politician', 'Professor'] },
    ja: { name: '地位', description: '社会的な認知と職業的な地位が重要な動機です。', careers: ['医師', '弁護士', '役員', '政治家', '教授'] },
  },
}

const COMBO_AFFIRMATIONS: Record<SupportedLang, (t1: DimKey, t2: DimKey) => string> = {
  ko: (t1, t2) => `당신에게 일은 ${DIM_DATA[t1].ko.name}과 ${DIM_DATA[t2].ko.name}이 함께하는 곳입니다. 이 두 가지를 모두 존중하는 환경을 찾아나가세요.`,
  en: (t1, t2) => `For you, work is a place where ${DIM_DATA[t1].en.name} and ${DIM_DATA[t2].en.name} come together. Seek environments that honor both.`,
  ja: (t1, t2) => `あなたにとって仕事は${DIM_DATA[t1].ja.name}と${DIM_DATA[t2].ja.name}が共存する場所です。この二つを共に尊重できる環境を探していきましょう。`,
}

const COMBO_SUGGESTIONS: Record<SupportedLang, (t1: DimKey, t2: DimKey) => string> = {
  ko: (t1, t2) => `${DIM_DATA[t1].ko.name}을 추구하면서도 ${DIM_DATA[t2].ko.name}의 기회를 함께 탐색해보세요. 두 가치를 모두 충족하는 환경은 존재합니다.`,
  en: (t1, t2) => `Explore careers where ${DIM_DATA[t1].en.name} and ${DIM_DATA[t2].en.name} can coexist. Environments that honor both values do exist.`,
  ja: (t1, t2) => `${DIM_DATA[t1].ja.name}を追求しながら、${DIM_DATA[t2].ja.name}の機会も探してみてください。両方の価値を満たせる環境は存在します。`,
}

interface Props { locale?: string }

export default function CareerValuesTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [scores, setScores] = useState<Record<DimKey, number>>(
    () => ({ security: 0, achievement: 0, autonomy: 0, service: 0, creativity: 0, status: 0 })
  )
  const [done, setDone] = useState(false)

  function pick(val: number) {
    const q = questions[current]
    const next = { ...scores, [q.dim]: scores[q.dim] + (val + 1) }
    if (current + 1 >= questions.length) {
      setScores(next)
      setDone(true)
    } else {
      setScores(next)
      setCurrent(current + 1)
    }
  }

  function restart() {
    setScores({ security: 0, achievement: 0, autonomy: 0, service: 0, creativity: 0, status: 0 })
    setCurrent(0)
    setDone(false)
  }

  function share() {
    const sorted = getSorted()
    const url = window.location.href
    const t1 = lb.dimNames[sorted[0]]
    const t2 = lb.dimNames[sorted[1]]
    const text = `${lb.shareMsg} — ${t1}, ${t2}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  function getSorted(): DimKey[] {
    return [...DIM_KEYS].sort((a, b) => scores[b] - scores[a])
  }

  const maxPerDim = 15 // 3 questions * 5 max

  if (!done) {
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

  const sorted = getSorted()
  const top1 = sorted[0]
  const top2 = sorted[1]
  const dimColors: Record<DimKey, string> = {
    security: '#3b82f6', achievement: '#ef4444', autonomy: '#f59e0b',
    service: '#22c55e', creativity: '#8b5cf6', status: '#f97316',
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.yourValues}</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {[top1, top2].map((k, i) => (
            <div
              key={k}
              className="rounded-full px-4 py-1 text-lg font-bold text-white"
              style={{ backgroundColor: dimColors[k] }}
            >
              {i + 1}. {lb.dimNames[k]}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm">{lb.dimProfile}</h3>
        {sorted.map(key => {
          const pct = Math.round((scores[key] / maxPerDim) * 100)
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{lb.dimNames[key]}</span>
                <span>{scores[key]}</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lb.dimNames[key]}
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--muted, #e5e7eb)' }}
              >
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: dimColors[key] }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm">{lb.topValues}</h3>
        {[top1, top2].map(key => {
          const d = DIM_DATA[key][locale]
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: dimColors[key] }} />
                <span className="font-bold text-sm">{d.name}</span>
              </div>
              <p className="text-sm pl-5" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{d.description}</p>
              <p className="text-xs pl-5" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{lb.careers}: {d.careers.join(', ')}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border p-4 space-y-1" style={{ backgroundColor: 'var(--card, #fff)' }}>
        <h3 className="font-bold text-sm" style={{ color: '#16a34a' }}>{lb.suggestion}</h3>
        <p className="text-sm" style={{ color: 'var(--muted-foreground, #6b7280)' }}>{COMBO_SUGGESTIONS[locale](top1, top2)}</p>
      </div>

      <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
        <h3 className="font-bold text-sm" style={{ color: '#16a34a' }}>{lb.affirmation}</h3>
        <p className="text-sm" style={{ color: '#15803d' }}>"{COMBO_AFFIRMATIONS[locale](top1, top2)}"</p>
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
