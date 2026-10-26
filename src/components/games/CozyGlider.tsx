import { useEffect, useRef, useState } from 'react';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import {
  applyGoldenFeatherPackPreset,
  createCozyGliderState,
  getNodeById,
  ISLAND_TRAIL_NODES,
  moveOrGlideToNode,
  restAtCampfire,
  type CozyGliderState,
  type LandmarkType,
} from '../../lib/games/cozy-glider';

interface Props {
  locale: string;
}

const LANDMARK_ICONS: Record<LandmarkType, string> = {
  'beach-camp': '🏖️',
  'feather-chest': '🎁',
  'thermal-updraft': '🌪️',
  'cliff-wall': '🧗',
  'lookout-camp': '🔥',
  'hawk-summit': '🏔️',
};

export default function CozyGlider({ locale }: Props) {
  const isKo = locale === 'ko';
  const [state, setState] = useState<CozyGliderState>(() =>
    createCozyGliderState()
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const recordArcadePass = (summits: number) => {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      const current = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(current, 'cozy-glider', summits);
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

    // Draw Autumn Sunset Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.55, '#1e3a8a');
    skyGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Hawk Peak silhouette polygon
    ctx.beginPath();
    ctx.moveTo(40, 340);
    ctx.lineTo(190, 225);
    ctx.lineTo(355, 115);
    ctx.lineTo(500, 130);
    ctx.lineTo(665, 48);
    ctx.lineTo(750, 340);
    ctx.closePath();
    ctx.fillStyle = '#334155';
    ctx.fill();

    // Snowcap peak
    ctx.beginPath();
    ctx.moveTo(575, 100);
    ctx.lineTo(665, 48);
    ctx.lineTo(710, 145);
    ctx.closePath();
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    const currentNode = getNodeById(state.currentNodeId);

    // Draw Climbing & Gliding Routes
    for (const node of ISLAND_TRAIL_NODES) {
      for (const connId of node.connectedTo) {
        const target = getNodeById(connId);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    }

    // Highlight Glide trajectories from current node
    for (const glideId of currentNode.glideTargets) {
      const target = getNodeById(glideId);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(currentNode.x, currentNode.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Nodes
    for (const node of ISLAND_TRAIL_NODES) {
      const isCurrent = node.id === state.currentNodeId;
      const isVisited = state.visitedNodeIds.includes(node.id);

      ctx.beginPath();
      ctx.arc(node.x, node.y, isCurrent ? 16 : 12, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent
        ? '#facc15'
        : isVisited
          ? '#10b981'
          : '#e2e8f0';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isKo ? node.nameKo.split(' ')[0] : node.nameEn.split(' ')[0],
        node.x,
        node.y - 20
      );
    }
  }, [state, isKo]);

  const handleMove = (targetId: string) => {
    const next = moveOrGlideToNode(state, targetId);
    setState(next);
    if (next.status === 'summit-reached') {
      recordArcadePass(1);
    }
  };

  const currentNode = getNodeById(state.currentNodeId);

  return (
    <div className="mx-auto max-w-5xl p-4 text-foreground">
      {/* Top Feather Stamina & Elevation HUD */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '황금 깃털 스태미나 (활성 / 최대)' : 'Golden Feathers (Active / Max)'}
            </div>
            <div className="text-lg font-extrabold text-primary">
              {'🪶'.repeat(state.activeFeathers)}
              {'▫️'.repeat(Math.max(0, state.maxFeathers - state.activeFeathers))}{' '}
              <span className="ml-1 text-sm text-foreground">
                ({state.activeFeathers} / {state.maxFeathers})
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '현재 고도 / 수집한 조개껍질' : 'Elevation / Seashells'}
            </div>
            <div className="text-lg font-bold text-foreground">
              ⛰️ {isKo ? `${state.elevation}단 고도` : `Tier ${state.elevation}`} · 🐚{' '}
              {state.shellsCollected}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setState(restAtCampfire(state))}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent"
          >
            🔥 {isKo ? '깃털 숨고르기 충전' : 'Recharge Feathers'}
          </button>
          <button
            type="button"
            onClick={() => setState(applyGoldenFeatherPackPreset(state))}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent"
          >
            {isKo ? '⚡ 황금 깃털 6개 + 능선 캠프 이동' : '⚡ 6 Feathers + Ridge Camp'}
          </button>
          <button
            type="button"
            onClick={() => setState(createCozyGliderState())}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            {isKo ? '새 하이킹' : 'New Hike'}
          </button>
        </div>
      </div>

      {/* Summit Reached Banner */}
      {state.status === 'summit-reached' && (
        <div className="mb-4 rounded-2xl border border-primary bg-primary/10 p-4 text-center">
          <h3 className="text-lg font-extrabold text-primary">
            {isKo
              ? '🏆 호크 피크 정상 전망대(550m) 등정 성공! 아래 해변으로 장거리 활공을 즐겨보세요!'
              : '🏆 Hawk Peak Summit (550m) Reached! Enjoy a long scenic glide back down to the beach!'}
          </h3>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Mountain Trail & Glider Viewport */}
        <div className="lg:col-span-7 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {isKo ? '🏔️ 호크 피크 다층 등반 & 활공 루트' : '🏔️ Hawk Peak Trail & Glide Map'}
            </span>
            <span className="text-xs text-muted-foreground">
              {isKo ? `현재 위치: ${currentNode.nameKo}` : `Location: ${currentNode.nameEn}`}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <canvas
              ref={canvasRef}
              width={760}
              height={350}
              className="block h-auto w-full"
            />
          </div>

          <p className="rounded-xl border border-border bg-secondary p-3 text-xs text-secondary-foreground">
            {isKo ? state.logKo : state.logEn}
          </p>
        </div>

        {/* Right Column: Climb & Glide Action Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-foreground">
              🧗 {isKo ? '연결된 등반·이동 코스' : 'Connected Trail & Climb Routes'}
            </h3>
            <div className="space-y-2">
              {currentNode.connectedTo.map((targetId) => {
                const target = getNodeById(targetId);
                const climbingUp = target.elevation > currentNode.elevation;
                const firstVisit = !state.claimedChestIds.includes(target.id);
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => handleMove(target.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary hover:bg-accent"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {LANDMARK_ICONS[target.type]}{' '}
                        {isKo ? target.nameKo : target.nameEn}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {climbingUp
                          ? isKo
                            ? `등반 요구: 🪶×${target.featherCostToClimb}`
                            : `Climb Cost: 🪶×${target.featherCostToClimb}`
                          : isKo
                            ? '하산/평지 이동 (깃털 100% 회복)'
                            : 'Descend / Trail (Recharges Feathers)'}
                        {firstVisit && target.featherReward > 0
                          ? isKo
                            ? ` · 첫 방문 보상: +🪶${target.featherReward}`
                            : ` · First Visit: +🪶${target.featherReward}`
                          : ''}
                      </div>
                    </div>
                    <span className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                      {climbingUp ? (isKo ? '등반' : 'Climb') : isKo ? '이동' : 'Hike'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {currentNode.glideTargets.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-primary">
                🪂 {isKo ? '활공 비행 (Glide Down & 스태미나 완충)' : 'Wingsuit Glide Targets (Recharge)'}
              </h3>
              <div className="space-y-2">
                {currentNode.glideTargets.map((glideId) => {
                  const target = getNodeById(glideId);
                  return (
                    <button
                      key={`glide-${target.id}`}
                      type="button"
                      onClick={() => handleMove(target.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary p-2.5 text-left transition hover:bg-accent"
                    >
                      <span className="text-xs font-bold text-secondary-foreground">
                        🪂 {isKo ? target.nameKo : target.nameEn}
                      </span>
                      <span className="text-xs font-semibold text-primary">
                        {isKo ? '활공 착륙 → 🪶완충' : 'Glide & Recharge'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
