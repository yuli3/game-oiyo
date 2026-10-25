import React, { useState, useEffect } from "react";
import { X, Calendar, Flame, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getDaysInMonth,
  getDailyStreak,
  type CalendarDay,
} from "../../../lib/games/daily-calendar";

interface DailyPuzzleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameSlug: string;
  gameTitle: string;
  onSelectDate?: (dateStr: string) => void;
}

export const DailyPuzzleCalendarModal: React.FC<DailyPuzzleCalendarModalProps> = ({
  isOpen,
  onClose,
  gameSlug,
  gameTitle,
  onSelectDate,
}) => {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [streak, setStreak] = useState(0);
  const [days, setDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setStreak(getDailyStreak(gameSlug));
    setDays(getDaysInMonth(gameSlug, currentYear, currentMonth));
  }, [isOpen, gameSlug, currentYear, currentMonth]);

  if (!isOpen) return null;

  const completedThisMonth = days.filter((d) => d.isCompleted).length;

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Determine starting weekday of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Calendar className="size-5" />
            </div>
            <div>
              <h2 id="calendar-modal-title" className="text-base font-black tracking-tight">
                {gameTitle} 데일리 퍼즐
              </h2>
              <p className="text-xs text-muted-foreground">날짜를 선택해 과거 퍼즐 풀기</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="flex items-center gap-2.5 rounded-2xl bg-muted/50 p-3 border border-border/50">
            <div className="flex size-8 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Flame className="size-4" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                연속 완료
              </div>
              <div className="text-sm font-black text-foreground">{streak}일 연속 달성</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl bg-muted/50 p-3 border border-border/50">
            <div className="flex size-8 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                이번 달 완료
              </div>
              <div className="text-sm font-black text-foreground">
                {completedThisMonth} / {days.length}일
              </div>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm font-black text-foreground">
            {currentYear}년 {currentMonth}월
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
              aria-label="이전 달"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
              aria-label="다음 달"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground mb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for leading days */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const isClickable = !day.isFuture;
            return (
              <button
                type="button"
                key={day.dateStr}
                disabled={!isClickable}
                onClick={() => {
                  if (onSelectDate) onSelectDate(day.dateStr);
                  onClose();
                }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  day.isCompleted
                    ? "bg-warning/15 border border-warning/40 text-warning font-black shadow-xs"
                    : day.isToday
                    ? "bg-primary text-primary-foreground font-black shadow-md"
                    : day.isFuture
                    ? "opacity-25 cursor-not-allowed bg-muted/20"
                    : "bg-muted/40 hover:bg-muted text-foreground border border-border/40"
                }`}
              >
                <span>{day.dayNumber}</span>
                {day.isCompleted && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-warning" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          과거 퍼즐을 선택해 완료하면 캘린더 도장이 찍힙니다.
        </p>
      </div>
    </div>
  );
};
