import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { FIELD_H, FIELD_W, HEARTS, KNIFE_X, LEVELS, LOG_R, LOG_Y, SLICE_SLUG, STAGE_COUNT, cut, newSlice, starsFor, stepSlice, swipeAngle, type SliceQuality, type SliceState } from "../../lib/games/tteok-slice";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; bowl: string; start: string; win: string; lose: string; out: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; slant: string; q: Record<SliceQuality, string>;
}> = {
  ko: {
    stage: "{0}단계", bowl: "떡 {0}/{1}", start: "칼처럼 아래로 쓸어 썰어요", win: "떡국 한 그릇 완성!", lose: "떡을 너무 망쳤어요", out: "가래떡이 모자라요",
    result: "잘 썬 떡 {0}개 · 딱 맞음 {1}개", again: "다시 하기", next: "다음 단계", slant: "어슷썰기",
    q: { perfect: "딱 좋아!", good: "좋아", thin: "너무 얇아요", thick: "너무 두꺼워요", chunk: "덩어리!", flat: "비스듬히!" },
    help: "가래떡이 칼 쪽으로 밀려와요. 화면을 위에서 아래로 쓸면 칼이 내려가 떡을 썰어요. 떡 두께는 지난번에 썬 뒤로 떡이 밀려온 만큼이에요. 도마 위 노란 눈금과 같은 두께로 썰면 떡국 그릇에 들어가요. 너무 얇거나 두껍게 썰거나 너무 오래 기다리면 하트가 하나 줄어요. 6단계부터는 손가락을 비스듬히 그어 어슷썰기를 해야 하고, 뒤로 가면 떡 위 연필 자국이 사라지고 미는 속도가 들쭉날쭉해져요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", bowl: "Slices {0}/{1}", start: "Swipe down like a knife to cut", win: "A bowl of tteokguk is ready!", lose: "Too many slices went wrong", out: "The rice-cake log ran out",
    result: "{0} good slices · {1} just right", again: "Play again", next: "Next stage", slant: "Slant cut",
    q: { perfect: "Just right!", good: "Good", thin: "Too thin", thick: "Too thick", chunk: "A lump!", flat: "On the slant!" },
    help: "The rice-cake log slides toward the knife. Swipe down the screen and the knife comes down to cut. A slice is as thick as the log moved since your last cut. Match the yellow mark on the board and the slice goes into the soup bowl. A slice that is too thin or too thick, or waiting too long, costs a heart. From stage 6, swipe on a slant to cut the oval slices tteokguk needs; later the pencil marks on the log vanish and the pushing speed rises and falls.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", bowl: "おもち {0}/{1}", start: "包丁のように下へスワイプして切ろう", win: "トックク一杯できあがり！", lose: "切り損じが多すぎた", out: "棒もちが足りない",
    result: "上手に切れた {0}枚 · ぴったり {1}枚", again: "もう一度", next: "次の面", slant: "斜め切り",
    q: { perfect: "ぴったり!", good: "いいね", thin: "薄すぎ", thick: "厚すぎ", chunk: "かたまり!", flat: "斜めに!" },
    help: "棒もちが包丁のほうへ押し出されます。画面を上から下へスワイプすると包丁が下りて切れます。厚さは前に切ってから押し出された分です。まな板の黄色い目盛りと同じ厚さに切るとスープの器に入ります。薄すぎ・厚すぎ・待ちすぎはハートが1つ減ります。6面からは斜めにスワイプして斜め切りに。後半はもちの鉛筆の印が消え、押す速さも変わります。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", bowl: "年糕片 {0}/{1}", start: "像刀一样往下划来切", win: "一碗年糕汤做好了！", lose: "切坏太多了", out: "年糕条不够了",
    result: "切好 {0}片 · 刚刚好 {1}片", again: "再玩一次", next: "下一关", slant: "斜切",
    q: { perfect: "刚刚好!", good: "不错", thin: "太薄了", thick: "太厚了", chunk: "一大块!", flat: "要斜着!" },
    help: "年糕条被推向菜刀。在屏幕上从上往下划，刀就落下切一片。厚度等于上次切完后年糕被推过来的长度。切得和砧板上的黄色刻度一样厚，就会放进汤碗里。太薄、太厚或等太久都会扣一颗心。从第6关起要斜着划来斜切；越往后，年糕上的铅笔记号会消失，推的速度也忽快忽慢。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", bowl: "Tranches {0}/{1}", start: "Glissez vers le bas comme un couteau", win: "Un bol de tteokguk est prêt !", lose: "Trop de tranches ratées", out: "Plus assez de bâton de riz",
    result: "{0} bonnes tranches · {1} parfaites", again: "Rejouer", next: "Niveau suivant", slant: "Coupe en biais",
    q: { perfect: "Parfait !", good: "Bien", thin: "Trop fine", thick: "Trop épaisse", chunk: "Un bloc !", flat: "En biais !" },
    help: "Le bâton de gâteau de riz glisse vers le couteau. Glissez vers le bas sur l'écran et le couteau tranche. L'épaisseur est la distance parcourue depuis votre dernière coupe. Coupez à la taille du repère jaune sur la planche et la tranche va dans le bol de soupe. Trop fine, trop épaisse, ou trop d'attente : vous perdez un cœur. Dès le niveau 6, glissez en biais pour des tranches ovales ; plus loin, les traits de crayon disparaissent et la poussée accélère et ralentit.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", bowl: "Rodajas {0}/{1}", start: "Desliza hacia abajo como un cuchillo", win: "¡Un tazón de tteokguk listo!", lose: "Demasiadas rodajas mal cortadas", out: "Se acabó el pastel de arroz",
    result: "{0} rodajas buenas · {1} perfectas", again: "Otra vez", next: "Siguiente nivel", slant: "Corte sesgado",
    q: { perfect: "¡Perfecto!", good: "Bien", thin: "Muy fina", thick: "Muy gruesa", chunk: "¡Un trozo!", flat: "¡En diagonal!" },
    help: "El rollo de pastel de arroz avanza hacia el cuchillo. Desliza hacia abajo en la pantalla y el cuchillo corta. El grosor es lo que avanzó el rollo desde el último corte. Si coincide con la marca amarilla de la tabla, la rodaja va al tazón de sopa. Muy fina, muy gruesa o esperar demasiado cuesta un corazón. Desde el nivel 6, desliza en diagonal para cortar rodajas ovaladas; más adelante desaparecen las marcas de lápiz y el empuje acelera y frena.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:tteok-slice:muted";
const BOARD_TOP = LOG_Y - 44;
const BOARD_BOTTOM = LOG_Y + 60;

const KNIFE: PixelArt = {
  palette: { s: "#dee2e6", w: "#f8f9fa", d: "#868e96", b: "#5c3d2e", k: "#3b2a20" },
  rows: [".kk.", ".bb.", ".bb.", ".kk.", "dssd", "dswd", "dssd", "dswd", "dssd", "dssd", "dsd.", "dd..", "d..."],
};
const HAND: PixelArt = {
  palette: { s: "#f1c27d", d: "#e0a96d", r: "#c92a2a", w: "#fff" },
  rows: ["..ssss.rr", ".sssssdrr", "sssssddrr", "ssssdd.rr", ".ssss..rr"],
};
const BOWL: PixelArt = {
  palette: { w: "#f8f9fa", b: "#1c4f8c", g: "#dee2e6", y: "#ffd43b", e: "#ffffff", s: "#f1e3c6" },
  rows: ["bbbbbbbbbbbbbb", "bssssssssssssb", ".bggggggggggb.", "..bwwwwwwwwb..", "...bbbbbbbb...", ".....bbbb....."],
};
const EGG: PixelArt = { palette: { y: "#fcc419", w: "#ffffff" }, rows: ["wyw", "yyy", "wyw"] };
const GREEN: PixelArt = { palette: { g: "#2f9e44" }, rows: ["g.g", ".g."] };

interface Pop { x: number; y: number; text: string; t: number; color: string }
interface Fall { x: number; y: number; vy: number; w: number; slant: number; good: boolean; t: number }

export default function TteokSlice({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ good: 0, hearts: HEARTS });
  const [over, setOver] = useState<null | { won: boolean; stars: number; out: boolean; good: number; perfect: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<SliceState>(newSlice(0));
  const live = useRef(false);
  const swipe = useRef<null | { id: number; x: number; y: number; done: boolean }>(null);
  const falls = useRef<Fall[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const level = LEVELS[stage];

  useRunRecord(SLICE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    sRef.current = newSlice(s);
    live.current = false;
    swipe.current = null;
    falls.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ good: 0, hearts: HEARTS });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SLICE_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const endCheck = useCallback(() => {
    const s = sRef.current;
    setHud({ good: s.good, hearts: s.hearts });
    if (!s.over) return;
    setOver({ won: s.won, stars: starsFor(s), out: !s.won && s.hearts > 0, good: s.good, perfect: s.perfect });
    if (s.won) {
      setCleared(markStageCleared(SLICE_SLUG, s.level.stage, STAGE_COUNT));
      spawnBurst(parts.current, 70, 110, ["#ffd43b", "#ffffff", "#2f9e44"], 30, 140, Math.floor(s.time * 1000));
      sfx("win");
    } else sfx("lose");
  }, [sfx]);

  const showSlice = useCallback((q: SliceQuality, thick: number, angle: number) => {
    const good = q === "perfect" || q === "good";
    falls.current.push({ x: KNIFE_X - thick / 2, y: LOG_Y, vy: -60, w: thick, slant: angle, good, t: 0 });
    const color = q === "perfect" ? "#2f9e44" : q === "good" ? "#1c7ed6" : q === "flat" ? "#f08c00" : "#c92a2a";
    pops.current.push({ x: KNIFE_X, y: LOG_Y - 60, text: c.q[q], t: 0.9, color });
    if (q === "perfect") spawnBurst(parts.current, KNIFE_X, LOG_Y, ["#ffffff", "#ffd43b"], 10, 90, Math.floor(performance.now()));
    sfx(q === "perfect" ? "combo" : good ? "success" : "fail");
  }, [c.q, sfx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const s = sRef.current;
      const l = s.level;
      if (live.current && !s.over) {
        const before = s.slices.length;
        stepSlice(s, dt);
        if (s.slices.length > before) {
          const sl = s.slices[s.slices.length - 1];
          showSlice(sl.quality, sl.thick, 0);
        }
        if (s.over || s.slices.length > before) endCheck();
      }
      stepParticles(parts.current, dt, 160);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);
      for (const f of falls.current) {
        f.t += dt;
        if (f.good) {
          // good slices hop into the soup bowl
          const k = Math.min(1, f.t / 0.55);
          f.x += (70 - f.x) * Math.min(1, dt * 7);
          f.y = LOG_Y + (120 - LOG_Y) * k - Math.sin(k * Math.PI) * 70;
        } else {
          f.vy += 700 * dt;
          f.y += f.vy * dt;
          f.x -= 40 * dt;
        }
      }
      falls.current = falls.current.filter((f) => f.t < 1.2);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // kitchen wall with a lattice window and the stove
        ctx.fillStyle = "#f3e5cf";
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        ctx.fillStyle = "#e9d3b0";
        for (let y = 0; y < BOARD_TOP; y += 24) ctx.fillRect(0, y, FIELD_W, 2);
        ctx.fillStyle = "#fff9ef";
        ctx.fillRect(210, 30, 120, 90);
        ctx.fillStyle = "#8a5a3b";
        for (let x = 210; x <= 330; x += 30) ctx.fillRect(x, 30, 4, 94);
        for (let y = 30; y <= 120; y += 30) ctx.fillRect(210, y, 124, 4);
        // soup bowl with the slices served so far
        drawSprite(ctx, BOWL, 70, 128, { scale: 6 });
        const shown = Math.min(s.good, 16);
        for (let k = 0; k < shown; k++) {
          const bx = 34 + ((k * 23) % 72);
          const by = 112 + (k % 3) * 4 - Math.floor(k / 6) * 3;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(bx, by, 12, 7);
          ctx.fillStyle = "#e9ecef";
          ctx.fillRect(bx, by + 5, 12, 2);
        }
        if (s.won) {
          drawSprite(ctx, EGG, 60, 108, { scale: 3 });
          drawSprite(ctx, GREEN, 86, 110, { scale: 3 });
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          for (let k = 0; k < 3; k++) ctx.fillRect(48 + k * 18, 88 - ((t * 20 + k * 7) % 20), 3, 8);
        }
        // cutting board
        ctx.fillStyle = "#c0894a";
        ctx.fillRect(14, BOARD_TOP, FIELD_W - 28, BOARD_BOTTOM - BOARD_TOP);
        ctx.fillStyle = "#a9733c";
        for (let y = BOARD_TOP + 10; y < BOARD_BOTTOM; y += 14) ctx.fillRect(14, y, FIELD_W - 28, 2);
        ctx.fillStyle = "#8a5a3b";
        ctx.fillRect(14, BOARD_BOTTOM, FIELD_W - 28, 8);
        // the yellow size mark just left of the knife
        const mx = KNIFE_X - l.thick;
        ctx.fillStyle = "#fab005";
        ctx.fillRect(mx, LOG_Y + LOG_R + 10, l.thick, 4);
        ctx.fillRect(mx, LOG_Y + LOG_R + 4, 3, 14);
        ctx.fillRect(KNIFE_X - 3, LOG_Y + LOG_R + 4, 3, 14);
        // the log: from the last cut (left of the knife) back to the hand pushing it
        const front = KNIFE_X - s.fed;
        const back = Math.min(FIELD_W - 30, KNIFE_X + s.left);
        if (back > front) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(Math.round(front), LOG_Y - LOG_R, Math.round(back - front), LOG_R * 2);
          ctx.fillStyle = "#f1f3f5";
          ctx.fillRect(Math.round(front), LOG_Y + LOG_R - 8, Math.round(back - front), 8);
          ctx.fillStyle = "#e9ecef";
          ctx.fillRect(Math.round(front), LOG_Y - LOG_R, 3, LOG_R * 2);
          if (l.marks) {
            ctx.fillStyle = "#868e96";
            for (let x = front + l.thick; x < back; x += l.thick) ctx.fillRect(Math.round(x), LOG_Y - LOG_R, 2, 8);
          }
        }
        drawSprite(ctx, HAND, Math.min(FIELD_W - 20, back + 14), LOG_Y, { scale: 4 });
        // the knife hangs over the log and drops on each cut
        const since = s.time - s.cutAt;
        const drop = s.cutAt >= 0 && since < 0.18 ? Math.sin((since / 0.18) * Math.PI) : 0;
        const tilt = l.slant ? 0.45 : 0;
        drawSprite(ctx, KNIFE, KNIFE_X, LOG_Y - 76 + drop * 56, { scale: 5, rotate: tilt });
        if (l.slant) {
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#8a5a3b";
          ctx.fillText(c.slant, KNIFE_X + 50, LOG_Y - 120);
        }
        // slices in flight
        for (const f of falls.current) {
          ctx.save();
          ctx.translate(Math.round(f.x), Math.round(f.y));
          ctx.rotate(f.slant * 0.6);
          ctx.fillStyle = f.good ? "#ffffff" : "#f8f0e0";
          const w = Math.max(4, Math.round(f.w));
          ctx.fillRect(-w / 2, -LOG_R, w, LOG_R * 2);
          ctx.fillStyle = "#e9ecef";
          ctx.fillRect(-w / 2, LOG_R - 6, w, 6);
          ctx.restore();
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, pp.x, pp.y - (0.9 - pp.t) * 26);
        }
        // hearts
        for (let k = 0; k < HEARTS; k++) {
          ctx.fillStyle = k < s.hearts ? "#e03131" : "#ced4da";
          const hx = FIELD_W - 30 - k * 22;
          ctx.fillRect(hx, 150, 6, 6);
          ctx.fillRect(hx + 8, 150, 6, 6);
          ctx.fillRect(hx - 2, 154, 18, 6);
          ctx.fillRect(hx + 2, 160, 10, 4);
          ctx.fillRect(hx + 5, 164, 4, 3);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.slant, endCheck, showSlice]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const doCut = (angle: number) => {
    const s = sRef.current;
    if (!live.current) {
      live.current = true;
      return;
    }
    const thick = s.fed;
    const q = cut(s, angle);
    if (!q) return;
    showSlice(q, thick, angle);
    endCheck();
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (sRef.current.over) return;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toField(e);
    swipe.current = { id: e.pointerId, x: p.x, y: p.y, done: false };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sw = swipe.current;
    if (!sw || sw.id !== e.pointerId || sw.done) return;
    const p = toField(e);
    const dx = p.x - sw.x;
    const dy = p.y - sw.y;
    // a downward stroke cuts as soon as it is long enough, so the timing is the moment of the swipe
    if (dy > 26) {
      sw.done = true;
      doCut(swipeAngle(dx, dy));
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sw = swipe.current;
    if (!sw || sw.id !== e.pointerId) return;
    swipe.current = null;
    if (sw.done) return;
    const p = toField(e);
    // a plain tap is a straight-down chop
    if (Math.hypot(p.x - sw.x, p.y - sw.y) < 14) doCut(0);
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
      data-game="tteok-slice"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.bowl, hud.good, level.need)}</Badge>
        <Badge variant="outline" aria-label={`${hud.hearts}/${HEARTS}`}>{"♥".repeat(hud.hearts)}{"♡".repeat(HEARTS - hud.hearts)}</Badge>
        {level.slant ? <Badge variant="outline">{c.slant}</Badge> : null}
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
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-16 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : over.out ? c.out : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.good, over.perfect)}</p>
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
