import { useState, useMemo } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

const LABELS: Record<Locale, {
  title: string; subtitle: string; calculate: string; reset: string
  monthlyIncome: string; monthlyExpense: string; currentSavings: string
  investReturn: string; years: string; inflationRate: string
  nominalWealth: string; realWealth: string; totalSaved: string; investmentGain: string
  currency: string; monthly: string; annual: string
  milestones: string; scenario: string; conservative: string; moderate: string; aggressive: string
  note: string; yearLabel: string; finalLabel: string
}> = {
  ko: {
    title: '10년 재산 시뮬레이터',
    subtitle: '월 저축과 투자 수익률로 미래 자산을 계산해보세요',
    calculate: '계산하기', reset: '초기화',
    monthlyIncome: '월 수입 (만원)', monthlyExpense: '월 지출 (만원)',
    currentSavings: '현재 자산 (만원)', investReturn: '연 투자 수익률 (%)',
    years: '목표 기간 (년)', inflationRate: '연 물가 상승률 (%)',
    nominalWealth: '명목 자산', realWealth: '실질 자산 (현재 가치)',
    totalSaved: '총 저축액', investmentGain: '투자 수익',
    currency: '만원', monthly: '월',  annual: '연',
    milestones: '자산 마일스톤', scenario: '시나리오',
    conservative: '보수적 (연 3%)', moderate: '중간 (연 6%)', aggressive: '적극적 (연 9%)',
    note: '이 시뮬레이터는 참고용입니다. 실제 투자 수익은 보장되지 않습니다.',
    yearLabel: '년 후', finalLabel: '최종 예상 자산',
  },
  en: {
    title: '10-Year Wealth Simulator',
    subtitle: 'Calculate your future assets with monthly savings and investment returns',
    calculate: 'Calculate', reset: 'Reset',
    monthlyIncome: 'Monthly Income (₩10k)', monthlyExpense: 'Monthly Expense (₩10k)',
    currentSavings: 'Current Savings (₩10k)', investReturn: 'Annual Return (%)',
    years: 'Target Period (years)', inflationRate: 'Annual Inflation (%)',
    nominalWealth: 'Nominal Wealth', realWealth: 'Real Wealth (today\'s value)',
    totalSaved: 'Total Saved', investmentGain: 'Investment Gain',
    currency: '₩10k', monthly: '/mo', annual: '/yr',
    milestones: 'Wealth Milestones', scenario: 'Scenario',
    conservative: 'Conservative (3%/yr)', moderate: 'Moderate (6%/yr)', aggressive: 'Aggressive (9%/yr)',
    note: 'This simulator is for reference only. Actual investment returns are not guaranteed.',
    yearLabel: 'years', finalLabel: 'Final Projected Wealth',
  },
  ja: {
    title: '10年資産シミュレーター',
    subtitle: '月次貯蓄と投資収益率で将来の資産を計算しましょう',
    calculate: '計算する', reset: 'リセット',
    monthlyIncome: '月収入（万円）', monthlyExpense: '月支出（万円）',
    currentSavings: '現在の資産（万円）', investReturn: '年間投資収益率（%）',
    years: '目標期間（年）', inflationRate: '年間インフレ率（%）',
    nominalWealth: '名目資産', realWealth: '実質資産（現在価値）',
    totalSaved: '総貯蓄額', investmentGain: '投資収益',
    currency: '万円', monthly: '/月', annual: '/年',
    milestones: '資産マイルストーン', scenario: 'シナリオ',
    conservative: '保守的（年3%）', moderate: '中間（年6%）', aggressive: '積極的（年9%）',
    note: 'このシミュレーターは参考用です。実際の投資収益は保証されません。',
    yearLabel: '年後', finalLabel: '最終予想資産',
  },
  fr: { title: 'Simulateur de Patrimoine 10 ans', subtitle: 'Calculez votre richesse future avec épargne mensuelle et rendement', calculate: 'Calculer', reset: 'Réinitialiser', monthlyIncome: 'Revenus mensuels', monthlyExpense: 'Dépenses mensuelles', currentSavings: 'Épargne actuelle', investReturn: 'Rendement annuel (%)', years: 'Période cible (ans)', inflationRate: 'Inflation annuelle (%)', nominalWealth: 'Patrimoine nominal', realWealth: 'Patrimoine réel', totalSaved: 'Total épargné', investmentGain: 'Gains d\'investissement', currency: '', monthly: '/mois', annual: '/an', milestones: 'Jalons patrimoniaux', scenario: 'Scénario', conservative: 'Conservateur (3%/an)', moderate: 'Modéré (6%/an)', aggressive: 'Agressif (9%/an)', note: 'Ce simulateur est à titre indicatif uniquement.', yearLabel: 'ans', finalLabel: 'Patrimoine final prévu' },
  es: { title: 'Simulador de Patrimonio a 10 años', subtitle: 'Calcula tu riqueza futura con ahorro mensual y rendimiento de inversión', calculate: 'Calcular', reset: 'Reiniciar', monthlyIncome: 'Ingresos mensuales', monthlyExpense: 'Gastos mensuales', currentSavings: 'Ahorros actuales', investReturn: 'Rendimiento anual (%)', years: 'Período objetivo (años)', inflationRate: 'Inflación anual (%)', nominalWealth: 'Patrimonio nominal', realWealth: 'Patrimonio real', totalSaved: 'Total ahorrado', investmentGain: 'Ganancias de inversión', currency: '', monthly: '/mes', annual: '/año', milestones: 'Hitos patrimoniales', scenario: 'Escenario', conservative: 'Conservador (3%/año)', moderate: 'Moderado (6%/año)', aggressive: 'Agresivo (9%/año)', note: 'Este simulador es solo de referencia.', yearLabel: 'años', finalLabel: 'Patrimonio final proyectado' },
  zh: { title: '10年财富模拟器', subtitle: '用月储蓄和投资回报率计算未来资产', calculate: '计算', reset: '重置', monthlyIncome: '月收入（万元）', monthlyExpense: '月支出（万元）', currentSavings: '当前资产（万元）', investReturn: '年投资回报率（%）', years: '目标期限（年）', inflationRate: '年通胀率（%）', nominalWealth: '名义财富', realWealth: '实际财富（现值）', totalSaved: '总储蓄', investmentGain: '投资收益', currency: '万元', monthly: '/月', annual: '/年', milestones: '财富里程碑', scenario: '情景', conservative: '保守型（年3%）', moderate: '中等型（年6%）', aggressive: '积极型（年9%）', note: '此模拟器仅供参考。实际投资回报不保证。', yearLabel: '年后', finalLabel: '最终预计财富' },
}

function fmt(n: number, locale: Locale): string {
  if (locale === 'ko') return `${Math.round(n).toLocaleString()}만원`
  if (locale === 'ja') return `${Math.round(n).toLocaleString()}万円`
  return Math.round(n * 10000).toLocaleString()
}

function fmtShort(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}억`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`
  return `${Math.round(n)}`
}

interface Props { locale: Locale }

export default function WealthSimulator({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const isKo = locale === 'ko' || locale === 'ja' || locale === 'zh'
  const defaultUnit = isKo ? 300 : 3000

  const [income, setIncome] = useState(defaultUnit)
  const [expense, setExpense] = useState(Math.round(defaultUnit * 0.7))
  const [savings, setSavings] = useState(Math.round(defaultUnit * 2))
  const [returnRate, setReturnRate] = useState(6)
  const [years, setYears] = useState(10)
  const [inflation, setInflation] = useState(2.5)
  const [scenario, setScenario] = useState<'conservative' | 'moderate' | 'aggressive' | null>(null)

  const monthlySaving = income - expense
  const annualSaving = monthlySaving * 12

  const applyScenario = (s: 'conservative' | 'moderate' | 'aggressive') => {
    setScenario(s)
    setReturnRate(s === 'conservative' ? 3 : s === 'moderate' ? 6 : 9)
  }

  const results = useMemo(() => {
    const r = returnRate / 100
    const monthly_r = r / 12
    const years_list = Array.from({ length: years }, (_, i) => i + 1)

    return years_list.map(y => {
      const months = y * 12
      const fv_savings = savings * Math.pow(1 + r, y)
      const fv_monthly = monthlySaving > 0
        ? monthlySaving * ((Math.pow(1 + monthly_r, months) - 1) / monthly_r)
        : 0
      const nominal = fv_savings + fv_monthly
      const real = nominal / Math.pow(1 + inflation / 100, y)
      const totalSaved = savings + monthlySaving * months
      const gain = nominal - totalSaved
      return { year: y, nominal, real, totalSaved, gain }
    })
  }, [income, expense, savings, returnRate, years, inflation, monthlySaving])

  const final = results[results.length - 1]

  const milestones = isKo
    ? [{ label: '1억', val: 10000 }, { label: '3억', val: 30000 }, { label: '5억', val: 50000 }, { label: '10억', val: 100000 }]
    : [{ label: '100M', val: 10000 }, { label: '300M', val: 30000 }, { label: '500M', val: 50000 }, { label: '1B', val: 100000 }]

  const reachedMilestones = milestones.map(m => {
    const hit = results.find(r => r.nominal >= m.val)
    return { ...m, year: hit?.year ?? null }
  })

  const maxNominal = Math.max(...results.map(r => r.nominal))

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-1">
        <div className="text-3xl">💰</div>
        <h1 className="text-xl font-bold">{l.title}</h1>
        <p className="text-sm text-muted-foreground">{l.subtitle}</p>
      </div>

      {/* Scenario buttons */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {(['conservative', 'moderate', 'aggressive'] as const).map(s => (
          <button key={s} onClick={() => applyScenario(s)}
            className={`py-2 px-3 rounded-lg border text-center transition-all ${scenario === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
            {l[s]}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: l.monthlyIncome, val: income, set: setIncome, min: 0, max: isKo ? 5000 : 50000, step: isKo ? 10 : 100 },
          { label: l.monthlyExpense, val: expense, set: setExpense, min: 0, max: isKo ? 5000 : 50000, step: isKo ? 10 : 100 },
          { label: l.currentSavings, val: savings, set: setSavings, min: 0, max: isKo ? 100000 : 1000000, step: isKo ? 100 : 1000 },
          { label: l.investReturn, val: returnRate, set: setReturnRate, min: 0, max: 20, step: 0.5, suffix: '%' },
          { label: l.years, val: years, set: setYears, min: 1, max: 30, step: 1 },
          { label: l.inflationRate, val: inflation, set: setInflation, min: 0, max: 10, step: 0.5, suffix: '%' },
        ].map(({ label, val, set, min, max, step, suffix }) => (
          <div key={label} className="space-y-1">
            <label className="text-xs text-muted-foreground">{label}</label>
            <div className="flex items-center gap-1.5">
              <input type="range" min={min} max={max} step={step} value={val}
                onChange={e => set(parseFloat(e.target.value))}
                className="flex-1 accent-primary" />
              <span className="text-sm font-medium w-14 text-right">{val}{suffix ?? ''}</span>
            </div>
          </div>
        ))}
      </div>

      {monthlySaving < 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ {locale === 'ko' ? '지출이 수입보다 많습니다!' : 'Expenses exceed income!'}
        </div>
      )}

      {/* Results */}
      {final && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{l.nominalWealth} ({years}{l.yearLabel})</p>
              <p className="text-xl font-black text-primary">{isKo ? `${fmtShort(final.nominal)}만원` : fmt(final.nominal, locale)}</p>
            </div>
            <div className="rounded-2xl bg-secondary border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{l.realWealth}</p>
              <p className="text-xl font-black">{isKo ? `${fmtShort(final.real)}만원` : fmt(final.real, locale)}</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">{l.totalSaved}</p>
              <p className="text-base font-bold">{isKo ? `${fmtShort(final.totalSaved)}만원` : fmt(final.totalSaved, locale)}</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">{l.investmentGain}</p>
              <p className="text-base font-bold text-green-600">+{isKo ? `${fmtShort(final.gain)}만원` : fmt(final.gain, locale)}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border p-4">
            <p className="text-xs text-muted-foreground mb-3">{l.finalLabel}</p>
            <div className="flex items-end gap-1 h-28">
              {results.map(r => (
                <div key={r.year} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full bg-primary/20 rounded-sm relative" style={{ height: `${(r.nominal / maxNominal) * 100}%` }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-primary/60 rounded-sm" style={{ height: `${(r.real / r.nominal) * 100}%` }} />
                  </div>
                  {(r.year % Math.ceil(years / 5) === 0 || r.year === years) && (
                    <span className="text-[9px] text-muted-foreground">{r.year}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary/20 inline-block" />{l.nominalWealth}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary/60 inline-block" />{l.realWealth}</span>
            </div>
          </div>

          {/* Milestones */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{l.milestones}</h3>
            <div className="grid grid-cols-2 gap-2">
              {reachedMilestones.map(m => (
                <div key={m.label} className={`rounded-xl border p-3 text-center text-sm ${m.year ? 'bg-green-50 border-green-200' : 'opacity-50'}`}>
                  <p className="font-bold">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.year ? `${m.year}${l.yearLabel}` : '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t pt-3">{l.note}</p>
    </div>
  )
}
