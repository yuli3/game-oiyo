import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { CABLE_SLUG, CABLE_STAGES, STAGE_COUNT, crossCount, emptySockets, move, newDesk, starsFor, tangled, type Desk } from "../../lib/games/cable-knot";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; crossings: string; start: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", moves: "이동 {0}/{1}", crossings: "엉킨 곳 {0}", start: "플러그를 누르고, 빈 콘센트를 눌러 옮겨요!", win: "전선을 다 풀었어요!", lose: "이동 횟수를 다 썼어요", result: "{0}번 만에 풀었어요",
    again: "다시 하기", next: "다음 단계",
    help: "책상 위 충전선이 엉망으로 엉켜 있어요. 플러그는 콘센트 자리에 꽂혀 있고, 전선은 플러그 사이를 곧게 이어요. 빨간 전선은 다른 전선과 겹친 전선이에요. 플러그를 누른 다음 빈 콘센트(회색 동그라미)를 누르면 그 자리로 옮겨요. 겹친 곳을 하나도 남기지 않으면 통과이고, 이동 횟수가 다 떨어지면 실패예요. 적게 옮길수록 별이 늘어요. 키보드: ←/→로 플러그 고르기, ↑/↓로 빈 콘센트 고르기, Enter로 옮기기.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", moves: "Moves {0}/{1}", crossings: "Crossings {0}", start: "Tap a plug, then an empty socket to move it!", win: "All untangled!", lose: "Out of moves", result: "Untangled in {0} moves",
    again: "Try again", next: "Next stage",
    help: "The charging cables on the desk are in a terrible tangle. Plugs sit in sockets and the cables run straight between them; a red cable crosses another. Tap a plug, then an empty socket (grey ring), and the plug moves there. Leave no crossing at all to clear the stage; run out of moves and it's over. The fewer moves, the more stars. Keyboard: ←/→ pick a plug, ↑/↓ pick an empty socket, Enter moves.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", moves: "移動 {0}/{1}", crossings: "からまり {0}", start: "プラグを押して、空いたコンセントを押して動かそう！", win: "ケーブルが全部ほどけた！", lose: "移動回数がなくなった", result: "{0}回でほどけた",
    again: "もう一度", next: "次の面",
    help: "机の上の充電ケーブルがぐちゃぐちゃにからまっています。プラグはコンセントの位置に挿してあり、ケーブルはプラグの間をまっすぐ結んでいます。赤いケーブルは他のケーブルと交差しています。プラグを押してから空いたコンセント（灰色の輪）を押すと、そこへ移ります。交差を一つも残さなければクリア、移動回数がなくなると失敗。少ない移動ほど星が増えます。キーボード：←/→でプラグ、↑/↓で空きコンセント、Enterで移動。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", moves: "移动 {0}/{1}", crossings: "交叉 {0}", start: "点插头，再点空插座把它移过去！", win: "电线全理顺了！", lose: "移动次数用完了", result: "{0} 步理顺",
    again: "再来一次", next: "下一关",
    help: "桌上的充电线缠成了一团。插头插在插座位置上，电线在插头之间笔直相连；红色的电线和别的电线交叉了。先点插头，再点空插座（灰色圆圈），插头就移过去。一个交叉都不剩即过关，移动次数用完则失败。移动越少星越多。键盘：←/→选插头，↑/↓选空插座，Enter移动。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", moves: "Coups {0}/{1}", crossings: "Croisements {0}", start: "Touchez une prise, puis une place libre pour la déplacer !", win: "Tout est démêlé !", lose: "Plus de coups", result: "Démêlé en {0} coups",
    again: "Réessayer", next: "Niveau suivant",
    help: "Les câbles de recharge sur le bureau forment un nœud terrible. Les prises sont dans des emplacements et les câbles les relient en ligne droite ; un câble rouge en croise un autre. Touchez une prise, puis un emplacement vide (anneau gris) : la prise y va. Ne laissez aucun croisement pour réussir ; sans coups restants, c'est perdu. Moins de coups, plus d'étoiles. Clavier : ←/→ choisir une prise, ↑/↓ un emplacement vide, Entrée déplacer.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", moves: "Movimientos {0}/{1}", crossings: "Cruces {0}", start: "¡Toca un enchufe y luego un hueco libre para moverlo!", win: "¡Todo desenredado!", lose: "Sin movimientos", result: "Desenredado en {0} movimientos",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Los cables de carga del escritorio están hechos un lío. Los enchufes están en huecos y los cables van rectos entre ellos; un cable rojo cruza a otro. Toca un enchufe y luego un hueco vacío (aro gris) y el enchufe se mueve allí. No dejes ningún cruce para superar el nivel; si te quedas sin movimientos, pierdes. Cuantos menos movimientos, más estrellas. Teclado: ←/→ elegir enchufe, ↑/↓ elegir hueco vacío, Intro mover.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const PLUG_COLOURS = ["#1971c2", "#e8590c", "#2f9e44", "#7048e8", "#c2255c", "#0c8599", "#f08c00", "#495057"];
const MUTE_KEY = "oiyo:cable-knot:muted";
const W = 360;
const H = 520;

export default function CableKnot({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; moves: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dRef = useRef<Desk | null>(null);
  const input = useRef<Array<{ x: number; y: number } | { key: string }>>([]);
  const picked = useRef(-1);
  const target = useRef(-1);
  const anim = useRef<Map<number, { x: number; y: number }>>(new Map());
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const overShown = useRef(false);

  useRunRecord(CABLE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    dRef.current = newDesk(CABLE_STAGES[s]);
    input.current = [];
    picked.current = -1;
    target.current = -1;
    anim.current = new Map();
    parts.current = [];
    overShown.current = false;
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CABLE_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const d = dRef.current;
      if (!d) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const s = d.stage;
      const cp = copyRef.current;
      const doMove = (plug: number, sock: number) => {
        const before = crossCount(s, d.at);
        const from = s.sockets[d.at[plug]];
        if (move(d, plug, sock)) {
          anim.current.set(plug, { x: from.x, y: from.y });
          const after = crossCount(s, d.at);
          sfx(after < before ? "place" : "tap");
          picked.current = -1;
          target.current = -1;
        } else sfx("fail");
      };
      // taps and keys are read once per frame
      for (const a of input.current.splice(0)) {
        if (d.over) break;
        if ("key" in a) {
          const empty = emptySockets(d);
          if (a.key === "ArrowLeft" || a.key === "ArrowRight") picked.current = (Math.max(0, picked.current) + (a.key === "ArrowRight" ? 1 : s.plugs - 1)) % s.plugs;
          else if (a.key === "ArrowUp" || a.key === "ArrowDown") {
            const k = empty.indexOf(target.current);
            target.current = empty[(k + (a.key === "ArrowDown" ? 1 : empty.length - 1) + empty.length) % empty.length];
          } else if (a.key === "Enter" && picked.current >= 0 && target.current >= 0) doMove(picked.current, target.current);
          continue;
        }
        const plug = d.at.findIndex((sock) => Math.hypot(s.sockets[sock].x - a.x, s.sockets[sock].y - a.y) < 22);
        if (plug >= 0) {
          picked.current = picked.current === plug ? -1 : plug;
          sfx("tap");
          continue;
        }
        const sock = s.sockets.findIndex((p, k) => !d.at.includes(k) && Math.hypot(p.x - a.x, p.y - a.y) < 22);
        if (sock >= 0 && picked.current >= 0) doMove(picked.current, sock);
      }
      if (d.over && !overShown.current) {
        overShown.current = true;
        setOver({ won: d.won, stars: starsFor(d), moves: d.moves });
        if (d.won) {
          setCleared(markStageCleared(CABLE_SLUG, s.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 300, ["#ffd43b", "#fff", "#51cf66", "#4dabf7"], 30, 150, 3);
          sfx("win");
        } else sfx("lose");
      }
      // plugs glide to their new socket
      const pos = (plug: number) => {
        const to = s.sockets[d.at[plug]];
        const a = anim.current.get(plug);
        if (!a) return to;
        a.x += (to.x - a.x) * Math.min(1, dt * 14);
        a.y += (to.y - a.y) * Math.min(1, dt * 14);
        if (Math.hypot(to.x - a.x, to.y - a.y) < 0.5) anim.current.delete(plug);
        return a;
      };
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#c8a27a";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#b88a5c";
        for (let y = 0; y < H; y += 26) ctx.fillRect(0, y, W, 2);
        // empty sockets
        s.sockets.forEach((p, k) => {
          if (d.at.includes(k)) return;
          ctx.strokeStyle = target.current === k ? "#1971c2" : "rgba(33,37,41,0.45)";
          ctx.lineWidth = target.current === k ? 4 : 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
          ctx.stroke();
        });
        const where = Array.from({ length: s.plugs }, (_, k) => pos(k));
        s.edges.forEach(([a, b], i) => {
          const bad = tangled(s, d.at, i);
          ctx.strokeStyle = bad ? "#e03131" : "#2b8a3e";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(where[a].x, where[a].y);
          ctx.lineTo(where[b].x, where[b].y);
          ctx.stroke();
        });
        ctx.lineWidth = 1;
        where.forEach((p, k) => {
          ctx.fillStyle = "#212529";
          ctx.fillRect(p.x - 13, p.y - 13, 26, 26);
          ctx.fillStyle = PLUG_COLOURS[k % PLUG_COLOURS.length];
          ctx.fillRect(p.x - 11, p.y - 11, 22, 22);
          ctx.fillStyle = "#f1f3f5";
          ctx.fillRect(p.x - 6, p.y - 4, 3, 8);
          ctx.fillRect(p.x + 3, p.y - 4, 3, 8);
          if (picked.current === k) {
            ctx.strokeStyle = "#ffd43b";
            ctx.lineWidth = 4;
            ctx.strokeRect(p.x - 16, p.y - 16, 32, 32);
            ctx.lineWidth = 1;
          }
        });
        drawParticles(ctx, parts.current);
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#212529";
        ctx.fillText(fill(cp.crossings, crossCount(s, d.at)), 14, 30);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.moves, d.moves, s.limit), W - 14, 30);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dRef.current?.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTouched(true);
    input.current.push({ x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height });
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(e.key)) return;
    e.preventDefault();
    setTouched(true);
    input.current.push({ key: e.key });
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="cable-knot"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
            <RotateCcw className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          tabIndex={0}
          onPointerDown={onDown}
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-12 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.moves)}</p> : null}
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}
