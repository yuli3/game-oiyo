import { useState } from 'react'
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
type Lang = 'words' | 'acts' | 'gifts' | 'time' | 'touch'
type Scores = Record<Lang, number>
type Locale = 'ko' | 'en' | 'ja'

interface Pair { a: { text: string; lang: Lang }; b: { text: string; lang: Lang } }
interface ResultData {
  title: string
  emoji: string
  description: string
  examples: string[]
  toPartner: string
  needFrom: string
  tip: string
}

const LANG_COLORS: Record<Lang, string> = {
  words: '#3b82f6',
  acts: '#22c55e',
  gifts: '#f59e0b',
  time: '#a855f7',
  touch: '#ef4444',
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  pairOf: (c: number, t: number) => string
  chooseOne: string
  restart: string
  share: string
  shareMsg: string
  yourPrimary: string
  description: string
  examples: string
  toPartner: string
  needFrom: string
  tip: string
  allScores: string
  chartTitle: string
  types: Record<Lang, string>
}> = {
  ko: {
    title: '사랑의 언어 테스트',
    subtitle: '나는 어떻게 사랑을 주고받나요?',
    pairOf: (c, t) => `${c} / ${t}`,
    chooseOne: '더 공감되는 쪽을 선택해주세요',
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 사랑의 언어는',
    yourPrimary: '나의 주요 사랑의 언어',
    description: '설명',
    examples: '구체적인 예시',
    toPartner: '파트너에게 표현하는 방법',
    needFrom: '파트너에게 필요한 것',
    tip: '관계 팁',
    allScores: '전체 점수',
    chartTitle: '사랑의 언어 분석',
    types: {
      words: '확언의 말',
      acts: '봉사 행위',
      gifts: '선물',
      time: '함께하는 시간',
      touch: '스킨십',
    },
  },
  en: {
    title: 'Love Language Test',
    subtitle: 'How do you give and receive love?',
    pairOf: (c, t) => `${c} / ${t}`,
    chooseOne: 'Choose the one that resonates more',
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My love language is',
    yourPrimary: 'Your Primary Love Language',
    description: 'Description',
    examples: 'Examples',
    toPartner: 'How I express love',
    needFrom: 'What I need from a partner',
    tip: 'Relationship Tip',
    allScores: 'All Scores',
    chartTitle: 'Love Language Breakdown',
    types: {
      words: 'Words of Affirmation',
      acts: 'Acts of Service',
      gifts: 'Receiving Gifts',
      time: 'Quality Time',
      touch: 'Physical Touch',
    },
  },
  ja: {
    title: '愛の言語テスト',
    subtitle: 'あなたはどのように愛を与え受け取りますか？',
    pairOf: (c, t) => `${c} / ${t}`,
    chooseOne: 'より共感できる方を選んでください',
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の愛の言語は',
    yourPrimary: '主な愛の言語',
    description: '説明',
    examples: '具体的な例',
    toPartner: '愛の表現方法',
    needFrom: 'パートナーに必要なこと',
    tip: '関係のヒント',
    allScores: '全スコア',
    chartTitle: '愛の言語分析',
    types: {
      words: '肯定の言葉',
      acts: 'サービス行為',
      gifts: 'プレゼント',
      time: '充実した時間',
      touch: '身体的接触',
    },
  },
}

// 15 forced-choice pairs per locale
const PAIRS: Record<Locale, Pair[]> = {
  ko: [
    { a: { text: '연인이 "오늘 정말 멋있어 보여"라고 말해줄 때', lang: 'words' }, b: { text: '연인이 내가 힘들 때 옆에서 함께 있어줄 때', lang: 'time' } },
    { a: { text: '연인이 깜짝 선물을 준비해줄 때', lang: 'gifts' }, b: { text: '연인이 내가 하기 싫은 집안일을 먼저 해줄 때', lang: 'acts' } },
    { a: { text: '연인이 내 손을 꼭 잡아줄 때', lang: 'touch' }, b: { text: '연인이 나에 대해 친구들에게 칭찬할 때', lang: 'words' } },
    { a: { text: '연인과 핸드폰 없이 온전히 대화하는 저녁', lang: 'time' }, b: { text: '연인이 여행 중 내가 언급했던 것을 기억하고 선물로 줄 때', lang: 'gifts' } },
    { a: { text: '연인이 힘들 때 어깨를 다독여줄 때', lang: 'touch' }, b: { text: '연인이 내가 바쁠 때 식사를 준비해줄 때', lang: 'acts' } },
    { a: { text: '연인이 "네가 있어서 행복해"라고 말해줄 때', lang: 'words' }, b: { text: '연인과 함께 좋아하는 영화를 보며 포옹할 때', lang: 'touch' } },
    { a: { text: '연인이 내 취향에 맞는 선물을 고심해서 줄 때', lang: 'gifts' }, b: { text: '연인과 카페에서 둘만의 여유로운 시간을 보낼 때', lang: 'time' } },
    { a: { text: '연인이 내 프레젠테이션 준비를 도와줄 때', lang: 'acts' }, b: { text: '연인이 힘들었던 하루를 안아줄 때', lang: 'touch' } },
    { a: { text: '연인이 기념일을 잊지 않고 선물을 줄 때', lang: 'gifts' }, b: { text: '연인이 "당신은 정말 잘하고 있어"라고 격려해줄 때', lang: 'words' } },
    { a: { text: '연인이 특별한 날 요리를 직접 해줄 때', lang: 'acts' }, b: { text: '연인과 산책하며 많은 이야기를 나눌 때', lang: 'time' } },
    { a: { text: '연인이 편지나 메시지로 마음을 표현할 때', lang: 'words' }, b: { text: '연인이 아플 때 약을 사다주고 옆에 있어줄 때', lang: 'acts' } },
    { a: { text: '연인과 함께 여행을 계획하며 설레는 시간', lang: 'time' }, b: { text: '연인이 갑자기 꽃다발을 가져올 때', lang: 'gifts' } },
    { a: { text: '연인과 대화하다 자연스럽게 손을 잡을 때', lang: 'touch' }, b: { text: '연인이 나를 위해 맛있는 곳을 예약해줄 때', lang: 'acts' } },
    { a: { text: '연인이 "정말 자랑스러워"라고 말해줄 때', lang: 'words' }, b: { text: '연인이 출장에서 나를 생각하며 선물을 사다줄 때', lang: 'gifts' } },
    { a: { text: '연인과 함께 요리하며 시간을 보낼 때', lang: 'time' }, b: { text: '연인이 지친 어깨를 마사지해줄 때', lang: 'touch' } },
  ],
  en: [
    { a: { text: 'My partner says "You look amazing today"', lang: 'words' }, b: { text: 'My partner stays by my side when I\'m struggling', lang: 'time' } },
    { a: { text: 'My partner surprises me with a gift', lang: 'gifts' }, b: { text: 'My partner does chores I dislike without being asked', lang: 'acts' } },
    { a: { text: 'My partner holds my hand tightly', lang: 'touch' }, b: { text: 'My partner brags about me to friends', lang: 'words' } },
    { a: { text: 'An evening talking with my partner without phones', lang: 'time' }, b: { text: 'My partner remembers something I mentioned and gets it as a gift', lang: 'gifts' } },
    { a: { text: 'My partner pats my shoulder when I\'m down', lang: 'touch' }, b: { text: 'My partner prepares food when I\'m busy', lang: 'acts' } },
    { a: { text: 'My partner says "I\'m so happy to have you"', lang: 'words' }, b: { text: 'Watching a favorite movie together cuddled up', lang: 'touch' } },
    { a: { text: 'My partner puts thought into a gift that suits my taste', lang: 'gifts' }, b: { text: 'A relaxed afternoon at a café just the two of us', lang: 'time' } },
    { a: { text: 'My partner helps me prepare an important presentation', lang: 'acts' }, b: { text: 'My partner hugs me after a tough day', lang: 'touch' } },
    { a: { text: 'My partner remembers our anniversary and gives me a gift', lang: 'gifts' }, b: { text: 'My partner says "You\'re doing so well"', lang: 'words' } },
    { a: { text: 'My partner cooks for me on a special occasion', lang: 'acts' }, b: { text: 'Going on a walk and having a long conversation', lang: 'time' } },
    { a: { text: 'My partner expresses their heart through a letter or message', lang: 'words' }, b: { text: 'My partner gets medicine and stays with me when I\'m sick', lang: 'acts' } },
    { a: { text: 'Excitedly planning a trip together', lang: 'time' }, b: { text: 'My partner suddenly brings me flowers', lang: 'gifts' } },
    { a: { text: 'Naturally holding hands during a conversation', lang: 'touch' }, b: { text: 'My partner makes a reservation at a nice restaurant for me', lang: 'acts' } },
    { a: { text: 'My partner says "I\'m so proud of you"', lang: 'words' }, b: { text: 'My partner buys me a souvenir while traveling', lang: 'gifts' } },
    { a: { text: 'Cooking together and spending time in the kitchen', lang: 'time' }, b: { text: 'My partner massages my tired shoulders', lang: 'touch' } },
  ],
  ja: [
    { a: { text: 'パートナーが「今日本当に素敵だね」と言ってくれる', lang: 'words' }, b: { text: 'パートナーが辛い時にそばにいてくれる', lang: 'time' } },
    { a: { text: 'パートナーがサプライズでプレゼントをくれる', lang: 'gifts' }, b: { text: 'パートナーが嫌いな家事を先にやってくれる', lang: 'acts' } },
    { a: { text: 'パートナーがそっと手を握ってくれる', lang: 'touch' }, b: { text: 'パートナーが友人に私のことを褒めてくれる', lang: 'words' } },
    { a: { text: 'スマホなしで2人だけで話す夜', lang: 'time' }, b: { text: '旅行中に話したことを覚えてプレゼントをくれる', lang: 'gifts' } },
    { a: { text: '辛い時に肩をそっとたたいてくれる', lang: 'touch' }, b: { text: '忙しい時に食事を準備してくれる', lang: 'acts' } },
    { a: { text: '「一緒にいられて幸せ」と言ってくれる', lang: 'words' }, b: { text: '好きな映画を一緒に見てハグする', lang: 'touch' } },
    { a: { text: '私の好みに合わせたプレゼントを考えてくれる', lang: 'gifts' }, b: { text: 'カフェでゆっくり2人だけの時間を過ごす', lang: 'time' } },
    { a: { text: '大事なプレゼンの準備を手伝ってくれる', lang: 'acts' }, b: { text: '疲れた一日を抱きしめてくれる', lang: 'touch' } },
    { a: { text: '記念日を忘れずにプレゼントをくれる', lang: 'gifts' }, b: { text: '「あなたは本当によくやっている」と励ましてくれる', lang: 'words' } },
    { a: { text: '特別な日に料理を作ってくれる', lang: 'acts' }, b: { text: '散歩しながらたくさん話す', lang: 'time' } },
    { a: { text: '手紙やメッセージで気持ちを伝えてくれる', lang: 'words' }, b: { text: '体調不良の時に薬を買ってそばにいてくれる', lang: 'acts' } },
    { a: { text: '一緒に旅行を計画してワクワクする時間', lang: 'time' }, b: { text: '突然花束を持ってきてくれる', lang: 'gifts' } },
    { a: { text: '話しながら自然に手を繋ぐ', lang: 'touch' }, b: { text: '素敵なお店を予約してくれる', lang: 'acts' } },
    { a: { text: '「本当に誇りに思う」と言ってくれる', lang: 'words' }, b: { text: '出張中に私のことを思いプレゼントを買ってくれる', lang: 'gifts' } },
    { a: { text: '一緒に料理して時間を過ごす', lang: 'time' }, b: { text: '疲れた肩をマッサージしてくれる', lang: 'touch' } },
  ],
}

const RESULTS: Record<Lang, Record<Locale, ResultData>> = {
  words: {
    ko: {
      title: '확언의 말',
      emoji: '💬',
      description: '당신은 언어를 통해 사랑을 느끼고 표현합니다. 칭찬, 격려, 감사의 말이 마음에 깊이 와닿습니다. "사랑해", "자랑스러워", "당신이 있어서 행복해" 같은 말이 큰 힘이 됩니다.',
      examples: ['진심 어린 칭찬', '격려와 지지의 말', '감사 표현', '사랑을 담은 문자/편지'],
      toPartner: '말로 감사함과 사랑을 자주 표현합니다. 칭찬을 아끼지 않고, 파트너의 노력을 말로 인정합니다.',
      needFrom: '진심 어린 말과 인정. 비판적인 말이나 침묵은 큰 상처가 됩니다.',
      tip: '파트너에게 "오늘 정말 잘했어", "함께여서 행복해" 같은 말을 하루에 한 번 이상 해보세요. 작은 말 한마디가 큰 사랑이 됩니다.',
    },
    en: {
      title: 'Words of Affirmation',
      emoji: '💬',
      description: 'You feel and express love through words. Compliments, encouragement, and words of gratitude touch you deeply. Phrases like "I love you," "I\'m proud of you," and "I\'m happy you\'re in my life" mean the world to you.',
      examples: ['Sincere compliments', 'Words of encouragement and support', 'Expressions of gratitude', 'Loving messages/letters'],
      toPartner: 'You frequently express appreciation and love verbally. You don\'t hold back praise and verbally acknowledge your partner\'s efforts.',
      needFrom: 'Sincere words and affirmation. Critical words or silence can deeply wound you.',
      tip: 'Tell your partner "You did great today" or "I\'m so happy with you" at least once a day. A small word can be a big act of love.',
    },
    ja: {
      title: '肯定の言葉',
      emoji: '💬',
      description: '言葉を通じて愛を感じ、表現します。褒め言葉、励まし、感謝の言葉が深く心に響きます。「愛してる」「誇りに思う」「一緒にいられて幸せ」という言葉が大きな力になります。',
      examples: ['心からの褒め言葉', '励ましとサポートの言葉', '感謝の表現', '愛情のこもったメッセージ/手紙'],
      toPartner: '言葉で感謝と愛情を頻繁に表現します。褒め言葉を惜しまず、パートナーの努力を言葉で認めます。',
      needFrom: '心からの言葉と認定。批判的な言葉や沈黙は大きな傷になります。',
      tip: 'パートナーに「今日は本当によくやったね」や「一緒にいられて幸せ」と1日1回以上言ってみましょう。小さな言葉が大きな愛になります。',
    },
  },
  acts: {
    ko: {
      title: '봉사 행위',
      emoji: '🤝',
      description: '당신은 행동으로 사랑을 느끼고 표현합니다. 파트너가 나를 위해 무언가를 해줄 때 깊은 사랑을 느낍니다. 대신 해주는 일, 도움의 손길, 배려 가득한 행동이 사랑의 언어입니다.',
      examples: ['집안일 나눠하기', '바쁠 때 도와주기', '심부름 대신해주기', '파트너를 위해 뭔가 준비하기'],
      toPartner: '파트너를 위해 실질적인 도움을 제공합니다. 말보다 행동으로 사랑을 표현하는 것을 선호합니다.',
      needFrom: '실질적인 도움과 배려. 말뿐인 약속보다 작은 행동이 훨씬 큰 의미입니다.',
      tip: '파트너의 부담을 줄여줄 수 있는 작은 행동 하나를 오늘 해보세요. 물 한 잔을 가져다주는 것도 충분한 사랑의 표현입니다.',
    },
    en: {
      title: 'Acts of Service',
      emoji: '🤝',
      description: 'You feel and express love through actions. You feel deeply loved when your partner does something for you. Doing things on your behalf, lending a hand, and thoughtful actions are your love language.',
      examples: ['Sharing household chores', 'Helping when you\'re busy', 'Running errands', 'Preparing something for your partner'],
      toPartner: 'You provide practical help for your partner. You prefer expressing love through actions rather than words.',
      needFrom: 'Practical help and consideration. Small actions mean far more than empty promises.',
      tip: 'Do one small thing today that eases your partner\'s burden. Even bringing them a glass of water is a meaningful expression of love.',
    },
    ja: {
      title: 'サービス行為',
      emoji: '🤝',
      description: '行動を通じて愛を感じ、表現します。パートナーが何かをしてくれる時に深い愛を感じます。代わりにやってくれること、助けの手、思いやりある行動が愛の言語です。',
      examples: ['家事を分け合う', '忙しい時に助けてくれる', '代わりに用事を済ませる', 'パートナーのために何かを準備する'],
      toPartner: 'パートナーのために実際的な助けを提供します。言葉より行動で愛情を表現することを好みます。',
      needFrom: '実際的な助けと思いやり。空約束より小さな行動がはるかに大きな意味を持ちます。',
      tip: 'パートナーの負担を減らせる小さな行動を今日やってみましょう。水を一杯持ってきてあげるだけでも十分な愛の表現です。',
    },
  },
  gifts: {
    ko: {
      title: '선물',
      emoji: '🎁',
      description: '당신은 선물을 통해 사랑을 느끼고 표현합니다. 선물의 크기보다 "나를 생각했구나"라는 마음이 중요합니다. 기념일을 기억하거나 여행 중 작은 것을 사다주는 행동이 깊은 사랑으로 느껴집니다.',
      examples: ['기념일 선물', '여행 중 소품 사다주기', '좋아하는 것 기억해서 선물', '작은 간식이나 꽃'],
      toPartner: '파트너를 생각하며 선물을 고릅니다. 생일이나 기념일을 정성스럽게 준비합니다.',
      needFrom: '나를 생각한다는 증거가 되는 선물. 선물을 잊거나 무시하는 것이 큰 상처가 될 수 있습니다.',
      tip: '비싼 선물이 아니어도 괜찮습니다. "이걸 보니 네 생각이 났어"라는 말과 함께 작은 것을 선물해보세요.',
    },
    en: {
      title: 'Receiving Gifts',
      emoji: '🎁',
      description: 'You feel and express love through gifts. It\'s not about the size of the gift but the message "I was thinking of you." Remembering anniversaries or bringing back something small from a trip feels like deep love.',
      examples: ['Anniversary gifts', 'Souvenirs from trips', 'Gifts based on remembered preferences', 'Small treats or flowers'],
      toPartner: 'You choose gifts thoughtfully, thinking of your partner. You prepare carefully for birthdays and anniversaries.',
      needFrom: 'Gifts that show you\'re being thought of. Forgetting or dismissing gifts can be deeply hurtful.',
      tip: 'It doesn\'t need to be expensive. Try giving something small with the words "I saw this and thought of you."',
    },
    ja: {
      title: 'プレゼント',
      emoji: '🎁',
      description: 'プレゼントを通じて愛を感じ、表現します。プレゼントの大きさより「私のことを考えてくれた」という気持ちが大切です。記念日を覚えていたり、旅行中に小さなものを買ってきてくれると深い愛を感じます。',
      examples: ['記念日のプレゼント', '旅行中のお土産', '好みを覚えてのプレゼント', '小さなお菓子や花'],
      toPartner: 'パートナーのことを考えながらプレゼントを選びます。誕生日や記念日を丁寧に準備します。',
      needFrom: '自分のことを考えてくれている証拠となるプレゼント。プレゼントを忘れたり軽視すると大きな傷になります。',
      tip: '高価でなくて大丈夫です。「これを見たらあなたのことを思い出した」という言葉と一緒に小さなものを贈ってみましょう。',
    },
  },
  time: {
    ko: {
      title: '함께하는 시간',
      emoji: '⏰',
      description: '당신은 온전히 함께하는 시간을 통해 사랑을 느끼고 표현합니다. 핸드폰 없이, 다른 것에 신경 쓰지 않고 오로지 나에게 집중해주는 시간이 사랑입니다. 함께 있지만 각자 스마트폰만 보는 것은 상처가 됩니다.',
      examples: ['핸드폰 없이 대화하기', '함께 요리하기', '산책이나 드라이브', '취미를 함께 즐기기'],
      toPartner: '파트너와 함께하는 시간을 최우선으로 합니다. 온전한 주의와 집중을 나눕니다.',
      needFrom: '집중된 관심과 함께하는 시간. 함께 있으면서 딴짓하는 것이 큰 상처가 됩니다.',
      tip: '하루 30분이라도 핸드폰을 내려놓고 파트너에게만 집중하는 시간을 만들어보세요.',
    },
    en: {
      title: 'Quality Time',
      emoji: '⏰',
      description: 'You feel and express love through being fully present together. Love means time with no phones, no distractions — just focused attention on you. Being together but each staring at your phone feels hurtful.',
      examples: ['Talking without phones', 'Cooking together', 'Walking or driving together', 'Sharing a hobby'],
      toPartner: 'You prioritize time spent with your partner above all else. You share full attention and focus.',
      needFrom: 'Focused attention and shared time. Being together while distracted feels deeply hurtful.',
      tip: 'Even 30 minutes a day — put down your phone and give your partner your complete attention.',
    },
    ja: {
      title: '充実した時間',
      emoji: '⏰',
      description: '完全に一緒にいる時間を通じて愛を感じ、表現します。スマホなし、他のことを気にせず、ただ自分に集中してくれる時間が愛です。一緒にいながらそれぞれスマホを見ているのは傷つきます。',
      examples: ['スマホなしで話す', '一緒に料理する', '散歩やドライブ', '趣味を一緒に楽しむ'],
      toPartner: 'パートナーとの時間を最優先にします。完全な注意と集中を分かち合います。',
      needFrom: '集中した関心と共に過ごす時間。一緒にいながら他のことをすることが大きな傷になります。',
      tip: '1日30分でもスマホを置いて、パートナーだけに集中する時間を作りましょう。',
    },
  },
  touch: {
    ko: {
      title: '스킨십',
      emoji: '🤗',
      description: '당신은 신체적 접촉을 통해 사랑을 느끼고 표현합니다. 포옹, 손 잡기, 가벼운 터치가 안정감과 사랑을 줍니다. 신체적 거리감은 감정적 거리감으로 느껴질 수 있습니다.',
      examples: ['포옹과 입맞춤', '손 잡기', '어깨 두드리기', '함께 누워 이야기하기'],
      toPartner: '자연스럽게 신체적 애정을 표현합니다. 파트너를 안아주거나 손을 잡는 것으로 사랑을 전합니다.',
      needFrom: '신체적 따뜻함과 스킨십. 무관심이나 신체적 거리감이 감정적 상처가 됩니다.',
      tip: '하루에 한 번 이상 파트너를 안아주세요. 말보다 포옹이 더 많은 것을 전달할 때가 있습니다.',
    },
    en: {
      title: 'Physical Touch',
      emoji: '🤗',
      description: 'You feel and express love through physical contact. Hugs, holding hands, and gentle touches give you security and love. Physical distance can feel like emotional distance.',
      examples: ['Hugs and kisses', 'Holding hands', 'A pat on the shoulder', 'Lying together while talking'],
      toPartner: 'You naturally express physical affection. You convey love through hugging or holding hands.',
      needFrom: 'Physical warmth and touch. Indifference or physical distance causes emotional pain.',
      tip: 'Hug your partner at least once a day. Sometimes a hug conveys more than words ever could.',
    },
    ja: {
      title: '身体的接触',
      emoji: '🤗',
      description: '身体的な接触を通じて愛を感じ、表現します。ハグ、手を繋ぐこと、軽いタッチが安心感と愛を与えます。身体的な距離感は感情的な距離感として感じられることがあります。',
      examples: ['ハグとキス', '手を繋ぐ', '肩をたたく', '一緒に寝転んで話す'],
      toPartner: '自然に身体的な愛情を表現します。ハグや手を繋ぐことで愛情を伝えます。',
      needFrom: '身体的な温もりとスキンシップ。無関心や身体的距離感が感情的な傷になります。',
      tip: '1日1回以上パートナーをハグしましょう。時には言葉よりハグが多くを伝えることがあります。',
    },
  },
}

interface Props { locale?: string }

export default function LoveLanguageTest({ locale: lp = 'ko' }: Props) {
  const locale: Locale = (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
  const lb = LABELS[locale]
  const pairs = PAIRS[locale]

  const initResult = (): { primary: Lang; scores: Scores } | null => {
    if (typeof window === 'undefined') return null
    const p = new URLSearchParams(window.location.search)
    const t = p.get('lang') as Lang | null
    if (t && RESULTS[t]) return { primary: t, scores: { words: 0, acts: 0, gifts: 0, time: 0, touch: 0 } }
    return null
  }

  const [current, setCurrent] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('lang')) return pairs.length
    }
    return 0
  })
  const [selected, setSelected] = useState<'a' | 'b' | null>(null)
  const [answers, setAnswers] = useState<Lang[]>([])
  const [result, setResult] = useState<{ primary: Lang; scores: Scores } | null>(initResult)

  function calcResult(ans: Lang[]): { primary: Lang; scores: Scores } {
    const scores: Scores = { words: 0, acts: 0, gifts: 0, time: 0, touch: 0 }
    for (const a of ans) scores[a]++
    const primary = (Object.keys(scores) as Lang[]).reduce((a, b) => scores[a] >= scores[b] ? a : b)
    return { primary, scores }
  }

  function pick(side: 'a' | 'b') {
    if (selected !== null) return
    setSelected(side)
    const chosen = side === 'a' ? pairs[current].a.lang : pairs[current].b.lang
    const newAns = [...answers, chosen]
    setTimeout(() => {
      if (current + 1 >= pairs.length) setResult(calcResult(newAns))
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
    const url = `${window.location.origin}${window.location.pathname}?lang=${result.primary}`
    const text = `${lb.shareMsg} ${lb.types[result.primary]}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= pairs.length

  if (!finished) {
    const pair = pairs[current]
    const progress = Math.round((current / pairs.length) * 100)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.pairOf(current + 1, pairs.length)}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground font-medium">{lb.chooseOne}</p>
        <div className="grid gap-3">
          {(['a', 'b'] as const).map((side) => {
            const opt = pair[side]
            return (
              <button key={side} onClick={() => pick(side)} disabled={selected !== null}
                className={['w-full rounded-xl border px-5 py-4 text-left text-sm transition-colors',
                  selected === side ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-accent hover:border-primary/50',
                  selected !== null && selected !== side ? 'opacity-50' : ''].join(' ')}>
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result.primary][locale]
  const chartData = (Object.keys(result.scores) as Lang[]).map(k => ({
    name: lb.types[k],
    value: result.scores[k],
    fill: LANG_COLORS[k],
  })).sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourPrimary}</p>
        <div className="text-5xl">{r.emoji}</div>
        <div className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: LANG_COLORS[result.primary] }}>{r.title}</div>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground text-center mb-3">{lb.chartTitle}</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" domain={[0, pairs.length]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
            <Tooltip formatter={((v: number) => `${v}점`) as any} />
            <Bar dataKey="value" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">{lb.examples}</h3>
          <ul className="space-y-1">
            {r.examples.map(e => <li key={e} className="text-sm text-muted-foreground flex gap-2"><span style={{ color: LANG_COLORS[result.primary] }}>•</span>{e}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <h3 className="font-semibold text-sm">{lb.toPartner}</h3>
          <p className="text-sm text-muted-foreground">{r.toPartner}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <h3 className="font-semibold text-sm">{lb.needFrom}</h3>
          <p className="text-sm text-muted-foreground">{r.needFrom}</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.tip}</h3>
        <p className="text-sm">{r.tip}</p>
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
