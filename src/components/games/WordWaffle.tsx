import React, { useState, useEffect, useRef, useCallback } from "react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { getSpriteUrl } from "../../lib/games/sprites";
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from "../../lib/games/share-card";
import { celebrate } from "../../lib/games/celebration";
import { loadHighScore, saveHighScore } from "../../lib/games/game-save";
import { Maximize2, Minimize2, Camera, Check } from "lucide-react";
import {
  type WaffleGameState,
  type WafflePuzzleDefinition,
  type WaffleCell,
  IS_WAFFLE_HOLE,
  createInitialWaffleGame,
  swapWaffleCells,
} from "../../lib/games/word-waffle";
import {
  useCardTiltPro,
  MobileHapticsPro,
  useGameJuicePro,
  RetroChiptuneSynth,
} from "../../lib/games/engine-suite-unified";
import { Button } from "../ui/button";
import { GameStatTile } from "../ui/game/GameStatTile";

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
      stateCls = "border-chart-2/90 bg-chart-2 text-primary-foreground shadow-md border-b-4 border-b-black/30";
      break;
    case "yellow":
      stateCls = "border-chart-4/90 bg-chart-4 text-foreground shadow-xs border-b-4 border-b-black/25";
      break;
    case "gray":
    default:
      stateCls = "border-border bg-muted/80 text-foreground shadow-2xs border-b-4 border-b-black/20";
      break;
  }

  const selectCls = isSelected
    ? "ring-4 ring-primary scale-110 z-10 shadow-xl"
    : cell.isLocked
    ? "cursor-default brightness-95"
    : "cursor-pointer hover:brightness-105 active:scale-95 active:border-b-2";

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
      className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border-2 text-xl font-black uppercase transition-all duration-150 will-change-transform transform-(--card-tilt) ${stateCls} ${selectCls}`}
    >
      {/* 3D Waffle indent grid marks */}
      <span className="absolute inset-1 rounded-xl border border-white/20 pointer-events-none" aria-hidden="true" />
      <span className="relative z-10 drop-shadow-xs">{cell.letter}</span>
      {cell.isLocked && (
        <span className="absolute bottom-1 right-1 text-xs opacity-90 drop-shadow-xs">✨</span>
      )}
    </button>
  );
}

export default function WordWaffle({ locale = "ko" }: WordWaffleProps) {
  const { isImmersive, containerRef, togglePortal } = useArcadePortal();
  const [initData] = useState(() => createInitialWaffleGame(locale, 0, Date.now()));
  const [puzzle] = useState<WafflePuzzleDefinition>(initData.puzzle);
  const [game, setGame] = useState<WaffleGameState>(initData.game);
  const [selectedCoord, setSelectedCoord] = useState<{ r: number; c: number } | null>(null);
  const [, setHighScore] = useState(() => loadHighScore("word-waffle", 0));

  useEffect(() => {
    if (game.status === "won") {
      const score = game.stars * 100 + game.swapsRemaining * 10;
      const { isNewBest, bestScore } = saveHighScore("word-waffle", score);
      if (isNewBest) setHighScore(bestScore);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("oiyo:game-score", { detail: { slug: "word-waffle", score } }));
      }
    }
  }, [game.status, game.stars, game.swapsRemaining]);

  const { addTrauma, shakeCssVars } = useGameJuicePro();
  const [isCopied, setIsCopied] = useState(false);

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

  const handleCellClick = (r: number, c: number) => {
    if (game.status !== "playing") return;
    if (IS_WAFFLE_HOLE(r, c)) return;

    const cell = game.grid[r][c];
    if (!cell || cell.isLocked) {
      RetroChiptuneSynth.playHit(audioCtxRef.current);
      MobileHapticsPro.warning();
      addTrauma(0.1);
      return;
    }

    if (!selectedCoord) {
      setSelectedCoord({ r, c });
      RetroChiptuneSynth.playBlip(audioCtxRef.current);
      MobileHapticsPro.light();
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
    RetroChiptuneSynth.playPowerup(audioCtxRef.current);
    MobileHapticsPro.impact();
    addTrauma(0.15);

    if (nextGame.status === "won") {
      addTrauma(0.55);
      MobileHapticsPro.success();
      RetroChiptuneSynth.playCoin(audioCtxRef.current);
      if (containerRef.current) {
        celebrate(containerRef.current, { preset: "stardust" });
      }
    } else if (nextGame.status === "lost") {
      addTrauma(0.5);
      MobileHapticsPro.error();
      RetroChiptuneSynth.playGameOver(audioCtxRef.current);
    }
  };

  const handleRestart = () => {
    MobileHapticsPro.light();
    const fresh = createInitialWaffleGame(locale, 0, Date.now());
    setGame(fresh.game);
    setSelectedCoord(null);
  };

  const handleShareCard = useCallback(async () => {
    MobileHapticsPro.click();
    const canvas = createShareCardCanvas({
      title: "WORD WAFFLE",
      subtitle: game.status === "won" ? "와플 퍼즐 완성!" : "단어 와플 도전 기록",
      score: `${game.stars}★ (${game.swapsRemaining} 남음)`,
      slug: "word-waffle",
      customStats: [
        { label: "달성 별점", value: `${game.stars} / 5개` },
        { label: "남은 스왑", value: `${game.swapsRemaining} / ${game.maxSwaps}` },
        { label: "퍼즐 상태", value: game.status === "won" ? "완전 정복" : "도전 완료" },
      ],
      playerTitle: "WAFFLE WORDSMITH",
    });

    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `word-waffle-stars-${game.stars}.png`);
    }
  }, [game.maxSwaps, game.stars, game.status, game.swapsRemaining]);

  return (
    <div
      ref={containerRef}
      style={
        {
          "--shake-x": shakeCssVars["--shake-x"],
          "--shake-y": shakeCssVars["--shake-y"],
          "--shake-rot": shakeCssVars["--shake-rot"],
        } as React.CSSProperties
      }
      className={`relative mx-auto flex w-full max-w-md translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot) flex-col items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-6 transition-all ${
        isImmersive
          ? "fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-md max-w-none w-full h-full justify-center"
          : ""
      }`}
    >
      {/* Top Header: Swaps remaining & Goal */}
      <div className="flex w-full items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Word Waffle</h1>
          <p className="text-xs text-muted-foreground">
            {locale === "ko" ? "가로세로 6개 단어를 완성하는 와플 퍼즐" : "5x5 Waffle grid letter swapping puzzle"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold mr-1">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-xs bg-chart-2" />
              <span className="text-muted-foreground">{locale === "ko" ? "정답" : "Correct"}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-xs bg-chart-4" />
              <span className="text-muted-foreground">{locale === "ko" ? "포함" : "In word"}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={togglePortal}
            className="p-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted/80 transition-colors"
            title={isImmersive ? "포털 축소" : "100dvh 전체화면"}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Telemetry Stat Tiles */}
      <div className="grid grid-cols-3 gap-2 w-full mt-3">
        <GameStatTile
          label={locale === "ko" ? "남은 교환" : "Swaps Left"}
          value={`${game.swapsRemaining} / ${game.maxSwaps}`}
          highlight={game.swapsRemaining <= 3}
        />
        <GameStatTile
          label={locale === "ko" ? "정답 글자" : "Solved Tiles"}
          value={`${game.grid.flat().filter((c) => c?.isLocked).length} / 21`}
          highlight={game.grid.flat().filter((c) => c?.isLocked).length >= 15}
        />
        <GameStatTile
          label={locale === "ko" ? "예상 별점" : "Stars Rating"}
          value={game.stars > 0 ? "⭐".repeat(game.stars) : "–"}
        />
      </div>

      {/* 5x5 Waffle Grid Board (Waffle Iron Cast Texture) */}
      <div className="relative my-4 grid grid-cols-5 gap-2.5 rounded-3xl border-2 border-border/80 bg-muted/40 p-3 sm:p-5 shadow-inner">
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
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-card/95 p-6 backdrop-blur-md text-center">
            <div className="relative mb-2 flex items-center justify-center">
              <img
                src={getSpriteUrl("trophy")}
                alt="3D Trophy"
                className="w-16 h-16 drop-shadow-xl animate-bounce"
              />
            </div>
            <h2 className="mt-1 text-2xl font-black text-warning">
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

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="default" size="lg" onClick={handleRestart}>
                {locale === "ko" ? "다시 도전 ↺" : "Play Again ↺"}
              </Button>
              <button
                type="button"
                onClick={handleShareCard}
                className="px-4 py-2.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-sm flex items-center gap-1.5"
              >
                {isCopied ? <Check className="w-4 h-4 text-primary" /> : <Camera className="w-4 h-4" />}
                <span>{isCopied ? (locale === "ko" ? "복사 완료!" : "Copied!") : (locale === "ko" ? "결과 카드 공유" : "Share Card")}</span>
              </button>
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
