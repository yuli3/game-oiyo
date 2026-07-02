import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type RiasecType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang) ? (locale as SupportedLang) : 'en'
}

interface Question { id: string; text: string; type: RiasecType }

const RIASEC_COLORS: Record<RiasecType, string> = {
  R: '#f97316', I: '#3b82f6', A: '#a855f7', S: '#22c55e', E: '#ef4444', C: '#eab308'
}

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string
  questionOf: (c: number, t: number) => string
  scaleLabels: [string, string, string, string, string]
  restart: string; share: string; shareMsg: string
  yourCode: string; topTypes: string; careers: string
  profile: string; note: string
  typeNames: Record<RiasecType, string>
  typeFull: Record<RiasecType, string>
}> = {
  ko: {
    title: 'RIASEC 직업 흥미 유형 검사',
    subtitle: '내게 맞는 직업 찾기',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['전혀 아님', '약간 아님', '보통', '약간 그럼', '매우 그럼'],
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '나의 RIASEC 직업 흥미 유형',
    yourCode: '나의 Holland 코드',
    topTypes: '상위 유형 설명',
    careers: '추천 직업 분야',
    profile: '6가지 흥미 프로필',
    note: 'Holland 직업 흥미 이론(RIASEC)에 기반한 검사입니다. 하나의 참고 도구로 활용하세요.',
    typeNames: { R: '현실형', I: '탐구형', A: '예술형', S: '사회형', E: '진취형', C: '관습형' },
    typeFull: { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' },
  },
  en: {
    title: 'RIASEC Career Interest Test',
    subtitle: 'Holland Code Career Guide',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['Not at all', 'Slightly not', 'Neutral', 'Somewhat', 'Very much'],
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My RIASEC Holland Code',
    yourCode: 'My Holland Code',
    topTypes: 'Top Type Descriptions',
    careers: 'Recommended Career Fields',
    profile: '6-Dimension Interest Profile',
    note: 'Based on Holland\'s RIASEC career interest theory. Use as one reference among many.',
    typeNames: { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' },
    typeFull: { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' },
  },
  ja: {
    title: 'RIASEC 職業興味検査',
    subtitle: '自分に合った職業を見つける',
    questionOf: (c, t) => `${c} / ${t}`,
    scaleLabels: ['全くない', 'あまりない', '普通', '少しある', 'とてもある'],
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のRIASECホランドコード',
    yourCode: '私のホランドコード',
    topTypes: 'トップタイプの説明',
    careers: 'おすすめ職業分野',
    profile: '6次元興味プロフィール',
    note: 'ホランドのRIASEC職業興味理論に基づいた検査です。一つの参考ツールとしてご活用ください。',
    typeNames: { R: '現実型', I: '研究型', A: '芸術型', S: '社会型', E: '企業型', C: '慣習型' },
    typeFull: { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    { id: 'R1', text: '기계나 도구를 조작하고 수리하는 것을 즐긴다', type: 'R' },
    { id: 'R2', text: '야외에서 신체를 사용하는 활동을 좋아한다', type: 'R' },
    { id: 'R3', text: '직접 손을 사용해 무언가를 만들거나 조립하는 것이 좋다', type: 'R' },
    { id: 'R4', text: '실질적이고 구체적인 문제를 해결하는 것이 즐겁다', type: 'R' },
    { id: 'I1', text: '복잡한 문제를 분석하고 원리를 이해하는 것이 즐겁다', type: 'I' },
    { id: 'I2', text: '과학적 실험이나 연구 활동에 흥미를 느낀다', type: 'I' },
    { id: 'I3', text: '새로운 이론이나 개념을 탐구하는 것이 좋다', type: 'I' },
    { id: 'I4', text: '데이터를 수집하고 분석해 결론을 도출하는 것이 만족스럽다', type: 'I' },
    { id: 'A1', text: '음악, 미술, 글쓰기 등 창의적 활동에서 기쁨을 느낀다', type: 'A' },
    { id: 'A2', text: '나만의 독창적인 방식으로 무언가를 표현하고 싶다', type: 'A' },
    { id: 'A3', text: '아름다움, 미적 감각, 디자인에 깊은 관심이 있다', type: 'A' },
    { id: 'A4', text: '정해진 규칙보다 자유롭게 창조하는 것을 선호한다', type: 'A' },
    { id: 'S1', text: '사람들을 가르치거나 돕고 상담하는 것이 보람 있다', type: 'S' },
    { id: 'S2', text: '팀워크와 협력을 통해 함께 문제를 해결하는 것이 좋다', type: 'S' },
    { id: 'S3', text: '다른 사람의 감정에 공감하고 지원하는 것이 자연스럽다', type: 'S' },
    { id: 'S4', text: '사회적 문제에 관심을 갖고 기여하고 싶다', type: 'S' },
    { id: 'E1', text: '사람들을 설득하고 리드하는 것이 즐겁다', type: 'E' },
    { id: 'E2', text: '목표를 세우고 전략적으로 추진하는 것이 자연스럽다', type: 'E' },
    { id: 'E3', text: '새로운 사업 아이디어나 기회를 발견하는 것이 설레인다', type: 'E' },
    { id: 'E4', text: '경쟁 상황에서 더 의욕이 솟는다', type: 'E' },
    { id: 'C1', text: '체계적이고 정확하게 업무를 처리하는 것이 편하다', type: 'C' },
    { id: 'C2', text: '규칙과 절차를 따르는 것이 안정감을 준다', type: 'C' },
    { id: 'C3', text: '데이터, 숫자, 기록을 정리하는 것이 만족스럽다', type: 'C' },
    { id: 'C4', text: '세부사항에 주의를 기울이고 오류를 찾아내는 것이 자연스럽다', type: 'C' },
  ],
  en: [
    { id: 'R1', text: 'I enjoy operating and repairing machines or tools', type: 'R' },
    { id: 'R2', text: 'I like physical activities outdoors', type: 'R' },
    { id: 'R3', text: 'I enjoy making or assembling things with my hands', type: 'R' },
    { id: 'R4', text: 'I find it satisfying to solve practical, concrete problems', type: 'R' },
    { id: 'I1', text: 'I enjoy analyzing complex problems and understanding their principles', type: 'I' },
    { id: 'I2', text: 'I\'m interested in scientific experiments or research activities', type: 'I' },
    { id: 'I3', text: 'I enjoy exploring new theories and concepts', type: 'I' },
    { id: 'I4', text: 'I find it satisfying to collect data, analyze it, and draw conclusions', type: 'I' },
    { id: 'A1', text: 'I feel joy in creative activities like music, art, or writing', type: 'A' },
    { id: 'A2', text: 'I want to express myself in my own unique way', type: 'A' },
    { id: 'A3', text: 'I have a deep interest in beauty, aesthetics, and design', type: 'A' },
    { id: 'A4', text: 'I prefer creating freely over following fixed rules', type: 'A' },
    { id: 'S1', text: 'Teaching, helping, or counseling people feels rewarding', type: 'S' },
    { id: 'S2', text: 'I enjoy solving problems collaboratively through teamwork', type: 'S' },
    { id: 'S3', text: 'Empathizing with and supporting others comes naturally to me', type: 'S' },
    { id: 'S4', text: 'I\'m interested in social issues and want to contribute', type: 'S' },
    { id: 'E1', text: 'I enjoy persuading and leading people', type: 'E' },
    { id: 'E2', text: 'Setting goals and pursuing them strategically feels natural', type: 'E' },
    { id: 'E3', text: 'Discovering new business ideas or opportunities excites me', type: 'E' },
    { id: 'E4', text: 'I feel more motivated in competitive situations', type: 'E' },
    { id: 'C1', text: 'I\'m comfortable handling tasks in an organized, accurate way', type: 'C' },
    { id: 'C2', text: 'Following rules and procedures gives me a sense of stability', type: 'C' },
    { id: 'C3', text: 'Organizing data, numbers, and records feels satisfying', type: 'C' },
    { id: 'C4', text: 'Paying attention to details and catching errors comes naturally', type: 'C' },
  ],
  ja: [
    { id: 'R1', text: '機械や道具を操作・修理することを楽しむ', type: 'R' },
    { id: 'R2', text: '屋外で身体を使う活動が好きだ', type: 'R' },
    { id: 'R3', text: '手を使って何かを作ったり組み立てたりするのが好きだ', type: 'R' },
    { id: 'R4', text: '実際的で具体的な問題を解決するのが楽しい', type: 'R' },
    { id: 'I1', text: '複雑な問題を分析し、原理を理解することが楽しい', type: 'I' },
    { id: 'I2', text: '科学的な実験や研究活動に興味を感じる', type: 'I' },
    { id: 'I3', text: '新しい理論や概念を探求することが好きだ', type: 'I' },
    { id: 'I4', text: 'データを収集・分析して結論を導くことが満足できる', type: 'I' },
    { id: 'A1', text: '音楽、美術、執筆などの創造的活動に喜びを感じる', type: 'A' },
    { id: 'A2', text: '自分独自の方法で何かを表現したい', type: 'A' },
    { id: 'A3', text: '美しさ、美的感覚、デザインに深い関心がある', type: 'A' },
    { id: 'A4', text: '決まったルールより自由に創造することを好む', type: 'A' },
    { id: 'S1', text: '人を教えたり助けたり相談に乗ることにやりがいを感じる', type: 'S' },
    { id: 'S2', text: 'チームワークと協力で一緒に問題解決するのが好きだ', type: 'S' },
    { id: 'S3', text: '他者の感情に共感してサポートするのが自然にできる', type: 'S' },
    { id: 'S4', text: '社会的問題に関心を持ち貢献したい', type: 'S' },
    { id: 'E1', text: '人を説得したりリードしたりするのが楽しい', type: 'E' },
    { id: 'E2', text: '目標を立てて戦略的に推進するのが自然にできる', type: 'E' },
    { id: 'E3', text: '新しいビジネスアイデアや機会を発見することに興奮する', type: 'E' },
    { id: 'E4', text: '競争状況でより意欲が湧く', type: 'E' },
    { id: 'C1', text: '体系的かつ正確に業務を処理するのが得意だ', type: 'C' },
    { id: 'C2', text: 'ルールや手順に従うことで安心感を得る', type: 'C' },
    { id: 'C3', text: 'データ、数字、記録を整理することに満足感がある', type: 'C' },
    { id: 'C4', text: '細部に注意を払い誤りを見つけるのが自然にできる', type: 'C' },
  ],
}

interface TypeDetail { description: string; careers: string[] }
const TYPE_DETAILS: Record<RiasecType, Record<SupportedLang, TypeDetail>> = {
  R: {
    ko: { description: '현실형은 구체적이고 실용적인 활동을 선호합니다. 도구와 기계를 다루거나 신체적 기술을 발휘하는 것을 즐기며, 만질 수 있는 결과물을 만들어내는 것에서 만족감을 느낍니다.', careers: ['엔지니어', '건축가', '의사/외과의', '농업 전문가', '운동선수', '조종사', '정비사', '소방관', '군인'] },
    en: { description: 'Realistic types prefer concrete and practical activities. They enjoy working with tools and machines or applying physical skills, finding satisfaction in creating tangible results.', careers: ['Engineer', 'Architect', 'Physician/Surgeon', 'Agricultural Specialist', 'Athlete', 'Pilot', 'Mechanic', 'Firefighter', 'Military'] },
    ja: { description: '現実型は具体的で実践的な活動を好みます。道具や機械を扱ったり身体的技術を発揮したりすることを楽しみ、触れる成果物を作ることに満足感を感じます。', careers: ['エンジニア', '建築家', '医師・外科医', '農業専門家', 'アスリート', 'パイロット', '整備士', '消防士', '軍人'] },
  },
  I: {
    ko: { description: '탐구형은 지적 호기심이 강하고 분석적 사고를 즐깁니다. 복잡한 문제를 이해하고 새로운 지식을 발견하는 데서 깊은 만족감을 얻으며, 과학적 탐구를 좋아합니다.', careers: ['연구원/과학자', '의사', '데이터 분석가', '심리학자', '철학자', '경제학자', '통계학자', '프로그래머', '천문학자'] },
    en: { description: 'Investigative types have strong intellectual curiosity and enjoy analytical thinking. They gain deep satisfaction from understanding complex problems and discovering new knowledge.', careers: ['Researcher/Scientist', 'Physician', 'Data Analyst', 'Psychologist', 'Philosopher', 'Economist', 'Statistician', 'Programmer', 'Astronomer'] },
    ja: { description: '研究型は知的好奇心が強く分析的思考を楽しみます。複雑な問題を理解し新しい知識を発見することに深い満足感を得て、科学的探求を好みます。', careers: ['研究者・科学者', '医師', 'データアナリスト', '心理学者', '哲学者', '経済学者', '統計学者', 'プログラマー', '天文学者'] },
  },
  A: {
    ko: { description: '예술형은 창의적 자기표현을 중시하며 독창성을 발휘하는 환경에서 번성합니다. 아름다움과 미적 감각에 민감하며, 자유로운 창작 활동에서 가장 큰 충족감을 얻습니다.', careers: ['예술가/디자이너', '작가', '음악가', '배우', '사진작가', '건축 디자이너', 'UX 디자이너', '광고 크리에이티브', '영화 감독'] },
    en: { description: 'Artistic types value creative self-expression and thrive in environments where originality is exercised. They are sensitive to beauty and aesthetics, finding the greatest fulfillment in free creative activity.', careers: ['Artist/Designer', 'Writer', 'Musician', 'Actor', 'Photographer', 'Architectural Designer', 'UX Designer', 'Ad Creative', 'Film Director'] },
    ja: { description: '芸術型は創造的な自己表現を重視し、独創性を発揮できる環境で輝きます。美しさと美的感覚に敏感で、自由な創作活動に最大の充実感を得ます。', careers: ['アーティスト・デザイナー', '作家', 'ミュージシャン', '俳優', 'フォトグラファー', '建築デザイナー', 'UXデザイナー', '広告クリエイティブ', '映画監督'] },
  },
  S: {
    ko: { description: '사회형은 사람들을 돕고 가르치고 지원하는 것을 통해 의미를 찾습니다. 강한 공감 능력과 협력적 성향을 가지고 있으며, 인간 중심의 활동에서 가장 큰 보람을 느낍니다.', careers: ['교사/교수', '상담사/치료사', '사회복지사', '의료 전문가', '코치', '인사담당자', '비영리 활동가', '간호사', '커뮤니티 매니저'] },
    en: { description: 'Social types find meaning in helping, teaching, and supporting people. They have strong empathy and cooperative tendencies, finding the greatest reward in human-centered activities.', careers: ['Teacher/Professor', 'Counselor/Therapist', 'Social Worker', 'Healthcare Professional', 'Coach', 'HR Professional', 'Nonprofit Activist', 'Nurse', 'Community Manager'] },
    ja: { description: '社会型は人々を助け、教え、支援することに意味を見出します。強い共感能力と協力的な傾向を持ち、人間中心の活動に最大のやりがいを感じます。', careers: ['教師・教授', 'カウンセラー・セラピスト', 'ソーシャルワーカー', '医療専門家', 'コーチ', '人事担当者', 'NPO活動家', '看護師', 'コミュニティマネージャー'] },
  },
  E: {
    ko: { description: '진취형은 리더십과 영향력 발휘를 즐기며, 사람들을 설득하고 목표를 달성하는 과정에서 에너지를 얻습니다. 경쟁적이고 야심차며 결과 지향적인 특성이 강합니다.', careers: ['기업인/CEO', '영업 전문가', '마케터', '변호사', '정치인', '투자자', '프로젝트 매니저', '부동산 전문가', '스타트업 창업자'] },
    en: { description: 'Enterprising types enjoy exercising leadership and influence, gaining energy from persuading people and achieving goals. They are competitive, ambitious, and strongly results-oriented.', careers: ['Business Owner/CEO', 'Sales Professional', 'Marketer', 'Lawyer', 'Politician', 'Investor', 'Project Manager', 'Real Estate Professional', 'Startup Founder'] },
    ja: { description: '企業型はリーダーシップと影響力の発揮を楽しみ、人を説得し目標を達成するプロセスからエネルギーを得ます。競争的で野心的、結果志向の特性が強いです。', careers: ['起業家・CEO', '営業専門家', 'マーケター', '弁護士', '政治家', '投資家', 'プロジェクトマネージャー', '不動産専門家', 'スタートアップ創業者'] },
  },
  C: {
    ko: { description: '관습형은 정확성, 체계, 질서를 중시합니다. 규칙을 따르고 세부사항에 주의를 기울이는 것을 편안하게 느끼며, 조직화된 환경에서 신뢰할 수 있는 결과를 만들어냅니다.', careers: ['회계사/세무사', '행정 전문가', '데이터 관리자', '품질 관리사', '사서', '뱅커', '보험 전문가', '감사관', '공공행정 관리'] },
    en: { description: 'Conventional types value accuracy, structure, and order. They feel comfortable following rules and paying attention to details, producing reliable results in organized environments.', careers: ['Accountant/Tax Specialist', 'Administrative Professional', 'Data Manager', 'Quality Controller', 'Librarian', 'Banker', 'Insurance Professional', 'Auditor', 'Public Administrator'] },
    ja: { description: '慣習型は正確さ、体系、秩序を重視します。ルールに従い細部に注意を払うことを快適に感じ、組織化された環境で信頼できる結果を生み出します。', careers: ['会計士・税理士', '行政専門家', 'データ管理者', '品質管理者', '司書', '銀行員', '保険専門家', '監査官', '公共行政管理'] },
  },
}

interface Props { locale?: string }

export default function RiasecCareerTest({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp ?? 'ko')
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState(0)
  const [scores, setScores] = useState<Record<RiasecType, number>>({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })
  const [done, setDone] = useState(false)

  function pick(val: number) {
    const q = questions[current]
    const newScores = { ...scores, [q.type]: scores[q.type] + val }
    if (current + 1 >= questions.length) { setScores(newScores); setDone(true) }
    else { setScores(newScores); setCurrent(current + 1) }
  }

  function restart() { setScores({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }); setCurrent(0); setDone(false) }

  function share() {
    const sorted = (Object.keys(scores) as RiasecType[]).sort((a, b) => scores[b] - scores[a])
    const code = sorted.slice(0, 3).join('')
    const url = window.location.href
    const text = `${lb.shareMsg}: ${code}`
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
          <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: RIASEC_COLORS[q.type] }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <span className="text-xs font-bold px-2 py-1 rounded-full text-white mb-3 inline-block" style={{ backgroundColor: RIASEC_COLORS[q.type] }}>{lb.typeNames[q.type]}</span>
          <p className="text-lg font-medium leading-relaxed mt-2">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {lb.scaleLabels.map((label, i) => (
            <button key={i} onClick={() => pick(i + 1)} aria-label={label}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-3">
              <span className="w-7 h-7 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-none">{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  const sorted = (Object.keys(scores) as RiasecType[]).sort((a, b) => scores[b] - scores[a])
  const topCode = sorted.slice(0, 3).join('')
  const maxScore = 20

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourCode}</p>
        <div className="text-4xl font-bold tracking-widest">{topCode.split('').map(c => (
          <span key={c} style={{ color: RIASEC_COLORS[c as RiasecType] }}>{c}</span>
        ))}</div>
        <p className="text-sm text-muted-foreground">{sorted.slice(0, 3).map(t => lb.typeNames[t]).join(' · ')}</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-bold text-sm">{lb.profile}</h3>
        {sorted.map(type => {
          const pct = Math.round((scores[type] / maxScore) * 100)
          return (
            <div key={type} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: RIASEC_COLORS[type] }}>{type} — {lb.typeNames[type]}</span>
                <span>{scores[type]}/{maxScore}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={lb.typeNames[type]}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: RIASEC_COLORS[type] }} />
              </div>
            </div>
          )
        })}
      </div>
      {sorted.slice(0, 2).map(type => (
        <div key={type} className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-bold text-sm" style={{ color: RIASEC_COLORS[type] }}>{lb.typeNames[type]} ({lb.typeFull[type]})</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{TYPE_DETAILS[type][locale].description}</p>
          <h4 className="font-bold text-xs text-muted-foreground mt-2">{lb.careers}</h4>
          <p className="text-sm text-muted-foreground">{TYPE_DETAILS[type][locale].careers.join(' · ')}</p>
        </div>
      ))}
      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      <div className="flex gap-3">
        <button onClick={restart} aria-label={lb.restart} className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors">{lb.restart}</button>
        <button onClick={share} aria-label={lb.share} className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity">{lb.share}</button>
      </div>
    </div>
  )
}
