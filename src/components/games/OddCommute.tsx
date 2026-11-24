import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { COMMUTE_SLUG, COMMUTE_STAGES, PALETTE, STAGE_COUNT, carWith, current, decide, newRide, starsFor, type Ride, type Thing } from "../../lib/games/odd-commute";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; stop: string; car: string; first: string; back: string; on: string; right: string; wrong: string; changed: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", stop: "역 {0}/{1}", car: "{0}번째 칸", first: "이 칸을 잘 봐 두세요. 이게 평소의 칸이에요.", back: "되돌아가기", on: "다음 칸으로", right: "맞아요!", wrong: "틀렸어요, 첫 역부터 다시", changed: "여기가 바뀌었어요",
    win: "무사히 도착! 지각 면했어요", lose: "열차가 끝났어요", result: "틀린 판단 {0}번", again: "다시 하기", next: "다음 단계",
    help: "아침 출근 열차가 이상해요. 다음 칸으로 넘어가도 계속 같은 칸이 나와요. 첫 칸에서 승객, 광고, 손잡이, 시계, 창문을 잘 봐 두세요. 그다음 칸마다 무언가 바뀌었으면 '되돌아가기', 그대로면 '다음 칸으로'를 눌러요. 맞게 고를 때마다 내릴 역에 한 정거장씩 가까워지고, 한 번이라도 틀리면 첫 역부터 다시 세요. 열차 칸이 다 떨어지기 전에 목표 정거장 수만큼 연속으로 맞히면 도착이에요. 사라지거나, 하나 더 있거나, 색·크기·방향·자리가 바뀌는 것까지 있어요. (키보드: 왼쪽 방향키 되돌아가기, 오른쪽 방향키 다음 칸)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", stop: "Stop {0}/{1}", car: "Car {0}", first: "Take a good look at this car. This is the ordinary one.", back: "Turn back", on: "Next car", right: "Right!", wrong: "Wrong — back to the first stop", changed: "This changed",
    win: "Made it! Not late after all", lose: "The train ran out of cars", result: "{0} wrong calls", again: "Try again", next: "Next stage",
    help: "The morning train is wrong: walk into the next car and it is the same car again. In the first car, take a good look at the passengers, posters, straps, clock and windows. Then in each car, tap Turn back if anything has changed, or Next car if nothing has. Each right call takes you a stop closer; one wrong call and you count from the first stop again. Make the stage's number of right calls in a row before the train runs out of cars. Things can vanish, appear twice, or change colour, size, direction or place. (Keyboard: left arrow turns back, right arrow goes on.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", stop: "駅 {0}/{1}", car: "{0}両目", first: "この車両をよく見ておこう。これがいつもの車両です。", back: "引き返す", on: "次の車両へ", right: "正解！", wrong: "不正解、最初の駅からやり直し", changed: "ここが変わっていた",
    win: "無事到着！遅刻せずにすんだ", lose: "車両が尽きました", result: "誤った判断 {0}回", again: "もう一度", next: "次の面",
    help: "朝の通勤電車がおかしい。次の車両へ移っても、また同じ車両が続きます。最初の車両で乗客・広告・つり革・時計・窓をよく見ておきましょう。その後は車両ごとに、何か変わっていれば「引き返す」、そのままなら「次の車両へ」を押します。正しく選ぶたびに降りる駅へ一駅近づき、一度でも間違えると最初の駅から数え直し。車両が尽きる前に目標の駅数だけ連続で正解すれば到着です。消える・一つ増える・色や大きさ・向き・位置が変わる、といった異変があります。（キーボード：左キーで引き返す、右キーで次の車両）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", stop: "站 {0}/{1}", car: "第{0}节车厢", first: "好好看看这节车厢，这就是平常的样子。", back: "往回走", on: "去下一节", right: "对了！", wrong: "错了，从第一站重新数", changed: "这里变了",
    win: "顺利到站！没迟到", lose: "车厢走完了", result: "判断错误 {0} 次", again: "再来一次", next: "下一关",
    help: "早上的通勤列车不对劲：走进下一节车厢，又是同一节车厢。在第一节车厢里好好记住乘客、广告、拉环、时钟和车窗。之后每到一节车厢，有任何变化就点“往回走”，没有变化就点“去下一节”。每判断对一次就离下车的站近一站，只要错一次就从第一站重新数。在车厢走完前连续判断对达到目标站数就到站了。异常有消失、多出一个，以及颜色、大小、方向、位置的变化。（键盘：左方向键往回走，右方向键去下一节）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", stop: "Arrêt {0}/{1}", car: "Voiture {0}", first: "Regardez bien cette voiture : c'est la voiture normale.", back: "Faire demi-tour", on: "Voiture suivante", right: "Juste !", wrong: "Faux — retour au premier arrêt", changed: "Ceci avait changé",
    win: "Arrivé ! Pas en retard finalement", lose: "Le train n'a plus de voitures", result: "{0} mauvais choix", again: "Réessayer", next: "Niveau suivant",
    help: "Le train du matin déraille : on passe à la voiture suivante et c'est encore la même. Dans la première voiture, regardez bien les passagers, affiches, poignées, horloge et fenêtres. Puis, dans chaque voiture, touchez Faire demi-tour si quelque chose a changé, ou Voiture suivante sinon. Chaque bon choix vous rapproche d'un arrêt ; une seule erreur et vous recomptez depuis le premier. Enchaînez le nombre de bons choix demandé avant que le train n'ait plus de voitures. Les choses peuvent disparaître, apparaître en double, ou changer de couleur, de taille, de sens ou de place. (Clavier : flèche gauche pour revenir, droite pour avancer.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", stop: "Parada {0}/{1}", car: "Vagón {0}", first: "Mira bien este vagón: es el vagón de siempre.", back: "Volver atrás", on: "Siguiente vagón", right: "¡Bien!", wrong: "Mal: vuelta a la primera parada", changed: "Esto había cambiado",
    win: "¡Llegaste! Al final no llegas tarde", lose: "Se acabaron los vagones", result: "{0} decisiones erróneas", again: "Reintentar", next: "Siguiente nivel",
    help: "El tren de la mañana no va bien: pasas al siguiente vagón y es el mismo otra vez. En el primer vagón fíjate bien en los pasajeros, carteles, asideros, reloj y ventanas. Luego, en cada vagón, toca Volver atrás si algo ha cambiado o Siguiente vagón si no. Cada acierto te acerca una parada; un solo fallo y vuelves a contar desde la primera. Encadena los aciertos que pide el nivel antes de que se acaben los vagones. Las cosas pueden desaparecer, aparecer dos veces o cambiar de color, tamaño, sentido o sitio. (Teclado: flecha izquierda para volver, derecha para seguir.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:odd-commute:muted";
const W = 360;
const H = 560;
const CAR_TOP = 120;

/** Draws one thing of the car (shared look with the Unity build's sprites). */
function drawThing(ctx: CanvasRenderingContext2D, t: Thing, y0: number): void {
  const x = t.x - t.w / 2;
  const y = y0 + t.y;
  const col = PALETTE[t.colour];
  const s = t.flip ? -1 : 1;
  ctx.save();
  if (t.kind === "window") {
    ctx.fillStyle = "#adb5bd";
    ctx.fillRect(x - 3, y - 3, t.w + 6, t.h + 6);
    ctx.fillStyle = "#1c2a4a";
    ctx.fillRect(x, y, t.w, t.h);
    ctx.fillStyle = col;
    for (let k = 0; k < 3 + t.look; k++) ctx.fillRect(x + 6 + ((k * 17) % (t.w - 10)), y + t.h - 10 - ((k * 7) % 14), 6, 8);
  } else if (t.kind === "poster") {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, t.w, t.h);
    ctx.fillStyle = "#fff";
    const sx = t.flip ? x + t.w - 14 : x + 4;
    ctx.fillRect(sx, y + 4, 10, t.h - 8);
    ctx.fillRect(x + 4, y + t.h - 7, t.w - 8, 3);
  } else if (t.kind === "strap") {
    ctx.fillStyle = "#868e96";
    ctx.fillRect(t.x - 1, y, 2, t.h - 10);
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, y + t.h - 5, t.w / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (t.kind === "passenger") {
    // body, head, arm; facing left or right; reading, on the phone or just standing
    ctx.fillStyle = col;
    ctx.fillRect(x + 6, y + 18, t.w - 12, t.h * 0.5);
    ctx.fillStyle = "#343a40";
    ctx.fillRect(x + 8, y + 18 + t.h * 0.5, 7, t.h * 0.32);
    ctx.fillRect(x + t.w - 15, y + 18 + t.h * 0.5, 7, t.h * 0.32);
    ctx.fillStyle = "#f3c9a0";
    ctx.fillRect(x + t.w / 2 - 8, y, 16, 16);
    ctx.fillStyle = "#212529";
    ctx.fillRect(x + t.w / 2 - 8, y, 16, 5);
    ctx.fillRect(x + t.w / 2 + 3 * s - 1, y + 7, 2, 2);
    if (t.look === 1) {
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(x + t.w / 2 + 6 * s - (s < 0 ? 12 : 0), y + 26, 12, 14);
    } else if (t.look === 2) {
      ctx.fillStyle = "#212529";
      ctx.fillRect(x + t.w / 2 + 8 * s - 2, y + 8, 4, 8);
    }
  } else if (t.kind === "bag") {
    ctx.fillStyle = col;
    ctx.fillRect(x, y + 6, t.w, t.h - 6);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + t.w / 2 - 5, y, 10, 8);
  } else if (t.kind === "light") {
    ctx.fillStyle = "#fff3bf";
    ctx.fillRect(x, y, t.w, t.h);
    ctx.fillStyle = col;
    ctx.fillRect(x, y + t.h, t.w, 2);
  } else if (t.kind === "clock") {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(t.x, y + t.h / 2, t.w / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(t.x, y + t.h / 2, t.w / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#212529";
    ctx.lineWidth = 2;
    const a = (-Math.PI / 2 + (t.look + 1) * 1.3) * s;
    ctx.beginPath();
    ctx.moveTo(t.x, y + t.h / 2);
    ctx.lineTo(t.x + Math.cos(a) * (t.w / 2 - 3) * s, y + t.h / 2 + Math.sin(a) * (t.w / 2 - 3));
    ctx.moveTo(t.x, y + t.h / 2);
    ctx.lineTo(t.x, y + 3);
    ctx.stroke();
  } else if (t.kind === "sign") {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, t.w, t.h);
    ctx.fillStyle = "#fff";
    const ax = t.flip ? x + 6 : x + t.w - 6;
    ctx.beginPath();
    ctx.moveTo(ax, y + t.h / 2);
    ctx.lineTo(ax - 8 * s, y + 3);
    ctx.lineTo(ax - 8 * s, y + t.h - 3);
    ctx.fill();
  }
  ctx.restore();
}

interface Pop { text: string; t: number; color: string }

export default function OddCommute({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; wrong: number }>(null);
  const [hud, setHud] = useState({ car: 0, streak: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rRef = useRef<Ride>(newRide(COMMUTE_STAGES[0]));
  const calls = useRef<Array<"back" | "on">>([]);
  const slide = useRef(0);
  const reveal = useRef<{ x: number; y: number; w: number; h: number; t: number } | null>(null);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = COMMUTE_STAGES[stage];

  useRunRecord(COMMUTE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    rRef.current = newRide(COMMUTE_STAGES[s]);
    calls.current = [];
    slide.current = 0;
    reveal.current = null;
    pops.current = [];
    setHud({ car: 0, streak: 0 });
    setOver(null);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(COMMUTE_SLUG, STAGE_COUNT);
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
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
        ev.preventDefault();
        calls.current.push(ev.key === "ArrowLeft" ? "back" : "on");
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
      const r = rRef.current;
      const s = r.stage;
      const cp = copyRef.current;
      // calls are read once per frame, one at a time while the car slides in
      if (slide.current <= 0) {
        const call = calls.current.shift();
        calls.current = [];
        if (call && !r.over) {
          const a = current(r);
          const right = decide(r, call);
          if (a && a.change !== "gone") {
            const t = carWith(s, a)[a.change === "extra" ? s.car.length : a.thing];
            reveal.current = { x: t.x - t.w / 2 - 4, y: CAR_TOP + t.y - 4, w: t.w + 8, h: t.h + 8, t: 1.2 };
          } else if (a) {
            const t = s.car[a.thing];
            reveal.current = { x: t.x - t.w / 2 - 4, y: CAR_TOP + t.y - 4, w: t.w + 8, h: t.h + 8, t: 1.2 };
          }
          pops.current = [{ text: right ? cp.right : cp.wrong, t: 1.1, color: right ? "#2f9e44" : "#e03131" }];
          sfx(right ? "success" : "fail");
          slide.current = 1;
          setHud({ car: r.car, streak: r.streak });
          if (r.over) {
            setOver({ won: r.won, stars: starsFor(r), wrong: r.wrong });
            if (r.won) {
              setCleared(markStageCleared(COMMUTE_SLUG, s.stage, STAGE_COUNT));
              sfx("win");
            } else sfx("lose");
          }
        }
      }
      slide.current = Math.max(0, slide.current - dt * 2.5);
      if (reveal.current) reveal.current.t -= dt;
      if (reveal.current && reveal.current.t <= 0) reveal.current = null;
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#212529";
        ctx.fillRect(0, 0, W, H);
        // the car: wall, seats, floor and the doors at each end
        const off = slide.current * W * 0.25;
        ctx.save();
        ctx.translate(-off, 0);
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(0, CAR_TOP, W, 300);
        ctx.fillStyle = "#ced4da";
        ctx.fillRect(0, CAR_TOP, W, 8);
        ctx.fillStyle = "#4dabf7";
        ctx.fillRect(0, CAR_TOP + 200, W, 34);
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(0, CAR_TOP + 250, W, 50);
        ctx.fillStyle = "#868e96";
        ctx.fillRect(0, CAR_TOP + 20, 14, 230);
        ctx.fillRect(W - 14, CAR_TOP + 20, 14, 230);
        // the first car of a ride is shown as it is; after a call the next car slides in
        const shown = r.over ? carWith(s, null) : carWith(s, current(r));
        for (const t of shown) drawThing(ctx, t, CAR_TOP);
        ctx.restore();
        if (reveal.current) {
          ctx.strokeStyle = "#ffd43b";
          ctx.lineWidth = 3;
          const rv = reveal.current;
          ctx.strokeRect(rv.x, rv.y, rv.w, rv.h);
          ctx.fillStyle = "#ffd43b";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(cp.changed, Math.max(50, Math.min(W - 50, rv.x + rv.w / 2)), Math.max(CAR_TOP - 6, rv.y - 6));
        }
        // stops along the line: lit up to the streak
        ctx.textAlign = "left";
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#f8f9fa";
        ctx.fillText(fill(cp.stop, r.streak, s.need), 12, 30);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.car, Math.min(r.car + 1, s.cars.length)) + ` / ${s.cars.length}`, W - 12, 30);
        for (let k = 0; k < s.need; k++) {
          ctx.fillStyle = k < r.streak ? "#40c057" : "rgba(255,255,255,0.2)";
          ctx.beginPath();
          ctx.arc(24 + (k * (W - 48)) / Math.max(1, s.need - 1), 60, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(24, 59, W - 48, 2);
        ctx.textAlign = "center";
        if (r.car === 0 && !r.over) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#ffd43b";
          ctx.fillText(cp.first, W / 2, 96);
        }
        for (const pp of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 470);
        }
        // the two doors as tap areas: back on the left, on to the next car on the right
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#e8590c";
        ctx.fillRect(10, 500, 160, 50);
        ctx.fillStyle = "#1971c2";
        ctx.fillRect(W - 170, 500, 160, 50);
        ctx.fillStyle = "#fff";
        ctx.fillText(`< ${cp.back}`, 90, 530);
        ctx.fillText(`${cp.on} >`, W - 90, 530);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    if (y < 490) return;
    calls.current.push(x < W / 2 ? "back" : "on");
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
      data-game="odd-commute"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.stop, hud.streak, st.need)}</Badge>
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
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.wrong)}</p>
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
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="min-h-12" disabled={Boolean(over)} onClick={() => calls.current.push("back")}>
          <ArrowLeft className="size-4" />
          <span>{c.back}</span>
        </Button>
        <Button className="min-h-12" disabled={Boolean(over)} onClick={() => calls.current.push("on")}>
          <span>{c.on}</span>
          <ArrowRight className="size-4" />
        </Button>
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
