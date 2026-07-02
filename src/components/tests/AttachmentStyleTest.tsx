import { useState } from 'react'
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
type AttachmentType = 'secure' | 'anxious' | 'avoidant' | 'fearful'
type Scores = Record<AttachmentType, number>
type Locale = 'ko' | 'en' | 'ja'

interface Option { text: string; type: AttachmentType }
interface Question { id: string; text: string; options: Option[] }
interface ResultData {
  title: string
  subtitle: string
  description: string
  traits: string[]
  strengths: string[]
  challenges: string[]
  advice: string
  relationships: string
}

const TYPE_COLORS: Record<AttachmentType, string> = {
  secure: '#22c55e',
  anxious: '#f59e0b',
  avoidant: '#3b82f6',
  fearful: '#a855f7',
}

// ─── i18n Labels ──────────────────────────────────────────────────────────────
const LABELS: Record<Locale, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  restart: string
  share: string
  shareMsg: string
  yourType: string
  traits: string
  strengths: string
  challenges: string
  advice: string
  relationships: string
  chartTitle: string
  types: Record<AttachmentType, string>
}> = {
  ko: {
    title: '애착 유형 테스트',
    subtitle: '나의 관계 패턴을 알아보세요',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 애착 유형은',
    yourType: '나의 애착 유형',
    traits: '주요 특징',
    strengths: '강점',
    challenges: '어려움',
    advice: '성장 조언',
    relationships: '관계 패턴',
    chartTitle: '유형별 점수',
    types: {
      secure: '안정 애착',
      anxious: '불안 애착',
      avoidant: '회피 애착',
      fearful: '두려움-회피 애착',
    },
  },
  en: {
    title: 'Attachment Style Test',
    subtitle: 'Discover your relationship patterns',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My attachment style is',
    yourType: 'Your Attachment Style',
    traits: 'Key Traits',
    strengths: 'Strengths',
    challenges: 'Challenges',
    advice: 'Growth Advice',
    relationships: 'Relationship Patterns',
    chartTitle: 'Score Breakdown',
    types: {
      secure: 'Secure Attachment',
      anxious: 'Anxious Attachment',
      avoidant: 'Avoidant Attachment',
      fearful: 'Fearful-Avoidant Attachment',
    },
  },
  ja: {
    title: '愛着スタイルテスト',
    subtitle: '自分の関係パターンを知りましょう',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の愛着スタイルは',
    yourType: '私の愛着スタイル',
    traits: '主な特徴',
    strengths: '強み',
    challenges: '課題',
    advice: '成長のアドバイス',
    relationships: '関係パターン',
    chartTitle: 'スコア内訳',
    types: {
      secure: '安定型愛着',
      anxious: '不安型愛着',
      avoidant: '回避型愛着',
      fearful: '恐れ-回避型愛着',
    },
  },
}

// ─── Questions ────────────────────────────────────────────────────────────────
const QUESTIONS: Record<Locale, Question[]> = {
  ko: [
    {
      id: 'q1',
      text: '연인에게 화가 났을 때 나는 주로...',
      options: [
        { text: '솔직하게 내 감정을 이야기하고 해결책을 찾는다', type: 'secure' },
        { text: '상대방이 나를 떠날까 봐 걱정하며 계속 확인한다', type: 'anxious' },
        { text: '혼자 있고 싶어서 연락을 끊고 거리를 둔다', type: 'avoidant' },
        { text: '화내면 상처줄까 봐 속으로만 삭이고 혼자 힘들어한다', type: 'fearful' },
      ],
    },
    {
      id: 'q2',
      text: '연인이 연락이 잘 안 될 때 나는...',
      options: [
        { text: '바쁜가 보다 하고 기다린다', type: 'secure' },
        { text: '무슨 일이 생긴 건 아닌지 불안해져 여러 번 연락한다', type: 'anxious' },
        { text: '오히려 나만의 시간을 즐기며 크게 신경 쓰지 않는다', type: 'avoidant' },
        { text: '화가 나지만 연락하면 집착으로 보일까 봐 참는다', type: 'fearful' },
      ],
    },
    {
      id: 'q3',
      text: '관계에서 나는 주로 어떻게 감정을 표현하나요?',
      options: [
        { text: '자연스럽게 감정을 나누고 취약한 면도 보여줄 수 있다', type: 'secure' },
        { text: '감정이 과하게 표현되거나 감정 기복이 심한 편이다', type: 'anxious' },
        { text: '감정 표현이 어렵고 이성적으로 처리하려 한다', type: 'avoidant' },
        { text: '감정을 표현하고 싶지만 상처받을까 봐 조심한다', type: 'fearful' },
      ],
    },
    {
      id: 'q4',
      text: '연인이 나에 대한 불만을 표현할 때 나는...',
      options: [
        { text: '귀 기울여 듣고 함께 해결책을 찾으려 한다', type: 'secure' },
        { text: '버림받을 것 같아 과도하게 사과하고 달래려 한다', type: 'anxious' },
        { text: '방어적이 되거나 "그럼 헤어지자"는 생각이 든다', type: 'avoidant' },
        { text: '분명 내가 문제라고 생각하며 자책하고 위축된다', type: 'fearful' },
      ],
    },
    {
      id: 'q5',
      text: '새로운 관계를 시작할 때 나는...',
      options: [
        { text: '설레지만 차근차근 신뢰를 쌓아가는 게 자연스럽다', type: 'secure' },
        { text: '빠르게 깊이 빠져들고 상대방의 마음이 확인하고 싶다', type: 'anxious' },
        { text: '좋지만 너무 가까워지는 게 부담스러워 속도를 늦춘다', type: 'avoidant' },
        { text: '관계를 원하지만 또 상처받을까 봐 두렵다', type: 'fearful' },
      ],
    },
    {
      id: 'q6',
      text: '연인이 다른 이성과 친하게 지낼 때 나는...',
      options: [
        { text: '신뢰하기 때문에 크게 신경 쓰지 않는다', type: 'secure' },
        { text: '심하게 질투하고 확인하려 든다', type: 'anxious' },
        { text: '속은 불편하지만 티 내지 않고 무심한 척한다', type: 'avoidant' },
        { text: '질투하지만 말하면 상대가 싫어할까 봐 혼자 참는다', type: 'fearful' },
      ],
    },
    {
      id: 'q7',
      text: '혼자 있는 시간에 대해 나는...',
      options: [
        { text: '혼자도 좋고 함께도 좋다. 균형을 잘 맞출 수 있다', type: 'secure' },
        { text: '혼자 있으면 외로움과 불안함을 느껴 연락하게 된다', type: 'anxious' },
        { text: '혼자 있는 시간이 오히려 편하고 충전이 된다', type: 'avoidant' },
        { text: '혼자 있으면 부정적인 생각이 많아진다', type: 'fearful' },
      ],
    },
    {
      id: 'q8',
      text: '과거 관계에서 상처를 받았을 때 나는...',
      options: [
        { text: '힘들었지만 시간이 지나면서 회복하고 배움을 얻었다', type: 'secure' },
        { text: '오래 집착하고 왜 그랬는지 반복해서 생각했다', type: 'anxious' },
        { text: '빨리 잊으려 하고 바쁘게 지내거나 다른 것에 집중했다', type: 'avoidant' },
        { text: '다시는 사랑에 빠지면 안 되겠다는 생각이 들었다', type: 'fearful' },
      ],
    },
    {
      id: 'q9',
      text: '연인이 내게 의지하고 싶어 할 때 나는...',
      options: [
        { text: '기꺼이 지지해주며 함께 감정을 나눈다', type: 'secure' },
        { text: '내가 더 필요한 사람이 되어서 기쁘다', type: 'anxious' },
        { text: '부담스럽고 내 공간이 침해받는 느낌이 든다', type: 'avoidant' },
        { text: '돕고 싶지만 결국 내가 상처받을까 봐 조심스럽다', type: 'fearful' },
      ],
    },
    {
      id: 'q10',
      text: '연인과의 미래에 대해 나는...',
      options: [
        { text: '함께 꿈을 이야기하고 계획하는 것이 즐겁다', type: 'secure' },
        { text: '상대가 진짜로 날 원하는지 자꾸 확인하고 싶다', type: 'anxious' },
        { text: '미래 이야기 자체가 부담스럽고 현재에 집중하고 싶다', type: 'avoidant' },
        { text: '원하지만 잘 될 거라고 믿기 어렵다', type: 'fearful' },
      ],
    },
    {
      id: 'q11',
      text: '친한 친구 관계에서도 나는...',
      options: [
        { text: '편안하게 서로 기대고 지지할 수 있다', type: 'secure' },
        { text: '내가 충분히 중요한 사람인지 불안할 때가 있다', type: 'anxious' },
        { text: '일정 거리를 두고 너무 깊이 들어오면 불편하다', type: 'avoidant' },
        { text: '친해지고 싶지만 배신당할까 봐 쉽게 마음을 열지 못한다', type: 'fearful' },
      ],
    },
    {
      id: 'q12',
      text: '내가 어린 시절 부모님과의 관계는...',
      options: [
        { text: '따뜻하고 일관된 지지를 받았다', type: 'secure' },
        { text: '때로 따뜻하고 때로 차갑거나 예측 불가능했다', type: 'anxious' },
        { text: '감정 표현보다 독립을 강조받았거나 거리가 있었다', type: 'avoidant' },
        { text: '혼란스럽거나 두려운 경험이 있었다', type: 'fearful' },
      ],
    },
  ],
  en: [
    {
      id: 'q1',
      text: 'When I\'m upset with my partner, I usually...',
      options: [
        { text: 'Honestly share my feelings and work toward a solution', type: 'secure' },
        { text: 'Worry they might leave and keep checking in with them', type: 'anxious' },
        { text: 'Want to be alone and pull away from contact', type: 'avoidant' },
        { text: 'Bottle it up inside, afraid of hurting them', type: 'fearful' },
      ],
    },
    {
      id: 'q2',
      text: 'When my partner is hard to reach, I...',
      options: [
        { text: 'Assume they\'re busy and wait patiently', type: 'secure' },
        { text: 'Get anxious and reach out multiple times', type: 'anxious' },
        { text: 'Enjoy my alone time and don\'t worry much', type: 'avoidant' },
        { text: 'Feel upset but hold back from contacting them', type: 'fearful' },
      ],
    },
    {
      id: 'q3',
      text: 'How do I usually express emotions in relationships?',
      options: [
        { text: 'Naturally share feelings and show vulnerability', type: 'secure' },
        { text: 'My emotions tend to be intense or fluctuate a lot', type: 'anxious' },
        { text: 'I find it hard to express feelings, preferring logic', type: 'avoidant' },
        { text: 'I want to share but hold back fearing being hurt', type: 'fearful' },
      ],
    },
    {
      id: 'q4',
      text: 'When my partner expresses dissatisfaction, I...',
      options: [
        { text: 'Listen carefully and try to find solutions together', type: 'secure' },
        { text: 'Panic about being left and over-apologize', type: 'anxious' },
        { text: 'Get defensive or think about breaking up', type: 'avoidant' },
        { text: 'Immediately blame myself and feel terrible', type: 'fearful' },
      ],
    },
    {
      id: 'q5',
      text: 'When starting a new relationship, I...',
      options: [
        { text: 'Feel excited and gradually build trust naturally', type: 'secure' },
        { text: 'Fall deeply quickly and want constant reassurance', type: 'anxious' },
        { text: 'Like the person but feel uneasy getting too close', type: 'avoidant' },
        { text: 'Want the relationship but fear getting hurt again', type: 'fearful' },
      ],
    },
    {
      id: 'q6',
      text: 'When my partner is close with someone of the opposite sex, I...',
      options: [
        { text: 'Trust them and don\'t worry much about it', type: 'secure' },
        { text: 'Feel intensely jealous and want to check their phone', type: 'anxious' },
        { text: 'Feel bothered inside but act indifferent', type: 'avoidant' },
        { text: 'Feel jealous but stay quiet to avoid conflict', type: 'fearful' },
      ],
    },
    {
      id: 'q7',
      text: 'When it comes to alone time, I...',
      options: [
        { text: 'Am equally comfortable alone or with others', type: 'secure' },
        { text: 'Feel lonely and anxious alone, and reach out', type: 'anxious' },
        { text: 'Prefer alone time — it recharges me', type: 'avoidant' },
        { text: 'Get negative thoughts when I\'m alone', type: 'fearful' },
      ],
    },
    {
      id: 'q8',
      text: 'After getting hurt in a past relationship, I...',
      options: [
        { text: 'Was hurt but healed over time and learned from it', type: 'secure' },
        { text: 'Ruminated for a long time, unable to let go', type: 'anxious' },
        { text: 'Tried to forget quickly by staying busy', type: 'avoidant' },
        { text: 'Decided I shouldn\'t fall in love again', type: 'fearful' },
      ],
    },
    {
      id: 'q9',
      text: 'When my partner wants to lean on me, I...',
      options: [
        { text: 'Gladly support them and share in the emotion', type: 'secure' },
        { text: 'Feel happy to be needed more', type: 'anxious' },
        { text: 'Feel burdened and like my space is invaded', type: 'avoidant' },
        { text: 'Want to help but am cautious of getting hurt', type: 'fearful' },
      ],
    },
    {
      id: 'q10',
      text: 'When thinking about the future with my partner, I...',
      options: [
        { text: 'Enjoy dreaming and planning together', type: 'secure' },
        { text: 'Keep wanting reassurance that they truly want me', type: 'anxious' },
        { text: 'Find future talk overwhelming and prefer the present', type: 'avoidant' },
        { text: 'Want it but find it hard to believe it will work out', type: 'fearful' },
      ],
    },
    {
      id: 'q11',
      text: 'In close friendships, I...',
      options: [
        { text: 'Comfortably lean on and support each other', type: 'secure' },
        { text: 'Sometimes wonder if I matter enough to them', type: 'anxious' },
        { text: 'Keep some distance and feel uneasy getting too close', type: 'avoidant' },
        { text: 'Want closeness but can\'t easily open up for fear of betrayal', type: 'fearful' },
      ],
    },
    {
      id: 'q12',
      text: 'My relationship with my parents growing up was...',
      options: [
        { text: 'Warm and consistently supportive', type: 'secure' },
        { text: 'Sometimes warm, sometimes cold or unpredictable', type: 'anxious' },
        { text: 'Distant, emphasizing independence over emotion', type: 'avoidant' },
        { text: 'Confusing or sometimes frightening', type: 'fearful' },
      ],
    },
  ],
  ja: [
    {
      id: 'q1',
      text: 'パートナーに怒った時、私はたいてい...',
      options: [
        { text: '素直に気持ちを伝え、解決策を探す', type: 'secure' },
        { text: '捨てられるかと不安で、何度も確認してしまう', type: 'anxious' },
        { text: '一人でいたくて、連絡を断って距離を置く', type: 'avoidant' },
        { text: '傷つけるのが怖くて、ひとりで我慢する', type: 'fearful' },
      ],
    },
    {
      id: 'q2',
      text: 'パートナーから連絡がなかなか来ない時、私は...',
      options: [
        { text: '忙しいんだと思って待つ', type: 'secure' },
        { text: '何かあったか不安で、何度も連絡してしまう', type: 'anxious' },
        { text: '一人の時間を楽しんで、あまり気にしない', type: 'avoidant' },
        { text: 'イライラするけど、しつこいと思われるのが怖くて我慢する', type: 'fearful' },
      ],
    },
    {
      id: 'q3',
      text: '関係の中で感情をどのように表現しますか？',
      options: [
        { text: '自然に感情を共有し、脆い部分も見せられる', type: 'secure' },
        { text: '感情が激しくなりがちで、感情の浮き沈みが大きい', type: 'anxious' },
        { text: '感情表現が苦手で、論理的に処理しようとする', type: 'avoidant' },
        { text: '表現したいが、傷つくのが怖くて慎重になる', type: 'fearful' },
      ],
    },
    {
      id: 'q4',
      text: 'パートナーが不満を言ってきた時、私は...',
      options: [
        { text: 'しっかり耳を傾けて、一緒に解決策を探す', type: 'secure' },
        { text: '捨てられそうで、過度に謝ったりご機嫌取りをする', type: 'anxious' },
        { text: '防御的になったり、別れようという気持ちになる', type: 'avoidant' },
        { text: '自分が悪いと思い込んで落ち込む', type: 'fearful' },
      ],
    },
    {
      id: 'q5',
      text: '新しい関係が始まる時、私は...',
      options: [
        { text: 'ワクワクしつつ、自然に信頼を築いていける', type: 'secure' },
        { text: 'すぐに深みにはまり、相手の気持ちを確認したくなる', type: 'anxious' },
        { text: '好きだけど、近づきすぎると不安で速度を落とす', type: 'avoidant' },
        { text: '関係は欲しいが、また傷つくのが怖い', type: 'fearful' },
      ],
    },
    {
      id: 'q6',
      text: 'パートナーが異性と仲良くしている時、私は...',
      options: [
        { text: '信頼しているので、あまり気にならない', type: 'secure' },
        { text: 'ひどく嫉妬して、確認したくなる', type: 'anxious' },
        { text: '内心モヤモヤするが、何でもないふりをする', type: 'avoidant' },
        { text: '嫉妬するが、言うと嫌われると思って我慢する', type: 'fearful' },
      ],
    },
    {
      id: 'q7',
      text: '一人の時間については...',
      options: [
        { text: '一人でも一緒でもOK。バランスが取れる', type: 'secure' },
        { text: '一人でいると寂しく不安で、連絡したくなる', type: 'anxious' },
        { text: '一人の時間の方が気楽でリフレッシュできる', type: 'avoidant' },
        { text: '一人でいるとネガティブな気持ちになりやすい', type: 'fearful' },
      ],
    },
    {
      id: 'q8',
      text: '過去の関係で傷ついた後、私は...',
        options: [
        { text: '辛かったが、時間が経つにつれて回復して学べた', type: 'secure' },
        { text: '長い間引きずり、なぜそうなったか繰り返し考えた', type: 'anxious' },
        { text: '早く忘れようと、忙しく過ごしたり別のことに集中した', type: 'avoidant' },
        { text: 'もう恋愛はしてはいけないと思った', type: 'fearful' },
      ],
    },
    {
      id: 'q9',
      text: 'パートナーが私に頼りたがっている時、私は...',
      options: [
        { text: '喜んでサポートし、感情を共有する', type: 'secure' },
        { text: 'より必要とされていることが嬉しい', type: 'anxious' },
        { text: '負担に感じ、自分の空間が侵されるように思う', type: 'avoidant' },
        { text: '助けたいが、自分が傷つくのが怖くて慎重になる', type: 'fearful' },
      ],
    },
    {
      id: 'q10',
      text: 'パートナーとの将来について私は...',
      options: [
        { text: '一緒に夢を語り計画するのが楽しい', type: 'secure' },
        { text: '本当に自分のことが好きなのか何度も確認したくなる', type: 'anxious' },
        { text: '将来の話自体がプレッシャーで、今に集中したい', type: 'avoidant' },
        { text: '望んでいるが、うまくいくとは信じにくい', type: 'fearful' },
      ],
    },
    {
      id: 'q11',
      text: '親しい友人関係でも私は...',
      options: [
        { text: '自然に頼り合い、支え合える', type: 'secure' },
        { text: '自分が大切な存在かどうか不安になることがある', type: 'anxious' },
        { text: '適度な距離を置き、深入りされると不快に感じる', type: 'avoidant' },
        { text: '仲良くなりたいが、裏切られるのが怖くて心を開けない', type: 'fearful' },
      ],
    },
    {
      id: 'q12',
      text: '子供の頃、親との関係は...',
      options: [
        { text: '温かく、一貫したサポートがあった', type: 'secure' },
        { text: '時に温かく、時に冷たいなど予測しにくかった', type: 'anxious' },
        { text: '感情表現より自立を重んじる、距離感があった', type: 'avoidant' },
        { text: '混乱したり怖かった経験がある', type: 'fearful' },
      ],
    },
  ],
}

// ─── Results ──────────────────────────────────────────────────────────────────
const RESULTS: Record<AttachmentType, Record<Locale, ResultData>> = {
  secure: {
    ko: {
      title: '안정 애착',
      subtitle: '건강하고 균형 잡힌 관계를 만들어가는 당신',
      description: '안정 애착 유형은 친밀함과 독립성 사이의 균형을 자연스럽게 유지합니다. 타인을 신뢰하고, 감정을 개방적으로 나누며, 갈등도 건설적으로 해결합니다. 이는 모든 애착 유형 중 가장 건강한 형태로, 일관된 돌봄 경험에서 발달합니다.',
      traits: ['친밀함과 독립성 모두 편안함', '감정을 솔직하게 표현', '갈등을 건설적으로 처리', '타인을 신뢰하며 의지할 수 있음'],
      strengths: ['깊고 안정적인 관계 형성', '명확한 의사소통', '정서적 회복력', '건강한 경계 설정'],
      challenges: ['때로 다른 유형의 불안감을 이해하기 어려울 수 있음'],
      advice: '안정 애착을 가진 당신은 큰 강점을 지니고 있습니다. 불안정한 애착 유형의 파트너를 이해하고 인내심을 갖는 것이 관계를 더욱 깊게 만듭니다.',
      relationships: '안정적이고 따뜻한 관계를 자연스럽게 형성합니다. 갈등에서도 빠르게 회복하며, 장기적인 관계에서 높은 만족도를 보입니다.',
    },
    en: {
      title: 'Secure Attachment',
      subtitle: 'You build healthy, balanced relationships',
      description: 'Secure attachment naturally balances intimacy and independence. You trust others, share emotions openly, and resolve conflicts constructively. This is the healthiest attachment style, developed through consistent caregiving experiences.',
      traits: ['Comfortable with both closeness and independence', 'Honest emotional expression', 'Constructive conflict resolution', 'Trust in others'],
      strengths: ['Forming deep, stable relationships', 'Clear communication', 'Emotional resilience', 'Healthy boundary-setting'],
      challenges: ['May sometimes find it hard to understand others\' anxiety'],
      advice: 'Your secure attachment is a major strength. Practicing patience and understanding with partners who have insecure attachment styles will deepen your relationships.',
      relationships: 'You naturally form stable, warm relationships. You recover quickly from conflicts and show high satisfaction in long-term relationships.',
    },
    ja: {
      title: '安定型愛着',
      subtitle: '健康的でバランスのとれた関係を築くあなた',
      description: '安定型愛着は親密さと独立性のバランスを自然に保ちます。他者を信頼し、感情をオープンに共有し、葛藤も建設的に解決します。これは最も健康的な愛着スタイルで、一貫したケアの経験から発達します。',
      traits: ['親密さと独立性の両方に安心感', '率直な感情表現', '建設的な葛藤解決', '他者への信頼'],
      strengths: ['深く安定した関係の形成', '明確なコミュニケーション', '感情的回復力', '健全な境界設定'],
      challenges: ['他者の不安を理解しにくい場合がある'],
      advice: '安定型愛着は大きな強みです。不安定な愛着スタイルのパートナーを理解し、忍耐を持つことが関係をより深めます。',
      relationships: '安定した温かい関係を自然に形成します。葛藤からも素早く回復し、長期的な関係で高い満足度を示します。',
    },
  },
  anxious: {
    ko: {
      title: '불안 애착',
      subtitle: '깊은 연결을 원하지만 불안함을 느끼는 당신',
      description: '불안 애착 유형은 친밀함을 강하게 원하지만 버림받을까 봐 지속적으로 걱정합니다. 파트너의 반응에 매우 민감하며, 관계의 안정성을 계속 확인하려 합니다. 일관성 없는 양육 경험에서 주로 발달합니다.',
      traits: ['강한 친밀감 욕구', '버림받음에 대한 두려움', '빈번한 확신 요구', '관계 역학에 매우 민감'],
      strengths: ['깊고 열정적인 감정 표현', '파트너에 대한 헌신과 충성', '풍부한 감수성'],
      challenges: ['감정 기복과 불안', '과도한 확인 요구', '독립적 활동에 어려움'],
      advice: '당신의 감수성은 관계의 강점이 될 수 있습니다. 자기 자신을 달래는 방법을 연습하고, 파트너에게 명확하게 필요를 표현하는 연습을 해보세요. 개인 취미나 친구 관계에 투자하는 것도 도움이 됩니다.',
      relationships: '파트너에게 깊이 헌신하지만, 불안함으로 인해 갈등이 생길 수 있습니다. 안정 애착 파트너와 함께할 때 가장 안정적인 관계를 경험합니다.',
    },
    en: {
      title: 'Anxious Attachment',
      subtitle: 'You crave deep connection but often feel worried',
      description: 'Anxious attachment strongly desires intimacy but worries constantly about being abandoned. You\'re highly sensitive to your partner\'s reactions and constantly seek reassurance about relationship stability. It usually develops from inconsistent caregiving.',
      traits: ['Strong desire for closeness', 'Fear of abandonment', 'Frequent need for reassurance', 'Highly sensitive to relationship dynamics'],
      strengths: ['Deep, passionate emotional expression', 'Devotion and loyalty to partners', 'Rich emotional sensitivity'],
      challenges: ['Emotional fluctuations and anxiety', 'Excessive reassurance-seeking', 'Difficulty with independent activities'],
      advice: 'Your sensitivity can be a relationship strength. Practice self-soothing, clearly communicate your needs to your partner, and invest in personal hobbies and friendships to build your own security.',
      relationships: 'You\'re deeply devoted to partners but anxiety can create conflict. You feel most stable in relationships with secure attachment partners.',
    },
    ja: {
      title: '不安型愛着',
      subtitle: '深い繋がりを求めるが不安を感じやすいあなた',
      description: '不安型愛着は親密さを強く求めますが、捨てられることへの不安が絶えません。パートナーの反応に非常に敏感で、関係の安定性を常に確認しようとします。一貫性のないケアの経験から主に発達します。',
      traits: ['強い親密さへの欲求', '見捨てられることへの恐れ', '頻繁な安心感の要求', '関係の動態への高い感受性'],
      strengths: ['深く情熱的な感情表現', 'パートナーへの献身と忠誠', '豊かな感受性'],
      challenges: ['感情の浮き沈みと不安', '過度な確認行動', '独立した活動への困難'],
      advice: 'あなたの感受性は関係の強みになれます。自己を落ち着かせる方法を練習し、パートナーに明確にニーズを伝える練習をしましょう。個人の趣味や友人関係に投資することも助けになります。',
      relationships: 'パートナーに深く献身しますが、不安から葛藤が生じることがあります。安定型愛着のパートナーとの関係で最も安定を感じます。',
    },
  },
  avoidant: {
    ko: {
      title: '회피 애착',
      subtitle: '독립성을 중시하며 거리를 두는 당신',
      description: '회피 애착 유형은 독립성과 자립을 최우선으로 합니다. 정서적 친밀함에 불편함을 느끼고, 타인에게 의지하는 것을 꺼립니다. 감정적으로 거리를 두는 양육 환경에서 주로 발달합니다.',
      traits: ['강한 독립성', '정서적 친밀함에 불편함', '혼자 문제 해결 선호', '감정 표현 최소화'],
      strengths: ['강한 자립심과 독립성', '이성적이고 침착한 문제 해결', '개인 목표에 높은 집중력'],
      challenges: ['깊은 정서적 연결 어려움', '파트너가 거부감을 느낄 수 있음', '갈등 회피로 문제 누적'],
      advice: '독립심은 당신의 큰 강점이지만, 취약함을 조금씩 나누는 연습이 관계를 깊게 만듭니다. 파트너의 정서적 필요에 작은 반응을 보이는 것부터 시작해 보세요.',
      relationships: '파트너가 너무 가까이 다가오면 물러나는 경향이 있어 관계에 긴장감을 줄 수 있습니다. 자신의 공간을 존중해주는 파트너와 더 안정적인 관계를 유지합니다.',
    },
    en: {
      title: 'Avoidant Attachment',
      subtitle: 'You value independence and tend to keep distance',
      description: 'Avoidant attachment prioritizes independence and self-reliance above all. You feel uncomfortable with emotional intimacy and prefer to handle things alone. It usually develops from emotionally distant caregiving environments.',
      traits: ['Strong independence', 'Discomfort with emotional intimacy', 'Prefers solving problems alone', 'Minimizes emotional expression'],
      strengths: ['Strong self-reliance', 'Calm and rational problem-solving', 'High focus on personal goals'],
      challenges: ['Difficulty forming deep emotional connections', 'Partners may feel rejected', 'Avoidance accumulates unresolved issues'],
      advice: 'Independence is your great strength, but gradually practicing vulnerability will deepen your relationships. Start by offering small emotional responses to your partner\'s needs.',
      relationships: 'You tend to pull back when partners get too close, which can create tension. You\'re more stable with partners who respect your need for space.',
    },
    ja: {
      title: '回避型愛着',
      subtitle: '独立を重視し、距離を置く傾向のあるあなた',
      description: '回避型愛着は独立性と自立を最優先にします。感情的な親密さに不快感を覚え、他者に頼ることを避けます。感情的に距離を置く養育環境から主に発達します。',
      traits: ['強い独立性', '感情的な親密さへの不快感', '一人で問題解決することを好む', '感情表現を最小化'],
      strengths: ['強い自立心', '冷静で合理的な問題解決', '個人目標への高い集中力'],
      challenges: ['深い感情的繋がりの困難', 'パートナーが拒絶されたと感じる可能性', '葛藤回避で問題が蓄積'],
      advice: '独立心はあなたの大きな強みですが、少しずつ脆さを共有する練習が関係を深めます。パートナーの感情的なニーズに小さく応えることから始めましょう。',
      relationships: 'パートナーが近づきすぎると引いてしまう傾向があり、関係に緊張感をもたらすことがあります。あなたの個人空間を尊重してくれるパートナーとより安定した関係を保てます。',
    },
  },
  fearful: {
    ko: {
      title: '두려움-회피 애착',
      subtitle: '연결을 원하지만 상처받을까 봐 두려운 당신',
      description: '두려움-회피 애착 유형은 친밀한 관계를 깊이 원하지만 동시에 상처받을 것이 두렵습니다. 연결을 원하면서도 사람들을 밀어내는 상충된 감정을 경험합니다. 혼란스럽거나 트라우마를 주는 초기 경험에서 발달하는 경우가 많습니다.',
      traits: ['친밀함에 대한 욕구와 두려움 공존', '신뢰 형성의 어려움', '극단적인 감정 기복', '자신과 타인에 대한 부정적 인식'],
      strengths: ['깊은 공감 능력', '인간 관계의 복잡성 이해', '자기 인식 발달 가능성'],
      challenges: ['관계에서 불안과 회피가 번갈아 나타남', '신뢰 구축의 어려움', '관계에서 극도의 취약감'],
      advice: '당신의 여정은 쉽지 않지만, 전문 상담사의 도움을 받는 것이 매우 효과적입니다. 자신을 판단하지 말고, 작은 신뢰의 순간들을 소중히 여기세요. 당신은 건강한 관계를 가질 자격이 있습니다.',
      relationships: '관계에서 친밀해지고 싶으면서도 밀어내는 패턴을 반복할 수 있습니다. 인내심 있고 일관된 파트너와 천천히 신뢰를 쌓아가는 것이 중요합니다.',
    },
    en: {
      title: 'Fearful-Avoidant Attachment',
      subtitle: 'You want connection but fear being hurt',
      description: 'Fearful-avoidant attachment deeply wants intimate relationships but simultaneously fears being hurt. You experience conflicting feelings of wanting connection while pushing people away. It often develops from confusing or traumatic early experiences.',
      traits: ['Coexisting desire and fear of intimacy', 'Difficulty building trust', 'Extreme emotional fluctuations', 'Negative perceptions of self and others'],
      strengths: ['Deep empathy', 'Understanding of relationship complexity', 'Potential for profound self-awareness'],
      challenges: ['Alternating between anxiety and avoidance in relationships', 'Difficulty building trust', 'Extreme vulnerability in relationships'],
      advice: 'Your journey isn\'t easy, but professional counseling can be very effective. Don\'t judge yourself — cherish small moments of trust. You deserve healthy relationships.',
      relationships: 'You may repeat a pattern of wanting closeness and then pushing others away. It\'s important to slowly build trust with patient, consistent partners.',
    },
    ja: {
      title: '恐れ-回避型愛着',
      subtitle: '繋がりを求めながら傷つくことを恐れるあなた',
      description: '恐れ-回避型愛着は親密な関係を深く望む一方、傷つくことを同時に恐れます。繋がりを求めながら人々を遠ざける相反する感情を経験します。混乱した、またはトラウマを与える初期経験から多く発達します。',
      traits: ['親密さへの欲求と恐れの共存', '信頼形成の困難', '激しい感情の浮き沈み', '自己・他者への否定的認識'],
      strengths: ['深い共感能力', '人間関係の複雑さへの理解', '深い自己認識の発達可能性'],
      challenges: ['不安と回避が交互に現れる', '信頼構築の困難', '関係における極度の脆弱感'],
      advice: 'あなたの歩みは簡単ではありませんが、専門カウンセラーの助けが非常に効果的です。自分を責めず、小さな信頼の瞬間を大切にしてください。あなたには健全な関係を持つ権利があります。',
      relationships: '親密になりたい一方で遠ざけてしまうパターンを繰り返すことがあります。忍耐強く一貫したパートナーとゆっくり信頼を築くことが大切です。',
    },
  },
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { locale?: string }

export default function AttachmentStyleTest({ locale: lp = 'ko' }: Props) {
  const locale: Locale = (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const initResult = (): { type: AttachmentType; scores: Scores } | null => {
    if (typeof window === 'undefined') return null
    const p = new URLSearchParams(window.location.search)
    const t = p.get('type') as AttachmentType | null
    if (t && RESULTS[t]) return { type: t, scores: { secure: 0, anxious: 0, avoidant: 0, fearful: 0 } }
    return null
  }

  const [current, setCurrent] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('type')) return questions.length
    }
    return 0
  })
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<AttachmentType[]>([])
  const [result, setResult] = useState<{ type: AttachmentType; scores: Scores } | null>(initResult)

  function calcResult(ans: AttachmentType[]): { type: AttachmentType; scores: Scores } {
    const scores: Scores = { secure: 0, anxious: 0, avoidant: 0, fearful: 0 }
    for (const a of ans) scores[a]++
    const type = (Object.keys(scores) as AttachmentType[]).reduce((a, b) => scores[a] >= scores[b] ? a : b)
    return { type, scores }
  }

  function pick(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    const newAns = [...answers, questions[current].options[idx].type]
    setTimeout(() => {
      if (current + 1 >= questions.length) setResult(calcResult(newAns))
      setAnswers(newAns)
      setCurrent(current + 1)
      setSelected(null)
    }, 280)
  }

  function restart() {
    setAnswers([]); setCurrent(0); setSelected(null); setResult(null)
    if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname)
  }

  function share() {
    if (!result) return
    const url = `${window.location.origin}${window.location.pathname}?type=${result.type}`
    const text = `${lb.shareMsg} ${lb.types[result.type]}`
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
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-medium">{q.text}</p>
        </div>
        <div className="grid gap-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => pick(i)} disabled={selected !== null}
              className={['w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                selected === i ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-accent hover:border-primary/50',
                selected !== null && selected !== i ? 'opacity-50' : ''].join(' ')}>
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result.type][locale]
  const chartData: { name: string; value: number; fill: string }[] = (Object.keys(result.scores) as AttachmentType[]).map(k => ({
    name: lb.types[k],
    value: result.scores[k],
    fill: TYPE_COLORS[k],
  }))

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div className="inline-block rounded-full px-5 py-2 text-lg font-bold text-white"
          style={{ backgroundColor: TYPE_COLORS[result.type] }}>{r.title}</div>
        <p className="text-muted-foreground font-medium">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground text-center mb-3">{lb.chartTitle}</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" domain={[0, questions.length]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
            <Tooltip formatter={((v: number) => `${v}점`) as any} />
            <Bar dataKey="value" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{lb.traits}</h3>
        <ul className="space-y-1">
          {r.traits.map(t => <li key={t} className="text-sm text-muted-foreground flex gap-2"><span>•</span>{t}</li>)}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-green-600">{lb.strengths}</h3>
          <ul className="space-y-1">
            {r.strengths.map(s => <li key={s} className="text-xs text-muted-foreground flex gap-1"><span className="text-green-500">+</span>{s}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-amber-600">{lb.challenges}</h3>
          <ul className="space-y-1">
            {r.challenges.map(c => <li key={c} className="text-xs text-muted-foreground flex gap-1"><span className="text-amber-500">△</span>{c}</li>)}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-1">
        <h3 className="font-semibold text-sm">{lb.relationships}</h3>
        <p className="text-sm text-muted-foreground">{r.relationships}</p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.advice}</h3>
        <p className="text-sm">{r.advice}</p>
      </div>

      <div className="flex gap-3">
        <button onClick={restart}
          className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
          {lb.restart}
        </button>
        <button onClick={share}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
          {lb.share}
        </button>
      </div>
    </div>
  )
}
