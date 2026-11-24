import { useCallback, useEffect, useRef, useState } from "react";
import { Hourglass, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
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
import { BLANKET_SLUG, BLANKET_STAGES, CARDS, LANES, STAGE_COUNT, TURNS, capacity, cardPower, endTurn, energy, lanePower, lanesWon, newMatch, spent, stage as stageCard, starsFor, unstage, type LaneKind, type Match } from "../../lib/games/blanket-battle";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; turn: string; acorns: string; endTurn: string; start: string; win: string; lose: string; result: string; again: string; next: string; rival: string; you: string;
  lanes: Record<LaneKind, string>;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", turn: "{0}/{1}턴", acorns: "도토리 {0}/{1}", endTurn: "턴 끝내기", start: "카드를 고르고 돗자리를 눌러 내려놓아요!", win: "소풍 자리를 차지했어요!", lose: "자리를 뺏겼어요", result: "돗자리 {0} : {1}", rival: "상대", you: "나",
    lanes: { plain: "보통", sunny: "햇볕 +1", ants: "개미 −1", small: "좁음 (2장)" },
    again: "다시 하기", next: "다음 단계",
    help: "돗자리 세 장을 두고 상대 소풍팀과 자리싸움을 해요. 턴마다 도토리(에너지)가 하나씩 늘어 1턴에 1개, 6턴에 6개예요. 상대가 먼저 카드를 펼쳐 보이면, 손패에서 카드를 골라 내 쪽 돗자리를 눌러 내려놓고 '턴 끝내기'를 눌러요(내려놓은 카드를 다시 누르면 손으로 돌아와요). 6턴이 끝났을 때 힘의 합이 더 큰 쪽이 그 돗자리를 차지하고, 세 장 중 더 많이 차지하면 이겨요. 햇볕 돗자리는 카드마다 +1, 개미 돗자리는 −1, 좁은 돗자리는 두 장까지만 놓여요. 달팽이는 같은 자리 내 카드들을 +1, 참새는 먼저 놓인 내 카드 수만큼 +1, 고슴도치는 그 자리 상대 카드를 −1, 부엉이는 혼자 있으면 +3이에요. 상대에게 한 장도 내주지 않으면 별 세 개. 키보드: 1~7로 카드 고르기, ←/→로 돗자리 고르기, Enter로 놓기, Space로 턴 끝내기.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", turn: "Turn {0}/{1}", acorns: "Acorns {0}/{1}", endTurn: "End turn", start: "Pick a card, then tap a blanket to play it!", win: "The picnic spot is yours!", lose: "They took the spot", result: "Blankets {0} : {1}", rival: "Rival", you: "You",
    lanes: { plain: "Plain", sunny: "Sunny +1", ants: "Ants −1", small: "Small (2)" },
    again: "Try again", next: "Next stage",
    help: "Three picnic blankets, and a rival picnic after them. Each turn you get one more acorn of energy: one on turn 1, six on turn 6. The rival lays its cards first, face up; then pick a card from your hand and tap a blanket on your side to play it, and press End turn (tap a played card again to take it back). After turn 6, the side with more power on a blanket holds it; hold more of the three to win. A sunny blanket gives each card there +1, ants take 1, and a small blanket holds two cards a side. A snail gives your other cards there +1, a sparrow gets +1 for each of your cards already there, a hedgehog takes 1 from each rival card there, and an owl gets +3 while alone. Concede no blanket for three stars. Keyboard: 1–7 pick a card, ←/→ pick a blanket, Enter plays, Space ends the turn.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", turn: "{0}/{1}ターン", acorns: "どんぐり {0}/{1}", endTurn: "ターン終了", start: "カードを選んで、レジャーシートを押して出そう！", win: "ピクニックの場所をゲット！", lose: "場所を取られた", result: "シート {0} : {1}", rival: "相手", you: "自分",
    lanes: { plain: "ふつう", sunny: "ひなた +1", ants: "アリ −1", small: "せまい (2枚)" },
    again: "もう一度", next: "次の面",
    help: "レジャーシート3枚をめぐって、相手のピクニック隊と場所取り合戦。ターンごとにどんぐり（エネルギー）が1つずつ増え、1ターン目は1つ、6ターン目は6つ。相手が先にカードを表向きに出したら、手札からカードを選んで自分側のシートを押して出し、「ターン終了」（出したカードをもう一度押すと手札に戻ります）。6ターン後、力の合計が大きい側がそのシートを取り、3枚のうち多く取った側の勝ち。ひなたのシートはカードごとに+1、アリのシートは−1、せまいシートは2枚まで。カタツムリは同じシートの自分のカードを+1、スズメは先に置いた自分のカードの数だけ+1、ハリネズミはそのシートの相手カードを−1、フクロウはひとりなら+3。1枚もシートを渡さなければ星3つ。キーボード：1〜7でカード、←/→でシート、Enterで出す、Spaceでターン終了。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", turn: "第{0}/{1}回合", acorns: "橡果 {0}/{1}", endTurn: "结束回合", start: "选一张牌，再点野餐垫把它放下！", win: "野餐位置是你的了！", lose: "位置被抢走了", result: "野餐垫 {0} : {1}", rival: "对手", you: "我",
    lanes: { plain: "普通", sunny: "晒太阳 +1", ants: "蚂蚁 −1", small: "窄小 (2张)" },
    again: "再来一次", next: "下一关",
    help: "围绕三块野餐垫，和对面的野餐队抢位置。每回合多一颗橡果（能量）：第1回合1颗，第6回合6颗。对手先把牌亮出来，然后你从手牌选一张，点自己这边的野餐垫放下，再点“结束回合”（再点已放下的牌可收回）。6回合后，哪边在某块垫子上力量总和更大就占领它，三块里占得多的一方获胜。晒太阳的垫子每张牌+1，有蚂蚁的−1，窄小的每边只能放两张。蜗牛让同一块垫子上自己的牌+1，麻雀按已在那里的己方牌数+1，刺猬让那里的对手牌−1，猫头鹰独自在场时+3。一块垫子都不让给对手就得三星。键盘：1到7选牌，←/→选垫子，Enter放下，Space结束回合。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", turn: "Tour {0}/{1}", acorns: "Glands {0}/{1}", endTurn: "Fin du tour", start: "Choisissez une carte, puis touchez une couverture pour la jouer !", win: "Le coin pique-nique est à vous !", lose: "Ils ont pris la place", result: "Couvertures {0} : {1}", rival: "Rival", you: "Vous",
    lanes: { plain: "Simple", sunny: "Soleil +1", ants: "Fourmis −1", small: "Petite (2)" },
    again: "Réessayer", next: "Niveau suivant",
    help: "Trois couvertures de pique-nique, et une équipe rivale qui les convoite. Chaque tour vous gagnez un gland d'énergie de plus : un au tour 1, six au tour 6. Le rival pose ses cartes d'abord, face visible ; choisissez alors une carte et touchez une couverture de votre côté, puis Fin du tour (touchez une carte posée pour la reprendre). Après le tour 6, le camp le plus fort sur une couverture la garde ; gardez-en le plus pour gagner. Le soleil donne +1 à chaque carte, les fourmis −1, et une petite couverture n'accueille que deux cartes par camp. L'escargot donne +1 à vos autres cartes là, le moineau +1 par carte à vous déjà là, le hérisson −1 à chaque carte rivale là, et la chouette +3 quand elle est seule. Ne cédez aucune couverture pour trois étoiles. Clavier : 1–7 carte, ←/→ couverture, Entrée jouer, Espace fin du tour.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", turn: "Turno {0}/{1}", acorns: "Bellotas {0}/{1}", endTurn: "Terminar turno", start: "¡Elige una carta y toca una manta para jugarla!", win: "¡El sitio del pícnic es tuyo!", lose: "Te quitaron el sitio", result: "Mantas {0} : {1}", rival: "Rival", you: "Tú",
    lanes: { plain: "Normal", sunny: "Sol +1", ants: "Hormigas −1", small: "Pequeña (2)" },
    again: "Reintentar", next: "Siguiente nivel",
    help: "Tres mantas de pícnic y un grupo rival que las quiere. Cada turno tienes una bellota de energía más: una en el turno 1, seis en el 6. El rival pone sus cartas primero, boca arriba; luego elige una carta y toca una manta de tu lado para jugarla, y pulsa Terminar turno (toca una carta jugada para recuperarla). Tras el turno 6, el lado con más fuerza en una manta se la queda; quédate con más de las tres para ganar. El sol da +1 a cada carta, las hormigas −1, y una manta pequeña admite dos cartas por lado. El caracol da +1 a tus otras cartas allí, el gorrión +1 por cada carta tuya que ya esté, el erizo −1 a cada carta rival allí y el búho +3 mientras esté solo. No cedas ninguna manta para tres estrellas. Teclado: 1–7 carta, ←/→ manta, Intro jugar, Espacio terminar turno.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

/** ant, snail, sparrow, rabbit, hedgehog, owl, fox, bear, deer */
const CRITTERS: PixelArt[] = [
  { palette: { k: "#212529", r: "#c92a2a" }, rows: ["........", "..k..k..", "...kk...", ".kkrrkk.", "..rrrr..", ".k.rr.k.", "..k..k..", "........"] },
  { palette: { s: "#d9a066", b: "#9c6b4e", g: "#82c91e" }, rows: ["........", "...bb...", "..bssb..", ".bsbbsb.", ".bssssb.", "g.bbbb..", "gggggggg", "........"] },
  { palette: { b: "#8b5a2b", w: "#f1e3d3", k: "#212529", y: "#fab005" }, rows: ["........", "..bbb...", ".bkbby..", ".bbbb...", "bbwwbb..", ".bwwbbb.", "..y.y...", "........"] },
  { palette: { w: "#f8f9fa", p: "#faa2c1", k: "#212529" }, rows: [".w..w...", ".wp.wp..", ".w..w...", ".wwww...", "wkwwkw..", "wwwwww..", ".wwwwww.", "..w..w.."] },
  { palette: { b: "#5c3d2e", s: "#d9a066", k: "#212529" }, rows: ["........", ".b.b.b..", "bbbbbbb.", "bbbbbsss", "bbbbsks.", "bbbbsss.", ".s...s..", "........"] },
  { palette: { b: "#8b5a2b", w: "#f1e3d3", y: "#fab005", k: "#212529" }, rows: ["b......b", "bbbbbbbb", "bwwbbwwb", "bykbbkyb", "bbbyybbb", "bwwwwwwb", ".bwwwwb.", "..y..y.."] },
  { palette: { o: "#f76707", w: "#f8f9fa", k: "#212529" }, rows: ["o.....o.", "oo...oo.", "ooooooo.", "okoooko.", "owwkwwo.", ".wwwww..", "..ooooo.", "..o...o."] },
  { palette: { b: "#7a4a2a", l: "#c8a27a", k: "#212529" }, rows: [".b....b.", "bbbbbbbb", "bkbbbbkb", "bbbllbbb", "bbbkkbbb", ".bbbbbb.", "bbbbbbbb", "bb....bb"] },
  { palette: { b: "#a87545", w: "#f8f9fa", k: "#212529", t: "#8b5a2b" }, rows: ["t.t..t.t", ".t....t.", "..bbbb..", ".bkbbkb.", ".bbbbbb.", "..bwwb..", ".bbbbbb.", ".b.bb.b."] },
];
const LANE_COLOURS: Record<LaneKind, string> = { plain: "#e64980", sunny: "#fab005", ants: "#868e96", small: "#4c6ef5" };
const MUTE_KEY = "oiyo:blanket-battle:muted";
const W = 360;
const H = 560;
const LANE_W = 116;
const laneX = (l: number) => 6 + l * (LANE_W + 2);
const slotY = (side: number, k: number) => (side === 1 ? 228 - k * 44 : 296 + k * 44);
const HAND_Y = 488;
const handX = (i: number, n: number) => W / 2 + (i - (n - 1) / 2) * 50;

export default function BlanketBattle({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; a: number; b: number }>(null);
  const [touched, setTouched] = useState(false);
  const [, setTick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mRef = useRef<Match>(newMatch(BLANKET_STAGES[0]));
  const input = useRef<Array<{ kind: "hand"; i: number } | { kind: "lane"; l: number } | { kind: "end" }>>([]);
  const picked = useRef(-1);
  const laneCursor = useRef(0);
  const fresh = useRef<number>(0); // seconds left on the rival-just-played glow
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const overShown = useRef(false);

  useRunRecord(BLANKET_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    mRef.current = newMatch(BLANKET_STAGES[s]);
    input.current = [];
    picked.current = -1;
    laneCursor.current = 0;
    fresh.current = 1.2;
    parts.current = [];
    overShown.current = false;
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(BLANKET_SLUG, STAGE_COUNT);
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
      const m = mRef.current;
      const s = m.stage;
      const cp = copyRef.current;
      // taps are read once per frame
      let changed = false;
      for (const a of input.current.splice(0)) {
        if (m.over) break;
        changed = true;
        if (a.kind === "hand") {
          picked.current = picked.current === a.i ? -1 : a.i;
          sfx("tap");
        } else if (a.kind === "lane") {
          laneCursor.current = a.l;
          // a played card on this blanket taps back into the hand, else the picked card goes down
          if (picked.current >= 0) {
            if (stageCard(m, picked.current, a.l)) {
              picked.current = -1;
              sfx("place");
            } else sfx("fail");
          } else {
            const k = m.staged.map((x, i) => ({ x, i })).filter((p) => p.x.lane === a.l).pop();
            if (k) {
              unstage(m, k.i);
              sfx("tap");
            }
          }
        } else {
          endTurn(m);
          picked.current = -1;
          fresh.current = 1.2;
          spawnBurst(parts.current, W / 2, 262, ["#ffd43b", "#fff"], 10, 90, 2);
          sfx(m.over ? "success" : "combo");
        }
      }
      if (changed) setTick((t) => t + 1);
      if (m.over && !overShown.current) {
        overShown.current = true;
        const [a, b] = lanesWon(m);
        setOver({ won: m.won, stars: starsFor(m), a, b });
        if (m.won) {
          setCleared(markStageCleared(BLANKET_SLUG, s.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 280, ["#ffd43b", "#fff", "#e64980", "#51cf66"], 30, 150, 3);
          sfx("win");
        } else sfx("lose");
      }
      fresh.current = Math.max(0, fresh.current - dt);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#94d82d";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#82c91e";
        for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < W; x += 32) ctx.fillRect(x, y, 16, 16);
        for (let l = 0; l < LANES; l++) {
          const x = laneX(l);
          const kind = s.lanes[l];
          // the blanket with a gingham check
          ctx.fillStyle = "#fff";
          ctx.fillRect(x, 54, LANE_W, 420);
          ctx.fillStyle = LANE_COLOURS[kind];
          ctx.globalAlpha = 0.55;
          for (let y = 54; y < 474; y += 12) for (let cx = x + ((y - 54) / 12) % 2 * 12; cx < x + LANE_W; cx += 24) ctx.fillRect(cx, y, 12, 12);
          ctx.globalAlpha = 1;
          if (laneCursor.current === l && picked.current >= 0) {
            ctx.strokeStyle = "#1971c2";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1, 276, LANE_W - 2, 196);
            ctx.lineWidth = 1;
          }
          // the middle strip: quirk and the two totals (staged cards counted in grey)
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(x + 4, 248, LANE_W - 8, 28);
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#495057";
          ctx.fillText(cp.lanes[kind], x + LANE_W / 2, 260);
          const mine = lanePower(m, 0, l);
          const theirs = lanePower(m, 1, l);
          const pending = m.staged.filter((p) => p.lane === l).reduce((a, p) => a + CARDS[p.card].power, 0);
          ctx.font = "bold 13px sans-serif";
          ctx.fillStyle = mine + pending > theirs ? "#2b8a3e" : mine + pending < theirs ? "#c92a2a" : "#495057";
          ctx.fillText(`${theirs} : ${mine}${pending ? `+${pending}` : ""}`, x + LANE_W / 2, 273);
          // cards on the board: rival above, you below
          for (const side of [1, 0])
            m.board[side][l].forEach((p, k) => {
              const y = slotY(side, k);
              const glow = side === 1 && fresh.current > 0 && m.rivalLast.some((r) => r.lane === l) && k >= m.board[1][l].length - m.rivalLast.filter((r) => r.lane === l).length;
              drawCard(ctx, p.card, x + LANE_W / 2, y, cardPower(m, side, l, k), side === 1, glow);
            });
          m.staged.filter((p) => p.lane === l).forEach((p, k) => drawCard(ctx, p.card, x + LANE_W / 2, slotY(0, m.board[0][l].length + k), CARDS[p.card].power, false, false, true));
          // capacity pips
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          for (let k = 0; k < capacity(s, l); k++) ctx.fillRect(x + 6 + k * 8, 462, 5, 5);
        }
        // the hand
        m.hand.forEach((card, i) => {
          const x = handX(i, m.hand.length);
          const can = spent(m) + CARDS[card].cost <= energy(m);
          ctx.globalAlpha = can ? 1 : 0.45;
          drawCard(ctx, card, x, HAND_Y + (picked.current === i ? -10 : 0), CARDS[card].power, false, picked.current === i);
          ctx.fillStyle = "#6741d9";
          ctx.fillRect(x - 22, HAND_Y - 22, 14, 14);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(String(CARDS[card].cost), x - 15, HAND_Y - 11);
          ctx.globalAlpha = 1;
        });
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#1b4332";
        ctx.fillText(fill(cp.turn, m.turn, TURNS), 10, 28);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.acorns, energy(m) - spent(m), energy(m)), W - 10, 28);
        ctx.textAlign = "center";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(cp.rival, W / 2, 48);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = mRef.current;
    if (m.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    if (y > HAND_Y - 30) {
      const i = m.hand.findIndex((_, k) => Math.abs(handX(k, m.hand.length) - x) < 24);
      if (i >= 0) input.current.push({ kind: "hand", i });
      return;
    }
    if (y > 54 && y < 474) {
      const l = Math.floor((x - 6) / (LANE_W + 2));
      if (l >= 0 && l < LANES) input.current.push({ kind: "lane", l });
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const m = mRef.current;
    if (m.over) return;
    const num = Number(e.key);
    if (num >= 1 && num <= 7 && num <= m.hand.length) {
      setTouched(true);
      input.current.push({ kind: "hand", i: num - 1 });
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      laneCursor.current = (laneCursor.current + (e.key === "ArrowRight" ? 1 : LANES - 1)) % LANES;
      setTick((t) => t + 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      input.current.push({ kind: "lane", l: laneCursor.current });
    } else if (e.key === " ") {
      e.preventDefault();
      input.current.push({ kind: "end" });
    }
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  const m = mRef.current;
  return (
    <div
      ref={containerRef}
      data-game="blanket-battle"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.turn, m.turn, TURNS)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-1/2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.a, over.b)}</p>
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
      <Button className="min-h-12 w-full" disabled={Boolean(over)} onClick={() => input.current.push({ kind: "end" })}>
        <Hourglass className="size-5" />
        <span>{c.endTurn}</span>
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

function drawCard(ctx: CanvasRenderingContext2D, card: number, x: number, y: number, power: number, rival: boolean, glow: boolean, pending = false): void {
  ctx.fillStyle = glow ? "#ffd43b" : rival ? "#ffe3e3" : "#e7f5ff";
  ctx.fillRect(x - 22, y - 20, 44, 40);
  ctx.strokeStyle = rival ? "#c92a2a" : "#1971c2";
  ctx.lineWidth = 2;
  if (pending) ctx.setLineDash([4, 3]);
  ctx.strokeRect(x - 22, y - 20, 44, 40);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  drawSprite(ctx, CRITTERS[card], x - 4, y - 1, { scale: 3, flipX: rival });
  ctx.fillStyle = "#212529";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(power), x + 14, y + 16);
}
