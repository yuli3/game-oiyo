import { useEffect, useRef, useState } from 'react';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import {
  applyPresetGrandIsland,
  createTownscaperState,
  interactIslandCell,
  ISLAND_CHALLENGES,
  ISLAND_SIZE,
  PALETTE_SPECS,
  type ArchFeature,
  type PaletteKey,
  type TownscaperState,
} from '../../lib/games/townscaper-island';

interface Props {
  locale: string;
}

const FEATURE_BADGES: Record<ArchFeature, { icon: string; labelKo: string; labelEn: string }> = {
  water: { icon: '🌊', labelKo: '바다', labelEn: 'Water' },
  quay: { icon: '⚓', labelKo: '석조 부두', labelEn: 'Stone Quay' },
  cottage: { icon: '🏠', labelKo: '코티지', labelEn: 'Cottage' },
  'arch-bridge': { icon: '🌉', labelKo: '운하 아치교', labelEn: 'Arch Bridge' },
  'courtyard-garden': { icon: '🌳', labelKo: '중정 정원', labelEn: 'Garden' },
  'gabled-manor': { icon: '🏛️', labelKo: '박공 저택', labelEn: 'Manor' },
  lighthouse: { icon: '🚨', labelKo: '해안 등대', labelEn: 'Lighthouse' },
};

function playPopAudio(height: number) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 260 + Math.min(height, 8) * 45;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    setTimeout(() => ctx.close().catch(() => {}), 200);
  } catch {}
}

function TiltPaletteButton({
  isSelected,
  name,
  onSelect,
}: {
  isSelected: boolean;
  name: string;
  onSelect: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.15);
        MobileHapticsPro.light();
        onSelect();
      }}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition will-change-transform transform-(--card-tilt) ${
        isSelected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-foreground hover:bg-accent'
      }`}
    >
      🎨 {name}
    </button>
  );
}

export default function TownscaperIsland({ locale }: Props) {
  const isKo = locale === 'ko';
  const [state, setState] = useState<TownscaperState>(() => createTownscaperState());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const recordArcadePass = (blocks: number) => {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      const current = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(current, 'townscaper-island', blocks);
      saveArcadePassProgress(updated);
    } catch {
      // Safe fallback in SSR/test
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Mediterranean Sea backdrop
    const seaGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    seaGrad.addColorStop(0, '#0c4a6e');
    seaGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const originX = canvas.width / 2;
    const originY = 85;
    const tileW = 66;
    const tileH = 34;
    const floorH = 18;

    // Painter's algorithm back-to-front isometric traversal
    for (let r = 0; r < ISLAND_SIZE; r++) {
      for (let c = 0; c < ISLAND_SIZE; c++) {
        const cell = state.grid[r][c];
        const isoX = originX + (c - r) * (tileW / 2);
        const isoY = originY + (c + r) * (tileH / 2);

        // Draw water diamond base
        ctx.beginPath();
        ctx.moveTo(isoX, isoY);
        ctx.lineTo(isoX + tileW / 2, isoY + tileH / 2);
        ctx.lineTo(isoX, isoY + tileH);
        ctx.lineTo(isoX - tileW / 2, isoY + tileH / 2);
        ctx.closePath();
        ctx.fillStyle = cell.height > 0 ? '#cbd5e1' : 'rgba(56, 189, 248, 0.18)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (cell.height <= 0) continue;

        const spec = PALETTE_SPECS[cell.palette];

        // Stack stories from 1 to cell.height
        for (let h = 1; h <= cell.height; h++) {
          const baseY = isoY - (h - 1) * floorH;
          const topY = isoY - h * floorH;
          const isQuay = h === 1;

          // Arch Bridge leaves level 1 open for boats
          if (cell.feature === 'arch-bridge' && h === 1) {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(isoX, baseY + tileH / 2, 11, Math.PI, 0);
            ctx.stroke();
            continue;
          }

          // Left isometric wall
          ctx.beginPath();
          ctx.moveTo(isoX - tileW / 2, baseY + tileH / 2);
          ctx.lineTo(isoX, baseY + tileH);
          ctx.lineTo(isoX, topY + tileH);
          ctx.lineTo(isoX - tileW / 2, topY + tileH / 2);
          ctx.closePath();
          ctx.fillStyle = isQuay ? '#94a3b8' : spec.hexWall;
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Right isometric wall
          ctx.beginPath();
          ctx.moveTo(isoX + tileW / 2, baseY + tileH / 2);
          ctx.lineTo(isoX, baseY + tileH);
          ctx.lineTo(isoX, topY + tileH);
          ctx.lineTo(isoX + tileW / 2, topY + tileH / 2);
          ctx.closePath();
          ctx.fillStyle = isQuay ? '#64748b' : spec.hexWall;
          ctx.fill();
          ctx.stroke();

          // Top plate / Roof
          ctx.beginPath();
          ctx.moveTo(isoX, topY);
          ctx.lineTo(isoX + tileW / 2, topY + tileH / 2);
          ctx.lineTo(isoX, topY + tileH);
          ctx.lineTo(isoX - tileW / 2, topY + tileH / 2);
          ctx.closePath();
          ctx.fillStyle =
            cell.feature === 'courtyard-garden'
              ? '#10b981'
              : h === cell.height && h >= 2
                ? spec.hexRoof
                : '#e2e8f0';
          ctx.fill();
          ctx.stroke();
        }

        // Lighthouse beacon crown at height 5
        if (cell.feature === 'lighthouse') {
          const topY = isoY - cell.height * floorH;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(isoX, topY + 6, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [state]);

  const handleCellClick = (r: number, c: number, forceMode?: 'build' | 'demolish') => {
    const next = interactIslandCell(state, r, c, forceMode);
    const targetCell = next.grid[r][c];
    playPopAudio(targetCell.height);
    if (targetCell.feature !== 'water' && targetCell.feature !== 'quay') {
      MobileHapticsPro.impact();
    } else {
      MobileHapticsPro.light();
    }
    setState(next);
    recordArcadePass(next.totalBlocks);
  };

  const handleLoadPreset = () => {
    MobileHapticsPro.success();
    playPopAudio(5);
    const next = applyPresetGrandIsland(state);
    setState(next);
    recordArcadePass(next.totalBlocks);
  };

  return (
    <div className="mx-auto max-w-5xl p-4 text-foreground">
      {/* Top Header & Palette Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            🏝️ {isKo ? '타운스케이퍼 아일랜드 빌더' : 'Townscaper Island Builder'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isKo ? state.lastActionNoteKo : state.lastActionNoteEn}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            🧱 {isKo ? `총 블록: ${state.totalBlocks}개` : `Blocks: ${state.totalBlocks}`}
          </span>
          <button
            type="button"
            onClick={handleLoadPreset}
            className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-accent"
          >
            {isKo ? '✨ 산토리니 섬 프리셋' : '✨ Load Grand Island Preset'}
          </button>
          <button
            type="button"
            onClick={() => setState(createTownscaperState())}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            {isKo ? '초기화' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Palette & Mode Selector */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(PALETTE_SPECS) as PaletteKey[]).map((key) => {
            const spec = PALETTE_SPECS[key];
            const isSelected = state.selectedPalette === key && state.toolMode === 'build';
            return (
              <TiltPaletteButton
                key={key}
                isSelected={isSelected}
                name={isKo ? spec.nameKo : spec.nameEn}
                onSelect={() =>
                  setState((prev) => ({
                    ...prev,
                    selectedPalette: key,
                    toolMode: 'build',
                  }))
                }
              />
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, toolMode: 'build' }))}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
              state.toolMode === 'build'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground'
            }`}
          >
            🔼 {isKo ? '층 쌓기 (+1F)' : 'Stack (+1F)'}
          </button>
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, toolMode: 'demolish' }))}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
              state.toolMode === 'demolish'
                ? 'border-destructive bg-destructive text-destructive-foreground'
                : 'border-border bg-background text-foreground'
            }`}
          >
            🔽 {isKo ? '한 층 철거 (-1F)' : 'Remove (-1F)'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Isometric Diorama Viewport */}
        <div className="lg:col-span-7 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            {isKo ? '3D 아이소메트릭 해상 디오라마 뷰' : 'Isometric Coastal Diorama Viewport'}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <canvas
              ref={canvasRef}
              width={640}
              height={380}
              className="block h-auto w-full"
            />
          </div>

          {/* Architectural Challenges */}
          <div className="grid gap-2 sm:grid-cols-3">
            {ISLAND_CHALLENGES.map((ch) => {
              const done = state.completedChallenges.includes(ch.id);
              return (
                <div
                  key={ch.id}
                  className={`rounded-xl border p-2.5 text-xs ${
                    done
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="font-bold text-foreground">
                    {done ? '✅ ' : '⬜ '}
                    {isKo ? ch.titleKo : ch.titleEn}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {isKo ? ch.descKo : ch.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive 8x8 WFC Blueprint Pad */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              {isKo ? '📐 8×8 WFC 건축 그리드 패드' : '📐 8×8 WFC Architectural Pad'}
            </h3>
            <span className="text-xs text-muted-foreground">
              {isKo ? '클릭: 건설/철거' : 'Click to Stack/Demolish'}
            </span>
          </div>

          <div className="grid grid-cols-8 gap-1.5 rounded-xl border border-border bg-background p-2.5">
            {state.grid.flatMap((row) =>
              row.map((cell) => {
                const badge = FEATURE_BADGES[cell.feature];
                return (
                  <button
                    key={`${cell.row}-${cell.col}`}
                    type="button"
                    onClick={() => handleCellClick(cell.row, cell.col)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleCellClick(cell.row, cell.col, 'demolish');
                    }}
                    title={`${isKo ? badge.labelKo : badge.labelEn} (${cell.height}F)`}
                    className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-xs font-bold transition ${
                      cell.height > 0
                        ? 'border-primary bg-primary/15 text-foreground hover:bg-primary/25'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <span className="text-sm leading-none">{badge.icon}</span>
                    <span className="mt-0.5 text-xs">
                      {cell.height > 0 ? `${cell.height}F` : '·'}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-3 rounded-xl border border-border bg-secondary p-3 text-xs text-secondary-foreground">
            <div className="font-bold text-primary">
              {isKo ? '자동 건축 규칙 (WFC 문맥 감지)' : 'WFC Procedural Rules'}
            </div>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              <li>
                ⚓ <strong>1F:</strong>{' '}
                {isKo
                  ? '석조 부두 (4면이 건물로 둘러싸이면 🌳 중정 정원으로 변화)'
                  : 'Stone Quay (Turns into 🌳 Courtyard Garden if enclosed on 4 sides)'}
              </li>
              <li>
                🌉 <strong>2F~4F:</strong>{' '}
                {isKo
                  ? '양옆 건물을 가로지르면 자동으로 운하 아치교 형성'
                  : 'Forms a vaulted Canal Arch Bridge when spanning opposing neighbors'}
              </li>
              <li>
                🚨 <strong>5F:</strong>{' '}
                {isKo
                  ? '5층에 도달하면 회전 조명이 빛나는 해안 등대로 승격'
                  : 'Reaching 5F automatically crowns a glowing Coastal Lighthouse'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
