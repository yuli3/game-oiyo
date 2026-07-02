import { useState, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

type JobCategory =
  | "developer"
  | "designer"
  | "marketer"
  | "sales"
  | "finance"
  | "hr"
  | "manager"
  | "teacher"
  | "nurse"
  | "public";

type Difficulty = "easy" | "medium" | "hard";
type DataLang = "ko" | "en";

interface Question {
  question: string;
  tip: string;
  difficulty: Difficulty;
}

const QUESTIONS_DB: Record<JobCategory, Record<DataLang, Question[]>> = {
  developer: {
    ko: [
      { question: "자신이 가장 자신 있는 기술 스택을 설명해주세요.", tip: "구체적인 프로젝트 경험을 연결하세요.", difficulty: "easy" },
      { question: "디버깅 과정에서 가장 어려웠던 경험을 말씀해주세요.", tip: "문제 발견 → 원인 분석 → 해결 과정을 구조화하세요.", difficulty: "medium" },
      { question: "대규모 트래픽을 처리한 경험이 있으신가요?", tip: "구체적인 수치(TPS, RPS 등)를 언급하면 좋습니다.", difficulty: "hard" },
      { question: "코드 리뷰에서 중요하게 생각하는 점은 무엇인가요?", tip: "가독성, 성능, 보안, 팀 컨벤션 등 여러 측면을 언급하세요.", difficulty: "easy" },
      { question: "마감 기한 내에 완료하기 어려운 과제를 받았을 때 어떻게 처리하시나요?", tip: "우선순위 결정 및 커뮤니케이션 방식을 설명하세요.", difficulty: "medium" },
      { question: "최근에 새로 배운 기술이나 언어가 있나요?", tip: "학습 동기와 적용 경험을 함께 이야기하세요.", difficulty: "easy" },
      { question: "레거시 코드를 리팩토링한 경험을 설명해주세요.", tip: "리팩토링 전후 효과를 수치로 보여주면 좋습니다.", difficulty: "medium" },
      { question: "마이크로서비스 아키텍처 경험이 있으신가요?", tip: "서비스 분리 기준과 트레이드오프를 설명하세요.", difficulty: "hard" },
      { question: "팀원과 기술적 의견 충돌이 있을 때 어떻게 해결하시나요?", tip: "데이터와 근거를 기반으로 합리적으로 논의하는 방식을 강조하세요.", difficulty: "medium" },
      { question: "CI/CD 파이프라인을 구축한 경험이 있나요?", tip: "사용한 도구와 배포 자동화로 얻은 효과를 설명하세요.", difficulty: "hard" },
      { question: "객체지향 설계 원칙 중 가장 중요하게 생각하는 것은 무엇인가요?", tip: "SOLID 원칙을 실제 코드 예시와 함께 설명하면 좋습니다.", difficulty: "medium" },
      { question: "보안 취약점을 발견했을 때 어떻게 대응하시나요?", tip: "보고 체계와 빠른 패치 프로세스를 언급하세요.", difficulty: "hard" },
    ],
    en: [
      { question: "Describe your strongest technical stack.", tip: "Connect it to a specific project experience.", difficulty: "easy" },
      { question: "Tell me about a challenging debugging experience.", tip: "Structure: problem discovery → root cause → resolution.", difficulty: "medium" },
      { question: "Have you handled high-traffic systems?", tip: "Mention specific numbers like TPS or RPS.", difficulty: "hard" },
      { question: "What do you value most in a code review?", tip: "Cover readability, performance, security, and team conventions.", difficulty: "easy" },
      { question: "How do you handle tasks that seem impossible to finish on time?", tip: "Explain prioritization and communication approach.", difficulty: "medium" },
      { question: "What new technology have you learned recently?", tip: "Share your motivation and how you applied it.", difficulty: "easy" },
      { question: "Describe a time you refactored legacy code.", tip: "Show before/after impact with metrics if possible.", difficulty: "medium" },
      { question: "Do you have microservices architecture experience?", tip: "Explain how you decided what to split and the trade-offs.", difficulty: "hard" },
      { question: "How do you resolve technical disagreements with teammates?", tip: "Emphasize data-driven, rational discussion.", difficulty: "medium" },
      { question: "Have you built a CI/CD pipeline?", tip: "Name tools used and the deployment automation benefits.", difficulty: "hard" },
      { question: "Which OOP design principle do you value most?", tip: "Explain a SOLID principle with a real code example.", difficulty: "medium" },
      { question: "How do you respond when you discover a security vulnerability?", tip: "Describe reporting and rapid patch processes.", difficulty: "hard" },
    ],
  },
  designer: {
    ko: [
      { question: "본인의 디자인 철학을 한 문장으로 표현해주세요.", tip: "사용자 중심, 심플함, 기능과 미학의 균형 등 핵심 가치를 담으세요.", difficulty: "easy" },
      { question: "사용자 리서치를 어떻게 디자인에 반영하시나요?", tip: "리서치 방법론과 인사이트 도출 과정을 설명하세요.", difficulty: "medium" },
      { question: "개발자와 협업 시 어려움을 겪었던 경험과 해결 방법을 설명해주세요.", tip: "공통 언어(스펙 문서, 프로토타입 등)를 활용하는 방법을 강조하세요.", difficulty: "medium" },
      { question: "디자인 시스템을 구축한 경험이 있으신가요?", tip: "컴포넌트 재사용성과 일관성 확보 방법을 설명하세요.", difficulty: "hard" },
      { question: "UX와 UI의 차이를 어떻게 이해하고 계신가요?", tip: "경험 설계와 시각적 표현의 역할 차이를 명확히 하세요.", difficulty: "easy" },
      { question: "A/B 테스트를 활용한 경험이 있나요?", tip: "가설 설정, 결과 분석, 의사결정 과정을 설명하세요.", difficulty: "medium" },
      { question: "접근성(Accessibility)을 고려한 디자인 사례를 말씀해주세요.", tip: "WCAG 기준과 실제 적용 사례를 함께 이야기하세요.", difficulty: "hard" },
      { question: "마감 직전에 디자인 방향이 크게 바뀐 경험이 있나요?", tip: "유연성과 압박 상황에서의 문제 해결 능력을 보여주세요.", difficulty: "medium" },
      { question: "포트폴리오에서 가장 자신 있는 작업물을 소개해주세요.", tip: "문제 → 과정 → 결과의 스토리 구조로 설명하세요.", difficulty: "easy" },
      { question: "데이터 기반 디자인 결정을 내린 경험을 설명해주세요.", tip: "사용자 행동 데이터나 전환율 등 구체적 지표를 활용하세요.", difficulty: "hard" },
      { question: "다양한 디바이스와 해상도를 고려한 반응형 디자인 경험이 있나요?", tip: "모바일 퍼스트 전략과 중단점 설정 방법을 설명하세요.", difficulty: "medium" },
      { question: "디자인 피드백을 받을 때 어떤 태도로 임하시나요?", tip: "비판적 피드백을 성장의 기회로 활용하는 방식을 강조하세요.", difficulty: "easy" },
    ],
    en: [
      { question: "Describe your design philosophy in one sentence.", tip: "Capture core values like user-centricity, simplicity, or balance.", difficulty: "easy" },
      { question: "How do you incorporate user research into your designs?", tip: "Explain your research methods and insight extraction process.", difficulty: "medium" },
      { question: "Describe a challenge collaborating with developers and how you resolved it.", tip: "Highlight shared language tools like spec docs or prototypes.", difficulty: "medium" },
      { question: "Have you built a design system?", tip: "Explain how you ensured reusability and visual consistency.", difficulty: "hard" },
      { question: "How do you distinguish between UX and UI?", tip: "Clarify the difference between experience design and visual expression.", difficulty: "easy" },
      { question: "Tell me about an A/B test you ran.", tip: "Describe hypothesis, result analysis, and decision-making.", difficulty: "medium" },
      { question: "Give an example of accessible design you created.", tip: "Reference WCAG standards and your implementation.", difficulty: "hard" },
      { question: "Has a design direction changed dramatically close to a deadline?", tip: "Show flexibility and problem-solving under pressure.", difficulty: "medium" },
      { question: "Walk me through your best portfolio piece.", tip: "Use a problem → process → result narrative structure.", difficulty: "easy" },
      { question: "Describe a data-driven design decision you made.", tip: "Use specific metrics like user behavior data or conversion rates.", difficulty: "hard" },
      { question: "Do you have experience with responsive design across devices?", tip: "Explain mobile-first strategy and breakpoint decisions.", difficulty: "medium" },
      { question: "How do you handle design feedback?", tip: "Emphasize treating criticism as a growth opportunity.", difficulty: "easy" },
    ],
  },
  marketer: {
    ko: [
      { question: "지금까지 진행한 마케팅 캠페인 중 가장 성공적이었던 사례를 말씀해주세요.", tip: "KPI와 실제 달성 수치를 구체적으로 제시하세요.", difficulty: "easy" },
      { question: "디지털 마케팅 채널 중 가장 효과적이라고 생각하는 것은 무엇인가요?", tip: "타겟 오디언스와 목표에 따라 채널 선택이 달라짐을 설명하세요.", difficulty: "easy" },
      { question: "마케팅 예산이 갑자기 50% 삭감된다면 어떻게 대응하시겠습니까?", tip: "우선순위가 높은 채널과 ROI 최적화 전략을 설명하세요.", difficulty: "hard" },
      { question: "SEO/SEM을 활용한 경험이 있으신가요?", tip: "유기적 검색과 유료 검색의 시너지 전략을 설명하세요.", difficulty: "medium" },
      { question: "콘텐츠 마케팅 전략을 어떻게 수립하시나요?", tip: "고객 여정과 맞는 콘텐츠 타입과 배포 채널을 설명하세요.", difficulty: "medium" },
      { question: "데이터 분석 도구를 활용한 마케팅 성과 측정 경험을 말씀해주세요.", tip: "GA4, 혹은 다른 분석 툴 사용 경험과 도출한 인사이트를 설명하세요.", difficulty: "medium" },
      { question: "브랜드 인지도를 높이기 위한 전략을 제안해주세요.", tip: "단기/장기 전략과 각 채널의 역할을 구체적으로 설명하세요.", difficulty: "hard" },
      { question: "SNS 마케팅에서 위기 상황이 발생했을 때 어떻게 대응하시나요?", tip: "빠른 대응, 투명한 소통, 사후 관리 방법을 설명하세요.", difficulty: "hard" },
      { question: "고객 세그멘테이션을 어떻게 활용하시나요?", tip: "데이터 기반 세분화와 맞춤형 메시지 전략을 설명하세요.", difficulty: "medium" },
      { question: "경쟁사 대비 차별화된 마케팅 포지셔닝 방법을 설명해주세요.", tip: "고객 가치 제안(Value Proposition)을 명확히 하는 방법을 이야기하세요.", difficulty: "hard" },
      { question: "마케팅 자동화 도구를 사용해본 경험이 있나요?", tip: "HubSpot, Marketo 등 도구와 효율화 성과를 구체적으로 설명하세요.", difficulty: "medium" },
      { question: "인플루언서 마케팅의 ROI를 어떻게 측정하시나요?", tip: "도달 범위, 참여율, 전환율 등 다양한 지표를 활용하세요.", difficulty: "medium" },
    ],
    en: [
      { question: "Tell me about your most successful marketing campaign.", tip: "Present KPIs and actual achievement numbers.", difficulty: "easy" },
      { question: "Which digital marketing channel do you find most effective?", tip: "Explain how channel choice depends on target audience and goals.", difficulty: "easy" },
      { question: "How would you respond if your marketing budget were cut by 50%?", tip: "Explain high-priority channels and ROI optimization strategy.", difficulty: "hard" },
      { question: "Do you have experience with SEO/SEM?", tip: "Describe how you synergize organic and paid search.", difficulty: "medium" },
      { question: "How do you develop a content marketing strategy?", tip: "Match content types and distribution channels to the customer journey.", difficulty: "medium" },
      { question: "Describe your experience measuring marketing performance with analytics.", tip: "Share GA4 or other tool experience and insights derived.", difficulty: "medium" },
      { question: "Propose a strategy to increase brand awareness.", tip: "Explain short and long-term strategies and each channel's role.", difficulty: "hard" },
      { question: "How do you handle a social media crisis?", tip: "Cover rapid response, transparent communication, and follow-up.", difficulty: "hard" },
      { question: "How do you use customer segmentation?", tip: "Explain data-driven segmentation and personalized messaging.", difficulty: "medium" },
      { question: "How do you differentiate your marketing positioning from competitors?", tip: "Describe how you clarify the value proposition.", difficulty: "hard" },
      { question: "Have you used marketing automation tools?", tip: "Detail tools like HubSpot or Marketo and efficiency gains.", difficulty: "medium" },
      { question: "How do you measure influencer marketing ROI?", tip: "Use metrics like reach, engagement rate, and conversion rate.", difficulty: "medium" },
    ],
  },
  sales: {
    ko: [
      { question: "영업 실적 목표를 달성하기 위한 본인만의 전략을 설명해주세요.", tip: "파이프라인 관리와 우선순위 설정 방법을 구체적으로 말하세요.", difficulty: "easy" },
      { question: "어려운 고객을 설득한 경험을 말씀해주세요.", tip: "고객의 니즈를 파악하고 맞춤형 솔루션을 제시한 과정을 설명하세요.", difficulty: "medium" },
      { question: "연간 매출 목표를 초과 달성한 경험이 있나요?", tip: "달성률과 성공 요인을 구체적으로 제시하세요.", difficulty: "medium" },
      { question: "경쟁사 제품과의 비교에서 어떻게 차별화를 내세우시나요?", tip: "제품의 고유한 강점과 고객 가치를 강조하는 방법을 설명하세요.", difficulty: "medium" },
      { question: "장기 고객 관계를 구축하는 본인만의 방법은 무엇인가요?", tip: "신뢰 구축과 지속적인 가치 제공 전략을 설명하세요.", difficulty: "easy" },
      { question: "거절당했을 때 어떻게 대처하시나요?", tip: "긍정적인 마인드셋과 재시도 전략을 설명하세요.", difficulty: "easy" },
      { question: "CRM 시스템 활용 경험이 있으신가요?", tip: "Salesforce, HubSpot 등 도구와 데이터 활용 방법을 설명하세요.", difficulty: "medium" },
      { question: "B2B와 B2C 영업의 차이점을 어떻게 접근하시나요?", tip: "의사결정 프로세스와 영업 사이클의 차이를 설명하세요.", difficulty: "medium" },
      { question: "대기업 신규 계약을 따낸 경험을 말씀해주세요.", tip: "접근 전략, 제안 과정, 협상 방법을 단계별로 설명하세요.", difficulty: "hard" },
      { question: "팀 목표 달성을 위해 동료들과 어떻게 협력하시나요?", tip: "정보 공유와 팀 시너지를 높이는 방법을 이야기하세요.", difficulty: "easy" },
      { question: "신규 시장 개척 경험이 있으신가요?", tip: "시장 조사, 초기 고객 발굴, 진입 전략을 설명하세요.", difficulty: "hard" },
      { question: "가격 협상에서 본인의 마지노선을 지키면서도 성사시킨 방법은?", tip: "가치 기반 협상과 대안 제시 전략을 설명하세요.", difficulty: "hard" },
    ],
    en: [
      { question: "Describe your strategy to achieve sales targets.", tip: "Explain your pipeline management and prioritization approach.", difficulty: "easy" },
      { question: "Tell me about convincing a difficult customer.", tip: "Describe how you identified their needs and offered a tailored solution.", difficulty: "medium" },
      { question: "Have you exceeded your annual sales quota?", tip: "Provide your achievement rate and the key success factors.", difficulty: "medium" },
      { question: "How do you differentiate your product from competitors?", tip: "Explain how you highlight unique strengths and customer value.", difficulty: "medium" },
      { question: "What is your approach to building long-term customer relationships?", tip: "Describe trust-building and ongoing value-delivery strategies.", difficulty: "easy" },
      { question: "How do you handle rejection?", tip: "Show a positive mindset and your strategy for follow-up attempts.", difficulty: "easy" },
      { question: "Do you have CRM system experience?", tip: "Mention tools like Salesforce or HubSpot and how you leverage data.", difficulty: "medium" },
      { question: "How do you approach B2B vs. B2C sales differently?", tip: "Explain differences in decision-making processes and sales cycles.", difficulty: "medium" },
      { question: "Tell me about landing a major enterprise contract.", tip: "Walk through your approach, proposal, and negotiation step by step.", difficulty: "hard" },
      { question: "How do you collaborate with teammates to hit team goals?", tip: "Describe information sharing and synergy-building methods.", difficulty: "easy" },
      { question: "Have you opened a new market?", tip: "Cover market research, early customer acquisition, and entry strategy.", difficulty: "hard" },
      { question: "How did you close a deal while holding your price line?", tip: "Explain value-based negotiation and alternatives you offered.", difficulty: "hard" },
    ],
  },
  finance: {
    ko: [
      { question: "재무제표 분석 경험을 말씀해주세요.", tip: "손익계산서, 대차대조표, 현금흐름표의 관계를 설명하세요.", difficulty: "easy" },
      { question: "예산 편성 및 관리 프로세스를 설명해주세요.", tip: "top-down vs bottom-up 방식과 실적 vs 예산 분석 경험을 언급하세요.", difficulty: "medium" },
      { question: "기업 가치 평가를 어떻게 하시나요?", tip: "DCF, P/E 비교, EV/EBITDA 등 다양한 방법론을 설명하세요.", difficulty: "hard" },
      { question: "리스크 관리 경험을 말씀해주세요.", tip: "리스크 식별, 평가, 대응 방안을 구체적으로 설명하세요.", difficulty: "medium" },
      { question: "엑셀/재무 모델링 역량은 어느 수준인가요?", tip: "실제 작성한 모델 유형(DCF, LBO 등)을 예시로 들어주세요.", difficulty: "easy" },
      { question: "내부 통제 시스템 구축 경험이 있으신가요?", tip: "SOX 준수, 감사 프로세스 개선 사례를 이야기하세요.", difficulty: "hard" },
      { question: "회계 처리 기준 변경(IFRS 등)에 대응한 경험이 있나요?", tip: "변경사항 파악부터 내부 반영 프로세스까지 설명하세요.", difficulty: "hard" },
      { question: "월간 마감 업무를 효율화한 경험을 말씀해주세요.", tip: "자동화, 체크리스트, 팀 협업을 통한 개선 사례를 설명하세요.", difficulty: "medium" },
      { question: "경영진에게 재무 보고를 할 때 어떻게 준비하시나요?", tip: "핵심 지표 선정, 시각화, 스토리텔링 방법을 설명하세요.", difficulty: "medium" },
      { question: "세무 조정 및 신고 경험을 설명해주세요.", tip: "법인세, 부가세 등 실무 경험을 구체적으로 이야기하세요.", difficulty: "medium" },
      { question: "투자 의사결정에 사용하는 주요 재무 지표는 무엇인가요?", tip: "ROI, IRR, NPV 등의 계산 방법과 활용 사례를 설명하세요.", difficulty: "easy" },
      { question: "부서 간 예산 갈등을 해결한 경험이 있나요?", tip: "데이터 기반 설득과 조직 목표 정렬 방법을 설명하세요.", difficulty: "hard" },
    ],
    en: [
      { question: "Describe your experience with financial statement analysis.", tip: "Explain the relationship between income statement, balance sheet, and cash flow.", difficulty: "easy" },
      { question: "Walk me through your budgeting and management process.", tip: "Mention top-down vs. bottom-up approaches and actuals-vs-budget analysis.", difficulty: "medium" },
      { question: "How do you perform company valuation?", tip: "Cover methodologies like DCF, P/E comparables, and EV/EBITDA.", difficulty: "hard" },
      { question: "Tell me about your risk management experience.", tip: "Describe risk identification, assessment, and response planning.", difficulty: "medium" },
      { question: "What is your proficiency in Excel and financial modeling?", tip: "Give examples of models you've built such as DCF or LBO.", difficulty: "easy" },
      { question: "Have you built an internal control system?", tip: "Discuss SOX compliance and audit process improvements.", difficulty: "hard" },
      { question: "Have you managed an accounting standard change like IFRS adoption?", tip: "Explain how you tracked changes and integrated them internally.", difficulty: "hard" },
      { question: "How have you improved the monthly close process?", tip: "Describe automation, checklists, and team collaboration improvements.", difficulty: "medium" },
      { question: "How do you prepare financial reports for executives?", tip: "Cover KPI selection, visualization, and storytelling techniques.", difficulty: "medium" },
      { question: "Describe your tax adjustment and filing experience.", tip: "Share specifics on corporate tax and VAT practical work.", difficulty: "medium" },
      { question: "What key financial metrics do you use for investment decisions?", tip: "Explain how you calculate and apply ROI, IRR, and NPV.", difficulty: "easy" },
      { question: "Have you resolved budget conflicts between departments?", tip: "Show data-driven persuasion and alignment to company goals.", difficulty: "hard" },
    ],
  },
  hr: {
    ko: [
      { question: "채용 프로세스를 어떻게 설계하고 운영하시나요?", tip: "직무분석, JD 작성, 면접 설계, 온보딩까지 전 과정을 설명하세요.", difficulty: "easy" },
      { question: "역량 기반 면접(CBI) 방법론을 적용한 경험이 있나요?", tip: "STAR 기법과 행동 지표 설정 방법을 설명하세요.", difficulty: "medium" },
      { question: "조직 문화를 개선하기 위해 어떤 이니셔티브를 추진하셨나요?", tip: "문제 진단, 해결책 설계, 실행, 효과 측정까지 설명하세요.", difficulty: "hard" },
      { question: "성과 관리 시스템(KPI, OKR 등)을 운영한 경험을 말씀해주세요.", tip: "목표 설정, 중간 점검, 평가, 피드백 프로세스를 설명하세요.", difficulty: "medium" },
      { question: "노사 관계에서 어려운 상황을 해결한 경험이 있나요?", tip: "법적 기준을 준수하면서 원만하게 해결한 방법을 설명하세요.", difficulty: "hard" },
      { question: "직원 교육 및 역량 개발 프로그램을 설계한 경험이 있나요?", tip: "니즈 분석, 커리큘럼 설계, 효과 측정 방법을 설명하세요.", difficulty: "medium" },
      { question: "인원 감축이나 조직 개편을 진행한 경험이 있나요?", tip: "법적 절차 준수와 구성원 신뢰 유지 방법을 설명하세요.", difficulty: "hard" },
      { question: "우수 인재 유치를 위한 EVP(직원 가치 제안) 전략을 말씀해주세요.", tip: "보상, 성장, 문화, 워라밸 등 다양한 요소를 포함하세요.", difficulty: "medium" },
      { question: "직원 만족도 조사를 어떻게 활용하시나요?", tip: "데이터 해석, 액션 플랜 수립, 후속 조치 방법을 설명하세요.", difficulty: "easy" },
      { question: "다양성 및 포용성(D&I) 관련 이니셔티브 경험이 있나요?", tip: "구체적인 프로그램과 측정 지표를 이야기하세요.", difficulty: "hard" },
      { question: "HR 데이터 분석(피플 애널리틱스)을 활용한 경험이 있나요?", tip: "이직률, 채용 퍼널, 직원 참여도 등 데이터 활용 사례를 설명하세요.", difficulty: "medium" },
      { question: "연봉 체계와 보상 설계를 경험하신 적 있나요?", tip: "시장 데이터 벤치마킹과 내부 형평성 유지 방법을 설명하세요.", difficulty: "medium" },
    ],
    en: [
      { question: "How do you design and run a recruitment process?", tip: "Cover job analysis, JD writing, interview design, and onboarding.", difficulty: "easy" },
      { question: "Have you applied Competency-Based Interviewing (CBI)?", tip: "Explain the STAR method and how you set behavioral indicators.", difficulty: "medium" },
      { question: "What initiatives have you led to improve organizational culture?", tip: "Walk through problem diagnosis, solution design, execution, and measurement.", difficulty: "hard" },
      { question: "Describe your experience running performance management (KPI, OKR).", tip: "Explain goal setting, check-ins, evaluation, and feedback loops.", difficulty: "medium" },
      { question: "Have you resolved a difficult labor-management situation?", tip: "Describe how you maintained compliance while reaching resolution.", difficulty: "hard" },
      { question: "Have you designed employee training and development programs?", tip: "Cover needs analysis, curriculum design, and effectiveness measurement.", difficulty: "medium" },
      { question: "Have you led a workforce reduction or reorganization?", tip: "Explain legal process adherence and maintaining employee trust.", difficulty: "hard" },
      { question: "What is your EVP strategy for attracting top talent?", tip: "Include compensation, growth, culture, and work-life balance elements.", difficulty: "medium" },
      { question: "How do you use employee satisfaction surveys?", tip: "Describe data interpretation, action planning, and follow-through.", difficulty: "easy" },
      { question: "Do you have D&I initiative experience?", tip: "Mention specific programs and how you measured outcomes.", difficulty: "hard" },
      { question: "Have you applied people analytics in HR?", tip: "Share examples using turnover, hiring funnel, or engagement data.", difficulty: "medium" },
      { question: "Do you have experience designing compensation structures?", tip: "Cover market benchmarking and maintaining internal pay equity.", difficulty: "medium" },
    ],
  },
  manager: {
    ko: [
      { question: "팀원의 성과를 향상시키기 위해 어떤 방식으로 코칭하시나요?", tip: "개인별 강점 파악과 맞춤형 피드백 방법을 설명하세요.", difficulty: "easy" },
      { question: "갈등이 있는 팀원들 사이를 중재한 경험이 있나요?", tip: "중립적 입장에서 원인 파악과 해결 과정을 설명하세요.", difficulty: "medium" },
      { question: "전략 목표를 팀 단위 실행 계획으로 분해하는 방법을 설명해주세요.", tip: "목표 정렬, 역할 분담, KPI 설정 방법을 설명하세요.", difficulty: "medium" },
      { question: "저성과자를 어떻게 관리하고 지원하시나요?", tip: "PIP 설계와 피드백, 지원, 결과 추적 방법을 설명하세요.", difficulty: "hard" },
      { question: "빠르게 변하는 환경에서 팀의 방향을 어떻게 유지하시나요?", tip: "변화 관리와 투명한 소통 전략을 설명하세요.", difficulty: "medium" },
      { question: "데이터를 기반으로 의사결정한 경험을 말씀해주세요.", tip: "어떤 데이터를 수집하고 분석해 어떤 결정을 내렸는지 설명하세요.", difficulty: "medium" },
      { question: "우선순위가 충돌하는 상황에서 어떻게 결정하시나요?", tip: "가중치 기준과 이해관계자 조율 방법을 설명하세요.", difficulty: "hard" },
      { question: "다른 부서와 협력을 이끌어낸 경험을 말씀해주세요.", tip: "공동 목표 설정과 신뢰 구축 방법을 설명하세요.", difficulty: "medium" },
      { question: "팀 빌딩 활동을 통해 팀워크를 향상시킨 경험이 있나요?", tip: "활동 설계 의도와 팀 변화 효과를 설명하세요.", difficulty: "easy" },
      { question: "위기 상황에서 팀을 이끈 경험을 말씀해주세요.", tip: "침착한 판단과 빠른 실행, 팀원 지원 방법을 강조하세요.", difficulty: "hard" },
      { question: "위임과 책임 부여를 어떻게 균형 있게 하시나요?", tip: "신뢰 구축과 역량 개발을 통한 위임 확대 방법을 설명하세요.", difficulty: "medium" },
      { question: "리더십 스타일을 한 마디로 표현한다면?", tip: "상황에 따라 스타일을 조절하는 유연성을 강조하세요.", difficulty: "easy" },
    ],
    en: [
      { question: "How do you coach team members to improve performance?", tip: "Explain how you identify individual strengths and give tailored feedback.", difficulty: "easy" },
      { question: "Have you mediated conflict between team members?", tip: "Describe how you remained neutral, identified causes, and resolved it.", difficulty: "medium" },
      { question: "How do you break strategic objectives into team execution plans?", tip: "Explain goal alignment, role assignment, and KPI setting.", difficulty: "medium" },
      { question: "How do you manage and support underperformers?", tip: "Describe PIP design, feedback, support, and outcome tracking.", difficulty: "hard" },
      { question: "How do you keep your team aligned in a rapidly changing environment?", tip: "Explain change management and transparent communication strategies.", difficulty: "medium" },
      { question: "Tell me about a data-driven decision you made as a manager.", tip: "Explain what data you collected, analyzed, and what you decided.", difficulty: "medium" },
      { question: "How do you make decisions when priorities conflict?", tip: "Describe your weighting criteria and stakeholder alignment process.", difficulty: "hard" },
      { question: "Tell me about achieving cross-department collaboration.", tip: "Explain how you set shared goals and built trust.", difficulty: "medium" },
      { question: "Have you run team-building activities to improve teamwork?", tip: "Describe the intent behind the activity and the team impact.", difficulty: "easy" },
      { question: "Tell me about leading your team through a crisis.", tip: "Emphasize calm judgment, fast execution, and team support.", difficulty: "hard" },
      { question: "How do you balance delegation with accountability?", tip: "Explain how trust-building enables expanded delegation.", difficulty: "medium" },
      { question: "How would you describe your leadership style in one word?", tip: "Emphasize adaptability and situation-specific flexibility.", difficulty: "easy" },
    ],
  },
  teacher: {
    ko: [
      { question: "수업 준비 과정을 어떻게 하시나요?", tip: "학습 목표 설정, 교재 분석, 활동 설계 과정을 설명하세요.", difficulty: "easy" },
      { question: "수업에 집중하지 못하는 학생을 어떻게 지도하시나요?", tip: "원인 파악과 맞춤형 접근 방법을 설명하세요.", difficulty: "medium" },
      { question: "학부모와의 소통에서 어려운 경험을 말씀해주세요.", tip: "감정적 상황에서 전문성을 유지하며 해결한 방법을 설명하세요.", difficulty: "medium" },
      { question: "교육 기술(에듀테크)을 수업에 활용한 경험이 있나요?", tip: "특정 도구와 학습 효과 개선 사례를 설명하세요.", difficulty: "easy" },
      { question: "다양한 학습 수준의 학생들을 함께 지도하는 방법은?", tip: "차별화 수업(Differentiated Instruction) 전략을 설명하세요.", difficulty: "medium" },
      { question: "학생의 장기 성장을 위해 어떤 부분에 가장 집중하시나요?", tip: "지식 전달 외 비인지적 역량(자기효능감, 회복탄력성 등)을 강조하세요.", difficulty: "easy" },
      { question: "학교 내 갈등 상황(학생 간 분쟁 등)을 처리한 경험이 있나요?", tip: "중재 과정과 재발 방지 조치를 설명하세요.", difficulty: "hard" },
      { question: "새로운 교육 과정이나 정책 변화에 어떻게 적응하시나요?", tip: "자기 학습과 동료 교사 협력을 통한 적응 방법을 설명하세요.", difficulty: "medium" },
      { question: "평가 방식을 어떻게 설계하시나요?", tip: "형성 평가와 총합 평가의 균형, 다양한 평가 방식을 설명하세요.", difficulty: "medium" },
      { question: "가장 기억에 남는 학생 성장 사례를 말씀해주세요.", tip: "개입 방법과 결과, 교사로서 얻은 인사이트를 이야기하세요.", difficulty: "easy" },
      { question: "동료 교사와 협력하여 교육 성과를 높인 경험이 있나요?", tip: "공동 수업 설계, 피드백 공유, 데이터 기반 개선 사례를 설명하세요.", difficulty: "medium" },
      { question: "소외된 학생을 포용하기 위해 어떤 노력을 하시나요?", tip: "학교 내 지원 시스템과 개별 접근 방법을 설명하세요.", difficulty: "hard" },
    ],
    en: [
      { question: "How do you prepare for a lesson?", tip: "Explain learning objective setting, material analysis, and activity design.", difficulty: "easy" },
      { question: "How do you guide students who struggle to focus?", tip: "Describe how you identify root causes and adapt your approach.", difficulty: "medium" },
      { question: "Tell me about a challenging experience communicating with parents.", tip: "Explain how you maintained professionalism during a tense situation.", difficulty: "medium" },
      { question: "Have you used EdTech tools in your classroom?", tip: "Describe a specific tool and how it improved learning outcomes.", difficulty: "easy" },
      { question: "How do you teach students with varying ability levels together?", tip: "Explain your Differentiated Instruction strategies.", difficulty: "medium" },
      { question: "What aspects do you focus on most for students' long-term growth?", tip: "Highlight non-cognitive skills like self-efficacy and resilience beyond knowledge.", difficulty: "easy" },
      { question: "Have you handled conflict between students?", tip: "Walk through your mediation process and preventive measures.", difficulty: "hard" },
      { question: "How do you adapt to new curriculum or policy changes?", tip: "Describe self-directed learning and peer collaboration strategies.", difficulty: "medium" },
      { question: "How do you design assessments?", tip: "Explain the balance between formative and summative assessments.", difficulty: "medium" },
      { question: "Tell me about a memorable student growth story.", tip: "Share your intervention, the outcome, and what you learned as a teacher.", difficulty: "easy" },
      { question: "Have you collaborated with colleagues to improve educational outcomes?", tip: "Describe co-planning, feedback sharing, and data-driven improvement.", difficulty: "medium" },
      { question: "How do you include marginalized students?", tip: "Explain school support systems and individualized approaches.", difficulty: "hard" },
    ],
  },
  nurse: {
    ko: [
      { question: "응급 상황에서 침착하게 대처한 경험을 말씀해주세요.", tip: "신속한 판단과 팀과의 협력 과정을 설명하세요.", difficulty: "medium" },
      { question: "환자 안전을 위해 가장 중요하게 생각하는 것은 무엇인가요?", tip: "투약 오류 방지, 낙상 예방, 감염 관리 등을 구체적으로 이야기하세요.", difficulty: "easy" },
      { question: "환자나 보호자와의 갈등을 해결한 경험이 있나요?", tip: "공감과 명확한 소통으로 해결한 과정을 설명하세요.", difficulty: "medium" },
      { question: "다학제 팀(의사, 물리치료사 등)과 협력한 경험을 말씀해주세요.", tip: "역할 분담과 원활한 소통 방법을 설명하세요.", difficulty: "easy" },
      { question: "의료 오류(Medication Error)를 예방하기 위해 어떤 프로토콜을 따르나요?", tip: "Five Rights(5R) 등 구체적인 안전 절차를 설명하세요.", difficulty: "medium" },
      { question: "번아웃 방지를 위해 어떻게 자기 관리를 하시나요?", tip: "정신 건강 관리와 팀 지원 시스템 활용 방법을 설명하세요.", difficulty: "easy" },
      { question: "임상 지식을 최신으로 유지하기 위해 어떤 노력을 하시나요?", tip: "학술 논문 구독, 교육 프로그램 참여, 자격증 갱신 등을 이야기하세요.", difficulty: "easy" },
      { question: "중증 환자 관리에서 가장 어려웠던 케이스를 말씀해주세요.", tip: "임상적 판단과 팀워크를 통한 결과를 설명하세요.", difficulty: "hard" },
      { question: "신규 간호사 교육을 담당한 경험이 있나요?", tip: "프리셉터 역할과 교육 방법론을 설명하세요.", difficulty: "medium" },
      { question: "업무 과부하 상황에서 우선순위를 어떻게 설정하시나요?", tip: "중증도 분류(Triage)와 체계적 업무 관리 방법을 설명하세요.", difficulty: "hard" },
      { question: "환자 중심 케어(Patient-Centered Care)를 어떻게 실천하시나요?", tip: "환자의 선호와 가치를 의사결정에 통합하는 방법을 설명하세요.", difficulty: "medium" },
      { question: "의사의 처방에 의문이 있을 때 어떻게 소통하시나요?", tip: "안전을 최우선으로 하면서도 전문적으로 소통하는 방법을 설명하세요.", difficulty: "hard" },
    ],
    en: [
      { question: "Tell me about a time you stayed calm during an emergency.", tip: "Explain your rapid decision-making and teamwork process.", difficulty: "medium" },
      { question: "What do you consider most important for patient safety?", tip: "Discuss medication error prevention, fall prevention, and infection control.", difficulty: "easy" },
      { question: "Have you resolved a conflict with a patient or family member?", tip: "Describe how empathy and clear communication led to resolution.", difficulty: "medium" },
      { question: "Tell me about collaborating with a multidisciplinary team.", tip: "Explain role division and effective communication methods.", difficulty: "easy" },
      { question: "What protocols do you follow to prevent medication errors?", tip: "Describe specific safety steps like the Five Rights (5Rs).", difficulty: "medium" },
      { question: "How do you manage yourself to prevent burnout?", tip: "Discuss mental health management and team support systems.", difficulty: "easy" },
      { question: "How do you keep your clinical knowledge current?", tip: "Mention journals, educational programs, and certification renewal.", difficulty: "easy" },
      { question: "Describe the most challenging critical patient case you managed.", tip: "Explain clinical judgment and teamwork leading to the outcome.", difficulty: "hard" },
      { question: "Have you trained new nurses?", tip: "Describe your preceptor role and your teaching methodology.", difficulty: "medium" },
      { question: "How do you set priorities when overwhelmed with tasks?", tip: "Explain triage principles and systematic task management.", difficulty: "hard" },
      { question: "How do you practice patient-centered care?", tip: "Describe how you integrate patient preferences into decision-making.", difficulty: "medium" },
      { question: "How do you communicate when you question a doctor's order?", tip: "Explain how to communicate professionally while prioritizing safety.", difficulty: "hard" },
    ],
  },
  public: {
    ko: [
      { question: "공직자로서 가장 중요한 가치는 무엇이라고 생각하시나요?", tip: "청렴, 공익, 책임감 등 공직 가치와 본인의 경험을 연결하세요.", difficulty: "easy" },
      { question: "민원인과 갈등이 생겼을 때 어떻게 대처하시나요?", tip: "법과 원칙을 지키면서도 시민 친화적으로 해결하는 방법을 설명하세요.", difficulty: "medium" },
      { question: "상급자의 부당한 지시를 받았을 때 어떻게 대응하시나요?", tip: "공무원 윤리 기준과 내부 신고 절차를 설명하세요.", difficulty: "hard" },
      { question: "디지털 전환 시대에 공공서비스를 어떻게 개선할 수 있을까요?", tip: "전자정부, 빅데이터, AI 활용 사례를 제시하세요.", difficulty: "medium" },
      { question: "세금이 낭비된다는 민원이 빈번한 사업을 어떻게 개선하시겠습니까?", tip: "성과 지표 재설계, 시민 참여, 투명성 강화 방안을 제시하세요.", difficulty: "hard" },
      { question: "공무원에 지원한 동기는 무엇인가요?", tip: "공익 실현 의지와 구체적인 직무 연관성을 설명하세요.", difficulty: "easy" },
      { question: "여러 부서가 협력해야 하는 프로젝트를 추진한 경험이 있나요?", tip: "협업 구조 설계와 이해관계 조율 방법을 설명하세요.", difficulty: "medium" },
      { question: "법령 및 규정 해석이 모호할 때 어떻게 판단하시나요?", tip: "상위 법령 참조, 유권해석 요청, 상급자 보고 등 절차를 설명하세요.", difficulty: "hard" },
      { question: "최근 관심 있는 사회 문제는 무엇이며, 공직에서 어떻게 기여할 수 있나요?", tip: "시사 이슈와 정책적 해결 방안을 연결하여 설명하세요.", difficulty: "medium" },
      { question: "정책의 수혜자인 시민의 의견을 어떻게 정책에 반영하시나요?", tip: "공청회, 설문, 시민 참여단 등 다양한 수렴 방식을 설명하세요.", difficulty: "medium" },
      { question: "예산 삭감 상황에서 기존 서비스의 질을 유지하는 방법은?", tip: "우선순위 재조정, 민관 협력, 디지털화를 통한 효율화를 설명하세요.", difficulty: "hard" },
      { question: "개인 업무 역량을 향상시키기 위해 어떤 노력을 하고 있나요?", tip: "직무 교육, 자격증, 자기 학습 등 구체적인 노력을 이야기하세요.", difficulty: "easy" },
    ],
    en: [
      { question: "What do you consider the most important value in public service?", tip: "Connect values like integrity, public interest, and accountability to your experience.", difficulty: "easy" },
      { question: "How do you handle conflicts with citizens filing complaints?", tip: "Explain how to follow rules while remaining citizen-friendly.", difficulty: "medium" },
      { question: "How would you respond to an unreasonable order from a superior?", tip: "Describe civil service ethics standards and internal reporting procedures.", difficulty: "hard" },
      { question: "How can public services be improved in the digital transformation era?", tip: "Suggest e-government, big data, and AI application examples.", difficulty: "medium" },
      { question: "How would you improve a program frequently cited for wasting tax money?", tip: "Propose redesigning performance metrics, citizen participation, and transparency.", difficulty: "hard" },
      { question: "Why did you apply for public service?", tip: "Connect your desire to serve the public interest to the specific role.", difficulty: "easy" },
      { question: "Have you led a project requiring cross-department collaboration?", tip: "Explain your collaboration structure and stakeholder alignment approach.", difficulty: "medium" },
      { question: "How do you make decisions when laws or regulations are ambiguous?", tip: "Describe referring to higher statutes, seeking official interpretation, and reporting up.", difficulty: "hard" },
      { question: "What social issue are you interested in and how can you contribute from a public role?", tip: "Link a current issue to a policy-level solution.", difficulty: "medium" },
      { question: "How do you incorporate citizens' opinions into policy?", tip: "Explain public hearings, surveys, and citizen participation panels.", difficulty: "medium" },
      { question: "How do you maintain service quality when facing budget cuts?", tip: "Discuss priority rebalancing, public-private partnerships, and digitalization.", difficulty: "hard" },
      { question: "What are you doing to improve your professional capabilities?", tip: "Mention job training, certifications, and self-directed learning.", difficulty: "easy" },
    ],
  },
};

const JOB_LABELS: Record<Locale, Record<JobCategory, string>> = {
  ko: { developer: "개발자", designer: "디자이너", marketer: "마케터", sales: "영업", finance: "재무/회계", hr: "인사(HR)", manager: "관리자/리더", teacher: "교사", nurse: "간호사", public: "공무원" },
  en: { developer: "Developer", designer: "Designer", marketer: "Marketer", sales: "Sales", finance: "Finance/Accounting", hr: "HR", manager: "Manager/Leader", teacher: "Teacher", nurse: "Nurse", public: "Civil Servant" },
  ja: { developer: "エンジニア", designer: "デザイナー", marketer: "マーケター", sales: "営業", finance: "財務/会計", hr: "人事(HR)", manager: "マネージャー", teacher: "教師", nurse: "看護師", public: "公務員" },
  fr: { developer: "Développeur", designer: "Designer", marketer: "Marketeur", sales: "Commercial", finance: "Finance/Comptabilité", hr: "RH", manager: "Manager/Leader", teacher: "Enseignant", nurse: "Infirmier(e)", public: "Fonctionnaire" },
  es: { developer: "Desarrollador", designer: "Diseñador", marketer: "Marketero", sales: "Ventas", finance: "Finanzas/Contabilidad", hr: "RRHH", manager: "Gerente/Líder", teacher: "Docente", nurse: "Enfermero(a)", public: "Funcionario" },
  zh: { developer: "开发工程师", designer: "设计师", marketer: "市场营销", sales: "销售", finance: "财务/会计", hr: "人力资源", manager: "管理者/领导", teacher: "教师", nurse: "护士", public: "公务员" },
};

const DIFFICULTY_LABELS: Record<Locale, Record<Difficulty | "all", string>> = {
  ko: { all: "전체", easy: "쉬움", medium: "보통", hard: "어려움" },
  en: { all: "All", easy: "Easy", medium: "Medium", hard: "Hard" },
  ja: { all: "すべて", easy: "簡単", medium: "普通", hard: "難しい" },
  fr: { all: "Tout", easy: "Facile", medium: "Moyen", hard: "Difficile" },
  es: { all: "Todos", easy: "Fácil", medium: "Medio", hard: "Difícil" },
  zh: { all: "全部", easy: "简单", medium: "中等", hard: "困难" },
};

const UI_TEXT: Record<Locale, {
  title: string;
  subtitle: string;
  jobLabel: string;
  countLabel: string;
  difficultyLabel: string;
  dataLangLabel: string;
  generateBtn: string;
  regenerateBtn: string;
  tipLabel: string;
  copyBtn: string;
  copiedBtn: string;
  noQuestions: string;
  questionsTitle: string;
}> = {
  ko: {
    title: "면접 질문 생성기",
    subtitle: "Interview Question Generator",
    jobLabel: "직무 선택",
    countLabel: "질문 수",
    difficultyLabel: "난이도",
    dataLangLabel: "질문 언어",
    generateBtn: "질문 생성",
    regenerateBtn: "다시 생성",
    tipLabel: "💡 팁",
    copyBtn: "복사",
    copiedBtn: "복사됨",
    noQuestions: "해당 조건에 맞는 질문이 없습니다.",
    questionsTitle: "면접 질문 목록",
  },
  en: {
    title: "Interview Question Generator",
    subtitle: "Practice makes perfect",
    jobLabel: "Job Category",
    countLabel: "Number of Questions",
    difficultyLabel: "Difficulty",
    dataLangLabel: "Question Language",
    generateBtn: "Generate Questions",
    regenerateBtn: "Regenerate",
    tipLabel: "💡 Tip",
    copyBtn: "Copy",
    copiedBtn: "Copied",
    noQuestions: "No questions match the selected filters.",
    questionsTitle: "Interview Questions",
  },
  ja: {
    title: "面接質問ジェネレーター",
    subtitle: "Interview Question Generator",
    jobLabel: "職種選択",
    countLabel: "質問数",
    difficultyLabel: "難易度",
    dataLangLabel: "質問言語",
    generateBtn: "質問を生成",
    regenerateBtn: "再生成",
    tipLabel: "💡 ヒント",
    copyBtn: "コピー",
    copiedBtn: "コピー済",
    noQuestions: "条件に合う質問がありません。",
    questionsTitle: "面接質問リスト",
  },
  fr: {
    title: "Générateur de questions d'entretien",
    subtitle: "Interview Question Generator",
    jobLabel: "Catégorie de poste",
    countLabel: "Nombre de questions",
    difficultyLabel: "Difficulté",
    dataLangLabel: "Langue des questions",
    generateBtn: "Générer les questions",
    regenerateBtn: "Régénérer",
    tipLabel: "💡 Conseil",
    copyBtn: "Copier",
    copiedBtn: "Copié",
    noQuestions: "Aucune question ne correspond aux filtres.",
    questionsTitle: "Questions d'entretien",
  },
  es: {
    title: "Generador de preguntas de entrevista",
    subtitle: "Interview Question Generator",
    jobLabel: "Categoría de trabajo",
    countLabel: "Número de preguntas",
    difficultyLabel: "Dificultad",
    dataLangLabel: "Idioma de preguntas",
    generateBtn: "Generar preguntas",
    regenerateBtn: "Regenerar",
    tipLabel: "💡 Consejo",
    copyBtn: "Copiar",
    copiedBtn: "Copiado",
    noQuestions: "No hay preguntas para los filtros seleccionados.",
    questionsTitle: "Preguntas de entrevista",
  },
  zh: {
    title: "面试问题生成器",
    subtitle: "Interview Question Generator",
    jobLabel: "职位选择",
    countLabel: "问题数量",
    difficultyLabel: "难度",
    dataLangLabel: "问题语言",
    generateBtn: "生成问题",
    regenerateBtn: "重新生成",
    tipLabel: "💡 提示",
    copyBtn: "复制",
    copiedBtn: "已复制",
    noQuestions: "没有符合条件的问题。",
    questionsTitle: "面试问题列表",
  },
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  hard: "bg-destructive/15 text-destructive border-destructive/30",
};

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface Props {
  locale: Locale;
}

export default function InterviewQuestionGenerator({ locale }: Props) {
  const t = UI_TEXT[locale] ?? UI_TEXT.en;
  const jobLabels = JOB_LABELS[locale] ?? JOB_LABELS.en;
  const diffLabels = DIFFICULTY_LABELS[locale] ?? DIFFICULTY_LABELS.en;

  const [job, setJob] = useState<JobCategory>("developer");
  const [count, setCount] = useState<5 | 10 | 15>(10);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [dataLang, setDataLang] = useState<DataLang>("ko");
  const [generated, setGenerated] = useState<Question[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generate = useCallback(() => {
    const pool = QUESTIONS_DB[job][dataLang];
    const filtered = difficulty === "all" ? pool : pool.filter((q) => q.difficulty === difficulty);
    const picked = shuffleAndPick(filtered, count);
    setGenerated(picked);
    setHasGenerated(true);
  }, [job, count, difficulty, dataLang]);

  const copyQuestion = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }, []);

  return (
    <div className="not-prose my-8 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-foreground">{t.title}</h2>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">{t.subtitle}</p>
      </div>

      {/* Settings Card */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
        {/* Job */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-foreground">{t.jobLabel}</label>
          <select
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            value={job}
            onChange={(e) => setJob(e.target.value as JobCategory)}
          >
            {(Object.keys(QUESTIONS_DB) as JobCategory[]).map((k) => (
              <option key={k} value={k}>{jobLabels[k]}</option>
            ))}
          </select>
        </div>

        {/* Count + Difficulty row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-foreground">{t.countLabel}</label>
            <select
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={count}
              onChange={(e) => setCount(Number(e.target.value) as 5 | 10 | 15)}
            >
              {[5, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-foreground">{t.difficultyLabel}</label>
            <select
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}
            >
              {(["all", "easy", "medium", "hard"] as const).map((d) => (
                <option key={d} value={d}>{diffLabels[d]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Language */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-foreground">{t.dataLangLabel}</label>
          <div className="flex gap-2">
            {(["ko", "en"] as DataLang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setDataLang(lang)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                  dataLang === lang
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-accent"
                }`}
              >
                {lang === "ko" ? "한국어" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generate}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          {hasGenerated ? t.regenerateBtn : t.generateBtn}
        </button>
      </div>

      {/* Results */}
      {hasGenerated && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-foreground">{t.questionsTitle} ({generated.length})</h3>
          {generated.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noQuestions}</p>
          ) : (
            generated.map((q, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[q.difficulty]}`}>
                      {diffLabels[q.difficulty]}
                    </span>
                    <button
                      onClick={() => copyQuestion(q.question, i)}
                      className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-accent border border-border transition-colors"
                    >
                      {copiedIndex === i ? t.copiedBtn : t.copyBtn}
                    </button>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-xl px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-bold">{t.tipLabel} </span>{q.tip}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
