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
import { GameStatTile } from '../ui/game/GameStatTile';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

export default function CheeseFactory() {
  const [gameState, setGameState] = useState<CheeseFactoryGameState>(() =>
    createCheeseFactoryGame(300)
  );
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

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
        }
      }

      // -------------------------------------------------------------
      // Render 2D Factory Canvas
      // -------------------------------------------------------------
      const width = canvas.width;
      const height = canvas.height;

      // Clean background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Floor grid tiles
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Conveyor belt line linking stations
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(40, 155);
      ctx.lineTo(650, 155);
      ctx.stroke();

      // Render factory stations
      current.stations.forEach((station, idx) => {
        // Station shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(station.x + 3, station.y + 3, station.width, station.height);

        // Station body
        const isCellar = station.id === 'aging_cellar';
        ctx.fillStyle = isCellar ? '#1e3a8a' : idx % 2 === 0 ? '#334155' : '#475569';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.fillRect(station.x, station.y, station.width, station.height);
        ctx.strokeRect(station.x, station.y, station.width, station.height);

        // Station name label
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(station.name.split(' ')[0], station.x + station.width / 2, station.y - 6);

        // Station level badge
        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px monospace';
        ctx.fillText(`Lv.${station.level}`, station.x + station.width / 2, station.y + station.height + 12);
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

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = varietyDef.color;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Maturity mini ring if in cellar
        if (maturity > 0 && maturity < 100) {
          ctx.beginPath();
          ctx.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + (maturity / 100) * Math.PI * 2);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      });

      // Render Autonomous AGV Transport Bots
      current.bots.forEach((bot) => {
        ctx.save();
        ctx.translate(bot.x, bot.y);

        // Bot chassis shadow & body
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(-bot.radius, -bot.radius, bot.radius * 2, bot.radius * 2, 4);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Direction indicator light
        const angle = Math.atan2(bot.vy, bot.vx);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * (bot.radius - 2), Math.sin(angle) * (bot.radius - 2), 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
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
    const success = spawnCheeseBatch(stateRef.current, variety);
    if (success) {
      playPressSfx();
      setGameState({ ...stateRef.current });
    }
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    const success = buyFactoryUpgrade(stateRef.current, upgradeId);
    if (success) {
      playBotSfx();
      setGameState({ ...stateRef.current });
    }
  };

  const handleAdjustTemp = (delta: number) => {
    setCellarTargetTemp(stateRef.current, stateRef.current.targetCellarTemp + delta);
    setGameState({ ...stateRef.current });
  };

  const activeCheeses = gameState.ecsWorld.getActiveCount();

  const handleShareReport = () => {
    const text = `🧀 [Cheese Factory Tycoon Report]\n• Revenue: $${gameState.totalRevenueEarned} (${gameState.totalCheesesShipped} wheels shipped)\n• Cash: $${gameState.cash}\n• Active Vat Entities: ${activeCheeses}\n• Cellar Temp: ${gameState.cellarTemp.toFixed(1)}°C\nPlay on game.oiyo.net!`;
    shareText(text);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto p-2">
      {/* Top Stat Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GameStatTile
          icon="💰"
          label="Treasury Cash"
          value={`$${gameState.cash}`}
          highlight={gameState.cash > 500}
        />
        <GameStatTile
          icon="🥛"
          label="Raw Alpine Milk"
          value={`${Math.floor(gameState.milkInventory)}L`}
          highlight={gameState.milkInventory < 30}
        />
        <GameStatTile
          icon="🧀"
          label="Shipped Cheeses"
          value={`${gameState.totalCheesesShipped}`}
        />
        <GameStatTile
          icon="🌡️"
          label="Cellar Temp"
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
              AGV Fleet: {gameState.bots.length} Boids
            </Badge>
            <Badge variant="outline">
              ECS Entities: {activeCheeses}
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
                  Artisan Cheese Production Vats
                </h2>
                <p className="text-xs text-muted-foreground">
                  Allocate raw milk to start coagulation and aging pipelines.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareReport}
                >
                  {copied ? 'Copied Report!' : 'Share Factory Stats'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(CHEESE_VARIETIES) as CheeseVariety[]).map((vKey) => {
                const def = CHEESE_VARIETIES[vKey];
                const canAfford = gameState.milkInventory >= def.baseMilkCost;
                return (
                  <Button
                    key={vKey}
                    variant={canAfford ? 'default' : 'secondary'}
                    size="sm"
                    disabled={!canAfford}
                    onClick={() => handleSpawnBatch(vKey)}
                    className="flex flex-col items-center justify-center h-auto"
                  >
                    <span className="font-medium">{def.name.split(' ')[0]}</span>
                    <span className="text-muted-foreground text-xs">
                      {def.baseMilkCost}L • ${def.basePrice}
                    </span>
                  </Button>
                );
              })}
            </div>

            <hr className="border-border my-2" />

            {/* Cellar Temperature Management & Upgrades */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cellar Climate Control */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-xs font-medium text-foreground">
                  Cellar Climate Regulation
                </span>
                <p className="text-xs text-muted-foreground">
                  Fine-tune cellar ambient temperature to maximize curing speed for target variety.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdjustTemp(-1)}
                  >
                    -1°C Cooler
                  </Button>
                  <span className="font-mono text-sm px-2 text-foreground">
                    {gameState.targetCellarTemp}°C
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdjustTemp(1)}
                  >
                    +1°C Warmer
                  </Button>
                </div>
              </div>

              {/* Industrial Automation Upgrades */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-xs font-medium text-foreground">
                  Automation & Expansion Upgrades
                </span>
                <div className="flex flex-col gap-1.5">
                  {gameState.upgrades.map((u) => {
                    const canBuy = !u.purchased && gameState.cash >= u.cost;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate text-muted-foreground">{u.name}</span>
                        {u.purchased ? (
                          <Badge variant="secondary">
                            Installed
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
