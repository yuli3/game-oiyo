import React, { useState, useMemo } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

interface Labels {
  title: string; subtitle: string;
  joinDate: string; refDate: string;
  annualDays: string; used: string;
  remaining: string; total: string;
  accrued: string; note: string; noteText: string;
  monthsWorked: string; yearsWorked: string;
  daysLabel: string;
}

const L: Record<Locale, Labels> = {
  ko: {
    title: '연차 계산기', subtitle: 'Annual Leave Calculator',
    joinDate: '입사일', refDate: '기준일 (오늘)',
    annualDays: '발생 연차', used: '사용 연차',
    remaining: '잔여 연차', total: '총 발생 연차',
    accrued: '발생 일수', note: '계산 근거',
    noteText: '근로기준법 기준: 1년 미만 매월 1일(최대 11일), 1년 이상 15일, 3년 이상 2년마다 1일씩 추가(최대 25일)',
    monthsWorked: '근속 개월', yearsWorked: '근속 연수', daysLabel: '일',
  },
  en: {
    title: 'Annual Leave Calculator', subtitle: 'Paid Time Off Tracker',
    joinDate: 'Join Date', refDate: 'Reference Date',
    annualDays: 'Annual Leave Entitlement', used: 'Used Days',
    remaining: 'Remaining', total: 'Total Accrued',
    accrued: 'Accrued Days', note: 'Calculation Basis',
    noteText: 'Based on Korean Labor Standards Act: <1 year = 1 day/month (max 11), 1+ year = 15 days, +1 day every 2 years after 3 years (max 25).',
    monthsWorked: 'Months Worked', yearsWorked: 'Years Worked', daysLabel: 'days',
  },
  ja: {
    title: '年次有給休暇計算機', subtitle: 'Annual Leave Calculator',
    joinDate: '入社日', refDate: '基準日',
    annualDays: '有給休暇付与日数', used: '取得済み日数',
    remaining: '残日数', total: '総付与日数',
    accrued: '付与日数', note: '計算根拠',
    noteText: '韓国労働基準法基準：1年未満は月1日（最大11日）、1年以上15日、3年以上は2年ごとに1日追加（最大25日）',
    monthsWorked: '勤続月数', yearsWorked: '勤続年数', daysLabel: '日',
  },
  fr: {
    title: 'Calculateur de congés annuels', subtitle: 'Annual Leave Calculator',
    joinDate: "Date d'embauche", refDate: 'Date de référence',
    annualDays: 'Congés acquis', used: 'Jours utilisés',
    remaining: 'Solde restant', total: 'Total acquis',
    accrued: 'Jours acquis', note: 'Base de calcul',
    noteText: 'Basé sur la loi du travail coréenne : moins d\'1 an = 1 jour/mois (max 11), plus d\'1 an = 15 jours, +1 jour tous les 2 ans après 3 ans (max 25).',
    monthsWorked: 'Mois travaillés', yearsWorked: 'Années travaillées', daysLabel: 'jours',
  },
  es: {
    title: 'Calculadora de vacaciones', subtitle: 'Annual Leave Calculator',
    joinDate: 'Fecha de ingreso', refDate: 'Fecha de referencia',
    annualDays: 'Vacaciones anuales', used: 'Días usados',
    remaining: 'Días restantes', total: 'Total acumulado',
    accrued: 'Días acumulados', note: 'Base de cálculo',
    noteText: 'Basado en la ley laboral coreana: menos de 1 año = 1 día/mes (máx. 11), más de 1 año = 15 días, +1 día cada 2 años desde 3 años (máx. 25).',
    monthsWorked: 'Meses trabajados', yearsWorked: 'Años trabajados', daysLabel: 'días',
  },
  zh: {
    title: '年假计算器', subtitle: 'Annual Leave Calculator',
    joinDate: '入职日期', refDate: '计算基准日',
    annualDays: '年假天数', used: '已使用天数',
    remaining: '剩余天数', total: '累积天数',
    accrued: '累积天数', note: '计算依据',
    noteText: '依韩国劳动基准法：未满1年每月1天（最多11天），满1年15天，满3年起每2年增加1天（最多25天）',
    monthsWorked: '服务月数', yearsWorked: '服务年数', daysLabel: '天',
  },
};

function toLocalDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function diffMonths(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

/** Korean Labor Standards Act annual leave entitlement */
function calcAnnualLeaveDays(months: number): number {
  if (months < 1) return 0;
  if (months < 12) {
    // 1 day per completed month, max 11
    return Math.min(months, 11);
  }
  const years = Math.floor(months / 12);
  // Base 15 days at 1 year; +1 day every 2 years after year 3, max 25
  const extra = years >= 3 ? Math.floor((years - 1) / 2) : 0;
  return Math.min(15 + extra, 25);
}

const AnnualLeaveCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = L[locale] ?? L.en;

  const todayStr = toLocalDateStr(new Date());
  const [joinDate, setJoinDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return toLocalDateStr(d);
  });
  const [refDate, setRefDate] = useState(todayStr);
  const [usedDays, setUsedDays] = useState(0);

  const calc = useMemo(() => {
    const start = new Date(joinDate + 'T00:00:00');
    const ref = new Date(refDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(ref.getTime()) || ref < start) return null;

    const months = diffMonths(start, ref);
    const totalDays = calcAnnualLeaveDays(months);
    const remaining = Math.max(0, totalDays - usedDays);
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    return { months, years, remMonths, totalDays, remaining };
  }, [joinDate, refDate, usedDays]);

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => { setUsedDays(0); }}
    >
      <div className="flex flex-col gap-8">
        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.joinDate}</label>
            <input
              type="date"
              value={joinDate}
              max={refDate}
              onChange={e => setJoinDate(e.target.value)}
              className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.refDate}</label>
            <input
              type="date"
              value={refDate}
              min={joinDate}
              onChange={e => setRefDate(e.target.value)}
              className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Used days */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.used}
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setUsedDays(d => Math.max(0, d - 0.5))}
              className="w-12 h-12 rounded-2xl bg-muted border border-border font-black text-xl hover:bg-accent transition-colors"
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-4xl font-black">{usedDays}</span>
              <span className="text-sm font-bold text-muted-foreground ml-2">{t.daysLabel}</span>
            </div>
            <button
              onClick={() => setUsedDays(d => d + 0.5)}
              className="w-12 h-12 rounded-2xl bg-muted border border-border font-black text-xl hover:bg-accent transition-colors"
            >+</button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">± 0.5 {t.daysLabel}</p>
        </div>

        {/* Results */}
        {calc && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.monthsWorked}</p>
                <p className="text-2xl font-black">{calc.months}</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.yearsWorked}</p>
                <p className="text-2xl font-black">{calc.years}<span className="text-sm font-bold text-muted-foreground ml-1">yr {calc.remMonths}mo</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-muted/40 border border-border text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.annualDays}</p>
                <p className="text-4xl font-black">{calc.totalDays}</p>
                <p className="text-xs text-muted-foreground">{t.daysLabel}</p>
              </div>
              <div className={`p-6 rounded-3xl border-2 text-center space-y-1 ${calc.remaining > 0 ? 'bg-success/10 border-success/40' : 'bg-muted/30 border-border'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${calc.remaining > 0 ? 'text-success' : 'text-muted-foreground'}`}>{t.remaining}</p>
                <p className={`text-4xl font-black ${calc.remaining > 0 ? 'text-success' : 'text-muted-foreground'}`}>{calc.remaining}</p>
                <p className="text-xs text-muted-foreground">{t.daysLabel}</p>
              </div>
            </div>

            {/* Note */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{t.note}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.noteText}</p>
            </div>
          </>
        )}
      </div>
    </GameContainer>
  );
};

export default AnnualLeaveCalculator;
