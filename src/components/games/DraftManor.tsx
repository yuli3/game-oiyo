import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
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
import { DX, DY, KNOCK, MANOR_SLUG, MANOR_STAGES, STAGE_COUNT, colOf, dailyStage, distances, doorsOf, move, newManor, next, pick, route, rowOf, starsFor, vault, type Card, type Manor, type ManorStage } from "../../lib/games/draft-manor";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; daily: string; steps: string; keys: string; start: string; draft: string; win: string; lose: string; result: string; again: string; next: string;
  locked: string; knock: string; help: string; stages: string; dailyBtn: string; stagesBtn: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", daily: "오늘의 저택 {0}", steps: "걸음 {0}", keys: "열쇠 {0}/{1}", start: "입구 위의 빈 칸을 눌러 첫 방을 뽑아요!", draft: "어떤 방을 지을까요?", win: "금고 도착!", lose: "걸음이 다 떨어졌어요", result: "남은 걸음 {0}",
    again: "다시 하기", next: "다음 단계", locked: "열쇠가 더 필요해요", knock: "벽을 뚫었어요 (-3걸음)",
    help: "빈 땅만 있는 저택이에요. 아래 입구에서 출발해 맨 위 금고까지 걸음이 다 떨어지기 전에 가야 해요. 문 너머 빈 칸을 누르면 방 카드 3장이 나오고, 고른 방이 그 자리에 지어져요. 방은 들어온 문을 등지고 놓이고, 앞·왼쪽·오른쪽 중 어디로 문이 나 있는지가 카드마다 달라요. 지은 방 사이를 오가는 것도 한 칸에 한 걸음이에요. 식료품실(빵)은 걸음을 되돌려 주고, 열쇠방(열쇠)은 금고를 여는 열쇠를 줘요. 문이 없는 쪽은 3걸음을 더 들여 벽을 뚫을 수 있어요. '오늘의 저택'은 날마다 모두에게 같은 저택이 나와요. (키보드: 방향키로 이동, 1·2·3으로 카드 고르기)",
    stages: "단계 고르기", dailyBtn: "오늘의 저택", stagesBtn: "단계 모드", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", daily: "Today's manor {0}", steps: "Steps {0}", keys: "Keys {0}/{1}", start: "Tap the empty plot above the entrance to draft your first room!", draft: "Which room will you build?", win: "Into the vault!", lose: "Out of steps", result: "{0} steps left",
    again: "Try again", next: "Next stage", locked: "You need more keys", knock: "Knocked through a wall (−3 steps)",
    help: "The manor is all empty plots. Start at the entrance at the bottom and reach the vault at the top before your steps run out. Tap an empty plot beyond a door to be offered three room cards; the one you pick is built there. A room is set with its back to the door you came in by, and each card has its own doors ahead, left or right. Walking between built rooms costs a step a room too. A pantry (bread) gives steps back, a key room (key) gives a key for the vault. Where there is no door you can knock through the wall for 3 more steps. Today's manor is the same for everyone each day. (Keyboard: arrows to move, 1 2 3 to pick a card.)",
    stages: "Choose a stage", dailyBtn: "Today's manor", stagesBtn: "Stage mode", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", daily: "今日の屋敷 {0}", steps: "歩数 {0}", keys: "鍵 {0}/{1}", start: "入口の上の空き地を押して最初の部屋を引こう！", draft: "どの部屋を建てる？", win: "金庫に到着！", lose: "歩数が尽きました", result: "残り歩数 {0}",
    again: "もう一度", next: "次の面", locked: "鍵がもっと必要です", knock: "壁を壊した（−3歩）",
    help: "空き地だけの屋敷です。下の入口から出発し、歩数が尽きる前にいちばん上の金庫まで行きます。扉の向こうの空き地を押すと部屋カードが3枚出て、選んだ部屋がそこに建ちます。部屋は入ってきた扉を背にして置かれ、前・左・右のどこに扉があるかはカードごとに違います。建てた部屋の間を歩くのも1部屋1歩。食料庫（パン）は歩数を戻し、鍵部屋（鍵）は金庫の鍵をくれます。扉のない方向は3歩多く使って壁を壊せます。「今日の屋敷」は毎日みんな同じ屋敷です。（キーボード：矢印で移動、1・2・3でカード選択）",
    stages: "ステージ選択", dailyBtn: "今日の屋敷", stagesBtn: "ステージモード", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", daily: "今日宅邸 {0}", steps: "步数 {0}", keys: "钥匙 {0}/{1}", start: "点入口上方的空地，抽第一个房间！", draft: "要建哪个房间？", win: "进入金库！", lose: "步数用完了", result: "剩余步数 {0}",
    again: "再来一次", next: "下一关", locked: "还需要更多钥匙", knock: "凿穿了墙（−3步）",
    help: "宅邸里全是空地。从下方入口出发，在步数用完前走到最上方的金库。点门外的空地会出现3张房间卡，选中的房间就建在那里。房间背靠你进来的门摆放，每张卡的前、左、右哪边有门各不相同。在已建房间之间走动也是一间一步。食品间（面包）会补回步数，钥匙房（钥匙）给你开金库的钥匙。没有门的方向可以多花3步凿穿墙。“今日宅邸”每天所有人都一样。（键盘：方向键移动，1、2、3选卡）",
    stages: "选择关卡", dailyBtn: "今日宅邸", stagesBtn: "关卡模式", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", daily: "Le manoir du jour {0}", steps: "Pas {0}", keys: "Clés {0}/{1}", start: "Touchez la parcelle vide au-dessus de l'entrée pour tirer votre première pièce !", draft: "Quelle pièce construire ?", win: "Dans la salle forte !", lose: "Plus de pas", result: "{0} pas restants",
    again: "Réessayer", next: "Niveau suivant", locked: "Il faut plus de clés", knock: "Mur défoncé (−3 pas)",
    help: "Le manoir n'est que parcelles vides. Partez de l'entrée en bas et atteignez la salle forte en haut avant d'épuiser vos pas. Touchez une parcelle vide derrière une porte : trois cartes de pièce vous sont proposées, et celle que vous choisissez y est bâtie, dos à la porte par laquelle vous entrez ; chaque carte a ses portes devant, à gauche ou à droite. Passer d'une pièce bâtie à l'autre coûte aussi un pas. Le garde-manger (pain) rend des pas, la pièce à clé (clé) donne une clé de la salle forte. Sans porte, on peut défoncer le mur pour 3 pas de plus. Le manoir du jour est le même pour tous. (Clavier : flèches pour bouger, 1 2 3 pour choisir.)",
    stages: "Choisir un niveau", dailyBtn: "Manoir du jour", stagesBtn: "Mode niveaux", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", daily: "La mansión de hoy {0}", steps: "Pasos {0}", keys: "Llaves {0}/{1}", start: "¡Toca la parcela vacía sobre la entrada para sacar tu primera sala!", draft: "¿Qué sala construyes?", win: "¡A la cámara!", lose: "Sin pasos", result: "Quedan {0} pasos",
    again: "Reintentar", next: "Siguiente nivel", locked: "Necesitas más llaves", knock: "Pared derribada (−3 pasos)",
    help: "La mansión son solo parcelas vacías. Sal de la entrada de abajo y llega a la cámara de arriba antes de quedarte sin pasos. Toca una parcela vacía tras una puerta: salen tres cartas de sala y la que elijas se construye ahí, de espaldas a la puerta por la que entras; cada carta tiene sus puertas delante, a la izquierda o a la derecha. Ir entre salas construidas también cuesta un paso por sala. La despensa (pan) devuelve pasos y la sala de la llave (llave) da una llave de la cámara. Donde no hay puerta puedes derribar la pared por 3 pasos más. La mansión de hoy es la misma para todos. (Teclado: flechas para moverte, 1 2 3 para elegir.)",
    stages: "Elegir nivel", dailyBtn: "Mansión de hoy", stagesBtn: "Modo niveles", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:draft-manor:muted";
const W = 360;
const H = 560;
const GRID_TOP = 70;
const GRID_H = 380;
const CARD_Y = 462;
const CARD_W = 104;
const CARD_H = 92;
const KEY: PixelArt = { palette: { y: "#fcc419", o: "#e67700" }, rows: ["yyy.....", "y.yyyyyy", "yyy..o.o"] };
const BREAD: PixelArt = { palette: { b: "#d9480f", y: "#ffd8a8" }, rows: [".bbbb.", "byyyyb", "byyyyb", ".bbbb."] };
const ME: PixelArt = { palette: { k: "#212529", s: "#f3c9a0", r: "#5f3dc4" }, rows: [".kk.", "kssk", ".ss.", "rrrr", "r..r"] };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function geometry(st: ManorStage) {
  const cell = Math.floor(Math.min(330 / st.cols, GRID_H / st.rows));
  return { cell, x0: Math.floor((W - cell * st.cols) / 2), y0: GRID_TOP + Math.floor((GRID_H - cell * st.rows) / 2) };
}

const cardX = (k: number) => 12 + k * (CARD_W + 12);

interface Pop { text: string; t: number; color: string }
type Input = { kind: "cell"; cell: number } | { kind: "card"; k: number } | { kind: "dir"; dir: number };

export default function DraftManor({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [daily, setDaily] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; steps: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mRef = useRef<Manor>(newManor(MANOR_STAGES[0]));
  const input = useRef<Input[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const dailyRef = useRef(false);
  dailyRef.current = daily;
  const overShown = useRef(false);

  useRunRecord(MANOR_SLUG, Boolean(over?.won) && !daily, over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number, day = false) => {
    setStage(s);
    setDaily(day);
    mRef.current = newManor(day ? dailyStage(today()) : MANOR_STAGES[s]);
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(MANOR_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const dirs: Record<string, number> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
      if (ev.key in dirs) {
        ev.preventDefault();
        input.current.push({ kind: "dir", dir: dirs[ev.key] });
        setTouched(true);
      } else if (ev.key === "1" || ev.key === "2" || ev.key === "3") {
        input.current.push({ kind: "card", k: Number(ev.key) - 1 });
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const m = mRef.current;
      const st = m.stage;
      const cp = copyRef.current;
      const g = geometry(st);
      const centre = (i: number) => ({ x: g.x0 + (colOf(st, i) + 0.5) * g.cell, y: g.y0 + (rowOf(st, i) + 0.5) * g.cell });
      const finish = () => {
        setOver({ won: m.won, stars: starsFor(m), steps: m.steps });
        if (m.won) {
          if (!dailyRef.current) setCleared(markStageCleared(MANOR_SLUG, st.stage, STAGE_COUNT));
          const v = centre(vault(st));
          spawnBurst(parts.current, v.x, v.y, ["#ffd43b", "#ffe066", "#fff"], 24, 120, 3);
          sfx("win");
        } else sfx("lose");
      };
      const walk = (dir: number) => {
        const before = { keys: m.keys, steps: m.steps, knocks: m.knocks };
        const r = move(m, dir);
        if (r === "locked") pops.current.push({ text: cp.locked, t: 1, color: "#e8590c" });
        if (m.knocks > before.knocks) pops.current.push({ text: cp.knock, t: 1, color: "#e8590c" });
        if (r === "moved") {
          sfx("tap");
          if (m.keys > before.keys) sfx("success");
          if (m.steps > before.steps) sfx("combo");
        }
        return r;
      };
      // input is read once per frame
      for (const e of input.current.splice(0)) {
        if (m.over) break;
        if (m.offer) {
          if (e.kind === "card") {
            const keys = m.keys;
            pick(m, e.k);
            sfx(m.keys > keys ? "success" : "place");
            const p = centre(m.at);
            spawnBurst(parts.current, p.x, p.y, ["#e9d8a6", "#b08968"], 8, 60, 2);
          }
          continue;
        }
        if (e.kind === "dir") walk(e.dir);
        else if (e.kind === "cell") {
          const d = distances(m);
          const target = e.cell;
          if (Number.isFinite(d[target]) && target !== m.at) {
            for (const dir of route(m, target)) if (walk(dir) !== "moved" || m.over) break;
          } else if (!Number.isFinite(d[target])) {
            // an empty plot (or the vault): walk to the nearest built room beside it, then step through
            let best = -1;
            let bestDir = -1;
            let bestCost = Infinity;
            for (let dir = 0; dir < 4; dir++) {
              const from = next(st, target, (dir + 2) % 4);
              if (from < 0 || !Number.isFinite(d[from])) continue;
              // through a door if there is one, else knocking through costs a few steps more
              const cost = d[from] + (m.rooms[from]!.doors & (1 << dir) || target === vault(st) ? 0 : KNOCK);
              if (cost < bestCost) {
                best = from;
                bestDir = dir;
                bestCost = cost;
              }
            }
            if (best >= 0) {
              for (const dir of route(m, best)) if (walk(dir) !== "moved" || m.over) break;
              if (!m.over && m.at === best) walk(bestDir);
            }
          }
        }
        if (m.over) break;
      }
      if (m.over && !overShown.current) {
        overShown.current = true;
        finish();
      }
      stepParticles(parts.current, dt, 40);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#1b1530";
        ctx.fillRect(0, 0, W, H);
        // the empty grounds: faint dotted plots
        for (let i = 0; i < st.cols * st.rows; i++) {
          const x = g.x0 + colOf(st, i) * g.cell;
          const y = g.y0 + rowOf(st, i) * g.cell;
          const room = m.rooms[i];
          if (!room) {
            ctx.fillStyle = "#2b2445";
            ctx.fillRect(x + 2, y + 2, g.cell - 4, g.cell - 4);
            continue;
          }
          const isVault = i === vault(st);
          ctx.fillStyle = isVault ? "#5f3dc4" : room.effect === "pantry" ? "#8f5b34" : room.effect === "key" ? "#7a6a1f" : "#a68a64";
          ctx.fillRect(x + 1, y + 1, g.cell - 2, g.cell - 2);
          // walls with doorways
          ctx.fillStyle = "#3d2b1f";
          const t = Math.max(3, Math.floor(g.cell / 10));
          const gap = Math.floor(g.cell / 3);
          for (let dir = 0; dir < 4; dir++) {
            const open = room.doors & (1 << dir);
            const seg = (a: number, b: number) => {
              if (dir === 0) ctx.fillRect(x + a, y, b - a, t);
              if (dir === 2) ctx.fillRect(x + a, y + g.cell - t, b - a, t);
              if (dir === 3) ctx.fillRect(x, y + a, t, b - a);
              if (dir === 1) ctx.fillRect(x + g.cell - t, y + a, t, b - a);
            };
            if (open) {
              seg(0, gap);
              seg(g.cell - gap, g.cell);
            } else seg(0, g.cell);
          }
          const cx = x + g.cell / 2;
          const cy = y + g.cell / 2;
          if (isVault) {
            ctx.fillStyle = "#ffd43b";
            ctx.font = `bold ${Math.floor(g.cell / 3)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(`${Math.min(m.keys, st.keys)}/${st.keys}`, cx, cy + g.cell / 8);
          } else if (room.effect === "key" && !room.used) drawSprite(ctx, KEY, cx, cy, { scale: Math.max(2, Math.floor(g.cell / 16)) });
          else if (room.effect === "pantry" && !room.used) drawSprite(ctx, BREAD, cx, cy, { scale: Math.max(2, Math.floor(g.cell / 14)) });
        }
        // the plot being drafted
        if (m.offer) {
          const p = centre(m.offer.cell);
          ctx.strokeStyle = "#ffd43b";
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x - g.cell / 2 + 2, p.y - g.cell / 2 + 2, g.cell - 4, g.cell - 4);
        }
        const me = centre(m.at);
        drawSprite(ctx, ME, me.x, me.y, { scale: Math.max(2, Math.floor(g.cell / 14)) });
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#f3f0ff";
        ctx.fillText(fill(cp.steps, m.steps), 12, 28);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.keys, m.keys, st.keys), W - 12, 28);
        ctx.textAlign = "center";
        if (m.offer) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#ffd43b";
          ctx.fillText(cp.draft, W / 2, CARD_Y - 6);
          m.offer.cards.forEach((card, k) => drawCard(ctx, card, m.offer!.dir, cardX(k), CARD_Y, k));
        }
        for (const pp of pops.current) {
          ctx.font = "bold 15px sans-serif";
          const tw = ctx.measureText(pp.text).width + 14;
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(W / 2 - tw / 2, 40, tw, 24);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 57);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  useEffect(() => {
    if (!over) overShown.current = false;
  }, [over]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = mRef.current;
    if (m.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    if (m.offer) {
      for (let k = 0; k < 3; k++) if (x >= cardX(k) && x <= cardX(k) + CARD_W && y >= CARD_Y && y <= CARD_Y + CARD_H) input.current.push({ kind: "card", k });
      return;
    }
    const g = geometry(m.stage);
    const col = Math.floor((x - g.x0) / g.cell);
    const row = Math.floor((y - g.y0) / g.cell);
    if (col >= 0 && row >= 0 && col < m.stage.cols && row < m.stage.rows) input.current.push({ kind: "cell", cell: row * m.stage.cols + col });
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  const st = mRef.current.stage;

  return (
    <div
      ref={containerRef}
      data-game="draft-manor"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{daily ? fill(c.daily, today()) : fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.steps, st.steps)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage, !daily)} aria-label={daily ? c.stagesBtn : c.dailyBtn}>
            <CalendarDays className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage, daily)} aria-label={c.again}>
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
          onPointerDown={onDown}
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
            <p className="text-sm text-muted-foreground">{daily ? fill(c.daily, today()) + " · " : ""}{fill(c.result, over.steps)}</p>
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage, daily)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won || daily} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <Button variant="outline" className="min-h-12 w-full" onClick={() => start(stage, !daily)}>
        <CalendarDays className="size-4" />
        <span>{daily ? c.stagesBtn : c.dailyBtn}</span>
      </Button>
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

/** A room card as it would be built: its doors drawn on a little room, what it holds, and its number key. */
function drawCard(ctx: CanvasRenderingContext2D, card: Card, dir: number, x: number, y: number, k: number): void {
  ctx.fillStyle = "#f8f0e3";
  ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.fillStyle = "#3d2b1f";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(String(k + 1), x + 6, y + 14);
  const s = 50;
  const rx = x + (CARD_W - s) / 2;
  const ry = y + (CARD_H - s) / 2 + 4;
  ctx.fillStyle = card.effect === "pantry" ? "#8f5b34" : card.effect === "key" ? "#7a6a1f" : "#a68a64";
  ctx.fillRect(rx, ry, s, s);
  const doors = doorsOf(card, dir);
  ctx.fillStyle = "#3d2b1f";
  const t = 5;
  for (let d = 0; d < 4; d++) {
    const open = doors & (1 << d);
    const seg = (a: number, b: number) => {
      if (d === 0) ctx.fillRect(rx + a, ry, b - a, t);
      if (d === 2) ctx.fillRect(rx + a, ry + s - t, b - a, t);
      if (d === 3) ctx.fillRect(rx, ry + a, t, b - a);
      if (d === 1) ctx.fillRect(rx + s - t, ry + a, t, b - a);
    };
    if (open) {
      seg(0, 17);
      seg(33, s);
    } else seg(0, s);
  }
  // an arrow for the way you come in
  ctx.fillStyle = "#e03131";
  const ax = rx + s / 2 - DX[dir] * (s / 2 + 6);
  const ay = ry + s / 2 - DY[dir] * (s / 2 + 6);
  ctx.fillRect(ax - 3, ay - 3, 6, 6);
  if (card.effect === "key") drawSprite(ctx, KEY, rx + s / 2, ry + s / 2, { scale: 3 });
  if (card.effect === "pantry") {
    drawSprite(ctx, BREAD, rx + s / 2, ry + s / 2 - 4, { scale: 3 });
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`+${card.gain}`, rx + s / 2, ry + s - 8);
  }
}
