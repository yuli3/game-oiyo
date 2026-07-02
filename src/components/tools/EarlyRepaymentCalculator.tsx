import React, { useState, useMemo } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

const L: Record<Locale, {
  title: string; subtitle: string;
  principal: string; rate: string; term: string;
  elapsed: string; overpay: string;
  monthlyPayment: string; remainingBalance: string;
  interestSaved: string; newTerm: string;
  penalty: string; penaltyNote: string;
  netSaving: string; summary: string;
  months: string; won: string; years: string;
  currencySymbol: string;
}> = {
  ko: {
    title: '중도상환 계산기', subtitle: 'Early Repayment Calculator',
    principal: '대출 원금', rate: '연 이자율', term: '총 대출 기간',
    elapsed: '경과 개월 수', overpay: '중도상환 금액',
    monthlyPayment: '월 상환액', remainingBalance: '잔여 원금',
    interestSaved: '이자 절감액', newTerm: '단축 기간',
    penalty: '중도상환 수수료율', penaltyNote: '통상 0~2%. 대출 후 3년 이후 면제되는 경우 많음',
    netSaving: '순 절감액 (이자 절감 − 수수료)', summary: '결과 요약',
    months: '개월', won: '원', years: '년', currencySymbol: '₩',
  },
  en: {
    title: 'Early Repayment Calculator', subtitle: 'Loan Payoff Savings',
    principal: 'Loan Principal', rate: 'Annual Interest Rate', term: 'Loan Term',
    elapsed: 'Months Elapsed', overpay: 'Extra Payment Amount',
    monthlyPayment: 'Monthly Payment', remainingBalance: 'Remaining Balance',
    interestSaved: 'Interest Saved', newTerm: 'Term Reduction',
    penalty: 'Prepayment Penalty Rate', penaltyNote: 'Usually 0–2%. Often waived after 3 years.',
    netSaving: 'Net Saving (saved interest − penalty)', summary: 'Summary',
    months: 'mo', won: '', years: 'yr', currencySymbol: '$',
  },
  ja: {
    title: '繰上返済計算機', subtitle: 'Early Repayment Calculator',
    principal: '借入元金', rate: '年利率', term: '返済期間',
    elapsed: '経過月数', overpay: '繰上返済額',
    monthlyPayment: '月返済額', remainingBalance: '残高',
    interestSaved: '利息節約額', newTerm: '短縮期間',
    penalty: '繰上返済手数料率', penaltyNote: '通常0〜2%。3年後免除のケース多い',
    netSaving: '実質節約額（利息節約−手数料）', summary: '結果',
    months: 'ヶ月', won: '円', years: '年', currencySymbol: '¥',
  },
  fr: {
    title: 'Calculateur remboursement anticipé', subtitle: 'Early Repayment Calculator',
    principal: 'Capital emprunté', rate: 'Taux annuel', term: 'Durée du prêt',
    elapsed: 'Mois écoulés', overpay: 'Montant du remboursement anticipé',
    monthlyPayment: 'Mensualité', remainingBalance: 'Capital restant dû',
    interestSaved: 'Intérêts économisés', newTerm: 'Durée réduite',
    penalty: 'Taux pénalité remboursement', penaltyNote: 'Généralement 0–2%. Souvent exonéré après 3 ans.',
    netSaving: 'Économie nette (intérêts − pénalité)', summary: 'Résumé',
    months: 'mois', won: '€', years: 'an(s)', currencySymbol: '€',
  },
  es: {
    title: 'Calculadora amortización anticipada', subtitle: 'Early Repayment Calculator',
    principal: 'Capital del préstamo', rate: 'Tasa anual', term: 'Plazo del préstamo',
    elapsed: 'Meses transcurridos', overpay: 'Monto a amortizar',
    monthlyPayment: 'Cuota mensual', remainingBalance: 'Capital pendiente',
    interestSaved: 'Intereses ahorrados', newTerm: 'Reducción del plazo',
    penalty: 'Comisión cancelación anticipada', penaltyNote: 'Normalmente 0–2%. Suele eximirse tras 3 años.',
    netSaving: 'Ahorro neto (intereses − comisión)', summary: 'Resumen',
    months: 'meses', won: '€', years: 'año(s)', currencySymbol: '€',
  },
  zh: {
    title: '提前还款计算器', subtitle: 'Early Repayment Calculator',
    principal: '贷款本金', rate: '年利率', term: '贷款期限',
    elapsed: '已还月数', overpay: '提前还款金额',
    monthlyPayment: '月还款额', remainingBalance: '剩余本金',
    interestSaved: '节省利息', newTerm: '缩短期限',
    penalty: '提前还款手续费率', penaltyNote: '通常0–2%。3年后通常免除',
    netSaving: '实际节省（利息节省−手续费）', summary: '计算结果',
    months: '个月', won: '元', years: '年', currencySymbol: '¥',
  },
};

const DEFAULTS: Record<Locale, { principal: number; rate: number; term: number; elapsed: number; overpay: number }> = {
  ko: { principal: 300000000, rate: 4.5, term: 300, elapsed: 24, overpay: 50000000 },
  en: { principal: 200000, rate: 6.5, term: 360, elapsed: 24, overpay: 20000 },
  ja: { principal: 30000000, rate: 2.0, term: 360, elapsed: 24, overpay: 3000000 },
  fr: { principal: 200000, rate: 3.5, term: 300, elapsed: 24, overpay: 20000 },
  es: { principal: 180000, rate: 3.5, term: 300, elapsed: 24, overpay: 20000 },
  zh: { principal: 5000000, rate: 3.5, term: 360, elapsed: 24, overpay: 500000 },
};

function fmtMoney(n: number, locale: Locale) {
  const localeStr: Record<Locale, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR', es: 'es-ES', zh: 'zh-CN', };
  return new Intl.NumberFormat(localeStr[locale], { maximumFractionDigits: 0 }).format(Math.round(n));
}

function calcMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (annualRate === 0) return principal / termMonths;
  const r = annualRate / 100 / 12;
  return principal * r * Math.pow(1 + r, termMonths) / (Math.pow(1 + r, termMonths) - 1);
}

function calcRemainingBalance(principal: number, annualRate: number, termMonths: number, elapsed: number): number {
  if (annualRate === 0) return principal * (1 - elapsed / termMonths);
  const r = annualRate / 100 / 12;
  const monthly = calcMonthlyPayment(principal, annualRate, termMonths);
  return monthly * (1 - Math.pow(1 + r, -(termMonths - elapsed))) / r;
}

function calcInterestTotal(balance: number, annualRate: number, months: number): number {
  const monthly = calcMonthlyPayment(balance, annualRate, months);
  return monthly * months - balance;
}

function calcNewTerm(balance: number, annualRate: number, monthly: number): number {
  if (annualRate === 0) return Math.ceil(balance / monthly);
  const r = annualRate / 100 / 12;
  return Math.ceil(-Math.log(1 - balance * r / monthly) / Math.log(1 + r));
}

const EarlyRepaymentCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = L[locale] ?? L.ko;
  const def = DEFAULTS[locale] ?? DEFAULTS.ko;

  const [principal, setPrincipal] = useState(def.principal);
  const [rate, setRate] = useState(def.rate);
  const [term, setTerm] = useState(def.term);
  const [elapsed, setElapsed] = useState(def.elapsed);
  const [overpay, setOverpay] = useState(def.overpay);
  const [penaltyPct, setPenaltyPct] = useState(1.2);

  const result = useMemo(() => {
    const remaining = calcRemainingBalance(principal, rate, term, Math.min(elapsed, term));
    const leftMonths = term - elapsed;
    if (leftMonths <= 0 || remaining <= 0) return null;

    const monthly = calcMonthlyPayment(principal, rate, term);
    const originalInterest = calcInterestTotal(remaining, rate, leftMonths);

    // After overpayment
    const effectiveOverpay = Math.min(overpay, remaining);
    const newBalance = remaining - effectiveOverpay;
    if (newBalance <= 0) {
      // Full repayment
      const penalty = remaining * (penaltyPct / 100);
      return { monthly, remaining, interestSaved: originalInterest, termReduction: leftMonths, netSaving: originalInterest - penalty, penalty, fullRepay: true };
    }

    const newInterest = calcInterestTotal(newBalance, rate, leftMonths);
    const interestSaved = originalInterest - newInterest;
    const penalty = effectiveOverpay * (penaltyPct / 100);
    const netSaving = interestSaved - penalty;

    // Calculate new term if keeping same monthly payment
    const newTerm = calcNewTerm(newBalance, rate, monthly);
    const termReduction = leftMonths - newTerm;

    return { monthly, remaining, interestSaved, termReduction, netSaving, penalty, fullRepay: false };
  }, [principal, rate, term, elapsed, overpay, penaltyPct]);

  const curr = L[locale].currencySymbol;

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => { setPrincipal(def.principal); setRate(def.rate); setTerm(def.term); setElapsed(def.elapsed); setOverpay(def.overpay); setPenaltyPct(1.2); }}
    >
      <div className="flex flex-col gap-6">
        {/* Loan details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.principal} ({curr})</label>
            <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value))} min={0} className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:border-primary transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.rate} (%)</label>
            <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} min={0} max={30} step={0.1} className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:border-primary transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.term} ({t.months})</label>
            <div className="flex items-center gap-2">
              <input type="range" min={12} max={600} step={12} value={term} onChange={e => setTerm(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="w-20 text-right font-black text-sm">{term}{t.months}<br/><span className="text-[10px] text-muted-foreground">{(term/12).toFixed(0)}{t.years}</span></span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.elapsed} ({t.months})</label>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={term - 1} value={elapsed} onChange={e => setElapsed(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="w-20 text-right font-black text-sm">{elapsed}{t.months}</span>
            </div>
          </div>
        </div>

        {/* Overpayment */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.overpay} ({curr})</label>
          <input type="number" value={overpay} onChange={e => setOverpay(Number(e.target.value))} min={0} className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:border-primary transition-colors" />
        </div>

        {/* Penalty */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.penalty} (%)</label>
          <p className="text-[10px] text-muted-foreground">{t.penaltyNote}</p>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={5} step={0.1} value={penaltyPct} onChange={e => setPenaltyPct(Number(e.target.value))} className="flex-1 accent-primary" />
            <span className="w-12 text-right font-black">{penaltyPct}%</span>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.summary}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.monthlyPayment}</p>
                <p className="text-lg font-black">{curr}{fmtMoney(result.monthly, locale)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.remainingBalance}</p>
                <p className="text-lg font-black">{curr}{fmtMoney(result.remaining, locale)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-success/10 border border-success/30 text-center space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-success">{t.interestSaved}</p>
                <p className="text-lg font-black text-success">+{curr}{fmtMoney(result.interestSaved, locale)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.newTerm}</p>
                <p className="text-lg font-black">−{result.termReduction}{t.months}</p>
                <p className="text-[10px] text-muted-foreground">≈ {(result.termReduction/12).toFixed(1)}{t.years}</p>
              </div>
            </div>
            <div className={`p-6 rounded-3xl border-2 text-center space-y-1 ${result.netSaving > 0 ? 'bg-success/10 border-success/40' : 'bg-warning/10 border-warning/30'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${result.netSaving > 0 ? 'text-success' : 'text-warning'}`}>{t.netSaving}</p>
              <p className={`text-4xl font-black ${result.netSaving > 0 ? 'text-success' : 'text-warning'}`}>{result.netSaving >= 0 ? '+' : ''}{curr}{fmtMoney(result.netSaving, locale)}</p>
              {result.penalty > 0 && <p className="text-xs text-muted-foreground">{t.penalty}: {curr}{fmtMoney(result.penalty, locale)}</p>}
            </div>
          </div>
        )}
      </div>
    </GameContainer>
  );
};

export default EarlyRepaymentCalculator;
