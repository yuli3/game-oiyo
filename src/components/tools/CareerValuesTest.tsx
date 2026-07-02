import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props { locale?: Locale; }
type Lang = "ko"|"en"|"ja";
type ValueKey = "autonomy"|"creativity"|"security"|"recognition"|"relationships"|"impact"|"learning"|"leadership"|"balance"|"compensation";

// ─── Questions (2 per value = 20 questions) ───────────────────────────────────
interface Q { id:number; key:ValueKey; ko:string; en:string; ja:string; }

const QUESTIONS: Q[] = [
  { id:1,  key:"autonomy",      ko:"내 방식대로 일하고, 스스로 결정을 내리는 것이 중요하다.",                en:"Working my own way and making my own decisions is important.",                        ja:"自分のやり方で仕事し、自分で決断することが重要だ。" },
  { id:2,  key:"autonomy",      ko:"세밀하게 관리받거나 업무 방식이 정해지는 것이 불편하다.",                en:"Being micromanaged or having my work method dictated feels uncomfortable.",            ja:"細かく管理されたり、仕事のやり方を決められることが不快だ。" },
  { id:3,  key:"creativity",    ko:"새로운 아이디어를 내고 창의적으로 문제를 해결하는 것을 좋아한다.",         en:"I enjoy generating new ideas and solving problems creatively.",                        ja:"新しいアイデアを出し、創造的に問題を解決することが好きだ。" },
  { id:4,  key:"creativity",    ko:"반복적이고 정해진 루틴보다 새로운 도전이 에너지를 준다.",                en:"New challenges give me more energy than repetitive, set routines.",                    ja:"繰り返しの決まったルーティンより、新しい挑戦がエネルギーをくれる。" },
  { id:5,  key:"security",      ko:"안정적인 수입과 고용 보장이 커리어 선택에서 매우 중요하다.",              en:"Stable income and job security are very important in my career choices.",               ja:"安定した収入と雇用保障がキャリア選択においてとても重要だ。" },
  { id:6,  key:"security",      ko:"변화가 많고 불확실한 환경보다 예측 가능한 환경을 선호한다.",              en:"I prefer predictable environments over ones with lots of change and uncertainty.",      ja:"変化が多く不確実な環境より、予測可能な環境を好む。" },
  { id:7,  key:"recognition",   ko:"내 노력과 성과가 다른 사람들에게 인정받는 것이 중요하다.",               en:"Having my effort and results recognized by others is important.",                      ja:"自分の努力と成果が他の人に認められることが重要だ。" },
  { id:8,  key:"recognition",   ko:"승진이나 수상, 공개적인 인정을 받을 때 크게 동기부여가 된다.",            en:"I'm greatly motivated by promotions, awards, or public recognition.",                  ja:"昇進や表彰、公開的な認定を受けると大きくモチベーションが上がる。" },
  { id:9,  key:"relationships",  ko:"직장 동료와 좋은 관계를 맺고 팀워크를 발휘하는 것이 중요하다.",           en:"Building good relationships with colleagues and demonstrating teamwork is important.",  ja:"職場の同僚と良い関係を築き、チームワークを発揮することが重要だ。" },
  { id:10, key:"relationships",  ko:"일터에서 지지적이고 협력적인 분위기가 업무 만족도에 크게 영향을 준다.",    en:"A supportive, collaborative atmosphere at work greatly affects my job satisfaction.",   ja:"職場での支持的で協力的な雰囲気が仕事の満足度に大きく影響する。" },
  { id:11, key:"impact",        ko:"내 일이 사회나 타인에게 실질적인 도움이 되고 있다는 느낌이 중요하다.",      en:"It's important to feel that my work is genuinely helpful to society or others.",        ja:"自分の仕事が社会や他者に実質的な助けになっているという感覚が重要だ。" },
  { id:12, key:"impact",        ko:"더 큰 목적에 기여하는 의미 있는 일을 원한다.",                         en:"I want meaningful work that contributes to a larger purpose.",                         ja:"より大きな目的に貢献する意義ある仕事をしたい。" },
  { id:13, key:"learning",      ko:"지속적으로 새로운 기술과 지식을 배우는 환경에서 성장한다.",               en:"I grow in environments where I can continuously learn new skills and knowledge.",       ja:"継続的に新しいスキルと知識を学べる環境で成長する。" },
  { id:14, key:"learning",      ko:"학습 기회와 개발 프로그램이 커리어 선택에 중요한 요소이다.",               en:"Learning opportunities and development programs are important factors in career choices.", ja:"学習機会と開発プログラムがキャリア選択の重要な要素だ。" },
  { id:15, key:"leadership",    ko:"다른 사람들을 이끌고 방향을 제시하는 역할을 즐긴다.",                     en:"I enjoy leading others and providing direction.",                                     ja:"他の人をリードし、方向性を示す役割を楽しむ。" },
  { id:16, key:"leadership",    ko:"팀이나 프로젝트에서 책임 있는 위치에 있을 때 더 잘 발휘된다.",            en:"I perform better when I'm in a position of responsibility on a team or project.",       ja:"チームやプロジェクトで責任ある立場にあるとき、より力を発揮できる。" },
  { id:17, key:"balance",       ko:"일과 개인 생활의 균형이 어떤 직업적 성취보다 중요하다.",                  en:"Work-life balance is more important to me than any career achievement.",               ja:"仕事とプライベートのバランスが、どんな職業的成果よりも重要だ。" },
  { id:18, key:"balance",       ko:"개인 시간과 취미 활동이 충분히 보장되지 않으면 번아웃이 온다.",             en:"Without enough personal time and hobbies, I burn out.",                               ja:"個人の時間と趣味活動が十分に確保されないと燃え尽きる。" },
  { id:19, key:"compensation",  ko:"높은 급여와 좋은 복리후생이 커리어 선택에서 가장 중요한 요소 중 하나다.",    en:"High salary and good benefits are one of the most important factors in career choices.", ja:"高い給与と充実した福利厚生が、キャリア選択で最も重要な要素の一つだ。" },
  { id:20, key:"compensation",  ko:"재정적 보상이 충분하지 않으면 일에서 장기적 만족감을 느끼기 어렵다.",        en:"Without sufficient financial compensation, long-term job satisfaction is hard.",        ja:"財政的報酬が十分でないと、仕事での長期的な満足感を得ることが難しい。" },
];

const VALUE_INFO: Record<ValueKey, { emoji:string; ko:{name:string;desc:string;jobs:string}; en:{name:string;desc:string;jobs:string}; ja:{name:string;desc:string;jobs:string} }> = {
  autonomy:     { emoji:"🦅", ko:{name:"자율성",    desc:"스스로 결정하고 내 방식대로 일하는 것이 가장 중요합니다.",             jobs:"프리랜서, 스타트업, 연구직, 컨설턴트"},
                               en:{name:"Autonomy",   desc:"Making your own decisions and working your own way matters most.",   jobs:"Freelancer, startup, researcher, consultant"},
                               ja:{name:"自律性",    desc:"自分で決定し、自分のやり方で仕事することが最も重要です。",             jobs:"フリーランス、スタートアップ、研究職、コンサルタント"} },
  creativity:   { emoji:"🎨", ko:{name:"창의성",    desc:"새로운 것을 만들고 창의적으로 생각하는 환경에서 빛납니다.",             jobs:"디자이너, 기획자, 마케터, 예술가"},
                               en:{name:"Creativity",  desc:"You shine in environments where you create new things and think creatively.", jobs:"Designer, planner, marketer, artist"},
                               ja:{name:"創造性",    desc:"新しいものを作り、創造的に考える環境で輝きます。",                     jobs:"デザイナー、プランナー、マーケター、アーティスト"} },
  security:     { emoji:"🏠", ko:{name:"안정성",    desc:"예측 가능하고 안정적인 환경에서 최고의 능력을 발휘합니다.",              jobs:"공무원, 대기업, 금융직, 교사"},
                               en:{name:"Security",    desc:"You perform best in predictable, stable environments.",              jobs:"Civil servant, large corporation, finance, teacher"},
                               ja:{name:"安定性",    desc:"予測可能で安定した環境で最高のパフォーマンスを発揮します。",            jobs:"公務員、大企業、金融職、教師"} },
  recognition:  { emoji:"🏆", ko:{name:"인정욕구",  desc:"성과를 인정받고 사회적으로 눈에 띄는 위치를 원합니다.",                jobs:"세일즈, 경영자, 연예인, 정치인"},
                               en:{name:"Recognition", desc:"You want your work recognized and to be visible in a social context.", jobs:"Sales, executive, entertainer, politician"},
                               ja:{name:"承認欲求",  desc:"成果を認められ、社会的に目立つ立場を望んでいます。",                  jobs:"セールス、経営者、エンターテイナー、政治家"} },
  relationships: { emoji:"🤝", ko:{name:"관계",      desc:"동료와의 유대감과 팀워크에서 일의 의미를 찾습니다.",                   jobs:"HR, 상담사, 교육자, 팀 리더"},
                               en:{name:"Relationships", desc:"You find meaning in work through bonds with colleagues and teamwork.", jobs:"HR, counselor, educator, team leader"},
                               ja:{name:"人間関係",  desc:"同僚との絆とチームワークに仕事の意味を見出します。",                    jobs:"HR、カウンセラー、教育者、チームリーダー"} },
  impact:       { emoji:"🌍", ko:{name:"사회적 영향", desc:"내 일이 세상에 실질적인 변화를 만든다는 확신이 동기부여가 됩니다.",     jobs:"NGO, 의료, 교육, 사회적 기업"},
                               en:{name:"Impact",      desc:"Being convinced that your work makes real change in the world motivates you.", jobs:"NGO, healthcare, education, social enterprise"},
                               ja:{name:"社会的影響", desc:"自分の仕事が世界に実質的な変化をもたらすという確信がモチベーションになります。", jobs:"NGO、医療、教育、社会的企業"} },
  learning:     { emoji:"📚", ko:{name:"학습·성장",  desc:"끊임없이 배우고 성장하는 환경이 삶의 핵심입니다.",                    jobs:"연구원, 컨설턴트, 기술직, 학계"},
                               en:{name:"Learning",    desc:"An environment of continuous learning and growth is core to your life.",  jobs:"Researcher, consultant, tech professional, academia"},
                               ja:{name:"学習・成長", desc:"絶え間なく学び成長する環境が人生の核心です。",                          jobs:"研究員、コンサルタント、技術職、学界"} },
  leadership:   { emoji:"👑", ko:{name:"리더십",    desc:"이끄는 역할에서 동기를 얻고 영향력을 발휘하고 싶습니다.",               jobs:"관리직, CEO, 군인, 정치인"},
                               en:{name:"Leadership",  desc:"You're motivated by leading roles and want to exert influence.",         jobs:"Manager, CEO, military, politician"},
                               ja:{name:"リーダーシップ", desc:"リードする役割からモチベーションを得て、影響力を発揮したいと思っています。", jobs:"管理職、CEO、軍人、政治家"} },
  balance:      { emoji:"⚖️", ko:{name:"워라밸",    desc:"일과 삶의 균형이 커리어에서 협상 불가능한 조건입니다.",                jobs:"재택근무, 공공기관, 파트타임 전문직"},
                               en:{name:"Work-Life Balance", desc:"Work-life balance is a non-negotiable condition in your career.",  jobs:"Remote work, public institution, part-time professional"},
                               ja:{name:"ワークライフバランス", desc:"仕事と生活のバランスがキャリアで交渉不可能な条件です。",       jobs:"在宅勤務、公共機関、パートタイム専門職"} },
  compensation: { emoji:"💰", ko:{name:"보상·급여",  desc:"재정적 보상이 동기부여의 핵심 요소입니다.",                           jobs:"금융, 투자, 세일즈, 전문직"},
                               en:{name:"Compensation", desc:"Financial reward is a key motivating factor for you.",                  jobs:"Finance, investment, sales, professional"},
                               ja:{name:"報酬・給与", desc:"財政的報酬がモチベーションの核心要素です。",                            jobs:"金融、投資、セールス、専門職"} },
};

const UI_TEXT = {
  ko:{ title:"직업가치관 테스트",subtitle:"10가지 가치관 중 내가 가장 중요시하는 것을 찾아보세요",progress:(n:number,t:number)=>`${n}/${t}`,scale:["전혀","아님","보통","그렇다","매우"],resultTitle:"나의 핵심 직업가치관",topLabel:"1순위 가치",jobsLabel:"추천 직업군",retryBtn:"다시 하기",nextBtn:"다음",prevBtn:"이전",submitBtn:"결과 보기" },
  en:{ title:"Career Values Test",subtitle:"Discover what you value most among 10 career values",progress:(n:number,t:number)=>`${n}/${t}`,scale:["Not","Slightly","Moderate","Mostly","Very"],resultTitle:"My Core Career Values",topLabel:"#1 Value",jobsLabel:"Recommended Careers",retryBtn:"Retake",nextBtn:"Next",prevBtn:"Back",submitBtn:"See Results" },
  ja:{ title:"職業価値観テスト",subtitle:"10つの価値観の中で最も重要視するものを見つけましょう",progress:(n:number,t:number)=>`${n}/${t}`,scale:["全く","ない","普通","そう","非常に"],resultTitle:"私の核心職業価値観",topLabel:"第1位の価値",jobsLabel:"おすすめ職業群",retryBtn:"もう一度",nextBtn:"次へ",prevBtn:"前へ",submitBtn:"結果を見る" },
};

export default function CareerValuesTest({ locale = "ko" }: Props) {
  const lang: Lang = locale === "ja" ? "ja" : locale === "en" ? "en" : "ko";
  const ui = UI_TEXT[lang];
  const total = QUESTIONS.length;

  const [answers, setAnswers] = useState<Record<number,number>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ top:ValueKey[]; scores:Record<ValueKey,number> }|null>(null);

  const current = step - 1;
  const q = QUESTIONS[current];
  const progress = Math.round((Object.keys(answers).length / total) * 100);

  function answer(score: number) {
    const newAns = { ...answers, [q.id]: score };
    setAnswers(newAns);
    if (step < total) setStep(s => s + 1);
    else calc(newAns);
  }

  function calc(ans: Record<number,number>) {
    const scores = {} as Record<ValueKey,number>;
    for (const q of QUESTIONS) {
      if (!(q.key in scores)) scores[q.key as ValueKey] = 0;
      scores[q.key as ValueKey] += (ans[q.id] ?? 3);
    }
    const top = (Object.entries(scores) as [ValueKey,number][]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
    setResult({ top, scores });
    setStep(total + 1);
  }

  function submit() {
    const filled = { ...answers };
    for (const qq of QUESTIONS) if (!(qq.id in filled)) filled[qq.id] = 3;
    calc(filled);
  }

  function reset() { setAnswers({}); setStep(0); setResult(null); }

  if (step === 0) return (
    <div className="max-w-xl mx-auto p-4 text-center">
      <div className="text-4xl mb-3">🎯</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{ui.title}</h2>
      <p className="text-sm text-gray-500 mb-6">{ui.subtitle}</p>
      <div className="grid grid-cols-5 gap-2 mb-6 text-center text-xs text-gray-500">
        {(Object.entries(VALUE_INFO) as [ValueKey, typeof VALUE_INFO[ValueKey]][]).slice(0,10).map(([key, info]) => (
          <div key={key} className="bg-gray-50 rounded-xl p-2">
            <div className="text-xl">{info.emoji}</div>
            <div>{info[lang].name}</div>
          </div>
        ))}
      </div>
      <button onClick={() => setStep(1)} className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all">
        시작하기 →
      </button>
    </div>
  );

  if (result) {
    const maxScore = Math.max(...Object.values(result.scores));
    return (
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <h2 className="text-xl font-bold text-center text-gray-800">{ui.resultTitle}</h2>

        {result.top.map((key, i) => {
          const info = VALUE_INFO[key][lang];
          return (
            <div key={key} className={`rounded-2xl border-2 p-4 ${i===0 ? "bg-teal-50 border-teal-300" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{VALUE_INFO[key].emoji}</span>
                <div>
                  <p className={`font-bold text-lg ${i===0 ? "text-teal-800" : "text-gray-700"}`}>{i+1}. {info.name}</p>
                  {i===0 && <p className="text-xs text-teal-600">{ui.topLabel}</p>}
                </div>
                <div className="ml-auto text-sm font-bold text-gray-500">
                  {result.scores[key]} pt
                </div>
              </div>
              <p className={`text-sm mb-2 ${i===0 ? "text-teal-700" : "text-gray-600"}`}>{info.desc}</p>
              <p className="text-xs text-gray-500">💼 {ui.jobsLabel}: {info.jobs}</p>
            </div>
          );
        })}

        {/* Bar chart of all values */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          {(Object.entries(result.scores) as [ValueKey,number][]).sort((a,b)=>b[1]-a[1]).map(([key,score]) => (
            <div key={key} className="mb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                <span>{VALUE_INFO[key].emoji} {VALUE_INFO[key][lang].name}</span>
                <span>{score}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-teal-400 transition-all" style={{width:`${(score/maxScore)*100}%`}} />
              </div>
            </div>
          ))}
        </div>

        <button onClick={reset} className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">{ui.retryBtn}</button>
      </div>
    );
  }

  const qText = q ? (lang==="ja" ? q.ja : lang==="en" ? q.en : q.ko) : "";
  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{ui.progress(step, total)}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-teal-400 transition-all" style={{width:`${progress}%`}} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 min-h-[90px] flex items-center">
        <p className="text-base text-gray-800 leading-relaxed">{qText}</p>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => answer(n)}
            className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all
              ${answers[q?.id] === n ? "bg-teal-600 border-teal-600 text-white scale-105" : "bg-white border-gray-100 hover:border-teal-300 text-gray-600"}`}>
            <span className="text-lg font-bold">{n}</span>
            <span className="text-[9px] mt-0.5 hidden sm:block">{ui.scale[n-1]}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {step > 1 && <button onClick={() => setStep(s => s-1)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">← {ui.prevBtn}</button>}
        {step === total && <button onClick={submit} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold">{ui.submitBtn} →</button>}
      </div>
    </div>
  );
}
