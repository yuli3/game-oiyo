import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addOrConnectBridgeNode,
  applyAutoTrussBlueprint,
  BRIDGE_LEVELS,
  type BridgeMaterial,
  createBridgeLevelState,
  type PolyBridgeState,
  resetBridgeToBuild,
  startBridgeSimulation,
  stepBridgePhysics,
} from '../../lib/games/poly-bridge';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';

interface PolyBridgeProps {
  lang?: string;
}

type LocaleCode = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr';

const COPY: Record<
  LocaleCode,
  {
    title: string;
    subtitle: string;
    budgetLabel: string;
    stressLabel: string;
    roadTool: string;
    woodTool: string;
    steelTool: string;
    blueprintBtn: string;
    clearBtn: string;
    simulateBtn: string;
    editBtn: string;
    nextLevelBtn: string;
    hintText: string;
    victoryTitle: string;
    victoryDesc: string;
    collapseTitle: string;
    collapseDesc: string;
    levels: Record<string, string>;
  }
> = {
  ko: {
    title: '폴리 브릿지 트러스 물리',
    subtitle: '예산($) 안에서 도로·목재 트러스·강철 케이블을 삼각형 구조로 설계해 중장비 트럭을 도하시키세요',
    budgetLabel: '예산',
    stressLabel: '최대 응력',
    roadTool: '🛣️ 도로 상판 ($110)',
    woodTool: '🪵 목재 트러스 ($65)',
    steelTool: '⛓️ 강철 케이블 ($140)',
    blueprintBtn: '📐 표준 트러스 설계도',
    clearBtn: '🗑️ 초기화',
    simulateBtn: '🚛 주행 테스트 시작',
    editBtn: '🔧 설계 수정',
    nextLevelBtn: '다음 협곡 →',
    hintText: '붉은색 고정 앵커(●)를 클릭한 뒤 빈 격자나 다른 노드를 클릭해 빔을 연결하세요 (⚡표준 트러스 설계도로 즉시 테스트 가능)',
    victoryTitle: '교량 도하 테스트 통과!',
    victoryDesc: '트러스 구조가 중장비 하중을 견뎌내고 트럭이 무사히 강을 건넜습니다!',
    collapseTitle: '교량 붕괴!',
    collapseDesc: '한계 응력(100%)을 초과하여 부재가 파단되었거나 상판이 끊어졌습니다.',
    levels: {
      pine_creek: '1단계: 파인 크리크 협곡',
      twin_canyon: '2단계: 중앙 교각 협곡',
      suspension_abyss: '3단계: 현수교 대협곡',
    },
  },
  en: {
    title: 'Poly Bridge Truss Architect',
    subtitle: 'Design triangular Road, Wood Truss, and Steel Cable structures within budget so the heavy truck crosses safely',
    budgetLabel: 'Budget',
    stressLabel: 'Peak Stress',
    roadTool: '🛣️ Road Deck ($110)',
    woodTool: '🪵 Wood Truss ($65)',
    steelTool: '⛓️ Steel Cable ($140)',
    blueprintBtn: '📐 Auto-Truss Blueprint',
    clearBtn: '🗑️ Clear',
    simulateBtn: '🚛 Start Stress Test',
    editBtn: '🔧 Edit Bridge',
    nextLevelBtn: 'Next Gorge →',
    hintText: 'Click a red anchor pin (●) then click empty grid space or another joint to build a beam (or load Auto-Truss Blueprint)',
    victoryTitle: 'Bridge Crossing Successful!',
    victoryDesc: 'Your truss structure distributed the load and carried the truck across!',
    collapseTitle: 'Structural Collapse!',
    collapseDesc: 'A beam exceeded 100% tensile/compressive stress or the road deck had a gap.',
    levels: {
      pine_creek: 'Stage 1: Pine Creek Crossing',
      twin_canyon: 'Stage 2: Central Pier Canyon',
      suspension_abyss: 'Stage 3: Suspension Abyss',
    },
  },
  ja: {
    title: 'ポリブリッジ トラス物理',
    subtitle: '予算($)内で道路・木製トラス・鋼鉄ケーブルを三角形に組み、大型トラックを渡らせよう',
    budgetLabel: '予算',
    stressLabel: '最大応力',
    roadTool: '🛣️ 道路デッキ ($110)',
    woodTool: '🪵 木製トラス ($65)',
    steelTool: '⛓️ 鋼鉄ケーブル ($140)',
    blueprintBtn: '📐 標準トラス設計図',
    clearBtn: '🗑️ クリア',
    simulateBtn: '🚛 走行テスト開始',
    editBtn: '🔧 設計に戻る',
    nextLevelBtn: '次の渓谷へ →',
    hintText: '赤い固定ピン(●)をクリックしてから別の地点をクリックして梁を接続（📐標準トラス設計図で即時テスト可能）',
    victoryTitle: '橋梁テスト合格！',
    victoryDesc: 'トラス構造が荷重に耐え抜き、トラックが無事に対岸へ到達しました！',
    collapseTitle: '橋梁崩落！',
    collapseDesc: '許容応力(100%)を超えて部材が破断したか、道路が途切れています。',
    levels: {
      pine_creek: 'ステージ1: パインクリーク渓谷',
      twin_canyon: 'ステージ2: 中央橋脚キャニオン',
      suspension_abyss: 'ステージ3: 吊り橋アビス',
    },
  },
  zh: {
    title: '建桥专家：桁架物理',
    subtitle: '在预算($)内运用道路、木材桁架与钢索构建三角形力学结构，护送重卡安全过江',
    budgetLabel: '预算',
    stressLabel: '峰值应力',
    roadTool: '🛣️ 公路桥面 ($110)',
    woodTool: '🪵 木材桁架 ($65)',
    steelTool: '⛓️ 钢索横梁 ($140)',
    blueprintBtn: '📐 一键标准桁架蓝图',
    clearBtn: '🗑️ 清空重造',
    simulateBtn: '🚛 开始通车测试',
    editBtn: '🔧 修改设计',
    nextLevelBtn: '下一峡谷 →',
    hintText: '先点击红色固定锚点(●)，再点击网格空白处或其他节点架设构件（或点击📐一键标准桁架蓝图）',
    victoryTitle: '通车抗压测试成功！',
    victoryDesc: '你的三角形桁架完美分散了重力载荷，重型卡车顺利抵达对岸！',
    collapseTitle: '桥梁坍塌！',
    collapseDesc: '构件应力超过 100% 发生断裂，或路面未完全连通。',
    levels: {
      pine_creek: '第1关：松溪浅谷',
      twin_canyon: '第2关：中墩双峡',
      suspension_abyss: '第3关：悬索深渊',
    },
  },
  es: {
    title: 'Poly Bridge Truss Architect',
    subtitle: 'Diseña estructuras triangulares de Carretera, Madera y Acero dentro del presupuesto para cruzar el camión',
    budgetLabel: 'Presupuesto',
    stressLabel: 'Tensión Máx',
    roadTool: '🛣️ Carretera ($110)',
    woodTool: '🪵 Cercha Madera ($65)',
    steelTool: '⛓️ Cable Acero ($140)',
    blueprintBtn: '📐 Plano Auto-Cercha',
    clearBtn: '🗑️ Limpiar',
    simulateBtn: '🚛 Probar Puente',
    editBtn: '🔧 Editar Puente',
    nextLevelBtn: 'Siguiente Cañón →',
    hintText: 'Haz clic en un anclaje rojo (●) y luego en otro punto para conectar vigas',
    victoryTitle: '¡Cruce Completado!',
    victoryDesc: '¡Tu puente resistió la carga y el camión llegó a la meta!',
    collapseTitle: '¡Colapso Estructural!',
    collapseDesc: 'Una viga superó el 100% de tensión o faltaba pavimento.',
    levels: {
      pine_creek: 'Nivel 1: Arroyo del Pino',
      twin_canyon: 'Nivel 2: Cañón del Pilar Central',
      suspension_abyss: 'Nivel 3: Abismo Colgante',
    },
  },
  fr: {
    title: 'Poly Bridge Truss Architect',
    subtitle: 'Concevez des treillis triangulaires en Route, Bois et Acier dans le budget imparti pour faire traverser le camion',
    budgetLabel: 'Budget',
    stressLabel: 'Tension Max',
    roadTool: '🛣️ Tablier Route ($110)',
    woodTool: '🪵 Treillis Bois ($65)',
    steelTool: '⛓️ Câble Acier ($140)',
    blueprintBtn: '📐 Plan Treillis Auto',
    clearBtn: '🗑️ Effacer',
    simulateBtn: '🚛 Tester le Pont',
    editBtn: '🔧 Modifier',
    nextLevelBtn: 'Gorge Suivante →',
    hintText: 'Cliquez sur une ancre rouge (●) puis sur un autre point pour relier une poutre',
    victoryTitle: 'Traversée Réussie !',
    victoryDesc: 'Votre structure en treillis a supporté la charge du camion !',
    collapseTitle: 'Effondrement du Pont !',
    collapseDesc: 'Une poutre a dépassé 100% de contrainte ou le tablier est interrompu.',
    levels: {
      pine_creek: 'Niveau 1 : Ruisseau des Pins',
      twin_canyon: 'Niveau 2 : Canyon au Pilier Central',
      suspension_abyss: 'Niveau 3 : Abîme Suspendu',
    },
  },
};

function resolveLocale(lang?: string): LocaleCode {
  const code = (lang || 'ko').slice(0, 2).toLowerCase() as LocaleCode;
  return COPY[code] ? code : 'ko';
}

export default function PolyBridge({ lang = 'ko' }: PolyBridgeProps) {
  const locale = resolveLocale(lang);
  const t = COPY[locale];

  const [state, setState] = useState<PolyBridgeState>(() =>
    applyAutoTrussBlueprint(createBridgeLevelState(0))
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = useCallback((kind: 'build' | 'snap' | 'victory') => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (kind === 'build') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (kind === 'snap') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.start(now);
        osc.stop(now + 0.19);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.09);
        osc.frequency.setValueAtTime(783.99, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
        osc.start(now);
        osc.stop(now + 0.37);
      }
    } catch {
      // Ignore audio errors
    }
  }, []);

  // 60fps Verlet Physics & Blueprint Renderer
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;

      if (stateRef.current.phase === 'simulating') {
        setState((prev) => {
          const next = stepBridgePhysics(prev, dt);
          if (next.brokenBeamsCount > prev.brokenBeamsCount) {
            playSfx('snap');
          }
          if (next.phase === 'victory' && prev.phase !== 'victory') {
            playSfx('victory');
            const dateKey = new Date().toISOString().slice(0, 10);
            const progress = loadArcadePassProgress(dateKey);
            saveArcadePassProgress(
              reportMissionProgress(progress, 'poly-bridge', next.levelsCleared)
            );
          }
          return next;
        });
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cur = stateRef.current;
          const lvl = BRIDGE_LEVELS[cur.levelIndex];
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Sky & Blueprint Grid
          const sky = ctx.createLinearGradient(0, 0, 0, h);
          sky.addColorStop(0, '#0f172a');
          sky.addColorStop(1, '#1e293b');
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, w, h);

          if (cur.phase === 'build') {
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < w; gx += 20) {
              ctx.beginPath();
              ctx.moveTo(gx, 0);
              ctx.lineTo(gx, h);
              ctx.stroke();
            }
            for (let gy = 0; gy < h; gy += 20) {
              ctx.beginPath();
              ctx.moveTo(0, gy);
              ctx.lineTo(w, gy);
              ctx.stroke();
            }
          }

          // River water at bottom
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(lvl.leftBankX, 285, lvl.rightBankX - lvl.leftBankX, h - 285);

          // Left & Right Gorge Cliffs
          ctx.fillStyle = '#334155';
          ctx.fillRect(0, lvl.deckY, lvl.leftBankX, h - lvl.deckY);
          ctx.fillRect(lvl.rightBankX, lvl.deckY, w - lvl.rightBankX, h - lvl.deckY);

          // Grass top on banks
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(0, lvl.deckY - 6, lvl.leftBankX, 8);
          ctx.fillRect(lvl.rightBankX, lvl.deckY - 6, w - lvl.rightBankX, 8);

          // Goal Flag on Right Bank
          ctx.fillStyle = '#facc15';
          ctx.fillRect(lvl.rightBankX + 60, lvl.deckY - 42, 4, 42);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(lvl.rightBankX + 64, lvl.deckY - 42);
          ctx.lineTo(lvl.rightBankX + 92, lvl.deckY - 32);
          ctx.lineTo(lvl.rightBankX + 64, lvl.deckY - 22);
          ctx.closePath();
          ctx.fill();

          // Map nodes by id
          const nodeMap = new Map<number, (typeof cur.nodes)[0]>();
          for (const n of cur.nodes) nodeMap.set(n.id, n);

          // Draw Beams with Stress Color Heatmap (Green 0% -> Yellow 50% -> Red 100%)
          for (const b of cur.beams) {
            if (b.broken) continue;
            const na = nodeMap.get(b.nodeA);
            const nb = nodeMap.get(b.nodeB);
            if (!na || !nb) continue;

            if (cur.phase === 'simulating') {
              const s = Math.min(1, b.stressRatio);
              const r = Math.round(34 + s * 205);
              const g = Math.round(197 - s * 145);
              ctx.strokeStyle = `rgb(${r}, ${g}, 60)`;
            } else {
              ctx.strokeStyle =
                b.material === 'road'
                  ? '#e2e8f0'
                  : b.material === 'wood'
                    ? '#f59e0b'
                    : '#38bdf8';
            }

            ctx.lineWidth = b.material === 'road' ? 7 : b.material === 'steel' ? 4.5 : 4;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
          }

          // Draw Nodes / Anchor Pins
          for (const n of cur.nodes) {
            const isSelected = cur.selectedNodeId === n.id;
            ctx.fillStyle = n.pinned
              ? '#ef4444'
              : isSelected
                ? '#38bdf8'
                : '#f8fafc';
            ctx.beginPath();
            ctx.arc(n.x, n.y, isSelected ? 8 : n.pinned ? 6.5 : 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Draw Heavy Cargo Truck
          ctx.save();
          ctx.translate(cur.truck.x, cur.truck.y - 14);
          ctx.rotate(cur.truck.angle);
          // Truck cargo body
          ctx.fillStyle = '#f97316';
          ctx.fillRect(-26, -18, 36, 20);
          // Cab
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(10, -13, 14, 15);
          // Wheels
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(-16, 4, 6, 0, Math.PI * 2);
          ctx.arc(14, 4, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [playSfx]);

  const handleCanvasClick = (clientX: number, clientY: number) => {
    if (state.phase !== 'build') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    playSfx('build');
    setState((prev) => addOrConnectBridgeNode(prev, x, y));
  };

  const lvl = BRIDGE_LEVELS[state.levelIndex];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">🌉 {t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            {t.levels[lvl.nameKey]}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            💰 {t.budgetLabel}: ${state.spent} / ${state.budget}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            📈 {t.stressLabel}: {Math.round(state.maxStressPeak * 100)}%
          </span>
        </div>
      </div>

      {/* Material & Simulation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'road', label: t.roadTool },
              { id: 'wood', label: t.woodTool },
              { id: 'steel', label: t.steelTool },
            ] as Array<{ id: BridgeMaterial; label: string }>
          ).map((mat) => (
            <button
              key={mat.id}
              type="button"
              disabled={state.phase !== 'build'}
              onClick={() =>
                setState((prev) => ({ ...prev, selectedMaterial: mat.id }))
              }
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                state.selectedMaterial === mat.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-accent'
              }`}
            >
              {mat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playSfx('build');
              setState((prev) => applyAutoTrussBlueprint(prev));
            }}
            className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:opacity-90"
          >
            {t.blueprintBtn}
          </button>
          <button
            type="button"
            onClick={() =>
              setState((prev) =>
                createBridgeLevelState(prev.levelIndex, prev.levelsCleared)
              )
            }
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            {t.clearBtn}
          </button>
          {state.phase === 'build' ? (
            <button
              type="button"
              onClick={() => setState((prev) => startBridgeSimulation(prev))}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              {t.simulateBtn}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setState((prev) => resetBridgeToBuild(prev))}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              {t.editBtn}
            </button>
          )}
        </div>
      </div>

      {/* Bridge Blueprint & Physics Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-background">
        <canvas
          ref={canvasRef}
          width={760}
          height={340}
          onPointerDown={(e) => handleCanvasClick(e.clientX, e.clientY)}
          className="block h-auto w-full cursor-crosshair touch-none select-none"
        />

        {(state.phase === 'victory' || state.phase === 'collapsed') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 p-6 text-center backdrop-blur-xs">
            <h3 className="text-xl font-bold">
              {state.phase === 'victory'
                ? `🏆 ${t.victoryTitle}`
                : `💥 ${t.collapseTitle}`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {state.phase === 'victory' ? t.victoryDesc : t.collapseDesc}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setState((prev) => resetBridgeToBuild(prev))}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-accent"
              >
                {t.editBtn}
              </button>
              {state.phase === 'victory' && (
                <button
                  type="button"
                  onClick={() =>
                    setState((prev) =>
                      applyAutoTrussBlueprint(
                        createBridgeLevelState(
                          (prev.levelIndex + 1) % BRIDGE_LEVELS.length,
                          prev.levelsCleared
                        )
                      )
                    )
                  }
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm"
                >
                  {t.nextLevelBtn}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t.hintText}</p>
    </div>
  );
}
