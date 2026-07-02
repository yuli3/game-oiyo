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
  careerDescription: string
  topCareers: string[]
  workStyle: string
  idealEnvironment: string
  workStrengths: string[]
  workWeaknesses: string[]
  careerTip: string
  avoidEnvironments: string[]
}

type Locale = 'ko' | 'en' | 'ja'

// ─── i18n Labels ──────────────────────────────────────────────────────────────
const LABELS: Record<Locale, {
  title: string
  subtitle: string
  questionOf: (cur: number, total: number) => string
  restart: string
  share: string
  shareMsg: string
  topCareers: string
  workStyle: string
  idealEnv: string
  workStrengths: string
  workWeaknesses: string
  careerTip: string
  avoidEnvs: string
  chartTitle: string
  yourType: string
}> = {
  ko: {
    title: 'MBTI 직업 적성 테스트',
    subtitle: '나에게 맞는 직업은 무엇일까요?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 MBTI 직업 유형은',
    topCareers: '추천 직업',
    workStyle: '업무 스타일',
    idealEnv: '이상적인 환경',
    workStrengths: '직업적 강점',
    workWeaknesses: '직업적 약점',
    careerTip: '커리어 조언',
    avoidEnvs: '피하면 좋은 환경',
    chartTitle: '성향 분석',
    yourType: '나의 직업 유형',
  },
  en: {
    title: 'MBTI Career Test',
    subtitle: 'What career suits you best?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My MBTI career type is',
    topCareers: 'Recommended Careers',
    workStyle: 'Work Style',
    idealEnv: 'Ideal Environment',
    workStrengths: 'Career Strengths',
    workWeaknesses: 'Career Weaknesses',
    careerTip: 'Career Tip',
    avoidEnvs: 'Environments to Avoid',
    chartTitle: 'Trait Analysis',
    yourType: 'Your Career Type',
  },
  ja: {
    title: 'MBTI 職業適性テスト',
    subtitle: 'あなたに合う職業は？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私のMBTIキャリアタイプは',
    topCareers: 'おすすめの職業',
    workStyle: '仕事スタイル',
    idealEnv: '理想的な環境',
    workStrengths: 'キャリアの強み',
    workWeaknesses: 'キャリアの弱み',
    careerTip: 'キャリアアドバイス',
    avoidEnvs: '避けたい環境',
    chartTitle: '傾向分析',
    yourType: '私の職業タイプ',
  },
}

// ─── Questions ────────────────────────────────────────────────────────────────
const QUESTIONS: Record<Locale, Question[]> = {
  ko: [
    {
      id: 'q1',
      text: '새 프로젝트가 시작될 때 나는...',
      options: [
        { text: '팀원들과 바로 아이디어를 나누며 흥분한다', score: { E: 2 } },
        { text: '혼자 충분히 구상한 뒤 의견을 낸다', score: { I: 2 } },
        { text: '전체 계획을 먼저 세우고 싶다', score: { J: 1, N: 1 } },
        { text: '일단 시작하며 방향을 잡아나간다', score: { P: 1, E: 1 } },
      ],
    },
    {
      id: 'q2',
      text: '업무에서 나는 주로 어떤 부분에서 만족감을 느끼나요?',
      options: [
        { text: '구체적인 문제를 해결하고 눈에 보이는 결과를 만들 때', score: { S: 2 } },
        { text: '새로운 아이디어나 가능성을 탐색할 때', score: { N: 2 } },
        { text: '사람들과 협력하며 함께 성장할 때', score: { F: 2 } },
        { text: '시스템이나 프로세스를 개선할 때', score: { T: 1, J: 1 } },
      ],
    },
    {
      id: 'q3',
      text: '직장에서 갈등이 생기면 나는...',
      options: [
        { text: '논리적으로 분석하고 객관적인 해결책을 제시한다', score: { T: 2 } },
        { text: '모두의 감정을 고려한 조화로운 해결을 찾는다', score: { F: 2 } },
        { text: '규칙이나 절차에 따라 처리한다', score: { J: 1, S: 1 } },
        { text: '상황에 따라 유연하게 대응한다', score: { P: 2 } },
      ],
    },
    {
      id: 'q4',
      text: '나에게 이상적인 업무 환경은?',
      options: [
        { text: '팀워크와 소통이 활발한 오픈 공간', score: { E: 2 } },
        { text: '집중할 수 있는 조용하고 독립적인 공간', score: { I: 2 } },
        { text: '체계적이고 안정적인 구조', score: { J: 1, S: 1 } },
        { text: '자유롭고 유연한 분위기', score: { P: 1, N: 1 } },
      ],
    },
    {
      id: 'q5',
      text: '나는 주로 어떻게 의사결정을 하나요?',
      options: [
        { text: '데이터와 논리를 기반으로 분석한다', score: { T: 2 } },
        { text: '나와 관련된 사람들에게 어떤 영향을 미칠지 고려한다', score: { F: 2 } },
        { text: '직관과 큰 그림을 본다', score: { N: 2 } },
        { text: '과거 경험과 실제 사례를 참고한다', score: { S: 2 } },
      ],
    },
    {
      id: 'q6',
      text: '업무 기한과 계획에 대해 나는...',
      options: [
        { text: '기한보다 일찍 완료하는 편이다', score: { J: 2 } },
        { text: '기한 직전에 집중력이 높아진다', score: { P: 2 } },
        { text: '상세한 일정표를 만들고 지킨다', score: { J: 2, S: 1 } },
        { text: '유연하게 우선순위를 조정한다', score: { P: 1, N: 1 } },
      ],
    },
    {
      id: 'q7',
      text: '나는 어떤 유형의 문제를 해결하는 것을 즐기나요?',
      options: [
        { text: '명확한 답이 있는 구체적인 문제', score: { S: 2, T: 1 } },
        { text: '정답이 없는 창의적인 도전', score: { N: 2, P: 1 } },
        { text: '사람들 사이의 관계나 소통 문제', score: { F: 2, E: 1 } },
        { text: '복잡한 시스템이나 전략적 과제', score: { N: 1, T: 1, J: 1 } },
      ],
    },
    {
      id: 'q8',
      text: '회의나 발표 상황에서 나는...',
      options: [
        { text: '적극적으로 의견을 개진하고 토론을 주도한다', score: { E: 2, T: 1 } },
        { text: '필요할 때만 발언하고 주로 듣는다', score: { I: 2 } },
        { text: '미리 준비한 내용을 체계적으로 전달한다', score: { J: 1, S: 1 } },
        { text: '흐름에 따라 즉흥적으로 기여한다', score: { P: 1, E: 1 } },
      ],
    },
    {
      id: 'q9',
      text: '장기 커리어 목표를 생각할 때 나는...',
      options: [
        { text: '10년 후 구체적인 포지션과 경로를 그린다', score: { J: 2, S: 1 } },
        { text: '큰 비전과 가능성에 집중하고 경로는 유연하게', score: { N: 2, P: 1 } },
        { text: '내가 사람들에게 미칠 긍정적 영향을 중심으로 생각한다', score: { F: 2 } },
        { text: '시장 가치와 성장 가능성을 분석한다', score: { T: 2 } },
      ],
    },
    {
      id: 'q10',
      text: '새로운 기술이나 방법을 배울 때 나는...',
      options: [
        { text: '단계별 매뉴얼을 따라 차근차근 익힌다', score: { S: 2, J: 1 } },
        { text: '원리를 이해한 뒤 응용법을 스스로 탐구한다', score: { N: 2, I: 1 } },
        { text: '동료와 함께 배우며 서로 가르쳐준다', score: { E: 2, F: 1 } },
        { text: '일단 해보면서 시행착오로 익힌다', score: { P: 2, E: 1 } },
      ],
    },
    {
      id: 'q11',
      text: '직업 선택에서 나에게 가장 중요한 것은?',
      options: [
        { text: '안정성과 명확한 역할', score: { S: 2, J: 1 } },
        { text: '창의성과 자율성', score: { N: 2, P: 1 } },
        { text: '사람들과의 관계와 사회적 기여', score: { F: 2, E: 1 } },
        { text: '성과와 전문성 개발', score: { T: 2, J: 1 } },
      ],
    },
    {
      id: 'q12',
      text: '업무에서 스트레스를 받을 때 나는...',
      options: [
        { text: '혼자 조용히 충전하는 시간이 필요하다', score: { I: 2 } },
        { text: '친구나 동료에게 이야기하며 해소한다', score: { E: 2 } },
        { text: '문제의 원인을 분석하고 해결책을 찾는다', score: { T: 2 } },
        { text: '즐거운 활동으로 기분을 전환한다', score: { F: 1, P: 1 } },
      ],
    },
  ],
  en: [
    {
      id: 'q1',
      text: 'When a new project starts, I...',
      options: [
        { text: 'Get excited sharing ideas with teammates right away', score: { E: 2 } },
        { text: 'Think things through alone before sharing my views', score: { I: 2 } },
        { text: 'Want to plan everything out first', score: { J: 1, N: 1 } },
        { text: 'Just start and figure out direction along the way', score: { P: 1, E: 1 } },
      ],
    },
    {
      id: 'q2',
      text: 'At work, I feel most satisfied when...',
      options: [
        { text: 'Solving concrete problems and seeing tangible results', score: { S: 2 } },
        { text: 'Exploring new ideas and possibilities', score: { N: 2 } },
        { text: 'Collaborating with people and growing together', score: { F: 2 } },
        { text: 'Improving systems or processes', score: { T: 1, J: 1 } },
      ],
    },
    {
      id: 'q3',
      text: 'When workplace conflict arises, I...',
      options: [
        { text: 'Analyze logically and propose objective solutions', score: { T: 2 } },
        { text: 'Look for a harmonious resolution considering everyone\'s feelings', score: { F: 2 } },
        { text: 'Follow rules or procedures to handle it', score: { J: 1, S: 1 } },
        { text: 'Respond flexibly based on the situation', score: { P: 2 } },
      ],
    },
    {
      id: 'q4',
      text: 'My ideal work environment is...',
      options: [
        { text: 'An open space with active teamwork and communication', score: { E: 2 } },
        { text: 'A quiet, independent space to focus', score: { I: 2 } },
        { text: 'A structured, stable organization', score: { J: 1, S: 1 } },
        { text: 'A free, flexible atmosphere', score: { P: 1, N: 1 } },
      ],
    },
    {
      id: 'q5',
      text: 'How do I usually make decisions?',
      options: [
        { text: 'Analyze based on data and logic', score: { T: 2 } },
        { text: 'Consider how it affects the people involved', score: { F: 2 } },
        { text: 'Trust intuition and look at the big picture', score: { N: 2 } },
        { text: 'Reference past experiences and real cases', score: { S: 2 } },
      ],
    },
    {
      id: 'q6',
      text: 'Regarding deadlines and planning, I...',
      options: [
        { text: 'Tend to finish before the deadline', score: { J: 2 } },
        { text: 'Get focused right before the deadline', score: { P: 2 } },
        { text: 'Create detailed schedules and stick to them', score: { J: 2, S: 1 } },
        { text: 'Flexibly adjust priorities as needed', score: { P: 1, N: 1 } },
      ],
    },
    {
      id: 'q7',
      text: 'I enjoy solving these types of problems...',
      options: [
        { text: 'Concrete problems with clear answers', score: { S: 2, T: 1 } },
        { text: 'Creative challenges without a single right answer', score: { N: 2, P: 1 } },
        { text: 'Relationship or communication issues between people', score: { F: 2, E: 1 } },
        { text: 'Complex systems or strategic challenges', score: { N: 1, T: 1, J: 1 } },
      ],
    },
    {
      id: 'q8',
      text: 'In meetings or presentations, I...',
      options: [
        { text: 'Actively share opinions and lead discussions', score: { E: 2, T: 1 } },
        { text: 'Mostly listen and speak only when needed', score: { I: 2 } },
        { text: 'Systematically deliver prepared content', score: { J: 1, S: 1 } },
        { text: 'Contribute spontaneously based on the flow', score: { P: 1, E: 1 } },
      ],
    },
    {
      id: 'q9',
      text: 'When thinking about long-term career goals, I...',
      options: [
        { text: 'Picture a specific position and path 10 years ahead', score: { J: 2, S: 1 } },
        { text: 'Focus on a big vision and keep the path flexible', score: { N: 2, P: 1 } },
        { text: 'Think about the positive impact I\'ll have on people', score: { F: 2 } },
        { text: 'Analyze market value and growth potential', score: { T: 2 } },
      ],
    },
    {
      id: 'q10',
      text: 'When learning a new skill or method, I...',
      options: [
        { text: 'Follow step-by-step manuals carefully', score: { S: 2, J: 1 } },
        { text: 'Understand the principles, then explore applications myself', score: { N: 2, I: 1 } },
        { text: 'Learn together with colleagues and teach each other', score: { E: 2, F: 1 } },
        { text: 'Just try it and learn through trial and error', score: { P: 2, E: 1 } },
      ],
    },
    {
      id: 'q11',
      text: 'In choosing a career, what matters most to me?',
      options: [
        { text: 'Stability and clearly defined roles', score: { S: 2, J: 1 } },
        { text: 'Creativity and autonomy', score: { N: 2, P: 1 } },
        { text: 'Relationships and social contribution', score: { F: 2, E: 1 } },
        { text: 'Achievement and professional development', score: { T: 2, J: 1 } },
      ],
    },
    {
      id: 'q12',
      text: 'When I feel stressed at work, I...',
      options: [
        { text: 'Need quiet time alone to recharge', score: { I: 2 } },
        { text: 'Talk it out with friends or colleagues', score: { E: 2 } },
        { text: 'Analyze the root cause and find a solution', score: { T: 2 } },
        { text: 'Switch off with enjoyable activities', score: { F: 1, P: 1 } },
      ],
    },
  ],
  ja: [
    {
      id: 'q1',
      text: '新しいプロジェクトが始まる時、私は...',
      options: [
        { text: 'すぐチームメンバーとアイデアを共有して興奮する', score: { E: 2 } },
        { text: '一人で十分に考えてから意見を出す', score: { I: 2 } },
        { text: '全体の計画を先に立てたい', score: { J: 1, N: 1 } },
        { text: 'まず始めながら方向性を決めていく', score: { P: 1, E: 1 } },
      ],
    },
    {
      id: 'q2',
      text: '仕事で最も満足感を感じるのはいつですか？',
      options: [
        { text: '具体的な問題を解決して目に見える結果を作る時', score: { S: 2 } },
        { text: '新しいアイデアや可能性を探る時', score: { N: 2 } },
        { text: '人々と協力して一緒に成長する時', score: { F: 2 } },
        { text: 'システムやプロセスを改善する時', score: { T: 1, J: 1 } },
      ],
    },
    {
      id: 'q3',
      text: '職場で衝突が起きた時、私は...',
      options: [
        { text: '論理的に分析して客観的な解決策を提案する', score: { T: 2 } },
        { text: '全員の感情を考慮した調和的な解決を探す', score: { F: 2 } },
        { text: 'ルールや手順に従って処理する', score: { J: 1, S: 1 } },
        { text: '状況に応じて柔軟に対応する', score: { P: 2 } },
      ],
    },
    {
      id: 'q4',
      text: '私にとって理想的な職場環境は？',
      options: [
        { text: 'チームワークとコミュニケーションが活発なオープンな場所', score: { E: 2 } },
        { text: '集中できる静かで独立した空間', score: { I: 2 } },
        { text: '体系的で安定した組織構造', score: { J: 1, S: 1 } },
        { text: '自由で柔軟な雰囲気', score: { P: 1, N: 1 } },
      ],
    },
    {
      id: 'q5',
      text: '私は主にどのように意思決定しますか？',
      options: [
        { text: 'データと論理をもとに分析する', score: { T: 2 } },
        { text: '関係する人々への影響を考える', score: { F: 2 } },
        { text: '直感と全体像を重視する', score: { N: 2 } },
        { text: '過去の経験と実際の事例を参考にする', score: { S: 2 } },
      ],
    },
    {
      id: 'q6',
      text: '締め切りと計画について、私は...',
      options: [
        { text: '締め切りより早く完了する傾向がある', score: { J: 2 } },
        { text: '締め切り直前に集中力が上がる', score: { P: 2 } },
        { text: '詳細なスケジュールを作り守る', score: { J: 2, S: 1 } },
        { text: '柔軟に優先順位を調整する', score: { P: 1, N: 1 } },
      ],
    },
    {
      id: 'q7',
      text: 'どのタイプの問題を解くのが好きですか？',
      options: [
        { text: '明確な答えのある具体的な問題', score: { S: 2, T: 1 } },
        { text: '正解のないクリエイティブな挑戦', score: { N: 2, P: 1 } },
        { text: '人間関係やコミュニケーションの問題', score: { F: 2, E: 1 } },
        { text: '複雑なシステムや戦略的な課題', score: { N: 1, T: 1, J: 1 } },
      ],
    },
    {
      id: 'q8',
      text: '会議やプレゼンの場面で、私は...',
      options: [
        { text: '積極的に意見を述べ、議論を主導する', score: { E: 2, T: 1 } },
        { text: '必要な時だけ発言し、主に聞く', score: { I: 2 } },
        { text: '事前に準備した内容を体系的に伝える', score: { J: 1, S: 1 } },
        { text: '流れに合わせて即興で貢献する', score: { P: 1, E: 1 } },
      ],
    },
    {
      id: 'q9',
      text: '長期的なキャリア目標を考える時、私は...',
      options: [
        { text: '10年後の具体的なポジションと経路を描く', score: { J: 2, S: 1 } },
        { text: '大きなビジョンに集中し、経路は柔軟に', score: { N: 2, P: 1 } },
        { text: '人々への良い影響を中心に考える', score: { F: 2 } },
        { text: '市場価値と成長可能性を分析する', score: { T: 2 } },
      ],
    },
    {
      id: 'q10',
      text: '新しい技術や方法を学ぶ時、私は...',
      options: [
        { text: 'ステップごとのマニュアルを丁寧に従う', score: { S: 2, J: 1 } },
        { text: '原理を理解してから応用を自分で探る', score: { N: 2, I: 1 } },
        { text: '同僚と一緒に学び、教え合う', score: { E: 2, F: 1 } },
        { text: 'とりあえずやってみて試行錯誤で身につける', score: { P: 2, E: 1 } },
      ],
    },
    {
      id: 'q11',
      text: '職業選択で最も重視することは？',
      options: [
        { text: '安定性と明確な役割', score: { S: 2, J: 1 } },
        { text: '創造性と自律性', score: { N: 2, P: 1 } },
        { text: '人との関係や社会貢献', score: { F: 2, E: 1 } },
        { text: '成果と専門性の向上', score: { T: 2, J: 1 } },
      ],
    },
    {
      id: 'q12',
      text: '仕事でストレスを感じた時、私は...',
      options: [
        { text: '一人で静かに充電する時間が必要', score: { I: 2 } },
        { text: '友人や同僚に話して解消する', score: { E: 2 } },
        { text: '原因を分析して解決策を見つける', score: { T: 2 } },
        { text: '楽しい活動で気分転換する', score: { F: 1, P: 1 } },
      ],
    },
  ],
}

// ─── Results Data ─────────────────────────────────────────────────────────────
const RESULTS: Record<MBTIType, Record<Locale, ResultData>> = {
  INTJ: {
    ko: {
      name: '전략적 설계자',
      careerDescription: '장기 비전을 세우고 체계적으로 실행하는 능력이 탁월합니다. 복잡한 시스템을 분석하고 최적화하는 것을 즐깁니다.',
      topCareers: ['전략 컨설턴트', '데이터 과학자', '소프트웨어 아키텍트', '연구원', '투자 분석가'],
      workStyle: '독립적으로 깊이 있는 작업을 선호하며, 장기 목표를 향해 체계적으로 진행합니다.',
      idealEnvironment: '자율성이 보장되고 성과로 평가받는 환경. 지적 도전이 지속적으로 주어지는 곳.',
      workStrengths: ['전략적 사고', '복잡한 문제 해결', '장기 계획 수립', '독립적 작업'],
      workWeaknesses: ['세부 사항 간과 가능성', '팀 소통 부족', '지나친 완벽주의'],
      careerTip: '뛰어난 전략가이지만, 실행 단계에서 팀과의 소통을 강화하세요. 피드백을 수용하는 유연성이 성공의 열쇠입니다.',
      avoidEnvironments: ['단순 반복 업무', '과도한 소셜 상호작용 요구', '창의성이 억압되는 환경'],
    },
    en: {
      name: 'Strategic Architect',
      careerDescription: 'Exceptional at setting long-term visions and executing systematically. Enjoys analyzing and optimizing complex systems.',
      topCareers: ['Strategy Consultant', 'Data Scientist', 'Software Architect', 'Researcher', 'Investment Analyst'],
      workStyle: 'Prefers independent, deep work and progresses systematically toward long-term goals.',
      idealEnvironment: 'Autonomy-guaranteed environment evaluated on results. Continuous intellectual challenges.',
      workStrengths: ['Strategic thinking', 'Complex problem solving', 'Long-term planning', 'Independent work'],
      workWeaknesses: ['May overlook details', 'Insufficient team communication', 'Excessive perfectionism'],
      careerTip: 'A brilliant strategist, but strengthen communication with your team during execution. Flexibility in receiving feedback is the key to success.',
      avoidEnvironments: ['Repetitive simple tasks', 'Excessive social interaction requirements', 'Environments suppressing creativity'],
    },
    ja: {
      name: '戦略的設計者',
      careerDescription: '長期ビジョンを描き体系的に実行する能力に優れています。複雑なシステムを分析・最適化することを楽しみます。',
      topCareers: ['戦略コンサルタント', 'データサイエンティスト', 'ソフトウェアアーキテクト', '研究者', '投資アナリスト'],
      workStyle: '独立して深く作業することを好み、長期目標に向けて体系的に進めます。',
      idealEnvironment: '自律性が保証され成果で評価される環境。継続的な知的挑戦がある場所。',
      workStrengths: ['戦略的思考', '複雑な問題解決', '長期計画策定', '独立した作業'],
      workWeaknesses: ['細部を見落とす可能性', 'チームとのコミュニケーション不足', '過度な完璧主義'],
      careerTip: '優れた戦略家ですが、実行段階でチームとのコミュニケーションを強化しましょう。フィードバックを受け入れる柔軟性が成功の鍵です。',
      avoidEnvironments: ['単純繰り返し作業', '過度な社交的交流の要求', '創造性が抑圧される環境'],
    },
  },
  INTP: {
    ko: {
      name: '논리적 탐구자',
      careerDescription: '복잡한 이론과 아이디어를 탐구하는 것을 즐깁니다. 지적 호기심이 강하고 혁신적인 해결책을 찾아냅니다.',
      topCareers: ['소프트웨어 개발자', '철학자/학자', '수학자', '시스템 분석가', '과학 연구원'],
      workStyle: '이론적 분석을 깊이 파고들며, 독립적으로 자신만의 속도로 작업합니다.',
      idealEnvironment: '지적 자유가 보장되고 아이디어를 실험할 수 있는 환경.',
      workStrengths: ['논리적 분석', '혁신적 사고', '패턴 인식', '객관적 평가'],
      workWeaknesses: ['완성보다 탐구에 집중', '실용적 세부사항 간과', '팀 작업 시 소통 부족'],
      careerTip: '뛰어난 분석력을 실제 결과물로 연결하는 훈련이 필요합니다. 마감 기한을 존중하는 습관을 기르세요.',
      avoidEnvironments: ['엄격한 규칙 중심 환경', '창의성이 없는 단순 작업', '지나친 사교 요구'],
    },
    en: {
      name: 'Logical Explorer',
      careerDescription: 'Loves exploring complex theories and ideas. Driven by intellectual curiosity to find innovative solutions.',
      topCareers: ['Software Developer', 'Philosopher/Scholar', 'Mathematician', 'Systems Analyst', 'Scientific Researcher'],
      workStyle: 'Dives deeply into theoretical analysis, working independently at their own pace.',
      idealEnvironment: 'Environment with intellectual freedom and ability to experiment with ideas.',
      workStrengths: ['Logical analysis', 'Innovative thinking', 'Pattern recognition', 'Objective evaluation'],
      workWeaknesses: ['Focused on exploration over completion', 'May overlook practical details', 'Communication gaps in team work'],
      careerTip: 'Practice connecting your brilliant analytical skills to tangible outcomes. Develop habits of respecting deadlines.',
      avoidEnvironments: ['Rigid rule-based environments', 'Simple tasks without creativity', 'Excessive socializing requirements'],
    },
    ja: {
      name: '論理的探求者',
      careerDescription: '複雑な理論やアイデアを探求することを楽しみます。知的好奇心が強く、革新的な解決策を見つけます。',
      topCareers: ['ソフトウェア開発者', '哲学者/学者', '数学者', 'システムアナリスト', '科学研究者'],
      workStyle: '理論的分析を深く掘り下げ、独立して自分のペースで作業します。',
      idealEnvironment: '知的自由が保証されアイデアを実験できる環境。',
      workStrengths: ['論理的分析', '革新的思考', 'パターン認識', '客観的評価'],
      workWeaknesses: ['完成より探求に集中', '実用的な細部を見落とす', 'チーム作業でのコミュニケーション不足'],
      careerTip: '優れた分析力を実際の成果物に結びつける練習が必要です。締め切りを守る習慣を身につけましょう。',
      avoidEnvironments: ['厳格なルール中心の環境', '創造性のない単純作業', '過度な社交の要求'],
    },
  },
  ENTJ: {
    ko: {
      name: '대담한 리더',
      careerDescription: '목표 지향적이며 결단력이 있습니다. 조직을 이끌고 성과를 극대화하는 것에 타고난 능력이 있습니다.',
      topCareers: ['CEO/경영자', '프로젝트 매니저', '변호사', '기업 컨설턴트', '금융 디렉터'],
      workStyle: '빠른 의사결정으로 팀을 이끌고, 높은 기준을 설정하며 결과를 추구합니다.',
      idealEnvironment: '도전적 목표가 있고 리더십을 발휘할 수 있는 환경.',
      workStrengths: ['강력한 리더십', '전략적 비전', '결단력', '성과 극대화'],
      workWeaknesses: ['팀원 감정 무시 가능성', '과도한 통제', '인내심 부족'],
      careerTip: '리더십은 강점이지만, 팀원의 의견을 듣고 공감하는 능력을 개발하면 훨씬 더 강력한 리더가 됩니다.',
      avoidEnvironments: ['수동적인 역할', '창의성이 제한된 환경', '느린 의사결정 구조'],
    },
    en: {
      name: 'Bold Leader',
      careerDescription: 'Goal-oriented and decisive. Has a natural ability to lead organizations and maximize performance.',
      topCareers: ['CEO/Executive', 'Project Manager', 'Lawyer', 'Business Consultant', 'Finance Director'],
      workStyle: 'Leads teams with quick decisions, sets high standards, and drives results.',
      idealEnvironment: 'Environment with challenging goals where leadership can be exercised.',
      workStrengths: ['Strong leadership', 'Strategic vision', 'Decisiveness', 'Performance maximization'],
      workWeaknesses: ['May ignore team emotions', 'Excessive control', 'Impatience'],
      careerTip: 'Leadership is your strength, but developing the ability to listen and empathize with team members will make you an even more powerful leader.',
      avoidEnvironments: ['Passive roles', 'Environments with limited creativity', 'Slow decision-making structures'],
    },
    ja: {
      name: '大胆なリーダー',
      careerDescription: '目標志向で決断力があります。組織を率いて成果を最大化する天賦の才があります。',
      topCareers: ['CEO/経営者', 'プロジェクトマネージャー', '弁護士', 'ビジネスコンサルタント', 'ファイナンスディレクター'],
      workStyle: '素早い意思決定でチームを率い、高い基準を設定して結果を追求します。',
      idealEnvironment: '挑戦的な目標があり、リーダーシップを発揮できる環境。',
      workStrengths: ['強力なリーダーシップ', '戦略的ビジョン', '決断力', '成果の最大化'],
      workWeaknesses: ['チームメンバーの感情を無視する可能性', '過度な管理', '忍耐力不足'],
      careerTip: 'リーダーシップは強みですが、チームメンバーの意見を聞いて共感する能力を開発すると、さらに強力なリーダーになれます。',
      avoidEnvironments: ['受動的な役割', '創造性が制限された環境', '意思決定が遅い構造'],
    },
  },
  ENTP: {
    ko: {
      name: '혁신적 사상가',
      careerDescription: '기존 방식에 도전하고 새로운 아이디어를 제시합니다. 창의적 토론과 혁신을 즐깁니다.',
      topCareers: ['기업가/스타트업 창업자', '마케터', '변호사', '크리에이티브 디렉터', '제품 관리자'],
      workStyle: '아이디어를 빠르게 생성하고 다양한 관점을 탐색합니다. 틀에 얽매이지 않습니다.',
      idealEnvironment: '창의성과 토론이 장려되고 혁신이 가능한 환경.',
      workStrengths: ['창의적 문제 해결', '설득력', '아이디어 생성', '빠른 적응'],
      workWeaknesses: ['마무리 약함', '세부 실행 계획 부족', '일관성 유지 어려움'],
      careerTip: '아이디어를 실행으로 옮기는 역량 강화가 필요합니다. 완성의 기쁨을 경험할수록 더 큰 성공을 이룰 수 있습니다.',
      avoidEnvironments: ['단조로운 반복 작업', '엄격한 위계 구조', '변화가 없는 환경'],
    },
    en: {
      name: 'Innovative Thinker',
      careerDescription: 'Challenges existing methods and proposes new ideas. Enjoys creative debate and innovation.',
      topCareers: ['Entrepreneur/Startup Founder', 'Marketer', 'Lawyer', 'Creative Director', 'Product Manager'],
      workStyle: 'Rapidly generates ideas and explores diverse perspectives. Not bound by convention.',
      idealEnvironment: 'Environment where creativity and debate are encouraged and innovation is possible.',
      workStrengths: ['Creative problem solving', 'Persuasiveness', 'Idea generation', 'Quick adaptation'],
      workWeaknesses: ['Weak at follow-through', 'Lacks detailed execution plans', 'Difficulty maintaining consistency'],
      careerTip: 'Strengthen your ability to convert ideas into execution. The more you experience the joy of completion, the greater success you\'ll achieve.',
      avoidEnvironments: ['Monotonous repetitive tasks', 'Strict hierarchical structures', 'Environments resistant to change'],
    },
    ja: {
      name: '革新的思想家',
      careerDescription: '既存の方法に挑戦し新しいアイデアを提案します。創造的な討論と革新を楽しみます。',
      topCareers: ['起業家/スタートアップ創業者', 'マーケター', '弁護士', 'クリエイティブディレクター', 'プロダクトマネージャー'],
      workStyle: 'アイデアを素早く生成し、多様な観点を探索します。型にはまりません。',
      idealEnvironment: '創造性と討論が奨励され、革新が可能な環境。',
      workStrengths: ['創造的問題解決', '説得力', 'アイデア生成', '素早い適応'],
      workWeaknesses: ['締めくくりが弱い', '詳細な実行計画の欠如', '一貫性を保つのが難しい'],
      careerTip: 'アイデアを実行に移す能力を強化する必要があります。完成の喜びを経験するほど、より大きな成功を収めることができます。',
      avoidEnvironments: ['単調な繰り返し作業', '厳格な階層構造', '変化のない環境'],
    },
  },
  INFJ: {
    ko: {
      name: '통찰력 있는 조언자',
      careerDescription: '깊은 통찰력으로 사람들을 돕고 의미 있는 변화를 만들어냅니다. 타인의 잠재력을 발견하는 탁월한 능력이 있습니다.',
      topCareers: ['상담사/심리치료사', '작가', '교육자', '사회복지사', 'HR 전문가'],
      workStyle: '의미 있는 일에 깊이 몰입하며, 사람들에게 긍정적 영향을 미치는 것을 목표로 합니다.',
      idealEnvironment: '가치와 목적이 일치하고 사람을 돕는 환경.',
      workStrengths: ['공감 능력', '통찰력', '의미 추구', '장기 비전'],
      workWeaknesses: ['번아웃 위험', '갈등 회피', '지나친 이상주의'],
      careerTip: '타인을 돕는 것이 특기이지만, 자신을 먼저 돌보는 것이 지속 가능한 성공의 기초입니다.',
      avoidEnvironments: ['가치와 충돌하는 환경', '극도로 경쟁적인 문화', '지나치게 실용적인 접근만 하는 곳'],
    },
    en: {
      name: 'Insightful Counselor',
      careerDescription: 'Helps people with deep insight and creates meaningful change. Has exceptional ability to discover others\' potential.',
      topCareers: ['Counselor/Psychotherapist', 'Writer', 'Educator', 'Social Worker', 'HR Professional'],
      workStyle: 'Deeply immerses in meaningful work, aiming to have a positive impact on people.',
      idealEnvironment: 'Environment aligned with values and purpose, focused on helping people.',
      workStrengths: ['Empathy', 'Insight', 'Pursuit of meaning', 'Long-term vision'],
      workWeaknesses: ['Risk of burnout', 'Conflict avoidance', 'Excessive idealism'],
      careerTip: 'Helping others is your specialty, but taking care of yourself first is the foundation of sustainable success.',
      avoidEnvironments: ['Environments conflicting with values', 'Extremely competitive cultures', 'Places with purely pragmatic approaches'],
    },
    ja: {
      name: '洞察力あるアドバイザー',
      careerDescription: '深い洞察力で人々を助け、意味ある変化を生み出します。他者の可能性を発見する卓越した能力があります。',
      topCareers: ['カウンセラー/心理療法士', '作家', '教育者', 'ソーシャルワーカー', 'HR専門家'],
      workStyle: '意味のある仕事に深く没入し、人々にポジティブな影響を与えることを目標とします。',
      idealEnvironment: '価値観と目的が一致し、人を助ける環境。',
      workStrengths: ['共感能力', '洞察力', '意味の追求', '長期ビジョン'],
      workWeaknesses: ['バーンアウトリスク', '葛藤回避', '過度な理想主義'],
      careerTip: '他者を助けることが得意ですが、まず自分を大切にすることが持続可能な成功の基礎です。',
      avoidEnvironments: ['価値観と衝突する環境', '極度に競争的な文化', '実用的なアプローチだけの場所'],
    },
  },
  INFP: {
    ko: {
      name: '이상적인 창조자',
      careerDescription: '개인의 가치와 진정성을 중시하며 창의적 표현을 통해 세상에 기여합니다.',
      topCareers: ['작가/시인', '예술가/디자이너', '상담사', '사회 활동가', '교사'],
      workStyle: '자신의 가치와 일치하는 프로젝트에서 최고의 창의성을 발휘합니다.',
      idealEnvironment: '자율성과 창의적 자유가 보장되고 의미 있는 작업을 하는 환경.',
      workStrengths: ['창의성', '공감 능력', '진정성', '개인 가치 중심'],
      workWeaknesses: ['현실적 제약 무시', '비판에 민감', '완성도 집착으로 인한 지연'],
      careerTip: '창의성이 최대 강점이지만, 실용적 기술을 보완하면 더 큰 영향력을 발휘할 수 있습니다.',
      avoidEnvironments: ['가치와 상충하는 업무', '엄격한 위계질서', '창의성이 억압되는 환경'],
    },
    en: {
      name: 'Idealistic Creator',
      careerDescription: 'Values personal integrity and contributes to the world through creative expression.',
      topCareers: ['Writer/Poet', 'Artist/Designer', 'Counselor', 'Social Activist', 'Teacher'],
      workStyle: 'Shows greatest creativity in projects aligned with personal values.',
      idealEnvironment: 'Environment with autonomy, creative freedom, and meaningful work.',
      workStrengths: ['Creativity', 'Empathy', 'Authenticity', 'Values-centered approach'],
      workWeaknesses: ['Ignoring practical constraints', 'Sensitive to criticism', 'Delays from perfectionism'],
      careerTip: 'Creativity is your greatest strength, but supplementing with practical skills will multiply your impact.',
      avoidEnvironments: ['Work conflicting with values', 'Strict hierarchies', 'Environments suppressing creativity'],
    },
    ja: {
      name: '理想的なクリエイター',
      careerDescription: '個人の価値観と誠実さを重視し、創造的な表現を通じて世界に貢献します。',
      topCareers: ['作家/詩人', 'アーティスト/デザイナー', 'カウンセラー', '社会活動家', '教師'],
      workStyle: '個人の価値観と一致するプロジェクトで最大の創造性を発揮します。',
      idealEnvironment: '自律性と創造的自由が保証され、意味のある作業ができる環境。',
      workStrengths: ['創造性', '共感能力', '誠実さ', '個人の価値観中心'],
      workWeaknesses: ['現実的制約を無視', '批判に敏感', '完璧主義による遅延'],
      careerTip: '創造性が最大の強みですが、実用的なスキルを補うとより大きな影響力を発揮できます。',
      avoidEnvironments: ['価値観と相反する業務', '厳格な階層秩序', '創造性が抑圧される環境'],
    },
  },
  ENFJ: {
    ko: {
      name: '카리스마 있는 교육자',
      careerDescription: '사람들을 감화시키고 성장을 이끄는 뛰어난 능력이 있습니다. 팀의 잠재력을 최대한 끌어냅니다.',
      topCareers: ['교사/교수', '코치/멘토', '인사 담당자', '비영리 단체 리더', '커뮤니케이션 전문가'],
      workStyle: '사람들과 깊이 연결되며 팀의 성장과 화합을 중시합니다.',
      idealEnvironment: '사람들과 협력하며 의미 있는 변화를 만드는 환경.',
      workStrengths: ['리더십', '공감 능력', '의사소통', '팀 동기 부여'],
      workWeaknesses: ['자신의 필요 무시', '갈등 회피', '타인의 감정에 지나치게 영향받음'],
      careerTip: '다른 사람을 이끄는 능력은 탁월하지만, 자신의 경계를 설정하고 자기 자신을 돌보는 것도 중요합니다.',
      avoidEnvironments: ['고립된 작업', '경쟁 중심 문화', '인간관계가 없는 환경'],
    },
    en: {
      name: 'Charismatic Educator',
      careerDescription: 'Has exceptional ability to inspire and lead people\'s growth. Maximizes team potential.',
      topCareers: ['Teacher/Professor', 'Coach/Mentor', 'HR Manager', 'Non-profit Leader', 'Communications Expert'],
      workStyle: 'Connects deeply with people and values team growth and harmony.',
      idealEnvironment: 'Environment creating meaningful change through collaboration with people.',
      workStrengths: ['Leadership', 'Empathy', 'Communication', 'Team motivation'],
      workWeaknesses: ['Ignores own needs', 'Avoids conflict', 'Overly influenced by others\' emotions'],
      careerTip: 'Your ability to lead others is exceptional, but setting personal boundaries and self-care is equally important.',
      avoidEnvironments: ['Isolated work', 'Competition-focused culture', 'Environments without human connection'],
    },
    ja: {
      name: 'カリスマ的教育者',
      careerDescription: '人々を感化させ、成長を導く卓越した能力があります。チームの潜在力を最大限に引き出します。',
      topCareers: ['教師/教授', 'コーチ/メンター', '人事担当者', '非営利団体リーダー', 'コミュニケーション専門家'],
      workStyle: '人々と深くつながり、チームの成長と調和を重視します。',
      idealEnvironment: '人々と協力して意味のある変化を作る環境。',
      workStrengths: ['リーダーシップ', '共感能力', 'コミュニケーション', 'チームの動機付け'],
      workWeaknesses: ['自分のニーズを無視', '葛藤回避', '他者の感情に過度に影響される'],
      careerTip: '人を率いる能力は卓越していますが、自分の境界を設定し、自己ケアも重要です。',
      avoidEnvironments: ['孤立した作業', '競争中心の文化', '人間関係のない環境'],
    },
  },
  ENFP: {
    ko: {
      name: '열정적인 활동가',
      careerDescription: '창의성과 열정으로 사람들을 영감시킵니다. 다양한 가능성을 탐색하며 세상을 더 나은 곳으로 만듭니다.',
      topCareers: ['마케터', '저널리스트', '기업가', '크리에이터/콘텐츠 제작자', '상담사'],
      workStyle: '열정적으로 아이디어를 추구하며, 다양한 사람들과 에너지를 교환합니다.',
      idealEnvironment: '창의성과 다양성이 존중되고 사람들과 활발히 교류할 수 있는 환경.',
      workStrengths: ['창의성', '열정', '대인 관계', '영감 제공'],
      workWeaknesses: ['집중력 유지 어려움', '세부 실행 약함', '감정적 결정'],
      careerTip: '열정이 최대 강점이지만, 한 가지에 집중하고 마무리하는 능력을 키우면 훨씬 큰 성과를 낼 수 있습니다.',
      avoidEnvironments: ['단조롭고 반복적인 업무', '창의성 없는 환경', '지나치게 경직된 구조'],
    },
    en: {
      name: 'Enthusiastic Activist',
      careerDescription: 'Inspires people with creativity and passion. Explores diverse possibilities to make the world a better place.',
      topCareers: ['Marketer', 'Journalist', 'Entrepreneur', 'Creator/Content Producer', 'Counselor'],
      workStyle: 'Passionately pursues ideas and exchanges energy with diverse people.',
      idealEnvironment: 'Environment valuing creativity and diversity, with active interaction with people.',
      workStrengths: ['Creativity', 'Passion', 'Interpersonal skills', 'Inspiring others'],
      workWeaknesses: ['Difficulty maintaining focus', 'Weak at detailed execution', 'Emotional decision-making'],
      careerTip: 'Passion is your greatest strength, but developing the ability to focus on one thing and follow through will produce much greater results.',
      avoidEnvironments: ['Monotonous and repetitive tasks', 'Environments without creativity', 'Overly rigid structures'],
    },
    ja: {
      name: '情熱的な活動家',
      careerDescription: '創造性と情熱で人々にインスピレーションを与えます。様々な可能性を探求して世界をより良い場所にします。',
      topCareers: ['マーケター', 'ジャーナリスト', '起業家', 'クリエイター/コンテンツ制作者', 'カウンセラー'],
      workStyle: '情熱的にアイデアを追求し、多様な人々とエネルギーを交換します。',
      idealEnvironment: '創造性と多様性が尊重され、人々と活発に交流できる環境。',
      workStrengths: ['創造性', '情熱', '対人関係', 'インスピレーション提供'],
      workWeaknesses: ['集中力の維持が難しい', '詳細な実行が弱い', '感情的な意思決定'],
      careerTip: '情熱が最大の強みですが、一つのことに集中して仕上げる能力を伸ばすと、はるかに大きな成果が得られます。',
      avoidEnvironments: ['単調で繰り返しの多い業務', '創造性のない環境', '過度に硬直した構造'],
    },
  },
  ISTJ: {
    ko: {
      name: '신뢰할 수 있는 실무자',
      careerDescription: '책임감 있고 꼼꼼하며 체계적으로 일을 처리합니다. 신뢰와 안정성을 기반으로 조직에 크게 기여합니다.',
      topCareers: ['회계사/세무사', '공무원', '프로젝트 매니저', '품질 관리 전문가', '의사/간호사'],
      workStyle: '명확한 역할과 책임 속에서 체계적이고 꼼꼼하게 업무를 수행합니다.',
      idealEnvironment: '안정적이고 예측 가능한 환경, 명확한 규칙과 절차가 있는 곳.',
      workStrengths: ['신뢰성', '꼼꼼함', '책임감', '체계적 업무 처리'],
      workWeaknesses: ['변화에 느린 적응', '혁신보다 전통 선호', '지나친 규칙 의존'],
      careerTip: '탁월한 실무 능력을 가지고 있습니다. 변화와 혁신에 조금 더 열린 자세를 취하면 더 큰 기회를 잡을 수 있습니다.',
      avoidEnvironments: ['불안정하고 예측 불가능한 환경', '지속적인 변화를 요구하는 곳', '구조 없는 자유로운 환경'],
    },
    en: {
      name: 'Reliable Practitioner',
      careerDescription: 'Responsible, meticulous, and systematic. Makes major contributions to organizations based on trust and stability.',
      topCareers: ['Accountant/Tax Specialist', 'Civil Servant', 'Project Manager', 'Quality Control Expert', 'Doctor/Nurse'],
      workStyle: 'Performs tasks systematically and meticulously within clear roles and responsibilities.',
      idealEnvironment: 'Stable, predictable environment with clear rules and procedures.',
      workStrengths: ['Reliability', 'Meticulousness', 'Responsibility', 'Systematic task management'],
      workWeaknesses: ['Slow to adapt to change', 'Prefers tradition over innovation', 'Excessive rule dependence'],
      careerTip: 'You have exceptional practical abilities. Being more open to change and innovation will help you seize greater opportunities.',
      avoidEnvironments: ['Unstable, unpredictable environments', 'Places requiring constant change', 'Unstructured free-form environments'],
    },
    ja: {
      name: '信頼できる実務者',
      careerDescription: '責任感があり、几帳面で体系的に仕事を処理します。信頼と安定性をもとに組織に大きく貢献します。',
      topCareers: ['会計士/税理士', '公務員', 'プロジェクトマネージャー', '品質管理専門家', '医師/看護師'],
      workStyle: '明確な役割と責任の中で体系的かつ几帳面に業務を遂行します。',
      idealEnvironment: '安定していて予測可能な環境、明確なルールと手順がある場所。',
      workStrengths: ['信頼性', '几帳面さ', '責任感', '体系的な業務処理'],
      workWeaknesses: ['変化への適応が遅い', '革新より伝統を好む', '過度なルール依存'],
      careerTip: '卓越した実務能力を持っています。変化と革新にもう少しオープンな姿勢をとると、より大きなチャンスをつかめます。',
      avoidEnvironments: ['不安定で予測不可能な環境', '継続的な変化を要求する場所', '構造のない自由な環境'],
    },
  },
  ISFJ: {
    ko: {
      name: '헌신적인 보호자',
      careerDescription: '다른 사람을 돕고 지원하는 것에서 큰 의미를 찾습니다. 온화하고 꼼꼼하며 헌신적입니다.',
      topCareers: ['간호사', '사회복지사', '초등학교 교사', '행정 전문가', '상담사'],
      workStyle: '팀의 필요에 세심하게 반응하며, 배경에서 조용히 하지만 중요한 역할을 담당합니다.',
      idealEnvironment: '사람을 직접 돕고, 안정적이며 조화로운 환경.',
      workStrengths: ['공감 능력', '세심함', '신뢰성', '팀 지원'],
      workWeaknesses: ['자기 주장 부족', '변화 적응 어려움', '과도한 자기 희생'],
      careerTip: '다른 사람을 잘 돌보는 당신, 자신의 필요와 경계도 소중히 여기는 것을 잊지 마세요.',
      avoidEnvironments: ['갈등이 잦은 환경', '지나치게 경쟁적인 문화', '인간관계가 없는 고립된 작업'],
    },
    en: {
      name: 'Devoted Protector',
      careerDescription: 'Finds deep meaning in helping and supporting others. Warm, meticulous, and dedicated.',
      topCareers: ['Nurse', 'Social Worker', 'Elementary School Teacher', 'Administrative Professional', 'Counselor'],
      workStyle: 'Responds sensitively to team needs, playing quiet but important roles behind the scenes.',
      idealEnvironment: 'Directly helping people in a stable, harmonious environment.',
      workStrengths: ['Empathy', 'Sensitivity', 'Reliability', 'Team support'],
      workWeaknesses: ['Lack of assertiveness', 'Difficulty adapting to change', 'Excessive self-sacrifice'],
      careerTip: 'You care well for others — don\'t forget to also value your own needs and boundaries.',
      avoidEnvironments: ['Conflict-prone environments', 'Overly competitive cultures', 'Isolated work without human connection'],
    },
    ja: {
      name: '献身的な保護者',
      careerDescription: '他者を助け、支援することに深い意義を見出します。温かく、几帳面で、献身的です。',
      topCareers: ['看護師', 'ソーシャルワーカー', '小学校教師', '行政専門家', 'カウンセラー'],
      workStyle: 'チームのニーズに細やかに対応し、陰ながら重要な役割を担います。',
      idealEnvironment: '人を直接助け、安定していて調和のある環境。',
      workStrengths: ['共感能力', '細やかさ', '信頼性', 'チームサポート'],
      workWeaknesses: ['自己主張の欠如', '変化への適応が難しい', '過度な自己犠牲'],
      careerTip: '他者をよく気遣うあなた、自分のニーズと境界も大切にすることを忘れないでください。',
      avoidEnvironments: ['葛藤が多い環境', '過度に競争的な文化', '人間関係のない孤立した作業'],
    },
  },
  ESTJ: {
    ko: {
      name: '효율적인 관리자',
      careerDescription: '체계와 질서를 유지하며 팀을 효율적으로 운영합니다. 목표 달성에 강한 의지와 실행력을 보입니다.',
      topCareers: ['관리자/매니저', '군 장교', '법률가', '재무 관리자', '운영 디렉터'],
      workStyle: '명확한 목표와 기준을 설정하고 팀이 이를 달성하도록 이끕니다.',
      idealEnvironment: '명확한 위계와 역할이 있고 성과가 인정받는 환경.',
      workStrengths: ['조직력', '실행력', '리더십', '문제 해결'],
      workWeaknesses: ['유연성 부족', '감정보다 논리 우선', '변화에 저항'],
      careerTip: '탁월한 관리 능력을 가지고 있습니다. 팀원의 감정과 상황을 더 세심히 배려하면 더욱 강력한 리더가 됩니다.',
      avoidEnvironments: ['모호하고 비구조적인 환경', '일관성 없는 기준', '잦은 방향 전환'],
    },
    en: {
      name: 'Efficient Administrator',
      careerDescription: 'Maintains order and runs teams efficiently. Shows strong will and execution in achieving goals.',
      topCareers: ['Manager/Administrator', 'Military Officer', 'Lawyer', 'Finance Manager', 'Operations Director'],
      workStyle: 'Sets clear goals and standards, leading teams to achieve them.',
      idealEnvironment: 'Environment with clear hierarchy, roles, and recognized performance.',
      workStrengths: ['Organization', 'Execution', 'Leadership', 'Problem solving'],
      workWeaknesses: ['Lack of flexibility', 'Logic over emotions', 'Resistance to change'],
      careerTip: 'You have exceptional management abilities. Being more mindful of team members\' emotions and circumstances will make you an even stronger leader.',
      avoidEnvironments: ['Ambiguous, unstructured environments', 'Inconsistent standards', 'Frequent changes in direction'],
    },
    ja: {
      name: '効率的な管理者',
      careerDescription: '体系と秩序を維持してチームを効率的に運営します。目標達成に強い意志と実行力を示します。',
      topCareers: ['マネージャー/管理者', '軍将校', '法律家', '財務マネージャー', '運営ディレクター'],
      workStyle: '明確な目標と基準を設定し、チームがそれを達成するよう導きます。',
      idealEnvironment: '明確な階層と役割があり、成果が認められる環境。',
      workStrengths: ['組織力', '実行力', 'リーダーシップ', '問題解決'],
      workWeaknesses: ['柔軟性の欠如', '感情より論理優先', '変化への抵抗'],
      careerTip: '卓越した管理能力を持っています。チームメンバーの感情と状況をより細やかに配慮すると、さらに強力なリーダーになれます。',
      avoidEnvironments: ['曖昧で非構造的な環境', '一貫性のない基準', '頻繁な方向転換'],
    },
  },
  ESFJ: {
    ko: {
      name: '따뜻한 외교관',
      careerDescription: '사람들을 돌보고 화합을 이끄는 것을 즐깁니다. 팀의 분위기와 인간관계를 긍정적으로 만드는 특별한 재능이 있습니다.',
      topCareers: ['의료 전문가', '교사', '이벤트 플래너', '고객 서비스 매니저', '인사 담당자'],
      workStyle: '사람들과 긴밀히 협력하며 팀의 화합과 모두의 필요를 충족시킵니다.',
      idealEnvironment: '따뜻하고 협력적인 팀 환경, 사람들과 직접 소통할 수 있는 곳.',
      workStrengths: ['대인 관계', '팀워크', '배려심', '화합 촉진'],
      workWeaknesses: ['갈등 회피', '비판에 민감', '자기 필요 무시'],
      careerTip: '사람들을 돌보는 뛰어난 능력을 가지고 있습니다. 가끔은 자신의 필요와 의견을 먼저 내세우는 연습이 필요합니다.',
      avoidEnvironments: ['고립된 작업', '갈등이 많은 환경', '인간관계가 없는 곳'],
    },
    en: {
      name: 'Warm Diplomat',
      careerDescription: 'Enjoys caring for people and fostering harmony. Has a special talent for positively shaping team atmosphere and relationships.',
      topCareers: ['Healthcare Professional', 'Teacher', 'Event Planner', 'Customer Service Manager', 'HR Professional'],
      workStyle: 'Closely collaborates with people, fulfilling team harmony and everyone\'s needs.',
      idealEnvironment: 'Warm, collaborative team environment where direct communication with people is possible.',
      workStrengths: ['Interpersonal skills', 'Teamwork', 'Caring nature', 'Harmony promotion'],
      workWeaknesses: ['Conflict avoidance', 'Sensitive to criticism', 'Ignores own needs'],
      careerTip: 'You have outstanding ability to care for people. Practice occasionally prioritizing your own needs and opinions.',
      avoidEnvironments: ['Isolated work', 'Conflict-ridden environments', 'Places without human connection'],
    },
    ja: {
      name: '温かい外交官',
      careerDescription: '人々を気遣い、調和を促すことを楽しみます。チームの雰囲気と人間関係をポジティブにする特別な才能があります。',
      topCareers: ['医療専門家', '教師', 'イベントプランナー', 'カスタマーサービスマネージャー', '人事担当者'],
      workStyle: '人々と緊密に協力し、チームの調和とみんなのニーズを満たします。',
      idealEnvironment: '温かく協力的なチーム環境、人々と直接コミュニケーションできる場所。',
      workStrengths: ['対人関係', 'チームワーク', '思いやり', '調和の促進'],
      workWeaknesses: ['葛藤回避', '批判に敏感', '自分のニーズを無視'],
      careerTip: '人々を気遣う卓越した能力があります。時には自分のニーズと意見を先に出す練習が必要です。',
      avoidEnvironments: ['孤立した作業', '葛藤の多い環境', '人間関係のない場所'],
    },
  },
  ISTP: {
    ko: {
      name: '현실적인 문제 해결사',
      careerDescription: '실용적이고 분석적이며, 손으로 직접 문제를 해결하는 것을 즐깁니다. 위기 상황에서 침착하고 효율적으로 대응합니다.',
      topCareers: ['엔지니어', '기술자/정비사', '외과 의사', '경찰관/소방관', '데이터 분석가'],
      workStyle: '독립적으로 실용적 문제를 해결하며, 이론보다 실제 경험을 중시합니다.',
      idealEnvironment: '실질적 문제 해결이 가능하고, 자율성이 보장되는 환경.',
      workStrengths: ['실용적 문제 해결', '위기 대응', '분석력', '집중력'],
      workWeaknesses: ['장기 계획 약함', '사교적 상황 불편', '감정 표현 부족'],
      careerTip: '뛰어난 실무 능력을 가지고 있습니다. 장기 목표를 설정하고 팀과의 소통을 강화하면 더 큰 성과를 낼 수 있습니다.',
      avoidEnvironments: ['지나친 사교 요구', '추상적이고 이론 중심 업무', '엄격한 관료주의'],
    },
    en: {
      name: 'Practical Problem Solver',
      careerDescription: 'Practical, analytical, and enjoys solving problems hands-on. Responds calmly and efficiently in crises.',
      topCareers: ['Engineer', 'Technician/Mechanic', 'Surgeon', 'Police Officer/Firefighter', 'Data Analyst'],
      workStyle: 'Solves practical problems independently, valuing real experience over theory.',
      idealEnvironment: 'Environment allowing concrete problem-solving with guaranteed autonomy.',
      workStrengths: ['Practical problem solving', 'Crisis response', 'Analytical skills', 'Focus'],
      workWeaknesses: ['Weak at long-term planning', 'Uncomfortable in social situations', 'Limited emotional expression'],
      careerTip: 'You have outstanding practical abilities. Setting long-term goals and strengthening team communication will yield greater results.',
      avoidEnvironments: ['Excessive social demands', 'Abstract, theory-heavy work', 'Strict bureaucracy'],
    },
    ja: {
      name: '現実的な問題解決者',
      careerDescription: '実用的で分析的、手を使って直接問題を解決することを楽しみます。危機状況で冷静かつ効率的に対応します。',
      topCareers: ['エンジニア', '技術者/整備士', '外科医', '警察官/消防士', 'データアナリスト'],
      workStyle: '独立して実用的な問題を解決し、理論より実際の経験を重視します。',
      idealEnvironment: '実質的な問題解決ができ、自律性が保証される環境。',
      workStrengths: ['実用的問題解決', '危機対応', '分析力', '集中力'],
      workWeaknesses: ['長期計画が弱い', '社交的状況が不得意', '感情表現の不足'],
      careerTip: '卓越した実務能力があります。長期目標を設定してチームとのコミュニケーションを強化すると、より大きな成果が出ます。',
      avoidEnvironments: ['過度な社交の要求', '抽象的で理論中心の業務', '厳格な官僚主義'],
    },
  },
  ISFP: {
    ko: {
      name: '유연한 예술가',
      careerDescription: '감각적이고 예술적이며, 아름다움을 통해 세상을 표현합니다. 현재 순간에 충실하며 개인의 가치를 중시합니다.',
      topCareers: ['디자이너', '예술가', '뮤지션', '수의사', '물리치료사'],
      workStyle: '유연하게 일하며 자신만의 방식으로 창의적 문제를 해결합니다.',
      idealEnvironment: '창의적 자유가 있고 자신의 속도로 일할 수 있는 환경.',
      workStrengths: ['창의성', '감각적 민감성', '유연성', '개인 가치 중심'],
      workWeaknesses: ['장기 계획 약함', '자기 주장 부족', '갈등 회피'],
      careerTip: '창의적 재능이 뛰어납니다. 자신의 작품과 의견을 더 적극적으로 표현하고 공유하는 것이 커리어 성장의 열쇠입니다.',
      avoidEnvironments: ['엄격한 일정 중심', '창의성 없는 환경', '지나치게 경쟁적인 문화'],
    },
    en: {
      name: 'Flexible Artist',
      careerDescription: 'Sensory, artistic, expressing the world through beauty. Present-focused and values personal integrity.',
      topCareers: ['Designer', 'Artist', 'Musician', 'Veterinarian', 'Physical Therapist'],
      workStyle: 'Works flexibly and solves creative problems in their own way.',
      idealEnvironment: 'Environment with creative freedom to work at their own pace.',
      workStrengths: ['Creativity', 'Sensory sensitivity', 'Flexibility', 'Values-centered approach'],
      workWeaknesses: ['Weak at long-term planning', 'Lack of assertiveness', 'Conflict avoidance'],
      careerTip: 'Your creative talent is outstanding. Expressing and sharing your work and opinions more proactively is the key to career growth.',
      avoidEnvironments: ['Strict schedule-focused environments', 'Environments without creativity', 'Overly competitive cultures'],
    },
    ja: {
      name: '柔軟なアーティスト',
      careerDescription: '感覚的で芸術的、美を通して世界を表現します。現在の瞬間に忠実で個人の価値観を重視します。',
      topCareers: ['デザイナー', 'アーティスト', 'ミュージシャン', '獣医師', '理学療法士'],
      workStyle: '柔軟に働き、自分なりの方法で創造的な問題を解決します。',
      idealEnvironment: '創造的自由があり、自分のペースで働ける環境。',
      workStrengths: ['創造性', '感覚的敏感さ', '柔軟性', '個人の価値観中心'],
      workWeaknesses: ['長期計画が弱い', '自己主張の欠如', '葛藤回避'],
      careerTip: '創造的な才能が優れています。自分の作品と意見をより積極的に表現・共有することがキャリア成長の鍵です。',
      avoidEnvironments: ['厳格なスケジュール中心', '創造性のない環境', '過度に競争的な文化'],
    },
  },
  ESTP: {
    ko: {
      name: '역동적인 기업가',
      careerDescription: '빠른 상황 판단과 행동력으로 즉각적인 문제를 해결합니다. 에너지 넘치고 현실적이며 위험을 감수합니다.',
      topCareers: ['영업 전문가', '기업가', '운동선수/코치', '응급구조사', '부동산 중개인'],
      workStyle: '빠르게 행동하며 실용적 결과를 추구합니다. 현장에서 직접 성과를 만듭니다.',
      idealEnvironment: '역동적이고 변화무쌍한 환경, 즉각적인 결과가 보이는 곳.',
      workStrengths: ['행동력', '위기 대응', '협상력', '현실 감각'],
      workWeaknesses: ['장기 계획 약함', '세부 사항 간과', '충동적 결정'],
      careerTip: '빠른 행동력이 최대 강점입니다. 장기적 관점과 세부 계획을 보완하면 훨씬 더 큰 성과를 낼 수 있습니다.',
      avoidEnvironments: ['느리고 반복적인 업무', '이론 중심 환경', '지나치게 규칙적인 구조'],
    },
    en: {
      name: 'Dynamic Entrepreneur',
      careerDescription: 'Solves immediate problems with quick situational assessment and action. Energetic, realistic, and risk-taking.',
      topCareers: ['Sales Professional', 'Entrepreneur', 'Athlete/Coach', 'Emergency Responder', 'Real Estate Agent'],
      workStyle: 'Acts quickly and pursues practical results. Creates results directly in the field.',
      idealEnvironment: 'Dynamic, ever-changing environment where immediate results are visible.',
      workStrengths: ['Action-oriented', 'Crisis response', 'Negotiation skills', 'Practical sense'],
      workWeaknesses: ['Weak at long-term planning', 'May overlook details', 'Impulsive decisions'],
      careerTip: 'Your quick action is your greatest strength. Supplementing with long-term perspective and detailed planning will produce much greater results.',
      avoidEnvironments: ['Slow, repetitive tasks', 'Theory-heavy environments', 'Overly rule-based structures'],
    },
    ja: {
      name: 'ダイナミックな起業家',
      careerDescription: '素早い状況判断と行動力で即座の問題を解決します。エネルギッシュで現実的、リスクを取ります。',
      topCareers: ['営業専門家', '起業家', 'アスリート/コーチ', '救急救命士', '不動産仲介人'],
      workStyle: '素早く行動して実用的な結果を追求します。現場で直接成果を作ります。',
      idealEnvironment: 'ダイナミックで変化に富んだ環境、即座の結果が見える場所。',
      workStrengths: ['行動力', '危機対応', '交渉力', '現実感覚'],
      workWeaknesses: ['長期計画が弱い', '細部を見落とす', '衝動的な決定'],
      careerTip: '素早い行動力が最大の強みです。長期的な視点と詳細な計画を補うと、はるかに大きな成果が得られます。',
      avoidEnvironments: ['遅くて繰り返しの多い業務', '理論中心の環境', '過度にルール化された構造'],
    },
  },
  ESFP: {
    ko: {
      name: '즉흥적인 엔터테이너',
      careerDescription: '사람들을 즐겁게 하고 현재 순간을 충실히 삽니다. 에너지와 열정으로 주변 분위기를 밝게 만듭니다.',
      topCareers: ['연예인/배우', '이벤트 코디네이터', '판매원', '관광 가이드', '아동 교육자'],
      workStyle: '즉흥적이고 활기차며, 사람들과의 상호작용에서 에너지를 얻습니다.',
      idealEnvironment: '활발하고 사교적이며 즉각적인 피드백이 있는 환경.',
      workStrengths: ['대인 관계', '즉흥성', '열정', '현재 집중'],
      workWeaknesses: ['장기 계획 약함', '세부 실행 부족', '집중력 유지 어려움'],
      careerTip: '사람을 즐겁게 하는 타고난 재능이 있습니다. 커리어의 지속 성장을 위해 장기 목표와 계획을 세우는 습관을 기르세요.',
      avoidEnvironments: ['고립된 반복 업무', '지나친 규칙과 형식', '사람 없는 환경'],
    },
    en: {
      name: 'Spontaneous Entertainer',
      careerDescription: 'Brings joy to people and lives in the present moment. Brightens the atmosphere with energy and passion.',
      topCareers: ['Entertainer/Actor', 'Event Coordinator', 'Salesperson', 'Tour Guide', 'Children\'s Educator'],
      workStyle: 'Spontaneous and energetic, gaining energy from interactions with people.',
      idealEnvironment: 'Active, social environment with immediate feedback.',
      workStrengths: ['Interpersonal skills', 'Spontaneity', 'Passion', 'Present-focused'],
      workWeaknesses: ['Weak at long-term planning', 'Insufficient detailed execution', 'Difficulty maintaining focus'],
      careerTip: 'You have a natural talent for bringing joy to people. Develop habits of setting long-term goals and plans for sustained career growth.',
      avoidEnvironments: ['Isolated repetitive tasks', 'Excessive rules and formality', 'Environments without people'],
    },
    ja: {
      name: '即興のエンターテイナー',
      careerDescription: '人々を楽しませ、現在の瞬間を充実して生きます。エネルギーと情熱で周りの雰囲気を明るくします。',
      topCareers: ['芸能人/俳優', 'イベントコーディネーター', '販売員', '観光ガイド', '幼児教育者'],
      workStyle: '即興的でエネルギッシュ、人との交流からエネルギーを得ます。',
      idealEnvironment: '活発で社交的で、即座のフィードバックがある環境。',
      workStrengths: ['対人関係', '即興性', '情熱', '現在への集中'],
      workWeaknesses: ['長期計画が弱い', '詳細な実行が不足', '集中力の維持が難しい'],
      careerTip: '人を楽しませる天性の才能があります。キャリアの継続的成長のために、長期目標と計画を立てる習慣を身につけましょう。',
      avoidEnvironments: ['孤立した繰り返し業務', '過度なルールと形式', '人がいない環境'],
    },
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcMBTI(answers: Partial<Score>[]): { type: MBTIType; scores: Score } {
  const s: Score = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  for (const a of answers) {
    for (const [k, v] of Object.entries(a)) s[k as Dim] += v as number
  }
  const type = (
    (s.E >= s.I ? 'E' : 'I') +
    (s.S >= s.N ? 'S' : 'N') +
    (s.T >= s.F ? 'T' : 'F') +
    (s.J >= s.P ? 'J' : 'P')
  ) as MBTIType
  return { type, scores: s }
}

function dimPct(a: number, b: number): number {
  const total = a + b
  if (total === 0) return 50
  return Math.round((a / total) * 100)
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { locale?: string }

export default function MbtiCareerTest({ locale: localeProp = 'ko' }: Props) {
  const locale: Locale = (['ko', 'en', 'ja'].includes(localeProp) ? localeProp : 'ko') as Locale
  const lb = LABELS[locale]
  const questions = QUESTIONS[locale]

  const [current, setCurrent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('type')) return questions.length
    }
    return 0
  })
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Partial<Score>[]>([])
  const [result, setResult] = useState<{ type: MBTIType; scores: Score } | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      const t = p.get('type') as MBTIType | null
      if (t && RESULTS[t]) {
        const empty: Score = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
        return { type: t, scores: empty }
      }
    }
    return null
  })

  const finished = current >= questions.length

  function pickOption(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    const newAnswers = [...answers, questions[current].options[idx].score]
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setResult(calcMBTI(newAnswers))
      }
      setAnswers(newAnswers)
      setCurrent(current + 1)
      setSelected(null)
    }, 280)
  }

  function restart() {
    setAnswers([])
    setCurrent(0)
    setSelected(null)
    setResult(null)
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  function share() {
    if (!result) return
    const url = `${window.location.origin}${window.location.pathname}?type=${result.type}`
    const text = `${lb.shareMsg} ${result.type} (${RESULTS[result.type][locale].name})`
    if (navigator.share) {
      navigator.share({ title: lb.title, text, url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  // ── Question view ───────────────────────────────────────────────────────────
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
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-medium">{q.text}</p>
        </div>
        <div className="grid gap-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pickOption(i)}
              disabled={selected !== null}
              className={[
                'w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                selected === i
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-accent hover:border-primary/50',
                selected !== null && selected !== i ? 'opacity-50' : '',
              ].join(' ')}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Result view ─────────────────────────────────────────────────────────────
  if (!result) return null
  const r = RESULTS[result.type][locale]
  const s = result.scores
  const chartData = [
    { dim: 'E↔I', value: dimPct(s.E, s.I) },
    { dim: 'S↔N', value: dimPct(s.S, s.N) },
    { dim: 'T↔F', value: dimPct(s.T, s.F) },
    { dim: 'J↔P', value: dimPct(s.J, s.P) },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourType}</p>
        <div className="inline-block rounded-full bg-primary/10 px-5 py-2 text-3xl font-bold text-primary">
          {result.type}
        </div>
        <h2 className="text-xl font-semibold">{r.name}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{r.careerDescription}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground text-center mb-2">{lb.chartTitle}</p>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="dim" tick={{ fontSize: 12 }} />
            <Radar
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.25}
            />
            <Tooltip formatter={((v: number) => `${v}%`) as any} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{lb.topCareers}</h3>
        <div className="flex flex-wrap gap-2">
          {r.topCareers.map((c) => (
            <span key={c} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <h3 className="font-semibold text-sm">{lb.workStyle}</h3>
          <p className="text-sm text-muted-foreground">{r.workStyle}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <h3 className="font-semibold text-sm">{lb.idealEnv}</h3>
          <p className="text-sm text-muted-foreground">{r.idealEnvironment}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-green-600">{lb.workStrengths}</h3>
          <ul className="space-y-1">
            {r.workStrengths.map((s) => (
              <li key={s} className="text-xs text-muted-foreground flex items-start gap-1">
                <span className="text-green-500 mt-0.5">+</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-amber-600">{lb.workWeaknesses}</h3>
          <ul className="space-y-1">
            {r.workWeaknesses.map((w) => (
              <li key={w} className="text-xs text-muted-foreground flex items-start gap-1">
                <span className="text-amber-500 mt-0.5">△</span>{w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <h3 className="font-semibold text-sm text-primary">{lb.careerTip}</h3>
        <p className="text-sm">{r.careerTip}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">{lb.avoidEnvs}</h3>
        <ul className="space-y-1">
          {r.avoidEnvironments.map((e) => (
            <li key={e} className="text-xs text-muted-foreground flex items-start gap-1">
              <span className="text-red-400 mt-0.5">✕</span>{e}
            </li>
          ))}
        </ul>
      </div>

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
