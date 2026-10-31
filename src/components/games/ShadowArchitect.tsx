import { lazy, useEffect, useRef, useState, useCallback } from "react";
import { Share2, Check } from "lucide-react";
import { useCelebration } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import { GameContainer } from "../ui/game/GamePrimitives";
import { Lazy3DStage } from "../ui/game/Lazy3DStage";
import {
  getBestForConditions,
  recordAchievementEvent,
  recordBestForConditions,
} from "../../lib/games/records";
import {
  SHADOW_WALL_HEIGHT,
  SHADOW_WALL_WIDTH,
  createShadowArchitect,
  isShadowComplete,
  selectShadowBlock,
  shadowArchitectScore,
  shadowMatch,
  shadowCells,
  targetShadow,
  transformShadowBlock,
  type ShadowBlockId,
} from "../../lib/games/shadow-architect";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
const Scene=lazy(()=>import("./ShadowArchitectScene"));const BLOCKS=["I","L","—","T","S"];

function playShadowAudio(type: 'select' | 'move' | 'rotate' | 'complete') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'select') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'rotate') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'complete') {
      [261.63, 329.63, 392.0, 523.25, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.4);
      });
    }
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {}
}

function TiltShadowBlockButton({
  name,
  isSelected,
  onClick,
}: {
  name: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

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
        triggerPop(0.12);
        onClick();
      }}
      aria-pressed={isSelected}
      className={`rounded-xl border p-3 font-black transition will-change-transform transform-(--card-tilt) ${
        isSelected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-card-foreground hover:bg-accent"
      }`}
    >
      {name}
    </button>
  );
}
const COPY={
ko:{title:"그림자 건축가",sub:"입체를 쌓아 벽의 실루엣을 완성하세요",enter:"빛의 작업실 열기",target:"목표 그림자",current:"현재 그림자",match:"일치율",moves:"조작",best:"최고",rotate:"회전",left:"왼쪽",right:"오른쪽",up:"위",down:"아래",front:"앞층",back:"뒷층",reset:"설계 초기화",next:"다음 실루엣",done:"빛과 구조가 정확히 맞았어요",hint:"블록을 고르고 이동·회전하세요. 깊이는 벽 그림자에 보이지 않아 같은 실루엣을 여러 구조로 만들 수 있어요.",fallback:"이 기기에서는 2D 그림자 설계도로 플레이합니다."},
en:{title:"Shadow Architect",sub:"Build in 3D to complete the silhouette on the wall",enter:"Open the light studio",target:"Target shadow",current:"Current shadow",match:"Match",moves:"Moves",best:"Best",rotate:"Rotate",left:"Left",right:"Right",up:"Up",down:"Down",front:"Front layer",back:"Back layer",reset:"Reset design",next:"Next silhouette",done:"Light and structure align",hint:"Select a block, then move and rotate it. Depth is hidden in the wall shadow, so many structures can make the same silhouette.",fallback:"Play from the 2D shadow plan on this device."},
ja:{title:"影の建築家",sub:"立体を組み、壁のシルエットを完成させよう",enter:"光の工房を開く",target:"目標の影",current:"現在の影",match:"一致率",moves:"操作",best:"最高",rotate:"回転",left:"左",right:"右",up:"上",down:"下",front:"手前層",back:"奥層",reset:"設計を初期化",next:"次の影",done:"光と構造が一致しました",hint:"ブロックを選び、移動・回転します。奥行きは壁の影に映らないため、同じ影を複数の構造で作れます。",fallback:"この端末では2Dの影設計図で遊べます。"},
zh:{title:"影子建筑师",sub:"搭建立体结构，完成墙上的剪影",enter:"打开光影工坊",target:"目标影子",current:"当前影子",match:"匹配度",moves:"操作",best:"最佳",rotate:"旋转",left:"左",right:"右",up:"上",down:"下",front:"前层",back:"后层",reset:"重置设计",next:"下一剪影",done:"光线与结构完全吻合",hint:"选择方块后移动或旋转。深度不会显示在墙影中，因此多种结构可以形成同一剪影。",fallback:"此设备可使用二维影子蓝图游玩。"},
fr:{title:"Architecte des ombres",sub:"Construisez en 3D pour achever la silhouette murale",enter:"Ouvrir l'atelier de lumière",target:"Ombre cible",current:"Ombre actuelle",match:"Accord",moves:"Actions",best:"Record",rotate:"Tourner",left:"Gauche",right:"Droite",up:"Haut",down:"Bas",front:"Plan avant",back:"Plan arrière",reset:"Réinitialiser",next:"Silhouette suivante",done:"La lumière et la structure s'alignent",hint:"Choisissez un bloc, puis déplacez-le et tournez-le. La profondeur disparaît dans l'ombre, donc plusieurs structures donnent la même silhouette.",fallback:"Sur cet appareil, jouez avec le plan d'ombre 2D."},
es:{title:"Arquitecto de sombras",sub:"Construye en 3D para completar la silueta del muro",enter:"Abrir el taller de luz",target:"Sombra objetivo",current:"Sombra actual",match:"Coincidencia",moves:"Movimientos",best:"Mejor",rotate:"Girar",left:"Izquierda",right:"Derecha",up:"Arriba",down:"Abajo",front:"Capa frontal",back:"Capa trasera",reset:"Reiniciar diseño",next:"Siguiente silueta",done:"La luz y la estructura coinciden",hint:"Elige un bloque, muévelo y gíralo. La profundidad no aparece en la sombra, así que varias estructuras pueden crear la misma silueta.",fallback:"En este dispositivo puedes jugar con el plano de sombras 2D."}
}as const;
function ShadowGrid({cells,label,tone}:{cells:readonly string[];label:string;tone:"target"|"current"}){const set=new Set(cells);return <div><p className="mb-2 text-center text-xs font-bold uppercase tracking-wider">{label}</p><div className="grid gap-1 rounded-xl bg-[#20251d] p-2" style={{gridTemplateColumns:`repeat(${SHADOW_WALL_WIDTH},1fr)`}}>{Array.from({length:SHADOW_WALL_WIDTH*SHADOW_WALL_HEIGHT},(_,i)=>{const x=i%SHADOW_WALL_WIDTH,y=SHADOW_WALL_HEIGHT-1-Math.floor(i/SHADOW_WALL_WIDTH),on=set.has(`${x},${y}`);return <span key={i} className={`aspect-square rounded-sm border ${on?(tone==="target"?"border-[#f1dfa5] bg-[#d9b95f]":"border-[#bde1d0] bg-[#5f947c]"):"border-white/5 bg-black/20"}`}/>})}</div></div>}
export default function ShadowArchitect({ locale = "ko" }: { locale?: string }) {
  const { ref: stageRef, celebrate: celebrateStage } = useCelebration();
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [state, setState] = useState(() => createShadowArchitect(0));
  const [active, setActive] = useState(false);
  const [best, setBest] = useState(0);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const celebrated = useRef(false);
  const match = shadowMatch(state);
  const complete = isShadowComplete(state);
  const conditions = { seed: String(state.puzzle), difficulty: "daily", assist: "none" as const };

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "Shadow Architect",
      subtitle: "빛과 그림자 3D 건축 퍼즐",
      score: `${match.percent}% 일치 (${state.moves}수)`,
      slug: "shadow-architect",
      customStats: [
        { label: "PUZZLE", value: `#${state.puzzle + 1}` },
        { label: "MOVES", value: `${state.moves}수` },
        { label: "MATCH", value: `${match.percent}%` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `shadow-architect-p${state.puzzle + 1}.png`);
    }
  }, [match.percent, state.moves, state.puzzle]);

  useEffect(() => {
    setState(createShadowArchitect(Math.floor(Date.now() / 86400000) % 10));
    recordAchievementEvent("shadow-architect", "opened");
  }, []);

  useEffect(() => {
    setBest(getBestForConditions("shadow-architect", { seed: String(state.puzzle), difficulty: "daily", assist: "none" })?.value ?? 0);
  }, [state.puzzle]);

  useEffect(() => {
    if (!complete || celebrated.current) return;
    celebrated.current = true;
    playShadowAudio('complete');
    MobileHapticsPro.success();
    const saved = recordBestForConditions("shadow-architect", shadowArchitectScore(state), "score", conditions, `${state.moves} moves`);
    setBest(saved.value);
    recordAchievementEvent("shadow-architect", "cleared");
    celebrateStage({ preset: "tiles", colors: ["#d9b95f", "#718a55", "#f4eddc"], origin: { x: 0.5, y: 0.6 } });
  }, [celebrateStage, complete, conditions, state]);

  const act = (change: Parameters<typeof transformShadowBlock>[1]) => {
    if ('rotate' in change) {
      playShadowAudio('rotate');
    } else {
      playShadowAudio('move');
    }
    MobileHapticsPro.light();
    setState(s => transformShadowBlock(s, change));
  };
  const reset = (next = state.puzzle) => {
    celebrated.current = false;
    MobileHapticsPro.selection();
    setState(createShadowArchitect(next));
  };

  return (
    <GameContainer title={t.title} subtitle={t.sub}>
      <div ref={stageRef} className="space-y-4">
        {!active && (
          <img src="/games/shadow-architect-keyart.webp" alt="" width={1730} height={909} decoding="async" className="aspect-[1.9/1] w-full rounded-2xl object-cover" />
        )}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-muted p-2"><b>{t.match}</b><br />{match.percent}%</div>
          <div className="rounded-xl bg-muted p-2"><b>{t.moves}</b><br />{state.moves}</div>
          <div className="rounded-xl bg-muted p-2"><b>{t.best}</b><br />{best || "—"}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ShadowGrid cells={targetShadow(state.puzzle)} label={t.target} tone="target" />
          <ShadowGrid cells={shadowCells(state.poses)} label={t.current} tone="current" />
        </div>
        <Lazy3DStage
          active={active}
          className="h-[min(58vh,480px)]"
          placeholder={
            <div className="grid h-full place-items-center p-6">
              <button onClick={() => { setActive(true); recordAchievementEvent("shadow-architect", "played"); }} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">
                {t.enter}
              </button>
            </div>
          }
          fallback={
            <div className="grid h-full place-items-center p-8 text-center text-sm">
              <p>{t.fallback}</p>
            </div>
          }
        >
          <Scene state={state} />
        </Lazy3DStage>
        {active && (
          <>
            <div className="grid grid-cols-5 gap-2">
              {BLOCKS.map((name, i) => (
                <TiltShadowBlockButton
                  key={name}
                  name={name}
                  isSelected={state.selected === i}
                  onClick={() => {
                    playShadowAudio('select');
                    MobileHapticsPro.selection();
                    setState(s => selectShadowBlock(s, i as ShadowBlockId));
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => act({ x: -1 })} className="rounded-xl border border-border bg-card p-3 text-card-foreground">← {t.left}</button>
              <button onClick={() => act({ y: 1 })} className="rounded-xl border border-border bg-card p-3 text-card-foreground">↑ {t.up}</button>
              <button onClick={() => act({ x: 1 })} className="rounded-xl border border-border bg-card p-3 text-card-foreground">{t.right} →</button>
              <button onClick={() => act({ z: -1 })} className="rounded-xl border border-border bg-card p-3 text-card-foreground">{t.back}</button>
              <button onClick={() => act({ rotate: 1 })} className="rounded-xl bg-primary p-3 font-bold text-primary-foreground">↻ {t.rotate}</button>
              <button onClick={() => act({ z: 1 })} className="rounded-xl border border-border bg-card p-3 text-card-foreground">{t.front}</button>
              <span />
              <button onClick={() => act({ y: -1 })} className="rounded-xl border border-border bg-card p-3 text-card-foreground">↓ {t.down}</button>
              <span />
            </div>
          </>
        )}
        {complete && (
          <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="font-bold text-foreground">✨ {t.done}</div>
            <button
              type="button"
              onClick={handleShareCard}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-secondary-foreground shadow-sm transition hover:bg-muted"
            >
              {shareCardCopied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
              <span>{shareCardCopied ? "복사 완료!" : "결과 카드 공유"}</span>
            </button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => reset()} className="rounded-xl border border-border bg-card px-4 py-3 text-card-foreground">{t.reset}</button>
          <button onClick={() => reset((state.puzzle + 1) % 10)} className="rounded-xl border border-border bg-card px-4 py-3 text-card-foreground">{t.next}</button>
          <button
            type="button"
            onClick={handleShareCard}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-3 text-xs font-bold text-secondary-foreground shadow-sm transition hover:bg-muted"
          >
            {shareCardCopied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
            <span>{shareCardCopied ? "복사 완료!" : "설계도 공유"}</span>
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t.hint}</p>
      </div>
    </GameContainer>
  );
}
