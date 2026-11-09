import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  BackpackHeroEngine,
  ITEM_CATALOG,
  type PlacedItem,
  type BackpackHeroState,
} from '@/lib/games/backpack-hero';
import {
  useCardTiltPro,
  MobileHapticsPro,
  useGameJuicePro,
  RetroChiptuneSynth,
  getRetroChiptuneBgm,
} from '@/lib/games/engine-suite-unified';
import { BACKPACK_HERO_SPRITES } from '@/lib/games/sprites';
import { celebrate } from '@/lib/games/celebration';
import { loadHighScore, saveHighScore } from '@/lib/games/game-save';

interface BackpackHeroProps {
  locale?: string;
}

function getBackpackItemSprite(defId: string, type: string): string | null {
  if (defId.includes('dagger') || defId.includes('sword') || type === 'weapon') {
    return BACKPACK_HERO_SPRITES.dagger;
  }
  if (type === 'relic' || defId.includes('ruby') || defId.includes('gem')) {
    return BACKPACK_HERO_SPRITES.relic;
  }
  if (type === 'potion') {
    return BACKPACK_HERO_SPRITES.potion;
  }
  return null;
}

function TiltBackpackItemButton({
  item,
  def,
  value,
  bonus,
  isSelected,
  onClick,
}: {
  item: PlacedItem;
  def: (typeof ITEM_CATALOG)[string];
  value: number;
  bonus: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();
  const sprite = getBackpackItemSprite(def.id, def.type);

  return (
    <button
      type="button"
      style={
        {
          '--card-tilt': transformCss,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.2);
        onClick();
      }}
      className={`h-16 rounded border p-1 flex flex-col items-center justify-between text-xs transition-all cursor-pointer will-change-transform transform-(--card-tilt) ${
        isSelected
          ? 'border-primary bg-primary/25 ring-2 ring-primary scale-105 shadow-md'
          : def.type === 'weapon'
          ? 'border-destructive/60 bg-destructive/15 hover:bg-destructive/25'
          : def.type === 'shield'
          ? 'border-chart-1/60 bg-chart-1/15 hover:bg-chart-1/25'
          : def.type === 'armor'
          ? 'border-warning/60 bg-warning/15 hover:bg-warning/25'
          : def.type === 'potion'
          ? 'border-success/60 bg-success/15 hover:bg-success/25'
          : 'border-chart-2/60 bg-chart-2/15 hover:bg-chart-2/25'
      }`}
    >
      <div className="flex items-center justify-between w-full text-xs font-mono leading-none">
        <span className="font-bold text-primary">⚡{def.energyCost}</span>
        {bonus > 0 && <span className="text-success font-bold">+{bonus}</span>}
      </div>
      <div className="relative size-6 flex items-center justify-center">
        {sprite ? (
          <img
            src={sprite}
            alt={def.name}
            className="size-full object-contain filter drop-shadow-xs select-none pointer-events-none"
            draggable={false}
          />
        ) : (
          <span className="text-xl leading-none">{def.icon}</span>
        )}
      </div>
      <span className="text-xs font-mono font-bold leading-none">
        {def.type === 'weapon' && `⚔️${value}`}
        {def.type === 'shield' && `🛡️${value}`}
        {def.type === 'potion' && `🧪+${value}`}
        {def.type === 'armor' && `🪖+${value}`}
        {def.type === 'relic' && `💎+${value}`}
      </span>
    </button>
  );
}

export default function BackpackHero({ locale = 'ko' }: BackpackHeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BackpackHeroEngine>(new BackpackHeroEngine(5, 6));
  const [engineState, setEngineState] = useState<BackpackHeroState>(() => engineRef.current.getState());
  const [highScore, setHighScore] = useState(() => loadHighScore('backpack-hero', 0));

  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const { shakeCssVars, addTrauma } = useGameJuicePro();
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Trigger celebration and save on victory or game over
  useEffect(() => {
    if (engineState.gameState === 'victory' || engineState.gameState === 'game_over') {
      const score = engineState.floor * 100 + engineState.gold;
      const { isNewBest, bestScore } = saveHighScore('backpack-hero', score);
      if (isNewBest) setHighScore(bestScore);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('oiyo:game-score', { detail: { slug: 'backpack-hero', score } }));
      }
      if (engineState.gameState === 'victory') {
        addTrauma(0.5);
        RetroChiptuneSynth.playPowerup(audioCtxRef.current, 0.12);
        if (containerRef.current) {
          celebrate(containerRef.current, { preset: 'stardust' });
        }
      } else if (engineState.gameState === 'game_over') {
        addTrauma(0.6);
        RetroChiptuneSynth.playGameOver(audioCtxRef.current);
        MobileHapticsPro.error();
      }
    }
  }, [addTrauma, engineState.gameState, engineState.floor, engineState.gold]);

  // Initialize Web Audio
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

  // Retro Chiptune BGM loop
  useEffect(() => {
    const bgm = getRetroChiptuneBgm();
    if (engineState.gameState === 'battle' || engineState.gameState === 'loot') {
      bgm.playTheme('retro-dungeon');
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [engineState.gameState]);

  const syncState = () => {
    setEngineState({ ...engineRef.current.getState() });
  };

  // Keyboard shortcut 'R' to rotate selected item
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && selectedInstanceId) {
        handleRotateSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });



  // Map each grid cell to its occupying item if any
  const cellOccupationMap = useMemo(() => {
    const map = new Map<string, { item: PlacedItem; isOrigin: boolean }>();
    for (const item of engineState.items) {
      const def = ITEM_CATALOG[item.defId];
      if (!def) continue;
      const cells = BackpackHeroEngine.getItemAbsoluteCells(item, def);
      cells.forEach((cell, idx) => {
        map.set(`${cell.r}:${cell.c}`, { item, isOrigin: idx === 0 });
      });
    }
    return map;
  }, [engineState.items]);

  // Activate item during battle
  const handleItemClick = (item: PlacedItem) => {
    if (engineState.gameState === 'battle') {
      const res = engineRef.current.activateItem(item.instanceId);
      if (res.success) {
        const def = ITEM_CATALOG[item.defId];
        if (def?.type === 'weapon') {
          RetroChiptuneSynth.playLaser(audioCtxRef.current);
          addTrauma(0.3);
          MobileHapticsPro.heavy();
        } else if (def?.type === 'shield') {
          RetroChiptuneSynth.playBlip(audioCtxRef.current);
          MobileHapticsPro.medium();
        } else if (def?.type === 'potion') {
          RetroChiptuneSynth.playPowerup(audioCtxRef.current);
          MobileHapticsPro.success();
        }
      }
      syncState();
    } else {
      // In loot or organizing mode: select for moving or rotating
      MobileHapticsPro.light();
      setSelectedInstanceId(selectedInstanceId === item.instanceId ? null : item.instanceId);
    }
  };

  // Rotate selected item by 90 degrees
  const handleRotateSelected = () => {
    if (!selectedInstanceId) return;
    const item = engineState.items.find((i) => i.instanceId === selectedInstanceId);
    if (!item) return;

    const nextRot = ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    const success = engineRef.current.moveItem(item.instanceId, item.r, item.c, nextRot);
    if (success) {
      RetroChiptuneSynth.playBlip(audioCtxRef.current);
      MobileHapticsPro.light();
      syncState();
    }
  };

  // Move selected item to target cell
  const handleCellClick = (r: number, c: number) => {
    if (engineState.gameState === 'slot_expand' || (engineState.gameState === 'loot' && engineState.expandChoicesLeft > 0)) {
      if (!engineState.unlockedSlots[r][c]) {
        const unlocked = engineRef.current.unlockSlot(r, c);
        if (unlocked) {
          RetroChiptuneSynth.playCoin(audioCtxRef.current);
          MobileHapticsPro.success();
          syncState();
        }
        return;
      }
    }

    if (selectedInstanceId) {
      const item = engineState.items.find((i) => i.instanceId === selectedInstanceId);
      if (item) {
        const moved = engineRef.current.moveItem(item.instanceId, r, c);
        if (moved) {
          RetroChiptuneSynth.playBlip(audioCtxRef.current);
          MobileHapticsPro.impact();
          setSelectedInstanceId(null);
          syncState();
        }
      }
    }
  };

  const handleEndTurn = () => {
    if (engineState.gameState !== 'battle') return;
    const prevHp = engineState.playerHp;
    engineRef.current.endTurn();
    const nextState = engineRef.current.getState();
    if (nextState.playerHp < prevHp) {
      RetroChiptuneSynth.playHit(audioCtxRef.current);
      addTrauma(0.4);
      MobileHapticsPro.error();
    } else {
      RetroChiptuneSynth.playBlip(audioCtxRef.current);
      MobileHapticsPro.click();
    }
    syncState();
  };

  const handleTakeLoot = (defId: string) => {
    const success = engineRef.current.takeLootItem(defId);
    if (success) {
      RetroChiptuneSynth.playCoin(audioCtxRef.current);
      MobileHapticsPro.impact();
      syncState();
    }
  };

  const handleNextFloor = () => {
    engineRef.current.proceedToNextFloor();
    RetroChiptuneSynth.playPowerup(audioCtxRef.current);
    addTrauma(0.25);
    MobileHapticsPro.success();
    syncState();
  };

  const handleRestart = () => {
    MobileHapticsPro.light();
    engineRef.current.restart();
    setSelectedInstanceId(null);
    syncState();
  };

  const playerHpPct = Math.max(0, Math.min(100, Math.round((engineState.playerHp / engineState.playerMaxHp) * 100)));
  const enemy = engineState.currentEnemy;
  const enemyHpPct = enemy ? Math.max(0, Math.min(100, Math.round((enemy.hp / enemy.maxHp) * 100))) : 0;

  return (
    <div
      ref={containerRef}
      style={
        {
          '--shake-x': shakeCssVars['--shake-x'] ?? '0px',
          '--shake-y': shakeCssVars['--shake-y'] ?? '0px',
          '--shake-rot': shakeCssVars['--shake-rot'] ?? '0deg',
        } as React.CSSProperties
      }
      className="relative w-full select-none overflow-hidden rounded-xl border border-border bg-card p-4 space-y-4 transform translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot)"
    >
      {/* Top Banner: Floor, Gold, Status */}
      <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
            B{engineState.floor}F
          </span>
          <span className="text-foreground">💰 {engineState.gold}G</span>
        </div>
        <div className="text-muted-foreground">
          {locale === 'ko' ? `최대 ${engineState.maxFloor}층 던전` : `Floor ${engineState.floor} of ${engineState.maxFloor}`}
        </div>
      </div>

      {/* Battle Arena Area */}
      <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg border border-border">
        {/* Player Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground flex items-center gap-1.5">
              <span>🐭</span> {locale === 'ko' ? '용사 펄스' : 'Hero Purse'}
            </span>
            <span className="font-mono text-muted-foreground">
              {engineState.playerHp}/{engineState.playerMaxHp}
            </span>
          </div>

          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-destructive transition-all duration-150 w-(--p-hp)"
              style={{ '--p-hp': `${playerHpPct}%` } as React.CSSProperties}
            />
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-primary font-bold">⚡ {engineState.energy}/{engineState.maxEnergy}</span>
            {engineState.playerBlock > 0 && (
              <span className="text-chart-1 font-bold">🛡️ +{engineState.playerBlock}</span>
            )}
          </div>
        </div>

        {/* Enemy Status */}
        {enemy && (
          <div className="space-y-2 border-l border-border pl-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground flex items-center gap-1.5">
                <span>{enemy.icon}</span> {enemy.name}
              </span>
              <span className="font-mono text-muted-foreground">
                {enemy.hp}/{enemy.maxHp}
              </span>
            </div>

            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-destructive transition-all duration-150 w-(--e-hp)"
                style={{ '--e-hp': `${enemyHpPct}%` } as React.CSSProperties}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                {enemy.intent.type === 'attack' && `⚔️ ${enemy.intent.value} 공격 예정`}
                {enemy.intent.type === 'defend' && `🛡️ +${enemy.intent.value} 방어 예정`}
                {enemy.intent.type === 'buff' && '🔥 공격력 강화'}
              </span>
              {enemy.block > 0 && (
                <span className="text-chart-1 font-bold">🛡️ +{enemy.block}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Backpack Grid Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>🎒 {locale === 'ko' ? '마법 배낭 (클릭하여 사용/배치)' : 'Magic Backpack'}</span>
          {selectedInstanceId && (
            <button
              onClick={handleRotateSelected}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              🔄 {locale === 'ko' ? '90° 회전 (R)' : 'Rotate (R)'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-6 gap-1 bg-muted/20 p-2 rounded-lg border border-border">
          {Array.from({ length: engineState.gridRows }).map((_, r) =>
            Array.from({ length: engineState.gridCols }).map((__, c) => {
              const key = `${r}:${c}`;
              const isUnlocked = engineState.unlockedSlots[r][c];
              const occupied = cellOccupationMap.get(key);
              const isSelected = occupied && occupied.item.instanceId === selectedInstanceId;

              if (!isUnlocked) {
                const canExpand = engineState.gameState === 'loot' && engineState.expandChoicesLeft > 0;
                return (
                  <button
                    key={key}
                    onClick={() => handleCellClick(r, c)}
                    disabled={!canExpand}
                    className={`h-16 rounded border border-dashed flex items-center justify-center text-xs transition-colors ${
                      canExpand
                        ? 'border-primary/60 bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                        : 'border-border/30 bg-muted/10 text-muted-foreground/30'
                    }`}
                  >
                    {canExpand ? '🔓' : '🔒'}
                  </button>
                );
              }

              if (occupied) {
                const item = occupied.item;
                const def = ITEM_CATALOG[item.defId];
                const { value, bonus } = engineRef.current.calculateEffectiveItemValue(item.instanceId);

                return (
                  <TiltBackpackItemButton
                    key={key}
                    item={item}
                    def={def}
                    value={value}
                    bonus={bonus}
                    isSelected={Boolean(isSelected)}
                    onClick={() => handleItemClick(item)}
                  />
                );
              }

              return (
                <button
                  key={key}
                  onClick={() => handleCellClick(r, c)}
                  className="h-16 rounded border border-border/40 bg-background/50 hover:bg-muted/40 transition-colors flex items-center justify-center text-muted-foreground/20 text-xs"
                >
                  ·
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Action Bar */}
      {engineState.gameState === 'battle' && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {locale === 'ko' ? '배낭 아이템을 탭하여 발동하세요.' : 'Tap an item in your bag to activate it.'}
          </p>
          <Button onClick={handleEndTurn}>
            {locale === 'ko' ? '턴 종료 (End Turn)' : 'End Turn'}
          </Button>
        </div>
      )}

      {/* Combat Log */}
      <div className="bg-muted/30 p-2.5 rounded-lg border border-border h-16 overflow-y-auto font-mono text-xs text-muted-foreground space-y-0.5">
        {engineState.combatLog.map((log, idx) => (
          <div key={idx} className={idx === 0 ? 'text-foreground font-semibold' : ''}>
            {log}
          </div>
        ))}
      </div>

      {/* Loot & Expansion Modal */}
      {engineState.gameState === 'loot' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-5 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-primary uppercase tracking-wider">Victory!</span>
              <h2 className="text-lg font-bold text-foreground">
                {locale === 'ko' ? '전리품 획득 & 배낭 확장' : 'Victory & Loot'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {engineState.expandChoicesLeft > 0
                  ? locale === 'ko'
                    ? `배낭의 잠긴 칸(🔒)을 클릭하여 ${engineState.expandChoicesLeft}칸 확장할 수 있습니다.`
                    : `Click locked slots (🔒) on the backpack to unlock ${engineState.expandChoicesLeft} cells.`
                  : locale === 'ko'
                  ? '원하는 전리품을 배낭에 챙기세요.'
                  : 'Take desired loot items into your backpack.'}
              </p>
            </div>

            <div className="space-y-2">
              {engineState.lootPool.map((defId) => {
                const def = ITEM_CATALOG[defId];
                if (!def) return null;
                const lootSprite = getBackpackItemSprite(def.id, def.type);
                return (
                  <div
                    key={defId}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-10 rounded bg-background border border-border flex items-center justify-center shrink-0 p-1">
                        {lootSprite ? (
                          <img
                            src={lootSprite}
                            alt={def.name}
                            className="size-full object-contain filter drop-shadow-xs select-none pointer-events-none"
                            draggable={false}
                          />
                        ) : (
                          <span className="text-2xl">{def.icon}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground block">
                          {def.name}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {def.description}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleTakeLoot(defId)}>
                      {locale === 'ko' ? '담기' : 'Take'}
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleNextFloor} className="w-full">
              {locale === 'ko' ? `지하 ${engineState.floor + 1}층으로 전진` : 'Proceed to Next Floor'}
            </Button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {engineState.gameState === 'victory' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="flex justify-center">
              <img
                src={BACKPACK_HERO_SPRITES.trophy}
                alt="Victory Trophy"
                className="size-20 object-contain drop-shadow-xl animate-bounce select-none pointer-events-none"
                draggable={false}
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-primary">
                {locale === 'ko' ? '던전 완전 정복!' : 'Dungeon Conquered!'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === 'ko'
                  ? '배낭의 시너지를 극대화하여 지하 5층 리치를 격파했습니다.'
                  : 'You defeated the Dungeon Lich and conquered all 5 floors.'}
              </p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg text-xs font-mono">
              <span className="text-muted-foreground block">획득 골드</span>
              <span className="text-base font-bold text-foreground">💰 {engineState.gold}G</span>
            </div>
            <Button onClick={handleRestart} className="w-full">
              {locale === 'ko' ? '새 원정 시작하기' : 'Start New Expedition'}
            </Button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {engineState.gameState === 'game_over' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="text-4xl">🪦</div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-destructive">
                {locale === 'ko' ? '원정 실패' : 'Expedition Failed'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === 'ko'
                  ? `지하 ${engineState.floor}층에서 몬스터에게 패배했습니다.`
                  : `Defeated by monsters on Floor ${engineState.floor}.`}
              </p>
            </div>
            <Button onClick={handleRestart} className="w-full">
              {locale === 'ko' ? '다시 도전하기' : 'Try Again'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
