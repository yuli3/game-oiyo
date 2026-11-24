import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Search, Volume2, VolumeX } from "lucide-react";
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
import { CAKE_SLUG, CAKE_STAGES, MAX_WRONG, STAGE_COUNT, accuse, clueText, creamText, label, mark, newCase, starsFor, tick, type Case } from "../../lib/games/cake-thief";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; time: string; clues: string; who: string; where: string; accuse: string; guesses: string; start: string; wrong: string; win: string; lose: string; result: string; answer: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", time: "{0}초", clues: "단서", who: "누가?", where: "어디서?", accuse: "범인 지목", guesses: "남은 기회 {0}", start: "칸을 눌러 ×와 ●를 표시해요!", wrong: "범인이 아니에요!", win: "범인을 잡았어요!", lose: "범인이 달아났어요", result: "{0}초 · 헛짚음 {1}번", answer: "범인: {0}, {1}",
    again: "다시 하기", next: "다음 단계",
    help: "생일 케이크가 사라졌어요. 동물마다 다른 방에서 다른 물건을 들고 있었고, 아래 단서로 모든 것이 하나로 정해져요. 격자 칸을 한 번 누르면 ×(아니다), 두 번 누르면 ●(맞다)예요. ●가 있는 줄의 다른 칸은 모두 ×이고, 한 줄에 칸이 하나만 남으면 그 칸이 ●예요. 위쪽 격자의 ●와 오른쪽 아래 격자를 이어서 생각하면 더 풀려요(고양이가 부엌에 있었고 숟가락을 들었다면, 부엌에는 숟가락이 있었어요). 크림이 묻은 물건을 든 동물이 범인이에요. 누가, 어디서인지 골라 '범인 지목'을 눌러요. 두 번 틀리면 범인이 달아나요. 키보드: 화살표로 칸 이동, Space로 표시.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", time: "{0}s", clues: "Clues", who: "Who?", where: "Where?", accuse: "Name the thief", guesses: "{0} guesses left", start: "Tap squares to mark × and ●!", wrong: "Not the thief!", win: "Thief caught!", lose: "The thief got away", result: "{0}s · {1} wrong guesses", answer: "Thief: {0}, {1}",
    again: "Try again", next: "Next stage",
    help: "The birthday cake has vanished. Each animal was in a different room holding a different thing, and the clues below pin it all down. Tap a square once for × (no), twice for ● (yes). A ● crosses out the rest of its row and column, and a row with one square left gets the ●. Link the top grids with the bottom-right one to get further (if the cat was in the kitchen and had the spoon, the kitchen had the spoon). The thief is whoever held the thing with cream on it. Pick who and where, then Name the thief. Two wrong guesses and the thief gets away. Keyboard: arrows move, Space marks.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", time: "{0}秒", clues: "手がかり", who: "だれ？", where: "どこ？", accuse: "犯人を指名", guesses: "残り {0}回", start: "マスを押して×と●をつけよう！", wrong: "犯人じゃない！", win: "犯人をつかまえた！", lose: "犯人に逃げられた", result: "{0}秒・はずれ {1}回", answer: "犯人：{0}、{1}",
    again: "もう一度", next: "次の面",
    help: "誕生日ケーキが消えました。動物たちはそれぞれ違う部屋で違うものを持っていて、下の手がかりで全部が一つに決まります。マスを1回押すと×（ちがう）、2回押すと●（そう）。●のある行と列のほかのマスはすべて×、行に1マスだけ残ればそれが●です。上の表の●と右下の表をつなげて考えるとさらに解けます（ねこが台所にいてスプーンを持っていたなら、台所にはスプーンがあった）。クリームのついたものを持っていた動物が犯人。だれが、どこでかを選んで「犯人を指名」。2回まちがえると逃げられます。キーボード：矢印で移動、Spaceで記入。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", time: "{0}秒", clues: "线索", who: "是谁？", where: "在哪？", accuse: "指认小偷", guesses: "还剩 {0} 次", start: "点格子标记 × 和 ●！", wrong: "不是小偷！", win: "抓到小偷了！", lose: "小偷跑掉了", result: "{0}秒 · 猜错 {1} 次", answer: "小偷：{0}，{1}",
    again: "再来一次", next: "下一关",
    help: "生日蛋糕不见了。每只动物都在不同的房间、拿着不同的东西，下面的线索能把一切确定下来。点格子一次是×（不是），两次是●（是）。有●的行和列其余格子都是×，一行只剩一个格子时它就是●。把上方表格的●和右下表格联系起来能推出更多（小猫在厨房又拿着勺子，那厨房里就有勺子）。拿着沾奶油东西的动物就是小偷。选出是谁、在哪，然后点“指认小偷”。猜错两次小偷就跑了。键盘：方向键移动，Space标记。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", time: "{0} s", clues: "Indices", who: "Qui ?", where: "Où ?", accuse: "Désigner le voleur", guesses: "{0} essais restants", start: "Touchez les cases pour marquer × et ● !", wrong: "Ce n'est pas le voleur !", win: "Voleur attrapé !", lose: "Le voleur s'est enfui", result: "{0} s · {1} erreurs", answer: "Voleur : {0}, {1}",
    again: "Réessayer", next: "Niveau suivant",
    help: "Le gâteau d'anniversaire a disparu. Chaque animal était dans une pièce différente avec un objet différent, et les indices ci-dessous fixent tout. Touchez une case une fois pour × (non), deux fois pour ● (oui). Un ● barre le reste de sa ligne et de sa colonne, et une ligne où il ne reste qu'une case reçoit le ●. Reliez les grilles du haut à celle d'en bas à droite pour aller plus loin (si le chat était dans la cuisine avec la cuillère, la cuillère était dans la cuisine). Le voleur est celui qui tenait l'objet plein de crème. Choisissez qui et où, puis Désigner le voleur. Deux erreurs et il s'enfuit. Clavier : flèches pour bouger, Espace pour marquer.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", time: "{0} s", clues: "Pistas", who: "¿Quién?", where: "¿Dónde?", accuse: "Señalar al ladrón", guesses: "Quedan {0} intentos", start: "¡Toca las casillas para marcar × y ●!", wrong: "¡No es el ladrón!", win: "¡Ladrón atrapado!", lose: "El ladrón escapó", result: "{0} s · {1} fallos", answer: "Ladrón: {0}, {1}",
    again: "Reintentar", next: "Siguiente nivel",
    help: "La tarta de cumpleaños ha desaparecido. Cada animal estaba en un cuarto distinto con una cosa distinta, y las pistas de abajo lo fijan todo. Toca una casilla una vez para × (no) y dos para ● (sí). Un ● tacha el resto de su fila y columna, y una fila con una sola casilla libre se lleva el ●. Une las cuadrículas de arriba con la de abajo a la derecha para avanzar más (si el gato estaba en la cocina con la cuchara, la cuchara estaba en la cocina). El ladrón es quien tenía la cosa con nata. Elige quién y dónde, y pulsa Señalar al ladrón. Con dos fallos, escapa. Teclado: flechas para moverte, Espacio para marcar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:cake-thief:muted";
const W = 360;
const H = 370;
const LABEL_W = 78;
const HEAD_H = 86;
const cellOf = (n: number) => Math.floor((W - LABEL_W - 4) / (2 * n));
/** Where a grid cell sits: grid 0 suspect×room, 1 suspect×item, 2 room×item. */
function cellRect(n: number, grid: number, a: number, b: number) {
  const s = cellOf(n);
  const x = LABEL_W + (grid === 0 ? b : n + b) * s;
  const y = HEAD_H + (grid === 2 ? n + a : a) * s;
  return { x, y, s };
}

export default function CakeThief({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; t: number; wrong: number }>(null);
  const [touched, setTouched] = useState(false);
  const [who, setWho] = useState(-1);
  const [where, setWhere] = useState(-1);
  const [wrongs, setWrongs] = useState(0);
  const [flash, setFlash] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const caseRef = useRef<Case>(newCase(CAKE_STAGES[0]));
  const input = useRef<Array<{ grid: number; a: number; b: number }>>([]);
  const cursor = useRef<{ grid: number; a: number; b: number } | null>(null);
  const started = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const st = CAKE_STAGES[stage];

  useRunRecord(CAKE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    caseRef.current = newCase(CAKE_STAGES[s]);
    input.current = [];
    cursor.current = null;
    started.current = false;
    parts.current = [];
    setOver(null);
    setTouched(false);
    setWho(-1);
    setWhere(-1);
    setWrongs(0);
    setFlash("");
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CAKE_SLUG, STAGE_COUNT);
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
      const cs = caseRef.current;
      const s = cs.stage;
      const n = s.n;
      const lo = localeRef.current;
      // taps are read once per frame
      for (const q of input.current.splice(0)) {
        started.current = true;
        const v = mark(cs, q.grid, q.a, q.b);
        if (v >= 0) sfx(v === 2 ? "place" : "tap");
      }
      if (started.current) tick(cs, dt);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#fff8ec";
        ctx.fillRect(0, 0, W, H);
        const size = cellOf(n);
        // headers: rooms and items across the top (turned on their side), suspects and rooms down the left
        ctx.fillStyle = "#5c3d2e";
        ctx.font = `bold ${Math.min(13, size - 6)}px sans-serif`;
        for (let k = 0; k < 2 * n; k++) {
          const word = k < n ? label(lo, "rooms", s.rooms[k]) : label(lo, "items", s.items[k - n]);
          ctx.save();
          ctx.translate(LABEL_W + k * size + size / 2 + 4, HEAD_H - 6);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "left";
          ctx.fillText(word, 0, 0);
          ctx.restore();
        }
        ctx.textAlign = "right";
        for (let k = 0; k < 2 * n; k++) {
          const word = k < n ? label(lo, "suspects", s.suspects[k]) : label(lo, "rooms", s.rooms[k - n]);
          ctx.fillText(word, LABEL_W - 6, HEAD_H + k * size + size / 2 + 5);
        }
        // the three grids
        for (let grid = 0; grid < 3; grid++)
          for (let a = 0; a < n; a++)
            for (let b = 0; b < n; b++) {
              const r = cellRect(n, grid, a, b);
              ctx.fillStyle = grid === 0 ? "#ffe8cc" : grid === 1 ? "#e7f5ff" : "#ebfbee";
              ctx.fillRect(r.x + 1, r.y + 1, r.s - 2, r.s - 2);
              const v = cs.marks[grid][a][b];
              ctx.textAlign = "center";
              if (v === 1) {
                ctx.strokeStyle = "#868e96";
                ctx.lineWidth = 2;
                const p = r.s * 0.28;
                ctx.beginPath();
                ctx.moveTo(r.x + p, r.y + p);
                ctx.lineTo(r.x + r.s - p, r.y + r.s - p);
                ctx.moveTo(r.x + r.s - p, r.y + p);
                ctx.lineTo(r.x + p, r.y + r.s - p);
                ctx.stroke();
              } else if (v === 2) {
                ctx.fillStyle = "#e8590c";
                ctx.beginPath();
                ctx.arc(r.x + r.s / 2, r.y + r.s / 2, r.s * 0.28, 0, Math.PI * 2);
                ctx.fill();
              }
            }
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#5c3d2e";
        for (let grid = 0; grid < 3; grid++) {
          const r = cellRect(n, grid, 0, 0);
          ctx.strokeRect(r.x, r.y, size * n, size * n);
        }
        const cur = cursor.current;
        if (cur) {
          const r = cellRect(n, cur.grid, cur.a, cur.b);
          ctx.strokeStyle = "#1971c2";
          ctx.lineWidth = 3;
          ctx.strokeRect(r.x + 1, r.y + 1, r.s - 2, r.s - 2);
        }
        ctx.lineWidth = 1;
        // the cake, with a bite out of it, in the empty corner
        const cx = LABEL_W + n * size / 2;
        const cy = HEAD_H + n * size + (n * size) / 2;
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(cx - 30, cy - 6, 60, 26);
        ctx.fillStyle = "#f783ac";
        ctx.fillRect(cx - 30, cy - 12, 60, 8);
        ctx.fillStyle = "#fff8ec";
        ctx.fillRect(cx + 12, cy - 12, 18, 18);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(cx - 4, cy - 20, 8, 8);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cs = caseRef.current;
    if (cs.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    const n = cs.stage.n;
    const size = cellOf(n);
    const col = Math.floor((x - LABEL_W) / size);
    const row = Math.floor((y - HEAD_H) / size);
    if (col < 0 || row < 0 || col >= 2 * n || row >= 2 * n) return;
    if (row >= n && col < n) return; // the cake corner
    const grid = row < n ? (col < n ? 0 : 1) : 2;
    const q = { grid, a: row < n ? row : row - n, b: col < n ? col : col - n };
    cursor.current = q;
    setTouched(true);
    input.current.push(q);
  };

  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const cs = caseRef.current;
    if (cs.over) return;
    const n = cs.stage.n;
    // the cursor moves over the whole 2n × 2n sheet, skipping the cake corner
    const cur = cursor.current ?? { grid: 0, a: 0, b: 0 };
    let row = cur.grid === 2 ? cur.a + n : cur.a;
    let col = cur.grid === 0 ? cur.b : cur.b + n;
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      if (e.key === "ArrowLeft") col = Math.max(0, col - 1);
      if (e.key === "ArrowRight") col = Math.min(2 * n - 1, col + 1);
      if (e.key === "ArrowUp") row = Math.max(0, row - 1);
      if (e.key === "ArrowDown") row = Math.min(2 * n - 1, row + 1);
      if (row >= n && col < n) col = n;
      const grid = row < n ? (col < n ? 0 : 1) : 2;
      cursor.current = { grid, a: row < n ? row : row - n, b: col < n ? col : col - n };
      setTouched(true);
    } else if (e.key === " " && cursor.current) {
      e.preventDefault();
      input.current.push(cursor.current);
    }
  };

  const doAccuse = () => {
    const cs = caseRef.current;
    if (cs.over || who < 0 || where < 0) return;
    started.current = true;
    const r = accuse(cs, who, where);
    if (r === "wrong") {
      setWrongs(cs.wrong);
      setFlash(c.wrong);
      sfx("fail");
    }
    if (cs.over) {
      setOver({ won: cs.won, stars: starsFor(cs), t: Math.round(cs.t), wrong: cs.wrong });
      if (cs.won) {
        setCleared(markStageCleared(CAKE_SLUG, cs.stage.stage, STAGE_COUNT));
        spawnBurst(parts.current, W / 2, 180, ["#ffd43b", "#fff", "#f783ac", "#e8590c"], 30, 150, 3);
        sfx("win");
      } else sfx("lose");
    }
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  const lo = locale;
  return (
    <div
      ref={containerRef}
      data-game="cake-thief"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.guesses, MAX_WRONG - wrongs)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 bottom-4 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{over.won ? fill(c.result, over.t, over.wrong) : fill(c.answer, label(lo, "suspects", st.suspects[st.thief]), label(lo, "rooms", st.rooms[st.room[st.thief]]))}</p>
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

      <section className="space-y-1 rounded-lg border border-border p-3" aria-label={c.clues}>
        <p className="text-sm font-bold text-primary">{creamText(st, lo)}</p>
        <ol className="list-decimal space-y-0.5 pl-5 text-sm">
          {st.clues.map((cl, i) => (
            <li key={i}>{clueText(st, cl, lo)}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-sm font-medium">{c.who}</p>
        <div className="flex flex-wrap gap-1.5">
          {st.suspects.map((sIdx, i) => (
            <Button key={i} variant={who === i ? "default" : "outline"} className="min-h-11" onClick={() => setWho(i)} disabled={Boolean(over)}>
              {label(lo, "suspects", sIdx)}
            </Button>
          ))}
        </div>
        <p className="text-sm font-medium">{c.where}</p>
        <div className="flex flex-wrap gap-1.5">
          {st.rooms.map((rIdx, i) => (
            <Button key={i} variant={where === i ? "default" : "outline"} className="min-h-11" onClick={() => setWhere(i)} disabled={Boolean(over)}>
              {label(lo, "rooms", rIdx)}
            </Button>
          ))}
        </div>
        <Button className="min-h-12 w-full" onClick={doAccuse} disabled={Boolean(over) || who < 0 || where < 0}>
          <Search className="size-5" />
          <span>{c.accuse}</span>
        </Button>
        {flash && !over ? <p className="text-sm font-bold text-destructive" role="status">{flash}</p> : null}
      </section>
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
