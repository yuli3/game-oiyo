import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

const LABELS: Record<Locale, {
  title: string; subtitle: string; bill: string; tip: string; split: string;
  tipPer: string; splitPer: string; total: string; each: string;
}> = {
  ko: { title: '팁 계산기', subtitle: 'Tip Calculator', bill: '결제 금액', tip: '팁 비율', split: '인원 수', tipPer: '팁 금액 (1인)', splitPer: '1인 부담', total: '총액 (팁 포함)', each: '1인당' },
  en: { title: 'Tip Calculator', subtitle: 'Split bills with ease', bill: 'Bill Amount', tip: 'Tip %', split: 'Split', tipPer: 'Tip per person', splitPer: 'Per person', total: 'Total (with tip)', each: 'Each' },
  ja: { title: 'チップ計算機', subtitle: 'Tip Calculator', bill: '金額', tip: 'チップ率', split: '人数', tipPer: '1人チップ', splitPer: '1人負担', total: '合計（チップ込）', each: '1人' },
  fr: { title: 'Calculateur de pourboire', subtitle: 'Tip Calculator', bill: 'Montant', tip: 'Pourboire %', split: 'Personnes', tipPer: 'Pourboire / pers.', splitPer: 'Par personne', total: 'Total (avec pourboire)', each: 'Chacun' },
  es: { title: 'Calculadora de propina', subtitle: 'Tip Calculator', bill: 'Importe', tip: 'Propina %', split: 'Personas', tipPer: 'Propina / persona', splitPer: 'Por persona', total: 'Total (con propina)', each: 'Cada uno' },
  zh: { title: '小费计算器', subtitle: 'Tip Calculator', bill: '消费金额', tip: '小费比例', split: '人数', tipPer: '每人小费', splitPer: '每人应付', total: '含小费总额', each: '每人' },
};

const PRESET_TIPS = [10, 15, 18, 20, 25];
const CURRENCY: Record<Locale, string> = { ko: '₩', en: '$', ja: '¥', fr: '€', es: '€', zh: '¥', };
const LOCALE_NUM: Record<Locale, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR', es: 'es-ES', zh: 'zh-CN', };

function fmt(amount: number, locale: Locale) {
  return new Intl.NumberFormat(LOCALE_NUM[locale], {
    minimumFractionDigits: locale === 'ko' || locale === 'ja' ? 0 : 2,
    maximumFractionDigits: locale === 'ko' || locale === 'ja' ? 0 : 2,
  }).format(locale === 'ko' || locale === 'ja' ? Math.round(amount) : amount);
}

const TipCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = LABELS[locale] ?? LABELS.en;
  const currency = CURRENCY[locale];
  const defaultBill = locale === 'ko' ? 50000 : locale === 'ja' ? 3000 : 50;

  const [bill, setBill] = useState(defaultBill);
  const [tipPct, setTipPct] = useState(15);
  const [split, setSplit] = useState(2);

  const tipAmount = bill * (tipPct / 100);
  const total = bill + tipAmount;
  const tipPerPerson = tipAmount / split;
  const totalPerPerson = total / split;

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => { setBill(defaultBill); setTipPct(15); setSplit(2); }}
    >
      <div className="flex flex-col gap-8">
        {/* Bill input */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.bill}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-lg">{currency}</span>
            <input
              type="number"
              value={bill}
              min={0}
              aria-label={t.bill}
              onChange={e => setBill(Math.max(0, Number(e.target.value)))}
              className="w-full pl-10 pr-4 py-4 bg-muted/30 rounded-2xl border border-border font-black text-xl outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Tip % */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.tip}
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_TIPS.map(p => (
              <button
                key={p}
                onClick={() => setTipPct(p)}
                aria-pressed={tipPct === p}
                aria-label={`${t.tip} ${p}%`}
                className={`px-4 py-2 rounded-xl border-2 text-xs font-black transition-all ${tipPct === p ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-muted border-transparent text-muted-foreground hover:border-primary/40'}`}
              >
                {p}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={50}
              value={tipPct}
              aria-label={`${t.tip} ${tipPct}%`}
              onChange={e => setTipPct(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-14 text-right font-black text-lg">{tipPct}%</span>
          </div>
        </div>

        {/* Split */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.split}
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSplit(s => Math.max(1, s - 1))}
              aria-label={`${t.split} 감소`}
              className="w-12 h-12 rounded-2xl bg-muted border border-border font-black text-xl hover:bg-accent transition-colors"
            >−</button>
            <span className="text-4xl font-black w-12 text-center" aria-live="polite">{split}</span>
            <button
              onClick={() => setSplit(s => s + 1)}
              aria-label={`${t.split} 증가`}
              className="w-12 h-12 rounded-2xl bg-muted border border-border font-black text-xl hover:bg-accent transition-colors"
            >+</button>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="p-6 rounded-3xl bg-muted/40 border border-border text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.total}</p>
            <p className="text-3xl font-black">{currency}{fmt(total, locale)}</p>
          </div>
          <div className="p-6 rounded-3xl bg-primary/10 border-2 border-primary/30 text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">{t.each}</p>
            <p className="text-3xl font-black text-primary">{currency}{fmt(totalPerPerson, locale)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.tipPer}</p>
            <p className="text-xl font-black">{currency}{fmt(tipPerPerson, locale)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.splitPer}</p>
            <p className="text-xl font-black">{currency}{fmt(totalPerPerson, locale)}</p>
          </div>
        </div>
      </div>
    </GameContainer>
  );
};

export default TipCalculator;
