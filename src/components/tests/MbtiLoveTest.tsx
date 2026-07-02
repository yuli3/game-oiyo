import { useState } from 'react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
type Dim = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P'
type Score = Record<Dim, number>
type MBTIType =
  'INTJ'|'INTP'|'ENTJ'|'ENTP'|
  'INFJ'|'INFP'|'ENFJ'|'ENFP'|
  'ISTJ'|'ISFJ'|'ESTJ'|'ESFJ'|
  'ISTP'|'ISFP'|'ESTP'|'ESFP'

interface Option { text: string; score: Partial<Score> }
interface Question { id: string; text: string; options: Option[] }
interface ResultData {
  name: string
  loveStyle: string
  idealPartners: MBTIType[]
  loveLanguages: string[]
  strengths: string[]
  weaknesses: string[]
  datingTip: string
  cautionPoints: string[]
}

type Locale = 'ko' | 'en' | 'ja'

// ─── i18n Labels ──────────────────────────────────────────────────────────────
const LABELS: Record<Locale, {
  title: string; subtitle: string; instructions: string
  progress: (c: number, t: number) => string
  resultTitle: string; resultType: string
  loveStyle: string; idealPartners: string; loveLanguages: string
  strengths: string; weaknesses: string; datingTip: string; caution: string
  retake: string; share: string; copied: string
  chartEI: string; chartSN: string; chartTF: string; chartJP: string
}> = {
  ko: {
    title: 'MBTI 연애 유형 테스트',
    subtitle: '나는 어떤 연애를 하는 사람일까?',
    instructions: '연애할 때 또는 썸을 탈 때의 나를 떠올리며 솔직하게 답해주세요.',
    progress: (c, t) => `${c} / ${t}`,
    resultTitle: '나의 MBTI 연애 유형',
    resultType: '연애 유형',
    loveStyle: '연애 스타일',
    idealPartners: '잘 맞는 유형',
    loveLanguages: '사랑 표현 방식',
    strengths: '연애 강점',
    weaknesses: '연애 약점',
    datingTip: '연애 조언',
    caution: '주의할 점',
    retake: '다시 하기',
    share: '결과 공유',
    copied: '복사됨!',
    chartEI: '외향 ↔ 내향',
    chartSN: '감각 ↔ 직관',
    chartTF: '사고 ↔ 감정',
    chartJP: '판단 ↔ 인식',
  },
  en: {
    title: 'MBTI Love Type Test',
    subtitle: 'What kind of lover are you?',
    instructions: 'Think of how you act in a romantic relationship and answer honestly.',
    progress: (c, t) => `${c} of ${t}`,
    resultTitle: 'Your MBTI Love Type',
    resultType: 'Love Type',
    loveStyle: 'Love Style',
    idealPartners: 'Best Matches',
    loveLanguages: 'Love Languages',
    strengths: 'Relationship Strengths',
    weaknesses: 'Relationship Weaknesses',
    datingTip: 'Dating Advice',
    caution: 'Watch Out For',
    retake: 'Retake',
    share: 'Share Result',
    copied: 'Copied!',
    chartEI: 'E ↔ I',
    chartSN: 'S ↔ N',
    chartTF: 'T ↔ F',
    chartJP: 'J ↔ P',
  },
  ja: {
    title: 'MBTI 恋愛タイプテスト',
    subtitle: '私はどんな恋愛をする人？',
    instructions: '恋愛中や気になる人がいるときの自分を思い浮かべて答えてください。',
    progress: (c, t) => `${c} / ${t}`,
    resultTitle: '私のMBTI恋愛タイプ',
    resultType: '恋愛タイプ',
    loveStyle: '恋愛スタイル',
    idealPartners: '相性の良いタイプ',
    loveLanguages: '愛情表現',
    strengths: '恋愛での強み',
    weaknesses: '恋愛での弱み',
    datingTip: '恋愛アドバイス',
    caution: '注意すること',
    retake: 'もう一度',
    share: '結果をシェア',
    copied: 'コピーしました',
    chartEI: 'E ↔ I',
    chartSN: 'S ↔ N',
    chartTF: 'T ↔ F',
    chartJP: 'J ↔ P',
  },
}

// ─── Questions ────────────────────────────────────────────────────────────────
const QUESTIONS: Record<Locale, Question[]> = {
  ko: [
    {
      id: 'q1', text: '연인과 주말을 보낼 때 내가 더 끌리는 것은?',
      options: [
        { text: '친구들과 함께하는 활기찬 모임에 연인을 데려간다', score: { E: 2 } },
        { text: '둘만의 조용한 공간에서 영화를 보며 시간을 보낸다', score: { I: 2 } },
        { text: '상대가 원하는 것을 먼저 물어보고 맞춰준다', score: { F: 1 } },
        { text: '미리 계획해 둔 데이트 코스를 따라 즐긴다', score: { J: 1 } },
      ],
    },
    {
      id: 'q2', text: '연인과 다툰 직후 내가 취하는 행동은?',
      options: [
        { text: '문제의 원인을 분석하고 논리적 해결책을 찾는다', score: { T: 2 } },
        { text: '상대방 감정을 먼저 헤아리고 공감해준다', score: { F: 2 } },
        { text: '혼자 생각을 정리할 시간이 필요하다', score: { I: 1 } },
        { text: '바로 대화로 풀어야 직성이 풀린다', score: { E: 1 } },
      ],
    },
    {
      id: 'q3', text: '나는 주로 이런 방식으로 사랑을 표현한다',
      options: [
        { text: '실질적인 도움과 배려 있는 행동으로', score: { S: 1, T: 1 } },
        { text: '진심 어린 말로 직접 "사랑해"라고 표현한다', score: { F: 2 } },
        { text: '스킨십과 함께하는 시간으로', score: { F: 1, E: 1 } },
        { text: '상대 관심사를 기억하고 깜짝 선물을 준다', score: { S: 1, J: 1 } },
      ],
    },
    {
      id: 'q4', text: '새로운 연인을 만날 때 나의 방식은?',
      options: [
        { text: '다양한 사람들을 만나며 자연스럽게 인연을 찾는다', score: { E: 2 } },
        { text: '소수의 깊은 인연 안에서 파트너를 찾는다', score: { I: 2 } },
        { text: '소개팅이나 공통 관심사 모임을 선호한다', score: { E: 1 } },
        { text: '천천히 관찰하며 신중하게 마음을 연다', score: { I: 1, J: 1 } },
      ],
    },
    {
      id: 'q5', text: '연인과 미래에 대해 이야기할 때 나는?',
      options: [
        { text: '결혼, 거주지 등 구체적 계획을 일찍부터 논의한다', score: { J: 2 } },
        { text: '관계가 자연스럽게 흘러가는 대로 두자는 주의다', score: { P: 2 } },
        { text: '두 사람이 공유하는 꿈과 비전에 대해 이야기한다', score: { N: 1 } },
        { text: '현재 함께하는 매 순간에 더 집중한다', score: { S: 1, P: 1 } },
      ],
    },
    {
      id: 'q6', text: '연인이 힘들어할 때 내가 먼저 하는 것은?',
      options: [
        { text: '문제 해결 방법을 함께 찾아준다', score: { T: 2 } },
        { text: '무조건 곁에 있어주며 공감해준다', score: { F: 2 } },
        { text: '재미있는 활동으로 기분 전환을 도와준다', score: { E: 1, P: 1 } },
        { text: '상대가 무엇을 원하는지 직접 물어본다', score: { F: 1 } },
      ],
    },
    {
      id: 'q7', text: '연인과의 데이트를 계획하는 내 스타일은?',
      options: [
        { text: '식당 예약부터 이동 경로까지 미리 모두 정해둔다', score: { J: 2 } },
        { text: '그날 기분에 따라 즉흥적으로 결정한다', score: { P: 2 } },
        { text: '큰 틀만 잡아두고 세부사항은 유연하게 간다', score: { J: 1, P: 1 } },
        { text: '상대방이 원하는 대로 따라간다', score: { F: 1 } },
      ],
    },
    {
      id: 'q8', text: '장기 연애에서 나에게 더 중요한 것은?',
      options: [
        { text: '안정적인 일상과 믿을 수 있는 루틴', score: { S: 2, J: 1 } },
        { text: '함께 새로운 경험을 계속 쌓아가는 것', score: { N: 1, P: 1 } },
        { text: '깊은 감정적 연결과 서로에 대한 이해', score: { F: 2 } },
        { text: '함께 성장하고 발전해가는 방향성', score: { N: 2, T: 1 } },
      ],
    },
    {
      id: 'q9', text: '중요한 연애 결정을 내릴 때 나는?',
      options: [
        { text: '장단점을 이성적으로 분석하고 결정한다', score: { T: 2 } },
        { text: '감정과 직관을 가장 중요하게 여긴다', score: { F: 2 } },
        { text: '가까운 친구나 가족의 의견도 구한다', score: { E: 1, F: 1 } },
        { text: '충분한 시간을 두고 천천히 결정한다', score: { I: 1, J: 1 } },
      ],
    },
    {
      id: 'q10', text: '내가 가장 좋아하는 데이트 장소 유형은?',
      options: [
        { text: '단골 카페나 좋아하는 레스토랑 같은 편안한 곳', score: { S: 2 } },
        { text: '새로 생긴 팝업스토어나 색다른 경험을 주는 곳', score: { N: 1, P: 1 } },
        { text: '조용하게 오래 이야기할 수 있는 아늑한 공간', score: { I: 1, F: 1 } },
        { text: '함께 활동적으로 즐길 수 있는 곳', score: { E: 1 } },
      ],
    },
    {
      id: 'q11', text: '관계에서 큰 갈등이 생겼을 때 나는?',
      options: [
        { text: '원인을 파악하고 재발 방지 방법을 함께 정한다', score: { J: 2, T: 1 } },
        { text: '감정이 가라앉을 때까지 자연스럽게 기다린다', score: { P: 2 } },
        { text: '솔직하게 대화해서 바로 해결하고 싶다', score: { E: 1, F: 1 } },
        { text: '왜 이런 문제가 생겼는지 깊이 탐색한다', score: { N: 1, I: 1 } },
      ],
    },
    {
      id: 'q12', text: '연애에서 나만의 공간·시간에 대해 나는?',
      options: [
        { text: '재충전을 위한 혼자만의 시간이 반드시 필요하다', score: { I: 2 } },
        { text: '함께 있는 시간이 많을수록 더 행복하다', score: { E: 2 } },
        { text: '함께하되 각자의 취미 생활도 존중받고 싶다', score: { I: 1, P: 1 } },
        { text: '처음부터 서로의 공간 규칙을 정하는 것이 좋다', score: { J: 1 } },
      ],
    },
  ],
  en: [
    {
      id: 'q1', text: 'How do you prefer to spend the weekend with your partner?',
      options: [
        { text: 'Bring them along to a fun group outing with friends', score: { E: 2 } },
        { text: 'Stay in together, just the two of you, watching movies', score: { I: 2 } },
        { text: 'Ask what they want to do and follow their lead', score: { F: 1 } },
        { text: 'Follow a planned date itinerary you prepared in advance', score: { J: 1 } },
      ],
    },
    {
      id: 'q2', text: 'Right after an argument with your partner, you…',
      options: [
        { text: 'Analyze what went wrong and find a logical solution', score: { T: 2 } },
        { text: 'Focus on understanding their feelings first', score: { F: 2 } },
        { text: 'Need time alone to gather your thoughts', score: { I: 1 } },
        { text: 'Want to resolve it through immediate conversation', score: { E: 1 } },
      ],
    },
    {
      id: 'q3', text: 'How do you mainly express your love?',
      options: [
        { text: 'Through practical help and thoughtful actions', score: { S: 1, T: 1 } },
        { text: 'By saying "I love you" directly and sincerely', score: { F: 2 } },
        { text: 'Through physical affection and quality time together', score: { F: 1, E: 1 } },
        { text: 'By remembering their interests and surprising them with gifts', score: { S: 1, J: 1 } },
      ],
    },
    {
      id: 'q4', text: 'When meeting a potential new partner, you tend to…',
      options: [
        { text: 'Meet lots of people and let things happen naturally', score: { E: 2 } },
        { text: 'Find connections within a small, close-knit circle', score: { I: 2 } },
        { text: 'Prefer arranged meetings or shared-interest groups', score: { E: 1 } },
        { text: 'Observe carefully and open up slowly and deliberately', score: { I: 1, J: 1 } },
      ],
    },
    {
      id: 'q5', text: 'When discussing the future with your partner, you…',
      options: [
        { text: 'Discuss concrete plans like marriage and housing early on', score: { J: 2 } },
        { text: 'Prefer letting the relationship unfold naturally', score: { P: 2 } },
        { text: 'Talk about shared dreams and big-picture vision', score: { N: 1 } },
        { text: 'Focus on enjoying each present moment together', score: { S: 1, P: 1 } },
      ],
    },
    {
      id: 'q6', text: 'When your partner is struggling, your first instinct is to…',
      options: [
        { text: 'Help them find a practical solution to the problem', score: { T: 2 } },
        { text: 'Simply be there and listen with empathy', score: { F: 2 } },
        { text: 'Distract them with something fun to lift their mood', score: { E: 1, P: 1 } },
        { text: 'Ask what they need and act accordingly', score: { F: 1 } },
      ],
    },
    {
      id: 'q7', text: 'How do you approach planning a date?',
      options: [
        { text: 'Plan everything in advance: restaurant, route, timing', score: { J: 2 } },
        { text: 'Decide spontaneously based on the mood that day', score: { P: 2 } },
        { text: 'Set a rough outline and stay flexible on details', score: { J: 1, P: 1 } },
        { text: 'Let your partner decide and just go along', score: { F: 1 } },
      ],
    },
    {
      id: 'q8', text: 'In a long-term relationship, what matters more to you?',
      options: [
        { text: 'A stable routine and someone you can rely on', score: { S: 2, J: 1 } },
        { text: 'Constantly sharing new experiences together', score: { N: 1, P: 1 } },
        { text: 'Deep emotional connection and mutual understanding', score: { F: 2 } },
        { text: 'Growing and evolving together toward shared goals', score: { N: 2, T: 1 } },
      ],
    },
    {
      id: 'q9', text: 'When making an important relationship decision, you…',
      options: [
        { text: 'Weigh the pros and cons logically', score: { T: 2 } },
        { text: 'Trust your emotions and intuition above all', score: { F: 2 } },
        { text: 'Seek input from close friends or family', score: { E: 1, F: 1 } },
        { text: 'Take plenty of time before deciding', score: { I: 1, J: 1 } },
      ],
    },
    {
      id: 'q10', text: 'What kind of date spot do you enjoy most?',
      options: [
        { text: 'A familiar café or favorite restaurant — comfortable and cozy', score: { S: 2 } },
        { text: 'A new pop-up or unique experience you\'ve never tried', score: { N: 1, P: 1 } },
        { text: 'A quiet place where you can talk for hours', score: { I: 1, F: 1 } },
        { text: 'Somewhere active where you can do things together', score: { E: 1 } },
      ],
    },
    {
      id: 'q11', text: 'When a big conflict arises in the relationship, you…',
      options: [
        { text: 'Identify the cause and agree on how to prevent it recurring', score: { J: 2, T: 1 } },
        { text: 'Wait for things to cool down on their own', score: { P: 2 } },
        { text: 'Have an open conversation to resolve it right away', score: { E: 1, F: 1 } },
        { text: 'Explore the deeper root of why it happened', score: { N: 1, I: 1 } },
      ],
    },
    {
      id: 'q12', text: 'Regarding personal space in a relationship, you…',
      options: [
        { text: 'Absolutely need alone time to recharge', score: { I: 2 } },
        { text: 'Are happiest when you spend as much time together as possible', score: { E: 2 } },
        { text: 'Want to be together but also respect each other\'s hobbies', score: { I: 1, P: 1 } },
        { text: 'Prefer setting clear boundaries and routines from the start', score: { J: 1 } },
      ],
    },
  ],
  ja: [
    {
      id: 'q1', text: '恋人と週末を過ごすとき、あなたが惹かれるのは？',
      options: [
        { text: '友達との賑やかな集まりに恋人を連れて行く', score: { E: 2 } },
        { text: '二人だけの静かな空間で映画を見て過ごす', score: { I: 2 } },
        { text: '相手が何をしたいか先に聞いて合わせる', score: { F: 1 } },
        { text: '事前に計画したデートコースを楽しむ', score: { J: 1 } },
      ],
    },
    {
      id: 'q2', text: '恋人と喧嘩した直後、あなたがとる行動は？',
      options: [
        { text: '問題の原因を分析し、論理的な解決策を見つける', score: { T: 2 } },
        { text: '相手の気持ちを先に察して共感する', score: { F: 2 } },
        { text: '一人で考えをまとめる時間が必要', score: { I: 1 } },
        { text: 'すぐ話し合って解決したい', score: { E: 1 } },
      ],
    },
    {
      id: 'q3', text: '主にこんな方法で愛情を表現する',
      options: [
        { text: '実用的なサポートと思いやりのある行動で', score: { S: 1, T: 1 } },
        { text: '「好きだよ」と直接言葉で伝える', score: { F: 2 } },
        { text: 'スキンシップと一緒に過ごす時間で', score: { F: 1, E: 1 } },
        { text: '相手の関心を覚えて、サプライズプレゼントをする', score: { S: 1, J: 1 } },
      ],
    },
    {
      id: 'q4', text: '新しい恋人と出会うときのスタイルは？',
      options: [
        { text: '多くの人と会って自然に縁を探す', score: { E: 2 } },
        { text: '少数の深い縁の中でパートナーを見つける', score: { I: 2 } },
        { text: '合コンや共通の趣味サークルが好き', score: { E: 1 } },
        { text: 'ゆっくり観察しながら慎重に心を開く', score: { I: 1, J: 1 } },
      ],
    },
    {
      id: 'q5', text: '恋人と将来について話すとき、あなたは？',
      options: [
        { text: '結婚や住む場所など具体的な計画を早めに話し合う', score: { J: 2 } },
        { text: '関係が自然に流れるままにしたい派', score: { P: 2 } },
        { text: '二人が共有する夢やビジョンについて話す', score: { N: 1 } },
        { text: '今ともに過ごす一瞬一瞬に集中する', score: { S: 1, P: 1 } },
      ],
    },
    {
      id: 'q6', text: '恋人がつらそうなとき、まず最初にすることは？',
      options: [
        { text: '一緒に問題解決の方法を探す', score: { T: 2 } },
        { text: 'とにかくそばにいて共感する', score: { F: 2 } },
        { text: '楽しい活動で気分転換を助ける', score: { E: 1, P: 1 } },
        { text: '相手が何を求めているか直接聞く', score: { F: 1 } },
      ],
    },
    {
      id: 'q7', text: 'デートの計画を立てるスタイルは？',
      options: [
        { text: 'レストランの予約からルートまで全て事前に決める', score: { J: 2 } },
        { text: 'その日の気分に合わせて即興で決める', score: { P: 2 } },
        { text: '大枠だけ決めて細かいことは柔軟に', score: { J: 1, P: 1 } },
        { text: '相手の希望に合わせて従う', score: { F: 1 } },
      ],
    },
    {
      id: 'q8', text: '長期的な恋愛で大切なのは？',
      options: [
        { text: '安定した日常と信頼できるルーティン', score: { S: 2, J: 1 } },
        { text: '一緒に新しい体験を積み重ねること', score: { N: 1, P: 1 } },
        { text: '深い感情的なつながりと理解', score: { F: 2 } },
        { text: '共に成長・発展していく方向性', score: { N: 2, T: 1 } },
      ],
    },
    {
      id: 'q9', text: '大切な恋愛の決断を下すとき、あなたは？',
      options: [
        { text: '長所・短所を論理的に分析して決める', score: { T: 2 } },
        { text: '感情と直感を最も重視する', score: { F: 2 } },
        { text: '親しい友人や家族の意見も聞く', score: { E: 1, F: 1 } },
        { text: '十分な時間をかけてゆっくり決める', score: { I: 1, J: 1 } },
      ],
    },
    {
      id: 'q10', text: '好きなデートスポットは？',
      options: [
        { text: 'お気に入りのカフェやレストランなど落ち着く場所', score: { S: 2 } },
        { text: '新しいポップアップや珍しい体験ができる場所', score: { N: 1, P: 1 } },
        { text: '静かにゆっくり話せる居心地のよい空間', score: { I: 1, F: 1 } },
        { text: '一緒にアクティブに楽しめる場所', score: { E: 1 } },
      ],
    },
    {
      id: 'q11', text: '関係で大きな衝突が起きたとき、あなたは？',
      options: [
        { text: '原因を把握し、再発防止策を一緒に決める', score: { J: 2, T: 1 } },
        { text: '感情が落ち着くまで自然に待つ', score: { P: 2 } },
        { text: '率直に話し合ってすぐ解決したい', score: { E: 1, F: 1 } },
        { text: 'なぜこんな問題が起きたか深く掘り下げる', score: { N: 1, I: 1 } },
      ],
    },
    {
      id: 'q12', text: '恋愛における個人の空間について、あなたは？',
      options: [
        { text: '充電のための一人の時間が絶対に必要', score: { I: 2 } },
        { text: '一緒にいる時間が多ければ多いほど幸せ', score: { E: 2 } },
        { text: '一緒にいながら、それぞれの趣味も尊重してほしい', score: { I: 1, P: 1 } },
        { text: '最初からお互いの空間ルールを決めるのが好き', score: { J: 1 } },
      ],
    },
  ],
}

// ─── Results Data ─────────────────────────────────────────────────────────────
const RESULTS: Record<Locale, Record<MBTIType, ResultData>> = {
  ko: {
    INTJ: {
      name: '전략적 로맨티스트',
      loveStyle: '독립적이고 신중하게 사랑을 선택하지만, 한 번 마음을 열면 깊고 헌신적인 파트너가 됩니다. 감정보다 행동으로 사랑을 증명하는 유형입니다.',
      idealPartners: ['ENFP', 'ENTP'],
      loveLanguages: ['인정하는 말', '함께하는 시간'],
      strengths: ['깊은 충성심과 헌신', '지적 대화로 관계 성장', '장기적이고 안정적인 파트너십'],
      weaknesses: ['감정 표현이 서툶', '완벽주의적 기대로 갈등 유발', '혼자만의 시간 필요로 인한 오해'],
      datingTip: '감사함과 애정을 직접 말로 표현하는 연습을 해보세요. 행동만으로는 상대에게 충분히 전달되지 않을 수 있습니다.',
      cautionPoints: ['감정 표현 부족으로 인한 거리감', '지나치게 높은 기준 설정'],
    },
    INTP: {
      name: '철학적 동반자',
      loveStyle: '지적 연결을 사랑의 기반으로 삼으며, 서로를 진정으로 이해하고 성장하는 동반자 관계를 추구합니다.',
      idealPartners: ['ENTJ', 'ENFJ'],
      loveLanguages: ['인정하는 말', '함께하는 시간'],
      strengths: ['깊은 이해와 수용', '유연하고 비판단적인 태도', '창의적이고 흥미로운 대화'],
      weaknesses: ['감정 표현 어려움', '즉흥적 결정 불편', '현실적 세부 배려 소홀'],
      datingTip: '상대방의 감정적 필요를 논리로 분석하기 전에 먼저 공감해주는 연습을 해보세요.',
      cautionPoints: ['감정보다 분석이 앞서 상대를 차갑게 느끼게 할 수 있음'],
    },
    ENTJ: {
      name: '주도적 파트너',
      loveStyle: '관계도 목표처럼 접근하며, 두 사람이 함께 성장하고 발전하는 강한 파트너십을 추구합니다.',
      idealPartners: ['INFP', 'INTP'],
      loveLanguages: ['인정하는 말', '봉사 행위'],
      strengths: ['강한 추진력과 리드', '명확한 미래 비전 공유', '상대의 성장을 적극 지원'],
      weaknesses: ['지배적이고 통제적 경향', '감정보다 효율 우선', '상대 페이스 무시 가능성'],
      datingTip: '관계는 프로젝트가 아닙니다. 상대방의 속도를 존중하고, 때로는 그냥 함께 있어주는 것만으로도 충분합니다.',
      cautionPoints: ['지나치게 주도적으로 상대를 압박할 수 있음', '감정적 필요를 약점으로 볼 수 있음'],
    },
    ENTP: {
      name: '자유로운 토론자',
      loveStyle: '지적 자극과 유머를 통해 관계를 발전시키며, 서로 도전하고 성장하는 역동적인 관계를 좋아합니다.',
      idealPartners: ['INFJ', 'INTJ'],
      loveLanguages: ['인정하는 말', '함께하는 시간'],
      strengths: ['창의적이고 신선한 데이트 아이디어', '지적 자극과 재미', '위트와 유머로 관계 활성화'],
      weaknesses: ['일관성과 안정성 부족', '감정적 깊이 회피 경향', '토론이 싸움으로 번질 수 있음'],
      datingTip: '상대방이 토론보다 공감을 원하는 순간을 알아채는 감수성을 키워보세요.',
      cautionPoints: ['논쟁을 즐기다 상대를 피곤하게 할 수 있음'],
    },
    INFJ: {
      name: '깊은 영혼의 연인',
      loveStyle: '단 한 명의 진정한 영혼의 동반자를 찾으며, 표면적 연결 너머의 깊고 의미 있는 관계를 추구합니다.',
      idealPartners: ['ENFP', 'ENTP'],
      loveLanguages: ['함께하는 시간', '인정하는 말'],
      strengths: ['깊은 공감과 이해', '헌신적이고 진지한 사랑', '파트너 성장 적극 지원'],
      weaknesses: ['완벽한 관계에 대한 이상주의', '혼자만의 회복 시간 필요', '상처를 오랫동안 기억함'],
      datingTip: '완벽한 관계를 기대하기보다, 현실적인 파트너와 함께 성장하는 과정 자체를 즐겨보세요.',
      cautionPoints: ['이상적인 파트너상에 맞지 않으면 쉽게 실망', '너무 많이 주다가 감정 소진'],
    },
    INFP: {
      name: '낭만적 이상주의자',
      loveStyle: '진정성과 감정적 깊이를 무엇보다 중시하며, 서로의 영혼이 연결된 특별하고 아름다운 사랑을 꿈꿉니다.',
      idealPartners: ['ENFJ', 'ENTJ'],
      loveLanguages: ['인정하는 말', '선물'],
      strengths: ['진정성 있는 깊은 감정 표현', '파트너의 독특함을 소중히 여김', '깊은 공감 능력'],
      weaknesses: ['현실적 갈등 회피 경향', '감정 기복이 큼', '이상화로 인한 실망'],
      datingTip: '현실적인 갈등도 관계의 일부임을 받아들이세요. 완벽하지 않아도 진심이 담긴 관계가 더 오래 지속됩니다.',
      cautionPoints: ['파트너를 이상화하다 쉽게 실망함', '갈등 시 회피 경향'],
    },
    ENFJ: {
      name: '헌신적 사랑의 설계자',
      loveStyle: '파트너의 행복과 성장을 삶의 중심에 두며, 깊고 따뜻한 헌신으로 아름다운 관계를 만들어냅니다.',
      idealPartners: ['INFP', 'ISFP'],
      loveLanguages: ['인정하는 말', '함께하는 시간'],
      strengths: ['깊은 공감과 이해', '헌신적이고 따뜻한 사랑', '상대 잠재력 발견과 지원'],
      weaknesses: ['자기 희생이 과도함', '비판에 지나치게 민감', '자신의 필요를 뒤로 미룸'],
      datingTip: '상대를 돌보는 만큼 자신의 감정과 필요도 챙기는 것이 더 건강하고 지속 가능한 관계를 만들어줍니다.',
      cautionPoints: ['너무 많이 줘서 감정 소진', '인정받지 못하면 깊은 상처'],
    },
    ENFP: {
      name: '열정적 자유 영혼',
      loveStyle: '처음 만남부터 깊은 연결을 추구하며, 상대의 가능성과 내면 세계를 함께 탐험하는 것을 사랑합니다.',
      idealPartners: ['INTJ', 'INFJ'],
      loveLanguages: ['인정하는 말', '신체 접촉'],
      strengths: ['열정적인 구애와 감정 표현', '창의적인 데이트 아이디어', '상대의 잠재력 발견'],
      weaknesses: ['감정 기복이 큼', '일관성이 부족할 수 있음', '새로운 것에 금방 흥미 변함'],
      datingTip: '이미 곁에 있는 파트너와의 깊이를 더 쌓아가는 것이 진정한 사랑의 성숙입니다.',
      cautionPoints: ['초반 열정이 시간 지나면 식을 수 있음', '상대를 이상화하다 실망하는 패턴'],
    },
    ISTJ: {
      name: '신뢰할 수 있는 든든한 파트너',
      loveStyle: '말보다 행동으로 사랑을 증명하며, 안정적이고 믿을 수 있는 관계를 꾸준히 만들어갑니다.',
      idealPartners: ['ESFP', 'ESTP'],
      loveLanguages: ['봉사 행위', '함께하는 시간'],
      strengths: ['흔들리지 않는 신뢰성', '책임감 있는 파트너십', '안정적이고 예측 가능한 관계'],
      weaknesses: ['감정 표현이 서툶', '변화와 즉흥성 어려움', '로맨틱한 제스처 부족'],
      datingTip: "'사랑해'라는 한마디가 상대에게 큰 선물이 될 수 있습니다. 말로 표현하는 것도 연습해보세요.",
      cautionPoints: ['감정 표현 부족으로 차갑게 느껴질 수 있음'],
    },
    ISFJ: {
      name: '따뜻한 수호자',
      loveStyle: '세심하게 상대를 배려하며, 안정적이고 따뜻한 가정 같은 관계를 만들어갑니다.',
      idealPartners: ['ESTP', 'ESFP'],
      loveLanguages: ['봉사 행위', '선물'],
      strengths: ['세심하고 꼼꼼한 배려', '안정적이고 헌신적인 관계', '상대를 기억하고 챙기는 다정함'],
      weaknesses: ['자신의 필요 표현 어려움', '갈등 회피로 인한 불만 축적', '변화에 대한 불안'],
      datingTip: '당신의 감정과 필요도 소중합니다. 표현하지 않으면 상대는 당신의 마음을 알 수 없습니다.',
      cautionPoints: ['자기 감정을 억누르다 번아웃', '갈등을 피하려다 불만이 쌓임'],
    },
    ESTJ: {
      name: '책임감 있는 관계 리더',
      loveStyle: '관계에서 역할과 책임을 명확히 하며, 함께 목표를 이루어가는 실질적이고 든든한 파트너십을 추구합니다.',
      idealPartners: ['ISFP', 'ISTP'],
      loveLanguages: ['봉사 행위', '인정하는 말'],
      strengths: ['신뢰할 수 있는 책임감', '명확하고 직접적인 소통', '현실적 문제 해결 능력'],
      weaknesses: ['지나치게 통제적', '감정보다 논리와 효율 우선', '유연성 부족'],
      datingTip: '모든 것을 효율적으로 해결하려 하지 말고, 때로는 상대방의 감정에 그냥 함께 있어주는 것만으로도 충분합니다.',
      cautionPoints: ['과도하게 관계를 관리하려는 경향'],
    },
    ESFJ: {
      name: '사랑으로 가득 찬 돌봄이',
      loveStyle: '상대방의 모든 것을 알고 싶어하며, 관계를 위해 아낌없이 헌신합니다.',
      idealPartners: ['ISFP', 'ISTP'],
      loveLanguages: ['봉사 행위', '함께하는 시간'],
      strengths: ['따뜻하고 환대하는 태도', '세심하고 꼼꼼한 배려', '관계 화합 분위기 조성'],
      weaknesses: ['타인의 인정과 승인 의존', '갈등 회피 경향', '자기 희생이 과도함'],
      datingTip: '상대방의 인정에 덜 의존하는 연습을 해보세요. 당신의 가치는 누군가의 반응에 달려있지 않습니다.',
      cautionPoints: ['인정받지 못하면 불안과 상처', '자신을 잃고 상대에게 지나치게 맞춤'],
    },
    ISTP: {
      name: '자유로운 현실주의자',
      loveStyle: '독립성을 유지하면서 실용적인 방식으로 사랑을 표현하며, 자유롭고 강요 없는 관계를 선호합니다.',
      idealPartners: ['ESTJ', 'ESFJ'],
      loveLanguages: ['신체 접촉', '봉사 행위'],
      strengths: ['실용적 문제 해결', '상대의 독립성 존중', '위기 상황에서 침착함'],
      weaknesses: ['감정 표현이 매우 어려움', '장기 계획 논의 회피', '너무 독립적으로 상대가 소외감 느낄 수 있음'],
      datingTip: '침묵은 때로 거리감으로 느껴질 수 있습니다. 상대방에게 조금씩이라도 감정을 표현하는 연습을 해보세요.',
      cautionPoints: ['감정 표현 없어 상대가 확인 불안 느낄 수 있음', '너무 독립적으로 관계 단절 위험'],
    },
    ISFP: {
      name: '조용한 감성 예술가',
      loveStyle: '섬세하고 진정성 있게 사랑하며, 아름다운 순간들을 함께 만들어가고 현재에 충실한 감성적 관계를 추구합니다.',
      idealPartners: ['ENFJ', 'ENTJ'],
      loveLanguages: ['신체 접촉', '선물'],
      strengths: ['섬세하고 아름다운 감성', '자유롭고 비판단적인 사랑', '현재 순간에 충실'],
      weaknesses: ['미래 계획 논의 회피', '갈등 상황에서 회피 경향', '깊은 감정 표현이 어려움'],
      datingTip: '갈등을 피하면 문제가 사라지지 않습니다. 조용하게라도 자신의 감정을 나눠보세요.',
      cautionPoints: ['갈등 회피로 불만이 쌓임', '감정 표현 어려워 상대가 오해'],
    },
    ESTP: {
      name: '짜릿한 어드벤처 연인',
      loveStyle: '자발적이고 활기차게 관계를 즐기며, 함께 새로운 경험과 스릴을 나누는 것을 사랑합니다.',
      idealPartners: ['ISFJ', 'ISTJ'],
      loveLanguages: ['신체 접촉', '선물'],
      strengths: ['활기차고 재미있는 데이트', '즉흥적이고 자유로운 관계', '현재를 즐기는 능력'],
      weaknesses: ['미래 계획이나 안정성 소홀', '깊은 감정 대화 회피', '지루함에 쉽게 취약'],
      datingTip: '흥분과 새로움 너머에 있는 깊은 연결도 관계를 풍요롭게 합니다. 파트너와 진지한 대화 시간을 만들어보세요.',
      cautionPoints: ['안정성 부족으로 상대 불안 유발', '지루해지면 관계 이탈 위험'],
    },
    ESFP: {
      name: '삶을 사랑하는 자유 영혼',
      loveStyle: '열정적이고 따뜻하게 사랑을 표현하며, 파트너와 함께라면 어떤 일상도 특별한 모험이 됩니다.',
      idealPartners: ['ISFJ', 'ISTJ'],
      loveLanguages: ['신체 접촉', '선물'],
      strengths: ['넘치는 활기와 열정', '따뜻하고 솔직한 감정 표현', '현재 순간의 행복 극대화'],
      weaknesses: ['장기 계획 어려움', '감정 기복이 큼', '미래보다 현재에만 집중'],
      datingTip: '지금 이 순간의 행복만큼 파트너와의 미래도 함께 그려보세요.',
      cautionPoints: ['현재 중심으로 미래 약속 어려움', '감정 기복으로 상대 혼란'],
    },
  },
  en: {
    INTJ: {
      name: 'Strategic Romantic',
      loveStyle: 'Selective and independent in choosing a partner, but once committed, you become a deeply loyal and devoted lover who expresses love through actions.',
      idealPartners: ['ENFP', 'ENTP'],
      loveLanguages: ['Words of Affirmation', 'Quality Time'],
      strengths: ['Deep loyalty and dedication', 'Intellectual growth through conversation', 'Long-term stable partnership'],
      weaknesses: ['Difficulty expressing emotions', 'Perfectionist expectations causing friction', 'Need for alone time misread as distance'],
      datingTip: 'Practice expressing gratitude and affection verbally. Your actions alone may not fully communicate how you feel.',
      cautionPoints: ['Perceived emotional distance due to low expression', 'Setting standards too high'],
    },
    INTP: {
      name: 'Philosophical Companion',
      loveStyle: 'You base love on intellectual connection, seeking a partnership where you truly understand each other and grow together.',
      idealPartners: ['ENTJ', 'ENFJ'],
      loveLanguages: ['Words of Affirmation', 'Quality Time'],
      strengths: ['Deep understanding and acceptance', 'Non-judgmental and flexible attitude', 'Creative and stimulating conversation'],
      weaknesses: ['Difficulty with emotional expression', 'Discomfort with spontaneous decisions', 'Neglecting small practical gestures'],
      datingTip: 'Try to empathize with your partner\'s emotional needs before analyzing them logically.',
      cautionPoints: ['Over-analyzing can feel cold to partners'],
    },
    ENTJ: {
      name: 'Decisive Partner',
      loveStyle: 'You approach relationships like goals, seeking a strong partnership where both people grow and achieve together.',
      idealPartners: ['INFP', 'INTP'],
      loveLanguages: ['Words of Affirmation', 'Acts of Service'],
      strengths: ['Strong drive and leadership', 'Clear shared vision for the future', 'Actively supports partner\'s growth'],
      weaknesses: ['Tendency to be dominant or controlling', 'Prioritizing efficiency over emotions', 'May ignore partner\'s pace'],
      datingTip: 'A relationship is not a project. Respect your partner\'s pace — sometimes just being present is enough.',
      cautionPoints: ['Can inadvertently pressure partners', 'May treat emotional needs as weaknesses'],
    },
    ENTP: {
      name: 'Free-Spirited Debater',
      loveStyle: 'You build relationships through intellectual stimulation and humor, loving dynamic connections where both partners challenge each other.',
      idealPartners: ['INFJ', 'INTJ'],
      loveLanguages: ['Words of Affirmation', 'Quality Time'],
      strengths: ['Creative and fresh date ideas', 'Intellectual stimulation and fun', 'Wit and humor keep the relationship alive'],
      weaknesses: ['Inconsistency and instability', 'Tendency to avoid emotional depth', 'Debates can turn into arguments'],
      datingTip: 'Develop the sensitivity to know when your partner wants empathy, not debate.',
      cautionPoints: ['May exhaust partners with constant debate'],
    },
    INFJ: {
      name: 'Deep Soul Lover',
      loveStyle: 'You seek one true soulmate, pursuing deep and meaningful connection that goes beyond the surface.',
      idealPartners: ['ENFP', 'ENTP'],
      loveLanguages: ['Quality Time', 'Words of Affirmation'],
      strengths: ['Deep empathy and understanding', 'Devoted and serious love', 'Actively supports partner\'s growth'],
      weaknesses: ['Idealism about perfect relationships', 'Needs alone time to recover', 'Holds onto hurt for a long time'],
      datingTip: 'Rather than expecting a perfect relationship, enjoy the process of growing together with a real, imperfect partner.',
      cautionPoints: ['Easily disappointed when partners don\'t match ideals', 'Risk of emotional burnout from giving too much'],
    },
    INFP: {
      name: 'Romantic Idealist',
      loveStyle: 'You value authenticity and emotional depth above all, dreaming of a love where two souls are truly connected.',
      idealPartners: ['ENFJ', 'ENTJ'],
      loveLanguages: ['Words of Affirmation', 'Gifts'],
      strengths: ['Genuine and deep emotional expression', 'Cherishes what makes each partner unique', 'Deep empathy'],
      weaknesses: ['Tends to avoid real conflict', 'Emotional ups and downs', 'Disappointment from over-idealizing'],
      datingTip: 'Accept that real conflict is part of every relationship. An imperfect but sincere bond lasts longer.',
      cautionPoints: ['Over-idealizes partners, then gets disappointed', 'Tends to withdraw during conflict'],
    },
    ENFJ: {
      name: 'Devoted Love Architect',
      loveStyle: 'You center your life around your partner\'s happiness and growth, creating a beautiful relationship through warm and dedicated love.',
      idealPartners: ['INFP', 'ISFP'],
      loveLanguages: ['Words of Affirmation', 'Quality Time'],
      strengths: ['Deep empathy and understanding', 'Devoted and warm love', 'Helps partner discover their potential'],
      weaknesses: ['Gives too much of themselves', 'Overly sensitive to criticism', 'Neglects own needs'],
      datingTip: 'Taking care of your own feelings and needs is what creates a healthier, more sustainable relationship.',
      cautionPoints: ['Risk of emotional burnout from over-giving', 'Deeply hurt when not appreciated'],
    },
    ENFP: {
      name: 'Passionate Free Spirit',
      loveStyle: 'From the very first meeting, you seek deep connection, loving to explore your partner\'s potential and inner world together.',
      idealPartners: ['INTJ', 'INFJ'],
      loveLanguages: ['Words of Affirmation', 'Physical Touch'],
      strengths: ['Passionate pursuit and emotional expression', 'Creative date ideas', 'Sees and nurtures partner\'s potential'],
      weaknesses: ['Emotional ups and downs', 'May lack consistency', 'Interests shift easily toward new things'],
      datingTip: 'Building deeper depth with the partner already beside you is the true maturity of love.',
      cautionPoints: ['Early passion may fade over time', 'Pattern of idealizing then being disappointed'],
    },
    ISTJ: {
      name: 'Dependable Steady Partner',
      loveStyle: 'You prove your love through actions rather than words, steadily building a stable and trustworthy relationship.',
      idealPartners: ['ESFP', 'ESTP'],
      loveLanguages: ['Acts of Service', 'Quality Time'],
      strengths: ['Unwavering reliability', 'Responsible partnership', 'Stable and predictable relationship'],
      weaknesses: ['Difficulty expressing emotions', 'Struggles with change and spontaneity', 'Lacks romantic gestures'],
      datingTip: '"I love you" can be a huge gift to your partner. Practice expressing it in words too.',
      cautionPoints: ['Emotional reserve can come across as cold'],
    },
    ISFJ: {
      name: 'Warm Guardian',
      loveStyle: 'You care for your partner with meticulous attention, creating a warm, stable relationship that feels like home.',
      idealPartners: ['ESTP', 'ESFP'],
      loveLanguages: ['Acts of Service', 'Gifts'],
      strengths: ['Meticulous care and attention', 'Stable and devoted relationship', 'Remembers and cherishes details about partner'],
      weaknesses: ['Difficulty expressing own needs', 'Avoids conflict — resentment builds up', 'Anxious about change'],
      datingTip: 'Your feelings and needs matter too. If you don\'t express them, your partner won\'t know.',
      cautionPoints: ['Suppresses feelings until burnout', 'Avoiding conflict lets resentment accumulate'],
    },
    ESTJ: {
      name: 'Responsible Relationship Leader',
      loveStyle: 'You define clear roles and responsibilities in relationships, seeking a practical and solid partnership built around shared goals.',
      idealPartners: ['ISFP', 'ISTP'],
      loveLanguages: ['Acts of Service', 'Words of Affirmation'],
      strengths: ['Trustworthy responsibility', 'Clear and direct communication', 'Practical problem-solving'],
      weaknesses: ['Tendency to be overly controlling', 'Logic and efficiency over feelings', 'Lack of flexibility'],
      datingTip: 'You don\'t need to solve everything efficiently. Sometimes just being with your partner emotionally is enough.',
      cautionPoints: ['Tendency to over-manage the relationship'],
    },
    ESFJ: {
      name: 'Love-Filled Caregiver',
      loveStyle: 'You want to know everything about your partner and give generously to the relationship. Love is at the center of your life.',
      idealPartners: ['ISFP', 'ISTP'],
      loveLanguages: ['Acts of Service', 'Quality Time'],
      strengths: ['Warm and welcoming attitude', 'Meticulous care and attention', 'Creates harmonious relationship atmosphere'],
      weaknesses: ['Dependent on others\' approval', 'Avoids conflict', 'Over-sacrifices for others'],
      datingTip: 'Practice depending less on your partner\'s validation. Your value is not determined by their reactions.',
      cautionPoints: ['Deeply hurt when not appreciated', 'May lose sense of self by over-accommodating'],
    },
    ISTP: {
      name: 'Free-Spirited Realist',
      loveStyle: 'You maintain independence while expressing love in practical ways, preferring a relationship free from pressure and control.',
      idealPartners: ['ESTJ', 'ESFJ'],
      loveLanguages: ['Physical Touch', 'Acts of Service'],
      strengths: ['Practical problem-solving', 'Respects partner\'s independence', 'Calm and steady in a crisis'],
      weaknesses: ['Great difficulty with emotional expression', 'Avoids discussing long-term plans', 'Too independent — partner may feel excluded'],
      datingTip: 'Silence can feel like distance. Practice expressing your feelings to your partner, even a little.',
      cautionPoints: ['Lack of emotional expression can cause partner anxiety', 'Risk of disconnection due to extreme independence'],
    },
    ISFP: {
      name: 'Quiet Emotional Artist',
      loveStyle: 'You love with sensitivity and authenticity, seeking an emotionally rich relationship focused on beautiful shared moments.',
      idealPartners: ['ENFJ', 'ENTJ'],
      loveLanguages: ['Physical Touch', 'Gifts'],
      strengths: ['Delicate and beautiful sensitivity', 'Free and non-judgmental love', 'Fully present in the moment'],
      weaknesses: ['Avoids discussing future plans', 'Withdraws during conflict', 'Difficulty expressing deep feelings'],
      datingTip: 'Avoiding conflict doesn\'t make problems disappear. Share your feelings quietly but honestly.',
      cautionPoints: ['Conflict avoidance lets resentment build', 'Emotional withdrawal causes misunderstandings'],
    },
    ESTP: {
      name: 'Thrilling Adventure Lover',
      loveStyle: 'You enjoy relationships spontaneously and energetically, loving to share new experiences and excitement with your partner.',
      idealPartners: ['ISFJ', 'ISTJ'],
      loveLanguages: ['Physical Touch', 'Gifts'],
      strengths: ['Energetic and fun dates', 'Spontaneous and free relationship style', 'Lives fully in the present'],
      weaknesses: ['Neglects future planning and stability', 'Avoids deep emotional conversations', 'Gets bored easily'],
      datingTip: 'The deep connection beyond the thrill of novelty also enriches a relationship. Make time for serious talks.',
      cautionPoints: ['Lack of stability can make partners anxious', 'May disengage when boredom sets in'],
    },
    ESFP: {
      name: 'Life-Loving Free Spirit',
      loveStyle: 'You express love passionately and warmly — with your partner, even ordinary days feel like special adventures.',
      idealPartners: ['ISFJ', 'ISTJ'],
      loveLanguages: ['Physical Touch', 'Gifts'],
      strengths: ['Overflowing energy and passion', 'Warm and honest emotional expression', 'Maximizes joy in the present moment'],
      weaknesses: ['Struggles with long-term planning', 'Emotional ups and downs', 'Focuses on present rather than future'],
      datingTip: 'Paint a picture of the future with your partner too. Planning and making promises is also a form of love.',
      cautionPoints: ['Difficulty making future commitments', 'Mood swings can confuse partners'],
    },
  },
  ja: {
    INTJ: {
      name: '戦略的ロマンチスト',
      loveStyle: '慎重に愛を選びますが、一度心を開いたら深く献身的なパートナーになります。感情より行動で愛を証明するタイプです。',
      idealPartners: ['ENFP', 'ENTP'],
      loveLanguages: ['肯定の言葉', '充実した時間'],
      strengths: ['深い忠誠心と献身', '知的対話で関係を深める', '長期的で安定したパートナーシップ'],
      weaknesses: ['感情表現が苦手', '完璧主義的な期待が摩擦を生む', '一人の時間が必要で誤解されやすい'],
      datingTip: '感謝や愛情を言葉で直接伝える練習をしてみてください。行動だけでは相手に伝わらないことがあります。',
      cautionPoints: ['感情表現不足による疎遠感', '基準が高すぎる'],
    },
    INTP: {
      name: '哲学的な伴侶',
      loveStyle: '知的なつながりを愛の基盤とし、お互いを真に理解し成長できる関係を求めます。',
      idealPartners: ['ENTJ', 'ENFJ'],
      loveLanguages: ['肯定の言葉', '充実した時間'],
      strengths: ['深い理解と受容', '柔軟で非判断的な態度', '創造的で刺激的な会話'],
      weaknesses: ['感情表現が難しい', '即興的な決定が苦手', '実務的な細やかな配慮が不足しがち'],
      datingTip: '相手の感情的ニーズを論理で分析する前に、まず共感してみましょう。',
      cautionPoints: ['分析が先走り、相手を冷たく感じさせることがある'],
    },
    ENTJ: {
      name: '主導的なパートナー',
      loveStyle: '関係も目標のようにアプローチし、二人が共に成長・発展する強いパートナーシップを求めます。',
      idealPartners: ['INFP', 'INTP'],
      loveLanguages: ['肯定の言葉', '行動・奉仕'],
      strengths: ['強い推進力とリード力', '明確な将来ビジョンの共有', '相手の成長を積極的にサポート'],
      weaknesses: ['支配的・コントロール的な傾向', '感情より効率を優先', '相手のペースを無視する可能性'],
      datingTip: '関係はプロジェクトではありません。相手のペースを尊重し、ただそばにいるだけでも十分なことがあります。',
      cautionPoints: ['主導しすぎて相手にプレッシャーを与える可能性'],
    },
    ENTP: {
      name: '自由な討論者',
      loveStyle: '知的刺激とユーモアで関係を深め、互いに挑戦し成長するダイナミックな関係が好きです。',
      idealPartners: ['INFJ', 'INTJ'],
      loveLanguages: ['肯定の言葉', '充実した時間'],
      strengths: ['斬新で創造的なデートのアイデア', '知的刺激と楽しさ', 'ウィットとユーモアで関係を活性化'],
      weaknesses: ['一貫性と安定性の欠如', '感情的な深みを避ける傾向', '討論が喧嘩になることがある'],
      datingTip: '相手が討論より共感を求めている瞬間を察する感受性を磨いてみましょう。',
      cautionPoints: ['議論を楽しみすぎて相手を疲れさせることがある'],
    },
    INFJ: {
      name: '深い魂の恋人',
      loveStyle: '真のソウルメイトを求め、表面的なつながりを超えた深く意味ある関係を追求します。',
      idealPartners: ['ENFP', 'ENTP'],
      loveLanguages: ['充実した時間', '肯定の言葉'],
      strengths: ['深い共感と理解', '献身的で真剣な愛', '相手の成長を積極的にサポート'],
      weaknesses: ['完璧な関係へのイデアリズム', '一人で回復する時間が必要', '傷を長く覚えている'],
      datingTip: '完璧な関係を求めるより、現実的なパートナーと共に成長する過程を楽しんでみてください。',
      cautionPoints: ['理想のパートナー像に合わないとすぐ失望する', '与えすぎて感情燃え尽きのリスク'],
    },
    INFP: {
      name: 'ロマンチックな理想主義者',
      loveStyle: '誠実さと感情的な深さを何より大切にし、魂が繋がる特別で美しい愛を夢見ています。',
      idealPartners: ['ENFJ', 'ENTJ'],
      loveLanguages: ['肯定の言葉', 'プレゼント'],
      strengths: ['誠実で深い感情表現', 'パートナーの独自性を大切にする', '深い共感力'],
      weaknesses: ['現実的な葛藤を避ける傾向', '感情の波が大きい', '理想化による失望'],
      datingTip: '現実の葛藤も関係の一部だと受け入れてみてください。完璧でなくても誠実な関係の方が長続きします。',
      cautionPoints: ['パートナーを理想化してすぐ失望するパターン', '葛藤時に引きこもる傾向'],
    },
    ENFJ: {
      name: '献身的な愛の設計者',
      loveStyle: 'パートナーの幸福と成長を生活の中心に置き、深く温かな献身で美しい関係を作り上げます。',
      idealPartners: ['INFP', 'ISFP'],
      loveLanguages: ['肯定の言葉', '充実した時間'],
      strengths: ['深い共感と理解', '献身的で温かな愛', '相手の潜在力を発見してサポート'],
      weaknesses: ['自己犠牲が過大', '批判に過敏', '自分のニーズを後回しにする'],
      datingTip: '相手を気遣うのと同じくらい、自分の感情やニーズも大切にすることがより健全で持続可能な関係を作ります。',
      cautionPoints: ['与えすぎて感情燃え尽き', '認められないと深く傷つく'],
    },
    ENFP: {
      name: '情熱的な自由な魂',
      loveStyle: '出会いの瞬間から深いつながりを求め、相手の可能性と内面世界を共に探求することを愛します。',
      idealPartners: ['INTJ', 'INFJ'],
      loveLanguages: ['肯定の言葉', 'スキンシップ'],
      strengths: ['情熱的なアプローチと感情表現', '創造的なデートのアイデア', '相手の潜在力を発見する'],
      weaknesses: ['感情の波が大きい', '一貫性が欠けることがある', '新しいことにすぐ興味が移る'],
      datingTip: '今そばにいるパートナーとの深みをさらに積み上げることが、真の愛の成熟です。',
      cautionPoints: ['初期の情熱が時間とともに薄れる可能性', '理想化してから失望するパターン'],
    },
    ISTJ: {
      name: '信頼できる頼れるパートナー',
      loveStyle: '言葉より行動で愛を証明し、安定していて信頼できる関係を地道に作り続けます。',
      idealPartners: ['ESFP', 'ESTP'],
      loveLanguages: ['行動・奉仕', '充実した時間'],
      strengths: ['揺るぎない信頼性', '責任感のあるパートナーシップ', '安定した予測可能な関係'],
      weaknesses: ['感情表現が苦手', '変化と即興性が苦手', 'ロマンチックなジェスチャーが少ない'],
      datingTip: '「好きだよ」の一言が相手への大きなプレゼントになります。言葉で表現することも練習してみてください。',
      cautionPoints: ['感情表現不足で冷たく感じられることがある'],
    },
    ISFJ: {
      name: '温かな守護者',
      loveStyle: '相手を細やかに気遣い、安定していて温かい家庭のような関係を作り上げます。',
      idealPartners: ['ESTP', 'ESFP'],
      loveLanguages: ['行動・奉仕', 'プレゼント'],
      strengths: ['細やかで丁寧な気遣い', '安定した献身的な関係', '相手を覚えて大切にする優しさ'],
      weaknesses: ['自分のニーズを表現しにくい', '葛藤回避による不満の蓄積', '変化への不安'],
      datingTip: 'あなたの感情やニーズも大切です。表現しないと相手にはわかりません。',
      cautionPoints: ['感情を抑えすぎてバーンアウト', '葛藤を避けて不満が溜まる'],
    },
    ESTJ: {
      name: '責任感ある関係のリーダー',
      loveStyle: '関係における役割と責任を明確にし、共に目標を達成する実用的で頼りになるパートナーシップを求めます。',
      idealPartners: ['ISFP', 'ISTP'],
      loveLanguages: ['行動・奉仕', '肯定の言葉'],
      strengths: ['信頼できる責任感', '明確で直接的なコミュニケーション', '現実的な問題解決力'],
      weaknesses: ['過度にコントロールしようとする', '感情より論理と効率を優先', '柔軟性の欠如'],
      datingTip: '何でも効率的に解決しようとせず、時には相手の感情にただ寄り添うだけでも十分です。',
      cautionPoints: ['関係を管理しすぎる傾向'],
    },
    ESFJ: {
      name: '愛情あふれる世話焼き',
      loveStyle: '相手のすべてを知りたがり、関係のために惜しみなく献身します。愛することと愛されることが人生の中心です。',
      idealPartners: ['ISFP', 'ISTP'],
      loveLanguages: ['行動・奉仕', '充実した時間'],
      strengths: ['温かく歓迎的な態度', '細やかで丁寧な気遣い', '関係の調和を作る'],
      weaknesses: ['他者の承認に依存', '葛藤回避の傾向', '自己犠牲が過大'],
      datingTip: '相手の承認への依存を減らす練習をしてみましょう。あなたの価値は誰かの反応次第ではありません。',
      cautionPoints: ['認められないと不安や傷つきが生じる', '自分を失って相手に合わせすぎる'],
    },
    ISTP: {
      name: '自由な現実主義者',
      loveStyle: '独立性を保ちながら実用的な方法で愛を表現し、自由でプレッシャーのない関係を好みます。',
      idealPartners: ['ESTJ', 'ESFJ'],
      loveLanguages: ['スキンシップ', '行動・奉仕'],
      strengths: ['実用的な問題解決', '相手の独立性を尊重', '危機的状況での冷静さ'],
      weaknesses: ['感情表現が非常に苦手', '長期的な計画の話し合いを避ける', '独立的すぎて相手が孤独感を感じる可能性'],
      datingTip: '沈黙は時に距離感に感じられます。少しずつでも感情を表現する練習をしてみましょう。',
      cautionPoints: ['感情表現がなく相手が不安を感じることがある'],
    },
    ISFP: {
      name: '静かな感性の芸術家',
      loveStyle: '繊細で誠実に愛し、美しい瞬間を共に作り、今この瞬間を大切にする感性的な関係を求めます。',
      idealPartners: ['ENFJ', 'ENTJ'],
      loveLanguages: ['スキンシップ', 'プレゼント'],
      strengths: ['繊細で美しい感性', '自由で非判断的な愛', '今この瞬間を大切にする'],
      weaknesses: ['将来の計画の話し合いを避ける', '葛藤時に引きこもる傾向', '深い感情表現が苦手'],
      datingTip: '葛藤を避けても問題は消えません。静かにでも自分の気持ちを分かち合いましょう。',
      cautionPoints: ['葛藤回避で不満が溜まる', '感情表現が苦手で相手が誤解する'],
    },
    ESTP: {
      name: 'スリリングな冒険家の恋人',
      loveStyle: '自発的で活気よく関係を楽しみ、パートナーと新しい体験やスリルを共有することを愛します。',
      idealPartners: ['ISFJ', 'ISTJ'],
      loveLanguages: ['スキンシップ', 'プレゼント'],
      strengths: ['活気ある楽しいデート', '自発的で自由な関係', '今この瞬間を楽しむ能力'],
      weaknesses: ['将来の計画や安定性がおろそか', '深い感情の対話を避ける', '飽きやすい'],
      datingTip: '興奮や新鮮さの向こうにある深いつながりも関係を豊かにします。パートナーと真剣な対話の時間を作ってみましょう。',
      cautionPoints: ['安定性の欠如でパートナーが不安になる', '飽きると関係から離れるリスク'],
    },
    ESFP: {
      name: '人生を愛する自由な魂',
      loveStyle: '情熱的で温かく愛情を表現し、パートナーと一緒なら日常のどんな瞬間も特別な冒険になります。',
      idealPartners: ['ISFJ', 'ISTJ'],
      loveLanguages: ['スキンシップ', 'プレゼント'],
      strengths: ['溢れるエネルギーと情熱', '温かく率直な感情表現', '今この瞬間の幸せを最大化'],
      weaknesses: ['長期計画が苦手', '感情の波が大きい', '将来よりも今に集中'],
      datingTip: '今この瞬間の幸せと同様に、パートナーとの未来も一緒に描いてみましょう。',
      cautionPoints: ['将来の約束が難しい', '感情の波でパートナーが混乱することがある'],
    },
  },
}

// ─── MBTI Calculation ─────────────────────────────────────────────────────────
function calcMBTI(answers: Partial<Score>[]): { type: MBTIType; scores: Score } {
  const s: Score = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  answers.forEach(a => {
    (Object.keys(a) as Dim[]).forEach(k => { s[k] += (a[k] ?? 0) })
  })
  const type = (
    (s.E >= s.I ? 'E' : 'I') +
    (s.S >= s.N ? 'S' : 'N') +
    (s.T >= s.F ? 'T' : 'F') +
    (s.J >= s.P ? 'J' : 'P')
  ) as MBTIType
  return { type, scores: s }
}

function dimPct(a: number, b: number) {
  const total = a + b
  return total === 0 ? 50 : Math.round((a / total) * 100)
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { locale?: string }

export default function MbtiLoveTest({ locale = 'ko' }: Props) {
  const lang = (['ko', 'en', 'ja'].includes(locale) ? locale : 'ko') as Locale
  const t = LABELS[lang]
  const questions = QUESTIONS[lang]

  const [step, setStep] = useState<'test' | 'result'>('test')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Partial<Score>[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<{ type: MBTIType; scores: Score } | null>(null)
  const [copied, setCopied] = useState(false)

  const q = questions[current]

  function pick(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    const newAnswers = [...answers, q.options[idx].score]

    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent(c => c + 1)
        setAnswers(newAnswers)
        setSelected(null)
      } else {
        const r = calcMBTI(newAnswers)
        setResult(r)
        setStep('result')
      }
    }, 280)
  }

  function restart() {
    setCurrent(0)
    setAnswers([])
    setSelected(null)
    setResult(null)
    setStep('test')
  }

  function shareResult() {
    if (!result) return
    const url = `${window.location.href.split('?')[0]}?type=${result.type}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Result View ──────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const data = RESULTS[lang][result.type]
    const { scores: s } = result
    const chartData = [
      { dim: t.chartEI, value: dimPct(s.E, s.I), label: `E ${dimPct(s.E, s.I)}%` },
      { dim: t.chartSN, value: dimPct(s.S, s.N), label: `S ${dimPct(s.S, s.N)}%` },
      { dim: t.chartTF, value: dimPct(s.T, s.F), label: `T ${dimPct(s.T, s.F)}%` },
      { dim: t.chartJP, value: dimPct(s.J, s.P), label: `J ${dimPct(s.J, s.P)}%` },
    ]

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{t.resultTitle}</p>
          <div className="inline-block bg-primary text-primary-foreground text-4xl font-black px-6 py-2 rounded-lg">
            {result.type}
          </div>
          <p className="text-xl font-bold">{data.name}</p>
        </div>

        {/* Radar Chart */}
        <div className="bg-card border rounded-xl p-4">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Radar name="score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip formatter={((v: number) => `${v}%`) as any} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Love Style */}
        <div className="bg-card border rounded-xl p-5 space-y-2">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{t.loveStyle}</h3>
          <p className="text-sm leading-relaxed">{data.loveStyle}</p>
        </div>

        {/* Ideal Partners + Love Languages */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{t.idealPartners}</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.idealPartners.map(p => (
                <span key={p} className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">{p}</span>
              ))}
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{t.loveLanguages}</h3>
            <div className="space-y-1">
              {data.loveLanguages.map(l => (
                <p key={l} className="text-xs">{l}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card border rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-green-600">{t.strengths}</h3>
            <ul className="space-y-1">
              {data.strengths.map((s, i) => (
                <li key={i} className="text-xs flex gap-1.5"><span className="text-green-500 mt-0.5">✓</span>{s}</li>
              ))}
            </ul>
          </div>
          <div className="bg-card border rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-600">{t.weaknesses}</h3>
            <ul className="space-y-1">
              {data.weaknesses.map((w, i) => (
                <li key={i} className="text-xs flex gap-1.5"><span className="text-amber-500 mt-0.5">△</span>{w}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Dating Tip */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-1">
          <h3 className="font-bold text-sm text-primary">{t.datingTip}</h3>
          <p className="text-sm leading-relaxed">{data.datingTip}</p>
        </div>

        {/* Caution */}
        <div className="bg-card border rounded-xl p-4 space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{t.caution}</h3>
          <ul className="space-y-1">
            {data.cautionPoints.map((c, i) => (
              <li key={i} className="text-xs flex gap-1.5"><span className="text-muted-foreground">·</span>{c}</li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={restart}
            className="flex-1 border border-border rounded-lg py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {t.retake}
          </button>
          <button
            onClick={shareResult}
            className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {copied ? t.copied : t.share}
          </button>
        </div>
      </div>
    )
  }

  // ── Test View ────────────────────────────────────────────────────────────────
  const progress = Math.round((current / questions.length) * 100)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{t.title}</p>
        <p className="text-sm text-muted-foreground">{t.instructions}</p>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t.progress(current + 1, questions.length)}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold leading-snug">{q.text}</h2>
        <div className="space-y-2">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => pick(idx)}
              disabled={selected !== null}
              className={[
                'w-full text-left rounded-xl border px-5 py-4 text-sm leading-snug transition-colors',
                selected === idx
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : selected !== null
                  ? 'border-border bg-card text-muted-foreground opacity-50'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50',
              ].join(' ')}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
