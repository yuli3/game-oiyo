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
import { drawParticles, drawSprite, spawnBurst, stepParticles, tint, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { BENCH, COLS, GONDOLA_SLUG, GONDOLA_STAGES, ROCK, SEATS, STAGE_COUNT, canLeave, current, newStation, starsFor, tap, type Station } from "../../lib/games/gondola-queue";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; gondolas: string; start: string; win: string; lose: string; peak: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", gondolas: "곤돌라 {0}대", start: "길이 트인 등산객을 눌러 태워요!", win: "모두 산에 올랐어요!", lose: "대기석이 꽉 찼어요", peak: "대기석 최대 {0}명",
    again: "다시 하기", next: "다음 단계",
    help: "색색 점퍼를 입은 등산객이 정류장에 북적여요. 곤돌라가 한 대씩 올라오고, 한 대에 같은 색 세 명이 타요. 위쪽 승강장까지 빈칸으로 길이 트인 등산객만 누를 수 있어요. 곤돌라와 색이 같으면 바로 타고, 다르면 대기석에 앉아요. 곤돌라가 차면 떠나고, 다음 곤돌라가 오면 대기석의 같은 색이 먼저 올라타요. 대기석 다섯 자리가 다 차면 끝이에요. 지금 곤돌라 색을 먼저 태우고, 그 색이 막혀 있으면 앞을 막은 사람을 치워요. 위쪽 작은 칸은 다음 곤돌라 색이에요. 모두 태우면 통과, 대기석을 덜 쓰면 별이 늘어요. 키보드는 화살표로 고르고 Space로 눌러요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", gondolas: "{0} gondolas", start: "Tap a hiker with a clear way out!", win: "Everyone is up the mountain!", lose: "The bench is full", peak: "Bench peaked at {0}",
    again: "Try again", next: "Next stage",
    help: "Hikers in coloured jackets crowd the station. Gondolas come up one at a time, each seating three of one colour. You can tap only a hiker with a clear path of empty squares to the platform at the top. One in the gondola's colour climbs aboard; any other sits on the bench. A full gondola leaves, and when the next arrives, waiting hikers of its colour hop on first. Fill all five bench seats and the station jams. Send the gondola's colour first, and if they're stuck, clear whoever is in their way. The small squares at the top show the next gondolas. Send everyone up to pass; use the bench less for more stars. Keys: arrows to choose, Space to tap.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", gondolas: "ゴンドラ {0}台", start: "道があいた登山者をタップして乗せよう！", win: "みんな山に登った！", lose: "ベンチがいっぱい", peak: "ベンチ最大 {0}人",
    again: "もう一度", next: "次の面",
    help: "色とりどりのジャケットの登山者が駅にひしめいています。ゴンドラが1台ずつ上がってきて、1台に同じ色が3人乗ります。上の乗り場まで空きマスで道がつながった登山者だけタップできます。ゴンドラと同じ色ならすぐ乗り、違えばベンチで待ちます。ゴンドラが満員になると出発し、次のゴンドラが来るとベンチの同じ色が先に乗ります。ベンチ5席が全部うまると終わり。今のゴンドラの色を先に乗せ、その色がふさがれていたら前をふさぐ人をどかしましょう。上の小さなマスは次のゴンドラの色です。全員乗せればクリア、ベンチを使わないほど星が増えます。キーボードは矢印で選び、Spaceで押します。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", gondolas: "缆车 {0} 辆", start: "点有路可走的登山客让他上车！", win: "大家都上山了！", lose: "候车椅坐满了", peak: "候车椅最多 {0} 人",
    again: "再来一次", next: "下一关",
    help: "穿各色外套的登山客挤满了车站。缆车一辆辆上来，每辆坐三个同色的人。只有经由空格能走到上方站台的登山客才能点。颜色和缆车相同就直接上车，不同就去候车椅等。缆车坐满就出发，下一辆到站时，候车椅上同色的人先上。五个候车座位全满就失败。先送当前缆车颜色的人，那种颜色被挡住时，就先挪开挡路的人。上方小格是接下来缆车的颜色。全部送上山即过关，候车椅用得越少星越多。键盘用方向键选择，空格点击。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", gondolas: "{0} télécabines", start: "Touchez un randonneur qui a la voie libre !", win: "Tout le monde est en haut !", lose: "Le banc est plein", peak: "Banc au plus à {0}",
    again: "Réessayer", next: "Niveau suivant",
    help: "Des randonneurs en vestes de couleur se pressent à la station. Les télécabines montent une à une, chacune pour trois personnes d'une couleur. Vous ne pouvez toucher qu'un randonneur qui a un chemin de cases vides jusqu'au quai en haut. S'il est de la couleur de la cabine, il monte ; sinon il attend sur le banc. Une cabine pleine part, et à l'arrivée de la suivante, les randonneurs du banc de sa couleur montent d'abord. Cinq places de banc occupées et la station est bloquée. Faites monter d'abord la couleur de la cabine, et si elle est coincée, dégagez qui lui barre la route. Les petites cases en haut montrent les cabines suivantes. Faites monter tout le monde pour réussir ; moins de banc, plus d'étoiles. Touches : flèches pour choisir, Espace pour toucher.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", gondolas: "{0} góndolas", start: "¡Toca a un excursionista con el camino libre!", win: "¡Todos han subido a la montaña!", lose: "El banco está lleno", peak: "Banco como mucho a {0}",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Excursionistas con chaquetas de colores abarrotan la estación. Las góndolas suben de una en una, cada una para tres personas de un color. Solo puedes tocar a quien tenga un camino de casillas vacías hasta el andén de arriba. Si es del color de la góndola, sube; si no, espera en el banco. Una góndola llena se va, y al llegar la siguiente, los del banco de su color suben primero. Si se llenan los cinco asientos del banco, la estación se atasca. Sube primero el color de la góndola y, si está bloqueado, aparta a quien le cierra el paso. Las casillas pequeñas de arriba muestran las próximas góndolas. Sube a todos para superar el nivel; usa menos el banco para más estrellas. Teclas: flechas para elegir, Espacio para tocar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:gondola-queue:muted";
const W = 360;
const H = 560;
const CW = 54;
const CH = 46;
const GX = (W - COLS * CW) / 2;
const GY = 186;
const JACKETS = ["#e03131", "#1971c2", "#f59f00", "#2f9e44", "#7048e8", "#e8590c"];
const HIKER: PixelArt = { palette: { s: "#ffd8a8", h: "#5c3a1e", j: "#e03131", p: "#343a40", b: "#a87545" }, rows: ["..hhh..", "..sss..", "..sss..", ".jjjjb.", "jjjjjjb", "j.jjj.b", "..p.p..", "..p.p.."] };
const HIKERS = JACKETS.map((j) => tint(HIKER, { j }));

export default function GondolaQueue({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; peak: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stationRef = useRef<Station | null>(null);
  const taps = useRef<number[]>([]);
  const cursor = useRef(0);
  const keyed = useRef(false); // the keyboard cursor shows once a key is used
  const ride = useRef(0); // the gondola's swing as it leaves
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const st = GONDOLA_STAGES[stage];

  useRunRecord(GONDOLA_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    stationRef.current = newStation(GONDOLA_STAGES[s]);
    taps.current = [];
    cursor.current = 0;
    ride.current = 0;
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(GONDOLA_SLUG, STAGE_COUNT);
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
      const s = stationRef.current;
      if (!s) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const rows = s.stage.rows;
      // taps are read once per frame
      for (const i of taps.current.splice(0)) {
        if (s.over) break;
        const r = tap(s, i);
        const x = GX + (i % COLS) * CW + CW / 2;
        const y = GY + Math.floor(i / COLS) * CH + CH / 2;
        if (r === "blocked") sfx("fail");
        else if (r === "departed") {
          ride.current = 1;
          spawnBurst(parts.current, W / 2, 70, ["#ffd43b", "#fff"], 18, 120, 3);
          sfx("combo");
        } else if (r === "boarded") {
          spawnBurst(parts.current, x, y, ["#fff", "#8ce99a"], 8, 80, 2);
          sfx("place");
        } else if (r === "benched") sfx("tap");
        if (s.over) {
          setOver({ won: s.won, stars: starsFor(s), peak: s.peak });
          if (s.won) {
            setCleared(markStageCleared(GONDOLA_SLUG, s.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      ride.current = Math.max(0, ride.current - dt * 1.5);
      stepParticles(parts.current, dt, 160);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // sky and mountain
        ctx.fillStyle = "#a5d8ff";
        ctx.fillRect(0, 0, W, 180);
        ctx.fillStyle = "#8ce99a";
        for (let x = 0; x < W; x += 6) {
          const h = 40 + Math.round(Math.abs(Math.sin(x / 70)) * 50);
          ctx.fillRect(x, 120 - h + 60, 6, h);
        }
        // the cable and the gondola at the platform
        ctx.fillStyle = "#495057";
        ctx.fillRect(0, 22, W, 3);
        const col = current(s);
        // a new gondola slides in along the cable after one leaves
        const gx = W / 2 - 50 - Math.round(ride.current * ride.current * 220);
        const gy = 30;
        if (col >= 0) {
          ctx.fillStyle = "#343a40";
          ctx.fillRect(gx + 48, 22, 4, 12);
          ctx.fillStyle = JACKETS[col];
          ctx.fillRect(gx, gy + 4, 100, 52);
          ctx.fillStyle = "#e7f5ff";
          ctx.fillRect(gx + 8, gy + 12, 84, 22);
          for (let k = 0; k < SEATS; k++) {
            if (k < s.aboard) drawSprite(ctx, HIKERS[col], gx + 22 + k * 28, gy + 26, { scale: 3 });
            else {
              ctx.fillStyle = "rgba(255,255,255,0.7)";
              ctx.fillRect(gx + 14 + k * 28, gy + 38, 16, 12);
            }
          }
        }
        // the gondolas still to come
        for (let k = 1; k <= 4 && s.next + k < s.stage.gondolas.length; k++) {
          ctx.fillStyle = JACKETS[s.stage.gondolas[s.next + k]];
          ctx.fillRect(W / 2 + 60 + k * 24, 34, 18, 18);
        }
        ctx.fillStyle = "#212529";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`${s.next}/${s.stage.gondolas.length}`, 10, 48);
        // the bench
        ctx.fillStyle = "#a87545";
        ctx.fillRect(20, 108, W - 40, 8);
        for (let k = 0; k < BENCH; k++) {
          const x = 30 + k * 62;
          ctx.fillStyle = k === BENCH - 1 && s.bench.length >= BENCH - 1 ? "#ffc9c9" : "#f1f3f5";
          ctx.fillRect(x, 116, 52, 52);
          if (k < s.bench.length) drawSprite(ctx, HIKERS[s.bench[k]], x + 26, 142, { scale: 4 });
        }
        // the station floor
        ctx.fillStyle = "#ced4da";
        ctx.fillRect(GX - 6, GY - 8, COLS * CW + 12, rows * CH + 14);
        ctx.fillStyle = "#868e96";
        ctx.fillRect(GX - 6, GY - 8, COLS * CW + 12, 4);
        for (let i = 0; i < rows * COLS; i++) {
          const x = GX + (i % COLS) * CW;
          const y = GY + Math.floor(i / COLS) * CH;
          const v = s.grid[i];
          ctx.fillStyle = (Math.floor(i / COLS) + (i % COLS)) % 2 ? "#e9ecef" : "#dee2e6";
          ctx.fillRect(x, y, CW, CH);
          if (v === ROCK) {
            ctx.fillStyle = "#868e96";
            ctx.fillRect(x + 6, y + 8, CW - 12, CH - 12);
            ctx.fillStyle = "#adb5bd";
            ctx.fillRect(x + 10, y + 10, 14, 8);
          } else if (v >= 0) {
            const free = canLeave(s.grid, rows, i);
            drawSprite(ctx, HIKERS[v], x + CW / 2, y + CH / 2, { scale: 5, alpha: free ? 1 : 0.55 });
            if (free) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(x + CW / 2 - 3, y + 2, 6, 3);
            }
          }
          if (i === cursor.current && keyed.current) {
            ctx.strokeStyle = "#1971c2";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, CW - 4, CH - 4);
            ctx.lineWidth = 1;
          }
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stationRef.current;
    if (!s || s.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    const col = Math.floor((x - GX) / CW);
    const row = Math.floor((y - GY) / CH);
    if (col >= 0 && col < COLS && row >= 0 && row < s.stage.rows) {
      cursor.current = row * COLS + col;
      taps.current.push(cursor.current);
    }
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const s = stationRef.current;
    if (!s || s.over) return;
    const rows = s.stage.rows;
    const r = Math.floor(cursor.current / COLS);
    const k = cursor.current % COLS;
    if (e.key === "ArrowUp") cursor.current = Math.max(0, r - 1) * COLS + k;
    else if (e.key === "ArrowDown") cursor.current = Math.min(rows - 1, r + 1) * COLS + k;
    else if (e.key === "ArrowLeft") cursor.current = r * COLS + Math.max(0, k - 1);
    else if (e.key === "ArrowRight") cursor.current = r * COLS + Math.min(COLS - 1, k + 1);
    else if (e.key === " " || e.key === "Enter") taps.current.push(cursor.current);
    else return;
    e.preventDefault();
    keyed.current = true;
    setTouched(true);
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
      data-game="gondola-queue"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.gondolas, st.gondolas.length)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.peak, over.peak)}</p>
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
