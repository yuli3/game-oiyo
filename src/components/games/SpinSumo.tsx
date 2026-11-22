import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Maximize2, Minimize2, Users, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useOutcomeRecord, type RunOutcome } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  ARENAS, ARENA_COUNT, SUMO_SLUG, TOP_R, WINS_NEEDED, arenaOf, cpuHold, newRound, powerOf, roundWinner, step, type Hold, type World,
} from "../../lib/games/spin-sumo";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  arena: string; vsCpu: string; twoP: string; you: string; cpu: string; p1: string; p2: string; round: string; ready: string;
  roundWin: string; draw: string; matchWin: string; matchLose: string; p1Win: string; p2Win: string; rematch: string; next: string;
  help: string; help2: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; names: Record<string, string>;
}> = {
  ko: {
    arena: "{0}번째 판", vsCpu: "컴퓨터와", twoP: "둘이서", you: "나", cpu: "컴퓨터", p1: "빨강", p2: "파랑", round: "{0} : {1}", ready: "꾹 눌러 힘 모으기!",
    roundWin: "{0} 승!", draw: "무승부, 다시!", matchWin: "이겼어요! 팽이 장사!", matchLose: "아쉽게 졌어요", p1Win: "빨강 팽이 우승!", p2Win: "파랑 팽이 우승!", rematch: "다시 붙기", next: "다음 판",
    help: "누르고 있으면 화살표가 돌고 힘이 차올랐다 빠집니다. 원하는 방향·힘에서 손을 떼면 돌진! 상대를 판 밖으로 밀어내거나 구멍에 빠뜨리면 이깁니다. 3판 2선승.",
    help2: "둘이서: 휴대폰을 탁자에 놓고 아래쪽 절반은 빨강, 위쪽 절반은 파랑이 누릅니다. 키보드는 스페이스(빨강), Enter(파랑).",
    stages: "판 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    names: { yard: "흙마당", crocks: "장독대", pond: "얼음 연못", mat: "좁은 멍석", pillars: "기둥 마당", shrinking: "줄어드는 원", windy: "바람 언덕", holes: "구멍 마루", icepillars: "얼음 기둥", turntable: "도는 원판", iceshrink: "녹는 빙판", champion: "왕중왕전" },
  },
  en: {
    arena: "Arena {0}", vsCpu: "vs CPU", twoP: "2 players", you: "You", cpu: "CPU", p1: "Red", p2: "Blue", round: "{0} : {1}", ready: "Hold to charge!",
    roundWin: "{0} wins!", draw: "Draw, again!", matchWin: "You win! Spin champion!", matchLose: "So close!", p1Win: "Red top wins!", p2Win: "Blue top wins!", rematch: "Rematch", next: "Next arena",
    help: "Hold and the arrow sweeps around while the power swings up and down. Let go at the right angle and power to dash! Push the rival off the ring or into a hole. Best of three.",
    help2: "2 players: lay the phone flat; the bottom half is Red, the top half is Blue. Keyboard: Space (Red), Enter (Blue).",
    stages: "Pick an arena", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    names: { yard: "Dirt yard", crocks: "Crock terrace", pond: "Frozen pond", mat: "Small straw mat", pillars: "Pillar yard", shrinking: "Shrinking ring", windy: "Windy hill", holes: "Holey floor", icepillars: "Ice pillars", turntable: "Turntable", iceshrink: "Melting ice", champion: "Champion's ring" },
  },
  ja: {
    arena: "{0}番目の土俵", vsCpu: "CPUと", twoP: "ふたりで", you: "あなた", cpu: "CPU", p1: "赤", p2: "青", round: "{0} : {1}", ready: "長押しで力をためる！",
    roundWin: "{0}の勝ち！", draw: "引き分け、もう一回！", matchWin: "勝利！こま横綱！", matchLose: "惜しい！", p1Win: "赤こまの優勝！", p2Win: "青こまの優勝！", rematch: "再戦", next: "次の土俵",
    help: "押している間、矢印が回り、力が満ちては引きます。狙った向きと力で離すと突進！相手を土俵の外や穴に落とせば勝ち。3本中2本先取。",
    help2: "ふたりで：スマホを机に置き、下半分が赤、上半分が青。キーボードはスペース（赤）、Enter（青）。",
    stages: "土俵を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    names: { yard: "土の庭", crocks: "甕置き場", pond: "凍った池", mat: "狭いむしろ", pillars: "柱の庭", shrinking: "縮む輪", windy: "風の丘", holes: "穴あき床", icepillars: "氷の柱", turntable: "回る円盤", iceshrink: "溶ける氷", champion: "王者決定戦" },
  },
  zh: {
    arena: "第{0}场", vsCpu: "人机对战", twoP: "双人", you: "我", cpu: "电脑", p1: "红", p2: "蓝", round: "{0} : {1}", ready: "按住蓄力！",
    roundWin: "{0}赢了！", draw: "平局，再来！", matchWin: "你赢了！陀螺冠军！", matchLose: "差一点！", p1Win: "红陀螺夺冠！", p2Win: "蓝陀螺夺冠！", rematch: "再战", next: "下一场",
    help: "按住时箭头会转圈，力量会涨了又落。在想要的方向和力度松手就会冲撞！把对手推出场外或推进洞里就赢。三局两胜。",
    help2: "双人：把手机平放在桌上，下半屏是红方，上半屏是蓝方。键盘：空格（红），回车（蓝）。",
    stages: "选择场地", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    names: { yard: "泥土院子", crocks: "酱缸台", pond: "冰冻池塘", mat: "小草席", pillars: "柱子院", shrinking: "缩小的圈", windy: "风之丘", holes: "破洞地板", icepillars: "冰柱", turntable: "转盘", iceshrink: "融化的冰", champion: "王中王" },
  },
  fr: {
    arena: "Arène {0}", vsCpu: "Contre l'ordi", twoP: "À deux", you: "Vous", cpu: "Ordi", p1: "Rouge", p2: "Bleu", round: "{0} : {1}", ready: "Maintenez pour charger !",
    roundWin: "{0} gagne !", draw: "Égalité, encore !", matchWin: "Gagné ! Champion des toupies !", matchLose: "Presque !", p1Win: "La toupie rouge gagne !", p2Win: "La toupie bleue gagne !", rematch: "Revanche", next: "Arène suivante",
    help: "Maintenez : la flèche tourne et la puissance monte et descend. Relâchez au bon angle et à la bonne force pour foncer ! Poussez l'adversaire hors du cercle ou dans un trou. En deux manches gagnantes.",
    help2: "À deux : posez le téléphone à plat ; la moitié basse est Rouge, la haute Bleu. Clavier : Espace (Rouge), Entrée (Bleu).",
    stages: "Choisir une arène", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    names: { yard: "Cour en terre", crocks: "Terrasse aux jarres", pond: "Étang gelé", mat: "Petite natte", pillars: "Cour aux piliers", shrinking: "Cercle qui rétrécit", windy: "Colline venteuse", holes: "Plancher troué", icepillars: "Piliers de glace", turntable: "Plateau tournant", iceshrink: "Glace qui fond", champion: "Cercle des champions" },
  },
  es: {
    arena: "Arena {0}", vsCpu: "Contra la CPU", twoP: "Dos jugadores", you: "Tú", cpu: "CPU", p1: "Rojo", p2: "Azul", round: "{0} : {1}", ready: "¡Mantén para cargar!",
    roundWin: "¡Gana {0}!", draw: "¡Empate, otra vez!", matchWin: "¡Ganaste! ¡Campeón de peonzas!", matchLose: "¡Casi!", p1Win: "¡Gana la peonza roja!", p2Win: "¡Gana la peonza azul!", rematch: "Revancha", next: "Siguiente arena",
    help: "Mantén pulsado: la flecha gira y la fuerza sube y baja. ¡Suelta en el ángulo y la fuerza justos para embestir! Echa al rival del círculo o a un agujero. Al mejor de tres.",
    help2: "Dos jugadores: deja el móvil en la mesa; la mitad de abajo es Rojo y la de arriba Azul. Teclado: Espacio (Rojo), Intro (Azul).",
    stages: "Elegir arena", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    names: { yard: "Patio de tierra", crocks: "Terraza de tinajas", pond: "Estanque helado", mat: "Esterilla", pillars: "Patio de pilares", shrinking: "Círculo menguante", windy: "Colina ventosa", holes: "Suelo agujereado", icepillars: "Pilares de hielo", turntable: "Plato giratorio", iceshrink: "Hielo que se funde", champion: "Ring de campeones" },
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:spin-sumo:muted";
const SIZE = 400;
const C = SIZE / 2;
const COLORS = ["#e03131", "#1c7ed6"] as const;

type Phase = "count" | "play" | "roundEnd" | "matchEnd";

function drawTop(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, spin: number, t: number, wobble: number, out: boolean): void {
  ctx.save();
  ctx.translate(C + x + Math.sin(t * 40) * wobble * 3, C + y);
  if (out) ctx.globalAlpha = 0.35;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(3, 5, TOP_R, TOP_R * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(t * (6 + spin * 22));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, TOP_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, TOP_R - 2, (k * Math.PI) / 2, (k * Math.PI) / 2 + 0.5);
    ctx.fill();
  }
  ctx.fillStyle = "#ffd43b";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function SpinSumo({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [mode, setMode] = useState<"cpu" | "2p">("cpu");
  const [arena, setArena] = useState(0);
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [phase, setPhase] = useState<Phase>("count");
  const [banner, setBanner] = useState("3");
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const world = useRef<World>(newRound(0, 1));
  const hold = useRef<Hold>([false, false]);
  const pointers = useRef<Map<number, 0 | 1>>(new Map());
  const phaseRef = useRef<Phase>("count");
  const timer = useRef(0);
  const round = useRef(1);
  const winsRef = useRef<[number, number]>([0, 0]);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useOutcomeRecord(SUMO_SLUG, mode === "cpu" ? outcome : null);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const setPh = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const startMatch = useCallback((a: number, m: "cpu" | "2p" = modeRef.current) => {
    setArena(a);
    setMode(m);
    modeRef.current = m;
    winsRef.current = [0, 0];
    setWins([0, 0]);
    round.current = 1;
    world.current = newRound(a, Date.now() % 100000);
    hold.current = [false, false];
    timer.current = 2.4;
    setBanner("3");
    setOutcome(null);
    phaseRef.current = "count";
    setPhase("count");
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SUMO_SLUG, ARENA_COUNT);
    setCleared(done);
    startMatch(nextOpenStage(done, ARENA_COUNT), "cpu");
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [startMatch]);

  useEffect(() => {
    const keys = (down: boolean) => (e: KeyboardEvent) => {
      const host = containerRef.current;
      if (!host || !(host.contains(document.activeElement) || document.activeElement === document.body)) return;
      if (e.code === "Space") { hold.current[0] = down; e.preventDefault(); }
      if (e.code === "Enter" && modeRef.current === "2p") { hold.current[1] = down; e.preventDefault(); }
    };
    const kd = keys(true);
    const ku = keys(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [containerRef]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const ph = phaseRef.current;
      if (ph === "count" || ph === "roundEnd") {
        timer.current -= dt;
        if (ph === "count") setBanner(timer.current > 1.6 ? "3" : timer.current > 0.8 ? "2" : timer.current > 0 ? "1" : "");
        if (timer.current <= 0) {
          if (ph === "count") setPh("play");
          else {
            round.current += 1;
            world.current = newRound(world.current.arena, Date.now() % 100000);
            timer.current = 2.4;
            setPh("count");
          }
        }
      } else if (ph === "play") {
        acc += dt;
        while (acc >= 1 / 60) {
          acc -= 1 / 60;
          const w = world.current;
          let h1 = hold.current[1];
          let wait = w.cpuWait;
          if (modeRef.current === "cpu") {
            const r = cpuHold(w, 1);
            h1 = r.hold;
            if (r.wait) wait = r.wait;
          }
          const res = step({ ...w, cpuWait: wait }, [hold.current[0], h1], 1 / 60);
          world.current = res.world;
          if (res.events.dash.length) sfx("tap");
          if (res.events.hit > 120) sfx("combo");
          else if (res.events.hit > 30) sfx("place");
          const win = roundWinner(res.world);
          if (win >= 0) {
            const nw: [number, number] = [...winsRef.current] as [number, number];
            if (win < 2) nw[win] += 1;
            winsRef.current = nw;
            setWins(nw);
            const isCpu = modeRef.current === "cpu";
            if (win === 2) setBanner(c.draw);
            else setBanner(fill(c.roundWin, isCpu ? (win === 0 ? c.you : c.cpu) : win === 0 ? c.p1 : c.p2));
            if (nw[0] >= WINS_NEEDED || nw[1] >= WINS_NEEDED) {
              const p1 = nw[0] >= WINS_NEEDED;
              setPh("matchEnd");
              setBanner(isCpu ? (p1 ? c.matchWin : c.matchLose) : p1 ? c.p1Win : c.p2Win);
              sfx(p1 || !isCpu ? "win" : "lose");
              if (isCpu) {
                setOutcome(p1 ? "w" : "l");
                if (p1) setCleared(markStageCleared(SUMO_SLUG, res.world.arena, ARENA_COUNT));
              }
            } else {
              sfx(win === 0 || !isCpu ? "success" : "fail");
              timer.current = 1.4;
              setPh("roundEnd");
            }
            break;
          }
        }
      }
      // draw
      const ctx = canvasRef.current?.getContext("2d");
      const w = world.current;
      if (ctx) {
        const a = arenaOf(w);
        const t = now / 1000;
        ctx.fillStyle = "#2b2118";
        ctx.fillRect(0, 0, SIZE, SIZE);
        const icy = a.friction < 0.5;
        // ring
        ctx.fillStyle = icy ? "#d0ebff" : a.id === "mat" ? "#d8b26e" : "#c8a47e";
        ctx.beginPath();
        ctx.arc(C, C, w.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = icy ? "rgba(255,255,255,0.8)" : "rgba(120,80,40,0.35)";
        ctx.lineWidth = 2;
        for (let r = 24; r < w.radius; r += 24) {
          ctx.beginPath();
          ctx.arc(C, C, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (a.swirl) {
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 3;
          for (let k = 0; k < 6; k++) {
            ctx.beginPath();
            ctx.arc(C, C, w.radius * 0.7, t * 0.8 + k, t * 0.8 + k + 0.4);
            ctx.stroke();
          }
        }
        if (a.wind) {
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 2;
          for (let k = 0; k < 7; k++) {
            const x = ((t * 80 + k * 70) % (SIZE + 60)) - 30;
            const y = 40 + k * 50;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 26, y);
            ctx.stroke();
          }
        }
        ctx.strokeStyle = "#f8f9fa";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(C, C, w.radius, 0, Math.PI * 2);
        ctx.stroke();
        for (const p of a.pits) {
          ctx.fillStyle = "#111";
          ctx.beginPath();
          ctx.arc(C + p.x, C + p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const b of a.bumpers) {
          ctx.fillStyle = "#6f4e37";
          ctx.beginPath();
          ctx.arc(C + b.x, C + b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#8b5e3c";
          ctx.beginPath();
          ctx.arc(C + b.x - 3, C + b.y - 3, b.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3b2a20";
          ctx.beginPath();
          ctx.arc(C + b.x - 3, C + b.y - 3, b.r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        w.tops.forEach((top, i) => {
          if (top.charging > 0) {
            // power ring and aim arrow
            const pw = powerOf(top.charging);
            ctx.strokeStyle = COLORS[i];
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(C + top.x, C + top.y, TOP_R + 8, -Math.PI / 2, -Math.PI / 2 + pw * Math.PI * 2);
            ctx.stroke();
            const len = 30 + pw * 50;
            const ax = C + top.x + Math.cos(top.angle) * len;
            const ay = C + top.y + Math.sin(top.angle) * len;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(C + top.x, C + top.y);
            ctx.lineTo(ax, ay);
            ctx.stroke();
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(ax, ay, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          drawTop(ctx, top.x, top.y, COLORS[i], Math.max(0, top.spin), t, top.wobble, top.out);
          // spin bar
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(C + top.x - 18, C + top.y + TOP_R + 6, 36, 5);
          ctx.fillStyle = top.spin > 0.4 ? "#69db7c" : "#ffa94d";
          ctx.fillRect(C + top.x - 18, C + top.y + TOP_R + 6, 36 * Math.max(0, top.spin), 5);
        });
        if (modeRef.current === "2p") {
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(0, C);
          ctx.lineTo(SIZE, C);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const who = (e: React.PointerEvent<HTMLCanvasElement>): 0 | 1 => {
    if (modeRef.current === "cpu") return 0;
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientY - rect.top > rect.height / 2 ? 0 : 1;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = who(e);
    pointers.current.set(e.pointerId, p);
    hold.current[p] = true;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (p === undefined) return;
    if (![...pointers.current.values()].includes(p)) hold.current[p] = false;
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const a = ARENAS[arena];
  const left = mode === "cpu" ? c.you : c.p1;
  const right = mode === "cpu" ? c.cpu : c.p2;

  return (
    <div
      ref={containerRef}
      data-game="spin-sumo"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.arena, arena + 1)} / {ARENA_COUNT}</Badge>
        <Badge variant="outline">{c.names[a.id]}</Badge>
        <Badge variant="outline">{left} {fill(c.round, wins[0], wins[1])} {right}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={c.vsCpu}>
        <Button variant={mode === "cpu" ? "default" : "outline"} className="min-h-11" role="radio" aria-checked={mode === "cpu"} onClick={() => startMatch(arena, "cpu")}>
          <Bot className="size-4" />
          {c.vsCpu}
        </Button>
        <Button variant={mode === "2p" ? "default" : "outline"} className="min-h-11" role="radio" aria-checked={mode === "2p"} onClick={() => startMatch(arena, "2p")}>
          <Users className="size-4" />
          {c.twoP}
        </Button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          onContextMenu={(e) => e.preventDefault()}
          className="mx-auto block aspect-square w-full max-w-md touch-none select-none rounded-xl border border-border"
          aria-label={c.help}
        />
        {banner && phase !== "play" ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="rounded-xl bg-background/85 px-4 py-2 text-2xl font-black shadow">{banner}</span>
            {phase === "count" ? <span className="rounded bg-background/70 px-2 text-sm">{c.ready}</span> : null}
          </div>
        ) : null}
      </div>

      {phase === "matchEnd" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="min-h-12" onClick={() => startMatch(arena)}>{c.rematch}</Button>
          <Button className="min-h-12" onClick={() => startMatch(arena >= ARENA_COUNT - 1 ? 0 : arena + 1)}>
            {arena >= ARENA_COUNT - 1 ? finaleLabel(locale) : c.next}
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{c.help}</p>
      <p className="text-xs text-muted-foreground">{c.help2}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={ARENA_COUNT} current={arena} cleared={cleared} locale={locale} onSelect={(i) => startMatch(i)} />
        </div>
      </details>
    </div>
  );
}
