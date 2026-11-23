import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Maximize2, Minimize2, RotateCcw, Users, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useOutcomeRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { FIELD_H, FIELD_W, KITE_SLUG, RIVALS, RIVAL_COUNT, duelWinner, newDuel, setTarget, stepDuel, timeLeft, windAt, type Duel } from "../../lib/games/kite-duel";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const RIVAL_NAMES: Record<L, readonly string[]> = {
  ko: ["동네 꼬마", "사촌 형", "옆집 누나", "반 친구", "삼촌", "고모", "연날리기 반장", "쌍둥이 남매", "나루터 사공", "장터 상인", "강둑 고수", "방앗간 주인", "학교 대표", "마을 대표", "군 대표", "도 대표", "유리 연줄 장인", "폭풍 연꾼", "작년 우승자", "연싸움 명인"],
  en: ["Little kid", "Cousin", "Girl next door", "Classmate", "Uncle", "Aunt", "Kite club captain", "The twins", "Ferryman", "Market trader", "Riverbank ace", "Miller", "School champ", "Village champ", "County champ", "Province champ", "Glass-string maker", "Storm flyer", "Last year's winner", "Kite master"],
  ja: ["近所の子", "いとこ", "隣のお姉さん", "クラスメイト", "おじさん", "おばさん", "凧あげ班長", "双子のきょうだい", "渡し守", "市場の商人", "川辺の名手", "粉ひき屋", "学校代表", "村代表", "郡代表", "道代表", "ガラス糸の職人", "嵐の凧使い", "昨年の優勝者", "凧合戦の名人"],
  zh: ["邻家小孩", "表哥", "隔壁姐姐", "同班同学", "叔叔", "姑姑", "风筝队长", "双胞胎", "渡口船夫", "集市商人", "河岸高手", "磨坊主人", "学校代表", "村代表", "郡代表", "道代表", "玻璃线匠人", "风暴放鸢人", "去年冠军", "斗风筝大师"],
  fr: ["Le petit voisin", "Le cousin", "La voisine", "Un camarade", "L'oncle", "La tante", "Le chef du club", "Les jumeaux", "Le passeur", "Le marchand", "L'as de la berge", "Le meunier", "Champion de l'école", "Champion du village", "Champion du canton", "Champion de la province", "L'artisan du fil de verre", "Le pilote des tempêtes", "Le vainqueur sortant", "Le maître du cerf-volant"],
  es: ["El niño del barrio", "El primo", "La vecina", "Un compañero", "El tío", "La tía", "La capitana del club", "Los mellizos", "El barquero", "El comerciante", "El as de la ribera", "El molinero", "Campeón del colegio", "Campeón del pueblo", "Campeón comarcal", "Campeón provincial", "El maestro del hilo de vidrio", "El piloto de tormentas", "El campeón del año pasado", "El maestro cometero"],
};

const COPY: Record<L, {
  rival: string; vsCpu: string; twoP: string; time: string; youWin: string; cpuWin: string; redWin: string; blueWin: string; draw: string;
  again: string; next: string; help: string; help2: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; wind: string; cut: string;
}> = {
  ko: {
    rival: "{0}번째 상대", vsCpu: "컴퓨터와", twoP: "둘이서", time: "{0}초", youWin: "상대 연줄을 끊었어요!", cpuWin: "연줄이 끊겼어요", redWin: "빨강 승리!", blueWin: "파랑 승리!", draw: "무승부",
    again: "다시 겨루기", next: "다음 상대", wind: "바람", cut: "끊김!",
    help: "손가락을 대고 움직이면 내 연(빨강)이 따라옵니다. 내 연줄을 상대 연줄 위로 교차시킨 뒤, 상대보다 빠르게 연을 휘두르면 상대 줄이 갈려 끊어집니다. 느리게 있으면 내 줄이 갈려요. 까치에 부딪히면 잠깐 휘청입니다. 60초가 지나면 줄이 더 많이 남은 쪽이 이깁니다.",
    help2: "둘이서: 휴대폰을 둘 사이에 눕혀 두고, 아래쪽 절반에서 끌면 빨강, 위쪽 절반에서 끌면 파랑 연이 움직입니다(동시 터치 가능).",
    stages: "상대 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    rival: "Rival {0}", vsCpu: "Vs computer", twoP: "Two players", time: "{0}s", youWin: "You cut their string!", cpuWin: "Your string snapped", redWin: "Red wins!", blueWin: "Blue wins!", draw: "Draw",
    again: "Fly again", next: "Next rival", wind: "Wind", cut: "Snap!",
    help: "Touch and drag: your red kite follows your finger. Cross your string over the rival's, then whip your kite faster than theirs and your string saws through theirs. Hold still and yours gets sawn instead. Magpies make a kite tumble for a moment. After 60 seconds the kite with more string left wins.",
    help2: "Two players: lay the phone flat between you. Drag on the bottom half to fly red, on the top half to fly blue (multitouch works).",
    stages: "Pick a rival", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    rival: "{0}人目の相手", vsCpu: "CPUと", twoP: "2人で", time: "{0}秒", youWin: "相手の糸を切った！", cpuWin: "糸が切れました", redWin: "赤の勝ち！", blueWin: "青の勝ち！", draw: "引き分け",
    again: "もう一度", next: "次の相手", wind: "風", cut: "切れた！",
    help: "指を置いて動かすと自分の凧（赤）がついてきます。自分の糸を相手の糸に交差させ、相手より速く凧を振ると相手の糸がこすれて切れます。じっとしていると自分の糸が切られます。カササギに当たると少しふらつきます。60秒たったら糸が多く残っているほうの勝ち。",
    help2: "2人で：スマホを2人の間に置き、下半分をドラッグすると赤、上半分をドラッグすると青の凧が動きます（同時タッチ可）。",
    stages: "相手を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    rival: "第{0}位对手", vsCpu: "对战电脑", twoP: "双人", time: "{0}秒", youWin: "割断了对手的线！", cpuWin: "你的线断了", redWin: "红方获胜！", blueWin: "蓝方获胜！", draw: "平局",
    again: "再斗一次", next: "下一位对手", wind: "风", cut: "断了！",
    help: "手指按住移动，你的红风筝就会跟随。让你的线和对手的线交叉，再比对手更快地甩动风筝，你的线就会把对方的线磨断。待着不动的话，被磨断的就是你。撞到喜鹊会晃一下。60秒后，线剩得多的一方获胜。",
    help2: "双人：把手机平放在两人中间，拖动下半屏控制红风筝，拖动上半屏控制蓝风筝（支持多点触控）。",
    stages: "选择对手", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    rival: "Adversaire {0}", vsCpu: "Contre l'ordi", twoP: "À deux", time: "{0} s", youWin: "Vous avez coupé son fil !", cpuWin: "Votre fil a cédé", redWin: "Rouge gagne !", blueWin: "Bleu gagne !", draw: "Match nul",
    again: "Revoler", next: "Adversaire suivant", wind: "Vent", cut: "Coupé !",
    help: "Touchez et glissez : votre cerf-volant rouge suit le doigt. Croisez votre fil sur celui de l'adversaire, puis agitez votre cerf-volant plus vite que lui : votre fil scie le sien. Si vous restez immobile, c'est le vôtre qui cède. Les pies font tournoyer un cerf-volant un instant. Après 60 secondes, celui qui a le plus de fil intact gagne.",
    help2: "À deux : posez le téléphone à plat entre vous. Glissez sur la moitié basse pour le rouge, sur la moitié haute pour le bleu (multitouche).",
    stages: "Choisir un adversaire", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    rival: "Rival {0}", vsCpu: "Contra la máquina", twoP: "Dos jugadores", time: "{0} s", youWin: "¡Cortaste su hilo!", cpuWin: "Se rompió tu hilo", redWin: "¡Gana Rojo!", blueWin: "¡Gana Azul!", draw: "Empate",
    again: "Volar otra vez", next: "Siguiente rival", wind: "Viento", cut: "¡Cortado!",
    help: "Toca y arrastra: tu cometa roja sigue el dedo. Cruza tu hilo sobre el del rival y agita la cometa más rápido que él: tu hilo sierra el suyo. Si te quedas quieto, el que se corta es el tuyo. Las urracas hacen tambalear la cometa un momento. A los 60 segundos gana quien tenga más hilo entero.",
    help2: "Dos jugadores: deja el móvil plano entre los dos. Arrastra en la mitad de abajo para la roja y en la de arriba para la azul (multitáctil).",
    stages: "Elegir rival", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:kite-duel:muted";

// 방패연-style shield kite: a rectangle with a round hole and a coloured head band.
function shieldKite(band: string, dark: string): PixelArt {
  return {
    palette: { o: dark, w: "#f8f1e1", b: band, d: "#d9ccb0", k: "#3b2a20" },
    rows: [
      "oooooooooooo",
      "obbbbbbbbbbo",
      "obbbbbbbbbbo",
      "owwwwkwwwwwo",
      "owwwkwkwwwwo",
      "owwk....kwwo",
      "owk......kwo",
      "owk......kwo",
      "owwk....kwwo",
      "owwwkwkwwwwo",
      "owwwwkwwwwdo",
      "owwwwwwwwddo",
      "oddddddddddo",
      "oooooooooooo",
    ],
  };
}
const KITE_RED = shieldKite("#e03131", "#5c1a1a");
const KITE_BLUE = shieldKite("#1c7ed6", "#14315c");

const MAGPIE_A: PixelArt = {
  palette: { k: "#111827", w: "#f9fafb", b: "#1e3a8a" },
  rows: [
    "bb........",
    ".bbk...kk.",
    "..kkkkkkkk",
    ".kwwwkkk..",
    "kkkk......",
  ],
};
const MAGPIE_B: PixelArt = {
  palette: MAGPIE_A.palette,
  rows: [
    "..........",
    "...k...kk.",
    "bbkkkkkkkk",
    ".kwwwkkk..",
    "..bbk.....",
  ],
};

const REEL: PixelArt = {
  palette: { o: "#4a2c17", w: "#b7793f", y: "#f2c94c" },
  rows: [
    "o........o",
    "oooooooooo",
    ".wyyyyyyw.",
    ".wyyyyyyw.",
    ".wyyyyyyw.",
    "oooooooooo",
    "o........o",
  ],
};

const SKIES: readonly BackdropSpec[] = [
  { sky: ["#8ec5ff", "#b4d8ff", "#dcecff", "#fff1d6"], orb: { x: 0.8, y: 0.18, r: 9, color: "#fff3bf", glow: "#ffe08a" }, seed: 71 },
  { sky: ["#ff9a76", "#ffbf8a", "#ffe0a8", "#cfe6ff"], orb: { x: 0.2, y: 0.8, r: 12, color: "#ffe066", glow: "#ffb347" }, seed: 72 },
  { sky: ["#5b6b8c", "#7d8fb0", "#a5b4cc", "#d3dbe6"], seed: 73 },
  { sky: ["#1b2346", "#2c3a6b", "#4a5a8f", "#7383b3"], stars: 0.5, orb: { x: 0.75, y: 0.15, r: 7, color: "#fff9db" }, seed: 74 },
];

export default function KiteDuel({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const names = RIVAL_NAMES[locale] ?? RIVAL_NAMES.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [rival, setRival] = useState(0);
  const [mode, setMode] = useState<"cpu" | "2p">("cpu");
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ left: 60, hp: [1, 1] as [number, number] });
  const [winner, setWinner] = useState<0 | 1 | 2 | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const duelRef = useRef<Duel>(newDuel(0, 1));
  const modeRef = useRef<"cpu" | "2p">("cpu");
  const pointers = useRef(new Map<number, { side: 0 | 1; fx: number; fy: number; kx: number; ky: number }>());
  const tails = useRef<Array<Array<[number, number]>>>([[], []]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  useOutcomeRecord(KITE_SLUG, mode === "cpu" && winner !== null ? (winner === 0 ? "w" : winner === 2 ? "d" : "l") : null);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((r: number, m: "cpu" | "2p") => {
    setRival(r);
    setMode(m);
    modeRef.current = m;
    duelRef.current = newDuel(r, Math.floor(Math.random() * 1e6), m === "2p");
    tails.current = [[], []];
    parts.current = [];
    pointers.current.clear();
    setWinner(null);
    setHud({ left: 60, hp: [1, 1] });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(KITE_SLUG, RIVAL_COUNT);
    setCleared(done);
    start(nextOpenStage(done, RIVAL_COUNT), "cpu");
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudTimer = 0;
    let sawTick = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const d = duelRef.current;
      const before = duelWinner(d);
      for (let k = 0; k < 2; k++) {
        const ev = stepDuel(d, dt / 2, modeRef.current === "cpu" ? [1] : []);
        if (ev.crossedNow) cues.current?.play("tap");
        if (ev.bird !== null) { sfx("fail"); spawnBurst(parts.current, d.kites[ev.bird].x, d.kites[ev.bird].y, ["#111827", "#f9fafb", "#1e3a8a"], 10, 90); }
        if (ev.cut !== null && d.cross) spawnBurst(parts.current, d.cross.x, d.cross.y, ["#ffd43b", "#ffffff", ev.cut === 0 ? "#e03131" : "#1c7ed6"], 30, 200);
      }
      if (d.sawing !== null && d.cross) {
        sawTick -= dt;
        if (sawTick <= 0) {
          sawTick = 0.12;
          spawnBurst(parts.current, d.cross.x, d.cross.y, ["#fff3bf", "#ffd43b", "#ffffff"], 3, 90, Math.floor(now));
          cues.current?.play("place");
        }
      }
      const w = duelWinner(d);
      if (before === null && w !== null) {
        setWinner(w);
        if (modeRef.current === "cpu" && w === 0) setCleared(markStageCleared(KITE_SLUG, d.rival, RIVAL_COUNT));
        sfx(w === 0 || (modeRef.current === "2p" && w === 1) ? "win" : w === 2 ? "place" : "lose");
      }
      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.2;
        setHud({ left: Math.ceil(timeLeft(d)), hp: [d.kites[0].hp / d.kites[0].maxHp, d.kites[1].hp / d.kites[1].maxHp] });
      }
      d.kites.forEach((k, i) => {
        const tr = tails.current[i];
        tr.push([k.x, k.y]);
        if (tr.length > 14) tr.shift();
      });
      stepParticles(parts.current, dt, 140);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, FIELD_W, FIELD_H, SKIES[Math.min(3, Math.floor(d.rival / 5))], 4);
        // drifting wind streaks
        const wind = windAt(d);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        for (let k = 0; k < 7; k++) {
          const y = 50 + k * 80;
          const x = (((d.time * (40 + Math.abs(wind)) * (wind >= 0 ? 1 : -1) + k * 97) % (FIELD_W + 60)) + FIELD_W + 60) % (FIELD_W + 60) - 30;
          if (Math.abs(wind) > 5) ctx.fillRect(Math.round(x), y, 18 + Math.min(30, Math.abs(wind) / 4), 2);
        }
        // strings (slight sag downwind)
        d.kites.forEach((k, i) => {
          const a = d.anchors[i];
          if (k.cut) return;
          const mx = (a.x + k.x) / 2 + wind * 0.15;
          const my = (a.y + k.y) / 2;
          ctx.strokeStyle = i === 0 ? "#c92a2a" : "#1864ab";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, k.x, k.y + (i === 0 ? 10 : -10));
          ctx.stroke();
        });
        if (d.cross) {
          ctx.fillStyle = d.sawing === null ? "rgba(255,255,255,0.7)" : "#ffd43b";
          ctx.fillRect(Math.round(d.cross.x) - 3, Math.round(d.cross.y) - 3, 6, 6);
        }
        // magpies
        for (const b of d.birds) drawSprite(ctx, Math.sin(b.flap) > 0 ? MAGPIE_A : MAGPIE_B, b.x, b.y, { scale: 3, flipX: b.vx > 0 });
        // tails and kites
        d.kites.forEach((k, i) => {
          const tr = tails.current[i];
          tr.forEach(([x, y], n) => {
            if (n % 2) return;
            ctx.fillStyle = n % 4 === 0 ? (i === 0 ? "#ff8787" : "#74c0fc") : "#fff3bf";
            const s = 3 + Math.floor((n / tr.length) * 3);
            ctx.fillRect(Math.round(x) - s / 2, Math.round(y + (i === 0 ? 18 : -18)) - s / 2, s, s);
          });
          const tilt = Math.max(-0.5, Math.min(0.5, k.vx / 400)) + (k.stun > 0 ? Math.sin(d.time * 30) * 0.6 : 0);
          drawSprite(ctx, i === 0 ? KITE_RED : KITE_BLUE, k.x, k.y, { scale: 3, rotate: (i === 1 && modeRef.current === "2p" ? Math.PI : 0) + tilt, alpha: k.cut ? 0.7 : 1 });
        });
        // reels and string health
        d.anchors.forEach((a, i) => {
          const y = i === 0 ? FIELD_H - 14 : 14;
          drawSprite(ctx, REEL, a.x, y, { scale: 3 });
          const k = d.kites[i];
          const frac = Math.max(0, k.hp / k.maxHp);
          const bx = i === 0 ? a.x + 22 : a.x - 22 - 80;
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(bx, y - 5, 80, 10);
          ctx.fillStyle = frac > 0.5 ? (i === 0 ? "#e03131" : "#1c7ed6") : frac > 0.25 ? "#f59f00" : "#fa5252";
          ctx.fillRect(bx + 1, y - 4, Math.round(78 * frac), 8);
        });
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toField(e);
    const d = duelRef.current;
    const side: 0 | 1 = modeRef.current === "cpu" ? 0 : p.y > FIELD_H / 2 ? 0 : 1;
    const k = d.kites[side];
    pointers.current.set(e.pointerId, { side, fx: p.x, fy: p.y, kx: k.x, ky: k.y });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (modeRef.current === "cpu") setTarget(d, 0, p.x, p.y - 40);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ptr = pointers.current.get(e.pointerId);
    if (!ptr) return;
    const p = toField(e);
    const d = duelRef.current;
    if (modeRef.current === "cpu") setTarget(d, 0, p.x, p.y - 40);
    else setTarget(d, ptr.side, ptr.kx + (p.x - ptr.fx) * 1.8, ptr.ky + (p.y - ptr.fy) * 1.8);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const resultText = winner === null ? "" : winner === 2 ? c.draw : mode === "cpu" ? (winner === 0 ? c.youWin : c.cpuWin) : winner === 0 ? c.redWin : c.blueWin;

  return (
    <div
      ref={containerRef}
      data-game="kite-duel"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{mode === "cpu" ? `${fill(c.rival, rival + 1)} · ${names[rival]}` : c.twoP}</Badge>
        <Badge variant="outline">{fill(c.time, hud.left)}</Badge>
        <Badge variant="outline">
          <span className="text-destructive">{Math.round(hud.hp[0] * 100)}%</span>
          <span> : </span>
          <span className="text-primary">{Math.round(hud.hp[1] * 100)}%</span>
        </Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={mode === "cpu" ? "game-btn game-btn-live flex min-h-11 items-center justify-center gap-1 text-sm font-bold" : "game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold"} onClick={() => start(rival, "cpu")}>
          <Bot className="size-4" />
          <span>{c.vsCpu}</span>
        </button>
        <button type="button" className={mode === "2p" ? "game-btn game-btn-live flex min-h-11 items-center justify-center gap-1 text-sm font-bold" : "game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold"} onClick={() => start(rival, "2p")}>
          <Users className="size-4" />
          <span>{c.twoP}</span>
        </button>
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
        {winner !== null ? (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{resultText}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(rival, mode)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(rival >= RIVAL_COUNT - 1 ? 0 : rival + 1, mode)}>
                <span>{rival >= RIVAL_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>
      <p className="text-xs text-muted-foreground">{c.help2}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={RIVAL_COUNT} current={rival} cleared={cleared} locale={locale} onSelect={(i) => start(i, mode)} />
        </div>
      </details>
    </div>
  );
}
