"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, Volume2, VolumeX, Share2, Check } from 'lucide-react';
import { celebrate } from '../../lib/games/celebration';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';
import type {
  OrbitalDefenseState,
  TurretType,
} from '../../lib/games/orbital-defense';
import {
  createInitialState,
  buildTurret,
  upgradeTurret,
  startWave,
  tickGame,
  TURRET_SPECS,
} from '../../lib/games/orbital-defense';
import { OrbitalDefense3DScene } from './OrbitalDefense3DScene';
import { useArcadePortal } from '../../lib/games/arcade-portal';

interface Props {
  locale?: string;
}

const TEXT: Record<string, Record<string, string>> = {
  ko: {
    title: '3D 궤도 타워 디펜스',
    subtitle: '행성 궤도에 방어 위성을 구축하고 외계 침공 편대를 격퇴하세요',
    startWave: '웨이브 시작',
    waveActive: '적 편대 접근 중...',
    planetHealth: '행성 코어 체력',
    gold: '자원',
    score: '점수',
    wave: '웨이브',
    buildTurret: '방어 위성 배치',
    selectSlot: '빈 궤도 슬롯을 클릭하여 위성을 건설하세요.',
    upgradeTurret: '위성 업그레이드',
    upgradeCost: '강화 비용',
    level: '레벨',
    damage: '공격력',
    range: '사거리',
    fireRate: '연사속도',
    gameOver: '행성 코어가 파괴되었습니다!',
    restart: '새 게임 시작',
    howToPlay: '조작 안내: 화면을 드래그하여 시점을 회전하고, 궤도의 슬롯을 탭하여 위성을 배치하거나 강화하세요.',
  },
  en: {
    title: '3D Orbital Defense',
    subtitle: 'Deploy defense satellites around planetary orbits to repel alien invasions',
    startWave: 'Launch Wave',
    waveActive: 'Hostiles Approaching...',
    planetHealth: 'Core Health',
    gold: 'Gold',
    score: 'Score',
    wave: 'Wave',
    buildTurret: 'Deploy Satellite',
    selectSlot: 'Click an empty orbit slot to build a defense turret.',
    upgradeTurret: 'Upgrade Turret',
    upgradeCost: 'Upgrade Cost',
    level: 'Level',
    damage: 'Damage',
    range: 'Range',
    fireRate: 'Fire Rate',
    gameOver: 'Planet Core Destroyed!',
    restart: 'New Game',
    howToPlay: 'Controls: Drag to rotate view, tap orbit slots to construct or upgrade satellites.',
  },
};

export default function OrbitalDefense3D({ locale = 'ko' }: Props) {
  const t = TEXT[locale] ?? TEXT.ko;
  const [gameState, setGameState] = useState<OrbitalDefenseState>(createInitialState);
  const [selectedSlot, setSelectedSlot] = useState<{ orbitIndex: number; slotIndex: number } | null>(null);
  const [selectedTurretId, setSelectedTurretId] = useState<string | null>(null);
  const [shareCardCopied, setShareCardCopied] = useState(false);

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "3D Orbital Defense",
      subtitle: gameState.isGameOver ? "행성 궤도 방어전 종결" : "행성 궤도 수호 기록",
      score: `${gameState.score.toLocaleString()} PTS`,
      slug: "orbital-defense-3d",
      customStats: [
        { label: "WAVE", value: `${gameState.wave}` },
        { label: "CORE HEALTH", value: `${Math.max(0, Math.round(gameState.planetHealth))}%` },
        { label: "GOLD", value: `${gameState.gold}G` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `orbital-defense-${gameState.score}pts.png`);
    }
  }, [gameState.score, gameState.isGameOver, gameState.wave, gameState.planetHealth, gameState.gold]);
  const [muted, setMuted] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('orbital_defense_muted') === 'true';
      }
    } catch {}
    return false;
  });

  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({
    locale: (locale as any) || 'ko',
  });

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('orbital_defense_muted', String(next));
        }
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut: F for portal, M for sound
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        togglePortal();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePortal, toggleMute]);

  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const prevOverRef = useRef(false);
  useEffect(() => {
    if (gameState.isGameOver && !prevOverRef.current) {
      if (containerRef.current) {
        celebrate(containerRef.current, { preset: "stardust" });
      }
    }
    prevOverRef.current = gameState.isGameOver;
  }, [gameState.isGameOver, containerRef]);

  // Main game tick loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (!stateRef.current.isGameOver) {
        setGameState((prev) => {
          const next = { ...prev };
          tickGame(next, dt);
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSelectSlot = useCallback((orbitIndex: number, slotIndex: number) => {
    setSelectedSlot({ orbitIndex, slotIndex });
    setSelectedTurretId(null);
  }, []);

  const handleSelectTurret = useCallback((turretId: string) => {
    setSelectedTurretId(turretId);
    setSelectedSlot(null);
  }, []);

  const handleBuild = (type: TurretType) => {
    if (!selectedSlot) return;
    setGameState((prev) => {
      const next = { ...prev };
      const success = buildTurret(next, selectedSlot.orbitIndex, selectedSlot.slotIndex, type);
      if (success) {
        setSelectedSlot(null);
      }
      return next;
    });
  };

  const handleUpgrade = () => {
    if (!selectedTurretId) return;
    setGameState((prev) => {
      const next = { ...prev };
      upgradeTurret(next, selectedTurretId);
      return next;
    });
  };

  const handleStartWave = () => {
    setGameState((prev) => {
      const next = { ...prev };
      startWave(next);
      return next;
    });
  };

  const handleRestart = () => {
    setGameState(createInitialState());
    setSelectedSlot(null);
    setSelectedTurretId(null);
  };

  const selectedTurret = selectedTurretId
    ? gameState.turrets.find((t) => t.id === selectedTurretId)
    : null;

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={`select-none ${
        isImmersive
          ? 'fixed inset-0 z-50 flex h-dvh w-screen flex-col justify-center overflow-y-auto bg-background p-4 sm:p-6'
          : 'mx-auto max-w-4xl space-y-4'
      }`}
    >
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-1.5">
            <span className="text-chart-1">♥</span>
            <span className="text-muted-foreground">{t.planetHealth}:</span>
            <span className="font-bold text-foreground">{gameState.planetHealth}/{gameState.maxPlanetHealth}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-1.5">
            <span className="text-chart-5">💰</span>
            <span className="text-muted-foreground">{t.gold}:</span>
            <span className="font-bold text-foreground">{gameState.gold}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-1.5">
            <span className="text-primary">★</span>
            <span className="text-muted-foreground">{t.score}:</span>
            <span className="font-bold text-foreground">{gameState.score}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-primary">
            <span>{t.wave} {gameState.wave}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? portalLabels.unmute : portalLabels.mute}
              title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted active:scale-95"
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <button
              type="button"
              onClick={togglePortal}
              aria-pressed={isImmersive}
              aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
              title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted active:scale-95"
            >
              {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3D Scene */}
      <OrbitalDefense3DScene
        state={gameState}
        selectedSlot={selectedSlot}
        selectedTurretId={selectedTurretId}
        onSelectSlot={handleSelectSlot}
        onSelectTurret={handleSelectTurret}
      />

      {/* Control Action Panel */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {gameState.isGameOver ? (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
            <p className="text-lg font-bold text-destructive">{t.gameOver}</p>
            <p className="text-sm text-muted-foreground">최종 점수: {gameState.score.toLocaleString()}점 (웨이브 {gameState.wave})</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShareCard}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted px-4 py-2.5 text-sm font-bold text-foreground transition-colors shadow-xs"
              >
                {shareCardCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                {shareCardCopied ? "복사됨!" : "결과 카드 공유"}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              >
                {t.restart}
              </button>
            </div>
          </div>
        ) : selectedSlot ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                궤도 {selectedSlot.orbitIndex + 1} 슬롯 {selectedSlot.slotIndex + 1} — {t.buildTurret}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                닫기 ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['laser', 'plasma', 'missile'] as TurretType[]).map((type) => {
                const spec = TURRET_SPECS[type];
                const canAfford = gameState.gold >= spec.cost;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!canAfford}
                    onClick={() => handleBuild(type)}
                    className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                      canAfford
                        ? 'border-border bg-muted/20 hover:border-primary hover:bg-muted/40'
                        : 'border-border/40 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm">{spec.name}</span>
                      <span className="text-xs font-bold text-chart-5">{spec.cost}G</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>공격력: {spec.damage} | 사거리: {spec.range}</p>
                      <p>연사: {spec.fireRate}/s</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : selectedTurret ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {TURRET_SPECS[selectedTurret.type].name} (Lv.{selectedTurret.level})
                </h3>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  궤도 {selectedTurret.orbitIndex + 1}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                공격력: {selectedTurret.damage} | 사거리: {selectedTurret.range} | 연사속도: {selectedTurret.fireRate}/s
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={gameState.gold < TURRET_SPECS[selectedTurret.type].upgradeCost * selectedTurret.level}
                className="rounded-xl bg-chart-1 px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {t.upgradeTurret} ({TURRET_SPECS[selectedTurret.type].upgradeCost * selectedTurret.level}G)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTurretId(null)}
                className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
              >
                선택 해제
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{t.selectSlot}</p>
            <button
              type="button"
              disabled={gameState.isWaveActive}
              onClick={handleStartWave}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all ${
                gameState.isWaveActive
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {gameState.isWaveActive ? t.waveActive : `${t.startWave} (웨이브 ${gameState.wave})`}
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground/80">{t.howToPlay}</p>
    </div>
  );
}
