import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createCheeseFactoryGame,
  stepCheeseFactory,
  spawnCheeseBatch,
  buyFactoryUpgrade,
  upgradeStation,
  setCellarTargetTemp,
  CHEESE_VARIETIES,
  unpackCheeseTag,
  type CheeseFactoryGameState,
  type CheeseVariety,
  type StationType,
} from '../../lib/games/cheese-factory';
import { useAudioContext } from '../../lib/games/use-audio-context';
import { useClipboardShare } from '../../lib/games/use-clipboard-share';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import { CHEESE_FACTORY_SPRITES } from '../../lib/games/sprites';
import { drawBackdrop, drawSprite } from '../../lib/games/pixel-kit';
import { FACTORY_FLOOR, FORKLIFT_BOT, cheeseWedge } from '../../lib/games/pixel-sprites';
import { celebrate } from '../../lib/games/celebration';
import { loadHighScore, saveHighScore } from '../../lib/games/game-save';
import { GameStatTile } from '../ui/game/GameStatTile';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cheeseCopy, type CheeseCopy } from './cheese-factory-copy';

function TiltCheeseVarietyButton({
  vKey,
  canAfford,
  onSpawn,
  t,
}: {
  t: CheeseCopy;
  vKey: CheeseVariety;
  canAfford: boolean;
  onSpawn: (key: CheeseVariety) => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();
  const def = CHEESE_VARIETIES[vKey];

  return (
    <Button
      variant={canAfford ? 'default' : 'secondary'}
      size="sm"
      disabled={!canAfford}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop();
        onSpawn(vKey);
      }}
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      className="will-change-transform transform-(--card-tilt) flex flex-col items-center justify-center h-auto"
    >
      <span className="font-medium">{t.varieties[vKey]}</span>
      <span className="text-muted-foreground text-xs">
        {def.baseMilkCost}L • ${def.basePrice}
      </span>
    </Button>
  );
}

export default function CheeseFactory({ locale = 'en' }: { locale?: string }) {
  const t = cheeseCopy(locale);
  const stationNamesRef = useRef(t.stations);
  stationNamesRef.current = t.stations;
  const [gameState, setGameState] = useState<CheeseFactoryGameState>(() =>
    createCheeseFactoryGame(300)
  );
  const [highScore, setHighScore] = useState(() => loadHighScore('cheese-factory', 300));
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  useEffect(() => {
    if (gameState.cash > 300) {
      const { isNewBest, bestScore } = saveHighScore('cheese-factory', gameState.cash);
      if (isNewBest) setHighScore(bestScore);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('oiyo:game-score', { detail: { slug: 'cheese-factory', score: gameState.cash } }));
      }
    }
  }, [gameState.cash]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const celebratedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const getAudioContext = useAudioContext();
  const { copied, shareText } = useClipboardShare();

  const playTone = useCallback(
    (freq: number, type: OscillatorType = 'sine', dur = 0.1) => {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {
        // AudioContext suspended or blocked
      }
    },
    [getAudioContext]
  );

  const playCoinSfx = useCallback(() => {
    MobileHapticsPro.light();
    playTone(587.33, 'sine', 0.08);
    setTimeout(() => playTone(880, 'sine', 0.12), 60);
  }, [playTone]);

  const playPressSfx = useCallback(() => {
    playTone(110, 'triangle', 0.12);
  }, [playTone]);

  const playBotSfx = useCallback(() => {
    playTone(440, 'square', 0.05);
  }, [playTone]);

  // Main canvas animation & simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localLastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.1, (time - localLastTime) / 1000);
      localLastTime = time;

      const current = stateRef.current;
      if (!current.isPaused) {
        const stepResult = stepCheeseFactory(current, dt);
        if (stepResult.revenueGained > 0) {
          playCoinSfx();
          if (!celebratedRef.current && current.totalCheesesShipped >= 5 && containerRef.current) {
            celebratedRef.current = true;
            celebrate(containerRef.current, { preset: 'stardust' });
          }
        }
      }

      // -------------------------------------------------------------
      // Render 2D Factory Canvas
      // -------------------------------------------------------------
      const width = canvas.width;
      const height = canvas.height;

      // Factory floor (pixel tiles)
      drawBackdrop(ctx, width, height, FACTORY_FLOOR, 3);

      // Conveyor belt: dark rubber with moving pixel cleats
      ctx.fillStyle = '#0b0f17';
      ctx.fillRect(36, 148, 618, 14);
      ctx.fillStyle = '#475569';
      ctx.fillRect(36, 148, 618, 2);
      ctx.fillRect(36, 160, 618, 2);
      const beltShift = Math.floor(time / 40) % 12;
      ctx.fillStyle = '#64748b';
      for (let x = 36 + beltShift; x < 650; x += 12) ctx.fillRect(x, 152, 4, 6);

      // Factory stations: bevelled pixel machines with rivets and a lamp
      current.stations.forEach((station) => {
        const isCellar = station.id === 'aging_cellar';
        const sx = Math.round(station.x);
        const sy = Math.round(station.y);
        const sw = Math.round(station.width);
        const sh = Math.round(station.height);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(sx + 4, sy + 4, sw, sh);
        ctx.fillStyle = isCellar ? '#3b2f2a' : '#64748b';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = isCellar ? '#57463d' : '#94a3b8';
        ctx.fillRect(sx, sy, sw, 3);
        ctx.fillRect(sx, sy, 3, sh);
        ctx.fillStyle = isCellar ? '#211a17' : '#334155';
        ctx.fillRect(sx, sy + sh - 3, sw, 3);
        ctx.fillRect(sx + sw - 3, sy, 3, sh);
        ctx.fillStyle = isCellar ? '#cbd5e1' : '#e2e8f0';
        for (const [rx, ry] of [[sx + 5, sy + 5], [sx + sw - 8, sy + 5], [sx + 5, sy + sh - 8], [sx + sw - 8, sy + sh - 8]]) ctx.fillRect(rx, ry, 3, 3);
        if (isCellar) {
          // stone arch doorway
          ctx.fillStyle = '#0c0a09';
          const aw = Math.max(12, Math.round(sw * 0.45));
          ctx.fillRect(sx + Math.round((sw - aw) / 2), sy + Math.round(sh * 0.35), aw, Math.round(sh * 0.65) - 3);
          ctx.fillRect(sx + Math.round((sw - aw) / 2) + 3, sy + Math.round(sh * 0.35) - 3, aw - 6, 3);
        } else {
          // glass window
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(sx + 8, sy + 10, sw - 16, Math.max(6, Math.round(sh * 0.3)));
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(sx + 10, sy + 12, Math.max(2, Math.round((sw - 20) * 0.35)), 2);
        }
        // status lamp
        ctx.fillStyle = Math.floor(time / 500 + station.x) % 2 === 0 ? '#22c55e' : '#166534';
        ctx.fillRect(sx + sw - 10, sy - 5, 5, 5);

        // Station name label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(stationNamesRef.current[station.id] ?? station.name.split(' ')[0], sx + sw / 2, sy - 7);

        // Station level badge
        ctx.fillStyle = '#fcd34d';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`Lv.${station.level}`, sx + sw / 2, sy + sh + 12);
      });

      // Render SoA Cheese Entities
      current.ecsWorld.query(0x01 | 0x04, (eId) => {
        const x = current.ecsWorld.x[eId];
        const y = current.ecsWorld.y[eId];
        const maturity = current.ecsWorld.hp[eId];
        const tag = current.ecsWorld.tag[eId];
        const { varietyIndex } = unpackCheeseTag(tag);
        const varietyKey = Object.keys(CHEESE_VARIETIES)[varietyIndex] as CheeseVariety;
        const varietyDef = CHEESE_VARIETIES[varietyKey] || CHEESE_VARIETIES.mozzarella;

        drawSprite(ctx, cheeseWedge(varietyDef.color), x, y, { scale: 2 });

        // Maturity bar if in cellar
        if (maturity > 0 && maturity < 100) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(Math.round(x) - 9, Math.round(y) + 11, 18, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(Math.round(x) - 8, Math.round(y) + 12, Math.round(16 * maturity / 100), 2);
        }
      });

      // Render Autonomous AGV Transport Bots
      current.bots.forEach((bot) => {
        drawSprite(ctx, FORKLIFT_BOT, bot.x, bot.y, { scale: 2, flipX: bot.vx < 0 });
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playCoinSfx]);

  // Periodic React state synchronization from engine
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState({ ...stateRef.current });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const handleSpawnBatch = (variety: CheeseVariety) => {
    MobileHapticsPro.impact();
    const success = spawnCheeseBatch(stateRef.current, variety);
    if (success) {
      playPressSfx();
      setGameState({ ...stateRef.current });
    }
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    MobileHapticsPro.click();
    const success = buyFactoryUpgrade(stateRef.current, upgradeId);
    if (success) {
      playBotSfx();
      setGameState({ ...stateRef.current });
    }
  };

  const handleAdjustTemp = (delta: number) => {
    MobileHapticsPro.selection();
    setCellarTargetTemp(stateRef.current, stateRef.current.targetCellarTemp + delta);
    setGameState({ ...stateRef.current });
  };

  const activeCheeses = gameState.ecsWorld.getActiveCount();

  const handleShareReport = () => {
    MobileHapticsPro.success();
    const text = t.report({ revenue: gameState.totalRevenueEarned, wheels: gameState.totalCheesesShipped, cash: gameState.cash, active: activeCheeses, temp: gameState.cellarTemp.toFixed(1) });
    shareText(text);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-4 w-full max-w-5xl mx-auto p-2">
      {/* Top 3D Artisan Header */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={CHEESE_FACTORY_SPRITES.wheel} alt="" className="size-10 object-contain drop-shadow-sm" />
          <div>
            <h2 className="text-sm font-bold text-foreground">{t.title}</h2>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        {gameState.totalCheesesShipped >= 5 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 border border-primary/30">
            <img src={CHEESE_FACTORY_SPRITES.trophy} alt="" className="size-6 object-contain animate-bounce" />
            <span className="text-xs font-bold text-primary">{t.master}</span>
          </div>
        )}
      </div>

      {/* Top Stat Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GameStatTile
          icon="💰"
          label={t.cash}
          value={`$${gameState.cash}`}
          highlight={gameState.cash > 500}
        />
        <GameStatTile
          icon="🥛"
          label={t.milk}
          value={`${Math.floor(gameState.milkInventory)}L`}
          highlight={gameState.milkInventory < 30}
        />
        <GameStatTile
          icon="🧀"
          label={t.shipped}
          value={`${gameState.totalCheesesShipped}`}
        />
        <GameStatTile
          icon="🌡️"
          label={t.cellarTemp}
          value={`${gameState.cellarTemp.toFixed(1)}°C`}
        />
      </div>

      {/* Main 2D Factory Viewport */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video w-full bg-background flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={405}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 flex gap-1 items-center bg-background/80 backdrop-blur-sm rounded p-1">
            <Badge variant="outline">
              {t.fleet(gameState.bots.length)}
            </Badge>
            <Badge variant="outline">
              {t.inVats(activeCheeses)}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Production & Variety Selection */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t.vatsTitle}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t.vatsHint}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareReport}
                >
                  {copied ? t.copied : t.share}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(CHEESE_VARIETIES) as CheeseVariety[]).map((vKey) => {
                const def = CHEESE_VARIETIES[vKey];
                const canAfford = gameState.milkInventory >= def.baseMilkCost;
                return (
                  <TiltCheeseVarietyButton
                    key={vKey}
                    vKey={vKey}
                    canAfford={canAfford}
                    onSpawn={handleSpawnBatch}
                    t={t}
                  />
                );
              })}
            </div>

            <hr className="border-border my-2" />

            {/* Cellar Temperature Management & Upgrades */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cellar Climate Control */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-xs font-medium text-foreground">
                  {t.climateTitle}
                </span>
                <p className="text-xs text-muted-foreground">
                  {t.climateHint}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdjustTemp(-1)}
                  >
                    {t.cooler}
                  </Button>
                  <span className="font-mono text-sm px-2 text-foreground">
                    {gameState.targetCellarTemp}°C
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdjustTemp(1)}
                  >
                    {t.warmer}
                  </Button>
                </div>
              </div>

              {/* Industrial Automation Upgrades */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-xs font-medium text-foreground">
                  {t.upgradesTitle}
                </span>
                <div className="flex flex-col gap-1.5">
                  {gameState.upgrades.map((u) => {
                    const canBuy = !u.purchased && gameState.cash >= u.cost;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate text-muted-foreground">{t.upgrades[u.id] ?? u.name}</span>
                        {u.purchased ? (
                          <Badge variant="secondary">
                            {t.installed}
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={!canBuy}
                            onClick={() => handleBuyUpgrade(u.id)}
                          >
                            ${u.cost}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
