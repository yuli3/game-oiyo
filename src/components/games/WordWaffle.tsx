import React, { useState, useEffect, useRef } from "react";
import {
  type WaffleGameState,
  type WafflePuzzleDefinition,
  type WaffleCell,
  IS_WAFFLE_HOLE,
  createInitialWaffleGame,
  swapWaffleCells,
} from "../../lib/games/word-waffle";
import {
  createShakeState,
  addTrauma,
  updateShake,
  triggerHaptic,
} from "../../lib/games/juice-engine";
import { playSyntheticTone } from "../../lib/games/audio-mixer";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import { Button } from "../ui/button";

interface WordWaffleProps {
  locale?: string;
}

function TiltWaffleTile({
  cell,
  isSelected,
  onClick,
}: {
  cell: WaffleCell;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  let stateCls = "";
  switch (cell.state) {
    case "green":
      stateCls = "border-chart-2 bg-chart-2 text-primary-foreground";
      break;
    case "yellow":
      stateCls = "border-chart-4 bg-chart-4 text-foreground";
      break;
    case "gray":
    default:
      stateCls = "border-muted bg-muted text-muted-foreground";
      break;
  }

  const selectCls = isSelected
    ? "ring-4 ring-primary scale-110 z-10 shadow-lg"
    : cell.isLocked
    ? "cursor-default"
    : "cursor-pointer hover:brightness-110 active:scale-95";

  return (
    <button
      type="button"
      onPointerMove={cell.isLocked ? undefined : onPointerMove}
      onPointerLeave={cell.isLocked ? undefined : onPointerLeave}
      onClick={() => {
        if (!cell.isLocked) {
          triggerPop(0.15);
        }
        onClick();
      }}
      style={
        {
          "--card-tilt": cell.isLocked ? "none" : transformCss,
        } as React.CSSProperties
      }
      className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border-2 text-xl font-black uppercase transition-all duration-150 will-change-transform transform-(--card-tilt) ${stateCls} ${selectCls}`}
    >
      {cell.letter}
      {cell.isLocked && (
        <span className="absolute bottom-1 right-1 text-xs opacity-80">🔒</span>
      )}
    </button>
  );
}

export default function WordWaffle({ locale = "ko" }: WordWaffleProps) {
  const [initData] = useState(() => createInitialWaffleGame(locale, 0, Date.now()));
  const [puzzle] = useState<WafflePuzzleDefinition>(initData.puzzle);
  const [game, setGame] = useState<WaffleGameState>(initData.game);
  const [selectedCoord, setSelectedCoord] = useState<{ r: number; c: number } | null>(null);

  const shakeStateRef = useRef(createShakeState());
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const [shareCopied, setShareCopied] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxRef.current = new AudioContextClass();
    }
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Frame animation loop for screen shake
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      if (shakeStateRef.current.trauma > 0.001) {
        const { state, offset } = updateShake(shakeStateRef.current, dt, time / 1000);
        shakeStateRef.current = state;
        setShakeOffset({ x: offset.x, y: offset.y });
      } else if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
        setShakeOffset({ x: 0, y: 0 });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [shakeOffset.x, shakeOffset.y]);

  const handleCellClick = (r: number, c: number) => {
    if (game.status !== "playing") return;
    if (IS_WAFFLE_HOLE(r, c)) return;

    const cell = game.grid[r][c];
    if (!cell || cell.isLocked) {
      playSyntheticTone(audioCtxRef.current, { freq: 240, duration: 0.1, type: "sawtooth" });
      MobileHapticsPro.warning();
      triggerHaptic("warning");
      return;
    }

    if (!selectedCoord) {
      setSelectedCoord({ r, c });
      playSyntheticTone(audioCtxRef.current, { freq: 440, duration: 0.08, type: "sine" });
      MobileHapticsPro.light();
      triggerHaptic("light");
      return;
    }

    // Attempt Swap
    const nextGame = swapWaffleCells(game, puzzle, selectedCoord, { r, c });
    if (!nextGame) {
      setSelectedCoord(null);
      return;
    }

    setGame(nextGame);
    setSelectedCoord(null);
    playSyntheticTone(audioCtxRef.current, { freq: 520, duration: 0.1, type: "triangle" });
    MobileHapticsPro.impact();
    triggerHaptic("medium");

    if (nextGame.status === "won") {
      shakeStateRef.current = addTrauma(shakeStateRef.current, 0.5);
      MobileHapticsPro.success();
      triggerHaptic("combo");

      // Celebratory melody
      playSyntheticTone(audioCtxRef.current, { freq: 523.25, duration: 0.25, type: "sine" });
      setTimeout(() => {
        playSyntheticTone(audioCtxRef.current, { freq: 659.25, duration: 0.3, type: "sine" });
      }, 70);
      setTimeout(() => {
        playSyntheticTone(audioCtxRef.current, { freq: 783.99, duration: 0.35, type: "sine" });
      }, 140);
    } else if (nextGame.status === "lost") {
      MobileHapticsPro.heavy();
    }
  };

  const handleRestart = () => {
    MobileHapticsPro.light();
    const fresh = createInitialWaffleGame(locale, 0, Date.now());
    setGame(fresh.game);
    setSelectedCoord(null);
  };

  const handleShare = () => {
    let waffleEmoji = "";
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (IS_WAFFLE_HOLE(r, c)) {
          waffleEmoji += "⬜";
        } else {
          const st = game.grid[r][c]?.state;
          waffleEmoji += st === "green" ? "🟩" : st === "yellow" ? "🟨" : "⬛";
        }
      }
      waffleEmoji += "\n";
    }

    const text =
      locale === "ko"
        ? `🧇 단어 와플 - ${game.status === "won" ? `성공! 남은 스왑: ${game.swapsRemaining}` : "실패"} (별 ${game.stars}개)\n${waffleEmoji}https://game.oiyo.net/word-waffle`
        : `🧇 Word Waffle - ${game.status === "won" ? `Solved! Swaps left: ${game.swapsRemaining}` : "Failed"} (${game.stars} stars)\n${waffleEmoji}https://game.oiyo.net/word-waffle`;

    navigator.clipboard?.writeText(text).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  return (
    <div
      style={
        {
          "--shake-x": `${shakeOffset.x}px`,
          "--shake-y": `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
      className="relative mx-auto flex w-full max-w-md translate-x-(--shake-x) translate-y-(--shake-y) flex-col items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-6"
    >
      {/* Top Header: Swaps remaining & Goal */}
      <div className="flex w-full items-center justify-between border-b border-border pb-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? "남은 교환" : "SWAPS LEFT"}
          </span>
          <span className="text-2xl font-black font-mono text-foreground">
            {game.swapsRemaining} / {game.maxSwaps}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-xs bg-chart-2" />
            <span className="text-muted-foreground">{locale === "ko" ? "정답" : "Correct"}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-xs bg-chart-4" />
            <span className="text-muted-foreground">{locale === "ko" ? "포함" : "In word"}</span>
          </span>
        </div>
      </div>

      {/* 5x5 Waffle Grid Board */}
      <div className="relative my-6 grid grid-cols-5 gap-2.5 rounded-2xl bg-muted/20 p-3 sm:p-4">
        {game.grid.map((row, r) =>
          row.map((cell, c) => {
            if (IS_WAFFLE_HOLE(r, c) || !cell) {
              return <div key={`${r}-${c}`} className="h-12 w-12 sm:h-14 sm:w-14" />;
            }

            const isSelected = selectedCoord?.r === r && selectedCoord?.c === c;

            return (
              <TiltWaffleTile
                key={`${r}-${c}`}
                cell={cell}
                isSelected={isSelected}
                onClick={() => handleCellClick(r, c)}
              />
            );
          })
        )}

        {/* Victory Modal */}
        {game.status === "won" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-card/95 p-6 backdrop-blur-xs text-center">
            <span className="text-5xl">🧇🎉</span>
            <h2 className="mt-2 text-2xl font-black text-warning">
              {locale === "ko" ? "와플 완성!" : "Waffle Solved!"}
            </h2>
            <div className="my-2 flex gap-1 text-2xl">
              {Array(game.stars)
                .fill("⭐")
                .map((star, idx) => (
                  <span key={idx}>{star}</span>
                ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {locale === "ko"
                ? `${game.swapsRemaining}회의 교환을 남기고 완벽히 풀었습니다!`
                : `Solved with ${game.swapsRemaining} swaps to spare!`}
            </p>

            <div className="mt-5 flex gap-2">
              <Button type="button" variant="default" size="lg" onClick={handleRestart}>
                {locale === "ko" ? "다시 도전" : "Play Again"}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleShare}>
                {shareCopied
                  ? locale === "ko" ? "복사 완료!" : "Copied!"
                  : locale === "ko" ? "결과 공유" : "Share"}
              </Button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {game.status === "lost" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-card/95 p-6 backdrop-blur-xs text-center">
            <span className="text-5xl">⏰</span>
            <h2 className="mt-2 text-2xl font-black text-destructive">
              {locale === "ko" ? "스왑 횟수 소진" : "Out of Swaps"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === "ko"
                ? "15번의 교환 기회를 모두 사용했습니다."
                : "Used all 15 swap attempts."}
            </p>
            <Button type="button" variant="default" size="lg" className="mt-5" onClick={handleRestart}>
              {locale === "ko" ? "다시 도전" : "Try Again"}
            </Button>
          </div>
        )}
      </div>

      {/* Guide Footer */}
      <div className="flex w-full items-center justify-center border-t border-border pt-3 text-center text-xs text-muted-foreground">
        <span>
          {locale === "ko"
            ? "두 글자를 차례로 터치하여 위치를 바꾸세요 (녹색은 고정)"
            : "Tap two letters to swap their positions (Green is locked)"}
        </span>
      </div>
    </div>
  );
}
