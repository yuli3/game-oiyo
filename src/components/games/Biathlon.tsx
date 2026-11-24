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
import { AIM_TIME, BIATHLON_SLUG, BIATHLON_STAGES, MAX_HR, REST, SHOTS, STAGE_COUNT, fire, newRacer, setPush, sight, starsFor, stepRacer, type Racer } from "../../lib/games/biathlon";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; time: string; rival: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; hit: string; miss: string; range: string; loop: string; leg: string; bpm: string; aim: string;
}> = {
  ko: {
    stage: "{0}단계", time: "{0}초", rival: "상대 {0}초", start: "꾹 눌러 힘껏 밀고, 사격장에서는 조준이 맞을 때 톡!", win: "상대보다 빨리 들어왔어요!", lose: "상대가 더 빨랐어요", result: "{0}초 · 명중 {1}/{2} · 벌칙 {3}초",
    again: "다시 하기", next: "다음 단계", hit: "명중!", miss: "빗나감 +10초", range: "사격장 — 심장이 가라앉으면 쏘세요", loop: "벌칙 코스", leg: "{0}/{1}구간", bpm: "{0} bpm", aim: "조준 중…",
    help: "스키를 타다 사격하는 바이애슬론이에요. 화면을 꾹 누르면 폴을 힘껏 밀어 빨라지지만 심장이 빨리 뛰고, 손을 떼면 미끄러지며 숨을 골라요. 사격장에 도착하면 조준경이 숨과 함께 흔들리고, 심박이 높을수록 손이 떨려요. 조준점이 과녁 안에 들어올 때 톡 눌러 쏘세요. 빗나가면 벌칙 코스를 10초 더 돌아야 해요. 기다리면 심장이 가라앉지만 시계는 계속 가요. 상대 기록보다 먼저 들어오면 통과예요. 키보드는 스페이스.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", time: "{0}s", rival: "Rival {0}s", start: "Hold to push hard; at the range, tap when the sight is on!", win: "You beat the rival!", lose: "The rival was faster", result: "{0}s · {1}/{2} hits · {3}s of penalty",
    again: "Race again", next: "Next stage", hit: "Hit!", miss: "Miss +10s", range: "Range — shoot once your heart settles", loop: "Penalty loop", leg: "Leg {0}/{1}", bpm: "{0} bpm", aim: "Raising the rifle…",
    help: "Biathlon: ski, then shoot. Hold the screen to pole hard and speed up, but your heart rate climbs; let go to glide and catch your breath. At the range the sight sways with your breathing, and the higher your heart rate, the more your hands shake. Tap to fire when the dot is inside the target. A miss sends you round a 10-second penalty loop. Waiting calms your heart, but the clock keeps running. Finish before the rival's time to clear the stage. Keyboard: Space.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", time: "{0}秒", rival: "ライバル {0}秒", start: "長押しで力いっぱい進み、射撃場では照準が合ったらタップ！", win: "ライバルより先にゴール！", lose: "ライバルのほうが速かった", result: "{0}秒 · 命中 {1}/{2} · ペナルティ {3}秒",
    again: "もう一度", next: "次の面", hit: "命中！", miss: "外れ +10秒", range: "射撃場 — 心臓が落ち着いたら撃とう", loop: "ペナルティループ", leg: "区間 {0}/{1}", bpm: "{0} bpm", aim: "銃を構えています…",
    help: "スキーと射撃のバイアスロン。画面を長押しするとストックで強く押して速くなりますが、心拍が上がります。離すと滑りながら息を整えます。射撃場では照準が呼吸で揺れ、心拍が高いほど手が震えます。照準の点が的の中に入ったらタップして撃ちましょう。外すと10秒のペナルティループを回ります。待てば心臓は落ち着きますが、時計は止まりません。ライバルのタイムより先にゴールすればクリア。キーボードはスペース。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", time: "{0}秒", rival: "对手 {0}秒", start: "按住用力滑，射击场上准星对准时点一下！", win: "比对手先到终点！", lose: "对手更快", result: "{0}秒 · 命中 {1}/{2} · 罚时 {3}秒",
    again: "再比一次", next: "下一关", hit: "命中！", miss: "脱靶 +10秒", range: "射击场 — 心跳平稳后再开枪", loop: "罚圈", leg: "第{0}/{1}段", bpm: "{0} bpm", aim: "举枪中…",
    help: "滑雪加射击的冬季两项。按住屏幕用力撑杖加速，但心率会上升；松开就滑行喘口气。到了射击场，准星会随呼吸晃动，心率越高手越抖。准星的点进到靶子里时点一下开枪。脱靶要多滑10秒的罚圈。等一等心跳会平稳，但计时不会停。在对手成绩之前到达终点就过关。键盘用空格。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", time: "{0} s", rival: "Rival {0} s", start: "Maintenez pour pousser fort ; au pas de tir, touchez quand le viseur est dessus !", win: "Vous battez le rival !", lose: "Le rival était plus rapide", result: "{0} s · {1}/{2} touchés · {3} s de pénalité",
    again: "Recourir", next: "Niveau suivant", hit: "Touché !", miss: "Raté +10 s", range: "Pas de tir — tirez quand le cœur s'apaise", loop: "Tour de pénalité", leg: "Boucle {0}/{1}", bpm: "{0} bpm", aim: "Mise en joue…",
    help: "Le biathlon : skier, puis tirer. Maintenez l'écran pour pousser fort sur les bâtons et accélérer, mais le cœur s'emballe ; lâchez pour glisser et reprendre votre souffle. Au pas de tir, le viseur bouge avec la respiration, et plus le cœur bat vite, plus les mains tremblent. Touchez pour tirer quand le point est dans la cible. Chaque raté vous coûte un tour de pénalité de 10 secondes. Attendre calme le cœur, mais le chrono tourne. Arrivez avant le temps du rival. Clavier : Espace.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", time: "{0} s", rival: "Rival {0} s", start: "Mantén para impulsarte fuerte; en el campo de tiro, ¡toca cuando la mira esté encima!", win: "¡Le ganaste al rival!", lose: "El rival fue más rápido", result: "{0} s · {1}/{2} aciertos · {3} s de penalización",
    again: "Correr otra vez", next: "Siguiente nivel", hit: "¡Acierto!", miss: "Fallo +10 s", range: "Campo de tiro — dispara cuando se calme el corazón", loop: "Vuelta de castigo", leg: "Tramo {0}/{1}", bpm: "{0} ppm", aim: "Apuntando…",
    help: "Biatlón: esquiar y luego disparar. Mantén la pantalla para empujar fuerte con los bastones y acelerar, pero el pulso sube; suelta para deslizarte y recuperar el aliento. En el campo de tiro la mira se mueve con la respiración, y cuanto más alto el pulso, más tiemblan las manos. Toca para disparar cuando el punto esté dentro del blanco. Cada fallo te manda a una vuelta de castigo de 10 segundos. Esperar calma el corazón, pero el reloj sigue. Llega antes que el tiempo del rival. Teclado: Espacio.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:biathlon:muted";
const W = 360;
const H = 560;
const SCOPE = 5; // screen px per game px at the range
const TX = 180;
const TY = 250;

const SKIER: PixelArt = {
  palette: { k: "#212529", y: "#fab005", b: "#1971c2", s: "#f1c27d", g: "#495057" },
  rows: ["....yy....", "...ksk....", "...bbb.g..", "..bbbbbg..", ".g.bbb.g..", "g..bbb..g.", "...b.b....", "..b...b...", "kkkkkkkkkk"],
};
const SKIER_B: PixelArt = {
  palette: SKIER.palette,
  rows: ["....yy....", "...ksk....", "..gbbb....", "..gbbbbb..", "..g.bbb.g.", ".g..bbb..g", "....b.b...", "...b...b..", "kkkkkkkkkk"],
};
const PINE: PixelArt = {
  palette: { g: "#2b8a3e", d: "#1b5e20", w: "#f8f9fa", t: "#5c3d2e" },
  rows: ["...w...", "..ggg..", ".gwggd.", "..ggg..", ".ggwgd.", "ggggggd", "...t...", "...t..."],
};

interface Pop { text: string; t: number; color: string }

export default function Biathlon({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; time: number; hits: number; shots: number; misses: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rRef = useRef<Racer>(newRacer(BIATHLON_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Array<"down" | "up">>([]);
  const held = useRef(false);
  const marks = useRef<Array<{ x: number; y: number; hit: boolean }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = BIATHLON_STAGES[stage];

  useRunRecord(BIATHLON_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    rRef.current = newRacer(BIATHLON_STAGES[s]);
    started.current = false;
    input.current = [];
    held.current = false;
    marks.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(BIATHLON_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let trail = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const r = rRef.current;
      const cp = copyRef.current;
      // the button is read once per frame
      for (const e of input.current.splice(0)) {
        if (e === "down") {
          started.current = true;
          held.current = true;
          if (r.phase === "range") {
            const res = fire(r);
            if (res && r.lastShot) {
              marks.current.push({ x: r.lastShot.x, y: r.lastShot.y, hit: r.lastShot.hit });
              if (res === "hit") {
                pops.current.push({ text: cp.hit, t: 0.8, color: "#2f9e44" });
                spawnBurst(parts.current, TX, TY, ["#ffffff", "#ced4da"], 12, 90, Math.floor(r.t * 1000));
                sfx("success");
              } else {
                pops.current.push({ text: cp.miss, t: 0.9, color: "#e03131" });
                sfx("fail");
              }
              if (r.shot === 0) marks.current = []; // that was the last shot here
            }
          }
        } else held.current = false;
      }
      setPush(r, held.current && r.phase === "ski");
      if (started.current && !r.over) {
        const ev = stepRacer(r, dt);
        if (ev === "range") {
          held.current = false;
          sfx("place");
        } else if (ev === "finish") {
          setOver({ won: r.won, stars: starsFor(r), time: r.t, hits: r.hits, shots: r.hits + r.misses, misses: r.misses });
          if (r.won) {
            setCleared(markStageCleared(BIATHLON_SLUG, r.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);
      trail += r.v * dt;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#74c0fc");
        g.addColorStop(1, "#e7f5ff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        if (r.phase === "range") {
          // the view through the sight: a black plate with five targets
          ctx.fillStyle = "#f8f9fa";
          ctx.fillRect(0, 330, W, H - 330);
          ctx.fillStyle = "#343a40";
          ctx.fillRect(30, 150, W - 60, 200);
          const rad = r.stage.radius * SCOPE;
          for (let k = 0; k < SHOTS; k++) {
            const x = 66 + k * 57;
            const done = k < r.shot;
            const hitDone = done && marks.current[k]?.hit;
            ctx.fillStyle = hitDone ? "#f8f9fa" : "#212529";
            ctx.beginPath();
            ctx.arc(x, 186, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#f8f9fa";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.fillStyle = "#212529";
          ctx.beginPath();
          ctx.arc(TX, TY + 20, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#f8f9fa";
          ctx.lineWidth = 2;
          ctx.stroke();
          for (const m of marks.current) {
            ctx.fillStyle = m.hit ? "#fab005" : "#ff6b6b";
            ctx.fillRect(TX + m.x * SCOPE - 3, TY + 20 + m.y * SCOPE - 3, 6, 6);
          }
          if (r.rangeT >= AIM_TIME) {
            const s = sight(r);
            const sx = TX + s.x * SCOPE;
            const sy = TY + 20 + s.y * SCOPE;
            const on = Math.hypot(s.x, s.y) <= r.stage.radius;
            ctx.strokeStyle = on ? "#40c057" : "#ff8787";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx, sy, 16, 0, Math.PI * 2);
            ctx.moveTo(sx - 26, sy);
            ctx.lineTo(sx + 26, sy);
            ctx.moveTo(sx, sy - 26);
            ctx.lineTo(sx, sy + 26);
            ctx.stroke();
          }
          ctx.fillStyle = "#1864ab";
          ctx.font = "bold 15px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(r.rangeT < AIM_TIME ? cp.aim : cp.range, W / 2, 130);
        } else {
          // the trail: hills, pines scrolling past and the skier
          ctx.fillStyle = "#dee2e6";
          ctx.beginPath();
          ctx.moveTo(0, 260);
          for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 240 + Math.sin((x + trail * 0.6) / 50) * 18);
          ctx.lineTo(W, H);
          ctx.lineTo(0, H);
          ctx.fill();
          for (let k = 0; k < 6; k++) {
            const x = ((k * 90 - trail * 3) % 540 + 540) % 540 - 60;
            drawSprite(ctx, PINE, x, 270 + (k % 2) * 20, { scale: 4 });
          }
          ctx.fillStyle = "#f8f9fa";
          ctx.fillRect(0, 350, W, H - 350);
          ctx.fillStyle = "#a5d8ff";
          ctx.fillRect(0, 384, W, 3);
          ctx.fillRect(0, 392, W, 3);
          const frame = r.pushing && Math.floor(r.t * 4) % 2 === 1 ? SKIER_B : SKIER;
          drawSprite(ctx, frame, 120, 362, { scale: 3 });
          for (let k = 0; k < 5; k++) {
            const x = ((k * 80 - trail * 8) % 400 + 400) % 400;
            ctx.fillStyle = "#ced4da";
            ctx.fillRect(x, 400, 20, 2);
          }
          ctx.fillStyle = "#1864ab";
          ctx.font = "bold 15px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(r.penalty > 0 ? `${cp.loop} ${r.penalty.toFixed(1)}s` : fill(cp.leg, r.leg + 1, r.stage.legs), W / 2, 130);
          // progress along this leg
          ctx.fillStyle = "rgba(24,100,171,0.2)";
          ctx.fillRect(40, 140, W - 80, 8);
          ctx.fillStyle = "#1864ab";
          ctx.fillRect(40, 140, ((W - 80) * Math.min(r.d, r.stage.leg)) / r.stage.leg, 8);
        }
        // heart rate and the clock
        const beat = 1 + 0.12 * Math.max(0, Math.sin(r.t * Math.PI * (r.hr / 60)));
        ctx.fillStyle = "#e03131";
        ctx.font = `bold ${Math.round(26 * beat)}px sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText("♥", 22, 62);
        const hrShare = (r.hr - REST) / (MAX_HR - REST);
        ctx.fillStyle = hrShare > 0.6 ? "#e03131" : hrShare > 0.3 ? "#f08c00" : "#2f9e44";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(fill(cp.bpm, Math.round(r.hr)), 52, 60);
        ctx.textAlign = "right";
        ctx.fillStyle = "#212529";
        ctx.fillText(fill(cp.time, r.t.toFixed(1)), W - 20, 60);
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#495057";
        ctx.fillText(fill(cp.rival, r.stage.goal.toFixed(1)), W - 20, 82);
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          const w = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(W / 2 - w / 2, 470 - 22, w, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 470);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const down = useCallback(() => {
    if (rRef.current.over) return;
    setTouched(true);
    input.current.push("down");
  }, []);
  const up = useCallback(() => {
    input.current.push("up");
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat) return;
      e.preventDefault();
      down();
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      e.preventDefault();
      up();
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [down, up]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="biathlon"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.rival, st.goal.toFixed(1))}</Badge>
        <Badge variant="outline">{fill(c.leg, st.legs, st.legs)}</Badge>
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
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); down(); }}
          onPointerUp={up}
          onPointerCancel={up}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.time.toFixed(1), over.hits, over.shots, over.misses * 10)}</p>
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
