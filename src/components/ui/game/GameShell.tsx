import React, { useEffect, useRef } from "react";
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Share2,
  ArrowLeft,
  Camera,
  Swords,
} from "lucide-react";
import type { FlowPhase } from "../../../lib/games/game-flow";

export interface GameShellProps {
  title: string;
  subtitle?: string;
  keyart?: string;
  phase: FlowPhase;
  score?: number | string;
  best?: number | string;
  muted: boolean;
  onToggleMute: () => void;
  isImmersive: boolean;
  onTogglePortal: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  portalLabels?: {
    enter: string;
    exit: string;
    mute: string;
    unmute: string;
  };
  onStart: () => void;
  onResume?: () => void;
  onPause?: () => void;
  onRetry?: () => void;
  onExit?: () => void;
  countdownValue?: number;
  resultTitle?: string;
  resultSubtitle?: string;
  resultStats?: Array<{ label: string; value: string | number }>;
  onShare?: () => void;
  shareCopied?: boolean;
  onShareCard?: () => void;
  shareCardCopied?: boolean;
  challengeInfo?: {
    challengerScore: number;
    outcome: "win" | "lose" | "tie" | "solo";
    diff?: number;
  };
  controlsHint?: string;
  extraHeaderActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const GameShell: React.FC<GameShellProps> = ({
  title,
  subtitle,
  keyart,
  phase,
  score,
  best,
  muted,
  onToggleMute,
  isImmersive,
  onTogglePortal,
  containerRef,
  portalLabels = {
    enter: "전체화면",
    exit: "나가기",
    mute: "음소거",
    unmute: "소리 켜기",
  },
  onStart,
  onResume,
  onPause,
  onRetry,
  onExit,
  countdownValue = 3,
  resultTitle,
  resultSubtitle,
  resultStats,
  onShare,
  shareCopied = false,
  onShareCard,
  shareCardCopied = false,
  challengeInfo,
  controlsHint,
  extraHeaderActions,
  children,
  className = "",
}) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const targetRef = containerRef ?? innerRef;

  // Keyboard navigation for Pause/Mute/Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        onTogglePortal();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        onToggleMute();
      } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        if (phase === "play" && onPause) {
          e.preventDefault();
          onPause();
        } else if (phase === "paused" && onResume) {
          e.preventDefault();
          onResume();
        }
      } else if (e.key === "Enter" || e.key === " ") {
        if (phase === "title") {
          e.preventDefault();
          onStart();
        } else if (phase === "result" && onRetry) {
          e.preventDefault();
          onRetry();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, onStart, onResume, onPause, onRetry, onToggleMute, onTogglePortal]);

  return (
    <div
      ref={targetRef}
      data-game-surface
      className={
        isImmersive
          ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-background p-3 sm:p-5 select-none touch-none"
          : `relative mx-auto my-6 w-full max-w-2xl rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-md ${className}`
      }
    >
      {/* ── Top Header Bar ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {onExit && phase !== "title" && (
            <button
              type="button"
              onClick={onExit}
              className="flex min-h-11 items-center gap-1 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs font-bold text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="타이틀로 돌아가기"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Title</span>
            </button>
          )}

          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground sm:text-xl">{title}</h3>
            {subtitle && (
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* HUD Controls */}
        <div className="flex items-center gap-2">
          {extraHeaderActions}

          {score !== undefined && (
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-1 text-center">
              <span className="block text-xs font-black uppercase text-muted-foreground">SCORE</span>
              <span className="font-mono text-sm font-black text-primary">{score}</span>
            </div>
          )}

          {best !== undefined && (
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-1 text-center">
              <span className="block text-xs font-black uppercase text-muted-foreground">BEST</span>
              <span className="font-mono text-sm font-black text-chart-2">{best}</span>
            </div>
          )}

          {phase === "play" && onPause && (
            <button
              type="button"
              onClick={onPause}
              className="flex min-h-11 items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-bold text-foreground hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="일시정지 (P)"
              title="일시정지 (P)"
            >
              <Pause className="size-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={muted}
            aria-label={muted ? portalLabels.unmute : portalLabels.mute}
            title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
            className="flex min-h-11 items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>

          <button
            type="button"
            onClick={onTogglePortal}
            aria-pressed={isImmersive}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
            className="flex min-h-11 items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
      </div>

      {/* ── Main Viewport Wrapper ── */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden rounded-2xl border border-border/80 bg-background/95">
        {/* In-Game Children (Canvas or UI Grid) */}
        {children}

        {/* ── 1. Title Screen Overlay ── */}
        {phase === "title" && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-background/90 backdrop-blur-md text-center animate-in fade-in duration-200">
            {keyart && (
              <div className="mb-4 w-full max-w-sm overflow-hidden rounded-2xl border border-border shadow-lg">
                <img src={keyart} alt={title} className="h-40 w-full object-cover sm:h-52" />
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">{title}</h2>
            {subtitle && <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-md">{subtitle}</p>}

            <button
              type="button"
              onClick={onStart}
              className="mt-6 min-h-12 w-full max-w-xs rounded-full bg-primary px-8 text-base font-black text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
            >
              START GAME
            </button>
            <p className="mt-2 text-xs text-muted-foreground">Press Enter or Space</p>
          </div>
        )}

        {/* ── 2. Countdown Overlay ── */}
        {phase === "countdown" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-xs select-none pointer-events-none">
            <span className="text-7xl sm:text-8xl font-black tracking-tighter text-primary animate-ping">
              {countdownValue === 0 ? "GO!" : countdownValue}
            </span>
          </div>
        )}

        {/* ── 3. Paused Overlay ── */}
        {phase === "paused" && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="max-w-xs w-full rounded-2xl border border-border bg-card p-6 shadow-2xl text-center space-y-4">
              <h3 className="text-xl font-black text-foreground">PAUSED</h3>
              <div className="space-y-2 pt-2">
                {onResume && (
                  <button
                    type="button"
                    onClick={onResume}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:bg-primary/90"
                  >
                    <Play className="size-4" />
                    계속하기 (Resume)
                  </button>
                )}
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 text-foreground font-bold text-sm hover:bg-muted"
                  >
                    <RotateCcw className="size-4" />
                    다시 시작 (Retry)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Result Overlay ── */}
        {phase === "result" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-background/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
            <div className="max-w-sm w-full rounded-3xl border border-border bg-card p-6 shadow-2xl text-center space-y-4">
              {keyart && (
                <div className="mx-auto mb-2 overflow-hidden rounded-xl border border-border bg-muted max-w-48">
                  <img src={keyart} alt="" className="h-24 w-full object-cover" />
                </div>
              )}

              <h4 className="text-2xl font-black text-foreground">{resultTitle ?? "ROUND COMPLETE"}</h4>
              {resultSubtitle && <p className="text-xs text-muted-foreground">{resultSubtitle}</p>}

              {/* Rival Challenge Outcome Banner */}
              {challengeInfo && challengeInfo.outcome !== "solo" && (
                <div
                  className={`rounded-xl border p-2.5 text-center ${
                    challengeInfo.outcome === "win"
                      ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                      : challengeInfo.outcome === "lose"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border bg-muted/40 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider">
                    <Swords className="size-3.5" />
                    <span>
                      {challengeInfo.outcome === "win"
                        ? "CHALLENGE WON!"
                        : challengeInfo.outcome === "lose"
                        ? "CHALLENGE LOST"
                        : "TIED RUN"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold">
                    Rival: {challengeInfo.challengerScore.toLocaleString()} pts{" "}
                    {challengeInfo.diff !== undefined &&
                      `(${challengeInfo.diff > 0 ? `+${challengeInfo.diff}` : challengeInfo.diff})`}
                  </p>
                </div>
              )}

              {resultStats && resultStats.length > 0 && (
                <div className="grid grid-cols-2 gap-2 py-2">
                  {resultStats.map((st, i) => (
                    <div key={i} className="rounded-xl border border-border bg-muted/40 p-2.5">
                      <span className="block text-xs font-bold uppercase text-muted-foreground">{st.label}</span>
                      <span className="font-mono text-base font-black text-foreground">{st.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {onShareCard && (
                  <button
                    type="button"
                    onClick={onShareCard}
                    className="flex flex-1 min-h-11 items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 text-xs font-black text-primary hover:bg-primary/20"
                  >
                    <Camera className="size-4" />
                    {shareCardCopied ? "카드 복사됨!" : "스냅샷 카드"}
                  </button>
                )}
                {onShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    className="flex flex-1 min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/60 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    <Share2 className="size-4" />
                    {shareCopied ? "복사됨!" : "도전장 링크"}
                  </button>
                )}
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex flex-1 min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-black text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    <RotateCcw className="size-4" />
                    한 판 더 (Retry)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Controls Hint ── */}
      {controlsHint && (
        <div className="mt-2 text-center shrink-0">
          <p className="text-xs font-medium text-muted-foreground">{controlsHint}</p>
        </div>
      )}
    </div>
  );
};
