import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, RotateCcw } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { createShake, JUICE, type Shake } from "../../lib/games/juice";
import { useRunRecord } from "../../lib/games/use-run-record";
import { loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  SNOWMAN_SLUG,
  SNOWMAN_STAGES,
  WORLD_H,
  WORLD_W,
  canDrop,
  createGame,
  drop,
  heightCm,
  loadBests,
  saveBest,
  stageScore,
  stageStars,
  step,
  stepAfter,
  totalBest,
  windAt,
  type Game,
} from "../../lib/games/snowman-stack";
import { drawScene } from "../../lib/games/snowman-stack-draw";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; ground: Record<"field" | "stump" | "ice", string>; pieces: string; wind: string; calm: string;
  hint: string; intro: string; won: string; tipped: string; missed: string; height: string; score: string; best: string;
  next: string; retry: string; finale: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; drop: string;
}> = {
  ko: {
    stage: "{0}단계", ground: { field: "눈밭", stump: "그루터기", ice: "얼음 연못" }, pieces: "남은 눈덩이 {0}", wind: "바람 {0}", calm: "바람 없음",
    hint: "화면을 누르면 눈덩이를 떨어뜨려요.", intro: "레일 위 썰매가 좌우로 움직여요. 눈덩이를 떨어뜨려 쌓고, 눈사람이 1.5초 버티면 성공! 한쪽으로 쏠리면 기울기 막대가 빨개지고 넘어갑니다.",
    won: "눈사람 완성!", tipped: "앗, 넘어졌어요", missed: "눈덩이가 떨어졌어요", height: "키 {0}cm", score: "점수 {0}", best: "최고 합계 {0}",
    next: "다음 단계", retry: "다시 쌓기", finale: "20단계를 모두 깼어요! 1단계부터 다시", stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", drop: "떨어뜨리기",
  },
  en: {
    stage: "Stage {0}", ground: { field: "Snowfield", stump: "Tree stump", ice: "Frozen pond" }, pieces: "Snowballs left {0}", wind: "Wind {0}", calm: "No wind",
    hint: "Tap to drop the snowball.", intro: "The sled on the rail swings left and right. Drop snowballs to stack them, and if your snowman stands for 1.5 s you win! Lean too far and the tilt bar turns red, then over it goes.",
    won: "Snowman built!", tipped: "Whoops, it toppled", missed: "A snowball fell off", height: "Height {0} cm", score: "Score {0}", best: "Best total {0}",
    next: "Next stage", retry: "Build again", finale: "All 20 stages cleared! Start again from stage 1", stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", drop: "Drop",
  },
  ja: {
    stage: "ステージ{0}", ground: { field: "雪原", stump: "切り株", ice: "凍った池" }, pieces: "残りの雪玉 {0}", wind: "風 {0}", calm: "無風",
    hint: "画面を押すと雪玉を落とします。", intro: "レールのそりが左右に動きます。雪玉を落として積み、雪だるまが1.5秒立っていればクリア！傾きすぎると傾きバーが赤くなり、倒れてしまいます。",
    won: "雪だるま完成！", tipped: "あっ、倒れた", missed: "雪玉が落ちちゃった", height: "高さ {0}cm", score: "得点 {0}", best: "最高合計 {0}",
    next: "次のステージ", retry: "もう一度積む", finale: "20ステージ全部クリア！ステージ1から再開", stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", drop: "落とす",
  },
  zh: {
    stage: "第{0}关", ground: { field: "雪地", stump: "树桩", ice: "冰湖" }, pieces: "剩余雪球 {0}", wind: "风力 {0}", calm: "无风",
    hint: "点击画面放下雪球。", intro: "轨道上的雪橇左右移动。放下雪球堆起来，雪人站稳1.5秒就过关！太歪的话倾斜条会变红，然后就倒了。",
    won: "雪人堆好了！", tipped: "哎呀，倒了", missed: "雪球掉下去了", height: "身高 {0}厘米", score: "得分 {0}", best: "最佳合计 {0}",
    next: "下一关", retry: "重新堆", finale: "20关全部通过！从第1关重新开始", stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", drop: "放下",
  },
  fr: {
    stage: "Niveau {0}", ground: { field: "Champ de neige", stump: "Souche", ice: "Étang gelé" }, pieces: "Boules restantes {0}", wind: "Vent {0}", calm: "Pas de vent",
    hint: "Touchez pour lâcher la boule de neige.", intro: "La luge sur le rail va et vient. Lâchez les boules pour les empiler : si le bonhomme tient 1,5 s, c'est gagné ! S'il penche trop, la jauge rougit et il bascule.",
    won: "Bonhomme terminé !", tipped: "Oups, il est tombé", missed: "Une boule est tombée", height: "Taille {0} cm", score: "Score {0}", best: "Meilleur total {0}",
    next: "Niveau suivant", retry: "Recommencer", finale: "Les 20 niveaux réussis ! Recommencer au niveau 1", stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", drop: "Lâcher",
  },
  es: {
    stage: "Nivel {0}", ground: { field: "Campo nevado", stump: "Tocón", ice: "Estanque helado" }, pieces: "Bolas restantes {0}", wind: "Viento {0}", calm: "Sin viento",
    hint: "Toca para soltar la bola de nieve.", intro: "El trineo del riel va de lado a lado. Suelta bolas para apilarlas: si el muñeco aguanta 1,5 s, ¡ganas! Si se inclina demasiado, la barra se pone roja y se cae.",
    won: "¡Muñeco terminado!", tipped: "¡Uy, se cayó!", missed: "Se cayó una bola", height: "Altura {0} cm", score: "Puntos {0}", best: "Mejor total {0}",
    next: "Siguiente nivel", retry: "Volver a apilar", finale: "¡Los 20 niveles superados! Empezar de nuevo en el 1", stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", drop: "Soltar",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:snowman-stack:muted";

export default function SnowmanStack({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [bests, setBests] = useState<Record<number, number>>({});
  const [muted, setMuted] = useState(false);
  const [, setTick] = useState(0);
  const game = useRef<Game>(createGame(0));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const shake = useRef<Shake>(createShake({ reducedMotion: () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches }));
  const madeSeen = useRef(0);

  const g = game.current;
  const ended = g.phase === "won" || g.phase === "lost";
  useRunRecord(SNOWMAN_SLUG, g.phase === "won", stageScore(g));

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    game.current = createGame(i);
    madeSeen.current = 0;
    setStage(i);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SNOWMAN_SLUG, SNOWMAN_STAGES);
    setCleared(done);
    setBests(loadBests());
    load(nextOpenStage(done, SNOWMAN_STAGES));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  // Fixed 60 Hz physics, redraw every frame, HUD refresh every few frames.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    const loop = (now: number) => {
      const cur = game.current;
      const dt = Math.min(100, now - last);
      acc += dt;
      last = now;
      while (acc >= 1000 / 60) {
        acc -= 1000 / 60;
        if (cur.phase === "play") {
          step(cur);
          if (cur.made > madeSeen.current) {
            madeSeen.current = cur.made;
            sfx("place");
            shake.current.kick(JUICE.shake.light * 0.6);
          }
          const after: Game["phase"] = cur.phase as Game["phase"];
          if (after === "won") {
            setCleared(markStageCleared(SNOWMAN_SLUG, cur.plan.stage, SNOWMAN_STAGES));
            setBests(saveBest(cur.plan.stage, stageScore(cur)));
            sfx("win");
            setTick((t) => t + 1);
          } else if (after === "lost") {
            sfx("lose");
            shake.current.kick(JUICE.shake.heavy, 260);
            setTick((t) => t + 1);
          }
        } else if (cur.phase === "lost") stepAfter(cur);
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawScene(ctx, cur, { now, shake: shake.current.sample(dt) });
      if (++frame % 8 === 0) setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDrop = () => {
    if (drop(game.current)) sfx("tap");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "Enter") return;
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select|button/i.test(target.tagName)) return;
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      e.preventDefault();
      if (drop(game.current)) sfx("tap");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, sfx]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const wind = windAt(g);
  const stars = stageStars(g);
  const total = totalBest(bests);
  const left = g.plan.pieces.length - g.next;

  return (
    <div
      ref={containerRef}
      data-game="snowman-stack"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-2" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{fill(c.stage, stage + 1)} / {SNOWMAN_STAGES}</Badge>
        <Badge variant="outline">{c.ground[g.plan.ground]}</Badge>
        <Badge variant="outline">{fill(c.pieces, left)}</Badge>
        <Badge variant={Math.abs(wind) > 0.3 ? "destructive" : "outline"}>{wind ? fill(c.wind, `${wind > 0 ? "→" : "←"}${Math.round(Math.abs(wind) * 10)}`) : c.calm}</Badge>
        {total > 0 && <span className="text-xs text-muted-foreground">{fill(c.best, total)}</span>}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative mx-auto w-full">
        <canvas
          ref={canvasRef}
          width={WORLD_W}
          height={WORLD_H}
          onPointerDown={onDrop}
          className="aspect-2/3 w-full touch-none select-none rounded-xl border border-border bg-card"
          aria-label={c.hint}
        />
        {ended && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/75 p-4 text-center backdrop-blur-xs">
            <p className="text-2xl font-black">{g.phase === "won" ? c.won : g.lostWhy === "missed" ? c.missed : c.tipped}</p>
            {g.phase === "won" && <p className="text-xl text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>}
            {g.phase === "won" && <p className="text-sm tabular-nums">{fill(c.height, heightCm(g))} · {fill(c.score, stageScore(g))}</p>}
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(stage)}>
                <RotateCcw className="size-4" />
                {c.retry}
              </Button>
              {g.phase === "won" && (
                <Button className="min-h-12" onClick={() => load(stage >= SNOWMAN_STAGES - 1 ? 0 : stage + 1)}>
                  {stage >= SNOWMAN_STAGES - 1 ? c.finale : c.next}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Button className="min-h-12 w-full" disabled={!canDrop(g)} onClick={onDrop}>
        {c.drop}
      </Button>
      <p className="text-sm text-muted-foreground">{stage === 0 && g.next === 0 ? c.intro : c.hint}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={SNOWMAN_STAGES} current={stage} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
