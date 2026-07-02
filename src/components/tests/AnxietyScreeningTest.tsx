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
    title: '불안감 자가 점검 (GAD-7)',
    subtitle: '내 불안 수준 확인하기',
    screeningNote: '이 검사는 선별 도구이며 진단이 아닙니다. 불안이 일상을 방해한다면 전문가와 상담하세요.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 없음', '며칠 동안', '절반 이상', '거의 매일'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 불안 점검 결과',
    yourLevel: '나의 점검 결과',
    tips: '불안 완화에 도움이 되는 것들',
    resources: '전문 도움 받기',
    affirmation: '오늘의 메시지',
    scoreLabel: 'GAD-7 점수',
    outOf: '/ 21점',
    note: '이 결과는 의사나 정신건강 전문가의 진단을 대체하지 않습니다.',
    compassion: '불안을 느끼는 것은 매우 자연스러운 인간의 경험입니다. 지금 이 검사를 하는 것은 자신을 이해하려는 용감한 행동입니다.',
  },
  en: {
    title: 'Anxiety Screening (GAD-7)',
    subtitle: 'Check Your Anxiety Level',
    screeningNote: 'This is a screening tool, not a diagnosis. If anxiety is interfering with daily life, please consult a professional.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not at all', 'Several days', 'More than half', 'Nearly every day'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My anxiety screening result',
    yourLevel: 'Your Screening Result',
    tips: 'Things That Help With Anxiety',
    resources: 'Get Professional Support',
    affirmation: 'Today\'s Message',
    scoreLabel: 'GAD-7 Score',
    outOf: '/ 21',
    note: 'These results do not replace diagnosis by a doctor or mental health professional.',
    compassion: 'Feeling anxious is a very natural human experience. Taking this screening is a brave act of self-understanding.',
  },
  ja: {
    title: '不安スクリーニング (GAD-7)',
    subtitle: '不安レベルを確認する',
    screeningNote: 'これはスクリーニングツールであり、診断ではありません。不安が日常生活に支障をきたす場合は専門家に相談してください。',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', '数日間', '半分以上', 'ほぼ毎日'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '不安スクリーニングの結果',
    yourLevel: 'スクリーニング結果',
    tips: '不安を和らげるのに役立つこと',
    resources: '専門的サポートを受ける',
    affirmation: '今日のメッセージ',
    scoreLabel: 'GAD-7スコア',
    outOf: '/ 21点',
    note: 'この結果は医師や精神科専門家の診断に代わるものではありません。',
    compassion: '不安を感じることは非常に自然な人間の経験です。このスクリーニングを受けることは、自分を理解しようとする勇気ある行動です。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', text: '초조하거나, 불안하거나, 또는 과도하게 긴장된 느낌이 든다' },
    { id: 'q2', text: '걱정을 멈추거나 조절하기 어렵다' },
    { id: 'q3', text: '다양한 일들에 대해 과도하게 걱정한다' },
    { id: 'q4', text: '긴장을 풀거나 편안하게 있기가 어렵다' },
    { id: 'q5', text: '안절부절 못하거나 가만히 있지 못할 정도로 불안하다' },
    { id: 'q6', text: '짜증이 나거나 쉽게 화가 난다' },
    { id: 'q7', text: '무언가 끔찍한 일이 일어날 것 같은 두려움이 든다' },
  ],
  en: [
    { id: 'q1', text: 'Feeling nervous, anxious, or on edge' },
    { id: 'q2', text: 'Not being able to stop or control worrying' },
    { id: 'q3', text: 'Worrying too much about different things' },
    { id: 'q4', text: 'Trouble relaxing' },
    { id: 'q5', text: 'Being so restless that it\'s hard to sit still' },
    { id: 'q6', text: 'Becoming easily annoyed or irritable' },
    { id: 'q7', text: 'Feeling afraid, as if something awful might happen' },
  ],
  ja: [
    { id: 'q1', text: 'そわそわしたり、不安になったり、過度に緊張している' },
    { id: 'q2', text: '心配するのをやめたり、コントロールしたりするのが難しい' },
    { id: 'q3', text: 'さまざまなことについて過度に心配している' },
    { id: 'q4', text: 'リラックスしたり、落ち着いたりするのが難しい' },
    { id: 'q5', text: 'じっとしていられないほど落ち着きがない' },
    { id: 'q6', text: 'イライラしたり、怒りっぽくなっている' },
    { id: 'q7', text: '何か恐ろしいことが起きそうな恐怖を感じる' },
  ],
}

const RESULTS: Record<Level, Record<SupportedLang, ResultData>> = {
  minimal: {
    ko: {
      title: '최소 수준',
      subtitle: '불안 수준이 정상 범위 내에 있습니다',
      description: '현재 불안 수준은 낮습니다. 일상적인 긴장과 불안은 삶의 자연스러운 부분이며, 지금은 잘 조절되고 있는 것으로 보입니다.',
      tips: ['규칙적인 신체 활동 유지하기', '마음 챙김 또는 깊은 호흡 연습', '충분한 수면 확보하기', '카페인 섭취량 적절히 조절하기'],
      resources: ['정신건강 위기상담: 1577-0199', '자살예방상담전화: 1393', '정신건강복지센터 방문 상담'],
      affirmation: '일상의 불안을 잘 관리하고 있습니다. 자신에게 친절하게 대하는 것을 잊지 마세요.',
    },
    en: {
      title: 'Minimal',
      subtitle: 'Anxiety is within a normal range',
      description: 'Your anxiety level is currently low. Everyday tension and worry are natural parts of life, and yours appears well-managed right now.',
      tips: ['Maintain regular physical activity', 'Practice mindfulness or deep breathing', 'Prioritize quality sleep', 'Monitor caffeine intake'],
      resources: ['Crisis Text Line: Text HOME to 741741', 'SAMHSA Helpline: 1-800-662-4357', 'Psychology Today therapist finder'],
      affirmation: 'You\'re managing everyday anxiety well. Remember to be kind to yourself.',
    },
    ja: {
      title: '最小レベル',
      subtitle: '不安は正常な範囲内です',
      description: '現在の不安レベルは低いです。日常的な緊張や心配は人生の自然な部分であり、今はうまく管理されているようです。',
      tips: ['定期的な身体活動を維持する', 'マインドフルネスや深呼吸を練習する', '質の良い睡眠を確保する', 'カフェインの摂取量を管理する'],
      resources: ['こころの健康相談統一ダイヤル: 0570-064-556', 'よりそいホットライン: 0120-279-338', '精神保健福祉センター'],
      affirmation: '日常の不安をうまく管理しています。自分に優しくすることを忘れないでください。',
    },
  },
  mild: {
    ko: {
      title: '가벼운 불안',
      subtitle: '불안이 가끔 일상에 영향을 미치고 있습니다',
      description: '가벼운 불안은 매우 흔하며 여러 가지 방법으로 관리할 수 있습니다. 증상이 2주 이상 지속된다면 전문가 상담을 고려해보세요.',
      tips: ['복식 호흡: 4초 들이쉬고, 4초 참고, 6초 내쉬기', '점진적 근육 이완법 연습하기', '규칙적인 운동 (특히 유산소)', '걱정 일기 쓰기로 생각 정리하기', '수면 루틴 확립하기'],
      resources: ['정신건강 위기상담: 1577-0199', '자살예방상담전화: 1393', '지역 정신건강복지센터 무료 상담'],
      affirmation: '불안은 당신이 무언가를 소중히 여기고 있다는 신호이기도 합니다. 자신을 판단하지 말고, 친구를 대하듯 자신에게 친절하세요.',
    },
    en: {
      title: 'Mild Anxiety',
      subtitle: 'Anxiety occasionally affects your daily life',
      description: 'Mild anxiety is very common and manageable. If symptoms persist for more than two weeks, consider speaking with a professional.',
      tips: ['Box breathing: inhale 4s, hold 4s, exhale 6s', 'Practice progressive muscle relaxation', 'Regular aerobic exercise', 'Keep a worry journal to organize thoughts', 'Establish a consistent sleep routine'],
      resources: ['Crisis Text Line: Text HOME to 741741', 'SAMHSA Helpline: 1-800-662-4357', 'Psychology Today therapist finder'],
      affirmation: 'Anxiety can also be a signal that you care deeply about something. Don\'t judge yourself — treat yourself with the kindness you\'d give a friend.',
    },
    ja: {
      title: '軽度の不安',
      subtitle: '不安が時々日常生活に影響を与えています',
      description: '軽度の不安は非常に一般的で、様々な方法で管理できます。症状が2週間以上続く場合は、専門家への相談を検討してください。',
      tips: ['腹式呼吸: 4秒吸って、4秒止めて、6秒吐く', '漸進的筋弛緩法を練習する', '定期的な有酸素運動', '心配日記で思考を整理する', '一貫した睡眠ルーティンを確立する'],
      resources: ['こころの健康相談統一ダイヤル: 0570-064-556', 'よりそいホットライン: 0120-279-338', '精神保健福祉センター'],
      affirmation: '不安はあなたが何かを大切にしているサインでもあります。自分を責めず、友達に接するように自分に優しくしてください。',
    },
  },
  moderate: {
    ko: {
      title: '중등도 불안',
      subtitle: '전문가의 도움을 받는 것을 권장합니다',
      description: '중등도 불안은 일상 기능에 상당한 영향을 미치고 있습니다. 인지행동치료(CBT)나 약물치료가 효과적일 수 있습니다. 혼자 감당하려 하지 마세요.',
      tips: ['가능한 빨리 정신건강 전문가 상담 예약하기', 'CBT 기반 자조 앱 활용 (예: Woebot, Headspace)', '카페인, 알코올, 과도한 뉴스 소비 줄이기', '매일 같은 시간에 자고 일어나기'],
      resources: ['정신건강 위기상담: 1577-0199 (24시간)', '자살예방상담전화: 1393', '국가 정신건강정보포털: www.mentalhealth.go.kr', '지역 정신건강복지센터 (무료 상담)'],
      affirmation: '도움을 구하는 것은 용기 있는 행동입니다. 불안은 치료 가능하며, 당신은 더 편안해질 수 있습니다.',
    },
    en: {
      title: 'Moderate Anxiety',
      subtitle: 'Professional support is strongly recommended',
      description: 'Moderate anxiety is significantly affecting your daily functioning. CBT (cognitive behavioral therapy) or medication may help. You don\'t have to manage this alone.',
      tips: ['Schedule an appointment with a mental health professional soon', 'Try CBT-based self-help apps (e.g., Woebot, Headspace)', 'Reduce caffeine, alcohol, and excessive news consumption', 'Wake and sleep at consistent times daily'],
      resources: ['Crisis Text Line: Text HOME to 741741', 'SAMHSA Helpline: 1-800-662-4357 (24/7)', 'Anxiety and Depression Association of America: adaa.org', 'Open Path Collective (affordable therapy)'],
      affirmation: 'Seeking help is courageous. Anxiety is treatable, and you can feel more at ease.',
    },
    ja: {
      title: '中等度の不安',
      subtitle: '専門家のサポートを強くお勧めします',
      description: '中等度の不安は日常機能に相当な影響を与えています。認知行動療法（CBT）や薬物療法が効果的な場合があります。一人で抱え込まないでください。',
      tips: ['できるだけ早く精神科や心療内科に予約を入れる', 'CBTベースのアプリを活用する', 'カフェイン、アルコール、過剰なニュース消費を減らす', '毎日同じ時間に寝起きする'],
      resources: ['こころの健康相談統一ダイヤル: 0570-064-556', 'よりそいホットライン: 0120-279-338 (24時間)', '精神保健福祉センター', '精神科・心療内科への受診'],
      affirmation: '助けを求めることは勇気ある行動です。不安は治療可能で、あなたはより楽に感じることができます。',
    },
  },
  severe: {
    ko: {
      title: '심각한 수준',
      subtitle: '지금 바로 전문가의 도움을 받으세요',
      description: '심각한 불안은 삶의 질에 크게 영향을 미치고 있습니다. 이는 의학적 치료가 필요한 상태입니다. 전문가의 도움을 통해 반드시 나아질 수 있습니다.',
      tips: ['지금 즉시 정신건강 전문가에게 연락하거나 응급실 방문', '패닉 어택이 심각하다면 즉시 응급 지원 요청', '혼자 있지 말고 믿을 수 있는 사람 곁에 있기'],
      resources: ['정신건강 위기상담: 1577-0199 (24시간)', '자살예방상담전화: 1393', '응급: 119 또는 가까운 응급실'],
      affirmation: '극심한 불안을 느끼고 있는 지금도, 당신은 혼자가 아닙니다. 도움을 요청하는 것은 약함이 아닌 강함입니다.',
    },
    en: {
      title: 'Severe',
      subtitle: 'Please reach out for professional help now',
      description: 'Severe anxiety is significantly impacting your quality of life. This requires professional medical support. Help is available and you can get better.',
      tips: ['Contact a mental health professional immediately or go to an ER', 'If panic attacks are severe, seek emergency support', 'Don\'t be alone — stay with someone you trust'],
      resources: ['Crisis Text Line: Text HOME to 741741', 'National Anxiety Hotline: 1-800-522-4700', 'Emergency: 911 or nearest ER', 'SAMHSA Helpline: 1-800-662-4357 (24/7)'],
      affirmation: 'Even in the grip of severe anxiety, you are not alone. Asking for help is not weakness — it is strength.',
    },
    ja: {
      title: '重篤なレベル',
      subtitle: '今すぐ専門家に助けを求めてください',
      description: '重度の不安は生活の質に大きく影響しています。専門的な医療支援が必要な状態です。助けは必ずあり、あなたは良くなることができます。',
      tips: ['今すぐ精神科に連絡するか救急外来を受診する', 'パニック発作が深刻な場合は緊急サポートを求める', '一人でいないで信頼できる人のそばにいる'],
      resources: ['こころの健康相談統一ダイヤル: 0570-064-556', 'いのちの電話: 0120-783-556 (24時間)', 'よりそいホットライン: 0120-279-338', '緊急: 119または救急外来'],
      affirmation: '極度の不安を感じている今でも、あなたは一人ではありません。助けを求めることは弱さではなく強さです。',
    },
  },
}

interface Props { locale?: string }

export default function AnxietyScreeningTest({ locale: lp = 'ko' }: Props) {
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
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-800 text-center leading-relaxed">{lb.compassion}</p>
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
  const pct = Math.round((result.score / 21) * 100)
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
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
        <button onClick={restart} aria-label={lb.restart} className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors">{lb.restart}</button>
        <button onClick={share} aria-label={lb.share} className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity">{lb.share}</button>
      </div>
    </div>
  )
}
