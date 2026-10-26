import { useCallback, useEffect, useRef, useState } from 'react';
import { playSyntheticTone } from '../../lib/games/audio-mixer';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { triggerHaptic } from '../../lib/games/juice-engine';
import { recordResult } from '../../lib/games/records';
import {
  applyRelicOverdrivePreset,
  createInitialDomeKeeperState,
  drillMineCell,
  fireDomeLaserAtInvader,
  isAdjacentToExcavated,
  startAlienWaveDefense,
  upgradeDomeSystem,
  type DomeKeeperState,
} from '../../lib/games/dome-keeper';
import type { Locale } from '../../lib/i18n';

interface Props {
  locale?: Locale;
}

const COPY: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    wave: string;
    phase: string;
    domeHp: string;
    iron: string;
    cobalt: string;
    presetBtn: string;
    triggerWaveBtn: string;
    resetBtn: string;
    shareBtn: string;
    copied: string;
    upgradesTitle: string;
    mineTitle: string;
    defenseTitle: string;
  }
> = {
  ko: {
    title: '돔 키퍼 채굴 디펜스',
    subtitle: '지하 광산 채굴(Engine v5.0 보로노이 파쇄)과 유리 돔 레이저 방어를 오가며 유물 코어를 인양하세요.',
    wave: '웨이브',
    phase: '페이즈',
    domeHp: '유리 돔 내구도',
    iron: '철광석 (Iron)',
    cobalt: '코발트 (Cobalt)',
    presetBtn: '⚡ 유물 직통 채굴 프리셋',
    triggerWaveBtn: '🚨 외계 웨이브 즉시 호출',
    resetBtn: '새 탐사',
    shareBtn: '방어 기록 공유',
    copied: '복사됨!',
    upgradesTitle: '돔 공학 업그레이드 워크숍',
    mineTitle: '지하 지질 단면 (인접 블록 클릭 시 플라즈마 드릴 굴착)',
    defenseTitle: '지상 외계 침공군 (타깃 클릭 시 돔 레이저 포격)',
  },
  en: {
    title: 'Dome Keeper Drill Defense',
    subtitle: 'Alternate between underground stratum mining (Engine v5.0 Voronoi Shatter) and surface Glass Dome laser defense.',
    wave: 'Wave',
    phase: 'Phase',
    domeHp: 'Dome Hull',
    iron: 'Iron Ore',
    cobalt: 'Cobalt',
    presetBtn: '⚡ Relic Shaft Preset',
    triggerWaveBtn: '🚨 Trigger Wave Now',
    resetBtn: 'New Expedition',
    shareBtn: 'Share Defense Log',
    copied: 'Copied!',
    upgradesTitle: 'Dome Engineering Workshop',
    mineTitle: 'Underground Stratum (Click adjacent tile to drill)',
    defenseTitle: 'Surface Alien Assault (Click invader to fire Dome Laser)',
  },
  ja: {
    title: 'ドームキーパー採掘ディフェンス',
    subtitle: '地下鉱山の掘削（Engine v5.0 ボロノイ破砕）とガラスドームのレーザー防衛を切り替え、遺物コアを回収しよう。',
    wave: 'ウェーブ',
    phase: 'フェーズ',
    domeHp: 'ドーム耐久',
    iron: '鉄鉱石',
    cobalt: 'コバルト',
    presetBtn: '⚡ 遺物直通プリセット',
    triggerWaveBtn: '🚨 ウェーブ即時迎撃',
    resetBtn: '新規探査',
    shareBtn: '防衛記録を共有',
    copied: 'コピー完了！',
    upgradesTitle: 'ドーム工学アップグレード',
    mineTitle: '地下地層グリッド（隣接ブロックをクリックして掘削）',
    defenseTitle: '地上エイリアン襲撃（標的クリックでレーザー砲撃）',
  },
  zh: {
    title: '穹顶守护者采矿防卫',
    subtitle: '在地下矿层钻探（Engine v5.0 泰森多边形破碎）与地表玻璃穹顶激光防卫之间切换，发掘远古遗物核心。',
    wave: '波次',
    phase: '阶段',
    domeHp: '穹顶耐久',
    iron: '铁矿石',
    cobalt: '钴水晶',
    presetBtn: '⚡ 遗物直通预设',
    triggerWaveBtn: '🚨 立即迎击异形波次',
    resetBtn: '新探险',
    shareBtn: '分享防卫战报',
    copied: '已复制！',
    upgradesTitle: '穹顶工程升级工坊',
    mineTitle: '地下岩层（点击相邻方块钻探）',
    defenseTitle: '地表异形袭击（点击目标发射穹顶激光）',
  },
  fr: {
    title: 'Dome Keeper : Défense & Forage',
    subtitle: 'Alternez entre forage souterrain (Voronoi Shatter v5.0) et défense laser du dôme de verre.',
    wave: 'Vague',
    phase: 'Phase',
    domeHp: 'Coque du Dôme',
    iron: 'Minerai de Fer',
    cobalt: 'Cobalt',
    presetBtn: '⚡ Préréglage Puits Relique',
    triggerWaveBtn: '🚨 Lancer la Vague',
    resetBtn: 'Nouvelle Mission',
    shareBtn: 'Partager le Rapport',
    copied: 'Copié !',
    upgradesTitle: 'Atelier d’Ingénierie du Dôme',
    mineTitle: 'Strate Souterraine (Cliquez une case adjacente pour forer)',
    defenseTitle: 'Assaut Alien en Surface (Cliquez une cible pour tirer)',
  },
  es: {
    title: 'Dome Keeper: Defensa y Perforación',
    subtitle: 'Alterna entre la excavación subterránea (Voronoi Shatter v5.0) y la defensa láser de la cúpula.',
    wave: 'Oleada',
    phase: 'Fase',
    domeHp: 'Casco del Domo',
    iron: 'Hierro',
    cobalt: 'Cobalto',
    presetBtn: '⚡ Preajuste Pozo Reliquia',
    triggerWaveBtn: '🚨 Iniciar Oleada',
    resetBtn: 'Nueva Expedición',
    shareBtn: 'Compartir Informe',
    copied: '¡Copiado!',
    upgradesTitle: 'Taller de Ingeniería del Domo',
    mineTitle: 'Estrato Subterráneo (Haz clic en un bloque adyacente para perforar)',
    defenseTitle: 'Asalto Alienígena (Haz clic en un invasor para disparar)',
  },
};

export default function DomeKeeper({ locale = 'ko' }: Props) {
  const t = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });
  const [state, setState] = useState<DomeKeeperState>(() => createInitialDomeKeeperState(20261026));
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ensureAudio = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) audioRef.current = new Ctx();
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    if (state.status === 'won') {
      try {
        const dateKey = new Date().toISOString().slice(0, 10);
        const current = loadArcadePassProgress(dateKey);
        const updated = reportMissionProgress(
          current,
          { gameSlug: 'dome-keeper', metric: 'relic_extracted', delta: 1 },
          dateKey
        );
        saveArcadePassProgress(updated);
      } catch {
        // ignore storage errors
      }
      recordResult('dome-keeper', 'w');
    }
  }, [state.status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Alien planet twilight sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0f172a');
    sky.addColorStop(0.65, '#1e1b4b');
    sky.addColorStop(1, '#312e81');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const groundY = h - 32;
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, groundY, w, 32);

    // Glass Dome at center
    const domeX = w / 2;
    const domeR = 54;
    ctx.save();
    ctx.beginPath();
    ctx.arc(domeX, groundY, domeR, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = state.domeShield > 0 ? '#38bdf8' : '#94a3b8';
    ctx.stroke();

    // Rotating Laser Turret along dome arc
    const rad = (state.turretAngleDeg * Math.PI) / 180;
    const tx = domeX - Math.cos(rad) * (domeR + 14);
    const ty = groundY - Math.sin(rad) * (domeR + 14);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(domeX, groundY - 12);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    // Draw invaders during defense phase
    for (const inv of state.invaders) {
      const iRad = (inv.angleDeg * Math.PI) / 180;
      const distPx = domeR + 18 + inv.distance * 1.1;
      const ix = domeX - Math.cos(iRad) * distPx;
      const iy = groundY - Math.sin(iRad) * distPx * 0.65;

      ctx.fillStyle = inv.isBoss ? '#ef4444' : '#a855f7';
      ctx.beginPath();
      ctx.arc(ix, iy, inv.isBoss ? 14 : 10, 0, Math.PI * 2);
      ctx.fill();

      // Laser beam to currently targeted angle
      if (Math.abs(inv.angleDeg - state.turretAngleDeg) < 5) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(ix, iy);
        ctx.stroke();
      }
    }

    // Draw Engine v5.0 Voronoi Shatter Shards
    for (const shard of state.recentShards) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect((shard.x % (w - 40)) + 20, groundY - 8, 5, 5);
    }

    ctx.restore();
  }, [state]);

  const onDrillTile = (row: number, col: number) => {
    triggerHaptic('medium');
    playSyntheticTone(ensureAudio(), { freq: 240 + row * 35, duration: 0.1, type: 'sawtooth', gain: 0.12 });
    setState((prev) => drillMineCell(prev, row, col));
  };

  const onFireLaser = (invaderId: string) => {
    triggerHaptic('heavy');
    playSyntheticTone(ensureAudio(), { freq: 680, duration: 0.14, type: 'square', gain: 0.15 });
    setState((prev) => fireDomeLaserAtInvader(prev, invaderId));
  };

  const onUpgrade = (kind: 'drill' | 'jetpack' | 'laser' | 'shield') => {
    triggerHaptic('light');
    playSyntheticTone(ensureAudio(), { freq: 520, duration: 0.12, type: 'triangle', gain: 0.14 });
    setState((prev) => upgradeDomeSystem(prev, kind));
  };

  const onPreset = () => {
    triggerHaptic('success');
    playSyntheticTone(ensureAudio(), { freq: 740, duration: 0.18, type: 'sine', gain: 0.15 });
    setState((prev) => applyRelicOverdrivePreset(prev));
  };

  const handleShare = async () => {
    const text = `🛡️ ${t.title}\nWave ${state.wave}/${state.maxWaves} | Blocks Mined: ${state.totalBlocksMined} | Aliens Repelled: ${state.totalAliensDefeated}\nhttps://game.oiyo.net/${locale === 'en' ? '' : `${locale}/`}dome-keeper`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className={`mx-auto max-w-4xl rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-xl md:p-6 ${
        isImmersive ? 'fixed inset-0 z-50 max-w-none overflow-y-auto rounded-none' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight md:text-2xl">{t.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPreset}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:opacity-90"
          >
            {t.presetBtn}
          </button>
          <button
            type="button"
            onClick={() => setState((prev) => startAlienWaveDefense(prev))}
            className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:opacity-90"
          >
            {t.triggerWaveBtn}
          </button>
          <button
            type="button"
            onClick={() => setState(createInitialDomeKeeperState(Date.now()))}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {t.resetBtn}
          </button>
          <button
            type="button"
            onClick={togglePortal}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {isImmersive ? portalLabels.exit : portalLabels.enter}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">{t.wave}</div>
          <div className="mt-0.5 text-lg font-black text-foreground">
            {state.wave} / {state.maxWaves}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">{t.phase}</div>
          <div className="mt-0.5 text-lg font-black uppercase text-primary">
            {state.phase} ({state.waveTimerSec}s)
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">{t.domeHp}</div>
          <div className="mt-0.5 text-lg font-black text-foreground">
            {state.domeHp}/{state.maxDomeHp} (+{state.domeShield})
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">{t.iron}</div>
          <div className="mt-0.5 text-lg font-black text-foreground">⛏️ {state.iron}</div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">{t.cobalt}</div>
          <div className="mt-0.5 text-lg font-black text-foreground">💎 {state.cobalt}</div>
        </div>
      </div>

      {/* Surface Dome Canvas */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
        <canvas ref={canvasRef} width={680} height={160} className="h-40 w-full object-cover" />
      </div>

      <div className="mt-3 rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs font-medium text-foreground">
        📡 {state.lastEvent}
      </div>

      {state.status !== 'playing' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary bg-primary/10 p-4">
          <div className="text-sm font-black text-foreground">
            {state.status === 'won' ? '🏆 VICTORY — Dome Colony & Ancient Relic Secured!' : '💥 DOME BREACHED — Try Again!'}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            {copied ? t.copied : t.shareBtn}
          </button>
        </div>
      )}

      {/* Defense Targets when in Defense Phase */}
      {state.phase === 'defense' && state.invaders.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <h2 className="text-sm font-black text-foreground">{t.defenseTitle}</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {state.invaders.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => onFireLaser(inv.id)}
                className="flex flex-col items-start justify-between rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-black text-foreground">
                    {inv.isBoss ? '👾 ' : '🦂 '}
                    {inv.name}
                  </span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono text-secondary-foreground">
                    {inv.angleDeg}°
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  HP: {inv.hp}/{inv.maxHp} · Dist: {inv.distance}m
                </div>
                <div className="mt-2 w-full rounded-lg bg-primary px-2.5 py-1 text-center text-xs font-bold text-primary-foreground">
                  🎯 Fire Laser ({22 + state.laserCannonLv * 14} DMG)
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Underground Mining Grid */}
      <div className="mt-4 rounded-2xl border border-border bg-background p-4">
        <h2 className="text-sm font-black text-foreground">{t.mineTitle}</h2>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {state.grid.map((row) =>
            row.map((cell) => {
              const reachable = isAdjacentToExcavated(state.grid, cell.row, cell.col);
              const isKeeper = state.keeperRow === cell.row && state.keeperCol === cell.col;
              const badge =
                cell.kind === 'empty'
                  ? isKeeper
                    ? '🧑‍🚀'
                    : '·'
                  : cell.kind === 'iron'
                  ? '⛏️ IRON'
                  : cell.kind === 'cobalt'
                  ? '💎 COB'
                  : cell.kind === 'relic'
                  ? '👑 RELIC'
                  : cell.kind === 'rock'
                  ? '🪨 ROCK'
                  : '🟫 DIRT';

              return (
                <button
                  key={`${cell.row}-${cell.col}`}
                  type="button"
                  disabled={cell.kind === 'empty' || state.phase !== 'mining'}
                  onClick={() => onDrillTile(cell.row, cell.col)}
                  className={`flex h-14 flex-col items-center justify-center rounded-xl border text-xs font-bold transition ${
                    cell.kind === 'empty'
                      ? 'border-border/40 bg-muted/30 text-muted-foreground'
                      : reachable
                      ? 'border-primary bg-card text-foreground hover:bg-secondary'
                      : 'border-border bg-secondary/40 text-muted-foreground opacity-65'
                  }`}
                >
                  <span>{badge}</span>
                  {cell.kind !== 'empty' && (
                    <span className="mt-0.5 font-mono text-xs text-muted-foreground">{cell.hp}hp</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Engineering Upgrades */}
      <div className="mt-4 rounded-2xl border border-border bg-background p-4">
        <h2 className="text-sm font-black text-foreground">{t.upgradesTitle}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => onUpgrade('drill')}
            className="rounded-xl border border-border bg-card p-2.5 text-left text-xs hover:border-primary"
          >
            <div className="font-bold text-foreground">⚙️ Plasma Drill Lv.{state.drillPowerLv}</div>
            <div className="mt-1 text-muted-foreground">Cost: {state.drillPowerLv * 4} Iron</div>
          </button>
          <button
            type="button"
            onClick={() => onUpgrade('jetpack')}
            className="rounded-xl border border-border bg-card p-2.5 text-left text-xs hover:border-primary"
          >
            <div className="font-bold text-foreground">🚀 Jetpack Lv.{state.jetpackLv}</div>
            <div className="mt-1 text-muted-foreground">Cost: {state.jetpackLv * 3} Iron</div>
          </button>
          <button
            type="button"
            onClick={() => onUpgrade('laser')}
            className="rounded-xl border border-border bg-card p-2.5 text-left text-xs hover:border-primary"
          >
            <div className="font-bold text-foreground">⚡ Dome Laser Lv.{state.laserCannonLv}</div>
            <div className="mt-1 text-muted-foreground">Cost: {state.laserCannonLv * 4} Iron</div>
          </button>
          <button
            type="button"
            onClick={() => onUpgrade('shield')}
            className="rounded-xl border border-border bg-card p-2.5 text-left text-xs hover:border-primary"
          >
            <div className="font-bold text-foreground">🛡️ Cobalt Shield Repair</div>
            <div className="mt-1 text-muted-foreground">Cost: 2 Cobalt (+30HP/+25Shd)</div>
          </button>
        </div>
      </div>
    </div>
  );
}
