// One-Button Civ v2 (2026-11-23): a one-button island on a canvas. A builder
// walks the ring of plots, the season wheel turns field → road → wall, and one
// tap anywhere builds what the season allows on the plot under the builder.
// Hook (design lens): high concept ("a whole civilisation on one button") +
// addictive one-more-island. Logic: lib/games/one-button-civ.

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { readMutedPref, writeMutedPref } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { recordBest, recordResult } from "../../lib/games/records";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  GAME_ID, HEARTS, PLOTS, STAGE_COUNT, begin, newCiv, plotUnder, season, stars, tap as tapCiv, tick, timeLimit, upcoming,
  type Build, type CivState, type Plot,
} from "../../lib/games/one-button-civ";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const MUTE_KEY = "oiyo:one-button-civ:muted";
const fill = (s: string, ...v: (string | number)[]) => v.reduce<string>((acc, x, i) => acc.replace(`{${i}}`, String(x)), s);

const COPY: Record<L, {
  island: string; pop: string; years: string; start: string; next: string; retry: string; won: string; lost: string; lostTime: string;
  hint: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; season: Record<Build, string>;
  repelled: string; burned: string; grew: string; build: string;
}> = {
  ko: {
    island: "{0}번째 섬", pop: "인구 {0} / {1}", years: "{0}년 남음", start: "섬에 내리기", next: "다음 섬", retry: "다시 하기",
    won: "마을이 도시가 됐어요!", lost: "마을이 불타 버렸어요", lostTime: "세월이 다 갔어요",
    hint: "버튼은 하나, 화면 어디든 톡. 일꾼이 서 있는 칸에 지금 계절의 건물을 지어요. 봄=밭(지나갈 때마다 식량), 여름=길(일꾼이 빨라짐), 겨울=성벽(빨간 표시 칸에 상륙하는 약탈선을 막음). 스페이스 키도 돼요.",
    stages: "섬 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    season: { field: "봄 · 밭", road: "여름 · 길", wall: "겨울 · 성벽" }, repelled: "막았다!", burned: "불탔다…", grew: "+1명", build: "짓기",
  },
  en: {
    island: "Island {0}", pop: "Pop {0} / {1}", years: "{0} yrs left", start: "Land on the island", next: "Next island", retry: "Try again",
    won: "Your village became a city!", lost: "Your village burned down", lostTime: "The years ran out",
    hint: "One button: tap anywhere. You build the season's building on the plot under the walker. Spring = field (food each pass), summer = road (walker speeds up), winter = wall (stops raiders landing on red-marked plots). Space works too.",
    stages: "Pick an island", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    season: { field: "Spring · field", road: "Summer · road", wall: "Winter · wall" }, repelled: "Repelled!", burned: "Burned…", grew: "+1", build: "Build",
  },
  ja: {
    island: "{0}番目の島", pop: "人口 {0} / {1}", years: "残り{0}年", start: "島に上陸", next: "次の島", retry: "もう一度",
    won: "村が都市になりました！", lost: "村が焼けてしまいました", lostTime: "年月が尽きました",
    hint: "ボタンは一つ、画面のどこでもタップ。働き手が立つマスに今の季節の建物を建てます。春=畑（通るたび食料）、夏=道（働き手が速くなる）、冬=城壁（赤い印のマスに上陸する略奪船を防ぐ）。スペースキーでもOK。",
    stages: "島を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    season: { field: "春 · 畑", road: "夏 · 道", wall: "冬 · 城壁" }, repelled: "防いだ！", burned: "焼けた…", grew: "+1人", build: "建てる",
  },
  zh: {
    island: "第{0}座岛", pop: "人口 {0} / {1}", years: "剩{0}年", start: "登上小岛", next: "下一座岛", retry: "再来一次",
    won: "村庄变成了城市！", lost: "村庄被烧毁了", lostTime: "岁月用完了",
    hint: "只有一个按钮，点屏幕任何地方。在工人脚下的地块建造当季的建筑。春=田（每次经过得粮食），夏=路（工人变快），冬=城墙（挡住在红色标记地块登陆的海盗船）。空格键也可以。",
    stages: "选择小岛", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    season: { field: "春 · 田", road: "夏 · 路", wall: "冬 · 城墙" }, repelled: "挡住了！", burned: "烧毁了…", grew: "+1人", build: "建造",
  },
  fr: {
    island: "Île {0}", pop: "Pop. {0} / {1}", years: "{0} ans restants", start: "Débarquer", next: "Île suivante", retry: "Réessayer",
    won: "Votre village est devenu une ville !", lost: "Votre village a brûlé", lostTime: "Les années sont écoulées",
    hint: "Un seul bouton : touchez n'importe où. Vous construisez le bâtiment de la saison sur la parcelle du marcheur. Printemps = champ (nourriture à chaque passage), été = route (le marcheur accélère), hiver = muraille (arrête les pillards qui débarquent sur les parcelles marquées en rouge). La barre d'espace marche aussi.",
    stages: "Choisir une île", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    season: { field: "Printemps · champ", road: "Été · route", wall: "Hiver · muraille" }, repelled: "Repoussés !", burned: "Brûlé…", grew: "+1", build: "Bâtir",
  },
  es: {
    island: "Isla {0}", pop: "Pob. {0} / {1}", years: "Quedan {0} años", start: "Desembarcar", next: "Siguiente isla", retry: "Reintentar",
    won: "¡Tu aldea se volvió ciudad!", lost: "Tu aldea ardió", lostTime: "Se acabaron los años",
    hint: "Un solo botón: toca en cualquier parte. Construyes el edificio de la estación en la parcela del caminante. Primavera = campo (comida en cada paso), verano = camino (el caminante acelera), invierno = muralla (frena a los saqueadores que desembarcan en parcelas marcadas en rojo). La barra espaciadora también vale.",
    stages: "Elegir isla", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    season: { field: "Primavera · campo", road: "Verano · camino", wall: "Invierno · muralla" }, repelled: "¡Repelidos!", burned: "Ardió…", grew: "+1", build: "Construir",
  },
};

const W = 360;
const H = 420;
const DPR = 2;
const CX = 180;
const CY = 220;
const RING = 122;
const SEASON_HUE: Record<Build, number> = { field: 120, road: 38, wall: 210 };

interface Fx { kind: "repelled" | "burned" | "grew" | "built"; plot: number; t: number }

function plotAngle(p: number): number {
  return -Math.PI / 2 + (p / PLOTS) * Math.PI * 2;
}
function ringXY(p: number, r = RING): [number, number] {
  const a = plotAngle(p);
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
}

function boop(ctx: AudioContext | null, freq: number, vol = 0.16, type: OscillatorType = "triangle", len = 0.14) {
  if (!ctx) return;
  const when = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  o.frequency.exponentialRampToValueAtTime(freq * 0.7, when + len);
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + len + 0.02);
  o.connect(g).connect(ctx.destination);
  o.start(when);
  o.stop(when + len + 0.04);
}

function drawPlot(ctx: CanvasRenderingContext2D, kind: Plot, x: number, y: number, a: number, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a + Math.PI / 2);
  const s = 19;
  if (kind === "empty") {
    ctx.fillStyle = "#e9d49a";
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.6, 6); ctx.fill();
  } else if (kind === "ash") {
    ctx.fillStyle = "#4a4040";
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.6, 6); ctx.fill();
    ctx.fillStyle = `rgba(255,120,40,${0.3 + 0.2 * Math.sin(time * 5 + x)})`;
    ctx.beginPath(); ctx.arc(-4, 2, 4, 0, Math.PI * 2); ctx.arc(6, -3, 3, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "field") {
    ctx.fillStyle = "#5fa84a";
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.6, 6); ctx.fill();
    ctx.strokeStyle = "#f2d45c"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    for (let k = -2; k <= 2; k++) {
      const sway = Math.sin(time * 2 + k + x * 0.1) * 2;
      ctx.beginPath(); ctx.moveTo(k * 7, 9); ctx.lineTo(k * 7 + sway, -8); ctx.stroke();
    }
  } else if (kind === "road") {
    ctx.fillStyle = "#a89c8a";
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.6, 6); ctx.fill();
    ctx.fillStyle = "#cfc4b0";
    for (const [dx, dy] of [[-10, -6], [2, -8], [10, 2], [-6, 6], [4, 7]] as const) { ctx.beginPath(); ctx.ellipse(dx, dy, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(-s + 3, 0); ctx.lineTo(s - 3, 0); ctx.stroke(); ctx.setLineDash([]);
  } else if (kind === "wall") {
    ctx.fillStyle = "#7d8899";
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.6, 5); ctx.fill();
    ctx.fillStyle = "#9aa6b8";
    ctx.fillRect(-s, -s * 0.8 - 6, s * 2, 8);
    ctx.fillStyle = "#7d8899";
    for (let k = -s + 3; k < s - 2; k += 9) ctx.fillRect(k, -s * 0.8 - 12, 6, 7);
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
    for (let r = -4; r <= 10; r += 7) { ctx.beginPath(); ctx.moveTo(-s, r); ctx.lineTo(s, r); ctx.stroke(); }
  }
  ctx.restore();
}

export default function OneButtonCiv({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });
  const [civ, setCiv] = useState<CivState>(() => newCiv(0));
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const civRef = useRef(civ);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const fx = useRef<Fx[]>([]);
  const logSeen = useRef(0);
  const tapPulse = useRef(0);
  const prevStatus = useRef(civ.status);

  const load = useCallback((i: number) => {
    const s = newCiv(i);
    civRef.current = s;
    logSeen.current = 0;
    fx.current = [];
    setCiv(s);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(GAME_ID, STAGE_COUNT);
    setCleared(done);
    load(nextOpenStage(done, STAGE_COUNT));
    setMuted(readMutedPref(MUTE_KEY));
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => { void audio.current?.close().catch(() => undefined); };
  }, [load]);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = civ.status;
    if (prev === civ.status) return;
    if (civ.status === "won") {
      setCleared(markStageCleared(GAME_ID, civ.island.index, STAGE_COUNT));
      try { recordResult(GAME_ID, "w"); recordBest(GAME_ID, civ.island.index + 1, "score"); } catch { /* storage blocked */ }
      haptics.current?.fire("win");
    } else if (civ.status === "lost") {
      try { recordResult(GAME_ID, "l"); } catch { /* storage blocked */ }
      haptics.current?.fire("fail");
    }
  }, [civ.status, civ.island.index]);

  const ensureAudio = () => {
    if (audio.current) return audio.current;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio.current = Ctx ? new Ctx() : null;
    } catch { audio.current = null; }
    return audio.current;
  };
  const sound = (freq: number, vol?: number, type?: OscillatorType, len?: number) => {
    if (!mutedRef.current) boop(audio.current, freq, vol, type, len);
  };

  const start = () => {
    ensureAudio();
    void audio.current?.resume().catch(() => undefined);
    const s = begin(civRef.current);
    civRef.current = s;
    setCiv(s);
    canvasRef.current?.focus();
  };

  const press = () => {
    const s = civRef.current;
    if (s.status === "ready") { start(); return; }
    if (s.status !== "play") return;
    const next = tapCiv(s);
    tapPulse.current = 1;
    if (next !== s) {
      civRef.current = next;
      const b = season(s);
      sound(b === "field" ? 523 : b === "road" ? 392 : 262, 0.16, "square", 0.1);
      haptics.current?.fire("tap");
    } else sound(180, 0.06, "sine", 0.06);
  };

  // simulation + render loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let hudAt = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      let s = civRef.current;
      if (s.status === "play") {
        s = tick(s, dt);
        civRef.current = s;
        for (let k = logSeen.current; k < s.log.length; k++) {
          const e = s.log[k]!;
          fx.current.push({ kind: e.kind, plot: e.plot, t: 0 });
          if (e.kind === "repelled") { sound(660, 0.16, "triangle", 0.2); haptics.current?.fire("success"); }
          else if (e.kind === "burned") { sound(110, 0.2, "sawtooth", 0.35); haptics.current?.fire("fail"); }
          else if (e.kind === "grew") sound(880, 0.08, "sine", 0.08);
        }
        logSeen.current = s.log.length;
        if (now - hudAt > 120 || s.status !== "play") { hudAt = now; setCiv(s); }
      }
      fx.current = fx.current.filter((f) => (f.t += dt) < 1.2);
      tapPulse.current = Math.max(0, tapPulse.current - dt * 5);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const se = season(s);
        const seasonT = (s.t % s.island.seasonS) / s.island.seasonS;
        // sea
        const sea = ctx.createRadialGradient(CX, CY, 60, CX, CY, 300);
        sea.addColorStop(0, se === "wall" ? "#5b7fa8" : "#3fa7c9");
        sea.addColorStop(1, se === "wall" ? "#1f3550" : "#14506e");
        ctx.fillStyle = sea;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
        for (let k = 0; k < 7; k++) {
          const wx = (k * 71 + time * 12) % (W + 40) - 20;
          const wy = 40 + ((k * 113) % (H - 60));
          ctx.beginPath(); ctx.arc(wx, wy, 8, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        }
        // island
        ctx.fillStyle = "#f3e2b0";
        ctx.beginPath(); ctx.arc(CX, CY, RING + 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = se === "wall" ? "#dfe8ee" : "#8cc66a";
        ctx.beginPath(); ctx.arc(CX, CY, RING - 26, 0, Math.PI * 2); ctx.fill();
        if (se === "wall") {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          for (let k = 0; k < 24; k++) ctx.fillRect((k * 61 + time * 8) % W, (k * 37 + time * 30) % H, 2, 2);
        }
        // raid markers (threats inside the warning window)
        const threats = upcoming(s);
        for (const r of threats) {
          const [px, py] = ringXY(r.plot);
          const warn = s.island.seasonS * 6;
          const k = Math.max(0, Math.min(1, r.inS / warn));
          ctx.strokeStyle = `rgba(255,70,70,${0.55 + 0.45 * Math.sin(time * 8)})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(px, py, 25, 0, Math.PI * 2); ctx.stroke();
          // ship sailing in from the edge
          const [sx, sy] = ringXY(r.plot, RING + 40 + k * 120);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(plotAngle(r.plot) + Math.PI / 2);
          ctx.fillStyle = "#5a3825";
          ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(8, 7); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#d94b4b";
          ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(10, -3); ctx.lineTo(0, -3); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#3b2416"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 0); ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "#ffffff";
          ctx.font = "800 13px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(String(Math.max(0, Math.ceil(r.inS))), px, py - 28);
        }
        // plots
        for (let p = 0; p < PLOTS; p++) {
          const [x, y] = ringXY(p);
          drawPlot(ctx, s.plots[p]!, x, y, plotAngle(p), time);
        }
        // builder
        const under = plotUnder(s);
        {
          const a = -Math.PI / 2 + (s.pos / PLOTS) * Math.PI * 2;
          const bx = CX + Math.cos(a) * RING;
          const by = CY + Math.sin(a) * RING;
          const [ux, uy] = ringXY(under);
          ctx.strokeStyle = `hsla(${SEASON_HUE[se]},90%,55%,0.95)`;
          ctx.lineWidth = 3 + tapPulse.current * 3;
          ctx.beginPath(); ctx.arc(ux, uy, 23 + tapPulse.current * 4, 0, Math.PI * 2); ctx.stroke();
          const hop = Math.abs(Math.sin(time * 10)) * 4;
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath(); ctx.ellipse(bx, by + 8, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#e8553a";
          ctx.beginPath(); ctx.roundRect(bx - 7, by - 10 - hop, 14, 14, 4); ctx.fill();
          ctx.fillStyle = "#ffd9b0";
          ctx.beginPath(); ctx.arc(bx, by - 16 - hop, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#f2c230";
          ctx.beginPath(); ctx.ellipse(bx, by - 21 - hop, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
        // town in the middle, grows with population
        const houses = Math.min(24, s.pop);
        for (let k = 0; k < houses; k++) {
          const ring = k < 6 ? 0 : k < 14 ? 1 : 2;
          const inRing = ring === 0 ? k : ring === 1 ? k - 6 : k - 14;
          const count = ring === 0 ? 6 : ring === 1 ? 8 : 10;
          const ang = (inRing / count) * Math.PI * 2 + ring * 0.3;
          const rr = 18 + ring * 22;
          const hx = CX + Math.cos(ang) * rr;
          const hy = CY + 18 + Math.sin(ang) * rr * 0.6;
          ctx.fillStyle = ["#f4a259", "#e76f51", "#f6bd60", "#84a59d"][k % 4]!;
          ctx.fillRect(hx - 6, hy - 6, 12, 9);
          ctx.fillStyle = "#7a3b2e";
          ctx.beginPath(); ctx.moveTo(hx - 8, hy - 6); ctx.lineTo(hx, hy - 13); ctx.lineTo(hx + 8, hy - 6); ctx.closePath(); ctx.fill();
        }
        // season wheel
        {
          const wx = CX;
          const wy = CY - 42;
          for (let k = 0; k < 3; k++) {
            const b = (["field", "road", "wall"] as const)[k]!;
            ctx.fillStyle = `hsla(${SEASON_HUE[b]},70%,${b === se ? 52 : 80}%,${b === se ? 1 : 0.6})`;
            ctx.beginPath(); ctx.moveTo(wx, wy);
            ctx.arc(wx, wy, 26, -Math.PI / 2 + (k * Math.PI * 2) / 3, -Math.PI / 2 + ((k + 1) * Math.PI * 2) / 3);
            ctx.closePath(); ctx.fill();
          }
          const idx = ["field", "road", "wall"].indexOf(se);
          const needle = -Math.PI / 2 + ((idx + seasonT) * Math.PI * 2) / 3;
          ctx.strokeStyle = "#1c1b2e"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(needle) * 24, wy + Math.sin(needle) * 24); ctx.stroke();
          ctx.fillStyle = "#1c1b2e"; ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI * 2); ctx.fill();
        }
        // season label
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath(); ctx.roundRect(CX - 80, 10, 160, 28, 14); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = "800 15px system-ui"; ctx.textAlign = "center";
        ctx.fillText(c.season[se], CX, 29);
        // effects
        for (const f of fx.current) {
          const [x, y] = ringXY(f.plot);
          const k = f.t / 1.2;
          if (f.kind === "burned") {
            for (let n = 0; n < 8; n++) {
              ctx.fillStyle = `rgba(255,${120 + n * 12},40,${1 - k})`;
              ctx.beginPath(); ctx.arc(x + Math.sin(n * 2.3) * 16 * k, y - k * 40 - n * 3, 6 * (1 - k) + 2, 0, Math.PI * 2); ctx.fill();
            }
          }
          if (f.kind === "repelled") {
            ctx.strokeStyle = `rgba(120,220,255,${1 - k})`; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x, y, 22 + k * 30, 0, Math.PI * 2); ctx.stroke();
          }
          const txt = f.kind === "burned" ? c.burned : f.kind === "repelled" ? c.repelled : f.kind === "grew" ? c.grew : "";
          if (txt) {
            ctx.fillStyle = f.kind === "burned" ? `rgba(255,120,90,${1 - k})` : f.kind === "grew" ? `rgba(255,240,140,${1 - k})` : `rgba(200,240,255,${1 - k})`;
            ctx.font = "800 14px system-ui"; ctx.textAlign = "center";
            const [tx, ty] = f.kind === "grew" ? [CX, CY + 60] : [x, y];
            ctx.fillText(txt, tx, ty - 30 - k * 20);
          }
        }
        // year progress bar at the bottom
        const T = timeLimit(s.island);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.roundRect(20, H - 22, W - 40, 10, 5); ctx.fill();
        ctx.fillStyle = "#ffd166";
        ctx.beginPath(); ctx.roundRect(20, H - 22, Math.max(4, (W - 40) * (1 - s.t / T)), 10, 5); ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // copy strings are stable per locale; the loop reads sim state from refs
  }, [c]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); press(); }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const yearsLeft = Math.max(0, Math.ceil((timeLimit(civ.island) - civ.t) / (civ.island.seasonS * 3)));
  const st = stars(civ);
  const lostByTime = civ.status === "lost" && civ.hearts > 0;

  return (
    <div
      ref={containerRef}
      data-game="one-button-civ"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.island, civ.island.index + 1)} / {STAGE_COUNT}</Badge>
        <Badge variant="outline">{fill(c.pop, civ.pop, civ.island.goal)}</Badge>
        <Badge variant="outline" aria-label={`${civ.hearts}/${HEARTS}`}>{"♥".repeat(Math.max(0, civ.hearts))}{"♡".repeat(Math.max(0, HEARTS - civ.hearts))}</Badge>
        <Badge variant="outline">{fill(c.years, yearsLeft)}</Badge>
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
          width={W * DPR}
          height={H * DPR}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={(e) => { e.preventDefault(); if (civRef.current.status === "play") press(); }}
          className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
          aria-label={c.hint}
        />
        {civ.status === "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 p-4 text-center">
            <p className="text-2xl font-black">{fill(c.island, civ.island.index + 1)}</p>
            <p className="text-sm">{fill(c.pop, 3, civ.island.goal)}</p>
            <Button className="min-h-12 min-w-40" onClick={start}>{c.start}</Button>
          </div>
        ) : null}
      </div>

      {civ.status === "won" || civ.status === "lost" ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" aria-live="polite">
          <p className="text-lg font-bold">{civ.status === "won" ? c.won : lostByTime ? c.lostTime : c.lost}</p>
          {civ.status === "won" ? <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p> : null}
          {civ.status === "won" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(civ.island.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
              <Button className="min-h-12" onClick={() => load(civ.island.index >= STAGE_COUNT - 1 ? 0 : civ.island.index + 1)}>
                {civ.island.index >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => load(civ.island.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
          )}
        </div>
      ) : (
        <Button size="lg" className="min-h-14 w-full" disabled={civ.status !== "play"} onClick={press}>{c.build}</Button>
      )}

      <p className="text-xs text-muted-foreground">{c.hint}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={civ.island.index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
