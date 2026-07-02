import React, { useState, useMemo } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

const L: Record<Locale, {
  title: string; subtitle: string;
  lastPeriodLabel: string; cycleLengthLabel: string; periodDurationLabel: string;
  calcBtn: string; resetBtn: string;
  nextPeriod: string; ovulationDay: string; fertileWindow: string; lutealPhase: string;
  next3Cycles: string; cycleLabel: string;
  days: string; daysUnit: string;
  phaseFollicular: string; phaseOvulation: string; phaseLuteal: string;
  today: string; todayIs: string;
  tipTitle: string; tips: string[];
  disclaimer: string;
  daysUntil: string; daysAgo: string; daysAway: string;
}> = {
  ko: {
    title: '생리 주기 계산기', subtitle: '다음 생리일·배란일·가임기 자동 계산',
    lastPeriodLabel: '마지막 생리 시작일', cycleLengthLabel: '평균 주기 (일)', periodDurationLabel: '생리 기간 (일)',
    calcBtn: '계산하기', resetBtn: '초기화',
    nextPeriod: '다음 생리 예정일', ovulationDay: '배란 예정일', fertileWindow: '가임기', lutealPhase: '황체기',
    next3Cycles: '향후 3주기 예측',
    cycleLabel: '주기',
    days: '일', daysUnit: '일',
    phaseFollicular: '난포기', phaseOvulation: '배란기', phaseLuteal: '황체기',
    today: '오늘', todayIs: '오늘은',
    tipTitle: '건강 팁',
    tips: [
      '생리 주기는 일반적으로 21~35일이 정상 범위입니다.',
      '배란은 주기 시작 후 약 14일째에 일어나지만, 개인차가 있습니다.',
      '가임기는 배란 5일 전부터 배란 당일까지로, 이 기간에 임신 가능성이 높습니다.',
      '주기가 불규칙하거나 통증이 심하면 의료 전문가와 상담하세요.',
    ],
    disclaimer: '이 계산기는 일반적인 주기를 가정한 예측입니다. 의료 목적으로 사용하지 마세요.',
    daysUntil: '일 후', daysAgo: '일 전', daysAway: '일',
  },
  en: {
    title: 'Menstrual Cycle Calculator', subtitle: 'Predict your next period, ovulation & fertile window',
    lastPeriodLabel: 'Last Period Start Date', cycleLengthLabel: 'Average Cycle Length (days)', periodDurationLabel: 'Period Duration (days)',
    calcBtn: 'Calculate', resetBtn: 'Reset',
    nextPeriod: 'Next Period', ovulationDay: 'Ovulation Day', fertileWindow: 'Fertile Window', lutealPhase: 'Luteal Phase',
    next3Cycles: 'Next 3 Cycles Forecast',
    cycleLabel: 'Cycle',
    days: 'days', daysUnit: 'days',
    phaseFollicular: 'Follicular', phaseOvulation: 'Ovulation', phaseLuteal: 'Luteal',
    today: 'Today', todayIs: 'Today is',
    tipTitle: 'Health Tips',
    tips: [
      'A normal menstrual cycle ranges from 21 to 35 days.',
      'Ovulation typically occurs around day 14 of the cycle, but varies per person.',
      'The fertile window spans from 5 days before ovulation to ovulation day itself.',
      'If your cycle is irregular or painful, consult a healthcare professional.',
    ],
    disclaimer: 'This calculator assumes a typical cycle. Do not use it for medical purposes.',
    daysUntil: 'days away', daysAgo: 'days ago', daysAway: 'days',
  },
  ja: {
    title: '月経周期計算機', subtitle: '次の生理日・排卵日・妊娠可能期間を自動計算',
    lastPeriodLabel: '最終生理開始日', cycleLengthLabel: '平均周期（日）', periodDurationLabel: '生理期間（日）',
    calcBtn: '計算する', resetBtn: 'リセット',
    nextPeriod: '次回生理予定日', ovulationDay: '排卵予定日', fertileWindow: '妊娠可能期間', lutealPhase: '黄体期',
    next3Cycles: '今後3周期の予測',
    cycleLabel: '周期',
    days: '日', daysUnit: '日',
    phaseFollicular: '卵胞期', phaseOvulation: '排卵期', phaseLuteal: '黄体期',
    today: '今日', todayIs: '今日は',
    tipTitle: '健康アドバイス',
    tips: [
      '正常な月経周期は21〜35日です。',
      '排卵は通常、周期の約14日目に起こりますが、個人差があります。',
      '妊娠可能期間は排卵5日前から排卵当日まで続きます。',
      '周期が不規則または痛みが強い場合は医療専門家に相談してください。',
    ],
    disclaimer: 'この計算機は一般的な周期を前提とした予測です。医療目的には使用しないでください。',
    daysUntil: '日後', daysAgo: '日前', daysAway: '日',
  },
  fr: {
    title: 'Calculateur de Cycle Menstruel', subtitle: "Prédisez vos prochaines règles, l'ovulation et la fenêtre fertile",
    lastPeriodLabel: 'Date de début des dernières règles', cycleLengthLabel: 'Durée moyenne du cycle (jours)', periodDurationLabel: 'Durée des règles (jours)',
    calcBtn: 'Calculer', resetBtn: 'Réinitialiser',
    nextPeriod: 'Prochaines règles', ovulationDay: "Jour d'ovulation", fertileWindow: 'Fenêtre fertile', lutealPhase: 'Phase lutéale',
    next3Cycles: '3 prochains cycles',
    cycleLabel: 'Cycle',
    days: 'jours', daysUnit: 'jours',
    phaseFollicular: 'Folliculaire', phaseOvulation: 'Ovulation', phaseLuteal: 'Lutéale',
    today: "Aujourd'hui", todayIs: "Aujourd'hui c'est",
    tipTitle: 'Conseils santé',
    tips: [
      'Un cycle menstruel normal dure de 21 à 35 jours.',
      "L'ovulation survient généralement vers le 14e jour, mais cela varie.",
      "La fenêtre fertile couvre les 5 jours avant l'ovulation jusqu'au jour J.",
      "En cas de cycle irrégulier ou douloureux, consultez un professionnel de santé.",
    ],
    disclaimer: "Ce calculateur suppose un cycle typique. Ne l'utilisez pas à des fins médicales.",
    daysUntil: 'jours', daysAgo: 'jours', daysAway: 'jours',
  },
  es: {
    title: 'Calculadora de Ciclo Menstrual', subtitle: 'Predice tu próxima menstruación, ovulación y ventana fértil',
    lastPeriodLabel: 'Fecha de inicio del último período', cycleLengthLabel: 'Duración promedio del ciclo (días)', periodDurationLabel: 'Duración del período (días)',
    calcBtn: 'Calcular', resetBtn: 'Reiniciar',
    nextPeriod: 'Próxima menstruación', ovulationDay: 'Día de ovulación', fertileWindow: 'Ventana fértil', lutealPhase: 'Fase lútea',
    next3Cycles: 'Próximos 3 ciclos',
    cycleLabel: 'Ciclo',
    days: 'días', daysUnit: 'días',
    phaseFollicular: 'Folicular', phaseOvulation: 'Ovulación', phaseLuteal: 'Lútea',
    today: 'Hoy', todayIs: 'Hoy es',
    tipTitle: 'Consejos de salud',
    tips: [
      'Un ciclo menstrual normal dura de 21 a 35 días.',
      'La ovulación suele ocurrir alrededor del día 14 del ciclo, pero varía.',
      'La ventana fértil abarca desde 5 días antes de la ovulación hasta el día de ovulación.',
      'Si tu ciclo es irregular o doloroso, consulta a un profesional de la salud.',
    ],
    disclaimer: 'Esta calculadora asume un ciclo típico. No la uses con fines médicos.',
    daysUntil: 'días', daysAgo: 'días', daysAway: 'días',
  },
  zh: {
    title: '月经周期计算器', subtitle: '预测下次月经日、排卵日和受孕窗口期',
    lastPeriodLabel: '最后一次月经开始日期', cycleLengthLabel: '平均周期长度（天）', periodDurationLabel: '月经持续天数',
    calcBtn: '计算', resetBtn: '重置',
    nextPeriod: '下次月经预计日期', ovulationDay: '排卵预计日期', fertileWindow: '受孕窗口期', lutealPhase: '黄体期',
    next3Cycles: '未来3个周期预测',
    cycleLabel: '周期',
    days: '天', daysUnit: '天',
    phaseFollicular: '卵泡期', phaseOvulation: '排卵期', phaseLuteal: '黄体期',
    today: '今天', todayIs: '今天是',
    tipTitle: '健康提示',
    tips: [
      '正常月经周期范围为21至35天。',
      '排卵通常在周期第14天左右发生，但因人而异。',
      '受孕窗口期从排卵前5天延伸到排卵当天。',
      '如果周期不规律或疼痛严重，请咨询医疗专业人员。',
    ],
    disclaimer: '本计算器假设典型周期进行预测，不应用于医疗目的。',
    daysUntil: '天后', daysAgo: '天前', daysAway: '天',
  },
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date, locale: Locale): string {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const localeMap: Record<Locale, string> = {
    ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR', es: 'es-ES', zh: 'zh-CN',
  };
  return date.toLocaleDateString(localeMap[locale], opts);
}

function formatShort(date: Date, locale: Locale): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const localeMap: Record<Locale, string> = {
    ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR', es: 'es-ES', zh: 'zh-CN',
  };
  return date.toLocaleDateString(localeMap[locale], opts);
}

interface CycleResult {
  nextPeriodStart: Date;
  nextPeriodEnd: Date;
  ovulationDay: Date;
  fertileStart: Date;
  fertileEnd: Date;
  follicularEnd: Date;
  lutealStart: Date;
}

function calcCycle(lastPeriod: Date, cycleLength: number, periodDuration: number, offset = 0): CycleResult {
  const base = addDays(lastPeriod, cycleLength * offset);
  const nextPeriodStart = addDays(base, cycleLength);
  const nextPeriodEnd = addDays(nextPeriodStart, periodDuration - 1);
  const ovulationDay = addDays(nextPeriodStart, -(14));
  // ovulation relative to period start: cycle - 14
  const ovDay = addDays(base, cycleLength - 14);
  const fertileStart = addDays(ovDay, -5);
  const fertileEnd = ovDay;
  const follicularEnd = addDays(base, cycleLength - 15);
  const lutealStart = addDays(ovDay, 1);

  return {
    nextPeriodStart: addDays(base, cycleLength),
    nextPeriodEnd: addDays(addDays(base, cycleLength), periodDuration - 1),
    ovulationDay: ovDay,
    fertileStart,
    fertileEnd,
    follicularEnd,
    lutealStart,
  };
}

function getDaysLabel(diff: number, t: typeof L['ko']): string {
  if (diff === 0) return t.today;
  if (diff > 0) return `${diff} ${t.daysUntil}`;
  return `${Math.abs(diff)} ${t.daysAgo}`;
}

export default function MenstrualCycleCalculator({ locale = 'ko' }: { locale?: Locale }) {
  const t = L[locale] ?? L.ko;

  // Default: last period = today - 14 days
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  })();

  const [lastPeriodStr, setLastPeriodStr] = useState(defaultDate);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [calculated, setCalculated] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = useMemo(() => {
    if (!lastPeriodStr) return null;
    const lastPeriod = new Date(lastPeriodStr);
    lastPeriod.setHours(0, 0, 0, 0);
    return calcCycle(lastPeriod, cycleLength, periodDuration, 0);
  }, [lastPeriodStr, cycleLength, periodDuration]);

  const futureCycles = useMemo(() => {
    if (!lastPeriodStr) return [];
    const lastPeriod = new Date(lastPeriodStr);
    lastPeriod.setHours(0, 0, 0, 0);
    return [1, 2, 3].map(offset => calcCycle(lastPeriod, cycleLength, periodDuration, offset));
  }, [lastPeriodStr, cycleLength, periodDuration]);

  function reset() {
    setLastPeriodStr(defaultDate);
    setCycleLength(28);
    setPeriodDuration(5);
    setCalculated(false);
  }

  const ResultCard = ({
    label, date, subtext, colorClass, icon,
  }: {
    label: string; date: Date; subtext?: string; colorClass: string; icon: string;
  }) => {
    const diff = diffDays(date, today);
    return (
      <div className={`rounded-xl border p-4 ${colorClass}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{icon}</span>
          <span className="text-xs font-semibold text-gray-600">{label}</span>
        </div>
        <p className="font-bold text-gray-900 text-base">{formatDate(date, locale)}</p>
        {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}
        <p className="text-xs font-medium text-gray-500 mt-1">{getDaysLabel(diff, t)}</p>
      </div>
    );
  };

  // Determine current cycle phase
  const currentPhase = useMemo(() => {
    if (!result || !lastPeriodStr) return null;
    const lastPeriod = new Date(lastPeriodStr);
    lastPeriod.setHours(0, 0, 0, 0);
    const dayOfCycle = diffDays(today, lastPeriod) % cycleLength;
    const effectiveDay = ((dayOfCycle % cycleLength) + cycleLength) % cycleLength;
    const ovDay = cycleLength - 14;

    if (effectiveDay < periodDuration) return { phase: 'menstrual', day: effectiveDay + 1, color: 'text-red-600', bg: 'bg-red-50', label: locale === 'ko' ? '생리 중' : locale === 'ja' ? '生理中' : locale === 'fr' ? 'Règles' : locale === 'es' ? 'Menstruación' : locale === 'zh' ? '月经中' : 'Menstrual' };
    if (effectiveDay < ovDay - 5) return { phase: 'follicular', day: effectiveDay + 1, color: 'text-blue-600', bg: 'bg-blue-50', label: t.phaseFollicular };
    if (effectiveDay >= ovDay - 5 && effectiveDay <= ovDay) return { phase: 'fertile', day: effectiveDay + 1, color: 'text-pink-600', bg: 'bg-pink-50', label: locale === 'ko' ? '가임기' : locale === 'ja' ? '妊娠可能期' : locale === 'fr' ? 'Période fertile' : locale === 'es' ? 'Período fértil' : locale === 'zh' ? '受孕期' : 'Fertile' };
    return { phase: 'luteal', day: effectiveDay + 1, color: 'text-violet-600', bg: 'bg-violet-50', label: t.phaseLuteal };
  }, [result, lastPeriodStr, cycleLength, periodDuration, today, locale]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* Input form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.lastPeriodLabel}</label>
          <input
            type="date"
            value={lastPeriodStr}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => { setLastPeriodStr(e.target.value); setCalculated(false); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.cycleLengthLabel}: <span className="font-bold text-pink-600">{cycleLength} {t.daysUnit}</span>
          </label>
          <input
            type="range" min={21} max={40} step={1} value={cycleLength}
            onChange={e => { setCycleLength(Number(e.target.value)); setCalculated(false); }}
            className="w-full accent-pink-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>21 {t.days}</span><span>40 {t.days}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.periodDurationLabel}: <span className="font-bold text-pink-600">{periodDuration} {t.daysUnit}</span>
          </label>
          <input
            type="range" min={2} max={10} step={1} value={periodDuration}
            onChange={e => { setPeriodDuration(Number(e.target.value)); setCalculated(false); }}
            className="w-full accent-pink-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>2 {t.days}</span><span>10 {t.days}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCalculated(true)}
            className="flex-[2] py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-xl transition-colors"
          >
            {t.calcBtn}
          </button>
          <button
            onClick={reset}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition-colors"
          >
            {t.resetBtn}
          </button>
        </div>
      </div>

      {/* Results */}
      {(calculated || true) && result && (
        <>
          {/* Current phase badge */}
          {currentPhase && (
            <div className={`rounded-xl border p-4 text-center ${currentPhase.bg}`}>
              <p className="text-xs text-gray-500 mb-1">{t.todayIs} — {locale === 'ko' ? `주기 ${currentPhase.day}일째` : locale === 'ja' ? `周期${currentPhase.day}日目` : `Day ${currentPhase.day} of cycle`}</p>
              <p className={`text-xl font-bold ${currentPhase.color}`}>{currentPhase.label}</p>
            </div>
          )}

          {/* Key dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultCard
              label={t.nextPeriod}
              date={result.nextPeriodStart}
              subtext={`~ ${formatDate(result.nextPeriodEnd, locale)}`}
              colorClass="bg-red-50 border-red-200"
              icon="🩸"
            />
            <ResultCard
              label={t.ovulationDay}
              date={result.ovulationDay}
              colorClass="bg-pink-50 border-pink-200"
              icon="🥚"
            />
            <ResultCard
              label={t.fertileWindow}
              date={result.fertileStart}
              subtext={`~ ${formatDate(result.fertileEnd, locale)}`}
              colorClass="bg-rose-50 border-rose-200"
              icon="💕"
            />
            <ResultCard
              label={t.lutealPhase}
              date={result.lutealStart}
              subtext={`~ ${formatDate(result.nextPeriodStart, locale)}`}
              colorClass="bg-violet-50 border-violet-200"
              icon="🌙"
            />
          </div>

          {/* Cycle phases visual */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {locale === 'ko' ? '주기 단계' : locale === 'ja' ? '周期の段階' : locale === 'fr' ? 'Phases du cycle' : locale === 'es' ? 'Fases del ciclo' : locale === 'zh' ? '周期阶段' : 'Cycle Phases'}
            </h2>
            <div className="flex h-6 rounded-full overflow-hidden">
              {/* menstrual */}
              <div
                className="bg-red-400 flex items-center justify-center"
                style={{ width: `${(periodDuration / cycleLength) * 100}%` }}
                title={locale === 'ko' ? '생리' : 'Menstrual'}
              />
              {/* follicular */}
              <div
                className="bg-blue-300 flex items-center justify-center"
                style={{ width: `${((cycleLength - 14 - 5 - periodDuration) / cycleLength) * 100}%` }}
                title={t.phaseFollicular}
              />
              {/* fertile */}
              <div
                className="bg-pink-400 flex items-center justify-center"
                style={{ width: `${(6 / cycleLength) * 100}%` }}
                title={locale === 'ko' ? '가임기' : 'Fertile'}
              />
              {/* luteal */}
              <div
                className="bg-violet-400 flex-1"
                title={t.phaseLuteal}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>🩸</span>
              <span className="text-blue-500">{t.phaseFollicular}</span>
              <span className="text-pink-500">💕</span>
              <span className="text-violet-500">{t.phaseLuteal}</span>
            </div>
          </div>

          {/* Next 3 cycles */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.next3Cycles}</h2>
            <div className="space-y-3">
              {futureCycles.map((c, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs font-bold text-pink-600 w-12 shrink-0">{t.cycleLabel} {i + 1}</span>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">🩸</p>
                      <p className="font-medium">{formatShort(c.nextPeriodStart, locale)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">🥚</p>
                      <p className="font-medium">{formatShort(c.ovulationDay, locale)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">💕</p>
                      <p className="font-medium">{formatShort(c.fertileStart, locale)} ~</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-pink-50 rounded-2xl border border-pink-200 p-4">
            <h2 className="text-sm font-semibold text-pink-700 mb-2">💡 {t.tipTitle}</h2>
            <ul className="space-y-1">
              {t.tips.map((tip, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2">
                  <span className="text-pink-400 shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-gray-400 text-center">{t.disclaimer}</p>
        </>
      )}
    </div>
  );
}
