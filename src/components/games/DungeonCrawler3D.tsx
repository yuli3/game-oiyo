import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import DungeonCrawler3DScene from './DungeonCrawler3DScene';
import {
  type DungeonCrawlerState,
  createDungeonFloor,
  moveDungeonPlayer,
  useDungeonPotion,
} from '../../lib/games/dungeon-crawler';

function getPercentageWidthClass(pct: number): string {
  if (pct >= 95) return 'w-full';
  if (pct >= 90) return 'w-11/12';
  if (pct >= 80) return 'w-4/5';
  if (pct >= 75) return 'w-3/4';
  if (pct >= 66) return 'w-2/3';
  if (pct >= 60) return 'w-3/5';
  if (pct >= 50) return 'w-1/2';
  if (pct >= 40) return 'w-2/5';
  if (pct >= 33) return 'w-1/3';
  if (pct >= 25) return 'w-1/4';
  if (pct >= 20) return 'w-1/5';
  if (pct >= 10) return 'w-1/12';
  if (pct > 0) return 'w-1';
  return 'w-0';
}

export default function DungeonCrawler3D() {
  const [gameState, setGameState] = useState<DungeonCrawlerState>(() => createDungeonFloor(1));

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setGameState((s) => moveDungeonPlayer(s, 0, -1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setGameState((s) => moveDungeonPlayer(s, 0, 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setGameState((s) => moveDungeonPlayer(s, -1, 0));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setGameState((s) => moveDungeonPlayer(s, 1, 0));
      } else if (e.key === 'p' || e.key === 'P' || e.key === '1') {
        setGameState((s) => useDungeonPotion(s));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNextFloor = useCallback(() => {
    setGameState((s) => {
      const next = createDungeonFloor(s.floor + 1);
      return {
        ...next,
        hp: s.hp,
        gold: s.gold,
        potions: s.potions,
        kills: s.kills,
        attackPower: s.attackPower + 5,
        defense: s.defense + 2,
      };
    });
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(createDungeonFloor(1));
  }, []);

  const hpRatio = (gameState.hp / gameState.maxHp) * 100;

  return (
    <div data-game-surface className="relative w-full aspect-16/10 min-h-125 max-h-180 rounded-2xl overflow-hidden border border-border bg-card shadow-lg select-none touch-none">
      {/* 3D Canvas with isometric action camera following player */}
      <Canvas
        camera={{
          position: [gameState.playerX + 4.5, 9.5, gameState.playerZ + 8.5],
          fov: 45,
        }}
        className="w-full h-full"
      >
        <DungeonCrawler3DScene state={gameState} />
      </Canvas>

      {/* Top HUD: Status Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none gap-2">
        {/* Floor and Stats */}
        <div className="rounded-xl border border-border bg-background/85 backdrop-blur-md px-4 py-2.5 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">던전 위치</div>
          <div className="text-xl font-black text-foreground">
            B{gameState.floor}F <span className="text-xs font-semibold text-primary">지하 {gameState.floor}층</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            처치: <span className="font-bold text-foreground">{gameState.kills} 마리</span>
          </div>
        </div>

        {/* HP Bar & Inventory */}
        <div className="flex-1 max-w-sm mx-2 rounded-xl border border-border bg-background/85 backdrop-blur-md px-4 py-2.5 shadow-sm space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-foreground">생명력 (HP)</span>
            <span className="font-bold text-primary">{gameState.hp} / {gameState.maxHp}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${getPercentageWidthClass(hpRatio)} ${
                gameState.hp > 50 ? 'bg-primary' : gameState.hp > 25 ? 'bg-warning' : 'bg-destructive'
              }`}
            />
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-border/50">
            <span className="text-muted-foreground">공격력: <strong className="text-foreground">{gameState.attackPower}</strong></span>
            <span className="text-muted-foreground">방어력: <strong className="text-foreground">{gameState.defense}</strong></span>
            <span className="text-warning font-bold">🪙 {gameState.gold}</span>
          </div>
        </div>

        {/* Potion Quick Use Button */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => setGameState((s) => useDungeonPotion(s))}
            disabled={gameState.potions <= 0 || gameState.hp >= gameState.maxHp}
            className="rounded-xl border border-border bg-background/90 backdrop-blur-md px-4 py-2.5 shadow-sm hover:bg-muted active:scale-95 transition-all text-center disabled:opacity-50"
            aria-label="체력 물약 사용"
          >
            <div className="text-xs text-muted-foreground font-medium">물약 (P)</div>
            <div className="text-lg font-black text-success">
              🧪 {gameState.potions}개
            </div>
          </button>
        </div>
      </div>

      {/* Middle Action Log Banner */}
      <div className="absolute top-24 left-4 right-4 flex justify-center pointer-events-none">
        <div className="rounded-xl border border-border bg-background/90 backdrop-blur-md px-4 py-2 text-xs font-semibold text-foreground shadow-md max-w-md text-center">
          {gameState.message}
        </div>
      </div>

      {/* Mobile D-Pad (Minimum 48px touch targets) */}
      <div className="absolute bottom-4 left-4 pointer-events-auto flex flex-col items-center gap-1.5 touch-none">
        <button
          type="button"
          data-game-control
          onPointerDown={(e) => { e.preventDefault(); setGameState((s) => moveDungeonPlayer(s, 0, -1)); }}
          className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-lg active:scale-95 transition-transform"
          aria-label="북쪽 이동"
        >
          ▲
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); setGameState((s) => moveDungeonPlayer(s, -1, 0)); }}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-lg active:scale-95 transition-transform"
            aria-label="서쪽 이동"
          >
            ◀
          </button>
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); setGameState((s) => moveDungeonPlayer(s, 0, 1)); }}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-lg active:scale-95 transition-transform"
            aria-label="남쪽 이동"
          >
            ▼
          </button>
          <button
            type="button"
            data-game-control
            onPointerDown={(e) => { e.preventDefault(); setGameState((s) => moveDungeonPlayer(s, 1, 0)); }}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-lg active:scale-95 transition-transform"
            aria-label="동쪽 이동"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Floor Cleared Modal */}
      {gameState.floorCleared && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-10">
          <div className="max-w-md w-full rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-3xl font-black tracking-tight text-primary">
              FLOOR CLEARED!
            </div>
            <p className="text-sm text-muted-foreground">
              지하 {gameState.floor}층 출구 사다리를 발견했습니다. 장비를 점검하고 다음 층으로 내려가세요.
            </p>

            <div className="grid grid-cols-2 gap-2 py-2 text-left">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-0.5">누적 골드</span>
                <span className="text-lg font-black text-warning">🪙 {gameState.gold}</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-0.5">처치한 몬스터</span>
                <span className="text-lg font-black text-foreground">{gameState.kills} 마리</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextFloor}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              지하 {gameState.floor + 1}층으로 내려가기 (NEXT FLOOR)
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-10">
          <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-3xl font-black tracking-tight text-destructive">
              YOU DIED
            </div>
            <p className="text-sm text-muted-foreground">
              던전의 몬스터에게 쓰러졌습니다.
            </p>

            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">도달 층수</span>
                <span className="text-lg font-black text-foreground">B{gameState.floor}F</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">처치 수</span>
                <span className="text-lg font-black text-foreground">{gameState.kills}</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">획득 골드</span>
                <span className="text-lg font-black text-warning">🪙 {gameState.gold}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              처음부터 다시 도전하기 (RETRY)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
