import { useState } from 'react'

type Chronotype = 'lion' | 'bear' | 'wolf' | 'dolphin'
type SupportedLang = 'ko' | 'en' | 'ja'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

interface Option { type: Chronotype; text: string }
interface Question { id: string; text: string; options: Option[] }
interface ResultData {
  title: string
  subtitle: string
  description: string
  optimalSleep: string
  traits: string[]
  tips: string[]
}

const LABELS: Record<SupportedLang, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  restart: string
  share: string
  shareMsg: string
  yourType: string
  optimalSleep: string
  traits: string
  tips: string
  note: string
}> = {
  ko: {
    title: '수면 크로노타입 테스트',
    subtitle: '나는 사자형, 곰형, 늑대형, 돌고래형?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 수면 크로노타입은',
    yourType: '나의 크로노타입',
    optimalSleep: '최적 수면 시간',
    traits: '주요 특성',
    tips: '실천 팁',
    note: '이 테스트는 Dr. Michael Breus의 크로노타입 모델을 기반으로 합니다. 전문적 진단을 대체하지 않습니다.',
  },
  en: {
    title: 'Sleep Chronotype Test',
    subtitle: 'Are You a Lion, Bear, Wolf, or Dolphin?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My sleep chronotype is',
    yourType: 'Your Chronotype',
    optimalSleep: 'Optimal Sleep Window',
    traits: 'Key Traits',
    tips: 'Practical Tips',
    note: 'Based on Dr. Michael Breus\'s chronotype model. Not a substitute for professional diagnosis.',
  },
  ja: {
    title: '睡眠クロノタイプテスト',
    subtitle: 'ライオン型、クマ型、オオカミ型、イルカ型？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の睡眠クロノタイプは',
    yourType: '私のクロノタイプ',
    optimalSleep: '最適な睡眠時間帯',
    traits: '主な特性',
    tips: '実践アドバイス',
    note: 'Dr. Michael Breusのクロノタイプモデルに基づいています。専門的診断の代替ではありません。',
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    {
      id: 'q1', text: '알람 없이 자연스럽게 일어나는 시간은?',
      options: [
        { type: 'lion', text: '오전 5–6시' },
        { type: 'bear', text: '오전 7–8시' },
        { type: 'wolf', text: '오전 9–10시 이후' },
        { type: 'dolphin', text: '시간이 불규칙하고 항상 피곤하다' },
      ],
    },
    {
      id: 'q2', text: '가장 집중력이 높은 시간대는?',
      options: [
        { type: 'lion', text: '오전 8–10시' },
        { type: 'bear', text: '오전 10시–오후 2시' },
        { type: 'wolf', text: '오후 6시 이후' },
        { type: 'dolphin', text: '특정 시간 없이 들쑥날쑥하다' },
      ],
    },
    {
      id: 'q3', text: '주말 아침 자유 시간이 생기면...',
      options: [
        { type: 'lion', text: '평소와 같은 시간에 일어나 아침을 즐긴다' },
        { type: 'bear', text: '평소보다 1–2시간 늦게 일어난다' },
        { type: 'wolf', text: '가능한 한 늦게까지 잔다' },
        { type: 'dolphin', text: '오래 자도 개운하지 않다' },
      ],
    },
    {
      id: 'q4', text: '저녁 식사 후 에너지 상태는?',
      options: [
        { type: 'lion', text: '피곤해지고 일찍 잠자리에 들고 싶다' },
        { type: 'bear', text: '여전히 활동적이지만 밤 10시쯤 졸리다' },
        { type: 'wolf', text: '오히려 활기차지고 창의력이 올라간다' },
        { type: 'dolphin', text: '일정하지 않고 피로감이 지속된다' },
      ],
    },
    {
      id: 'q5', text: '잠드는 데 걸리는 시간은?',
      options: [
        { type: 'lion', text: '누으면 금방 잠든다 (5–10분)' },
        { type: 'bear', text: '15–20분 정도 걸린다' },
        { type: 'wolf', text: '30분 이상 걸리거나 밤늦게야 잠온다' },
        { type: 'dolphin', text: '잠들기 어렵고 자다가 자주 깬다' },
      ],
    },
    {
      id: 'q6', text: '가장 선호하는 회의/약속 시간대는?',
      options: [
        { type: 'lion', text: '이른 오전 (8–10시)' },
        { type: 'bear', text: '오전 중반~점심 (10시~12시)' },
        { type: 'wolf', text: '오후 늦게~저녁 (5시 이후)' },
        { type: 'dolphin', text: '스케줄 자체가 스트레스다' },
      ],
    },
    {
      id: 'q7', text: '아침에 일어났을 때의 상태는?',
      options: [
        { type: 'lion', text: '바로 활기차게 하루를 시작할 수 있다' },
        { type: 'bear', text: '15–30분이면 완전히 깨어난다' },
        { type: 'wolf', text: '오전 내내 안개 속에 있는 것 같다' },
        { type: 'dolphin', text: '제대로 잔 것 같지 않아 항상 피곤하다' },
      ],
    },
    {
      id: 'q8', text: '밤 11시에 재미있는 파티가 시작된다면...',
      options: [
        { type: 'lion', text: '이미 졸려서 일찍 자거나 피하고 싶다' },
        { type: 'bear', text: '참석하지만 자정쯤 집에 가고 싶다' },
        { type: 'wolf', text: '밤이 깊을수록 더 즐거워진다' },
        { type: 'dolphin', text: '가고 싶지만 다음 날 피로가 걱정된다' },
      ],
    },
    {
      id: 'q9', text: '창의적인 작업이나 글쓰기를 할 때 최고 컨디션은?',
      options: [
        { type: 'lion', text: '이른 아침' },
        { type: 'bear', text: '오전 중반' },
        { type: 'wolf', text: '저녁이나 늦은 밤' },
        { type: 'dolphin', text: '예측 불가 — 가끔 밤에, 가끔 새벽에' },
      ],
    },
    {
      id: 'q10', text: '커피나 카페인 의존도는?',
      options: [
        { type: 'lion', text: '거의 필요 없다' },
        { type: 'bear', text: '아침에 1–2잔 정도' },
        { type: 'wolf', text: '오후에도 마신다' },
        { type: 'dolphin', text: '없으면 하루를 버티기 힘들다' },
      ],
    },
    {
      id: 'q11', text: '여행지에서 시차 적응은?',
      options: [
        { type: 'lion', text: '현지 시간에 빠르게 적응한다' },
        { type: 'bear', text: '며칠이면 괜찮아진다' },
        { type: 'wolf', text: '오히려 야간 시간대가 있는 곳이 편하다' },
        { type: 'dolphin', text: '시차와 상관없이 항상 잠을 못 잔다' },
      ],
    },
    {
      id: 'q12', text: '운동하기 가장 좋은 시간은?',
      options: [
        { type: 'lion', text: '이른 아침' },
        { type: 'bear', text: '오전 늦게~점심 전후' },
        { type: 'wolf', text: '오후 늦게~저녁' },
        { type: 'dolphin', text: '운동해도 잠이 안 오거나 너무 각성된다' },
      ],
    },
    {
      id: 'q13', text: '이상적인 취침 시간은?',
      options: [
        { type: 'lion', text: '오후 9시–10시' },
        { type: 'bear', text: '밤 10시–11시' },
        { type: 'wolf', text: '자정 이후' },
        { type: 'dolphin', text: '규칙적인 취침 시간을 유지하기 어렵다' },
      ],
    },
    {
      id: 'q14', text: '낮잠에 대한 나의 태도는?',
      options: [
        { type: 'lion', text: '낮잠을 자면 오히려 밤 수면이 방해된다' },
        { type: 'bear', text: '20–30분 낮잠으로 오후 활력을 찾는다' },
        { type: 'wolf', text: '낮잠을 자면 오후를 완전히 날릴 것 같아 무섭다' },
        { type: 'dolphin', text: '낮잠을 자고 싶지만 자도 개운하지 않다' },
      ],
    },
    {
      id: 'q15', text: '밤에 할 일 목록을 보면...',
      options: [
        { type: 'lion', text: '내일 아침 일찍 시작하면 다 할 수 있겠다' },
        { type: 'bear', text: '저녁에 일부 처리하고 내일 마무리하면 된다' },
        { type: 'wolf', text: '밤에 하는 게 훨씬 잘 된다' },
        { type: 'dolphin', text: '걱정이 앞서 잠을 못 잘 것 같다' },
      ],
    },
    {
      id: 'q16', text: '주중 vs 주말 수면 패턴은?',
      options: [
        { type: 'lion', text: '거의 같다' },
        { type: 'bear', text: '주말에 1–2시간 늦게 잔다' },
        { type: 'wolf', text: '주말엔 훨씬 늦게 자고 늦게 일어난다' },
        { type: 'dolphin', text: '주중이든 주말이든 잠을 제대로 못 잔다' },
      ],
    },
  ],
  en: [
    {
      id: 'q1', text: 'When do you naturally wake up without an alarm?',
      options: [
        { type: 'lion', text: '5–6 AM' },
        { type: 'bear', text: '7–8 AM' },
        { type: 'wolf', text: '9–10 AM or later' },
        { type: 'dolphin', text: 'Irregular — and always tired' },
      ],
    },
    {
      id: 'q2', text: 'When is your peak focus and concentration?',
      options: [
        { type: 'lion', text: '8–10 AM' },
        { type: 'bear', text: '10 AM–2 PM' },
        { type: 'wolf', text: 'After 6 PM' },
        { type: 'dolphin', text: 'No consistent peak — it varies erratically' },
      ],
    },
    {
      id: 'q3', text: 'On a free weekend morning, you...',
      options: [
        { type: 'lion', text: 'Wake at your usual time and enjoy the morning' },
        { type: 'bear', text: 'Sleep 1–2 hours later than usual' },
        { type: 'wolf', text: 'Sleep in as long as possible' },
        { type: 'dolphin', text: 'Sleep long but still feel unrefreshed' },
      ],
    },
    {
      id: 'q4', text: 'Your energy level after dinner?',
      options: [
        { type: 'lion', text: 'Getting tired — ready for bed soon' },
        { type: 'bear', text: 'Still active but sleepy around 10 PM' },
        { type: 'wolf', text: 'Energized — creativity peaks at night' },
        { type: 'dolphin', text: 'Inconsistent and persistently fatigued' },
      ],
    },
    {
      id: 'q5', text: 'How long does it take you to fall asleep?',
      options: [
        { type: 'lion', text: 'Almost immediately (5–10 min)' },
        { type: 'bear', text: 'About 15–20 minutes' },
        { type: 'wolf', text: '30+ minutes, or only late at night' },
        { type: 'dolphin', text: 'Difficult to fall asleep and I wake often' },
      ],
    },
    {
      id: 'q6', text: 'Your preferred meeting or appointment time?',
      options: [
        { type: 'lion', text: 'Early morning (8–10 AM)' },
        { type: 'bear', text: 'Mid-morning to lunch (10 AM–12 PM)' },
        { type: 'wolf', text: 'Late afternoon or evening (after 5 PM)' },
        { type: 'dolphin', text: 'Scheduling itself is stressful' },
      ],
    },
    {
      id: 'q7', text: 'How do you feel when you first wake up?',
      options: [
        { type: 'lion', text: 'Alert and ready to go immediately' },
        { type: 'bear', text: 'Fully awake within 15–30 minutes' },
        { type: 'wolf', text: 'Foggy all morning' },
        { type: 'dolphin', text: 'Always tired regardless of sleep duration' },
      ],
    },
    {
      id: 'q8', text: 'A fun party starts at 11 PM — you...',
      options: [
        { type: 'lion', text: 'Skip it — already sleepy by then' },
        { type: 'bear', text: 'Attend but want to leave around midnight' },
        { type: 'wolf', text: 'Get more energized as the night goes on' },
        { type: 'dolphin', text: 'Want to go but worry about next-day fatigue' },
      ],
    },
    {
      id: 'q9', text: 'When are you at your creative or writing best?',
      options: [
        { type: 'lion', text: 'Early morning' },
        { type: 'bear', text: 'Mid-morning' },
        { type: 'wolf', text: 'Evening or late at night' },
        { type: 'dolphin', text: 'Unpredictable — sometimes midnight, sometimes dawn' },
      ],
    },
    {
      id: 'q10', text: 'Your caffeine dependency?',
      options: [
        { type: 'lion', text: 'Rarely need it' },
        { type: 'bear', text: '1–2 cups in the morning' },
        { type: 'wolf', text: 'Drink it into the afternoon' },
        { type: 'dolphin', text: 'Can\'t function without it' },
      ],
    },
    {
      id: 'q11', text: 'How do you handle jet lag when traveling?',
      options: [
        { type: 'lion', text: 'Adapt to local time quickly' },
        { type: 'bear', text: 'Usually fine within a few days' },
        { type: 'wolf', text: 'Actually feel better in later time zones' },
        { type: 'dolphin', text: 'Sleep poorly regardless of time zone' },
      ],
    },
    {
      id: 'q12', text: 'Your best time to exercise?',
      options: [
        { type: 'lion', text: 'Early morning' },
        { type: 'bear', text: 'Late morning or around lunch' },
        { type: 'wolf', text: 'Late afternoon or evening' },
        { type: 'dolphin', text: 'Exercise leaves me too wired to sleep' },
      ],
    },
    {
      id: 'q13', text: 'Your ideal bedtime?',
      options: [
        { type: 'lion', text: '9–10 PM' },
        { type: 'bear', text: '10–11 PM' },
        { type: 'wolf', text: 'Past midnight' },
        { type: 'dolphin', text: 'Hard to maintain a consistent bedtime' },
      ],
    },
    {
      id: 'q14', text: 'Your attitude toward napping?',
      options: [
        { type: 'lion', text: 'Naps disrupt my night sleep' },
        { type: 'bear', text: 'A 20–30 min nap refreshes my afternoon' },
        { type: 'wolf', text: 'Afraid napping will ruin my whole afternoon' },
        { type: 'dolphin', text: 'I nap but still wake up tired' },
      ],
    },
    {
      id: 'q15', text: 'Looking at your to-do list at night, you think...',
      options: [
        { type: 'lion', text: 'I\'ll tackle it early tomorrow morning' },
        { type: 'bear', text: 'Get some done tonight, finish tomorrow' },
        { type: 'wolf', text: 'Night is when I do my best work' },
        { type: 'dolphin', text: 'Worrying about it will keep me awake' },
      ],
    },
    {
      id: 'q16', text: 'Your weekday vs weekend sleep pattern?',
      options: [
        { type: 'lion', text: 'Nearly identical' },
        { type: 'bear', text: '1–2 hours later on weekends' },
        { type: 'wolf', text: 'Much later to bed and up on weekends' },
        { type: 'dolphin', text: 'Poor sleep regardless of the day' },
      ],
    },
  ],
  ja: [
    {
      id: 'q1', text: 'アラームなしで自然に目覚める時間は？',
      options: [
        { type: 'lion', text: '午前5–6時' },
        { type: 'bear', text: '午前7–8時' },
        { type: 'wolf', text: '午前9–10時以降' },
        { type: 'dolphin', text: '時間が不規則でいつも疲れている' },
      ],
    },
    {
      id: 'q2', text: '最も集中力が高い時間帯は？',
      options: [
        { type: 'lion', text: '午前8–10時' },
        { type: 'bear', text: '午前10時〜午後2時' },
        { type: 'wolf', text: '午後6時以降' },
        { type: 'dolphin', text: '決まった時間がなくバラバラ' },
      ],
    },
    {
      id: 'q3', text: '週末の朝に自由な時間ができたら…',
      options: [
        { type: 'lion', text: '普段通りの時間に起きて朝を楽しむ' },
        { type: 'bear', text: '普段より1–2時間遅く起きる' },
        { type: 'wolf', text: 'できる限り遅くまで寝る' },
        { type: 'dolphin', text: '長く寝ても疲れが取れない' },
      ],
    },
    {
      id: 'q4', text: '夕食後のエネルギー状態は？',
      options: [
        { type: 'lion', text: '疲れてきて早く寝たくなる' },
        { type: 'bear', text: 'まだ活動的だが夜10時頃眠くなる' },
        { type: 'wolf', text: '逆に活力が増し創造力が上がる' },
        { type: 'dolphin', text: '一定でなく疲労感が続く' },
      ],
    },
    {
      id: 'q5', text: '眠りにつくまでどのくらいかかりますか？',
      options: [
        { type: 'lion', text: 'すぐ眠れる（5–10分）' },
        { type: 'bear', text: '15–20分程度' },
        { type: 'wolf', text: '30分以上、または深夜になってから' },
        { type: 'dolphin', text: 'なかなか眠れず夜中に何度も目が覚める' },
      ],
    },
    {
      id: 'q6', text: '会議やアポの希望時間帯は？',
      options: [
        { type: 'lion', text: '早朝（8–10時）' },
        { type: 'bear', text: '午前中〜昼（10時〜12時）' },
        { type: 'wolf', text: '夕方〜夜（17時以降）' },
        { type: 'dolphin', text: 'スケジュール自体がストレス' },
      ],
    },
    {
      id: 'q7', text: '朝起きたときの状態は？',
      options: [
        { type: 'lion', text: 'すぐ活発に動き出せる' },
        { type: 'bear', text: '15–30分で完全に目が覚める' },
        { type: 'wolf', text: '午前中ずっと頭がぼんやりしている' },
        { type: 'dolphin', text: 'ちゃんと寝た気がしなくていつも疲れている' },
      ],
    },
    {
      id: 'q8', text: '夜11時に楽しいパーティが始まるとしたら…',
      options: [
        { type: 'lion', text: 'もう眠いので早めに寝るか避けたい' },
        { type: 'bear', text: '参加するが深夜0時頃には帰りたい' },
        { type: 'wolf', text: '夜が深まるほど楽しくなる' },
        { type: 'dolphin', text: '行きたいが翌日の疲労が心配' },
      ],
    },
    {
      id: 'q9', text: 'クリエイティブな作業や文章を書くベストタイムは？',
      options: [
        { type: 'lion', text: '早朝' },
        { type: 'bear', text: '午前中' },
        { type: 'wolf', text: '夕方や深夜' },
        { type: 'dolphin', text: '予測不可能 — 時に深夜、時に明け方' },
      ],
    },
    {
      id: 'q10', text: 'カフェインへの依存度は？',
      options: [
        { type: 'lion', text: 'ほとんど必要ない' },
        { type: 'bear', text: '朝に1–2杯程度' },
        { type: 'wolf', text: '午後も飲む' },
        { type: 'dolphin', text: 'ないと一日が乗り越えられない' },
      ],
    },
    {
      id: 'q11', text: '旅行先での時差ぼけは？',
      options: [
        { type: 'lion', text: '現地時間にすぐ慣れる' },
        { type: 'bear', text: '数日で慣れる' },
        { type: 'wolf', text: 'むしろ夜型の時間帯が楽' },
        { type: 'dolphin', text: '時差に関係なくいつも眠れない' },
      ],
    },
    {
      id: 'q12', text: '運動に最適な時間は？',
      options: [
        { type: 'lion', text: '早朝' },
        { type: 'bear', text: '午前遅め〜昼前後' },
        { type: 'wolf', text: '夕方遅め〜夜' },
        { type: 'dolphin', text: '運動すると眠れなくなるか過覚醒になる' },
      ],
    },
    {
      id: 'q13', text: '理想的な就寝時間は？',
      options: [
        { type: 'lion', text: '午後9–10時' },
        { type: 'bear', text: '夜10–11時' },
        { type: 'wolf', text: '深夜以降' },
        { type: 'dolphin', text: '規則的な就寝時間を維持しにくい' },
      ],
    },
    {
      id: 'q14', text: '昼寝に対する姿勢は？',
      options: [
        { type: 'lion', text: '昼寝すると夜の睡眠が乱れる' },
        { type: 'bear', text: '20–30分の昼寝で午後の活力が戻る' },
        { type: 'wolf', text: '昼寝したら午後を丸ごと無駄にしそうで怖い' },
        { type: 'dolphin', text: '昼寝しても疲れが取れない' },
      ],
    },
    {
      id: 'q15', text: '夜にToDoリストを見ると…',
      options: [
        { type: 'lion', text: '明日の朝早く始めれば全部できる' },
        { type: 'bear', text: '今夜一部やって明日仕上げればいい' },
        { type: 'wolf', text: '夜の方がはかどる' },
        { type: 'dolphin', text: '心配で眠れなくなりそう' },
      ],
    },
    {
      id: 'q16', text: '平日と週末の睡眠パターンは？',
      options: [
        { type: 'lion', text: 'ほぼ同じ' },
        { type: 'bear', text: '週末は1–2時間遅く寝る' },
        { type: 'wolf', text: '週末はかなり遅く寝て遅く起きる' },
        { type: 'dolphin', text: '平日も週末もちゃんと眠れない' },
      ],
    },
  ],
}

const RESULTS: Record<Chronotype, Record<SupportedLang, ResultData>> = {
  lion: {
    ko: {
      title: '🦁 사자형',
      subtitle: '이른 아침을 지배하는 리더',
      description: '새벽에 가장 명료하고 생산적입니다. 목표 지향적이고 규칙적인 생활을 선호하며, 다른 사람들이 잠든 새벽에 최고의 성과를 냅니다.',
      optimalSleep: '오후 10시 ~ 오전 6시',
      traits: ['아침형 인간', '규칙적·예측 가능한 생활', '목표 지향적', '이른 저녁부터 에너지 저하'],
      tips: ['저녁 약속이 많은 사람들을 이해하는 마음 갖기', '늦은 야간 활동 시 이튿날 회복 시간 확보', '오후 2시 이후 카페인 자제', '취침 전 스크린 사용 최소화'],
    },
    en: {
      title: '🦁 Lion',
      subtitle: 'The early-morning leader',
      description: 'You are sharpest and most productive in the early hours. Goal-driven, disciplined, and consistent — you achieve your best work while others are still asleep.',
      optimalSleep: '10 PM – 6 AM',
      traits: ['True morning person', 'Consistent, predictable schedule', 'Goal-oriented achiever', 'Energy fades in the evening'],
      tips: ['Be patient with night owls in your life', 'Buffer recovery time after late-night events', 'Avoid caffeine after 2 PM', 'Minimize screens before your early bedtime'],
    },
    ja: {
      title: '🦁 ライオン型',
      subtitle: '早朝を制するリーダー',
      description: '早朝に最も明晰で生産性が高まります。目標志向で規律正しく、他の人が眠っている時間帯に最高のパフォーマンスを発揮します。',
      optimalSleep: '午後10時〜午前6時',
      traits: ['完全な朝型人間', '規則的で予測可能な生活', '目標志向', '夕方にエネルギーが低下'],
      tips: ['夜型の人への理解を深める', '遅い夜間活動後の翌日に回復時間を確保する', '午後2時以降のカフェインを控える', '早い就寝前のスクリーン使用を最小限に'],
    },
  },
  bear: {
    ko: {
      title: '🐻 곰형',
      subtitle: '태양 리듬을 따르는 균형인',
      description: '가장 일반적인 수면 유형입니다. 사회적 리듬과 잘 맞고, 9–5 시스템에 자연스럽게 적응합니다. 유연하고 사교적인 성격으로 다양한 상황에 적응력이 높습니다.',
      optimalSleep: '오후 11시 ~ 오전 7시',
      traits: ['유연하고 적응력 높음', '사교적', '중간 수준의 안정적 생산성', '점심 후 에너지 소폭 저하'],
      tips: ['점심 후 에너지 저하 시 10–20분 파워냅이 효과적', '오전 중반 중요 업무 배치', '오후 1–3시 루틴 작업 처리', '주말 수면 과도한 연장 주의'],
    },
    en: {
      title: '🐻 Bear',
      subtitle: 'The balanced solar-rhythm follower',
      description: 'The most common chronotype. You sync naturally with the sun and social schedules, thriving in typical 9-to-5 structures. Adaptable, social, and consistently productive throughout the day.',
      optimalSleep: '11 PM – 7 AM',
      traits: ['Flexible and adaptable', 'Social and cooperative', 'Stable mid-range productivity', 'Slight energy dip after lunch'],
      tips: ['A 10–20 min power nap combats the post-lunch slump', 'Schedule important tasks for mid-morning', 'Use 1–3 PM for routine work', 'Avoid oversleeping on weekends'],
    },
    ja: {
      title: '🐻 クマ型',
      subtitle: '太陽のリズムに従うバランス型',
      description: '最も一般的なクロノタイプです。社会的なリズムや9–5のスケジュールに自然に合います。柔軟で社交的、安定した生産性を発揮します。',
      optimalSleep: '午後11時〜午前7時',
      traits: ['柔軟で適応力が高い', '社交的で協調性がある', '安定した中程度の生産性', '昼食後にエネルギーが少し低下'],
      tips: ['昼食後の眠気に10–20分のパワーナップが効果的', '重要な作業は午前中に配置', '午後1–3時はルーティン作業に', '週末の寝過ぎに注意'],
    },
  },
  wolf: {
    ko: {
      title: '🐺 늑대형',
      subtitle: '밤을 사랑하는 창의적 야행성',
      description: '저녁에 창의력과 에너지가 정점에 달합니다. 즉흥적이고 독창적인 성향이 강하며, 사회적 기대와 생체 리듬이 충돌할 수 있어 유연한 근무 환경이 이상적입니다.',
      optimalSleep: '자정 ~ 오전 8시',
      traits: ['창의적·즉흥적', '야행성', '저녁에 에너지 최고조', '아침 적응 느림'],
      tips: ['9–5 시스템이 어렵다면 유연 근무 활용', '커피는 오후 2시 전에만', '중요한 결정은 오전이 아닌 오후에', '수면 시간이 사회와 맞지 않아도 자신을 탓하지 말 것'],
    },
    en: {
      title: '🐺 Wolf',
      subtitle: 'The creative night owl',
      description: 'Your creativity and energy peak in the evening. Spontaneous and original, you thrive after sundown. The clash between your biology and social schedules can be real — flexible work arrangements are your best friend.',
      optimalSleep: 'Midnight – 8 AM',
      traits: ['Creative and spontaneous', 'Night owl by nature', 'Peak energy in the evening', 'Slow to adapt in the morning'],
      tips: ['Advocate for flexible hours if a 9–5 is draining you', 'Cut off caffeine by 2 PM', 'Reserve important decisions for afternoon', 'Your late schedule is biological, not a character flaw'],
    },
    ja: {
      title: '🐺 オオカミ型',
      subtitle: '夜を愛するクリエイティブな夜型',
      description: '夕方から夜にかけて創造力とエネルギーが最高潮になります。即興的で独創的な性格で、夜に最も輝きます。社会的スケジュールと生体リズムが合わないことがあるため、柔軟な働き方が理想的です。',
      optimalSleep: '深夜〜午前8時',
      traits: ['クリエイティブで即興的', '典型的な夜型', '夕方〜夜にエネルギーが最高潮', '朝の適応が遅い'],
      tips: ['9–5が辛ければフレックス勤務を活用する', 'カフェインは午後2時まで', '重要な判断は午後に', '夜型は性格の問題ではなく生物学的なもの'],
    },
  },
  dolphin: {
    ko: {
      title: '🐬 돌고래형',
      subtitle: '예민한 감각의 가벼운 잠꾼',
      description: '수면 효율이 낮고 불안 성향이 있어 쉽게 잠들거나 깊이 잠들기 어렵습니다. 지적이고 예민하며 완벽주의적 성향이 있습니다. 수면 위생 관리가 다른 유형보다 훨씬 중요합니다.',
      optimalSleep: '오전 11시 30분 ~ 오전 6시 30분 (권장)',
      traits: ['지적·예민·완벽주의', '수면 효율 낮음', '불안 성향', '낮 동안 피로 지속'],
      tips: ['취침 1시간 전 화면 끄기', '침실 온도 낮추기 (18–19°C)', '수면 루틴 엄격히 지키기', '카페인을 정오 이후 완전 차단', '수면 전문가 상담 고려'],
    },
    en: {
      title: '🐬 Dolphin',
      subtitle: 'The light, anxious sleeper',
      description: 'Light sleep efficiency, anxiety tendencies, and difficulty staying asleep characterize this type. Highly intelligent and perfectionistic, you are often alert when you should be asleep. Sleep hygiene is far more critical for you than for other types.',
      optimalSleep: '11:30 PM – 6:30 AM (recommended)',
      traits: ['Intellectual, sensitive, perfectionist', 'Low sleep efficiency', 'Anxiety-prone', 'Persistent daytime fatigue'],
      tips: ['Turn off all screens 1 hour before bed', 'Keep your bedroom cool (65–67°F / 18–19°C)', 'Maintain a strict sleep routine', 'Cut off caffeine entirely after noon', 'Consider consulting a sleep specialist'],
    },
    ja: {
      title: '🐬 イルカ型',
      subtitle: '繊細な感覚を持つ軽眠者',
      description: '睡眠効率が低く不安傾向があり、眠りにつくのも深く眠るのも難しいタイプです。知的で繊細な完璧主義者が多く、眠るべき時間に過覚醒になりがちです。睡眠衛生の管理が他のどのタイプよりも重要です。',
      optimalSleep: '午後11時30分〜午前6時30分（推奨）',
      traits: ['知的・繊細・完璧主義', '睡眠効率が低い', '不安傾向あり', '日中の疲労が続く'],
      tips: ['就寝1時間前にすべての画面をオフ', '寝室の温度を低めに保つ（18–19°C）', '厳格な睡眠ルーティンを維持', '正午以降のカフェインを完全にカット', '睡眠専門家への相談を検討'],
    },
  },
}

const TYPE_COLORS: Record<Chronotype, string> = {
  lion: '#f59e0b',
  bear: '#84cc16',
  wolf: '#6366f1',
  dolphin: '#06b6d4',
}

interface Props { locale?: string }

export default function SleepChronotypeTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'ko')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [counts, setCounts] = useState<Record<Chronotype, number>>({ lion: 0, bear: 0, wolf: 0, dolphin: 0 })
  const [result, setResult] = useState<Chronotype | null>(null)

  function calcResult(c: Record<Chronotype, number>): Chronotype {
    const types: Chronotype[] = ['lion', 'bear', 'wolf', 'dolphin']
    return types.reduce((best, t) => c[t] > c[best] ? t : best, 'bear' as Chronotype)
  }

  function pick(type: Chronotype) {
    const newCounts = { ...counts, [type]: counts[type] + 1 }
    setCounts(newCounts)
    if (current + 1 >= questions.length) {
      setResult(calcResult(newCounts))
    }
    setCurrent(current + 1)
  }

  function restart() {
    setCurrent(0)
    setCounts({ lion: 0, bear: 0, wolf: 0, dolphin: 0 })
    setResult(null)
  }

  function share() {
    if (!result) return
    const url = window.location.href
    const text = `${lb.shareMsg} — ${RESULTS[result][locale].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= questions.length
  const progress = Math.round((current / questions.length) * 100)

  if (!finished) {
    const q = questions[current]
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
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
            className="h-2 rounded-full bg-muted overflow-hidden"
          >
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-lg font-bold">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt.type)}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3"
              aria-label={opt.text}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-none text-white"
                style={{ backgroundColor: TYPE_COLORS[opt.type] }}
              >
                {i + 1}
              </span>
              {opt.text}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  if (!result) return null
  const r = RESULTS[result][locale]
  const color = TYPE_COLORS[result]
  const total = Object.values(counts).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div
          className="inline-block rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {r.title}
        </div>
        <p className="font-bold text-muted-foreground">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        {(['lion', 'bear', 'wolf', 'dolphin'] as Chronotype[]).map((t) => {
          const pct = total > 0 ? Math.round((counts[t] / total) * 100) : 0
          return (
            <div key={t} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: TYPE_COLORS[t] }}>
                  {RESULTS[t][locale].title}
                </span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 rounded-full bg-muted overflow-hidden"
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[t] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm">{lb.optimalSleep}</h3>
        <p className="text-sm text-muted-foreground">{r.optimalSleep}</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm">{lb.traits}</h3>
        <ul className="space-y-1">
          {r.traits.map(t => (
            <li key={t} className="text-sm text-muted-foreground flex gap-2">
              <span style={{ color }}>•</span>{t}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-600">{lb.tips}</h3>
        <ul className="space-y-1">
          {r.tips.map(tip => (
            <li key={tip} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-500">→</span>{tip}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

      <div className="flex gap-3">
        <button
          onClick={restart}
          className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors"
          aria-label={lb.restart}
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
          aria-label={lb.share}
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
