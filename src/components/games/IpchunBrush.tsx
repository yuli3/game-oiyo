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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { BOX, BOX_X, BOX_Y, IPCHUN_SLUG, IPCHUN_STAGES, STAGE_COUNT, average, inked, newSheet, pointAt, starsFor, strokePath, widthAt, write, type Sheet, type StrokeKind, type TracePoint } from "../../lib/games/ipchun-brush";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const STROKE_NAME: Record<L, Record<StrokeKind, string>> = {
  ko: { dot: "점 (측)", horizontal: "가로획 (늑)", vertical: "세로획 (노)", hook: "갈고리 (적)", rising: "치킴 (책)", longLeft: "긴 삐침 (략)", shortLeft: "짧은 삐침 (탁)", rightFall: "파임 (책)" },
  en: { dot: "Dot", horizontal: "Horizontal", vertical: "Vertical", hook: "Hook", rising: "Rising stroke", longLeft: "Long left-falling", shortLeft: "Short left-falling", rightFall: "Right-falling" },
  ja: { dot: "点（側）", horizontal: "横画（勒）", vertical: "縦画（努）", hook: "はね（趯）", rising: "はらい上げ（策）", longLeft: "長い左はらい（掠）", shortLeft: "短い左はらい（啄）", rightFall: "右はらい（磔）" },
  zh: { dot: "点（侧）", horizontal: "横（勒）", vertical: "竖（努）", hook: "钩（趯）", rising: "提（策）", longLeft: "长撇（掠）", shortLeft: "短撇（啄）", rightFall: "捺（磔）" },
  fr: { dot: "Point", horizontal: "Horizontal", vertical: "Vertical", hook: "Crochet", rising: "Trait montant", longLeft: "Long trait vers la gauche", shortLeft: "Court trait vers la gauche", rightFall: "Trait vers la droite" },
  es: { dot: "Punto", horizontal: "Horizontal", vertical: "Vertical", hook: "Gancho", rising: "Trazo ascendente", longLeft: "Trazo largo a la izquierda", shortLeft: "Trazo corto a la izquierda", rightFall: "Trazo a la derecha" },
};

const COPY: Record<L, {
  stage: string; goal: string; stroke: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; good: string; fair: string; poor: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "목표 {0}%", stroke: "{0}/{1} · {2}", start: "빨간 점에서 시작해 안내선을 따라 그어요. 굵은 곳은 천천히, 가는 곳은 빠르게!", win: "입춘대길! 대문에 붙여요", lose: "획이 조금 아쉬워요", result: "평균 {0}% (목표 {1}%)",
    again: "다시 쓰기", next: "다음 단계", good: "명필이에요!", fair: "좋아요", poor: "다시 연습해요",
    help: "입춘(해마다 2월 4일 무렵)이 되면 대문에 '입춘대길(立春大吉)'을 써 붙이는 집이 많아요. 붓글씨는 '영(永)' 한 글자에 담긴 여덟 가지 획, 곧 영자팔법으로 익혀요. 점, 가로획, 세로획, 갈고리, 치킴, 긴 삐침, 짧은 삐침, 파임이에요. 붓은 천천히 움직이면 굵게, 빨리 움직이면 가늘게 그어져요. 빨간 점에서 눌러 안내선을 따라 끌고 손을 떼면 한 획이에요. 안내선이 굵어지는 곳은 천천히, 가늘어지는 곳은 빠르게 그으며 선을 벗어나지 마세요. 단계의 획을 다 쓰고 평균 점수가 목표를 넘으면 통과예요. (키보드: 스페이스를 누르는 동안 붓이 선을 따라가고, 위쪽 방향키를 함께 누르면 빨라져요)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Goal {0}%", stroke: "{0}/{1} · {2}", start: "Start at the red dot and follow the guide. Slow where it's thick, quick where it's thin!", win: "Great luck as spring begins! Paste it on the gate", lose: "The strokes need a little more work", result: "Average {0}% (goal {1}%)",
    again: "Write again", next: "Next stage", good: "Masterful!", fair: "Good", poor: "Practise again",
    help: "At Ipchun, the start of spring (around 4 February each year), many Korean households paste 立春大吉 \"great luck as spring begins\" on the gate. Calligraphy is learned through the eight strokes of the character 永: dot, horizontal, vertical, hook, rising, long left-falling, short left-falling and right-falling. A brush lays a thick line when it moves slowly and a thin one when it moves fast. Press on the red dot, drag along the guide and lift to finish a stroke. Slow down where the guide swells, speed up where it tapers, and stay on the line. Write the stage's strokes with an average over the goal to clear it. (Keyboard: hold Space to move the brush along the line; add the up arrow to go faster.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "目標 {0}%", stroke: "{0}/{1} · {2}", start: "赤い点から始めてガイドをなぞろう。太い所はゆっくり、細い所は速く！", win: "立春大吉！門に貼ろう", lose: "もう少し練習しよう", result: "平均 {0}%（目標 {1}%）",
    again: "もう一度", next: "次の面", good: "見事な筆！", fair: "いいね", poor: "もう一度練習",
    help: "立春（毎年2月4日ごろ）には、門に「立春大吉」を書いて貼る家が韓国にも多くあります。書道は「永」の一字に込められた8つの筆法、永字八法で学びます。点・横画・縦画・はね・はらい上げ・長い左はらい・短い左はらい・右はらいです。筆はゆっくり動かすと太く、速く動かすと細くなります。赤い点を押してガイドに沿ってなぞり、指を離すと1画です。ガイドが太くなる所はゆっくり、細くなる所は速く、線からはみ出さないように。面の画をすべて書いて平均点が目標を超えればクリア。（キーボード：スペースを押している間、筆が線をたどり、上矢印を一緒に押すと速くなります）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "目标 {0}%", stroke: "{0}/{1} · {2}", start: "从红点开始沿着引导线写。粗处慢写，细处快写！", win: "立春大吉！贴到大门上吧", lose: "笔画还要再练练", result: "平均 {0}%（目标 {1}%）",
    again: "再写一次", next: "下一关", good: "妙笔！", fair: "不错", poor: "再练练",
    help: "立春（每年2月4日前后）时，韩国很多人家会在大门上贴“立春大吉”。书法要从“永”字八法学起：点、横、竖、钩、提、长撇、短撇、捺。毛笔慢慢移动写出的线粗，快速移动写出的线细。在红点上按下，沿引导线拖动，松手就完成一笔。引导线变粗的地方慢写，变细的地方快写，不要写出线外。写完本关所有笔画且平均分超过目标即过关。（键盘：按住空格时毛笔沿线前进，同时按上方向键会变快）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Objectif {0} %", stroke: "{0}/{1} · {2}", start: "Partez du point rouge et suivez le guide. Lent là où c'est épais, vif là où c'est fin !", win: "Grande chance au début du printemps ! À coller sur le portail", lose: "Les traits demandent encore un peu de travail", result: "Moyenne {0} % (objectif {1} %)",
    again: "Réécrire", next: "Niveau suivant", good: "Magistral !", fair: "Bien", poor: "À retravailler",
    help: "À Ipchun, le début du printemps (vers le 4 février), beaucoup de foyers coréens collent 立春大吉 « grande chance au début du printemps » sur le portail. La calligraphie s'apprend par les huit traits du caractère 永 : point, horizontal, vertical, crochet, trait montant, long et court traits vers la gauche, trait vers la droite. Un pinceau trace un trait épais lentement et fin rapidement. Appuyez sur le point rouge, suivez le guide et relevez pour finir un trait. Ralentissez là où le guide s'épaissit, accélérez là où il s'affine, et restez sur la ligne. Écrivez les traits du niveau avec une moyenne au-dessus de l'objectif. (Clavier : maintenez Espace pour faire avancer le pinceau ; ajoutez la flèche haut pour aller plus vite.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Meta {0} %", stroke: "{0}/{1} · {2}", start: "Empieza en el punto rojo y sigue la guía. ¡Despacio donde es grueso, rápido donde es fino!", win: "¡Gran suerte al empezar la primavera! A la puerta", lose: "Los trazos necesitan un poco más de práctica", result: "Media {0} % (meta {1} %)",
    again: "Escribir otra vez", next: "Siguiente nivel", good: "¡Magistral!", fair: "Bien", poor: "A practicar",
    help: "En Ipchun, el comienzo de la primavera (hacia el 4 de febrero), muchos hogares coreanos pegan 立春大吉 «gran suerte al empezar la primavera» en la puerta. La caligrafía se aprende con los ocho trazos del carácter 永: punto, horizontal, vertical, gancho, trazo ascendente, trazos largo y corto a la izquierda y trazo a la derecha. Un pincel traza grueso cuando va despacio y fino cuando va rápido. Pulsa en el punto rojo, arrastra por la guía y levanta para terminar un trazo. Frena donde la guía se ensancha, acelera donde se afina y no te salgas de la línea. Escribe los trazos del nivel con una media por encima de la meta. (Teclado: mantén Espacio para que el pincel avance por la línea; añade la flecha arriba para ir más rápido.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ipchun-brush:muted";
const W = 360;
const H = 560;
const SEAL: PixelArt = { palette: { r: "#c92a2a", w: "#fff5f5" }, rows: ["rrrrr", "rwrwr", "rrrrr", "rwrwr", "rrrrr"] };

interface Pop { text: string; t: number; color: string; x: number; y: number }
type Input = { kind: "down" | "move"; x: number; y: number; t: number } | { kind: "up" };

export default function IpchunBrush({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const names = STROKE_NAME[locale] ?? STROKE_NAME.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; avg: number; mark: number }>(null);
  const [touched, setTouched] = useState(false);
  const [strokeIdx, setStrokeIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Sheet>(newSheet(IPCHUN_STAGES[0]));
  const input = useRef<Input[]>([]);
  const trace = useRef<TracePoint[] | null>(null);
  const done = useRef<Array<Array<{ x: number; y: number; w: number }>>>([]);
  const keyBrush = useRef({ held: false, fast: false, s: 0, t: 0 });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = IPCHUN_STAGES[stage];

  useRunRecord(IPCHUN_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    sRef.current = newSheet(IPCHUN_STAGES[s]);
    input.current = [];
    trace.current = null;
    done.current = [];
    keyBrush.current = { held: false, fast: false, s: 0, t: 0 };
    parts.current = [];
    pops.current = [];
    setStrokeIdx(0);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(IPCHUN_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const kb = keyBrush.current;
    const down = (ev: KeyboardEvent) => {
      if (sRef.current.over) return;
      if (ev.key === " ") {
        ev.preventDefault();
        if (!keyBrush.current.held) keyBrush.current = { held: true, fast: keyBrush.current.fast, s: 0, t: 0 };
        setTouched(true);
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        keyBrush.current.fast = true;
      }
    };
    const up = (ev: KeyboardEvent) => {
      if (ev.key === " " && keyBrush.current.held) {
        keyBrush.current.held = false;
        input.current.push({ kind: "up" });
      } else if (ev.key === "ArrowUp") keyBrush.current.fast = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      kb.held = false;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const sh = sRef.current;
      const cp = copyRef.current;
      const kind = sh.stage.strokes[Math.min(sh.idx, sh.stage.strokes.length - 1)];
      const path = strokePath(kind);
      // the keyboard brush walks the guide while Space is held
      const kb = keyBrush.current;
      if (kb.held && !sh.over) {
        kb.t += dt;
        kb.s = Math.min(1, kb.s + ((kb.fast ? 300 : 70) * dt) / path.len);
        const p = pointAt(path, kb.s);
        input.current.push({ kind: kb.t <= dt ? "down" : "move", x: p.x, y: p.y, t: now / 1000 });
      }
      // the finger is read once per frame
      for (const e of input.current.splice(0)) {
        if (sh.over) break;
        if (e.kind === "down") {
          const s0 = pointAt(path, 0);
          if (Math.hypot(e.x - s0.x, e.y - s0.y) <= 40) trace.current = [{ x: e.x, y: e.y, t: e.t }];
        } else if (e.kind === "move") {
          trace.current?.push({ x: e.x, y: e.y, t: e.t });
        } else if (trace.current) {
          const pts = trace.current;
          trace.current = null;
          if (pts.length < 3) continue;
          const j = write(sh, pts);
          if (!j) continue;
          done.current.push(inked(pts));
          const pct = Math.round(j.score * 100);
          const end = pts[pts.length - 1];
          pops.current.push({ text: `${pct}% · ${pct >= 85 ? cp.good : pct >= 60 ? cp.fair : cp.poor}`, t: 1.1, color: pct >= 60 ? "#2f9e44" : "#e8590c", x: end.x, y: end.y - 24 });
          sfx(pct >= 60 ? "success" : "fail");
          setStrokeIdx(sh.idx);
          if (sh.over) {
            setOver({ won: sh.won, stars: starsFor(sh), avg: Math.round(average(sh) * 100), mark: Math.round(sh.stage.mark * 100) });
            if (sh.won) {
              setCleared(markStageCleared(IPCHUN_SLUG, sh.stage.stage, STAGE_COUNT));
              spawnBurst(parts.current, W / 2, BOX_Y + BOX / 2, ["#c92a2a", "#ffd43b"], 20, 120, 3);
              sfx("win");
            } else sfx("lose");
          }
        }
      }
      stepParticles(parts.current, dt, 60);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a red ipchun sheet edge, then rice paper with its guide grid
        ctx.fillStyle = "#7a2e1f";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fbf6ea";
        ctx.fillRect(BOX_X - 10, BOX_Y - 10, BOX + 20, BOX + 20);
        ctx.strokeStyle = "rgba(201,42,42,0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(BOX_X, BOX_Y, BOX, BOX);
        ctx.beginPath();
        ctx.moveTo(BOX_X + BOX / 2, BOX_Y);
        ctx.lineTo(BOX_X + BOX / 2, BOX_Y + BOX);
        ctx.moveTo(BOX_X, BOX_Y + BOX / 2);
        ctx.lineTo(BOX_X + BOX, BOX_Y + BOX / 2);
        ctx.moveTo(BOX_X, BOX_Y);
        ctx.lineTo(BOX_X + BOX, BOX_Y + BOX);
        ctx.moveTo(BOX_X + BOX, BOX_Y);
        ctx.lineTo(BOX_X, BOX_Y + BOX);
        ctx.stroke();
        // strokes already written stay on the paper, faded
        const drawInk = (ink: Array<{ x: number; y: number; w: number }>, alpha: number) => {
          ctx.fillStyle = `rgba(33,37,41,${alpha})`;
          for (let i = 1; i < ink.length; i++) {
            const a = ink[i - 1];
            const b = ink[i];
            const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
            for (let k = 0; k <= steps; k++) {
              const f = k / steps;
              ctx.beginPath();
              ctx.arc(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, (a.w + (b.w - a.w) * f) / 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        };
        for (const ink of done.current) drawInk(ink, 0.3);
        if (!sh.over) {
          // the guide: a ghost of the stroke at the width wanted, and the red start dot
          ctx.fillStyle = "rgba(201,42,42,0.16)";
          for (let k = 0; k <= 60; k++) {
            const p = pointAt(path, k / 60);
            ctx.beginPath();
            ctx.arc(p.x, p.y, widthAt(kind, k / 60) / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          const s0 = pointAt(path, 0);
          ctx.fillStyle = "#e03131";
          ctx.beginPath();
          ctx.arc(s0.x, s0.y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        if (trace.current) drawInk(inked(trace.current), 0.95);
        drawSprite(ctx, SEAL, W - 40, H - 40, { scale: 6 });
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#fff4e6";
        if (!sh.over) ctx.fillText(fill(cp.stroke, sh.idx + 1, sh.stage.strokes.length, names[kind]), 12, 30);
        ctx.font = "14px sans-serif";
        ctx.fillText(`${Math.round(average(sh) * 100)}% / ${Math.round(sh.stage.mark * 100)}%`, 12, 52);
        ctx.font = "bold 36px serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,244,230,0.85)";
        ctx.fillText("立春大吉", W / 2, 110);
        for (const pp of pops.current) {
          ctx.font = "bold 15px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(x - tw / 2, pp.y - 18, tw, 24);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 1);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx, names]);

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height, t: e.timeStamp / 1000 };
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="ipchun-brush"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, Math.round(st.mark * 100))}</Badge>
        <Badge variant="outline">{`${Math.min(strokeIdx + 1, st.strokes.length)}/${st.strokes.length}`}</Badge>
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
          onPointerDown={(e) => {
            if (sRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setTouched(true);
            input.current.push({ kind: "down", ...toCanvas(e) });
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            input.current.push({ kind: "move", ...toCanvas(e) });
          }}
          onPointerUp={() => input.current.push({ kind: "up" })}
          onPointerCancel={() => input.current.push({ kind: "up" })}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.avg, over.mark)}</p>
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
