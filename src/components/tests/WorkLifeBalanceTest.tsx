import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

type Domain = 'workDemand' | 'personalTime' | 'recovery' | 'meaning'
type OverallLevel = 'imbalanced' | 'strained' | 'developing' | 'balanced'

interface Question { id: string; text: string; domain: Domain; reversed?: boolean }

const DOMAIN_COLORS: Record<Domain, string> = {
  workDemand: '#ef4444',
  personalTime: '#3b82f6',
  recovery: '#22c55e',
  meaning: '#a855f7',
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; note: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string; share: string; shareMsg: string
  yourBalance: string; domainProfile: string
  overallLevel: string; guidance: string; attentionDomain: string
  scoreLabel: string; outOf: string
  domainNames: Record<Domain, string>
}> = {
  ko: {
    title: '일·생활 균형 테스트',
    subtitle: '나의 워라밸 점수는?',
    note: '이 테스트는 일과 삶의 균형을 탐색하는 자가 진단 도구입니다.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아님', '약간 아님', '보통', '약간 그럼', '매우 그럼'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 워라밸 점수',
    yourBalance: '나의 일·생활 균형',
    domainProfile: '영역별 균형 프로필',
    overallLevel: '전체 균형 수준',
    guidance: '균형을 위한 조언',
    attentionDomain: '가장 주의가 필요한 영역',
    scoreLabel: '워라밸 점수',
    outOf: '/ 80점',
    domainNames: {
      workDemand: '업무 부담',
      personalTime: '개인 시간',
      recovery: '회복력',
      meaning: '의미와 목적',
    },
  },
  en: {
    title: 'Work-Life Balance Test',
    subtitle: "What's Your Balance Score?",
    note: 'This is a self-assessment tool for exploring work-life balance.',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not at all', 'Slightly not', 'Neutral', 'Somewhat', 'Very much'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My work-life balance score',
    yourBalance: 'My Work-Life Balance',
    domainProfile: 'Balance Profile by Domain',
    overallLevel: 'Overall Balance Level',
    guidance: 'Guidance for Better Balance',
    attentionDomain: 'Domain Needing Most Attention',
    scoreLabel: 'Balance Score',
    outOf: '/ 80',
    domainNames: {
      workDemand: 'Work Demand',
      personalTime: 'Personal Time',
      recovery: 'Recovery',
      meaning: 'Meaning & Purpose',
    },
  },
  ja: {
    title: 'ワークライフバランステスト',
    subtitle: '私のバランススコアは？',
    note: 'このテストはワークライフバランスを探る自己診断ツールです。',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'あまりない', '普通', '少しある', 'とてもある'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のワークライフバランススコア',
    yourBalance: '仕事・生活のバランス',
    domainProfile: '領域別バランスプロフィール',
    overallLevel: '全体的なバランスレベル',
    guidance: 'バランス改善のアドバイス',
    attentionDomain: '最も注意が必要な領域',
    scoreLabel: 'バランススコア',
    outOf: '/ 80点',
    domainNames: {
      workDemand: '業務負担',
      personalTime: '個人時間',
      recovery: '回復力',
      meaning: '意味と目的',
    },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'w1', text: '일이 끝난 후에도 업무 생각이 머릿속을 떠나지 않는다', domain: 'workDemand', reversed: true },
    { id: 'w2', text: '업무 시간이 예상보다 훨씬 길어질 때가 많다', domain: 'workDemand', reversed: true },
    { id: 'w3', text: '일로 인한 스트레스가 가정생활이나 개인 시간에 영향을 준다', domain: 'workDemand', reversed: true },
    { id: 'w4', text: '쉬는 날에도 업무 연락을 확인하거나 응답해야 한다는 압박이 있다', domain: 'workDemand', reversed: true },
    { id: 'p1', text: '가족이나 친구와 의미 있는 시간을 충분히 보낼 수 있다', domain: 'personalTime' },
    { id: 'p2', text: '취미나 개인적 관심사에 시간을 투자한다', domain: 'personalTime' },
    { id: 'p3', text: '일 이외의 나만의 삶이 있다고 느낀다', domain: 'personalTime' },
    { id: 'p4', text: '스스로를 위한 즐거운 활동을 규칙적으로 한다', domain: 'personalTime' },
    { id: 'r1', text: '충분한 수면을 취하고 있다', domain: 'recovery' },
    { id: 'r2', text: '피로가 쌓여도 회복할 수 있는 시간이 있다', domain: 'recovery' },
    { id: 'r3', text: '주말이나 휴일에 진정한 휴식을 취할 수 있다', domain: 'recovery' },
    { id: 'r4', text: '일주일에 적어도 몇 번 신체 활동을 한다', domain: 'recovery' },
    { id: 'm1', text: '현재 하는 일이 의미 있다고 느낀다', domain: 'meaning' },
    { id: 'm2', text: '직업적 목표와 개인적 가치관이 일치한다', domain: 'meaning' },
    { id: 'm3', text: '일과 삶 모두에서 성장하고 있다고 느낀다', domain: 'meaning' },
    { id: 'm4', text: '미래에 대한 긍정적인 기대감이 있다', domain: 'meaning' },
  ],
  en: [
    { id: 'w1', text: 'After work ends, I can\'t stop thinking about work', domain: 'workDemand', reversed: true },
    { id: 'w2', text: 'Work hours often run much longer than expected', domain: 'workDemand', reversed: true },
    { id: 'w3', text: 'Work-related stress affects my home life or personal time', domain: 'workDemand', reversed: true },
    { id: 'w4', text: 'I feel pressure to check or respond to work messages even on days off', domain: 'workDemand', reversed: true },
    { id: 'p1', text: 'I spend meaningful time with family or friends', domain: 'personalTime' },
    { id: 'p2', text: 'I invest time in hobbies or personal interests', domain: 'personalTime' },
    { id: 'p3', text: 'I feel I have a personal life beyond work', domain: 'personalTime' },
    { id: 'p4', text: 'I regularly do enjoyable activities for myself', domain: 'personalTime' },
    { id: 'r1', text: 'I get enough sleep', domain: 'recovery' },
    { id: 'r2', text: 'Even when tired, I have time to recover', domain: 'recovery' },
    { id: 'r3', text: 'I can genuinely rest on weekends or holidays', domain: 'recovery' },
    { id: 'r4', text: 'I engage in physical activity at least a few times a week', domain: 'recovery' },
    { id: 'm1', text: 'I find my current work meaningful', domain: 'meaning' },
    { id: 'm2', text: 'My career goals align with my personal values', domain: 'meaning' },
    { id: 'm3', text: 'I feel I\'m growing in both work and personal life', domain: 'meaning' },
    { id: 'm4', text: 'I have a positive sense of anticipation about the future', domain: 'meaning' },
  ],
  ja: [
    { id: 'w1', text: '仕事が終わっても業務のことが頭から離れない', domain: 'workDemand', reversed: true },
    { id: 'w2', text: '勤務時間が予想よりはるかに長くなることが多い', domain: 'workDemand', reversed: true },
    { id: 'w3', text: '仕事のストレスが家庭生活や個人時間に影響する', domain: 'workDemand', reversed: true },
    { id: 'w4', text: '休日でも仕事の連絡を確認・返信しなければならないプレッシャーがある', domain: 'workDemand', reversed: true },
    { id: 'p1', text: '家族や友人と意義ある時間を十分に過ごせている', domain: 'personalTime' },
    { id: 'p2', text: '趣味や個人的な関心に時間を投資している', domain: 'personalTime' },
    { id: 'p3', text: '仕事以外の自分の生活があると感じる', domain: 'personalTime' },
    { id: 'p4', text: '自分のために楽しい活動を定期的に行っている', domain: 'personalTime' },
    { id: 'r1', text: '十分な睡眠が取れている', domain: 'recovery' },
    { id: 'r2', text: '疲れが溜まっても回復できる時間がある', domain: 'recovery' },
    { id: 'r3', text: '週末や休日に本当の休息が取れる', domain: 'recovery' },
    { id: 'r4', text: '週に少なくとも数回は身体活動をしている', domain: 'recovery' },
    { id: 'm1', text: '現在の仕事に意味を感じている', domain: 'meaning' },
    { id: 'm2', text: 'キャリアの目標と個人的な価値観が一致している', domain: 'meaning' },
    { id: 'm3', text: '仕事でも個人生活でも成長していると感じる', domain: 'meaning' },
    { id: 'm4', text: '将来に対してポジティブな期待感がある', domain: 'meaning' },
  ],
}

interface LevelData { title: string; subtitle: string; description: string; guidance: string[] }
const OVERALL_RESULTS: Record<OverallLevel, Record<SupportedLang, LevelData>> = {
  imbalanced: {
    ko: {
      title: '심각한 불균형',
      subtitle: '지금 일·생활 균형이 많이 무너진 상태입니다',
      description: '현재 일과 삶의 균형이 크게 무너져 있습니다. 이 상태가 지속되면 번아웃, 건강 문제, 관계 손상으로 이어질 수 있습니다. 지금 즉각적인 변화가 필요합니다.',
      guidance: ['업무 외 시간 최소 하나의 고정 "쉼" 시간 만들기', '현재 일정에서 제거할 수 있는 것 리스트업', '신뢰하는 사람이나 상담사와 현 상황 공유하기', '작은 회복 루틴부터 시작하기 (15분 산책, 조기 취침)'],
    },
    en: {
      title: 'Serious Imbalance',
      subtitle: 'Your work-life balance is significantly disrupted',
      description: 'Your work-life balance is significantly off right now. If this continues, it can lead to burnout, health problems, and relationship damage. Immediate change is needed.',
      guidance: ['Create at least one fixed "rest" period outside work hours', 'List what can be eliminated from your current schedule', 'Share your situation with a trusted person or counselor', 'Start with small recovery routines (15-min walk, earlier sleep)'],
    },
    ja: {
      title: '深刻な不均衡',
      subtitle: '仕事・生活のバランスが大きく崩れています',
      description: '現在、仕事と生活のバランスが大きく崩れています。この状態が続くと、バーンアウト、健康問題、関係の損傷につながる可能性があります。今すぐ変化が必要です。',
      guidance: ['勤務時間外に少なくとも一つの固定「休息」時間を作る', '現在のスケジュールから削除できるものをリストアップ', '信頼できる人やカウンセラーに現状を共有する', '小さな回復ルーティンから始める（15分の散歩、早めの就寝）'],
    },
  },
  strained: {
    ko: {
      title: '불안정한 균형',
      subtitle: '균형이 흔들리고 있습니다',
      description: '일과 삶의 균형이 불안정한 상태입니다. 어떤 영역은 괜찮지만 다른 영역이 부담이 되고 있습니다. 지금 의도적인 조정이 필요한 시점입니다.',
      guidance: ['가장 취약한 영역에 우선 집중하기', '매주 "균형 점검" 시간 10분 갖기', '회복에 도움이 되는 활동 하나를 일과에 추가하기', '디지털 기기 사용 시간 의도적으로 제한하기'],
    },
    en: {
      title: 'Strained Balance',
      subtitle: 'Your balance is wavering',
      description: 'Your work-life balance is unstable. Some areas are okay, but others are becoming a burden. Now is the time for intentional adjustment.',
      guidance: ['Focus first on your most vulnerable area', 'Have a 10-minute "balance check" each week', 'Add one recovery-supporting activity to your routine', 'Intentionally limit your digital device usage time'],
    },
    ja: {
      title: '不安定なバランス',
      subtitle: 'バランスが揺らいでいます',
      description: '仕事と生活のバランスが不安定な状態です。いくつかの領域は大丈夫ですが、他の領域が負担になっています。今、意図的な調整が必要な時期です。',
      guidance: ['最も脆弱な領域に優先的に集中する', '毎週「バランスチェック」の10分を持つ', '回復に役立つ活動を一つ日課に加える', 'デジタル機器の使用時間を意図的に制限する'],
    },
  },
  developing: {
    ko: {
      title: '발전 중인 균형',
      subtitle: '균형을 잡아가고 있습니다',
      description: '전반적으로 균형을 잡아가고 있지만, 아직 최적화의 여지가 있습니다. 지금의 방향은 맞습니다. 조금 더 세밀하게 조정하면 더 좋은 균형을 이룰 수 있습니다.',
      guidance: ['현재 잘 되고 있는 것들을 의식적으로 유지하기', '개선 여지가 있는 영역 하나씩 접근하기', '일과 삶 모두에서 "충분히 좋다"는 기준 설정하기', '자신의 에너지 패턴에 맞는 일정 최적화'],
    },
    en: {
      title: 'Developing Balance',
      subtitle: 'You are finding your balance',
      description: 'You\'re generally finding your balance, but there is still room for optimization. You\'re heading in the right direction. A bit more fine-tuning can achieve an even better balance.',
      guidance: ['Consciously maintain what is already working well', 'Approach areas with room for improvement one at a time', 'Set a "good enough" standard in both work and life', 'Optimize your schedule to match your energy patterns'],
    },
    ja: {
      title: '発展中のバランス',
      subtitle: 'バランスを取りつつあります',
      description: '全般的にバランスを取りつつありますが、まだ最適化の余地があります。今の方向性は正しいです。もう少し細かく調整すれば、より良いバランスを実現できます。',
      guidance: ['うまくいっていることを意識的に維持する', '改善余地のある領域に一つずつアプローチする', '仕事でも生活でも「十分に良い」の基準を設定する', '自分のエネルギーパターンに合ったスケジュールを最適化する'],
    },
  },
  balanced: {
    ko: {
      title: '균형 잡힌 삶',
      subtitle: '훌륭한 워라밸을 유지하고 있습니다',
      description: '현재 일과 삶의 균형이 건강하게 유지되고 있습니다. 이 균형을 지속적으로 의식하고 유지하는 것이 중요합니다. 변화하는 상황 속에서도 이 균형을 지켜나가세요.',
      guidance: ['현재 균형을 가능하게 하는 요소들을 파악하고 보호하기', '새로운 도전에 직면할 때 균형이 흔들리지 않도록 주의하기', '주변 사람들에게도 균형 잡힌 삶의 패턴 나누기', '정기적인 자기 점검으로 균형 모니터링'],
    },
    en: {
      title: 'Balanced Life',
      subtitle: 'You are maintaining excellent work-life balance',
      description: 'Your work-life balance is currently healthy and well-maintained. It\'s important to continue consciously maintaining this balance. Keep protecting it even as circumstances change.',
      guidance: ['Identify and protect the factors that make your current balance possible', 'Be careful not to let balance waver when facing new challenges', 'Share balanced life patterns with those around you', 'Use regular self-checks to monitor your balance'],
    },
    ja: {
      title: 'バランスの取れた生活',
      subtitle: '優れたワークライフバランスを維持しています',
      description: '現在、仕事と生活のバランスが健全に維持されています。このバランスを継続的に意識して維持することが重要です。状況が変わっても、このバランスを守り続けてください。',
      guidance: ['現在のバランスを可能にしている要素を把握して保護する', '新しい課題に直面したときもバランスが崩れないよう注意する', '周りの人々にもバランスの取れた生活パターンを共有する', '定期的な自己チェックでバランスをモニタリングする'],
    },
  },
}

interface Props { locale?: string }

export default function WorkLifeBalanceTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'en')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [domainScores, setDomainScores] = useState<Record<Domain, number>>({ workDemand: 0, personalTime: 0, recovery: 0, meaning: 0 })
  const [done, setDone] = useState(false)

  function pick(val: number) {
    const q = questions[current]
    const score = q.reversed ? (6 - (val + 1)) : (val + 1)
    const newScores = { ...domainScores, [q.domain]: domainScores[q.domain] + score }
    if (current + 1 >= questions.length) { setDomainScores(newScores); setDone(true) }
    else { setDomainScores(newScores); setCurrent(current + 1) }
  }

  function restart() { setDomainScores({ workDemand: 0, personalTime: 0, recovery: 0, meaning: 0 }); setCurrent(0); setDone(false) }

  function getLevel(total: number): OverallLevel {
    if (total >= 65) return 'balanced'
    if (total >= 50) return 'developing'
    if (total >= 35) return 'strained'
    return 'imbalanced'
  }

  function share() {
    const total = Object.values(domainScores).reduce((s, v) => s + v, 0)
    const level = getLevel(total)
    const url = window.location.href
    const text = `${lb.shareMsg} — ${OVERALL_RESULTS[level][locale].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url }).catch(() => {})
    else navigator.clipboard.writeText(url).catch(() => {})
  }

  if (!done) {
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
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: DOMAIN_COLORS[q.domain] }}
            />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full text-white mb-3 inline-block"
            style={{ backgroundColor: DOMAIN_COLORS[q.domain] }}
          >
            {lb.domainNames[q.domain]}
          </span>
          <p className="text-lg font-bold leading-snug mt-2">{q.text}</p>
        </div>
        <div className="grid gap-2" role="group" aria-label="Answer options">
          {lb.scaleLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              aria-label={label}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="w-7 h-7 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  const total = Object.values(domainScores).reduce((s, v) => s + v, 0)
  const level = getLevel(total)
  const r = OVERALL_RESULTS[level][locale]
  const maxPerDomain = 20
  const levelColor: Record<OverallLevel, string> = {
    imbalanced: '#ef4444',
    strained: '#f59e0b',
    developing: '#84cc16',
    balanced: '#22c55e',
  }
  const color = levelColor[level]
  const totalPct = Math.round((total / 80) * 100)

  // Find domain needing most attention (lowest score)
  const lowestDomain = (Object.keys(domainScores) as Domain[]).reduce((a, b) => domainScores[a] <= domainScores[b] ? a : b)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourBalance}</p>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
          role="status"
          aria-live="polite"
        >
          {r.title}
        </div>
        <p className="font-bold text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold">{lb.scoreLabel}</span>
          <span className="text-lg font-bold" style={{ color }}>{total} {lb.outOf}</span>
        </div>
        <div
          className="h-3 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={total}
          aria-valuemin={16}
          aria-valuemax={80}
          aria-label={lb.scoreLabel}
        >
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalPct}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <h3 className="font-bold text-sm">{lb.domainProfile}</h3>
        {(Object.keys(domainScores) as Domain[]).map(domain => {
          const pct = Math.round((domainScores[domain] / maxPerDomain) * 100)
          return (
            <div key={domain} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: DOMAIN_COLORS[domain] }}>{lb.domainNames[domain]}</span>
                <span>{domainScores[domain]}/{maxPerDomain}</span>
              </div>
              <div
                className="h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lb.domainNames[domain]}
              >
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: DOMAIN_COLORS[domain] }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-3">
        <span className="text-xs font-bold text-amber-800">{lb.attentionDomain}:</span>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full text-white"
          style={{ backgroundColor: DOMAIN_COLORS[lowestDomain] }}
        >
          {lb.domainNames[lowestDomain]}
        </span>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-800">{lb.guidance}</h3>
        <ul className="space-y-1">
          {r.guidance.map((g, i) => (
            <li key={i} className="text-sm text-emerald-900 flex gap-2">
              <span className="text-emerald-600 flex-none">→</span>{g}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-bold hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
