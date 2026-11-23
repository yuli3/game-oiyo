import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
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
import { PUZZLES, SEBAE_SLUG, STAGE_COUNT, newBoard, par, put, solved, starsFor, sums, type Clue, type SebaeBoard, type SebaePuzzle } from "../../lib/games/sebaetdon-split";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; start: string; win: string; result: string; again: string; next: string; undo: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; left: string;
  names: string[]; same: string; more: string; twice: string;
}> = {
  ko: {
    stage: "{0}단계", moves: "옮긴 횟수 {0} · 기준 {1}", start: "지폐를 끌어 봉투에 넣어요", win: "세뱃돈을 딱 맞게 나눴어요!", result: "{0}번 만에 나눴어요", again: "다시 하기", next: "다음 단계", undo: "되돌리기", left: "남은 돈 {0}",
    names: ["민지", "준호", "서연", "하준", "지우", "예린", "도윤", "수아"], same: "{0}와 똑같이", more: "{0}보다 {1} 더", twice: "{0}의 두 배",
    help: "설날 아침, 할머니가 손주들에게 줄 세뱃돈을 봉투에 나눠 담아요. 아래 지갑의 지폐와 동전을 끌어 봉투에 넣으세요. 봉투마다 적힌 금액과 꼭 맞아야 하고, 지갑에 남는 돈이 없어야 해요. 금액이 맞은 봉투에는 초록 표시가 떠요. 봉투 아래 작은 지폐를 끌면 다른 봉투나 지갑으로 옮길 수 있어요. 11단계부터는 '민지와 똑같이', '준호보다 5,000원 더', '서연의 두 배'처럼 다른 손주와 비교한 쪽지가 붙고, 15단계부터 500원·100원 동전도 나와요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", moves: "Moves {0} · par {1}", start: "Drag the bills into the envelopes", win: "Every envelope is just right!", result: "Shared out in {0} moves", again: "Play again", next: "Next stage", undo: "Undo", left: "Left {0}",
    names: ["Minji", "Junho", "Seoyeon", "Hajun", "Jiwoo", "Yerin", "Doyun", "Sua"], same: "Same as {0}", more: "{1} more than {0}", twice: "Twice {0}",
    help: "On Seollal morning Grandma shares out sebaetdon, the New Year money children receive after bowing, into envelopes for her grandchildren. Drag the bills and coins from the wallet at the bottom into the envelopes. Each envelope must hold exactly the amount on its tag, and no money may be left in the wallet. An envelope with the right amount shows a green mark. Drag a small bill under an envelope to move it to another envelope or back to the wallet. From stage 11 some tags compare with another grandchild, like \"Same as Minji\", \"5,000 more than Junho\" or \"Twice Seoyeon\", and from stage 15 500 and 100 won coins join the bills.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", moves: "手数 {0} · 目安 {1}", start: "お札を引いて封筒に入れよう", win: "お年玉をぴったり分けた！", result: "{0}手で分けた", again: "もう一度", next: "次の面", undo: "戻す", left: "残り {0}",
    names: ["ミンジ", "ジュノ", "ソヨン", "ハジュン", "ジウ", "イェリン", "ドユン", "スア"], same: "{0}と同じ", more: "{0}より{1}多く", twice: "{0}の2倍",
    help: "ソルラル(旧正月)の朝、おばあちゃんが孫たちへのお年玉(セベットン)を封筒に分けます。下の財布のお札と硬貨を引いて封筒に入れましょう。どの封筒も書かれた金額ぴったりで、財布にお金が残ってはいけません。金額が合った封筒には緑の印が出ます。封筒の下の小さなお札を引けば、別の封筒や財布へ移せます。11面からは「ミンジと同じ」「ジュノより5,000ウォン多く」「ソヨンの2倍」のように、ほかの孫と比べた札がつき、15面からは500ウォン・100ウォン硬貨も登場します。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", moves: "步数 {0} · 标准 {1}", start: "把钞票拖进红包里", win: "压岁钱分得刚刚好！", result: "{0}步分完", again: "再玩一次", next: "下一关", undo: "撤销", left: "剩余 {0}",
    names: ["敏智", "俊浩", "瑞妍", "夏俊", "智宇", "艺琳", "道允", "秀雅"], same: "和{0}一样", more: "比{0}多{1}", twice: "{0}的两倍",
    help: "春节早上，奶奶要把压岁钱（세뱃돈）分装进给孙子孙女的红包。把下方钱包里的钞票和硬币拖进红包。每个红包都要刚好装上标签写的金额，钱包里也不能剩钱。金额对了的红包会出现绿色标记。拖动红包下方的小钞票，可以移到别的红包或放回钱包。第11关起，有的标签会和别的孩子比较，比如“和敏智一样”“比俊浩多5,000韩元”“瑞妍的两倍”；第15关起还会出现500韩元和100韩元硬币。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", moves: "Coups {0} · par {1}", start: "Glissez les billets dans les enveloppes", win: "Chaque enveloppe est parfaite !", result: "Partagé en {0} coups", again: "Rejouer", next: "Niveau suivant", undo: "Annuler", left: "Reste {0}",
    names: ["Minji", "Junho", "Seoyeon", "Hajun", "Jiwoo", "Yerin", "Doyun", "Sua"], same: "Autant que {0}", more: "{1} de plus que {0}", twice: "Le double de {0}",
    help: "Le matin de Seollal, Grand-mère répartit le sebaetdon, l'argent du Nouvel An offert aux enfants après leur salut, dans des enveloppes pour ses petits-enfants. Glissez les billets et les pièces du portefeuille en bas vers les enveloppes. Chaque enveloppe doit contenir exactement la somme de son étiquette, et il ne doit rien rester dans le portefeuille. Une enveloppe juste affiche une marque verte. Glissez un petit billet sous une enveloppe pour le changer d'enveloppe ou le remettre au portefeuille. Dès le niveau 11, certaines étiquettes comparent avec un autre petit-enfant, comme « Autant que Minji », « 5 000 de plus que Junho » ou « Le double de Seoyeon », et dès le niveau 15 des pièces de 500 et 100 wons s'ajoutent aux billets.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", moves: "Movimientos {0} · par {1}", start: "Arrastra los billetes a los sobres", win: "¡Cada sobre está justo!", result: "Repartido en {0} movimientos", again: "Otra vez", next: "Siguiente nivel", undo: "Deshacer", left: "Queda {0}",
    names: ["Minji", "Junho", "Seoyeon", "Hajun", "Jiwoo", "Yerin", "Doyun", "Sua"], same: "Igual que {0}", more: "{1} más que {0}", twice: "El doble que {0}",
    help: "La mañana de Seollal, la abuela reparte el sebaetdon, el dinero de Año Nuevo que reciben los niños tras su reverencia, en sobres para sus nietos. Arrastra los billetes y monedas de la cartera de abajo a los sobres. Cada sobre debe contener exactamente la cantidad de su etiqueta, y no puede quedar dinero en la cartera. Un sobre con la cantidad justa muestra una marca verde. Arrastra un billete pequeño bajo un sobre para cambiarlo de sobre o devolverlo a la cartera. Desde el nivel 11 algunas etiquetas comparan con otro nieto, como «Igual que Minji», «5.000 más que Junho» o «El doble que Seoyeon», y desde el nivel 15 aparecen monedas de 500 y 100 wones.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}
const won = (locale: L, v: number) => (locale === "ko" ? `${v.toLocaleString("en-US")}원` : `₩${v.toLocaleString("en-US")}`);

const MUTE_KEY = "oiyo:sebaetdon-split:muted";
const W = 360;
const H = 560;
const WALLET_Y = 372;
const BILL = { w: 62, h: 30 };
const CHIP = { w: 26, h: 12 };
const BILL_COLORS: Record<number, { a: string; b: string; t: string }> = {
  1000: { a: "#74c0fc", b: "#1c7ed6", t: "#0b3d6b" },
  5000: { a: "#ffa8a8", b: "#e8590c", t: "#6b2a06" },
  10000: { a: "#8ce99a", b: "#2b8a3e", t: "#123d1c" },
  50000: { a: "#ffe066", b: "#e67700", t: "#5c3200" },
  500: { a: "#dee2e6", b: "#868e96", t: "#343a40" },
  100: { a: "#e9ecef", b: "#adb5bd", t: "#343a40" },
};
const ENVELOPE: PixelArt = {
  palette: { r: "#e03131", d: "#a51111", y: "#ffd43b", w: "#fff5f5" },
  rows: ["dddddddddddd", "drrrrrrrrrrd", "drdrrrrrrdrd", "drrdrrrrdrrd", "drrrdyydrrrd", "drrrryyrrrrd", "drrrrrrrrrrd", "drrrrrrrrrrd", "dddddddddddd"],
};
const GRANNY: PixelArt = {
  palette: { h: "#ced4da", s: "#f1c27d", k: "#343a40", p: "#c2255c", w: "#fff", g: "#2b8a3e" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "pwwppwwp", "pppppppp", "gggggggg", "gggggggg"],
};

interface Slot { x: number; y: number; w: number; h: number }

function envSlots(n: number): Slot[] {
  const top = n <= 3 ? [n] : [3, n - 3];
  const out: Slot[] = [];
  const w = 104;
  const h = 132;
  top.forEach((cnt, row) => {
    const gap = (W - cnt * w) / (cnt + 1);
    for (let i = 0; i < cnt; i++) out.push({ x: gap + i * (w + gap), y: 70 + row * (h + 8), w, h });
  });
  if (n <= 3) for (const s of out) s.y += 60;
  return out;
}
function walletSpot(i: number): { x: number; y: number } {
  const col = i % 5;
  const row = Math.floor(i / 5);
  return { x: 8 + col * (BILL.w + 7) + BILL.w / 2, y: WALLET_Y + 30 + row * (BILL.h + 10) + BILL.h / 2 };
}
function chipSpot(slot: Slot, k: number): { x: number; y: number } {
  const col = k % 3;
  const row = Math.floor(k / 3);
  return { x: slot.x + 8 + col * (CHIP.w + 6) + CHIP.w / 2, y: slot.y + 74 + row * (CHIP.h + 4) + CHIP.h / 2 };
}
function clueText(c: (typeof COPY)[L], locale: L, clue: Clue, p: SebaePuzzle): string {
  if (clue.kind === "amount") return won(locale, clue.value);
  const name = c.names[p.envelopes[clue.of].name];
  if (clue.kind === "same") return fill(c.same, name);
  if (clue.kind === "twice") return fill(c.twice, name);
  return fill(c.more, name, won(locale, clue.by));
}
function drawBill(ctx: CanvasRenderingContext2D, v: number, x: number, y: number, w: number, h: number, label: boolean): void {
  const col = BILL_COLORS[v];
  if (v < 1000) {
    const r = Math.min(w, h) / 2 + (v === 500 ? 2 : 0);
    ctx.fillStyle = col.b;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.a;
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = col.b;
    ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    ctx.fillStyle = col.a;
    ctx.fillRect(Math.round(x - w / 2) + 2, Math.round(y - h / 2) + 2, w - 4, h - 4);
    ctx.fillStyle = col.b;
    ctx.fillRect(Math.round(x + w / 2) - Math.round(h * 0.7) - 3, Math.round(y - h / 2) + 4, Math.round(h * 0.7) - 2, h - 8);
  }
  if (label) {
    ctx.fillStyle = col.t;
    ctx.font = `bold ${v < 1000 ? 10 : 12}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(v.toLocaleString("en-US"), x - (v >= 1000 ? 8 : 0), y + 4);
  }
}

export default function SebaetdonSplit({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [moves, setMoves] = useState(0);
  const [over, setOver] = useState<null | { stars: number; moves: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bRef = useRef<SebaeBoard>(newBoard(PUZZLES[0]));
  const hist = useRef<Array<Record<number, number | null>>>([]);
  const drag = useRef<null | { id: number; bill: number; x: number; y: number }>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const puzzle = PUZZLES[stage];

  useRunRecord(SEBAE_SLUG, Boolean(over), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    bRef.current = newBoard(PUZZLES[st]);
    hist.current = [];
    drag.current = null;
    parts.current = [];
    setMoves(0);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SEBAE_SLUG, STAGE_COUNT);
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
      stepParticles(parts.current, dt, 120);
      const b = bRef.current;
      const p = b.puzzle;
      const cc = copyRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a warm room: folding screen at the top, floor mat below, Grandma by the table
        ctx.fillStyle = "#f8f0e3";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#e9d8bd";
        for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 3, 60);
        ctx.fillStyle = "#c92a2a";
        ctx.fillRect(0, 56, W, 4);
        drawSprite(ctx, GRANNY, 32, 32, { scale: 4 });
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#5c3d2e";
        const total = p.bills.reduce((s, x) => s + (b.place[x.id] === null ? x.value : 0), 0);
        ctx.fillText(fill(cc.left, won(locale, total)), 62, 36);
        // envelopes with their tags, sums and the bills inside
        const slots = envSlots(p.envelopes.length);
        const sm = sums(b);
        p.envelopes.forEach((e, i) => {
          const sl = slots[i];
          const ok = sm[i] === p.targets[i];
          ctx.fillStyle = ok ? "#d3f9d8" : "#fff";
          ctx.fillRect(sl.x, sl.y, sl.w, sl.h);
          ctx.strokeStyle = ok ? "#2f9e44" : "#dee2e6";
          ctx.lineWidth = 2;
          ctx.strokeRect(sl.x + 1, sl.y + 1, sl.w - 2, sl.h - 2);
          drawSprite(ctx, ENVELOPE, sl.x + 24, sl.y + 22, { scale: 3 });
          ctx.textAlign = "left";
          ctx.fillStyle = "#212529";
          ctx.font = "bold 13px sans-serif";
          ctx.fillText(cc.names[e.name], sl.x + 46, sl.y + 20);
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = e.clue.kind === "amount" ? "#c92a2a" : "#7048e8";
          const tag = clueText(cc, locale, e.clue, p);
          // wrap long tags over two lines
          const words = tag.split(" ");
          let line = "";
          let ly = sl.y + 46;
          for (const wd of words) {
            const test = line ? `${line} ${wd}` : wd;
            if (ctx.measureText(test).width > sl.w - 8 && line) {
              ctx.fillText(line, sl.x + 4, ly);
              line = wd;
              ly += 12;
            } else line = test;
          }
          ctx.fillText(line, sl.x + 4, ly);
          ctx.fillStyle = "#495057";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(won(locale, sm[i]), sl.x + sl.w - 4, sl.y + sl.h - 6);
          if (ok) {
            ctx.fillStyle = "#2f9e44";
            ctx.font = "bold 16px sans-serif";
            ctx.fillText("✓", sl.x + sl.w - 6, sl.y + 20);
          }
          let k = 0;
          for (const bill of p.bills) {
            if (b.place[bill.id] !== i || drag.current?.bill === bill.id) continue;
            const sp = chipSpot(sl, k++);
            drawBill(ctx, bill.value, sp.x, sp.y, CHIP.w, CHIP.h, false);
          }
        });
        // the wallet
        ctx.fillStyle = "#8a5a3b";
        ctx.fillRect(0, WALLET_Y, W, H - WALLET_Y);
        ctx.fillStyle = "#a9733c";
        ctx.fillRect(0, WALLET_Y, W, 6);
        ctx.fillStyle = "#6b4226";
        for (let y = WALLET_Y + 20; y < H; y += 40) ctx.fillRect(0, y, W, 2);
        p.bills.forEach((bill, i) => {
          if (b.place[bill.id] !== null || drag.current?.bill === bill.id) return;
          const sp = walletSpot(i);
          drawBill(ctx, bill.value, sp.x, sp.y, BILL.w, BILL.h, true);
        });
        const d = drag.current;
        if (d) {
          const bill = p.bills[d.bill];
          const hit = slots.findIndex((sl) => d.x >= sl.x && d.x <= sl.x + sl.w && d.y >= sl.y && d.y <= sl.y + sl.h);
          if (hit >= 0) {
            ctx.strokeStyle = "#fab005";
            ctx.lineWidth = 4;
            ctx.strokeRect(slots[hit].x - 2, slots[hit].y - 2, slots[hit].w + 4, slots[hit].h + 4);
          }
          drawBill(ctx, bill.value, d.x, d.y - 16, BILL.w, BILL.h, true);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [locale]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (over) return;
    const pt = toField(e);
    const b = bRef.current;
    const p = b.puzzle;
    const slots = envSlots(p.envelopes.length);
    let found = -1;
    p.bills.forEach((bill, i) => {
      if (found >= 0 || b.place[bill.id] !== null) return;
      const sp = walletSpot(i);
      if (Math.abs(pt.x - sp.x) <= BILL.w / 2 + 3 && Math.abs(pt.y - sp.y) <= BILL.h / 2 + 5) found = bill.id;
    });
    if (found < 0) {
      p.envelopes.forEach((_, ei) => {
        let k = 0;
        for (const bill of p.bills) {
          if (b.place[bill.id] !== ei) continue;
          const sp = chipSpot(slots[ei], k++);
          if (found < 0 && Math.abs(pt.x - sp.x) <= CHIP.w / 2 + 4 && Math.abs(pt.y - sp.y) <= CHIP.h / 2 + 6) found = bill.id;
        }
      });
    }
    if (found < 0) return;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, bill: found, x: pt.x, y: pt.y };
    sfx("tap");
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const pt = toField(e);
    d.x = pt.x;
    d.y = pt.y;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const b = bRef.current;
    const p = b.puzzle;
    const slots = envSlots(p.envelopes.length);
    const hit = slots.findIndex((sl) => d.x >= sl.x && d.x <= sl.x + sl.w && d.y >= sl.y && d.y <= sl.y + sl.h);
    const env = hit >= 0 ? hit : d.y >= WALLET_Y - 10 ? null : b.place[d.bill];
    const snap = { ...b.place };
    if (!put(b, d.bill, env)) return;
    hist.current.push(snap);
    setMoves(b.moves);
    if (env !== null) {
      const sl = slots[env];
      if (sums(b)[env] === p.targets[env]) {
        spawnBurst(parts.current, sl.x + sl.w / 2, sl.y + 30, ["#ffd43b", "#2f9e44", "#ffffff"], 12, 90, b.moves * 13);
        sfx("success");
      } else sfx("place");
    }
    if (solved(b)) {
      const stars = starsFor(b.moves, p);
      setOver({ stars, moves: b.moves });
      setCleared(markStageCleared(SEBAE_SLUG, p.stage, STAGE_COUNT));
      spawnBurst(parts.current, W / 2, 200, ["#e03131", "#ffd43b", "#ffffff", "#2f9e44"], 40, 160, b.moves);
      sfx("win");
    }
  };
  const undo = () => {
    const prev = hist.current.pop();
    if (!prev || over) return;
    bRef.current.place = prev;
    setMoves(bRef.current.moves);
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
      data-game="sebaetdon-split"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.moves, moves, par(puzzle))}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={undo} aria-label={c.undo}>
            <Undo2 className="size-5" />
          </Button>
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
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (drag.current = null)}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-2/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.win}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.moves)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
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
