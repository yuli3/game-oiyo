import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PlagueEngine,
  TRAITS,
  type Region,
  type TraitCategory,
  type PopBubble,
} from '../../lib/games/plague-mini';
import { Button } from '../ui/button';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Dna,
  Syringe,
  AlertTriangle,
  Globe,
  Radio,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export const PlagueMini: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PlagueEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // UI state
  const [selectedRegionId, setSelectedRegionId] = useState<string>('east_asia');
  const [activeTab, setActiveTab] = useState<TraitCategory>('transmission');
  const [isEvolutionOpen, setIsEvolutionOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Synced Snapshot
  const [day, setDay] = useState(1);
  const [dnaPoints, setDnaPoints] = useState(12);
  const [cureProgress, setCureProgress] = useState(0);
  const [isCureStarted, setIsCureStarted] = useState(false);
  const [infectivity, setInfectivity] = useState(8);
  const [severity, setSeverity] = useState(0);
  const [lethality, setLethality] = useState(0);
  const [totalPop, setTotalPop] = useState(0);
  const [totalInfected, setTotalInfected] = useState(0);
  const [totalDead, setTotalDead] = useState(0);
  const [unlockedTraits, setUnlockedTraits] = useState<string[]>([]);
  const [latestNews, setLatestNews] = useState<string>('Patient Zero infected in East Asia.');
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  // Web Audio Context for authentic retro SFX
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = useCallback((type: 'pop' | 'cure_pop' | 'mutate' | 'alert' | 'gameover') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'cure_pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'mutate') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(640, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'alert') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1100, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.6);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new PlagueEngine();
    syncSnapshot();
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      if (engineRef.current) {
        const eng = engineRef.current;
        const prevCure = eng.isCureStarted;
        const prevOver = eng.gameOver;

        eng.update(dt);

        if (!prevCure && eng.isCureStarted) {
          playSfx('alert');
        }
        if (!prevOver && eng.gameOver) {
          playSfx('gameover');
        }

        renderCanvas(eng, dt);
        syncSnapshot();
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [playSfx]);

  const syncSnapshot = () => {
    const eng = engineRef.current;
    if (!eng) return;

    setDay(eng.day);
    setDnaPoints(eng.dnaPoints);
    setCureProgress(Math.round(eng.cureProgress * 10) / 10);
    setIsCureStarted(eng.isCureStarted);
    setInfectivity(eng.infectivity);
    setSeverity(eng.severity);
    setLethality(eng.lethality);
    setTotalPop(eng.totalPopulation);
    setTotalInfected(eng.totalInfected);
    setTotalDead(eng.totalDead);
    setUnlockedTraits(Array.from(eng.unlockedTraits));
    if (eng.newsFeed.length > 0) {
      setLatestNews(eng.newsFeed[0].text);
    }
    setGameOver(eng.gameOver);
    setVictory(eng.victory);
  };

  const handleRestart = () => {
    engineRef.current = new PlagueEngine();
    setSelectedRegionId('east_asia');
    setIsEvolutionOpen(false);
    syncSnapshot();
  };

  const togglePause = () => {
    if (!engineRef.current) return;
    engineRef.current.isPaused = !engineRef.current.isPaused;
    setIsPaused(engineRef.current.isPaused);
  };

  const cycleGameSpeed = () => {
    if (!engineRef.current) return;
    let next = 1;
    if (gameSpeed === 1) next = 2;
    else if (gameSpeed === 2) next = 3;
    else next = 1;
    engineRef.current.gameSpeed = next;
    setGameSpeed(next);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const eng = engineRef.current;
    if (!canvas || !eng) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked a floating bubble
    for (let i = eng.bubbles.length - 1; i >= 0; i--) {
      const b = eng.bubbles[i];
      const dist = Math.hypot(b.x - clickX, b.y - clickY);
      if (dist < 4.5) {
        // Pop!
        const result = eng.popBubble(b.id);
        if (result) {
          playSfx(result.type === 'cure' ? 'cure_pop' : 'pop');

          // Spawn burst particles
          for (let p = 0; p < 14; p++) {
            particlesRef.current.push({
              x: (b.x / 100) * canvas.width,
              y: (b.y / 100) * canvas.height,
              vx: (Math.random() - 0.5) * 180,
              vy: (Math.random() - 0.5) * 180,
              color: result.type === 'cure' ? '#38bdf8' : '#ef4444',
              size: Math.random() * 3 + 2,
              life: 0.5,
              maxLife: 0.5,
            });
          }
        }
        syncSnapshot();
        return;
      }
    }

    // Check if clicked a region
    let closestRegion: Region | null = null;
    let closestDist = 999;
    for (const r of eng.regions) {
      const dist = Math.hypot(r.x - clickX, r.y - clickY);
      if (dist < closestDist && dist < 12) {
        closestDist = dist;
        closestRegion = r;
      }
    }

    if (closestRegion) {
      setSelectedRegionId(closestRegion.id);
    }
  };

  const handleUnlockTrait = (traitId: string) => {
    if (!engineRef.current) return;
    const ok = engineRef.current.unlockTrait(traitId);
    if (ok) {
      playSfx('mutate');
      syncSnapshot();
    }
  };

  /**
   * 60fps HTML5 Canvas World Map Render Loop
   */
  const renderCanvas = (eng: PlagueEngine, dt: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    // 1. Oceanic Background
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    // Oceanic grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Draw Regions (Nodes & Infection Glow)
    for (const r of eng.regions) {
      const rx = (r.x / 100) * w;
      const ry = (r.y / 100) * h;
      const isSelected = r.id === selectedRegionId;

      const infectRatio = r.population > 0 ? r.infected / r.population : 0;
      const deadRatio = r.population > 0 ? r.dead / r.population : 0;

      // Infection Aura Glow
      if (infectRatio > 0.001) {
        const pulse = Math.sin(Date.now() * 0.006 + r.x) * 4;
        const glowRadius = Math.max(18, Math.min(55, infectRatio * 50 + 18)) + pulse;
        const grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, glowRadius);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
        grad.addColorStop(0.6, 'rgba(239, 68, 68, 0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(rx, ry, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Region Center Landmass Circle
      ctx.fillStyle = deadRatio > 0.8 ? '#18181b' : r.color;
      ctx.beginPath();
      ctx.arc(rx, ry, 14, 0, Math.PI * 2);
      ctx.fill();

      // Border highlight
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      // Region Name
      ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(r.name, rx, ry - 18);

      // Status indicator icons (Airport / Seaport closed)
      if (r.airportClosed && r.hasAirport) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '9px sans-serif';
        ctx.fillText('✈️✕', rx - 14, ry + 22);
      }
      if (r.seaportClosed && r.hasSeaport) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '9px sans-serif';
        ctx.fillText('⚓✕', rx + 14, ry + 22);
      }
    }

    // 3. Draw Active Transit Vehicles
    for (const v of eng.vehicles) {
      const from = eng.regions.find(r => r.id === v.fromId);
      const to = eng.regions.find(r => r.id === v.toId);
      if (!from || !to) continue;

      const fx = (from.x / 100) * w;
      const fy = (from.y / 100) * h;
      const tx = (to.x / 100) * w;
      const ty = (to.y / 100) * h;

      // Linear interpolated position
      const vx = fx + (tx - fx) * v.progress;
      const vy = fy + (ty - fy) * v.progress;

      // Trajectory dashed route line
      ctx.beginPath();
      ctx.strokeStyle = v.isInfected ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.15)';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.moveTo(fx, fy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // Vehicle Icon
      ctx.save();
      ctx.translate(vx, vy);
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (v.type === 'plane') {
        ctx.fillText(v.isInfected ? '🔴✈️' : '✈️', 0, 0);
      } else {
        ctx.fillText(v.isInfected ? '🔴🚢' : '🚢', 0, 0);
      }
      ctx.restore();
    }

    // 4. Draw Floating Pop Bubbles
    for (const b of eng.bubbles) {
      renderBubble(ctx, b, w, h);
    }

    // 5. Update and render particles
    renderParticles(ctx, dt);

    ctx.restore();
  };

  const renderBubble = (ctx: CanvasRenderingContext2D, b: PopBubble, w: number, h: number) => {
    const bx = (b.x / 100) * w;
    const by = (b.y / 100) * h;
    const pulse = Math.sin(Date.now() * 0.01 + b.x) * 2;

    ctx.save();
    ctx.translate(bx, by);

    // Glowing circle
    ctx.fillStyle = b.type === 'cure' ? '#0284c7' : '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 0, 13 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner icon
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.type === 'cure' ? '💉' : '☣️', 0, 0);

    ctx.restore();
  };

  const renderParticles = (ctx: CanvasRenderingContext2D, dt: number) => {
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const selectedRegion = engineRef.current?.regions.find(r => r.id === selectedRegionId);

  const infectPercent = totalPop > 0 ? Math.round((totalInfected / totalPop) * 100) : 0;
  const deadPercent = totalPop > 0 ? Math.round((totalDead / totalPop) * 100) : 0;
  const healthyPercent = Math.max(0, 100 - infectPercent - deadPercent);

  const traitsInTab = Object.values(TRAITS).filter(t => t.category === activeTab);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 gap-4 select-none">
      {/* Top Global Status HUD */}
      <div className="flex flex-wrap items-center justify-between w-full bg-card/80 border border-border p-3 rounded-xl backdrop-blur-md gap-3">
        {/* Day & DNA Points */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Day
            </span>
            <span className="text-xl font-black text-foreground">#{day}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-destructive/15 border border-destructive/30 px-3 py-1.5 rounded-lg">
            <Dna className="size-4 text-destructive" />
            <span className="text-sm font-black text-destructive">{dnaPoints} DNA</span>
          </div>
        </div>

        {/* Global Infection Ratio Meter */}
        <div className="flex flex-col min-w-44 flex-1 max-w-xs">
          <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
            <span className="text-primary">Healthy {healthyPercent}%</span>
            <span className="text-destructive">Infected {infectPercent}%</span>
            {deadPercent > 0 && <span className="text-foreground">Dead {deadPercent}%</span>}
          </div>
          <div className="flex w-full h-2 rounded-full overflow-hidden bg-muted border border-border/40">
            <div
              className="bg-primary h-full transition-all duration-200 w-(--h-w)"
              style={{ '--h-w': `${healthyPercent}%` } as React.CSSProperties}
            />
            <div
              className="bg-destructive h-full transition-all duration-200 w-(--i-w)"
              style={{ '--i-w': `${infectPercent}%` } as React.CSSProperties}
            />
            <div
              className="bg-foreground h-full transition-all duration-200 w-(--d-w)"
              style={{ '--d-w': `${deadPercent}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Cure Research Progress Meter */}
        <div className="flex flex-col min-w-36">
          <div className="flex items-center justify-between text-xs font-bold text-info">
            <span className="flex items-center gap-1">
              <Syringe className="size-3.5" /> Cure
            </span>
            <span>{isCureStarted ? `${cureProgress}%` : 'Not Started'}</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-1 border border-border/40">
            <div
              className="bg-info h-full transition-all duration-150 rounded-full w-(--cure-w)"
              style={{ '--cure-w': `${cureProgress}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={togglePause}
          >
            {isPaused ? <Play className="size-4 text-primary" /> : <Pause className="size-4" />}
          </Button>

          <Button
            variant={gameSpeed > 1 ? 'default' : 'outline'}
            size="sm"
            onClick={cycleGameSpeed}
          >
            <Zap className="size-3.5" /> {gameSpeed}x
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="size-4 text-primary" />
            ) : (
              <VolumeX className="size-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRestart}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      {/* News Ticker Bar */}
      <div className="flex items-center gap-2 w-full bg-card/60 border border-border px-3 py-1.5 rounded-lg text-xs overflow-hidden">
        <Radio className="size-3.5 text-destructive shrink-0 animate-pulse" />
        <span className="text-xs font-bold text-destructive uppercase tracking-wider shrink-0">
          Global News
        </span>
        <span className="text-muted-foreground truncate">{latestNews}</span>
      </div>

      {/* Main World Map Canvas */}
      <div className="relative w-full aspect-3/2 bg-card rounded-2xl border-2 border-border shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={960}
          height={640}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-pointer block"
        />

        {/* Selected Country HUD Pill (Bottom Left overlay) */}
        {selectedRegion && (
          <div className="absolute bottom-3 left-3 bg-background/90 border border-border/80 p-3 rounded-xl backdrop-blur-md shadow-xl flex flex-col gap-1 text-xs max-w-xs pointer-events-none">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span className="flex items-center gap-1.5 text-sm">
                <Globe className="size-4 text-primary" /> {selectedRegion.name}
              </span>
              <span className="capitalize text-muted-foreground text-xs">
                {selectedRegion.climate} · {selectedRegion.wealth}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground mt-1">
              <span>Pop: {selectedRegion.population.toLocaleString()}</span>
              <span className="text-destructive font-semibold">
                Infected: {selectedRegion.infected.toLocaleString()}
              </span>
              <span className="text-foreground">Dead: {selectedRegion.dead.toLocaleString()}</span>
              <span>
                Air: {selectedRegion.airportClosed ? '🔒 Closed' : '✈️ Open'} · Sea:{' '}
                {selectedRegion.seaportClosed ? '🔒 Closed' : '⚓ Open'}
              </span>
            </div>
          </div>
        )}

        {/* Mutation Tree Open Toggle Button (Bottom Right overlay) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 shadow-2xl">
          <Button
            size="lg"
            onClick={() => setIsEvolutionOpen(!isEvolutionOpen)}
          >
            <Dna className="size-4 mr-1.5" />
            Evolve Disease ({dnaPoints} DNA)
          </Button>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 gap-4 z-30">
            {victory ? (
              <>
                <h2 className="text-3xl font-black text-destructive tracking-wider">
                  TOTAL EXTINCTION
                </h2>
                <p className="text-muted-foreground text-xs max-w-sm text-center">
                  Your pathogen has successfully eradicated all human life on Earth. The world falls silent in {day} days.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-black text-info tracking-wider">CURE DEPLOYED</h2>
                <p className="text-muted-foreground text-xs max-w-sm text-center">
                  Humanity developed and distributed the vaccine before total annihilation. The pathogen was purged.
                </p>
              </>
            )}
            <Button onClick={handleRestart} size="lg">
              <RotateCcw className="size-4" /> Start New Pandemic
            </Button>
          </div>
        )}
      </div>

      {/* Disease Mutation & Evolution Modal Panel */}
      {isEvolutionOpen && (
        <div className="flex flex-col w-full bg-card border border-border p-4 rounded-xl gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black uppercase tracking-wider text-foreground">
                Genetic Evolution Lab
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold">
                <span>Infectivity: {infectivity}</span>
                <span>Severity: {severity}</span>
                <span>Lethality: {lethality}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEvolutionOpen(false)}
            >
              Close
            </Button>
          </div>

          {/* Evolution Categories Tab */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            {(['transmission', 'symptom', 'ability'] as TraitCategory[]).map(cat => (
              <Button
                key={cat}
                variant={activeTab === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>

          {/* Traits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {traitsInTab.map(trait => {
              const isUnlocked = unlockedTraits.includes(trait.id);
              const canUnlock = engineRef.current?.canUnlockTrait(trait.id) ?? false;

              return (
                <div
                  key={trait.id}
                  className={`flex flex-col p-3 rounded-lg border text-left transition-all justify-between gap-2 ${
                    isUnlocked
                      ? 'border-destructive bg-destructive/15'
                      : canUnlock
                      ? 'border-border bg-muted/40 hover:bg-muted/70'
                      : 'border-border/40 opacity-50 bg-background/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-foreground">{trait.name}</span>
                    <span
                      className={`text-xs font-bold ${
                        isUnlocked
                          ? 'text-destructive'
                          : canUnlock
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {isUnlocked ? 'Evolved' : `${trait.cost} DNA`}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">{trait.description}</p>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {trait.infectivity > 0 && <span>+Inf {trait.infectivity}</span>}
                      {trait.severity > 0 && <span>+Sev {trait.severity}</span>}
                      {trait.lethality > 0 && <span className="text-destructive">+Leth {trait.lethality}</span>}
                    </div>

                    {!isUnlocked && (
                      <Button
                        size="xs"
                        variant={canUnlock ? 'default' : 'outline'}
                        disabled={!canUnlock}
                        onClick={() => handleUnlockTrait(trait.id)}
                      >
                        Evolve
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pathogen Stats Footer Summary */}
      <div className="flex flex-wrap items-center justify-between w-full bg-card/60 border border-border px-4 py-2.5 rounded-xl text-xs text-muted-foreground gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <AlertTriangle className="size-3.5 text-warning" />
            Infectivity: <strong className="text-foreground">{infectivity}</strong>
          </span>
          <span>
            Severity: <strong className="text-foreground">{severity}</strong>
          </span>
          <span>
            Lethality: <strong className="text-destructive">{lethality}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>Active Mutations: {unlockedTraits.length}</span>
          <span>Cure Speed: {isCureStarted ? 'Accelerating' : 'Inactive'}</span>
        </div>
      </div>
    </div>
  );
};
