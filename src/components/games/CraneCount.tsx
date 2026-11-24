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
import { CRANE_SLUG, CRANE_STAGES, STAGE_COUNT, allowed, answer, birdAt, currentFlock, newCensus, reds, starsFor, stepCensus, type Census } from "../../lib/games/crane-count";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; flock: string; need: string; watch: string; ask: string; submit: string; start: string; win: string; lose: string; result: string; again: string; next: string;
  right: string; wrong: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", flock: "무리 {0}/{1}", need: "맞힘 {0}/{1}", watch: "두루미가 날아가요. 빨간 머리 두루미만 세요!", ask: "방금 본 두루미는 몇 마리였나요?", submit: "기록하기",
    start: "무리가 하늘을 지나가는 동안 두루미를 세요. 회색 재두루미는 빼고요!", win: "조사 완료! 올겨울 두루미 기록이에요", lose: "기록이 조금 빗나갔어요", result: "{0}무리 중 {1}무리 맞힘 (필요 {2})",
    again: "다시 세기", next: "다음 단계", right: "맞아요! {0}마리", wrong: "{0}마리였어요",
    help: "해마다 겨울이면 강원도 철원 들판에 두루미(단정학)와 재두루미가 내려앉고, 자원봉사자들이 날아가는 무리를 세어 개체 수를 기록해요. 무리가 몇 초 동안 하늘을 가로질러 지나가요. 두루미는 가족끼리 2~5마리씩 무리 지어 날아서, 한 마리씩 세기보다 작은 무리 단위로 묶어 세면 빨라요. 다 지나가면 아래 버튼으로 숫자를 맞추고 '기록하기'를 눌러요. 머리에 빨간 점이 있는 흰 두루미만 세고, 목에 흰 줄이 있는 회색 재두루미는 빼야 해요. 오차 범위 안에 든 무리가 목표 수만큼 되면 통과예요. (키보드: 위·아래 방향키 ±1, 왼쪽·오른쪽 ±5, Enter 기록)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", flock: "Flock {0}/{1}", need: "Right {0}/{1}", watch: "Cranes overhead. Count only the red-crowned ones!", ask: "How many cranes were in that flock?", submit: "Record",
    start: "Count the cranes while the flock crosses the sky. Leave out the grey white-naped cranes!", win: "Census done! This winter's crane count", lose: "The count was a little off", result: "{1} of {0} flocks right (need {2})",
    again: "Count again", next: "Next stage", right: "Right! {0} cranes", wrong: "It was {0}",
    help: "Every winter, red-crowned and white-naped cranes come down to the fields around Cheorwon in Gangwon Province, and volunteers count the flocks as they fly over to record how many there are. A flock crosses the sky for a few seconds. Cranes fly in family groups of two to five, so counting little groups is quicker than counting bird by bird. When the flock has gone, set the number with the buttons below and tap Record. Count only the white cranes with a red crown, not the grey white-naped cranes with a white stripe down the neck. Get enough flocks within the margin to clear the stage. (Keyboard: up/down ±1, left/right ±5, Enter to record.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", flock: "群れ {0}/{1}", need: "正解 {0}/{1}", watch: "ツルが飛んでいく。タンチョウだけ数えよう！", ask: "今の群れにタンチョウは何羽？", submit: "記録する",
    start: "群れが空を横切る間にツルを数えよう。灰色のマナヅルは数えない！", win: "調査完了！今冬のツルの記録です", lose: "記録が少しずれました", result: "{0}群れ中 {1}群れ正解（必要 {2}）",
    again: "もう一度", next: "次の面", right: "正解！{0}羽", wrong: "{0}羽でした",
    help: "毎年冬になると、韓国江原道・鉄原の野にタンチョウとマナヅルが降り立ち、ボランティアが飛ぶ群れを数えて個体数を記録します。群れは数秒で空を横切ります。ツルは2〜5羽の家族単位で飛ぶので、1羽ずつより小さな群れごとに数える方が速いです。通り過ぎたら下のボタンで数を合わせて「記録する」を押します。頭に赤い点のある白いタンチョウだけを数え、首に白い筋のある灰色のマナヅルは除きます。誤差の範囲に入った群れが目標数に達すればクリア。（キーボード：上下キー ±1、左右キー ±5、Enter で記録）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", flock: "鹤群 {0}/{1}", need: "答对 {0}/{1}", watch: "鹤群飞过。只数丹顶鹤！", ask: "刚才那群有几只丹顶鹤？", submit: "记录",
    start: "鹤群飞过天空时数一数。灰色的白枕鹤不算！", win: "调查完成！今冬的鹤群记录", lose: "数得有点偏差", result: "{0}群中答对{1}群（需要{2}）",
    again: "再数一次", next: "下一关", right: "对了！{0}只", wrong: "是{0}只",
    help: "每年冬天，丹顶鹤和白枕鹤会落在韩国江原道铁原的田野上，志愿者会数飞过的鹤群，记录数量。鹤群几秒钟就飞过天空。鹤以2到5只的家庭为单位飞行，按小群一组组地数比一只只数更快。飞过后用下方按钮调好数字，点“记录”。只数头顶有红点的白色丹顶鹤，脖子上有白条纹的灰色白枕鹤要除外。在误差范围内的鹤群达到目标数就过关。（键盘：上下键 ±1，左右键 ±5，Enter 记录）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", flock: "Vol {0}/{1}", need: "Justes {0}/{1}", watch: "Des grues passent. Ne comptez que les grues du Japon !", ask: "Combien de grues dans ce vol ?", submit: "Noter",
    start: "Comptez les grues pendant que le vol traverse le ciel. Pas les grues à cou blanc, grises !", win: "Recensement terminé ! Le compte de cet hiver", lose: "Le compte était un peu faux", result: "{1} vols justes sur {0} (il en faut {2})",
    again: "Recompter", next: "Niveau suivant", right: "Juste ! {0} grues", wrong: "Il y en avait {0}",
    help: "Chaque hiver, grues du Japon et grues à cou blanc se posent dans les champs autour de Cheorwon, dans la province de Gangwon, et des bénévoles comptent les vols qui passent pour les recenser. Un vol traverse le ciel en quelques secondes. Les grues volent en familles de deux à cinq : compter par petits groupes va plus vite qu'oiseau par oiseau. Une fois le vol passé, réglez le nombre avec les boutons et touchez Noter. Ne comptez que les grues blanches à calotte rouge, pas les grues grises au cou rayé de blanc. Assez de vols dans la marge et le niveau est réussi. (Clavier : haut/bas ±1, gauche/droite ±5, Entrée pour noter.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", flock: "Bandada {0}/{1}", need: "Aciertos {0}/{1}", watch: "Pasan grullas. ¡Cuenta solo las de corona roja!", ask: "¿Cuántas grullas había en esa bandada?", submit: "Anotar",
    start: "Cuenta las grullas mientras la bandada cruza el cielo. ¡Sin las grises de nuca blanca!", win: "¡Censo terminado! El recuento de este invierno", lose: "El recuento se desvió un poco", result: "{1} de {0} bandadas bien (hacen falta {2})",
    again: "Contar otra vez", next: "Siguiente nivel", right: "¡Bien! {0} grullas", wrong: "Eran {0}",
    help: "Cada invierno, la grulla de corona roja y la grulla de nuca blanca bajan a los campos de Cheorwon, en la provincia de Gangwon, y voluntarios cuentan las bandadas que pasan para el censo. Una bandada cruza el cielo en unos segundos. Las grullas vuelan en familias de dos a cinco, así que contar grupitos es más rápido que contar ave por ave. Cuando pase, ajusta el número con los botones y pulsa Anotar. Cuenta solo las grullas blancas con corona roja, no las grises con una franja blanca en el cuello. Acierta suficientes bandadas dentro del margen para superar el nivel. (Teclado: arriba/abajo ±1, izquierda/derecha ±5, Intro para anotar.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:crane-count:muted";
const W = 360;
const H = 560;
// red-crowned crane: white body, black neck and wing tips, a red crown; white-naped: grey with a white neck stripe
const RED: PixelArt = { palette: { w: "#f8f9fa", k: "#212529", r: "#e03131" }, rows: ["....r.", "....kk", "kwwwk.", "wwwww.", "k...k."] };
const GREY: PixelArt = { palette: { g: "#868e96", w: "#f1f3f5", d: "#495057", r: "#c92a2a" }, rows: ["....r.", "....wd", "dgggd.", "ggggg.", "d...d."] };

interface Pop { text: string; t: number; color: string }

export default function CraneCount({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; good: number }>(null);
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<Census["phase"]>("fly");
  const [dial, setDial] = useState(10);
  const [hud, setHud] = useState({ idx: 0, good: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cRef = useRef<Census>(newCensus(CRANE_STAGES[0]));
  const dialRef = useRef(10);
  const pending = useRef<number | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = CRANE_STAGES[stage];

  useRunRecord(CRANE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const setCount = useCallback((n: number) => {
    const v = Math.max(0, Math.min(199, n));
    dialRef.current = v;
    setDial(v);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    cRef.current = newCensus(CRANE_STAGES[s]);
    pending.current = null;
    parts.current = [];
    pops.current = [];
    setPhase("fly");
    setHud({ idx: 0, good: 0 });
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CRANE_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const submit = useCallback(() => {
    if (cRef.current.phase !== "answer") return;
    pending.current = dialRef.current;
    setTouched(true);
  }, []);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (cRef.current.over) return;
      const step: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, ArrowRight: 5, ArrowLeft: -5 };
      if (ev.key in step) {
        ev.preventDefault();
        setCount(dialRef.current + step[ev.key]);
        setTouched(true);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [setCount, submit]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const cs = cRef.current;
      const cp = copyRef.current;
      if (stepCensus(cs, dt)) {
        setPhase("answer");
        sfx("tap");
      }
      // the answer is handed in once per frame
      if (pending.current !== null && cs.phase === "answer") {
        const f = currentFlock(cs);
        const ok = answer(cs, pending.current);
        pending.current = null;
        pops.current.push({ text: fill(ok ? cp.right : cp.wrong, reds(f)), t: 1.6, color: ok ? "#2f9e44" : "#e8590c" });
        if (ok) spawnBurst(parts.current, W / 2, 200, ["#f8f9fa", "#e03131"], 10, 90, 3);
        sfx(ok ? "success" : "fail");
        setHud({ idx: cs.idx, good: cs.good });
        setPhase(cs.phase);
        if (cs.over) {
          setOver({ won: cs.won, stars: starsFor(cs), good: cs.good });
          if (cs.won) {
            setCleared(markStageCleared(CRANE_SLUG, cs.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      } else pending.current = null;
      stepParticles(parts.current, dt, 40);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // winter sky over Cheorwon: pale blue fading to the snowy fields and the far ridges
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#a5d8ff");
        sky.addColorStop(0.7, "#e7f5ff");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#74a0c4";
        ctx.beginPath();
        ctx.moveTo(0, 440);
        for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 420 - Math.abs(Math.sin(x * 0.021)) * 40);
        ctx.lineTo(W, 460);
        ctx.lineTo(0, 460);
        ctx.fill();
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, 450, W, H - 450);
        ctx.fillStyle = "#ced4da";
        for (let k = 0; k < 14; k++) ctx.fillRect(((k * 53) % W) + 4, 470 + ((k * 29) % 70), 18, 3); // stubble rows in the snow
        if (cs.phase === "fly") {
          const f = currentFlock(cs);
          for (const b of f.birds) {
            const p = birdAt(f, b, cs.t);
            const flap = Math.sin(cs.t * 7 + b.phase) > 0;
            drawSprite(ctx, b.red ? RED : GREY, p.x - 6, p.y - (flap ? 6 : 4), { scale: 2, flipX: f.dir < 0 });
          }
          // a timer bar for the pass
          ctx.fillStyle = "rgba(33,37,41,0.25)";
          ctx.fillRect(12, 60, W - 24, 6);
          ctx.fillStyle = "#1c7ed6";
          ctx.fillRect(12, 60, (W - 24) * Math.max(0, 1 - cs.t / f.time), 6);
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#1c3d5a";
        ctx.fillText(fill(cp.flock, Math.min(cs.idx + 1, cs.stage.flocks.length), cs.stage.flocks.length), 12, 30);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.need, cs.good, cs.stage.need), W - 12, 30);
        ctx.textAlign = "center";
        if (cs.phase === "answer" && !cs.over) {
          ctx.font = "bold 17px sans-serif";
          ctx.fillText(cp.ask, W / 2, 180);
          ctx.font = "bold 64px sans-serif";
          ctx.fillText(String(dialRef.current), W / 2, 260);
          ctx.font = "13px sans-serif";
          ctx.fillText(`± ${allowed(cs.stage, currentFlock(cs))}`, W / 2, 290);
        }
        for (const pp of pops.current) {
          ctx.font = "bold 18px sans-serif";
          const tw = ctx.measureText(pp.text).width + 16;
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(W / 2 - tw / 2, 330, tw, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 351);
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

  const answering = phase === "answer" && !over;

  return (
    <div
      ref={containerRef}
      data-game="crane-count"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.flock, Math.min(hud.idx + 1, st.flocks.length), st.flocks.length)}</Badge>
        <Badge variant="outline">{fill(c.need, hud.good, st.need)}</Badge>
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
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{phase === "fly" ? c.watch : c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, st.flocks.length, over.good, st.need)}</p>
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

      <div className="grid grid-cols-5 gap-1.5">
        {[-5, -1].map((d) => (
          <Button key={d} variant="outline" className="min-h-12" disabled={!answering} onClick={() => { setCount(dial + d); setTouched(true); }}>
            {d}
          </Button>
        ))}
        <Button className="min-h-12" disabled={!answering} onClick={submit}>
          {c.submit}
        </Button>
        {[1, 5].map((d) => (
          <Button key={d} variant="outline" className="min-h-12" disabled={!answering} onClick={() => { setCount(dial + d); setTouched(true); }}>
            {`+${d}`}
          </Button>
        ))}
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
