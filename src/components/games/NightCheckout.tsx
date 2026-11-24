import { useCallback, useEffect, useRef, useState } from "react";
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
import { drawParticles, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import {
  CHECKOUT_SLUG, CHECKOUT_STAGES, DENOMS, MAX_COMPLAINTS, STAGE_COUNT, allScanned, changeDue, clearChange, count, customer, newShift, pay, scan, starsFor, stepShift, totalOf,
  type Shift,
} from "../../lib/games/night-checkout";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; complaints: string; served: string; start: string; total: string; paid: string; card: string; due: string; given: string; pay: string; takeCard: string; clear: string;
  thanks: string; wrong: string; notYet: string; leftAngry: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", complaints: "항의 {0}/{1}", served: "계산 {0}명", start: "물건을 눌러 찍고, 거스름돈을 세어 건네요!", total: "합계", paid: "받은 돈", card: "카드", due: "거스름돈", given: "세는 중", pay: "건네기", takeCard: "카드 결제", clear: "다시 세기",
    thanks: "감사합니다!", wrong: "거스름돈이 틀렸어요", notYet: "아직 안 찍은 물건이 있어요", leftAngry: "기다리다 화나서 나갔어요", win: "야간 근무 끝!", lose: "점장님이 대신 서요", result: "{0}명 계산 · 항의 {1}번",
    again: "다시 하기", next: "다음 단계",
    help: "편의점 야간 알바예요. 손님이 줄을 서서 물건을 올려요. 물건을 하나씩 눌러 바코드를 찍으면 계산대가 합계를 내요. 1+1 물건은 두 개째가 공짜예요. 카드 손님은 결제 버튼만 누르면 되고, 현금 손님에게는 아래 지폐와 동전을 눌러 거스름돈을 세어 건네요. 11단계부터는 계산대 화면이 고장 나 거스름돈을 직접 계산해야 해요. 거스름돈이 틀리거나 손님이 기다리다 나가면 항의가 들어오고, 세 번이면 끝이에요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", complaints: "Complaints {0}/{1}", served: "{0} served", start: "Tap items to scan them, then count out the change!", total: "Total", paid: "Paid", card: "Card", due: "Change", given: "Counting", pay: "Hand over", takeCard: "Take card", clear: "Recount",
    thanks: "Thank you!", wrong: "Wrong change", notYet: "Some items aren't scanned", leftAngry: "Got tired of waiting and left", win: "Night shift done!", lose: "The manager takes over", result: "{0} served · {1} complaints",
    again: "Try again", next: "Next stage",
    help: "You're on the night shift at a corner shop. Customers line up and put their things on the counter. Tap each item to scan it and the till adds them up — with buy-one-get-one-free, every second one is free. Card payers just need the pay button; for cash payers, tap the notes and coins below to count out their change and hand it over. From stage 11 the till's change screen is broken and you work the change out yourself. Wrong change, or a customer who gives up waiting, is a complaint; three and you're done.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", complaints: "クレーム {0}/{1}", served: "会計 {0}人", start: "商品を押してスキャンし、お釣りを数えて渡そう！", total: "合計", paid: "預かり", card: "カード", due: "お釣り", given: "数え中", pay: "渡す", takeCard: "カード決済", clear: "数え直す",
    thanks: "ありがとうございました！", wrong: "お釣りが違う", notYet: "まだスキャンしていない商品がある", leftAngry: "待ちきれずに帰った", win: "夜勤おしまい！", lose: "店長が代わりに入った", result: "{0}人会計・クレーム {1}回",
    again: "もう一度", next: "次の面",
    help: "コンビニの夜勤バイトです。お客さんが並んで商品を置きます。商品を一つずつ押してバーコードを読むと、レジが合計を出します。1+1の商品は2個目が無料。カードのお客さんは決済ボタンを押すだけ、現金のお客さんには下のお札と硬貨を押してお釣りを数えて渡します。11面からはレジのお釣り表示が壊れて自分で計算します。お釣りを間違えたりお客さんが待ちきれずに帰るとクレーム、3回で終わり。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", complaints: "投诉 {0}/{1}", served: "已结账 {0} 人", start: "点商品扫码，再数好找零递过去！", total: "合计", paid: "收款", card: "刷卡", due: "找零", given: "已数", pay: "递出", takeCard: "刷卡结账", clear: "重数",
    thanks: "谢谢光临！", wrong: "找零错了", notYet: "还有商品没扫", leftAngry: "等不及生气走了", win: "夜班结束！", lose: "店长来接手了", result: "结账 {0} 人 · 投诉 {1} 次",
    again: "再来一次", next: "下一关",
    help: "你在便利店上夜班。顾客排队把商品放上柜台。逐个点商品扫码，收银机就会算出合计；买一送一的商品第二件免费。刷卡的顾客只要按结账键；付现金的顾客，点下方的纸币和硬币数好找零递过去。从第11关起收银机的找零显示坏了，要自己算。找错零钱或顾客等不及离开都会被投诉，三次就结束。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", complaints: "Plaintes {0}/{1}", served: "{0} servis", start: "Touchez les articles pour les scanner, puis comptez la monnaie !", total: "Total", paid: "Reçu", card: "Carte", due: "Monnaie", given: "Compté", pay: "Rendre", takeCard: "Payer par carte", clear: "Recompter",
    thanks: "Merci !", wrong: "Mauvaise monnaie", notYet: "Des articles ne sont pas scannés", leftAngry: "Lassé d'attendre, il est parti", win: "Fin du service de nuit !", lose: "Le gérant prend le relais", result: "{0} servis · {1} plaintes",
    again: "Réessayer", next: "Niveau suivant",
    help: "Vous faites le service de nuit dans une supérette. Les clients font la queue et posent leurs achats. Touchez chaque article pour le scanner et la caisse fait le total ; avec « un acheté, un offert », un article sur deux est gratuit. Pour la carte, il suffit du bouton de paiement ; pour l'espèce, touchez les billets et pièces en bas pour compter la monnaie et la rendre. Dès le niveau 11, l'écran de monnaie est en panne et vous calculez vous-même. Une erreur de monnaie ou un client qui part lassé, c'est une plainte ; trois et c'est fini.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", complaints: "Quejas {0}/{1}", served: "{0} atendidos", start: "¡Toca los productos para escanearlos y cuenta el cambio!", total: "Total", paid: "Recibido", card: "Tarjeta", due: "Cambio", given: "Contado", pay: "Entregar", takeCard: "Cobrar con tarjeta", clear: "Recontar",
    thanks: "¡Gracias!", wrong: "Cambio incorrecto", notYet: "Faltan productos por escanear", leftAngry: "Se cansó de esperar y se fue", win: "¡Turno de noche terminado!", lose: "El encargado toma el relevo", result: "{0} atendidos · {1} quejas",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Haces el turno de noche en una tienda de barrio. Los clientes hacen cola y dejan sus cosas en el mostrador. Toca cada producto para escanearlo y la caja suma el total; con el 2x1, uno de cada dos es gratis. Con tarjeta basta el botón de pago; con efectivo, toca los billetes y monedas de abajo para contar el cambio y entregarlo. Desde el nivel 11 la pantalla del cambio está rota y lo calculas tú. Un cambio mal dado o un cliente que se cansa de esperar es una queja; con tres se acaba.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:night-checkout:muted";
const W = 360;
const H = 560;
const ITEM_COLOURS = ["#ffd8a8", "#b2f2bb", "#a5d8ff", "#ffc9c9", "#d0bfff", "#99e9f2", "#ffec99", "#fcc2d7", "#c0eb75", "#e9ecef", "#ffa8a8", "#74c0fc", "#8ce99a", "#ffe066"];
const won = (n: number) => n.toLocaleString("en-US");

type Act = { kind: "scan"; k: number } | { kind: "denom"; d: number } | { kind: "clear" } | { kind: "pay" };
interface Pop { text: string; t: number; good: boolean }

// hit boxes on the canvas
const itemBox = (k: number) => ({ x: 16 + (k % 4) * 84, y: 132 + Math.floor(k / 4) * 54, w: 76, h: 46 });
const denomBox = (k: number) => ({ x: 10 + k * 69, y: 392, w: 63, h: 58 });
const CLEAR_BOX = { x: 16, y: 466, w: 150, h: 60 };
const PAY_BOX = { x: 180, y: 466, w: 164, h: 60 };
const inside = (b: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

export default function NightCheckout({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; served: number; complaints: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Shift>(newShift(CHECKOUT_STAGES[0]));
  const input = useRef<Act[]>([]);
  const started = useRef(false);
  const overShown = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;

  useRunRecord(CHECKOUT_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    sRef.current = newShift(CHECKOUT_STAGES[s]);
    input.current = [];
    started.current = false;
    overShown.current = false;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CHECKOUT_SLUG, STAGE_COUNT);
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
      const s = sRef.current;
      const cp = copyRef.current;
      const say = (text: string, good: boolean) => (pops.current = [{ text, t: 1.1, good }]);
      // taps are read once per frame
      for (const a of input.current.splice(0)) {
        if (s.over) break;
        if (a.kind === "scan") {
          if (scan(s, a.k)) {
            const b = itemBox(a.k);
            spawnBurst(parts.current, b.x + b.w / 2, b.y + b.h / 2, ["#ff6b6b", "#fff"], 5, 60, 2);
            sfx("tap");
          }
        } else if (a.kind === "denom") {
          if (count(s, a.d)) sfx("place");
          else if (customer(s) && !allScanned(s)) say(cp.notYet, false);
        } else if (a.kind === "clear") clearChange(s);
        else {
          const r = pay(s);
          if (r === "thanks") {
            say(cp.thanks, true);
            spawnBurst(parts.current, 180, 90, ["#ffd43b", "#fff"], 12, 90, 2);
            sfx("success");
          } else if (r === "wrong") {
            say(cp.wrong, false);
            sfx("fail");
          } else if (r === "not yet") say(cp.notYet, false);
        }
      }
      if (started.current && !s.over) {
        const ev = stepShift(s, dt);
        if (ev.left.length) {
          say(cp.leftAngry, false);
          sfx("fail");
        }
      }
      if (s.over && !overShown.current) {
        overShown.current = true;
        setOver({ won: s.won, stars: starsFor(s), served: s.served, complaints: s.complaints });
        if (s.won) {
          setCleared(markStageCleared(CHECKOUT_SLUG, s.stage.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 280, ["#ffd43b", "#fff", "#2f9e44", "#1971c2"], 30, 150, 3);
          sfx("win");
        } else sfx("lose");
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#1c1f3a";
        ctx.fillRect(0, 0, W, H);
        // the queue at the door, each with a patience bar
        const cur = customer(s);
        const queue = s.stage.customers.map((_, i) => i).filter((i) => !s.done[i] && !s.left[i] && i !== s.current && s.stage.customers[i].at <= s.t);
        queue.slice(0, 7).forEach((i, k) => {
          const cu = s.stage.customers[i];
          const x = 120 + k * 34;
          ctx.fillStyle = ["#f783ac", "#74c0fc", "#ffd43b", "#8ce99a", "#b197fc"][i % 5];
          ctx.fillRect(x, 48, 22, 26);
          ctx.fillStyle = "#ffe8cc";
          ctx.fillRect(x + 3, 34, 16, 14);
          const left = Math.max(0, 1 - (s.t - cu.at) / cu.patience);
          ctx.fillStyle = left < 0.3 ? "#fa5252" : "#51cf66";
          ctx.fillRect(x, 78, 22 * left, 4);
        });
        if (cur) {
          ctx.fillStyle = ["#f783ac", "#74c0fc", "#ffd43b", "#8ce99a", "#b197fc"][s.current % 5];
          ctx.fillRect(40, 56, 40, 50);
          ctx.fillStyle = "#ffe8cc";
          ctx.fillRect(46, 30, 28, 26);
        }
        // the counter and its items
        ctx.fillStyle = "#868e96";
        ctx.fillRect(8, 120, W - 16, 170);
        if (cur)
          cur.items.forEach((it, k) => {
            const b = itemBox(k);
            ctx.fillStyle = s.scanned[k] ? "rgba(255,255,255,0.25)" : ITEM_COLOURS[it.kind % ITEM_COLOURS.length];
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.fillStyle = "#212529";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(won(it.price), b.x + b.w / 2, b.y + 28);
            if (it.twoForOne) {
              ctx.fillStyle = "#e03131";
              ctx.fillRect(b.x, b.y, 30, 14);
              ctx.fillStyle = "#fff";
              ctx.font = "bold 10px sans-serif";
              ctx.fillText("1+1", b.x + 15, b.y + 11);
            }
            if (s.scanned[k]) {
              ctx.fillStyle = "#2b8a3e";
              ctx.font = "bold 18px sans-serif";
              ctx.fillText("v", b.x + b.w - 10, b.y + 18);
            }
          });
        // the till screen
        ctx.fillStyle = "#0b3d2e";
        ctx.fillRect(8, 300, W - 16, 82);
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = "#8ce99a";
        const done = allScanned(s);
        if (cur) {
          ctx.fillText(`${cp.total} ${done ? won(totalOf(cur.items)) : "..."}`, 18, 322);
          ctx.fillText(`${cp.paid} ${cur.paid ? won(cur.paid) : cp.card}`, 18, 344);
          if (cur.paid) {
            ctx.fillText(`${cp.due} ${done ? (s.stage.showChange ? won(changeDue(cur)) : "????") : "..."}`, 190, 322);
            ctx.fillStyle = "#ffd43b";
            ctx.fillText(`${cp.given} ${won(s.given)}`, 190, 344);
          }
        }
        ctx.fillStyle = "#c3fae8";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(fill(cp.served, s.served), 18, 372);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.complaints, s.complaints, MAX_COMPLAINTS), W - 18, 372);
        // notes and coins
        DENOMS.forEach((d, k) => {
          const b = denomBox(k);
          ctx.fillStyle = d >= 1000 ? ["#a9e34b", "#ffa94d", "#74c0fc"][k] : "#ced4da";
          if (d >= 1000) ctx.fillRect(b.x, b.y, b.w, b.h);
          else {
            ctx.beginPath();
            ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 27, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#212529";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won(d), b.x + b.w / 2, b.y + b.h / 2 + 5);
        });
        ctx.fillStyle = "#495057";
        ctx.fillRect(CLEAR_BOX.x, CLEAR_BOX.y, CLEAR_BOX.w, CLEAR_BOX.h);
        ctx.fillStyle = cur && done ? "#1971c2" : "#343a40";
        ctx.fillRect(PAY_BOX.x, PAY_BOX.y, PAY_BOX.w, PAY_BOX.h);
        ctx.fillStyle = "#f8f9fa";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(cp.clear, CLEAR_BOX.x + CLEAR_BOX.w / 2, CLEAR_BOX.y + 36);
        ctx.fillText(cur && !cur.paid ? cp.takeCard : cp.pay, PAY_BOX.x + PAY_BOX.w / 2, PAY_BOX.y + 36);
        drawParticles(ctx, parts.current);
        for (const pp of pops.current) {
          ctx.font = "bold 14px sans-serif";
          const tw = ctx.measureText(pp.text).width + 16;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillRect(W / 2 - tw / 2, 6, tw, 24);
          ctx.fillStyle = pp.good ? "#2b8a3e" : "#e8590c";
          ctx.textAlign = "center";
          ctx.fillText(pp.text, W / 2, 23);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const begin = () => {
    started.current = true;
    setTouched(true);
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (s.over) return;
    begin();
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    const cur = customer(s);
    if (cur) {
      const k = cur.items.findIndex((_, j) => inside(itemBox(j), x, y));
      if (k >= 0) return void input.current.push({ kind: "scan", k });
    }
    const d = DENOMS.findIndex((_, j) => inside(denomBox(j), x, y));
    if (d >= 0) return void input.current.push({ kind: "denom", d: DENOMS[d] });
    if (inside(CLEAR_BOX, x, y)) input.current.push({ kind: "clear" });
    else if (inside(PAY_BOX, x, y)) input.current.push({ kind: "pay" });
  };

  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (s.over) return;
    const n = Number(e.key);
    if (n >= 1 && n <= DENOMS.length) {
      begin();
      input.current.push({ kind: "denom", d: DENOMS[n - 1] });
    } else if (e.key === "s" || e.key === "S" || e.key === " ") {
      e.preventDefault();
      begin();
      const k = s.scanned.indexOf(false);
      if (k >= 0) input.current.push({ kind: "scan", k });
    } else if (e.key === "Backspace") {
      e.preventDefault();
      input.current.push({ kind: "clear" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      begin();
      input.current.push({ kind: "pay" });
    }
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="night-checkout"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-40 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.served, over.complaints)}</p>
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
