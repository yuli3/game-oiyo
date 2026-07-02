'use client';
import { useState, useEffect, useReducer, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import Heart from 'lucide-react/dist/esm/icons/heart'
import Star from 'lucide-react/dist/esm/icons/star'
import Briefcase from 'lucide-react/dist/esm/icons/briefcase'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap'
import Gift from 'lucide-react/dist/esm/icons/gift'
import Plane from 'lucide-react/dist/esm/icons/plane'
import Music from 'lucide-react/dist/esm/icons/music'
import Trophy from 'lucide-react/dist/esm/icons/trophy'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Copy from 'lucide-react/dist/esm/icons/copy'
import Check from 'lucide-react/dist/esm/icons/check'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Clock from 'lucide-react/dist/esm/icons/clock';

// ─────────────────────────────────────────────
// Shared utils
// ─────────────────────────────────────────────
function dateDiffDays(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}
function addDaysToDate(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function fmtDate(d: Date, locale: string): string {
  if (locale === 'en') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  if (locale === 'ja') return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function ShareButton({ text, locale }: { text: string; locale: string }) {
  const [copied, setCopied] = useState(false);
  const label = locale === 'ja' ? 'コピー' : locale === 'en' ? 'Copy' : '복사';
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors px-3 py-1.5 border border-slate-200 rounded-full hover:bg-slate-50">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? (locale === 'ko' ? '복사됨' : locale === 'ja' ? 'コピー済み' : 'Copied!') : label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// ANNIVERSARY CALCULATOR
// ─────────────────────────────────────────────
const MILESTONES_DAYS = [22, 50, 100, 200, 300, 365, 500, 1000, 730, 1095, 1825, 3650];
const MILESTONE_LABELS: Record<number, { ko: string; en: string; ja: string }> = {
  22: { ko: '22일', en: '22 days', ja: '22日' },
  50: { ko: '50일', en: '50 days', ja: '50日' },
  100: { ko: '100일', en: '100 days', ja: '100日' },
  200: { ko: '200일', en: '200 days', ja: '200日' },
  300: { ko: '300일', en: '300 days', ja: '300日' },
  365: { ko: '1주년', en: '1 Year', ja: '1周年' },
  500: { ko: '500일', en: '500 days', ja: '500日' },
  730: { ko: '2주년', en: '2 Years', ja: '2周年' },
  1000: { ko: '1000일', en: '1000 days', ja: '1000日' },
  1095: { ko: '3주년', en: '3 Years', ja: '3周年' },
  1825: { ko: '5주년', en: '5 Years', ja: '5周年' },
  3650: { ko: '10주년', en: '10 Years', ja: '10周年' },
};

export function AnniversaryCalculator({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const L = locale;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const elapsed = dateDiffDays(startDate, today);

  const copy = {
    ko: { title: '기념일 계산기', dateLabel: '시작 날짜 (기준일)', elapsed: '경과', day: '일', month: '개월', year: '년', upcoming: '다가오는 기념일', past: '이미 지남', dday: 'D+', today: '오늘!' },
    en: { title: 'Anniversary Calculator', dateLabel: 'Start Date', elapsed: 'Elapsed', day: 'days', month: 'months', year: 'years', upcoming: 'Upcoming Milestones', past: 'Past', dday: 'D+', today: 'Today!' },
    ja: { title: '記念日計算機', dateLabel: '開始日（基準日）', elapsed: '経過', day: '日', month: 'ヶ月', year: '年', upcoming: '今後の記念日', past: '経過済み', dday: 'D+', today: '今日！' },
  }[L];

  const elapsedMonths = Math.floor(elapsed / 30);
  const elapsedYears = Math.floor(elapsed / 365);

  const milestones = MILESTONES_DAYS.map(n => {
    const date = addDaysToDate(startDate, n);
    const diff = dateDiffDays(today, date);
    return { n, date, diff, label: MILESTONE_LABELS[n][L] };
  }).sort((a, b) => a.n - b.n);

  const upcoming = milestones.filter(m => m.diff >= 0);
  const past = milestones.filter(m => m.diff < 0).reverse().slice(0, 3);

  const shareText = L === 'ko'
    ? `우리 ${elapsed}일째! ❤️ — blog.oiyo.net`
    : L === 'en' ? `We are on Day ${elapsed}! ❤️ — blog.oiyo.net`
    : `私たちは${elapsed}日目です！❤️ — blog.oiyo.net`;

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="text-rose-500 fill-rose-400 w-5 h-5" />
            <h3 className="text-lg font-black text-slate-900">{copy.title}</h3>
          </div>
          <ShareButton text={shareText} locale={L} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-600">{copy.dateLabel}</label>
          <input type="date" value={toInputValue(startDate)}
            max={toInputValue(today)}
            onChange={e => { const d = new Date(e.target.value); d.setHours(0,0,0,0); if (!isNaN(d.getTime())) setStartDate(d); }}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:border-rose-400 outline-none transition-colors" />
        </div>

        {/* Elapsed counter */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: elapsed, unit: copy.day },
            { val: elapsedMonths, unit: copy.month },
            { val: elapsedYears, unit: copy.year },
          ].map(({ val, unit }) => (
            <div key={unit} className="bg-rose-50 rounded-2xl p-4 text-center border border-rose-100">
              <p className="text-3xl font-black text-rose-600">{val.toLocaleString()}</p>
              <p className="text-xs font-bold text-rose-400 mt-1">{unit}</p>
            </div>
          ))}
        </div>

        {/* Upcoming milestones */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-600">{copy.upcoming}</p>
          <div className="space-y-1.5">
            {upcoming.slice(0, 6).map(m => (
              <div key={m.n} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${m.diff === 0 ? 'bg-rose-100 border-rose-300' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}>
                <div className="flex items-center gap-2">
                  {m.diff === 0 && <span className="text-xs font-black text-rose-600 bg-rose-200 px-2 py-0.5 rounded-full">{copy.today}</span>}
                  <span className="font-bold text-slate-800">{m.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{fmtDate(m.date, L)}</p>
                  {m.diff > 0 && <p className="text-xs font-bold text-rose-500">D-{m.diff}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently passed */}
        {past.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400">{copy.past}</p>
            {past.map(m => (
              <div key={m.n} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 opacity-60">
                <span className="text-sm font-semibold text-slate-600">{m.label}</span>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{fmtDate(m.date, L)}</p>
                  <p className="text-xs text-slate-400">{copy.dday}{Math.abs(m.diff)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// D-DAY CALCULATOR
// ─────────────────────────────────────────────
const DDAY_ICONS = [
  { id: 'star', Icon: Star, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'heart', Icon: Heart, color: 'text-rose-500 bg-rose-50 border-rose-200' },
  { id: 'gift', Icon: Gift, color: 'text-pink-500 bg-pink-50 border-pink-200' },
  { id: 'graduation', Icon: GraduationCap, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  { id: 'briefcase', Icon: Briefcase, color: 'text-slate-600 bg-slate-50 border-slate-200' },
  { id: 'plane', Icon: Plane, color: 'text-sky-500 bg-sky-50 border-sky-200' },
  { id: 'music', Icon: Music, color: 'text-purple-500 bg-purple-50 border-purple-200' },
  { id: 'trophy', Icon: Trophy, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
  { id: 'calendar', Icon: Calendar, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
];

const KOREAN_HOLIDAYS = [
  { ko: '설날', en: "Lunar New Year", ja: '旧正月', month: 1, day: 29 },
  { ko: '삼일절', en: "Independence Movement Day", ja: '三一節', month: 3, day: 1 },
  { ko: '어린이날', en: "Children's Day", ja: 'こどもの日', month: 5, day: 5 },
  { ko: '광복절', en: "Liberation Day", ja: '光復節', month: 8, day: 15 },
  { ko: '추석', en: "Chuseok", ja: '秋夕', month: 10, day: 6 },
  { ko: '개천절', en: "National Foundation Day", ja: '開天節', month: 10, day: 3 },
  { ko: '크리스마스', en: "Christmas", ja: 'クリスマス', month: 12, day: 25 },
];

interface DayEvent { id: string; title: string; date: string; icon: string; }

const LS_KEY = 'blog-oiyo-dday-events';
function loadEvents(): DayEvent[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function saveEvents(events: DayEvent[]) {
  if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, JSON.stringify(events));
}

function getCountdown(dateStr: string): { days: number; label: string; past: boolean } {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = dateDiffDays(today, target);
  if (diff === 0) return { days: 0, label: 'D-Day', past: false };
  if (diff > 0) return { days: diff, label: `D-${diff}`, past: false };
  return { days: Math.abs(diff), label: `D+${Math.abs(diff)}`, past: true };
}

function getNextHolidayDate(month: number, day: number): string {
  const now = new Date();
  let year = now.getFullYear();
  let d = new Date(year, month - 1, day);
  if (d < now) d = new Date(year + 1, month - 1, day);
  return toInputValue(d);
}

type DDayState = { events: DayEvent[]; title: string; date: string; icon: string; adding: boolean; };
type DDayAction =
  | { type: 'setTitle'; val: string } | { type: 'setDate'; val: string } | { type: 'setIcon'; val: string }
  | { type: 'toggleAdding' } | { type: 'add' } | { type: 'remove'; id: string }
  | { type: 'setHoliday'; date: string; title: string };

function ddayReduce(state: DDayState, action: DDayAction): DDayState {
  switch (action.type) {
    case 'setTitle': return { ...state, title: action.val };
    case 'setDate': return { ...state, date: action.val };
    case 'setIcon': return { ...state, icon: action.val };
    case 'toggleAdding': return { ...state, adding: !state.adding, title: '', date: toInputValue(new Date()), icon: 'star' };
    case 'setHoliday': return { ...state, date: action.date, title: action.title };
    case 'add': {
      if (!state.title.trim() || !state.date) return state;
      const ev: DayEvent = { id: crypto.randomUUID(), title: state.title.trim(), date: state.date, icon: state.icon };
      const updated = [ev, ...state.events].slice(0, 20);
      saveEvents(updated);
      return { ...state, events: updated, adding: false, title: '', date: toInputValue(new Date()), icon: 'star' };
    }
    case 'remove': {
      const updated = state.events.filter(e => e.id !== action.id);
      saveEvents(updated);
      return { ...state, events: updated };
    }
  }
}

export function DdayCalculator({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const L = locale;
  const [state, dispatch] = useReducer(ddayReduce, {
    events: [],
    title: '',
    date: toInputValue(new Date()),
    icon: 'star',
    adding: false,
  });

  useEffect(() => {
    const loaded = loadEvents();
    if (loaded.length > 0) {
      // Patch initial state after mount
      dispatch({ type: 'add' }); // won't add (no title), just triggers re-render trick
    }
    // Actually just set events directly
  }, []);

  // Load events on mount
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<DayEvent[]>([]);
  useEffect(() => { setEvents(loadEvents()); setMounted(true); }, []);

  const addEvent = useCallback(() => {
    if (!state.title.trim() || !state.date) return;
    const ev: DayEvent = { id: crypto.randomUUID(), title: state.title.trim(), date: state.date, icon: state.icon };
    const updated = [ev, ...events].slice(0, 20);
    saveEvents(updated);
    setEvents(updated);
    dispatch({ type: 'toggleAdding' });
  }, [state.title, state.date, state.icon, events]);

  const removeEvent = useCallback((id: string) => {
    const updated = events.filter(e => e.id !== id);
    saveEvents(updated);
    setEvents(updated);
  }, [events]);

  const copy = {
    ko: {
      title: 'D-Day 계산기', addBtn: '+ 추가', cancel: '취소', save: '저장',
      titleLabel: '제목', dateLabel: '날짜', iconLabel: '아이콘',
      holidays: '공휴일 빠른 선택', empty: 'D-Day를 추가해보세요',
      dday: 'D-Day', past: '이미 지났어요', future: '남은 날',
    },
    en: {
      title: 'D-Day Counter', addBtn: '+ Add', cancel: 'Cancel', save: 'Save',
      titleLabel: 'Title', dateLabel: 'Date', iconLabel: 'Icon',
      holidays: 'Quick: Holidays', empty: 'Add your first D-Day!',
      dday: 'D-Day', past: 'Days since', future: 'Days left',
    },
    ja: {
      title: 'Dデイカウンター', addBtn: '+ 追加', cancel: 'キャンセル', save: '保存',
      titleLabel: 'タイトル', dateLabel: '日付', iconLabel: 'アイコン',
      holidays: '祝日クイック選択', empty: 'Dデイを追加してください',
      dday: 'Dデイ', past: '経過日数', future: '残り日数',
    },
  }[L];

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-sky-500 w-5 h-5" />
            <h3 className="text-lg font-black text-slate-900">{copy.title}</h3>
          </div>
          {!state.adding && (
            <button onClick={() => dispatch({ type: 'toggleAdding' })}
              className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-800 px-3 py-1.5 bg-sky-50 rounded-full border border-sky-200 transition-colors">
              <Plus className="w-3.5 h-3.5" />{copy.addBtn}
            </button>
          )}
        </div>

        {/* Add form */}
        {state.adding && (
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-200">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">{copy.titleLabel}</label>
              <input value={state.title} onChange={e => dispatch({ type: 'setTitle', val: e.target.value })}
                placeholder={L === 'ko' ? '예: 수능, 졸업, 결혼기념일' : L === 'en' ? 'e.g. Exam, Wedding, Trip' : '例：試験、卒業、記念日'}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:border-sky-400 outline-none transition-colors bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">{copy.dateLabel}</label>
              <input type="date" value={state.date} onChange={e => dispatch({ type: 'setDate', val: e.target.value })}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:border-sky-400 outline-none transition-colors bg-white" />
            </div>

            {/* Holiday presets */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400">{copy.holidays}</p>
              <div className="flex flex-wrap gap-1.5">
                {KOREAN_HOLIDAYS.map(h => (
                  <button key={h.ko} onClick={() => dispatch({ type: 'setHoliday', date: getNextHolidayDate(h.month, h.day), title: h[L] })}
                    className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-full hover:border-sky-300 hover:bg-sky-50 transition-colors font-medium text-slate-600">
                    {h[L]}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon picker */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400">{copy.iconLabel}</p>
              <div className="flex gap-2 flex-wrap">
                {DDAY_ICONS.map(({ id, Icon, color }) => (
                  <button key={id} onClick={() => dispatch({ type: 'setIcon', val: id })}
                    className={`p-2 rounded-xl border-2 transition-all ${state.icon === id ? color + ' border-current scale-110' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => dispatch({ type: 'toggleAdding' })}
                className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                {copy.cancel}
              </button>
              <button onClick={addEvent} disabled={!state.title.trim() || !state.date}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl text-sm font-bold text-white transition-colors">
                {copy.save}
              </button>
            </div>
          </div>
        )}

        {/* Events list */}
        {mounted && events.length === 0 && !state.adding ? (
          <div className="text-center py-10 text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">{copy.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map(ev => {
              const { days, label, past } = getCountdown(ev.date);
              const iconMeta = DDAY_ICONS.find(i => i.id === ev.icon) ?? DDAY_ICONS[0];
              const IconComp = iconMeta.Icon;
              return (
                <div key={ev.id} className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-2xl transition-all group">
                  <div className={`p-2 rounded-xl border ${iconMeta.color} flex-shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{ev.title}</p>
                    <p className="text-xs text-slate-400">{fmtDate(new Date(ev.date), L)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xl font-black ${days === 0 ? 'text-emerald-600' : past ? 'text-slate-400' : 'text-sky-600'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-slate-400">{days === 0 ? copy.dday : past ? copy.past : copy.future}</p>
                  </div>
                  <button onClick={() => removeEvent(ev.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
