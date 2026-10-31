import React, { useState, useEffect, useRef } from "react";
import {
  type HexColor,
  type HexaSortGameState,
  HEX_COLOR_HEXES,
  createInitialHexaSortGame,
  placeAndResolve,
} from "../../lib/games/hexa-sort";
import {
  createShakeState,
  addTrauma,
  updateShake,
  triggerHaptic,
} from "../../lib/games/juice-engine";
import { playSyntheticTone } from "../../lib/games/audio-mixer";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import { Button } from "../ui/button";

interface HexaSortProps {
  locale?: string;
}

function TiltHandHexaButton({
  slot,
  isSelected,
  onSelect,
}: {
  slot: { id: string; stack: HexColor[] };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={
        {
          "--card-tilt": transformCss,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.2);
        MobileHapticsPro.light();
        onSelect();
      }}
      className={`relative flex h-24 w-20 flex-col-reverse items-center justify-start rounded-2xl border p-2 transition-all duration-150 will-change-transform transform-(--card-tilt) ${
        isSelected
          ? "border-primary bg-primary/10 ring-2 ring-primary scale-105 shadow-md"
          : "border-border bg-muted/40 hover:bg-muted/70"
      }`}
    >
      {/* Mini Isometric Stack in Hand */}
      <div className="relative mb-2 flex flex-col-reverse items-center">
        {slot.stack.map((color, tileIdx) => (
          <div
            key={tileIdx}
            style={{ "--tile-bg": HEX_COLOR_HEXES[color] } as React.CSSProperties}
            className={`h-6 w-12 rounded-md border border-black/20 shadow-xs bg-(--tile-bg) ${
              tileIdx > 0 ? "-mt-3" : ""
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-muted-foreground">
        {slot.stack.length}
      </span>
    </button>
  );
}

export default function HexaSort({ locale = "ko" }: HexaSortProps) {
  const [game, setGame] = useState<HexaSortGameState>(() => createInitialHexaSortGame(1));
  const [selectedHandIdx, setSelectedHandIdx] = useState<number | null>(null);
  const [shakeState, setShakeState] = useState(() => createShakeState());
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

      setShakeState((prev) => {
        if (prev.trauma <= 0.001) return prev;
        const { state, offset } = updateShake(prev, dt, time / 1000);
        setShakeOffset({ x: offset.x, y: offset.y });
        return state;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSelectHand = (idx: number) => {
    if (!game.hand[idx]) return;
    setSelectedHandIdx((prev) => (prev === idx ? null : idx));
    playSyntheticTone(audioCtxRef.current, { freq: 440, duration: 0.08, type: "sine" });
    MobileHapticsPro.light();
    triggerHaptic("light");
  };

  const handleSlotClick = (slotId: string) => {
    if (selectedHandIdx === null) return;

    const resolution = placeAndResolve(game, selectedHandIdx, slotId);
    if (!resolution) {
      playSyntheticTone(audioCtxRef.current, { freq: 220, duration: 0.15, type: "sawtooth" });
      MobileHapticsPro.warning();
      triggerHaptic("warning");
      return;
    }

    // Move succeeded
    setGame(resolution.nextState);
    setSelectedHandIdx(null);
    playSyntheticTone(audioCtxRef.current, { freq: 520, duration: 0.12, type: "triangle" });
    MobileHapticsPro.impact();
    triggerHaptic("medium");

    // Check for 10-stack clear cascade
    if (resolution.clears.length > 0) {
      setShakeState((prev) => addTrauma(prev, 0.45));
      MobileHapticsPro.success();
      triggerHaptic("combo");

      // Celebratory ASMR chime chord
      playSyntheticTone(audioCtxRef.current, { freq: 523.25, duration: 0.25, type: "sine" });
      setTimeout(() => {
        playSyntheticTone(audioCtxRef.current, { freq: 659.25, duration: 0.3, type: "sine" });
      }, 70);
      setTimeout(() => {
        playSyntheticTone(audioCtxRef.current, { freq: 783.99, duration: 0.4, type: "sine" });
      }, 140);
    }
  };

  const handleRestart = () => {
    MobileHapticsPro.light();
    setGame(createInitialHexaSortGame(1, Date.now()));
    setSelectedHandIdx(null);
  };

  const handleNextLevel = () => {
    MobileHapticsPro.success();
    setGame(createInitialHexaSortGame(game.level + 1, Date.now()));
    setSelectedHandIdx(null);
  };

  const handleShare = () => {
    const text =
      locale === "ko"
        ? `🧩 헥사 소트 3D - 레벨 ${game.level} 정복! 점수: ${game.score}점! 지금 플레이: https://game.oiyo.net/hexa-sort`
        : `🧩 Hexa Sort 3D - Cleared Level ${game.level}! Score: ${game.score} pts! Play now: https://game.oiyo.net/hexa-sort`;

    navigator.clipboard?.writeText(text).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  // Hex coordinate to SVG pixel position
  const hexToPixel = (q: number, r: number) => {
    const size = 52;
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r) + 160;
    const y = size * ((3 / 2) * r) + 160;
    return { x, y };
  };

  const progressPct = Math.min(100, Math.round((game.completedClears / game.targetClears) * 100));

  return (
    <div
      style={
        {
          "--shake-x": `${shakeOffset.x}px`,
          "--shake-y": `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
      className="relative mx-auto flex w-full max-w-xl translate-x-(--shake-x) translate-y-(--shake-y) flex-col items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-6"
    >
      {/* Top Header: Level, Score, Target Progress */}
      <div className="flex w-full items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? "레벨" : "LEVEL"}
          </span>
          <span className="text-xl font-black text-foreground">{game.level}</span>
        </div>

        {/* Clear Progress Bar */}
        <div className="flex flex-1 flex-col items-center px-4">
          <div className="flex w-full justify-between text-xs font-semibold text-muted-foreground">
            <span>{locale === "ko" ? "타일 정리 목표" : "Target Clears"}</span>
            <span className="text-primary font-bold">
              {game.completedClears} / {game.targetClears}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 w-(--pct)"
              style={{ "--pct": `${progressPct}%` } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? "점수" : "SCORE"}
          </span>
          <span className="text-xl font-black font-mono text-warning">{game.score}</span>
        </div>
      </div>

      {/* 3D Hexagonal Isometric Board Viewport */}
      <div className="relative my-4 flex h-80 w-full items-center justify-center overflow-hidden rounded-2xl bg-muted/20">
        <svg viewBox="0 0 320 320" className="h-full w-full max-w-xs drop-shadow-md">
          {Object.values(game.slots).map((slot) => {
            const { x, y } = hexToPixel(slot.q, slot.r);
            const topColor =
              slot.stack.length > 0 ? slot.stack[slot.stack.length - 1] : null;

            return (
              <g
                key={slot.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => handleSlotClick(slot.id)}
                className="cursor-pointer transition-transform duration-100 active:scale-95"
              >
                {/* Hex Slot Base Outline */}
                <polygon
                  points="0,-36 31,-18 31,18 0,36 -31,18 -31,-18"
                  className="fill-muted stroke-border stroke-2 transition-colors hover:fill-muted/70"
                />

                {/* Isometric 3D Stack of Tiles */}
                {slot.stack.map((color, tileIdx) => {
                  const offsetY = -tileIdx * 5;
                  const hexColor = HEX_COLOR_HEXES[color];
                  return (
                    <g
                      key={tileIdx}
                      transform={`translate(0, ${offsetY})`}
                      style={{ "--tile-hex": hexColor } as React.CSSProperties}
                    >
                      {/* 3D Tile Side Depth */}
                      <polygon
                        points="0,-26 23,-13 23,-9 0,-22 -23,-9 -23,-13"
                        fill="var(--tile-hex)"
                        className="brightness-75"
                      />
                      <polygon
                        points="23,-9 23,17 0,30 0,26 23,13"
                        fill="var(--tile-hex)"
                        className="brightness-90"
                      />
                      <polygon
                        points="-23,-9 -23,17 0,30 0,26 -23,13"
                        fill="var(--tile-hex)"
                        className="brightness-50"
                      />
                      {/* Tile Top Face */}
                      <polygon
                        points="0,-26 23,-13 23,13 0,26 -23,13 -23,-13"
                        fill="var(--tile-hex)"
                        className="stroke-black/10 stroke-1"
                      />
                    </g>
                  );
                })}

                {/* Stack Count Indicator */}
                {slot.stack.length > 0 && (
                  <text
                    x="0"
                    y={-slot.stack.length * 5 + 4}
                    textAnchor="middle"
                    className="select-none text-xs font-black fill-white drop-shadow-md"
                  >
                    {slot.stack.length}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Level Completed Overlay Modal */}
        {game.status === "level_completed" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 p-6 backdrop-blur-xs">
            <span className="text-5xl">🎉</span>
            <h2 className="mt-2 text-2xl font-black text-warning">
              {locale === "ko" ? "레벨 클리어!" : "Level Complete!"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === "ko"
                ? `레벨 ${game.level}의 모든 목표를 완벽히 정복했습니다!`
                : `Mastered all clear targets for Level ${game.level}!`}
            </p>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="default" size="lg" onClick={handleNextLevel}>
                {locale === "ko" ? "다음 레벨" : "Next Level"}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleShare}>
                {shareCopied
                  ? locale === "ko" ? "복사 완료!" : "Copied!"
                  : locale === "ko" ? "기록 공유" : "Share"}
              </Button>
            </div>
          </div>
        )}

        {/* Game Over Overlay Modal */}
        {game.status === "game_over" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 p-6 backdrop-blur-xs">
            <span className="text-5xl">💥</span>
            <h2 className="mt-2 text-2xl font-black text-destructive">
              {locale === "ko" ? "게임 오버" : "Game Over"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === "ko" ? "더 이상 타일을 놓을 자리가 없습니다." : "No more moves available on the board."}
            </p>
            <Button type="button" variant="default" size="lg" className="mt-4" onClick={handleRestart}>
              {locale === "ko" ? "다시 도전" : "Try Again"}
            </Button>
          </div>
        )}
      </div>

      {/* Hand Dock: 3 Mini-Stacks to Place */}
      <div className="flex w-full flex-col items-center gap-2 border-t border-border pt-3">
        <span className="text-xs font-semibold text-muted-foreground">
          {locale === "ko" ? "놓을 타일 묶음을 선택하세요" : "Select a tile stack to place"}
        </span>

        <div className="flex w-full justify-center gap-3">
          {game.hand.map((handSlot, idx) => {
            const isSelected = selectedHandIdx === idx;
            if (!handSlot) {
              return (
                <div
                  key={idx}
                  className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10 opacity-40"
                />
              );
            }

            return (
              <TiltHandHexaButton
                key={handSlot.id}
                slot={handSlot}
                isSelected={isSelected}
                onSelect={() => handleSelectHand(idx)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
