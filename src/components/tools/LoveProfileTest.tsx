import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props { locale?: Locale; }
type Lang = "ko"|"en"|"ja";

// ─── Attachment Styles ────────────────────────────────────────────────────────
type AttachType = "secure"|"anxious"|"avoidant"|"disorganized";
type LoveLang = "words"|"acts"|"gifts"|"time"|"touch";
type ConflictStyle = "collaborate"|"compromise"|"accommodate"|"avoid"|"compete";

// ─── Questions ────────────────────────────────────────────────────────────────
// Section A: Attachment (8 questions, 2 per type)
// Section B: Love Language (10 questions, 2 per lang)
// Section C: Conflict Style (10 questions, 2 per style)

interface QSection { id: number; section: "A"|"B"|"C"; key: string; ko: string; en: string; ja: string; }

const QUESTIONS: QSection[] = [
  // A: Attachment
  { id:1,  section:"A", key:"secure",       ko:"관계에서 신뢰를 주고받는 것이 자연스럽고 편안하다.",               en:"Giving and receiving trust in relationships feels natural and comfortable.",             ja:"関係で信頼を与え合うことが自然で安心だ。" },
  { id:2,  section:"A", key:"secure",       ko:"파트너와 갈등이 생겨도 대화로 해결할 수 있다는 믿음이 있다.",         en:"When conflict arises, I trust we can resolve it through conversation.",                  ja:"パートナーと対立が生じても、話し合いで解決できるという信頼がある。" },
  { id:3,  section:"A", key:"anxious",      ko:"파트너가 나를 충분히 사랑하지 않을까봐 자주 걱정된다.",               en:"I often worry that my partner doesn't love me enough.",                                ja:"パートナーが私を十分に愛していないのではと頻繁に心配する。" },
  { id:4,  section:"A", key:"anxious",      ko:"파트너가 연락이 없으면 버려지는 것이 아닌지 불안해진다.",              en:"When my partner doesn't respond, I feel anxious about being abandoned.",                 ja:"パートナーから連絡がないと、見捨てられるのではないかと不安になる。" },
  { id:5,  section:"A", key:"avoidant",     ko:"관계가 깊어질수록 오히려 거리감이 필요하다는 느낌이 든다.",            en:"The deeper the relationship gets, the more I feel I need distance.",                    ja:"関係が深まるほど、むしろ距離が必要だという感覚がある。" },
  { id:6,  section:"A", key:"avoidant",     ko:"파트너에게 내 감정을 깊이 표현하는 것이 불편하다.",                   en:"I feel uncomfortable deeply sharing my emotions with my partner.",                      ja:"パートナーに感情を深く表現することが不快だ。" },
  { id:7,  section:"A", key:"disorganized", ko:"관계에서 친밀함을 원하면서도 동시에 두렵다.",                         en:"I want closeness in relationships but also fear it at the same time.",                  ja:"関係で親密さを望みながら、同時に恐れている。" },
  { id:8,  section:"A", key:"disorganized", ko:"관계에서 예측 불가능한 패턴이 반복되어 혼란스러울 때가 있다.",          en:"I sometimes feel confused by unpredictable patterns that repeat in my relationships.",  ja:"関係で予測不可能なパターンが繰り返されて混乱することがある。" },
  // B: Love Language
  { id:9,  section:"B", key:"words",  ko:"파트너의 칭찬과 격려, 사랑의 말이 가장 크게 와 닿는다.",              en:"My partner's compliments, encouragement, and words of love mean the most to me.",      ja:"パートナーの褒め言葉や励まし、愛の言葉が最も心に響く。" },
  { id:10, section:"B", key:"words",  ko:"'사랑해', '잘했어' 같은 언어적 표현이 없으면 허전함을 느낀다.",          en:"Without verbal expressions like 'I love you' or 'Well done,' I feel empty.",           ja:"「愛してる」「よくやった」などの言語表現がないと空虚に感じる。" },
  { id:11, section:"B", key:"acts",   ko:"파트너가 내 일을 도와주거나 먼저 챙겨줄 때 사랑을 가장 크게 느낀다.",       en:"I feel most loved when my partner helps me or takes care of things for me.",            ja:"パートナーが私の仕事を手伝ってくれたり、先に気にかけてくれると最も愛を感じる。" },
  { id:12, section:"B", key:"acts",   ko:"행동으로 보여주지 않으면 말만으로는 믿기 어렵다.",                      en:"Without action to back it up, words alone are hard to believe.",                       ja:"行動で示してくれなければ、言葉だけでは信じにくい。" },
  { id:13, section:"B", key:"gifts",  ko:"특별한 선물이나 기억에 남는 이벤트가 관계에 의미를 더해준다.",               en:"Special gifts or memorable events add meaning to the relationship.",                    ja:"特別なプレゼントや思い出に残るイベントが関係に意味を加えてくれる。" },
  { id:14, section:"B", key:"gifts",  ko:"파트너가 나를 생각하며 고른 선물은 아무리 작아도 감동적이다.",              en:"A gift chosen with me in mind moves me deeply, no matter how small.",                   ja:"パートナーが私のことを考えて選んだプレゼントは、どんなに小さくても感動的だ。" },
  { id:15, section:"B", key:"time",   ko:"파트너와 함께하는 온전한 시간이 가장 소중하다.",                        en:"Quality time spent fully with my partner is what I treasure most.",                     ja:"パートナーとともに過ごす充実した時間が最も大切だ。" },
  { id:16, section:"B", key:"time",   ko:"파트너가 다른 것에 집중하며 시간을 보내면 상처를 받는다.",                  en:"I feel hurt when my partner is distracted and not fully present with me.",              ja:"パートナーが他のことに集中して時間を過ごすと傷つく。" },
  { id:17, section:"B", key:"touch",  ko:"포옹, 손잡기 같은 신체 접촉이 감정적 연결을 가장 잘 만들어준다.",           en:"Physical touch like hugs and holding hands creates the best emotional connection.",     ja:"ハグや手をつなぐなどの身体的接触が、最も感情的なつながりを生み出す。" },
  { id:18, section:"B", key:"touch",  ko:"파트너의 스킨십이 줄면 관계가 소원해지는 것처럼 느껴진다.",                 en:"When my partner's physical affection decreases, I feel like we're growing apart.",       ja:"パートナーのスキンシップが減ると、関係が疎遠になっているように感じる。" },
  // C: Conflict Style
  { id:19, section:"C", key:"collaborate", ko:"갈등이 생기면 서로 모두 만족할 수 있는 해결책을 찾으려 한다.",            en:"When conflict arises, I try to find a solution that satisfies both of us.",             ja:"対立が生じたら、お互いが満足できる解決策を見つけようとする。" },
  { id:20, section:"C", key:"collaborate", ko:"문제의 근본 원인을 이해하고 함께 해결하는 것이 중요하다.",               en:"Understanding the root cause of a problem and solving it together is important.",        ja:"問題の根本原因を理解し、一緒に解決することが重要だ。" },
  { id:21, section:"C", key:"compromise",  ko:"갈등 시 서로 일부씩 양보해서 중간 지점을 찾는 편이다.",                 en:"In conflict, I tend to find a middle ground where we both give a little.",               ja:"対立の際は、互いに少し譲り合って中間点を見つける傾向がある。" },
  { id:22, section:"C", key:"compromise",  ko:"완벽한 해결보다 빠른 타협이 더 실용적이라고 생각한다.",                 en:"Quick compromise is more practical than a perfect solution.",                           ja:"完璧な解決策より、素早い妥協の方が現実的だと思う。" },
  { id:23, section:"C", key:"accommodate", ko:"갈등을 피하기 위해 내 주장을 포기하고 상대방의 의견을 따를 때가 많다.",    en:"To avoid conflict, I often give up my position and go along with the other person.",    ja:"対立を避けるため、自分の主張を諦めて相手の意見に従うことが多い。" },
  { id:24, section:"C", key:"accommodate", ko:"관계 유지를 위해 내가 손해 보는 것도 괜찮다고 생각한다.",               en:"I think it's okay to lose something for the sake of maintaining the relationship.",      ja:"関係を維持するために、自分が損をしても構わないと思う。" },
  { id:25, section:"C", key:"avoid",       ko:"갈등이 생기면 일단 그 상황에서 벗어나거나 시간이 해결해주길 기다린다.",    en:"When conflict arises, I tend to step away or wait for time to resolve it.",             ja:"対立が生じると、その状況から離れたり、時間が解決してくれるのを待つ傾向がある。" },
  { id:26, section:"C", key:"avoid",       ko:"갈등 주제를 직접 다루기보다 화제를 돌리거나 무시하는 편이다.",            en:"I tend to change the subject or ignore conflict rather than addressing it directly.",    ja:"対立の話題を直接扱うより、話題を変えたり無視したりする傾向がある。" },
  { id:27, section:"C", key:"compete",     ko:"갈등 시 내 입장이 옳다고 생각하며 관철시키려는 경향이 있다.",             en:"In conflict, I tend to believe my position is right and try to prevail.",               ja:"対立の際、自分の立場が正しいと考えて貫こうとする傾向がある。" },
  { id:28, section:"C", key:"compete",     ko:"협상에서 최선의 결과를 얻기 위해 강하게 주장하는 것이 필요하다.",          en:"Strongly asserting myself is necessary to get the best outcome in negotiations.",        ja:"交渉で最善の結果を得るためには、強く主張することが必要だ。" },
];

// ─── Result Descriptions ──────────────────────────────────────────────────────
const ATTACH_DESC: Record<AttachType, Record<Lang, { name:string; desc:string; tip:string }>> = {
  secure:      { ko:{name:"안정 애착",      desc:"관계에서 자연스러운 신뢰와 편안함을 느낍니다. 갈등도 대화로 해결할 수 있다는 믿음이 있습니다.",        tip:"현재의 안정감을 유지하며 파트너에게도 안전한 기반이 되어주세요."},
                 en:{name:"Secure",         desc:"You feel natural trust and comfort in relationships and believe conflicts can be resolved through dialogue.", tip:"Maintain your current stability and be a secure base for your partner."},
                 ja:{name:"安定型",         desc:"関係で自然な信頼と安心感を覚えます。対立も対話で解決できるという信念があります。",               tip:"現在の安定感を保ち、パートナーにとっても安全な基盤になりましょう。"} },
  anxious:     { ko:{name:"불안 애착",      desc:"파트너의 애정을 끊임없이 확인하고 싶은 욕구가 강합니다. 버려짐에 대한 두려움이 클 수 있습니다.",       tip:"자기 자신에게 안정감의 근원을 찾는 연습을 해보세요."},
                 en:{name:"Anxious",        desc:"You have a strong need to constantly confirm your partner's affection and may have a strong fear of abandonment.", tip:"Practice finding the source of security within yourself."},
                 ja:{name:"不安型",         desc:"パートナーの愛情を絶えず確認したい欲求が強く、見捨てられることへの恐れが大きい場合があります。", tip:"自分自身に安定感の源を見つける練習をしてみましょう。"} },
  avoidant:    { ko:{name:"회피 애착",      desc:"친밀감이 깊어질수록 불편함을 느끼고 독립성을 지키려는 경향이 강합니다.",                            tip:"감정 표현이 약점이 아닌 강함의 일부임을 기억하세요."},
                 en:{name:"Avoidant",       desc:"The deeper the intimacy, the more discomfort you feel, with a strong tendency to maintain independence.",   tip:"Remember that expressing emotions is not weakness but part of strength."},
                 ja:{name:"回避型",         desc:"親密さが深まるほど不快感を感じ、独立性を保とうとする傾向が強い。",                                   tip:"感情表現は弱さではなく、強さの一部であることを覚えておきましょう。"} },
  disorganized:{ ko:{name:"혼란 애착",      desc:"친밀함을 원하면서도 두려운 양가적 감정을 경험합니다. 관계에서 예측 불가능한 패턴이 나타날 수 있습니다.", tip:"전문가의 도움을 통해 내면의 패턴을 이해하는 것이 큰 도움이 됩니다."},
                 en:{name:"Disorganized",   desc:"You experience ambivalent feelings of wanting closeness while also fearing it. Unpredictable patterns may appear in relationships.", tip:"Professional guidance can greatly help you understand your internal patterns."},
                 ja:{name:"混乱型",         desc:"親密さを望みながら恐れるという両価的な感情を経験します。関係で予測不可能なパターンが現れることがあります。", tip:"専門家の助けを借りて内面のパターンを理解することが大いに役立ちます。"} },
};

const LOVELANG_DESC: Record<LoveLang, Record<Lang, { name:string; desc:string }>> = {
  words:  { ko:{name:"인정의 말",      desc:"칭찬과 격려, 사랑의 말이 가장 큰 에너지를 줍니다. 언어적 표현이 풍부한 환경에서 행복합니다."},      en:{name:"Words of Affirmation", desc:"Compliments, encouragement, and words of love energize you most."},         ja:{name:"肯定の言葉",     desc:"褒め言葉、励まし、愛の言葉が最もエネルギーをくれます。"} },
  acts:   { ko:{name:"봉사 행위",      desc:"파트너의 실질적인 도움과 배려가 사랑으로 느껴집니다. 말보다 행동을 중요시합니다."},                    en:{name:"Acts of Service",      desc:"Your partner's practical help and care feel like love to you. You value action over words."}, ja:{name:"奉仕の行為",     desc:"パートナーの実質的な助けと配慮が愛として感じられます。"} },
  gifts:  { ko:{name:"선물",          desc:"나를 생각하며 선택한 선물이나 이벤트가 관계에 의미를 더해줍니다."},                                    en:{name:"Receiving Gifts",      desc:"Gifts and events chosen with you in mind add meaning to the relationship."},  ja:{name:"贈り物",         desc:"あなたのことを考えて選ばれたプレゼントやイベントが関係に意味を加えます。"} },
  time:   { ko:{name:"함께하는 시간",  desc:"온전히 집중하며 함께하는 시간이 가장 소중합니다. 산만한 주의는 상처가 됩니다."},                        en:{name:"Quality Time",         desc:"Time spent fully focused together is what you treasure most."},              ja:{name:"充実した時間",   desc:"完全に集中して一緒に過ごす時間が最も大切です。"} },
  touch:  { ko:{name:"신체 접촉",     desc:"포옹, 손잡기 등 신체적 스킨십이 가장 강력한 감정적 연결을 만들어냅니다."},                              en:{name:"Physical Touch",       desc:"Physical touch like hugs and holding hands creates the strongest emotional connection."}, ja:{name:"身体的接触",     desc:"ハグや手をつなぐなどの身体的スキンシップが最強の感情的つながりを生み出します。"} },
};

const CONFLICT_DESC: Record<ConflictStyle, Record<Lang, { name:string; desc:string; tip:string }>> = {
  collaborate: { ko:{name:"협력형",  desc:"갈등의 근본 원인을 파악하고 모두가 만족하는 해결책을 추구합니다.",              tip:"최선의 갈등 해결 스타일이지만 항상 가능한 것은 아닙니다. 때로는 타협도 필요합니다."},
                 en:{name:"Collaborative", desc:"You seek to understand the root cause and find solutions that satisfy everyone.", tip:"This is the best conflict style, but not always possible — sometimes compromise is needed."},
                 ja:{name:"協力型",  desc:"対立の根本原因を把握し、全員が満足できる解決策を追求します。",                  tip:"最善の対立解決スタイルですが、常に可能とは限りません。時には妥協も必要です。"} },
  compromise:  { ko:{name:"타협형",  desc:"서로 양보하여 현실적인 중간 해결책을 찾습니다.",                            tip:"효율적이지만 양측 모두 완전히 만족하지 못할 수 있습니다."},
                 en:{name:"Compromising", desc:"You find a realistic middle ground through mutual concession.",               tip:"Efficient, but both sides may not be fully satisfied."},
                 ja:{name:"妥協型",  desc:"互いに譲歩して現実的な中間解決策を見つけます。",                              tip:"効率的ですが、双方が完全に満足できないこともあります。"} },
  accommodate: { ko:{name:"수용형",  desc:"관계 유지를 위해 자신의 주장을 양보하는 경향이 있습니다.",                    tip:"자신의 필요를 표현하는 연습이 건강한 관계를 만듭니다."},
                 en:{name:"Accommodating", desc:"You tend to give up your position to maintain the relationship.",           tip:"Practicing expressing your own needs creates healthier relationships."},
                 ja:{name:"受容型",  desc:"関係を維持するために自分の主張を譲る傾向があります。",                          tip:"自分のニーズを表現する練習が健全な関係を作ります。"} },
  avoid:       { ko:{name:"회피형",  desc:"갈등 상황에서 직접 대면보다 시간이 해결해주길 기다리는 경향이 있습니다.",       tip:"피하는 것은 일시적 해결책. 핵심 문제는 결국 반드시 다뤄야 합니다."},
                 en:{name:"Avoiding", desc:"You tend to wait for time to resolve conflict rather than direct confrontation.",   tip:"Avoiding is a temporary fix. Core issues must ultimately be addressed."},
                 ja:{name:"回避型",  desc:"対立状況で直接対面するより、時間が解決してくれるのを待つ傾向があります。",       tip:"回避は一時的な解決策。核心問題は最終的に必ず対処しなければなりません。"} },
  compete:     { ko:{name:"경쟁형",  desc:"자신의 입장을 관철시키는 것이 중요합니다. 강한 주장과 결단력이 특징입니다.",     tip:"승리보다 관계가 중요할 때가 많습니다. 언제 양보할지를 배우세요."},
                 en:{name:"Competing", desc:"Prevailing with your position is important. Strong assertion and decisiveness are your hallmarks.", tip:"Relationships matter more than winning. Learn when to concede."},
                 ja:{name:"競争型",  desc:"自分の立場を貫くことが重要です。強い主張と決断力が特徴です。",                   tip:"勝利より関係が重要な場面も多いです。いつ譲るかを学びましょう。"} },
};

const UI_TEXT = {
  ko: { title:"통합 연애 프로파일러", subtitle:"애착유형 · 사랑언어 · 갈등방식으로 나의 연애 스타일을 분석합니다",
    sections:{ A:"섹션 A: 애착 유형 (8문항)", B:"섹션 B: 사랑의 언어 (10문항)", C:"섹션 C: 갈등 방식 (10문항)" },
    progress:(n:number,t:number)=>`${n}/${t}`,
    scale:["전혀 아님","아님","보통","그렇다","매우 그렇다"],
    resultTitle:"나의 연애 프로필",
    attachLabel:"애착 유형", loveLabel:"주요 사랑의 언어", conflictLabel:"갈등 방식",
    retryBtn:"다시 테스트", nextBtn:"다음", prevBtn:"이전", submitBtn:"결과 보기",
  },
  en: { title:"Love Profile Test", subtitle:"Analyze your relationship style through Attachment · Love Language · Conflict Style",
    sections:{ A:"Section A: Attachment Style (8 items)", B:"Section B: Love Language (10 items)", C:"Section C: Conflict Style (10 items)" },
    progress:(n:number,t:number)=>`${n}/${t}`,
    scale:["Not at all","Slightly","Moderate","Mostly","Very much"],
    resultTitle:"My Love Profile",
    attachLabel:"Attachment Style", loveLabel:"Primary Love Language", conflictLabel:"Conflict Style",
    retryBtn:"Retake", nextBtn:"Next", prevBtn:"Back", submitBtn:"See Results",
  },
  ja: { title:"統合恋愛プロファイラー", subtitle:"애착유형 · 愛の言語 · 갈등방식で恋愛スタイルを分析します",
    sections:{ A:"セクションA: 애착유형 (8問)", B:"セクションB: 愛の言語 (10問)", C:"セクションC: 葛藤方式 (10問)" },
    progress:(n:number,t:number)=>`${n}/${t}`,
    scale:["全くない","ない","普通","そう","非常にそう"],
    resultTitle:"私の恋愛プロフィール",
    attachLabel:"애착유형", loveLabel:"主な愛の言語", conflictLabel:"葛藤方式",
    retryBtn:"もう一度", nextBtn:"次へ", prevBtn:"前へ", submitBtn:"結果を見る",
  },
};

function calcScores(answers: Record<number,number>) {
  const attach: Record<AttachType,number> = {secure:0,anxious:0,avoidant:0,disorganized:0};
  const love:   Record<LoveLang,number>   = {words:0,acts:0,gifts:0,time:0,touch:0};
  const conf:   Record<ConflictStyle,number> = {collaborate:0,compromise:0,accommodate:0,avoid:0,compete:0};

  for (const q of QUESTIONS) {
    const score = answers[q.id] ?? 3;
    if (q.section === "A") attach[q.key as AttachType] += score;
    if (q.section === "B") love[q.key as LoveLang] += score;
    if (q.section === "C") conf[q.key as ConflictStyle] += score;
  }

  const topAttach = (Object.entries(attach) as [AttachType,number][]).sort((a,b)=>b[1]-a[1])[0][0];
  const topLove   = (Object.entries(love)   as [LoveLang,number][]).sort((a,b)=>b[1]-a[1])[0][0];
  const topConf   = (Object.entries(conf)   as [ConflictStyle,number][]).sort((a,b)=>b[1]-a[1])[0][0];

  return { attach: topAttach, love: topLove, conflict: topConf };
}

const ATTACH_EMOJI: Record<AttachType,string> = {secure:"🔐",anxious:"😰",avoidant:"🚪",disorganized:"🌀"};
const LOVE_EMOJI:   Record<LoveLang,string>   = {words:"💬",acts:"🛠️",gifts:"🎁",time:"⏰",touch:"🤝"};
const CONF_EMOJI:   Record<ConflictStyle,string> = {collaborate:"🤝",compromise:"⚖️",accommodate:"🕊️",avoid:"🏃",compete:"🥊"};

export default function LoveProfileTest({ locale = "ko" }: Props) {
  const lang: Lang = locale === "ja" ? "ja" : locale === "en" ? "en" : "ko";
  const ui = UI_TEXT[lang];
  const total = QUESTIONS.length;

  const [answers, setAnswers] = useState<Record<number,number>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{attach:AttachType; love:LoveLang; conflict:ConflictStyle}|null>(null);

  const current = step - 1;
  const q = QUESTIONS[current];
  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / total) * 100);

  function answer(score: number) {
    const newAns = { ...answers, [q.id]: score };
    setAnswers(newAns);
    if (step < total) setStep(s => s + 1);
    else { setResult(calcScores(newAns)); setStep(total + 1); }
  }

  function submit() {
    const filled = { ...answers };
    for (const qq of QUESTIONS) if (!(qq.id in filled)) filled[qq.id] = 3;
    setResult(calcScores(filled));
    setStep(total + 1);
  }

  function reset() { setAnswers({}); setStep(0); setResult(null); }

  if (step === 0) {
    return (
      <div className="max-w-xl mx-auto p-4 text-center">
        <div className="text-4xl mb-3">💑</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{ui.title}</h2>
        <p className="text-sm text-gray-500 mb-5">{ui.subtitle}</p>
        <div className="space-y-2 text-left mb-5">
          {(["A","B","C"] as const).map(s => (
            <div key={s} className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
              {s === "A" ? "🔐" : s === "B" ? "💬" : "⚡"} {ui.sections[s]}
            </div>
          ))}
        </div>
        <button
          onClick={() => setStep(1)}
          className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all"
        >
          시작하기 →
        </button>
      </div>
    );
  }

  if (result) {
    const ad = ATTACH_DESC[result.attach][lang];
    const ld = LOVELANG_DESC[result.love][lang];
    const cd = CONFLICT_DESC[result.conflict][lang];
    return (
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <h2 className="text-xl font-bold text-center text-gray-800">{ui.resultTitle}</h2>

        {/* Attach */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-600 mb-1">🔐 {ui.attachLabel}</p>
          <p className="font-bold text-blue-800 text-lg">{ATTACH_EMOJI[result.attach]} {ad.name}</p>
          <p className="text-sm text-blue-700 mt-1">{ad.desc}</p>
          <p className="text-xs text-blue-600 mt-2 italic">💡 {ad.tip}</p>
        </div>

        {/* Love Language */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-rose-600 mb-1">💝 {ui.loveLabel}</p>
          <p className="font-bold text-rose-800 text-lg">{LOVE_EMOJI[result.love]} {ld.name}</p>
          <p className="text-sm text-rose-700 mt-1">{ld.desc}</p>
        </div>

        {/* Conflict */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-600 mb-1">⚡ {ui.conflictLabel}</p>
          <p className="font-bold text-amber-800 text-lg">{CONF_EMOJI[result.conflict]} {cd.name}</p>
          <p className="text-sm text-amber-700 mt-1">{cd.desc}</p>
          <p className="text-xs text-amber-600 mt-2 italic">💡 {cd.tip}</p>
        </div>

        <button onClick={reset} className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          {ui.retryBtn}
        </button>
      </div>
    );
  }

  const sectionLabel = q?.section ? ui.sections[q.section] : "";
  const qText = q ? (lang === "ja" ? q.ja : lang === "en" ? q.en : q.ko) : "";

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span className="text-xs text-gray-500">{sectionLabel}</span>
          <span>{ui.progress(step, total)}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all" style={{width:`${progress}%`}} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 min-h-[90px] flex items-center">
        <p className="text-base text-gray-800 leading-relaxed">{qText}</p>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => answer(n)}
            className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all
              ${answers[q?.id] === n ? "bg-rose-600 border-rose-600 text-white scale-105" : "bg-white border-gray-100 hover:border-rose-300 text-gray-600"}`}>
            <span className="text-lg font-bold">{n}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {step > 1 && <button onClick={() => setStep(s => s-1)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">← {ui.prevBtn}</button>}
        {step === total && <button onClick={submit} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold">{ui.submitBtn} →</button>}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-gray-400">
        <span>1 = {ui.scale[0]}</span><span>5 = {ui.scale[4]}</span>
      </div>
    </div>
  );
}
