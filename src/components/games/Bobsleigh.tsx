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
import { BOB_SLUG, BOB_TRACKS, SKID_TOL, STAGE_COUNT, lineAt, newSled, starsFor, stepSled, type Sled } from "../../lib/games/bobsleigh";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; time: string; rival: string; speed: string; start: string; win: string; lose: string; flipped: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; skid: string; ahead: string;
}> = {
  ko: {
    stage: "{0}단계", time: "{0}초", rival: "상대 {0}초", speed: "{0} km/h", start: "곡선에서 꾹 눌러 벽을 타고, 초록 띠에 맞춰요!", win: "상대보다 빨리 내려왔어요!", lose: "상대가 더 빨랐어요", flipped: "썰매가 뒤집혔어요!", result: "{0}초 · 상대 {1}초",
    again: "다시 타기", next: "다음 단계", skid: "끼익! 미끄러져요", ahead: "앞쪽 곡선",
    help: "얼음 트랙을 내려가는 봅슬레이예요. 썰매는 저절로 내려가요. 곡선에서는 바깥 벽을 타고 올라가야 하는데, 알맞은 높이(초록 띠)는 속도가 빠르고 곡선이 급할수록 높아요. 화면을 누르고 있으면 벽을 타고 올라가고, 떼면 내려와요. 초록 띠보다 많이 낮으면 날이 미끄러져 속도를 잃고, 빨간 선보다 높이 올라가면 썰매가 뒤집혀요. 위쪽 그래프로 다가오는 곡선을 미리 보고 준비하세요. 상대 기록보다 빨리 결승선을 지나면 통과예요. 키보드는 스페이스.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", time: "{0}s", rival: "Rival {0}s", speed: "{0} km/h", start: "Hold to ride up the wall in the bends and stay in the green band!", win: "You beat the rival!", lose: "The rival was faster", flipped: "The sled flipped!", result: "{0}s · rival {1}s",
    again: "Ride again", next: "Next stage", skid: "Skid!", ahead: "Bends ahead",
    help: "Bobsleigh down an ice chute. The sled runs by itself. In the bends it must ride up the outer wall, and the right height (the green band) is higher the faster you go and the tighter the bend. Hold the screen to climb the wall and let go to drop back down. Far below the band the runners skid and you lose speed; above the red line the sled flips. Watch the graph at the top to see the bends coming. Cross the line before the rival's time. Keyboard: Space.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", time: "{0}秒", rival: "ライバル {0}秒", speed: "{0} km/h", start: "カーブでは長押しで壁を上り、緑の帯に合わせよう！", win: "ライバルより速く滑り降りた！", lose: "ライバルのほうが速かった", flipped: "そりがひっくり返った！", result: "{0}秒 · ライバル {1}秒",
    again: "もう一度", next: "次の面", skid: "ズズッ！ 横すべり", ahead: "この先のカーブ",
    help: "氷のコースを滑り降りるボブスレー。そりは自動で進みます。カーブでは外側の壁を上る必要があり、ちょうどいい高さ(緑の帯)は速いほど、カーブがきついほど高くなります。画面を押していると壁を上り、離すと下ります。緑の帯よりかなり低いとランナーが横すべりして減速し、赤い線より高く上るとそりがひっくり返ります。上のグラフで近づくカーブを先読みしましょう。ライバルのタイムより速くゴールすればクリア。キーボードはスペース。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", time: "{0}秒", rival: "对手 {0}秒", speed: "{0} km/h", start: "弯道里按住爬上墙壁，保持在绿色区间！", win: "比对手先滑到终点！", lose: "对手更快", flipped: "雪车翻了！", result: "{0}秒 · 对手 {1}秒",
    again: "再滑一次", next: "下一关", skid: "吱！打滑了", ahead: "前方弯道",
    help: "沿冰道滑下的雪车。雪车会自动前进。在弯道里要爬上外侧墙壁，合适的高度（绿色区间）随速度越快、弯道越急而越高。按住屏幕就沿墙往上爬，松开就往下落。比绿色区间低太多，滑刃会打滑掉速；高过红线，雪车就会翻倒。看上方的图提前准备即将到来的弯道。在对手成绩之前冲过终点就过关。键盘用空格。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", time: "{0} s", rival: "Rival {0} s", speed: "{0} km/h", start: "Maintenez pour monter le mur dans les virages et restez dans la bande verte !", win: "Vous battez le rival !", lose: "Le rival était plus rapide", flipped: "Le bob s'est retourné !", result: "{0} s · rival {1} s",
    again: "Redescendre", next: "Niveau suivant", skid: "Ça dérape !", ahead: "Virages à venir",
    help: "Du bobsleigh dans un couloir de glace. Le bob descend tout seul. Dans les virages, il doit monter sur le mur extérieur, et la bonne hauteur (la bande verte) est d'autant plus haute que vous allez vite et que le virage est serré. Maintenez l'écran pour monter le mur, lâchez pour redescendre. Bien en dessous de la bande, les patins dérapent et vous perdez de la vitesse ; au-dessus de la ligne rouge, le bob se retourne. Le graphique en haut montre les virages à venir. Franchissez la ligne avant le temps du rival. Clavier : Espace.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", time: "{0} s", rival: "Rival {0} s", speed: "{0} km/h", start: "¡Mantén para subir por la pared en las curvas y quédate en la franja verde!", win: "¡Le ganaste al rival!", lose: "El rival fue más rápido", flipped: "¡El trineo volcó!", result: "{0} s · rival {1} s",
    again: "Bajar otra vez", next: "Siguiente nivel", skid: "¡Derrape!", ahead: "Curvas por delante",
    help: "Bobsleigh por un canal de hielo. El trineo baja solo. En las curvas debe subir por la pared exterior, y la altura justa (la franja verde) es mayor cuanto más rápido vas y más cerrada es la curva. Mantén la pantalla para subir por la pared y suelta para bajar. Muy por debajo de la franja, los patines derrapan y pierdes velocidad; por encima de la línea roja, el trineo vuelca. Mira el gráfico de arriba para ver las curvas que vienen. Cruza la meta antes que el tiempo del rival. Teclado: Espacio.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:bobsleigh:muted";
const W = 360;
const H = 560;
const CX = 180;
const CY = 300;
const R = 140;
const MAX_ANG = (100 * Math.PI) / 180; // the top of the wall, from the bottom of the chute

const SLED: PixelArt = {
  palette: { k: "#212529", r: "#e03131", y: "#fab005", w: "#f8f9fa", g: "#868e96" },
  rows: ["..kk.kk.", ".kyykyyk", "rrrrrrrr", "rwwrrwwr", "rrrrrrrr", ".gggggg.", "g......g"],
};

/** A point on the chute wall for wall height h (0 bottom .. 1 top), on the outer (right) side. */
function wallPoint(h: number, r = R): { x: number; y: number; a: number } {
  const a = h * MAX_ANG;
  return { x: CX + r * Math.sin(a), y: CY + r * Math.cos(a), a };
}

interface Pop { text: string; t: number; color: string }

export default function Bobsleigh({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; flipped: boolean; stars: number; time: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Sled>(newSled(BOB_TRACKS[0]));
  const started = useRef(false);
  const input = useRef<Array<"down" | "up">>([]);
  const skidT = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const tr = BOB_TRACKS[stage];

  useRunRecord(BOB_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    sRef.current = newSled(BOB_TRACKS[s]);
    started.current = false;
    input.current = [];
    skidT.current = 0;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(BOB_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let scroll = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const sl = sRef.current;
      const cp = copyRef.current;
      // the button is read once per frame
      for (const e of input.current.splice(0)) {
        if (e === "down") started.current = true;
        sl.holding = e === "down";
      }
      if (started.current && !sl.over) {
        const before = sl.skidT;
        const ev = stepSled(sl, dt);
        if (sl.skidT > before && (skidT.current -= dt) <= 0) {
          skidT.current = 0.5;
          pops.current.push({ text: cp.skid, t: 0.5, color: "#e8590c" });
          const p = wallPoint(sl.h);
          spawnBurst(parts.current, p.x, p.y, ["#ffffff", "#d0ebff"], 6, 60, Math.floor(sl.t * 1000));
          haptics.current?.fire("tap");
        }
        if (ev) {
          if (ev === "flip") {
            const p = wallPoint(sl.h);
            spawnBurst(parts.current, p.x, p.y, ["#e03131", "#ffffff", "#fab005"], 26, 160, Math.floor(sl.t * 1000));
          }
          setOver({ won: sl.won, flipped: sl.flipped, stars: starsFor(sl), time: sl.finish });
          if (sl.won) {
            setCleared(markStageCleared(BOB_SLUG, sl.track.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      scroll += sl.v * dt;
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#1c2541";
        ctx.fillRect(0, 0, W, H);
        // preview: the ideal line over the next 160 m at the current speed
        const px = 20;
        const pw = W - 40;
        const py = 100;
        const ph = 70;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(px, py - ph, pw, ph);
        ctx.strokeStyle = "#69db7c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) {
          const ds = (k / 40) * 160;
          const ln = lineAt(sl.track, sl.s + ds, sl.v);
          const x = px + (k / 40) * pw;
          const y = py - ln * ph;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = "#fab005";
        ctx.fillRect(px - 3, py - sl.h * ph - 3, 6, 6);
        ctx.fillStyle = "#adb5bd";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(cp.ahead, px, py - ph - 6);
        // the chute in cross-section: ice, the green band and the red flip line
        ctx.strokeStyle = "#dbe4ff";
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.arc(CX, CY, R, Math.PI / 2 - MAX_ANG, Math.PI / 2 + MAX_ANG);
        ctx.stroke();
        for (let k = 0; k < 12; k++) {
          const a = ((k / 12 + (scroll * 0.02) % (1 / 12)) * 2 - 1) * MAX_ANG;
          ctx.fillStyle = "rgba(165,216,255,0.6)";
          ctx.fillRect(CX + (R - 6) * Math.sin(a) - 2, CY + (R - 6) * Math.cos(a) - 2, 4, 4);
        }
        const ln = lineAt(sl.track, sl.s, sl.v);
        const lo = Math.max(0, ln - SKID_TOL);
        const hi = Math.min(1, ln + sl.track.flip * 0.5);
        ctx.strokeStyle = "rgba(64,192,87,0.85)";
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(CX, CY, R, Math.PI / 2 - hi * MAX_ANG, Math.PI / 2 - lo * MAX_ANG);
        ctx.stroke();
        const fl = Math.min(1, ln + sl.track.flip);
        const fp = wallPoint(fl, R + 22);
        const fq = wallPoint(fl, R - 22);
        ctx.strokeStyle = "#e03131";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fp.x, fp.y);
        ctx.lineTo(fq.x, fq.y);
        ctx.stroke();
        // the sled on the wall
        const sp = wallPoint(sl.h, R - 18);
        drawSprite(ctx, SLED, sp.x, sp.y, { scale: 4, rotate: -sp.a });
        drawParticles(ctx, parts.current);
        // HUD
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(fill(cp.time, sl.t.toFixed(1)), CX, CY + 10);
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#ced4da";
        ctx.fillText(fill(cp.speed, Math.round(sl.v * 3.6)), CX, CY + 34);
        ctx.fillText(fill(cp.rival, sl.track.goal.toFixed(2)), CX, CY + 56);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(20, H - 30, W - 40, 8);
        ctx.fillStyle = "#4dabf7";
        ctx.fillRect(20, H - 30, ((W - 40) * Math.min(sl.s, sl.track.length)) / sl.track.length, 8);
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          const w = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(CX - w / 2, CY - 70 - 22, w, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, CX, CY - 70);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const down = useCallback(() => {
    if (sRef.current.over) return;
    setTouched(true);
    input.current.push("down");
  }, []);
  const up = useCallback(() => {
    input.current.push("up");
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat) return;
      e.preventDefault();
      down();
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      e.preventDefault();
      up();
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [down, up]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="bobsleigh"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.rival, tr.goal.toFixed(2))}</Badge>
        <Badge variant="outline">{tr.length}m</Badge>
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
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); down(); }}
          onPointerUp={up}
          onPointerCancel={up}
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
            <p className="text-lg font-bold">{over.won ? c.win : over.flipped ? c.flipped : c.lose}</p>
            {!over.flipped ? <p className="text-sm text-muted-foreground">{fill(c.result, over.time.toFixed(2), tr.goal.toFixed(2))}</p> : null}
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
