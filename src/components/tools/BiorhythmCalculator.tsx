import React, { useState, useMemo } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

// Biorhythm cycles in days
const CYCLES = {
  physical: 23,
  emotional: 28,
  intellectual: 33,
  intuitive: 38,
} as const;
type CycleKey = keyof typeof CYCLES;

const CYCLE_META: Record<CycleKey, { emoji: string; color: string; bar: string }> = {
  physical:     { emoji: '💪', color: 'text-red-600',    bar: 'bg-red-500' },
  emotional:    { emoji: '💗', color: 'text-pink-600',   bar: 'bg-pink-500' },
  intellectual: { emoji: '🧠', color: 'text-blue-600',   bar: 'bg-blue-500' },
  intuitive:    { emoji: '✨', color: 'text-violet-600', bar: 'bg-violet-500' },
};

const L: Record<Locale, {
  title: string; subtitle: string;
  birthDateLabel: string; targetDateLabel: string;
  calcBtn: string;
  todayBtn: string;
  physical: string; emotional: string; intellectual: string; intuitive: string;
  high: string; low: string; critical: string;
  forecastTitle: string; forecastDays: string;
  dayLabel: string;
  disclaimer: string;
  tip: Record<CycleKey, { high: string; low: string; critical: string }>;
}> = {
  ko: {
    title: '바이오리듬 계산기', subtitle: '신체·감성·지성·직관 주기로 오늘 컨디션 파악',
    birthDateLabel: '생년월일', targetDateLabel: '확인 날짜',
    calcBtn: '계산하기', todayBtn: '오늘',
    physical: '신체', emotional: '감성', intellectual: '지성', intuitive: '직관',
    high: '고조', low: '저조', critical: '임계',
    forecastTitle: '향후 7일 예측', forecastDays: '일',
    dayLabel: 'D',
    disclaimer: '바이오리듬은 과학적으로 검증되지 않은 가설입니다. 참고용으로만 활용하세요.',
    tip: {
      physical:     { high: '신체 활동에 최적. 운동, 스포츠에 좋은 날', low: '휴식이 필요한 날. 무리하지 마세요', critical: '사고에 주의. 운전·작업 시 특히 조심' },
      emotional:    { high: '감정이 안정적이고 사교 활동에 좋은 날', low: '감정 기복이 있을 수 있어요. 자기 돌봄 시간 갖기', critical: '감정적 결정은 피하세요. 냉각 기간 필요' },
      intellectual: { high: '학습, 창의적 작업, 분석에 최적인 날', low: '집중이 어려울 수 있어요. 단순 작업 위주로', critical: '중요한 결정이나 시험 일정 피하기' },
      intuitive:    { high: '직감이 예리한 날. 창의적 영감 활용하기', low: '직관보다 논리적 분석에 의존하세요', critical: '예감보다 사실 확인을 우선시하세요' },
    },
  },
  en: {
    title: 'Biorhythm Calculator', subtitle: 'Track your physical, emotional, intellectual & intuitive cycles',
    birthDateLabel: 'Date of Birth', targetDateLabel: 'Check Date',
    calcBtn: 'Calculate', todayBtn: 'Today',
    physical: 'Physical', emotional: 'Emotional', intellectual: 'Intellectual', intuitive: 'Intuitive',
    high: 'High', low: 'Low', critical: 'Critical',
    forecastTitle: '7-Day Forecast', forecastDays: 'days',
    dayLabel: 'D',
    disclaimer: 'Biorhythm is an unverified hypothesis. Use it only as a reference.',
    tip: {
      physical:     { high: 'Peak for physical activity — great for sports or exercise', low: 'Rest day. Avoid overexertion', critical: 'Be careful. Accident risk is higher today' },
      emotional:    { high: 'Emotionally stable — great for socializing and teamwork', low: 'Mood may fluctuate. Practice self-care', critical: 'Avoid emotional decisions today' },
      intellectual: { high: 'Great for studying, analysis, and creative work', low: 'Focus may be harder. Stick to routine tasks', critical: 'Postpone important exams or decisions if possible' },
      intuitive:    { high: 'Intuition is sharp. Trust your gut on creative matters', low: 'Rely on logic rather than gut feelings', critical: 'Verify facts before trusting hunches' },
    },
  },
  ja: {
    title: 'バイオリズム計算機', subtitle: '身体・感情・知性・直感の周期で今日のコンディションを確認',
    birthDateLabel: '生年月日', targetDateLabel: '確認日',
    calcBtn: '計算する', todayBtn: '今日',
    physical: '身体', emotional: '感情', intellectual: '知性', intuitive: '直感',
    high: '高調', low: '低調', critical: '臨界',
    forecastTitle: '今後7日間の予測', forecastDays: '日',
    dayLabel: 'D',
    disclaimer: 'バイオリズムは科学的に検証されていない仮説です。参考程度にご利用ください。',
    tip: {
      physical:     { high: '身体活動に最適。スポーツや運動に良い日', low: '休養が必要な日。無理しないように', critical: '事故に注意。運転や作業は特に慎重に' },
      emotional:    { high: '感情が安定。社交活動やチームワークに最適', low: '気分が揺れるかも。自己ケアの時間を', critical: '感情的な決断は避けてください' },
      intellectual: { high: '学習、分析、創造的作業に最適な日', low: '集中が難しいかも。ルーティン作業中心に', critical: '重要な決断や試験の日程は避けて' },
      intuitive:    { high: '直感が鋭い日。創造的なひらめきを活かして', low: '直感よりロジカルな分析に頼りましょう', critical: '予感よりも事実確認を優先させて' },
    },
  },
  fr: {
    title: 'Calculateur de Biorythme', subtitle: 'Suivez vos cycles physique, émotionnel, intellectuel et intuitif',
    birthDateLabel: 'Date de naissance', targetDateLabel: 'Date de vérification',
    calcBtn: 'Calculer', todayBtn: "Aujourd'hui",
    physical: 'Physique', emotional: 'Émotionnel', intellectual: 'Intellectuel', intuitive: 'Intuitif',
    high: 'Élevé', low: 'Bas', critical: 'Critique',
    forecastTitle: 'Prévision 7 jours', forecastDays: 'jours',
    dayLabel: 'J',
    disclaimer: "Le biorythme est une hypothèse non vérifiée scientifiquement. Utilisez-le uniquement comme référence.",
    tip: {
      physical:     { high: 'Idéal pour l\'activité physique — sport ou exercice', low: 'Journée de repos. Évitez l\'effort excessif', critical: 'Prudence. Risque d\'accident plus élevé' },
      emotional:    { high: 'Émotionnellement stable — idéal pour socialiser', low: "L'humeur peut fluctuer. Prenez soin de vous", critical: 'Évitez les décisions émotionnelles aujourd\'hui' },
      intellectual: { high: 'Excellent pour l\'étude, l\'analyse et le travail créatif', low: 'La concentration peut être difficile. Tâches routinières', critical: 'Reportez si possible examens ou décisions importantes' },
      intuitive:    { high: 'Intuition aiguisée. Faites confiance à votre instinct', low: 'Fiez-vous à la logique plutôt qu\'à l\'intuition', critical: 'Vérifiez les faits avant de suivre vos pressentiments' },
    },
  },
  es: {
    title: 'Calculadora de Biorritmo', subtitle: 'Rastrea tus ciclos físico, emocional, intelectual e intuitivo',
    birthDateLabel: 'Fecha de nacimiento', targetDateLabel: 'Fecha a verificar',
    calcBtn: 'Calcular', todayBtn: 'Hoy',
    physical: 'Físico', emotional: 'Emocional', intellectual: 'Intelectual', intuitive: 'Intuitivo',
    high: 'Alto', low: 'Bajo', critical: 'Crítico',
    forecastTitle: 'Previsión 7 días', forecastDays: 'días',
    dayLabel: 'D',
    disclaimer: 'El biorritmo es una hipótesis no verificada científicamente. Úsalo solo como referencia.',
    tip: {
      physical:     { high: 'Ideal para actividad física — deporte o ejercicio', low: 'Día de descanso. Evita el sobreesfuerzo', critical: 'Precaución. El riesgo de accidente es mayor hoy' },
      emotional:    { high: 'Emocionalmente estable — ideal para socializar', low: 'El estado de ánimo puede fluctuar. Practica el autocuidado', critical: 'Evita decisiones emocionales hoy' },
      intellectual: { high: 'Excelente para estudiar, análisis y trabajo creativo', low: 'La concentración puede ser difícil. Tareas rutinarias', critical: 'Pospón exámenes o decisiones importantes si es posible' },
      intuitive:    { high: 'Intuición aguda. Confía en tu instinto en asuntos creativos', low: 'Confía en la lógica en lugar de la intuición', critical: 'Verifica los hechos antes de confiar en presentimientos' },
    },
  },
  zh: {
    title: '生物节律计算器', subtitle: '追踪您的体力、情感、智力和直觉周期',
    birthDateLabel: '出生日期', targetDateLabel: '查看日期',
    calcBtn: '计算', todayBtn: '今天',
    physical: '体力', emotional: '情感', intellectual: '智力', intuitive: '直觉',
    high: '高峰', low: '低谷', critical: '临界',
    forecastTitle: '未来7天预测', forecastDays: '天',
    dayLabel: 'D',
    disclaimer: '生物节律是未经科学验证的假说，请仅作参考使用。',
    tip: {
      physical:     { high: '最适合体力活动，是运动和锻炼的好日子', low: '需要休息的一天，不要过度劳累', critical: '注意意外事故，驾驶和作业时尤其谨慎' },
      emotional:    { high: '情绪稳定，适合社交活动和团队合作', low: '情绪可能有起伏，给自己一些照顾时间', critical: '今天避免情绪化的决定' },
      intellectual: { high: '最适合学习、分析和创意工作的日子', low: '可能难以集中注意力，以日常工作为主', critical: '如果可能，推迟重要考试或决定' },
      intuitive:    { high: '直觉敏锐的一天，善用创意灵感', low: '依靠逻辑分析而非直觉', critical: '在相信预感之前先验证事实' },
    },
  },
};

function calcBiorhythm(birthDate: Date, targetDate: Date): Record<CycleKey, number> {
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((targetDate.getTime() - birthDate.getTime()) / msPerDay);
  return {
    physical:     Math.sin((2 * Math.PI * days) / CYCLES.physical),
    emotional:    Math.sin((2 * Math.PI * days) / CYCLES.emotional),
    intellectual: Math.sin((2 * Math.PI * days) / CYCLES.intellectual),
    intuitive:    Math.sin((2 * Math.PI * days) / CYCLES.intuitive),
  };
}

function getPhase(val: number): 'high' | 'low' | 'critical' {
  if (Math.abs(val) < 0.1) return 'critical';
  return val >= 0 ? 'high' : 'low';
}

function pct(val: number): number {
  return Math.round(((val + 1) / 2) * 100);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function shortDate(d: Date, locale: Locale): string {
  const locMap: Record<Locale, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR', es: 'es-ES', zh: 'zh-CN', };
  return d.toLocaleDateString(locMap[locale], { month: 'short', day: 'numeric' });
}

export default function BiorhythmCalculator({ locale = 'ko' }: { locale?: Locale }) {
  const t = L[locale] ?? L.ko;

  const todayStr = new Date().toISOString().split('T')[0];
  const [birthStr, setBirthStr] = useState('1990-01-01');
  const [targetStr, setTargetStr] = useState(todayStr);
  const [calculated, setCalculated] = useState(false);

  const rhythms = useMemo(() => {
    if (!birthStr || !targetStr) return null;
    const birth = new Date(birthStr);
    const target = new Date(targetStr);
    if (isNaN(birth.getTime()) || isNaN(target.getTime())) return null;
    return calcBiorhythm(birth, target);
  }, [birthStr, targetStr]);

  const forecast = useMemo(() => {
    if (!birthStr) return [];
    const birth = new Date(birthStr);
    const base = targetStr ? new Date(targetStr) : new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(base, i);
      return { date: d, rhythms: calcBiorhythm(birth, d) };
    });
  }, [birthStr, targetStr]);

  const CYCLE_KEYS = Object.keys(CYCLES) as CycleKey[];

  const PhaseChip = ({ phase }: { phase: 'high' | 'low' | 'critical' }) => {
    const map = {
      high: 'bg-green-100 text-green-700',
      low: 'bg-blue-100 text-blue-700',
      critical: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${map[phase]}`}>
        {t[phase]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.birthDateLabel}</label>
          <input type="date" value={birthStr} max={todayStr}
            onChange={e => { setBirthStr(e.target.value); setCalculated(false); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.targetDateLabel}</label>
          <div className="flex gap-2">
            <input type="date" value={targetStr}
              onChange={e => { setTargetStr(e.target.value); setCalculated(false); }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button
              onClick={() => { setTargetStr(todayStr); setCalculated(false); }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600 transition-colors"
            >
              {t.todayBtn}
            </button>
          </div>
        </div>
        <button
          onClick={() => setCalculated(true)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
        >
          {t.calcBtn}
        </button>
      </div>

      {/* Results */}
      {calculated && rhythms && (
        <>
          {/* Cycle bars */}
          <div className="space-y-4">
            {CYCLE_KEYS.map(key => {
              const val = rhythms[key];
              const phase = getPhase(val);
              const meta = CYCLE_META[key];
              const percentage = pct(val);
              return (
                <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <span className={`font-semibold ${meta.color}`}>{t[key]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700">{percentage}%</span>
                      <PhaseChip phase={phase} />
                    </div>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full">
                    {/* Zero line at 50% */}
                    <div className="absolute left-1/2 top-0 h-full w-0.5 bg-gray-300 -translate-x-1/2" />
                    <div
                      className={`absolute top-0 h-3 rounded-full transition-all ${meta.bar}`}
                      style={{
                        left: val >= 0 ? '50%' : `${percentage}%`,
                        width: `${Math.abs(val) * 50}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{t.tip[key][phase]}</p>
                </div>
              );
            })}
          </div>

          {/* 7-day forecast */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.forecastTitle}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-gray-400 pb-2 font-normal pr-2">{t.dayLabel}</th>
                    {CYCLE_KEYS.map(k => (
                      <th key={k} className={`pb-2 font-semibold ${CYCLE_META[k].color} text-center`}>
                        {CYCLE_META[k].emoji}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((f, i) => (
                    <tr key={i} className={`border-t border-gray-50 ${i === 0 ? 'bg-indigo-50' : ''}`}>
                      <td className="py-1.5 pr-2 text-gray-600 whitespace-nowrap font-medium">
                        {shortDate(f.date, locale)}
                      </td>
                      {CYCLE_KEYS.map(k => {
                        const phase = getPhase(f.rhythms[k]);
                        const p = pct(f.rhythms[k]);
                        return (
                          <td key={k} className="py-1.5 text-center">
                            <span className={`inline-block w-8 text-center text-[10px] font-bold rounded ${
                              phase === 'critical' ? 'text-amber-600' : phase === 'high' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {p}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">{t.disclaimer}</p>
        </>
      )}
    </div>
  );
}
