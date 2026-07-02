import React, { useState } from 'react';

const translations = {
  ko: {
    title: "MBTI별 연봉 인사이트 & 협상 전략",
    selectType: "나의 성격 유형 선택",
    salaryInsight: "연봉 인사이트",
    negotiationStrategy: "맞춤형 협상 전략",
    script: "추천 협상 스크립트",
    types: {
      ENTJ: { 
        insight: "평균 소득이 가장 높은 유형 중 하나입니다. 목표 지향적이며 리더십이 뛰어납니다.",
        strategy: "당신이 달성한 수치적 성과를 강조하세요. 객관적 데이터는 당신의 가장 큰 무기입니다.",
        script: "지난 분기 제가 주도한 프로젝트로 매출이 20% 상승했습니다. 이에 따른 시장 가치 보상을 요청드립니다."
      },
      INTJ: {
        insight: "전략적 사고 능력을 인정받아 고연봉 전문직에 종사하는 경우가 많습니다.",
        strategy: "미래의 효율성과 시스템 개선 가능성을 제시하세요. 당신의 비전이 회사의 이익임을 증명하세요.",
        script: "현재 프로세스 개선을 통해 비용을 15% 절감할 수 있는 로드맵을 가지고 있습니다. 이를 추진할 책임과 처우 개선을 제안합니다."
      },
      ENFP: {
        insight: "창의성과 대인관계 능력이 뛰어납니다. 다만, 협상 테이블에서는 감정보다 성과를 앞세워야 합니다.",
        strategy: "당신의 네트워크 기여도와 팀 분위기 쇄신 능력을 언급하세요. 다재다능함을 어필하세요.",
        script: "저는 부서 간 협업의 허브 역할을 하며 프로젝트 속도를 높였습니다. 저의 독특한 기여도를 반영해주시기 바랍니다."
      },
      INFJ: {
        insight: "가치 지향적 업무에서 고도의 집중력을 발휘합니다. 연봉 협상에서 지나치게 양보하지 마세요.",
        strategy: "회사의 비전과 당신의 가치가 일치함을 강조하되, 당신의 전문성이 대체 불가능함을 상기시키세요.",
        script: "회사의 성장이 곧 저의 목표입니다. 제가 더 몰입하여 장기적으로 기여할 수 있도록 시장 수준에 맞는 조정을 요청드립니다."
      }
      // ... More types can be added
    }
  },
  en: {
    title: "MBTI Salary Insights & Negotiation Strategies",
    selectType: "Select Your Type",
    salaryInsight: "Salary Insight",
    negotiationStrategy: "Negotiation Strategy",
    script: "Recommended Script",
    types: {
      ENTJ: {
        insight: "One of the highest-earning types. Goal-oriented with exceptional leadership.",
        strategy: "Emphasize your numerical achievements. Objective data is your strongest weapon.",
        script: "The project I led last quarter increased revenue by 20%. I'm requesting a compensation adjustment reflecting this market value."
      },
      INTJ: {
        insight: "Often found in high-paying specialist roles due to strategic thinking.",
        strategy: "Present future efficiencies and system improvement potential. Prove your vision is the company's profit.",
        script: "I have a roadmap to reduce costs by 15% through process improvement. I propose a compensation increase along with this initiative."
      },
      ENFP: {
        insight: "Excellent creativity and interpersonal skills. Focus on performance over emotions during negotiation.",
        strategy: "Mention your network contribution and ability to boost team morale. Highlight your versatility.",
        script: "I've acted as a hub for cross-departmental collaboration, speeding up projects. I hope you'll reflect my unique contribution in this review."
      },
      INFJ: {
        insight: "Highly focused in value-oriented work. Don't compromise too much in salary talks.",
        strategy: "Highlight how your values align with the company's vision, while reminding them your expertise is irreplaceable.",
        script: "The company's growth is my goal. To contribute effectively in the long term, I request an adjustment to meet market standards."
      }
    }
  }
};

const MbtiSalaryExpert: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = translations[locale] || translations.ko;
    const [selectedType, setSelectedType] = useState<string>('ENTJ');
    
    // @ts-ignore
    const data = t.types[selectedType] || t.types.ENTJ;

    return (
        <div className="not-prose my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-3xl mx-auto">
            <h3 className="text-2xl font-black text-center text-slate-900 mb-8">{t.title}</h3>
            
            <div className="flex flex-wrap justify-center gap-2 mb-10">
                {Object.keys(t.types).map(type => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-4 py-2 rounded-xl border font-bold transition-all ${
                            selectedType === type
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-110'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-400'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                        <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">💰 {t.salaryInsight}</h4>
                        <p className="text-slate-800 text-base leading-relaxed">{data.insight}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">🎯 {t.negotiationStrategy}</h4>
                        <p className="text-slate-800 text-base leading-relaxed">{data.strategy}</p>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">💬 {t.script}</h4>
                    <div className="flex-1 italic text-lg leading-relaxed mb-4">
                        <span className="text-4xl text-indigo-500 font-serif">"</span>
                        {data.script}
                        <span className="text-4xl text-indigo-500 font-serif leading-[0]">"</span>
                    </div>
                    <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                      {locale === 'ko' ? '스크립트 복사하기' : 'Copy Script'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MbtiSalaryExpert;
