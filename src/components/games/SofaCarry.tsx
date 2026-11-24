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
import { FIELD_H, FIELD_W, SOFA_SLUG, SOFA_STAGES, STAGE_COUNT, newCarry, starsFor, stepCarry, type Carry, type Pt } from "../../lib/games/sofa-carry";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; time: string; scrapes: string; start: string; scrape: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", time: "{0}초", scrapes: "긁힘 {0}", start: "소파 양 끝을 하나씩 잡고 끌어요. 둘이서 한 끝씩!", scrape: "끽! 벽에 긁혔어요", win: "트럭에 실었어요! 이사 끝", lose: "트럭이 떠났어요", result: "{0}초 · 긁힘 {1}번",
    again: "다시 하기", next: "다음 단계",
    help: "이삿날이에요. 친구와 둘이 긴 소파를 들고 낡은 건물 복도를 지나 트럭까지 옮겨요. 한 휴대폰으로 둘이 함께 해요. 소파의 양 끝(초록·주황)을 한 사람이 하나씩 손가락으로 잡고 끌어요. 혼자라면 두 엄지로 해도 돼요. 소파는 길이가 변하지 않아서 한쪽을 끌면 다른 쪽도 딸려 와요. 복도는 소파보다 좁아서 길게 세워야만 지나가고, 방향은 모퉁이 계단참에서만 돌릴 수 있어요. 벽에 닿으면 끽 소리와 함께 멈춰요. 트럭이 떠나기 전에 실으면 통과예요. (키보드: WASD로 초록 끝, 방향키로 주황 끝)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", time: "{0}s", scrapes: "Scrapes {0}", start: "Grab one end of the sofa each and drag. One end per player!", scrape: "Screech! A wall", win: "In the van! Move done", lose: "The van left", result: "{0}s · {1} scrapes",
    again: "Try again", next: "Next stage",
    help: "Moving day. You and a friend carry a long sofa down the halls of an old building to the van, together on one phone. Each of you holds one end of the sofa (green and orange) with a finger and drags it; on your own, use both thumbs. The sofa never changes length, so pulling one end drags the other along. The halls are narrower than the sofa is long: it only fits lengthwise, and you can only turn it on the landings at the corners. Touch a wall and it screeches to a stop. Get it into the van before the van leaves. (Keyboard: WASD for the green end, arrow keys for the orange end.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", time: "{0}秒", scrapes: "こすり {0}", start: "ソファの両端を1人ずつ持って引こう。2人で片方ずつ！", scrape: "キーッ！壁にこすった", win: "トラックに積んだ！引っ越し完了", lose: "トラックが行ってしまった", result: "{0}秒・こすり {1}回",
    again: "もう一度", next: "次の面",
    help: "引っ越しの日。友だちと2人で長いソファを持ち、古い建物の廊下を通ってトラックまで運びます。1台のスマホで2人一緒に遊べます。ソファの両端（緑・オレンジ）を1人ずつ指で持って引きます。1人なら両手の親指でも大丈夫。ソファの長さは変わらないので、片方を引くともう片方もついてきます。廊下はソファより狭いので縦にしか通れず、向きを変えられるのは角の踊り場だけ。壁に当たるとキーッと止まります。トラックが出る前に積めばクリア。（キーボード：WASDで緑の端、矢印キーでオレンジの端）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", time: "{0}秒", scrapes: "刮蹭 {0}", start: "两人各抓沙发的一头拖动。一人一头！", scrape: "吱！蹭到墙了", win: "装上车了！搬家完成", lose: "货车开走了", result: "{0}秒 · 刮蹭 {1}次",
    again: "再来一次", next: "下一关",
    help: "搬家这天，你和朋友抬着长沙发穿过老楼的走廊，搬到货车上。一部手机两个人一起玩。两人各用一根手指抓住沙发的一头（绿色、橙色）拖动；一个人玩就用两个拇指。沙发长度不变，拉一头另一头也会跟过来。走廊比沙发窄，只能竖着通过，只有在拐角的楼梯平台上才能转向。碰到墙会“吱”地停住。在货车开走前装上车就过关。（键盘：WASD控制绿色一头，方向键控制橙色一头）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", time: "{0} s", scrapes: "Éraflures {0}", start: "Prenez chacun un bout du canapé et tirez. Un bout par joueur !", scrape: "Crrr ! Le mur", win: "Dans le camion ! Déménagement fini", lose: "Le camion est parti", result: "{0} s · {1} éraflures",
    again: "Réessayer", next: "Niveau suivant",
    help: "Jour de déménagement. Vous et un ami portez un long canapé dans les couloirs d'un vieil immeuble jusqu'au camion, à deux sur un seul téléphone. Chacun tient un bout du canapé (vert et orange) du doigt et le tire ; seul, utilisez vos deux pouces. Le canapé ne change jamais de longueur : tirer un bout entraîne l'autre. Les couloirs sont plus étroits que le canapé n'est long : il ne passe que dans le sens de la longueur et ne se tourne que sur les paliers des angles. Touchez un mur et il s'arrête net en crissant. Chargez-le avant que le camion ne parte. (Clavier : ZQSD/WASD pour le bout vert, flèches pour le bout orange.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", time: "{0} s", scrapes: "Roces {0}", start: "Agarrad cada uno un extremo del sofá y arrastrad. ¡Un extremo por jugador!", scrape: "¡Chirrido! La pared", win: "¡En la furgoneta! Mudanza hecha", lose: "La furgoneta se fue", result: "{0} s · {1} roces",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Día de mudanza. Tú y un amigo lleváis un sofá largo por los pasillos de un edificio viejo hasta la furgoneta, los dos en un solo móvil. Cada uno sujeta un extremo del sofá (verde y naranja) con un dedo y lo arrastra; si juegas solo, usa los dos pulgares. El sofá nunca cambia de largo, así que tirar de un extremo arrastra el otro. Los pasillos son más estrechos que el sofá: solo pasa a lo largo, y solo se gira en los descansillos de las esquinas. Si toca una pared, se para en seco con un chirrido. Mételo en la furgoneta antes de que se vaya. (Teclado: WASD para el extremo verde, flechas para el naranja.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:sofa-carry:muted";
const W = FIELD_W;
const H = FIELD_H;
const VAN: PixelArt = { palette: { w: "#f8f9fa", b: "#1971c2", k: "#212529", g: "#adb5bd" }, rows: ["bbbbbbbb..", "bwwwwwwbb.", "bwwwwwwbgb", "bbbbbbbbbb", ".kk....kk."] };

interface Pop { text: string; t: number }
interface Grip { id: number; end: "a" | "b"; at: Pt }

export default function SofaCarry({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; t: number; scrapes: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cRef = useRef<Carry>(newCarry(SOFA_STAGES[0]));
  const grips = useRef<Grip[]>([]);
  const keys = useRef(new Set<string>());
  const started = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = SOFA_STAGES[stage];

  useRunRecord(SOFA_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    cRef.current = newCarry(SOFA_STAGES[s]);
    grips.current = [];
    started.current = false;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(SOFA_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const k = keys.current;
    const watched = new Set(["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    const down = (ev: KeyboardEvent) => {
      const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
      if (!watched.has(key)) return;
      ev.preventDefault();
      k.add(key);
      setTouched(true);
    };
    const up = (ev: KeyboardEvent) => k.delete(ev.key.length === 1 ? ev.key.toLowerCase() : ev.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      k.clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const cr = cRef.current;
      const s = cr.stage;
      const cp = copyRef.current;
      // hands are read once per frame: a held finger pulls its end toward itself; keys nudge an end along
      const k = keys.current;
      const keyHand = (p: Pt, up: string, left: string, down: string, right: string): Pt | null => {
        const dx = (k.has(right) ? 1 : 0) - (k.has(left) ? 1 : 0);
        const dy = (k.has(down) ? 1 : 0) - (k.has(up) ? 1 : 0);
        return dx || dy ? { x: p.x + dx * 30, y: p.y + dy * 30 } : null;
      };
      let ha = keyHand(cr.a, "w", "a", "s", "d");
      let hb = keyHand(cr.b, "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight");
      for (const g of grips.current) {
        if (g.end === "a") ha = g.at;
        else hb = g.at;
      }
      if (ha || hb) started.current = true;
      if (started.current && !cr.over) {
        const ev = stepCarry(cr, ha, hb, dt);
        if (ev.scrape) {
          pops.current = [{ text: cp.scrape, t: 0.8 }];
          const m = { x: (cr.a.x + cr.b.x) / 2, y: (cr.a.y + cr.b.y) / 2 };
          spawnBurst(parts.current, m.x, m.y, ["#ced4da", "#868e96"], 6, 60, 2);
          sfx("fail");
        }
        if (ev.end) {
          setOver({ won: cr.won, stars: starsFor(cr), t: Math.round(cr.t), scrapes: cr.scrapes });
          if (cr.won) {
            setCleared(markStageCleared(SOFA_SLUG, s.stage, STAGE_COUNT));
            const end = s.path[s.path.length - 1];
            spawnBurst(parts.current, end.x, end.y, ["#ffd43b", "#40c057", "#fff"], 24, 120, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 40);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the building: dark walls, the hall floor and the landings
        ctx.fillStyle = "#5c4033";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#d8c3a5";
        for (const b of cr.boxes) ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        ctx.fillStyle = "rgba(92,64,51,0.25)";
        for (const b of cr.boxes) for (let y = b.y0; y < b.y1; y += 12) ctx.fillRect(b.x0, y, b.x1 - b.x0, 1);
        const end = s.path[s.path.length - 1];
        drawSprite(ctx, VAN, end.x, end.y - 40, { scale: 5 });
        ctx.fillStyle = "rgba(64,192,87,0.35)";
        ctx.fillRect(end.x - 14, end.y - 14, 28, 28);
        // the sofa: a thick bar with arms and cushions, the two ends in the players' colours
        const ang = Math.atan2(cr.b.y - cr.a.y, cr.b.x - cr.a.x);
        const m = { x: (cr.a.x + cr.b.x) / 2, y: (cr.a.y + cr.b.y) / 2 };
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(ang);
        ctx.fillStyle = "#9c36b5";
        ctx.fillRect(-s.length / 2, -s.thick / 2, s.length, s.thick);
        ctx.fillStyle = "#cc5de8";
        const cushions = 3;
        for (let q = 0; q < cushions; q++) ctx.fillRect(-s.length / 2 + 8 + (q * (s.length - 16)) / cushions + 1, -s.thick / 2 + 4, (s.length - 16) / cushions - 2, s.thick - 10);
        ctx.fillStyle = "#2f9e44";
        ctx.fillRect(-s.length / 2, -s.thick / 2, 8, s.thick);
        ctx.fillStyle = "#f76707";
        ctx.fillRect(s.length / 2 - 8, -s.thick / 2, 8, s.thick);
        ctx.restore();
        for (const g of grips.current) {
          ctx.strokeStyle = g.end === "a" ? "#2f9e44" : "#f76707";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(g.at.x, g.at.y, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawParticles(ctx, parts.current);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, 34);
        ctx.textAlign = "left";
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#f8f9fa";
        ctx.fillText(fill(cp.scrapes, cr.scrapes), 12, 23);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.max(0, Math.ceil(s.time - cr.t))), W - 12, 23);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 16px sans-serif";
          const tw = ctx.measureText(pp.text).width + 14;
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(W / 2 - tw / 2, 44, tw, 24);
          ctx.fillStyle = "#e03131";
          ctx.fillText(pp.text, W / 2, 61);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cr = cRef.current;
    if (cr.over) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setTouched(true);
    const p = toField(e);
    // a finger takes the nearer end that nobody else is holding
    const held = new Set(grips.current.map((g) => g.end));
    const da = Math.hypot(p.x - cr.a.x, p.y - cr.a.y);
    const db = Math.hypot(p.x - cr.b.x, p.y - cr.b.y);
    let end: "a" | "b" = da <= db ? "a" : "b";
    if (held.has(end)) end = end === "a" ? "b" : "a";
    if (held.has(end)) return;
    grips.current.push({ id: e.pointerId, end, at: p });
    sfx("tap");
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = grips.current.find((q) => q.id === e.pointerId);
    if (g) g.at = toField(e);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    grips.current = grips.current.filter((q) => q.id !== e.pointerId);
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
      data-game="sofa-carry"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.time, st.time)}</Badge>
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
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-16 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.t, over.scrapes)}</p>
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
