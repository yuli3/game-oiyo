import { useState } from 'react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
type DiscType = 'D' | 'I' | 'S' | 'C'
type Scores = Record<DiscType, number>
type Locale = 'ko' | 'en' | 'ja'

interface Option { text: string; disc: DiscType }
interface Question { id: string; text: string; options: Option[] }
interface ResultData {
  title: string
  subtitle: string
  description: string
  keywords: string[]
  strengths: string[]
  weaknesses: string[]
  workStyle: string
  communication: string
  tip: string
}

const DISC_COLORS: Record<DiscType, string> = {
  D: '#ef4444',
  I: '#f59e0b',
  S: '#22c55e',
  C: '#3b82f6',
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  questionOf: (c: number, t: number) => string
  restart: string
  share: string
  shareMsg: string
  yourType: string
  keywords: string
  strengths: string
  weaknesses: string
  workStyle: string
  communication: string
  tip: string
  chartTitle: string
  pct: string
}> = {
  ko: {
    title: 'DISC 성격 유형 테스트',
    subtitle: '나의 행동 방식과 소통 스타일은?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 DISC 유형은',
    yourType: '나의 DISC 유형',
    keywords: '핵심 키워드',
    strengths: '강점',
    weaknesses: '약점',
    workStyle: '업무 스타일',
    communication: '소통 방식',
    tip: '성장 조언',
    chartTitle: 'DISC 성향 분석',
    pct: '%',
  },
  en: {
    title: 'DISC Personality Test',
    subtitle: 'What\'s your behavior and communication style?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My DISC type is',
    yourType: 'Your DISC Type',
    keywords: 'Key Traits',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    workStyle: 'Work Style',
    communication: 'Communication Style',
    tip: 'Growth Tip',
    chartTitle: 'DISC Profile',
    pct: '%',
  },
  ja: {
    title: 'DISCパーソナリティテスト',
    subtitle: 'あなたの行動スタイルとコミュニケーションは？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のDISCタイプは',
    yourType: '私のDISCタイプ',
    keywords: 'キーワード',
    strengths: '強み',
    weaknesses: '弱み',
    workStyle: '仕事スタイル',
    communication: 'コミュニケーション',
    tip: '成長のアドバイス',
    chartTitle: 'DISCプロファイル',
    pct: '%',
  },
}

const QUESTIONS: Record<Locale, Question[]> = {
  ko: [
    {
      id: 'q1',
      text: '새로운 일을 시작할 때 나는...',
      options: [
        { text: '빠르게 결정하고 바로 행동에 옮긴다', disc: 'D' },
        { text: '사람들에게 아이디어를 공유하며 흥분한다', disc: 'I' },
        { text: '모든 것을 신중히 준비한 뒤 시작한다', disc: 'S' },
        { text: '세부 계획과 자료를 충분히 검토한다', disc: 'C' },
      ],
    },
    {
      id: 'q2',
      text: '팀 프로젝트에서 나는 주로...',
      options: [
        { text: '목표를 설정하고 팀을 이끄는 역할을 한다', disc: 'D' },
        { text: '팀 분위기를 띄우고 모두를 격려한다', disc: 'I' },
        { text: '팀원들을 지원하며 안정적인 역할을 맡는다', disc: 'S' },
        { text: '데이터와 세부 사항을 분석하는 역할을 한다', disc: 'C' },
      ],
    },
    {
      id: 'q3',
      text: '갈등이 생겼을 때 나는...',
      options: [
        { text: '직접적으로 맞서 빠르게 해결하려 한다', disc: 'D' },
        { text: '분위기를 부드럽게 만들고 모두가 웃도록 한다', disc: 'I' },
        { text: '인내하며 조화로운 해결책을 찾는다', disc: 'S' },
        { text: '사실과 논리를 기반으로 분석하고 해결한다', disc: 'C' },
      ],
    },
    {
      id: 'q4',
      text: '나에게 가장 중요한 것은...',
      options: [
        { text: '결과와 성과', disc: 'D' },
        { text: '인정과 즐거움', disc: 'I' },
        { text: '안정과 신뢰', disc: 'S' },
        { text: '정확성과 품질', disc: 'C' },
      ],
    },
    {
      id: 'q5',
      text: '나의 가장 큰 두려움은...',
      options: [
        { text: '실패하거나 통제력을 잃는 것', disc: 'D' },
        { text: '거절당하거나 무시당하는 것', disc: 'I' },
        { text: '갑작스러운 변화나 불안정', disc: 'S' },
        { text: '비판받거나 틀리는 것', disc: 'C' },
      ],
    },
    {
      id: 'q6',
      text: '의사소통할 때 나는...',
      options: [
        { text: '직접적이고 간결하게 요점만 말한다', disc: 'D' },
        { text: '열정적이고 표현이 풍부하게 이야기한다', disc: 'I' },
        { text: '부드럽고 배려하며 차분하게 말한다', disc: 'S' },
        { text: '정확하고 사실 중심으로 조심스럽게 말한다', disc: 'C' },
      ],
    },
    {
      id: 'q7',
      text: '스트레스를 받을 때 나는...',
      options: [
        { text: '더 통제적이거나 과격해진다', disc: 'D' },
        { text: '감정적이 되거나 산만해진다', disc: 'I' },
        { text: '안으로 감추고 참는다', disc: 'S' },
        { text: '더 완벽주의적이 되거나 과도하게 분석한다', disc: 'C' },
      ],
    },
    {
      id: 'q8',
      text: '새로운 사람을 만날 때 나는...',
      options: [
        { text: '목적을 가지고 만나며 능력을 파악하려 한다', disc: 'D' },
        { text: '친근하게 다가가 금방 친해진다', disc: 'I' },
        { text: '조심스럽게 다가가며 천천히 신뢰를 쌓는다', disc: 'S' },
        { text: '관찰하고 상대를 분석한 후 다가간다', disc: 'C' },
      ],
    },
    {
      id: 'q9',
      text: '나의 이상적인 환경은...',
      options: [
        { text: '도전적인 목표와 자율성이 있는 환경', disc: 'D' },
        { text: '사람들과 활발히 교류하는 환경', disc: 'I' },
        { text: '안정적이고 예측 가능한 환경', disc: 'S' },
        { text: '체계적이고 정확성을 중시하는 환경', disc: 'C' },
      ],
    },
    {
      id: 'q10',
      text: '결정을 내릴 때 나는...',
      options: [
        { text: '빠르고 단호하게 결정한다', disc: 'D' },
        { text: '직감과 사람들의 반응을 보고 결정한다', disc: 'I' },
        { text: '신중하게 생각하고 다른 사람의 의견을 듣는다', disc: 'S' },
        { text: '충분한 정보와 분석 후 결정한다', disc: 'C' },
      ],
    },
    {
      id: 'q11',
      text: '일이 잘 안 풀릴 때 나는...',
      options: [
        { text: '더 강하게 밀어붙이거나 다른 방법을 찾는다', disc: 'D' },
        { text: '누군가에게 이야기하며 해소한다', disc: 'I' },
        { text: '인내하며 계속 노력한다', disc: 'S' },
        { text: '문제를 분석하고 원인을 파악한다', disc: 'C' },
      ],
    },
    {
      id: 'q12',
      text: '내가 리더라면 나는...',
      options: [
        { text: '명확한 목표를 설정하고 팀을 강하게 이끈다', disc: 'D' },
        { text: '팀원들에게 영감을 주고 열정을 불어넣는다', disc: 'I' },
        { text: '팀원들이 편안하게 일할 수 있도록 지원한다', disc: 'S' },
        { text: '높은 기준을 세우고 품질을 유지한다', disc: 'C' },
      ],
    },
  ],
  en: [
    {
      id: 'q1',
      text: 'When starting something new, I...',
      options: [
        { text: 'Decide quickly and take action immediately', disc: 'D' },
        { text: 'Get excited and share ideas with people', disc: 'I' },
        { text: 'Carefully prepare everything before starting', disc: 'S' },
        { text: 'Review detailed plans and materials thoroughly', disc: 'C' },
      ],
    },
    {
      id: 'q2',
      text: 'In a team project, I usually...',
      options: [
        { text: 'Set goals and take the lead', disc: 'D' },
        { text: 'Energize the team and encourage everyone', disc: 'I' },
        { text: 'Support teammates and take stable roles', disc: 'S' },
        { text: 'Analyze data and handle details', disc: 'C' },
      ],
    },
    {
      id: 'q3',
      text: 'When conflict arises, I...',
      options: [
        { text: 'Confront it directly and resolve it quickly', disc: 'D' },
        { text: 'Soften the mood and make everyone smile', disc: 'I' },
        { text: 'Patiently search for a harmonious solution', disc: 'S' },
        { text: 'Analyze based on facts and logic', disc: 'C' },
      ],
    },
    {
      id: 'q4',
      text: 'What matters most to me is...',
      options: [
        { text: 'Results and achievement', disc: 'D' },
        { text: 'Recognition and enjoyment', disc: 'I' },
        { text: 'Stability and trust', disc: 'S' },
        { text: 'Accuracy and quality', disc: 'C' },
      ],
    },
    {
      id: 'q5',
      text: 'My biggest fear is...',
      options: [
        { text: 'Failing or losing control', disc: 'D' },
        { text: 'Being rejected or ignored', disc: 'I' },
        { text: 'Sudden change or instability', disc: 'S' },
        { text: 'Being criticized or being wrong', disc: 'C' },
      ],
    },
    {
      id: 'q6',
      text: 'When communicating, I...',
      options: [
        { text: 'Am direct and concise, getting straight to the point', disc: 'D' },
        { text: 'Talk with passion and rich expression', disc: 'I' },
        { text: 'Speak gently, thoughtfully, and calmly', disc: 'S' },
        { text: 'Am precise and fact-focused, speaking carefully', disc: 'C' },
      ],
    },
    {
      id: 'q7',
      text: 'When I\'m under stress, I...',
      options: [
        { text: 'Become more controlling or aggressive', disc: 'D' },
        { text: 'Become emotional or scattered', disc: 'I' },
        { text: 'Internalize it and endure silently', disc: 'S' },
        { text: 'Become more perfectionist or over-analyze', disc: 'C' },
      ],
    },
    {
      id: 'q8',
      text: 'When meeting new people, I...',
      options: [
        { text: 'Meet with purpose, assessing their capabilities', disc: 'D' },
        { text: 'Approach warmly and quickly become friends', disc: 'I' },
        { text: 'Approach cautiously and slowly build trust', disc: 'S' },
        { text: 'Observe and analyze before getting close', disc: 'C' },
      ],
    },
    {
      id: 'q9',
      text: 'My ideal environment is...',
      options: [
        { text: 'Challenging goals with autonomy', disc: 'D' },
        { text: 'Active interaction with people', disc: 'I' },
        { text: 'Stable and predictable conditions', disc: 'S' },
        { text: 'Systematic and accuracy-valuing', disc: 'C' },
      ],
    },
    {
      id: 'q10',
      text: 'When making decisions, I...',
      options: [
        { text: 'Decide quickly and decisively', disc: 'D' },
        { text: 'Go by intuition and observe people\'s reactions', disc: 'I' },
        { text: 'Think carefully and listen to others\' opinions', disc: 'S' },
        { text: 'Decide after gathering sufficient information and analysis', disc: 'C' },
      ],
    },
    {
      id: 'q11',
      text: 'When things don\'t go well, I...',
      options: [
        { text: 'Push harder or find a different approach', disc: 'D' },
        { text: 'Talk to someone to release the tension', disc: 'I' },
        { text: 'Patiently keep trying', disc: 'S' },
        { text: 'Analyze the problem and identify the root cause', disc: 'C' },
      ],
    },
    {
      id: 'q12',
      text: 'As a leader, I...',
      options: [
        { text: 'Set clear goals and lead the team firmly', disc: 'D' },
        { text: 'Inspire and ignite passion in team members', disc: 'I' },
        { text: 'Support team members to work comfortably', disc: 'S' },
        { text: 'Establish high standards and maintain quality', disc: 'C' },
      ],
    },
  ],
  ja: [
    {
      id: 'q1',
      text: '何か新しいことを始める時、私は...',
      options: [
        { text: 'すぐに決断して行動する', disc: 'D' },
        { text: 'みんなにアイデアを共有して盛り上がる', disc: 'I' },
        { text: '準備を整えてから慎重に始める', disc: 'S' },
        { text: '詳細な計画と資料を十分に確認する', disc: 'C' },
      ],
    },
    {
      id: 'q2',
      text: 'チームプロジェクトでは...',
      options: [
        { text: '目標を設定してリードする', disc: 'D' },
        { text: 'チームの雰囲気を高めてみんなを応援する', disc: 'I' },
        { text: 'チームメンバーをサポートして安定した役割を担う', disc: 'S' },
        { text: 'データや詳細を分析する', disc: 'C' },
      ],
    },
    {
      id: 'q3',
      text: '葛藤が起きた時、私は...',
      options: [
        { text: '直接対峙して素早く解決しようとする', disc: 'D' },
        { text: '雰囲気を和ませてみんなを笑わせる', disc: 'I' },
        { text: '忍耐強く調和のとれた解決策を探す', disc: 'S' },
        { text: '事実と論理に基づいて分析・解決する', disc: 'C' },
      ],
    },
    {
      id: 'q4',
      text: '私にとって最も大切なのは...',
      options: [
        { text: '結果と成果', disc: 'D' },
        { text: '認められることと楽しむこと', disc: 'I' },
        { text: '安定と信頼', disc: 'S' },
        { text: '正確さと品質', disc: 'C' },
      ],
    },
    {
      id: 'q5',
      text: '最も恐れていることは...',
      options: [
        { text: '失敗またはコントロールを失うこと', disc: 'D' },
        { text: '拒絶または無視されること', disc: 'I' },
        { text: '急な変化や不安定さ', disc: 'S' },
        { text: '批判されることや間違えること', disc: 'C' },
      ],
    },
    {
      id: 'q6',
      text: 'コミュニケーションする時、私は...',
      options: [
        { text: '直接的で簡潔に要点だけ話す', disc: 'D' },
        { text: '情熱的で表現豊かに話す', disc: 'I' },
        { text: '穏やかで思いやりを持って話す', disc: 'S' },
        { text: '正確で事実中心に慎重に話す', disc: 'C' },
      ],
    },
    {
      id: 'q7',
      text: 'ストレスを受けた時、私は...',
      options: [
        { text: 'より支配的になったり攻撃的になる', disc: 'D' },
        { text: '感情的になったり散漫になる', disc: 'I' },
        { text: '内に秘めて我慢する', disc: 'S' },
        { text: 'より完璧主義的になったり過度に分析する', disc: 'C' },
      ],
    },
    {
      id: 'q8',
      text: '新しい人と出会う時、私は...',
      options: [
        { text: '目的を持って相手の能力を見極めようとする', disc: 'D' },
        { text: '親しみやすく接してすぐに仲良くなる', disc: 'I' },
        { text: '慎重に近づいてゆっくり信頼を築く', disc: 'S' },
        { text: '観察・分析してから近づく', disc: 'C' },
      ],
    },
    {
      id: 'q9',
      text: '理想的な環境は...',
      options: [
        { text: '挑戦的な目標と自律性がある環境', disc: 'D' },
        { text: '人々と活発に交流できる環境', disc: 'I' },
        { text: '安定していて予測可能な環境', disc: 'S' },
        { text: '体系的で正確さを重視する環境', disc: 'C' },
      ],
    },
    {
      id: 'q10',
      text: '意思決定をする時、私は...',
      options: [
        { text: '素早く断固として決める', disc: 'D' },
        { text: '直感と人々の反応を見て決める', disc: 'I' },
        { text: '慎重に考えて他の人の意見を聞く', disc: 'S' },
        { text: '十分な情報と分析の後に決める', disc: 'C' },
      ],
    },
    {
      id: 'q11',
      text: 'うまくいかない時、私は...',
      options: [
        { text: 'もっと強く押すか別の方法を探す', disc: 'D' },
        { text: '誰かに話して解消する', disc: 'I' },
        { text: '忍耐強く努力し続ける', disc: 'S' },
        { text: '問題を分析して原因を特定する', disc: 'C' },
      ],
    },
    {
      id: 'q12',
      text: 'リーダーなら、私は...',
      options: [
        { text: '明確な目標を設定してチームを強く導く', disc: 'D' },
        { text: 'チームメンバーにインスピレーションを与える', disc: 'I' },
        { text: 'チームメンバーが快適に働けるようサポートする', disc: 'S' },
        { text: '高い基準を設けて品質を維持する', disc: 'C' },
      ],
    },
  ],
}

const RESULTS: Record<DiscType, Record<Locale, ResultData>> = {
  D: {
    ko: {
      title: 'D형 — 주도형',
      subtitle: '결과를 향해 단호하게 나아가는 리더',
      description: '주도형은 도전을 즐기고 결과 지향적입니다. 직접적이고 단호하며, 통제권을 갖는 것을 선호합니다. 장애물을 극복하는 것에서 동기를 얻으며, 빠른 결정과 실행을 중시합니다.',
      keywords: ['결단력', '직접성', '독립성', '경쟁심', '목표 지향'],
      strengths: ['빠른 의사결정', '강한 리더십', '결과 추구', '압박 속에서도 침착'],
      weaknesses: ['타인 감정 무시 가능', '지나친 통제', '인내심 부족', '세부 사항 간과'],
      workStyle: '빠르게 결정하고 직접 실행합니다. 목표를 명확히 설정하고 팀을 강하게 이끌며, 관료적 절차보다 결과를 중시합니다.',
      communication: '직접적이고 간결합니다. 요점만 말하고 불필요한 형식을 싫어합니다. 이메일보다 직접 대화를 선호합니다.',
      tip: '타인의 감정과 의견에 더 귀 기울이는 연습을 해보세요. 팀원의 기여를 인정하면 더 강력한 리더가 됩니다.',
    },
    en: {
      title: 'D — Dominant',
      subtitle: 'A decisive leader driving toward results',
      description: 'Dominant types enjoy challenges and are results-oriented. They are direct and decisive, preferring to be in control. They\'re motivated by overcoming obstacles and prioritize quick decisions and action.',
      keywords: ['Decisiveness', 'Directness', 'Independence', 'Competitiveness', 'Goal-orientation'],
      strengths: ['Quick decision-making', 'Strong leadership', 'Result-driven', 'Calm under pressure'],
      weaknesses: ['May ignore others\' emotions', 'Excessive control', 'Impatience', 'Overlooking details'],
      workStyle: 'Makes fast decisions and executes directly. Sets clear goals, leads strongly, and values results over bureaucratic process.',
      communication: 'Direct and concise. Gets to the point and dislikes unnecessary formality. Prefers face-to-face over email.',
      tip: 'Practice listening more to others\' emotions and opinions. Acknowledging team contributions will make you an even stronger leader.',
    },
    ja: {
      title: 'D型 — 主導型',
      subtitle: '結果に向かって断固と進むリーダー',
      description: '主導型は挑戦を楽しみ、結果志向です。直接的で断固とし、コントロール権を持つことを好みます。障害を乗り越えることから動機を得て、素早い決断と実行を重視します。',
      keywords: ['決断力', '直接性', '独立性', '競争心', '目標志向'],
      strengths: ['素早い意思決定', '強いリーダーシップ', '結果追求', 'プレッシャーの中でも冷静'],
      weaknesses: ['他者の感情を無視する可能性', '過度な管理', '忍耐力不足', '細部を見落とす'],
      workStyle: '素早く決断して直接実行します。明確な目標を設定してチームを強く率い、官僚的手続きより結果を重視します。',
      communication: '直接的で簡潔です。要点だけ話し、不必要な形式を嫌います。メールより直接対話を好みます。',
      tip: '他者の感情と意見にもっと耳を傾ける練習をしましょう。チームメンバーの貢献を認めると、より強力なリーダーになれます。',
    },
  },
  I: {
    ko: {
      title: 'I형 — 사교형',
      subtitle: '열정과 긍정으로 사람을 이끄는 에너자이저',
      description: '사교형은 낙관적이고 외향적이며, 사람들과 함께할 때 에너지를 얻습니다. 설득력이 강하고 영감을 주는 능력이 탁월합니다. 팀의 분위기를 밝게 만들고 관계를 통해 동기를 부여합니다.',
      keywords: ['열정', '긍정성', '사교성', '창의성', '영향력'],
      strengths: ['뛰어난 설득력', '팀 동기 부여', '창의적 아이디어', '긍정 에너지'],
      weaknesses: ['세부 사항과 후속 조치 약함', '감정적 결정', '집중력 유지 어려움', '과도한 낙관주의'],
      workStyle: '사람들과 협력하며 아이디어를 나눕니다. 창의적 환경에서 최고의 성과를 내며, 단조로운 작업보다 다양한 프로젝트를 선호합니다.',
      communication: '열정적이고 표현이 풍부합니다. 이야기와 감정을 통해 소통하며, 칭찬과 인정에 잘 반응합니다.',
      tip: '세부 사항과 마감 기한 관리를 강화하세요. 뛰어난 아이디어를 실행으로 연결하면 더 큰 영향력을 발휘할 수 있습니다.',
    },
    en: {
      title: 'I — Influential',
      subtitle: 'An energizer who leads people with passion and positivity',
      description: 'Influential types are optimistic and outgoing, energized by being with people. They\'re highly persuasive with exceptional ability to inspire. They brighten team atmosphere and motivate through relationships.',
      keywords: ['Enthusiasm', 'Positivity', 'Sociability', 'Creativity', 'Influence'],
      strengths: ['Outstanding persuasiveness', 'Team motivation', 'Creative ideas', 'Positive energy'],
      weaknesses: ['Weak on details and follow-through', 'Emotional decision-making', 'Difficulty maintaining focus', 'Excessive optimism'],
      workStyle: 'Collaborates with people and shares ideas. Achieves best results in creative environments and prefers varied projects over monotonous tasks.',
      communication: 'Enthusiastic and expressive. Communicates through stories and emotions, responds well to praise and recognition.',
      tip: 'Strengthen your management of details and deadlines. Connecting your brilliant ideas to execution will amplify your impact.',
    },
    ja: {
      title: 'I型 — 社交型',
      subtitle: '情熱と前向きさで人を導くエナジャイザー',
      description: '社交型は楽観的で外向的、人々と一緒にいる時にエネルギーを得ます。説得力が強く、インスピレーションを与える能力に優れています。チームの雰囲気を明るくし、関係を通じて動機を与えます。',
      keywords: ['情熱', '前向きさ', '社交性', '創造性', '影響力'],
      strengths: ['卓越した説得力', 'チームの動機付け', '創造的アイデア', 'ポジティブエネルギー'],
      weaknesses: ['細部とフォローアップが弱い', '感情的な意思決定', '集中力の維持が難しい', '過度な楽観主義'],
      workStyle: '人々と協力してアイデアを共有します。創造的な環境で最高の成果を出し、単調な作業より多様なプロジェクトを好みます。',
      communication: '情熱的で表現豊かです。物語と感情を通じてコミュニケーションし、褒め言葉と認定によく反応します。',
      tip: '細部と締め切り管理を強化しましょう。優れたアイデアを実行に結びつけると、より大きな影響力を発揮できます。',
    },
  },
  S: {
    ko: {
      title: 'S형 — 안정형',
      subtitle: '신뢰와 안정으로 팀을 지탱하는 조력자',
      description: '안정형은 인내심이 강하고 신뢰할 수 있는 팀 플레이어입니다. 조화와 안정을 중시하며, 팀의 균형을 유지하는 데 탁월합니다. 일관성과 협력을 통해 꾸준한 성과를 만들어냅니다.',
      keywords: ['신뢰성', '인내', '팀워크', '안정성', '협력'],
      strengths: ['뛰어난 신뢰성', '강한 팀 지원', '일관된 성과', '뛰어난 경청 능력'],
      weaknesses: ['변화에 느린 적응', '자기 주장 부족', '지나친 위험 회피', '갈등 회피'],
      workStyle: '체계적이고 꾸준하게 일합니다. 안정적인 환경에서 최고의 성과를 내며, 갑작스러운 변화보다 예측 가능한 루틴을 선호합니다.',
      communication: '부드럽고 배려하며 적극적으로 경청합니다. 조화를 중시하며, 갈등을 피하려 합니다.',
      tip: '자신의 의견을 더 적극적으로 표현하고, 변화에 유연하게 대응하는 연습이 필요합니다. 당신의 안정성은 팀의 큰 자산입니다.',
    },
    en: {
      title: 'S — Steady',
      subtitle: 'A reliable supporter who anchors the team with trust and stability',
      description: 'Steady types are patient and reliable team players. They value harmony and stability, excelling at maintaining team balance. They create consistent results through cooperation and reliability.',
      keywords: ['Reliability', 'Patience', 'Teamwork', 'Stability', 'Cooperation'],
      strengths: ['Outstanding reliability', 'Strong team support', 'Consistent performance', 'Excellent listening skills'],
      weaknesses: ['Slow to adapt to change', 'Lack of assertiveness', 'Excessive risk-aversion', 'Conflict avoidance'],
      workStyle: 'Works systematically and steadily. Achieves best results in stable environments and prefers predictable routines over sudden change.',
      communication: 'Gentle and thoughtful, actively listens. Values harmony and tends to avoid conflict.',
      tip: 'Practice expressing your opinions more assertively and being flexible with change. Your stability is a great asset to any team.',
    },
    ja: {
      title: 'S型 — 安定型',
      subtitle: '信頼と安定でチームを支える協力者',
      description: '安定型は忍耐強く信頼できるチームプレイヤーです。調和と安定を重視し、チームのバランスを保つことに優れています。一貫性と協力を通じて安定した成果を生み出します。',
      keywords: ['信頼性', '忍耐', 'チームワーク', '安定性', '協力'],
      strengths: ['卓越した信頼性', '強いチームサポート', '一貫した成果', '優れた傾聴能力'],
      weaknesses: ['変化への適応が遅い', '自己主張の欠如', '過度なリスク回避', '葛藤回避'],
      workStyle: '体系的で着実に働きます。安定した環境で最高の成果を出し、急な変化より予測可能なルーティンを好みます。',
      communication: '穏やかで思いやりがあり、積極的に傾聴します。調和を重視し、葛藤を避けようとします。',
      tip: '自分の意見をより積極的に表現して、変化に柔軟に対応する練習が必要です。あなたの安定性はチームの大きな資産です。',
    },
  },
  C: {
    ko: {
      title: 'C형 — 신중형',
      subtitle: '정확성과 품질로 완성도를 높이는 분석가',
      description: '신중형은 분석적이고 세심하며, 정확성을 중시합니다. 높은 기준을 세우고 품질에 집중합니다. 체계적인 접근과 세부 사항에 대한 집중으로 복잡한 문제를 해결합니다.',
      keywords: ['정확성', '분석력', '품질', '체계성', '완벽주의'],
      strengths: ['뛰어난 분석력', '높은 품질 기준', '체계적 문제 해결', '신중한 의사결정'],
      weaknesses: ['과도한 완벽주의', '변화에 저항', '결정 지연', '비판에 민감'],
      workStyle: '데이터와 사실을 기반으로 꼼꼼하게 작업합니다. 충분한 시간과 정보를 갖고 높은 품질의 결과를 만들어냅니다.',
      communication: '정확하고 사실 중심으로 소통합니다. 감정보다 논리를 선호하며, 증거와 데이터를 중시합니다.',
      tip: '완벽하지 않아도 충분히 좋은 결과를 인정하는 연습이 필요합니다. 때로는 빠른 실행이 완벽한 계획보다 더 가치 있습니다.',
    },
    en: {
      title: 'C — Conscientious',
      subtitle: 'An analyst who raises quality through accuracy and precision',
      description: 'Conscientious types are analytical, meticulous, and value accuracy. They set high standards and focus on quality. They solve complex problems through systematic approaches and attention to detail.',
      keywords: ['Accuracy', 'Analytical thinking', 'Quality', 'Systematization', 'Perfectionism'],
      strengths: ['Outstanding analytical skills', 'High quality standards', 'Systematic problem-solving', 'Careful decision-making'],
      weaknesses: ['Excessive perfectionism', 'Resistance to change', 'Decision delays', 'Sensitive to criticism'],
      workStyle: 'Works meticulously based on data and facts. Produces high-quality results given sufficient time and information.',
      communication: 'Communicates precisely, fact-based. Prefers logic over emotion, values evidence and data.',
      tip: 'Practice accepting results that are good enough even if not perfect. Sometimes quick execution is more valuable than the perfect plan.',
    },
    ja: {
      title: 'C型 — 慎重型',
      subtitle: '正確さと品質で完成度を高めるアナリスト',
      description: '慎重型は分析的で細やかで、正確さを重視します。高い基準を設けて品質に集中します。体系的アプローチと細部への注目で複雑な問題を解決します。',
      keywords: ['正確さ', '分析力', '品質', '体系性', '完璧主義'],
      strengths: ['卓越した分析力', '高い品質基準', '体系的問題解決', '慎重な意思決定'],
      weaknesses: ['過度な完璧主義', '変化への抵抗', '決断の遅れ', '批判に敏感'],
      workStyle: 'データと事実に基づいて丁寧に作業します。十分な時間と情報をもって高品質の結果を生み出します。',
      communication: '正確で事実中心に話します。感情より論理を好み、証拠とデータを重視します。',
      tip: '完璧でなくても十分良い結果を認める練習が必要です。時に素早い実行が完璧な計画より価値があります。',
    },
  },
}

interface Props { locale?: string }

export default function DiscPersonalityTest({ locale: lp = 'ko' }: Props) {
  const locale: Locale = (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const initResult = (): { type: DiscType; scores: Scores } | null => {
    if (typeof window === 'undefined') return null
    const p = new URLSearchParams(window.location.search)
    const t = p.get('disc') as DiscType | null
    if (t && RESULTS[t]) return { type: t, scores: { D: 0, I: 0, S: 0, C: 0 } }
    return null
  }

  const [current, setCurrent] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('disc')) return questions.length
    }
    return 0
  })
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<DiscType[]>([])
  const [result, setResult] = useState<{ type: DiscType; scores: Scores } | null>(initResult)

  function calcResult(ans: DiscType[]): { type: DiscType; scores: Scores } {
    const scores: Scores = { D: 0, I: 0, S: 0, C: 0 }
    for (const a of ans) scores[a]++
    const type = (Object.keys(scores) as DiscType[]).reduce((a, b) => scores[a] >= scores[b] ? a : b)
    return { type, scores }
  }

  function pick(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    const newAns = [...answers, questions[current].options[idx].disc]
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
    const url = `${window.location.origin}${window.location.pathname}?disc=${result.type}`
    const text = `${lb.shareMsg} ${result.type}형 (${RESULTS[result.type][locale].title})`
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
  const color = DISC_COLORS[result.type]
  const total = questions.length
  const chartData: { subject: string; value: number }[] = (Object.keys(result.scores) as DiscType[]).map(k => ({
    subject: k,
    value: Math.round((result.scores[k] / total) * 100),
  }))

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-2xl font-bold text-white"
          style={{ backgroundColor: color }}>
          {result.type}
        </div>
        <h2 className="text-lg font-semibold">{r.title}</h2>
        <p className="text-muted-foreground font-medium text-sm">{r.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground text-center mb-2">{lb.chartTitle}</p>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 14, fontWeight: 700 }} />
            <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
            <Tooltip formatter={((v: number) => `${v}${lb.pct}`) as any} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{lb.keywords}</h3>
        <div className="flex flex-wrap gap-2">
          {r.keywords.map(k => (
            <span key={k} className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: color }}>{k}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-green-600">{lb.strengths}</h3>
          <ul className="space-y-1">
            {r.strengths.map(s => <li key={s} className="text-xs text-muted-foreground flex gap-1"><span className="text-green-500">+</span>{s}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-amber-600">{lb.weaknesses}</h3>
          <ul className="space-y-1">
            {r.weaknesses.map(w => <li key={w} className="text-xs text-muted-foreground flex gap-1"><span className="text-amber-500">△</span>{w}</li>)}
          </ul>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <h3 className="font-semibold text-sm">{lb.workStyle}</h3>
          <p className="text-sm text-muted-foreground">{r.workStyle}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <h3 className="font-semibold text-sm">{lb.communication}</h3>
          <p className="text-sm text-muted-foreground">{r.communication}</p>
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
