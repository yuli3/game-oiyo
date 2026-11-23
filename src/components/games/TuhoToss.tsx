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
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import {
  BODY_PAD, EAR_W, FIELD_H, FIELD_W, GROUND, HAND, LEVELS, NECK_H, PULL_MAX, STAGE_COUNT, TUHO_SLUG, earsAt, launchVelocity, newThrowing, potXAt, starsFor, stepThrowing, throwArrow,
  type Throwing,
} from "../../lib/games/tuho-toss";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; points: string; arrows: string; start: string; win: string; lose: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; inPot: string; ear: string; clack: string; windL: string; windR: string; cart: string;
}> = {
  ko: {
    stage: "{0}단계", points: "점수 {0}/{1}", arrows: "화살 {0}", start: "화면을 눌러 뒤로 당겼다 놓아요", win: "투호 명수!", lose: "화살이 떨어졌어요 · {0}/{1}점",
    again: "다시 하기", next: "다음 단계", inPot: "쏙! +1", ear: "귀에 쏙! +2", clack: "탁!", windL: "← 바람", windR: "바람 →", cart: "움직이는 항아리",
    help: "화면 어디든 눌러서 손가락을 뒤로(왼쪽 아래로) 당겼다 놓으면, 당긴 반대 방향으로 화살이 날아가요. 많이 당길수록 멀리 갑니다. 항아리 입구에 넣으면 1점, 목 옆의 작은 귀에 넣으면 2점이에요. 입구 가장자리나 항아리 몸에 맞으면 튕겨 나가요. 화살을 다 쓰기 전에 목표 점수를 채우면 통과, 화살을 많이 남길수록 별이 많아요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", points: "Points {0}/{1}", arrows: "Arrows {0}", start: "Press, pull back and let go", win: "Tuho master!", lose: "Out of arrows · {0}/{1} points",
    again: "Play again", next: "Next stage", inPot: "In! +1", ear: "Ear! +2", clack: "Clack!", windL: "← Wind", windR: "Wind →", cart: "Moving pot",
    help: "Press anywhere and pull your finger back (down and to the left), then let go: the arrow flies the opposite way. Pull further to throw further. Into the pot's mouth is 1 point; into one of the little ears beside the neck is 2. Hit the rim or the jar and it clatters off. Reach the target before your arrows run out; arrows to spare earn more stars.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", points: "得点 {0}/{1}", arrows: "矢 {0}本", start: "押して後ろに引いて離そう", win: "投壺の名人！", lose: "矢が尽きた · {0}/{1}点",
    again: "もう一度", next: "次の面", inPot: "入った！+1", ear: "耳に入った！+2", clack: "カン！", windL: "← 風", windR: "風 →", cart: "動く壺",
    help: "画面のどこかを押して指を後ろ(左下)へ引いて離すと、引いたのと反対方向へ矢が飛びます。たくさん引くほど遠くへ。壺の口に入れば1点、首の横の小さな耳に入れば2点。口の縁や壺の胴に当たると弾かれます。矢を使い切る前に目標点に届けばクリア、矢を多く残すほど星が増えます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", points: "得分 {0}/{1}", arrows: "箭 {0}", start: "按住向后拉再松手", win: "投壶高手！", lose: "箭用完了 · {0}/{1}分",
    again: "再玩一次", next: "下一关", inPot: "进了！+1", ear: "投进壶耳！+2", clack: "当！", windL: "← 风", windR: "风 →", cart: "移动的壶",
    help: "在屏幕任意处按住，把手指向后(左下方)拉再松开，箭就朝相反方向飞出。拉得越多飞得越远。投进壶口得1分，投进壶颈旁的小壶耳得2分。碰到壶口边缘或壶身会弹开。在箭用完之前达到目标分数即可过关，剩下的箭越多星越多。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", points: "Points {0}/{1}", arrows: "Flèches {0}", start: "Appuyez, tirez en arrière, lâchez", win: "Maître du tuho !", lose: "Plus de flèches · {0}/{1} points",
    again: "Rejouer", next: "Niveau suivant", inPot: "Dedans ! +1", ear: "Oreille ! +2", clack: "Clac !", windL: "← Vent", windR: "Vent →", cart: "Pot mobile",
    help: "Appuyez n'importe où, tirez le doigt en arrière (vers le bas à gauche) puis lâchez : la flèche part dans l'autre sens. Plus vous tirez, plus elle va loin. Dans le goulot du pot : 1 point ; dans une des petites oreilles à côté du col : 2. Touchez le bord ou la jarre et elle rebondit. Atteignez l'objectif avant d'épuiser vos flèches ; plus il en reste, plus d'étoiles.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", points: "Puntos {0}/{1}", arrows: "Flechas {0}", start: "Pulsa, tira hacia atrás y suelta", win: "¡Maestro del tuho!", lose: "Sin flechas · {0}/{1} puntos",
    again: "Otra vez", next: "Siguiente nivel", inPot: "¡Dentro! +1", ear: "¡Oreja! +2", clack: "¡Clac!", windL: "← Viento", windR: "Viento →", cart: "Jarrón móvil",
    help: "Pulsa en cualquier sitio, tira del dedo hacia atrás (abajo a la izquierda) y suelta: la flecha sale en sentido contrario. Cuanto más tiras, más lejos llega. En la boca del jarrón vale 1 punto; en una de las orejitas junto al cuello, 2. Si da en el borde o en el cuerpo, rebota. Alcanza la meta antes de quedarte sin flechas; cuantas más te sobren, más estrellas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:tuho-toss:muted";

const KID: PixelArt = {
  palette: { k: "#212529", s: "#f3d2b3", r: "#e03131", y: "#ffd43b", b: "#4dabf7", p: "#f783ac", w: "#ffffff", g: "#2f9e44" },
  rows: [
    "...kkkk...",
    "..kkkkkk..",
    "..kssssk..",
    "..sksksk..",
    "...ssss...",
    "..rrwwyy..",
    ".rrrwwyys.",
    ".bbrrryys.",
    "..pppppp..",
    ".pppbbppp.",
    ".ppbbbbpp.",
    "pppggggppp",
    "..ww..ww..",
  ],
};
const BLOSSOM: PixelArt = { palette: { p: "#f783ac", y: "#ffd43b" }, rows: [".p.", "pyp", ".p."] };

const ROOM: BackdropSpec = { sky: ["#f3e3c3", "#efd9b0", "#e9cf9f"], ground: ["#a8703e", "#8f5b2f"], groundShare: 0.14, seed: 22 };

interface Pop { x: number; y: number; text: string; t: number; color: string }

export default function TuhoToss({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ points: 0, thrown: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Throwing>(newThrowing(0));
  const pull = useRef<null | { id: number; x0: number; y0: number; x: number; y: number }>(null);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const level = LEVELS[stage];
  useRunRecord(TUHO_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    sRef.current = newThrowing(s);
    pull.current = null;
    parts.current = [];
    pops.current = [];
    setTouched(false);
    setOver(null);
    setHud({ points: 0, thrown: 0 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(TUHO_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const s = sRef.current;
      const l = s.level;
      if (!s.over) {
        // the cart keeps rolling even before the first throw, so time always runs
        const ev = stepThrowing(s, dt);
        const px = potXAt(l, s.time);
        if (ev.scored) {
          pops.current.push({ x: px, y: l.mouthY - 40, text: ev.ear ? c.ear : c.inPot, t: 1.1, color: ev.ear ? "#f08c00" : "#2f9e44" });
          spawnBurst(parts.current, px, l.mouthY - 4, ["#ffd43b", "#f783ac", "#ffffff"], ev.ear ? 22 : 14, 110, Math.floor(now));
          sfx(ev.ear ? "combo" : "success");
          setHud({ points: s.points, thrown: s.thrown });
        } else if (ev.rim) {
          const a = s.arrows[s.arrows.length - 1];
          if (a && !pops.current.some((p) => p.text === c.clack && p.t > 0.8)) pops.current.push({ x: a.x, y: a.y - 20, text: c.clack, t: 0.9, color: "#495057" });
          sfx("tap");
        }
        if (ev.miss) {
          sfx("fail");
          setHud({ points: s.points, thrown: s.thrown });
        }
        if (s.over) {
          setHud({ points: s.points, thrown: s.thrown });
          setOver({ won: s.won, stars: s.won ? starsFor(s) : 0 });
          if (s.won) {
            setCleared(markStageCleared(TUHO_SLUG, l.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 160);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, ROOM, 4);
        // hanji window lattice and a floor seam
        ctx.fillStyle = "rgba(140,96,52,0.35)";
        for (let x = 20; x < FIELD_W; x += 56) ctx.fillRect(x, 40, 4, 240);
        for (let y = 40; y <= 280; y += 48) ctx.fillRect(20, y, FIELD_W - 40, 4);
        ctx.fillStyle = "#6b4426";
        ctx.fillRect(0, GROUND, FIELD_W, 4);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        for (let x = 0; x < FIELD_W; x += 40) ctx.fillRect(x, GROUND + 4, 2, FIELD_H - GROUND);
        // wind streamers
        if (l.wind) {
          const dir = Math.sign(l.wind);
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          for (let k = 0; k < 6; k++) {
            const x = (((now / 8) * dir + k * 70) % (FIELD_W + 60) + FIELD_W + 60) % (FIELD_W + 60) - 30;
            ctx.fillRect(Math.round(x), 90 + k * 34, 24, 3);
          }
        }
        // beam
        if (l.beam) {
          ctx.fillStyle = "#6b4426";
          ctx.fillRect(l.beam.x, l.beam.y, l.beam.w, l.beam.h);
          ctx.fillStyle = "#8a5a3b";
          ctx.fillRect(l.beam.x, l.beam.y, l.beam.w, 4);
          ctx.fillStyle = "#4a2f1a";
          ctx.fillRect(l.beam.x + 8, 0, 8, l.beam.y);
          ctx.fillRect(l.beam.x + l.beam.w - 16, 0, 8, l.beam.y);
        }
        // folding screen with plum blossoms
        if (l.screen) {
          const r = l.screen;
          ctx.fillStyle = "#7c4a24";
          ctx.fillRect(r.x - 2, r.y - 4, r.w + 4, r.h + 4);
          ctx.fillStyle = "#fff4e0";
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.fillStyle = "#5c3d2e";
          for (let y = r.y + 10; y < r.y + r.h - 10; y += 26) ctx.fillRect(r.x + 3, y, 2, 14);
          for (let y = r.y + 14; y < r.y + r.h - 10; y += 34) drawSprite(ctx, BLOSSOM, r.x + r.w / 2, y, { scale: 3 });
        }
        // the pot: blue-and-white jar with a neck and two ears
        const px = Math.round(potXAt(l, s.time));
        const half = l.mouthW / 2;
        if (l.slide) {
          ctx.fillStyle = "#8a5a3b";
          ctx.fillRect(px - half - BODY_PAD - 6, GROUND - 10, (half + BODY_PAD + 6) * 2, 8);
          ctx.fillStyle = "#343a40";
          for (const wx of [px - half - BODY_PAD, px + half + BODY_PAD - 8]) ctx.fillRect(wx, GROUND - 4, 8, 6);
        }
        const bodyTop = l.mouthY + NECK_H;
        const base = l.slide ? GROUND - 10 : GROUND;
        for (let y = bodyTop; y < base; y += 4) {
          const t = (y - bodyTop) / (base - bodyTop);
          const w = Math.round((half + BODY_PAD) * (0.78 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 0.22));
          ctx.fillStyle = "#e7f0f7";
          ctx.fillRect(px - w, y, w * 2, 4);
          ctx.fillStyle = "#1c4f8c";
          ctx.fillRect(px - w, y, 4, 4);
          ctx.fillRect(px + w - 4, y, 4, 4);
        }
        ctx.fillStyle = "#1c4f8c";
        ctx.fillRect(px - half - 10, bodyTop + 22, (half + 10) * 2, 4);
        for (let k = -1; k <= 1; k++) ctx.fillRect(px + k * 12 - 3, bodyTop + 34, 6, 6);
        ctx.fillStyle = "#d0dde8";
        ctx.fillRect(px - half - 4, l.mouthY + 4, (half + 4) * 2, NECK_H - 4);
        ctx.fillStyle = "#1c4f8c";
        ctx.fillRect(px - half - 4, l.mouthY + 4, 4, NECK_H - 4);
        ctx.fillRect(px + half, l.mouthY + 4, 4, NECK_H - 4);
        ctx.fillStyle = "#14325a";
        ctx.fillRect(px - half - 6, l.mouthY - 2, (half + 6) * 2, 6);
        ctx.fillStyle = "#0b1a2e";
        ctx.fillRect(px - half + 4, l.mouthY - 1, l.mouthW - 8, 3);
        for (const e of earsAt(l, px)) {
          ctx.fillStyle = "#1c4f8c";
          ctx.fillRect(e.x - EAR_W / 2 - 2, e.y - 2, EAR_W + 4, 16);
          ctx.fillStyle = "#0b1a2e";
          ctx.fillRect(e.x - EAR_W / 2 + 1, e.y - 1, EAR_W - 2, 3);
          ctx.fillStyle = "#1c4f8c";
          ctx.fillRect(Math.min(e.x, px) + 4, e.y + 8, Math.abs(e.x - px) - 8, 4);
        }
        // arrows: resting ones stick out of the pot or lie on the floor
        for (const a of s.arrows) {
          const len = 38;
          let x = a.x;
          let y = a.y;
          let ang = a.angle;
          if (a.fate === "in" || a.fate === "ear") {
            x = px + a.dx;
            y = (a.fate === "ear" ? l.mouthY + 14 : l.mouthY) + 6;
            ang = Math.PI / 2 + (a.dx / 30) * 0.3;
          } else if (a.fate === "miss" && a.y >= GROUND - 1) {
            ang = 0.05;
            y = GROUND - 2;
          }
          const cx = Math.cos(ang);
          const cy = Math.sin(ang);
          ctx.fillStyle = "#c0894a";
          for (let k = 0; k < len; k += 2) ctx.fillRect(Math.round(x - cx * k) - 1, Math.round(y - cy * k) - 1, 3, 3);
          ctx.fillStyle = "#e03131";
          for (let k = len - 8; k < len; k += 2) ctx.fillRect(Math.round(x - cx * k) - 2, Math.round(y - cy * k) - 2, 4, 4);
          ctx.fillStyle = "#495057";
          ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        }
        // the player and the arrows left in hand
        drawSprite(ctx, KID, HAND.x - 14, GROUND - 26, { scale: 4 });
        const left = l.arrows - s.thrown;
        for (let k = 0; k < left; k++) {
          ctx.fillStyle = "#c0894a";
          ctx.fillRect(8 + k * 5, GROUND + 16, 3, 30);
          ctx.fillStyle = "#e03131";
          ctx.fillRect(7 + k * 5, GROUND + 16, 5, 6);
        }
        // aim while pulling: a band from the hand and a short pointer (no trajectory)
        const p = pull.current;
        if (p && !s.over) {
          const v = launchVelocity(p.x - p.x0, p.y - p.y0);
          const power = Math.min(1, Math.hypot(p.x - p.x0, p.y - p.y0) / PULL_MAX);
          ctx.fillStyle = "rgba(33,37,41,0.35)";
          ctx.fillRect(Math.round(p.x0) - 3, Math.round(p.y0) - 3, 6, 6);
          ctx.fillRect(Math.round(p.x) - 4, Math.round(p.y) - 4, 8, 8);
          const n = Math.hypot(v.vx, v.vy) || 1;
          ctx.fillStyle = power > 0.95 ? "#e03131" : "#f08c00";
          for (let k = 1; k <= 7; k++) {
            const d = k * (6 + power * 8);
            ctx.fillRect(Math.round(HAND.x + (v.vx / n) * d) - 2, Math.round(HAND.y + (v.vy / n) * d) - 2, 4, 4);
          }
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, Math.max(50, Math.min(FIELD_W - 50, pp.x)), pp.y - (1.1 - pp.t) * 24);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.clack, c.ear, c.inPot, sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (s.over || pull.current) return;
    const p = toField(e);
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    pull.current = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pr = pull.current;
    if (!pr || pr.id !== e.pointerId) return;
    const p = toField(e);
    pr.x = p.x;
    pr.y = p.y;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pr = pull.current;
    if (!pr || pr.id !== e.pointerId) return;
    pull.current = null;
    const s = sRef.current;
    const v = launchVelocity(pr.x - pr.x0, pr.y - pr.y0);
    if (throwArrow(s, v.vx, v.vy)) {
      sfx("place");
      setHud({ points: s.points, thrown: s.thrown });
    }
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
      data-game="tuho-toss"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.points, hud.points, level.need)}</Badge>
        <Badge variant="outline">{fill(c.arrows, level.arrows - hud.thrown)}</Badge>
        {level.wind ? <Badge variant="outline">{level.wind < 0 ? c.windL : c.windR}</Badge> : null}
        {level.slide ? <Badge variant="outline">{c.cart}</Badge> : null}
        <div className="ml-auto flex gap-1">
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
          <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : fill(c.lose, hud.points, level.need)}</p>
            <p className="text-sm text-muted-foreground">{fill(c.points, hud.points, level.need)}</p>
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
