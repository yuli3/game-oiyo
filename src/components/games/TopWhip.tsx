import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { FIELD_H, FIELD_W, LEVELS, STAGE_COUNT, TOP_R, WHIP_SLUG, aimPoint, newWhip, parTime, sledX, starsFor, stepWhip, whip, type WhipState } from "../../lib/games/top-whip";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; gates: string; time: string; start: string; win: string; fell: string; hole: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; crack: string; windL: string; windR: string; spin: string;
}> = {
  ko: {
    stage: "{0}단계", gates: "깃발 {0}/{1}", time: "{0}초", start: "팽이를 가로질러 휙 쳐요", win: "모닥불 자리 도착!", fell: "팽이가 힘이 빠져 쓰러졌어요", hole: "얼음 구멍에 빠졌어요",
    result: "{0}초 · 채찍 {1}번", again: "다시 하기", next: "다음 단계", crack: "짝!", windL: "← 바람", windR: "바람 →", spin: "회전",
    help: "팽이를 가로지르게 손가락을 휙 그으면 채찍이 팽이를 쳐요. 맞은 팽이는 더 빨리 돌고, 그은 방향으로 미끄러져 가요. 빨리 그을수록 세게 나가요. 번호 순서대로 깃발 사이를 지나간 다음 모닥불 옆 노란 원에 들어가면 성공이에요. 회전이 다 떨어지면 쓰러지니 자주 쳐 주세요. 눈 더미는 팽이를 느리게 하고, 얼음 구멍에 빠지면 실패예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", gates: "Flags {0}/{1}", time: "{0}s", start: "Swipe across the top to whip it", win: "Home by the bonfire!", fell: "The top ran out of spin and fell", hole: "It fell through a hole in the ice",
    result: "{0}s · {1} lashes", again: "Play again", next: "Next stage", crack: "Crack!", windL: "← Wind", windR: "Wind →", spin: "Spin",
    help: "Swipe your finger across the top to lash it with the whip. A lashed top spins faster and slides off the way you swiped; a quicker swipe sends it further. Pass between the flags in number order, then glide into the yellow circle by the bonfire. If it runs out of spin it falls over, so keep whipping. Snow drifts slow it down, and holes in the ice end the run.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", gates: "旗 {0}/{1}", time: "{0}秒", start: "コマを横切るようにはらおう", win: "たき火の輪に到着！", fell: "回転が切れて倒れた", hole: "氷の穴に落ちた",
    result: "{0}秒 · ムチ {1}回", again: "もう一度", next: "次の面", crack: "パシッ!", windL: "← 風", windR: "風 →", spin: "回転",
    help: "コマを横切るように指をさっと払うと、ムチがコマを打ちます。打たれたコマは速く回り、払った方向へすべります。速く払うほど遠くへ。番号順に旗の間を通り、たき火のそばの黄色い輪に入ればクリア。回転がなくなると倒れるので、こまめに打ちましょう。雪だまりは遅くなり、氷の穴に落ちると失敗です。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", gates: "旗子 {0}/{1}", time: "{0}秒", start: "手指划过陀螺来抽它", win: "到达篝火旁！", fell: "陀螺转不动倒下了", hole: "掉进冰窟窿了",
    result: "{0}秒 · 抽了{1}鞭", again: "再玩一次", next: "下一关", crack: "啪!", windL: "← 风", windR: "风 →", spin: "转速",
    help: "手指快速划过陀螺，鞭子就会抽到它。被抽的陀螺转得更快，并朝划的方向滑出去，划得越快滑得越远。按编号依次从旗子中间穿过，再滑进篝火旁的黄色圆圈就过关。转速用完陀螺会倒，所以要经常抽。雪堆会让它变慢，掉进冰窟窿就失败。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", gates: "Drapeaux {0}/{1}", time: "{0} s", start: "Balayez à travers la toupie pour la fouetter", win: "Arrivée près du feu !", fell: "La toupie n'a plus d'élan et tombe", hole: "Elle est tombée dans un trou de la glace",
    result: "{0} s · {1} coups de fouet", again: "Rejouer", next: "Niveau suivant", crack: "Clac !", windL: "← Vent", windR: "Vent →", spin: "Rotation",
    help: "Balayez du doigt à travers la toupie pour la fouetter. Fouettée, elle tourne plus vite et glisse dans le sens du geste ; plus le geste est rapide, plus elle va loin. Passez entre les drapeaux dans l'ordre des numéros, puis glissez dans le cercle jaune près du feu. Sans rotation, elle tombe : fouettez souvent. Les congères la ralentissent et un trou dans la glace met fin à la partie.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", gates: "Banderas {0}/{1}", time: "{0} s", start: "Desliza a través del trompo para azotarlo", win: "¡Llegaste junto a la hoguera!", fell: "El trompo se quedó sin giro y cayó", hole: "Cayó por un agujero del hielo",
    result: "{0} s · {1} latigazos", again: "Otra vez", next: "Siguiente nivel", crack: "¡Zas!", windL: "← Viento", windR: "Viento →", spin: "Giro",
    help: "Desliza el dedo a través del trompo para darle con el látigo. Azotado, gira más rápido y resbala hacia donde deslizaste; cuanto más rápido el gesto, más lejos va. Pasa entre las banderas en orden y luego entra en el círculo amarillo junto a la hoguera. Si se queda sin giro, se cae, así que azótalo a menudo. Los montones de nieve lo frenan y un agujero en el hielo termina la partida.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:top-whip:muted";

const TOP: PixelArt = {
  palette: { r: "#e03131", y: "#ffd43b", b: "#1c7ed6", w: "#c0894a", d: "#8a5a3b", k: "#343a40" },
  rows: ["..wwwww..", ".wrrryyw.", "wrrryybbw", "wryybbbbw", "wyybbbrrw", "wybbbrrrw", ".wbrrrrw.", "..wwwww.."],
};
const FLAG_RED: PixelArt = { palette: { r: "#e03131", p: "#5c3d2e", w: "#ffffff" }, rows: ["prrr", "prrrr", "prrr.", "p....", "p....", "p....", "pp..."] };
const FLAG_BLUE: PixelArt = { palette: { r: "#1c7ed6", p: "#5c3d2e", w: "#ffffff" }, rows: ["prrr", "prrrr", "prrr.", "p....", "p....", "p....", "pp..."] };
const ROCK: PixelArt = { palette: { g: "#868e96", d: "#495057", w: "#f1f3f5" }, rows: ["..ww..", ".gwgg.", "ggggdd", "gggddd", ".gddd."] };
const BONFIRE: PixelArt = {
  palette: { r: "#e03131", o: "#f76707", y: "#ffd43b", b: "#8a5a3b" },
  rows: ["...r...", "..ror..", ".roorr.", ".royor.", "roy.yor", "bbbbbbb", ".b.b.b."],
};
const SLED: PixelArt = {
  palette: { s: "#f1c27d", k: "#343a40", g: "#2f9e44", b: "#8a5a3b", w: "#fff" },
  rows: ["...kk...", "..ksskk.", "..gggg..", ".gggggg.", "bbbbbbbb", "b......b"],
};
const KID: PixelArt = {
  palette: { s: "#f1c27d", k: "#343a40", r: "#c92a2a", b: "#1c7ed6", w: "#e9ecef" },
  rows: ["..kkk.", ".kssk.", ".ksss.", "rrrrr.", "rrrrrw", "rrrr.w", ".bb..w", ".b.b.."],
};

interface Pop { x: number; y: number; text: string; t: number; color: string }

export default function TopWhip({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ next: 0, time: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: number; why: string; time: number; whips: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<WhipState>(newWhip(0));
  const live = useRef(false);
  const swipe = useRef<null | { id: number; pts: Array<{ x: number; y: number; t: number }>; used: boolean }>(null);
  const trail = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const level = LEVELS[stage];
  const par = useMemo(() => parTime(stage), [stage]);

  useRunRecord(WHIP_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    sRef.current = newWhip(s);
    live.current = false;
    swipe.current = null;
    trail.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ next: 0, time: 0 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(WHIP_SLUG, STAGE_COUNT);
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
    let lastHit = -1;
    let hudAt = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const s = sRef.current;
      const l = s.level;
      if (live.current && !s.end) {
        const before = s.next;
        stepWhip(s, dt);
        if (s.next > before) {
          const g = l.gates[before];
          spawnBurst(parts.current, (g.ax + g.bx) / 2, (g.ay + g.by) / 2, ["#ffd43b", "#ffffff", "#ff8787"], 14, 90, Math.floor(now));
          sfx("success");
        }
        if (s.lastHit !== lastHit && s.lastHit > 0) {
          lastHit = s.lastHit;
          sfx("tap");
        }
        if (now - hudAt > 100 || s.end) {
          hudAt = now;
          setHud({ next: s.next, time: Math.round(s.time * 10) / 10 });
        }
        if (s.end) {
          const won = s.end === "home";
          setOver({ won, stars: won ? starsFor(s.time, par) : 0, why: s.end === "hole" ? c.hole : c.fell, time: Math.round(s.time * 10) / 10, whips: s.whips });
          if (won) {
            setCleared(markStageCleared(WHIP_SLUG, l.stage, STAGE_COUNT));
            spawnBurst(parts.current, s.top.x, s.top.y, ["#ffd43b", "#ff922b", "#ffffff"], 30, 150, Math.floor(now));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 60);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);
      trail.current = trail.current.filter((p) => t - p.t < 0.25);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // frozen pond with snowy banks
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        ctx.fillStyle = "#d0ebff";
        ctx.fillRect(6, 6, FIELD_W - 12, FIELD_H - 12);
        ctx.fillStyle = "#e7f5ff";
        for (let k = 0; k < 14; k++) ctx.fillRect(20 + ((k * 97) % 300), 20 + ((k * 151) % 500), 40 + (k % 3) * 20, 3);
        ctx.fillStyle = "rgba(116,192,252,0.55)";
        for (let k = 0; k < 6; k++) {
          const x = 40 + ((k * 131) % 280);
          const y = 50 + ((k * 211) % 460);
          ctx.fillRect(x, y, 12, 2);
          ctx.fillRect(x + 10, y + 2, 2, 8);
          ctx.fillRect(x + 10, y + 10, 10, 2);
        }
        for (const d of l.drifts) {
          ctx.fillStyle = "#ffffff";
          for (let yy = -d.r; yy <= d.r; yy += 4) {
            const hw = Math.sqrt(Math.max(0, d.r * d.r - yy * yy));
            ctx.fillRect(Math.round(d.x - hw), Math.round(d.y + yy), Math.round(hw * 2), 4);
          }
          ctx.fillStyle = "#e9ecef";
          ctx.fillRect(Math.round(d.x - d.r * 0.5), Math.round(d.y + d.r * 0.4), Math.round(d.r), 4);
        }
        for (const h of l.holes) {
          ctx.fillStyle = "#ffffff";
          for (let yy = -h.r - 3; yy <= h.r + 3; yy += 3) {
            const hw = Math.sqrt(Math.max(0, (h.r + 3) * (h.r + 3) - yy * yy));
            ctx.fillRect(Math.round(h.x - hw), Math.round(h.y + yy), Math.round(hw * 2), 3);
          }
          ctx.fillStyle = "#1864ab";
          for (let yy = -h.r; yy <= h.r; yy += 3) {
            const hw = Math.sqrt(Math.max(0, h.r * h.r - yy * yy));
            ctx.fillRect(Math.round(h.x - hw), Math.round(h.y + yy), Math.round(hw * 2), 3);
          }
          ctx.fillStyle = "#4dabf7";
          ctx.fillRect(Math.round(h.x - h.r * 0.4), Math.round(h.y - 2 + Math.sin(t * 3) * 2), Math.round(h.r * 0.6), 2);
        }
        // the warm circle by the bonfire
        const hm = l.home;
        ctx.fillStyle = "rgba(255,212,59,0.35)";
        for (let yy = -hm.r; yy <= hm.r; yy += 4) {
          const hw = Math.sqrt(Math.max(0, hm.r * hm.r - yy * yy));
          ctx.fillRect(Math.round(hm.x - hw), Math.round(hm.y + yy), Math.round(hw * 2), 4);
        }
        ctx.strokeStyle = s.next >= l.gates.length ? "#f08c00" : "#fab005";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(hm.x, hm.y, hm.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const bx = hm.x + (hm.x > FIELD_W / 2 ? -hm.r - 18 : hm.r + 18);
        drawSprite(ctx, BONFIRE, bx, hm.y + Math.round(Math.sin(t * 10)), { scale: 4 });
        for (const r of l.rocks) drawSprite(ctx, ROCK, r.x, r.y, { scale: Math.max(3, Math.round(r.r / 3)) });
        // gates: the next one is bright, passed ones fade
        l.gates.forEach((g, k) => {
          const done = k < s.next;
          const isNext = k === s.next;
          ctx.globalAlpha = done ? 0.35 : 1;
          if (isNext) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            const n = 8;
            for (let q = 1; q < n; q++) ctx.fillRect(Math.round(g.ax + ((g.bx - g.ax) * q) / n) - 2, Math.round(g.ay + ((g.by - g.ay) * q) / n) - 2, 4, 4);
          }
          drawSprite(ctx, FLAG_RED, g.ax + 6, g.ay - 12, { scale: 3 });
          drawSprite(ctx, FLAG_BLUE, g.bx + 6, g.by - 12, { scale: 3 });
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = isNext ? "#c92a2a" : "#495057";
          ctx.fillText(String(k + 1), (g.ax + g.bx) / 2, (g.ay + g.by) / 2 + 5);
          ctx.globalAlpha = 1;
        });
        for (const sl of l.sleds) drawSprite(ctx, SLED, sledX(sl, s.time), sl.y, { scale: 4 });
        // hint chevrons toward the next aim on the first ponds
        if (l.stage < 6 && !s.end) {
          const a = aimPoint(s);
          const dx = a.x - s.top.x;
          const dy = a.y - s.top.y;
          const d = Math.hypot(dx, dy) || 1;
          ctx.fillStyle = "rgba(201,42,42,0.55)";
          for (let k = 1; k <= 3; k++) {
            const off = 22 + k * 12 + ((t * 30) % 12);
            ctx.fillRect(Math.round(s.top.x + (dx / d) * off) - 2, Math.round(s.top.y + (dy / d) * off) - 2, 4, 4);
          }
        }
        // the top, wobbling as its spin runs low
        const tp = s.top;
        const wob = (1 - tp.spin) * 5;
        const fallen = s.end === "fell";
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(Math.round(tp.x - TOP_R + 2), Math.round(tp.y + TOP_R - 2), TOP_R * 2 - 2, 4);
        if (s.end !== "hole") {
          drawSprite(ctx, TOP, tp.x + (fallen ? 0 : Math.sin(t * 13) * wob), tp.y, { scale: 3, rotate: fallen ? 0 : tp.angle });
        }
        // whip trail
        if (trail.current.length > 1) {
          ctx.fillStyle = "#5c3d2e";
          for (const p of trail.current) ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4);
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, Math.max(40, Math.min(FIELD_W - 40, pp.x)), pp.y - (0.8 - pp.t) * 30);
        }
        // spin gauge
        ctx.fillStyle = "rgba(33,37,41,0.7)";
        ctx.fillRect(10, 10, 104, 14);
        ctx.fillStyle = tp.spin < 0.3 ? "#fa5252" : "#40c057";
        ctx.fillRect(12, 12, Math.round(100 * Math.max(0, tp.spin)), 10);
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(c.spin, 16, 21);
        if (l.wind.x) {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          const dir = Math.sign(l.wind.x);
          for (let k = 0; k < 5; k++) {
            const x = ((((t * 60) * dir + k * 80) % (FIELD_W + 40)) + FIELD_W + 40) % (FIELD_W + 40) - 20;
            ctx.fillRect(Math.round(x), 60 + k * 100, 18, 2);
          }
        }
        drawSprite(ctx, KID, FIELD_W - 26, FIELD_H - 26, { scale: 3 });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.fell, c.hole, c.spin, par, sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (sRef.current.end) return;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toField(e);
    const now = performance.now() / 1000;
    swipe.current = { id: e.pointerId, pts: [{ ...p, t: now }], used: false };
    trail.current.push({ ...p, t: now });
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sw = swipe.current;
    if (!sw || sw.id !== e.pointerId) return;
    const p = toField(e);
    const now = performance.now() / 1000;
    sw.pts.push({ ...p, t: now });
    while (sw.pts.length > 2 && now - sw.pts[0].t > 0.12) sw.pts.shift();
    trail.current.push({ ...p, t: now });
    if (sw.used) return;
    const s = sRef.current;
    const a = sw.pts[0];
    // lash when this stretch of the swipe passes over the top
    const hit = whip(s, a.x, a.y, p.x, p.y, Math.max(0.03, now - a.t));
    if (hit) {
      sw.used = true;
      live.current = true;
      pops.current.push({ x: s.top.x, y: s.top.y - 24, text: c.crack, t: 0.8, color: "#c92a2a" });
      spawnBurst(parts.current, s.top.x, s.top.y, ["#ffffff", "#a5d8ff"], 10, 120, Math.floor(now * 1000));
      sfx("place");
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sw = swipe.current;
    if (!sw || sw.id !== e.pointerId) return;
    swipe.current = null;
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
      data-game="top-whip"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.gates, hud.next, level.gates.length)}</Badge>
        <Badge variant="outline">{fill(c.time, hud.time.toFixed(1))}</Badge>
        {level.wind.x ? <Badge variant="outline">{level.wind.x < 0 ? c.windL : c.windR}</Badge> : null}
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
          <div className="pointer-events-none absolute inset-x-0 top-12 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : over.why}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.time.toFixed(1), over.whips)}</p>
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
