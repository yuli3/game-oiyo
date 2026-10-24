import React, { useEffect, useState } from "react";
import { X, Award, CheckCircle2, Sparkles } from "lucide-react";
import {
  calculateArcadeTier,
  checkInDailyStreak,
  loadArcadePassProgress,
  STREAK_REWARDS,
  type ArcadePassProgress,
  type ArcadeRankTier,
} from "../../../lib/games/arcade-pass";
import { todayKey, previousDayKey } from "../../../lib/games/daily";

interface ArcadePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
}

const TIER_STYLES: Record<ArcadeRankTier, { border: string; badge: string }> = {
  LEGEND: {
    border: "border-warning/50",
    badge: "bg-warning/10 text-warning border-warning/40",
  },
  ELITE: {
    border: "border-chart-4/50",
    badge: "bg-chart-4/10 text-chart-4 border-chart-4/40",
  },
  VETERAN: {
    border: "border-primary/50",
    badge: "bg-primary/10 text-primary border-primary/40",
  },
  CHALLENGER: {
    border: "border-chart-2/50",
    badge: "bg-chart-2/10 text-chart-2 border-chart-2/40",
  },
  RECRUIT: {
    border: "border-border",
    badge: "bg-muted text-muted-foreground border-border",
  },
};

const NEXT_TIER_GOAL: Record<ArcadeRankTier, number> = {
  RECRUIT: 100,
  CHALLENGER: 300,
  VETERAN: 600,
  ELITE: 1000,
  LEGEND: 1000,
};

export const ArcadePassModal: React.FC<ArcadePassModalProps> = ({
  isOpen,
  onClose,
  locale = "ko",
}) => {
  const [progress, setProgress] = useState<ArcadePassProgress | null>(null);
  const [streakToast, setStreakToast] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const today = todayKey();
    const prevDay = previousDayKey(today);
    const loaded = loadArcadePassProgress(today);
    const { updatedProgress, bonusXp, alreadyCheckedIn } = checkInDailyStreak(
      loaded,
      today,
      prevDay
    );
    setProgress(updatedProgress);
    if (!alreadyCheckedIn && bonusXp > 0) {
      setStreakToast(bonusXp);
    }
  }, [isOpen]);

  if (!isOpen || !progress) return null;

  const currentTier = calculateArcadeTier(progress.xp);
  const tierStyle = TIER_STYLES[currentTier];
  const nextGoal = NEXT_TIER_GOAL[currentTier];
  const pct =
    currentTier === "LEGEND"
      ? 100
      : Math.min(100, Math.round((progress.xp / nextGoal) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-3xl border ${tierStyle.border} bg-card p-5 sm:p-6 shadow-2xl transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="닫기"
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-4">
          <Award className="size-6 text-primary" />
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
              아케이드 패스
            </h3>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Season 1 · Daily Mission
            </p>
          </div>
        </div>

        {/* Player Tier & XP Card */}
        <div className="rounded-2xl border border-border bg-muted/40 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              스튜디오 랭크
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-black tracking-wider ${tierStyle.badge}`}
            >
              {currentTier}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-black text-foreground">
              {progress.xp.toLocaleString()}{" "}
              <span className="text-xs font-bold text-muted-foreground">XP</span>
            </span>
            {currentTier !== "LEGEND" && (
              <span className="text-xs font-semibold text-muted-foreground">
                다음 티어까지 {Math.max(0, nextGoal - progress.xp)} XP
              </span>
            )}
          </div>

          {/* Progress Track */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 w-(--pct)"
              style={{ "--pct": `${pct}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* 7-Day Attendance Streak Calendar Grid */}
        <div className="rounded-2xl border border-border bg-card/60 p-4 mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔥</span>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                7일 연속 출석 스탬프
              </h4>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {progress.streakCount ?? 1}일차 출석
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {STREAK_REWARDS.map((reward) => {
              const isClaimed = (progress.claimedStreakDays ?? []).includes(reward.day);
              const isCurrentDay = (progress.streakCount ?? 1) === reward.day;

              return (
                <div
                  key={reward.day}
                  className={`flex flex-col items-center justify-between p-1.5 rounded-xl border text-center transition-all ${
                    isClaimed
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : isCurrentDay
                      ? "border-warning/80 bg-warning/15 text-warning ring-2 ring-warning/50 animate-pulse"
                      : "border-border bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <span className="text-xs font-bold opacity-80">D{reward.day}</span>
                  <span className="text-xs font-black my-1">
                    {reward.isMilestone ? (reward.day === 7 ? "👑" : "⭐") : "🪙"}
                  </span>
                  <span className="text-xs font-black tracking-tight">
                    +{reward.xp}
                  </span>
                  {isClaimed && (
                    <span className="text-xs font-black text-primary mt-0.5">✓</span>
                  )}
                </div>
              );
            })}
          </div>

          {streakToast !== null && (
            <div className="mt-2.5 rounded-xl border border-warning/40 bg-warning/10 p-2 text-center text-xs font-black text-warning animate-in fade-in">
              🎉 오늘 출석 보너스 +{streakToast} XP 획득!
            </div>
          )}
        </div>

        {/* Daily Missions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              오늘의 데일리 미션
            </h4>
            <span className="text-xs font-semibold text-muted-foreground">
              {progress.lastActiveDate}
            </span>
          </div>

          <div className="space-y-2.5">
            {progress.missions.map((mission) => {
              const title =
                mission.title[locale] || mission.title.en || mission.title.ko;
              const missionPct = Math.min(
                100,
                Math.round((mission.current / mission.goal) * 100)
              );

              return (
                <div
                  key={mission.id}
                  className={`rounded-2xl border p-3.5 transition-all ${
                    mission.completed
                      ? "border-chart-2/40 bg-chart-2/10"
                      : "border-border bg-card/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {mission.completed ? (
                        <CheckCircle2 className="size-4 shrink-0 text-chart-2" />
                      ) : (
                        <Sparkles className="size-4 shrink-0 text-primary" />
                      )}
                      <span className="text-xs font-bold text-foreground">
                        {title}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-black text-primary">
                      +{mission.xpReward} XP
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-medium">
                    <span className="capitalize">{mission.gameSlug}</span>
                    <span>
                      {mission.current} / {mission.goal}
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-300 w-(--mission-pct) ${
                        mission.completed ? "bg-chart-2" : "bg-primary"
                      }`}
                      style={{ "--mission-pct": `${missionPct}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
