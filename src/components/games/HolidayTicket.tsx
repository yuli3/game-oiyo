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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { PER_ROW, STAGE_COUNT, TICKET_SLUG, TICKET_STAGES, book, newBooking, pick, seatCol, seatRow, starsFor, stepBooking, taken, type Booking } from "../../lib/games/holiday-ticket";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; party: string; time: string; book: string; start: string; win: string; lose: string; result: string; again: string; next: string;
  booked: string; apart: string; short: string; gone: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", party: "{0}/{1}팀 · {2}명", time: "{0}초", book: "예매하기", start: "가족이 나란히 앉을 빈자리를 눌러 고르고 '예매하기'!", win: "예매 성공! 설에 고향 가요", lose: "매진됐어요…", result: "{0}팀 중 {1}팀 예매 · 놓친 자리 {2}",
    again: "다시 하기", next: "다음 단계", booked: "예매 완료!", apart: "붙어 앉아야 해요", short: "{0}자리를 골라요", gone: "다른 사람이 먼저!",
    help: "설과 추석 기차표는 예매가 열리는 순간 온 나라가 동시에 접속해서, 보는 눈앞에서 빈자리가 사라져요. 가족 표를 예매하는 날이에요. 위에 나온 팀부터 차례로, 그 팀 인원만큼 빈자리(파란 자리)를 눌러 고르고 '예매하기'를 눌러요. 두 사람은 통로 한쪽에 나란히, 세 사람과 네 사람은 한 줄에 앉아야 해요. 고르는 동안에도 자리는 계속 팔려서, 고른 자리를 다른 사람이 먼저 사면 손에서 빠져나가요. 매진되기 전에 모든 팀을 예매하면 통과예요. (키보드: 방향키로 자리 이동, 스페이스로 고르기, Enter로 예매)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", party: "Party {0}/{1} · {2}", time: "{0}s", book: "Book", start: "Tap free seats that sit the family together, then Book!", win: "Booked! Home for Seollal", lose: "Sold out…", result: "{1} of {0} parties booked · {2} seats lost",
    again: "Try again", next: "Next stage", booked: "Booked!", apart: "They must sit together", short: "Pick {0} seats", gone: "Someone beat you to it!",
    help: "When the train tickets for Seollal and Chuseok go on sale, the whole of Korea logs on at once and free seats vanish before your eyes. Today you are booking for the family. Party by party, in the order shown at the top, tap as many free seats (blue) as the party has people and tap Book. A pair must sit side by side on one side of the aisle; three or four must sit in one row. Seats keep selling while you pick, and a picked seat someone else buys first slips out of your hands. Book every party before the train sells out. (Keyboard: arrows move between seats, Space picks, Enter books.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", party: "{0}/{1}組 · {2}人", time: "{0}秒", book: "予約する", start: "家族が並んで座れる空席を選んで「予約する」！", win: "予約成功！ソルラルに帰省できます", lose: "売り切れました…", result: "{0}組中 {1}組予約・逃した席 {2}",
    again: "もう一度", next: "次の面", booked: "予約完了！", apart: "並んで座らないと", short: "{0}席選んでね", gone: "先に取られた！",
    help: "韓国では旧正月（ソルラル）と秋夕の列車の切符は、予約が始まった瞬間に全国から一斉にアクセスがあり、空席が目の前で消えていきます。今日は家族の切符を取ります。上に出ている組から順に、その組の人数分の空席（青）を押して選び「予約する」を押します。2人は通路の片側に並んで、3人と4人は同じ列に座る必要があります。選んでいる間も席は売れ続け、選んだ席を先に買われると手から抜けます。売り切れる前に全組予約すればクリア。（キーボード：矢印キーで席を移動、スペースで選択、Enter で予約）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", party: "第{0}/{1}组 · {2}人", time: "{0}秒", book: "订票", start: "点选能让一家人坐在一起的空座，再点“订票”！", win: "订到了！春节回家", lose: "票卖光了……", result: "{0}组中订到{1}组 · 丢掉的座位 {2}",
    again: "再来一次", next: "下一关", booked: "订票成功！", apart: "要坐在一起", short: "请选{0}个座位", gone: "被别人抢先了！",
    help: "在韩国，春节和中秋的火车票一开售，全国的人同时上线，空座就在眼前一个个消失。今天你要给家人订票。从上方显示的那组开始，按这组人数点选空座（蓝色），再点“订票”。两个人要坐在过道同一侧相邻的位置，三人和四人要坐在同一排。你选座时座位还在不停卖出，选好的座位被别人先买走就会从手里溜走。在卖光前订好所有组就过关。（键盘：方向键移动座位，空格选座，Enter 订票）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", party: "Groupe {0}/{1} · {2}", time: "{0} s", book: "Réserver", start: "Touchez des places libres qui gardent la famille ensemble, puis Réserver !", win: "Réservé ! Retour au pays pour Seollal", lose: "Complet…", result: "{1} groupes sur {0} réservés · {2} places perdues",
    again: "Réessayer", next: "Niveau suivant", booked: "Réservé !", apart: "Ils doivent être côte à côte", short: "Choisissez {0} places", gone: "Quelqu'un a été plus rapide !",
    help: "Quand les billets de train pour Seollal et Chuseok ouvrent, toute la Corée se connecte en même temps et les places libres disparaissent sous vos yeux. Aujourd'hui, vous réservez pour la famille. Groupe après groupe, dans l'ordre affiché en haut, touchez autant de places libres (bleues) que de personnes, puis Réserver. Deux personnes s'assoient côte à côte d'un même côté de l'allée ; trois ou quatre, dans une même rangée. Les places continuent de partir pendant que vous choisissez, et une place achetée avant vous vous échappe. Réservez tous les groupes avant que le train soit complet. (Clavier : flèches pour se déplacer, Espace pour choisir, Entrée pour réserver.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", party: "Grupo {0}/{1} · {2}", time: "{0} s", book: "Reservar", start: "¡Toca asientos libres que dejen a la familia junta y pulsa Reservar!", win: "¡Reservado! A casa por Seollal", lose: "Agotado…", result: "{1} de {0} grupos reservados · {2} asientos perdidos",
    again: "Reintentar", next: "Siguiente nivel", booked: "¡Reservado!", apart: "Tienen que ir juntos", short: "Elige {0} asientos", gone: "¡Alguien se te adelantó!",
    help: "Cuando salen a la venta los billetes de tren para Seollal y Chuseok, toda Corea entra a la vez y los asientos libres desaparecen ante tus ojos. Hoy reservas para la familia. Grupo a grupo, en el orden de arriba, toca tantos asientos libres (azules) como personas y pulsa Reservar. Dos personas van juntas a un mismo lado del pasillo; tres o cuatro, en la misma fila. Los asientos se siguen vendiendo mientras eliges, y uno que otro compra antes se te escapa. Reserva todos los grupos antes de que se agote el tren. (Teclado: flechas para moverte, Espacio para elegir, Intro para reservar.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:holiday-ticket:muted";
const W = 360;
const H = 560;
const TOP = 96;
const BOTTOM = 548;
const SEAT_X = [44, 102, 204, 262];
const SEAT_W = 54;
const FOLK: PixelArt = { palette: { k: "#343a40", s: "#f3c9a0", r: "#c92a2a" }, rows: [".kk.", "kssk", ".ss.", "rrrr", "rrrr"] };

const seatBox = (b: Booking, i: number) => {
  const rowH = (BOTTOM - TOP) / b.stage.rows;
  return { x: SEAT_X[seatCol(i)], y: TOP + seatRow(i) * rowH + 2, w: SEAT_W, h: rowH - 4 };
};

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function HolidayTicket({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; booked: number; lost: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bRef = useRef<Booking>(newBooking(TICKET_STAGES[0]));
  const taps = useRef<Array<number | "book">>([]);
  const cursor = useRef(0);
  const flash = useRef(new Map<number, number>());
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  // the rush starts with the first touch
  const touchedRef = useRef(false);
  touchedRef.current = touched;
  const st = TICKET_STAGES[stage];

  useRunRecord(TICKET_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    bRef.current = newBooking(TICKET_STAGES[s]);
    taps.current = [];
    cursor.current = 0;
    flash.current = new Map();
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(TICKET_SLUG, STAGE_COUNT);
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
      const b = bRef.current;
      if (b.over) return;
      const n = b.stage.rows * PER_ROW;
      const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -PER_ROW, ArrowDown: PER_ROW };
      if (ev.key in move) {
        ev.preventDefault();
        cursor.current = Math.max(0, Math.min(n - 1, cursor.current + move[ev.key]));
        setTouched(true);
      } else if (ev.key === " ") {
        ev.preventDefault();
        taps.current.push(cursor.current);
        setTouched(true);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        taps.current.push("book");
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
      const b = bRef.current;
      const cp = copyRef.current;
      const finish = () => {
        setOver({ won: b.won, stars: starsFor(b), booked: b.party, lost: b.lost });
        if (b.won) {
          setCleared(markStageCleared(TICKET_SLUG, b.stage.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 60, ["#ffd43b", "#c92a2a", "#40c057"], 24, 140, 3);
          sfx("win");
        } else sfx("lose");
      };
      // taps are read once per frame
      for (const tap of taps.current.splice(0)) {
        if (b.over) break;
        if (tap === "book") {
          const before = b.party;
          const res = book(b);
          if (res === "booked") {
            const box = seatBox(b, [...b.mine][b.mine.size - 1]);
            pops.current.push({ text: cp.booked, t: 1, color: "#2f9e44", x: box.x + box.w / 2, y: box.y });
            spawnBurst(parts.current, box.x + box.w / 2, box.y + box.h / 2, ["#40c057", "#ffd43b"], 10, 90, 2);
            sfx("success");
          } else if (res) {
            pops.current.push({ text: res === "apart" ? cp.apart : fill(cp.short, b.stage.parties[before]), t: 1, color: "#e8590c", x: W / 2, y: 80 });
            sfx("fail");
          }
          if (b.over) finish();
        } else {
          const res = pick(b, tap);
          if (res === "picked" || res === "unpicked") sfx("tap");
          else if (res === "taken") flash.current.set(tap, 0.4);
        }
      }
      if (!b.over && (b.t > 0 || touchedRef.current)) {
        const ev = stepBooking(b, dt);
        for (const s of ev.lost) {
          flash.current.set(s, 0.6);
          const box = seatBox(b, s);
          pops.current.push({ text: cp.gone, t: 1, color: "#e03131", x: box.x + box.w / 2, y: box.y });
          sfx("fail");
        }
        if (ev.end) finish();
      }
      for (const [k, v] of flash.current) {
        if (v - dt <= 0) flash.current.delete(k);
        else flash.current.set(k, v - dt);
      }
      stepParticles(parts.current, dt, 60);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the carriage: a long cream-and-blue car seen from above, the aisle down the middle
        ctx.fillStyle = "#1c3d5a";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(34, TOP - 8, W - 68, BOTTOM - TOP + 14);
        ctx.fillStyle = "#ced4da";
        ctx.fillRect(160, TOP - 8, 40, BOTTOM - TOP + 14);
        const picked = new Set(b.picked);
        const n = b.stage.rows * PER_ROW;
        for (let i = 0; i < n; i++) {
          const box = seatBox(b, i);
          const mine = b.mine.has(i);
          const gone = !mine && taken(b, i);
          ctx.fillStyle = mine ? "#40c057" : picked.has(i) ? "#fcc419" : gone ? "#868e96" : "#4dabf7";
          if (flash.current.has(i) && Math.floor(now / 80) % 2 === 0) ctx.fillStyle = "#e03131";
          ctx.fillRect(box.x, box.y, box.w, box.h);
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(box.x, box.y, box.w, 4); // the headrest
          if (gone) drawSprite(ctx, FOLK, box.x + box.w / 2, box.y + box.h / 2 + 2, { scale: Math.max(2, Math.floor(box.h / 8)) });
          if (i === cursor.current && touchedRef.current) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
          }
        }
        // the parties still to book, the current one highlighted
        ctx.textAlign = "left";
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#f8f9fa";
        if (!b.over) ctx.fillText(fill(cp.party, b.party + 1, b.stage.parties.length, b.stage.parties[b.party]), 12, 24);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.max(0, Math.ceil(b.stage.time - b.t))), W - 12, 24);
        b.stage.parties.forEach((size, k) => {
          const x = 12 + k * 46;
          ctx.fillStyle = k < b.party ? "#40c057" : k === b.party ? "#fcc419" : "rgba(255,255,255,0.3)";
          for (let p = 0; p < size; p++) ctx.fillRect(x + p * 10, 40, 8, 14);
        });
        // the clock runs down as a bar: once it is empty, the train is sold out
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(12, 64, W - 24, 6);
        ctx.fillStyle = "#ff8787";
        ctx.fillRect(12, 64, (W - 24) * Math.max(0, 1 - b.t / b.stage.time), 6);
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 14px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillRect(x - tw / 2, pp.y - 18, tw, 22);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 2);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = bRef.current;
    if (b.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    const n = b.stage.rows * PER_ROW;
    for (let i = 0; i < n; i++) {
      const box = seatBox(b, i);
      if (x >= box.x - 3 && x <= box.x + box.w + 3 && y >= box.y - 2 && y <= box.y + box.h + 2) {
        cursor.current = i;
        taps.current.push(i);
        return;
      }
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
      data-game="holiday-ticket"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.time, Math.round(st.time))}</Badge>
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
            <p className="text-sm text-muted-foreground">{fill(c.result, st.parties.length, over.booked, over.lost)}</p>
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
      <Button className="min-h-14 w-full" disabled={Boolean(over)} onClick={() => { setTouched(true); taps.current.push("book"); }}>
        {c.book}
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
