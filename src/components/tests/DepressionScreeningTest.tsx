import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type Level = 'minimal' | 'mild' | 'moderate' | 'severe'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

interface Question { id: string; text: string }
interface ResultData {
  title: string; subtitle: string; description: string
  tips: string[]; resources: string[]; affirmation: string
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; screeningNote: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string]
  restart: string; share: string; shareMsg: string
  yourLevel: string; tips: string; resources: string
  affirmation: string; scoreLabel: string; outOf: string
  note: string; compassion: string
}> = {
  ko: {
    title: '우울감 자가 점검 (PHQ-9)',
    subtitle: '내 마음 상태 확인하기',
    screeningNote: '이 검사는 선별 도구이며 진단이 아닙니다. 결과와 관계없이 마음이 힘들다면 전문가와 상담하세요.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 없음', '며칠 동안', '절반 이상', '거의 매일'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 우울감 점검 결과',
    yourLevel: '나의 점검 결과',
    tips: '도움이 되는 것들',
    resources: '전문 도움 받기',
    affirmation: '오늘의 메시지',
    scoreLabel: 'PHQ-9 점수',
    outOf: '/ 27점',
    note: '이 결과는 의사나 정신건강 전문가의 진단을 대체하지 않습니다.',
    compassion: '지금 이 검사를 하고 있다는 것 자체가 자신을 돌보려는 용기 있는 행동입니다.',
  },
  en: {
    title: 'Depression Screening (PHQ-9)',
    subtitle: 'Check Your Mental State',
    screeningNote: 'This is a screening tool, not a diagnosis. Whatever your result, please reach out to a professional if you\'re struggling.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not at all', 'Several days', 'More than half', 'Nearly every day'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My depression screening result',
    yourLevel: 'Your Screening Result',
    tips: 'Things That Help',
    resources: 'Get Professional Support',
    affirmation: 'Today\'s Message',
    scoreLabel: 'PHQ-9 Score',
    outOf: '/ 27',
    note: 'These results do not replace diagnosis by a doctor or mental health professional.',
    compassion: 'Taking this screening is itself a courageous act of self-care.',
  },
  ja: {
    title: 'うつ病スクリーニング (PHQ-9)',
    subtitle: '心の状態を確認する',
    screeningNote: 'これはスクリーニングツールであり、診断ではありません。結果に関係なく、辛いと感じたら専門家に相談してください。',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', '数日間', '半分以上', 'ほぼ毎日'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: 'うつ病スクリーニングの結果',
    yourLevel: 'スクリーニング結果',
    tips: '役立つこと',
    resources: '専門的サポートを受ける',
    affirmation: '今日のメッセージ',
    scoreLabel: 'PHQ-9スコア',
    outOf: '/ 27点',
    note: 'この結果は医師や精神科専門家の診断に代わるものではありません。',
    compassion: 'このスクリーニングを受けることは、自分を大切にする勇気ある行動です。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', text: '일을 하는 것에 대한 흥미나 즐거움이 거의 없다' },
    { id: 'q2', text: '기분이 가라앉거나, 우울하거나, 희망이 없다고 느낀다' },
    { id: 'q3', text: '잠들기 어렵거나, 자주 깨거나, 너무 많이 잔다' },
    { id: 'q4', text: '피곤하거나 에너지가 거의 없다고 느낀다' },
    { id: 'q5', text: '식욕이 거의 없거나 반대로 과식을 한다' },
    { id: 'q6', text: '자신이 나쁜 사람이라고 느끼거나, 자신을 실패자라고 생각하거나, 자신 또는 가족을 실망시켰다고 느낀다' },
    { id: 'q7', text: '신문 읽기나 TV 보기 같은 일상적인 일에 집중하기 어렵다' },
    { id: 'q8', text: '다른 사람들이 알아챌 정도로 움직임이나 말이 느려졌거나, 반대로 너무 안절부절하고 들떠 있다' },
    { id: 'q9', text: '죽는 것이 낫겠다거나 어떤 방식으로든 자해를 하고 싶다는 생각이 든다' },
  ],
  en: [
    { id: 'q1', text: 'Little interest or pleasure in doing things' },
    { id: 'q2', text: 'Feeling down, depressed, or hopeless' },
    { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much' },
    { id: 'q4', text: 'Feeling tired or having little energy' },
    { id: 'q5', text: 'Poor appetite or overeating' },
    { id: 'q6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down' },
    { id: 'q7', text: 'Trouble concentrating on things, such as reading or watching TV' },
    { id: 'q8', text: 'Moving or speaking so slowly that other people could have noticed; or the opposite — being so fidgety or restless' },
    { id: 'q9', text: 'Thoughts that you would be better off dead, or of hurting yourself' },
  ],
  ja: [
    { id: 'q1', text: '物事に対する興味や楽しみがほとんどない' },
    { id: 'q2', text: '気分が落ち込んでいる、憂うつ、または絶望的だと感じる' },
    { id: 'q3', text: '眠れない、途中で目が覚める、または眠りすぎる' },
    { id: 'q4', text: '疲れを感じたり、気力がほとんどない' },
    { id: 'q5', text: '食欲がほとんどない、または食べすぎる' },
    { id: 'q6', text: '自分をダメな人間だと思う、または自分や家族を失望させたと感じる' },
    { id: 'q7', text: '読書やテレビを見るなど、物事に集中することが難しい' },
    { id: 'q8', text: '他の人が気付くほど動作や言葉が遅くなった、またはその逆に落ち着きがなくなった' },
    { id: 'q9', text: '死んだほうがましだ、または自分を傷つけたいという気持ちがある' },
  ],
}

const RESULTS: Record<Level, Record<SupportedLang, ResultData>> = {
  minimal: {
    ko: {
      title: '최소 수준',
      subtitle: '현재 우울감이 최소한으로 나타나고 있습니다',
      description: '지금 이 순간 우울감은 낮은 수준입니다. 하지만 정신 건강은 늘 변할 수 있으며, 힘들 때는 언제든 도움을 구하는 것이 자연스럽고 용감한 일임을 기억하세요.',
      tips: ['규칙적인 수면과 식사 유지하기', '자신에게 친절하게 대하기', '즐거운 활동 꾸준히 하기', '신뢰할 수 있는 사람과 대화하기'],
      resources: ['정신건강 위기상담 전화: 1577-0199', '자살예방상담전화: 1393 (24시간)', '정신건강복지센터 방문 상담'],
      affirmation: '지금 잘 지내고 있는 당신을 응원합니다. 자신을 돌보는 것은 언제나 가장 중요한 일입니다.',
    },
    en: {
      title: 'Minimal',
      subtitle: 'Depression symptoms are at a minimal level',
      description: 'Your depression indicators are currently low. Remember that mental health can shift, and reaching out for help is always a natural and courageous act.',
      tips: ['Maintain regular sleep and meals', 'Practice self-compassion', 'Keep enjoyable activities in your life', 'Connect with someone you trust'],
      resources: ['Crisis Text Line: Text HOME to 741741', 'National Suicide Prevention Lifeline: 988', 'Find a therapist: Psychology Today directory'],
      affirmation: 'Checking in with yourself is an act of wisdom. You\'re doing well by taking care of your mental health.',
    },
    ja: {
      title: '最小レベル',
      subtitle: 'うつ症状は最小限です',
      description: '現在うつの指標は低い水準です。心の健康はいつでも変わり得るものです。困ったときは躊躇わず助けを求めることを覚えておいてください。',
      tips: ['規則正しい睡眠と食事を維持する', '自分に優しくする', '楽しい活動を続ける', '信頼できる人と話す'],
      resources: ['こころの健康相談統一ダイヤル: 0570-064-556', 'いのちの電話: 0120-783-556', '精神保健福祉センターへの相談'],
      affirmation: '自分の心の状態を確認することは賢明な行動です。あなたは自分をよく大切にしています。',
    },
  },
  mild: {
    ko: {
      title: '가벼운 우울',
      subtitle: '가벼운 수준의 우울감이 나타나고 있습니다',
      description: '가벼운 우울감은 매우 흔한 경험입니다. 이 시점에 자신을 돌보는 것이 중요합니다. 증상이 2주 이상 지속된다면 전문가 상담을 고려해보세요.',
      tips: ['하루 30분 이상 햇빛 받으며 걷기', '소셜 미디어 사용 시간 줄이기', '작은 성취감을 줄 수 있는 활동 찾기', '충분한 수면 (7-9시간) 확보하기', '커피와 알코올 줄이기'],
      resources: ['정신건강 위기상담 전화: 1577-0199', '자살예방상담전화: 1393 (24시간)', '지역 정신건강복지센터 무료 상담 가능'],
      affirmation: '가벼운 우울감을 느끼는 것은 나약함이 아닙니다. 지금 이 감정을 인식하고 있다는 것만으로도 이미 용감한 첫걸음입니다.',
    },
    en: {
      title: 'Mild Depression',
      subtitle: 'Mild depressive symptoms are present',
      description: 'Mild depression is a very common experience. This is an important time to tend to yourself. If symptoms persist for more than two weeks, consider speaking with a professional.',
      tips: ['Walk in sunlight for 30+ minutes daily', 'Reduce social media usage', 'Find activities that give small accomplishments', 'Prioritize 7-9 hours of sleep', 'Limit caffeine and alcohol'],
      resources: ['Crisis Text Line: Text HOME to 741741', 'SAMHSA Helpline: 1-800-662-4357', 'Psychology Today therapist finder'],
      affirmation: 'Feeling mildly depressed doesn\'t mean you\'re weak. Noticing this feeling is already the first brave step.',
    },
    ja: {
      title: '軽度のうつ',
      subtitle: '軽度のうつ症状が見られます',
      description: '軽度のうつは非常によくある経験です。今、自分を大切にすることが重要です。症状が2週間以上続く場合は、専門家への相談を検討してください。',
      tips: ['毎日30分以上日光を浴びながら歩く', 'SNSの使用時間を減らす', '小さな達成感を得られる活動を見つける', '7〜9時間の十分な睡眠を確保する', 'カフェインとアルコールを控える'],
      resources: ['こころの健康相談統一ダイヤル: 0570-064-556', 'よりそいホットライン: 0120-279-338', '精神保健福祉センター'],
      affirmation: '軽いうつを感じることは弱さではありません。この感情に気づいていることが、すでに勇気ある最初の一歩です。',
    },
  },
  moderate: {
    ko: {
      title: '중등도 우울',
      subtitle: '전문가의 도움을 받는 것을 권장합니다',
      description: '중등도 우울은 일상 기능에 영향을 미치는 수준입니다. 혼자 견디려 하지 마세요. 전문가의 도움을 받는 것은 매우 용기 있고 현명한 선택입니다.',
      tips: ['가능한 빨리 정신건강 전문가 상담 예약', '신뢰하는 가족이나 친구에게 솔직하게 털어놓기', '하루의 루틴을 최소한으로라도 유지하기', '음식과 수분 섭취에 주의 기울이기'],
      resources: ['정신건강 위기상담 전화: 1577-0199 (24시간)', '자살예방상담전화: 1393 (24시간)', '국가 정신건강정보포털: www.mentalhealth.go.kr', '지역 정신건강복지센터 (무료 상담 가능)'],
      affirmation: '도움을 요청하는 것은 약함이 아니라 강함의 표시입니다. 당신은 더 나아질 수 있습니다.',
    },
    en: {
      title: 'Moderate Depression',
      subtitle: 'Professional support is strongly recommended',
      description: 'Moderate depression affects daily functioning. Please don\'t try to cope alone. Seeking professional help is a courageous and wise choice.',
      tips: ['Schedule an appointment with a mental health professional as soon as possible', 'Open up to a trusted family member or friend', 'Maintain a minimal daily routine', 'Pay attention to eating and staying hydrated'],
      resources: ['Crisis Text Line: Text HOME to 741741', 'National Suicide Prevention Lifeline: 988', 'SAMHSA Helpline: 1-800-662-4357 (24/7)', 'Open Path Collective (affordable therapy)'],
      affirmation: 'Asking for help is not weakness — it is strength. You can get better.',
    },
    ja: {
      title: '中等度のうつ',
      subtitle: '専門家のサポートを強くお勧めします',
      description: '中等度のうつは日常機能に影響を及ぼすレベルです。一人で耐えようとしないでください。専門家の助けを求めることは非常に勇気ある賢明な選択です。',
      tips: ['できるだけ早く精神科や心療内科に予約を入れる', '信頼できる家族や友人に正直に打ち明ける', '最低限の日課を維持する', '食事と水分摂取に注意する'],
      resources: ['こころの健康相談統一ダイヤル: 0570-064-556', 'いのちの電話: 0120-783-556 (24時間)', 'よりそいホットライン: 0120-279-338', '精神科・心療内科への受診'],
      affirmation: '助けを求めることは弱さではなく強さです。あなたは良くなることができます。',
    },
  },
  severe: {
    ko: {
      title: '심각한 수준',
      subtitle: '지금 바로 전문가의 도움을 받으세요',
      description: '지금 당신이 느끼는 것이 정말 힘들다는 것을 압니다. 심각한 수준의 우울은 의학적 치료가 필요한 상태입니다. 혼자 감당하지 않아도 됩니다. 지금 당장 전문가나 위기 지원 서비스에 연락하세요.',
      tips: ['지금 즉시 전문가에게 연락하거나 응급실 방문', '혼자 있지 말고 믿을 수 있는 사람 곁에 있기', '자해나 자살에 대한 생각이 있다면 즉시 위기 전화 이용'],
      resources: ['자살예방상담전화: 1393 (24시간, 무료)', '정신건강 위기상담: 1577-0199', '응급: 119 또는 가까운 응급실', '정신건강복지센터 위기 개입 서비스'],
      affirmation: '지금 이 순간 이 검사를 하고 있다는 것은 삶을 향한 당신의 의지입니다. 당신은 혼자가 아닙니다. 도움은 가까이에 있습니다.',
    },
    en: {
      title: 'Severe',
      subtitle: 'Please reach out for help right now',
      description: 'I know how hard what you\'re feeling right now is. Severe depression is a medical condition that requires treatment. You don\'t have to carry this alone. Please contact a professional or crisis support service right now.',
      tips: ['Contact a professional immediately or go to an emergency room', 'Don\'t be alone — stay with someone you trust', 'If you\'re having thoughts of self-harm or suicide, use a crisis line immediately'],
      resources: ['National Suicide Prevention Lifeline: 988 (24/7)', 'Crisis Text Line: Text HOME to 741741', 'Emergency: 911 or nearest ER', 'SAMHSA Helpline: 1-800-662-4357 (24/7)'],
      affirmation: 'The fact that you\'re taking this screening right now shows your will to live. You are not alone. Help is near.',
    },
    ja: {
      title: '重篤なレベル',
      subtitle: '今すぐ専門家に助けを求めてください',
      description: '今あなたが感じていることがどれほど辛いか、分かります。重度のうつは治療が必要な医療状態です。一人で抱え込まなくていいのです。今すぐ専門家または危機サポートサービスに連絡してください。',
      tips: ['すぐに専門家に連絡するか救急外来を受診する', '一人でいないで、信頼できる人のそばにいる', '自傷や自殺の考えがある場合は今すぐ危機ダイヤルを使う'],
      resources: ['いのちの電話: 0120-783-556 (24時間)', 'よりそいホットライン: 0120-279-338', '緊急: 119または救急外来', '精神科・心療内科への緊急受診'],
      affirmation: '今このスクリーニングを受けていること自体が、生きようとするあなたの意志です。あなたは一人ではありません。助けはすぐそこにあります。',
    },
  },
}

interface Props { locale?: string }

export default function DepressionScreeningTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'ko')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ level: Level; score: number } | null>(null)

  function calcResult(ans: number[]): { level: Level; score: number } {
    const score = ans.reduce((s, v) => s + v, 0)
    const level: Level = score >= 15 ? 'severe' : score >= 10 ? 'moderate' : score >= 5 ? 'mild' : 'minimal'
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-800 text-center leading-relaxed">{lb.compassion}</p>
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
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">{lb.questionOf(current + 1, questions.length)}</p>
          <p className="text-lg font-medium leading-relaxed">{q.text}</p>
          <p className="text-xs text-muted-foreground mt-3">{lb.screeningNote.split('.')[0]}.</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              aria-label={`${label} (${i}점)`}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
            >
              <span className="w-7 h-7 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">{i}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.screeningNote}</p>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result.level][locale]
  const pct = Math.round((result.score / 27) * 100)
  const levelColors: Record<Level, string> = {
    minimal: '#22c55e',
    mild: '#84cc16',
    moderate: '#f59e0b',
    severe: '#ef4444',
  }
  const levelColor = levelColors[result.level]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
        <div className="inline-block rounded-2xl px-5 py-2 text-xl font-bold text-white" style={{ backgroundColor: levelColor }}>{r.title}</div>
        <p className="font-medium text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{lb.scoreLabel}</span>
          <span className="text-lg font-bold" style={{ color: levelColor }}>{result.score} {lb.outOf}</span>
        </div>
        <div
          className="h-3 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={lb.scoreLabel}
        >
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: levelColor }} />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-700">{lb.tips}</h3>
        <ul className="space-y-1">
          {r.tips.map(tip => (
            <li key={tip} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-500 flex-none">→</span>{tip}
            </li>
          ))}
        </ul>
      </div>
      {(result.level === 'moderate' || result.level === 'severe') && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <h3 className="font-bold text-sm text-red-700">{lb.resources}</h3>
          <ul className="space-y-1">
            {r.resources.map(res => (
              <li key={res} className="text-sm text-red-700 flex gap-2">
                <span className="flex-none">•</span>{res}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(result.level === 'minimal' || result.level === 'mild') && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
          <h3 className="font-bold text-sm text-emerald-700">{lb.resources}</h3>
          <ul className="space-y-1">
            {r.resources.map(res => (
              <li key={res} className="text-sm text-emerald-700 flex gap-2">
                <span className="flex-none">•</span>{res}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-bold text-sm text-primary">{lb.affirmation}</h3>
        <p className="text-sm leading-relaxed">"{r.affirmation}"</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors"
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
