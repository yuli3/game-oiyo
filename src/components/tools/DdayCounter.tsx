import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

interface DdayEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

interface Labels {
  title: string;
  addEvent: string;
  eventName: string;
  eventDate: string;
  addBtn: string;
  empty: string;
  deleteBtn: string;
  today: string;
  maxReached: string;
  namePlaceholder: string;
}

const L: Record<Locale, Labels> = {
  ko: {
    title: "D-Day 카운터",
    addEvent: "이벤트 추가",
    eventName: "이벤트 이름",
    eventDate: "목표 날짜",
    addBtn: "추가",
    empty: "아직 등록된 D-Day가 없습니다",
    deleteBtn: "삭제",
    today: "오늘이에요!",
    maxReached: "최대 10개까지 등록할 수 있습니다.",
    namePlaceholder: "예: 생일, 시험일, 여행...",
  },
  en: {
    title: "D-Day Counter",
    addEvent: "Add Event",
    eventName: "Event Name",
    eventDate: "Target Date",
    addBtn: "Add",
    empty: "No D-Day events yet",
    deleteBtn: "Delete",
    today: "Today!",
    maxReached: "You can add up to 10 events.",
    namePlaceholder: "e.g. Birthday, Exam, Trip...",
  },
  ja: {
    title: "Dデイカウンター",
    addEvent: "イベント追加",
    eventName: "イベント名",
    eventDate: "目標日",
    addBtn: "追加",
    empty: "まだDデイイベントがありません",
    deleteBtn: "削除",
    today: "今日！",
    maxReached: "最大10件まで登録できます。",
    namePlaceholder: "例：誕生日、試験、旅行...",
  },
  fr: {
    title: "Compteur J-Day",
    addEvent: "Ajouter un événement",
    eventName: "Nom de l'événement",
    eventDate: "Date cible",
    addBtn: "Ajouter",
    empty: "Aucun événement J-Day pour l'instant",
    deleteBtn: "Supprimer",
    today: "Aujourd'hui !",
    maxReached: "Vous pouvez ajouter jusqu'à 10 événements.",
    namePlaceholder: "Ex : Anniversaire, Examen, Voyage...",
  },
  es: {
    title: "Contador D-Day",
    addEvent: "Agregar evento",
    eventName: "Nombre del evento",
    eventDate: "Fecha objetivo",
    addBtn: "Agregar",
    empty: "Aún no hay eventos D-Day",
    deleteBtn: "Eliminar",
    today: "¡Hoy!",
    maxReached: "Puedes agregar hasta 10 eventos.",
    namePlaceholder: "Ej: Cumpleaños, Examen, Viaje...",
  },
  zh: {
    title: "倒计时计数器",
    addEvent: "添加事件",
    eventName: "事件名称",
    eventDate: "目标日期",
    addBtn: "添加",
    empty: "暂无倒计时事件",
    deleteBtn: "删除",
    today: "就是今天！",
    maxReached: "最多可添加10个事件。",
    namePlaceholder: "例：生日、考试、旅行...",
  },
};

const STORAGE_KEY = "dday-counter-events";
const MAX_EVENTS = 10;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(targetStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatCountdown(msLeft: number): string {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function getMsUntilMidnight(targetStr: string): number {
  const target = new Date(targetStr + "T00:00:00");
  const now = new Date();
  return target.getTime() - now.getTime();
}

interface CardProps {
  event: DdayEvent;
  locale: Locale;
  onDelete: (id: string) => void;
}

const DdayCard: React.FC<CardProps> = ({ event, locale, onDelete }) => {
  const t = L[locale] ?? L.en;
  const diff = diffDays(event.date);
  const isWithin7 = diff > 0 && diff <= 7;

  const [liveMs, setLiveMs] = useState<number | null>(null);

  useEffect(() => {
    if (!isWithin7) {
      setLiveMs(null);
      return;
    }
    const update = () => setLiveMs(getMsUntilMidnight(event.date));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isWithin7, event.date]);

  let badge = "";
  let badgeColor = "";

  if (diff === 0) {
    badge = "D-Day! 🎉";
    badgeColor = "text-success";
  } else if (diff > 0) {
    badge = `D-${diff}`;
    badgeColor = diff <= 7 ? "text-destructive" : "text-info";
  } else {
    badge = `D+${Math.abs(diff)}`;
    badgeColor = "text-muted-foreground";
  }

  const cardBg =
    diff === 0
      ? "bg-success/10 border-success/40"
      : diff > 0 && diff <= 7
      ? "bg-destructive/10 border-destructive/30"
      : diff > 0
      ? "bg-info/10 border-info/30"
      : "bg-muted/30 border-border";

  return (
    <div className={`rounded-2xl border-2 p-5 flex items-center justify-between gap-4 transition-all ${cardBg}`}>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-bold truncate">{event.name}</p>
        <p className="text-xs text-muted-foreground">{event.date}</p>
        {isWithin7 && liveMs !== null && liveMs > 0 && (
          <p className="text-[11px] font-mono font-bold text-destructive">
            {formatCountdown(liveMs)}
          </p>
        )}
        {diff === 0 && (
          <p className="text-[11px] font-bold text-success">{t.today}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-2xl font-black ${badgeColor}`}>{badge}</span>
        <button
          onClick={() => onDelete(event.id)}
          aria-label={t.deleteBtn}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-destructive/10 hover:text-destructive border border-border transition-colors"
        >
          {t.deleteBtn}
        </button>
      </div>
    </div>
  );
};

const DdayCounter: React.FC<{ locale?: Locale }> = ({ locale = "en" }) => {
  const t = L[locale] ?? L.en;

  const [events, setEvents] = useState<DdayEvent[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DdayEvent[];
        if (Array.isArray(parsed)) setEvents(parsed);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // ignore
    }
  }, [events, hydrated]);

  const handleAdd = useCallback(() => {
    if (!name.trim()) return;
    if (!date) return;
    if (events.length >= MAX_EVENTS) {
      setError(t.maxReached);
      return;
    }
    setError("");
    const newEvent: DdayEvent = {
      id: `${Date.now()}-${Math.random()}`,
      name: name.trim(),
      date,
    };
    setEvents(prev =>
      [...prev, newEvent].sort((a, b) => {
        const da = diffDays(a.date);
        const db = diffDays(b.date);
        // Sort by absolute closeness: future first, then past
        const ka = da >= 0 ? da : 1e9 + Math.abs(da);
        const kb = db >= 0 ? db : 1e9 + Math.abs(db);
        return ka - kb;
      })
    );
    setName("");
    setDate(todayStr());
  }, [name, date, events.length, t.maxReached]);

  const handleDelete = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setError("");
  }, []);

  // Sort events by ascending diff (closest future first, then past)
  const sorted = [...events].sort((a, b) => {
    const da = diffDays(a.date);
    const db = diffDays(b.date);
    const ka = da >= 0 ? da : 1e9 + Math.abs(da);
    const kb = db >= 0 ? db : 1e9 + Math.abs(db);
    return ka - kb;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-black">{t.title}</h1>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-border bg-muted/20 p-5 flex flex-col gap-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.addEvent}</p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t.eventName}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder={t.namePlaceholder}
              maxLength={40}
              className="w-full px-4 py-3 bg-background rounded-xl border border-border font-medium outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t.eventDate}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-background rounded-xl border border-border font-black outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !date}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.addBtn}
        </button>
      </div>

      {/* Event list */}
      <div className="flex flex-col gap-3">
        {hydrated && sorted.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground font-medium">{t.empty}</p>
          </div>
        ) : (
          sorted.map(ev => (
            <DdayCard key={ev.id} event={ev} locale={locale} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
};

export default DdayCounter;
