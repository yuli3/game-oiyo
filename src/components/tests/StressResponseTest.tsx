import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja'
type ResponseType = 'fight' | 'flight' | 'freeze' | 'fawn'

function lang(lp: string): Locale {
  return (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
}

interface TypeData {
  name: string
  keyword: string
  color: string
  emoji: string
  description: string
  bodySignals: string[]
  tips: string[]
  affirmation: string
}

const TYPE_DATA: Record<ResponseType, Record<Locale, TypeData>> = {
  fight: {
    ko: {
      name: '투쟁 반응', keyword: '싸움',
      color: '#ef4444',
      emoji: '🔥',
      description: '당신은 스트레스 상황에서 맞서 싸우는 반응을 보입니다. 위협이 느껴지면 공격적이거나 지배적인 행동으로 대응하려 합니다. 강한 의지와 용기의 표현이지만, 조절이 필요합니다.',
      bodySignals: ['심박수 증가', '근육 긴장', '목소리가 커짐', '주먹을 쥐거나 턱이 굳음'],
      tips: ['심호흡으로 즉각 반응을 늦추기', '신체 활동으로 에너지 방출', '반응하기 전 10초 기다리기', '자신의 분노 트리거 파악하기'],
      affirmation: '나의 강함은 통제될 때 가장 빛납니다.',
    },
    en: {
      name: 'Fight Response', keyword: 'Fight',
      color: '#ef4444',
      emoji: '🔥',
      description: 'You tend to confront and fight back under stress. When threatened, you respond with aggressive or dominant behavior. It reflects strong will and courage, but needs modulation.',
      bodySignals: ['Increased heart rate', 'Muscle tension', 'Louder voice', 'Clenched fists or jaw'],
      tips: ['Slow immediate reactions with deep breathing', 'Release energy through physical activity', 'Wait 10 seconds before responding', 'Identify your anger triggers'],
      affirmation: 'My strength shines brightest when controlled.',
    },
    ja: {
      name: '闘争反応', keyword: '戦い',
      color: '#ef4444',
      emoji: '🔥',
      description: 'あなたはストレス状況で立ち向かう反応を示します。脅威を感じると攻撃的または支配的な行動で対応しようとします。強い意志と勇気の表れですが、調整が必要です。',
      bodySignals: ['心拍数の増加', '筋肉の緊張', '声が大きくなる', '拳を握る・顎が固くなる'],
      tips: ['深呼吸で即座の反応を遅らせる', '身体活動でエネルギーを発散', '反応する前に10秒待つ', '自分の怒りのトリガーを把握する'],
      affirmation: '私の強さはコントロールされた時に最も輝きます。',
    },
  },
  flight: {
    ko: {
      name: '도피 반응', keyword: '도망',
      color: '#f97316',
      emoji: '💨',
      description: '당신은 스트레스 상황에서 피하거나 도망치는 반응을 보입니다. 위협을 피함으로써 안전을 찾으려 하며, 과도한 계획, 과로, 회피 행동이 나타날 수 있습니다.',
      bodySignals: ['불안과 안절부절', '빠른 호흡', '끊임없는 바쁨', '회피와 탈출 충동'],
      tips: ['안전하다는 것을 몸에 알려주기', '상황을 피하지 말고 직면해보기', '그라운딩 기법 연습', '불안의 원인 일지 작성'],
      affirmation: '나는 지금 안전합니다. 여기에 머물러도 됩니다.',
    },
    en: {
      name: 'Flight Response', keyword: 'Escape',
      color: '#f97316',
      emoji: '💨',
      description: 'You tend to avoid or flee stressful situations. You seek safety by avoiding threats, which can manifest as excessive planning, overwork, or avoidance behaviors.',
      bodySignals: ['Anxiety and restlessness', 'Rapid breathing', 'Constant busyness', 'Urge to avoid and escape'],
      tips: ['Tell your body you are safe', 'Try to face rather than avoid situations', 'Practice grounding techniques', 'Journal about the causes of anxiety'],
      affirmation: 'I am safe right now. It is okay to stay here.',
    },
    ja: {
      name: '逃走反応', keyword: '逃げ',
      color: '#f97316',
      emoji: '💨',
      description: 'あなたはストレス状況で逃げたり回避したりする反応を示します。脅威を避けることで安全を求め、過度な計画、過労、回避行動として現れることがあります。',
      bodySignals: ['不安と落ち着きのなさ', '呼吸が速くなる', '絶え間ない忙しさ', '回避と逃走の衝動'],
      tips: ['安全であることを体に伝える', '状況を避けずに向き合ってみる', 'グラウンディング技法を練習する', '不安の原因を日記に書く'],
      affirmation: '私は今安全です。ここにいても大丈夫です。',
    },
  },
  freeze: {
    ko: {
      name: '경직 반응', keyword: '얼어붙음',
      color: '#6366f1',
      emoji: '🧊',
      description: '당신은 스트레스 상황에서 얼어붙거나 멈추는 반응을 보입니다. 압도적인 상황에서 몸과 마음이 일시 정지되며, 해리감, 무감각, 결정 마비가 나타날 수 있습니다.',
      bodySignals: ['몸이 굳어지거나 무거워짐', '멍하거나 해리감', '결정 불가능 상태', '시간이 느리게 흐르는 느낌'],
      tips: ['작은 신체 움직임부터 시작하기', '안전한 사람의 존재 확인하기', '감각에 집중하기 (5-4-3-2-1)', '트라우마 치료 전문가 상담 고려'],
      affirmation: '나는 움직일 수 있습니다. 조금씩이라도 괜찮습니다.',
    },
    en: {
      name: 'Freeze Response', keyword: 'Freeze',
      color: '#6366f1',
      emoji: '🧊',
      description: 'You tend to freeze or stop when stressed. In overwhelming situations, your body and mind temporarily pause, which can manifest as dissociation, numbness, or decision paralysis.',
      bodySignals: ['Body stiffening or feeling heavy', 'Dazed or dissociated', 'Unable to make decisions', 'Feeling time moves slowly'],
      tips: ['Start with small physical movements', 'Confirm the presence of a safe person', 'Focus on senses (5-4-3-2-1)', 'Consider consulting a trauma specialist'],
      affirmation: 'I can move. Even slowly, that is okay.',
    },
    ja: {
      name: '凍結反応', keyword: '固まり',
      color: '#6366f1',
      emoji: '🧊',
      description: 'あなたはストレス状況で固まったり止まったりする反応を示します。圧倒的な状況で体と心が一時停止し、解離感、無感覚、決断の麻痺として現れることがあります。',
      bodySignals: ['体が固まる・重くなる', '멍하거나멍해지る・解離感', '決断できない状態', '時間がゆっくり流れる感覚'],
      tips: ['小さな身体の動きから始める', '安全な人の存在を確認する', '感覚に集中する（5-4-3-2-1）', 'トラウマ専門家への相談を検討'],
      affirmation: '私は動けます。少しずつでも大丈夫です。',
    },
  },
  fawn: {
    ko: {
      name: '순응 반응', keyword: '순응',
      color: '#22c55e',
      emoji: '🕊️',
      description: '당신은 스트레스 상황에서 타인을 달래고 맞추려는 반응을 보입니다. 갈등을 피하기 위해 자신의 필요를 억압하고 타인의 기대에 과도하게 맞추려 합니다.',
      bodySignals: ['억지 미소', '과도한 사과', '불편해도 동의', '자신의 감정 억압'],
      tips: ['내 감정과 필요 인식하기', '거절하는 연습 (작은 것부터)', '자기 자신에게 솔직해지기', '경계 설정과 자기 존중 연습'],
      affirmation: '나의 필요와 감정은 소중하며 표현할 가치가 있습니다.',
    },
    en: {
      name: 'Fawn Response', keyword: 'Appease',
      color: '#22c55e',
      emoji: '🕊️',
      description: 'You tend to pacify and accommodate others when stressed. You suppress your own needs and excessively conform to others\' expectations to avoid conflict.',
      bodySignals: ['Forced smile', 'Excessive apologizing', 'Agreeing when uncomfortable', 'Suppressing own emotions'],
      tips: ['Recognize your own emotions and needs', 'Practice saying no (start small)', 'Be honest with yourself', 'Practice boundary-setting and self-respect'],
      affirmation: 'My needs and feelings are precious and worth expressing.',
    },
    ja: {
      name: '服従反応', keyword: '順応',
      color: '#22c55e',
      emoji: '🕊️',
      description: 'あなたはストレス状況で他者をなだめ、合わせようとする反応を示します。対立を避けるために自分のニーズを抑圧し、他者の期待に過度に応えようとします。',
      bodySignals: ['無理な笑顔', '過度な謝罪', '不快でも同意する', '自分の感情を抑圧'],
      tips: ['自分の感情とニーズを認識する', '断る練習（小さなことから）', '自分自身に正直になる', '境界設定と自己尊重の練習'],
      affirmation: '私のニーズと感情は大切で、表現する価値があります。',
    },
  },
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  restart: string
  share: string
  shareMsg: string
  yourType: string
  bodySignals: string
  tips: string
  dimLabel: string
  note: string
  choose: string
}> = {
  ko: {
    title: '스트레스 반응 유형',
    subtitle: '나는 싸우나, 도망치나, 얼어붙나, 순응하나?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 스트레스 반응 유형은',
    yourType: '나의 스트레스 반응 유형',
    bodySignals: '신체 신호',
    tips: '대처 전략',
    dimLabel: '4가지 반응 유형 분포',
    note: '스트레스 반응은 생존 본능으로, 어떤 유형도 잘못된 것이 아닙니다. 자신을 이해하는 것이 첫 걸음입니다.',
    choose: '이 상황에서 나의 반응에 가장 가까운 것을 고르세요',
  },
  en: {
    title: 'Stress Response Type',
    subtitle: 'Do you fight, flee, freeze, or fawn?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My stress response type is',
    yourType: 'Your Stress Response Type',
    bodySignals: 'Body Signals',
    tips: 'Coping Strategies',
    dimLabel: '4-Type Response Distribution',
    note: 'Stress responses are survival instincts — no type is wrong. Understanding yourself is the first step.',
    choose: 'Choose the response closest to yours in this situation',
  },
  ja: {
    title: 'ストレス反応タイプ',
    subtitle: '私は戦う？逃げる？固まる？従う？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のストレス反応タイプは',
    yourType: '私のストレス反応タイプ',
    bodySignals: '身体サイン',
    tips: '対処戦略',
    dimLabel: '4タイプ反応分布',
    note: 'ストレス反応は生存本能であり、どのタイプも間違いではありません。自己理解が最初の一歩です。',
    choose: 'この状況での自分の反応に最も近いものを選んでください',
  },
}

interface Scenario {
  id: string
  text: Record<Locale, string>
  options: Array<{ type: ResponseType; text: Record<Locale, string> }>
}

const SCENARIOS: Scenario[] = [
  {
    id: 's1',
    text: {
      ko: '상사가 회의에서 당신의 아이디어를 공개적으로 비판했습니다.',
      en: 'Your boss publicly criticized your idea in a meeting.',
      ja: '上司が会議であなたのアイデアを公の場で批判しました。',
    },
    options: [
      { type: 'fight', text: { ko: '즉시 반박하고 내 의견을 강하게 주장한다', en: 'Immediately argue back and strongly assert my view', ja: 'すぐに反論して自分の意見を強く主張する' } },
      { type: 'flight', text: { ko: '회의가 끝난 후 조용히 자리를 피한다', en: 'Quietly leave after the meeting', ja: '会議が終わった後静かに席を離れる' } },
      { type: 'freeze', text: { ko: '아무 말도 못하고 멍하니 있다', en: 'Stay speechless and dazed', ja: '何も言えず茫然としている' } },
      { type: 'fawn', text: { ko: '"맞아요, 제가 잘못 생각했네요"라고 동의한다', en: 'Agree: "You\'re right, I was wrong to think that"', ja: '「そうですね、私の考えが間違っていました」と同意する' } },
    ],
  },
  {
    id: 's2',
    text: {
      ko: '중요한 발표 직전에 기술 오류가 발생했습니다.',
      en: 'A technical error occurs right before an important presentation.',
      ja: '重要なプレゼンの直前に技術的なエラーが発生しました。',
    },
    options: [
      { type: 'fight', text: { ko: '빠르게 문제를 직접 해결하려 한다', en: 'Try to solve the problem directly and quickly', ja: '素早く問題を自分で解決しようとする' } },
      { type: 'flight', text: { ko: '발표를 미루거나 취소하고 싶다', en: 'Want to postpone or cancel the presentation', ja: 'プレゼンを延期またはキャンセルしたくなる' } },
      { type: 'freeze', text: { ko: '어떻게 해야 할지 몰라 얼어붙는다', en: 'Freeze, not knowing what to do', ja: 'どうすればいいかわからず固まってしまう' } },
      { type: 'fawn', text: { ko: '다른 사람에게 미안하다고 과도하게 사과한다', en: 'Apologize excessively to others', ja: '他の人に過度に謝り続ける' } },
    ],
  },
  {
    id: 's3',
    text: {
      ko: '친한 친구가 갑자기 연락을 끊었습니다.',
      en: 'A close friend suddenly stops contacting you.',
      ja: '親しい友人が突然連絡を絶ちました。',
    },
    options: [
      { type: 'fight', text: { ko: '왜 그러는지 바로 따져 묻는다', en: 'Immediately confront them to ask why', ja: 'すぐになぜなのかを問い詰める' } },
      { type: 'flight', text: { ko: '상처받지 않으려 바쁘게 지내며 잊으려 한다', en: 'Stay busy to avoid being hurt and try to forget', ja: '傷つかないように忙しく過ごして忘れようとする' } },
      { type: 'freeze', text: { ko: '어떻게 해야 할지 몰라 그냥 기다린다', en: 'Just wait, not knowing what to do', ja: 'どうすればいいかわからずただ待つ' } },
      { type: 'fawn', text: { ko: '내가 뭘 잘못했나 생각하며 먼저 사과한다', en: 'Think about what I did wrong and apologize first', ja: '自分が何かしたかと考えて先に謝る' } },
    ],
  },
  {
    id: 's4',
    text: {
      ko: '업무가 너무 많아 기한을 지킬 수 없을 것 같습니다.',
      en: 'You have too much work and cannot meet the deadline.',
      ja: '業務が多すぎて締め切りに間に合いそうにありません。',
    },
    options: [
      { type: 'fight', text: { ko: '상사에게 업무량이 과하다고 직접 말한다', en: 'Directly tell your boss the workload is excessive', ja: '上司に業務量が多すぎると直接伝える' } },
      { type: 'flight', text: { ko: '야근을 반복하며 어떻게든 피하려 한다', en: 'Repeat overtime, trying to avoid it somehow', ja: '残業を繰り返しながらなんとか避けようとする' } },
      { type: 'freeze', text: { ko: '무엇부터 해야 할지 몰라 아무것도 못 한다', en: 'Can\'t do anything, not knowing where to start', ja: '何から始めればいいかわからず何もできない' } },
      { type: 'fawn', text: { ko: '"괜찮아요"라고 하고 혼자 다 감당한다', en: 'Say "It\'s fine" and handle everything alone', ja: '「大丈夫です」と言って一人ですべてこなす' } },
    ],
  },
  {
    id: 's5',
    text: {
      ko: '파트너와 심각한 의견 충돌이 생겼습니다.',
      en: 'A serious disagreement arises with your partner.',
      ja: 'パートナーと深刻な意見の対立が起きました。',
    },
    options: [
      { type: 'fight', text: { ko: '내 주장을 끝까지 굽히지 않는다', en: 'Never back down from my position', ja: '自分の主張を最後まで曲げない' } },
      { type: 'flight', text: { ko: '화가 나면 자리를 피하거나 대화를 끊는다', en: 'When angry, leave or cut off the conversation', ja: '腹が立つと席を離れるか会話を打ち切る' } },
      { type: 'freeze', text: { ko: '아무 말도 나오지 않고 멍하게 있다', en: 'No words come out, just stare blankly', ja: '何も言葉が出ず茫然としている' } },
      { type: 'fawn', text: { ko: '갈등을 피하려 내 감정을 억누르고 양보한다', en: 'Suppress my feelings and give in to avoid conflict', ja: '対立を避けるために自分の感情を抑えて譲歩する' } },
    ],
  },
  {
    id: 's6',
    text: {
      ko: '낯선 사람이 많은 파티에 혼자 도착했습니다.',
      en: 'You arrive alone at a party with many strangers.',
      ja: '知らない人が多いパーティーに一人で到着しました。',
    },
    options: [
      { type: 'fight', text: { ko: '적극적으로 대화를 시작하며 공간을 장악한다', en: 'Actively start conversations and dominate the space', ja: '積極的に会話を始めてスペースを制する' } },
      { type: 'flight', text: { ko: '핑계를 대고 일찍 자리를 뜬다', en: 'Make an excuse and leave early', ja: '言い訳をして早めに席を立つ' } },
      { type: 'freeze', text: { ko: '구석에서 아무것도 못 하고 서 있다', en: 'Stand in a corner, unable to do anything', ja: '隅っこで何もできずに立っている' } },
      { type: 'fawn', text: { ko: '모든 사람을 기쁘게 하려 지나치게 친절하게 굴다 지친다', en: 'Exhaust myself trying to please everyone by being overly kind', ja: '全員を喜ばせようと過度に親切にして疲れてしまう' } },
    ],
  },
  {
    id: 's7',
    text: {
      ko: '자신에 대한 부정적인 소문을 들었습니다.',
      en: 'You hear negative rumors about yourself.',
      ja: '自分についての否定的な噂を聞きました。',
    },
    options: [
      { type: 'fight', text: { ko: '소문의 출처를 찾아 직접 해결한다', en: 'Find the source and address it directly', ja: '噂の出所を突き止めて直接対処する' } },
      { type: 'flight', text: { ko: '신경 안 쓴다고 하지만 사람들을 멀리한다', en: 'Say I don\'t care but distance from people', ja: '気にしないと言いながら人々から距離を置く' } },
      { type: 'freeze', text: { ko: '아무것도 할 수 없고 무기력하게 느낀다', en: 'Feel helpless and unable to do anything', ja: '何もできず無力感を感じる' } },
      { type: 'fawn', text: { ko: '모두에게 좋게 보이려 더 열심히 맞춰준다', en: 'Try harder to please everyone and look good to them', ja: 'みんなによく見られようとさらに一生懸命に合わせる' } },
    ],
  },
  {
    id: 's8',
    text: {
      ko: '건강 검진에서 걱정되는 수치가 나왔습니다.',
      en: 'A health check reveals concerning values.',
      ja: '健康診断で心配な数値が出ました。',
    },
    options: [
      { type: 'fight', text: { ko: '즉시 의사에게 자세히 따지고 대책을 세운다', en: 'Immediately question the doctor in detail and make a plan', ja: 'すぐに医師に詳しく問い詰めて対策を立てる' } },
      { type: 'flight', text: { ko: '생각하기 싫어 바쁘게 생활하며 잊으려 한다', en: 'Stay busy to forget rather than think about it', ja: '考えたくないので忙しく過ごして忘れようとする' } },
      { type: 'freeze', text: { ko: '충격에 다음 행동을 취하지 못하고 멍하다', en: 'Shocked and unable to take the next step, feeling dazed', ja: 'ショックで次の行動が取れず呆然としている' } },
      { type: 'fawn', text: { ko: '가족들을 걱정시키지 않으려 괜찮다고 한다', en: 'Say I\'m fine to avoid worrying my family', ja: '家族を心配させないように大丈夫だと言う' } },
    ],
  },
  {
    id: 's9',
    text: {
      ko: '중요한 결정을 빠르게 내려야 하는 상황입니다.',
      en: 'You must make an important decision quickly.',
      ja: '重要な決断を素早く下さなければならない状況です。',
    },
    options: [
      { type: 'fight', text: { ko: '빠르고 단호하게 결정하고 실행한다', en: 'Decide quickly and decisively, then act', ja: '素早く断固として決め、実行する' } },
      { type: 'flight', text: { ko: '결정을 미루거나 다른 사람에게 넘기고 싶다', en: 'Want to postpone or hand off to someone else', ja: '決断を先延ばしにするか他の人に任せたい' } },
      { type: 'freeze', text: { ko: '선택지들 앞에서 아무것도 결정하지 못한다', en: 'Unable to decide among the options', ja: '選択肢の前で何も決められない' } },
      { type: 'fawn', text: { ko: '다른 사람들의 의견에 따라 결정한다', en: 'Decide based on others\' opinions', ja: '他の人の意見に従って決める' } },
    ],
  },
  {
    id: 's10',
    text: {
      ko: '누군가가 공공장소에서 당신을 무시하는 발언을 했습니다.',
      en: 'Someone dismisses you with a comment in a public place.',
      ja: '誰かが公の場所であなたを軽視する発言をしました。',
    },
    options: [
      { type: 'fight', text: { ko: '그 자리에서 바로 반박하고 자신을 지킨다', en: 'Immediately push back and defend myself on the spot', ja: 'その場ですぐに反論して自分を守る' } },
      { type: 'flight', text: { ko: '아무 말도 하지 않고 그 자리를 피한다', en: 'Say nothing and leave the scene', ja: '何も言わずにその場を離れる' } },
      { type: 'freeze', text: { ko: '뭐라고 해야 할지 몰라 아무 반응도 못 한다', en: 'Can\'t react, not knowing what to say', ja: '何を言えばいいかわからず何の反応もできない' } },
      { type: 'fawn', text: { ko: '상대방의 기분을 맞추려 미소 짓거나 동의한다', en: 'Smile or agree to appease the other person', ja: '相手の機嫌を取ろうと微笑んだり同意したりする' } },
    ],
  },
  {
    id: 's11',
    text: {
      ko: '재정적인 어려움이 예상치 못하게 닥쳤습니다.',
      en: 'An unexpected financial difficulty hits you.',
      ja: '経済的な困難が予期せず訪れました。',
    },
    options: [
      { type: 'fight', text: { ko: '즉시 수입을 늘릴 방법을 찾고 행동한다', en: 'Immediately find ways to increase income and act', ja: 'すぐに収入を増やす方法を見つけて行動する' } },
      { type: 'flight', text: { ko: '현실을 직면하기 싫어 소비를 피하거나 과소비한다', en: 'Avoid reality by underspending or overspending', ja: '現実に向き合いたくなくて節約するか過消費する' } },
      { type: 'freeze', text: { ko: '무기력하고 어떻게 해야 할지 모르겠다', en: 'Feel helpless and don\'t know what to do', ja: '無力感を感じ、どうすればいいかわからない' } },
      { type: 'fawn', text: { ko: '가족이나 친구들에게 부담 주지 않으려 괜찮다고 한다', en: 'Say I\'m fine to not burden family or friends', ja: '家族や友人に負担をかけまいと大丈夫だと言う' } },
    ],
  },
  {
    id: 's12',
    text: {
      ko: '기대하던 프로젝트가 갑자기 취소되었습니다.',
      en: 'A project you were looking forward to is suddenly canceled.',
      ja: '楽しみにしていたプロジェクトが突然キャンセルされました。',
    },
    options: [
      { type: 'fight', text: { ko: '취소 이유를 따지고 재고를 요청한다', en: 'Challenge the reason for cancellation and request reconsideration', ja: 'キャンセルの理由を問い詰めて再考を求める' } },
      { type: 'flight', text: { ko: '실망감을 다른 활동에 몰두해 잊으려 한다', en: 'Throw myself into other activities to forget the disappointment', ja: '失望感を別の活動に没頭して忘れようとする' } },
      { type: 'freeze', text: { ko: '받아들이지 못하고 멍하게 앉아 있다', en: 'Sit dazed, unable to accept it', ja: '受け入れられず呆然と座っている' } },
      { type: 'fawn', text: { ko: '"괜찮아요"라고 하며 담당자를 위로한다', en: 'Say "It\'s okay" and comfort the person in charge', ja: '「大丈夫です」と言って担当者を慰める' } },
    ],
  },
  {
    id: 's13',
    text: {
      ko: '의료 응급 상황이 눈앞에 펼쳐졌습니다.',
      en: 'A medical emergency unfolds before your eyes.',
      ja: '医療緊急事態が目の前で起きました。',
    },
    options: [
      { type: 'fight', text: { ko: '즉시 119에 전화하고 상황을 지휘한다', en: 'Immediately call emergency services and take charge', ja: 'すぐに119番に電話して状況を指揮する' } },
      { type: 'flight', text: { ko: '당황해서 그 자리를 피하고 싶어진다', en: 'Get flustered and want to flee the scene', ja: '慌てのその場を避けたくなる' } },
      { type: 'freeze', text: { ko: '어떻게 해야 할지 몰라 발이 붙어 움직이지 못한다', en: 'Can\'t move, feet planted, not knowing what to do', ja: 'どうすればいいかわからず足がすくんで動けない' } },
      { type: 'fawn', text: { ko: '다른 사람들이 괜찮은지 살피느라 나는 후순위가 된다', en: 'Check on others first, making myself secondary', ja: '他の人が大丈夫かを確認することを優先して自分は後回しになる' } },
    ],
  },
  {
    id: 's14',
    text: {
      ko: '장기간 하던 일이 갑자기 없어졌습니다.',
      en: 'A job or project you\'ve done for a long time suddenly ends.',
      ja: '長期間してきた仕事が突然なくなりました。',
    },
    options: [
      { type: 'fight', text: { ko: '즉시 다음 기회를 찾아 적극 행동한다', en: 'Immediately seek the next opportunity and act actively', ja: 'すぐに次の機会を探して積極的に行動する' } },
      { type: 'flight', text: { ko: '현실에서 도피해 과도한 취미 활동에 빠진다', en: 'Escape reality and dive into excessive hobbies', ja: '現実から逃げて過度な趣味活動に没頭する' } },
      { type: 'freeze', text: { ko: '무기력하게 무엇도 시작할 수 없다', en: 'Feel helplessly unable to start anything', ja: '無力で何も始められない' } },
      { type: 'fawn', text: { ko: '다른 사람 눈에 약해 보이지 않으려 괜찮은 척한다', en: 'Pretend to be fine to not appear weak to others', ja: '他人に弱く見られないよう大丈夫なふりをする' } },
    ],
  },
  {
    id: 's15',
    text: {
      ko: '가까운 사람에게 크게 상처를 받았습니다.',
      en: 'You are deeply hurt by someone close to you.',
      ja: '身近な人に大きく傷つけられました。',
    },
    options: [
      { type: 'fight', text: { ko: '상처를 준 사람에게 직접 마주하고 따진다', en: 'Directly confront and challenge the person who hurt me', ja: '傷つけた人に直接向き合って問い詰める' } },
      { type: 'flight', text: { ko: '거리를 두고 관계를 회피한다', en: 'Distance myself and avoid the relationship', ja: '距離を置いて関係を回避する' } },
      { type: 'freeze', text: { ko: '감정이 마비되고 아무것도 느껴지지 않는다', en: 'Emotions go numb and I feel nothing', ja: '感情が麻痺して何も感じられない' } },
      { type: 'fawn', text: { ko: '내가 뭔가 잘못한 게 있을 거라며 스스로를 탓한다', en: 'Blame myself thinking I must have done something wrong', ja: '自分が何か悪いことをしたはずだと自分を責める' } },
    ],
  },
  {
    id: 's16',
    text: {
      ko: '오랫동안 원하던 기회가 갑자기 눈앞에 왔습니다.',
      en: 'A long-sought opportunity suddenly appears before you.',
      ja: '長い間望んでいた機会が突然目の前に現れました。',
    },
    options: [
      { type: 'fight', text: { ko: '즉시 잡으려 행동한다', en: 'Act immediately to seize it', ja: 'すぐに掴もうと行動する' } },
      { type: 'flight', text: { ko: '실패가 두려워 핑계를 찾는다', en: 'Look for excuses out of fear of failure', ja: '失敗が怖くて言い訳を探す' } },
      { type: 'freeze', text: { ko: '어떻게 해야 할지 몰라 결정을 못 한다', en: 'Unable to decide, not knowing what to do', ja: 'どうすればいいかわからず決断できない' } },
      { type: 'fawn', text: { ko: '내가 받을 자격이 있나 의심하며 주저한다', en: 'Hesitate, doubting if I deserve it', ja: '自分にそれを受ける資格があるか疑って躊躇する' } },
    ],
  },
]

const RESPONSE_TYPES: ResponseType[] = ['fight', 'flight', 'freeze', 'fawn']

interface Props { locale?: string }

export default function StressResponseTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]

  const [current, setCurrent] = useState(0)
  const [counts, setCounts] = useState<Partial<Record<ResponseType, number>>>({})
  const [result, setResult] = useState<ResponseType | null>(null)

  function pick(type: ResponseType) {
    const newCounts = { ...counts, [type]: (counts[type] ?? 0) + 1 }
    if (current + 1 >= SCENARIOS.length) {
      const dominant = RESPONSE_TYPES.reduce(
        (a, t) => ((newCounts[t] ?? 0) > (newCounts[a] ?? 0) ? t : a),
        'fight' as ResponseType
      )
      setResult(dominant)
    }
    setCounts(newCounts)
    setCurrent(current + 1)
  }

  function restart() {
    setCurrent(0)
    setCounts({})
    setResult(null)
  }

  function share() {
    if (!result) return
    const url = window.location.href
    const t = TYPE_DATA[result][locale]
    const text = `${lb.shareMsg} — ${t.name} (${t.keyword})`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  const finished = current >= SCENARIOS.length

  if (finished && result) {
    const t = TYPE_DATA[result][locale]
    const total = SCENARIOS.length

    return (
      <div className="space-y-6" aria-live="polite">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-sm text-muted-foreground">{lb.yourType}</p>
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
            style={{ backgroundColor: t.color }}
          >
            <span aria-hidden="true">{t.emoji}</span>
            {t.name}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">{lb.dimLabel}</h3>
          {RESPONSE_TYPES.map(rt => {
            const count = counts[rt] ?? 0
            const pct = Math.round((count / total) * 100)
            const d = TYPE_DATA[rt][locale]
            return (
              <div key={rt} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span aria-hidden="true">{d.emoji}</span>
                    <span className="font-medium">{d.name}</span>
                  </span>
                  <span className="font-bold" style={{ color: d.color }}>{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: d.color }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={d.name}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">{lb.bodySignals}</h3>
          <ul className="space-y-1">
            {t.bodySignals.map(s => (
              <li key={s} className="text-sm text-muted-foreground flex gap-2">
                <span>•</span>{s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-green-600">{lb.tips}</h3>
          <ul className="space-y-1">
            {t.tips.map(tip => (
              <li key={tip} className="text-sm text-muted-foreground flex gap-2">
                <span style={{ color: t.color }}>→</span>{tip}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ border: `1px solid ${t.color}40`, background: `${t.color}08` }}
        >
          <p className="text-sm text-center" style={{ color: t.color }}>"{t.affirmation}"</p>
        </div>

        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>

        <div className="flex gap-3">
          <button
            onClick={restart}
            className="flex-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            {lb.restart}
          </button>
          <button
            onClick={share}
            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {lb.share}
          </button>
        </div>
      </div>
    )
  }

  const s = SCENARIOS[current]
  const progress = Math.round((current / SCENARIOS.length) * 100)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{lb.title}</h1>
        <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{lb.questionOf(current + 1, SCENARIOS.length)}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-lg font-medium">{s.text[locale]}</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.choose}</p>
      <div className="grid gap-2">
        {s.options.map(opt => (
          <button
            key={opt.type}
            onClick={() => pick(opt.type)}
            aria-label={opt.text[locale]}
            className="w-full rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors"
          >
            {opt.text[locale]}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
    </div>
  )
}
