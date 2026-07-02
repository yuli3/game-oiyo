import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type WellnessLevel = 'healthy' | 'caution' | 'improve' | 'dependent'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface LevelData {
  icon: string; color: string; title: string; subtitle: string; description: string; tips: string[]
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string; share: string; shareMsg: string
  yourLevel: string; scoreLabel: string; outOf: string; note: string
}> = {
  ko: {
    title: '디지털 웰니스 테스트',
    subtitle: '나는 스마트폰에 얼마나 의존하나?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 없다', '거의 없다', '가끔 있다', '자주 있다', '항상 그렇다'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 디지털 웰니스 수준은',
    yourLevel: '나의 디지털 건강 수준',
    scoreLabel: '디지털 의존 점수',
    outOf: '/ 75점',
    note: '이 테스트는 자기 이해를 위한 참고 자료입니다. 심각한 경우 전문가 상담을 권장합니다.',
  },
  en: {
    title: 'Digital Wellness Test',
    subtitle: 'How dependent are you on your smartphone?',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My digital wellness level is',
    yourLevel: 'Your Digital Wellness Level',
    scoreLabel: 'Digital Dependency Score',
    outOf: '/ 75',
    note: 'This test is for self-awareness. If symptoms are severe, professional consultation is recommended.',
  },
  ja: {
    title: 'デジタルウェルネステスト',
    subtitle: 'スマートフォンにどのくらい依存していますか？',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'ほとんどない', 'たまにある', 'よくある', 'いつもそうだ'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のデジタルウェルネスレベルは',
    yourLevel: 'あなたのデジタル健康レベル',
    scoreLabel: 'デジタル依存スコア',
    outOf: '/ 75点',
    note: 'このテストは自己理解のための参考情報です。症状が深刻な場合は専門家への相談をお勧めします。',
  },
}

const LEVEL_DATA: Record<WellnessLevel, Record<SupportedLang, LevelData>> = {
  healthy: {
    ko: {
      icon: '💚',
      color: '#22c55e',
      title: '디지털 건강',
      subtitle: '균형 잡힌 디지털 생활을 하고 있습니다',
      description: '스마트폰과 디지털 기기를 건강하게 사용하고 있습니다. 현재의 균형을 유지하는 것이 중요합니다.',
      tips: [
        '현재 습관을 유지하세요.',
        '주 1회 "스마트폰 없는 오후" 시간을 만들어 더욱 강화해 보세요.',
        '디지털과 오프라인 활동의 균형을 의식적으로 유지하세요.',
      ],
    },
    en: {
      icon: '💚',
      color: '#22c55e',
      title: 'Digitally Healthy',
      subtitle: 'You have a balanced digital lifestyle',
      description: 'You are using smartphones and digital devices in a healthy way. Maintaining your current balance is key.',
      tips: [
        'Keep up your current habits.',
        'Try scheduling one "screen-free afternoon" per week to strengthen further.',
        'Consciously maintain the balance between digital and offline activities.',
      ],
    },
    ja: {
      icon: '💚',
      color: '#22c55e',
      title: 'デジタル健康',
      subtitle: 'バランスの取れたデジタルライフを送っています',
      description: 'スマートフォンとデジタル機器を健康的に使っています。現在のバランスを維持することが重要です。',
      tips: [
        '現在の習慣を維持しましょう。',
        '週1回「スマートフォンなしの午後」を設けてさらに強化しましょう。',
        'デジタルとオフラインの活動のバランスを意識的に保ちましょう。',
      ],
    },
  },
  caution: {
    ko: {
      icon: '💛',
      color: '#eab308',
      title: '주의 필요',
      subtitle: '일부 디지털 습관을 개선할 여지가 있습니다',
      description: '디지털 기기 사용이 가끔 생활에 영향을 주고 있습니다. 몇 가지 습관을 점검해볼 시점입니다.',
      tips: [
        '취침 1시간 전 스마트폰 사용을 줄여보세요.',
        '알림을 중요한 것만 켜두고 나머지는 끄세요.',
        '식사 시간에는 스마트폰을 테이블에서 치워보세요.',
      ],
    },
    en: {
      icon: '💛',
      color: '#eab308',
      title: 'Caution Needed',
      subtitle: 'Some digital habits have room for improvement',
      description: 'Your device usage occasionally affects your daily life. It is a good time to review a few habits.',
      tips: [
        'Try reducing smartphone use in the hour before bed.',
        'Keep only important notifications on and mute the rest.',
        'Remove your phone from the table during meals.',
      ],
    },
    ja: {
      icon: '💛',
      color: '#eab308',
      title: '注意が必要',
      subtitle: '一部のデジタル習慣に改善の余地があります',
      description: 'デジタル機器の使用が時々日常生活に影響しています。いくつかの習慣を見直す時期です。',
      tips: [
        '就寝1時間前はスマートフォンの使用を減らしましょう。',
        '重要な通知だけオンにして残りはオフにしましょう。',
        '食事中はスマートフォンをテーブルから片付けましょう。',
      ],
    },
  },
  improve: {
    ko: {
      icon: '🧡',
      color: '#f97316',
      title: '개선 권장',
      subtitle: '디지털 사용이 생활에 영향을 미치고 있습니다',
      description: '스마트폰과 디지털 기기가 수면, 집중력, 대인관계 등 일상에 눈에 띄는 영향을 주고 있습니다. 적극적인 변화가 필요합니다.',
      tips: [
        '하루 스크린 타임 목표를 설정하세요.',
        '식사 시간과 대화 중에는 폰을 다른 방에 두세요.',
        '"심심한 시간"을 의도적으로 만들어 디지털 없이 쉬세요.',
      ],
    },
    en: {
      icon: '🧡',
      color: '#f97316',
      title: 'Improvement Recommended',
      subtitle: 'Digital use is noticeably affecting your life',
      description: 'Your smartphone and device usage is having noticeable effects on sleep, focus, and relationships. Active change is needed.',
      tips: [
        'Set a daily screen time goal and track it.',
        'Leave your phone in another room during meals and conversations.',
        'Intentionally create "boredom time" to rest without devices.',
      ],
    },
    ja: {
      icon: '🧡',
      color: '#f97316',
      title: '改善を推奨',
      subtitle: 'デジタル使用が生活に影響しています',
      description: 'スマートフォンやデジタル機器が睡眠、集中力、人間関係などに目立った影響を与えています。積極的な変化が必要です。',
      tips: [
        '1日のスクリーンタイム目標を設定しましょう。',
        '食事中や会話中はスマートフォンを別の部屋に置きましょう。',
        '「退屈な時間」を意図的に作ってデジタルなしで休みましょう。',
      ],
    },
  },
  dependent: {
    ko: {
      icon: '❤️',
      color: '#ef4444',
      title: '디지털 과의존',
      subtitle: '적극적인 디지털 습관 개선이 필요합니다',
      description: '디지털 기기 의존도가 매우 높아 일상생활의 여러 영역에 영향을 주고 있습니다. 체계적인 개선 전략이 필요합니다.',
      tips: [
        '앱 차단 도구나 스크린 타임 제한을 활용하세요.',
        '주말 반나절 디지털 디톡스를 시도해보세요.',
        '필요하다면 전문가 상담도 고려해 보세요.',
      ],
    },
    en: {
      icon: '❤️',
      color: '#ef4444',
      title: 'Digital Over-Dependence',
      subtitle: 'Active improvement of digital habits is necessary',
      description: 'Your device dependency is very high and is affecting multiple areas of daily life. A systematic improvement strategy is needed.',
      tips: [
        'Use app-blocking tools or screen time limits.',
        'Try a half-day digital detox on weekends.',
        'Consider professional counseling if needed.',
      ],
    },
    ja: {
      icon: '❤️',
      color: '#ef4444',
      title: 'デジタル過依存',
      subtitle: 'デジタル習慣の積極的な改善が必要です',
      description: 'デジタル機器への依存度が非常に高く、日常生活の複数の領域に影響しています。体系的な改善戦略が必要です。',
      tips: [
        'アプリブロックツールやスクリーンタイム制限を活用しましょう。',
        '週末に半日デジタルデトックスを試みましょう。',
        '必要であれば専門家への相談も検討しましょう。',
      ],
    },
  },
}

const QUESTIONS: Record<SupportedLang, string[]> = {
  ko: [
    '잠들기 직전까지 스마트폰을 사용한다',
    '알림이 오면 하던 일을 멈추고 즉시 확인한다',
    '스마트폰이 없으면 불안하거나 초조하다',
    'SNS를 보다가 자신도 모르게 1시간 이상이 지나 있다',
    '다른 사람들이 재미있는 것을 하고 있을까 봐 자꾸 SNS를 확인한다',
    '식사 중에도 스마트폰을 사용한다',
    '디지털 기기 없이 하루를 보내는 것이 어렵게 느껴진다',
    '화면을 오래 보고 나서 눈의 피로, 두통, 목 통증을 자주 경험한다',
    '중요한 대화 중에도 스마트폰 알림에 반응한다',
    '스마트폰 사용을 줄이려 했지만 잘 되지 않았다',
    '특별한 이유 없이 습관적으로 스마트폰을 꺼내 확인한다',
    '온라인에서 다른 사람의 삶과 나를 비교해 기분이 나빠진 적이 있다',
    '디지털 콘텐츠를 소비하는 데 너무 많은 시간을 쓴다고 느낀다',
    '취침 전 스마트폰 사용으로 수면의 질이 떨어진 것 같다',
    '"디지털 디톡스"를 해보고 싶다는 생각이 자주 든다',
  ],
  en: [
    'I use my smartphone right up until I fall asleep',
    'I stop what I am doing and check my phone immediately when a notification arrives',
    'I feel anxious or restless when I do not have my smartphone',
    'I lose track of time on social media and suddenly realize an hour has passed',
    'I keep checking social media out of fear of missing out on something fun',
    'I use my smartphone even during meals',
    'Spending an entire day without digital devices feels difficult',
    'I frequently experience eye strain, headaches, or neck pain after looking at screens for a long time',
    'I respond to smartphone notifications even during important conversations',
    'I have tried to reduce my smartphone use but found it difficult',
    'I habitually pull out my phone to check it for no particular reason',
    'Comparing my life to others online has made me feel bad about myself',
    'I feel like I spend too much time consuming digital content',
    'Using my smartphone before bed seems to be lowering my sleep quality',
    'I often find myself wanting to do a "digital detox"',
  ],
  ja: [
    '眠りにつく直前までスマートフォンを使う',
    '通知が来たらしていることを止めてすぐに確認する',
    'スマートフォンがないと不安や焦りを感じる',
    'SNSを見ていて気づいたら1時間以上経っている',
    '他の人が楽しいことをしているのではないかとSNSをしょっちゅう確認する',
    '食事中もスマートフォンを使う',
    'デジタル機器なしで一日を過ごすことが難しく感じる',
    '画面を長く見た後、眼の疲れ、頭痛、首の痛みをよく経験する',
    '重要な会話中もスマートフォンの通知に反応する',
    'スマートフォンの使用を減らそうとしたがうまくいかなかった',
    '特別な理由もなく習慣的にスマートフォンを取り出して確認する',
    'オンラインで他人の生活と自分を比較して気分が悪くなったことがある',
    'デジタルコンテンツを消費するのに時間を使いすぎていると感じる',
    '就寝前のスマートフォン使用で睡眠の質が下がっているようだ',
    '「デジタルデトックス」をしてみたいと思うことがよくある',
  ],
}

function calcLevel(score: number): WellnessLevel {
  if (score <= 30) return 'healthy'
  if (score <= 45) return 'caution'
  if (score <= 60) return 'improve'
  return 'dependent'
}

interface Props { locale?: string }

export default function DigitalWellnessTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp ?? 'ko')
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [done, setDone] = useState(false)

  function pick(val: number) {
    const next = [...answers, val]
    if (current + 1 >= questions.length) {
      setAnswers(next)
      setDone(true)
    } else {
      setAnswers(next)
      setCurrent(current + 1)
    }
  }

  function restart() { setAnswers([]); setCurrent(0); setDone(false) }

  function share() {
    const score = answers.reduce((s, v) => s + v, 0)
    const level = calcLevel(score)
    const url = window.location.href
    const text = `${lb.shareMsg} — ${LEVEL_DATA[level][l].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  if (!done) {
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
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
          >
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-bold">{questions[current]}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i + 1)}
              aria-label={label}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-emerald-400 transition-colors flex items-center gap-3"
            >
              <span className="w-6 h-6 rounded-full border-2 border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-600 flex-none">
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

  const score = answers.reduce((s, v) => s + v, 0)
  const level = calcLevel(score)
  const ld = LEVEL_DATA[level][l]
  const pct = Math.round(((score - 15) / 60) * 100)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourLevel}</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: ld.color }}
        >
          <span>{ld.icon}</span>
          <span>{ld.title}</span>
        </div>
        <p className="font-bold text-muted-foreground">{ld.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{ld.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold">{lb.scoreLabel}</span>
          <span className="text-lg font-bold" style={{ color: ld.color }}>{score} {lb.outOf}</span>
        </div>
        <div
          className="h-3 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={lb.scoreLabel}
        >
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: ld.color }} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm" style={{ color: ld.color }}>
          {lb.yourLevel}
        </h3>
        <ul className="space-y-1">
          {ld.tips.map(tip => (
            <li key={tip} className="text-sm text-muted-foreground flex gap-2">
              <span style={{ color: ld.color }}>→</span>{tip}
            </li>
          ))}
        </ul>
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
          className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
