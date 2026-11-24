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
import { FREEZE, HARD, HWANGTAE_SLUG, HWANGTAE_STAGES, STAGE_COUNT, THAW, WARM, air, felt, newYard, starsFor, stepYard, toggle, type Yard } from "../../lib/games/hwangtae-dry";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; day: string; start: string; win: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; spoil: string; white: string; short: string; cycle: string; forecast: string; mat: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "덕장마다 {0}번", day: "{0}일째 · 남은 {1}일", start: "덕장을 탭하면 거적을 내리고 올려요. 일기예보를 보세요!", win: "황태가 노랗게 잘 말랐어요!", result: "{0}일 만에 완성",
    spoil: "날이 풀려 생선이 상했어요", white: "강추위에 하얗게 얼어 버렸어요(백태)", short: "겨울이 끝났는데 덜 말랐어요", cycle: "얼었다 녹음 +1", forecast: "앞으로 24시간", mat: "거적",
    again: "다시 하기", next: "다음 단계",
    help: "강원도 산골 덕장에서는 겨우내 명태를 걸어 두고 밤에는 얼리고 낮에는 녹이기를 되풀이해 노랗고 포슬포슬한 황태를 만들어요. 언 생선이 다시 녹을 때마다 한 번으로 세요. 날이 너무 풀리면 생선이 상하고, 강추위가 오면 하얗게 얼어 딱딱한 백태가 돼요. 덕장마다 거적이 있어서, 탭(또는 숫자 키 1~3)하면 내리고 올릴 수 있어요. 거적을 내리면 생선이 덜 춥고 덜 더워지지만 얼었다 녹기도 멈춰요. 아래쪽 일기예보를 보고 궂은 날에는 거적을 내리고 좋은 날에는 올려서, 겨울이 끝나기 전에 모든 덕장의 횟수를 채우면 통과예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "{0} times on every rack", day: "Day {0} · {1} days left", start: "Tap a rack to roll its mat down or up. Watch the forecast!", win: "Golden hwangtae, perfectly dried!", result: "Done in {0} days",
    spoil: "A warm spell spoiled the fish", white: "A hard frost froze them white", short: "Winter ended before they dried", cycle: "Froze and thawed +1", forecast: "Next 24 hours", mat: "Mat",
    again: "Try again", next: "Next stage",
    help: "On the drying racks (deokjang) of Gangwon-do's mountain valleys, pollack hang all winter, frozen by night and thawed by day, again and again, until they turn into fluffy golden hwangtae. Every time a frozen fish thaws again counts once. If the weather turns too mild the fish spoil; if a hard cold snap hits they freeze white and tough. Each rack has a straw mat: tap the rack (or press 1–3) to roll it down or up. Under the mat the fish feel neither as cold nor as warm, but the freezing and thawing stops too. Read the forecast at the bottom: mats down for the bad days, up for the good ones. Reach the count on every rack before winter ends.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "各干し場 {0}回", day: "{0}日目 · 残り {1}日", start: "干し場をタップでむしろを上げ下げ。天気予報を見よう！", win: "黄色くふっくらファンテの完成！", result: "{0}日で完成",
    spoil: "暖かさで魚が傷んだ", white: "厳しい寒さで白く凍った（ペクテ）", short: "冬が終わっても乾ききらなかった", cycle: "凍って解けた +1", forecast: "これから24時間", mat: "むしろ",
    again: "もう一度", next: "次の面",
    help: "江原道の山あいの干し場（トクチャン）では、冬じゅうスケトウダラを吊るし、夜は凍らせ昼は解かすのを繰り返して、黄色くふっくらしたファンテを作ります。凍った魚がまた解けるたびに1回と数えます。暖かすぎると魚が傷み、厳しい寒波が来ると白く硬いペクテになってしまいます。干し場ごとにむしろがあり、タップ（または数字キー1〜3）で下ろしたり上げたりできます。むしろを下ろすと寒さも暑さも和らぎますが、凍って解けるのも止まります。下の天気予報を見て、悪い日は下ろし良い日は上げて、冬が終わる前に全部の干し場の回数をそろえればクリア。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "每个晾架 {0}次", day: "第{0}天 · 还剩 {1}天", start: "点晾架可放下或卷起草帘。看天气预报！", win: "金黄蓬松的黄太鱼晾好了！", result: "用了 {0}天",
    spoil: "天气回暖，鱼坏了", white: "严寒把鱼冻成了白太", short: "冬天结束了还没晾好", cycle: "冻了又化 +1", forecast: "未来24小时", mat: "草帘",
    again: "再来一次", next: "下一关",
    help: "在江原道山谷的晾鱼架（덕장）上，明太鱼整个冬天都挂着，夜里冻住、白天化开，反复多次，最后变成金黄蓬松的黄太鱼。冻住的鱼每化开一次算一次。天气太暖鱼会坏，遇到强寒潮又会冻成又白又硬的“白太”。每个晾架都有草帘，点击晾架（或按数字键1～3）就能放下或卷起。放下草帘，鱼就没那么冷也没那么热，但冻融也会停下来。看下方的天气预报，坏天气放下，好天气卷起，在冬天结束前让每个晾架都达到次数即过关。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "{0} fois sur chaque séchoir", day: "Jour {0} · encore {1} jours", start: "Touchez un séchoir pour baisser ou remonter sa natte. Regardez la météo !", win: "Un hwangtae doré et moelleux !", result: "Fini en {0} jours",
    spoil: "Un redoux a gâté le poisson", white: "Un grand froid l'a figé tout blanc", short: "L'hiver a fini avant le séchage", cycle: "Gelé puis dégelé +1", forecast: "Prochaines 24 h", mat: "Natte",
    again: "Réessayer", next: "Niveau suivant",
    help: "Sur les séchoirs (deokjang) des vallées du Gangwon-do, les lieus pendent tout l'hiver : gelés la nuit, dégelés le jour, encore et encore, jusqu'à devenir un hwangtae doré et moelleux. Chaque fois qu'un poisson gelé dégèle compte pour une fois. S'il fait trop doux, le poisson se gâte ; si un grand froid arrive, il gèle tout blanc et dur. Chaque séchoir a une natte de paille : touchez-le (ou 1 à 3) pour la baisser ou la remonter. Sous la natte, le poisson a moins froid et moins chaud, mais le gel et le dégel s'arrêtent aussi. Lisez la météo en bas : natte baissée les mauvais jours, remontée les bons. Atteignez le compte sur chaque séchoir avant la fin de l'hiver.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "{0} veces en cada secadero", day: "Día {0} · quedan {1} días", start: "Toca un secadero para bajar o subir su estera. ¡Mira el pronóstico!", win: "¡Hwangtae dorado y esponjoso!", result: "Listo en {0} días",
    spoil: "Un tiempo templado estropeó el pescado", white: "Una helada fuerte lo dejó blanco", short: "Acabó el invierno sin secarse", cycle: "Se heló y deshieló +1", forecast: "Próximas 24 h", mat: "Estera",
    again: "Reintentar", next: "Siguiente nivel",
    help: "En los secaderos (deokjang) de los valles de Gangwon-do, los abadejos cuelgan todo el invierno: se hielan de noche y se deshielan de día, una y otra vez, hasta volverse un hwangtae dorado y esponjoso. Cada vez que un pescado helado se deshiela cuenta una vez. Si el tiempo se templa demasiado, el pescado se estropea; si llega una ola de frío fuerte, se hiela blanco y duro. Cada secadero tiene una estera de paja: tócalo (o pulsa 1–3) para bajarla o subirla. Bajo la estera el pescado pasa menos frío y menos calor, pero también deja de helarse y deshielarse. Mira el pronóstico de abajo: estera bajada los días malos, subida los buenos. Completa la cuenta en todos los secaderos antes de que acabe el invierno.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:hwangtae-dry:muted";
const W = 360;
const H = 560;
const RACK_TOP = 150;
const RACK_BOTTOM = 330;

const FISH: PixelArt = { palette: { b: "#ced4da", d: "#868e96", e: "#212529", t: "#adb5bd" }, rows: [".tt.", "bbbb", "bbbb", "bbbb", "bddb", "bbbb", ".bb.", "bbbb", "b..b"] };
const FISH_GOLD: PixelArt = { palette: { b: "#fcc419", d: "#e67700", e: "#212529", t: "#f08c00" }, rows: [".tt.", "bbbb", "bbbb", "bbbb", "bddb", "bbbb", ".bb.", "bbbb", "b..b"] };

interface Pop { text: string; t: number; color: string; x: number; y: number }

const tempColor = (t: number) => (t > WARM ? "#fa5252" : t < HARD ? "#74c0fc" : t < FREEZE ? "#4dabf7" : t > THAW ? "#ffd43b" : "#e9ecef");

export default function HwangtaeDry({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; days: number; fail: Yard["fail"] }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const yRef = useRef<Yard>(newYard(HWANGTAE_STAGES[0]));
  const started = useRef(false);
  const input = useRef<number[]>([]); // racks tapped since the last frame
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = HWANGTAE_STAGES[stage];

  useRunRecord(HWANGTAE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    yRef.current = newYard(HWANGTAE_STAGES[s]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(HWANGTAE_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const n = Number(ev.key);
      const y = yRef.current;
      if (Number.isInteger(n) && n >= 1 && n <= y.covered.length && !y.over) {
        input.current.push(n - 1);
        setTouched(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const y = yRef.current;
      const cp = copyRef.current;
      const n = y.covered.length;
      const rackW = W / n;
      // taps are read once per frame
      for (const r of input.current.splice(0)) {
        started.current = true;
        toggle(y, r);
        sfx("place");
      }
      if (started.current && !y.over) {
        const ev = stepYard(y, dt);
        for (const r of ev.cycled) {
          pops.current.push({ text: cp.cycle, t: 0.9, color: "#e67700", x: (r + 0.5) * rackW, y: RACK_TOP - 14 });
          spawnBurst(parts.current, (r + 0.5) * rackW, RACK_TOP + 60, ["#fcc419", "#ffffff"], 8, 60, Math.floor(y.h * 100) + r);
          sfx("tap");
        }
        if (ev.end) {
          setOver({ won: y.won, stars: starsFor(y), days: Math.ceil(y.h / 24), fail: y.fail });
          if (y.won) {
            setCleared(markStageCleared(HWANGTAE_SLUG, y.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // sky by the hour: night navy, dawn and dusk violet, day pale blue
        const hour = y.h % 24;
        const day = Math.max(0, Math.cos(((hour - 13) / 24) * Math.PI * 2));
        const sky = (a: number, b: number) => Math.round(a + (b - a) * day);
        ctx.fillStyle = `rgb(${sky(18, 165)},${sky(24, 210)},${sky(52, 240)})`;
        ctx.fillRect(0, 0, W, H);
        // the valley
        ctx.fillStyle = "#495057";
        ctx.beginPath();
        ctx.moveTo(0, 150);
        ctx.lineTo(80, 90);
        ctx.lineTo(160, 140);
        ctx.lineTo(250, 80);
        ctx.lineTo(W, 130);
        ctx.lineTo(W, 360);
        ctx.lineTo(0, 360);
        ctx.fill();
        ctx.fillStyle = "#f1f3f5";
        ctx.fillRect(0, 340, W, 30);
        // the racks: poles, a crossbar, rows of fish, and the mat
        for (let r = 0; r < n; r++) {
          const x0 = r * rackW + 10;
          const x1 = (r + 1) * rackW - 10;
          ctx.fillStyle = "#6b4423";
          ctx.fillRect(x0, RACK_TOP - 10, 6, RACK_BOTTOM - RACK_TOP + 40);
          ctx.fillRect(x1 - 6, RACK_TOP - 10, 6, RACK_BOTTOM - RACK_TOP + 40);
          ctx.fillRect(x0, RACK_TOP - 10, x1 - x0, 6);
          ctx.fillRect(x0, RACK_TOP + 80, x1 - x0, 5);
          const gold = Math.min(1, y.cycles[r] / y.stage.need);
          for (let row = 0; row < 2; row++)
            for (let fx = x0 + 18; fx < x1 - 10; fx += 22) drawSprite(ctx, gold > 0.5 ? FISH_GOLD : FISH, fx, RACK_TOP + 30 + row * 90, { scale: 4, alpha: y.white[r] > 0.5 || y.spoil[r] > 0.5 ? 0.6 : 1 });
          if (y.covered[r]) {
            ctx.fillStyle = "rgba(201,162,107,0.92)";
            ctx.fillRect(x0 - 4, RACK_TOP - 12, x1 - x0 + 8, RACK_BOTTOM - RACK_TOP + 20);
            ctx.fillStyle = "rgba(140,105,60,0.8)";
            for (let s = RACK_TOP - 6; s < RACK_BOTTOM; s += 10) ctx.fillRect(x0 - 4, s, x1 - x0 + 8, 2);
          } else {
            ctx.fillStyle = "#c9a26b";
            ctx.fillRect(x0 - 4, RACK_TOP - 22, x1 - x0 + 8, 12);
          }
          // the rack's dial: the fish's temperature, cycles, and how near spoil or white it is
          const by = 384;
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(x0, by, x1 - x0, 66);
          ctx.font = "bold 15px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = tempColor(y.fish[r]);
          ctx.fillText(`${y.fish[r].toFixed(1)}°C ${y.frozen[r] ? "❄" : ""}`, (x0 + x1) / 2, by + 20);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(`${y.cycles[r]}/${y.stage.need}`, (x0 + x1) / 2, by + 40);
          ctx.fillStyle = "#fa5252";
          ctx.fillRect(x0 + 6, by + 50, (x1 - x0 - 12) * Math.min(1, y.spoil[r]) * 0.5, 6);
          ctx.fillStyle = "#74c0fc";
          ctx.fillRect((x0 + x1) / 2, by + 50, (x1 - x0 - 12) * Math.min(1, y.white[r]) * 0.5, 6);
        }
        // the forecast: the open air over the next 24 hours for the most exposed rack, with the danger lines
        const fx0 = 12;
        const fw = W - 24;
        const fy0 = 470;
        const fh = 70;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(fx0 - 4, fy0 - 18, fw + 8, fh + 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(cp.forecast, fx0, fy0 - 5);
        const ty = (t: number) => fy0 + fh - ((Math.max(-26, Math.min(14, t)) + 26) / 40) * fh;
        ctx.fillStyle = "rgba(250,82,82,0.35)";
        ctx.fillRect(fx0, fy0, fw, ty(WARM) - fy0);
        ctx.fillStyle = "rgba(116,192,252,0.35)";
        ctx.fillRect(fx0, ty(HARD), fw, fy0 + fh - ty(HARD));
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(fx0, ty(0), fw, 1);
        const worst = n - 1;
        ctx.strokeStyle = "#ffd43b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k <= 48; k++) {
          const hh = y.h + k * 0.5;
          const t = felt(y.stage, worst, hh, false);
          const px = fx0 + (k / 48) * fw;
          if (k === 0) ctx.moveTo(px, ty(t));
          else ctx.lineTo(px, ty(t));
        }
        ctx.stroke();
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#ffffff";
        const dayNo = Math.floor(y.h / 24) + 1;
        ctx.fillText(fill(cp.day, dayNo, Math.max(0, y.stage.days - dayNo)), 12, 26);
        ctx.font = "14px sans-serif";
        ctx.fillText(`${String(Math.floor(hour)).padStart(2, "0")}:00 · ${air(y.stage, y.h).toFixed(1)}°C`, 12, 46);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 14px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(x - tw / 2, pp.y - 18, tw, 24);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 1);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const failText = (f: Yard["fail"]) => (f === "spoil" ? c.spoil : f === "white" ? c.white : c.short);

  return (
    <div
      ref={containerRef}
      data-game="hwangtae-dry"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.need)}</Badge>
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
          onPointerDown={(ev) => {
            const y = yRef.current;
            if (y.over) return;
            const r = ev.currentTarget.getBoundingClientRect();
            const x = ((ev.clientX - r.left) * W) / r.width;
            setTouched(true);
            input.current.push(Math.max(0, Math.min(y.covered.length - 1, Math.floor(x / (W / y.covered.length)))));
          }}
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
            <p className="text-lg font-bold">{over.won ? c.win : failText(over.fail)}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.days)}</p> : null}
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
