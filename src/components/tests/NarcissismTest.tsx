import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

type ResultKey = 'humble' | 'balanced' | 'confident' | 'high'

interface Question {
  id: string
  a: string
  b: string
  narcissistic: 'a' | 'b'
}

interface ResultData {
  title: string
  subtitle: string
  description: string
  traits: string[]
  tips: string[]
  note: string
  affirmation: string
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  chooseOne: string
  restart: string
  share: string
  shareMsg: string
  yourScore: string
  scoreLabel: string
  outOf: string
  traits: string
  tips: string
  warning: string
  affirmation: string
  disclaimer: string
}> = {
  ko: {
    title: '자기애 성향 테스트',
    subtitle: '나는 얼마나 자기중심적인가?',
    questionOf: (c, t) => `${c} / ${t}`,
    chooseOne: '더 가까운 설명을 선택하세요',
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 자기애 성향은',
    yourScore: '나의 자기애 점수',
    scoreLabel: '자기애 점수',
    outOf: '/ 16점',
    traits: '주요 특성',
    tips: '균형 잡기 팁',
    warning: '참고',
    affirmation: '오늘의 메시지',
    disclaimer: '이 테스트는 자기 이해를 위한 도구이며 임상 진단을 대체하지 않습니다.',
  },
  en: {
    title: 'Narcissism Trait Test',
    subtitle: 'How Self-Centered Are You?',
    questionOf: (c, t) => `${c} / ${t}`,
    chooseOne: 'Choose the statement that fits you better',
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My narcissism score is',
    yourScore: 'Your Narcissism Score',
    scoreLabel: 'Narcissism Score',
    outOf: '/ 16',
    traits: 'Key Traits',
    tips: 'Balancing Tips',
    warning: 'Note',
    affirmation: "Today's Message",
    disclaimer: 'This test is a self-awareness tool and does not replace clinical diagnosis.',
  },
  ja: {
    title: '自己愛傾向テスト',
    subtitle: '私はどれだけ自己中心的？',
    questionOf: (c, t) => `${c} / ${t}`,
    chooseOne: 'より当てはまる説明を選んでください',
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の自己愛スコアは',
    yourScore: '自己愛スコア',
    scoreLabel: '自己愛スコア',
    outOf: '/ 16点',
    traits: '主な特性',
    tips: 'バランスのヒント',
    warning: '注意',
    affirmation: '今日のメッセージ',
    disclaimer: 'このテストは自己理解のためのツールであり、臨床診断の代替ではありません。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'q1', a: '나는 지도자가 되기보다 따라가는 편이 편하다', b: '나는 천생 리더 타입이다', narcissistic: 'b' },
    { id: 'q2', a: '나는 칭찬받으면 약간 어색하다', b: '나는 칭찬받는 것을 즐기고 그럴 자격이 있다', narcissistic: 'b' },
    { id: 'q3', a: '나는 내 삶에 별로 영향력이 없다', b: '나는 내 주변 사람들에게 큰 영향을 미친다', narcissistic: 'b' },
    { id: 'q4', a: '나는 모두에게 평범한 사람이다', b: '나는 특별한 사람이라고 생각한다', narcissistic: 'b' },
    { id: 'q5', a: '나는 권력을 원하지 않는다', b: '권력이 있다면 세상을 더 잘 바꿀 수 있을 것 같다', narcissistic: 'b' },
    { id: 'q6', a: '나는 남들의 시선을 크게 신경 쓰지 않는다', b: '나는 사람들이 나를 어떻게 보는지 매우 신경 쓴다', narcissistic: 'b' },
    { id: 'q7', a: '나는 내가 원하는 것을 솔직히 말하기 어렵다', b: '나는 원하는 것을 얻는 방법을 안다', narcissistic: 'b' },
    { id: 'q8', a: '내 외모에는 별다른 자신감이 없다', b: '나는 외모에 꽤 신경 쓰고 자부심을 느낀다', narcissistic: 'b' },
    { id: 'q9', a: '나는 보통 사람 중 하나일 뿐이다', b: '나는 분명히 남들보다 뛰어난 부분이 있다', narcissistic: 'b' },
    { id: 'q10', a: '나는 결정을 내릴 때 남들의 의견을 많이 따른다', b: '나는 스스로 결정을 잘 내린다', narcissistic: 'b' },
    { id: 'q11', a: '나는 특별 대우를 받으려 하지 않는다', b: '나는 내가 특별 대우를 받을 자격이 있다고 생각한다', narcissistic: 'b' },
    { id: 'q12', a: '나는 다른 사람을 잘 조종하거나 설득하지 못한다', b: '나는 원하는 것을 얻기 위해 사람들을 설득할 수 있다', narcissistic: 'b' },
    { id: 'q13', a: '나는 존경받는 사람이 되고 싶다', b: '나는 두려움의 대상이 되는 것도 나쁘지 않다', narcissistic: 'b' },
    { id: 'q14', a: '나는 전시회 같은 곳에서 눈에 띄기 싫다', b: '나는 사람들의 주목을 받는 것이 좋다', narcissistic: 'b' },
    { id: 'q15', a: '나는 타인의 감정을 내 것처럼 느낀다', b: '나는 종종 내 목표가 가장 우선이라고 느낀다', narcissistic: 'b' },
    { id: 'q16', a: '나는 평범한 삶도 충분히 만족스럽다', b: '나는 위대한 성취를 이루고 싶다', narcissistic: 'b' },
  ],
  en: [
    { id: 'q1', a: "I'm more comfortable following than leading", b: "I'm a born leader", narcissistic: 'b' },
    { id: 'q2', a: 'I feel a bit awkward when praised', b: 'I enjoy compliments and feel I deserve them', narcissistic: 'b' },
    { id: 'q3', a: 'I have little influence over those around me', b: 'I have a big impact on the people in my life', narcissistic: 'b' },
    { id: 'q4', a: "I'm just an ordinary person to most people", b: 'I think of myself as a special person', narcissistic: 'b' },
    { id: 'q5', a: "I don't care much about having power", b: 'With power, I could change the world for the better', narcissistic: 'b' },
    { id: 'q6', a: "I don't pay much attention to others' opinions of me", b: "I care deeply about how others perceive me", narcissistic: 'b' },
    { id: 'q7', a: 'I find it hard to assert what I want', b: 'I know how to get what I want', narcissistic: 'b' },
    { id: 'q8', a: "I don't feel particularly confident about my appearance", b: 'I pay close attention to my looks and feel proud of them', narcissistic: 'b' },
    { id: 'q9', a: "I'm just one of many ordinary people", b: 'I clearly excel in certain areas compared to others', narcissistic: 'b' },
    { id: 'q10', a: "I rely heavily on others' input when deciding", b: 'I make decisions well on my own', narcissistic: 'b' },
    { id: 'q11', a: "I don't seek special treatment", b: 'I believe I deserve special treatment', narcissistic: 'b' },
    { id: 'q12', a: "I'm not good at persuading or influencing others", b: 'I can persuade people to get what I want', narcissistic: 'b' },
    { id: 'q13', a: 'I want to be someone who is respected', b: "Being feared isn't so bad either", narcissistic: 'b' },
    { id: 'q14', a: 'I prefer not to stand out in social settings', b: 'I enjoy being the center of attention', narcissistic: 'b' },
    { id: 'q15', a: "I feel others' emotions as if they were my own", b: "I often feel my goals come first", narcissistic: 'b' },
    { id: 'q16', a: 'An ordinary life is satisfying enough', b: 'I want to achieve great things', narcissistic: 'b' },
  ],
  ja: [
    { id: 'q1', a: 'リードするよりフォローする方が楽だ', b: '私は生まれつきリーダータイプだ', narcissistic: 'b' },
    { id: 'q2', a: '褒められるとちょっと照れる', b: '褒められることを楽しみ、それに値すると思う', narcissistic: 'b' },
    { id: 'q3', a: '周りの人に対する影響力はほとんどない', b: '周囲の人々に大きな影響を与えている', narcissistic: 'b' },
    { id: 'q4', a: 'ほとんどの人にとって普通の人だ', b: '自分は特別な人間だと思う', narcissistic: 'b' },
    { id: 'q5', a: '権力にはあまり興味がない', b: '権力があれば世界をより良く変えられる', narcissistic: 'b' },
    { id: 'q6', a: '他人の自分への見方はあまり気にしない', b: '他人が自分をどう見るかとても気にする', narcissistic: 'b' },
    { id: 'q7', a: '自分が望むことを主張するのが苦手だ', b: '欲しいものを手に入れる方法を知っている', narcissistic: 'b' },
    { id: 'q8', a: '外見にはあまり自信がない', b: '外見に気を使い誇りを持っている', narcissistic: 'b' },
    { id: 'q9', a: '自分はただの平凡な人間の一人だ', b: '他の人より明らかに優れた部分がある', narcissistic: 'b' },
    { id: 'q10', a: '決断する際は他人の意見に大きく頼る', b: '自分で上手く決断できる', narcissistic: 'b' },
    { id: 'q11', a: '特別扱いを求めない', b: '自分は特別扱いを受ける価値があると思う', narcissistic: 'b' },
    { id: 'q12', a: '他人を説得したり影響を与えるのが苦手だ', b: '欲しいものを得るために人を説得できる', narcissistic: 'b' },
    { id: 'q13', a: '尊敬される人になりたい', b: '恐れられることも悪くはない', narcissistic: 'b' },
    { id: 'q14', a: '社交の場では目立ちたくない', b: '注目を浴びるのが好きだ', narcissistic: 'b' },
    { id: 'q15', a: '他人の感情を自分のことのように感じる', b: '自分の目標が最優先だとよく感じる', narcissistic: 'b' },
    { id: 'q16', a: '平凡な生活で十分満足できる', b: '偉大な成果を成し遂げたい', narcissistic: 'b' },
  ],
}

const RESULTS: Record<ResultKey, Record<SupportedLang, ResultData>> = {
  humble: {
    ko: {
      title: '겸손한 성향', subtitle: '자기보다 타인을 먼저 생각합니다',
      description: '당신은 자기 자신보다 타인의 필요와 감정을 우선시하는 경향이 강합니다. 겸손하고 공감 능력이 뛰어나지만, 때로는 자신의 필요를 충분히 표현하지 못할 수 있습니다.',
      traits: ['강한 공감 능력', '타인 중심적 사고', '권력에 대한 낮은 욕구', '지나친 자기 비하 가능성'],
      tips: ['자신의 필요와 경계를 표현하는 연습', '자기 칭찬을 두려워하지 않기', '건강한 자기 확신 키우기'],
      note: '지나친 겸손은 자기 존중감 저하로 이어질 수 있습니다.',
      affirmation: '당신의 필요도 소중합니다. 자신을 먼저 돌보는 것은 이기적인 것이 아닙니다.',
    },
    en: {
      title: 'Humble Personality', subtitle: 'You put others before yourself',
      description: 'You tend to prioritize others\' needs and feelings over your own. You have strong empathy and humility, but you may sometimes struggle to express your own needs adequately.',
      traits: ['Strong empathy', 'Other-focused thinking', 'Low desire for power', 'Risk of excessive self-deprecation'],
      tips: ['Practice expressing your needs and boundaries', "Don't be afraid to praise yourself", 'Build healthy self-confidence'],
      note: 'Excessive humility can lead to reduced self-esteem over time.',
      affirmation: 'Your needs matter too. Taking care of yourself first is not selfish.',
    },
    ja: {
      title: '謙虚な性格', subtitle: '自分より他人を優先します',
      description: '自分よりも他者のニーズや感情を優先する傾向が強いです。共感力が高く謙虚ですが、自分のニーズを十分に表現できないことがあります。',
      traits: ['強い共感力', '他者中心の思考', '権力への欲求が低い', '過度な自己卑下のリスク'],
      tips: ['自分のニーズと境界を表現する練習', '自己称賛を恐れない', '健全な自己確信を育てる'],
      note: '過度な謙虚さは自尊心の低下につながる可能性があります。',
      affirmation: 'あなたのニーズも大切です。自分を最初に大切にすることは利己的ではありません。',
    },
  },
  balanced: {
    ko: {
      title: '균형 잡힌 자기애', subtitle: '건강한 자존감을 가지고 있습니다',
      description: '자기 자신을 충분히 존중하면서도 타인의 감정과 필요에 공감할 줄 압니다. 이 균형이 건강한 인간관계와 심리적 안정의 기반이 됩니다.',
      traits: ['건강한 자존감', '자기와 타인 모두에 대한 공감', '적절한 자기 표현', '유연한 대인 관계'],
      tips: ['현재의 균형을 의도적으로 유지하기', '스트레스 상황에서의 자기 인식 강화', '타인과의 건강한 경계 유지'],
      note: '균형 잡힌 자기애는 심리적 건강의 핵심 요소입니다.',
      affirmation: '당신은 자신을 사랑하면서도 타인을 배려할 줄 알고 있습니다. 그것이 진정한 강함입니다.',
    },
    en: {
      title: 'Balanced Self-Love', subtitle: 'You have a healthy sense of self-worth',
      description: 'You respect yourself while also empathizing with others\' feelings and needs. This balance is the foundation of healthy relationships and psychological stability.',
      traits: ['Healthy self-esteem', 'Empathy for self and others', 'Appropriate self-expression', 'Flexible interpersonal style'],
      tips: ['Intentionally maintain your current balance', 'Strengthen self-awareness under stress', 'Keep healthy boundaries with others'],
      note: 'Balanced self-love is a core element of psychological health.',
      affirmation: 'You know how to love yourself while still caring for others. That is true strength.',
    },
    ja: {
      title: 'バランスの取れた自己愛', subtitle: '健全な自己肯定感を持っています',
      description: '自分自身を十分に尊重しながら、他者の感情やニーズにも共感できます。このバランスが健全な人間関係と心理的安定の基盤となります。',
      traits: ['健全な自尊心', '自己と他者への共感', '適切な自己表現', '柔軟な対人関係'],
      tips: ['現在のバランスを意図的に維持する', 'ストレス下での自己認識を強化する', '他者との健全な境界を維持する'],
      note: 'バランスの取れた自己愛は心理的健康の核心要素です。',
      affirmation: '自分を愛しながら他者も思いやることができます。それが本当の強さです。',
    },
  },
  confident: {
    ko: {
      title: '자신감 있는 성향', subtitle: '강한 자기 확신과 리더십을 가집니다',
      description: '자신에 대한 강한 확신과 리더십을 발휘하는 편입니다. 목표 지향적이고 자기 표현이 뛰어나지만, 타인의 감정을 간과할 위험이 있습니다.',
      traits: ['강한 자기 확신', '뛰어난 리더십', '목표 지향적 사고', '타인 감정 간과 가능성'],
      tips: ['타인의 관점을 의식적으로 경청하는 습관', '칭찬과 공감을 더 많이 표현하기', '팀의 성공을 나의 성공으로 보는 시각'],
      note: '높은 자신감은 장점이지만, 공감 능력과 균형을 맞추는 것이 중요합니다.',
      affirmation: '당신의 자신감은 귀한 자산입니다. 그것을 타인을 위해 사용할 때 진정한 리더가 됩니다.',
    },
    en: {
      title: 'Self-Confident', subtitle: 'You have strong conviction and leadership',
      description: 'You tend to show strong self-belief and leadership. You are goal-oriented with excellent self-expression, but there is a risk of overlooking others\' emotions.',
      traits: ['Strong self-belief', 'Excellent leadership', 'Goal-oriented thinking', 'Risk of overlooking others\' feelings'],
      tips: ['Make a habit of consciously listening to others\' perspectives', 'Express more praise and empathy', "See the team's success as your own"],
      note: "High confidence is a strength, but balancing it with empathy is important.",
      affirmation: 'Your confidence is a precious asset. You become a true leader when you use it for others.',
    },
    ja: {
      title: '自信のある性格', subtitle: '強い自己確信とリーダーシップを持ちます',
      description: '自分への強い確信とリーダーシップを発揮する傾向があります。目標志向で自己表現が優れていますが、他者の感情を見落とすリスクがあります。',
      traits: ['強い自己確信', '優れたリーダーシップ', '目標志向の思考', '他者の感情を見落とすリスク'],
      tips: ['他者の視点を意識的に傾聴する習慣', '称賛と共感をより多く表現する', 'チームの成功を自分の成功と見る視点'],
      note: '高い自信は長所ですが、共感力とバランスを取ることが大切です。',
      affirmation: 'あなたの自信は貴重な資産です。他者のために使うとき、本当のリーダーになれます。',
    },
  },
  high: {
    ko: {
      title: '높은 자기애 성향', subtitle: '자기중심적 패턴이 강하게 나타납니다',
      description: '자기중심적 사고 패턴이 강하게 나타납니다. 이는 강한 동기부여와 목표 달성력의 원천이 될 수 있지만, 인간관계에서 갈등을 유발하거나 공감 능력이 낮게 평가될 수 있습니다.',
      traits: ['강한 자기중심적 사고', '특권 의식', '타인 조종 경향', '낮은 공감 반응'],
      tips: ['타인의 시각에서 상황을 이해하는 연습', '감정적 공감 능력 개발', '자기 비판을 위협이 아닌 성장 기회로 보기', '전문 심리 상담 고려'],
      note: '이 결과는 성격의 일부를 반영할 뿐이며, 변화는 언제나 가능합니다.',
      affirmation: '자신을 사랑하는 것과 타인을 배려하는 것은 서로 충돌하지 않습니다. 둘 다 가능합니다.',
    },
    en: {
      title: 'High Narcissism Tendency', subtitle: 'Self-centered patterns are prominent',
      description: 'You show strong self-centered thinking patterns. This can fuel powerful motivation and goal achievement, but it may also cause relationship conflicts or lead others to see you as low in empathy.',
      traits: ['Strong self-centered thinking', 'Sense of entitlement', 'Tendency to manipulate others', 'Low empathic response'],
      tips: ['Practice understanding situations from others\' perspectives', 'Develop emotional empathy skills', 'See self-criticism as growth, not a threat', 'Consider professional counseling'],
      note: 'This result reflects only part of your personality, and change is always possible.',
      affirmation: 'Loving yourself and caring for others are not in conflict. Both are possible.',
    },
    ja: {
      title: '高い自己愛傾向', subtitle: '自己中心的なパターンが強く現れます',
      description: '自己中心的な思考パターンが強く現れます。強い動機付けや目標達成力の源になり得ますが、人間関係での衝突や共感力の低さとして評価されることがあります。',
      traits: ['強い自己中心的思考', '特権意識', '他者を操作する傾向', '低い共感反応'],
      tips: ['他者の視点から状況を理解する練習', '感情的共感力を開発する', '自己批判を成長の機会として捉える', '専門的なカウンセリングを検討する'],
      note: 'この結果は性格の一部を反映するだけであり、変化はいつでも可能です。',
      affirmation: '自分を愛することと他者を思いやることは矛盾しません。どちらも可能です。',
    },
  },
}

function getResultKey(score: number): ResultKey {
  if (score <= 5) return 'humble'
  if (score <= 10) return 'balanced'
  if (score <= 13) return 'confident'
  return 'high'
}

interface Props { locale?: string }

export default function NarcissismTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp ?? 'ko')
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  function pick(choice: 'a' | 'b') {
    const q = questions[current]
    const gained = q.narcissistic === choice ? 1 : 0
    const newScore = score + gained
    if (current + 1 >= questions.length) {
      setScore(newScore)
      setDone(true)
    } else {
      setScore(newScore)
      setCurrent(current + 1)
    }
  }

  function restart() { setCurrent(0); setScore(0); setDone(false) }

  function share() {
    const url = window.location.href
    const key = getResultKey(score)
    const text = `${lb.shareMsg} — ${RESULTS[key][l].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
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
            aria-label={lb.questionOf(current + 1, questions.length)}
          >
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className="text-center text-sm font-medium text-muted-foreground">{lb.chooseOne}</p>
        <div className="grid gap-3">
          {(['a', 'b'] as const).map((choice) => (
            <button
              key={choice}
              onClick={() => pick(choice)}
              aria-label={choice === 'a' ? q.a : q.b}
              className="w-full rounded-xl border bg-card px-5 py-4 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors"
            >
              <span className="font-bold text-primary mr-2">{choice.toUpperCase()}.</span>
              {choice === 'a' ? q.a : q.b}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.disclaimer}</p>
      </div>
    )
  }

  const key = getResultKey(score)
  const r = RESULTS[key][l]
  const pct = Math.round((score / 16) * 100)
  const levelColor = key === 'high' ? '#ef4444' : key === 'confident' ? '#f59e0b' : key === 'balanced' ? '#22c55e' : '#6366f1'

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourScore}</p>
        <div className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white" style={{ backgroundColor: levelColor }}>{r.title}</div>
        <p className="font-medium text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{lb.scoreLabel}</span>
          <span className="text-lg font-bold" style={{ color: levelColor }}>{score} {lb.outOf}</span>
        </div>
        <div
          className="h-3 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={lb.scoreLabel}
        >
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: levelColor }} />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{lb.traits}</h3>
        <ul className="space-y-1">{r.traits.map(t => <li key={t} className="text-sm text-muted-foreground flex gap-2"><span>•</span>{t}</li>)}</ul>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-green-600">{lb.tips}</h3>
        <ul className="space-y-1">{r.tips.map(t => <li key={t} className="text-sm text-muted-foreground flex gap-2"><span className="text-green-500">→</span>{t}</li>)}</ul>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-amber-700">{lb.warning}</h3>
        <p className="text-sm text-amber-700">{r.note}</p>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.affirmation}</h3>
        <p className="text-sm">"{r.affirmation}"</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.disclaimer}</p>
      <div className="flex gap-3">
        <button onClick={restart} aria-label={lb.restart} className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">{lb.restart}</button>
        <button onClick={share} aria-label={lb.share} className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">{lb.share}</button>
      </div>
    </div>
  )
}
