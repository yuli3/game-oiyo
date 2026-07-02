import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Heart from 'lucide-react/dist/esm/icons/heart'
import Shield from 'lucide-react/dist/esm/icons/shield'
import Anchor from 'lucide-react/dist/esm/icons/anchor'
import CloudRain from 'lucide-react/dist/esm/icons/cloud-rain'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles'
import Compass from 'lucide-react/dist/esm/icons/compass'
import Brain from 'lucide-react/dist/esm/icons/brain'
import Zap from 'lucide-react/dist/esm/icons/zap'
import Layers from 'lucide-react/dist/esm/icons/layers';

/**
 * Simplified Attachment Theory Test
 * Ported from oiyo.net viral themes
 */
export const AttachmentTest: React.FC = () => {
    const [step, setStep] = useState(0);
    const [scores, setScores] = useState({ secure: 0, anxious: 0, avoidant: 0 });
    const [result, setResult] = useState<any>(null);

    const questions = [
        {
            q: "연인이나 친구와 너무 가까워지면 약간 불편한 기분이 드나요?",
            options: [
                { text: "전혀 그렇지 않다. 친밀함이 좋다.", type: 'secure' },
                { text: "그렇다. 어느 정도 거리를 두어야 편안하다.", type: 'avoidant' }
            ]
        },
        {
            q: "상대방이 내가 원하는 만큼 관심을 주지 않으면 불안한가요?",
            options: [
                { text: "그렇다. 상대의 반응에 매우 민감한 편이다.", type: 'anxious' },
                { text: "아니다. 바쁘거나 상황이 있겠거니 생각한다.", type: 'secure' }
            ]
        },
        {
            q: "자신의 속마음이나 고민을 남에게 솔직히 말하는 것이 어떤가요?",
            options: [
                { text: "어렵다. 누굴 믿기도 힘들고 감정을 드러내기 싫다.", type: 'avoidant' },
                { text: "쉽다. 신뢰하는 사람에게는 편하게 말한다.", type: 'secure' }
            ]
        },
        {
            q: "이별이나 관계의 갈등 상황에서 당신의 반응은?",
            options: [
                { text: "상대가 떠날까봐 매달리거나 계속 연락한다.", type: 'anxious' },
                { text: "오히려 차분해지거나 감정을 차단하고 멀어진다.", type: 'avoidant' }
            ]
        }
    ];

    const handleAnswer = (type: string) => {
        const newScores = { ...scores, [type]: (scores as any)[type] + 1 };
        setScores(newScores);

        if (step < questions.length - 1) {
            setStep(step + 1);
        } else {
            calculateResult(newScores);
        }
    };

    const calculateResult = (finalScores: any) => {
        let title = "";
        let description = "";
        let icon: any = null;
        let color = "";

        if (finalScores.secure >= 2) {
            title = "안정형 (Secure)";
            description = "친밀감을 즐기며 타인을 신뢰합니다. 갈등 상황에서도 감정을 잘 조절하며 건강한 관계를 맺습니다.";
            icon = <Anchor className="w-12 h-12 text-emerald-500" />;
            color = "bg-emerald-50 text-emerald-900 border-emerald-100";
        } else if (finalScores.anxious > finalScores.avoidant) {
            title = "불안형 (Anxious)";
            description = "상대의 반응에 민감하며 버림받을지 모른다는 불안감을 자주 느낍니다. 더 많은 애정을 갈구하는 성향이 있습니다.";
            icon = <CloudRain className="w-12 h-12 text-blue-500" />;
            color = "bg-blue-50 text-blue-900 border-blue-100";
        } else {
            title = "회피형 (Avoidant)";
            description = "친밀해지는 것을 구속이라 느끼며 거리를 두려 합니다. 독립성을 매우 중요하게 생각하고 감정 표현에 소극적입니다.";
            icon = <Shield className="w-12 h-12 text-rose-500" />;
            color = "bg-rose-50 text-rose-900 border-rose-100";
        }

        setResult({ title, description, icon, color });
    };

    const reset = () => {
        setStep(0);
        setScores({ secure: 0, anxious: 0, avoidant: 0 });
        setResult(null);
    };

    return (
        <Card className="p-8 bg-white border-slate-200 shadow-2xl mt-8 min-h-[450px] flex flex-col justify-center overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Heart size={150} fill="currentColor" className="text-rose-200" />
            </div>

            {!result ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                    <div className="flex items-center gap-2 mb-4 justify-center">
                        <Heart className="text-rose-500 fill-rose-500" />
                        <h3 className="text-xl font-bold text-slate-900">나의 연애 애착 유형 테스트</h3>
                        <Sparkles className="text-amber-400 w-4 h-4" />
                    </div>

                    <div className="text-center space-y-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {step + 1} of {questions.length}</div>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-snug max-w-sm mx-auto">{questions[step].q}</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                        {questions[step].options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleAnswer(opt.type)}
                                className="p-6 bg-slate-50 hover:bg-white border-2 border-slate-100 hover:border-rose-400 rounded-2xl text-slate-700 font-bold transition-all text-lg shadow-sm hover:shadow-xl active:scale-95 text-left"
                            >
                                {opt.text}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-8 animate-in zoom-in duration-500 relative z-10 p-4">
                    <div className="flex justify-center mb-4">
                        <div className={`p-6 rounded-full ${result.color} shadow-lg`}>
                            {result.icon}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">진단 결과</span>
                        <h4 className="text-4xl font-black text-slate-900 tracking-tight">{result.title}</h4>
                        <p className="text-slate-600 max-w-sm mx-auto leading-relaxed font-medium">
                            {result.description}
                        </p>
                    </div>
                    
                    <div className="pt-6">
                        <Button onClick={reset} variant="outline" className="rounded-full px-10 border-2 hover:bg-slate-50 font-bold">테스트 다시하기</Button>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-8 italic">
                        * 이 테스트는 성인 애착 유형 이론(Adult Attachment Theory)을 기반으로 oiyo.net에서 재구성한 간이 진단입니다.
                    </p>
                </div>
            )}
        </Card>
    );
};

/**
 * Mini MBTI Compass Test (ahoxy-style quick test)
 * 4 questions → 4-letter type + core tendencies
 */
export const MBTIQuickTest: React.FC<{ locale?: "ko" | "en" | "ja" }> = ({ locale = "ko" }) => {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<{
        type: string;
        traits: string[];
        headline: string;
    } | null>(null);

    const copy = {
        ko: {
            title: "4문항 MBTI 컴퍼스 테스트",
            miniLabel: "MBTI Mini Compass",
            resultLabel: "진단 결과",
            reset: "테스트 다시하기",
            footer: "* 이 테스트는 MBTI 4지표를 압축한 간이 버전으로, 자기이해를 위한 참고용입니다.",
            questions: [
                {
                    dimension: "EI",
                    q: "에너지를 어디에서 더 많이 충전하나요?",
                    options: [
                        { text: "사람과 함께 있을 때", value: "E" },
                        { text: "혼자만의 시간에서", value: "I" },
                    ],
                },
                {
                    dimension: "SN",
                    q: "정보를 이해할 때 더 끌리는 방식은?",
                    options: [
                        { text: "경험과 사실 중심", value: "S" },
                        { text: "패턴과 가능성 중심", value: "N" },
                    ],
                },
                {
                    dimension: "TF",
                    q: "결정의 기준이 무엇에 가까운가요?",
                    options: [
                        { text: "논리와 원칙", value: "T" },
                        { text: "관계와 가치", value: "F" },
                    ],
                },
                {
                    dimension: "JP",
                    q: "일정과 마감에 대한 스타일은?",
                    options: [
                        { text: "계획적으로 정리", value: "J" },
                        { text: "유연하게 조정", value: "P" },
                    ],
                },
            ],
            traitCopy: {
                E: "에너지를 사람과 상호작용에서 회복합니다.",
                I: "에너지를 조용한 몰입과 사색에서 회복합니다.",
                S: "현실적인 데이터와 경험에 강합니다.",
                N: "패턴과 가능성의 연결에 강합니다.",
                T: "논리와 원칙을 기준으로 판단합니다.",
                F: "가치와 관계의 조화를 기준으로 판단합니다.",
                J: "계획과 마감 관리에 안정감을 느낍니다.",
                P: "즉흥성과 유연함에서 성과가 납니다.",
            },
            headlineMap: {
                INTJ: "전략적 설계자형",
                INTP: "분석적 탐구자형",
                INFJ: "통찰적 조율자형",
                INFP: "이상주의 탐색자형",
                ENTJ: "결정적 추진자형",
                ENTP: "아이디어 개척자형",
                ENFJ: "영향력 있는 리더형",
                ENFP: "영감 주는 촉진자형",
                ISTJ: "정확한 관리자형",
                ISFJ: "따뜻한 수호자형",
                ISTP: "실전 문제해결형",
                ISFP: "감각적 크리에이터형",
                ESTJ: "실행 중심 리더형",
                ESFJ: "조직의 분위기 메이커형",
                ESTP: "현장형 해결사형",
                ESFP: "에너지 넘치는 무대형",
            },
        },
        en: {
            title: "4-Question MBTI Compass",
            miniLabel: "MBTI Mini Compass",
            resultLabel: "Your Snapshot",
            reset: "Retake the test",
            footer: "* A compact MBTI mini check for self-insight, not a clinical assessment.",
            questions: [
                {
                    dimension: "EI",
                    q: "Where do you recharge more naturally?",
                    options: [
                        { text: "With people and interaction", value: "E" },
                        { text: "In quiet, solo time", value: "I" },
                    ],
                },
                {
                    dimension: "SN",
                    q: "Which kind of information pulls you in?",
                    options: [
                        { text: "Facts and lived experience", value: "S" },
                        { text: "Patterns and possibilities", value: "N" },
                    ],
                },
                {
                    dimension: "TF",
                    q: "What feels closer to your decision style?",
                    options: [
                        { text: "Logic and principles", value: "T" },
                        { text: "Values and people impact", value: "F" },
                    ],
                },
                {
                    dimension: "JP",
                    q: "How do you handle plans and deadlines?",
                    options: [
                        { text: "Structured and planned", value: "J" },
                        { text: "Flexible and adaptive", value: "P" },
                    ],
                },
            ],
            traitCopy: {
                E: "You recharge through interaction and external energy.",
                I: "You recharge through quiet focus and reflection.",
                S: "You trust concrete data and lived experience.",
                N: "You connect patterns and future possibilities.",
                T: "You prioritize logic and consistency.",
                F: "You prioritize values and relationship harmony.",
                J: "You prefer closure and planned structure.",
                P: "You stay open and adapt as things unfold.",
            },
            headlineMap: {
                INTJ: "Strategic Architect",
                INTP: "Analytical Explorer",
                INFJ: "Insightful Harmonizer",
                INFP: "Idealist Navigator",
                ENTJ: "Decisive Driver",
                ENTP: "Idea Catalyst",
                ENFJ: "Influential Mentor",
                ENFP: "Inspirational Spark",
                ISTJ: "Precision Organizer",
                ISFJ: "Warm Guardian",
                ISTP: "Practical Solver",
                ISFP: "Sensitive Creator",
                ESTJ: "Execution Leader",
                ESFJ: "Community Energizer",
                ESTP: "On‑the‑Spot Fixer",
                ESFP: "Vivid Performer",
            },
        },
        ja: {
            title: "4問MBTIコンパス",
            miniLabel: "MBTI Mini Compass",
            resultLabel: "診断結果",
            reset: "もう一度テスト",
            footer: "* MBTIの4指標を短く確認するための簡易テストです。",
            questions: [
                {
                    dimension: "EI",
                    q: "エネルギーはどこで回復しやすい？",
                    options: [
                        { text: "人と関わると回復する", value: "E" },
                        { text: "一人時間で回復する", value: "I" },
                    ],
                },
                {
                    dimension: "SN",
                    q: "情報を捉えるときの傾向は？",
                    options: [
                        { text: "経験と事実を重視", value: "S" },
                        { text: "パターンと可能性を重視", value: "N" },
                    ],
                },
                {
                    dimension: "TF",
                    q: "意思決定の軸に近いのは？",
                    options: [
                        { text: "論理と原則", value: "T" },
                        { text: "価値観と人への影響", value: "F" },
                    ],
                },
                {
                    dimension: "JP",
                    q: "予定と締切の運用スタイルは？",
                    options: [
                        { text: "計画的に整える", value: "J" },
                        { text: "柔軟に調整する", value: "P" },
                    ],
                },
            ],
            traitCopy: {
                E: "外部との交流からエネルギーを得ます。",
                I: "静かな集中と内省からエネルギーを得ます。",
                S: "具体的な事実や経験を重視します。",
                N: "パターンや可能性をつなげます。",
                T: "論理と一貫性を重視します。",
                F: "価値観と関係性を重視します。",
                J: "計画と締切の整合に安心感があります。",
                P: "柔軟に動きながら最適化します。",
            },
            headlineMap: {
                INTJ: "戦略設計タイプ",
                INTP: "分析探究タイプ",
                INFJ: "洞察調整タイプ",
                INFP: "理想探索タイプ",
                ENTJ: "推進リーダータイプ",
                ENTP: "発想開拓タイプ",
                ENFJ: "影響力メンタータイプ",
                ENFP: "インスピレーションタイプ",
                ISTJ: "精密オーガナイザータイプ",
                ISFJ: "あたたかい守護タイプ",
                ISTP: "実戦ソルバータイプ",
                ISFP: "感性クリエイタータイプ",
                ESTJ: "実行マネジメントタイプ",
                ESFJ: "コミュニティムードメーカー",
                ESTP: "現場即応タイプ",
                ESFP: "エネルギッシュな表現タイプ",
            },
        },
    } as const;

    const iconByDimension: Record<string, React.ReactNode> = {
        EI: <Compass className="text-emerald-500" />,
        SN: <Layers className="text-indigo-500" />,
        TF: <Brain className="text-rose-500" />,
        JP: <Zap className="text-amber-500" />,
    };

    const active = copy[locale];
    const questions = active.questions.map((q) => ({
        ...q,
        icon: iconByDimension[q.dimension],
    }));

    const traitCopy: Record<string, string> = active.traitCopy;
    const headlineMap: Record<string, string> = active.headlineMap;

    const calculateResult = (finalAnswers: Record<string, string>) => {
        const type = [
            finalAnswers.EI ?? "E",
            finalAnswers.SN ?? "S",
            finalAnswers.TF ?? "T",
            finalAnswers.JP ?? "J",
        ].join("");
        const traits = type.split("").map((letter) => traitCopy[letter]);
        const headline = headlineMap[type] ?? "인지 스타일 요약";

        setResult({ type, traits, headline });
    };

    const getHeadlineClass = (headline: string) => {
        if (locale === "ja") {
            if (headline.length >= 16) return "text-xs leading-snug break-keep";
            if (headline.length >= 12) return "text-sm leading-snug break-keep";
            return "text-base leading-snug break-keep";
        }
        if (locale === "en") {
            if (headline.length >= 22) return "text-xs leading-snug text-pretty";
            if (headline.length >= 16) return "text-sm leading-snug text-pretty";
            return "text-base leading-snug text-pretty";
        }
        if (headline.length >= 18) return "text-xs leading-snug";
        if (headline.length >= 14) return "text-sm leading-snug";
        return "text-base leading-snug";
    };

    const handleAnswer = (dimension: string, value: string) => {
        const nextAnswers = { ...answers, [dimension]: value };
        setAnswers(nextAnswers);

        if (step < questions.length - 1) {
            setStep(step + 1);
        } else {
            calculateResult(nextAnswers);
        }
    };

    const reset = () => {
        setStep(0);
        setAnswers({});
        setResult(null);
    };

    return (
        <Card className="p-8 bg-white border-slate-200 shadow-2xl mt-8 min-h-[460px] flex flex-col justify-center overflow-hidden relative">
            <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-emerald-100/50 blur-2xl" />
            <div className="absolute -bottom-12 -left-10 w-40 h-40 rounded-full bg-indigo-100/50 blur-2xl" />

            {!result ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                    <div className="flex items-center gap-2 mb-4 justify-center">
                        <Compass className="text-emerald-500" />
                        <h3 className="text-xl font-black text-slate-900">{active.title}</h3>
                        <Sparkles className="text-amber-400 w-4 h-4" />
                    </div>

                    <div className="text-center space-y-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Question {step + 1} of {questions.length}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                            {questions[step].icon}
                            <span className="text-xs font-semibold">{active.miniLabel}</span>
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-snug max-w-sm mx-auto">
                            {questions[step].q}
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                        {questions[step].options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleAnswer(questions[step].dimension, opt.value)}
                                className="p-6 bg-slate-50 hover:bg-white border-2 border-slate-100 hover:border-emerald-400 rounded-2xl text-slate-700 font-bold transition-all text-lg shadow-sm hover:shadow-xl active:scale-95 text-left"
                            >
                                {opt.text}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-8 animate-in zoom-in duration-500 relative z-10 p-4">
                    <div className="flex justify-center mb-4">
                        <div className="p-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-lg">
                            <Compass className="w-12 h-12" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{active.resultLabel}</span>
                        <h4 className="text-4xl font-black text-slate-900 tracking-tight">{result.type}</h4>
                        <p className={`font-bold text-emerald-700 ${getHeadlineClass(result.headline)}`}>
                            {result.headline}
                        </p>
                    </div>

                    <div className="space-y-2 max-w-sm mx-auto text-left">
                        {result.traits.map((trait, i) => (
                            <div key={i} className="flex items-start gap-2 text-slate-600">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <p className="text-sm font-medium">{trait}</p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6">
                        <Button onClick={reset} variant="outline" className="rounded-full px-10 border-2 hover:bg-slate-50 font-bold">
                            {active.reset}
                        </Button>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-8 italic">
                        {active.footer}
                    </p>
                </div>
            )}
        </Card>
    );
};
