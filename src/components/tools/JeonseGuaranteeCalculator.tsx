import React, { useState, useMemo } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

const L: Record<Locale, {
  title: string; subtitle: string;
  propertyValue: string; jeonseDeposit: string; priorLoan: string; priorLien: string;
  calc: string; reset: string;
  safeRatio: string; netEquity: string; riskLevel: string;
  safe: string; caution: string; danger: string;
  safeDesc: string; cautionDesc: string; dangerDesc: string;
  coverage: string; ltvLabel: string; priorityLabel: string;
  tip: string; tipText: string;
  won: string;
}> = {
  ko: {
    title: '전세보증금 안전성 계산기',
    subtitle: 'Jeonse Deposit Safety Check',
    propertyValue: '주택 시세 (만원)',
    jeonseDeposit: '전세보증금 (만원)',
    priorLoan: '선순위 대출·담보 (만원)',
    priorLien: '선순위 임차권 등 기타 (만원)',
    calc: '안전성 확인',
    reset: '초기화',
    safeRatio: '보증금 비율',
    netEquity: '순 담보 여력',
    riskLevel: '위험도',
    safe: '안전',
    caution: '주의',
    danger: '위험',
    safeDesc: '경매 시 전세보증금 회수 가능성이 높습니다.',
    cautionDesc: '경매 시 전세보증금 일부를 돌려받지 못할 수 있습니다.',
    dangerDesc: '경매 시 전세보증금 상당 부분을 잃을 수 있습니다. 계약 전 법률 전문가 상담을 권장합니다.',
    coverage: '보증금 회수율',
    ltvLabel: '보증금 비율 (LTV)',
    priorityLabel: '선순위 채권 합계',
    tip: '💡 안전한 전세 계약 TIP',
    tipText: '일반적으로 전세보증금 + 선순위 채권이 주택 시세의 70~80% 이하일 때 비교적 안전합니다. 전세보증보험(HUG, SGI) 가입도 함께 검토하세요.',
    won: '만원',
  },
  en: {
    title: 'Jeonse Deposit Safety Calculator',
    subtitle: 'Korean Lease Deposit Risk Assessment',
    propertyValue: 'Property Market Value (₩10K)',
    jeonseDeposit: 'Jeonse Deposit (₩10K)',
    priorLoan: 'Prior Mortgages / Liens (₩10K)',
    priorLien: 'Other Prior Claims (₩10K)',
    calc: 'Check Safety',
    reset: 'Reset',
    safeRatio: 'Deposit-to-Value Ratio',
    netEquity: 'Net Equity Buffer',
    riskLevel: 'Risk Level',
    safe: 'Safe',
    caution: 'Caution',
    danger: 'Danger',
    safeDesc: 'High probability of full deposit recovery in foreclosure.',
    cautionDesc: 'Partial deposit loss is possible in foreclosure.',
    dangerDesc: 'Significant deposit loss risk in foreclosure. Consult a legal professional before signing.',
    coverage: 'Recovery Rate',
    ltvLabel: 'Deposit LTV Ratio',
    priorityLabel: 'Total Prior Claims',
    tip: '💡 Safe Jeonse Tips',
    tipText: 'Generally safe when (deposit + prior claims) / property value ≤ 70–80%. Also consider Jeonse deposit insurance (HUG or SGI).',
    won: '₩10K units',
  },
  ja: {
    title: '전세保証金安全性計算機',
    subtitle: '韓国チョンセ契約のリスク評価',
    propertyValue: '不動産時価（万ウォン）',
    jeonseDeposit: 'チョンセ保証金（万ウォン）',
    priorLoan: '先順位ローン・担保（万ウォン）',
    priorLien: 'その他先順位債権（万ウォン）',
    calc: '安全性確認',
    reset: 'リセット',
    safeRatio: '保証金比率',
    netEquity: '純担保余力',
    riskLevel: 'リスクレベル',
    safe: '安全',
    caution: '注意',
    danger: '危険',
    safeDesc: '競売時に全額回収できる可能性が高いです。',
    cautionDesc: '競売時に一部を回収できない可能性があります。',
    dangerDesc: '競売時に多くを失う可能性があります。専門家への相談をお勧めします。',
    coverage: '回収率',
    ltvLabel: '保証金LTV比率',
    priorityLabel: '先順位債権合計',
    tip: '💡 安全なチョンセのTIP',
    tipText: '一般的に（保証金+先順位債権）÷時価が70〜80%以下が比較的安全です。전세保険の加入もご検討ください。',
    won: '万ウォン',
  },
  fr: {
    title: 'Calculateur Sécurité Dépôt Jeonse',
    subtitle: 'Évaluation du risque du bail coréen',
    propertyValue: 'Valeur marché propriété (10K₩)',
    jeonseDeposit: 'Dépôt Jeonse (10K₩)',
    priorLoan: 'Hypothèques prioritaires (10K₩)',
    priorLien: 'Autres créances prioritaires (10K₩)',
    calc: 'Vérifier la sécurité',
    reset: 'Réinitialiser',
    safeRatio: 'Ratio dépôt/valeur',
    netEquity: 'Marge nette',
    riskLevel: 'Niveau de risque',
    safe: 'Sûr',
    caution: 'Attention',
    danger: 'Danger',
    safeDesc: 'Forte probabilité de récupération complète en cas de saisie.',
    cautionDesc: 'Perte partielle possible en cas de saisie.',
    dangerDesc: 'Risque important de perte en cas de saisie. Consultez un spécialiste avant de signer.',
    coverage: 'Taux de récupération',
    ltvLabel: 'Ratio LTV dépôt',
    priorityLabel: 'Total créances prioritaires',
    tip: '💡 Conseils sécurité Jeonse',
    tipText: 'Généralement sûr quand (dépôt + créances) / valeur ≤ 70–80%. Envisagez aussi une assurance dépôt Jeonse.',
    won: 'unités 10K₩',
  },
  es: {
    title: 'Calculadora Seguridad Depósito Jeonse',
    subtitle: 'Evaluación de riesgo del arrendamiento coreano',
    propertyValue: 'Valor de mercado (10K₩)',
    jeonseDeposit: 'Depósito Jeonse (10K₩)',
    priorLoan: 'Hipotecas prioritarias (10K₩)',
    priorLien: 'Otras cargas prioritarias (10K₩)',
    calc: 'Verificar seguridad',
    reset: 'Restablecer',
    safeRatio: 'Ratio depósito/valor',
    netEquity: 'Margen neto',
    riskLevel: 'Nivel de riesgo',
    safe: 'Seguro',
    caution: 'Precaución',
    danger: 'Peligro',
    safeDesc: 'Alta probabilidad de recuperación total en ejecución hipotecaria.',
    cautionDesc: 'Posible pérdida parcial en ejecución hipotecaria.',
    dangerDesc: 'Riesgo significativo de pérdida. Consulte un especialista antes de firmar.',
    coverage: 'Tasa de recuperación',
    ltvLabel: 'Ratio LTV depósito',
    priorityLabel: 'Total cargas prioritarias',
    tip: '💡 Consejos de seguridad Jeonse',
    tipText: 'Generalmente seguro cuando (depósito + cargas) / valor ≤ 70–80%. Considere también un seguro de depósito.',
    won: 'unidades 10K₩',
  },
  zh: {
    title: '全租保证金安全性计算器',
    subtitle: '韩国全租合约风险评估',
    propertyValue: '房屋市值（万韩元）',
    jeonseDeposit: '全租保证金（万韩元）',
    priorLoan: '先顺位贷款/抵押（万韩元）',
    priorLien: '其他先顺位债权（万韩元）',
    calc: '确认安全性',
    reset: '重置',
    safeRatio: '保证金比率',
    netEquity: '净担保余力',
    riskLevel: '风险等级',
    safe: '安全',
    caution: '注意',
    danger: '危险',
    safeDesc: '拍卖时全额收回保证金的可能性较高。',
    cautionDesc: '拍卖时可能无法全额收回保证金。',
    dangerDesc: '拍卖时可能损失大部分保证金。建议签约前咨询法律专业人士。',
    coverage: '回收率',
    ltvLabel: '保证金LTV比率',
    priorityLabel: '先顺位债权合计',
    tip: '💡 安全全租合约提示',
    tipText: '一般而言，（保证金+先顺位债权）÷房屋市值≤70~80%较为安全。也可考虑投保全租保险。',
    won: '万韩元',
  },
};

// Default values by locale
const DEFAULTS: Record<Locale, { propertyValue: number; jeonseDeposit: number; priorLoan: number; priorLien: number }> = {
  ko: { propertyValue: 50000, jeonseDeposit: 30000, priorLoan: 5000, priorLien: 0 },
  en: { propertyValue: 50000, jeonseDeposit: 30000, priorLoan: 5000, priorLien: 0 },
  ja: { propertyValue: 50000, jeonseDeposit: 30000, priorLoan: 5000, priorLien: 0 },
  fr: { propertyValue: 50000, jeonseDeposit: 30000, priorLoan: 5000, priorLien: 0 },
  es: { propertyValue: 50000, jeonseDeposit: 30000, priorLoan: 5000, priorLien: 0 },
  zh: { propertyValue: 50000, jeonseDeposit: 30000, priorLoan: 5000, priorLien: 0 },
};

function fmt(n: number): string {
  return n.toLocaleString();
}

const JeonseGuaranteeCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = L[locale] ?? L.ko;
  const def = DEFAULTS[locale] ?? DEFAULTS.ko;

  const [propertyValue, setPropertyValue] = useState(def.propertyValue);
  const [jeonseDeposit, setJeonseDeposit] = useState(def.jeonseDeposit);
  const [priorLoan, setPriorLoan] = useState(def.priorLoan);
  const [priorLien, setPriorLien] = useState(def.priorLien);
  const [calculated, setCalculated] = useState(true);

  const result = useMemo(() => {
    if (!calculated || propertyValue <= 0) return null;

    const totalPrior = priorLoan + priorLien;
    // Net equity available for tenant after all senior claims
    const netEquity = propertyValue - totalPrior;
    // How much of the deposit can be recovered
    const recoverable = Math.max(0, Math.min(jeonseDeposit, netEquity));
    const recoveryRate = jeonseDeposit > 0 ? Math.round((recoverable / jeonseDeposit) * 100) : 0;
    // Deposit as % of property value
    const depositLtv = propertyValue > 0 ? Math.round(((jeonseDeposit + totalPrior) / propertyValue) * 100) : 0;

    let risk: 'safe' | 'caution' | 'danger';
    if (depositLtv <= 70 && recoveryRate >= 100) {
      risk = 'safe';
    } else if (depositLtv <= 80 && recoveryRate >= 80) {
      risk = 'caution';
    } else {
      risk = 'danger';
    }

    return { totalPrior, netEquity, recoverable, recoveryRate, depositLtv, risk };
  }, [calculated, propertyValue, jeonseDeposit, priorLoan, priorLien]);

  const riskConfig = result ? {
    safe: { label: t.safe, desc: t.safeDesc, color: 'text-success', bg: 'bg-success/10 border-success/30', bar: 'bg-success', badge: 'bg-success/15 text-success' },
    caution: { label: t.caution, desc: t.cautionDesc, color: 'text-warning', bg: 'bg-warning/10 border-warning/30', bar: 'bg-warning', badge: 'bg-warning/15 text-warning' },
    danger: { label: t.danger, desc: t.dangerDesc, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', bar: 'bg-destructive', badge: 'bg-destructive/15 text-destructive' },
  }[result.risk] : null;

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="space-y-4 mb-6">
        {[
          { label: t.propertyValue, value: propertyValue, setter: setPropertyValue },
          { label: t.jeonseDeposit, value: jeonseDeposit, setter: setJeonseDeposit },
          { label: t.priorLoan, value: priorLoan, setter: setPriorLoan },
          { label: t.priorLien, value: priorLien, setter: setPriorLien },
        ].map(({ label, value, setter }) => (
          <div key={label} className="grid grid-cols-2 gap-3 items-center">
            <label className="text-sm font-bold text-muted-foreground">{label}</label>
            <input
              type="number"
              min={0}
              value={value}
              onChange={e => { setter(Number(e.target.value)); setCalculated(false); }}
              className="px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
            />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setCalculated(true)}
          className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors"
        >
          {t.calc}
        </button>
        <button
          onClick={() => {
            setPropertyValue(def.propertyValue);
            setJeonseDeposit(def.jeonseDeposit);
            setPriorLoan(def.priorLoan);
            setPriorLien(def.priorLien);
            setCalculated(true);
          }}
          className="px-5 py-3 rounded-2xl border border-border bg-muted/20 font-bold text-sm hover:bg-accent transition-colors"
        >
          {t.reset}
        </button>
      </div>

      {/* Results */}
      {result && riskConfig && (
        <div className="space-y-4">
          {/* Risk badge */}
          <div className={`p-5 rounded-2xl border ${riskConfig.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.riskLevel}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${riskConfig.badge}`}>{riskConfig.label}</span>
            </div>
            <p className="text-sm leading-relaxed">{riskConfig.desc}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-muted/20 border border-border">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.ltvLabel}</p>
              <p className={`text-3xl font-black ${riskConfig.color}`}>{result.depositLtv}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.coverage}</p>
              <p className={`text-3xl font-black ${riskConfig.color}`}>{result.recoveryRate}%</p>
            </div>
          </div>

          {/* Recovery bar */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border">
            <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
              <span>{t.coverage}</span>
              <span>{fmt(result.recoverable)} / {fmt(jeonseDeposit)} {t.won}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${riskConfig.bar}`}
                style={{ width: `${result.recoveryRate}%` }}
              />
            </div>
          </div>

          {/* Detail rows */}
          <div className="space-y-2">
            {[
              { label: t.propertyValue, value: fmt(propertyValue) },
              { label: t.priorityLabel, value: fmt(result.totalPrior) },
              { label: t.netEquity, value: fmt(Math.max(0, result.netEquity)) },
              { label: t.jeonseDeposit, value: fmt(jeonseDeposit) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-bold tabular-nums">{value} {t.won}</span>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="p-4 rounded-2xl bg-info/10 border border-info/30">
            <p className="text-xs font-black mb-1">{t.tip}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.tipText}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default JeonseGuaranteeCalculator;
