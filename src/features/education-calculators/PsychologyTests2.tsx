'use client';
import React, { useReducer } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Heart from 'lucide-react/dist/esm/icons/heart'
import Smile from 'lucide-react/dist/esm/icons/smile'
import Zap from 'lucide-react/dist/esm/icons/zap'
import Copy from 'lucide-react/dist/esm/icons/copy'
import Check from 'lucide-react/dist/esm/icons/check'
import Brain from 'lucide-react/dist/esm/icons/brain'
import Leaf from 'lucide-react/dist/esm/icons/leaf'
import Star from 'lucide-react/dist/esm/icons/star'
import Users from 'lucide-react/dist/esm/icons/users'
import Clock from 'lucide-react/dist/esm/icons/clock'
import Gift from 'lucide-react/dist/esm/icons/gift'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import HandHeart from 'lucide-react/dist/esm/icons/hand-heart'
import Moon from 'lucide-react/dist/esm/icons/moon';

// ─────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────
function ScoreBar({ label, value, max, colorClass }: { label: string; value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{pct}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{current} / {total}</span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  );
}

function ShareButton({ text, locale }: { text: string; locale: string }) {
  const [copied, setCopied] = React.useState(false);
  const label = locale === 'ja' ? 'コピー' : locale === 'en' ? 'Copy Result' : '결과 복사';
  const copiedLabel = locale === 'ja' ? 'コピー済み' : locale === 'en' ? 'Copied!' : '복사됨!';
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors px-3 py-1.5 border border-slate-200 rounded-full hover:bg-slate-50">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// LOVE LANGUAGE TEST
// ─────────────────────────────────────────────
type LLKey = 'W' | 'A' | 'G' | 'Q' | 'P';
interface LLState { step: number; scores: Record<LLKey, number>; done: boolean; }
type LLAction = { type: 'answer'; pick: LLKey } | { type: 'reset' };

const llQuestions: { ko: string; en: string; ja: string; opts: [{ text: { ko: string; en: string; ja: string }; key: LLKey }, { text: { ko: string; en: string; ja: string }; key: LLKey }] }[] = [
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '칭찬과 감사의 말 한마디', en: 'Words of praise and appreciation', ja: '感謝と称賛の言葉' }, key: 'W' }, { text: { ko: '온전히 함께하는 시간', en: 'Uninterrupted quality time', ja: '一緒に過ごすQualityな時間' }, key: 'Q' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '내가 힘들 때 직접 도와주는 행동', en: 'Helping me with tasks when I struggle', ja: '困ったとき助けてくれる行動' }, key: 'A' }, { text: { ko: '따뜻한 포옹이나 스킨십', en: 'Warm hugs or comforting touch', ja: '温かいハグや肌のふれあい' }, key: 'P' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '정성스럽게 고른 선물', en: 'A thoughtfully chosen gift', ja: '心を込めて選ばれたプレゼント' }, key: 'G' }, { text: { ko: '진심 어린 격려의 말', en: 'Sincere words of encouragement', ja: '心のこもった励ましの言葉' }, key: 'W' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '방해 없이 함께하는 시간', en: 'Focused time together without distractions', ja: '邪魔なく一緒に過ごす時間' }, key: 'Q' }, { text: { ko: '귀찮은 일을 대신 해주는 것', en: 'Taking care of my tasks', ja: '面倒なことを代わりにやってくれること' }, key: 'A' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '손을 잡거나 어깨를 두드려 주는 것', en: 'Holding hands or a comforting pat', ja: '手をつないだり肩を叩いてくれること' }, key: 'P' }, { text: { ko: '내 취향을 기억한 선물', en: 'A gift that shows you know me', ja: '私の好みを覚えていてくれたプレゼント' }, key: 'G' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '매일 건네는 따뜻한 말 한마디', en: 'A warm word every day', ja: '毎日かける温かい言葉' }, key: 'W' }, { text: { ko: '말보다 행동으로 보여주는 것', en: 'Showing love through actions', ja: '言葉より行動で示してくれること' }, key: 'A' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '핸드폰 없이 나만 바라보는 시간', en: "Their full attention, no phone", ja: 'スマホなしで私だけを見てくれる時間' }, key: 'Q' }, { text: { ko: '특별한 날 챙겨주는 선물', en: 'A gift on a special occasion', ja: '特別な日に贈ってくれるプレゼント' }, key: 'G' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '힘들 때 그냥 안아주는 것', en: "Just a hug when I'm struggling", ja: '辛いときにただ抱きしめてくれること' }, key: 'P' }, { text: { ko: '상처 받았을 때 위로의 말', en: 'Comforting words when hurt', ja: '傷ついたときの慰めの言葉' }, key: 'W' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '집안일을 먼저 나서서 도와주는 것', en: 'Volunteering to help with chores', ja: '家事を率先して手伝ってくれること' }, key: 'A' }, { text: { ko: '뜻밖에 받는 작은 선물', en: 'An unexpected small gift', ja: '思いがけない小さなプレゼント' }, key: 'G' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '자랑스럽다고 말해주는 것', en: "Telling me you're proud of me", ja: '誇りに思うと言ってくれること' }, key: 'W' }, { text: { ko: '어깨 위에 손을 올려주는 것', en: 'A hand on my shoulder', ja: '肩に手を置いてくれること' }, key: 'P' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '함께 산책하거나 드라이브 가는 것', en: 'A walk or drive together', ja: '一緒に散歩やドライブに行くこと' }, key: 'Q' }, { text: { ko: '내 짐을 들어주거나 심부름 해주는 것', en: 'Carrying my bags or running an errand', ja: '荷物を持ったり用事を代わってくれること' }, key: 'A' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '나를 생각하며 산 작은 기념품', en: 'A small souvenir they thought of me for', ja: '私を思って買った小さなお土産' }, key: 'G' }, { text: { ko: '등을 쓸어주는 따뜻한 터치', en: 'A gentle back rub', ja: '背中をさすってくれる温かいタッチ' }, key: 'P' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '사랑한다는 메시지', en: 'A love message', ja: '愛してるというメッセージ' }, key: 'W' }, { text: { ko: '전화 끊지 않고 함께 있어 주는 것', en: 'Staying on the call just to be with me', ja: '電話を切らずにそばにいてくれること' }, key: 'Q' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '내 걱정을 해결해 주는 행동', en: 'Solving a worry for me', ja: '私の悩みを解決してくれる行動' }, key: 'A' }, { text: { ko: '손잡고 눈 맞추는 것', en: 'Holding hands and making eye contact', ja: '手をつないで目を合わせてくれること' }, key: 'P' }] },
  { ko: '더 소중한 것은?', en: 'Which matters more?', ja: 'どちらが大切？',
    opts: [{ text: { ko: '내 취미를 위한 선물', en: 'A gift for my hobby', ja: '私の趣味へのプレゼント' }, key: 'G' }, { text: { ko: '잘하고 있다는 확신을 주는 말', en: "Words that reassure me I'm doing well", ja: 'うまくいっていると安心させてくれる言葉' }, key: 'W' }] },
];

const llMeta: Record<LLKey, { icon: React.ReactNode; ko: { name: string; desc: string; tip: string }; en: { name: string; desc: string; tip: string }; ja: { name: string; desc: string; tip: string }; color: string }> = {
  W: { icon: <MessageCircle className="w-8 h-8" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    ko: { name: '확언의 말 (Words)', desc: '칭찬, 감사, 격려의 말 한마디가 당신에게 큰 힘이 됩니다. 관계에서 표현되지 않는 감정보다 표현된 감정을 통해 사랑을 느낍니다.', tip: '파트너에게: 매일 작은 칭찬과 감사 메시지. 주의: 부정적인 말 한마디가 긍정적인 말 10개를 지울 수 있습니다.' },
    en: { name: 'Words of Affirmation', desc: 'Praise, gratitude, and encouragement fill your tank. You feel love through expressed emotion more than anything else.', tip: 'For your partner: daily small compliments and appreciation notes. Watch out: one harsh word can undo ten kind ones.' },
    ja: { name: '肯定的な言葉 (Words)', desc: '称賛、感謝、励ましの言葉があなたに大きな力を与えます。表現されない感情より、表現された感情で愛を感じます。', tip: 'パートナーへ: 毎日小さな褒め言葉と感謝のメッセージ。注意: 否定的な言葉一つが、肯定的な言葉10個を消し去ることがあります。' } },
  A: { icon: <HandHeart className="w-8 h-8" />, color: 'text-rose-600 bg-rose-50 border-rose-200',
    ko: { name: '봉사 행동 (Acts)', desc: '말보다 행동이 진심이라고 느끼며, 상대방이 실질적으로 도움을 줄 때 사랑받는다고 느낍니다.', tip: '파트너에게: 부탁하기 전에 먼저 도움, 귀찮은 일 대신 해주기. 주의: 상대방도 같은 언어라면 과부하가 걸릴 수 있습니다.' },
    en: { name: 'Acts of Service', desc: "Actions speak louder than words for you. You feel most loved when someone steps in to help without being asked.", tip: 'For your partner: anticipate needs and act on them. Watch out: if both partners share this language, burnout is possible.' },
    ja: { name: '奉仕の行為 (Acts)', desc: '言葉より行動が本心だと感じ、相手が実際に助けてくれるときに愛されていると感じます。', tip: 'パートナーへ: お願いする前に先に助けてくれること。注意: 相手も同じ言語なら、過負荷になる可能性があります。' } },
  G: { icon: <Gift className="w-8 h-8" />, color: 'text-amber-600 bg-amber-50 border-amber-200',
    ko: { name: '선물 받기 (Gifts)', desc: '선물의 가격이 아닌 "기억했다는 사실"에 감동을 받습니다. 평범한 날의 뜬금없는 선물이 가장 큰 의미입니다.', tip: '파트너에게: 당신의 취향을 기억하고 표현하는 작은 선물. 주의: 선물을 잊는 것이 사랑이 없다는 신호로 느껴질 수 있습니다.' },
    en: { name: 'Receiving Gifts', desc: "It's not about the price — it's about being remembered. An out-of-the-blue gift on an ordinary day means more than lavish gestures.", tip: 'For your partner: small tokens that show you were thinking of them. Watch out: forgetting birthdays or milestones feels like rejection.' },
    ja: { name: 'プレゼントをもらうこと (Gifts)', desc: '価格ではなく「覚えていてくれた」ことに感動します。特別でない日の突然のプレゼントが最も意味を持ちます。', tip: 'パートナーへ: あなたの好みを覚えて表現する小さなプレゼント。注意: 忘れることが愛の欠如を示すサインに感じることがあります。' } },
  Q: { icon: <Clock className="w-8 h-8" />, color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    ko: { name: '함께하는 시간 (Quality Time)', desc: '핸드폰을 내려놓고 눈을 맞추며 함께하는 시간이 사랑의 증거입니다. 활동보다 "온전히 함께한다"는 느낌 자체가 중요합니다.', tip: '파트너에게: 방해 없는 대화와 함께하는 루틴. 주의: 함께 있지만 각자 폰만 보는 상황이 가장 상처가 됩니다.' },
    en: { name: 'Quality Time', desc: 'Undivided attention is your love language. Phone down, eyes meeting — being truly present together is the proof of love.', tip: 'For your partner: distraction-free conversations and shared routines. Watch out: physically present but mentally absent is deeply hurtful.' },
    ja: { name: 'クオリティ・タイム (Quality Time)', desc: 'スマホを置いて目を合わせて一緒に過ごす時間が愛の証です。活動よりも「完全に一緒にいる」感覚自体が重要です。', tip: 'パートナーへ: 邪魔のない会話と共通のルーティン。注意: 一緒にいてもスマホばかり見ている状況が最も傷つきます。' } },
  P: { icon: <Heart className="w-8 h-8" />, color: 'text-pink-600 bg-pink-50 border-pink-200',
    ko: { name: '신체 접촉 (Physical Touch)', desc: '포옹, 손잡기, 어깨에 손 올리기 같은 작은 접촉이 큰 안정감을 줍니다. 물리적 거리가 감정적 거리로 느껴집니다.', tip: '파트너에게: 일상적인 스킨십과 힘들 때 안아주기. 주의: 공공장소 스킨십 선호가 파트너와 다를 수 있습니다.' },
    en: { name: 'Physical Touch', desc: 'Small touches — a hug, a hand-hold, a pat on the back — give you deep comfort and security. Physical distance feels emotional too.', tip: 'For your partner: everyday touch and holding during hard times. Watch out: preferences for public touch may differ from your partner.' },
    ja: { name: '身体的なタッチ (Physical Touch)', desc: 'ハグ、手つなぎ、肩への手置きなどの小さな接触が大きな安心感を与えます。物理的な距離が感情的な距離に感じられます。', tip: 'パートナーへ: 日常的なスキンシップと辛いときの抱擁。注意: 公共の場でのスキンシップの好みがパートナーと異なる場合があります。' } },
};

function llReduce(state: LLState, action: LLAction): LLState {
  if (action.type === 'reset') return { step: 0, scores: { W: 0, A: 0, G: 0, Q: 0, P: 0 }, done: false };
  const s = { ...state, scores: { ...state.scores, [action.pick]: state.scores[action.pick] + 1 } };
  if (s.step + 1 >= llQuestions.length) return { ...s, done: true };
  return { ...s, step: s.step + 1 };
}

export function LoveLanguageTest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const [state, dispatch] = useReducer(llReduce, { step: 0, scores: { W: 0, A: 0, G: 0, Q: 0, P: 0 }, done: false });
  const L = locale;
  const q = llQuestions[state.step];
  const title = L === 'ja' ? '愛の言語テスト（15問）' : L === 'en' ? 'Love Language Test (15 Questions)' : '사랑의 언어 테스트 (15문항)';
  const resetLabel = L === 'ja' ? 'もう一度' : L === 'en' ? 'Retake' : '다시하기';
  const top2 = (Object.entries(state.scores) as [LLKey, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  const primary = top2[0];
  const maxScore = Math.max(...Object.values(state.scores));

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8 overflow-hidden">
      {!state.done ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Heart className="text-pink-500 fill-pink-400 w-5 h-5" />
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
          </div>
          <ProgressIndicator current={state.step} total={llQuestions.length} />
          <p className="text-center text-sm font-semibold text-slate-500">{q[L]}</p>
          <div className="grid grid-cols-1 gap-3">
            {q.opts.map((opt, i) => (
              <button key={i} onClick={() => dispatch({ type: 'answer', pick: opt.key })}
                className="p-5 bg-slate-50 hover:bg-pink-50 border-2 border-slate-100 hover:border-pink-300 rounded-2xl text-slate-700 font-semibold text-left transition-all active:scale-[0.98] shadow-sm hover:shadow-md">
                {opt.text[L]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${llMeta[primary].color}`}>
            {llMeta[primary].icon}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">{L === 'ja' ? '主要な愛の言語' : L === 'en' ? 'Primary Love Language' : '주 사랑의 언어'}</p>
              <h3 className="text-2xl font-black">{llMeta[primary][L].name}</h3>
            </div>
          </div>
          <div className="space-y-3">
            {(Object.entries(state.scores) as [LLKey, number][]).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <ScoreBar key={k} label={llMeta[k][L].name} value={v} max={maxScore || 1}
                colorClass={k === primary ? 'bg-pink-400' : 'bg-slate-300'} />
            ))}
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed">{llMeta[primary][L].desc}</p>
            <p className="text-xs text-slate-500 italic">{llMeta[primary][L].tip}</p>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => dispatch({ type: 'reset' })} className="rounded-full px-6">{resetLabel}</Button>
            <ShareButton locale={L} text={`${llMeta[primary][L].name} — blog.oiyo.net`} />
          </div>
          <p className="text-[10px] text-slate-400 italic">* Gary Chapman의 《The Five Love Languages》(1992)에 기반한 자기 이해 도구입니다.</p>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
// EMPATHY TEST
// ─────────────────────────────────────────────
type EmpDim = 'CE' | 'AE' | 'EA';
interface EmpState { step: number; scores: Record<EmpDim, number>; done: boolean; }
type EmpAction = { type: 'answer'; value: number } | { type: 'reset' };

const empQuestions: { dim: EmpDim; ko: string; en: string; ja: string }[] = [
  { dim: 'CE', ko: '상대방의 입장이 되어 상황을 이해하려 노력한다', en: 'I try to understand situations from the other person\'s perspective', ja: '相手の立場に立って状況を理解しようとする' },
  { dim: 'CE', ko: '갈등 상황에서 왜 상대가 그런 행동을 했는지 분석한다', en: 'In conflicts I analyze why the other person acted that way', ja: '葛藤の状況で相手がなぜそう行動したかを分析する' },
  { dim: 'CE', ko: '다른 의견을 들을 때 "왜 저렇게 생각할까"를 먼저 생각한다', en: 'When hearing different views I first ask "why do they think that?"', ja: '異なる意見を聞くとき「なぜそう思うのか」をまず考える' },
  { dim: 'CE', ko: '낯선 사람의 행동에도 그만한 이유가 있을 것이라 믿는다', en: "I believe even strangers' actions have their reasons", ja: '見知らぬ人の行動にも相応の理由があると信じる' },
  { dim: 'AE', ko: '슬픈 뉴스나 영화를 보면 실제로 감정이 동요된다', en: 'Sad news or movies genuinely move me emotionally', ja: '悲しいニュースや映画を見ると実際に感情が揺れる' },
  { dim: 'AE', ko: '주변 사람이 울면 나도 눈물이 나려 한다', en: 'When people around me cry I feel like crying too', ja: '周りの人が泣くと私も泣きそうになる' },
  { dim: 'AE', ko: '타인의 기쁨이나 슬픔이 내 기분에도 영향을 준다', en: "Others' joy or sadness influences my own mood", ja: '他者の喜びや悲しみが自分の気分にも影響する' },
  { dim: 'AE', ko: '고통받는 사람을 보면 내 마음도 아프다', en: 'Seeing someone in pain makes my heart ache too', ja: '苦しんでいる人を見ると自分の心も痛む' },
  { dim: 'EA', ko: '힘든 사람을 보면 어떻게 도울 수 있을지 생각한다', en: 'When I see someone struggling I think about how to help', ja: '困っている人を見るとどう助けられるか考える' },
  { dim: 'EA', ko: '친구가 슬플 때 무언가 해주고 싶은 마음이 강하게 든다', en: 'When a friend is sad I strongly want to do something for them', ja: '友人が悲しいとき何かしてあげたいという気持ちが強くなる' },
  { dim: 'EA', ko: '타인의 감정을 인식하면 실제 행동으로 반응한다', en: "When I recognize others' emotions I respond with actual actions", ja: '他者の感情を認識すると実際の行動で反応する' },
  { dim: 'EA', ko: '사람들이 힘들어할 때 나서서 돕는 편이다', en: 'I tend to step up and help when people are struggling', ja: '人々が困っているとき率先して助ける方だ' },
];

const empDimMeta: Record<EmpDim, { ko: string; en: string; ja: string; color: string }> = {
  CE: { ko: '인지적 공감 (관점 수용)', en: 'Cognitive Empathy (Perspective-taking)', ja: '認知的共感（視点取得）', color: 'bg-indigo-400' },
  AE: { ko: '정서적 공감 (감정 공유)', en: 'Affective Empathy (Emotion-sharing)', ja: '情動的共感（感情共有）', color: 'bg-rose-400' },
  EA: { ko: '공감적 행동 (실천)', en: 'Empathic Action (Practice)', ja: '共感的行動（実践）', color: 'bg-emerald-400' },
};

function empReduce(state: EmpState, action: EmpAction): EmpState {
  if (action.type === 'reset') return { step: 0, scores: { CE: 0, AE: 0, EA: 0 }, done: false };
  const dim = empQuestions[state.step].dim;
  const newScores = { ...state.scores, [dim]: state.scores[dim] + action.value };
  if (state.step + 1 >= empQuestions.length) return { ...state, scores: newScores, done: true };
  return { ...state, step: state.step + 1, scores: newScores };
}

export function EmpathyTest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const [state, dispatch] = useReducer(empReduce, { step: 0, scores: { CE: 0, AE: 0, EA: 0 }, done: false });
  const L = locale;
  const title = L === 'ja' ? '共感力テスト（12問）' : L === 'en' ? 'Empathy Test (12 Questions)' : '공감 능력 테스트 (12문항)';
  const resetLabel = L === 'ja' ? 'もう一度' : L === 'en' ? 'Retake' : '다시하기';
  const scaleLabels = L === 'ja' ? ['まったく違う', 'やや違う', 'どちらでも', 'ややそう', 'とてもそう'] : L === 'en' ? ['Not at all', 'Slightly', 'Neutral', 'Mostly', 'Strongly'] : ['전혀 아님', '약간', '보통', '대체로', '매우 그렇다'];
  const q = empQuestions[state.step];
  const totalMax = 4 * 5;
  const total = Object.values(state.scores).reduce((a, b) => a + b, 0);
  const totalPct = Math.round((total / (empQuestions.length * 5)) * 100);
  const level = totalPct >= 75 ? (L === 'ko' ? '높은 공감 능력' : L === 'en' ? 'High Empathy' : '高い共感力') : totalPct >= 50 ? (L === 'ko' ? '중간 수준 공감' : L === 'en' ? 'Moderate Empathy' : '中程度の共感力') : (L === 'ko' ? '분석적 성향' : L === 'en' ? 'Analytical Tendency' : '分析的傾向');
  const levelDesc: Record<string, Record<string, string>> = {
    high: { ko: '타인의 감정과 상황을 자연스럽게 읽는 분입니다. CE/AE/EA 세 축이 균형 있게 발달했다면 관계와 소통에서 큰 강점이 됩니다. 주의: 과도한 공감은 감정 소진(Empathy Fatigue)으로 이어질 수 있으니 경계 설정 연습이 필요합니다.', en: 'You naturally read others\' emotions and situations. If CE/AE/EA are balanced, this is a major strength in relationships. Watch out: excessive empathy can lead to emotional fatigue — practice setting boundaries.', ja: '他者の感情と状況を自然に読み取れる方です。CE/AE/EAの三軸がバランスよく発達していれば、関係とコミュニケーションで大きな強みになります。注意: 過度な共感は感情疲弊につながることがあります。' },
    mid: { ko: '상황에 따라 공감하는 정도가 다르거나 세 축 중 특정 영역이 낮을 수 있습니다. 어떤 축이 낮은지 확인하고 의식적으로 발전시켜 보세요.', en: 'Your empathy level varies by situation or one of the three dimensions may be lower. Check which axis scores lower and work on developing it consciously.', ja: '状況によって共感の程度が異なるか、三軸のうち特定の領域が低い可能性があります。どの軸が低いかを確認して意識的に発展させてみましょう。' },
    low: { ko: '감정보다 논리와 이성을 우선하는 경향이 있습니다. 공감 능력은 연습으로 늘릴 수 있습니다. "상대의 입장에서 한 번 더 생각하기"부터 시작해 보세요.', en: 'You tend to prioritize logic over emotion — this is not a flaw. Empathy is a skill that grows with practice. Start with "think once more from their perspective."', ja: '感情より論理と理性を優先する傾向があります。共感力は練習で向上できます。「相手の立場でもう一度考える」から始めてみましょう。' },
  };
  const levelKey = totalPct >= 75 ? 'high' : totalPct >= 50 ? 'mid' : 'low';

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      {!state.done ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Smile className="text-rose-500 w-5 h-5" />
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
          </div>
          <ProgressIndicator current={state.step} total={empQuestions.length} />
          <div className="text-center space-y-4 py-2">
            <Badge variant="outline" className="text-xs">{empDimMeta[q.dim][L]}</Badge>
            <p className="text-xl font-bold text-slate-800 leading-relaxed max-w-sm mx-auto">{q[L]}</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => dispatch({ type: 'answer', value: v })}
                className="flex flex-col items-center gap-1 py-3 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-300 rounded-xl transition-all active:scale-[0.96]">
                <span className="text-lg font-black text-slate-800">{v}</span>
                <span className="text-[9px] text-slate-400 text-center leading-tight">{scaleLabels[v - 1]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{L === 'ko' ? '종합 공감 지수' : L === 'en' ? 'Overall Empathy Score' : '総合共感スコア'}</p>
            <p className="text-5xl font-black text-slate-900">{totalPct}<span className="text-xl text-slate-400">%</span></p>
            <Badge className="bg-rose-100 text-rose-700 border-0">{level}</Badge>
          </div>
          <div className="space-y-3">
            {(Object.entries(state.scores) as [EmpDim, number][]).map(([k, v]) => (
              <ScoreBar key={k} label={empDimMeta[k][L]} value={v} max={totalMax / 3} colorClass={empDimMeta[k].color} />
            ))}
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed">{levelDesc[levelKey][L]}</p>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => dispatch({ type: 'reset' })} className="rounded-full px-6">{resetLabel}</Button>
            <ShareButton locale={L} text={`${level} ${totalPct}% — blog.oiyo.net`} />
          </div>
          <p className="text-[10px] text-slate-400 italic">* Baron-Cohen & Wheelwright(2004) 공감 지수(EQ) 연구에 기반합니다.</p>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
// ANIMAL TYPE TEST
// ─────────────────────────────────────────────
type AnimalKey = 'lion' | 'dolphin' | 'bear' | 'owl';
interface AnimalState { step: number; scores: Record<AnimalKey, number>; done: boolean; }
type AnimalAction = { type: 'answer'; key: AnimalKey } | { type: 'reset' };

const animalMeta: Record<AnimalKey, { emoji: string; ko: { name: string; desc: string; strength: string; blind: string }; en: { name: string; desc: string; strength: string; blind: string }; ja: { name: string; desc: string; strength: string; blind: string }; color: string }> = {
  lion: { emoji: '🦁', color: 'text-orange-700 bg-orange-50 border-orange-200',
    ko: { name: '사자형 (Lion)', desc: '강한 추진력과 결단력으로 목표를 향해 직진합니다. 리더십이 자연스럽고 결과 지향적입니다.', strength: '결단력, 추진력, 목표 달성', blind: '팀원 감정 간과, 과도한 통제 욕구' },
    en: { name: 'Lion Type', desc: 'You drive toward goals with strong decisiveness and leadership. Results-focused and naturally commanding.', strength: 'Decisiveness, drive, goal achievement', blind: 'Overlooking team emotions, over-controlling' },
    ja: { name: 'ライオンタイプ', desc: '強い推進力と決断力で目標に向かって突進します。リーダーシップが自然で結果志向です。', strength: '決断力、推進力、目標達成', blind: 'チームメンバーの感情の見落とし、過度な管理欲求' } },
  dolphin: { emoji: '🐬', color: 'text-sky-700 bg-sky-50 border-sky-200',
    ko: { name: '돌고래형 (Dolphin)', desc: '사람들에게 에너지와 활력을 주는 천부적인 소통가입니다. 낙관적이고 창의적이며 분위기를 이끕니다.', strength: '소통력, 열정, 창의성', blind: '세부 사항 간과, 실행력 부족' },
    en: { name: 'Dolphin Type', desc: "You're a natural communicator who energizes people around you. Optimistic, creative, and a natural mood-lifter.", strength: 'Communication, enthusiasm, creativity', blind: 'Missing details, follow-through gaps' },
    ja: { name: 'イルカタイプ', desc: '人々にエネルギーと活力を与える生まれながらのコミュニケーターです。楽観的で創造的、雰囲気をリードします。', strength: 'コミュニケーション力、熱意、創造性', blind: '細部の見落とし、実行力不足' } },
  bear: { emoji: '🐻', color: 'text-amber-700 bg-amber-50 border-amber-200',
    ko: { name: '곰형 (Bear)', desc: '팀의 안정을 지키는 든든한 버팀목입니다. 변화보다 일관성을 선호하고 깊은 신뢰를 쌓습니다.', strength: '인내심, 협동심, 신뢰성', blind: '변화 저항, 자기 주장 부족' },
    en: { name: 'Bear Type', desc: "You're the steady anchor of any team. You prefer consistency over chaos and build deep, lasting trust.", strength: 'Patience, collaboration, reliability', blind: 'Resistance to change, under-assertive' },
    ja: { name: 'クマタイプ', desc: 'チームの安定を守る頼もしい支えです。変化より一貫性を好み、深い信頼を積み重ねます。', strength: '忍耐力、協調性、信頼性', blind: '変化への抵抗、自己主張の不足' } },
  owl: { emoji: '🦉', color: 'text-purple-700 bg-purple-50 border-purple-200',
    ko: { name: '올빼미형 (Owl)', desc: '정확성과 품질에 높은 기준을 둡니다. 체계적인 분석으로 리스크를 최소화하고 깊은 전문성을 추구합니다.', strength: '분석력, 꼼꼼함, 전문성', blind: '분석 마비, 느린 결정' },
    en: { name: 'Owl Type', desc: 'You set high standards for accuracy and quality. Systematic analysis minimizes risk and you pursue deep expertise.', strength: 'Analysis, thoroughness, expertise', blind: 'Analysis paralysis, slow decisions' },
    ja: { name: 'フクロウタイプ', desc: '正確さと品質に高い基準を設けます。体系的な分析でリスクを最小化し、深い専門性を追求します。', strength: '分析力、緻密さ、専門性', blind: '分析麻痺、遅い意思決定' } },
};

const animalQuestions: { ko: string; en: string; ja: string; opts: { key: AnimalKey; ko: string; en: string; ja: string }[] }[] = [
  { ko: '팀 과제가 시작되면 나는?', en: 'When a team project starts I...', ja: 'チームの課題が始まると私は？',
    opts: [{ key: 'lion', ko: '즉시 목표를 정하고 역할을 나눠 실행한다', en: 'Immediately set goals and assign roles', ja: 'すぐに目標を設定し役割を分けて実行する' }, { key: 'dolphin', ko: '팀 분위기를 띄우며 아이디어를 공유한다', en: 'Boost team energy and share ideas', ja: 'チームの雰囲気を盛り上げてアイデアを共有する' }, { key: 'bear', ko: '다들 편안하게 시작하도록 분위기를 조성한다', en: 'Create a comfortable atmosphere for everyone', ja: 'みんなが快適に始められる雰囲気を作る' }, { key: 'owl', ko: '목표와 방법을 먼저 명확히 정리한다', en: 'First clarify the goal and methodology', ja: '目標と方法をまず明確に整理する' }] },
  { ko: '갈등이 생겼을 때 나는?', en: 'When conflict arises I...', ja: '葛藤が生じたとき私は？',
    opts: [{ key: 'lion', ko: '직접 대면해 빠르게 해결한다', en: 'Confront directly and resolve quickly', ja: '直接対面して素早く解決する' }, { key: 'dolphin', ko: '유머나 공감으로 분위기를 부드럽게 한다', en: 'Soften the mood with humor or empathy', ja: 'ユーモアや共感で雰囲気を和らげる' }, { key: 'bear', ko: '모두가 화해할 때까지 인내하며 기다린다', en: 'Patiently wait until everyone reconciles', ja: '全員が和解するまで辛抱強く待つ' }, { key: 'owl', ko: '원인을 분석해 논리적 해결책을 제시한다', en: 'Analyze the cause and propose logical solutions', ja: '原因を分析して論理的な解決策を提案する' }] },
  { ko: '내가 가장 잘하는 것은?', en: 'What I do best is...', ja: '私が最も得意なのは？',
    opts: [{ key: 'lion', ko: '결정하고 실행하기', en: 'Deciding and executing', ja: '決定して実行すること' }, { key: 'dolphin', ko: '사람들에게 활력 주기', en: 'Energizing people', ja: '人々に活力を与えること' }, { key: 'bear', ko: '팀의 균형과 화합 유지하기', en: 'Maintaining team balance and harmony', ja: 'チームのバランスと調和を維持すること' }, { key: 'owl', ko: '꼼꼼히 분석하기', en: 'Thorough analysis', ja: '緻密に分析すること' }] },
  { ko: '스트레스 상황에서 나는?', en: 'Under stress I...', ja: 'ストレス状況で私は？',
    opts: [{ key: 'lion', ko: '더 강하게 결과를 밀어붙인다', en: 'Push harder for results', ja: 'より強く結果を推し進める' }, { key: 'dolphin', ko: '친구들과 이야기하며 해소한다', en: 'Vent by talking with friends', ja: '友人と話して解消する' }, { key: 'bear', ko: '조용히 참으며 상황이 지나가길 기다린다', en: 'Quietly endure and wait for it to pass', ja: '静かに耐えて状況が過ぎるのを待つ' }, { key: 'owl', ko: '원인을 파악하고 해결책을 찾는다', en: 'Identify the cause and find solutions', ja: '原因を把握して解決策を見つける' }] },
  { ko: '새로운 사람을 만날 때 나는?', en: 'When meeting someone new I...', ja: '新しい人に会うとき私は？',
    opts: [{ key: 'lion', ko: '주도적으로 소개하고 목적을 파악한다', en: 'Proactively introduce myself and size them up', ja: '積極的に自己紹介して目的を把握する' }, { key: 'dolphin', ko: '밝고 친근하게 대화를 시작한다', en: 'Start conversation brightly and warmly', ja: '明るく親しみやすく会話を始める' }, { key: 'bear', ko: '천천히 신뢰를 쌓아간다', en: 'Build trust slowly and steadily', ja: 'ゆっくりと信頼を積み重ねていく' }, { key: 'owl', ko: '상대방을 관찰하며 신중하게 접근한다', en: 'Observe them carefully before approaching', ja: '相手を観察しながら慎重にアプローチする' }] },
  { ko: '내가 가장 두려운 것은?', en: 'My biggest fear is...', ja: '私が最も恐れることは？',
    opts: [{ key: 'lion', ko: '통제력을 잃는 것', en: 'Losing control', ja: 'コントロールを失うこと' }, { key: 'dolphin', ko: '거절당하거나 무시받는 것', en: 'Being rejected or ignored', ja: '拒絶されたり無視されること' }, { key: 'bear', ko: '갑작스러운 변화', en: 'Sudden change', ja: '突然の変化' }, { key: 'owl', ko: '실수하거나 비판받는 것', en: 'Making mistakes or being criticized', ja: 'ミスをしたり批判されること' }] },
  { ko: '회의에서 나의 역할은?', en: 'My role in meetings is...', ja: '会議での私の役割は？',
    opts: [{ key: 'lion', ko: '방향을 제시하고 결론을 이끈다', en: 'Set direction and lead to conclusions', ja: '方向性を示して結論をリードする' }, { key: 'dolphin', ko: '아이디어를 내고 분위기를 살린다', en: 'Generate ideas and liven things up', ja: 'アイデアを出して雰囲気を活性化する' }, { key: 'bear', ko: '경청하며 의견을 조율한다', en: 'Listen and mediate opinions', ja: '傾聴して意見を調整する' }, { key: 'owl', ko: '세부 사항을 검토하고 분석한다', en: 'Review details and analyze', ja: '細部を検討して分析する' }] },
  { ko: '내가 인정받고 싶은 말은?', en: 'The praise I most want to hear is...', ja: '最も認められたい言葉は？',
    opts: [{ key: 'lion', ko: '"역시 결과물이 빠르고 탁월해"', en: '"Your results are fast and outstanding"', ja: '「さすが結果が早くて卓越している」' }, { key: 'dolphin', ko: '"네 덕분에 분위기가 살았어"', en: '"You made everything come alive"', ja: '「あなたのおかげで雰囲気が盛り上がった」' }, { key: 'bear', ko: '"항상 믿고 의지할 수 있어"', en: '"I can always count on you"', ja: '「いつも頼りにできる」' }, { key: 'owl', ko: '"정말 꼼꼼하고 정확해"', en: '"You\'re so thorough and precise"', ja: '「本当に緻密で正確だ」' }] },
  { ko: '변화가 필요한 상황에서 나는?', en: 'When change is needed I...', ja: '変化が必要な状況で私は？',
    opts: [{ key: 'lion', ko: '즉시 변화를 주도한다', en: 'Lead the change immediately', ja: '即座に変化をリードする' }, { key: 'dolphin', ko: '변화의 장점을 팀에 설명하고 흥미를 유발한다', en: 'Explain the benefits and generate excitement', ja: '変化のメリットをチームに説明して興味を引き起こす' }, { key: 'bear', ko: '점진적으로 적응한다', en: 'Adapt gradually', ja: '段階的に適応する' }, { key: 'owl', ko: '변화의 리스크를 먼저 분석한다', en: 'First analyze the risks of the change', ja: '変化のリスクをまず分析する' }] },
  { ko: '미래의 나의 모습은?', en: 'My vision for the future is...', ja: '未来の自分の姿は？',
    opts: [{ key: 'lion', ko: '강력한 영향력을 가진 리더', en: 'A powerful influential leader', ja: '強力な影響力を持つリーダー' }, { key: 'dolphin', ko: '많은 사람에게 사랑받고 영감을 주는 사람', en: 'Someone loved and inspiring to many', ja: '多くの人に愛されてインスピレーションを与える人' }, { key: 'bear', ko: '안정적인 삶에서 가족과 행복한 사람', en: 'Happy with family in a stable life', ja: '安定した生活で家族と幸せな人' }, { key: 'owl', ko: '전문성으로 인정받는 권위자', en: 'An authority recognized for expertise', ja: '専門性で認められる権威者' }] },
  { ko: '팀 프로젝트에서 가장 중요한 것은?', en: 'The most important thing in a team project is...', ja: 'チームプロジェクトで最も重要なことは？',
    opts: [{ key: 'lion', ko: '목표 달성', en: 'Goal achievement', ja: '目標達成' }, { key: 'dolphin', ko: '팀원 간 활발한 소통', en: 'Active communication among members', ja: 'メンバー間の活発なコミュニケーション' }, { key: 'bear', ko: '협력과 팀 화합', en: 'Cooperation and team harmony', ja: '協力とチームの調和' }, { key: 'owl', ko: '정확성과 품질', en: 'Accuracy and quality', ja: '正確さと品質' }] },
  { ko: '내가 가장 잘하는 것은?', en: 'I am most proud of...', ja: '私が最も誇れるのは？',
    opts: [{ key: 'lion', ko: '결단력 있게 추진하는 것', en: 'Driving forward with decisiveness', ja: '決断力を持って推進すること' }, { key: 'dolphin', ko: '사람들과 빠르게 친해지는 것', en: 'Quickly building rapport with people', ja: '人々と素早く打ち解けること' }, { key: 'bear', ko: '인내심 있게 관계를 유지하는 것', en: 'Maintaining relationships with patience', ja: '忍耐強く関係を維持すること' }, { key: 'owl', ko: '복잡한 문제를 분석하는 것', en: 'Analyzing complex problems', ja: '複雑な問題を分析すること' }] },
];

function animalReduce(state: AnimalState, action: AnimalAction): AnimalState {
  if (action.type === 'reset') return { step: 0, scores: { lion: 0, dolphin: 0, bear: 0, owl: 0 }, done: false };
  const s = { ...state, scores: { ...state.scores, [action.key]: state.scores[action.key] + 1 } };
  if (s.step + 1 >= animalQuestions.length) return { ...s, done: true };
  return { ...s, step: s.step + 1 };
}

export function AnimalTypeTest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const [state, dispatch] = useReducer(animalReduce, { step: 0, scores: { lion: 0, dolphin: 0, bear: 0, owl: 0 }, done: false });
  const L = locale;
  const title = L === 'ja' ? '動物タイプ診断（12問）' : L === 'en' ? 'Animal Personality Test (12 Questions)' : '동물 성격 유형 테스트 (12문항)';
  const resetLabel = L === 'ja' ? 'もう一度' : L === 'en' ? 'Retake' : '다시하기';
  const q = animalQuestions[state.step];
  const sorted = (Object.entries(state.scores) as [AnimalKey, number][]).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][0];
  const maxScore = sorted[0][1] || 1;

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      {!state.done ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Leaf className="text-emerald-500 w-5 h-5" />
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
          </div>
          <ProgressIndicator current={state.step} total={animalQuestions.length} />
          <p className="text-center text-xl font-bold text-slate-800 py-2">{q[L]}</p>
          <div className="grid grid-cols-1 gap-3">
            {q.opts.map((opt, i) => (
              <button key={i} onClick={() => dispatch({ type: 'answer', key: opt.key })}
                className="p-4 bg-slate-50 hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-300 rounded-2xl text-slate-700 font-semibold text-left transition-all active:scale-[0.98] flex items-center gap-3">
                <span className="text-2xl">{animalMeta[opt.key].emoji}</span>
                <span>{opt[L]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${animalMeta[primary].color}`}>
            <span className="text-5xl">{animalMeta[primary].emoji}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">{L === 'ko' ? '나의 동물 유형' : L === 'en' ? 'Your Animal Type' : 'あなたの動物タイプ'}</p>
              <h3 className="text-2xl font-black">{animalMeta[primary][L].name}</h3>
            </div>
          </div>
          <div className="space-y-3">
            {sorted.map(([k, v]) => (
              <ScoreBar key={k} label={`${animalMeta[k].emoji} ${animalMeta[k][L].name}`} value={v} max={maxScore}
                colorClass={k === primary ? 'bg-emerald-400' : 'bg-slate-200'} />
            ))}
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed">{animalMeta[primary][L].desc}</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100">
                <p className="font-bold text-emerald-700 mb-1">{L === 'ko' ? '강점' : L === 'en' ? 'Strengths' : '強み'}</p>
                <p className="text-emerald-600">{animalMeta[primary][L].strength}</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-2 border border-rose-100">
                <p className="font-bold text-rose-700 mb-1">{L === 'ko' ? '성장 포인트' : L === 'en' ? 'Growth Areas' : '成長ポイント'}</p>
                <p className="text-rose-600">{animalMeta[primary][L].blind}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => dispatch({ type: 'reset' })} className="rounded-full px-6">{resetLabel}</Button>
            <ShareButton locale={L} text={`${animalMeta[primary].emoji} ${animalMeta[primary][L].name} — blog.oiyo.net`} />
          </div>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
// FULL MBTI TEST
// ─────────────────────────────────────────────
type MBTIDim = 'EI' | 'SN' | 'TF' | 'JP';
interface MBTIState { step: number; scores: Record<MBTIDim, number>; counts: Record<MBTIDim, number>; done: boolean; }
type MBTIAction = { type: 'answer'; value: number } | { type: 'reset' };

const mbtiQuestions: { dim: MBTIDim; polarity: 1 | -1; ko: string; en: string; ja: string }[] = [
  { dim: 'EI', polarity: 1, ko: '사람들과 함께 있으면 에너지가 충전된다', en: 'Being with people recharges my energy', ja: '人と一緒にいるとエネルギーが充電される' },
  { dim: 'EI', polarity: 1, ko: '처음 만나는 사람과 대화를 먼저 시작하는 편이다', en: 'I tend to initiate conversations with new people', ja: '初めて会う人との会話を先に始める方だ' },
  { dim: 'EI', polarity: -1, ko: '혼자만의 조용한 시간이 재충전에 필수적이다', en: 'Quiet alone time is essential for recharging', ja: '一人の静かな時間が充電に欠かせない' },
  { dim: 'EI', polarity: -1, ko: '큰 모임보다 소수의 깊은 대화를 선호한다', en: 'I prefer deep conversations with a few over big gatherings', ja: '大きな集まりより少人数の深い会話を好む' },
  { dim: 'SN', polarity: -1, ko: '경험과 사실보다 가능성과 아이디어에 끌린다', en: 'I am drawn to possibilities and ideas over facts', ja: '経験や事実より可能性やアイデアに惹かれる' },
  { dim: 'SN', polarity: -1, ko: '실용적인 해결책보다 창의적인 접근을 선호한다', en: 'I prefer creative approaches over practical solutions', ja: '実用的な解決策より創造的なアプローチを好む' },
  { dim: 'SN', polarity: 1, ko: '미래 계획보다 현재 현실에 집중하는 편이다', en: 'I focus more on present reality than future plans', ja: '将来の計画より現在の現実に集中する方だ' },
  { dim: 'SN', polarity: 1, ko: '세부 사실과 구체적 정보를 중요하게 생각한다', en: 'I value detailed facts and concrete information', ja: '細部の事実と具体的な情報を重要視する' },
  { dim: 'TF', polarity: 1, ko: '감정보다 논리와 원칙으로 결정하는 편이다', en: 'I make decisions based on logic and principles over feelings', ja: '感情より論理と原則で決定する方だ' },
  { dim: 'TF', polarity: 1, ko: '갈등 상황에서 공정성을 감정보다 먼저 따진다', en: 'In conflicts I prioritize fairness over feelings', ja: '葛藤の状況で公正さを感情より優先する' },
  { dim: 'TF', polarity: -1, ko: '비판보다 격려가 더 효과적이라 생각한다', en: 'I believe encouragement is more effective than criticism', ja: '批判より励ましの方が効果的だと思う' },
  { dim: 'TF', polarity: -1, ko: '사람들의 감정을 고려하지 않은 결정은 옳지 않다', en: 'Decisions that ignore people\'s feelings are wrong', ja: '人々の感情を考慮しない決定は正しくない' },
  { dim: 'JP', polarity: 1, ko: '할 일 목록을 만들고 계획대로 실행한다', en: 'I make to-do lists and follow them', ja: 'やることリストを作って計画通りに実行する' },
  { dim: 'JP', polarity: 1, ko: '예상치 못한 변화가 생기면 스트레스를 받는다', en: 'Unexpected changes stress me out', ja: '予期せぬ変化があるとストレスを感じる' },
  { dim: 'JP', polarity: -1, ko: '마감이 다가와야 집중이 잘 된다', en: 'I focus best when a deadline approaches', ja: '締め切りが近づいてからよく集中できる' },
  { dim: 'JP', polarity: -1, ko: '여러 옵션을 열어두는 것이 하나를 정하는 것보다 편하다', en: 'Keeping options open feels better than committing to one', ja: '複数の選択肢を開いておく方が一つに決めるより楽だ' },
];

const mbtiTypes: Record<string, { ko: string; en: string; ja: string }> = {
  INTJ: { ko: '전략적 설계자 — 비전을 가진 독립적 사상가. 체계와 이론을 통해 세상을 이해하고 장기 목표를 추구합니다.', en: 'Strategic Architect — Independent, visionary thinker who understands the world through systems and pursues long-term goals.', ja: '戦略的設計者 — ビジョンを持つ独立した思想家。体系と理論で世界を理解し長期目標を追求します。' },
  INTP: { ko: '논리적 탐구자 — 복잡한 아이디어와 이론을 탐구하는 것을 즐기며 끊임없이 지식을 추구합니다.', en: 'Logical Explorer — Loves exploring complex ideas and theories, endlessly pursuing knowledge.', ja: '論理的探究者 — 複雑なアイデアや理論の探求を楽しみ、絶えず知識を追求します。' },
  INFJ: { ko: '통찰적 조율자 — 깊은 공감과 비전으로 사람들을 영감시키고 의미 있는 연결을 만들어냅니다.', en: 'Insightful Harmonizer — Inspires others with deep empathy and vision, creating meaningful connections.', ja: '洞察的調整者 — 深い共感とビジョンで人々にインスピレーションを与え、意味ある繋がりを作ります。' },
  INFP: { ko: '이상주의 탐색자 — 자신의 가치관에 따라 살며 세상을 더 나은 곳으로 만들고자 합니다.', en: 'Idealist Navigator — Lives by personal values and wants to make the world a better place.', ja: '理想主義的探索者 — 自分の価値観に従って生き、世界をより良くしようとします。' },
  ENTJ: { ko: '결단적 지휘자 — 자연스러운 리더십으로 장기 목표를 향해 팀을 이끄는 전략가.', en: 'Decisive Commander — A natural leader who drives teams toward long-term goals with strategic thinking.', ja: '決断的指揮者 — 自然なリーダーシップで長期目標に向けてチームをリードする戦略家。' },
  ENTP: { ko: '혁신적 논쟁가 — 아이디어를 사랑하고 현상에 도전하며 새로운 가능성을 탐구합니다.', en: 'Innovative Debater — Loves ideas, challenges the status quo, and explores new possibilities.', ja: '革新的論争者 — アイデアを愛し現状に挑戦して新しい可能性を探求します。' },
  ENFJ: { ko: '영향력 있는 멘토 — 타인의 성장을 돕고 공동체를 단결시키는 따뜻한 리더.', en: 'Influential Mentor — A warm leader who helps others grow and unites communities.', ja: '影響力あるメンター — 他者の成長を助けてコミュニティを団結させる温かいリーダー。' },
  ENFP: { ko: '영감을 주는 추진자 — 열정과 창의성으로 사람들에게 새로운 가능성을 보여줍니다.', en: 'Inspiring Champion — Shows people new possibilities with passion and creativity.', ja: 'インスピレーションを与える推進者 — 情熱と創造性で人々に新しい可能性を示します。' },
  ISTJ: { ko: '신뢰할 수 있는 관리자 — 체계와 전통을 중시하며 책임감 있게 맡은 일을 완수합니다.', en: 'Reliable Administrator — Values structure and tradition, completing responsibilities with thoroughness.', ja: '信頼できる管理者 — 体系と伝統を重視し責任感を持って任務を完遂します。' },
  ISFJ: { ko: '따뜻한 수호자 — 헌신적으로 타인을 돌보며 조화로운 환경을 만들어냅니다.', en: 'Warm Guardian — Devotedly cares for others and creates harmonious environments.', ja: '温かい守護者 — 献身的に他者を気遣い調和のある環境を作ります。' },
  ISTP: { ko: '실용적 장인 — 논리와 실용성으로 문제를 해결하며 직접 손으로 만드는 것을 좋아합니다.', en: 'Practical Craftsman — Solves problems with logic and practicality, loves working with hands.', ja: '実用的な職人 — 論理と実用性で問題を解決し直接手で作ることを好みます。' },
  ISFP: { ko: '감각적 예술가 — 아름다움과 조화를 추구하며 현재 순간에 충실하게 살아갑니다.', en: 'Sensory Artist — Pursues beauty and harmony, living fully in the present moment.', ja: '感性的な芸術家 — 美しさと調和を追求し、現在の瞬間に忠実に生きます。' },
  ESTJ: { ko: '실행 중심 리더 — 체계와 효율을 중시하며 팀을 목표를 향해 이끌어갑니다.', en: 'Executive Leader — Values structure and efficiency, driving teams toward goals.', ja: '実行中心リーダー — 体系と効率を重視しチームを目標に向かってリードします。' },
  ESFJ: { ko: '공동체 조율자 — 따뜻한 마음으로 모두를 연결하고 조화로운 환경을 만듭니다.', en: 'Community Coordinator — Connects everyone with warmth, creating harmonious environments.', ja: 'コミュニティ調整者 — 温かい心でみんなを繋ぎ調和のある環境を作ります。' },
  ESTP: { ko: '현장 해결사 — 현실적이고 실용적이며 즉각적인 행동으로 문제를 해결합니다.', en: 'Field Fixer — Realistic and practical, solving problems with immediate action.', ja: '現場解決者 — 現実的で実用的、即座の行動で問題を解決します。' },
  ESFP: { ko: '에너지 넘치는 연기자 — 삶을 축제처럼 살며 주변 사람들에게 즐거움을 줍니다.', en: 'Energetic Performer — Lives life like a celebration and brings joy to others.', ja: 'エネルギッシュな演者 — 人生をお祭りのように生き、周りの人に喜びをもたらします。' },
};

const mbtiDimMeta: Record<MBTIDim, { left: { ko: string; en: string; ja: string }; right: { ko: string; en: string; ja: string }; color: string }> = {
  EI: { left: { ko: 'E 외향', en: 'E Extravert', ja: 'E 外向' }, right: { ko: 'I 내향', en: 'I Introvert', ja: 'I 内向' }, color: 'bg-emerald-400' },
  SN: { left: { ko: 'S 감각', en: 'S Sensing', ja: 'S 感覚' }, right: { ko: 'N 직관', en: 'N Intuition', ja: 'N 直観' }, color: 'bg-sky-400' },
  TF: { left: { ko: 'T 사고', en: 'T Thinking', ja: 'T 思考' }, right: { ko: 'F 감정', en: 'F Feeling', ja: 'F 感情' }, color: 'bg-violet-400' },
  JP: { left: { ko: 'J 판단', en: 'J Judging', ja: 'J 判断' }, right: { ko: 'P 인식', en: 'P Perceiving', ja: 'P 知覚' }, color: 'bg-amber-400' },
};

function mbtiReduce(state: MBTIState, action: MBTIAction): MBTIState {
  if (action.type === 'reset') return { step: 0, scores: { EI: 0, SN: 0, TF: 0, JP: 0 }, counts: { EI: 0, SN: 0, TF: 0, JP: 0 }, done: false };
  const q = mbtiQuestions[state.step];
  const raw = action.value * q.polarity;
  const newScores = { ...state.scores, [q.dim]: state.scores[q.dim] + raw };
  const newCounts = { ...state.counts, [q.dim]: state.counts[q.dim] + 1 };
  if (state.step + 1 >= mbtiQuestions.length) return { ...state, scores: newScores, counts: newCounts, done: true };
  return { ...state, step: state.step + 1, scores: newScores, counts: newCounts };
}

function getMBTIType(scores: Record<MBTIDim, number>): string {
  return [scores.EI > 0 ? 'E' : 'I', scores.SN < 0 ? 'N' : 'S', scores.TF > 0 ? 'T' : 'F', scores.JP > 0 ? 'J' : 'P'].join('');
}

export function FullMBTITest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const [state, dispatch] = useReducer(mbtiReduce, { step: 0, scores: { EI: 0, SN: 0, TF: 0, JP: 0 }, counts: { EI: 0, SN: 0, TF: 0, JP: 0 }, done: false });
  const L = locale;
  const title = L === 'ja' ? 'MBTI 完全診断（16問）' : L === 'en' ? 'Full MBTI Test (16 Questions)' : '풀 MBTI 테스트 (16문항)';
  const resetLabel = L === 'ja' ? 'もう一度' : L === 'en' ? 'Retake' : '다시하기';
  const scaleLabels = L === 'ja' ? ['全く違う', 'やや違う', 'どちらでも', 'ややそう', '強くそう'] : L === 'en' ? ['Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Strongly Agree'] : ['전혀 아님', '약간 아님', '보통', '약간 그렇다', '매우 그렇다'];
  const q = mbtiQuestions[state.step];
  const type = getMBTIType(state.scores);

  const getDimPct = (dim: MBTIDim): { leftPct: number; rightPct: number } => {
    const maxRaw = state.counts[dim] * 5;
    const raw = state.scores[dim];
    const leftPct = maxRaw > 0 ? Math.round(((maxRaw + raw) / (maxRaw * 2)) * 100) : 50;
    return { leftPct, rightPct: 100 - leftPct };
  };

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      {!state.done ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Brain className="text-violet-500 w-5 h-5" />
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
          </div>
          <ProgressIndicator current={state.step} total={mbtiQuestions.length} />
          <div className="text-center space-y-3 py-2">
            <Badge variant="outline" className="text-xs">{mbtiDimMeta[q.dim][q.polarity > 0 ? 'left' : 'right'][L]}</Badge>
            <p className="text-xl font-bold text-slate-800 leading-relaxed max-w-sm mx-auto">{q[L]}</p>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => dispatch({ type: 'answer', value: v })}
                className="flex flex-col items-center gap-1 py-3 bg-slate-50 hover:bg-violet-50 border-2 border-slate-100 hover:border-violet-300 rounded-xl transition-all active:scale-[0.96]">
                <span className="text-base font-black text-slate-800">{v}</span>
                <span className="text-[8px] text-slate-400 text-center leading-tight hidden sm:block">{scaleLabels[v - 1]}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>← {scaleLabels[0]}</span>
            <span>{scaleLabels[4]} →</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{L === 'ko' ? '나의 MBTI 유형' : L === 'en' ? 'Your MBTI Type' : 'あなたのMBTIタイプ'}</p>
            <h3 className="text-6xl font-black text-slate-900 tracking-wider">{type}</h3>
          </div>
          <div className="space-y-4">
            {(['EI', 'SN', 'TF', 'JP'] as MBTIDim[]).map(dim => {
              const { leftPct, rightPct } = getDimPct(dim);
              return (
                <div key={dim} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">{mbtiDimMeta[dim].left[L]}</span>
                    <span className="text-slate-600">{mbtiDimMeta[dim].right[L]}</span>
                  </div>
                  <div className="relative h-4 rounded-full overflow-hidden bg-slate-100">
                    <div className={`absolute left-0 top-0 h-full transition-all duration-700 ${mbtiDimMeta[dim].color} opacity-70 rounded-full`} style={{ width: `${leftPct}%` }} />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">{leftPct}% / {rightPct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed">{(mbtiTypes[type] ?? mbtiTypes['ENFP'])[L]}</p>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => dispatch({ type: 'reset' })} className="rounded-full px-6">{resetLabel}</Button>
            <ShareButton locale={L} text={`MBTI: ${type} — blog.oiyo.net`} />
          </div>
          <p className="text-[10px] text-slate-400 italic">* Myers-Briggs Type Indicator(MBTI)는 Isabel Myers와 Katharine Briggs가 개발한 자기 이해 도구입니다.</p>
        </div>
      )}
    </Card>
  );
}
