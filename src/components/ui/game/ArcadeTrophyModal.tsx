import React, { useEffect, useState } from "react";
import { X, Trophy, Sparkles, CheckCircle2, Lock } from "lucide-react";
import {
  calculateArcadeTier,
  loadArcadePassProgress,
  type ArcadePassProgress,
  type ArcadeRankTier,
} from "../../../lib/games/arcade-pass";

interface ArcadeTrophyModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
}

export interface StudioTrophy {
  id: string;
  icon: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  checkUnlocked: (xp: number) => boolean;
}

export const STUDIO_TROPHIES: StudioTrophy[] = [
  {
    id: "first-win",
    icon: "🌟",
    title: { ko: "아케이드 첫 승리", en: "First Victory", ja: "初勝利", zh: "首场胜利" },
    desc: {
      ko: "아케이드 게임 중 하나에서 승리 또는 클리어 달성",
      en: "Win or solve any arcade game",
      ja: "いずれかのゲームで勝利",
      zh: "在任意游戏中获胜",
    },
    checkUnlocked: (xp) => xp > 0,
  },
  {
    id: "challenger-rank",
    icon: "⚔️",
    title: { ko: "도전자 (Challenger)", en: "Challenger", ja: "挑戦者", zh: "挑战者" },
    desc: {
      ko: "아케이드 패스 100 XP 돌파",
      en: "Reach 100+ XP in Arcade Pass",
      ja: "100 XP以上達成",
      zh: "突破100 XP",
    },
    checkUnlocked: (xp) => xp >= 100,
  },
  {
    id: "veteran-rank",
    icon: "🎖️",
    title: { ko: "베테랑 (Veteran)", en: "Veteran Challenger", ja: "ベテラン", zh: "老手" },
    desc: {
      ko: "아케이드 패스 300 XP 돌파",
      en: "Reach 300+ XP in Arcade Pass",
      ja: "300 XP以上達成",
      zh: "突破300 XP",
    },
    checkUnlocked: (xp) => xp >= 300,
  },
  {
    id: "elite-rank",
    icon: "💎",
    title: { ko: "엘리트 (Elite)", en: "Elite Master", ja: "エリート", zh: "精英" },
    desc: {
      ko: "아케이드 패스 600 XP 돌파",
      en: "Reach 600+ XP in Arcade Pass",
      ja: "600 XP以上達成",
      zh: "突破600 XP",
    },
    checkUnlocked: (xp) => xp >= 600,
  },
  {
    id: "legend-rank",
    icon: "👑",
    title: { ko: "스튜디오 레전드 (Legend)", en: "Studio Legend", ja: "レジェンド", zh: "传奇殿堂" },
    desc: {
      ko: "아케이드 패스 1,000 XP 최고 랭크 달성",
      en: "Reach 1,000 XP (LEGEND rank)",
      ja: "1,000 XP達成 最高ランク",
      zh: "达成1,000 XP 最高段位",
    },
    checkUnlocked: (xp) => xp >= 1000,
  },
  {
    id: "grand-deduction",
    icon: "🧩",
    title: { ko: "지혜의 탐구자", en: "Grand Deduction", ja: "知恵の探求者", zh: "智识探求者" },
    desc: {
      ko: "일일 미션 2회 이상 완료로 지적 능력 입증",
      en: "Complete 2+ daily missions",
      ja: "デイリーミッションを2回以上達成",
      zh: "完成2次以上每日任务",
    },
    checkUnlocked: (xp) => xp >= 100,
  },
];

export const ArcadeTrophyModal: React.FC<ArcadeTrophyModalProps> = ({
  isOpen,
  onClose,
  locale = "ko",
}) => {
  const [progress, setProgress] = useState<ArcadePassProgress | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const today = new Date().toISOString().slice(0, 10);
    setProgress(loadArcadePassProgress(today));
  }, [isOpen]);

  if (!isOpen || !progress) return null;

  const currentTier: ArcadeRankTier = calculateArcadeTier(progress.xp);
  const unlockedCount = STUDIO_TROPHIES.filter((t) => t.checkUnlocked(progress.xp)).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-warning/30 bg-card p-5 sm:p-6 shadow-2xl transition-all"
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

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="size-6 text-warning" />
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
              명예의 전당 (Trophy Cabinet)
            </h3>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              달성 업적: {unlockedCount} / {STUDIO_TROPHIES.length} · 현재 랭크 {currentTier}
            </p>
          </div>
        </div>

        {/* Trophies Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-96 overflow-y-auto pr-1">
          {STUDIO_TROPHIES.map((trophy) => {
            const unlocked = trophy.checkUnlocked(progress.xp);
            const title =
              trophy.title[locale] ?? trophy.title.ko ?? trophy.title.en;
            const desc =
              trophy.desc[locale] ?? trophy.desc.ko ?? trophy.desc.en;

            return (
              <div
                key={trophy.id}
                className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${
                  unlocked
                    ? "border-warning/40 bg-warning/5 shadow-xs"
                    : "border-border/60 bg-muted/20 opacity-60"
                }`}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                    unlocked
                      ? "bg-warning/20 text-warning shadow-inner"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {unlocked ? trophy.icon : <Lock className="size-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h5 className="truncate text-xs font-black text-foreground">
                      {title}
                    </h5>
                    {unlocked && (
                      <CheckCircle2 className="size-3.5 shrink-0 text-warning" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                    {desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="size-3.5 text-warning" />
            <span>플레이할수록 새로운 트로피가 언락됩니다</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-muted px-3 py-1 font-bold text-foreground hover:bg-muted/80"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
