import React, { useState, useEffect, useRef } from "react";
import {
  type BlockColor,
  type BlockBlastGameState,
  BOARD_SIZE,
  BLOCK_COLOR_HEXES,
  createInitialBlockBlastGame,
  canPlaceShape,
  placeShapeAndClear,
  triggerReviveBomb,
} from "../../lib/games/block-blast";
import {
  createShakeState,
  addTrauma,
  updateShake,
  triggerHaptic,
} from "../../lib/games/juice-engine";
import { playSyntheticTone } from "../../lib/games/audio-mixer";
import { Button } from "../ui/button";

interface BlockBlastProps {
  locale?: string;
}

export default function BlockBlast({ locale = "ko" }: BlockBlastProps) {
  const [game, setGame] = useState<BlockBlastGameState>(() => createInitialBlockBlastGame());
  const [selectedHandIdx, setSelectedHandIdx] = useState<number | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ r: number; c: number } | null>(null);
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
    playSyntheticTone(audioCtxRef.current, { freq: 460, duration: 0.08, type: "sine" });
    triggerHaptic("light");
  };

  const handleCellClick = (r: number, c: number) => {
    if (selectedHandIdx === null) return;

    const result = placeShapeAndClear(game, selectedHandIdx, r, c);
    if (!result) {
      playSyntheticTone(audioCtxRef.current, { freq: 220, duration: 0.12, type: "sawtooth" });
      triggerHaptic("warning");
      return;
    }

    // Success
    setGame(result.nextState);
    setSelectedHandIdx(null);
    setHoverCoord(null);
    playSyntheticTone(audioCtxRef.current, { freq: 540, duration: 0.1, type: "triangle" });
    triggerHaptic("medium");

    const lines = result.clearedRows.length + result.clearedCols.length;
    if (lines > 0) {
      const traumaAmount = Math.min(0.8, 0.35 + lines * 0.15 + result.nextState.comboCount * 0.1);
      setShakeState((prev) => addTrauma(prev, traumaAmount));
      triggerHaptic("combo");

      // Ascending blast chime
      const baseFreq = 523.25 * (1 + result.nextState.comboCount * 0.15);
      playSyntheticTone(audioCtxRef.current, { freq: baseFreq, duration: 0.25, type: "sine" });
      setTimeout(() => {
        playSyntheticTone(audioCtxRef.current, { freq: baseFreq * 1.25, duration: 0.3, type: "sine" });
      }, 70);
      setTimeout(() => {
        playSyntheticTone(audioCtxRef.current, { freq: baseFreq * 1.5, duration: 0.35, type: "sine" });
      }, 140);
    }
  };

  const handleRevive = () => {
    const revived = triggerReviveBomb(game);
    if (revived) {
      setGame(revived);
      setShakeState((prev) => addTrauma(prev, 0.6));
      triggerHaptic("heavy");
      playSyntheticTone(audioCtxRef.current, { freq: 300, duration: 0.4, type: "triangle" });
    }
  };

  const handleRestart = () => {
    setGame(createInitialBlockBlastGame(Date.now(), game.highScore));
    setSelectedHandIdx(null);
    setHoverCoord(null);
  };

  const handleShare = () => {
    const text =
      locale === "ko"
        ? `💥 블록 블래스트 인피니트 - 최고 콤보 ${game.comboCount}연쇄! 점수: ${game.score}점! 지금 플레이: https://game.oiyo.net/block-blast`
        : `💥 Block Blast Infinite - Combo Chain x${game.comboCount}! Score: ${game.score} pts! Play now: https://game.oiyo.net/block-blast`;

    navigator.clipboard?.writeText(text).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const selectedShape = selectedHandIdx !== null ? game.hand[selectedHandIdx] : null;

  // Compute preview ghost cells
  const isPreviewCell = (r: number, c: number): boolean => {
    if (!selectedShape || !hoverCoord) return false;
    const { r: hr, c: hc } = hoverCoord;
    const shapeRows = selectedShape.matrix.length;
    const shapeCols = selectedShape.matrix[0].length;

    if (r >= hr && r < hr + shapeRows && c >= hc && c < hc + shapeCols) {
      return selectedShape.matrix[r - hr][c - hc] === 1;
    }
    return false;
  };

  const canPlaceHover =
    selectedShape && hoverCoord ? canPlaceShape(game.grid, selectedShape, hoverCoord.r, hoverCoord.c) : false;

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
      {/* Top Header: Score, High Score, Combo Banner */}
      <div className="flex w-full items-center justify-between border-b border-border pb-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? "점수" : "SCORE"}
          </span>
          <span className="text-2xl font-black font-mono text-foreground">{game.score}</span>
        </div>

        {/* Combo Indicator */}
        {game.comboCount > 1 && (
          <div className="flex animate-pulse items-center gap-1 rounded-full bg-primary/20 px-3 py-1 border border-primary/30">
            <span className="text-xs">🔥</span>
            <span className="text-xs font-black text-primary">
              COMBO x{game.comboCount}
            </span>
          </div>
        )}

        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? "최고 기록" : "BEST"}
          </span>
          <span className="text-xl font-black font-mono text-warning">{game.highScore}</span>
        </div>
      </div>

      {/* 8x8 Block Grid Board */}
      <div className="relative my-4 grid grid-cols-8 gap-1.5 rounded-2xl border border-border bg-muted/30 p-2.5 sm:p-3 shadow-inner">
        {game.grid.map((row, r) =>
          row.map((cellColor, c) => {
            const isPreview = isPreviewCell(r, c);
            const hexColor = cellColor ? BLOCK_COLOR_HEXES[cellColor] : null;

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onMouseEnter={() => setHoverCoord({ r, c })}
                onClick={() => handleCellClick(r, c)}
                style={
                  hexColor
                    ? ({ "--cell-color": hexColor } as React.CSSProperties)
                    : isPreview && selectedShape
                    ? ({ "--cell-color": BLOCK_COLOR_HEXES[selectedShape.color] } as React.CSSProperties)
                    : undefined
                }
                className={`relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border transition-all duration-100 ${
                  cellColor
                    ? "border-black/20 shadow-xs bg-(--cell-color)"
                    : isPreview
                    ? canPlaceHover
                      ? "border-primary/50 opacity-70 bg-(--cell-color)"
                      : "border-destructive bg-destructive/30"
                    : "border-border/40 bg-muted/40 hover:bg-muted/70"
                }`}
              />
            );
          })
        )}

        {/* Game Over Modal */}
        {game.status === "game_over" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-card/95 p-6 backdrop-blur-xs text-center">
            <span className="text-5xl">💥</span>
            <h2 className="mt-2 text-2xl font-black text-destructive">
              {locale === "ko" ? "게임 오버" : "Game Over"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === "ko" ? `최종 점수: ${game.score}점` : `Final Score: ${game.score} pts`}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {game.hasRevive && (
                <Button type="button" variant="default" size="lg" onClick={handleRevive}>
                  {locale === "ko" ? "💣 3x3 부활 폭탄 사용" : "💣 Use 3x3 Revive Bomb"}
                </Button>
              )}
              <Button type="button" variant="secondary" size="lg" onClick={handleRestart}>
                {locale === "ko" ? "다시 시작" : "Restart"}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleShare}>
                {shareCopied
                  ? locale === "ko" ? "복사 완료!" : "Copied!"
                  : locale === "ko" ? "기록 공유" : "Share"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hand Dock: 3 Polyomino Shapes to Place */}
      <div className="flex w-full flex-col items-center gap-2 border-t border-border pt-3">
        <span className="text-xs font-semibold text-muted-foreground">
          {locale === "ko" ? "블록을 골라 보드에 배치하세요" : "Select a block and place on the board"}
        </span>

        <div className="flex w-full justify-center gap-3">
          {game.hand.map((shape, idx) => {
            const isSelected = selectedHandIdx === idx;
            if (!shape) {
              return (
                <div
                  key={idx}
                  className="flex h-20 w-24 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10 opacity-30"
                />
              );
            }

            const shapeHex = BLOCK_COLOR_HEXES[shape.color];

            return (
              <button
                key={shape.id}
                type="button"
                onClick={() => handleSelectHand(idx)}
                style={{ "--shape-hex": shapeHex } as React.CSSProperties}
                className={`flex h-20 w-24 items-center justify-center rounded-2xl border p-2 transition-all duration-150 ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary scale-105 shadow-md"
                    : "border-border bg-muted/40 hover:bg-muted/70"
                }`}
              >
                {/* Mini shape grid preview */}
                <div
                  className="grid gap-1 grid-rows-(--rows) grid-cols-(--cols)"
                  style={
                    {
                      "--rows": `repeat(${shape.matrix.length}, minmax(0, 1fr))`,
                      "--cols": `repeat(${shape.matrix[0].length}, minmax(0, 1fr))`,
                    } as React.CSSProperties
                  }
                >
                  {shape.matrix.map((row, r) =>
                    row.map((val, c) => (
                      <div
                        key={`${r}-${c}`}
                        className={`h-3.5 w-3.5 rounded-xs ${
                          val === 1 ? "bg-(--shape-hex) border border-black/20" : "opacity-0"
                        }`}
                      />
                    ))
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
