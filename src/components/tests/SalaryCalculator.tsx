import { useState, useMemo } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

const LABELS: Record<Locale, {
  title: string; subtitle: string; note: string
  grossLabel: string; dependentsLabel: string; nonTaxableLabel: string
  calculate: string; reset: string
  grossIncome: string; deductions: string; netIncome: string
  nationalPension: string; healthInsurance: string; ltcInsurance: string
  employmentInsurance: string; incomeTax: string; localTax: string
  totalDeduction: string; takeHome: string; effectiveRate: string
  monthly: string; annual: string
  incomeUnit: string
}> = {
  ko: {
    title: '월급 실수령액 계산기',
    subtitle: '2024년 기준 4대 보험 + 소득세 자동 계산',
    note: '이 계산기는 참고용입니다. 실제 공제액은 회사 규정·소득공제 항목에 따라 달라질 수 있습니다.',
    grossLabel: '월 세전 급여 (만원)', dependentsLabel: '부양가족 수 (본인 포함)',
    nonTaxableLabel: '비과세 수당 (만원, 식대 등)',
    calculate: '계산하기', reset: '초기화',
    grossIncome: '세전 급여', deductions: '공제 내역',
    netIncome: '실수령액', nationalPension: '국민연금 (4.5%)',
    healthInsurance: '건강보험 (3.545%)', ltcInsurance: '장기요양 (건강보험의 12.81%)',
    employmentInsurance: '고용보험 (0.9%)', incomeTax: '근로소득세',
    localTax: '지방소득세 (소득세의 10%)', totalDeduction: '총 공제액',
    takeHome: '실수령액', effectiveRate: '실효 세율',
    monthly: '월', annual: '연',
    incomeUnit: '만원',
  },
  en: {
    title: 'Korean Salary After-Tax Calculator',
    subtitle: 'Auto-calculate 4 social insurances + income tax (2024 standard)',
    note: 'This calculator is for reference. Actual deductions may vary by company policy and tax credits.',
    grossLabel: 'Monthly Gross (₩10k)', dependentsLabel: 'Dependents (incl. self)',
    nonTaxableLabel: 'Non-taxable allowance (₩10k)',
    calculate: 'Calculate', reset: 'Reset',
    grossIncome: 'Gross Income', deductions: 'Deductions',
    netIncome: 'Net Income', nationalPension: 'National Pension (4.5%)',
    healthInsurance: 'Health Insurance (3.545%)', ltcInsurance: 'Long-term Care (12.81% of HI)',
    employmentInsurance: 'Employment Insurance (0.9%)', incomeTax: 'Income Tax',
    localTax: 'Local Income Tax (10% of IT)', totalDeduction: 'Total Deductions',
    takeHome: 'Take-Home Pay', effectiveRate: 'Effective Tax Rate',
    monthly: '/mo', annual: '/yr',
    incomeUnit: '₩10k',
  },
  ja: {
    title: '韓国給与手取り額計算機', subtitle: '4大保険+所得税自動計算（2024年基準）',
    note: 'この計算機は参考用です。実際の控除額は会社規定・所得控除項目によって異なる場合があります。',
    grossLabel: '月額税前給与（万ウォン）', dependentsLabel: '扶養家族数（本人含む）',
    nonTaxableLabel: '非課税手当（万ウォン）',
    calculate: '計算する', reset: 'リセット',
    grossIncome: '税前給与', deductions: '控除内訳',
    netIncome: '手取り額', nationalPension: '国民年金（4.5%）',
    healthInsurance: '健康保険（3.545%）', ltcInsurance: '介護保険（健康保険の12.81%）',
    employmentInsurance: '雇用保険（0.9%）', incomeTax: '勤労所得税',
    localTax: '地方所得税（所得税の10%）', totalDeduction: '総控除額',
    takeHome: '手取り額', effectiveRate: '実効税率',
    monthly: '/月', annual: '/年',
    incomeUnit: '万ウォン',
  },
  fr: { title: 'Calculateur de Salaire Net (Corée)', subtitle: 'Calcul automatique des cotisations sociales + impôt sur le revenu', note: 'Ce calculateur est à titre indicatif.', grossLabel: 'Salaire brut mensuel (10k₩)', dependentsLabel: 'Personnes à charge (incl. soi)', nonTaxableLabel: 'Allocations non imposables (10k₩)', calculate: 'Calculer', reset: 'Réinitialiser', grossIncome: 'Salaire brut', deductions: 'Déductions', netIncome: 'Salaire net', nationalPension: 'Retraite nationale (4.5%)', healthInsurance: 'Assurance maladie (3.545%)', ltcInsurance: 'Soins longue durée (12.81% AM)', employmentInsurance: 'Assurance chômage (0.9%)', incomeTax: 'Impôt sur le revenu', localTax: 'Impôt local (10% IR)', totalDeduction: 'Total déductions', takeHome: 'Salaire net', effectiveRate: 'Taux effectif', monthly: '/mois', annual: '/an', incomeUnit: '10k₩' },
  es: { title: 'Calculadora de Salario Neto (Corea)', subtitle: 'Cálculo automático de seguros sociales + IRPF', note: 'Esta calculadora es solo de referencia.', grossLabel: 'Salario bruto mensual (10k₩)', dependentsLabel: 'Dependientes (incl. uno mismo)', nonTaxableLabel: 'Asignaciones no gravables (10k₩)', calculate: 'Calcular', reset: 'Reiniciar', grossIncome: 'Salario bruto', deductions: 'Deducciones', netIncome: 'Salario neto', nationalPension: 'Pensión nacional (4.5%)', healthInsurance: 'Seguro médico (3.545%)', ltcInsurance: 'Cuidados a largo plazo (12.81% SM)', employmentInsurance: 'Seguro de desempleo (0.9%)', incomeTax: 'IRPF', localTax: 'Impuesto local (10% IRPF)', totalDeduction: 'Total deducciones', takeHome: 'Salario neto', effectiveRate: 'Tasa efectiva', monthly: '/mes', annual: '/año', incomeUnit: '10k₩' },
  zh: { title: '韩国薪资税后计算器', subtitle: '自动计算四大保险+所得税（2024年标准）', note: '此计算器仅供参考。', grossLabel: '月薪税前（万韩元）', dependentsLabel: '赡养人口（含本人）', nonTaxableLabel: '免税津贴（万韩元）', calculate: '计算', reset: '重置', grossIncome: '税前薪资', deductions: '扣除明细', netIncome: '税后薪资', nationalPension: '国民年金（4.5%）', healthInsurance: '健康保险（3.545%）', ltcInsurance: '长期护理（医保12.81%）', employmentInsurance: '就业保险（0.9%）', incomeTax: '劳动所得税', localTax: '地方所得税（所得税10%）', totalDeduction: '总扣除额', takeHome: '实收薪资', effectiveRate: '实效税率', monthly: '/月', annual: '/年', incomeUnit: '万元' },
}

// 2024 Korean income tax simplified brackets (monthly taxable, KRW)
function calcIncomeTax(monthlyTaxable: number, dependents: number): number {
  // Simplified earned income tax withholding (근로소득 간이세액표 근사)
  const annual = monthlyTaxable * 12
  let tax = 0
  if (annual <= 14000000) tax = annual * 0.06
  else if (annual <= 50000000) tax = 840000 + (annual - 14000000) * 0.15
  else if (annual <= 88000000) tax = 6240000 + (annual - 50000000) * 0.24
  else if (annual <= 150000000) tax = 15360000 + (annual - 88000000) * 0.35
  else if (annual <= 300000000) tax = 37060000 + (annual - 150000000) * 0.38
  else tax = 94060000 + (annual - 300000000) * 0.40

  // Basic deduction: 1.5M per person per year
  const deduction = dependents * 1500000
  tax = Math.max(0, tax - deduction * 0.15)
  return Math.max(0, Math.round(tax / 12))
}

function f(n: number): string {
  return Math.round(n).toLocaleString()
}

interface Props { locale: Locale }

export default function SalaryCalculator({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const isKo = locale === 'ko' || locale === 'ja' || locale === 'zh'

  const [gross, setGross] = useState(300)
  const [dependents, setDependents] = useState(1)
  const [nonTaxable, setNonTaxable] = useState(10)

  const result = useMemo(() => {
    const grossKRW = gross * 10000
    const nonTaxableKRW = nonTaxable * 10000
    const taxableBase = grossKRW - nonTaxableKRW

    const pension = Math.round(grossKRW * 0.045)
    const health = Math.round(grossKRW * 0.03545)
    const ltc = Math.round(health * 0.1281)
    const employment = Math.round(grossKRW * 0.009)
    const incomeTaxAmt = calcIncomeTax(taxableBase, dependents)
    const localTaxAmt = Math.round(incomeTaxAmt * 0.1)

    const totalDed = pension + health + ltc + employment + incomeTaxAmt + localTaxAmt
    const net = grossKRW - totalDed
    const effectiveRate = ((totalDed / grossKRW) * 100).toFixed(1)

    return { gross: grossKRW, pension, health, ltc, employment, incomeTax: incomeTaxAmt, localTax: localTaxAmt, totalDed, net, effectiveRate }
  }, [gross, dependents, nonTaxable])

  const unit = isKo ? '원' : '₩'

  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <div className="text-3xl">💼</div>
        <h1 className="text-xl font-bold">{l.title}</h1>
        <p className="text-sm text-muted-foreground">{l.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">{l.grossLabel}</label>
          <div className="flex items-center gap-3">
            <input type="range" min={100} max={2000} step={10} value={gross}
              onChange={e => setGross(+e.target.value)} className="flex-1 accent-primary" />
            <span className="text-base font-bold w-20 text-right">{gross}<span className="text-xs text-muted-foreground ml-1">{l.incomeUnit}</span></span>
          </div>
          <p className="text-xs text-muted-foreground text-right">{locale === 'ko' ? `연봉 ${(gross * 12).toLocaleString()}만원` : `Annual: ${(gross * 12).toLocaleString()}${l.incomeUnit}`}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{l.dependentsLabel}</label>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={6} step={1} value={dependents}
                onChange={e => setDependents(+e.target.value)} className="flex-1 accent-primary" />
              <span className="text-sm font-bold w-6">{dependents}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{l.nonTaxableLabel}</label>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={30} step={1} value={nonTaxable}
                onChange={e => setNonTaxable(+e.target.value)} className="flex-1 accent-primary" />
              <span className="text-sm font-bold w-8">{nonTaxable}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="space-y-3">
        {/* Headline */}
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">{l.takeHome} {l.monthly}</p>
          <p className="text-3xl font-black text-primary">{f(result.net / 10000)}<span className="text-base font-normal text-muted-foreground ml-1">{l.incomeUnit}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{locale === 'ko' ? `연 ${f(result.net * 12 / 10000)}만원` : `${l.annual} ${f(result.net * 12 / 10000)}${l.incomeUnit}`} · {l.effectiveRate} {result.effectiveRate}%</p>
        </div>

        {/* Deduction breakdown */}
        <div className="rounded-xl border divide-y text-sm">
          {[
            { label: l.nationalPension, val: result.pension },
            { label: l.healthInsurance, val: result.health },
            { label: l.ltcInsurance, val: result.ltc },
            { label: l.employmentInsurance, val: result.employment },
            { label: l.incomeTax, val: result.incomeTax },
            { label: l.localTax, val: result.localTax },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">-{f(val / 10000)}{locale === 'ko' ? '만원' : l.incomeUnit}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-muted/50 font-semibold">
            <span>{l.totalDeduction}</span>
            <span className="text-red-600">-{f(result.totalDed / 10000)}{locale === 'ko' ? '만원' : l.incomeUnit}</span>
          </div>
        </div>

        {/* Summary bar */}
        <div className="rounded-xl border p-3">
          <div className="flex gap-0 h-4 rounded-full overflow-hidden">
            <div className="bg-primary" style={{ width: `${(result.net / result.gross) * 100}%` }} title={l.takeHome} />
            <div className="bg-red-300" style={{ width: `${((result.incomeTax + result.localTax) / result.gross) * 100}%` }} title={l.incomeTax} />
            <div className="bg-amber-300 flex-1" title={l.nationalPension} />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary inline-block" />{l.takeHome} {((result.net / result.gross) * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-300 inline-block" />{locale === 'ko' ? '세금' : 'Tax'} {(((result.incomeTax + result.localTax) / result.gross) * 100).toFixed(1)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-300 inline-block" />{locale === 'ko' ? '보험료' : 'Insurance'} {(((result.pension + result.health + result.ltc + result.employment) / result.gross) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground border-t pt-3">{l.note}</p>
    </div>
  )
}
