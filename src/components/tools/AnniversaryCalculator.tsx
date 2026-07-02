import React, { useState, useMemo } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';
type Mode = 'dday' | 'anniversary';

interface Labels {
  title: string; subtitle: string;
  modeAnn: string; modeDday: string;
  startDate: string; targetDate: string;
  eventName: string;
  dDayLabel: string; daysLabel: string;
  milestones: string; today: string;
  past: string; future: string; dayOf: string;
}

const L: Record<Locale, Labels> = {
  ko: {
    title: '기념일·디데이 계산기', subtitle: 'D-Day & Anniversary',
    modeAnn: '기념일', modeDday: 'D-Day',
    startDate: '시작 날짜', targetDate: '목표 날짜',
    eventName: '이벤트 이름', dDayLabel: 'D-Day', daysLabel: '일',
    milestones: '주요 기념일', today: '오늘',
    past: '일 지남', future: '일 남음', dayOf: '당일',
  },
  en: {
    title: 'Anniversary & D-Day', subtitle: 'Countdown & Milestone Calculator',
    modeAnn: 'Anniversary', modeDday: 'D-Day',
    startDate: 'Start Date', targetDate: 'Target Date',
    eventName: 'Event name', dDayLabel: 'D-Day', daysLabel: 'days',
    milestones: 'Key Milestones', today: 'Today',
    past: 'days ago', future: 'days left', dayOf: 'Today!',
  },
  ja: {
    title: '記念日・Dデイ計算機', subtitle: 'D-Day & Anniversary',
    modeAnn: '記念日', modeDday: 'Dデイ',
    startDate: '開始日', targetDate: '目標日',
    eventName: 'イベント名', dDayLabel: 'Dデイ', daysLabel: '日',
    milestones: '主な記念日', today: '今日',
    past: '日経過', future: '日後', dayOf: '今日！',
  },
  fr: {
    title: 'Anniversaire & Compte à rebours', subtitle: 'D-Day & Anniversary',
    modeAnn: 'Anniversaire', modeDday: 'J-Day',
    startDate: 'Date de début', targetDate: 'Date cible',
    eventName: 'Nom de l\'événement', dDayLabel: 'J-Day', daysLabel: 'jours',
    milestones: 'Jalons clés', today: 'Aujourd\'hui',
    past: 'jours passés', future: 'jours restants', dayOf: 'Aujourd\'hui !',
  },
  es: {
    title: 'Aniversario & Cuenta atrás', subtitle: 'D-Day & Anniversary',
    modeAnn: 'Aniversario', modeDday: 'D-Día',
    startDate: 'Fecha de inicio', targetDate: 'Fecha objetivo',
    eventName: 'Nombre del evento', dDayLabel: 'D-Día', daysLabel: 'días',
    milestones: 'Hitos clave', today: 'Hoy',
    past: 'días pasados', future: 'días restantes', dayOf: '¡Hoy!',
  },
  zh: {
    title: '纪念日·倒计时计算器', subtitle: 'D-Day & Anniversary',
    modeAnn: '纪念日', modeDday: '倒计时',
    startDate: '开始日期', targetDate: '目标日期',
    eventName: '事件名称', dDayLabel: '倒计时', daysLabel: '天',
    milestones: '重要纪念日', today: '今天',
    past: '天前', future: '天后', dayOf: '就是今天！',
  },
};

const MILESTONE_DAYS = [100, 200, 365, 500, 1000, 2000, 3000, 5000];
const MILESTONE_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  '100': { ko: '100일', en: '100 days', ja: '100日', fr: '100 jours', es: '100 días', zh: '100天', },
  '200': { ko: '200일', en: '200 days', ja: '200日', fr: '200 jours', es: '200 días', zh: '200天', },
  '365': { ko: '1주년', en: '1 Year', ja: '1周年', fr: '1 an', es: '1 año', zh: '1周年', },
  '500': { ko: '500일', en: '500 days', ja: '500日', fr: '500 jours', es: '500 días', zh: '500天', },
  '1000': { ko: '1000일', en: '1,000 days', ja: '1000日', fr: '1 000 jours', es: '1 000 días', zh: '1000天', },
  '2000': { ko: '2000일', en: '2,000 days', ja: '2000日', fr: '2 000 jours', es: '2 000 días', zh: '2000天', },
  '3000': { ko: '3000일', en: '3,000 days', ja: '3000日', fr: '3 000 jours', es: '3 000 días', zh: '3000天', },
  '5000': { ko: '5000일', en: '5,000 days', ja: '5000日', fr: '5 000 jours', es: '5 000 días', zh: '5000天', },
};

function toLocalDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDate(s: string): Date | null {
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDate(d: Date, locale: Locale) {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const localeMap: Record<Locale, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR', es: 'es-ES', zh: 'zh-CN', };
  return new Intl.DateTimeFormat(localeMap[locale], opts).format(d);
}

const AnniversaryCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = L[locale] ?? L.en;

  const todayStr = toLocalDateStr(new Date());
  const [mode, setMode] = useState<Mode>('anniversary');
  const [startDate, setStartDate] = useState(todayStr);
  const [targetDate, setTargetDate] = useState(todayStr);
  const [eventName, setEventName] = useState('');

  const today = useMemo(() => parseDate(todayStr)!, [todayStr]);

  const result = useMemo(() => {
    if (mode === 'anniversary') {
      const start = parseDate(startDate);
      if (!start) return null;
      const elapsed = diffDays(start, today);
      const milestones = MILESTONE_DAYS.map(days => ({
        days,
        label: MILESTONE_LABELS[String(days)]?.[locale] ?? `${days} days`,
        date: addDays(start, days - 1),
        diff: diffDays(today, addDays(start, days - 1)),
      }));
      return { type: 'anniversary' as const, elapsed, start, milestones };
    } else {
      const target = parseDate(targetDate);
      if (!target) return null;
      const diff = diffDays(today, target);
      return { type: 'dday' as const, diff, target };
    }
  }, [mode, startDate, targetDate, today, locale]);

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => { setStartDate(todayStr); setTargetDate(todayStr); setEventName(''); }}
    >
      <div className="flex flex-col gap-8">
        {/* Mode toggle */}
        <div className="flex rounded-2xl border border-border overflow-hidden">
          {(['anniversary', 'dday'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {m === 'anniversary' ? t.modeAnn : t.modeDday}
            </button>
          ))}
        </div>

        {/* Event name */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.eventName}
          </label>
          <input
            type="text"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="e.g. 💑 우리 기념일"
            className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-medium outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Date input(s) */}
        {mode === 'anniversary' ? (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.startDate}
            </label>
            <input
              type="date"
              value={startDate}
              max={todayStr}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:border-primary transition-colors"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.targetDate}
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:border-primary transition-colors"
            />
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            {result.type === 'anniversary' && (
              <>
                <div className="p-8 rounded-[32px] bg-pink-50 border-2 border-pink-200 text-center space-y-2">
                  {eventName && <p className="text-sm font-bold text-pink-500">{eventName}</p>}
                  <p className="text-[10px] font-black uppercase tracking-widest text-pink-400">{t.today}</p>
                  <p className="text-6xl font-black text-pink-600">D+{result.elapsed + 1}</p>
                  <p className="text-sm font-medium text-pink-500">{result.elapsed + 1}{t.daysLabel}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(result.start, locale)} → {formatDate(today, locale)}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.milestones}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {result.milestones.map(m => (
                      <div
                        key={m.days}
                        className={`p-3 rounded-2xl border text-center transition-all ${m.diff === 0 ? 'bg-primary/10 border-primary' : m.diff < 0 ? 'bg-muted/30 border-border opacity-60' : 'bg-muted/20 border-border'}`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-widest ${m.diff === 0 ? 'text-primary' : 'text-muted-foreground'}`}>{m.label}</p>
                        <p className="text-xs font-medium text-muted-foreground">{formatDate(m.date, locale)}</p>
                        <p className={`text-xs font-black mt-1 ${m.diff === 0 ? 'text-primary' : m.diff < 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {m.diff === 0 ? t.dayOf : m.diff < 0 ? `${Math.abs(m.diff)}${t.daysLabel} ${t.past}` : `${m.diff}${t.daysLabel} ${t.future}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {result.type === 'dday' && (
              <div className={`p-8 rounded-[32px] border-2 text-center space-y-2 ${result.diff === 0 ? 'bg-emerald-50 border-emerald-300' : result.diff > 0 ? 'bg-blue-50 border-blue-200' : 'bg-muted/30 border-border'}`}>
                {eventName && <p className={`text-sm font-bold ${result.diff >= 0 ? 'text-blue-500' : 'text-muted-foreground'}`}>{eventName}</p>}
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.dDayLabel}</p>
                <p className={`text-6xl font-black ${result.diff === 0 ? 'text-emerald-600' : result.diff > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {result.diff === 0 ? 'D-Day' : result.diff > 0 ? `D-${result.diff}` : `D+${Math.abs(result.diff)}`}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  {result.diff === 0 ? t.dayOf : result.diff > 0 ? `${result.diff}${t.daysLabel} ${t.future}` : `${Math.abs(result.diff)}${t.daysLabel} ${t.past}`}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(result.target, locale)}</p>
              </div>
            )}
          </>
        )}
      </div>
    </GameContainer>
  );
};

export default AnniversaryCalculator;
